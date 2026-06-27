/**
 * tests/30-settings-save-failed-toast.test.js — settings onSave ERROR path
 * (GAP-15 replacement, TEST-03, D-07/D-08/D-09).
 *
 * ROOT CAUSE THIS CLOSES: the retired Scenario 5 of 25-11-toast-behavior.test.js
 * "proved" the settings save-failed toast by hand-rewriting the try/catch and
 * replaying it against fresh spies after a defensive grep of the settings.js
 * text — it NEVER executed the real onSave catch, so a Phase-31 extraction that
 * swallowed the error or dropped the toast would have kept it green. This test
 * EXECUTES the real assets/settings.js onSave handler with a PortfolioDB whose
 * setTherapistSetting THROWS, and asserts the REAL catch
 * (settings.js:518-522) fires App.showToast("", "settings.save.failed").
 *
 * THE GUARD (D-09 jsdom real-page): load the REAL settings.html body + the REAL
 * assets/settings.js into a jsdom window, inject the App.* stub
 * (tests/_helpers/app-stub.js) and a PortfolioDB mock whose setTherapistSetting
 * REJECTS, drive ONLY the IIFE-1 (fields) DOMContentLoaded handler, edit a
 * rename input to make the form dirty, click the real Save button, settle the
 * async queue, then assert the OBSERVABLE side effect (D-08): the App.showToast
 * spy recorded ("", "settings.save.failed"). Never an internal function name.
 *
 * FALSIFIABLE (per feedback-behavior-verification — a behavior test must FAIL on
 * the regression it guards): in a scratch copy, remove the
 * `App.showToast("", "settings.save.failed")` from the onSave catch (or swallow
 * the error) and Case A FAILS; restore it and it PASSES (mutation-kill G1,
 * recorded in 30-12-SUMMARY). Case B is the companion negative: when the write
 * SUCCEEDS the failed toast must NOT fire, so a handler that always shows the
 * failed toast is also rejected. Renaming an INTERNAL helper with no observable
 * change keeps both GREEN (D-08/D-12).
 *
 * F-A (vacuous-green trap): the IIFE-1 handler and onSave are async; guarded by
 * capturing and awaiting the SPECIFIC IIFE-1 handler, settle()-ing the queue
 * after each async-driven event, and an end-of-file count guard asserting
 * EXPECTED_COUNT cases ran.
 *
 * F-F (cross-handler flake): settings.js registers 5 DOMContentLoaded handlers
 * (IIFE-1 fields, snippets, tab-nav, backups, photos). We invoke ONLY IIFE-1
 * (the first-registered) via the captured-listener map — never a blanket
 * dispatchEvent that would also boot the others and let an unrelated async
 * rejection flake this test.
 *
 * Read-only: this test EVALS assets/settings.js + settings.html into an isolated
 * jsdom window; it never writes any assets/* production file and never
 * re-implements the catch branch from the module text.
 *
 * Run: node tests/30-settings-save-failed-toast.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createMockPortfolioDB = require('./_helpers/mock-portfolio-db').createMockPortfolioDB;
var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 6; i++) { await flush(); } }

// 'trapped' is a rename-ALLOWED section, so its rename input is editable — the
// right subject to dirty the form and trigger a Save.
var TARGET_KEY = 'trapped';

/**
 * Build a jsdom env: real settings.html + real settings.js, with the App stub
 * and a spy DB mock injected. Captures the 5 DOMContentLoaded handlers and
 * returns ONLY the IIFE-1 (fields) handler so the test never boots the others.
 *
 * @param {boolean} throwOnSave - when true, setTherapistSetting REJECTS so the
 *        real onSave catch fires; when false it resolves (the negative case).
 */
function buildEnv(throwOnSave) {
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

  var seeded = [{ sectionKey: TARGET_KEY, customLabel: 'Seed Trapped', enabled: true }];
  var mockDb = createMockPortfolioDB({ therapistSettings: seeded });
  var origSet = mockDb.setTherapistSetting;
  mockDb.setTherapistSetting = function () {
    origSet.apply(this, arguments); // still records into __calls
    if (throwOnSave) {
      return Promise.reject(new Error('synthetic DB write failure'));
    }
    return Promise.resolve();
  };
  win.PortfolioDB = mockDb;

  var appStub = createAppStub();
  win.App = appStub;
  // BroadcastChannel is referenced inside onSave — inject a no-op (app-stub doc
  // block note (a)).
  win.BroadcastChannel = function () {
    return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
  };
  // Harmless stubs so eval of the whole settings.js never throws. Only IIFE-1
  // is invoked; the snippets/backups/photos IIFEs are never booted.
  win.Snippets = { getPrefix: function () { return '!'; }, setPrefix: function () {} };
  win.SNIPPETS_SEED = [];
  win.BackupManager = {
    canEnableSchedule: function () { return true; },
    isAutoBackupSupported: function () { return false; },
    checkBackupSchedule: function () {},
    pickBackupFolder: function () { return Promise.resolve(null); },
  };
  win.CropModule = { resizeToMaxDimension: function () { return Promise.resolve({ size: 0 }); } };

  win.eval(readAsset('assets/settings.js'));

  if (captured.length !== 5) {
    throw new Error('expected settings.js to register 5 DOMContentLoaded handlers; got ' +
      captured.length + ' — IIFE-1 handler-index selection is unsafe');
  }

  return { dom: dom, win: win, app: appStub, mockDb: mockDb, iife1: captured[0] };
}

function failedToastFired(appStub) {
  var calls = appStub.__calls.get('showToast') || [];
  return calls.some(function (args) {
    return args[0] === '' && args[1] === 'settings.save.failed';
  });
}

// Boot IIFE-1, dirty the rename input, click Save, settle.
async function driveSave(env) {
  var win = env.win;
  await env.iife1();
  await settle();
  var input = win.document.querySelector('.settings-rename-input[data-section-key="' + TARGET_KEY + '"]');
  assert.ok(input, 'the trapped rename input must render');
  input.value = 'Renamed Trapped Section';
  input.dispatchEvent(new win.Event('input', { bubbles: true })); // arm the dirty tracker
  var saveBtn = win.document.getElementById('settingsSaveBtn');
  assert.strictEqual(saveBtn.disabled, false, 'Save must be enabled after an edit fires the dirty tracker');
  saveBtn.click(); // async onSave
  await settle();
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // A. The REAL onSave catch fires settings.save.failed when the DB write throws.
  await test('a Save whose PortfolioDB.setTherapistSetting throws fires the real onSave catch → App.showToast("", "settings.save.failed")', async function () {
    var env = buildEnv(true);
    await driveSave(env);
    assert.ok((env.mockDb.__calls.get('setTherapistSetting') || []).length >= 1,
      'onSave must have attempted at least one setTherapistSetting write');
    assert.ok(failedToastFired(env.app),
      'the onSave catch must show the settings.save.failed toast when the write rejects');
    env.dom.window.close();
  });

  // B. Companion negative: when the write SUCCEEDS the failed toast must NOT fire
  //    (so a handler that always shows the failed toast is rejected too).
  await test('a Save whose writes succeed does NOT fire the settings.save.failed toast', async function () {
    var env = buildEnv(false);
    await driveSave(env);
    assert.ok(!failedToastFired(env.app),
      'a successful save must not show the save-failed toast (the failed toast is gated on the thrown write)');
    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────
  var EXPECTED_COUNT = 2;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-12 settings-save-failed-toast tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (e) { console.error('TEST CRASHED:', e && e.stack || e); process.exit(1); });
