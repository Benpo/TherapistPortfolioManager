/**
 * Phase 25 Plan 09 Task 1 — RED behavior test for CR-01.
 *
 * Bug: BackupManager.checkBackupSchedule() writes the 1-hour debounce stamp
 * BEFORE checking whether window.openBackupModal is available. On every page
 * that loads app.js but not overview.js (settings.html, add-client.html,
 * add-session.html) the debounce is silently consumed and the next legitimate
 * scheduled prompt on the overview page is suppressed for up to an hour.
 *
 * Required behavior after the Plan 09 fix:
 *   - Case A (modal-unavailable + non-overview path):
 *       window.openBackupModal = undefined
 *       window.location.pathname = '/settings.html'
 *     EITHER (a) location.href is set to './index.html?openBackup=1' AND the
 *            debounce stamp is updated (redirect IS the prompt), OR
 *            (b) location.href is unchanged AND the debounce stamp is unchanged.
 *     Stated negatively: the debounce stamp MUST NOT advance unless the user
 *     was prompted (in-place modal open OR cross-page redirect).
 *   - Case B (modal-unavailable + already on overview but modal missing):
 *       window.openBackupModal = undefined
 *       window.location.pathname = '/index.html'
 *     The debounce stamp MUST NOT advance. (Pathological — no redirect would
 *     help since we're already on overview; without a modal there is no
 *     reachable prompt path.)
 *   - Case C (regression guard — happy path):
 *       window.openBackupModal = function
 *     Modal opens AND debounce stamp advances.
 *
 * Run: node tests/25-09-schedule-debounce-no-modal.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Sandbox factory — fresh window/storage per scenario
// ────────────────────────────────────────────────────────────────────

function makeSandbox(pathname, openBackupModalFn) {
  const storage = (function () {
    const map = new Map();
    return {
      getItem(k) { return map.has(k) ? map.get(k) : null; },
      setItem(k, v) { map.set(k, String(v)); },
      removeItem(k) { map.delete(k); },
      clear() { map.clear(); },
    };
  })();

  // Mutable location: tests inspect .href after the call.
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
  // localStorage exposed both at sandbox top-level and on window (backup.js
  // touches the top-level binding).
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
  // These conditions force checkBackupSchedule past every early-return so that
  // the trailing modal/debounce block is the ONLY remaining gate.
  storage.clear();
  storage.setItem('portfolioBackupScheduleMode', 'daily');
  storage.setItem('portfolioBackupSchedulePasswordAcked', 'true');
  storage.setItem('portfolioLastExport', String(now - 25 * HOUR));
  storage.setItem('portfolioBackupSchedulePromptedAt', String(now - 2 * HOUR));
}

// ────────────────────────────────────────────────────────────────────
// Case A — modal unavailable + non-overview page
// ────────────────────────────────────────────────────────────────────
test('Case A: modal undefined + pathname=/settings.html → debounce stamp MUST NOT advance UNLESS redirect occurred', () => {
  const { storage, location, BM } = makeSandbox('/settings.html', undefined);
  const now = Date.now();
  seedScheduleReadyToFire(storage, now);
  const stampBefore = Number(storage.getItem('portfolioBackupSchedulePromptedAt'));
  const hrefBefore = location.href;

  BM.checkBackupSchedule({ now: now });

  const stampAfter = Number(storage.getItem('portfolioBackupSchedulePromptedAt'));
  const hrefAfter = location.href;
  const redirected = hrefAfter !== hrefBefore && /index\.html\?openBackup=1$/.test(hrefAfter);

  if (redirected) {
    // Redirect path: the redirect IS the prompt, so stamp advancing is correct.
    assert.ok(Math.abs(stampAfter - now) < 5000,
      `When redirect to index.html?openBackup=1 occurred, stamp should advance to ~now; got ${stampAfter}`);
  } else {
    // No-redirect path: nothing was prompted, so the stamp MUST NOT advance.
    assert.strictEqual(stampAfter, stampBefore,
      `When no redirect occurred (href unchanged), portfolioBackupSchedulePromptedAt MUST NOT advance — got ${stampAfter}, expected ${stampBefore} (2h-ago value). This is CR-01: debounce silently consumed.`);
  }
});

// ────────────────────────────────────────────────────────────────────
// Case B — modal unavailable + already on overview (defensive)
// ────────────────────────────────────────────────────────────────────
test('Case B: modal undefined + pathname=/index.html → debounce stamp MUST NOT advance', () => {
  const { storage, location, BM } = makeSandbox('/index.html', undefined);
  const now = Date.now();
  seedScheduleReadyToFire(storage, now);
  const stampBefore = Number(storage.getItem('portfolioBackupSchedulePromptedAt'));
  const hrefBefore = location.href;

  BM.checkBackupSchedule({ now: now });

  const stampAfter = Number(storage.getItem('portfolioBackupSchedulePromptedAt'));
  const hrefAfter = location.href;

  // Pathological case — already on overview but modal is missing. No redirect
  // helps (we'd redirect to ourselves), so the function must back off and
  // leave the debounce intact so the NEXT visit (with modal mounted) prompts.
  assert.strictEqual(hrefAfter, hrefBefore,
    `On overview already (pathname=/index.html), checkBackupSchedule MUST NOT redirect. Got href=${hrefAfter}`);
  assert.strictEqual(stampAfter, stampBefore,
    `On overview with no modal, debounce stamp MUST NOT advance — got ${stampAfter}, expected ${stampBefore}. CR-01: stamp consumed without any user-facing prompt.`);
});

// ────────────────────────────────────────────────────────────────────
// Case C — regression guard, happy path still works
// ────────────────────────────────────────────────────────────────────
test('Case C: modal available + pathname=/index.html → modal opens AND debounce stamp advances', () => {
  let openCalls = 0;
  const { storage, location, BM } = makeSandbox('/index.html', function () { openCalls++; });
  const now = Date.now();
  seedScheduleReadyToFire(storage, now);

  BM.checkBackupSchedule({ now: now });

  assert.strictEqual(openCalls, 1,
    'openBackupModal MUST be called exactly once on the happy path');
  const stampAfter = Number(storage.getItem('portfolioBackupSchedulePromptedAt'));
  assert.ok(Math.abs(stampAfter - now) < 5000,
    `Debounce stamp should advance to ~now on successful modal open; got ${stampAfter}`);
  // Sanity: location not touched on the happy path.
  assert.strictEqual(location.href, 'https://example.test/index.html',
    'On happy path (modal available), location.href MUST NOT be changed');
});

// ────────────────────────────────────────────────────────────────────
// Case D — happy path on a non-overview page WITH modal available
// (covers an alternate fix path: some apps mount the modal cross-page.
// If that ever lands, this test guards against double-prompting via redirect.)
// ────────────────────────────────────────────────────────────────────
test('Case D: modal available + pathname=/settings.html → modal opens in-place, no redirect, debounce advances', () => {
  let openCalls = 0;
  const { storage, location, BM } = makeSandbox('/settings.html', function () { openCalls++; });
  const now = Date.now();
  seedScheduleReadyToFire(storage, now);
  const hrefBefore = location.href;

  BM.checkBackupSchedule({ now: now });

  assert.strictEqual(openCalls, 1,
    'When modal IS available on a non-overview page, openBackupModal MUST be called (no spurious redirect)');
  assert.strictEqual(location.href, hrefBefore,
    'If modal is available in-place, location.href MUST NOT be changed (no redirect)');
  const stampAfter = Number(storage.getItem('portfolioBackupSchedulePromptedAt'));
  assert.ok(Math.abs(stampAfter - now) < 5000,
    `Debounce stamp should advance to ~now after in-place modal open; got ${stampAfter}`);
});

// ────────────────────────────────────────────────────────────────────
// Report
// ────────────────────────────────────────────────────────────────────
console.log('');
console.log(`Plan 09 schedule-debounce-no-modal tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
