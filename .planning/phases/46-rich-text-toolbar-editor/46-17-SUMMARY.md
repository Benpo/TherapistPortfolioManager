---
phase: 46-rich-text-toolbar-editor
plan: 17
subsystem: export-editor-toolbar
tags: [js, rich-toolbar, export, preview, dispatch, focus, webkit-probe, jsdom, gap-closure]
status: complete
requires:
  - phase: 46-15
    provides: persistent export toolbar pinned inside the overflow-y:auto edit area (sticky + flex-shrink:0)
  - phase: 46-11
    provides: labelled Preview/Edit toggle on the persistent export toolbar
provides:
  - Persistent-bar controls (bold/italic/lists/heading/indent/outdent/undo/redo/preview) that apply on the FIRST click with no prior editor focus (Gap 12)
  - Export preview that reveals its rendered pane BELOW the pinned toolbar instead of opening under the fold (Gap 13)
  - Per-action focus split — formatting/undo/redo/heading focus the field (cold caret at end-of-document when never focused); preview stays view-only (no focus, no soft-keyboard pop)
  - RED-first jsdom test (persistent-bar dispatch) + RED-first WebKit probe assertion set E, both proven RED→GREEN
affects: [46-16 (real-device human-verify gate — items 13b/13d/13e re-confirm first-click controls, no-soft-keyboard, note-field preview unchanged)]
tech-stack:
  added: []
  patterns:
    - "Resolve a click's target from the clicked control's OWN toolbar via a bar→field reverse WeakMap (the reverse of the field→bar _persistentBars map) so a persistent, always-visible control never depends on prior focus"
    - "Set module focus state DIRECTLY (focus + dockTo) rather than relying on the focusin side-effect, which is not guaranteed to fire in every engine"
    - "Anchor a deterministic caret at end-of-document (setSelectionRange(len,len)) ONLY when the field has NEVER been focused — tracked by an _everFocused WeakSet recorded in dockTo, NOT by live activeElement (a blurred textarea retains its selection, so a focused-then-blurred caret is preserved); any real selection (start !== end) is left intact"
    - "Reveal a below-fold pane by scrolling its scroll container by a bar-height-offset computed from live getBoundingClientRect deltas (container.scrollTop += paneTop - barBottom - gap) — never a bare scrollIntoView (which aligns to the container top, under a sticky bar); vertical-only, hence RTL-safe"
key-files:
  created:
    - tests/46-persistent-bar-dispatch.test.js
    - .planning/phases/46-rich-text-toolbar-editor/46-17-SUMMARY.md
  modified:
    - assets/rich-toolbar.js
    - tests/webkit/46-export-step2-layout.mjs
decisions:
  - "bar→field resolution mechanism: a new _barField WeakMap keyed by the dedicated bar element → its field, recorded in ensurePersistentBar (deleted in unmount). _dispatch reads el.closest('.rich-toolbar'); a shared-bar control resolves to no barField and falls through to _focused unchanged (byte-identical shared path)"
  - "Per-action focus split lives at the top of _dispatch: for every action EXCEPT preview, focus the bar's field + dockTo + cold-caret; for preview, togglePreview(barField) resolves the field WITHOUT focusing (view-only — must not pop the iOS soft keyboard). togglePreview gained an optional field param; the shared bar still calls it with no arg (falls back to _focused)"
  - "Gap-13 reveal uses live rect deltas, NOT raw pane.offsetTop: .export-edit-area is position:static, so it is not the pane's offsetParent and a raw offsetTop would not be container-relative. paneRect.top - barRect.bottom - gap is exactly the container-relative offset minus the bar height, computed robustly against any offsetParent"
  - "Reveal is scoped by ta.closest('.export-edit-area'): note fields resolve no container and take NO scroll (their page grows naturally, no fold). Reveal fires only inside openPreview (explicit preview-open), so a stale-open pane never scrolls on Step-2 entry; no scroll-restore on close (container's natural scrollTop clamp re-reveals the editor)"
  - "No CSS/i18n/sw.js/APP_VERSION change (stays 1.4.0). These fix behaviour already documented for v1.4.0 (persistent toolbar + export preview), so no help/changelog rewrite and no new docs-gate trailers; the EN help (04ced54) + EN changelog (8cd345e) edits already in origin/main..HEAD satisfy both demands"
metrics:
  duration_min: 30
  completed: 2026-07-15
  tasks: 3
  files: 3
  suite: 191/191
---

# Phase 46 Plan 17: Persistent-Bar Dispatch + Export Preview Reveal Summary

Round-3 gap fix for Phase 46. Two scoped JS changes to `assets/rich-toolbar.js` make every persistent-export-toolbar control work on its first click (Gap 12) and make Preview reveal its pane below the pinned bar (Gap 13), while keeping all seven note-field behaviours byte-identical — proven RED→GREEN by a new jsdom unit test and a new WebKit probe assertion set.

## What was built

- **Gap 12 (dispatch target).** `_dispatch(action, el)` now resolves the clicked control's owning bar (`el.closest('.rich-toolbar')`) and, via a new `_barField` bar→field reverse WeakMap, the field that bar serves. For formatting/undo/redo/heading it focuses that field and sets module focus directly (`dockTo`), anchoring a deterministic caret at end-of-document ONLY when the field has NEVER been focused — genuine first-touch tracked by an `_everFocused` WeakSet recorded in `dockTo` (R3 WR-01: a blurred textarea retains its selection, so a focused-then-blurred mid-document caret is preserved; a real selection is left intact). For **preview** it resolves the field WITHOUT focusing it (view-only). A shared-bar control resolves to no `barField` and falls through to `_focused` — the shared path is byte-identical.
- **Gap 13 (preview reveal).** `openPreview` calls a new `revealPreviewPane(ta, pane)` that, only when `ta` lives inside `.export-edit-area`, scrolls that container so the pane top clears the sticky bar — offset by the bar height, computed from live rects (`container.scrollTop += paneTop − barBottom − gap`). Note-field preview resolves no container and takes no scroll.

## RED evidence (against current source)

**jsdom — `node tests/46-persistent-bar-dispatch.test.js` (exit 1):**
```
PASS  public surface: mount / unmount / refreshButtonState remain functions
FAIL  Case A: persistent Bold applies on first click with no prior focus   ('text' !== '**text**')
FAIL  Case B: persistent Preview opens the pane ... does NOT focus the field (a preview pane was created ...)
PASS  Case C: focused shared field still dispatches; persistent field NOT mis-targeted
FAIL  Case D: persistent Heading (open dropdown → H1) ...  (the heading dropdown opened and exposes the H1 item)
FAIL  Case E: ... action lands at end-of-document (cold caret)  ('cold' !== 'cold****')
46-persistent-bar-dispatch: 2 passed, 4 failed
```
Cases A, B, D, E FAIL (dispatch returns early on null `_focused`); Case C + surface guard PASS — exactly as specified.

**WebKit probe — `node tests/webkit/46-export-step2-layout.mjs` (exit 1):**
```
[1440x820 EN preview-reveal] E (preview reveal, no prior focus):
  FAIL  ... E1 preview opened on first click with no prior focus (Gap 12)  → preview did not open on first click — Gap 12
  FAIL  ... E2 preview pane revealed below the pinned bar (bar-relative)    → pane absent — cannot verify reveal
2 ASSERTION(S) FAILED — export Step-2 layout gate RED.
```
Set E RED (E1/E2 fail, pane absent — E2 is bar-relative); assertions A–D and passes 1–3 all PASS.

## GREEN evidence (after the fix)

- **jsdom:** `46-persistent-bar-dispatch: 6 passed, 0 failed` (exit 0) — Cases A/B/C/D/E + surface guard all GREEN.
- **WebKit probe:** `ALL ASSERTIONS PASSED — export Step-2 layout gate GREEN.` (exit 0) — A–D at passes 1–3 AND E1/E2 at Pass 4, E2 bar-relative.
- **Full suite:** `Suite: 191 passed, 0 failed, 191 total` (190 prior + the new test), exit 0 — `snippet-enter-yield.test.js` and the note-field tests still pass (shared-bar byte-identical guard).

## Shared-bar byte-identity + note-field confirmation

- The shared note-field bar is `_toolbarEl`, which is NOT a key in `_barField`, so a shared-bar control resolves `barField = null` and takes the unchanged `var ta = _focused` path — no focus-state, caret, or dispatch change. Case C proves the shared field still wraps AND the persistent field is not mis-targeted.
- Note-field preview resolves no `.export-edit-area` container in `revealPreviewPane`, so it takes NO scroll action (its page grows naturally). `togglePreview()` called with no arg for the shared bar still falls back to `_focused`.

## Constraints honoured

- No CSS / i18n / `sw.js` change; `APP_VERSION` stays `1.4.0` (grep-confirmed).
- No planning identifiers in the shipped `rich-toolbar.js` comments; no logical inline-inset literal introduced (both grep-clean).
- Only `assets/rich-toolbar.js` among shipped files changed; the two test files live under `tests/` (unwatched).
- No `git push`, no `--no-verify`.

## Deviations from Plan

None — plan executed exactly as written. The Gap-13 reveal uses live rect deltas rather than a raw `pane.offsetTop` literal because `.export-edit-area` is `position:static` (not the pane's offsetParent); this is the plan's intent ("offset by the bar height, no bare scrollIntoView") computed robustly, and is documented in the shipped comment and the decisions above.

## NOT in this round (carried forward)

- No reveal on Step-2 entry (fires only on explicit preview-open); no scroll-restore on preview close (46-16 item 13c watches it).
- Keyboard shortcuts (Ctrl/Cmd+B/I, Ctrl/Cmd+Z/Y) stay focus-dependent — only the persistent-bar BUTTONS became focus-independent.
- The residual ~8px cosmetic gap under the pinned bar (46-15 NOT-list, item 12h) is untouched.
- Real-device confirmation of gaps 12/13 (MacBook + iPhone PWA + Hebrew) is the amended 46-16 human gate (item 13) — NOT touched here.

## Review fix round (R3 — 46-REVIEW-R3.md)

The R3 deep review of the three commits found 0 critical / 1 warning / 2 info; all three fixed:

- **WR-01 (fixed, `8760f1f` + `58c08d7`):** the cold-caret anchor was keyed on `document.activeElement !== barField`, which is also true for a focused-then-BLURRED field whose textarea retains its mid-document caret — the anchor silently relocated it to end-of-document. Now keyed on a new `_everFocused` WeakSet (recorded in `dockTo`, the single point every focus path routes through): the anchor fires only on a genuinely never-focused field. RED-first falsifier landed as jsdom **Case F** (focus → caret at 2 → blur → Bold via the bar): RED against the pre-fix guard (`'ab cd****'` — relocated to end) → GREEN (`'ab**** cd'` — preserved caret). Shipped comment tightened to state exactly the enforced constraint.
- **IN-01 (fixed, `58c08d7`):** `revealPreviewPane`'s no-layout guard now keys on the container alone (`!areaRect.height`) — the surface whose layout the scroll math depends on.
- **IN-02 (fixed, `8760f1f`):** jsdom Case B asserts the pane's textContent contains the field value; the probe gained **E3** (pane text contains `'Line 1'` from the setup fill) — an empty/stale pane can no longer pass on presence/visibility/aria alone.

Post-round: jsdom 7/7, suite 191/191 (Case F extends the existing file — no new file), WebKit probe GREEN A–E incl. E3.

## Self-Check: PASSED

- `tests/46-persistent-bar-dispatch.test.js` — FOUND (exit 0, 7/7 after R3 round).
- `assets/rich-toolbar.js` — FOUND (modified, node --check OK).
- `tests/webkit/46-export-step2-layout.mjs` — FOUND (exit 0, A–E green incl. E3).
- Commits `056a02a`, `5335bec`, `8581529`, `8760f1f`, `58c08d7` — present in git log.
