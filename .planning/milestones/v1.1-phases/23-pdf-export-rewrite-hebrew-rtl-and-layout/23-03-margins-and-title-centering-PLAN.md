---
phase: 23-pdf-export-rewrite-hebrew-rtl-and-layout
plan: 23-03
parent_phase: 23
title: A4-safe-zone margins (71pt) + centered title block
type: execute
wave: 2
depends_on:
  - 23-01
  - 23-02
files_modified:
  - assets/pdf-export.js
autonomous: true
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
must_haves:
  truths:
    - "The printed PDF has ~25mm visible margins on all four edges — no content clipped on a standard home printer. (T4 — closed here: MARGIN_X bumped 56→71pt, MARGIN_TOP bumped 64→71pt, MARGIN_BOTTOM bumped 64→71pt. 71pt = 25.06mm at 72dpi, matching the German/EU office-software A4 default and within 1pt of the US Letter 1-inch convention. Verified by RESEARCH section 'Margin / Centering Specifics'.)"
    - "The title block (client name + session date) is horizontally centered on page 1. (T5 — closed here: the drawPage1Header function's title and meta draw calls switch from `doc.text(visual, leftOrRightAnchor, y)` to `doc.text(visual, pageWidth/2, y, { align: 'center' })`. Per D4, only the title block centers; body content keeps its existing left/right anchor logic — that part of drawTextLine and drawRunningHeader was already left intact by 23-02 and stays intact here.)"
  artifacts:
    - path: "assets/pdf-export.js"
      provides: "Three layout changes inside `buildSessionPDF()`. (1) Layout constants (currently L335–337): MARGIN_X 56→71, MARGIN_TOP 64→71, MARGIN_BOTTOM 64→71. USABLE_W recomputes automatically because it's defined as PAGE_W - 2*MARGIN_X (currently L338) — the value goes 483→453pt and no manual recomputation is needed in the source. Add a leading comment immediately above the new constants block explaining the D3 bump and citing the 25mm A4-safe-zone rationale. (2) Title block draw inside drawPage1Header (currently L380–400): the title draw call switches from `doc.text(titleVisual, titleX, titleY)` (where titleX = isRtl ? PAGE_W - MARGIN_X : MARGIN_X, the value left in place by Plan 23-02) to `doc.text(titleVisual, pageWidth/2, titleY, { align: 'center' })`. The meta line currently rendered via `drawTextLine(metaText, metaY, META_SIZE)` (L396) is replaced with an inline centered draw: `var metaVisual = shapeForJsPdf(metaText); applyFontFor(metaText); doc.setFontSize(META_SIZE); doc.text(metaVisual, pageWidth/2, metaY, { align: 'center' });`. The titleX variable declaration at L387 becomes dead code and is REMOVED. (3) `pageWidth` is derived once at the top of buildSessionPDF via `var pageWidth = doc.internal.pageSize.getWidth();` per RESEARCH 'jsPDF page-size API conveniences' — the existing `PAGE_W = 595` constant is KEPT (used by USABLE_W computation and the running-header / list-rendering / footer x-anchor math), but the new centering math uses pageWidth for self-documenting clarity. Both values evaluate to 595 for our locked A4 portrait — equivalent, just cleaner intent at the centering call sites."
      contains: "MARGIN_X = 71"
  key_links:
    - from: "assets/pdf-export.js layout constants (currently L335–337)"
      to: "USABLE_W (currently L338) — recomputes automatically"
      via: "USABLE_W is `PAGE_W - 2 * MARGIN_X`. Bumping MARGIN_X 56→71 propagates automatically — USABLE_W goes 483→453pt. The narrower usable width means splitTextToSize wraps slightly tighter — about 1 body-line difference per ~7 pages (RESEARCH Open Question #2). Acceptable; no code change needed beyond the constant bump. List rendering's USABLE_W - 14 (currently L454) also recomputes automatically (469→439pt usable for list items). Pagination math (`y + neededHeight > PAGE_H - MARGIN_BOTTOM` in ensureRoom at L422) reads MARGIN_BOTTOM dynamically — the 71pt bump propagates without touching ensureRoom."
      pattern: "USABLE_W = PAGE_W - 2 \\* MARGIN_X"
    - from: "assets/pdf-export.js drawPage1Header title draw (currently L388)"
      to: "doc.text() with `{ align: 'center' }` at pageWidth/2"
      via: "The shapeForJsPdf wrap inserted by 23-02 is preserved — only the x-coordinate and the options arg change. The titleX variable declaration that was at L387 (`var titleX = isRtl(clientName) ? PAGE_W - MARGIN_X : MARGIN_X;`) becomes dead code with this change and MUST be removed. Per RESEARCH 'Centering math (D4)': `align: 'center'` is the canonical jsPDF API for centering single-line text around an x-coordinate; no maxWidth needed because the title is always single-line. Equivalent manual math (`doc.getTextWidth(visual); x = (pageWidth - width) / 2; doc.text(visual, x, y);`) produces identical output but is one line longer and less self-documenting."
      pattern: "align.*center"
    - from: "assets/pdf-export.js drawPage1Header meta line (currently L396 — drawTextLine call)"
      to: "doc.text() with `{ align: 'center' }` (inline, NOT via drawTextLine)"
      via: "The current code calls `drawTextLine(metaText, metaY, META_SIZE)` which uses the left/right x-anchor logic. Per D4, only the title block (client name + session date) is centered — and per CONTEXT the meta line IS part of the title block (`{sessionDate} - {sessionType}` rendered immediately below the client name). So the meta draw must ALSO use `align: 'center'`, but drawTextLine doesn't support a centered mode and we don't want to overload it (drawTextLine is also used by body paragraphs which stay left/right-anchored per D4). The fix: replace the drawTextLine call at L396 with an inline 4-line centered draw — applyFontFor, setFontSize, shapeForJsPdf, doc.text-with-align-center. drawTextLine STAYS UNCHANGED — body paragraphs still call it."
      pattern: "align.*center"
    - from: "assets/pdf-export.js buildSessionPDF top-of-function (currently L327–328)"
      to: "var pageWidth = doc.internal.pageSize.getWidth();"
      via: "Per RESEARCH 'jsPDF page-size API conveniences': replace the hard-coded reliance on `PAGE_W = 595` at centering call sites with `doc.internal.pageSize.getWidth()`. The PAGE_W constant stays for all OTHER consumers (USABLE_W computation, RTL right-margin anchor at PAGE_W - MARGIN_X, footer centering math). pageWidth is added as a single new local variable at the top of buildSessionPDF, immediately after `registerFonts(doc)` (currently L328) and before the layout-constants block at L333. For the locked A4 portrait orientation, both values are 595 — equivalent. Using the getter form at centering call sites is self-documenting (the centering math reads `pageWidth/2` instead of `PAGE_W/2` which the reader might mistake for a misuse of the layout constant)."
      pattern: "doc.internal.pageSize.getWidth"
---

<objective>
Bump A4 margins to the locked 25mm safe zone (71pt) and center the title block on page 1.

Per D3 (CONTEXT.md): `MARGIN_X` 56→71pt, `MARGIN_TOP` 64→71pt, `MARGIN_BOTTOM` 64→71pt. Symmetric on all four sides. 71pt = 25.06mm at 72dpi — matches the DE/EU office-software A4 default and is within 1pt of the US Letter 1-inch convention (RESEARCH 'A4 standard confirmed for DE primary locale'). USABLE_W recomputes automatically from `PAGE_W - 2 * MARGIN_X` (483→453pt); narrower usable width means ~1 extra body-line of wrapping density per ~7 pages, which is acceptable (RESEARCH Open Question #2).

Per D4 (CONTEXT.md): the title block (client name + session date) horizontally centers on page 1. The rest of the body — section headings, paragraphs, lists, running header on pages 2+ — keeps its existing left/right anchor logic per `isRtl()`. The body anchor behaviour was already preserved by Plan 23-02 (`drawTextLine` still flips x-anchor based on `isRtl`); this plan does NOT touch that. This plan only changes the **page-1 title block** — two doc.text() call sites inside `drawPage1Header`.

Centering API: per RESEARCH 'Centering math (D4)', the canonical jsPDF call is `doc.text(visualText, x, y, { align: 'center' })` — no `maxWidth` needed for single-line titles. Manual math (`(pageWidth - getTextWidth(text))/2`) produces identical output but is one line longer; we use the `{ align: 'center' }` form per RESEARCH recommendation.

**This plan does NOT touch:** the bidi wiring (23-02's job, already shipped before this plan runs), the footer centering math (23-05's optional refactor), or any body-content anchor logic (stays left/right per D4 + the work already done in 23-02).

**Dependency note:** 23-03 depends on **both** 23-01 and 23-02. 23-02 is the hard dependency because 23-02 inserts the `shapeForJsPdf` wrap at the title-draw site (currently L388) that this plan modifies — without that wrap, 23-03's centered title draw would render Hebrew client names in scrambled order. 23-01 is the transitive dependency (23-02 needs the vendored library). The orchestrator runs 23-02 → 23-03 sequentially within Wave 2 because both modify `assets/pdf-export.js`.

Purpose: Close UAT acceptance criteria T4 (≥25mm visible margins on print, no content clipped on standard home printers) and T5 (page-1 title block horizontally centered).

Output:
- Updated `assets/pdf-export.js`: 3 margin constants bumped, 1 new local `pageWidth` variable, 2 doc.text call sites switched to `{ align: 'center' }`, the now-dead `titleX` variable declaration removed.

**Manual UAT confirmation required from Ben** that (a) the deployed PDF prints on his home printer with no content clipped at the edges, (b) the title block visually centers on page 1 — both for an English client name (e.g. "Anna M.") and a Hebrew client name (e.g. "{hebrew-name}"), and (c) the meta line ("date - sessionType") also centers below the title. **Manual UAT confirmation from Sapir** is NOT required for this plan — the Hebrew rendering correctness checks live in 23-02. The centering math is locale-agnostic (`pageWidth/2` is the same number whether the visual string is Hebrew or English).
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
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-01-vendor-bidi-js-PLAN.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-02-bidi-preshape-and-setR2L-removal-PLAN.md
@assets/pdf-export.js

## UAT truth statements being closed (verbatim from 23-CONTEXT.md)

1. **T4:** "The printed PDF has ~25mm visible margins on all four edges — no content clipped on a standard home printer."
2. **T5:** "The title block (client name + session date) is horizontally centered on page 1."

## Locked decisions from 23-CONTEXT.md (DO NOT re-litigate)

- **D3 — Page margins: bump to A4-safe-zone standard.** `MARGIN_X` 56→71pt, `MARGIN_TOP`/`MARGIN_BOTTOM` 64→71pt. Symmetric all four sides.
- **D4 — Title block centering.** Center client name + session date on page 1. Body content stays left/right-anchored per existing isRtl() logic.
- **D5 — Backward compatibility & migration.** No migration; PDFs are stateless write-once outputs.

## Locked from RESEARCH (Claude's Discretion → resolved)

- **Centering API:** `doc.text(visual, pageWidth/2, y, { align: 'center' })` — the options-object form. Single-line title needs no maxWidth.
- **Manual-math alternative considered + rejected:** `(pageWidth - getTextWidth(visual)) / 2` produces identical output but is one line longer and less self-documenting. The `{ align: 'center' }` form is preferred.
- **pageWidth source:** `doc.internal.pageSize.getWidth()` (modern jsPDF getter form). Single new local variable at the top of buildSessionPDF. The legacy `PAGE_W = 595` constant STAYS — still consumed by USABLE_W, the RTL right-margin anchor (`PAGE_W - MARGIN_X` in drawTextLine, drawRunningHeader, list rendering), and the footer centering math.

## Current pdf-export.js landmarks (line numbers verified)

- L327 — `var doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });`
- L328 — `registerFonts(doc);`
- L333 — `var PAGE_W = 595;`
- L334 — `var PAGE_H = 842;`
- L335 — `var MARGIN_X = 56;` → **bumped to 71**
- L336 — `var MARGIN_TOP = 64;` → **bumped to 71**
- L337 — `var MARGIN_BOTTOM = 64;` → **bumped to 71**
- L338 — `var USABLE_W = PAGE_W - 2 * MARGIN_X;` → **recomputes to 453 automatically**
- L380–400 — `drawPage1Header()` function: title at L384–388, meta line at L391–396
- L387 — `var titleX = isRtl(clientName) ? (PAGE_W - MARGIN_X) : MARGIN_X;` → **REMOVED** (dead code after centering)
- L388 — `doc.text(titleVisual, titleX, titleY);` (Plan 23-02 form; 23-02 wrapped the original `doc.text(clientName || " ", titleX, titleY)` with shapeForJsPdf) → **changed to centered draw**
- L396 — `drawTextLine(metaText, metaY, META_SIZE);` → **replaced with inline centered draw**

## What 23-02 left at the title draw site (Plan 23-02 form)

Per 23-02's task description, the title draw at L388 currently reads (post-23-02):

```javascript
var titleVisual = shapeForJsPdf(clientName || " ");
doc.text(titleVisual, titleX, titleY);
```

23-03 keeps the first line (shapeForJsPdf produces the visual-order string we need to center) and only changes the second line to use `pageWidth/2` with `{ align: 'center' }`.

The `titleX` variable declared at L387 becomes dead code and MUST be removed (a stale `var titleX = isRtl(clientName) ? ...` declaration left in the file would be a lint signal and future-maintainer confusion).

## What 23-02 left at the meta-line draw site

23-02 did NOT change the meta-line draw at L396 — it remained `drawTextLine(metaText, metaY, META_SIZE);`. drawTextLine internally calls applyFontFor, setFontSize, shapeForJsPdf, and doc.text with the isRtl-flipped x-anchor.

For D4 — centering the meta line — drawTextLine can't be used (it forces left/right anchor; we don't want to add a centering mode to drawTextLine because every other caller of drawTextLine wants the left/right behaviour per D4). Instead, 23-03 inlines a 4-line centered draw at the meta-line site:

```javascript
applyFontFor(metaText);
doc.setFontSize(META_SIZE);
var metaVisual = shapeForJsPdf(metaText);
doc.text(metaVisual, pageWidth / 2, metaY, { align: 'center' });
```

This duplicates the applyFontFor / setFontSize / shapeForJsPdf / doc.text sequence that drawTextLine encapsulates, BUT with `align: 'center'` and `pageWidth/2` instead of the isRtl-flipped x-anchor. The duplication is 4 lines — acceptable per RESEARCH (centering the title block is exactly two draw calls; factoring out a `drawCenteredLine()` helper would be over-engineering for two call sites).

## ensureRoom + the MARGIN_BOTTOM bump

`ensureRoom` (currently L421–427) checks `y + neededHeight > PAGE_H - MARGIN_BOTTOM`. It reads MARGIN_BOTTOM as a closure variable — bumping MARGIN_BOTTOM 64→71 propagates without touching ensureRoom. Same for any other code that reads MARGIN_X / MARGIN_TOP / MARGIN_BOTTOM dynamically (drawRunningHeader at L411 reads MARGIN_X; the list rendering at L461 reads MARGIN_X; the footer baseline at L347 is `PAGE_H - 32` and does NOT depend on MARGIN_BOTTOM — footer stays 32pt from the bottom regardless of the margin bump, which matches the existing "page-number sits below the bottom-content-margin" pattern).

**No other code changes required by D3 beyond the three constant bumps.**
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bump margins to 71pt + derive pageWidth from jsPDF + center title block on page 1</name>
  <files>assets/pdf-export.js</files>
  <action>
    **Step A — Bump the 3 margin constants (D3).** `assets/pdf-export.js`.

    Locate the layout-constants block (currently L333–337). Bump three values:

    Before:
    ```javascript
    var PAGE_W = 595;
    var PAGE_H = 842;
    var MARGIN_X = 56;
    var MARGIN_TOP = 64;
    var MARGIN_BOTTOM = 64;
    var USABLE_W = PAGE_W - 2 * MARGIN_X; // 483 pt
    ```

    After:
    ```javascript
    // Phase 23 (D3): A4-safe-zone margins — 71pt = 25.06mm at 72dpi. Matches the
    // DE/EU office-software A4 default (LibreOffice / Word) and is within 1pt of
    // the US Letter 1-inch convention. Symmetric on all four sides. RESEARCH
    // section "A4 standard confirmed for DE primary locale" verifies the value.
    var PAGE_W = 595;
    var PAGE_H = 842;
    var MARGIN_X = 71;
    var MARGIN_TOP = 71;
    var MARGIN_BOTTOM = 71;
    var USABLE_W = PAGE_W - 2 * MARGIN_X; // 453 pt (was 483pt pre-Phase-23)
    ```

    Update the trailing inline comment on the USABLE_W line so future readers see the value change at a glance (`453 pt (was 483pt pre-Phase-23)`).

    Do NOT touch any other layout constant (`BODY_SIZE`, `HEADING_SIZE`, `META_SIZE`, `TITLE_SIZE`, the four `LINE_HEIGHT_*` values, `FOOTER_BASELINE_Y`, `RUNNING_HEADER_Y`). RUNNING_HEADER_Y is currently `MARGIN_TOP - 24` and propagates the bump automatically (the running header sits 24pt above the new 71pt top margin → at y=47pt — still well within the printable area).

    **Step B — Add pageWidth local for centering math (cleaner jsPDF idiom).** `assets/pdf-export.js`.

    Immediately AFTER `registerFonts(doc);` (currently L328) and BEFORE the layout-constants block (currently L330–338), insert:

    ```javascript

    // Phase 23 (D4): pageWidth derived from jsPDF page-size API — used by the
    // centered title-block draws below. The hard-coded PAGE_W constant (595)
    // stays for all OTHER consumers (USABLE_W, RTL right-margin anchor at
    // PAGE_W - MARGIN_X, footer centering math). For the locked A4 portrait
    // orientation, both values are 595pt — equivalent, just self-documenting
    // at the centering call sites. See RESEARCH "jsPDF page-size API conveniences".
    var pageWidth = doc.internal.pageSize.getWidth();
    ```

    **Step C — Center the page-1 title (D4).** `assets/pdf-export.js`.

    Locate `drawPage1Header` (currently L380–400). The current post-23-02 form of L384–388 is:

    ```javascript
    function drawPage1Header() {
      // Title: client name (16pt bold-weight; ...)
      var titleY = MARGIN_TOP;
      applyFontFor(clientName);
      doc.setFontSize(TITLE_SIZE);
      var titleX = isRtl(clientName) ? (PAGE_W - MARGIN_X) : MARGIN_X;
      var titleVisual = shapeForJsPdf(clientName || " "); // Phase 23 (D1, D2)
      doc.text(titleVisual, titleX, titleY);
      // ...
    ```

    Change to:

    ```javascript
    function drawPage1Header() {
      // Title: client name (16pt). Phase 23 (D4) — horizontally centered on page 1.
      // The bidi pre-shape (shapeForJsPdf, from Plan 23-02) stays — it produces
      // the visual-order string the centering math measures and renders.
      var titleY = MARGIN_TOP;
      applyFontFor(clientName);
      doc.setFontSize(TITLE_SIZE);
      var titleVisual = shapeForJsPdf(clientName || " "); // Phase 23 (D1, D2)
      doc.text(titleVisual, pageWidth / 2, titleY, { align: 'center' }); // Phase 23 (D4)
      // ...
    ```

    The `var titleX = ...` line at L387 is REMOVED entirely (dead code — pageWidth/2 replaces it). The old reliance on isRtl + PAGE_W - MARGIN_X for the title anchor no longer applies under D4 — centering is locale-agnostic.

    **Step D — Center the meta line (D4 — the "title block" includes both client name and session date).** `assets/pdf-export.js`.

    Locate the meta-line draw inside drawPage1Header (currently L390–397). The current code is:

    ```javascript
    // Meta line: "{sessionDate} - {sessionType}"
    var metaText = [sessionDateDisplay, sessionType].filter(function (s) {
      return s && String(s).length > 0;
    }).join("  -  ");
    var metaY = titleY + LINE_HEIGHT_TITLE;
    if (metaText.length > 0) {
      drawTextLine(metaText, metaY, META_SIZE);
    }
    ```

    Change to:

    ```javascript
    // Meta line: "{sessionDate} - {sessionType}". Phase 23 (D4) — centered as
    // part of the title block. NOTE: drawTextLine is NOT used here because
    // drawTextLine forces the isRtl-flipped left/right anchor per D4's "body
    // content stays left/right-anchored" rule. The title block (this draw + the
    // title above) is the only centered region. Body paragraphs, lists, section
    // headings, and the running header on pages 2+ all keep using drawTextLine
    // and stay anchored per isRtl().
    var metaText = [sessionDateDisplay, sessionType].filter(function (s) {
      return s && String(s).length > 0;
    }).join("  -  ");
    var metaY = titleY + LINE_HEIGHT_TITLE;
    if (metaText.length > 0) {
      applyFontFor(metaText);
      doc.setFontSize(META_SIZE);
      var metaVisual = shapeForJsPdf(metaText); // Phase 23 (D1, D2)
      doc.text(metaVisual, pageWidth / 2, metaY, { align: 'center' }); // Phase 23 (D4)
    }
    ```

    The 4-line inline centered draw duplicates the applyFontFor + setFontSize + shapeForJsPdf + doc.text sequence that drawTextLine encapsulates — but with `align: 'center'` and `pageWidth/2` instead of the isRtl-flipped x-anchor. drawTextLine itself stays UNCHANGED — body paragraphs, headings (drawTextLine call at L444), and running-header content (drawRunningHeader's own draw at L411) all keep using drawTextLine and stay left/right-anchored per D4.

    The body-y cursor return at L399 (`return metaY + LINE_HEIGHT_META + 8;`) stays unchanged — the meta line still consumes the same vertical space regardless of horizontal alignment.

    **Step E — Verification before commit.**

    - File parses: `node -c assets/pdf-export.js`
    - Margin bump landed (D3): all three of these grep gates must return ≥1 hit each:
      - `grep -nE 'MARGIN_X = 71' assets/pdf-export.js` returns ≥1
      - `grep -nE 'MARGIN_TOP = 71' assets/pdf-export.js` returns ≥1
      - `grep -nE 'MARGIN_BOTTOM = 71' assets/pdf-export.js` returns ≥1
    - Old margin values gone: `grep -cE 'MARGIN_X = 56|MARGIN_TOP = 64|MARGIN_BOTTOM = 64' assets/pdf-export.js` returns 0
    - USABLE_W definition unchanged (still computed from PAGE_W and MARGIN_X): `grep -c 'var USABLE_W = PAGE_W - 2 \* MARGIN_X' assets/pdf-export.js` returns 1
    - pageWidth local declared (D4 prep): `grep -c 'var pageWidth = doc.internal.pageSize.getWidth' assets/pdf-export.js` returns 1
    - Title block centered: `grep -c "align: 'center'" assets/pdf-export.js` returns ≥2 (title draw + meta draw — the only two centered call sites in this plan; 23-05 may add a 3rd for the footer later but that's a separate plan)
    - Title draw uses pageWidth/2: `awk '/function drawPage1Header/,/return metaY/' assets/pdf-export.js | grep -c 'pageWidth / 2'` returns ≥2 (title + meta inside the same function)
    - Dead titleX removed: `grep -c 'var titleX' assets/pdf-export.js` returns 0 — no stale anchor declaration left in the file
    - drawTextLine still exists and still flips by isRtl (regression guard for body content): `awk '/function drawTextLine/,/^      }$/' assets/pdf-export.js | grep -c 'PAGE_W - MARGIN_X'` returns ≥1
    - shapeForJsPdf still called inside drawPage1Header (regression guard — 23-02's wraps preserved): `awk '/function drawPage1Header/,/return metaY/' assets/pdf-export.js | grep -c 'shapeForJsPdf'` returns ≥2 (title + meta)
    - bidi load chain still intact (regression guard from 23-02): `grep -c 'loadScriptOnce.*bidi.min.js' assets/pdf-export.js` returns ≥1
    - setR2L still gone (regression guard from 23-02): `grep -c 'setR2L' assets/pdf-export.js` returns 0

    Commit message: `feat(23-03): A4 71pt margins + centered title block on page 1 (D3, D4)`
  </action>
  <verify>
    <automated>node -c assets/pdf-export.js &amp;&amp; [ "$(grep -cE 'MARGIN_X = 71' assets/pdf-export.js)" -ge 1 ] &amp;&amp; [ "$(grep -cE 'MARGIN_TOP = 71' assets/pdf-export.js)" -ge 1 ] &amp;&amp; [ "$(grep -cE 'MARGIN_BOTTOM = 71' assets/pdf-export.js)" -ge 1 ] &amp;&amp; [ "$(grep -cE 'MARGIN_X = 56|MARGIN_TOP = 64|MARGIN_BOTTOM = 64' assets/pdf-export.js)" -eq 0 ] &amp;&amp; [ "$(grep -c 'var USABLE_W = PAGE_W - 2 \* MARGIN_X' assets/pdf-export.js)" -eq 1 ] &amp;&amp; [ "$(grep -c 'var pageWidth = doc.internal.pageSize.getWidth' assets/pdf-export.js)" -eq 1 ] &amp;&amp; [ "$(grep -c \"align: 'center'\" assets/pdf-export.js)" -ge 2 ] &amp;&amp; [ "$(awk '/function drawPage1Header/,/return metaY/' assets/pdf-export.js | grep -c 'pageWidth / 2')" -ge 2 ] &amp;&amp; [ "$(grep -c 'var titleX' assets/pdf-export.js)" -eq 0 ] &amp;&amp; [ "$(awk '/function drawTextLine/,/^      }$/' assets/pdf-export.js | grep -c 'PAGE_W - MARGIN_X')" -ge 1 ] &amp;&amp; [ "$(awk '/function drawPage1Header/,/return metaY/' assets/pdf-export.js | grep -c 'shapeForJsPdf')" -ge 2 ] &amp;&amp; [ "$(grep -c 'loadScriptOnce.*bidi.min.js' assets/pdf-export.js)" -ge 1 ] &amp;&amp; [ "$(grep -c 'setR2L' assets/pdf-export.js)" -eq 0 ]</automated>
  </verify>
  <done>
    - MARGIN_X bumped to 71. MARGIN_TOP bumped to 71. MARGIN_BOTTOM bumped to 71. No pre-bump values remain in the file.
    - USABLE_W computation expression is unchanged (still `PAGE_W - 2 * MARGIN_X`); the comment is updated to reflect the new 453pt value.
    - `pageWidth` local declared via `doc.internal.pageSize.getWidth()` at the top of buildSessionPDF, immediately after registerFonts.
    - Page-1 title draw uses `doc.text(titleVisual, pageWidth/2, titleY, { align: 'center' })`. The shapeForJsPdf wrap from 23-02 is preserved.
    - Page-1 meta line draw is inlined (not via drawTextLine) and uses `doc.text(metaVisual, pageWidth/2, metaY, { align: 'center' })`. applyFontFor + setFontSize + shapeForJsPdf preserved.
    - Dead `var titleX = ...` declaration removed.
    - drawTextLine itself is UNCHANGED (body paragraphs and section headings still left/right-anchor per D4).
    - All regression guards pass (bidi load chain, setR2L removal, shapeForJsPdf call sites all preserved from 23-02's work).
    - File parses. All 12 automated gates in the task <verify> pass.
  </done>
</task>

</tasks>

<verification>
- 3 margin constants bumped to 71pt: `grep -c 'MARGIN_X = 71' assets/pdf-export.js` ≥1 AND same for MARGIN_TOP, MARGIN_BOTTOM.
- No pre-bump margin values remain: `grep -cE 'MARGIN_X = 56|MARGIN_TOP = 64|MARGIN_BOTTOM = 64' assets/pdf-export.js` == 0.
- pageWidth local declared from jsPDF getter: `grep -c 'doc.internal.pageSize.getWidth' assets/pdf-export.js` == 1.
- 2 centered draws inside drawPage1Header: `awk '/function drawPage1Header/,/return metaY/' assets/pdf-export.js | grep -c 'align'` ≥2.
- Dead titleX declaration removed: `grep -c 'var titleX' assets/pdf-export.js` == 0.
- Body anchor logic preserved in drawTextLine: `awk '/function drawTextLine/,/^      }$/' assets/pdf-export.js | grep -c 'PAGE_W - MARGIN_X'` ≥1.
- 23-02's work preserved: setR2L still gone, bidi load chain still present, shapeForJsPdf still called inside drawPage1Header.
- File parses: `node -c assets/pdf-export.js` exits 0.
- Manual UAT (Ben): prints PDF on home printer — no content clipped on any edge. Title visually centers on page 1 for both English client names ("Anna M.") and Hebrew client names. Meta line ("date - sessionType") visually centers below the title. Body paragraphs / lists / section headings still anchor left for LTR sessions and right for RTL sessions (D4 — body stays anchored).
</verification>

<success_criteria>
- [ ] All 3 margin constants bumped to 71pt; old values fully removed from the file.
- [ ] USABLE_W formula unchanged; recomputes automatically to 453pt.
- [ ] pageWidth derived from `doc.internal.pageSize.getWidth()` for self-documenting centering math.
- [ ] Page-1 title centered via `{ align: 'center' }` at `pageWidth/2`.
- [ ] Page-1 meta line centered via `{ align: 'center' }` at `pageWidth/2` (inline draw, not via drawTextLine).
- [ ] Dead `titleX` declaration removed.
- [ ] Body-content anchor logic (drawTextLine + drawRunningHeader + list rendering + footer) untouched per D4.
- [ ] All 23-02 work preserved (regression guards on setR2L removal, bidi load chain, shapeForJsPdf at title sites).
- [ ] Automated gates pass.
- [ ] Ben confirms (a) no edge-clipping on home-printer test, (b) centered title block on EN + HE sessions, (c) centered meta line.
- [ ] Plan 23-04 (test vectors + Latin regression) can now run — it depends on 23-02 AND 23-03 because the regression-fixture hashes must reflect the post-rewrite layout.
- [ ] Optional Plan 23-05 (footer-centering refactor) can also run independently after this plan; it touches the footer pass (currently L497–510) which neither 23-02 nor 23-03 modified.
</success_criteria>

<output>
After completion, create `.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-03-margins-and-title-centering-SUMMARY.md` capturing:
- Final MARGIN_X / MARGIN_TOP / MARGIN_BOTTOM values (expect 71 / 71 / 71).
- Final USABLE_W comment value (expect 453pt).
- Whether `pageWidth` was wired via the getter form as planned (expect yes; record otherwise + reason).
- Ben's UAT outcome notes: did the home printer clip anything; did the centered title look right for EN + HE; did the meta line center properly; any unexpected layout issues (e.g. running header overlap, footer clipping).
- Whether the post-rewrite per-page line density felt noticeably tighter (RESEARCH Open Question #2 — expected ~1 extra body-line per 7 pages from the USABLE_W shrink 483→453). If Ben felt density was a problem, note it as input for a future LINE_HEIGHT_BODY tweak phase.
- Any deviations from the planned approach.
</output>
</content>
</invoke>