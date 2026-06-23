---
sketch: 002
name: help-page-ia
question: "How should the Help page organize the workflow spine + personalization + technical track on one page?"
winner: null
tags: [help-page, information-architecture, layout]
---

# Sketch 002 — Help Page Information Architecture

## Design Question

How should the Help page organize the 7-step workflow spine + the flagship
personalization section + the plain-language technical track on **one page**, so a
non-technical therapist (reference user: Sapir — warm, calm, Hebrew-primary) can
both **learn the whole session loop end to end** *and* **jump straight to one
feature** when she just needs that?

The treatment loop is the organizing spine (D-03). Personalization ("Making
Sessions Garden yours") must be led early, not buried (D-04). The technical track
is a clearly separated parallel band (no destructive UI in this phase). The
"data never leaves your browser" line is the emotional anchor — paired with
"that's why backups matter", never a footnote.

## How to View

Open `index.html` directly in a browser (no build, no server needed).

- **Top bar** switches the three IA variants (A / B / C).
- **Bottom-right toolbar** (hover to un-dim): Light/Dark, LTR/RTL, and
  375 / 768 / Full viewport width.
- Variant A's rail scroll-spies as you scroll; B's stepper and pager swap the
  content pane; C's accordion opens one spine step at a time and the technical
  band toggles on its own. All three share the exact same theme tokens
  (`../themes/default.css`) and identical real content — only the IA differs.

## Variants

- **A — Single-column scroll + sticky spine rail.** One long readable column;
  a sticky numbered rail on the inline-start side tracks scroll position and
  jumps. Personalization sits prominently right after step 1. Technical track is
  a distinct `--color-surface-alt` band at the very end. Closest to the existing
  vanilla per-page pattern — the path of least resistance to build.
- **B — Two-column docs layout.** Left = vertical stepper (7 spine steps +
  featured personalization + a clearly grouped technical track); right = the
  content pane for the selected section, with Back/Next paging. Feels like
  SimplePractice / Jane practice-management apps.
- **C — Accordion spine + elevated featured card.** Personalization is a raised
  bordered card at the top; each spine step is an expandable row (step 1 open by
  default, one-at-a-time); the technical track is a separate collapsed band with
  its own surface-alt treatment. Most compact — best for "jump to one feature".

## What to Look For

- **Learn-vs-jump tension:** Does the IA serve a first-time end-to-end read
  *and* a returning-user single-feature lookup, or does it favour one and tax
  the other? (A favours the linear read; C favours the jump; B tries both.)
- **Personalization prominence:** In each variant, does "Making Sessions Garden
  yours" actually feel led-early and flagship (D-04), or does the layout quietly
  demote it?
- **Technical-track separation:** Is the band unmistakably a parallel track
  (calm `--color-surface-alt`, not alarming) without feeling like an
  afterthought? Does the "data never leaves your browser" anchor land
  emotionally, sitting first and paired with backups?
- **Calm, not SaaS:** Does it read like a warm clinician's guide (Calm / Jane
  tone) rather than a generic product tour?
- **RTL + dark:** Toggle both — logical properties should keep the rail,
  stepper, and accordion correct with no visual breakage.
- **Build cost vs. payoff:** A is closest to the existing multi-page vanilla
  pattern; do B or C earn their extra interaction complexity for this audience?
