---
phase: 41-replayable-guided-tour
plan: 12
subsystem: help-onboarding
tags: [help-popover, onboarding, i18n, uat-gap-closure]
requires:
  - "41-09 (v3 storyline copy / tour keys)"
  - "41-11 (tour-copy parity gate)"
  - "Phase 40 D-17 / ONBD-02 (the menu-replay slice being reversed)"
provides:
  - "3-item '?' popover (Help center / Onboarding Tour / Contact us)"
  - "help.entry.replayWelcome retired x4 locales"
  - "help.entry.takeTour relabelled to the guided-tour voice x4 locales"
affects:
  - assets/app.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
  - tests/40-i18n-parity.test.js
  - tests/40-app-wiring.test.js
  - tests/41-demo-gate.test.js
  - .planning/REQUIREMENTS.md
tech-stack:
  added: []
  patterns:
    - "Negative-grep gates (== 0) on retired i18n keys / literals"
    - "CS locale keeps \\u-escaped values (Edit tool auto-escapes to convention)"
key-files:
  created: []
  modified:
    - assets/app.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
    - tests/40-i18n-parity.test.js
    - tests/40-app-wiring.test.js
    - tests/41-demo-gate.test.js
    - .planning/REQUIREMENTS.md
decisions:
  - "Reverse the Phase-40 D-17 / ONBD-02 menu welcome-replay slice — retire the redundant welcome-screen replay row; keep the tour as the single onboarding-replay entry (Ben 2026-07-08, UAT gap 8)."
  - "EN tour label = 'Onboarding Tour' (Ben's explicit suggestion); he/de/cs machine-drafted (סיור מודרך / Einführungstour / Úvodní prohlídka), flagged DRAFT for Phase 42.1 native pass."
  - "AttentionCoordinator.showWelcome preserved — only the menu caller of showWelcome(true) removed; first-run welcome untouched."
metrics:
  duration: ~12min
  completed: 2026-07-09
status: complete
---

# Phase 41 Plan 12: Trim the "?" Popover to 3 Non-Redundant Items Summary

Reversed the Phase-40 D-17 / ONBD-02 menu welcome-replay slice: removed the redundant "welcome-screen replay" row from the "?" help popover and relabelled the tour entry to the app's guided-tour voice (EN "Onboarding Tour"), leaving a 3-item, non-redundant menu — Help center / Onboarding Tour / Contact us (UAT gap 8). First-run welcome behavior is unchanged; only the menu caller of `showWelcome(true)` was removed. The reversal is recorded in REQUIREMENTS traceability as a note (history preserved).

## What Was Built

- **Task 1 — realign guard tests (`ad1e574`):**
  - `tests/40-i18n-parity.test.js`: dropped `help.entry.replayWelcome` from `NEW_KEYS` (15 → 14; count comment + test name updated).
  - `tests/40-app-wiring.test.js`: removed the three replay-welcome tests (mount / click→showWelcome(true) / app:language re-translate) plus the now-unused `itemsByKey` helper and `showWelcome` from the fake coordinator. Kept the three security-note tests intact; renumbered surviving sections A/B.
  - `tests/41-demo-gate.test.js`: rewrote the ordering assertion — `takeTour` now asserted AFTER `help.entry.center` and BEFORE `help.entry.contact` (no `replayWelcome` reference).
- **Task 2 — remove the row from app.js (`19d0849`):** deleted the `help.entry.replayWelcome` item (whose action called `AttentionCoordinator.showWelcome(true)`) from `initHelpEntry` `items[]` and its comment block; updated the list-comment. `items[]` now has exactly three rows. Demo filter / mount loop / re-translate listener untouched. `AttentionCoordinator.showWelcome` unchanged in `attention-coordinator.js`.
- **Task 3 — retire key + relabel + traceability (`67285b1`):** removed `help.entry.replayWelcome` from all four locale files; relabelled `help.entry.takeTour` (EN "Onboarding Tour"; he `סיור מודרך`, de `Einführungstour`, cs `Úvodní prohlídka` — DRAFT, flagged for Phase 42.1). Added an ONBD-02 note in `.planning/REQUIREMENTS.md` recording the Phase-40 D-17 menu-replay reversal (2026-07-08); ONBD-02 stays Complete.

## Verification

- `node tests/40-i18n-parity.test.js` → 3/0
- `node tests/40-app-wiring.test.js` → 3/0
- `node tests/41-demo-gate.test.js` → 2/0
- `node tests/41-tour-i18n-parity.test.js` → pass (takeTour parity holds with new label)
- `node tests/run-all.js` → **153 passed, 0 failed** (down from 156 raw by the 3 removed replay tests; zero failures)
- Grep gates all satisfied: `help.entry.replayWelcome` = 0 across app.js + 4 locales + realigned tests; `showWelcome(true)` = 0 in app.js; `showWelcome` still present (7×) in `attention-coordinator.js`; EN `"help.entry.takeTour": "Onboarding Tour"` = 1; `takeTour` present + non-empty in he/de/cs.

## Deviations from Plan

None — plan executed exactly as written. (Two explanatory comments initially reintroduced the negative-grepped tokens `replayWelcome` / `showWelcome(true)` / `Replay welcome` into the realigned test files; reworded before commit so the `== 0` gates hold. This is a pre-commit self-correction within Task 1, not a plan deviation.)

## Known Stubs

None. The three he/de/cs tour labels are machine-drafts explicitly flagged DRAFT for the Phase 42.1 native-speaker pass (consistent with the milestone's L10N-01 deferral) — not stubs that block the plan goal.

## Self-Check: PASSED

- `.planning/phases/41-replayable-guided-tour/41-12-SUMMARY.md` — FOUND
- Commit `ad1e574` (Task 1) — FOUND
- Commit `19d0849` (Task 2) — FOUND
- Commit `67285b1` (Task 3) — FOUND
