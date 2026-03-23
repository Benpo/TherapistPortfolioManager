---
phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update
plan: 02
subsystem: ui
tags: [landing-page, ux, vanilla-js, css, accessibility, i18n]

# Dependency graph
requires: []
provides:
  - Demo window with draggable resize handles on both edges
  - Prominent license CTA button in landing page header
  - Globe icon language selector replacing native select dropdown
  - Click-outside popover close with aria-expanded state management
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - IIFE-based feature modules for resize and popover logic
    - CSS logical properties (inset-inline-start/end) for RTL-safe positioning
    - pointer events disabled on iframe during drag to prevent event capture
    - color-mix() for semi-transparent branded backgrounds

key-files:
  created: []
  modified:
    - landing.html
    - assets/landing.css
    - assets/landing.js

key-decisions:
  - "Globe button replaces native select — more polished, works with CSS animations, RTL-safe via inset-inline-end"
  - "Resize handles use pointer events (not mouse) for touch-device compatibility"
  - "Demo window body wraps iframe in flex container so resize handles sit at absolute positions"

patterns-established:
  - "Pattern: wrap resize IIFE in assets/landing.js after the lang popover IIFE — self-contained modules"
  - "Pattern: lang popover init lives inside initLangSelector() as nested IIFE — keeps feature cohesive"

requirements-completed: [D-04, D-08, D-09]

# Metrics
duration: 15min
completed: 2026-03-23
---

# Phase 14 Plan 02: Landing Page UX — Resize Handles, CTA Button, Globe Popover Summary

**Resizable demo window with pointer-drag handles, prominent license CTA button with background color, and globe icon language selector with animated popover replacing native select**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-23T00:00:00Z
- **Completed:** 2026-03-23T00:15:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Demo window now resizable by dragging handles on either side — pointer events handled correctly including iframe event capture prevention
- License CTA button in header upgraded from plain link to visually prominent button with color-mix background, larger font, and hover states
- Native `<select>` language dropdown replaced with a globe SVG button that opens an animated popover with 4 language options
- Popover closes on click-outside, highlights current language with aria-selected, syncs language change to demo iframe via postMessage

## Task Commits

Each task was committed atomically:

1. **Task 1: Demo window resize handles and header license CTA** - `571ec9a` (feat)
2. **Task 2: Replace language select with globe icon popover** - `7c2d9c0` (feat)

## Files Created/Modified
- `landing.html` - Added demo-window-body wrapper with resize handle divs; replaced select with globe button + popover HTML
- `assets/landing.css` - Added demo-resize-handle styles, demo-window-body flex container, lang-selector/globe-btn/popover/option styles; replaced landing-enter-link with prominent button; hides resize handles on mobile
- `assets/landing.js` - Replaced initLangSelector's select handler with popover IIFE; added resize drag IIFE with pointer event handlers

## Decisions Made
- Globe button uses `inset-inline-end: 0` on the popover for RTL-safe alignment (popover opens toward center in RTL)
- Resize multiplier is 2x because the demo window is centered — dragging one edge should affect both visual sides equally
- RTL multiplier is inverted to maintain correct direction semantics

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Landing page UX polish complete for plan 02
- Plans 01 and 03 of phase 14 cover i18n bugs and legal/footer cleanup
- Phase 15 (architecture and UI audit) can proceed after phase 14 completes

---
*Phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update*
*Completed: 2026-03-23*
