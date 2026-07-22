---
created: 2026-07-13T12:00:00.000Z
title: Second backup import after a restore silently fails — confirm popup never opens
area: backup
priority: critical
resolves_phase: 48
files:
  - assets/backup.js
  - assets/settings.js
---

## Problem

**v1.4 SHIP BLOCKER (Ben, 2026-07-13): must be fixed before v1.4 ships.** Found during
Phase 45 UAT on the pre-prod PWA (macOS, build `a33d8dc`) but pre-existing — Phase 45
touched neither backup.js nor settings.js (verified via git).

Repro (Ben, real device):
1. Import/restore a `.sgbackup` — succeeds.
2. Attempt a SECOND import: file browser opens, file selected → the confirm-import
   popup never appears. No error, silent no-op.
3. Hard refresh did NOT heal it.
4. Navigating between screens ~10 times eventually healed it (import then worked).

## Investigation leads (unverified hypotheses — needs a /gsd-debug session)

- `backup.js:401-402` resets `input1.value`/`input2.value` — verify this reset actually
  runs on the restore-success path (replace-on-import may reload/rebuild DOM before it).
- Classic same-file reselection: `<input type=file>` fires no `change` when the same
  filename is picked and `value` was not cleared. But hard-refresh-didn't-help doesn't
  fit a pure DOM-state theory — check for a persistent in-progress flag (sessionStorage
  survives refresh) or listener lost on re-rendered settings DOM.
- Safari/PWA specifics: this was macOS PWA; check the file-input + FileReader path under
  a SW-controlled page.

## Solution

Dedicated `/gsd-debug` session with the repro above; falsifiable RED test first
(the suite has an import-merge path driver from Phase 30 to build on).
Tagged `resolves_phase: 48` so it surfaces at the last v1.4 phase at the latest —
fine to pull earlier into its own debug session.
