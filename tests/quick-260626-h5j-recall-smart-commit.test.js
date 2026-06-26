/**
 * Quick task 260626-h5j Task 1 — Behavior test for detectTrigger single-candidate
 * smart-commit on a boundary-terminated partial trigger.
 *
 * Pure-function test: loads assets/snippets.js in a vm sandbox and reads
 * detectTrigger via window.Snippets.__testExports (same pattern as
 * tests/24-04-trigger-regex.test.js).
 *
 * Falsifiable contract: when the user types `<prefix><partial><boundary>` and
 * there is NO exact trigger but EXACTLY ONE trigger prefix-matches the partial,
 * detectTrigger returns a 'match' result for that one snippet (boundary char
 * excluded from the replaced range, like the exact-match path). 0 or 2+ trigger
 * prefix-matches → null (unchanged). Tag prefix-matches NEVER auto-commit.
 *
 * RED before implementation: detectTrigger currently returns null whenever a
 * boundary is present and there is no exact trigger (Tests 1, 2, 6, 8, 10).
 *
 * Run: node tests/quick-260626-h5j-recall-smart-commit.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// --- Sandbox with minimal browser globals (mirrors 24-04 harness) ---
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
if (!Snippets || !Snippets.__testExports || typeof Snippets.__testExports.detectTrigger !== 'function') {
  console.error('FAIL: window.Snippets.__testExports.detectTrigger not found.');
  process.exit(1);
}
const { detectTrigger } = Snippets.__testExports;

// --- Snippet fixtures (Map<lowercase-trigger, snippet>) ---
function snip(trigger, tags) {
  return {
    id: 'fixture.' + trigger,
    trigger: trigger,
    expansions: { he: '', en: trigger, cs: '', de: '' },
    tags: tags || ['fixture'],
    origin: 'seed',
    createdAt: '2026-06-26T00:00:00.000Z',
    updatedAt: '2026-06-26T00:00:00.000Z',
  };
}
function makeMap(snippets) {
  const m = new Map();
  for (const s of snippets) m.set(s.trigger.toLowerCase(), s);
  return m;
}

// Mirrors the seed shape: single-word terminators + hyphenated multi-word +
// an ambiguous `s*` cluster + one non-ASCII hyphenated slug + a tag-only case.
const fixtures = makeMap([
  snip('anger', ['emotions']),       // single-word + a tag for the tag-only case
  snip('shame'),                      // single-word (also part of the `s*` cluster)
  snip('physical-trauma'),            // sole `physical*` candidate
  snip('low-self-esteem'),            // sole `low*` candidate
  snip('heart-shock'),
  snip('sadness'),                    // `s*` cluster
  snip('shock'),                      // `s*` cluster
  snip('sorrow'),                     // `s*` cluster
  snip('ztráta-důvěry'),              // sole non-ASCII (Czech) candidate for `ztráta*`
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

// --- Test 1: sole candidate `;physical ` → physical-trauma ---
test('1. `;physical ` (sole prefix-match) auto-commits physical-trauma', () => {
  const r = detectTrigger('note ;physical ', ';', fixtures);
  assert.ok(r, 'must return a result');
  assert.strictEqual(r.type, 'match', 'must be an active match');
  assert.strictEqual(r.snippet.trigger, 'physical-trauma');
});

// --- Test 2: sole candidate `;low ` → low-self-esteem ---
test('2. `;low ` (sole prefix-match) auto-commits low-self-esteem', () => {
  const r = detectTrigger('note ;low ', ';', fixtures);
  assert.ok(r, 'must return a result');
  assert.strictEqual(r.type, 'match');
  assert.strictEqual(r.snippet.trigger, 'low-self-esteem');
});

// --- Test 3: exact match wins, UNCHANGED ---
test('3. `;anger ` and `;shame ` keep exact-match terminator behavior', () => {
  const a = detectTrigger('note ;anger ', ';', fixtures);
  assert.ok(a && a.type === 'match', 'anger must match');
  assert.strictEqual(a.snippet.trigger, 'anger', 'exact single-word seed wins');
  const s = detectTrigger('note ;shame ', ';', fixtures);
  assert.ok(s && s.type === 'match', 'shame must match');
  assert.strictEqual(s.snippet.trigger, 'shame',
    'exact `shame` wins even though `s*` cluster is ambiguous as a prefix');
});

// --- Test 4: ambiguous 2+ → NOT a match ---
test('4. `;s ` (2+ prefix-matches) does NOT auto-commit', () => {
  const r = detectTrigger('note ;s ', ';', fixtures);
  assert.ok(r === null || r.type !== 'match',
    'ambiguous prefix must not return an active match');
});

// --- Test 5: no match → null ---
test('5. `;xyz ` (0 prefix-matches) returns null', () => {
  const r = detectTrigger('note ;xyz ', ';', fixtures);
  assert.strictEqual(r, null);
});

// --- Test 6: placement/boundary contract ---
test('6. sole-candidate match excludes the trailing boundary char', () => {
  const text = 'note ;physical ';
  const r = detectTrigger(text, ';', fixtures);
  assert.ok(r && r.type === 'match');
  assert.strictEqual(r.boundary, ' ', 'boundary must be the typed space');
  assert.strictEqual(text.slice(r.start, r.end), ';physical',
    'replaced range must cover exactly the ;<partial> span');
  assert.strictEqual(text.slice(r.end), ' ',
    'the typed space must survive AFTER the replaced range');
});

// --- Test 7: partial (no boundary) still works ---
test('7. `;physi` (no boundary) still returns a partial popover result', () => {
  const r = detectTrigger('note ;physi', ';', fixtures);
  assert.ok(r, 'must return a result');
  assert.strictEqual(r.type, 'partial');
});

// --- Test 8: case-insensitive sole candidate ---
test('8. `;PHYSICAL ` and `;Physical ` auto-commit physical-trauma, boundary kept', () => {
  for (const text of ['note ;PHYSICAL ', 'note ;Physical ']) {
    const r = detectTrigger(text, ';', fixtures);
    assert.ok(r && r.type === 'match', `${text} must match`);
    assert.strictEqual(r.snippet.trigger, 'physical-trauma', `${text} → physical-trauma`);
    assert.strictEqual(r.boundary, ' ', `${text} boundary must be the typed space`);
    assert.strictEqual(text.slice(r.end), ' ', `${text} space must survive`);
  }
});

// --- Test 9: tag-only NEVER auto-commits ---
test('9. `;emoti ` (matches a TAG, no trigger prefix) does NOT auto-commit', () => {
  // `emotions` is a tag on the `anger` snippet; no trigger starts with `emoti`.
  const r = detectTrigger('note ;emoti ', ';', fixtures);
  assert.ok(r === null || r.type !== 'match',
    'tag prefix-match must never produce an active match');
});

// --- Test 10: Unicode sole candidate ---
test('10. `;ztráta ` (sole non-ASCII prefix-match) auto-commits ztráta-důvěry', () => {
  const text = 'note ;ztráta ';
  const r = detectTrigger(text, ';', fixtures);
  assert.ok(r && r.type === 'match', 'unicode sole candidate must match');
  assert.strictEqual(r.snippet.trigger, 'ztráta-důvěry');
  assert.strictEqual(r.boundary, ' ');
});

// --- Test 11: ReDoS preserved ---
test('11. adversarial `;`*9999 + "a" completes < 50ms over 5 iterations', () => {
  const input = ';'.repeat(9999) + 'a';
  const start = process.hrtime.bigint();
  for (let i = 0; i < 5; i++) detectTrigger(input, ';', fixtures);
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
  assert.ok(elapsedMs < 50,
    `ReDoS guard: 5 iterations took ${elapsedMs.toFixed(2)}ms — must be <50ms`);
});

// --- Report ---
console.log('');
console.log(`Quick 260626-h5j recall smart-commit tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
