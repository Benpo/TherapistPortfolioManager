---
phase: 30-test-harness-coverage
plan: 10
subsystem: test-harness
tags: [tests, add-session, jsdom, characterization, gap-closure]
requires:
  - "30-07 shared helpers (mock-portfolio-db store-backed getSession + getAllTherapistSettings; app-stub overrides)"
  - "30-05 tests/30-export-stepper.test.js + tests/30-section-visibility.test.js (real-page buildEnv)"
  - "30-06 tests/30-issue-delta.test.js (real severity pair buildEnv)"
provides:
  - "B3 export-stepper residual coverage: exportCloseDialog, MD/PDF download seam, real MdRender preview branch, mobile-tabs path"
  - "B4 past-session coverage: sectionHasData + the disabled-with-data visible/badged branch; REAL app.js getSectionLabel cross-module title render"
  - "B5 issue-management coverage: MAX_ISSUES=3 cap + updateRemoveButtons toggle"
affects:
  - tests/30-export-stepper.test.js
  - tests/30-section-visibility.test.js
  - tests/30-issue-delta.test.js
tech-stack:
  added: []
  patterns:
    - "Real cross-module reader: eval real app.js + run real App.initCommon() to populate the private _sectionLabelCache from a seeded therapistSetting, then delegate the stub's getSectionLabel to the real reader (option a, NOT the downgrade)"
    - "Past-session boot: ?sessionId=N + seeded PortfolioDB.getSession store drives applySectionVisibility(true)"
    - "Download SEAM assertion: spy window.PDFExport.triggerDownload, assert .pdf/.md filename dispatch (not PDF-byte coverage)"
    - "Injected MdRender stub with a data-mdrender marker proves the real MdRender innerHTML branch ran (not the editor.value textContent fallback)"
key-files:
  created: []
  modified:
    - tests/30-export-stepper.test.js
    - tests/30-section-visibility.test.js
    - tests/30-issue-delta.test.js
decisions:
  - "B4 cross-module verdict kept REAL (option a): the real app.js getSectionLabel + real initCommon cache load render the custom title end-to-end — no downgrade note needed"
metrics:
  duration: ~20min
  completed: 2026-06-27
status: complete
---

# Phase 30 Plan 10: Add-Session Residual Coverage (GAP-10/11/14) Summary

Strengthened three existing real-page add-session jsdom tests with the residual-behavior cases the phase-30 verification flagged as unexecuted, closing GAP-10 (B3 export-stepper residuals), GAP-11 (B4 past-session + cross-module label), and GAP-14 (B5 issue cap/toggle). All cases are additive; existing green cases and their EXPECTED_COUNT guards were preserved (only bumped), and every added case is pinned by observable DOM and proven falsifiable via a recorded mutation-kill.

## What Was Built

### Task 1 — GAP-10 export-stepper residuals (region B3) — commit f457c8b
`tests/30-export-stepper.test.js`, EXPECTED_COUNT 3 → 7. Four added cases:
- **exportCloseDialog** — clicking `#exportClose` (a `.modal-close` routed through the delegated `onModalClick`) hides the modal (`is-hidden` added) when the preview is unedited.
- **MD + PDF download SEAM** — at step 3, `#exportDownloadPdf` (async, builds a real PDF) and `#exportDownloadMd` each reach the spied `window.PDFExport.triggerDownload` with the correct `.pdf` / `.md` extension. Named SEAM checks, not full-render coverage.
- **Real MdRender preview branch** — an injected `window.MdRender` stub whose `render()` returns a `data-mdrender="1"` wrapper proves `exportUpdatePreview` ran the MdRender innerHTML branch (add-session.js:1269-1271), not the `editor.value` textContent fallback at :1273. Asserted on `#exportPreview.innerHTML` + a `p[data-mdrender="1"]` element child.
- **Mobile tabs** — `buildEnv({ mobile: true })` makes `matchMedia` report `matches:true`, so `exportApplyMobileTabs` runs its mobile branch: `.export-mobile-tabs` revealed, edit pane visible, preview pane hidden behind the inactive tab.

### Task 2 — GAP-11 past-session + cross-module label (region B4) — commit 04f5a7b
`tests/30-section-visibility.test.js`, EXPECTED_COUNT 2 → 4. Two added cases:
- **Past-session branch** — booting with `?sessionId=1` + a seeded `PortfolioDB.getSession` store drives `applySectionVisibility(true)`. A disabled section WITH data (`trapped`) renders visible + badge shown; a disabled section with NO data (`comments`) is `is-hidden`. Exercises `sectionHasData` + the :960-969 branch the new-session cases short-circuit.
- **Cross-module section-label (REAL, option a)** — `buildRealReaderEnv` evals the real `assets/app.js`, seeds `PortfolioDB.therapistSettings` with a custom `trapped` label, and runs the REAL `App.initCommon()` so it populates the private `_sectionLabelCache` from the seed. add-session boots on the safe stub but its `getSectionLabel` delegates to `realApp.getSectionLabel`, so the therapist-visible CUSTOM title renders end-to-end. This is the REAL reader (not the id-returning stub), guarding the Phase-31 D-13c glue cleanup. **No downgrade note** — option (a) proved within budget.

### Task 3 — GAP-14 issue cap + remove-button toggle (region B5) — commit 12496d2
`tests/30-issue-delta.test.js`, EXPECTED_COUNT 5 → 7. Two added cases:
- **MAX_ISSUES=3 cap** — clicking `#addIssueBtn` to grow to 3 rows sets `addIssueBtn.disabled === true`; a further click at the cap does not add a 4th row.
- **updateRemoveButtons toggle** — the lone remove button is `is-hidden` + disabled at 1 row; after adding a second row both remove buttons are visible (not `is-hidden`) + enabled.

## Mutation-Kill Evidence (G1)

Each guarded behavior was reverted in a backup-guarded scratch copy of `assets/add-session.js`, the target test re-run (must exit non-zero), then restored (must exit 0). Production file confirmed unchanged after each (clean `git status`).

| Region | Mutation | Result |
|--------|----------|--------|
| B3 | Force the `editor.value` fallback (`if (false && window.MdRender ...)`) | MdRender preview case exits 1; restored exits 0 |
| B4 | Drop the :960-969 visible+badge logic (`if (false)`) | past-session case exits 1; restored exits 0 |
| B5 | Raise the cap (`MAX_ISSUES = 99`) | cap case exits 1; restored exits 0 |

## Verification

- `node tests/30-export-stepper.test.js` → 7 passed, exit 0
- `node tests/30-section-visibility.test.js` → 4 passed, exit 0
- `node tests/30-issue-delta.test.js` → 7 passed, exit 0
- Each file: `grep -E 'vm|eval|jsdom|runInContext'` non-empty (still executes the real module); forbidden `SRC.indexOf(` / `SRC.slice(` absent
- `npm test` → 102 passed, 0 failed, exit 0

## Deviations from Plan

None — plan executed exactly as written. The B4 cross-module case landed as option (a) (real reader end-to-end), so no downgrade note was required.

## Known Stubs

None introduced. The add-session boot still runs on the App stub for non-`getSectionLabel` methods (by design, matching 30-05/06); the B4 cross-module case specifically delegates `getSectionLabel` to the REAL app.js reader, so the therapist-visible title is real end-to-end.

## Self-Check: PASSED

- Files: all 3 modified test files + SUMMARY.md present on disk.
- Commits: f457c8b, 04f5a7b, 12496d2 present in git history.
- Production `assets/add-session.js` unchanged (clean `git status` after all mutation-kills).
