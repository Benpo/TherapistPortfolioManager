---
phase: 16-audit-fix-code
plan: "04"
subsystem: backup
tags: [bug-fix, i18n, css, backup, localStorage]
dependency_graph:
  requires: []
  provides: [backup-lang-key-fix, backup-banner-i18n, backup-banner-css-tokens]
  affects: [assets/backup.js, assets/app.js, assets/app.css, assets/i18n-en.js, assets/i18n-he.js, assets/i18n-de.js, assets/i18n-cs.js]
tech_stack:
  added: []
  patterns: [i18n-via-App.t, CSS-classes-over-inline-styles, design-tokens]
key_files:
  created: []
  modified:
    - assets/backup.js
    - assets/app.js
    - assets/app.css
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - portfolioLang is the canonical localStorage key for language; portfolioLanguage was a bug introduced in backup.js that caused language preference to be lost during backup/restore
  - Backup banner uses .backup-reminder-banner and .backup-reminder-btn CSS classes instead of inline style.cssText for maintainability
  - Close button gets .backup-reminder-btn--close class (no border/background, just icon styling)
metrics:
  duration: 8min
  completed: "2026-03-23"
  tasks: 2
  files: 7
---

# Phase 16 Plan 04: Backup Lang Key Fix, Banner i18n, and CSS Classes Summary

Fixed localStorage key bug in backup.js (portfolioLanguage -> portfolioLang), internationalized the hardcoded English backup banner text across all 4 languages, and replaced inline style.cssText on banner elements with CSS classes using design tokens.

## Tasks Completed

### Task 1: Add backup banner i18n keys to all 4 language files

Added 4 new translation keys to each language file:
- `backup.banner.message` — reminder text
- `backup.banner.backupNow` — primary action button
- `backup.banner.postponeTomorrow` — postpone 24h button
- `backup.banner.postponeWeek` — postpone 1 week button

All 4 language files (EN/HE/DE/CS) received appropriate translations.

**Commit:** 4c84c72

### Task 2: Fix portfolioLang key, replace hardcoded strings, add CSS classes

**backup.js fixes:**
- `localStorage.getItem("portfolioLanguage")` → `localStorage.getItem("portfolioLang")` in export
- `localStorage.setItem("portfolioLanguage", ...)` → `localStorage.setItem("portfolioLang", ...)` in import
- Language preference now correctly persists through backup/restore cycle

**app.js fixes:**
- Replaced `"It has been a while — consider backing up your data."` with `t("backup.banner.message")`
- Replaced `"Back up now"` with `t("backup.banner.backupNow")`
- Replaced `"Postpone to tomorrow"` with `t("backup.banner.postponeTomorrow")`
- Replaced `"Postpone 1 week"` with `t("backup.banner.postponeWeek")`
- Removed all `style.cssText` from banner, buttons, and actions div
- Applied CSS class names: `backup-reminder-banner`, `backup-reminder-btn`, `backup-reminder-btn--primary`, `backup-reminder-btn--close`

**app.css additions:**
- `.backup-reminder-banner` — flex container with design token colors and spacing
- `.backup-banner-actions` — flex row for button group
- `.backup-reminder-btn` — ghost button base style
- `.backup-reminder-btn--primary` — filled primary style for "Back up now"
- `.backup-reminder-btn--close` — minimal icon button style
- All styles use `var()` tokens with fallback values

**Commit:** 2f0565a

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all backup banner functionality is fully wired.

## Self-Check: PASSED

- [x] assets/backup.js — portfolioLang key correct (0 portfolioLanguage occurrences)
- [x] assets/app.js — 0 hardcoded English strings, 4 App.t() calls for backup banner
- [x] assets/i18n-en.js — backup.banner.message present
- [x] assets/i18n-he.js — backup.banner.message present
- [x] assets/i18n-de.js — backup.banner.message present
- [x] assets/i18n-cs.js — backup.banner.message present
- [x] assets/app.css — backup-reminder classes present (7 matches)
- [x] Commits 4c84c72 and 2f0565a exist
