/**
 * Phase 25 Plan 05 Task 1 — Behavior test for the 1-hour debounce in
 * BackupManager.checkBackupSchedule.
 *
 * Setup: schedule=daily, lastExport 25h ago (interval definitely elapsed).
 *   - First sub-case: portfolioBackupSchedulePromptedAt = 30 min ago
 *     → check MUST NOT re-fire (debounce in effect).
 *   - Second sub-case: portfolioBackupSchedulePromptedAt = 90 min ago
 *     → check MUST fire (debounce expired).
 *
 * Run: node tests/25-05-schedule-debounce.test.js
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

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// ─── Case 1: debounce stamp = 30 min ago → does NOT re-fire ───────────────
test('lastPromptedAt = 30 min ago → check does NOT re-fire (within 1h debounce)', () => {
  storage.clear();
  openBackupModalCalls = 0;
  const now = Date.now();
  storage.setItem('portfolioBackupScheduleMode', 'daily');
  storage.setItem('portfolioLastExport', String(now - 25 * HOUR)); // interval definitely elapsed
  storage.setItem('portfolioBackupSchedulePromptedAt', String(now - 30 * MINUTE));

  BM.checkBackupSchedule({ now: now });

  assert.strictEqual(openBackupModalCalls, 0,
    '1-hour debounce: openBackupModal must NOT fire when last prompt was 30 min ago');

  // Debounce stamp should be UNCHANGED (no fresh write inside the debounce window).
  const stamp = Number(storage.getItem('portfolioBackupSchedulePromptedAt'));
  assert.strictEqual(stamp, now - 30 * MINUTE,
    'debounce stamp should remain at 30-min-ago value when no fire occurred');
});

// ─── Case 2: debounce stamp = 90 min ago → fires ──────────────────────────
test('lastPromptedAt = 90 min ago → check DOES fire (debounce expired)', () => {
  storage.clear();
  openBackupModalCalls = 0;
  const now = Date.now();
  storage.setItem('portfolioBackupScheduleMode', 'daily');
  storage.setItem('portfolioLastExport', String(now - 25 * HOUR));
  storage.setItem('portfolioBackupSchedulePromptedAt', String(now - 90 * MINUTE));

  BM.checkBackupSchedule({ now: now });

  assert.strictEqual(openBackupModalCalls, 1,
    'openBackupModal should fire when last prompt was 90 min ago (beyond 1h debounce)');

  // Debounce stamp should be refreshed to ~now.
  const stamp = Number(storage.getItem('portfolioBackupSchedulePromptedAt'));
  assert.ok(Math.abs(stamp - now) < 5000,
    `portfolioBackupSchedulePromptedAt should be ~now after fire; got ${stamp}`);
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log(`Plan 05 schedule-debounce tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
