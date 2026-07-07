---
phase: 38-next-session-date-field-with-overview-column
plan: 09
subsystem: ui
tags: [validation, i18n, date-input, add-session, badInput]

# Dependency graph
requires:
  - phase: 38-04
    provides: nextSessionDate wired end-to-end in saveSessionForm (save/add/populate/reset/snapshot)
  - phase: 38-03
    provides: next-session i18n keys across EN/HE/DE/CS (four-language key pattern)
provides:
  - Partial next-session date save guard — blocks a silent data-loss save when validity.badInput is true
  - Pure isNextSessionDateIncomplete(el) exposed via window.__addSessionTestHooks
  - toast.nextSessionDateIncomplete key in all 4 locales
affects: [add-session, next-session-date, uat-test-5]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure validity-only guard (badInput) unit-tested via stubbed element — falsifiable RED-first where jsdom/Chromium cannot raise native badInput"

key-files:
  created:
    - tests/38-next-session-partial-guard.test.js
  modified:
    - assets/add-session.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js

key-decisions:
  - "Guard keys STRICTLY on validity.badInput, never on value emptiness — empty is a legal optional date and must save"
  - "Single placement at the saveSessionForm persist choke point covers both submit and save-then-export paths"

patterns-established:
  - "Pure guard over element.validity, unit-tested with stubbed validity objects because native badInput cannot be machine-simulated in jsdom/Chromium (real-Safari field-verify)"

requirements-completed: [NEXT-01, NEXT-08]

coverage:
  - id: D1
    description: "toast.nextSessionDateIncomplete key present and non-empty in all 4 locales (en/he/de/cs), i18n parity intact"
    requirement: "NEXT-01"
    verification:
      - kind: unit
        ref: "tests/25-11-i18n-parity.test.js#Every key in i18n-en.js exists in he/de/cs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Pure guard isNextSessionDateIncomplete(el) blocks on validity.badInput=true, allows empty/complete/null; exposed via __addSessionTestHooks"
    requirement: "NEXT-08"
    verification:
      - kind: unit
        ref: "tests/38-next-session-partial-guard.test.js (5 cases, all pass)"
        status: pass
    human_judgment: false
  - id: D3
    description: "End-to-end: a partial typed next-session date in real Safari blocks Save/Update with the localized toast and does NOT persist the session without the date; empty and complete dates save normally; HE RTL toast reads naturally"
    requirement: "NEXT-01"
    verification:
      - kind: manual_procedural
        ref: "Real Safari (installed/served app) — badInput cannot be raised in jsdom/Chromium"
        status: unknown
    human_judgment: true
    rationale: "validity.badInput is set only by the browser's native date parser from real keyboard segment entry; jsdom and Chromium cannot raise it, so the end-to-end block behavior must be field-verified in real Safari"

# Metrics
duration: 8min
completed: 2026-07-07
status: complete
---

# Phase 38 Plan 09: Partial Next-Session Date Save Guard Summary

**Blocks the silent data-loss save (UAT test 5) when a partially typed next-session date reports validity.badInput — a pure guard wired into the single saveSessionForm persist choke point plus a 4-language toast.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-07T06:30:00Z
- **Completed:** 2026-07-07T06:38:00Z
- **Tasks:** 2
- **Files modified:** 6 (5 modified, 1 created)

## Accomplishments
- Closed UAT test 5 / NEXT-01: a one-segment (partial) date edit no longer persists "" while firing a success toast — it now BLOCKS the save and surfaces a localized message.
- Added a pure, unit-tested guard `isNextSessionDateIncomplete(el)` that keys strictly on `validity.badInput`; empty (legal optional date) and complete dates still save unchanged.
- Shipped `toast.nextSessionDateIncomplete` in all 4 locales (en/he/de/cs) with parity intact.
- Extended the NEXT-08 falsifiable-test discipline: RED-first test drives the extracted pure guard directly, since jsdom/Chromium cannot raise native badInput.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add toast.nextSessionDateIncomplete key in all 4 languages** - `4fd38eb` (feat)
2. **Task 2 (RED): Falsifiable guard test** - `d09e342` (test)
3. **Task 2 (GREEN): Pure guard + save-path integration** - `3723047` (feat)

_TDD task: RED (failing test) → GREEN (implementation)._

## Files Created/Modified
- `tests/38-next-session-partial-guard.test.js` - RED-first unit test of the pure guard (BLOCK on badInput; ALLOW empty/complete/null); documents why jsdom cannot simulate native badInput.
- `assets/add-session.js` - Pure `isNextSessionDateIncomplete(el)` next to the existing test hooks (extended `__addSessionTestHooks`); guard wired into `saveSessionForm()` at the single persist choke point (validate → toast → return null) before the nextSessionDate read.
- `assets/i18n-en.js` / `i18n-he.js` / `i18n-de.js` / `i18n-cs.js` - New `toast.nextSessionDateIncomplete` key after `toast.heartShieldRequired`.

## Decisions Made
- Guard keys STRICTLY on `validity.badInput`, never on value emptiness — an empty next-session date is a legal optional value and must always save (asserted by Test 2 as a falsifiability trap against a "block whenever empty" mistake).
- Single guard placement inside `saveSessionForm()` (the sole DB-persist choke point for both addSession and updateSession) covers both the submit handler and the save-then-export trigger; `snapshotFormState()` (revert-only, no DB write) and export-modal reads (post-successful-save only) are intentionally NOT guarded.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None.

## Human Field-Verification Required
The end-to-end block behavior (D3) cannot be machine-verified — `validity.badInput` is raised only by the browser's native date parser from real keyboard segment entry, which jsdom and Chromium cannot reproduce. In real Safari (installed/served app): open an existing session, edit `#nextSessionDate` by typing only ONE segment → Save/Update must be BLOCKED with the localized toast and the session must NOT save without the date; a COMPLETE date saves normally; CLEARING the field saves normally (empty allowed); repeat once in Hebrew UI to confirm the RTL toast reads naturally.

## Next Phase Readiness
- UAT test 5 / NEXT-01 closed at the code level; awaiting the real-Safari field check above before marking the UAT item fully resolved.
- Full suite green (128 files, 0 failures); i18n parity intact.

## Self-Check: PASSED
- FOUND: tests/38-next-session-partial-guard.test.js
- FOUND: assets/add-session.js, i18n-en/he/de/cs.js
- FOUND commits: 4fd38eb, d09e342, 3723047

---
*Phase: 38-next-session-date-field-with-overview-column*
*Completed: 2026-07-07*
