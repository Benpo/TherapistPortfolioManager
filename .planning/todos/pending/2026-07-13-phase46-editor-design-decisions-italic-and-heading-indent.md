---
created: 2026-07-13T12:00:00.000Z
title: "Phase 46 toolbar design decisions: italic-in-PDF disclosure + heading indentation"
area: rich-text
priority: medium
resolves_phase: 46
files:
  - assets/md-render.js
  - assets/pdf-export.js
---

## Problem

Two deliberate design decisions surfaced during Phase 45 UAT (Ben, 2026-07-13) that belong
to Phase 46 (toolbar editor / live preview) planning — capture so they can't slip through:

1. **Italic-in-PDF disclosure.** Italic renders on screen (browser-synthesized `<em>`,
   all languages incl. Hebrew) but flattens to regular weight in the PDF in ALL languages
   (only Heebo normal+bold faces are vendored; jsPDF cannot synthesize a slant; RTXT-F2
   backlogs a true italic face). The toolbar will offer an italic button (RTXT-01/02) —
   decide how the user learns about the PDF flattening. Ben's leaning + my recommendation
   (2026-07-13): keep the button language-independent, add a small disclosure (button
   tooltip and/or a one-line note in the export modal). Do NOT hide italic only for
   Hebrew — the limitation is not Hebrew-specific.

2. **Heading indentation.** Ben asked whether content under `##`/`###` should indent.
   Current (and standard) convention: flush-left, hierarchy via size/weight — matches the
   PDF register and every mainstream editor. Typed leading spaces before `##` do NOT work
   as a manual fallback (both pipelines consistently render it literal, and HTML collapses
   leading spaces — no heading, no indent). A visual-only CSS indent for `.note-rendered`
   (+ matching PDF register change) is possible but non-standard and needs a UI-SPEC
   amendment. Decision deferred to Phase 46 design; default = keep standard.

## Solution

Fold both into Phase 46 discuss/plan as explicit decision items (D-NN) so they get
UI-SPEC treatment alongside the toolbar and live preview.
