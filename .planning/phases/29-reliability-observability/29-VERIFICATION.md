---
phase: 29-reliability-observability
verified: 2026-06-23T12:00:00Z
status: human_needed
score: 3/3 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Install Sessions Garden as a PWA (iOS/Android/desktop). Open Settings → 'Report a problem' → tap 'Open email to support'."
    expected: "The device's native mail client opens with recipient = contact@sessionsgarden.app, a pre-filled subject line, and a short 'paste below this line' body — NOT the full diagnostic log."
    why_human: "mailto: reliability inside an installed PWA varies by device and OS. The degradation path (degradeToVisibleAddress) is code-verified, but whether the happy path actually opens the mail client on a real installed PWA requires device testing (Phase 28 field-verification lesson; acknowledged in deferred-items.md)."
---

# Phase 29: Reliability & Observability Verification Report

**Phase Goal:** Production problems on a user's device are diagnosable — errors are captured locally, the user can hand over a diagnostic log without any data leaving the device, and a failed database migration can no longer trap the user in an unrecoverable refresh loop.
**Verified:** 2026-06-23
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Uncaught error / unhandled rejection captured, retained in IDB (≤50 / ≤30d), zero network | VERIFIED | `crashlog.js` installs `window.onerror` + `unhandledrejection` handlers; dual storage (IDB primary + localStorage mirror bypassing openDB); prune-on-write implemented; 29-01 test suite 6/6 PASS; zero fetch/XHR confirmed by grep + runtime spy; CR-01 merge fix (04b1073) confirmed by 29-04 test 3/3 PASS (40 entries survive ingest, idempotent) |
| 2 | Settings exposes "Report a problem" → copies log to clipboard; nothing transmitted automatically | VERIFIED | `settings.js buildReportRow()` produces a `.settings-row` targeting `./report.html`; `report.js assembleReport()` reads `window.CrashLog.getEntries()`; `copyReport()` copies current textarea value (not stale string); mailto body is short "paste below" template never the full log; 29-03 tests 19/19 PASS; zero fetch/XHR confirmed by grep + runtime spy |
| 3 | Failed IndexedDB migration offers reset & recover escape hatch instead of endless refresh loop | VERIFIED | `showDBMigrationError()` in db.js replaced dead-end `location.reload()` with Export + checkbox-gated Reset + double-confirm + `indexedDB.deleteDatabase`; `getAllForRecoveryExport()` opens DB with no version arg (never re-triggers failing migration); 29-02 tests 12/12 PASS; zero fetch/XHR confirmed by grep |

**Score:** 3/3 truths verified (0 present, behavior-unverified)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/crashlog.js` | OBS-01 capture module (IIFE-global CrashLog, >120 lines) | VERIFIED | Exists, 445 lines, substantive. Exports `logError/getEntries/clear/clStr/CRASHLOG_STRINGS`. Wired on all 20 pages. |
| `assets/db.js` | Contains `deleteDatabase` (OBS-03 escape hatch) | VERIFIED | `showDBMigrationError()` present; `getAllForRecoveryExport()` present; `DB_VERSION` exported (WR-01 fix); `replaceAllCrashlog` accessor for atomic prune. |
| `assets/backup.js` | Contains `exportRecoveryBackup` | VERIFIED | `exportRecoveryBackup(passphraseFlow?)` present; shared `_assembleBackupZip()` builder extracted; passphrase-gated (D-07). |
| `assets/report.js` | OBS-02 controller containing `copyTextToClipboard` | VERIFIED | Exists, 418 lines. Contains `copyTextToClipboard`, `assembleReport`, `redactReport` (with WR-02 UA re-stitch), `copyReport`, `openSupportEmail`, `degradeToVisibleAddress`. |
| `report.html` | Dedicated report screen containing `report.js` | VERIFIED | Exists. References `./assets/crashlog.js` and `./assets/report.js`; contains `reportPreview` textarea, `reportCopyBtn`, `reportEmailBtn`, `reportEmptyState`. SW-precached (`/assets/report.js` + `/report`). |
| `assets/app.css` | Contains `db-error-banner` (OBS-03 CSS) | VERIFIED | Confirmed by 29-02-SUMMARY and the `db-error-banner--escape` class referenced in db.js `showDBMigrationError`. |
| `assets/shared-chrome.js` | Contains `CrashLog.logError` call | VERIFIED | Line 127: `window.CrashLog.logError({source:'integrity', ...})` — feature-gated on `window.CrashLog` presence, fully guarded. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `assets/crashlog.js` | `window.onerror` / `unhandledrejection` | global handlers installed in IIFE body | VERIFIED | `installHandlers()` called at module init; chains any prior onerror handler |
| `assets/crashlog.js` | `localStorage` (mirror) | `writeMirror()` → direct `localStorage.setItem`, never via `openDB()` | VERIFIED | `writeMirror` calls `localStorage.setItem` directly; test case 5 confirms openDB not called on the mirror path |
| `assets/report.js` | `CrashLog.getEntries` | `assembleReport()` reads `window.CrashLog.getEntries` | VERIFIED | Line 164: `window.CrashLog && window.CrashLog.getEntries` feature-gated; called in `assembleReport()` |
| `assets/settings.js` | `report.html` | `.settings-row` affordance at `href="./report.html"` | VERIFIED | `buildReportRow()` sets `openLink.setAttribute("href", "./report.html")`; test confirms label + target |
| `assets/shared-chrome.js` | `CrashLog.logError` | `maybeUpgradeFooterAndNudge` on non-clean integrity state | VERIFIED | Lines 125–132: feature-gated `CrashLog.logError({source:'integrity', ...})`; test 29-03-report-wiring case 2 confirms exactly one call |
| `assets/db.js` (escape hatch Export) | read-only no-version `indexedDB.open(DB_NAME)` | `getAllForRecoveryExport()` → `_openReadOnlyNoVersion()` | VERIFIED | 29-02-recovery-export test case 2 confirms populated data returned while `openDB()` would abort |
| `assets/db.js` (Reset & recover) | `indexedDB.deleteDatabase(DB_NAME)` + `location.reload()` | checkbox-gated + `App.confirmDialog(tone:'danger')` | VERIFIED | 29-02-migration-escape-hatch test cases 2-3 confirm disabled gate and danger confirm prerequisite |
| `assets/version.js` (wedged recover) | `PortfolioDB._showDBMigrationError` | recover.onclick calls `DB._showDBMigrationError(...)` | VERIFIED | Lines 282–291 of version.js; test case 3 confirms non-empty onclick navigates/invokes correctly |
| `assets/version.js` (wedged report) | `report.html` | report.onclick → `window.location.href = './report.html'` | VERIFIED | Lines 298–300 of version.js; test case 3 (report-wiring) confirms navigation target |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `assets/report.js` | `entries` (crash log entries) | `window.CrashLog.getEntries()` → IDB `crashlog` store | Yes — IDB primary + localStorage fallback; prune-on-write bounded | FLOWING |
| `assets/report.js` | `dbVersion()` | `window.PortfolioDB.DB_VERSION` | Yes — exported from db.js line 1071 (WR-01 fix verified by test) | FLOWING |
| `assets/report.js` | `appVersion()` | `window.AppVersion.APP_VERSION` | Yes — version.js exports APP_VERSION; shared-chrome.js fallback aligned to 1.2.1 (WR-03 fix) | FLOWING |
| `assets/db.js` (`getAllForRecoveryExport`) | `clients, sessions, therapistSettings, snippets` | No-version IDB open; each store guarded by `objectStoreNames.contains` | Yes — test case 2 confirms real records returned; missing store returns `[]` | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| OBS-01: error capture, 50-entry ceiling, 30-day prune, mirror survives IDB failure, zero network | `node tests/29-01-crashlog-capture.test.js` | 6/6 PASS | PASS |
| OBS-01: CR-01 merge fix — 40 IDB entries survive ingest (not wiped to 5) | `node tests/29-04-crashlog-ingest-merge.test.js` | 3/3 PASS | PASS |
| OBS-03: recovery export around failure, missing-store guard, ZIP manifest, zero network, passphrase gate | `node tests/29-02-recovery-export.test.js` | 6/6 PASS | PASS |
| OBS-03: escape hatch controls, checkbox gate, danger confirm → deleteDatabase, cancel aborts, extra-emphatic, RTL | `node tests/29-02-migration-escape-hatch.test.js` | 6/6 PASS | PASS |
| OBS-02: assembled preview, redaction, copy current textarea, mailto body excludes log, empty state, zero network | `node tests/29-03-report.test.js` | 19/19 PASS | PASS |
| OBS-02: settings row, integrity-persist, feature-gate (no throw when CrashLog absent), wedged nav | `node tests/29-03-report-wiring.test.js` | 8/8 PASS | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| OBS-01 | 29-01 | Uncaught errors/unhandled rejections captured → IDB, zero network | SATISFIED | `crashlog.js` + 6 behavior tests PASS; CR-01 merge fix confirmed by 29-04 (3 PASS) |
| OBS-02 | 29-03 | Settings "Report a problem" → clipboard handoff, nothing transmitted | SATISFIED | `report.js` + `report.html` + settings row; 27 behavior tests PASS across 29-03 |
| OBS-03 | 29-02 | Failed migration → escape hatch, not endless refresh | SATISFIED | `showDBMigrationError()` + `getAllForRecoveryExport()` + 12 behavior tests PASS |

All three phase requirements are SATISFIED. No orphaned requirements detected.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `assets/crashlog.js` | 66 | Czech typo: `"Na tomto zařízení nic nesehlo špatně."` — "nesehlo" likely incorrect (IN-01, open from review) | Info | Empty-state copy only; no functional impact |
| `assets/shared-chrome.js` | 87–104 | `footer.innerHTML = '...'` with interpolated lang-derived hrefs (WR-04, open from review by design) | Warning | `lang` comes from a controlled localStorage allowlist; not a current injection vector but inconsistent with the project's `createElement + textContent` convention. Left open intentionally (out of scope for this phase per 29-REVIEW) |
| `assets/backup.js` | 74–86 | `_decryptBlob` length guard missing for truncated `.sgbackup` (WR-05, open from review by design) | Warning | Pre-Phase-29 file; `exportRecoveryBackup` reuses the path. Left open intentionally (out of scope per 29-REVIEW). Not goal-critical for OBS-03. |

No `TBD`, `FIXME`, or `XXX` markers found in Phase 29 files.

**WR-04 and WR-05 are retained open by design** — both were reviewed and explicitly deferred in 29-REVIEW as non-goal-critical. Neither blocks the three OBS success criteria. No override needed.

---

## Zero-Network Invariant Verification

The zero-network invariant is confirmed across all new Phase 29 code paths:

- `assets/crashlog.js`: `grep -n "fetch\|XMLHttpRequest\|WebSocket\|sendBeacon\|import(" assets/crashlog.js` → 0 matches
- `assets/report.js`: same grep → 0 matches
- `assets/db.js` (escape hatch paths): same grep (excluding comments) → 0 matches
- `assets/backup.js` (recovery export path): same grep → 0 matches
- `assets/shared-chrome.js` (integrity-persist path): same grep → 0 matches
- Runtime spy: 29-01 test case 6 + 29-02 test case 5 + 29-03 test case 6 all assert zero fetch/XHR calls at runtime.

The `mailto:` handoff in `openSupportEmail()` is user-initiated navigation (not an automatic network call by the app) and therefore does not violate the zero-network invariant.

---

## Human Verification Required

### 1. D-06: mailto reliability on installed PWA (on-device)

**Test:** Install Sessions Garden as a PWA on iOS or Android. Open Settings → "Report a problem" → tap "Open email to support."

**Expected:** The device's mail client opens with:
- Recipient: `contact@sessionsgarden.app`
- Subject: "Sessions Garden — problem report"
- Body: a short "paste below this line" template (NOT the full diagnostic log)

**Why human:** `mailto:` behavior inside an installed PWA is OS/browser-dependent and can silently fail to open the mail client on certain platforms. The code path is implemented and the degradation surface (`degradeToVisibleAddress()` → visible support address) is also implemented and tested. Only real-device verification can confirm which path applies on the target platform. Documented in `.planning/phases/29-reliability-observability/deferred-items.md`.

---

## Gaps Summary

No gaps. All three success criteria are verifiably achieved in the codebase. The one pending item (D-06 mailto reliability) is a field-verification that requires a real installed PWA — the code for both the happy path and the degraded fallback is present, substantive, and tested.

---

_Verified: 2026-06-23_
_Verifier: Claude (gsd-verifier)_
