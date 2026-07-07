---
phase: 38-next-session-date-field-with-overview-column
plan: 01
subsystem: testing
status: complete
tags: [tdd, red-gate, date-engine, add-session, overview, tz-pinned]
requirements: [NEXT-01, NEXT-02, NEXT-05, NEXT-08]
dependency_graph:
  requires:
    - assets/date-format.js (window.DateFormat.parseLocal / todayLocalISO — shipped Phase 37)
    - assets/add-session.js (real page module booted under jsdom)
    - tests/_helpers/mock-portfolio-db.js
    - tests/_helpers/app-stub.js
  provides:
    - tests/38-next-session.test.js (RED gate for the #nextSessionDate field — flips GREEN at Plan 38-04)
    - tests/38-next-overdue.test.js (GREEN boundary lock for the overview overdue cue — gates Plans 38-05/06)
  affects:
    - Plan 38-04 (field wiring must satisfy the next-session RED spec)
    - Plans 38-05/06 (overview overdue cue must satisfy the strictly-before-today boundary)
tech_stack:
  added: []
  patterns:
    - "jsdom real-page boot mirroring tests/30-form-dirty-revert.test.js (capture the single async DOMContentLoaded handler; inject app-stub + store-backed mock DB)"
    - "TZ re-exec pin + getTimezoneOffset self-check inert-guard mirroring tests/37-date-format.test.js"
    - "count-guard at end-of-file to trap silently-skipped async cases"
key_files:
  created:
    - tests/38-next-session.test.js
    - tests/38-next-overdue.test.js
  modified: []
decisions:
  - "38-01: next-session field spec is RED-by-design via a clean field-existence assertion first — the harness boots the real add-session.js and reaches the assertion, so RED means 'field not wired' (Plan 38-04), never a harness error"
  - "38-01: overdue-boundary spec authored as an inline pure-logic predicate over the shipped window.DateFormat (no named shared overdue helper exists in the phase artifacts) — GREEN today, locking the strictly-before-today rule as a gate for the Wave 2 overview cue"
  - "38-01: min-absent assertion (min REMOVED when session date empty) chosen over a min-value check so a mistaken min=today implementation is rejected (D-08)"
metrics:
  duration: ~20min
  tasks: 2
  files: 2
  completed: 2026-07-07
---

# Phase 38 Plan 01: Next-Session Field RED Gates Summary

Authored the two Wave-1 falsifiable behavior tests that gate the next-session field logic BEFORE any implementation: the add-session field spec (save/populate/reset + dynamic `min`, NEXT-01/02) and the TZ-pinned overdue-boundary spec (strictly-before-today, NEXT-05/08).

## What Was Built

### Task 1 — `tests/38-next-session.test.js` (RED-by-design, commit 089aa92)
Boots the REAL `assets/add-session.js` against a jsdom `add-session.html` page (mirrors the `tests/30-form-dirty-revert.test.js` harness: eval `app.js` for the real severity pair, capture the single async `DOMContentLoaded` handler, inject the app-stub + store-backed mock DB, eval `export-modal.js` → `date-format.js` → `add-session.js`). Five cases assert the four required behaviors against real module output:
- **POPULATE (with key):** editing a session with `nextSessionDate` sets `#nextSessionDate.value` to the stored `YYYY-MM-DD`.
- **POPULATE (missing key):** a session lacking the key leaves the field empty and does not crash the boot (the `trappedEmotions`-populated precondition proves populate ran to completion before the field assert).
- **RESET:** a new session leaves `#nextSessionDate.value === ""`.
- **SAVE:** driving the real `submit` persists `session.nextSessionDate` into the `PortfolioDB.addSession` payload.
- **DYNAMIC MIN:** `#nextSessionDate.min === #sessionDate.value`; emptying the session date REMOVES the `min` attribute (not `min=today`); a change re-applies it.

All five fail today on a clean field-existence assertion (`#nextSessionDate` does not exist until Plan 38-04) — `node tests/38-next-session.test.js` exits **1** (RED), satisfying the plan verify `test $? -ne 0`. Dates are constructed via `window.DateFormat.todayLocalISO()` — no `new Date("YYYY-MM-DD")`.

### Task 2 — `tests/38-next-overdue.test.js` (GREEN boundary lock, commit c6e16fa)
Pins `TZ=America/New_York` via child re-exec and guards it with a `getTimezoneOffset()===240` (EDT) self-check that aborts FATAL if the pin is inert (mirrors `tests/37-date-format.test.js:27-49`). Loads the shipped `window.DateFormat` into a vm sandbox and locks the exact overview predicate from 38-UI-SPEC §2 (`parseLocal(nextSessionDate) < todayLocal`, strict): overdue TRUE for yesterday, FALSE for today (boundary), FALSE for tomorrow, never for empty/null/undefined. "Today" is derived via `todayLocalISO()` + `parseLocal`, never a UTC `toISOString` slice. `node tests/38-next-overdue.test.js` exits **0** (GREEN — the engine already works) and locks the rule for the Wave-2 overview cue.

## Falsifiability (mutation-verified)
- **Overdue predicate `<` → `<=`** (today-inclusive): the today-boundary case FAILS (4 passed / 1 failed, exit 1). The strictly-before rule is genuinely guarded.
- **Inert TZ** (forced to UTC): the self-check aborts `FATAL: TZ pin failed — expected EDT offset 240 … got 0`, non-zero exit. The inert-guard is non-vacuous.
- **Next-session field spec:** all five cases boot the real module and fail only at the field-existence assertion — proving it is a behavior RED, not a load/syntax error.

## Deviations from Plan

None — plan executed exactly as written. The overdue predicate was authored inline (pure logic over the shipped `DateFormat`) per the plan's explicit action guidance, since the phase artifacts define no named shared overdue helper; this yields a GREEN boundary-lock rather than a RED, which the plan's Task-2 verify (`[ $EC -eq 0 ] || grep assert|fail`) and acceptance criteria explicitly allow.

## Verification
- `node tests/38-next-session.test.js` → exit 1 (RED, 0/5) — reaches assertions, not a harness error. ✓ (verify `test $? -ne 0`)
- `node tests/38-next-overdue.test.js` → exit 0 (GREEN, 5/5); plan verify command (`grep America/New_York && grep today && exit-0-or-assert`) → PASS. ✓
- Both files auto-discovered by `tests/run-all.js` (top-level `tests/*.test.js`). ✓
- Neither file weakened to green; the next-session file is RED-by-design and flips GREEN when Plan 38-04 wires the field. ✓

## Self-Check: PASSED
- FOUND: tests/38-next-session.test.js
- FOUND: tests/38-next-overdue.test.js
- FOUND: commit 089aa92 (test 38-01 next-session field spec)
- FOUND: commit c6e16fa (test 38-01 overdue-boundary spec)
