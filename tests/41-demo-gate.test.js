/**
 * tests/41-demo-gate.test.js — Phase 41 Plan 05 (TOUR-01 / D-16) behavior guard
 * for the demo-gated "Take the tour" row in the "?" help-entry popover.
 *
 * WHAT THIS PINS (observable DOM behavior, not source shape):
 *   1. On a NORMAL page (window.name != 'demo-mode') App.initHelpEntry() mounts a
 *      .help-entry-item carrying data-label-key='help.entry.takeTour' whose label
 *      is t('help.entry.takeTour') via textContent — and it sits AFTER the
 *      'help.entry.replayWelcome' row (P40 D-17 slot ordering).
 *   2. In the sales demo (window.name === 'demo-mode') NO help-entry-item carries
 *      data-label-key='help.entry.takeTour' — the row is filtered out entirely
 *      (no dead row), while the day-one rows (center/contact) still mount (D-16).
 *
 * The demo seam is window.name === 'demo-mode' — the established gate used by
 * mountBackupCloudButton / initDemoMode / redirectDemoBrandLink (grep app.js).
 * Setting win.name explicitly mirrors tests/35-demo-chrome.test.js (demo.html's
 * inline window.name script does not run under runScripts:'outside-only').
 *
 * HARNESS: boots the REAL assets/app.js into an isolated jsdom window (same
 * eval-into-jsdom convention as tests/39-help-entry.test.js), seeding
 * window.I18N.en from assets/i18n-en.js so t() resolves help.entry.*.
 * App.initHelpEntry is exported as a test seam.
 *
 * FALSIFIABLE: with the code absent, assertion (1) fails (no takeTour row mounts);
 * with the demo filter absent, assertion (2) fails (a dead takeTour row appears
 * in the demo). Both directions are pinned.
 *
 * Read-only: EVALS assets/* into a jsdom window; writes no assets/*.
 *
 * Run: node tests/41-demo-gate.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// Build an isolated jsdom window with the shared-chrome mount points and the
// real App surface. When `demo` is true, window.name is set to 'demo-mode'
// BEFORE initHelpEntry runs (the established demo seam).
function buildWindow(demo) {
  var html = '<!DOCTYPE html><html><head></head>'
    + '<body data-nav="overview">'
    + '<div id="nav-placeholder"></div>'
    + '<div id="headerActions"></div>'
    + '</body></html>';
  var dom = new JSDOM(html, {
    url: 'https://localhost/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };
  win.eval(readAsset('assets/i18n-en.js'));
  win.I18N_DEFAULT = 'en';
  win.eval(readAsset('assets/app.js'));
  if (!win.App || typeof win.App.initHelpEntry !== 'function') {
    throw new Error('assets/app.js did not expose App.initHelpEntry (test seam)');
  }
  // Demo gating seam — set BEFORE the mount reads window.name.
  if (demo) win.name = 'demo-mode';
  return { dom: dom, win: win, App: win.App };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── 1. normal page: the "Take the tour" row IS present, after Replay welcome ──
test('normal page: "Take the tour" row mounts with t() label, after the Replay welcome row', function () {
  var env = buildWindow(false);
  env.App.initHelpEntry();
  var doc = env.win.document;
  var tour = doc.querySelector('.help-entry-item[data-label-key="help.entry.takeTour"]');
  assert.ok(tour, 'the "Take the tour" row must mount on a normal (non-demo) page');
  assert.strictEqual(tour.textContent, env.App.t('help.entry.takeTour'),
    '"Take the tour" label must be t(help.entry.takeTour) via textContent');

  // Ordering (P40 D-17 slot): takeTour comes AFTER replayWelcome.
  var all = Array.prototype.slice.call(doc.querySelectorAll('.help-entry-item'));
  var keys = all.map(function (el) { return el.getAttribute('data-label-key'); });
  var iReplay = keys.indexOf('help.entry.replayWelcome');
  var iTour = keys.indexOf('help.entry.takeTour');
  assert.ok(iReplay !== -1, 'the Replay welcome row must still mount');
  assert.ok(iTour > iReplay,
    'the "Take the tour" row must sit AFTER the Replay welcome row (D-17 slot)');
  env.dom.window.close();
});

// ── 2. demo page: the "Take the tour" row is filtered out (no dead row) ───────
test('demo page (window.name=demo-mode): NO "Take the tour" row mounts (D-16)', function () {
  var env = buildWindow(true);
  env.App.initHelpEntry();
  var doc = env.win.document;
  var tour = doc.querySelector('.help-entry-item[data-label-key="help.entry.takeTour"]');
  assert.strictEqual(tour, null,
    'the "Take the tour" row must be ABSENT in demo mode (filtered out, not a dead row)');
  // The day-one rows still mount — the gate is scoped to the tour row only.
  assert.ok(doc.querySelector('.help-entry-item[data-label-key="help.entry.center"]'),
    'the Help center day-one row must still mount in demo');
  assert.ok(doc.querySelector('.help-entry-item[data-label-key="help.entry.contact"]'),
    'the Contact us day-one row must still mount in demo');
  env.dom.window.close();
});

console.log('\n41-demo-gate: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
