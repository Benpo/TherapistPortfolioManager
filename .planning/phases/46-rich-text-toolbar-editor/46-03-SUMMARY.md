---
phase: 46-rich-text-toolbar-editor
plan: 03
subsystem: rich-text-editor
tags: [toolbar, focus-attached, undo-redo, i18n, rtl, chrome]
status: complete
requires:
  - window.TextEdit (46-01 — editInsert chokepoint + toggleWrap/insertListMarker/applyHeading/indentLine/outdentLine transforms)
  - .header-icon-btn currentColor SVG idiom (app.css ~4235)
  - snippets.js mousedown+preventDefault focus-preservation precedent (lines 336-341)
  - --z-popover:360 layer; semantic tokens in tokens.css
provides:
  - window.RichToolbar (shared, additively-mountable focus-attached formatting toolbar)
  - .rich-toolbar CSS chrome (app.css) + toolbar.* i18n keys (EN/DE/HE/CS)
affects:
  - 46-04 (adds list auto-format keyboard mechanics + the live preview pane to the SAME module; the "preview" button already exists here as a no-op)
  - 46-05 (mounts RichToolbar onto the 7 add-session note fields)
  - 46-06 (mounts RichToolbar onto #exportEditor — second additive mount() must not kill 46-05's fields)
tech-stack:
  added: []
  patterns:
    - "Vanilla IIFE window.* module with a four-slot banner (OWNS/PUBLIC SURFACE/DEPENDENCIES/CONSTRAINTS), mirroring snippets.js + text-edit.js"
    - "ONE shared toolbar element docked IN FLOW via insertAdjacentElement('beforebegin', field) — rides scroll/resize/autogrow with zero coordinate math"
    - "mousedown+preventDefault on EVERY control (focus preservation) — precondition for native execCommand undo/redo + editInsert caret math"
    - "Additive mount via Set/WeakMap — repeated disjoint-set mounts all stay live"
    - "Physical getBoundingClientRect left/top for the heading popover ONLY (RTL-safe; never rect-derived logical inline insets)"
key-files:
  created:
    - assets/rich-toolbar.js
  modified:
    - assets/app.css
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "execCommand('undo'/'redo') written with SINGLE quotes so the plan's source-assertion grep matches real code, not just a comment (mirrors 46-01's quote-style alignment)"
  - "The literal logical-inline-inset token is kept out of rich-toolbar.js (described, never named) so the plan's zero-count grep stays green while the RTL rule is still documented"
  - "tokens.css intentionally NOT modified — every referenced semantic token resolved, so the plan's reuse-first clause held (no new color introduced)"
  - "Heading menu labels use friendly 'Heading 1/2/3' + 'Regular text' (naming = executor discretion); the font-size preview per item carries the register"
metrics:
  duration_min: 9
  completed: 2026-07-14
  tasks: 2
  files: 6
  suite: 185/185
---

# Phase 46 Plan 03: RichToolbar — focus-attached formatting toolbar Summary

Built `window.RichToolbar` (`assets/rich-toolbar.js`): the single, shared,
additively-mountable formatting toolbar that docks in flow above whichever
registered note field has focus and hides when none is. It carries the full
icon-only control set (bold, italic, bullet/numbered lists, a "Text ▾" heading
dropdown, indent/outdent, undo/redo, preview) as thin wiring over the tested
46-01 `TextEdit` transforms, with desktop-only Ctrl/Cmd+B/I shortcuts, native
`execCommand` undo/redo, caret-reactive active state, and EN/DE/HE/CS tooltips.
List auto-format keyboard mechanics and the live preview pane land in 46-04 (same
module); mounting onto real fields lands in 46-05/46-06.

## Public Surface (stable contract for 46-04/46-05/46-06)

| Method | Signature | Notes |
|--------|-----------|-------|
| `mount` | `(textareas, config)` | **ADDITIVE.** Registers each `<textarea>` into a shared `Set`/`WeakMap`; repeated calls with disjoint sets all stay live (a 2nd mount never discards earlier fields). `config.headings` (boolean) gates the Text-style dropdown; first mount builds the one shared toolbar DOM. Accepts a NodeList or Array. |
| `unmount` | `()` | Removes all focus/keydown listeners, detaches + drops the toolbar element, unbinds the document `selectionchange` listener. |
| `refreshButtonState` | `()` | Recomputes bold/italic/list/heading `.is-active` from the focused field's caret/selection. Auto-invoked on `selectionchange` (rAF-coalesced) and after every edit. |

**Config:** `{ headings: boolean }` — both call sites (46-05 note fields, 46-06
export editor) pass `headings: true`, so one shared config suffices.

**CSS class names (app.css):** `.rich-toolbar` (`.is-hidden` when no field
focused), `.rich-toolbar-group`, `.rich-toolbar-sep`, `.rich-toolbar-btn`
(`.is-active` accent state), `.rich-toolbar-heading` / `.rich-toolbar-heading-trigger`
/ `.rich-toolbar-heading-label`, `.rich-toolbar-heading-menu` (fixed popover) +
`.rich-toolbar-heading-item` (`--h1`/`--h2`/`--h3`/`--p` register modifiers,
`.is-active`). Chrome consumes existing tokens only (`--color-surface`,
`--color-border`, `--color-text`, `--color-primary`, `--color-primary-soft`,
`--color-surface-hover`, `--shadow-nav`, `--z-popover`).

**i18n keys (17, all in EN/DE/HE/CS):** `toolbar.aria`, `toolbar.bold`,
`toolbar.italic`, `toolbar.bulletList`, `toolbar.numberedList`,
`toolbar.textStyle`, `toolbar.textStyleShort`, `toolbar.indent`,
`toolbar.outdent`, `toolbar.undo`, `toolbar.redo`, `toolbar.preview`,
`toolbar.hidePreview`, `toolbar.heading1/2/3`, `toolbar.regularText`. Italic EN
copy is the base form `Italic (Ctrl+I)` (the D-14 upright-in-PDF clause, if any,
is appended by 46-06 only if 46-02 fell back).

## What Was Built

**Task 1 — chrome + focus tracking + in-flow docking (`4d16016`).** The IIFE with
its four-slot banner; one shared toolbar element built once (icon SVGs stroke
`currentColor`, borrowing `.header-icon-btn`); groups separated by hairline
`.rich-toolbar-sep`. Focus preservation: `bindPreserveFocus` binds `mousedown` +
`ev.preventDefault()` on EVERY control (buttons, heading trigger, and — Task 2 —
each menu item), bound unconditionally so macOS desktop Safari (which doesn't
focus buttons on click) can't false-pass. On `focusin` of any registered field
the bar is relocated via `insertAdjacentElement('beforebegin', field)` so it
rides layout on scroll/resize/autogrow with zero coordinate math; `focusout` of
the whole registered set hides it (deferred so a focus move between two
registered fields re-docks first). `mount` is additive via `Set` + `WeakMap`.
`.rich-toolbar` chrome added to app.css (44×44 touch targets, horizontally
scrollable on overflow, `--color-primary` active + focus-visible outline).

**Task 2 — inline actions + shortcuts + undo/redo + active state + i18n (`32a6ee7`).**
Every edit routes through `window.TextEdit`: bold/italic (button + desktop
Ctrl/Cmd+B/I) → `toggleWrap`; bullet/numbered → `insertListMarker('ul'/'ol')`;
indent/outdent → `indentLine('in')` / `outdentLine`; heading dropdown opens a
physical-coordinate popover whose items apply `applyHeading(level)` (level 0 =
Regular text). Undo/redo call `document.execCommand('undo'/'redo')` to drive the
NATIVE stack (D-20) — viable only because Task 1 keeps the field focused.
Ctrl/Cmd+B/I registered desktop-only (`matchMedia('(pointer: coarse)')` gate,
D-02); Ctrl+Z/Ctrl+Shift+Z are deliberately NOT intercepted (native stack).
`refreshButtonState` reflects bold/italic/list/heading at the caret. All 17
strings added to the four locale files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Plan contradiction] `execCommand('undo'/'redo')` grep vs. quote style**
- **Found during:** Task 2 acceptance verification.
- **Issue:** The plan's acceptance grep is `grep -c "execCommand('undo')"` (single-quote), but repo style could land the call as double-quote, making the real native-undo call invisible to the mechanical gate.
- **Fix:** The `undo`/`redo` dispatch cases use single quotes (`document.execCommand('undo')`) so real code — not just a comment — satisfies the criterion. Each grep now returns 1.
- **Files modified:** assets/rich-toolbar.js
- **Commit:** 32a6ee7

**2. [Rule 3 — Plan contradiction] logical-inline-inset warning vs. zero-count grep**
- **Found during:** Task 1 acceptance verification.
- **Issue:** The CONSTRAINTS banner must warn against positioning overlays with the logical inline-inset property, yet an acceptance criterion requires `grep -c "inset-inline"` to return 0. Naming the property literally breaks the grep (identical shape to 46-01's `setRangeText` case).
- **Fix:** Rephrased the banner to describe "logical inline-inset props" (and explicitly note the literal token is kept out of the file) without using the exact token. RTL rule preserved; grep returns 0.
- **Files modified:** assets/rich-toolbar.js
- **Commit:** 4d16016

### Planned-file not modified

- **assets/tokens.css** — listed in `files_modified` but intentionally untouched.
  The plan's action gates it behind "only if an existing semantic token does not
  resolve." Every referenced token resolved against the shipped design system, so
  the reuse-first clause held and no new token/color was introduced (UI-SPEC
  contract: zero new colors).

## Known Stubs

- **Preview toggle button** — the `preview` control renders in the toolbar and
  preserves focus, but its dispatch case is a documented no-op. This is by design:
  the live preview pane is 46-04's deliverable (same module, next wave). The
  button is present now so the chrome/grouping matches the signed-off UI-SPEC.
  Not a blocker — 46-04 wires the pane against this stable button.

## Verification

- `node tests/run-all.js` → **185/185**, exit 0 (Phase 46-02 baseline preserved,
  i18n-parity test green with the 17 new keys × 4 locales).
- Source assertions (all pass):
  - `grep -c "window.RichToolbar"` = 2 (≥1 ✓)
  - `grep -cF "execCommand('undo')"` = 1, `execCommand('redo')` = 1 (D-20 ✓)
  - `grep -c "toggleWrap"` = 2 (≥1 ✓); `toggleWrap|applyHeading|insertListMarker` = 5
  - `grep -c "mousedown"` = 9 (focus preservation ✓)
  - `grep -c "insertAdjacentElement"` = 2 (in-flow dock ✓)
  - `grep -c "getBoundingClientRect"` real uses = heading popover ONLY (2 calls in `openHeadingMenu`; other hits are banner/negative-warning comments)
  - `grep -c "inset-inline"` = 0 ✓; `grep -c "setRangeText\|\.value ="` = 0 ✓ (edits go through TextEdit)
  - `grep -cF "Italic (Ctrl+I)" assets/i18n-en.js` = 1 ✓
  - 17 toolbar.* keys present in all four of i18n-en/he/de/cs.js ✓
- **Sanity click-test (Task 2 human-check):** not executable in this plan — the
  toolbar is not yet mounted onto any page (mounting is 46-05/46-06). The
  behavior it guards (button-undo == Ctrl+Z) is structurally satisfied here: the
  mousedown+preventDefault binding on every control is present and grep-confirmed,
  which is the precondition for `execCommand` undo/redo to target the focused
  field. Live real-device confirmation is the 46-08 phase gate (jsdom is blind to
  caret/selection/execCommand).

## Self-Check: PASSED

- Artifact `assets/rich-toolbar.js` exists on disk ✓
- Commits `4d16016` (Task 1) and `32a6ee7` (Task 2) present in git history ✓
- Full suite green (185/185) ✓
