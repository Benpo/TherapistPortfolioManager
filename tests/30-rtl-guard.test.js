/**
 * tests/30-rtl-guard.test.js — RTL regression guard (TEST-02, D-11).
 *
 * ROOT CAUSE THIS GUARDS: the page direction is set in exactly one place,
 * assets/app.js:124 inside setLanguage():
 *     document.documentElement.setAttribute("dir", currentLang === "he" ? "rtl" : "ltr");
 * Only Hebrew is an RTL locale; English, German and Czech are LTR. A future
 * refactor that broadened that condition (e.g. `currentLang !== "en"`, or an
 * accidental `!==`/`===` flip, or adding a locale to an "rtl set") would silently
 * apply dir="rtl" to a Latin-script locale, mirroring every page and breaking
 * layout for en/de/cs users — a regression with no other automated tripwire.
 *
 * THE GUARD: load the REAL setLanguage (via window.App from assets/app.js, the
 * actual exported dir-applying code path — NOT a re-implementation) into a jsdom
 * window with a real document.documentElement, then sweep all 4 shipped locales
 * and read the OBSERVABLE document.documentElement `dir` attribute after each
 * App.setLanguage call:
 *     he -> "rtl"   ,   en -> "ltr"   ,   de -> "ltr"   ,   cs -> "ltr"
 *
 * FALSIFIABLE (per feedback-behavior-verification — a behavior test must FAIL on
 * the regression it guards, not merely assert a symbol exists): mutate the
 * production condition at app.js:124 in a scratch copy — e.g. to
 * `currentLang !== "en" ? "rtl" : "ltr"` — and the de and cs cases flip to
 * dir="rtl", so this test FAILS. Restore it and the test PASSES. A pure shape
 * check (grep for `"rtl"`) could not catch that mutation; reading the rendered
 * dir attribute after the real call does.
 *
 * The real i18n dictionaries (assets/i18n-*.js) are loaded so window.I18N[lang]
 * is truthy for each locale and setLanguage keeps the requested language instead
 * of falling back to the default — i.e. we exercise the genuine accepted-language
 * branch, not the fallback.
 *
 * Read-only: this test EVALS assets/app.js + assets/i18n-*.js into an isolated
 * jsdom window; it never writes any assets/* production file.
 *
 * Run: node tests/30-rtl-guard.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');
var JSDOM = require('jsdom').JSDOM;

function readAsset(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

// The locale -> expected document direction contract. Hebrew is the ONLY RTL
// locale; every Latin-script locale must resolve to ltr.
var LOCALE_DIR = [
  ['he', 'rtl'],
  ['en', 'ltr'],
  ['de', 'ltr'],
  ['cs', 'ltr'],
];

// Build a jsdom window with a real document.documentElement, load the real i18n
// dictionaries + assets/app.js (which exposes window.App.setLanguage, the real
// dir-applying code path), and return the window.
function buildWindow() {
  // Use a non-opaque https origin so jsdom provides a working localStorage:
  // setLanguage() persists portfolioLang to localStorage, and jsdom throws
  // "localStorage is not available for opaque origins" under a file:// URL.
  var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://localhost/test-harness.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  // Default language must be in place before app.js's IIFE reads it on eval.
  win.I18N_DEFAULT = 'en';

  // Load the real translation dictionaries so window.I18N[lang] is truthy for
  // each of the 4 locales (otherwise setLanguage falls back to the default).
  win.eval(readAsset('assets/i18n-en.js'));
  win.eval(readAsset('assets/i18n-he.js'));
  win.eval(readAsset('assets/i18n-de.js'));
  win.eval(readAsset('assets/i18n-cs.js'));

  // Load the REAL app namespace (defines + exports window.App.setLanguage).
  win.eval(readAsset('assets/app.js'));

  if (!win.App || typeof win.App.setLanguage !== 'function') {
    throw new Error('assets/app.js did not expose window.App.setLanguage after eval');
  }
  return { dom: dom, win: win };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log('  PASS  ' + name);
    passed++;
  } catch (err) {
    console.log('  FAIL  ' + name);
    console.log('        ' + (err && err.message || err));
    failed++;
  }
}

var env = buildWindow();
var win = env.win;
var docEl = win.document.documentElement;

// Sanity: each locale's dictionary actually loaded, so we test the accepted-
// language branch (not the fallback that would make every case resolve to 'en').
test('precondition: all 4 i18n dictionaries loaded (real accepted-language branch)', function () {
  ['en', 'he', 'de', 'cs'].forEach(function (lang) {
    if (!win.I18N || !win.I18N[lang] || typeof win.I18N[lang] !== 'object') {
      throw new Error('window.I18N.' + lang + ' missing — setLanguage would fall back to default, ' +
        'making the dir sweep meaningless');
    }
  });
});

// The core guard: sweep all 4 locales through the REAL setLanguage and read the
// observable dir attribute. he must be rtl; en/de/cs must be ltr.
LOCALE_DIR.forEach(function (pair) {
  var lang = pair[0];
  var expected = pair[1];
  test('App.setLanguage("' + lang + '") sets document dir="' + expected + '"', function () {
    win.App.setLanguage(lang);

    // The language must actually be the one we requested (guards against a
    // silent fallback that would let a wrong dir pass for the wrong reason).
    if (win.App.getLanguage() !== lang) {
      throw new Error('setLanguage("' + lang + '") did not take effect; getLanguage()="' +
        win.App.getLanguage() + '"');
    }

    var dir = docEl.getAttribute('dir');
    if (dir !== expected) {
      throw new Error('locale "' + lang + '" produced dir="' + dir + '" but must be "' + expected +
        '". ' + (expected === 'ltr'
          ? 'rtl was applied to a non-Hebrew locale — this is the regression this guard exists to catch.'
          : 'Hebrew must render right-to-left.'));
    }
  });
});

env.dom.window.close();

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
