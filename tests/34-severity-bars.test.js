/**
 * Phase 34 (Plan 34-04, Wave 0) — D-08 / Severity / PDFX-01: two-bar severity
 * geometry, flat fills, NO opacity graphics-state op.
 *
 * RED-NOW render-tier gate authored BEFORE the implementation (project hard rule
 * `feedback-behavior-verification`). Expected to FAIL today; becomes the GREEN gate
 * for 34-09 (drawSeverityBlock) once buildSessionPDF consumes the structured
 * `issues[]` input and draws the per-complaint two-bar block.
 *
 * --- The contract under test (UI-SPEC §5, D-08) ---
 *   Each complaint row draws three filled shapes on a shared 0–10 track:
 *     • track   — light mint-soft `#eef7ea`, 118pt × 8pt (radius 4pt)
 *     • before  — a FLAT red fill (pre-lightened `≈#ee6a6a`, NOT GState opacity),
 *                 width = before/10 × track
 *     • after   — a flat green fill `#2fb37d`, width = after/10 × track (shorter)
 *   The renderer must stay DETERMINISTIC: NO `GState({opacity})` / ExtGState alpha
 *   op may appear in the content stream (FLAG-6 → pre-lightened flat hex).
 *
 * --- What this test does ---
 *   Passes a structured issue [{name, before:8, after:3}] straight into
 *   buildSessionPDF, walks the page-1 content stream, and reconstructs every
 *   FILLED shape's bounding box + fill colour from the path + `rg`/`re`/`f`
 *   operators. It then isolates the severity bars by SIGNATURE — a light track
 *   fill that CONTAINS a reddish fill (the "before" barline) AND a light track
 *   fill that CONTAINS a greenish fill (the "after" barline). Per UI-SPEC §5 the
 *   two barlines are stacked on their own equal-width tracks, so a colored fill
 *   is matched against ITS OWN track. This isolates the bars from header / card /
 *   pill / footer surfaces (also light) and the leaf-diamond bullet (also
 *   greenish) — none of which is a light track CONTAINING a saturated fill.
 *
 * --- Assertions ---
 *   1. The severity signature exists: a light track containing a reddish
 *      (before) fill AND a light track containing a greenish (after) fill.
 *      RED now: structured issues are ignored, so no such fills are drawn.
 *   2. Proportional widths: before/track ≈ 0.8, after/track ≈ 0.3 (ratio-based →
 *      scale-invariant, tolerant of exact pt), and before-fill WIDTH > after-fill
 *      WIDTH for 8 vs 3.
 *   3. Determinism: NO ExtGState (`/ExtGState`) in the PDF and NO `gs`
 *      graphics-state operator in the content stream — the before bar must be a
 *      flat hex, not a 0.85-opacity GState (D-08 / FLAG-6).
 *
 * --- Falsifiability ---
 *   • A single-gauge / no-bars renderer (or one that keeps severity in the
 *     markdown body) drops the red+green-in-track signature → fails (1).
 *   • Equal-width or inverted bars, or fills not proportional to value/10, fail (2).
 *   • Re-introducing `GState({opacity:0.85})` for the before bar emits an
 *     ExtGState alpha op → fails (3).
 *   Colour assertions are HUE-tolerant (reddish / greenish / light) per the plan,
 *   but STRICT on "flat fill, no alpha op".
 *
 * --- Stub <script> per dep ---
 *   jsdom never fires load/error for an appended <script src>, so pdf-export.js's
 *   loadScriptOnce would hang; inject src-matching stubs (real lib code is already
 *   eval'd by buildJsdomEnv). Mirrors the sibling 34-rtl-newblocks harness.
 *
 *   node tests/34-severity-bars.test.js   -- exit 0 = pass, exit 1 = RED/fail
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var buildJsdomEnv = require('./_helpers/jsdom-pdf-env').buildJsdomEnv;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

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

var BEFORE_VALUE = 8;
var AFTER_VALUE = 3;
var EPS = 1.5;       // containment / geometry tolerance (pt-space)
var RATIO_TOL = 0.12; // width/track ratio tolerance

// Extract the page-1 (first) content stream from a raw PDF buffer (same stream
// discovery the digit-order / glyph-coverage tests use).
function firstContentStream(buf) {
  var s = buf.toString('latin1');
  var i = s.indexOf('stream');
  if (i < 0) return '';
  var j = s.indexOf('endstream', i);
  if (j < 0) return '';
  var startByte = i + 6;
  if (s[startByte] === '\r') startByte++;
  if (s[startByte] === '\n') startByte++;
  var endByte = j;
  if (s[endByte - 1] === '\n') endByte--;
  if (s[endByte - 1] === '\r') endByte--;
  return s.slice(startByte, endByte);
}

function isNum(t) { return /^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(t); }

// Walk the content stream and reconstruct every FILLED shape: its bounding box
// (from m/l/c/v/y/re path ops) and its active fill colour (last rg/g). Also
// reports whether a `gs` (ExtGState) operator appears.
function parseFilledShapes(content) {
  var tokens = content.split(/\s+/);
  var nums = [];
  var currentFill = null; // [r,g,b] 0..1
  var points = [];
  var shapes = [];
  var sawGsOp = false;

  function bboxAndPush() {
    if (!points.length) return;
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (var k = 0; k < points.length; k++) {
      var p = points[k];
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    shapes.push({
      fill: currentFill ? currentFill.slice() : null,
      minX: minX, maxX: maxX, minY: minY, maxY: maxY,
      w: maxX - minX, h: maxY - minY,
    });
    points = [];
  }

  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    if (t === '') continue;
    if (isNum(t)) { nums.push(parseFloat(t)); continue; }

    switch (t) {
      case 'rg': currentFill = nums.slice(-3); nums = []; break;
      case 'g': { var v = nums.slice(-1)[0]; currentFill = [v, v, v]; nums = []; break; }
      case 'RG': case 'G': case 'K': nums = []; break; // stroke colour — ignore
      case 'm': case 'l': { var pt = nums.slice(-2); points.push(pt); nums = []; break; }
      case 'c': {
        var c = nums.slice(-6);
        points.push([c[0], c[1]], [c[2], c[3]], [c[4], c[5]]); nums = []; break;
      }
      case 'v': case 'y': {
        var d = nums.slice(-4);
        points.push([d[0], d[1]], [d[2], d[3]]); nums = []; break;
      }
      case 're': {
        var r = nums.slice(-4);
        points.push([r[0], r[1]], [r[0] + r[2], r[1] + r[3]]); nums = []; break;
      }
      case 'f': case 'F': case 'f*': case 'b': case 'b*': case 'B': case 'B*':
        bboxAndPush(); nums = []; break;
      case 'n': case 'S': case 's': points = []; nums = []; break;
      case 'gs': sawGsOp = true; nums = []; break;
      case 'h': break; // closepath — keep points
      default: nums = []; break; // any other operator: drop stale operands
    }
  }
  return { shapes: shapes, sawGsOp: sawGsOp };
}

function isReddish(f) { return f && f[0] > 0.55 && (f[0] - f[1]) > 0.15 && (f[0] - f[2]) > 0.15; }
function isGreenish(f) { return f && f[1] > 0.45 && (f[1] - f[0]) > 0.1 && (f[1] - f[2]) > 0.0; }
function isLight(f) { return f && f[0] > 0.85 && f[1] > 0.85 && f[2] > 0.80; }

function xContained(inner, outer) {
  return inner.minX >= outer.minX - EPS && inner.maxX <= outer.maxX + EPS;
}
function yContained(inner, outer) {
  return inner.minY >= outer.minY - EPS && inner.maxY <= outer.maxY + EPS;
}

// Find a {track, fill} pair: the smallest light track fill that contains a fill
// matching `hueFn`. Tolerant to both the two-track (stacked barlines) layout and
// a single-track-two-fills layout (the same track can pair with both hues).
function findPair(shapes, hueFn) {
  var lights = shapes.filter(function (s) { return isLight(s.fill); })
    .sort(function (a, b) { return (a.w * a.h) - (b.w * b.h); });
  for (var i = 0; i < lights.length; i++) {
    var track = lights[i];
    for (var j = 0; j < shapes.length; j++) {
      var s = shapes[j];
      if (s === track) continue;
      if (!xContained(s, track) || !yContained(s, track)) continue;
      if (hueFn(s.fill)) return { track: track, fill: s };
    }
  }
  return null;
}

// Severity signature: a before-pair (reddish fill in a light track) AND an
// after-pair (greenish fill in a light track).
function findSeverityRow(shapes) {
  var before = findPair(shapes, isReddish);
  var after = findPair(shapes, isGreenish);
  if (before && after) return { before: before, after: after };
  return null;
}

async function main() {
  var env = buildJsdomEnv();
  var win = env.win;
  injectDepStubs(win);

  var sessionData = {
    clientName: 'Dana Levi',
    sessionDate: '2026-03-24',
    sessionType: 'Clinic',
    sessionNumber: 1,
    issues: [{ name: 'Anger', before: BEFORE_VALUE, after: AFTER_VALUE }],
    markdown: 'Session body text',
  };
  var blob = await win.PDFExport.buildSessionPDF(sessionData, { uiLang: 'en' });
  var buf = Buffer.from(await blob.arrayBuffer());
  var fullPdf = buf.toString('latin1');
  win.close && win.close();

  var content = firstContentStream(buf);
  var parsed = parseFilledShapes(content);
  var row = findSeverityRow(parsed.shapes);

  var failed = 0;

  // --- 1. Severity signature (before fill in track + after fill in track) ---
  try {
    assert.ok(row,
      'No severity signature found: expected a light `#eef7ea` track CONTAINING a ' +
      'reddish before-fill AND a light track CONTAINING a greenish after-fill. ' +
      'RED now: buildSessionPDF ignores structured issues[] (gates 34-09). ' +
      '(filled shapes parsed: ' + parsed.shapes.length + ')');
    console.log('[PASS] 1: severity signature present (before red in track + after green in track)');
  } catch (err) {
    console.error('[FAIL] 1 (severity signature):', err.message);
    failed++;
  }

  // --- 2. Proportional widths (value/10 × track) + before > after ---
  try {
    assert.ok(row, 'severity signature required for the proportionality check (see assertion 1)');
    var beforeRatio = row.before.fill.w / row.before.track.w;
    var afterRatio = row.after.fill.w / row.after.track.w;
    assert.ok(Math.abs(beforeRatio - (BEFORE_VALUE / 10)) <= RATIO_TOL,
      'before fill width ratio ' + beforeRatio.toFixed(3) + ' should ≈ ' +
      (BEFORE_VALUE / 10) + ' (before/10 × track), tol ' + RATIO_TOL);
    assert.ok(Math.abs(afterRatio - (AFTER_VALUE / 10)) <= RATIO_TOL,
      'after fill width ratio ' + afterRatio.toFixed(3) + ' should ≈ ' +
      (AFTER_VALUE / 10) + ' (after/10 × track), tol ' + RATIO_TOL);
    // Shared 0–10 scale: the two barline tracks must be the same width.
    assert.ok(Math.abs(row.before.track.w - row.after.track.w) <= 2 * EPS,
      'before/after barlines must share one 0–10 track width (got ' +
      row.before.track.w.toFixed(2) + ' vs ' + row.after.track.w.toFixed(2) + ')');
    assert.ok(row.before.fill.w > row.after.fill.w,
      'before-fill width (' + row.before.fill.w.toFixed(2) + ') must exceed after-fill width (' +
      row.after.fill.w.toFixed(2) + ') for before 8 > after 3');
    console.log('[PASS] 2: proportional widths (before≈' + beforeRatio.toFixed(2) +
      ', after≈' + afterRatio.toFixed(2) + ' of track; before > after)');
  } catch (err) {
    console.error('[FAIL] 2 (proportional widths):', err.message);
    failed++;
  }

  // --- 3. Deterministic renderer: flat fill, NO opacity GState op ---
  try {
    assert.ok(fullPdf.indexOf('/ExtGState') === -1,
      'PDF contains an /ExtGState resource — the severity draw must use a flat ' +
      'pre-lightened hex, NOT GState({opacity}) (D-08 / FLAG-6 determinism).');
    assert.ok(!parsed.sawGsOp,
      'content stream contains a `gs` graphics-state operator — no opacity/ExtGState ' +
      'op is allowed (the before bar must be a flat fill).');
    console.log('[PASS] 3: no ExtGState / no `gs` opacity op (flat fill, deterministic)');
  } catch (err) {
    console.error('[FAIL] 3 (flat fill / no GState):', err.message);
    failed++;
  }

  console.log('Passed ' + (3 - failed) + '/3, Failed ' + failed + '/3.');
  if (failed > 0) {
    console.log('(RED as expected while drawSeverityBlock is unimplemented — the GREEN gate for 34-09.)');
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err);
  process.exit(1);
});
