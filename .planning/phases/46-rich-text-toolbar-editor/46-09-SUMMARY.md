---
phase: 46-rich-text-toolbar-editor
plan: 09
subsystem: rich-text-editor
tags: [undo, redo, text-edit, rich-toolbar, coalesce, gap-closure]
status: complete
requires:
  - window.TextEdit editInsert chokepoint (46-01) — the restore reuses it for a real input event
  - window.RichToolbar mount/unmount + applyTransform/onFieldKeyDown/onFieldInput (46-03/46-04)
provides:
  - window.TextEdit module-owned undo/redo stack (undoTrack/undoUntrack/undoRecord/undoNoteInput/undo/redo)
  - single-stack undo shared by the toolbar buttons AND Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z / Ctrl+Y
affects:
  - 46-14 (real-device gate — button-undo === keyboard-undo, one-undo-per-line typing confirmed on hardware)
tech-stack:
  added: []
  patterns:
    - "Per-field undo history in a WeakMap keyed by the textarea element"
    - "Pure coalesce-boundary decision (shouldOpenBoundary) unit-tested without a DOM"
    - "Restore routed through the existing editInsert chokepoint + a module-internal restoring guard so a restore never records itself"
key-files:
  created:
    - tests/undo-stack.test.js
  modified:
    - assets/text-edit.js
    - assets/rich-toolbar.js
decisions:
  - "Coalesce window = 700 ms (within the 600–900 ms design band)"
  - "History cap = 200 snapshots per field; oldest dropped so a long session cannot grow memory without bound"
  - "Boundary chars belong to the NEXT step: undoNoteInput seals the PRE-input snapshot (pending), so a pause/kind-switch/newline correctly starts a fresh step rather than absorbing the boundary char into the prior step"
  - "undoRecord lives only at applyTransform start — the single chokepoint every structural edit (bold/italic/heading/list/Enter/Tab/indent/outdent) routes through — so one action is exactly one undo step; the renumber folds in via the existing _renumbering guard"
  - "Restore re-entrancy guard is module-internal to window.TextEdit (restoring flag); the toolbar calls the recording entry points unconditionally with no toolbar-side restore guard"
metrics:
  duration_min: 18
  completed: 2026-07-15
  tasks: 2
  files: 3
  tests_added: 18
  suite: 186/186
---

# Phase 46 Plan 09: Module-owned undo/redo stack Summary

Replaced the native-first undo path (execCommand undo/redo, shipped in 46-03)
with a SINGLE module-level undo stack in `window.TextEdit` that the toolbar
buttons AND the keyboard shortcut both route through. This closes the named D-20
follow-up: Ben's real-device finding that "wrote several lines but undo removed
all of them" — the browser coalesced typing into coarse chunks, so one undo
could wipe multiple lines. The module stack sets boundaries at human scale (a new
step at each line break and at a ~700 ms typing pause) so undo reverts a line or
a short burst, and every formatting action is exactly one undo step.

## Failing target this closes (from the 46-08 gate)

The 46-08 real-device gate designated a D-20 native-undo failure as the trigger
for this pre-described follow-up. This plan implements exactly that: the native
`execCommand('undo'/'redo')` path (unreliable coalescing; jsdom-blind) is swapped
for the RESEARCH-prescribed single module-level stack that also intercepts
Ctrl/Cmd+Z — never a dual stack. The pure transforms, focus docking, preview,
list mechanics, and heading menu are untouched; only the undo mechanism changed.

## Undo-stack API added (window.TextEdit)

| Method | Purpose |
|--------|---------|
| `undoTrack(ta)` | Begin tracking a field: seed a baseline snapshot, reset the pointer |
| `undoUntrack(ta)` | Stop tracking and drop the field's history |
| `undoRecord(ta)` | Seal the current pre-edit state as a boundary BEFORE a structural edit (one action = one step); truncates any redo tail |
| `undoNoteInput(ta, inputType)` | Coalescing entry point called on every input event; opens a new step at a newline / a pause beyond the window / an insert↔delete switch, else folds |
| `undo(ta)` / `redo(ta)` | Move the pointer and restore that snapshot (value + caret) through the editInsert chokepoint; return a boolean (did anything change) |

Snapshot shape: `{ value, selStart, selEnd }`. Restore fires a real input event so
autoGrow, snippets, and the live preview all react to undo/redo. A module-internal
`restoring` flag brackets the restore and makes `undoRecord`/`undoNoteInput`
self-no-op while set, so a restore can never push itself onto the history.

`__testExports` additionally exposes the pure `shouldOpenBoundary`,
`categorizeInput`, and `isNewlineInput` helpers for headless testing.

## Coalesce rule

`shouldOpenBoundary(lastKind, lastTime, now, inputType, windowMs)` opens a NEW
undo step when: the input is a line break (`insertLineBreak`/`insertParagraph`);
OR more than the coalesce window (**700 ms**) elapsed since the previous tracked
input; OR the input category switched between inserting and deleting. A brand-new
step (null `lastKind`) never opens — it is already fresh. The decision is a pure
helper, unit-tested without a DOM.

## What Was Built

**Task 1 — module stack in `window.TextEdit`** (`assets/text-edit.js`).
Per-field history in a `WeakMap`, a 700 ms coalesce window, a 200-snapshot cap
(oldest dropped), and the six-method surface above. `undoNoteInput` seals the
PRE-input snapshot (`pending`) on a boundary so the boundary character begins the
NEXT step — which is what makes the pause/kind-switch/newline boundaries feel
right (undo of a second line returns to the first line, not to a blank line).
`tests/undo-stack.test.js` (18 cases): record-then-undo (value + caret),
redo re-applies, branch truncation drops the redo tail, typing coalesces into one
step, the line-break boundary (Ben's exact scenario — per-line undo), the pause
boundary, the insert↔delete boundary, empty/tip no-ops, untracked-field safety,
restore-never-self-records, restore-fires-a-real-input-event, untrack drops
history, and the history cap. Plus the pure `shouldOpenBoundary` decision.

**Task 2 — rewire `assets/rich-toolbar.js`** onto the module stack.
`mount` calls `undoTrack` per registered field (shared note fields + persistent
export editor); `unmount` calls `undoUntrack`. The Undo/Redo buttons now call
`window.TextEdit.undo/redo` (native `execCommand('undo'/'redo')` removed —
grep-confirmed 0). `onFieldKeyDown` intercepts Ctrl/Cmd+Z → undo,
Ctrl/Cmd+Shift+Z → redo, and Ctrl+Y (off mac) → redo, reversing the earlier
"not intercepted" behavior so exactly one stack exists. `applyTransform` records a
boundary before every structural mutation (the single chokepoint for
bold/italic/heading/list/Enter/Tab/indent/outdent), so one action is one step;
the internal renumber folds into that step via the existing `_renumbering` guard.
`onFieldInput` notifies the coalescer for ordinary input.

## Deviations from Plan

### Authorized comment-hygiene translation
Per the locked project comment rule, no planning identifiers (RTXT-NN, D-NN,
phase/plan numbers, process words) appear in the shipped files. The plan's
ID-laden wording (e.g. "D-20", "RESEARCH §A4 / Pitfall 3", "Ben's scenario") was
translated to plain prose in `text-edit.js` and `rich-toolbar.js` comments — the
constraint kept, the identifiers dropped. Grep of added lines confirms clean.

### Placement choice: undoRecord at applyTransform start only
The plan listed several structural-edit call sites for `undoRecord`
(applyTransform, Enter/Tab in onFieldKeyDown, button indent/outdent/list in
_dispatch). All of those already route through `applyTransform`, so a single
`undoRecord` at `applyTransform` start brackets every structural edit exactly
once — placing it at each call site too would only fire redundant (idempotent)
seals. This satisfies the key-link "every structural edit records a boundary
BEFORE mutating" with one source of truth. [Rule 1 — cleaner equivalent]

## Known Stubs

None. The full six-method undo surface is implemented and exercised by 18 green
node cases; the toolbar wiring is live and the whole suite passes.

## Verification

- `node tests/undo-stack.test.js` → 18/18, exit 0
- `node --check assets/text-edit.js` and `node --check assets/rich-toolbar.js` → parse OK
- `node tests/run-all.js` (full suite) → **186/186**, exit 0 (185 baseline + 1 new file, zero regression)
- Source assertions: `grep -Ec "execCommand\('(undo|redo)'\)" assets/rich-toolbar.js` = 0 (native undo/redo gone); module-stack call count = 8; zero planning identifiers in added lines of both shipped files.
- Real-device confirmation (button-undo === keyboard-undo on desktop; buttons-only undo on iPhone; one-undo-per-line typing) is the 46-14 gate — jsdom is blind to real caret/execCommand.

## Self-Check: PASSED

All 3 artifacts exist on disk; both task commits (a6c2b67, 506598c) present in git history.
