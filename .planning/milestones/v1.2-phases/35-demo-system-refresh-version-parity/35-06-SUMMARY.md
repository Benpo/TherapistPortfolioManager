---
phase: 35-demo-system-refresh-version-parity
plan: 06
subsystem: demo-system
tags: [demo, exposure-reduction, backup, license, iframe-nav, i18n]
status: complete
requires:
  - 35-02 (DEMO-11 exposure gate definition)
  - 35-03 (single-sourced demo chrome)
  - 35-04 (demo seed refresh)
  - 35-05 (demo-hints removal)
requirements-completed:
  - DEMO-10
  - DEMO-11
provides:
  - DEMO-11 (backup/export/license controls hidden/disabled in demo mode)
  - DEMO-10 (full-demo real-browser regression PASS after all Phase 35 changes)
affects:
  - assets/app.js (mountBackupCloudButton + initDemoMode demo guards; initLicenseLink + redirectDemoBrandLink nav guards)
  - assets/license.js (demo guard disabling activate/deactivate)
  - assets/backup-modal.js (openExportFlow demo guard)
  - assets/shared-chrome.js (getNavigationContext + renderFooter + updateBackLinks demo-mode nav containment)
  - assets/i18n-{en,he,de,cs}.js (toast.exportDisabledDemo)
tech-stack:
  added: []
  patterns:
    - "window.name==='demo-mode' seam reused for UX-level exposure reduction layered on the demo_portfolio DB-name isolation (T-DBLEAK)"
    - "JS-observable hidden/disabled properties (not CSS display:none) so the jsdom exposure gate can assert control state"
    - "Demo iframe-escape containment: every in-app brand-link/home-href/footer-License entry point repointed to ./demo.html in demo mode"
key-files:
  created:
    - tests/35-demo-nav.test.js
  modified:
    - assets/app.js
    - assets/license.js
    - assets/backup-modal.js
    - assets/shared-chrome.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "Settings → Backups tab (schedule + OS folder picker) stays operable in the demo this phase BY DESIGN — Settings lock-down explicitly DEFERRED (D-09 refinement, T-SETTINGS-RESID accepted). DEMO-11's claim is home backup hidden + import blocked + modal export blocked + license disabled + demo nav self-contained, NOT 'no backup anywhere in demo'."
  - "Control-hiding is UX-level exposure reduction; the real data boundary remains the demo_portfolio DB-name split (unchanged)."
  - "The export toast is UI chrome copy (not seed clinical content), so the seed English-only rule does NOT apply — toast.exportDisabledDemo localized in all four languages."
metrics:
  duration: ~45min
  completed: 2026-06-30
  tasks: 3
  files: 9
---

# Phase 35 Plan 06: Demo Exposure Lock-down + DEMO-10 Regression Summary

Hid/disabled the **Backup cloud button, overview Export/Import, the programmatic backup Export flow, and license activate/deactivate** controls in demo mode (D-09 / DEMO-11) via the established `window.name==='demo-mode'` seam, then ran the full-demo **DEMO-10 regression in a real browser** (Ben approved). The regression surfaced three iframe-escape/nesting paths where in-demo navigation could break out to the real app chrome; all three were fixed inline and covered by a new `tests/35-demo-nav.test.js` (14 cases). Final suite: **118 passed / 0 failed**.

## What Was Built

### DEMO-11 lock-down (Tasks 1, 2, 2.5)

- **Task 1 — Backup cloud + Export/Import (commit 0b32b2e, assets/app.js, +28):** Early guard at the top of `mountBackupCloudButton()` so the `#backupCloudBtn` cloud entry point is never mounted in demo mode. A demo-mode hide pass (invoked from `initDemoMode`) sets JS-observable hidden/disabled state on the overview `#exportBtn` and the import control — every lookup null-guarded (these exist only on the overview/home page while `initDemoMode` runs on every demo page).
- **Task 2 — License activate/deactivate (commit 98d1275, assets/license.js, +15):** Demo-mode guard in license.js's DOMContentLoaded init that disables/hides `#license-activate-btn` + `#license-deactivate-btn` so a demo visitor cannot fire a real Lemon Squeezy activation/deactivation against the demo. Normal license flow untouched (license.html loads shared-chrome.js + license.js, not app.js — its own seam).
- **Task 2.5 — Backup Export flow (commit d8997a7, assets/backup-modal.js + 4 i18n dicts, +11):** Early demo guard in `openExportFlow` mirroring the existing `openImportFlow` guard — after the App/BM resolution and before `BM.exportEncryptedBackup()`, it shows `toast.exportDisabledDemo` and returns `Promise.resolve(null)`, closing the last in-demo export route. New `toast.exportDisabledDemo` key added to all four dicts (EN: "Export is not available in demo mode"; localized HE/DE/CS) — UI chrome copy, so all-language localization is correct here.

### DEMO-10 regression PASS + three iframe-escape deviation fixes (Task 3)

Task 3 was a `checkpoint:human-verify` (blocking-human). Ben ran the full Phase 35 demo (single-sourced chrome 35-03, refreshed Heart-Shield self-freshening seed 35-04, demo-hints removed 35-05, plus this plan's control lock-down) in a real browser and **approved ("looks good")** — iframe loads with no redirect, language sync works both ways (parent postMessage + in-demo globe), the version footer + live-demo banner + ≥1 "Session This Month" render, the Heart-Shield removed badge + active→removed arc show, reseed-on-home works, and the DEMO-11 controls are hidden/blocked inside the demo only.

During the regression three iframe-escape/nesting paths were found where in-demo navigation could break the demo containment, each fixed inline (all approved) and covered by new nav test cases:

- **Deviation 1 [Rule 1 — Bug] (commit 9be659b, assets/shared-chrome.js + assets/app.js, + new tests/35-demo-nav.test.js):** Closed demo iframe-escape nav paths — `getNavigationContext()` returns `homeHref → ./demo.html` in demo mode; `renderFooter()` omits the footer License link in demo; `app.js initLicenseLink()` early-returns in demo. New `tests/35-demo-nav.test.js` authored.
- **Deviation 2 [Rule 1 — Bug] (commit 26f66fd, assets/shared-chrome.js):** Covered the `.disclaimer-brand` logo — the disclaimer/About page logo carried a second brand class, so `updateBackLinks()`'s brand-link selector was widened to include `.disclaimer-brand`. Nav test cases added.
- **Deviation 3 [Rule 1 — Bug] (commit af33a9e, assets/app.js):** Redirected the in-app brand logo — new `redirectDemoBrandLink()` (called from `initDemoMode`) repoints every in-app `.brand-link` (static `./index.html`) to `./demo.html` in demo mode. Nav test cases added.

## Known Residual (deferred by design — NOT incomplete)

**Settings → Backups tab** (the gear → Backups tab: schedule + OS folder picker) **remains reachable and operable in the demo this phase BY DESIGN.** Settings lock-down is explicitly deferred to a future Settings exposure phase (D-09 refinement; threat register T-SETTINGS-RESID = accept). DEMO-11's claim is *home backup hidden + import blocked + modal export blocked + license controls disabled + demo nav self-contained* — NOT "backup fully removed from the demo." The real data boundary remains the `demo_portfolio` DB-name isolation (unchanged).

## Verification

- **tests/35-demo-exposure.test.js: 6 passed / 0 failed** (DEMO-11 exposure gate, flipped GREEN by this plan in both demo + normal halves).
- **tests/35-demo-nav.test.js: 14 passed / 0 failed** (new — DEMO-10 iframe-escape containment across home-href, footer License, disclaimer-brand logo, and in-app brand-link redirect; demo + normal no-op halves).
- **Full suite `node tests/run-all.js`: 118 passed / 0 failed.** No test weakened.
- **DEMO-10 blocking human-verify: APPROVED** by Ben in a real browser (manual, per 35-VALIDATION Manual-Only Verifications).

## Deviations from Plan

Three Rule 1 (bug) auto-fixes, all discovered during the DEMO-10 real-browser regression and all approved by Ben — they close iframe-escape paths that let in-demo navigation break out of the demo containment:

1. **[Rule 1 — Bug] Demo iframe-escape nav paths** — homeHref/footer-License/initLicenseLink leaked to the real app in demo mode. Fixed in shared-chrome.js (getNavigationContext, renderFooter) + app.js (initLicenseLink). New tests/35-demo-nav.test.js. Commit 9be659b.
2. **[Rule 1 — Bug] Uncovered .disclaimer-brand logo** — the disclaimer/About logo's second brand class slipped the updateBackLinks() selector. Fixed in shared-chrome.js. Commit 26f66fd.
3. **[Rule 1 — Bug] In-app brand logo escape** — static `.brand-link` → ./index.html broke out of the iframe. Fixed via new redirectDemoBrandLink() in app.js. Commit af33a9e.

## Threat Surface

No new security-relevant surface introduced. Threat register dispositions met: **T-DBLEAK** (mitigate) — backup cloud + overview Export/Import hidden AND `openExportFlow` guarded, closing the last demo export route; **T-LICENSE** (mitigate) — activate/deactivate disabled in demo; **T-SETTINGS-RESID** (accept) — Settings→Backups documented residual, deferred; **T-IFRAME / T-35-SC** (accept) — sandbox unchanged, zero new packages. The three deviation fixes strengthen demo containment (no new external surface).

## Self-Check: PASSED

- Commit 0b32b2e (app.js DEMO-11) — FOUND
- Commit 98d1275 (license.js DEMO-11) — FOUND
- Commit d8997a7 (backup-modal.js + i18n DEMO-11) — FOUND
- Commit 9be659b (nav fix 1 + tests/35-demo-nav.test.js) — FOUND
- Commit 26f66fd (nav fix 2 .disclaimer-brand) — FOUND
- Commit af33a9e (nav fix 3 redirectDemoBrandLink) — FOUND
- tests/35-demo-nav.test.js — PRESENT (14 passed)
- tests/35-demo-exposure.test.js — 6 passed
- Full suite — 118 passed / 0 failed
