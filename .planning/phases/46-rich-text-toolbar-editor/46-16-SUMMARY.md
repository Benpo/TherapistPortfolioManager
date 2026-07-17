---
phase: 46-rich-text-toolbar-editor
plan: 16
status: complete
completed: 2026-07-17
outcome: slimmed gate PASSED by Ben on real devices; preview/export-flow items carved to phase 46.1
---

# Plan 46-16 Summary — closing real-device gate (slimmed scope): PASSED

The gate ran across 2026-07-15..17 against the pre-prod builds `656f959`/`dd986ce`
(final: all three gap rounds + all review fix rounds, suite 191/191). Mid-gate,
Ben rejected the preview/edit CONCEPT (gaps 14/15) and ratified a design-first
reset — phase **46.1 Preview & Edit Experience Redesign** was inserted and this
gate was **slimmed** to the content/editing items whose surfaces are not being
redesigned. The preview/export-flow items (original items 2, 11, 12, 13) moved to
46.1's future gate.

## Result — slimmed scope PASSED (Ben, 2026-07-17)

- Gap 16 (bar hides on padding/gap click): confirmed fixed on device.
- All remaining items confirmed fine by Ben: undo granularity + first-undo-after-
  load safety (gap 3), formatting-tips accordion removal (gap 6), emotions
  before/after opt-out (gap 7), snippet-accept-in-a-list Enter (gap 8), Heart-Wall
  export wording (gap 9), plus the matrix items — iPhone core toolbar pass, real
  opened PDF (italic Hebrew+Latin), snippets/autogrow, lists toggle/renumber, and
  RTL/Hebrew mirroring.

## Carved out (verified at 46.1's gate, NOT here)

Export Step-2 layout/flow presentation (old items 11/12), the preview toggle and
reveal behaviour (old items 2/13), and the preview visual language. The
engineering beneath them is machine-verified (WebKit probe A-E green, jsdom
suite) and survives as mechanism: sizing floor, sticky/unclippable bar,
bar→field dispatch, escape-first render. The always-visible export toolbar
remains a ratified invariant for any 46.1 design.

## Record

- Canonical gap ledger: `46-UAT.md § Summary` — 16 gaps: 11 resolved +
  device-confirmed or field-verified, 3 resolved in code with surfaces
  re-presented in 46.1 (10/11/12/13 → mechanisms kept), 2 routed to 46.1 as
  design work (14/15).
- Quality loops: 3 code reviews (R1 1 critical + 3 info; R2 1 warn + 2 info;
  R3 1 warn + 2 info) — every finding fixed or explicitly accepted; 2 two-lens
  architect plan reviews with all conditions folded in pre-execution.
- 46-14's re-run duty was superseded by this gate (see 46-14-SUMMARY.md).

No code was produced by this plan (pure human-verify checkpoint).
