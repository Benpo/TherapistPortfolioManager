---
phase: 07-investigate-data-backup-strategy
plan: "01"
subsystem: database
tags: [jszip, backup, zip, file-system-access-api, indexeddb, photos, export, import]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: window.PortfolioDB with getAllClients, getAllSessions, clearAll, addClient, addSession
provides:
  - "BackupManager module (window.BackupManager) with full ZIP export/import"
  - "JSZip 3.10.1 self-hosted library (assets/jszip.min.js)"
  - "ZIP backup format: backup.json (DEFLATE) + photos/ subfolder (STORE)"
  - "Legacy JSON import compatibility via normalizeManifest version detection"
  - "File System Access API auto-save with feature guard"
affects:
  - 07-02  # Plan 02 will wire BackupManager to the UI

# Tech tracking
tech-stack:
  added:
    - "JSZip 3.10.1 — self-hosted via assets/jszip.min.js (no CDN, no npm)"
  patterns:
    - "IIFE module pattern (window.BackupManager) — consistent with app.js, db.js style"
    - "STORE compression for images (already compressed), DEFLATE for JSON"
    - "Feature detection guard before File System Access API calls"
    - "Version field in manifest for forward/backward compatibility"
    - "Replace strategy on import: clearAll then re-add all records"

key-files:
  created:
    - assets/jszip.min.js
    - assets/backup.js
  modified: []

key-decisions:
  - "ZIP format chosen: backup.json (text/numbers) + photos/ (individual image files) — eliminates base64 bloat in JSON"
  - "STORE compression for photos (already compressed formats, DEFLATE would waste CPU), DEFLATE for JSON"
  - "normalizeManifest handles version 0 (old JSON, inline base64) and version 1 (ZIP format, photo filenames)"
  - "Replace strategy on import: clearAll then re-add — simpler than merge, avoids duplicate/conflict edge cases"
  - "sendToMyself: triggerDownload first then mailto — user must manually attach the file to the email"
  - "File System Access API usage guarded with feature detection — graceful fallback for Safari"
  - "settings.language and settings.theme restored on import; portfolioLastExport and portfolioBackupSnoozedUntil skipped (session-specific)"

patterns-established:
  - "Photo filename convention in ZIP: photos/client-{id}{ext} where ext derived from MIME type"
  - "MIME parsing from data URL: /^data:(image\\/\\w+);base64,/ — not hardcoded"
  - "ext-to-MIME mapping for reconstruction: .jpg -> image/jpeg, .png -> image/png, fallback image/jpeg"

requirements-completed:
  - BKUP-01
  - BKUP-02

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 7 Plan 01: BackupManager Module Summary

**ZIP-based backup module with photo separation, legacy JSON import, File System Access API auto-save, and mailto "send to myself" — no npm, no server, pure script-tag IIFE**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T13:49:19Z
- **Completed:** 2026-03-18T13:51:50Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Downloaded and self-hosted JSZip 3.10.1 (~95KB) — no CDN or npm dependency
- Created BackupManager module exposing all 9 required functions via IIFE on `window.BackupManager`
- ZIP export separates photos from JSON data: photos stored individually in `photos/` subfolder (STORE compression), manifest JSON uses DEFLATE — directly fixes the file-size problem that triggered this phase
- Import supports both new ZIP format (v1) and legacy JSON format (v0) transparently via `normalizeManifest`
- File System Access API auto-save wrapped in feature detection guard for cross-browser compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Download JSZip and create backup.js module** - `ceca549` (feat)

## Files Created/Modified

- `assets/jszip.min.js` — JSZip 3.10.1 self-hosted (~95KB minified)
- `assets/backup.js` — BackupManager module (~230 lines) exposing window.BackupManager

## Decisions Made

- **ZIP format structure:** `backup.json` (DEFLATE) + `photos/client-{id}{ext}` (STORE). STORE chosen for photos because PNG/JPEG are already compressed formats — running DEFLATE on them wastes CPU with negligible size gain.
- **Photo filename convention:** `client-{id}{ext}` where ext is derived from the MIME type parsed from the data URL (not hardcoded). This correctly handles PNG, JPEG, WebP.
- **Replace strategy on import:** `clearAll()` then add all records. Simpler than merge and avoids duplicate/conflict edge cases; user already confirmed before caller invokes `importBackup`.
- **No hardcoded MIME type:** MIME parsed dynamically from data URL regex; extension->MIME mapping via helper function for reconstruction on import.
- **sendToMyself design:** Download fires first (so file is saved locally), then `window.location.href = mailto:` opens the email client. User must manually attach the file — this is unavoidable without a server.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `window.BackupManager` is fully self-contained and ready for UI wiring in Plan 02
- Both script tags (`jszip.min.js` then `backup.js`) must be added to HTML before any caller code
- The module does NOT call `confirmDialog` — Plan 02 UI code must show confirmation before calling `importBackup`

---
*Phase: 07-investigate-data-backup-strategy*
*Completed: 2026-03-18*
