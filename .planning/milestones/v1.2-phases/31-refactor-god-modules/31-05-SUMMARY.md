---
phase: 31-refactor-god-modules
plan: 05
subsystem: refactoring
tags: [add-session, export-modal, markdown-builders, closure-extraction, context-injection, jsdom, service-worker]

# Dependency graph
requires:
  - phase: 31-04
    provides: settings-photos.js extraction (wave 3); established the page-private module + test-loader-repoint pattern this plan reuses
provides:
  - assets/export-modal.js (page-private export-modal + markdown builders behind window.__exportModalInit(ctx))
  - context-injection init(ctx) handshake pattern (RESEARCH Pattern 2) — first in-repo instance
  - slimmed add-session.js (1863 -> 1518 lines; export region removed, save path retained)
affects: [31-06, add-session, export, pdf-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "init(ctx) context-injection handshake: mutable JS state threaded via accessor closures, DOM via ctx.els/getElementById"
    - "per-test-mechanism loader repoint: win.eval for jsdom booters, vm.runInContext for vm-sandbox booters"

key-files:
  created:
    - assets/export-modal.js
  modified:
    - assets/add-session.js
    - add-session.html
    - sw.js
    - tests/30-export-markdown.test.js
    - tests/30-export-stepper.test.js
    - tests/quick-260516-g7p-export-editor-snippets.test.js

key-decisions:
  - "ctx held to exactly the 5 plan-specified members; shared closure helpers (copyTextToClipboard, getClientNameForCopy, sectionHasData) re-derived self-contained inside export-modal.js rather than widening ctx"
  - "getClientNameForCopy reads the selected <select> option text (output-identical to getClientDisplayName over clientCache, which loadClients sets) since clientCache is add-session.js-private state not in ctx"
  - "__exportModalInit call is unconditional (no guard) so a missing/mis-ordered export-modal.js fails loudly at boot"

patterns-established:
  - "Context-injection handshake for closure extraction (window.__exportModalInit) — internal, guarded, no public feature API"
  - "Booter test-loader repoint matches each test's own load mechanism (win.eval vs vm.runInContext)"

requirements-completed: [RFCT-02, RFCT-03]

coverage:
  - id: D1
    description: "buildSessionMarkdown full-copy payload (issues section, insights-after-trapped order, included content) lands on the clipboard unchanged via copySessionBtn real click"
    requirement: "RFCT-02"
    verification:
      - kind: unit
        ref: "tests/30-export-markdown.test.js"
        status: pass
    human_judgment: false
  - id: D2
    description: "Export stepper 1->2->3, close, download SEAM (pdf/md), MdRender branch, mobile-tabs, files-only share via real clicks"
    requirement: "RFCT-02"
    verification:
      - kind: unit
        ref: "tests/30-export-stepper.test.js"
        status: pass
    human_judgment: false
  - id: D3
    description: "Per-field scoped copy payload unchanged (retained in add-session.js) and issues->markdown delta/cap unchanged"
    requirement: "RFCT-02"
    verification:
      - kind: unit
        ref: "tests/30-field-copy.test.js"
        status: pass
      - kind: unit
        ref: "tests/30-issue-delta.test.js"
        status: pass
    human_judgment: false
  - id: D4
    description: "Retained session-save / dirty-revert path still works after the move (sessionForm submit handler + getIssuesPayload stay in add-session.js)"
    requirement: "RFCT-02"
    verification:
      - kind: unit
        ref: "tests/30-save-redirect.test.js"
        status: pass
      - kind: unit
        ref: "tests/30-form-dirty-revert.test.js"
        status: pass
    human_judgment: false
  - id: D5
    description: "Full test suite green after extraction + loader repoints (binding proof of behavior-preserving move)"
    requirement: "RFCT-02"
    verification:
      - kind: unit
        ref: "npm test (106 files)"
        status: pass
    human_judgment: false
  - id: D6
    description: "RFCT-03 cleanups within the moved region: phase-free comments, export-modal: tagged silent catch; D-05 spotlight log string phase-free"
    requirement: "RFCT-03"
    verification:
      - kind: other
        ref: "grep -n 'Phase 24 Plan 06' assets/add-session.js (log string absent)"
        status: pass
    human_judgment: false

# Metrics
duration: ~40min
completed: 2026-06-28
status: complete
---

# Phase 31 Plan 05: Extract export-modal + markdown builders Summary

**Export-modal + markdown builders lifted out of the add-session.js DOMContentLoaded closure into a page-private assets/export-modal.js behind a window.__exportModalInit(ctx) context-injection handshake, with the session-save path retained and the full real-click export suite green.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-06-28T06:30:00Z (approx)
- **Completed:** 2026-06-28T07:10:00Z
- **Tasks:** 3
- **Files modified:** 16 (1 created, 15 modified)

## Accomplishments
- Extracted the export modal (3-step stepper, PDF/MD/share outputs) and both markdown builders (`buildSessionMarkdown`, `buildFilteredSessionMarkdown`) plus `stripRequired` into `assets/export-modal.js` — a behavior-preserving closure extraction using the init(ctx) handshake (RESEARCH Pattern 2, the first in-repo instance).
- Retained the session-save path (`sessionForm` submit handler, `submitButton`, `getIssuesPayload`) and the section-visibility / per-field-copy code in add-session.js, which dropped from 1863 to 1518 lines.
- Repointed all twelve add-session booters to load export-modal.js before add-session.js by each test's own mechanism (win.eval for jsdom, vm.runInContext for the vm-sandbox booters), reclassified g7p as a source-audit (Test B now asserts `Snippets.bindTextarea` against export-modal.js), and left the two text-only readers untouched. Full suite: 106 passed, 0 failed.

## Task Commits

Each task was committed atomically (hooks enabled, no --no-verify):

1. **Task 1: Create export-modal.js with init(ctx) handshake** - `71765c0` (feat)
2. **Task 2: Wire __exportModalInit, slim add-session.js, fix :2071 log, wire HTML + sw.js** - `52d2788` (refactor)
3. **Task 3: Repoint test loaders + g7p source-audit** - `15884e4` (test)

## Files Created/Modified
- `assets/export-modal.js` - NEW page-private export module; `initExportModal(ctx)` + `window.__exportModalInit` handshake; holds the moved builders/stepper/handlers plus self-contained `copyTextToClipboard`/`getClientNameForCopy`/`sectionHasData`.
- `assets/add-session.js` - Removed the export region; unconditional `window.__exportModalInit({...})` call with live accessors at the export-wiring point; D-05 spotlight log string made phase-free.
- `add-session.html` - `export-modal.js` script tag added immediately before `add-session.js`.
- `sw.js` - `/assets/export-modal.js` added to `PRECACHE_URLS`.
- 13 test files - export-modal.js loader added to the 12 booters (matching each mechanism); g7p Test B repointed.

## Decisions Made
- **ctx kept to the plan's exact 5 members.** Shared closure helpers needed by the moved code but also used by retained code (`copyTextToClipboard`, `getClientNameForCopy`, `sectionHasData`) were re-derived self-contained inside export-modal.js instead of widening the handshake. Rationale: the plan fixes the ctx shape; these are functions, not the mutable state the handshake exists to thread.
- **getClientNameForCopy reads the live `<select>` option text.** `clientCache` (the canonical lookup source) is add-session.js-private mutable state and is deliberately not threaded via ctx. add-session.js `loadClients()` sets each option's `textContent` to `client.name` — exactly what `getClientDisplayName` returns — so reading the selected option is output-identical without forking `clientCache`. The "" / "__new__" / unknown cases all map to `unknownClient`, matching the original NaN→null→"" path.
- **Unconditional boot call.** `window.__exportModalInit({...})` is not guarded, so a missing/mis-ordered export-modal.js throws a loud TypeError at boot rather than silently disabling export — caught by the real-click suite (T-31-05-A/A2).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Shared closure helpers re-derived self-contained in export-modal.js**
- **Found during:** Task 1 (creating export-modal.js)
- **Issue:** The moved export code depends on `copyTextToClipboard`, `getClientNameForCopy` (→ `clientCache`/`getSelectedClient`/`getClientDisplayName`), and `sectionHasData` (→ `issues`/`heartShieldToggle`). All three are ALSO used by retained code (per-field copy, section-visibility), so they must stay in add-session.js — yet the fixed 5-member ctx cannot carry them.
- **Fix:** Duplicated `copyTextToClipboard` verbatim (pure); reconstructed `getClientNameForCopy` from `ctx.els.clientSelect` option text (output-identical); duplicated `sectionHasData` reading the live DOM (its only export caller discards every result except the DOM-readable heartShieldEmotions branch).
- **Files modified:** assets/export-modal.js
- **Verification:** 30-export-markdown / 30-export-stepper / 30-field-copy / 30-issue-delta green via real clicks; full suite green.
- **Committed in:** `71765c0`

**2. [Rule 3 - Blocking] 30-section-visibility second boot path also needed the loader**
- **Found during:** Task 3 (running the booter suite)
- **Issue:** 30-section-visibility evals add-session.js in TWO setup helpers; the batch loader-insert (single replace) updated only the first, so the second boot threw `window.__exportModalInit is not a function`.
- **Fix:** Added the `win.eval(readAsset('assets/export-modal.js'))` line before the second add-session.js eval too.
- **Files modified:** tests/30-section-visibility.test.js
- **Verification:** `node tests/30-section-visibility.test.js` exits 0 (4 passed).
- **Committed in:** `15884e4`

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking)
**Impact on plan:** Both necessary to complete a behavior-preserving extraction under the fixed-ctx constraint. No scope creep; observable export behavior unchanged.

## Issues Encountered
- None beyond the deviations above. The 24-06 and rna vm-sandbox booters never dispatch DOMContentLoaded, so the loader is harmless-but-consistent there (they pass either way); 30-save-redirect does dispatch and genuinely required it.

## Known Stubs
None. No placeholder/empty-data stubs introduced; this is a pure relocation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RFCT-02 extraction (3 of 3) complete; the export-modal unit now lives in its own page-private module.
- Plan 31-06 owns the consolidated CACHE_NAME / APP_VERSION bump (this plan intentionally did not bump — the pre-commit hook skips the auto-bump when sw.js is in the diff). The `/assets/export-modal.js` PRECACHE entry is in place awaiting that bump.
- Two pre-existing `// Phase 24 Plan 06` comments remain on the RETAINED `renderSpotlightSessionInfo` helper (outside the moved region) — left untouched per RFCT-03's "moved region only" scope; only the runtime log string was the D-05 target.

## Self-Check: PASSED

All created/modified files verified present on disk; all three task commits (`71765c0`, `52d2788`, `15884e4`) verified in git log.

---
*Phase: 31-refactor-god-modules*
*Completed: 2026-06-28*
