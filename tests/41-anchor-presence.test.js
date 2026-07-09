/**
 * Rot guard — the 12 replayable-guided-tour anchors (Phase 41, TOUR-02/TOUR-03)
 * must stay bound to always-present chrome or the settings panels the engine
 * activates before measuring.
 *
 * The tour engine (Plan 41-10 STEPS[] array) binds each step to a
 * `data-tour="…"` selector — never a #id, text string, or a data row (D-02).
 * These attributes are the locale-independent, RTL-stable, refactor-safe
 * contract the engine queries. If a page refactor silently drops an anchor,
 * a brand-new empty app would degrade the tour to fallback modals instead of
 * spotlights (D-02 says a fresh app MUST show spotlights). This guard turns
 * that silent degradation into a red suite.
 *
 * The 12-anchor v3 contract (value → source file), matching the settings-first
 * storyline (41-STORYLINE.md v3) and <artifacts_produced>:
 *   step  1    → index.html        (overview — greeting card)
 *   step  2    → assets/app.js     (settings — header gear, setAttribute)
 *   steps 3-5  → settings.html     (personalize, fields, snippets — tab panels;
 *                                   the engine activates Fields/Snippets before
 *                                   measuring)
 *   step  6    → assets/app.js     (nav — whole .app-nav menu in renderNav)
 *   steps 7-9  → add-session.html  (session-setup, session-heart, session-save)
 *   steps 10-12 → assets/app.js    (nav-sessions, backup, help — chrome created
 *                                   in JS via renderNav template / setAttribute)
 *
 * There is no home begin anchor and no Reporting nav anchor in v3 (the home
 * begin beat is replaced by the whole-menu step 6; Reporting is named in the
 * finish copy, not visited).
 *
 * The match regex tolerates BOTH anchor-binding forms so a page attribute and
 * a JS setAttribute call satisfy the same contract row:
 *   - HTML attribute:  data-tour="value"
 *   - JS setAttribute: setAttribute('data-tour', 'value')
 *
 * The value-boundary is hyphen-safe: `nav` must NOT be satisfied by
 * `data-tour="nav-sessions"`, so the trailing boundary excludes word chars AND
 * a hyphen ((?![\w-])) rather than a bare \b.
 *
 * NOTE: this is a SHAPE guard (fs source-scan), not a behavior test. Real
 * spotlight rendering + engine binding is verified in later plans / phase UAT.
 *
 * Run: node tests/41-anchor-presence.test.js
 * Exits 0 on full pass, 1 on any missing anchor.
 */

'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');

var failed = 0;
function check(name, cond) {
  if (cond) { console.log('[PASS] ' + name); }
  else { failed++; console.error('[FAIL] ' + name); }
}

// The 12-anchor v3 contract table, in storyline step order. Each `value` is the
// exact token the engine STEPS[] array queries; `sourceFile` is where the
// anchor must be bound.
var ANCHORS = [
  { value: 'overview',      sourceFile: 'index.html' },      // step 1  — greeting card
  { value: 'settings',      sourceFile: 'assets/app.js' },   // step 2  — header gear
  { value: 'personalize',   sourceFile: 'settings.html' },   // step 3  — Personalization panel
  { value: 'fields',        sourceFile: 'settings.html' },   // step 4  — Fields panel
  { value: 'snippets',      sourceFile: 'settings.html' },   // step 5  — Snippets panel
  { value: 'nav',           sourceFile: 'assets/app.js' },   // step 6  — whole .app-nav menu
  { value: 'session-setup', sourceFile: 'add-session.html' },// step 7  — setup fields
  { value: 'session-heart', sourceFile: 'add-session.html' },// step 8  — emotions accordion
  { value: 'session-save',  sourceFile: 'add-session.html' },// step 9  — save button
  { value: 'nav-sessions',  sourceFile: 'assets/app.js' },   // step 10 — Sessions nav tab
  { value: 'backup',        sourceFile: 'assets/app.js' },   // step 11 — cloud button
  { value: 'help',          sourceFile: 'assets/app.js' }    // step 12 — "?" button
];

// Cache each source file once.
var sources = {};
function readSource(rel) {
  if (!(rel in sources)) {
    sources[rel] = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  }
  return sources[rel];
}

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

ANCHORS.forEach(function (a) {
  var src = readSource(a.sourceFile);
  // Accept both the HTML attribute form (data-tour="value") and the JS
  // setAttribute form (setAttribute('data-tour', 'value')): after the
  // `data-tour` token, allow any run of ='", whitespace, comma, or paren
  // before the value literal. The trailing boundary is hyphen-safe — it
  // excludes a following word char OR hyphen so the `nav` row cannot be
  // satisfied by `data-tour="nav-sessions"`.
  var re = new RegExp('data-tour[\'"=\\s,)]+' + esc(a.value) + '(?![\\w-])');
  check(
    'anchor data-tour="' + a.value + '" is bound in ' + a.sourceFile,
    re.test(src)
  );
});

console.log('\n' + (failed === 0 ? 'ALL PASS' : (failed + ' FAILED')));
process.exit(failed === 0 ? 0 : 1);
