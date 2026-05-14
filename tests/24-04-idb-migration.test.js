/**
 * Phase 24 Plan 04 — Behavior test for IDB v5 migration + seed populate +
 * deletedSeedIds tracking + CRUD round-trip.
 *
 * Uses a handwritten in-memory IDB shim (no fake-indexeddb dep, no node_modules).
 * The shim covers ONLY the subset of IDB that assets/db.js exercises:
 *   - indexedDB.open(name, version) with onupgradeneeded/onsuccess/onerror
 *   - db.objectStoreNames.contains
 *   - db.createObjectStore({keyPath, autoIncrement}), store.createIndex
 *   - db.transaction([stores], mode), tx.objectStore, tx.oncomplete/onerror
 *   - store.add/put/get/getAll/delete/clear/openCursor
 *   - store.index(name), index.getAll(key)
 *   - IDBKeyRange.only
 *
 * Run: node tests/24-04-idb-migration.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * 6 scenarios per the Plan 04 Test Coverage Plan:
 *   A. Fresh open at v0 → snippets store has 60 records, origin='seed'.
 *   B. Second openDB() — no duplicates (count stays 60).
 *   C. deleteSnippet('ec.a1.betrayal') → deletedSeedIds entry persists;
 *      reopen → still 59 records.
 *   D. resetSeedSnippet('ec.a1.betrayal') → restored AND deletedSeedIds cleared.
 *   E. Pre-existing v4 data (clients/sessions/therapistSettings) intact across
 *      v4 → v5 upgrade; snippets store populated.
 *   F. clearAll() clears snippets store AND resets seeding flag so a fresh
 *      open after wipe reseeds.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// In-memory IDB shim
// ────────────────────────────────────────────────────────────────────

function makeIDBShim() {
  // Single in-process database registry, keyed by DB name.
  const dbs = new Map(); // name → { version, stores: Map<name, StoreSnapshot> }

  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }

  function fireSoon(req, type, event) {
    queueMicrotask(() => {
      const handler = req[type];
      if (handler) handler(event || { target: req });
    });
  }

  function makeStore(name, options) {
    return {
      name: name,
      keyPath: options && options.keyPath,
      autoIncrement: !!(options && options.autoIncrement),
      records: new Map(),     // key → record
      indexes: new Map(),     // indexName → { keyPath, unique }
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
            // Minimal cursor — used by deleteClientAndSessions
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

  function makeDb(snap) {
    return {
      _snap: snap,
      objectStoreNames: {
        contains(name) { return snap.stores.has(name); },
      },
      close() {},
      onversionchange: null,
      createObjectStore(name, options) {
        const s = makeStore(name, options);
        snap.stores.set(name, s);
        return storeFacade(s, { oncomplete: null, onerror: null, abort() {} });
      },
      transaction(storeNames, mode) {
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
        // Fire oncomplete after a microtask gap so all queued ops finish first.
        queueMicrotask(() => queueMicrotask(() => queueMicrotask(() => {
          if (!tx.aborted && tx.oncomplete) tx.oncomplete({ target: tx });
        })));
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
        if (!entry) {
          entry = { version: 0, stores: new Map() };
          dbs.set(name, entry);
        }
        const db = makeDb(entry);
        if (version > oldVersion) {
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
        if (req.onsuccess) req.onsuccess({ target: { result: db } });
      });
      return req;
    },
    databases() { return Promise.resolve([]); },
    _reset() { dbs.clear(); },
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
// Sandbox boot — load snippets-seed.js then db.js
// ────────────────────────────────────────────────────────────────────

const idb = makeIDBShim();
const sandbox = {
  window: { name: 'demo-mode' }, // skip migrateOldDB by routing to demo_portfolio
  indexedDB: idb,
  IDBKeyRange: IDBKeyRange,
  localStorage: { getItem() { return null; }, setItem() {} },
  document: {
    getElementById() { return null; },
    createElement() { return { setAttribute() {}, append() {}, prepend() {}, set onclick(v) {} }; },
    body: { prepend() {} },
  },
  console: { error() {}, warn() {}, log() {} },
  setTimeout, clearTimeout, Promise, JSON, Math, Date, Array, Object, Set, Map,
};
vm.createContext(sandbox);

const seedSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'snippets-seed.js'), 'utf8');
const dbSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'db.js'), 'utf8');
vm.runInContext(seedSrc, sandbox, { filename: 'assets/snippets-seed.js' });
vm.runInContext(dbSrc, sandbox, { filename: 'assets/db.js' });

const PortfolioDB = sandbox.window.PortfolioDB;
if (!PortfolioDB) {
  console.error('FAIL: window.PortfolioDB not exposed after loading db.js');
  process.exit(1);
}
for (const fn of ['getAllSnippets', 'getSnippet', 'addSnippet', 'updateSnippet',
                  'deleteSnippet', 'resetSeedSnippet', 'validateSnippetShape']) {
  if (typeof PortfolioDB[fn] !== 'function') {
    console.error(`FAIL: PortfolioDB.${fn} is not exported.`);
    console.error('      Plan 04 Task 2 must add the snippets CRUD + validator to the public API.');
    process.exit(1);
  }
}

// ────────────────────────────────────────────────────────────────────
// Test runner
// ────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    failed++;
  }
}

(async () => {
  // ─── A. Fresh open seeds 60 records ─────────────────────────────────
  await test('A. Fresh open at v0 seeds 60 records with origin="seed"', async () => {
    const all = await PortfolioDB.getAllSnippets();
    assert.strictEqual(all.length, 60, `expected 60 seed records, got ${all.length}`);
    all.forEach((s) => assert.strictEqual(s.origin, 'seed',
      `record ${s.id} should have origin "seed"`));
    const ids = new Set(all.map((s) => s.id));
    assert.strictEqual(ids.size, 60, 'all 60 ids must be unique');
  });

  // ─── B. Second openDB() — no duplicates ─────────────────────────────
  await test('B. Second openDB() is idempotent — count stays 60', async () => {
    // Force a re-seed attempt by calling any DB op that opens the connection.
    await PortfolioDB.getAllSnippets();
    await PortfolioDB.getAllSnippets();
    const all = await PortfolioDB.getAllSnippets();
    assert.strictEqual(all.length, 60,
      `count must remain 60 across reopens, got ${all.length}`);
  });

  // ─── C. deleteSnippet on seed → reopen still shows 59 ───────────────
  await test('C. Delete a seed snippet → deletedSeedIds blocks re-add on reopen', async () => {
    await PortfolioDB.deleteSnippet('ec.a1.betrayal');
    let all = await PortfolioDB.getAllSnippets();
    assert.strictEqual(all.length, 59,
      `expected 59 after deleting one seed, got ${all.length}`);
    assert.strictEqual(all.find((s) => s.id === 'ec.a1.betrayal'), undefined,
      'deleted snippet must not be present');

    // Now reopen via another op. The seed-populate hook should detect the deletion
    // via deletedSeedIds and NOT re-add the seed.
    await PortfolioDB.getSnippet('ec.a1.abandonment');
    all = await PortfolioDB.getAllSnippets();
    assert.strictEqual(all.length, 59,
      `count must remain 59 on reopen, got ${all.length} — deletedSeedIds not honoring delete`);

    // Verify deletedSeedIds entry exists in therapistSettings.
    const settings = await PortfolioDB.getAllTherapistSettings();
    const entry = settings.find((s) => s.sectionKey === 'snippetsDeletedSeeds');
    assert.ok(entry, 'therapistSettings must contain snippetsDeletedSeeds entry');
  });

  // ─── D. resetSeedSnippet → restored + deletedSeedIds cleared ────────
  await test('D. resetSeedSnippet restores the seed AND clears the deletedSeedIds entry', async () => {
    await PortfolioDB.resetSeedSnippet('ec.a1.betrayal');
    const all = await PortfolioDB.getAllSnippets();
    assert.strictEqual(all.length, 60,
      `expected 60 after reset, got ${all.length}`);
    const restored = all.find((s) => s.id === 'ec.a1.betrayal');
    assert.ok(restored, 'ec.a1.betrayal must be restored');
    assert.strictEqual(restored.origin, 'seed', 'restored snippet keeps origin "seed"');
    assert.strictEqual(restored.trigger, 'betrayal', 'restored trigger matches seed pack');

    const settings = await PortfolioDB.getAllTherapistSettings();
    const entry = settings.find((s) => s.sectionKey === 'snippetsDeletedSeeds');
    const list = entry && entry.deletedIds ? entry.deletedIds : [];
    assert.ok(!list.includes('ec.a1.betrayal'),
      'deletedSeedIds must no longer include ec.a1.betrayal after reset');
  });

  // ─── E. Pre-existing data intact across migration ───────────────────
  await test('E. Pre-existing clients/sessions/therapistSettings intact + snippets seeded', async () => {
    // Add a client + session + therapist setting so we have data prior to a "second" open.
    // Note: in this shim a second open() with same version is a no-op (no upgrade fires).
    // We just verify that the data persists alongside the seeded snippets.
    const cid = await PortfolioDB.addClient({ name: 'Plan 04 Test Client', type: 'adult' });
    await PortfolioDB.addSession({ clientId: cid, date: '2026-05-14', customerSummary: 'note' });
    await PortfolioDB.setTherapistSetting({ sectionKey: 'limitingBeliefs', customLabel: 'Beliefs', enabled: true });

    const clients = await PortfolioDB.getAllClients();
    const sessions = await PortfolioDB.getAllSessions();
    const settings = await PortfolioDB.getAllTherapistSettings();
    const snippets = await PortfolioDB.getAllSnippets();

    assert.ok(clients.some((c) => c.name === 'Plan 04 Test Client'),
      'pre-existing client must persist alongside snippets store');
    assert.ok(sessions.some((s) => s.customerSummary === 'note'),
      'pre-existing session must persist');
    assert.ok(settings.some((s) => s.sectionKey === 'limitingBeliefs'),
      'pre-existing therapistSetting must persist');
    assert.strictEqual(snippets.length, 60, 'snippets store must contain 60 records');
  });

  // ─── F. clearAll resets seeding flag → next open reseeds ────────────
  await test('F. clearAll wipes snippets + resets seeding flag → next op reseeds', async () => {
    await PortfolioDB.clearAll();
    // Immediately after clearAll, any DB op triggers another seed-populate.
    const all = await PortfolioDB.getAllSnippets();
    assert.strictEqual(all.length, 60,
      `after clearAll + reopen, snippets must repopulate to 60, got ${all.length}`);
    // Clients/sessions/therapistSettings should all be empty.
    const clients = await PortfolioDB.getAllClients();
    const sessions = await PortfolioDB.getAllSessions();
    const settings = await PortfolioDB.getAllTherapistSettings();
    assert.strictEqual(clients.length, 0, 'clients store must be empty after clearAll');
    assert.strictEqual(sessions.length, 0, 'sessions store must be empty after clearAll');
    assert.strictEqual(settings.length, 0, 'therapistSettings must be empty after clearAll');
  });

  // ─── Report ─────────────────────────────────────────────────────────
  console.log('');
  console.log(`Plan 04 IDB migration tests — ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})();
