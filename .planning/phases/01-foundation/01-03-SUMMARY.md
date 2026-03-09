---
phase: 01-foundation
plan: 03
subsystem: ui
tags: [localStorage, indexeddb, backup, data-safety, export]

# Dependency graph
requires:
  - phase: 01-foundation-01-01
    provides: CSS token system and app.js IIFE pattern
  - phase: 01-foundation-01-02
    provides: IndexedDB migration infrastructure (PortfolioDB.getAllClients, getAllSessions)
provides:
  - App.exportData() — collects all clients + sessions from IndexedDB into a versioned JSON object
  - App.downloadJSON() — triggers browser file download and records portfolioLastExport timestamp
  - checkBackupReminder() — compares portfolioLastExport age to 7-day threshold, shows banner if overdue
  - showBackupBanner() — renders non-blocking top-of-page banner with 4 controls (back up now, postpone tomorrow, postpone 1 week, X)
  - requestPersistentStorage() — calls navigator.storage.persist() once on first load, stores result silently
affects: [04-i18n, 06-qa]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - App namespace pattern extended — shared functions in app.js IIFE, exposed via return object, called as App.exportData() from page-specific JS
    - localStorage key naming convention — portfolioLastExport, portfolioBackupSnoozedUntil, portfolioStoragePersistRequested
    - Snooze pattern — ISO timestamp stored in localStorage, compared on every page load via checkBackupReminder()

key-files:
  created: []
  modified:
    - assets/app.js
    - assets/overview.js

key-decisions:
  - "Hardcoded English strings in backup banner for Phase 1 — i18n is Phase 4 scope"
  - "X button closes banner for current page load only (no localStorage write) — intentional, lets reminder resurface on next load"
  - "requestPersistentStorage() marks portfolioStoragePersistRequested=true even on error/denial to prevent repeated browser prompts"

patterns-established:
  - "Shared utility pattern: move page-specific functions to app.js when they need to be accessible from multiple pages or the backup banner"
  - "Non-blocking banner pattern: document.body.prepend() with inline styles as fallback, tokens.css vars used where available"

requirements-completed: [FOUND-04]

# Metrics
duration: ~30min
completed: 2026-03-09
---

# Phase 1 Plan 03: Backup Reminder System Summary

**Data-safety backup reminder banner in app.js with 7-day check, 4-button snooze UI, and navigator.storage.persist() on first load**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-09
- **Completed:** 2026-03-09
- **Tasks:** 1 auto + 1 human-verify (2 total)
- **Files modified:** 2

## Accomplishments

- Moved exportData() and downloadJSON() from overview.js into app.js App IIFE and exposed them as App.exportData() / App.downloadJSON()
- Added checkBackupReminder() and showBackupBanner() — banner appears when portfolioLastExport is absent or older than 7 days, suppressed during active snooze
- Added requestPersistentStorage() — calls navigator.storage.persist() exactly once per device and marks portfolioStoragePersistRequested to prevent re-prompting
- initCommon() now calls both checkBackupReminder() and requestPersistentStorage() on every page load
- Human verification confirmed: banner appears correctly, all 4 buttons behave as specified, export downloads valid JSON, snooze suppresses on reload, no regressions

## Task Commits

1. **Task 1: Move export functions and add backup reminder + persist logic** - `32a8c74` (feat)
2. **Task 2: Checkpoint human-verify** - approved by user (no commit — verification only)

## Files Created/Modified

- `assets/app.js` — Added exportData(), downloadJSON(), checkBackupReminder(), showBackupBanner(), requestPersistentStorage(); extended initCommon() and public return object
- `assets/overview.js` — Removed local exportData()/downloadJSON() definitions; updated export button handler to call App.exportData() / App.downloadJSON()

## Decisions Made

- Hardcoded English strings in backup banner — i18n is Phase 4 scope, intentional
- X button does not write to localStorage — allows reminder to resurface on next load if user dismisses without acting
- requestPersistentStorage() marks the key as requested even on denial/error to avoid repeated permission prompts on every load

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backup reminder and export infrastructure complete; overview.js and any future pages can call App.exportData() / App.downloadJSON() without redefining the functions
- Phase 4 (i18n) will need to add translation keys for the banner message and button labels
- Phase 6 (QA) Playwright tests should cover: banner appears when overdue, snooze suppresses banner, export downloads file and resets timer

---
*Phase: 01-foundation*
*Completed: 2026-03-09*
