/**
 * tests/_helpers/jsdom-pdf-env.js
 *
 * The ONE shared jsdom "fake browser" env for the PDF tests (D-04, TEST-01).
 *
 * Extracted from the already-green reference test
 * `tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js` (the 8th PDF test,
 * which alone stubs getContext). The 7 other PDF tests are broken precisely
 * because they MISS the `getContext → null` stub; this helper bakes that fix in
 * so they can `require()` it and delete their inline buildJsdomEnv + the fragile
 * `JSDOM_PATH || '/tmp/node_modules/jsdom'` resolution dance.
 *
 * What it does:
 *   (a) acquires JSDOM via `require('jsdom').JSDOM` directly — node resolves it
 *       from the installed devDependency (30-01), replacing the legacy
 *       JSDOM_PATH=/tmp environment fallback;
 *   (b) constructs a JSDOM with runScripts:'outside-only', pretendToBeVisual:false
 *       and a file:// URL under the repo root;
 *   (c) stubs win.HTMLCanvasElement.prototype.getContext → null BEFORE any eval
 *       (jsdom's default getContext THROWS "Not implemented", which would abort
 *       the build before the body is drawn; jsPDF does not need a real 2D
 *       context to lay out text). THIS is the fix the 7 broken tests are missing;
 *   (d) evals, in order, assets/jspdf.min.js, assets/bidi.min.js,
 *       assets/fonts/heebo-base64.js, assets/fonts/heebo-bold-base64.js, and
 *       assets/pdf-export.js into the window;
 *   (e) installs a WrappedJsPDF wrapper that applies the deterministic pins per
 *       jsPDF INSTANCE — setCreationDate(PINNED_DATE) and setFileId(PINNED_FILE_ID)
 *       right after `new OriginalJsPDF(args)`. jsPDF installs its API methods
 *       (incl. `text`) as OWN properties on each doc instance in its constructor
 *       (NOT on the prototype), so the pins MUST be applied on the instance via
 *       the wrapper, not on the prototype (PATTERNS line 52).
 *
 * Read-only: this helper READS and EVALS assets/* into an isolated jsdom window;
 * it never writes any assets/* production file.
 *
 * Usage:
 *   const { buildJsdomEnv } = require('./_helpers/jsdom-pdf-env');
 *   const { dom, win } = buildJsdomEnv();
 *   // win.PDFExport.buildSessionPDF(...) is ready; getContext is stubbed; every
 *   // jsPDF instance is date/fileId-pinned for byte-deterministic output.
 *
 * Optional per-instance spy hook: a test that needs the doc.text() probe (the
 * 260620-q8m row-baseline check) can pass { onJsPDF } and wrap the instance's
 * `text` method itself — kept out of the shared helper so it stays minimal.
 */

'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..', '..');

// Deterministic-PDF pin values (Mitigation B from Plan 23-04 harness). Exported
// so consuming tests can reference the exact pinned constants if needed.
var PINNED_DATE = "D:20260101000000+00'00'";
var PINNED_FILE_ID = '00000000000000000000000000000000';

// jsdom is an installed devDependency (30-01) — resolve it directly from
// node_modules, NOT via the legacy /tmp JSDOM_PATH convention.
var JSDOM = require('jsdom').JSDOM;

function readAsset(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

/**
 * Build the shared jsdom + jsPDF env.
 *
 * @param {object} [options]
 * @param {function} [options.onJsPDF] - optional hook called with each newly
 *        constructed (and already pinned) jsPDF instance, for tests that want to
 *        spy on the instance's own `text` method.
 * @returns {{ dom: object, win: object }}
 */
function buildJsdomEnv(options) {
  options = options || {};

  var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'file://' + REPO_ROOT + '/test-harness.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  // THE FIX the 7 broken PDF tests are missing — stub getContext BEFORE eval.
  // jsdom's default getContext throws "Not implemented"; jsPDF probes it.
  win.HTMLCanvasElement.prototype.getContext = function () { return null; };

  win.eval(readAsset('assets/jspdf.min.js'));
  win.eval(readAsset('assets/bidi.min.js'));
  win.eval(readAsset('assets/fonts/heebo-base64.js'));
  win.eval(readAsset('assets/fonts/heebo-bold-base64.js'));

  // Wrap jsPDF so every instance gets the deterministic pins applied on the
  // INSTANCE (jsPDF installs `text` etc. as own props per instance in its
  // constructor — pinning on the prototype would not take effect).
  var OriginalJsPDF = win.jspdf.jsPDF;
  function WrappedJsPDF(args) {
    var doc = new OriginalJsPDF(args);
    doc.setCreationDate(PINNED_DATE);
    doc.setFileId(PINNED_FILE_ID);
    if (typeof options.onJsPDF === 'function') {
      try { options.onJsPDF(doc, win); } catch (e) { /* never let a spy break rendering */ }
    }
    return doc;
  }
  WrappedJsPDF.prototype = OriginalJsPDF.prototype;
  Object.keys(OriginalJsPDF).forEach(function (k) { WrappedJsPDF[k] = OriginalJsPDF[k]; });
  win.jspdf.jsPDF = WrappedJsPDF;

  win.eval(readAsset('assets/pdf-export.js'));
  if (!win.PDFExport || typeof win.PDFExport.buildSessionPDF !== 'function') {
    throw new Error('pdf-export.js did not expose window.PDFExport.buildSessionPDF after eval');
  }

  return { dom: dom, win: win };
}

module.exports = {
  buildJsdomEnv: buildJsdomEnv,
  PINNED_DATE: PINNED_DATE,
  PINNED_FILE_ID: PINNED_FILE_ID,
};
