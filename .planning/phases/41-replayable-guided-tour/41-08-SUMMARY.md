---
phase: 41-replayable-guided-tour
plan: 08
subsystem: ui
tags: [guided-tour, rtl, webkit, playwright, getBoundingClientRect, geometry, i18n]

# Dependency graph
requires:
  - phase: 41-replayable-guided-tour
    provides: "the shipped tour engine (tour.js/tour.css, Plans 03-04) and the D-14 WebKit probe (Plan 07)"
provides:
  - "Physical-coordinate spotlight/tooltip/arrow positioning (direction-neutral; no RTL mirror on off-center anchors)"
  - "First-paint snap (.sg-tour-instant) + one-rAF post-scrollIntoView re-measure (no grow-from-corner, smoother step-to-step)"
  - "Strengthened WebKit probe: off-center-anchor RTL physical-side assertion + post-settle geometry re-check"
affects: [41-10-storyline-recomposition, 41-13-final-verification, tour, rtl]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Point-position tour chrome on PHYSICAL axes (left/top) because getBoundingClientRect is physical; keep flow props (padding/border/bottom-sheet span) logical"
    - "First-paint transition-suppression class + one-rAF re-measure after scrollIntoView for anchor-tracked overlays"

key-files:
  created: []
  modified:
    - assets/tour.js
    - assets/tour.css
    - tests/webkit/41-rtl-geometry.mjs

key-decisions:
  - "Positioning is physical (top/left), not logical (inset-inline/block-start) — logical props resolved r.left against the RIGHT edge in RTL and mirrored every off-center anchor (gap-4 blocker)"
  - "Section [3] of the WebKit probe was inverted: it asserted the arrow 'flips to the mirrored side', which was asserting the BUG; it now asserts the arrow stays on the SAME physical side"
  - "Post-settle tooltip-in-viewport check uses a short settle (waitForTimeout 250ms) because a fixed 2-rAF window races the tour's internal re-measure + scroll reflow across the Playwright call boundary (Plan spec permits 'a short delay')"

patterns-established:
  - "Physical-coordinate positioning for direction-neutral overlays"
  - "First-paint snap via a transition:none class removed one rAF later"

requirements-completed: [TOUR-02, TOUR-04]

coverage:
  - id: D1
    description: "In Hebrew (RTL), the spotlight/tooltip land on the SAME physical side as an off-center anchor — no mirror to the opposite side (gap 4 blocker)"
    requirement: TOUR-04
    verification:
      - kind: automated_ui
        ref: "node tests/webkit/41-rtl-geometry.mjs#[5] RTL spotlight sits on the anchor PHYSICAL side, not mirrored [add-client]"
        status: pass
    human_judgment: false
  - id: D2
    description: "Spotlight snaps onto its anchor on first paint (no grow-from-corner) and re-measures after scrollIntoView settles (gaps 2/3)"
    requirement: TOUR-02
    verification:
      - kind: automated_ui
        ref: "node tests/webkit/41-rtl-geometry.mjs#[5] post-settle: spotlight still overlaps the anchor / tooltip fully inside the viewport"
        status: pass
    human_judgment: true
    rationale: "Automated geometry confirms on-anchor + in-viewport, but the perceived smoothness of the first-paint snap and step-to-step motion is a visual-quality judgment only a human can sign off (real Safari, on-device)."
  - id: D3
    description: "The WebKit probe FAILS against the pre-fix logical-coordinate code and PASSES after the physical-coordinate fix (falsifiability)"
    requirement: TOUR-04
    verification:
      - kind: automated_ui
        ref: "commit 3d2a22d probe RED (off-center add-client mirrored) → commit 677ce17 probe GREEN (exit 0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "jsdom behavior suite stays green (geometry-agnostic), unchanged at 152"
    verification:
      - kind: unit
        ref: "node tests/run-all.js — 152 passed, 0 failed"
        status: pass
    human_judgment: false

# Metrics
duration: 35min
completed: 2026-07-09
status: complete
---

# Phase 41 Plan 08: Tour Geometry Gap-Closure Summary

**Fixed the RTL off-center-anchor mirror blocker (gap 4) plus the first-paint spotlight offset (gap 2) and step-to-step jump (gap 3) by moving tour.js/tour.css from LOGICAL inset props to PHYSICAL top/left coordinates, and strengthened the WebKit probe so it fails against the pre-fix code and passes after.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-07-09
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- **Gap-4 blocker fixed:** `positionSpotlight` now writes physical `.style.top/.style.left` (from `getBoundingClientRect`, which is itself physical) instead of logical `insetBlockStart/insetInlineStart` — in RTL the logical props resolved `r.left` against the RIGHT edge, mirroring every off-center anchor. `tour.css` positions the tooltip on `left/top` and the arrow horizontal on `left: var(--arrow-x)` so JS and CSS agree (D-04).
- **Gaps 2/3 fixed:** a first-paint `.sg-tour-instant { transition: none }` class snaps the freshly-mounted ring/tooltip onto the anchor (no grow-from-0×0-corner), removed one rAF later so later scroll/resize reflows still glide; plus a one-rAF re-measure after `scrollIntoView` settles.
- **Probe strengthened + falsifiable:** new section [5] selects the first meaningfully off-center on-page anchor and asserts, in real WebKit layout, the Hebrew spotlight's physical left is on the anchor's side (not mirrored), with a post-settle on-anchor + in-viewport re-check. It was RED against the pre-fix code (add-client mirrored to `left=100` vs expected `1041.9`) and GREEN after.
- **Comments corrected:** the misleading "logical properties … flip for free under RTL" banners in both files now state the tour positions on physical, direction-neutral coordinates.

## Task Commits

1. **Task 1: Strengthen the WebKit probe (RED)** - `3d2a22d` (test)
2. **Task 2: positionSpotlight physical coords + first-paint snap + re-measure** - `ebca80f` (fix)
3. **Task 3: tour.css physical-axis positioning + instant class + comments** - `677ce17` (fix)

## Files Created/Modified
- `assets/tour.js` - `positionSpotlight` writes physical top/left for spotlight + tooltip; `renderSpotlight` adds `.sg-tour-instant` first-paint snap and a one-rAF post-scroll re-measure; banner + language-rerender comments corrected.
- `assets/tour.css` - spotlight transition animates only physical geometry (never `all`); tooltip transition on `left/top`; arrow horizontal on physical `left: var(--arrow-x)`; two `.sg-tour-instant { transition: none }` rules; file banner rewritten to physical positioning.
- `tests/webkit/41-rtl-geometry.mjs` - inverted section [3] to a same-physical-side (no-mirror) assertion; added section [5] off-center RTL physical-side + post-settle checks; header documents RED→GREEN falsifiability.

## Decisions Made
- **Physical over logical positioning:** `getBoundingClientRect` is physical, so writing its coordinates into logical inset props was the root cause of the RTL mirror. Physical `top/left` is direction-neutral by construction.
- **Kept flow properties logical:** padding-inline/block, border-inline-*, and the bottom-sheet's `inset-inline:0` span legitimately depend on writing direction and were left logical; only point-positioning of the tour chrome became physical.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Inverted the probe's section [3] arrow-flip assertion**
- **Found during:** Task 1 (probe strengthening)
- **Issue:** The existing section [3] asserted "RTL flips the arrow to the mirrored side" — that was asserting the *buggy* logical-coordinate behavior as correct. After the physical-coordinate fix the arrow no longer mirrors, so leaving that assertion as-is would have made the probe FAIL after the fix, making Task 3's "probe exits 0" acceptance unreachable. The plan's Task 1 keep-list pointedly excluded this assertion, so the inversion is entailed by the plan intent even though not spelled out.
- **Fix:** Replaced it with a "stays on the SAME physical side (no mirror)" assertion — RED against the current logical code (EN offset 22 vs HE offset 330), GREEN after the physical fix.
- **Files modified:** tests/webkit/41-rtl-geometry.mjs
- **Verification:** Probe RED at 3d2a22d, GREEN at 677ce17.
- **Committed in:** 3d2a22d (Task 1 commit)

**2. [Rule 1 - Bug] Post-settle re-check needed a short settle, not a fixed 2-rAF window**
- **Found during:** Task 3 (turning the probe green)
- **Issue:** The tour positions the spotlight synchronously inside `renderSpotlight` while `root` is still detached (`render()` appends it to `body` afterward), so the tooltip's first clamp reads `offsetWidth=0` and skips the viewport clamp; the one-rAF re-measure fixes it once laid out. The spotlight ring (the gap-2/4 concern) is width-independent and correct immediately, but the tooltip-in-viewport re-check measured before the re-measure landed when split across `page.evaluate` boundaries (a fixed 2-rAF window raced the internal rAF + scroll reflow), giving a transient overflow read.
- **Fix:** Added a `waitForTimeout(250)` short settle before the post-settle re-check (the Plan explicitly permits "two animation frames (or a short delay)"). This is a test-harness timing fix; the app behavior (snap then re-measure within a frame) is per the plan design and imperceptible with `.sg-tour-instant`.
- **Files modified:** tests/webkit/41-rtl-geometry.mjs
- **Verification:** Post-settle tooltip settles to `right ≤ 1280` (in-viewport); probe exits 0.
- **Committed in:** 677ce17 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug — both in the test harness, not the shipped app)
**Impact on plan:** Both were required to make the falsifiable RED→GREEN gate coherent with the physical-coordinate fix. No change to app scope; the shipped fix is exactly the plan's geometry-only change.

## Issues Encountered
- **Detached-node first paint:** diagnosed that `positionSpotlight` runs before `root` is in the document (tw=0, tooltip clamp skipped). The plan's design (sync snap + one-rAF re-measure) already covers this; only the probe's settle timing needed adjustment. The spotlight ring — the visually prominent, gap-2 element — is correct on the first synchronous paint because it does not depend on tooltip width.

## User Setup Required
None - no external service configuration required. (The WebKit probe is a manual gate, not part of `npm test`; it resolves Playwright from the pinned `TPM_Docs/video-pipeline` install per the D-14/A6 contract.)

## Next Phase Readiness
- Geometry is correct on physical axes for whatever anchors the 41-10 storyline recomposition lands on (that plan reorders steps; this fix is anchor-agnostic).
- 41-13 final verification must re-run `node tests/webkit/41-rtl-geometry.mjs` (T-41-08a mitigation) — it is now a real gate, not a vacuous pass.
- Recommended human sign-off (D2): on-device Safari (RTL/Hebrew) visual check of the first-paint snap and step-to-step smoothness once the storyline is recomposed.

---
*Phase: 41-replayable-guided-tour*
*Completed: 2026-07-09*
