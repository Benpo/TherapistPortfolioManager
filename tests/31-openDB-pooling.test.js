/**
 * Phase 31 Plan 01 (RFCT-03) — Characterization test for openDB() cached-connection
 * lifecycle. Written TEST-FIRST per D-03/D-06: it locks the CURRENT observable
 * lifecycle (passes on today's NO-pool db.js) and MUST stay green after pooling
 * is applied in Task 2.
 *
 * Run: node tests/31-openDB-pooling.test.js  (exits 0 on full pass, 1 on any fail)
 *
 * Why a STRENGTHENED IDB shim (vs. tests/24-04-idb-migration.test.js):
 *   24-04's shim has a no-op `close(){}` (so a closed handle is indistinguishable
 *   from an open one), no closed-state check on `transaction()` (never throws
 *   InvalidStateError), and a hardcoded `databases() => []` (the legacy-DB
 *   migration recursion never fires). Reusing it verbatim would make Tests B/C
 *   vacuous. This shim therefore:
 *     (i)  `close()` sets a `_closed` flag and `transaction()` THROWS a
 *          DOMException-shaped `InvalidStateError` (name === "InvalidStateError")
 *          when `_closed` — so a reused-after-close handle is observably broken;
 *     (ii) instruments `open(name, version)` with an incrementing call counter
 *          (`idb._openCount`) and records each opened handle (`idb._openedHandles`)
 *          so a test can read the post-close open-count delta and fire
 *          `onversionchange` on the real handle;
 *     (iii) `databases()` reflects the live registry (configurable via `_stage`)
 *          and `deleteDatabase()` removes entries — so the legacy
 *          `emotion_code_portfolio` DB can be STAGED PRESENT and the
 *          migrateOldDB()->openDB() recursion at db.js:67 actually runs.
 *
 * Observable-only (D-08): no assertion reads `_dbPromise`/`_migrationDone`/
 * `_seedingDone`. openDB() itself is not on the public API, so each scenario
 * drives the connection through the PUBLIC consumer `getAllClients()` (which does
 * `await openDB()` then a transaction) and reads persisted store state via the
 * shim's `_peek` — exactly the discipline 24-04 uses.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Strengthened in-memory IDB shim
// ────────────────────────────────────────────────────────────────────

function invalidState() {
  // DOMException-shaped: the only contract the test relies on is name.
  const e = new Error(
    "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing."
  );
  e.name = 'InvalidStateError';
  return e;
}

function makeIDBShim() {
  const dbs = new Map(); // name -> { version, stores: Map<name, StoreSnapshot> }
  let openCount = 0;
  const openedHandles = [];

  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }

  function makeStore(name, options) {
    return {
      name: name,
      keyPath: options && options.keyPath,
      autoIncrement: !!(options && options.autoIncrement),
      records: new Map(),
      indexes: new Map(),
      _nextAuto: 1,
    };
  }

  function storeFacade(snap, tx) {
    function keyOf(record) {
      if (snap.keyPath) return record[snap.keyPath];
      return undefined;
    }
    return {
      name: snap.name,
      keyPath: snap.keyPath,
      add(record) {
        const req = {};
        queueMicrotask(() => {
          let key = keyOf(record);
          if (key === undefined && snap.autoIncrement) {
            key = snap._nextAuto++;
            record = Object.assign({}, record, { [snap.keyPath]: key });
          }
          if (snap.records.has(key)) {
            req.error = new Error('ConstraintError: key exists');
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
          const key = keyOf(record);
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
      count() {
        const req = {};
        queueMicrotask(() => {
          req.result = snap.records.size;
          if (req.onsuccess) req.onsuccess({ target: req });
        });
        return req;
      },
      delete(key) {
        const req = {};
        queueMicrotask(() => {
          snap.records.delete(key);
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
        snap.indexes.set(name, { keyPath: keyPath, unique: !!(options && options.unique) });
        return { name: name };
      },
      index(name) {
        const idx = snap.indexes.get(name);
        if (!idx) throw new Error('index not found: ' + name);
        return {
          getAll(keyValue) {
            const req = {};
            queueMicrotask(() => {
              req.result = Array.from(snap.records.values())
                .filter((r) => r[idx.keyPath] === keyValue)
                .map(clone);
              if (req.onsuccess) req.onsuccess({ target: req });
            });
            return req;
          },
          openCursor(range) {
            const req = {};
            queueMicrotask(() => {
              const matches = Array.from(snap.records.entries())
                .filter(([, r]) => r[idx.keyPath] === (range && range._only));
              let i = 0;
              function step() {
                if (i >= matches.length) {
                  req.result = null;
                  if (req.onsuccess) req.onsuccess({ target: req });
                  return;
                }
                const [k] = matches[i++];
                req.result = {
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

  function makeDb(snap, name) {
    return {
      name: name,
      _closed: false,
      _snap: snap,
      objectStoreNames: {
        contains(n) { return snap.stores.has(n); },
        get length() { return snap.stores.size; },
      },
      // STRENGTHENED (i): a real close — sets a flag the transaction guard reads.
      close() { this._closed = true; },
      onversionchange: null,
      createObjectStore(n, options) {
        const s = makeStore(n, options);
        snap.stores.set(n, s);
        return storeFacade(s, { oncomplete: null, onerror: null, abort() {} });
      },
      transaction(storeNames, mode) {
        // STRENGTHENED (i): an op on a closed handle throws InvalidStateError.
        if (this._closed) throw invalidState();
        const names = Array.isArray(storeNames) ? storeNames : [storeNames];
        const tx = {
          oncomplete: null,
          onerror: null,
          aborted: false,
          abort() { this.aborted = true; if (this.onerror) this.onerror({ target: this }); },
          objectStore(n) {
            const s = snap.stores.get(n);
            if (!s) throw new Error('store not found: ' + n);
            return storeFacade(s, tx);
          },
        };
        void names;
        void mode;
        queueMicrotask(() => queueMicrotask(() => queueMicrotask(() => {
          if (!tx.aborted && tx.oncomplete) tx.oncomplete({ target: tx });
        })));
        return tx;
      },
    };
  }

  const api = {
    open(name, version) {
      openCount++; // STRENGTHENED (ii): every physical open is counted.
      const req = {};
      queueMicrotask(() => {
        let entry = dbs.get(name);
        const oldVersion = entry ? entry.version : 0;
        if (!entry) {
          entry = { version: 0, stores: new Map() };
          dbs.set(name, entry);
        }
        const db = makeDb(entry, name);
        if (version != null && version > oldVersion) {
          entry.version = version;
          if (req.onupgradeneeded) {
            const fakeTx = {
              oncomplete: null, onerror: null,
              abort() {},
              objectStore(n) {
                const s = entry.stores.get(n);
                if (!s) throw new Error('store not found in upgrade tx: ' + n);
                return storeFacade(s, this);
              },
            };
            req.onupgradeneeded({
              target: { result: db, transaction: fakeTx },
              oldVersion: oldVersion,
              newVersion: version,
            });
          }
        }
        req.result = db;
        openedHandles.push(db); // STRENGTHENED (ii): expose the real handle.
        if (req.onsuccess) req.onsuccess({ target: { result: db } });
      });
      return req;
    },
    // STRENGTHENED (iii): databases() reflects the live registry.
    databases() {
      return Promise.resolve(
        Array.from(dbs.entries()).map(([n, e]) => ({ name: n, version: e.version }))
      );
    },
    deleteDatabase(name) {
      const req = {};
      dbs.delete(name);
      queueMicrotask(() => { if (req.onsuccess) req.onsuccess({ target: req }); });
      return req;
    },
    // ---- test seams ----
    get _openCount() { return openCount; },
    _openedHandles: openedHandles,
    // Pre-create a database (e.g. the legacy emotion_code_portfolio) PRESENT.
    _stage(name, version, storesSpec) {
      const entry = { version: version, stores: new Map() };
      for (const sName of Object.keys(storesSpec || {})) {
        const spec = storesSpec[sName];
        const s = makeStore(sName, { keyPath: spec.keyPath, autoIncrement: spec.autoIncrement });
        (spec.records || []).forEach((r) => { s.records.set(r[spec.keyPath], clone(r)); });
        entry.stores.set(sName, s);
      }
      dbs.set(name, entry);
    },
    _peek(name, store) {
      const e = dbs.get(name);
      if (!e) return null;
      const s = e.stores.get(store);
      return s ? Array.from(s.records.values()) : null;
    },
    _hasDatabase(name) { return dbs.has(name); },
  };
  return api;
}

const IDBKeyRange = { only(v) { return { _only: v }; } };

// ────────────────────────────────────────────────────────────────────
// Per-scenario sandbox loader — fresh module state every call so each test
// starts from a clean _migrationDone/_dbPromise/_seedingDone.
// ────────────────────────────────────────────────────────────────────

const DB_SRC = fs.readFileSync(path.join(__dirname, '..', 'assets', 'db.js'), 'utf8');

function loadDB(opts) {
  opts = opts || {};
  const idb = makeIDBShim();
  if (typeof opts.stage === 'function') opts.stage(idb);
  const sandbox = {
    // Any non-"demo-mode" name routes DB_NAME to "sessions_garden" so
    // migrateOldDB() does NOT short-circuit at db.js:17.
    window: { name: opts.windowName || 'app' },
    indexedDB: idb,
    IDBKeyRange: IDBKeyRange,
    localStorage: { getItem() { return null; }, setItem() {} },
    document: {
      getElementById() { return null; },
      createElement() { return { setAttribute() {}, append() {}, prepend() {}, set onclick(v) {} }; },
      body: { prepend() {} },
    },
    console: { error() {}, warn() {}, log() {} },
    setTimeout, clearTimeout, queueMicrotask, Promise, JSON, Math, Date, Array, Object, Set, Map,
  };
  if (opts.snippetsSeed) sandbox.window.SNIPPETS_SEED = opts.snippetsSeed;
  vm.createContext(sandbox);
  vm.runInContext(DB_SRC, sandbox, { filename: 'assets/db.js' });
  const PortfolioDB = sandbox.window.PortfolioDB;
  if (!PortfolioDB) throw new Error('window.PortfolioDB not exposed after loading db.js');
  return { PortfolioDB, idb, sandbox };
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT (' + ms + 'ms): ' + label +
        ' — likely a migrate->openDB pooling deadlock')), ms)),
  ]);
}

const LEGACY_DB = 'emotion_code_portfolio';
const NEW_DB = 'sessions_garden';

// ────────────────────────────────────────────────────────────────────
// Test runner (mirrors the suite's EXPECTED_COUNT vacuous-green guard).
// ────────────────────────────────────────────────────────────────────

const EXPECTED_COUNT = 5; // Tests A, B, C, D, E — a dropped `await test(...)` FAILs.
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log('  PASS  ' + name);
    passed++;
  } catch (err) {
    console.log('  FAIL  ' + name);
    console.log('        ' + (err && err.message || err));
    if (err && err.stack) {
      console.log('        ' + err.stack.split('\n').slice(1, 4).join('\n        '));
    }
    failed++;
  }
}

(async () => {
  // ─── A. Pooled reuse: repeated open returns a working handle ─────────
  await test('A. Two sequential getAllClients() each return a working handle (getAll succeeds)', async () => {
    const { PortfolioDB } = loadDB(); // no legacy DB → migration short-circuits at :64
    const first = await PortfolioDB.getAllClients();
    const second = await PortfolioDB.getAllClients();
    assert.ok(Array.isArray(first), 'first getAllClients must resolve to an array (working handle)');
    assert.ok(Array.isArray(second), 'second getAllClients must resolve to an array (working handle)');
  });

  // ─── B. Invalidate-on-close: falsifiable via closed-handle throw + open-count delta ─
  await test('B. After onversionchange->close, the cached handle throws InvalidStateError AND the next open delta is exactly 1', async () => {
    const { PortfolioDB, idb } = loadDB(); // fresh DB, no legacy DB staged → migration adds no opens

    // Open + use a handle through the public consumer.
    const before = await PortfolioDB.getAllClients();
    assert.ok(Array.isArray(before), 'baseline getAllClients must succeed');

    const handle = idb._openedHandles[idb._openedHandles.length - 1];
    assert.ok(handle && typeof handle.onversionchange === 'function',
      'db.js must have registered an onversionchange handler on the opened connection');

    // Fire the version-change path (the app wires this to db.close()).
    handle.onversionchange();

    // (a) The SAME (now-closed) handle is observably broken — proves close() closed it.
    assert.throws(
      () => handle.transaction('clients', 'readonly'),
      (e) => e && e.name === 'InvalidStateError',
      'an op on the closed cached handle must throw InvalidStateError'
    );

    // (b) The next open must be a FRESH physical open (delta exactly 1) and succeed.
    const countBefore = idb._openCount;
    const after = await PortfolioDB.getAllClients();
    assert.ok(Array.isArray(after), 'getAllClients after invalidation must return a fresh working handle');
    const delta = idb._openCount - countBefore;
    assert.strictEqual(delta, 1,
      'post-close open-count delta must be exactly 1 (RED if onversionchange invalidation is dropped: ' +
      'broken pooling reuses the closed handle → delta 0 AND getAllClients rejects)');
  });

  // ─── C. No double-seed, no deadlock — LEGACY DB STAGED PRESENT ───────
  await test('C. Concurrent opens with legacy DB present: single seed, both settle (no migrate->openDB deadlock)', async () => {
    const seed = [{ id: 'seed.a' }, { id: 'seed.b' }, { id: 'seed.c' }];
    const { PortfolioDB, idb } = loadDB({
      snippetsSeed: seed,
      // Stage the legacy DB PRESENT so migrateOldDB() does NOT short-circuit at
      // db.js:64 and the recursive `await openDB()` at db.js:67 actually runs.
      stage: (s) => s._stage(LEGACY_DB, 5, {
        clients: { keyPath: 'id', records: [{ id: 1, name: 'Legacy Client' }] },
        sessions: { keyPath: 'id', records: [] },
      }),
    });

    // Two concurrent opens through the public consumer. The 5s race turns a
    // pooling deadlock into a fast, legible FAIL (the suite's 120s SIGKILL is the
    // outer backstop).
    const results = await withTimeout(
      Promise.allSettled([PortfolioDB.getAllClients(), PortfolioDB.getAllClients()]),
      5000,
      'concurrent getAllClients with legacy DB present'
    );
    assert.strictEqual(results.length, 2, 'both concurrent opens must settle (no hang/deadlock)');

    // Single seed: the snippets store ends with EXACTLY the seed count (read via
    // persisted store state, not an internal flag).
    const snippets = idb._peek(NEW_DB, 'snippets') || [];
    assert.strictEqual(snippets.length, seed.length,
      'snippets must be seeded exactly once (got ' + snippets.length + ', expected ' + seed.length + ')');
  });

  // ─── D. Migrate once — LEGACY DB STAGED PRESENT ─────────────────────
  await test('D. Migration side-effect runs exactly once across multiple opens (legacy DB consumed once)', async () => {
    const { PortfolioDB, idb } = loadDB({
      stage: (s) => s._stage(LEGACY_DB, 5, {
        clients: { keyPath: 'id', records: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] },
        sessions: { keyPath: 'id', records: [] },
      }),
    });

    assert.ok(idb._hasDatabase(LEGACY_DB), 'precondition: legacy DB must be staged present');

    // Drive several opens; migration must run on the first and short-circuit after.
    // (On a poisoned-handle path some of these may reject — we assert the migration
    //  SIDE-EFFECT via persisted state, not the handle, so allSettled is correct.)
    await withTimeout(
      Promise.allSettled([
        PortfolioDB.getAllClients(),
        PortfolioDB.getAllClients(),
        PortfolioDB.getAllClients(),
      ]),
      5000,
      'repeated getAllClients with legacy DB present'
    );

    // The two legacy clients were copied into the new DB exactly once (not doubled).
    const migrated = idb._peek(NEW_DB, 'clients') || [];
    assert.strictEqual(migrated.length, 2,
      'new DB must contain exactly the 2 migrated clients (once, not doubled) — got ' + migrated.length);

    // The legacy DB was consumed (deleted) — the migration ran.
    assert.strictEqual(idb._hasDatabase(LEGACY_DB), false,
      'legacy DB must be deleted after migration (side-effect occurred exactly once)');
  });

  // ─── E. CR-01 regression: the handle RETURNED after migration is USABLE ─
  // Where D asserts the migration SIDE-EFFECT (via _peek, tolerant of a poisoned
  // handle through allSettled), E asserts the CONSUMER-VISIBLE contract: with the
  // legacy DB staged present, a SINGLE getAllClients() must RESOLVE to the migrated
  // array — i.e. openDB() must hand back a LIVE connection, not the closed handle
  // that migrateOldDB()'s newDB.close() left in the pool. Falsifiable: on the
  // unfixed pool (no _dbPromise invalidation after the migration close) the outer
  // openDB() returns the closed handle, getAllClients() does db.transaction(...)
  // → throws InvalidStateError → the promise REJECTS → this test FAILs (RED).
  // After nulling _dbPromise at both migration close sites, the outer openDB()
  // re-opens a fresh live handle and the read resolves (GREEN).
  await test('E. With legacy DB present, getAllClients() RESOLVES to the migrated clients (returned handle is live, not closed)', async () => {
    const { PortfolioDB } = loadDB({
      stage: (s) => s._stage(LEGACY_DB, 5, {
        clients: { keyPath: 'id', records: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] },
        sessions: { keyPath: 'id', records: [] },
      }),
    });

    // A SINGLE call (not allSettled): on the unfixed code this REJECTS with
    // InvalidStateError, so the await throws and the test fails for the right reason.
    const clients = await withTimeout(
      PortfolioDB.getAllClients(),
      5000,
      'getAllClients on the migration page-load'
    );

    assert.ok(Array.isArray(clients),
      'getAllClients() on the migration load must RESOLVE to an array — a closed pooled handle would reject with InvalidStateError (CR-01)');
    assert.strictEqual(clients.length, 2,
      'the returned live handle must read the 2 migrated clients — got ' + clients.length);
    const names = clients.map((c) => c.name).sort();
    assert.deepStrictEqual(names, ['Alice', 'Bob'],
      'the resolved array must contain the migrated client records, proving the handle is usable');
  });

  // ─── Report + vacuous-green guard ───────────────────────────────────
  console.log('');
  const ran = passed + failed;
  if (ran !== EXPECTED_COUNT) {
    console.log('FAIL  scenario-count guard: ran ' + ran + ' of ' + EXPECTED_COUNT +
      ' — a test() was dropped or threw before registering.');
    process.exit(1);
  }
  console.log('Phase 31-01 openDB pooling characterization — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
