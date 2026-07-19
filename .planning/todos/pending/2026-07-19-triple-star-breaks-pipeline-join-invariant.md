---
created: 2026-07-19T12:40:00.000Z
title: Hand-typed *** adjacency breaks the render/PDF join invariant and diverges the two pipelines
area: rich-text
priority: medium
files:
  - assets/md-render.js
  - assets/pdf-export.js
  - assets/text-edit.js
---

## Problem

Found during the bold-toggle semantics research (46.1 UAT round 4 side-finding, verified
by executing the live code — see
`.planning/phases/46.1-preview-edit-experience-redesign/46.1-BOLD-SEMANTICS-RESEARCH.md`
§1):

1. `***word***` violates the shipped join invariant TODAY: `stripInlineMarkdown` yields
   `word` while the `parseInline` segment join yields `*word*`. The Phase 45 agreement
   fuzzer never generated adjacent markers, so the corpus missed it.
2. Every `***` / marker-adjacency cluster DIVERGES between the two pipelines:
   `***word***` renders em+strong on screen (sequential regex passes in md-render) but
   literal-star + bold + literal-star in the PDF (left-to-right scanner in parseInline).
3. Consequence beyond cosmetics: hand-typed `***` can misplace bold runs after bidi
   reorder (Hebrew), regardless of what the toolbar emits.

## Scope note

The 46.1 bold-toggle contract guarantees the TOOLBAR never emits `***` or marker
adjacency, so this is reachable only by hand-typing. Fix direction is a deliberate
decision: either both parsers learn the same `***` rule (PDF has no bold-italic face —
likely normalize to bold), or both reject it identically (render literal). Extend the
45-pipeline-agreement corpus with adjacency cases either way.
