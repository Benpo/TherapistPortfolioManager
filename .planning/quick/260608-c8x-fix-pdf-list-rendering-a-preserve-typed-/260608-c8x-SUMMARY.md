---
phase: quick-260608-c8x
plan: 01
subsystem: pdf-export
tags: [pdf, rtl, bidi, ordered-list, markdown, bug-fix, tdd]
requires: []
provides:
  - typed-ordinal-preservation-across-paragraph-separated-numbered-items
  - rtl-list-prefix-right-anchored-regardless-of-content-direction
affects:
  - assets/pdf-export.js (parseMarkdown list branch; list renderer block)
tech_stack_added: []
patterns_used:
  - tdd-red-green-cycle
  - split-row-bidi-anchor (Option 1 from plan)
  - typed-ordinal-on-parse-block
key_files_created:
  - tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js
key_files_modified:
  - assets/pdf-export.js
decisions:
  - "Bug A: parseMarkdown emits ordered-list items as { text, ordinal } objects carrying the TYPED ordinal -- so each per-block single-item list (created by paragraph-separated numbered runs) renders the user's actual number, not (li + 1)."
  - "Bug B: Option 1 split-row chosen over Option 2 base-direction hint. Reasoning: smaller diff surface, no signature change to drawSegmentedLine or shapeForJsPdfWithMap, and the test contract (anchor x of the digit) is satisfied by both approaches."
metrics:
  duration_minutes: 18
  completed_date: 2026-06-08
  total_tasks: 3
  commits: 2 # excludes orchestrator-owned docs commit
---

# Quick Task 260608-c8x: PDF List Rendering — Typed Ordinal + RTL Prefix Anchor

## One-liner

Preserve user-typed ordinal across paragraph-separated numbered list items and right-anchor the RTL list-item prefix regardless of item content direction in `assets/pdf-export.js`.

## What was broken

Two regressions surfaced after quick task 260522-iwr (which fixed "ordered-list ordinals disappear entirely"):

### Bug A — typed ordinal lost when items are paragraph-separated

User reported: typing
```
1. תוספתן

הסבר על האיבר הראשון.

2. עיוות פאציאלי

הסבר על האיבר השני.

3. חלל האף
```
into the session-export markdown editor produced a PDF where **all three items rendered as `1. תוספתן`**, `1. עיוות פאציאלי`, `1. חלל האף`. The third item ("חלל האף") was the visible failure: the user expected `3. חלל האף` and got `1. חלל האף`.

### Bug B — RTL list-prefix dragged to left margin when item content starts in English

In an RTL (Hebrew) document, an ordered-list item whose content starts with an LTR-strong character (e.g. `2. Latin term: appendix`) had its `2.` prefix appear at the **left margin** of the page, while sibling Hebrew-content rows in the same list had their prefix at the **right margin**. Visual inconsistency in the same list.

## Root cause

### Bug A
`parseMarkdown()` in `assets/pdf-export.js` (L540-L562 before fix) only groups **contiguous** list lines into one `{type:'list', items:[…]}` block. A blank line + paragraph between numbered items breaks the `while` loop, so each numbered item becomes its own single-item list block. The renderer then derived the prefix ordinal from `(li + 1)` -- where `li` is the **block-local** item index, always 0 -- producing `1.` for every block's sole item.

### Bug B
`drawSegmentedLine` (L761-L824) reconstructs prefix + content into one logical line and runs `shapeForJsPdfWithMap()` over the whole row. `firstStrongDir()` walks the line until the first strong-direction codepoint and returns that as the row's paragraph direction. For "2. Latin term: appendix" the first strong-direction char is the L in "Latin" -> row shapes as LTR. In an RTL doc the row is then drawn starting at `x = rightX - totalW`, which places the LTR-shaped digits + period at the **visual-LEFT** of the row (= LEFT margin of the page). The whole-row first-strong inference doesn't know that the prefix is structurally separate from the content.

## Fix

### Bug A — `parseMarkdown` carries the typed ordinal

The list branch now matches `/^\s*(\d+)\.\s+/` to capture the typed ordinal as an integer and pushes `{ text: stripped, ordinal: N }` for ordered-list items. Unordered-list items remain bare strings. The list renderer reads `item.ordinal` verbatim (with a defensive `li + 1` fallback that should not trigger post-fix). Single-item blocks created by paragraph-separated numbered runs each carry their own typed ordinal, so the rendered prefix reflects the user's actual numbering.

For contiguous numbered runs (the common case) the typed ordinals are already `1, 2, …, N`, so there is no visible behaviour change.

### Bug B — Option 1 (split-row) chosen

For ordered lists in RTL docs on the first wrapped sub-line (wi===0), the renderer now splits the row into TWO `drawSegmentedLine` calls:

1. **Prefix call**: text = `"N. "`, anchored at `PAGE_W - MARGIN_X` (right margin). Width measured via `doc.getStringUnitWidth(listPrefix) * BODY_SIZE`.
2. **Content call**: clipped content segments, anchored at `PAGE_W - MARGIN_X - prefixWidth`.

Each call shapes independently. The prefix's first-strong is LTR (digits only -- correct), and the content's first-strong reflects only the content. Result: prefix always anchored to the right margin, content always anchored just to its left, regardless of whether content starts with Hebrew or English.

**Why Option 1 over Option 2 (base-direction hint):**
- **Smaller surface area**: Option 1 touches only the list renderer block. Option 2 would require threading a `baseDir` parameter through `drawSegmentedLine` and `shapeForJsPdfWithMap`.
- **No signature change** to load-bearing primitives (`drawSegmentedLine`, `shapeForJsPdfWithMap`) -- those are used by paragraphs, headings, and footer too, so changes there have a wider blast radius.
- **No behavioural gain** from Option 2: the test contract is the anchor x of the digit, satisfied identically by both options.

LTR-doc path, unordered-list path, and `wi > 0` continuation-line path remain byte-identical (the unified-row branch preserves the exact prior anchor logic). Verified by `pdf-latin-regression`: 5/5 baseline SHA-256 hashes unchanged.

### Comments updated

The previous task's comment block in `parseMarkdown` (~L549-558) and the list renderer (~L982-989) explicitly documented the now-wrong decision ("typed ordinal is intentionally discarded -- renderer assigns sequential ordinals 1..N"). Both have been rewritten to reflect the new typed-ordinal contract and reference the quick-260608-c8x fix.

## Tests added

**`tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js`** -- 10 falsifiable runtime tests against actually-built PDFs.

Bug A tests (page-1 content-stream digit-glyph CID counting, fixture-vs-baseline diff):
- **A1**: digit "1" list-prefix count == 1 (NOT three "1."s for the three paragraph-separated items).
- **A2**: digit "2" list-prefix count ≥ 1 (item 2 keeps its `2.`).
- **A3**: digit "3" list-prefix count ≥ 1 (item 3 keeps its `3.` -- the exact reported symptom).
- **A4**: period "." list-prefix count == 3 (one per item).
- **A5**: hyphen list-prefix count == 0 (no bullets in an ordered list).

Bug B tests (jsPDF.prototype.text monkey-patch -- per-instance -- captures `(text, x, y)` per `doc.text()` call; effective digit x computed from char position in the visual text):
- **B1**: row-1 (Hebrew content) digit effective x ∈ [474, 529]. Sanity baseline.
- **B2**: row-2 (English-starting content) digit effective x ∈ [474, 529]. **Core Bug B test.**
- **B3**: row-2 digit effective x is NOT in [66, 121]. Negative guard against left-margin collapse.
- **B4**, **B4b**: LTR-doc regression guard -- row-1 and row-2 LTR-doc digit effective x ∈ [70, 121]. LTR path unchanged.

### RED state (before fix, current code)

```
[FAIL] Test A1 (Bug A, RTL): digit "1" list-prefix count is 3 (expected 1).
[FAIL] Test A2 (Bug A, RTL): digit "2" list-prefix count is 0 (expected >=1).
[FAIL] Test A3 (Bug A, RTL): digit "3" list-prefix count is 0 (expected >=1).
[PASS] Test A4 (period == 3)
[PASS] Test A5 (no hyphens)
[PASS] Test B1 (row-1 sanity)
[FAIL] Test B2 (Bug B core): row-2 digit effective x=412.24 (expected in [474, 529]).
[PASS] Test B3 (negative guard)
[PASS] Test B4 / B4b (LTR regression guard)

Passed 6/10, Failed 4/10.
```

### GREEN state (after fix)

```
[PASS] Test A1 (digit "1" count == 1)
[PASS] Test A2 (digit "2" count >= 1)
[PASS] Test A3 (digit "3" count >= 1)
[PASS] Test A4 (period == 3)
[PASS] Test A5 (no hyphens)
[PASS] Test B1 (row-1 sanity)
[PASS] Test B2 (row-2 right-anchored)
[PASS] Test B3 (negative guard)
[PASS] Test B4 / B4b (LTR regression guard)

Passed 10/10, Failed 0/10.
```

## Regression sweep — 5/5 PDF test suites pass

Cold-start sweep, post-fix:

| Suite | Passed | Failed | Notes |
|-------|--------|--------|-------|
| `tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js` (new) | 10/10 | 0/10 | Bug A + Bug B + LTR regression guard |
| `tests/quick-260522-iwr-ordered-list-export.test.js` | 10/10 | 0/10 | Previous ordered-list fix unchanged |
| `tests/pdf-bidi.test.js` | 12/12 | 0/12 | All 12 bidi test vectors |
| `tests/pdf-bold-rendering.test.js` | 9/9 | 0/9 | Bold rendering across EN/HE/mixed |
| `tests/pdf-latin-regression.test.js` | 5/5 | 0/5 | SHA-256 baseline hashes (EN/DE/CS/HE/HE-mixed) -- all match unchanged |

**Total: 46/46 PDF behavior tests pass.**

The `pdf-latin-regression` `fixture-he` baseline match confirms the unordered-list code path remains byte-identical -- the split-row branch is correctly scoped to `docDir === 'rtl' && wi === 0 && block.ordered`.

## Files touched

| File | Change |
|------|--------|
| `assets/pdf-export.js` | parseMarkdown list branch (~L539-575) emits `{ text, ordinal }` for ordered items; list renderer block (~L959-1050) reads `item.ordinal`, splits RTL ordered-list first-line into two drawSegmentedLine calls. LTR + unordered + wi>0 paths byte-identical. |
| `tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js` (new) | 10 behavior tests, jsdom + jsPDF + content-stream walker + doc.text() per-instance capture. |
| `assets/sw.js` | CACHE_NAME bumped v188→v189 by pre-commit hook on the GREEN commit (auto). |

## Commits

| Commit | Type | Subject |
|--------|------|---------|
| `938c890` | test | add failing tests for typed-ordinal preservation and RTL list-prefix anchor (RED gate) |
| `8ad2263` | fix | preserve typed ordinal across paragraph-separated items; right-anchor RTL list-item prefix (GREEN gate) |

The orchestrator owns the docs commit (this SUMMARY.md + STATE.md update).

## Deviations from Plan

None. Plan executed exactly as written. Option 1 (split-row) was the plan's recommendation and proved straightforward.

One minor implementation detail beyond what the plan spelled out: the unified-row else-branch in the renderer was carefully kept byte-identical to the pre-fix logic (same `wi === 0 ? PAGE_W - MARGIN_X : PAGE_W - MARGIN_X - 14` ternary). A first-pass attempt had simplified that branch to `rightX: PAGE_W - MARGIN_X - 14` for all wi values, which regressed `pdf-latin-regression fixture-he` (Hebrew unordered list first lines were indented 14pt inward instead of hugging the right margin). Caught by the regression sweep, fixed before commit.

## Threat surface scan

No new threat surface introduced. The fix is purely a rendering-correctness change to a local-only PDF builder; no new network endpoints, no auth changes, no schema changes, no file-system access. The split-row branch processes the same `block.items[li].text` content the unified-row branch did, with the same shaping primitives (`drawSegmentedLine`, `shapeForJsPdfWithMap`).

## Self-Check: PASSED

- File `tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js`: FOUND
- File `assets/pdf-export.js`: FOUND (modified)
- Commit `938c890` (test/RED): FOUND in `git log --oneline`
- Commit `8ad2263` (fix/GREEN): FOUND in `git log --oneline`
- All 5 PDF test suites: PASS (46/46 tests)
