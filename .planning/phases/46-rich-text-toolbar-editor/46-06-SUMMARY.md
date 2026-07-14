---
phase: 46-rich-text-toolbar-editor
plan: 06
subsystem: export-editor
tags: [export-modal, toolbar-mount, maximize, flex-fill, mobile-fullscreen, i18n, info-note]
status: complete
requires:
  - window.RichToolbar.mount (46-03/46-04 — additive focus-attached toolbar + headings + live preview)
  - window.TextEdit (46-01 — caret/transform chokepoint the toolbar drives)
  - window.MdRender.render (Phase 45 — the kept Step-2 swap preview renderer)
  - .export-card / .export-step / .export-edit-area export-modal chrome (Phase 22)
  - --color-info-bg / --color-info-text tokens (tokens.css)
  - 46-02 outcome GREEN (true italic accepted — no D-14 disclosure needed)
provides:
  - RichToolbar mounted over #exportEditor (headings:true) — export Step 2 is a full toolbar editor
  - Step-2 ephemeral-edit info note (export.ephemeralNote, 4 locales)
  - Step-2 ~50%-default + maximize-to-~90% sizing, flex-fill editor, mobile full-screen takeover
  - Shared text-edit.js + rich-toolbar.js script tags on add-session.html (activates 46-05's note-field mount too)
affects:
  - 46-08 (real-device gate: Step-2 sizing/maximize/mobile + snippets-in-export-editor)
tech-stack:
  added: []
  patterns:
    - "Additive guarded RichToolbar.mount([#exportEditor], {headings:true}) at export-modal init — coexists with the kept Edit/Preview swap (no live pane)"
    - "State-class sizing gated to the active step: .export-card.is-editor-step toggled on Step-2 entry so Steps 1/3 keep base card sizing; ALL sizing scoped to .export-card, shared .modal-card base untouched"
    - "Height-forwarding flex column (modal-card-body → active .export-step → export-edit-area → #exportEditor) replaces the fixed resize:vertical textarea in a fixed shell"
    - "Mobile full-screen dvh takeover via max-height override of the .modal-card 90vh cap, scoped to the editor step"
    - "Icon-only header toggle whose title/aria-label are set in JS (applyTranslations handles textContent only)"
key-files:
  created: []
  modified:
    - add-session.html
    - assets/app.css
    - assets/export-modal.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "D-14 disclosure NOT added: 46-02 shipped true italic GREEN (Ben accepted), so no export.italicNote and no upright-in-PDF tooltip clause — the conditional resolved to not-needed"
  - "Maximized selector written .export-card.is-maximized.is-editor-step so the maximized sizing stays gated to the editor step AND the literal 'export-card.is-maximized' substring is present for the source assertion"
  - "Maximize state resets on leaving Step 2 (exportSetActiveStep removes .is-maximized + resets the button) so re-entry always starts at the 50% default"
  - "Single expand icon + aria-pressed + title flip for the toggle (no second restore glyph) — state conveyed by aria-pressed and the localized title; visual polish is the 46-08 gate"
  - "info-note icon is a CSS ::before circled-i (\\24D8) rather than an emoji, for cross-platform consistency"
metrics:
  duration_min: 20
  completed: 2026-07-14
  tasks: 2
  files: 7
  suite: 185/185
---

# Phase 46 Plan 06: Export Step-2 toolbar editor + maximum-editing-surface Summary

Redesigned the export-modal's Step 2 into the roomy, toolbar-equipped editor Ben
asked for. The shared `window.RichToolbar` now mounts over `#exportEditor`
(headings included) alongside the KEPT Edit/Preview swap switcher; an
info-styled ephemeral-edit note sits above the editor; the card opens at ~50% of
the viewport with a working maximize-to-~90% toggle; the inner editor flex-fills
the modal (no more fixed `resize:vertical` textarea in a fixed shell); and mobile
is a full-screen keyboard-aware takeover. This plan also added the two shared
`<script>` tags (`text-edit.js` → `rich-toolbar.js`) to `add-session.html`, which
simultaneously activates 46-05's previously-dark note-field toolbar mount.

## What Was Built

**Task 1 — shared modules + toolbar mount + info note (`9a142ee`).**
- `add-session.html`: `text-edit.js` then `rich-toolbar.js` loaded after
  `md-render.js` and before `export-modal.js`/`add-session.js` (lines 619–620,
  before 627–628). This is the wiring 46-05 flagged as dark — both the 7
  note-field mounts and the export mount now go live.
- `export-modal.js`: an additive, guarded
  `window.RichToolbar.mount([#exportEditor], { headings: true })` at export-modal
  init. `#exportEditor` is NOT a `.session-textarea`, so there is no double-mount
  with 46-05's `querySelectorAll(".session-textarea")` set; the mount is additive
  (Set/WeakMap) so neither discards the other. The Edit/Preview swap
  (`exportUpdatePreview`/`exportApplyMobileTabs`) is untouched — no live-pane
  conversion (D-08).
- Step-2 `.export-info-note` element above the editor carrying `export.ephemeralNote`.
- `export.ephemeralNote` added to all four locales.

**Task 2 — Step-2 sizing / maximize / flex-fill / mobile (`72c7916`).**
- `add-session.html`: icon-only `#exportMaximize` toggle in the export header,
  inline-start of the close button, hidden until Step 2.
- `app.css`: every new sizing rule scoped to `.export-card` selectors. Editor step
  opens at `50vh`/`50dvh` (`min(1100px,92vw)` wide); `.export-card.is-maximized.is-editor-step`
  expands to `90vh`/`90dvh` with a 32px gutter. The height-forward chain
  (`.export-card.is-editor-step` → `modal-card-body` flex → active `.export-step`
  flex → `export-edit-area` flex → `#exportEditor` `block-size:100%` + `resize:none`)
  makes the editor flex-fill. Sizing is gated to `.is-editor-step` so Steps 1/3
  keep the base `min(720px,92vw)` auto-height card. Mobile (`<=768px`): full-screen
  `100dvh` takeover (overriding the base 90vh `max-height` cap), edit-area becomes
  a flex column so the visible pane fills. `.export-info-note` styling
  (`--color-info-bg`/`--color-info-text`, circled-i ::before).
- `export-modal.js`: `exportSetActiveStep` toggles `.is-editor-step` on Step-2
  entry, shows/hides the maximize button, and clears `.is-maximized` on exit; the
  maximize handler toggles `.is-maximized` and refreshes the button + swap layout;
  `updateMaximizeBtn` sets the localized title/aria-label; listener registered and
  cleaned up alongside the other dialog listeners. The `#confirmModal` z-index
  coupling is untouched (discard-edits confirm still sits above).
- `export.maximize` / `export.restore` added to all four locales.

## D-14 Contingency Outcome

**NOT applied.** Per `46-02-SUMMARY.md`, the true-italic PDF face shipped GREEN and
Ben accepted it at the checkpoint. No `export.italicNote` was added and no
upright-in-PDF clause was appended to the italic tooltip. The always-present D-03
ephemeral-edit note is distinct and was added regardless.

## Deviations from Plan

### Authorized (comment hygiene — locked project rule)

**[Comment hygiene] Planning IDs kept out of shipped-file comments.**
The plan's action/acceptance wording carries decision/requirement IDs
(D-03/08/14/16/17/18, RTXT-NN, "issue N", "mockup-gate", "UI-SPEC"). Per the locked
CONVENTIONS.md §Comments rule, every such ID was translated to plain prose in the
`add-session.html`, `app.css`, and `export-modal.js` comments — the
constraint/rationale is kept, the ID dropped. IDs remain in this SUMMARY and the
commit messages. This deviation from plan wording is authorized and is not a plan
violation. Grep-verified: zero planning IDs in my added lines across the three
shipped files (pre-existing prior-phase IDs in unrelated comments are out of scope).

No other deviations — no bugs, no missing functionality, no architectural changes.

## Threat Surface

Phase threat-register items for this plan are satisfied:
- **T-46-06a (Step-2 preview XSS):** the kept `exportUpdatePreview` still routes
  through `MdRender.render` (escape-first); the toolbar adds no raw-innerHTML path.
- **T-46-06b (ephemeral edits leaking to the saved session):** no write-back path
  added; the info note makes the export-only nature explicit; the existing flow
  discards on close.
- **T-46-06c (script-tag load order):** `text-edit.js` then `rich-toolbar.js` load
  before `export-modal.js`/`add-session.js` — grep-verified ordering.
- **T-46-SC (installs):** none — HTML/CSS/JS edits only.

No new security surface introduced.

## Known Stubs

None. Both tasks are fully wired. Live real-device verification of the Step-2
sizing / maximize / mobile full-screen and snippets-in-export-editor is the 46-08
phase gate (jsdom is blind to layout/caret/viewport).

## Verification

- `npm test` (full suite) → **185/185**, exit 0 (i18n parity green with the new
  `export.ephemeralNote` / `export.maximize` / `export.restore` keys × 4 locales).
- `node --check` OK for `export-modal.js` and all four i18n files.
- Source assertions (all pass):
  - `grep -c "rich-toolbar.js" add-session.html` = 2, `grep -c "text-edit.js"` = 2,
    ordered before `export-modal.js`/`add-session.js` and after `md-render.js` ✓
  - `grep -c "RichToolbar" assets/export-modal.js` = 3 ✓
  - swap switcher kept: `exportUpdatePreview` = 3, `exportApplyMobileTabs` = 5 ✓
  - `grep -c "export-card.is-maximized" assets/app.css` = 2 ✓;
    `grep -c "is-maximized" assets/export-modal.js` = 2 ✓
  - `.export-card.is-editor-step` present in app.css (13) and toggled in
    export-modal.js (1) ✓; active `.export-step.is-active` made a height-forwarding
    flex container ✓; export editor `resize:none` + `block-size:100%` ✓
  - base `.modal-card` rule NOT in the diff (untouched) ✓; `#confirmModal.modal`
    z-index rule intact ✓
  - maximize button `#exportMaximize` present (1); `export.maximize`/`export.restore`
    present in all four locales ✓
  - zero planning IDs in my added lines across the three shipped files ✓

## Self-Check: PASSED

- Artifacts `add-session.html`, `assets/app.css`, `assets/export-modal.js` + 4
  i18n files modified on disk ✓
- Commits `9a142ee` (Task 1) and `72c7916` (Task 2) present in git history ✓
- Full suite green (185/185) ✓
