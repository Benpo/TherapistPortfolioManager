# Phase 30: Test Harness & Coverage - Pattern Map

**Mapped:** 2026-06-26
**Files analyzed:** 13 (3 infra/config, 1 shared helper-new, 1 App-stub-new, 6 new test files, 7 modified PDF tests)
**Analogs found:** 12 / 13 (only root `package.json` has no in-repo analog — first ever)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `package.json` (root, NEW) | config | n/a | — none in repo (first ever) | NO ANALOG |
| `tests/run-all.js` (NEW) | test-runner | batch | per-file Node-runner convention in `tests/` + TESTING.md | role-match |
| `tests/_helpers/jsdom-pdf-env.js` (NEW) | utility (test helper) | transform | inline `buildJsdomEnv` in `tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js:85-120` | exact |
| `tests/_helpers/app-stub.js` (NEW) | utility (test stub) | event-driven | `tests/_helpers/mock-portfolio-db.js`, `tests/_helpers/mock-navigator-share.js` | role-match |
| `tests/30-rtl-guard.test.js` (NEW) | test | request-response | `tests/29-02-migration-escape-hatch.test.js` (case 5), `tests/25-11-i18n-parity.test.js` (4-locale loader) | exact (composite) |
| `tests/30-settings-section-roundtrip.test.js` (NEW) | test | CRUD round-trip | `tests/_helpers/mock-portfolio-db.js` + jsdom real-page (Pattern 2) | role-match |
| `tests/30-settings-tabnav.test.js` (NEW) | test | event-driven | vm-sandbox pattern (`25-11`) / jsdom real-page | role-match |
| `tests/30-export-markdown.test.js` (NEW) | test | transform | jsdom real-page + `app-stub.js` | partial (no executing analog exists) |
| `tests/30-export-stepper.test.js` (NEW) | test | event-driven (state machine) | jsdom real-page + `mock-navigator-share.js` | partial |
| `tests/30-issue-delta.test.js` (NEW) | test | transform / CRUD | vm-sandbox (`25-11`) → jsdom for rows | role-match |
| 7 PDF tests (MODIFIED — adopt helper) | test | file-I/O (PDF bytes) | reference `quick-260620-q8m` (already-green, stubs `getContext`) | exact |

The 7 PDF tests being **modified** (not created): `pdf-bold-rendering`, `pdf-digit-order`, `pdf-glyph-coverage`, `pdf-latin-regression`, `quick-260522-iwr-ordered-list-export`, `quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix`, `quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression`.

## Pattern Assignments

### `tests/_helpers/jsdom-pdf-env.js` (NEW — utility, D-04)

**Analog:** `tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js` (the already-green reference; the 7 broken tests are exactly the ones MISSING the `getContext` stub).

**The load-bearing excerpt to extract** (`quick-260620-q8m...test.js:85-120`):
```js
function buildJsdomEnv() {
  var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'file://' + REPO_ROOT + '/test-harness.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  // THE FIX the 7 broken tests are missing — stub getContext BEFORE eval:
  win.HTMLCanvasElement.prototype.getContext = function () { return null; };
  win.eval(readAsset('assets/jspdf.min.js'));
  win.eval(readAsset('assets/bidi.min.js'));
  win.eval(readAsset('assets/fonts/heebo-base64.js'));
  win.eval(readAsset('assets/fonts/heebo-bold-base64.js'));
  // ... WrappedJsPDF wrapper installs deterministic pins per-instance:
  doc.setCreationDate("D:20260101000000+00'00'");   // PINNED_DATE
  doc.setFileId('00000000000000000000000000000000'); // PINNED_FILE_ID
}
```

**Critical detail to preserve (lines 110-120):** jsPDF installs `text` as an OWN property on each doc INSTANCE in its constructor (NOT on the prototype). Any spy / the deterministic `setCreationDate`/`setFileId` pins must be applied via a `WrappedJsPDF` wrapper right after `new OriginalJsPDF(args)`, not on `prototype`.

**Replace the fragile dependency-resolution dance** (`quick-260620-q8m...test.js:62-72`):
```js
var JSDOM_PATH = process.env.JSDOM_PATH || '/tmp/node_modules/jsdom';
JSDOM = require(JSDOM_PATH).JSDOM;   // ← OLD: the /tmp convention
```
Now that jsdom is an installed devDependency (D-01), the helper should `require('jsdom').JSDOM` directly (node resolves from `node_modules`). This line is the deprecated-after-this-phase code (RESEARCH §State of the Art).

**Helper contract:** accept/return `{ dom, win }`; expose the `getContext→null` stub, the jspdf/bidi/heebo/pdf-export loads, and a deterministic-pin helper. The 7 broken tests then `require` it and delete their inline `buildJsdomEnv` + JSDOM_PATH block.

---

### `tests/30-rtl-guard.test.js` (NEW — test, TEST-02, D-11)

**Analogs:** `tests/29-02-migration-escape-hatch.test.js` (dir=rtl assertion + hand-rolled DOM stub) and `tests/25-11-i18n-parity.test.js` (4-locale vm loader).

**Real code path under test** (`assets/app.js:124`, exported at `app.js:1346-1347`):
```js
// assets/app.js:116-124  function setLanguage(lang) { ...
document.documentElement.setAttribute("dir", currentLang === "he" ? "rtl" : "ltr");
// window.App = { ..., setLanguage, getLanguage: () => currentLang }  (1346-1347)
```

**4-locale sweep pattern** (from RESEARCH §Code Examples, mirror `29-02` case 5 assertion shape):
```js
for (const [lang, expected] of [['he','rtl'], ['en','ltr'], ['de','ltr'], ['cs','ltr']]) {
  win.App.setLanguage(lang);
  assert.strictEqual(
    win.document.documentElement.getAttribute('dir'), expected,
    `locale ${lang} must map to dir=${expected}`
  );
}
// FALSIFIABLE: changing the condition to e.g. currentLang !== 'en' flips de/cs to rtl → FAIL.
```

**vm-loader pattern to copy** (`25-11-i18n-parity.test.js:25-43`) if loading via vm rather than jsdom — `sandbox = { window:{}, console:{...} }`, `vm.createContext`, `vm.runInContext(src, sandbox)` per file. For this guard, prefer jsdom (real `document.documentElement`) since the behavior is a DOM attribute; the `29-02` minimal-DOM-stub at lines 45-90 is the zero-jsdom fallback if app.js loads cleanly in a stub.

**Test scaffold (PASS/FAIL counter, exit 0/1)** to copy: `25-11-i18n-parity.test.js:53-65`.

---

### `tests/30-settings-section-roundtrip.test.js` (NEW — test, TEST-03a, D-09 jsdom real-page)

**Analog:** `tests/_helpers/mock-portfolio-db.js` + Pattern 2 (jsdom load real `settings.html` body).

This closes the documented gap (TESTING.md "What Is NOT Tested: Settings save/load round-trips"). Observable behavior only (D-08).

**Mock-DB wiring excerpt** (`mock-portfolio-db.js:50-95`, usage at top doc block):
```js
const { createMockPortfolioDB } = require('./_helpers/mock-portfolio-db');
const mockDb = createMockPortfolioDB({ therapistSettings: [/* seeded section labels */] });
win.PortfolioDB = mockDb;   // inject into the jsdom window
win.App = appStub;          // tests/_helpers/app-stub.js
// fire DOMContentLoaded (settings.js:643 handler runs loadAndRender)
// → edit a section-title input → click Save (onSave at settings.js:448)
assert.ok(mockDb.__calls.get('setTherapistSetting').length >= 1);   // PERSISTED
// → re-run loadAndRender → assert rendered input shows the saved value (ROUND-TRIP)
```
Spy API: `mockDb.__calls.get('setTherapistSetting')` is an array of arg-arrays (deep-copied) — assert the persisted record shape on it. Reads return the configured `therapistSettings` array (`mock-portfolio-db.js:94`). `assertNoWrites(mockDb)` (lines 114-128) is available for negative assertions.

**Key settings.js anchors** (from RESEARCH): `DOMContentLoaded` handler at `settings.js:643`; `onSave` at `:448`; `setTherapistSetting`/`getAllTherapistSettings` are the only DB deps and both already exist in the mock.

---

### `tests/30-settings-tabnav.test.js` (NEW — test, TEST-03b)

**Analog:** vm-sandbox (`25-11`) or jsdom real-page. Behavior: `?tab=` URL param selects active tab; switching writes URL; invalid tab falls back. settings.js IIFE-3 (`readUrlTab`, `writeUrlTab`, `boot`, `activate`, lines 2035-2113). Tier: Cheap. Assert observable active-tab class + `window.location` search, never internal fn names.

---

### `tests/30-export-markdown.test.js` (NEW — test, TEST-03c)

**Analog:** jsdom real-page + `app-stub.js`. REPLACES the source-slicing anti-pattern in `quick-260615-export-section-order` (which `fs.readFileSync` + regex-matches function bodies — D-08 violation, see Anti-Patterns below).

Drive `buildSessionMarkdown` / `buildFilteredSessionMarkdown` (add-session.js:730-1180) by loading `add-session.html`, populating the form DOM, and asserting the emitted markdown STRING (section order, included/excluded sections, scale labels, headings). RESEARCH recommends widening `window.__addSessionTestHooks` to expose these builders for direct call after page load (benign, non-behavioral).

---

### `tests/30-export-stepper.test.js` (NEW — test, TEST-03d)

**Analog:** jsdom real-page + `tests/_helpers/mock-navigator-share.js` (for the share dispatch path). Export modal stepper (add-session.js:1180-1835). Assert active-step class transitions 1→2→3 and preview-text updates on section toggles. Share-mock usage (`mock-navigator-share.js:24-30`): `createShareMock({canShareReturns, shareReturns})`, inject as `navigator.canShare`/`navigator.share`, assert on `mock.calls`.

---

### `tests/30-issue-delta.test.js` (NEW — test, TEST-03e)

**Analog:** vm-sandbox (`25-11`) for the near-pure delta; jsdom for issue rows. add-session.js issue mgmt (502-662): `updateDelta`, `getIssuesPayload`, `validateIssues`. Assert severity before/after delta value, payload shape, empty-validation block. Highest value-per-effort in module B.

---

### 7 MODIFIED PDF tests (TEST-01, D-06)

**Analog / reference:** `tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js` (the 8th, already-green test that stubs `getContext`).

Each of the 7 must: (1) delete its inline `buildJsdomEnv` + the `JSDOM_PATH || '/tmp/node_modules/jsdom'` block, (2) `require('./_helpers/jsdom-pdf-env.js')`, (3) keep its own behavior assertions unchanged. The ONLY functional change is acquiring the `getContext→null` stub (`grep -c getContext` = 0 in all 7 today, = 2 in the reference). Guardrail D-06: do not let adoption turn any green test red; verify exit code, not stderr volume (Pitfall 2).

---

## Shared Patterns

### Test file doc-block + PASS/FAIL/exit contract
**Source:** every `tests/*.test.js`; canonical at `25-11-i18n-parity.test.js:1-17` (doc block) and `:53-65` (counter).
**Apply to:** all 6 new test files.
```js
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err.message||err)); failed++; }
}
// ... process.exit(failed > 0 ? 1 : 0)
```
Behavior tests additionally open with root-cause / fix / falsifiability note (`feedback-behavior-verification`); see `quick-260620-q8m...test.js:1-47` and `29-02...test.js:1-31`.

### Spy-instrumented mock (write-capture)
**Source:** `tests/_helpers/mock-portfolio-db.js:50-128` (`__calls` Map of arg-arrays, deep-copied; `assertNoWrites`).
**Apply to:** `app-stub.js` (NEW) should mirror this shape — a `__calls`/spy surface for `App.showToast`, `App.t`, etc., so tests can assert observable side effects. Surface to stub (grep-verified counts): `App.t` ×42, `App.getSectionLabel` ×21, `App.showToast` ×16, `App.applyTranslations` ×6, `App.getSeverityValue` ×4, `App.formatDate` ×4, `App.installNavGuard` ×3, `App.confirmDialog` ×3, `App.isSectionEnabled` ×2, `App.initCommon` ×2 (MUST resolve a Promise — landmine), `App.createSeverityScale` ×2, plus `unlockBodyScroll`/`lockBodyScroll`/`setSubmitLabel`/`readFileAsDataURL`/`initBirthDatePicker`/`formatSessionType`. `installNavGuard` + `BroadcastChannel` → no-op stubs.

### Deterministic PDF pinning
**Source:** `quick-260620-q8m...test.js:57-59,114-115`. `setCreationDate("D:20260101000000+00'00'")` + `setFileId('00000000000000000000000000000000')` applied per-instance in the `WrappedJsPDF` wrapper.
**Apply to:** the shared `jsdom-pdf-env.js` helper → all PDF + real-page-with-PDF tests.

## Anti-Patterns to Avoid (D-08 / D-12 risk)

- **Static source-slicing as "behavior test"** — `quick-260615-export-section-order.test.js` and `quick-260516-g7p-export-editor-snippets.test.js` `fs.readFileSync` the asset and regex-match internal function bodies. They assert SHAPE not behavior and break on a Phase 31 rename with zero behavior change. The new TEST-03 tests must `eval`/jsdom-LOAD and EXECUTE the module. Warning sign: a test that reads the asset but never `eval`/`vm.runInContext`/jsdom-loads it, or assertions referencing function names / `indexOf('function ')`.
- **Asserting internal helper names** (e.g. `renderSnippetList` exists/called) — assert rendered list CONTENTS instead.
- **Letting the shared helper turn a green test red** (D-06).

## No Analog Found

| File | Role | Reason | Planner guidance |
|------|------|--------|------------------|
| `package.json` (root) | config | First-ever package.json in this zero-runtime-dep repo; no in-repo precedent | Use the exact shape in RESEARCH §TEST-04: `private:true`, `name:"sessions-garden"`, `scripts.test:"node tests/run-all.js"`, `devDependencies:{jsdom:"^29.1.1"}`, `engines:{node:">=18.0.0"}`. Confirm `.gitignore` already has `node_modules/` (it does). |

`tests/run-all.js` has no exact analog (no suite-runner exists yet — per-file invocation is the current convention) but its idiom is project-native: `fs.readdirSync('tests').filter(f=>f.endsWith('.test.js'))`, spawn each with `node`, continue-on-fail, aggregate exit codes, exclude `_helpers/`. Must preserve the per-file exit-0/1 contract and fail the suite if ANY file fails (RESEARCH §TEST-04).

## Metadata

**Analog search scope:** `tests/`, `tests/_helpers/`, `assets/app.js`, `assets/settings.js`, `assets/add-session.js`, `.gitignore`, pre-commit hook
**Files scanned:** ~10 (reference test files, 2 shared helpers, app.js dir path, grep of add-session App.* surface)
**Pattern extraction date:** 2026-06-26
