---
phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update
plan: "05"
subsystem: ui
tags: [i18n, globe-selector, legal-pages, vanilla-js, pwa]

# Dependency graph
requires:
  - phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update
    provides: Legal pages (disclaimer.html, impressum.html, datenschutz.html) already restructured by plans 01-04
provides:
  - Shared globe-lang component (assets/globe-lang.css + assets/globe-lang.js)
  - Globe language selector on disclaimer.html (replaces native <select>)
  - Globe language selector on impressum.html (new)
  - Globe language selector on datenschutz.html (new)
  - Service worker v16 caching new component files
affects:
  - Phase 15 (architecture audit) — globe-lang component is the new canonical i18n selector pattern for legal pages

# Tech tracking
tech-stack:
  added: []
  patterns:
    - initGlobeLang({ containerId, currentLang, onLangChange }) — reusable globe popover initializer with click-outside close
    - Legal pages use reload-on-change (window.location.search) for simplicity; disclaimer uses in-page re-render

key-files:
  created:
    - assets/globe-lang.css
    - assets/globe-lang.js
  modified:
    - disclaimer.html
    - impressum.html
    - datenschutz.html
    - assets/disclaimer.js
    - sw.js

key-decisions:
  - "Globe selector on impressum/datenschutz uses reload-on-change (window.location.search = ?lang=X) for simplicity — no inline re-render needed since content is static HTML"
  - "Globe selector on disclaimer uses in-page re-render (applyDirection + renderText) to preserve checkbox state across language switches"
  - "globe-lang component uses CSS inset-inline-end for RTL-safe popover positioning"

patterns-established:
  - "Pattern: initGlobeLang injected into a container div — legal pages add <div id=globe-container> in topbar, call initGlobeLang after lang detection"

requirements-completed: [D-09]

# Metrics
duration: 12min
completed: 2026-03-23
---

# Phase 14 Plan 05: Globe Language Selector on Legal Pages Summary

**Extracted globe language selector into shared globe-lang.css/js component and added to all three legal pages, replacing the native select on disclaimer and adding a selector to impressum and datenschutz.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-23T01:20:00Z
- **Completed:** 2026-03-23T01:32:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created `assets/globe-lang.css` and `assets/globe-lang.js` as a reusable globe selector component with clean `initGlobeLang()` API
- Replaced native `<select>` dropdown on disclaimer.html with the globe popover selector
- Added globe selector to impressum.html and datenschutz.html (previously had no language switcher)
- Bumped service worker cache to v16 with new component files included in precache

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared globe-lang component files** - `544e2eb` (feat)
2. **Task 2: Add globe selector to all legal pages, remove old select** - `f69144d` (feat)

**Plan metadata:** committed with docs commit below

## Files Created/Modified
- `assets/globe-lang.css` - Globe button, popover, and option styles with RTL-safe inset-inline-end and dark mode support
- `assets/globe-lang.js` - `initGlobeLang()` initializer: injects markup into container, handles toggle, click-outside close
- `disclaimer.html` - Added globe-lang.css/js links, replaced `#lang-row` div with `#globe-container`, removed orphaned CSS rules
- `assets/disclaimer.js` - Replaced native select creation block with `initGlobeLang()` call; removed stale langLabel reference
- `impressum.html` - Added globe-lang CSS link, globe-container div in topbar, globe-lang.js script, `initGlobeLang()` with reload-on-change
- `datenschutz.html` - Same pattern as impressum
- `sw.js` - Cache bumped to v16; globe-lang.css and globe-lang.js added to PRECACHE_URLS

## Decisions Made
- Globe selector on impressum/datenschutz uses `window.location.search = '?lang=' + newLang` for simplicity since content is static HTML already in the DOM
- Globe selector on disclaimer uses in-page re-render (existing `applyDirection` + `renderText`) to preserve checkbox acceptance state across language switches
- Removed orphaned `.disclaimer-lang-row` and `.disclaimer-lang-label` CSS classes from disclaimer.html inline styles (auto-fix Rule 1)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed orphaned .disclaimer-lang-row and .disclaimer-lang-label CSS**
- **Found during:** Task 2 (disclaimer.html modifications)
- **Issue:** After replacing `#lang-row` div with `#globe-container`, the `.disclaimer-lang-row` and `.disclaimer-lang-label` CSS rules in the inline `<style>` block became dead code
- **Fix:** Removed both orphaned CSS rule blocks from disclaimer.html `<style>`
- **Files modified:** disclaimer.html
- **Verification:** No `lang-select` or `lang-row` references remain in the page
- **Committed in:** f69144d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - dead CSS cleanup)
**Impact on plan:** Minor cleanup, no scope creep. Keeps the page CSS clean.

## Issues Encountered
None - plan executed cleanly.

## Known Stubs
None - the globe selectors are fully wired to language state on all three pages.

## Next Phase Readiness
- Globe selector is consistent across all pages (landing, disclaimer, impressum, datenschutz)
- UAT test 8 (globe selector consistency) should now pass
- Phase 15 architecture audit can review globe-lang as the new canonical pattern

---
*Phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update*
*Completed: 2026-03-23*
