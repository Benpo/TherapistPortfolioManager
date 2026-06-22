# Testing Patterns

**Analysis Date:** 2026-06-22

## Test Framework

**Runner:** Node.js built-in (`node tests/<file>.test.js`) — no Jest, no Vitest, no test runner framework.

**Assertion library:** Node.js built-in `assert` module (`require('assert')`).

**Sandbox execution:** `node:vm` — asset files are loaded into a controlled sandbox via `vm.runInContext()` to isolate browser globals from Node.

**No package.json** — the project has no npm setup. There is no `npm test` command. Tests are run individually.

**Run commands:**
```bash
node tests/<test-file>.test.js          # Run a single test file
node tests/25-11-i18n-parity.test.js    # Example: i18n parity check
node tests/24-04-trigger-regex.test.js  # Example: snippet trigger logic

# Some PDF tests require jsdom installed at /tmp/node_modules/jsdom
mkdir -p /tmp && cd /tmp && npm install jsdom
node tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js
# Or with custom jsdom path:
JSDOM_PATH=/path/to/node_modules/jsdom node tests/<pdf-test>.test.js
```

All test files exit 0 on pass, 1 on any failure.

## Test File Organization

**Location:** `tests/` directory at project root (not co-located with source).

**Total files:** 74 test files as of 2026-06-22.

**Helper files:** `tests/_helpers/mock-navigator-share.js`, `tests/_helpers/mock-portfolio-db.js`

**Naming conventions:**
- Phase/plan tests: `{phase}-{plan}-{description}.test.js`
  - e.g., `25-11-i18n-parity.test.js`, `24-04-trigger-regex.test.js`
- Quick-task tests: `quick-{YYMMDD}-{task-id}-{description}.test.js`
  - e.g., `quick-260620-q8m-pdf-paragraph-linebreaks.test.js`, `quick-260619-okw-trigger-unicode.test.js`
- PDF-specific tests: `pdf-{description}.test.js`
  - e.g., `pdf-bidi.test.js`, `pdf-bold-rendering.test.js`, `pdf-digit-order.test.js`
- Service worker test: `sw-precache-cache-reload.test.js`

## Test Structure

**Standard structure: vm sandbox + test runner loop**

```js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// 1. Build a minimal browser-globals sandbox
const sandbox = {
  window: { name: '' },
  document: { addEventListener() {}, getElementById() { return null; }, ... },
  navigator: { userAgent: '' },
  setTimeout, clearTimeout, Promise, JSON, Math, ...,
  console: { log() {}, warn() {}, error() {} },
};
vm.createContext(sandbox);

// 2. Load the asset under test into the sandbox
const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'snippets.js'), 'utf8');
vm.runInContext(src, sandbox, { filename: 'assets/snippets.js' });

// 3. Extract the module under test
const { detectTrigger } = sandbox.window.Snippets.__testExports;

// 4. Custom test runner (no framework)
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name + '\n        ' + err.message); failed++; }
}

// 5. Tests using assert
test('description', () => {
  assert.strictEqual(result.type, 'match');
});

// 6. Exit code
process.exit(failed === 0 ? 0 : 1);
```

**Async tests** use a top-level `async function main()` + `.catch(err => process.exit(1))`:
```js
async function main() {
  // await calls...
}
main().catch(err => { console.error('FATAL:', err); process.exit(1); });
```

## PDF Tests (jsdom-based)

PDF rendering tests (files matching `pdf-*.test.js` and PDF-related quick tests) require jsdom
because jsPDF uses browser DOM APIs. Pattern:

```js
const { JSDOM } = require(process.env.JSDOM_PATH || '/tmp/node_modules/jsdom');

function buildJsdomEnv() {
  const dom = new JSDOM('<!doctype html>...', {
    url: 'file://' + REPO_ROOT + '/test-harness.html',
    runScripts: 'outside-only',
  });
  const win = dom.window;
  win.HTMLCanvasElement.prototype.getContext = () => null; // jsdom stub
  win.eval(fs.readFileSync('assets/jspdf.min.js', 'utf8'));
  win.eval(fs.readFileSync('assets/bidi.min.js', 'utf8'));
  win.eval(fs.readFileSync('assets/fonts/heebo-base64.js', 'utf8'));
  win.eval(fs.readFileSync('assets/pdf-export.js', 'utf8'));
  return dom;
}
```

Deterministic PDF output is achieved by pinning date and file ID on the jsPDF instance:
```js
doc.setCreationDate("D:20260101000000+00'00'");
doc.setFileId('00000000000000000000000000000000');
```

## Mocking

**What is mocked:**
- `window.localStorage` — stubbed inline in each sandbox (`{ getItem() { return 'he'; }, setItem() {} }`)
- `document.*` — minimal stubs (getElementById returns null, querySelectorAll returns [])
- `navigator.userAgent` — set to empty string
- `HTMLCanvasElement.prototype.getContext` — returns `null` (jsPDF PDF tests only)
- jsPDF `doc.text` — wrapped to record all draw calls into `win.__textCalls` (behavior spy for paragraph layout tests)

**What is NOT mocked:**
- `assert` — uses real Node.js assert
- `vm` sandbox itself — real Node.js vm module
- File system reads — real `fs.readFileSync` against the actual repo files

**Helper files:**
- `tests/_helpers/mock-navigator-share.js` — stubs `navigator.share`
- `tests/_helpers/mock-portfolio-db.js` — stubs IndexedDB calls

## Key Test Patterns

### Behavior Tests (mandatory for runtime-behavior fixes)

Per project memory (`feedback-behavior-verification.md`): runtime-behavior bugs MUST have a
falsifiable behavior test that FAILS on the old code and PASSES after the fix. Grep/shape checks
are not sufficient.

Pattern: spy on a low-level rendering call and assert on observable output:
- `tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js` wraps `doc.text` to record baseline Y
  coordinates and asserts that 3 separate lines render on 3 distinct Y values.

### i18n Parity Tests

`tests/25-11-i18n-parity.test.js` — loads all 4 locale files in a vm sandbox and asserts:
1. Specific new keys exist in all 4 locales
2. Every key in `i18n-en.js` exists in all other locale files (parity invariant)

### Shape / Structure Tests

Tests that assert module structure without runtime behavior:
- `tests/25-01-sendToMyself-removed.test.js` — grep-style: asserts a removed function is absent
- `tests/25-13-css-audit.test.js` — reads CSS source and checks class/variable presence

### ReDoS Safety Tests

`tests/24-04-trigger-regex.test.js` scenario H: runs an adversarial 10,000-char input 5 times
and asserts total elapsed time < 50ms.

### Test Documentation Pattern

Each test file opens with a block comment that:
1. Names the phase/plan and what is being tested
2. Lists the numbered scenarios (A, B, C... or Test 1, 2, 3...)
3. States the `Run:` command
4. States the exit code contract
5. For behavior tests: explains the bug root cause, the fix, and why the test is falsifiable

## What Is Tested

- Snippet trigger detection regex and locale fallback chain (`assets/snippets.js`)
- PDF paragraph rendering, bold text, BiDi, digit order, RTL ordered lists, glyph coverage
- i18n key parity across all 4 locales
- IndexedDB migration shape
- Photo crop, resize, delete, bytes estimator
- Schedule/reminder debounce, interval, password enforcement
- Backup import/export structure
- Service worker precache configuration
- Cloud sync state machine
- CSS structure audits

## What Is NOT Tested

- Full end-to-end user flows (no Playwright/Cypress)
- IndexedDB read/write at runtime (tests mock the DB layer)
- UI rendering correctness in a browser (no visual regression tests)
- Authentication / Lemon Squeezy payment flows
- Settings save/load round-trips in a real browser context

## Coverage Status

No coverage tooling configured. No enforced coverage threshold. Coverage is informal — each
phase/quick task adds targeted tests for the specific behavior changed, rather than
maintaining aggregate line coverage.

---

*Testing analysis: 2026-06-22*
