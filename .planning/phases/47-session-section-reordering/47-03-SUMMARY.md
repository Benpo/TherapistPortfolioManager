---
phase: 47-session-section-reordering
plan: 03
subsystem: settings-reorder-ui
status: complete
tags: [settings, reorder, drag, arrows, severity, persistence, i18n, css]
requires:
  - App.getSectionOrder / App.sanitizeOrder / App.DEFAULT_SECTION_ORDER / App.GROUP_DEFAULT_TITLE_KEYS (47-01)
  - App.refreshSectionOrderCache (47-01)
  - PortfolioDB._writeTherapistSentinel (sectionOrder sentinel) (47-01)
  - "i18n keys: settings.reorder.*, settings.reset.*, settings.row.afterSeverity.* (47-02)"
provides:
  - "Settings Fields = one grouped reorder list (drag + arrows, renamable group headers, Issue-severity row + ⓘ)"
  - "afterSeverity enable-state persisted via setTherapistSetting → App.isSectionEnabled('afterSeverity')"
  - "sectionOrder sentinel written on Save through the shared App.sanitizeOrder clamp"
  - "Reset order / Reset names staged controls"
affects:
  - assets/settings.js
  - assets/app.css
  - tests/47-settings-reorder.test.js
tech-stack:
  added: []
  patterns:
    - "reuse shipped renderRow (.settings-row) for the nine editable rows, decorate with reorder chrome"
    - "DOM order is the staged model; reconstruct order[] on Save and clamp through App.sanitizeOrder"
    - "pointer-event drag with physical getBoundingClientRect geometry (no logical inline insets)"
    - "delegated arrow handler on the persistent container survives per-render row rebuilds"
    - ":has()-scoped CSS so the legacy flat fallback is visually untouched"
key-files:
  created:
    - tests/47-settings-reorder.test.js
  modified:
    - assets/settings.js
    - assets/app.css
decisions:
  - "afterSeverity carries a hidden, disabled rename input so the generic per-section Save loop persists its enabled state (rename-locked → customLabel null)"
  - "Reset order moves EXISTING nodes into default order (never rebuilds) so in-progress rename/enable edits survive; order-only, confirm-free"
  - "onSave refreshes the in-tab order cache before the post-save re-render so the saved order does not snap back to the pre-save cache (Rule 1 fix)"
metrics:
  duration: ~75min
  completed: 2026-07-23
  tasks: 3
  files: 3
---

# Phase 47 Plan 03: Settings Grouped Reorder Control Summary

The Settings Fields tab is now one grouped reorder list built from
`App.getSectionOrder()`: bare section rows, renamable tinted group headers with
indented member rows, and a new "Issue severity" switch row with a tap-toggled ⓘ
explainer. Rows reorder by pointer drag (mouse + touch) and by accessible up/down
arrows with disabled end-stops — both funnel through the one shared
`App.sanitizeOrder` clamp — and the resulting order persists via the
`sectionOrder` sentinel on the existing Save flow, alongside paired Reset order /
Reset names controls.

## What Was Built

**Task 1 — Grouped reorder rendering (`assets/settings.js`)**
- Added `afterSeverity` to `SECTION_DEFS` (label `settings.row.afterSeverity.label`,
  no description) and to `LOCKED_RENAME`.
- New `buildDragHandleSvg` / `buildChevronSvg` builders; `renderReorderList`
  iterates `App.getSectionOrder()` to render bare rows, group-header rows, and
  indented members. The nine editable rows reuse the shipped `renderRow`
  (`.settings-row` with rename input + enable toggle + reset) decorated with a
  drag handle + arrow pair; the Issue-severity row is a compact custom row with
  **no visible description**, a ⓘ button whose popover carries the explainer, and
  the enable toggle that is the app-level severity switch.
- Group headers resolve their default title through `App.GROUP_DEFAULT_TITLE_KEYS`
  (never a section title key), carry a ✎ rename bound to `titleOverride` and a
  per-group revert, and have their own handle + arrows with no enable toggle.
- Legacy flat fallback (nine editable rows only) preserved when the order
  foundation is unavailable, keeping `tests/30-settings-section-roundtrip.test.js`
  green.
- All user text (section customLabel, group titleOverride) rendered via
  `.textContent` / `input.value` only — never `innerHTML`.

**Task 2 — Reorder interactions + persistence (`assets/settings.js`, test)**
- Pointer-event drag on each handle (`pointerdown` → `setPointerCapture` +
  `touch-action:none`; insertion math via **physical** `getBoundingClientRect`
  top/height). Members reorder within their group only; top-level rows reorder
  among top-level units, with a group dragging as a whole block. No cross-group
  moves.
- Delegated up/down arrow handler on the persistent container: members swap
  within their group, top-level rows swap with the adjacent unit; end-stops are
  applied via the `disabled` attribute, including the Issue-severity /
  Session-topics clamp boundary. `enforceOrderClamp` keeps afterSeverity after
  issues on every move.
- On Save, the staged order is reconstructed from the DOM, clamped through
  `App.sanitizeOrder`, and written via
  `PortfolioDB._writeTherapistSentinel({ sectionKey:"sectionOrder", version:1, items })`;
  the existing `'therapist-settings-changed'` post fires so peers +
  `App.refreshSectionOrderCache` pick it up.
- Paired **Reset order** (↺, confirm-free, order-only) and **Reset names** (✎,
  `App.confirmDialog`-guarded, clears section customLabels + group titleOverrides)
  controls mount under the list and join the existing dirty/Save/Discard flow —
  both stage their change and are abandoned by Discard.
- `tests/47-settings-reorder.test.js` (jsdom, real page + real order foundation
  sourced from app.js): asserts the afterSeverity-before-issues clamp on Save,
  a within-group member move persisting in `items[].members`, Reset order being
  confirm-free + reverted by Discard writing no sentinel, and Reset names being
  confirm-guarded.

**Task 3 — Reorder-list CSS (`assets/app.css`)**
- `.reorder-row` (compact 44px-tap rows overriding the padded card look),
  `.reorder-handle` (grab cursor + `touch-action:none`), `.reorder-arrows` /
  `.reorder-arrow` (44px, `[disabled]` → 0.3 opacity + not-allowed),
  `.reorder-group-header` (surface-toggle tint, primary-dark title),
  `.reorder-member` (28px inline-start indent), `.reorder-row.dragging`
  (0.55 opacity + `--shadow-card`), `.reorder-placeholder` (dashed
  `--color-primary-soft`), the ⓘ popover (border-inline-start accent), and the
  Reset bar. Semantic tokens only, logical properties for RTL, 3px
  `--color-green-50` focus rings. The container border is `:has()`-scoped so the
  flat fallback is untouched. No skip-pill styling (the "— (skip)" value is
  dropped).

## Downstream contract confirmed

- **afterSeverity enable-state read path:** afterSeverity is in `SECTION_DEFS`, so
  `onSave` persists it via `PortfolioDB.setTherapistSetting({ sectionKey:"afterSeverity", customLabel:null, enabled:<toggle> })`.
  After the cache refresh this flows into `App.isSectionEnabled('afterSeverity')`
  — the switch the form (47-07) and export (47-05) read.
- **Final CSS class names:** `.reorder-row`, `.reorder-handle`, `.reorder-arrows`,
  `.reorder-arrow` (`.reorder-arrow-up` / `.reorder-arrow-down`),
  `.reorder-group-header`, `.reorder-group-title`, `.reorder-member`,
  `.reorder-severity-row`, `.reorder-info-btn`, `.reorder-info-pop`,
  `.reorder-placeholder`, `.reorder-reset-bar` / `.reorder-reset-order` /
  `.reorder-reset-names`.

## Deviations from Plan

**1. [Rule 1 - Bug] Post-save re-render snapped the list back to the pre-save order**
- **Found during:** Task 2 (Save flow).
- **Issue:** `onSave` re-renders from `App.getSectionOrder()`, which reads the
  shared cache. The `'therapist-settings-changed'` broadcast that refreshes that
  cache is async and races the immediate re-render, so the just-saved order would
  visually reset to the pre-save cached order until a reload.
- **Fix:** `await App.refreshSectionOrderCache()` in-tab after the sentinel write
  and before the post-save `loadAndRender`.
- **Files modified:** assets/settings.js
- **Commit:** ce7bd10

## Verification

- `node --check assets/settings.js` — OK.
- `node tests/47-settings-reorder.test.js` — 4/4 pass.
- `node tests/30-settings-section-roundtrip.test.js` — 3/3 pass (nine `.settings-row`
  preserved; rename round-trip intact).
- `npm test` full suite — **213 passed, 0 failed**.
- Task acceptance greps: `App.getSectionOrder()` call present; `afterSeverity` in
  `SECTION_DEFS` + `LOCKED_RENAME`; ⓘ button with `aria-expanded` + popover text,
  no visible row-desc; `App.GROUP_DEFAULT_TITLE_KEYS` referenced; `setPointerCapture`
  + `getBoundingClientRect` present, no logical inline-inset drag math;
  `_writeTherapistSentinel` sectionOrder + `therapist-settings-changed` post;
  all reorder CSS classes + `touch-action:none`; semantic tokens only.
- Comment hygiene: no planning IDs in the settings.js / app.css / test diffs.

## Manual verification still required (jsdom-blind, device gate)

- iPhone touch drag reorders rows; RTL drag mirrors correctly (physical coords).
- The ⓘ popover opens on tap; arrow end-stops dim/disable at boundaries.
- Group drag moves the whole group block.

## Known Stubs

None.

## Threat Flags

None. The two registered threats are mitigated in place: user text (section
customLabel, group titleOverride) rendered via `.textContent` / `input.value`
only (T-47-04); every drag/arrow drop and Save passes through `App.sanitizeOrder`
before staging/persist (T-47-02).

## Commits

- `ee4c499` — feat(47-03): grouped reorder list rendering in Settings
- `ce7bd10` — feat(47-03): reorder interactions — drag, arrows, resets, order persistence
- `e4b5c6a` — feat(47-03): reorder-list styling — compact rows, handle, arrows, popover

## Self-Check: PASSED

- Files created/modified: assets/settings.js, assets/app.css,
  tests/47-settings-reorder.test.js, 47-03-SUMMARY.md — all present.
- Commits ee4c499, ce7bd10, e4b5c6a — all present in git log.
