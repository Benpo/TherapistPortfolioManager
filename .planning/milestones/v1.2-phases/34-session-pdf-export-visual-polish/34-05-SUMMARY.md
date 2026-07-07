---
phase: 34-session-pdf-export-visual-polish
plan: 5
subsystem: export
tags: [pdf, export-modal, data-assembly, fn-1, ordinal, tdd, indexeddb]

# Dependency graph
requires:
  - phase: 34-04
    provides: "tests/34-session-ordinal.test.js RED gate + mock-portfolio-db getSessionsByClient seam"
  - phase: 30
    provides: "getIssuesPayload {name,before,after} structured payload contract; export-stepper data-assembly path"
provides:
  - "deriveSessionOrdinal(clientId, thisSessionId) — pure FN-1 chronological ordinal helper (window.__exportModalTestHooks.deriveSessionOrdinal)"
  - "buildSessionPDF input contract extension: sessionNumber, issues[] (structured), exportedOn"
affects: [34-06, 34-07, 34-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-scope pure helper exposed via __exportModalTestHooks (the __addSessionTestHooks idiom) — testable without the init handshake or DOM"
    - "ISO-date lexical sort (localeCompare) + numeric-id tie-break — no new Date() on the date field (TZ-safe, Pitfall 2)"
    - "buildRenderInputs() centralizes the render-tier inputs so both PDF download and share paths carry identical explicit args"

key-files:
  created: []
  modified:
    - assets/export-modal.js

key-decisions:
  - "deriveSessionOrdinal lives at IIFE module scope (not inside initExportModal) so it is init-independent and directly testable; reads window.PortfolioDB at call time"
  - "sessionNumber is derived from the editing session's clientId/id; for a new (unsaved) session it falls back to the selected client's count+1 (deriveSessionOrdinal returns length+1 when the id is absent), and is omitted gracefully when no client is resolvable"
  - "issues[] forwarded as structured {name,before,after} objects (NOT markdown); markdown body left UNCHANGED — severity drop lands atomically in 34-09"
  - "exportedOn = App.formatDate(new Date()) — localized today's date, distinct from the card's session date (D-09)"

requirements-completed: []  # PDFX-02/PDFX-01 data tier landed; renderer (34-06/07/09) closes the visible requirement

coverage:
  - id: D1
    description: "FN-1 chronological session-ordinal: 1/2/3 by date, renumber to 1/2 on middle delete, same-date id tie-break, unsaved → length+1; falsifiable on an id-based derivation"
    requirement: "PDFX-02"
    verification:
      - kind: unit
        ref: "tests/34-session-ordinal.test.js (now GREEN)"
        status: pass
    human_judgment: false
    rationale: "Turned GREEN by deriveSessionOrdinal; the 34-04 RED gate is satisfied at the documented __exportModalTestHooks seam."

# Metrics
duration: 12min
completed: 2026-06-29
status: complete
---

# Phase 34 Plan 05: export data-assembly tier (FN-1 ordinal + widened buildSessionPDF contract) Summary

**Added `deriveSessionOrdinal` — the renumber-safe chronological session-ordinal (FN-1/D-03) — and widened the `buildSessionPDF` input contract with `sessionNumber`, structured `issues[]`, and `exportedOn`, turning the 34-session-ordinal RED gate GREEN while keeping the renderer a pure function of its inputs.**

## Performance
- **Duration:** ~12 min
- **Tasks:** 2
- **Files modified:** 1 (`assets/export-modal.js`)

## Accomplishments
- Implemented `deriveSessionOrdinal(clientId, thisSessionId)` at IIFE module scope: awaits `window.PortfolioDB.getSessionsByClient(clientId)`, sorts a copy ascending by ISO `date` (lexical `localeCompare`, no `new Date()` — Pitfall 2) with a numeric `id` tie-break, returns `findIndex+1` (or `length+1` for an unsaved/absent id). Exposed at `window.__exportModalTestHooks.deriveSessionOrdinal` per the 34-04 contract.
- Widened the `buildSessionPDF` call (both the PDF-download and the Web-Share paths) to also pass `sessionNumber` (FN-1 ordinal), `issues` (structured `{name,before,after}` from `getIssuesPayload`, NOT markdown), and `exportedOn` (`App.formatDate(new Date())`, D-09) — via a single `buildRenderInputs()` helper so both paths carry identical explicit inputs.
- Added `getEditingSession` to the ctx destructuring so the ordinal can be sourced from add-session.js's live editing-session state at the call site.

## Task Commits
1. **Task 1: deriveSessionOrdinal (FN-1 ordinal) + test hook** — `a95345b` (feat)
2. **Task 2: widen buildSessionPDF input contract** — `3386508` (feat)

## Files Created/Modified
- `assets/export-modal.js` — added module-scope `deriveSessionOrdinal`, the `__exportModalTestHooks` seam, `getEditingSession` ctx accessor, the `buildRenderInputs()` helper, and the extended `buildSessionPDF` calls.

## Decisions Made
- **Module-scope helper, not init-scoped:** `deriveSessionOrdinal` is defined inside the IIFE but outside `initExportModal`, so the test can eval the file and drive it directly against a seeded `window.PortfolioDB` with no DOM/init handshake (matching the 34-04 seam contract).
- **Graceful ordinal sourcing:** editing session → its `clientId`/`id`; new/unsaved session → selected client's count+1 (deriveSessionOrdinal's `length+1` path); no resolvable client → `sessionNumber` omitted (undefined) so the renderer simply draws no card number.
- **Markdown body untouched:** severity stays emitted in the markdown until 34-09 swaps it atomically (avoids a transient missing-severity state).

## Deviations from Plan
None — plan executed exactly as written. (Both PDF call sites — download and share — were updated for input-contract parity; the plan named the download path explicitly and this keeps the renderer's inputs consistent across export paths.)

## Test State
- `tests/34-session-ordinal.test.js` — **GREEN** (3/3): 1/2/3 by date, renumber-to-1/2 on middle delete, same-date id tie-break.
- `tests/30-export-stepper.test.js` — **green** (7/7): data-assembly wiring did not break the stepper.
- Must-stay-green invariants verified: `pdf-digit-order`, `pdf-glyph-coverage`, `pdf-bold-rendering`, `pdf-bidi`, `30-issue-delta`.
- Full suite: **107 pass / 5 fail files.** The 5 failures are exactly the still-pending Wave-0 RED gates (`34-logo-embed`, `34-pill-localized`, `34-rtl-newblocks` from 34-03; `34-save-before-export` gates 34-08; `34-severity-bars` gates 34-09) — EXPECTED and out of scope for this plan. No new regressions; the ordinal gate dropped out of the RED set.

## Next Phase Readiness
- 34-06/07 (drawHeaderBand/drawClientCard) consume `sessionNumber` + `exportedOn`.
- 34-09 (drawSeverityBlock) consumes the structured `issues[]` to draw the two-bar severity block and atomically drops severity from the markdown body.

## Self-Check: PASSED

---
*Phase: 34-session-pdf-export-visual-polish*
*Completed: 2026-06-29*
