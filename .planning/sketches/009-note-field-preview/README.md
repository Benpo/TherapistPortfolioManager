---
sketch: 009
name: note-field-preview
question: "How does preview adapt to the 7 inline note fields — and what unified 'this is preview' visual language replaces the section-header orange?"
winner: "A"
tags: [note-fields, preview, visual-language, phase-46.1]
---

> **Winner: A — in-place swap** (Ben, 2026-07-17) with the **Frame** treatment (decided
> 2026-07-18 together with sketch 008's winner B — the same swap model + frame language on
> both surfaces). The bar's Edit/Preview switcher is **pinned** outside the scrollable
> control strip so Preview is always visible on phone widths (Ben's mobile finding).

# Sketch 009: Note-Field Preview (Phase 46.1, Gaps 14+15)

## Design Question

On the session form the preview pane's background is `--color-surface-alt` — the SAME
background as the accordion section headers ("Limiting Beliefs"), so it reads as another
category header (Gap 15). This sketch explores how preview should behave in small inline
fields (the per-surface adaptation Ben ratified) and which unified visual treatment says
"this is how your text will look" on BOTH surfaces.

## How to View

open .planning/sketches/009-note-field-preview/index.html

The "Limiting Beliefs" accordion header keeps the real app background on purpose — it is
the collision reference every treatment must escape.

## Variants

- **A: In-place swap** — Preview replaces the textarea in the very box you were typing in (same height); the bar's segmented control marks the CURRENT mode in green. One thing on screen at a time.
- **B: Pane below** — the shipped concept wearing the new clothes: pane under the field, editor stays visible, unified chip + treatment instead of the header orange.
- **C: Side expand** — no mode at all; an active field grows a live pane beside it that re-renders as you type and collapses when you leave. Phone: stacks below (compare honestly with B there).

## What to Look For

- **Gap 15 dead or alive:** next to the "Limiting Beliefs" header, does each treatment (Frame / Paper / Tint, bottom-right) unmistakably read "preview", never "category"?
- **Mode clarity (Gap 14 semantics):** A/B's segmented control shows where you ARE; C removes the question entirely.
- **Form rhythm:** B and C add height to the page while previewing; A doesn't. Which respects the long 7-field form best?
- **Toolbar behavior:** docks on focus, never hides on empty-area clicks (shipped Gap-16 guard), undo/redo present (D-20).
- **Dark / RTL / עברית / Phone** via the bottom-right tools.

## Mockup honesty notes

- Same renderer subset + editor mechanics as sketches 006/007/008; real implementation reuses `MdRender` / TextEdit.
- The `.note-rendered` register is copied verbatim from app.css — headings at 17/16/15px as shipped.
- C's collapse-on-blur is simplified (click outside any field/bar); real focus bookkeeping is an implementation concern.
