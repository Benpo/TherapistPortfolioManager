/**
 * Phase 34 (Plan 34-03, Wave 0) — D-10: RTL non-regression spine for the NEW blocks.
 *
 * RED-NOW render-tier gate authored BEFORE the implementation (project hard rule
 * `feedback-behavior-verification`). Expected to FAIL today; grows to GREEN across
 * 34-06 (header band + client card + pill), 34-09 (severity bars), 34-07
 * (footer/headings). This is the load-bearing RTL invariant (D-10): every new
 * block must anchor to the START edge and keep numerals in correct visual order
 * under uiLang:'he', mirroring the existing pdf-digit-order / pdf-glyph-coverage
 * spine that MUST stay green.
 *
 * --- Assertions and which new block each one gates ---
 *
 *   A. DIGIT ORDER — client card "Session #N" (gates 34-06):
 *      sessionNumber:12 → the digit run "12" appears in correct LTR visual order;
 *      the reversed run "21" does NOT appear. RED now: the ordinal is not rendered.
 *
 *   B. DIGIT ORDER — severity values (gates 34-09):
 *      issues[0] before:10 / after:8 → runs "10" and "8" appear; reversed "01"
 *      does NOT appear. RED now: structured issues are ignored by the renderer.
 *
 *   C. START-EDGE ANCHORING — pill / card text (gates 34-06):
 *      The localized pill label is drawn START-edge anchored under RTL. Asserted
 *      as an anchor-SIDE differential (not absolute coordinates): the label's
 *      x-origin under uiLang:'he' is to the RIGHT of its x-origin under
 *      uiLang:'en' (mirrored), and is NOT pinned at the LTR left margin.
 *      RED now: no standalone pill label is drawn under either locale.
 *
 * All assertions are about ORDER and ANCHOR-SIDE, never absolute y — they survive
 * layout tuning. Sentinel numerals (12 / 10 / 8) are chosen to NOT collide with
 * the rendered date's digit runs ("2026", "24") or the footer ("Page 1 of 1").
 * [VERIFIED against current code: runs were ["2026","24","1","1"]; 12/10/8 absent.]
 *
 * --- Falsifiability ---
 *   • A digit-reversed new block (double-bidi / wrong isInputVisual) makes "21" or
 *     "01" appear, or drops "12"/"10"/"8" → fails A/B.
 *   • A left-anchored new block under RTL makes the he label x-origin collapse to
 *     the left margin (≈ the en x-origin) → fails C.
 *
 * --- Stub <script> per dep ---
 * jsdom never fires load/error for appended <script src>, so loadScriptOnce()
 * would hang; inject src-matching stubs so it resolves (real lib code already
 * eval'd by buildJsdomEnv). Pattern from quick-260620-q8m.
 *
 *   node tests/34-rtl-newblocks.test.js   -- exit 0 = pass, exit 1 = RED/fail
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

function reverseStr(s) { return s.split('').reverse().join(''); }

// Heebo digit GIDs (uppercase 4-hex). Same mapping pdf-digit-order.test.js pins;
// valid for Heebo Regular v3.100.
var DIGIT_GIDS = {
  '0138': '0', '0139': '1', '013A': '2', '013B': '3', '013C': '4',
  '013D': '5', '013E': '6', '013F': '7', '0140': '8', '0141': '9',
};

// Extract maximal digit runs from the page-1 content stream (mirror of
// pdf-digit-order.test.js extractDigitRuns).
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
  function walkHex(hex) {
    var run = '';
    for (var i = 0; i < hex.length; i += 4) {
      var gid = hex.slice(i, i + 4).toUpperCase();
      var d = DIGIT_GIDS[gid];
      if (d !== undefined) { run += d; }
      else if (run.length > 0) { digitRuns.push(run); run = ''; }
    }
    if (run.length > 0) digitRuns.push(run);
  }
  var m, tjRe = /<([0-9A-Fa-f]+)>\s*Tj/g;
  while ((m = tjRe.exec(content)) !== null) walkHex(m[1]);
  var bigTjRe = /\[([^\]]*)\]\s*TJ/g;
  while ((m = bigTjRe.exec(content)) !== null) {
    var hexParts = m[1].match(/<([0-9A-Fa-f]+)>/g) || [];
    for (var hp = 0; hp < hexParts.length; hp++) walkHex(hexParts[hp].slice(1, -1));
  }
  return digitRuns;
}

// Build a PDF for one locale, capturing both the bytes and the doc.text x-origins.
async function build(locale) {
  var calls = [];
  var env = buildJsdomEnv({
    onJsPDF: function (doc) {
      var origText = doc.text;
      doc.text = function (str, x, y) {
        try { calls.push({ str: String(str).trim(), x: Number(x) }); } catch (e) { /* never break render */ }
        return origText.apply(this, arguments);
      };
    },
  });
  var win = env.win;
  win.eval(readAsset('assets/i18n-' + locale + '.js'));
  injectDepStubs(win);

  var label = win.I18N[locale]['session.type.online'];
  var sessionData = {
    clientName: locale === 'he' ? 'דנה לוי' : 'Dana Levi',
    sessionDate: '2026-03-24',
    sessionType: label,
    sessionNumber: 12,                                // FN-1 derived ordinal (card)
    issues: [{ name: locale === 'he' ? 'כעס' : 'Anger', before: 10, after: 8 }], // severity
    markdown: locale === 'he' ? 'גוף הטקסט של הפגישה' : 'Session body text',
  };
  var blob = await win.PDFExport.buildSessionPDF(sessionData, { uiLang: locale });
  var buf = Buffer.from(await blob.arrayBuffer());
  win.close && win.close();
  return { label: label, calls: calls, buf: buf };
}

// Find the x-origin of the standalone pill-label draw (label verbatim or its
// visual reverse). Returns null if no standalone label draw exists.
function labelAnchorX(res) {
  var rev = reverseStr(res.label);
  for (var i = 0; i < res.calls.length; i++) {
    var c = res.calls[i];
    if (c.str === res.label || c.str === rev) return c.x;
  }
  return null;
}

var MARGIN_X = 71; // pdf-export.js A4 left/right margin (pt)

async function main() {
  var he = await build('he');
  var en = await build('en');
  var runs = extractDigitRuns(he.buf);

  var failed = 0;

  // --- A. Session #N digit order (card, gates 34-06) ---
  try {
    assert.ok(runs.indexOf('12') >= 0,
      'Expected "Session #12" ordinal run "12" under uiLang:he. Runs: [' + runs.join(', ') + ']. ' +
      'RED now: the client-card ordinal is not rendered yet (gates 34-06).');
    assert.ok(runs.indexOf('21') < 0,
      'Reversed ordinal run "21" found — RTL digit order is broken for the new card.');
    console.log('[PASS] A: card "Session #12" digit order correct ("12" present, "21" absent)');
  } catch (err) {
    console.error('[FAIL] A (card ordinal digit order):', err.message);
    failed++;
  }

  // --- B. Severity value digit order (severity bars, gates 34-09) ---
  try {
    assert.ok(runs.indexOf('10') >= 0,
      'Expected severity "before" run "10" under uiLang:he. Runs: [' + runs.join(', ') + ']. ' +
      'RED now: structured issues[] are not rendered yet (gates 34-09).');
    assert.ok(runs.indexOf('01') < 0,
      'Reversed severity run "01" found — RTL digit order is broken for severity values.');
    assert.ok(runs.indexOf('8') >= 0,
      'Expected severity "after" run "8" under uiLang:he. Runs: [' + runs.join(', ') + ']. ' +
      'RED now: structured issues[] are not rendered yet (gates 34-09).');
    console.log('[PASS] B: severity digit order correct ("10" & "8" present, "01" absent)');
  } catch (err) {
    console.error('[FAIL] B (severity digit order):', err.message);
    failed++;
  }

  // --- C. Pill / card start-edge anchoring (gates 34-06) ---
  try {
    var heX = labelAnchorX(he);
    var enX = labelAnchorX(en);
    assert.ok(heX !== null && enX !== null,
      'No standalone pill-label draw found (he=' + heX + ', en=' + enX + '). ' +
      'RED now: the localized pill is not drawn yet (gates 34-06).');
    assert.ok(heX > enX,
      'Pill label is not start-edge anchored under RTL: he x-origin (' + heX + ') ' +
      'should be to the RIGHT of en x-origin (' + enX + '). A left-anchored RTL pill fails here.');
    assert.ok(Math.abs(heX - MARGIN_X) > 1,
      'Pill label under RTL is pinned at the LTR left margin (' + MARGIN_X + 'pt) — not start-edge anchored.');
    console.log('[PASS] C: pill label start-edge anchored under RTL (heX=' + heX + ' > enX=' + enX + ')');
  } catch (err) {
    console.error('[FAIL] C (start-edge anchoring):', err.message);
    failed++;
  }

  console.log('Passed ' + (3 - failed) + '/3, Failed ' + failed + '/3.');
  if (failed > 0) {
    console.log('(RED as expected while the new RTL blocks are unimplemented — grows GREEN across 34-06/07/09.)');
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err);
  process.exit(1);
});
