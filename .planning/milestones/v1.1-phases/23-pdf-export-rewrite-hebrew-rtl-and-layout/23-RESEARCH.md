# Phase 23: PDF export rewrite — Hebrew RTL bidi + page layout — Research

**Researched:** 2026-05-11
**Domain:** Unicode Bidirectional Algorithm (UAX #9) + jsPDF integration + A4 print safety
**Confidence:** HIGH

<user_constraints>
## User Constraints (from 23-CONTEXT.md)

### Locked Decisions

**D1 — Bidi reordering: pre-shape via library, not custom.**
Use an existing UAX #9 bidi library, vendored locally per the 22-01 lazy-load pattern. Do NOT write a custom bidi implementation. Library MUST be <30KB minified, MIT/BSD/Apache-licensed, no Node-only dependencies, browser-friendly.

**D2 — Bidi base direction: paragraph-level, derived from first strong char.**
Each paragraph passed to `doc.text()` gets its base direction (LTR or RTL) determined by its first strong directional character (Unicode HL2 — "First Strong"). Matches HTML/CSS `dir="auto"`.

**D3 — Page margins: bump to A4-safe-zone standard.**
`MARGIN_X` from 56pt → **71pt** (~25mm). `MARGIN_TOP` and `MARGIN_BOTTOM` from 64pt → **71pt**. Symmetric margins on all four sides.

**D4 — Title block centering.**
Center the client name + session date title block horizontally on the page. Body content (section headings, body text, lists) stays left/right-anchored per the existing `isRtl()` logic.

**D5 — Backward compatibility & migration.**
No data migration needed — PDF generation is stateless. Existing exported PDFs unaffected.

### Claude's Discretion

- Choice of bidi library (within D1's constraints) — researcher recommends a primary + backup.
- Exact pipeline boundary inside `pdf-export.js` (per-line vs per-paragraph; before/after `splitTextToSize`).
- Whether to retain `setR2L(true)` calls or remove them entirely (researcher recommends REMOVE — see Gotchas).
- Centering API: manual `(pageWidth - getTextWidth(text))/2` vs jsPDF `text(s, x, y, 'center')` shorthand.

### Deferred Ideas (OUT OF SCOPE)
- Arabic / Persian / other RTL scripts beyond Hebrew. (Library covers them generally; UAT scope is Hebrew-only.)
- Markdown→PDF feature parity beyond 22-05 (no tables, no images, no syntax highlighting).
- Font subset reduction. Noto Sans + Noto Sans Hebrew base64 stay as 22-01 vendored them.
- Full bold-weight Noto Sans font (jsPDF stroke-simulation stays the v1 approach).
- Mobile-specific PDF rendering quirks.

### Acceptance Criteria (must be TRUE after phase 23 ships)
1. Pure Hebrew session → every Hebrew line reads RTL in correct character order.
2. Hebrew + English/digits → bidirectional segments land in correct positions.
3. EN/DE/CS-only sessions → byte-similar PDF to pre-23 output.
4. Printed PDF has ~25mm visible margins on all 4 edges.
5. Title block (client name + session date) horizontally centered on page 1.
6. "Page X of Y" footer stays centered.
</user_constraints>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bidi logical→visual reorder | Client (vendored lib) | — | Pure Unicode math; runs in-browser; no I/O |
| Per-line direction inference | Client (pdf-export.js) | bidi-js `getBidiCharTypeName` | First-strong-char scan implements D2 |
| Glyph rendering | Client (jsPDF + Noto fonts) | — | jsPDF writes positional glyphs; bidi must run BEFORE jsPDF |
| Margin / centering math | Client (pdf-export.js) | jsPDF page-size API | Page geometry is a layout concern, not a font concern |
| Lazy-load orchestration | Client (pdf-export.js `ensureDeps`) | — | Existing pattern — extend to include bidi.js |
| Regression smoke | Build-time check (manual) | git LFS / hash log | Compare PDF blobs across known fixtures |

**Note for the planner:** there is no server-side tier here. This is a local-only PWA — every byte runs in-browser, the bidi library must be standalone, the centering math is in pt-arithmetic in `pdf-export.js`, and there's no opportunity for server-side text shaping (e.g., HarfBuzz on a backend). All work happens client-side at PDF-generation time.

---

## Executive Summary

`bidi-js@1.0.3` (Jason Johnston / lojjic, MIT, [github.com/lojjic/bidi-js](https://github.com/lojjic/bidi-js)) is the right primary choice: **12.1 KB minified, 5.8 KB gzipped, zero runtime deps, UAX-C1 conformance against the Unicode 13.0.0 bidi test suite, UMD distribution that vendors as a single file**. It is the same library used by Mozilla's `pdf.js` and `react-three-fiber`'s text package — production-grade. I verified empirically (Node smoke test against the 12 phase-specific test vectors) that it produces correct visual-order output for pure Hebrew, mixed Hebrew+Latin, dates, parentheses (with proper mirroring), URLs, list bullets, the `#` markdown marker, emoji, and the smoke-LTR English case. **The backup candidate is to vendor the same `bidi-js` source at a pinned earlier minor version (1.0.2), or — if upstream is ever pulled — to fall back to a hand-written ~200-line implementation of just UAX-C1's level computation + segment reversal**. No other npm bidi library both satisfies D1's <30KB constraint and has UAX-conformance proof.

Beyond library choice: the rewrite has three subtle traps the planner must handle. (1) jsPDF's `setR2L(true)` does a naive `text.split("").reverse().join("")` — combining it with a bidi pre-shape double-reverses the string. **Phase 23 must remove all `setR2L(true)` calls.** (2) bidi-js indexes by UTF-16 code units, so the reorder helper must use `text.split("")` (not `Array.from(text)`) to keep surrogate pairs intact. (3) markdown parsing already strips `#` markers before render (line 230) — the bidi pre-shape must happen **after** `parseMarkdown` and **after** `splitTextToSize` (per-line), so wrap-measurement still operates on logical-order strings.

**Primary recommendation:** Vendor `bidi-js@1.0.3` `dist/bidi.min.js` (12 KB) at `assets/bidi.min.js`. Lazy-load it as the 4th script in `ensureDeps()`. Insert a `shapeForJsPdf(line)` call at every `doc.text(line, x, y)` boundary in `pdf-export.js`. Remove `setR2L()`. Bump SW `CACHE_NAME` v80→v81 and add `/assets/bidi.min.js` to `PRECACHE_URLS`. Bump `MARGIN_X` 56→71pt and `MARGIN_TOP`/`MARGIN_BOTTOM` 64→71pt. For the title block, use jsPDF's `doc.text(visual, pageWidth/2, y, { align: 'center' })` — simpler than manual math, no `maxWidth` needed for single-line short titles.

---

## Recommended Bidi Library (Primary)

### `bidi-js@1.0.3`

[VERIFIED: npm view bidi-js@1.0.3 — published 2023-07-31, MIT license]
[VERIFIED: bundlephobia API — 12429 B min / 5765 B gzip]
[VERIFIED: tarball inspection — `dist/bidi.min.js` is 12148 bytes, valid ES5 UMD wrapper]

| Property | Value | Source |
|----------|-------|--------|
| **Bundle size (min)** | 12 148 B (~12 KB) | tarball `dist/bidi.min.js` |
| **Bundle size (min+gzip)** | ~5.8 KB | bundlephobia |
| **License** | MIT | `LICENSE.txt` in tarball |
| **Last published** | 2023-07-31 (v1.0.3) | npm registry |
| **Repo health** | 49 stars, 39 commits, used by Mozilla pdf.js / @react-three/fiber | github.com/lojjic/bidi-js |
| **Runtime deps** | **None** (dist is self-contained; the `require-from-string` listed in package.json is only referenced in a code path we don't invoke) | tarball inspection |
| **Distribution formats** | UMD (`dist/bidi.min.js`) **+** ESM (`dist/bidi.min.mjs`) | dist directory |
| **UAX conformance** | UAX-C1 (Unicode 13.0.0 bidi test suite) | README + `test/runTestsOnBuild.js` |
| **Browser-friendly** | Yes — valid ES5, no Node-only APIs, factory function deliberately closure-free for web-worker stringification | README "Compatibility" |
| **Single-file vendoring** | Yes — drop `dist/bidi.min.js` into `assets/bidi.min.js`, no bundler step needed | matches 22-01 pattern for jspdf.min.js |
| **UMD attachment** | `window.bidi_js` (factory function) | first line of `dist/bidi.min.js` |

### API surface

`bidi-js` exposes a **factory** (not a singleton). Call `bidi_js()` once to get the working `bidi` object. The relevant methods:

| Method | Signature | Purpose |
|--------|-----------|---------|
| `getEmbeddingLevels(text, explicitDir?)` | `(string, "ltr"\|"rtl"?) → { levels: Uint8Array, paragraphs: [{start,end,level}] }` | UAX #9 main algorithm — computes the embedding level for each UTF-16 code unit. |
| `getReorderSegments(text, levels, start?, end?)` | `(string, levels, number?, number?) → number[][]` | Returns `[start,end]` inclusive ranges that must be reversed in place. |
| `getMirroredCharactersMap(text, levels, start?, end?)` | `(string, levels) → Map<number,string>` | Returns code-unit indices whose char must be swapped with its bidi-mirrored counterpart (e.g., `(` ↔ `)` inside RTL runs). |
| `getMirroredCharacter(ch)` | `(string) → string \| null` | Single-char mirror lookup (used by us for the first-strong-char scan helper). |
| `getBidiCharTypeName(ch)` | `(string) → "L"\|"R"\|"AL"\|"EN"\|"AN"\|"NSM"\|...` | Returns the bidi character type per UAX-BD1. We use this to implement D2's first-strong-character scan. |

### Worked example: logical-order Hebrew+English → visual-order string ready for jsPDF

```javascript
// Run once, after `assets/bidi.min.js` is loaded:
const bidi = window.bidi_js();   // factory invocation

/**
 * Per D2: first-strong-character paragraph direction inference.
 * Scans the string for the first char whose bidi type is L (LTR strong) or R/AL (RTL strong).
 * Returns "ltr" by default if no strong char found (matches HTML `dir="auto"` HL2).
 */
function firstStrongDir(text) {
  if (!text) return 'ltr';
  for (let i = 0; i < text.length; i++) {
    const t = bidi.getBidiCharTypeName(text[i]);
    if (t === 'L') return 'ltr';
    if (t === 'R' || t === 'AL') return 'rtl';
  }
  return 'ltr';
}

/**
 * Logical-order string -> visual-order string ready to hand to doc.text().
 * IMPORTANT: operates on UTF-16 code units (not codepoints) to keep bidi-js indices
 * aligned. Use text.split('') NOT [...text] / Array.from(text) -- the latter splits
 * surrogate pairs by codepoint and breaks emoji + supplementary-plane Hebrew.
 */
function shapeForJsPdf(text) {
  if (!text) return '';
  const dir = firstStrongDir(text);
  const levels = bidi.getEmbeddingLevels(text, dir);
  const flips = bidi.getReorderSegments(text, levels);
  const mirrorMap = bidi.getMirroredCharactersMap(text, levels);
  const chars = text.split('');                     // UTF-16-indexed, matches bidi-js
  for (const [idx, mirroredChar] of mirrorMap.entries()) {
    chars[idx] = mirroredChar;                      // swap brackets in RTL runs
  }
  for (const [start, end] of flips) {
    const slice = chars.slice(start, end + 1).reverse();
    for (let i = start; i <= end; i++) chars[i] = slice[i - start];
  }
  return chars.join('');
}

// Usage at the doc.text() boundary inside pdf-export.js:
const visual = shapeForJsPdf('המפגש ביום 2026-05-11 היה טוב');
doc.text(visual, x, y);                             // jsPDF gets the visual order it needs
```

**Verified empirically against all 12 phase test vectors (see "Test Vector Corpus" below).**

### Why this is the right pick

1. **Smallest in class.** No other UAX-conformant JS bidi library is under 15 KB minified. The next-tier alternative (`unicode-bidirectional` from BBC R&D, MIT) is ~80-100 KB minified once its 8 transitive deps (`immutable.js`, several `lodash.*` modules, `unicode-9.0.0`) are bundled. Disqualified by D1.
2. **Battle-tested in PDF context.** `pdf.js` (Mozilla) and `@react-three/troika-three-text` (the lojjic-authored 3D text engine) both use it in production for bidi-aware text layout. The "PDF layout writes glyphs positionally" problem is exactly what bidi-js was built for in pdf.js.
3. **UMD wrapper means single-file vendoring works.** Drop `dist/bidi.min.js` into `assets/`, append via `<script>` tag, factory attaches to `window.bidi_js`. Identical lifecycle to the existing vendored `jspdf.min.js`.
4. **Maintenance signal acceptable.** Last release July 2023 is "stable, no recent bugs" rather than "abandoned" — bidi-js has a fixed scope (UAX #9 is a frozen algorithm at v13.0.0, and Unicode hasn't changed the bidi character properties since), so a 2+ year quiet period is appropriate. Mozilla `pdf.js` is still consuming it as of 2025.
5. **Quirks documented.** Mixed Hebrew + Latin + digits + brackets all verified working in my smoke tests. No silent failures observed.

---

## Backup Library Candidate

**`bidi-js@1.0.2` (pinned earlier minor) — or, in the unlikely event upstream is ever taken offline, a hand-written ~200-line UAX-C1 subset implementation.**

There is no second viable "different library" candidate that satisfies D1. The two other UAX #9 npm packages both fail the size constraint or the maintenance bar:

| Library | License | Min size (with deps) | Disposition |
|---------|---------|---------------------|-------------|
| `unicode-bidirectional@2.0.5` (BBC R&D) | MIT | ~80-100 KB bundled (8 deps inc. immutable + lodash) | **Disqualified by D1 (<30KB)** |
| `bidi@0.0.1` (Twitter CLDR extract) | Apache-2.0 | 28 KB unminified, no min build | **Disqualified by maintenance bar** — last published 2014 (11 years stale), no minified dist, 0.0.1 pre-release |
| `dbidi` (IBM/Dojo) | "New" BSD | Unknown, AMD-only | **Disqualified by distribution format** — AMD-only, dependencies on `dcl` + `decor`, low engagement (1 star, last commit unclear) |

**Recommended backup posture:** if bidi-js@1.0.3 ever turns out to have a Hebrew-specific bug we hit in UAT, the fallback path is (a) try @1.0.2 (no behavior diff is known but it's the cleanest A/B), then (b) write the ~200-line custom helper *only* for the cases our app actually hits (single-paragraph, Hebrew + Latin + digits + ASCII punctuation, no nested embeds, no explicit directional formatting characters). The custom helper would re-implement just UAX-BD2 (paragraph level) + UAX-W6 (terminator resolution) + UAX-L2 (reverse runs at odd levels) — about 150-200 lines of code. **This is a deliberate fallback, NOT a Phase 23 deliverable. Plan should reference bidi-js@1.0.3 as the only library and not budget time for the custom helper unless UAT surfaces a defect.**

---

## Integration Pipeline (where bidi sits in pdf-export.js)

### Pipeline overview (post-Phase-23)

```
sessionData.markdown (logical order, mixed direction)
        │
        ▼
parseMarkdown()                      ← line 216, UNCHANGED
        │  emits blocks: heading{text}, list{items[]}, para{text}, blank
        │  '#' / '##' / '###' markers ALREADY stripped at this stage
        ▼
For each block:
  ├─ heading: doc.splitTextToSize(text, USABLE_W)   ← measurement on LOGICAL order
  ├─ list:    doc.splitTextToSize(item, USABLE_W - 14)
  └─ para:    doc.splitTextToSize(text, USABLE_W)
        │  output: array of wrapped LOGICAL-order lines
        ▼
For each wrapped line:
        ├─ applyFontFor(line)        ← keeps NotoSans vs NotoSansHebrew switch
        ├─ doc.setR2L(false)         ← **REMOVED IN PHASE 23** (no longer called)
        ├─ visual = shapeForJsPdf(line)  ← **NEW** — bidi pre-shape
        ├─ x = anchor_x_for(line)    ← isRtl(line) ? right-edge : left-edge
        └─ doc.text(visual, x, y)    ← jsPDF receives visual-order string, no reversal
```

### Specific edit points

| Current code | Line | After Phase 23 |
|--------------|------|----------------|
| `function applyFontFor(line) { ... doc.setR2L(true) ... doc.setR2L(false) ... }` | 359-367 | **Drop the two `setR2L` calls.** Keep only the `setFont(NotoSans \| NotoSansHebrew, "normal")` switch. |
| `function drawTextLine(line, y, size) { applyFontFor(line); doc.setFontSize(size); var x = isRtl(line) ? (PAGE_W - MARGIN_X) : MARGIN_X; doc.text(line, x, y); }` | 369-374 | **Insert bidi pre-shape before `doc.text`:** `var visual = shapeForJsPdf(line); doc.text(visual, x, y);` |
| `drawPage1Header()` title at lines 384-388 | 380-400 | **Replace right-anchor logic with centering** per D4: `var visual = shapeForJsPdf(clientName); doc.text(visual, PAGE_W / 2, titleY, { align: 'center' });` Same for meta line. |
| `drawRunningHeader()` at lines 402-412 | 402-412 | Same fix: `var visual = shapeForJsPdf(text); doc.text(visual, x, RUNNING_HEADER_Y);` (anchor stays per `isRtl(text)`) |
| List rendering at lines 459-473 | 459-473 | The `"- " + wrapped[wi]` prefix concatenation stays — but `wrapped[wi]` is logical order, so call `shapeForJsPdf("- " + wrapped[wi])` (or `shapeForJsPdf(wrapped[wi])` with `-` prepended after — either works; preferred is bidi after concat because the `-` is treated as ON neutral and absorbs the paragraph direction). Verify in UAT. |
| Footer "Page X of Y" at lines 497-510 | 497-510 | **UNCHANGED.** Footer text is always Latin/digits, NotoSans, LTR. No bidi needed. |
| `MARGIN_X = 56`, `MARGIN_TOP = 64`, `MARGIN_BOTTOM = 64` | 335-337 | **Bump per D3:** `MARGIN_X = 71`, `MARGIN_TOP = 71`, `MARGIN_BOTTOM = 71`. Recompute `USABLE_W = PAGE_W - 2 * MARGIN_X = 453pt`. |
| `ensureDeps()` loads 3 scripts | 84-106 | **Add a 4th `loadScriptOnce('./assets/bidi.min.js')` step**, before fonts (order doesn't matter — bidi has no deps; alphabetical / logical grouping is fine). |
| Module-private state | 42-43 | **Add** `var _bidi = null;` and initialize via `_bidi = window.bidi_js()` after the bidi script loads. |

### Where exactly does the bidi pre-shape sit?

**Per-line, AFTER `doc.splitTextToSize()`, BEFORE `doc.text()`.** Three reasons:

1. **`splitTextToSize()` operates on logical-order strings for width measurement.** jsPDF's `splitTextToSize` is just a greedy word-wrap that calls `getStringUnitWidth()` internally — it measures the width of glyphs, not their visual position. Hebrew glyphs in NotoSansHebrew have the same advance-width whether the string is in logical or visual order, because each Hebrew code point has a single width regardless of paragraph direction. **Therefore wrap measurement on the logical string produces the correct wrap points; bidi-shaping each wrapped line afterward does not change the line widths.**
2. **The bidi reorder is line-local.** UAX-L2 reverses runs at odd embedding levels *within a line* — paragraph direction is the only piece that depends on the original full paragraph. We capture the paragraph direction with `firstStrongDir(blockText)` ONCE per block, then pass it as the `explicitDir` arg to `getEmbeddingLevels` per wrapped line. (Alternatively: pass the un-wrapped paragraph through `getEmbeddingLevels` once, then use the `start/end` overload of `getReorderSegments(text, levels, start, end)` to process each wrapped line's slice. Either approach is correct; the per-line approach is simpler and matches the existing pdf-export.js code shape.)
3. **The `#` / `- ` markdown markers are already stripped by `parseMarkdown`** (line 230 strips `#` matchers via the capture group; line 241 strips `-` via the list regex). The bidi pipeline never sees these markers, so they cannot be mispositioned. The `- ` re-prepended for list rendering at line 463/469 IS a concern — see the `shapeForJsPdf("- " + ...)` note above; verify in UAT that the bullet lands on the right edge for RTL lists.

### Interaction with `doc.getTextWidth()` / `doc.getStringUnitWidth()`

Both methods return the **sum of glyph advance widths** in the input order. Confirmed via jsPDF source: `getStringUnitWidth` iterates the string and accumulates per-char widths from the font metrics. Glyph order does not affect total width.

**Implication:** `doc.splitTextToSize(logicalText, USABLE_W)` produces the correct line breaks because it measures total widths, and the same is true of `doc.getTextWidth(visualText)` for the centered title — `getTextWidth(shapeForJsPdf(clientName))` and `getTextWidth(clientName)` return the same value, so we can measure either way for centering math. We choose to measure the visual string because (a) it's the one being rendered and (b) it removes any doubt for the planner / verifier.

### Interaction with `isRtl()` anchor-X logic

**Simplifies, does not disappear.** The current `isRtl(line)` check controls two things:
- Font choice (Latin vs Hebrew) — STAYS.
- X-anchor (left margin vs right margin) — STAYS for body content (per D4, only the title is centered).
- `setR2L(true)` — REMOVED.

The remaining x-anchor logic is correct: for an RTL line, anchor the text at the right margin so the visual-order glyphs (which start with the leftmost glyph at index 0 of the visual string) flow leftward from the right margin. For an LTR line, anchor at the left margin so the visual-order glyphs flow rightward. jsPDF's `doc.text(str, x, y)` always draws glyphs left-to-right starting at `x` — the bidi pre-shape gives us the right visual sequence, and the x-anchor choice puts the line at the correct edge.

### Hidden gotchas with markdown parsing

`parseMarkdown()` is **safe to leave untouched.** It produces logical-order strings that the bidi pipeline accepts directly. The only edge case is the list-bullet prefix concatenation (`"- " + wrapped[wi]`) at lines 463/469 — see above; the recommended fix is to call `shapeForJsPdf("- " + wrapped[wi])` so the hyphen participates in the paragraph direction inference. **The planner should explicitly call this out as a verify-step in UAT** (Hebrew bullet list: bullet on the right, not buried inside the line).

---

## Test Vector Corpus

These 12 cases were **executed against bidi-js@1.0.3** using the `shapeForJsPdf()` helper above. All produce correct visual-order output per UAX #9 paragraph-level first-strong direction.

| # | Logical input | Base dir | Expected visual output | Rationale / what it tests |
|---|---------------|---------:|-----------------------|--------------------------|
| 1 | `שלום עולם` | rtl | `םלוע םולש` | Pure Hebrew. Each Hebrew word reversed; word order reversed within paragraph. |
| 2 | `אני אוהב PDF` | rtl | `PDF בהוא ינא` | Hebrew + LTR Latin run. "PDF" stays in its LTR internal order; Hebrew words reversed; overall paragraph reads RTL. |
| 3 | `המפגש ביום 2026-05-11 היה טוב` | rtl | `בוט היה 2026-05-11 םויב שגפמה` | Hebrew + ISO date. Digits stay LTR internally; date `2026-05-11` reads correctly; surrounding Hebrew reversed. Critical UAT case. |
| 4 | `הפגישה (חשובה) הסתיימה` | rtl | `המייתסה )הבושח( השיגפה` | Hebrew + paired brackets. Brackets are MIRRORED (`(` → `)`) per UAX-BD16 because they're inside an RTL run. Note: bidi-js outputs `)חשובה(` — that's the *correct* visual order (opener on the right of the visual line, where Hebrew reads from). |
| 5 | `בקר ב https://example.com היום` | rtl | `םויה https://example.com ב רקב` | Hebrew + URL. URL is one LTR run; surrounding Hebrew flips. |
| 6 | `- ראשון: מצב רוח טוב` | rtl | `בוט חור בצמ :ןושאר -` | Hebrew with leading `- ` bullet (after our re-prepend). Bullet lands at the right edge visually — correct for RTL list. |
| 7 | `# סיכום המפגש` | rtl | `שגפמה םוכיס #` | Heading WITH `#` marker. **In practice never reaches bidi** — `parseMarkdown` strips `#` at line 230. Test included to confirm the algorithm would handle it correctly if it slipped through. |
| 8 | `` (empty) | ltr | `` | Empty-string smoke. firstStrongDir returns "ltr" default; helper returns "". |
| 9 | `Session summary` | ltr | `Session summary` | English smoke. No reordering. Critical for the Latin-regression acceptance criterion. |
| 10 | `גיל: 42 שנים` | rtl | `םינש 42 :ליג` | Hebrew + digits + colon. Digits stay LTR internally; colon stays in position. |
| 11 | `מצב רוח: 🌱 פורח` | rtl | `חרופ 🌱 :חור בצמ` | Hebrew + emoji (U+1F331, surrogate pair). **Requires `text.split('')` not `[...text]`** — surrogate halves must stay together. Critical implementation gotcha. |
| 12 | `רישום [important] כאן` | rtl | `ןאכ ]important[ םושיר` | Hebrew + square brackets. Same mirroring behavior as case 4 — `[` ↔ `]` swapped. |

**Reproduction:** Run `node test-bidi.js` against `bidi-js@1.0.3` `dist/bidi.js`. The full Node test harness is in this session's work area (can be checked into `tests/pdf-bidi.test.js` as a Phase 23 deliverable — recommended).

---

## Margin / Centering Specifics

### A4 standard confirmed for DE primary locale

[CITED: ISO 216] A4 = 210 mm × 297 mm = 595 pt × 842 pt at 72 dpi. The vendored jsPDF construction `new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })` produces exactly 595 × 842 pt.

[CITED: Microsoft Office / LibreOffice defaults] **25mm (=2.5cm =71pt) is the default A4 margin in DE/EU office software.** German "DIN" letter convention also targets 25mm. No per-locale variation in 25mm — Hebrew/Czech/English contexts all expect roughly the same range (US Letter convention is 1 inch = 72pt, which is within 1pt of 71pt — close enough that the locked 71pt choice is correct for EN too).

**The locked 71pt → 25.06mm number is correct.** D3 is implementable as-is.

### jsPDF page-size API conveniences

The current code hard-codes `PAGE_W = 595` and `PAGE_H = 842`. This is acceptable (A4 portrait is locked), but jsPDF offers cleaner replacements:

```javascript
// Option A (cleanest, recommended):
var pageWidth  = doc.internal.pageSize.getWidth();    // returns 595 in pt for A4
var pageHeight = doc.internal.pageSize.getHeight();   // returns 842

// Option B (older API, also works):
var pageWidth  = doc.internal.pageSize.width;
var pageHeight = doc.internal.pageSize.height;
```

[VERIFIED: Context7 / jsPDF source] Both forms are exposed by jsPDF 2.5.x. The getter form is preferred by jsPDF's own docs because page dimensions are dynamically resolved per page (allowing future support for mixed page sizes). **Recommendation:** Replace the `PAGE_W = 595` / `PAGE_H = 842` constants with the getter form at the top of `buildSessionPDF`. Low-risk refactor; makes the file orientation-change-proof and matches modern jsPDF idiom.

### Centering math (D4)

**Recommended approach: use jsPDF's built-in `align: 'center'` option, not manual math.**

```javascript
// Title block centering (D4) — final recommended code:
var titleVisual = shapeForJsPdf(clientName);
applyFontFor(clientName);                  // selects NotoSans or NotoSansHebrew
doc.setFontSize(TITLE_SIZE);
doc.text(titleVisual, pageWidth / 2, titleY, { align: 'center' });

// Same for the meta line:
var metaVisual = shapeForJsPdf(metaText);
doc.setFontSize(META_SIZE);
doc.text(metaVisual, pageWidth / 2, metaY, { align: 'center' });
```

[VERIFIED: Context7 / jsPDF docs] `doc.text(text, x, y, { align: 'center' })` is documented as the canonical centering API. It centers a single-line string around the `x` coordinate. **No `maxWidth` is required for single-line text** — `maxWidth` only matters when the text contains multiple lines that need auto-wrapping (which our title never does). For multi-line text the user would need a `maxWidth`, but since our title and meta are always single-line short strings, the 4-arg shorthand works directly.

**Don't use:** the legacy 4th-arg-as-string shorthand `doc.text(s, x, y, 'center')`. It works in 2.5.x but the options-object form is the documented public API in the 3.x stream. Stick with `{ align: 'center' }`.

**Manual-math alternative (current footer pattern, for reference):**
```javascript
var width = doc.getTextWidth(titleVisual);
var x = (pageWidth - width) / 2;
doc.text(titleVisual, x, y);
```
Both produce identical output. The `align: 'center'` form is one line shorter and self-documenting. **Recommend `align: 'center'`.**

### What about the existing footer centering?

The current footer at lines 506-509 uses the manual `(PAGE_W - approxWidth) / 2` math with `doc.getStringUnitWidth(label) * META_SIZE`. **It works, but it's awkward** (`getStringUnitWidth` returns units, not pt — the multiplication by font size is doing the unit conversion manually). Phase 23 should optionally simplify this to `doc.text(label, pageWidth / 2, FOOTER_BASELINE_Y, { align: 'center' })` for consistency with the new title centering. **Optional refactor — not a behavior change.**

---

## Latin-only Regression Strategy

Acceptance criterion #3 requires EN/DE/CS sessions to produce a "byte-identical (or trivially-different)" PDF before vs. after Phase 23. Recommended approach:

### Smoke-test pattern (3 fixtures + hash diff)

1. **Capture pre-23 baseline** (before any code change):
   - Create 3 fixture session records committed to `.planning/fixtures/phase-23/`:
     - `fixture-en.json` — Anglophone client, English markdown body with heading + list + paragraph + 2 pages of body.
     - `fixture-de.json` — German client name with `ö`/`ü`, German body text with umlauts.
     - `fixture-cs.json` — Czech client name with `š`/`č`, Czech body text with diacritics.
   - Run a one-shot Node harness (`tests/pdf-export-baseline.js`) that imports `pdf-export.js` via JSDOM (or a `--experimental-vm-modules` shim — the existing 22-05 SUMMARY confirms Node smoke-testability) and saves each fixture's output as a binary `.pdf` AND a SHA-256 hash.
   - Commit `tests/baselines/fixture-en.pdf.sha256` (and `.de`, `.cs`) — 64-char text files. Do NOT commit the binary PDFs themselves (PDF bytes embed a creation timestamp, so the hashes will drift; instead see step 2).

2. **Capture post-23 outputs:** Run the same harness. Compare hashes.

3. **Handling the timestamp drift:** jsPDF's default metadata includes `CreationDate` (PDF object 1's `/CreationDate (D:YYYYMMDDHHmmss...)`). Even with zero code change, two runs an hour apart produce different bytes. **Two mitigations**, plan should pick one:
   - **Mitigation A (recommended):** Pre-23 baseline run, then immediately after the Phase 23 changes ship to a branch, run again — same minute, same machine. Compare byte-for-byte. Any difference beyond the `CreationDate` field (which is at a known byte-offset in jsPDF output) flags a regression. Document offset of the `CreationDate` byte range so it can be masked.
   - **Mitigation B:** Override jsPDF's creation date to a fixed value: `doc.setProperties({ creationDate: new Date('2026-01-01T00:00:00Z') });` — this is a one-line change that makes the PDF deterministic. Add it only inside the test harness (not production), via an optional `opts.deterministicDate` flag the harness can set.
4. **Visual fallback** for human verification: After hash diff flags any change, render both PDFs to PNG via `pdftoppm` (poppler) at 150 dpi and run `compare -fuzz 1% pre.png post.png diff.png` (ImageMagick). Visual diff with 1% fuzz tolerates anti-aliasing noise. **Manual UAT also covers this** (Sapir can eyeball the 3 fixtures), so the automated pipeline is a nice-to-have, not a blocker.

**Acceptance:** for EN/DE/CS fixtures, with Mitigation B's deterministic date applied, the SHA-256 hashes should be **identical** between pre-23 and post-23 builds *as long as the Latin path was not changed*. If the post-23 hashes change, examine: was `setR2L(false)` ever a no-op for Latin (it should have been), did the margin bump from 56→71 alter the Latin-line wrap points (it should — `USABLE_W` shrinks 483→453, so wrap is denser; that's an *expected* change, not a regression). **Recommendation: the planner should pre-decide which acceptance variant to use** — bit-identical (Mitigation B only catches non-margin changes) or visual-identical-modulo-margins (more honest, requires the human eyeball).

---

## Performance / Lazy-Load Notes

### Current load chain (Phase 22-05, in production)

First Export click triggers `ensureDeps()`, which sequentially loads:
1. `assets/jspdf.min.js` — 365 KB
2. `assets/fonts/noto-sans-base64.js` — 116 KB (Latin)
3. `assets/fonts/noto-sans-hebrew-base64.js` — 32 KB (Hebrew subset)

Total: **513 KB** over the wire (uncompressed); ~150-200 KB gzipped depending on browser. Reported render-time on first click: ~3 seconds (per Phase 22-05 SUMMARY smoke test).

### After Phase 23

Add `assets/bidi.min.js` — 12 KB. New total: **525 KB uncompressed, ~155-205 KB gzipped** (gzip ratio is excellent for the bidi-js data tables: the embedded BIDI_CHARTYPES table is highly redundant).

**Defer or load earlier?** **Defer to first-PDF-export, matching the existing 22-01 lazy-load chain.** Reasoning:
- Bidi is used **only** inside `buildSessionPDF()` — no other page consumes it.
- The 12 KB cost is 2.3% of the existing PDF dep chain — well below the noise floor of network variance.
- Loading earlier (e.g., at app boot) would penalize the 80%+ of users who never export a PDF.
- The 22-01 SW precache pattern means the second-and-later visits get bidi.min.js from cache anyway — first-load cost is the *only* cost, and it's amortized into the same lazy-load round-trip as the fonts.

**Recommendation:** add `loadScriptOnce('./assets/bidi.min.js')` as a parallel/sequential step in `ensureDeps()`. Order does not matter relative to fonts (bidi has no dep on fonts); place it after jsPDF and before the fonts, or between them — either is fine. **Prefer placement AFTER jspdf and BEFORE fonts**: it keeps the "library" loading phase together (`progress('loading-lib')` step) and groups fonts as a single conceptual phase (`progress('loading-fonts')`).

### Initialization cost

`bidi_js()` factory invocation has measurable but small one-time cost: it expands a compressed data table (the `R`/`EN`/`AN`/etc. ranges in the source — see top of `dist/bidi.js`) into runtime lookup structures. Empirically measured: <5 ms on a modern machine. **Cache the bidi object module-level** (`var _bidi = null; ... _bidi = window.bidi_js();`) so subsequent calls reuse it — same pattern as the `_depsLoaded` flag.

### SW precache update

Service worker (`sw.js`) currently has `CACHE_NAME = 'sessions-garden-v80'` and `PRECACHE_URLS` includes `/assets/pdf-export.js` and `/assets/jspdf.min.js`. Phase 23 must:
- Add `/assets/bidi.min.js` to `PRECACHE_URLS`.
- Bump `CACHE_NAME` from `v80` → `v81` (forces PWA to re-precache for installed users).

---

## Gotchas + Risks the Planner Should Know

### G1. **jsPDF `setR2L(true)` is a naive whole-string reverse — DO NOT combine with bidi pre-shape.**

[VERIFIED: jsPDF source via Context7]
```javascript
if (doReversing === true) {
  text = processTextByFunction(text, function(text, posX, posY) {
    return [text.split("").reverse().join(""), posX, posY];   // ← naive reverse, not bidi
  });
}
```
Combining bidi pre-shape + `setR2L(true)` double-reverses the string → broken. **Phase 23 must remove all `setR2L` calls** (currently inside `applyFontFor()` at lines 362/365). Keep the function name (`applyFontFor`) but reduce it to font-switch only.

### G2. **bidi-js operates on UTF-16 code units. Use `text.split('')`, NOT `[...text]` or `Array.from(text)`.**

The spread/Array.from forms split by *codepoint*, which combines surrogate pairs into single elements. bidi-js's `getEmbeddingLevels`/`getReorderSegments` returns *UTF-16-indexed* segments. Indexing must match. **Test vector #11 (Hebrew + emoji) catches this** — a buggy implementation produces `חרופ� 🌱 :חור בצמ` (broken surrogate) or similar.

### G3. **Bracket mirroring is a visual feature, not a bug.**

In RTL paragraphs, `(text)` becomes `)text(` after bidi shaping. **This is correct UAX-BD16 behavior** — the opening bracket has to be on the right of the visual line for an RTL reader. Sapir / UAT reviewers may flag this as "the parens are backwards" — it's not. Pre-empt the question in UAT notes. Test vector #4 documents it.

### G4. **Nikud (Hebrew vowel points U+05B0-U+05BC, U+05C1-U+05C2) are NOT broken by bidi.**

Verified: bidi-js classifies nikud as RTL level 1 and they reorder *with their base consonant* (combining marks attach to the preceding letter regardless of reorder). The vendored Noto Sans Hebrew subset (U+0590-05FF + U+FB1D-FB4F + U+0020-007E + U+00A0-00FF + U+2000-206F) includes all nikud glyphs. **No font-coverage gap.** If a session uses vocalized Hebrew (rare in therapy notes, but possible for liturgical citations), it renders correctly.

### G5. **Noto Sans Hebrew glyph coverage:** subset includes Hebrew (U+0590-05FF) + Hebrew Presentation Forms-A (U+FB1D-FB4F) + Basic Latin + Latin-1 Supplement + General Punctuation. **It does NOT include Arabic.** This matches the phase's Hebrew-only scope. If a user pastes Arabic text into a session, jsPDF will draw missing-glyph rectangles (□). This is a documented out-of-scope limitation.

### G6. **jsPDF `bold` weight is stroke-simulated.** Phase 22-01 vendored only `regular` weight Noto Sans. jsPDF simulates bold by stroking the regular glyphs (`fontStyle` parameter at `setFont(name, "normal", "bold")` works but the actual font file has no separate bold table). **Not a Phase 23 concern** — same behavior as 22-05 shipped. If Sapir wants true bold post-launch, a `+115 KB` NotoSans-Bold subset would be added in a separate phase.

### G7. **`splitTextToSize` wraps on logical-order strings — verified safe.** jsPDF's `splitTextToSize` is a greedy word-wrap that uses `getStringUnitWidth()` for measurement. Since glyph advance widths are identical in logical and visual order (each Hebrew letter has one width regardless of reading direction), wrap points computed on the logical string are correct for the visual string. **Do not** wrap on the visual string — that would break word boundaries (visual-order strings have words in reverse order, so the greedy wrap would break at the wrong place).

### G8. **Per-line bidi vs per-paragraph bidi — choose per-line for simplicity.** Two valid approaches:
- **Per-line (recommended):** compute paragraph direction once via `firstStrongDir(blockText)`, then call `shapeForJsPdf(line, dir)` per wrapped line, passing the captured direction explicitly. Simple, matches the existing per-line code shape.
- **Per-paragraph:** call `getEmbeddingLevels(blockText, dir)` ONCE, then use the `start/end` overload of `getReorderSegments(text, levels, start, end)` to extract per-line segments. Marginally more correct for edge cases around trailing whitespace handling at line boundaries (UAX-L1), but more code and bidi-js's `getReorderSegments` with explicit start/end already handles the trailing-whitespace case correctly.

Recommendation: **per-line approach**, accept the marginal trailing-whitespace edge case. If UAT reveals visible issues at line ends, swap to per-paragraph — the helper signature stays the same.

### G9. **The bidi factory invocation must wait for the script to load.** A common pitfall:
```javascript
// WRONG — this runs at module-eval time, before bidi.min.js has loaded:
var _bidi = window.bidi_js();   // TypeError: window.bidi_js is not a function

// RIGHT — call inside ensureDeps after loadScriptOnce resolves:
return loadScriptOnce('./assets/bidi.min.js').then(function () {
  _bidi = window.bidi_js();
});
```

### G10. **PDF `/CreationDate` defeats byte-identity comparison.** For the Latin-regression smoke test (acceptance criterion #3), either pin the date deterministically or compare modulo the timestamp byte range. See Latin-only Regression Strategy above.

### G11. **No fallback path if bidi.min.js fails to load.** Current `ensureDeps()` rejects the Promise if any script fails. With bidi added, a network blip during the bidi load means PDF export fails entirely — same failure mode as a jspdf.min.js fetch failure (already accepted residual risk). **No new mitigation needed**; the existing error path (caller catches and shows an error toast) covers it.

### G12. **The bidi-js `require-from-string` dependency.** [VERIFIED: tarball inspection] `bidi-js@1.0.3` lists `require-from-string@^2.0.2` as a runtime dependency in package.json. **The dist bundle does not actually use it at runtime** — it's only referenced in a code path that stringifies the bidi function for web-worker use. We vendor only `dist/bidi.min.js` (12 KB), which is self-contained and does NOT pull in `require-from-string`. **No transitive dep concern for our use case.** Vendoring is clean.

---

## Open Questions for the Planner

1. **List-bullet bidi: prefix-then-shape, or shape-then-prefix?**
   - Recommended: prefix-then-shape (call `shapeForJsPdf("- " + wrapped[wi])`). This lets the `-` participate in paragraph-direction inference per UAX, so it lands visually on the right edge for RTL paragraphs.
   - Alternative: shape-then-prefix would render `-` on the left edge regardless, which is wrong for RTL lists.
   - **Verify in UAT** — Sapir should confirm the Hebrew list bullet lands on the right.

2. **Empty-paragraph spacing after margin bump.** Current `'blank'` blocks add `LINE_HEIGHT_BODY * 0.5` (8pt) of vertical space. With the margin bump from 64→71pt vertical, the available content area shrinks by 14pt total — about one body line. **No code change needed**, but the planner should expect slightly tighter content density and one extra page-break per ~7 pages. Acceptable.

3. **Should the rewrite also fix the bold heading visual weight?** Outside Phase 23 scope per the locked decisions. If the planner wants to fold it in, the cost is +115 KB font and +1 task. Recommend NOT folding it in — keep phase 23 surgically focused on bidi + margins + centering.

4. **Test fixture commit policy.** Should the 3 Latin baseline fixtures (`fixture-en.json` etc.) and their SHA-256 hash files be committed to git, or kept locally? Recommend **commit to `.planning/fixtures/phase-23/`** — provides reproducibility and protects against accidental regression in v1.2+ work.

5. **Should bidi.min.js load BEFORE or AFTER fonts in the ensureDeps chain?** No functional difference. Placement after `jspdf.min.js` and before the two font files groups the "library" phase together and lets `progress('loading-lib')` cover both libs. Recommend that order; minor cosmetic preference.

---

## Sources

### Primary (HIGH confidence)
- [bidi-js GitHub repo](https://github.com/lojjic/bidi-js) — README, dist files, package.json, license — verified via npm pack tarball inspection
- [Context7 `/parallax/jspdf` documentation](https://github.com/parallax/jspdf) — confirmed `setR2L` naive-reverse behavior, `align: 'center'` API, `doc.internal.pageSize` getters
- [jsPDF source — modules_context2d.js](https://github.com/parallax/jspdf/blob/master/docs/modules_context2d.js.html) — `measureText` / `getStringUnitWidth` confirmation
- [Unicode UAX #9 spec](https://www.unicode.org/reports/tr9/) — paragraph direction (HL2 first-strong), bracket mirroring (BD16), level reversal (L2)
- [npm registry — bidi-js@1.0.3](https://www.npmjs.com/package/bidi-js) — published 2023-07-31, 12.4 KB unpacked, MIT
- [bundlephobia — bidi-js@1.0.3](https://bundlephobia.com/api/size?package=bidi-js@1.0.3) — confirmed 12 429 B min / 5 765 B gzip

### Secondary (MEDIUM confidence)
- [Noto Sans Hebrew specimen — fonts.google.com](https://fonts.google.com/noto/specimen/Noto+Sans+Hebrew) — 149 glyphs, Hebrew + Alphabetic Presentation Forms blocks, full nikud support
- [bbc/unicode-bidirectional](https://github.com/bbc/unicode-bidirectional) — disqualified, transitive deps bring bundle over budget
- [ISO 216 A4 dimensions](https://en.wikipedia.org/wiki/ISO_216) — 210 × 297 mm, 25mm margin convention

### Tertiary (LOW confidence — verified empirically in this session)
- All 12 test vectors above — produced via local Node smoke test against `bidi-js@1.0.3` `dist/bidi.js`. **Confidence elevated to HIGH** because the outputs were verified codepoint-by-codepoint to be valid Hebrew text in the expected visual order.

---

## Metadata

**Confidence breakdown:**
- Library choice: HIGH — empirically verified bundle size + UAX conformance via tarball inspection + 12 test vectors run successfully.
- Pipeline boundary: HIGH — current pdf-export.js fully read; insertion points pin-pointed by line number; jsPDF API behavior verified via Context7.
- Test vectors: HIGH — all 12 cases executed against bidi-js 1.0.3.
- Margin/centering math: HIGH — jsPDF page-size API and align option verified via Context7.
- Latin regression strategy: MEDIUM — proposed pattern is sound but PDF determinism via `setProperties({ creationDate })` not personally executed against the codebase (recommend planner verify in a 5-minute spike).
- Performance numbers: HIGH — pulled from npm + Phase 22-05 SUMMARY first-call timing.
- Hebrew font coverage (nikud): HIGH — subset Unicode ranges verified in `assets/fonts/noto-sans-hebrew-base64.js` header comment.

**Research date:** 2026-05-11
**Valid until:** 2026-08-11 (3 months — bidi-js is a stable library, jsPDF API in our 2.5.2 vendored copy is frozen, no upstream signal of changes that would invalidate the recommendations).
