---
phase: quick-260630-sa8
plan: 01
subsystem: client-edit-form
tags: [bug-fix, data-loss, i18n, legacy-data]
requires: []
provides:
  - "App.computeClientAgeOnEdit shared age-resolution helper"
  - "client.form.legacyAgeNote i18n key (en/he/de/cs)"
affects:
  - assets/app.js
  - assets/add-client.js
  - assets/add-session.js
tech-stack:
  added: []
  patterns:
    - "Shared pure helper on the App module routes both edit-save paths through one age-resolution rule"
    - "vm-sandbox falsifiable behavior test loads window.App via sandbox === window"
key-files:
  created:
    - tests/quick-260630-sa8-legacy-age.test.js
  modified:
    - assets/app.js
    - assets/add-client.js
    - assets/add-session.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
    - tests/25-06-crop-only.test.js
decisions:
  - "Preserve stored age on edit-save when no birthDate; do NOT fabricate a birth date from age"
  - "Surface the legacy age via a localized helper-text note rather than pre-filling the picker"
metrics:
  duration: "~15m"
  completed: "2026-07-01"
  tasks: 2
  files: 9
status: complete
---

# Phase quick-260630-sa8 Plan 01: Preserve legacy client age on edit + explain empty picker Summary

Fixed a client-edit bug where a client displaying "age 40" showed an empty birth-date picker on edit, and — worse — saving that client silently wiped the stored age to null. Added a shared `App.computeClientAgeOnEdit(birthDate, existingAge)` helper that preserves the stored age when no birth date exists, routed both edit-save paths through it, and added a localized note (4 languages) explaining the empty picker for legacy clients.

## What Was Built

### Task 1 — Preserve legacy age on edit-save via a shared helper
- Added `computeClientAgeOnEdit(birthDate, existingAge)` to the App module in `assets/app.js` (near `initBirthDatePicker`) and exported it on the returned App object. When `birthDate` is truthy it recomputes age with the existing `365.25`-day math; otherwise it returns `existingAge != null ? existingAge : null` (preserving the legacy age, including `0`, instead of nulling it).
- Wired `assets/add-client.js` form submit: `const age = App.computeClientAgeOnEdit(birthDate, editingClient ? editingClient.age : null);` — on the add path `editingClient` is null so age stays null (no behavior change).
- Wired `assets/add-session.js` inline edit save: moved the age computation to AFTER `existing` is resolved (`if (!existing) return;`) and compute `const age = App.computeClientAgeOnEdit(birthDate, existing.age);`. The inline ADD-new-client path and all display fallbacks (overview.js, add-session spotlight) were left untouched.
- Created `tests/quick-260630-sa8-legacy-age.test.js` — a falsifiable vm-sandbox behavior test loading `assets/app.js` (the sandbox is made its own `window` so the post-IIFE `App` augmentation resolves). Asserts: no-birthDate+age 40 → 40 (not null), empty-string birthDate preserves age, null/undefined → null, `0` preserved, and a real birthDate recomputes and ignores a wrong `existingAge` (999) returning `>= 38`.

### Task 2 — Surface the legacy age with a localized note
- Added `client.form.legacyAgeNote` to all 4 dictionaries (`i18n-en/he/de/cs`), next to `client.form.birthDate`, with ASCII-safe German/Czech spellings matching sibling keys.
- Both edit-form populators (`add-client.js` and `add-session.js` `openEditClient`) now insert a `helper-text` `<p>` note after the birth-date picker container, shown only when `client.age != null && !client.birthDate`, with the actual age appended (e.g. `... (40)`). The add-session modal is reused across clients, so the note is toggled explicitly in both branches to avoid leaking a stale note. No birth date is fabricated.

## Verification
- `node tests/run-all.js` → **Suite: 119 passed, 0 failed, 119 total.**
- New test `quick-260630-sa8-legacy-age.test.js` → 6 passed, 0 failed.
- **Falsifiability confirmed:** patching the helper back to the old `return null;` logic makes 3 assertions fail (`null !== 40`, `null !== 0`, etc.); restoring the fix makes them pass.
- i18n key `client.form.legacyAgeNote` present exactly once in each of the 4 dictionaries (grep count 1 each).
- Edited JS parses cleanly (`new Function(...)` sanity check on add-client.js / add-session.js).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated 25-06-crop-only.test.js App mock**
- **Found during:** Task 1 (full-suite run after wiring add-client.js).
- **Issue:** `tests/25-06-crop-only.test.js` builds a hand-rolled `App` mock and exercises the add-client form submit pipeline. My change made the submit handler call `App.computeClientAgeOnEdit`, which the mock did not define → `App.computeClientAgeOnEdit is not a function` (2 assertions failed). The test passed on the clean tree, so the break was directly caused by this task's change (in-scope).
- **Fix:** Added a `computeClientAgeOnEdit` stub to the test's `App` mock mirroring the real helper's behavior.
- **Files modified:** tests/25-06-crop-only.test.js
- **Commit:** 25e0129

## Known Stubs
None — no placeholder/empty-data stubs introduced.

## Threat Flags
None — no new endpoints, auth paths, file access, or schema changes. The change reduces data loss (age no longer nulled on edit); the note renders only the client's own age inside the therapist's own edit form (matches threat register T-sa8-01/T-sa8-02 `accept`/`mitigate`).

## Commits
- `25e0129` fix(260630-sa8): preserve legacy client age on edit-save
- `fba8e4e` fix(260630-sa8): explain empty birth-date picker for legacy clients

## Self-Check: PASSED
