---
phase: quick-260516-rna
plan: 01
subsystem: sessions-garden-app
tags: [ui-fix, add-session, textarea, autogrow, tdd]
requires: []
provides:
  - "Long add-session textareas auto-grow to fit content as the user types"
  - "Auto-grow also applies on edit-load (pre-filled long sessions)"
  - "Single-sourced scrollHeight math shared by read-mode, live input, and populate paths"
affects:
  - assets/add-session.js
  - assets/app.css
tech-stack:
  added: []
  patterns:
    - "Single computeGrowHeight/autoGrow helper as the one source of the scrollHeight math"
    - "Delegated form-level input listener (composes with per-textarea snippets input handler; measure-only, no value mutation)"
key-files:
  created:
    - tests/quick-260516-rna-textarea-autogrow.test.js
  modified:
    - assets/add-session.js
    - assets/app.css
decisions:
  - "No max-height cap — user explicitly wants uncapped grow-to-fit; resize: vertical kept as manual fallback"
  - "Refactored existing read-mode-only resize (resizeReadModeTextareas) to reuse the new shared autoGrow helper instead of adding a divergent autosize path"
  - "Targets the whole .session-textarea set (7 long fields) per 'apply consistently'; excludes #exportEditor (prior task g7p), #inlineClientNotes, #editClientNotes"
metrics:
  duration: ~4min (executor)
  completed: 2026-05-16
  recovery: "Executor hit an API Internal server error AFTER both atomic commits but BEFORE writing SUMMARY.md; orchestrator verified RED→GREEN, merged, and authored this summary from the committed diff (classifyHandoffIfNeeded-class recovery)."
---

# Phase quick-260516-rna: Add-Session Textarea Auto-Grow Summary

The two long-form session textareas (and the rest of the `.session-textarea`
set) no longer stay at a fixed height while content scrolls out of view —
they grow vertically to fit their content as the user types, and also size
correctly to pre-existing content when editing a saved session. Manual
drag-resize still works.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (test, RED) | `516e196` | test(quick-260516-rna): add failing behavior test for textarea auto-grow |
| 2 (fix, GREEN) | `417e4f9` | fix(quick-260516-rna): auto-grow long add-session textareas to fit content |
| (orchestrator) | `a3835df` | chore: merge quick task worktree |

## Root Cause + Fix

- **Root cause:** the only auto-size logic in `add-session.js`
  (`resizeReadModeTextareas()`) fired exclusively in **read mode** (viewing a
  saved session). While typing in the editable form, or on edit-load, nothing
  adjusted height — so the fixed CSS height made long content scroll/look
  trimmed until the user manually dragged the resize handle.
- **Fix:**
  - Added a single top-level `computeGrowHeight(el)` (returns
    `Math.max(el.scrollHeight, SESSION_TEXTAREA_MIN_HEIGHT)`) and a
    measure-only `autoGrow(el)` (reset height to `auto`, then apply the
    computed height). This is now the ONE place the scrollHeight math lives.
  - Bound a **delegated** `input` listener on `sessionForm` filtered to
    `.session-textarea`, so it composes cleanly with the existing per-textarea
    snippets `input` handler (the grow path is measure-only — no
    `preventDefault`, no `.value` mutation).
  - Called a `growAll`-style sweep after `populateSession()` so editing a
    session with long existing notes sizes correctly on load.
  - Refactored `resizeReadModeTextareas()` to reuse `autoGrow` (no divergent
    autosize path).
  - `app.css`: added an explicit `box-sizing: border-box` guard on the
    textarea so the scrollHeight→height assignment doesn't creep by
    border/padding (idempotent with the global reset). **No** max-height /
    `overflow:hidden` on the editable state (uncapped grow-to-fit, per the
    user). `resize: vertical` retained as the manual fallback.

## Test

`tests/quick-260516-rna-textarea-autogrow.test.js` — node vm-sandbox,
following the g7p `__*TestHooks`/source-contract pattern:
- **A2/A3:** the `input` binding is filtered to `.session-textarea` and a
  grow sweep runs after `populateSession` (proves it fires on edit-load, not
  only on keystroke).
- **B2:** long content grows to the larger `scrollHeight` (grow-to-fit, not a
  constant); short content stays at the min-height floor.
- **C1:** `computeGrowHeight` has no `Math.min` (no hard cap).
- **C2/C3:** `app.css` still declares `resize: vertical`; the editable state
  adds no `overflow:hidden`/`max-height`.

Confirmed **RED before** (7 failed / 2 passed against pre-fix sources) and
**GREEN after** (9 passed / 0 failed). Prior-task regression suites
(`quick-260516-g7p-export-editor-snippets`,
`quick-260516-g7p-missing-birth-filter`) still pass.

## Deviations from Plan

None. Plan executed exactly as written. The only deviation from the *normal
workflow* is the recovery noted in frontmatter: the executor's API call
errored after both commits were made but before it wrote SUMMARY.md. The
orchestrator verified the committed work (RED→GREEN, scope, syntax,
regressions), merged the worktree, and authored this summary from the diff —
consistent with the documented `classifyHandoffIfNeeded`-class recovery
(summary present + clean commits ⇒ treat as successful).

## Notes

- `sw.js` CACHE_NAME auto-bumped by the pre-commit hook on the fix commit
  (cached asset contents changed, no precached URL changed) — no manual
  CACHE_NAME chore follow-up needed (MEMORY:reference-pre-commit-sw-bump;
  sw.js was not in any source diff).
- No Lemon Squeezy code touched.

## Known Stubs

None.

## Self-Check: PASSED

- Test file exists on disk; 9/9 pass on `main` post-merge.
- Both per-task commits (`516e196`, `516e196`→`417e4f9`) exist in git history on `main`.
- SUMMARY.md exists at the specified path.
