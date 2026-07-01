/**
 * Quick 260630-sa8 — Behavior test: editing a LEGACY client (stored `age`, no
 * `birthDate`) must NOT wipe the age to null on save.
 *
 * Root cause (see 260630-sa8-PLAN.md): both edit-save paths did
 *   const age = birthDate ? computed : null;
 * which silently destroyed a legacy client's displayed age on any edit. The fix
 * routes both paths through App.computeClientAgeOnEdit(birthDate, existingAge),
 * which preserves the stored age when there is no birth date.
 *
 * FALSIFIABLE (project convention MEMORY:feedback-behavior-verification):
 * this test asserts the exact behavior the old `: null` logic FAILED — a legacy
 * age of 40 must survive as 40. Against the pre-fix logic the first assertion
 * (returns 40, not null) fails; against the helper it passes.
 *
 * Pure-helper sandbox (pattern: tests/quick-260516-g7p-missing-birth-filter):
 * load assets/app.js in a vm sandbox and call window.App.computeClientAgeOnEdit.
 *
 * Run: node tests/quick-260630-sa8-legacy-age.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

// ────────────────────────────────────────────────────────────────────
// Load assets/app.js in a vm sandbox so window.App is reachable.
// ────────────────────────────────────────────────────────────────────

function loadApp() {
  const makeEl = () => ({
    setAttribute() {}, getAttribute() { return null; },
    appendChild() {}, append() {}, prepend() {}, removeChild() {},
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: {}, dataset: {},
  });
  // app.js does `window.App = (...)` and then a post-IIFE augmentation that
  // references the bare global `App`. In a browser window === the global object,
  // so we make the sandbox its own `window` to reproduce that (otherwise the
  // bare `App` reference throws "App is not defined").
  const sandbox = {
    I18N: {}, I18N_DEFAULT: 'en',
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    navigator: { language: 'en' },
    location: { href: '', pathname: '/', search: '' },
    document: {
      addEventListener() {}, removeEventListener() {},
      getElementById() { return null; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      createElement() { return makeEl(); },
      body: makeEl(), head: makeEl(),
      documentElement: makeEl(),
    },
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, Promise, JSON, Math, Date,
    Array, Object, Set, Map, RegExp, String, Number, Boolean, parseInt, parseFloat,
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'app.js'), 'utf8');
  try {
    vm.runInContext(src, sandbox, { filename: 'assets/app.js' });
  } catch (err) {
    console.error('FATAL: assets/app.js failed to load in vm sandbox.');
    console.error('       ' + err.message);
    process.exit(1);
  }
  return sandbox.App;
}

const App = loadApp();

if (!App || typeof App.computeClientAgeOnEdit !== 'function') {
  console.error('FAIL: window.App.computeClientAgeOnEdit is not exposed.');
  console.error('      Task 1 must add the shared helper to assets/app.js and');
  console.error('      export it on the returned App object.');
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────────

// THE bug: a legacy client with age 40 and no birth date must keep 40.
// Under the old `birthDate ? computed : null` logic this returned null → FAIL.
test('no birthDate + existingAge 40 → returns 40 (NOT null)', () => {
  const result = App.computeClientAgeOnEdit(null, 40);
  assert.strictEqual(result, 40, `expected 40, got ${result}`);
  assert.notStrictEqual(result, null, 'legacy age must not be wiped to null');
});

test('empty-string birthDate + existingAge 40 → still preserves 40', () => {
  assert.strictEqual(App.computeClientAgeOnEdit('', 40), 40);
});

test('no birthDate + existingAge null → returns null', () => {
  assert.strictEqual(App.computeClientAgeOnEdit(null, null), null);
});

test('no birthDate + existingAge undefined → returns null', () => {
  assert.strictEqual(App.computeClientAgeOnEdit(null, undefined), null);
});

// A modern client (real birthDate) recomputes from the date and IGNORES the
// passed-in existingAge — proving the recompute path wins over the stored value.
test('real birthDate recomputes age and ignores existingAge', () => {
  const result = App.computeClientAgeOnEdit('1986-05-01', 999);
  assert.strictEqual(typeof result, 'number', 'expected a numeric age');
  assert.notStrictEqual(result, 999, 'recompute must ignore the (wrong) existingAge');
  assert.ok(result >= 38, `expected age >= 38 for a 1986 birth, got ${result}`);
});

// Preserve legacy age 0 correctly (0 is a valid age, must not become null).
test('no birthDate + existingAge 0 → returns 0 (0 is preserved, not null)', () => {
  assert.strictEqual(App.computeClientAgeOnEdit(null, 0), 0);
});

// ────────────────────────────────────────────────────────────────────

console.log(`\n  ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
