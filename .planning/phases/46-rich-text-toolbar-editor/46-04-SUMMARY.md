---
phase: 46-rich-text-toolbar-editor
plan: 04
subsystem: rich-text-editor
tags: [toolbar, list-mechanics, auto-renumber, live-preview, md-render, rtl]
status: complete
requires:
  - window.TextEdit (46-01 — autoFormatEnter / indentLine / outdentLine / renumberOrderedBlock + editInsert chokepoint)
  - window.RichToolbar (46-03 — focus-attached toolbar chrome; preview button existed as a no-op)
  - window.MdRender.render (escape-first renderer, Phase 45)
  - .note-rendered CSS (Phase 45 — the preview pane's entire rendered look)
provides:
  - RichToolbar list mechanics (Enter auto-format, Tab/Shift+Tab + button indent/outdent, ordered auto-renumber)
  - RichToolbar per-field live preview pane (togglePreview via the eye button)
affects:
  - 46-05 (mounts RichToolbar onto the 7 add-session note fields — full behavior now present)
  - 46-06 (mounts RichToolbar onto #exportEditor)
tech-stack:
  added: []
  patterns:
    - "Keydown-anchored Enter/Tab list mechanics (not the pre-input event — iOS Safari inconsistent)"
    - "Structural-only auto-renumber gated on inputType (deletions/paste) + explicit calls; no-op result skips editInsert"
    - "Re-entrancy flag so a renumber's own editInsert input event never re-triggers renumber"
    - "Per-field preview pane on a DISTINCT textarea property (_notePreview) reusing .note-rendered, MdRender-only render"
key-files:
  created: []
  modified:
    - assets/rich-toolbar.js
    - assets/app.css
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "Tasks 1 and 2 committed as ONE atomic implementation commit — same module, structurally interdependent (shared state, one onFieldInput serving both renumber + preview, shared mount listeners); a split would create an invalid intermediate state"
  - "Two empty-state i18n keys added to all four locales (parity test requires EN keys to exist in he/de/cs) — Rule 2 missing-i18n, beyond the plan's declared 2-file scope"
  - "Auto-renumber deletion trigger keyed on inputType prefix 'delete' + 'insertFromPaste'; ordinary insertText typing never renumbers (backed by the 46-01 no-op unit)"
  - "Indent/outdent BUTTONS guard against heading lines (flush-left) — matches the Tab keyboard rule"
metrics:
  duration_min: 14
  completed: 2026-07-14
  tasks: 2
  files: 6
  suite: 185/185
---

# Phase 46 Plan 04: RichToolbar list mechanics + live preview Summary

Completed the toolbar's remaining editing behaviors on the shared
`window.RichToolbar` module (`assets/rich-toolbar.js`): list auto-format while
typing, Tab/Shift+Tab and button indent/outdent with no keyboard trap,
caret-stable undo-safe ordered auto-renumber, and an on-demand per-field live
preview pane. Every text mutation still routes through the tested 46-01
`TextEdit` transforms; the preview reuses `window.MdRender` and Phase-45's
`.note-rendered` styling with zero new render code. 46-05/46-06 now only have to
MOUNT the toolbar — the full behavior surface is present.

## Public Surface (complete RichToolbar behavior for 46-05/46-06)

The mount/unmount/refreshButtonState API from 46-03 is unchanged. New internal
behaviors, all reachable through the existing controls and keyboard:

| Behavior | Trigger | Path |
|----------|---------|------|
| List continue / top-level exit / nested outdent | Enter on a list line (keydown) | `TextEdit.autoFormatEnter` → `editInsert` → `maybeRenumber` |
| Indent / outdent | Tab / Shift+Tab on a list line, or the indent/outdent buttons | `TextEdit.indentLine('in')` / `outdentLine` → `editInsert` → `maybeRenumber` |
| Ordered auto-renumber (1..N) | Structural change only (marker insert, Enter continuation, indent/outdent, deletion/paste that alters a list line) | `TextEdit.renumberOrderedBlock`; NO-OP result → zero `editInsert` |
| Live preview toggle | Eye button (`data-action="preview"`) | `togglePreview()` → build/show `_notePreview` pane, debounced `renderPreview` |

**Renumber trigger points** (for 46-05/06 awareness): keydown Enter handler,
keydown Tab handler, the `bulletList`/`numberedList`/`indent`/`outdent` dispatch
cases, and the `input` handler for deletion/paste input types only. Ordinary
character typing never renumbers; and when numbering is already correct
`renumberOrderedBlock` returns its no-op (unchanged value + empty-length
replacement) so `maybeRenumber` makes ZERO `editInsert` calls — no redundant
insert, no extra native-undo step. A re-entrancy flag (`_renumbering`) stops the
`input` event a renumber's own `editInsert` fires from looping.

**Preview-pane contract:** `togglePreview()` builds (once, reused) a pane
directly below the focused field, stored on `textarea._notePreview` — a DISTINCT
property from read mode's overlay, so the edit-mode preview and the read-mode
overlay never share an element. It renders through `window.MdRender.render`
(escape-first; the raw note value is NEVER assigned to `innerHTML`), falling back
to `textContent` (literal) when MdRender is absent, debounced ~120 ms on input.
An empty field shows the empty-state block ("Nothing to preview yet" / "Start
typing to see the formatted result."). The eye button carries the accent active
state and its tooltip flips to "Hide preview". Preview is edit-mode/focused-field
scoped and RESETS on blur or a move to another field (no stickiness).

## What Was Built

**Task 1 — list mechanics + auto-renumber.** Extended `onFieldKeyDown` to handle
Enter (list auto-format, keydown-anchored because the pre-input event is
inconsistent on iOS Safari) and Tab/Shift+Tab (indent/outdent on list lines only;
ordinary text and heading lines keep native focus-move, so no keyboard trap and
headings stay flush-left). Added `isListLine`/`isHeadingLine` helpers and
`maybeRenumber` (no-op detection + re-entrancy guard). Wired the
bullet/numbered/indent/outdent buttons to `maybeRenumber`, guarding the
indent/outdent buttons against heading lines. Added an `input` listener
(`onFieldInput`) that renumbers only on deletion/paste input types.

**Task 2 — live preview pane.** Added `togglePreview`/`openPreview`/`closePreview`,
`buildPreviewPane`, `renderPreview` (MdRender-only, textContent-built empty state,
no raw-value innerHTML), `schedulePreviewRender` (debounced), and
`updatePreviewButton` (active state + tooltip flip + aria-pressed). Wired the
`preview` dispatch case to `togglePreview`, and reset the preview from `dockTo`
(field change) and `hideToolbar` (full blur). Preview re-render also runs from
`onFieldInput`. Added preview-pane CSS in app.css (reuses `.note-rendered`; adds
only wrapper spacing + the muted, centered empty-state block; logical properties,
existing tokens, no new colors) and two empty-state i18n keys in all four locales.

## Deviations from Plan

### Authorized (comment hygiene — locked project rule)

**[Comment hygiene] Planning IDs kept out of shipped-file comments.**
The plan's action/acceptance wording carries decision IDs (D-05/06/07/09/10/11/15,
RTXT-NN, "Pitfall N", "issue N"). Per the locked CONVENTIONS.md §Comments rule
(shipped files carry NO planning IDs), all such IDs were translated to plain prose
in `rich-toolbar.js` and `app.css` comments — the constraint/rationale is kept,
the ID dropped. IDs remain in this SUMMARY and the commit message. This deviation
from plan wording is authorized and is not a plan violation. Grep-verified:
zero planning IDs in my additions to both shipped files.

### Auto-added (Rule 2 — missing critical functionality)

**[Rule 2 — i18n] Empty-state copy localized across all four locales.**
- **Found during:** Task 2 (i18n-parity test requires every EN key to exist in he/de/cs).
- **Issue:** The plan scoped Task 2 to `rich-toolbar.js, assets/app.css` only, but
  the empty-state strings need localization like every other toolbar string
  (46-03 fully translated its toolbar keys), and adding EN-only keys would break
  the parity test.
- **Fix:** Added `toolbar.previewEmptyTitle` + `toolbar.previewEmptyBody` to
  i18n-en/he/de/cs.js with real translations (HE stored UTF-8, CS via the file's
  `\u` escape convention).
- **Files modified:** assets/i18n-en.js, assets/i18n-he.js, assets/i18n-de.js, assets/i18n-cs.js
- **Commit:** a6586bb

### Commit granularity

Tasks 1 and 2 were committed as ONE atomic implementation commit (a6586bb)
rather than two per-task commits. They edit the same module and are structurally
interdependent — shared state vars, a single `onFieldInput` handler serving both
the deletion-renumber (Task 1) and preview re-render (Task 2), and shared
mount/unmount listener registration — so a per-task split would produce an
invalid intermediate commit. The single commit is fully valid and green.

## Threat Surface

The phase threat register items are satisfied:
- **T-46-04a (preview XSS):** preview renders 100% through `MdRender.render`
  (escape-first); the sole `innerHTML` assignment in the file is
  `pane.innerHTML = window.MdRender.render(val)`; textContent fallback when
  MdRender is absent — grep-verified.
- **T-46-04b (renumber tampering):** renumber is scoped to the contiguous ordered
  block via `TextEdit.renumberOrderedBlock`, applied through `editInsert` (native
  undo reverts in one step), caret restored via `setSelectionRange`.

No new security surface introduced beyond the register.

## Known Stubs

None. List mechanics, auto-renumber, and the live preview pane are fully wired.
Live caret/undo/renumber/preview behavior on real devices is the 46-08 phase gate
(jsdom is blind to caret/selection/execCommand), as designed for this phase.

## Verification

- `npm test` (full suite) → **185/185**, exit 0 (no regression).
- Task 1 source assertions: `grep -c autoFormatEnter` = 2 (≥1 ✓);
  `renumberOrderedBlock` = 2 (≥1 ✓); `indentLine` = 2 (≥1 ✓);
  `beforeinput` = 0 ✓ (keydown-anchored); `setRangeText\|.value =` = 0 ✓.
- Task 2 source assertions: `grep -c MdRender.render` = 5 (≥1 ✓);
  `_noteRendered` = 0 ✓ (preview stores on `_notePreview`); `note-rendered`
  present in rich-toolbar.js (2) and app.css; every `innerHTML` line is either a
  comment or the single `MdRender.render(...)` assignment — no raw-value innerHTML.
- Comment hygiene: zero planning IDs in my additions to rich-toolbar.js and
  app.css (whole-file matches in app.css are all pre-existing Phase 24/39/45
  content, out of scope).
- `node` parse of rich-toolbar.js → OK.

## Self-Check: PASSED

- Both shipped files modified on disk (rich-toolbar.js, app.css) + 4 i18n files ✓
- Implementation commit `a6586bb` present in git history ✓
- Full suite green (185/185) ✓
