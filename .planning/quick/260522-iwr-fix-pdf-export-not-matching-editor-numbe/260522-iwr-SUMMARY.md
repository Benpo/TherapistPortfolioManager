---
phase: quick-260522-iwr
plan: 01
subsystem: pdf-export
tags: [bugfix, pdf, markdown, ordered-list, tdd]
requires: []
provides:
  - "Ordered-list-aware PDF export pipeline (block.ordered + sequential ordinal rendering)"
affects:
  - assets/pdf-export.js
tech-stack:
  added: []
  patterns:
    - "Baseline-diff glyph counting in PDF behavior tests — cancels header/footer chrome glyphs by diffing a fixture against a same-chrome paragraph baseline"
key-files:
  created:
    - tests/quick-260522-iwr-ordered-list-export.test.js
  modified:
    - assets/pdf-export.js
    - sw.js
decisions:
  - "Ordered-list ordinals are assigned 1..N from item index, NOT from the user's typed number — guarantees sequential, unbroken numbering even on mistypes (editor-1:1 for a clean numbered list)"
  - "ordered/unordered is decided by the FIRST list line; a marker-style switch mid-run does not split the list (preserves pre-existing contiguity behavior)"
metrics:
  duration: ~15min
  completed: 2026-05-22
  tasks: 2
  files: 3
---

# Quick Task 260522-iwr: Fix PDF Export Not Matching Editor Numbered Lists Summary

Numbered/ordered lists typed in the session export editor now keep their ordinals
(1. 2. 3. ...) in the exported PDF — `parseMarkdown` emits a `block.ordered` flag and
the list renderer prepends sequential ordinals for ordered lists while keeping bullets
for unordered lists.

## What Was Done

### Task 1 — Falsifiable behavior test (RED gate)

Created `tests/quick-260522-iwr-ordered-list-export.test.js`. It builds real PDFs via
`PDFExport.buildSessionPDF` and walks the page-1 content stream counting drawn glyph
CIDs, reusing the jsdom env-load + WrappedJsPDF date/file-id pinning + content-stream
walker verbatim from `tests/pdf-bold-rendering.test.js`.

Two test-design problems were solved during authoring:

1. **Runtime GID measurement** — instead of hard-coding Heebo GIDs for digits/period/
   hyphen, the test renders five isolated single-glyph probe documents (each body is
   the target glyph repeated 8x) and picks the largest-delta CID vs a header-only
   control. Robust if Heebo is re-vendored.
2. **Chrome-glyph contamination** — the page-1 meta line (`2026-05-08` date) and the
   footer page number draw digit and hyphen glyphs unrelated to the list body. Raw CID
   counting gave false positives. Fixed with **baseline-diff counting**: each list
   fixture is compared against a baseline document with the same header/footer and the
   same item *texts* rendered as plain paragraphs, so `count(fixture) - count(baseline)`
   isolates exactly the list-prefix glyphs. Item texts deliberately contain no digits
   or hyphens.

### Task 2 — Ordered-list support in the PDF pipeline

Two minimal changes in `assets/pdf-export.js`:

1. `parseMarkdown` (~line 540): detects ordered (`/^\s*\d+\.\s+/`) vs unordered from
   the first list line and emits `block.ordered` on the list block. Marker stripping
   and list contiguity unchanged.
2. List renderer (~line 968): the `wi===0` prefix segment is now `(li + 1) + '. '` for
   ordered lists and `'- '` for unordered lists. Prefix stays a regular-weight segment
   so the LTR digit run shapes correctly inside RTL Hebrew lines. The 14pt continuation
   indent and leftX/rightX anchoring were untouched.

## RED Gate (captured pre-fix output)

`node tests/quick-260522-iwr-ordered-list-export.test.js` against unfixed code — exit code **1**:

```
[FAIL] Test 1 (ordered EN): ordinal digit "1" rendered (first item keeps its number): digit "1" list-prefix count is 0 (fixture-minus-baseline); expected >=1. The first ordered-list item lost its "1." ordinal -- it renders as a bullet.
[FAIL] Test 1 (ordered EN): ordinal digit "2" rendered: digit "2" list-prefix count is 0 (fixture-minus-baseline); expected >=1. Item 2 lost its "2." ordinal.
[FAIL] Test 1 (ordered EN): ordinal digit "3" rendered (post-item-2 numbering intact): digit "3" list-prefix count is 0 (fixture-minus-baseline); expected >=1. Item 3 lost its "3." ordinal -- post-item-2 numbering broken.
[FAIL] Test 1 (ordered EN): NO hyphen bullet prefix drawn: hyphen list-prefix count is 3 (fixture-minus-baseline); expected 0. An ordered list must not render "- " bullet prefixes.
[PASS] Test 2 (unordered regression): hyphen bullet prefix on each item
[PASS] Test 2 (unordered regression): NO digit ordinals drawn
[FAIL] Test 3 (Hebrew ordered): item 1 keeps "1." ordinal (LTR digit survives RTL shaping): digit "1" list-prefix count is 0 (fixture-minus-baseline); expected >=1. First Hebrew ordered-list item renders as a bullet, not "1.".
[FAIL] Test 3 (Hebrew ordered): item 2 keeps "2." ordinal: digit "2" list-prefix count is 0 (fixture-minus-baseline); expected >=1.
[FAIL] Test 3 (Hebrew ordered): item 3 (post-item-2) keeps "3." ordinal: digit "3" list-prefix count is 0 (fixture-minus-baseline); expected >=1. Items after item 2 lose their numbers -- the exact reported symptom.
[FAIL] Test 3 (Hebrew ordered): NO hyphen bullet prefix drawn: hyphen list-prefix count is 3 (fixture-minus-baseline); expected 0. Hebrew ordered list must not render "- " bullet prefixes.

Passed 2/10, Failed 8/10.
```

Tests 1 and 3 failed (ordinals absent, hyphen bullets drawn). Test 2 passed — proving
no unordered-list regression in the test itself. RED gate confirmed.

## GREEN Gate (captured post-fix output)

`node tests/quick-260522-iwr-ordered-list-export.test.js` after the fix — exit code **0**:

```
[PASS] Test 1 (ordered EN): ordinal digit "1" rendered (first item keeps its number)
[PASS] Test 1 (ordered EN): ordinal digit "2" rendered
[PASS] Test 1 (ordered EN): ordinal digit "3" rendered (post-item-2 numbering intact)
[PASS] Test 1 (ordered EN): NO hyphen bullet prefix drawn
[PASS] Test 2 (unordered regression): hyphen bullet prefix on each item
[PASS] Test 2 (unordered regression): NO digit ordinals drawn
[PASS] Test 3 (Hebrew ordered): item 1 keeps "1." ordinal (LTR digit survives RTL shaping)
[PASS] Test 3 (Hebrew ordered): item 2 keeps "2." ordinal
[PASS] Test 3 (Hebrew ordered): item 3 (post-item-2) keeps "3." ordinal
[PASS] Test 3 (Hebrew ordered): NO hyphen bullet prefix drawn

Passed 10/10, Failed 0/10.
```

## Regression Suite

| Test | Result |
|------|--------|
| `tests/pdf-bold-rendering.test.js` | Passed 9/9 |
| `tests/pdf-bidi.test.js` | Passed 12/12 |
| `tests/pdf-latin-regression.test.js` | Passed 5/5 |

No regression in existing PDF export behavior.

## Deviations from Plan

None — plan executed exactly as written. The test-authoring problems (runtime GID
measurement, chrome-glyph contamination) were solved within the test file itself; the
plan's `<behavior>` already called for runtime GID measurement, and the baseline-diff
technique is a refinement of that same approach. `assets/pdf-export.js` was untouched
during Task 1 as required.

## Notes

- `sw.js` was bumped from `sessions-garden-v187` to `sessions-garden-v188` by the
  pre-commit hook (a cached asset, `pdf-export.js`, changed). This is expected
  behavior and is included in the Task 2 commit.
- jsdom was installed into `/tmp/node_modules` (the harness default `JSDOM_PATH`)
  to run the PDF behavior tests — it was absent at task start.

## Commits

- `70c7cf9` — test(quick-260522-iwr): add failing behavior test for ordered-list PDF export
- `c52eb09` — fix(quick-260522-iwr): render ordered-list ordinals in PDF export

## TDD Gate Compliance

RED gate (`test(...)` commit `70c7cf9`) precedes GREEN gate (`fix(...)` commit
`c52eb09`). The test failed against unfixed code (exit 1, 8/10 failing) and passes
after the fix (exit 0, 10/10). Gate sequence satisfied.

## Self-Check: PASSED

- `tests/quick-260522-iwr-ordered-list-export.test.js` — FOUND
- `assets/pdf-export.js` — FOUND (modified)
- Commit `70c7cf9` — FOUND
- Commit `c52eb09` — FOUND
