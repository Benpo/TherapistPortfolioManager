---
created: 2026-06-26T10:40:00.000Z
title: Backup does not preserve the custom snippet prefix (and other localStorage settings)
area: backup
priority: medium
type: bug
files:
  - assets/backup.js
  - assets/snippets.js
---

## Problem

User-reported & CONFIRMED (Ben, UAT 2026-06-26): backing up the whole app and restoring it
in a different browser did NOT carry over the **customized snippet prefix**. Ben had changed
the quick-paste prefix from the default `;` to `?`; after restore it reverted to `;`.

Note: this is NOT the snippet's `trigger` field (that one *is* serialized whole in the
snippets array). The lost value is the **prefix** — a separate per-device setting stored in
`localStorage`, not in IndexedDB. Pre-existing bug, unrelated to quick-task 260626-h5j.

## Root cause (confirmed by static read)

- The prefix is stored in `localStorage` under `portfolioSnippetPrefix`
  (`assets/snippets.js`, `PREFIX_STORAGE_KEY` / `setPrefix()`), NOT in IndexedDB.
- The backup manifest only captures TWO localStorage keys:
  `assets/backup.js` `_assembleBackupZip()` ~L602 →
  `settings: { language: localStorage.getItem("portfolioLang"), theme: localStorage.getItem("portfolioTheme") }`.
- Restore mirrors only those two: `assets/backup.js` ~L1202-1207 sets back `portfolioLang`
  and `portfolioTheme` only.
- => `portfolioSnippetPrefix` is in neither export nor restore, so a customized prefix is
  silently dropped on backup→restore (and on cross-browser migration).

### Wider scope (worth deciding during the fix)
The app writes many other `localStorage` settings that are likewise NOT in the backup, e.g.
`portfolioAutoBackupEnabled`, `portfolioBackupScheduleMode`, `portfolioBackupScheduleCustomDays`,
`portfolioTermsAccepted`/`portfolioTermsLang`, `securityGuidanceDismissed`. The fix should
decide which of these *belong* in a portable backup (the snippet prefix clearly does; license
keys like `portfolioLicenseKey`/`portfolioLicenseInstance` likely should NOT travel between
installs). At minimum, add the snippet prefix.

## Solution

1. Export: add `snippetPrefix: localStorage.getItem("portfolioSnippetPrefix")` to
   `manifest.settings` in `_assembleBackupZip()` (and any recovery-export assembly that
   mirrors it). Bump/justify the manifest `version` if the schema is versioned.
2. Restore: in the `manifest.settings` block (~L1202), if `manifest.settings.snippetPrefix`
   is present and valid (1–2 chars, matches `setPrefix` rules), write it back to
   `portfolioSnippetPrefix` — ideally via `window.Snippets.setPrefix(...)` so the running
   engine + cross-tab broadcast pick it up immediately.
3. Backward-compat: older backups have no `snippetPrefix` — leave the existing prefix
   untouched in that case (guard like the existing `if (manifest.settings.language)` checks).
4. Decide + implement the wider localStorage-settings scope (see above).
5. Add a falsifiable round-trip behavior test (per `feedback-behavior-verification`):
   set a custom prefix → export → restore into a clean localStorage → assert
   `portfolioSnippetPrefix` is restored (and that license-only keys are NOT exported).

## Origin

Found by Ben during on-device UAT of quick-task 260626-h5j (snippet trigger space handling):
backed up and restored the whole app between browsers; the custom `?` prefix did not travel.
