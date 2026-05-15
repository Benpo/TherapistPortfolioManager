/**
 * Phase 25 Plan 04 Task 1 — Behavior test for BackupManager.getChipState
 * + computeBackupRecencyState delegation proof.
 *
 * getChipState is the pure-function state derivation used by the cloud icon
 * (no chip element exists anymore — Phase 25 D-13 update 2026-05-15). The
 * function name retained for code-stability; it returns the cloud-icon
 * state string regardless of name.
 *
 * Pure-function test: loads assets/backup.js in a vm sandbox, calls
 * BM.getChipState({ now, lastExport, intervalMs }) with all OFF/ON ×
 * never/fresh/warning/danger combinations.
 *
 * Run: node tests/25-04-cloud-state.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Stubs (minimal — getChipState is pure; computeBackupRecencyState reads localStorage)
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
  window: {},
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
  setTimeout, clearTimeout, Promise, JSON, Math, Date, Array, Object, Set, Map, RegExp, String, Number, Boolean,
};
sandbox.window.localStorage = storage;
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'backup.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/backup.js' });
} catch (err) {
  console.error('FATAL: assets/backup.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const BM = sandbox.window.BackupManager;
if (!BM || typeof BM.getChipState !== 'function') {
  console.error('FAIL: BackupManager.getChipState is not exposed on the public API.');
  console.error('      Plan 04 Task 1 must add the helper inside the IIFE and add the');
  console.error('      `getChipState: getChipState,` line to the return object.');
  process.exit(1);
}
if (typeof BM.computeBackupRecencyState !== 'function') {
  console.error('FAIL: BackupManager.computeBackupRecencyState is not exposed.');
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

const NOW = 1700000000000;
const DAY = 24 * 60 * 60 * 1000;

// ─── Table: getChipState pure-function semantics ────────────────────

const cases = [
  // [label, opts, expected]
  ['lastExport=null → never',                  { now: NOW, lastExport: null,                 intervalMs: null      }, 'never'],
  ['lastExport=undefined → never (ON daily)',  { now: NOW, lastExport: undefined,            intervalMs: DAY       }, 'never'],
  ['lastExport=NaN → never',                   { now: NOW, lastExport: NaN,                  intervalMs: null      }, 'never'],

  // OFF mode (intervalMs=null): fresh ≤7d, warning >7 ≤14, danger >14
  ['OFF: 1d elapsed → fresh',                  { now: NOW, lastExport: NOW - 1  * DAY,       intervalMs: null      }, 'fresh'],
  ['OFF: 6d elapsed → fresh',                  { now: NOW, lastExport: NOW - 6  * DAY,       intervalMs: null      }, 'fresh'],
  ['OFF: exactly 7d → fresh (boundary inclusive)', { now: NOW, lastExport: NOW - 7  * DAY,   intervalMs: null      }, 'fresh'],
  ['OFF: 8d elapsed → warning',                { now: NOW, lastExport: NOW - 8  * DAY,       intervalMs: null      }, 'warning'],
  ['OFF: exactly 14d → warning (boundary inclusive)', { now: NOW, lastExport: NOW - 14 * DAY, intervalMs: null     }, 'warning'],
  ['OFF: 15d elapsed → danger',                { now: NOW, lastExport: NOW - 15 * DAY,       intervalMs: null      }, 'danger'],

  // ON weekly (intervalMs=7d): fresh ≤7d, warning >7 ≤14, danger >14
  ['ON weekly: 1d elapsed → fresh',            { now: NOW, lastExport: NOW - 1  * DAY,       intervalMs: 7 * DAY   }, 'fresh'],
  ['ON weekly: exactly interval (7d) → fresh', { now: NOW, lastExport: NOW - 7  * DAY,       intervalMs: 7 * DAY   }, 'fresh'],
  ['ON weekly: 8d elapsed → warning',          { now: NOW, lastExport: NOW - 8  * DAY,       intervalMs: 7 * DAY   }, 'warning'],
  ['ON weekly: 11d elapsed → warning (D-14 2026-05-15 fix)', { now: NOW, lastExport: NOW - 11 * DAY, intervalMs: 7 * DAY }, 'warning'],
  ['ON weekly: exactly 2×interval (14d) → warning (boundary inclusive)', { now: NOW, lastExport: NOW - 14 * DAY, intervalMs: 7 * DAY }, 'warning'],
  ['ON weekly: 15d elapsed → danger',          { now: NOW, lastExport: NOW - 15 * DAY,       intervalMs: 7 * DAY   }, 'danger'],

  // ON daily (intervalMs=1d) — 30d is far beyond 2d → danger
  ['ON daily: 30d elapsed → danger',           { now: NOW, lastExport: NOW - 30 * DAY,       intervalMs: DAY       }, 'danger'],
];

for (const [label, opts, expected] of cases) {
  test(label, () => {
    const actual = BM.getChipState(opts);
    assert.strictEqual(actual, expected,
      `expected ${expected}, got ${actual} for opts=${JSON.stringify(opts)}`);
  });
}

// ─── D-30 delegation proof: computeBackupRecencyState delegates to getChipState ───

test('D-30: computeBackupRecencyState() with empty localStorage → never', () => {
  storage.clear();
  assert.strictEqual(BM.computeBackupRecencyState(), 'never');
});

test('D-30: computeBackupRecencyState() with portfolioLastExport=now-3d → fresh', () => {
  storage.clear();
  storage.setItem('portfolioLastExport', String(Date.now() - 3 * DAY));
  assert.strictEqual(BM.computeBackupRecencyState(), 'fresh');
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log(`Plan 04 cloud-state tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
