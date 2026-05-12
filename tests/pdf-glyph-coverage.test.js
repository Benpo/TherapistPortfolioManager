/**
 * Phase 23 (Plan 23-07) — glyph-emission floor regression for mixed-script lines.
 *
 * The Plan 23-04 Latin-only fixture harness (tests/pdf-latin-regression.test.js)
 * caught visual-output drift via SHA-256 comparison, but it did NOT catch the
 * Plan 23-07 hot-fix bug:
 *
 *   The two prior single-script Noto fonts (NotoSans = Latin only,
 *   NotoSansHebrew = Hebrew only) silently dropped every glyph they couldn't
 *   find when jsPDF set the active font. This meant that any line mixing
 *   Hebrew + Latin lost ~half its content because applyFontFor() picked
 *   ONE font per line, and that font was missing the other script's glyphs.
 *
 *   Pure-Hebrew lines and pure-Latin lines worked fine (no missing glyphs in
 *   the chosen font), which is why the 4 fixture .sha256 baselines passed
 *   even though mixed-script lines were broken in production.
 *
 * This test asserts a glyph-emission FLOOR for a paragraph that mixes Hebrew
 * + Latin in one line. If the future swaps in another single-script font, or
 * a font that's missing Hebrew or Latin glyphs, the assertion fires.
 *
 * --- What the test does ---
 *
 * 1. Build a PDF for a one-paragraph fixture whose body is:
 *      'דנה הזכירה את הספר "Atomic Habits" של ג\'יימס קליר'
 *    (mixes Hebrew prose with the Latin book title "Atomic Habits".)
 * 2. Walk the PDF page-1 content stream and collect every CID emitted via
 *    Tj or TJ operators. (jsPDF stores text as <hex> CID pairs; each glyph
 *    is 4 hex chars = 2 bytes.)
 * 3. Assert:
 *      a. Total glyph count >= LATIN_HEBREW_FLOOR  (currently 60)
 *      b. At least 8 of the 10 known Latin CIDs (the GIDs Heebo assigns to
 *         A, t, o, m, i, c, H, a, b, s) appear among the emitted CIDs.
 *         If the active font is missing Latin glyphs, this drops to 0.
 *      c. At least 4 of the 7 known Hebrew CIDs appear. If the active font
 *         is missing Hebrew glyphs, this drops to 0.
 *
 * The CID values were measured once at Plan 23-07 commit time by manually
 * rendering "Atomic Habits" + "שלום" in isolation and reading the GID
 * assignments out of the PDF content stream. They are stable for as long as
 * Heebo Regular v3.100 stays vendored. If Heebo is swapped for a different
 * version or a different font, REMEASURE the CIDs (run the printout helper
 * at the bottom of this file under MEASURE_MODE=1).
 *
 * --- Run modes ---
 *
 *   node tests/pdf-glyph-coverage.test.js                  -- check mode
 *   MEASURE_MODE=1 node tests/pdf-glyph-coverage.test.js   -- print measurements only
 *
 * --- JSDOM resolution path ---
 *
 * Same convention as tests/pdf-latin-regression.test.js: jsdom is resolved
 * from /tmp/node_modules/jsdom (overridable via JSDOM_PATH env var).
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var REPO_ROOT = path.resolve(__dirname, '..');
var MEASURE_MODE = process.env.MEASURE_MODE === '1';

// ---------------------------------------------------------------------------
// Pinned glyph CID expectations -- valid for Heebo Regular v3.100.
// ---------------------------------------------------------------------------
//
// CID = the GID jsPDF emits for each rendered char. Discovered by rendering
// "Atomic Habits" and "שלום" in isolation under Heebo and reading the
// resulting <hex> Tj sequence out of the PDF content stream.
//
// If you swap Heebo for another font (or another Heebo version), REMEASURE
// these by running this file with MEASURE_MODE=1.

// Latin chars in "Atomic Habits" -> Heebo GIDs (uppercase 4-hex):
//   A=0001  t=00C9  o=00B1  m=00AA  i=0097  c=007E
//   H=0024  a=0072  b=007D  s=00C2
// (space is 0164; intentionally excluded from the assertion because it can
// also appear in non-Latin contexts and would weaken the test.)
var LATIN_CID_EXPECTATIONS = ['0001', '00C9', '00B1', '00AA', '0097', '007E', '0024', '0072', '007D', '00C2'];

// Hebrew chars sampled from the body fixture -> Heebo GIDs:
//   ש=0121  ל=010A  ה=0107  נ=011D  ד=0103
// (chosen because they appear in the test paragraph "דנה הזכירה ...")
var HEBREW_CID_EXPECTATIONS = ['0121', '010A', '0107', '011D', '0103'];

// Floor on total glyph count for the test fixture's page-1 content stream.
// Measurement at vendoring time (Heebo Regular v3.100): 85 glyphs.
// Floor of 60 leaves headroom for layout adjustments (line-wrap point shifts,
// title-block size tweaks, etc.) without weakening the missing-glyph signal:
// even an entirely-empty body would emit fewer than 30 glyphs (just title +
// metadata), so 60 catches >50% glyph loss.
var LATIN_HEBREW_FLOOR = 60;

// Minimum number of Latin / Hebrew CID hits required.
// Out of 10 expected Latin chars, requiring 8 allows minor wrapping splits
// (e.g. "Atomic" wrapping such that 1-2 chars get layout-shifted off-page-1
// in some pathological future config) without weakening the test.
var LATIN_HITS_FLOOR = 8;
// Out of 5 expected Hebrew chars, require 4: same headroom logic.
var HEBREW_HITS_FLOOR = 4;

// ---------------------------------------------------------------------------
// Deterministic-PDF pin values (Mitigation B from Plan 23-04 harness)
// ---------------------------------------------------------------------------
var PINNED_DATE = "D:20260101000000+00'00'";
var PINNED_FILE_ID = '00000000000000000000000000000000';

// ---------------------------------------------------------------------------
// JSDOM availability + load
// ---------------------------------------------------------------------------
var JSDOM_PATH = process.env.JSDOM_PATH || '/tmp/node_modules/jsdom';
var JSDOM;
try {
  JSDOM = require(JSDOM_PATH).JSDOM;
} catch (err) {
  console.error('FATAL: could not load jsdom from ' + JSDOM_PATH);
  console.error('  Install with: mkdir -p /tmp && cd /tmp && npm install jsdom');
  console.error('  Or set JSDOM_PATH=/path/to/node_modules/jsdom and re-run.');
  console.error('  Underlying error: ' + err.message);
  process.exit(1);
}

function readAsset(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

// ---------------------------------------------------------------------------
// Build a JSDOM env wired exactly the same way as Plan 23-04's harness so we
// produce a deterministic PDF byte stream from buildSessionPDF().
// ---------------------------------------------------------------------------
function buildJsdomEnv() {
  var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'file://' + REPO_ROOT + '/test-harness.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  win.eval(readAsset('assets/jspdf.min.js'));
  win.eval(readAsset('assets/bidi.min.js'));
  win.eval(readAsset('assets/fonts/heebo-base64.js'));

  var OriginalJsPDF = win.jspdf.jsPDF;
  function WrappedJsPDF(args) {
    var doc = new OriginalJsPDF(args);
    doc.setCreationDate(PINNED_DATE);
    doc.setFileId(PINNED_FILE_ID);
    return doc;
  }
  WrappedJsPDF.prototype = OriginalJsPDF.prototype;
  Object.keys(OriginalJsPDF).forEach(function (k) { WrappedJsPDF[k] = OriginalJsPDF[k]; });
  win.jspdf.jsPDF = WrappedJsPDF;

  var preload = [
    './assets/jspdf.min.js',
    './assets/bidi.min.js',
    './assets/fonts/heebo-base64.js',
  ];
  preload.forEach(function (src) {
    var s = win.document.createElement('script');
    s.src = src;
    win.document.body.appendChild(s);
  });

  win.eval(readAsset('assets/pdf-export.js'));
  if (!win.PDFExport || typeof win.PDFExport.buildSessionPDF !== 'function') {
    throw new Error('pdf-export.js did not expose window.PDFExport.buildSessionPDF after eval');
  }
  return dom;
}

// ---------------------------------------------------------------------------
// Walk a raw PDF byte buffer and extract every CID emitted on the FIRST
// (page-1) content stream. jsPDF emits TJ-array form [(...)<hex><hex>] TJ
// for custom-font runs; some runs use plain <hex> Tj. Both are handled.
// ---------------------------------------------------------------------------
function extractCidsFromPdf(buf) {
  var s = buf.toString('latin1');
  var rawStreams = [];
  var idx = 0;
  while (true) {
    var i = s.indexOf('stream', idx);
    if (i < 0) break;
    var j = s.indexOf('endstream', i);
    if (j < 0) break;
    var startByte = i + 6;
    if (s[startByte] === '\r') startByte++;
    if (s[startByte] === '\n') startByte++;
    var endByte = j;
    if (s[endByte - 1] === '\n') endByte--;
    if (s[endByte - 1] === '\r') endByte--;
    rawStreams.push(s.slice(startByte, endByte));
    idx = j + 9;
  }
  if (rawStreams.length === 0) return [];

  // Page-1 content stream is the first stream in jsPDF's default output.
  var content = rawStreams[0];
  var cids = [];
  var tjRe = /\[([^\]]*)\]\s*TJ/g;
  var m;
  while ((m = tjRe.exec(content)) !== null) {
    var hexParts = m[1].match(/<([0-9A-Fa-f]+)>/g) || [];
    for (var hp = 0; hp < hexParts.length; hp++) {
      var hh = hexParts[hp].slice(1, -1);
      for (var ci = 0; ci < hh.length; ci += 4) {
        cids.push(hh.slice(ci, ci + 4).toUpperCase());
      }
    }
  }
  var tjsRe = /<([0-9A-Fa-f]+)>\s*Tj/g;
  while ((m = tjsRe.exec(content)) !== null) {
    for (var ci2 = 0; ci2 < m[1].length; ci2 += 4) {
      cids.push(m[1].slice(ci2, ci2 + 4).toUpperCase());
    }
  }
  return cids;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  var dom = buildJsdomEnv();
  var win = dom.window;

  // Single-paragraph mixed-script fixture. The Latin run "Atomic Habits"
  // sits inside Hebrew prose with the apostrophe and quotes intact -- this
  // is the exact pattern that broke under the prior single-script fonts
  // (the Hebrew context made applyFontFor pick NotoSansHebrew, which then
  // dropped every Latin glyph in the line).
  var fixture = {
    sessionData: {
      clientName: 'Test',
      sessionDate: '2026-05-12',
      sessionType: 'test',
      markdown: 'דנה הזכירה את הספר "Atomic Habits" של ג\'יימס קליר',
    },
    opts: { uiLang: 'he' },
  };

  var blob = await win.PDFExport.buildSessionPDF(fixture.sessionData, fixture.opts);
  var ab = await blob.arrayBuffer();
  var buf = Buffer.from(ab);
  dom.window.close();

  var cids = extractCidsFromPdf(buf);
  var totalGlyphs = cids.length;
  var distinctCids = {};
  cids.forEach(function (c) { distinctCids[c] = (distinctCids[c] || 0) + 1; });

  var latinHits = LATIN_CID_EXPECTATIONS.filter(function (c) { return cids.indexOf(c) >= 0; });
  var hebrewHits = HEBREW_CID_EXPECTATIONS.filter(function (c) { return cids.indexOf(c) >= 0; });

  if (MEASURE_MODE) {
    console.log('--- MEASURE_MODE ---');
    console.log('Total glyphs:', totalGlyphs);
    console.log('Distinct CIDs:', Object.keys(distinctCids).length);
    console.log('Latin CIDs found (' + latinHits.length + '/' + LATIN_CID_EXPECTATIONS.length + '):', latinHits.join(', '));
    console.log('Hebrew CIDs found (' + hebrewHits.length + '/' + HEBREW_CID_EXPECTATIONS.length + '):', hebrewHits.join(', '));
    console.log('First 20 CIDs:', cids.slice(0, 20).join(', '));
    process.exit(0);
  }

  var failed = 0;

  try {
    assert.ok(totalGlyphs >= LATIN_HEBREW_FLOOR,
      'Total glyph count ' + totalGlyphs + ' < floor ' + LATIN_HEBREW_FLOOR +
      '. The active font may be dropping glyphs (single-script font regression?).');
    console.log('[PASS] Total glyph count: ' + totalGlyphs + ' (floor: ' + LATIN_HEBREW_FLOOR + ')');
  } catch (err) {
    console.error('[FAIL] Total glyph count check:', err.message);
    failed++;
  }

  try {
    assert.ok(latinHits.length >= LATIN_HITS_FLOOR,
      'Latin glyph CID hits ' + latinHits.length + '/' + LATIN_CID_EXPECTATIONS.length +
      ' < floor ' + LATIN_HITS_FLOOR + '. Latin chars from "Atomic Habits" missing — ' +
      'active font lacks Latin glyphs OR isRtl-driven font switch reverted.');
    console.log('[PASS] Latin CID coverage: ' + latinHits.length + '/' + LATIN_CID_EXPECTATIONS.length +
      ' (floor: ' + LATIN_HITS_FLOOR + ') — chars ATomicHabs covered');
  } catch (err) {
    console.error('[FAIL] Latin CID coverage:', err.message);
    console.error('  Found:', latinHits.join(', '));
    console.error('  Expected (any 8 of):', LATIN_CID_EXPECTATIONS.join(', '));
    failed++;
  }

  try {
    assert.ok(hebrewHits.length >= HEBREW_HITS_FLOOR,
      'Hebrew glyph CID hits ' + hebrewHits.length + '/' + HEBREW_CID_EXPECTATIONS.length +
      ' < floor ' + HEBREW_HITS_FLOOR + '. Hebrew chars missing — active font lacks Hebrew glyphs.');
    console.log('[PASS] Hebrew CID coverage: ' + hebrewHits.length + '/' + HEBREW_CID_EXPECTATIONS.length +
      ' (floor: ' + HEBREW_HITS_FLOOR + ')');
  } catch (err) {
    console.error('[FAIL] Hebrew CID coverage:', err.message);
    console.error('  Found:', hebrewHits.join(', '));
    console.error('  Expected (any 4 of):', HEBREW_CID_EXPECTATIONS.join(', '));
    failed++;
  }

  console.log('Passed ' + (3 - failed) + '/3, Failed ' + failed + '/3.');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err);
  process.exit(1);
});
