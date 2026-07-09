---
phase: 41-replayable-guided-tour
plan: 10
subsystem: guided-tour
tags: [tour, engine, steps, settings-first, tab-activation, deixis]
status: complete
requires:
  - "41-09 (12-anchor v3 data-tour contract — the anchors STEPS[] binds to)"
  - "41-11 (help.tour.step.* 12-key i18n contract — the keys STEPS[] binds to)"
  - "41-STORYLINE.md v3 §3 (the 12-step settings-first spine + order)"
provides:
  - "12-step v3 STEPS[] engine composition (settings-first) driving the whole tour"
  - "per-step tab-activation capability (render clicks step.activate before measuring the anchor)"
  - "save-step export glyph (compile-time-literal inline SVG in the tooltip — honest deixis)"
affects:
  - "41-13 (EN/HE storyline human-verify replay reads this recomposed spine)"
tech-stack:
  added: []
  patterns:
    - "declarative STEPS[] with an optional per-step activate selector (read-only view switch on entry)"
    - "compile-time-literal inline SVG via innerHTML, zero interpolation (mirrors app.js '?' glyph, T-41-01)"
key-files:
  created:
    - tests/41-tab-activation.test.js
  modified:
    - assets/tour.js
    - tests/41-launch-explicit.test.js
    - tests/41-resume-state.test.js
decisions:
  - "Two comment mentions of the 'innerHTML' token reworded to 'raw-markup assignment' so the exactly-one-innerHTML grep gate reads 1 (the assignment only) — mirrors the 41-09 comment-token fix; no behavior change."
  - "Fields step index (3) hard-coded as a named constant in the activation test with a fixture-assumption assert on steps[3].id === 'fields' + steps[3].activate, so a future reorder fails loudly rather than silently testing the wrong step."
metrics:
  duration: ~12min
  completed: 2026-07-09
  tasks: 3
  files: 4
---

# Phase 41 Plan 10: Recompose Tour Engine to the v3 12-Step Spine + Tab Activation Summary

Recomposed `assets/tour.js` STEPS[] to the Ben-approved 41-STORYLINE.md v3 settings-first spine (12 steps: overview → settings → personalize → fields → snippets → nav → session-setup → session-heart → session-save → nav-sessions → backup → help), added the per-step tab-activation capability the Settings walk-in needs (render clicks the settings tab button before measuring the anchor, so the hidden Fields/Snippets panels are truly on screen), and inlined the export glyph in the save-step tooltip so "this is its icon" is literally true — closing the composition half of the storyline fix (anchors were 41-09, copy was 41-11).

## What Was Built

- **Task 1 — STEPS[] recomposition + tab activation (assets/tour.js, tests/41-launch-explicit.test.js):** STEPS[] rebuilt to the 12 v3 entries in storyline order — dropped the two home-page button steps (add-client/add-session) and the Reporting step, inserted the Settings chapter (personalize/fields/snippets/nav) at the front after a new `settings` gear step, re-anchored the Sessions arrival to `nav-sessions`, and moved backup/help onto sessions.html (page-agnostic dynamic chrome). Steps 3-5 carry an `activate` selector (`#settingsTabPersonalizeBtn` / `#settingsTabFieldsBtn` / `#settingsTabSnippetsBtn`). `render()` gained a null-safe activation block (clicks `step.activate` before `document.querySelector(step.anchor)`); a missing button is a guarded no-op so the degradation branch is unchanged. Module banner updated to the 12-step spine + activation capability. launch-explicit length assertion bumped 10 → 12.
- **Task 2 — save-step export glyph (assets/tour.js):** `renderSpotlight` appends a `<span class="sg-tour-glyph">` after the body, gated to `step.id === 'session-save'`, whose innerHTML is a single compile-time-literal export SVG (stroke=currentColor, viewBox 0 0 24 24, 18px, zero interpolation) — the one sanctioned raw-markup assignment (T-41-01). TRUST BOUNDARY banner corrected: no longer claims "No inline SVG is used".
- **Task 3 — test realignment + new behavior test (tests/41-resume-state.test.js, tests/41-tab-activation.test.js):** resume-state sub-tests A/B realigned to the new first cross-page boundary (step 1 settings/index.html → step 2 personalize/settings.html), using `steps[1].page !== steps[2].page` as the fixture assumption and landing on settings.html with resume stepIndex 2. NEW `tests/41-tab-activation.test.js` proves (1) the activation click fires before measurement (counter === 1, spotlight mounts) and (2) a missing anchor after activation still yields the centered fallback modal with no step-index advance.

## Contract Binding (no drift)

- **Anchors (41-09):** all 12 STEPS[].anchor values match the v3 data-tour set exactly — overview, settings, personalize, fields, snippets, nav, session-setup, session-heart, session-save, nav-sessions, backup, help. No `data-tour="begin"`, no `data-tour="nav-reporting"`.
- **i18n keys (41-11):** all 12 STEPS[].i18nKey suffixes match the help.tour.step.* set — overview, settings, personalize, fields, snippets, ready, setup, heart, save, sessions, backup, help. (nav step → `.ready`, nav-sessions step → `.sessions`.)
- **activate selectors:** bind to the settings.html tab-button ids confirmed in settings.html lines 60-62.

## Verification

- `node tests/41-launch-explicit.test.js` → 3/3 PASS (STEPS length now 12).
- `node tests/41-fallback-degradation.test.js` → 3/3 PASS (stepIndex-4 = snippets/./settings.html read dynamically; activation is a guarded no-op with the tab absent).
- `node tests/41-resume-state.test.js` → 4/4 PASS (index→settings boundary).
- `node tests/41-tab-activation.test.js` → 2/2 PASS (activation fires before measurement; degradation unchanged).
- `node tests/41-lang-rerender.test.js` → 3/3 PASS.
- `node tests/run-all.js` → **153 passed, 0 failed, 153 total** (was 152; the new activation test adds one passing file).
- Grep gates: `id: 'settings'|'personalize'|'fields'|'snippets'|'nav'|'nav-sessions'` each = 1; `help.tour.step.ready` = 1; `help.tour.step.reporting` = 0; old add-client/add-session/reporting/sessions anchors = 0; `activate:` = 3; `settingsTabFieldsBtn` = 1; exactly one `innerHTML` (the glyph assignment); "No inline SVG is used" = 0; zero literal hex colors; `RESUME_KEY = 'sg.tourResume'` intact.

## Deviations from Plan

### Auto-fixed / adjustments

**1. [Rule 3 - Blocking] Comment mentions of the "innerHTML" token reworded to satisfy the exactly-one-innerHTML gate**
- **Found during:** Task 2 verification.
- **Issue:** Task 2's acceptance requires `grep -c "innerHTML" assets/tour.js` = 1 (exactly the glyph assignment). The banner note and the inline comment I first wrote each used the literal word "innerHTML", making the count 3.
- **Fix:** Reworded both comments to "raw-markup assignment" (meaning preserved); only the actual `glyph.innerHTML =` assignment now matches. This is the same class of comment-token fix recorded in the 41-09 summary; no behavior or scope change.
- **Files modified:** assets/tour.js.
- **Commit:** b5f6bc7

## Known Stubs

None. STEPS[] is fully composed against the shipped 41-09 anchors and 41-11 copy; the glyph is a static literal.

## Self-Check: PASSED

- assets/tour.js, tests/41-launch-explicit.test.js, tests/41-resume-state.test.js FOUND and modified; tests/41-tab-activation.test.js FOUND (created).
- Commits present: 35718da (Task 1), b5f6bc7 (Task 2), 3d3f02b (Task 3).
- Full suite green (153/153).
