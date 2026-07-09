---
phase: 42-in-app-changelog-what-s-new
plan: 08
subsystem: i18n
tags: [i18n, changelog, whats-new, chrome, localization]
requires:
  - "changelog.js / whats-new.js / app.js read these keys (plans 04/05/07)"
provides:
  - "10 changelog.*/whatsNew.* UI-chrome keys in en/he/de/cs"
  - "T-42-V11 i18n-parity gate green"
affects:
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
tech-stack:
  added: []
  patterns:
    - "Chrome strings ship in all 4 locales this phase (D-17); entry-body translation deferred to Phase 42.1"
    - "CS locale stored as \\u escapes (house style); HE/DE/EN literal UTF-8 + literal em dash"
    - "{X.Y} version placeholder kept verbatim in whatsNew.title across all locales"
key-files:
  created: []
  modified:
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "Category labels rendered as natural noun forms per locale: HE שיפורים/תיקונים (Improvements/Fixes) reads more naturally than participles; DE Neu/Verbessert/Behoben (conventional changelog labels); CS Nové/Vylepšeno/Opraveno"
metrics:
  duration: ~8min
  completed: 2026-07-09
status: complete
---

# Phase 42 Plan 08: Changelog / What's-New i18n Chrome Keys Summary

Added the 10 UI-chrome i18n keys for the changelog page and What's-New popup to all four locale dictionaries (en/he/de/cs), turning the plan-03 i18n-parity gate (T-42-V11) from RED to GREEN.

## What Was Built

Task 1 added these 10 keys to each of `assets/i18n-en.js`, `i18n-he.js`, `i18n-de.js`, `i18n-cs.js`, inserted directly after the existing `help.entry.takeTour` key so they sit in the same help/chrome family:

- Page: `changelog.page.title`, `changelog.page.intro`, `changelog.cat.new`, `changelog.cat.improved`, `changelog.cat.fixed`
- Popup + menu: `whatsNew.title`, `whatsNew.sub`, `whatsNew.seeAll`, `whatsNew.close`, `whatsNew.menuRow`

EN values match the UI-SPEC Copywriting Contract verbatim. HE/DE/CS follow each file's existing register (HE gender-neutral plural house style, DE Sie, CS formal). The `{X.Y}` interpolation token in `whatsNew.title` is preserved verbatim in all four locales — no hardcoded version number. Category labels are natural noun forms, not imperatives. No emoji (D-10).

## Verification

- `node tests/42-i18n-parity.test.js` — 3 passed, 0 failed (was RED). Presence + non-empty + cross-locale parity + no-emoji, all green.
- `node -c` passes for all four locale files.
- `{X.Y}` placeholder confirmed present in `whatsNew.title` for en/he/de/cs.

## Deviations from Plan

None — plan executed exactly as written.

Note: The CS file transparently stores non-ASCII values as `\u` escape sequences (its existing house style); literal UTF-8 written via Edit landed as escapes, matching the file convention. Functionally identical string values (parity test asserts decoded values, all pass).

## Self-Check: PASSED

- FOUND: assets/i18n-en.js, i18n-he.js, i18n-de.js, i18n-cs.js (all 10 keys present, parity green)
- FOUND commit: 6321f91
