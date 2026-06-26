/**
 * Phase 29 — Behavior test for IN-03 (report read path drops mirror-only entries).
 *
 * Root cause: crashlog.js `getEntries()` used the localStorage mirror ONLY when
 * IDB returned zero entries (`list.length === 0 && mirror.length > 0`). In a
 * partial-failure window (IDB has 1 stale entry, mirror has 5 fresher distinct
 * ones) the 4 mirror-only entries were dropped from the report.
 *
 * Fix: `getEntries()` unions IDB with the mirror, dedupes on the stable content
 * key, prunes, and returns most-recent-first — sharing the WRITE path's merge
 * contract (CR-01).
 *
 * Honors `feedback-behavior-verification.md`: asserts the OBSERVABLE result of
 * getEntries(), written to FAIL on the old `length === 0` fallback and PASS
 * after the union fix. Reuses the zero-npm vm + in-memory IDB shim pattern from
 * tests/29-04-crashlog-ingest-merge.test.js.
 *
 * Run: node tests/29-in03-getentries-merge.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Reuse the harness from the sibling Phase 29 test via require of its internals
// is not exported, so we inline the minimal shim (same shape, trimmed).
function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }

function makeIDBShim() {
  const dbs = new Map();
  function makeStore(name, options) {
    return { name, keyPath: options && options.keyPath,
      autoIncrement: !!(options && options.autoIncrement),
      records: new Map(), indexes: new Map(), _nextAuto: 1 };
  }
  function storeFacade(snap) {
    function keyOf(r) { return snap.keyPath ? r[snap.keyPath] : undefined; }
    return {
      name: snap.name, keyPath: snap.keyPath,
      add(record) { const req = {}; queueMicrotask(() => {
        let key = keyOf(record);
        if (key === undefined && snap.autoIncrement) { key = snap._nextAuto++; record = Object.assign({}, record, { [snap.keyPath]: key }); }
        snap.records.set(key, clone(record)); req.result = key; if (req.onsuccess) req.onsuccess({ target: req }); }); return req; },
      put(record) { const req = {}; queueMicrotask(() => {
        let key = keyOf(record);
        if (key === undefined && snap.autoIncrement) { key = snap._nextAuto++; record = Object.assign({}, record, { [snap.keyPath]: key }); }
        snap.records.set(key, clone(record)); req.result = key; if (req.onsuccess) req.onsuccess({ target: req }); }); return req; },
      get(key) { const req = {}; queueMicrotask(() => { req.result = clone(snap.records.get(key)); if (req.onsuccess) req.onsuccess({ target: req }); }); return req; },
      getAll() { const req = {}; queueMicrotask(() => { req.result = Array.from(snap.records.values()).map(clone); if (req.onsuccess) req.onsuccess({ target: req }); }); return req; },
      clear() { const req = {}; queueMicrotask(() => { snap.records.clear(); if (req.onsuccess) req.onsuccess({ target: req }); }); return req; },
      createIndex(name, keyPath, options) { snap.indexes.set(name, { keyPath, unique: !!(options && options.unique) }); return { name }; },
      openCursor() { const req = {}; queueMicrotask(() => {
        const entries = Array.from(snap.records.entries()); let i = 0;
        function step() {
          if (i >= entries.length) { req.result = null; if (req.onsuccess) req.onsuccess({ target: req }); return; }
          const [k, v] = entries[i++];
          req.result = { value: clone(v), update(u) { snap.records.set(k, clone(u)); }, delete() { snap.records.delete(k); }, continue() { queueMicrotask(step); } };
          if (req.onsuccess) req.onsuccess({ target: req });
        }
        step();
      }); return req; },
    };
  }
  function makeDb(snap) {
    return {
      _snap: snap,
      objectStoreNames: { contains(name) { return snap.stores.has(name); } },
      close() {}, onversionchange: null,
      createObjectStore(name, options) { const s = makeStore(name, options); snap.stores.set(name, s); return storeFacade(s); },
      transaction(storeNames, mode) {
        const tx = { oncomplete: null, onerror: null, aborted: false,
          abort() { this.aborted = true; if (this.onerror) this.onerror({ target: this }); },
          objectStore(n) { const s = snap.stores.get(n); if (!s) throw new Error('store not found: ' + n); return storeFacade(s); } };
        queueMicrotask(() => queueMicrotask(() => queueMicrotask(() => { if (!tx.aborted && tx.oncomplete) tx.oncomplete({ target: tx }); })));
        return tx;
      },
    };
  }
  return {
    open(name, version) {
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
            const fakeTx = { oncomplete: null, onerror: null, abort() {},
              objectStore(n) { const s = entry.stores.get(n); if (!s) throw new Error('store not found in upgrade tx: ' + n); return storeFacade(s); } };
            req.onupgradeneeded({ target: { result: db, transaction: fakeTx }, oldVersion, newVersion: targetVersion });
          }
        }
        req.result = db;
        if (req.onsuccess) req.onsuccess({ target: { result: db } });
      });
      return req;
    },
    databases() { return Promise.resolve([]); },
    _peek(name, store) { const e = dbs.get(name); if (!e) return null; const s = e.stores.get(store); return s ? Array.from(s.records.values()) : null; },
  };
}

const IDBKeyRange = { only(v) { return { _only: v }; } };

function makeLocalStorage() {
  const store = new Map();
  return { getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); }, removeItem(k) { store.delete(k); }, _raw: store };
}

function makeWindow() {
  const listeners = {};
  return { onerror: null, addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    _dispatch(type, event) { (listeners[type] || []).forEach((fn) => fn(event)); },
    location: { href: 'https://app.example/index.html' } };
}

function boot() {
  const idb = makeIDBShim();
  const localStorage = makeLocalStorage();
  const win = makeWindow();
  const sandbox = {
    window: win, self: undefined, globalThis: undefined,
    indexedDB: idb, IDBKeyRange, localStorage,
    navigator: { onLine: true, userAgent: 'test-agent' }, location: win.location,
    document: { getElementById() { return null; },
      createElement() { return { setAttribute() {}, append() {}, prepend() {}, style: {}, set onclick(v) {} }; },
      body: { prepend() {}, appendChild() {} }, addEventListener() {} },
    console: { error() {}, warn() {}, log() {} },
    fetch() { throw new Error('network call (fetch) is forbidden'); },
    XMLHttpRequest: function () { throw new Error('network call (XHR) is forbidden'); },
    setTimeout, clearTimeout, queueMicrotask,
    Promise, JSON, Math, Date, Array, Object, Set, Map, String, Number, Boolean, Error,
  };
  sandbox.self = sandbox; sandbox.globalThis = sandbox; win.self = sandbox;
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

const settle = () => new Promise((r) => setTimeout(r, 30));

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

(async () => {
  // ─── IN-03: getEntries unions IDB + mirror (partial-failure window) ───────
  await test('IN-03: getEntries returns IDB ∪ mirror (1 stale IDB + 5 fresher mirror = 6, deduped, recent-first)', async () => {
    const env = boot();
    const CrashLog = loadCrashlog(env);
    await settle(); // let module-body ingest run on the empty state

    const PortfolioDB = env.sandbox.window.PortfolioDB;
    const base = Date.now();

    // 1 STALE entry in IDB (oldest).
    const stale = { timestamp: base - 100000, message: 'stale-idb', stack: 's', url: 'u', source: 'onerror' };
    await PortfolioDB.replaceAllCrashlog([stale]);

    // 5 FRESHER distinct entries in the mirror only (not in IDB).
    const fresh = [];
    for (let i = 0; i < 5; i++) {
      fresh.push({ timestamp: base - i * 1000, message: 'fresh-' + i, stack: 's' + i, url: 'u', source: 'onerror' });
    }
    env.localStorage.setItem('crashlogBuffer', JSON.stringify(fresh));

    const out = await CrashLog.getEntries();
    assert.strictEqual(out.length, 6,
      `expected the 1 IDB + 5 mirror-only entries to merge to 6, got ${out.length} ` +
      `(the bug returned only the 1 IDB entry because IDB was non-empty)`);

    const msgs = out.map((e) => e.message);
    assert.ok(msgs.indexOf('stale-idb') !== -1, 'the stale IDB entry must be present');
    for (let i = 0; i < 5; i++) {
      assert.ok(msgs.indexOf('fresh-' + i) !== -1, `mirror-only fresh-${i} must be present`);
    }

    // Most-recent-first ordering.
    for (let i = 1; i < out.length; i++) {
      assert.ok(out[i - 1].timestamp >= out[i].timestamp, 'entries must be most-recent-first');
    }
  });

  // ─── IN-03: no duplication when the same entry is in BOTH IDB and mirror ──
  await test('IN-03: getEntries dedupes entries present in both IDB and mirror', async () => {
    const env = boot();
    const CrashLog = loadCrashlog(env);
    await settle();

    const PortfolioDB = env.sandbox.window.PortfolioDB;
    const base = Date.now();
    const shared = { timestamp: base, message: 'shared', stack: 's', url: 'u', source: 'onerror' };
    const idbOnly = { timestamp: base - 1000, message: 'idb-only', stack: 's', url: 'u', source: 'onerror' };

    await PortfolioDB.replaceAllCrashlog([shared, idbOnly]);
    env.localStorage.setItem('crashlogBuffer', JSON.stringify([shared]));

    const out = await CrashLog.getEntries();
    assert.strictEqual(out.length, 2,
      `shared entry must not duplicate across IDB+mirror; expected 2, got ${out.length}`);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
