---
phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update
plan: "03"
subsystem: ui
tags: [legal, i18n, pwa, service-worker, html]

# Dependency graph
requires:
  - phase: 12-qa-legal-and-launch-prep
    provides: original accordion-based Impressum and Datenschutz content to extract
provides:
  - impressum.html standalone page with language detection and theme support
  - datenschutz.html standalone page with full DE+EN bilingual privacy policy
  - footer links pointing to dedicated legal pages with lang param
  - service worker caching for new legal pages
  - cleaned landing.html without accordion bloat
affects:
  - service-worker
  - landing-page

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Standalone legal pages follow disclaimer.html pattern: theme detect script in <head>, language detect script at end of body"
    - "Legal pages use URLSearchParams lang param as primary detection, then localStorage portfolioLang, then navigator.language fallback"
    - "Footer links include ?lang= param so linked pages detect active language without JS interception"

key-files:
  created:
    - impressum.html
    - datenschutz.html
  modified:
    - landing.html
    - assets/landing.js
    - assets/landing.css
    - sw.js

key-decisions:
  - "Legal pages are standalone HTML files following disclaimer.html pattern rather than modal or iframe approach — consistent with app design, SEO-friendly, offline-capable"
  - "Both DE and EN privacy policy content retained in datenschutz.html as bilingual document — same content model as the original accordion"
  - "Removed ~16 obsolete i18n keys from LANDING_I18N (impressumTitle, datenschutzTitle etc.) across all 4 languages since accordion elements no longer exist"
  - "Bumped service worker cache to sessions-garden-v15 to ensure users get refreshed landing.html and new legal pages on next visit"

patterns-established:
  - "Standalone legal page pattern: tokens.css + app.css for theming, inline detectLang() script at body end, URLSearchParams?lang= + localStorage + navigator fallback chain"

requirements-completed: [D-05, D-06]

# Metrics
duration: 15min
completed: 2026-03-23
---

# Phase 14 Plan 03: Legal Pages Extraction Summary

**Extracted Impressum and Datenschutz from landing.html accordion into dedicated standalone pages (impressum.html, datenschutz.html) with language detection, updated footer links with lang params, and bumped service worker cache to v15**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-23T10:00:00Z
- **Completed:** 2026-03-23T10:15:00Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- Created impressum.html: standalone legal page with theme detect, language detect (EN/HE/DE/CS), back link, placeholder business content
- Created datenschutz.html: standalone page with full bilingual (DE+EN) privacy policy copied from accordion, language-aware heading and direction
- Removed ~170 lines of accordion HTML from landing.html (legal-accordion div + all content)
- Updated footer links to point to dedicated pages with ?lang= param for language pass-through
- Cleaned landing.js: removed 16 orphaned i18n keys and 13 obsolete setText() calls
- Removed .legal-accordion/.legal-details CSS rules from landing.css
- Updated sw.js: added /impressum.html and /datenschutz.html to PRECACHE_URLS, bumped CACHE_NAME to sessions-garden-v15

## Task Commits

Each task was committed atomically:

1. **Task 1: Create dedicated impressum.html and datenschutz.html pages** - `22d2dfc` (feat)
2. **Task 2: Update footer links, remove accordion, register in service worker** - `cb28340` (feat)

## Files Created/Modified

- `impressum.html` - New dedicated Impressum page with language detection and theme support
- `datenschutz.html` - New dedicated Privacy Policy page with full bilingual DE+EN content
- `landing.html` - Removed ~170-line legal accordion section; footer links updated to dedicated pages
- `assets/landing.js` - Removed 16 orphaned i18n keys and 13 obsolete setText calls; added ?lang= href updates
- `assets/landing.css` - Removed .legal-accordion, .legal-details, .legal-summary, .legal-details-content rules (~70 lines)
- `sw.js` - Added /impressum.html and /datenschutz.html to PRECACHE_URLS; CACHE_NAME bumped to sessions-garden-v15

## Decisions Made

- Followed disclaimer.html pattern exactly for both new legal pages (standalone HTML, inline styles, theme detect in head, lang detect in body)
- Both DE and EN content kept in datenschutz.html — bilingual policy approach from original retained
- Removed orphaned i18n keys for all 4 languages to keep LANDING_I18N clean (footerImpressum and footerPrivacy keys retained as they are still used)
- Added ?lang= param to footer link hrefs in applyLang() so legal pages auto-detect the active language on navigation

## Deviations from Plan

None - plan executed exactly as written.

The only minor deviation was that another parallel agent (14-01 or 14-02) had already updated the contact email in landing.html and added terms link lang param support in landing.js. These were already-applied improvements that did not conflict with this plan's work.

## Issues Encountered

Initial edit of the legal accordion section in landing.html was done in two steps due to the large size of the content block (the Edit tool replaced only the header portion on the first attempt, requiring a Python-based removal for the remaining content). No functional impact — result is correct.

## Known Stubs

- `impressum.html` contains `[YOUR_BUSINESS_NAME]`, `[YOUR_STREET_ADDRESS]`, `[YOUR_CITY_POSTAL_CODE]`, `[YOUR_BUSINESS_EMAIL]`, `[YOUR_PHONE_NUMBER]`, `[YOUR_TAX_ID]` placeholders. These are intentional stubs awaiting Sapir's real business details (tracked in STATE.md blockers: LNCH-01). This plan's goal (dedicated legal pages) is achieved; stub content does not prevent its completion.
- `datenschutz.html` contains `[YOUR_BUSINESS_NAME]`, `[YOUR_STREET_ADDRESS]`, `[YOUR_CITY_POSTAL_CODE]`, `[YOUR_BUSINESS_EMAIL]` placeholders in the Verantwortlicher section. Same blocker as above.

## Next Phase Readiness

- Legal pages are in place and cached by service worker
- Footer navigation now cleanly links to dedicated legal pages with language pass-through
- Remaining blocker: Sapir must supply real business details to replace `[YOUR_*]` placeholders in impressum.html and datenschutz.html before public launch

---
*Phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update*
*Completed: 2026-03-23*
