---
phase: 46-rich-text-toolbar-editor
plan: 15
subsystem: export-editor-layout
tags: [css, export, rich-toolbar, webkit-probe, gap-closure, layout]
status: complete
requires:
  - phase: 46-11
    provides: labelled Preview/Edit toggle on the persistent export toolbar
  - phase: 46-14
    provides: real-device re-run that surfaced gaps 10 and 11
provides:
  - Export Step-2 default surface sized by the EDIT surface (min-block-size floor) so it is usable on laptop viewports
  - Persistent export formatting toolbar that is never compressed/clipped and never scrolls out of view (flex-shrink:0 + sticky pin)
  - Falsifiable Playwright-WebKit layout probe (RED against pre-fix app.css, GREEN after) for export Step-2 geometry
affects: [46-16 (real-device human-verify gate)]
tech-stack:
  added: []
  patterns:
    - "Dual-declared (vh fallback + dvh) min-block-size floor with an inner min(...,90vh/90dvh) cap so a growth floor can never exceed the modal max-height on any viewport"
    - "Pin a persistent toolbar that lives inside an overflow-y:auto scroll container with position:sticky + inset-block-start:0 (logical, direction-neutral) + flex-shrink:0"
    - "Ad-hoc Playwright-WebKit layout probe modelled on tests/webkit/41-rtl-geometry.mjs — pinned local Playwright, static repo server, RED-then-GREEN falsifiability"
key-files:
  created:
    - tests/webkit/46-export-step2-layout.mjs
    - .planning/phases/46-rich-text-toolbar-editor/46-15-SUMMARY.md
  modified:
    - assets/app.css
decisions:
  - "640px floor (not 600px): at 600px the scroll-pin assertion C had only ~20px of overflow headroom (borderline vacuous); 640px gives real headroom while the 50dvh-wins crossover only moves from 1200px to 1280px viewport height, preserving the ratified ~50% tall-screen look"
  - "Floor is inner-capped min(640px, 90vh/90dvh) so it can never exceed the modal's own max-height on any viewport — protects the @media (max-width:768px) 100dvh full-screen takeover from being forced taller than the screen"
  - "Toolbar pinned with a logical property (inset-block-start) so the pin is RTL-safe; the base .rich-toolbar already supplies the opaque surface background + popover z-index, so no new colour/token was needed"
  - "Probe assertion D (maximize reaches ~90dvh) is a REGRESSION GUARD, not part of the RED evidence — the RED proof rests on A/B/C only"
  - "No version bump (stays 1.4.0), no JS/i18n/sw.js change — these are layout bug fixes to behaviour already documented for v1.4.0, so no help/changelog rewrite and no new docs-gate trailers"
metrics:
  duration_min: 20
  completed: 2026-07-15
  tasks: 2
  files: 2
  suite: 190/190
---

# Phase 46 Plan 15: Export Step-2 Layout Floor + Pinned Toolbar Summary

**One-liner:** Made the export Step-2 edit surface (not the card) the sizing floor via a capped `min-block-size` and pinned the persistent formatting toolbar with `flex-shrink:0` + `position:sticky`, so the default surface is usable on laptop viewports and the toolbar is always visible — proven RED→GREEN by a new falsifiable Playwright-WebKit layout probe, with the jsdom suite still 190/190.

## What Was Done

### Task 1 — falsifiable WebKit layout probe (`tests/webkit/46-export-step2-layout.mjs`, NEW)

An ad-hoc Playwright-WebKit probe modelled on `tests/webkit/41-rtl-geometry.mjs`
(pinned local Playwright via `createRequire`, tiny static repo server with a
path-traversal guard, `assert()`/`failures` accounting, `process.exit(0)` only when
every assertion passes). It loads `add-session.html` with the app-shell gate
localStorage set, reproduces the production export Step-2 state (`#exportModal`
shown, `.export-card.is-editor-step`, step-2 `.is-active`, persistent `RichToolbar`
docked above `#exportEditor`), fills `#exportEditor` with a 64-line document and
fires a real `input` event, then asserts:

- **A — toolbar unclipped:** `bar.height >= 40` AND `bar.clientHeight >= bar.scrollHeight - 2`.
- **B — editor usable:** the VISIBLE (rect-intersection) editor height `>= 140px`.
- **C — toolbar pinned:** HARD-asserts the edit area genuinely overflows
  (`scrollHeight - clientHeight > 20`; opens the preview pane via the toolbar's
  `data-action="preview"` button as a fallback to force overflow if the fill path
  does not), then after `scrollTop = scrollHeight` the bar is still fully inside the
  visible edit region. **Never passes vacuously** — the overflow precondition is a
  hard assertion.
- **D — maximize regression guard (once, 1440x820):** with `.is-maximized` the card
  still reaches `>= 0.85 * viewport height`.

A/B/C run at **two viewports — 1440x820 and 1000x700** — plus a **German-locale**
(`portfolioLang=de`) pass at 1440x820 (the most verbose chrome). The file is NOT run
by `npm test` (the runner only globs top-level `tests/*.test.js`) and is NOT a
shipped asset, so it raises no docs demand. As a `tests/` file it may name gaps/plan
IDs in its header comments (matching `41-rtl-geometry.mjs`).

**RED evidence (probe against the UNMODIFIED app.css — A/B/C fail; D is a
regression guard, NOT part of the RED proof):**

```
[1440x820 EN]  A1 toolbar height >= 40      → FAIL height=10.0
               A2 not clipped               → FAIL clientHeight=8 scrollHeight=26
               B  visible editor >= 140     → FAIL visibleEditorHeight=21.4 (area height 39.4)
               C  toolbar pinned            → FAIL bar[278.6..288.6] area[497.6..537.0]
[1000x700 EN]  A1 → FAIL height=10.0 · A2 → FAIL 8/26 · B → FAIL visibleEditorHeight=-18.0 (area height 0)
               C  → FAIL bar[209.6..219.6] area[467.6..467.6]
[1440x820 DE]  A1 → FAIL height=10.0 · A2 → FAIL 8/26 · B → FAIL visibleEditorHeight=21.4
               C  → FAIL bar[278.6..288.6] area[497.6..537.0]
  → 12 assertions failed (A/B/C × 3 passes). C precondition PASSED everywhere
    (non-vacuous). D (maximize ~90dvh) PASSED — regression guard only.
```

This is the exact defect gaps 10/11 describe: a 10px clipped toolbar sliver
(`clientHeight 8 < scrollHeight 26`), an editor collapsed to ~21px (or gone, at
1000x700 the area is 0px tall), and a bar that scrolls out of the edit area.

### Task 2 — the scoped CSS fix (`assets/app.css`, MODIFIED)

Two additions, both gated to the export editor step; the shared `.modal-card` base,
the `.is-maximized.is-editor-step` rule, and the `@media (max-width:768px)` takeover
are byte-unchanged (confirmed by `git diff`).

1. `.export-card.is-editor-step` gains a dual-declared floor
   `min-block-size: min(640px, 90vh);` then `min-block-size: min(640px, 90dvh);`,
   keeping `block-size: 50dvh` as the preferred height. On tall screens (>=1280px)
   50dvh is larger and wins; on ~820-980px laptops the 640px floor grows the card so
   the chrome + a usable toolbar + a multi-line editor fit; the inner `90vh`/`90dvh`
   cap guarantees the floor can never exceed the modal max-height on any viewport.
2. A new rule scoped to `.export-card.is-editor-step .export-edit-area > .rich-toolbar`
   sets `flex-shrink: 0;` (never compressed/clipped), `position: sticky;` and
   `inset-block-start: 0;` (pinned to the top of the `overflow-y:auto` edit area).
   The base `.rich-toolbar` already supplies the opaque `background: var(--color-surface)`
   and `z-index: var(--z-popover)`. `> .rich-toolbar` matches ONLY the persistent
   export bar (which docks `beforebegin` `#exportEditor`, a direct child of the edit
   area); the 7 note-field toolbars live outside `.export-card` and are untouched.

No new class, token, or colour; logical properties only. app.css comments are plain
prose stating the constraint, with no planning identifiers (verified by grep).

**640px floor calibration (architect review):** at 600px the probe's scroll-pin
assertion C had only ~20px of overflow headroom (borderline vacuous); 640px gives
real headroom while the 50dvh-wins crossover only moves from **1200px → 1280px**
viewport height — the ratified ~50% tall-screen look is preserved.

**Load-bearing invariant (recorded, unchanged):** the three `min-block-size: 0`
declarations in the height-forwarding chain — `.modal-card-body` (as `min-height: 0`,
~1725), `.export-step.is-active` (~3390) and `.export-edit-area` (~3396) under
`.is-editor-step` — are load-bearing for the innermost-scroller/sticky-pin behaviour.
Removing any silently breaks the pin. This plan relies on them and did not touch them.

**GREEN evidence (probe against the FIXED app.css):**

```
[1440x820 EN]  A1 PASS · A2 PASS · B PASS · C precond PASS · C pin PASS
[1440x820 maximize-guard]  D PASS
[1000x700 EN]  A1 PASS · A2 PASS · B PASS · C precond PASS · C pin PASS
[1440x820 DE]  A1 PASS · A2 PASS · B PASS · C precond PASS · C pin PASS
  → ALL ASSERTIONS PASSED — export Step-2 layout gate GREEN (exit 0).
```

Full jsdom suite after the change: **`190 passed, 0 failed, 190 total`** (no regressions).

## Deviations from Plan

None — plan executed exactly as written. Rules 1–4 did not trigger. The RED run
matched the plan's prediction (A/B/C fail, D passes) and the C-overflow precondition
held non-vacuously via the fill path (the editor's `min-block-size: 240px` overflows
the collapsed area), so the preview-pane fallback was available but not needed to
force overflow in these runs.

## NOT in this round (residual, per the architect NOT-list)

- Step-2 chrome (title, step indicator, ephemeral-edit info note, helper line,
  actions row) is intentionally UNCHANGED — no slimming, no reflow.
- On wide desktop windows shorter than ~640px content height the editor stays
  constrained (the 90dvh cap binds), though the toolbar remains visible and pinned —
  accepted residual, revisit only if flagged at the 46-16 gate.

## Verification

- `node tests/webkit/46-export-step2-layout.mjs`: RED against pre-fix app.css
  (A/B/C fail at all three passes), GREEN after the fix (all A/B/C + D pass, exit 0).
- `node tests/run-all.js`: 190/190 green.
- `git diff assets/app.css`: only the two intended additions (23 insertions);
  `.is-maximized.is-editor-step` and the `@media (max-width:768px)` block unchanged.
- Real-device confirmation of gaps 10/11 deferred to the 46-16 human-verify gate.

## Commits

- `bb9bb83` test(46-15): add falsifiable WebKit probe for export Step-2 layout (RED)
- `c90155d` fix(46-15): make export edit surface the sizing floor + pin the toolbar (GREEN)

## Self-Check: PASSED

- FOUND: tests/webkit/46-export-step2-layout.mjs
- FOUND: assets/app.css (modified)
- FOUND commit: bb9bb83
- FOUND commit: c90155d
