/**
 * tests/39-help-render.test.js — help.js renderer behavior gate (Phase 39,
 * Plan 04; HELP-02/03/06).
 *
 * WHAT THIS PINS (observable output only, per feedback-behavior-verification):
 * the REAL assets/help.js, driven against the REAL help.html skeleton in jsdom,
 * builds the hybrid A+C help center FROM window.HELP_CONTENT_EN — never from
 * hardcoded page copy (D-18). Four falsifiable cases:
 *
 *   (1) render() builds exactly window.HELP_CONTENT_EN.length `.help-card`
 *       elements; the featured card (make-it-yours) is FIRST and open at load.
 *   (2) a `{ui:<key>}` token in a topic body renders the LIVE i18n label via
 *       App.t() (D-23) — the resolved text is present and the literal `{ui:...}`
 *       token is gone.
 *   (3) T-39-06: a no-match search whose term is an `<img onerror>` HTML payload
 *       shows #searchEmpty, echoes the term as TEXT (textContent) and creates NO
 *       <img> element — proving the echo is textContent, not innerHTML. Flipping
 *       help.js's `term.textContent = raw` to `term.innerHTML = raw` makes this
 *       case FAIL (verified during authoring, then reverted).
 *   (4) D-11: openForHash('#<topic-id>') auto-expands the owning card.
 *
 * A tail count-guard (F-A) asserts all cases executed, so a silently-skipped run
 * cannot exit vacuously green.
 *
 * Read-only: EVALs assets/{i18n-en,help-content-en,help}.js + help.html into an
 * isolated jsdom window; never writes any production file.
 *
 * Run: node tests/39-help-render.test.js
 * Exits 0 on full pass, 1 on any failure (the tests/run-all.js contract).
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

var PASS = 0;
var CASES = 0;
function ok(label, cond) {
  CASES++;
  if (cond) { PASS++; console.log('PASS: ' + label); }
  else { console.error('FAIL: ' + label); process.exitCode = 1; }
}

// ── build a jsdom help.html env with the REAL help.js rendered ────────────────
function buildEnv() {
  var html = readAsset('help.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/help.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  // Load the i18n dict + the help corpus into the window (their own globals).
  win.eval(readAsset('assets/i18n-en.js'));
  win.eval(readAsset('assets/help-content-en.js'));

  var EN = win.I18N.en;
  // App stub whose t() resolves against the REAL EN dictionary (D-23 seam).
  win.App = createAppStub({ t: function (key) { return EN[key] || key; } });

  // Eval the REAL renderer (also self-boots; we drive render() explicitly).
  win.eval(readAsset('assets/help.js'));
  win.Help.render();

  return { win: win, doc: win.document, EN: EN, SECTIONS: win.HELP_CONTENT_EN };
}

// ── (1) card count + featured-first ───────────────────────────────────────────
(function testCardCountAndFeatured() {
  var env = buildEnv();
  var cards = env.doc.querySelectorAll('.help-card');
  ok('.help-card count === HELP_CONTENT_EN.length',
    cards.length === env.SECTIONS.length && cards.length > 0);

  var firstCard = env.doc.querySelector('#helpCards .help-card');
  ok('featured card renders first',
    firstCard && firstCard.id === 'make-it-yours' && firstCard.classList.contains('featured'));
  ok('featured card is open at load',
    firstCard && firstCard.classList.contains('is-open') &&
    firstCard.querySelector('.card-head').getAttribute('aria-expanded') === 'true');

  // every card id === its section id (anchor-addressable)
  var allIdsMatch = env.SECTIONS.every(function (s) {
    return env.doc.getElementById(s.id) && env.doc.getElementById(s.id).classList.contains('help-card');
  });
  ok('every card id === section.id (anchor-addressable)', allIdsMatch);
})();

// ── (2) {ui:key} live-label interpolation ─────────────────────────────────────
(function testUiInterpolation() {
  var env = buildEnv();
  var KEY = 'settings.tab.fields'; // used verbatim in make-it-yours topic body
  var expectedLabel = env.EN[KEY];
  assert.ok(expectedLabel && expectedLabel.indexOf('{ui:') === -1,
    'precondition: EN[' + KEY + '] resolves to a real label');

  var card = env.doc.getElementById('make-it-yours');
  var bodyText = card.textContent;
  ok('{ui:' + KEY + '} renders the resolved live label',
    bodyText.indexOf(expectedLabel) !== -1);
  ok('no literal {ui:...} token leaks into the rendered card',
    bodyText.indexOf('{ui:') === -1);
})();

// ── (3) T-39-06: no-match term echo is textContent, not innerHTML ─────────────
(function testSearchXssEcho() {
  var env = buildEnv();
  var PAYLOAD = '<img src=x onerror=alert(1)>';
  env.win.Help.applySearch(PAYLOAD);

  var box = env.doc.getElementById('searchEmpty');
  ok('#searchEmpty is shown on a zero-match search',
    box && box.style.display === 'block');
  ok('searched term is echoed as TEXT',
    box && box.textContent.indexOf(PAYLOAD) !== -1);
  ok('no <img> element is created from the payload (textContent, not innerHTML)',
    box && box.querySelectorAll('img').length === 0);

  var term = env.doc.getElementById('searchTerm');
  ok('#searchTerm carries the term via textContent',
    term && term.textContent === PAYLOAD && term.children.length === 0);
})();

// ── (4) D-11: deep-link openForHash auto-expands the owning card ──────────────
(function testDeepLinkExpand() {
  var env = buildEnv();
  var owning = env.doc.getElementById('adding-a-client');
  // precondition: not open before the deep-link
  assert.ok(!owning.classList.contains('is-open'), 'precondition: card starts collapsed');
  env.win.Help.openForHash('#topic-first-client');
  ok('openForHash(#topic-first-client) expands its owning card',
    owning.classList.contains('is-open') &&
    owning.querySelector('.card-head').getAttribute('aria-expanded') === 'true');
})();

// ── F-A: vacuous-green guard ──────────────────────────────────────────────────
// 11 assertions run above (4 + 2 + 4 + 1); this guard is the 12th.
var EXPECTED_CASES = 11;
ok('all ' + EXPECTED_CASES + ' assertions executed (no silent skip)', CASES === EXPECTED_CASES);

console.log('\n' + PASS + '/' + CASES + ' checks passed');
if (process.exitCode === 1) {
  console.error('39-help-render: FAILED');
} else {
  console.log('39-help-render: PASSED');
}
