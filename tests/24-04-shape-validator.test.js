/**
 * Phase 24 Plan 04 — Behavior test for PortfolioDB.validateSnippetShape.
 *
 * Pure-function test: loads assets/db.js in a vm sandbox with stubbed IDB and
 * reads the validateSnippetShape function from window.PortfolioDB. No IDB
 * operations exercised.
 *
 * Run: node tests/24-04-shape-validator.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * 9 scenarios per the Plan 04 Test Coverage Plan:
 *   A. Happy path — valid seed record passes silently.
 *   B. Missing id → throws with message containing 'id'.
 *   C. Bad trigger (uppercase, spaces, length 1, length 33) — 4 sub-cases.
 *   D. Non-object expansions → throws.
 *   E. Non-string expansion value (number, null, array) — throws for each.
 *   F. Non-array tags → throws.
 *   G. Tag element not a string → throws.
 *   H. Origin not in {'seed','user'} (test 'invalid', '', 0, undefined).
 *   I. Extra unknown keys (expansions.fr) — silently allowed, NO throw.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// --- Sandbox with stubbed browser globals ---
const sandbox = {
  window: { name: '' },
  indexedDB: { open() { return {}; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  document: {
    getElementById() { return null; },
    createElement() { return { setAttribute() {}, append() {}, prepend() {} }; },
    body: { prepend() {} },
  },
  console: { error() {}, warn() {}, log() {} },
  setTimeout, clearTimeout, Promise,
  IDBKeyRange: { only() { return {}; } },
};
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'db.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/db.js' });
} catch (err) {
  console.error('FATAL: assets/db.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const PortfolioDB = sandbox.window.PortfolioDB;
if (!PortfolioDB || typeof PortfolioDB.validateSnippetShape !== 'function') {
  console.error('FAIL: PortfolioDB.validateSnippetShape is not exported.');
  console.error('      Plan 04 Task 2 must add validateSnippetShape to the public API.');
  process.exit(1);
}
const validate = PortfolioDB.validateSnippetShape;

// --- Test runner ---
let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    failed++;
  }
}
function expectThrow(fn, msgPart, label) {
  try {
    fn();
    throw new Error(`${label}: expected validateSnippetShape to throw, but it did not`);
  } catch (err) {
    if (!err.message) throw err;
    if (msgPart && !err.message.toLowerCase().includes(msgPart.toLowerCase())) {
      throw new Error(`${label}: thrown message "${err.message}" did not include "${msgPart}"`);
    }
  }
}

function valid() {
  return {
    id: 'ec.a1.betrayal',
    trigger: 'betrayal',
    expansions: { he: 'בגידה', en: 'Betrayal', cs: 'Zrada', de: 'Verrat' },
    tags: ['ec.a1'],
    origin: 'seed',
    createdAt: '2026-05-14T00:00:00.000Z',
    updatedAt: '2026-05-14T00:00:00.000Z',
  };
}

// --- A. Happy path ---
test('A. Valid seed record passes silently', () => {
  validate(valid()); // must not throw
});

// --- B. Missing id ---
test('B. Missing id throws with message containing "id"', () => {
  const s = valid(); delete s.id;
  expectThrow(() => validate(s), 'id', 'B');
});

// --- C. Bad trigger — 4 sub-cases ---
test('C. Bad trigger (uppercase, spaces, length 1, length 33) all throw', () => {
  // C1: uppercase
  let s = valid(); s.trigger = 'Betrayal';
  expectThrow(() => validate(s), 'trigger', 'C1 uppercase');
  // C2: spaces
  s = valid(); s.trigger = 'be trayal';
  expectThrow(() => validate(s), 'trigger', 'C2 spaces');
  // C3: length 1
  s = valid(); s.trigger = 'b';
  expectThrow(() => validate(s), 'trigger', 'C3 length 1');
  // C4: length 33
  s = valid(); s.trigger = 'a'.repeat(33);
  expectThrow(() => validate(s), 'trigger', 'C4 length 33');
});

// --- D. Non-object expansions ---
test('D. Non-object expansions throws', () => {
  let s = valid(); s.expansions = 'a string';
  expectThrow(() => validate(s), 'expansions', 'D string');
  s = valid(); s.expansions = null;
  expectThrow(() => validate(s), 'expansions', 'D null');
  s = valid(); s.expansions = ['array'];
  expectThrow(() => validate(s), 'expansions', 'D array');
});

// --- E. Non-string expansion value ---
test('E. Non-string expansion value (number, null, array) throws for each', () => {
  let s = valid(); s.expansions = { ...s.expansions, en: 123 };
  expectThrow(() => validate(s), 'expansion', 'E number');
  s = valid(); s.expansions = { ...s.expansions, he: null };
  expectThrow(() => validate(s), 'expansion', 'E null');
  s = valid(); s.expansions = { ...s.expansions, cs: ['a'] };
  expectThrow(() => validate(s), 'expansion', 'E array');
});

// --- F. Non-array tags ---
test('F. Non-array tags throws', () => {
  let s = valid(); s.tags = 'ec.a1';
  expectThrow(() => validate(s), 'tags', 'F string');
  s = valid(); s.tags = { 0: 'ec.a1' };
  expectThrow(() => validate(s), 'tags', 'F object');
  s = valid(); s.tags = null;
  expectThrow(() => validate(s), 'tags', 'F null');
});

// --- G. Tag element not a string ---
test('G. Tag element not a string throws', () => {
  let s = valid(); s.tags = [123];
  expectThrow(() => validate(s), 'tag', 'G number');
  s = valid(); s.tags = [null];
  expectThrow(() => validate(s), 'tag', 'G null');
  s = valid(); s.tags = [{ name: 'ec.a1' }];
  expectThrow(() => validate(s), 'tag', 'G object');
});

// --- H. Origin not in {'seed','user'} ---
test('H. Origin not in {seed,user} throws (invalid, empty, number, undefined)', () => {
  let s = valid(); s.origin = 'invalid';
  expectThrow(() => validate(s), 'origin', 'H invalid');
  s = valid(); s.origin = '';
  expectThrow(() => validate(s), 'origin', 'H empty');
  s = valid(); s.origin = 0;
  expectThrow(() => validate(s), 'origin', 'H number');
  s = valid(); delete s.origin;
  expectThrow(() => validate(s), 'origin', 'H undefined');
});

// --- I. Extra unknown keys allowed silently ---
test('I. Extra unknown locale keys in expansions are silently allowed (no throw)', () => {
  const s = valid();
  s.expansions = { ...s.expansions, fr: 'Trahison', it: 'Tradimento' };
  validate(s); // must NOT throw — validator ignores unknown locale keys
});

// --- Report ---
console.log('');
console.log(`Plan 04 shape-validator tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
