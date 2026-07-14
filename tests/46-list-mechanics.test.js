/**
 * Phase 46 Plan 01 Task 2 — behavior tests for window.TextEdit's list-mechanics
 * pure transforms: autoFormatEnter (continue/exit/outdent), indentLine /
 * outdentLine, and renumberOrderedBlock.
 *
 * Pure-function test: loads assets/text-edit.js in a vm sandbox and reads the
 * helpers from window.TextEdit.__testExports (tests/24-04 loader idiom).
 *
 * Run: node tests/46-list-mechanics.test.js  (exit 0 pass, 1 fail)
 *
 * Covers RTXT-03 (continuation/exit), RTXT-05 + D-11 (renumber per nesting
 * depth), D-09/D-10 (indent unit = 2 spaces; single-level outdent), and issue 9
 * (no-op renumber lets the caller skip editInsert).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const sandbox = {
  window: {},
  document: { execCommand() { return true; } },
  console: { log() {}, warn() {}, error() {} },
  Event: function Event(type, opts) { this.type = type; this.bubbles = !!(opts && opts.bubbles); },
  JSON, Math, Date, Array, Object, Set, Map, RegExp, String, Number, Boolean,
};
vm.createContext(sandbox);
try {
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'text-edit.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'assets/text-edit.js' });
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
for (const fn of ['autoFormatEnter', 'indentLine', 'outdentLine', 'renumberOrderedBlock']) {
  if (typeof T[fn] !== 'function') {
    console.error('FAIL: __testExports.' + fn + ' is not a function.');
    process.exit(1);
  }
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + err.message); failed++; }
}

// Extract ordinal numbers (in document order) from a value's ordered lines.
function ordinals(v) {
  return v.split('\n').filter((l) => /^\s*\d+\./.test(l)).map((l) => parseInt(/\d+/.exec(l)[0], 10));
}
// Extract {depth, ord} for each ordered line (2 spaces = one nesting level).
function orderedItems(v) {
  return v.split('\n').filter((l) => /^\s*\d+\./.test(l)).map((l) => ({
    depth: Math.floor(/^( *)/.exec(l)[1].length / 2),
    ord: parseInt(/\d+/.exec(l)[0], 10),
  }));
}
function leadCount(line) { return /^( *)/.exec(line)[1].length; }

// ── autoFormatEnter: continuation (RTXT-03) ────────────────────────────────
test('autoFormatEnter continues a bullet list', () => {
  const v = '- item';
  const r = T.autoFormatEnter(v, v.length);
  assert.ok(r, 'expected a transform for a non-empty list line');
  assert.strictEqual(r.value, '- item\n- ');
});
test('autoFormatEnter continues an ordered list with previousOrdinal+1', () => {
  const v = '3. item';
  const r = T.autoFormatEnter(v, v.length);
  assert.strictEqual(r.value, '3. item\n4. ');
});

// ── autoFormatEnter: exit / outdent (D-10) ─────────────────────────────────
test('autoFormatEnter on an empty TOP-LEVEL item removes the marker (list exit)', () => {
  const v = '- ';
  const r = T.autoFormatEnter(v, v.length);
  assert.ok(r, 'expected a transform for an empty top-level list item');
  // Marker is gone — the line no longer parses as a list item.
  assert.ok(!/^\s*(?:[-*]|\d+\.)(?=\s|$)/.test(r.value), 'marker should be removed');
  assert.strictEqual(r.value, '');
});
test('autoFormatEnter on an empty NESTED item drops exactly one indent level (2 spaces)', () => {
  const v = '  - ';
  const r = T.autoFormatEnter(v, v.length);
  assert.ok(r, 'expected a transform for an empty nested list item');
  assert.strictEqual(leadCount(v) - leadCount(r.value), 2, 'exactly 2 fewer leading spaces');
  assert.strictEqual(r.value, '- ');
});
test('autoFormatEnter on a non-list line returns null (native Enter)', () => {
  assert.strictEqual(T.autoFormatEnter('plain text', 5), null);
});

// ── indentLine / outdentLine (D-09) ────────────────────────────────────────
test('indentLine "in" adds exactly 2 leading spaces', () => {
  const v = '- item';
  const r = T.indentLine(v, 2, 'in');
  assert.strictEqual(r.value, '  - item');
});
test('indentLine in then out round-trips leading whitespace', () => {
  const v = '- item';
  const inR = T.indentLine(v, 2, 'in');
  const outR = T.outdentLine(inR.value, inR.selStart);
  assert.strictEqual(outR.value, v);
});
test('outdentLine removes up to 2 leading spaces', () => {
  assert.strictEqual(T.outdentLine('  - item', 4).value, '- item');
});

// ── renumberOrderedBlock: D-11 delete-3 / append-at-end acceptance ─────────
test('D-11: delete item 3 of a 4-item list renumbers 1,2,3; then append -> 1,2,3,4', () => {
  // Start: 1. a / 2. b / 3. c / 4. d  → user deletes item 3's line.
  const postDelete = '1. a\n2. b\n4. d';
  const caret = 13; // on the 'd' of the (renamed) last line "4. d"
  const r1 = T.renumberOrderedBlock(postDelete, caret);
  assert.deepStrictEqual(ordinals(r1.value), [1, 2, 3]);
  assert.strictEqual(r1.value, '1. a\n2. b\n3. d');
  // The renamed line kept its single-digit width, so the caret does not jump.
  assert.strictEqual(r1.selStart, caret, 'caret offset must survive the rewrite');
  assert.strictEqual(r1.selStart, r1.selEnd);

  // User appends the removed item at the end (any typed ordinal).
  const appended = r1.value + '\n5. c';
  const r2 = T.renumberOrderedBlock(appended, appended.length - 1);
  assert.deepStrictEqual(ordinals(r2.value), [1, 2, 3, 4]);
  assert.strictEqual(r2.value, '1. a\n2. b\n3. d\n4. c');
});

// ── renumberOrderedBlock: nested per-depth independence (D-11 / RTXT-05) ───
test('nested renumber: each nesting depth renumbers to 1..N independently', () => {
  // Top-level 1,3 (needs → 1,2); nested run 5,8 (needs → 1,2).
  const v = '1. a\n  5. x\n  8. y\n3. b';
  const r = T.renumberOrderedBlock(v, 8); // caret inside the nested run
  const items = orderedItems(r.value);
  const top = items.filter((it) => it.depth === 0).map((it) => it.ord);
  const nested = items.filter((it) => it.depth === 1).map((it) => it.ord);
  assert.deepStrictEqual(top, [1, 2], 'top-level renumbers to 1..N');
  assert.deepStrictEqual(nested, [1, 2], 'nested run renumbers to 1..N independently');
});
test('nested renumber: deleting a nested item leaves top-level ordinals untouched', () => {
  // After deleting nested "child a": top-level 1 & 2 correct, nested has a stale "2.".
  const v = '1. root\n  2. child b\n2. root two';
  const r = T.renumberOrderedBlock(v, 12); // caret in the nested line
  const items = orderedItems(r.value);
  assert.deepStrictEqual(items.filter((it) => it.depth === 0).map((it) => it.ord), [1, 2]);
  assert.deepStrictEqual(items.filter((it) => it.depth === 1).map((it) => it.ord), [1]);
});

// ── renumberOrderedBlock: no-op on an already-correct block (issue 9) ──────
test('no-op: an already-correct 1..N block returns unchanged + empty replacement', () => {
  const v = '1. a\n2. b\n3. c';
  const r = T.renumberOrderedBlock(v, 5);
  assert.strictEqual(r.value, v, 'value unchanged');
  assert.strictEqual(r.replacement.start, r.replacement.end, 'empty-length replacement');
  assert.strictEqual(r.replacement.text, '', 'no text to insert');
});

console.log('\n46-list-mechanics: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
