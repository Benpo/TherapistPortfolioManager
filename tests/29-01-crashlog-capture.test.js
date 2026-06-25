/**
 * Phase 29 Plan 01 — Behavior test for the OBS-01 crash-log capture module
 * (assets/crashlog.js) + its db.js v6 `crashlog` store.
 *
 * Honors project memory `feedback-behavior-verification.md`: runtime-behavior
 * code requires a FALSIFIABLE behavior test written to FAIL before the
 * implementation exists and PASS after. Every case below asserts an observable
 * effect (a persisted entry, a count, a pruned timestamp, a NOT-called spy),
 * never the mere presence of a symbol.
 *
 * Convention: this repo is zero-npm. We DO NOT use fake-indexeddb/jsdom (which
 * the plan suggested) — instead we reuse the established handwritten in-memory
 * IDB shim + `vm` sandbox pattern (tests/24-04-idb-migration.test.js,
 * tests/28-04-integrity-state.test.js). This keeps the test honoring the
 * project's "zero dependencies, no build" constraint.
 *
 * Run: node tests/29-01-crashlog-capture.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * The 6 load-bearing behavior cases (Plan 01 Task 1 <verify>/<done>):
 *   1. window.onerror → a persisted crashlog entry with {timestamp,message,stack,url}
 *   2. unhandledrejection → a persisted crashlog entry
 *   3. appending a 51st entry leaves exactly 50 (count ceiling)
 *   4. an entry timestamped 31 days ago is pruned on the next append (age bound)
 *   5. the localStorage `crashlogBuffer` mirror is written WITHOUT calling openDB
 *   6. NO fetch / XMLHttpRequest is ever invoked by the capture/storage path
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Minimal in-memory IDB shim (subset crashlog.js + db.js exercise)
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
      // The v0→v6 upgrade path runs migrations 2 & 3 which iterate clients/
      // sessions via openCursor. On the demo DB those stores are freshly
      // created and empty, so a cursor that immediately resolves null is
      // sufficient (and correct) here.
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

// ────────────────────────────────────────────────────────────────────
// localStorage mock (records writes so we can assert on the mirror)
// ────────────────────────────────────────────────────────────────────

function makeLocalStorage() {
  const store = new Map();
  return {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    _raw: store,
  };
}

// ────────────────────────────────────────────────────────────────────
// A tiny window mock that captures onerror + unhandledrejection handlers
// so the test can dispatch events the way a browser would.
// ────────────────────────────────────────────────────────────────────

function makeWindow() {
  const listeners = {};
  const win = {
    onerror: null,
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    _dispatch(type, event) {
      (listeners[type] || []).forEach((fn) => fn(event));
    },
    _fireError(message, error) {
      // browser onerror signature: (message, source, lineno, colno, error)
      if (typeof win.onerror === 'function') {
        win.onerror(message, 'app.js', 1, 1, error);
      }
    },
    location: { href: 'https://app.example/settings.html' },
  };
  return win;
}

// ────────────────────────────────────────────────────────────────────
// Sandbox boot — load db.js then crashlog.js into a shared global scope
// ────────────────────────────────────────────────────────────────────

let fetchCalls = 0;
let xhrCalls = 0;

function boot() {
  const idb = makeIDBShim();
  const localStorage = makeLocalStorage();
  const win = makeWindow();

  // Track whether openDB was reached during the localStorage-mirror write.
  // We do this by counting indexedDB.open calls around the mirror assertion.

  const sandbox = {
    window: win,
    self: undefined, // assigned below
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
    // Network primitives — if the capture path EVER touches these the test fails.
    fetch() { fetchCalls++; throw new Error('network call (fetch) is forbidden'); },
    XMLHttpRequest: function () { xhrCalls++; throw new Error('network call (XHR) is forbidden'); },
    setTimeout, clearTimeout, queueMicrotask,
    Promise, JSON, Math, Date, Array, Object, Set, Map, String, Number, Boolean, Error,
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  win.self = sandbox;
  vm.createContext(sandbox);

  const dbSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'db.js'), 'utf8');
  // Route db.js to the demo DB so migrateOldDB() is skipped (window.name check).
  win.name = 'demo-mode';
  vm.runInContext(dbSrc, sandbox, { filename: 'assets/db.js' });

  const clSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'crashlog.js'), 'utf8');
  vm.runInContext(clSrc, sandbox, { filename: 'assets/crashlog.js' });

  return { sandbox, idb, localStorage, win };
}

// ────────────────────────────────────────────────────────────────────
// Pre-flight: the module + db accessors must exist
// ────────────────────────────────────────────────────────────────────

let env;
try {
  env = boot();
} catch (err) {
  console.error('FAIL: could not load assets/crashlog.js + assets/db.js in sandbox');
  console.error('      ' + err.message);
  process.exit(1);
}

const CrashLog = env.sandbox.CrashLog;
if (!CrashLog) {
  console.error('FAIL: global CrashLog not exposed after loading assets/crashlog.js');
  console.error('      Plan 01 Task 1 must create assets/crashlog.js exporting CrashLog.');
  process.exit(1);
}
for (const fn of ['logError', 'getEntries', 'clear']) {
  if (typeof CrashLog[fn] !== 'function') {
    console.error(`FAIL: CrashLog.${fn} is not exported.`);
    process.exit(1);
  }
}
const PortfolioDB = env.sandbox.window.PortfolioDB;
for (const fn of ['addCrashlog', 'getAllCrashlog', 'clearCrashlog']) {
  if (typeof PortfolioDB[fn] !== 'function') {
    console.error(`FAIL: PortfolioDB.${fn} is not exported by db.js (v6 crashlog store accessors).`);
    process.exit(1);
  }
}

// ────────────────────────────────────────────────────────────────────
// Test runner
// ────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

const DAY = 24 * 60 * 60 * 1000;

(async () => {
  // ─── 1. window.onerror → persisted entry ────────────────────────────
  await test('1. window.onerror produces a persisted crashlog entry {timestamp,message,stack,url}', async () => {
    await CrashLog.clear();
    env.win._fireError('Boom from onerror', new Error('Boom from onerror'));
    // allow async append to settle
    await new Promise((r) => setTimeout(r, 20));
    const entries = await CrashLog.getEntries();
    assert.ok(entries.length >= 1, `expected >=1 entry, got ${entries.length}`);
    const e = entries.find((x) => /Boom from onerror/.test(x.message || ''));
    assert.ok(e, 'onerror entry must be persisted with its message');
    assert.ok(typeof e.timestamp !== 'undefined', 'entry must carry a timestamp');
    assert.ok('stack' in e, 'entry must carry a stack field');
    assert.ok(/settings\.html/.test(e.url || ''), 'entry must carry the page url');
  });

  // ─── 2. unhandledrejection → persisted entry ────────────────────────
  await test('2. unhandledrejection produces a persisted crashlog entry', async () => {
    await CrashLog.clear();
    env.win._dispatch('unhandledrejection', {
      reason: new Error('Rejected promise boom'),
      promise: Promise.resolve(),
    });
    await new Promise((r) => setTimeout(r, 20));
    const entries = await CrashLog.getEntries();
    const e = entries.find((x) => /Rejected promise boom/.test(x.message || ''));
    assert.ok(e, 'unhandledrejection entry must be persisted');
  });

  // ─── 3. count ceiling = 50 ──────────────────────────────────────────
  await test('3. appending a 51st entry leaves exactly 50', async () => {
    await CrashLog.clear();
    for (let i = 0; i < 51; i++) {
      await CrashLog.logError({ message: 'entry ' + i, stack: '', url: 'x', timestamp: Date.now() + i });
    }
    const entries = await CrashLog.getEntries();
    assert.strictEqual(entries.length, 50, `expected exactly 50 after 51 appends, got ${entries.length}`);
  });

  // ─── 4. age bound = 30 days ─────────────────────────────────────────
  await test('4. an entry timestamped 31 days ago is pruned on the next append', async () => {
    await CrashLog.clear();
    const old = Date.now() - 31 * DAY;
    await CrashLog.logError({ message: 'ancient', stack: '', url: 'x', timestamp: old });
    // next append triggers prune-on-write
    await CrashLog.logError({ message: 'fresh', stack: '', url: 'x', timestamp: Date.now() });
    const entries = await CrashLog.getEntries();
    assert.ok(entries.find((e) => e.message === 'fresh'), 'fresh entry must survive');
    assert.ok(!entries.find((e) => e.message === 'ancient'),
      'a 31-day-old entry must be pruned on the next append');
  });

  // ─── 5. localStorage mirror written WITHOUT openDB ──────────────────
  await test('5. the localStorage crashlogBuffer mirror is written without calling openDB', async () => {
    await CrashLog.clear();
    // Snapshot indexedDB.open call count, then make a DIRECT mirror-bearing append.
    const before = env.idb._openCalls;
    // The mirror must be synchronous/guarded and not gated on the IDB write.
    await CrashLog.logError({ message: 'mirror-check', stack: '', url: 'x', timestamp: Date.now() });
    const raw = env.localStorage.getItem('crashlogBuffer');
    assert.ok(raw, 'crashlogBuffer mirror key must be written');
    const parsed = JSON.parse(raw);
    assert.ok(Array.isArray(parsed) && parsed.some((e) => e.message === 'mirror-check'),
      'mirror must contain the most recent entry');
    // Behavioral proof the mirror does not DEPEND on openDB: simulate IDB total
    // failure and confirm the mirror is STILL written.
    const savedOpen = env.sandbox.indexedDB.open;
    env.sandbox.indexedDB.open = function () { throw new Error('IDB open is broken'); };
    try {
      await CrashLog.logError({ message: 'idb-down', stack: '', url: 'x', timestamp: Date.now() });
    } catch (e) {
      throw new Error('logError must never throw even when IDB.open throws: ' + e.message);
    } finally {
      env.sandbox.indexedDB.open = savedOpen;
    }
    const raw2 = env.localStorage.getItem('crashlogBuffer');
    const parsed2 = JSON.parse(raw2);
    assert.ok(parsed2.some((e) => e.message === 'idb-down'),
      'mirror must capture the entry even when IndexedDB.open is broken (survives IDB failure)');
  });

  // ─── 6. zero network ────────────────────────────────────────────────
  await test('6. no fetch / XMLHttpRequest is invoked by the capture/storage path', async () => {
    await CrashLog.clear();
    env.win._fireError('net-check', new Error('net-check'));
    await CrashLog.logError({ message: 'net-check-2', stack: '', url: 'x', timestamp: Date.now() });
    await new Promise((r) => setTimeout(r, 20));
    assert.strictEqual(fetchCalls, 0, 'fetch must never be called by the capture path');
    assert.strictEqual(xhrCalls, 0, 'XMLHttpRequest must never be constructed by the capture path');
  });

  // ─── 7. concurrent appends must not lose entries (lost-update race) ──
  // REGRESSION (Phase 29 /gsd-verify-work, on-device repro 2026-06-25): real
  // crashes arrive in cascades — several errors in the SAME tick. append() does
  // an async read-all (getEntries) → replaceAllCrashlog() full-replace. When
  // appends interleave, each reads the pre-write set and clobbers the others, so
  // only the last writer survives. A direct CrashLog.logError() seam entry (the
  // exact seam Phase 28's integrity self-check uses) was dropped every time on
  // device. The log MUST NOT under-count when it matters most.
  await test('7. five concurrent logError calls all survive (no lost-update race)', async () => {
    await CrashLog.clear();
    const N = 5;
    const base = Date.now();
    // Fire N appends WITHOUT awaiting between them (the cascade case).
    const ps = [];
    for (let i = 0; i < N; i++) {
      ps.push(CrashLog.logError({ message: 'concurrent ' + i, stack: '', url: 'x', timestamp: base + i }));
    }
    await Promise.all(ps);
    await new Promise((r) => setTimeout(r, 30)); // let any trailing IDB writes settle
    const entries = await CrashLog.getEntries();
    const missing = [];
    for (let i = 0; i < N; i++) {
      if (!entries.find((e) => e.message === 'concurrent ' + i)) missing.push(i);
    }
    assert.strictEqual(missing.length, 0,
      `all ${N} concurrent entries must persist; lost indices [${missing.join(', ')}] ` +
      `(only ${entries.length}/${N} survived — lost-update race)`);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
