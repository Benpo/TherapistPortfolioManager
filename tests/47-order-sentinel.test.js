/**
 * tests/47-order-sentinel.test.js
 *
 * BEHAVIOR: the section-order sentinel round-trips through the dedicated
 * db.js write path, keeping the pre-existing snippetsDeletedSeeds sentinel
 * byte-for-byte unchanged.
 *
 *   1. Write {sectionKey:"sectionOrder", version, items} then read it back via
 *      getSectionOrderRecord — items[] and version survive verbatim.
 *   2. _writeTherapistSentinel rejects a sectionKey not in the allow-set.
 *   3. A non-array items is coerced to [] on write (type-guard).
 *   4. A non-number version is coerced to 1 on write.
 *   5. The snippetsDeletedSeeds sentinel path still writes {sectionKey, deletedIds}.
 *   6. getSectionOrderRecord returns null when no order row exists.
 *   7. getAllTherapistSettings still returns the sectionOrder row alongside
 *      section rows (section-row walkers filter it by sectionKey).
 *
 * STRATEGY: an in-process IndexedDB shim (the subset db.js exercises) drives the
 * REAL assets/db.js in a vm sandbox, routed to demo_portfolio (window.name =
 * "demo-mode") to skip the legacy-DB migration path. Mirrors 24-04-idb-migration.
 *
 * Run: node tests/47-order-sentinel.test.js  — exit 0 = pass, 1 = fail.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function makeIDBShim() {
  const dbs = new Map();
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
  function storeFacade(snap) {
    function keyOf(record) { return snap.keyPath ? record[snap.keyPath] : undefined; }
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
          snap.records.set(key, clone(record));
          req.result = key;
          if (req.onsuccess) req.onsuccess({ target: req });
        });
        return req;
      },
      put(record) {
        const req = {};
        queueMicrotask(() => {
          snap.records.set(keyOf(record), clone(record));
          req.result = keyOf(record);
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
                .filter((r) => r[idx.keyPath] === keyValue).map(clone);
              if (req.onsuccess) req.onsuccess({ target: req });
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
      objectStoreNames: { contains(name) { return snap.stores.has(name); } },
      close() {},
      onversionchange: null,
      createObjectStore(name, options) {
        const s = makeStore(name, options);
        snap.stores.set(name, s);
        return storeFacade(s);
      },
      transaction(storeNames) {
        const tx = {
          oncomplete: null, onerror: null, aborted: false,
          abort() { this.aborted = true; if (this.onerror) this.onerror({ target: this }); },
          objectStore(n) {
            const s = snap.stores.get(n);
            if (!s) throw new Error('store not found: ' + n);
            return storeFacade(s);
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
    open(name, version) {
      const req = {};
      queueMicrotask(() => {
        let entry = dbs.get(name);
        const oldVersion = entry ? entry.version : 0;
        if (!entry) { entry = { version: 0, stores: new Map() }; dbs.set(name, entry); }
        const db = makeDb(entry);
        if (version > oldVersion) {
          entry.version = version;
          if (req.onupgradeneeded) {
            const fakeTx = {
              oncomplete: null, onerror: null, abort() {},
              objectStore(n) {
                const s = entry.stores.get(n);
                if (!s) throw new Error('store not found in upgrade tx: ' + n);
                return storeFacade(s);
              },
            };
            req.onupgradeneeded({
              target: { result: db, transaction: fakeTx },
              oldVersion: oldVersion, newVersion: version,
            });
          }
        }
        req.result = db;
        if (req.onsuccess) req.onsuccess({ target: { result: db } });
      });
      return req;
    },
    databases() { return Promise.resolve([]); },
  };
}

const IDBKeyRange = { only(v) { return { _only: v }; } };

const idb = makeIDBShim();
const sandbox = {
  window: { name: 'demo-mode' },
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
vm.createContext(sandbox);

const seedSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'snippets-seed.js'), 'utf8');
const dbSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'db.js'), 'utf8');
vm.runInContext(seedSrc, sandbox, { filename: 'assets/snippets-seed.js' });
vm.runInContext(dbSrc, sandbox, { filename: 'assets/db.js' });

const PortfolioDB = sandbox.window.PortfolioDB;
if (!PortfolioDB || typeof PortfolioDB.getSectionOrderRecord !== 'function') {
  console.error('FAIL: PortfolioDB.getSectionOrderRecord not exported.');
  process.exit(1);
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async () => {
  await test('1. write→read round-trip preserves items[] and version', async () => {
    await PortfolioDB._writeTherapistSentinel({
      sectionKey: 'sectionOrder', version: 3,
      items: [{ type: 'section', key: 'issues' }],
    });
    const row = await PortfolioDB.getSectionOrderRecord();
    assert.ok(row, 'getSectionOrderRecord must return the row');
    assert.strictEqual(row.sectionKey, 'sectionOrder');
    assert.strictEqual(row.version, 3);
    assert.strictEqual(row.items.length, 1);
    assert.strictEqual(row.items[0].key, 'issues');
  });

  await test('2. rejects an unregistered sectionKey', async () => {
    let threw = false;
    try { await PortfolioDB._writeTherapistSentinel({ sectionKey: '__nope__', items: [] }); }
    catch (_) { threw = true; }
    assert.ok(threw, 'unknown sentinel key must throw');
  });

  await test('3. non-array items is coerced to []', async () => {
    await PortfolioDB._writeTherapistSentinel({
      sectionKey: 'sectionOrder', version: 1, items: 'notArray',
    });
    const row = await PortfolioDB.getSectionOrderRecord();
    assert.ok(Array.isArray(row.items), 'items must be an array');
    assert.strictEqual(row.items.length, 0, 'coerced to empty array');
  });

  await test('4. non-number version is coerced to 1', async () => {
    await PortfolioDB._writeTherapistSentinel({
      sectionKey: 'sectionOrder', version: 'v9', items: [{ type: 'section', key: 'issues' }],
    });
    const row = await PortfolioDB.getSectionOrderRecord();
    assert.strictEqual(row.version, 1, 'non-number version → 1');
  });

  await test('5. snippetsDeletedSeeds sentinel path is unchanged', async () => {
    await PortfolioDB._writeTherapistSentinel({
      sectionKey: 'snippetsDeletedSeeds', deletedIds: ['a', 'b', 3, null],
    });
    const rows = await PortfolioDB.getAllTherapistSettings();
    const seedRow = rows.find((r) => r.sectionKey === 'snippetsDeletedSeeds');
    assert.ok(seedRow, 'deleted-seeds row must exist');
    assert.deepStrictEqual(seedRow.deletedIds, ['a', 'b'], 'non-string entries filtered');
    assert.strictEqual(seedRow.items, undefined, 'no items field leaks onto the deleted-seeds row');
  });

  await test('6. getAllTherapistSettings returns the sectionOrder row alongside others', async () => {
    await PortfolioDB.setTherapistSetting({ sectionKey: 'trapped', customLabel: 'Locked', enabled: true });
    const rows = await PortfolioDB.getAllTherapistSettings();
    const orderRow = rows.find((r) => r.sectionKey === 'sectionOrder');
    const sectionRow = rows.find((r) => r.sectionKey === 'trapped');
    assert.ok(orderRow, 'sectionOrder row present');
    assert.ok(sectionRow, 'section row present');
    // A section-row walker filters the sentinel by sectionKey.
    const walkable = rows.filter((r) => r.sectionKey !== 'sectionOrder' && r.sectionKey !== 'snippetsDeletedSeeds');
    assert.ok(walkable.every((r) => r.sectionKey !== 'sectionOrder'));
  });

  console.log('');
  console.log('47-order-sentinel — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => {
  console.error('FATAL test harness error:', err && err.stack || err);
  process.exit(1);
});
