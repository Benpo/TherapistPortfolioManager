---
phase: 46-rich-text-toolbar-editor
plan: 01
subsystem: rich-text-editor
tags: [text-edit, undo, transforms, lists, tdd]
status: complete
requires:
  - md-render.js marker grammar (bold `**`, italic `*`, list `- `/`* `/`N. `, 2-space nesting)
  - pdf-export.js parseMarkdown depth convention (Math.floor(spaces/2))
provides:
  - window.TextEdit (editInsert undo-safe chokepoint + pure string transforms)
  - window.TextEdit.__testExports (headless-testable pure helpers)
affects:
  - 46-03 (toolbar wiring — bold/italic/heading/list buttons call these transforms)
  - 46-04 (auto-format/indent/renumber keyboard wiring)
tech-stack:
  added: []
  patterns:
    - "Vanilla IIFE module with four-slot banner + __testExports seam (mirrors snippets.js)"
    - "Pure transform contract (value, sel...) -> {value, selStart, selEnd, replacement:{start,end,text}}"
    - "execCommand('insertText') as the sole undo-preserving textarea edit primitive"
key-files:
  created:
    - assets/text-edit.js
    - tests/46-text-edit.test.js
    - tests/46-list-mechanics.test.js
  modified: []
decisions:
  - "editInsert quote style aligned to single-quote so the plan's execCommand('insertText') source grep matches real code, not just a comment"
  - "The undo-wiping range-replace API is described but its literal identifier is kept out of the file so the plan's zero-count grep stays green (plan self-contradiction resolved in favor of the mechanical gate)"
metrics:
  duration_min: 6
  completed: 2026-07-14
  tasks: 2
  files: 3
  tests_added: 23
  suite: 185/185
---

# Phase 46 Plan 01: TextEdit — undo-safe chokepoint + pure transforms Summary

Built `window.TextEdit` (`assets/text-edit.js`): the single undo-safe textarea
insertion chokepoint (`editInsert` via `execCommand('insertText')`) plus every
side-effect-free string transform the toolbar needs — bold/italic toggle, list-
marker insert, heading apply/clear, Enter auto-format (continue/exit/outdent),
indent/outdent, and per-nesting-depth ordered-list renumber. All the genuinely-
tricky undo/caret/selection math is isolated and unit-tested headlessly here so
the downstream mount/toolbar plans (46-03/46-04) are thin wiring.

## Public Surface (stable contract for 46-03/46-04)

Transform return shape (every pure fn): `{ value, selStart, selEnd, replacement: { start, end, text } }`
where `replacement` is what `editInsert` applies in-browser and `value/selStart/selEnd`
are the post-edit expected state.

| Function | Signature | Notes |
|----------|-----------|-------|
| `editInsert` | `(textarea, start, end, replacement)` | Undo-safe; `execCommand('insertText')` primary, value-splice + real `input` event fallback only when execCommand returns false |
| `toggleWrap` | `(value, s, e, marker)` → transform | marker = `**` or `*`. Wrap / unwrap round-trip / empty-selection pair with caret between markers (D-04) |
| `insertListMarker` | `(value, s, e, kind)` → transform | kind = `'ul'` (`- `) or `'ol'` (`1. `) at the line's leading-whitespace boundary |
| `applyHeading` | `(value, s, e, level)` → transform | level 1/2/3 sets `#`/`##`/`###`; level 0 strips. Idempotent (N then 0 = identity) |
| `autoFormatEnter` | `(value, sel)` → transform \| **null** | null on non-list lines; continue (ordinal+1) / top-level exit / single-level nested outdent |
| `indentLine` | `(value, sel, dir)` → transform | dir `'in'` adds 2 spaces, `'out'` removes up to 2 |
| `outdentLine` | `(value, sel)` → transform | alias for `indentLine(value, sel, 'out')` |
| `renumberOrderedBlock` | `(value, sel)` → transform | rewrites the contiguous block to 1..N per depth; **NO-OP** (unchanged value + empty-length replacement) when already correct |

`__testExports` additionally exposes `currentLine` and `parseListLine`.

## What Was Built

**Task 1 (RTXT-01, D-04)** — `editInsert` chokepoint + `currentLine`, `toggleWrap`,
`insertListMarker`, `applyHeading`. The CONSTRAINTS banner documents that
`execCommand('insertText')` is deliberate and irreplaceable (the only undo-
preserving textarea edit API) so a future cleanup does not modernize it and
silently break Ctrl+Z. `tests/46-text-edit.test.js` (11 cases): empty-selection
bold places caret between a single marker pair (no doubled artifact); wrapped-
selection toggle round-trips to the original; italic uses the single token;
heading level-2-then-0 returns the original line; bullet/numbered markers are
detected by md-render's list regex; both editInsert branches (execCommand + fallback).

**Task 2 (RTXT-03, RTXT-05, D-09/D-10/D-11)** — `autoFormatEnter`, `indentLine`,
`outdentLine`, `renumberOrderedBlock`. 2-space nesting unit matches md-render's
`listDepth` and pdf-export's `parseMarkdown`. `tests/46-list-mechanics.test.js`
(12 cases): continuation (bullet + ordinal+1), top-level exit, single-level
nested outdent, indent/outdent round-trip, the D-11 delete-3/append-at-end
acceptance scenario (ordinals 1,2,3 → 1,2,3,4 with caret surviving the rewrite),
nested per-depth independent renumber (deleting a nested item leaves top-level
ordinals untouched), and the issue-9 no-op (already-correct block returns
unchanged with an empty-length replacement so the caller skips editInsert).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Plan contradiction] `execCommand('insertText')` grep vs. quote style**
- **Found during:** Task 1 acceptance verification
- **Issue:** The plan's acceptance grep is `grep -c "execCommand('insertText'"` (single-quote), but the reference impl and repo style could land as double-quote, making the real chokepoint invisible to the mechanical gate.
- **Fix:** The actual `editInsert` call uses single quotes (`document.execCommand('insertText', false, replacement)`) so real code — not only the comment — satisfies the criterion. Grep now returns 2.
- **Files modified:** assets/text-edit.js
- **Commit:** 5c71fb7

**2. [Rule 3 - Plan contradiction] `setRangeText` warning vs. zero-count grep**
- **Found during:** Task 1 acceptance verification
- **Issue:** The plan's action asks the CONSTRAINTS banner to warn "a future cleanup does not modernize it into setRangeText", yet an acceptance criterion requires `grep -c "setRangeText"` to return **0**. Naming the API literally in the warning breaks the grep.
- **Fix:** Rephrased the banner to describe the undo-wiping range-replace API (and explicitly note the literal identifier is kept out of the file) without using the exact token. Warning intent preserved; grep returns 0.
- **Files modified:** assets/text-edit.js
- **Commit:** 5c71fb7

## Known Stubs

None. All transforms are fully implemented and exercised by green node tests.
This plan intentionally ships no DOM mount — the toolbar/keyboard wiring lands in
46-03/46-04, which consume this module's public surface.

## Verification

- `node tests/46-text-edit.test.js` → 11/11, exit 0
- `node tests/46-list-mechanics.test.js` → 12/12, exit 0
- `npm test` (full suite) → **185/185**, exit 0 (Phase 45 baseline 183 + 2 new files, zero regression)
- Source assertions: `grep -c "execCommand('insertText'"` = 2 (≥1 ✓); `grep -c "setRangeText"` = 0 ✓

## Self-Check: PASSED

All 4 artifacts exist on disk; all 4 task commits present in git history.
