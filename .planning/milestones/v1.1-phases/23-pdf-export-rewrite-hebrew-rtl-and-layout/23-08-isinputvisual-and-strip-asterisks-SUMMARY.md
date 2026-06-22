---
phase: 23
plan: 23-08
subsystem: pdf-export
type: hot-fix
tags: [bidi, jspdf, isInputVisual, markdown, regression-test, digit-order]
date: 2026-05-12
status: shipped
---

# Phase 23 Plan 23-08: isInputVisual + Strip Asterisks Summary

**One-liner:** Two visible bugs from the post-Heebo (23-07) build: digits inside RTL paragraphs displayed reversed ("24" → "42", "2026" → "6202") because jsPDF's internal `__bidiEngine__` re-processed our pre-shaped visual strings; and inline markdown `**bold**` markers displayed literally because `parseMarkdown` only handled block-level syntax. Fixed by adding `{ isInputVisual: false }` to every `doc.text()` call (11 sites) and a `stripInlineMarkdown()` helper run on paragraph + list-item text. Bold styling is intentionally NOT rendered — deferred to a future phase.

## Bug 1: Reversed digits in RTL paragraphs

### Symptom (reported by Ben)

In the post-23-07 PDF for a Hebrew session, the body line:

> "הפגישה התקיימה ב-24 במרץ 2026"

displayed as `... ב-42 ץרמב 6202` — the digits "24" and "2026" were reversed in place. Pure-Latin lines and pure-Hebrew lines (no digits) rendered correctly. Only digit runs inside RTL paragraphs were affected.

### Root cause

jsPDF 2.5.2 has an internal `__bidiEngine__` that re-processes any string containing RTL chars before drawing. The default options object treats input as logical (`isInputVisual:true` semantically — the engine assumes "I need to convert this from logical to visual order"), so:

1. `shapeForJsPdf()` (Plan 23-02) ran UAX-L2 over the logical input → produced visual order
2. `doc.text(visualString, ...)` was called with the visual string
3. jsPDF's `__bidiEngine__` saw RTL chars and applied UAX-L2 **again** → digits flipped a second time

UAX-L2 applied twice is identity for letter runs (Hebrew chars stayed in correct visual positions because the engine produced the same output as our pre-shape) but **inverts** digit runs because digits are weak L (left-to-right) inside R (right-to-left) paragraphs — they get reordered as a unit, and applying that reordering twice swaps the LSB and MSB of each digit-group around their pivot.

### Fix

Pass `{ isInputVisual: false }` to every `doc.text()` call. This option tells jsPDF "the string you're about to draw is already in visual order — do NOT re-shape it." The bidi engine bypasses its UAX-L2 pass and our pre-shaped output flows through unchanged.

The option was empirically verified before applying:

| Configuration | Page output for input "24 במרץ 2026" |
|---|---|
| VISUAL + default (isInputVisual:true) | `6202 ץרמב 42` ❌ digits reversed |
| **VISUAL + isInputVisual:false** | `2026 ץרמב 24` ✅ correct |

### Call sites updated

11 `doc.text()` invocations in `assets/pdf-export.js`:

| Line | Function | Anchor |
|---|---|---|
| 499 | drawTextLine (RTL branch) | right margin, align:'right' |
| 501 | drawTextLine (LTR branch) | left margin |
| 517 | drawPage1Header (title) | center, align:'center' |
| 534 | drawPage1Header (meta) | center, align:'center' |
| 553 | drawRunningHeader (RTL branch) | right margin, align:'right' |
| 555 | drawRunningHeader (LTR branch) | left margin |
| 613 | list item RTL, first wrap | right margin, align:'right' |
| 616 | list item RTL, continuation | rtlX-14, align:'right' |
| 621 | list item LTR, first wrap | left margin |
| 624 | list item LTR, continuation | MARGIN_X+14 |
| 659 | footer "Page X of Y" | center, align:'center' |

The option is added to LTR-only call sites too (e.g., the footer Latin text and pure-Latin body lines) for consistency. It is a no-op when input contains no RTL chars — jsPDF's bidi engine only fires when it detects RTL — so the addition is safe defensively.

A 7-line explainer comment now lives at the top of `buildSessionPDF()`'s helpers section (around line 460) explaining the failure mode and the empirical evidence.

## Bug 2: Inline markdown markers display literally

### Symptom (reported by Ben)

A session whose body contained `**לקוח:** בן פורת` rendered the asterisks verbatim in the PDF: `**לקוח:** בן פורת` instead of the intended bold-then-plain styling.

### Root cause

`parseMarkdown()` in `assets/pdf-export.js` (lines 294-360) is a minimal block-level parser. It handles:
- Headings (`#`, `##`, `###`)
- Lists (`-`, `*`, `1.`)
- Paragraphs (collected runs of non-blank, non-heading, non-list lines)
- Blank lines (paragraph breaks)

It does **not** parse any inline syntax — `**bold**`, `*italic*`, `` `code` ``, `[links](url)`. Anything between line-prefix matchers gets handed to `doc.text()` verbatim. The on-screen preview uses `md-render.js` (Plan 22-03) which IS markdown-aware, so the bug was invisible until users saw the printed PDF.

### Fix

Added a `stripInlineMarkdown(text)` helper (defined just above `parseMarkdown`):

```javascript
function stripInlineMarkdown(text) {
  return text
    .replace(/\*\*([^*\n]+?)\*\*/g, '$1')                // **X** -> X
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1$2');   // *X* -> X (avoid matching ** runs)
}
```

Applied at two sites in `parseMarkdown`:
- Paragraph text: `blocks.push({ type: 'para', text: stripInlineMarkdown(paraLines.join(" ")) });`
- List item text: `items.push(stripInlineMarkdown(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, "")));`

NOT applied to heading text — headings rarely contain inline markers in practice and the existing `^(#{1,3})\s+(.+?)\s*$` capture group would need lookahead trickery to avoid capturing the asterisks as part of the heading text. Acceptable edge case.

### Inline tests (run during executor verification)

| Input | Expected output | Result |
|---|---|---|
| `**לקוח:** בן פורת` | `לקוח: בן פורת` | ✅ |
| `**bold** plain` | `bold plain` | ✅ |
| `plain *italic* plain` | `plain italic plain` | ✅ |
| `**a** plain *b* plain` | `a plain b plain` | ✅ |
| `no markers here` | `no markers here` | ✅ |
| `mixed **bold** and *italic*` | `mixed bold and italic` | ✅ |

6/6 cases pass.

### Bold styling: intentionally deferred

This fix produces clean output with no literal asterisks but loses the bold/italic emphasis the markup was meant to convey. Rendering true bold requires three things this hot-fix scope doesn't include:

1. **Heebo Bold** vendored as a separate base64 asset (~60 KB more — same order as Heebo Regular)
2. **Inline-aware parser** that splits text into segments tagged regular/bold/italic
3. **Per-segment font switching** with bidi-aware positioning (each segment needs its own `setFont` + `doc.text` call, with x-coordinates computed from the running width of preceding segments — non-trivial in RTL where segments flow right-to-left)

This is an open question for the user. Two paths forward:
- **Path A (simple):** Vendor Heebo Bold; render the body with two passes — one in regular for plain segments, one in bold for `**` segments. Visually plain text would not move; bold segments would be slightly heavier. Position math is straightforward in LTR; needs careful right-edge alignment in RTL.
- **Path B (defer indefinitely):** Stripping is "good enough" — therapists writing markdown for therapy notes are unlikely to use bold for visual emphasis often, and the asterisks are no longer ugly. Keep the parser block-level and dispatch any future inline needs as separate one-off plans.

## Files modified

| File | Change |
|---|---|
| `assets/pdf-export.js` | Added `isInputVisual: false` to 11 `doc.text()` call sites; added `stripInlineMarkdown` helper; wired strip into paragraph + list parsers; +1 explainer comment block |
| `.planning/fixtures/phase-23/fixture-he.pdf.sha256` | Regenerated (only Hebrew fixture drifted — see below) |
| `tests/pdf-digit-order.test.js` | NEW — digit-order regression test |
| `sw.js` | Auto-bumped CACHE_NAME via pre-commit hook (v89 → v91) |

## Fixture-baseline drift analysis

Of the 4 fixture .sha256 files:

| Fixture | Pre-fix hash | Post-fix hash | Drift? |
|---|---|---|---|
| fixture-en | `8e95025475d624af...` | `8e95025475d624af...` | ❌ no |
| fixture-de | `48414c642e1f6e56...` | `48414c642e1f6e56...` | ❌ no |
| fixture-cs | `10fff21962989608...` | `10fff21962989608...` | ❌ no |
| fixture-he | `67110f3db9e4b6e3...` | **`dc7435916b6e8d22...`** | ✅ DRIFT |

**Why only fixture-he drifts:** none of the 4 fixtures contain `**` markdown markers (Task 2 is a no-op for all of them), and the 3 Latin fixtures contain no RTL chars — so jsPDF's `__bidiEngine__` never activates and `isInputVisual:false` is a no-op for them. Only fixture-he has Hebrew text where the bidi engine would have fired, so it's the only fixture whose bytes change.

This is also a useful sanity signal: if a future change to `pdf-export.js` causes Latin fixtures to drift, the change probably touched something it shouldn't have.

## New regression test: tests/pdf-digit-order.test.js

The Plan 23-04 SHA-256 harness DID drift on this bug (fixture-he hash changed) but a hash-only diff doesn't tell you WHICH bytes moved or WHY. Without a glyph-level assertion, the only way to validate the fix was to read the PDF visually — exactly what let the bug ship in 23-07.

The new test:
1. Builds a PDF for `'הפגישה התקיימה ב-24 במרץ 2026 במשרד הקליניקה.'`
2. Walks the page-1 content stream, extracts every digit GID run (Heebo digit GIDs: 0=0138, 1=0139, 2=013A, 3=013B, 4=013C, 5=013D, 6=013E, 7=013F, 8=0140, 9=0141)
3. Asserts:
   - `"2026"` MUST appear in the digit-run list (correct LTR order)
   - `"6202"` MUST NOT appear (would indicate the bug is back)
   - `"24"` MUST appear (correct LTR order)
   - `"42"` MUST NOT appear (would indicate the bug is back)

### Empirical proof the test catches the original bug

Verified by temporarily reverting the Task 1 fix via `sed -i 's/, isInputVisual: false//g; s/{ isInputVisual: false }//g' assets/pdf-export.js` and re-running:

| State | Test result | Exit code |
|---|---|---|
| Fix in place (post-Task-1) | 4/4 PASS | 0 |
| Fix reverted (pre-23-08) | 2/4 FAIL — `"6202"` and `"42"` detected in stream | 1 |

The "6202 anti-check" and "42 anti-check" assertions both fire with descriptive error messages pointing to the missing `isInputVisual:false` option. The test correctly catches the regression.

## Test suite final state

| Test | Result |
|---|---|
| `tests/pdf-bidi.test.js` (12-vector corpus) | 12/12 PASS |
| `tests/pdf-latin-regression.test.js` (4 fixtures) | 4/4 PASS |
| `tests/pdf-glyph-coverage.test.js` (mixed-script floor) | 3/3 PASS |
| `tests/pdf-digit-order.test.js` (NEW — digit order) | 4/4 PASS |

## Phase 23 invariants preserved

| Invariant | Baseline | Post-23-08 | Status |
|---|---|---|---|
| `setR2L` calls | 0 (removed in 23-02) | 0 | ✅ |
| `shapeForJsPdf` references | ≥ 7 | 16 | ✅ |
| `align: 'right'` | ≥ 4 | 5 | ✅ |
| `align: 'center'` | ≥ 3 | 3 | ✅ |
| MARGIN constants @ 71pt | 3 | 3 | ✅ |
| `Heebo` references | ≥ 4 | 18 | ✅ |
| `isInputVisual: false` | — (new) | 11 | ✅ (one per `doc.text()` call site) |
| `stripInlineMarkdown` definition | — (new) | 1 | ✅ |

## Commits

| Hash | Type | Subject |
|---|---|---|
| `958806f` | fix | add isInputVisual:false to all doc.text calls |
| `19bfe14` | fix | strip inline markdown ** and * markers from paragraph text |
| `9963b4d` | chore | regenerate fixture-he baseline |
| `bff45b4` | test | add digit-order regression |

## Cache version

CACHE_NAME bumped twice by the pre-commit hook (once per asset-changing commit): `sessions-garden-v89` → `sessions-garden-v91`. Within the predicted v92-v93 envelope.

## Open question for user (deferred)

**Bold rendering for inline `**X**` markup.** Current behavior strips the markers and renders the content as plain text. To render true bold:
- Vendor Heebo Bold (~60 KB additional asset)
- Add inline-aware tokenization to `parseMarkdown`
- Implement per-segment font switching with running-x positioning, including RTL-aware right-edge anchoring

Recommended path-forward decision before implementing:
- **Path A:** Vendor Heebo Bold and implement segment-level rendering — high effort but matches user expectations of markdown-formatted notes.
- **Path B:** Keep the strip-only behavior — sufficient for current usage; users can use ALL CAPS or other typographic emphasis.

User input requested before scoping a 23-09 plan for this.

## Self-Check: PASSED

**Files verified:**
- `assets/pdf-export.js` — modified, syntax OK, 11 `isInputVisual: false` instances ✓
- `.planning/fixtures/phase-23/fixture-he.pdf.sha256` — modified, new hash `dc7435916b6e8d22...` ✓
- `tests/pdf-digit-order.test.js` — created, 4/4 PASS ✓

**Commits verified in git log:**
- `958806f` — fix(23-08): isInputVisual:false ✓
- `19bfe14` — fix(23-08): strip ** ✓
- `9963b4d` — chore(23-08): regen fixture-he ✓
- `bff45b4` — test(23-08): digit-order regression ✓
