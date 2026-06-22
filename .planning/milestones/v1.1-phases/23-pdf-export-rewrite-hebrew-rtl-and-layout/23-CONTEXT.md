---
phase: 23
title: PDF export rewrite — Hebrew RTL bidi + page layout
created: 2026-05-11
source: UAT round-3 findings (2026-05-07) — gap N10 + Hebrew PDF blocker from 22-HUMAN-UAT.md
parent_milestone: v1.1 Final Polish & Launch
discuss_phase_skipped: true
discuss_phase_skipped_reason: Production-blocker bugs, scope tight, decisions captured inline with user 2026-05-11. Research-first phase.
---

# Phase 23 Context

## Scope — 2 PDF blockers

Phase 23 is the destination Ben has been working toward across the round-3 trickle. Both bugs sit inside `assets/pdf-export.js` and the jsPDF integration layer.

### Blocker 1 — Hebrew RTL text loss in PDF (production-blocker)

**Symptom:** When a session contains Hebrew content (therapist notes, client names, section headings translated to Hebrew, or any bidirectional run with embedded Latin/digits), the generated PDF shows Hebrew characters in scrambled order. Specifically:
- Pure Hebrew lines: characters reversed left-to-right when they should read right-to-left
- Bidirectional runs (Hebrew sentence with embedded "PDF" or a date "2026-05-11"): the Latin/digit segment lands in the wrong position, breaking the line's reading order entirely

**Root cause:** `assets/pdf-export.js` calls `doc.text(text, x, y)` with strings in **logical** Unicode order. jsPDF is a **visual**-order PDF writer — it lays out glyphs left-to-right at the given baseline, in the order the bytes appear in the string. PDF format itself stores text positionally; there is no bidi reordering at render time.

The current `isRtl(text)` function (pdf-export.js:196) only flips the **anchor X coordinate** to the right margin so the line ends at the right edge — but it does NOT reorder characters within the line. That's why Hebrew letters come out reversed.

**Fix direction (to be confirmed by research):** Pre-shape each logical-order string through a Unicode Bidirectional Algorithm (UAX #9) implementation before passing to `doc.text()`. This yields the visual-order string jsPDF needs. Candidate libraries: `bidi-js` (~12KB, MIT, browser-friendly), `unicode-bidirectional`, or a lean inline implementation if the codepoint surface is small enough.

### Blocker 2 — PDF edge trim + not centered (gap N10, blocker)

**Symptom:** When the PDF is printed (or viewed in a PDF reader's print preview), content sits too close to the physical paper edge — printers with default margins trim text at top/bottom/sides. Additionally the title block and the body content don't visually center on the sheet; the content block is slightly off, making the page feel unprofessional.

**Root cause:** Current margins in `pdf-export.js` (lines 333–337):
- `PAGE_W = 595` (A4 portrait width in pt)
- `MARGIN_X = 56` (≈19.8mm — below the standard 25mm)
- `MARGIN_TOP = 64` (≈22.6mm)
- `MARGIN_BOTTOM = 64`

The 56pt horizontal margin is below standard printer safe-zones. Many home printers reserve ~25mm (~71pt) of unprintable area. Content at 56pt from the edge ends up clipped by the printer's mechanical margin.

For centering: the title-block X coordinate (`titleX = isRtl(clientName) ? (PAGE_W - MARGIN_X) : MARGIN_X`) anchors the title to the left/right margin, never centers it. Page footer "Page X of Y" is centered (line 508 — `fx = (PAGE_W - approxWidth) / 2`) but the rest of the layout isn't reviewed for visual centering.

**Fix direction (locked):** Bump `MARGIN_X` and the top/bottom margins to standard A4-safe-zone values (≈25mm = ~71pt). Recompute USABLE_W and any downstream `x` anchor calculations. Centering audit on the title block and any standalone meta lines (date, therapist name, etc.).

---

## Decisions (resolved with user, 2026-05-11)

### Decision 1 — Bidi reordering: pre-shape via library, not custom
**Choice:** Use an existing UAX #9 bidi library, vendored locally per the same lazy-load pattern as jsPDF + the base64 fonts. Do NOT write a custom bidi implementation.
**Rationale:** UAX #9 is hairy — explicit directional formatting characters, weak/neutral resolution, mirroring of paired brackets, neutral resolution between strong runs. A pure-JS library that's already passed the Unicode test suite is the only reliable path. Custom = a year of subtle bugs.
**Constraint:** Library must be <30KB minified, MIT/BSD/Apache licensed, no Node-only dependencies (must work in browser). Researcher to surface candidates.

### Decision 2 — Bidi base direction: paragraph-level, derived from first strong char
**Choice:** Each paragraph passed to `doc.text()` gets its base direction (LTR or RTL) determined by its first strong directional character (Unicode HL2 — "First Strong"). Hebrew-first paragraph → RTL base; English-first paragraph → LTR base.
**Rationale:** Matches HTML/CSS `dir="auto"` behavior, which is what the existing app UI already uses. Therapists writing mixed-language notes don't need to think about it.

### Decision 3 — Page margins: bump to A4-safe-zone standard
**Choice:** `MARGIN_X` from 56pt → **71pt** (~25mm). `MARGIN_TOP` and `MARGIN_BOTTOM` from 64pt → **71pt**. Symmetric margins on all four sides.
**Rationale:** 25mm is the industry-standard A4 safe zone — works on every consumer/office printer without manual margin adjustment.

### Decision 4 — Title block centering
**Choice:** Center the **client name + session date** title block horizontally on the page. The rest of the body (section headings, body text, lists) stays left/right-anchored per the current `isRtl()` logic.
**Rationale:** A centered title is the natural document affordance for a client-facing report. Body content stays anchored for natural reading.

### Decision 5 — Backward compatibility & migration
**Choice:** No data migration needed — PDF generation is stateless. Existing exported PDFs are unaffected (they're already in the wild). New exports use the rewritten engine.
**Rationale:** PDFs are write-once artifacts; old ones can stay as-is.

---

## Non-goals (explicitly NOT in Phase 23)

- Markdown→PDF feature parity beyond what 22-05 already shipped (no new table support, no image embedding, no syntax highlighting).
- Arabic, Persian, or other RTL scripts beyond Hebrew. The bidi library will support them generally, but UAT scope is Hebrew-only.
- Font subset reduction. Noto Sans + Noto Sans Hebrew base64 stay as 22-01 vendored them.
- The mailto / "send to myself" backup email rework — that's plan 22-16, after Phase 23.
- Mobile-specific PDF rendering quirks. The engine is browser-side; mobile testing is parked.

---

## Acceptance criteria (UAT truths — must be TRUE after phase 23 ships)

1. **A session with pure Hebrew content** exports a PDF where every Hebrew line reads right-to-left in correct character order.
2. **A session mixing Hebrew + English/digits** (e.g., a note "המפגש ביום 2026-05-11 היה טוב") exports a PDF where the bidirectional segments land in correct positions — the date appears in its natural place inside the Hebrew sentence, reading order preserved.
3. **A session in EN/DE/CS only** exports a PDF byte-identical (or trivially-different) to the pre-phase-23 output — no regression on Latin-only paths.
4. **The printed PDF has ~25mm visible margins** on all four edges — no content clipped on a standard home printer.
5. **The title block (client name + session date)** is horizontally centered on page 1.
6. **The "Page X of Y" footer** stays centered (no regression from current behavior).

---

## References

- `assets/pdf-export.js` — the entire module is in scope; key functions: `buildSessionPDF()` (line 309), `isRtl()` (line 196), `parseMarkdown()` (line 216), `registerFonts()` (line 174), the page layout block (lines 333–510)
- `assets/jspdf.min.js` — vendored jsPDF (do not modify; reuse only)
- `assets/fonts/noto-sans-hebrew-base64.js` — Hebrew font (already registered via `registerFonts()`)
- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-05-pdf-export-module-PLAN.md` — original PDF module plan (the engine 23 rewrites)
- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-05-pdf-export-module-SUMMARY.md` — what 22-05 actually shipped
- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-HUMAN-UAT.md` — gap N10 source (line 402 area) + the Hebrew PDF blocker discussion in the round-3 findings
- Unicode UAX #9 — Unicode Bidirectional Algorithm (the spec the library implements)

---

## Risk

**Medium.** Larger surface than the trickle batches, but well-scoped.

- **Bidi correctness:** The library has to handle paragraph-level direction inference + correct neutral resolution + bracket mirroring + embedded LTR-inside-RTL runs. Researcher must validate the chosen library against a battery of test strings (pure Hebrew, Hebrew + Latin word, Hebrew + digits, Hebrew + parentheses, Hebrew + URL).
- **Font kerning / shaping:** Hebrew doesn't require Arabic-style contextual shaping, but the bidi-reordered string must still feed correctly into jsPDF's text-measurement (`doc.getTextWidth()`) for word-wrap and pagination logic. The wrap function may need its own bidi pass.
- **Markdown parsing:** `parseMarkdown()` (line 216) operates on logical strings before they reach `doc.text()`. The bidi pre-shape must happen AFTER markdown parsing — at the line-write boundary, not earlier — otherwise heading markers like `#` will be visually mispositioned.
- **Regression on Latin-only paths:** The whole engine is being modified. EN/DE/CS sessions must produce byte-similar PDFs as a smoke test before Phase 23 ships. A reference PDF for a known session should be checked in (or regenerated and visually compared).
- **Library size:** Adding 12–30KB to the lazy-loaded bundle is acceptable (jsPDF alone is 350KB+), but if the only options are 100KB+ a custom solution may be needed despite the rationale above. Surface this if it comes up in research.

Manual UAT confirmation required from Ben (and Sapir for Hebrew rendering correctness) on all 6 acceptance criteria before flipping the round-3 PDF blocker rows in `22-HUMAN-UAT.md` to `closed-fixed`.
