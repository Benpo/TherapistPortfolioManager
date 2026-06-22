/**
 * Phase 28 Plan 04 — Behavior test for the integrity self-check state resolver
 * (VER-03, D-08, D-11, D-12, VER-06).
 *
 * Loads assets/version.js in a vm sandbox (self = the sandbox global) and
 * exercises `AppVersion.resolveIntegrityState({loadedToken, sourceToken,
 * online, recoveryAttempted})` as a PURE function of its arguments — so the
 * honest-state machine is provable without a service worker, a DOM, or a
 * network.
 *
 * Run: node tests/28-04-integrity-state.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * The 5 load-bearing behavior cases (Plan 04 Task 1 <behavior>):
 *   1. tokens match                          → 'clean'
 *   2. tokens differ + online + not-recovered → 'online'   (completion promise OK)
 *   3. tokens differ + offline (any recovery) → 'offline'  (NO completion, D-11)
 *   4. tokens differ + online + recovered     → 'wedged'   (no false refresh, D-12)
 *   5. the resolver makes NO network call     (VER-06)
 *
 * Honors project memory `feedback-behavior-verification.md`: runtime-behavior
 * code requires a falsifiable behavior test written to FAIL before the
 * implementation exists and PASS after. Cases 1–4 assert the actual return
 * value of the resolver (behavior), not the mere presence of a symbol. Case 5
 * asserts no network primitive is reachable by stubbing fetch/XHR to throw and
 * confirming the resolver still returns cleanly (behavior, not grep).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Sandbox: version.js assigns its export to `self`. We give the sandbox a
// `self` that points back at the sandbox global so the assignment lands
// where we can read it. fetch / XMLHttpRequest are TRAPS: if the resolver
// (or anything reachable from it) calls them, the test fails loudly.
// ────────────────────────────────────────────────────────────────────

let networkTouched = false;
function networkTrap(name) {
  return function () {
    networkTouched = true;
    throw new Error('NETWORK CALL via ' + name + ' — VER-06 forbids any network in the integrity check');
  };
}

const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  fetch: networkTrap('fetch'),
  XMLHttpRequest: networkTrap('XMLHttpRequest'),
  navigator: { onLine: true },
  localStorage: { getItem() { return null; } },
  Math, JSON, Date, Array, Object, Number, String, Boolean, RegExp,
};
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'version.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/version.js' });
} catch (err) {
  console.error('FATAL: assets/version.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const AppVersion = sandbox.AppVersion;
if (!AppVersion) {
  console.error('FAIL: AppVersion global not found on sandbox after loading version.js.');
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────────
// Test runner
// ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + err.message); failed++; }
}

const resolve = AppVersion.resolveIntegrityState;

test('resolveIntegrityState is a pure exported function', () => {
  assert.strictEqual(typeof resolve, 'function',
    'AppVersion.resolveIntegrityState must be a function (the pure state resolver).');
});

// ─── Case 1: tokens match → clean ───────────────────────────────────
test('1. tokens match → "clean" (online flag irrelevant, no nudge)', () => {
  assert.strictEqual(
    resolve({ loadedToken: 'abc1234', sourceToken: 'abc1234', online: true, recoveryAttempted: false }),
    'clean');
  // Even offline + recovered, a match is still clean.
  assert.strictEqual(
    resolve({ loadedToken: 'abc1234', sourceToken: 'abc1234', online: false, recoveryAttempted: true }),
    'clean');
});

// ─── Case 2: differ + online + not recovered → online ───────────────
test('2. tokens differ + online + not-yet-recovered → "online" (may promise completion)', () => {
  assert.strictEqual(
    resolve({ loadedToken: 'old0000', sourceToken: 'new1111', online: true, recoveryAttempted: false }),
    'online');
});

// ─── Case 3: differ + offline → offline (regardless of recovery flag, D-11) ─
test('3. tokens differ + offline → "offline" regardless of recoveryAttempted (D-11)', () => {
  assert.strictEqual(
    resolve({ loadedToken: 'old0000', sourceToken: 'new1111', online: false, recoveryAttempted: false }),
    'offline',
    'offline + not-recovered must be "offline"');
  assert.strictEqual(
    resolve({ loadedToken: 'old0000', sourceToken: 'new1111', online: false, recoveryAttempted: true }),
    'offline',
    'offline NEVER promises completion even after a recovery attempt (D-11) — must stay "offline", not "wedged"');
});

// ─── Case 4: differ + online + recovered → wedged (D-12) ────────────
test('4. tokens differ + online + recovery already attempted → "wedged" (no false refresh, D-12)', () => {
  assert.strictEqual(
    resolve({ loadedToken: 'old0000', sourceToken: 'new1111', online: true, recoveryAttempted: true }),
    'wedged');
});

// ─── Case 5: no network reachable from the resolver (VER-06) ────────
test('5. resolver makes NO network call (fetch/XHR traps never fire) (VER-06)', () => {
  networkTouched = false;
  // Exercise every branch; if any path reaches fetch/XHR the trap sets the flag.
  resolve({ loadedToken: 'a', sourceToken: 'a', online: true, recoveryAttempted: false });
  resolve({ loadedToken: 'a', sourceToken: 'b', online: true, recoveryAttempted: false });
  resolve({ loadedToken: 'a', sourceToken: 'b', online: false, recoveryAttempted: false });
  resolve({ loadedToken: 'a', sourceToken: 'b', online: true, recoveryAttempted: true });
  assert.strictEqual(networkTouched, false,
    'the resolver reached a network primitive — VER-06 requires a fully-local check');
});

// ─── Purity: same args → same result, no dependence on globals ──────
test('6. resolver is pure — identical args yield identical results across calls', () => {
  const args = { loadedToken: 'x', sourceToken: 'y', online: true, recoveryAttempted: false };
  const a = resolve(args);
  const b = resolve(args);
  assert.strictEqual(a, b, 'a pure function must be deterministic for identical inputs');
  assert.strictEqual(a, 'online');
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log('Plan 04 integrity-state tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
