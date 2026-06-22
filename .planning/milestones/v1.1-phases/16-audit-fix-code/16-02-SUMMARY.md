---
phase: 16-audit-fix-code
plan: 02
subsystem: security
tags: [postMessage, xss, csp, rtl, i18n, sessionStorage, localStorage]

# Dependency graph
requires: []
provides:
  - Explicit postMessage origin enforcement in landing.js (2 call sites)
  - Origin validation guard in demo.js message listener
  - Demo page gate bypass uses sessionStorage instead of localStorage
  - Broken botanical image path fixed in landing.html
  - RTL-safe logical properties for botanical hero positioning in landing.css
affects: [landing, demo]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "postMessage always uses window.location.origin, never wildcard '*'"
    - "Message event listeners validate event.origin before processing"
    - "Demo gate bypass uses sessionStorage (session-scoped) not localStorage (persistent)"
    - "CSS positioning uses inset-inline-start/end for RTL safety"

key-files:
  created: []
  modified:
    - assets/landing.js
    - landing.html
    - assets/landing.css
    - assets/demo.js
    - demo.html

key-decisions:
  - "postMessage origin set to window.location.origin — prevents cross-origin message injection"
  - "Demo gate uses sessionStorage — bypass lasts only one tab session, not indefinitely"
  - "Origin check uses strict !== equality — no prefix/suffix bypass possible"

patterns-established:
  - "postMessage: always window.location.origin as target, never '*'"
  - "addEventListener('message'): always guard with event.origin check as first statement"

requirements-completed: [FIX-05, FIX-06]

# Metrics
duration: 5min
completed: 2026-03-23
---

# Phase 16 Plan 02: Security Hardening — postMessage, Gate Bypass, Image Path, RTL CSS Summary

**Closed two HIGH-severity postMessage wildcard vulnerabilities and one MEDIUM gate-bypass issue: landing.js now uses window.location.origin (not '*') on all postMessage calls, demo.js validates event.origin before processing, demo.html gate bypass uses sessionStorage instead of persistent localStorage, broken botanical image path corrected, and hero botanical CSS uses RTL-safe logical properties.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-23T13:09:51Z
- **Completed:** 2026-03-23T13:14:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Replaced all wildcard `'*'` postMessage targets in landing.js with `window.location.origin` (2 call sites)
- Added `event.origin !== window.location.origin` guard as first statement in demo.js message handler
- Switched demo.html gate bypass from `localStorage` to `sessionStorage` — values no longer persist across browser sessions
- Fixed broken image path `./assets/גינה 2.png` → `./assets/illustrations/גינה 2.png`
- Converted `.hero-botanical-left` and `.hero-botanical-right` from `left`/`right` to `inset-inline-start`/`inset-inline-end` including media query variants

## Task Commits

Each task was committed atomically:

1. **Task 1: Landing page postMessage hardening, broken image fix, RTL CSS logical properties** - `3ef49fd` (fix)
2. **Task 2: Demo page postMessage origin validation and sessionStorage gate fix** - `6ec0631` (fix)

## Files Created/Modified
- `assets/landing.js` - Both postMessage calls now use window.location.origin
- `landing.html` - Botanical image path corrected to include illustrations/ subdirectory
- `assets/landing.css` - Hero botanical left/right positioning uses inset-inline-start/end (4 rules)
- `assets/demo.js` - Origin validation guard added as first line of message handler
- `demo.html` - Gate bypass setItem calls changed from localStorage to sessionStorage

## Decisions Made
- postMessage origin set to `window.location.origin` — specific and always correct for same-origin embedded iframe scenario
- `event.origin !== window.location.origin` with strict inequality — no partial-match bypass possible
- sessionStorage for gate bypass — appropriate scope: tab session only, not cross-session persistence

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All security findings from audit are now addressed
- Landing page and demo page postMessage communication is hardened
- No blockers for subsequent plans

---
*Phase: 16-audit-fix-code*
*Completed: 2026-03-23*
