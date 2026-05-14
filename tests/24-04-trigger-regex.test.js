/**
 * Phase 24 Plan 04 — Behavior test for the snippet trigger detection regex
 * + word-boundary handling + locale fallback chain + ReDoS safety.
 *
 * Pure-function test: loads assets/snippets.js in a vm sandbox and reads the
 * helpers from window.Snippets.__testExports.
 *
 * Run: node tests/24-04-trigger-regex.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * 10 scenarios per the Plan 04 Test Coverage Plan:
 *   A. `<prefix><trigger><space>` matches and returns expansion.
 *   B. Each word-boundary char (.,;:!?\n) matches as terminator.
 *   C. Mid-word `email;betrayal ` — leading `email` blocks the boundary-before-
 *      prefix rule — does NOT match.
 *   D. `<prefix><trigger>` (no boundary) — does NOT return an active match
 *      but DOES return a partial (popover) candidate set.
 *   E. Two-char prefix `::betrayal ` matches when prefix is `::`.
 *   F. Locale fallback: snippet has en+he, app lang=cs → returns en (chain
 *      active → en → he → de → cs, with dedup).
 *   G. Locale fallback: snippet has only cs, app lang=en → returns cs.
 *   H. ReDoS adversarial: 10000-char `;;;...;;a` completes in <50ms.
 *   I. Hyphen slug: `;heart-shock ` matches the multi-segment trigger.
 *   J. Case insensitivity: `;BETRAYAL ` matches snippet with trigger 'betrayal'.
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
sandbox.window.localStorage = { getItem() { return 'he'; }, setItem() {} };
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
  console.error('      Plan 04 Task 3 must expose { detectTrigger, resolveExpansion }.');
  process.exit(1);
}
const { detectTrigger, resolveExpansion } = Snippets.__testExports;
if (typeof detectTrigger !== 'function' || typeof resolveExpansion !== 'function') {
  console.error('FAIL: __testExports must include detectTrigger and resolveExpansion.');
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
  snip('beanstalk', { he: '', en: '', cs: '', de: '' }),
]);

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

// --- A. Prefix + trigger + space matches ---
test('A. `;<trigger><space>` matches and finds the snippet', () => {
  const result = detectTrigger('hello ;betrayal ', ';', fixtures);
  assert.ok(result, 'must return a result');
  assert.strictEqual(result.type, 'match', 'must be an active match');
  assert.strictEqual(result.snippet.trigger, 'betrayal');
});

// --- B. Each boundary char terminates the trigger ---
test('B. Each of .,;:!?\\n acts as a terminator', () => {
  for (const ch of ['.', ',', ';', ':', '!', '?', '\n']) {
    const result = detectTrigger('hello ;betrayal' + ch, ';', fixtures);
    assert.ok(result, `boundary "${ch.replace('\n','\\n')}" must yield a result`);
    assert.strictEqual(result.type, 'match',
      `boundary "${ch.replace('\n','\\n')}" must yield an active match`);
    assert.strictEqual(result.snippet.trigger, 'betrayal');
  }
});

// --- C. Mid-word: leading non-boundary before prefix → no match ---
test('C. `email;betrayal ` — no word boundary before `;` → NO match', () => {
  const result = detectTrigger('email;betrayal ', ';', fixtures);
  assert.strictEqual(result, null,
    'must return null when prefix is preceded by an alphanumeric char');
});

// --- D. Prefix + trigger with no boundary → partial (popover) ---
test('D. `;<trigger>` with no boundary returns a partial (popover) result', () => {
  const result = detectTrigger('hello ;betray', ';', fixtures);
  assert.ok(result, 'must return a partial result');
  assert.strictEqual(result.type, 'partial');
  assert.strictEqual(result.query, 'betray');
  assert.ok(Array.isArray(result.candidates) && result.candidates.length > 0,
    'partial must include candidates');
  assert.strictEqual(result.candidates[0].trigger, 'betrayal',
    'first candidate must start with the query');
});

// --- E. Two-char prefix ---
test('E. Two-char prefix `::` works when configured', () => {
  const result = detectTrigger('hello ::betrayal ', '::', fixtures);
  assert.ok(result, 'must match with `::` prefix');
  assert.strictEqual(result.type, 'match');
  assert.strictEqual(result.snippet.trigger, 'betrayal');
  // Single-char `;` must NOT match anymore.
  const noResult = detectTrigger('hello ;betrayal ', '::', fixtures);
  assert.strictEqual(noResult, null,
    'single `;` must not match when configured prefix is `::`');
});

// --- F. Fallback chain: active=cs falls through to en ---
test('F. Active=cs with snippet having only en+he+cs+de → returns active cs', () => {
  const s = snip('x', { he: 'H', en: 'E', cs: 'C', de: 'D' });
  assert.strictEqual(resolveExpansion(s, 'cs'), 'C',
    'with all locales present, active language wins');
});

test('F2. Active=cs, snippet has en+he only (empty cs+de) → falls to en', () => {
  const s = snip('x', { he: 'H', en: 'E', cs: '', de: '' });
  assert.strictEqual(resolveExpansion(s, 'cs'), 'E',
    'chain order is active → en → he → de → cs; en is first non-empty after cs');
});

// --- G. Fallback chain: snippet has only cs, active=en → returns cs ---
test('G. Active=en, snippet has only cs → walks chain to cs', () => {
  const s = snip('x', { he: '', en: '', cs: 'C', de: '' });
  assert.strictEqual(resolveExpansion(s, 'en'), 'C',
    'chain walks en→he→de→cs and returns the first non-empty');
});

// --- H. ReDoS adversarial input ---
test('H. ReDoS-adversarial 10000-char `;;;...;;a` completes in <50ms', () => {
  const input = ';'.repeat(9999) + 'a';
  const start = process.hrtime.bigint();
  // Run multiple iterations to ensure consistent timing (not a one-off).
  for (let i = 0; i < 5; i++) {
    detectTrigger(input, ';', fixtures);
  }
  const elapsedNs = process.hrtime.bigint() - start;
  const elapsedMs = Number(elapsedNs) / 1e6;
  assert.ok(elapsedMs < 50,
    `ReDoS guard: 5 iterations on 10k-char adversarial input took ${elapsedMs.toFixed(2)}ms — must be <50ms`);
});

// --- I. Hyphen slug ---
test('I. `;heart-shock ` matches multi-segment hyphenated trigger', () => {
  const result = detectTrigger('hello ;heart-shock ', ';', fixtures);
  assert.ok(result, 'must match a hyphenated trigger');
  assert.strictEqual(result.type, 'match');
  assert.strictEqual(result.snippet.trigger, 'heart-shock');
});

// --- J. Case insensitivity at trigger level ---
test('J. `;BETRAYAL ` matches snippet with trigger "betrayal" (case-insensitive)', () => {
  const result = detectTrigger('hello ;BETRAYAL ', ';', fixtures);
  assert.ok(result, 'uppercase typed text must match lowercase-stored trigger');
  assert.strictEqual(result.type, 'match');
  assert.strictEqual(result.snippet.trigger, 'betrayal');
});

// --- Report ---
console.log('');
console.log(`Plan 04 trigger-regex tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
