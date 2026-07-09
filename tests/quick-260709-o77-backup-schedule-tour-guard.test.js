/**
 * Quick task 260709-o77 — RED behavior test for the tour-active backup-prompt guard.
 *
 * Bug (Phase 41 release escape): BackupManager.checkBackupSchedule() (assets/backup.js,
 * D-17 foreground schedule check) opens the Backup & Restore modal ON TOP of an active
 * onboarding tour overlay when a long-idle tab fires visibilitychange and the schedule
 * prompt is due. Screenshot on file — the modal-over-tour collision looks broken.
 *
 * Required behavior after the o77 fix (a minimal tour-active guard inside
 * checkBackupSchedule):
 *   - Case A (tour ACTIVE): the schedule prompt is SUPPRESSED. openBackupModal is NOT
 *     called AND portfolioBackupSchedulePromptedAt is NOT written — so the reminder
 *     re-fires naturally after the tour closes (mirrors the CR-01 successful-prompt-only
 *     write gate). >>> This is the case that currently FAILS against the unpatched
 *     backup.js (modal is called + stamp advances). <<<
 *   - Case B (tour INACTIVE — window.Tour.isActive() returns false): the prompt fires
 *     exactly as before — openBackupModal called once, stamp advances (regression guard).
 *   - Case C (window.Tour UNDEFINED — a page that never loads tour.js): the typeof-guard
 *     passes through; openBackupModal called once, no throw, no behavior change.
 *
 * Run: node tests/quick-260709-o77-backup-schedule-tour-guard.test.js
 * Exits 0 on full pass, 1 on any failure. Case A is expected to FAIL (exit non-zero)
 * against the unpatched backup.js — that is the RED proof.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Sandbox factory — fresh window/storage per scenario.
// tourState:
//   undefined       → window.Tour is left undefined (page without tour.js)
//   { active: bool }→ window.Tour = { isActive: () => active }
// ────────────────────────────────────────────────────────────────────

function makeSandbox(pathname, openBackupModalFn, tourState) {
  const storage = (function () {
    const map = new Map();
    return {
      getItem(k) { return map.has(k) ? map.get(k) : null; },
      setItem(k, v) { map.set(k, String(v)); },
      removeItem(k) { map.delete(k); },
      clear() { map.clear(); },
    };
  })();

  const location = {
    pathname: pathname,
    search: '',
    hash: '',
    href: 'https://example.test' + pathname,
  };

  const win = {
    location: location,
  };
  if (typeof openBackupModalFn === 'function') {
    win.openBackupModal = openBackupModalFn;
  }
  // Only mount window.Tour when a tour-state is supplied; otherwise the page
  // models one that never loaded tour.js (window.Tour stays undefined).
  if (tourState && typeof tourState === 'object') {
    const tourActive = !!tourState.active;
    win.Tour = { isActive: function () { return tourActive; } };
  }
  win.localStorage = storage;

  const sandbox = {
    window: win,
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

  return { sandbox, storage, location, win, BM };
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

function seedScheduleReadyToFire(storage, now) {
  // Schedule=daily; password acked; lastExport 25h ago; debounce expired (2h ago).
  // Drives checkBackupSchedule past every early-return so the trailing prompt
  // block is the ONLY remaining gate. (Mirrors 25-09's helper.)
  storage.clear();
  storage.setItem('portfolioBackupScheduleMode', 'daily');
  storage.setItem('portfolioBackupSchedulePasswordAcked', 'true');
  storage.setItem('portfolioLastExport', String(now - 25 * HOUR));
  storage.setItem('portfolioBackupSchedulePromptedAt', String(now - 2 * HOUR));
}

// ────────────────────────────────────────────────────────────────────
// Case A — tour ACTIVE → prompt suppressed, stamp NOT consumed (the bug)
// ────────────────────────────────────────────────────────────────────
test('Case A: tour ACTIVE + modal available + pathname=/index.html → modal NOT opened, stamp NOT advanced, no redirect', () => {
  let openCalls = 0;
  const { storage, location, BM } = makeSandbox('/index.html', function () { openCalls++; }, { active: true });
  const now = Date.now();
  seedScheduleReadyToFire(storage, now);
  const stampBefore = Number(storage.getItem('portfolioBackupSchedulePromptedAt'));
  const hrefBefore = location.href;

  BM.checkBackupSchedule({ now: now });

  const stampAfter = Number(storage.getItem('portfolioBackupSchedulePromptedAt'));

  assert.strictEqual(openCalls, 0,
    'With the tour overlay active, openBackupModal MUST NOT be called (modal-over-tour collision). Got ' + openCalls);
  assert.strictEqual(stampAfter, stampBefore,
    'On the tour-suppressed path, portfolioBackupSchedulePromptedAt MUST NOT advance so the reminder re-fires after the tour closes — got ' + stampAfter + ', expected ' + stampBefore + ' (2h-ago value).');
  assert.strictEqual(location.href, hrefBefore,
    'Tour-active suppression MUST NOT redirect — location.href should be unchanged. Got ' + location.href);
});

// ────────────────────────────────────────────────────────────────────
// Case B — tour INACTIVE → prompt fires as before (regression guard)
// ────────────────────────────────────────────────────────────────────
test('Case B: tour INACTIVE (isActive→false) + modal available + pathname=/index.html → modal opens once AND stamp advances', () => {
  let openCalls = 0;
  const { storage, location, BM } = makeSandbox('/index.html', function () { openCalls++; }, { active: false });
  const now = Date.now();
  seedScheduleReadyToFire(storage, now);

  BM.checkBackupSchedule({ now: now });

  const stampAfter = Number(storage.getItem('portfolioBackupSchedulePromptedAt'));

  assert.strictEqual(openCalls, 1,
    'With the tour inactive, the schedule prompt MUST fire exactly as before — openBackupModal called once. Got ' + openCalls);
  assert.ok(Math.abs(stampAfter - now) < 5000,
    'On a successful prompt the debounce stamp should advance to ~now; got ' + stampAfter);
  assert.strictEqual(location.href, 'https://example.test/index.html',
    'On the happy path (modal available on overview) location.href MUST NOT change.');
});

// ────────────────────────────────────────────────────────────────────
// Case C — window.Tour UNDEFINED → typeof-guard passes through
// ────────────────────────────────────────────────────────────────────
test('Case C: window.Tour UNDEFINED (page without tour.js) + modal available + pathname=/index.html → modal opens once, no throw', () => {
  let openCalls = 0;
  const { storage, BM } = makeSandbox('/index.html', function () { openCalls++; }, undefined);
  const now = Date.now();
  seedScheduleReadyToFire(storage, now);

  BM.checkBackupSchedule({ now: now });

  assert.strictEqual(openCalls, 1,
    'On a page that never loads tour.js (window.Tour undefined), the typeof-guard MUST pass through — openBackupModal called once, no throw. Got ' + openCalls);
});

// ────────────────────────────────────────────────────────────────────
// Report
// ────────────────────────────────────────────────────────────────────
console.log('');
console.log(`quick-260709-o77 backup-schedule tour-guard tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
