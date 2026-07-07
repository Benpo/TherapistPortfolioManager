---
phase: 30-test-harness-coverage
plan: 03
subsystem: testing
tags: [jsdom, jspdf, pdf-export, rtl, i18n, setLanguage, test-helper]

# Dependency graph
requires:
  - phase: "30-02"
    provides: "tests/_helpers/jsdom-pdf-env.js — buildJsdomEnv() shared jsdom+jsPDF env with getContext->null stub, per-instance date/fileId pinning, and an onJsPDF(doc) hook"
provides:
  - "7 PDF tests migrated onto the shared jsdom helper — getContext stub acquired, /tmp jsdom convention removed (TEST-01)"
  - "tests/30-rtl-guard.test.js — 4-locale automated guard over the REAL App.setLanguage dir code path; fails if dir=rtl is applied to a non-Hebrew locale (TEST-02, D-11)"
affects: [30-04, 30-05, 30-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PDF tests consume the shared jsdom-pdf-env helper (require + `.dom`) instead of an inline buildJsdomEnv + JSDOM_PATH=/tmp fallback"
    - "doc.text() capture wired via the helper's onJsPDF(doc) hook, preserving the { text, x, y, opts } record shape"
    - "RTL guard: load real app.js + real i18n dicts into a non-opaque-origin jsdom window, sweep locales through App.setLanguage, assert observable document.documentElement dir"

key-files:
  created: [tests/30-rtl-guard.test.js]
  modified:
    - tests/pdf-bold-rendering.test.js
    - tests/pdf-digit-order.test.js
    - tests/pdf-glyph-coverage.test.js
    - tests/pdf-latin-regression.test.js
    - tests/quick-260522-iwr-ordered-list-export.test.js
    - tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js
    - tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js

key-decisions:
  - "Deleted each PDF test's inline buildJsdomEnv + JSDOM_PATH env-fallback and adapted call sites to read `.dom` from the shared helper's { dom, win } return — faithful to the plan's 'call its exported buildJsdomEnv()' over a thin local shim"
  - "c8x/cx5 doc.text() capture migrated from the old captureText option to the helper's onJsPDF(doc) hook, wrapping the instance's text method to push the identical { text, x, y, opts } records (behavior unchanged)"
  - "RTL guard loads the REAL assets/i18n-*.js dictionaries so window.I18N[lang] is truthy for all 4 locales — exercising setLanguage's accepted-language branch, not the silent en fallback"
  - "RTL guard uses a non-opaque https://localhost/ jsdom origin so localStorage works; under a file:// origin jsdom throws 'localStorage is not available for opaque origins' and setLanguage's localStorage.setItem aborts"

patterns-established:
  - "Pattern: a broken PDF test adopts the shared helper by deleting its inline env and reading buildJsdomEnv().dom; the getContext->null fix and node_modules jsdom resolution come for free"
  - "Pattern: regression guards execute the real exported function from assets/* in jsdom and assert the rendered DOM attribute, with a documented source-mutation falsifiability proof"

requirements-completed: [TEST-01, TEST-02]

coverage:
  - id: D1
    description: "The 7 previously-unrunnable PDF tests run green via the shared jsdom helper — getContext stubbed, no /tmp jsdom dependency, no green test turned red"
    requirement: "TEST-01"
    verification:
      - kind: integration
        ref: "node tests/pdf-bold-rendering.test.js; node tests/pdf-digit-order.test.js; node tests/pdf-glyph-coverage.test.js; node tests/pdf-latin-regression.test.js; node tests/quick-260522-iwr-ordered-list-export.test.js; node tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js; node tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js -> all exit 0"
        status: pass
      - kind: other
        ref: "grep -rl '/tmp/node_modules/jsdom' over all 7 files -> no matches"
        status: pass
    human_judgment: false
  - id: D2
    description: "An automated RTL guard fails if dir=rtl is applied to a non-Hebrew locale (he->rtl, en/de/cs->ltr) by reading the observable document.documentElement dir after the real App.setLanguage"
    requirement: "TEST-02"
    verification:
      - kind: integration
        ref: "node tests/30-rtl-guard.test.js -> 5 passed, 0 failed, exit 0"
        status: pass
      - kind: other
        ref: "falsifiability: scratch copy with `currentLang !== \"en\"` -> de/cs flip to rtl, guard logic fails (2 cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full suite stays green and no assets/* production file modified"
    requirement: "TEST-01"
    verification:
      - kind: integration
        ref: "npm test -> 'Suite: 88 passed, 0 failed, 88 total'; git status shows no assets/* changes"
        status: pass
    human_judgment: false

# Metrics
duration: 13min
completed: 2026-06-26
status: complete
---

# Phase 30 Plan 03: PDF Test Migration + RTL Guard Summary

**The 7 broken PDF tests now run green by adopting the shared `jsdom-pdf-env` helper (getContext stubbed, /tmp jsdom convention retired), and a new 4-locale `30-rtl-guard.test.js` executes the real `App.setLanguage` dir path and fails if `dir="rtl"` ever reaches a non-Hebrew locale.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-06-26T23:43Z
- **Completed:** 2026-06-26T23:57Z
- **Tasks:** 2
- **Files modified:** 7 migrated + 1 created

## Accomplishments
- Migrated all 7 previously-unrunnable PDF tests (`pdf-bold-rendering`, `pdf-digit-order`, `pdf-glyph-coverage`, `pdf-latin-regression`, `quick-260522-iwr-ordered-list-export`, `quick-260608-c8x-...`, `quick-260608-cx5-...`) onto `tests/_helpers/jsdom-pdf-env.js`: each deletes its inline `buildJsdomEnv` + the `JSDOM_PATH || '/tmp/node_modules/jsdom'` fallback, `require`s the helper, and reads `buildJsdomEnv().dom`. Every original behavior assertion is untouched; the only functional change is acquiring the `getContext→null` stub. All 7 exit 0, the `Not implemented: HTMLCanvasElement's getContext()` stderr noise is gone, and no green test turned red (D-06).
- Rewired the `c8x`/`cx5` per-instance `doc.text()` capture from the old `captureText` buildJsdomEnv option onto the helper's `onJsPDF(doc)` hook, preserving the exact `{ text, x, y, opts }` record shape the assertions consume.
- Scrubbed every `/tmp/node_modules/jsdom` reference — including the doc-comment mentions in `pdf-glyph-coverage` and `pdf-latin-regression` — so the leak grep over all 7 files returns no matches.
- Added `tests/30-rtl-guard.test.js`: loads the real `assets/app.js` (exposing `window.App.setLanguage`) plus the real `assets/i18n-{en,he,de,cs}.js` dictionaries into a jsdom window, then sweeps all 4 locales asserting the observable `document.documentElement` `dir` — `he→rtl`, `en/de/cs→ltr`.
- Proved the guard's falsifiability: a scratch copy mutating `app.js:124` to `currentLang !== "en" ? "rtl" : "ltr"` flips `de` and `cs` to `rtl`, and the guard logic fails on exactly those 2 cases.

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate the 7 PDF tests onto the shared jsdom helper (TEST-01, D-04/D-06)** - `543d138` (test)
2. **Task 2: Add the RTL regression guard across 4 locales (TEST-02, D-11)** - `ffd72b0` (test)

## Files Created/Modified
- `tests/30-rtl-guard.test.js` (NEW) - 4-locale guard over the real `App.setLanguage` dir path; jsdom + real i18n dicts; falsifiability documented in the doc block.
- `tests/pdf-bold-rendering.test.js` - inline env → shared helper; call site reads `.dom`.
- `tests/pdf-digit-order.test.js` - inline env → shared helper; call site reads `.dom`.
- `tests/pdf-glyph-coverage.test.js` - inline env → shared helper; `/tmp` doc-comment scrubbed.
- `tests/pdf-latin-regression.test.js` - inline env → shared helper; `/tmp` doc-comment scrubbed; `deterministicDate` constant kept.
- `tests/quick-260522-iwr-ordered-list-export.test.js` - inline env → shared helper; 4 call sites read `.dom`.
- `tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js` - inline env → shared helper; capture via `onJsPDF` hook; plain call sites read `.dom`.
- `tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js` - inline env → shared helper; capture via `onJsPDF` hook.

## Decisions Made
- Adapted call sites to read `.dom` from the helper's `{ dom, win }` return rather than introducing a thin local `buildJsdomEnv` shim — this honors the plan's "delete the inline function and call its exported `buildJsdomEnv()`" instruction directly.
- Migrated the two capturing tests (`c8x`/`cx5`) onto the helper's `onJsPDF(doc)` seam (added in 30-02) rather than leaving them on inline envs — the hook reproduces the old per-instance `doc.text` wrap exactly, so consolidation kept all assertions intact.
- The RTL guard loads the real i18n dictionaries (not `{}` stubs) so `setLanguage` takes the requested language for every locale; a precondition test asserts all 4 dicts loaded, guarding against a silent fallback that would make the dir sweep meaningless.
- Switched the RTL guard's jsdom origin to `https://localhost/` because `setLanguage` persists `portfolioLang` to `localStorage`, which jsdom disables for opaque (`file://`) origins.

## Deviations from Plan
None - plan executed exactly as written. (The PDF helper's `onJsPDF(doc)` hook used for the c8x/cx5 capture, and the non-opaque jsdom origin for the RTL guard's localStorage, are mechanics the plan explicitly anticipated — "adapt the call site to the helper" and "prefer jsdom since the behavior is a DOM attribute".)

## Issues Encountered
- The RTL guard initially failed with "localStorage is not available for opaque origins": `setLanguage` calls `localStorage.setItem` and the first jsdom build used a `file://` URL. Resolved by constructing the jsdom window with a non-opaque `https://localhost/` origin, which enables jsdom's Storage. Not a deviation — a test-environment fix internal to the new test.

## User Setup Required
None - test-only changes under `tests/`; no production code modified, no external service.

## Next Phase Readiness
- TEST-01 and TEST-02 are closed; the shared helper is now proven in real consumers (the 7 migrated PDF tests), de-risking its reuse by 30-04/05/06.
- `app-stub.js` (from 30-02) remains ready for the TEST-03 real-page god-module tests in 30-04/05/06.
- No `assets/*` production file was modified. No blockers.

---
*Phase: 30-test-harness-coverage*
*Completed: 2026-06-26*

## Self-Check: PASSED
- All created/modified files present (tests/30-rtl-guard.test.js, 7 migrated PDF tests, 30-03-SUMMARY.md)
- Both task commits exist in git history (543d138, ffd72b0)
