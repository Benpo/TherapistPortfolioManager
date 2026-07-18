/**
 * tests/46.1-export-lifecycle.test.js — the export-modal preview LIFECYCLE
 * contract (RTXT-01/RTXT-05): reset-preview-on-close + the toggle-moment
 * discard guard.
 *
 * WHAT THIS PINS (observable OUTCOMES only — DOM state, never module internals):
 *   - Close-while-previewing then reopen: entering export Step 2 and opening
 *     Preview, then closing the modal and reopening + advancing to Step 2, leaves
 *     the editor VISIBLE, the Frame hidden, and the Edit segment active — no stale
 *     "mode lies" Frame survives the close (exportCloseDialog calls
 *     RichToolbar.resetPreview before hiding the modal).
 *   - The discard decision lives at the SECTION-TOGGLE moment, never on
 *     navigation:
 *       (a) edit -> Back -> Continue with the selection unchanged is SILENT —
 *           no dialog, Step 2 shows the edit with the undo stack intact;
 *       (b) toggling a section checkbox while dirty prompts the discard confirm;
 *           cancel reverts the checkbox and keeps the edits;
 *       (c) confirming the toggle rebuilds the buffer from the new selection
 *           right there (dirty cleared), and Continue lands on Step 2 with the
 *           fresh document.
 *
 * HARNESS: cloned from tests/30-export-stepper.test.js buildEnv (real
 * add-session.html body + real assets, App stub, mock PortfolioDB, real
 * DOMContentLoaded, open via #exportSessionBtn). The App stub's confirmDialog is
 * made controllable per case via a mutable ref (resolution value + a call
 * counter, so "NO dialog fired" is a positive assertion).
 *
 * Run: node tests/46.1-export-lifecycle.test.js — exit 0 on full pass, 1 on any
 * failure.
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
// stubbed App.confirmDialog resolves to, flippable mid-test; `.calls` counts
// invocations so a "no dialog" expectation is asserted positively.
function buildEnv() {
  var confirmRef = { value: true, calls: 0 };
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
    confirmDialog: function () { confirmRef.calls++; return Promise.resolve(confirmRef.value); },
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
  // jsdom does not implement execCommand; force TextEdit's deterministic splice
  // fallback so undo restores apply.
  win.document.execCommand = function () { return false; };
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

  // Shared setup for the toggle-moment guard cases: seed a trapped-emotions
  // marker, open the export, reach Step 2, make the buffer dirty, go Back.
  async function buildDirtyOnStep1() {
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

    // Make the document dirty (real input event → onEditorInput sets the flag).
    editor.value = 'DIRTY EDIT';
    editor.dispatchEvent(new win.Event('input', { bubbles: true }));
    await settle();

    // Back to Step 1 — must be silent (no dialog on navigation).
    env.confirmRef.calls = 0;
    win.document.getElementById('exportBackBtn').click();
    await settle();
    assert.strictEqual(activeStep(win), 1, 'Back returns to Step 1');
    assert.strictEqual(env.confirmRef.calls, 0, 'Back never prompts');

    return { env: env, win: win, editor: editor };
  }

  // ─── 2a. Back→Continue with an unchanged selection is SILENT ──────────────────
  await test('edit → Back → Continue with the selection unchanged: NO dialog, Step 2 shows the edit, undo stack intact', async function () {
    var s = await buildDirtyOnStep1();

    s.win.document.getElementById('exportNextBtn').click();
    await settle();
    assert.strictEqual(s.env.confirmRef.calls, 0, 'unchanged-selection Continue never prompts');
    assert.strictEqual(activeStep(s.win), 2, 'Continue lands on Step 2');
    assert.strictEqual(s.editor.value, 'DIRTY EDIT',
      'the dirty edit survives the round-trip untouched (no regeneration)');

    // Undo stack intact: one undo steps back from the edit to the generated doc.
    assert.strictEqual(s.win.TextEdit.undo(s.editor), true, 'undo still has the pre-edit step');
    assert.ok(s.editor.value.indexOf('TRAP_X') !== -1,
      'undo restores the generated markdown (stack not reset by the round-trip)');

    s.env.dom.window.close();
  });

  // ─── 2b. Toggling a section while dirty prompts; cancel reverts the toggle ────
  await test('edit → Back → toggle a section checkbox: discard dialog fires; cancel reverts the checkbox and keeps the edits', async function () {
    var s = await buildDirtyOnStep1();

    var cb = s.win.document.querySelector('#exportStep1Rows input[data-section-key="trapped"]');
    assert.ok(cb, 'the trapped-emotions section row exists');
    assert.strictEqual(cb.checked, true, 'precondition: the section is selected');

    s.env.confirmRef.value = false; // "Keep editing"
    cb.click();
    await settle();
    assert.strictEqual(s.env.confirmRef.calls, 1, 'the toggle fired the discard dialog');
    assert.strictEqual(cb.checked, true, 'cancel reverts the checkbox to its prior state');
    assert.strictEqual(s.editor.value, 'DIRTY EDIT', 'cancel keeps the edits');

    // Selection and edits are consistent again, so Continue stays silent.
    s.win.document.getElementById('exportNextBtn').click();
    await settle();
    assert.strictEqual(s.env.confirmRef.calls, 1, 'Continue after cancel never prompts again');
    assert.strictEqual(activeStep(s.win), 2, 'Continue lands on Step 2');
    assert.strictEqual(s.editor.value, 'DIRTY EDIT', 'the edit is still intact on Step 2');

    s.env.dom.window.close();
  });

  // ─── 2c. Confirming the toggle rebuilds the buffer from the new selection ─────
  await test('edit → Back → toggle + confirm: buffer rebuilds from the new selection, dirty clears, Continue shows the fresh document', async function () {
    var s = await buildDirtyOnStep1();

    var cb = s.win.document.querySelector('#exportStep1Rows input[data-section-key="trapped"]');
    assert.ok(cb, 'the trapped-emotions section row exists');

    s.env.confirmRef.value = true; // "Discard"
    cb.click();
    await settle();
    assert.strictEqual(s.env.confirmRef.calls, 1, 'the toggle fired the discard dialog');
    assert.strictEqual(cb.checked, false, 'confirm applies the toggle');
    assert.ok(s.editor.value.indexOf('DIRTY EDIT') === -1, 'confirm discards the edits');
    assert.ok(s.editor.value.indexOf('TRAP_X') === -1,
      'the rebuilt document reflects the NEW selection (deselected section gone)');
    var rebuilt = s.editor.value;

    s.win.document.getElementById('exportNextBtn').click();
    await settle();
    assert.strictEqual(s.env.confirmRef.calls, 1, 'Continue after the rebuild never prompts');
    assert.strictEqual(activeStep(s.win), 2, 'Continue lands on Step 2');
    assert.strictEqual(s.editor.value, rebuilt,
      'Step 2 shows the document the toggle rebuilt (no second regeneration)');

    s.env.dom.window.close();
  });

  var EXPECTED_COUNT = 4;
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
