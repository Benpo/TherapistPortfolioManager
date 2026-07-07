---
phase: 29-reliability-observability
plan: 03
subsystem: observability
tags: [report-a-problem, crash-log, clipboard, mailto, redaction, zero-network, pwa, i18n, integrity-seam]

# Dependency graph
requires:
  - phase: 29-reliability-observability
    plan: 01
    provides: "CrashLog.getEntries/clear/logError seam + crashlogBuffer mirror (OBS-01)"
  - phase: 29-reliability-observability
    plan: 02
    provides: "PortfolioDB._showDBMigrationError OBS-03 escape hatch"
  - phase: 28-update-reliability-versioning
    provides: "version.js buildNudge wedged-state stubs + integrity self-check (28-CONTEXT D-12)"
provides:
  - "assets/report.js — OBS-02 report controller: assembleReport + redactReport (D-04 floor) + editable preview + copyReport (current textarea value) + openSupportEmail (short mailto handoff) + degradeToVisibleAddress (D-06)"
  - "report.html — dedicated 'Report a problem' screen reusing app chrome, SW-precached"
  - "Settings 'Report a problem' entry row (SettingsPage.buildReportRow) + optional crash-log clear"
  - "shared-chrome.js integrity-mismatch persistence into the OBS-01 log (CrashLog.logError, source:'integrity', feature-gated)"
  - "version.js wedged-state stubs wired: report -> report.html, recover -> OBS-03 hatch"
  - "4-language report-screen + Settings i18n keys (EN/HE/DE/CS)"
affects: [phase-31 settings.js extraction (report row kept self-contained), support-email handoff]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Redact-then-editable-preview: best-effort automated scrub (floor) + a user-editable textarea as the FINAL privacy gate (D-04 belt-and-suspenders)"
    - "Copy-the-current-textarea-value (not a stale assembled string) so user edits to remove PII are honored"
    - "Short mailto body + full-log-via-Copy split (URL-length + leakage mitigation, D-06/T-29-11)"
    - "Feature-gated cross-module seam: CrashLog.logError persistence guarded by window.CrashLog presence so legal/landing pages (no crashlog.js) never throw"

key-files:
  created:
    - assets/report.js
    - report.html
    - tests/29-03-report.test.js
    - tests/29-03-report-wiring.test.js
    - .planning/phases/29-reliability-observability/deferred-items.md
  modified:
    - settings.html
    - assets/settings.js
    - assets/shared-chrome.js
    - assets/version.js
    - assets/app.css
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
    - sw.js

decisions:
  - "Test framework: reused the project's zero-npm vm-sandbox + handwritten DOM stub (per 29-01) instead of the plan's suggested jsdom — the repo has no package.json and a hard zero-dependency constraint"
  - "Settings entry built as a self-contained SettingsPage.buildReportRow() mounted into an isolated #settingsReportSection container, NOT injected into the section-rename form — keeps it Phase-31-extraction-safe and avoids polluting the rename schema"
  - "Wedged recover stub routes to the EXISTING OBS-03 hatch (PortfolioDB._showDBMigrationError) with a runGenuineRecovery fallback — no second reset path built (per important_context)"
  - "Redaction inter-word separator restricted to space/tab (never newline) so the name heuristic can't span structurally-separate report lines"
  - "mailto shipped live with a built-in degradation hook (degradeToVisibleAddress); on-device PWA field-verification deferred to a human-check (D-06)"

# Metrics
duration: ~40min
completed: 2026-06-23
tasks: 2
files_changed: 15
status: complete
---

# Phase 29 Plan 03: Report a Problem (OBS-02) Summary

**A dedicated, zero-network "Report a problem" screen that assembles the persisted OBS-01 crash log plus basic diagnostic context, best-effort redacts client-identifying tokens, renders a user-EDITABLE preview (the final privacy gate), then offers Copy report (full log → clipboard) and Open email to support (short mailto handoff) — and wires Phase 28's integrity mismatch into the crash log so the wedged-state escalation lands on real recover/report surfaces.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-06-23
- **Tasks:** 2 (both TDD: RED → GREEN)
- **Files changed:** 15 (5 created, 10 modified); +1432 / −10 lines

## Accomplishments

- **`assets/report.js` (OBS-02 controller):** `assembleReport()` reads `CrashLog.getEntries()` (Plan 01) and builds a multi-line text report = diagnostic header (app version, DB version, UI language, userAgent, logged-problem count) + the crash entries. `redactReport()` is a best-effort floor (emails, long digit runs, capitalised multi-word name tokens with a non-PII allowlist). The redacted text renders into an EDITABLE `<textarea>` so the user's own eyes are the final gate (D-04). `copyReport()` copies the CURRENT textarea value (honoring user edits). `openSupportEmail()` opens a SHORT `mailto:` to `contact@sessionsgarden.app` — body is a "paste below this line" template, never the full log (D-06/T-29-11). Empty log → the "No problems logged" empty state. Zero network throughout (grep + runtime spy).
- **`report.html`:** dedicated screen cloning the settings.html chrome (inline crash buffer + terms/license/theme gates, tokens.css/app.css, header, confirmModal, toast) and the full script-order tail (i18n → i18n.js → db.js → version.js → crashlog.js → shared-chrome.js → app.js → report.js). SW-registered like its siblings.
- **Settings entry row:** `SettingsPage.buildReportRow()` builds an isolated `.settings-row` ("Report a problem" → `./report.html`) plus an optional crash-log "clear" (ghost button + neutral-tone `App.confirmDialog` → `CrashLog.clear()`), mounted into `#settingsReportSection` and re-mounted on language change. Built with `createElement` + `textContent` only (security contract). Exported for testability + the Phase 31 extraction seam.
- **Phase 28 → 29 integrity seam:** `shared-chrome.js maybeUpgradeFooterAndNudge` now persists a non-clean integrity `state` into the OBS-01 log via `CrashLog.logError({ source:'integrity', message:'version integrity mismatch: '+state, ... })` — feature-gated on `window.CrashLog` and fully guarded so legal/landing pages (no crashlog.js) never throw. The function is now exported.
- **version.js wedged-state stubs wired:** the report stub navigates to `report.html`; the recover stub surfaces the EXISTING OBS-03 escape hatch (`PortfolioDB._showDBMigrationError`) with a `runGenuineRecovery()` fallback — the wedged user lands on a real recover surface, not a cosmetic reload.
- **i18n:** report-screen + Settings copy added to all four `i18n-*.js` (EN/HE/DE/CS), RTL-safe, Hebrew gender-neutral.
- **sw.js:** precached `/assets/report.js` + `/report` so the new screen works offline in the installed PWA (Rule 2).

## Task Commits

1. **Task 1 (RED):** failing behavior test for the OBS-02 controller — `f434bc2` (test)
2. **Task 1 (GREEN):** report.js + report.html + 4-lang i18n + sw precache — `cad5cf0` (feat)
3. **Task 2 (RED):** failing test for Settings row + integrity-persist + wedged-nav — `81400bb` (test)
4. **Task 2 (GREEN):** settings.js row + shared-chrome persist + version.js wiring + CSS — `27fdf55` (feat)

_Both tasks were TDD (RED then GREEN)._

## Behavior Test Coverage

- `tests/29-03-report.test.js` (6 cases): assembled preview contains diagnostic header + entries; redaction scrubs a seeded client name; Copy copies the CURRENT (edited) textarea value, not a stale string; mailto body excludes the full log; empty log → empty-state heading, no error textarea; zero fetch/XHR.
- `tests/29-03-report-wiring.test.js` (8 assertions): buildReportRow label + report.html affordance; integrity mismatch persisted exactly once with `source:'integrity'`; feature-gated (no throw when CrashLog absent); wedged report button navigates to report.html.
- Regression: `28-04-nudge-honesty`, `29-01-crashlog-capture`, `29-02-migration-escape-hatch`, `29-02-recovery-export`, `sw-precache-cache-reload` all still pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test framework (jsdom → vm-sandbox + DOM stub)**
- **Found during:** Task 1 (RED authoring)
- **Issue:** The plan's `<automated>` specified jsdom; the repo is zero-npm with no package.json — jsdom is not installable and would violate the hard constraint.
- **Fix:** Used the project's established vm-sandbox + handwritten DOM/CrashLog/clipboard stubs (per 29-01). All required behavior assertions preserved.
- **Files:** tests/29-03-report.test.js, tests/29-03-report-wiring.test.js
- **Commits:** f434bc2, 81400bb

**2. [Rule 2 - Missing Critical] Precache report.js + /report in sw.js**
- **Found during:** Task 1
- **Issue:** report.html + report.js were not in the SW precache lists — an offline installed PWA would 404 on the new screen, defeating the report flow exactly when a user is trying to report a problem.
- **Fix:** Added `/assets/report.js` to PRECACHE_URLS and `/report` to PRECACHE_HTML.
- **Files:** sw.js
- **Commit:** cad5cf0

**3. [Rule 1 - Bug] Redaction spanned report lines**
- **Found during:** Task 1 (GREEN, case 1 failed)
- **Issue:** The capitalised-name heuristic used `\s+` between words, so `...marker ZZZ` + a following `Stack:` line was read as one two-word name and redacted, swallowing a legitimate entry marker.
- **Fix:** Restricted the inter-word separator to `[ \t]+` (never a newline).
- **Files:** assets/report.js
- **Commit:** cad5cf0

**4. [Rule 3 - Blocking] Export internal seam for testability**
- **Found during:** Task 2
- **Issue:** `maybeUpgradeFooterAndNudge` (shared-chrome.js) was internal; the integrity-persist behavior could not be falsifiably tested without exposing it.
- **Fix:** Added it to the `SharedChrome` exports. No behavior change to its callers (`renderFooter` still calls the same internal function).
- **Files:** assets/shared-chrome.js
- **Commit:** 27fdf55

**Total deviations:** 4 auto-fixed (2 blocking, 1 missing-critical, 1 bug). No scope creep — all within the plan's must_haves.

## Threat Surface

All four `mitigate` dispositions in the plan's `<threat_model>` are honored and tested:
- **T-29-09 (PII to clipboard/email):** redaction floor + editable preview; Copy copies the current textarea value — user PII edits honored (behavior test).
- **T-29-10 (zero-network):** no fetch/XHR/import in report.js (grep + runtime spy assert zero calls).
- **T-29-11 (full log in mailto URL):** mailto body is the short paste-below template only; behavior test asserts the long entry text is absent from the mailto body.
- **T-29-12 (support address):** hardcoded `contact@sessionsgarden.app` constant, no user input (accepted, low risk).

No new security surface beyond the threat model.

## Known Stubs

None in this plan's code. The D-06 mailto path is fully implemented with a built-in degradation hook (`degradeToVisibleAddress`); the on-device PWA field-verification is a deferred human-check (see below), not a code stub.

## Deferred / Manual-Verification Items

- **D-06 mailto on-device field-verification (human-check):** `mailto:` reliability inside an installed PWA must be confirmed on a real device. The degradation surface (visible support address + `degradeToVisibleAddress()`) is already shipped and tested. See `.planning/phases/29-reliability-observability/deferred-items.md`. Status: OPEN.

## Self-Check: PASSED

- Created files exist: assets/report.js, report.html, tests/29-03-report.test.js, tests/29-03-report-wiring.test.js, deferred-items.md — all FOUND.
- Commits exist: f434bc2, cad5cf0, 81400bb, 27fdf55 — all FOUND.
- All behavior + regression tests green.

---
*Phase: 29-reliability-observability*
*Completed: 2026-06-23*
