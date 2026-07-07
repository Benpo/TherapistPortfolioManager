---
phase: 30-test-harness-coverage
plan: 04
subsystem: testing
tags: [jsdom, settings, characterization, round-trip, tab-nav, observable-behavior]

# Dependency graph
requires:
  - "30-02: tests/_helpers/app-stub.js (createAppStub — resolving initCommon, no-op installNavGuard, __calls spy) + the mock-portfolio-db __calls/assertNoWrites spy shape"
  - "30-01: installed jsdom devDependency + tests/run-all.js top-level-only discovery"
provides:
  - "tests/30-settings-section-roundtrip.test.js — executing observable round-trip over settings.js IIFE-1 (save persists, reload re-renders, discard reverts + assertNoWrites)"
  - "tests/30-settings-tabnav.test.js — executing observable tab-nav over settings.js IIFE-3 (?tab= select, URL write, invalid fallback)"
affects: [31]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "jsdom real-page god-module test: build JSDOM from the real settings.html, override document.addEventListener BEFORE eval to CAPTURE the 5 DOMContentLoaded handlers, then invoke ONLY the target IIFE handler by registration index (never a blanket dispatchEvent — F-F)"
    - "Round-trip mock: wrap mock-portfolio-db setTherapistSetting to mirror writes into the read store so a reload re-renders the saved value — a genuine round-trip while preserving the __calls spy + assertNoWrites"
    - "Falsifiable invalid-fallback: pre-activate a NON-default tab before boot so the fallback assertion fails if boot skips the reset (not a tautology against authored default markup)"

key-files:
  created: [tests/30-settings-section-roundtrip.test.js, tests/30-settings-tabnav.test.js]
  modified: []

key-decisions:
  - "Both tests jsdom-EXECUTE the real settings.js and assert observable output only (D-08): the persisted setTherapistSetting record, the re-rendered input value, the active-tab class/aria-selected, and window.location.search — never an internal function name. Verified falsifiable on an observable change and survives an internal rename (D-08/D-12)"
  - "Handler selection by registration index (IIFE-1 = index 0, IIFE-3 tab-nav = index 2) guarded by an assert that settings.js registers exactly 5 DOMContentLoaded handlers — drift fails loudly rather than driving the wrong handler (F-F)"
  - "Round-trip 'reload re-renders saved value' made genuine by mirroring writes into the read store; without the mirror the spy never reflects the save and the assertion would be a tautology"

requirements-completed: [TEST-03]

coverage:
  - id: D1
    description: "Editing a section title and Saving persists the edited value (observable setTherapistSetting record), and the reload re-renders it (round-trip)"
    requirement: "TEST-03"
    verification:
      - kind: integration
        ref: "node tests/30-settings-section-roundtrip.test.js -> 3 passed, 0 failed; exit 0"
        status: pass
      - kind: falsifiability
        ref: "scratch mutation dropping customLabel in onSave -> reloaded input empties -> test FAILS (probe EXPECTED FAIL)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Editing then Discarding reverts the input to the seeded value and writes nothing (assertNoWrites) — the onDiscard half (F-H)"
    requirement: "TEST-03"
    verification:
      - kind: integration
        ref: "discard case asserts reverted value === seed AND assertNoWrites(mockDb); exit 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "A valid ?tab= selects the matching tab; switching writes the new ?tab= to window.location.search; an invalid value falls back to the default — all via observable DOM/URL state"
    requirement: "TEST-03"
    verification:
      - kind: integration
        ref: "node tests/30-settings-tabnav.test.js -> 3 passed, 0 failed; exit 0"
        status: pass
      - kind: falsifiability
        ref: "scratch mutation making readUrlTab accept any value -> bogus tab honored, default not reset -> invalid-fallback test FAILS (probe EXPECTED FAIL)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Each test drives ONLY its target settings.js handler via the docListeners capture map; no blanket dispatchEvent boots the other 4 IIFEs (F-F)"
    requirement: "TEST-03"
    verification:
      - kind: unit
        ref: "buildEnv asserts captured.length === 5; round-trip invokes captured[0], tab-nav invokes captured[2]"
        status: pass
    human_judgment: false
  - id: D5
    description: "No assets/* production file modified; full suite stays green"
    requirement: "TEST-03"
    verification:
      - kind: integration
        ref: "npm test -> 'Suite: 90 passed, 0 failed, 90 total'; git status shows no assets/ or settings.html change"
        status: pass
    human_judgment: false

# Metrics
duration: 9min
completed: 2026-06-27
status: complete
---

# Phase 30 Plan 04: Settings Characterization (round-trip + tab-nav) Summary

**Two jsdom real-page characterization tests that EXECUTE the real `assets/settings.js` and pin its two genuinely-uncovered observable behaviors — the section-title save/load round-trip (IIFE-1, the documented TESTING.md gap) and the `?tab=` tab navigation (IIFE-3) — as the pre-refactor green baseline that guards the Phase 31 settings extraction.**

## Performance

- **Duration:** ~9 min
- **Tasks:** 2
- **Files created:** 2 (tests/30-settings-section-roundtrip.test.js, tests/30-settings-tabnav.test.js)

## Accomplishments
- `tests/30-settings-section-roundtrip.test.js` (TEST-03a, D-09): loads the real `settings.html` body + `assets/settings.js` into jsdom, injects the spy `PortfolioDB` mock + the `App.*` stub, and drives ONLY the IIFE-1 `DOMContentLoaded` handler (captured via the `docListeners` map). Asserts the save round-trip (the persisted `setTherapistSetting` record carries the edited value; the reload re-renders it), the discard revert (input reverts to seed + `assertNoWrites` — F-H), and a render precondition (9 rows, seeded label shown). The mock's `setTherapistSetting` is wrapped to mirror writes into the read store so the reload is a genuine round-trip.
- `tests/30-settings-tabnav.test.js` (TEST-03b): drives ONLY the IIFE-3 tab-nav `boot` (synchronous) and asserts the observable active-tab class + `aria-selected` + panel visibility for a valid `?tab=`, the `window.location.search` URL write on a tab switch, and the invalid-value fallback to the default tab (with a pre-activated non-default tab so the fallback assertion is falsifiable, not a tautology against the authored markup).
- Both tests assert OBSERVABLE output only (D-08) and were each verified falsifiable against a scratch mutation (dropping the saved `customLabel`; making `readUrlTab` accept any value) — they FAIL on an observable-output change and survive an internal rename (D-08/D-12).
- F-A vacuous-green guard: each file ends with `assert.strictEqual(passed + failed, EXPECTED_COUNT)` so an async run that skipped its cases cannot exit green. F-F: handler selection is index-based with a `captured.length === 5` assertion, so no blanket `dispatchEvent` boots the snippets/backups/photos IIFEs.

## Task Commits

1. **Task 1: Section-title save/load round-trip (TEST-03a)** — `bdb41e7` (test)
2. **Task 2: Settings tab navigation via ?tab= (TEST-03b)** — `80dad16` (test)

## Files Created/Modified
- `tests/30-settings-section-roundtrip.test.js` — jsdom real-page round-trip over settings.js IIFE-1; mirror-wrapped mock for a genuine save→reload; discard revert + assertNoWrites; F-A/F-F guards.
- `tests/30-settings-tabnav.test.js` — jsdom real-page observable tab-nav over settings.js IIFE-3; valid select / URL write / invalid fallback; F-A/F-F guards.

## Decisions Made
- Mirror writes into the mock read store so "reload re-renders the saved value" is a real round-trip rather than a tautology, while keeping the `__calls` spy + `assertNoWrites` intact.
- Select the target handler by registration index (0 = IIFE-1, 2 = IIFE-3) guarded by a `captured.length === 5` assertion — the only robust way to invoke exactly one of five anonymous `boot` handlers without booting (and risking flake from) the others (F-F).
- For the invalid-tab fallback, pre-activate a non-default tab before boot so the assertion exercises boot's fallback logic, not the authored default markup.

## Deviations from Plan
None — plan executed exactly as written. Both tasks delivered the specified files, the jsdom real-page approach, the F-A/F-F guards, and the observable-only assertions; falsifiability was verified per the acceptance criteria.

## Issues Encountered
None. The `getContext`/PDF env was not needed here (no PDF path); the App stub's resolving `initCommon` + no-op `installNavGuard` (from 30-02) were exactly the async-handler landmines the IIFE-1 path required.

## User Setup Required
None — test-only files under `tests/`; no production change, no external service.

## Next Phase Readiness
- settings.js now has a pre-refactor green baseline for IIFE-1 (fields save/load) and IIFE-3 (tab-nav) — the Phase 31 settings extraction (RFCT-01) is guarded against an observable regression in those two behaviors.
- IIFE-2 (snippets), IIFE-4 (backups), IIFE-5 (photos) remain pinned by the existing 24-xx/25-xx suite (D-10) and were not re-tested here. No `assets/*` production file was modified. No blockers.

---
*Phase: 30-test-harness-coverage*
*Completed: 2026-06-27*

## Self-Check: PASSED
- All created files present (tests/30-settings-section-roundtrip.test.js, tests/30-settings-tabnav.test.js, 30-04-SUMMARY.md)
- All task commits exist in git history (bdb41e7, 80dad16)
