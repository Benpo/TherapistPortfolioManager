/**
 * Phase 23 (Plan 23-08) — digit-order regression for RTL paragraphs.
 *
 * Catches the Plan 23-07 hot-fix shipping bug:
 *
 *   With our pre-shaped visual string (shapeForJsPdf) + jsPDF's default
 *   isInputVisual:true option, jsPDF's internal __bidiEngine__ assumed the
 *   input was logical and re-shaped it again, double-reversing every digit
 *   run inside an RTL paragraph. "24" rendered as "42", "2026" as "6202".
 *
 *   The 23-04 SHA-256 harness DID drift on this bug (fixture-he.sha256
 *   changed) but a hash-only diff doesn't tell you WHICH bytes moved or
 *   WHY — without this test, the only way to validate the fix was to read
 *   the PDF visually. This test asserts the actual digit order at the
 *   glyph-stream level, so any future regression is caught at CI time
 *   and points directly at the affected code.
 *
 * --- What the test does ---
 *
 * 1. Builds a PDF for a one-paragraph fixture whose body contains the date
 *    "24 במרץ 2026" — the exact pattern Ben reported (Hebrew + Latin digits
 *    in the same line).
 * 2. Walks the PDF page-1 content stream and extracts every digit GID run
 *    (Heebo digit GIDs: 0=0138 1=0139 2=013A 3=013B 4=013C 5=013D 6=013E
 *    7=013F 8=0140 9=0141).
 * 3. Asserts:
 *      a. The string "2026" appears as a digit run (correct LTR order)
 *      b. The string "6202" does NOT appear (would indicate the bug)
 *      c. The string "24" appears (correct LTR order)
 *      d. The string "42" does NOT appear (would indicate the bug)
 *
 * --- Run modes ---
 *
 *   node tests/pdf-digit-order.test.js                  -- check mode
 *   MEASURE_MODE=1 node tests/pdf-digit-order.test.js   -- print all digit runs
 *
 * --- Heebo digit GIDs ---
 *
 * Measured 2026-05-12 by rendering "0123456789" alone and reading the Tj
 * content-stream output. Stable for as long as Heebo Regular v3.100 is
 * vendored. If Heebo is swapped, REMEASURE these by running the
 * tests/pdf-glyph-coverage.test.js MEASURE_MODE harness on a digit string.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var REPO_ROOT = path.resolve(__dirname, '..');
var MEASURE_MODE = process.env.MEASURE_MODE === '1';

// Heebo digit GIDs (uppercase 4-hex). Measured at Plan 23-08 fix time.
var DIGIT_GIDS = {
  '0138': '0', '0139': '1', '013A': '2', '013B': '3', '013C': '4',
  '013D': '5', '013E': '6', '013F': '7', '0140': '8', '0141': '9',
};

// Deterministic-PDF pin values (Mitigation B from Plan 23-04 harness)
var PINNED_DATE = "D:20260101000000+00'00'";
var PINNED_FILE_ID = '00000000000000000000000000000000';

// JSDOM availability + load
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

// Build a JSDOM env wired the same way as 23-04's harness so the PDF byte
// stream is deterministic.
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
  win.eval(readAsset('assets/fonts/heebo-bold-base64.js'));  // Plan 23-09

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
    './assets/fonts/heebo-bold-base64.js',  // Plan 23-09
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

// Walk the PDF byte buffer and extract every digit-run that appears in the
// page-1 content stream. Returns an array of strings like ["2026", "24"].
// A digit run is a maximal sequence of consecutive digit GIDs inside a
// single Tj/TJ operator.
function extractDigitRuns(buf) {
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

  var content = rawStreams[0];
  var digitRuns = [];

  // Helper: walk a hex string in 4-char GID units, accumulate digit runs.
  function walkHex(hex) {
    var run = '';
    for (var i = 0; i < hex.length; i += 4) {
      var gid = hex.slice(i, i + 4).toUpperCase();
      var d = DIGIT_GIDS[gid];
      if (d !== undefined) {
        run += d;
      } else if (run.length > 0) {
        digitRuns.push(run);
        run = '';
      }
    }
    if (run.length > 0) digitRuns.push(run);
  }

  // Plain Tj: <hex> Tj
  var tjRe = /<([0-9A-Fa-f]+)>\s*Tj/g;
  var m;
  while ((m = tjRe.exec(content)) !== null) {
    walkHex(m[1]);
  }
  // TJ array: [(...) <hex> ... ] TJ
  var bigTjRe = /\[([^\]]*)\]\s*TJ/g;
  while ((m = bigTjRe.exec(content)) !== null) {
    var hexParts = m[1].match(/<([0-9A-Fa-f]+)>/g) || [];
    for (var hp = 0; hp < hexParts.length; hp++) {
      walkHex(hexParts[hp].slice(1, -1));
    }
  }
  return digitRuns;
}

async function main() {
  var dom = buildJsdomEnv();
  var win = dom.window;

  // Single-paragraph fixture with the exact pattern Ben reported. The Hebrew
  // word "במרץ" (in March) sandwiched between "24" and "2026" is the
  // logical-input form; visual order should preserve "24" and "2026" as
  // left-to-right digit runs.
  var fixture = {
    sessionData: {
      clientName: 'Test',
      sessionDate: '2026-03-24',
      sessionType: 'test',
      markdown: 'הפגישה התקיימה ב-24 במרץ 2026 במשרד הקליניקה.',
    },
    opts: { uiLang: 'he' },
  };

  var blob = await win.PDFExport.buildSessionPDF(fixture.sessionData, fixture.opts);
  var ab = await blob.arrayBuffer();
  var buf = Buffer.from(ab);
  dom.window.close();

  var digitRuns = extractDigitRuns(buf);

  if (MEASURE_MODE) {
    console.log('--- MEASURE_MODE ---');
    console.log('All digit runs found in page 1:');
    digitRuns.forEach(function (r, i) { console.log('  [' + i + '] ' + r); });
    process.exit(0);
  }

  var failed = 0;

  // Assertion a: "2026" must appear (the date in the body)
  try {
    assert.ok(digitRuns.indexOf('2026') >= 0,
      'Expected digit run "2026" in page 1 but not found. ' +
      'Runs found: [' + digitRuns.join(', ') + ']. ' +
      'If "6202" appears instead, jsPDF\'s __bidiEngine__ is double-reversing ' +
      'digit runs — verify isInputVisual:false is set on every doc.text() call.');
    console.log('[PASS] "2026" appears in correct LTR order');
  } catch (err) {
    console.error('[FAIL] "2026" check:', err.message);
    failed++;
  }

  // Assertion b: "6202" must NOT appear (reversed = bug)
  try {
    assert.ok(digitRuns.indexOf('6202') < 0,
      'Reversed digit run "6202" found in page 1 — jsPDF\'s __bidiEngine__ ' +
      'is double-reversing the pre-shaped visual string. ' +
      'Fix: ensure every doc.text() call passes { isInputVisual: false }.');
    console.log('[PASS] "6202" (reversed) does NOT appear');
  } catch (err) {
    console.error('[FAIL] "6202" anti-check:', err.message);
    failed++;
  }

  // Assertion c: "24" must appear
  try {
    assert.ok(digitRuns.indexOf('24') >= 0,
      'Expected digit run "24" in page 1 but not found. ' +
      'Runs found: [' + digitRuns.join(', ') + ']. ' +
      'If "42" appears instead, the digit-reversal bug is back.');
    console.log('[PASS] "24" appears in correct LTR order');
  } catch (err) {
    console.error('[FAIL] "24" check:', err.message);
    failed++;
  }

  // Assertion d: "42" must NOT appear (reversed = bug)
  try {
    assert.ok(digitRuns.indexOf('42') < 0,
      'Reversed digit run "42" found in page 1 — jsPDF\'s __bidiEngine__ ' +
      'is double-reversing the pre-shaped visual string. ' +
      'Fix: ensure every doc.text() call passes { isInputVisual: false }.');
    console.log('[PASS] "42" (reversed) does NOT appear');
  } catch (err) {
    console.error('[FAIL] "42" anti-check:', err.message);
    failed++;
  }

  console.log('Passed ' + (4 - failed) + '/4, Failed ' + failed + '/4.');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err);
  process.exit(1);
});
