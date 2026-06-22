---
phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update
plan: "06"
subsystem: ui
tags: [resize-handles, pointer-capture, i18n, datenschutz, multilingual]

# Dependency graph
requires:
  - phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update
    provides: datenschutz.html with globe selector (14-05), landing.html with demo section (14-04)
provides:
  - Demo window horizontal resize that works reliably via pointer capture (landing page)
  - Language-aware datenschutz.html with native HE/CS notices + English full text
affects: [QA, UAT-5, UAT-3, UAT-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - setPointerCapture on drag start for reliable drag-over-iframe without event theft
    - Transparent pseudo-element overlays on container edges to block iframe pointer interception
    - Language-conditional content div visibility controlled by inline script post-lang-detection

key-files:
  created: []
  modified:
    - assets/landing.css
    - assets/landing.js
    - datenschutz.html

key-decisions:
  - "Pointer capture (setPointerCapture) used instead of relying solely on iframe pointer-events:none — guarantees all pointermove events route to the capturing element"
  - "Handle width increased from 8px to 24px and extended 12px outside window body — prevents iframe from intercepting the initial pointerdown"
  - "HE/CS datenschutz approach: native-language notice (3-4 sentences) + full EN policy below — full translation of 100-line legal document not practical"
  - "EN users see EN only (not DE+EN) — avoids German text confusing non-German readers"

patterns-established:
  - "Pointer capture pattern: setPointerCapture in pointerdown, releasePointerCapture in pointerup, for drag-over-iframe operations"
  - "Legal page content visibility: wrap each language block in named div, toggle display in lang-detection script"

requirements-completed: [D-04, D-05]

# Metrics
duration: 15min
completed: 2026-03-23
---

# Phase 14 Plan 06: UAT Fix — Demo Resize and Datenschutz Multilingual Summary

**Demo resize handles made reliable via pointer capture + wider grab zone; datenschutz.html now provides language-appropriate content for all 4 languages including native HE/CS notices**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-23T01:30:00Z
- **Completed:** 2026-03-23T01:45:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Demo window resize handles widened from 8px to 24px, extended 12px outside window body to prevent iframe from capturing initial pointerdown
- setPointerCapture added on drag start — all subsequent pointermove events route to the handle even if pointer moves over the iframe
- Transparent ::before/::after overlays on demo-window-body provide additional edge protection against iframe event theft
- datenschutz.html now wraps DE and EN content in separate named divs with JavaScript-controlled visibility
- Hebrew users see a Hebrew notice explaining the local-only nature + full EN policy (no German visible)
- Czech users see a Czech notice explaining the local-only nature + full EN policy (no German visible)
- German users see DE+EN as before; English users see EN only

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix demo horizontal resize handles** - `183290e` (fix)
2. **Task 2: Add language-aware content display to datenschutz.html** - `7a25065` (feat)

## Files Created/Modified
- `assets/landing.css` - Wider handles (24px), touch-action:none, extended placement (-12px), transparent overlay pseudo-elements, larger grip dots
- `assets/landing.js` - setPointerCapture on pointerdown, releasePointerCapture in pointerup
- `datenschutz.html` - #content-de and #content-en divs, HE/CS notice blocks, script content visibility logic

## Decisions Made
- Pointer capture approach chosen as the correct browser API for drag-over-iframe — more reliable than just disabling iframe pointer-events after the fact
- Handle extended 12px outside window body: the root cause was the iframe intercepting the initial pointerdown before pointer-events:none was applied; moving the handle outside eliminates this race
- HE/CS strategy: native 2-sentence notice + full EN policy — translating 100 lines of German legal text was not practical; this gives HE/CS users meaningful context without scope creep
- English users now see EN only (not DE+EN): avoids confusing non-German readers with German text they can't read

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UAT tests 5 (demo resize), 3, and 10 (datenschutz multilingual) should now pass
- All 6 plans in Phase 14 are complete
- Ready for Phase 15 (Architecture and UI audit)

---
*Phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update*
*Completed: 2026-03-23*
