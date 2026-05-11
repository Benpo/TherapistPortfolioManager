---
phase: 23-pdf-export-rewrite-hebrew-rtl-and-layout
plan: 23-02
parent_phase: 23
title: Bidi pre-shape pipeline + setR2L removal in pdf-export.js
type: execute
wave: 2
depends_on:
  - 23-01
files_modified:
  - assets/pdf-export.js
autonomous: true
requirements:
  - 23-T1
  - 23-T2
  - 23-T3
tags:
  - phase-23
  - pdf
  - hebrew
  - rtl
  - bidi
  - uax-9
  - core-rewrite
must_haves:
  truths:
    - "A session with pure Hebrew content exports a PDF where every Hebrew line reads right-to-left in correct character order. (T1 — closed here: the bidi pre-shape inserted at every doc.text() boundary inside pdf-export.js produces visual-order strings that jsPDF renders correctly. Verified empirically by RESEARCH.md test vector #1 — `שלום עולם` → `םלוע םולש`.)"
    - "A session mixing Hebrew + English/digits exports a PDF where the bidirectional segments land in correct positions. (T2 — closed here: bidi-js's UAX #9 implementation handles paragraph-level direction + embedded-LTR-run preservation + neutral/digit handling. Verified empirically by RESEARCH.md test vectors #2, #3, #5, #10 — covering Hebrew + Latin, Hebrew + ISO date, Hebrew + URL, Hebrew + colon-separated digits.)"
    - "A session in EN/DE/CS only exports a PDF byte-similar to the pre-phase-23 output — no regression on Latin-only paths. (T3 — partially closed here: removing setR2L (which was already a no-op for Latin-only lines because isRtl() returned false for them) and inserting shapeForJsPdf() on Latin lines (where bidi-js produces no reordering — first-strong is L, all levels are 0, getReorderSegments returns []) means Latin paths are functionally untouched. The byte-level confirmation is 23-04's job; this plan's contribution is that nothing on the Latin path actually changes behaviourally.)"
  artifacts:
    - path: "assets/pdf-export.js"
      provides: "Six structural changes to the PDF engine, all driven by D1 + D2 from 23-CONTEXT.md and the integration table in RESEARCH.md section 'Specific edit points'. (1) Module-private state additions (currently L42–43): a new `var _bidi = null;` is added alongside the existing `_depsLoaded` and `_loadingPromise`. (2) `ensureDeps()` (currently L84–106) gains a 4th step: `loadScriptOnce('./assets/bidi.min.js')` is chained AFTER `jspdf.min.js` and BEFORE the two font files, matching the recommended ordering from RESEARCH section 'Performance / Lazy-Load Notes' so the 'loading-lib' progress phase covers both libraries and the 'loading-fonts' phase covers just the fonts. After the new loadScriptOnce resolves, the chain assigns `_bidi = window.bidi_js();` (factory invocation per G9 — must happen AFTER the script loads, not at module-eval time). (3) Two new module-private helpers added between `registerFonts()` (currently L174–183) and `isRtl()` (currently L196–198): `firstStrongDir(text)` implementing D2 (UAX HL2 — scan for the first strong char, return 'ltr' or 'rtl', default 'ltr' on empty/no-strong) and `shapeForJsPdf(text)` implementing the bidi pre-shape (operates on `text.split('')` — UTF-16 code units, NOT codepoints, per G2 — calls `_bidi.getEmbeddingLevels`, `_bidi.getReorderSegments`, `_bidi.getMirroredCharactersMap`, applies mirroring + reversal per UAX-L2/BD16, returns the visual-order string). (4) `applyFontFor()` (currently L359–367) reduced to font-switch only: the two `doc.setR2L(true)` / `doc.setR2L(false)` calls at L362 and L365 are REMOVED — per G1, combining setR2L with bidi pre-shape double-reverses. (5) `drawTextLine()` (currently L369–374) gains a bidi pre-shape: `var visual = shapeForJsPdf(line); doc.text(visual, x, y);` — the x-anchor logic at L372 (`isRtl(line) ? PAGE_W - MARGIN_X : MARGIN_X`) STAYS unchanged, because shaped RTL text still needs the right-margin anchor for jsPDF's left-to-right glyph emission to flow leftward visually (RESEARCH 'Interaction with isRtl() anchor-X logic'). (6) The footer pass (currently L497–510) drops its `doc.setR2L(false)` at L502 — Latin/digit footer text needs no bidi handling, but the setR2L call is now redundant (no other code path sets it to true after Phase 23). The list-rendering branch (currently L449–477) gains `shapeForJsPdf(\"- \" + wrapped[wi])` per RESEARCH Open Question #1's recommended prefix-then-shape approach. The running-header at L402–412 and page-1 title-block draw at L380–400 also gain shapeForJsPdf() — though the title-block centering itself is handled by Plan 23-03, NOT this plan. This plan inserts shapeForJsPdf() inside the existing right/left-anchor draw call (which 23-03 then replaces with a centered draw)."
      contains: "shapeForJsPdf"
  key_links:
    - from: "assets/pdf-export.js ensureDeps() chain (currently L84–106)"
      to: "./assets/bidi.min.js (vendored by 23-01)"
      via: "A 4th `loadScriptOnce('./assets/bidi.min.js')` step chained after jspdf and before the two fonts. After the bidi script resolves, the chain assigns `_bidi = window.bidi_js();` (factory invocation) so subsequent shapeForJsPdf() calls have a working bidi object. The progress callback fires 'loading-lib' for the jspdf + bidi pair and 'loading-fonts' for the two font files — matches RESEARCH section 'Performance / Lazy-Load Notes'."
      pattern: "loadScriptOnce.*bidi"
    - from: "assets/pdf-export.js shapeForJsPdf() helper"
      to: "window.bidi_js() factory output (cached as module-private _bidi)"
      via: "shapeForJsPdf calls _bidi.getEmbeddingLevels(text, dir), then _bidi.getReorderSegments(text, levels), then _bidi.getMirroredCharactersMap(text, levels). Uses text.split('') to convert to UTF-16-indexed array (NOT [...text] / Array.from(text) — per G2, the spread form splits by codepoint which breaks surrogate-pair handling and misaligns with bidi-js's UTF-16 indices). Applies mirror swaps first, then reverses each segment in place, then joins back to string. Returns the visual-order string for jsPDF."
      pattern: "shapeForJsPdf"
    - from: "assets/pdf-export.js drawTextLine() (currently L369–374) and 5 other doc.text() call sites"
      to: "shapeForJsPdf(line) output (the visual-order string)"
      via: "Every doc.text(logicalString, x, y) call inside buildSessionPDF is replaced with a 2-line sequence: `var visual = shapeForJsPdf(logicalString); doc.text(visual, x, y);` — at the line-write boundary, AFTER splitTextToSize (per G7: wrap measurement is correct on logical strings because glyph advance widths are direction-independent), AFTER parseMarkdown (heading markers already stripped at L230). The 6 doc.text() sites: (a) drawTextLine inner at L373, (b) drawPage1Header title at L388, (c) drawPage1Header meta via drawTextLine call at L396, (d) drawRunningHeader at L411, (e+f) list rendering at L463/465/469/471 (4 doc.text() calls — RTL bullet on right, RTL continuation, LTR bullet on left, LTR continuation; each gains shapeForJsPdf). The footer pass at L509 is unchanged in this plan (footer is always Latin page-number — shaping is a no-op, but 23-05 may simplify the footer in a follow-up)."
      pattern: "shapeForJsPdf"
    - from: "assets/pdf-export.js applyFontFor() (currently L359–367)"
      to: "doc.setR2L() (REMOVED) — and Hebrew/Latin font switch (KEPT)"
      via: "The two `doc.setR2L(true)` (L362) and `doc.setR2L(false)` (L365) calls are deleted. The function body shrinks to a single if/else that selects NotoSansHebrew vs NotoSans via doc.setFont(). Per G1: combining setR2L (a naive .split('').reverse().join('') in jsPDF source) with bidi pre-shape would double-reverse the string. The function name `applyFontFor` is preserved for call-site stability; the function's responsibility narrows from 'font + direction' to 'font only'. Also REMOVED: the footer's `doc.setR2L(false);` at L502 — redundant now that no other path sets R2L to true."
      pattern: "doc.setFont"
---

<objective>
Replace pdf-export.js's broken pseudo-RTL handling (anchor-X flip + jsPDF's naive `setR2L`) with a proper UAX #9 bidi pre-shape applied at every `doc.text()` boundary.

This is the core Phase 23 rewrite. Per D1 (use a vendored bidi library, not custom) + D2 (paragraph-level base direction from first-strong char, matching HTML `dir="auto"`), the pipeline becomes: parseMarkdown → splitTextToSize (logical-order measurement, safe per G7) → shapeForJsPdf (visual-order per line) → doc.text (visual-order glyphs flowing left-to-right from the x-anchor).

The big behavioural change is **removing every `doc.setR2L(true)` call** (currently at L362 + L365 inside `applyFontFor`, and the redundant `doc.setR2L(false)` inside the footer pass at L502). Per RESEARCH G1: jsPDF's `setR2L(true)` does a naive whole-string `.split('').reverse().join('')`. Combining it with bidi pre-shape double-reverses the string and breaks every line. The x-anchor flip in `drawTextLine` (currently L372) STAYS — anchored right for shaped RTL lines, anchored left for shaped LTR lines — because jsPDF still emits glyphs left-to-right starting at the x-anchor, and the shaped visual string has its leftmost glyph at index 0 (which for RTL paragraphs is the rightmost-reading character).

Per RESEARCH G2: `shapeForJsPdf` MUST operate on `text.split('')` (UTF-16 code units), NOT `[...text]` or `Array.from(text)` (which split by codepoint and break surrogate pairs — bidi-js indexes by UTF-16, the indices must match). Test vector #11 (`מצב רוח: 🌱 פורח`) catches this — a buggy implementation produces a broken surrogate.

Per RESEARCH G9: the bidi factory invocation (`window.bidi_js()`) MUST happen AFTER `loadScriptOnce('./assets/bidi.min.js')` resolves — calling it at module-eval time throws TypeError. The factory output is cached module-level (`var _bidi = null; ... _bidi = window.bidi_js()` inside the load-chain callback) so subsequent shapeForJsPdf calls reuse the same bidi object.

**This plan does NOT touch margins, the title-block centering, or the footer centering.** Margins + title centering are 23-03. Footer simplification is 23-05 (optional). 23-02 and 23-03 both modify `assets/pdf-export.js`, so they MUST run sequentially within Wave 2 — the orchestrator serializes them.

Purpose: Close UAT acceptance criteria T1 (pure Hebrew renders correctly) and T2 (Hebrew + Latin/digits renders correctly). T3 (Latin-only no regression) is structurally protected by this plan but byte-verified in 23-04.

Output:
- Updated `assets/pdf-export.js`: 4th lazy-load step (bidi.min.js + factory cache), 2 new helpers (`firstStrongDir`, `shapeForJsPdf`), 6 `doc.text()` call sites gain bidi pre-shape, 3 `setR2L` calls removed (2 inside applyFontFor, 1 inside footer pass).

**Manual UAT confirmation required from Sapir** on Hebrew rendering correctness — pure Hebrew session + Hebrew-with-Latin-embedded session + Hebrew with paired brackets (test vector #4 — note the bracket-mirror is correct UAX-BD16 behaviour, NOT a bug; G3). **Manual UAT confirmation from Ben** that the Hebrew bullet on RTL list items lands on the right edge of the page (RESEARCH Open Question #1). Both UAT confirmations gate flipping the Hebrew-PDF blocker row in `22-HUMAN-UAT.md` to `closed-fixed`.
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
@assets/pdf-export.js
@assets/bidi.min.js

## UAT truth statements being closed (verbatim from 23-CONTEXT.md)

1. **T1:** "A session with pure Hebrew content exports a PDF where every Hebrew line reads right-to-left in correct character order."
2. **T2:** "A session mixing Hebrew + English/digits exports a PDF where the bidirectional segments land in correct positions."
3. **T3 (structural protection only — byte-verified in 23-04):** "A session in EN/DE/CS only exports a PDF byte-identical (or trivially-different) to the pre-phase-23 output."

## Locked decisions from 23-CONTEXT.md (DO NOT re-litigate)

- **D1 — Bidi reordering via vendored library, not custom.** Use bidi-js@1.0.3 (already vendored by 23-01).
- **D2 — Paragraph-level base direction from first strong char.** firstStrongDir() implements UAX HL2 — scan for first char whose bidi type is L/R/AL; default 'ltr' on empty/no-strong (matches HTML `dir="auto"`).
- **D5 — Backward compatibility & migration.** PDFs are stateless; no migration concern.

## Locked from RESEARCH (Claude's Discretion → resolved)

- **Per-line vs per-paragraph bidi:** PER-LINE (G8 — simpler, matches the existing per-line code shape, marginal trailing-whitespace edge case is acceptable; if UAT reveals issues, swap to per-paragraph in a follow-up). The paragraph direction is captured once per block via `firstStrongDir(blockText)` but the actual `getEmbeddingLevels` call happens per wrapped line.
- **Pipeline boundary:** AFTER `parseMarkdown` (line 216) — `#` markers already stripped. AFTER `splitTextToSize` (G7 — wrap measurement safe on logical strings because glyph advance widths are direction-independent). BEFORE `doc.text` — the line-write boundary.
- **List bullet:** PREFIX-THEN-SHAPE — `shapeForJsPdf("- " + wrapped[wi])` so the `-` participates in paragraph-direction inference (RESEARCH Open Question #1 / test vector #6). Bullet visually lands on the right edge for RTL lists.
- **setR2L disposition:** REMOVE all calls (G1). The function name `applyFontFor` is preserved; its body shrinks to font-switch only.
- **bidi.min.js load order in ensureDeps:** AFTER jspdf.min.js, BEFORE the two fonts. Lets `progress('loading-lib')` cover both libraries; `progress('loading-fonts')` stays as a single fonts phase.

## Helper implementations (canonical reference from RESEARCH section 'Worked example')

The executor implements these two helpers verbatim — they are RESEARCH's verified-against-all-12-test-vectors reference code:

```javascript
function firstStrongDir(text) {
  if (!text) return 'ltr';
  for (var i = 0; i < text.length; i++) {
    var t = _bidi.getBidiCharTypeName(text[i]);
    if (t === 'L') return 'ltr';
    if (t === 'R' || t === 'AL') return 'rtl';
  }
  return 'ltr';
}

function shapeForJsPdf(text) {
  if (!text) return '';
  var dir = firstStrongDir(text);
  var levels = _bidi.getEmbeddingLevels(text, dir);
  var flips = _bidi.getReorderSegments(text, levels);
  var mirrorMap = _bidi.getMirroredCharactersMap(text, levels);
  var chars = text.split('');  // UTF-16 code units — DO NOT use [...text] or Array.from(text); see G2 / test vector #11.
  mirrorMap.forEach(function (mirroredChar, idx) {
    chars[idx] = mirroredChar;
  });
  for (var fi = 0; fi < flips.length; fi++) {
    var start = flips[fi][0];
    var end = flips[fi][1];
    var slice = chars.slice(start, end + 1).reverse();
    for (var i = start; i <= end; i++) chars[i] = slice[i - start];
  }
  return chars.join('');
}
```

Important notes for the executor:
- The file uses `var` and `function` (ES5 style — no `const`/`let`/arrow). Match the existing style. The two helpers above are already in `var/function` form.
- `_bidi` is the module-private cached factory output. Both helpers reference `_bidi.*` directly. Both must be defined AFTER `_bidi` is in scope (i.e. inside the IIFE, after the `var _bidi = null;` declaration — anywhere before the first call site inside buildSessionPDF).
- bidi-js's `getMirroredCharactersMap` returns a JS `Map`. The `.forEach` form `mirrorMap.forEach(function(value, key) {})` matches Map's iteration order (insertion order, which for bidi-js is the order indices were emitted by the algorithm — equivalent to ascending index in practice; the order doesn't matter for correctness because mirror swaps are independent).
- The 12 test vectors in RESEARCH section 'Test Vector Corpus' are the acceptance gate for the shaping helper's correctness. 23-04 turns them into an automated test file — this plan only needs the helper to exist and the wiring to be correct.

## The 6 doc.text() call sites inside buildSessionPDF (verified line numbers from current pdf-export.js)

The executor MUST insert `var visual = shapeForJsPdf(<the-string>); doc.text(visual, x, y);` at each of these sites:

| # | Current call | Line | What to insert |
|---|-------------|------|----------------|
| 1 | `doc.text(line, x, y);` inside drawTextLine | 373 | `var visual = shapeForJsPdf(line); doc.text(visual, x, y);` |
| 2 | `doc.text(clientName \|\| " ", titleX, titleY);` inside drawPage1Header | 388 | `var visual = shapeForJsPdf(clientName \|\| " "); doc.text(visual, titleX, titleY);` *(NOTE: Plan 23-03 will REPLACE this entire draw call with a centered version — but 23-03 runs AFTER 23-02 in Wave 2, so 23-02 simply inserts shapeForJsPdf here; 23-03's centering refactor will keep the shapeForJsPdf call and just change the x-coordinate + add `{ align: 'center' }`.)* |
| 3 | `drawTextLine(metaText, metaY, META_SIZE);` inside drawPage1Header | 396 | UNCHANGED — drawTextLine already calls shapeForJsPdf internally via the change to drawTextLine at site #1. *(Same Plan 23-03 caveat: 23-03 replaces this call with a centered draw.)* |
| 4 | `doc.text(text, x, RUNNING_HEADER_Y);` inside drawRunningHeader | 411 | `var visual = shapeForJsPdf(text); doc.text(visual, x, RUNNING_HEADER_Y);` |
| 5a | `doc.text("- " + wrapped[wi], rtlX, y);` (RTL list, first wrapped line) | 463 | `var visual = shapeForJsPdf("- " + wrapped[wi]); doc.text(visual, rtlX, y);` *(prefix-then-shape per Open Question #1)* |
| 5b | `doc.text(wrapped[wi], rtlX - 14, y);` (RTL list, continuation lines) | 465 | `var visual = shapeForJsPdf(wrapped[wi]); doc.text(visual, rtlX - 14, y);` |
| 5c | `doc.text("- " + wrapped[wi], MARGIN_X, y);` (LTR list, first wrapped line) | 469 | `var visual = shapeForJsPdf("- " + wrapped[wi]); doc.text(visual, MARGIN_X, y);` |
| 5d | `doc.text(wrapped[wi], MARGIN_X + 14, y);` (LTR list, continuation lines) | 471 | `var visual = shapeForJsPdf(wrapped[wi]); doc.text(visual, MARGIN_X + 14, y);` |
| 6 | `doc.text(label, fx, FOOTER_BASELINE_Y);` inside footer pass | 509 | UNCHANGED — footer text is always Latin page-number; bidi shaping is a no-op (firstStrongDir returns 'ltr', getReorderSegments returns []). Leaving it unchanged also keeps the footer-specific manual centering math intact for 23-05 (the optional footer-simplification refactor) to work on later. |

Total: 4 fresh shapeForJsPdf insertions (sites 1, 2, 4, 5a, 5b, 5c, 5d — site 3 is unchanged because drawTextLine already shapes internally, site 6 is unchanged because footer is Latin-only). The executor must count the actual insertions as 7 doc.text wrapping sites (1 + 2 + 4 + 5a + 5b + 5c + 5d).

## The 3 setR2L removal sites (verified line numbers from current pdf-export.js)

| # | Current call | Line | Action |
|---|-------------|------|--------|
| 1 | `doc.setR2L(true);` inside applyFontFor (RTL branch) | 362 | DELETE entirely |
| 2 | `doc.setR2L(false);` inside applyFontFor (LTR branch) | 365 | DELETE entirely |
| 3 | `doc.setR2L(false);` inside footer pass | 502 | DELETE entirely (now redundant — no other path sets R2L=true) |

After deletion, the body of `applyFontFor` becomes:
```javascript
function applyFontFor(line) {
  if (isRtl(line)) {
    doc.setFont("NotoSansHebrew", "normal");
  } else {
    doc.setFont("NotoSans", "normal");
  }
}
```

And the footer pass's font-setup block at L500–503 (currently `doc.setFont("NotoSans", "normal"); doc.setR2L(false); doc.setFontSize(META_SIZE);`) becomes `doc.setFont("NotoSans", "normal"); doc.setFontSize(META_SIZE);` (one line shorter).

## Why isRtl() and the x-anchor flip STAY (RESEARCH 'Interaction with isRtl() anchor-X logic')

`isRtl(line)` controls THREE things in the current code; after Phase 23 it controls TWO:

| Behaviour | Before 23 | After 23 |
|-----------|-----------|----------|
| Font choice (Latin vs Hebrew) | Yes | Yes (KEPT) |
| X-anchor (left margin vs right margin) for body content | Yes | Yes (KEPT — per D4, only title is centered; body anchors stay) |
| `setR2L(true)` call | Yes | NO (REMOVED per G1) |

The x-anchor flip is correct: shaped RTL text has its leftmost-visual glyph at index 0 of the visual string. jsPDF emits glyphs left-to-right starting at the x-coordinate. Anchoring at the right margin means the leftmost-visual glyph sits at the right margin and the rest flow leftward across the page — which is the correct visual layout for an RTL line. Anchoring at the left margin for LTR works the same way (leftmost glyph at the left margin, flow rightward).

## Critical gotchas (one-line summaries — full text in RESEARCH section 'Gotchas + Risks')

- **G1:** Don't combine setR2L with bidi shape — double-reverse. **REMOVE all setR2L.**
- **G2:** Use `text.split('')` not `[...text]` — UTF-16 code units must match bidi-js indices.
- **G3:** Bracket mirroring in RTL paragraphs is correct UAX-BD16 behaviour, not a bug. Pre-empt the Sapir UAT question.
- **G4:** Nikud reorders with the base consonant — no font-coverage gap.
- **G5:** Noto Sans Hebrew covers Hebrew + Latin + Latin-1 + Punctuation. Arabic = missing-glyph rectangles (out of scope).
- **G7:** splitTextToSize wraps on logical strings — wrap measurement is correct because glyph widths are direction-independent.
- **G8:** Per-line bidi is acceptable; per-paragraph is a swap-in if UAT reveals trailing-whitespace issues.
- **G9:** Factory invocation MUST happen after the script loads — inside ensureDeps callback, not at module eval.
- **G10:** PDF /CreationDate defeats byte-identity. 23-04 handles deterministic-date for the regression test.
- **G12:** bidi-js's require-from-string dep is not used at runtime — clean vendoring (already handled by 23-01).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wire bidi.min.js into ensureDeps + add firstStrongDir/shapeForJsPdf helpers</name>
  <files>assets/pdf-export.js</files>
  <action>
    **Step A — Add module-private _bidi cache (G9).** `assets/pdf-export.js`.

    Locate the module-private state block at L42–43 (currently `var _depsLoaded = false; var _loadingPromise = null;`). Add a third declaration immediately after the existing two:

    ```
    var _bidi = null;   // Phase 23 (D1): cached bidi-js factory output. Initialized in ensureDeps after loadScriptOnce('./assets/bidi.min.js') resolves (G9 — must NOT be initialized at module-eval time, window.bidi_js does not exist yet).
    ```

    **Step B — Add 4th loadScriptOnce step + factory invocation in ensureDeps (D1, D2, G9).** `assets/pdf-export.js`.

    Modify the ensureDeps Promise chain (currently L94–102) to insert `loadScriptOnce('./assets/bidi.min.js')` after the jspdf load and before the noto-sans-base64 load, AND to assign `_bidi = window.bidi_js();` after the bidi script resolves.

    The current chain:
    ```javascript
    progress('loading-lib');
    return loadScriptOnce('./assets/jspdf.min.js').then(function () {
      progress('loading-fonts');
      return loadScriptOnce('./assets/fonts/noto-sans-base64.js');
    }).then(function () {
      return loadScriptOnce('./assets/fonts/noto-sans-hebrew-base64.js');
    }).then(function () {
      _depsLoaded = true;
    });
    ```

    becomes:
    ```javascript
    progress('loading-lib');
    return loadScriptOnce('./assets/jspdf.min.js').then(function () {
      // Phase 23 (D1) — bidi-js is part of the "library" phase, before fonts. Per RESEARCH 'Performance / Lazy-Load Notes': order doesn't matter functionally (bidi has no deps on fonts), but grouping libs together keeps the progress phases semantically clean.
      return loadScriptOnce('./assets/bidi.min.js');
    }).then(function () {
      // Phase 23 (D1, G9) — invoke the bidi-js factory ONCE the script is loaded and cache the result module-level. window.bidi_js is the UMD attachment from assets/bidi.min.js. Calling it earlier (e.g. at module-eval time, before loadScriptOnce resolves) throws TypeError.
      _bidi = window.bidi_js();
      progress('loading-fonts');
      return loadScriptOnce('./assets/fonts/noto-sans-base64.js');
    }).then(function () {
      return loadScriptOnce('./assets/fonts/noto-sans-hebrew-base64.js');
    }).then(function () {
      _depsLoaded = true;
    });
    ```

    The `progress('loading-fonts')` call moves from after the jspdf load to after the bidi load — this groups jspdf + bidi under 'loading-lib' and the two font files under 'loading-fonts', matching RESEARCH's recommended progress-phase shape.

    **Step C — Add firstStrongDir() and shapeForJsPdf() helpers (D2, G2).** `assets/pdf-export.js`.

    Locate `registerFonts` (currently ends at L183). Locate `isRtl` (currently L196–198). Insert the two new helpers BETWEEN them — i.e. immediately after the registerFonts closing brace and the dashed comment that follows (currently L184–186 is a dashed section comment for isRtl). Insert the new helpers BEFORE that dashed comment so they appear in the file in this order: registerFonts → firstStrongDir → shapeForJsPdf → isRtl.

    Add a leading section comment:

    ```
    // ---------------------------------------------------------------------------
    // firstStrongDir + shapeForJsPdf -- Phase 23 (D1, D2): UAX #9 bidi pre-shape
    // ---------------------------------------------------------------------------
    //
    // Two helpers added in Phase 23 to convert logical-order strings (the order
    // therapists type them in) into visual-order strings (the order jsPDF needs
    // to write glyphs to the PDF positionally). Without this, Hebrew lines come
    // out reversed and Hebrew+Latin/digit lines have their LTR runs in the wrong
    // position. Built on the vendored bidi-js@1.0.3 library (./assets/bidi.min.js,
    // landed by Plan 23-01). See 23-RESEARCH.md section "Worked example" for
    // the empirical verification against the 12 phase test vectors.
    //
    // CRITICAL G2: shapeForJsPdf operates on text.split('') -- UTF-16 code units --
    // NOT on [...text] / Array.from(text) which split by codepoint. bidi-js's
    // getEmbeddingLevels / getReorderSegments return UTF-16-indexed segments;
    // the array we mutate MUST share the same indexing or surrogate-pair characters
    // (emoji, supplementary-plane Hebrew) break. Test vector #11 catches this.
    ```

    Then add `firstStrongDir`:

    ```javascript
    /**
     * Phase 23 (D2): paragraph base direction from first strong directional char.
     * Implements UAX #9 HL2 (matches HTML/CSS dir="auto" behaviour). Returns
     * 'ltr' on empty input or no strong char (default per HL2).
     */
    function firstStrongDir(text) {
      if (!text) return 'ltr';
      for (var i = 0; i < text.length; i++) {
        var t = _bidi.getBidiCharTypeName(text[i]);
        if (t === 'L') return 'ltr';
        if (t === 'R' || t === 'AL') return 'rtl';
      }
      return 'ltr';
    }
    ```

    Then add `shapeForJsPdf`:

    ```javascript
    /**
     * Phase 23 (D1): logical-order string -> visual-order string for doc.text().
     *
     * Operates on UTF-16 code units (text.split(''), NOT [...text] / Array.from(text)
     * -- see G2 / test vector #11). Calls bidi-js for:
     *   1. embedding levels per code unit (UAX #9 paragraph + character types)
     *   2. reorder segments to reverse (UAX-L2 -- runs at odd levels flip in place)
     *   3. mirror map for paired brackets in RTL runs (UAX-BD16)
     *
     * Returns the visual-order string. Empty input -> empty output.
     */
    function shapeForJsPdf(text) {
      if (!text) return '';
      var dir = firstStrongDir(text);
      var levels = _bidi.getEmbeddingLevels(text, dir);
      var flips = _bidi.getReorderSegments(text, levels);
      var mirrorMap = _bidi.getMirroredCharactersMap(text, levels);
      var chars = text.split(''); // UTF-16 code units; matches bidi-js indices (G2)
      mirrorMap.forEach(function (mirroredChar, idx) {
        chars[idx] = mirroredChar;
      });
      for (var fi = 0; fi < flips.length; fi++) {
        var start = flips[fi][0];
        var end = flips[fi][1];
        var slice = chars.slice(start, end + 1).reverse();
        for (var i = start; i <= end; i++) chars[i] = slice[i - start];
      }
      return chars.join('');
    }
    ```

    Both helpers reference `_bidi` (the module-private factory output from Step A). Both must be inside the IIFE — they are defined as inner functions, so they close over `_bidi` automatically.

    **Step D — Verification before commit.**

    - File parses: `node -c assets/pdf-export.js`
    - `_bidi` declaration exists exactly once: `grep -c "var _bidi = null" assets/pdf-export.js` returns 1
    - bidi.min.js loaded in ensureDeps: `grep -c "loadScriptOnce.*bidi.min.js" assets/pdf-export.js` returns ≥1
    - Factory invoked: `grep -c "_bidi = window.bidi_js" assets/pdf-export.js` returns ≥1
    - firstStrongDir defined: `grep -c "function firstStrongDir" assets/pdf-export.js` returns 1
    - shapeForJsPdf defined: `grep -c "function shapeForJsPdf" assets/pdf-export.js` returns 1
    - Critical G2 enforced (text.split, not spread): `grep -c "text.split(''" assets/pdf-export.js` returns ≥1 AND `grep -cE '\[\.\.\.text\]|Array.from\(text' assets/pdf-export.js` returns 0
    - No call sites yet (Task 2 wires them): `grep -c "shapeForJsPdf(" assets/pdf-export.js` returns exactly 1 (the function definition only — call sites come in Task 2)

    Commit message: `feat(23-02): ensureDeps bidi-js wiring + firstStrongDir/shapeForJsPdf helpers (D1, D2)`
  </action>
  <verify>
    <automated>node -c assets/pdf-export.js &amp;&amp; [ "$(grep -c 'var _bidi = null' assets/pdf-export.js)" -eq 1 ] &amp;&amp; [ "$(grep -c 'loadScriptOnce.*bidi.min.js' assets/pdf-export.js)" -ge 1 ] &amp;&amp; [ "$(grep -c '_bidi = window.bidi_js' assets/pdf-export.js)" -ge 1 ] &amp;&amp; [ "$(grep -c 'function firstStrongDir' assets/pdf-export.js)" -eq 1 ] &amp;&amp; [ "$(grep -c 'function shapeForJsPdf' assets/pdf-export.js)" -eq 1 ] &amp;&amp; [ "$(grep -c "text.split('')" assets/pdf-export.js)" -ge 1 ] &amp;&amp; [ "$(grep -cE '\[\.\.\.text\]|Array\.from\(text' assets/pdf-export.js)" -eq 0 ] &amp;&amp; [ "$(grep -c 'shapeForJsPdf(' assets/pdf-export.js)" -eq 1 ]</automated>
  </verify>
  <done>
    - `_bidi` cached module-level, initialized inside the ensureDeps chain after bidi.min.js loads (NOT at module-eval time per G9).
    - ensureDeps chain has 4 loadScriptOnce calls in order: jspdf → bidi → noto-sans → noto-sans-hebrew. `progress('loading-fonts')` fires after the bidi-factory invocation, not after the jspdf load.
    - `firstStrongDir(text)` implements UAX #9 HL2 — returns 'ltr' / 'rtl' / 'ltr' (default) using `_bidi.getBidiCharTypeName(text[i])`.
    - `shapeForJsPdf(text)` operates on `text.split('')` (G2 — UTF-16 code units), applies mirrorMap swaps then segment-reversal, returns the visual-order string.
    - No `[...text]` or `Array.from(text)` form anywhere in the file (G2 enforcement).
    - File still parses; no call sites yet (Task 2 wires them).
  </done>
</task>

<task type="auto">
  <name>Task 2: Insert shapeForJsPdf at all doc.text() boundaries + REMOVE all setR2L calls</name>
  <files>assets/pdf-export.js</files>
  <action>
    **Step A — REMOVE the 3 setR2L calls (G1).** `assets/pdf-export.js`.

    1. Inside `applyFontFor` (currently L359–367): DELETE line 362 (`doc.setR2L(true);`) and line 365 (`doc.setR2L(false);`). The function body collapses to:

       ```javascript
       function applyFontFor(line) {
         // Phase 23 (G1): setR2L removed. jsPDF's setR2L(true) does a naive
         // .split('').reverse().join('') which double-reverses the visual-order
         // string that shapeForJsPdf produces. Direction is now handled by the
         // bidi pre-shape; this function is font-switch-only.
         if (isRtl(line)) {
           doc.setFont("NotoSansHebrew", "normal");
         } else {
           doc.setFont("NotoSans", "normal");
         }
       }
       ```

    2. Inside the footer pass (currently L497–510): DELETE line 502 (`doc.setR2L(false);`). The block at L500–503 collapses from 3 lines to 2:

       ```javascript
       doc.setFont("NotoSans", "normal");
       doc.setFontSize(META_SIZE);
       ```

       Add a leading comment immediately before the doc.setFont call: `// Phase 23: footer is always Latin (page number), Noto Sans + LTR. setR2L call removed (G1 — no other code path sets R2L=true after Phase 23, so the reset is redundant).`

    **Step B — Insert shapeForJsPdf at all doc.text() call sites (D1, D2).** `assets/pdf-export.js`.

    The 7 insertion sites (per RESEARCH 'Specific edit points' table and the context table above):

    1. **drawTextLine (currently L369–374):** Modify the function body to call shapeForJsPdf before doc.text:
       ```javascript
       function drawTextLine(line, y, size) {
         applyFontFor(line);
         doc.setFontSize(size);
         var x = isRtl(line) ? (PAGE_W - MARGIN_X) : MARGIN_X;
         var visual = shapeForJsPdf(line); // Phase 23 (D1, D2): logical -> visual
         doc.text(visual, x, y);
       }
       ```
       Note: the x-anchor flip at the previous line (`isRtl(line) ? PAGE_W - MARGIN_X : MARGIN_X`) STAYS — anchored right for shaped-RTL lines so the leftmost-visual glyph sits at the right margin and the rest flow leftward. See RESEARCH 'Interaction with isRtl() anchor-X logic'.

    2. **drawPage1Header title (currently L388):** Replace `doc.text(clientName || " ", titleX, titleY);` with:
       ```javascript
       var titleVisual = shapeForJsPdf(clientName || " "); // Phase 23 (D1, D2)
       doc.text(titleVisual, titleX, titleY);
       ```
       **NOTE:** Plan 23-03 will REPLACE this entire title draw call with a centered version per D4. 23-02 inserts the shapeForJsPdf wrap so the file stays consistent in the interim if 23-02 ships before 23-03; 23-03 then preserves the shapeForJsPdf call and switches the x-coordinate + adds `{ align: 'center' }`. This is the only doc.text site that Plan 23-03 will touch — all others stay as 23-02 wrote them.

    3. **drawPage1Header meta line at L396:** UNCHANGED in 23-02 (call sites #3 in the context table). The call is `drawTextLine(metaText, metaY, META_SIZE);` — drawTextLine already shapes internally per change #1. **Plan 23-03 will replace this drawTextLine call with a centered doc.text() per D4; 23-03 inserts its own shapeForJsPdf at that point.** No change needed here in 23-02.

    4. **drawRunningHeader (currently L411):** Replace `doc.text(text, x, RUNNING_HEADER_Y);` with:
       ```javascript
       var visual = shapeForJsPdf(text); // Phase 23 (D1, D2)
       doc.text(visual, x, RUNNING_HEADER_Y);
       ```

    5. **List rendering — 4 doc.text() sites in the list block (currently L463, 465, 469, 471):** Wrap each with shapeForJsPdf. For sites 5a and 5c (the first wrapped line of each list item — currently `doc.text("- " + wrapped[wi], rtlX, y)` and `doc.text("- " + wrapped[wi], MARGIN_X, y)`), use **prefix-then-shape** per Open Question #1: `shapeForJsPdf("- " + wrapped[wi])`. For sites 5b and 5d (continuation lines — currently `doc.text(wrapped[wi], rtlX - 14, y)` and `doc.text(wrapped[wi], MARGIN_X + 14, y)`), shape the plain wrapped line.

       ```javascript
       if (isRtl(wrapped[wi])) {
         // RTL list: bullet on the right edge, indent inward
         var rtlX = PAGE_W - MARGIN_X;
         if (wi === 0) {
           // Phase 23 (D1, D2, Open Question #1): prefix-then-shape so the "-" participates in paragraph-direction inference and lands visually on the right edge.
           var visualA = shapeForJsPdf("- " + wrapped[wi]);
           doc.text(visualA, rtlX, y);
         } else {
           var visualB = shapeForJsPdf(wrapped[wi]);
           doc.text(visualB, rtlX - 14, y);
         }
       } else {
         if (wi === 0) {
           var visualC = shapeForJsPdf("- " + wrapped[wi]);
           doc.text(visualC, MARGIN_X, y);
         } else {
           var visualD = shapeForJsPdf(wrapped[wi]);
           doc.text(visualD, MARGIN_X + 14, y);
         }
       }
       ```

       (The variable-name suffixes A/B/C/D avoid any `var visual` redeclaration warnings inside the same function scope — pdf-export.js is var-scoped, not block-scoped, so the same name reused 4 times in different branches is legal but visually confusing. The 4 distinct names keep the diff readable.)

    6. **Footer doc.text() at L509:** UNCHANGED. Footer text is always `"Page X of Y"` — Latin/digits only — so `shapeForJsPdf(label)` would return `label` byte-identical (firstStrongDir → 'ltr', getReorderSegments → empty, mirrorMap → empty, result identical to input). Leaving the call unwrapped keeps the footer pass minimal and lets Plan 23-05 (optional footer-centering refactor) operate on the existing simple form.

    **Step C — Verification before commit.**

    - File parses: `node -c assets/pdf-export.js`
    - All setR2L calls removed: `grep -c 'setR2L' assets/pdf-export.js` returns 0
    - shapeForJsPdf is called at multiple sites: `grep -c 'shapeForJsPdf(' assets/pdf-export.js` returns ≥7 (1 definition + ≥6 calls; Task 1 left exactly 1; Task 2 adds 6 — drawTextLine, drawPage1Header title, drawRunningHeader, plus 4 in the list block. Total ≥7 — being lenient because 23-03 will add one more in the title-centering replacement)
    - Bidi load chain still present (regression guard from Task 1): `grep -c 'loadScriptOnce.*bidi.min.js' assets/pdf-export.js` returns ≥1
    - applyFontFor body shrunk (no setR2L inside): `awk '/function applyFontFor/,/^      }$/' assets/pdf-export.js | grep -c 'setR2L'` returns 0
    - applyFontFor still does font switching: `awk '/function applyFontFor/,/^      }$/' assets/pdf-export.js | grep -c 'setFont' | head -1` returns ≥2 (NotoSansHebrew + NotoSans)
    - x-anchor flip preserved in drawTextLine (RTL anchors at right margin): `awk '/function drawTextLine/,/^      }$/' assets/pdf-export.js | grep -c 'PAGE_W - MARGIN_X'` returns ≥1
    - Prefix-then-shape used for list bullets: `grep -c 'shapeForJsPdf(.- ' assets/pdf-export.js` returns ≥2 (RTL and LTR list-first-line sites; the `.` in the regex matches the literal quote of `"- `; the cleaner form is below)
    - Prefix-then-shape form (alternate, cleaner regex): `grep -c 'shapeForJsPdf("- ' assets/pdf-export.js` returns ≥2

    Commit message: `feat(23-02): shapeForJsPdf at every doc.text boundary + remove all setR2L (D1, D2, G1)`
  </action>
  <verify>
    <automated>node -c assets/pdf-export.js &amp;&amp; [ "$(grep -c 'setR2L' assets/pdf-export.js)" -eq 0 ] &amp;&amp; [ "$(grep -c 'shapeForJsPdf(' assets/pdf-export.js)" -ge 7 ] &amp;&amp; [ "$(grep -c 'loadScriptOnce.*bidi.min.js' assets/pdf-export.js)" -ge 1 ] &amp;&amp; [ "$(awk '/function applyFontFor/,/^      }$/' assets/pdf-export.js | grep -c 'setR2L')" -eq 0 ] &amp;&amp; [ "$(awk '/function applyFontFor/,/^      }$/' assets/pdf-export.js | grep -c 'setFont')" -ge 2 ] &amp;&amp; [ "$(awk '/function drawTextLine/,/^      }$/' assets/pdf-export.js | grep -c 'PAGE_W - MARGIN_X')" -ge 1 ] &amp;&amp; [ "$(grep -c 'shapeForJsPdf(\"- ' assets/pdf-export.js)" -ge 2 ]</automated>
  </verify>
  <done>
    - All 3 `setR2L` calls (2 inside applyFontFor at L362+L365, 1 inside the footer pass at L502) deleted. `grep setR2L` returns 0 lines.
    - `applyFontFor` body reduced to font-switch only — no direction handling. NotoSansHebrew + NotoSans selection logic preserved.
    - `drawTextLine` inserts `var visual = shapeForJsPdf(line)` before `doc.text(visual, x, y)`. The x-anchor flip (`isRtl ? PAGE_W - MARGIN_X : MARGIN_X`) is preserved.
    - `drawPage1Header` title draw at L388 wraps `clientName` with `shapeForJsPdf` (will be replaced by 23-03's centered draw, which preserves the shapeForJsPdf call).
    - `drawRunningHeader` wraps `text` with `shapeForJsPdf`.
    - The 4 doc.text() sites inside the list block all wrap their respective strings with `shapeForJsPdf`. Sites 5a and 5c (first wrapped line of each list item) use the prefix-then-shape form `shapeForJsPdf("- " + wrapped[wi])` per Open Question #1.
    - Footer `doc.text(label, fx, FOOTER_BASELINE_Y)` at L509 stays unchanged (Latin-only).
    - File parses cleanly. All 8 automated gates in the task <verify> pass.
  </done>
</task>

</tasks>

<verification>
- Bidi library wired: `grep -c 'loadScriptOnce.*bidi.min.js' assets/pdf-export.js` ≥1.
- Factory cached: `grep -c '_bidi = window.bidi_js' assets/pdf-export.js` ≥1.
- Helpers exist: `grep -c 'function firstStrongDir' assets/pdf-export.js` == 1 AND `grep -c 'function shapeForJsPdf' assets/pdf-export.js` == 1.
- G2 enforced (UTF-16 code units): `grep -c "text.split('')" assets/pdf-export.js` ≥1 AND `grep -cE '\[\.\.\.text\]|Array.from\(text' assets/pdf-export.js` == 0.
- All setR2L calls REMOVED: `grep -c 'setR2L' assets/pdf-export.js` == 0.
- shapeForJsPdf wired at all doc.text boundaries: `grep -c 'shapeForJsPdf(' assets/pdf-export.js` ≥7 (definition + ≥6 call sites).
- Prefix-then-shape for list bullets: `grep -c 'shapeForJsPdf("- ' assets/pdf-export.js` ≥2 (RTL + LTR).
- File parses: `node -c assets/pdf-export.js` exits 0.
- Manual UAT (Sapir): pure Hebrew session renders RTL with correct letter order; mixed Hebrew + ISO date renders with date in correct position; Hebrew bullet list places bullet on the right edge (per Open Question #1 — bullet-on-right is the success condition); bracket-mirroring in RTL paragraphs is correct per UAX-BD16 (G3 — pre-empt the "parens are backwards" question).
- Manual UAT (Ben): EN/DE/CS sessions still export correctly (no visible regression; byte-level verification happens in 23-04).
</verification>

<success_criteria>
- [ ] Bidi library wired into ensureDeps + factory cached module-level.
- [ ] firstStrongDir() and shapeForJsPdf() helpers defined per RESEARCH's canonical reference implementation.
- [ ] All 3 setR2L calls removed (G1 enforced — `grep -c setR2L` == 0).
- [ ] shapeForJsPdf inserted at all 6 doc.text() boundaries: drawTextLine, drawPage1Header title, drawRunningHeader, 4 list-rendering sites. Footer doc.text() at L509 left unchanged (Latin-only).
- [ ] Prefix-then-shape used for list bullets per Open Question #1 (`shapeForJsPdf("- " + wrapped[wi])`).
- [ ] G2 enforced everywhere: `text.split('')` used; no `[...text]` / `Array.from(text)` anywhere in the file.
- [ ] x-anchor flip in drawTextLine preserved (RTL → right margin, LTR → left margin) per RESEARCH 'Interaction with isRtl() anchor-X logic'.
- [ ] Both tasks' automated grep/node gates pass.
- [ ] Sapir confirms Hebrew rendering correctness (T1, T2 closed).
- [ ] Ben confirms RTL list bullet lands on right edge (Open Question #1 resolved as planned).
- [ ] Plan 23-03 (margins + title centering) can now run — but ONLY after 23-02 lands, because both modify `assets/pdf-export.js`. The orchestrator serializes 23-02 → 23-03 within Wave 2.
</success_criteria>

<output>
After completion, create `.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-02-bidi-preshape-and-setR2L-removal-SUMMARY.md` capturing:
- Final count of shapeForJsPdf call sites (expect ≥6; record exact).
- Final count of setR2L calls (expect 0).
- Any deviations from the RESEARCH-canonical helper bodies (expect: none).
- Sapir's UAT outcome notes (which test vectors she verified; whether bracket-mirroring caused confusion before G3's explanation; whether the RTL bullet landed correctly).
- Ben's UAT outcome notes (whether EN/DE/CS sessions exported without visible regression — byte-level confirmation is 23-04's job).
- Any new gotchas discovered during execution (anything that should feed into a Phase 23 retrospective).
</output>
</content>
</invoke>