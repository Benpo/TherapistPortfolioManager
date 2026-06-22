---
phase: 19-go-live-preparation
plan: 05
subsystem: infra
tags: [service-worker, pwa, offline, legal-pages, i18n]

# Dependency graph
requires:
  - phase: 19-go-live-preparation 19-01
    provides: Impressum per-language standalone files (impressum.html, impressum-en.html, impressum-he.html, impressum-cs.html)
  - phase: 19-go-live-preparation 19-02
    provides: Datenschutz + Disclaimer per-language standalone files
provides:
  - SW precache list includes all 12 legal page file variants for offline access
  - Landing page footer links use direct per-language file navigation (no ?lang= params)
  - CACHE_NAME bumped to sessions-garden-v25 forcing cache refresh on next visit
affects: [pwa, offline, landing-page, legal-compliance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SW cache version bump pattern: increment vN suffix on CACHE_NAME to force full cache refresh for all users"
    - "Per-language file navigation: DE uses primary file (no suffix), all other languages use -{lang}.html suffix"

key-files:
  created: []
  modified:
    - sw.js
    - assets/landing.js
    - landing.html

key-decisions:
  - "SW CACHE_NAME bumped from v24 to v25 — forces all users to refresh cache and pick up new legal page files"
  - "Footer link default hrefs in landing.html changed to EN variants (-en.html) — matches page default lang=en attribute before JS runs"
  - "?lang= URL param approach fully eliminated from footer links — direct file navigation is simpler, works offline, no URL param dependency"

patterns-established:
  - "Legal page navigation: always construct ./pagename-{lang}.html, with DE special-cased to ./pagename.html"

requirements-completed: [LIVE-02]

# Metrics
duration: 8min
completed: 2026-03-24
---

# Phase 19 Plan 05: SW Cache + Cross-Link Update Summary

**SW precache expanded to all 12 legal page variants (v25) and landing footer links switched from ?lang= URL params to direct per-language file navigation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-24T20:00:00Z
- **Completed:** 2026-03-24T20:08:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added all 12 legal page paths to PRECACHE_URLS (impressum/datenschutz/disclaimer for DE/EN/HE/CS)
- Bumped CACHE_NAME from sessions-garden-v24 to sessions-garden-v25 to force cache refresh
- Updated landing.js footer link logic to navigate to per-language files instead of using ?lang= params
- Updated landing.html default footer hrefs from DE to EN variants (matching default lang=en)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update sw.js PRECACHE_URLS with all 12 legal page paths and bump CACHE_NAME** - `1a23f20` (chore)
2. **Task 2: Update landing page and footer cross-links to per-language legal files** - `c6b906f` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified

- `sw.js` - CACHE_NAME bumped to v25; 9 new legal page entries added (3 existing + 9 new = 12 total)
- `assets/landing.js` - Footer link hrefs rewritten from ?lang= params to direct per-language file paths; DE uses primary file, others use -{lang} suffix
- `landing.html` - Default footer hrefs changed from .html to -en.html variants

## Decisions Made

- SW cache bump to v25 ensures existing users with installed PWA pick up the new legal page files on next visit
- Default landing.html hrefs changed to EN (-en.html) because the page's default `lang="en"` attribute means EN users without JS would land on correct pages; JS overwrites these immediately for detected language
- ?lang= URL param approach removed entirely — per-language files are self-contained and don't need URL params to determine language

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 12 legal page files are now cached by the SW for offline use
- Landing page footer links correctly navigate to the right language variant on all 4 languages
- Ready for Phase 19-06 (next plan in wave 2)

---
*Phase: 19-go-live-preparation*
*Completed: 2026-03-24*
