/**
 * Quick task 260522-iwr -- ordered-list PDF export regression.
 *
 * BUG: a numbered/ordered list typed in the session export editor
 * ("ייצוא מפגש" -> step "עריכה") loses its numbers in the exported PDF.
 * parseMarkdown() in assets/pdf-export.js detects ordered-list lines
 * (/^\s*\d+\.\s+/) but strips the leading ordinal and collapses ordered +
 * unordered lists into a single {type:'list', items:[...]} block with NO
 * ordinal information. The list renderer then hardcodes a "- " bullet
 * prefix for EVERY item -> all numbers are unconditionally lost.
 *
 * This is a runtime-behavior bug (MEMORY: behavior-verification rule --
 * runtime fixes require a falsifiable test that FAILS before the fix and
 * PASSES after; a grep/shape check is NOT sufficient). The test builds a
 * real PDF via PDFExport.buildSessionPDF and walks the page-1 content
 * stream collecting drawn glyph CIDs.
 *
 * --- What the test does ---
 *
 * Step 0 (GID measurement -- runtime, not hard-coded): build a probe PDF
 * whose body is a plain paragraph "1 2 3 ." and read the Heebo Regular
 * CIDs for the digit glyphs "1" "2" "3" and the period "." from the
 * page-1 content stream. This mirrors how pdf-bold-rendering.test.js
 * measured ASTERISK_GID, but does it at runtime so the test stays valid
 * if Heebo is re-vendored.
 *
 * Step 1..3 (fixtures):
 *   1. Ordered list (EN): "1. First item\n2. Second item\n3. Third item"
 *      -- the page-1 stream must contain digit GIDs for 1, 2, 3 each at
 *      least once, AND the unordered-bullet hyphen GID must appear 0
 *      times as a list prefix.
 *   2. Unordered list (regression): "- alpha\n- beta" -- the hyphen
 *      bullet GID must appear (>=2, one per item) and NO digit ordinals.
 *   3. Hebrew ordered list (the user's actual reported case):
 *      "1. תוספתן\n2. עיוות פאציאלי\n3. בדיקה" with opts.uiLang='he'.
 *      Every item shows its ordinal; item 1 is NOT a bullet; items after
 *      item 2 still carry ordinals. The ordinal is an LTR digit run
 *      inside an RTL line -- assert digit GIDs 1/2/3 each appear >=1.
 *
 * Before the fix: Tests 1 and 3 FAIL (ordinals absent). Test 2 PASSES.
 * After the fix: all three PASS.
 *
 * --- Run ---
 *   node tests/quick-260522-iwr-ordered-list-export.test.js
 *   MEASURE_MODE=1 node tests/quick-260522-iwr-ordered-list-export.test.js
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var REPO_ROOT = path.resolve(__dirname, '..');
var MEASURE_MODE = process.env.MEASURE_MODE === '1';

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
// Page-1 content stream walker -- collects every drawn CID in document order,
// attributed to the current font (last `/Fn size Tf`). Verbatim approach from
// tests/pdf-bold-rendering.test.js extractCidsByFont().
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
        allCidsWithFont.push([currentFont, cid]);
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

function countCid(walk, gid) {
  return walk.allCids.filter(function (c) { return c === gid; }).length;
}

async function buildWalk(win, sessionData, opts) {
  var blob = await win.PDFExport.buildSessionPDF(sessionData, opts);
  var ab = await blob.arrayBuffer();
  return extractCidsByFont(Buffer.from(ab));
}

// ---------------------------------------------------------------------------
// Step 0 -- measure the Heebo GIDs for digits 1/2/3, the period ".", and the
// hyphen "-", at runtime (mirrors how pdf-bold-rendering.test.js measured
// ASTERISK_GID, but resolved at runtime so the test stays valid if Heebo is
// re-vendored).
//
// Technique: render each glyph of interest a UNIQUE number of times in a
// single probe paragraph and diff the per-CID counts against a control
// document with the same header but an empty body. Each target glyph is
// emitted with a distinct multiplicity, so the "extra" CID whose delta equals
// that multiplicity is unambiguously that glyph. Bidi reordering and line
// wrapping scramble glyph ORDER but never change glyph COUNTS, so counting is
// robust where positional inference is not.
//
// Multiplicities (all distinct, none collide with letter counts in the probe):
//   "1" x2   "2" x3   "3" x4   "." x5   "-" x6
// The probe also contains a separator letter; we use Hebrew/Latin letters
// only where needed and rely on distinct target multiplicities.
// ---------------------------------------------------------------------------
async function measureGlyphGids() {
  // Control: a header-only document with an empty body. Any CID a probe adds
  // on top of this control's CID counts is a body glyph of that probe.
  var headerData = {
    clientName: 'ZZZ',          // letters only -- no digits / "." / "-"
    sessionDate: '2026-05-08',
    sessionType: 'Online',
    markdown: '',
  };
  var domC = buildJsdomEnv();
  var ctrlWalk = await buildWalk(domC.window, headerData, { uiLang: 'en' });
  domC.window.close();
  var ctrlCounts = {};
  ctrlWalk.allCids.forEach(function (c) { ctrlCounts[c] = (ctrlCounts[c] || 0) + 1; });

  // One ISOLATED probe per glyph: the body is a single repeated-glyph word.
  // The probe adds exactly that glyph (N copies) on top of the control, so
  // the extra CID with the LARGEST positive delta is unambiguously the glyph
  // under test. Counting (not positional inference) is bidi/wrap proof.
  // A leading repeated-"-" or "1." would trip list detection, so each probe
  // body is prefixed with a Latin letter "g" that is identical across probes
  // (its delta cancels out as the largest-delta pick still favours the
  // higher-count glyph -- we use 8 copies of the target so it always wins).
  var PROBES = {
    digit1: 'g11111111',          // "1" x8
    digit2: 'g22222222',          // "2" x8
    digit3: 'g33333333',          // "3" x8
    period: 'g........',          // "." x8
    hyphen: 'g--------',          // "-" x8  (mid-word, not a list marker)
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

    // Largest positive delta vs control = the 8x-repeated target glyph.
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

  // Sanity: all five GIDs must be distinct.
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
// Baseline-diff counting.
//
// The page-1 header (title + meta date) and the page footer (page number)
// draw digit/hyphen glyphs that have NOTHING to do with the list body --
// the meta date "2026-05-08" carries digits + a hyphen, the footer carries
// the page number "1". Counting raw CID occurrences would therefore be
// contaminated by chrome glyphs.
//
// Fix: for every list fixture, also build a BASELINE document with the SAME
// header/footer and a body of the SAME item TEXTS rendered as plain
// paragraphs (no list marker, no ordinal). Header + footer + item-text
// glyphs are byte-identical between fixture and baseline, so
//   listPrefixCount(glyph) = count(fixture, glyph) - count(baseline, glyph)
// isolates exactly the glyphs the LIST PREFIX renderer emitted. The item
// texts deliberately contain no digits and no hyphens, so any digit/hyphen
// in the diff is unambiguously a list prefix.
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

  // ---- Test 1: ordered list (EN) ----------------------------------------
  // Item texts "First item" / "Second item" / "Third item" contain no
  // digits and no hyphens. Baseline renders them as plain paragraphs.
  var t1 = await buildFixtureAndBaseline(
    '1. First item\n2. Second item\n3. Third item',
    'First item\nSecond item\nThird item',
    { uiLang: 'en' });

  if (MEASURE_MODE) {
    console.log('\nFixture 1 (ordered EN): allCids = ' + t1.fixture.allCids.join(' '));
    console.log('Baseline 1 (paras EN) : allCids = ' + t1.baseline.allCids.join(' '));
  }

  check('Test 1 (ordered EN): ordinal digit "1" rendered (first item keeps its number)', function () {
    var n = diffCount(t1.fixture, t1.baseline, gids.digit1);
    assert.ok(n >= 1, 'digit "1" list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected >=1. The first ordered-list item lost its "1." ordinal -- it renders as a bullet.');
  });
  check('Test 1 (ordered EN): ordinal digit "2" rendered', function () {
    var n = diffCount(t1.fixture, t1.baseline, gids.digit2);
    assert.ok(n >= 1, 'digit "2" list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected >=1. Item 2 lost its "2." ordinal.');
  });
  check('Test 1 (ordered EN): ordinal digit "3" rendered (post-item-2 numbering intact)', function () {
    var n = diffCount(t1.fixture, t1.baseline, gids.digit3);
    assert.ok(n >= 1, 'digit "3" list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected >=1. Item 3 lost its "3." ordinal -- post-item-2 numbering broken.');
  });
  check('Test 1 (ordered EN): NO hyphen bullet prefix drawn', function () {
    var n = diffCount(t1.fixture, t1.baseline, gids.hyphen);
    assert.strictEqual(n, 0, 'hyphen list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected 0. An ordered list must not render "- " bullet prefixes.');
  });

  // ---- Test 2: unordered list regression --------------------------------
  // Item texts "alpha" / "beta" -- no digits, no hyphens.
  var t2 = await buildFixtureAndBaseline(
    '- alpha\n- beta',
    'alpha\nbeta',
    { uiLang: 'en' });

  if (MEASURE_MODE) {
    console.log('\nFixture 2 (unordered EN): allCids = ' + t2.fixture.allCids.join(' '));
    console.log('Baseline 2 (paras EN)  : allCids = ' + t2.baseline.allCids.join(' '));
  }

  check('Test 2 (unordered regression): hyphen bullet prefix on each item', function () {
    var n = diffCount(t2.fixture, t2.baseline, gids.hyphen);
    assert.ok(n >= 2, 'hyphen list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected >=2 (one bullet per item). Unordered-list bullets regressed.');
  });
  check('Test 2 (unordered regression): NO digit ordinals drawn', function () {
    var n = diffCount(t2.fixture, t2.baseline, gids.digit1) +
            diffCount(t2.fixture, t2.baseline, gids.digit2) +
            diffCount(t2.fixture, t2.baseline, gids.digit3);
    assert.strictEqual(n, 0, 'digit (1/2/3) list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected 0. An unordered list must not render ordinals.');
  });

  // ---- Test 3: Hebrew ordered list (the user's actual reported case) ----
  // Item texts תוספתן / עיוות פאציאלי / בדיקה -- no digits, no hyphens.
  var t3 = await buildFixtureAndBaseline(
    '1. תוספתן\n2. עיוות פאציאלי\n3. בדיקה',
    'תוספתן\nעיוות פאציאלי\nבדיקה',
    { uiLang: 'he' });

  if (MEASURE_MODE) {
    console.log('\nFixture 3 (ordered HE): allCids = ' + t3.fixture.allCids.join(' '));
    console.log('Baseline 3 (paras HE) : allCids = ' + t3.baseline.allCids.join(' '));
  }

  check('Test 3 (Hebrew ordered): item 1 keeps "1." ordinal (LTR digit survives RTL shaping)', function () {
    var n = diffCount(t3.fixture, t3.baseline, gids.digit1);
    assert.ok(n >= 1, 'digit "1" list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected >=1. First Hebrew ordered-list item renders as a bullet, not "1.".');
  });
  check('Test 3 (Hebrew ordered): item 2 keeps "2." ordinal', function () {
    var n = diffCount(t3.fixture, t3.baseline, gids.digit2);
    assert.ok(n >= 1, 'digit "2" list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected >=1.');
  });
  check('Test 3 (Hebrew ordered): item 3 (post-item-2) keeps "3." ordinal', function () {
    var n = diffCount(t3.fixture, t3.baseline, gids.digit3);
    assert.ok(n >= 1, 'digit "3" list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected >=1. Items after item 2 lose their numbers -- the exact reported symptom.');
  });
  check('Test 3 (Hebrew ordered): NO hyphen bullet prefix drawn', function () {
    var n = diffCount(t3.fixture, t3.baseline, gids.hyphen);
    assert.strictEqual(n, 0, 'hyphen list-prefix count is ' + n +
      ' (fixture-minus-baseline); expected 0. Hebrew ordered list must not render "- " bullet prefixes.');
  });

  if (MEASURE_MODE) {
    process.exit(0);
  }

  var total = passed + failed;
  console.log('\nPassed ' + passed + '/' + total + ', Failed ' + failed + '/' + total + '.');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err);
  process.exit(1);
});
