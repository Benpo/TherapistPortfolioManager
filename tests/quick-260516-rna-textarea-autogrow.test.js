/**
 * Quick 260516-rna — Behavior test: long add-session textareas auto-grow to
 * fit their content (both while typing AND on edit-load), keep manual vertical
 * resize as a fallback, and do not break snippet expansion.
 *
 * FALSIFIABLE (project convention MEMORY:feedback-behavior-verification):
 *
 *   Test A (source contract — load-bearing shape): assets/add-session.js
 *     defines a reusable auto-grow helper (`autoGrow`) whose body resets
 *     `style.height = "auto"` then sets `style.height` from a scrollHeight
 *     computation, binds an `input` listener filtered to `.session-textarea`,
 *     AND grows every `.session-textarea` after populateSession() pre-fills
 *     values (a `growAllSessionTextareas`-style symbol referenced on/after
 *     populateSession).
 *
 *   Test B (behavior — causal, the real fix): load add-session.js in a vm
 *     sandbox (stubbed document/window/App so module eval reaches the hook
 *     assignment) and call the exposed pure hook
 *     `window.__addSessionTestHooks.computeGrowHeight` on a fake textarea
 *     whose scrollHeight reflects content length. SHORT content -> 56px floor;
 *     LONG content -> the larger scrollHeight value; AND
 *     heightFor(long) > heightFor(short). The contrast (short stays at the
 *     floor, long grows) proves grow-to-fit, not a constant.
 *
 *   Test C (no-cap / fallback intact): the height computation does NOT clamp
 *     to a hard max (no `Math.min(` in computeGrowHeight); assets/app.css
 *     still declares `resize: vertical` on `.textarea`; the editable
 *     (non-read-mode) `.textarea` state adds no `overflow:hidden`/`max-height`.
 *
 * Run: node tests/quick-260516-rna-textarea-autogrow.test.js
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

const ADD_SESSION_SRC = fs.readFileSync(path.join(ROOT, 'assets', 'add-session.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'assets', 'app.css'), 'utf8');

// ────────────────────────────────────────────────────────────────────
// Test A — source contract (load-bearing shape)
// ────────────────────────────────────────────────────────────────────

test('A1: add-session.js defines an autoGrow helper that resets height to "auto"', () => {
  assert.ok(
    /function\s+autoGrow\s*\(/.test(ADD_SESSION_SRC) ||
      /\bautoGrow\s*=\s*function\s*\(/.test(ADD_SESSION_SRC) ||
      /\bconst\s+autoGrow\s*=\s*\(/.test(ADD_SESSION_SRC),
    'expected a reusable `autoGrow` helper to be defined'
  );
  assert.ok(
    /style\.height\s*=\s*["']auto["']/.test(ADD_SESSION_SRC),
    'autoGrow must reset style.height = "auto" before measuring scrollHeight'
  );
});

test('A2: autoGrow is bound on an input path filtered to .session-textarea', () => {
  assert.ok(
    /addEventListener\(\s*["']input["']/.test(ADD_SESSION_SRC),
    'expected an addEventListener("input", ...) binding for auto-grow'
  );
  assert.ok(
    /session-textarea/.test(ADD_SESSION_SRC) &&
      /classList\b[\s\S]{0,80}contains\(\s*["']session-textarea["']\s*\)/.test(ADD_SESSION_SRC),
    'the delegated input listener must filter to .session-textarea via ' +
      'e.target.classList.contains("session-textarea")'
  );
});

test('A3: a growAll-style symbol is invoked after populateSession pre-fills values', () => {
  assert.ok(
    /function\s+growAllSessionTextareas\s*\(/.test(ADD_SESSION_SRC) ||
      /\bgrowAllSessionTextareas\s*=/.test(ADD_SESSION_SRC),
    'expected a growAllSessionTextareas() helper iterating .session-textarea'
  );
  // The grow-all call must appear inside / right after the populateSession body.
  const popIdx = ADD_SESSION_SRC.indexOf('function populateSession');
  assert.ok(popIdx !== -1, 'populateSession function not found');
  const popBody = ADD_SESSION_SRC.slice(popIdx, popIdx + 4000);
  assert.ok(
    /growAllSessionTextareas\s*\(/.test(popBody),
    'populateSession() must call growAllSessionTextareas() so pre-filled ' +
      'long content is sized to fit on edit-load (not trimmed until a keystroke)'
  );
});

// ────────────────────────────────────────────────────────────────────
// Test B — behavior: computeGrowHeight grows to fit (causal)
// Load the REAL assets/add-session.js in a vm sandbox.
// ────────────────────────────────────────────────────────────────────

function loadComputeGrowHeight() {
  const noopEl = () => ({
    addEventListener() {}, removeEventListener() {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    setAttribute() {}, getAttribute() { return null; },
    style: {}, value: '', checked: false,
    closest() { return null; },
  });
  const doc = {
    addEventListener() {},          // swallows the DOMContentLoaded registration
    removeEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return noopEl(); },
    body: { classList: { add() {}, remove() {}, toggle() {} } },
    head: { appendChild() {} },
  };
  const win = {};
  const App = {
    initCommon() { return Promise.resolve(); },
    t() { return ''; },
    applyTranslations() {},
    getSectionLabel() { return ''; },
    initBirthDatePicker() { return { clear() {} }; },
    installNavGuard() {},
  };
  const sandbox = {
    window: win,
    document: doc,
    App,
    PortfolioDB: { getClient() { return Promise.resolve(null); } },
    URLSearchParams: function () { return { get() { return null; } }; },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    setTimeout, clearTimeout, Promise, JSON, Math, Date, console,
    Array, Object, Set, Map, WeakMap, RegExp, String, Number, Boolean, parseInt: global.parseInt,
  };
  sandbox.window.App = App;
  vm.createContext(sandbox);
  vm.runInContext(ADD_SESSION_SRC, sandbox, { filename: 'assets/add-session.js' });
  const hooks = sandbox.window.__addSessionTestHooks;
  assert.ok(hooks && typeof hooks.computeGrowHeight === 'function',
    'add-session.js must expose window.__addSessionTestHooks.computeGrowHeight ' +
      '(mirrors the g7p __*TestHooks convention) for falsifiable behavior testing');
  return hooks.computeGrowHeight;
}

// Fake textarea whose scrollHeight reflects its content size.
function fakeTextarea(lineCount) {
  return { scrollHeight: 56 + 20 * Math.max(lineCount - 1, 0), style: {} };
}

test('B1: SHORT content computes to the 56px floor', () => {
  const computeGrowHeight = loadComputeGrowHeight();
  const short = fakeTextarea(1);          // scrollHeight === 56
  assert.strictEqual(
    computeGrowHeight(short), 56,
    'a single short line must stay at the 56px floor'
  );
});

test('B2: LONG content grows to the larger scrollHeight (grow-to-fit, not a constant)', () => {
  const computeGrowHeight = loadComputeGrowHeight();
  const long = fakeTextarea(40);          // scrollHeight === 56 + 20*39 === 836
  assert.strictEqual(
    computeGrowHeight(long), 836,
    'long content must grow to its scrollHeight (no inner scroll / trimming)'
  );
});

test('B3: heightFor(long) > heightFor(short) — the contrast proves grow-to-fit', () => {
  const computeGrowHeight = loadComputeGrowHeight();
  const hShort = computeGrowHeight(fakeTextarea(1));
  const hLong = computeGrowHeight(fakeTextarea(40));
  assert.ok(
    hLong > hShort,
    `expected long height (${hLong}) to exceed short height (${hShort})`
  );
});

// ────────────────────────────────────────────────────────────────────
// Test C — no hard cap; manual-resize fallback preserved
// ────────────────────────────────────────────────────────────────────

test('C1: computeGrowHeight does NOT clamp to a hard max (no Math.min in its body)', () => {
  const m = ADD_SESSION_SRC.match(
    /function\s+computeGrowHeight\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\}/
  );
  assert.ok(m, 'computeGrowHeight function body not found');
  assert.ok(
    !/Math\.min\s*\(/.test(m[1]),
    'computeGrowHeight must NOT clamp height with Math.min — user explicitly ' +
      'wants grow-to-fit with no upper cap'
  );
});

test('C2: app.css still declares `resize: vertical` on .textarea (manual fallback)', () => {
  const block = CSS.match(/\.textarea\s*\{[^}]*\}/);
  assert.ok(block, '.textarea rule block not found in app.css');
  assert.ok(
    /resize:\s*vertical/.test(block[0]),
    'the editable .textarea must keep `resize: vertical` (manual drag fallback)'
  );
});

test('C3: editable (non-read-mode) .textarea adds no overflow:hidden / max-height', () => {
  const block = CSS.match(/(^|\n)\.textarea\s*\{[^}]*\}/);
  assert.ok(block, '.textarea rule block not found in app.css');
  assert.ok(
    !/overflow\s*:\s*hidden/.test(block[0]),
    'the editable .textarea state must NOT set overflow:hidden (would hide grow)'
  );
  assert.ok(
    !/max-height/.test(block[0]),
    'the editable .textarea state must NOT set max-height (would cap grow)'
  );
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log(`quick-260516-rna textarea-autogrow — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
