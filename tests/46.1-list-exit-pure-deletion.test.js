/**
 * tests/46.1-list-exit-pure-deletion.test.js — the PURE-DELETION class of
 * editInsert edits (list exit on Enter, outdent) against a REAL-ENGINE
 * execCommand emulation.
 *
 * THE QUIRK THIS PINS: real browser engines treat `insertText` with an EMPTY
 * string as a no-op — and some still report success (return true), so the
 * value-splice fallback never fires either. Every edit whose replacement is ""
 * over a non-empty range (the Enter-on-empty-item list exit, outdent) silently
 * does NOTHING in production: the user can never leave a list by pressing
 * Enter. The jsdom suite's usual execCommand stubs splice "" correctly, which
 * is exactly why they could not catch this — so THIS file's stub emulates the
 * real engine: insertText with "" does nothing (and returns true); 'delete'
 * genuinely removes the selected range and fires a real input event.
 *
 * RED-first against the insertText-only chokepoint; goes GREEN when editInsert
 * routes pure deletions through execCommand('delete') (same contract: native
 * undo intact, genuine input event).
 *
 * Driven through the real toolbar keydown/button paths (rich-toolbar.js), not
 * the transforms alone — the transforms were always correct; the chokepoint is
 * what loses the edit. Run: node tests/46.1-list-exit-pure-deletion.test.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const REPO = path.resolve(__dirname, '..');
function asset(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }

// Emulate the real-engine execCommand contract on the focused textarea:
//   - 'insertText' with text  → splice at the selection, caret after, input event;
//   - 'insertText' with ""    → NO-OP that still reports success (the quirk);
//   - 'delete'                → remove the selected range, caret at start, input event.
// Every call is recorded so a test can assert WHICH path the chokepoint took.
function makeEnv() {
  const dom = new JSDOM(
    '<!DOCTYPE html><body><textarea id="ta"></textarea></body>',
    { url: 'https://example.test/', pretendToBeVisual: true, runScripts: 'outside-only' }
  );
  const win = dom.window;
  win.matchMedia = win.matchMedia || function () {
    return { matches: false, addListener() {}, removeListener() {} };
  };
  win.App = { t(k) { return k; } };
  const calls = [];
  win.document.execCommand = function (cmd, ui, value) {
    calls.push({ cmd: cmd, value: value });
    const ta = win.document.activeElement;
    if (!ta || ta.tagName !== 'TEXTAREA') return false;
    const s = ta.selectionStart, e = ta.selectionEnd;
    if (cmd === 'insertText') {
      if (value === '') return true; // the real-engine quirk: no-op, reports success
      ta.value = ta.value.slice(0, s) + value + ta.value.slice(e);
      const caret = s + value.length;
      ta.setSelectionRange(caret, caret);
      ta.dispatchEvent(new win.Event('input', { bubbles: true }));
      return true;
    }
    if (cmd === 'delete') {
      if (s !== e) {
        ta.value = ta.value.slice(0, s) + ta.value.slice(e);
        ta.setSelectionRange(s, s);
        ta.dispatchEvent(new win.Event('input', { bubbles: true }));
      }
      return true;
    }
    return false;
  };
  win.eval(asset('assets/md-render.js'));
  win.eval(asset('assets/text-edit.js'));
  win.eval(asset('assets/rich-toolbar.js'));
  const ta = win.document.getElementById('ta');
  win.RichToolbar.mount([ta], { headings: true });
  ta.focus();
  ta.dispatchEvent(new win.FocusEvent('focusin'));
  return { win, ta, calls };
}

function pressEnter(win, ta) {
  ta.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
}
function mousedown(win, el) {
  el.dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (err) { failed++; console.log('FAIL  ' + name); console.log('      ' + (err && err.message || err)); }
}

// ── Enter on an empty top-level item exits the list ──────────────────────────────
test('Enter on an empty ordered item removes the marker (list exit actually lands)', function () {
  const { win, ta } = makeEnv();
  ta.value = '1. one\n2. ';
  ta.setSelectionRange(ta.value.length, ta.value.length);
  pressEnter(win, ta);
  assert.strictEqual(ta.value, '1. one\n',
    'the empty item\'s marker is removed — the list exit must survive the real-engine quirk');
  assert.strictEqual(ta.selectionStart, 7, 'the caret lands on the now-plain line');
  // A third Enter would be plain (no list transform takes over any more).
  assert.strictEqual(win.TextEdit.autoFormatEnter(ta.value, ta.selectionStart), null,
    'the exited line no longer auto-formats — the next keystroke is plain text');
});

test('Enter on an empty bullet item exits too, and the exit fires a real input event', function () {
  const { win, ta } = makeEnv();
  ta.value = '- one\n- ';
  ta.setSelectionRange(ta.value.length, ta.value.length);
  let inputs = 0;
  ta.addEventListener('input', function () { inputs++; });
  pressEnter(win, ta);
  assert.strictEqual(ta.value, '- one\n', 'the empty bullet marker is removed');
  assert.ok(inputs >= 1, 'the deletion fired a genuine input event (autoGrow/snippets contract)');
});

// ── The outdent button on a nested list line (same deletion class) ───────────────
test('the outdent button removes one indent level on a nested list line', function () {
  const { win, ta } = makeEnv();
  ta.value = '- top\n  - nested';
  ta.setSelectionRange(ta.value.length, ta.value.length);
  const bar = ta.previousElementSibling;
  assert.ok(bar && bar.classList.contains('rich-toolbar'), 'the shared bar docked above the field');
  mousedown(win, bar.querySelector('.rich-toolbar-btn[data-action="outdent"]'));
  assert.strictEqual(ta.value, '- top\n- nested',
    'outdent removes the two leading spaces — the pure deletion must survive the quirk');
});

// ── The non-empty path is untouched: continuation still rides insertText ─────────
test('list continuation still inserts via execCommand insertText (non-empty path unchanged)', function () {
  const { win, ta, calls } = makeEnv();
  ta.value = '1. one';
  ta.setSelectionRange(6, 6);
  calls.length = 0;
  pressEnter(win, ta);
  assert.strictEqual(ta.value, '1. one\n2. ', 'the list continues with the next ordinal');
  assert.ok(calls.some(function (c) { return c.cmd === 'insertText' && c.value === '\n2. '; }),
    'the continuation insert went through insertText');
  assert.ok(!calls.some(function (c) { return c.cmd === 'insertText' && c.value === ''; }),
    'no empty insertText was issued anywhere in the sequence');
});

// ── Undo/redo stay intact across the deletion path ───────────────────────────────
test('undo restores the exited marker; redo removes it again', function () {
  const { win, ta } = makeEnv();
  ta.value = '1. one\n2. ';
  ta.setSelectionRange(ta.value.length, ta.value.length);
  win.TextEdit.undoReset(ta); // the loaded content is the undo floor
  pressEnter(win, ta);
  assert.strictEqual(ta.value, '1. one\n', 'precondition: the exit landed');
  assert.strictEqual(win.TextEdit.undo(ta), true, 'the exit is one undo step');
  assert.strictEqual(ta.value, '1. one\n2. ', 'undo restores the marker');
  assert.strictEqual(win.TextEdit.redo(ta), true, 'redo is available');
  assert.strictEqual(ta.value, '1. one\n', 'redo removes the marker again');
});

console.log('\n46.1-list-exit-pure-deletion: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
