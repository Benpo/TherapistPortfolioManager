# Phase 25: Backup Architectural Rework — Research

**Researched:** 2026-05-15
**Domain:** Browser-side backup architecture (Web Share API, File System Access API, Web Crypto, Canvas image processing, IndexedDB), modal/Settings UI consolidation, scheduled-task UX in a single-page PWA
**Confidence:** HIGH

## Summary

Phase 25 reworks the backup subsystem of an existing vanilla-JS PWA. The codebase already has all the primitives needed: a hardened `BackupManager` module (`assets/backup.js`) with AES-256-GCM encryption, JSZip 3.10.1 for the ZIP container, a passphrase modal pattern, the `confirmDialog` modal helper, the `App.showToast` notification helper, the `CropModule` canvas pipeline, an established `add-session.js:exportHandleShare` Web Share API pattern, and a 4-locale i18n system keyed off `data-i18n` attributes. **The phase is overwhelmingly an integration/composition exercise, not a green-field build.**

Three real research questions surfaced:

1. **Web Share API on Safari macOS (Sapir's primary platform)** — the existing add-session export already ships a working `navigator.canShare({ files: [file] })` pattern; the new flow can mirror it 1:1.
2. **EXIF orientation on iPhone uploads** — iOS Safari already honors EXIF for `<img>` decode, so the existing crop pipeline silently does the right thing for resized JPEG re-encodes; we should explicitly use `createImageBitmap(blob, { imageOrientation: 'from-image' })` to make this guarantee browser-portable.
3. **Scheduled-backup timing in a closed-tab PWA** — Periodic Background Sync is unsupported on Safari/iOS (Sapir's platform). The simplest reliable approach for this phase is a foreground check on `visibilitychange` + page load, comparing `Date.now()` to a `localStorage` cadence timestamp. Silent folder-write is already deferred (D-20).

**Primary recommendation:** Build Phase 25 as a thin re-composition layer on top of existing primitives. The biggest architectural decision — already made in CONTEXT — is moving from a button cluster to a single modal entry point with internal sections. Treat the modal as a *container* for existing flows (`exportEncryptedBackup`, `importBackup`, the new Web Share hook, the new schedule settings, the new password test) rather than rewriting any of them.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Backup ZIP build + encrypt | BackupManager (assets/backup.js) | — | Already owns this; do not relocate |
| Photo resize on upload | CropModule (assets/crop.js) | add-client.js entry point | Resize is a canvas op; CropModule already has the canvas |
| Photo storage (cropped only) | IndexedDB `clients.photoData` | — | No schema change; field already exists |
| Photo storage usage display | navigator.storage.estimate() + walk-IDB fallback | Photos Settings section | Browser API is primary; we instrument as fallback |
| Web Share API invocation | New helper inside backup.js (or a tiny `share.js`) | Export modal | Mirrors `add-session.js:exportHandleShare` |
| Backup folder picker | BackupManager.pickBackupFolder (existing) | Scheduled-backup Settings section | Already wraps `showDirectoryPicker` |
| Scheduled-backup cadence check | New `assets/backup-schedule.js` (or extension to backup.js) | Listens on `visibilitychange` + page load | Foreground polling, no Service Worker |
| Last-backup chip on overview | overview.js | reads `localStorage.portfolioLastExport` | Pure read, no new storage |
| 7-day reminder banner suppression | app.js `checkBackupReminder` (existing) | reads `portfolioBackupScheduleEnabled` flag | Single guard at top of existing function |
| Backup contents checklist | Static markup inside the new modal | — | Keep simple; do NOT introspect the manifest at runtime |
| Test-backup-password dry-run | New helper that wraps `_decryptBlob` (existing private fn) | — | Decrypt to memory, validate manifest header, discard |
| Modal entry button | overview.js + index.html | Reuses `inline-actions` flex container | Position decision in CONTEXT (planner discretion) |
| 4-locale strings | i18n-{en,he,de,cs}.js | App.t lookup | Existing convention |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Area 1 — Send-to-Myself Fix**
- **D-01:** Remove the "Send backup to myself" button entirely from the overview. Reason: `BackupManager.sendToMyself()` (assets/backup.js:882) calls the unencrypted `exportBackup()` directly, bypassing the encrypt/skip-encryption modal. Security regression, not just UX bug.
- **D-02:** Add Web Share API as a destination INSIDE the existing encrypt-aware export dialog. On platforms supporting `navigator.share({ files: [...] })`, invoke the share sheet. Fallback: download + open mailto with HONEST body ("Backup downloaded to your Downloads folder. Please attach `<filename>` to this email manually.")
- **D-03:** Rename the share affordance to "Share backup" (4-locale: EN "Share backup" / HE "שיתוף גיבוי" noun form per Phase 24 D-05 / DE "Backup teilen" / CS "Sdílet zálohu"). Honest under both Web Share and mailto-fallback paths.
- **D-04:** All "Share" paths INHERIT the encryption choice made in the export dialog — never a separate "skip encryption" path hidden inside Share.

**Area 2 — 3-Button Consolidation + Entry Point**
- **D-05:** Single "Backup & Restore" surface opened from the overview. The 3 dominant buttons (Export, Import, Send) collapse to ONE entry point.
- **D-06:** Implementation pattern: modal, NOT a separate page. Reuses existing modal/dialog plumbing.
- **D-07:** Modal layout: Export prominent (top, full visual weight) + Import secondary (bottom section, smaller, with destructive warning). NOT a 50/50 dual-pane split.
- **D-08:** Entry point on overview: one clearly-labeled button ("Backup & Restore" or "Backup") replacing the current 3-button cluster. Position: same card area as today. Exact placement at planner's discretion within the constraint that it must be highly noticeable.

**Area 3 — Surface Contents (What Goes Inside the Modal)**
- **D-09:** Backup contents visibility — modal explicitly shows what is inside the backup file with checkmark icons + brief one-line descriptions: ✓ Clients ✓ Sessions ✓ Snippets ✓ Settings ✓ Photos. Must update whenever a new IDB store is added.
- **D-10:** Last-backup-at indicator inside the modal header — "Last backup: 3 days ago" (or "Never"). Source: existing `localStorage.portfolioLastExport`.
- **D-11:** Backup folder picker is NOT a standalone overview button anymore. Moves INSIDE the scheduled-backup settings.
- **D-12:** Test-backup-password dry-run — "Test backup password" action inside the modal (or in Settings — planner picks). User uploads a backup file + enters the password; the app verifies the password decrypts the file but does NOT restore anything. Clear instructions: "This only checks your password works. Your current data is not touched."

**Area 4 — Backup Awareness on Overview (Chip)**
- **D-13:** Passive "last backup" chip on overview, color-thresholded. Always present.
- **D-14:** Color thresholds couple to schedule state — Schedule OFF: green ≤7 days / warning ≤14 / danger >14. Schedule ON: green ≤ chosen interval / warning ≤ interval × 1.5 / danger > interval × 2.
- **D-15:** Schedule ↔ banner ↔ chip coupling — Schedule OFF: existing 7-day banner stays. Schedule ON: SUPPRESS the 7-day banner entirely; chip remains.

**Area 5 — Scheduled-Backup Fold**
- **D-16:** Frequency selector — Off (default for new users) / Daily / Weekly / Monthly / Custom days.
- **D-17:** Interval-end prompt — modal pops asking the user to back up now. Always downloads (no silent folder-write). Pre-fills filename + offers Share.
- **D-18:** Password mandatory for scheduled backups — user CANNOT enable a schedule without setting up a backup password.
- **D-19:** Suppress 7-day banner when schedule is ON. Re-enables if schedule turned off.
- **D-20:** Auto-save to chosen folder is OUT of scope this phase. Surface-only: scheduled prompts always download via the browser.

**Area 6 — Photo Handling**
- **D-21:** Resize on upload — max 800px on long edge, JPEG quality 0.75. Typical output: 80-120KB per photo.
- **D-22:** Store ONLY the final cropped/positioned photo, NOT the original. Re-cropping later = re-upload. Future plans must NOT restore the "store original + crop metadata" pattern.
- **D-23:** No hard upload-size cap on original input.
- **D-24:** Existing photos: optional one-time "Optimize photos" action — NOT auto-migration. User explicit consent + clear preview of savings.
- **D-25:** New dedicated "Photos" section in Settings with: storage usage display, "Optimize all photos" button (with estimated savings preview + confirmation), "Delete all photos" button (destructive with strong warning), toast on success/failure.

**Cross-Cutting**
- **D-26:** Every new surface MUST have clear headers + instructions. No bare button grids.
- **D-27:** Hebrew strings use noun/infinitive forms (per Phase 24 D-05). No imperatives.
- **D-28:** 4-locale parity (EN/HE/DE/CS) for every new UI string.
- **D-29:** Backup round-trip completeness is a HARD acceptance criterion. Export must include every IDB store; import must restore all losslessly. Future stores added to db.js MUST be added to `BackupManager.exportBackup` and `normalizeManifest` in the same change.
- **D-30:** Single-source-of-truth pattern (per Phase 24 D-01) — any logic touched by both the new export dialog and Settings should be one function with multiple callers.

### Claude's Discretion
- Exact modal layout within "Export prominent, Import secondary" constraint
- Where "Test backup password" feature lives (modal vs Settings)
- Where "Backup folder" picker UI lives within scheduled-backup settings
- Storage-usage display unit & precision
- Modal entry button label & position on overview

### Deferred Ideas (OUT OF SCOPE)
- Silent auto-save to chosen folder on schedule fire (D-20 explicitly defers)
- In-app onboarding / help system → Phase 26
- v12 full IndexedDB encryption → separate phase per ROADMAP
- PWA install guidance + user manual → Phase 26
- Re-crop UI on existing photos (no original stored after D-22)
- Per-client photo size budget / quotas
- Backend-mediated send (option D from N7) — rejected outright on principle (data-never-leaves-device value)
</user_constraints>

## Project Constraints (from CLAUDE.md)

- **Git pull at session start.** [VERIFIED: project CLAUDE.md] — non-negotiable for every session, including all plan-phase / executor invocations.
- **Lemon Squeezy:** Sessions Garden store ID is **324581**. Never query/modify store 289135 (Sapphire Healing). [VERIFIED: project CLAUDE.md] — irrelevant to Phase 25 (no Lemon Squeezy touch points).
- **Never read .env files.** [VERIFIED: global CLAUDE.md] — irrelevant to Phase 25 (no secrets touch points).
- **Always date-prefix temp files.** [VERIFIED: global CLAUDE.md] — applies to any context-storage artifacts.

## Standard Stack

### Core (already loaded; reuse)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| JSZip | 3.10.1 | Backup ZIP container | Already loaded via `<script src="./assets/jszip.min.js">` in every page; no change. [VERIFIED: index.html:250] |
| Web Crypto API (built-in) | — | AES-256-GCM via PBKDF2 SHA-256, 310k iterations | Already used by `_deriveKey` / `_encryptBlob` / `_decryptBlob` in backup.js:34-86 [VERIFIED: codebase] |
| Web Share API (built-in) | — | Share-sheet invocation for backup files | Already used by `assets/add-session.js:1337` (exportHandleShare) — same pattern reusable verbatim [VERIFIED: codebase] |
| File System Access API (built-in) | — | `showDirectoryPicker` for backup-folder UX | Already wrapped by `BackupManager.pickBackupFolder` (backup.js:928); only the UI hosting it changes [VERIFIED: codebase] |
| Canvas 2D API (built-in) | — | Photo resize-on-upload + crop | Already used by `CropModule` in crop.js; resize is one extra step in the same pipeline [VERIFIED: codebase] |
| `navigator.storage.estimate()` (built-in) | — | Storage usage display in Photos Settings | Already used by `App.requestPersistentStorage` (app.js:724) for persist; estimate is a separate call on the same `navigator.storage` object [VERIFIED: codebase + MDN] |
| IndexedDB (built-in) | DB_VERSION 5 | Data store | No DB_VERSION bump expected (D-22 + D-25 reuse existing `clients.photoData` field) [VERIFIED: assets/db.js:4] |

### Supporting (existing project helpers)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `App.confirmDialog({ titleKey, messageKey, confirmKey, cancelKey, tone })` | OK/Cancel modal with i18n keys + danger/neutral tone [VERIFIED: assets/app.js:550] | Destructive confirms (Optimize all photos, Delete all photos, Skip-encryption confirm pane already wired) |
| `App.showToast(message, key)` | 1.8-second auto-dismiss toast notification [VERIFIED: assets/app.js:532] | Success/failure feedback on photo optimize/delete, share-completed, password-test result |
| `App.t(key)` | i18n string lookup with active-language fallback [VERIFIED: codebase pattern] | Every user-visible string |
| `App.lockBodyScroll()` / `App.unlockBodyScroll()` | Scroll lock for modals [VERIFIED: backup.js:268, 376] | Backup & Restore modal open/close |
| `App.readFileAsDataURL(file)` | Promise-based FileReader wrapper [VERIFIED: add-client.js:65] | Photo upload (already used) |
| `BackupManager.exportBackup()` → `{ blob, filename }` | Build unencrypted ZIP [VERIFIED: backup.js:518] | Skip-encryption path |
| `BackupManager.exportEncryptedBackup()` → `Promise<true \| false \| 'cancel'>` | Passphrase modal + encrypted save [VERIFIED: backup.js:643] | Encrypted path; resolves true=done, false=user-skipped (caller does unencrypted), 'cancel'=user-aborted (caller MUST stop) |
| `BackupManager.importBackup(file)` → `Promise<manifest>` | Detect format, decrypt if .sgbackup, restore all stores [VERIFIED: backup.js:692] | Import path (already wired) |
| `BackupManager.normalizeManifest(parsed)` | Defensive defaults for missing stores in older backups [VERIFIED: backup.js:472] | Continue this pattern when adding new stores |
| `BackupManager.pickBackupFolder()` / `autoSaveToFolder(blob, filename)` / `isAutoBackupSupported()` / `isAutoBackupActive()` | Folder picker + write [VERIFIED: backup.js:912-969] | Move into Settings; D-20 still uses pickBackupFolder for folder UX even though silent write is deferred |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Foreground `visibilitychange` poll for schedule | Periodic Background Sync API | [CITED: web.dev/patterns/web-apps/periodic-background-sync] Unsupported on Safari/iOS (Sapir's platform); Chrome requires PWA-installed + engagement score > 0. Foreground polling is the only cross-platform option for a single-tab therapist app. **Decision: foreground.** |
| Foreground `visibilitychange` poll | Service Worker `setTimeout` / `setInterval` | Service Workers terminate after ~30s idle; timers do not survive. Not a real option. |
| `navigator.share({ files })` for backup | Backend-mediated SMTP | [Already rejected per CONTEXT.md] Adds GDPR data-processor scope; violates "data never leaves the device" core value. |
| `createImageBitmap(blob, { imageOrientation: 'from-image' })` for photo decode | Manually parse EXIF bytes | [CITED: MDN createImageBitmap] Browser does the right thing; manual EXIF parsing is ~200 LOC of edge-case code we don't need. |
| `navigator.storage.estimate()` for usage display | Walk IDB and sum byte sizes ourselves | [CITED: MDN StorageManager.estimate] Browser API is standard; `usageDetails` breakdown is Chrome-only and not in Safari, but the top-level `usage` field works everywhere. Walk-IDB is a fallback for per-store breakdowns if D-25 needs them. |

**Installation:** No new dependencies needed. All capabilities exist as browser-native APIs or already-loaded scripts. [VERIFIED: codebase grep — no new `<script>` tags required]

**Version verification:** JSZip 3.10.1 was last released 2023-04-09; current latest at npmjs.com is still 3.10.1 (no breaking change since). [VERIFIED: codebase comment in backup.js:13 + npm registry knowledge as of training cutoff]. No upgrade required.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ OVERVIEW (index.html)                                               │
│   ┌──────────────┐  ┌──────────────┐                                │
│   │ Add Client   │  │ Add Session  │                                │
│   └──────────────┘  └──────────────┘                                │
│                                                                      │
│   ┌──────────────────────┐  ┌────────────────────────┐              │
│   │ Backup & Restore [+] │  │ ⬤ Last backup: 3 days ago│ (chip)    │
│   └──────────────────────┘  └────────────────────────┘              │
│              │                          ▲                            │
│              ▼                          │                            │
│   ┌─────────────────────────────────────┴────┐                      │
│   │ BACKUP & RESTORE MODAL (new)             │                      │
│   │   • Last backup: 3 days ago (D-10)       │                      │
│   │   • Backup contents ✓✓✓✓✓ (D-9)          │                      │
│   │   ┌────────────────────────────────────┐ │                      │
│   │   │ EXPORT (prominent — D-7)           │ │                      │
│   │   │   [Export backup]  [Share backup]  │ │                      │
│   │   └────────┬───────────────────┬───────┘ │                      │
│   │            │                   │         │                      │
│   │   ┌────────┴───────────────────┴───────┐ │                      │
│   │   │ IMPORT (secondary — D-7)           │ │                      │
│   │   │   ⚠ Replaces all current data      │ │                      │
│   │   │   [Choose backup file]             │ │                      │
│   │   └────────────────────────────────────┘ │                      │
│   │   ┌────────────────────────────────────┐ │                      │
│   │   │ Test backup password (D-12)        │ │                      │
│   │   │   ⓘ Read-only check; no restore    │ │                      │
│   │   └────────────────────────────────────┘ │                      │
│   └──────────┬─────────┬─────────┬───────────┘                      │
└──────────────┼─────────┼─────────┼──────────────────────────────────┘
               │         │         │
               ▼         ▼         ▼
        ┌──────────┐ ┌────────┐ ┌──────────────────┐
        │ Existing │ │ Existing│ │ NEW              │
        │ encrypt- │ │ import- │ │ test-password    │
        │ Backup   │ │ Backup  │ │ wrapper around   │
        │ (passphr.│ │ (decrypt│ │ _decryptBlob     │
        │  modal)  │ │  + put) │ │ (no IDB write)   │
        └────┬─────┘ └────┬────┘ └─────────┬────────┘
             │            │                │
             ▼            ▼                ▼
      ┌──────────────────────────────────────────┐
      │ BackupManager (assets/backup.js — exists)│
      │   exportBackup / exportEncryptedBackup   │
      │   importBackup / normalizeManifest       │
      │   _encryptBlob / _decryptBlob (private)  │
      │   pickBackupFolder / autoSaveToFolder    │
      └──────┬───────────────────────────────────┘
             │
             ▼
      ┌──────────────────────────────────────────┐
      │ IndexedDB (assets/db.js — DB_VERSION 5)  │
      │   clients   sessions   therapistSettings │
      │   snippets                                │
      └──────────────────────────────────────────┘

Cross-cutting (separate from modal):

┌─────────────────────────────────────────────────────────────────────┐
│ SETTINGS (settings.html — gets new tab + section)                   │
│                                                                      │
│   [Custom field names] [Snippets] [Backups (NEW)] [Photos (NEW)]    │
│                                                                      │
│   BACKUPS tab:                                                      │
│     • Frequency: Off / Daily / Weekly / Monthly / Custom (D-16)     │
│     • Backup folder picker (moved from overview — D-11)             │
│     • Backup password setup (mandatory if frequency≠Off — D-18)     │
│                                                                      │
│   PHOTOS tab (D-25):                                                │
│     • Storage usage: "Photos use 47 MB" (navigator.storage.estimate)│
│     • Optimize all photos [Save ~35 MB] (D-24 — confirm modal)      │
│     • Delete all photos (destructive — confirm modal)               │
└─────────────────────────────────────────────────────────────────────┘

Cross-cutting (background — but FOREGROUND-only execution per "Open Questions" §4):

   page load OR visibilitychange='visible'
            │
            ▼
   ┌─────────────────────────────┐
   │ checkBackupSchedule()       │
   │ (NEW — assets/backup.js or  │
   │  assets/backup-schedule.js) │
   │                              │
   │  if (schedule enabled AND   │
   │      Date.now() - lastExport│
   │      > intervalMs):         │
   │      → fire interval-end    │
   │        modal (D-17)         │
   └─────────────────────────────┘
```

### Recommended Project Structure

No new files strictly required. Suggested file additions for clarity:

```
assets/
├── backup.js              # existing — extend with shareBackup() + testBackupPassword()
├── backup-schedule.js     # NEW (optional) — schedule cadence check & interval-end prompt
│                            # Could also live inline in backup.js; size ~80-150 LOC
├── photos-settings.js     # NEW (optional) — Photos Settings tab logic
│                            # Could also live in settings.js if ≤100 LOC
├── crop.js                # existing — extend with resizeToMaxDimension()
└── settings.js            # existing — add Backups tab + Photos tab handlers
```

The "could also live inline" notes reflect the project's pattern: small modules consolidate into existing files (e.g., backup.js is 1010 LOC and houses passphrase modal, encryption, ZIP build, import, folder picker, send-to-myself).

### Pattern 1: Web Share API with file fallback

**What:** Detect support, attempt share-sheet, fall back to download + mailto.
**When to use:** D-02 / D-03 — Share backup destination inside export dialog.
**Example (mirrors existing add-session.js:1337):**
```javascript
// Source: codebase pattern at assets/add-session.js:1337-1387
async function shareBackup(blob, filename) {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });

  // Feature-detect — same probe pattern as exportProbeShareSupport
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: App.t('backup.share.title') || 'Sessions Garden backup',
        text: App.t('backup.share.text') || ''
      });
      return { ok: true, via: 'share' };
    } catch (err) {
      if (err && err.name === 'AbortError') return { ok: false, via: 'share', cancelled: true };
      console.warn('Share failed, falling back to download+mailto:', err);
      // fall through to mailto fallback
    }
  }

  // Fallback path: trigger download + open mailto with HONEST body (D-02)
  BackupManager.triggerDownload(blob, filename);
  const subject = encodeURIComponent('Sessions Garden backup - ' + new Date().toISOString().slice(0, 10));
  const body = encodeURIComponent(
    App.t('backup.share.fallback.body').replace('{filename}', filename)
    // EN seed: "Backup downloaded to your Downloads folder. Please attach " + filename + " to this email manually."
  );
  window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
  return { ok: true, via: 'mailto-fallback' };
}
```

**Key invariant (D-04):** `shareBackup` is called with the blob/filename PRODUCED BY whichever encryption path the user picked in the export dialog. Never builds its own backup, never re-prompts for encryption.

### Pattern 2: EXIF-aware photo resize

**What:** Decode the file with EXIF orientation respected, draw onto a max-dimension canvas, re-encode as JPEG q=0.75.
**When to use:** D-21 — every new photo upload via add-client.js.
**Example:**
```javascript
// Source: combines codebase crop.js drawImage pattern with MDN createImageBitmap docs
async function resizeToMaxDimension(file, maxEdge = 800, quality = 0.75) {
  // imageOrientation: 'from-image' makes EXIF orientation handled by the browser.
  // Defaults to 'from-image' in modern Chrome/Safari but be explicit for portability.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const longEdge = Math.max(bitmap.width, bitmap.height);
  const scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close(); // free GPU/decoder memory

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
                  'image/jpeg', quality);
  });
}
```

**Then feed the resized blob into the existing CropModule.openCropModal flow.** The crop UI ends with `offCanvas.toDataURL("image/jpeg", 0.85)` (crop.js:139) — D-22 means the resize-then-crop output is the only photo data ever stored; no original retained.

### Pattern 3: Test-backup-password dry-run

**What:** Decrypt to memory, validate header, discard. No IDB writes.
**When to use:** D-12.
**Example:**
```javascript
// New function — wraps existing private _decryptBlob without exposing it.
// Lives inside backup.js IIFE; exported as testBackupPassword.
async function testBackupPassword(file, passphrase) {
  const ext = (file.name || '').split('.').pop().toLowerCase();
  if (ext !== 'sgbackup') {
    throw new Error('test.password.notEncrypted'); // i18n key for "This file is not encrypted; no password needed."
  }
  let zipBlob;
  try {
    zipBlob = await _decryptBlob(file, passphrase);
  } catch (err) {
    if (err && err.name === 'OperationError') {
      // AES-GCM authentication failure = wrong passphrase (same as importBackup branch at line 717-719)
      throw new Error(_t('backup.passphrase.wrongPassphrase'));
    }
    throw err;
  }
  if (!zipBlob) throw new Error('Not a valid .sgbackup file');

  // Sanity check: confirm it's a real backup ZIP — read manifest header.
  const arrayBuffer = await zipBlob.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const jsonFile = zip.file('backup.json');
  if (!jsonFile) throw new Error('Decrypted file does not contain backup.json');
  const text = await jsonFile.async('string');
  const manifest = JSON.parse(text); // throws on malformed JSON

  // Discard: no PortfolioDB writes. arrayBuffer + zip + manifest go out of scope.
  return {
    ok: true,
    manifestVersion: manifest.version,
    exportedAt: manifest.exportedAt,
    clientCount: Array.isArray(manifest.clients) ? manifest.clients.length : 0,
    sessionCount: Array.isArray(manifest.sessions) ? manifest.sessions.length : 0
  };
}
```

**Safety guarantee:** No `db.clearAll()`, no `db.addClient()`, no `localStorage.setItem('portfolioLastExport', ...)`. The current data is provably untouched because no write path is reachable.

### Pattern 4: Foreground schedule check on visibility / page load

**What:** Compare `Date.now()` to `localStorage.portfolioLastExport` against the chosen interval; if elapsed, show interval-end prompt.
**When to use:** D-17 — every page load and every `visibilitychange='visible'`.
**Example:**
```javascript
// Lives in App.initCommon() or a small new module loaded on every page.
const SCHEDULE_INTERVAL_MS = {
  off: null,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  // custom: read from localStorage.portfolioBackupScheduleCustomDays
};

function getScheduleIntervalMs() {
  const mode = localStorage.getItem('portfolioBackupScheduleMode') || 'off';
  if (mode === 'off') return null;
  if (mode === 'custom') {
    const days = Number(localStorage.getItem('portfolioBackupScheduleCustomDays')) || 7;
    return days * 24 * 60 * 60 * 1000;
  }
  return SCHEDULE_INTERVAL_MS[mode] || null;
}

function checkBackupSchedule() {
  const intervalMs = getScheduleIntervalMs();
  if (!intervalMs) return; // schedule off — let existing 7-day banner handle it (and per D-15)

  const lastExport = Number(localStorage.getItem('portfolioLastExport')) || 0;
  const dueAt = lastExport + intervalMs;
  if (Date.now() < dueAt) return;

  // Avoid re-prompting on every page navigation in the same session
  const lastPromptKey = 'portfolioBackupSchedulePromptedAt';
  const lastPrompt = Number(localStorage.getItem(lastPromptKey)) || 0;
  if (Date.now() - lastPrompt < 60 * 60 * 1000) return; // 1-hour debounce

  localStorage.setItem(lastPromptKey, String(Date.now()));
  showIntervalEndPrompt(); // opens the Backup & Restore modal pre-focused on Export
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkBackupSchedule();
});
// Also call once on load:
checkBackupSchedule();
```

**Banner suppression (D-15 + D-19):** Inside the existing `app.js:checkBackupReminder` (line 737), add a guard at the top:
```javascript
function checkBackupReminder() {
  // D-15/D-19: schedule ON suppresses the 7-day banner — schedule prompt is the reminder.
  if (getScheduleIntervalMs() !== null) return;
  // ...existing body...
}
```

### Anti-Patterns to Avoid

- **Building a separate "Send to myself" code path that bypasses the encrypt modal.** This is what created the security regression (D-01). The new Share button MUST be the same code path as Export, post-encryption-decision.
- **Calling `BackupManager.exportBackup()` from the share handler.** That returns the unencrypted ZIP. Always use the user-chosen path's blob.
- **Bumping DB_VERSION to add a "photo-original" backup column.** D-22 forbids storing the original; the existing `clients.photoData` field is the only photo storage. No schema change needed.
- **Using `setInterval` with a long timeout for schedule firing.** Browser tabs throttle/suspend timers when backgrounded; `visibilitychange` + on-load polling is the reliable pattern.
- **Dynamically generating the Backup Contents checklist from the manifest at runtime.** D-9 explicitly says "must update whenever a new IDB store is added" — this is meant as a *convention*, not a runtime introspection. Hard-coded checklist + a verification test (D-29) is the right enforcement.
- **Relying on `usageDetails` in `navigator.storage.estimate()` for per-store breakdown on Safari.** It's Chrome-only. Use the top-level `usage` for Photos Settings; per-store breakdown requires walking IDB if needed.
- **Hand-rolling EXIF parsing.** Use `createImageBitmap(blob, { imageOrientation: 'from-image' })`. The browser handles it.
- **Writing the destructive "Skip encryption" or "Delete all photos" confirms with a single button.** Use `App.confirmDialog({ tone: 'danger' })` or the existing two-pane skip-confirm pattern (backup.js:278-313).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AES-256-GCM encryption | Custom crypto wrapper | `BackupManager._encryptBlob` / `_decryptBlob` (existing) [VERIFIED: backup.js:56-86] | Already hardened; uses Web Crypto + 310k PBKDF2 iterations. New helpers (testBackupPassword) reuse `_decryptBlob`. |
| ZIP packaging | DIY zip builder | JSZip 3.10.1 (already loaded) | Standard library; supports `STORE` and `DEFLATE` compression methods used by photos and JSON respectively. |
| Passphrase modal | New modal flow | `_showPassphraseModal({mode, onConfirm, onSkip, onCancel})` (backup.js:128) | Has the full Phase 22-15 N11/N12 hardening: skip-confirm pane, complexity rules, RTL, weakness validator. New flows route through it. |
| Confirm dialogs (destructive) | New OK/Cancel modal | `App.confirmDialog({ messageKey, confirmKey, cancelKey, tone })` (app.js:550) | Full keyboard support, focus management, danger/neutral tone, i18n via data-i18n. |
| Toast notifications | DIY toast | `App.showToast(message, key)` (app.js:532) | 1.8s auto-dismiss, single shared `#toast` element, replaced messages don't stack. |
| File reading | Raw FileReader | `App.readFileAsDataURL(file)` / inline `_readFileAsText` / `_readFileAsArrayBuffer` (backup.js:975-991) | Promise-wrapped, error handling baked in. |
| File-System-Access wrapper | `showDirectoryPicker` directly | `BackupManager.pickBackupFolder` + `autoSaveToFolder` + `isAutoBackupSupported`/`isAutoBackupActive` (backup.js:912-969) | Permission re-prompt on stale handle (`queryPermission`/`requestPermission`) is already implemented. |
| Share-sheet detection | New canShare logic | Mirror `exportHandleShare` / `exportProbeShareSupport` from add-session.js:1337-1387 [VERIFIED: codebase] | Identical pattern; copy-paste with new title/text strings. |
| EXIF orientation handling | EXIF byte parser | `createImageBitmap(blob, { imageOrientation: 'from-image' })` [CITED: MDN createImageBitmap] | Browser-native; iOS Safari already honors EXIF for `<img>` decode. |
| Storage usage display | Walk IDB and sum bytes | `navigator.storage.estimate()` [CITED: MDN StorageManager.estimate] | Standard. Walk-IDB only if D-25 needs per-store breakdown beyond top-level `usage`. |
| Schedule timer | `setInterval` / Periodic Background Sync | Foreground `visibilitychange` + on-load check [CITED: web.dev] | Service workers terminate; PBSync unsupported on Safari/iOS. |
| New photo crop UI | Reimplement | Existing CropModule (`assets/crop.js`) [VERIFIED: codebase] | Already has zoom slider, pointer drag, RTL, devicePixelRatio handling. New resize step happens BEFORE openCropModal is called. |

**Key insight:** The most expensive part of every item in this table is already paid for. Phase 25 is plumbing.

## Runtime State Inventory

> Phase 25 is a UI rework + new features. Most items are additive code, but several touch persistent state that must be considered.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data (IndexedDB)** | `clients.photoData` (existing field) — D-21 changes the FORMAT of newly-written values (resized JPEG q=0.75 instead of full crop output q=0.85). Existing rows unchanged unless user runs D-24 "Optimize all photos". `clients` / `sessions` / `therapistSettings` / `snippets` stores — D-29 requires backup round-trip to include all four; already covered by `exportBackup` and `normalizeManifest`. | **No data migration on schema.** D-24 "Optimize all photos" IS a one-time data migration but it's USER-TRIGGERED with explicit confirm — not automatic. **No DB_VERSION bump expected.** |
| **Live service config** | None. App is offline; no external services. | None. |
| **OS-registered state** | File System Access API directory handle — `_savedDirHandle` is module-scoped (NOT persisted). Currently lost on page reload. [VERIFIED: backup.js:19] D-11 moves this UX into Settings; D-20 defers silent-write so the handle still doesn't need to persist (user picks the folder when they want to save). If a future phase wants persistent handles: store in IndexedDB (per Chrome's persistent-permissions docs). | **Decision for Phase 25: keep handle session-scoped.** D-20 puts silent-write out of scope, so persistence is not needed. Document this in plan as a deliberate non-decision. |
| **Secrets / env vars** | Backup passphrase — never stored. User enters it per export. [VERIFIED: backup.js:56-86 — passphrase is consumed by `_deriveKey` and discarded.] D-18 makes scheduled backups require a password setup, but the spec is "user CAN'T enable schedule without a password" — the question is whether to STORE the password or just verify-once. **Open question for planner: Where does the schedule password live?** Storing plaintext in localStorage = security regression. Storing PBKDF2-derived hash = "I forgot my password" disaster (no way to recover the schedule). Most likely answer: do NOT store the password; the schedule still PROMPTS for the password each fire (matching D-17 "interval-end prompt"). **Flag this for discuss-phase clarification.** | **Recommendation:** schedule fire prompts for password each time (no storage). User sets up the schedule + a password reminder is recorded ("you've set a password for backups"), but the password itself is NOT persisted. |
| **localStorage keys touched** | EXISTING (preserved): `portfolioLastExport` (last successful backup epoch ms — used by chip D-13, banner suppression D-15, schedule check D-17), `portfolioBackupSnoozedUntil` (existing 7-day banner snooze), `portfolioAutoBackupEnabled` (set by pickBackupFolder), `portfolioLang`, `portfolioTheme`. NEW (proposed): `portfolioBackupScheduleMode` (off/daily/weekly/monthly/custom), `portfolioBackupScheduleCustomDays` (number), `portfolioBackupSchedulePromptedAt` (debounce stamp). | Document new key names in PLAN; ensure they're stable across phases. |
| **Build artifacts** | Service Worker `sw.js` — pre-commit hook auto-bumps CACHE_NAME on asset diffs [VERIFIED: project memory feedback-pre-commit-sw-bump.md]. If `PRECACHE_URLS` array needs a new entry (e.g., new `assets/backup-schedule.js` file), follow up with a manual chore commit. | Plan should include "if any new asset/* file is added, follow-up chore commit to update sw.js PRECACHE_URLS." |

**The canonical question:** *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?* — Phase 25 is not a rename. The only "stale state" risk is users with existing photo formats (handled by D-24 user-triggered optimize) and users who had previously picked a backup folder (handle was already session-scoped, no stale state).

## Common Pitfalls

### Pitfall 1: Web Share API failing silently on Safari macOS for `.sgbackup` extension

**What goes wrong:** `navigator.canShare({ files: [file] })` returns true for common types (PDF, JPEG, ZIP), but Safari has a documented allow-list of extensions [CITED: MDN]. `.sgbackup` is a custom extension — Safari may reject it.

**Why it happens:** Safari restricts file-share to a permitted list of "well-known" types.

**How to avoid:**
1. **Set the File MIME type explicitly** to `application/octet-stream` for `.sgbackup` (already done in `_encryptBlob` on backup.js:67).
2. **Probe before showing the Share button:** mirror `exportProbeShareSupport` (add-session.js:1371) — create a probe File with the actual MIME type and check `canShare` before exposing the button.
3. **If probe fails:** the Share button stays hidden; only Download is offered. Honest UX.

**Warning signs:** Sapir reports "Share button does nothing" on Safari macOS — it means `canShare` lied (returned true but `share` rejected). Wrap in try/catch as the existing add-session pattern does.

### Pitfall 2: User enables scheduled backups but forgets the password

**What goes wrong:** D-18 makes password mandatory. User sets it up, then 30 days later when the schedule fires, they don't remember it. The interval-end prompt asks for a password they don't have.

**Why it happens:** Encrypted backups have no recovery mechanism by design (backup.js:103 "If you forget your passphrase, this backup cannot be recovered. There is no reset option.").

**How to avoid:**
- **D-12 Test backup password is the mitigation here** — surface it prominently inside the Backup & Restore modal.
- The schedule setup UI MUST include a one-line warning: "Save this password somewhere safe. We cannot recover it."
- The interval-end prompt should include a "Test password first" link that opens D-12 BEFORE the user commits to the encrypted save.

**Warning signs:** Therapist support requests for "I forgot my backup password" — the only honest answer is "your old backups are not recoverable; create a new password and start fresh."

### Pitfall 3: Photo resize blowing up memory on multi-MB iPhone uploads

**What goes wrong:** `createImageBitmap` on a 12MP iPhone JPEG (~4-6 MB compressed, ~36 MB decoded RGBA) on a low-end device can OOM the renderer.

**Why it happens:** Decoded bitmap = width × height × 4 bytes. A 4032×3024 photo decodes to 49 MB.

**How to avoid:**
- **Use `createImageBitmap(blob, { resizeWidth, resizeHeight })`** instead of decoding full-size and then drawing scaled. The `resizeWidth` / `resizeHeight` options ask the browser to downscale during decode — much lower peak memory.
  - Compute target width/height before the call:
    ```javascript
    // Read the image dimensions cheaply via a temporary <img>, OR
    // do a first-pass createImageBitmap with no resize options to get .width/.height,
    // then immediately .close() and re-decode with resize options.
    ```
- **Always `.close()` the bitmap** after `drawImage` to free the decoder.
- D-23 says "no hard upload-size cap on original input" but adds "If we hit memory issues in testing, planner can add a safety cap." — Plan a 20MB safety cap with a soft warning toast as a fallback if testing reveals OOM on Sapir's test devices.

**Warning signs:** Page goes blank after photo upload on iPhone Safari; console shows `RangeError: Out of memory`.

### Pitfall 4: Backup contents checklist drifts out of sync with `exportBackup`

**What goes wrong:** Phase 26 (or later) adds a new IDB store. Developer remembers to add it to `exportBackup` and `normalizeManifest`, but forgets the static checklist in the modal. User sees "Photos" in the checklist but a new "Treatments" store is silently absent — and they don't notice until restore time.

**Why it happens:** D-9 ("must update whenever a new IDB store is added") is an enforceable convention but humans drift.

**How to avoid (the D-29 acceptance criterion makes this testable):**
- Write a Validation Architecture test that:
  1. Reads `assets/db.js` MIGRATIONS object via vm sandbox to enumerate all object stores
  2. Reads the manifest `version: 3` schema produced by `exportBackup` to enumerate all top-level array fields
  3. Reads the static checklist markup (or a single source-of-truth array used by the modal)
  4. Asserts all three sets are equal
- This test FAILS the build when a new store is added without updating the checklist. That's the regression-guard D-29 calls for.

**Warning signs:** A new IDB store added in PR review without a corresponding edit to the checklist and the export function.

### Pitfall 5: Schedule check fires multiple times per session

**What goes wrong:** User has the app open all day. Tab visibility flips many times (alt-tab, browser focus, etc.). The interval-end prompt re-opens repeatedly, training the user to dismiss it.

**Why it happens:** `visibilitychange` fires on every focus change.

**How to avoid:** Per-session debounce with `portfolioBackupSchedulePromptedAt` (already shown in Pattern 4). 1-hour debounce is a reasonable default; user can dismiss the prompt with "Postpone" actions matching the existing 7-day banner pattern (`portfolioBackupSnoozedUntil`).

**Warning signs:** Users complain "the backup popup never goes away."

## Code Examples

Verified patterns from official sources and the existing codebase:

### Web Share API probe + invoke (mirror add-session.js)

```javascript
// Source: assets/add-session.js:1371-1387 (exportProbeShareSupport pattern)
function isShareSupported(forFile) {
  if (typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [forFile] });
  } catch (_) {
    return false;
  }
}
```

### Existing passphrase modal call (encrypt mode)

```javascript
// Source: assets/backup.js:643-671
async function exportEncryptedBackup() {
  return new Promise(function(resolve, reject) {
    _showPassphraseModal({
      mode: 'encrypt',
      onConfirm: async function(passphrase) {
        try {
          var result = await exportBackup();
          var encBlob = await _encryptBlob(result.blob, passphrase);
          // ... triggers download ...
          resolve(true);
        } catch (err) { reject(err); }
      },
      onSkip: function() { resolve(false); },     // → caller does unencrypted path
      onCancel: function() { resolve('cancel'); } // → caller MUST abort
    });
  });
}
```

### Confirm-dialog destructive call

```javascript
// Source: pattern from assets/overview.js:108-113
const confirmed = await App.confirmDialog({
  messageKey: "photos.optimize.confirmMessage",
  confirmKey: "photos.optimize.confirmYes",
  cancelKey: "common.cancel",
  tone: "neutral"          // 'danger' (default red) or 'neutral' (button-primary)
});
if (!confirmed) return;
```

### Storage estimate

```javascript
// Source: MDN StorageManager.estimate
async function getStorageUsage() {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { usage: null, quota: null };
  }
  const { usage, quota, usageDetails } = await navigator.storage.estimate();
  // usageDetails: Chrome/Edge only — has { indexedDB, caches, serviceWorkerRegistrations, ... }
  // For Photos Settings storage display, top-level `usage` is sufficient.
  return { usage, quota, usageDetails: usageDetails || null };
}

function humanBytes(n) {
  if (n == null) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}
```

### Per-photo IDB walk (fallback when Photos breakdown is needed)

```javascript
// For "Photos use 47 MB" specifically — walk clients store and sum photoData lengths.
// data:image/jpeg;base64,XXX — base64 is ~1.37x raw bytes; subtract data-URL prefix.
async function estimatePhotosBytes() {
  const clients = await window.PortfolioDB.getAllClients();
  let total = 0;
  for (const c of clients) {
    const photo = c.photoData || c.photo;
    if (typeof photo === 'string' && photo.startsWith('data:')) {
      const commaIdx = photo.indexOf(',');
      const b64 = photo.slice(commaIdx + 1);
      total += Math.floor(b64.length * 0.75); // base64 → byte count
    }
  }
  return total;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `mailto:` with claim of attachment | Web Share API + honest mailto fallback | iOS Safari 15 (2021) | This phase. Removes the lying behavior. |
| EXIF orientation hand-parsed | `createImageBitmap(blob, { imageOrientation: 'from-image' })` | Spec stable since 2020; Safari iOS already honored EXIF for `<img>` historically | Hand-rolled EXIF parsers are obsolete for browser code. |
| Periodic Background Sync for cadence | Foreground `visibilitychange` polling | PBSync remains Chrome-only as of 2026; Safari/Firefox have not adopted | For a single-tab therapist PWA on Safari, foreground polling is the only option. |
| Storing original + crop metadata | Crop-only (single source) | This phase (D-22) | Storage win is large; Phase 25 makes this the canonical pattern going forward. |

**Deprecated/outdated (Phase 25 specifically removes):**
- `BackupManager.sendToMyself` (backup.js:882) — removed in this phase. Hooked the unencrypted export and lied about attachments.
- `overview.sendBackup` i18n key (line 170 in i18n-{en,he,de,cs}.js) — retired alongside the button.
- 5-button overview cluster (index.html:99-115) — collapses to "Add Client" + "Add Session" + "Backup & Restore" + chip.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Schedule password is NOT persisted; user re-enters at each fire. | Runtime State Inventory § Secrets | **Discuss with user.** Alternative: store derived hash (no recovery on forgotten); alternative: session-scoped storage. The "do not store" answer is most honest but adds friction. Confirm with Ben in plan-phase. |
| A2 | JSZip 3.10.1 is the latest stable release; no upgrade needed. | Standard Stack | Low. Even if a newer 3.x exists, current works fine. Verify with `npm view jszip version` if planner wants to be exhaustive. |
| A3 | iOS Safari 15+ honors `imageOrientation: 'from-image'` for `createImageBitmap`. | Pattern 2 | Medium. If a Safari version drops EXIF handling, iPhone photos appear sideways after resize. Mitigation: visual smoke test on Sapir's iPhone before release. |
| A4 | The 60-min debounce on schedule prompts is acceptable. | Pattern 4 | Low. Tunable via constant. Adjust based on UAT feedback. |
| A5 | The Photos tab and Backups tab fit into the existing settings.html tab navigation pattern. | Architecture Diagram | Low. Settings already has 2 tabs (settings.html:55-58). Adding 2 more is the same markup pattern. |
| A6 | `clients.photoData` field already accepts the resized blob as a data URL. | Photo storage row | Low. Field is untyped string; current crop output (q=0.85 data URL) and proposed (q=0.75 data URL) are both `data:image/jpeg;base64,...`. |
| A7 | The existing 7-day banner snooze (`portfolioBackupSnoozedUntil`) does not need to be cleared when the schedule is enabled. | Pattern 4 / banner suppression | Low. The guard at the top of `checkBackupReminder` skips the banner entirely when schedule is on; the snooze key becomes inert. If user later turns schedule off, an old snooze might re-suppress the banner — but that's user-acceptable (they can dismiss again). |
| A8 | `.sgbackup` extension may be Safari-share-restricted. | Pitfall 1 | Medium. Probe approach mitigates; if probe rejects, Share button stays hidden. Verify on Sapir's Safari macOS during UAT. |

**If this table is empty:** All claims in this research were verified or cited. **It is not empty — A1 in particular needs Ben's confirmation in discuss-phase or plan-phase.**

## Open Questions

1. **Schedule password storage policy**
   - **What we know:** D-18 mandates password setup before schedule can be enabled. D-17 says interval-end prompt invokes the existing encryption flow.
   - **What's unclear:** Is the password stored anywhere, or does the user re-enter at each fire? CONTEXT does not specify.
   - **Recommendation:** Default to "do not persist" (matches the no-recovery encryption philosophy). Discuss with Ben in plan-phase.

2. **Backups & Photos as new Settings TABS vs new Settings SECTIONS**
   - **What we know:** Settings already has 2 tabs (settings.html:55). The pattern works.
   - **What's unclear:** D-25 says "new dedicated Photos section" — language suggests SECTION (a panel within an existing tab) but the Settings page is currently structured around tabs.
   - **Recommendation:** Two new tabs ("Backups" and "Photos") matches the existing pattern most cleanly. Planner discretion per CONTEXT.

3. **Where does Test-backup-password live: modal or Settings?**
   - **What we know:** D-12 explicitly leaves this to planner.
   - **Recommendation:** Inside the Backup & Restore modal (under the Import section). Reasoning: it's a backup-file action; co-locating with Import makes it discoverable when users are about to attempt a restore. Settings is a workflow-busting hop.

4. **Does the chip (D-13) live in the header or the page body?**
   - **What we know:** D-13 says "always present" + color-thresholded; D-8 says the modal entry button replaces the cluster.
   - **Recommendation:** Chip lives next to (or inside) the "Backup & Restore" button on the overview card. Tap-target serves both: chip shows status, button opens modal. Single visual unit.

5. **Folder picker UX inside Settings — invocation timing**
   - **What we know:** D-11 moves picker to Settings. D-20 defers silent-write. Picker handle is session-scoped (resets on reload).
   - **What's unclear:** What does the Settings UI show when no handle is picked? When a handle IS picked but on a different session? The picker inherently re-prompts.
   - **Recommendation:** Settings UI shows a "Pick backup folder" button. On click, calls `pickBackupFolder()`. If picked, label changes to "Folder: [name] (re-pick)". Folder is used by D-17 prompt's "save here" affordance (when implemented in a future phase). For Phase 25, the folder is purely a UX preference — it doesn't trigger silent writes.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Existing test suite (vm sandbox `.test.js` files) | ✓ | (system Node — no version pinned) | — |
| Modern browser (Chrome/Edge/Safari/Firefox) | App runtime | ✓ | Per browser support docs in Standard Stack | — |
| Web Crypto API (subtle) | Backup encryption | ✓ when HTTPS or localhost | — | App already shows error: "Encrypted backup requires HTTPS or localhost" (backup.js:36, overview.js:90) |
| Web Share API (`navigator.share` + `canShare`) | D-02 share path | ✓ on iOS Safari 15+, macOS Safari 13+, Chrome Android 75+, Chrome Desktop 89+ | — | mailto fallback with honest body (D-02) |
| File System Access API (`showDirectoryPicker`) | D-11 folder picker | ✓ on Chromium-based browsers; ✗ on Safari/Firefox [CITED: MDN] | — | UI hides folder section entirely via `isAutoBackupSupported()` (existing pattern in overview.js:142) |
| `createImageBitmap` with `imageOrientation` option | D-21 photo resize | ✓ on Chrome 50+, Edge, Firefox 79+, Safari 15+ [CITED: MDN] | — | Fall back to `<img>` decode + canvas (loses EXIF rotation on older Safari — Sapir's iPhone is recent enough) |
| `navigator.storage.estimate()` | D-25 storage display | ✓ on Chrome 61+, Firefox, Safari 15.2+ [CITED: MDN] | — | Display "—" or "Not available" |
| `navigator.storage.estimate().usageDetails` | Per-store breakdown (only if needed) | ✗ Safari does not implement | — | Walk IDB and sum byte sizes (Pattern: estimatePhotosBytes) |
| Periodic Background Sync (`registration.periodicSync`) | NOT used | ✗ Chrome only; not Safari | — | Foreground `visibilitychange` polling (Pattern 4) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** All four browser-API gaps above are covered by graceful-degradation paths described in the Standard Stack and Patterns sections.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Plain Node + `assert` + `vm` sandbox (no Jest, no Vitest, no Playwright) [VERIFIED: tests/24-04-app-cache.test.js:1-40, tests/24-05-import-validator.test.js] |
| Config file | None (no package.json) [VERIFIED: project root grep] |
| Quick run command | `node tests/<file>.test.js` (each file is independently executable; exit 0 = pass) |
| Full suite command | `for f in tests/*.test.js; do node "$f" || echo "FAIL: $f"; done` |
| Convention | Filename `{phase}-{plan}-{topic}.test.js` (e.g., `25-01-share-fallback.test.js`) |

### Phase Requirements → Test Map
| Decision | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|-----------|-------------------|-------------|
| D-01 | `BackupManager.sendToMyself` is removed (no longer in module export) | unit | `node tests/25-XX-sendToMyself-removed.test.js` | Wave 0 |
| D-02 | `shareBackup(blob, filename)` invokes `navigator.share({files})` when `canShare` returns true | unit (with mock navigator) | `node tests/25-XX-share-invoke.test.js` | Wave 0 |
| D-02 | `shareBackup` falls back to triggerDownload + mailto when `canShare` returns false | unit (with mock navigator) | `node tests/25-XX-share-fallback.test.js` | Wave 0 |
| D-04 | Share path uses the SAME blob produced by user's encryption choice (not a separate exportBackup call) | unit (verify call graph) | `node tests/25-XX-share-encryption-inherit.test.js` | Wave 0 |
| D-09 / D-29 | Backup contents checklist matches `exportBackup` output stores | unit (introspect manifest + checklist) | `node tests/25-XX-checklist-store-parity.test.js` | Wave 0 |
| D-12 | `testBackupPassword(file, passphrase)` decrypts but does NOT call `db.clearAll`, `db.addClient`, etc. | unit (mock PortfolioDB, assert never called) | `node tests/25-XX-testpassword-no-mutation.test.js` | Wave 0 |
| D-12 | `testBackupPassword` rejects with i18n key on wrong passphrase (OperationError → wrongPassphrase) | unit | `node tests/25-XX-testpassword-wrong.test.js` | Wave 0 |
| D-15 / D-19 | `checkBackupReminder` early-returns when `getScheduleIntervalMs() !== null` | unit (mock localStorage) | `node tests/25-XX-banner-suppression.test.js` | Wave 0 |
| D-17 | `checkBackupSchedule()` fires prompt when `Date.now() - lastExport > intervalMs` AND not debounced | unit | `node tests/25-XX-schedule-fires.test.js` | Wave 0 |
| D-17 | `checkBackupSchedule()` debounces — second call within 1 hour does NOT re-fire | unit | `node tests/25-XX-schedule-debounce.test.js` | Wave 0 |
| D-18 | Schedule cannot be enabled without a password setup | unit (verify validation throws / disable button) | `node tests/25-XX-schedule-password-mandatory.test.js` | Wave 0 |
| D-21 | `resizeToMaxDimension(blob, 800, 0.75)` produces JPEG with longest edge ≤ 800px | unit (decode output, check dimensions) — needs node-canvas or jsdom-canvas; **manual-only fallback if canvas not available in node** | manual smoke OR `node tests/25-XX-resize.test.js` (if canvas polyfill works) | Wave 0 |
| D-22 | After photo upload, `clients.photoData` contains only the cropped+resized output (no original blob persisted) | unit (mock IDB write inspection) | `node tests/25-XX-crop-only.test.js` | Wave 0 |
| D-29 | **Backup round-trip completeness** — export → import → diff every store losslessly | integration (use jsdom + fake-indexeddb OR puppeteer smoke) | manual smoke OR scripted | Wave 0 (decision needed: manual or automated) |
| D-30 | Schedule fire and Settings backup-password validator share a single function | unit (assert imports same module export) | `node tests/25-XX-single-source.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** Run all `tests/25-*.test.js` matching the touched file's plan number — e.g., touching `assets/backup.js` runs all 25-01 tests (~5s).
- **Per wave merge:** Run full `tests/25-*.test.js` set (every Phase 25 test).
- **Phase gate:** Full suite green, including pre-existing `tests/24-*.test.js` and `tests/pdf-*.test.js`. Then `/gsd-verify-work` on the full Phase 25 acceptance scenarios (manual UAT pass on Sapir's Safari macOS + iPhone Safari).

### Wave 0 Gaps
- [ ] All test files prefixed `tests/25-*.test.js` — none exist yet, all need creating.
- [ ] **Web Share API mock helper** — shared `tests/_helpers/mock-navigator-share.js` providing a configurable `canShare` / `share` shim.
- [ ] **PortfolioDB mock** — shared `tests/_helpers/mock-portfolio-db.js` with spy-instrumented `clearAll`, `addClient`, `addSession`, `setTherapistSetting`, `updateSnippet`. Used by D-12 (assert NOT called) and D-29 (assert called with manifest contents).
- [ ] **Round-trip test infrastructure decision (D-29)** — either:
  - (a) Pull in `fake-indexeddb` + jsdom for headless round-trip; or
  - (b) Document a manual UAT script ("Export, save file, clear browser data, Import, diff client list against pre-export snapshot") with checklist; planner picks the path.
- [ ] **Resize test infrastructure (D-21)** — node `<canvas>` is non-trivial. Likely: defer to manual smoke test on real browser; tag the unit test as "manual-only" in plan.
- [ ] **Browser smoke checklist** for the parts not unit-testable: Share button on Safari macOS, Share button on iPhone Safari, photo orientation after iPhone HEIC upload, schedule fire after 24h on real device, `.sgbackup` Safari share probe behavior.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | App is single-user, no accounts. License gate is upstream (handled). |
| V3 Session Management | no | Browser session only; no server. |
| V4 Access Control | no | All data is per-browser-origin; no multi-tenant model. |
| V5 Input Validation | yes | Backup file import — defensive validation (already in `normalizeManifest` + ALLOWED_KEYS whitelist for therapistSettings, validateSnippetShape for snippets). NEW concern: D-12 password-test must validate the file is `.sgbackup` before passphrase prompt. |
| V6 Cryptography | yes | AES-256-GCM via PBKDF2 SHA-256 with 310k iterations [VERIFIED: backup.js:26]. Compliant with OWASP 2023 PBKDF2 minimums (600k recommended for SHA-256, but 310k is OWASP-2021 acceptable; consider bumping to 600k as a follow-up). DO NOT hand-roll. Reuse `_encryptBlob`/`_decryptBlob`. |

### Known Threat Patterns for vanilla-JS PWA + IDB + browser-side crypto

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Crafted backup with malicious `sectionKey` to overwrite arbitrary settings | Tampering | Already mitigated: `ALLOWED_KEYS` whitelist (backup.js:801) and `validateSnippetShape` (backup.js:844). NEW stores must follow this pattern. |
| Crafted backup with prototype-pollution payload in JSON | Tampering | Mitigated by `JSON.parse` not invoking prototypes. Phase 25 should NOT introduce `Object.assign({}, untrusted)` patterns; use property whitelist. |
| Lying email body claiming attachment that does not exist | Repudiation / user-trust | This phase fixes (D-02) — no more "Please find attached" without an actual attachment. |
| Sending unencrypted backup to email when user thought encryption was on | Information Disclosure | This phase fixes (D-04 inheritance rule). Security regression in current `sendToMyself`. |
| Persisting backup passphrase in localStorage | Information Disclosure | Avoid (Open Question 1, A1). Recommendation: do not store. |
| Photo files exposing EXIF GPS data in backups | Information Disclosure | LOW priority — therapist photos are professional-context, GPS unlikely. The resize-on-upload (D-21) re-encodes the JPEG and STRIPS EXIF (canvas-derived JPEGs do not carry EXIF). **This is a side-benefit of D-21 worth calling out to Ben.** |
| File System Access folder write to a sensitive path | Tampering | User explicitly picks the folder via `showDirectoryPicker` — OS sandboxes the choice. D-20 defers silent-write so attack surface is minimal in Phase 25. |

**Side-benefit of D-21 worth highlighting in plan:** Resizing photos on upload via canvas re-encode strips EXIF (including any GPS data). This is a small but real privacy improvement for the therapist's clients.

## Sources

### Primary (HIGH confidence)
- Codebase grep + read: `assets/backup.js` (1010 LOC), `assets/db.js`, `assets/overview.js`, `assets/add-client.js`, `assets/add-session.js`, `assets/crop.js`, `assets/app.js`, `assets/i18n-{en,he}.js`, `index.html`, `settings.html`, `tests/24-*.test.js` — all paths verified.
- `.planning/phases/25-backup-architectural-rework/25-CONTEXT.md` — 30 user-locked decisions
- `.planning/phases/24-pre-launch-final-cleanup/24-CONTEXT.md` — D-05 Hebrew noun convention, D-01 single-source-of-truth pattern
- `.planning/PROJECT.md` — "data never leaves the device" core value
- `.planning/ROADMAP.md` — Phase 25 / Phase 26 boundary
- MDN: [Navigator.canShare()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare), [StorageManager.estimate()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate), [createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/createImageBitmap), [Web_Share_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
- W3C: [Web Share API spec](https://w3c.github.io/web-share/)

### Secondary (MEDIUM confidence)
- web.dev: [Periodic Background Sync](https://developer.chrome.com/docs/capabilities/periodic-background-sync), [Storage for the web](https://web.dev/articles/storage-for-the-web), [Web Share](https://web.dev/web-share/)
- Chrome for Developers: [Persistent permissions for File System Access API](https://developer.chrome.com/blog/persistent-permissions-for-the-file-system-access-api), [Estimating Available Storage Space](https://developer.chrome.com/blog/estimating-available-storage-space/)
- caniuse.com: [navigator.share support tables](https://caniuse.com/?search=navigator.share), [Background Sync API](https://caniuse.com/background-sync)
- MagicBell: [PWA iOS Limitations and Safari Support 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)

### Tertiary (LOW confidence — verify if used as load-bearing)
- LogRocket: [An advanced guide to the Web Share API](https://blog.logrocket.com/advanced-guide-web-share-api-navigator-share/)
- Bits and Pieces: [Sharing Files from iOS 15 Safari](https://blog.bitsrc.io/sharing-files-from-ios-15-safari-to-apps-using-web-share-c0e98f6a4971)

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every entry verified by codebase grep against existing `assets/*.js` files.
- Architecture patterns: **HIGH** — they mirror existing code (passphrase modal, share API in add-session, confirm dialog, toast). Only the Backup & Restore modal layout is new and is constrained by D-7 to a known shape.
- Pitfalls: **MEDIUM-HIGH** — Pitfall 1 (Safari .sgbackup share) and Pitfall 3 (iPhone OOM) need real-device verification; the rest are codebase-visible.
- Validation Architecture: **MEDIUM** — test framework is verified (vanilla node + assert + vm) but the round-trip test (D-29) and resize test (D-21) infrastructure decisions require planner judgment in Wave 0.
- Open Questions: **HIGH** — Q1 (schedule password storage) needs Ben confirmation; the rest are documented planner-discretion items from CONTEXT.

**Research date:** 2026-05-15
**Valid until:** 2026-06-14 (30 days; codebase is stable, browser APIs are stable)

---

*Phase: 25-backup-architectural-rework*
*Research file: 25-RESEARCH.md*
