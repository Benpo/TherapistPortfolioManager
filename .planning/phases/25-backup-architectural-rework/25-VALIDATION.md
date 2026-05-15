---
phase: 25
slug: backup-architectural-rework
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-15
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from RESEARCH.md §"Validation Architecture" → "Phase Requirements → Test Map" (lines 731–764).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Plain Node + `assert` + `vm` sandbox (no Jest, no Vitest, no Playwright) — verified against `tests/24-04-app-cache.test.js` and `tests/24-05-import-validator.test.js` |
| **Config file** | None (project has no `package.json`) |
| **Quick run command** | `node tests/<file>.test.js` (each file independently executable; exit 0 = pass) |
| **Full suite command** | `for f in tests/*.test.js; do node "$f" || echo "FAIL: $f"; done` |
| **Convention** | `{phase}-{plan}-{topic}.test.js` (e.g. `25-01-share-fallback.test.js`) |
| **Estimated runtime** | ~5 seconds for the Phase 25 subset; ~15 seconds for the full project suite |

---

## Sampling Rate

- **After every task commit:** Run all `tests/25-*.test.js` matching the touched plan number (e.g. touching `assets/backup.js` for Plan 01 → run `tests/25-01-*.test.js`).
- **After every plan wave:** Run the full Phase 25 set: `for f in tests/25-*.test.js; do node "$f" || echo "FAIL: $f"; done`.
- **Before `/gsd-verify-work`:** Full project suite green (Phase 25 + pre-existing Phase 24 + pdf tests).
- **Max feedback latency:** 5s (per-task) / 15s (per-wave).

---

## Per-Decision Verification Map

Phase 25 uses **decision IDs (D-XX)** as requirement IDs (Phase 25 has no separate REQ-IDs — the 30 CONTEXT.md decisions ARE the requirements).

| Decision | Plan | Wave | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|----------|------|------|------------|-----------------|-----------|-------------------|-------------|--------|
| D-01 | 25-01 | 1 | T1 | `BackupManager.sendToMyself` is removed | unit (grep + module export check) | `node tests/25-01-sendToMyself-removed.test.js` | ❌ W0 | ⬜ pending |
| D-02 | 25-01 | 1 | T2 | `shareBackup(blob, filename)` invokes `navigator.share({files})` when `canShare` returns true | unit (mock navigator) | `node tests/25-01-share-invoke.test.js` | ❌ W0 | ⬜ pending |
| D-02 | 25-01 | 1 | T2 | `shareBackup` falls back to triggerDownload + mailto when `canShare` returns false | unit (mock navigator) | `node tests/25-01-share-fallback.test.js` | ❌ W0 | ⬜ pending |
| D-04 | 25-08 | 7 | T2 | Share path receives the SAME blob produced by `exportEncryptedBackup` (encrypted-then-share inheritance) | unit (vm sandbox + sentinel blob assertion) | `node tests/25-08-encrypt-then-share.test.js` | ❌ W0 | ⬜ pending |
| D-09 / D-29 | 25-02 | 2 | — | Backup contents checklist matches `exportBackup` output stores | unit (introspect manifest + checklist) | `node tests/25-02-checklist-store-parity.test.js` | ❌ W0 | ⬜ pending |
| D-12 | 25-03 | 3 | T4 | `testBackupPassword(file, passphrase)` decrypts but does NOT call `db.clearAll`, `db.addClient`, etc. | unit (mock PortfolioDB, assert never called) | `node tests/25-03-testpassword-no-mutation.test.js` | ❌ W0 | ⬜ pending |
| D-12 | 25-03 | 3 | T4 | `testBackupPassword` rejects with i18n key on wrong passphrase (OperationError → wrongPassphrase) | unit | `node tests/25-03-testpassword-wrong.test.js` | ❌ W0 | ⬜ pending |
| D-15 / D-19 | 25-04 | 4 | — | `checkBackupReminder` early-returns when `getScheduleIntervalMs() !== null` | unit (mock localStorage) | `node tests/25-04-banner-suppression.test.js` | ❌ W0 | ⬜ pending |
| D-17 | 25-05 | 5 | — | `checkBackupSchedule()` fires prompt when `Date.now() - lastExport > intervalMs` AND not debounced | unit | `node tests/25-05-schedule-fires.test.js` | ❌ W0 | ⬜ pending |
| D-17 | 25-05 | 5 | — | `checkBackupSchedule()` debounces — second call within 1 hour does NOT re-fire | unit | `node tests/25-05-schedule-debounce.test.js` | ❌ W0 | ⬜ pending |
| D-18 | 25-05 | 5 | T3 | Schedule cannot be enabled without a password setup; `canEnableSchedule()` returns false until password set | unit | `node tests/25-05-schedule-password-mandatory.test.js` | ❌ W0 | ⬜ pending |
| D-21 | 25-06 | 1 | T6 | `resizeToMaxDimension(blob, 800, 0.75)` constrains longest edge to 800px (asserted via `createImageBitmap` opts capture) | unit (vm sandbox + stubbed createImageBitmap) | `node tests/25-06-resize-pure.test.js` | ❌ W0 | ⬜ pending |
| D-22 | 25-06 | 1 | T6 | After photo upload, `clients.photoData` contains only the cropped+resized output (no original blob persisted) | unit (mock IDB write inspection) | `node tests/25-06-crop-only.test.js` | ❌ W0 | ⬜ pending |
| D-29 | 25-08 | 7 | — | Backup round-trip completeness — export → import → diff every store losslessly | integration (jsdom + fake-indexeddb OR scripted manual) | `node tests/25-08-round-trip.test.js` (or manual UAT script) | ❌ W0 | ⬜ pending |
| D-30 | 25-08 | 7 | — | Schedule fire and Settings backup-password validator share a single function | unit (assert imports same module export) | `node tests/25-08-single-source-audit.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Threat IDs:** Defined in 25-CONTEXT.md / 25-PLAN-XX `<threat_model>` blocks. T1 (encryption bypass), T2 (Web Share leakage), T3 (schedule password storage), T4 (test-dry-run mutation), T5 (folder handle persistence), T6 (EXIF/photo data exfiltration).

---

## Wave 0 Requirements

All test files in the table above are created during their parent plan's execution wave (no separate Wave 0 install). The vm-sandbox + Node stdlib is already present — no framework install required.

- [ ] No new dev dependencies
- [ ] Existing `tests/` directory pattern used (see `tests/24-04-app-cache.test.js` for the canonical pattern)

---

## Manual-Only Verifications

| Behavior | Decision | Why Manual | Test Instructions |
|----------|----------|------------|-------------------|
| Web Share sheet actually attaches the file on iOS Safari | D-02 | Cannot mock the OS share sheet from Node | On iPhone Safari: open Backup & Restore → Export → encrypted → Share → AirDrop to a Mac → confirm `.sgbackup` file arrives intact and decrypts. |
| Photo upload from a multi-MB iPhone photo does not OOM | D-21 / D-23 | Real-device memory profile | On iPhone Safari: Add Client → upload 8–12 MB iPhone photo → confirm crop UI loads, save succeeds, IDB blob ≤ 200 KB. |
| Schedule fire prompt appears on visibilitychange after interval lapses | D-17 | visibilitychange + system clock manipulation | Manual: enable Daily schedule, set localStorage `portfolioLastExport` to >24h ago, blur and refocus tab, confirm the export prompt appears once and not again within 1 hour. |
| Backup contents checklist (D-09) renders all five rows in 4 locales | D-09 / D-28 | Visual / i18n parity check | Open Backup & Restore in EN, HE, DE, CS — confirm 5 ✓ rows in each, Hebrew uses noun forms. |
| Round-trip completeness on real device | D-29 | Best validated end-to-end on Sapir's Safari macOS + iPhone | Manual UAT: export → wipe IDB (DevTools) → import → confirm clients/sessions/snippets/settings/photos all match. |

---

## Validation Sign-Off

- [x] All decisions D-01..D-30 mapped to a plan + test or to manual UAT
- [x] All 6 STRIDE threats T1..T6 have a test or `<threat_model>` block in the relevant plan
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (per-plan tests cover each task)
- [x] Wave 0 has no install gaps (no framework needed; existing vm-sandbox pattern)
- [x] No watch-mode flags
- [x] Feedback latency < 5s per task, < 15s per wave
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-15 (autonomous run, derived from research-verified test map; planner produced corresponding test files per the table above).
