/**
 * Phase 34 (code-review CR-01) — an UNMEASURED severity scale must render the
 * `–` glyph in the PDF, never the numeral `0`.
 *
 * --- The bug this guards (CR-01, BLOCKER) ---
 *   drawSeverityBlock's row loop computed `hasBefore = isFinite(Number(issue.before))`.
 *   An unmeasured scale is `null` (App.getSeverityValue returns null for an unset
 *   scale; getIssuesPayload passes it through). `Number(null) === 0` and
 *   `isFinite(0) === true`, so `hasBefore`/`hasAfter` were ALWAYS true — the `'–'`
 *   not-measured branch was dead on the export path and an unmeasured value
 *   rendered as **`0`**, which on a 0–10 clinical scale reads as "fully resolved"
 *   in a client-facing therapy PDF. The clipboard/text path (export-modal.js)
 *   already treated null/undefined as not-measured, so the PDF DIVERGED from the
 *   copied text. The fix mirrors the clipboard path:
 *     hasBefore = issue.before !== null && issue.before !== undefined && isFinite(...)
 *
 * --- What this test does ---
 *   Renders two single-issue PDFs that are byte-identical except for the severity
 *   values, walks each page-1 content stream, and inspects the STANDALONE numeral
 *   Tj run drawn per bar:
 *     • before:null / after:null  → each bar's numeral is the en-dash glyph (017F)
 *     • before:0    / after:0     → each bar's numeral is the digit-0 glyph (0138)
 *
 *   Heebo glyph GIDs (regular weight — the severity numeral is drawn in the
 *   REGULAR weight; see the comment in pdf-export.js drawBar): the digit '0' is
 *   GID 0138 (consistent with pdf-digit-order.test.js) and the '–' en-dash is
 *   GID 017F. Both were MEASURED 2026-06-30 by rendering before:null vs before:0
 *   and diffing the per-bar single-glyph numeral run. If Heebo is swapped,
 *   REMEASURE by re-running that diff.
 *
 *   Each per-bar numeral is emitted as its own Tj run containing exactly ONE
 *   glyph, so we isolate the severity numerals by counting SINGLE-GLYPH runs
 *   equal to the target GID — multi-glyph runs (the header date "...2026", etc.)
 *   never match, so unrelated page digits don't pollute the count.
 *
 * --- Assertions ---
 *   1. Unmeasured (null): exactly two single-glyph en-dash (017F) numeral runs,
 *      and ZERO single-glyph digit-0 (0138) numeral runs. RED if CR-01 regresses
 *      (a null value would emit a `0` numeral run instead of `–`).
 *   2. Measured zero (0): exactly two single-glyph digit-0 (0138) numeral runs,
 *      and ZERO single-glyph en-dash (017F) numeral runs. RED if a real 0 value
 *      is mis-suppressed to `–` (over-correction of the fix).
 *
 * --- Falsifiability ---
 *   • Drop the null/undefined guard (CR-01 regression) → null renders `0` →
 *     fails (1).
 *   • Treat 0 as not-measured (over-correction) → 0 renders `–` → fails (2).
 *
 * --- Stub <script> per dep ---
 *   jsdom never fires load/error for an appended <script src>, so pdf-export.js's
 *   loadScriptOnce would hang; inject src-matching stubs (the real lib code is
 *   already eval'd by buildJsdomEnv). Mirrors 34-severity-bars / 34-rtl-newblocks.
 *
 *   node tests/34-severity-unmeasured.test.js   -- exit 0 = pass, exit 1 = fail
 */

'use strict';

var assert = require('assert');
var buildJsdomEnv = require('./_helpers/jsdom-pdf-env').buildJsdomEnv;

var DASH_GID = '017F'; // Heebo en-dash '–', measured 2026-06-30
var ZERO_GID = '0138'; // Heebo digit '0', consistent with pdf-digit-order

var DEP_STUBS = [
  './assets/jspdf.min.js',
  './assets/bidi.min.js',
  './assets/fonts/heebo-base64.js',
  './assets/fonts/heebo-bold-base64.js',
];
function injectDepStubs(win) {
  DEP_STUBS.forEach(function (src) {
    var s = win.document.createElement('script');
    s.src = src;
    win.document.body.appendChild(s);
  });
}

// First (page-1) content stream from a raw PDF buffer.
function firstContentStream(buf) {
  var s = buf.toString('latin1');
  var i = s.indexOf('stream');
  if (i < 0) return '';
  var j = s.indexOf('endstream', i);
  if (j < 0) return '';
  var a = i + 6;
  if (s[a] === '\r') a++;
  if (s[a] === '\n') a++;
  var b = j;
  if (s[b - 1] === '\n') b--;
  if (s[b - 1] === '\r') b--;
  return s.slice(a, b);
}

// Every Tj/TJ hex glyph run in the content stream, upper-cased.
function tjHexRuns(content) {
  var out = [];
  var m;
  var tjRe = /<([0-9A-Fa-f]+)>\s*Tj/g;
  while ((m = tjRe.exec(content)) !== null) out.push(m[1].toUpperCase());
  var bigRe = /\[([^\]]*)\]\s*TJ/g;
  while ((m = bigRe.exec(content)) !== null) {
    var parts = m[1].match(/<([0-9A-Fa-f]+)>/g) || [];
    for (var p = 0; p < parts.length; p++) out.push(parts[p].slice(1, -1).toUpperCase());
  }
  return out;
}

// Count Tj runs that consist of EXACTLY ONE glyph equal to `gid` — i.e. the
// per-bar severity numeral. Multi-glyph runs (dates, names) never match.
function countSingleGlyphRuns(runs, gid) {
  var n = 0;
  for (var i = 0; i < runs.length; i++) {
    if (runs[i].length === 4 && runs[i] === gid) n++;
  }
  return n;
}

async function renderIssue(issue) {
  var win = buildJsdomEnv().win;
  injectDepStubs(win);
  var data = {
    clientName: 'Dana Levi',
    sessionDate: '2026-03-24',
    sessionType: 'Clinic',
    sessionNumber: 1,
    issues: [issue],
    markdown: 'Session body text',
  };
  var blob = await win.PDFExport.buildSessionPDF(data, { uiLang: 'en' });
  var buf = Buffer.from(await blob.arrayBuffer());
  win.close && win.close();
  return tjHexRuns(firstContentStream(buf));
}

async function main() {
  var nullRuns = await renderIssue({ name: 'Anger', before: null, after: null });
  var zeroRuns = await renderIssue({ name: 'Anger', before: 0, after: 0 });

  var failed = 0;

  // --- 1. Unmeasured (null) renders '–', not '0' ---
  try {
    var nullDash = countSingleGlyphRuns(nullRuns, DASH_GID);
    var nullZero = countSingleGlyphRuns(nullRuns, ZERO_GID);
    assert.strictEqual(nullDash, 2,
      'Expected 2 en-dash (' + DASH_GID + ') numeral runs for before:null/after:null ' +
      '(one per bar) but found ' + nullDash + '. An unmeasured scale must render `–`.');
    assert.strictEqual(nullZero, 0,
      'Found ' + nullZero + ' digit-0 (' + ZERO_GID + ') numeral run(s) for ' +
      'before:null/after:null — CR-01 regression: an UNMEASURED scale is rendering ' +
      'as `0`, which reads as "fully resolved" on a 0–10 clinical scale. The PDF ' +
      'path must treat null/undefined as not-measured (mirror export-modal.js).');
    console.log('[PASS] 1: unmeasured (null) renders `–` (2×), not `0`');
  } catch (err) {
    console.error('[FAIL] 1 (unmeasured renders dash):', err.message);
    failed++;
  }

  // --- 2. Measured zero (0) still renders '0' ---
  try {
    var zeroZero = countSingleGlyphRuns(zeroRuns, ZERO_GID);
    var zeroDash = countSingleGlyphRuns(zeroRuns, DASH_GID);
    assert.strictEqual(zeroZero, 2,
      'Expected 2 digit-0 (' + ZERO_GID + ') numeral runs for before:0/after:0 ' +
      '(one per bar) but found ' + zeroZero + '. A real measured 0 must still render `0`.');
    assert.strictEqual(zeroDash, 0,
      'Found ' + zeroDash + ' en-dash (' + DASH_GID + ') numeral run(s) for before:0/after:0 ' +
      '— over-correction: a measured 0 is being suppressed to `–`. Only null/undefined ' +
      'is "not measured"; 0 is a real value.');
    console.log('[PASS] 2: measured zero (0) renders `0` (2×), not `–`');
  } catch (err) {
    console.error('[FAIL] 2 (measured zero renders zero):', err.message);
    failed++;
  }

  console.log('Passed ' + (2 - failed) + '/2, Failed ' + failed + '/2.');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err);
  process.exit(1);
});
