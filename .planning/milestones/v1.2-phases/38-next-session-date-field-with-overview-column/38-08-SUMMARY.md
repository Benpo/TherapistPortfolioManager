---
phase: 38-next-session-date-field-with-overview-column
plan: 08
subsystem: ui
tags: [overview, sort, nextSession, localeCompare, jsdom]

# Dependency graph
requires:
  - phase: 38-next-session-date-field-with-overview-column
    provides: nextSession sort key + column-header/dropdown two-way sync (plans 38-05..38-07)
provides:
  - Revised nextSession blank-sort rule — blanks travel WITH the sort direction (bottom on ascending, top on descending) via a far-future sentinel, mirroring Last Session
  - Updated 37-overview-sort test 8 locking blanks-at-top under descending (9/9)
  - D-03-R1 decision-revision record across 38-CONTEXT.md, REQUIREMENTS.md NEXT-04 and NEXT-08
affects: [overview, sort, next-session]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Far-future sentinel (9999-12-31) substituted for blank sort keys so blanks ride the shared dir*base flip instead of early-returning"

key-files:
  created:
    - .planning/phases/38-next-session-date-field-with-overview-column/38-08-SUMMARY.md
  modified:
    - assets/overview.js
    - tests/37-overview-sort.test.js
    - .planning/phases/38-next-session-date-field-with-overview-column/38-CONTEXT.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "D-03-R1 (2026-07-07): blank next-dates travel WITH the sort direction — bottom on ascending, top on descending — superseding the original blanks-to-bottom-under-both-directions rule"
  - "Implemented via a 9999-12-31 far-future sentinel (NOT by deleting early returns and using bare localeCompare, which would float blanks to the TOP of the default ascending view)"

patterns-established:
  - "Sentinel-substituted sort key: blanks coerce to a lexically-largest value so they participate in the shared direction flip, mirroring how lastSession uses empty-string localeCompare"

requirements-completed: [NEXT-04, NEXT-08]

coverage:
  - id: D1
    description: "nextSession blank rows travel with the sort direction — bottom under ascending (default, Bob/Alice/Carol), top under descending (Carol/Alice/Bob), dated rows soonest/latest respectively"
    requirement: "NEXT-04"
    verification:
      - kind: unit
        ref: "tests/37-overview-sort.test.js#nextSession blank most-recent next-dates travel to the TOP under DESCENDING"
        status: pass
      - kind: unit
        ref: "tests/37-overview-sort.test.js#nextSession sort defaults ASCENDING with blank most-recent next-dates LAST"
        status: pass
    human_judgment: false
  - id: D2
    description: "Full 127-file suite stays green — no regression from the sort-branch rework"
    requirement: "NEXT-08"
    verification:
      - kind: unit
        ref: "node tests/run-all.js"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-03/NEXT-04/NEXT-08 source artifacts record the 2026-07-07 revision; no artifact still claims blanks pin to the bottom under both directions"
    verification:
      - kind: other
        ref: "grep travel/revised on 38-CONTEXT.md + REQUIREMENTS.md NEXT-04/NEXT-08; negative grep on stale sort-to-bottom clause"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-07-07
status: complete
---

# Phase 38 Plan 08: nextSession blank-sort revision (blanks travel with direction) Summary

**Reworked the Overview nextSession sort so blank next-date rows travel WITH the sort direction — bottom on ascending (default), top on descending — via a far-future 9999-12-31 sentinel, mirroring the Last Session toggle and closing Phase 38 UAT test 3.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-07T05:29:00Z
- **Completed:** 2026-07-07T05:37:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Removed the three early-return blank pins in the `nextSession` sort branch that bypassed the shared `dir * base` flip; blanks now sort as a `9999-12-31` sentinel so they ride the direction toggle.
- Ascending (default) resting view unchanged — dated rows soonest-first, blanks still last (no regression). Descending now floats blanks to the TOP with dated rows latest-first, so a lone dated row visibly moves when toggling (the UAT-3 complaint).
- Rewrote test 8 in `37-overview-sort.test.js` to lock `['Carol Clark','Alice Adams','Bob Brown']` under descending; file passes 9/9, full 127-file suite green.
- Recorded the decision revision (D-03-R1, 2026-07-07) in 38-CONTEXT.md and updated REQUIREMENTS.md NEXT-04 + NEXT-08 so no artifact still claims blanks pin to the bottom under both directions.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): lock blanks-travel-to-top test** - `a371812` (test)
2. **Task 1 (GREEN): far-future sentinel sort branch** - `9606893` (feat)
3. **Task 2: record D-03/NEXT-04/NEXT-08 revision** - `96490ba` (docs)

_TDD task 1 produced a test commit (RED) then a feat commit (GREEN); no refactor needed._

## Files Created/Modified
- `assets/overview.js` - nextSession sort branch: dropped early-return blank pins, added `BLANK_SENTINEL = "9999-12-31"` substitution before `localeCompare`, rewrote the branch comment to document the travel-with-direction rule.
- `tests/37-overview-sort.test.js` - Renamed/rewrote the descending case (asserts Carol at TOP), updated nextSeed() header comment; ascending test 7 and count guard (9) untouched.
- `.planning/phases/.../38-CONTEXT.md` - Appended D-03-R1 revision note (original D-03 text preserved).
- `.planning/REQUIREMENTS.md` - NEXT-04 and NEXT-08 clauses updated to the revised behavior.

## Decisions Made
- Followed the plan's explicit warning: implemented the far-future-sentinel approach rather than the UAT-gap hint of "just delete the early returns and let localeCompare handle blanks" — a bare localeCompare (empty string sorts smallest) would have floated blanks to the TOP of the default ascending view, burying dated rows (the exact thing D-03 prevented).

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 38 UAT test 3 is closed; the Next Session sort now mirrors Last Session's toggle behavior.
- No blockers. Recommend a manual on-device sanity check (one dated + several blank rows, toggle the Next Session header) as the optional verification listed in the plan.

## Self-Check: PASSED

---
*Phase: 38-next-session-date-field-with-overview-column*
*Completed: 2026-07-07*
