---
phase: 04-internationalization-and-distribution-research
plan: 02
subsystem: i18n
tags: [quotes, hebrew-fix, quality]

# Dependency graph
requires:
  - phase: 04-internationalization-and-distribution-research
    plan: 01
    provides: Per-language i18n files with quotes arrays
provides:
  - Fixed Hebrew quote #12 (שכל→ראש)
  - Removed 7 problematic quotes across all 4 languages
  - 41 quotes per language (down from 48)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js

key-decisions:
  - "User rejected 7 proposed replacement quotes — chose to simply remove problematic ones"
  - "41 quotes per language is sufficient (30 custom + 11 famous with attribution)"
  - "Hebrew quote #12 fixed: שכל→ראש (head, not intellect)"

patterns-established: []

requirements-completed: [I18N-02, I18N-03]

# Metrics
completed: 2026-03-12
---

# Phase 4 Plan 2: Quote Overhaul

**Fixed Hebrew quote #12, removed 7 problematic quotes across all languages, verified DE/CS quality**

## Accomplishments
- Fixed Hebrew quote #12: changed שכל (intellect) to ראש (head) for correct meaning
- Identified 7 problematic famous quotes (inaccurate attributions, misattributed, overly religious)
- Removed 7 quotes from all 4 languages (user preferred removal over replacement)
- Final count: 41 quotes per language (30 custom + 11 famous with attribution)
- Verified German and Czech quote translations for accuracy

## Task Commits
- `563a7a5` — feat(04): complete i18n file split, terminology renames, quote cleanup, RTL validation, and distribution decision

## Deviations from Plan
- Plan proposed 7 replacement quotes. User rejected replacements, preferring fewer total quotes.

## Issues Encountered
None

---
*Phase: 04-internationalization-and-distribution-research*
*Completed: 2026-03-12*
