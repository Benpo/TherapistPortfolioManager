/**
 * tests/46.1-emphasis-noop-zero-editinsert.test.js — the caller side of the
 * toggle contract's C8 (46.1-BOLD-SEMANTICS-RESEARCH §3): a no-op toggle
 * outcome (zero-length empty replacement) must make ZERO editInsert calls and
 * record no undo boundary — while still honoring the transform's caret move
 * (the hop past a closing marker). A real formatting press must still route
 * exactly ONE editInsert (one spanning replacement = one undo step).
 *
 * Drives the REAL dispatch path (mousedown on the toolbar's bold control →
 * applyTransform → TextEdit) in jsdom, counting editInsert calls and input
 * events through a wrapper — the tests/46-persistent-bar-dispatch.test.js
 * environment idiom.
 *
 * Run: node tests/46.1-emphasis-noop-zero-editinsert.test.js  (exit 0/1)
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
    '<!DOCTYPE html><body><div id="host"><textarea id="ta"></textarea></div></body>',
    { url: 'https://example.test/', pretendToBeVisual: true, runScripts: 'outside-only' }
  );
  const win = dom.window;
  win.matchMedia = win.matchMedia || function () {
    return { matches: false, addListener() {}, removeListener() {} };
  };
  // jsdom has no execCommand; TextEdit's splice fallback fires a real input event.
  win.document.execCommand = function () { return false; };
  win.App = { t(k) { return k; } };
  win.eval(asset('assets/text-edit.js'));
  win.eval(asset('assets/rich-toolbar.js'));
  const ta = win.document.getElementById('ta');
  // Count every editInsert the toolbar routes (rich-toolbar resolves
  // window.TextEdit.editInsert at call time, so the wrapper is authoritative).
  const counters = { editInsert: 0, input: 0 };
  const realEditInsert = win.TextEdit.editInsert;
  win.TextEdit.editInsert = function () {
    counters.editInsert++;
    return realEditInsert.apply(this, arguments);
  };
  ta.addEventListener('input', function () { counters.input++; });
  win.RichToolbar.mount([ta], { headings: true, persistent: true });
  return { win, ta, counters };
}

function boldPress(win, ta) {
  const bar = ta.previousElementSibling;
  const btn = bar.querySelector('.rich-toolbar-btn[data-action="bold"]');
  btn.dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  PASS  ' + name); }
  catch (err) { failed++; console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); }
}

test('caret hop past a closing marker: caret moves, ZERO editInsert calls, no input event', () => {
  const { win, ta, counters } = makeEnv();
  ta.value = '**word**';
  win.TextEdit.undoReset(ta); // programmatic populate → re-seed the undo floor (the app's own convention)
  ta.focus();
  ta.dispatchEvent(new win.Event('focusin', { bubbles: true }));
  ta.setSelectionRange(6, 6); // end of the span content, before the closer
  counters.editInsert = 0; counters.input = 0;
  boldPress(win, ta);
  assert.strictEqual(ta.value, '**word**', 'the value is untouched');
  assert.strictEqual(counters.editInsert, 0, 'a no-op press must make zero editInsert calls');
  assert.strictEqual(counters.input, 0, 'a no-op press must fire no input event');
  assert.strictEqual(ta.selectionStart, 8, 'the caret still hopped past the closing marker');
  assert.strictEqual(ta.selectionEnd, 8);
  assert.strictEqual(win.TextEdit.canUndo(ta), false, 'no undo step was recorded');
});

test('all-whitespace selection: nothing changes, ZERO editInsert calls', () => {
  const { win, ta, counters } = makeEnv();
  ta.value = 'a   b';
  ta.focus();
  ta.dispatchEvent(new win.Event('focusin', { bubbles: true }));
  ta.setSelectionRange(1, 4);
  counters.editInsert = 0; counters.input = 0;
  boldPress(win, ta);
  assert.strictEqual(ta.value, 'a   b', 'the value is untouched');
  assert.strictEqual(counters.editInsert, 0, 'zero editInsert calls');
  assert.strictEqual(counters.input, 0, 'no input event');
  assert.strictEqual(ta.selectionStart, 1, 'the selection is preserved');
  assert.strictEqual(ta.selectionEnd, 4);
});

test('a REAL wrap still routes exactly ONE editInsert (one spanning replacement = one undo step)', () => {
  const { win, ta, counters } = makeEnv();
  ta.value = 'make bold now';
  ta.focus();
  ta.dispatchEvent(new win.Event('focusin', { bubbles: true }));
  ta.setSelectionRange(5, 9);
  counters.editInsert = 0; counters.input = 0;
  boldPress(win, ta);
  assert.strictEqual(ta.value, 'make **bold** now', 'the wrap applied');
  assert.strictEqual(counters.editInsert, 1, 'exactly one editInsert call for the whole press');
  assert.strictEqual(ta.selectionStart, 7, 'selection covers the wrapped content');
  assert.strictEqual(ta.selectionEnd, 11);
  assert.strictEqual(win.TextEdit.canUndo(ta), true, 'the press is undoable');
  assert.strictEqual(win.TextEdit.undo(ta), true, 'undo moves');
  assert.strictEqual(ta.value, 'make bold now', 'one undo step reverts the whole press');
});

const EXPECTED = 3;
if (passed + failed !== EXPECTED) {
  console.log('  FAIL  count guard: expected ' + EXPECTED + ' tests, ran ' + (passed + failed));
  failed++;
} else {
  console.log('  PASS  count guard: ' + EXPECTED + ' tests ran');
}

console.log('\n46.1 emphasis no-op zero-editInsert: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
