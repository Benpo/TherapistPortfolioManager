---
phase: 30-test-harness-coverage
plan: 02
subsystem: testing
tags: [jsdom, jspdf, test-helper, stub, spy, app-stub]

# Dependency graph
requires:
  - "30-01: installed jsdom devDependency + npm test runner (top-level-only discovery, so tests/_helpers/ is never executed as tests)"
provides:
  - "tests/_helpers/jsdom-pdf-env.js — buildJsdomEnv() shared jsdom+jsPDF env with getContext->null stub and per-instance date/fileId pinning (D-04, TEST-01)"
  - "tests/_helpers/app-stub.js — createAppStub(overrides) App.* surface with __calls spy, resolving initCommon, no-op installNavGuard, severity pair left UNstubbed (D-09, TEST-03)"
affects: [30-03, 30-04, 30-05, 30-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared jsdom PDF env: require('jsdom') directly (node_modules), getContext->null before eval, WrappedJsPDF per-instance pinning"
    - "App.* test double mirrors mock-portfolio-db __calls Map-of-arg-arrays spy shape; async-landmine-safe initCommon"

key-files:
  created: [tests/_helpers/jsdom-pdf-env.js, tests/_helpers/app-stub.js]
  modified: []

key-decisions:
  - "jsdom-pdf-env resolves jsdom via require('jsdom') (node_modules), dropping the legacy JSDOM_PATH=/tmp fallback now that 30-01 installed it as a devDependency"
  - "Deterministic pins (setCreationDate/setFileId) applied on each jsPDF INSTANCE via WrappedJsPDF, not on the prototype — jsPDF installs its API as own props per instance (PATTERNS line 52)"
  - "createAppStub leaves createSeverityScale/getSeverityValue UNDEFINED by default (F-B); the real coupled pair is supplied via overrides by the 30-06 issue-delta test so updateDelta stays reachable through observable DOM"
  - "initCommon returns a resolved Promise and installNavGuard is a no-op — the two async-handler landmines that would otherwise hang or abort the real-page DOMContentLoaded handlers"
  - "Added an optional onJsPDF hook to buildJsdomEnv so the doc.text() row-baseline probe can stay in the consuming test, keeping the shared helper minimal"

patterns-established:
  - "Pattern: one shared jsdom env the 7 broken PDF tests adopt to acquire the getContext->null fix (30-03)"
  - "Pattern: spy-instrumented App.* double whose __calls surface lets real-page god-module tests assert observable side effects without per-test re-stubbing"

requirements-completed: [TEST-01, TEST-03]

coverage:
  - id: D1
    description: "buildJsdomEnv() returns { dom, win } with getContext stubbed to null and the jsPDF global defined, sourced from the installed jsdom devDependency"
    requirement: "TEST-01"
    verification:
      - kind: unit
        ref: "node -e assert(dom&&win, getContext()===null, win.jspdf||win.jsPDF) -> 'ok'; exit 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "Helper acquires jsdom via require('jsdom') (node_modules), not any /tmp path"
    requirement: "TEST-01"
    verification:
      - kind: unit
        ref: "grep require('jsdom') tests/_helpers/jsdom-pdf-env.js -> present; no /tmp path"
        status: pass
    human_judgment: false
  - id: D3
    description: "createAppStub() exposes the full grep-verified App.* surface; getSeverityValue/createSeverityScale undefined by default (F-B); initCommon resolves; spy records args"
    requirement: "TEST-03"
    verification:
      - kind: unit
        ref: "node -e assert(typeof t==='function', getSeverityValue===undefined, createSeverityScale===undefined, initCommon() instanceof Promise, __calls.get('showToast').length===1) -> 'ok'; exit 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "Real severity pair injectable via overrides; t supports key-passthrough and map override"
    requirement: "TEST-03"
    verification:
      - kind: unit
        ref: "node -e createAppStub({t:{hello:'world'},createSeverityScale:sev,getSeverityValue:sev}) -> t('hello')==='world', t('missing')==='missing', pair===sev -> 'overrides ok'"
        status: pass
    human_judgment: false
  - id: D5
    description: "npm test still green; new helpers are not *.test.js so the runner never executes them"
    requirement: "TEST-03"
    verification:
      - kind: integration
        ref: "npm test -> 'Suite: 87 passed, 0 failed, 87 total'; exit 0"
        status: pass
    human_judgment: false

# Metrics
duration: 2min
completed: 2026-06-26
status: complete
---

# Phase 30 Plan 02: Shared Test Helpers Summary

**Two test-only helpers — `jsdom-pdf-env.js` (the one shared jsdom+jsPDF env that bakes in the `getContext→null` fix the 7 broken PDF tests are missing) and `app-stub.js` (a spy-instrumented `App.*` double whose `initCommon` resolves and whose severity pair is deliberately left to real app.js) — that make Phase 30's "go broad" feasible without per-test re-stubbing.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-26T21:40:44Z
- **Completed:** 2026-06-26T21:42:29Z
- **Tasks:** 2
- **Files created:** 2 (tests/_helpers/jsdom-pdf-env.js, tests/_helpers/app-stub.js)

## Accomplishments
- Extracted the inline `buildJsdomEnv` from the already-green `quick-260620-q8m` reference into `tests/_helpers/jsdom-pdf-env.js`, exporting `buildJsdomEnv()` → `{ dom, win }`. It stubs `HTMLCanvasElement.prototype.getContext`→null before any eval (the exact fix the 7 broken PDF tests lack), evals jspdf/bidi/heebo/pdf-export in order, and pins `setCreationDate`/`setFileId` per jsPDF instance via a `WrappedJsPDF` wrapper. It resolves jsdom via `require('jsdom')` (node_modules), retiring the fragile `/tmp` `JSDOM_PATH` convention.
- Built `tests/_helpers/app-stub.js` exporting `createAppStub(overrides)` — an `App`-shaped double mirroring the `mock-portfolio-db.js` `__calls` Map-of-arg-arrays spy, exposing the full grep-verified surface (`t`, `getSectionLabel`, `showToast`, `formatDate`, `applyTranslations`, `confirmDialog`, `isSectionEnabled`, `getLanguage`, `setLanguage`, `unlockBodyScroll`, `lockBodyScroll`, `setSubmitLabel`, `readFileAsDataURL`, `initBirthDatePicker`, `formatSessionType`, `installNavGuard`).
- Handled both async-handler landmines: `initCommon()` returns an already-resolved Promise (so the real pages' `await App.initCommon()` does not hang) and `installNavGuard` is a no-op.
- Honored F-B: `createSeverityScale`/`getSeverityValue` are left `undefined` by default and only enter the stub when the consuming test passes the REAL coupled pair via `overrides`, keeping the issue-delta path reachable through observable DOM.
- Documented the downstream consumption contract in the helper doc block (BroadcastChannel no-op stub, the 25-06 docListeners capture-and-await pattern instead of a blanket `dispatchEvent`, severity pair via overrides).

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract the shared jsdom PDF env helper (D-04)** - `6d7564b` (feat)
2. **Task 2: Build the reusable App.* stub with a spy surface (D-09)** - `88bcf39` (feat)

## Files Created/Modified
- `tests/_helpers/jsdom-pdf-env.js` - Shared jsdom+jsPDF env: `buildJsdomEnv()` → `{ dom, win }`; getContext→null stub; jspdf/bidi/heebo/pdf-export eval; per-instance date/fileId pinning; optional `onJsPDF` spy hook.
- `tests/_helpers/app-stub.js` - `createAppStub(overrides)` App.* double with `__calls` spy; resolving `initCommon`; no-op `installNavGuard`; severity pair UNstubbed (F-B); `t` key-passthrough/map/function override support.

## Decisions Made
- Resolve jsdom via `require('jsdom')` from node_modules (30-01 installed it), dropping the legacy `JSDOM_PATH=/tmp` fallback — this is the post-30-01 convention.
- Apply deterministic pins on each jsPDF INSTANCE via `WrappedJsPDF`, never on the prototype, because jsPDF installs its API methods as own properties per instance (PATTERNS line 52).
- Leave the severity pair undefined by default (F-B) and source the REAL pair via `overrides` in 30-06 — a label→number stub would make `updateDelta` unreachable through observable DOM.
- Added an optional `onJsPDF` hook to `buildJsdomEnv` so the row-baseline `doc.text()` probe (the 260620-q8m behavior check) stays in the consuming test, keeping the shared helper minimal.

## Deviations from Plan
None - plan executed exactly as written. (The `onJsPDF` hook is an additive, optional, non-behavioral seam the plan's "keep the surface minimal; export buildJsdomEnv (and if convenient the pinned constants)" guidance permits; `PINNED_DATE`/`PINNED_FILE_ID` are also exported per that note.)

## Issues Encountered
None.

## User Setup Required
None - test-only helpers under `tests/_helpers/`; no production change, no external service.

## Next Phase Readiness
- `jsdom-pdf-env.js` is ready for 30-03 to migrate the 7 broken PDF tests (delete inline `buildJsdomEnv` + the `/tmp` block, `require` the helper, acquire the getContext fix).
- `app-stub.js` is ready for the TEST-03 real-page god-module tests in 30-04/05/06; the doc block records the BroadcastChannel stub, the docListeners capture-and-await pattern, and the severity-pair-via-overrides contract.
- No `assets/*` production file was modified. No blockers.

---
*Phase: 30-test-harness-coverage*
*Completed: 2026-06-26*

## Self-Check: PASSED
- All created files present (tests/_helpers/jsdom-pdf-env.js, tests/_helpers/app-stub.js, 30-02-SUMMARY.md)
- All task commits exist in git history (6d7564b, 88bcf39)
