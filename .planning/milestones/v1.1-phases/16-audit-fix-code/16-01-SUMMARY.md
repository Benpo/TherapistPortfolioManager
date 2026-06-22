---
phase: 16-audit-fix-code
plan: 01
subsystem: infra
tags: [service-worker, pwa, csp, security, offline, fonts]

# Dependency graph
requires: []
provides:
  - Corrected SW font cache (3 Rubik weights instead of non-existent Variable file)
  - App logo and botanical illustrations precached for offline
  - SW registration on all 11 HTML pages
  - Content-Security-Policy meta tag on all 11 HTML pages
  - Cache bumped to sessions-garden-v19
affects: [pwa, offline, security-headers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSP meta tag immediately after charset meta in all HTML pages"
    - "SW registration one-liner before closing </body>"

key-files:
  created: []
  modified:
    - sw.js
    - license.html
    - impressum.html
    - datenschutz.html
    - demo.html
    - index.html
    - landing.html
    - add-client.html
    - add-session.html
    - sessions.html
    - reporting.html
    - disclaimer.html

key-decisions:
  - "CSP allows unsafe-inline for script/style because inline blocks are used for theme/gate detection before page load"
  - "CSP connect-src includes api.lemonsqueezy.com for license validation"
  - "CSP img-src includes data: and blob: for canvas photo crop and data URL handling"

patterns-established:
  - "CSP meta tag: placed immediately after <meta charset> in every HTML file"
  - "SW registration: one-liner script before </body>"

requirements-completed: [FIX-01, FIX-07]

# Metrics
duration: 10min
completed: 2026-03-23
---

# Phase 16 Plan 01: SW Font Fix, Image Precache, SW Registration, and CSP Headers Summary

**Service worker corrected to cache 3 actual Rubik weight files (not the non-existent Variable file), app images precached, SW registered on all 11 pages, and CSP meta tags added to all 11 pages.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-23T00:00:00Z
- **Completed:** 2026-03-23
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Fixed SW font cache mismatch: replaced `/assets/fonts/Rubik-Variable.woff2` with actual weight files (Rubik-Regular, Rubik-SemiBold, Rubik-Bold)
- Added logo.png and 2 botanical illustration assets to PRECACHE_URLS for offline availability
- Added SW registration to 4 pages that previously lacked it (license, impressum, datenschutz, demo)
- Added identical Content-Security-Policy meta tag to all 11 HTML pages
- Bumped cache version from v18 to v19 to force cache refresh

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix SW font cache, add image assets, bump version, register SW on 4 pages** - `268e412` (fix)
2. **Task 2: Add Content-Security-Policy meta tag to all 11 HTML pages** - `dac033e` (fix)

## Files Created/Modified

- `sw.js` - Fixed font entries (3 weights), added image assets to PRECACHE_URLS, bumped to v19
- `license.html` - Added SW registration before </body>
- `impressum.html` - Added SW registration before </body>
- `datenschutz.html` - Added SW registration before </body>
- `demo.html` - Added SW registration before </body>
- `index.html` - Added CSP meta tag after charset
- `landing.html` - Added CSP meta tag after charset
- `license.html` - Added CSP meta tag after charset
- `disclaimer.html` - Added CSP meta tag after charset
- `impressum.html` - Added CSP meta tag after charset
- `datenschutz.html` - Added CSP meta tag after charset
- `demo.html` - Added CSP meta tag after charset
- `add-client.html` - Added CSP meta tag after charset
- `add-session.html` - Added CSP meta tag after charset
- `sessions.html` - Added CSP meta tag after charset
- `reporting.html` - Added CSP meta tag after charset

## Decisions Made

- CSP uses `unsafe-inline` for both script-src and style-src because all pages use inline script blocks for theme detection, gate checks, and i18n initialization before any external scripts load
- `connect-src` explicitly includes `https://api.lemonsqueezy.com` to allow license validation API calls from license.js
- `img-src` includes `data:` and `blob:` for photo handling (canvas crop workflow produces data URLs)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SW now caches correct font files — offline font loading will work
- All pages have CSP baseline security headers
- 16-02 can proceed independently

## Self-Check: PASSED

- sw.js contains `sessions-garden-v19`: confirmed
- sw.js contains Rubik-Regular, Rubik-SemiBold, Rubik-Bold: confirmed (3 entries)
- sw.js does NOT contain Rubik-Variable: confirmed
- sw.js contains logo.png: confirmed
- All 4 previously-missing pages have SW registration: confirmed
- All 11 HTML pages have Content-Security-Policy: confirmed (grep count = 11)
- Task commits exist: 268e412, dac033e

---
*Phase: 16-audit-fix-code*
*Completed: 2026-03-23*
