---
created: 2026-07-07T12:30:00.000Z
title: Error-toast focus can land on a field clipped inside a collapsed mobile accordion (WR-03)
area: bug
priority: medium
recommended_entry: /gsd-quick
target_phase: v1.3 (or a quick fix before — Ben's call)
files:
  - assets/app.js
  - assets/app.css
  - tests/38-12-toast-tone-focus.test.js
source: Phase 38 full-phase code review (38-REVIEW.md WR-03, 2026-07-07) — deferred by Ben in favor of v1.2 milestone close-out
resolves_phase: 48
---

## Problem

The 38-12 error-toast API scrolls to and focuses the offending field (`options.focus`). On narrow/mobile widths the add-session form collapses sections into an exclusive accordion; collapsed sections are `max-height: 0; overflow: hidden` (app.css ~:2247). `#nextSessionDate` lives in the "Session Notes" section — if that section is collapsed when a save is blocked, `scrollIntoView()`/`focus()` target a clip-hidden field: the browser focuses an invisible element and nothing visibly happens. The self-locating half of the warning fix silently no-ops on the platform (mobile Safari) where partial typed dates are most likely. Desktop is unaffected (all sections expanded — why on-device UAT passed).

## Fix (direction)

In `showToast`'s focus handling (assets/app.js ~:866): before scrolling/focusing, find `focusTarget.closest('.accordion-section')` and, if collapsed, expand it (reuse the accordion's existing open/toggle mechanism — don't hand-set max-height), THEN scroll + focus. Generalizes to every field-bound error toast. Add a test scenario to tests/38-12-toast-tone-focus.test.js (collapsed-section stub → expanded before focus).

## Acceptance

- On a narrow viewport with the target field's accordion section collapsed, a blocked save expands the section, scrolls to and focuses the field.
- Desktop/expanded behavior unchanged; success toasts unchanged; suite green.
