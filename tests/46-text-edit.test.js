/**
 * Phase 46 Plan 01 Task 1 — behavior tests for window.TextEdit's undo-safe
 * insertion chokepoint (editInsert) + the inline/heading pure transforms
 * (currentLine, toggleWrap, insertListMarker, applyHeading).
 *
 * Pure-function test: loads assets/text-edit.js in a vm sandbox and reads the
 * helpers from window.TextEdit.__testExports (mirrors the tests/24-04 loader
 * idiom for window.Snippets.__testExports). No jsdom needed for the pure fns.
 *
 * Run: node tests/46-text-edit.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * Covers RTXT-01 (marker insert + heading) and D-04 (toggle with no doubled
 * marker artifact on empty selection; round-trip unwrap).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// --- Sandbox with minimal browser globals ---------------------------------
// A fake document.execCommand lets us exercise editInsert without a real DOM:
// when execCommand returns true it "applies" insertText to the stub textarea's
// current selection; returning false forces the value-splice fallback branch.
function makeSandbox(execCommandReturns) {
  const sandbox = {
    window: {},
    document: {
      execCommand(cmd, showUI, value) {
        if (cmd === 'insertText' && execCommandReturns && sandbox.__activeTextarea) {
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
    // Minimal Event shim: editInsert's fallback constructs
    // `new Event('input', {bubbles:true})` and dispatches it on the textarea.
    Event: function Event(type, opts) { this.type = type; this.bubbles = !!(opts && opts.bubbles); },
    JSON, Math, Date, Array, Object, Set, Map, RegExp, String, Number, Boolean,
  };
  sandbox.__activeTextarea = null;
  vm.createContext(sandbox);
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'text-edit.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'assets/text-edit.js' });
  return sandbox;
}

let sandbox;
try {
  sandbox = makeSandbox(true);
} catch (err) {
  console.error('FATAL: assets/text-edit.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const TextEdit = sandbox.window.TextEdit;
if (!TextEdit || !TextEdit.__testExports) {
  console.error('FAIL: window.TextEdit.__testExports not found.');
  process.exit(1);
}
const T = TextEdit.__testExports;
for (const fn of ['toggleWrap', 'currentLine', 'insertListMarker', 'applyHeading']) {
  if (typeof T[fn] !== 'function') {
    console.error('FAIL: __testExports.' + fn + ' is not a function.');
    process.exit(1);
  }
}

// --- Tiny test runner ------------------------------------------------------
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + err.message); failed++; }
}

const BOLD = '**';
const ITAL = '*';

// A helper: apply a transform's `replacement` to the original value and assert
// it reproduces the transform's own `value` field (chokepoint consistency).
function applyRep(value, rep) {
  return value.slice(0, rep.start) + rep.text + value.slice(rep.end);
}

// --- currentLine -----------------------------------------------------------
test('currentLine: middle line boundaries + caretInLine', () => {
  const v = 'alpha\nbeta\ngamma';
  const sel = 7; // inside "beta" (index of 'e')
  const cl = T.currentLine(v, sel);
  assert.strictEqual(cl.text, 'beta');
  assert.strictEqual(cl.start, 6);
  assert.strictEqual(cl.end, 10);
  assert.strictEqual(cl.caretInLine, 1);
});

// --- toggleWrap: empty selection (D-04 no doubled-marker artifact) ----------
test('toggleWrap bold empty selection: caret between the two markers', () => {
  const v = 'hello ';
  const s = v.length, e = v.length;
  const r = T.toggleWrap(v, s, e, BOLD);
  // Value gained exactly one marker pair (4 chars), no quadrupling.
  assert.strictEqual(r.value, 'hello ****');
  assert.strictEqual(r.value.length, v.length + BOLD.length * 2);
  // Caret sits BETWEEN the pair: selStart === selEnd, positioned after the
  // first marker (s + marker length).
  assert.strictEqual(r.selStart, r.selEnd);
  assert.strictEqual(r.selStart, s + BOLD.length);
  // And the substring immediately around the caret is exactly one pair.
  assert.strictEqual(r.value.slice(s, s + BOLD.length), BOLD);
  assert.strictEqual(r.value.slice(r.selEnd, r.selEnd + BOLD.length), BOLD);
  assert.strictEqual(applyRep(v, r.replacement), r.value);
});

test('toggleWrap italic empty selection uses single-char marker', () => {
  const v = '';
  const r = T.toggleWrap(v, 0, 0, ITAL);
  assert.strictEqual(r.value, '**'); // two single-asterisks == one italic pair
  assert.strictEqual(r.selStart, 1);
  assert.strictEqual(r.selEnd, 1);
});

// --- toggleWrap: wrap a selection ------------------------------------------
test('toggleWrap bold wraps a non-empty selection', () => {
  const v = 'make bold now';
  const s = 5, e = 9; // "bold"
  const r = T.toggleWrap(v, s, e, BOLD);
  assert.strictEqual(r.value, 'make **bold** now');
  assert.strictEqual(r.selStart, s + BOLD.length);
  assert.strictEqual(r.selEnd, e + BOLD.length);
});

// --- toggleWrap: unwrap round-trip (D-04) ----------------------------------
test('toggleWrap on an already-wrapped selection round-trips to original', () => {
  const original = 'make bold now';
  const s = 5, e = 9;
  const wrapped = T.toggleWrap(original, s, e, BOLD);
  // Now select the inner text inside the wrapped string and toggle again.
  const innerStart = wrapped.selStart, innerEnd = wrapped.selEnd;
  const unwrapped = T.toggleWrap(wrapped.value, innerStart, innerEnd, BOLD);
  assert.strictEqual(unwrapped.value, original);
  // Selection returns to the original inner selection.
  assert.strictEqual(unwrapped.selStart, s);
  assert.strictEqual(unwrapped.selEnd, e);
});

// --- insertListMarker: bullet + numbered detected by md-render's regex ------
const LIST_RE = /^\s*(?:[-*]|\d+\.)(?=\s|$)/; // md-render.js isListItem, verbatim
test('insertListMarker bullet: line gets "- " and md-render detects it', () => {
  const v = 'buy milk';
  const r = T.insertListMarker(v, 0, 0, 'ul');
  assert.ok(LIST_RE.test(r.value), 'bullet marker not detected by list regex');
  assert.strictEqual(r.value, '- buy milk');
  assert.strictEqual(applyRep(v, r.replacement), r.value);
});
test('insertListMarker ordered: line gets "1. " and md-render detects it', () => {
  const v = 'first step';
  const r = T.insertListMarker(v, 0, 0, 'ol');
  assert.ok(LIST_RE.test(r.value), 'ordered marker not detected by list regex');
  assert.strictEqual(r.value, '1. first step');
});

// --- applyHeading: level 2 then level 0 is the identity (idempotent) --------
const HEADING_RE = /^(#{1,3})\s+(.+?)\s*$/; // md-render firstLine heading, verbatim
test('applyHeading level 2 then level 0 returns the original line', () => {
  const v = 'My heading';
  const h2 = T.applyHeading(v, 0, 0, 2);
  assert.strictEqual(h2.value, '## My heading');
  assert.ok(HEADING_RE.test(h2.value), 'heading not accepted by md-render heading regex');
  const back = T.applyHeading(h2.value, h2.selStart, h2.selEnd, 0);
  assert.strictEqual(back.value, v);
});
test('applyHeading level 1 and level 3 emit the right hash count', () => {
  assert.strictEqual(T.applyHeading('Title', 0, 0, 1).value, '# Title');
  assert.strictEqual(T.applyHeading('Title', 0, 0, 3).value, '### Title');
});

// --- editInsert chokepoint: fallback branch fires a real input event -------
test('editInsert fallback (execCommand=false): value-splice + input event', () => {
  const sb = makeSandbox(false); // execCommand returns false → fallback path
  const TE = sb.window.TextEdit;
  let inputFired = false;
  const ta = {
    value: 'abXYcd',
    selectionStart: 0, selectionEnd: 0,
    focus() {},
    setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; },
    dispatchEvent(ev) { if (ev && ev.type === 'input') inputFired = true; return true; },
  };
  sb.__activeTextarea = ta;
  // Replace "XY" (indices 2..4) with "ZZ".
  TE.editInsert(ta, 2, 4, 'ZZ');
  assert.strictEqual(ta.value, 'abZZcd');
  assert.ok(inputFired, 'fallback must dispatch a bubbling input event');
});
test('editInsert primary path uses execCommand insertText (no value-splice)', () => {
  const sb = makeSandbox(true); // execCommand applies the edit
  const TE = sb.window.TextEdit;
  const ta = {
    value: 'abXYcd', selectionStart: 0, selectionEnd: 0,
    focus() {},
    setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; },
    dispatchEvent() { throw new Error('primary path must NOT manually dispatch input'); },
  };
  sb.__activeTextarea = ta;
  TE.editInsert(ta, 2, 4, 'ZZ');
  assert.strictEqual(ta.value, 'abZZcd');
});

// --- Summary ---------------------------------------------------------------
console.log('\n46-text-edit: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);

// Global (Node) instances of the Event constructor: editInsert's fallback uses
// `new Event('input', {bubbles:true})`. Provide a minimal shim so the module's
// fallback branch can construct it inside the vm sandbox.
