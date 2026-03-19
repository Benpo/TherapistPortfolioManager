---
phase: 08-terminology-and-quick-ux-fixes
plan: 02
subsystem: ui
tags: [svg, i18n, css, table, icons, tooltip]

# Dependency graph
requires:
  - phase: 08-01
    provides: Terminology fixes (לקוח, אנרגטיים) already applied to same files
provides:
  - SVG clock icon button replacing "פרטים" text button in clients table
  - Always-visible circular icon buttons (clock + plus) in clients table
  - Tooltip i18n keys in all 4 languages for icon buttons
  - Actions column header removed from clients table
affects:
  - overview.js (icon button rendering)
  - app.css (icon button styles)
  - index.html (table header)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Inline SVG icons for compact circular icon buttons
    - App.t() tooltip keys for language-independent icon buttons

key-files:
  created: []
  modified:
    - assets/i18n-he.js
    - assets/i18n-en.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
    - assets/overview.js
    - assets/app.css
    - index.html

key-decisions:
  - "Icon buttons always visible (no hover reveal) for better discoverability on mobile and desktop"
  - "Actions column header removed — icon buttons are self-explanatory with tooltips"

patterns-established:
  - "Circular icon buttons: 34px, border-radius 50%, display:grid, place-items:center"

requirements-completed:
  - UX-02

# Metrics
duration: 3min
completed: 2026-03-19
---

# Phase 08 Plan 02: Icon Buttons in Clients Table Summary

**SVG clock icon replaces text "פרטים" button; both action icons always visible as circular buttons with translated tooltips in all 4 languages**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-19T10:36:28Z
- **Completed:** 2026-03-19T10:39:13Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added `overview.table.previousSessions` and `overview.table.newSession` i18n keys in HE/EN/DE/CS
- Replaced text "פרטים" button with SVG clock icon; circular icon styling matches the "+" button
- Both action buttons always visible (removed hover-reveal logic from CSS and mobile breakpoint)
- Removed "פעולות" / "Actions" column header from table; updated colSpan from 5 to 4

## Task Commits

Each task was committed atomically:

1. **Task 1: Add i18n keys for icon button tooltips** - `96a67a2` (feat)
2. **Task 2: Replace text buttons with SVG icon buttons and update styles** - `3dbdc4a` (feat)

## Files Created/Modified
- `assets/i18n-he.js` - Added previousSessions/newSession keys, removed actions key
- `assets/i18n-en.js` - Added previousSessions/newSession keys, removed actions key
- `assets/i18n-de.js` - Added previousSessions/newSession keys, removed actions key
- `assets/i18n-cs.js` - Added previousSessions/newSession keys, removed actions key
- `assets/overview.js` - SVG clock innerHTML, updated tooltip keys, colSpan 5→4
- `assets/app.css` - .row-toggle restyled as circular icon; .row-quick-add always visible; removed hover rule and mobile override
- `index.html` - Removed actions `<th>` from table thead

## Decisions Made
- Always-visible buttons (not hover-dependent) for better mobile UX and discoverability
- Actions column header removed since icon buttons are self-explanatory with tooltips

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The plan's automated verify command for Task 2 uses a broad `grep -q "opacity:0"` check which matches other unrelated CSS rules (session-edit button, import-label input). The `.row-quick-add` rule itself has no `opacity:0` — confirmed via targeted grep. False FAIL in the verification command, actual implementation is correct.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Clients table now uses compact icon buttons with full i18n tooltip support
- Ready for Phase 08 remaining tasks

---
*Phase: 08-terminology-and-quick-ux-fixes*
*Completed: 2026-03-19*
