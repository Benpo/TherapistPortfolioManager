---
phase: 11-visual-identity-update
plan: 01
subsystem: ui
tags: [css, illustrations, botanical, dark-mode, decorations]

# Dependency graph
requires:
  - phase: 05-landing-page
    provides: botanical dark-mode pattern (invert+screen blend) established in landing.css
provides:
  - Botanical decoration elements on home page (3 placements: flower pot, garden divider, watering can)
  - app-botanical CSS class system with light/dark mode and responsive styles
affects: [12-qa]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Botanical decorations use aria-hidden + empty alt for purely decorative images"
    - "Dark mode invert(1) + mix-blend-mode: screen + reduced opacity — matches landing.css pattern exactly"
    - "CSS mask-image fade-edge for garden divider horizontal fade"

key-files:
  created: []
  modified:
    - index.html
    - assets/app.css

key-decisions:
  - "Watering can placed inside .container div (before closing tags) so it respects page max-width and padding"
  - "Opacity kept low (0.35–0.55 light, 0.2–0.3 dark) per Sapir's minimalist preference"
  - "Responsive: elements shrink on mobile (not hidden) for visible but proportional presence"

patterns-established:
  - "app-botanical wrapper + app-botanical-img child pattern for each decoration placement"

requirements-completed: [DSGN-05]

# Metrics
duration: 2min
completed: 2026-03-19
---

# Phase 11 Plan 01: Botanical Decorations for Home Page Summary

**Three botanical PNG decorations added to app home page via app-botanical CSS class system with invert-based dark mode matching the landing page pattern**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-19T14:05:58Z
- **Completed:** 2026-03-19T14:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Flower pot (deco3.png) placed after greeting card, right-aligned at 120px
- Garden image (גינה.png) as a full-width fade-edge divider between stats and clients table
- Watering can (משפך.png) as a subtle footer closing element at 100px centered
- Dark mode treatment: invert(1) + screen blend + reduced opacity (0.2–0.3) — matches landing.css exactly
- Responsive: all three elements shrink proportionally at 600px breakpoint

## Task Commits

Each task was committed atomically:

1. **Task 1: Add botanical decoration elements to index.html** - `ec99be1` (feat)
2. **Task 2: Style botanical decorations with dark mode support** - `c57daed` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `index.html` - Added 3 botanical wrapper divs with IMG elements at greeting, divider, and footer positions
- `assets/app.css` - Added 82 lines: .app-botanical base classes, per-zone sizing/opacity, dark mode treatment, responsive breakpoint

## Decisions Made
- Watering can placed inside the `.container` div rather than outside it, so it respects max-width and aligns with page content
- Opacity values kept deliberately low (0.35–0.55) matching Sapir's stated preference to "not overload, keep it simple and pleasant"
- Dark mode uses `filter: invert(1)` with `mix-blend-mode: screen` — exact same pattern as landing.css botanical divider

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Home page now has cohesive botanical character matching the landing page aesthetic
- Ready for Phase 11 Plan 02 (logo update) or QA pass in Phase 12

---
*Phase: 11-visual-identity-update*
*Completed: 2026-03-19*
