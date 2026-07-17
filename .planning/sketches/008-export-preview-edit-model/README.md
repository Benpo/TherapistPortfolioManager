---
sketch: 008
name: export-preview-edit-model
question: "Which interaction model makes preview/edit unmistakable in export Step 2 — and how does the whole export process feel around it?"
winner: null
tags: [export, preview, interaction, phase-46.1]
---

# Sketch 008: Export Preview/Edit Model (Phase 46.1, Gap 14)

## Design Question

The phase-46 device gate rejected the shipped concept (stacked editor+preview in one
scroll container; green is-active button labeled "Edit" reading inverted; manual scroll
escaping the mode). This sketch answers Ben's design contract with three dramatically
different models: which buttons to show, where the preview lives, how you get back to
edit (or whether they're integrated), how much space each part gets, and how the whole
Choose → Edit → Export process feels.

## How to View

open .planning/sketches/008-export-preview-edit-model/index.html

Each variant walks the FULL flow (Choose → Edit → Export) — click through the steps, type,
and try the step pills to jump around.

## Variants

- **A: Side-by-side live** — no preview mode exists; the rendered document always sits beside the editor, re-renders as you type, follows your scroll. Costs width: opens larger than the 007-ratified 50% (deliberate deviation — judge if the model earns it). Phone: stacked halves.
- **B: In-place swap** — one surface, one mode; Preview fully REPLACES the editor. Segmented control marks the CURRENT mode in green (state, not target — the Gap-14 semantics fix). Formatting buttons stay visible but dim in Preview; clicking one returns to Edit and applies it. Honors 50% + maximize.
- **C: Preview as a stage** — Step 2 is pure editing with no preview control at all; Continue enters "Preview & Export": the card grows, the document becomes the centerpiece with export formats beside it. Preview is the checkpoint before exporting, not a toggle.

## What to Look For

- **Mode confusion is dead (Gap 14):** at any moment, can you tell instantly whether you're seeing source or preview — and how to get back?
- **Screen-space split:** A gives editing half the room all the time; B gives it everything; C gives it everything until the stage. Which trade feels right for real session docs?
- **The overall process:** does the 3-step spine (and C's re-purposed step 3) read naturally?
- **Always-visible toolbar (ratified invariant):** the bar never scrolls away in any variant; the Gap-16 empty-area guard is honored.
- **Unified preview language (Gap 15):** the framed pane + eye chip; switch Frame / Paper / Tint bottom-right — same language as sketch 009's note fields.
- **Ctrl/Cmd+E:** B swaps modes; C jumps Edit ↔ stage; A has nothing to toggle.
- **Dark / RTL / עברית / Phone** via the bottom-right tools (phone = full-screen takeover, D-17).

## Mockup honesty notes

- Same escape-first renderer subset and editor mechanics as sketches 006/007; the real implementation reuses `MdRender` + the shipped TextEdit engine.
- Step 1's content checkboxes are visual only — the sample document stays full.
- Undo/redo buttons use the browser's native textarea undo (`execCommand`) — granularity is not the D-20 contract, just presence/placement.
- A's scroll-follow is a simple ratio map; real implementation would need anchor-aware sync.
