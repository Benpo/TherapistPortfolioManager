---
phase: 35-demo-system-refresh-version-parity
verified: 2026-06-30T14:00:00Z
status: passed
score: 11/11 must-haves verified
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "DEMO-07: client-type variety is kept and an other-type client/session is added (D-04)"
    reason: "Ben explicitly removed the other-type demo client (Maple House) at the D-05 blocking-human sign-off gate (commit be27c2f). Brand decision: 'no other is needed, otherwise fine'. The schema gate validates sessionType enum membership, not instance presence — the test stays GREEN. D-04 is superseded by D-05."
    accepted_by: "Ben (product)"
    accepted_at: "2026-06-30"
gaps: []
deferred: []
behavior_unverified_items: []
human_verification: []
---

# Phase 35: Demo System Refresh / Version Parity — Verification Report

**Phase Goal:** The demo experience mirrors the current shipped app — its seed data, hints, and screens reflect the present schema, feature set, and version — so a prospective buyer sees the real product rather than a stale snapshot.
**Verified:** 2026-06-30
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth (maps to Req.) | Status | Evidence |
|----|----------------------|--------|----------|
| 1  | Demo home chrome is single-sourced from shared-chrome.js + app.js; `#headerActions` injection target present; no dead native picker (DEMO-01/02) | VERIFIED | `demo.html` L55: `<div class="header-actions" id="headerActions">`. L177: `<script src="./assets/shared-chrome.js">`. No `id="languageSelect"` anywhere. 35-demo-chrome (5/5) + 35-demo-static DEMO-01/02 assertions all PASS. |
| 2  | "Live demo" banner preserved and language-synced (DEMO-03) | VERIFIED | `demo.html` L31-33: static `.demo-banner` block present. initDemoMode reinjects at runtime. Chrome test PASS: `.demo-banner` with non-empty `.demo-banner-text` confirmed. |
| 3  | App version footer renders on demo home from version.js (DEMO-04) | VERIFIED | `shared-chrome.js renderFooter` reads `APP_VERSION` from `version.js` (already loaded first). Chrome test PASS: `.app-footer-copy` contains `v` + `AppVersion.APP_VERSION`. |
| 4  | Seed showcases Heart Shield removal arc: ≥2 isHeartShield sessions on one client, final shieldRemoved:true; .heart-badge-removed renders (DEMO-05) | VERIFIED | Anita C (id 29) owns a 3-session arc: shieldRemoved false→false→true. Seed test PASS: `renderClientRows` emits `.heart-badge.heart-badge-removed`. JSON confirmed: isHeartShield on lines 275/297/319, shieldRemoved false/false/true. |
| 5  | Seed dates are relative (daysAgo offsets, newest=0); seam exposed before early-return; ≥1 session in current month guaranteed (DEMO-06) | VERIFIED | All 11 sessions have integer `daysAgo` (0–84); zero absolute `date` fields. `demo-seed.js` L41: `window.__demoSeedHelpers = { isoDaysAgo, applyRelativeDates }` exposed before `window.name !== 'demo-mode'` early-return. Seed test PASS (both month-edge fixtures). |
| 6  | Every seed session conforms to db.js v6 schema; no legacy fields (DEMO-07, with D-04 override) | VERIFIED + OVERRIDE | 7 clients / 11 sessions; types: adult/child/animal (no `other` — D-04 waived per D-05 sign-off); session types: online/clinic. Seed test PASS: key union, sessionType enum, issues[] shape, no legacy keys, has daysAgo. D-04 `other`-type absence is an approved override — see frontmatter. |
| 7  | Demo subtitle uses "energy" terminology; no "therapeutic" literal anywhere in demo.html (DEMO-08) | VERIFIED | `demo.html` L51: "Documentation and tracking of energy sessions". `grep "therapeutic" demo.html` returns nothing. Static test PASS. |
| 8  | assets/demo-hints.js deleted; zero `demo-hints` references across assets/ + sw.js + root *.html (DEMO-09) | VERIFIED | File absent (filesystem confirmed). `grep -n "demo-hints" assets/app.js sw.js *.html` returns nothing. Static test DEMO-09 assertions (2/2) PASS. |
| 9  | Landing iframe demo entry point keeps working; iframe-escape nav paths closed (DEMO-10) | VERIFIED | Human-approved by Ben in real browser (35-06 DEMO-10 checkpoint). Three iframe-escape bugs found and fixed inline (commits 9be659b / 26f66fd / af33a9e). Nav test `tests/35-demo-nav.test.js`: 14/14 PASS covering homeHref, footer License link omission, disclaimer-brand logo, legal topbar logo, in-app brand-link redirect — all demo-scoped with normal-mode no-regression halves. |
| 10 | In demo mode: Backup cloud button absent, Export/Import hidden, openExportFlow blocked with toast, license activate/deactivate disabled — all controls present in real app (DEMO-11) | VERIFIED | `mountBackupCloudButton()` early-returns on `window.name === 'demo-mode'` (app.js L476). `hideDemoExposedControls()` sets `exportBtn.hidden=true`, `importLabel.hidden=true`, `importInput.disabled=true` (app.js L315-320). `openExportFlow` guard: after App/BM resolution, demo-mode returns early + `toast.exportDisabledDemo` shown (backup-modal.js L244). license.js L430-436: both license buttons disabled/hidden in demo. Exposure test `tests/35-demo-exposure.test.js`: 6/6 PASS (3 demo halves + 3 normal-mode no-regression halves). |
| 11 | `toast.exportDisabledDemo` key resolves in all four i18n dicts (support for DEMO-11 export guard) | VERIFIED | Confirmed in i18n-en.js L214, i18n-he.js L214, i18n-de.js L214, i18n-cs.js L214 — localized in all four languages as UI chrome copy. |

**Score:** 11/11 truths verified (1 override applied: DEMO-07 D-04 other-type removed by human sign-off)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `demo.html` | Chrome single-sourced; no native picker; energy subtitle | VERIFIED | Empty `#headerActions`, `shared-chrome.js` before `app.js`, no `languageSelect`, subtitle "energy sessions" |
| `assets/demo-seed-data.json` | Heart Shield arc, daysAgo offsets, schema-clean, no other-type (per D-05 override) | VERIFIED | 7 clients / 11 sessions; Anita C 3-session arc; all daysAgo; no absolute date; no other-type client |
| `assets/demo-seed.js` | isoDaysAgo + applyRelativeDates seam before early-return; seedData applies transform | VERIFIED | `window.__demoSeedHelpers` at L41 before L43 early-return guard; `seedData()` calls `applyRelativeDates` at L66 |
| `assets/demo-hints.js` | Deleted | VERIFIED | File absent; no references in assets/, sw.js, or *.html |
| `assets/app.js` | demo-hints injection removed; demo-mode guards for backup/export/import; nav redirect | VERIFIED | L476: cloud guard; L315-320: export/import hide; L332: redirectDemoBrandLink; L344: initLicenseLink |
| `assets/license.js` | activate/deactivate disabled/hidden in demo mode | VERIFIED | L430-436: demo guard disables both buttons |
| `assets/backup-modal.js` | openExportFlow blocked in demo with toast | VERIFIED | L244: demo guard with `toast.exportDisabledDemo` + early-return before export primitives |
| `assets/shared-chrome.js` | Nav containment: homeHref→./demo.html; footer omits License link in demo | VERIFIED | L34-37: getNavigationContext demo branch; L96-99: renderFooter omits License link in demo |
| `assets/i18n-{en,he,de,cs}.js` | `toast.exportDisabledDemo` in all four | VERIFIED | All four dicts L214 confirmed |
| `sw.js` | `/assets/demo-hints.js` precache entry removed | VERIFIED | No demo-hints token in PRECACHE_URLS; `/demo` entry untouched |
| `tests/35-demo-chrome.test.js` | Behavioral gate: real initCommon on demo.html | VERIFIED | 5/5 PASS |
| `tests/35-demo-static.test.js` | Source/grep gate for convergence markers | VERIFIED | 11/11 PASS |
| `tests/35-demo-seed.test.js` | Seed gate: arc, dates, schema | VERIFIED | 3/3 PASS |
| `tests/35-demo-exposure.test.js` | Demo lock-down gate (demo + normal halves) | VERIFIED | 6/6 PASS |
| `tests/35-demo-nav.test.js` | Nav containment gate (14 cases, demo + normal) | VERIFIED | 14/14 PASS |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `demo.html` | `shared-chrome.js` | `<script src="./assets/shared-chrome.js">` before app.js | WIRED | Confirmed at demo.html L177 |
| `shared-chrome.js renderFooter` | `version.js APP_VERSION` | `window.AppVersion.APP_VERSION` read at render time | WIRED | shared-chrome.js L37 reads `AppVersion.APP_VERSION`; version.js loads first (L165) |
| `app.js initDemoMode` | `hideDemoExposedControls` | Direct call at L301 | WIRED | `initDemoMode()` calls `hideDemoExposedControls()` unconditionally |
| `app.js mountBackupCloudButton` | Demo guard | early-return at L476 | WIRED | Guard fires before any DOM mutation |
| `assets/backup-modal.js openExportFlow` | Demo guard | after BM resolution, before export primitive at L244 | WIRED | Guard placement confirmed; normal export path untouched |
| `assets/license.js DOMContentLoaded` | Demo disable guard | L430-436 | WIRED | Runs during license.html init; disable applied after elements resolved |
| `demo-seed.js` | `window.__demoSeedHelpers` seam | exposed at L41 before demo-mode early-return L43 | WIRED | Seam reachable in any context; test exercises it without triggering DB seed |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite green post-implementation | `node tests/run-all.js` | 118 passed / 0 failed | PASS |
| Chrome gate: real initCommon on demo.html | `node tests/35-demo-chrome.test.js` | 5/5 PASS | PASS |
| Static gate: convergence markers + demo-hints absence | `node tests/35-demo-static.test.js` | 11/11 PASS | PASS |
| Seed gate: Heart Shield arc + dates + schema | `node tests/35-demo-seed.test.js` | 3/3 PASS | PASS |
| Exposure gate: demo lock-down all entry points | `node tests/35-demo-exposure.test.js` | 6/6 PASS | PASS |
| Nav containment gate: iframe-escape paths | `node tests/35-demo-nav.test.js` | 14/14 PASS | PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| DEMO-01 | 35-01, 35-03 | Chrome single-sourced via initCommon + shared-chrome.js | SATISFIED | #headerActions + shared-chrome.js in demo.html; chrome + static tests PASS |
| DEMO-02 | 35-01, 35-03 | Dead native `<select id="languageSelect">` removed | SATISFIED | No languageSelect in demo.html; static test + chrome test PASS |
| DEMO-03 | 35-01, 35-03 | "Live demo" banner preserved and language-synced | SATISFIED | .demo-banner in demo.html; chrome test PASS |
| DEMO-04 | 35-01, 35-03 | Version footer renders on demo home from version.js | SATISFIED | shared-chrome.js renderFooter; chrome test PASS |
| DEMO-05 | 35-02, 35-04 | Heart Shield removal arc visible on dashboard | SATISFIED | Anita C 3-session arc; seed test PASS |
| DEMO-06 | 35-02, 35-04 | Relative dates; ≥1 session always in current month | SATISFIED | daysAgo offsets; __demoSeedHelpers seam; seed test PASS |
| DEMO-07 | 35-02, 35-04 | Schema conformance (D-04 other-type waived per D-05) | SATISFIED (override) | Schema test PASS; D-04 overridden by Ben's D-05 sign-off |
| DEMO-08 | 35-01, 35-03 | No "therapeutic" literal; current terminology | SATISFIED | "energy sessions" in demo.html; static test PASS |
| DEMO-09 | 35-01, 35-05 | demo-hints.js deleted; zero live references | SATISFIED | File absent; no references in assets/sw.js/*.html; static test PASS |
| DEMO-10 | 35-06 | Landing iframe entry point works end-to-end | SATISFIED | Human-approved by Ben; nav test 14/14 PASS |
| DEMO-11 | 35-02, 35-06 | Backup/export/license controls hidden in demo; present in real app | SATISFIED | app.js/license.js/backup-modal.js guards; exposure test 6/6 PASS |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `ROADMAP.md` | 292 | "5/6 plans executed" — stale count; all 6 plans are checked `[x]` and the traceability table correctly shows 6/6 | Info | Documentation only; no implementation gap |

No TBD/FIXME/XXX debt markers found in any phase-modified production file. No vacuous-green `process.exit(0)` patterns in test files. No stub returns or placeholder implementations found.

### Deferred / Accepted Residuals (NOT gaps)

**Settings lock-down (DEMO-11 deferred scope):** Settings → Backups tab (gear → schedule + OS folder picker) remains reachable and operable in demo this phase BY DESIGN. Explicitly deferred to a future Settings exposure phase (D-09 refinement; T-SETTINGS-RESID accepted). The real data boundary is the `demo_portfolio` DB-name isolation (unchanged). This is a documented accepted residual, not a gap.

---

## Summary

All four ROADMAP success criteria are met:

1. **Seed conformance with Heart Shield arc and self-freshening dates (DEMO-05/06/07)** — VERIFIED. Anita C's 3-session arc renders `.heart-badge-removed` via real `renderClientRows`. All 11 sessions carry `daysAgo` (newest = 0); no absolute dates. `window.__demoSeedHelpers` exposed before demo gate. D-04's `other`-type requirement waived by Ben at D-05 sign-off (be27c2f).

2. **Demo home chrome single-sourced, dead picker gone, version footer renders (DEMO-01/02/03/04)** — VERIFIED. demo.html now has empty `#headerActions` fed by `app.js initCommon`, `shared-chrome.js` loads before `app.js`, no `languageSelect` native picker, footer carries `v{APP_VERSION}`.

3. **demo-hints.js removed cleanly; backup/export/license hidden in demo (DEMO-08/09/11)** — VERIFIED. File deleted; all three live references removed (app.js injection + sw.js precache + no HTML reference). Exposure lock-down: cloud button not mounted, export/import hidden, openExportFlow guarded with `toast.exportDisabledDemo`, license buttons disabled — all strictly demo-scoped with normal-mode no-regression halves confirmed.

4. **Landing iframe entry point works end-to-end (DEMO-10)** — VERIFIED. Ben approved in real browser. Three iframe-escape paths found and fixed (homeHref, disclaimer-brand logo, in-app brand-link). Nav test 14/14 PASS covering all containment scenarios with normal-mode regression guards.

Full suite: **118 passed / 0 failed**. No regressions introduced. Phase goal achieved.

---

_Verified: 2026-06-30_
_Verifier: Claude (gsd-verifier)_
