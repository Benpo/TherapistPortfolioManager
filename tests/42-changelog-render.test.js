/**
 * tests/42-changelog-render.test.js — changelog.js PAGE-render behavior gate
 * (Phase 42, Plan 02; CHLG-02 / T-42-V7 + T-42-V8).
 *
 * RED-FIRST (project rule: behavior tests precede implementation). This file is
 * authored BEFORE assets/changelog.js exists; it fails RED for the right reason
 * (module absent) until Plan 06 lands the renderer, which turns it GREEN. It is
 * valid JS (`node -c` passes) and is auto-discovered by tests/run-all.js.
 *
 * WHAT THIS PINS (observable DOM only, per feedback-behavior-verification):
 * the REAL assets/changelog.js, driven in jsdom against the empty shell
 * container(s) changelog.html will ship, builds the changelog PAGE FROM a
 * window.CHANGELOG_CONTENT_EN global — never from hardcoded copy — reached via
 * the window.Changelog test seam (mirroring window.Help in help.js).
 *
 *   T-42-V7 (CHLG-02, page render):
 *     (1) entries render REVERSE-CHRONOLOGICAL (v1.3 card before v1.2 before v1.0);
 *     (2) a category that is absent/empty renders NO block for it (D-11 — empty
 *         categories omitted): the v1.3 fixture has {new, improved} but no `fixed`,
 *         so its card carries new+improved blocks and NO fixed block; the v1.2
 *         fixture has all three, so its card carries all three;
 *     (3) the v1.0 `origin:true` entry renders as a single one-line marker with
 *         NO New/Improved/Fixed blocks (D-01);
 *     (4) each version card carries a stable kebab `id` === its `anchor` (v1-3).
 *
 *   T-42-V8 (CHLG-02 / D-16, EN-fallback):
 *     (A) when window.CHANGELOG_CONTENT_HE is ABSENT (App language 'he'), the EN
 *         entries still render — full history, EN copy;
 *     (B) when a locale array is PRESENT but missing an entry version, that entry
 *         falls back to its EN counterpart (history complete in every locale):
 *         a partial HE array (v1.3 + v1.0 only) still renders the v1.2 card, and
 *         it shows the EN v1.2 lede while v1.3 shows the HE lede.
 *
 * ── SEAM CONTRACT this test defines for Plan 06 (changelog.js) ────────────────
 *   window.Changelog.render()  — builds the page from the locale-merged entries.
 *   Locale selection: render() reads App.getLanguage(); resolves
 *     window['CHANGELOG_CONTENT_' + LANG.toUpperCase()] and merges each entry
 *     over its EN counterpart, EN being the canonical (always-complete) order.
 *   DOM the renderer must build into the empty '#changelogEntries' container:
 *     - one `.changelog-entry` element per EN entry, in EN (reverse-chron) order;
 *     - each entry element `id` === entry.anchor (kebab, e.g. 'v1-3');
 *     - the origin entry additionally carries `.changelog-entry--origin` and
 *       contains ZERO `.changelog-cat` blocks;
 *     - each present category renders a `.changelog-cat[data-cat="<new|improved|
 *       fixed>"]` block; absent categories render no block;
 *     - the entry lede text appears in the entry element's textContent.
 *
 * Read-only: EVALs assets/changelog.js into an isolated jsdom window; seeds its
 * OWN window.CHANGELOG_CONTENT_* fixtures (independent of Plan 04's real file);
 * never writes any production file.
 *
 * Run: node tests/42-changelog-render.test.js
 * Exits 0 on full pass, non-zero on any failure (the tests/run-all.js contract).
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
var CHANGELOG_JS = 'assets/changelog.js';
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// ── RED guard: fail cleanly (not a stack trace) while the renderer is absent ──
// Plan 06 (changelog.js) turns this GREEN. All behavior assertions live below.
if (!fs.existsSync(path.join(REPO_ROOT, CHANGELOG_JS))) {
  console.error('RED (expected before impl): ' + CHANGELOG_JS + ' does not exist yet.');
  console.error('Plan 06 (changelog.js render) turns tests/42-changelog-render.test.js GREEN.');
  process.exit(1);
}

var PASS = 0;
var CASES = 0;
function ok(label, cond) {
  CASES++;
  if (cond) { PASS++; console.log('PASS: ' + label); }
  else { console.error('FAIL: ' + label); process.exitCode = 1; }
}

// ── fixtures ──────────────────────────────────────────────────────────────────
// EN corpus: reverse-chronological. v1.3 has {new, improved} but NO fixed (empty-
// category omission target); v1.2 has all three; v1.0 is origin-only (one-liner).
function enFixture() {
  return [
    { version: '1.3.0', anchor: 'v1-3', date: 'July 2026',
      lede: 'EN-LEDE-V13 feeling at home in the app.',
      highlights: ['A help button on every page', 'A guided tour', 'Release notes in the app'],
      categories: { new: ['New help center', 'Guided welcome tour'], improved: ['Calmer first run'] } },
    { version: '1.2.0', anchor: 'v1-2', date: 'July 2026',
      lede: 'EN-LEDE-V12 clarity and control.',
      highlights: ['Date engine', 'Session-format rename'],
      categories: { new: ['Personalize tab'], improved: ['Filters and sorting'], fixed: ['Safari install reliability'] } },
    { version: '1.0.0', anchor: 'v1-0', date: 'May 2026',
      lede: 'EN-LEDE-V10 where it all began.', origin: true },
  ];
}

// Partial HE corpus: provides v1.3 + v1.0 only; v1.2 is intentionally MISSING so
// the EN-fallback (D-16) must supply the v1.2 card with its EN lede.
function hePartialFixture() {
  return [
    { version: '1.3.0', anchor: 'v1-3', date: 'יולי 2026',
      lede: 'HE-LEDE-V13 מרגישים בבית באפליקציה.',
      highlights: ['כפתור עזרה בכל עמוד', 'סיור מודרך', 'יומן שינויים בתוך האפליקציה'],
      categories: { new: ['מרכז עזרה חדש'], improved: ['הפעלה ראשונה רגועה'] } },
    { version: '1.0.0', anchor: 'v1-0', date: 'מאי 2026',
      lede: 'HE-LEDE-V10 כאן הכול התחיל.', origin: true },
  ];
}

var SKELETON = [
  '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head>',
  '<body data-nav="changelog">',
  '  <main class="changelog-page">',
  '    <h1 id="changelogTitle"></h1>',
  '    <p id="changelogIntro"></p>',
  '    <div id="changelogEntries"></div>',
  '  </main>',
  '</body></html>',
].join('\n');

// Build a jsdom changelog page env with the REAL changelog.js rendered.
// opts.lang — App.getLanguage() return (default 'en').
// opts.he   — optional window.CHANGELOG_CONTENT_HE array (undefined = absent).
function buildEnv(opts) {
  opts = opts || {};
  var dom = new JSDOM(SKELETON, {
    url: 'https://localhost/changelog.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  // Seed the content global(s) the renderer reads (independent of Plan 04).
  win.CHANGELOG_CONTENT_EN = enFixture();
  if (opts.he) win.CHANGELOG_CONTENT_HE = opts.he;

  // App stub: t() returns the key (chrome labels not under test here), and
  // getLanguage() drives the locale-merge path.
  var lang = opts.lang || 'en';
  win.App = createAppStub({ getLanguage: function () { return lang; } });

  // Eval the REAL renderer (self-boots against App.initCommon; we also drive
  // render() explicitly for a deterministic post-render DOM).
  win.eval(readAsset(CHANGELOG_JS));
  assert.ok(win.Changelog && typeof win.Changelog.render === 'function',
    'window.Changelog.render seam must exist (mirrors window.Help)');
  win.Changelog.render();

  return { win: win, doc: win.document };
}

function entryCards(doc) {
  return Array.prototype.slice.call(
    doc.querySelectorAll('#changelogEntries .changelog-entry'));
}
function cardById(doc, anchor) { return doc.getElementById(anchor); }

// ── T-42-V7 (1): reverse-chronological order ──────────────────────────────────
(function testReverseChron() {
  var env = buildEnv();
  var ids = entryCards(env.doc).map(function (c) { return c.id; });
  ok('entries render reverse-chronological (v1-3, v1-2, v1-0)',
    ids.length === 3 && ids[0] === 'v1-3' && ids[1] === 'v1-2' && ids[2] === 'v1-0');
})();

// ── T-42-V7 (2): empty/absent category omitted ───────────────────────────────
(function testEmptyCategoryOmitted() {
  var env = buildEnv();
  var v13 = cardById(env.doc, 'v1-3');
  var v12 = cardById(env.doc, 'v1-2');
  assert.ok(v13 && v12, 'precondition: v1-3 and v1-2 cards exist');

  ok('v1-3 renders a "new" category block',
    v13.querySelector('.changelog-cat[data-cat="new"]') !== null);
  ok('v1-3 renders an "improved" category block',
    v13.querySelector('.changelog-cat[data-cat="improved"]') !== null);
  ok('v1-3 renders NO "fixed" block (empty category omitted, D-11)',
    v13.querySelector('.changelog-cat[data-cat="fixed"]') === null);

  ok('v1-2 renders all three category blocks (new+improved+fixed)',
    v12.querySelector('.changelog-cat[data-cat="new"]') !== null &&
    v12.querySelector('.changelog-cat[data-cat="improved"]') !== null &&
    v12.querySelector('.changelog-cat[data-cat="fixed"]') !== null);
})();

// ── T-42-V7 (3): v1.0 origin renders as a one-line marker ─────────────────────
(function testOriginOneLine() {
  var env = buildEnv();
  var v10 = cardById(env.doc, 'v1-0');
  assert.ok(v10, 'precondition: v1-0 card exists');
  ok('v1-0 origin entry has ZERO category blocks (one-line marker, D-01)',
    v10.querySelectorAll('.changelog-cat').length === 0);
  ok('v1-0 origin entry is flagged with .changelog-entry--origin',
    v10.classList.contains('changelog-entry--origin'));
  ok('v1-0 origin entry still shows its lede',
    v10.textContent.indexOf('EN-LEDE-V10') !== -1);
})();

// ── T-42-V7 (4): stable kebab id === anchor ───────────────────────────────────
(function testKebabAnchors() {
  var env = buildEnv();
  var expected = enFixture().map(function (e) { return e.anchor; });
  var allMatch = expected.every(function (anchor) {
    var card = cardById(env.doc, anchor);
    return card && card.classList.contains('changelog-entry');
  });
  ok('every version card carries a stable kebab id === its anchor', allMatch);
})();

// ── T-42-V8 (A): missing locale array → EN entries render ─────────────────────
(function testFallbackWholeLocaleAbsent() {
  var env = buildEnv({ lang: 'he' }); // no CHANGELOG_CONTENT_HE seeded
  var cards = entryCards(env.doc);
  ok('HE absent → full EN history renders (3 cards)', cards.length === 3);
  var v13 = cardById(env.doc, 'v1-3');
  ok('HE absent → v1-3 shows the EN lede (fallback to EN corpus)',
    v13 && v13.textContent.indexOf('EN-LEDE-V13') !== -1);
})();

// ── T-42-V8 (B): partial locale → per-entry EN fallback, history complete ─────
(function testFallbackPerEntry() {
  var env = buildEnv({ lang: 'he', he: hePartialFixture() });
  var cards = entryCards(env.doc);
  ok('partial HE → history still complete (3 cards, v1-2 not dropped)',
    cards.length === 3 && cardById(env.doc, 'v1-2') !== null);

  var v13 = cardById(env.doc, 'v1-3');
  ok('provided HE entry renders the HE lede (v1-3)',
    v13 && v13.textContent.indexOf('HE-LEDE-V13') !== -1 &&
    v13.textContent.indexOf('EN-LEDE-V13') === -1);

  var v12 = cardById(env.doc, 'v1-2');
  ok('missing HE entry falls back to its EN counterpart (v1-2 shows EN lede)',
    v12 && v12.textContent.indexOf('EN-LEDE-V12') !== -1);
})();

// ── vacuous-green guard ───────────────────────────────────────────────────────
// 1 + 4 + 3 + 1 + 2 + 3 = 14 assertions above; this guard is the 15th. ok()
// increments CASES on entry, so at the moment this condition is evaluated CASES
// still reflects only the 14 preceding assertions (this guard's own increment
// has not landed yet) — hence the -1.
var EXPECTED_CASES = 15;
ok('all ' + EXPECTED_CASES + ' assertions executed (no silent skip)', CASES === EXPECTED_CASES - 1);

console.log('\n' + PASS + '/' + CASES + ' checks passed');
if (process.exitCode === 1) {
  console.error('42-changelog-render: FAILED');
} else {
  console.log('42-changelog-render: PASSED');
}
