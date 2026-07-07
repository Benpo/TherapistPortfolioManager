---
phase: 39-help-center-entry-point
plan: 02
subsystem: i18n
tags: [i18n, help-center, chrome-strings, parity]
status: complete
requires:
  - assets/i18n-en.js (existing dictionary)
provides:
  - "11 UI-chrome i18n keys × 4 locales: nav.help + help.entry.* + help.page.title + help.search.* + help.deeplink.*"
affects:
  - "Plan 03 (header '?' entry) consumes nav.help + help.entry.*"
  - "Plan 04 (help.html/help.js) consumes help.page.title + help.search.*"
  - "Plan 05 (empty-state coaching trio) consumes help.deeplink.*"
tech-stack:
  added: []
  patterns:
    - "Non-ASCII normalized to \\u escapes in de/cs per file convention; raw Hebrew in he.js"
key-files:
  created: []
  modified:
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "help.search.noMatch uses the plan's canonical EN wording ('...your search yet...'), a minor variant of the UI-SPEC draft ('...that yet...'); plan is the executor's source of truth. Final rendered copy is Sapir/native review's job downstream."
  - "Coaching sentences (startSession/readDashboard) follow the app's existing HE infinitive register (matches overview.clients.empty 'יש ל...'); short CTAs/menu labels use the plan-endorsed plural-imperative forms (צרו קשר / הראו לי איך), which are gender-neutral and are the app's established button voice."
metrics:
  duration: ~10min
  completed: 2026-07-07
  tasks: 2
  files: 4
---

# Phase 39 Plan 02: Help-Center UI-Chrome i18n Keys Summary

Added 11 new help-center UI-chrome i18n keys with full 4-locale parity (en/he/de/cs), front-loading the shared i18n bottleneck into Wave 1 so Plans 03/04/05 can consume them read-only.

## What Was Built

- **Task 1** — Added the 11 EN canonical keys to `window.I18N.en`: `nav.help` in the nav block, and a grouped `help.*` block (entry label/center/contact, page title, search placeholder/noMatch/writeToUs, deeplink cta/startSession/readDashboard) before the dictionary close, with a comment marking help body copy as out-of-scope (D-18).
- **Task 2** — Mirrored all 11 keys into `he`, `de`, `cs` with natural translations. Hebrew coaching sentences use the app's infinitive register; DE/CS use their formal register. Non-ASCII values in de/cs were normalized to `\u` escapes to match each file's existing convention.

## Verification

- Task 1 EN smoke-check: `OK EN keys`.
- Task 2 4-locale smoke-check: `OK 4-locale parity`; resolved values decode correctly (`Hilfe durchsuchen…`, `Ukažte mi jak`, `מרכז העזרה`).
- Standing parity gate `node tests/25-11-i18n-parity.test.js` exits 0 (23/23 PASS).
- Full suite `npm test`: 132 passed, 0 failed.

## Deviations from Plan

None — plan executed as written. No auto-fixes, no authentication gates, no checkpoints.

Note (not a deviation): `help.search.noMatch` follows the plan's Task-1 canonical string, which differs slightly in wording from the UI-SPEC Copywriting Contract draft. The plan is the executor's source of truth and both are explicitly flagged as pending Sapir/native review.

## Known Stubs

None. All 11 keys carry real, non-empty authored values in all four locales. Values are chrome-quality drafts pending downstream native review (expected per plan), not stubs.

## Self-Check: PASSED

- FOUND: assets/i18n-en.js, assets/i18n-he.js, assets/i18n-de.js, assets/i18n-cs.js (all modified)
- FOUND commit fbcf216 (Task 1), 2c8c552 (Task 2)
