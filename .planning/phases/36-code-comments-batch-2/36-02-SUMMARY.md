---
phase: 36-code-comments-batch-2
plan: "02"
subsystem: assets/landing.js · assets/license.js · assets/snippets.js · assets/backup-modal.js
tags: [code-comments, docs, de-phase, banner, batch-2]
dependency_graph:
  requires: [batch-1-banners]
  provides: [batch-2-banners, batch-2-de-phase]
  affects:
    - assets/landing.js
    - assets/license.js
    - assets/snippets.js
    - assets/backup-modal.js
tech_stack:
  added: []
  patterns: [four-slot-banner, comments-only-gate, strip-and-compare, option-3-de-phase]
key_files:
  created: []
  modified:
    - assets/landing.js
    - assets/license.js
    - assets/snippets.js
    - assets/backup-modal.js
decisions:
  - "landing.js PUBLIC SURFACE: none — file is not an IIFE and makes no window.X= assignments; self-boots on DOMContentLoaded"
  - "license.js kept /** */ JSDoc style per plan; STORE_ID/PRODUCT_ID public-constant rationale preserved as plain prose in CONSTRAINTS slot"
  - "snippets.js JSDoc converted to // canonical format; DEPENDENCIES slot names only window.App.getSnippets (verified as the only cross-IIFE read); no PortfolioDB or SNIPPETS_SEED access in this file"
  - "backup-modal.js five window.* globals documented in PUBLIC SURFACE including window.formatRelativeTime (registered at line 193, absent from original header)"
  - "DEBT-01 in license.js body stripped to plain prose per D-07 spirit even though it is not in the grep's explicit prefix list"
  - "backup-modal BEFORE/AFTER design rationale preserved verbatim (only the Phase-number/round/UAT-D2/ISO-date provenance tags stripped)"
metrics:
  duration_minutes: 12
  completed_date: "2026-07-02"
  tasks_completed: 3
  files_modified: 4
status: complete
---

# Phase 36 Plan 02: Batch-2 Banners + De-phase (landing/license/snippets/backup-modal) Summary

**One-liner:** Four-slot // banners added to landing.js (thin opener replaced) and snippets.js (JSDoc converted + Phase 24 tag stripped); license.js JSDoc header rewritten to four-slot shape keeping /** */ style and STORE_ID/PRODUCT_ID rationale; backup-modal.js heavy archaeology (Phase 25 round-5/Change 1/UAT-D2/ISO-date) rewritten to four-slot banner preserving the BEFORE/AFTER design rationale; all four bodies de-phased to plain prose.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | landing.js + license.js — four-slot banners + full body de-phase | d0f1195 |
| 2 | snippets.js + backup-modal.js — four-slot banners + heavy de-phase (backup-modal) | d0f1195 |
| 3 | Prove comments-only: strip-and-compare COMMENTS_ONLY_OK, npm test 119/119 green | d0f1195 |

All three tasks were committed together in a single atomic commit (Tasks 1+2 instructed "Do NOT commit yet" pending Task 3's gate).

## Verification Results

- `npm test`: **119/119 passed, 0 failed** — suite stays green
- Strip-and-compare gate: **COMMENTS_ONLY_OK** — zero code lines changed across all four files
- De-phase grep (landing.js + license.js): **DEPHASE_CLEAN**
- De-phase grep (snippets.js + backup-modal.js): **DEPHASE_CLEAN**
- Scope fence: `git diff --name-only` contains none of assets/backup.js, assets/app.js, assets/pdf-export.js

## What Was Built

### assets/landing.js — new four-slot banner

landing.js opened with a thin two-line `/* === LANDING PAGE LOGIC === */` block. Replaced with a 19-line four-slot `//` banner:
- **OWNS:** multi-language rendering (EN/HE/DE/CS via LANDING_I18N), dark-mode theme detection, smooth-scroll anchor links, feature-card spotlight glow, demo-iframe resize handles, Lemon Squeezy checkout CTA (LS_CHECKOUT_URL constant), licensed-user auto-detect redirect
- **PUBLIC SURFACE:** none — self-boots on DOMContentLoaded, registers no global (no window.X= assignments anywhere in the file)
- **DEPENDENCIES:** browser APIs only (localStorage, navigator.language, window.location, iframe.contentWindow.postMessage for demo-lang sync); no cross-window.* globals from other app IIFEs are read
- **CONSTRAINTS:** marketing page — not included in the PWA SW precache; demo iframe is same-origin so postMessage uses window.location.origin; language/theme preferences from localStorage

No body archaeology found in landing.js — the thin opener was the only comment requiring replacement.

### assets/license.js — JSDoc header rewritten to four-slot shape + body de-phased

Kept the existing `/** */` JSDoc style per the plan. Rewrote the 8-line header into a 23-line four-slot banner:
- **OWNS:** first-time activation via Lemon Squeezy License API, offline daily validation (localStorage-only), deactivation flow, license page UI
- **PUBLIC SURFACE:** window.applyLicenseLang (re-applies i18n strings; called by shared-chrome on init/language-change)
- **DEPENDENCIES:** Lemon Squeezy License API (internet required for activation/deactivation only); window.renderLicenseChrome (shared-chrome.js) called after deactivation
- **CONSTRAINTS:** STORE_ID/PRODUCT_ID are public IDs (not secrets); base64-encoded credentials are cosmetic obfuscation only — real security is LS's 2-device activation limit; isLicensed() is localStorage-only, no network call on daily use

Body de-phasing (5 references stripped):
- `(DEBT-01)` in the base64 helper section comment → plain prose
- `Phase 35 Plan 06 (D-09 / DEMO-11) —` demo neutralization comment → `Neutralize license activation in the sales demo.`
- `per D-18 (bold red warning text)` on deactivate-dialog comment → plain description
- `Per D-19:` on the clear-localStorage comment → `Clear localStorage keys, return to the activation form`
- `Per D-19:` on the offline-error comment → `Offline deactivation shows an error but does NOT clear local state`

### assets/snippets.js — JSDoc header converted to four-slot // banner + body de-phased

Converted the `/** */` JSDoc header to the canonical `//` format and stripped the `(Phase 24 Plan 04)` title tag. The existing header already covered all four slots (the ≥3-of-4 test), so content was preserved and restructured to the labelled format:
- **OWNS:** binding `[data-snippets="true"]` textareas with trigger detection, autocomplete popover, locale fallback chain, keyboard nav; single recall chokepoint for all snippet expansion
- **PUBLIC SURFACE:** window.Snippets — { init, bindTextarea, unbindTextarea, getPrefix, setPrefix }; also window.Snippets.__testExports.{detectTrigger, resolveExpansion}
- **DEPENDENCIES:** window.App.getSnippets — accessed via explicit window. prefix because App is in a different IIFE (assets/app.js)
- **CONSTRAINTS:** Unicode-aware trigger validation (\p{L}\p{N}); setPrefix is the single chokepoint that validates + persists the prefix

Body de-phasing (2 references stripped):
- `Phase 24 Plan 05 — Tag-trigger MVP.` on the tag-trigger fallback comment → `Tag-trigger fallback:`
- `Plan 04 spec required setPrefix to … — caught during Plan 05 UAT.` → `The persist + broadcast steps were added after validation-only was the original implementation.`

### assets/backup-modal.js — heavy archaeology header rewritten to four-slot banner + body de-phased

The most archaeology-heavy file in this plan. The 31-line `/** */` header carried a Phase-number, round-number (class-b manual), Change-number (class-b manual), UAT tag, and ISO date on the opening provenance line. Replaced with a 34-line four-slot `//` banner:
- **OWNS:** Backup & Restore modal in-place on every app page — markup injection, all handlers (export/import/share/test-password/close/Esc/?openBackup=1), relative-time subtitle. The BEFORE/AFTER design rationale (why this module exists: formerly navigated away from the current page; now opens in-place) is preserved as plain prose.
- **PUBLIC SURFACE:** window.openBackupModal · window.closeBackupModal · window.openExportFlow · window.renderLastBackupSubtitle · window.formatRelativeTime (this global was missing from the original header — now documented); window.__backupModalWired guard noted
- **DEPENDENCIES:** window.App (lockBodyScroll, unlockBodyScroll, t, applyTranslations, showToast, confirmDialog, updateBackupCloudState); window.BackupManager (exportEncryptedBackup, exportBackup, triggerDownload, isAutoBackupActive, autoSaveToFolder, shareBackup, importBackup, testBackupPassword, isShareSupported); window.__afterBackupRestore; JSZip global
- **CONSTRAINTS:** delegates ZIP/crypto to BackupManager — does not do ZIP or encryption itself; overview.js hooks in-place refresh, other pages reload

Body de-phasing (2 references stripped):
- `Phase 25 Plan 02/03/12 block that` in the MODAL_HTML section comment → `the block that previously lived only in index.html`
- `Phase 35 Plan 06 (D-09 / DEMO-11) —` on the export-flow demo guard → `Block the export flow in the sales demo, mirroring the openImportFlow guard.`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing coverage] window.formatRelativeTime missing from backup-modal.js PUBLIC SURFACE**
- **Found during:** Task 2 (reading the file before editing)
- **Issue:** The original header listed `window.openBackupModal / window.renderLastBackupSubtitle / window.openExportFlow / window.closeBackupModal` but omitted `window.formatRelativeTime`, which is explicitly registered at line 193 (`window.formatRelativeTime = formatRelativeTime`). A banner that misdescribes the public surface is the one defect this phase can ship (per style guide WR-01 rule).
- **Fix:** Added `window.formatRelativeTime` to the PUBLIC SURFACE slot.
- **Files modified:** assets/backup-modal.js
- **Commit:** d0f1195

**2. [Rule 1 - De-phase] DEBT-01 tag in license.js not in grep's prefix list**
- **Found during:** Task 1
- **Issue:** The comment `// in localStorage (DEBT-01)` contained a build-history debt-tracking ID. `DEBT-` is not in the de-phase grep's explicit prefix list, so the gate would not catch it automatically.
- **Fix:** Stripped `(DEBT-01)` to plain prose per D-07 spirit ("no planning ID survives in product code").
- **Files modified:** assets/license.js
- **Commit:** d0f1195

None of the other changes deviated from the plan.

## Known Stubs

None. This is a comment-only plan — no code symbols, data flows, or UI elements.

## Threat Flags

None. Comment-only edits add no attack surface. No new schema push, no new network endpoints, no new auth paths.

## Self-Check: PASSED

- `assets/landing.js` exists with banner: confirmed (starts with `// ─────`)
- `assets/license.js` exists with four-slot banner: confirmed (/** banner rewritten)
- `assets/snippets.js` exists with banner: confirmed (starts with `// ─────`)
- `assets/backup-modal.js` exists with banner: confirmed (starts with `// ─────`)
- Commit `d0f1195` exists: confirmed
- `npm test` 119/119: confirmed
- Strip-and-compare COMMENTS_ONLY_OK: confirmed
- DEPHASE_CLEAN on all 4 files: confirmed
- Scope fence: backup.js, app.js, pdf-export.js NOT modified: confirmed
