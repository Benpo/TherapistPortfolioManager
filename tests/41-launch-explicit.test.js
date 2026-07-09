/**
 * tests/41-launch-explicit.test.js — Plan 41-03, TOUR-01 + architect-gate A2.
 *
 * Pins the EXPLICIT-LAUNCH-ONLY contract of the bespoke tour engine
 * (assets/tour.js, window.Tour):
 *
 *   A. Loading tour.js does NOTHING on its own — no chrome is mounted and
 *      isActive() is false until start() is called (TOUR-01, no auto-run).
 *   B. start() ON step-1's page mounts the step-1 SPOTLIGHT chrome in place
 *      (visibility forced through the injectable _isAnchorVisible seam, A5).
 *   C. PAGE-AWARE start (architect-gate A2 / D-02): calling start() while the
 *      current page is NOT STEPS[0].page persists sg.tourResume {stepIndex:0}
 *      and navigates to STEPS[0].page — it does NOT immediately drop a fallback
 *      modal (or any chrome) on the wrong page. window.location is never really
 *      navigated: the test overrides the Tour._navigate seam to capture the
 *      attempted target, and asserts the sessionStorage write deterministically.
 *
 * jsdom has NO layout engine (getBoundingClientRect is zeros) and hardcodes
 * offsetParent === null for every element, so branch selection is driven ONLY
 * through the Tour._isAnchorVisible seam — never real offsetParent. No test here
 * asserts pixel geometry (that is the Plan 07 WebKit gate).
 *
 * Authored RED — assets/tour.js does not exist yet, so buildEnv() throws while
 * loading it and every scenario fails → exit 1 until Task 2 implements it.
 *
 * Run: node tests/41-launch-explicit.test.js
 * Exits 0 on full pass, 1 on any failure (tests/run-all.js contract).
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// Build an isolated jsdom window on a given page, load the real i18n-en dict and
// the real assets/tour.js into it. opts.page selects the simulated current page.
function buildEnv(opts) {
  opts = opts || {};
  var page = opts.page || 'index.html';
  var body = opts.body || '';
  var html = '<!DOCTYPE html><html lang="en"><head></head><body>' + body + '</body></html>';
  var dom = new JSDOM(html, {
    url: 'https://localhost/' + page,
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  win.I18N_DEFAULT = 'en';
  win.matchMedia = function () {
    return { matches: false, addEventListener: function () {}, removeEventListener: function () {},
             addListener: function () {}, removeListener: function () {} };
  };
  win.requestAnimationFrame = function (cb) { return setTimeout(cb, 0); };
  win.cancelAnimationFrame = function (id) { clearTimeout(id); };
  // Reuse App scroll-lock idiom for the fallback modal only (harmless here).
  win.App = { lockBodyScroll: function () {}, unlockBodyScroll: function () {} };

  win.eval(readAsset('assets/i18n-en.js'));
  if (!win.I18N || !win.I18N.en) throw new Error('i18n-en.js did not populate window.I18N.en');

  win.eval(readAsset('assets/tour.js'));           // RED: file absent until Task 2
  if (!win.Tour) throw new Error('assets/tour.js did not expose window.Tour');
  return { dom: dom, win: win, Tour: win.Tour };
}

var EXPECTED_COUNT = 3;
var passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  await test('A. loading tour.js does NOT auto-run — no chrome, isActive() false (TOUR-01)', async function () {
    var env = buildEnv({ page: 'index.html' });
    assert.strictEqual(env.Tour.isActive(), false, 'isActive() must be false right after load');
    assert.strictEqual(env.win.document.querySelector('.sg-tour-root'), null, 'no tour chrome may be mounted on load');
    assert.strictEqual(env.win.document.querySelector('.sg-tour-spotlight'), null, 'no spotlight on load');
  });

  await test('B. start() on step-1 page mounts the step-1 spotlight in place (A5 seam → visible)', async function () {
    var steps;
    var env = buildEnv({ page: 'index.html', body: '<div data-tour="overview">Overview</div>' });
    steps = env.Tour._getSteps();
    assert.strictEqual(steps.length, 12, 'STEPS must have 12 entries');
    // Force the anchor-visible branch through the documented seam (A5).
    env.Tour._isAnchorVisible = function () { return true; };
    env.Tour.start();
    assert.strictEqual(env.Tour.isActive(), true, 'isActive() true after in-place start');
    assert.ok(env.win.document.querySelector('.sg-tour-spotlight'), 'spotlight chrome must mount on step 1');
    assert.strictEqual(env.win.document.querySelector('.sg-tour-modal-scrim'), null, 'no fallback modal when anchor is visible');
    assert.strictEqual(env.Tour._getStepIndex(), 0, 'step index is 0 on step 1');
  });

  await test('C. A2 page-aware start off step-1 page persists sg.tourResume {stepIndex:0} + navigates to STEPS[0].page (no fallback drop)', async function () {
    // Current page is sessions.html; STEPS[0].page is index.html → mismatch.
    var env = buildEnv({ page: 'sessions.html' });
    var steps = env.Tour._getSteps();
    var navTargets = [];
    env.Tour._navigate = function (href) { navTargets.push(href); };   // capture, never really navigate
    // Even if the seam were consulted, it must NOT reach a render on the wrong page.
    env.Tour._isAnchorVisible = function () { return false; };
    env.Tour.start();

    var raw = env.win.sessionStorage.getItem('sg.tourResume');
    assert.ok(raw, 'start() off step-1 page must persist sg.tourResume');
    var parsed = JSON.parse(raw);
    assert.strictEqual(parsed.stepIndex, 0, 'persisted resume stepIndex must be 0');

    assert.strictEqual(navTargets.length, 1, 'exactly one navigation must be attempted');
    assert.ok(navTargets[0].indexOf(steps[0].page) !== -1,
      'navigation target must reference STEPS[0].page (' + steps[0].page + '), got ' + navTargets[0]);

    assert.strictEqual(env.win.document.querySelector('.sg-tour-modal-scrim'), null, 'must NOT drop a fallback modal on the wrong page');
    assert.strictEqual(env.win.document.querySelector('.sg-tour-spotlight'), null, 'must NOT mount a spotlight on the wrong page');
    assert.strictEqual(env.Tour.isActive(), false, 'not active until resume() renders on the target page');
  });

  var ran = passed + failed;
  if (ran !== EXPECTED_COUNT) {
    console.log('FAIL  scenario-count guard: ran ' + ran + ' of ' + EXPECTED_COUNT);
    process.exit(1);
  }
  process.exit(failed === 0 ? 0 : 1);
})();
