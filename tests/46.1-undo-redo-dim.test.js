/**
 * tests/46.1-undo-redo-dim.test.js — the undo/redo buttons dim to the field's
 * REAL history availability (UAT round 2: "the undo button should be greyed out
 * when there is nothing to undo", plus the symmetric redo treatment).
 *
 * WHAT THIS PINS (observable OUTCOMES only — DOM classes/attributes, never
 * module internals):
 *   - A freshly mounted PERSISTENT (export-analogue) bar starts with undo AND
 *     redo dimmed: is-unavailable class + aria-disabled="true" — but NEVER the
 *     real `disabled` attribute (a hard-disabled button swallows mousedown,
 *     blurring the field and collapsing the shared bar — the focus-preservation
 *     contract).
 *   - Typing (a real input event) lights undo up after the rAF-coalesced
 *     refresh; redo stays dimmed.
 *   - Clicking undo (real mousedown — the toolbar binds mousedown, not click)
 *     restores the pre-edit value, dims undo again, and lights redo up.
 *   - Clicking redo re-applies the edit and the dims swap back.
 *   - The SHARED note-field bar shows the same dim treatment when the field is
 *     focused with an empty history.
 *   - A dimmed undo click is a harmless no-op (the TextEdit guard backstop).
 *
 * HARNESS: cloned from tests/46-persistent-bar-dispatch.test.js (fresh JSDOM per
 * case; execCommand stubbed to force TextEdit's splice fallback so restores fire
 * real input events; pass-through App.t). The toolbar coalesces availability
 * refreshes through requestAnimationFrame/setTimeout, so cases await a flush
 * after every input before asserting.
 *
 * Run: node tests/46.1-undo-redo-dim.test.js — exit 0 on full pass, 1 on any
 * failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const REPO = path.resolve(__dirname, '..');
function asset(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }

function makeEnv() {
  const dom = new JSDOM(
    '<!DOCTYPE html><body><div id="host">' +
      '<textarea id="taP"></textarea><textarea id="taS"></textarea>' +
    '</div></body>',
    { url: 'https://example.test/', pretendToBeVisual: true, runScripts: 'outside-only' }
  );
  const win = dom.window;
  win.matchMedia = win.matchMedia || function () {
    return { matches: false, addListener() {}, removeListener() {} };
  };
  // jsdom does not implement execCommand; force TextEdit's deterministic splice
  // fallback (which fires a real input event) so edits are observable headlessly.
  win.document.execCommand = function () { return false; };
  win.App = { t(k) { return k; } };
  win.eval(asset('assets/text-edit.js'));
  win.eval(asset('assets/rich-toolbar.js'));
  const taP = win.document.getElementById('taP');
  const taS = win.document.getElementById('taS');
  win.RichToolbar.mount([taP], { headings: true, persistent: true });
  win.RichToolbar.mount([taS], { headings: true });
  return { win, taP, taS };
}

function persistentBar(taP) { return taP.previousElementSibling; }
function btn(bar, action) {
  return bar.querySelector('.rich-toolbar-btn[data-action="' + action + '"]');
}
function dimState(bar, action) {
  const b = btn(bar, action);
  return {
    dimmed: b.classList.contains('is-unavailable'),
    ariaDisabled: b.getAttribute('aria-disabled') === 'true',
    hardDisabled: b.hasAttribute('disabled'),
  };
}
function mousedown(win, el) {
  el.dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}
// Simulate real typing at the caret: value splice + a bubbling input event (the
// toolbar's input listener drives undoNoteInput + the coalesced refresh).
function type(win, ta, text) {
  const s = ta.selectionStart;
  ta.value = ta.value.slice(0, s) + text + ta.value.slice(ta.selectionEnd);
  ta.selectionStart = ta.selectionEnd = s + text.length;
  const ev = new win.Event('input', { bubbles: true });
  ev.inputType = 'insertText';
  ta.dispatchEvent(ev);
}
// The availability refresh rides a rAF/16ms-setTimeout coalescer — flush it.
function flushRefresh() { return new Promise((r) => setTimeout(r, 40)); }

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('PASS  ' + name); }
  catch (err) { failed++; console.log('FAIL  ' + name); console.log('      ' + (err && err.message || err)); }
}

(async function () {

  await test('persistent bar starts with undo AND redo dimmed (aria-disabled, never the disabled attribute)', async function () {
    const { taP } = makeEnv();
    const bar = persistentBar(taP);
    ['undo', 'redo'].forEach(function (action) {
      const s = dimState(bar, action);
      assert.strictEqual(s.dimmed, true, action + ' starts dimmed on a fresh history');
      assert.strictEqual(s.ariaDisabled, true, action + ' carries aria-disabled');
      assert.strictEqual(s.hardDisabled, false, action + ' must NEVER be hard-disabled (mousedown must still fire)');
    });
  });

  await test('typing lights undo up (redo stays dimmed); undo click restores, dims undo, lights redo; redo swaps back', async function () {
    const { win, taP } = makeEnv();
    const bar = persistentBar(taP);
    taP.focus();
    type(win, taP, 'hello');
    await flushRefresh();
    assert.strictEqual(dimState(bar, 'undo').dimmed, false, 'undo lights up after typing');
    assert.strictEqual(dimState(bar, 'redo').dimmed, true, 'redo stays dimmed — nothing undone yet');

    mousedown(win, btn(bar, 'undo'));
    await flushRefresh();
    assert.strictEqual(taP.value, '', 'undo restored the pre-typing state');
    assert.strictEqual(dimState(bar, 'undo').dimmed, true, 'undo dims at the history floor');
    assert.strictEqual(dimState(bar, 'redo').dimmed, false, 'redo lights up after an undo');

    mousedown(win, btn(bar, 'redo'));
    await flushRefresh();
    assert.strictEqual(taP.value, 'hello', 'redo re-applied the edit');
    assert.strictEqual(dimState(bar, 'undo').dimmed, false, 'undo available again at the tip');
    assert.strictEqual(dimState(bar, 'redo').dimmed, true, 'redo dims at the tip');
  });

  await test('shared note-field bar: focusing an empty-history field shows both dimmed; a dimmed undo click is a no-op', async function () {
    const { win, taS } = makeEnv();
    taS.value = 'note text';
    // Re-seed so the pre-set value is the undo floor (mirrors the load path).
    win.TextEdit.undoReset(taS);
    taS.focus();
    taS.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));
    const bar = taS.previousElementSibling;
    assert.ok(bar && bar.classList.contains('rich-toolbar'), 'shared bar docked above the note field');
    assert.strictEqual(dimState(bar, 'undo').dimmed, true, 'undo dimmed with nothing to undo');
    assert.strictEqual(dimState(bar, 'redo').dimmed, true, 'redo dimmed with nothing to redo');
    mousedown(win, btn(bar, 'undo'));
    await flushRefresh();
    assert.strictEqual(taS.value, 'note text', 'a dimmed undo click changes nothing (guard backstop)');
  });

  console.log('\n46.1-undo-redo-dim: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
