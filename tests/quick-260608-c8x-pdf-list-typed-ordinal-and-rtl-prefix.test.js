/**
 * Quick task 260608-c8x -- PDF ordered-list typed-ordinal preservation + RTL
 * list-prefix x-anchor for English-starting content.
 *
 * Two bugs left over from quick task 260522-iwr (which fixed "ordinals lost
 * entirely"):
 *
 * BUG A -- typed ordinal lost when items are paragraph-separated.
 *   parseMarkdown() groups CONTIGUOUS list lines into one {type:'list'} block.
 *   When the user types
 *     "1. תוספתן" / paragraph / "2. עיוות פאציאלי" / paragraph / "3. חלל האף"
 *   the parser emits THREE separate single-item list blocks, and the renderer
 *   prefix derives the ordinal from (li + 1) within each block -- so every item
 *   renders as "1. ". The fix carries the TYPED ordinal on each item.
 *
 * BUG B -- RTL list-prefix lands on left margin when item content is English.
 *   In an RTL (uiLang=he) document, drawSegmentedLine reconstructs prefix +
 *   content into one logical line and runs firstStrongDir() over the WHOLE
 *   line. For "3. Latin term: appendix" the first strong-direction codepoint
 *   is the L of "Latin", so the row shapes as one LTR run and is drawn starting
 *   at x = rightX - totalW. The visual order then leaves the digits + period at
 *   the LEFT end of the row (which on page = MARGIN_X). The fix anchors the
 *   prefix at PAGE_W - MARGIN_X (right margin) regardless of content
 *   direction.
 *
 * This is runtime-behavior code. Per the project's behavior-verification
 * rule, BOTH bugs require falsifiable runtime tests against an actually-built
 * PDF -- grep/shape checks are NOT sufficient.
 *
 * --- Approach ---
 *
 * Bug A uses the same page-1 content-stream digit-glyph CID counting strategy
 * as tests/quick-260522-iwr-ordered-list-export.test.js: build a fixture PDF
 * + a baseline PDF whose body is the same item TEXTS as plain paragraphs (no
 * markers), then count digit GIDs as fixture-minus-baseline. Item texts contain
 * no digits and no hyphens, so any digit in the diff is a list prefix.
 *
 * Bug B uses jsPDF.prototype.text() monkey-patching. The list renderer calls
 * doc.text() per visual run; we capture every call's (text, x, y) tuple, find
 * the two list-row y values by identifying calls containing the digit GIDs
 * measured at runtime, and assert the row's prefix-call x is near the right
 * margin (524 ±50pt) -- not near the left margin (71).
 *
 * --- Run ---
 *   node tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js
 *   MEASURE_MODE=1 node tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js
 *
 * --- RED expectations (current code, BEFORE fix) ---
 *   PASS: Test A1 (digit "1" delta == 1 -- on current code first item is "1.")
 *         WAIT: on current code ALL three are "1.", so digit-1 delta == 3, NOT 1.
 *         => A1 FAILS on current code too (expected ==1, gets 3).
 *   FAIL: Test A2 (digit "2" delta == 0; expected >= 1)
 *   FAIL: Test A3 (digit "3" delta == 0; expected >= 1)
 *   PASS: Test A4 (period delta == 3 -- there are still 3 prefixes "1. " each)
 *   PASS: Test A5 (no hyphens -- ordered list)
 *   PASS: Test B1 (row-1 prefix x near right margin -- Hebrew-starting row works)
 *   FAIL: Test B2 (row-2 prefix x near right margin -- but content starts LTR
 *                  so prefix lands at left margin)
 *   PASS: Test B3 (row-2 prefix x NOT in [66, 121] -- on current code it IS in
 *                  that range, so B3 FAILS too)
 *   PASS: Test B4 (LTR doc unchanged)
 *
 * --- GREEN expectations (after fix) ---
 *   All A1..A5 and B1..B4 pass.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var REPO_ROOT = path.resolve(__dirname, '..');
var MEASURE_MODE = process.env.MEASURE_MODE === '1';

// Deterministic-PDF pin values (mirrors quick-260522-iwr)
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
// jsdom env -- mirrors quick-260522-iwr-ordered-list-export.test.js.
// Adds a doc.text() monkey-patch hook used by Bug B for per-call (text, x, y)
// capture. The hook is installed on jsPDF.prototype via WrappedJsPDF below.
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

  // Optional doc.text() capture buffer. When `opts.captureText` is a function,
  // every doc.text() call on a new jsPDF instance is wrapped to forward
  // (text, x, y, opts) to the capture function before invoking the original.
  // We wrap per-instance (NOT on the prototype) because jsPDF defines `text`
  // as a plain instance method via `API.text = ...` assignment that may not
  // be a prototype property at the time of patching.
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

// ---------------------------------------------------------------------------
// Page-1 content-stream walker -- verbatim from quick-260522-iwr.
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
  var currentFont = null;

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
      if (currentFont === null) continue;
      var hex = m[2];
      for (var hi = 0; hi < hex.length; hi += 4) {
        var cid = hex.slice(hi, hi + 4).toUpperCase();
        cidsByFont[currentFont].push(cid);
        allCids.push(cid);
      }
    } else if (m[3] !== undefined) {
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
        }
      }
    }
  }

  return { cidsByFont: cidsByFont, fontOrder: fontOrder, allCids: allCids };
}

function countCid(walk, gid) {
  return walk.allCids.filter(function (c) { return c === gid; }).length;
}

async function buildBlob(win, sessionData, opts) {
  return win.PDFExport.buildSessionPDF(sessionData, opts);
}

async function blobToBuffer(blob) {
  var ab = await blob.arrayBuffer();
  return Buffer.from(ab);
}

async function buildWalk(win, sessionData, opts) {
  var blob = await buildBlob(win, sessionData, opts);
  var buf = await blobToBuffer(blob);
  return extractCidsByFont(buf);
}

// ---------------------------------------------------------------------------
// Glyph GID measurement -- verbatim approach from quick-260522-iwr.
// Each probe body is "g" + target glyph x8; the largest positive CID delta
// vs a header-only control identifies that glyph's GID. Multiplicity 8 is
// large enough to dominate any incidental count noise.
// ---------------------------------------------------------------------------
async function measureGlyphGids() {
  var domC = buildJsdomEnv();
  var ctrlWalk = await buildWalk(domC.window, {
    clientName: 'ZZZ',
    sessionDate: '2026-05-08',
    sessionType: 'Online',
    markdown: '',
  }, { uiLang: 'en' });
  domC.window.close();
  var ctrlCounts = {};
  ctrlWalk.allCids.forEach(function (c) { ctrlCounts[c] = (ctrlCounts[c] || 0) + 1; });

  var PROBES = {
    digit1: 'g11111111',
    digit2: 'g22222222',
    digit3: 'g33333333',
    period: 'g........',
    hyphen: 'g--------',
  };
  var gids = {};
  for (var name in PROBES) {
    if (!PROBES.hasOwnProperty(name)) continue;
    var domP = buildJsdomEnv();
    var probeWalk = await buildWalk(domP.window, {
      clientName: 'ZZZ',
      sessionDate: '2026-05-08',
      sessionType: 'Online',
      markdown: PROBES[name],
    }, { uiLang: 'en' });
    domP.window.close();
    var probeCounts = {};
    probeWalk.allCids.forEach(function (c) { probeCounts[c] = (probeCounts[c] || 0) + 1; });

    var bestCid = null;
    var bestDelta = 0;
    Object.keys(probeCounts).forEach(function (c) {
      var delta = probeCounts[c] - (ctrlCounts[c] || 0);
      if (delta > bestDelta) { bestDelta = delta; bestCid = c; }
    });
    if (bestCid === null || bestDelta < 8) {
      throw new Error('measureGlyphGids: glyph "' + name + '" probe added max delta ' +
        bestDelta + ' (expected >=8). Probe body=' + JSON.stringify(PROBES[name]));
    }
    gids[name] = bestCid;
  }

  // GID-collision sanity.
  var seen = {};
  Object.keys(gids).forEach(function (k) {
    if (seen[gids[k]]) {
      throw new Error('measureGlyphGids: GID collision -- ' + k + ' and ' +
        seen[gids[k]] + ' both map to ' + gids[k]);
    }
    seen[gids[k]] = k;
  });

  if (MEASURE_MODE) {
    console.log('--- MEASURE_MODE: glyph GIDs ---');
    console.log('  digit1 (1)   : ' + gids.digit1);
    console.log('  digit2 (2)   : ' + gids.digit2);
    console.log('  digit3 (3)   : ' + gids.digit3);
    console.log('  period (.)   : ' + gids.period);
    console.log('  hyphen (-)   : ' + gids.hyphen);
  }
  return gids;
}

// ---------------------------------------------------------------------------
// Fixture / baseline diff helpers (Bug A only).
// ---------------------------------------------------------------------------
function diffCount(fixtureWalk, baselineWalk, gid) {
  return countCid(fixtureWalk, gid) - countCid(baselineWalk, gid);
}

async function buildFixtureAndBaseline(markdown, baselineBody, opts) {
  var domF = buildJsdomEnv();
  var fixture = await buildWalk(domF.window, {
    clientName: 'ZZZ', sessionDate: '2026-05-08', sessionType: 'Online',
    markdown: markdown,
  }, opts);
  domF.window.close();

  var domB = buildJsdomEnv();
  var baseline = await buildWalk(domB.window, {
    clientName: 'ZZZ', sessionDate: '2026-05-08', sessionType: 'Online',
    markdown: baselineBody,
  }, opts);
  domB.window.close();

  return { fixture: fixture, baseline: baseline };
}

// ---------------------------------------------------------------------------
// Bug B helper -- run a build that captures every doc.text() call with the
// passed-in `text` argument INTACT. The list renderer passes already-shaped
// visual strings (from shapeForJsPdfWithMap) to doc.text(). For Heebo glyphs
// the visual string is the actual hex-CID sequence; for ASCII-only runs (the
// LTR digit prefix "N. ") it is the plain ASCII text. We then identify
// "prefix calls" by their (a) text content (contains the row's digit char) and
// (b) y value (a single row's y is shared by all of its draw calls).
// ---------------------------------------------------------------------------
async function buildWithTextCapture(sessionData, opts, captureBuf) {
  var dom = buildJsdomEnv({ captureText: function (rec) { captureBuf.push(rec); } });
  var blob = await buildBlob(dom.window, sessionData, opts);
  await blobToBuffer(blob); // ensure full render path completes
  dom.window.close();
}

// Given the captured calls, find calls that carry the LIST PREFIX for a given
// ordinal digit ("1", "2", "3"). The list renderer emits each row as one or
// more doc.text() calls with already-shaped visual strings.
//
// Two possible call shapes for the prefix:
//   (a) After the fix (Option 1 split-row): a SHORT call -- text is roughly
//       "N. " (≤6 chars) -- containing the digit and the period. The call's
//       x is the digit's x directly.
//   (b) Before the fix OR if the prefix is fused into the row: a LONG call
//       whose text contains the digit + period somewhere inside. The
//       digit's position within the call must be inferred from its char
//       index in the visual text.
//
// We return BOTH shapes and let the caller assert on positional invariants.
//
// NOTE: Heebo Hebrew glyph runs reach doc.text() with the actual rendered
// codepoints (bidi-js maps them in input order, jsPDF then uses Heebo's
// CMap to encode them in the PDF). They appear as Hebrew chars in the
// captured `text` string -- not as hex. So a row whose content is Hebrew
// produces a long mixed string like "ןתפסות .1". The ASCII digit + period
// remain searchable as plain characters in such strings.
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
      isDigitAtStart: di === 0,
      isDigitAtEnd: di >= t.length - 3, // digit at or near end of visual text
    });
  }
  return matched;
}

// Compute the digit's effective x position in document coordinates given a
// matched prefix entry. We use a proxy strategy that does not require font-
// width measurement in the test (which would need a live jsPDF doc):
//   - Short prefix call (text like "N. "): digit_x = call.x (digit is at idx 0)
//   - Long call, digit at index 0: digit_x = call.x (digit at the call's
//     left edge -- precisely the Bug B failure for LTR-shaped rows)
//   - Long call, digit near the end of the visual text: digit_x is near the
//     RIGHT edge of the call. The right edge for an RTL doc is the rightX
//     anchor (PAGE_W - MARGIN_X = 524) regardless of content -- so we return
//     PAGE_W - MARGIN_X as the digit's effective position. (This proxy is
//     not exact, but it's correct to within a few pt -- a digit glyph is
//     ~4-7pt wide, and the assertion uses ±50pt tolerance.)
//   - Long call, digit in the middle: we cannot infer cheaply -- return
//     null to flag the caller to look harder.
function effectiveDigitX(entry, rightAnchorX) {
  if (entry.isShortPrefixCall) return entry.call.x;
  if (entry.isDigitAtStart) return entry.call.x;
  if (entry.isDigitAtEnd) return rightAnchorX - 5; // a few pt left of the right margin
  return null;
}

// ---------------------------------------------------------------------------
async function main() {
  var gids;
  try {
    gids = await measureGlyphGids();
  } catch (err) {
    console.error('FATAL: glyph GID measurement failed: ' + err.message);
    process.exit(1);
  }

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
  // BUG A -- typed-ordinal preservation across paragraph-separated items
  // ============================================================
  //
  // Fixture: the exact user-reported repro -- three Hebrew numbered items
  // each separated by an explanatory paragraph. Baseline body uses the same
  // item texts and paragraph texts as plain paragraphs so the only delta
  // between fixture and baseline is the LIST-PREFIX glyphs the renderer
  // emits.
  //
  // Per the plan: A1 asserts the CORRECTED behavior -- exactly one "1.",
  // not three. On current (RED) code each block re-uses ordinal 1, so the
  // diff for digit1 = 3 (FAIL: expected ==1, got 3) and diff for digit2 +
  // digit3 = 0 (FAIL: expected >=1).
  var fixtureA =
    '1. תוספתן\n' +
    '\n' +
    'הסבר על האיבר הראשון.\n' +
    '\n' +
    '2. עיוות פאציאלי\n' +
    '\n' +
    'הסבר על האיבר השני.\n' +
    '\n' +
    '3. חלל האף';
  // Baseline: same per-line texts as plain paragraphs (no markers, no
  // ordinals). The item texts (תוספתן / עיוות פאציאלי / חלל האף) and the
  // explanatory paragraphs all contain no digits and no hyphens, so any
  // digit/hyphen in the fixture-baseline diff is unambiguously a list
  // prefix glyph.
  var baselineA =
    'תוספתן\n' +
    'הסבר על האיבר הראשון.\n' +
    'עיוות פאציאלי\n' +
    'הסבר על האיבר השני.\n' +
    'חלל האף';
  var tA = await buildFixtureAndBaseline(fixtureA, baselineA, { uiLang: 'he' });

  if (MEASURE_MODE) {
    console.log('\n[Bug A] Fixture allCids = ' + tA.fixture.allCids.join(' '));
    console.log('[Bug A] Baseline allCids = ' + tA.baseline.allCids.join(' '));
    console.log('[Bug A] digit1 diff = ' + diffCount(tA.fixture, tA.baseline, gids.digit1));
    console.log('[Bug A] digit2 diff = ' + diffCount(tA.fixture, tA.baseline, gids.digit2));
    console.log('[Bug A] digit3 diff = ' + diffCount(tA.fixture, tA.baseline, gids.digit3));
    console.log('[Bug A] period diff = ' + diffCount(tA.fixture, tA.baseline, gids.period));
    console.log('[Bug A] hyphen diff = ' + diffCount(tA.fixture, tA.baseline, gids.hyphen));
  }

  check('Test A1 (Bug A, RTL): digit "1" list-prefix count == 1 (only item 1, NOT all three)', function () {
    var n = diffCount(tA.fixture, tA.baseline, gids.digit1);
    assert.strictEqual(n, 1, 'digit "1" list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected 1. If 3, every item was renumbered to "1." (Bug A).');
  });
  check('Test A2 (Bug A, RTL): digit "2" list-prefix count >= 1 (item 2 keeps its "2.")', function () {
    var n = diffCount(tA.fixture, tA.baseline, gids.digit2);
    assert.ok(n >= 1, 'digit "2" list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected >=1. Item 2 lost its typed "2." ordinal -- Bug A.');
  });
  check('Test A3 (Bug A, RTL): digit "3" list-prefix count >= 1 (item 3 -- "חלל האף" -- keeps its "3.")', function () {
    var n = diffCount(tA.fixture, tA.baseline, gids.digit3);
    assert.ok(n >= 1, 'digit "3" list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected >=1. Item 3 lost its typed "3." ordinal -- the exact reported symptom (Bug A).');
  });
  check('Test A4 (Bug A, RTL): period "." list-prefix count == 3 (one per item)', function () {
    var n = diffCount(tA.fixture, tA.baseline, gids.period);
    assert.strictEqual(n, 3, 'period list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected 3 (one "N. " prefix per ordered-list item).');
  });
  check('Test A5 (Bug A, RTL): hyphen list-prefix count == 0 (no bullets in an ordered list)', function () {
    var n = diffCount(tA.fixture, tA.baseline, gids.hyphen);
    assert.strictEqual(n, 0, 'hyphen list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected 0. An ordered list must not render "- " bullets.');
  });

  // ============================================================
  // BUG B -- RTL list-prefix x-anchor for English-starting content
  // ============================================================
  //
  // Fixture: two-item contiguous ordered list in an RTL doc. Item 1 starts
  // with Hebrew (firstStrongDir(prefix+content) = RTL -- works on current
  // code). Item 2 starts with English (firstStrongDir(prefix+content) = LTR
  // on current code -- prefix lands at LEFT margin).
  //
  // Capture every doc.text() call with (text, x, y). The list renderer
  // emits the prefix run as a separate run on FIXED code (split-row), or
  // as the leftmost-shaped run on baseDir-fix code; in both cases the
  // doc.text() call's `text` is the visual ASCII "N. " (digits + period
  // are LTR even inside an RTL paragraph).
  //
  // For each list row, the row's y coordinate is the same across all its
  // runs. We identify the prefix call for each row by matching the ASCII
  // digit ("1" for row 1, "2" for row 2) in the captured text.
  var fixtureBMarkdown =
    '1. תוספתן\n' +
    '2. Latin term: appendix';
  var captureB = [];
  await buildWithTextCapture({
    clientName: 'ZZZ', sessionDate: '2026-05-08', sessionType: 'Online',
    markdown: fixtureBMarkdown,
  }, { uiLang: 'he' }, captureB);

  if (MEASURE_MODE) {
    console.log('\n[Bug B] doc.text() calls captured = ' + captureB.length);
    captureB.forEach(function (rec, idx) {
      var safeText = (typeof rec.text === 'string' && rec.text.length < 60)
        ? rec.text : '<' + (rec.text && rec.text.length) + ' chars>';
      console.log('  [' + idx + '] x=' + rec.x.toFixed(1) + ' y=' + rec.y.toFixed(1) +
        ' text=' + JSON.stringify(safeText));
    });
  }

  var prefix1Entries = findPrefixCallsForDigit(captureB, '1');
  var prefix2Entries = findPrefixCallsForDigit(captureB, '2');

  // Bug B test setup sanity: we MUST find at least one prefix-call per row.
  if (prefix1Entries.length === 0 || prefix2Entries.length === 0) {
    console.error('FATAL: Bug B prefix-call discovery failed (row1 matches: ' +
      prefix1Entries.length + ', row2 matches: ' + prefix2Entries.length +
      '). Re-run with MEASURE_MODE=1 to dump captured text calls.');
    process.exit(1);
  }

  // Row 1 = lowest-y match for digit "1". Row 2 = lowest-y match for digit "2".
  // (jsPDF y grows downward; first list-row has the smaller y.)
  // Prefer SHORT prefix-only calls (post-fix shape) over long fused calls if
  // BOTH share the same y -- a short prefix-only call is unambiguous, while
  // a fused call requires positional inference.
  prefix1Entries.sort(function (a, b) {
    if (a.call.y !== b.call.y) return a.call.y - b.call.y;
    return (a.isShortPrefixCall ? -1 : 1) - (b.isShortPrefixCall ? -1 : 1);
  });
  prefix2Entries.sort(function (a, b) {
    if (a.call.y !== b.call.y) return a.call.y - b.call.y;
    return (a.isShortPrefixCall ? -1 : 1) - (b.isShortPrefixCall ? -1 : 1);
  });
  var row1Entry = prefix1Entries[0];
  var row2Entry = prefix2Entries[0];

  var row1DigitX = effectiveDigitX(row1Entry, RIGHT_X);
  var row2DigitX = effectiveDigitX(row2Entry, RIGHT_X);

  if (MEASURE_MODE) {
    console.log('[Bug B] row1 entry: call.x=' + row1Entry.call.x.toFixed(2) +
      ' y=' + row1Entry.call.y.toFixed(2) +
      ' text=' + JSON.stringify(row1Entry.text) +
      ' digitIdx=' + row1Entry.digitIndex +
      ' short=' + row1Entry.isShortPrefixCall +
      ' digitAtEnd=' + row1Entry.isDigitAtEnd +
      ' => digitX=' + row1DigitX);
    console.log('[Bug B] row2 entry: call.x=' + row2Entry.call.x.toFixed(2) +
      ' y=' + row2Entry.call.y.toFixed(2) +
      ' text=' + JSON.stringify(row2Entry.text) +
      ' digitIdx=' + row2Entry.digitIndex +
      ' short=' + row2Entry.isShortPrefixCall +
      ' digitAtStart=' + row2Entry.isDigitAtStart +
      ' => digitX=' + row2DigitX);
  }

  // Anchor tolerance: ±50pt from the right margin (474..529). Digit glyph
  // width is small (~5-7pt), so the digit's effective x is within ~5pt of
  // the right margin when the prefix is right-anchored.
  var RIGHT_MIN = RIGHT_X - 50; // 474
  var RIGHT_MAX = RIGHT_X + 5;  // 529 -- tiny upper tolerance for fp noise

  check('Test B1 (Bug B sanity, RTL): row-1 digit (Hebrew content) effective x near right margin', function () {
    assert.notStrictEqual(row1DigitX, null,
      'row-1 digit position could not be inferred. Re-run with MEASURE_MODE=1.');
    assert.ok(row1DigitX >= RIGHT_MIN && row1DigitX <= RIGHT_MAX,
      'row-1 digit effective x=' + (row1DigitX === null ? 'null' : row1DigitX.toFixed(2)) +
      '; expected in [' + RIGHT_MIN + ', ' + RIGHT_MAX + '] (near right margin ' + RIGHT_X + '). ' +
      'Baseline -- Hebrew-content row anchors right on current code.');
  });
  check('Test B2 (Bug B core, RTL): row-2 digit (English-starting content) effective x near right margin', function () {
    assert.notStrictEqual(row2DigitX, null,
      'row-2 digit position could not be inferred. Re-run with MEASURE_MODE=1.');
    assert.ok(row2DigitX >= RIGHT_MIN && row2DigitX <= RIGHT_MAX,
      'row-2 digit effective x=' + (row2DigitX === null ? 'null' : row2DigitX.toFixed(2)) +
      '; expected in [' + RIGHT_MIN + ', ' + RIGHT_MAX + '] (near right margin ' + RIGHT_X + '). ' +
      'If x is far below 474, the row shaped as one LTR run and dragged the prefix toward the left margin (Bug B).');
  });
  check('Test B3 (Bug B negative guard, RTL): row-2 digit NOT on the left margin', function () {
    assert.ok(row2DigitX === null || !(row2DigitX >= MARGIN_X - 5 && row2DigitX <= MARGIN_X + 50),
      'row-2 digit effective x=' + (row2DigitX === null ? 'null' : row2DigitX.toFixed(2)) +
      '; expected NOT in [' + (MARGIN_X - 5) + ', ' + (MARGIN_X + 50) + '] (NOT near left margin ' + MARGIN_X + '). ' +
      'The prefix collapsed onto the left margin -- the precise Bug B failure mode.');
  });

  // ============================================================
  // Bug B LTR regression guard
  // ============================================================
  //
  // Same two-item shape but uiLang=en. On both current and fixed code the
  // prefix must hug the LEFT margin -- the fix must not flip the LTR path.
  var fixtureBLtrMarkdown = '1. First\n2. Second';
  var captureBLtr = [];
  await buildWithTextCapture({
    clientName: 'ZZZ', sessionDate: '2026-05-08', sessionType: 'Online',
    markdown: fixtureBLtrMarkdown,
  }, { uiLang: 'en' }, captureBLtr);

  if (MEASURE_MODE) {
    console.log('\n[Bug B LTR] doc.text() calls captured = ' + captureBLtr.length);
    captureBLtr.forEach(function (rec, idx) {
      var safeText = (typeof rec.text === 'string' && rec.text.length < 60)
        ? rec.text : '<' + (rec.text && rec.text.length) + ' chars>';
      console.log('  [' + idx + '] x=' + rec.x.toFixed(1) + ' y=' + rec.y.toFixed(1) +
        ' text=' + JSON.stringify(safeText));
    });
  }

  var prefix1EntriesLtr = findPrefixCallsForDigit(captureBLtr, '1');
  var prefix2EntriesLtr = findPrefixCallsForDigit(captureBLtr, '2');
  if (prefix1EntriesLtr.length === 0 || prefix2EntriesLtr.length === 0) {
    console.error('FATAL: Bug B LTR prefix-call discovery failed (row1 matches: ' +
      prefix1EntriesLtr.length + ', row2 matches: ' + prefix2EntriesLtr.length + ').');
    process.exit(1);
  }
  // For LTR docs the row is one anchored-left call; the digit is at index 0
  // (or in a short prefix-only call if Option 1 is also applied to LTR --
  // but Option 1 is RTL-only, so on both current and fixed code the LTR
  // path produces a single call with the digit at index 0). Either way,
  // effectiveDigitX returns the call's x.
  prefix1EntriesLtr.sort(function (a, b) {
    if (a.call.y !== b.call.y) return a.call.y - b.call.y;
    return (a.isShortPrefixCall ? -1 : 1) - (b.isShortPrefixCall ? -1 : 1);
  });
  prefix2EntriesLtr.sort(function (a, b) {
    if (a.call.y !== b.call.y) return a.call.y - b.call.y;
    return (a.isShortPrefixCall ? -1 : 1) - (b.isShortPrefixCall ? -1 : 1);
  });
  var row1EntryLtr = prefix1EntriesLtr[0];
  var row2EntryLtr = prefix2EntriesLtr[0];
  var row1DigitXLtr = effectiveDigitX(row1EntryLtr, RIGHT_X);
  var row2DigitXLtr = effectiveDigitX(row2EntryLtr, RIGHT_X);

  if (MEASURE_MODE) {
    console.log('[Bug B LTR] row1 entry: call.x=' + row1EntryLtr.call.x.toFixed(2) +
      ' y=' + row1EntryLtr.call.y.toFixed(2) +
      ' text=' + JSON.stringify(row1EntryLtr.text) +
      ' => digitX=' + row1DigitXLtr);
    console.log('[Bug B LTR] row2 entry: call.x=' + row2EntryLtr.call.x.toFixed(2) +
      ' y=' + row2EntryLtr.call.y.toFixed(2) +
      ' text=' + JSON.stringify(row2EntryLtr.text) +
      ' => digitX=' + row2DigitXLtr);
  }

  // LEFT margin tolerance: digit at start of LTR-shaped row sits at call.x =
  // MARGIN_X (71). Small tolerance.
  var LEFT_MIN = LEFT_X - 1;  // 70
  var LEFT_MAX = LEFT_X + 50; // 121
  check('Test B4 (Bug B regression guard, LTR): row-1 digit effective x near left margin (LTR doc unchanged)', function () {
    assert.notStrictEqual(row1DigitXLtr, null,
      'row-1 LTR digit position could not be inferred. Re-run with MEASURE_MODE=1.');
    assert.ok(row1DigitXLtr >= LEFT_MIN && row1DigitXLtr <= LEFT_MAX,
      'row-1 LTR digit effective x=' + (row1DigitXLtr === null ? 'null' : row1DigitXLtr.toFixed(2)) +
      '; expected in [' + LEFT_MIN + ', ' + LEFT_MAX + '] (near left margin ' + LEFT_X + ').');
  });
  check('Test B4b (Bug B regression guard, LTR): row-2 digit effective x near left margin (LTR doc unchanged)', function () {
    assert.notStrictEqual(row2DigitXLtr, null,
      'row-2 LTR digit position could not be inferred. Re-run with MEASURE_MODE=1.');
    assert.ok(row2DigitXLtr >= LEFT_MIN && row2DigitXLtr <= LEFT_MAX,
      'row-2 LTR digit effective x=' + (row2DigitXLtr === null ? 'null' : row2DigitXLtr.toFixed(2)) +
      '; expected in [' + LEFT_MIN + ', ' + LEFT_MAX + '] (near left margin ' + LEFT_X + ').');
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
