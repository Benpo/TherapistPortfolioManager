/**
 * Phase 24 Plan 05 — Behavior test for isModifiedSeed predicate.
 *
 * Pure-function test: loads assets/settings.js in a vm sandbox, reads
 * isModifiedSeed from window.__SnippetEditorHelpers.
 *
 * Controls Reset-to-default button visibility AND export-filter inclusion.
 * Compare semantics: case-sensitive, byte-exact (trailing whitespace counts).
 *
 * Run: node tests/24-05-modified-seed.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * 8 scenarios per the Plan 05 Test Coverage Plan:
 *   A. origin='user' → false (not a seed).
 *   B. origin='seed', no matching seed entry → false (orphan, can't reset).
 *   C. seed, updatedAt > createdAt → true (timestamps differ).
 *   D. seed, timestamps equal, content matches seedPack exactly → false (untouched).
 *   E. seed, timestamps match, ONE locale expansion differs by 1 char → true.
 *   F. seed, content matches but tags array differs → true.
 *   G. seed, content matches but trigger differs (user renamed) → true.
 *   H. seed, expansion has trailing whitespace in seedPack but not in user record → true
 *      (byte-exact compare).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
  window: {},
  document: {
    addEventListener() {},
    removeEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { setAttribute() {}, appendChild() {}, append() {}, addEventListener() {}, classList: { add() {}, remove() {} } }; },
    body: { prepend() {}, appendChild() {} },
    head: { appendChild() {} },
  },
  console: { error() {}, warn() {}, log() {} },
  setTimeout, clearTimeout, Promise,
};
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/settings.js' });
} catch (err) {
  console.error('FATAL: assets/settings.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const helpers = sandbox.window.__SnippetEditorHelpers;
if (!helpers || typeof helpers.isModifiedSeed !== 'function') {
  console.error('FAIL: window.__SnippetEditorHelpers.isModifiedSeed is not exposed.');
  console.error('      Plan 05 Task 1 must extract isModifiedSeed as a pure helper');
  console.error('      and expose it via window.__SnippetEditorHelpers for tests.');
  process.exit(1);
}
const isModifiedSeed = helpers.isModifiedSeed;

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
function assertTrue(v, label) {
  if (v !== true) throw new Error(`${label}: expected true, got ${JSON.stringify(v)}`);
}
function assertFalse(v, label) {
  if (v !== false) throw new Error(`${label}: expected false, got ${JSON.stringify(v)}`);
}

const SEED_TS = '2026-05-14T00:00:00.000Z';
function seedEntry(overrides) {
  return Object.assign({
    id: 'ec.a1.betrayal',
    trigger: 'betrayal',
    expansions: {
      he: 'בגידה — תחושה כואבת.',
      en: 'Betrayal — a harsh, unpleasant blow.',
      cs: 'Zrada — bolestivá rána.',
      de: 'Verrat — ein schmerzhafter Schlag.',
    },
    tags: ['ec.a1'],
    origin: 'seed',
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  }, overrides || {});
}
const seedPack = [seedEntry()];

// ────────────────────────────────────────────────────────────────────

test('A. origin="user" → false (not a seed)', () => {
  const s = seedEntry({ origin: 'user', id: 'user-1' });
  assertFalse(isModifiedSeed(s, seedPack), 'A');
});

test('B. origin="seed", id has no match in seedPack → false (orphan)', () => {
  const s = seedEntry({ id: 'ec.zz.nonexistent' });
  assertFalse(isModifiedSeed(s, seedPack), 'B');
});

test('C. seed, updatedAt > createdAt → true', () => {
  const s = seedEntry({ updatedAt: '2026-05-15T10:00:00.000Z' });
  assertTrue(isModifiedSeed(s, seedPack), 'C');
});

test('D. seed, timestamps equal, content matches exactly → false (untouched)', () => {
  const s = seedEntry();
  assertFalse(isModifiedSeed(s, seedPack), 'D');
});

test('E. seed, timestamps match but one locale expansion differs by 1 char → true', () => {
  const seed = seedEntry();
  const s = seedEntry({
    expansions: Object.assign({}, seed.expansions, { en: seed.expansions.en + '!' }),
  });
  assertTrue(isModifiedSeed(s, seedPack), 'E');
});

test('F. seed, content matches but tags differ → true', () => {
  const s = seedEntry({ tags: ['ec.a1', 'user-added-tag'] });
  assertTrue(isModifiedSeed(s, seedPack), 'F');
});

test('G. seed, content matches but trigger renamed → true', () => {
  const s = seedEntry({ trigger: 'betrayal-renamed' });
  assertTrue(isModifiedSeed(s, seedPack), 'G');
});

test('H. trailing whitespace in seed vs trimmed in user record → true (byte-exact compare)', () => {
  const seedWithTrailing = seedEntry({
    expansions: {
      he: 'בגידה — תחושה כואבת.',
      en: 'Betrayal — a harsh, unpleasant blow. ', // <-- trailing space
      cs: 'Zrada — bolestivá rána.',
      de: 'Verrat — ein schmerzhafter Schlag.',
    },
  });
  const pack = [seedWithTrailing];
  const userTrimmed = seedEntry(); // matches everything EXCEPT en lacks the trailing space
  assertTrue(isModifiedSeed(userTrimmed, pack), 'H');
});

console.log('');
console.log(`Plan 05 isModifiedSeed tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
