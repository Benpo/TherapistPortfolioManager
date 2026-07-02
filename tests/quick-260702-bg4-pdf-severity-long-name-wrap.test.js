/**
 * Quick task 260702-bg4 -- PDF export "Severity — before & after" section:
 * a long emotion name (issue.name) overruns the fixed-position before/after bar
 * unit instead of wrapping inside its name column.
 *
 * BUG: drawSeverityBlock (assets/pdf-export.js ~line 1716) draws issue.name at a
 * bare anchor with NO width constraint:
 *     drawAt(issue.name || '', nameX, rowTop + 10, nameAlign);
 * Every OTHER section in the module wraps text via doc.splitTextToSize. Because
 * the before/after bar unit sits at a FIXED x hugging the trailing edge, a long
 * name draws straight across / under the bar unit (the reported overlap).
 *
 * THE FIX (Task 2): wrap issue.name to the name-column width via
 * doc.splitTextToSize and draw one baseline per wrapped line, with a per-row
 * DYNAMIC height = max(nameLines.length * nameLineH, two-bar) + ROW_PAD. Full
 * text preserved — no truncation, no ellipsis, no font shrinking. Works in BOTH
 * LTR (uiLang 'en') and RTL (uiLang 'he').
 *
 * This is a runtime-behavior bug (MEMORY: feedback-behavior-verification --
 * runtime fixes require a falsifiable test that FAILS before the fix and PASSES
 * after; a grep/shape check is NOT sufficient). We SPY on each jsPDF instance's
 * own `text` method via the shared helper's { onJsPDF } hook, recording for every
 * doc.text(str, x, y, opts) call: { str, x, y, size, style, w } where `w` is the
 * drawn width at the active font (name draws are Heebo normal 11.5pt — exactly
 * what we measure). A NAME line draw is uniquely identifiable as a normal-weight
 * 11.5pt call anchored at the per-docDir name-column x (nameX); the fixture body
 * is a heading-only markdown so no 11.5 normal paragraph draw collides.
 *
 * --- RED expectation (against the CURRENT unfixed code) ---
 *   A. [RED gate] WRAP HAPPENED: >= 2 distinct name baselines. Current code emits
 *      one doc.text at one baseline -> 1 group -> FAILS.
 *   B. [RED gate] NO BAR-UNIT OVERLAP per name line:
 *        LTR (left anchor):  x + w <= unitLeftX + TOL          (330)
 *        RTL (right anchor): x - w >= (unitLeftX + barUnitW) - TOL  (265)
 *      Current single overflowing line breaches both -> FAILS.
 *   C. FULL TEXT PRESERVED (passes before and after): every source word survives.
 *   D. SUBSEQUENT ROW NOT CORRUPTED (correctness guard): a two-issue build keeps
 *      row 2's name strictly below row 1's LAST wrapped name line.
 *
 * --- Run ---
 *   node tests/quick-260702-bg4-pdf-severity-long-name-wrap.test.js
 *   (exit 0 = all pass; non-zero = RED/fail. Before the fix: gates A + B FAIL in
 *    both LTR and RTL.)
 */

'use strict';

var assert = require('assert');
var buildJsdomEnv = require('./_helpers/jsdom-pdf-env').buildJsdomEnv;

// --- Geometry constants (mirror the PLAN geometry_reference, all pt) ----------
var PAGE_W = 595, MARGIN_X = 71, GAP = 6, barUnitW = 194;
var NAME_SIZE = 11.5;
var NAME_LINE_H = 16; // BAR_LINE_H — wrapped name lines share the bar-line rhythm
var TOL = 1.0;

// LTR: name column [71, 330], left anchor at 71; bar-unit near edge = 330.
var LTR = { nameX: 71, barEdge: 330, dir: 'ltr' };
// RTL: name column [265, 524], right anchor at 524; bar-unit far edge = 265.
var RTL = { nameX: 524, barEdge: PAGE_W - MARGIN_X - barUnitW + barUnitW, dir: 'rtl' };
// (unitLeftX_rtl = MARGIN_X = 71 ; far edge = 71 + 194 = 265)
RTL.barEdge = MARGIN_X + barUnitW; // 265

// Distinctive long emotion names that exceed the ~253pt name column at 11.5pt.
var LONG_EN = 'Persistent overwhelming anticipatory performance anxiety and dread before sessions';
var LONG_HE = 'חרדה מתמשכת ועזה במיוחד לפני מפגשים חברתיים גדולים ולחץ נלווה מתמיד';

// --- doc.text spy: record every draw with font metrics + drawn width. --------
var draws = [];
function onJsPDF(doc) {
  var origText = doc.text;
  doc.text = function (str, x, y) {
    try {
      var size = NaN, style = '';
      try { size = doc.getFontSize(); } catch (e) {}
      try { var f = doc.getFont(); style = (f && f.fontStyle) || ''; } catch (e) {}
      var w = NaN;
      try { w = doc.getTextWidth(String(str)); } catch (e) {}
      draws.push({ str: String(str), x: Number(x), y: Number(y), size: size, style: style, w: w });
    } catch (e) { /* never let the spy break rendering */ }
    return origText.apply(this, arguments);
  };
}

function roundY(y) { return Math.round((Number(y) || 0) * 100) / 100; }
function reverseStr(s) { return String(s).split('').reverse().join(''); }
function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }

// A NAME-line draw: normal weight, 11.5pt, anchored at the docDir name-column x.
function isNameDraw(d, nameX) {
  return d.style === 'normal' &&
         Math.abs(d.size - NAME_SIZE) < 0.1 &&
         Math.abs(d.x - nameX) < 0.5;
}

// Group name draws into wrapped lines by rounded baseline y (ascending).
function nameLines(nameX) {
  var byY = {};
  draws.filter(function (d) { return isNameDraw(d, nameX); }).forEach(function (d) {
    var k = String(roundY(d.y));
    // one draw per baseline for a name; keep the widest if duplicates ever appear
    if (!byY[k] || d.w > byY[k].w) byY[k] = { y: roundY(d.y), str: d.str, x: d.x, w: d.w };
  });
  return Object.keys(byY).map(function (k) { return byY[k]; })
    .sort(function (a, b) { return a.y - b.y; });
}

async function build(win, sessionData, opts) {
  draws = [];
  await win.PDFExport.buildSessionPDF(sessionData, opts);
  return draws.slice();
}

async function main() {
  var passed = 0, failed = 0;
  function check(label, fn) {
    try { fn(); console.log('[PASS] ' + label); passed++; }
    catch (err) { console.error('[FAIL] ' + label + ': ' + err.message); failed++; }
  }

  var env = buildJsdomEnv({ onJsPDF: onJsPDF });
  var win = env.win;

  // ===================== LTR (uiLang 'en') ==================================
  await build(win, {
    clientName: 'Test Client',
    sessionDate: '2026-07-02',
    sessionType: 'Clinic',
    sessionNumber: 1,
    issues: [{ name: LONG_EN, before: 8, after: 3 }],
    markdown: '## Notes',
  }, { uiLang: 'en' });
  var ltrLines = nameLines(LTR.nameX);

  if (process.env.DEBUG === '1') {
    console.log('\n--- LTR name lines ---');
    ltrLines.forEach(function (l) { console.log('  y=' + l.y + ' x=' + l.x + ' w=' + (l.w || 0).toFixed(1) + ' str=' + JSON.stringify(l.str)); });
  }

  check('A[RED] LTR: long name wraps to >= 2 name lines', function () {
    assert.ok(ltrLines.length >= 2, 'found ' + ltrLines.length +
      ' name baseline(s); expected >= 2 (the long name did not wrap — it is one ' +
      'overflowing doc.text call). Lines: ' + JSON.stringify(ltrLines.map(function (l) { return l.str; })));
  });

  check('B[RED] LTR: no name line crosses the bar-unit near edge (x + w <= ' + LTR.barEdge + ')', function () {
    assert.ok(ltrLines.length >= 1, 'no name lines captured');
    ltrLines.forEach(function (l) {
      assert.ok(l.x + l.w <= LTR.barEdge + TOL,
        'name line right edge ' + (l.x + l.w).toFixed(1) + ' crosses the bar unit at ' +
        LTR.barEdge + ' (str=' + JSON.stringify(l.str) + ', w=' + l.w.toFixed(1) + ')');
    });
  });

  check('C LTR: full name text preserved across wrapped lines (no word dropped)', function () {
    var joined = norm(ltrLines.map(function (l) { return l.str; }).join(' '));
    LONG_EN.split(/\s+/).forEach(function (word) {
      assert.ok(joined.indexOf(word) >= 0, 'source word "' + word +
        '" missing from wrapped name; got: ' + JSON.stringify(joined));
    });
  });

  // ===================== RTL (uiLang 'he') ==================================
  await build(win, {
    clientName: 'לקוח בדיקה',
    sessionDate: '2026-07-02',
    sessionType: 'Clinic',
    sessionNumber: 1,
    issues: [{ name: LONG_HE, before: 8, after: 3 }],
    markdown: '## הערות',
  }, { uiLang: 'he' });
  var rtlLines = nameLines(RTL.nameX);

  if (process.env.DEBUG === '1') {
    console.log('\n--- RTL name lines ---');
    rtlLines.forEach(function (l) { console.log('  y=' + l.y + ' x=' + l.x + ' w=' + (l.w || 0).toFixed(1) + ' str=' + JSON.stringify(l.str)); });
  }

  check('A[RED] RTL: long name wraps to >= 2 name lines', function () {
    assert.ok(rtlLines.length >= 2, 'found ' + rtlLines.length +
      ' name baseline(s); expected >= 2 (RTL long name did not wrap). Lines: ' +
      JSON.stringify(rtlLines.map(function (l) { return l.str; })));
  });

  check('B[RED] RTL: no name line crosses the bar-unit far edge (x - w >= ' + RTL.barEdge + ')', function () {
    assert.ok(rtlLines.length >= 1, 'no RTL name lines captured');
    rtlLines.forEach(function (l) {
      assert.ok(l.x - l.w >= RTL.barEdge - TOL,
        'name line left edge ' + (l.x - l.w).toFixed(1) + ' crosses the bar unit far edge at ' +
        RTL.barEdge + ' (w=' + l.w.toFixed(1) + ')');
    });
  });

  check('C RTL: full Hebrew name text preserved across wrapped lines', function () {
    // RTL pure-Hebrew runs are shaped by full reversal (shapeForJsPdf); reverse
    // each visual line back to logical, join in baseline order.
    var joined = norm(rtlLines.map(function (l) { return reverseStr(l.str); }).join(' '));
    LONG_HE.split(/\s+/).forEach(function (word) {
      assert.ok(joined.indexOf(word) >= 0, 'source Hebrew word "' + word +
        '" missing from wrapped name; got: ' + JSON.stringify(joined));
    });
  });

  // ============ D: two-issue build — subsequent row not corrupted (LTR) ======
  await build(win, {
    clientName: 'Test Client',
    sessionDate: '2026-07-02',
    sessionType: 'Clinic',
    sessionNumber: 1,
    issues: [
      { name: LONG_EN, before: 8, after: 3 },
      { name: 'Anger', before: 5, after: 2 },
    ],
    markdown: '## Notes',
  }, { uiLang: 'en' });
  var twoLines = nameLines(LTR.nameX);

  if (process.env.DEBUG === '1') {
    console.log('\n--- two-issue LTR name lines ---');
    twoLines.forEach(function (l) { console.log('  y=' + l.y + ' str=' + JSON.stringify(l.str)); });
  }

  check('D LTR: row 2 ("Anger") sits below row 1\'s last wrapped name line (gap >= ' + NAME_LINE_H + ')', function () {
    var angerLines = twoLines.filter(function (l) { return l.str.indexOf('Anger') >= 0; });
    var firstLines = twoLines.filter(function (l) { return l.str.indexOf('Anger') < 0; });
    assert.ok(angerLines.length >= 1, 'could not locate the "Anger" (row 2) name line');
    assert.ok(firstLines.length >= 1, 'could not locate row 1 (long name) name lines');
    var row2Top = Math.min.apply(null, angerLines.map(function (l) { return l.y; }));
    var row1Bottom = Math.max.apply(null, firstLines.map(function (l) { return l.y; }));
    assert.ok(row2Top > row1Bottom,
      'row 2 baseline ' + row2Top + ' is NOT below row 1 last line ' + row1Bottom + ' (rows overlap)');
    assert.ok(row2Top - row1Bottom >= NAME_LINE_H,
      'gap between row 1 last line and row 2 is ' + (row2Top - row1Bottom) +
      'pt; expected >= ' + NAME_LINE_H + 'pt (dynamic row height did not push row 2 down)');
  });

  win.close && win.close();

  var total = passed + failed;
  console.log('\nPassed ' + passed + '/' + total + ', Failed ' + failed + '/' + total + '.');
  if (failed > 0) {
    console.log('(RED as expected while drawSeverityBlock draws the name unwrapped — the GREEN gate for Task 2.)');
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err);
  process.exit(1);
});
