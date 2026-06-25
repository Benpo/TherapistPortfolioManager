/**
 * Phase 29 Plan 04 — Falsifiable behavior test for the OBS-01 post-load
 * DOUBLE-LOG gap (GAP 2).
 *
 * Honors project memory `feedback-behavior-verification.md`: this asserts an
 * OBSERVABLE effect — the number of persisted entries for ONE post-load error —
 * never the presence of a symbol.
 *
 * The bug: the inline <head> early-buffer handler (byte-identical across all 21
 * SW-registered pages) keeps writing `source:'early'` entries after
 * crashlog.js loads. crashlog.js installHandlers() also chains the prior inline
 * window.onerror, so a SINGLE error thrown AFTER load is captured TWICE — once
 * as source:'early' (inline P) and once as its real source (module). Because
 * entryKey() includes `source`, dedupe() keeps both → the log double-counts and
 * burns the 50-entry budget ~2x.
 *
 * Design (RED→GREEN purely from the HTML edit): this test READS the real inline
 * snippet out of report.html (the canonical, byte-identical copy) and runs it
 * in the sandbox BEFORE loading crashlog.js — exactly mirroring real page load
 * order. So:
 *   - On current HTML (no guard in P()) → a post-load error yields TWO entries
 *     → this test FAILS (RED).
 *   - After Task 3 inserts `if(self.CrashLog)return;` as P()'s first statement
 *     across the 21 pages → the inline P() no-ops once CrashLog is present →
 *     exactly ONE entry (the real source) → this test PASSES (GREEN).
 *
 * Zero-npm: reuses the established handwritten in-memory IDB shim + localStorage
 * mock + window mock + `vm` sandbox from tests/29-01-crashlog-capture.test.js.
 * NO jsdom / fake-indexeddb.
 *
 * Run: node tests/29-05-crashlog-double-log.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Minimal in-memory IDB shim (subset crashlog.js + db.js exercise)
// — copied verbatim from tests/29-01-crashlog-capture.test.js (zero-npm).
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

// ────────────────────────────────────────────────────────────────────
// localStorage mock
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
// Window mock — captures onerror + unhandledrejection handlers so the test
// can dispatch events the way a browser would. Supports the inline snippet
// reassigning window.onerror and stacking addEventListener listeners.
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
    location: { href: 'https://app.example/report.html' },
  };
  return win;
}

// ────────────────────────────────────────────────────────────────────
// Extract the REAL inline early-buffer snippet from report.html (the
// canonical, byte-identical copy) so this test exercises exactly what ships.
// The snippet is the inline <head> IIFE containing `crashlogBuffer`.
// ────────────────────────────────────────────────────────────────────

function readInlineSnippet() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'report.html'), 'utf8');
  const line = html.split('\n').find((l) => /var B='crashlogBuffer'/.test(l));
  if (!line) {
    throw new Error('could not locate the inline crashlogBuffer snippet in report.html');
  }
  return line.trim();
}

// ────────────────────────────────────────────────────────────────────
// Sandbox boot — load db.js, run the inline early-buffer snippet (page load
// order), THEN load crashlog.js into a shared global scope.
// ────────────────────────────────────────────────────────────────────

let fetchCalls = 0;
let xhrCalls = 0;

function boot() {
  const idb = makeIDBShim();
  const localStorage = makeLocalStorage();
  const win = makeWindow();

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
  win.name = 'demo-mode';
  vm.runInContext(dbSrc, sandbox, { filename: 'assets/db.js' });

  // Real page load order: the inline <head> early-buffer handler runs FIRST,
  // installing its own window.onerror + unhandledrejection listener that buffer
  // pre-load errors as source:'early'.
  const inlineSnippet = readInlineSnippet();
  vm.runInContext(inlineSnippet, sandbox, { filename: 'report.html#inline-early-buffer' });

  // Then crashlog.js loads — installHandlers() chains the prior inline
  // window.onerror and adds its own unhandledrejection listener.
  const clSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'crashlog.js'), 'utf8');
  vm.runInContext(clSrc, sandbox, { filename: 'assets/crashlog.js' });

  return { sandbox, idb, localStorage, win };
}

let env;
try {
  env = boot();
} catch (err) {
  console.error('FAIL: could not boot sandbox (db.js + inline snippet + crashlog.js)');
  console.error('      ' + err.message);
  process.exit(1);
}

const CrashLog = env.sandbox.CrashLog;
if (!CrashLog || typeof CrashLog.logError !== 'function' || typeof CrashLog.getEntries !== 'function') {
  console.error('FAIL: CrashLog seam not available after load');
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────────
// Test runner
// ────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

(async () => {
  // ─── A. onerror post-load → exactly ONE entry (not early + onerror) ──────
  await test('A. a single post-load uncaught error yields exactly ONE persisted entry (real source, not early)', async () => {
    await CrashLog.clear();
    const MSG = 'Post-load boom A';
    env.win._fireError(MSG, new Error(MSG));
    await new Promise((r) => setTimeout(r, 30)); // settle async append
    const entries = await CrashLog.getEntries();
    const matches = entries.filter((e) => /Post-load boom A/.test(e.message || ''));
    assert.strictEqual(matches.length, 1,
      `expected exactly ONE entry for a single post-load error, got ${matches.length} ` +
      `(sources: [${matches.map((m) => m.source).join(', ')}]) — the inline early-buffer ` +
      `handler is still writing a 'early' duplicate alongside the real-source entry`);
    assert.strictEqual(matches[0].source, 'onerror',
      `the surviving entry must be the real-source ('onerror') entry, not '${matches[0].source}'`);
  });

  // ─── B. unhandledrejection post-load → exactly ONE entry ────────────────
  await test('B. a single post-load unhandledrejection yields exactly ONE persisted entry (real source, not early)', async () => {
    await CrashLog.clear();
    const MSG = 'Post-load reject B';
    env.win._dispatch('unhandledrejection', {
      reason: new Error(MSG),
      promise: Promise.resolve(),
    });
    await new Promise((r) => setTimeout(r, 30));
    const entries = await CrashLog.getEntries();
    const matches = entries.filter((e) => /Post-load reject B/.test(e.message || ''));
    assert.strictEqual(matches.length, 1,
      `expected exactly ONE entry for a single post-load rejection, got ${matches.length} ` +
      `(sources: [${matches.map((m) => m.source).join(', ')}]) — the inline early-buffer ` +
      `handler is still writing a 'early' duplicate alongside the real-source entry`);
    assert.strictEqual(matches[0].source, 'unhandledrejection',
      `the surviving entry must be the real-source ('unhandledrejection') entry, not '${matches[0].source}'`);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
