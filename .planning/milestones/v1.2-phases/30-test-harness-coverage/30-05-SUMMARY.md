---
phase: 30-test-harness-coverage
plan: 05
subsystem: testing
tags: [jsdom, add-session, export-modal, characterization, behavior-test, clipboard-spy, share-mock]

# Dependency graph
requires:
  - "30-02: tests/_helpers/app-stub.js (createAppStub) + the docListeners capture-and-await + BroadcastChannel-not-needed contract; tests/_helpers/jsdom-pdf-env.js (the getContext→null + jspdf/bidi/heebo/pdf-export eval order mirrored into the page window)"
  - "30-01: installed jsdom devDependency + npm test runner"
provides:
  - "tests/30-export-markdown.test.js — executing characterization of the add-session markdown builders: FILTERED via #exportEditor.value (step-1→Next), FULL via a navigator.clipboard.writeText spy (F-C)"
  - "tests/30-export-stepper.test.js — executing characterization of the export-modal stepper state machine (active-step 1→2→3), the step-1→Next filtered editor value (F-I), and the files-only share dispatch (260615)"
  - "tests/30-section-visibility.test.js — thin executing characterization of applySectionVisibility (disabled→hidden) + applySectionLabels (custom title→label), the settings→add-session cross-module link"
affects: [31]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Real-page jsdom characterization of add-session.js: capture the single async DOMContentLoaded handler via the docListeners override, await it, settle() the queue, then drive REAL user paths (button clicks, checkbox toggles) and assert observable output only"
    - "FULL markdown builder made observable under jsdom by forcing window.isSecureContext=true + a capturing navigator.clipboard.writeText spy (the execCommand fallback is a jsdom no-op)"
    - "Real jsPDF/PDFExport in a real-PAGE window: mirror jsdom-pdf-env's eval order AND preload matching <script src> tags so pdf-export's loadScriptOnce resolves (else buildSessionPDF hangs on a never-firing onload)"

key-files:
  created:
    - tests/30-export-markdown.test.js
    - tests/30-export-stepper.test.js
    - tests/30-section-visibility.test.js
  modified: []

key-decisions:
  - "Observed the FILTERED builder via #exportEditor.value (after #exportStep1Rows checkboxes → #exportNextBtn), NOT #exportPreview.textContent — the preview is MdRender.render(...) HTML that consumes the markdown markers (F-C)"
  - "Observed the FULL builder via a navigator.clipboard.writeText spy under a forced secure context — a SEPARATE explicit assertion from the filtered case (F-C), since the two builders have different observability costs"
  - "Supplied a minimal DOM-node createSeverityScale + null getSeverityValue override purely so createIssueBlock (init) does not throw; the REAL severity pair stays the 30-06 issue-delta test's job (F-B preserved — no severity behavior asserted here)"
  - "Loaded the REAL jsPDF/PDFExport into the page window for the share path (plan's read_first) by mirroring jsdom-pdf-env's eval sequence + preloading the dep <script> tags — the helper builds its own empty-body DOM and cannot load into an arbitrary-HTML page window"
  - "Drove the section re-render via the CAPTURED app:settings-changed listener (invoked directly) per the plan, rather than a real dispatch"

patterns-established:
  - "Pattern: a real-page add-session.js characterization harness (matchMedia stub + severity DOM-node no-op + mock PortfolioDB + App stub + captured async DOMContentLoaded) reusable by the Phase 31 export-modal extraction"

requirements-completed: [TEST-03]

coverage:
  - id: D1
    description: "FILTERED builder (#exportEditor.value after step-1→Next) has insights-after-trapped (260615), correct inclusion, and unticking a section excludes it"
    requirement: "TEST-03"
    verification:
      - kind: behavior
        ref: "node tests/30-export-markdown.test.js — cases A+B; falsifiability: removing the insights emission exits non-zero, restore exits 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "FULL builder (buildSessionMarkdown) payload captured via a navigator.clipboard.writeText spy under forced isSecureContext has the always-on issues section, insights-after-trapped, and the included content"
    requirement: "TEST-03"
    verification:
      - kind: behavior
        ref: "node tests/30-export-markdown.test.js — case C"
        status: pass
    human_judgment: false
  - id: D3
    description: "Export-modal stepper active-step transitions 1→2→3 via #exportNextBtn; step-1 toggle then Next yields a filtered #exportEditor.value (F-I); share dispatch is files-only (no text/title)"
    requirement: "TEST-03"
    verification:
      - kind: behavior
        ref: "node tests/30-export-stepper.test.js; falsifiability: re-adding text/title to navigator.share exits non-zero, restore exits 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "A custom getSectionLabel renders into the matching [data-section-key] .label[data-i18n] textContent; a disabled section on a new session gets is-hidden while an enabled one stays visible"
    requirement: "TEST-03"
    verification:
      - kind: behavior
        ref: "node tests/30-section-visibility.test.js; falsifiability: neutering applySectionLabels and applySectionVisibility each exits non-zero, restore exits 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "All three execute add-session.js under jsdom (no source-slicing), survive an internal rename, fail on an observable-output change, and modify no assets/*; npm test stays green"
    requirement: "TEST-03"
    verification:
      - kind: integration
        ref: "npm test → 'Suite: 93 passed, 0 failed'; git status assets/ clean; __addSessionTestHooks unchanged"
        status: pass
    human_judgment: false

# Metrics
duration: 7min
completed: 2026-06-27
status: complete
---

# Phase 30 Plan 05: Export-Modal Characterization Summary

**Three EXECUTING jsdom real-page tests that pin the highest-risk, lowest-covered region of `assets/add-session.js` — the export modal (Phase 31 RFCT-02's extraction target) — through observable output only (`#exportEditor.value`, a clipboard-spy arg, the active-step class, label textContent, the `is-hidden` class, and the files-only share-mock call), replacing the source-slicing false-confidence anti-pattern (D-08/D-09/D-12).**

## Performance

- **Duration:** ~7 min
- **Tasks:** 3
- **Files created:** 3 (all under `tests/`); 0 production files modified

## Accomplishments
- `tests/30-export-markdown.test.js` (TEST-03c, F-C): loads `add-session.html` + `add-session.js` into jsdom, drives the REAL export path, and asserts the FILTERED builder via `#exportEditor.value` (after `#exportStep1Rows` checkboxes → `#exportNextBtn`) — insights-after-trapped (the 260615 fix), inclusion, and that unticking insights excludes it — plus the FULL builder via a `navigator.clipboard.writeText` spy (forced `isSecureContext`) on the `copySessionBtn` path, a separate explicit assertion.
- `tests/30-export-stepper.test.js` (TEST-03d, F-I): asserts the observable active-step class transitions 1→2→3 via `#exportNextBtn`, the step-1 section filter rebuilt-on-Next into `#exportEditor.value` (NOT live-on-toggle — explicitly asserts the editor stays empty after a toggle), and the files-only `navigator.share` dispatch (260615 bug #1) via `createShareMock`, with the REAL jsPDF/PDFExport loaded into the page window.
- `tests/30-section-visibility.test.js` (TEST-03, F-E/D-13c): a thin guard for the settings→add-session link — a custom `getSectionLabel` rendering into the live `.label[data-i18n]` textContent (`applySectionLabels`) and a disabled section hiding on a new session (`applySectionVisibility`), each with an enabled/uncustomized control, driven via the captured `app:settings-changed` listener.
- All three use the async capture-and-await handler pattern with an end-of-file assertion-count guard (no vacuous green — F-A) and were verified falsifiable (a targeted production-code regression exits each non-zero; restore exits 0).
- `npm test` stays green (93 files passed, 0 failed); no `assets/*` modified; `window.__addSessionTestHooks` not widened.

## Task Commits

Each task was committed atomically:

1. **Task 1: Export markdown characterization (executing, F-C)** — `364f9f7` (test)
2. **Task 2: Export-modal stepper state machine + share dispatch** — `d576dc6` (test)
3. **Task 3: Thin section-visibility + custom-label cross-module guard** — `f5112b8` (test)

## Files Created/Modified
- `tests/30-export-markdown.test.js` (NEW) — executing FILTERED (`#exportEditor.value`) + FULL (clipboard spy) markdown-builder characterization.
- `tests/30-export-stepper.test.js` (NEW) — executing stepper state-machine + filtered-editor + files-only share characterization (real jsPDF/PDFExport in-page).
- `tests/30-section-visibility.test.js` (NEW) — thin executing `applySectionVisibility`/`applySectionLabels` cross-module guard.

## Decisions Made
- Anchored the two builders to their distinct observability paths (editor value vs clipboard spy) per F-C, rather than letting "preview/copy output" hand-wave them together.
- Kept the severity pair real-only (F-B): supplied a DOM-node no-op `createSeverityScale` purely so init does not throw; asserted no severity behavior (that is 30-06's job).
- For the share path, loaded the REAL jsPDF/PDFExport into the page window by mirroring `jsdom-pdf-env`'s eval order AND preloading the dep `<script src>` tags — without the tags, `pdf-export.js`'s `loadScriptOnce` waits on a jsdom `onload` that never fires and `buildSessionPDF` hangs.

## Deviations from Plan
None — plan executed as written. Two harness specifics the plan's actions implied but did not spell out: a `window.matchMedia` stub (jsdom omits it; add-session uses it for the accordion + export mobile-tabs layout) and the dep `<script src>` preload for the in-page PDF build. Both are test-only scaffolding (Rule 3 blocking-issue fixes), no production change.

## Issues Encountered
- `buildSessionPDF` initially hung under jsdom — root-caused to `loadScriptOnce` resolving only when a matching `<script src>` already exists in the DOM (the green PDF tests preload those tags); fixed by preloading the four dep srcs.

## User Setup Required
None — test-only files under `tests/`; no production change, no external service.

## Known Stubs
None that gate the plan's goal. The App-stub-sourced labels/headings are an intentional, documented characterization boundary (F-J), not an unwired stub — see below.

## Next Phase Readiness
- F-J limitation (carried into success criteria): the section labels/headings these tests observe come from the App STUB and `App.initCommon` is a no-op, so green here means add-session's ORCHESTRATION/ORDERING is preserved — NOT that the therapist-visible custom-title export TEXT (produced by the real `settings.js` writer) is correct. The Phase 31 D-13c glue cleanup could regress the real end-to-end output while these tests stay green; that text is out of Phase 30's observable reach without running the real `settings.js` writer.
- The export modal (RFCT-02) now has a pre-refactor green baseline guarded by executing observable-behavior tests that survive an internal rename. No `assets/*` modified. No blockers.

---
*Phase: 30-test-harness-coverage*
*Completed: 2026-06-27*

## Self-Check: PASSED
- All created files present (tests/30-export-markdown.test.js, tests/30-export-stepper.test.js, tests/30-section-visibility.test.js, 30-05-SUMMARY.md)
- All task commits exist in git history (364f9f7, d576dc6, f5112b8)
