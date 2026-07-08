/**
 * tests/41-fallback-degradation.test.js — Plan 41-03, TOUR-02 + gates A3/A5.
 *
 * Pins graceful anchor degradation that NEVER silently skips a step:
 *
 *   A. (A5, visible branch) Tour._isAnchorVisible stubbed → true with the anchor
 *      present: render() mounts the SPOTLIGHT chrome and NO fallback modal.
 *   B. (A5, missing branch) Tour._isAnchorVisible stubbed → false: render()
 *      mounts the centered FALLBACK modal carrying the step's own text + a
 *      working "Take me there" link, and the step index does NOT advance past
 *      the missing step (no silent skip — TOUR-02).
 *   C. (A3) Activating "Take me there" persists sg.tourResume {stepIndex:<current>}
 *      BEFORE navigating to takeMeThereHref, so resume() re-renders the SAME step
 *      on the target page (where the anchor should be present → spotlight). The
 *      recovery action never silently terminates the tour.
 *
 * Both branches are driven through the injectable Tour._isAnchorVisible seam (A5)
 * — jsdom hardcodes offsetParent === null so real offsetParent can never select
 * the visible branch. No pixel geometry is asserted (Plan 07 WebKit gate owns it):
 * only node presence, text, href, and state.
 *
 * Authored RED — assets/tour.js absent until Task 2 → exit 1.
 *
 * Run: node tests/41-fallback-degradation.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

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
  win.App = { lockBodyScroll: function () {}, unlockBodyScroll: function () {} };

  win.eval(readAsset('assets/i18n-en.js'));
  if (!win.I18N || !win.I18N.en) throw new Error('i18n-en.js did not populate window.I18N.en');
  win.eval(readAsset('assets/tour.js'));           // RED until Task 2
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
  await test('A. visible branch (A5 → true): spotlight mounts, no fallback modal', async function () {
    var env = buildEnv({ page: 'index.html', body: '<div data-tour="overview">Overview</div>' });
    env.Tour._isAnchorVisible = function () { return true; };
    env.Tour.start();
    assert.ok(env.win.document.querySelector('.sg-tour-spotlight'), 'spotlight must mount when anchor visible');
    assert.strictEqual(env.win.document.querySelector('.sg-tour-modal-scrim'), null, 'no fallback modal on the visible branch');
  });

  await test('B. missing branch (A5 → false): centered fallback modal + step text + Take-me-there, no silent skip (TOUR-02)', async function () {
    var env = buildEnv({ page: 'index.html' /* anchor deliberately absent */ });
    var steps = env.Tour._getSteps();
    var step1 = steps[0];
    var expectTitle = env.win.I18N.en[step1.i18nKey + '.title'];
    env.Tour._isAnchorVisible = function () { return false; };
    env.Tour.start();

    var scrim = env.win.document.querySelector('.sg-tour-modal-scrim');
    assert.ok(scrim, 'fallback modal must render when the anchor is missing (never blank)');
    assert.strictEqual(env.win.document.querySelector('.sg-tour-spotlight'), null, 'no spotlight on the missing branch');

    var text = scrim.textContent || '';
    assert.ok(expectTitle && text.indexOf(expectTitle) !== -1,
      'fallback must carry the SAME step text (title "' + expectTitle + '")');

    var takeMe = scrim.querySelector('.sg-tour-takeme');
    assert.ok(takeMe, 'fallback must offer a working "Take me there" link');

    // No silent skip: the step index must NOT advance past the missing step.
    assert.strictEqual(env.Tour._getStepIndex(), 0, 'stepIndex must not advance past a missing anchor');
  });

  await test('C. A3: "Take me there" persists sg.tourResume {stepIndex:current} BEFORE navigating to takeMeThereHref', async function () {
    var env = buildEnv({ page: 'index.html' });
    var steps = env.Tour._getSteps();
    // Position on a mid-tour step so "current" is unambiguously non-zero.
    env.Tour._setStepIndex(4);
    var step = steps[4];
    var navTargets = [];
    var resumeAtNav = null;
    env.Tour._navigate = function (href) {
      // Capture the resume key AS IT IS at navigation time (proves persist-before-navigate).
      resumeAtNav = env.win.sessionStorage.getItem('sg.tourResume');
      navTargets.push(href);
    };
    env.Tour._isAnchorVisible = function () { return false; };
    // Render the missing-anchor fallback for the current step (4) directly.
    env.Tour._render();
    var scrim = env.win.document.querySelector('.sg-tour-modal-scrim');
    assert.ok(scrim, 'fallback modal must be present for the Take-me-there activation');
    var takeMe = scrim.querySelector('.sg-tour-takeme');
    assert.ok(takeMe, 'Take-me-there link present');

    // Activate the recovery link.
    if (typeof takeMe.onclick === 'function') {
      takeMe.onclick({ preventDefault: function () {} });
    } else {
      takeMe.dispatchEvent(new env.win.Event('click', { bubbles: true, cancelable: true }));
    }

    assert.strictEqual(navTargets.length, 1, 'exactly one navigation attempt from Take-me-there');
    assert.ok(navTargets[0].indexOf(step.takeMeThereHref) !== -1 || navTargets[0] === step.takeMeThereHref,
      'navigation must target the step takeMeThereHref (' + step.takeMeThereHref + '), got ' + navTargets[0]);
    assert.ok(resumeAtNav, 'sg.tourResume must be persisted BEFORE navigation (A3)');
    var parsed = JSON.parse(resumeAtNav);
    assert.strictEqual(parsed.stepIndex, 4, 'persisted resume must carry the CURRENT stepIndex (4)');
  });

  var ran = passed + failed;
  if (ran !== EXPECTED_COUNT) {
    console.log('FAIL  scenario-count guard: ran ' + ran + ' of ' + EXPECTED_COUNT);
    process.exit(1);
  }
  process.exit(failed === 0 ? 0 : 1);
})();
