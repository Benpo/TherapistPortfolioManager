---
phase: 34-session-pdf-export-visual-polish
plan: 8
subsystem: export
tags: [pdf, export-modal, save-before-export, extraction, behavior-preserving, jsdom, tdd, fn-1, indexeddb]

# Dependency graph
requires:
  - phase: 34-04
    provides: "tests/34-save-before-export.test.js RED gate (non-blocking prompt + behavior-preserving save extraction)"
  - phase: 34-05
    provides: "deriveSessionOrdinal + buildRenderInputs (the FN-1 ordinal the saved id flows into)"
provides:
  - "saveSessionForm() in add-session.js — reusable validate→persist returning {savedId,isNew}, null on validation failure, NO navigation; exposed via ctx.saveSession"
  - "save-before-export non-blocking guard on the exportSessionBtn trigger (export.unsaved.* prompt) — Save&export persists-then-opens with the correct FN-1 ordinal; Keep-editing dismisses; validation aborts"
affects: [34-09, 34-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Behavior-preserving handler extraction (Phase-31 idiom): lift the inline submit body into async saveSessionForm() returning {savedId,isNew}|null; caller owns navigation so the same save serves both the save BUTTON (keeps its 600ms redirect) and the export guard (stays on-page)"
    - "Save-failure-as-null signal: validation failure returns null (caller aborts) instead of toast-into-the-void, so the export guard can keep the user editing with no export"
    - "Just-saved-id threading: openExportDialog(preSavedId) → _exportState.savedSessionId → buildRenderInputs uses it as thisSessionId so a brand-new session derives the correct FN-1 ordinal (editingSession is still null at save time)"
    - "Test-precondition repoint: jsdom export tests open on a saved+clean session (?sessionId=1, empty content) to exercise the gate's direct-open path without changing any downstream assertion"

key-files:
  created: []
  modified:
    - assets/add-session.js
    - assets/export-modal.js
    - tests/30-export-stepper.test.js
    - tests/30-export-markdown.test.js

key-decisions:
  - "saveSessionForm() is a verbatim-behavior extraction (validation order, toasts, payload shape unchanged); the 600ms redirect was removed FROM the function and re-homed in the save-button submit listener so save-button UX is byte-identical"
  - "The export trigger gates on PortfolioFormDirty() || !getEditingSession() (D-13); clean AND already-saved opens directly as before"
  - "App.confirmDialog used with tone:'neutral' (the prompt is a positive save action, not a destructive confirm) and the 34-02 export.unsaved.{title,body,saveExport,keepEditing} keys"
  - "The just-saved id is threaded through openExportDialog → _exportState.savedSessionId → buildRenderInputs so a never-saved session that takes Save&export derives the right ordinal (length+1 would be off-by-one)"
  - "30-export-stepper + 30-export-markdown repointed to a saved+clean session: the gate legitimately changed the export-trigger precondition; their state-machine / markdown assertions are unchanged (test-shape coupling fix, Phase-31 pattern)"

requirements-completed: [PDFX-03]

coverage:
  - id: D3
    description: "Save-before-export: non-blocking prompt on dirty/unsaved; Save&export persists (no redirect) then opens with correct ordinal; Keep-editing dismisses; validation-failure aborts; save-button preserved"
    requirement: "PDFX-03"
    verification:
      - kind: unit
        ref: "tests/34-save-before-export.test.js (5/5 GREEN)"
        status: pass
    human_judgment: false
    rationale: "The 34-04 RED gate is fully satisfied; case (e) save-button preservation stayed green through the extraction."

# Metrics
duration: 10min
completed: 2026-06-29
status: complete
---

# Phase 34 Plan 08: save-before-export honest-save guard (PDFX-03 / D-13) Summary

**Extracted a reusable, behavior-preserving `saveSessionForm()` (validate → persist → `{savedId,isNew}`, null on failure, no redirect) and wired a non-blocking "Save & export" / "Keep editing" prompt onto the export trigger so a client never receives a PDF of unsaved/discarded edits and a brand-new session gains an id + correct FN-1 ordinal — turning the 34-save-before-export RED gate fully GREEN while the save button and the whole green suite stay intact.**

## Performance
- **Duration:** ~10 min
- **Started:** 2026-06-29T22:25:21Z
- **Completed:** 2026-06-29T22:35:17Z
- **Tasks:** 2
- **Files modified:** 4 (2 assets + 2 test preconditions)

## Accomplishments
- **Task 1 — extraction (behavior-preserving).** Lifted the inline submit-handler body (`add-session.js`) into `async function saveSessionForm()`: runs the exact same validation chain (clientId → date → issues → heart-shield), returns `null` + the same toast on any validation failure, builds the same payload, calls `PortfolioDB.addSession/updateSession`, and returns `{savedId, isNew}` (isNew = no prior editingSession) — with NO `window.location` redirect inside. The save-button submit listener now delegates to it and owns the 600ms redirect, so save-button UX is byte-identical. Exposed `saveSession: saveSessionForm` on the `__exportModalInit` ctx.
- **Task 2 — the guard.** The `exportSessionBtn` click now checks `window.PortfolioFormDirty() || !getEditingSession()`; on dirty/unsaved it surfaces `App.confirmDialog` (the 34-02 `export.unsaved.*` keys, `tone:'neutral'`) as a two-choice prompt. "Save & export" → `ctx.saveSession()`; null aborts the export (user stays editing, no PDF), else `openExportDialog(savedId)`. "Keep editing" dismisses with no persist and no export. Clean + already-saved opens directly as before. There is no export-without-save path.
- **Correct ordinal for new saves.** `openExportDialog(preSavedId)` stores the id on `_exportState.savedSessionId`; `buildRenderInputs()` uses it as `thisSessionId` when `editingSession` is still null, so a brand-new session saved via the guard derives its true FN-1 ordinal (not `length+1`).

## Task Commits
1. **Task 1: extract reusable saveSessionForm() (no redirect) + expose via ctx** — `e0b93a2` (refactor)
2. **Task 2: wire non-blocking save-before-export prompt into the export trigger** — `b559029` (feat)

## Files Created/Modified
- `assets/add-session.js` — added `saveSessionForm()`; rewired the submit listener to delegate + own the redirect; added `saveSession` to the export ctx.
- `assets/export-modal.js` — destructured `ctx.saveSession`; added the dirty/unsaved gate on the export trigger; threaded `preSavedId` through `openExportDialog` → `_exportState.savedSessionId` → `buildRenderInputs`.
- `tests/30-export-stepper.test.js` — repointed `buildEnv` to a saved+clean session (`?sessionId=1`, empty-content seed) so the gate opens directly (deviation, below).
- `tests/30-export-markdown.test.js` — same precondition repoint for the two FILTERED-builder cases (deviation, below).

## Decisions Made
- **Verbatim extraction.** No change to validation order, toasts, payload shape, or save-button redirect timing — only the redirect's HOME moved (function → caller). Guarded by case (e) staying green.
- **null = abort signal.** A validation failure returns null so the export guard can abort cleanly and keep the user editing — the plan's explicit "signal failure to the caller, not just toast+return" requirement.
- **Neutral-tone prompt.** "Save & export" is a positive action, so `confirmDialog` uses `tone:'neutral'` (primary confirm button) rather than the destructive default.
- **Id threading for the ordinal.** Relying on a stale `editingSession` after a brand-new save would give `length+1`; passing the returned `savedId` lets `deriveSessionOrdinal` LOCATE the just-saved row.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repointed 30-export-stepper + 30-export-markdown to a saved+clean session**
- **Found during:** Task 2 (full-suite verification)
- **Issue:** Both jsdom tests open the export dialog by clicking `exportSessionBtn` on a NEVER-SAVED new session. The new save-before-export gate legitimately intercepts that exact precondition (the plan's `!getEditingSession()` check), so the dialog no longer opens directly — breaking 7 stepper cases + 2 markdown cases that assert the stepper state machine / filtered markdown DOWNSTREAM of the open. This is test-shape coupling to the old direct-open trigger (the Phase-31 pattern), not a behavior regression.
- **Fix:** Repointed each `buildEnv` to load an EMPTY-content saved session via `?sessionId=1` (seeded `{id:1, clientId:1, issues:[], …all fields ""}` + one client). `populateSession` leaves the form byte-identical to a fresh new session (one default empty issue row, empty fields), `editingSession` is set and `formDirty` resets to false, so the gate takes its "clean AND saved → open directly" branch. `buildFilteredSessionMarkdown` omits client/date from the body, so every existing assertion (filtered markers, share/download seams, preview, mobile tabs, FULL-builder clipboard) is unchanged.
- **Files modified:** tests/30-export-stepper.test.js, tests/30-export-markdown.test.js
- **Verification:** 30-export-stepper 7/7 green; 30-export-markdown 3/3 green; full suite shows only the 3 intended RED gates (below).
- **Committed in:** b559029 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking). No architectural changes; no scope creep. The export trigger's precondition genuinely changed (that IS the feature), so the two test preconditions were updated to the direct-open path while preserving all behavioral assertions.

## Test State
- `tests/34-save-before-export.test.js` — **GREEN (5/5):** prompt on dirty/unsaved; Save&export persists (addSession) then opens; Keep-editing dismisses (no persist, no export); validation failure aborts (no persist, no modal, issue-missing toast); save-button still persists.
- `tests/30-export-stepper.test.js` — **green (7/7)** and `tests/30-export-markdown.test.js` — **green (3/3)** after the precondition repoint.
- `tests/34-session-ordinal.test.js` — **green (3/3)** (ordinal contract intact).
- Floor invariants verified GENUINELY green with real PASS output (not silent exits): `pdf-digit-order` 4/4, `pdf-glyph-coverage` 3/3, `pdf-bold-rendering` 9/9, `pdf-bidi` 12/12, `30-issue-delta` 7/7.
- Full suite: **109 passed / 3 failed files.** The 3 failures are exactly the still-pending Wave-later RED gates and EXPECTED/out of scope: `34-rtl-newblocks` + `34-severity-bars` (owned by 34-09) and `pdf-latin-regression` (the deliberate redesign baseline, regenerated in 34-10). No `.sha256` baselines were touched.

## Threat Surface
- T-34-08 (Tampering / stale-unsaved export, `mitigate`): mitigated exactly as planned — the guard prevents a PDF reflecting unsaved/discarded edits and validation failure aborts the export. No NEW security surface introduced (no auth/network/access-control; a local save step before a local export). No threat flags.

## Known Stubs
None — `saveSessionForm()` returns real persisted data; no hardcoded empty UI values or placeholders introduced.

## Next Phase Readiness
- 34-09 (drawSeverityBlock) → turns `34-severity-bars` + the severity part of `34-rtl-newblocks` GREEN and drops severity from the markdown body atomically.
- 34-10 → regenerates the `pdf-latin-regression` baseline for the redesigned layout.

## Self-Check: PASSED

---
*Phase: 34-session-pdf-export-visual-polish*
*Completed: 2026-06-29*
