/**
 * Quick task 260619-okw Task 1 — Behavior test for isValidTrigger helper.
 *
 * Pure-function test: loads assets/settings.js in a vm sandbox, reads
 * isValidTrigger from window.__SnippetEditorHelpers.
 *
 * Falsifiable: PRE-change, window.__SnippetEditorHelpers.isValidTrigger is
 * undefined (RED). POST-change, Unicode triggers (Hebrew/German/Czech) validate
 * and invalid triggers are rejected (GREEN).
 *
 * Run: node tests/quick-260619-okw-trigger-unicode.test.js
 * Exits 0 on full pass, 1 on any failure.
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

const snippetsSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings-snippets.js'), 'utf8');
const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings.js'), 'utf8');
try {
  vm.runInContext(snippetsSrc, sandbox, { filename: 'assets/settings-snippets.js' });
  vm.runInContext(src, sandbox, { filename: 'assets/settings.js' });
} catch (err) {
  console.error('FATAL: assets/settings.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const helpers = sandbox.window.__SnippetEditorHelpers;
if (!helpers || typeof helpers.isValidTrigger !== 'function') {
  console.error('FAIL: window.__SnippetEditorHelpers.isValidTrigger is not exposed.');
  console.error('      Task 1 must add an isValidTrigger pure helper and export it');
  console.error('      via window.__SnippetEditorHelpers for tests.');
  process.exit(1);
}
const isValidTrigger = helpers.isValidTrigger;

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

function expectValid(trigger, label) {
  if (isValidTrigger(trigger) !== true) {
    throw new Error(`${label}: expected "${trigger}" to be VALID, got invalid`);
  }
}
function expectInvalid(trigger, label) {
  if (isValidTrigger(trigger) !== false) {
    throw new Error(`${label}: expected "${trigger}" to be INVALID, got valid`);
  }
}

// ────────────────────────────────────────────────────────────────────

test('Hebrew trigger כעס is valid', () => {
  expectValid('כעס', 'HE');
});

test('German trigger größe is valid', () => {
  expectValid('größe', 'DE');
});

test('Czech trigger přítel is valid', () => {
  expectValid('přítel', 'CS');
});

test('ASCII hyphenated trigger heart-shock is valid', () => {
  expectValid('heart-shock', 'ASCII-hyphen');
});

test('Short ASCII+digit trigger a1 is valid', () => {
  expectValid('a1', 'ASCII-digit');
});

test('Empty string is invalid', () => {
  expectInvalid('', 'empty');
});

test('Length-1 "a" is invalid', () => {
  expectInvalid('a', 'length-1');
});

test('Length-33 is invalid', () => {
  expectInvalid('a'.repeat(33), 'length-33');
});

test('Value with a space "a b" is invalid', () => {
  expectInvalid('a b', 'space');
});

test('Value with a period "a.b" is invalid', () => {
  expectInvalid('a.b', 'period');
});

test('Value with a slash "a/b" is invalid', () => {
  expectInvalid('a/b', 'slash');
});

console.log('');
console.log(`Quick 260619-okw isValidTrigger tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
