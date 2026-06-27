/**
 * tests/30-backups-helper-gate.test.js — Phase 30 Plan 09 (GAP-08, region A4).
 *
 * ROOT CAUSE THIS CLOSES: the Settings → Backups tab (assets/settings.js
 * IIFE-4, bindBackupsTab :2270 + applyFrequencyChange :2189) carries three
 * named behaviors that NO existing test ever actually executes:
 *
 *   (1) the frequency helper-text wiring (refreshFrequencyHelper :2166 —
 *       helperOff for the 'off' mode, helperOn for every non-off mode);
 *   (2) the D-18 password-gate REJECTION path (:2203-2226 — when the gate
 *       blocks a non-off transition it un-hides #schedulePasswordError,
 *       reverts the <select> to the previously-persisted mode, returns false,
 *       and emits NO 'schedule.savedToast');
 *   (3) the ack-checkbox un-check force-off (:2316-2329 — un-acking while a
 *       schedule is active forces the schedule back to 'off').
 *
 * Why (2) was unhit: the production gate at settings.js:2194-2202 reads
 *   `if (BackupManager && BackupManager.canEnableSchedule) gateAllowed =
 *    BackupManager.canEnableSchedule(newMode); else gateAllowed = ...`
 * Whenever BackupManager exists (it always does on the real page) the REAL
 * path is canEnableSchedule(newMode). The only roundtrip env that loads this
 * IIFE (30-settings-section-roundtrip buildEnv) stubs canEnableSchedule→TRUE,
 * so the `if (!gateAllowed)` rejection block at :2203 is unreachable, and the
 * 25-04/25-05 backup tests load a DIFFERENT module (assets/backup.js). The
 * defensive readPasswordAcked fallback at :2201 is dead in production because
 * BackupManager is present — so this test deliberately does NOT target it.
 *
 * THE GUARD (D-09 real-page jsdom): load the REAL settings.html body + the REAL
 * assets/settings.js into a jsdom window, capture the 5 DOMContentLoaded
 * handlers and invoke ONLY captured[3] (the backups IIFE — never booting the
 * other four), inject the App.* stub (spy showToast) + a BackupManager whose
 * canEnableSchedule we CONTROL per case, then assert OBSERVABLE behavior only
 * (D-08): the helper element's resolved data-i18n/text, the select value, the
 * #schedulePasswordError visibility, and the absence/presence of the
 * 'schedule.savedToast'. Never an internal function name.
 *
 * FORCES THE REAL GATE (the whole point of GAP-08): for the rejection case we
 * set BackupManager.canEnableSchedule to return FALSE for non-off modes, so
 * settings.js:2196-2198 takes the real `gateAllowed = false` branch — NOT the
 * :2201 readPasswordAcked fallback.
 *
 * FALSIFIABLE (per feedback-behavior-verification): in a scratch copy, drop the
 * `if (!gateAllowed) { ...; if (sel) sel.value = prev; return false; }`
 * rejection block — the rejection case then FAILS (the select is no longer
 * reverted and a savedToast fires). An internal rename keeps it GREEN.
 *
 * F-A (vacuous-green trap): the IIFE-4 handler and applyFrequencyChange are
 * async; we settle() the microtask/timer queue after every async-driven event
 * and assert an end-of-file EXPECTED_COUNT guard so a silently-skipped async
 * case can't pass green.
 *
 * Read-only: EVALs assets/settings.js + settings.html into an isolated jsdom
 * window; never writes any assets/* production file.
 *
 * Run: node tests/30-backups-helper-gate.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// Flush the microtask + 0ms-timer queue several times so the async change
// handler → applyFrequencyChange → (await confirmDialog) chain fully resolves.
function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 6; i++) { await flush(); } }

/**
 * Build a jsdom env: real settings.html + real settings.js, App stub injected.
 * Captures the 5 DOMContentLoaded handlers and returns ONLY the IIFE-4 (backups)
 * handler (captured[3]) so the test never boots the other four IIFEs.
 *
 * `canEnable(mode)` controls BackupManager.canEnableSchedule — the REAL D-18
 * gate. Default mirrors the permissive roundtrip stub (true); the rejection
 * case overrides it to false for non-off modes.
 */
function buildEnv(opts) {
  opts = opts || {};
  var canEnable = opts.canEnable || function () { return true; };

  var html = readAsset('settings.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/settings.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  // Pre-seed localStorage BEFORE the handler runs (readScheduleMode /
  // readPasswordAcked read from it at bind time).
  try {
    if (opts.seedMode) win.localStorage.setItem('portfolioBackupScheduleMode', opts.seedMode);
    if (opts.seedAcked) win.localStorage.setItem('portfolioBackupSchedulePasswordAcked', opts.seedAcked);
  } catch (_) {}

  // Capture DOMContentLoaded handlers; pass every other registration through.
  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  // A `t` map that returns a DISTINCT, resolvable string for the helper keys so
  // refreshFrequencyHelper's `helper.textContent = tt(key, ...)` is observably
  // wired (tt only uses App.t's value when it differs from the key; the default
  // key-returning stub would fall back to the original HTML text).
  var appStub = createAppStub({
    t: {
      'schedule.frequency.helperOff': 'HELPER_OFF_TEXT',
      'schedule.frequency.helperOn': 'HELPER_ON_TEXT',
    },
  });
  win.App = appStub;
  win.PortfolioDB = {
    getAllClients: function () { return Promise.resolve([]); },
    getAllTherapistSettings: function () { return Promise.resolve([]); },
    getAllSnippets: function () { return Promise.resolve([]); },
  };
  win.BroadcastChannel = function () {
    return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
  };
  win.Snippets = { getPrefix: function () { return '!'; }, setPrefix: function () {} };
  win.SNIPPETS_SEED = [];
  // The REAL gate subject. canEnableSchedule is reassignable per case; because
  // applyFrequencyChange reads the bare global `BackupManager` fresh on each
  // call, reassigning win.BackupManager.canEnableSchedule before a dispatch
  // changes the gate verdict the next change sees.
  win.BackupManager = {
    canEnableSchedule: function (mode) { return canEnable(mode); },
    isAutoBackupSupported: function () { return false; },
    checkBackupSchedule: function () {},
    pickBackupFolder: function () { return Promise.resolve(null); },
  };
  win.CropModule = { resizeToMaxDimension: function () { return Promise.resolve({ size: 0 }); } };

  win.eval(readAsset('assets/settings.js'));

  if (captured.length !== 5) {
    throw new Error('expected settings.js to register 5 DOMContentLoaded handlers; got ' +
      captured.length + ' — IIFE-4 (backups) handler-index selection is unsafe');
  }

  return { dom: dom, win: win, app: appStub, backups: captured[3] };
}

// Did App.showToast ever record a 'schedule.savedToast'? (2nd arg is the key.)
function savedToastFired(appStub) {
  var calls = appStub.__calls.get('showToast') || [];
  return calls.some(function (args) { return args && args[1] === 'schedule.savedToast'; });
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── Case 1: helper-text wiring (helperOff ↔ helperOn after a real change) ─
  await test('frequency helper text reflects helperOn for a non-off mode and helperOff for off (real change path)', async function () {
    var env = buildEnv({ canEnable: function () { return true; } }); // gate permissive so the change persists
    var win = env.win;
    await env.backups();
    await settle();

    var sel = win.document.getElementById('scheduleFrequencySelect');
    var helper = win.document.getElementById('scheduleFrequencyHelper');
    assert.ok(sel && helper, 'the frequency select + helper must render');

    // After bind with the default 'off' mode, the helper reads helperOff.
    assert.strictEqual(helper.getAttribute('data-i18n'), 'schedule.frequency.helperOff',
      'on the default off mode the helper must carry the helperOff i18n key');

    // Change to a non-off mode → gate allows → persists → helper flips to helperOn.
    sel.value = 'weekly';
    sel.dispatchEvent(new win.Event('change', { bubbles: true }));
    await settle();
    assert.strictEqual(helper.getAttribute('data-i18n'), 'schedule.frequency.helperOn',
      'after a successful change to a non-off mode the helper must carry the helperOn key');
    assert.strictEqual(helper.textContent, 'HELPER_ON_TEXT',
      'the helper text must resolve through App.t for the helperOn key (observable wiring)');

    // Change back to off (ON→OFF confirm stub→true) → helper flips to helperOff.
    sel.value = 'off';
    sel.dispatchEvent(new win.Event('change', { bubbles: true }));
    await settle();
    assert.strictEqual(helper.getAttribute('data-i18n'), 'schedule.frequency.helperOff',
      'after changing back to off the helper must carry the helperOff key');

    env.dom.window.close();
  });

  // ─── Case 2: the REAL password-gate REJECTION (canEnableSchedule→false) ────
  await test('gate rejection (canEnableSchedule→false) shows schedulePasswordError, reverts the select, and emits NO savedToast', async function () {
    // Force the REAL gate to reject every non-off mode. This drives the
    // settings.js:2196-2198 canEnableSchedule branch — NOT the :2201 fallback.
    var env = buildEnv({ canEnable: function (mode) { return mode === 'off'; } });
    var win = env.win;
    await env.backups();
    await settle();

    var sel = win.document.getElementById('scheduleFrequencySelect');
    var err = win.document.getElementById('schedulePasswordError');
    assert.ok(sel && err, 'the frequency select + password error must render');
    // Precondition: select sits at the persisted 'off' and the error is hidden.
    assert.strictEqual(sel.value, 'off', 'precondition: select starts at off');
    assert.ok(err.classList.contains('is-hidden'), 'precondition: password error starts hidden');

    // Attempt a non-off change → the real gate blocks it.
    sel.value = 'weekly';
    sel.dispatchEvent(new win.Event('change', { bubbles: true }));
    await settle();

    assert.ok(!err.classList.contains('is-hidden'),
      'the gate rejection must un-hide #schedulePasswordError');
    assert.strictEqual(sel.value, 'off',
      'the gate rejection must revert the select to the previously-persisted mode (off)');
    assert.strictEqual(savedToastFired(env.app), false,
      'a blocked change must NOT persist — no schedule.savedToast may fire');

    env.dom.window.close();
  });

  // ─── Case 3: ack un-check force-off (D-18: no active schedule without ack) ─
  await test('un-checking the ack checkbox while a schedule is active forces the schedule back off', async function () {
    // Seed an ACTIVE schedule with an acked password, then un-ack it.
    var env = buildEnv({ seedMode: 'weekly', seedAcked: 'true' });
    var win = env.win;
    await env.backups();
    await settle();

    var sel = win.document.getElementById('scheduleFrequencySelect');
    var ack = win.document.getElementById('schedulePasswordAcked');
    assert.ok(sel && ack, 'the frequency select + ack checkbox must render');
    // Precondition: bind reflects the seeded active schedule + acked password.
    assert.strictEqual(sel.value, 'weekly', 'precondition: select reflects the seeded weekly schedule');
    assert.strictEqual(ack.checked, true, 'precondition: ack checkbox reflects the seeded acked password');

    // Un-ack → force-off.
    ack.checked = false;
    ack.dispatchEvent(new win.Event('change', { bubbles: true }));
    await settle();

    assert.strictEqual(sel.value, 'off',
      'un-acking an active schedule must force the select back to off');
    assert.strictEqual(win.localStorage.getItem('portfolioBackupScheduleMode'), 'off',
      'un-acking an active schedule must persist mode=off (D-18: no active schedule without an acked password)');

    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────
  var EXPECTED_COUNT = 3;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-09 backups-helper-gate tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (err) {
  console.error('FATAL (unhandled): ' + (err && err.stack || err));
  process.exit(1);
});
