/**
 * Phase 24 Plan 05 — Behavior test for isTriggerUnique helper.
 *
 * Pure-function test: loads assets/settings.js in a vm sandbox with minimal
 * browser-API stubs and reads isTriggerUnique from window.__SnippetEditorHelpers.
 *
 * Run: node tests/24-05-trigger-dedupe.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * 7 scenarios per the Plan 05 Test Coverage Plan:
 *   A. Empty cache → unique.
 *   B. Cache contains 'betrayal' (lowercase), candidate 'betrayal' → NOT unique.
 *   C. Cache contains 'BETRAYAL' (uppercase stored), candidate 'betrayal' → NOT unique.
 *   D. Cache contains 'betrayal', candidate 'BETRAYAL' → NOT unique.
 *   E. Cache has 'betrayal' id=X, candidate 'betrayal' editingId=X → unique (self).
 *   F. Cache has 'betrayal' id=X, candidate 'betrayal' editingId=Y → NOT unique.
 *   G. Cache has 'betrayal', candidate 'heart-shock' → unique.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ────────────────────────────────────────────────────────────────────
// Sandbox — minimal stubs so settings.js can load without throwing.
// settings.js attaches a DOMContentLoaded handler but does not run any
// DOM-touching code at load time. The handler never fires here.
// ────────────────────────────────────────────────────────────────────

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
if (!helpers || typeof helpers.isTriggerUnique !== 'function') {
  console.error('FAIL: window.__SnippetEditorHelpers.isTriggerUnique is not exposed.');
  console.error('      Plan 05 Task 1 must extract isTriggerUnique as a pure helper');
  console.error('      and expose it via window.__SnippetEditorHelpers for tests.');
  process.exit(1);
}
const isTriggerUnique = helpers.isTriggerUnique;

// ────────────────────────────────────────────────────────────────────
// Test runner
// ────────────────────────────────────────────────────────────────────

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

function snippet(trigger, id) {
  return { id, trigger, expansions: { he: '', en: '', cs: '', de: '' }, tags: [], origin: 'user' };
}

// ────────────────────────────────────────────────────────────────────
// Scenarios
// ────────────────────────────────────────────────────────────────────

test('A. Empty cache → unique', () => {
  assertTrue(isTriggerUnique('betrayal', []), 'A');
});

test('B. Cache contains "betrayal" (lowercase), candidate "betrayal" → NOT unique', () => {
  const cache = [snippet('betrayal', 'id1')];
  assertFalse(isTriggerUnique('betrayal', cache), 'B');
});

test('C. Cache contains "BETRAYAL" (uppercase stored, defensive), candidate "betrayal" → NOT unique', () => {
  const cache = [snippet('BETRAYAL', 'id1')];
  assertFalse(isTriggerUnique('betrayal', cache), 'C');
});

test('D. Cache contains "betrayal", candidate "BETRAYAL" → NOT unique', () => {
  const cache = [snippet('betrayal', 'id1')];
  assertFalse(isTriggerUnique('BETRAYAL', cache), 'D');
});

test('E. Cache has "betrayal" id=X, candidate "betrayal" editingId=X → unique (editing self)', () => {
  const cache = [snippet('betrayal', 'X')];
  assertTrue(isTriggerUnique('betrayal', cache, 'X'), 'E');
});

test('F. Cache has "betrayal" id=X, candidate "betrayal" editingId=Y → NOT unique', () => {
  const cache = [snippet('betrayal', 'X')];
  assertFalse(isTriggerUnique('betrayal', cache, 'Y'), 'F');
});

test('G. Cache has "betrayal", candidate "heart-shock" → unique', () => {
  const cache = [snippet('betrayal', 'id1')];
  assertTrue(isTriggerUnique('heart-shock', cache), 'G');
});

// ────────────────────────────────────────────────────────────────────
// Report
// ────────────────────────────────────────────────────────────────────

console.log('');
console.log(`Plan 05 isTriggerUnique tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
