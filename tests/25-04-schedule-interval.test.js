/**
 * Phase 25 Plan 04 Task 1 — Behavior test for BackupManager.getScheduleIntervalMs.
 *
 * Pure-function test (with a localStorage read): loads assets/backup.js in a
 * vm sandbox, exercises BackupManager.getScheduleIntervalMs() through a
 * Map-backed localStorage stub. No DOM, no crypto, no JSZip.
 *
 * Run: node tests/25-04-schedule-interval.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Stubs (minimal — getScheduleIntervalMs only touches localStorage)
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
if (!BM || typeof BM.getScheduleIntervalMs !== 'function') {
  console.error('FAIL: BackupManager.getScheduleIntervalMs is not exposed on the public API.');
  console.error('      Plan 04 Task 1 must add the helper inside the IIFE and add the');
  console.error('      `getScheduleIntervalMs: getScheduleIntervalMs,` line to the return object.');
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

const DAY = 24 * 60 * 60 * 1000;

// ─── Table-driven cases ─────────────────────────────────────────────

test('no schedule key set → null', () => {
  storage.clear();
  assert.strictEqual(BM.getScheduleIntervalMs(), null);
});

test("portfolioBackupScheduleMode='off' → null", () => {
  storage.clear();
  storage.setItem('portfolioBackupScheduleMode', 'off');
  assert.strictEqual(BM.getScheduleIntervalMs(), null);
});

test("portfolioBackupScheduleMode='daily' → 86400000", () => {
  storage.clear();
  storage.setItem('portfolioBackupScheduleMode', 'daily');
  assert.strictEqual(BM.getScheduleIntervalMs(), DAY);
});

test("portfolioBackupScheduleMode='weekly' → 604800000", () => {
  storage.clear();
  storage.setItem('portfolioBackupScheduleMode', 'weekly');
  assert.strictEqual(BM.getScheduleIntervalMs(), 7 * DAY);
});

test("portfolioBackupScheduleMode='monthly' → 2592000000", () => {
  storage.clear();
  storage.setItem('portfolioBackupScheduleMode', 'monthly');
  assert.strictEqual(BM.getScheduleIntervalMs(), 30 * DAY);
});

test("portfolioBackupScheduleMode='custom' with no custom-days → defaults to 7×day", () => {
  storage.clear();
  storage.setItem('portfolioBackupScheduleMode', 'custom');
  assert.strictEqual(BM.getScheduleIntervalMs(), 7 * DAY);
});

test("portfolioBackupScheduleMode='custom' + custom-days=3 → 3×day", () => {
  storage.clear();
  storage.setItem('portfolioBackupScheduleMode', 'custom');
  storage.setItem('portfolioBackupScheduleCustomDays', '3');
  assert.strictEqual(BM.getScheduleIntervalMs(), 3 * DAY);
});

test("portfolioBackupScheduleMode='custom' + custom-days='0' → falls back to 7×day", () => {
  storage.clear();
  storage.setItem('portfolioBackupScheduleMode', 'custom');
  storage.setItem('portfolioBackupScheduleCustomDays', '0');
  assert.strictEqual(BM.getScheduleIntervalMs(), 7 * DAY);
});

test("portfolioBackupScheduleMode='nonsense' → null", () => {
  storage.clear();
  storage.setItem('portfolioBackupScheduleMode', 'nonsense');
  assert.strictEqual(BM.getScheduleIntervalMs(), null);
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log(`Plan 04 schedule-interval tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
