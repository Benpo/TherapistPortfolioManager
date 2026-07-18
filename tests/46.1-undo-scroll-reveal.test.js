/**
 * tests/46.1-undo-scroll-reveal.test.js — undo/redo keep the changed text
 * visible in an internally-scrolling editor (UAT round 2: "in export when I do
 * undo, the edit window jumps to the top — I don't see the changed text").
 *
 * THE BUG THIS GUARDS: the undo restore rewrites the WHOLE value through the
 * insert chokepoint, which resets a fixed-height scrolling textarea (the export
 * editor) to the top in WebKit; setSelectionRange never scrolls, so the restored
 * change site sat off screen. The toolbar now measures the caret's Y after a
 * restore that actually moved and re-scrolls the field so the caret band is
 * inside the visible window (centred when it was outside).
 *
 * WHAT THIS PINS (observable OUTCOMES only):
 *   - Undo on a SCROLLING field whose scroll position sits far from the restored
 *     caret brings scrollTop back into the caret's visible band (jsdom has no
 *     layout, so the mirror measures the caret at y=0 — the pin is that the
 *     stale scroll offset is CORRECTED toward the caret, not left where it was).
 *   - The restored selection is the change site recorded in the history step.
 *   - Redo performs the same reveal (symmetry).
 *   - A NON-scrolling field (the autogrowing note-field shape: no scroll room)
 *     never has its scrollTop touched — the guard keeps the page scroll safe.
 *   - The restore still fires a real input event (the undo-stack contract this
 *     module rides is unchanged).
 *
 * HARNESS: cloned from tests/46-persistent-bar-dispatch.test.js (fresh JSDOM per
 * case; execCommand stubbed to force TextEdit's splice fallback so restores fire
 * real input events; pass-through App.t). Scroll geometry is stubbed per
 * textarea instance (scrollHeight/clientHeight/scrollTop), which is exactly what
 * jsdom CAN pin; the real-geometry behavior is verified in WebKit by the manual
 * probe flow documented in the phase notes.
 *
 * Run: node tests/46.1-undo-scroll-reveal.test.js — exit 0 on full pass, 1 on
 * any failure.
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

// Give a jsdom textarea the geometry of a fixed-height internally-scrolling
// editor: tall content, short viewport, a live scrollTop store.
function makeScrollable(ta, { scrollHeight = 1600, clientHeight = 200, scrollTop = 0 } = {}) {
  let st = scrollTop;
  Object.defineProperty(ta, 'scrollHeight', { get: () => scrollHeight, configurable: true });
  Object.defineProperty(ta, 'clientHeight', { get: () => clientHeight, configurable: true });
  Object.defineProperty(ta, 'scrollTop', {
    get: () => st,
    set: (v) => { st = Math.max(0, Math.min(v, scrollHeight - clientHeight)); },
    configurable: true,
  });
}

function persistentBar(taP) { return taP.previousElementSibling; }
function mousedown(win, el) {
  el.dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}
function type(win, ta, text) {
  const s = ta.selectionStart;
  ta.value = ta.value.slice(0, s) + text + ta.value.slice(ta.selectionEnd);
  ta.selectionStart = ta.selectionEnd = s + text.length;
  const ev = new win.Event('input', { bubbles: true });
  ev.inputType = 'insertText';
  ta.dispatchEvent(ev);
}

const LONG_DOC = Array.from({ length: 60 }, (_, i) => 'line ' + (i + 1)).join('\n');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (err) { failed++; console.log('FAIL  ' + name); console.log('      ' + (err && err.message || err)); }
}

test('undo on a scrolling editor corrects a stale scroll offset into the restored caret\'s visible band', function () {
  const { win, taP } = makeEnv();
  makeScrollable(taP);
  taP.value = LONG_DOC;
  taP.setSelectionRange(0, 0);
  win.TextEdit.undoReset(taP); // baseline: long doc, caret recorded at the top
  taP.focus();
  const editAt = LONG_DOC.indexOf('line 40');
  taP.setSelectionRange(editAt, editAt);
  type(win, taP, 'EDITED ');
  // The user has scrolled far away from where the undo will land the caret.
  taP.scrollTop = 1400;
  mousedown(win, persistentBar(taP).querySelector('[data-action="undo"]'));
  assert.strictEqual(taP.value, LONG_DOC, 'undo restored the pre-edit document');
  assert.strictEqual(taP.selectionStart, 0,
    'selection stays the caret recorded in the history step (the stack contract is untouched)');
  // jsdom measures the caret at y=0 (no layout): the reveal must bring the view
  // back to the caret band. Leaving scrollTop at the stale 1400 is the bug.
  assert.ok(taP.scrollTop <= 100,
    'scrollTop corrected into the caret band (got ' + taP.scrollTop + ', stale was 1400)');
});

test('redo performs the same reveal (symmetry)', function () {
  const { win, taP } = makeEnv();
  makeScrollable(taP);
  taP.value = LONG_DOC;
  taP.setSelectionRange(0, 0);
  win.TextEdit.undoReset(taP);
  taP.focus();
  type(win, taP, 'EDITED ');
  mousedown(win, persistentBar(taP).querySelector('[data-action="undo"]'));
  taP.scrollTop = 1400; // scroll away between undo and redo
  mousedown(win, persistentBar(taP).querySelector('[data-action="redo"]'));
  assert.strictEqual(taP.value, 'EDITED ' + LONG_DOC, 'redo re-applied the edit');
  assert.ok(taP.scrollTop <= 100,
    'redo also reveals the changed site (got ' + taP.scrollTop + ')');
});

test('a non-scrolling (autogrowing-shape) field never has its scrollTop touched', function () {
  const { win, taS } = makeEnv();
  // No geometry stubs: scrollHeight === clientHeight === 0 — no scroll room, the
  // autogrow shape. Plant a sentinel to prove the reveal never writes.
  let wrote = false;
  Object.defineProperty(taS, 'scrollTop', {
    get: () => 0,
    set: () => { wrote = true; },
    configurable: true,
  });
  taS.value = 'note';
  taS.setSelectionRange(4, 4);
  win.TextEdit.undoReset(taS);
  taS.focus();
  taS.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));
  type(win, taS, ' more');
  const bar = taS.previousElementSibling;
  mousedown(win, bar.querySelector('[data-action="undo"]'));
  assert.strictEqual(taS.value, 'note', 'undo restored the note');
  assert.strictEqual(wrote, false, 'scrollTop was never written on a field with no internal scroll');
});

test('the reveal path keeps the restore\'s real-input-event contract intact', function () {
  const { win, taP } = makeEnv();
  makeScrollable(taP);
  taP.value = LONG_DOC;
  win.TextEdit.undoReset(taP);
  taP.focus();
  type(win, taP, 'X');
  let inputs = 0;
  taP.addEventListener('input', function () { inputs++; });
  mousedown(win, persistentBar(taP).querySelector('[data-action="undo"]'));
  assert.ok(inputs >= 1, 'the restore still fires a real input event');
});

console.log('\n46.1-undo-scroll-reveal: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
