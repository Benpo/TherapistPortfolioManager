---
created: 2026-06-26T10:40:00.000Z
title: Backup does not preserve the snippet trigger
area: backup
priority: medium
type: bug
files:
  - assets/backup.js
  - assets/settings.js
  - assets/db.js
  - assets/app.js
---

## Problem

User-reported (Ben, UAT 2026-06-26, during quick-task 260626-h5j testing): when backing
up, the **trigger** field of a snippet is not preserved — a restored/exported snippet
comes back without (or with an empty) trigger. Pre-existing bug, unrelated to the
260626-h5j space-handling change.

## Investigation so far (static read — NOT yet reproduced live)

Surprisingly, the three obvious serialization/restore paths all appear to carry the WHOLE
snippet object **including** `trigger`, so this is not a simple field-drop:

- **Full ZIP backup** — `assets/backup.js` `_assembleBackupZip()` sets
  `manifest.snippets = allSnippets` (whole objects), ~L601.
- **"Export snippets" JSON** — `assets/settings.js` `handleExport()` payload is
  `cache.filter(...)` of whole snippet objects, ~L1700 (note: only exports
  `origin === "user" || isModifiedSeed(...)` — unmodified seeds are intentionally skipped).
- **Restore** — `assets/backup.js` ~L1184 passes each `snip` whole through
  `validateSnippetShape` (which *requires* a trigger and would SKIP, not strip, a
  trigger-less row) then `updateSnippet`.
- Recall expansion works (just verified), so the in-memory cache from
  `window.App.getSnippets()` definitely contains `trigger`.

=> Root cause is NOT obvious from static reading. Likely candidates to check live:
1. The DB read that feeds `data.snippets` on the **encrypted/recovery** backup path
   (`exportRecoveryBackup` / read-around-failure) vs the normal path.
2. A specific snippet **state** (e.g. a seed whose trigger was edited, or an
   id/keyPath interaction in `db.js` `snippetsStore` ~L267 / `getAllSnippets` ~L756).
3. Restore silently **skipping** the snippet as "malformed" (logged warning at
   backup.js ~L1190) — would *look* like "trigger not backed up" because the snippet
   never reappears.

## Needs from Ben (to sharpen before fixing)

- Which backup did you use — the full encrypted **.zip backup**, or the **"Export
  snippets" .json**?
- How did you observe the loss — opened the exported file and the `trigger` was
  missing/empty, OR restored and the snippet came back trigger-less / didn't appear?

## Solution (once reproduced)

1. Reproduce live: create a user snippet with a known trigger → back up → inspect the
   produced file's `snippets[*].trigger` → restore into a clean profile → confirm.
2. Trace from the confirmed path (export vs restore) to the exact point the trigger is
   lost or the row is skipped.
3. Add a falsifiable behavior test (per `feedback-behavior-verification`) covering the
   backup→restore round-trip preserving `trigger` (and `expansions`/`tags`), then fix.

## Origin

Found by Ben during on-device UAT of quick-task 260626-h5j (snippet trigger space handling).
