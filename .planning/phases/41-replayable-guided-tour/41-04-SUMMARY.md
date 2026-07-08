---
phase: 41-replayable-guided-tour
plan: 04
subsystem: guided-tour
tags: [tour, i18n, rtl, onboarding, help, css, tdd]
requires:
  - "assets/tour.js Plan-03 engine (render/clearTourChrome/endTour/isActive seams)"
  - "help.tour.* i18n keys (Plan 01, all 4 locales)"
  - "app:language CustomEvent dispatched by app.js:126 on setLanguage"
provides:
  - "TOUR-04 mid-tour language re-render (cleanup-then-replace, subscribed once)"
  - "sg.tourRemindLater / sg.tourNeverRemind localStorage flags (exit choice, D-08)"
  - "sg.tourCompleted localStorage flag (finish card, D-10)"
  - "finish-card help-center handoff (./help.html) + first-action links"
  - "small-screen bottom-sheet branch (<=640px, D-05)"
affects:
  - "Plan 05 coordinator reminder reads sg.tour* flags"
  - "Plan 07 WebKit gate verifies RTL geometry of the re-render + bottom-sheet"
tech-stack:
  added: []
  patterns:
    - "once-only document listener guarded by a module flag (mirrors initHelpEntry._listenerInstalled)"
    - "cleanup-then-replace re-render (render() tears down chrome then rebuilds so copy re-resolves via t())"
    - "post-run surfaces (exit/finish) own their own root node, torn down independently of the main tour chrome"
key-files:
  created:
    - "tests/41-lang-rerender.test.js"
  modified:
    - "assets/tour.js"
    - "assets/tour.css"
decisions:
  - "Close ends the run (endTour → resume cleared, inactive) THEN mounts the exit choice — reconciles D-08 with the Plan-03 resume-state contract (test D expects Close → inactive + resume cleared)"
  - "Finish card and exit choice set active=false, so the app:language listener leaves these static post-run surfaces untouched (re-render only targets a live step)"
  - "Bottom-sheet evaluated at render time (window.innerWidth <= 640); live breakpoint-crossing re-toggle deferred (not test- or acceptance-required; geometry is Plan 07's domain)"
  - "Finish 'Add your first client' is the single accent action (reuses .sg-tour-btn-fwd); 'Start your first session' + 'Browse the help center' stay neutral"
metrics:
  duration_min: 8
  tasks: 3
  files: 3
  completed: 2026-07-08
status: complete
---

# Phase 41 Plan 04: Tour Polish Surfaces (language re-render, exit choice, finish card, bottom-sheet) Summary

Extended the bespoke tour engine with the four Plan-04 polish surfaces: TOUR-04 mid-tour language re-render via a once-subscribed `app:language` listener (cleanup-then-replace), the D-08 concise exit choice writing the coordinator reminder flags, the D-10 finish card with the help-center handoff, and the D-05 small-screen bottom-sheet — all text-level proven in jsdom, token-only, and RTL-safe.

## What Was Built

- **Task 1 (RED test)** — `tests/41-lang-rerender.test.js`: stubs two locales whose `help.tour.step.overview.*` values differ, starts the tour, dispatches a document `app:language` event, and asserts the mounted `.sg-tour-title` / `.sg-tour-body` textContent re-resolves to the new locale. Also pins single-listener idempotency (exactly one `app:language` listener at load; start/endTour cycles never stack more; repeated dispatch → one `.sg-tour-root`) and the inactive no-op. Text + node-identity only — no geometry (Plan 07 WebKit gate owns that). Authored RED (exit 1: A/B fail, C passes).
- **Task 2 (tour.js)** —
  - **Language re-render (TOUR-04):** module-level `installLangListener()` guarded by `_langListenerInstalled` subscribes once to document `app:language`; on fire, if a run is active, `render()` does cleanup-then-replace so all copy re-resolves via `t()` and geometry/arrow re-measure + re-flip for RTL. Inactive → no-op.
  - **Exit choice (D-08):** Close now calls `openExitChoice()` → `endTour()` (clears `sg.tourResume`, goes inactive) then mounts a concise two-button prompt: "Remind me later" sets `sg.tourRemindLater='1'`, "I'll explore myself" sets `sg.tourNeverRemind='1'`. Neither auto-runs the tour (TOUR-01 intact).
  - **Finish card (D-10):** the last step's forward action calls `mountFinish()` → sets `sg.tourCompleted='1'`, clears `sg.tourResume`, mounts a card with a `./help.html` handoff link, one accent `./add-client.html` action, and a neutral `./add-session.html` action.
  - **Bottom-sheet (D-05):** `isBottomSheet()` (≤640px) toggles `.sg-tour-bottom-sheet` + `data-arrow="none"` on the tooltip; `positionSpotlight()` skips all tooltip-collision math for the sheet while still positioning the spotlight on the anchor.
- **Task 3 (tour.css)** — added the exit-choice prompt, the finish card (Display `1.75rem`/700 headline via `--text-display`, centered airy rhythm, full-width actions), and the `@media (max-width: 640px)` bottom-sheet (`inset-inline:0`, bottom-pinned, top-corner radii only, no arrow). Logical properties + semantic tokens only; no literal hex, no physical `left`/`right`; 44px tap targets and 2px accent focus-visible inherited from the shared button rules; dark mode resolves via token vars.

## Verification

- `node tests/41-lang-rerender.test.js` exits 0; all Plan-03 tests (`41-launch-explicit`, `41-fallback-degradation`, `41-resume-state`, `41-anchor-presence`, `41-tour-i18n-parity`) stay green.
- `node tests/run-all.js` → **150 passed, 0 failed** (was 149; +1 for the new re-render test).
- Acceptance greps: `app:language`×4, `_langListenerInstalled`×3, each `sg.tour*` flag ≥2, `help.tour.finish`×5, all three finish links present; no `innerHTML` in tour.js.
- tour.css: `@media`×1, zero literal hex, zero physical `left:`/`right:`, finish headline uses the Display `1.75rem` token.
- **D-08 prohibition (resolved):** `sg.tourRemindLater` / `sg.tourNeverRemind` / `sg.tourCompleted` are tour-scoped and disjoint from the security-note keys (`securityGuidanceDismissed`, `securityNoteEligible`) — verified by grep.

## Deviations from Plan

None that changed scope. One reconciliation worth recording (not a deviation from intent): the plan text says "the Close control opens the exit choice", while the Plan-03 `41-resume-state` test D asserts that clicking Close leaves the tour inactive with `sg.tourResume` cleared. Both are satisfied by ending the run first (`endTour()`) and then mounting the exit choice as an independent post-run surface — the exit choice is what the user sees, and the flags/inactive state the Plan-03 contract requires both hold.

## Notes / Out of Scope (by design)

- RTL geometry, arrow re-flip, and bottom-sheet pixel layout of the re-render are verified in the **Plan 07 WebKit gate**, not here (jsdom has no layout engine).
- Live breakpoint-crossing re-toggle of the bottom-sheet (resize across 640px mid-step) is not re-rendered; the branch is evaluated at render time. Not acceptance- or test-required.
- HE/DE/CS tour copy was authored in Plan 01 and is flagged for the Phase 42.1 native-speaker pass (TOUR-01) — unchanged here.

## Self-Check: PASSED

- Files verified on disk: `tests/41-lang-rerender.test.js`, `assets/tour.js`, `assets/tour.css`, `41-04-SUMMARY.md`.
- Commits verified: `9d26280` (RED test), `d4c2478` (tour.js), `5b87919` (tour.css).
