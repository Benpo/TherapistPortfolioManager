---
phase: 35-demo-system-refresh-version-parity
plan: 03
subsystem: demo-home-chrome
tags: [demo, chrome-convergence, single-source, version-parity, terminology]
requires:
  - "35-01 (Wave-0 RED chrome + static gates)"
provides:
  - "demo.html chrome single-sourced from app.js initCommon + shared-chrome.js (D-01)"
  - "on-screen app version footer on the demo home (DEMO-04 parity signal)"
  - "single injected globe language picker; dead native select removed (DEMO-02)"
affects:
  - "demo.html"
tech-stack:
  added: []
  patterns:
    - "Inject-from-single-source chrome host: empty <div class=header-actions id=headerActions> + shared-chrome.js before app.js, mirroring index.html"
key-files:
  created: []
  modified:
    - "demo.html"
decisions:
  - "D-01: minimal-blast-radius single-sourcing (kept demo.html as entry, overview body untouched) — declined D-02 iframe collapse"
  - "D-07/DEMO-08: brand-subtitle fallback literal swept therapeutic -> energy to match i18n app.subtitle"
metrics:
  duration: "12min"
  completed: 2026-06-30
status: complete
---

# Phase 35 Plan 03: Demo Home Chrome Convergence + Terminology Sweep Summary

Converged `demo.html` onto the single-sourced chrome (D-01) so its header/nav/language-picker/footer are injected by `app.js initCommon` + `shared-chrome.js renderFooter` exactly as `index.html` does — flipping the Wave-0 RED `tests/35-demo-chrome.test.js` GREEN — and swept the stale "therapeutic" subtitle literal to current energy-work terminology (D-07).

## What Was Built

**Task 1 — Single-source the demo home chrome + version footer (commit 68f21a7)**
- Replaced the hand-rolled `.header-actions` container (which held the dead native `<select id="languageSelect">` and a static globe SVG) with a single empty `<div class="header-actions" id="headerActions"></div>`, mirroring `index.html`'s convergence target.
- Added `<script src="./assets/shared-chrome.js"></script>` immediately before `app.js` in the demo script block (version.js already loads first, so `APP_VERSION` resolves). Existing demo scripts (db.js, demo-seed.js, app.js, overview.js, demo.js) and the demo-mode inline gate were left untouched.
- Result: `App.initCommon()` now injects the converged globe popover + theme/cloud/gear controls into `#headerActions`, and `renderFooter` appends the `.app-footer` carrying `v{APP_VERSION}`.

**Task 2 — Terminology sweep (commit 4d783f7)**
- Updated the brand-subtitle hardcoded fallback from "Documentation and tracking of therapeutic sessions" to "...energy sessions", matching the i18n `app.subtitle` value. The `data-i18n="app.subtitle"` hook was preserved (self-corrects at runtime). No remaining "therapeutic" literal anywhere in demo.html.

## Verification Results

- `tests/35-demo-chrome.test.js`: **5 passed, 0 failed** (was RED at Wave 0) — completion sentinel `.app-footer` present, `#headerActions` populated, exactly one `.lang-globe-btn` and zero `select#languageSelect`, footer carries `v{APP_VERSION}`, `.demo-banner` preserved.
- `tests/35-demo-static.test.js`: DEMO-01 (×2), DEMO-02, DEMO-08 (×6 incl. i18n regression guards) all GREEN. The two remaining DEMO-09 failures (demo-hints) are explicitly owned by plan 35-05 and out of scope here.
- `tests/run-all.js`: **114 passed, 3 failed**. The 3 failures are the still-pending RED gates owned by sibling plans:
  - `35-demo-seed.test.js` → 35-04
  - `35-demo-exposure.test.js` → 35-06
  - `35-demo-static.test.js` (DEMO-09 demo-hints only) → 35-05
- No regressions in the pre-existing suite (the prior 113-passing baseline rose to 114 as the chrome gate flipped GREEN).

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes, no authentication gates, no checkpoints.

## Requirements Completed

DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-08 (marked complete in REQUIREMENTS.md).

## Self-Check: PASSED

- demo.html exists and modified — FOUND
- Commit 68f21a7 (Task 1) — FOUND
- Commit 4d783f7 (Task 2) — FOUND
