/**
 * Phase 23 (Plan 23-12) -- inline-bold rendering regression.
 *
 * Replaces the placeholder 23-08 behavior where `stripInlineMarkdown()` simply
 * removed `**X**` markers without rendering any emphasis. The 23-12 path
 * parses inline-bold spans, runs them through bidi reorder + mirror, and
 * emits per-segment doc.text() calls under setFont('Heebo','bold') vs
 * setFont('Heebo','normal') so the bolded word lands in the Heebo Bold font
 * subset while surrounding text lands in the Regular subset.
 *
 * --- What the test does ---
 *
 * For each of 3 fixtures (EN, HE, mixed-script), build a deterministic PDF
 * and walk the page-1 content stream collecting (current_Tf_resource, CID)
 * pairs. The two custom fonts (Heebo Regular, Heebo Bold) register as
 * separate `/Fn` resources in the PDF; jsPDF emits `/Fn size Tf` before each
 * font switch so the active font is recoverable by walking Tf operators in
 * order.
 *
 * Resource numbering note: jsPDF assigns /F1, /F2, /Fn numbers based on
 * registration order. With many built-in fonts (Helvetica, Courier, etc.)
 * preceding our Heebo registrations, the numbers are typically high (F15,
 * F16 at vendoring time). To stay robust against future changes in jsPDF's
 * default-font registration order, the test DERIVES the Regular vs Bold
 * resource names AT RUNTIME from the page-1 title block, which is always
 * drawn in BOLD (the page-1 client-name title — Plan 23-09). That first
 * Tf operator on the page is therefore the BOLD resource; the second
 * distinct Tf is the REGULAR resource. No hard-coded /F15 etc.
 *
 * Per fixture, assertions are:
 *   a. Asterisk floor: the Heebo asterisk GID (0178, measured at 23-12 task
 *      start by rendering '*' in isolation) must appear 0 times in the
 *      page-1 content stream. If `**` markers leak through to render, the
 *      asterisk GID appears -> bug.
 *   b. Bold-font usage: the Bold resource must be used for >= M_bold CIDs,
 *      where M_bold is the codepoint count of the bolded word(s) in the
 *      fixture (fixture A: "summary" = 7 chars; fixture B: "מודגש" = 5;
 *      fixture C: "important" = 9).
 *   c. Regular-font usage: the Regular resource must be used for >= M_reg
 *      CIDs covering the non-bold portion of the body. The floors are
 *      conservative: surrounding regular text minus a few CIDs of slack
 *      for layout / whitespace.
 *
 * --- Run modes ---
 *
 *   node tests/pdf-bold-rendering.test.js                  -- check mode
 *   MEASURE_MODE=1 node tests/pdf-bold-rendering.test.js   -- print all CIDs
 *
 * --- Stability note ---
 *
 * Heebo asterisk GID 0178 measured 2026-05-12 at Plan 23-12 task start.
 * Stable for Heebo Regular v3.100. If Heebo is swapped, REMEASURE by
 * rendering '*' alone and reading the Tj content-stream output.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var REPO_ROOT = path.resolve(__dirname, '..');
var MEASURE_MODE = process.env.MEASURE_MODE === '1';

// Heebo asterisk GID -- if this appears in the content stream, `**` markers
// are leaking through to render.
var ASTERISK_GID = '0178';

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
  win.eval(readAsset('assets/fonts/heebo-bold-base64.js'));

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

// ---------------------------------------------------------------------------
// Page-1 content stream walker.
//
// Returns:
//   { cidsByFont: Map<fontName, string[]>,
//     fontOrder: string[],            // first appearance order
//     allCids: string[],              // every CID in page-1 order
//     allCidsWithFont: Array<[font, cid]> }
//
// Algorithm: scan the content stream byte-by-byte tracking the current font
// (last `/Fn <size> Tf` seen). For each Tj or TJ operator, attribute every
// emitted CID to the current font.
// ---------------------------------------------------------------------------
function extractCidsByFont(buf) {
  var s = buf.toString('latin1');
  var i = s.indexOf('stream');
  var j = s.indexOf('endstream', i);
  var startByte = i + 6;
  if (s[startByte] === '\r') startByte++;
  if (s[startByte] === '\n') startByte++;
  var endByte = j;
  if (s[endByte - 1] === '\n') endByte--;
  if (s[endByte - 1] === '\r') endByte--;
  var content = s.slice(startByte, endByte);

  var cidsByFont = {};
  var fontOrder = [];
  var allCids = [];
  var allCidsWithFont = [];
  var currentFont = null;

  // Token-walker: simple state machine that finds /Fn size Tf, <hex> Tj, and
  // [(...)<hex>(... )<hex>] TJ patterns in order.
  // We use a unified regex that matches either form, in the order they appear.
  // The regex captures three alternatives:
  //   1) /Fn size Tf            (font selection)
  //   2) <hex> Tj                (single hex string draw)
  //   3) [ ... ] TJ              (array draw — extract <hex> chunks inside)
  var combined = /\/(F\d+)\s+\d+(?:\.\d+)?\s+Tf|<([0-9A-Fa-f]+)>\s*Tj|\[([^\]]*)\]\s*TJ/g;
  var m;
  while ((m = combined.exec(content)) !== null) {
    if (m[1] !== undefined) {
      currentFont = m[1];
      if (fontOrder.indexOf(currentFont) < 0) {
        fontOrder.push(currentFont);
        cidsByFont[currentFont] = [];
      }
    } else if (m[2] !== undefined) {
      // Plain Tj
      if (currentFont === null) continue;
      var hex = m[2];
      for (var hi = 0; hi < hex.length; hi += 4) {
        var cid = hex.slice(hi, hi + 4).toUpperCase();
        cidsByFont[currentFont].push(cid);
        allCids.push(cid);
        allCidsWithFont.push([currentFont, cid]);
      }
    } else if (m[3] !== undefined) {
      // TJ array
      if (currentFont === null) continue;
      var inner = m[3];
      var hxRe = /<([0-9A-Fa-f]+)>/g;
      var hm;
      while ((hm = hxRe.exec(inner)) !== null) {
        var hh = hm[1];
        for (var hj = 0; hj < hh.length; hj += 4) {
          var cid2 = hh.slice(hj, hj + 4).toUpperCase();
          cidsByFont[currentFont].push(cid2);
          allCids.push(cid2);
          allCidsWithFont.push([currentFont, cid2]);
        }
      }
    }
  }

  return {
    cidsByFont: cidsByFont,
    fontOrder: fontOrder,
    allCids: allCids,
    allCidsWithFont: allCidsWithFont,
  };
}

// ---------------------------------------------------------------------------
// Resource derivation: the page-1 title block (client name) is always drawn
// in BOLD (Plan 23-09). The FIRST font selected on the page is therefore the
// Bold resource. The next distinct font selected after that is Regular.
// ---------------------------------------------------------------------------
function deriveFontRoles(walk) {
  if (walk.fontOrder.length < 2) {
    throw new Error('Expected at least 2 font resources on page 1 (Bold for title + Regular for meta/body); got ' + walk.fontOrder.length + ': ' + walk.fontOrder.join(', '));
  }
  return {
    bold: walk.fontOrder[0],
    regular: walk.fontOrder[1],
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
var FIXTURES = [
  {
    id: 'A_en',
    label: 'EN paragraph -- inline bold "summary"',
    sessionData: {
      clientName: 'Test',
      sessionDate: '2026-05-08',
      sessionType: 'In-person',
      markdown: 'The session **summary** is below.',
    },
    opts: { uiLang: 'en' },
    boldWord: 'summary',     // 7 chars
    regularBodyCharFloor: 18,   // "The session  is below." minus spaces = ~18 letters/punct
  },
  {
    id: 'B_he',
    label: 'HE paragraph -- inline bold "מודגש"',
    sessionData: {
      clientName: 'בדיקה',
      sessionDate: '2026-05-08',
      sessionType: 'In-person',
      markdown: 'הסיכום **מודגש** כאן.',
    },
    opts: { uiLang: 'he' },
    boldWord: 'מודגש',       // 5 chars
    regularBodyCharFloor: 9,    // "הסיכום כאן." = 6 + 3 + 1 = 10 minus spaces ~ 9
  },
  {
    id: 'C_mixed',
    label: 'Mixed-script -- bold "important" spanning a bidi boundary',
    sessionData: {
      clientName: 'Test',
      sessionDate: '2026-05-08',
      sessionType: 'In-person',
      markdown: '**important** דבר חשוב',
    },
    opts: { uiLang: 'he' },
    boldWord: 'important',   // 9 chars
    regularBodyCharFloor: 7,    // "דבר חשוב" = 8 chars - 1 space = 7 letters
  },
];

// ---------------------------------------------------------------------------
async function main() {
  if (MEASURE_MODE) {
    console.log('--- MEASURE_MODE ---');
  }
  var totalPassed = 0;
  var totalFailed = 0;

  for (var fi = 0; fi < FIXTURES.length; fi++) {
    var fx = FIXTURES[fi];
    var dom = buildJsdomEnv();
    var win = dom.window;
    var blob = await win.PDFExport.buildSessionPDF(fx.sessionData, fx.opts);
    var ab = await blob.arrayBuffer();
    var buf = Buffer.from(ab);
    dom.window.close();

    var walk = extractCidsByFont(buf);
    var roles;
    try {
      roles = deriveFontRoles(walk);
    } catch (err) {
      console.error('[FATAL] Fixture ' + fx.id + ': ' + err.message);
      totalFailed += 3;
      continue;
    }

    if (MEASURE_MODE) {
      console.log('');
      console.log('Fixture ' + fx.id + ' (' + fx.label + ')');
      console.log('  markdown : ' + JSON.stringify(fx.sessionData.markdown));
      console.log('  fonts seen: ' + walk.fontOrder.join(', '));
      console.log('  bold role  : ' + roles.bold + ' (' + (walk.cidsByFont[roles.bold] || []).length + ' CIDs)');
      console.log('  regular role: ' + roles.regular + ' (' + (walk.cidsByFont[roles.regular] || []).length + ' CIDs)');
      console.log('  total CIDs : ' + walk.allCids.length);
      console.log('  asterisk count: ' + walk.allCids.filter(function (c) { return c === ASTERISK_GID; }).length);
      // Print Bold CIDs (excluding the title block, which is also bold).
      // Title block is the FIRST contiguous Bold run; everything after is body.
      var firstNonBoldIdx = -1;
      for (var ai = 0; ai < walk.allCidsWithFont.length; ai++) {
        if (walk.allCidsWithFont[ai][0] !== roles.bold) { firstNonBoldIdx = ai; break; }
      }
      var afterTitle = walk.allCidsWithFont.slice(firstNonBoldIdx);
      var bodyBoldCids = afterTitle.filter(function (p) { return p[0] === roles.bold; }).map(function (p) { return p[1]; });
      console.log('  bold CIDs in body (post-title): ' + bodyBoldCids.length + ' = ' + bodyBoldCids.join(' '));
      continue;
    }

    // --- Assertions ---
    var failed = 0;

    // (a) Asterisk floor
    try {
      var asteriskCount = walk.allCids.filter(function (c) { return c === ASTERISK_GID; }).length;
      assert.strictEqual(asteriskCount, 0,
        'Fixture ' + fx.id + ': asterisk GID ' + ASTERISK_GID + ' appears ' + asteriskCount +
        ' time(s). Inline `**` markers are leaking through to render -- parseInlineBold or' +
        ' the para/list rewire is broken. Expected 0 asterisk glyphs.');
      console.log('[PASS] ' + fx.id + ' (a) asterisk floor: 0 asterisk glyphs (markers stripped)');
      totalPassed++;
    } catch (err) {
      console.error('[FAIL] ' + fx.id + ' (a) asterisk floor:', err.message);
      failed++;
      totalFailed++;
    }

    // (b) Bold floor (post-title body bold count >= M_bold)
    try {
      var titleEndIdx = -1;
      for (var bi = 0; bi < walk.allCidsWithFont.length; bi++) {
        if (walk.allCidsWithFont[bi][0] !== roles.bold) { titleEndIdx = bi; break; }
      }
      if (titleEndIdx < 0) titleEndIdx = walk.allCidsWithFont.length;
      var afterTitleB = walk.allCidsWithFont.slice(titleEndIdx);
      var bodyBoldCount = afterTitleB.filter(function (p) { return p[0] === roles.bold; }).length;
      var expectedBoldFloor = fx.boldWord.length;
      assert.ok(bodyBoldCount >= expectedBoldFloor,
        'Fixture ' + fx.id + ': body bold-font CID count ' + bodyBoldCount +
        ' < floor ' + expectedBoldFloor + ' for bold word ' + JSON.stringify(fx.boldWord) +
        '. The bolded word is not being rendered in Heebo Bold. Runs found by font: ' +
        Object.keys(walk.cidsByFont).map(function (k) {
          return k + '=' + (walk.cidsByFont[k] || []).length;
        }).join(', ') + '. Bold role=' + roles.bold + ', regular role=' + roles.regular + '.');
      console.log('[PASS] ' + fx.id + ' (b) bold body usage: ' + bodyBoldCount + ' >= ' + expectedBoldFloor + ' (word=' + JSON.stringify(fx.boldWord) + ')');
      totalPassed++;
    } catch (err) {
      console.error('[FAIL] ' + fx.id + ' (b) bold body usage:', err.message);
      failed++;
      totalFailed++;
    }

    // (c) Regular floor
    try {
      var regularCount = (walk.cidsByFont[roles.regular] || []).length;
      var expectedRegFloor = fx.regularBodyCharFloor;
      assert.ok(regularCount >= expectedRegFloor,
        'Fixture ' + fx.id + ': regular-font CID count ' + regularCount +
        ' < floor ' + expectedRegFloor + '. Either the regular run is broken or' +
        ' Heebo Regular is not being selected on the body. Runs found: ' +
        Object.keys(walk.cidsByFont).map(function (k) {
          return k + '=' + (walk.cidsByFont[k] || []).length;
        }).join(', '));
      console.log('[PASS] ' + fx.id + ' (c) regular usage: ' + regularCount + ' >= ' + expectedRegFloor);
      totalPassed++;
    } catch (err) {
      console.error('[FAIL] ' + fx.id + ' (c) regular usage:', err.message);
      failed++;
      totalFailed++;
    }
  }

  if (MEASURE_MODE) {
    process.exit(0);
  }

  console.log('Passed ' + totalPassed + '/9, Failed ' + totalFailed + '/9.');
  process.exit(totalFailed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err);
  process.exit(1);
});
