---
phase: 30-test-harness-coverage
reviewed: 2026-06-26T22:40:53Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - package.json
  - tests/_helpers/app-stub.js
  - tests/_helpers/jsdom-pdf-env.js
  - tests/30-export-markdown.test.js
  - tests/30-export-stepper.test.js
  - tests/30-issue-delta.test.js
  - tests/30-rtl-guard.test.js
  - tests/30-section-visibility.test.js
  - tests/30-settings-section-roundtrip.test.js
  - tests/30-settings-tabnav.test.js
  - tests/pdf-bold-rendering.test.js
  - tests/pdf-digit-order.test.js
  - tests/pdf-glyph-coverage.test.js
  - tests/pdf-latin-regression.test.js
  - tests/quick-260522-iwr-ordered-list-export.test.js
  - tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js
  - tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js
  - tests/run-all.js
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 30: Code Review Report

**Reviewed:** 2026-06-26T22:40:53Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

This is a test-harness phase: a new `package.json` manifest (jsdom devDependency
+ `npm test` script), a `tests/run-all.js` suite runner, two shared helpers
(`app-stub.js`, `jsdom-pdf-env.js`), seven new `30-*` characterization tests that
drive the REAL `add-session.js` / `settings.js` / `app.js` under jsdom, and seven
pre-existing PDF/quick tests refactored to consume the new shared jsdom env. No
production source was modified.

Overall the test code is unusually disciplined: every async `30-*` test guards
against the vacuous-green trap with a capture-and-await of the specific
DOMContentLoaded handler plus an end-of-file `EXPECTED_COUNT` count guard, and the
falsifiability rationale (mutation → FAIL, internal-rename → GREEN) is documented
and credible in each file. I traced the assertion paths for the delta math,
section ordering, stepper transitions, share-payload shape, tab-nav fallback, and
RTL dir sweep — they exercise real observable behavior, not symbol existence. I
could not substantiate any always-true / vacuous assertion, any masked-behavior
stub, or any injection/secret/path-traversal issue (the `win.eval` calls load
trusted local assets, and `run-all.js` spawns with an arg array and no shell).

No blockers. Two robustness defects in the shared harness and three quality items
follow.

## Narrative Findings (AI reviewer)

### Warnings

#### WR-01: `run-all.js` spawns each test child with no timeout — one hung test stalls the entire green gate forever

**File:** `tests/run-all.js:64-67`
**Issue:** The runner uses `spawnSync(process.execPath, [file], { stdio: 'inherit', env: childEnv })` with no `timeout`. The new `30-*` tests drive ASYNC page handlers, and the helpers' own doc blocks repeatedly warn that a mis-wired async handler "hangs forever and the test never sees the page's side effects" (`app-stub.js` landmine 1) or that `buildSessionPDF` "would hang forever" if a dep-load never resolves (`30-export-stepper.test.js:76-81`). If any single child enters that state, `spawnSync` blocks indefinitely, the per-file `PASS`/`FAIL` loop never advances, and CI produces no summary and no exit code — the opposite of what a "green gate that will guard the Phase 31 refactor" needs. This is a realistic failure mode precisely because Phase 31 will be editing the very modules these tests load.
**Fix:** Pass a bounded timeout and treat a timeout kill as a failure (the existing `result.signal != null` branch already classifies signal termination as FAIL, so the timeout integrates cleanly):
```js
var result = spawnSync(process.execPath, [path.join(TESTS_DIR, file)], {
  stdio: 'inherit',
  env: childEnv,
  timeout: 120000,       // ms; tune to the slowest legitimate PDF test
  killSignal: 'SIGKILL',
});
// result.signal === 'SIGTERM'/'SIGKILL' on timeout → already counted as FAIL below
```

#### WR-02: `WrappedJsPDF` forwards only the first constructor argument — silently drops any additional positional args

**File:** `tests/_helpers/jsdom-pdf-env.js:99-101`
**Issue:** `function WrappedJsPDF(args) { var doc = new OriginalJsPDF(args); ... }` accepts and forwards exactly one parameter. jsPDF also supports the positional signature `new jsPDF(orientation, unit, format)`. Today this is safe — `assets/pdf-export.js:670` constructs with a single options object `new jsPDF({ unit:'pt', format:'a4', orientation:'portrait' })` — so all PDF tests pass. But this helper is declared "THE ONE shared jsdom env for the PDF tests," i.e. the contract every current and future PDF test depends on. If pdf-export ever switches to (or adds a code path using) positional construction, the wrapper would silently drop `unit`/`format`, the PDF would render at the wrong size, and the deterministic-hash and geometry assertions would fail with a confusing, hard-to-localize signal rather than at the obvious call site.
**Fix:** Forward all arguments through the wrapper:
```js
function WrappedJsPDF() {
  var doc = new (Function.prototype.bind.apply(OriginalJsPDF, [null].concat([].slice.call(arguments))))();
  doc.setCreationDate(PINNED_DATE);
  doc.setFileId(PINNED_FILE_ID);
  ...
}
```
(or, on the Node version in use, `Reflect.construct(OriginalJsPDF, [].slice.call(arguments))`).

### Info

#### IN-01: Dead variables left behind by the env-extraction refactor in 6 modified test files

**File:** `tests/pdf-bold-rendering.test.js:58,62,70,71`; `tests/pdf-digit-order.test.js:47,51,61,62`; `tests/pdf-glyph-coverage.test.js:58,62,107,108`; `tests/quick-260522-iwr-ordered-list-export.test.js:50,54,58,59`; `tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js:69,73,77,78`; `tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js:74,78,82,83`
**Issue:** When the inline `buildJsdomEnv` (which read assets via `fs`/`REPO_ROOT` and applied the pins via `PINNED_DATE`/`PINNED_FILE_ID`) was extracted into `jsdom-pdf-env.js`, the now-unused declarations `var fs = require('fs')`, `var REPO_ROOT = path.resolve(...)`, `var PINNED_DATE`, and `var PINNED_FILE_ID` were left in each of these six files. `path` survives only to compute the otherwise-unused `REPO_ROOT`. They are harmless under `'use strict'` but are confusing residue that implies the pins/asset-reads still happen locally when they no longer do. (`pdf-latin-regression.test.js` legitimately still uses all four, so it is correctly excluded.)
**Fix:** Remove the unused `fs`, `path`/`REPO_ROOT`, `PINNED_DATE`, and `PINNED_FILE_ID` declarations from the six files above; import `PINNED_DATE`/`PINNED_FILE_ID` from the helper only where actually referenced.

#### IN-02: `run-all.js` doc block overstates the JSDOM_PATH bridge scope ("8 legacy jsdom tests")

**File:** `tests/run-all.js:15-22`
**Issue:** The header states the bridge exists for "the 8 legacy jsdom tests [that] resolve jsdom via `process.env.JSDOM_PATH || '/tmp/node_modules/jsdom'`." After this phase migrated the seven PDF/quick tests to the shared `require('jsdom')` helper, only ONE file (`tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js`) still consumes `JSDOM_PATH`. The bridge remains load-bearing for that one file, but the comment now misrepresents the count and could mislead a future maintainer into thinking the bridge is more broadly depended-upon than it is.
**Fix:** Update the comment to reflect that exactly one legacy test (`q8m`) now relies on the `JSDOM_PATH` fallback, and that the migrated PDF tests resolve jsdom directly via the shared helper.

#### IN-03: New `30-*` async test IIFEs have no top-level rejection handler

**File:** `tests/30-export-markdown.test.js:154,304`; `tests/30-export-stepper.test.js:169,274`; `tests/30-issue-delta.test.js:189,348`; `tests/30-section-visibility.test.js:144,210`; `tests/30-settings-section-roundtrip.test.js:167,261`; `tests/30-settings-tabnav.test.js:121,209`
**Issue:** Each file runs `(async function () { ... })();` with no trailing `.catch(...)`. The per-case `test()` wrapper catches case-level errors, but a throw OUTSIDE a case — e.g. in `buildEnv()` invoked at the top of a case before its first `await`, or in the `EXPECTED_COUNT` guard block — would escape as an unhandled rejection. On Node 22 that still exits non-zero (so `run-all.js` records a FAIL), but it prints an `UnhandledPromiseRejection` stack instead of the clean `F-A GUARD FAILED` / per-case diagnostic the files otherwise produce. The PDF tests already do this correctly via `main().catch(...)`; the `30-*` files are inconsistent.
**Fix:** Append `.catch(function (e) { console.error(e); process.exit(1); });` to each top-level async IIFE for a clean, attributable failure.

---

_Reviewed: 2026-06-26T22:40:53Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
