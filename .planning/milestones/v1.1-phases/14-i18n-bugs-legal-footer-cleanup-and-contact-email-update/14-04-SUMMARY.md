---
phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update
plan: "04"
subsystem: ui
tags: [i18n, lang-passthrough, url-params, disclaimer, impressum, landing-css]

# Dependency graph
requires:
  - phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update
    provides: Legal pages (impressum.html, disclaimer.html) and landing.js/license.js foundation
provides:
  - License page receives correct language from landing page via ?lang= URL param
  - disclaimer-brand converted from non-clickable div to anchor linking to landing.html
  - Impressum shows Hebrew heading "אודות / Impressum" for Hebrew users
  - License CTA button in landing header is visually enlarged and prominent
affects: [uat, qa, license-flow, rtl-support]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "URLSearchParams in getLicenseLang() for URL-first lang detection before localStorage fallback"
    - "?lang= param appended to all outbound license.html links from landing.js applyLang()"

key-files:
  created: []
  modified:
    - assets/landing.js
    - assets/license.js
    - disclaimer.html
    - impressum.html
    - assets/landing.css

key-decisions:
  - "URL param takes priority over localStorage in getLicenseLang() — ensures explicit lang= overrides any stored preference"
  - "Impressum Hebrew heading uses 'אודות / Impressum' to give Hebrew label while retaining German legal term"
  - "license CTA enlarged to match hero CTA: 1.1875rem font, 0.6875rem/2rem padding, min-inline-size 220px, font-weight 600"

patterns-established:
  - "Pattern: all nav links from landing.js to license.html must include ?lang= param to preserve user's language context"

requirements-completed: [D-01, D-02, D-08]

# Metrics
duration: 5min
completed: 2026-03-23
---

# Phase 14 Plan 04: UAT Gap Closure — Lang Passthrough, Disclaimer Link, Impressum Hebrew, CTA Enlargement Summary

**Four targeted UAT fixes: ?lang= passthrough to license page, disclaimer brand converted to clickable link, Impressum Hebrew heading added, and license CTA button visually enlarged to match hero CTA prominence.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-23T01:15:00Z
- **Completed:** 2026-03-23T01:16:21Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Hebrew users clicking "I have a license" from landing page now land on license.html in Hebrew (URL param ?lang=he passes language)
- getLicenseLang() in license.js reads URL param first, before localStorage — explicit param always wins
- Sessions Garden brand text in disclaimer.html is now a clickable anchor linking to landing.html
- Impressum page shows "אודות / Impressum" for Hebrew users instead of just "Impressum"
- License CTA button in landing header enlarged: 1.1875rem font, 600 weight, 0.6875rem/2rem padding, 220px min-width

## Task Commits

Each task was committed atomically:

1. **Task 1: License lang passthrough and disclaimer brand link** - `aad0cfc` (fix)
2. **Task 2: Impressum Hebrew heading and license CTA enlargement** - `0639630` (fix)

## Files Created/Modified
- `assets/landing.js` - ?lang= param appended to hero-enter-link and pricing-license-link in applyLang()
- `assets/license.js` - URLSearchParams URL param reader added at top of getLicenseLang()
- `disclaimer.html` - disclaimer-brand changed from div to anchor with href="./landing.html"
- `impressum.html` - TITLES he value changed from 'Impressum' to 'אודות / Impressum'
- `assets/landing.css` - .landing-enter-link enlarged: font-size, font-weight, padding, min-inline-size, text-align

## Decisions Made
- URL param takes priority over localStorage in getLicenseLang() — ensures ?lang= from landing always wins over any previously stored preference
- Impressum Hebrew heading uses "אודות / Impressum" bilingual form — gives Hebrew label while retaining the German legal term for reference
- License CTA enlarged to match hero CTA visual weight (1.1875rem = 19px, same as hero) — addresses "not enlarged enough" feedback

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 UAT gaps from this plan are closed
- License language flow: landing -> license.html fully working for all 4 languages
- Ready for Phase 15 architecture and UI audit

---
*Phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update*
*Completed: 2026-03-23*
