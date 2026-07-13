---
phase: 45-rich-text-rendering-export-foundation
plan: 08
subsystem: rich-text-rendering
tags: [md-render, gap-closure, cross-pipeline-agreement, uat, editor-1-1]
status: complete
requires:
  - "45-01..45-07 complete on main (183/183 green; 45-07 round-1 fixes live)"
provides:
  - "read mode displays the typed ordinal of every ordered <li> via value=\"N\" — screen ≡ PDF ≡ what the user typed (GAP-45-04 closed)"
  - "a same-depth marker-type flip renders as separate sibling lists in read mode, matching the PDF's per-item markers (GAP-45-03 closed, CommonMark)"
  - "both classes locked into the cross-pipeline agreement corpus (typed-ordinal + same-depth type-flip)"
affects:
  - assets/md-render.js
tech-stack:
  added: []
  patterns:
    - "listOrdinal() captures the typed ordinal /^\\s*(\\d+)\\.(?:\\s+|$)/ → parseInt (character-matched to pdf-export ordMatch); ADDS a capture, never touches the detection helpers"
    - "buildList split into buildOneList (maximal same-type run at a depth, stops at a same-depth type flip) + buildSiblingLists (loops buildOneList so a flip opens a sibling list); nested-child recursion routes through buildSiblingLists so a flip splits at every depth"
    - "ordered <li> emits value=\"N\" from the integer ordinal only (digits-only, no user text in the attribute)"
key-files:
  created:
    - .planning/phases/45-rich-text-rendering-export-foundation/45-08-SUMMARY.md
  modified:
    - assets/md-render.js
    - tests/45-mdrender-lists.test.js
    - tests/45-pipeline-agreement.test.js
    - assets/changelog-content-en.js
decisions:
  - "GAP-45-04 fixed in md-render.js only via <li value=\"N\"> — pdf-export.js is already editor-1:1 (item.ordinal) and stayed byte-unchanged; the ordinal derives ONLY from the numeric capture, never raw text (T-45-08-01 mitigated)."
  - "GAP-45-03 per Ben's 2026-07-13 CommonMark lock: a same-depth marker-type change closes the current list and opens a sibling list, both directions, empty + non-empty, at every nesting depth; deeper differing-type children still nest; homogeneous runs never split."
  - "buildListLevel renamed/restructured into buildOneList + buildSiblingLists returning {html,next}; the child recursion now routes through buildSiblingLists so a child-run flip splits too."
  - "D-08 emphasis regexes and the detection helpers (isListItem/listType/listDepth/stripListMarker) left untouched; character-identity + join-invariant + no-lookbehind gates stay green; pdf-export.js byte-unchanged."
metrics:
  duration: ~15min
  completed: 2026-07-13
  tasks: 3
  files: 4
---

# Phase 45 Plan 08: Read-Mode List-Rendering Gap Closure (Round 2) Summary

GAP-45-04 (read mode renumbered ordered items positionally) and GAP-45-03 (a same-depth marker-type flip folded into the open list) closed in `assets/md-render.js` only — ordered `<li>` now carries `value="{typed ordinal}"` and a same-depth type flip renders as sibling lists, matching the already-correct PDF; `pdf-export.js` stayed byte-unchanged and both classes are locked into the cross-pipeline agreement corpus.

## What was built

**Task 1 — GAP-45-04 (typed ordinals, editor-1:1):**
- New `listOrdinal(line)` helper captures the typed ordinal with `/^\s*(\d+)\.(?:\s+|$)/` and returns `parseInt(...)` — character-matched to `pdf-export.js` parseMarkdown's `ordMatch` so the pipelines agree (bare `5.` → 5; `1.5` → null, 1.5-guard preserved).
- `buildList` maps `ordinal` per item; the list builder emits `<li value="N">` for ordered items (both emission sites) and a bare `<li>` for bullets.
- Result: `11. jj` shows 11, `3. a\n4. b` shows 3/4, `1./1./1.` shows 1,1,1, block-separated `1. X`/`2. Y` shows 1/2 — screen ≡ PDF.

**Task 2 — GAP-45-03 (same-depth type flip → sibling list):**
- `buildListLevel` restructured into `buildOneList` (opens one `<type>`, consumes a maximal same-type run at a depth, recurses on deeper children, STOPS at the first same-depth item whose own type differs, returns `{html, next}`) and `buildSiblingLists` (loops `buildOneList` while same-depth items remain).
- `buildList` and the nested-child recursion both route through `buildSiblingLists`, so a same-depth flip splits at **every** depth. Deeper differing-type children still nest; homogeneous runs never split; ordinal continuity holds across a flip (`1. a\n- b\n2. c` → 1 / bullet / 2).

**Task 3 — docs hard-gate:**
- Amended the staged v1.4.0 EN changelog `new` reading highlight to note numbered lists keep the typed numbers and bullet↔number switching renders correctly. EN-only; highlight count (3) and category skeleton (new 1, improved 2) unchanged so the locale-parity gate stays green. APP_VERSION unchanged (1.3.0 mid-milestone).

## Docs-gate trailer (recorded for the next push)

`assets/md-render.js` is a watched code file not in the changelog-only tier, so this push raises a changelog demand (satisfied by the EN `changelog-content-en.js` edit) AND a per-file help demand for md-render.js (waived by the trailer below — honored from any commit in the pushed range). It is already present on commit `dbc9995` in this plan's range:

```
Help-Unaffected: assets/md-render.js — read-mode list-rendering gap fixes (same-depth marker-type flip starts a new list; ordered items display the typed ordinal); behavior documented under review-export + starting-a-session help topics and the v1.4 changelog entry
```

Per the avoid-docs-only-deploys convention, this rides with the next code push — no docs-only deploy.

## Verification

- `node tests/45-mdrender-lists.test.js` — 31 passed, 0 failed (count guard 31).
- `node tests/45-pipeline-agreement.test.js` — 15 passed, 0 failed (count guard 15).
- `node tests/run-all.js` — ALL PASS (183 passed, 0 failed).
- `git diff --stat assets/pdf-export.js` — no change (byte-unchanged this round; baseline hash `dcad3c8`).
- Overall diff scope: only `assets/md-render.js`, `tests/45-mdrender-lists.test.js`, `tests/45-pipeline-agreement.test.js`, `assets/changelog-content-en.js`.

## Deviations from Plan

None — plan executed exactly as written. Each task followed RED → GREEN with separate `test(...)` and `feat(...)` commits per the tdd="true" gate.

## Commits

| Task | Type | Commit | Description |
| ---- | ---- | ------ | ----------- |
| 1 | test (RED) | 6b36d17 | typed-ordinal corpus + agreement case, count guards bumped |
| 1 | feat (GREEN) | 131ce6f | listOrdinal + `<li value="N">` emission |
| 2 | test (RED) | 8cc0eea | same-depth flip corpus + agreement case, count guards bumped |
| 2 | feat (GREEN) | 41289c8 | buildOneList + buildSiblingLists restructure |
| 3 | docs | dbc9995 | v1.4.0 changelog amendment + Help-Unaffected trailer |

## TDD Gate Compliance

Both behavior-adding tasks show a `test(...)` (RED) commit followed by a `feat(...)` (GREEN) commit; RED runs confirmed the new/updated assertions failed against the unchanged renderer before implementation (Task 1: 9 red; Task 2: 6 red + 1 agreement red). No REFACTOR commit was needed.

## Self-Check: PASSED

All 5 modified/created files exist on disk; all 5 task commits (6b36d17, 131ce6f, 8cc0eea, 41289c8, dbc9995) are present in git history.
