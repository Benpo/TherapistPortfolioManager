---
last_mapped_commit: 4493f7d23dd9080cc5547d9a069fcf43d94dcf01
---

# Testing Patterns

**Analysis Date:** 2026-07-07

## Test Framework

**Runner:**
- Custom Node.js runner — `tests/run-all.js`
- No Jest, Mocha, or Vitest. The runner uses `child_process.spawnSync` to run each
  `tests/*.test.js` as an isolated child process (continues on failure, 120s timeout per file).
- Config: no config file — behavior is hardcoded in `tests/run-all.js`

**Assertion Library:**
- Node.js built-in `assert` module (`assert.ok`, `assert.strictEqual`, `assert.deepStrictEqual`, `assert.throws`)
- Some tests use a hand-rolled `check(name, condition)` helper instead

**DOM Environment:**
- `jsdom` (v29) — installed as the sole devDependency for tests that need a DOM
- Many tests use Node.js `vm` module to load production JS into a custom sandbox — no jsdom needed
- Helper: `tests/_helpers/jsdom-pdf-env.js` bootstraps the full jsdom environment for PDF tests

**Run Commands:**
```bash
npm test              # Run all 106 test files (tests/run-all.js)
node tests/<file>.test.js   # Run a single test file directly
```

## Test File Organization

**Location:**
- All test files at `tests/*.test.js` (top-level, not co-located with source)
- Shared helpers at `tests/_helpers/` — never run as tests themselves

**Naming:**
- Phase/plan tests: `{phase}-{plan}-{slug}.test.js` → `25-01-sendToMyself-removed.test.js`
- Quick/hotfix tests: `quick-{YYMMDD}-{id}-{slug}.test.js` → `quick-260626-h5j-trigger-autoconvert.test.js`
- Feature/concern tests: descriptive slug → `pdf-bidi.test.js`, `sw-precache-cache-reload.test.js`

**Helper files in `tests/_helpers/`:**
- `app-stub.js` — spy-instrumented `App.*` stub for page-level tests
- `mock-portfolio-db.js` — spy-instrumented `PortfolioDB.*` stub
- `jsdom-pdf-env.js` — full jsdom + jsPDF environment bootstrap for PDF tests
- `base64-codec.js` — base64 encode/decode utility
- `mock-navigator-share.js` — Web Share API stub

## Test Structure

Each test file is self-contained and exits with `process.exit(0)` (all pass) or
`process.exit(1)` (any failure). There are two hand-rolled runner patterns:

**Pattern A — async test() helper with EXPECTED_COUNT guard (newer tests):**

```js
'use strict';
const assert = require('assert');

const EXPECTED_COUNT = 5; // vacuous-green guard: a dropped await test() is caught
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log('  PASS  ' + name);
    passed++;
  } catch (err) {
    console.log('  FAIL  ' + name);
    console.log('        ' + (err && err.message || err));
    failed++;
  }
}

(async () => {
  await test('A. description', async () => {
    // ... assertions
  });
  // ...

  const ran = passed + failed;
  if (ran !== EXPECTED_COUNT) {
    console.log('FAIL  scenario-count guard: ran ' + ran + ' of ' + EXPECTED_COUNT);
    process.exit(1);
  }
  process.exit(failed === 0 ? 0 : 1);
})();
```

Files using this pattern: `tests/31-openDB-pooling.test.js`, `tests/25-01-sendToMyself-removed.test.js`

**Pattern B — synchronous check() with failures counter:**

```js
'use strict';
let failures = 0;
function check(name, cond) {
  if (cond) console.log('  ok  - ' + name);
  else { console.error('  FAIL - ' + name); failures++; }
}

// ... test functions calling check() ...

async function run() {
  testFunctionA();
  await testFunctionB();
  if (failures > 0) { process.exit(1); }
  console.log('PASSED: all cases.');
  process.exit(0);
}
run().catch((e) => { console.error('TEST CRASHED:', e); process.exit(1); });
```

Files using this pattern: `tests/29-03-report-wiring.test.js`, `tests/29-03-report.test.js`

## Sandbox Loading — Core Technique

Production assets are vanilla IIFE globals that assume a browser environment.
Tests load them into a `vm` sandbox that provides exactly the browser globals the
module needs at load time — no more.

```js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
  window: { name: 'app' },
  indexedDB: makeIDBShim(),
  IDBKeyRange: { only(v) { return { _only: v }; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  document: { getElementById() { return null; }, createElement() { ... } },
  console: { error() {}, warn() {}, log() {} },
  setTimeout, clearTimeout, queueMicrotask, Promise, JSON, Math, Date,
  Array, Object, Set, Map,
};
vm.createContext(sandbox);
const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'db.js'), 'utf8');
vm.runInContext(src, sandbox, { filename: 'assets/db.js' });

// Access exposed globals:
const PortfolioDB = sandbox.window.PortfolioDB;
```

**Key rule:** Each scenario that needs a clean module state calls `loadDB()` / a loader
function which creates a fresh `vm.createContext` — never reuse a sandbox across tests.

## Mocking

**Framework:** Hand-rolled stubs — no sinon, jest.fn(), etc.

**IDB Shim pattern (complex — for db.js tests):**

A custom in-memory IndexedDB shim is written inline in the test file. The shim in
`tests/31-openDB-pooling.test.js` is the canonical strengthened reference:
- `makeIDBShim()` returns a full IDB-shaped object with `open`, `databases`, `deleteDatabase`
- Stores are in-memory `Map` instances
- All IDB callbacks are delivered via `queueMicrotask` (matching browser async behavior)
- Exposes test seams: `idb._openCount`, `idb._openedHandles`, `idb._stage(name, version, stores)`, `idb._peek(name, store)`, `idb._hasDatabase(name)`
- Closed-handle guard: `close()` sets `_closed` flag; `transaction()` throws `InvalidStateError` when `_closed`

**App stub (for page-level tests):**

`tests/_helpers/app-stub.js` exports `createAppStub(overrides)`:
- Spy-instrumented: every call recorded to `stub.__calls` (a `Map` of `methodName → [[args], ...]`)
- All surface methods return sensible defaults (i18n `t(key)` returns the key; `initCommon()` returns `Promise.resolve()`)
- Overrides: pass `{ methodName: fn }` to replace defaults per-test

```js
const { createAppStub } = require('./_helpers/app-stub');
const appStub = createAppStub({ t: (k) => myMessages[k] || k });
win.App = appStub;
// ... drive the real page ...
assert.strictEqual(appStub.__calls.get('showToast').length, 1);
```

**DOM stub pattern (for wiring tests):**

Each test file that needs DOM but not jsdom writes a `makeElement(tag)` / `makeDocument(registry)` factory inline. The element stub implements: `classList`, `dataset`, `style`, `textContent`, `onclick`, `setAttribute`, `appendChild`, `querySelector`, `_allText()`, `_allWithHref()`, `_find(sel)`.

**What to mock:**
- Browser globals the module reads at load time (must be in sandbox)
- IndexedDB (use hand-rolled shim, not a third-party library)
- `App.*` surface (use `createAppStub`)
- `PortfolioDB.*` surface (use `tests/_helpers/mock-portfolio-db.js`)
- `localStorage` (use `{ _m: new Map(), getItem(k){...}, setItem(k,v){...}, removeItem(k){...} }`)

**What NOT to mock:**
- The coupled severity widget pair (`App.createSeverityScale` + `App.getSeverityValue`) — load the real `app.js` and pass through via overrides
- The module under test itself

## Test Categories

**1. Behavioral / observable-effect tests (primary):**
Assert observable side effects — returned values, persisted store state via `_peek`, DOM
content via `_allText()`, navigation target via `location.href`. Never assert internal
private state (`_dbPromise`, `_migrationDone`, etc.).

**2. Source / shape audit tests (secondary):**
`fs.readFileSync` + regex/`indexOf` to assert that specific strings or CSS rule shapes
exist or are absent in production source files. Used for i18n enforcement, CSS regression
guards, and removal verification.

```js
// Source audit example
const css = fs.readFileSync(cssPath, 'utf8');
assert.ok(css.indexOf('sendToMyself') === -1, 'string must not appear in source');
```

**3. Vacuous-green guard:**
Every test suite using Pattern A includes an `EXPECTED_COUNT` check at the end. If a
`await test(...)` is accidentally dropped (e.g. missing `await`), the count mismatch
fails the suite before the count reaches the runner.

## Fixtures and Factories

**Test data:**
- Inline within each test — no shared fixture files
- IDB pre-seeding via `idb._stage(name, version, storesSpec)`:

```js
idb._stage('emotion_code_portfolio', 5, {
  clients: {
    keyPath: 'id',
    records: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
  },
  sessions: { keyPath: 'id', records: [] },
});
```

## Coverage

**Requirements:** No coverage tool configured. Coverage is not numerically enforced.

**Known gaps:** Test coverage is behavior-driven, not line-driven. Source-audit tests
(`grep` gates) verify shape but not execution path. A known failure mode: tests that
count file mentions do not prove the code runs (see `memory/feedback-test-coverage-count-not-real.md`).

## Common Patterns

**Async settlement — flush microtasks/timers:**

```js
// After triggering an async operation, flush with two setTimeout rounds:
await new Promise((r) => setTimeout(r, 0));
await new Promise((r) => setTimeout(r, 0));
```

**Deadlock protection via Promise.race:**

```js
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT (' + ms + 'ms): ' + label)), ms)
    ),
  ]);
}
// Usage:
const result = await withTimeout(PortfolioDB.getAllClients(), 5000, 'getAllClients');
```

**Concurrent-open test:**

```js
const results = await Promise.allSettled([
  PortfolioDB.getAllClients(),
  PortfolioDB.getAllClients(),
]);
assert.strictEqual(results.length, 2, 'both concurrent opens must settle (no hang)');
```

**DOM event capture (async page handlers):**

The `docListeners` pattern (from `25-06`): override `document.addEventListener` before
`vm.runInContext` to capture registered handlers, then `await` the specific async handler
rather than dispatching `DOMContentLoaded` (which does not await async listeners).

**Error testing:**

```js
assert.throws(
  () => handle.transaction('clients', 'readonly'),
  (e) => e && e.name === 'InvalidStateError',
  'closed handle must throw InvalidStateError'
);
```

---

*Testing analysis: 2026-07-07 (incremental remap, scope: root-level static files — no source changes)*
