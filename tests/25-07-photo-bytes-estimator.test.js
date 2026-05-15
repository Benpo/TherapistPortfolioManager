/**
 * Phase 25 Plan 07 Task 1 — Behavior test for PortfolioDB.estimatePhotosBytes
 * (D-24 storage usage display backing data).
 *
 * estimatePhotosBytes(clients) is a PURE function. It returns the sum of
 * (b64Length * 0.75) bytes across every client whose photoData (or legacy
 * `photo`) starts with the `data:` URL prefix. Non-data: strings, numbers,
 * null, missing fields all contribute 0.
 *
 * Strategy: vm-sandbox-load assets/db.js with NO indexeddb stub — the helper
 * is pure and never touches IDB. assets/db.js IIFE runs once on load and
 * defines async functions (which won't execute), so the load is safe even
 * without IDB.
 *
 * Run: node tests/25-07-photo-bytes-estimator.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * 8 sub-cases covering:
 *   - empty array
 *   - null photoData
 *   - short data: URL (4 b64 chars → 3 bytes)
 *   - 100-char b64 (75 bytes)
 *   - sum across two clients
 *   - legacy `photo` field handling
 *   - non-data: string (file path) → 0
 *   - non-string photoData (number) → 0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Stubs — db.js only reads window.name + sets window.PortfolioDB.
// No IDB calls happen at top-level (only inside async functions that
// the estimator does not call).
// ────────────────────────────────────────────────────────────────────

const storage = (function () {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); },
  };
})();

const sandbox = {
  window: { name: '' },
  document: {
    addEventListener() {},
    removeEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { setAttribute() {}, appendChild() {}, addEventListener() {} }; },
    body: { prepend() {}, appendChild() {} },
    head: { appendChild() {} },
  },
  localStorage: storage,
  console: { log() {}, warn() {}, error() {} },
  indexedDB: {
    open() {
      // Returns a never-resolving request; estimator never triggers IDB.
      return { onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null };
    },
  },
  // Globals db.js IIFE references at load time:
  setTimeout, clearTimeout, Promise, JSON, Math, Date, Array, Object, Set, Map, RegExp, String, Number, Boolean,
  // atob/btoa are not used by the estimator but db.js may reference them in unrelated code paths.
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
};
sandbox.window.localStorage = storage;
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'db.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/db.js' });
} catch (err) {
  console.error('FATAL: assets/db.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const DB = sandbox.window.PortfolioDB;
if (!DB || typeof DB.estimatePhotosBytes !== 'function') {
  console.error('FAIL: PortfolioDB.estimatePhotosBytes is not exposed on the public API.');
  console.error('      Plan 07 Task 1 must add the helper inside the IIFE and add the');
  console.error('      `estimatePhotosBytes: estimatePhotosBytes,` line to the return object.');
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────────
// Test runner
// ────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

// ─── Table-driven cases ─────────────────────────────────────────────

test('empty array → 0', () => {
  assert.strictEqual(DB.estimatePhotosBytes([]), 0);
});

test('null photoData → 0', () => {
  assert.strictEqual(DB.estimatePhotosBytes([{ photoData: null }]), 0);
});

test('4-char b64 data URL → 3 bytes (4 * 0.75)', () => {
  assert.strictEqual(
    DB.estimatePhotosBytes([{ photoData: 'data:image/jpeg;base64,AAAA' }]),
    3
  );
});

test('100-char b64 data URL → 75 bytes', () => {
  assert.strictEqual(
    DB.estimatePhotosBytes([
      { photoData: 'data:image/jpeg;base64,' + 'A'.repeat(100) },
    ]),
    75
  );
});

test('two clients sum to 78 bytes (3 + 75)', () => {
  assert.strictEqual(
    DB.estimatePhotosBytes([
      { photoData: 'data:image/jpeg;base64,AAAA' },
      { photoData: 'data:image/jpeg;base64,' + 'A'.repeat(100) },
    ]),
    78
  );
});

test('legacy `photo` field is honored when photoData absent → 3 bytes', () => {
  assert.strictEqual(
    DB.estimatePhotosBytes([{ photo: 'data:image/png;base64,AAAA' }]),
    3
  );
});

test('non-data: string (file path) → 0', () => {
  assert.strictEqual(
    DB.estimatePhotosBytes([{ photoData: 'photos/client-1.png' }]),
    0
  );
});

test('non-string photoData (number) → 0', () => {
  assert.strictEqual(
    DB.estimatePhotosBytes([{ photoData: 12345 }]),
    0
  );
});

// Defensive — non-array input also returns 0 (caller may pass undefined on error).
test('non-array input → 0', () => {
  assert.strictEqual(DB.estimatePhotosBytes(null), 0);
  assert.strictEqual(DB.estimatePhotosBytes(undefined), 0);
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log(`Plan 07 photo-bytes-estimator tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
