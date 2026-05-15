/**
 * Phase 25 Plan 05 Task 1 — Behavior test for BackupManager.canEnableSchedule
 * (D-18 password-mandatory enforcement).
 *
 * canEnableSchedule(mode):
 *   - mode === 'off' → always true (disabling is always allowed)
 *   - otherwise → true iff localStorage.portfolioBackupSchedulePasswordAcked === 'true'
 *
 * Run: node tests/25-05-schedule-password-mandatory.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Stubs
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
if (!BM || typeof BM.canEnableSchedule !== 'function') {
  console.error('FAIL: BackupManager.canEnableSchedule is not exposed on the public API.');
  console.error('      Plan 05 Task 1 must add the helper inside the IIFE and add the');
  console.error('      `canEnableSchedule: canEnableSchedule,` line to the return object.');
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

test('absent passwordAcked + mode=off → true (disable always allowed)', () => {
  storage.clear();
  assert.strictEqual(BM.canEnableSchedule('off'), true);
});

test('absent passwordAcked + mode=daily → false (D-18 enforcement)', () => {
  storage.clear();
  assert.strictEqual(BM.canEnableSchedule('daily'), false);
});

test('absent passwordAcked + mode=weekly → false', () => {
  storage.clear();
  assert.strictEqual(BM.canEnableSchedule('weekly'), false);
});

test('absent passwordAcked + mode=custom → false', () => {
  storage.clear();
  assert.strictEqual(BM.canEnableSchedule('custom'), false);
});

test("passwordAcked='true' + mode=daily → true (consent given)", () => {
  storage.clear();
  storage.setItem('portfolioBackupSchedulePasswordAcked', 'true');
  assert.strictEqual(BM.canEnableSchedule('daily'), true);
});

test("passwordAcked='false' + mode=daily → false (explicitly not acked)", () => {
  storage.clear();
  storage.setItem('portfolioBackupSchedulePasswordAcked', 'false');
  assert.strictEqual(BM.canEnableSchedule('daily'), false);
});

test("passwordAcked='true' + mode=off → true (off bypasses the gate)", () => {
  storage.clear();
  storage.setItem('portfolioBackupSchedulePasswordAcked', 'true');
  assert.strictEqual(BM.canEnableSchedule('off'), true);
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log(`Plan 05 schedule-password-mandatory tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
