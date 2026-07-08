---
phase: 41-replayable-guided-tour
plan: 01
subsystem: ui
tags: [i18n, tour, onboarding, parity-gate, en, he, de, cs]

# Dependency graph
requires:
  - phase: 40-first-run-welcome-onboarding-coordinator
    provides: "help.welcome.* / help.entry.* / onboard.* i18n neighborhood + AttentionCoordinator reminder surface pattern + Phase 40-01 RED-first parity-gate precedent"
provides:
  - "39 help.tour.* copy keys (10 step titles + 10 bodies + chrome + fallback + exit choice + reminder card + finish card) in all four locales"
  - "help.entry.takeTour '?' popover label in all four locales"
  - "tests/41-tour-i18n-parity.test.js — 4-locale presence/non-empty/parity/placeholder/no-emoji gate"
affects: [41-02, 41-03, 41-04, 41-05, 42.1-help-onboarding-translation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RED-first 4-locale i18n parity gate (vm-sandbox loader, no require of i18n files) — mirrors tests/40-i18n-parity.test.js"
    - "Placeholder-token preservation assertion ({screen}/{n}/{total}) added on top of the 40-01 gate shape"

key-files:
  created:
    - tests/41-tour-i18n-parity.test.js
  modified:
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js

key-decisions:
  - "Authored the full tour-copy contract (39 keys) in ALL four locales this phase (D-11), not EN-only, so TOUR-04's mid-tour language switch can demo in every language."
  - "EN is canonical draft from 41-UI-SPEC Copywriting Contract; HE (noun/infinitive), DE (Sie), CS (formal) authored to the same key set and flagged in-file for the TOUR-01 native-speaker pass (Phase 40-01 precedent)."
  - "Step titles authored as nouns/gerunds (never bare imperatives) so Hebrew reads naturally (Pitfall 9 / Phase 24 D-05)."

patterns-established:
  - "Tour copy block inserted immediately after the help.welcome.* block in each locale file, keeping the help.* neighborhood together; CS stored \\u-escaped to match its file convention, EN/HE/DE raw UTF-8 to match theirs."

requirements-completed: [TOUR-01, TOUR-04]

coverage:
  - id: D1
    description: "All 39 help.tour.* keys + help.entry.takeTour resolve non-empty across en/he/de/cs, key-set is parity-locked, {screen}/{n}/{total} placeholders preserved, no emoji"
    requirement: "TOUR-01"
    verification:
      - kind: unit
        ref: "tests/41-tour-i18n-parity.test.js (exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tour copy is on-voice (calm garden voice, not SaaS product-tour energy) and the HE/DE/CS translations are natural and correct"
    verification: []
    human_judgment: true
    rationale: "Translation quality and brand-voice fit are Sapir's/native-speaker's judgment — TOUR-01 pipeline native-speaker gate runs before phase close; EN/HE/DE/CS values are flagged DRAFT in-file."

# Metrics
duration: 14min
completed: 2026-07-08
status: complete
---

# Phase 41 Plan 01: Tour Copy Contract Summary

**39 help.tour.* tour-copy keys (10 step titles + 10 bodies + chrome + fallback + mid-tour exit + re-entry reminder + finish card) plus help.entry.takeTour authored in EN/HE/DE/CS behind a RED-first 4-locale parity gate**

## Performance

- **Duration:** ~14 min
- **Completed:** 2026-07-08
- **Tasks:** 2
- **Files modified:** 5 (4 locale files + 1 new test)

## Accomplishments
- Authored the complete tour copy contract — 39 `help.tour.*` keys + `help.entry.takeTour` — in all four locales (EN canonical draft, HE/DE/CS to the same key set), so downstream tour-engine/wiring/coordinator plans (03/04/05) reference stable key names and TOUR-04's mid-tour language switch demos in every language.
- Added `tests/41-tour-i18n-parity.test.js`: a RED-first vm-sandbox gate asserting presence, non-empty, cross-locale key-set parity, placeholder-token preservation, and no-emoji across the 4 locales.
- Full suite green at 145/145 (131 prior + the new tour-parity file + others discovered), no regression.

## Task Commits

1. **Task 1: RED 4-locale tour-copy parity gate** - `11c151b` (test)
2. **Task 2: Author 39 help.tour.* keys in all four locales** - `86daee0` (feat)

## Files Created/Modified
- `tests/41-tour-i18n-parity.test.js` - New. Loads all four i18n files into one vm sandbox; asserts presence/non-empty/parity/placeholder/no-emoji over the 39-key tour set.
- `assets/i18n-en.js` - EN canonical draft tour copy block (step 6 body names PDF export, D-01).
- `assets/i18n-he.js` - HE noun/infinitive translations, flagged for native-speaker review.
- `assets/i18n-de.js` - DE (Sie register) translations, flagged for native-speaker review.
- `assets/i18n-cs.js` - CS (formal register) translations, `\u`-escaped per file convention, flagged for native-speaker review.

## Decisions Made
- Tour copy inserted immediately after `help.welcome.*` in each file (keeps help.* neighborhood contiguous), rather than appended at file end — matches the plan's read_first guidance and the Phase 40 layout.
- `help.tour.reminder.dismiss` / `help.tour.exit` labels kept button-length and neutral-toned (D-08); reminder "Dismiss" rendered as HE "סגירה", DE "Ausblenden", CS "Zavřít".

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None. The RED gate failed exactly as designed (156 missing-key issues, exit 1) before Task 2, then flipped green (exit 0) after. All Task 2 acceptance greps returned the expected counts.

## Threat Flags
None. This plan ships only static bundled i18n data (T-41-01 disposition: mitigation is enforced downstream at the render seam in Plans 03/04 via textContent). No new network surface, auth path, file access, or schema change. No package installs (T-41-SC N/A).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tour copy keys are stable and parity-locked; Plans 03/04 (tour engine) can consume `help.tour.step.*` / `help.tour.fallbackBody` / `help.tour.finish.*` via `t()`, and Plan 05 can consume `help.entry.takeTour` + `help.tour.reminder.*`.
- Open item for phase close: HE/DE/CS values are flagged DRAFT in-file, pending the TOUR-01 native-speaker-agent verification pass (same precedent as Phase 40-01 and the 42.1 translation phase).

## Self-Check: PASSED
- `tests/41-tour-i18n-parity.test.js` exists (FOUND)
- Commit `11c151b` exists (FOUND)
- Commit `86daee0` exists (FOUND)

---
*Phase: 41-replayable-guided-tour*
*Completed: 2026-07-08*
