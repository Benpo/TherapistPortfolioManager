# Sketch Manifest

## Design Direction

**Phase 46 addendum (sketches 006–007):** the rich-text toolbar editor's D-19 mockup
gate. Direction is again **not open** — locked by `46-UI-SPEC.md` + the 19-decision
`46-CONTEXT.md`: same garden tokens, Phase-45 `.note-rendered` register, icon-only
toolbar (net-new chrome at 400/600 only), accent green reserved for active states.
These sketches exist so Ben can *type into* the editor and feel the list mechanics,
live preview, and both Step-2 size directions before planning.

In-app onboarding / overview / help system for **Sessions Garden** (Phase 26). The
visual and tonal direction is **not open** — it is fully locked by the approved
`26-UI-SPEC.md` and the 15-decision `26-CONTEXT.md`: a calm, warm, clinician-domain
voice (the warmth of Calm/Insight Timer + the domain fit of SimplePractice/Jane),
explicitly **not** generic SaaS product-tour energy. Every surface extends the
existing garden design system (`assets/tokens.css`) — warm cream `#fdf8f0`
background, garden green `#2d6a4f` accent, Rubik 400/700, dark-mode teal-grey,
RTL-safe via logical properties, zero npm dependencies. These sketches do not
explore *aesthetic*; they explore **layout, composition, and interaction feel**
for the mockup this phase delivers (D-08: design contract + mockup, no prod code).

## Reference Points

- **Tone/warmth:** Calm, Insight Timer, journaling apps (D-14).
- **Domain fit:** SimplePractice, Jane, Carepatron (D-14).
- **Internal:** the existing garden design system + `assets/demo-hints.js` coach-mark
  rendering patterns (borrowed patterns only, not content — D-13).
- **Contract:** `.planning/phases/26-in-app-onboarding-overview-help-system/26-UI-SPEC.md` (approved).

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | welcome-overlay | Does the first-launch welcome feel like a calm garden, not a setup wizard? | TBD | welcome, first-run, brand |
| 002 | help-page-ia | How to organize the 7-step workflow spine + flagship personalization + technical track on one page? | TBD | help-page, information-architecture, layout |
| 003 | tour-fallback | Does the tour feel rich when anchored AND genuinely not-broken when the anchor is missing (D-11)? | TBD | tour, interaction, resilience, i18n |
| 004 | help-entry-point | Is the header-icon "?" entry discoverable vs. a bottom-corner floating button? | TBD | entry-point, chrome, discoverability |
| 005 | changelog-register | Thematic sections + N/I/F chips vs. category-grouped vs. chip-free — how does each changelog entry read? (Phase 42) | B — grouped by category (Ben, 2026-07-09) | changelog, register, content-structure |
| 006 | rich-text-toolbar-editor | Does the focus-attached toolbar + live preview + list mechanics feel right while typing — and text-style control: segmented or dropdown? (Phase 46, D-19) | TBD | toolbar, editor, interaction, phase-46 |
| 007 | export-step2-size | Step-2 editing surface: bigger-by-default (50/70/80% candidates) or current size + maximize toggle → 90%? (Phase 46, D-16) | TBD | export, modal, sizing, phase-46 |
