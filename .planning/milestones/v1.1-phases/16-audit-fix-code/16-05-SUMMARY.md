---
phase: 16-audit-fix-code
plan: "05"
subsystem: db
tags: [i18n, db, css, refactor, anti-pattern]
dependency_graph:
  requires: []
  provides: [translated-db-error-banners, db-error-css-classes, clean-async-db-functions]
  affects: [assets/db.js, assets/app.css, assets/tokens.css]
tech_stack:
  added: []
  patterns: [inline-translation-object, dbStr-helper, CSS-class-based-banners, async-await-refactor]
key_files:
  created: []
  modified:
    - assets/db.js
    - assets/app.css
    - assets/tokens.css
decisions:
  - DB error banners use inline DB_STRINGS object (not i18n.js) because db.js loads before the i18n system
  - CSS classes db-error-banner--blocked/version/migration distinguish severity levels
  - Warning/info/danger bg+text color tokens added to tokens.css for both light and dark mode fallbacks
metrics:
  duration: 5min
  completed: "2026-03-23"
  tasks_completed: 1
  files_modified: 3
---

# Phase 16 Plan 05: DB Error Banner i18n, CSS Classes, Promise Refactor Summary

DB error banners now display translated text in all 4 languages (EN/HE/DE/CS) via an inline `DB_STRINGS` object with `dbStr()` helper, replacing hardcoded English strings; all 3 banner functions use CSS classes with design tokens instead of `style.cssText`; and the `new Promise(async...)` anti-pattern was eliminated from 6 DB functions.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Internationalize DB error banners, add CSS classes, refactor Promise anti-pattern | 9c650be | assets/db.js, assets/app.css, assets/tokens.css |

## What Was Built

**assets/db.js:**
- Added `DB_STRINGS` constant with translations for all 4 languages (en/he/de/cs) covering 5 message keys: blocked, versionChanged, refresh, migrationFailed, refreshPage
- Added `dbStr(key)` helper that reads `localStorage.getItem('portfolioLang')` and falls back to English
- Replaced all 3 `showDB*` banner functions: `showDBBlockedMessage`, `showDBVersionChangedMessage`, `showDBMigrationError` — removed all `style.cssText` assignments, replaced with `className` assignments using semantic CSS class names
- Refactored 6 functions from `new Promise(async (resolve, reject) => {...})` to `async function` + plain `new Promise(...)`: `addRecord`, `getClient`, `getAllClients`, `getSession`, `getAllSessions`, `getSessionsByClient`

**assets/app.css:**
- Added `.db-error-banner` base class (fixed positioning, z-index 10000, flex layout)
- Added `.db-error-banner--blocked` (warning: yellow background)
- Added `.db-error-banner--version` (info: blue background)
- Added `.db-error-banner--migration` (danger: red background)
- Added `.db-error-btn` with hover state using design tokens

**assets/tokens.css:**
- Added `--color-danger-bg`, `--color-danger-text`, `--color-warning-bg`, `--color-warning-text`, `--color-info-bg`, `--color-info-text`, `--color-text-inverse` to semantic tokens (light mode defaults; dark mode inherits or overrides via CSS var fallbacks)

## Decisions Made

- **Inline translation object** (not i18n.js): db.js loads before the i18n system initializes, so it cannot call `window.i18n.t()`. The inline approach is the only viable pattern here.
- **CSS class modifier pattern** (`--blocked`, `--version`, `--migration`): Semantic severity levels allow distinct styling per banner type without repeating shared positioning/layout styles.
- **Token additions in light-mode only**: No dark-mode overrides added for the new warning/info/danger tokens — the banners appear briefly before user interaction so dark-mode refinement is low priority.

## Verification Results

- `grep "Please close other tabs" assets/db.js` — 1 match (only in DB_STRINGS.en fallback, not in banner function)
- `grep "new Promise(async" assets/db.js` — 0 matches
- `grep "DB_STRINGS" assets/db.js` — 3 matches (declaration + dbStr function)
- `grep "function dbStr" assets/db.js` — 1 match
- `grep "dbStr(" assets/db.js` — 6 matches (5 string lookups + 1 function definition)
- `grep "db-error-banner" assets/app.css` — 4 matches
- `grep "db-error-btn" assets/app.css` — 2 matches
- No `style.cssText` in banner functions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added color tokens to tokens.css**
- **Found during:** Task 1
- **Issue:** Plan referenced `--color-warning-bg`, `--color-info-bg`, `--color-danger-bg`, `--color-danger-text`, `--color-text-inverse` which did not exist in tokens.css
- **Fix:** Added 7 new semantic color tokens to tokens.css light-mode section (plan instructed to check and add if missing)
- **Files modified:** assets/tokens.css
- **Commit:** 9c650be (included in task commit)

## Known Stubs

None — all translations are complete for all 4 languages, all CSS classes are wired to their respective banner functions.

## Self-Check: PASSED

- assets/db.js exists with DB_STRINGS and dbStr function
- assets/app.css exists with .db-error-banner classes
- assets/tokens.css exists with new color tokens
- Commit 9c650be confirmed in git log
