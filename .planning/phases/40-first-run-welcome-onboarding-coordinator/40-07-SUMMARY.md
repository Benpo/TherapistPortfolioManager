---
phase: 40-first-run-welcome-onboarding-coordinator
plan: 07
subsystem: help-entry-ui
tags: [ui, cleanup, gap-closure, help, css-reset, uat]
gap_closure: true
requires:
  - "Phase 39 '?' help entry (renderNav + initHelpEntry popover, .help-entry-item)"
provides:
  - "Single '?' help affordance in the header (no duplicate Help nav pill)"
  - "Native-<button> reset on .help-entry-item so button rows match anchor rows"
affects:
  - assets/app.js
  - assets/app.css
  - tests/39-help-entry.test.js
tech-stack:
  added: []
  patterns:
    - "Native control reset (appearance + -webkit-appearance + border 0 + background transparent) to normalize <button> vs <a> rows"
    - "font: inherit ordered BEFORE font-size in a shorthand-reset rule to preserve the intended size"
    - "Removal-regression test guard (assert querySelector === null) replacing a presence assertion"
key-files:
  created: []
  modified:
    - assets/app.js
    - assets/app.css
    - tests/39-help-entry.test.js
decisions:
  - "nav.help i18n key left DEFINED (now unused) in all 4 locales — removing it would touch he/de/cs, out of scope (Phase 42.1 owns locale work); unused key keeps 4-locale parity gates green"
  - "-webkit-appearance retained alongside appearance per project memory (Chromium-only checks have missed Safari-only rendering bugs)"
metrics:
  duration: 6min
  tasks: 2
  files: 3
  completed: 2026-07-08
status: complete
---

# Phase 40 Plan 07: Help-Entry Visual Gap Closure Summary

Removed the duplicate green "Help" nav pill so the header shows a single "?" help affordance, and reset native `<button>` chrome on `.help-entry-item` so the popover's action row no longer renders as a grey "preselected" box — button rows now match the anchor rows in light and dark.

## What Was Built

Two UAT visual gaps in the Phase 39 D-09 "?" help popover (ONBD-02), closed as a gap-closure plan:

1. **Task 1 — Nav pill removal (MINOR).** `renderNav()` in `assets/app.js` hardcoded an `<a href="./help.html" data-nav="help" data-i18n="nav.help">Help</a>` (added in Phase 39 alongside the "?" entry) that duplicated the "?" icon button. Deleted that single anchor line; every other nav entry and the generic `a[data-nav]` active-state loop are untouched (no help-specific active handling existed there — the "?" button keeps its own `is-active` handling in `initHelpEntry()`). The `nav.help` i18n key stays defined in all four locales (now unused, harmless, keeps parity gates green). Test #1 in `tests/39-help-entry.test.js` was flipped from a presence assertion to a **removal-regression guard** (asserts `#nav-placeholder a[data-nav="help"]` is `null`), with its title and header-comment bullet updated. Tests #2–#6 (the surviving "?" entry) left as-is.

2. **Task 2 — Button chrome reset (COSMETIC).** The popover's action row is a native `<button>` sharing `.help-entry-item` with the `<a>` link rows, but the class never reset native button chrome, so it rendered as a grey bordered box ("preselected") in both themes (40-UAT.md test 2). Added `appearance: none`, `-webkit-appearance: none` (Safari/WebKit), `background: transparent`, `border: 0`, `width: 100%`, `cursor: pointer`, and `font: inherit` — with `font: inherit` placed BEFORE the existing `font-size: 0.9rem` so the shorthand doesn't clobber the row size. All existing declarations and the `.help-entry-item:hover` rule are unchanged, so hover still reads on both element types. Token-only, logical properties preserved.

## Key Decisions

- **nav.help key kept defined (unused) in all 4 locales.** Removing it would require editing i18n-he/de/cs (locale translation work deferred to Phase 42.1, out of scope). An unused-but-present key is harmless and keeps the standing 4-locale parity gates green. Confirmed via grep that no consumer other than the removed anchor referenced `nav.help`.
- **-webkit-appearance retained alongside appearance.** Project memory records that Chromium-only visual checks have missed Safari-only rendering bugs; the prefix ensures WebKit also drops native button chrome.
- **font: inherit ordered before font-size.** The `font` shorthand would otherwise reset size to the inherited value and make button rows a different size than anchor rows.

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes, no authentication gates, no architectural decisions.

## Verification

- `grep -c 'data-nav="help"' assets/app.js` → `0` (no Help nav anchor emitted).
- `grep -rn 'nav.help' assets/ *.html` → only the four locale definitions remain (no live consumer).
- `node tests/39-help-entry.test.js` → 6 passed, 0 failed (test #1 now guards the removal; #2–#6 guard the surviving "?" entry).
- CSS reset assertion (all 7 declarations present in the `.help-entry-item` rule) → `button reset present`.
- `node tests/run-all.js` → Suite 144 passed, 0 failed.

**Deferred (human on-device):** open the "?" menu in light AND dark, Chromium AND Safari (WebKit) — confirm the action row no longer looks grey/preselected, matches the anchor rows, and `:hover` highlights identically on both a link row and the button row. This is the plan's `<human-check>` item and is left for the phase UAT pass.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: assets/app.js
- FOUND: assets/app.css
- FOUND: tests/39-help-entry.test.js
- FOUND commit: 21d42f5 (Task 1 — nav pill removal)
- FOUND commit: 1467c93 (Task 2 — button chrome reset)
