---
created: 2026-07-06T00:00:00.000Z
title: Make the export modal (Step 2 editor) resizeable / roomier for editing
area: feature
priority: medium
recommended_entry: /gsd-discuss-phase
target_phase: TBD (or later — Ben's call during discuss-phase)
files:
  - add-session.html
  - assets/app.css
  - assets/add-session.js
source: Ben, during Phase 33 UAT (2026-07-06) — export-modal visual-fit check passed, but he flagged the modal is often too small to comfortably edit in
---

## Problem

The export modal's Step 2 is where the therapist edits the generated document before exporting. The inner `<textarea>` is resizable (`assets/app.css:1086` — `resize: vertical`), **but the modal card itself (`.modal-card`, `assets/app.css:1616`) is a fixed size.** So even when the user grows the textarea, the surrounding modal doesn't grow with it — the effective editing area stays cramped and the modal "sometimes is too small for actually editing stuff." This is most painful on smaller viewports / laptops.

Ben's words (2026-07-06): *"the export window could be resizeable — it sometimes is too small for actually editing stuff, even if the textbox is resizable."*

## Fix (direction — confirm in discuss-phase)

Give the user real room to edit in Step 2. Options to weigh:

1. **User-resizable modal** — make `.modal-card` (or a Step-2-specific variant) draggable/resizable at a corner, persisting the chosen size.
2. **Bigger/adaptive by default** — let the export modal grow toward the viewport (e.g. taller `max-height`, wider `max-width` in the Step-2 "edit" state) so the editor gets most of the screen, with the textarea flexing to fill it.
3. **Fullscreen/expand toggle** — an "expand" button that pops Step 2 to (near-)fullscreen for focused editing, collapsing back afterward.

Whichever is chosen, the inner textarea should flex to fill the available modal height rather than being independently resized in a fixed shell.

## Design questions for discuss-phase

1. **Which mechanism** — user-drag-resize, adaptive-larger-by-default, or an expand/fullscreen toggle? (Simplest high-value is likely #2 + textarea flex.)
2. **Persistence** — if user-resizable, remember the size across sessions (same settings store), or reset each open?
3. **Mobile/touch** — on small screens the modal is already ~full-width; the win there is vertical height + keyboard-aware layout, not corner-drag.
4. **Scope creep guard** — does this apply only to the export modal, or should other modals (crop, confirm) inherit the same resize affordance? Keep it export-only unless there's a reason.
5. **RTL/locale** — resize handle placement and any new chrome must behave in RTL (Hebrew) too.

## Acceptance

- In Step 2 of the export modal, the user has visibly more room to edit than today (via resize, larger default, or expand toggle — per chosen direction).
- The inner editor fills the available modal space (no fixed cramped textarea inside a larger empty card).
- Works across DE/HE/EN/CS locales and in RTL.
- No regression to the Step 1→2→3 stepper flow, the "unsaved changes" confirm prompt (`#confirmModal` z-index coupling, `app.css:1600`), or the snippet-autocomplete popover that renders above the editor (`--z-popover`, `app.css:7`).

## Origin

Surfaced by Ben during Phase 33 (DE/CS i18n) UAT. The i18n visual-fit check passed; this is a separate, pre-existing ergonomics gap in the same modal, captured so it isn't lost. Not a Phase 33 gap.
