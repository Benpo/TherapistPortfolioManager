---
phase: 04-internationalization-and-distribution-research
plan: 01
subsystem: i18n, ui
tags: [i18n, file-split, terminology, heart-shield, sessions-garden]

# Dependency graph
requires:
  - phase: 03-data-model-and-features
    provides: Finalized translatable field names, i18n.js monolithic file
provides:
  - Per-language i18n files (i18n-en.js, i18n-he.js, i18n-de.js, i18n-cs.js)
  - Thin loader (i18n.js) with no translation content
  - Heart Shield / Sessions Garden / Practice terminology across all languages
  - Brand subtitle wired to i18n
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "window.I18N = window.I18N || {} additive pattern for multi-file loading"
    - "Per-language files self-register translations on window.I18N[lang]"
    - "Loader file (i18n.js) contains only runtime config, no content"

key-files:
  created:
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
  modified:
    - assets/i18n.js
    - assets/overview.js
    - assets/sessions.js
    - assets/reporting.js
    - index.html
    - add-session.html
    - add-client.html
    - sessions.html
    - reporting.html

key-decisions:
  - "i18n keys renamed (heartWall→heartShield) but IndexedDB data properties (client.heartWall, session.heartWallCleared) left untouched"
  - "JS variable names renamed to match new terminology (heartWallCell→heartShieldCell etc.)"
  - "Czech: Klinika→Praxe, issueName→Důvod návštěvy / téma"
  - "All 5 HTML files load 4 language scripts + loader (5 script tags replacing 1)"

patterns-established:
  - "Adding a new language requires only creating i18n-XX.js and adding a script tag"

requirements-completed: [I18N-01, I18N-02, I18N-03]

# Metrics
completed: 2026-03-12
---

# Phase 4 Plan 1: i18n File Split + Terminology Renames

**Split monolithic 899-line i18n.js into 4 per-language files, renamed Heart-Wall→Heart Shield, Clinic→Practice, and wired brand subtitle to i18n**

## Accomplishments
- Split i18n.js (899 lines) into 4 per-language files (~200 lines each) + thin loader
- Renamed terminology across all 4 languages:
  - Heart-Wall → Heart Shield / הגנת הלב / Herzschutz / Ochrana srdce
  - Clinic → Practice / קליניקה (unchanged) / Praxis / Praxe
  - Emotion Code Portfolio → Sessions Garden (already done in UI, now in all i18n keys)
- Brand subtitle wired to data-i18n on all 5 HTML pages
- JS variable and App.t() key renames in overview.js, sessions.js, reporting.js

## Task Commits
- `563a7a5` — feat(04): complete i18n file split, terminology renames, quote cleanup, RTL validation, and distribution decision

## Files Created/Modified
- `assets/i18n-en.js` — Created. English translations + 41 quotes
- `assets/i18n-he.js` — Created. Hebrew translations + 41 quotes
- `assets/i18n-de.js` — Created. German translations + 41 quotes
- `assets/i18n-cs.js` — Created. Czech translations + 41 quotes
- `assets/i18n.js` — Reduced to loader-only (from 899 lines)
- `assets/overview.js` — App.t key renames (heartWall→heartShield)
- `assets/sessions.js` — Variable + App.t key renames
- `assets/reporting.js` — Variable + element ID renames
- 5 HTML files — Script tags updated, brand subtitle wired to i18n

## Deviations from Plan
None

## Issues Encountered
- IndexedDB data properties (client.heartWall, session.heartWallCleared) intentionally NOT renamed to avoid data migration

---
*Phase: 04-internationalization-and-distribution-research*
*Completed: 2026-03-12*
