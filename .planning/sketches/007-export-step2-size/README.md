---
sketch: 007
name: export-step2-size
question: "Step-2 editing surface: bigger-by-default (50/70/80% candidates) or current size + maximize toggle to ~90%?"
winner: "A (50%) + B's maximize"
tags: [export, modal, sizing, phase-46]
---

> **Winner: synthesis** (Ben, 2026-07-14) — Step 2 opens **bigger by default at ~50% of the
> viewport** (variant A, 50% candidate) AND keeps **variant B's visible maximize toggle**
> opening to ~90% in the real implementation. Mobile unchanged: D-17 full-screen takeover.

# Sketch 007: Export Step-2 Size Directions (Phase 46, D-16)

## Design Question

Ben is deliberately undecided between two Step-2 sizing directions (D-16); both must
be felt with a real toolbar, the Edit/Preview switcher, the blue info note (D-03),
and a whole-session document loaded — enough vertical room to edit with minimal
scrolling.

## How to View

open .planning/sketches/007-export-step2-size/index.html

## Variants

- **A: Bigger by default** — Step 2 opens large. Use the 50% / 70% / 80% size-candidate chips in the top bar to feel each candidate against the faded app behind it. Watch for: does it read like part of the app, or like a separate app? How jarring is the jump from a small Step 1?
- **B: Current size + maximize toggle** — the shipped `min(720px, 90vw)` card with a clearly visible maximize button (top corner, next to close) that opens to ~92% with a rearranged, roomier layout.

## What to Look For

- **Editing room:** can you see (almost) the whole session document without much scrolling, in each size?
- **Flex-fill editor (D-18):** the editor always fills the modal's available height — no fixed-height textarea inside a big shell.
- **Swap switcher (D-08):** Edit ↔ Preview segmented control (+ Ctrl/Cmd+E) — does swap-style feel good enough at this size, given it buys maximum editing surface?
- **Info note (D-03):** blue informational band — inviting free restructuring, not warning-toned.
- **Discard flow:** edit something, then hit × — the reused destructive confirm (`Discard your export edits?`) appears.
- **Phone tool (D-17):** mobile is a fixed decision — full-screen 100%×100% takeover in BOTH variants; the phone viewport button demonstrates it.
- Toolbar + typing mechanics (auto-renumber, Ctrl/Cmd+B/I, Tab indent) work here too — same engine as sketch 006.

## Mockup honesty notes

- The modal sizes are % of the dashed "simulated viewport" frame, not the browser window — so the size candidates stay comparable at any window size.
- The text-style control here is a simplified cycling button; its real form (segmented vs dropdown) is decided by sketch 006's winner.
- The rendered-preview register approximates the export preview (doc headings larger than the Phase-45 note register); exact styles reuse the shipped `.export-preview` in implementation.
