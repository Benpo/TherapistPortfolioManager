---
sketch: 003
name: tour-fallback
question: "Does the tour feel rich when anchored AND genuinely not-broken when the anchor is missing (D-11)?"
winner: null
tags: [tour, interaction, resilience, i18n]
---

# Sketch 003 — Tour + the D-11 fallback

## Design Question

Does the replayable guided tour feel **rich and confident when anchored** to a
real element (spotlight + tethered tooltip), and **genuinely not-broken when the
anchor is missing** — degrading to a calm centered card with a working link,
never a blank state and never a silent skip (UI-SPEC D-11 / Pitfall 6)?

This is the single most fragile element in the product: it must survive 4
languages, RTL, and multi-page navigation. The sketch exists so the reviewer can
*feel* the graceful degradation, not just read about it.

## How to View

Open `index.html` directly in a browser — no build step, no server, plain
HTML/CSS/vanilla JS. It links the real garden design system at
`../themes/default.css` (token parity with the app).

- Top bar: switch variants A / B / C.
- Bottom-right toolbar (hover to reveal): Light/Dark, LTR/RTL, viewport 375 / 768 / Full.
- Everything clickable does something; the spotlight animates between anchors.

## Variants

- **A: Anchored ↔ Fallback** — the running tour over a real fake screen.
  Step through all 6 workflow-spine steps; the **"Break anchor"** toggle makes
  the current step's element disappear so it degrades to the centered D-11
  modal, with a working "Take me there" link that restores the spotlight.
- **B: Tooltip chrome** — the same anchored step in three chrome treatments
  (tethered + arrow, floating card + connector line, bottom-sheet) for a
  side-by-side calmness/clarity judgement, same tokens and copy.
- **C: Long-content + i18n** — a deliberately long step description plus a
  "Switch language (re-render)" button cycling EN → HE (RTL) → DE in place
  (cleanup-then-replace), proving max-width / wrapping / flexible height and the
  re-render-on-language-change pattern hold.

## What to Look For

- **Toggle "Break anchor" in Variant A — this is the whole point.** Flip it on
  any step. The tour must never go blank or silently skip: it degrades to a
  reassuring centered card that *names where the thing lives* ("This is on the
  Clients screen.") and offers a working "Take me there" link. Toggle back and
  the spotlight returns. Does the fallback feel like a soft landing, not an error?
- Step through all 6 steps anchored — does the spotlight + tethered tooltip
  feel rich and guided (counter, Previous step / Next, Done on the last step)?
- Switch to **RTL** in Variant A and step again — the tooltip tether and arrow
  must flip to the correct side (logical properties only). This is a key validation.
- **Dark mode** — every surface reads from dark tokens; no hardcoded color
  except the intentionally theme-independent sketch toolbar.
- Variant C in **RTL** with the Hebrew string — confirm long copy wraps inside
  `max-width` with flexible height and no overflow.
- Color discipline: only "Next" / "Done" and the spotlight ring use the primary
  accent; "Previous step" / "Close tour" / "Take me there" stay neutral.
