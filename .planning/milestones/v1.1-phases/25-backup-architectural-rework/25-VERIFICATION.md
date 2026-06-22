---
phase: 25-backup-architectural-rework
verified: 2026-05-16T08:00:00Z
status: human_needed
score: 21/21
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 18/21
  gaps_closed:
    - "BackupManager.checkBackupSchedule gates debounce stamp on modal-open (CR-01)"
    - "snippetsDeletedSeeds sentinel round-trips through export→import (CR-02)"
    - "Hebrew strings on Phase 25 surfaces use noun/infinitive forms only (CR-03)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Web Share API — file attachment on supported platforms. Open Backup & Restore modal on iPhone Safari (iOS 15+) or Chrome macOS (89+). Click Share backup after creating an encrypted export."
    expected: "Native share sheet appears with the .sgbackup file attached and visible as a selectable destination."
    why_human: "navigator.canShare and navigator.share require a real browser gesture in a secure context; vm-sandbox tests use mocks only."
  - test: "Web Share API — mailto fallback on Firefox. Open the modal on Firefox desktop. Click Share backup."
    expected: "File downloads to Downloads folder, then the default mail client opens with subject 'Sessions Garden backup - YYYY-MM-DD' and body stating the exact filename to attach manually (no false 'attachment')."
    why_human: "Firefox does not support navigator.share with files; the fallback path needs real verification."
  - test: "Test-backup-password with a real .sgbackup file. Export an encrypted backup, close and reopen the modal. In Test backup password, upload the .sgbackup file, enter correct password, click Test password."
    expected: "Green success card reading 'Decrypted successfully. Backup from [date] — N clients, M sessions.' Client count in the app is unchanged."
    why_human: "Requires a real .sgbackup file with AES-GCM encryption; crypto.subtle is mocked in tests."
  - test: "Photos Settings — optimize-all savings preview. Add clients with photos, navigate to Settings → Photos, observe the savings preview before clicking Optimize."
    expected: "Reasonable savings estimate displayed. Confirm dialog shows same estimate. After optimization photos are visually identical but file size reduced."
    why_human: "Requires real photos and visual quality assessment; storage estimate APIs need a real IDB instance."
---

# Phase 25: Backup Architectural Rework — Re-Verification Report

**Phase Goal:** Fix the broken "Send to myself" backup, consolidate the 3-button overview cluster into a single Backup & Restore surface, fold scheduled-backup into this rework, add backup-health awareness signals, and reduce backup payload by reworking photo handling. The 30 user-locked decisions D-01..D-30 in 25-CONTEXT.md are the authoritative requirement set.

**Verified:** 2026-05-16T08:00:00Z
**Status:** human_needed — all automated checks pass; 4 browser-only behaviors await human confirmation
**Re-verification:** Yes — re-verification after gap closure (8 base plans 25-01..25-08 + 5 gap-closure plans 25-09..25-13 + 6 post-UAT fix rounds + WR-01 code-review fix)

---

## Re-verification Context

The prior verification (2026-05-15T12:00:00Z) found 3 blockers: CR-01 (schedule debounce consumed before modal reachability), CR-02 (snippetsDeletedSeeds sentinel dropped on restore), and CR-03 (Hebrew masculine-singular imperatives). Ben also submitted 19 UAT findings from a live browser test. All 3 blockers and all 19 UAT items were addressed in gap-closure plans 25-09 through 25-13 and post-UAT fix rounds. WR-01 (un-ack cascade desync) was also fixed per commit 6719968. WR-02, WR-03, and IN-01..04 were explicitly deferred by Ben (per 25-REVIEW.md post-review resolution) as post-25 cleanup items.

**Test suite:** 328 assertions across 42 test files — 328 passed, 0 failed.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | sendToMyself removed from BackupManager public API | VERIFIED | `grep -c "sendToMyself" assets/backup.js` returns 0; test 25-01-sendToMyself-removed (4/4) passes; 25-08-single-source-audit confirms purge from backup.js, overview.js, and backup-modal.js |
| 2 | shareBackup(blob, filename) exposed; inherits encryption from caller; uses Web Share API or falls back to honest mailto | VERIFIED | backup.js lines 721-795; tests 25-01-share-fallback (7/7) and 25-01-share-encryption-inherit (5/5) pass |
| 3 | isShareSupported probes with actual File (Pitfall 1 mitigation) | VERIFIED | backup.js `function isShareSupported(file)` — accepts File parameter, probes navigator.canShare({files:[file]}) |
| 4 | 4-locale i18n parity for all Phase 25 keys; overview.sendBackup removed from all locales | VERIFIED | 25-11-i18n-parity (23/23): every key in en exists in he/de/cs; 490 keys in all 4 locales; share/testPassword/photos.usage.body keys confirmed present; schedule.folder.* keys confirmed absent |
| 5 | Single Backup & Restore modal replaces 3-button cluster; old exportBtn / sendBackupBtn / autoBackupBtn removed from index.html | VERIFIED | test 25-02-modal-structure (8/8); old IDs absent from index.html; #backupModal present with all required sections |
| 6 | Header cloud icon (#backupCloudBtn) mounted by App.mountBackupCloudButton in #headerActions on all pages | VERIFIED | app.js lines 425-501; initCommon calls mountBackupCloudButton; backup-modal.js loaded on index.html, settings.html, add-client.html, add-session.html |
| 7 | Cloud icon state class updates to backup-cloud-btn--{never/fresh/warning/danger} on relevant events | VERIFIED | app.js updateBackupCloudState (line 519); test 25-04-cloud-state (18/18) |
| 8 | D-14 color thresholds: schedule-OFF uses 7d/14d breakpoints; schedule-ON uses interval/interval×2 breakpoints | VERIFIED | backup.js getChipState lines 1246-1256; test 25-04-cloud-state validates all OFF/ON × never/fresh/warning/danger combinations |
| 9 | D-15/D-19: 7-day reminder banner suppressed when schedule is ON; fires normally when OFF | VERIFIED | app.js checkBackupReminder early-returns when getScheduleIntervalMs() !== null; test 25-04-banner-suppression (4/4) |
| 10 | BackupManager.testBackupPassword(file, passphrase) dry-run: decrypts to memory, never writes to IDB or localStorage | VERIFIED | backup.js lines 819-874; tests 25-03-testpassword-no-mutation (3/3), 25-03-testpassword-wrong (2/2), 25-03-testpassword-invalid (5/5) |
| 11 | Test-password sub-card wired inside #backupModalTestPasswordSection with all 4 IDs present | VERIFIED | index.html contains #backupTestPasswordFile, #backupTestPasswordInput, #backupTestPasswordRun, #backupTestPasswordResult; backup-modal.js calls BackupManager.testBackupPassword |
| 12 | Settings Backups tab: frequency selector, password-mandatory gate, custom-days picker hidden unless frequency=custom, schedule-saved toast, ON→OFF confirm | VERIFIED | settings.html lines 148-188; tests 25-05-schedule-password-mandatory (7/7), 25-12-custom-days-visibility (7/7), 25-12-schedule-saved-toast (4/4) |
| 13 | BackupManager.checkBackupSchedule() fires interval-end prompt reliably: debounce stamp gated on SUCCESSFUL modal open; non-overview pages redirect to index.html?openBackup=1 instead of silently consuming debounce (CR-01 fix) | VERIFIED | backup.js lines 1382-1407: `opened` flag; debounce write inside `if (opened)` block; redirect path for non-overview pages; tests 25-09-schedule-debounce-no-modal (4/4) — Cases A/B confirm stamp NOT advanced when modal unavailable; Case C/D confirm stamp advanced when modal opens; 25-09-modal-global-inplace (4/4) — backup-modal.js injects modal and exposes window.openBackupModal on non-overview pages so the redirect is no longer needed |
| 14 | D-18 password-mandatory: canEnableSchedule gates non-Off schedule without acknowledged password | VERIFIED | backup.js canEnableSchedule (line 1419); settings.js enforces it; test 25-05-schedule-password-mandatory (7/7) |
| 15 | CropModule.resizeToMaxDimension(blob, 800, 0.75) with EXIF-aware createImageBitmap and crop-only storage | VERIFIED | crop.js lines 193-248; createImageBitmap with imageOrientation:'from-image'; test 25-06-resize-pure (4/4) |
| 16 | add-client.js calls resizeToMaxDimension BEFORE openCropModal; only cropped JPEG hits IDB | VERIFIED | add-client.js line 79; test 25-06-crop-only (3/3) |
| 17 | Photos Settings tab: 3-tier optimize verdict (compact/optional/recommended), savings estimate with {n} and {size} substituted before confirm, delete-all confirm split into two unambiguous sentences | VERIFIED | tests 25-12-optimize-verdict (22/22), 25-12-optimize-placeholders (4/4), 25-12-deleteall-confirm-split (9/9) |
| 18 | D-29 round-trip: clients, sessions, snippets, therapistSettings section rows, snippetsDeletedSeeds sentinel, photos all survive export+import losslessly (CR-02 fix) | VERIFIED | ALLOWED_SENTINEL_KEYS = new Set(["snippetsDeletedSeeds"]) at backup.js:1032; _writeTherapistSentinel in db.js:739; sentinel write precedes snippet-restore loop; test 25-10-sentinel-roundtrip (6/6); test 25-08-roundtrip-stores (16/16 — now includes sentinel row) |
| 19 | D-04 / encrypt-then-share: exportEncryptedBackup returns blob+filename so shareBackup receives the SAME encrypted blob | VERIFIED | backup.js line 696 returns {ok, skip, cancelled, blob, filename}; test 25-08-encrypt-then-share (10/10) |
| 20 | D-30 single-source audit: getScheduleIntervalMs and resizeToMaxDimension each have multiple consumers; no rogue canvas calls outside CropModule | VERIFIED | test 25-08-single-source-audit (19/19) — includes backup-modal.js shareBackup consumer and rogue-canvas checks |
| 21 | D-27 Hebrew strings: all Phase 25 surfaces use noun/infinitive forms — no masculine-singular imperatives (CR-03 fix) | VERIFIED | i18n-he.js line 279: security.persistent.body uses 'מומלץ להשתמש' + 'לנעול' (infinitive); line 293: backup.passphrase.tooSimple uses 'מומלץ להשתמש'; test 25-11-hardcoded-english-removed confirms old imperative forms absent and infinitive replacements present |

**Score:** 21/21 truths verified

---

### D-01..D-30 Requirements Coverage

| Decision | Description | Status | Evidence |
|----------|-------------|--------|----------|
| D-01 | sendToMyself removed | SATISFIED | 0 occurrences in backup.js; purge confirmed in single-source-audit test |
| D-02 | shareBackup with Web Share API + honest mailto fallback | SATISFIED | Tests 25-01-share-fallback (7/7), 25-01-share-encryption-inherit (5/5) |
| D-03 | "Share backup" in all 4 locales | SATISFIED | backup.action.share key present in all 4 locales |
| D-04 | Encryption inherited through share path | SATISFIED | Test 25-08-encrypt-then-share (10/10) — blob identity check |
| D-05 | Single Backup & Restore surface | SATISFIED | #backupModal single modal replacing 3-button cluster |
| D-06 | Modal implementation (not separate page) | SATISFIED | backup-modal.js IIFE-based modal; no new HTML pages |
| D-07 | Export prominent + Import secondary | SATISFIED | index.html modal structure: Export section above Import section |
| D-08 | Header cloud icon entry point on all pages (updated: modal opens in-place everywhere) | SATISFIED | backup-modal.js loaded on all 4 pages; window.openBackupModal available everywhere; old 3-button cluster removed |
| D-09 | Backup contents visibility (5 checkmark items) | SATISFIED | test 25-02-checklist-store-parity (9/9): clients/sessions/snippets/therapistSettings/photos |
| D-10 | Last-backup-at indicator inside modal header | SATISFIED | #backupModalLastBackup in index.html and MODAL_HTML in backup-modal.js |
| D-11 | Folder picker REMOVED (UAT-D1 override of original "moved to Settings") | SATISFIED | test 25-12-folder-picker-removed (15/15): all folder picker IDs absent from settings.html and settings.js; schedule.folder.* i18n keys absent from all 4 locales |
| D-12 | Test-backup-password dry-run | SATISFIED | testBackupPassword function; no IDB writes proven by test 25-03-testpassword-no-mutation (3/3) |
| D-13 | Cloud icon color IS the status surface (no separate chip) | SATISFIED | No chip element in DOM; color via CSS class on icon |
| D-14 | Color thresholds (schedule-OFF 7d/14d; schedule-ON interval/2×interval) | SATISFIED | getChipState; test 25-04-cloud-state (18/18) |
| D-15/D-19 | Banner suppressed when schedule ON | SATISFIED | app.js checkBackupReminder; test 25-04-banner-suppression (4/4) |
| D-16 | Frequency selector (Off/Daily/Weekly/Monthly/Custom days) | SATISFIED | settings.html #scheduleFrequency; custom-days wrapper gated on frequency=custom |
| D-17 | Interval-end prompt fires when elapsed > interval AND debounce not consumed | SATISFIED | test 25-05-schedule-fires (2/2); CR-01 fix confirmed by test 25-09 (4/4) |
| D-18 | Password mandatory for schedule enable | SATISFIED | canEnableSchedule; test 25-05-schedule-password-mandatory (7/7); WR-01 un-ack desync fixed |
| D-19 | Suppress 7-day banner when schedule ON (same as D-15) | SATISFIED | See D-15 |
| D-20 | No silent folder-write (download only) | SATISFIED | Folder picker removed; only browser download path exists |
| D-21 | resizeToMaxDimension max 800px EXIF-aware (createImageBitmap with imageOrientation) | SATISFIED | crop.js; test 25-06-resize-pure (4/4) |
| D-22 | Crop-only storage (original never persisted to IDB) | SATISFIED | test 25-06-crop-only (3/3) |
| D-23 | No hard upload-size cap | SATISFIED | add-client.js; soft 25MB warning only |
| D-24 | Optional one-time optimize existing photos | SATISFIED | settings.js optimize-all loop with 3-tier verdict |
| D-25 | Photos Settings tab: usage display, optimize-all, delete-all | SATISFIED | settings.html Photos tab; all three sections; verdict-based usage display |
| D-26 | Clear headers + instructions on every new surface | SATISFIED | All modal sections and settings tabs have h2/h3/h4 headings and helper text |
| D-27 | Hebrew noun/infinitive forms (no masculine-singular imperatives) | SATISFIED | CR-03 fixed: מומלץ להשתמש / לנעול in both flagged strings; test 25-11-hardcoded-english-removed (14/14) |
| D-28 | 4-locale parity (EN/HE/DE/CS) | SATISFIED | 490 keys in all 4 locales; test 25-11-i18n-parity (23/23) |
| D-29 | Backup round-trip completeness (all stores lossless including sentinel) | SATISFIED | CR-02 fixed: ALLOWED_SENTINEL_KEYS + _writeTherapistSentinel; test 25-10-sentinel-roundtrip (6/6); test 25-08-roundtrip-stores (16/16) |
| D-30 | Single-source-of-truth pattern | SATISFIED | test 25-08-single-source-audit (19/19) |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/backup.js` | shareBackup, isShareSupported, testBackupPassword, getChipState, getScheduleIntervalMs, checkBackupSchedule (CR-01 fix), computeBackupRecencyState, canEnableSchedule, ALLOWED_SENTINEL_KEYS (CR-02 fix) | VERIFIED | All functions present; CR-01 gating verified; CR-02 sentinel branch present at line 1041 |
| `assets/backup-modal.js` | Global modal file: markup injection, all modal handlers, window.openBackupModal on every page | VERIFIED | Loaded on index.html:340, settings.html:320, add-client.html:197, add-session.html:598; IIFE guards against double-init |
| `assets/overview.js` | No longer defines openBackupModal; registers window.__afterBackupRestore hook | VERIFIED | test 25-09-modal-global-inplace confirms no location.href change when modal available |
| `assets/app.js` | mountBackupCloudButton, updateBackupCloudState; checkBackupReminder with schedule suppression; confirmDialog with placeholder substitution | VERIFIED | Lines 425-601; test 25-04-banner-suppression (4/4) |
| `assets/crop.js` | resizeToMaxDimension EXIF-aware (createImageBitmap imageOrientation:'from-image'); quality 0.75 | VERIFIED | Lines 193-248, 288 |
| `assets/add-client.js` | resizeToMaxDimension called before openCropModal | VERIFIED | Line 79 |
| `assets/settings.js` | Backups tab (no folder picker); Photos tab (3-tier verdict, {n}/{size} substituted, delete-all confirm split); canEnableSchedule enforcement; schedule-saved toast; WR-01 un-ack desync fixed | VERIFIED | Multiple tests confirm |
| `assets/db.js` | estimatePhotosBytes, updateClient, _writeTherapistSentinel (CR-02) | VERIFIED | _writeTherapistSentinel at line 739; exposed on public API at line 849 |
| `index.html` | #backupModal with all sections; old 3 buttons removed; #headerActions present; folder picker IDs absent | VERIFIED | test 25-02-modal-structure (8/8); test 25-12-folder-picker-removed (15/15) |
| `settings.html` | Backups tab (no folder picker); Photos tab; #scheduleCustomDaysWrapper hidden by default | VERIFIED | Lines 55-248; test 25-12-custom-days-visibility confirms initial hidden state |
| `assets/i18n-{en,he,de,cs}.js` | 4-locale parity (490 keys each); Phase 25 keys present; schedule.folder.* absent; photos.usage.{compact,optional,recommended} present; CR-03 Hebrew imperatives replaced | VERIFIED | test 25-11-i18n-parity (23/23) |
| `assets/app.css` | --fresh state uses ring (not fill); UAT-D5 footer link styled; UAT-D6 drop zone dashed; UAT-D7 modal button gap; UAT-E1 cloud-vs-gear differentiation; UAT-F1 photos buttons auto-width | VERIFIED | test 25-13-css-audit (14/14) |
| `tests/25-09-*.test.js` (2 files) | CR-01: debounce no-modal; modal global in-place | VERIFIED | 8/8 assertions pass |
| `tests/25-10-*.test.js` | CR-02: sentinel round-trip | VERIFIED | 6/6 assertions pass |
| `tests/25-11-*.test.js` (3 files) | WR-01/CR-03: hardcoded English removed; i18n parity; toast behavior | VERIFIED | 43/43 assertions pass |
| `tests/25-12-*.test.js` (10 files) | UAT items: folder removed; optimize placeholders; verdict 3-tier; deleteall confirm split; custom-days; schedule saved toast; password callout; reminders explainer; etc. | VERIFIED | 89/89 assertions pass |
| `tests/25-13-*.test.js` | CSS audit (all UAT visual fixes) | VERIFIED | 14/14 assertions pass |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| BackupManager.shareBackup | navigator.share / navigator.canShare | feature-detect with actual File | VERIFIED | backup.js: navigator.canShare({files:[file]}) probe present |
| shareBackup mailto fallback | BackupManager.triggerDownload | direct call before mailto href set | VERIFIED | test 25-01-share-fallback asserts triggerDownload AND mailto in correct order |
| #backupCloudBtn | App.updateBackupCloudState | post-export, post-import, visibilitychange, schedule-change | VERIFIED | overview.js registers window.__afterBackupRestore; app.js visibilitychange listener |
| App.updateBackupCloudState | BackupManager.computeBackupRecencyState (→ getChipState + getScheduleIntervalMs) | internal delegation | VERIFIED | backup.js computeBackupRecencyState delegates to getChipState |
| app.js checkBackupReminder | BackupManager.getScheduleIntervalMs | early-return if schedule ON | VERIFIED | app.js early-return path |
| BackupManager.checkBackupSchedule | window.openBackupModal | in-place modal open (CR-01 fix) | VERIFIED | `opened` flag; debounce stamp inside `if (opened)` block; backup-modal.js provides openBackupModal on all pages so redirect path is now only needed if backup-modal.js itself is unavailable (pathological) |
| importBackup | snippetsDeletedSeeds sentinel write | ALLOWED_SENTINEL_KEYS + _writeTherapistSentinel (CR-02 fix) | VERIFIED | backup.js:1032 ALLOWED_SENTINEL_KEYS; db.js:739 _writeTherapistSentinel; sentinel write before snippet-restore loop |
| add-client.js photoInput change | CropModule.resizeToMaxDimension(file, 800, 0.75) | before openCropModal | VERIFIED | add-client.js line 79 |
| Photos tab Optimize button | CropModule.resizeToMaxDimension via settings.js loop | loop over clients | VERIFIED | test 25-08-single-source-audit confirms |
| Photos tab Delete-all | PortfolioDB.updateClient({...c, photoData:''}) | loop over clients | VERIFIED | settings.js _deleteAllPhotosLoop |
| exportEncryptedBackup new return shape | backup-modal.js openExportFlow branch handling | object destructure {ok, skip, cancelled, blob, filename} | VERIFIED | test 25-08-encrypt-then-share (10/10) |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| #backupModalLastBackup | portfolioLastExport | localStorage.getItem('portfolioLastExport') | Yes — real timestamp | FLOWING |
| #backupCloudBtn state class | computeBackupRecencyState() | getChipState({now, lastExport, intervalMs}) | Yes — real localStorage reads | FLOWING |
| settings.html Photos usage line | estimatePhotosBytes + photos.usage.{compact/optional/recommended} verdict | PortfolioDB.getAllClients() IDB read + navigator.storage.estimate() | Yes — real IDB walk + browser API | FLOWING |
| settings.html schedule frequency selector | portfolioBackupScheduleMode | localStorage.getItem | Yes | FLOWING |
| optimize confirm {n}/{size} | photoCount, estimatedSavings | clients loop over photoData field | Yes — real IDB data | FLOWING |

---

### Behavioral Spot-Checks

All 42 test files are direct Node.js vm-sandbox behavioral probes — not mocked unit tests of shape. Selected key results:

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CR-01: Non-overview page does NOT advance debounce stamp | `node tests/25-09-schedule-debounce-no-modal.test.js` | 4/4 passed | PASS |
| CR-01: Modal in-place on all pages (backup-modal.js) | `node tests/25-09-modal-global-inplace.test.js` | 4/4 passed | PASS |
| CR-02: snippetsDeletedSeeds sentinel round-trips | `node tests/25-10-snippets-sentinel-roundtrip.test.js` | 6/6 passed | PASS |
| CR-03: Hebrew imperatives absent; infinitives present | `node tests/25-11-hardcoded-english-removed.test.js` | 14/14 passed (lines 9-12 cover CR-03) | PASS |
| D-29 full round-trip (16 assertions incl. sentinel) | `node tests/25-08-roundtrip-stores.test.js` | 16/16 passed | PASS |
| D-30 single-source audit (19 assertions) | `node tests/25-08-single-source-audit.test.js` | 19/19 passed | PASS |
| UAT-C2: {n}/{size} substituted before confirm dialog | `node tests/25-12-optimize-placeholders.test.js` | 4/4 passed | PASS |
| UAT-C3: storage line via i18n key (not English literal) | `node tests/25-11-toast-behavior.test.js` | 6/6 passed (scenario 4) | PASS |
| UAT-D1: Folder picker fully removed | `node tests/25-12-folder-picker-removed.test.js` | 15/15 passed | PASS |
| UAT-A: Custom days picker hidden except for custom freq | `node tests/25-12-custom-days-visibility.test.js` | 7/7 passed | PASS |
| UAT-B: Password callout redesign (row layout, styling) | `node tests/25-12-password-callout-redesign.test.js` | 10/10 passed | PASS |
| CSS: UAT-D5/D6/D7/E1/F1 visual fixes | `node tests/25-13-css-audit.test.js` | 14/14 passed | PASS |
| i18n parity: 490 keys in all 4 locales | `node tests/25-11-i18n-parity.test.js` | 23/23 passed | PASS |
| Full suite | `for t in tests/25-*.test.js; do node "$t"; done` | 328/328 passed, 42 files | PASS |

---

### Deferred Items (per 25-REVIEW.md post-review resolution, Ben decision 2026-05-16)

| Item | Description | Addressed In |
|------|-------------|-------------|
| WR-02 | confirmDialog placeholder substitution strips data-i18n from shared modal during language switch mid-dialog | Post-25 cleanup (25-FOLLOWUPS.md) |
| WR-03 | Optimize confirm {n} photoCount and {size} savings estimate use different photo-field coverage (legacy c.photo vs c.photoData) | Post-25 cleanup (25-FOLLOWUPS.md) |
| IN-01 | Modal markup duplicated across backup-modal.js MODAL_HTML and index.html static block | Post-25 cleanup (25-FOLLOWUPS.md) |
| IN-02 | Stale "Sole caller" comment in backup.js:688 after openExportFlow moved to backup-modal.js | Post-25 cleanup (25-FOLLOWUPS.md) |
| IN-03 | Post-restore refresh on non-overview pages does dead DOM work before reload | Post-25 cleanup (25-FOLLOWUPS.md) |
| IN-04 | tx.onabort not handled in _writeTherapistSentinel/withStore (pre-existing pattern) | Post-25 cleanup (25-FOLLOWUPS.md) |

---

### Anti-Patterns (Current State)

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `assets/backup.js:1142` | `localStorage.setItem("portfolioAutoBackupEnabled","true")` in pickBackupFolder — dead write since folder picker UI removed (WR-05, deferred) | INFO | Dead write; pickBackupFolder function kept as underlying primitive per test 25-12-folder-picker-removed |
| `settings.html:172` | `.backup-reminder-banner` CSS class reused on schedule-password callout (WR-03, deferred) | INFO | Style coupling; deferred to post-25 cleanup |
| No TBD/FIXME/XXX unreferenced markers found in Phase 25 modified files | — | CLEAR | Debt-marker gate passes |

---

### Human Verification Required

The following behaviors are correct in code but require manual testing on real browsers with real interaction:

#### 1. Web Share API — file attachment on supported platforms

**Test:** Open the Backup & Restore modal on iPhone Safari (iOS 15+) or Chrome macOS (89+). Click Share backup after creating an encrypted export.
**Expected:** Native share sheet appears with the .sgbackup file attached and visible as a selectable item.
**Why human:** navigator.canShare and navigator.share require a real browser gesture in a secure context; vm-sandbox tests use mocks only.

#### 2. Web Share API — mailto fallback on Firefox

**Test:** Open the modal on Firefox desktop. Click Share backup.
**Expected:** File downloads to Downloads folder, then the default mail client opens with subject "Sessions Garden backup - YYYY-MM-DD" and body stating the exact filename to attach manually (no false "attachment").
**Why human:** Firefox does not support navigator.share with files; the fallback path needs real verification.

#### 3. Test-backup-password with a real .sgbackup file

**Test:** Export an encrypted backup. Close and reopen the modal. In the Test backup password sub-card, upload the .sgbackup file, enter the correct password, click Test password.
**Expected:** Green success card reading "Decrypted successfully. Backup from [date] — N clients, M sessions." Client count in the app is unchanged.
**Why human:** Requires a real .sgbackup file with AES-GCM encryption; crypto.subtle is mocked in tests.

#### 4. Photos Settings — optimize-all savings preview and visual quality

**Test:** Add clients with photos, navigate to Settings → Photos, observe the savings preview amount before clicking Optimize.
**Expected:** 3-tier verdict displayed (compact/optional/recommended) with reasonable savings estimate. Confirm dialog shows same estimate with {n} and {size} substituted. After optimization, photos are visually identical but file size reduced.
**Why human:** Requires real photos and visual quality assessment; storage estimate APIs need a real IDB instance.

---

### CR-01..CR-03 Gap Closure Summary

**CR-01 — Schedule debounce gated on successful modal open (CLOSED)**

`checkBackupSchedule` at `backup.js:1382-1407` now uses an `opened` boolean flag. The debounce stamp `localStorage.setItem(lastPromptKey, String(now))` only executes inside the `if (opened)` block at line 1405. Since `backup-modal.js` is now loaded on all 4 pages (index/settings/add-client/add-session), `window.openBackupModal` is universally available, so the redirect branch at line 1397 is now a last-resort fallback. The primary fix is the `opened` gate; the global modal shipping (UAT-D2) reinforces it. Test 25-09-schedule-debounce-no-modal (4/4) covers all four cases: stamp not advanced when modal unavailable, stamp advanced when modal opens.

**CR-02 — snippetsDeletedSeeds sentinel round-trips losslessly (CLOSED)**

`importBackup` now has `ALLOWED_SENTINEL_KEYS = new Set(["snippetsDeletedSeeds"])` at backup.js:1032 and a sentinel branch at line 1041 that precedes the section-key check, routing sentinel rows to `db._writeTherapistSentinel()`. The sentinel write executes before the snippet-restore loop so any triggered `seedSnippetsIfNeeded` sees the restored `deletedIds`. `db._writeTherapistSentinel` (db.js:739) re-validates `sectionKey` against `_SENTINEL_KEYS` and type-filters `deletedIds`. Test 25-10-sentinel-roundtrip (6/6) proves: _writeTherapistSentinel called once, no customLabel/enabled coercion, sentinel precedes snippet write, deleted seeds remain deleted post-restore. Updated test 25-08-roundtrip-stores now includes a snippetsDeletedSeeds row in the test dataset (assertion 13 of 16).

**CR-03 — Hebrew noun/infinitive forms on Phase 25 surfaces (CLOSED)**

`i18n-he.js` line 279 (security.persistent.body): `מומלץ להשתמש בגיבויים מוצפנים ולנעול את המכשיר` — uses `מומלץ להשתמש` (recommended to use) and `לנעול` (to lock), both infinitives.
`i18n-he.js` line 293 (backup.passphrase.tooSimple): `מומלץ להשתמש בשילוב של אותיות ומספרים` — uses `מומלץ להשתמש`, an infinitive. Test 25-11-hardcoded-english-removed (14/14) asserts the old imperative forms (' השתמש ' and 'ונעל את המכשיר') are absent and the infinitive replacements are present.

---

_Verified: 2026-05-16T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — gaps CR-01, CR-02, CR-03 closed; 19 UAT items addressed; WR-01 resolved_
