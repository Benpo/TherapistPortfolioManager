---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 16
subsystem: ui
tags: [backup, restore, i18n, theme, personalization, never-clobber, tdd, gap-closure]

# Dependency graph
requires:
  - phase: 37-06
    provides: the F5 date-format picker + portfolioDateFormat/portfolioSessionTypes localStorage scalars this restore path round-trips
  - phase: 37-15
    provides: the shipped WR-02 faithful-mirror restore semantics + the Overview in-place __afterBackupRestore hook this plan closes gaps against
provides:
  - "Overview restore re-applies restored language + document dir + translations + theme + greeting immediately, no navigation (GAP-1, Direction A)"
  - "App.applyTheme(theme) — shared data-theme apply seam reused by the header theme toggle AND the restore hook"
  - "backup.js never-clobber restore for dateFormat/sessionTypes — an absent/present-null source field never overwrites the target's customization (GAP-2, WR-02)"
affects: [any future backup/restore work, any page relying on the Overview in-place restore refresh]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "In-place restore refresh re-runs the EXACT runtime toggle path (App.setLanguage → lang + documentElement.dir + applyTranslations) rather than a hand-rolled partial re-translate; language/theme applied BEFORE the list re-render so they take visible effect even if the render is slow or throws"
    - "Shared applyTheme(theme) seam: only the exact value 'dark' enables dark mode; any other (incl. untrusted restored) value removes the attribute (T-37-16-02)"
    - "Never-clobber restore: plain truthiness guard (no in-check, no removeItem else) so an empty/absent source scalar leaves the target's own value untouched"

key-files:
  created:
    - .planning/phases/37-date-consistency-date-format-setting-f6-f5/37-16-SUMMARY.md
  modified:
    - assets/app.js (extracted exported applyTheme seam; theme toggle reuses it; window.App export)
    - assets/overview.js (__afterBackupRestore re-applies language + theme + greeting before loadOverview)
    - assets/backup.js (dateFormat/sessionTypes restore reverted to never-clobber truthiness guards; WR-02 comment rewritten)
    - tests/37-personalization.test.js (new falsifiable GAP-1 behavior test; flipped test #16 to never-clobber; count guard 18→19)

key-decisions:
  - "GAP-1 implemented via option (a) — re-apply inside the in-place hook reusing App.setLanguage/App.applyTheme — NOT location.reload() (option b), because reload is a no-op under jsdom and would degrade the required behavior test to merely spying that reload was called; option (a) also keeps the Overview no-reload nicety"
  - "Language re-apply goes through App.setLanguage (never a hand-rolled applyTranslations/dir assignment) so the restore path and the language toggle stay one code path"
  - "GAP-2 reverted the shipped faithful-mirror (present-null RESETS via removeItem) to never-clobber: a backup carrying no explicit custom value must never wipe a therapist's chosen date format / session-type list"

patterns-established:
  - "GAP-1 test settles the Overview DOMContentLoaded boot on the English baseline FIRST (PortfolioDB stub) so the __afterBackupRestore hook is the SOLE driver of the he/dark flip — removes a boot-vs-localStorage timing confound while keeping the hook the real subject under test"

status: complete
---

# Phase 37 Plan 16: Date-Consistency Gap Closure (GAP-1 restore re-apply, GAP-2 never-clobber) Summary

Closed the two Phase 37 UAT gaps (test 5 major, test 8 minor). GAP-1: on the Overview page a backup restore wrote the restored `portfolioLang`/`portfolioTheme` to localStorage but never re-applied them to the live UI (the in-place refresh hook only re-rendered the client list) — now the hook re-runs the real `App.setLanguage` + `App.applyTheme` + `renderGreeting` before the list re-render, so a restore whose stored language/theme differ from the current UI flips the visible language, document direction, translated text, and theme immediately with no navigation (Direction A, LOCKED). GAP-2: reverted the shipped faithful-mirror restore semantics (a present-null field RESET a customized target via `removeItem`) to a plain never-clobber truthiness guard, so a restore never silently wipes a therapist's chosen date format / session-type list.

## What Was Built

**Task 1 — GAP-1: restore re-applies language + theme + re-translates the Overview (commit e2dcc85, TDD)**
- `assets/app.js`: extracted an exported `applyTheme(theme)` that mirrors the toggle's DOM apply exactly (`data-theme='dark'` only when `theme === 'dark'`, otherwise remove the attribute). The `initThemeToggle` click handler now calls `applyTheme(next)` (behavior-preserving; keeps `localStorage.setItem` + `updateIcon`). `applyTheme` added to the `window.App` exports alongside `setLanguage`.
- `assets/overview.js`: `window.__afterBackupRestore` now re-applies `App.setLanguage(localStorage.getItem('portfolioLang') || 'en')` (re-runs language + `documentElement.dir` + `applyTranslations`), `App.applyTheme(localStorage.getItem('portfolioTheme'))`, then `renderGreeting()` — all BEFORE the existing `loadOverview()` + `renderLastBackupSubtitle()`. Ordering is load-bearing: language + theme apply first so they take visible effect even if the list re-render is slow or throws. No `location.reload()`.
- `tests/37-personalization.test.js`: new falsifiable behavior test (#18) drives the REAL `window.__afterBackupRestore` hook + real `App.setLanguage`/`App.applyTheme` (no stubs of either or the hook). It seeds `portfolioLang='he'` + `portfolioTheme='dark'` (the exact restore delta), then asserts `dir='rtl'`, `documentElement.lang='he'`, a `data-i18n="nav.overview"` element flips English→Hebrew, and `data-theme='dark'`. Count guard bumped 18→19.

**Task 2 — GAP-2: never-clobber restore (commit 5b23128)**
- `assets/backup.js`: replaced the `dateFormat` and `sessionTypes` restore blocks (`if ("field" in manifest.settings) { …setItem… } else { …removeItem… }`) with plain truthiness guards (`if (manifest.settings.field) { …setItem… }`) — dropped the `in`-check and the `removeItem` else-branch for both. An absent OR present-null source field now leaves the target's existing customization untouched; only an explicit non-default value applies. Rewrote the WR-02 comment block to describe never-clobber with no stale "faithful mirror"/"removeItem" wording (kept the note that the session-type list round-trips via localStorage, not the therapistSettings loop, per 37-PATTERNS.md A2).
- `tests/37-personalization.test.js`: flipped test #16 from RESET (faithful-mirror) to RETAIN (never-clobber), still driving the REAL `backup.js` export→restore via `buildBackupSandbox`. SOURCE leaves both keys unset (manifest stores null); TARGET is customized (`portfolioDateFormat='mm/dd/yyyy'`, a seeded custom session-type JSON). After `importBackup`, it asserts both keys RETAIN the target's values. Section header + test name updated to describe retention.

## RED Confirmation (Task 1 TDD)

The GAP-1 behavior test was authored and run BEFORE touching `app.js`/`overview.js`. First RED run failed on the theme assertion; investigation revealed the Overview `DOMContentLoaded` boot handler fires in the eval'd env and raced with the localStorage delta (a test-environment confound, not the hook). The test was hardened to stub `PortfolioDB` and `await settle()` so the boot lands on the English baseline first, making `__afterBackupRestore` the sole driver of the he/dark flip. The hardened test then failed cleanly on the FIRST assertion (`'ltr' !== 'rtl'`), with all three assertions verified RED against pre-fix code (dir stayed ltr, lang en, text English, `data-theme` unset). After the GREEN implementation the same test passes.

## Verification

- `npm test` (plain, never piped): **124 test files passed, 0 failed** — twice, once after each task.
- `tests/37-personalization.test.js` in isolation: **19 passed, 0 failed** (new GAP-1 test GREEN; flipped #16 GREEN).
- GAP-1 proven by executing the REAL hook (not a stub) and observing the immediate document dir + lang + translated-text + theme flip with no navigation.

## Deviations from Plan

**1. [Rule 3 - Blocking test-env issue] Overview DOMContentLoaded boot confound in the GAP-1 test**
- **Found during:** Task 1 RED authoring.
- **Issue:** Eval'ing `overview.js` into the jsdom env registers its `DOMContentLoaded` boot handler, which fires asynchronously and calls `App.initCommon()` (→ `setLanguage(storedLang)`) + `loadOverview()`. Because it fired AFTER the test set `portfolioLang='he'`, it flipped dir/lang to Hebrew on its own (masking the hook under test) and then threw an uncaught `PortfolioDB is not defined` rejection that crashed the process.
- **Fix:** Stub `win.PortfolioDB` (getAllClients/getAllSessions → `[]`) so the boot settles cleanly, and `await settle()` after eval so the boot completes on the English baseline BEFORE the test changes localStorage and drives the hook. The hook remains the real, un-stubbed subject; only the boot's ambient dependency is stubbed.
- **Files modified:** tests/37-personalization.test.js
- **Commit:** e2dcc85

## Threat Surface

No new security-relevant surface beyond the plan's `<threat_model>`. T-37-16-02 mitigation is honored: `applyTheme` sets `data-theme='dark'` only for the exact value `'dark'`, otherwise removes the attribute — an arbitrary/untrusted restored theme string cannot inject markup or an unexpected attribute value. GAP-2 reduces write surface (removes the `removeItem` path).

## Manual UAT Follow-up (not a code task)

Per the plan's verification note: re-run original UAT test 5 (date-format-in-export smoke) on the live deploy — log/save a session, export, and confirm dates render in the chosen format in UI + export. This smoke was never reached originally because the language reverted mid-flow; it needs a clean manual re-run now that GAP-1 lands.
