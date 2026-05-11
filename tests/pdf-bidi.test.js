/**
 * Phase 23 (Plan 23-04) — bidi-js correctness test corpus.
 *
 * Asserts that the shapeForJsPdf helper (defined inline below, mirroring the
 * canonical implementation in assets/pdf-export.js as added by Plan 23-02)
 * produces the correct visual-order output for all 12 test vectors from
 * .planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-RESEARCH.md
 * section "Test Vector Corpus".
 *
 * Runs in plain Node — no test framework. Self-contained: does NOT require
 * pdf-export.js or jsPDF.
 *
 * Run with: node tests/pdf-bidi.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * IMPORTANT (G2 / test vector #11): shapeForJsPdf MUST use text.split('')
 * to match bidi-js's UTF-16 code-unit indexing — do NOT use the spread
 * operator or the codepoint-iterating array conversion (those split by
 * codepoint, not code unit). Test vector #11 (Hebrew + emoji surrogate pair)
 * catches a buggy implementation that splits by codepoint.
 *
 * Maintenance contract: if the canonical shapeForJsPdf in pdf-export.js
 * is ever modified, this test file's inline copy MUST be updated to match.
 *
 * --- Loader pattern (G14, see 23-02 SUMMARY) ---
 * assets/bidi.min.js is a UMD bundle whose detection branch reads, in order:
 *   1. typeof exports === 'object' && typeof module !== 'undefined'  -> module.exports = factory
 *   2. typeof define === 'function' && define.amd                    -> AMD
 *   3. else                                                          -> globalThis/window/self.bidi_js
 *
 * In plain CommonJS Node, branch (1) fires and `require('../assets/bidi.min.js')`
 * returns the factory function directly (it never reaches the global-attach
 * branch). To exercise the same code path that pdf-export.js uses in the
 * browser (where `window.bidi_js` is set by branch 3), we evaluate bidi.min.js
 * inside a Node `vm` context with `window` AND `self` shims and zero-out
 * `module`/`exports` so branches (1) and (2) miss and branch (3) lands.
 * Both `window` and `self` shims are required (G14) because the UMD detection
 * uses `globalThis ?? window ?? self`, and on the second invocation a missing
 * `self` caused an undefined factory in 23-02's executor work.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

// --- Load bidi-js into a vm sandbox that exposes a `window.bidi_js` global ---
var bidiSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'bidi.min.js'), 'utf8');
var sandbox = {
  window: {},
  self: {},
  // Force the UMD detection past branches (1) + (2) so the global-attach branch (3) fires:
  module: undefined,
  exports: undefined,
  define: undefined,
};
sandbox.self.self = sandbox.self;       // self.self -> self (browser-shaped)
sandbox.window.window = sandbox.window; // window.window -> window
vm.createContext(sandbox);
vm.runInContext(bidiSrc, sandbox);

// One of window.bidi_js / self.bidi_js / sandbox.bidi_js will be the factory:
var bidiFactory = sandbox.window.bidi_js || sandbox.self.bidi_js || sandbox.bidi_js;
if (typeof bidiFactory !== 'function') {
  console.error('FATAL: bidi-js factory not exposed on window/self/global after vm eval.');
  process.exit(1);
}
var _bidi = bidiFactory();

// ---------------------------------------------------------------------------
// firstStrongDir + shapeForJsPdf -- VERBATIM copies of assets/pdf-export.js
// L214-L252 (Plan 23-02 canonical implementations).
//
// MAINTENANCE CONTRACT: if the canonical helpers in pdf-export.js change,
// these inline copies MUST be updated to match.
// ---------------------------------------------------------------------------

function firstStrongDir(text) {
  if (!text) return 'ltr';
  for (var i = 0; i < text.length; i++) {
    var t = _bidi.getBidiCharTypeName(text[i]);
    if (t === 'L') return 'ltr';
    if (t === 'R' || t === 'AL') return 'rtl';
  }
  return 'ltr';
}

function shapeForJsPdf(text) {
  if (!text) return '';
  var dir = firstStrongDir(text);
  var levels = _bidi.getEmbeddingLevels(text, dir);
  var flips = _bidi.getReorderSegments(text, levels);
  var mirrorMap = _bidi.getMirroredCharactersMap(text, levels);
  var chars = text.split(''); // UTF-16 code units; matches bidi-js indices (G2)
  mirrorMap.forEach(function (mirroredChar, idx) {
    chars[idx] = mirroredChar;
  });
  for (var fi = 0; fi < flips.length; fi++) {
    var start = flips[fi][0];
    var end = flips[fi][1];
    var slice = chars.slice(start, end + 1).reverse();
    for (var i = start; i <= end; i++) chars[i] = slice[i - start];
  }
  return chars.join('');
}

// ---------------------------------------------------------------------------
// 12 test vectors (verbatim from 23-RESEARCH.md "Test Vector Corpus")
// ---------------------------------------------------------------------------

var VECTORS = [
  { id:  1, label: 'Pure Hebrew',                              input: 'שלום עולם',                              expected: 'םלוע םולש' },
  { id:  2, label: 'Hebrew + LTR Latin run',                   input: 'אני אוהב PDF',                            expected: 'PDF בהוא ינא' },
  { id:  3, label: 'Hebrew + ISO date',                        input: 'המפגש ביום 2026-05-11 היה טוב',          expected: 'בוט היה 2026-05-11 םויב שגפמה' },
  { id:  4, label: 'Hebrew + mirrored brackets (G3)',          input: 'הפגישה (חשובה) הסתיימה',                 expected: 'המייתסה )הבושח( השיגפה' },
  { id:  5, label: 'Hebrew + URL',                             input: 'בקר ב https://example.com היום',         expected: 'םויה https://example.com ב רקב' },
  { id:  6, label: 'Hebrew with leading "- " bullet',          input: '- ראשון: מצב רוח טוב',                   expected: 'בוט חור בצמ :ןושאר -' },
  { id:  7, label: 'Heading with "#"',                         input: '# סיכום המפגש',                          expected: 'שגפמה םוכיס #' },
  { id:  8, label: 'Empty input',                              input: '',                                       expected: '' },
  { id:  9, label: 'Pure English smoke',                       input: 'Session summary',                        expected: 'Session summary' },
  { id: 10, label: 'Hebrew + digits + colon',                  input: 'גיל: 42 שנים',                           expected: 'םינש 42 :ליג' },
  { id: 11, label: 'Hebrew + emoji surrogate pair (G2)',       input: 'מצב רוח: 🌱 פורח',                       expected: 'חרופ 🌱 :חור בצמ' },
  { id: 12, label: 'Hebrew + square brackets',                 input: 'רישום [important] כאן',                  expected: 'ןאכ ]important[ םושיר' },
];

// ---------------------------------------------------------------------------
// Diagnostic: human-readable codepoint sequence for any string
// ---------------------------------------------------------------------------
function toCodepoints(s) {
  return Array.from(s)
    .map(function (c) { return 'U+' + c.codePointAt(0).toString(16).padStart(4, '0').toUpperCase(); })
    .join(', ');
}

// ---------------------------------------------------------------------------
// Run vectors
// ---------------------------------------------------------------------------
var passed = 0;
var failed = 0;
var firstError = null;

for (var v = 0; v < VECTORS.length; v++) {
  var vec = VECTORS[v];
  var actual;
  try {
    actual = shapeForJsPdf(vec.input);
    assert.strictEqual(actual, vec.expected);
    console.log('[PASS] #' + vec.id + ': ' + vec.label);
    passed++;
  } catch (err) {
    failed++;
    console.error('[FAIL] #' + vec.id + ': ' + vec.label);
    console.error('  input    : ' + JSON.stringify(vec.input));
    console.error('  input cp : ' + toCodepoints(vec.input));
    console.error('  expected : ' + JSON.stringify(vec.expected));
    console.error('  exp cp   : ' + toCodepoints(vec.expected));
    console.error('  actual   : ' + JSON.stringify(actual));
    console.error('  act cp   : ' + (actual !== undefined ? toCodepoints(actual) : '(threw)'));
    if (!firstError) firstError = err;
  }
}

console.log('Passed ' + passed + '/' + VECTORS.length + ', Failed ' + failed + '/' + VECTORS.length + '.');

if (failed > 0) {
  // Surface the first AssertionError so CI/log scrapers see the canonical assert message:
  if (firstError) console.error('\nFirst failure detail:\n', firstError.message);
  process.exit(1);
}
process.exit(0);
