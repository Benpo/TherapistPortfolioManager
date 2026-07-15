---
phase: 46-rich-text-toolbar-editor
plan: 11
subsystem: rich-text-editor
tags: [toolbar, preview, snippets, list, keydown, gap-closure]
status: complete
requires:
  - window.RichToolbar mount/onFieldKeyDown/updatePreviewButton (46-03/46-04)
  - window.Snippets popover + handleKeyDown (Phase 24) — bound first, commits synchronously
  - window.TextEdit editInsert + autoFormatEnter/indentLine (46-01)
provides:
  - window.Snippets.isPopoverOpen() — read-only autocomplete open-state accessor
  - a target-state preview toggle (icon + label) on the shared note bar AND the persistent export bar
  - onFieldKeyDown yield so an in-progress snippet accept wins Enter/Tab over list mechanics
affects:
  - 46-14 (real-device gate — labelled eye/pencil toggle on note fields + export; snippet-accept-in-a-list on iPhone)
tech-stack:
  added: []
  patterns:
    - "Target-state control: icon+label+title+aria set together from one open-state flag on the owning bar"
    - "Co-bound keydown arbitration via ev.defaultPrevented (load-bearing) + a read-only open-state accessor (fallback)"
    - "Real-registration-order jsdom regression: bind snippets first, mount toolbar second, drive a genuinely open popover — no open-state stubbing"
key-files:
  created:
    - tests/snippet-enter-yield.test.js
  modified:
    - assets/rich-toolbar.js
    - assets/snippets.js
    - assets/app.css
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "ev.defaultPrevented is the primary yield signal — snippets binds first and its synchronous commit closes the popover before the toolbar handler runs, so an open-state check alone can never see it open at yield time"
  - "toolbar.hidePreview left in place (unused by updatePreviewButton) rather than removed, to avoid four-locale parity churn for no functional gain"
  - "backToEdit label reused across both surfaces via the existing per-bar button resolution (barFor) — one change covers the note fields and the export editor"
metrics:
  duration_min: 8
  completed: 2026-07-15
  tasks: 2
  files: 8
  tests_added: 7
  suite: 188/188
---

# Phase 46 Plan 11: Preview target-state toggle + snippet/list Enter arbitration Summary

Two focused toolbar fixes from the 46-08 gate, shipped together because both
touch `rich-toolbar.js`.

- **Gap 4 — Preview toggle label + icon.** The icon-only eye button was
  ambiguous. The control now shows its TARGET state: an eye + "Preview" while
  editing (click goes to preview), a pencil + "Edit" while previewing (click goes
  back to editing). This renders on BOTH surfaces — the seven focus-attached note
  fields (shared bar) and the persistent export editor bar — because the label is
  built into the one preview button and `updatePreviewButton` updates whichever
  bar currently owns it. In the export Step 2 (which has no right-hand preview
  pane) this eye/pencil toggle IS the only preview affordance, so the label + icon
  swap is what makes it discoverable.

- **Gap 8 — Snippet-accept Enter/Tab no longer fires list auto-continue.** Inside
  a list, accepting a snippet suggestion with Enter used to BOTH expand the
  snippet and continue the list, because snippets and the toolbar each bind a
  bubble-phase keydown on the same textarea. The list auto-continue now YIELDS
  when a snippet accept is in progress; plain Enter (no suggestion open) still
  continues the list. Same arbitration for Tab.

## What Was Built

**Task 1 — target-state preview toggle** (`rich-toolbar.js`, `app.css`,
`i18n-*.js`).
Added a `pencil` icon to the `ICONS` map (same currentColor stroke idiom as the
others). The preview button, built once in `makeButton`, now carries a
`.rich-toolbar-btn-label` span after its icon and a `--labeled` modifier class.
`updatePreviewButton` swaps the leading SVG in place (eye ↔ pencil) and sets the
label, `title`, and `aria-label` together from the single `_previewOpen` flag on
`barFor(_focused || _previewField)`, keeping the existing `.is-active` accent and
`aria-pressed`. New i18n key `toolbar.backToEdit` ("Edit") authored in all four
locales (EN canonical; HE/DE/CS translated). CSS: the labeled button grows to
`width:auto` with inline padding + a 4px icon/label gap while keeping the 44px
mobile touch-target height and the horizontally-scrollable single-row bar.

**Task 2 — Enter/Tab arbitration (TDD)** (`snippets.js`, `rich-toolbar.js`,
`tests/snippet-enter-yield.test.js`).
`snippets.js` gained an additive read-only `isPopoverOpen()` (`return
!!_popoverState`) on its public surface — nothing else in snippet detection,
expansion, popover, or key handling changed (the RTXT-09 danger zone stays
intact). `rich-toolbar.js` `onFieldKeyDown` now yields at the very top: for Enter
or Tab, if `ev.defaultPrevented` OR the snippets popover is open, it returns
before any list mechanics. `ev.defaultPrevented` is the load-bearing signal —
snippets binds first and its synchronous commit has already `preventDefault`'ed
and closed the popover by the time this handler runs, so the open-state check is
only a belt-and-suspenders fallback for a hypothetical registration-order change.

## Yield signal (why defaultPrevented, not open-state)

Both keydown listeners are bubble-phase on the same textarea. Snippets binds
FIRST (its `bindTextarea` runs before `RichToolbar.mount`) and commits
SYNCHRONOUSLY — `preventDefault()` → `commitSelected()` → `hidePopover()` →
`_popoverState = null`. So by the time the toolbar's handler runs the popover is
already closed; only `ev.defaultPrevented` survives to signal that a snippet took
the key. The regression test reproduces this exact ordering rather than stubbing
the accessor.

## Test: real-registration-order regression

`tests/snippet-enter-yield.test.js` (7 cases, jsdom, `runScripts:
'outside-only'`): binds `Snippets` to the textarea FIRST, mounts `RichToolbar`
SECOND, seeds one snippet via an `App.getSnippets` stub, and opens the popover
GENUINELY by typing a partial trigger through a real input event. Cases: the
additive `isPopoverOpen` surface (pure exports preserved); `isPopoverOpen()`
flips true on show and false on Escape; **Enter open** → expansion inserted, no
second marker line; **Enter closed** → the list continues; **Tab open** →
expansion inserted, no indent; **Tab closed on a list line** → indented by two
spaces; and pinned-key parity for `toolbar.backToEdit` across all four locales.
Open-state stubbing is deliberately avoided — a stub-true test would pass while an
open-state-only implementation fails in production. jsdom does not implement
`execCommand`, so the test forces `document.execCommand` to return false, driving
`TextEdit.editInsert`'s splice-plus-input fallback so list continuation is
observable headlessly.

## Deviations from Plan

### Authorized comment-hygiene translation
Per the locked project comment rule, no planning identifiers (RTXT-NN, D-NN,
phase/plan numbers, process words) appear in the shipped files. The plan's
ID-laden wording (e.g. "RTXT-09 danger zone", "Gap 4/8", "the 46-08 gate") was
translated to plain prose in the `rich-toolbar.js` / `snippets.js` / `app.css`
comments and i18n — the constraint kept, the identifiers dropped. Grep of the
added shipped-file lines confirms zero planning IDs. (The test file, which is not
a shipped asset, retains descriptive references.)

### toolbar.hidePreview kept but unused
`updatePreviewButton` no longer reads `toolbar.hidePreview` (it now uses
`toolbar.backToEdit` for the previewing state). The `hidePreview` key was left in
all four locales rather than removed — dropping it would mean a four-file edit for
no functional gain and risks locale drift. [Rule 1 — cleaner equivalent]

## Known Stubs

None. Both fixes are live and exercised by 7 green jsdom cases; the full suite
passes.

## Threat Flags

None. No new network endpoints, auth paths, file access, or schema changes. The
only added surface is a read-only in-memory accessor (`isPopoverOpen`) and a
CSS/i18n/label change.

## Verification

- `node tests/snippet-enter-yield.test.js` → 7/7, exit 0 (Enter + Tab, open +
  closed branches, isPopoverOpen state flips, pinned-key parity; no open-state
  stubbing; real registration order).
- `node --check assets/rich-toolbar.js`, `assets/snippets.js`, and all four
  `i18n-*.js` → parse OK.
- `node tests/run-all.js` → **188/188**, exit 0 (187 baseline + 1 new file, zero
  regression).
- Comment hygiene: grep of added shipped-file lines for planning IDs → CLEAN.
- Real-device confirmation (labelled eye/pencil toggle on note fields AND export;
  snippet-accept-in-a-list on iPhone) is the 46-14 gate — jsdom is blind to real
  caret behaviour and touch rendering.

## Self-Check: PASSED

All artifacts exist on disk; all three task commits present in git history.
