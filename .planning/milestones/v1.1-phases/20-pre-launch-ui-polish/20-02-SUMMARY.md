---
phase: 20-pre-launch-ui-polish
plan: 02
subsystem: ui
tags: [popover, language-selector, footer, shared-chrome, dark-mode, a11y]

requires:
  - phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update
    provides: Globe button pattern, legal page per-language files
  - phase: 11-visual-identity-update
    provides: Botanical decoration patterns, dark mode invert treatment
provides:
  - Globe button + popover language selector on all app pages
  - Equal-size circular header control buttons (theme toggle, language)
  - SharedChrome.renderFooter() utility for portable footer rendering
  - SharedChrome.getNavigationContext() for context-aware navigation
  - SharedChrome.getLocalizedLegalLink() for language-aware legal links
  - App footer with legal links, contact email, copyright, version on all 5 app pages
affects: [20-03, license-page, legal-pages]

tech-stack:
  added: []
  patterns: [JS-populated header controls, IIFE module pattern for SharedChrome, language-aware footer re-rendering]

key-files:
  created:
    - assets/shared-chrome.js
  modified:
    - assets/app.js
    - assets/app.css
    - index.html
    - sessions.html
    - add-client.html
    - add-session.html
    - reporting.html
    - sw.js

key-decisions:
  - "Globe popover replaces native select for language switching on app pages — matches landing page pattern"
  - "SharedChrome uses inline FOOTER_STRINGS for portability across pages that may not load i18n.js"
  - "Footer re-renders on language change via SharedChrome.renderFooter() call in popover click handler"
  - "initLicenseLink() removed from initCommon — license key icon no longer in app header"

patterns-established:
  - "header-control-btn: 36x36 circular buttons for header actions (theme toggle, globe)"
  - "SharedChrome IIFE module: standalone utility loadable by any page for footer/navigation context"

requirements-completed: [POLISH-02, POLISH-06]

duration: 4min
completed: 2026-03-25
---

# Phase 20 Plan 02: App Header Redesign and Shared Footer Summary

**Globe popover language selector with equal-size dark mode toggle, and shared footer with legal links, contact email, copyright, and version on all 5 app pages**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-25T01:22:58Z
- **Completed:** 2026-03-25T01:27:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Replaced native select dropdown with globe button + popover language selector on all 5 app pages
- Theme toggle and globe button use matching 36x36 circular design (header-control-btn class)
- Removed license key icon from app header (initLicenseLink no longer called)
- Created shared-chrome.js with portable SharedChrome API (renderFooter, getNavigationContext, getLocalizedLegalLink)
- Footer with botanical accent, 3 legal links, contact email, copyright + version renders on all 5 app pages
- Footer links are language-aware and update when language changes
- SW cache bumped to v34 with shared-chrome.js added to precache

## Task Commits

Each task was committed atomically:

1. **Task 1: Redesign app header with popover language selector and equal-size controls** - `5095b67` (feat)
2. **Task 2: Create shared-chrome.js and render app footer on all 5 app pages** - `5b28d2e` (feat)

## Files Created/Modified
- `assets/shared-chrome.js` - SharedChrome IIFE module with footer rendering and navigation context utilities
- `assets/app.js` - New initLanguagePopover(), updated initThemeToggle() with header-control-btn, updated initCommon()
- `assets/app.css` - header-control-btn, lang-popover, lang-option, app-footer styles
- `index.html` - Simplified header-actions to JS-populated container, removed old botanical footer, added shared-chrome.js script
- `sessions.html` - Simplified header-actions, added shared-chrome.js script
- `add-client.html` - Simplified header-actions, added shared-chrome.js script
- `add-session.html` - Simplified header-actions, added shared-chrome.js script
- `reporting.html` - Simplified header-actions, added shared-chrome.js script
- `sw.js` - Bumped cache to v34, added shared-chrome.js to PRECACHE_URLS

## Decisions Made
- Globe popover replaces native select for language switching -- matches landing page pattern, more polished
- SharedChrome uses inline FOOTER_STRINGS (not i18n.js) for portability across pages that may not load the i18n system
- Footer re-renders on language change via SharedChrome.renderFooter() call in popover click handler
- initLicenseLink() removed from initCommon -- license key icon no longer in app header per D-03

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all functionality is fully wired.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- shared-chrome.js is ready for Plan 03 to add footer to license and legal pages
- SharedChrome.getNavigationContext() provides context-aware home link for non-app pages

---
*Phase: 20-pre-launch-ui-polish*
*Completed: 2026-03-25*

## Self-Check: PASSED

All 9 files verified present. Both task commits (5095b67, 5b28d2e) verified in git log.
