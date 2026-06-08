---
phase: 260608-cx5
plan: 01
subsystem: pdf-export / list-renderer
tags: [pdf, rtl, bidi, ordered-list, regression-fix, tdd]
dependency_graph:
  requires:
    - quick task 260608-c8x (split-row branch this plan gates)
    - quick task 260522-iwr (ordered-list ordinal preservation in parseMarkdown)
  provides:
    - content-direction-gated split-row branch in pdf-export.js list renderer
    - regression test guarding RTL Hebrew-content unified-row path + c8x English-content split-row path + LTR doc anchor
  affects:
    - assets/pdf-export.js (one condition + comment refresh)
    - tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js (new)
tech_stack:
  added: []
  patterns:
    - "first-strong-direction content gating (UAX #9 paragraph-direction inference)"
    - "doc.text() per-instance monkey-patch capture for structural PDF behavior assertions"
key_files:
  created:
    - tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js
  modified:
    - assets/pdf-export.js
    - sw.js (auto-bumped by pre-commit hook: v189 -> v190)
decisions:
  - "Gate condition uses firstStrongDir(listStripped) === 'ltr' (the c8x split-row path) -- not firstStrongDir(listStripped) !== 'rtl'. The two are equivalent today because firstStrongDir defaults to 'ltr' for empty/no-strong input, but using the positive form keeps the intent explicit: 'only fire the LTR-correction path when the content is actually LTR'."
  - "Gate content argument is listStripped (the inline-bold-stripped item text), not the raw itemText. listStripped is the user-visible text UAX #9 would inspect for paragraph-direction inference."
  - "Single-condition addition (no helper extraction, no signature changes). Minimal surface preserves byte-stability for every code path that was already working."
metrics:
  duration: 8min
  completed: 2026-06-08
---

# Quick Task 260608-cx5: Fix PDF Ordered-List RTL Regression Summary

Restored RTL Hebrew-content unified-row rendering in the PDF list renderer by gating the c8x split-row branch on the content's first-strong direction, eliminating the visual mis-arrangement reported by the user without disturbing the c8x English-content fix or the LTR-doc path.

## What

- **Diagnosis:** Quick task 260608-c8x (Bug B) added a split-row branch to `assets/pdf-export.js` for RTL + ordered + `wi === 0` rows. The branch fired *unconditionally* — including for Hebrew-content rows that the previous unified-row path was rendering correctly. The unified row let UAX #9 shape the whole row (prefix + content) as one RTL paragraph; splitting it shaped prefix and content as two independent paragraphs whose outputs do not compose like a single bidi paragraph. The user reported the digit + period mis-arranged relative to Hebrew content in numbered Hebrew lists.
- **Fix:** Added one condition to the existing gate: `&& firstStrongDir(listStripped) === 'ltr'`. The split-row branch now fires only when the content is LTR (the original c8x Bug B case — English content in an RTL doc). RTL-content rows (Hebrew) and no-strong-content rows route through the unchanged unified-row else branch.
- **Comment refresh:** Extended the comment block above the gate (lines ~1015-1066) with a cx5 paragraph explaining the gate, the regression it fixes, and how it preserves the c8x Bug B path.

## Files

- **Created:** `tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js` (4 scenarios, 11 sub-assertions)
- **Modified:** `assets/pdf-export.js` (one condition + comment-block extension)
- **Auto-modified by pre-commit hook:** `sw.js` (CACHE_NAME bump v189 → v190, expected behavior per `reference-pre-commit-sw-bump.md`)

## Commits

| Order | Hash | Type | Message |
| ----- | ---- | ---- | ------- |
| 1 (RED)   | `6bd67e1` | test | `test(quick-260608-cx5): add failing regression test for RTL ordered-list Hebrew-content unified-row path` |
| 2 (GREEN) | `31974dc` | fix  | `fix(quick-260608-cx5): gate split-row RTL list-prefix branch on content first-strong direction` |

## TDD Gate Compliance

### RED — committed test fails against unfixed code

Run output (test against unfixed `assets/pdf-export.js`, after Task 1 commit, before Task 2):

```
Passed 3/11, Failed 8/11.

[FAIL] Test CX5-1a (RTL, Hebrew content): NO short prefix-only call at the row y (unified-row path):
  Found a short prefix-only call at row y=115.00 (text="1. ", x=512.18).
  The split-row branch is firing for a Hebrew-content row -- the cx5 regression.

[FAIL] Test CX5-1b (RTL, Hebrew content): a unified call (digit + Hebrew in same text) exists at the row y:
  No call at y=115.00 carries BOTH the digit "1" and a Hebrew codepoint.

[FAIL] Test CX5-3 (RTL, Hebrew content, row "1."): NO short prefix-only call at the row y:
  Row "1." (y=115.00) has a short prefix-only call (text="1. ", x=512.18).
  Every Hebrew-content row must use the unified-row path.

[FAIL] Test CX5-3 (RTL, Hebrew content, row "1."): unified call (digit + Hebrew) exists at the row y:
  Row "1." (y=115.00) has no unified call mixing digit + Hebrew.

[FAIL] Test CX5-3 (RTL, Hebrew content, row "2."): NO short prefix-only call at the row y:
  Row "2." (y=163.00) has a short prefix-only call (text="2. ", x=512.18).

[FAIL] Test CX5-3 (RTL, Hebrew content, row "2."): unified call (digit + Hebrew) exists at the row y:
  Row "2." (y=163.00) has no unified call mixing digit + Hebrew.

[FAIL] Test CX5-3 (RTL, Hebrew content, row "3."): NO short prefix-only call at the row y:
  Row "3." (y=211.00) has a short prefix-only call (text="3. ", x=512.18).

[FAIL] Test CX5-3 (RTL, Hebrew content, row "3."): unified call (digit + Hebrew) exists at the row y:
  Row "3." (y=211.00) has no unified call mixing digit + Hebrew.

[PASS] Test CX5-2 (RTL, English content, Bug B guard): short prefix-only call at row y, x near right margin
[PASS] Test CX5-4 (LTR doc, row "1."): prefix-bearing call x near left margin
[PASS] Test CX5-4 (LTR doc, row "2."): prefix-bearing call x near left margin
```

Falsifiable: the test fails because the unfixed renderer emits a raw ASCII `"1. "` / `"2. "` / `"3. "` prefix-only call at each Hebrew row's y. The test also asserts the *positive* signature — a unified call mixing the ASCII digit with Hebrew codepoints — and that is absent on unfixed code. CX5-2 and CX5-4 already pass on unfixed code, which guarantees the gate cannot accidentally turn into a no-op.

### GREEN — committed fix flips the test to all-pass

Run output (after Task 2 commit):

```
Passed 11/11, Failed 0/11.

[PASS] Test CX5-1a (RTL, Hebrew content): NO short prefix-only call at the row y (unified-row path)
[PASS] Test CX5-1b (RTL, Hebrew content): a unified call (digit + Hebrew in same text) exists at the row y
[PASS] Test CX5-2 (RTL, English content, Bug B guard): short prefix-only call at row y, x near right margin
[PASS] Test CX5-3 (RTL, Hebrew content, row "1."): NO short prefix-only call at the row y
[PASS] Test CX5-3 (RTL, Hebrew content, row "1."): unified call (digit + Hebrew) exists at the row y
[PASS] Test CX5-3 (RTL, Hebrew content, row "2."): NO short prefix-only call at the row y
[PASS] Test CX5-3 (RTL, Hebrew content, row "2."): unified call (digit + Hebrew) exists at the row y
[PASS] Test CX5-3 (RTL, Hebrew content, row "3."): NO short prefix-only call at the row y
[PASS] Test CX5-3 (RTL, Hebrew content, row "3."): unified call (digit + Hebrew) exists at the row y
[PASS] Test CX5-4 (LTR doc, row "1."): prefix-bearing call x near left margin
[PASS] Test CX5-4 (LTR doc, row "2."): prefix-bearing call x near left margin
```

Sample unified-row output captured for the Hebrew "1. לוע" row after the fix: `text="עול .1", x=496.92, y=115` — a single visual string mixing the ASCII prefix and the Hebrew content, drawn right-anchored. No separate prefix-only `"1. "` call exists at that y anymore.

## Regression Sweep

Full PDF test suite run after the GREEN fix (`assets/pdf-export.js` modified, gate active):

| Suite                                                                              | Result    |
| ---------------------------------------------------------------------------------- | --------- |
| `tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js` (new) | **11/11** |
| `tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js`             | **10/10** |
| `tests/quick-260522-iwr-ordered-list-export.test.js`                               | **10/10** |
| `tests/pdf-bidi.test.js`                                                           | **12/12** |
| `tests/pdf-bold-rendering.test.js`                                                 | **9/9**   |
| `tests/pdf-latin-regression.test.js`                                               | **5/5**   |
| **Total**                                                                          | **57/57** |

Sanity-grep check after the edit:

```
$ grep -c "firstStrongDir(listStripped)" assets/pdf-export.js
1

$ grep -n "docDir === 'rtl' && wi === 0 && block.ordered) {" assets/pdf-export.js
(no match — the legacy unconditional gate is gone)
```

## Deviations from Plan

**1. [Rule 1 - Bug] Tightened `findShortPrefixCallAt` to exclude calls containing Hebrew codepoints.**
- **Found during:** Task 2 initial green run (CX5-1a and CX5-3 row-1 reported false-positive failures even with the gate in place).
- **Root cause:** The original detector flagged ANY call with `text.length <= 6` containing the digit + period at the row y as a "split-row signature". After the gate is added, the unified row for the very short "1. לוע" item reaches `doc.text()` as the 6-char visual string `"עול .1"` — short, contains "1" and "." — but it's a unified call, not a split-row prefix-only call.
- **Fix:** Added `if (containsHebrew(c.text)) continue;` to the detector. A true split-row prefix-only call always emits the raw ASCII `listPrefix` (`"N. "`) which contains zero Hebrew codepoints; a tiny unified-row call always contains Hebrew when the item is Hebrew. The discriminator now matches the actual semantic.
- **Re-verification:** Test still RED against unfixed code (3/11 pass — exactly CX5-2 + CX5-4 sanity tests) and GREEN against fixed code (11/11 pass). The test is more accurate, not weaker.
- **Files modified:** `tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js` (helper-only edit).
- **Commit handling:** The test fix was folded into the RED commit via `git commit --amend` so the RED commit on disk is internally consistent (the committed test fails against the committed unfixed code with exactly the expected failures, no false positives). Two atomic commits preserved on the branch as required.

**2. [Expected — pre-commit hook] sw.js CACHE_NAME bumped automatically.**
- **Found during:** Task 2 commit. The pre-commit hook detected that a cached asset (`assets/pdf-export.js`) was modified and auto-bumped `CACHE_NAME` from `sessions-garden-v189` to `sessions-garden-v190`.
- **Action:** None required. The hook staged `sw.js` and folded it into the same commit per project convention (`reference-pre-commit-sw-bump.md`).
- **Outcome:** GREEN commit `31974dc` includes both `assets/pdf-export.js` (the fix) and `sw.js` (the cache bump).

## User-facing Outcome

The user's exact 3-Hebrew-item repro from the screenshot — `"1. לוע / [paragraph] / 2. עיוות פאציאלי / [paragraph] / 3. חלל האף"` — now renders all three Hebrew items via the unified-row path. The Hebrew chars and the "N." prefix shape together as one UAX #9 RTL paragraph: digit at the right edge, period to its left, Hebrew content to the left of the period — the visually-correct RTL reading order. English-content Hebrew documents (e.g. `"2. Latin term"`) continue to right-anchor the prefix per the c8x Bug B fix.

## Self-Check: PASSED

- File `tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js`: FOUND
- File `assets/pdf-export.js` (modified with gate): FOUND (`grep -c "firstStrongDir(listStripped)" assets/pdf-export.js` returns 1)
- Commit `6bd67e1` (RED test): FOUND in `git log`
- Commit `31974dc` (GREEN fix): FOUND in `git log`
- All 6 PDF regression suites: GREEN (57/57)
