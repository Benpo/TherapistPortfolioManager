# Sketch 005 — Changelog register (Phase 42)

**Design question:** How should the New / Improved / Fixed register structure each
changelog entry — as thematic benefit-led sections with per-bullet category chips,
as classic category-grouped blocks, or as chip-free thematic sections?

Built during the Phase 42 discuss session (2026-07-09) at Ben's request
("mockup for me so I can decide"). Same data renders in all three variants.

## Variants

| Variant | Shape | Trade-off |
|---|---|---|
| **A — Thematic + chips** | Benefit-led sub-sections ("Dates, your way") with a small New/Improved/Fixed chip on every bullet | Keeps the v1.2.4 draft's storytelling AND the visible CHLG-02 register |
| **B — Grouped by category** | Classic release notes: New block, then Improved, then Fixed | Most scannable/conventional; flattens the narrative |
| **C — Thematic, no chips** | Same sections as A, chips hidden (categories stay data-level only) | Warmest read; needs a conscious amendment of CHLG-02's *visible* register |

## Also in the sketch

- **What's-New popup preview** ("Preview What's-New popup" button) — the teaser +
  link modest modal decided earlier in the same session (headline, hand-picked
  highlights, "See everything new" → page, quiet Close). Dismiss follows the
  welcome-overlay idiom (decided after Ben hit an accidental backdrop-close in
  this sketch): outside clicks do NOTHING; only Close / CTA / Esc dismiss.
- **Dark toggle** — chip tinting and heading colors under `[data-theme="dark"]`.
- **Backfill preview** — entries mirror the decided backfill: detailed v1.3/v1.2
  (consolidated)/v1.1, v1.0 as a one-liner launch marker.

## Caveats

- Placeholder copy — grounded in Ben's (unapproved) v1.2.4 draft + PROJECT.md
  ledger, but NOT gate-approved wording. Structure is the question here.
- Garden tokens come from `../themes/default.css`; no production code.

**Winner:** **B — Grouped by category** (Ben, 2026-07-09, in the Phase 42 discuss session). Each version entry keeps its one-sentence lede, then New / Improved / Fixed blocks with colored category headings, exactly as rendered in the sketch.
