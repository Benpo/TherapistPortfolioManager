---
phase: 46-rich-text-toolbar-editor
reviewed: 2026-07-15T05:42:06Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - add-session.html
  - assets/add-session.js
  - assets/app.css
  - assets/changelog-content-en.js
  - assets/export-modal.js
  - assets/fonts/rubik-italic-base64.js
  - assets/help-content-en.js
  - assets/i18n-cs.js
  - assets/i18n-de.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/pdf-export.js
  - assets/snippets.js
  - assets/rich-toolbar.js
  - assets/text-edit.js
  - assets/version.js
  - sw.js
findings:
  critical: 1
  warning: 0
  info: 3
  total: 4
status: issues_found
---

# Phase 46: Code Review Report

**Reviewed:** 2026-07-15T05:42:06Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 46 ships a rich-text toolbar (`window.RichToolbar`) over the 7 add-session
note fields and the export Step-2 editor, an undo-safe `window.TextEdit` module
(execCommand chokepoint + pure transforms + a module-owned undo/redo stack),
list auto-format/renumber, per-field live preview, an export Step-2 redesign
(single editor, maximize toggle), a true-italic PDF font, and an emotions
before/after export opt-out.

The engineering quality is high. The wiring is sound in most of the review
angles that matter: script load order (`text-edit` → `rich-toolbar` →
`export-modal`/`add-session`) is correct; the SW precache list gains all three
new shipped assets with no orphan entries; every i18n key referenced from JS
(`toolbar.*`, `export.*`, `session.export.heartWall.*`) is present in all four
locales; the removed two-pane export keys and their CSS (`.export-preview`,
`.export-mobile-tabs`, `.export-pane-label`, `.export-format-help`, `.tab-btn`)
are fully deleted with no dangling references; the XSS surface is intact (the
preview pane's sole `innerHTML` writer is `MdRender.render`, escape-first, and
the empty-state uses `textContent`); the PDF italic segment model
(`{text,bold,italic}`) propagates the flag correctly through
`clipSegmentsToRange` and `drawSegmentedLine`; and the Enter/Tab-yield
arbitration (`defaultPrevented`-primary with an `isPopoverOpen()` fallback)
correctly handles both listener-registration orders. No new planning-ID comments
were introduced into shipped files.

There is one correctness defect that must be fixed before ship: the module-owned
undo stack seeds its baseline snapshot at mount time and is never re-seeded when
a field is bulk-populated by direct `.value =` assignment, so the first undo in
two common flows silently wipes loaded content back to empty.

## Critical Issues

### CR-01: Undo baseline is stale after programmatic population — first undo wipes loaded content to empty

**File:** `assets/text-edit.js:399-409` (`undoTrack`), `assets/add-session.js:237` + `assets/add-session.js:1841-1851` (`populateSession`), `assets/export-modal.js` (`editor.value = md` on Next; `editor.value = ""` on open)

**Issue:**
`RichToolbar.mount()` calls `window.TextEdit.undoTrack(field)` once, at
DOMContentLoaded / export-modal init, capturing the field's value **at that
moment** as the baseline snapshot (`snaps = [{ value: "" }]`). Both editors are
then populated later by **direct `.value =` assignment**, which fires no `input`
event and never re-seeds the history:

- **Add-session note fields:** `mount` runs synchronously at line 237; when
  editing an existing session, `populateSession` (line 1375, after
  `await getSession`) sets `trappedEmotions.value`, `comments.value`,
  `insights.value`, `customerSummary.value`, `limitingBeliefs.value`,
  `additionalTech.value` directly (lines 1841-1851). The undo baseline stays `""`.
- **Export Step-2 editor:** the persistent mount seeds the baseline on the empty
  static `#exportEditor` once at init; each `onNext` sets `editor.value = md`
  directly. The baseline stays `""` and is never reset across dialog opens.

Because the first `input` after load hits `undoNoteInput` with
`H.lastKind === null`, `shouldOpenBoundary` returns `false`
(`text-edit.js:366-372`), so the loaded pre-edit content is **never sealed as a
snapshot**. The user's first typed burst coalesces into a single step whose undo
target is the stale empty baseline. Trace (loaded field value = `notes`):

1. Load: `snaps = [{value:""}]`, `ptr = 0`, `pending = {value:""}`, `lastKind = null`.
2. User types `x` → `undoNoteInput("insertText")` → `shouldOpenBoundary` false → no seal; `pending = {notes+"x"}`.
3. User presses Ctrl+Z → `undo()` seals `live` (`notes+"x"`) → `ptr = 1` → `ptr--` → `0` → restores `snaps[0] = {value:""}`.

**The very first undo (keyboard or the toolbar undo button) erases the entire
loaded note/document to empty** instead of removing the last edit. Redo can
recover it only if no further edit drops the redo tail; the export editor also
suffers cross-open undo bleed (an old export's snapshots survive into the next
dialog open). This is surprising, silent, in-editor data loss on a core gesture
this phase shipped.

**Fix:** Re-seed the module baseline after any programmatic bulk population, so
the loaded content is the undo floor. Either re-call the existing `undoTrack`
(it already resets `snaps`/`ptr`/`pending` to the current value) or add a thin
`undoReset` alias, and invoke it at the population sites:

```js
// text-edit.js — expose a reset (undoTrack already does exactly this)
undoReset: undoTrack,   // add to the public surface

// add-session.js — after populateSession's note-field assignments
["trappedEmotions","sessionComments","sessionInsights","customerSummary",
 "limitingBeliefs","additionalTech"].forEach(function (id) {
  var el = document.getElementById(id);
  if (el && window.TextEdit && window.TextEdit.undoReset) window.TextEdit.undoReset(el);
});

// export-modal.js — right after `editor.value = md;` (and the `editor.value = ""` reset on open)
if (editor && window.TextEdit && window.TextEdit.undoReset) window.TextEdit.undoReset(editor);
```

(Note: the stale comment at `add-session.js:1388`, "populateSession's value
writes trigger 'input' events", is factually wrong — direct `.value =` fires no
`input` event — and is the mental model that hid this gap. Correcting it would
prevent regressions.)

## Info

### IN-01: `weightByLogical` is dead code after the style refactor in `drawSegmentedLine`

**File:** `assets/pdf-export.js:1082,1090`
**Issue:** The italic refactor replaced weight-based run collection with
`styleByLogical` (0=normal/1=bold/2=italic). `weightByLogical` is still allocated
(`new Uint8Array(line.length)`) and filled in the per-segment loop, but is never
read again — `styleByLogical` fully subsumes it. Beyond the wasted per-line
allocation, it is a maintenance trap: a future reader may edit `weightByLogical`
expecting it to drive rendering.
**Fix:** Delete the `var w = seg.bold ? 1 : 0;`, the `weightByLogical`
declaration, and the `weightByLogical[off + k] = w;` write; keep only
`styleByLogical`.

### IN-02: `RegExp.$1` static used to read the active heading level

**File:** `assets/rich-toolbar.js:462`
**Issue:** `var activeLevel = /^(#{1,3})\s/.test(line) ? RegExp.$1.length : 0;`
relies on the global `RegExp.$1` static set by `.test()`. It works here because
the read is synchronous and immediately follows the test, but `RegExp.$1` is
fragile (any intervening regex clobbers it) and is a deprecated idiom
inconsistent with the explicit capture-group `.exec()` used elsewhere in the
same file.
**Fix:** `var hm = /^(#{1,3})\s/.exec(line); var activeLevel = hm ? hm[1].length : 0;`

### IN-03: Undo/redo marks the export editor "dirty", forcing a discard prompt on a returned-to-pristine document

**File:** `assets/export-modal.js` (`onEditorInput` sets `hasEditedPreview = true`)
**Issue:** Toolbar/keyboard undo and redo apply through the `editInsert`
chokepoint, which fires a real `input` event that `onEditorInput` observes,
setting `hasEditedPreview = true`. Undoing all edits back to the generated
markdown still leaves the export flagged dirty, so closing prompts an
unnecessary discard confirmation. Minor UX only; content integrity is unaffected.
**Fix:** Optional — compare the editor value against the last generated markdown
before flagging dirty, or accept the current behavior as a conservative
"you touched it" signal.

---

_Reviewed: 2026-07-15T05:42:06Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
