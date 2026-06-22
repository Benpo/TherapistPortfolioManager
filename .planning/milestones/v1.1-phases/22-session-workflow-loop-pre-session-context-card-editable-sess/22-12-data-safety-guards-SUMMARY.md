---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 12
subsystem: chrome / backup-export / nav-guard
tags: [data-safety, privacy, nav-guard, gap-closure, wave-3]
gap_closure: true
requires: [22-11]
provides:
  - "App.installNavGuard generic helper (chrome-level navigation guard)"
  - "Three-state passphrase modal resolve (encrypted | skip | cancel)"
  - "window.PortfolioFormDirty + window.PortfolioFormDirtyBypass project-wide convention"
affects:
  - assets/backup.js
  - assets/overview.js
  - assets/app.js
  - assets/add-session.js
  - assets/i18n-{en,de,he,cs}.js
tech-stack:
  added: []
  patterns:
    - "Post-IIFE namespace augmentation for adding methods to App without touching the IIFE return object"
    - "Three-outcome promise resolve sentinel (true | false | 'cancel') for distinguishing user choices"
    - "One-shot bypass flag (window.PortfolioFormDirtyBypass) to coordinate custom-confirm vs browser-native beforeunload"
key-files:
  modified:
    - assets/backup.js
    - assets/overview.js
    - assets/app.js
    - assets/add-session.js
    - assets/i18n-en.js
    - assets/i18n-de.js
    - assets/i18n-he.js
    - assets/i18n-cs.js
  created: []
decisions:
  - "Three-state resolve sentinel for exportEncryptedBackup (true=encrypted, false=skip, 'cancel'=abort) preserves backward compatibility because the only caller (overview.js) used strict-equality checks"
  - "App.installNavGuard sets window.PortfolioFormDirtyBypass=true unconditionally on confirm — cheap on pages that don't have the flag's listener; required on add-session.html"
  - "onConfirm in installNavGuard is locked at synchronous-only at v1; async-save-before-leave callers must fork or gate navigation themselves"
  - "Gear-icon-only wiring per D3; brand-link / language popover / theme toggle / add-client are out of scope"
metrics:
  tasks_completed: 3
  commits: 4
  duration_minutes: ~25
  completed_date: 2026-05-07
---

# Phase 22 Plan 12: Data Safety Guards Summary

Closes two UAT gaps that are both data-safety guards: a privacy blocker (export Cancel still downloaded a plaintext backup) and a workflow data-loss preventer (Settings gear icon silently discarded unsaved session edits). Implemented via a 3-state passphrase modal resolve and a generic, reusable `App.installNavGuard` helper wired once to the gear icon — the helper is the deliverable that prepares Ben's future navigation-guard audit.

## Tasks Completed

| Task | Description                                                                                                              | Commit    | Gap Closed                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | --------- | --------------------------------------------------- |
| 1    | Split passphrase modal Cancel from Skip Encryption (3-state resolve in `_showPassphraseModal` + `exportEncryptedBackup`) | `1215487` | Gap A part 1 (BLOCKER, test 4)                      |
| 2    | Update overview.js export click handler to honour the `'cancel'` sentinel (early return, no toast, no download)          | `7645647` | Gap A part 2 (BLOCKER, test 4) — completes Gap A    |
| 3    | `App.installNavGuard` helper + single call site for the Settings gear icon + i18n keys                                   | `8ba567f` | Gap B (MAJOR, scope: phase-22-related, test general) |

Plus the metadata commit (this SUMMARY + STATE updates).

## Files Changed

- `assets/backup.js` — `_showPassphraseModal` now distinguishes onCancel (abort) from onSkip (skip-encryption); `exportEncryptedBackup` resolves with `true` | `false` | `'cancel'`
- `assets/overview.js` — export click handler early-returns on `encrypted === 'cancel'` BEFORE touching the unencrypted-export path or the success toast
- `assets/app.js` — adds `App.installNavGuard` post-IIFE; `initSettingsLink` calls the helper once for the gear icon
- `assets/add-session.js` — exposes `window.PortfolioFormDirty` (function form, live state); `beforeunload` honours `window.PortfolioFormDirtyBypass`
- `assets/i18n-{en,de,he,cs}.js` — new keys: `session.leavePage.title` / `.body` / `.confirm` / `.cancel`

## Gap Truth → Evidence

### Gap A (BLOCKER, test 4): "Cancel button on the export-encryption prompt aborts the export — no backup file is downloaded"

**Truth statements:**

1. "Pressing Cancel on the backup-export passphrase prompt aborts the export entirely — no .zip and no .sgbackup file is downloaded, regardless of where the user clicks (X, Cancel button, Escape key, overlay)."
2. "Pressing Skip Encryption still produces an unencrypted .zip backup (existing behaviour preserved)."
3. "Pressing Encrypt and Save still produces an encrypted .sgbackup backup (existing behaviour preserved)."

**Evidence:**

- `assets/backup.js` _showPassphraseModal:
  - X close button → `opts.onCancel()` (abort)
  - dismissBtn (bottom Cancel) → `opts.onCancel()` (abort)
  - cancelBtn → `opts.onSkip()` in encrypt mode (Skip Encryption), `opts.onCancel()` in decrypt mode (alias)
  - Escape key → explicit `opts.onCancel()` (no longer aliases to cancelBtn.click() which would now mean "Skip" in encrypt mode — bug fix)
- `assets/backup.js` `exportEncryptedBackup` resolves with `true` (encrypt+download), `false` (skip), or `'cancel'` (abort)
- `assets/overview.js` export click handler early-returns on `encrypted === 'cancel'` BEFORE the unencrypted-export branch and BEFORE the success toast
- The `.sgbackup` decrypt-side `onCancel: function() { resolve(null); }` is unchanged (line 572) — import-side cancel still works

**Mental simulation (regression check):** User clicks Cancel → cancelBtn handler runs → opts.onSkip is undefined for cancel paths (only cancelBtn-click in encrypt mode triggers onSkip; X/dismiss/Escape go to onCancel) → `exportEncryptedBackup` resolves `'cancel'` → `overview.js` sees `encrypted === 'cancel'` → `return;` → zero `triggerDownload`, zero `exportBackup`, zero `autoSaveToFolder`, no toast. The download pipeline is unreachable.

### Gap B (MAJOR, scope: phase-22-related): "Settings gear icon is guarded against navigation away from an in-progress session"

**Truth statements:**

1. "A reusable `App.installNavGuard({trigger, isDirty, message, destination, onConfirm?})` helper exists in `assets/app.js` and any future caller can guard a navigation trigger by calling it once with no edits to the helper's source."
2. "The Phase 22 wiring uses `App.installNavGuard` exactly once — for the Settings gear icon — with the add-session/edit-session form-dirty predicate as `isDirty`."
3. "Clicking the Settings gear icon when the session form is in read-only mode (or has no unsaved changes) navigates to settings immediately without a guard."

**Evidence:**

- `assets/app.js` line 1052: `App.installNavGuard = function (opts) { ... }` (post-IIFE namespace augmentation, after the IIFE's `})();` at line ~992)
- `assets/app.js` line 328: single call site inside `initSettingsLink` — `App.installNavGuard({ trigger: link, isDirty: ..., message: { ... }, destination: link.href })`
- `assets/add-session.js`: `window.PortfolioFormDirty = function () { return formDirty && !formSaving; };` (live-state function, not a snapshot)
- `assets/add-session.js` `beforeunload` handler: `if (window.PortfolioFormDirtyBypass) return;` — prevents double-prompting when the helper has already shown a custom dialog
- All 4 i18n files contain `session.leavePage.title` / `.body` / `.confirm` / `.cancel`

**Read-mode + non-session-page check:** `window.PortfolioFormDirty` is only defined on add-session.html (set inside its DOMContentLoaded). On overview / sessions / settings / etc. pages, `typeof window.PortfolioFormDirty === 'function'` is false → `isDirty` returns false → guard short-circuits → default navigation. On read-mode session pages, inputs are disabled so `formDirty` never flips to true.

## App.installNavGuard Public API (v1, locked)

```js
App.installNavGuard({
  trigger:     HTMLElement | string,                  // element or CSS selector resolved at call time
  isDirty:     () => boolean,                          // caller-provided dirty-state predicate
  message: {
    titleKey, bodyKey, confirmKey, cancelKey,
    tone?: 'danger' | 'neutral'                        // defaults to 'danger'
  },
  destination: string | () => string,                  // URL on confirm; falls back to trigger.href if omitted and trigger is an <a>
  onConfirm?:  () => void                              // optional SYNCHRONOUS pre-nav side-effect; helper does not await it
}) => (() => void)                                      // returns an unregister fn
```

**Constraint note (locked at v1):** `onConfirm` is invoked synchronously and is not awaited. Future callers needing async patterns (e.g. "save before leaving") must gate navigation themselves — perform the async work in their own click handler before triggering navigation, or fork the helper.

**Bypass-flag convention:** On confirm, the helper sets `window.PortfolioFormDirtyBypass = true` before navigating. Pages with their own `beforeunload` listener should check this flag and short-circuit (idempotent on pages without the flag's listener).

## Future-caller smoke test (D3 acceptance)

> **Q:** If Ben later wants to guard the brand-link, what does he write?

```js
App.installNavGuard({
  trigger: document.querySelector('.brand-link'),
  isDirty: () => typeof window.PortfolioFormDirty === 'function' && window.PortfolioFormDirty() === true,
  message: {
    titleKey:   'session.leavePage.title',
    bodyKey:    'session.leavePage.body',
    confirmKey: 'session.leavePage.confirm',
    cancelKey:  'session.leavePage.cancel'
  },
  destination: './index.html'
});
```

That is the full implementation — one call, no edits to the helper's source, no copy-paste of click-handler logic. The same shape works for add-client, language popover, theme toggle (though Ben confirmed those last two are in-place toggles and don't need guarding).

## Verification (automated)

```
node -c assets/backup.js                        ✓
node -c assets/overview.js                      ✓
node -c assets/app.js                           ✓
node -c assets/add-session.js                   ✓
node -c assets/i18n-{en,de,he,cs}.js            ✓
grep -q "onSkip" assets/backup.js               ✓
grep -q "'cancel'" assets/backup.js             ✓
grep -q "encrypted === 'cancel'" overview.js    ✓
grep -q "App.installNavGuard" assets/app.js     ✓ (7 occurrences: 1 def + 1 call + 5 JSDoc/comments)
grep -q "PortfolioFormDirty" add-session.js     ✓
grep -q "PortfolioFormDirty" assets/app.js      ✓
grep -q "PortfolioFormDirtyBypass" both files   ✓
session.leavePage.title in all 4 i18n files     ✓
```

## Manual UAT Steps

### Gap A (export cancel)

- Open the app at overview.html → click "Export / Backup Data" → passphrase modal opens
- **Cancel button (bottom)** → verify NO file appears in Downloads; modal closes silently; no toast
- Re-open → **X button (top-right)** → same: no file downloaded
- Re-open → press **Escape** → same: no file downloaded
- Re-open → **Skip Encryption** → verify `.zip` IS downloaded; success toast appears
- Re-open → type a strong passphrase → confirm → **Encrypt and Save** → verify `.sgbackup` IS downloaded; success toast appears
- Verify `localStorage.portfolioLastExport` and IndexedDB are unchanged after a cancel (data-safety regression test)

### Gap B (settings nav guard)

- Open an existing session → click Edit → type in any field
- **Click the gear icon** → confirm dialog appears: "Leave this session?" with red "Leave without saving" button
- Press **"Stay on this session"** → verify still on session page, edits intact
- Click gear again → press **"Leave without saving"** → verify navigation to settings.html with NO second prompt (bypass flag suppresses beforeunload)
- Open a fresh session in read mode (don't click Edit) → click gear → navigates instantly with no prompt
- Open overview.html → click gear → navigates instantly with no prompt (`PortfolioFormDirty` undefined → isDirty returns false)
- On a dirty session page, **close the browser tab** → original beforeunload still fires (bypass flag only set on intentional in-app navigation via the helper)
- Switch to each of DE / HE / CS locales → repeat the click-gear-with-dirty-form scenario → verify the dialog copy is in the correct language

## Deviations from Plan

None. Plan executed as written:

- All three tasks committed atomically with the exact commit prefixes specified.
- `App.installNavGuard` placed via post-IIFE namespace augmentation (not inside the IIFE return object) — confirmed by `grep -n "})();" assets/app.js` showing the IIFE closes at line 992 and the helper is defined at line 1052.
- Single call site for the helper in this plan (gear icon only). Verified that `grep -n "App.installNavGuard" assets/app.js` shows exactly one CALL (line 328); other 6 hits are 1 definition + 5 JSDoc/comments.
- The `.sgbackup` decrypt-path `onCancel: function() { resolve(null); }` (line 572) is unchanged.
- `backup.passphrase.cancel` was already present in all four i18n files (added in a prior plan); only the inline `_t` fallback in `backup.js` needed the addition.
- The CS i18n strings were added with literal accented characters (matching the QUOTES section pattern, which uses literals); pre-existing translation strings in CS use unicode-escape encoding. Both forms parse identically and behave identically at runtime, so this is not a regression.

## Notes

- Service worker cache version was auto-bumped by the pre-commit hook three times (v63→v64, v64→v65, v65→v66) — one per task commit, as expected.
- No XSS regressions: the helper passes i18n keys (compile-time strings) to `App.confirmDialog`; nothing user-supplied is interpolated.
- No new file deletions in any commit (verified via `git diff --diff-filter=D --name-only HEAD~N HEAD`).

## Self-Check: PASSED

- File `assets/backup.js` — modified, contains `onSkip`, `'cancel'` sentinel
- File `assets/overview.js` — modified, contains `encrypted === 'cancel'` guard
- File `assets/app.js` — modified, contains `App.installNavGuard` definition (post-IIFE) + 1 call site
- File `assets/add-session.js` — modified, contains `window.PortfolioFormDirty` and `window.PortfolioFormDirtyBypass` honour-check
- All 4 i18n files contain `session.leavePage.title`
- Commit `1215487` exists in `git log` (Task 1)
- Commit `7645647` exists in `git log` (Task 2)
- Commit `8ba567f` exists in `git log` (Task 3)
