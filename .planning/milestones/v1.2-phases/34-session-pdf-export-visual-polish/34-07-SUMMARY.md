---
phase: 34-session-pdf-export-visual-polish
plan: 7
subsystem: pdf-export / render-tier
tags: [pdf, jspdf, rtl, bidi, i18n, branding, section-heading, footer-band, D-06, D-07, D-09, D-10, D-12]

# Dependency graph
requires:
  - phase: 34-06
    provides: drawHeaderBand/drawClientCard + palette/colour helpers (setFill/setStroke/setInk) + pdfI18n + docDir anchor
  - phase: 34-05
    provides: sessionData.exportedOn on the buildSessionPDF input contract (App.formatDate(new Date()))
  - phase: 34-02
    provides: pdf.footer.madeWith + pdf.footer.exportedOn i18n keys (en/he/de/cs)
  - phase: 34-01
    provides: window.IconLogoBase64 vendored offline logo for the small footer mark
  - phase: 23
    provides: shapeForJsPdf / docDir RTL pipeline + isInputVisual:false invariant
provides:
  - "leaf-diamond section heading (two triangle() calls about a centre) + #456b42 bold label + #bfe0b0 vein rule, 24/8pt margins (D-06)"
  - "airier free-text body: BODY_SIZE 11.5, LINE_HEIGHT_BODY 19 (~1.65), body ink #2f2d38 (D-07/D-12)"
  - "drawFooterBand() — full-bleed three-zone footer band (mint-soft top rule + made-with mark/logo + Page X of Y + Exported-on date) on every page (D-09)"
affects: [34-09, 34-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Symmetric leaf-diamond bullet drawn from two doc.triangle() fills sharing the top/bottom vertices — identical under LTR/RTL, no mirroring (34-RESEARCH Pattern 3)"
    - "Three-zone footer band: START/END zones swap edges by docDir; CENTER page label keeps its inline per-locale switch; every doc.text isInputVisual:false anchored by docDir (D-10)"
    - "Footer logo reuses the 34-06 data-URI addImage pattern (window.IconLogoBase64), guarded + try/catch so a missing/headless asset never aborts the export"

key-files:
  created: []
  modified:
    - assets/pdf-export.js

key-decisions:
  - "Heading label reuses COLOR_BRAND_HEAD (#456b42) — the D-06 label colour already matched the 34-06 subtitle/meta-key constant, so no new colour constant was added for it."
  - "Footer band text (made-with + exported-on) rendered at 8.5pt while the CENTER Page-X-of-Y label keeps META_SIZE (10pt): the smaller band text keeps the three zones from colliding on a 453pt content width; the page label stays byte-stable with its prior size."
  - "Footer top rule is #eef7ea (mint-soft, FINAL mockup .rfoot) per D-09, explicitly overriding the UI-SPEC's #bfe0b0 'pin vein' for the footer."
  - "Body ink set to #2f2d38 (D-07) at the para/list draw sites (drawSegmentedLine does not touch colour); heading branch resets to black afterward so the body sites re-assert the ink each block."

requirements-completed: [PDFX-01]

# Metrics
duration: ~20min
completed: 2026-06-29
status: complete
---

# Phase 34 Plan 07: Section Headings + Body Type + Footer Band Summary

Styled the mid-document chrome to the locked design — leaf-diamond section headings with a #bfe0b0 vein rule (D-06), an airier free-text body type scale (D-07/D-12), and a full-bleed three-zone footer band on every page (D-09) — without disturbing the verified RTL body pipeline (the body block loop stays on the existing splitTextToSize + parseInlineBold free-text path; severity stays out, owned by 34-09).

## What was built

- **Leaf-diamond section heading + vein rule (D-06)** in the render-loop heading branch (`assets/pdf-export.js`): before the label, a `#7da877` ~9pt rotated-square bullet at the START edge, drawn from two `doc.triangle()` fills sharing the top/bottom vertices (symmetric — identical LTR/RTL, no mirroring, D-10). The label renders `#456b42` bold at the per-level heading size, start-anchored 4pt after the bullet (`align:'right'` under RTL), followed by a `#bfe0b0` ~1.5pt vein rule (`doc.line`) spanning the content width ~4pt beneath the baseline. Top margin 24pt / bottom 8pt; on a page-break the top margin is correctly dropped (heading starts at `MARGIN_TOP`).
- **Airier free-text body (D-07/D-12)**: `BODY_SIZE` 11 → 11.5, `LINE_HEIGHT_BODY` 16 → 19 (~1.65 leading), body ink set to `#2f2d38` at the paragraph and list draw sites. The splitTextToSize/parseInlineBold paragraph + list + inline-bold structure is unchanged — only the type scale, leading, and ink.
- **`drawFooterBand(pn,totalPages)` (D-09/D-10)**: extends the footer pass into a full-bleed band on every page — a `#eef7ea` mint-soft top rule across the content width, then three zones along the existing footer baseline. START: a ~15pt offline logo (`addImage` of `window.IconLogoBase64`, guarded + try/catch) + the `pdf.footer.madeWith` brand-as-tool mark (`#456b42` bold, never a letterhead). CENTER: the per-locale "Page X of Y" label (the existing inline switch, moved verbatim into the band). END: `pdf.footer.exportedOn` + `sessionData.exportedOn` date (muted `#5f5c72`), relabelled per D-09 to disambiguate from the card's session date. Under RTL the START/END zones swap edges (made-with right, exported-on left); every `doc.text` passes `isInputVisual:false` and anchors by `docDir`.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Leaf-diamond heading + vein rule + airier body type | 3e9a314 | assets/pdf-export.js |
| 2 | drawFooterBand — full-bleed three-zone footer | 8d9acde | assets/pdf-export.js |

## Verification

- **Floor invariants GREEN (must-stay-green):** `pdf-digit-order`, `pdf-glyph-coverage`, `pdf-bold-rendering`, `pdf-bidi`, `30-issue-delta` all PASS — the heading-chrome, body type-scale bump, and footer band introduced no RTL/order/glyph regression. The quick-`c8x` ordered-list/RTL-prefix test stays GREEN (anchor/order robust to the size bump).
- **`34-rtl-newblocks` advancing (RED overall, expected):** part A (card "Session #12" digit order) and part C (pill start-edge anchored under RTL: heX≈344.6 > enX≈225.9) PASS; part B (structured severity values 10/8) remains RED — gated by 34-09. The new footer band did not disturb A or C.
- **`pdf-latin-regression` GREEN:** the anticipated baseline break (Pitfall 1) did NOT materialize on this plan's account — the fixture stayed green despite the footer band and type-scale change, so no Wave-5 regeneration is *forced* by this plan (re-confirm in 34-10 after severity lands).
- **Full suite:** 109 passed, 3 failed — the 3 failures are `34-rtl-newblocks` (part B → 34-09), `34-save-before-export` (→ 34-08), and `34-severity-bars` (→ 34-09), all expected gates owned by other plans. Identical pass/fail count to the 34-06 baseline; this plan added no new red.

## Deviations from Plan

None — the plan executed as written. (The D-06 label colour `#456b42` was already present as `COLOR_BRAND_HEAD` from 34-06, so it was reused rather than re-declared; footer band text uses 8.5pt to keep the three zones from colliding while the CENTER page label keeps its prior META_SIZE — both within the plan's "sizes/spacing match UI-SPEC" envelope, not behavioural deviations.)

## Known Stubs

None. Section headings, body, and footer band all render from real inputs (`block.text`/markdown, `window.IconLogoBase64`, `window.I18N`, `sessionData.exportedOn`). The severity block is intentionally NOT in this plan (owned by 34-09); the body still renders the existing free-text markdown.

## Notes for downstream plans

- **34-09 (severity bars):** flips part B of `34-rtl-newblocks` and turns `34-severity-bars` green by rendering structured `issues[]`. The body block loop here is untouched and ready for the severity block to be inserted in its own branch.
- **34-10 (baselines):** `pdf-latin-regression` did not break on this plan's account; re-confirm/regenerate only after 34-09 lands the severity block. The footer band now renders on every page, so any regenerated baseline must capture it.

## Self-Check: PASSED

- FOUND: assets/pdf-export.js leaf-diamond heading branch (two doc.triangle() fills + #bfe0b0 vein rule)
- FOUND: assets/pdf-export.js drawFooterBand() (mint-soft rule + made-with + Page X of Y + exported-on)
- FOUND: BODY_SIZE 11.5 / LINE_HEIGHT_BODY 19 / COLOR_BODY_INK #2f2d38
- FOUND commit 3e9a314 (Task 1)
- FOUND commit 8d9acde (Task 2)
