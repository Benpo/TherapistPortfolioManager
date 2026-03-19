---
phase: 09-heart-shield-redesign
plan: 01
subsystem: ui
tags: [indexeddb, i18n, forms, migration, heart-shield]

# Dependency graph
requires: []
provides:
  - DB migration v3 converting heartWallCleared to isHeartShield/shieldRemoved on sessions
  - DB migration v3 removing heartWall from clients
  - Heart Shield toggle in session form (add-session.html)
  - isHeartShield + shieldRemoved fields persisted to IndexedDB
  - Validation blocking save when toggle is on but no shieldRemoved answer
  - i18n keys for Heart Shield form fields in EN/HE/DE/CS
  - i18n keys for filter and badge labels in EN/HE/DE/CS
affects:
  - 09-02-PLAN (visual indicators — reads isHeartShield/shieldRemoved from sessions)
  - sessions.html (filter by Heart Shield type)
  - index.html (Heart Shield badge in overview)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - IndexedDB cursor-based migration pattern for field renames/deletions
    - CSS toggle switch with RTL-aware translateX

key-files:
  created: []
  modified:
    - assets/db.js
    - assets/add-session.js
    - add-session.html
    - assets/app.css
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js

key-decisions:
  - "Heart Shield tracking moved from client-level (heartWall) to session-level (isHeartShield + shieldRemoved)"
  - "Migration v3 converts heartWallCleared boolean to shieldRemoved on sessions with isHeartShield=true"
  - "Sessions without heartWallCleared are not touched by migration — they default to no Heart Shield"
  - "Toggle defaults to off for new sessions; shieldRemoved is null when isHeartShield is false"

patterns-established:
  - "Heart Shield toggle pattern: checkbox + conditional section with is-hidden class toggle"
  - "DB migration pattern: cursor on store, check for old field existence before migrating"

requirements-completed: [HSHLD-01]

# Metrics
duration: 15min
completed: 2026-03-19
---

# Phase 9 Plan 01: Heart Shield Redesign — Session-Level Tracking

**IndexedDB migration v3 adds isHeartShield + shieldRemoved fields to sessions, with a toggle UI in the add-session form and validation blocking incomplete Heart Shield entries**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-19T11:14:23Z
- **Completed:** 2026-03-19T11:29:44Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- DB migration v3 converts old heartWallCleared session field to isHeartShield + shieldRemoved, and removes heartWall from clients
- Heart Shield toggle switch renders in session form between client/date/type grid and clientSpotlight
- When toggled on, a conditional "Shield removed? Yes/No" radio group appears; validation blocks save without an answer
- Session save (add and update) persists isHeartShield and shieldRemoved to IndexedDB
- Editing an existing Heart Shield session restores toggle state and radio selection
- i18n keys added for form labels, filter options, and badge labels in EN/HE/DE/CS

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration v3 and i18n keys for Heart Shield redesign** - `e08ca5a` (feat)
2. **Task 2: Heart Shield toggle in session form with validation** - `01df6cb` (feat)

## Files Created/Modified
- `assets/db.js` - DB_VERSION bumped to 3, MIGRATIONS[3] added for heartWallCleared->isHeartShield/shieldRemoved conversion
- `assets/add-session.js` - Toggle element refs, change handler, form submit validation, populateSession restore, markdown copy line
- `add-session.html` - Heart shield section HTML inserted between form-grid and clientSpotlight
- `assets/app.css` - Toggle switch, heart-shield-section, shield-removed-options, RTL styles, read-mode pointer-events
- `assets/i18n-en.js` - session.form.heartShield, shieldRemoved, overview.heartShield.*, sessions.filter.type.*, sessions.badge.*
- `assets/i18n-he.js` - Same keys in Hebrew
- `assets/i18n-de.js` - Same keys in German
- `assets/i18n-cs.js` - Same keys in Czech

## Decisions Made
- Heart Shield tracking moved from client-level (`heartWall`) to session-level (`isHeartShield` + `shieldRemoved`), enabling per-session tracking
- Migration v3 only sets `isHeartShield: true` on sessions that had `heartWallCleared` — other sessions remain untouched
- `shieldRemoved` is stored as boolean (`true`/`false`) or `null` (when `isHeartShield` is false)
- Toggle defaults off for new sessions; conditional field only visible when toggle is on

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed stale `updateHeartWallSection()` call**
- **Found during:** Task 2 (add-session.js review)
- **Issue:** `inlineCancel` click handler called `updateHeartWallSection()` — a function from the old heart wall feature that no longer exists, would cause a runtime error
- **Fix:** Removed the call since Heart Shield is now user-driven (toggle), not driven by client data
- **Files modified:** assets/add-session.js
- **Verification:** Grep confirms no remaining references to the function
- **Committed in:** 01df6cb (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 bug)
**Impact on plan:** Essential fix to prevent JavaScript runtime error. No scope creep.

## Issues Encountered
None - plan executed as specified.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Data foundation complete: sessions now have `isHeartShield` and `shieldRemoved` fields
- Plan 02 can build visual indicators reading these fields from the DB
- Filter UI (`sessions.filter.type.*` keys) is ready for Plan 02 to wire up

---
*Phase: 09-heart-shield-redesign*
*Completed: 2026-03-19*

## Self-Check: PASSED
- SUMMARY.md: FOUND
- Commit e08ca5a (Task 1): FOUND
- Commit 01df6cb (Task 2): FOUND
