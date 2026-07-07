---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 06
subsystem: personalization-settings
status: complete
tags: [settings, personalization, date-format, i18n, tab-nav, service-worker]
requires:
  - "37-03: window.DateFormat engine (option-label rendering seam)"
  - "37-02: RED specs tests/37-personalization.test.js + tests/30-settings-tabnav.test.js"
provides:
  - "Personalization Settings tab (#settingsTabPersonalizeBtn / #settingsTabPersonalize) + ?tab=personalize deep-link"
  - "F5 date-format picker #dateFormatSelect: engine-sourced labels, portfolioDateFormat persistence, app:dateformat event"
  - "Empty F4 editor container (#sessionTypesEditor + #sessionTypeAddInput + #sessionTypeAddBtn) for Plan 07 to populate"
  - "settings-session-types.js script tag + sw.js precache (forward-declared load hook for Plan 07)"
  - "Full F5 + F4 i18n key set across en/he/de/cs"
affects:
  - "37-07 (F4 editor IIFE): loads via the script tag added here; populates #sessionTypesEditor; consumes the i18n keys"
  - "37-08 (add-session cards / birthdate): reuses session.type.remote|proxy + settings.sessionTypes.* keys"
tech-stack:
  added: []
  patterns:
    - "Self-booting DOMContentLoaded IIFE in settings.js (mirrors the tab-nav IIFE)"
    - "Engine-seam option labels: window.DateFormat.format on a fixed reference date, guarded for engine absence"
    - "localStorage scalar preference + CustomEvent live-re-render hook (no page reload), mirrors lang/theme"
key-files:
  created: []
  modified:
    - settings.html
    - assets/settings.js
    - sw.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "D-10/D-11: Personalization tab placed right after the fields tab; F5 picker is the panel focal point (first), empty F4 editor block below"
  - "D-09: portfolioDateFormat in localStorage, default auto; change fires app:dateformat (forward-compat), no reload (FIX 7 — settings page has no date surfaces to re-render)"
  - "Prohibition honored: option labels are engine output; static fallback text is the format-key string (not a hand-typed date example)"
  - "D-15 script-wiring: settings-session-types.js is a forward-declared load hook added here (file created by Plan 07), precached in sw.js"
  - "D-11/D-13: reuse shared confirm.cancel for the delete dialog; add session.type.remote/proxy as new locked defaults"
metrics:
  duration: "~20 min"
  completed: "2026-07-03"
  tasks: 2
  files_created: 0
  files_modified: 7
---

# Phase 37 Plan 06: Personalization Tab + F5 Date-Format Picker + i18n Front-Load Summary

The Personalization Settings tab now exists and deep-links via `?tab=personalize`; its F5 `#dateFormatSelect` sources the 5 non-auto option labels from `window.DateFormat`, persists `portfolioDateFormat` on change, fires `app:dateformat` (no reload), and defaults to `auto` — and every new F5 + F4 i18n key ships across en/he/de/cs, so Plan 07 needs no i18n edits.

## What Was Built

**Task 1 — Personalization tab + F5 picker + F4-editor script wiring** (commit `0291248`)
- `settings.html`: 5th tab button `#settingsTabPersonalizeBtn` (`data-tab="personalize"`) inserted after the fields tab; matching `#settingsTabPersonalize` panel. Panel hosts the F5 `.form-field` (`<select id="dateFormatSelect">` with 6 `<option value>` = the exact seam keys `auto`/`month-day-year`/`day-month-year`/`mm/dd/yyyy`/`dd/mm/yyyy`/`yyyy-mm-dd`; auto carries a static i18n label, the other 5 carry `data-df-example`) followed by the session-types `<h3>` + helper, the empty `#sessionTypesEditor` container, and the add-row (`#sessionTypeAddInput` + `#sessionTypeAddBtn`). Added the `<script src="./assets/settings-session-types.js">` tag immediately after the `settings.js` tag.
- `assets/settings.js`: added `|| t === "personalize"` to the `readUrlTab` whitelist; added a new self-booting IIFE (after the tab-nav IIFE) that on boot sets `sel.value = localStorage['portfolioDateFormat'] || 'auto'`, fills each `data-df-example` option's `textContent` via `window.DateFormat.format('2026-07-02', key, lang)` (guarded — no-op if the engine is absent, e.g. in the test env), and on `change` persists the value, dispatches `document` `app:dateformat` with `detail.format`, shows the saved toast, and never reloads. Re-fills the labels on `app:language`.
- `sw.js`: added `/assets/settings-session-types.js` to `PRECACHE_URLS` beside the other settings scripts.

**Task 2 — F5 + F4 i18n keys across en/he/de/cs** (commit `263520b`)
- Added `settings.tab.personalize`; `settings.dateFormat.{label,auto,savedToast}`; `settings.sessionTypes.{heading,helper,add.label,add.placeholder,add.invalid,locked.tooltip,rename.aria,delete.aria,savedToast,empty,confirm.delete.{title,body,confirm}}`; and the two new locked defaults `session.type.remote` / `session.type.proxy` to all 4 bundles, using the UI-SPEC canonical EN copy.
- Delete dialog reuses the shared `confirm.cancel` key (no new cancel added). No `(optional)` helper hints.

## Verification (GREEN gate)

- `node tests/30-settings-tabnav.test.js` → **4 passed, 0 failed** — the `?tab=personalize` deep-link case (D) is now GREEN (button active + aria-selected + tabindex=0, panel revealed).
- `node tests/37-personalization.test.js` → **6 passed, 7 failed**. The picker cases this plan owns are all GREEN:
  - Case 1: `#dateFormatSelect` renders the 6 seam-key options in order ✓
  - Case 2: default `auto` when unset; stored value re-applies on boot ✓
  - Case 3: change persists `portfolioDateFormat` + fires exactly one `app:dateformat` (no reload) ✓
  - Case 8 (single-mount) and Case 10 (backup round-trip) and Case 11 (add-client native birthdate) also GREEN (satisfied by the container mount + prior plans).
- `npm test` full suite → **120 passed, 1 failed, 121 total**. The single failing file is `37-personalization.test.js` (see below). `sw-precache-cache-reload.test.js` GREEN — CACHE_NAME auto-derives from `AppVersion.INTEGRITY_TOKEN`, no manual `vNNN` bump (Plan 03 finding confirmed).
- Grep gates: `settings-session-types.js` present in both `settings.html` and `sw.js`; `data-tab="personalize"` count = 1; `app:dateformat` dispatch present with no `location.reload` in the picker path; the 6 option values are exactly the seam keys.

### Turned GREEN vs remaining expected-RED

| Test case | State | Owner |
|-----------|-------|-------|
| 30-tabnav D: `?tab=personalize` deep-link | GREEN (this plan) | 37-06 |
| 37-perso 1/2/3: date-format picker | GREEN (this plan) | 37-06 |
| 37-perso 4/5/6/7: F4 session-type editor rows/add/rename/delete | expected-RED | 37-07 |
| 37-perso 9: `App.formatSessionType` resolver (override/raw fallback) | expected-RED | 37-07 |
| 37-perso 13: session-type label XSS-literal (no-innerHTML) | expected-RED | 37-07 |
| 37-perso 12: add-session inline/edit native birthdate input | expected-RED | 37-08 |

The empty `#sessionTypesEditor` container is intentionally row-less here; `assets/settings-session-types.js` does not yet exist (Plan 07 creates it), so the candidate-surface guard in the test simply skips it and the editor cases stay RED by design — mirroring Plan 03's documented out-of-scope RED.

## Deviations from Plan

None — plan executed as written. No Rule 1-4 deviations required.

## Translations Flagged [ASSUMED — pending Sapir/Ben native review]

All he/de/cs values for the new keys are best-effort and marked with an inline `[translations ASSUMED — pending Sapir/Ben native review]` comment in each bundle. Notable judgement calls:
- `session.type.proxy` → he "מיופה כוח", de "Stellvertretend", cs "V zastoupení" (surrogate/proxy-session sense).
- `session.type.remote` → he "מרחוק", de "Aus der Ferne", cs "Na dálku" (distinct from Online).
- The EN copy is canonical (from the UI-SPEC Copywriting Contract) and is not assumed.

## Known Stubs

- `#sessionTypesEditor` renders empty (no rows) and `#sessionTypeAddBtn` has no behavior wired — **intentional**. Plan 07 (`assets/settings-session-types.js`, forward-declared and precached here) populates the rows and wires add/rename/delete + the `window.SessionTypesEditor.deleteType` guard. Documented in the plan's `<artifacts_produced>` as a Plan 07 deliverable; not a defect.

## Threat Flags

None. The picker writes a scalar preference consumed only by `window.DateFormat` (validated against VALID_KEYS, falls back to `auto`); option labels are engine output, not user free text; the F4 container is empty (no user-entered text rendered in this plan). Matches the plan's threat register (T-37-06-01 mitigate, T-37-06-02 accept).

## Self-Check: PASSED

- FOUND: settings.html (`#settingsTabPersonalize`, `#dateFormatSelect`, `settings-session-types.js` tag)
- FOUND: assets/settings.js (`personalize` whitelist token + `app:dateformat` dispatch)
- FOUND: sw.js (`/assets/settings-session-types.js` in PRECACHE_URLS)
- FOUND: all new keys in i18n-en/he/de/cs
- FOUND commit: 0291248 (feat: tab + picker + wiring)
- FOUND commit: 263520b (feat: i18n keys)
- Re-confirmed `node tests/30-settings-tabnav.test.js` 4/4 GREEN and 37-personalization picker cases 1-3 GREEN
