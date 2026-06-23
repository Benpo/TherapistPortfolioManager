---
sketch: 004
name: help-entry-point
question: "Is the header-icon '?' entry discoverable vs. a bottom-corner floating button?"
winner: null
tags: [entry-point, chrome, discoverability]
---

# Sketch 004 — "?" Help entry point

## Design Question

Is the header-icon "?" entry (third icon beside the Phase-25 cloud + gear)
discoverable enough on its own, or does a bottom-corner floating "?" button win
on visibility? The UI-SPEC has already **locked the header-icon as the default**
for Phase-25 header consistency (D-02). This sketch is a deliberate sanity-check
of that locked call: it shows the locked default convincingly and the floating
alternative honestly, so the reviewer can confirm (or overturn) the decision
with the two treatments in real app context, side by side.

## How to View

Open `index.html` directly in a browser — no build step, no server.

- Top bar: switch between **A / B / C** variants.
- Bottom-right **sketch tools** pill (dark, labelled): Light/Dark, RTL/LTR,
  and 375 / 768 / Full viewport widths.
- Click the "?" (header icon or floating button) to open the faked Help sheet;
  close via the X, the "Got it" button, the backdrop, or `Esc`.
- The sketch toolbar is intentionally dark and labelled "sketch tools" so it is
  never mistaken for variant B's floating "?" in the same corner.

## Variants

- **A — Header icon (LOCKED default).** "?" is the third `.header-icon-btn` in
  `#headerActions`, after the cloud (backup) and gear (settings) siblings.
  44×44 tap target, 36×36 visual box, shown in its `.is-active` state
  (soft-primary box + primary-dark glyph, mirroring the gear); cloud and gear
  carry the resting/hover states for comparison.
- **B — Bottom-corner floating button.** Header drops to two icons; "?" becomes
  a circular button on a logical `inset-inline-end / inset-block-end` (flips
  under RTL). Floats over the client card so the intrusion is visible, not
  hypothetical.
- **C — Side-by-side, honest comparison.** Same screen, tokens, and copy in two
  panes — header-icon vs. floating — each annotated with discoverability /
  intrusion / consistency so the trade-off is legible at a glance.

## What to Look For

- **RTL coherence:** toggle RTL — do the header actions flip to the inline-start
  and does "?" stay sensibly beside cloud + gear? Does the floating button move
  to the opposite corner cleanly?
- **Discovery vs. intrusion:** in B, watch the "?" overlap the lowest client
  row. In A, confirm it reads as "another tool with the others," not hidden.
- **Consistency:** does the floating button feel like a second, separate control
  region the rest of the app lacks? Does the header icon preserve the Phase-25
  consolidated single-header shape?
- **Dark mode:** the `.is-active` soft-primary treatment and the FAB should both
  stay calm and legible under `[data-theme="dark"]`.
- **Tap targets:** every "?" affordance keeps a 44px minimum hit area.

## Recommendation

**A (header icon) is the UI-SPEC-locked default and it holds up.** Sessions
Garden is a calm, offline notes app used repeatedly by the same therapist:
learned location beats one-time salience. Placing "?" with the cloud + gear
extends the convention Phase 25 already taught ("the tools live up here"),
adds zero content occlusion, and keeps the consolidated single-header intact.
The floating button's only real advantage is first-glance salience, which it
buys by covering content and adding a second control surface the app does not
otherwise have — a poor trade for a repeat-use private tool. The discoverability
risk for A is low precisely *because* it sits among established icons. Frontmatter
`winner` stays `null`; the orchestrator/user records the final call.
