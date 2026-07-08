/**
 * Rot guard — the 10 replayable-guided-tour anchors (Phase 41, TOUR-02/TOUR-03)
 * must stay bound to always-present chrome.
 *
 * The tour engine (Plan 03 STEPS[] array) binds each step to a
 * `data-tour="…"` selector — never a #id, text string, or a data row (D-02).
 * These attributes are the locale-independent, RTL-stable, refactor-safe
 * contract the engine queries. If a page refactor silently drops an anchor,
 * a brand-new empty app would degrade the tour to fallback modals instead of
 * spotlights (D-02 says a fresh app MUST show spotlights). This guard turns
 * that silent degradation into a red suite.
 *
 * The 10-anchor contract (value → source file), matching <artifacts_produced>:
 *   steps 1-3  → index.html        (overview, add-client, add-session)
 *   steps 4-6  → add-session.html  (session-setup, session-heart, session-save)
 *   step  7    → sessions.html     (sessions)
 *   step  8    → reporting.html    (reporting)
 *   steps 9-10 → assets/app.js     (backup, help — chrome created in JS via
 *                                   setAttribute, not page HTML)
 *
 * The match regex tolerates BOTH anchor-binding forms so a page attribute and
 * a JS setAttribute call satisfy the same contract row:
 *   - HTML attribute:  data-tour="value"
 *   - JS setAttribute: setAttribute('data-tour', 'value')
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

// The 10-anchor contract table. Each `value` is the exact token the engine
// STEPS[] array queries; `sourceFile` is where the anchor must be bound.
var ANCHORS = [
  { value: 'overview',      sourceFile: 'index.html' },
  { value: 'add-client',    sourceFile: 'index.html' },
  { value: 'add-session',   sourceFile: 'index.html' },
  { value: 'session-setup', sourceFile: 'add-session.html' },
  { value: 'session-heart', sourceFile: 'add-session.html' },
  { value: 'session-save',  sourceFile: 'add-session.html' },
  { value: 'sessions',      sourceFile: 'sessions.html' },
  { value: 'reporting',     sourceFile: 'reporting.html' },
  { value: 'backup',        sourceFile: 'assets/app.js' },
  { value: 'help',          sourceFile: 'assets/app.js' }
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
  // before the value literal.
  var re = new RegExp('data-tour[\'"=\\s,)]+' + esc(a.value) + '\\b');
  check(
    'anchor data-tour="' + a.value + '" is bound in ' + a.sourceFile,
    re.test(src)
  );
});

console.log('\n' + (failed === 0 ? 'ALL PASS' : (failed + ' FAILED')));
process.exit(failed === 0 ? 0 : 1);
