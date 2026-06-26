/**
 * Quick task 260626-h5j Task 2 — Behavior test for the editor space->hyphen
 * helper (hyphenateSpaces) + the existing isValidTrigger.
 *
 * Pure-function test: loads assets/settings.js in a vm sandbox and reads the
 * helpers from window.__SnippetEditorHelpers (same pattern as
 * tests/quick-260619-okw-trigger-unicode.test.js).
 *
 * Falsifiable: PRE-change, window.__SnippetEditorHelpers.hyphenateSpaces is
 * undefined (RED — the harness guard fails). POST-change, spaces convert to a
 * regular hyphen-minus U+002D (never em/en dash) and a space-containing input
 * becomes a valid trigger.
 *
 * Run: node tests/quick-260626-h5j-trigger-autoconvert.test.js
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

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/settings.js' });
} catch (err) {
  console.error('FATAL: assets/settings.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const helpers = sandbox.window.__SnippetEditorHelpers;
if (!helpers || typeof helpers.hyphenateSpaces !== 'function' || typeof helpers.isValidTrigger !== 'function') {
  console.error('FAIL: window.__SnippetEditorHelpers must expose hyphenateSpaces and isValidTrigger.');
  console.error('      Task 2 must add a pure hyphenateSpaces helper and export it.');
  process.exit(1);
}
const { hyphenateSpaces, isValidTrigger } = helpers;

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
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

// ────────────────────────────────────────────────────────────────────

test('1. hyphenateSpaces("physical trauma") === "physical-trauma"', () => {
  assert(hyphenateSpaces('physical trauma') === 'physical-trauma',
    'got: ' + JSON.stringify(hyphenateSpaces('physical trauma')));
});

test('2. no fancy dash — separator is U+002D, never em (U+2014) / en (U+2013)', () => {
  const out = hyphenateSpaces('physical trauma');
  assert(out.indexOf('—') === -1, 'must not contain em dash U+2014');
  assert(out.indexOf('–') === -1, 'must not contain en dash U+2013');
  // The separator that replaced the space must be a hyphen-minus 0x2D.
  assert(out.charCodeAt('physical'.length) === 0x2D,
    'separator charCode must be 0x2D, got ' + out.charCodeAt('physical'.length));
});

test('3. round-trip valid: isValidTrigger(hyphenateSpaces("physical trauma")) === true', () => {
  assert(isValidTrigger(hyphenateSpaces('physical trauma')) === true,
    'hyphenated space-input must validate');
});

test('4. leading/trailing/space-only handled: trimmed output has no whitespace', () => {
  const trimmed = hyphenateSpaces(' a b ').trim();
  assert(/^[\p{L}\p{N}-]+$/u.test(trimmed),
    'trimmed output must match /^[\\p{L}\\p{N}-]+$/u, got: ' + JSON.stringify(trimmed));
});

test('5. idempotent on already-hyphenated: "low-self-esteem" unchanged', () => {
  assert(hyphenateSpaces('low-self-esteem') === 'low-self-esteem',
    'got: ' + JSON.stringify(hyphenateSpaces('low-self-esteem')));
});

test('6. unicode unaffected: hyphenateSpaces("כעס") === "כעס" and is valid', () => {
  assert(hyphenateSpaces('כעס') === 'כעס', 'Hebrew with no spaces must be unchanged');
  assert(isValidTrigger('כעס') === true, 'Hebrew trigger must stay valid');
});

console.log('');
console.log(`Quick 260626-h5j trigger-autoconvert tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
