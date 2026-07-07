---
phase: 38-next-session-date-field-with-overview-column
plan: 11
subsystem: ui
tags: [rtl, bidi, i18n, isolate, fsi, date-format, add-session, overview]

# Dependency graph
requires:
  - phase: 38-09
    provides: Phase 38 UAT retest that surfaced the pre-existing RTL name+date scramble (test 7)
provides:
  - Shared window.DateFormat.isolate(str) First-Strong-Isolate helper (U+2068 … U+2069), empty-safe
  - Bidi-isolated name+date composition in updateSessionTitle (session heading + document.title)
  - Bidi-isolated overview session-meta and client-modal mixed runs
  - tests/38-11-bidi-isolate.test.js — helper behavior + per-call-site source gates
affects: [rtl, date-format, add-session, overview, pdf-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First-Strong-Isolate (FSI/PDI) wrapping at every mixed LTR/RTL string-composition site so the Unicode Bidi Algorithm cannot reorder adjacent name/bullet/number/Hebrew runs under html[dir=rtl]"
    - "String-level isolation (not <bdi>/CSS) because document.title is plain text and cannot carry markup"

key-files:
  created:
    - tests/38-11-bidi-isolate.test.js
  modified:
    - assets/date-format.js
    - assets/add-session.js
    - assets/overview.js

key-decisions:
  - "FSI (U+2068), not LRI — so a Hebrew-named client stays RTL and a Latin-named client stays LTR, and a month-name Hebrew date renders RTL while an English month renders LTR"
  - "isolate() is empty-safe: returns \"\" for null/undefined/\"\" — never a bare pair of isolate characters"
  - "maybeWrapLtr / numeric-format LRI path left untouched (D-07); the fix isolates at call sites, not in the formatter"
  - "pdf-export.js untouched — its header has its own UAX#9 HL2 first-strong bidi and is verify-only"

patterns-established:
  - "Reuse window.DateFormat.isolate at any string-composition site that joins a user name / date / type across a neutral separator under RTL"

requirements-completed: [NEXT-03, NEXT-08]

# Coverage metadata
coverage:
  - id: D1
    description: "DateFormat.isolate(str) wraps non-empty input with U+2068 … U+2069 and returns \"\" for empty/nullish; composed lines carry exactly two FSI + two PDI with the separator between isolated runs"
    requirement: "NEXT-08"
    verification:
      - kind: unit
        ref: "tests/38-11-bidi-isolate.test.js Part A (helper behavior, RED-first then GREEN 7/7)"
        status: pass
    human_judgment: false
  - id: D2
    description: "updateSessionTitle isolates BOTH clientName and dateText (heading + document.title); overview session-meta and client-modal parts isolate their mixed runs (per-call-site source gates)"
    requirement: "NEXT-03"
    verification:
      - kind: unit
        ref: "tests/38-11-bidi-isolate.test.js Part B (per-site source gates on comment-stripped source)"
        status: pass
      - kind: unit
        ref: "tests/run-all.js (130/130 files, no regression incl. 31-overview-render-hardening)"
        status: pass
    human_judgment: false
  - id: D3
    description: "In Hebrew (month-name format, Latin-named client) the session heading, document.title, and overview meta lines read in logical order (dgh • 16 במאי 2026); exported PDF header renders correctly"
    requirement: "NEXT-03"
    verification:
      - kind: manual_procedural
        ref: "Real Hebrew UI — on-screen bidi reading order + verify-only PDF header"
        status: pass
    human_judgment: true
    rationale: "On-screen bidi reading order needs a human eye; unit tests prove isolate characters are present but not the rendered order. PDF header is a separate verify-only render path."

# Metrics
duration: ~30min
completed: 2026-07-07
status: complete
---

# Phase 38 Plan 11: RTL Name+Date Bidi Isolation Fix Summary

**A shared First-Strong-Isolate helper (U+2068 … U+2069) wraps every mixed LTR/RTL run at the string-composition sites — so a Latin client name next to a Hebrew month-name date reads "dgh • 16 במאי 2026" instead of scrambling — closing UAT test 7, a pre-existing major bidi defect, approved on-device.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-07-07
- **Tasks:** 3 (RED test, GREEN implementation, human-verify)
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- Closed UAT test 7 / NEXT-03: a Latin-script client name adjacent to a Hebrew month-name date no longer reorders into "2026 במאי dgh • 16" — it reads logically across the session heading, document.title, and overview meta lines.
- Added ONE shared `window.DateFormat.isolate()` FSI helper (empty-safe) and reused it at every mixed-run composition site rather than a one-off fix.
- Isolated `updateSessionTitle` (both clientName and dateText, covering heading + document.title), the overview session-meta date run, and the client-modal mixed parts — all textContent-only (no innerHTML; 31-overview-render-hardening lock preserved).
- RED-first falsifiable helper test + per-call-site source gates; test 38-11 GREEN 7/7; full suite 130/130.
- Ben confirmed on-device 2026-07-07: Hebrew heading / tab-title / overview reading order correct; the verify-only PDF header was NOT flagged (no follow-up needed).

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): behavior test + per-call-site source gates** - `a5f49e5` (test)
2. **Task 2 (GREEN): FSI isolate helper + isolate all three composition sites** - `c0cbf44` (feat)

_Task 3 was a human-verify checkpoint (no source commit) — approved on-device 2026-07-07._

## Files Created/Modified
- `tests/38-11-bidi-isolate.test.js` - Part A: falsifiable helper behavior (FSI/PDI wrapping, empty-safe, composed-line two-isolate assertion). Part B: per-call-site source gates on comment-stripped source (add-session isolates both runs; overview isolates ≥ 2 sites) with an EXPECTED_COUNT vacuous-green guard.
- `assets/date-format.js` - Added `DateFormat.isolate(str)` on the public surface (FSI=U+2068, PDI=U+2069) beside the existing LRI/PDI constants; returns "" for null/undefined/""; maybeWrapLtr / numeric path untouched.
- `assets/add-session.js` - `updateSessionTitle` composes `isolate(clientName) + " • " + isolate(dateText)` and assigns the isolated string to BOTH titleEl.textContent and document.title; name-only and fallback branches unchanged.
- `assets/overview.js` - session-meta (~:799) isolates the formatted-date run; client-modal parts (~:958) isolate the mixed date/age + localized-type runs — textContent-only.

## Decisions Made
- FSI (U+2068), not LRI — preserves each run's own base direction (Hebrew name stays RTL, Latin name stays LTR, month-name date direction follows its first strong char).
- `isolate()` is empty-safe (returns "" for nullish/empty) so a missing name/date never emits a bare pair of isolate control characters.
- Isolate at the call sites, not in the formatter — `maybeWrapLtr`'s numeric-only LRI path (D-07) stays exactly as-is.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated a coupled test expectation to compose via DateFormat.isolate**
- **Found during:** Task 2 (GREEN)
- **Issue:** `tests/30-client-spotlight.test.js` asserted the pre-isolation composed string; isolating the runs changed the expected output.
- **Fix:** Updated the expectation to compose the expected line via `DateFormat.isolate` so it matches the new isolated composition.
- **Files modified:** tests/30-client-spotlight.test.js
- **Verification:** Test GREEN; full suite 130/130.
- **Committed in:** `c0cbf44`

**2. [Rule 3 - Blocking] Loaded date-format.js into an overview test's jsdom env**
- **Found during:** Task 2 (GREEN)
- **Issue:** `tests/31-overview-render-hardening.test.js` exercised overview rendering that now calls `DateFormat.isolate`, but its jsdom environment did not load date-format.js — the helper was undefined in that context.
- **Fix:** Loaded assets/date-format.js in that test's jsdom env so `window.DateFormat.isolate` is available.
- **Files modified:** tests/31-overview-render-hardening.test.js
- **Verification:** Test GREEN; full suite 130/130 (render-hardening lock still enforced).
- **Committed in:** `c0cbf44`

---

**Total deviations:** 2 auto-fixed (1 bug — coupled expectation; 1 blocking — missing test-env dependency)
**Impact on plan:** Both were test-side adjustments required by the new isolation; no source-behavior scope creep. Production code changed exactly the four planned surfaces.

## Issues Encountered
None beyond the two coupled-test adjustments documented above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None.

## Human Field-Verification Required
Complete — Ben approved on-device 2026-07-07: "38.11 is fine" (Hebrew heading / tab-title / overview reading order correct). The verify-only PDF export header was NOT flagged — no separate follow-up required.

## Next Phase Readiness
- UAT test 7 closed on-device. Wave-1 gap closure continues with 38-12 (test 8 — warning-toast visibility / error tone + auto-focus).

## Self-Check: PASSED
- FOUND: tests/38-11-bidi-isolate.test.js
- FOUND: assets/date-format.js, assets/add-session.js, assets/overview.js
- FOUND commits: a5f49e5, c0cbf44

---
*Phase: 38-next-session-date-field-with-overview-column*
*Completed: 2026-07-07*
