---
phase: 29-reliability-observability
plan: 02
subsystem: database
tags: [indexeddb, backup, jszip, migration, escape-hatch, i18n, rtl, idb-recovery]

# Dependency graph
requires:
  - phase: 29-01 (OBS-01 crash-log foundation)
    provides: db.js at DB_VERSION 6 (crashlog store + accessors) — the committed v6 baseline this plan layers on top of
  - phase: 19 (encrypted backup)
    provides: exportEncryptedBackup + _showPassphraseModal + _encryptBlob (the interactive passphrase flow the recovery export reuses)
provides:
  - "PortfolioDB.getAllForRecoveryExport() — read-only, no-version DB open that reads AROUND a failed migration (D-09 wrinkle resolved)"
  - "BackupManager.exportRecoveryBackup(passphraseFlow?) — passphrase-gated escape-hatch export fed by the read-around-failure source"
  - "BackupManager._assembleBackupZip(data) — the single shared ZIP builder feeding both exportBackup and exportRecoveryBackup (no drift)"
  - "Rewritten showDBMigrationError() — Export + affirmation-checkbox-gated Reset & recover with danger double-confirm, replacing the dead-end Refresh loop"
  - "confirm.resetApp.* + confirm.resetAppNoBackup.* (4 languages) — standard + extra-emphatic destructive-confirm copy variants"
affects: [29-03, version.js recover/report stubs, OBS-03, migration-reliability]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-around-failure: open IndexedDB with NO version arg so onupgradeneeded cannot re-fire a throwing migration; objectStoreNames.contains-guard each store read"
    - "Single ZIP builder fed by swappable data sources (normal getAll* vs recovery read-around) — one manifest assembly, zero drift"
    - "Dependency-injection seam (optional passphraseFlow) keeps the interactive gate testable in the zero-npm no-DOM sandbox while production gets the real modal"
    - "Double-gated destructive op: affirmation checkbox (disabled attr + in-handler re-check) AND tone:danger confirmDialog before indexedDB.deleteDatabase; extra-emphatic confirm variant when no session export"

key-files:
  created:
    - tests/29-02-recovery-export.test.js
    - tests/29-02-migration-escape-hatch.test.js
  modified:
    - assets/db.js
    - assets/backup.js
    - assets/app.css
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js

key-decisions:
  - "Recovery export sourced via a dedicated read-only no-version open helper in db.js (_openReadOnlyNoVersion + _readStoreReadOnly), never openDB() — the open that would re-trigger the failing migration"
  - "exportRecoveryBackup takes an OPTIONAL passphraseFlow DI seam (defaults to the real DOM passphrase modal) so the gate is deterministically testable without jsdom"
  - "Export backup now stays green/primary (red-discipline); the banner Reset button is a quiet outline; red is spent only on the moment-of-action confirm dialog"
  - "_showDBMigrationError exposed on the PortfolioDB API as a test seam (production reaches it via openDB onupgradeneeded catch)"

patterns-established:
  - "Pattern: export-around-failure — a no-version IndexedDB open + per-store contains-guard reads, composed with the existing ZIP builder, lets a bricked-migration device still export its data"
  - "Pattern: in-session export flag (_exportedThisSession) drives an extra-emphatic destructive-confirm variant for the user who skipped the backup"

requirements-completed: [OBS-03]

# Metrics
duration: 9min
completed: 2026-06-23
status: complete
---

# Phase 29 Plan 02: Reset & Recover Escape Hatch (OBS-03) Summary

**A failed IndexedDB migration can no longer trap the user in a dead-end refresh loop: the banner now offers a read-around-failure "Export backup now" plus a checkbox-and-double-confirm-gated "Reset & recover" that wipes and reloads into a fresh DB.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-06-23T10:14:05Z
- **Completed:** 2026-06-23T10:23:07Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 7 (2 test files created)

## Accomplishments
- `getAllForRecoveryExport()` opens the DB with NO version argument so the failing migration can never re-fire, reads the four backup stores guarded by `objectStoreNames.contains`, and resolves the D-09 "export while stuck at the un-upgraded version" wrinkle.
- Extracted the single `_assembleBackupZip()` builder so `exportBackup()` and the new `exportRecoveryBackup()` share one manifest/ZIP assembly with zero drift; the recovery export is passphrase-gated through the same interactive modal (D-07, no silent export).
- Replaced the dead-end `showDBMigrationError()` (which re-ran the throwing migration forever) with the OBS-03 escape hatch: Export backup now (green/primary), an affirmation checkbox that gates Reset & recover, a `tone:'danger'` `App.confirmDialog` double-confirm, and only then `indexedDB.deleteDatabase(DB_NAME)` + reload. Extra-emphatic confirm copy when no export happened this session (D-08).
- RTL-safe banner (dir set defensively from `portfolioLang`), pre-i18n inline `DB_STRINGS` for the banner, full-app i18n confirm variants in all four languages (Hebrew gender-neutral).

## Task Commits

Each task was committed atomically (TDD: test+impl together as the GREEN commit since the test files are new this plan):

1. **Task 1: Read-only export-around-failure path (db.js no-version open + backup.js ZIP source swap)** - `c7d5131` (feat)
2. **Task 2: Replace the dead-end banner with the gated reset & recover escape hatch** - `cff481f` (feat)

_TDD: each task's behavior test was written to FAIL first (RED — verified: "symbol not exported" / "_showDBMigrationError not exposed") then PASS after implementation (GREEN, 6/6 each)._

## Files Created/Modified
- `assets/db.js` — `getAllForRecoveryExport()` + `_openReadOnlyNoVersion()` + `_readStoreReadOnly()`; rewritten `showDBMigrationError()` (Export / affirm checkbox / gated Reset + danger double-confirm + deleteDatabase); `_exportedThisSession` flag; DB_STRINGS reworded + 3 new escape-hatch keys (4 langs); `_showDBMigrationError` test seam.
- `assets/backup.js` — `_assembleBackupZip()` extraction; `exportBackup()` re-routed through it; `exportRecoveryBackup(passphraseFlow?)` + `_defaultRecoveryPassphraseFlow()`; public-API export.
- `assets/app.css` — `.db-error-banner--escape`, `.db-error-affirm` / `-box`, `.db-error-btn--danger` outline; banner fallback-literal spacing reused verbatim (Spacing FLAG honored).
- `assets/i18n-{en,he,de,cs}.js` — `confirm.resetApp.*` (standard) + `confirm.resetAppNoBackup.*` (extra-emphatic) copy variants.
- `tests/29-02-recovery-export.test.js` — 6 behavior cases (wrinkle reproduced, read-around-failure, missing-store=[], real ZIP manifest, zero network, interactive gate + cancel-aborts).
- `tests/29-02-migration-escape-hatch.test.js` — 6 behavior cases (controls rendered, disabled→enabled gate, danger confirm→deleteDatabase, cancel does NOT wipe, extra-emphatic vs standard title key, RTL dir).

## Decisions Made
- Recovery reads go through a dedicated read-only no-version open helper, never `openDB()` — the very call that re-triggers the failing migration.
- `exportRecoveryBackup` accepts an optional `passphraseFlow` DI seam so the no-silent-export gate is deterministically testable without jsdom; production callers pass nothing and get the real DOM passphrase modal.
- `_showDBMigrationError` exposed on the PortfolioDB API as a test seam (production still reaches it only via the `openDB()` `onupgradeneeded` catch).

## Deviations from Plan

None - plan executed exactly as written. (The plan's `<verify>` blocks specified jsdom + fake-indexeddb; per the established project convention — same as 29-01 — the repo is zero-npm, so the tests reuse the handwritten in-memory IDB shim + `vm` sandbox and the REAL vendored JSZip. This honors the plan's behavior contract via the project's mandated test infrastructure, not a scope change.)

## Issues Encountered
None. The passphrase modal is heavily DOM-coupled; rather than leak test-only branches into the production export path, `exportRecoveryBackup` was given a clean optional DI parameter (the real modal is the default), which keeps the interactive-gate behavior fully verifiable in the no-DOM sandbox.

## Regression Verification
- Both new test files: 12/12 PASS.
- db.js / backup.js neighbours: `29-01-crashlog-capture` 6/6, `25-08-roundtrip-stores` 16/16, `25-08-encrypt-then-share` 10/10, `28-04-nudge-honesty` + `28-04-integrity-state` PASS.
- i18n + CSS: `25-11-i18n-parity` 23/23 (all 4 languages have the 7 new `confirm.resetApp*` keys), `25-13-css-audit` 14/14, `25-11-hardcoded-english-removed` 14/14.
- Invariants (grep + spy): recovery export never calls `openDB`; `_openReadOnlyNoVersion` uses no version arg; `deleteDatabase` runs only after BOTH the affirmation-checkbox/disabled guard AND the confirmed double-confirm; banner CSS keeps the 12/16/4/2px literals; zero `fetch`/XHR in either path.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- OBS-03 success criterion satisfiable: a failed migration offers export-around-failure + a gated wipe instead of an endless refresh loop, returning the app to a usable fresh-DB state.
- Wave 2 (Plan 03) wiring: `version.js`'s `buildNudge` `wedged` branch `recover.onclick` stub (`version.js:278`) should be wired to land on this banner; `report.onclick` stub (`:284`) is the OBS-02 report screen. Both are stubs today and untouched by this plan.

## Self-Check: PASSED

- Created files verified on disk: `tests/29-02-recovery-export.test.js`, `tests/29-02-migration-escape-hatch.test.js`, `.planning/phases/29-reliability-observability/29-02-SUMMARY.md`.
- Task commits verified in git history: `c7d5131` (Task 1), `cff481f` (Task 2).

---
*Phase: 29-reliability-observability*
*Completed: 2026-06-23*
