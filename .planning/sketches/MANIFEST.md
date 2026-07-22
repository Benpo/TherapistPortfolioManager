# Sketch Manifest

## Design Direction

**Phase 47 addendum (sketch 010):** the session-section reordering discussion surfaced
a structural pain point — the form's accordion groups are incoherent (single-field
groups, header/field name collisions, Session topics under "Heart-Wall Session"). Sketch
010 puts the group CONCEPT itself in front of Ben + Sapir: Model A (mixed bare
sections + real groups) vs Model B (everything grouped, cleaned defaults), plus the
three severity-placement variants. Garden tokens, real i18n section labels, EN/HE
toggle with full RTL for Sapir's native read. Decisions already locked in the Phase 47
discussion (two-level reorder, drag+arrows, slot-keeping disabled rows, reset button,
export mirrors order, groups form-only, empty groups hide) are out of scope for the
sketch.

**Phase 46.1 addendum (sketches 008–009):** the design-first preview/edit redesign
(gaps 14/15 from the phase-46 device gate). Direction from the 2026-07-17 intake:
all three interaction models in play (side-by-side live / in-place swap / preview-as-
stage — one dramatic concept each); interaction MAY adapt per surface but the "this
is preview" visual language must be ONE across the note fields and the export;
leading treatment is the **framed pane + eye chip** with Paper/Tint alternates
explorable in-mockup. Hard invariants: always-visible export toolbar, garden tokens
only, never `--color-surface-alt` for preview (that's the section-header background
— the Gap-15 collision), RTL/dark/phone honored, Gap-16 bar guard + D-20 undo/redo
present.

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
| 006 | rich-text-toolbar-editor | Does the focus-attached toolbar + live preview + list mechanics feel right while typing — and text-style control: segmented or dropdown? (Phase 46, D-19) | B — dropdown "Text ▾" (Ben, 2026-07-14; +undo/redo scope added, D-20) | toolbar, editor, interaction, phase-46 |
| 007 | export-step2-size | Step-2 editing surface: bigger-by-default (50/70/80% candidates) or current size + maximize toggle → 90%? (Phase 46, D-16) | A@50% default + B's maximize→90% synthesis (Ben, 2026-07-14) | export, modal, sizing, phase-46 |
| 008 | export-preview-edit-model | Which interaction model kills the preview/edit mode confusion in export Step 2 — side-by-side live, in-place swap, or preview-as-stage? (Phase 46.1, Gap 14) | B — in-place swap + Frame treatment + PINNED mode switcher for mobile bars (Ben, 2026-07-18; C = too much effort to reach preview) | export, preview, interaction, phase-46.1 |
| 009 | note-field-preview | How does preview adapt to the 7 inline note fields + which unified treatment replaces the section-header orange? (Phase 46.1, Gaps 14+15) | A — in-place swap + Frame treatment (Ben, 2026-07-17/18); pinned switcher applies here too | note-fields, preview, visual-language, phase-46.1 |
| 010 | section-groups-concept | What is the form's group model — mixed bare-sections+groups vs everything-grouped — and where does Issue severity live in the reorder? (Phase 47) | TBD — Ben + Sapir review | groups, reorder, settings, form-structure, phase-47 |
