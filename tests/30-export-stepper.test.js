/**
 * tests/30-export-stepper.test.js — add-session export-modal stepper state
 * machine + step-1→Next filtered editor value (TEST-03d, F-A/F-I, D-08/D-09).
 *
 * ROOT CAUSE THIS CLOSES: the 3-step export modal (add-session.js:1180-1556) is
 * the precise Phase-31 RFCT-02 extraction target, and nothing EXECUTED its state
 * machine before this test — the active-step transitions (1→2→3), the step-1
 * section filter that (re)builds the markdown into #exportEditor.value on Next
 * (F-I: NOT a live preview-on-toggle), and the files-only share dispatch (the
 * 260615 bug #1 fix) were all unguarded.
 *
 * THE GUARD (D-09 jsdom real-page): load the REAL add-session.html body + the
 * REAL assets/add-session.js into a jsdom window, inject the App.* stub, a mock
 * PortfolioDB, the REAL jsPDF + PDFExport globals (for the share PDF), and a
 * createShareMock as navigator.canShare/share. Drive the REAL DOMContentLoaded
 * handler, open the dialog via the REAL #exportSessionBtn click, and assert
 * OBSERVABLE state only (D-08): the `.export-step.is-active` data-step, the
 * #exportEditor.value, and the share-mock call shape — never an internal fn name.
 *
 * On the jsPDF global (plan read_first): tests/_helpers/jsdom-pdf-env.js bakes in
 * the getContext→null fix + the jspdf/bidi/heebo/pdf-export eval order, but it
 * builds its OWN empty-body jsdom. A real-PAGE test needs BOTH the add-session
 * DOM AND the jsPDF global in the SAME window, so we mirror that helper's exact
 * eval sequence into the page window here (no PDF-byte pinning — this test does
 * not assert PDF bytes, only the files-only share dispatch).
 *
 * FALSIFIABLE (per feedback-behavior-verification): in a scratch copy, break the
 * stepper (e.g. onNext advances to the wrong step, or the step-1 filter ignores
 * the unchecked boxes) and the matching case FAILS; re-add `text`/`title` to the
 * navigator.share payload (the 260615 regression) and the share case FAILS.
 * Renaming an INTERNAL fn (exportSetActiveStep → setStep) with no observable
 * change keeps all cases GREEN (D-08/D-12).
 *
 * F-A (vacuous-green trap): the page DOMContentLoaded handler + the share handler
 * are async. Guarded two ways: (1) capture-and-await the specific handler (the
 * 25-06 docListeners pattern) and settle() the microtask/timer queue after every
 * async-driven event; (2) an end-of-file count guard asserts EXPECTED_COUNT ran.
 *
 * Read-only: EVALS assets/* into an isolated jsdom window; writes no assets/*.
 *
 * Run: node tests/30-export-stepper.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createMockPortfolioDB = require('./_helpers/mock-portfolio-db').createMockPortfolioDB;
var createAppStub = require('./_helpers/app-stub').createAppStub;
var createShareMock = require('./_helpers/mock-navigator-share').createShareMock;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle(n) { for (var i = 0; i < (n || 8); i++) { await flush(); } }
async function waitFor(pred, tries) {
  for (var i = 0; i < (tries || 50); i++) { if (pred()) return true; await flush(); }
  return pred();
}

// Mirror jsdom-pdf-env's eval sequence INTO an existing page window (the helper
// builds its own empty-body DOM; a real-page test needs the jsPDF global in the
// page window). No deterministic-byte pinning — this test asserts share dispatch,
// not PDF bytes.
function loadRealPdf(win) {
  win.HTMLCanvasElement.prototype.getContext = function () { return null; };
  win.eval(readAsset('assets/jspdf.min.js'));
  win.eval(readAsset('assets/bidi.min.js'));
  win.eval(readAsset('assets/fonts/heebo-base64.js'));
  win.eval(readAsset('assets/fonts/heebo-bold-base64.js'));
  // pdf-export.js's ensureDeps lazy-loads its vendored scripts via
  // loadScriptOnce, which resolves immediately ONLY when a matching
  // <script src="..."> already exists in the DOM. In jsdom an appended external
  // script never fires onload, so buildSessionPDF would hang forever. Preload
  // the exact srcs ensureDeps requests (mirrors the green PDF tests) so the
  // already-eval'd globals satisfy the dep-load and buildSessionPDF resolves.
  ['./assets/jspdf.min.js', './assets/bidi.min.js',
   './assets/fonts/heebo-base64.js', './assets/fonts/heebo-bold-base64.js']
    .forEach(function (src) {
      var s = win.document.createElement('script');
      s.src = src;
      win.document.body.appendChild(s);
    });

  win.eval(readAsset('assets/pdf-export.js'));
  if (!win.PDFExport || typeof win.PDFExport.buildSessionPDF !== 'function') {
    throw new Error('pdf-export.js did not expose window.PDFExport.buildSessionPDF after eval');
  }
}

/**
 * @param {object} [opts]
 * @param {object} [opts.shareMock] createShareMock() result to install as
 *        navigator.canShare/share before eval.
 */
function buildEnv(opts) {
  opts = opts || {};
  var html = readAsset('add-session.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/add-session.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  // Minimal DOM-node severity no-op (F-B leaves the real pair to 30-06); init's
  // createIssueBlock appendChilds the scale, so it must return a node.
  win.App = createAppStub({
    createSeverityScale: function () { return win.document.createElement('div'); },
    getSeverityValue: function () { return null; },
  });
  win.PortfolioDB = createMockPortfolioDB({ clients: [], sessions: [] });
  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  loadRealPdf(win);

  // Install the Web Share mock (files-only dispatch assertion) BEFORE eval so
  // exportProbeShareSupport (run at openExportDialog) sees canShare as a fn.
  if (opts.shareMock) {
    Object.defineProperty(win.navigator, 'canShare', { value: opts.shareMock.canShare, configurable: true });
    Object.defineProperty(win.navigator, 'share', { value: opts.shareMock.share, configurable: true });
  }

  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0] };
}

function activeStep(win) {
  var modal = win.document.getElementById('exportModal');
  var el = modal.querySelector('.export-step.is-active');
  return el ? Number(el.dataset.step) : null;
}

function setVal(win, id, value) {
  var el = win.document.getElementById(id);
  assert.ok(el, 'form field #' + id + ' must exist');
  el.value = value;
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── A. Stepper transitions 1 → 2 → 3 via #exportNextBtn ─────────────────────
  await test('opening the export dialog activates step 1; each #exportNextBtn click advances the active step 1→2→3', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    win.document.getElementById('exportSessionBtn').click();
    await settle();
    assert.strictEqual(activeStep(win), 1, 'opening the dialog must activate step 1');

    win.document.getElementById('exportNextBtn').click();
    await settle();
    assert.strictEqual(activeStep(win), 2, 'first Next must advance to step 2');

    win.document.getElementById('exportNextBtn').click();
    await settle();
    assert.strictEqual(activeStep(win), 3, 'second Next must advance to step 3');

    env.dom.window.close();
  });

  // ─── B. Step-1 section toggle → filtered #exportEditor.value on Next (F-I) ────
  await test('toggling sections in step 1 then clicking Next yields a #exportEditor.value reflecting the filtered set (F-I — rebuilt on Next, not live on toggle)', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    setVal(win, 'trappedEmotions', 'TRAP_X');
    setVal(win, 'sessionInsights', 'INS_X');
    setVal(win, 'additionalTech', 'AT_X');

    win.document.getElementById('exportSessionBtn').click();
    await settle();

    // F-I: the editor is NOT rebuilt live when a checkbox toggles — only on Next.
    var insightsCb = win.document.querySelector('#exportStep1Rows input[data-section-key="insights"]');
    assert.ok(insightsCb, 'insights step-1 checkbox must render');
    insightsCb.checked = false;
    assert.strictEqual(win.document.getElementById('exportEditor').value, '',
      'the editor must still be empty after a toggle (the markdown is built on Next, not live — F-I)');

    win.document.getElementById('exportNextBtn').click();
    await settle();

    var md = win.document.getElementById('exportEditor').value;
    assert.ok(md.indexOf('## insights') === -1, 'the deselected insights section must be absent after Next');
    assert.ok(md.indexOf('INS_X') === -1, 'deselected insights content must be absent after Next');
    assert.ok(md.indexOf('TRAP_X') !== -1, 'a still-selected section (trapped) must be present after Next');
    assert.ok(md.indexOf('AT_X') !== -1, 'a still-selected section (additionalTech) must be present after Next');

    env.dom.window.close();
  });

  // ─── C. Share dispatch passes files-only to the share mock (260615 bug #1) ───
  await test('the export share output dispatches navigator.share with FILES ONLY (no text/title) — the 260615 single-clean-PDF fix', async function () {
    var shareMock = createShareMock({ canShareReturns: true });
    var env = buildEnv({ shareMock: shareMock });
    var win = env.win;
    await env.domHandler();
    await settle();

    setVal(win, 'trappedEmotions', 'TRAP_X');

    win.document.getElementById('exportSessionBtn').click();
    await settle();
    // Advance to step 3 (where the share output card lives) for a realistic path.
    win.document.getElementById('exportNextBtn').click();
    await settle();
    win.document.getElementById('exportNextBtn').click();
    await settle();
    assert.strictEqual(activeStep(win), 3, 'must reach step 3 before sharing');

    win.document.getElementById('exportShare').click();
    // exportHandleShare builds a real PDF then awaits navigator.share — poll.
    await waitFor(function () { return shareMock.calls.length > 0; }, 200);

    assert.strictEqual(shareMock.calls.length, 1, 'navigator.share must be dispatched exactly once');
    var call = shareMock.calls[0];
    assert.ok(Array.isArray(call.files) && call.files.length === 1,
      'share payload must carry exactly one file (the PDF)');
    assert.strictEqual(call.files[0].type, 'application/pdf', 'the shared file must be a PDF');
    // THE 260615 FILES-ONLY CONTRACT: no text, no title (they leaked a duplicate
    // attachment + temp path into WhatsApp on macOS Chrome).
    assert.strictEqual(call.text, undefined, 'share payload must NOT include text (260615 files-only fix)');
    assert.strictEqual(call.title, undefined, 'share payload must NOT include title (260615 files-only fix)');

    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────────
  var EXPECTED_COUNT = 3;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-05 export-stepper tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
