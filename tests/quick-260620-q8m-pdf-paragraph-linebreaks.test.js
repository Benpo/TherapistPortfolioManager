/**
 * Quick task 260620-q8m -- session PDF export drops intra-paragraph line breaks.
 *
 * BUG: A therapist typed a separator line of dashes ("----------------") on its
 * own line between two text lines in a session note. The editor live-preview
 * (assets/md-render.js line 63: a paragraph's single newlines become <br>)
 * correctly renders the dashes on their OWN line. But the exported PDF flattens
 * the dashes inline with the surrounding text.
 *
 * ROOT CAUSE (assets/pdf-export.js parseMarkdown(), the paragraph push):
 *   blocks.push({ type: 'para', text: paraLines.join(" ") });
 * Contiguous paragraph source lines were joined with a SPACE, destroying every
 * intra-paragraph hard line break. The para renderer (~line 1124) then runs the
 * single space-joined string through doc.splitTextToSize(...) and word-wraps it,
 * so short source lines collapse onto one rendered row.
 *
 * THE FIX (one line): join("\n") instead of join(" "). jsPDF's
 * doc.splitTextToSize treats an embedded "\n" as a FORCED line break (in
 * addition to width wrapping), so each source line maps to its own rendered row.
 *
 * This is a runtime-behavior bug (MEMORY: feedback-behavior-verification --
 * runtime fixes require a falsifiable test that FAILS before the fix and PASSES
 * after; a grep/shape check is NOT sufficient). Rather than parse glyph CIDs, we
 * SPY on the jsPDF prototype `text` method: each paragraph sub-line calls
 * drawSegmentedLine() once, which issues doc.text(str, x, y, ...) at a single
 * baseline y. Distinct y values among body draws == distinct rendered rows, and
 * the str of each call is the (visual) text drawn on that row. With opts.uiLang
 * = 'en' the body is LTR English, so the dash run's visual text is just dashes.
 *
 * --- Fixture ---
 *   markdown = "textA\n----------------\ntextB"
 * Three short source lines (a 16-dash line between two short text lines), no
 * blank lines so it is ONE paragraph block. None of the three width-wrap.
 *
 *   EXPECTED (after fix): 3 distinct body rows; the 16 dashes render on a row by
 *   themselves (a dashes-only row), on a baseline different from the textA row
 *   and the textB row; NO single row carries both a dash and a letter.
 *
 *   FALSIFIABLE: on the OLD code (join(" ")) the three lines collapse into one
 *   space-joined string -> fewer than 3 body rows AND a single row carries
 *   "textA ---------------- textB" (a dash + a letter together) -> test FAILS.
 *   On the NEW code (join("\n")) -> 3 rows incl. a dashes-only row -> PASSES.
 *
 * --- Run ---
 *   node tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js
 *   JSDOM_PATH=/tmp/node_modules/jsdom node tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var REPO_ROOT = path.resolve(__dirname, '..');

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

// ---------------------------------------------------------------------------
// buildJsdomEnv -- mirrors tests/quick-260522-iwr-ordered-list-export.test.js
// (jsdom + jsPDF/bidi/Heebo preload + WrappedJsPDF date/id pinning), with one
// addition: after pdf-export.js is eval'd we wrap the jsPDF prototype `text`
// method so every doc.text(str, x, y, opts) call records { str, y } on
// win.__textCalls. This is the behavior probe.
// ---------------------------------------------------------------------------
function buildJsdomEnv() {
  var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'file://' + REPO_ROOT + '/test-harness.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  // jsdom does not implement HTMLCanvasElement.getContext; jsPDF probes it and
  // jsdom's default stub THROWS ("Not implemented"), which would abort the
  // build before the body is drawn. Stub it to a harmless no-op (jsPDF does not
  // need a real 2D context to lay out text). Must be installed before eval.
  win.HTMLCanvasElement.prototype.getContext = function () { return null; };

  win.eval(readAsset('assets/jspdf.min.js'));
  win.eval(readAsset('assets/bidi.min.js'));
  win.eval(readAsset('assets/fonts/heebo-base64.js'));
  win.eval(readAsset('assets/fonts/heebo-bold-base64.js'));

  // --- Behavior probe storage. ---
  // jsPDF installs its API methods (incl. `text`) as OWN properties on each doc
  // INSTANCE in its constructor -- NOT on the prototype -- so the spy must wrap
  // the instance method right after construction (done in WrappedJsPDF below),
  // not the prototype.
  win.__textCalls = [];

  var OriginalJsPDF = win.jspdf.jsPDF;
  function WrappedJsPDF(args) {
    var doc = new OriginalJsPDF(args);
    doc.setCreationDate(PINNED_DATE);
    doc.setFileId(PINNED_FILE_ID);
    // Spy on this instance's own `text` method. Every drawn line goes through
    // doc.text(str, x, y, opts); drawSegmentedLine (one call per paragraph
    // sub-line) and drawTextLine both issue doc.text at a single baseline y per
    // sub-line, so recording { str, y } captures the text drawn on each row.
    var origText = doc.text;
    doc.text = function (str, x, y) {
      try {
        win.__textCalls.push({ str: String(str), y: y });
      } catch (e) { /* never let the spy break rendering */ }
      return origText.apply(this, arguments);
    };
    return doc;
  }
  WrappedJsPDF.prototype = OriginalJsPDF.prototype;
  Object.keys(OriginalJsPDF).forEach(function (k) { WrappedJsPDF[k] = OriginalJsPDF[k]; });
  win.jspdf.jsPDF = WrappedJsPDF;

  var preload = [
    './assets/jspdf.min.js',
    './assets/bidi.min.js',
    './assets/fonts/heebo-base64.js',
    './assets/fonts/heebo-bold-base64.js',
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

async function buildAndCapture(win, sessionData, opts) {
  win.__textCalls = [];
  // buildSessionPDF returns a Blob, but this test reads the rendered text from
  // the doc.text spy (win.__textCalls), NOT from the PDF bytes -- so it does
  // NOT depend on jsdom's Blob implementing arrayBuffer() (jsdom's Blob omits
  // it). Awaiting the Promise is enough to let all draw calls run.
  await win.PDFExport.buildSessionPDF(sessionData, opts);
  return win.__textCalls.slice();
}

// Round a baseline y to 2 decimals to absorb float noise when grouping rows.
function roundY(y) {
  return Math.round((Number(y) || 0) * 100) / 100;
}

// ---------------------------------------------------------------------------
async function main() {
  var passed = 0;
  var failed = 0;

  function check(label, fn) {
    try {
      fn();
      console.log('[PASS] ' + label);
      passed++;
    } catch (err) {
      console.error('[FAIL] ' + label + ': ' + err.message);
      failed++;
    }
  }

  var DASHES = '----------------'; // 16 dashes
  assert.strictEqual(DASHES.length, 16, 'fixture sanity: dash run must be 16 chars');

  var dom = buildJsdomEnv();
  var win = dom.window;

  var textCalls = await buildAndCapture(win, {
    clientName: 'ZZZ',
    sessionDate: '2026-05-08',
    sessionType: 'Online',
    markdown: 'textA\n' + DASHES + '\ntextB',
  }, { uiLang: 'en' });

  dom.window.close();

  // Narrow to BODY draws only: header/footer/meta draws (title, date,
  // page number) don't contain our fixture tokens. A body draw is any text
  // call whose str contains "textA", "textB", or is an all-dash run.
  function isDashRun(s) { return /^-+$/.test(String(s).trim()); }
  function hasTextA(s) { return String(s).indexOf('textA') >= 0; }
  function hasTextB(s) { return String(s).indexOf('textB') >= 0; }

  var bodyCalls = textCalls.filter(function (c) {
    return hasTextA(c.str) || hasTextB(c.str) || isDashRun(c.str);
  });

  // Group body draws by rounded baseline y -> one group per rendered row.
  var rowsByY = {};
  bodyCalls.forEach(function (c) {
    var key = String(roundY(c.y));
    if (!rowsByY[key]) rowsByY[key] = { y: roundY(c.y), strs: [] };
    rowsByY[key].strs.push(c.str);
  });
  var rows = Object.keys(rowsByY).map(function (k) {
    var r = rowsByY[k];
    return { y: r.y, text: r.strs.join('') };
  });

  // Helpful debug dump on failure / when DEBUG set.
  if (process.env.DEBUG === '1') {
    console.log('\n--- body rows (by baseline y) ---');
    rows.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (r) {
      console.log('  y=' + r.y + '  text=' + JSON.stringify(r.text));
    });
  }

  // ---- Test 1: paragraph renders as >=3 distinct body rows ----------------
  check('Test 1: the 3-line paragraph renders as >=3 distinct body rows', function () {
    assert.ok(rows.length >= 3, 'found ' + rows.length + ' distinct body row(s); expected >=3. ' +
      'The intra-paragraph line breaks collapsed (join(" ")) so textA/dashes/textB share rows. ' +
      'Rows: ' + JSON.stringify(rows.map(function (r) { return r.text; })));
  });

  // ---- Test 2: exactly one row is a dashes-only row (16 dashes) ------------
  var dashRows = rows.filter(function (r) { return /^-+$/.test(r.text.trim()); });
  check('Test 2: the dash run renders on a dashes-only row carrying all 16 dashes', function () {
    assert.strictEqual(dashRows.length, 1, 'found ' + dashRows.length +
      ' dashes-only row(s); expected exactly 1. Rows: ' +
      JSON.stringify(rows.map(function (r) { return r.text; })));
    var dashCount = (dashRows[0].text.match(/-/g) || []).length;
    assert.ok(dashCount >= 16, 'dashes-only row has ' + dashCount +
      ' dashes; expected the full 16. text=' + JSON.stringify(dashRows[0].text));
  });

  // ---- Test 3: dash row baseline differs from the textA and textB rows ----
  check('Test 3: dashes row baseline differs from the textA row and the textB row', function () {
    var textARow = rows.filter(function (r) { return r.text.indexOf('textA') >= 0; });
    var textBRow = rows.filter(function (r) { return r.text.indexOf('textB') >= 0; });
    assert.strictEqual(textARow.length, 1, 'expected exactly 1 row carrying "textA", found ' + textARow.length);
    assert.strictEqual(textBRow.length, 1, 'expected exactly 1 row carrying "textB", found ' + textBRow.length);
    assert.strictEqual(dashRows.length, 1, 'expected exactly 1 dashes-only row, found ' + dashRows.length);
    assert.notStrictEqual(dashRows[0].y, textARow[0].y,
      'dashes share the SAME baseline (' + dashRows[0].y + ') as textA -- they are inline-joined, not on their own row.');
    assert.notStrictEqual(dashRows[0].y, textBRow[0].y,
      'dashes share the SAME baseline (' + dashRows[0].y + ') as textB -- they are inline-joined, not on their own row.');
  });

  // ---- Test 4 (falsifiability guard): no row mixes a dash and a letter ----
  // This is the assertion that FAILS on join(" ") (which produces a row whose
  // text is "textA ---------------- textB", containing both '-' and letters)
  // and PASSES on join("\n").
  check('Test 4 (falsifiability): NO single body row contains both a dash and a textA/textB letter', function () {
    var mixed = bodyCalls
      .map(function (c) { return c; })
      // re-group to row text (already have rows), inspect each row's text
      ;
    var offenders = rows.filter(function (r) {
      var hasDash = r.text.indexOf('-') >= 0;
      var hasLetter = /[a-zA-Z]/.test(r.text); // textA/textB letters
      return hasDash && hasLetter;
    });
    assert.strictEqual(offenders.length, 0, 'found ' + offenders.length +
      ' row(s) mixing a dash with letters (the dashes were inline-joined with surrounding text): ' +
      JSON.stringify(offenders.map(function (r) { return r.text; })));
    // touch `mixed` to avoid unused-var lint without changing behavior
    void mixed;
  });

  var total = passed + failed;
  console.log('\nPassed ' + passed + '/' + total + ', Failed ' + failed + '/' + total + '.');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err);
  process.exit(1);
});
