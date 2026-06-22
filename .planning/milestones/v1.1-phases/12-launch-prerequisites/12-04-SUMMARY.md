---
phase: 12-launch-prerequisites
plan: 04
subsystem: testing
tags: [qa, manual-testing, checklist, browsers, rtl, pwa]

# Dependency graph
requires:
  - phase: 12-launch-prerequisites/12-01
    provides: Privacy policy (Datenschutzerklärung) written in landing.html
  - phase: 12-launch-prerequisites/12-02
    provides: German translation fixes (du-form, umlauts, terminology)
  - phase: 12-launch-prerequisites/12-03
    provides: Impressum and checkout URL structure with placeholders
provides:
  - Structured QA checklist (12-04-QA-CHECKLIST.md) covering all browsers, devices, languages, and features
affects: [launch readiness, LNCH-06]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/12-launch-prerequisites/12-04-QA-CHECKLIST.md
  modified: []

key-decisions:
  - "QA checklist organized by test area (not by browser) to minimize context switching"
  - "Plain language instructions throughout — Sapir finds technical language overwhelming"
  - "Browser coverage matrix: Mac Chrome/Safari, Win Chrome/Firefox/Edge, iPhone Safari"
  - "6 test areas: landing page, app core flow, languages/RTL, dark mode, mobile, PWA"

patterns-established: []

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-19
---

# Phase 12 Plan 04: QA Checklist Summary

**Comprehensive 361-line QA checklist for manual testing of landing page + app across 5 browsers, 3 devices, 4 languages, dark mode, RTL Hebrew, and PWA**

## Performance

- **Duration:** ~5 min (Task 1 complete, checkpoint reached at Task 2)
- **Started:** 2026-03-19T19:22:18Z
- **Completed:** 2026-03-19 (partial — awaiting Sapir's manual QA execution)
- **Tasks:** 1/2 complete
- **Files modified:** 1

## Accomplishments
- QA checklist created with 6 test areas, browser-matrix tables, and plain-language instructions
- Each test area includes checkboxes, expected behavior, and "if broken" reporting guidance
- Checklist covers: landing page visual/content, app core flow, languages/RTL, dark mode, mobile, PWA/offline

## Task Commits

Each task was committed atomically:

1. **Task 1: Create comprehensive QA checklist** - `c38eca4` (feat)
2. **Task 2: Sapir executes QA checklist** — Checkpoint: awaiting manual testing

## Files Created/Modified
- `.planning/phases/12-launch-prerequisites/12-04-QA-CHECKLIST.md` — 361-line manual QA checklist for Sapir

## Decisions Made
- Organized checklist by test area (not by browser) to reduce context-switching overhead
- Wrote in plain, non-technical language per Sapir's preference
- Included browser-matrix tables for test areas that must be checked across all environments

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
Sapir must execute the QA checklist manually. See `.planning/phases/12-launch-prerequisites/12-04-QA-CHECKLIST.md`. After testing, report any failed checks to Claude for bug fixes.

## Next Phase Readiness
- QA execution pending — Sapir needs to test across MacBook, Windows PC, and iPhone
- After bugs are fixed and all checks pass: ready to mark LNCH-06 complete and proceed to launch

---
*Phase: 12-launch-prerequisites*
*Completed: 2026-03-19 (partial)*
