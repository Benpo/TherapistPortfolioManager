/**
 * Quick task 260608-cx5 -- RTL ordered-list Hebrew-content unified-row
 * regression test.
 *
 * The previous quick task (260608-c8x) added a "split-row" branch to the list
 * renderer that fires for EVERY RTL + ordered + wi===0 row, regardless of the
 * item content's direction. The intent of c8x Bug B was to right-anchor the
 * "N. " prefix when the item content starts with LTR characters (e.g. an
 * English term in a Hebrew document). The side effect is that the same branch
 * now also fires for Hebrew-content items -- which previously rendered
 * correctly via the UNIFIED-ROW path where UAX #9 shaped the whole row
 * (prefix + content) as one RTL paragraph. Splitting the row into two
 * independent drawSegmentedLine calls breaks that single-paragraph composition
 * and produces the visually-wrong layout the user reported (the digit + period
 * mis-arranged relative to Hebrew content).
 *
 * THE GATE (to be added in Task 2): keep the split-row branch ONLY for
 * LTR-content rows. The split is what made c8x Bug B work, but only for
 * LTR-content rows is it needed. For RTL content (or no-strong content like
 * digits/punct only) the unified-row else branch is correct.
 *
 *   if (docDir === 'rtl' && wi === 0 && block.ordered
 *       && firstStrongDir(listStripped) === 'ltr') {
 *     // split-row (c8x Bug B fix path)
 *   } else {
 *     // unified-row (cx5 restoration path)
 *   }
 *
 * --- Approach ---
 *
 * Reuses the c8x test harness verbatim:
 *   - JSDOM with jsPDF + bidi-js + Heebo fonts loaded
 *   - Deterministic-PDF pin (PINNED_DATE / PINNED_FILE_ID)
 *   - Per-instance doc.text() monkey-patch via WrappedJsPDF (capture each
 *     (text, x, y) tuple as the PDF is built)
 *
 * The split-row branch fires TWO doc.text() calls per row at the SAME y:
 *   (a) a SHORT prefix-only call -- text like "1. " (length <= 6) -- at
 *       call.x = PAGE_W - MARGIN_X - prefixW  (right-anchored)
 *   (b) a CONTENT call at call.x = PAGE_W - MARGIN_X - prefixW - contentW
 *
 * The unified-row else branch fires ONE doc.text() call per row carrying
 * BOTH the digit + period AND the content (as a single visual string).
 * For Hebrew content the visual string is mixed: ASCII digit + period + the
 * Hebrew codepoints.
 *
 * The falsifiable structural assertion for the gate:
 *   - Hebrew-content row: NO short prefix-only call (length <= 6 containing
 *     the digit AND ".") fires at the row's y. Equivalently / additionally
 *     there is exactly one call at that y carrying both the ASCII digit AND
 *     a Hebrew codepoint (>= 0x05D0 && <= 0x05FF).
 *   - English-content row: a short prefix-only call DOES fire at the row's
 *     y with call.x in [474, 529] (near right margin = 524 ±50). This
 *     guards the c8x Bug B fix from regressing.
 *   - LTR doc: the prefix-containing call's x is in [70, 121] (near left
 *     margin). Guards the LTR path from any accidental flip.
 *
 * --- RED expectations (current code, BEFORE gate) ---
 *   FAIL: CX5-1 (Hebrew-content row uses unified path)
 *   PASS: CX5-2 (English-content row keeps split-row, prefix right-anchored)
 *   FAIL: CX5-3 (all 3 Hebrew rows use unified path)
 *   PASS: CX5-4 (LTR doc unchanged)
 *
 * --- GREEN expectations (after gate added) ---
 *   All four sub-tests pass.
 *
 * --- Run ---
 *   node tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js
 *   MEASURE_MODE=1 node tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var REPO_ROOT = path.resolve(__dirname, '..');
var MEASURE_MODE = process.env.MEASURE_MODE === '1';

// Deterministic-PDF pin values (mirrors c8x / iwr).
var PINNED_DATE = "D:20260101000000+00'00'";
var PINNED_FILE_ID = '00000000000000000000000000000000';

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

// Geometry constants -- mirror pdf-export.js buildSessionPDF scope.
var PAGE_W = 595;
var MARGIN_X = 71;
var RIGHT_X = PAGE_W - MARGIN_X; // 524
var LEFT_X = MARGIN_X;           // 71

// ---------------------------------------------------------------------------
// jsdom env -- mirrors quick-260608-c8x's buildJsdomEnv.
// ---------------------------------------------------------------------------
function buildJsdomEnv(opts) {
  opts = opts || {};
  var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'file://' + REPO_ROOT + '/test-harness.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  win.eval(readAsset('assets/jspdf.min.js'));
  win.eval(readAsset('assets/bidi.min.js'));
  win.eval(readAsset('assets/fonts/heebo-base64.js'));
  win.eval(readAsset('assets/fonts/heebo-bold-base64.js'));

  var OriginalJsPDF = win.jspdf.jsPDF;
  var captureText = (typeof opts.captureText === 'function') ? opts.captureText : null;

  function WrappedJsPDF(args) {
    var doc = new OriginalJsPDF(args);
    doc.setCreationDate(PINNED_DATE);
    doc.setFileId(PINNED_FILE_ID);
    if (captureText) {
      var origText = doc.text.bind(doc);
      doc.text = function (txt, x, y, textOpts) {
        try { captureText({ text: txt, x: x, y: y, opts: textOpts }); }
        catch (_) { /* never break the PDF build */ }
        return origText.apply(null, arguments);
      };
    }
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

async function buildBlob(win, sessionData, opts) {
  return win.PDFExport.buildSessionPDF(sessionData, opts);
}
async function blobToBuffer(blob) {
  var ab = await blob.arrayBuffer();
  return Buffer.from(ab);
}
async function buildWithTextCapture(sessionData, opts, captureBuf) {
  var dom = buildJsdomEnv({ captureText: function (rec) { captureBuf.push(rec); } });
  var blob = await buildBlob(dom.window, sessionData, opts);
  await blobToBuffer(blob); // ensure full render path completes
  dom.window.close();
}

// ---------------------------------------------------------------------------
// Capture-call helpers.
// ---------------------------------------------------------------------------

// Reusable from c8x: find every doc.text() call whose `text` carries BOTH the
// requested ASCII digit AND a "." somewhere inside. Returns one entry per
// match. (Each row's prefix-bearing call(s) end up in here.)
function findPrefixCallsForDigit(calls, digit) {
  var matched = [];
  for (var k = 0; k < calls.length; k++) {
    var t = calls[k].text;
    if (typeof t !== 'string') continue;
    var di = t.indexOf(digit);
    if (di === -1) continue;
    if (t.indexOf('.') === -1) continue;
    matched.push({
      call: calls[k],
      text: t,
      digitIndex: di,
      isShortPrefixCall: t.length <= 6,
    });
  }
  return matched;
}

function containsHebrew(text) {
  if (typeof text !== 'string') return false;
  for (var i = 0; i < text.length; i++) {
    var cp = text.codePointAt(i);
    if (cp >= 0x05D0 && cp <= 0x05FF) return true;
  }
  return false;
}

// Strict y-equality (no tolerance needed -- per-row jsPDF y is a single
// computed value reused by every doc.text() call for that row). Use a small
// epsilon to be defensive against float-fp noise.
function yEq(a, b, eps) {
  if (eps == null) eps = 0.5;
  return Math.abs(a - b) <= eps;
}

// At the supplied y, find the first SHORT prefix-only call (text length <= 6
// AND contains the digit AND contains "." AND contains NO Hebrew codepoint).
// Returns the entry or null. A hit here is the SIGNATURE of the split-row
// branch firing for the row -- that branch emits the raw ASCII `listPrefix`
// ("N. ") which contains zero Hebrew codepoints.
//
// The Hebrew-exclusion guard matters because a short unified-row call CAN
// legitimately exist for very-short Hebrew items (e.g. "1. לוע" reaches
// doc.text() as the 6-char visual string "עול .1" which contains the digit
// + period AND is <=6 chars). That short call is NOT a split-row signature
// -- it carries Hebrew, so the unified-row else branch fired correctly.
function findShortPrefixCallAt(calls, digit, y, yTol) {
  for (var k = 0; k < calls.length; k++) {
    var c = calls[k];
    if (typeof c.text !== 'string') continue;
    if (c.text.length > 6) continue;
    if (c.text.indexOf(digit) === -1) continue;
    if (c.text.indexOf('.') === -1) continue;
    if (containsHebrew(c.text)) continue;
    if (!yEq(c.y, y, yTol)) continue;
    return c;
  }
  return null;
}

// At the supplied y, find the first call whose `text` carries BOTH the ASCII
// digit AND a Hebrew codepoint. A hit here is the SIGNATURE of the unified-row
// branch firing for a Hebrew-content row (prefix + content shaped as a single
// run, so the visual string mixes ASCII digit/period with Hebrew chars).
function findUnifiedRowCallAt(calls, digit, y, yTol) {
  for (var k = 0; k < calls.length; k++) {
    var c = calls[k];
    if (typeof c.text !== 'string') continue;
    if (c.text.indexOf(digit) === -1) continue;
    if (!containsHebrew(c.text)) continue;
    if (!yEq(c.y, y, yTol)) continue;
    return c;
  }
  return null;
}

// Pick the lowest-y prefix-call entry for a given digit (first row encounter).
// Tie-break: prefer SHORT prefix-only calls (a clear split-row signature)
// over long fused calls if they share the same y.
function lowestYPrefixCall(entries) {
  if (!entries || entries.length === 0) return null;
  var sorted = entries.slice().sort(function (a, b) {
    if (a.call.y !== b.call.y) return a.call.y - b.call.y;
    return (a.isShortPrefixCall ? -1 : 1) - (b.isShortPrefixCall ? -1 : 1);
  });
  return sorted[0];
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

  // ============================================================
  // CX5-1 -- Hebrew-content single item in an RTL doc.
  //
  // Current code: the split-row branch fires unconditionally for RTL ordered
  // wi===0 rows, so a SHORT prefix-only call exists at the row's y.
  // After the gate: the unified-row else branch fires, NO short prefix-only
  // call exists at the row's y, and ONE call carrying digit + Hebrew exists.
  // ============================================================
  var captureCX5_1 = [];
  await buildWithTextCapture({
    clientName: 'ZZZ', sessionDate: '2026-05-08', sessionType: 'Online',
    markdown: '1. לוע',
  }, { uiLang: 'he' }, captureCX5_1);

  if (MEASURE_MODE) {
    console.log('\n[CX5-1] doc.text() calls captured = ' + captureCX5_1.length);
    captureCX5_1.forEach(function (rec, idx) {
      var safe = (typeof rec.text === 'string' && rec.text.length < 60)
        ? rec.text : '<' + (rec.text && rec.text.length) + ' chars>';
      console.log('  [' + idx + '] x=' + rec.x.toFixed(1) + ' y=' + rec.y.toFixed(1) +
        ' text=' + JSON.stringify(safe));
    });
  }

  var cx51PrefixEntries = findPrefixCallsForDigit(captureCX5_1, '1');
  if (cx51PrefixEntries.length === 0) {
    console.error('FATAL: CX5-1 found zero prefix-bearing calls for digit "1".');
    process.exit(1);
  }
  var cx51RowEntry = lowestYPrefixCall(cx51PrefixEntries);
  var cx51RowY = cx51RowEntry.call.y;

  check('Test CX5-1a (RTL, Hebrew content): NO short prefix-only call at the row y (unified-row path)', function () {
    var shortCall = findShortPrefixCallAt(captureCX5_1, '1', cx51RowY, 0.5);
    assert.strictEqual(shortCall, null,
      'Found a short prefix-only call at row y=' + cx51RowY.toFixed(2) +
      ' (text=' + (shortCall && JSON.stringify(shortCall.text)) + ', x=' +
      (shortCall && shortCall.x.toFixed(2)) + '). The split-row branch is firing for a ' +
      'Hebrew-content row -- the cx5 regression. Expected the unified-row else branch.');
  });
  check('Test CX5-1b (RTL, Hebrew content): a unified call (digit + Hebrew in same text) exists at the row y', function () {
    var unifiedCall = findUnifiedRowCallAt(captureCX5_1, '1', cx51RowY, 0.5);
    assert.ok(unifiedCall !== null,
      'No call at y=' + cx51RowY.toFixed(2) + ' carries BOTH the digit "1" and a Hebrew codepoint. ' +
      'The unified-row else branch should emit one call that mixes the ASCII prefix and the Hebrew content.');
  });

  // ============================================================
  // CX5-2 -- English-content row in an RTL doc (Bug B regression guard).
  //
  // The split-row branch MUST still fire for this row (the c8x fix), so a
  // SHORT prefix-only call exists at the row's y, with x near the right
  // margin (524 ±50).
  // ============================================================
  var captureCX5_2 = [];
  await buildWithTextCapture({
    clientName: 'ZZZ', sessionDate: '2026-05-08', sessionType: 'Online',
    markdown: '2. Latin term',
  }, { uiLang: 'he' }, captureCX5_2);

  if (MEASURE_MODE) {
    console.log('\n[CX5-2] doc.text() calls captured = ' + captureCX5_2.length);
    captureCX5_2.forEach(function (rec, idx) {
      var safe = (typeof rec.text === 'string' && rec.text.length < 60)
        ? rec.text : '<' + (rec.text && rec.text.length) + ' chars>';
      console.log('  [' + idx + '] x=' + rec.x.toFixed(1) + ' y=' + rec.y.toFixed(1) +
        ' text=' + JSON.stringify(safe));
    });
  }

  var cx52PrefixEntries = findPrefixCallsForDigit(captureCX5_2, '2');
  if (cx52PrefixEntries.length === 0) {
    console.error('FATAL: CX5-2 found zero prefix-bearing calls for digit "2".');
    process.exit(1);
  }
  var cx52RowEntry = lowestYPrefixCall(cx52PrefixEntries);
  var cx52RowY = cx52RowEntry.call.y;

  var RIGHT_MIN = RIGHT_X - 50; // 474
  var RIGHT_MAX = RIGHT_X + 5;  // 529
  check('Test CX5-2 (RTL, English content, Bug B guard): short prefix-only call at row y, x near right margin', function () {
    var shortCall = findShortPrefixCallAt(captureCX5_2, '2', cx52RowY, 0.5);
    assert.ok(shortCall !== null,
      'No short prefix-only call found at row y=' + cx52RowY.toFixed(2) + ' for an English-content row. ' +
      'The split-row branch is the c8x Bug B fix and must still fire for LTR-content rows in an RTL doc.');
    assert.ok(shortCall.x >= RIGHT_MIN && shortCall.x <= RIGHT_MAX,
      'short prefix-only call x=' + shortCall.x.toFixed(2) +
      '; expected in [' + RIGHT_MIN + ', ' + RIGHT_MAX + '] (right-margin anchor at ' + RIGHT_X + '). ' +
      'If far below 474, the c8x Bug B fix has regressed.');
  });

  // ============================================================
  // CX5-3 -- User's exact 3-Hebrew-item repro in an RTL doc.
  //
  // For each of the three Hebrew rows: NO short prefix-only call at its y,
  // and a unified (digit + Hebrew) call at its y. This is the exact
  // user-reported screenshot scenario.
  // ============================================================
  var fixtureCX5_3 =
    '1. לוע\n' +
    '\n' +
    'הסבר אחד.\n' +
    '\n' +
    '2. עיוות פאציאלי\n' +
    '\n' +
    'הסבר שני.\n' +
    '\n' +
    '3. חלל האף';
  var captureCX5_3 = [];
  await buildWithTextCapture({
    clientName: 'ZZZ', sessionDate: '2026-05-08', sessionType: 'Online',
    markdown: fixtureCX5_3,
  }, { uiLang: 'he' }, captureCX5_3);

  if (MEASURE_MODE) {
    console.log('\n[CX5-3] doc.text() calls captured = ' + captureCX5_3.length);
    captureCX5_3.forEach(function (rec, idx) {
      var safe = (typeof rec.text === 'string' && rec.text.length < 60)
        ? rec.text : '<' + (rec.text && rec.text.length) + ' chars>';
      console.log('  [' + idx + '] x=' + rec.x.toFixed(1) + ' y=' + rec.y.toFixed(1) +
        ' text=' + JSON.stringify(safe));
    });
  }

  var threeDigits = ['1', '2', '3'];
  threeDigits.forEach(function (digit) {
    var entries = findPrefixCallsForDigit(captureCX5_3, digit);
    if (entries.length === 0) {
      console.error('FATAL: CX5-3 found zero prefix-bearing calls for digit "' + digit + '".');
      process.exit(1);
    }
    var rowEntry = lowestYPrefixCall(entries);
    var rowY = rowEntry.call.y;

    check('Test CX5-3 (RTL, Hebrew content, row "' + digit + '."): NO short prefix-only call at the row y', function () {
      var shortCall = findShortPrefixCallAt(captureCX5_3, digit, rowY, 0.5);
      assert.strictEqual(shortCall, null,
        'Row "' + digit + '." (y=' + rowY.toFixed(2) + ') has a short prefix-only call ' +
        '(text=' + (shortCall && JSON.stringify(shortCall.text)) + ', x=' +
        (shortCall && shortCall.x.toFixed(2)) + '). Every Hebrew-content row must use the unified-row path.');
    });
    check('Test CX5-3 (RTL, Hebrew content, row "' + digit + '."): unified call (digit + Hebrew) exists at the row y', function () {
      var unifiedCall = findUnifiedRowCallAt(captureCX5_3, digit, rowY, 0.5);
      assert.ok(unifiedCall !== null,
        'Row "' + digit + '." (y=' + rowY.toFixed(2) + ') has no unified call mixing digit + Hebrew.');
    });
  });

  // ============================================================
  // CX5-4 -- LTR doc regression guard.
  //
  // The gate must not flip LTR-doc behaviour. The LTR path's prefix-bearing
  // call sits near the LEFT margin.
  // ============================================================
  var captureCX5_4 = [];
  await buildWithTextCapture({
    clientName: 'ZZZ', sessionDate: '2026-05-08', sessionType: 'Online',
    markdown: '1. First\n2. Second',
  }, { uiLang: 'en' }, captureCX5_4);

  if (MEASURE_MODE) {
    console.log('\n[CX5-4] doc.text() calls captured = ' + captureCX5_4.length);
    captureCX5_4.forEach(function (rec, idx) {
      var safe = (typeof rec.text === 'string' && rec.text.length < 60)
        ? rec.text : '<' + (rec.text && rec.text.length) + ' chars>';
      console.log('  [' + idx + '] x=' + rec.x.toFixed(1) + ' y=' + rec.y.toFixed(1) +
        ' text=' + JSON.stringify(safe));
    });
  }

  var LEFT_MIN = LEFT_X - 1;  // 70
  var LEFT_MAX = LEFT_X + 50; // 121
  ['1', '2'].forEach(function (digit) {
    var entries = findPrefixCallsForDigit(captureCX5_4, digit);
    if (entries.length === 0) {
      console.error('FATAL: CX5-4 found zero prefix-bearing calls for digit "' + digit + '".');
      process.exit(1);
    }
    var rowEntry = lowestYPrefixCall(entries);
    check('Test CX5-4 (LTR doc, row "' + digit + '."): prefix-bearing call x near left margin', function () {
      assert.ok(rowEntry.call.x >= LEFT_MIN && rowEntry.call.x <= LEFT_MAX,
        'Row "' + digit + '." x=' + rowEntry.call.x.toFixed(2) +
        '; expected in [' + LEFT_MIN + ', ' + LEFT_MAX + '] (near left margin ' + LEFT_X + '). ' +
        'The LTR path must remain unchanged by the cx5 gate.');
    });
  });

  if (MEASURE_MODE) process.exit(0);

  var total = passed + failed;
  console.log('\nPassed ' + passed + '/' + total + ', Failed ' + failed + '/' + total + '.');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err);
  process.exit(1);
});
