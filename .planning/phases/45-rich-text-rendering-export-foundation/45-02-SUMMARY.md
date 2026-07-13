---
phase: 45-rich-text-rendering-export-foundation
plan: 02
subsystem: pdf-export
tags: [pdf, markdown, bidi, rtl, d-08, nested-lists, tdd]
status: complete
requires:
  - "assets/md-render.js applyInline canonical D-08 emphasis regexes (Plan 01, pinned)"
provides:
  - "PDF stripInlineMarkdown / parseInlineBold hardened to the character-identical D-08 hug-non-whitespace rule (preserves the drawSegmentedLine invariant)"
  - "PDF parseMarkdown per-item depth + per-item ordered-ness (nested bullet/numbered/mixed lists)"
  - "PDFExport.__test seam exposing stripInlineMarkdown/parseInlineBold/parseMarkdown for unit assertions"
affects:
  - "assets/pdf-export.js (inline emphasis + list parse/render)"
tech-stack:
  added: []
  patterns:
    - "Character-identical emphasis regexes shared between MdRender (preview) and pdf-export (print), so preview and PDF never disagree"
    - "Char-scanner hug hardening (isEmphSpace) kept in lockstep with the regex boundary to preserve parseInlineBold≡stripInlineMarkdown"
    - "Per-item nesting depth + own-marker ordered-ness; physical indent offset keyed off docDir (RTL indents rightward)"
key-files:
  created:
    - tests/45-inline-hardening.test.js
    - tests/45-pdf-nested-lists.test.js
  modified:
    - assets/pdf-export.js
decisions:
  - "**2 * 3 * 4** stays WHOLLY LITERAL (not '2 * 3 * 4'): the character-identical bold regex content class [^*,newline] forbids an inner '*', so bold never matches a span containing one. Honored the mandatory character-identity contract over the plan's prose expected-value."
  - "parseInlineBold's bold branch now refuses '*'-bearing content (mirrors the regex [^*,newline]) AND hugs non-whitespace — required to keep the invariant byte-equal to the hardened stripInlineMarkdown."
  - "All list items are uniform { text, depth, ordered, ordinal? } objects; renderer keys prefix + split-row on the ITEM's ordered-ness, not the block-level flag."
  - "NESTED_INDENT_STEP = 14pt (reuses the existing hanging-indent unit)."
metrics:
  duration: ~35min
  completed: 2026-07-13
  tasks: 2
  commits: 5
  files_changed: 3
---

# Phase 45 Plan 02: PDF inline D-08 hardening & nested-list rendering Summary

Hardened the Phase-23 Hebrew-bidi PDF pipeline (`assets/pdf-export.js`) in place so formatted notes survive export: the inline-emphasis rule now agrees **character-for-character** with MdRender's D-08 rule (preview and PDF can never disagree), and bullet/numbered/**mixed-type** lists now nest with correct physical indentation in both LTR and Hebrew RTL — all under falsifiable TDD with a real jsPDF `doc.text()` spy.

## What was built

**Task 1 — D-08 inline hardening (RED `5db88f4` → GREEN `594b36c`)**
- `stripInlineMarkdown` emphasis regexes replaced with the two canonical patterns from `md-render.js applyInline` (bold `/\*\*([^*\s\n](?:[^*\n]*?[^*\s\n])?)\*\*/g`, italic `/(^|[^*])\*([^*\s\n](?:[^*\n]*?[^*\s\n])?)\*(?!\*)/g`) — **character-identical** source (Plan 05 Task 1 asserts cross-file identity).
- `parseInlineBold` hardened in lockstep across all three emphasis sites (bold match, italic single-`*` match, the inner-italic strip formerly at :504): a new `isEmphSpace()` char-scanner whitespace test mirrors the regex `\s` boundary; the bold branch additionally refuses `*`-bearing content. This keeps the invariant `parseInlineBold(x).map(s=>s.text).join('') === stripInlineMarkdown(x)` that `drawSegmentedLine` relies on.
- Added a `PDFExport.__test` seam exposing the internal parse/emphasis helpers for direct unit assertions.

**Task 2 — nested-list rendering (RED `9c8a3f8` → GREEN `858b88b`)**
- `parseMarkdown` records, per item, a `depth` (leading whitespace, `floor(spaces/2)` — the SHARED NESTING CONVENTION) and its OWN `ordered`-ness (from its OWN marker); items are now uniform `{ text, depth, ordered, ordinal? }` objects.
- The list-draw loop keys the prefix and the RTL split-row path on the **item's** ordered-ness (NOTE 5 — a numbered child under a bullet parent no longer skips split-row nor renders `- 1. b`), and shifts the anchor by `depth * NESTED_INDENT_STEP` as a PHYSICAL offset off `docDir` (LTR rightward; RTL leftward, toward the right margin). Wrap width narrows by the nest indent. Flat depth-0 lists render byte-identical (offset 0).

## Deviations from Plan

### 1. [Rule 1 — corrected wrong expected-value] `**2 * 3 * 4**` stays wholly literal

- **Found during:** Task 1 (empirically probing the mandatory character-identical md-render regexes).
- **Issue:** The plan's acceptance criterion #94 stated `stripInlineMarkdown('**2 * 3 * 4**') === '2 * 3 * 4'` (outer `**` stripped, inner `* 3 *` surviving). But the character-identical bold regex has a content class `[^*\n]` that forbids **any** inner `*`, so bold **never matches** a span containing one — the whole token stays literal: `'**2 * 3 * 4**'`. The plan author mis-modeled the regex; its stated value contradicts the higher-priority, cross-plan-mandated character-identity contract (`cross_plan_contract`; Plan 05 asserts source identity).
- **Fix:** Honored the character-identity contract; the test asserts the true value `'**2 * 3 * 4**'`. To keep the `parseInlineBold ≡ stripInlineMarkdown` invariant, hardened `parseInlineBold`'s bold branch to **also** refuse `*`-bearing content (mirroring `[^*\n]`) — otherwise the scanner would strip the outer `**` to a `'2  3  4'` bold segment while `stripInlineMarkdown` keeps it literal, breaking the invariant and misaligning bold runs after bidi reorder (the exact WARNING 4 / T-45-03 failure). WARNING 4's spirit is fully honored: the two functions agree byte-for-byte on this input, and the inner-italic strip is hardened in lockstep (now inert since bold content is `*`-free, but retained as a character-identical mirror).
- **Files modified:** `assets/pdf-export.js`, `tests/45-inline-hardening.test.js`. **Commits:** `594b36c`.

### 2. [Rule 3 — test seam] `PDFExport.__test`

- The internal helpers are lexically scoped in the IIFE and not on the public API. Added a small `__test` object (documented as non-public) so Task 1/2 can assert the D-08 table, the invariant, and per-item nested-list parsing directly. **Commit:** `5db88f4`.

### 3. [Rule 1 — quality-gate compliance] inline-hardening test refactor (`36c495c`)

- The repo's `30-fake-test-detector` gate flagged `45-inline-hardening.test.js` (rule a: reads `assets/*.js` as text but passed no var to an execution sink — the eval was hidden inside the shared jsPDF helper). Refactored the test to evaluate `pdf-export.js` directly via `window.eval(src)` (the pure emphasis helpers need no jsPDF/font deps) and converted the no-lookbehind guard to an `assert.ok` presence check. Behavior assertions unchanged; full suite green.

## TDD / RED confirmation

Both tests were confirmed RED on pre-change source before implementation:
- **Task 1:** `stripInlineMarkdown('2 * 3 * 4')` returned `'2  3  4'` (mangled); the invariant diverged on `'**2 * 3 * 4**'` (`'**2  3  4**'` vs `'2  3  4'`).
- **Task 2:** the mixed nested item rendered `'-   1. beta'`; LTR/RTL depth anchors were equal (depth ignored); the RTL mixed ordered child produced **0** split-row ordinal prefixes (`block.ordered` false skipped the path).

## Verification

- `node tests/45-inline-hardening.test.js` → 17/17 pass (exit 0)
- `node tests/45-pdf-nested-lists.test.js` → 8/8 pass (exit 0)
- `node tests/run-all.js` → **177 passed, 0 failed** (existing PDF tests Phase 23/34 + iwr/c8x/cx5 unchanged; fake-test-detector green)

## Deferred / out of scope

- `tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js` fails when run **standalone** (legacy `/tmp/node_modules/jsdom` resolution not migrated to the shared helper). This is pre-existing and environmental — it fails identically on pre-change source, passes under `run-all.js` (which sets `JSDOM_PATH`). Not touched. (Logged for a future test-hygiene pass.)
- Note-heading D-02/D-03 work is intentionally excluded (Plan 03, same file — sequenced one hand at a time).
- Cross-file source identity between `md-render.js` and `pdf-export.js` is asserted authoritatively by **Plan 05 Task 1** (a local presence smoke guard exists here).

## Self-Check: PASSED
