/**
 * Phase 34 (Plan 34-03, Wave 0) — FN-2 / D-04: localized session-type pill.
 *
 * RED-NOW render-tier gate authored BEFORE the implementation (project hard rule
 * `feedback-behavior-verification`). Expected to FAIL today; becomes the GREEN
 * gate for 34-06 (which draws the client-card pill).
 *
 * --- What it asserts ---
 *
 * For all 12 combinations of (sessionType ∈ {clinic, online, other}) ×
 * (uiLang ∈ {en, he, de, cs}):
 *   The renderer emits the LOCALIZED session-type label VERBATIM as its own
 *   standalone text draw (the pill), where the localized label is resolved the
 *   same way the export-modal does — `App.formatSessionType(type)` === the
 *   `session.type.<type>` entry of the locale dictionary (window.I18N[lang]).
 *
 * "Standalone" = a single doc.text() call whose drawn string equals the label
 * (LTR locales) or its visual reverse (Hebrew, which shapeForJsPdf reorders to
 * pure-RTL visual order). The probe wraps each jsPDF instance's `text` method
 * via the buildJsdomEnv onJsPDF hook (the doc.text probe proven in
 * quick-260620-q8m), so the assertion is on the verbatim text the renderer hands
 * to jsPDF — exactly the FN-2 contract — and is independent of pill geometry.
 *
 * --- Why RED now ---
 *
 * Today the type label is only ever rendered FUSED into the centered meta line
 * ("{date}  -  {label}", drawPage1Header), never as a standalone draw. So no
 * doc.text() call equals the bare label and every combination FAILS now.
 * [VERIFIED: all 12 combos report standaloneNow=false against current code.]
 *
 * --- Falsifiability ---
 *
 *   • A hardcoded pill label (e.g. always the English "Online") would NOT equal
 *     the Hebrew "מקוון" (nor its reverse) / German "Vor Ort" / Czech "Osobně",
 *     so the he/de/cs cases fail — the test catches a hardcoded label (D-04).
 *   • Drawing the label as its own verbatim text (34-06) turns it GREEN.
 *
 * --- Stub <script> per dep ---
 * jsdom never fires load/error for appended <script src>, so loadScriptOnce()
 * would hang; we inject src-matching stubs so it resolves (real lib code is
 * already eval'd by buildJsdomEnv). Pattern from quick-260620-q8m.
 *
 *   node tests/34-pill-localized.test.js   -- exit 0 = pass, exit 1 = RED/fail
 */

'use strict';

var fs = require('fs');
var path = require('path');
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

var TYPES = ['clinic', 'online', 'other'];
var LOCALES = ['en', 'he', 'de', 'cs'];

// Build one PDF for (locale, type) and return the trimmed strings drawn via
// doc.text(), plus the localized label resolved from the locale dictionary.
async function drawnLabelFor(locale, type) {
  var calls = [];
  var env = buildJsdomEnv({
    onJsPDF: function (doc) {
      var origText = doc.text;
      doc.text = function (str) {
        try { calls.push(String(str).trim()); } catch (e) { /* never break render */ }
        return origText.apply(this, arguments);
      };
    },
  });
  var win = env.win;
  // Load the locale dictionary — the SAME source App.formatSessionType reads
  // (t(key) → window.I18N[lang][key]). Resolving the label here mirrors the
  // export-modal, so the test fails if production ever hardcodes a pill label.
  win.eval(readAsset('assets/i18n-' + locale + '.js'));
  injectDepStubs(win);

  var label = win.I18N[locale]['session.type.' + type];

  await win.PDFExport.buildSessionPDF(
    {
      clientName: locale === 'he' ? 'דנה לוי' : 'Anna M.',
      sessionDate: '2026-03-24',
      sessionType: label, // export-modal passes the already-localized label
      markdown: 'free text body without the label',
    },
    { uiLang: locale }
  );
  win.close && win.close();
  return { label: label, strings: calls };
}

async function main() {
  var failed = 0;
  var total = 0;

  for (var li = 0; li < LOCALES.length; li++) {
    for (var ti = 0; ti < TYPES.length; ti++) {
      total++;
      var locale = LOCALES[li];
      var type = TYPES[ti];
      var res = await drawnLabelFor(locale, type);
      var label = res.label;
      var rev = reverseStr(label);
      // Accept the label verbatim (LTR identity) OR its visual reverse (Hebrew
      // pure-RTL visual order produced by shapeForJsPdf). Either proves the
      // verbatim localized label was emitted as a standalone pill draw.
      var found = res.strings.indexOf(label) >= 0 || res.strings.indexOf(rev) >= 0;
      if (found) {
        console.log('[PASS] ' + locale + '/' + type + ' pill renders verbatim "' + label + '"');
      } else {
        console.error('[FAIL] ' + locale + '/' + type + ' — verbatim localized label "' + label +
          '" is NOT emitted as a standalone pill draw (only fused into the meta line). ' +
          'Drawn strings: ' + JSON.stringify(res.strings));
        failed++;
      }
    }
  }

  console.log('Passed ' + (total - failed) + '/' + total + ', Failed ' + failed + '/' + total + '.');
  if (failed > 0) {
    console.log('(RED as expected while the localized pill is unimplemented — gates 34-06.)');
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err);
  process.exit(1);
});
