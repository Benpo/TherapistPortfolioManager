---
sketch: 006
name: rich-text-toolbar-editor
question: "Does the focus-attached toolbar + live preview + list mechanics feel right while typing — and text-style control: segmented or dropdown?"
winner: null
tags: [toolbar, editor, interaction, phase-46]
---

# Sketch 006: Rich-Text Toolbar Editor (Phase 46, D-19 gate)

## Design Question

The D-19 mockup gate: type into the editor and judge (1) the docked toolbar's order,
grouping, icons, and spacing; (2) the live preview feel; (3) the list mechanics —
auto-continue, Tab indent/outdent, empty-item outdent, live auto-renumbering; and
(4) the one open presentation choice: **segmented (H1 H2 H3 ¶) vs dropdown (Text ▾)**
text-style control.

## How to View

open .planning/sketches/006-rich-text-toolbar-editor/index.html

## Variants

- **A: Segmented** — all four paragraph styles visible at once in the toolbar row; recommended on desktop (one click, current style always visible).
- **B: Dropdown** — compact `Text ▾` button opening a styled menu; saves row width (matters for the mobile scrollable row).

Both variants share the SAME live editor — switching tabs swaps only the control, so
you can compare directly mid-typing without losing state.

## What to Look For

- **Renumbering feel (D-11 acceptance):** delete line 3 in Trapped Emotions, paste it at the end — numbers must always read 1..N with zero manual fixing.
- **Enter mechanics (D-10):** empty nested item outdents per press; empty top-level item exits the list.
- **Toggle semantics (D-04):** Ctrl/Cmd+B/I wrap and UNwrap; no `****` garbage.
- **Toolbar docking (D-01):** one toolbar that follows focus between the three fields; disappears when you leave.
- **Preview (D-05/06/07):** eye icon opens a live pane below the field (Phase-45 `.note-rendered` register); state resets when you move to another field.
- **Snippets coexistence (RTXT-09):** type `;rel` — the caret-anchored popover must not fight the toolbar.
- **Dark mode / RTL / phone width** via bottom-right tools (phone = 44px touch targets, scrollable row; עברית sample fills a Hebrew numbered list).

## Mockup honesty notes

- The markdown renderer here is a small escape-first subset mimicking `MdRender` (bold/italic/H1–3/nested lists); the real implementation reuses `window.MdRender` itself.
- Renumbering in this sketch uses plain `.value` assignment — the real implementation must use undo-preserving APIs (D-11 constraint). Native undo will feel rough HERE; that's a known mockup shortcut, not the contract.
- Rubik loads from `../../../assets/fonts/` — some browsers block font loads from `file://`; the layout falls back to system-ui gracefully.
