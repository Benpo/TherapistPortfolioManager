---
phase: 19-go-live-preparation
plan: 03
subsystem: ui
tags: [web-crypto, aes-gcm, pbkdf2, backup, encryption, indexeddb]

# Dependency graph
requires:
  - phase: 07-investigate-data-backup-strategy
    provides: BackupManager ZIP export/import in assets/backup.js
  - phase: 16-audit-fix-code
    provides: backup.js uses portfolioLang key, backup-reminder CSS uses design tokens
provides:
  - Encrypted backup export via Web Crypto API (AES-256-GCM, PBKDF2 310K iterations)
  - Passphrase modal UI (DOM-created, no persistent markup)
  - .sgbackup binary format with magic bytes SG01
  - Backward-compatible import (.zip and .json still work without passphrase)
  - Passphrase modal CSS using existing design tokens (dark mode automatic)
affects: [go-live, security-guidance, backup-reminder]

# Tech tracking
tech-stack:
  added: [Web Crypto API (crypto.subtle) — built-in, zero new dependencies]
  patterns:
    - PBKDF2 key derivation with fresh random salt per encrypt call (never cached)
    - AES-GCM with fresh random IV per encrypt call
    - .sgbackup binary format: 4B magic + 16B salt + 12B IV + ciphertext+GCM-tag
    - OperationError catch for wrong-passphrase detection (DOMException from AES-GCM auth failure)
    - Dynamic DOM modal creation and teardown (no persistent markup)

key-files:
  created: []
  modified:
    - assets/backup.js
    - assets/app.css

key-decisions:
  - "Passphrase is never stored — lost passphrase means unrecoverable backup (by design, D-22)"
  - "Each encrypt call generates fresh salt and IV via crypto.getRandomValues() — no key reuse"
  - "exportEncryptedBackup() reuses exportBackup() then wraps with _encryptBlob() — clean layering"
  - "importBackup() detects .sgbackup by extension, prompts passphrase, decrypts, then recurses with zip File"
  - "OperationError (AES-GCM auth failure) mapped to friendly message — no raw DOMException shown to user"
  - "All CSS uses var() design tokens — dark mode automatic without additional rules"

patterns-established:
  - "Web Crypto pattern: importKey -> deriveKey (PBKDF2) -> encrypt/decrypt (AES-GCM)"
  - "Modal pattern: _showPassphraseModal creates/destroys DOM per use, calls onConfirm or onCancel callbacks"
  - "File format detection: importBackup dispatches on .pop().toLowerCase() extension before any parsing"

requirements-completed: [LIVE-08]

# Metrics
duration: 15min
completed: 2026-03-24
---

# Phase 19 Plan 03: Encrypted Backup Summary

**AES-256-GCM encrypted backup export/import via Web Crypto API PBKDF2 key derivation, .sgbackup binary format with passphrase modal — zero new dependencies**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-24T19:30:00Z
- **Completed:** 2026-03-24T19:45:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added full AES-256-GCM encryption/decryption stack to BackupManager using built-in Web Crypto API
- Created passphrase modal with confirm field, mismatch validation, and irreversibility warning
- Extended `importBackup()` to detect `.sgbackup` files and show passphrase prompt — old .zip and .json imports unchanged
- Added all passphrase modal CSS using existing design tokens — dark mode works automatically

## Task Commits

Each task was committed atomically:

1. **Task 1: Add encryption/decryption functions and passphrase modal to backup.js** - `2935c9c` (feat)
2. **Task 2: Add passphrase modal CSS to app.css** - `78281f3` (feat)

## Files Created/Modified

- `assets/backup.js` - Added SGBACKUP_MAGIC constants, _deriveKey(), _encryptBlob(), _decryptBlob(), _showPassphraseModal(), exportEncryptedBackup(); extended importBackup() for .sgbackup support; added exportEncryptedBackup to public API
- `assets/app.css` - Added 120 lines: .passphrase-modal-overlay, .passphrase-modal, .passphrase-warning, .passphrase-irreversible, .passphrase-input, .passphrase-error, .passphrase-actions, .passphrase-btn-cancel, .passphrase-btn-confirm with disabled/hover states

## Decisions Made

- Used `var` throughout backup.js to match existing codebase style (not `let`/`const`)
- `exportEncryptedBackup()` calls `exportBackup()` internally then wraps the ZIP blob with `_encryptBlob()` — clean separation of concerns, no duplication of ZIP logic
- Import recursion: after decrypting .sgbackup, creates a `new File([zipBlob], 'backup.zip')` and calls `importBackup()` recursively — reuses existing ZIP processing path, no duplication
- `onCancel` in decrypt mode resolves with `null` (not rejects) — cancelled import is not an error
- `color: #fff` on confirm button is the only non-token hex value — intentional, white text on --color-primary background per plan specification

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `BackupManager.exportEncryptedBackup()` is ready to wire up to UI buttons in index.html / the settings/backup UI
- Callers creating file input pickers for import should update the `accept` attribute to `.sgbackup,.zip,.json`
- The encrypted backup capability satisfies D-19 through D-22 from 19-CONTEXT.md

---
*Phase: 19-go-live-preparation*
*Completed: 2026-03-24*
