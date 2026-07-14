# Phase 46: Rich-Text Toolbar Editor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-14
**Phase:** 46-rich-text-toolbar-editor
**Areas discussed:** Toolbar design & scope, Live preview UX, List editing mechanics, Phase-45 UAT carryovers, Export-modal room-to-edit (folded todo)

---

## Toolbar design & scope

| Option | Description | Selected |
|--------|-------------|----------|
| Attached to focused field | One toolbar docked above the focused note field, hides when none active | ✓ |
| Persistent per field | Every note field permanently shows its own toolbar row | |
| One sticky form-level bar | Single pinned toolbar acting on the focused field | |

**User's choice:** Attached to focused field (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Same docked toolbar | Compact icon row above the active field on mobile too | ✓ |
| Keyboard-accessory bar | Pinned above the iOS virtual keyboard (visualViewport-tracked) | |
| You decide | Planner/UI-SPEC choice | |

**User's choice:** Same docked toolbar (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| No — note fields only | Step 2 stays a plain markdown power-edit surface | |
| Yes — full toolbar | Same toolbar in Step 2, heading-collision risk accepted | ✓ (with addition) |
| Yes — inline-only subset | Bold/italic only in Step 2 | |

**User's choice:** Full toolbar, PLUS (freeform) an info-styled note (blue/informational) telling users Step-2 edits affect only this export, never the saved session — gone when the dialog closes; licenses free restructuring for one-off exports.

| Option | Description | Selected |
|--------|-------------|----------|
| Full toggle | Unwrap markers on formatted selection; caret-inside insert with no selection | ✓ |
| Insert-only | Always insert markers; manual un-bolding | |
| You decide | Planner choice within "no marker garbage" | |

**User's choice:** Full toggle (recommended)

**Notes:** On the continuation check Ben asked (freeform) whether deeper UI detail should be a mockup discussion — resolved as: UI details go to the mandatory /gsd-ui-phase UI-SPEC, which must include an interactive HTML mockup for sign-off BEFORE planning ("important to see later the UI before accepting").

---

## Live preview UX

| Option | Description | Selected |
|--------|-------------|----------|
| Live pane under field | Rendered panel below the textarea, updates while typing | ✓ |
| In-place swap | Toggle flips textarea into rendered view and back | |
| Side-by-side split | Editor left, render right | |

**User's choice:** Live pane under field (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Per-field | Each field's toolbar has its own preview toggle | ✓ |
| Global switch | One control flips all fields | |
| Both | Per-field + form-level preview-all | |

**User's choice:** Per-field (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Toolbar btn, resets | Eye icon in toolbar; pane closes on leaving the field | ✓ |
| Toolbar btn, sticky | Stays on for subsequently focused fields | |
| You decide | Planner/UI-SPEC choice | |

**User's choice:** Toolbar button, resets (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep existing tabs | Step 2 keeps its Edit/Preview tab swap | (✓ merged into redesign) |
| Unify on live pane | Replace tabs with under-editor live pane | |
| You decide | Planner/UI-SPEC choice | |

**User's choice:** (freeform) Redesign Step 2 entirely — the current window is too small for a session's content; maximize the editing surface with a big dedicated window (almost whole session visible, minimal scrolling); KEEP a swap switcher (a live pane would cost surface), possibly with a keyboard shortcut; UI-SPEC must offer visual alternatives for an eyes-on decision.

---

## List editing mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| Buttons + Tab keys | Toolbar buttons AND Tab/Shift+Tab on list lines only | ✓ |
| Toolbar buttons only | No Tab behavior change anywhere | |
| You decide | Planner choice within touch + no-trap constraints | |

**User's choice:** Buttons + Tab keys (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Outdent one level | Empty nested item steps up one level per Enter | ✓ |
| Exit immediately | Any empty item drops out of the whole list | |
| You decide | Planner choice | |

**User's choice:** Outdent one level (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Increment, no re-pass | Enter writes next number; no renumbering on mid-list edits | |
| Full auto-renumber | Any list edit renumbers following items | ✓ |
| Always write '1.' | Markdown-canonical lazy numbering | |

**User's choice:** (freeform) Full auto-renumber — cut/paste reordering must stay trivial; raw text must match the real sequence. Follow-up: Ben's "feels impossible without live-like-Word" concern was untangled (live text mechanics ARE in-textarea; styling is live in the preview pane; WYSIWYG stays locked out). Ben locked the suggestion WITHOUT capturing WYSIWYG as a deferred idea; needs to feel it in the typable mockup.

---

## Phase-45 UAT carryovers

| Option | Description | Selected |
|--------|-------------|----------|
| Keep lock + disclose | Italic flattens; tooltip + export-modal note | |
| Reopen: research italic face | Promote RTXT-F2, feasibility-gated (Rubik Italic candidate); fallback = disclosure | ✓ |
| Drop italic from toolbar | Remove italic button + Cmd/Ctrl+I from v1.4 | |

**User's choice:** Reopen — Ben remembered the decision as "we need to supply this font"; the record (2026-07-11 lock, 2026-07-13 disclosure leaning) said otherwise; contradiction surfaced with evidence and Ben chose to reopen. REQUIREMENTS.md amended 2026-07-14 (locks paragraph + RTXT-F2 entry).

| Option | Description | Selected |
|--------|-------------|----------|
| Flush-left, standard | Hierarchy via size/weight; matches shipped PDF register | ✓ |
| CSS indent | Visual-only indent + PDF register change + UI-SPEC amendment | |

**User's choice:** Flush-left, standard (recommended)

---

## Export-modal room-to-edit (folded todo)

| Option | Description | Selected |
|--------|-------------|----------|
| Near-fullscreen default | Step 2 always opens ~90–95% viewport | |
| Expand toggle | Current size + expand button to near-fullscreen | |
| Drag-resizable modal | Corner handle + persistence | |

**User's choice:** (freeform) Undecided between ~50/70/80% bigger-by-default (concerns: gap vs. small Step 1; must not look like a separate app) and current-size + clearly visible maximize toggle to ~90% with rearranged layout — BOTH go to the UI-SPEC as visual alternatives; Ben decides at the mockup gate.

| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen takeover | Step 2 = 100% w/h editing surface on small viewports | ✓ |
| Keep current mobile size | Desktop-only treatment | |
| You decide | Planner/UI-SPEC choice | |

**User's choice:** Full-screen takeover (recommended)

---

## Claude's Discretion

- Toolbar DOM/positioning mechanism (RTL physical-coords pitfall noted), preview debounce, auto-format/renumber implementation within the undo/caret constraint, i18n key naming, info-note styling within tokens, Step-2 keyboard shortcut, feasibility thresholds for the italic-face research (researcher proposes, Ben confirms at plan review), guided-tour step (decided at planning per REQUIREMENTS Process Notes).

## Deferred Ideas

- None — Ben explicitly declined new deferrals (WYSIWYG instinct addressed in-scope via live mechanics + preview pane, not deferred).
