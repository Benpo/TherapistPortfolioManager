---
sketch: 001
name: welcome-overlay
question: "Does the first-launch welcome feel like a calm garden, not a setup wizard?"
winner: null
tags: [welcome, first-run, brand]
---

# Sketch 001 — Welcome Overlay

## Design Question

Does the first-launch welcome feel like a **calm garden**, not a setup wizard?

This is the highest emotional-impact surface in Sessions Garden: the full-screen
branded welcome that fires once on first launch after activation (gated by a
`localStorage` flag in production; see Phase 26 D-09 / D-15). The reference user
(Sapir) is warm, calm, non-technical and Hebrew-primary, so the bar is *felt
calm*, not feature completeness. The explicit anti-pattern is SaaS onboarding
energy ("Let's get you set up! Step 1 of 12").

## How to View

Open `index.html` directly in a browser — no build step, no server.

- **Variant tabs (top):** A / B / C — only one composition shows at a time.
- **Sketch toolbar (bottom-right, fades in on hover):**
  - **Theme** — Light ⇄ Dark (`data-theme="dark"` on `<html>`; dark values
    come from the real production tokens).
  - **Dir** — LTR ⇄ RTL. The Split (B) layout flips because it uses logical
    properties only.
  - **Size** — Desktop / Tablet 768 / Phone 375 constrains the content frame.
- **Interaction loop:** either CTA *or* `Esc` dismisses the overlay to a faded
  resting state with a "reopen via ?" affordance; the reopen button (or `Esc`
  again) replays it. This makes the dismiss/return loop feelable.

## Variants

- **A — Centered hero.** Botanical hero motif centered up top, headline, subtitle,
  then the two CTAs stacked (primary above secondary) inside a soft surface
  panel, generous 3xl vertical breathing room. The classic calm-app welcome.
- **B — Split.** Botanical art on one inline side, copy + CTAs on the other.
  Logical layout means the sides flip cleanly under RTL. More editorial /
  "product" — tests whether structure reads as confident rather than busy.
- **C — Minimal.** Small botanical motif (not a hero), maximum calm whitespace,
  headline + subtitle sitting high, the two CTAs anchored low on the panel.
  Maximum restraint — tests how far stillness can carry the brand.

## What to Look For

- **Calm vs. wizard:** does any variant read as a setup flow? It should feel
  like arriving somewhere tended, not being processed.
- **Autonomy tone:** the secondary CTA ("I'll explore myself") is first-class
  but deliberately *neutral* — never accent-colored. Does declining the tour
  still feel welcome and unpressured?
- **Accent discipline (60/30/10):** garden green appears on the primary CTA
  *only*. Cream background dominates; surface panel is the secondary tone.
- **Botanical feel:** the inline SVG is a clearly-flagged placeholder for the
  real `watering-can.png` / `garden.png` hero. Judge whether the *placement and
  scale* of "one calm botanical hero" works per variant, not the art itself.
- **RTL + dark parity:** both must feel equally calm and intentional — Sapir's
  primary experience is Hebrew/RTL.
- **Type restraint:** exactly 4 roles, weights 400/700 only; Display is used
  only for the headline.

## Notes / Judgment Calls

- **`26-UI-SPEC.md` does not exist yet** at the referenced path (Phase 26 has
  CONTEXT + PLANs + RESEARCH but the UI-SPEC contract is still to be authored).
  The locked design system was sourced from the real production tokens at
  `assets/tokens.css` plus the Phase 26 CONTEXT decisions (D-09 welcome shape,
  D-10 extend the garden system, D-15 dismissal logic).
- **Shared theme:** `../themes/default.css` `@import`s the real production
  `assets/tokens.css` verbatim (all color + dark mode come from there, nothing
  invented) and only *adds* the named contract tokens the UI-SPEC vocabulary
  refers to (`--space-*`, `--text-*`, `--lh-*`, `--font-sans`,
  `--tap-target-min`), which the production tokens file does not yet formalize.
