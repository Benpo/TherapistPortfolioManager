/**
 * Phase 25 Plan 05 Task 1 — Behavior test for BackupManager.checkBackupSchedule.
 *
 * Loads assets/backup.js in a vm sandbox, exercises BackupManager.checkBackupSchedule()
 * through a Map-backed localStorage stub. Asserts that:
 *   1. When schedule is daily AND lastExport is older than the interval AND no
 *      debounce is active, the schedule check calls window.openBackupModal()
 *      exactly once and writes a fresh portfolioBackupSchedulePromptedAt timestamp.
 *   2. When schedule is OFF, the check never calls window.openBackupModal.
 *
 * No DOM, no crypto, no JSZip — pure helper behavior.
 *
 * Run: node tests/25-05-schedule-fires.test.js
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

let openBackupModalCalls = 0;

const sandbox = {
  window: {
    // Recording stub — checkBackupSchedule MUST call this on a fire.
    openBackupModal: function () { openBackupModalCalls++; },
  },
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
if (!BM || typeof BM.checkBackupSchedule !== 'function') {
  console.error('FAIL: BackupManager.checkBackupSchedule is not exposed on the public API.');
  console.error('      Plan 05 Task 1 must add the helper inside the IIFE and add the');
  console.error('      `checkBackupSchedule: checkBackupSchedule,` line to the return object.');
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

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// ─── Case 1: schedule=daily, lastExport=25h ago, no debounce → fires ──────
test('schedule=daily + lastExport 25h ago + no debounce → openBackupModal called once', () => {
  storage.clear();
  openBackupModalCalls = 0;
  const now = Date.now();
  storage.setItem('portfolioBackupScheduleMode', 'daily');
  storage.setItem('portfolioLastExport', String(now - 25 * HOUR));
  storage.setItem('portfolioBackupSchedulePromptedAt', '0');

  BM.checkBackupSchedule({ now: now });

  assert.strictEqual(openBackupModalCalls, 1, 'openBackupModal should fire exactly once');

  // Debounce stamp should be close to `now` (within 5 seconds).
  const stamp = Number(storage.getItem('portfolioBackupSchedulePromptedAt'));
  assert.ok(Math.abs(stamp - now) < 5000,
    `portfolioBackupSchedulePromptedAt should be ~now; got ${stamp}, expected ~${now}`);
});

// ─── Case 2: schedule=off → never fires ───────────────────────────────────
test('schedule=off → openBackupModal NOT called', () => {
  storage.clear();
  openBackupModalCalls = 0;
  const now = Date.now();
  storage.setItem('portfolioBackupScheduleMode', 'off');
  storage.setItem('portfolioLastExport', String(now - 365 * DAY)); // a year stale — irrelevant when off

  BM.checkBackupSchedule({ now: now });

  assert.strictEqual(openBackupModalCalls, 0,
    'openBackupModal must NOT be called when schedule mode is off');
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log(`Plan 05 schedule-fires tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
