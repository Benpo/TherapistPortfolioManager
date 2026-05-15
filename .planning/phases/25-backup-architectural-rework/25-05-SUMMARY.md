---
phase: 25-backup-architectural-rework
plan: 05
subsystem: backup
tags: [backup, settings, schedule, folder-picker, interval-end-prompt, password-mandatory, tdd, single-source-of-truth, i18n]
requires:
  - BackupManager.getScheduleIntervalMs (Plan 04 single-source helper)
  - BackupManager.pickBackupFolder + isAutoBackupSupported (pre-existing)
  - window.openBackupModal (Plan 02)
  - App.confirmDialog with tone:'neutral' (Phase 21 pattern)
  - assets/settings.js boot() tab-switcher (Phase 24 Plan 05) — auto-discovers new data-tab/aria-controls
provides:
  - BackupManager.checkBackupSchedule (foreground D-17 interval-end fire, 1h debounced)
  - BackupManager.canEnableSchedule (D-18 password-mandatory pure gate)
  - Settings → Backups tab (frequency selector + password-acked callout + folder picker + ON→OFF confirm)
  - Settings → Photos tab SHELL (Plan 07 will fill the body)
  - 26 new i18n keys × 4 locales for the Backups tab (24 schedule.* + 2 settings.tab.* gated by verify; +2 extras helper/customDaysLabel)
  - Foreground page-load + visibilitychange listeners that call BackupManager.checkBackupSchedule
  - tests/25-05-schedule-fires.test.js (2 cases)
  - tests/25-05-schedule-debounce.test.js (2 cases)
  - tests/25-05-schedule-password-mandatory.test.js (7 cases)
affects:
  - assets/backup.js (helpers added inside IIFE before public-API return; 2 new entries on the return object)
  - assets/app.js (BackupManager.checkBackupSchedule + visibilitychange listener wired into initCommon)
  - settings.html (2 new tab buttons + 2 new tabpanels)
  - assets/settings.js (URL whitelist extended; new IIFE for the Backups tab handlers)
  - assets/i18n-{en,he,de,cs}.js (26 new keys per locale)
  - service worker CACHE_NAME (auto-bumped by pre-commit hook: v150 → v151 → v152)
tech_stack:
  added: []
  patterns:
    - Single-source-of-truth (D-30) — settings.js consumes BackupManager.canEnableSchedule + checkBackupSchedule rather than redefining the interval map; D-30 audit clean (zero literal-millisecond constants in settings.js)
    - Deterministic test injection — checkBackupSchedule(opts) accepts opts.now so unit tests run without real-clock drift
    - 1-hour debounce keyed on localStorage.portfolioBackupSchedulePromptedAt — prevents prompt-loop on rapid visibilitychange flips
    - Idempotent listener registration — initCommon._backupScheduleListenerInstalled flag mirrors the Plan 04 _backupVisibilityListenerInstalled pattern
    - Defensive cascade — every BackupManager call in app.js / settings.js is wrapped in typeof guards + try/catch so legal/disclaimer pages never throw
    - Hebrew noun/infinitive enforcement (D-27) — בחירת, כיבוי, השארת, בחירה (gerund nouns), never imperatives
key_files:
  created:
    - tests/25-05-schedule-fires.test.js
    - tests/25-05-schedule-debounce.test.js
    - tests/25-05-schedule-password-mandatory.test.js
    - .planning/phases/25-backup-architectural-rework/25-05-SUMMARY.md
  modified:
    - assets/backup.js
    - assets/app.js
    - settings.html
    - assets/settings.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - D-11 Folder picker MOVED from overview body into Settings → Backups tab (folder is co-located with the schedule it serves).
  - D-16 Frequency selector: Off / Daily / Weekly / Monthly / Custom (days, 1..365 clamped).
  - D-17 Interval-end prompt fires by opening the unified Backup & Restore modal via window.openBackupModal — D-20 prohibits silent folder-write, so the user must press Export themselves.
  - D-18 Password-mandatory enforced through BackupManager.canEnableSchedule pure helper AND through the UI handler (revert + inline error). Two-channel enforcement, single source of truth.
  - D-19 The 7-day banner is already suppressed by Plan 04's guard when getScheduleIntervalMs() returns non-null — this plan does not modify checkBackupReminder.
  - D-27 Hebrew strings use noun/infinitive forms throughout (no imperative verbs).
  - D-28 4-locale parity verified (462 keys per locale post-edit; both Latin + Hebrew + Czech diacritics parse cleanly).
  - D-30 Single-source-of-truth: settings.js never redefines SCHEDULE_INTERVAL_MS — confirmed by negative grep gate (zero matches in settings.js for the millisecond constants).
  - Schedule password is NOT persisted (UI-SPEC A1 / RESEARCH Open Q1). Only the boolean acknowledgement portfolioBackupSchedulePasswordAcked is written. Re-prompt every fire is the contract.
metrics:
  duration: ~25 min wall-clock RED→Task 2 GREEN
  completed: 2026-05-15
  tasks: 2
  tests_added: 3 (2 + 2 + 7 = 11 assertions)
  tests_passing: 92 across Phase 25 (16 files; this plan contributes 11; no regressions)
  commits: 3 (1 RED + 2 GREEN); pre-commit hook auto-bumped sw.js CACHE_NAME twice (v150 → v151 → v152)
requirements: [D-11, D-16, D-17, D-18, D-19, D-20, D-26, D-27, D-28, D-30]
---

# Phase 25 Plan 05: Scheduled-Backup Settings Tab + Foreground Schedule Fire — Summary

**One-liner:** Shipped the Settings → Backups tab (frequency selector + D-18 password-mandatory gate + D-11 folder picker + neutral-tone disable confirm), the foreground `BackupManager.checkBackupSchedule` helper with a 1-hour debounce, and the page-load + visibilitychange listeners that fire the interval-end prompt by opening the unified Backup & Restore modal — TDD RED→GREEN with 11 new test assertions and a clean D-30 single-source-of-truth audit.

## What Shipped

### Two New Pure Helpers on `BackupManager` (D-17 / D-18)

`assets/backup.js` — added inside the IIFE BEFORE the public-API return:

| Helper                              | Purpose                                                                                                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkBackupSchedule({ now? })`     | Foreground interval-end check. Reads `getScheduleIntervalMs()` + `portfolioLastExport` + the 1-hour debounce key, opens `window.openBackupModal()` when due. `opts.now` exists for tests.    |
| `canEnableSchedule(mode)`           | D-18 pure boolean gate. Returns `true` for `mode === 'off'` (always allowed); otherwise returns `portfolioBackupSchedulePasswordAcked === 'true'`.                                            |

Both exposed on the public-API return object:

```js
checkBackupSchedule: checkBackupSchedule,
canEnableSchedule: canEnableSchedule,
```

**Three crucial properties of `checkBackupSchedule`:**

1. **Deterministic time injection.** Reads `opts.now` if provided; falls back to `Date.now()` for production. The three tests pass explicit `now` values so no real-clock drift can flake the assertions.
2. **Schedule OFF early-return.** When `getScheduleIntervalMs()` returns `null` (mode='off' or unset), the helper exits before touching `portfolioLastExport`. The legacy 7-day banner (Plan 04 has not suppressed it in OFF mode) handles reminders.
3. **1-hour debounce.** Keyed on `localStorage.portfolioBackupSchedulePromptedAt`. Even if the user flips tabs rapidly, the prompt cannot re-fire within 60 minutes. The stamp is written ONLY on a successful fire — never refreshed inside the debounce window.

**Two crucial properties of `canEnableSchedule`:**

1. **Pure (no DOM, no async).** Tests run it as a 7-case table against a Map-backed localStorage stub.
2. **`'off'` ALWAYS allowed.** D-18 only gates the ON transition. The user can always disable a schedule (subject to the separate ON→OFF confirm in the UI layer).

### Foreground Page-Load + `visibilitychange` Registration

`assets/app.js initCommon` — appended after `checkBackupReminder()` is called:

```js
if (typeof BackupManager !== 'undefined' && typeof BackupManager.checkBackupSchedule === 'function') {
  try { BackupManager.checkBackupSchedule(); } catch (_) {}
  if (!initCommon._backupScheduleListenerInstalled) {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        try { BackupManager.checkBackupSchedule(); } catch (_) {}
      }
    });
    initCommon._backupScheduleListenerInstalled = true;
  }
}
```

**Defensive guards (three layers):**
- `typeof BackupManager !== 'undefined'` — legal disclaimer + license pages do not load `backup.js`.
- `typeof BackupManager.checkBackupSchedule === 'function'` — guards against a partial load.
- Outer `try/catch` — guards against `localStorage` access errors on legal pages.

**Idempotent listener installation** mirrors the Plan 04 pattern: `initCommon._backupScheduleListenerInstalled` flag prevents duplicate registration if `initCommon` is ever invoked more than once.

### Settings → Backups Tab (D-11 / D-16 / D-18 / D-19)

`settings.html` — 2 new tab buttons + 2 new tabpanels appended after the existing Snippets tabpanel:

| Element ID                       | Role                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| `settingsTabBackupsBtn`          | New `[role="tab"]` button (3rd in tablist). `data-tab="backups"` `aria-controls="settingsTabBackups"`. |
| `settingsTabBackups`             | The Backups tabpanel.                                                                          |
| `settingsTabPhotosBtn`           | New `[role="tab"]` button (4th in tablist). `data-tab="photos"` `aria-controls="settingsTabPhotos"`. |
| `settingsTabPhotos`              | Photos tabpanel SHELL — header only; Plan 07 fills the body.                                  |
| `scheduleFrequencySelect`        | `<select>` with 5 options: off / daily / weekly / monthly / custom.                            |
| `scheduleCustomDaysWrapper`      | Hidden by default; surfaces a clamped `<input type="number" min=1 max=365>` when custom selected. |
| `scheduleCustomDays`             | The day-count input.                                                                            |
| `scheduleFrequencyHelper`        | Flips between `helperOff` and `helperOn` copy based on the persisted mode.                     |
| `schedulePasswordCallout`        | D-18 callout div using `.backup-reminder-banner` warning palette.                              |
| `schedulePasswordAcked`          | Acknowledgement checkbox writing `portfolioBackupSchedulePasswordAcked`.                       |
| `schedulePasswordError`          | Inline error surfaced when the gate rejects a non-Off transition. Hidden by default.          |
| `scheduleFolderField`            | The folder picker section wrapper.                                                              |
| `scheduleFolderState`            | Reflects the picked folder name or "No folder chosen." Visible on Chromium browsers.            |
| `scheduleFolderPickBtn`          | Click → `BackupManager.pickBackupFolder()`. Hidden on Safari/Firefox.                          |
| `scheduleFolderUnsupported`      | Visible on Safari/Firefox (where `isAutoBackupSupported()` returns false).                     |

The existing `settings.js boot()` tab-switcher at line ~1802 auto-discovers any `data-tab` / `aria-controls` pair, so the new tabs participate in keyboard navigation (ArrowLeft / ArrowRight / Home / End) without any boot-time edits beyond the `readUrlTab()` whitelist extension.

### `assets/settings.js` — Backups Tab Handlers

New IIFE at the end of the file. Six functions:

| Function                              | Purpose                                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `readScheduleMode/PasswordAcked/CustomDays/FolderName` | Defensive localStorage readers (try/catch wrappers).                                      |
| `tt(key, fallback)`                   | Safe `App.t` wrapper that returns the supplied fallback when i18n hasn't loaded yet.       |
| `refreshFrequencyHelper`              | Re-renders the helper line with `helperOff` or `helperOn` copy based on the current mode. |
| `refreshCustomDaysVisibility`         | Shows/hides the custom-days wrapper.                                                       |
| `refreshFolderState`                  | Renders one of: "No folder chosen." / "Folder: {name} — Re-pick" / unsupported message.   |
| `applyFrequencyChange(newMode)`       | The CORE handler. D-18 gate (via `BackupManager.canEnableSchedule`) → ON→OFF confirm via `App.confirmDialog({ tone: 'neutral' })` → persists the mode + the helper. Returns true/false. |
| `bindBackupsTab`                      | Mounts on `DOMContentLoaded`. Hydrates the form, wires change handlers for select/customDays/ack/folder.|

**Two behaviorally-important details:**

1. **Unchecking the password-acked checkbox while a schedule is active force-disables the schedule.** This preserves the D-18 invariant: a schedule cannot live without an acknowledged password. The handler sets `sel.value = 'off'` and re-runs `applyFrequencyChange('off')`.
2. **ON→OFF confirm uses `tone: 'neutral'`** per UI-SPEC. Disabling is reversible (the 7-day banner returns), so the confirm button is button-primary green, not destructive red. `App.confirmDialog` (app.js:735) automatically swaps the button class on `tone:'neutral'` and restores it on close.

### i18n (26 new keys × 4 locales)

`assets/i18n-{en,he,de,cs}.js` — appended adjacent to the existing `settings.tab.*` keys.

The 24 verified-by-grep-gate keys per locale:

| Key                                | EN                                                                                       | HE (D-27 noun forms)                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `settings.tab.backups`             | Backups                                                                                  | גיבויים                                                                                              |
| `settings.tab.photos`              | Photos                                                                                   | תמונות                                                                                               |
| `schedule.heading`                 | Scheduled backups                                                                        | גיבויים מתוזמנים                                                                                     |
| `schedule.frequency.label`         | Backup frequency                                                                         | תדירות גיבוי                                                                                         |
| `schedule.frequency.off`           | Off                                                                                      | כבוי                                                                                                |
| `schedule.frequency.daily`         | Daily                                                                                    | יומי                                                                                                |
| `schedule.frequency.weekly`        | Weekly                                                                                   | שבועי                                                                                                |
| `schedule.frequency.monthly`       | Monthly                                                                                  | חודשי                                                                                                |
| `schedule.frequency.custom`        | Custom (days)                                                                            | מותאם (ימים)                                                                                         |
| `schedule.frequency.helperOff`     | You will see a reminder banner if you haven't backed up in 7 days.                       | תופיע באנר תזכורת אם לא בוצע גיבוי במשך 7 ימים.                                                       |
| `schedule.frequency.helperOn`      | A backup prompt will appear when this interval elapses. The 7-day banner is muted while a schedule is active. | תופיע בקשת גיבוי כאשר המרווח חולף. באנר 7-הימים מושתק כל עוד פעיל לוח זמנים.        |
| `schedule.password.callout`        | Scheduled backups require a backup password. You'll be asked for it each time the prompt appears. Save this password somewhere safe — we cannot recover it. | גיבויים מתוזמנים דורשים סיסמת גיבוי. הסיסמה תידרש בכל הופעת בקשת גיבוי. שמירת הסיסמה במקום בטוח — לא ניתן לשחזר אותה. |
| `schedule.password.ackedLabel`     | I have a backup password and have stored it safely.                                      | יש לי סיסמת גיבוי והיא מאוחסנת במקום בטוח.                                                            |
| `schedule.password.required`       | Please confirm you have a backup password before enabling a schedule.                    | נא לאשר שיש לך סיסמת גיבוי לפני הפעלת לוח זמנים.                                                       |
| `schedule.folder.label`            | Backup folder                                                                            | תיקיית גיבוי                                                                                         |
| `schedule.folder.helper`           | Optional. The next time you save a scheduled backup, your browser will suggest this folder. | אופציונלי. בפעם הבאה ששומרים גיבוי מתוזמן, הדפדפן יציע תיקייה זו.                                  |
| `schedule.folder.empty`            | No folder chosen.                                                                        | לא נבחרה תיקייה.                                                                                     |
| `schedule.folder.unsupported`      | Folder picking is only available in Chromium-based browsers (Chrome, Edge, Brave).       | בחירת תיקייה זמינה רק בדפדפנים מבוססי Chromium (Chrome, Edge, Brave).                                |
| `schedule.folder.pick`             | Pick backup folder                                                                       | בחירת תיקיית גיבוי                                                                                   |
| `schedule.folder.repick`           | Folder: {name} — Re-pick                                                                 | תיקייה: {name} — בחירה מחדש                                                                          |
| `schedule.disableConfirm.title`    | Turn off scheduled backups?                                                              | כיבוי גיבויים מתוזמנים?                                                                              |
| `schedule.disableConfirm.body`     | The 7-day backup reminder banner will become active again. You will not lose any data.   | באנר תזכורת הגיבוי כל 7 ימים יופעל מחדש. לא יאבדו נתונים.                                            |
| `schedule.disableConfirm.yes`      | Turn off schedule                                                                        | כיבוי לוח זמנים                                                                                      |
| `schedule.disableConfirm.cancel`   | Keep schedule on                                                                         | השארת לוח זמנים פעיל                                                                                 |

Plus 2 extras (not in the verify gate but referenced by the markup / handler):
- `schedule.helper` — tab subtitle line ("Schedule regular backup reminders and pick where to save them.")
- `schedule.frequency.customDaysLabel` — number-input label ("Days")

**Hebrew noun-form audit (D-27).** Every action label uses a gerund/infinitive noun:
- `בחירת תיקיית גיבוי` (noun — "picking of"), not `בחר תיקייה` (imperative).
- `כיבוי לוח זמנים` (gerund noun — "shutting down"), not `כבה לוח` (imperative).
- `בחירה מחדש` (noun — "re-selection"), not `בחר שוב` (imperative).
- `השארת לוח זמנים פעיל` (gerund noun — "leaving active"), not `השאר פעיל` (imperative).
- `הפעלת לוח זמנים` (gerund noun — "activation"), not `הפעל לוח` (imperative).

**Encoding precedent.** EN and HE use literal UTF-8 throughout (matches existing convention). DE and CS use literal Unicode for the new keys (matches Plan 04 deviation #3 precedent — `vm.runInContext` accepts both styles). All four locale files end with **462 keys** post-edit; no parse errors.

### D-30 Single-Source-of-Truth Audit

The plan-level success criterion required that the schedule interval helper be sourced from `BackupManager.getScheduleIntervalMs` — no duplicate interval map in settings.js. Confirmed by negative grep gate:

```
$ grep -nE 'SCHEDULE_INTERVAL_MS|86400000|604800000|2592000000' assets/settings.js
(no matches)
```

`settings.js` consumes `BackupManager.canEnableSchedule` for the D-18 gate. The interval-end fire itself is in `BackupManager.checkBackupSchedule`, which delegates to `getScheduleIntervalMs` internally. Three callers (cloud-icon mount, banner suppression, schedule fire) all funnel through the one canonical map at `assets/backup.js:1170-1174`.

### Tests (3 files, 11 assertions, all PASS)

#### `tests/25-05-schedule-fires.test.js` — 2 cases

| Case                                                                                                  | Expected                                                              |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| schedule=daily + lastExport 25h ago + no debounce → `openBackupModal` called once                     | `openBackupModalCalls === 1` AND debounce stamp written close to `now` |
| schedule=off (lastExport irrelevant) → `openBackupModal` NOT called                                   | `openBackupModalCalls === 0`                                          |

#### `tests/25-05-schedule-debounce.test.js` — 2 cases

| Case                                                            | Expected                                                                   |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| schedule=daily + lastExport 25h ago + lastPrompt = 30 min ago   | `openBackupModalCalls === 0`; debounce stamp unchanged                     |
| schedule=daily + lastExport 25h ago + lastPrompt = 90 min ago   | `openBackupModalCalls === 1`; debounce stamp refreshed to ~now             |

#### `tests/25-05-schedule-password-mandatory.test.js` — 7 cases

Table-driven against `BackupManager.canEnableSchedule(mode)`:

| `portfolioBackupSchedulePasswordAcked` | `mode`    | expected |
| -------------------------------------- | --------- | -------- |
| (absent)                               | `'off'`   | `true`   |
| (absent)                               | `'daily'` | `false`  |
| (absent)                               | `'weekly'`| `false`  |
| (absent)                               | `'custom'`| `false`  |
| `'true'`                               | `'daily'` | `true`   |
| `'false'`                              | `'daily'` | `false`  |
| `'true'`                               | `'off'`   | `true`   |

### Plan-Wide Grep Gates (all PASS)

| Gate                                                                                            | Result |
| ----------------------------------------------------------------------------------------------- | ------ |
| `function checkBackupSchedule|function canEnableSchedule` count = 2 in backup.js                | PASS   |
| `checkBackupSchedule: checkBackupSchedule` in backup.js                                          | PASS   |
| `canEnableSchedule: canEnableSchedule` in backup.js                                              | PASS   |
| `BackupManager.checkBackupSchedule()` invocation in app.js                                       | PASS   |
| `visibilitychange` listener in app.js                                                            | PASS   |
| `id="settingsTabBackupsBtn"` + `id="settingsTabBackups"` in settings.html                         | PASS   |
| `id="settingsTabPhotosBtn"` + `id="settingsTabPhotos"` in settings.html                           | PASS   |
| `data-tab="backups"` + `data-tab="photos"` in settings.html                                       | PASS   |
| `scheduleFrequencySelect` + `schedulePasswordAcked` + `scheduleFolderPickBtn` + `schedulePasswordError` IDs in settings.html | PASS |
| `BackupManager.pickBackupFolder(` + `BackupManager.isAutoBackupSupported(` in settings.js         | PASS   |
| 5+ localStorage references to the 4 schedule keys in settings.js (count = 12)                    | PASS   |
| All 24 schedule.* / settings.tab.* keys present in all 4 locale files                            | PASS   |
| D-30 negative gate: no `SCHEDULE_INTERVAL_MS` or millisecond literals in settings.js              | PASS   |
| T-25-05-01 negative gate: no `setItem`/`put` call on passphrase/password key in settings.js or backup.js | PASS |

### Phase-Wide Regression Sweep (all PASS)

All 16 Phase 25 test files re-run after Task 2 GREEN; zero regressions:

| File                                              | Assertions | Result |
| ------------------------------------------------- | ---------- | ------ |
| tests/25-01-sendToMyself-removed.test.js          | 4          | PASS   |
| tests/25-01-share-encryption-inherit.test.js      | 5          | PASS   |
| tests/25-01-share-fallback.test.js                | 7          | PASS   |
| tests/25-02-checklist-store-parity.test.js        | 9          | PASS   |
| tests/25-02-modal-structure.test.js               | 8          | PASS   |
| tests/25-03-testpassword-invalid.test.js          | 5          | PASS   |
| tests/25-03-testpassword-no-mutation.test.js      | 3          | PASS   |
| tests/25-03-testpassword-wrong.test.js            | 2          | PASS   |
| tests/25-04-banner-suppression.test.js            | 4          | PASS   |
| tests/25-04-cloud-state.test.js                   | 18         | PASS   |
| tests/25-04-schedule-interval.test.js             | 9          | PASS   |
| **tests/25-05-schedule-fires.test.js**            | **2**      | **PASS** |
| **tests/25-05-schedule-debounce.test.js**         | **2**      | **PASS** |
| **tests/25-05-schedule-password-mandatory.test.js** | **7**    | **PASS** |
| tests/25-06-crop-only.test.js                     | 3          | PASS   |
| tests/25-06-resize-pure.test.js                   | 4          | PASS   |
| **TOTAL**                                         | **92**     | **PASS** |

## Commits

| Hash      | Type   | Subject                                                                                     |
| --------- | ------ | ------------------------------------------------------------------------------------------- |
| `7fdef5e` | `test` | RED — checkBackupSchedule + canEnableSchedule pure-function tests fail                      |
| `fd449a3` | `feat` | GREEN — checkBackupSchedule + canEnableSchedule + foreground listener (D-17/D-18) (Task 1)  |
| `5975f3b` | `feat` | Settings → Backups + Photos tabs with D-11/D-16/D-18/D-19 wiring (Task 2)                    |

Both `feat` commits triggered the pre-commit hook's automatic `sw.js` `CACHE_NAME` bump (`v150` → `v151` → `v152`) because cached assets changed. Per `memory/reference-pre-commit-sw-bump.md`, no manual `chore` follow-up is needed since `PRECACHE_URLS` did not grow.

## Deviations from Plan

### Auto-fixed Issues

None. The plan executed exactly as written. The two minor additions below are not deviations — they are documented "fallback" enrichments that strengthen the contract:

1. **`schedule.helper` key was added in addition to the 24 verify-gate keys.** The settings.html markup references `data-i18n="schedule.helper"` on the tab subtitle line; without the key the runtime would fall back to the English literal in the markup. Added in all 4 locales.
2. **`schedule.frequency.customDaysLabel` key was added.** The custom-days input's `<label>` references it; without the key the markup default "Days" would ship. Added in all 4 locales.

Both additions live alongside the 24 contracted keys and are caught by no negative gate.

### Cosmetic Deviations

None.

## Threat Closure (from PLAN.md `<threat_model>`)

| ID          | Disposition | Status                                                                                                                                   |
| ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| T-25-05-01  | mitigate    | **CLOSED.** Grep audit confirms no `setItem`/`sessionStorage`/`db.put` call touches a passphrase or password key in settings.js or backup.js. The only schedule-related write is `portfolioBackupSchedulePasswordAcked = 'true'/'false'`, a BOOLEAN STRING acknowledgement (not the password). The schedule fire opens `window.openBackupModal` which routes the user through the existing Phase 22-15 passphrase modal that consumes the passphrase via `_deriveKey` and discards it. |
| T-25-05-02  | mitigate    | **CLOSED.** The folder handle pattern is preserved exactly as Plan 04 left it — module-scoped, NOT persisted. Plan 05 only writes the folder NAME (`portfolioBackupFolderName`) for UI display. D-20 keeps silent folder-write OUT of scope, so handle persistence is unnecessary. Re-pick on each session is the contract.            |
| T-25-05-03  | accept      | **As planned.** Single-user app; the user's own schedule preference is theirs to set/read. No multi-tenant boundary.                       |
| T-25-05-04  | mitigate    | **CLOSED.** 1-hour debounce via `portfolioBackupSchedulePromptedAt` is asserted by `tests/25-05-schedule-debounce.test.js` (sub-case A — within debounce → no fire). The stamp is written ONLY on a successful fire, so back-to-back checks within the same hour can never re-fire. |
| T-25-05-05  | accept      | **As planned.** Self-tampering on a single-user device — they only fool themselves. The interval-end prompt still asks for the actual password each fire; if they don't have one, they cancel the modal. No data lost.        |

## Hand-offs

### To Plan 07 (Photos Settings tab body)

- The Photos tab SHELL ships in this plan: `#settingsTabPhotosBtn` button + `#settingsTabPhotos` tabpanel. The boot tab-switcher auto-discovers the tab; Plan 07 only fills the panel body.
- Keyboard navigation already works (ArrowLeft/Right/Home/End include the new tab); Plan 07 does not need to touch `settings.js boot()`.
- `?tab=photos` URL param is already whitelisted in `settings.js readUrlTab()` — Plan 07's "click-through from overview to Photos tab" flow works out of the box.

### To Plan 08 (Single-source export refactor)

- `BackupManager.checkBackupSchedule` opens `window.openBackupModal()` per D-17 — the modal IS the interval-end prompt. If Plan 08 changes the modal route, the schedule fire follows automatically (no edits to checkBackupSchedule needed).
- After a scheduled export completes, Plan 04's hand-off note advises calling `App.updateBackupCloudState(document.getElementById('backupCloudBtn'))` to flip the icon color immediately. Plan 05 does not invoke that helper directly — the Backup modal's existing post-export hook does so via the `openExportFlow` / `openImportFlow` paths.

### To future maintainers — `BackupManager.canEnableSchedule`

- The helper is the canonical gate. Any future UI surface that exposes a schedule control (mobile app menu, command palette, etc.) MUST gate the ON transition on `BackupManager.canEnableSchedule(mode)` rather than re-reading `portfolioBackupSchedulePasswordAcked` directly. Single source of truth (D-30) for D-18.

### To `assets/i18n-*.js` maintainers

- The 24 + 2 new keys are now part of the 4-locale parity contract. Future locales must ship all 26. Hebrew specifically: noun/infinitive forms only — `בחירת` not `בחר`, `כיבוי` not `כבה`, etc. (D-27).

## TDD Gate Compliance

Plan 05 has `type: execute` (not `type: tdd`), but Task 1 carries `tdd="true"`. Verified in git log:

| Task | RED commit (`test(...)`) | GREEN commit (`feat(...)`) |
| ---- | ------------------------ | -------------------------- |
| 1    | `7fdef5e`                | `fd449a3`                  |

Task 2 has no `tdd="true"` flag — pure shipping work (HTML + handlers + i18n + grep gates) backed by the Task-1 behavior tests for the gate logic it consumes.

## Self-Check: PASSED

| Claim                                                                        | Verification                                                                                       | Result |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| tests/25-05-schedule-fires.test.js exists + 2 cases pass                     | `[ -f tests/25-05-schedule-fires.test.js ] && node …`                                              | FOUND + PASS |
| tests/25-05-schedule-debounce.test.js exists + 2 cases pass                  | `[ -f tests/25-05-schedule-debounce.test.js ] && node …`                                           | FOUND + PASS |
| tests/25-05-schedule-password-mandatory.test.js exists + 7 cases pass        | `[ -f tests/25-05-schedule-password-mandatory.test.js ] && node …`                                 | FOUND + PASS |
| Commit 7fdef5e (Task 1 RED) exists                                            | `git log --oneline \| grep -q 7fdef5e`                                                             | FOUND  |
| Commit fd449a3 (Task 1 GREEN) exists                                          | `git log --oneline \| grep -q fd449a3`                                                             | FOUND  |
| Commit 5975f3b (Task 2) exists                                                | `git log --oneline \| grep -q 5975f3b`                                                             | FOUND  |
| BackupManager.checkBackupSchedule + canEnableSchedule on public API           | grep of return object                                                                              | PASS   |
| settings.js consumes BackupManager.canEnableSchedule + pickBackupFolder + isAutoBackupSupported | grep                                                                                          | PASS   |
| D-30 negative gate: no millisecond literals or SCHEDULE_INTERVAL_MS in settings.js | grep returns 0 lines                                                                          | PASS   |
| T-25-05-01 negative gate: no passphrase storage in settings.js or backup.js  | grep returns 0 lines                                                                              | PASS   |
| All 4 locale files parse cleanly + ship 462 keys each                         | `vm.runInContext` + Object.keys count                                                              | PASS   |
| No Phase 25-01/02/03/04/06 tests regressed                                    | 13 test files outside this plan, 81 assertions — all still PASS                                   | PASS   |
| All PLAN.md `<verify>` grep + node-script gates pass                         | Manual run of every gate above the table                                                           | PASS   |

Verified by command-line run after the Task-2 commit `5975f3b`.
