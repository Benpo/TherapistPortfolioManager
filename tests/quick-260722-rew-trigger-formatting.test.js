/**
 * Quick 260722-rew — Behavior test: formatting-aware snippet trigger detection.
 *
 * Bug: the rich-text toolbar's Bold button inserts paired `**` markers with the
 * caret between them; typing the snippet prefix + trigger initials showed no
 * autocomplete because detectTrigger's boundary character classes did not treat
 * inline formatting markers (* _ ~ `) as word boundaries.
 *
 * Pure-function test: loads assets/snippets.js in a vm sandbox and reads
 * detectTrigger from window.Snippets.__testExports (same harness pattern as
 * tests/24-04-trigger-regex.test.js).
 *
 * Run: node tests/quick-260722-rew-trigger-formatting.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * Scenarios:
 *   A. Reported bug: text ending `**` + prefix `;` + `betr` → partial result
 *      whose candidates include the betrayal snippet; replacement range covers
 *      ONLY prefix+query so the markers are preserved.
 *   B. Repro with Ben's prefix `??`: `**??betr` → partial with candidates.
 *   C. Commit inside bold: `**;betrayal ` → active match, boundary is the
 *      space, start points at the prefix (both leading markers preserved
 *      outside the replacement range).
 *   D. Other markers: `*;betr`, `_;betr`, and nested `**_;betr` → partial.
 *   E. Closing-marker commit: `;betrayal*` → active match with boundary `*`,
 *      end excludes the marker (per-keystroke input means the first star of a
 *      closing pair commits the expansion and the markers stay balanced).
 *   F. Regressions (must pass pre-fix AND post-fix): `email;betrayal ` → null
 *      (mid-word guard intact); `;betrayal ` → match; `;betr` → partial;
 *      `;heart-shock ` → match (hyphen stays a trigger character, NOT a
 *      boundary).
 *   G. ReDoS budget: adversarial ~10000-char inputs complete in <50ms.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// --- Sandbox with minimal browser globals ---
const sandbox = {
  window: { name: '' },
  document: {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() {
      return {
        style: {}, classList: { add() {}, remove() {}, contains() { return false; } },
        appendChild() {}, append() {}, removeChild() {}, remove() {}, setAttribute() {},
        getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0 }; },
        addEventListener() {}, removeEventListener() {},
      };
    },
    body: { appendChild() {}, removeChild() {} },
  },
  navigator: { userAgent: '' },
  setTimeout, clearTimeout, queueMicrotask,
  Promise, JSON, Math, Date, Array, Object, Set, Map, RegExp, String, Number, Boolean,
  console: { log() {}, warn() {}, error() {} },
};
sandbox.window.localStorage = { getItem() { return null; }, setItem() {} };
sandbox.localStorage = sandbox.window.localStorage;
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'snippets.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/snippets.js' });
} catch (err) {
  console.error('FATAL: assets/snippets.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const Snippets = sandbox.window.Snippets;
if (!Snippets || !Snippets.__testExports) {
  console.error('FAIL: window.Snippets.__testExports not found.');
  process.exit(1);
}
const { detectTrigger } = Snippets.__testExports;
if (typeof detectTrigger !== 'function') {
  console.error('FAIL: __testExports must include detectTrigger.');
  process.exit(1);
}

// --- Snippet fixtures (Map<lowercase-trigger, snippet>) ---
function snip(trigger, expansions) {
  return {
    id: 'fixture.' + trigger,
    trigger: trigger,
    expansions: expansions,
    tags: ['fixture'],
    origin: 'seed',
    createdAt: '2026-05-14T00:00:00.000Z',
    updatedAt: '2026-05-14T00:00:00.000Z',
  };
}
function makeMap(snippets) {
  const m = new Map();
  for (const s of snippets) m.set(s.trigger.toLowerCase(), s);
  return m;
}

const fixtures = makeMap([
  snip('betrayal', { he: 'בגידה', en: 'Betrayal', cs: 'Zrada', de: 'Verrat' }),
  snip('heart-shock', { he: '', en: 'A sudden heart shock', cs: '', de: '' }),
  snip('physical-trauma', { he: '', en: 'Physical trauma', cs: '', de: '' }),
]);

function hasCandidate(result, trigger) {
  return Array.isArray(result.candidates) &&
    result.candidates.some(function (c) { return c && c.trigger === trigger; });
}

// --- Test runner ---
let passed = 0, failed = 0;
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

// --- A. Reported bug: prefix + initials directly after bold markers ---
test('A. `**;betr` (caret between Bold markers) → partial with candidates, range covers only prefix+query', () => {
  const text = 'Session note **;betr';
  const result = detectTrigger(text, ';', fixtures);
  assert.ok(result, 'must return a result (was null before the fix)');
  assert.strictEqual(result.type, 'partial', 'must be a partial (popover) result');
  assert.ok(hasCandidate(result, 'betrayal'), 'candidates must include betrayal');
  assert.strictEqual(text.slice(result.start, result.end), ';betr',
    'replacement range must cover only prefix+query so the markers survive');
});

// --- B. Same repro with a two-char `??` prefix ---
test('B. `**??betr` with prefix `??` → partial with candidates', () => {
  const text = '**??betr';
  const result = detectTrigger(text, '??', fixtures);
  assert.ok(result, 'must return a result (was null before the fix)');
  assert.strictEqual(result.type, 'partial');
  assert.ok(hasCandidate(result, 'betrayal'), 'candidates must include betrayal');
  assert.strictEqual(text.slice(result.start, result.end), '??betr',
    'replacement range must cover only prefix+query');
});

// --- C. Full trigger + space inside bold markers commits the expansion ---
test('C. `**;betrayal ` → active match, boundary space, markers outside the range', () => {
  const text = '**;betrayal ';
  const result = detectTrigger(text, ';', fixtures);
  assert.ok(result, 'must return a result');
  assert.strictEqual(result.type, 'match', 'must be an active match');
  assert.strictEqual(result.boundary, ' ', 'boundary must be the typed space');
  assert.strictEqual(result.snippet.trigger, 'betrayal');
  assert.strictEqual(text.slice(result.start, result.end), ';betrayal',
    'replacement range must start at the prefix — leading markers preserved');
});

// --- D. Other inline markers act as leading boundaries ---
test('D. `*;betr`, `_;betr`, nested `**_;betr` each → partial with candidates', () => {
  for (const text of ['*;betr', '_;betr', '**_;betr']) {
    const result = detectTrigger(text, ';', fixtures);
    assert.ok(result, `"${text}" must return a result (was null before the fix)`);
    assert.strictEqual(result.type, 'partial', `"${text}" must be a partial`);
    assert.ok(hasCandidate(result, 'betrayal'),
      `"${text}" candidates must include betrayal`);
    assert.strictEqual(text.slice(result.start, result.end), ';betr',
      `"${text}" replacement range must cover only prefix+query`);
  }
});

// --- E. Closing marker typed after a complete trigger commits the expansion ---
test('E. `;betrayal*` → active match with boundary `*`, end excludes the marker', () => {
  const text = ';betrayal*';
  const result = detectTrigger(text, ';', fixtures);
  assert.ok(result, 'must return a result (was null before the fix)');
  assert.strictEqual(result.type, 'match', 'closing marker must commit the expansion');
  assert.strictEqual(result.boundary, '*', 'boundary must be the marker character');
  assert.strictEqual(result.snippet.trigger, 'betrayal');
  assert.strictEqual(text.slice(result.start, result.end), ';betrayal',
    'end must exclude the marker so the closing pair stays balanced');
});

// --- F. Regressions: plain-text behavior unchanged ---
test('F1. `email;betrayal ` — mid-word guard intact → NO match', () => {
  const result = detectTrigger('email;betrayal ', ';', fixtures);
  assert.strictEqual(result, null,
    'letters directly before the prefix must still block detection');
});

test('F2. `;betrayal ` at line start still matches', () => {
  const result = detectTrigger(';betrayal ', ';', fixtures);
  assert.ok(result, 'must return a result');
  assert.strictEqual(result.type, 'match');
  assert.strictEqual(result.snippet.trigger, 'betrayal');
});

test('F3. `;betr` still returns a partial', () => {
  const result = detectTrigger('hello ;betr', ';', fixtures);
  assert.ok(result, 'must return a partial result');
  assert.strictEqual(result.type, 'partial');
  assert.ok(hasCandidate(result, 'betrayal'), 'candidates must include betrayal');
});

test('F4. `;heart-shock ` — hyphen stays a trigger character, NOT a boundary', () => {
  const result = detectTrigger('hello ;heart-shock ', ';', fixtures);
  assert.ok(result, 'must match the hyphenated trigger');
  assert.strictEqual(result.type, 'match');
  assert.strictEqual(result.snippet.trigger, 'heart-shock');
});

// --- G. ReDoS budget after the class change ---
test('G. Adversarial ~10000-char inputs complete in <50ms', () => {
  const inputs = [
    ';'.repeat(9999) + 'a',
    '*'.repeat(9995) + ';betr',
    '*_~`'.repeat(2499) + ';betr',
  ];
  const start = process.hrtime.bigint();
  for (let i = 0; i < 5; i++) {
    for (const input of inputs) detectTrigger(input, ';', fixtures);
  }
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
  assert.ok(elapsedMs < 50,
    `ReDoS guard: 5 iterations over adversarial inputs took ${elapsedMs.toFixed(2)}ms — must be <50ms`);
});

// --- Report ---
console.log('');
console.log(`Trigger-formatting tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
