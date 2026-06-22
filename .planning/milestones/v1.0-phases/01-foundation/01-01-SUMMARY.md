---
phase: 01-foundation
plan: 01
subsystem: ui
tags: [css, tokens, design-system, fonts, woff2, dark-mode]

# Dependency graph
requires: []
provides:
  - Two-tier CSS token architecture (primitives + semantics) in assets/tokens.css
  - Self-hosted Rubik font (400/600/700) via WOFF2 files in assets/fonts/
  - Zero external font/CDN requests — fully offline-capable
  - Dark mode infrastructure via [data-theme="dark"] CSS selector
  - All 5 HTML pages load tokens.css before app.css
affects: [02-visual-theme, 03-features, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: [Rubik WOFF2 self-hosted fonts, CSS custom properties two-tier token system]
  patterns: [CSS token variable naming (--color-primitive-*, --color-semantic-*), tokens.css loaded before app.css in HTML head]

key-files:
  created:
    - assets/tokens.css
    - assets/fonts/Rubik-Regular.woff2
    - assets/fonts/Rubik-SemiBold.woff2
    - assets/fonts/Rubik-Bold.woff2
  modified:
    - assets/app.css
    - index.html
    - add-client.html
    - add-session.html
    - sessions.html
    - reporting.html

key-decisions:
  - "Did not self-host Nunito — Phase 1 replaces entire font stack with Rubik immediately, making Nunito download wasteful"
  - "Severity button --sev-color fallbacks use token-backed primitives (--color-sev-default-border/text) rather than bare hex"
  - "heartwall badge #e83d6d added as --color-heartwall-badge token (was not in original hardcoded list but must be tokenized)"
  - "Nav link box-shadow (0 10px 20px) added as --shadow-nav token distinct from --shadow-soft (0 18px 40px)"

patterns-established:
  - "Two-tier tokens: primitives (:root --color-purple-600 etc.) referenced only by semantics (:root --color-primary etc.)"
  - "Dark mode via [data-theme=dark] attribute override — no media query, user-controlled"
  - "font-display: swap on all @font-face declarations"
  - "tokens.css always linked before app.css in HTML head"

requirements-completed: [FOUND-01, FOUND-02]

# Metrics
duration: 7min
completed: 2026-03-09
---

# Phase 1 Plan 1: CSS Token System and Self-Hosted Fonts Summary

**Two-tier CSS token architecture with self-hosted Rubik WOFF2 font, eliminating Google Fonts CDN and all hardcoded colors from app.css**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-09T16:56:17Z
- **Completed:** 2026-03-09T17:03:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Created assets/tokens.css with @font-face (3 weights), primitive tokens, semantic tokens, and dark mode override block (143 lines)
- Downloaded Rubik WOFF2 files (Regular 400, SemiBold 600, Bold 700) from Google Web Fonts Helper and saved to assets/fonts/
- Removed Google Fonts CDN @import and all hardcoded colors/rgba() from app.css, replacing with var(--token) references
- Updated all 5 HTML pages to load tokens.css before app.css

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tokens.css with two-tier token system and self-host Rubik font** - `05f7111` (feat)
2. **Task 2: Tokenize app.css and update all 5 HTML files** - `4fd67f0` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `assets/tokens.css` - Two-tier CSS token system: @font-face declarations, primitive color tokens, semantic tokens, dark mode overrides
- `assets/fonts/Rubik-Regular.woff2` - Self-hosted Rubik weight 400
- `assets/fonts/Rubik-SemiBold.woff2` - Self-hosted Rubik weight 600
- `assets/fonts/Rubik-Bold.woff2` - Self-hosted Rubik weight 700
- `assets/app.css` - CDN @import removed, :root variables removed, all hardcoded hex/rgba replaced with var() references, font-family updated to Rubik
- `index.html` - Added tokens.css link before app.css
- `add-client.html` - Added tokens.css link before app.css
- `add-session.html` - Added tokens.css link before app.css
- `sessions.html` - Added tokens.css link before app.css
- `reporting.html` - Added tokens.css link before app.css

## Decisions Made

- Nunito was not self-hosted — Phase 1 replaces the full font stack with Rubik immediately, making a Nunito download throwaway work
- Severity buttons use `var(--sev-color, var(--color-sev-default-*))` — JS sets `--sev-color` dynamically per button; bare hex fallbacks (#ccc, #666) were replaced with new primitive tokens
- `#e83d6d` (heartwall badge pink) was not in the plan's hardcoded colors list but was tokenized as `--color-heartwall-badge` (Rule 2 — missing from plan but required for zero-hardcoded-colors compliance)
- Nav link box-shadow `0 10px 20px rgba(36,24,72,0.08)` tokenized as `--shadow-nav` (different size from existing `--shadow-soft`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Tokenized heartwall badge color (#e83d6d)**
- **Found during:** Task 2 (tokenize app.css)
- **Issue:** #e83d6d was used for heartwall/heart badges but was not listed in the plan's hardcoded colors inventory
- **Fix:** Added `--color-heartwall: #e83d6d` to primitive tokens and `--color-heartwall-badge: var(--color-heartwall)` to semantic tokens in tokens.css; replaced both uses in app.css
- **Files modified:** assets/tokens.css, assets/app.css
- **Verification:** No hex colors remaining in app.css (zero grep hits for color-bearing hex patterns)
- **Committed in:** 4fd67f0 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Tokenized severity button fallback colors**
- **Found during:** Task 2 (tokenize app.css)
- **Issue:** `.severity-button` uses `var(--sev-color, #ccc)` and `var(--sev-color, #666)` where JS sets `--sev-color` per button; bare hex fallbacks would remain as hardcoded values
- **Fix:** Added `--color-sev-default-border: #ccc` and `--color-sev-default-text: #666` to primitive tokens; updated fallbacks to `var(--color-sev-default-border)` and `var(--color-sev-default-text)`
- **Files modified:** assets/tokens.css, assets/app.css
- **Verification:** Zero rgba() and zero color hex in app.css
- **Committed in:** 4fd67f0 (Task 2 commit)

**3. [Rule 2 - Missing Critical] Added --shadow-nav token for nav link box-shadow**
- **Found during:** Task 2 (tokenize app.css)
- **Issue:** Nav link used `0 10px 20px rgba(36,24,72,0.08)` which wasn't in the plan's shadow token set (--shadow-soft uses different size)
- **Fix:** Added `--shadow-nav: 0 10px 20px rgba(36, 24, 72, 0.08)` to semantic tokens; used in app.css
- **Files modified:** assets/tokens.css, assets/app.css
- **Verification:** Zero rgba() in app.css
- **Committed in:** 4fd67f0 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 2 — missing from plan's token inventory)
**Impact on plan:** All auto-fixes required to achieve the zero-hardcoded-colors success criterion. No scope creep.

## Issues Encountered

- Google Web Fonts Helper API returns a ZIP archive, not a raw WOFF2 file — required extracting the WOFF2 from the downloaded zip before placing in assets/fonts/

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Token architecture fully established — Phase 2 can reference all `--color-*` and `--shadow-*` variables directly
- Dark mode infrastructure in place via `[data-theme="dark"]` selector — Phase 2 replaces placeholder dark values with garden palette
- Self-hosted fonts eliminate CDN dependency — app works fully offline
- No blockers for Phase 2

---
*Phase: 01-foundation*
*Completed: 2026-03-09*
