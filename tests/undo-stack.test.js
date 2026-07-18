/**
 * Behavior tests for window.TextEdit's module-owned undo/redo stack:
 * undoTrack / undoUntrack / undoRecord / undoNoteInput / undo / redo and the
 * pure availability reads canUndo / canRedo, plus the pure coalesce-boundary
 * decision (shouldOpenBoundary).
 *
 * Loads assets/text-edit.js in a vm sandbox (mirrors tests/text-edit.test.js).
 * A fake document.execCommand applies insertText to the active fake textarea so
 * the real restore path (which routes through editInsert) runs headlessly. The
 * sandbox Date.now() is controllable (sandbox.__now) so the typing-pause
 * boundary is deterministic without real sleeps.
 *
 * Run: node tests/undo-stack.test.js
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
  // Controllable clock: the module reads Date.now() for the pause boundary.
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
for (const fn of ['undoTrack', 'undoUntrack', 'undoRecord', 'undoNoteInput', 'undo', 'redo']) {
  if (typeof TextEdit[fn] !== 'function') {
    console.error('FAIL: window.TextEdit.' + fn + ' is not a function.');
    process.exit(1);
  }
}
if (!TextEdit.__testExports || typeof TextEdit.__testExports.shouldOpenBoundary !== 'function') {
  console.error('FAIL: __testExports.shouldOpenBoundary (the pure coalesce helper) not exposed.');
  process.exit(1);
}

// --- Tiny test runner ------------------------------------------------------
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + err.message); failed++; }
}

// A fake textarea the module can drive through editInsert/setSelectionRange.
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
// Bind a textarea as the active one for the execCommand stub.
function activate(ta) { sandbox.__activeTextarea = ta; return ta; }
// Simulate a user edit that the module did NOT perform (a structural edit the
// toolbar applies): set the value + caret directly, no input event.
function setValue(ta, value, caret) {
  ta.value = value;
  const c = (typeof caret === 'number') ? caret : value.length;
  ta.selectionStart = ta.selectionEnd = c;
}
// Simulate ordinary typing: append/apply text at the caret, advance the clock,
// then notify the stack exactly as onFieldInput would.
function type(ta, text, inputType) {
  const s = ta.selectionStart;
  ta.value = ta.value.slice(0, s) + text + ta.value.slice(ta.selectionEnd);
  const c = s + text.length;
  ta.selectionStart = ta.selectionEnd = c;
  TextEdit.undoNoteInput(ta, inputType || 'insertText');
}

// --- Pure coalesce helper --------------------------------------------------
const SOB = TextEdit.__testExports.shouldOpenBoundary;
test('shouldOpenBoundary: first-of-step (null lastKind) never opens', () => {
  assert.strictEqual(SOB(null, 0, 5000, 'insertText', 700), false);
});
test('shouldOpenBoundary: same kind within the window folds (false)', () => {
  assert.strictEqual(SOB('insert', 1000, 1200, 'insertText', 700), false);
});
test('shouldOpenBoundary: a newline input always opens', () => {
  assert.strictEqual(SOB('insert', 1000, 1050, 'insertLineBreak', 700), true);
  assert.strictEqual(SOB('insert', 1000, 1050, 'insertParagraph', 700), true);
});
test('shouldOpenBoundary: a pause beyond the window opens', () => {
  assert.strictEqual(SOB('insert', 1000, 1000 + 900, 'insertText', 700), true);
});
test('shouldOpenBoundary: switching insert<->delete opens', () => {
  assert.strictEqual(SOB('insert', 1000, 1100, 'deleteContentBackward', 700), true);
  assert.strictEqual(SOB('delete', 1000, 1100, 'insertText', 700), true);
});

// --- record-then-undo ------------------------------------------------------
test('record-then-undo: value AND caret return to the recorded pre-edit state', () => {
  const ta = activate(makeTA('hello'));
  ta.selectionStart = ta.selectionEnd = 5;
  TextEdit.undoTrack(ta);
  TextEdit.undoRecord(ta);           // seal pre-edit "hello"@5
  setValue(ta, '**hello**', 2);      // a structural edit applied by the caller
  const moved = TextEdit.undo(ta);
  assert.strictEqual(moved, true);
  assert.strictEqual(ta.value, 'hello');
  assert.strictEqual(ta.selectionStart, 5);
  assert.strictEqual(ta.selectionEnd, 5);
});

// --- redo re-applies -------------------------------------------------------
test('redo re-applies: undo then redo returns to the post-edit state', () => {
  const ta = activate(makeTA('hello'));
  TextEdit.undoTrack(ta);
  TextEdit.undoRecord(ta);
  setValue(ta, '**hello**');
  TextEdit.undo(ta);
  assert.strictEqual(ta.value, 'hello');
  const moved = TextEdit.redo(ta);
  assert.strictEqual(moved, true);
  assert.strictEqual(ta.value, '**hello**');
});

// --- branch truncation -----------------------------------------------------
test('branch truncation: a new record after an undo drops the redo tail', () => {
  const ta = activate(makeTA('A'));
  TextEdit.undoTrack(ta);
  TextEdit.undoRecord(ta); setValue(ta, 'B');
  TextEdit.undo(ta);                 // back to "A"
  assert.strictEqual(ta.value, 'A');
  TextEdit.undoRecord(ta); setValue(ta, 'D'); // new branch — "B" must be dropped
  TextEdit.undo(ta);
  assert.strictEqual(ta.value, 'A');
  TextEdit.redo(ta);
  assert.strictEqual(ta.value, 'D', 'redo must reach the new branch');
  const noStaleRedo = TextEdit.redo(ta);
  assert.strictEqual(noStaleRedo, false, 'the old "B" redo tail must be gone');
  assert.strictEqual(ta.value, 'D');
});

// --- typing coalesces ------------------------------------------------------
test('typing coalesces: a burst with no newline/pause is ONE undo step', () => {
  const ta = activate(makeTA(''));
  TextEdit.undoTrack(ta);
  sandbox.__now = 2000;
  type(ta, 'h'); type(ta, 'e'); type(ta, 'l'); type(ta, 'l'); type(ta, 'o');
  assert.strictEqual(ta.value, 'hello');
  const moved = TextEdit.undo(ta);
  assert.strictEqual(moved, true);
  assert.strictEqual(ta.value, '', 'one undo removes the whole burst');
});

// --- line-break boundary (Ben's exact scenario) ----------------------------
test('line-break boundary: multi-line typing undoes per line, not all at once', () => {
  const ta = activate(makeTA(''));
  TextEdit.undoTrack(ta);
  sandbox.__now = 3000;
  type(ta, 'l'); type(ta, 'i'); type(ta, 'n'); type(ta, 'e'); type(ta, '1');
  type(ta, '\n', 'insertLineBreak');
  type(ta, 'l'); type(ta, 'i'); type(ta, 'n'); type(ta, 'e'); type(ta, '2');
  assert.strictEqual(ta.value, 'line1\nline2');
  TextEdit.undo(ta);
  assert.strictEqual(ta.value, 'line1', 'first undo removes the second line only');
  TextEdit.undo(ta);
  assert.strictEqual(ta.value, '', 'second undo removes the first line');
});

// --- pause boundary --------------------------------------------------------
test('pause boundary: a gap beyond the window starts a new undo step', () => {
  const ta = activate(makeTA(''));
  TextEdit.undoTrack(ta);
  sandbox.__now = 4000;
  type(ta, 'a'); type(ta, 'b'); type(ta, 'c');
  sandbox.__now = 4000 + 5000; // long pause
  type(ta, 'd');
  assert.strictEqual(ta.value, 'abcd');
  TextEdit.undo(ta);
  assert.strictEqual(ta.value, 'abc', 'the post-pause char is a separate step');
  TextEdit.undo(ta);
  assert.strictEqual(ta.value, '');
});

// --- input-type switch boundary --------------------------------------------
test('input-type switch boundary: insert then delete are separate steps', () => {
  const ta = activate(makeTA(''));
  TextEdit.undoTrack(ta);
  sandbox.__now = 5000;
  type(ta, 'a'); type(ta, 'b'); type(ta, 'c');
  // delete the last char (backward delete) — a kind switch
  ta.selectionStart = ta.selectionEnd = 3;
  ta.value = 'ab';
  ta.selectionStart = ta.selectionEnd = 2;
  TextEdit.undoNoteInput(ta, 'deleteContentBackward');
  assert.strictEqual(ta.value, 'ab');
  TextEdit.undo(ta);
  assert.strictEqual(ta.value, 'abc', 'undo restores the deletion as its own step');
  TextEdit.undo(ta);
  assert.strictEqual(ta.value, '', 'a further undo removes the typed burst');
});

// --- empty / no-op safety --------------------------------------------------
test('empty/no-op safety: undo on empty history and redo at the tip are no-ops', () => {
  const ta = activate(makeTA('seed'));
  TextEdit.undoTrack(ta);
  assert.strictEqual(TextEdit.undo(ta), false, 'nothing to undo at baseline');
  assert.strictEqual(ta.value, 'seed');
  assert.strictEqual(TextEdit.redo(ta), false, 'nothing to redo at the tip');
  assert.strictEqual(ta.value, 'seed');
});
test('untracked field: every entry point is a safe no-op', () => {
  const ta = activate(makeTA('x'));
  assert.strictEqual(TextEdit.undo(ta), false);
  assert.strictEqual(TextEdit.redo(ta), false);
  assert.doesNotThrow(() => TextEdit.undoRecord(ta));
  assert.doesNotThrow(() => TextEdit.undoNoteInput(ta, 'insertText'));
});

// --- restore never self-records --------------------------------------------
test('restore never self-records: undo cannot push its own restore as a step', () => {
  const ta = activate(makeTA('one'));
  TextEdit.undoTrack(ta);
  TextEdit.undoRecord(ta); setValue(ta, 'two');
  TextEdit.undoRecord(ta); setValue(ta, 'three');
  // Two structural edits → exactly two undo steps back to the baseline.
  TextEdit.undo(ta);
  assert.strictEqual(ta.value, 'two');
  TextEdit.undo(ta);
  assert.strictEqual(ta.value, 'one', 'the restore did not record itself');
  assert.strictEqual(TextEdit.undo(ta), false, 'baseline reached — no phantom step');
});
test('restore fires a real input event (autoGrow/snippets/preview react)', () => {
  const ta = activate(makeTA('hello'));
  // Force the editInsert fallback branch by disabling execCommand, so restore
  // must dispatch its own input event.
  let inputCount = 0;
  ta.dispatchEvent = (ev) => { if (ev && ev.type === 'input') inputCount++; return true; };
  const savedExec = sandbox.document.execCommand;
  sandbox.document.execCommand = () => false;
  try {
    TextEdit.undoTrack(ta);
    TextEdit.undoRecord(ta); setValue(ta, 'hello world');
    TextEdit.undo(ta);
    assert.strictEqual(ta.value, 'hello');
    assert.ok(inputCount >= 1, 'restore must fire a real input event');
  } finally {
    sandbox.document.execCommand = savedExec;
  }
});

// --- untrack drops history -------------------------------------------------
test('undoUntrack drops the field history (undo becomes a no-op)', () => {
  const ta = activate(makeTA('a'));
  TextEdit.undoTrack(ta);
  TextEdit.undoRecord(ta); setValue(ta, 'ab');
  TextEdit.undoUntrack(ta);
  assert.strictEqual(TextEdit.undo(ta), false, 'no history after untrack');
});

// --- history cap -----------------------------------------------------------
test('history is capped (a long session cannot grow without bound)', () => {
  const ta = activate(makeTA('v0'));
  TextEdit.undoTrack(ta);
  for (let i = 1; i <= 500; i++) {
    TextEdit.undoRecord(ta);
    setValue(ta, 'v' + i);
  }
  // Undo as far as it will go; it must stop (bounded), not loop forever.
  let steps = 0;
  while (TextEdit.undo(ta) && steps < 1000) steps++;
  assert.ok(steps > 0, 'some undo history is retained');
  assert.ok(steps <= 200, 'history is capped near the bound (dropped oldest)');
});

// --- availability accessors (canUndo/canRedo) -------------------------------
test('canUndo/canRedo: availability tracks the full undo→redo cycle', () => {
  const ta = activate(makeTA('seed'));
  TextEdit.undoTrack(ta);
  assert.strictEqual(TextEdit.canUndo(ta), false, 'fresh baseline: nothing to undo');
  assert.strictEqual(TextEdit.canRedo(ta), false, 'fresh baseline: nothing to redo');
  TextEdit.undoRecord(ta); setValue(ta, 'seed x');
  assert.strictEqual(TextEdit.canUndo(ta), true, 'an un-sealed live edit is undoable (undo seals it first)');
  assert.strictEqual(TextEdit.canRedo(ta), false);
  TextEdit.undo(ta);
  assert.strictEqual(ta.value, 'seed');
  assert.strictEqual(TextEdit.canUndo(ta), false, 'back at the floor: undo unavailable');
  assert.strictEqual(TextEdit.canRedo(ta), true, 'the undone step is redoable');
  TextEdit.redo(ta);
  assert.strictEqual(ta.value, 'seed x');
  assert.strictEqual(TextEdit.canUndo(ta), true);
  assert.strictEqual(TextEdit.canRedo(ta), false, 'at the tip: redo unavailable');
});
test('canUndo/canRedo are pure reads — repeated calls move no state', () => {
  const ta = activate(makeTA('a'));
  TextEdit.undoTrack(ta);
  TextEdit.undoRecord(ta); setValue(ta, 'ab');
  for (let i = 0; i < 5; i++) { TextEdit.canUndo(ta); TextEdit.canRedo(ta); }
  assert.strictEqual(ta.value, 'ab', 'accessors mutate nothing');
  assert.strictEqual(TextEdit.undo(ta), true, 'undo still works after repeated reads');
  assert.strictEqual(ta.value, 'a', 'exactly one step back — the reads sealed nothing');
});
test('canUndo/canRedo: untracked or missing field reads false, never throws', () => {
  const ta = activate(makeTA('x'));
  assert.strictEqual(TextEdit.canUndo(ta), false);
  assert.strictEqual(TextEdit.canRedo(ta), false);
  assert.strictEqual(TextEdit.canUndo(null), false);
  assert.strictEqual(TextEdit.canRedo(null), false);
});

// --- Summary ---------------------------------------------------------------
console.log('\nundo-stack: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
