/**
 * tests/46.1-export-lifecycle.test.js — the export-modal preview LIFECYCLE
 * contract (RTXT-01/RTXT-05): reset-preview-on-close + the Back->Continue dirty
 * guard. RED-first: neither behavior is built in the current shipped source and
 * both must fail today; Task 3 turns them green.
 *
 * WHAT THIS PINS (observable OUTCOMES only — DOM state, never module internals):
 *   - Close-while-previewing then reopen: entering export Step 2 and opening
 *     Preview, then closing the modal and reopening + advancing to Step 2, leaves
 *     the editor VISIBLE, the Frame hidden, and the Edit segment active — no stale
 *     "mode lies" Frame survives the close (exportCloseDialog calls
 *     RichToolbar.resetPreview before hiding the modal).
 *   - Back->Continue dirty guard: a dirty Step-2 edit, then Back to Step 1, then
 *     Continue, prompts a discard-confirm BEFORE the step-1 regenerate overwrites
 *     editor.value. Cancel (confirm resolves false) stays on Step 1 with the edit
 *     intact; confirm (resolves true) regenerates + advances to Step 2.
 *
 * HARNESS: cloned from tests/30-export-stepper.test.js buildEnv (real
 * add-session.html body + real assets, App stub, mock PortfolioDB, real
 * DOMContentLoaded, open via #exportSessionBtn). The App stub's confirmDialog is
 * made controllable per case via a mutable ref so the discard dialog seam can be
 * driven to resolve true or false.
 *
 * Run: node tests/46.1-export-lifecycle.test.js — exit 0 on full pass, 1 on any
 * failure (RED against current source is EXPECTED).
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createMockPortfolioDB = require('./_helpers/mock-portfolio-db').createMockPortfolioDB;
var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle(n) { for (var i = 0; i < (n || 8); i++) { await flush(); } }

// Mirror jsdom-pdf-env's eval sequence INTO the page window (add-session.js's
// export path needs the jsPDF/PDFExport globals present at boot).
function loadRealPdf(win) {
  win.HTMLCanvasElement.prototype.getContext = function () { return null; };
  win.eval(readAsset('assets/jspdf.min.js'));
  win.eval(readAsset('assets/bidi.min.js'));
  win.eval(readAsset('assets/fonts/heebo-base64.js'));
  win.eval(readAsset('assets/fonts/heebo-bold-base64.js'));
  win.eval(readAsset('assets/fonts/rubik-italic-base64.js'));
  ['./assets/jspdf.min.js', './assets/bidi.min.js',
   './assets/fonts/heebo-base64.js', './assets/fonts/heebo-bold-base64.js',
   './assets/fonts/rubik-italic-base64.js']
    .forEach(function (src) {
      var s = win.document.createElement('script');
      s.src = src;
      win.document.body.appendChild(s);
    });
  win.eval(readAsset('assets/date-format.js'));
  win.eval(readAsset('assets/pdf-export.js'));
}

// A controllable confirm-dialog seam: the returned object's `.value` is what the
// stubbed App.confirmDialog resolves to, flippable mid-test.
function buildEnv() {
  var confirmRef = { value: true };
  var html = readAsset('add-session.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/add-session.html?sessionId=1',
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

  win.App = createAppStub({
    createSeverityScale: function () { return win.document.createElement('div'); },
    getSeverityValue: function () { return null; },
    confirmDialog: function () { return Promise.resolve(confirmRef.value); },
  });
  win.PortfolioDB = createMockPortfolioDB({
    clients: [{ id: 1, name: 'Test Client' }],
    sessions: [{
      id: 1, clientId: 1, date: '', sessionType: 'clinic', issues: [],
      trappedEmotions: '', heartShieldEmotions: '', insights: '',
      limitingBeliefs: '', additionalTech: '', customerSummary: '', comments: '',
      isHeartShield: false, shieldRemoved: null
    }]
  });
  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  loadRealPdf(win);

  win.eval(readAsset('assets/text-edit.js'));
  win.eval(readAsset('assets/rich-toolbar.js'));
  win.eval(readAsset('assets/export-modal.js'));
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0], confirmRef: confirmRef };
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
  // ─── 1. Close-while-previewing → reopen starts in Edit (no stale Frame) ───────
  await test('closing the modal while previewing resets preview — reopening Step 2 shows the editor, hides the Frame, and the Edit segment is active', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    win.document.getElementById('exportSessionBtn').click();
    await settle();
    win.document.getElementById('exportNextBtn').click(); // step 1 → 2 (builds editor md)
    await settle();
    assert.strictEqual(activeStep(win), 2, 'must reach the editor step');

    var editor = win.document.getElementById('exportEditor');
    var bar = editor.previousElementSibling;
    assert.ok(bar && bar.classList.contains('rich-toolbar'), 'the persistent bar is docked above the editor');
    var previewSeg = bar.querySelector('.rich-toolbar-swap-btn[data-mode="preview"]');
    assert.ok(previewSeg, 'the bar exposes a Preview mode segment');
    previewSeg.dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await settle();
    assert.ok(editor.classList.contains('is-hidden'), 'precondition: previewing (editor hidden)');

    // Close the (unedited) modal → exportCloseDialog resets preview then hides.
    win.document.getElementById('exportClose').click();
    await settle();

    // Reopen and advance to Step 2 again — must start in Edit with a fresh render.
    win.document.getElementById('exportSessionBtn').click();
    await settle();
    win.document.getElementById('exportNextBtn').click();
    await settle();
    assert.strictEqual(activeStep(win), 2, 'reopened dialog reaches the editor step');

    assert.ok(!editor.classList.contains('is-hidden'),
      'the editor is VISIBLE on reopen (no stale preview swap survived the close)');
    var frame = win.document.querySelector('.rich-toolbar-preview');
    assert.ok(frame && frame.classList.contains('is-hidden'),
      'the preview Frame is hidden on reopen');
    var editSeg = bar.querySelector('.rich-toolbar-swap-btn[data-mode="edit"]');
    assert.ok(editSeg && editSeg.classList.contains('is-active'),
      'the Edit segment is active on reopen (switcher reset)');

    env.dom.window.close();
  });

  // ─── 2. Back→Continue dirty guard: cancel preserves, confirm regenerates ──────
  await test('a dirty Step-2 edit then Back→Continue prompts a discard-confirm: cancel stays on Step 1 with the edit intact; confirm regenerates and advances', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    setVal(win, 'trappedEmotions', 'TRAP_X');

    win.document.getElementById('exportSessionBtn').click();
    await settle();
    win.document.getElementById('exportNextBtn').click(); // step 1 → 2 (builds editor md)
    await settle();
    assert.strictEqual(activeStep(win), 2, 'must reach the editor step');

    var editor = win.document.getElementById('exportEditor');
    assert.ok(editor.value.indexOf('TRAP_X') !== -1, 'the generated markdown carries the selected section');

    // Make the document dirty (real input event → onEditorInput sets hasEditedPreview).
    editor.value = 'DIRTY EDIT';
    editor.dispatchEvent(new win.Event('input', { bubbles: true }));
    await settle();

    // Back to Step 1.
    win.document.getElementById('exportBackBtn').click();
    await settle();
    assert.strictEqual(activeStep(win), 1, 'Back returns to Step 1');

    // Cancel the discard-confirm → stay on Step 1, edit intact.
    env.confirmRef.value = false;
    win.document.getElementById('exportNextBtn').click();
    await settle();
    assert.strictEqual(activeStep(win), 1, 'cancelled discard keeps the dialog on Step 1');
    assert.strictEqual(editor.value, 'DIRTY EDIT',
      'cancelled discard preserves the dirty Step-2 edit (editor.value not regenerated)');

    // Confirm the discard → regenerate + advance to Step 2.
    env.confirmRef.value = true;
    win.document.getElementById('exportNextBtn').click();
    await settle();
    assert.strictEqual(activeStep(win), 2, 'confirmed discard advances to Step 2');
    assert.ok(editor.value.indexOf('DIRTY EDIT') === -1,
      'confirmed discard regenerates the editor (the dirty edit is gone)');
    assert.ok(editor.value.indexOf('TRAP_X') !== -1,
      'the regenerated markdown carries the selected section again');

    env.dom.window.close();
  });

  var EXPECTED_COUNT = 2;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nGUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped.');
    process.exit(1);
  }

  console.log('');
  console.log('46.1-export-lifecycle — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
