---
phase: 01-foundation
plan: "02"
subsystem: database
tags: [indexeddb, migrations, multi-tab, schema]

# Dependency graph
requires: []
provides:
  - IndexedDB MIGRATIONS map with sequential onupgradeneeded handler
  - Multi-tab blocking detection via request.onblocked + persistent banner
  - Graceful connection close via db.onversionchange + refresh banner
  - Migration error recovery via try/catch + abort transaction + error banner
affects:
  - 03-data-model
  - any phase adding new IndexedDB object stores or indexes

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MIGRATIONS map keyed by version number for sequential IndexedDB schema upgrades"
    - "for loop over oldVersion+1..newVersion to run only relevant migrations"
    - "Persistent DOM banners (not toasts) for user-action-required DB states"

key-files:
  created: []
  modified:
    - assets/db.js

key-decisions:
  - "MIGRATIONS map pattern chosen over switch/case for extensibility — Phase 3 adds v2 entry without touching existing code"
  - "Helper UI functions kept internal (not on public return object) — they are implementation details of openDB()"
  - "DB_VERSION stays at 1 in Phase 1; migration infrastructure readied for Phase 3 schema changes"

patterns-established:
  - "Migration pattern: MIGRATIONS[v](db, transaction) — all future schema changes add a numbered entry to MIGRATIONS"
  - "Banner pattern: persistent fixed-position DOM banner (not toast) for states requiring user action (close tab / refresh)"

requirements-completed:
  - FOUND-03

# Metrics
duration: 1min
completed: "2026-03-09"
---

# Phase 1 Plan 02: IndexedDB Migration Infrastructure Summary

**Sequential MIGRATIONS map with multi-tab blocking banners and migration error recovery added to assets/db.js, preserving v1 schema and all existing PortfolioDB public API**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-09T16:05:57Z
- **Completed:** 2026-03-09T16:06:57Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments
- Added `MIGRATIONS` constant with version 1 handler that recreates the original clients/sessions schema exactly
- Replaced bare `onupgradeneeded` with sequential for-loop that calls `MIGRATIONS[v](db, transaction)` for each version step
- Added `request.onblocked` handler with a persistent red banner telling the user to close other tabs
- Added `db.onversionchange` handler that closes the connection and shows a purple refresh banner
- Added migration error catch block that aborts the upgrade transaction and shows a red refresh banner
- All three UI helper functions (`showDBBlockedMessage`, `showDBVersionChangedMessage`, `showDBMigrationError`) are internal — not exposed on the public return object

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure db.js with MIGRATIONS map and sequential upgrade handler** - `f2f37e4` (feat)

## Files Created/Modified
- `assets/db.js` - MIGRATIONS map, updated openDB(), three banner helper functions added; all other PortfolioDB methods unchanged

## Decisions Made
- Internal helper functions are NOT added to the public return object — they are openDB() implementation details only
- DB_VERSION kept at 1; no schema change occurs in Phase 1 so existing data is fully preserved
- MIGRATIONS map chosen over switch/case so Phase 3 can add `2: function addReferralSource(...)` without modifying existing code

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Migration infrastructure is in place; Phase 3 data model expansion can add MIGRATIONS[2] with confidence
- DB_VERSION bump to 2 in Phase 3 will trigger the sequential loop and run only the new migration handler
- No regressions: existing app functionality (add client, add session, view overview) is unaffected

---
*Phase: 01-foundation*
*Completed: 2026-03-09*
