---
phase: 46-rich-text-toolbar-editor
reviewed: 2026-07-15T17:40:00Z
depth: deep
round: 3
scope: "commits 8581529 (rich-toolbar.js fix) + 056a02a (jsdom dispatch test) + 5335bec (WebKit probe set E)"
files_reviewed: 3
files_reviewed_list:
  - assets/rich-toolbar.js
  - tests/46-persistent-bar-dispatch.test.js
  - tests/webkit/46-export-step2-layout.mjs
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 46 (gap round 3): Code Review Report — R3

**Reviewed:** 2026-07-15T17:40:00Z
**Depth:** deep (whole-module trace of rich-toolbar.js + both new tests, cross-checked against export-modal mount and R2 CSS invariants)
**Files Reviewed:** 3
**Status:** issues_found (no blockers)

## Summary

Reviewed the gap-round-3 fix for the persistent export toolbar — the whole
`rich-toolbar.js` module in context (dispatch, focus tracking, preview machinery,
heading menu, persistent-bar docking, unmount), not just the hunks — plus the new
jsdom dispatch test and the WebKit probe's set E. The stated design contract was
checked against the implementation rather than trusted.

**The core fix is sound and the shared note-field path is genuinely untouched.**
I traced every angle the dispatch brief named:

- **`_barField` reverse map (bar→field):** recorded in `ensurePersistentBar`
  (line 258) only when a dedicated bar is first built (`if (!bar)` — idempotent, so
  a double `mount()` for the same field cannot build a second bar or a stale link),
  and deleted in `unmount` (line 873) before the `_persistentBars` entry. The
  probe's defensive re-mount (`setupExportStep2` line 186-189) guards on the bar
  already existing, so it is a no-op when boot already mounted; even if it did
  re-enter, `_bound.has(ta)` (line 827) short-circuits before the persistent block.
  No path leaves a stale mapping. WeakMap keys are the DOM nodes, so an orphaned
  old bar/field pair is GC-eligible. **Clean.**
- **Dispatch resolution order:** `el.closest('.rich-toolbar')` (line 675) resolves
  the *clicked control's own* bar. Heading-menu items live in `document.body`
  (line 485) and never call `_dispatch` — they capture `ta = _focused` at open time
  (line 455), and `_dispatch` has already set `_focused = barField` via `dockTo`
  before opening the menu, so a persistent heading dispatches through the captured
  export field, not a stale note field. A shared-bar control resolves `barField =
  null` (the shared `_toolbarEl` is never in `_barField`) and falls through to
  `_focused` byte-identically. A persistent control can **never** fall through to a
  stale `_focused`, because the `if (barField)` block sets `_focused` first. The
  preview pane is `.rich-toolbar-preview` (not `.rich-toolbar`) so `closest` can
  never mis-resolve through it. **Correct.**
- **Reveal math (Gap 13):** `renderPreview(ta)` runs *synchronously* inside
  `openPreview` (line 613) before `revealPreviewPane` (line 615), so the pane is
  filled and `getBoundingClientRect` forces a layout flush — there is **no race**
  with the 120 ms `schedulePreviewRender` debounce (which only serves later typing)
  and the pane is never measured at height 0. The delta `(paneRect.top −
  barRect.bottom) − GAP` lands the pane top at `barBottom + 8`; because the export
  bar is `position: sticky` (R2 CSS), `barRect.bottom` is invariant under the
  container scroll, so the single `scrollTop += delta` is correct even if the
  container was already scrolled. Scroll is vertical-only → RTL-safe. Note fields
  resolve no `.export-edit-area` container (line 631) and take no scroll, honoring
  the contract. **Correct.**
- **Preview-without-focus:** `togglePreview(barField)` returns before any
  `.focus()`, so the iOS soft keyboard never pops; `refreshButtonState` early-returns
  on null `_focused` (line 431, no crash); `updatePreviewButton` falls back to
  `_previewField` for the bar (line 586); `dockTo` keeps the preview open when the
  same field is later focused (`_previewField === textarea`, line 271). **Consistent.**
- **Probe set E + jsdom test quality:** both drive a *real* `mousedown` (the toolbar
  binds mousedown, not click) rather than calling `_dispatch` directly; E1 guards
  the pane's existence and E2 fails explicitly ("pane absent") when it is missing, so
  neither vacuously passes; `assertUniqueSelectors` runs at the top of Pass 4; E2 is
  bar-relative so a forbidden `scrollIntoView` (pane under the pin) cannot pass; Case
  C is a genuine regression guard (a shared-path break would either leave `taS`
  unwrapped or mis-target `taP`). **Non-vacuous.**
- **Hygiene:** no planning IDs / Gap-NN / TODO in the shipped file (grep clean);
  public surface unchanged; no CSS/i18n/sw.js/APP_VERSION touch.

One warning follows: a caret-anchoring guard whose runtime condition is broader than
its own comment claims, producing a reachable caret-clobber on the export editor.
Two info-level test-coverage/robustness nits.

## Warnings

### WR-01: Cold-caret guard fires on any *not-currently-focused* field, not only a *never-focused* one — relocates a real collapsed caret to end-of-document (and the comment overstates the guard)

**Status:** FIXED — commits `8760f1f` (falsifier) + `58c08d7` (fix) (2026-07-15).
Genuine first-touch is now tracked in an `_everFocused` WeakSet recorded in
`dockTo` (the single point every focus path — real focusin AND dispatch-driven
focus — routes through); the anchor keys on `!_everFocused.has(barField)` plus the
collapsed-selection condition, and the comment now states exactly that constraint
(a blurred textarea retains its selection, so a focused-then-blurred caret is
preserved). The missing falsifier landed RED-first as jsdom Case F (focus →
mid-document caret → blur → Bold via the bar → edit at the preserved caret): RED
against the pre-fix guard (`'ab cd****'` — relocated to end), GREEN after.

**File:** `assets/rich-toolbar.js:688-692` (guard) and the comment at `684-687`

**Issue:** The formatting/heading branch anchors a deterministic caret at
end-of-document under this condition:

```js
if (document.activeElement !== barField &&
    barField.selectionStart === barField.selectionEnd) {
  var len = barField.value.length;
  try { barField.setSelectionRange(len, len); } catch (e) { /* detached */ }
}
```

The comment directly above states this happens *"when the field was never focused"*.
That is not what the code tests. `document.activeElement !== barField` is true for a
field that was **focused earlier and then blurred** — and a blurred `<textarea>`
retains its `selectionStart/selectionEnd`. So the real, reachable sequence on the
export editor (the only persistent field) is:

1. User focuses `#exportEditor`, types, places a collapsed caret mid-document.
2. User clicks any control that does *not* `preventDefault` its mousedown — the
   export step's Back/close/other buttons, or empty modal chrome — which blurs the
   editor while preserving the mid-document caret.
3. User returns and clicks **Bold** (or a list / heading / indent) on the always-
   visible persistent bar.

Now `activeElement !== barField` (blurred) **and** the caret is collapsed, so the
guard silently moves the caret to `value.length` and inserts the marker pair at the
**end of the document** instead of at the user's caret. The user's insertion point is
lost and the edit lands in the wrong place. It is undoable (not data loss), so this is
a warning, not a blocker — but it is a genuine correctness regression in a reachable
flow, and it is exactly the "comment states a constraint the code does not enforce"
pattern this module has shipped before. The jsdom Case E cannot catch it because a
never-focused field and a focused-then-blurred-to-0,0 field are indistinguishable to
its assertion (`value.length` anchor coincides only when the retained caret is at 0).

**Fix:** Track *genuine* first-touch instead of using live focus as a proxy, so a
returning user's caret is preserved:

```js
// module state
var _everFocused = new WeakSet();
// in onFieldFocusIn (or dockTo): _everFocused.add(textarea);

// in _dispatch, replace the guard:
if (!_everFocused.has(barField) &&
    barField.selectionStart === barField.selectionEnd) {
  var len = barField.value.length;
  try { barField.setSelectionRange(len, len); } catch (e) { /* detached */ }
}
```

Then correct the comment to state the enforced constraint precisely ("only when the
field has *never* received focus in this mount", not "not currently focused"). If the
`_everFocused` set is added, also add a jsdom case that focuses the persistent field,
sets a mid-document caret, blurs it, then clicks Bold and asserts the marker lands at
the caret — the missing falsifier for this exact bug.

## Info

### IN-01: `revealPreviewPane` no-layout guard requires BOTH rects to be zero-height, so it does not actually express "no layout"

**Status:** FIXED — commit `58c08d7` (2026-07-15). The guard now keys on the
container alone (`if (!areaRect.height) return;`) — the area is the surface that
must have layout for the scroll math to be valid — with the comment updated to say
exactly that.

**File:** `assets/rich-toolbar.js:638` (`if (!paneRect.height && !areaRect.height) return;`)

**Issue:** The guard's intent (per its comment: "no layout — e.g. headless jsdom") is
to skip the scroll when there is no layout engine. But `&&` only returns when *both*
the pane and the area measure zero height. If a real layout ever yields a zero-height
pane inside a non-zero area (e.g. a transiently collapsed preview element), the guard
falls through and `delta` is computed from a `paneRect.top` that may not yet be
meaningful. It is harmless today — the pane always renders the empty-state block or
real content before this runs, so its height is > 0 — but the condition does not match
its stated meaning. Prefer keying the guard on the container/area, which is the
surface that must have layout for the scroll to be valid:

```js
if (!areaRect.height) return; // no layout (e.g. headless jsdom)
```

### IN-02: Preview tests assert pane presence/visibility/aria but never that the pane rendered the field's content

**Status:** FIXED — commit `8760f1f` (2026-07-15). jsdom Case B now asserts the
pane's textContent contains the field value (`/hello/`), and the WebKit probe
gained assertion E3 (`paneText` contains `'Line 1'`, the marker from the
setupExportStep2 fill) — an empty or stale pane can no longer pass either gate.

**File:** `tests/46-persistent-bar-dispatch.test.js:116-128` (Case B) and
`tests/webkit/46-export-step2-layout.mjs:388-417` (set E)

**Issue:** Both preview assertions check that a pane exists, is not `is-hidden`, and
that `aria-pressed="true"`. Neither asserts the pane's rendered output reflects the
field value. A regression that opened an **empty or stale** preview pane (e.g. a
`renderPreview` that no-oped, or rendered the wrong field) would pass both gates. This
is a coverage nit, not a defect in shipped code — but since the whole point of the
view-only preview is to show the field's formatted text without focusing it, one
assertion tying the pane's text to the input closes the gap:

```js
// Case B, after the pane checks:
assert.ok(/hello/.test(taP._notePreview.textContent),
  'the preview pane rendered the field value');
```

---

_Reviewed: 2026-07-15T17:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep · Round: 3_
