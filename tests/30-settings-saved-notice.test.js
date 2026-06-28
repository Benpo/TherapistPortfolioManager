/**
 * tests/30-settings-saved-notice.test.js — settings saved-notice pill +
 * disable-confirm gate (TEST-03, GAP-07 / region A1, D-08/D-09).
 *
 * ROOT CAUSE THIS CLOSES: 30-VERIFICATION GAP-07 — the IIFE-1 SettingsPage
 * saved-notice pill (showSavedNotice/dismissSavedNotice, settings.js:311-347,
 * shown by onSave at :514) and the disable-confirm branch (onSave →
 * computeDisableTransitions → App.confirmDialog, settings.js:464-480) execute
 * as side effects today with ZERO assertions. 25-11-toast-behavior Scenario 5
 * is NOT real coverage of these (it is being replaced in 30-12). A Phase-31
 * extraction that dropped the notice, broke its auto-dismiss, or removed the
 * confirm gate (silently persisting a disable the user cancelled) would ship
 * with no tripwire. This file pins both by observable DOM + persistence.
 *
 * THE GUARD (D-09 jsdom real-page): load the REAL settings.html + assets/
 * settings.js into jsdom, inject the spy PortfolioDB mock + App.* stub, drive
 * ONLY the fields DOMContentLoaded handler (selected by the App.initCommon
 * identity token) via the captured-listener map — never a blanket dispatch
 * that would also boot snippets/tab-nav/backups/photos (F-F). The identity
 * selection asserts exactly one match and is count/index-INDEPENDENT, so it
 * survives every settings.js extraction. Then assert OBSERVABLE behavior only
 * (D-08): the #settingsSavedNotice visibility/auto-dismiss and the
 * setTherapistSetting write-gate. Never an internal function name.
 *
 * CONTROLLABLE TIMER: showSavedNotice schedules an 8000ms auto-dismiss
 * (NOTICE_AUTO_DISMISS_MS) then a 200ms leave-cleanup. We override the jsdom
 * window's setTimeout/clearTimeout with a manual queue so the dismiss is
 * deterministic and instant (no 8.2s real wait, no flake). The test harness's
 * own settle() uses Node's global setTimeout (captured at module scope), so it
 * is unaffected by the window override.
 *
 * FALSIFIABLE (mutation-kill G1): in a scratch copy of settings.js, remove the
 * disable-confirm gate (persist regardless of the confirm result) → the
 * decline-no-write case FAILS (a setTherapistSetting write fires after a
 * cancel). Restored → GREEN. An internal rename keeps it GREEN (D-08/D-12).
 *
 * F-A (vacuous-green trap): the IIFE-1 handler + onSave are async; guarded by
 * capturing/awaiting the specific handler, settle()-ing after every async
 * event, and an end-of-file EXPECTED_COUNT guard.
 *
 * Read-only: EVALS assets/settings.js + settings.html into an isolated jsdom
 * window; never writes any assets/* production file.
 *
 * Run: node tests/30-settings-saved-notice.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var mockDbHelper = require('./_helpers/mock-portfolio-db');
var createMockPortfolioDB = mockDbHelper.createMockPortfolioDB;
var assertNoWrites = mockDbHelper.assertNoWrites;
var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// settle() flushes Node's macrotask/microtask queue so the async IIFE-1 handler
// → onSave → setTherapistSetting chain resolves. Uses Node's global setTimeout
// (NOT the per-window setTimeout the notice path uses), so a window-timer
// override below never breaks settle().
function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 6; i++) { await flush(); } }

/**
 * Build a jsdom env: real settings.html + real settings.js, with the spy DB
 * mock + App stub injected. Returns ONLY the IIFE-1 (fields) handler.
 */
function buildEnv(appOverrides) {
  var html = readAsset('settings.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/settings.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, opts) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, opts);
  };

  var mockDb = createMockPortfolioDB({ therapistSettings: [] });
  var appStub = createAppStub(appOverrides || {});

  win.PortfolioDB = mockDb;
  win.App = appStub;
  win.BroadcastChannel = function () {
    return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
  };
  win.Snippets = { getPrefix: function () { return ';'; }, setPrefix: function () {} };
  win.SNIPPETS_SEED = [];
  win.BackupManager = {
    canEnableSchedule: function () { return true; },
    isAutoBackupSupported: function () { return false; },
    checkBackupSchedule: function () {},
    pickBackupFolder: function () { return Promise.resolve(null); },
  };
  win.CropModule = { resizeToMaxDimension: function () { return Promise.resolve({ size: 0 }); } };

  win.eval(readAsset('assets/settings.js'));

  // Select the fields boot by stable identity (the only settings boot that calls
  // App.initCommon), asserting exactly one match — count/index-INDEPENDENT, so it
  // survives every settings.js extraction (Snippets 5->4, Photos 4->3, ...).
  var fieldsMatches = captured.filter(function (fn) { return String(fn).indexOf('initCommon') >= 0; });
  if (fieldsMatches.length !== 1) {
    throw new Error('expected exactly 1 fields (initCommon) DOMContentLoaded handler; got ' + fieldsMatches.length);
  }

  return { dom: dom, win: win, mockDb: mockDb, appStub: appStub, iife1: fieldsMatches[0] };
}

// Replace the jsdom window's timers with a manual queue so showSavedNotice's
// auto-dismiss is deterministic. Returns a runner that fires + clears the
// currently-queued callbacks (one generation per call).
function installControllableTimers(win) {
  var queued = [];
  win.setTimeout = function (fn) { queued.push(fn); return queued.length; };
  win.clearTimeout = function (id) { if (id && queued[id - 1]) queued[id - 1] = null; };
  return function runQueuedTimers() {
    var batch = queued;
    queued = [];
    batch.forEach(function (fn) { if (typeof fn === 'function') fn(); });
  };
}

function noticeVisible(win) {
  var n = win.document.getElementById('settingsSavedNotice');
  return !!n && n.hidden === false && ('active' in n.dataset);
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── A. Saved notice: visible on Save, hidden after the auto-dismiss ──────
  await test('saved-notice: a Save shows #settingsSavedNotice, and the auto-dismiss timer hides it again', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.iife1();
    await settle();

    // Make an edit so the (initially disabled) Save enables, WITHOUT toggling
    // any enable switch (so no disable-confirm fires on this path).
    var input = win.document.querySelector('.settings-rename-input:not([disabled])');
    assert.ok(input, 'an editable rename input must render');
    input.value = 'A New Label';
    input.dispatchEvent(new win.Event('input', { bubbles: true }));

    var saveBtn = win.document.getElementById('settingsSaveBtn');
    assert.strictEqual(saveBtn.disabled, false, 'Save must enable after an edit');

    // From here, control the notice timers deterministically.
    var runTimers = installControllableTimers(win);

    saveBtn.click();          // async onSave → showSavedNotice
    await settle();

    assert.ok(noticeVisible(win), 'the saved-notice pill must be visible right after Save');

    runTimers();              // fire the 8000ms auto-dismiss → dismissSavedNotice (queues 200ms leave)
    runTimers();              // fire the 200ms leave-cleanup → hide
    var n = win.document.getElementById('settingsSavedNotice');
    assert.strictEqual(n.hidden, true, 'after the auto-dismiss the saved-notice must hide again');
    assert.ok(!('active' in n.dataset), 'the leave-cleanup must clear the active state');

    env.dom.window.close();
  });

  // ─── B. Disable-confirm DECLINE: cancelling the confirm gates persistence ─
  await test('disable-confirm: flipping a section OFF and Saving with the confirm DECLINED writes nothing', async function () {
    var env = buildEnv({ confirmDialog: function () { return Promise.resolve(false); } });
    var win = env.win;
    await env.iife1();
    await settle();

    var toggle = win.document.querySelector('.settings-enable-toggle');
    assert.ok(toggle && toggle.checked, 'a checked enable toggle must render');
    toggle.checked = false;
    toggle.dispatchEvent(new win.Event('change', { bubbles: true }));   // marks dirty

    var saveBtn = win.document.getElementById('settingsSaveBtn');
    assert.strictEqual(saveBtn.disabled, false, 'Save must enable after toggling a section');

    saveBtn.click();
    await settle();

    assert.strictEqual(env.appStub.__calls.get('confirmDialog').length, 1,
      'the disable-confirm dialog must fire on a Save that disables a section');
    // GATE: a declined confirm must write NOTHING.
    assertNoWrites(env.mockDb);

    env.dom.window.close();
  });

  // ─── C. Disable-confirm ACCEPT: confirming proceeds to persist ────────────
  await test('disable-confirm: flipping a section OFF and Saving with the confirm ACCEPTED persists', async function () {
    var env = buildEnv({ confirmDialog: function () { return Promise.resolve(true); } });
    var win = env.win;
    await env.iife1();
    await settle();

    var toggle = win.document.querySelector('.settings-enable-toggle');
    assert.ok(toggle && toggle.checked, 'a checked enable toggle must render');
    toggle.checked = false;
    toggle.dispatchEvent(new win.Event('change', { bubbles: true }));

    win.document.getElementById('settingsSaveBtn').click();
    await settle();

    assert.strictEqual(env.appStub.__calls.get('confirmDialog').length, 1,
      'the disable-confirm dialog must fire');
    var writes = env.mockDb.__calls.get('setTherapistSetting');
    assert.ok(writes.length >= 1,
      'an accepted confirm must proceed to persist via setTherapistSetting');

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
  console.log('Plan 30-08 settings-saved-notice (GAP-07) tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
