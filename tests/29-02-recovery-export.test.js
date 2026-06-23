/**
 * Phase 29 Plan 02 — Task 1 behavior test: read-only export-around-failure.
 *
 * OBS-03 (D-09 wrinkle): a failed IndexedDB migration leaves the DB stuck at
 * its un-upgraded version. openDB() re-opens at DB_VERSION, re-fires the
 * throwing migration, and aborts — so the normal getAllClients()/exportBackup()
 * path can NEVER read the user's data on a bricked device. The escape hatch
 * exports AROUND the failure by opening the DB read-only with NO version arg
 * (no upgradeneeded fires) and feeding the existing stores into the ZIP builder.
 *
 * Honors project memory `feedback-behavior-verification.md`: every case asserts
 * an observable effect (a rejection, a populated read, an empty-store guard, a
 * real ZIP manifest, a NOT-called network spy), never the mere presence of a
 * symbol. Written to FAIL before the implementation exists (RED) and PASS after.
 *
 * Convention: zero-npm. Reuse the established handwritten in-memory IDB shim +
 * `vm` sandbox (tests/29-01-crashlog-capture.test.js) AND the REAL vendored
 * JSZip + REAL backup.js (tests/25-08-roundtrip-stores.test.js).
 *
 * Run: node tests/29-02-recovery-export.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * Load-bearing cases (Plan 02 Task 1 <verify>/<done>):
 *   1. With a throwing migration registered, openDB()/getAllClients() rejects
 *      (the D-09 wrinkle reproduced).
 *   2. getAllForRecoveryExport() resolves and returns the populated
 *      clients/sessions from the un-upgraded DB.
 *   3. A store that does not yet exist returns [] (objectStoreNames.contains).
 *   4. exportRecoveryBackup() produces a non-empty ZIP blob whose backup.json
 *      manifest contains the exported clients (skip-encryption branch).
 *   5. No fetch / XHR is ever called by the recovery export path.
 *   6. exportRecoveryBackup() routes through an interactive passphrase decision
 *      (no silent export — D-07): the injectable passphrase flow is invoked,
 *      and a cancel aborts the export.
 *
 * Test seam: exportRecoveryBackup(passphraseFlow?) takes an OPTIONAL injectable
 * passphrase-decision function (defaults to the real DOM passphrase modal in the
 * app). This is a dependency-injection seam so the no-DOM sandbox can drive the
 * gate deterministically; production callers pass nothing and get the real modal.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// In-memory IDB shim. Versioned: a no-version open() returns the DB AT its
// current stored version with NO upgradeneeded; a higher-version open() fires
// upgradeneeded (where the throwing migration aborts).
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
      count() {
        const req = {};
        queueMicrotask(() => {
          req.result = snap.records.size;
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
        // No-version open: target = current stored version → NO upgradeneeded.
        const targetVersion = (version === undefined) ? entry.version : version;
        if (targetVersion > oldVersion) {
          if (req.onupgradeneeded) {
            const fakeTx = {
              oncomplete: null, onerror: null,
              _aborted: false,
              abort() { this._aborted = true; },
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
            // If the migration aborted the upgrade tx, the version does NOT
            // advance and the open fails (mirrors real IndexedDB semantics).
            if (fakeTx._aborted) {
              req.error = new Error('AbortError: upgrade transaction aborted');
              if (req.onerror) req.onerror({ target: req });
              return;
            }
            entry.version = targetVersion;
          } else {
            entry.version = targetVersion;
          }
        }
        req.result = db;
        if (req.onsuccess) req.onsuccess({ target: { result: db } });
      });
      return req;
    },
    deleteDatabase(name) {
      const req = {};
      queueMicrotask(() => {
        dbs.delete(name);
        if (req.onsuccess) req.onsuccess({ target: req });
      });
      return req;
    },
    databases() { return Promise.resolve([]); },
    // Seed a DB at a specific version with stores+records, bypassing migrations.
    _seed(name, version, stores) {
      const entry = { version, stores: new Map() };
      for (const [sname, def] of Object.entries(stores)) {
        const s = makeStore(sname, def.options || { keyPath: 'id', autoIncrement: true });
        (def.records || []).forEach((r) => {
          const key = s.keyPath ? r[s.keyPath] : undefined;
          s.records.set(key, JSON.parse(JSON.stringify(r)));
        });
        entry.stores.set(sname, s);
      }
      dbs.set(name, entry);
    },
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
  const map = new Map();
  return {
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => { map.set(String(k), String(v)); },
    removeItem: (k) => { map.delete(String(k)); },
    clear: () => map.clear(),
  };
}

function makeDoc() {
  return {
    addEventListener: () => {}, removeEventListener: () => {},
    createElement: () => ({
      href: '', download: '', style: {},
      setAttribute: () => {}, appendChild: () => {},
      click: () => {}, addEventListener: () => {},
      classList: { add: () => {}, remove: () => {} },
    }),
    body: { appendChild: () => {}, removeChild: () => {}, prepend: () => {} },
    head: { appendChild: () => {} },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

// ────────────────────────────────────────────────────────────────────
// Sandbox boot — REAL db.js + REAL JSZip + REAL backup.js in one context.
// ────────────────────────────────────────────────────────────────────

let fetchCalls = 0;
let xhrCalls = 0;

function boot() {
  const idb = makeIDBShim();
  const localStorage = makeLocalStorage();

  const sandbox = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout, clearTimeout, setImmediate, clearImmediate, queueMicrotask,
    Promise, JSON, Math, Date, Array, Object, Set, Map, String, Number, Boolean, Error,
    crypto: globalThis.crypto || { subtle: {}, getRandomValues: (a) => a },
    TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, Blob, File,
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
    indexedDB: idb,
    IDBKeyRange,
    localStorage,
    navigator: { onLine: true, userAgent: 'test-agent', share: undefined, canShare: undefined },
    document: makeDoc(),
    // Network primitives — touching either fails the zero-network invariant.
    fetch() { fetchCalls++; throw new Error('network call (fetch) is forbidden'); },
    XMLHttpRequest: function () { xhrCalls++; throw new Error('network call (XHR) is forbidden'); },
    window: {},
  };
  sandbox.window.localStorage = localStorage;
  sandbox.window.crypto = sandbox.crypto;
  sandbox.window.document = sandbox.document;
  sandbox.window.indexedDB = idb;
  sandbox.window.name = 'demo-mode'; // route db.js to demo_portfolio (skip migrateOldDB)
  const locObj = { href: '', reload() {} };
  sandbox.window.location = locObj;
  sandbox.location = locObj;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  // 1. db.js (defines window.PortfolioDB + MIGRATIONS).
  const dbSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'db.js'), 'utf8');
  vm.runInContext(dbSrc, sandbox, { filename: 'assets/db.js' });

  // 2. REAL JSZip.
  const jszipSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'jszip.min.js'), 'utf8');
  vm.runInContext(jszipSrc, sandbox, { filename: 'assets/jszip.min.js' });
  if (!sandbox.JSZip && sandbox.window.JSZip) sandbox.JSZip = sandbox.window.JSZip;
  if (!sandbox.window.JSZip && sandbox.JSZip) sandbox.window.JSZip = sandbox.JSZip;
  if (typeof sandbox.JSZip !== 'function') {
    throw new Error('JSZip did not attach to the sandbox global. Got: ' + typeof sandbox.JSZip);
  }

  // 3. REAL backup.js.
  const backupSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'backup.js'), 'utf8');
  vm.runInContext(backupSrc, sandbox, { filename: 'assets/backup.js' });

  return { sandbox, idb, localStorage };
}

// Read a ZIP blob back via JSZip in the host realm.
const HostJSZip = (() => {
  try { return require(path.join(__dirname, '..', 'assets', 'jszip.min.js')); }
  catch (e) { return null; }
})();

async function readBackupJson(sandbox, blob) {
  const JSZipCtor = HostJSZip || sandbox.JSZip;
  const buf = Buffer.from(await blob.arrayBuffer());
  const zip = await JSZipCtor.loadAsync(buf);
  const jsonStr = await zip.file('backup.json').async('string');
  return JSON.parse(jsonStr);
}

// ────────────────────────────────────────────────────────────────────
// Pre-flight
// ────────────────────────────────────────────────────────────────────

let env;
try { env = boot(); }
catch (err) {
  console.error('FAIL: could not load db.js + JSZip + backup.js in sandbox');
  console.error('      ' + (err && err.stack || err.message));
  process.exit(1);
}

const PortfolioDB = env.sandbox.window.PortfolioDB;
const BackupManager = env.sandbox.window.BackupManager;

const DB_NAME = 'demo_portfolio'; // window.name === 'demo-mode'

// Injectable passphrase flows for the DI seam in exportRecoveryBackup().
// Each returns the same tri-state contract that the real modal resolves to:
//   { ok, skip, cancelled }  — see exportEncryptedBackup's documented shape.
function flowSkip(onShow) {
  return function () {
    if (onShow) onShow();
    return Promise.resolve({ confirmed: false, skip: true, cancelled: false, passphrase: null });
  };
}
function flowConfirm(passphrase, onShow) {
  return function () {
    if (onShow) onShow();
    return Promise.resolve({ confirmed: true, skip: false, cancelled: false, passphrase: passphrase });
  };
}
function flowCancel(onShow) {
  return function () {
    if (onShow) onShow();
    return Promise.resolve({ confirmed: false, skip: false, cancelled: true, passphrase: null });
  };
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err && err.stack || err.message}`); failed++; }
}

(async () => {
  if (!PortfolioDB || typeof PortfolioDB.getAllForRecoveryExport !== 'function') {
    console.error('FAIL: PortfolioDB.getAllForRecoveryExport is not exported by db.js (Task 1).');
    process.exit(1);
  }
  if (!BackupManager || typeof BackupManager.exportRecoveryBackup !== 'function') {
    console.error('FAIL: BackupManager.exportRecoveryBackup is not exported by backup.js (Task 1).');
    process.exit(1);
  }

  // ─── 1. openDB()/getAllClients() rejects on the bricked DB ──────────
  await test('1. with a throwing upgrade, getAllClients() (openDB path) rejects — D-09 wrinkle reproduced', async () => {
    // Seed the DB at a version LOWER than DB_VERSION with data, so openDB()
    // (which opens at DB_VERSION) fires upgradeneeded. Then make the upgrade
    // throw by overriding the versioned-open path to abort.
    env.idb._seed(DB_NAME, 1, {
      clients: { options: { keyPath: 'id', autoIncrement: true }, records: [
        { id: 1, name: 'Alice', type: 'adult' },
        { id: 2, name: 'Bob', type: 'adult' },
      ] },
      sessions: { options: { keyPath: 'id', autoIncrement: true }, records: [
        { id: 1, clientId: 1, date: '2026-01-01', notes: 'first' },
      ] },
    });

    // Override the versioned open to simulate a throwing migration: any open
    // WITH a version arg aborts; a no-version open succeeds (read-only path).
    const realOpen = env.idb.open.bind(env.idb);
    env.sandbox.indexedDB.open = function (name, version) {
      if (version !== undefined) {
        const req = {};
        queueMicrotask(() => {
          req.error = new Error('AbortError: migration threw, upgrade aborted');
          if (req.onerror) req.onerror({ target: req });
        });
        return req;
      }
      return realOpen(name, version);
    };

    let rejected = false;
    try {
      await PortfolioDB.getAllClients();
    } catch (e) { rejected = true; }
    assert.ok(rejected, 'getAllClients() must reject when the migration aborts the upgrade');
  });

  // ─── 2. getAllForRecoveryExport reads around the failure ─────────────
  await test('2. getAllForRecoveryExport() returns populated clients/sessions from the un-upgraded DB', async () => {
    const data = await PortfolioDB.getAllForRecoveryExport();
    assert.ok(data && Array.isArray(data.clients), 'must return { clients: [] }');
    assert.strictEqual(data.clients.length, 2, 'must read the 2 seeded clients around the failure');
    assert.ok(data.clients.find((c) => c.name === 'Alice'), 'Alice must be present');
    assert.strictEqual(data.sessions.length, 1, 'must read the 1 seeded session');
  });

  // ─── 3. missing store returns [] ─────────────────────────────────────
  await test('3. a store that does not exist yet returns [] (objectStoreNames.contains guard)', async () => {
    const data = await PortfolioDB.getAllForRecoveryExport();
    // The seeded DB has NO therapistSettings / snippets stores.
    assert.ok(Array.isArray(data.therapistSettings), 'therapistSettings must be an array');
    assert.strictEqual(data.therapistSettings.length, 0, 'missing therapistSettings store → []');
    assert.ok(Array.isArray(data.snippets), 'snippets must be an array');
    assert.strictEqual(data.snippets.length, 0, 'missing snippets store → []');
  });

  // ─── 4. exportRecoveryBackup (skip encryption) → real ZIP w/ clients ─
  await test('4. exportRecoveryBackup() produces a ZIP whose backup.json manifest contains the clients', async () => {
    // Drive the injectable passphrase flow to "skip encryption" → plain ZIP.
    const result = await BackupManager.exportRecoveryBackup(flowSkip());
    assert.ok(result && result.blob, 'exportRecoveryBackup must return { blob } on the skip-encryption path');
    assert.ok(result.blob.size > 0, 'recovery ZIP blob must be non-empty');
    assert.strictEqual(result.skip, true, 'skip-encryption result must report skip:true');
    const manifest = await readBackupJson(env.sandbox, result.blob);
    assert.ok(Array.isArray(manifest.clients), 'manifest.clients must be an array');
    assert.ok(manifest.clients.find((c) => c.name === 'Alice'),
      'recovery manifest must contain the exported clients read around the failure');
    assert.strictEqual(manifest.sessions.length, 1, 'recovery manifest must contain the session');
  });

  // ─── 5. zero network ─────────────────────────────────────────────────
  await test('5. no fetch / XMLHttpRequest is invoked by the recovery export path', async () => {
    assert.strictEqual(fetchCalls, 0, 'fetch must never be called by the recovery export path');
    assert.strictEqual(xhrCalls, 0, 'XMLHttpRequest must never be constructed by the recovery export path');
  });

  // ─── 6. interactive passphrase decision (no silent export) ───────────
  await test('6. exportRecoveryBackup() is gated on an interactive passphrase decision (D-07 no silent export)', async () => {
    // 6a — the passphrase flow MUST be invoked (no silent export).
    let shown = 0;
    const ok = await BackupManager.exportRecoveryBackup(flowConfirm('recover-pass-123', () => { shown++; }));
    assert.ok(shown >= 1, 'the interactive passphrase flow must be invoked (no silent export)');
    assert.ok(ok && ok.blob, 'a blob must be produced once a passphrase is supplied');

    // 6b — cancelling the passphrase flow ABORTS the export (no blob).
    let shownC = 0;
    const cancelled = await BackupManager.exportRecoveryBackup(flowCancel(() => { shownC++; }));
    assert.ok(shownC >= 1, 'cancel path must still go through the interactive flow');
    assert.ok(cancelled && cancelled.cancelled === true, 'cancel must report cancelled:true');
    assert.ok(!cancelled.blob, 'cancel must NOT produce a backup blob (export aborted)');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
