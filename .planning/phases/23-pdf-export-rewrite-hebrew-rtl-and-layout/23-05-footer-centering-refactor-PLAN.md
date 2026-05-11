---
phase: 23-pdf-export-rewrite-hebrew-rtl-and-layout
plan: 23-05
parent_phase: 23
title: Footer "Page X of Y" centering refactor (manual math → align center)
type: execute
wave: 3
depends_on:
  - 23-02
  - 23-03
files_modified:
  - assets/pdf-export.js
autonomous: true
requirements:
  - 23-T6
tags:
  - phase-23
  - pdf
  - layout
  - centering
  - refactor
  - cosmetic
must_haves:
  truths:
    - "The 'Page X of Y' footer stays centered (no regression from current behavior). (T6 — closed here AND was the pre-existing behavior. The footer was already centered before Phase 23 via manual (PAGE_W - getStringUnitWidth*fontSize)/2 math at L506–509. This plan refactors that to use jsPDF's documented `{ align: 'center' }` API for consistency with the title-block centering 23-03 introduced. The visual output is byte-identical for typical page-count values — RESEARCH 'What about the existing footer centering?' confirms the two centering approaches produce identical output. The motivation is purely code-clarity: the manual math uses getStringUnitWidth which returns text-space units (not pt) and the multiplication by META_SIZE is doing the unit conversion manually — awkward and easy to misuse in future maintenance.)"
  artifacts:
    - path: "assets/pdf-export.js"
      provides: "Single-task footer simplification. The footer-rendering loop inside buildSessionPDF (currently L497–510 post-Phase-23-02 — note: 23-02 removed `doc.setR2L(false)` at the old L502, so the post-23-02 line count is reduced by 1) drops the manual-math centering (`var approxWidth = doc.getStringUnitWidth(label) * META_SIZE; var fx = (PAGE_W - approxWidth) / 2; doc.text(label, fx, FOOTER_BASELINE_Y);`) and replaces it with the canonical jsPDF centering form (`doc.text(label, pageWidth / 2, FOOTER_BASELINE_Y, { align: 'center' });`). The `pageWidth` local introduced by Plan 23-03 is reused (NOT redeclared inside the footer loop — the existing var at the top of buildSessionPDF is in scope). The `approxWidth` and `fx` local variables become dead and are removed. Visual output is identical: jsPDF's internal centering math uses doc.getTextWidth() which is the pt-correct sum of glyph advance widths — equivalent to (and slightly more correct than) the manual `getStringUnitWidth * fontSize` form (the latter is an approximation because it doesn't account for kerning or character-spacing adjustments; for ASCII page-counter strings this difference is invisible, but the canonical form is more robust to font changes)."
      contains: "FOOTER_BASELINE_Y"
  key_links:
    - from: "assets/pdf-export.js footer-loop draw call (currently L506–509 post-23-02)"
      to: "doc.text with `{ align: 'center' }` at pageWidth/2"
      via: "The 4-line manual-math centering (var approxWidth = doc.getStringUnitWidth(label) * META_SIZE; var fx = (PAGE_W - approxWidth) / 2; doc.text(label, fx, FOOTER_BASELINE_Y);) collapses to a single doc.text call: doc.text(label, pageWidth / 2, FOOTER_BASELINE_Y, { align: 'center' }). The pageWidth local from 23-03 is reused. The footer text 'Page X of Y' remains Latin/digit-only, so no shapeForJsPdf wrap is needed (firstStrongDir returns 'ltr', getReorderSegments returns []; shaping is a no-op — RESEARCH 'Specific edit points' table footer row)."
      pattern: "align.*center"
---

<objective>
Cosmetic refactor: replace the page-counter footer's manual-math centering with jsPDF's canonical `{ align: 'center' }` API for consistency with the title-block centering introduced by 23-03.

Per RESEARCH 'What about the existing footer centering?': the current manual form (`var approxWidth = doc.getStringUnitWidth(label) * META_SIZE; var fx = (PAGE_W - approxWidth) / 2;`) works but is awkward — `getStringUnitWidth` returns text-space units (not pt), and the multiplication by `META_SIZE` is doing the unit conversion manually. The canonical `doc.text(label, pageWidth/2, y, { align: 'center' })` form is one line shorter, self-documenting, and uses jsPDF's internal pt-correct width measurement.

Per RESEARCH 'Open Questions for the Planner #3': this refactor was offered as an OPTIONAL extension during Phase 23 — fold into 23-03 OR stand alone. **Locked at planning time: stand alone as 23-05.** Reason: keeping 23-03 narrowly focused on the locked D3 + D4 decisions (margins + title block) means 23-03's verification is cleaner and the executor can ship 23-03 even if the optional footer refactor is later cut. 23-05 can also be safely skipped without affecting any UAT truth — T6 ("footer stays centered") is satisfied by both the pre-refactor and post-refactor forms; this plan only changes HOW centering is computed, not WHETHER.

**This is a no-behavior-change refactor.** The visual output is byte-identical for typical page-count strings (verified by RESEARCH — the two centering approaches produce identical output for ASCII labels under fixed font + size). Plan 23-04's Latin-regression hashes (if captured BEFORE this plan ships) would still match AFTER this plan ships, because the rendered glyph positions don't change. Plan 23-04 is in Wave 3 alongside this plan; the orchestrator decides ordering. If 23-04 runs BEFORE 23-05, the executor of 23-05 must re-run the regeneration step from 23-04's harness and verify the new hashes match the old ones byte-for-byte (which they will, modulo the same /CreationDate deterministic-date pin). If the hashes DO change unexpectedly, that flags a regression — either jsPDF's `align: 'center'` is NOT pt-correct for this label/font combo (research said it is — flag for re-investigation), OR the executor accidentally introduced a side effect.

**Wave 3 dependency reason:** depends on 23-03 because the `pageWidth` local that this plan reuses is introduced by 23-03. Depends on 23-02 transitively (23-03 depends on 23-02). 23-05 and 23-04 are both Wave 3; they are independent of each other except for the "if 23-04 ran first, verify hashes still match" cross-check noted above.

Purpose: Code-clarity / maintainability — bring the footer in line with how the title block centers, so future readers don't see two different centering idioms in the same file. **Optional plan — phase ships without it if context budget runs out or if the orchestrator deprioritizes refactor work.**

Output:
- Updated `assets/pdf-export.js`: footer draw call simplified from 4 lines to 1 (manual approxWidth + fx removed; canonical `align: 'center'` form adopted).

**Manual UAT confirmation NOT required.** The visual output is unchanged. Ben may optionally eyeball one exported PDF post-refactor to confirm the footer still looks centered, but it's a sanity check, not a gate. If 23-04's harness ran before this plan and the regen-after-23-05 hashes match the pre-23-05 hashes byte-for-byte, that's the strongest possible automated confirmation.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-CONTEXT.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-RESEARCH.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-02-bidi-preshape-and-setR2L-removal-PLAN.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-03-margins-and-title-centering-PLAN.md
@assets/pdf-export.js

## UAT truth statement being closed (verbatim from 23-CONTEXT.md)

1. **T6:** "The 'Page X of Y' footer stays centered (no regression from current behavior)." This plan refactors the centering math; the visual output is unchanged. T6 was already satisfied by the pre-23 manual-math form — this plan preserves T6 while improving code clarity.

## Locked decisions

- **RESEARCH Open Question #3 — fold or stand-alone:** stand alone as 23-05. Locked.
- **D5 (CONTEXT)** — no migration; PDFs are stateless.

## Current footer-loop code (post-Phase-23-02 form)

Per 23-02's task description, the footer-pass at L497–510 currently reads (after 23-02 removed `doc.setR2L(false)`):

```javascript
var totalPages = doc.getNumberOfPages();
for (var pn = 1; pn <= totalPages; pn++) {
  doc.setPage(pn);
  // Phase 23: footer is always Latin (page number), Noto Sans + LTR. setR2L call removed (G1 — no other code path sets R2L=true after Phase 23, so the reset is redundant).
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(META_SIZE);
  var label = "Page " + pn + " of " + totalPages;
  // Center: jsPDF text "align" option requires a maxWidth; we use a
  // simple manual centering instead, since we know the line is short.
  var approxWidth = doc.getStringUnitWidth(label) * META_SIZE;
  var fx = (PAGE_W - approxWidth) / 2;
  doc.text(label, fx, FOOTER_BASELINE_Y);
}
```

After Plan 23-05, the same block reads:

```javascript
var totalPages = doc.getNumberOfPages();
for (var pn = 1; pn <= totalPages; pn++) {
  doc.setPage(pn);
  // Phase 23: footer is always Latin (page number), Noto Sans + LTR. setR2L call removed (G1).
  // Phase 23 (23-05) — centered via jsPDF's canonical { align: 'center' } API for consistency with the title-block centering in 23-03. Equivalent to the previous manual (PAGE_W - getStringUnitWidth * fontSize)/2 form but self-documenting and uses jsPDF's pt-correct internal width measurement (which slightly outperforms the manual approximation under kerning-active fonts; for the ASCII page-counter string this difference is invisible).
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(META_SIZE);
  var label = "Page " + pn + " of " + totalPages;
  doc.text(label, pageWidth / 2, FOOTER_BASELINE_Y, { align: 'center' });
}
```

The line count drops from ~13 lines (with the centering math) to ~10 lines. The `approxWidth` and `fx` local declarations are removed. The two `// Center: jsPDF text "align" option requires a maxWidth...` comment lines are also removed (replaced by the new Phase 23 (23-05) explanation comment — the old comment is wrong; jsPDF's align option does NOT require maxWidth for single-line text, per RESEARCH 'Centering math (D4)' verified via Context7).

## pageWidth scope check

Plan 23-03 introduces `var pageWidth = doc.internal.pageSize.getWidth();` immediately after `registerFonts(doc);` (currently L328, before the layout-constants block). The footer loop at L497+ is inside the SAME function (buildSessionPDF) and inside the SAME scope as the pageWidth declaration — there is no nested function or IIFE between them. `pageWidth` is in scope at the footer-draw site by simple lexical scope. No new declaration is needed in this plan.

## What this plan does NOT do

- Does NOT touch the footer text content ("Page X of Y" stays as-is).
- Does NOT touch the footer position (FOOTER_BASELINE_Y at L347 stays as-is — currently `PAGE_H - 32`, which means the footer sits 32pt above the bottom of the page regardless of the MARGIN_BOTTOM bump in 23-03; this is the existing intentional behavior).
- Does NOT touch the font (`NotoSans, "normal"` stays).
- Does NOT touch the font size (`META_SIZE` stays).
- Does NOT touch the per-page loop structure (the for-loop, getNumberOfPages, setPage all stay).
- Does NOT add shapeForJsPdf to the footer (the label is always Latin/digits — `shapeForJsPdf("Page 1 of 5")` returns `"Page 1 of 5"` byte-identical; calling it would be a no-op AND would add a function-call overhead on every page, undesirable for a Latin-only footer).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace footer manual-math centering with `{ align: 'center' }`</name>
  <files>assets/pdf-export.js</files>
  <action>
    **Step A — Refactor the footer-loop centering (RESEARCH Open Question #3 resolution).** `assets/pdf-export.js`.

    Locate the footer pass (currently L497–510 post-23-02). Inside the per-page for-loop, find these lines:

    ```javascript
    // Center: jsPDF text "align" option requires a maxWidth; we use a
    // simple manual centering instead, since we know the line is short.
    var approxWidth = doc.getStringUnitWidth(label) * META_SIZE;
    var fx = (PAGE_W - approxWidth) / 2;
    doc.text(label, fx, FOOTER_BASELINE_Y);
    ```

    REPLACE the entire 5-line block (2 comment lines + approxWidth declaration + fx declaration + doc.text call) with:

    ```javascript
    // Phase 23 (23-05) — centered via jsPDF's canonical { align: 'center' } API for consistency with the title-block centering in 23-03. Equivalent to the previous manual (PAGE_W - getStringUnitWidth * fontSize) / 2 form. The pageWidth local was introduced by 23-03 and is in scope here.
    doc.text(label, pageWidth / 2, FOOTER_BASELINE_Y, { align: 'center' });
    ```

    Net change: 5 lines down to 2 lines.

    Do NOT touch any other line in the footer loop:
    - `var totalPages = doc.getNumberOfPages();` stays.
    - `for (var pn = 1; pn <= totalPages; pn++) {` stays.
    - `doc.setPage(pn);` stays.
    - The `// Phase 23: footer is always Latin...` comment immediately above `doc.setFont` stays.
    - `doc.setFont("NotoSans", "normal");` stays.
    - `doc.setFontSize(META_SIZE);` stays.
    - `var label = "Page " + pn + " of " + totalPages;` stays.

    Do NOT touch any code outside the footer loop. Do NOT touch FOOTER_BASELINE_Y (the constant at L347 stays at `PAGE_H - 32`).

    **Step B — Verification before commit.**

    - File parses: `node -c assets/pdf-export.js`
    - The manual-math locals are gone: `grep -c 'var approxWidth' assets/pdf-export.js` returns 0 AND `grep -c 'var fx' assets/pdf-export.js` returns 0
    - The `getStringUnitWidth` call is gone: `grep -c 'getStringUnitWidth' assets/pdf-export.js` returns 0 (it was used in exactly one place — the footer — so removal here means it's gone entirely from the file)
    - The footer now uses align center: `awk '/var totalPages = doc.getNumberOfPages/,/^      }$/' assets/pdf-export.js | grep -c "align: 'center'"` returns 1
    - The footer still uses FOOTER_BASELINE_Y: `awk '/var totalPages = doc.getNumberOfPages/,/^      }$/' assets/pdf-export.js | grep -c 'FOOTER_BASELINE_Y'` returns 1
    - The footer label string is unchanged: `grep -c 'Page " + pn + " of "' assets/pdf-export.js` returns 1
    - 23-03's pageWidth declaration is still present (regression guard): `grep -c 'var pageWidth = doc.internal.pageSize.getWidth' assets/pdf-export.js` returns 1
    - All Phase-23 invariants still hold (regression guards):
      - `grep -c 'setR2L' assets/pdf-export.js` returns 0 (23-02 invariant)
      - `grep -c 'loadScriptOnce.*bidi.min.js' assets/pdf-export.js` returns ≥1 (23-02 invariant)
      - `grep -cE 'MARGIN_X = 71|MARGIN_TOP = 71|MARGIN_BOTTOM = 71' assets/pdf-export.js` returns ≥3 (23-03 invariant — all 3 bumps still in place)
      - `grep -c "align: 'center'" assets/pdf-export.js` returns ≥3 (2 from 23-03 title-block + 1 new in this plan = 3 total minimum)

    **Step C — (Conditional) re-run 23-04's Latin-regression harness if 23-04 ran first.**

    If 23-04 has already shipped (Wave 3 ordering decision by the orchestrator), the .sha256 baselines were captured BEFORE this refactor. Two scenarios:

    1. **Expected outcome:** jsPDF's `{ align: 'center' }` produces the same byte output as the manual-math form (RESEARCH confirms equivalence for ASCII labels). The post-23-05 hashes match the committed baselines, and `node tests/pdf-latin-regression.test.js` exits 0 without changes. No action required.

    2. **Unexpected outcome:** the hashes change. This flags one of three things: (a) jsPDF's align math diverges from the manual form for this font/size (RESEARCH said it doesn't — investigate), (b) the executor accidentally introduced a side effect, (c) jsPDF's internal getTextWidth uses a font-metric source different from getStringUnitWidth (possible — both are valid pt-correct numbers but rounding could differ at the sub-pt level). In any case: re-run 23-04's harness with `--regenerate`, eyeball one of the regenerated PDFs to confirm the footer looks visually identical (the human eye won't see sub-pt differences), and commit the new hashes with a message naming this 23-05 refactor as the legitimate cause.

    If 23-04 has NOT yet shipped at the time this plan runs (orchestrator deferred 23-04 to after 23-05), no harness re-run is needed — 23-04 will capture the post-23-05 baselines as its first hash output.

    Commit message: `refactor(23-05): footer centering uses align center API (consistency with 23-03 title block)`
  </action>
  <verify>
    <automated>node -c assets/pdf-export.js &amp;&amp; [ "$(grep -c 'var approxWidth' assets/pdf-export.js)" -eq 0 ] &amp;&amp; [ "$(grep -c 'var fx' assets/pdf-export.js)" -eq 0 ] &amp;&amp; [ "$(grep -c 'getStringUnitWidth' assets/pdf-export.js)" -eq 0 ] &amp;&amp; [ "$(awk '/var totalPages = doc.getNumberOfPages/,/^      }$/' assets/pdf-export.js | grep -c "align: 'center'")" -eq 1 ] &amp;&amp; [ "$(awk '/var totalPages = doc.getNumberOfPages/,/^      }$/' assets/pdf-export.js | grep -c 'FOOTER_BASELINE_Y')" -eq 1 ] &amp;&amp; [ "$(grep -c 'Page \" + pn + \" of \"' assets/pdf-export.js)" -eq 1 ] &amp;&amp; [ "$(grep -c 'var pageWidth = doc.internal.pageSize.getWidth' assets/pdf-export.js)" -eq 1 ] &amp;&amp; [ "$(grep -c 'setR2L' assets/pdf-export.js)" -eq 0 ] &amp;&amp; [ "$(grep -c 'loadScriptOnce.*bidi.min.js' assets/pdf-export.js)" -ge 1 ] &amp;&amp; [ "$(grep -cE 'MARGIN_X = 71|MARGIN_TOP = 71|MARGIN_BOTTOM = 71' assets/pdf-export.js)" -ge 3 ] &amp;&amp; [ "$(grep -c "align: 'center'" assets/pdf-export.js)" -ge 3 ]</automated>
  </verify>
  <done>
    - Manual-math footer centering removed: `var approxWidth` and `var fx` declarations gone; `getStringUnitWidth` no longer appears anywhere in the file.
    - Footer uses canonical `doc.text(label, pageWidth / 2, FOOTER_BASELINE_Y, { align: 'center' })` form.
    - Per-page loop structure unchanged; font + size + label string unchanged; FOOTER_BASELINE_Y still used.
    - 23-02 invariants preserved (setR2L still gone, bidi load still wired).
    - 23-03 invariants preserved (3 margin bumps to 71pt still in place; pageWidth local still declared).
    - 3+ `align: 'center'` occurrences in the file: 2 in drawPage1Header (23-03) + 1 in footer (this plan).
    - If 23-04's harness ran before this plan: hashes still pass against the committed baselines (or regenerated + recommitted with this plan's commit as the documented cause).
    - File parses; all 12 automated gates pass.
  </done>
</task>

</tasks>

<verification>
- Manual-math footer centering removed: `grep -c 'getStringUnitWidth' assets/pdf-export.js` == 0 AND `grep -c 'var approxWidth' assets/pdf-export.js` == 0 AND `grep -c 'var fx' assets/pdf-export.js` == 0.
- Canonical centering API used in footer: `awk '/var totalPages/,/^      }$/' assets/pdf-export.js | grep -c "align: 'center'"` == 1.
- 3+ centered draws total in the file: `grep -c "align: 'center'" assets/pdf-export.js` ≥ 3 (2 from 23-03 + 1 from this plan).
- File parses: `node -c assets/pdf-export.js` exits 0.
- All Phase-23 invariants preserved: setR2L gone, bidi load wired, margins at 71pt, pageWidth declared.
- Footer label string and per-page loop unchanged.
- Optional: 23-04 harness re-run produces no hash drift (or drift is documented and the .sha256 files regenerated with this plan as the cited cause).
</verification>

<success_criteria>
- [ ] Footer centering uses `{ align: 'center' }` at `pageWidth / 2`.
- [ ] Manual-math locals (`approxWidth`, `fx`) and `getStringUnitWidth` call removed.
- [ ] Total centered call sites in the file ≥ 3 (title + meta + footer).
- [ ] All Phase-23 invariants preserved (setR2L absence, bidi wiring, 71pt margins, pageWidth local).
- [ ] File parses; all 12 automated gates pass.
- [ ] If 23-04 ran before this plan: hashes either match (no action) or are regenerated and the new .sha256 files committed with a message citing 23-05 as the cause.
- [ ] Phase 23 is now complete pending final orchestrator-level UAT roll-up.
</success_criteria>

<output>
After completion, create `.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-05-footer-centering-refactor-SUMMARY.md` capturing:
- Whether 23-04 ran before 23-05 (and if so, whether the regression hashes drifted).
- Whether the visual footer output was eyeballed post-refactor (optional sanity check).
- Any deviations from the planned approach (expected: none — this is a 5-line cosmetic refactor).
</output>
</content>
