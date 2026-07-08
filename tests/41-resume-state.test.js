/**
 * tests/41-resume-state.test.js — Plan 41-03, TOUR-03 / D-09.
 *
 * Pins cross-page resume with sessionStorage as the ONLY resume tier and
 * relaunch-from-step-1 semantics:
 *
 *   A. next() crossing to a step on another page writes sessionStorage
 *      sg.tourResume {tourId, stepIndex} and navigates (location.href seam) —
 *      it does not render in place across a page boundary.
 *   B. resume() with that key present, on the matching page, continues the run
 *      at stepIndex (isActive() true, chrome mounted).
 *   C. resume() with sg.tourResume ABSENT resolves to step 1 (no chrome mounted,
 *      not active, stepIndex 0) — a fresh launch restarts from the top (D-09);
 *      a subsequent start() begins the run at step 1.
 *   D. endTour() clears sg.tourResume (mid-tour close / finish leaves no key, so
 *      the next launch cannot resume — Pitfall 6).
 *
 * sessionStorage is the single resume tier: there is NO localStorage resume key
 * and NO offer-to-resume. jsdom drives the DOM; the Tour._navigate seam captures
 * navigation so no real page load occurs. Branch selection uses the
 * Tour._isAnchorVisible seam (jsdom offsetParent is always null).
 *
 * Authored RED — assets/tour.js absent until Task 2 → exit 1.
 *
 * Run: node tests/41-resume-state.test.js
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

var EXPECTED_COUNT = 4;
var passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  await test('A. next() across a page boundary writes sg.tourResume {tourId,stepIndex} then navigates (TOUR-03/D-06)', async function () {
    // On index.html at step 2 (add-session anchor). Step 3 lives on add-session.html → cross-page.
    var env = buildEnv({ page: 'index.html' });
    var steps = env.Tour._getSteps();
    assert.notStrictEqual(steps[2].page, steps[3].page, 'fixture assumption: step 2 and 3 are on different pages');
    env.Tour._setStepIndex(2);
    var navTargets = [];
    env.Tour._navigate = function (href) { navTargets.push(href); };
    env.Tour.next();

    var raw = env.win.sessionStorage.getItem('sg.tourResume');
    assert.ok(raw, 'cross-page next() must persist sg.tourResume');
    var parsed = JSON.parse(raw);
    assert.strictEqual(parsed.stepIndex, 3, 'persisted stepIndex must be the next step (3)');
    assert.ok(parsed.tourId, 'resume payload carries a tourId');
    assert.strictEqual(navTargets.length, 1, 'exactly one navigation on a cross-page next()');
    assert.ok(navTargets[0].indexOf(steps[3].page) !== -1, 'navigation targets the next step page (' + steps[3].page + ')');
  });

  await test('B. resume() with a present key on the matching page continues at stepIndex (isActive true, chrome mounted)', async function () {
    // Land on add-session.html with a resume key pointing at step 3 (session-setup).
    var env = buildEnv({ page: 'add-session.html', body: '<div data-tour="session-setup">Setup</div>' });
    env.win.sessionStorage.setItem('sg.tourResume', JSON.stringify({ tourId: 'main', stepIndex: 3 }));
    env.Tour._isAnchorVisible = function () { return true; };
    env.Tour.resume();
    assert.strictEqual(env.Tour.isActive(), true, 'resume() on the matching page activates the tour');
    assert.strictEqual(env.Tour._getStepIndex(), 3, 'resume() continues at the persisted stepIndex (3)');
    assert.ok(env.win.document.querySelector('.sg-tour-spotlight'), 'resume() renders the step chrome');
  });

  await test('C. resume() with ABSENT key resolves to step 1 — no chrome, not active, stepIndex 0 (D-09)', async function () {
    var env = buildEnv({ page: 'index.html', body: '<div data-tour="overview">Overview</div>' });
    // No sg.tourResume key set (fresh launch / new session).
    env.Tour.resume();
    assert.strictEqual(env.Tour.isActive(), false, 'resume() with no key must not activate');
    assert.strictEqual(env.win.document.querySelector('.sg-tour-root'), null, 'resume() with no key mounts no chrome');
    assert.strictEqual(env.Tour._getStepIndex(), 0, 'no-key resume resolves to step 1 (index 0)');
    // A fresh explicit launch then starts at step 1.
    env.Tour._isAnchorVisible = function () { return true; };
    env.Tour.start();
    assert.strictEqual(env.Tour._getStepIndex(), 0, 'start() begins the run at step 1');
    assert.ok(env.win.document.querySelector('.sg-tour-spotlight'), 'start() renders step 1 chrome');
  });

  await test('D. endTour() clears sg.tourResume (no key survives a close/finish)', async function () {
    var env = buildEnv({ page: 'index.html', body: '<div data-tour="overview">Overview</div>' });
    env.win.sessionStorage.setItem('sg.tourResume', JSON.stringify({ tourId: 'main', stepIndex: 0 }));
    env.Tour._isAnchorVisible = function () { return true; };
    env.Tour.start();
    // Drive the real close/end path via the Close control.
    var closeBtn = env.win.document.querySelector('.sg-tour-btn-close');
    assert.ok(closeBtn, 'a Close control must be present in the step chrome');
    if (typeof closeBtn.onclick === 'function') closeBtn.onclick({ preventDefault: function () {} });
    else closeBtn.dispatchEvent(new env.win.Event('click', { bubbles: true, cancelable: true }));

    assert.strictEqual(env.win.sessionStorage.getItem('sg.tourResume'), null, 'endTour() must clear sg.tourResume');
    assert.strictEqual(env.Tour.isActive(), false, 'tour is inactive after endTour()');
  });

  var ran = passed + failed;
  if (ran !== EXPECTED_COUNT) {
    console.log('FAIL  scenario-count guard: ran ' + ran + ' of ' + EXPECTED_COUNT);
    process.exit(1);
  }
  process.exit(failed === 0 ? 0 : 1);
})();
