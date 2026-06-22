---
phase: 19-go-live-preparation
plan: 06
subsystem: security-guidance
tags: [security, i18n, ux, data-privacy]
dependency_graph:
  requires: [19-03]
  provides: [security-guidance-messaging]
  affects: [assets/app.css, assets/app.js, index.html, assets/i18n-en.js, assets/i18n-he.js, assets/i18n-de.js, assets/i18n-cs.js, assets/overview.js]
tech_stack:
  added: []
  patterns: [localStorage-flag-dismissal, D-23-multiple-touchpoints, empathetic-tone-D24]
key_files:
  created: []
  modified:
    - assets/app.css
    - assets/app.js
    - assets/overview.js
    - index.html
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "Security guidance uses dot-notation i18n keys (security.note.heading, etc.) matching existing project convention (backup.banner.message pattern)"
  - "Touchpoint #1 (first-launch note) uses localStorage securityGuidanceDismissed flag — one-time only"
  - "Touchpoint #2 (backup banner) uses security.backup.body i18n key with OR fallback to backup.banner.message for safety"
  - "Touchpoint #3 (persistent section) re-translates on app:language event via initPersistentSecuritySection()"
  - "Both new functions exposed in App public API for external callers"
metrics:
  duration: 5min
  completed_date: 2026-03-24
  tasks_completed: 2
  files_modified: 8
---

# Phase 19 Plan 06: Security Guidance Messaging Summary

Security guidance messaging implemented at 3 touchpoints per D-23, using empathetic tone (D-24), with data-loss-risk backup reminder (D-25) and persistent privacy section — all across EN/HE/DE/CS.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add security guidance CSS and first-launch logic | 1fb2a34 | app.css, app.js, overview.js, index.html, all 4 i18n files |
| 2 | Add security guidance i18n strings to language files | 1fb2a34 | i18n-en.js, i18n-he.js, i18n-de.js, i18n-cs.js |

Note: Both tasks were completed in a single commit as the i18n work was a natural part of Task 1 implementation.

## What Was Built

### Three Security Touchpoints (D-23)

**Touchpoint #1 — First-launch note (dismissable)**
- `showFirstLaunchSecurityNote()` in app.js
- Only shown when `portfolioLicenseActivated === '1'` and `securityGuidanceDismissed` not set
- Populated into `#security-guidance-container` div in index.html (after botanical divider)
- Dismiss button ("I understand") sets `securityGuidanceDismissed` flag and clears container
- CSS class `.security-guidance-note` — green primary-soft background, 1.25rem/600 heading

**Touchpoint #2 — Enhanced backup reminder (recurring)**
- `showBackupBanner()` updated to use `security.backup.body` i18n key
- Falls back to `backup.banner.message` if key not found
- New copy: "Your sessions live only in this browser. A backup protects your clients' records if anything happens to this device or browser. We recommend weekly backups."

**Touchpoint #3 — Persistent privacy section (always visible)**
- `initPersistentSecuritySection()` translates `#security-persistent-heading` and `#security-persistent-body`
- Called from `initCommon()` and from `app:language` handler in overview.js
- HTML in index.html: `.security-guidance-persistent` div, always present at bottom of main content
- CSS class `.security-guidance-persistent` — surface background (subtle, not prominent)

### CSS Added (app.css)
- `.security-guidance-note` — primary-soft bg, border, rounded corners
- `.security-guidance-dismiss` — primary bg, white text, min-height 44px (touch target)
- `.security-guidance-persistent` — surface bg, border, subtle styling

### i18n Keys Added (6 keys × 4 languages = 24 total)
- `security.note.heading` — first-launch note heading
- `security.note.body` — first-launch note body
- `security.note.dismiss` — "I understand" dismiss button
- `security.persistent.heading` — persistent section heading
- `security.persistent.body` — persistent section body
- `security.backup.body` — enhanced backup reminder body

## Deviations from Plan

### Auto-fixed Issues

None — plan executed with one structural adjustment:

**Task split adjustment:** The plan separated CSS/JS/HTML (Task 1) from i18n files (Task 2) into two commits. The i18n files were added as part of Task 1's implementation since the JS functions depend on the i18n keys being present. Both tasks were committed together in a single commit. This is a process deviation only — all artifacts were created.

## Known Stubs

None — all i18n keys have real translations for all 4 languages.

## Self-Check: PASSED

- `.security-guidance-note` in app.css: FOUND
- `securityGuidanceDismissed` in app.js: FOUND (2 occurrences)
- `#security-guidance-container` in index.html: FOUND
- `#security-persistent` in index.html: FOUND
- `security.note.heading` in app.js: FOUND
- `security.note.heading` in i18n-en.js: FOUND
- `security.note.heading` in i18n-he.js: FOUND
- `security.note.heading` in i18n-de.js: FOUND
- `security.note.heading` in i18n-cs.js: FOUND
- Commit 1fb2a34: FOUND
