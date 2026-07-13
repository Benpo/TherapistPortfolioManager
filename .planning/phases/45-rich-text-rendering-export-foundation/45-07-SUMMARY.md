---
phase: 45-rich-text-rendering-export-foundation
plan: 07
subsystem: rich-text-rendering
tags: [md-render, pdf-export, gap-closure, cross-pipeline-agreement, uat]
status: complete
requires:
  - "45-01..45-05 renderers complete on main (183/183 green)"
provides:
  - "read mode renders a heading typed directly under text as a real heading (GAP-45-01 closed)"
  - "marker-only lines (-/*/N.) render as empty list items consistently in both pipelines (GAP-45-02 closed)"
  - "text-then-heading + marker-only classes locked into the cross-pipeline agreement corpus"
affects:
  - assets/md-render.js
  - assets/pdf-export.js
tech-stack:
  added: []
  patterns:
    - "marker detection lookahead (?=\\s|$); stripping/capture (?:\\s+|$) — accepts marker-only lines while preserving the 1.5-guard"
    - "renderBlock text-then-heading split mirrors the WARNING-3 text-then-list split (leading text as its own sub-block, recurse on the remainder at the heading line)"
key-files:
  created:
    - .planning/phases/45-rich-text-rendering-export-foundation/45-07-SUMMARY.md
  modified:
    - assets/md-render.js
    - assets/pdf-export.js
    - tests/45-mdrender-lists.test.js
    - tests/45-pdf-nested-lists.test.js
    - tests/45-pipeline-agreement.test.js
    - assets/changelog-content-en.js
decisions:
  - "GAP-45-01 fixed in md-render.js only — pdf-export.js already terminates paragraphs at heading lines; read mode converges toward it (pdf-export.js byte-unchanged by Task 1)."
  - "GAP-45-02 per Ben's 2026-07-13 lock: marker-only lines are EMPTY list items in BOTH pipelines (1. ≡ 1. ); a lone `-` separator → empty bullet is an accepted side effect; the 1.5-guard is preserved by the lookahead."
  - "D-08 emphasis regexes left character-identical and untouched; the character-identity + join-invariant + no-lookbehind gates stay green."
metrics:
  duration: ~20min
  completed: 2026-07-13
  tasks: 3
  files: 6
---

# Phase 45 Plan 07: Gap-Closure (text-then-heading + marker-only lines) Summary

Closed the two UAT gaps from Ben's 2026-07-13 real-device round — read mode now renders a heading typed directly under text as a real heading (matching the PDF), and marker-only list lines (`-`/`*`/`N.`, bare or trailing-space) render as empty list items consistently in both pipelines — both locked into the cross-pipeline agreement corpus, with the D-08 emphasis path untouched.

## What was built

### Task 1 — GAP-45-01: text-then-heading split (RED `3f3820c`, GREEN `0f2981a`)
`renderBlock()` in `assets/md-render.js` gained a heading scan placed AFTER the `var lines` split and BEFORE the list scan: it finds the first line matching `/^#{1,3}\s+/` and, when that index is > 0, splits like the existing WARNING-3 text-then-list split — rendering the leading text as its own sub-block, then recursing on the remainder STARTING at the heading line. The block-start heading branch then consumes the heading, and its body-remainder recursion re-enters the same split, so one change also fixes a `### Sub` after text inside a heading's body remainder (Ben's image 2). A heading at index 0 never reaches the scan (handled by the block-start branch). `assets/pdf-export.js` was byte-unchanged by this task — its `parseMarkdown` already terminates paragraphs at heading lines, so read mode converges toward the PDF's already-correct behavior.

### Task 2 — GAP-45-02: marker-only lines as empty list items (RED `c60af43`, GREEN `697b051`)
Adopted one marker rule across both renderers: DETECTION uses a lookahead `(?=\s|$)` after the marker (`[-*]` bullet or `\d+\.` ordinal); STRIPPING / ordinal-capture consume `(?:\s+|$)`. Both accept a marker-only line AND preserve the 1.5-guard (in `1.5` the ordinal dot is followed by a digit, so the branch fails and the line stays a paragraph).
- `assets/md-render.js`: `isListItem`, `listType`, `stripListMarker`, and the `strip()` per-line block regex adopt the rule. `listDepth` unchanged (marker-only lines still carry depth from leading spaces).
- `assets/pdf-export.js` `parseMarkdown`: list-block entry detect, first-line `listOrdered`, the while-loop continue condition, per-item `itemOrdered`, the `ordMatch` ordinal capture, both marker-strip `.replace()` calls, and BOTH paragraph-terminator regexes move to the same rule in lockstep so the grouper and the paragraph collector never disagree on a marker-only line. `stripInlineMarkdown` and `parseInlineBold` (the pinned emphasis functions) were NOT touched.

### Task 3 — docs hard-gate (`722808a`)
Amended the STAGED v1.4.0 EN changelog entry (anchor `v1-4`) — refined the reading `new` highlight to state headings and lists render reliably regardless of a blank line. EN-only edit; highlight count and category-key skeleton unchanged, so `changelog-integrity-locale.test.js` parity stays green with no locale edits. `APP_VERSION` left at 1.3.0 (the semver footer flips at the v1.4 release boundary).

## Verification

- `node tests/45-mdrender-lists.test.js` — 19/19 (count guard 9 → 19).
- `node tests/45-pdf-nested-lists.test.js` — 12/12 (count guard 7 → 11 + guard case).
- `node tests/45-pipeline-agreement.test.js` — 13/13 (count guard 9 → 13); character-identity, no-lookbehind, D-08 corpus, and randomized join-invariant all still pass.
- `node tests/run-all.js` — 183/183 files, full suite green (no regression in 31-* render-hardening, changelog-integrity, changelog-integrity-locale).
- `git diff --stat HEAD~5 HEAD` — only `assets/md-render.js`, `assets/pdf-export.js`, the three named test files, and `assets/changelog-content-en.js` changed. No export-modal / backup / storage / add-session source touched (RTXT-08/D-10 verbatim pass-through and RTXT-10 `.sgbackup` round-trip unaffected — renderer-only changes).
- `node scripts/docs-gate.js` (origin/main..HEAD) → **OK** (all help+changelog demands covered; the Help-Unaffected trailer is on commit `722808a`, in the pushed range).

## Docs-gate trailer (record for the next push)

Exact trailer text (case-sensitive), placed on commit `722808a`:

```
Help-Unaffected: assets/md-render.js, assets/pdf-export.js — rendering-robustness gap fixes (text-then-heading + marker-only lines); behavior already documented under review-export + starting-a-session help topics and the v1.4 changelog entry
```

Per the avoid-docs-only-deploys convention, do NOT run a docs-only deploy for this change — let it ride with the next code push.

## Deviations from Plan

### 1. [Rule 1 — test-authoring bug] pdf marker-only parse assertions rewritten from deepStrictEqual to per-property
- **Found during:** Task 2 (GREEN run — 3 pdf tests failed despite correct `parseMarkdown` output).
- **Issue:** The parsed objects live in the jsdom realm, so a cross-realm `assert.deepStrictEqual(block.items[0], {…})` fails on prototype identity ("same structure but not reference-equal") even when the values are structurally identical.
- **Fix:** Rewrote the three new parse assertions to check individual properties (and compare `JSON.stringify(a.items)` for the `1.` ≡ `1. ` case), matching the file's existing per-property style. Source output was already correct.
- **Files modified:** `tests/45-pdf-nested-lists.test.js`. **Commit:** `697b051`.

## Cross-plan contract — invariants honored

- The two D-08 emphasis regexes in `md-render.js applyInline` and `pdf-export.js stripInlineMarkdown` were NOT touched; the character-identity gate (regex-literal source compared char-for-char) is green.
- Escape-first + single-newline→`<br>` contract in md-render.js unchanged (the `line1\nline2` lock stays green).
- Shared nesting floor(spaces/2) unchanged; `listDepth` untouched.
- RTXT-08 verbatim pass-through and RTXT-10 backup round-trip unaffected — no export-modal/backup/storage source touched.

## Self-Check: PASSED

- FOUND: assets/md-render.js, assets/pdf-export.js, all three test files, assets/changelog-content-en.js (all modified, in git).
- FOUND commits: 3f3820c, 0f2981a, c60af43, 697b051, 722808a (all in git log).
