---
phase: 47-session-section-reordering
plan: 10
subsystem: ui
tags: [sessions, overview, severity-rendering, jsdom, display-logic]

# Dependency graph
requires:
  - phase: 31-render-hardening
    provides: the textContent-only render lock on the sessions issues cell and the overview expanded row that this plan preserves
provides:
  - name-only rendering for a fully-unrated topic in the Sessions History issues cell
  - name-only rendering for a fully-unrated topic in the client-overview expanded-session row
  - tests/47-view-unrated.test.js covering both surfaces + an averages-unchanged guard
affects: [session-history-view, client-overview-view]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fully-unrated (both before AND after null/undefined) → render topic name only; one numeric side keeps the suffix with '-' for the blank side"

key-files:
  created:
    - tests/47-view-unrated.test.js
  modified:
    - assets/sessions.js
    - assets/overview.js

key-decisions:
  - "Name-only branch fires ONLY when BOTH before AND after are empty; a single numeric side keeps the '(before -> after)' suffix (one real number is worth showing)"
  - "The overview averages loop was left completely untouched — it already excludes null before/after, so a fully-unrated topic counts toward the issue count but contributes to no average"

patterns-established:
  - "Empty-suffix suppression: display code branches on a full-unrated predicate before composing the parenthesized rating suffix, identically on both read-only session surfaces so the two pages agree"

requirements-completed: [ORDR-07]

coverage:
  - id: D1
    description: "Sessions History issues cell renders a fully-unrated topic's name only; partial keeps '(5 -> -)', full keeps '(8 -> 3)'; render stays textContent-only"
    requirement: "ORDR-07"
    verification:
      - kind: unit
        ref: "tests/47-view-unrated.test.js#sessions.js: a fully-unrated topic renders its NAME ONLY"
        status: pass
      - kind: unit
        ref: "tests/47-view-unrated.test.js#sessions.js: the issues-cell render stays textContent-only"
        status: pass
    human_judgment: false
  - id: D2
    description: "Client-overview expanded-session row renders a fully-unrated topic's name only (no '(-→-)'); partial '(5→-)', full '(8→3)'; textContent-only"
    requirement: "ORDR-07"
    verification:
      - kind: unit
        ref: "tests/47-view-unrated.test.js#overview.js: expanded-row issues string omits the suffix for a fully-unrated topic"
        status: pass
      - kind: unit
        ref: "tests/47-view-unrated.test.js#overview.js: expanded row stays textContent-only and the averages loop null-guards are intact"
        status: pass
    human_judgment: false
  - id: D3
    description: "Overview averages exclude a fully-unrated topic — a fully-unrated + fully-rated fixture reports the fully-rated topic's own before/after; averages loop unchanged"
    requirement: "ORDR-07"
    verification:
      - kind: unit
        ref: "tests/47-view-unrated.test.js#overview.js: averages exclude a fully-unrated topic"
        status: pass
    human_judgment: false
  - id: D4
    description: "Real-device visual check: a fully-unrated topic shows no '(- -> -)' in both the History table and the client-overview expanded row; a partially-rated topic still shows its numeric side"
    verification: []
    human_judgment: true
    rationale: "Visual rendering on a real device (incl. Hebrew RTL bidi around the parenthesized arrow) needs a human eye; automation asserts the string composition, not the on-device appearance"

# Metrics
duration: 12min
completed: 2026-07-23
status: complete
---

# Phase 47 Plan 10: View — hide empty rating suffix for fully-unrated topics Summary

**A fully-unrated topic now renders its name alone in both the Sessions History issues cell and the client-overview expanded row; partial and fully-rated topics keep today's `(before -> after)` suffix, and the (already null-excluding) overview averages are untouched.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-23
- **Tasks:** 2 (both TDD: RED → GREEN)
- **Files modified:** 3 (2 source, 1 test)

## Accomplishments
- Sessions History issues cell: a topic with no rating on either side renders its name only, dropping the `(- -> -)` noise Ben flagged
- Client-overview expanded-session row: same name-only rule applied identically, so the two read-only surfaces agree
- Overview averages loop left completely untouched — verified by a guard fixture that a fully-unrated + fully-rated topic reports the fully-rated topic's own before/after
- New two-surface jsdom behavior test (`tests/47-view-unrated.test.js`), 5 cases, plus a count guard against vacuous-green

## Task Commits

Each task was committed atomically (TDD test → feat):

1. **Task 1 (RED): Sessions History failing test** - `97bb10d` (test)
2. **Task 1 (GREEN): Sessions History name-only branch** - `5892ae3` (feat)
3. **Task 2 (RED): overview + averages guard test extension** - `fd26bbd` (test)
4. **Task 2 (GREEN): overview expanded-row name-only branch** - `3793857` (feat)

## Files Created/Modified
- `assets/sessions.js` - issues-cell per-issue loop branches on a full-unrated predicate; name-only when both sides empty, else today's `(before -> after)`
- `assets/overview.js` - expanded-row issues `.map` branches the same way; averages loop (`getClientMetrics`) unchanged
- `tests/47-view-unrated.test.js` - jsdom fixtures for both surfaces + averages-unchanged guard

## Decisions Made
- Name-only fires ONLY when BOTH before AND after are null/undefined; a single numeric side keeps the suffix (T-47-14 mitigation — a partially-rated topic never loses its real number). Followed plan as specified.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None. The averages guard (D3) was already green against unchanged overview.js — confirming the plan's premise that the averages loop already excludes null before/after and needed no change.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- This is the display-side complement to the export omission (47-05/47-09) and the form auto-hide (47-07); ORDR-07 unrated-omission is now covered on the History and overview views.
- Light real-device check recommended before /gsd-verify-work (D4): confirm no `(- -> -)` shows for a fully-unrated topic on both surfaces, esp. Hebrew RTL.

## Self-Check: PASSED

- All created/modified files verified present on disk (tests/47-view-unrated.test.js, assets/sessions.js, assets/overview.js, 47-10-SUMMARY.md)
- All four task commits verified in git history (97bb10d, 5892ae3, fd26bbd, 3793857)
- Full suite green: 212 passed, 0 failed
- Comment hygiene clean: no planning IDs in the shipped-code diff

---
*Phase: 47-session-section-reordering*
*Completed: 2026-07-23*
