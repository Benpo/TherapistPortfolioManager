---
phase: 38-next-session-date-field-with-overview-column
plan: 10
subsystem: ui
tags: [rtl, bidi, i18n, date-input, css, webkit, safari]

# Dependency graph
requires:
  - phase: 38-09
    provides: Phase 38 UAT retest that surfaced the pre-existing RTL date-input reversal (test 6)
provides:
  - Shared CSS fix forcing native-locale segment order on ALL native date inputs in Hebrew (RTL) mode
  - html[dir="rtl"] box-direction rule that right-aligns the LTR date value under the Hebrew label
  - tests/38-10-rtl-date-input.test.js source gate asserting the final 3-rule CSS set
affects: [rtl, date-input, add-session, sessions-filter, client-birthdate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WebKit-only visual bidi fix verified by source-presence gate + Playwright WebKit measurement + real-Safari human checkpoint (jsdom/Chromium cannot render ::-webkit-datetime-edit)"
    - "RTL value alignment via box direction (direction on the input) rather than text-align, which WebKit ignores on the shrink-wrapped datetime-edit"

key-files:
  created:
    - tests/38-10-rtl-date-input.test.js
  modified:
    - assets/app.css

key-decisions:
  - "Fix targets the shared input[type=\"date\"] attribute selector (covers all 7 native date inputs) — never per-id rules"
  - "Final mechanism uses direction on the input box (not text-align) because WebKit shrink-wraps ::-webkit-datetime-edit and ignores text-align on it"
  - "::-webkit-datetime-edit direction override adopted (plan originally forbade it) after round-1 on-device evidence proved text-align ineffective"

patterns-established:
  - "RTL native-input alignment: pin the LTR value block to the right edge via html[dir=rtl] input[type=date]{direction:rtl} + restore native segment order via ::-webkit-datetime-edit{direction:ltr}"

requirements-completed: [NEXT-01, NEXT-02, NEXT-08]

# Coverage metadata
coverage:
  - id: D1
    description: "Both/all CSS rules forcing native segment order + RTL value alignment on native date inputs are present in assets/app.css (source gate)"
    requirement: "NEXT-08"
    verification:
      - kind: unit
        ref: "tests/38-10-rtl-date-input.test.js (final 3-rule set; comment-stripped source match)"
        status: pass
      - kind: unit
        ref: "tests/run-all.js (130/130 files, no regression)"
        status: pass
    human_judgment: false
  - id: D2
    description: "In real Safari Hebrew mode, native date inputs render segments in browser-native order (no yyyy/dd/mm reversal), the value right-aligns under the Hebrew label, and English mode is unchanged"
    requirement: "NEXT-01"
    verification:
      - kind: manual_procedural
        ref: "Real Safari (installed PWA) — WebKit-only rendering; Playwright WebKit validated order + LTR-unchanged + no Chromium regression"
        status: pass
    human_judgment: true
    rationale: "WebKit ::-webkit-datetime-edit sub-field layout and on-device alignment/icon-side cannot be finalized headlessly; only real Safari confirms segment order + label-side alignment (per reference-rtl-select-value-alignment-headless)"

# Metrics
duration: ~2h (two on-device rounds)
completed: 2026-07-07
status: complete
---

# Phase 38 Plan 10: RTL Native Date-Input Segment Reversal Fix Summary

**Forces browser-native date-segment order on all native `<input type="date">` fields in Hebrew (RTL) mode and right-aligns the LTR value under the Hebrew label — closing UAT test 6, a pre-existing major RTL bidi defect, approved on-device in real Safari.**

## Performance

- **Duration:** ~2h across two on-device verification rounds
- **Completed:** 2026-07-07
- **Tasks:** 2 (1 auto, 1 human-verify)
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Closed UAT test 6 / NEXT-01/NEXT-02: Hebrew date inputs no longer reverse Safari's native mm/dd/yyyy into yyyy/dd/mm — every one of the 7 native date inputs is fixed via a single shared attribute selector, not per-id rules.
- Landed the final direction-based mechanism after a first on-device round proved a text-align approach ineffective on WebKit's shrink-wrapped `::-webkit-datetime-edit`.
- Playwright WebKit validated the corrected state headlessly (RTL right-aligned + native segment order; LTR unchanged; no Chromium regression); the source gate locks the final 3-rule set; full suite 130/130.
- Ben confirmed on-device in real Safari Hebrew: native order + right alignment correct, English unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED source gate)** - `9eb2c0d` (test)
2. **Task 1 (round 1 CSS: direction:ltr + text-align:right)** - `5a4964d` (fix)
3. **Task 1 (round 2 — final mechanism: box direction, not text-align)** - `2d66376` (fix)

_Task 2 was a human-verify checkpoint (no source commit) — approved on-device 2026-07-07._

## Files Created/Modified
- `tests/38-10-rtl-date-input.test.js` - Source-presence gate over comment-stripped app.css; updated in round 2 to assert the final 3-rule set.
- `assets/app.css` - Native date-input RTL rules: base `input[type="date"]{direction:ltr}` for native segment order; `html[dir="rtl"] input[type="date"]{direction:rtl}` to position the value block at the right edge under the Hebrew label; `html[dir="rtl"] input[type="date"]::-webkit-datetime-edit{direction:ltr}` to keep the native segment order inside that right-aligned block.

## Decisions Made
- Target the shared `input[type="date"]` attribute selector so all 7 native date inputs are fixed at once (never enumerate ids).
- Use box direction (direction on the input) to right-align the value in RTL rather than `text-align`, which WebKit ignores on the shrink-wrapped `::-webkit-datetime-edit`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adopted ::-webkit-datetime-edit direction override the plan explicitly forbade**
- **Found during:** Task 2 (round-1 real-Safari checkpoint)
- **Issue:** The plan's mechanism (`input[type="date"]{direction:ltr}` + `html[dir="rtl"] ... {text-align:right}`) fixed segment ORDER but Ben's on-device check found the value aligned to the LEFT edge, not under the right-aligned Hebrew label. Headless measurement then proved `text-align:right` is ineffective on WebKit's shrink-wrapped `::-webkit-datetime-edit` — so the plan's stated alignment approach could not satisfy the alignment truth.
- **Fix:** Replaced the text-align approach with a box-direction approach: `html[dir="rtl"] input[type="date"]{direction:rtl}` positions the value block at the right edge, and `html[dir="rtl"] input[type="date"]::-webkit-datetime-edit{direction:ltr}` restores native segment order inside it. The plan's forbid-`::-webkit-datetime-edit` constraint was invalidated by the round-1 on-device evidence and the override was adopted with rationale.
- **Files modified:** assets/app.css, tests/38-10-rtl-date-input.test.js (gate updated to the final 3-rule set)
- **Verification:** Playwright WebKit — RTL right-aligned + native order, LTR unchanged, no Chromium regression; full suite 130/130; Ben approved on-device.
- **Committed in:** `2d66376`

---

**Total deviations:** 1 auto-fixed (1 bug — plan mechanism invalidated by on-device evidence)
**Impact on plan:** The alignment truth in the plan's must_haves could not be met by the plan's stated CSS approach; the direction-based mechanism achieves both truths. No scope creep — same files, same shared-selector discipline.

## Issues Encountered
- Round-1 mechanism aligned the value to the wrong edge in real Safari; resolved by switching from text-align to box direction after headless WebKit measurement confirmed text-align is a no-op on the shrink-wrapped datetime-edit.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None.

## Human Field-Verification Required
Complete — Ben approved on-device in real Safari (Hebrew) 2026-07-07: "38.10 looks good now" (native order + right alignment confirmed; English unchanged).

## Next Phase Readiness
- UAT test 6 closed on-device. Wave-1 gap closure continues with 38-12 (test 8 — warning-toast visibility / error tone + auto-focus).

## Self-Check: PASSED
- FOUND: tests/38-10-rtl-date-input.test.js
- FOUND: assets/app.css
- FOUND commits: 9eb2c0d, 5a4964d, 2d66376

---
*Phase: 38-next-session-date-field-with-overview-column*
*Completed: 2026-07-07*
