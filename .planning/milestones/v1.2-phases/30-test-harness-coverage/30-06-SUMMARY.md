---
phase: 30-test-harness-coverage
plan: 06
subsystem: testing
tags: [jsdom, characterization, add-session, severity-delta, app-stub, mock-portfolio-db]

# Dependency graph
requires:
  - "30-02: tests/_helpers/app-stub.js (createAppStub overrides accept the REAL severity pair) + tests/_helpers/mock-portfolio-db.js (addSession write-spy + assertNoWrites)"
provides:
  - "tests/30-issue-delta.test.js — executing characterization of add-session issue management (severity before→after delta via the REAL App.createSeverityScale widget; addSession issues payload shape via the #sessionForm submit seam; empty-row validation block)"
affects: [31]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Real-coupled-widget injection: eval assets/app.js FIRST (side-effect-free `window.App = (()=>{})()` IIFE), grab the REAL createSeverityScale/getSeverityValue, inject via createAppStub overrides so updateDelta is reachable through observable DOM clicks (F-B)"
    - "Submit-seam payload characterization: fire the real #sessionForm submit and assert mockDb.__calls.get('addSession')[0][0].issues rather than calling getIssuesPayload directly (F-D)"

key-files:
  created: [tests/30-issue-delta.test.js]
  modified: []

key-decisions:
  - "Both plan tasks share ONE file and ONE end-of-file assertion-count guard (EXPECTED_COUNT=5), so they were committed as a single atomic test commit — splitting would leave an intermediate state whose count guard fails (3 != 5)"
  - "The no-change (delta-0) case first establishes a visible +2 delta, THEN equalizes before/after, so the assertion proves an ACTIVE hide-on-zero toggle rather than a never-shown element"
  - "Eval app.js in the SAME page window as add-session.js (not a throwaway window) so the severity widget's createElement uses the same document and its nodes can be appended into the add-session DOM"

patterns-established:
  - "Pattern: inject a REAL coupled widget pair from app.js through the app-stub overrides while leaving the rest of App.* stubbed — keeps an observable DOM path reachable without going fully real"

requirements-completed: [TEST-03]

coverage:
  - id: D1
    description: "Severity before→after delta driven by CLICKING the real App.createSeverityScale widget: +4/delta-positive/visible, -4/delta-negative/visible, and hidden-on-zero"
    requirement: "TEST-03"
    verification:
      - kind: behavior
        ref: "node tests/30-issue-delta.test.js -> cases A/B/C pass; falsified by swapping afterValue-beforeValue operands (A+B FAIL), reverted green"
        status: pass
    human_judgment: false
  - id: D2
    description: "addSession issues payload shape observed via the real #sessionForm submit seam after one add + one remove: exactly [{name:'Anxiety', before:8, after:3}]"
    requirement: "TEST-03"
    verification:
      - kind: behavior
        ref: "node tests/30-issue-delta.test.js -> case D asserts mockDb.__calls.get('addSession')[0][0].issues"
        status: pass
    human_judgment: false
  - id: D3
    description: "Empty (nameless) issue row blocks submission: App.showToast('toast.issueMissing') + assertNoWrites"
    requirement: "TEST-03"
    verification:
      - kind: behavior
        ref: "node tests/30-issue-delta.test.js -> case E asserts showToast call + no addSession write"
        status: pass
    human_judgment: false
  - id: D4
    description: "Full suite stays green with the new file (no green test turned red)"
    requirement: "TEST-03"
    verification:
      - kind: integration
        ref: "npm test -> 'Suite: 94 passed, 0 failed, 94 total'; exit 0"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-06-26
status: complete
---

# Phase 30 Plan 06: Issue Severity Delta + Payload Characterization Summary

**An executing jsdom real-page test (`tests/30-issue-delta.test.js`) that pins the uncovered issue-management region of `add-session.js` (lines 502-675) before the Phase 31 refactor — driving the REAL `App.createSeverityScale` widget by click to assert the observable before→after delta, observing the `addSession` issues payload through the real `#sessionForm` submit seam, and proving an empty issue row blocks the write.**

## Performance

- **Duration:** ~4 min
- **Tasks:** 2 (both in one file)
- **Files created:** 1 (tests/30-issue-delta.test.js)

## Accomplishments
- **Task 1 — severity delta (F-B):** Eval `assets/app.js` first to obtain the REAL coupled `createSeverityScale`/`getSeverityValue` pair, inject it via `createAppStub` overrides, and drive `updateDelta` ONLY by clicking the real `.severity-button`s (their click fires `onChange` → `updateDelta`). Asserts the observable `deltaEl` across three cases: positive (before 2 → after 6 ⇒ `"+4"`, `delta-positive`, visible), negative (6 → 2 ⇒ `"-4"`, `delta-negative`, visible), and no-change (establish a visible +2, then equalize ⇒ `display === "none"`).
- **Task 2 — payload + validation (F-D):** Wire `createMockPortfolioDB`, fire the real `#sessionForm` submit, and assert the payload SHAPE on `mockDb.__calls.get('addSession')[0][0].issues`. The valid case adds a second row, fills it, then removes it, proving the removed row is absent and the survivor persists as exactly `{name:'Anxiety', before:8, after:3}`. The empty case (single nameless row) asserts BOTH `App.showToast('toast.issueMissing')` AND `assertNoWrites(mockDb)`.
- **F-A (no vacuous green):** captures the async `DOMContentLoaded` handler (25-06 docListeners pattern), `await`s it, `settle()`s the microtask/timer queue after each async-driven event, and ends with an `assert.strictEqual(passed + failed, 5)` count guard.
- **Falsifiability proven:** swapping `afterValue - beforeValue` → `beforeValue - afterValue` fails the positive AND negative cases; reverting returns all 5 to green (D-08/D-12 — survives an internal rename, fails on an observable change).

## Task Commits

1. **Tasks 1 + 2 (one file, shared count guard): issue severity delta + addSession payload + empty-row validation** - `a1ac30a` (test)

## Files Created/Modified
- `tests/30-issue-delta.test.js` (NEW, TEST-03e) — jsdom real-page characterization: REAL severity widget delta + addSession payload via the submit seam + empty-row validation. 5 cases, exits 0.

## Decisions Made
- Committed both plan tasks as one `test(...)` commit because they share a single file and a single end-of-file assertion-count guard; an intermediate Task-1-only state would fail its own `EXPECTED_COUNT` guard.
- The no-change case first shows a +2 delta, then equalizes, so it proves an active hide-on-zero toggle, not a never-rendered element.
- Eval `app.js` in the SAME window as `add-session.js` so the severity widget's `document.createElement` targets the page document and its nodes append cleanly.

## Deviations from Plan
None - plan executed exactly as written. (Task 1 and Task 2 were committed together because the plan places both in one file with one shared `EXPECTED_COUNT` guard; this is the smallest committable atomic unit.)

## Issues Encountered
None.

## User Setup Required
None - test-only file under `tests/`; no production change, no external service.

## Next Phase Readiness
- The add-session issue-management observable behavior (delta wiring, payload assembly, validation gate) is now pinned as part of the Phase 31 pre-refactor green baseline.
- **Stub-masking limitation (F-J):** aside from the real severity pair, the surrounding App surface is stubbed and `initCommon` is a no-op, so green here guards the issue-management ORCHESTRATION — not that every therapist-visible label is correct. The Phase 31 D-13c glue cleanup could regress unrelated real output while this test stays green.
- No `assets/*` production file was modified. No blockers.

---
*Phase: 30-test-harness-coverage*
*Completed: 2026-06-26*

## Self-Check: PASSED
- Created file present: tests/30-issue-delta.test.js
- Task commit present in git history: a1ac30a
