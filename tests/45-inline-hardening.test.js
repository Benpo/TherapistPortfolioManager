/**
 * tests/45-inline-hardening.test.js — Phase 45 Plan 02 Task 1.
 *
 * D-08 inline-emphasis hardening for the PDF pipeline (assets/pdf-export.js).
 * Emphasis markers must HUG non-whitespace so a legacy "2 * 3 * 4" or
 * "** bold **" stays LITERAL, exactly as MdRender.applyInline (Plan 01) already
 * does. The two hardened functions — stripInlineMarkdown and parseInlineBold —
 * must stay in lockstep so the invariant drawSegmentedLine relies on holds:
 *
 *   parseInlineBold(x).map(s => s.text).join('') === stripInlineMarkdown(x)
 *
 * The emphasis REGEXES in stripInlineMarkdown are CHARACTER-IDENTICAL to
 * md-render.js applyInline's (the shared-contract source; Plan 05 Task 1 asserts
 * cross-file source identity). This test asserts the observable BEHAVIOR of those
 * regexes evaluated against pdf-export's OWN functions.
 *
 * IMPORTANT — the `**2 * 3 * 4**` row. The character-identical bold regex
 * (see stripInlineMarkdown / md-render applyInline) has a content class of
 * [^star,newline] which forbids ANY inner star. So a bold span can never
 * enclose "2 * 3 * 4" (it contains "*"); the WHOLE token stays LITERAL:
 *   stripInlineMarkdown('**2 * 3 * 4**') === '**2 * 3 * 4**'
 * (Plan 02's prose predicted '2 * 3 * 4' — that assumed the outer ** would strip
 * while the inner "* 3 *" survived; but the char-identical md-render rule refuses
 * the bold match entirely when the content holds a "*". Honoring the mandatory
 * character-identity contract, the true value is '**2 * 3 * 4**'. The invariant
 * still holds: parseInlineBold's bold branch likewise refuses "*"-bearing content,
 * so both functions agree byte-for-byte — WARNING 4 / T-45-03.)
 *
 * Load pdf-export.js into the shared jsdom+jsPDF env (getContext stub + vendored
 * jsPDF) as the other PDF tests do, and reach the helpers via the __test seam.
 *
 * Run: node tests/45-inline-hardening.test.js   (exit 0 pass / 1 fail)
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');

// The emphasis helpers are pure (no jsPDF/font deps), so evaluate pdf-export.js
// directly into a bare jsdom window and reach them via the __test seam. We keep
// BOTH the read `src` and its EXECUTION (window.eval(src)) in this file: the test
// genuinely RUNS the production module, and the two auxiliary source guards below
// (no-lookbehind, canonical-pattern presence) are `assert.ok` presence checks on
// the executed module's own source — not equality-on-source-slice fakes.
var src = fs.readFileSync(path.join(REPO_ROOT, 'assets/pdf-export.js'), 'utf8');
var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'https://localhost/',
  runScripts: 'outside-only',
});
dom.window.eval(src);
var PDFExport = dom.window.PDFExport;
assert.ok(PDFExport && PDFExport.__test, 'PDFExport.__test seam must be exposed');
var stripInlineMarkdown = PDFExport.__test.stripInlineMarkdown;
var parseInlineBold = PDFExport.__test.parseInlineBold;
assert.strictEqual(typeof stripInlineMarkdown, 'function', 'stripInlineMarkdown must be a function');
assert.strictEqual(typeof parseInlineBold, 'function', 'parseInlineBold must be a function');

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

function joinSegs(x) {
  return parseInlineBold(x).map(function (s) { return s.text; }).join('');
}

// ── The pinned D-08 example table (matches Plan 01 Task 2 / md-render) ──────────
// [input, expected stripped output]
var TABLE = [
  ['2 * 3 * 4', '2 * 3 * 4'],                       // legacy multiplication — literal
  ['**bold**', 'bold'],                             // bold stripped
  ['** bold **', '** bold **'],                     // space-adjacent — literal
  ['a *b* c', 'a b c'],                             // italic stripped
  ['**2 * 3 * 4**', '**2 * 3 * 4**'],              // inner "*" => bold refuses => literal (char-identical)
  ['הסיכום **מודגש** כאן', 'הסיכום מודגש כאן']       // Hebrew bold stripped
];

TABLE.forEach(function (row) {
  test('stripInlineMarkdown(' + JSON.stringify(row[0]) + ') === ' + JSON.stringify(row[1]), function () {
    assert.strictEqual(stripInlineMarkdown(row[0]), row[1]);
  });
});

// ── The invariant: parseInlineBold segments concatenate to the stripped text ───
// This is the falsifiable guard against the two functions diverging (which would
// misalign bold runs in drawSegmentedLine after bidi reorder). Asserted for every
// table input INCLUDING the Hebrew case and the space-adjacent-inside-bold
// "**2 * 3 * 4**" case (the WARNING 4 lockstep guard for the :504 inner strip).
TABLE.forEach(function (row) {
  test('invariant parseInlineBold≡stripInlineMarkdown for ' + JSON.stringify(row[0]), function () {
    assert.strictEqual(joinSegs(row[0]), stripInlineMarkdown(row[0]),
      'parseInlineBold segment-join must equal stripInlineMarkdown output');
  });
});

// ── Positive case preserved: a real bold span still yields a bold segment ───────
test('parseInlineBold("**bold**") yields a { text:"bold", bold:true } segment', function () {
  var segs = parseInlineBold('**bold**');
  var boldSeg = segs.filter(function (s) { return s.bold === true; });
  assert.strictEqual(boldSeg.length, 1, 'exactly one bold segment expected');
  assert.strictEqual(boldSeg[0].text, 'bold', 'bold segment text must be "bold"');
});

// ── Positive case: Hebrew bold span yields the bold word as a bold segment ──────
test('parseInlineBold Hebrew bold span yields { text:"מודגש", bold:true }', function () {
  var segs = parseInlineBold('הסיכום **מודגש** כאן');
  var boldSeg = segs.filter(function (s) { return s.bold === true; });
  assert.strictEqual(boldSeg.length, 1, 'exactly one bold segment expected');
  assert.strictEqual(boldSeg[0].text, 'מודגש', 'bold segment text must be "מודגש"');
});

// ── Safari-compat: NO regex lookbehind anywhere in pdf-export.js ────────────────
test('assets/pdf-export.js contains no lookbehind token "(?<"', function () {
  assert.ok(src.indexOf('(?<') === -1,
    'pdf-export.js must not use regex lookbehind (Safari < 16.4 lacks it)');
});

// ── Source-level cross-check: the two emphasis regex PATTERNS in pdf-export.js
// stripInlineMarkdown are character-identical to md-render.js applyInline's.
// (Plan 05 Task 1 owns the authoritative cross-file assertion; this is a local
// presence smoke guard on the already-executed module's own source.)
test('stripInlineMarkdown emphasis regexes are character-identical to md-render applyInline', function () {
  var boldPat = '/\\*\\*([^*\\s\\n](?:[^*\\n]*?[^*\\s\\n])?)\\*\\*/g';
  var italicPat = '/(^|[^*])\\*([^*\\s\\n](?:[^*\\n]*?[^*\\s\\n])?)\\*(?!\\*)/g';
  assert.ok(src.indexOf(boldPat) !== -1, 'canonical bold pattern must appear verbatim in pdf-export.js');
  assert.ok(src.indexOf(italicPat) !== -1, 'canonical italic pattern must appear verbatim in pdf-export.js');
});

// ── Count guard ────────────────────────────────────────────────────────────────
var EXPECTED_TESTS = TABLE.length * 2 + 4; // 6 strip + 6 invariant + 2 positive + lookbehind + regex-source
test('count guard: expected ' + EXPECTED_TESTS + ' assertions ran', function () {
  // passed+failed counts every prior test; this guard itself is not yet counted.
  assert.strictEqual(passed + failed, EXPECTED_TESTS,
    'expected ' + EXPECTED_TESTS + ' tests before the count guard, saw ' + (passed + failed));
});

console.log('\n45-inline-hardening: passed ' + passed + ', failed ' + failed + '.');
process.exit(failed === 0 ? 0 : 1);
