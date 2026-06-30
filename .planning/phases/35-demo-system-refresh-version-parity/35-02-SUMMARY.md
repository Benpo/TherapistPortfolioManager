---
phase: 35-demo-system-refresh-version-parity
plan: 02
subsystem: testing
tags: [jsdom, demo-mode, red-gate, tdd, seed-data, backup, license, exposure]

# Dependency graph
requires:
  - phase: 35-01
    provides: "demo.html chrome-boot jsdom harness pattern (35-demo-chrome.test.js) — eval order + demo-mode gating + .app-footer completion sentinel"
  - phase: 31
    provides: "overview.js renderClientRows + the .some() client-badge semantics mirrored by the DEMO-05 render assertion"
provides:
  - "tests/35-demo-seed.test.js — RED gate for DEMO-05/06/07 (Heart-Shield arc render, relative-date month-edge, v6 schema)"
  - "tests/35-demo-exposure.test.js — RED gate for DEMO-11/D-09 (backup-cloud/export/import/license hidden-in-demo + present-in-normal, plus the openExportFlow programmatic entry)"
  - "The __demoSeedHelpers.applyRelativeDates(sessions, now) seam contract the 35-04 seed must satisfy"
  - "The demo-vs-normal control contract the 35-06 guards must satisfy"
affects: [35-04, 35-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RED scaffold authored against the live seed JSON on disk + the REAL render/flow paths (no hand-built fixtures), asserting the desired post-implementation end state"
    - "Demo-vs-normal asymmetry: every demo lock-down control is checked in BOTH modes so the gate is falsifiable (no blanket-fail masquerade) and the normal half is a no-regression guard"

key-files:
  created:
    - tests/35-demo-seed.test.js
    - tests/35-demo-exposure.test.js
  modified: []

key-decisions:
  - "Home/normal no-regression target is #backupCloudBtn presence (index.html has no inline #exportBtn; its export lives in the is-hidden-by-default backup modal, so modal-export visibility is a false target)"
  - "License/normal asserts only the activate button (the deactivate button sits in the hidden-by-default #license-activated-view, so its hidden state is not a demo-specific signal)"
  - "Eval shared-chrome.js directly in the home-env builders so the .app-footer completion sentinel renders at Wave 0, even though demo.html does not load it until 35-03"

patterns-established:
  - "Pattern: a Wave-0 RED gate must fail for the FEATURE-ABSENT reason, verified by reading the error line — DEMO-05 fails on 'no arc client', DEMO-06/07 on 'no daysAgo', exposure demo halves on 'control still present / primitive reached'"
  - "Pattern: isHiddenOrDisabled() walks ancestors for hidden attr / .is-hidden / inline display:none (jsdom has no CSS cascade) plus .disabled, with absent === hidden"

requirements-completed: [DEMO-05, DEMO-06, DEMO-07, DEMO-11]

coverage:
  - id: D1
    description: "RED gate: the demo seed tells a Heart-Shield removal arc and renders a removed badge via the REAL overview.js renderClientRows"
    requirement: "DEMO-05"
    verification:
      - kind: unit
        ref: "tests/35-demo-seed.test.js#DEMO-05"
        status: fail
    human_judgment: false
    rationale: "RED-by-design at this wave: status fail is the EXPECTED Wave-0 state; 35-04 turns it pass. Routed to human only until then."
  - id: D2
    description: "RED gate: every seed session carries an integer daysAgo and the __demoSeedHelpers seam keeps >=1 session in-month at both month edges"
    requirement: "DEMO-06"
    verification:
      - kind: unit
        ref: "tests/35-demo-seed.test.js#DEMO-06"
        status: fail
    human_judgment: false
    rationale: "RED-by-design at this wave; 35-04 (seed + seam) turns it pass."
  - id: D3
    description: "RED gate: every seed session conforms to the db.js v6 schema (key union, sessionType enum, issues[] shape, no legacy fields, has daysAgo)"
    requirement: "DEMO-07"
    verification:
      - kind: unit
        ref: "tests/35-demo-seed.test.js#DEMO-07"
        status: fail
    human_judgment: false
    rationale: "RED-by-design at this wave; 35-04 seed refresh turns it pass."
  - id: D4
    description: "RED gate: demo lock-down hides/disables backup-cloud, export/import, license activate/deactivate, AND blocks the programmatic openExportFlow — with normal-mode no-regression halves"
    requirement: "DEMO-11"
    verification:
      - kind: unit
        ref: "tests/35-demo-exposure.test.js#DEMO-11 (3 demo halves fail / 3 normal halves pass)"
        status: fail
    human_judgment: false
    rationale: "RED-by-design at this wave: demo halves fail, normal halves pass (falsifiable asymmetry); 35-06 guards turn the demo halves pass."

# Metrics
duration: 30min
completed: 2026-06-30
status: complete
---

# Phase 35 Plan 02: Demo Seed + Exposure RED Gates Summary

**Two Wave-0 RED test scaffolds — a seed gate (Heart-Shield arc render, self-freshening relative dates with a month-edge seam, v6 schema conformance) and an exposure gate (every demo lock-down entry point hidden-in-demo / present-in-normal, including the programmatic openExportFlow) — both failing for the feature-absent reason today.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-06-30T12:27:00Z
- **Completed:** 2026-06-30T12:57:00Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- `tests/35-demo-seed.test.js` pins DEMO-05/06/07 against the live `assets/demo-seed-data.json` and the REAL `overview.js` render path — RED today (zero `isHeartShield`, no `daysAgo`, no transform seam).
- `tests/35-demo-exposure.test.js` pins DEMO-11/D-09 with a falsifiable demo-vs-normal asymmetry across four real surfaces: demo.html (home), index.html (non-demo home), license.html (real license.js init), and a bare window driving the REAL `window.openExportFlow` with spied export primitives.
- Declared the two forward contracts: the `window.__demoSeedHelpers.applyRelativeDates(sessions, now)` seam (35-04) and the demo-vs-normal control lock-down (35-06).
- Verified the asymmetry is real, not a blanket fail: all three exposure demo halves FAIL, all three normal-mode no-regression halves PASS.

## Task Commits

Each task was committed atomically:

1. **Task 1: Seed gate — tests/35-demo-seed.test.js (DEMO-05/06/07)** - `a6694a6` (test)
2. **Task 2: Exposure gate — tests/35-demo-exposure.test.js (DEMO-11/D-09)** - `de41a0c` (test)

_RED (non-zero exit) is the EXPECTED Wave-0 state for both files._

## Files Created/Modified
- `tests/35-demo-seed.test.js` - RED gate: Heart-Shield removal arc + REAL renderClientRows removed-badge, relative-date `daysAgo` + `__demoSeedHelpers` month-edge seam, v6 schema conformance.
- `tests/35-demo-exposure.test.js` - RED gate: backup-cloud/export/import/license hidden-in-demo + present-in-normal, plus the `openExportFlow` programmatic entry blocked-in-demo / reached-in-normal.

## Decisions Made
- **Home/normal no-regression target = `#backupCloudBtn` presence.** index.html has no inline `#exportBtn` (its export lives in the `#backupModal`, which ships `is-hidden` by default). Asserting modal-export *visibility* would be a false target; the cloud button is the real demo-scoped entry point and the clean falsifiable inverse of the demo half.
- **License/normal asserts only the activate button.** `#license-deactivate-btn` sits inside the hidden-by-default `#license-activated-view`, so its hidden state is not a demo-specific signal — the activate button is the falsifiable control.
- **`shared-chrome.js` is evaled directly in the home-env builders** so the `.app-footer` completion sentinel renders at Wave 0, mirroring 35-01's chrome harness (demo.html itself does not load it until 35-03).

## Deviations from Plan

None - plan executed exactly as written. The one judgment call (home/normal target) is a faithful realization of the plan's intent ("prove the guard is demo-scoped and the real app is untouched") given index.html's actual control surface — documented under Decisions Made rather than as a deviation, since no plan instruction was contradicted.

## Issues Encountered
- Initial home/normal assertion checked `#backupModalExport` *visibility*; it read hidden because the enclosing `#backupModal` ships `is-hidden` (its normal closed state). Resolved by asserting `#backupCloudBtn` presence (the real demo-scoped entry point) and only DOM-presence of the modal export control. After the fix, all three normal halves pass and all three demo halves fail — the intended asymmetry.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 35-04 (seed refresh) target is pinned: add a Heart-Shield removal arc, per-session integer `daysAgo` (one === 0), v6-schema-clean sessions, and expose `window.__demoSeedHelpers.applyRelativeDates(sessions, now)` in demo-seed.js BEFORE the demo-mode early-return. When done, `node tests/35-demo-seed.test.js` goes GREEN with no edits.
- 35-06 (exposure guards) target is pinned: hide/disable `#backupCloudBtn` + `#exportBtn` + `.import-label` in demo (app.js/demo.html), disable/hide the license activate/deactivate buttons in demo (license.js), and add a `window.name === 'demo-mode'` guard at the top of `openExportFlow` (backup-modal.js) that shows `toast.exportDisabledDemo` and returns before the export primitives. When done, the demo halves of `node tests/35-demo-exposure.test.js` go GREEN.

## Self-Check: PASSED

- Files: `tests/35-demo-seed.test.js`, `tests/35-demo-exposure.test.js`, `35-02-SUMMARY.md` — all present on disk.
- Commits: `a6694a6` (seed gate), `de41a0c` (exposure gate) — both in git history.

---
*Phase: 35-demo-system-refresh-version-parity*
*Completed: 2026-06-30*
