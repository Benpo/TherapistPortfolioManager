/**
 * Phase 34 (Plan 34-03, Wave 0) — FN-3 / D-05: embedded logo + offline-safe build.
 *
 * RED-NOW render-tier gate authored BEFORE the implementation (project hard rule
 * `feedback-behavior-verification`: runtime-behavior code needs a falsifiable
 * behavior test FIRST). This test is EXPECTED TO FAIL today and becomes the
 * GREEN gate for 34-06 (header band + client card + embedded logo).
 *
 * --- What it asserts (observable, implementation-agnostic) ---
 *
 *   (a) The vendored logo source is available OFFLINE: `window.IconLogoBase64`
 *       (created by 34-01) is a non-empty base64 string, and the PDF build
 *       resolves to a Blob with NETWORK ACCESS DISABLED (window.fetch is stubbed
 *       to throw — if any future logo code tried to fetch the asset instead of
 *       embedding the vendored base64, the build would throw and this test fails).
 *   (b) The produced PDF embeds an IMAGE XObject — i.e. the byte stream contains
 *       a `/Subtype /Image` object (the output of jsPDF `addImage`). Presence,
 *       not pixel placement, is asserted (robust to where 34-06 puts the logo).
 *
 * --- Falsifiability (documented per Task-1 done criteria) ---
 *
 *   • With the `addImage` logo draw ABSENT (today's code), assertion (b) FAILS →
 *     this test is RED right now (verified: no image XObject in current output).
 *   • Adding the `doc.addImage(window.IconLogoBase64, 'PNG', …)` call in 34-06
 *     turns assertion (b) GREEN.
 *   • Implementing the logo via a network fetch (instead of the embedded base64)
 *     trips the fetch-throws guard in assertion (a) → still fails. The only way
 *     to GREEN is an embedded, offline image XObject.
 *
 * --- Why a stub <script> per dep ---
 *
 *   jsdom (no resource loader) never fires load/error for an appended
 *   <script src>, so PDFExport.loadScriptOnce() would hang forever. We inject
 *   stub <script> elements whose `src` matches the lazy-load chain so
 *   loadScriptOnce's querySelector resolves immediately. The real lib code was
 *   already eval'd into the window by buildJsdomEnv(). (Proven pattern from
 *   quick-260620-q8m-pdf-paragraph-linebreaks.test.js.)
 *
 *   node tests/34-logo-embed.test.js     -- exit 0 = pass, exit 1 = RED/fail
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var REPO_ROOT = path.resolve(__dirname, '..');
var buildJsdomEnv = require('./_helpers/jsdom-pdf-env').buildJsdomEnv;

function readAsset(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

// Stub the lazy-load chain so PDFExport.loadScriptOnce() resolves in jsdom.
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

async function main() {
  var env = buildJsdomEnv();
  var win = env.win;

  // Make the logo source available exactly as 34-01 vendored it (window.IconLogoBase64).
  win.eval(readAsset('assets/branding/icon-512-base64.js'));

  // Enforce OFFLINE: any network attempt during the build must throw.
  win.fetch = function () { throw new Error('network access attempted during PDF build (must be offline / embedded)'); };

  injectDepStubs(win);

  var failed = 0;

  // --- (a) offline embed source present ---
  try {
    assert.ok(typeof win.IconLogoBase64 === 'string' && win.IconLogoBase64.length > 100,
      'window.IconLogoBase64 must be a non-empty base64 string (the offline-embedded logo source from 34-01).');
    console.log('[PASS] window.IconLogoBase64 present (' + win.IconLogoBase64.length + ' base64 chars)');
  } catch (err) {
    console.error('[FAIL] offline logo source:', err.message);
    failed++;
  }

  // Build the PDF (offline). buildSessionPDF returns Promise<Blob>.
  var blob = await win.PDFExport.buildSessionPDF(
    { clientName: 'Anna M.', sessionDate: '2026-03-24', sessionType: 'In-person', markdown: 'Session summary text.' },
    { uiLang: 'en' }
  );
  var buf = Buffer.from(await blob.arrayBuffer());

  // --- (a cont.) build produced a real PDF with no network ---
  try {
    assert.ok(buf.length > 1000, 'Offline build must produce a non-trivial PDF Blob; got ' + buf.length + ' bytes.');
    console.log('[PASS] Offline build produced a PDF Blob (' + buf.length + ' bytes, fetch disabled)');
  } catch (err) {
    console.error('[FAIL] offline build:', err.message);
    failed++;
  }

  // --- (b) image XObject present (the addImage output) ---
  var latin = buf.toString('latin1');
  var hasImageXObject = /\/Subtype\s*\/Image\b/.test(latin);
  try {
    assert.ok(hasImageXObject,
      'PDF byte stream contains NO image XObject (no "/Subtype /Image"). The logo ' +
      'is not embedded yet — 34-06 must call doc.addImage(window.IconLogoBase64, "PNG", …).');
    console.log('[PASS] PDF embeds an image XObject (/Subtype /Image present)');
  } catch (err) {
    console.error('[FAIL] image XObject:', err.message);
    failed++;
  }

  win.close && win.close();

  console.log('Passed ' + (3 - failed) + '/3, Failed ' + failed + '/3.');
  if (failed > 0) {
    console.log('(RED as expected while the embedded logo is unimplemented — gates 34-06.)');
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err);
  process.exit(1);
});
