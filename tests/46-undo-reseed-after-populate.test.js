/**
 * Behavior tests for window.TextEdit.undoReset — the re-seed API that fixes the
 * stale-baseline bug: the undo stack is seeded once at mount time (field empty),
 * but both editors are later bulk-populated by direct `.value =` assignment,
 * which fires no input event and never re-seeds the history. Before the fix, the
 * first undo wiped the loaded content back to the empty mount-time baseline.
 *
 * undoReset re-seeds the baseline to the field's current value and clears the
 * snapshot stack / pending step, so the loaded content becomes the undo floor.
 *
 * Loads assets/text-edit.js in a vm sandbox (mirrors tests/undo-stack.test.js).
 *
 * Run: node tests/46-undo-reseed-after-populate.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// --- Sandbox with a controllable clock + insertText execCommand ------------
function makeSandbox() {
  const sandbox = {
    window: {},
    document: {
      execCommand(cmd, showUI, value) {
        if (cmd === 'insertText' && sandbox.__activeTextarea) {
          const ta = sandbox.__activeTextarea;
          const v = ta.value;
          ta.value = v.slice(0, ta.selectionStart) + value + v.slice(ta.selectionEnd);
          const caret = ta.selectionStart + value.length;
          ta.selectionStart = ta.selectionEnd = caret;
          return true;
        }
        return false;
      },
    },
    console: { log() {}, warn() {}, error() {} },
    Event: function Event(type, opts) { this.type = type; this.bubbles = !!(opts && opts.bubbles); },
    JSON, Math, Array, Object, Set, Map, WeakMap, RegExp, String, Number, Boolean,
  };
  sandbox.__now = 1000;
  sandbox.__activeTextarea = null;
  sandbox.Date = { now: () => sandbox.__now };
  vm.createContext(sandbox);
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'text-edit.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'assets/text-edit.js' });
  return sandbox;
}

let sandbox;
try {
  sandbox = makeSandbox();
} catch (err) {
  console.error('FATAL: assets/text-edit.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const TextEdit = sandbox.window.TextEdit;
if (!TextEdit) {
  console.error('FAIL: window.TextEdit not found.');
  process.exit(1);
}

// --- Tiny test runner ------------------------------------------------------
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + err.message); failed++; }
}

function makeTA(value) {
  const ta = {
    value: value || '',
    selectionStart: (value || '').length,
    selectionEnd: (value || '').length,
    focus() {},
    setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; },
  };
  return ta;
}
function activate(ta) { sandbox.__activeTextarea = ta; return ta; }
// Bulk-populate via direct `.value =` (populateSession / editor.value = md):
// no input event, the stack is NOT notified.
function populate(ta, value) {
  ta.value = value;
  ta.selectionStart = ta.selectionEnd = value.length;
}
// Ordinary typing at the caret, which notifies the stack as onFieldInput would.
function type(ta, text, inputType) {
  const s = ta.selectionStart;
  ta.value = ta.value.slice(0, s) + text + ta.value.slice(ta.selectionEnd);
  const c = s + text.length;
  ta.selectionStart = ta.selectionEnd = c;
  TextEdit.undoNoteInput(ta, inputType || 'insertText');
}

// --- public surface --------------------------------------------------------
test('undoReset is exposed on the public surface', () => {
  assert.strictEqual(typeof TextEdit.undoReset, 'function',
    'window.TextEdit.undoReset must be a function');
});

// --- (a) first undo immediately after load is a no-op ----------------------
test('first undo immediately after programmatic populate is a no-op (stays loaded)', () => {
  const ta = activate(makeTA(''));
  TextEdit.undoTrack(ta);            // mount-time seed while empty
  populate(ta, 'loaded notes');      // bulk populate via direct .value =
  TextEdit.undoReset(ta);            // re-seed baseline to the loaded content
  const moved = TextEdit.undo(ta);
  assert.strictEqual(moved, false, 'nothing to undo — the load itself is the floor');
  assert.strictEqual(ta.value, 'loaded notes', 'first undo must NOT wipe loaded content');
});

// --- (b) first typed edit undoes back to the loaded content, not empty -----
test('after the first typed edit, one undo returns to the loaded content (not empty)', () => {
  const ta = activate(makeTA(''));
  TextEdit.undoTrack(ta);            // mount-time seed while empty
  populate(ta, 'loaded');           // bulk populate
  TextEdit.undoReset(ta);           // re-seed baseline
  sandbox.__now = 2000;
  type(ta, 'X');                     // first user edit
  assert.strictEqual(ta.value, 'loadedX');
  const moved = TextEdit.undo(ta);
  assert.strictEqual(moved, true);
  assert.strictEqual(ta.value, 'loaded',
    'undo removes the edit and returns to loaded content, not the stale empty baseline');
});

// --- (c) undoReset clears the prior stack (no cross-populate bleed) ---------
test('undoReset clears prior undo/redo history (no cross-population bleed)', () => {
  const ta = activate(makeTA(''));
  TextEdit.undoTrack(ta);
  populate(ta, 'first export');
  TextEdit.undoReset(ta);
  sandbox.__now = 3000;
  type(ta, '!');                     // build up some history on the first document
  // A second dialog open / new session populates the same field afresh.
  populate(ta, 'second export');
  TextEdit.undoReset(ta);
  const moved = TextEdit.undo(ta);
  assert.strictEqual(moved, false, 'the prior snapshots must not survive the reset');
  assert.strictEqual(ta.value, 'second export', 'no bleed from the previous population');
});

// --- Summary ---------------------------------------------------------------
console.log('\n46-undo-reseed: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
