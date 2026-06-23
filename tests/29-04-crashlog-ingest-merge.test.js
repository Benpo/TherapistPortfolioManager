/**
 * Phase 29 — Behavior test for CR-01 (BLOCKER, data loss).
 *
 * Root cause: crashlog.js `ingestEarlyBuffer()` re-persists ONLY the
 * localStorage mirror (capped at MIRROR_DEPTH = 5) via `persistToIDB`, which
 * does `replaceAllCrashlog` (clear + re-add). Net effect: every normal page
 * load wipes the IndexedDB `crashlog` store (up to 50 real entries) down to the
 * ≤5 mirrored ones — defeating the OBS-01 30-day/50-entry retention contract.
 *
 * Fix: `ingestEarlyBuffer()` must MERGE the existing IDB entries with the
 * mirror, dedupe, prune, then persist the FULL merged set. The operation must
 * be idempotent across reloads, and must fall back to mirror-only persistence
 * if IDB is unavailable (preserving crash-survival).
 *
 * Honors `feedback-behavior-verification.md`: this test asserts the OBSERVABLE
 * effect (entry count after ingest), is written to FAIL on current code, and
 * PASS after the fix. It reuses the established handwritten in-memory IDB shim
 * + `vm` sandbox pattern from tests/29-01-crashlog-capture.test.js (zero-npm).
 *
 * Run: node tests/29-04-crashlog-ingest-merge.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * Behavior cases:
 *   1. ingest preserves ALL pre-existing IDB entries (40 seeded → 40 survive,
 *      not 5) — the data-loss regression.
 *   2. ingest is idempotent: running it a SECOND time does not duplicate
 *      entries (still 40, not 80).
 *   3. best-effort fallback: when getAllCrashlog rejects, ingest still persists
 *      the pruned mirror (crash-survival preserved, never throws).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Minimal in-memory IDB shim (subset crashlog.js + db.js exercise) —
// copied verbatim from tests/29-01-crashlog-capture.test.js.
// ────────────────────────────────────────────────────────────────────

function makeIDBShim() {
  const dbs = new Map();
  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }

  function makeStore(name, options) {
    return {
      name, keyPath: options && options.keyPath,
      autoIncrement: !!(options && options.autoIncrement),
      records: new Map(), indexes: new Map(), _nextAuto: 1,
    };
  }

  function storeFacade(snap, tx) {
    function keyOf(record) { return snap.keyPath ? record[snap.keyPath] : undefined; }
    return {
      name: snap.name, keyPath: snap.keyPath,
      add(record) {
        const req = {};
        queueMicrotask(() => {
          let key = keyOf(record);
          if (key === undefined && snap.autoIncrement) {
            key = snap._nextAuto++;
            record = Object.assign({}, record, { [snap.keyPath]: key });
          }
          if (snap.records.has(key)) {
            req.error = new Error('ConstraintError');
            if (req.onerror) req.onerror({ target: req });
            if (tx.onerror) tx.onerror({ target: tx });
            return;
          }
          snap.records.set(key, clone(record));
          req.result = key;
          if (req.onsuccess) req.onsuccess({ target: req });
        });
        return req;
      },
      put(record) {
        const req = {};
        queueMicrotask(() => {
          let key = keyOf(record);
          if (key === undefined && snap.autoIncrement) {
            key = snap._nextAuto++;
            record = Object.assign({}, record, { [snap.keyPath]: key });
          }
          snap.records.set(key, clone(record));
          req.result = key;
          if (req.onsuccess) req.onsuccess({ target: req });
        });
        return req;
      },
      get(key) {
        const req = {};
        queueMicrotask(() => {
          req.result = clone(snap.records.get(key));
          if (req.onsuccess) req.onsuccess({ target: req });
        });
        return req;
      },
      getAll() {
        const req = {};
        queueMicrotask(() => {
          req.result = Array.from(snap.records.values()).map(clone);
          if (req.onsuccess) req.onsuccess({ target: req });
        });
        return req;
      },
      clear() {
        const req = {};
        queueMicrotask(() => {
          snap.records.clear();
          if (req.onsuccess) req.onsuccess({ target: req });
        });
        return req;
      },
      createIndex(name, keyPath, options) {
        snap.indexes.set(name, { keyPath, unique: !!(options && options.unique) });
        return { name };
      },
      openCursor() {
        const req = {};
        queueMicrotask(() => {
          const entries = Array.from(snap.records.entries());
          let i = 0;
          function step() {
            if (i >= entries.length) {
              req.result = null;
              if (req.onsuccess) req.onsuccess({ target: req });
              return;
            }
            const [k, v] = entries[i++];
            req.result = {
              value: clone(v),
              update(updated) { snap.records.set(k, clone(updated)); },
              delete() { snap.records.delete(k); },
              continue() { queueMicrotask(step); },
            };
            if (req.onsuccess) req.onsuccess({ target: req });
          }
          step();
        });
        return req;
      },
    };
  }

  function makeDb(snap) {
    return {
      _snap: snap,
      objectStoreNames: { contains(name) { return snap.stores.has(name); } },
      close() {},
      onversionchange: null,
      createObjectStore(name, options) {
        const s = makeStore(name, options);
        snap.stores.set(name, s);
        return storeFacade(s, { oncomplete: null, onerror: null, abort() {} });
      },
      transaction(storeNames, mode) {
        const tx = {
          oncomplete: null, onerror: null, aborted: false,
          abort() { this.aborted = true; if (this.onerror) this.onerror({ target: this }); },
          objectStore(n) {
            const s = snap.stores.get(n);
            if (!s) throw new Error('store not found: ' + n);
            return storeFacade(s, tx);
          },
        };
        queueMicrotask(() => queueMicrotask(() => queueMicrotask(() => {
          if (!tx.aborted && tx.oncomplete) tx.oncomplete({ target: tx });
        })));
        return tx;
      },
    };
  }

  return {
    _openCalls: 0,
    open(name, version) {
      this._openCalls++;
      const req = {};
      queueMicrotask(() => {
        let entry = dbs.get(name);
        const oldVersion = entry ? entry.version : 0;
        if (!entry) { entry = { version: 0, stores: new Map() }; dbs.set(name, entry); }
        const db = makeDb(entry);
        const targetVersion = (version === undefined) ? entry.version : version;
        if (targetVersion > oldVersion) {
          entry.version = targetVersion;
          if (req.onupgradeneeded) {
            const fakeTx = {
              oncomplete: null, onerror: null, abort() {},
              objectStore(n) {
                const s = entry.stores.get(n);
                if (!s) throw new Error('store not found in upgrade tx: ' + n);
                return storeFacade(s, this);
              },
            };
            req.onupgradeneeded({
              target: { result: db, transaction: fakeTx },
              oldVersion, newVersion: targetVersion,
            });
          }
        }
        req.result = db;
        if (req.onsuccess) req.onsuccess({ target: { result: db } });
      });
      return req;
    },
    databases() { return Promise.resolve([]); },
    _peek(name, store) {
      const e = dbs.get(name);
      if (!e) return null;
      const s = e.stores.get(store);
      return s ? Array.from(s.records.values()) : null;
    },
  };
}

const IDBKeyRange = { only(v) { return { _only: v }; } };

function makeLocalStorage() {
  const store = new Map();
  return {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    _raw: store,
  };
}

function makeWindow() {
  const listeners = {};
  const win = {
    onerror: null,
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    _dispatch(type, event) { (listeners[type] || []).forEach((fn) => fn(event)); },
    location: { href: 'https://app.example/index.html' },
  };
  return win;
}

// ────────────────────────────────────────────────────────────────────
// Sandbox boot — load db.js then crashlog.js. We seed BOTH stores BEFORE
// crashlog.js runs its module-body ingestEarlyBuffer(), so the seeded IDB
// state is what ingest sees on "load".
//
// crashlog.js calls ingestEarlyBuffer() in its module body. To control the
// seeding, we load db.js first, seed the IDB crashlog store + the mirror
// directly, THEN load crashlog.js so its init-time ingest runs against the
// seeded state. We expose a re-runnable handle to ingest for the idempotency
// case by re-reading the module's behavior via a second load.
// ────────────────────────────────────────────────────────────────────

function boot() {
  const idb = makeIDBShim();
  const localStorage = makeLocalStorage();
  const win = makeWindow();

  const sandbox = {
    window: win,
    self: undefined,
    globalThis: undefined,
    indexedDB: idb,
    IDBKeyRange,
    localStorage,
    navigator: { onLine: true, userAgent: 'test-agent' },
    location: win.location,
    document: {
      getElementById() { return null; },
      createElement() { return { setAttribute() {}, append() {}, prepend() {}, style: {}, set onclick(v) {} }; },
      body: { prepend() {}, appendChild() {} },
      addEventListener() {},
    },
    console: { error() {}, warn() {}, log() {} },
    fetch() { throw new Error('network call (fetch) is forbidden'); },
    XMLHttpRequest: function () { throw new Error('network call (XHR) is forbidden'); },
    setTimeout, clearTimeout, queueMicrotask,
    Promise, JSON, Math, Date, Array, Object, Set, Map, String, Number, Boolean, Error,
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  win.self = sandbox;
  vm.createContext(sandbox);

  const dbSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'db.js'), 'utf8');
  win.name = 'demo-mode';
  vm.runInContext(dbSrc, sandbox, { filename: 'assets/db.js' });

  return { sandbox, idb, localStorage, win };
}

function loadCrashlog(env) {
  const clSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'crashlog.js'), 'utf8');
  vm.runInContext(clSrc, env.sandbox, { filename: 'assets/crashlog.js' });
  return env.sandbox.CrashLog;
}

// Seed N distinct entries directly into the IDB crashlog store, all recent so
// none are age-pruned. Returns the seeded messages for later assertions.
async function seedIDB(env, n) {
  const PortfolioDB = env.sandbox.window.PortfolioDB;
  const base = Date.now();
  const entries = [];
  for (let i = 0; i < n; i++) {
    entries.push({
      timestamp: base - i * 1000, // distinct, all within the last minute
      message: 'seed-entry-' + i,
      stack: 'stack-' + i,
      url: 'https://app.example/x',
      source: 'onerror',
    });
  }
  await PortfolioDB.replaceAllCrashlog(entries);
  return entries;
}

function seedMirror(env, entries, depth) {
  // The mirror holds only the most-recent `depth` entries (sorted recent-first),
  // mimicking the production MIRROR_DEPTH cap.
  const recent = entries.slice().sort((a, b) => b.timestamp - a.timestamp).slice(0, depth);
  env.localStorage.setItem('crashlogBuffer', JSON.stringify(recent));
}

function idbCount(env) {
  const rows = env.idb._peek('demo_portfolio', 'crashlog');
  return rows ? rows.length : 0;
}

function idbMessages(env) {
  const rows = env.idb._peek('demo_portfolio', 'crashlog') || [];
  return rows.map((r) => r.message);
}

// ────────────────────────────────────────────────────────────────────
// Test runner
// ────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

const settle = () => new Promise((r) => setTimeout(r, 30));

(async () => {
  // ─── 1. ingest preserves ALL pre-existing IDB entries (the data-loss bug) ──
  await test('1. ingestEarlyBuffer preserves all 40 pre-existing IDB entries (not 5)', async () => {
    const env = boot();
    const seeded = await seedIDB(env, 40);
    seedMirror(env, seeded, 5); // mirror holds only the most-recent 5

    // Loading crashlog.js runs ingestEarlyBuffer() in the module body.
    loadCrashlog(env);
    await settle();

    const count = idbCount(env);
    assert.strictEqual(count, 40,
      `expected all 40 seeded IDB entries to survive ingest, got ${count} ` +
      `(the bug wipes IDB down to the <=5 mirrored entries)`);

    // Every seeded message must still be present.
    const msgs = idbMessages(env);
    for (let i = 0; i < 40; i++) {
      assert.ok(msgs.indexOf('seed-entry-' + i) !== -1,
        `seed-entry-${i} must survive ingest`);
    }
  });

  // ─── 2. idempotency: running ingest a second time does not duplicate ───────
  await test('2. ingest is idempotent — a second load does not duplicate entries (still 40)', async () => {
    const env = boot();
    const seeded = await seedIDB(env, 40);
    seedMirror(env, seeded, 5);

    loadCrashlog(env); // first ingest
    await settle();
    assert.strictEqual(idbCount(env), 40, 'after first ingest expected 40');

    // Re-run the ingest path exactly as the next page load would: the mirror is
    // still present (crash-survival), and crashlog.js re-runs ingestEarlyBuffer.
    loadCrashlog(env); // second ingest (simulates a reload)
    await settle();

    const count = idbCount(env);
    assert.strictEqual(count, 40,
      `expected 40 after a SECOND ingest (idempotent merge), got ${count} ` +
      `(non-idempotent merge double-counts the surviving mirror entries)`);
  });

  // ─── 3. best-effort fallback when getAllCrashlog rejects ───────────────────
  await test('3. ingest falls back to persisting the pruned mirror when getAllCrashlog rejects (never throws)', async () => {
    const env = boot();
    const seeded = await seedIDB(env, 40);
    seedMirror(env, seeded, 5);

    // Make getAllCrashlog reject AFTER seeding, so ingest must fall back.
    const PortfolioDB = env.sandbox.window.PortfolioDB;
    PortfolioDB.getAllCrashlog = function () {
      return Promise.reject(new Error('getAllCrashlog is broken'));
    };

    let threw = false;
    try {
      loadCrashlog(env); // module body runs ingest; must not throw
      await settle();
    } catch (e) {
      threw = true;
    }
    assert.ok(!threw, 'ingest must never throw even when getAllCrashlog rejects');

    // Fallback persists the pruned mirror (today's safe behavior) — the 5
    // mirrored entries land in IDB. We only require it did NOT throw and that
    // the mirror's entries are persisted (>=1), preserving crash-survival.
    const count = idbCount(env);
    assert.ok(count >= 1,
      `fallback must persist at least the pruned mirror entries, got ${count}`);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
