---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 02
subsystem: testing
tags: [tests-first, red-tests, personalization, jsdom, backup-roundtrip, wave-0]
requires: []
provides:
  - personalization-surface-red-suite   # Wave-0 gate Plans 05/06/07/08 turn green
affects:
  - tests/37-personalization.test.js
  - tests/30-settings-tabnav.test.js
tech-stack:
  added: []
  patterns:
    - jsdom real-page eval + captured DOMContentLoaded boot (30-settings-tabnav model)
    - mock PortfolioDB write-mirrors-read round-trip (30-settings-section-roundtrip model)
    - vm sandbox + vendored JSZip real backup.js export->import (25-08 model)
    - observable-state assertions only (feedback-behavior-verification)
key-files:
  created:
    - tests/37-personalization.test.js
  modified:
    - tests/30-settings-tabnav.test.js
decisions:
  - "Session-type storage asserted as localStorage['portfolioSessionTypes'] JSON {overrides,custom} per FIX 1 (NOT the research's IDB recommendation)"
  - "Backup round-trip drives backup.js's REAL export object + restore block via a vm sandbox (not a mock-DB mirror) so a dropped field cannot false-GREEN"
  - "The editor/picker DOM contract (ids/selectors/globals/event names) authored here IS the spec Plans 06/07 implement against"
metrics:
  duration: ~40m
  completed: 2026-07-03
  tasks: 2
  files_changed: 2
  commits: 2
status: complete
---

# Phase 37 Plan 02: Personalization-Surface RED Tests Summary

One-liner: Authored the falsifiable Wave-0 behavior suite for the whole Personalization surface (F5 date-format picker, F4 two-tier session-type editor, resolver, backup round-trip, native birthdate inputs, XSS-as-text) — all 13 blocks RED against the current tree, gating Plans 05/06/07/08.

## What was built

Two test artifacts, authored TESTS-FIRST before any surface exists:

1. **`tests/30-settings-tabnav.test.js` (EXTENDED)** — added a `?tab=personalize`
   deep-link case (asserts the Personalization tab button activates + its panel
   is revealed + `tabindex="0"` on the active tab) and bumped the end-of-file
   expected-count guard 3 → 4. RED until Plan 06 adds the tab markup + the
   `personalize` token to the `readUrlTab` whitelist.

2. **`tests/37-personalization.test.js` (NEW, 13 blocks)** — the full surface spec:
   - **Picker (PERS-02):** `#dateFormatSelect` renders the 6 exact seam-key
     options; defaults to `auto` when unset; a stored value re-applies on boot;
     a `change` persists `localStorage['portfolioDateFormat']` and dispatches a
     document `app:dateformat` CustomEvent (no reload path).
   - **F4 editor (PERS-03):** 5 locked defaults render in fixed order
     (clinic/online/remote/proxy/other) each with a rename input + lock icon and
     NO delete button; adding a custom type persists to
     `localStorage['portfolioSessionTypes'].custom` (FIX 1 — localStorage, not
     IDB) and fires `app:session-types-changed`; renaming a locked default writes
     a global `overrides` string (D-16); two-layer delete guard (locked rows have
     no button AND `window.SessionTypesEditor.deleteType('clinic')` returns
     `false` while a custom key deletes cleanly); single-mount guard (boot calls
     `App.initCommon` at most once).
   - **Resolver (PERS-04):** `App.formatSessionType` applies a global override,
     else the i18n default, else the RAW key for an unknown/deleted type (D-18).
   - **Backup round-trip (PERS-05):** the REAL `backup.js` export → import (vm
     sandbox + vendored JSZip, 25-08 model) round-trips BOTH
     `portfolioDateFormat` AND `portfolioSessionTypes` (overrides+custom) —
     seed → export → clear keys → import → assert exact restore. Drives
     backup.js's own settings export object + restore block, so a dropped field
     cannot false-GREEN.
   - **Birthdate (PERS-06):** `#clientBirthDate`, `#inlineClientBirthDate`,
     `#editClientBirthDate` must be native `<input type="date">` with
     `YYYY-MM-DD` `.value` plumbing.
   - **Security (T-37-02-SEC):** a session-type label carrying
     `<img src=x onerror=...>` renders as literal `.value`; no `<img>` is parsed
     and the injected handler never executes.

All page behavior runs the REAL modules via jsdom with the existing
`_helpers/app-stub.js` + `_helpers/mock-portfolio-db.js`; the backup block drives
the REAL backup.js. Assertions read observable state only (DOM nodes, input
`.value`, localStorage contents, dispatched events) — no source-text assertions,
no watch-mode flags.

## Observed RED failure output (right-reason verification)

`node tests/37-personalization.test.js` → exit 1, `0 passed, 13 failed`. Each
block fails because the corrected behavior/surface is still absent:

| Block | Observed failure | Right reason |
|-------|------------------|--------------|
| picker (x3) | `#dateFormatSelect` must exist | picker markup/wiring not built (Plan 06) |
| editor render | `#sessionTypesEditor` must exist | editor not built (Plan 07) |
| editor add | `#sessionTypeAddInput` must exist | add UI not built |
| editor rename | container must exist | editor not built |
| editor delete guard | container must exist | editor not built |
| editor single-mount | editor container must have mounted | editor not built |
| resolver | `+ 'In-person' / - 'Face-to-face'` | D-16 override not implemented |
| backup | `+ null / - 'dd/mm/yyyy'` | portfolioDateFormat not in backup settings block |
| birthdate add-client | `'hidden' !== 'date'` | native date swap not done (Plan 05/08) |
| birthdate add-session | `'hidden' !== 'date'` | native date swap not done |
| security | container must exist | editor not built |

`node tests/30-settings-tabnav.test.js` → exit 1, `3 passed, 1 failed`
(`the Personalization tab button (#settingsTabPersonalizeBtn) must exist`); the
3 pre-existing tab cases stay GREEN, proving the extension is additive.

## Deviations from Plan

None — plan executed exactly as written. Both tasks are test-only; no production
code was written (per the plan's test-only mandate).

## Notes for downstream plans

- Plans 06/07 must honor the DOM contract this spec asserts: picker
  `#dateFormatSelect` (6 seam-key options), editor container `#sessionTypesEditor`
  with `.session-type-row[data-type-key]`, `.session-type-rename-input`,
  `.session-type-lock`, `.session-type-delete-btn`, add via `#sessionTypeAddInput`
  + `#sessionTypeAddBtn`, global `window.SessionTypesEditor.deleteType(key)`,
  storage `localStorage['portfolioSessionTypes'] = {overrides,custom}`, events
  `app:dateformat` / `app:session-types-changed`.
- The editor must boot directly (NOT via a second `App.initCommon`) or the
  single-mount block fails once the container mounts.
- Plans 05/08 must swap `#clientBirthDate` / `#inlineClientBirthDate` /
  `#editClientBirthDate` to native `<input type="date">`.
- Plan 05 must add `portfolioDateFormat` AND `portfolioSessionTypes` to
  backup.js's `settings` export object + restore block.
- `tests/37-date-format.test.js` and `tests/34-date-locale.test.js` (engine lane,
  Plan 37-01) remain deliberately RED — not touched here.

## Self-Check: PASSED

- FOUND: tests/37-personalization.test.js
- FOUND: tests/30-settings-tabnav.test.js (extended)
- FOUND commit 4a0644f (Task 1 — tab-nav extension)
- FOUND commit ab75806 (Task 2 — personalization spec)
- Verified: `node tests/37-personalization.test.js` exits 1 (13 RED); `node tests/30-settings-tabnav.test.js` exits 1 (1 RED, 3 GREEN)
