/**
 * Phase 29 — Behavior test for IN-02 (backup restore must preserve the crash log).
 *
 * `clearAll()`'s sole caller is the backup RESTORE/import path (backup.js). The
 * crash log is device-local diagnostic data that is NOT part of the backup file
 * and is most valuable exactly when a user restores — often because something
 * broke. The old `clearAll()` wiped the `crashlog` store along with the user's
 * data, destroying the diagnostic trail with nothing to replace it.
 *
 * Fix: `clearAll()` no longer clears `crashlog`. A true clean slate is still
 * available via the OBS-03 reset path (indexedDB.deleteDatabase).
 *
 * Honors `feedback-behavior-verification.md`: asserts the OBSERVABLE state after
 * clearAll() — crashlog entries SURVIVE while clients/sessions are wiped.
 * Written to FAIL on the old clear-crashlog code, PASS after the fix.
 *
 * Run: node tests/29-in02-restore-preserves-crashlog.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

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

function boot() {
  const idb = makeIDBShim();
  const localStorage = makeLocalStorage();
  const win = { onerror: null, addEventListener() {}, location: { href: 'https://app.example/index.html' } };
  const sandbox = {
    window: win, self: undefined, globalThis: undefined,
    indexedDB: idb, IDBKeyRange, localStorage,
    navigator: { onLine: true, userAgent: 'test-agent' }, location: win.location,
    document: { getElementById() { return null; }, createElement() { return { setAttribute() {}, append() {}, style: {} }; }, body: {}, addEventListener() {} },
    console: { error() {}, warn() {}, log() {} },
    fetch() { throw new Error('network call (fetch) is forbidden'); },
    setTimeout, clearTimeout, queueMicrotask,
    Promise, JSON, Math, Date, Array, Object, Set, Map, String, Number, Boolean, Error,
  };
  sandbox.self = sandbox; sandbox.globalThis = sandbox; win.self = sandbox;
  vm.createContext(sandbox);
  const dbSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'db.js'), 'utf8');
  win.name = 'demo-mode';
  vm.runInContext(dbSrc, sandbox, { filename: 'assets/db.js' });
  return { sandbox, idb, localStorage };
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

(async () => {
  await test('IN-02: clearAll() (backup restore) wipes clients/sessions but PRESERVES the crash log', async () => {
    const env = boot();
    const PortfolioDB = env.sandbox.window.PortfolioDB;

    // Seed user data + a crash log.
    await PortfolioDB.addClient({ id: 'c1', name: 'Alice' });
    await PortfolioDB.addSession({ id: 's1', clientId: 'c1', date: '2026-06-01' });
    const base = Date.now();
    const crashEntries = [];
    for (let i = 0; i < 3; i++) {
      crashEntries.push({ timestamp: base - i * 1000, message: 'crash-' + i, stack: 's', url: 'u', source: 'onerror' });
    }
    await PortfolioDB.replaceAllCrashlog(crashEntries);

    // Sanity: everything is present before the restore.
    assert.strictEqual((env.idb._peek('demo_portfolio', 'clients') || []).length, 1, 'precondition: 1 client');
    assert.strictEqual((env.idb._peek('demo_portfolio', 'crashlog') || []).length, 3, 'precondition: 3 crashlog entries');

    // Run the restore wipe.
    await PortfolioDB.clearAll();

    // User data is gone…
    assert.strictEqual((env.idb._peek('demo_portfolio', 'clients') || []).length, 0, 'clients must be cleared by restore');
    assert.strictEqual((env.idb._peek('demo_portfolio', 'sessions') || []).length, 0, 'sessions must be cleared by restore');

    // …but the crash log SURVIVES (the diagnostic trail).
    const surviving = env.idb._peek('demo_portfolio', 'crashlog') || [];
    assert.strictEqual(surviving.length, 3,
      `crash log must survive a backup restore; expected 3 entries, got ${surviving.length} ` +
      `(the bug wiped crashlog in clearAll())`);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
