/**
 * Quick 260516-g7p Bug #4 — Behavior test: the overview missing-birth-year
 * warning is actionable — clicking "Show them" filters the client table to
 * EXACTLY the clients with no birth year (count matches the warning), and
 * Clear Filters resets it.
 *
 * FALSIFIABLE (project convention MEMORY:feedback-behavior-verification),
 * pure-helper sandbox like tests/24-05-list-filter.test.js: load
 * assets/overview.js in a vm sandbox and exercise the missing-birth filter
 * via window.__OverviewTestHooks.
 *
 *   A. Filter INACTIVE (default) → all clients pass (filtered == all).
 *   B. Filter ACTIVE → only clients matching the EXACT missing predicate
 *      (`!c.birthDate && !c.age`) pass, AND that count EQUALS the banner's
 *      `missing` count computed over the same list. The equality proves the
 *      link surfaces EXACTLY the warned clients, not an approximation.
 *   C. Sensitivity: a client with birthDate, or with age, or with both is
 *      EXCLUDED when the filter is active (proves it tracks the data, not a
 *      constant).
 *   D. Clearing the filter resets the flag → filtered == all again.
 *
 * Run: node tests/quick-260516-g7p-missing-birth-filter.test.js
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
// Load assets/overview.js in a vm sandbox (pattern: 24-05-list-filter).
// ────────────────────────────────────────────────────────────────────

function loadOverview() {
  const sandbox = {
    window: {},
    document: {
      addEventListener() {}, removeEventListener() {},
      getElementById() { return null; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      createElement() {
        return {
          setAttribute() {}, appendChild() {}, append() {},
          addEventListener() {}, style: {},
          classList: { add() {}, remove() {}, toggle() {} },
        };
      },
      body: { prepend() {}, appendChild() {} },
      head: { appendChild() {} },
    },
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, Promise, JSON, Math, Date,
    Array, Object, Set, Map, RegExp, String, Number, Boolean,
  };
  vm.createContext(sandbox);
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'overview.js'), 'utf8');
  try {
    vm.runInContext(src, sandbox, { filename: 'assets/overview.js' });
  } catch (err) {
    console.error('FATAL: assets/overview.js failed to load in vm sandbox.');
    console.error('       ' + err.message);
    process.exit(1);
  }
  return sandbox.window;
}

const W = loadOverview();
const H = W.__OverviewTestHooks;

if (!H || typeof H.filterByMissingBirth !== 'function' ||
    typeof H.setMissingBirthFilter !== 'function' ||
    typeof H.clearMissingBirthFilter !== 'function' ||
    typeof H.countMissingBirth !== 'function') {
  console.error('FAIL: window.__OverviewTestHooks is not exposed with the');
  console.error('      pure helpers {filterByMissingBirth, setMissingBirthFilter,');
  console.error('      clearMissingBirthFilter, countMissingBirth}.');
  console.error('      Task 4 must extract the missing-birth predicate as a');
  console.error('      pure module-level helper and expose it for tests.');
  process.exit(1);
}

// Fixture: 5 clients — 2 have NEITHER birthDate nor age (the "missing" set).
function fixture() {
  return [
    { id: 1, name: 'A', birthDate: '1990-01-01', age: null },   // has birthDate
    { id: 2, name: 'B', birthDate: null,         age: 42 },     // has age
    { id: 3, name: 'C', birthDate: null,         age: null },   // MISSING
    { id: 4, name: 'D', birthDate: '1985-05-05', age: 39 },     // has both
    { id: 5, name: 'E', birthDate: '',           age: 0 },      // MISSING (falsy/falsy)
  ];
}

// Reset module state before each scenario.
function reset() { H.clearMissingBirthFilter(); }

// ────────────────────────────────────────────────────────────────────

test('A: filter INACTIVE (default) → all clients pass', () => {
  reset();
  const out = H.filterByMissingBirth(fixture());
  assert.strictEqual(out.length, 5,
    `default (filter off) must return all clients; got ${out.length}`);
});

test('B: filter ACTIVE → only missing-birth clients, count == banner count', () => {
  reset();
  const list = fixture();
  const bannerCount = H.countMissingBirth(list); // mirrors updateMissingBirthBanner's `missing`
  H.setMissingBirthFilter(true);
  const out = H.filterByMissingBirth(list);
  assert.strictEqual(bannerCount, 2,
    `sanity: 2 clients in the fixture have neither birthDate nor age; got ${bannerCount}`);
  assert.strictEqual(out.length, bannerCount,
    `filtered count (${out.length}) MUST equal the banner's missing count ` +
    `(${bannerCount}) — proves the link surfaces EXACTLY the warned clients`);
  const ids = out.map((c) => c.id).sort();
  assert.deepStrictEqual(ids, [3, 5],
    `expected exactly the missing clients [3,5]; got ${JSON.stringify(ids)}`);
});

test('C: clients with birthDate / age / both are EXCLUDED when filter active', () => {
  reset();
  H.setMissingBirthFilter(true);
  const out = H.filterByMissingBirth(fixture());
  for (const c of out) {
    assert.ok(!c.birthDate && !c.age,
      `client ${c.id} passed the active filter but has birth info ` +
      `(birthDate=${JSON.stringify(c.birthDate)}, age=${JSON.stringify(c.age)}) ` +
      `— filter must use the exact !birthDate && !age predicate, not a constant`);
  }
});

test('D: clearing the filter resets the flag → filtered == all again', () => {
  reset();
  H.setMissingBirthFilter(true);
  assert.strictEqual(H.filterByMissingBirth(fixture()).length, 2, 'precondition: active = 2');
  H.clearMissingBirthFilter();
  assert.strictEqual(H.filterByMissingBirth(fixture()).length, 5,
    'after clear, the missing-birth filter must be off (all clients return)');
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log(`quick-260516-g7p missing-birth-filter — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
