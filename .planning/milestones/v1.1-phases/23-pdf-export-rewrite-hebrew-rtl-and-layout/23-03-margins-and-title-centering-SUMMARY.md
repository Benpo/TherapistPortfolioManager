---
phase: 23-pdf-export-rewrite-hebrew-rtl-and-layout
plan: 23-03
parent_phase: 23
title: A4-safe-zone margins (71pt) + centered title block — SUMMARY
type: summary
wave: 2
status: shipped-pending-uat
requirements:
  - 23-T4
  - 23-T5
tags:
  - phase-23
  - pdf
  - layout
  - margins
  - centering
  - a4
  - summary
commits:
  - hash: 9e0d71a
    type: feat
    message: A4 71pt margins + centered title block on page 1 (D3, D4)
files_modified:
  - assets/pdf-export.js
  - sw.js
metrics:
  margin_x_before: 56
  margin_x_after: 71
  margin_top_before: 64
  margin_top_after: 71
  margin_bottom_before: 64
  margin_bottom_after: 71
  usable_w_before_pt: 483
  usable_w_after_pt: 453
  usable_w_delta_pt: -30
  centered_draws_added: 2
  pageWidth_locals_added: 1
  dead_titleX_removed: 1
  drawTextLine_calls_in_title_block_before: 1
  drawTextLine_calls_in_title_block_after: 0
  lines_added_total: 33
  lines_removed_total: 13
  cache_name_bumped: sessions-garden-v84 -> sessions-garden-v85
  automated_gates_passed: 14
---

# Phase 23 Plan 03: A4-safe-zone margins + centered title block — SUMMARY

**One-liner:** Bumped all four A4 margins to the 25.06mm safe zone (71pt) and centered the page-1 title block (client name + meta line) via `doc.text(visual, pageWidth/2, y, { align: 'center' })` — `USABLE_W` recomputes 483pt → 453pt automatically; body content stays left/right-anchored per D4; all 23-02 bidi work preserved.

## What shipped

### Code changes (assets/pdf-export.js)

**Layout-constants block (L405–410 → L413–422):** Three constant bumps preceded by a 4-line comment citing D3 and the 25.06mm A4 safe-zone rationale. `MARGIN_X` 56→71, `MARGIN_TOP` 64→71, `MARGIN_BOTTOM` 64→71. The `USABLE_W = PAGE_W - 2 * MARGIN_X` formula stays byte-identical; only its trailing comment updates `// 483 pt` → `// 453 pt (was 483pt pre-Phase-23)`. None of the pre-bump values (56/64/64) survive anywhere in the file.

**`pageWidth` local (new, immediately after `registerFonts(doc);`):** `var pageWidth = doc.internal.pageSize.getWidth();` declared exactly once, prefixed by a 6-line comment explaining the D4 rationale and confirming that the legacy `PAGE_W = 595` constant stays for `USABLE_W`, RTL right-margin anchoring (`PAGE_W - MARGIN_X` in `drawTextLine`, `drawRunningHeader`, list rendering), and the footer centering math.

**`drawPage1Header()` title draw:** The dead `var titleX = isRtl(clientName) ? (PAGE_W - MARGIN_X) : MARGIN_X;` declaration removed (centering is locale-agnostic — no anchor flip needed). The `doc.text(...)` call switches to `doc.text(titleVisual, pageWidth / 2, titleY, { align: 'center' })`. The `shapeForJsPdf(clientName || " ")` wrap inserted by 23-02 stays — it produces the visual-order string the centering math measures. Function-leading comment rewritten to reflect the new D4 rationale and explicitly call out that the bidi pre-shape stays.

**`drawPage1Header()` meta line draw:** The `drawTextLine(metaText, metaY, META_SIZE)` call replaced with an inline 4-line centered draw — `applyFontFor(metaText); doc.setFontSize(META_SIZE); var metaVisual = shapeForJsPdf(metaText); doc.text(metaVisual, pageWidth / 2, metaY, { align: 'center' });`. A 7-line comment block above the draw documents why `drawTextLine` is bypassed here (centering is title-block-only per D4; body callers of `drawTextLine` still want left/right anchor flip). The `return metaY + LINE_HEIGHT_META + 8;` cursor return is untouched — the meta line still consumes the same vertical space regardless of horizontal alignment.

**Untouched (verified):** `drawTextLine()` itself, `drawRunningHeader()`, the list-rendering block, the footer pass, every body-content draw site, the `shapeForJsPdf` / `firstStrongDir` / `applyFontFor` / `isRtl` helpers, and every `BODY_SIZE` / `HEADING_SIZE` / `META_SIZE` / `TITLE_SIZE` / `LINE_HEIGHT_*` / `FOOTER_BASELINE_Y` / `RUNNING_HEADER_Y` constant. `RUNNING_HEADER_Y = MARGIN_TOP - 24` propagates the bump automatically — running header now sits at y=47pt, still well within the printable area.

### Verification gates — all 14 automated checks pass

| # | Gate | Expected | Actual |
|---|------|----------|--------|
| 1 | `node -c assets/pdf-export.js` | exit 0 | OK |
| 2 | `grep -cE 'MARGIN_X = 71' …` | ≥ 1 | 1 |
| 3 | `grep -cE 'MARGIN_TOP = 71' …` | ≥ 1 | 1 |
| 4 | `grep -cE 'MARGIN_BOTTOM = 71' …` | ≥ 1 | 1 |
| 5 | `grep -cE 'MARGIN_X = 56\|MARGIN_TOP = 64\|MARGIN_BOTTOM = 64' …` | == 0 | 0 |
| 6 | `grep -c 'var USABLE_W = PAGE_W - 2 \* MARGIN_X' …` | == 1 | 1 |
| 7 | `grep -c 'var pageWidth = doc.internal.pageSize.getWidth' …` | == 1 | 1 |
| 8 | `grep -c "align: 'center'" …` | ≥ 2 | 2 |
| 9 | `awk '/function drawPage1Header/,/return metaY/' \| grep -c 'pageWidth / 2'` | ≥ 2 | 2 |
| 10 | `grep -c 'var titleX' …` | == 0 | 0 |
| 11 | `awk '/function drawTextLine/,/^      }$/' \| grep -c 'PAGE_W - MARGIN_X'` | ≥ 1 | 1 |
| 12 | `awk '/function drawPage1Header/,/return metaY/' \| grep -c 'shapeForJsPdf'` | ≥ 2 | 3 (title wrap + meta wrap + the comment ref `(shapeForJsPdf, from Plan 23-02)`) |
| 13 | `grep -c 'loadScriptOnce.*bidi.min.js' …` | ≥ 1 | 2 (1 call + 1 comment ref — 23-02's count, unchanged) |
| 14 | `grep -c 'setR2L' …` | == 0 | 0 |

The consolidated chained `<verify>` block from the plan also passed end-to-end (`ALL_GATES_PASS`).

### Margin / USABLE_W summary

| Constant | Before | After | Delta |
|----------|--------|-------|-------|
| `MARGIN_X` (pt) | 56 | 71 | +15 |
| `MARGIN_TOP` (pt) | 64 | 71 | +7 |
| `MARGIN_BOTTOM` (pt) | 64 | 71 | +7 |
| `USABLE_W` (pt, computed) | 483 | 453 | −30 |
| `MARGIN_X` (mm @ 72dpi) | 19.76 | 25.06 | +5.30 |
| `MARGIN_TOP` (mm @ 72dpi) | 22.58 | 25.06 | +2.48 |
| `MARGIN_BOTTOM` (mm @ 72dpi) | 22.58 | 25.06 | +2.48 |

All four edges now sit at the same 25.06mm safe-zone — symmetric per D3, matching the LibreOffice/Word A4 default and within 1pt of the US Letter 1-inch convention.

`pageWidth` was wired exactly as planned via `doc.internal.pageSize.getWidth()`. No fallback, no condition, no manual-math alternative. The legacy `PAGE_W = 595` constant stays in place for all non-centering consumers.

## Deviations from Plan

**None.** The plan executed byte-exactly as written:

- All three `Edit` calls landed on the first attempt with no anchor-matching surprises despite the plan's predicted line-number drift from 23-02's ~70 inserted lines (the Edit tool's content-based matching ignored the drift, as the dispatch instruction predicted).
- All 14 automated gates passed without retry.
- No regression-fix attempts needed — 23-02's work (shapeForJsPdf wraps at title + meta sites, setR2L deletion, bidi load chain) survived intact and was verified post-edit.
- The pre-commit hook auto-bumped `sw.js` `CACHE_NAME` from `sessions-garden-v84` to `sessions-garden-v85` — this is the project's standard service-worker-version-bumping behavior whenever `assets/*` changes and is not a deviation; `sw.js` was therefore included in the commit alongside `assets/pdf-export.js`.

### Line-number drift from plan

The plan correctly predicted that its line-number references (L327, L328, L335–337, L380–400, L388, L396, L411, L444, L497–510) would be off after 23-02's ~70-line insertion. Actual landing positions in the post-23-02 file were:
- `registerFonts(doc);` at L400 (plan said L328 — drift +72)
- `var MARGIN_X = 56;` at L407 (plan said L335 — drift +72)
- `function drawPage1Header()` at L456 (plan said L380 — drift +76)
- `var titleX = ...` at L463 (plan said L387 — drift +76)
- `drawTextLine(metaText, ...)` at L473 (plan said L396 — drift +77)

**Resolution:** Used the `Edit` tool with content-based `old_string` matching against structural anchors (`var MARGIN_X = 56;`, the full `function drawPage1Header()` body, the `var doc = new jsPDF` + `registerFonts(doc);` + layout-constants-comment-block sequence). All three edits landed on the first try without needing to consult line numbers. Zero retries.

## UAT outcome notes

**Ben's UAT (margins + centering — visual + home-printer):** **Pending — to be filled in after Ben round-trips a home-printer test post-Wave-3.** This session is on track to ship 23-02 → 23-03 → 23-04 → 23-05 as a single coherent Wave 2 + Wave 3 changeset; per the dispatch plan, manual UAT is held until all of Phase 23's PDF-side changes are in place so Ben evaluates one combined surface.

When the UAT round runs, the test list per the plan's `<verification>` section is:
- Print the deployed PDF on Ben's home printer — confirm no content clipped at any of the four edges.
- Title block (client name + meta line) visually centers on page 1 for an English client name (e.g. "Anna M.").
- Title block visually centers on page 1 for a Hebrew client name (combined check with 23-02 — Hebrew should still render in correct visual order AND now also center horizontally).
- Meta line ("date - sessionType") sits centered immediately below the title.
- Body paragraphs / lists / section headings still anchor left for LTR sessions and right for RTL sessions (D4 — body stays anchored; only the title block centers).
- Per-page line density: spot-check whether the narrower 453pt usable width (down 30pt from 483pt) feels noticeably tighter — RESEARCH Open Question #2 estimated ~1 extra body-line per ~7 pages; if Ben feels density became a problem, that's input for a future `LINE_HEIGHT_BODY` tweak phase, not a 23-03 rollback.

**Sapir's UAT:** Not required for this plan per the plan's `<objective>` block. Hebrew-rendering correctness lives in 23-02; the centering math here is locale-agnostic (`pageWidth/2` is the same number whether the visual string is Hebrew or English).

## New gotchas discovered during execution

**G15 (new — minor): `awk` block-range matching can over-count `shapeForJsPdf` when the function body now contains comment references to it.** The 23-03 plan's gate `awk '/function drawPage1Header/,/return metaY/' | grep -c 'shapeForJsPdf'` expected `≥ 2` (one wrap at the title, one at the meta) and got `3` — the third hit is the new function-leading comment that says `(shapeForJsPdf, from Plan 23-02)`. The `≥ 2` threshold accommodates this naturally, but future plans that move from `== N` to `>= N` should pre-emptively allow for documentation references to the helper name showing up in nearby comments. Not a regression — just a calibration note for gate authoring.

## Self-Check: PASSED

- `assets/pdf-export.js` — modified in commit `9e0d71a`. Verified: `git log --oneline assets/pdf-export.js | head -1` shows hash. **FOUND.**
- `sw.js` — bumped by pre-commit hook in commit `9e0d71a`. **FOUND.**
- Commit `9e0d71a` exists on `main` (`git log --oneline | grep 9e0d71a` returns hit). **FOUND.**
- All 14 automated gates re-run and confirmed passing (output `ALL_GATES_PASS` from the consolidated `<verify>` block).
- No file deletions in this commit (`git diff --diff-filter=D --name-only HEAD~1 HEAD` returns empty).
- This SUMMARY file written to `.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-03-margins-and-title-centering-SUMMARY.md`.

## Hand-off to next plan

Wave 3 unlocks. Plan 23-04 (test vectors + Latin regression) and Plan 23-05 (optional footer centering refactor) can both run now — neither modifies the title block or the layout constants this plan touched, so they can run in parallel without serializing on `assets/pdf-export.js`:

- **23-04** depends on both 23-02 AND 23-03 because the regression-fixture hashes must reflect the post-rewrite layout (margin bump + title centering both alter the byte-stream of every generated PDF, including Latin-only sessions, because the page-1 title block always renders).
- **23-05** is logically independent — it touches the footer pass at the post-23-02 line range L575–586 (the `setR2L(false)` was already deleted, but the footer-x-anchor math could be refactored to use `pageWidth/2` for self-documenting symmetry with the new title-block centering). 23-05 is marked optional; it can be skipped if the orchestrator wants to ship Phase 23 as a 4-plan sequence instead of 5.

UAT (Ben — home-printer + visual centering) is held until Wave 3 completes — the round-up message will cover all Phase 23 PDF changes at once.
