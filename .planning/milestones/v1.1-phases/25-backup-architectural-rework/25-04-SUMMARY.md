---
phase: 25-backup-architectural-rework
plan: 04
subsystem: backup
tags: [backup, header-icon, cloud-color, schedule-aware, i18n, single-source-of-truth, tdd, behavior-test]
requires:
  - BackupManager IIFE (computeBackupRecencyState stub from Plan 02)
  - App.mountBackupCloudButton (Plan 02)
  - assets/overview.js openExportFlow / openImportFlow / formatRelativeTime
  - assets/app.js checkBackupReminder / showBackupBanner (legacy 7-day banner)
  - tests/24-04-app-cache.test.js (vm-sandbox-loading-app.js pattern)
provides:
  - BackupManager.getScheduleIntervalMs (single source of truth for backup-schedule interval ms)
  - BackupManager.getChipState (pure-function state derivation for the cloud icon)
  - BackupManager.computeBackupRecencyState now delegates to the above two (D-30)
  - App.updateBackupCloudState (post-mount cloud-icon updater)
  - App.checkBackupReminder + App.showBackupBanner (test seams for the D-15/D-19 behavior gate)
  - Four state-color CSS modifier classes (.backup-cloud-btn--never/--fresh/--warning/--danger)
  - 3 i18n title-text keys × 4 locales (overview.chip.lastBackup, overview.chip.never, overview.chip.separator)
  - tests/25-04-schedule-interval.test.js (9 cases)
  - tests/25-04-cloud-state.test.js (18 cases — 16 getChipState + 2 delegation)
  - tests/25-04-banner-suppression.test.js (4 cases — A schedule ON, B OFF stale, C OFF fresh, D defensive throw)
affects:
  - assets/backup.js (helpers added inside IIFE; computeBackupRecencyState body swapped to delegate)
  - assets/app.js (updateBackupCloudState declared + wired into initCommon; visibilitychange + app:language listeners; checkBackupReminder guard; test seams exported)
  - assets/app.css (Phase 25 band — 3 new state-color modifier rules; --never re-declared canonically)
  - assets/overview.js (App.updateBackupCloudState calls in openExportFlow + openImportFlow success paths)
  - assets/i18n-{en,he,de,cs}.js (12 lines total — 3 keys × 4 locales)
  - service worker CACHE_NAME (auto-bumped 3 times by pre-commit hook: v147 → v148 → v149 → v150)
tech_stack:
  added: []
  patterns:
    - Single-source-of-truth (D-30) — getScheduleIntervalMs + getChipState consumed by mount, post-mount updater, banner suppression, AND Plan 05's schedule fire (when it lands)
    - Boundary semantics — <= is fresh, > is escalation. Day-7 and 2×interval are inclusive
    - Falsifiable behavior test for D-15/D-19 — observes the DOM-write side-effect (document.body.prepend) inside checkBackupReminder rather than grepping source shape
    - Defensive try/catch — BackupManager helpers wrapped so legacy banner path still fires when the helper throws
    - Test seams — checkBackupReminder + showBackupBanner exported on App; no in-browser behavior change
key_files:
  created:
    - tests/25-04-schedule-interval.test.js
    - tests/25-04-cloud-state.test.js
    - tests/25-04-banner-suppression.test.js
    - .planning/phases/25-backup-architectural-rework/25-04-SUMMARY.md
  modified:
    - assets/backup.js
    - assets/app.js
    - assets/app.css
    - assets/overview.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - D-13: The cloud icon's background color IS the always-visible status surface (no chip element).
  - D-14: Warning is (interval, interval×2] and danger is > interval×2 — Ben confirmed 3-color intent 2026-05-15 (CONTEXT D-14 updated to remove the original 1.5×/2× gap).
  - D-15/D-19: Banner suppressed when schedule is active. Cloud icon remains the constant indicator.
  - D-30: Single source of truth — getScheduleIntervalMs feeds computeBackupRecencyState (which feeds mountBackupCloudButton + updateBackupCloudState) AND checkBackupReminder's banner suppression. One definition, four callers.
  - Test seams: checkBackupReminder + showBackupBanner exported as seams for the behavior test only — no in-browser change.
metrics:
  duration: ~6 min wall-clock between RED commit and Task 3 GREEN
  completed: 2026-05-15
  tasks: 3
  tests_added: 3 (9 + 18 + 4 = 31 assertions)
  tests_passing: 31 (this plan) + 50 across Phase 25 Plans 01/02/03/06 (no regressions)
  commits: 5 (3 task commits + 2 TDD RED commits for Tasks 1 and 3)
requirements: [D-08, D-13, D-14, D-15, D-19, D-27, D-28, D-30]
---

# Phase 25 Plan 04: Cloud Icon State Colors + Schedule-Coupled Thresholds + Banner Suppression — Summary

**One-liner:** Shipped the four state-color CSS modifier classes for the header cloud icon, the `App.updateBackupCloudState` post-mount updater, the schedule-coupled `BackupManager.getScheduleIntervalMs` + `getChipState` pure helpers (D-30 single source of truth), and the D-15/D-19 7-day banner suppression — all with TDD RED→GREEN, 31 new test assertions including the contracted falsifiable behavior gate for D-15/D-19.

## What Shipped

### Two New Pure Helpers on BackupManager (D-30)

`assets/backup.js` — added inside the IIFE BEFORE the public-API return:

| Helper                                         | Purpose                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `getScheduleIntervalMs()`                      | Reads `portfolioBackupScheduleMode` (+ `portfolioBackupScheduleCustomDays` for custom mode), returns interval ms or `null`. Single source of truth for Plan 04 icon + Plan 04 banner suppression + Plan 05 schedule fire. |
| `getChipState({ now, lastExport, intervalMs })` | Pure-function. Returns `'never' / 'fresh' / 'warning' / 'danger'`. Boundary inclusive (`<=` is fresh, `>` escalates). Function name retained for code-stability even though no chip element exists. |

`SCHEDULE_INTERVAL_MS` map is the canonical interval set: `{daily: 86400000, weekly: 604800000, monthly: 2592000000}`. Custom mode falls back to 7 days when the day count is missing, zero, or invalid (defensive).

Both exposed on the public-API return object:

```js
getScheduleIntervalMs: getScheduleIntervalMs,
getChipState: getChipState,
```

### Plan-02 Stub Body REPLACED — D-30 Delegation Proof

`computeBackupRecencyState` keeps its name + signature + public-API line. The body changed from the OFF-only inline math (Plan 02 stub) to a one-line delegation:

```js
function computeBackupRecencyState() {
  try {
    var raw = localStorage.getItem('portfolioLastExport');
    var lastExport = raw ? Number(raw) : null;
    return getChipState({ now: Date.now(), lastExport: lastExport, intervalMs: getScheduleIntervalMs() });
  } catch (_) {
    return 'never';
  }
}
```

The icon's **mount-time state class** (Plan 02 `mountBackupCloudButton`) and the **post-mount updater tick** (this plan's `updateBackupCloudState`) now share identical logic — they both call `computeBackupRecencyState`, which now routes through `getChipState + getScheduleIntervalMs`. D-30 single-source-of-truth is satisfied for this surface: when Plan 05 ships the Settings frequency selector and a user picks `weekly`, both the icon's color AND the banner suppression respond from the same definition without any duplicated threshold logic.

### Cloud Icon Updater — `App.updateBackupCloudState`

`assets/app.js` declares the updater immediately after `mountBackupCloudButton` (so callers find them adjacent). It is also exposed on the App public API.

**Behavior:**
- If `buttonEl` is null/missing → no-op (defensive: pages without the icon).
- Reads state via `BackupManager.computeBackupRecencyState()` — wrapped in try/catch, defaults to `'never'` if BackupManager throws.
- Removes ALL four `.backup-cloud-btn--{never|fresh|warning|danger}` classes, adds exactly one.
- Updates the `title` attribute to `{labelLastBackup} · {relativeTime}` (or `{labelLastBackup} · never`). Falls back to literal English if the i18n keys are missing (defensive).
- Reads `window.formatRelativeTime` (hoisted by Plan 02 in overview.js) with a `typeof === 'function'` guard so non-overview pages still get the static "never" fallback.

**Invocation points (3 channels firing the same updater):**

| Channel                | Where                                                                                            | When                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Post-mount initial     | `assets/app.js initCommon` — right after `mountBackupCloudButton + initSettingsLink + initBrandLinkGuard` | Every page load (after mount)              |
| `visibilitychange`     | `assets/app.js initCommon` listener (idempotent via `_backupVisibilityListenerInstalled` flag)   | Every time the page becomes visible        |
| `app:language`         | `assets/app.js initCommon` (alongside Plan 02's aria-label listener)                             | Every time the user switches locale (re-renders title text against the new locale's `formatRelativeTime` output) |
| Post-export            | `assets/overview.js openExportFlow` — right after `renderLastBackupSubtitle`                     | Every successful Export (encrypted or skipped) |
| Post-import            | `assets/overview.js openImportFlow` — right after `renderLastBackupSubtitle`                     | Every successful Import                    |

When Plan 05 ships a schedule fire, it can also call `App.updateBackupCloudState(document.getElementById('backupCloudBtn'))` after the scheduled export — the function is on the App public API for exactly that purpose.

### CSS State Map (D-13 / D-14)

`assets/app.css` Phase 25 band — the canonical four-state palette:

| Modifier                       | `background-color`                                                  | `color`                          | Token rationale                                                                 |
| ------------------------------ | ------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| `.backup-cloud-btn--never`     | `var(--color-surface-subtle, var(--color-surface-alt))`             | `var(--color-text-muted)`        | Neutral muted — first-time users see no alarm. Border outline preserves the affordance. |
| `.backup-cloud-btn--fresh`     | `var(--color-success-bg)`                                           | `var(--color-success-text)`      | Existing success token pair used elsewhere in the app for positive signals.     |
| `.backup-cloud-btn--warning`   | `var(--color-warning-bg)`                                           | `var(--color-warning-text)`      | Existing warning token pair (banner + chips throughout the app).                |
| `.backup-cloud-btn--danger`    | `var(--color-danger-bg)`                                            | `var(--color-danger-text)`       | Existing danger token pair (destructive callouts).                              |

All `var()` references come first; no new color literals introduced. The SVG glyph is drawn with `stroke="currentColor"` (Plan 02 markup), so the color modifier above re-paints the cloud icon to maintain WCAG AA contrast against the new background. The `--never` rule was provisionally shipped by Plan 02 — redefined here with identical tokens so the cascade keeps the canonical definition; Plan 04 owns the state-color map going forward.

### i18n (3 keys × 4 locales = 12 lines)

| Key                          | EN            | HE (D-27 noun form) | DE              | CS               |
| ---------------------------- | ------------- | ------------------- | --------------- | ---------------- |
| `overview.chip.lastBackup`   | `Last backup` | `גיבוי אחרון`       | `Letztes Backup` | `Poslední záloha` |
| `overview.chip.never`        | `never`       | `מעולם לא`          | `nie`            | `nikdy`           |
| `overview.chip.separator`    | ` · `         | ` · `               | ` · `            | ` · `             |

Hebrew uses noun forms (D-27): `גיבוי אחרון` is a phrase ("Last backup"), not an imperative; `מעולם לא` is the adverb form. DE/CS use literal Unicode per the one-time precedent established in Plan 25-01 SUMMARY (deviation #3). All 4 locale files parse as valid JavaScript (verified via `vm.runInNewContext`).

The key NAMES remain under the `overview.chip.*` namespace for code-stability — they were originally drafted as chip keys; they now drive the cloud icon's `title` attribute. The previously-drafted `overview.chip.ariaLabel` key was DELIBERATELY NOT introduced — the cloud icon's aria-label is `overview.backupRestore` from Plan 02; a separate chip-aria-label key would be obsolete (no chip DOM element exists).

### Banner Suppression Guard (D-15 / D-19)

`assets/app.js checkBackupReminder` — the early-return guard is now the **first non-comment statement** in the function body, BEFORE the existing snooze check:

```js
function checkBackupReminder() {
  // Phase 25 Plan 04 (D-15 / D-19) — when a backup schedule is active, …
  try {
    if (typeof BackupManager !== 'undefined' && typeof BackupManager.getScheduleIntervalMs === 'function') {
      if (BackupManager.getScheduleIntervalMs() !== null) return;
    }
  } catch (_) { /* defensive: fall through to legacy banner behavior */ }

  const snoozedUntil = localStorage.getItem("portfolioBackupSnoozedUntil");
  …
}
```

**File:line** — `assets/app.js` lines ~837–862 (`function checkBackupReminder`). The guard is wrapped in try/catch so pages where BackupManager throws still get the legacy banner. `showBackupBanner` itself is UNCHANGED — when the banner DOES fire (schedule OFF + stale), behavior is identical to pre-Plan-04.

**Behavior consequences:**
- User with no schedule (default): banner appears 7 days after last export — UNCHANGED.
- User who turns schedule ON in Settings (Plan 05): on the next page load, the banner does NOT appear even if more than 7 days have passed. The cloud icon color alone signals state.
- User who turns schedule OFF again: the banner re-appears as before (snooze key may still be present from a prior dismissal — D-15 accepts this; user can dismiss again).

### Test Seams Exported (Test-Only)

`assets/app.js` App return object — added three new exports:

```js
updateBackupCloudState: updateBackupCloudState,   // Production helper — wired into export/import/visibility/language
checkBackupReminder:    checkBackupReminder,      // Test seam — D-15/D-19 behavior test
showBackupBanner:       showBackupBanner,         // Test seam — referenced for debugging; in-app behavior unchanged
```

The two seams (`checkBackupReminder`, `showBackupBanner`) are added solely so the vm-sandbox behavior test can call them directly. The in-browser call sites at `assets/app.js` line ~599 and inside `checkBackupReminder` are UNCHANGED — there is no behavior change in the browser from these exports.

### Tests (3 files, 31 assertions, all PASS)

#### tests/25-04-schedule-interval.test.js — 9 cases

| Case                                                                          | Expected           |
| ----------------------------------------------------------------------------- | ------------------ |
| No key set                                                                    | `null`             |
| `portfolioBackupScheduleMode='off'`                                           | `null`             |
| `portfolioBackupScheduleMode='daily'`                                         | `86400000`         |
| `portfolioBackupScheduleMode='weekly'`                                        | `604800000`        |
| `portfolioBackupScheduleMode='monthly'`                                       | `2592000000`       |
| `portfolioBackupScheduleMode='custom'` (no days)                              | `7 * 86400000`     |
| `portfolioBackupScheduleMode='custom'` + `portfolioBackupScheduleCustomDays='3'` | `3 * 86400000`  |
| `portfolioBackupScheduleMode='custom'` + `customDays='0'` (invalid)           | `7 * 86400000`     |
| `portfolioBackupScheduleMode='nonsense'`                                      | `null`             |

#### tests/25-04-cloud-state.test.js — 18 cases (16 `getChipState` + 2 delegation)

`getChipState` table — boundary inclusive at day-7 AND at 2×interval:
- `lastExport=null/undefined/NaN` → `'never'` (3 rows)
- OFF mode (intervalMs=null): 6 rows covering 1d/6d/7d (fresh boundary) → 8d/14d (warning boundary) → 15d (danger)
- ON weekly (intervalMs=7d): 6 rows covering 1d/7d (fresh boundary) → 8d/11d/14d (warning, including the D-14 2026-05-15 fix proof) → 15d (danger)
- ON daily (intervalMs=1d) + 30d-stale → `'danger'` (far beyond 2×1d)

`computeBackupRecencyState` delegation proof (D-30):
- Empty localStorage → `'never'`
- `portfolioLastExport = Date.now() - 3d` → `'fresh'`

#### tests/25-04-banner-suppression.test.js — 4 sub-cases (the load-bearing D-15/D-19 gate)

This is the contracted falsifiable behavior gate per VALIDATION.md (line 51) and project memory `feedback-behavior-verification.md`. Confirms BEHAVIOR (the guard short-circuits the banner render path at runtime), not just SHAPE (the guard exists in source).

| Sub-case | Setup                                                                | Expected `bannerRendered` |
| -------- | -------------------------------------------------------------------- | ------------------------- |
| A        | `BackupManager.getScheduleIntervalMs = () => 86400000` (daily), 30d stale | `0` (suppressed)          |
| B        | `BackupManager.getScheduleIntervalMs = () => null` (OFF), 8d stale       | `1` (legacy 7-day fires)  |
| C        | `BackupManager.getScheduleIntervalMs = () => null` (OFF), 1d fresh       | `0` (no false positives)  |
| D        | `BackupManager.getScheduleIntervalMs = () => { throw }`, 10d stale       | `1` (defensive fall-through) |

**Spy mechanism:** the test intercepts `document.body.prepend` and counts any prepended node whose `id === 'backupBanner'` or whose `className` contains `'backup-banner'`. This is the most behavior-faithful spy because it observes the actual DOM-write side-effect inside `showBackupBanner` — not a function reference replacement that could miss the closure-bound call. `createElement` is re-stubbed minimally so the in-app `showBackupBanner` (which sets `banner.id = "backupBanner"` and `banner.className = "..."`) produces a detectable node.

**Sandbox detail:** `BackupManager` is exposed on `sandbox.BackupManager` (vm context global) rather than `sandbox.window.BackupManager`. The `typeof BackupManager` check inside `checkBackupReminder` resolves against the vm context global scope — setting only `sandbox.window.BackupManager` is invisible to that lookup. Documenting this for future test authors.

### Plan-Wide Grep Gates (all PASS)

| Gate                                                                   | Result |
| ---------------------------------------------------------------------- | ------ |
| `getScheduleIntervalMs: getScheduleIntervalMs` in backup.js            | PASS   |
| `getChipState: getChipState` in backup.js                              | PASS   |
| `computeBackupRecencyState: computeBackupRecencyState` in backup.js    | PASS   |
| Both helpers defined (`function getScheduleIntervalMs|function getChipState` count = 2) | PASS |
| `computeBackupRecencyState` body delegates (`getChipState\(.*intervalMs`) | PASS |
| `function updateBackupCloudState` in app.js                            | PASS   |
| `updateBackupCloudState: updateBackupCloudState` exposed on App        | PASS   |
| `updateBackupCloudState\(` in overview.js → 2 occurrences              | PASS   |
| `App.updateBackupCloudState(document.getElementById('backupCloudBtn'` in overview.js → 2 | PASS |
| `visibilitychange` listener in app.js                                  | PASS   |
| `.backup-cloud-btn--(never|fresh|warning|danger)` in app.css → 6 lines | PASS   |
| 3 chip keys present in all 4 locale files                              | PASS   |
| `overview.chip.ariaLabel` NOT reintroduced (count = 0)                 | PASS   |
| `BackupManager.getScheduleIntervalMs() !== null` in checkBackupReminder | PASS   |
| Guard appears BEFORE snooze check (index-based comparison)             | PASS   |
| `checkBackupReminder: checkBackupReminder` + `showBackupBanner: showBackupBanner` seams exported | PASS |
| `class="backup-chip` substring in any source/HTML → 0 matches           | PASS   |

## Commits

| Hash      | Type     | Subject                                                                              |
| --------- | -------- | ------------------------------------------------------------------------------------ |
| `dc1cc0f` | `test`   | RED — getScheduleIntervalMs + getChipState pure-function tests fail                  |
| `2190346` | `feat`   | GREEN — getScheduleIntervalMs + getChipState + delegating compute body (Task 1)      |
| `a14e397` | `feat`   | cloud icon state-color CSS + App.updateBackupCloudState + i18n keys (Task 2)         |
| `5afa4fb` | `test`   | RED — banner-suppression behavior test fails (D-15/D-19 gate)                        |
| `95170af` | `feat`   | GREEN — banner-suppression guard + test seams (D-15/D-19) (Task 3)                   |

The three `feat(...)` commits each triggered the pre-commit hook's automatic `sw.js` `CACHE_NAME` bump (`v147` → `v148` → `v149` → `v150`) because cached assets were modified. Per `memory/reference-pre-commit-sw-bump.md`, this is the project's established convention; no manual `chore` follow-up needed since `PRECACHE_URLS` did not grow.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] `sandbox.window.BackupManager` invisible to `typeof BackupManager`**

- **Found during:** Task 3 GREEN verify pass (sub-case A failed).
- **Issue:** My initial test setup followed the plan's `<behavior>` description literally and assigned `sandbox.window.BackupManager = { getScheduleIntervalMs: () => 86400000 }`. But the `typeof BackupManager !== 'undefined'` check inside `checkBackupReminder` resolves against the vm context's **global scope**, not against `sandbox.window`. The test reported "1 !== 0" for sub-case A — the guard was not finding BackupManager and falling through to the legacy banner path. (Sub-cases B/D happened to pass because the test wanted the banner to render anyway; sub-case C passed because the lastExport was fresh.)
- **Fix:** Switched all three `sandbox.window.BackupManager = …` assignments to `sandbox.BackupManager = …`. The guard now sees BackupManager via the vm context's global scope. All 4 sub-cases pass.
- **Files modified:** `tests/25-04-banner-suppression.test.js`
- **Commit:** Folded into `95170af` (Task 3 GREEN — the diff includes both the fix and the production-code guard so the test's RED→GREEN transition is preserved in git history).
- **Note for future test authors:** documented inline in the test file's sandbox-setup comment. The same pattern applies to any vm-sandbox test exercising `typeof X !== 'undefined'` lookups inside app.js — the symbol must live on `sandbox.X`, not `sandbox.window.X`.

### Cosmetic Deviations

None.

## Threat Closure (from PLAN.md `<threat_model>`)

| ID          | Disposition | Status                                                                                                                                       |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| T-25-04-01  | accept      | **As planned.** Single-user app; localStorage tampering is purely self-inflicted, not a multi-tenant boundary breach.                        |
| T-25-04-02  | accept      | **As planned.** Title text reveals "8 days ago" — same user, same device; no cross-tenant disclosure model exists. No NEW disclosure beyond the color signal Plan 02 already exposes. |
| T-25-04-03  | mitigate    | **CLOSED.** The cloud icon's background color is the constant-visibility signal. Suppressing the banner does NOT remove user awareness — it changes the channel. The icon escalates `--fresh → --warning → --danger` exactly when the banner would have. Plan 05's interval-end prompt provides the active reminder channel in schedule-ON mode. |

## Hand-offs

### To Plan 05 (Scheduled-backup Settings tab)

- `BackupManager.getScheduleIntervalMs()` is the **single source of truth** for schedule-interval reads. Plan 05's interval-end-prompt scheduler MUST call this — do NOT redefine the `SCHEDULE_INTERVAL_MS` map.
- `BackupManager.getChipState({ now, lastExport, intervalMs })` is available as a pure helper if Plan 05 wants to derive state outside of the icon (e.g., for the Settings Backups tab "how long since last backup" indicator).
- After a scheduled export completes, Plan 05 should call:
  ```js
  App.updateBackupCloudState(document.getElementById('backupCloudBtn'));
  ```
  This refreshes the icon's color/title outside the visibilitychange tick (so the user sees the immediate flip without changing tabs).
- The 7-day banner is already suppressed when `getScheduleIntervalMs()` returns a positive number — Plan 05 ships the UI to set that mode (via `portfolioBackupScheduleMode`) but does NOT need to touch `checkBackupReminder`.

### To Plan 08 (Single-source export refactor)

- The state-color CSS map is canonical — if Plan 08 adds a new export entry point, it should reuse `updateBackupCloudState` rather than touching the icon directly.

### To `assets/i18n-*.js` maintainers

- The 3 new `overview.chip.*` keys are now part of the 4-locale parity contract. Future locale additions must ship all three.
- The `overview.chip.ariaLabel` key is deliberately NOT present in any locale file. Do NOT reintroduce — the cloud icon's aria-label is `overview.backupRestore`.

## TDD Gate Compliance

Plan 04 has `type: execute` (not `type: tdd`), but Tasks 1 and 3 carry `tdd="true"`. Verified in git log:

| Task | RED commit (`test(...)`) | GREEN commit (`feat(...)`) |
| ---- | ------------------------ | -------------------------- |
| 1    | `dc1cc0f`                | `2190346`                  |
| 3    | `5afa4fb`                | `95170af`                  |

Task 2 has no `tdd="true"` flag — pure shipping work (CSS + i18n + updater wiring + grep gates) with no RED gate required.

## Self-Check: PASSED

| Claim                                                                        | Verification                                                                                       | Result |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| tests/25-04-schedule-interval.test.js exists + 9 cases pass                  | `[ -f tests/25-04-schedule-interval.test.js ] && node …`                                           | FOUND + PASS |
| tests/25-04-cloud-state.test.js exists + 18 cases pass                       | `[ -f tests/25-04-cloud-state.test.js ] && node …`                                                 | FOUND + PASS |
| tests/25-04-banner-suppression.test.js exists + 4 cases pass                 | `[ -f tests/25-04-banner-suppression.test.js ] && node …`                                          | FOUND + PASS |
| Commit dc1cc0f (Task 1 RED) exists                                            | `git log --oneline \| grep -q dc1cc0f`                                                             | FOUND  |
| Commit 2190346 (Task 1 GREEN) exists                                          | `git log --oneline \| grep -q 2190346`                                                             | FOUND  |
| Commit a14e397 (Task 2) exists                                                | `git log --oneline \| grep -q a14e397`                                                             | FOUND  |
| Commit 5afa4fb (Task 3 RED) exists                                            | `git log --oneline \| grep -q 5afa4fb`                                                             | FOUND  |
| Commit 95170af (Task 3 GREEN) exists                                          | `git log --oneline \| grep -q 95170af`                                                             | FOUND  |
| All 4 locale files parse as valid JavaScript with the 3 new keys             | `vm.runInNewContext` of each file + key lookup                                                     | PASS   |
| No Phase 25-01/02/03/06 tests regressed                                       | 12 test files, 50 assertions outside this plan — all still PASS                                    | PASS   |
| Banner-suppression behavior gate (D-15/D-19) closes the falsifiable-behavior gap from `memory/feedback-behavior-verification.md` | tests/25-04-banner-suppression.test.js exits 0 with 4 cases covering ON/OFF/fresh/throw  | PASS   |
| All `<verify>` grep + node-script gates from PLAN.md Tasks 1/2/3 pass        | Manual run of every gate above the table                                                           | PASS   |

Verified by command-line run after the final Task-3 GREEN commit `95170af`.
