---
phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update
plan: 01
subsystem: ui
tags: [i18n, javascript, html, landing-page, multilingual]

# Dependency graph
requires:
  - phase: 13-review-and-fix-greeting-quotes
    provides: clean quote data and i18n infrastructure already in place
provides:
  - priceNote i18n translations for trust badges in all 4 languages
  - Hebrew disclaimer without German parenthetical
  - Language persistence fix across landing <-> disclaimer navigation
  - Unified contact email contact@sessionsgarden.app across entire site
affects:
  - 14-02-PLAN
  - 14-03-PLAN

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Trust badge element must have id='price-note' and use setText('price-note', t.priceNote) in applyLang"
    - "Footer-terms link href updated dynamically with &lang= param to preserve language on navigation"
    - "handleContinue in disclaimer.js saves portfolioLang to localStorage before redirecting"

key-files:
  created: []
  modified:
    - assets/landing.js
    - landing.html
    - assets/i18n-disclaimer.js
    - assets/disclaimer.js
    - assets/license.js

key-decisions:
  - "Use &lang= URL parameter on footer-terms link to pass current language to disclaimer page"
  - "Save portfolioLang in handleContinue (not just handleAccept) so readonly visitors also preserve language"
  - "contact@sessionsgarden.app is the canonical contact email — replaces both contact@sessions.garden and support@sessionsgarden.app"
  - "Czech disclaimer already used native 'Právo na odstoupení od smlouvy' with no Widerrufsrecht parenthetical — no change needed"

patterns-established:
  - "priceNote pattern: add id to HTML element, add priceNote key to each language in LANDING_I18N, call setText in applyLang"

requirements-completed: [D-01, D-02, D-03, D-07]

# Metrics
duration: 12min
completed: 2026-03-23
---

# Phase 14 Plan 01: i18n Bugs & Email Unification Summary

**Four user-facing bugs fixed: trust badges now translate in all 4 languages, Hebrew disclaimer drops German parenthetical, language persists across landing/disclaimer navigation, and contact@sessionsgarden.app is the sole email address site-wide.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-23
- **Completed:** 2026-03-23
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Trust badge paragraph got `id="price-note"` and `priceNote` translations wired for EN/HE/DE/CS via applyLang
- Hebrew disclaimer section title changed from `זכות ביטול (Widerrufsrecht)` to `זכות ביטול` — German parenthetical removed
- Footer "Terms of Use" link now appends `&lang=` so clicking it from Hebrew preserves Hebrew on disclaimer page; `handleContinue` also saves `portfolioLang` to localStorage before redirecting
- Replaced `contact@sessions.garden` in landing.html and `support@sessionsgarden.app` in all 4 license.js error messages with `contact@sessionsgarden.app`

## Task Commits

Each task was committed atomically:

1. **Task 1: Language persistence, trust badge i18n, Hebrew disclaimer** - `2b63666` (fix)
2. **Task 2: Unify contact email to contact@sessionsgarden.app** - `721a860` (fix)

## Files Created/Modified
- `assets/landing.js` - Added priceNote to LANDING_I18N for en/he/de/cs; added setText call in applyLang; updated footer-terms href with lang param
- `landing.html` - Added id="price-note" to trust badge paragraph; replaced old contact email with contact@sessionsgarden.app; removed PLACEHOLDER comment
- `assets/i18n-disclaimer.js` - Removed (Widerrufsrecht) from Hebrew title
- `assets/disclaimer.js` - Added portfolioLang save to localStorage in handleContinue before redirect
- `assets/license.js` - Replaced support@sessionsgarden.app with contact@sessionsgarden.app in all 4 language errorDeviceLimit messages

## Decisions Made
- Footer-terms link uses `&lang=` URL param because the disclaimer page checks URL param first in its `detectLang()` chain — most reliable method
- `handleContinue` saves `portfolioLang` because even readonly visitors (coming back from disclaimer to landing) should have language preserved
- Czech `(Widerrufsrecht)` check done — Czech already uses native Czech phrasing, no change needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Language persistence, trust badge i18n, Hebrew disclaimer, and contact email are all clean
- Plans 14-02 and 14-03 can execute independently (they handle globe icon language selector and dedicated legal pages)

---
*Phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update*
*Completed: 2026-03-23*
