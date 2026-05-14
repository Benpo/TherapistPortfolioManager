/**
 * Phase 24 Plan 05 — Behavior test for validateImportPayload + detectImportCollisions.
 *
 * Pure-function test: loads assets/settings.js in a vm sandbox, reads helpers
 * from window.__SnippetEditorHelpers. PortfolioDB.validateSnippetShape is
 * injected as a parameter (function), so no IDB or db.js needed.
 *
 * Run: node tests/24-05-import-validator.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * 7 scenarios per the Plan 05 Test Coverage Plan:
 *   A. Valid payload, no collisions → returns 3 rows, 0 collisions.
 *   B. Payload missing 'snippets' array → throws InvalidPayload.
 *   C. Payload 'snippets' not array → throws InvalidPayload.
 *   D. One row fails validateRow → throws PerRowInvalid with row index.
 *   E. Two rows share same trigger (case-insensitive) → throws DuplicateInFile.
 *   F. Three rows, one collides with existing cache trigger → 1 collision.
 *   G. Three rows, case-insensitive collision (Betrayal vs betrayal) → normalized lowercase.
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
if (!helpers || typeof helpers.validateImportPayload !== 'function' || typeof helpers.detectImportCollisions !== 'function') {
  console.error('FAIL: window.__SnippetEditorHelpers.{validateImportPayload, detectImportCollisions} not exposed.');
  console.error('      Plan 05 Task 1 must extract validateImportPayload + detectImportCollisions');
  console.error('      as pure helpers and expose them via window.__SnippetEditorHelpers for tests.');
  process.exit(1);
}
const { validateImportPayload, detectImportCollisions } = helpers;

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
    throw new Error(`${label}: expected throw, did not throw`);
  } catch (err) {
    if (!err.message) throw err;
    if (msgPart && !err.message.toLowerCase().includes(msgPart.toLowerCase())) {
      throw new Error(`${label}: thrown message "${err.message}" did not include "${msgPart}"`);
    }
  }
}

function snippet(trigger, id, opts) {
  return Object.assign({
    id,
    trigger,
    expansions: { he: '', en: '', cs: '', de: '' },
    tags: [],
    origin: 'user',
  }, opts || {});
}

// Stub validator — accepts anything matching minimal shape; throws otherwise.
function validateRowStub(row) {
  if (!row || typeof row !== 'object') throw new Error('not an object');
  if (typeof row.id !== 'string') throw new Error('id must be string');
  if (typeof row.trigger !== 'string' || !/^[a-z0-9-]{2,32}$/.test(row.trigger)) {
    throw new Error('invalid trigger');
  }
  if (!row.expansions || typeof row.expansions !== 'object') throw new Error('expansions must be object');
  if (!Array.isArray(row.tags)) throw new Error('tags must be array');
}

// ────────────────────────────────────────────────────────────────────
// Scenarios
// ────────────────────────────────────────────────────────────────────

test('A. Valid payload, no collisions → returns 3 validated rows', () => {
  const payload = {
    version: 1,
    snippets: [snippet('alpha', 'a'), snippet('beta', 'b'), snippet('gamma', 'c')],
  };
  const rows = validateImportPayload(payload, validateRowStub);
  if (!Array.isArray(rows) || rows.length !== 3) {
    throw new Error('A: expected 3 rows, got ' + JSON.stringify(rows));
  }
  const collisions = detectImportCollisions(rows, []);
  if (!Array.isArray(collisions) || collisions.length !== 0) {
    throw new Error('A: expected 0 collisions, got ' + JSON.stringify(collisions));
  }
});

test('B. Payload missing "snippets" array → throws InvalidPayload', () => {
  expectThrow(() => validateImportPayload({ version: 1 }, validateRowStub), 'snippets', 'B');
});

test('C. Payload "snippets" not array → throws InvalidPayload', () => {
  expectThrow(() => validateImportPayload({ snippets: 'not-an-array' }, validateRowStub), 'snippets', 'C');
  expectThrow(() => validateImportPayload({ snippets: { 0: snippet('alpha', 'a') } }, validateRowStub), 'snippets', 'C2');
});

test('D. One row fails validateRow → throws with row index', () => {
  const payload = {
    snippets: [snippet('alpha', 'a'), snippet('BadTrigger!!', 'b'), snippet('gamma', 'c')],
  };
  expectThrow(() => validateImportPayload(payload, validateRowStub), '1', 'D');  // index 1 of bad row
});

test('E. Two rows share trigger (case-insensitive) within file → throws DuplicateInFile', () => {
  // Use a permissive validator so the row-validator does not fire before the
  // dupe check. The case-insensitive dupe-detection is the behavior under test.
  function permissiveValidator(row) {
    if (!row || typeof row !== 'object') throw new Error('not object');
    if (typeof row.trigger !== 'string') throw new Error('invalid trigger');
  }
  const payload = {
    snippets: [snippet('betrayal', 'a'), snippet('Betrayal', 'b')],
  };
  expectThrow(() => validateImportPayload(payload, permissiveValidator), 'duplicate', 'E');
});

test('F. Three rows, one collides with existing cache → 1 collision returned', () => {
  const payload = {
    snippets: [snippet('alpha', 'a'), snippet('betrayal', 'b'), snippet('gamma', 'c')],
  };
  const rows = validateImportPayload(payload, validateRowStub);
  const cache = [snippet('betrayal', 'existing-1')];
  const collisions = detectImportCollisions(rows, cache);
  if (collisions.length !== 1) {
    throw new Error('F: expected 1 collision, got ' + collisions.length + ' (' + JSON.stringify(collisions) + ')');
  }
  if (collisions[0].trigger.toLowerCase() !== 'betrayal') {
    throw new Error('F: expected collision trigger "betrayal", got ' + JSON.stringify(collisions[0]));
  }
  if (collisions[0].existingId !== 'existing-1') {
    throw new Error('F: expected existingId "existing-1", got ' + JSON.stringify(collisions[0]));
  }
});

test('G. Case-insensitive collision (Betrayal vs betrayal) normalized lowercase', () => {
  const payload = {
    snippets: [snippet('Betrayal', 'a'), snippet('alpha', 'b')],
  };
  // Patch validator to accept uppercase trigger for this scenario only
  function permissiveValidator(row) {
    if (!row || typeof row !== 'object') throw new Error('not object');
    if (typeof row.trigger !== 'string') throw new Error('invalid trigger');
  }
  const rows = validateImportPayload(payload, permissiveValidator);
  const cache = [snippet('betrayal', 'existing-1')];
  const collisions = detectImportCollisions(rows, cache);
  if (collisions.length !== 1) {
    throw new Error('G: expected 1 collision, got ' + collisions.length);
  }
  if (collisions[0].trigger !== 'betrayal') {
    throw new Error('G: expected normalized lowercase "betrayal", got "' + collisions[0].trigger + '"');
  }
});

console.log('');
console.log(`Plan 05 import-validator tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
