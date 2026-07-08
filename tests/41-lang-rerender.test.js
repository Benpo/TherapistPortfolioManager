/**
 * tests/41-lang-rerender.test.js — Plan 41-04, TOUR-04.
 *
 * Pins the MID-TOUR LANGUAGE RE-RENDER contract of the bespoke tour engine
 * (assets/tour.js, window.Tour):
 *
 *   A. Text-level re-render (TOUR-04). With a tour active, dispatching a
 *      document-level `app:language` CustomEvent after switching the stored
 *      locale tears down the mounted chrome and re-renders the CURRENT step so
 *      every tour string re-resolves through t() in the new locale
 *      (cleanup-then-replace). Asserted at the textContent level only.
 *   B. Single-listener idempotency. The `app:language` listener is installed
 *      exactly once; repeated start()/endTour() cycles do not stack duplicate
 *      listeners, and a repeated dispatch re-renders in place (one .sg-tour-root,
 *      one .sg-tour-tooltip — never duplicate stacked chrome).
 *   C. Inactive no-op. When no tour is active, an `app:language` dispatch mounts
 *      no chrome and leaves isActive() false.
 *
 * jsdom has NO layout engine (getBoundingClientRect is zeros, offsetParent is
 * always null), so branch selection is forced through the Tour._isAnchorVisible
 * seam and NO scenario asserts pixel geometry / arrow side — that is the Plan 07
 * WebKit gate. This file asserts TEXT + node identity only.
 *
 * Authored RED — the `app:language` listener does not exist in tour.js yet, so
 * scenarios A and B fail → exit 1 until Task 2 implements it.
 *
 * Run: node tests/41-lang-rerender.test.js
 * Exits 0 on full pass, 1 on any failure (tests/run-all.js contract).
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// Two locales whose help.tour.step.overview.* values DIFFER, so a text-level
// assertion after a locale switch proves the re-render actually re-resolved copy
// (not just left the old nodes in place). Flat dotted-key dict — the shape t()
// resolves against.
function stubI18N(win) {
  win.I18N = {
    en: {
      'help.tour.step.overview.title': 'Welcome to your garden',
      'help.tour.step.overview.body': 'Your quiet home base.',
      'help.tour.counter': 'Step {n} of {total}',
      'help.tour.next': 'Next',
      'help.tour.done': 'Done',
      'help.tour.back': 'Previous step',
      'help.tour.close': 'Close tour'
    },
    he: {
      'help.tour.step.overview.title': 'ברוכים הבאים לגן שלכם',
      'help.tour.step.overview.body': 'בסיס הבית השקט שלכם.',
      'help.tour.counter': 'שלב {n} מתוך {total}',
      'help.tour.next': 'הבא',
      'help.tour.done': 'סיום',
      'help.tour.back': 'שלב קודם',
      'help.tour.close': 'סגירת הסיור'
    }
  };
}

// Build an isolated jsdom window on a given page, stub I18N, and load the real
// assets/tour.js. Spies on document.addEventListener BEFORE the eval so the
// once-only guarantee is countable.
function buildEnv(opts) {
  opts = opts || {};
  var page = opts.page || 'index.html';
  var body = opts.body || '<div data-tour="overview">Overview</div>';
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

  stubI18N(win);

  // Count app:language document listeners registered by tour.js (once-only proof).
  var langListenerCount = 0;
  var origAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'app:language') langListenerCount++;
    return origAdd(type, fn, o);
  };

  win.eval(readAsset('assets/tour.js'));
  if (!win.Tour) throw new Error('assets/tour.js did not expose window.Tour');

  return {
    dom: dom, win: win, Tour: win.Tour,
    getLangListenerCount: function () { return langListenerCount; },
    setLang: function (l) { win.localStorage.setItem('portfolioLang', l); },
    fireLang: function (l) {
      win.document.dispatchEvent(new win.CustomEvent('app:language', { detail: { lang: l } }));
    }
  };
}

var EXPECTED_COUNT = 3;
var passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  await test('A. app:language re-renders the current step in the new locale (text-level, TOUR-04)', async function () {
    var env = buildEnv({ page: 'index.html' });
    env.Tour._isAnchorVisible = function () { return true; };
    env.Tour.start();
    assert.strictEqual(env.Tour.isActive(), true, 'tour must be active after start()');
    var titleEl = env.win.document.querySelector('.sg-tour-title');
    assert.ok(titleEl, 'a title node must be mounted');
    assert.strictEqual(titleEl.textContent, env.win.I18N.en['help.tour.step.overview.title'],
      'title renders in the initial (en) locale');

    // Switch stored locale, then fire the same event app.js dispatches.
    env.setLang('he');
    env.fireLang('he');

    var titleAfter = env.win.document.querySelector('.sg-tour-title');
    assert.ok(titleAfter, 'a title node must still be mounted after re-render');
    assert.strictEqual(titleAfter.textContent, env.win.I18N.he['help.tour.step.overview.title'],
      'title textContent must re-resolve to the he locale after app:language (cleanup-then-replace)');
    var bodyAfter = env.win.document.querySelector('.sg-tour-body');
    assert.strictEqual(bodyAfter.textContent, env.win.I18N.he['help.tour.step.overview.body'],
      'body textContent must re-resolve to the he locale too');
  });

  await test('B. single-listener idempotency — no duplicate listeners or stacked chrome', async function () {
    var env = buildEnv({ page: 'index.html' });
    assert.strictEqual(env.getLangListenerCount(), 1,
      'exactly one app:language listener installed at load');

    env.Tour._isAnchorVisible = function () { return true; };
    env.Tour.start();
    env.Tour._endTour();
    env.Tour.start();
    assert.strictEqual(env.getLangListenerCount(), 1,
      'start()/endTour() cycles must NOT stack additional app:language listeners');

    // Repeated dispatch must re-render in place, never stack duplicate chrome.
    env.setLang('he');
    env.fireLang('he');
    env.fireLang('he');
    assert.strictEqual(env.win.document.querySelectorAll('.sg-tour-root').length, 1,
      'exactly one .sg-tour-root after repeated dispatch (cleanup-then-replace)');
    assert.strictEqual(env.win.document.querySelectorAll('.sg-tour-tooltip').length, 1,
      'exactly one .sg-tour-tooltip after repeated dispatch (no duplicate stacked chrome)');
  });

  await test('C. app:language is a no-op when the tour is not active', async function () {
    var env = buildEnv({ page: 'index.html' });
    assert.strictEqual(env.Tour.isActive(), false, 'precondition: tour not active');
    env.setLang('he');
    env.fireLang('he');
    assert.strictEqual(env.win.document.querySelector('.sg-tour-root'), null,
      'no chrome may be mounted by an app:language dispatch while inactive');
    assert.strictEqual(env.Tour.isActive(), false, 'tour must stay inactive');
  });

  var ran = passed + failed;
  if (ran !== EXPECTED_COUNT) {
    console.log('FAIL  scenario-count guard: ran ' + ran + ' of ' + EXPECTED_COUNT);
    process.exit(1);
  }
  process.exit(failed === 0 ? 0 : 1);
})();
