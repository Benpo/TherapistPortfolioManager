---
phase: 41-replayable-guided-tour
plan: 03
subsystem: guided-tour
status: complete
tags: [tour, engine, spotlight, fallback, resume, sessionstorage, rtl, tdd]

# Dependency graph
requires:
  - phase: 41-01
    provides: "39 help.tour.* copy keys (step titles/bodies + chrome + fallback) the engine resolves via t()"
  - phase: 41-02
    provides: "10 data-tour anchor attributes on always-present chrome (the STEPS[].anchor selector contract)"
provides:
  - "window.Tour bespoke IIFE engine: start()/resume()/isActive()/next()/prev() + injectable seams (_isAnchorVisible/_navigate/_currentPage/_render/_endTour/_getSteps/_getStepIndex/_setStepIndex)"
  - "10-step full-spine STEPS[] route across index/add-session/sessions/reporting bound to the Plan 02 data-tour anchors + Plan 01 help.tour.step.* keys"
  - "sg.tourResume sessionStorage resume tier (single tier; cleared on finish/close)"
  - "assets/tour.css — spotlight ring, inert overlay, tethered tooltip + RTL-safe arrow, centered fallback modal (token-only, logical props)"
  - "tests/41-launch-explicit.test.js, 41-fallback-degradation.test.js, 41-resume-state.test.js"
affects:
  - "Plan 41-04 (language re-render, exit choice, finish card, bottom-sheet build on this engine + CSS)"
  - "Plan 41-05 (wires Tour.resume() into initCommon + Tour.start() into launch surfaces)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Injectable visibility seam (_isAnchorVisible) so jsdom — which hardcodes offsetParent===null — can drive BOTH render branches (architect-gate A5)"
    - "Navigation seam (_navigate) + current-page seam (_currentPage) so behavior tests capture cross-page navigation without a real page load (jsdom-29 locks window.location)"
    - "Page-inert via a pointer-events overlay, NOT App.lockBodyScroll — spotlight steps keep scroll free so scrollIntoView reaches below-the-fold anchors (architect-gate A4)"
    - "Local token-scale block scoped to .sg-tour-root (architect-gate A8) — help.css is absent on most pages the tour loads on"

key-files:
  created:
    - assets/tour.js
    - assets/tour.css
    - tests/41-launch-explicit.test.js
    - tests/41-fallback-degradation.test.js
    - tests/41-resume-state.test.js
  modified: []

key-decisions:
  - "Seams are exposed on the returned `api` object and internal code calls api.* — so a test override of Tour._isAnchorVisible / _navigate / _currentPage actually affects the engine's own calls (unlike attention-coordinator's direct internal calls). This is what makes A5/A2/A3 falsifiable in jsdom."
  - "No inline SVG in this plan — step 6's export glyph is deferred; keeps innerHTML at zero (grep -c innerHTML == 0), the strongest form of the T-41-01 XSS mitigation."
  - "endTour() clears sg.tourResume and resets stepIndex to 0; resume() itself never clears (a mid-run reload still resumes within the session; only a fresh session with an empty sessionStorage restarts at step 1 — D-09)."
  - "prev() across a page boundary mirrors next() (persist resume + navigate) rather than being a within-page-only no-op, so back-stepping over a page seam still works."

requirements-completed: [TOUR-01, TOUR-02, TOUR-03]

# Metrics
duration: ~18min
completed: 2026-07-08
tasks: 3
files: 5
---

# Phase 41 Plan 03: Tour Engine Core Summary

Built the bespoke replayable guided-tour engine — `window.Tour` (`assets/tour.js`) plus its core surfaces (`assets/tour.css`) — porting the validated sketch-003 render loop to the 10-step full-spine cross-page route with a sessionStorage resume tier, proven by three write-first behavior tests.

## What Was Built

**Task 1 (RED behavior tests) — `92c4eb2`**
Three jsdom behavior tests authored failing (tour.js absent → each exits 1):
- `41-launch-explicit.test.js` — no-auto-run + explicit start (TOUR-01) AND the A2 page-aware start (off step-1's page → persist `sg.tourResume {stepIndex:0}` + navigate to `STEPS[0].page`, no chrome on the wrong page).
- `41-fallback-degradation.test.js` — drives BOTH render branches through the `Tour._isAnchorVisible` seam (A5): true→spotlight/no-fallback, false→fallback modal with step text + "Take me there" and `stepIndex` unchanged (no silent skip, TOUR-02); asserts Take-me-there persists `sg.tourResume` with the CURRENT stepIndex before navigating (A3).
- `41-resume-state.test.js` — cross-page `next()` round-trip, `resume()` continue-on-match, D-09 absent-key→step-1, and `endTour()` clears the resume key.

**Task 2 (GREEN engine) — `f50ac4a`**
`assets/tour.js`: bespoke IIFE `window.Tour` with a four-slot banner, the coordinator's `lsGet/lsSet/ssGet/ssSet/ssRemove` + `t()` idiom, and a declarative 10-entry `STEPS[]` (overview/add-client/add-session → index.html; session-setup/heart/save → add-session.html; sessions → sessions.html; reporting/backup/help → reporting.html) bound to the Plan 02 anchors + Plan 01 `help.tour.step.*` keys. `render()` calls the injectable `_isAnchorVisible` seam → spotlight ring + tethered tooltip (visible) OR centered fallback modal (missing). `start()` is page-aware (A2); `next()`/`prev()` persist `sg.tourResume` + navigate on a page crossing; `resume()` reads-and-continues only on a page match; `endTour()` clears the resume tier. A pointer-events overlay makes the page inert (A4) without freezing scroll; `scrollIntoView` + an rAF-debounced scroll/resize reposition track the anchor; `App.lockBodyScroll` is used ONLY on the fallback branch.

**Task 3 (CSS surfaces) — `62978f2`**
`assets/tour.css`: a local token-scale block on `.sg-tour-root` (A8) + the A10 `--z-tour-overlay:9000` / `--z-tour-tooltip:9100` tokens (deliberately above `--z-banner:500`), then the spotlight (accent ring + 9999px dim), inert overlay, tethered tooltip, RTL-safe logical arrow, and centered fallback modal. Token-only (no literal hex), logical properties only (no physical left/right), `--color-primary` reserved to the ring + forward button, 44px tap targets + focus-visible on every control.

## Verification

- `node tests/41-launch-explicit.test.js` / `41-fallback-degradation.test.js` / `41-resume-state.test.js` → all exit 0 (3+3+4 scenarios).
- `node tests/run-all.js` → 149 passed, 0 failed.
- tour.js greps: `window.Tour` ≥1, `_isAnchorVisible` present + `offsetParent` in default impl, `innerHTML` == 0, `scrollIntoView` ≥1, 10 distinct `[data-tour="…"]` anchors, `App.lockBodyScroll` confined to the fallback branch, `ssSet('sg.tourResume'` in both the start() off-page path and the take-me-there handler.
- tour.css greps: `var(--color-primary)` ×4 (≥2), `--tap-target-min` defined + used, `--z-tour-overlay`/`--z-tour-tooltip` defined + `var(--z-tour-tooltip)` used, zero literal hex, zero physical `left:`/`right:`.

## Deviations from Plan

None — plan executed exactly as written. (One clarifying choice: `prev()` across a page boundary mirrors `next()` rather than being within-page-only; documented as a key-decision, not a deviation.)

## TDD Gate Compliance

- RED gate: `test(41-03)` `92c4eb2` — three behavior tests authored failing (each exits 1, tour.js absent).
- GREEN gate: `feat(41-03)` `f50ac4a` — engine implemented, all three flip to exit 0, full suite green.
- No REFACTOR commit needed (a comment-only reword to keep `grep -c innerHTML == 0` was folded into the Task 2 verification before commit).

## Known Stubs

None — the engine renders live spotlight/fallback chrome from real STEPS + resolved i18n. Language re-render, exit choice, finish card, and bottom-sheet are explicitly Plan 04 scope (not stubs, not started here); launch-surface + coordinator wiring is Plan 05.

## Threat Flags

None. No new network surface, auth path, or schema change. The one trust boundary (i18n dict → tour DOM) is mitigated as designed: all copy via `textContent`, zero `innerHTML` (T-41-01). No package installs (T-41-SC N/A).

## Self-Check: PASSED

- Created files exist: `assets/tour.js`, `assets/tour.css`, `tests/41-launch-explicit.test.js`, `tests/41-fallback-degradation.test.js`, `tests/41-resume-state.test.js` — all FOUND.
- Commits exist: `92c4eb2` FOUND, `f50ac4a` FOUND, `62978f2` FOUND.
- All three behavior tests exit 0; full suite 149/149 green.

---
*Phase: 41-replayable-guided-tour*
*Completed: 2026-07-08*
