---
phase: 25-backup-architectural-rework
verified: 2026-05-15T12:00:00Z
status: gaps_found
score: 18/21
overrides_applied: 0
gaps:
  - truth: "BackupManager.checkBackupSchedule fires the interval-end prompt reliably on every page"
    status: failed
    reason: "CR-01 (code review corroborated): debounce timestamp written at backup.js:1324 BEFORE the window.openBackupModal availability check at line 1332. Pages without overview.js (settings.html, add-client.html, add-session.html) silently consume the 1-hour debounce without opening the modal. No test covers the non-overview-page scenario — the debounce test always mocks openBackupModal as available."
    artifacts:
      - path: "assets/backup.js"
        issue: "Line 1324: localStorage.setItem(lastPromptKey, String(now)) executes unconditionally before the openBackupModal existence check at line 1332"
      - path: "tests/25-05-schedule-debounce.test.js"
        issue: "Test always provides window.openBackupModal = function(){...} in sandbox; never tests the non-overview-page case where modal is unavailable"
    missing:
      - "Gate the timestamp write on successful modal open (or redirect to index.html?openBackup=1 before writing)"
      - "Add a test case where window.openBackupModal is undefined — debounce stamp must NOT advance"
  - truth: "Backup restore (importBackup) losslessly round-trips every therapistSettings record including the snippetsDeletedSeeds sentinel"
    status: failed
    reason: "CR-02 (code review corroborated): ALLOWED_KEYS whitelist at backup.js:994-1004 contains only 9 section-key names; 'snippetsDeletedSeeds' is not included. On restore: clearAll() resets _seedingDone=false; the sentinel in the backup manifest is silently skipped (logged as unknown); next openDB triggers seedSnippetsIfNeeded which re-populates seed snippets the user had explicitly deleted. Silent data regression on every restore. No test covers this path."
    artifacts:
      - path: "assets/backup.js"
        issue: "ALLOWED_KEYS at lines 994-1004 does not include 'snippetsDeletedSeeds'; line 1011 skips it with console.warn"
      - path: "tests/25-08-roundtrip-stores.test.js"
        issue: "Round-trip test does not include a therapistSettings record with sectionKey='snippetsDeletedSeeds'; confirms only field-level losslessness for standard section rows"
    missing:
      - "Separate ALLOWED_SENTINEL_KEYS for 'snippetsDeletedSeeds' in importBackup"
      - "Write sentinel record verbatim via a dedicated DB write path (not setTherapistSetting which coerces customLabel/enabled)"
      - "Relocate snippet-restore loop to run AFTER sentinel write (so seedSnippetsIfNeeded sees restored deleted-ids)"
      - "Add a round-trip test that verifies snippetsDeletedSeeds survives export+import"
  - truth: "All Hebrew strings on Phase 25 surfaces use noun/infinitive forms (D-27 — no masculine-singular imperatives)"
    status: failed
    reason: "CR-03 (code review corroborated): Two Hebrew strings reachable from Phase 25 UX flows contain masculine-singular imperatives. security.persistent.body (line 271) uses 'השתמש' (use, masc-sg imperative) and 'נעל' (lock, masc-sg imperative) — rendered on every page via App.initPersistentSecuritySection. backup.passphrase.tooSimple (line 285) uses 'השתמש' — reachable through the passphrase modal in the new export dialog."
    artifacts:
      - path: "assets/i18n-he.js"
        issue: "Line 271: security.persistent.body — 'השתמש...ונעל' are masc-sg imperatives. Line 285: backup.passphrase.tooSimple — 'השתמש' is masc-sg imperative"
    missing:
      - "Replace 'השתמש' with 'מומלץ להשתמש' and 'נעל' with 'לנעול' in both strings (see code review CR-03 for exact fixed text)"
---

# Phase 25: Backup Architectural Rework — Verification Report

**Phase Goal:** Reshape the entire backup UX around a single header cloud icon entry point with state-color recency signaling; replace the security-broken "Send to myself" with an honest Web-Share-API + truthful mailto fallback; add a Test-backup-password dry-run; ship scheduled foreground backups with password-mandatory enforcement; move folder-picker to Settings; resize photos on upload (max 800px, q0.75, EXIF-aware, crop-only storage); deliver a Photos settings tab for storage reclamation; close the encrypt-then-share gap; prove D-29 (every-store round-trip) and D-30 (single-source helper claims) with audit tests.

**Verified:** 2026-05-15T12:00:00Z
**Status:** gaps_found — 3 blockers
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All 21 automated test suites pass (130 individual assertions across 21 test files). Three gaps block the phase goal on correctness grounds, corroborated by the 25-REVIEW.md critical findings.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | sendToMyself removed from BackupManager public API | VERIFIED | `grep -c "sendToMyself" assets/backup.js` returns 0; test 25-01-sendToMyself-removed passes (4/4 assertions) |
| 2 | shareBackup(blob, filename) exposed; inherits encryption from caller; uses Web Share API or falls back to honest mailto | VERIFIED | backup.js lines 721-795; tests 25-01-share-fallback (7/7) and 25-01-share-encryption-inherit (5/5) pass |
| 3 | isShareSupported probes with actual File (Pitfall 1 mitigation) | VERIFIED | backup.js line 721 `function isShareSupported(file)` — accepts File parameter, probes navigator.canShare({files:[file]}) |
| 4 | Three new i18n keys (backup.action.share, backup.share.title, backup.share.fallback.body) in all 4 locales; overview.sendBackup removed from all 4 locales | VERIFIED | grep confirms all three keys in en/he/de/cs; zero matches for overview.sendBackup in any locale |
| 5 | Single Backup & Restore modal replaces 3-button cluster; old exportBtn / sendBackupBtn / autoBackupBtn removed from index.html | VERIFIED | test 25-02-modal-structure passes (8/8); old IDs absent from index.html; #backupModal present with all required sections |
| 6 | Header cloud icon (#backupCloudBtn) mounted by App.mountBackupCloudButton in #headerActions on all pages | VERIFIED | app.js lines 425-501; app.js initCommon calls mountBackupCloudButton (line 589); test 25-02-modal-structure confirms |
| 7 | Cloud icon state class updates to backup-cloud-btn--{never/fresh/warning/danger} on relevant events | VERIFIED | app.js updateBackupCloudState (line 519); overview.js calls it post-export, post-import, visibilitychange; test 25-04-cloud-state (18/18) |
| 8 | D-14 color thresholds: schedule-OFF uses 7d/14d breakpoints; schedule-ON uses interval/interval×2 breakpoints | VERIFIED | backup.js getChipState lines 1246-1256 implement exact thresholds; test 25-04-cloud-state validates all OFF/ON × never/fresh/warning/danger combinations |
| 9 | D-15/D-19: 7-day reminder banner suppressed when schedule is ON; fires normally when schedule is OFF | VERIFIED | app.js checkBackupReminder lines 922-945 early-returns when getScheduleIntervalMs() !== null; test 25-04-banner-suppression (4/4) |
| 10 | BackupManager.testBackupPassword(file, passphrase) dry-run: decrypts to memory, never writes to IDB or localStorage | VERIFIED | backup.js lines 819-874; tests 25-03-testpassword-no-mutation (3/3), 25-03-testpassword-wrong (2/2), 25-03-testpassword-invalid (5/5) |
| 11 | Test-password sub-card wired inside #backupModalTestPasswordSection with all 4 IDs present | VERIFIED | index.html contains #backupTestPasswordFile, #backupTestPasswordInput, #backupTestPasswordRun, #backupTestPasswordResult; overview.js calls BackupManager.testBackupPassword |
| 12 | Settings "Backups" tab: frequency selector, password-mandatory gate, folder picker, ON→OFF confirm | VERIFIED | settings.html lines 148-188; settings.js Backups tab handlers; test 25-05-schedule-password-mandatory (7/7) |
| 13 | BackupManager.checkBackupSchedule() fires the interval-end prompt when elapsed > interval AND debounce expired | VERIFIED (fire behavior) / FAILED (reliability) | Test 25-05-schedule-fires (2/2) — correct when openBackupModal is available. CR-01: debounce consumed before modal reachability check; prompt silently lost on non-overview pages — see gaps |
| 14 | D-18 password-mandatory: canEnableSchedule gates non-Off schedule without acknowledged password | VERIFIED | backup.js canEnableSchedule (line 1347); settings.js enforces it; test 25-05-schedule-password-mandatory (7/7) |
| 15 | CropModule.resizeToMaxDimension(blob, 800, 0.75) with EXIF-aware createImageBitmap and crop-only storage | VERIFIED | crop.js lines 193-248; createImageBitmap with imageOrientation:'from-image'; test 25-06-resize-pure (4/4) |
| 16 | add-client.js calls resizeToMaxDimension BEFORE openCropModal; only cropped JPEG hits IDB | VERIFIED | add-client.js line 79; test 25-06-crop-only (3/3) |
| 17 | Photos Settings tab: storage usage display, optimize-all with savings preview, delete-all destructive | VERIFIED | settings.html lines 189-248; settings.js _deleteAllPhotosLoop (line 2155) and optimize loop; navigator.storage.estimate (line 2310); PortfolioDB.estimatePhotosBytes (db.js line 509) |
| 18 | D-29 round-trip: clients, sessions, snippets, therapistSettings section rows, photos all survive export+import losslessly | PARTIAL — FAILED | test 25-08-roundtrip-stores passes (15/15) for section rows but snippetsDeletedSeeds sentinel is not in ALLOWED_KEYS whitelist and is silently dropped on import — silent data regression (CR-02) |
| 19 | D-04 / encrypt-then-share: exportEncryptedBackup returns blob+filename so shareBackup receives the SAME encrypted blob | VERIFIED | backup.js line 696 returns {ok, skip, cancelled, blob, filename}; test 25-08-encrypt-then-share (10/10) including sentinel-blob identity check |
| 20 | D-30 single-source audit: getScheduleIntervalMs and resizeToMaxDimension each have multiple consumers | VERIFIED | test 25-08-single-source-audit (18/18); grep confirms getScheduleIntervalMs in backup.js (5×) + app.js (3×); resizeToMaxDimension in crop.js (2×) + add-client.js (2×) + settings.js (5×) |
| 21 | D-27 Hebrew strings: all Phase 25 surfaces use noun/infinitive forms (no masculine-singular imperatives) | FAILED | CR-03: i18n-he.js line 271 (security.persistent.body) and line 285 (backup.passphrase.tooSimple) contain 'השתמש' and 'נעל' — masculine-singular imperatives. Both strings are reachable from Phase 25 UX flows. |

**Score:** 18/21 truths verified (3 gaps, all blockers)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/backup.js` | shareBackup, isShareSupported, testBackupPassword, getChipState, getScheduleIntervalMs, checkBackupSchedule, computeBackupRecencyState | VERIFIED | All 7 functions present and on public API |
| `assets/overview.js` | openExportFlow with new return shape; openBackupModal; shareBackup wiring | VERIFIED | Lines 130-228; handles result.ok/skip/cancelled/blob |
| `assets/app.js` | mountBackupCloudButton, updateBackupCloudState; checkBackupReminder with schedule suppression | VERIFIED | Lines 425-601 |
| `assets/crop.js` | resizeToMaxDimension exposed; quality changed to 0.75 | VERIFIED | Lines 209-248, 288 |
| `assets/add-client.js` | resizeToMaxDimension called before openCropModal | VERIFIED | Line 79 |
| `assets/settings.js` | Backups tab + Photos tab handlers; canEnableSchedule enforcement | VERIFIED | Lines 1863-2458 |
| `assets/db.js` | estimatePhotosBytes, updateClient exposed | VERIFIED | Lines 477, 509, 784, 788 |
| `index.html` | #backupModal with all sections; old 3 buttons removed; #headerActions present | VERIFIED | Lines 65, 179-253 |
| `settings.html` | Backups tab + Photos tab content | VERIFIED | Lines 55-248 |
| `assets/i18n-{en,he,de,cs}.js` | 4-locale parity (483 keys each); all Phase 25 keys present; overview.sendBackup removed | VERIFIED | Key count 483/483/483/483; share + testPassword keys confirmed in all 4 locales |
| `tests/25-01-*.test.js` (3 files) | sendToMyself removed; share fallback; encryption inherit | VERIFIED | All 3 pass (16/16 assertions) |
| `tests/25-02-*.test.js` (2 files) | Store parity; modal structure | VERIFIED | Both pass (17/17 assertions) |
| `tests/25-03-*.test.js` (3 files) | No-mutation dry-run; wrong-passphrase; invalid-file | VERIFIED | All 3 pass (10/10 assertions) |
| `tests/25-04-*.test.js` (3 files) | Cloud state; schedule interval; banner suppression | VERIFIED | All 3 pass (31/31 assertions) |
| `tests/25-05-*.test.js` (3 files) | Schedule fires; debounce; password mandatory | VERIFIED (fire + debounce basics) / PARTIAL (debounce test never covers non-overview page) | 11/11 assertions pass but CR-01 gap not covered |
| `tests/25-06-*.test.js` (2 files) | Resize pure; crop-only | VERIFIED | Both pass (7/7 assertions) |
| `tests/25-07-*.test.js` (2 files) | Photo bytes estimator; delete-all photos | VERIFIED | Both pass (14/14 assertions) |
| `tests/25-08-*.test.js` (3 files) | Round-trip stores; encrypt-then-share; single-source audit | PARTIAL — D-29 passes for section rows but snippetsDeletedSeeds not covered | 43/43 assertions pass but CR-02 gap not tested |
| `tests/_helpers/mock-navigator-share.js` | createShareMock factory | VERIFIED | Exists, CommonJS export |
| `tests/_helpers/mock-portfolio-db.js` | createMockPortfolioDB + assertNoWrites | VERIFIED | Exists, used by Plan 03 and Plan 08 tests |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| BackupManager.shareBackup | navigator.share / navigator.canShare | feature-detect with actual File | VERIFIED | backup.js line 756; probe pattern navigator.canShare({files:[file]}) present |
| shareBackup mailto fallback | BackupManager.triggerDownload | direct call before mailto href set | VERIFIED | backup.js lines 779-788; test 25-01-share-fallback asserts triggerDownload AND mailto in order |
| #backupCloudBtn | App.updateBackupCloudState | post-export, post-import, visibilitychange, schedule-change | VERIFIED | overview.js lines 175, 212; app.js visibilitychange listener line 601 |
| App.updateBackupCloudState | BackupManager.computeBackupRecencyState (→ getChipState + getScheduleIntervalMs) | internal delegation | VERIFIED | backup.js computeBackupRecencyState lines 1272-1277 delegates to getChipState; app.js calls it at line 524 |
| app.js checkBackupReminder | BackupManager.getScheduleIntervalMs | early-return if schedule ON | VERIFIED | app.js lines 932-933 |
| BackupManager.checkBackupSchedule | window.openBackupModal | interval-end prompt | PARTIAL — BLOCKER | backup.js line 1332 checks typeof window.openBackupModal === 'function' AFTER debounce write at line 1324 — CR-01 |
| importBackup | snippetsDeletedSeeds sentinel write | ALLOWED_KEYS whitelist | NOT_WIRED — BLOCKER | ALLOWED_KEYS at backup.js:994 does not include 'snippetsDeletedSeeds' — CR-02 |
| add-client.js photoInput change | CropModule.resizeToMaxDimension(file, 800, 0.75) | before openCropModal | VERIFIED | add-client.js line 79 |
| Photos tab Optimize button | CropModule.resizeToMaxDimension via settings.js loop | loop over clients | VERIFIED | settings.js line 2289; test 25-08-single-source-audit confirms |
| Photos tab Delete-all | PortfolioDB.updateClient({...c, photoData:''}) | loop over clients | VERIFIED | settings.js _deleteAllPhotosLoop line 2155 |
| exportEncryptedBackup new return shape | openExportFlow branch handling | object destructure {ok, skip, cancelled, blob, filename} | VERIFIED | overview.js lines 142-163; test 25-08-encrypt-then-share (10/10) |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| index.html #backupModalLastBackup | portfolioLastExport | localStorage.getItem('portfolioLastExport') | Yes — real timestamp | FLOWING |
| index.html #backupCloudBtn state class | computeBackupRecencyState() | getChipState({now, lastExport, intervalMs}) | Yes — real localStorage reads | FLOWING |
| settings.html Photos usage line | estimatePhotosBytes(clients) + navigator.storage.estimate() | PortfolioDB.getAllClients() IDB read + browser API | Yes — real IDB walk + browser | FLOWING |
| settings.html schedule frequency selector | portfolioBackupScheduleMode | localStorage.getItem | Yes | FLOWING |

---

### Behavioral Spot-Checks

Tests run directly against source files via Node.js vm sandbox — full behavioral probe of all 21 test suites.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| sendToMyself fully purged | `node tests/25-01-sendToMyself-removed.test.js` | 4 passed, 0 failed | PASS |
| shareBackup mailto fallback path | `node tests/25-01-share-fallback.test.js` | 7 passed, 0 failed | PASS |
| shareBackup encryption inherit | `node tests/25-01-share-encryption-inherit.test.js` | 5 passed, 0 failed | PASS |
| Modal structure + store parity | `node tests/25-02-*.test.js` | 17 passed, 0 failed | PASS |
| testBackupPassword no-mutation | `node tests/25-03-testpassword-no-mutation.test.js` | 3 passed, 0 failed | PASS |
| testBackupPassword wrong+invalid | `node tests/25-03-testpassword-wrong/invalid.test.js` | 7 passed, 0 failed | PASS |
| Cloud state thresholds | `node tests/25-04-cloud-state.test.js` | 18 passed, 0 failed | PASS |
| Banner suppression (D-15/D-19) | `node tests/25-04-banner-suppression.test.js` | 4 passed, 0 failed | PASS |
| Schedule fires + debounce | `node tests/25-05-schedule-fires/debounce.test.js` | 4 passed, 0 failed | PASS (basic paths only — CR-01 gap untested) |
| Schedule password mandatory | `node tests/25-05-schedule-password-mandatory.test.js` | 7 passed, 0 failed | PASS |
| Resize 800px EXIF-aware | `node tests/25-06-resize-pure.test.js` | 4 passed, 0 failed | PASS |
| Crop-only IDB storage | `node tests/25-06-crop-only.test.js` | 3 passed, 0 failed | PASS |
| Photo bytes estimator | `node tests/25-07-photo-bytes-estimator.test.js` | 9 passed, 0 failed | PASS |
| Delete-all photos loop | `node tests/25-07-delete-all-photos.test.js` | 5 passed, 0 failed | PASS |
| Round-trip stores | `node tests/25-08-roundtrip-stores.test.js` | 15 passed, 0 failed | PASS (snippetsDeletedSeeds NOT in dataset — CR-02 invisible to test) |
| Encrypt-then-share sentinel blob | `node tests/25-08-encrypt-then-share.test.js` | 10 passed, 0 failed | PASS |
| Single-source audit | `node tests/25-08-single-source-audit.test.js` | 18 passed, 0 failed | PASS |

---

### Requirements Coverage

Phase 25 uses decision-codes (D-01..D-30) from 25-CONTEXT.md as the authoritative requirement set. REQUIREMENTS.md does not contain Phase 25 entries — the ROADMAP's narrative goal plus 25-CONTEXT.md decisions are the binding contract.

| Decision | Description | Status | Evidence |
|----------|-------------|--------|----------|
| D-01 | sendToMyself removed | SATISFIED | grep confirms 0 occurrences in backup.js |
| D-02/D-03/D-04 | shareBackup with Web Share API; honest mailto fallback; encryption inherited | SATISFIED | Tests 25-01 (all 3 pass) |
| D-05..D-07 | Single Backup & Restore modal; Export prominent, Import secondary | SATISFIED | index.html modal structure verified |
| D-08 | Header cloud icon entry point | SATISFIED | mountBackupCloudButton in app.js |
| D-09 | Backup contents checklist (5 items) | SATISFIED | index.html lists clients/sessions/snippets/settings/photos |
| D-10 | Last-backup-at indicator inside modal | SATISFIED | #backupModalLastBackup in index.html |
| D-11 | Folder picker moved to Settings → Backups | SATISFIED | settings.html scheduleFolderField; settings.js pickBackupFolder |
| D-12 | Test-backup-password dry-run | SATISFIED | testBackupPassword function; no IDB writes proven |
| D-13 | Cloud icon color IS the status surface (no separate chip) | SATISFIED | No chip element in DOM; color via CSS class on icon |
| D-14 | Color thresholds (schedule-OFF 7d/14d; schedule-ON interval/2×interval) | SATISFIED | getChipState verified by test 25-04-cloud-state |
| D-15/D-19 | Banner suppressed when schedule ON | SATISFIED | app.js checkBackupReminder; test 25-04-banner-suppression |
| D-16..D-20 | Frequency selector; interval-end prompt; password mandatory; banner suppression; no silent folder-write | PARTIAL SATISFIED | D-17 interval-end prompt fires ONLY on overview.js pages; CR-01 means non-overview pages silently consume debounce — behavioral gap |
| D-21 | resizeToMaxDimension max 800px EXIF-aware | SATISFIED | crop.js; tests 25-06-resize-pure |
| D-22 | Crop-only storage (original never persisted) | SATISFIED | test 25-06-crop-only proven |
| D-23 | No hard upload-size cap | SATISFIED | add-client.js; soft 25MB warning only |
| D-24 | Optional one-time optimize existing photos | SATISFIED | settings.js optimize-all loop |
| D-25 | Photos Settings tab with usage/optimize/delete | SATISFIED | settings.html Photos tab; all three sections present |
| D-26 | Clear headers on every surface | SATISFIED | All modal sections and settings tabs have headings |
| D-27 | Hebrew noun/infinitive forms (no imperatives) | FAILED | i18n-he.js lines 271+285 contain 'השתמש'/'נעל' — CR-03 |
| D-28 | 4-locale parity | SATISFIED | 483 keys in all 4 locales |
| D-29 | Backup round-trip completeness (all stores lossless) | PARTIAL SATISFIED | test 25-08-roundtrip passes for section rows but snippetsDeletedSeeds sentinel dropped on import — CR-02 |
| D-30 | Single-source-of-truth pattern | SATISFIED | test 25-08-single-source-audit (18/18) confirms getScheduleIntervalMs and resizeToMaxDimension each have multiple verified consumers |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `assets/backup.js:1324` | Debounce timestamp written before modal reachability check (CR-01) | BLOCKER | Schedule reminder silently lost on non-overview pages; debounce consumed wastefully |
| `assets/backup.js:994-1004` | ALLOWED_KEYS whitelist missing 'snippetsDeletedSeeds' sentinel (CR-02) | BLOCKER | Every restore re-seeds snippets the user explicitly deleted — silent data regression |
| `assets/i18n-he.js:271,285` | Masculine-singular imperatives 'השתמש'/'נעל' in Phase 25-reachable strings (CR-03) | BLOCKER | Female therapists (primary HE audience) see grammatically incorrect forms |
| `assets/settings.js:521,2385,2413,2458` | Hardcoded English error toast text in four paths (WR-01) | WARNING | Hebrew/German/Czech users see English on error paths |
| `assets/backup.js:909-915` | err.name access without null-check in importBackup decrypt catch (WR-02) | WARNING | Thrown non-Error values can cause silent spinner hang |
| `settings.html:171` | .backup-reminder-banner reused for schedule-password callout (WR-03) | WARNING | Style coupling — future banner tuning affects unrelated UI element |
| `assets/backup.js:1096` | localStorage.setItem("portfolioAutoBackupEnabled","true") written but never read (WR-05) | WARNING | Dead write creates false impression of auto-backup being active across sessions |

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

#### 4. Schedule interval-end prompt — overview page only

**Test:** Set schedule to Daily in Settings → Backups. Acknowledge the password checkbox. Navigate to settings.html while 25+ hours have elapsed since last backup (manipulate localStorage.portfolioLastExport to a day-old timestamp).
**Expected:** No prompt on settings.html (CR-01 bug). Navigate to index.html — prompt should appear IF the debounce was not consumed. This verifies whether CR-01 actually suppresses the reminder in practice.
**Why human:** Requires time manipulation and cross-page navigation; cannot be automated without a browser.

#### 5. Photos Settings — optimize-all savings preview

**Test:** Add clients with photos, navigate to Settings → Photos, observe the savings preview amount before clicking Optimize.
**Expected:** Reasonable savings estimate displayed (e.g., "Estimated savings: ~35 MB"). Confirm dialog shows the same estimate. After optimization, photos are visually identical but file size reduced.
**Why human:** Requires real photos and visual quality assessment; storage estimate APIs need a real IDB instance.

---

### Gaps Summary

Three gaps block the phase goal achievement. All three were independently identified by the code review (25-REVIEW.md) and corroborated by direct code inspection.

**Gap 1 — CR-01: Schedule debounce consumed before modal reachability (BLOCKER)**

The most behaviorally impactful gap. `checkBackupSchedule` at `backup.js:1324` writes the 1-hour debounce timestamp unconditionally before checking whether `window.openBackupModal` is available (line 1332). Since `openBackupModal` only exists on `index.html` (loaded by `overview.js`), every page that calls `initCommon` (settings.html, add-client.html, add-session.html, etc.) silently no-ops the schedule check AND blocks the next reminder for an hour. Users who return to the app via any non-overview page will routinely miss their scheduled reminders. The existing test (25-05-schedule-debounce.test.js) always mocks `openBackupModal` as available and does not cover this scenario.

Fix: move `localStorage.setItem(lastPromptKey, String(now))` inside the `if (typeof window.openBackupModal === 'function')` block, OR redirect to `index.html?openBackup=1` when the modal is unavailable and write the stamp after the redirect.

**Gap 2 — CR-02: snippetsDeletedSeeds sentinel dropped on restore (BLOCKER)**

`importBackup` at `backup.js:994` uses a 9-key `ALLOWED_KEYS` whitelist for therapistSettings restoration. The `snippetsDeletedSeeds` sentinel — which records which seed snippets the user explicitly deleted — is not in this list. On restore: (1) `clearAll()` wipes the store and resets `_seedingDone`; (2) the sentinel from the backup is silently skipped; (3) the snippet-restore loop triggers `openDB → seedSnippetsIfNeeded` which sees an empty deleted-ids set and re-seeds the full pack. The user loses their snippet deletion preferences every time they restore. The round-trip test (25-08-roundtrip-stores.test.js) does not include a therapistSettings record with `sectionKey='snippetsDeletedSeeds'` and therefore does not catch this regression.

Fix: add `snippetsDeletedSeeds` to a separate sentinel whitelist; write it verbatim via a dedicated IDB path before the snippet-restore loop runs; add a round-trip test that verifies sentinel survival.

**Gap 3 — CR-03: Hebrew masculine-singular imperatives on Phase 25 surfaces (BLOCKER)**

D-27 prohibits imperative verb forms in Hebrew (gender-neutral noun/infinitive convention). Two strings reachable from Phase 25 UX flows contain `השתמש` (masculine-singular "use!") and `נעל` (masculine-singular "lock!"): `security.persistent.body` (rendered on every page by initPersistentSecuritySection) and `backup.passphrase.tooSimple` (shown when the passphrase is rejected as too simple in the backup dialog). The fix is straightforward: replace with passive/infinitive phrasing `מומלץ להשתמש` / `לנעול`.

These strings predate Phase 25 but both are directly reachable from new Phase 25 surfaces (persistent security section + passphrase modal), which is why they count as Phase 25 deliverables.

---

### Code Review Corroboration

The 25-REVIEW.md identified 3 critical findings (CR-01, CR-02, CR-03) and 7 warnings. This verification independently confirms all 3 criticals through direct code inspection:

- CR-01: Confirmed at backup.js:1324 (debounce write) vs 1332 (modal check).
- CR-02: Confirmed at backup.js:994-1004 (ALLOWED_KEYS missing snippetsDeletedSeeds).
- CR-03: Confirmed at i18n-he.js:271 and 285 (masculine-singular imperatives).

The warnings (WR-01 through WR-07) are real quality issues but do not block the phase goal on their own. They are not included as gaps here because they do not fail any must-have truth — they are candidates for a follow-up plan within Phase 25 or a bug-fix phase.

---

_Verified: 2026-05-15T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
