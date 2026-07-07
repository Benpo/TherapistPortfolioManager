---
phase: 34-session-pdf-export-visual-polish
plan: 4
subsystem: testing
tags: [jsdom, jspdf, pdf, rtl, tdd, behavior-verification, indexeddb, content-stream]

# Dependency graph
requires:
  - phase: 34-03
    provides: render-tier Wave-0 RED gates (logo/pill/rtl-newblocks) + the jsdom-pdf-env harness + dep-stub pattern
  - phase: 30
    provides: jsdom real-page harness, mock-portfolio-db / app-stub helpers, 30-issue-delta severity payload contract
provides:
  - "tests/34-session-ordinal.test.js — FN-1 chronological-ordinal RED gate (renumber-on-delete + same-date id tie-break)"
  - "tests/34-severity-bars.test.js — D-08 two-bar severity RED gate (proportional fills, flat hex, no GState op)"
  - "tests/34-save-before-export.test.js — PDFX-03 save-before-export RED gate (non-blocking prompt + behavior-preserving save extraction)"
  - "mock-portfolio-db.js getSessionsByClient seam (unsorted, store-order)"
affects: [34-05, 34-08, 34-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Content-stream fill-geometry reconstruction: tokenize page-1 stream, collect path points (m/l/c/v/y/re), bbox on fill paint ops, classify fill colour by hue, isolate severity bars by light-track-contains-saturated-fill signature"
    - "Data-assembly test seam: deriveSessionOrdinal resolved from window.__exportModalTestHooks (the __addSessionTestHooks idiom), reading window.PortfolioDB at call time"
    - "Falsifiable ordinal seeding: id order scrambled vs date order so an id-based/getAll-order derivation fails cases 1 and 2"

key-files:
  created:
    - tests/34-session-ordinal.test.js
    - tests/34-severity-bars.test.js
    - tests/34-save-before-export.test.js
  modified:
    - tests/_helpers/mock-portfolio-db.js

key-decisions:
  - "deriveSessionOrdinal exposure contract: window.__exportModalTestHooks.deriveSessionOrdinal (fallback window.ExportModal.deriveSessionOrdinal) — 34-05 must expose it there"
  - "Severity bars are TWO stacked equal-width tracks (UI-SPEC §5), so the test pairs each saturated fill with ITS OWN track (tolerant to a single-track-two-fills layout too)"
  - "Severity colour assertions are hue-tolerant (reddish/greenish/light) but STRICT on no-/ExtGState + no `gs` op (D-08/FLAG-6 determinism)"
  - "save-before-export uses App.confirmDialog as the non-blocking prompt seam; redirect-instead-of-export is caught by the export-modal-opens assertion (jsdom no-ops real navigation)"

patterns-established:
  - "Pattern: parser non-vacuity proven by a scratch build that draws the faithful two-track layout and confirms the finder + ratios pass"
  - "Pattern: RED-gate self-exit with explicit 'gates 34-NN' messaging so the implementing plan knows the contract"

requirements-completed: []  # PDFX-01/02/03 are PINNED (RED) by this plan, COMPLETED by 34-05/08/09 — not closed here

coverage:
  - id: D1
    description: "FN-1 chronological session-ordinal RED gate: 1/2/3 by date, renumber to 1/2 on middle delete, same-date id tie-break; falsifiable on an id-based derivation"
    requirement: "PDFX-02"
    verification:
      - kind: unit
        ref: "tests/34-session-ordinal.test.js (RED — deriveSessionOrdinal absent; gates 34-05)"
        status: fail
    human_judgment: false
    rationale: "Intentional RED Wave-0 gate; turns GREEN in 34-05. Status is correctly fail now."
  - id: D2
    description: "Severity two-bar RED gate: before/after fills proportional to value/10 × track, shared track width, before > after, flat fill with no opacity GState op"
    requirement: "PDFX-01"
    verification:
      - kind: unit
        ref: "tests/34-severity-bars.test.js (RED — issues[] not drawn; gates 34-09). Assertion 3 (no GState) already green as a must-hold invariant."
        status: fail
    human_judgment: false
    rationale: "Intentional RED Wave-0 gate; turns GREEN in 34-09. Parser verified non-vacuous against a faithful two-track build."
  - id: D3
    description: "Save-before-export RED gate: non-blocking prompt on unsaved/dirty, Save&export persists-then-opens (no redirect), Keep-editing dismisses, validation-failure aborts export, save-button preserved"
    requirement: "PDFX-03"
    verification:
      - kind: unit
        ref: "tests/34-save-before-export.test.js (RED for a-d; e green — save-button preservation; gates 34-08)"
        status: fail
    human_judgment: false
    rationale: "Intentional RED Wave-0 gate; turns GREEN in 34-08. Case (e) is green now and must stay green through the extraction."

# Metrics
duration: 15min
completed: 2026-06-29
status: complete
---

# Phase 34 Plan 04: Wave-0 behavior/data RED gates Summary

**Three falsifiable RED-now tests pinning the FN-1 chronological-ordinal contract (renumber-on-delete + id tie-break), the two-bar severity geometry (proportional flat fills, no GState op), and the PDFX-03 save-before-export non-blocking guard — the executable GREEN gates for 34-05, 34-09, and 34-08.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-29T21:05:57Z
- **Completed:** 2026-06-29T21:21:38Z
- **Tasks:** 3
- **Files modified:** 4 (3 created + 1 shared helper)

## Accomplishments
- Authored `tests/34-session-ordinal.test.js` — the FN-1 spine: sessions seeded with id order scrambled against date order so an id-based or unsorted-getAll derivation fails the 1/2/3-by-date case AND the renumber-to-1/2-after-deleting-the-middle case; a same-date pair tie-breaks deterministically by numeric id. RED now (deriveSessionOrdinal absent).
- Authored `tests/34-severity-bars.test.js` — reconstructs every filled shape's bbox + fill colour from the page-1 content stream, isolates the bars by signature (a saturated fill contained in a light track), and asserts proportional widths (before/after ≈ value/10 × track), shared track width, before > after, and the determinism rule (no `/ExtGState`, no `gs` op). RED now (issues[] not drawn); parser proven non-vacuous against a faithful two-track build.
- Authored `tests/34-save-before-export.test.js` — a jsdom add-session page that drives the real export trigger + submit and asserts five PDFX-03 behaviors via observable spies. RED for (a)-(d); (e) green as the save-button behavior-preservation guard.
- Extended the shared `mock-portfolio-db.js` with `getSessionsByClient` (unsorted, store-order) — additive; all existing consumers stay green.

## Task Commits

Each task was committed atomically:

1. **Task 1: 34-session-ordinal.test.js (FN-1 MUST-test) + mock seam** - `bdddb04` (test)
2. **Task 2: 34-severity-bars.test.js (D-08 two-bar geometry)** - `c76749b` (test)
3. **Task 3: 34-save-before-export.test.js (PDFX-03 guard)** - `de4d785` (test)

## Files Created/Modified
- `tests/34-session-ordinal.test.js` - FN-1 chronological-ordinal RED gate (gates 34-05)
- `tests/34-severity-bars.test.js` - D-08 severity two-bar content-stream RED gate (gates 34-09)
- `tests/34-save-before-export.test.js` - PDFX-03 save-before-export jsdom RED gate (gates 34-08)
- `tests/_helpers/mock-portfolio-db.js` - added `getSessionsByClient` read seam (additive)

## Decisions Made
- **Ordinal test seam:** 34-05 must expose `deriveSessionOrdinal(clientId, thisSessionId)` at `window.__exportModalTestHooks.deriveSessionOrdinal` (fallback `window.ExportModal.deriveSessionOrdinal`), reading `window.PortfolioDB.getSessionsByClient` at call time. The test resolves it across both seams and emits a clear "gates 34-05" RED message when absent.
- **Severity geometry:** UI-SPEC §5 draws two stacked equal-width tracks (before barline + after barline). The finder therefore pairs each saturated fill with its OWN containing light track, which is also tolerant of a single-track-two-fills layout. Colour matching is hue-based (reddish/greenish/light) per the plan's "tolerant to the exact locked hex," but the no-opacity/no-GState assertion is strict.
- **Redirect detection without real navigation:** jsdom no-ops `window.location.href` assignment, so "no redirect inside the extracted save" is enforced indirectly — case (b) asserts the export modal OPENS after Save & export; a redirect-instead-of-export path leaves it closed and fails.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `getSessionsByClient` to the shared mock**
- **Found during:** Task 1 (ordinal test)
- **Issue:** The plan's key_links names `mock-portfolio-db.js` as the seam for `PortfolioDB.getSessionsByClient`, but the shared mock had no such method, so the ordinal gate could not drive its data source.
- **Fix:** Added an additive store-backed `getSessionsByClient(clientId)` read (filters the seeded sessionStore by clientId, returns deep-copied in store order — deliberately unsorted, mirroring the real `index.getAll`) and registered it in `READ_METHODS`.
- **Files modified:** tests/_helpers/mock-portfolio-db.js
- **Verification:** 30-issue-delta and 30-export-stepper (existing consumers) stay green; full suite shows no new failures beyond the intended RED gates.
- **Committed in:** bdddb04 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Additive enabling change for the named seam. No scope creep; no behavior change to existing tests.

## Issues Encountered
- **Initial severity finder mis-modeled the layout.** The first finder required a single track to contain BOTH the red and green fills; a sanity build revealed UI-SPEC §5 uses two separate stacked tracks (one per barline). Reworked the finder to pair each saturated fill with its own containing track and re-verified non-vacuity. Caught before commit.

## Test State (intended TDD Wave-0)
- Full suite: **106 passed, 6 failed.** The 6 failures are exactly the Wave-0 RED gates — 3 pre-existing from 34-03 (logo-embed, pill-localized, rtl-newblocks) and the 3 authored here.
- Must-stay-green invariants verified green: `pdf-digit-order`, `pdf-glyph-coverage`, `pdf-bold-rendering`, `pdf-bidi`, `30-issue-delta`.

## Next Phase Readiness
- 34-05 (deriveSessionOrdinal + buildSessionPDF input contract) → turn 34-session-ordinal GREEN at the documented seam.
- 34-09 (drawSeverityBlock) → turn 34-severity-bars GREEN; two equal-width tracks, flat hex fills, no GState.
- 34-08 (saveSessionForm extraction + prompt wiring) → turn 34-save-before-export (a)-(d) GREEN while keeping (e) green.

## Self-Check: PASSED

---
*Phase: 34-session-pdf-export-visual-polish*
*Completed: 2026-06-29*
