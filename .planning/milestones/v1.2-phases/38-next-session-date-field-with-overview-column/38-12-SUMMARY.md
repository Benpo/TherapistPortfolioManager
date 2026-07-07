---
phase: 38-next-session-date-field-with-overview-column
plan: 12
subsystem: ui
tags: [toast, error-tone, focus, a11y, i18n, dark-mode, validation, date-input]

# Dependency graph
requires:
  - phase: 38-09
    provides: The incomplete-date save guard (validity.badInput) whose generic corner toast this plan makes visible
  - phase: 38-10
    provides: Wave-1 gap closure (RTL date-input) — this is the last open Phase 38 UAT gap
  - phase: 38-11
    provides: Wave-1 gap closure (bidi isolation) — cleared before this wave-2 plan
provides:
  - Backward-compatible showToast(message, key, options) with an opt-in { tone, focus } third param — a GENERALIZED error-toast API reusable by any error call site
  - Dark-safe .toast--error variant (via --color-warning-* tokens) visually distinct from the success toast and longer-lived (4000ms vs 1800ms)
  - Auto-focus/scroll: an error toast bound to a field scrolls it into view and focuses it
  - rangeUnderflow save guard closing the manual-typed too-early-date bypass (D-08 enforced at save)
  - toast.nextSessionDateTooEarly i18n key in four languages
affects: [toast, add-session, validation, i18n, dark-mode, rtl]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "showToast tone+focus API: positional (message, key) signature preserved; opt-in third options object ({ tone, focus }) so all ~30 existing 2-arg callers and existing toast tests are byte-for-byte unaffected"
    - "Error-tone toast uses --color-warning-* tokens (which have dark-mode overrides), NEVER --color-danger-* (light-only, reserved for the confirm dialog)"
    - "Field-bound error toasts pass the offending control as options.focus so the toast self-locates (scrollIntoView + focus, both guarded to a function target so a missing/invalid element is a no-op)"
    - "Save-guard validity checks (badInput + rangeUnderflow) both defensively guard validity being undefined in jsdom stubs"

key-files:
  created:
    - tests/38-12-toast-tone-focus.test.js
  modified:
    - assets/app.js
    - assets/app.css
    - assets/add-session.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
    - tests/38-next-session-partial-guard.test.js

key-decisions:
  - "showToast gains a THIRD positional options param ({ tone, focus }) — never a signature change to (message, key), so backward compatibility is total"
  - "Error tone = --color-warning-* tokens (dark-safe) + a distinctly longer 4000ms dwell; success stays exactly 1800ms/single-style/no-focus"
  - "Ben-approved scope addition (2026-07-07): the same #nextSessionDate save guard now also blocks validity.rangeUnderflow (a typed date earlier than the session date), closing the manual-entry bypass of the calendar-only min (D-08: min = session's own date, same-day allowed)"
  - "Only add-session.js error toasts migrated (incomplete-date guard + session/client form validation); success/info toasts and error toasts in other files (settings.js etc.) untouched — Ben's explicit scope"

requirements-completed: [NEXT-01, NEXT-08]

# Coverage metadata
coverage:
  - id: D1
    description: "showToast error tone (toast--error class), longer-than-1800ms dwell, and field focus/scroll all fire on the opt-in path; the default success path is unchanged (no error class, 1800ms, no focus side effect); 2-arg backward-compat path still sets textContent"
    requirement: "NEXT-08"
    verification:
      - kind: unit
        ref: "tests/38-12-toast-tone-focus.test.js (3 scenarios: error tone+focus, default success unchanged, 2-arg compat; EXPECTED_COUNT vacuous-green guard)"
        status: pass
      - kind: unit
        ref: "tests/run-all.js (131/131 files green; existing toast tests that drive the 2-arg path unaffected)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A typed next-session date earlier than the session date (validity.rangeUnderflow) aborts the save with the error-toned, field-focusing toast.nextSessionDateTooEarly; badInput behavior unchanged"
    requirement: "NEXT-01"
    verification:
      - kind: unit
        ref: "tests/38-next-session-partial-guard.test.js (RED-first rangeUnderflow scenario; asserts abort + tone 'error' + focus target + new i18n key; 7/7 green)"
        status: pass
    human_judgment: false
  - id: D3
    description: "On device (real Safari): the block warning is clearly distinct from the success toast, stays visibly longer, and scrolls to/focuses #nextSessionDate; a too-early typed date is blocked then a valid date saves; other form errors behave the same; success toasts unchanged; error toast legible in dark mode and reads naturally in Hebrew RTL"
    verification:
      - kind: manual_procedural
        ref: "Real Safari on-device (felt visibility + scroll behavior + dark/RTL legibility cannot be verified headlessly)"
        status: pass
    human_judgment: true
    rationale: "Felt visibility, scroll-to-field behavior, and dark/RTL legibility need a human eye; automated tests prove the class/duration/focus/abort behavior but not the perceived distinctness"

# Metrics
duration: ~1h (automated tasks) + on-device verification round
completed: 2026-07-07
status: complete
---

# Phase 38 Plan 12: Error-Tone Toast + Auto-Focus (UAT test 8) Summary

**Gives showToast a backward-compatible error tone (visually distinct, longer-lived) plus auto-focus/scroll to the offending field, migrates the session/client form error toasts onto it, and — per a Ben-approved scope addition — blocks a manually typed too-early next-session date at save; closing the last open Phase 38 UAT gap, approved on-device.**

## Performance

- **Duration:** ~1h across the automated tasks plus an on-device verification round
- **Completed:** 2026-07-07
- **Tasks:** 5 (4 auto, 1 human-verify)
- **Files modified:** 9 (1 created, 8 modified)

## Accomplishments
- Closed UAT test 8 / NEXT-01/NEXT-08: the incomplete-date block warning is now unmistakable — a distinct warning-toned toast that lingers longer than the 1.8s success toast and scrolls to/focuses the offending field, instead of an identical corner pill nobody noticed.
- Designed the fix as a GENERALIZED API, not a one-off: showToast gains a backward-compatible third options param ({ tone, focus }); the (message, key) positional signature is unchanged so every existing 2-arg caller and toast test is unaffected.
- `.toast--error` uses the dark-safe `--color-warning-*` tokens (which have dark-mode overrides) — never the light-only `--color-danger-*` — so the warning is legible in dark mode.
- Migrated the add-session.js error toasts (incomplete-date guard + session/client form validation) to the error tone; field-bound ones pass their control as the focus target while DB/network errorGeneric toasts get the tone only.
- Ben-approved scope addition (2026-07-07): the same #nextSessionDate save guard now also blocks `validity.rangeUnderflow` (a typed date earlier than the session date), closing the manual-entry bypass of the calendar-only `min` — a too-early date is never silently saved (D-08 enforced at save). New `toast.nextSessionDateTooEarly` key in all four languages.
- Automated state green throughout: 38-12-toast-tone-focus 3/3, 38-next-session-partial-guard 7/7, full suite 131/131.
- Ben approved on-device in real Safari 2026-07-07: partial-date block, too-early-date block, other form errors, success-unchanged, dark mode, and Hebrew RTL all confirmed.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED behavior test)** - `ca426c5` (test) — tone class, >1800ms duration, focus/scroll spies, default-path no-regression, 2-arg backward compat
2. **Task 2 (showToast tone+focus API + dark-safe .toast--error)** - `e1a3014` (feat) — backward-compatible third options param; `toast--error` class + 4000ms error dwell (success stays 1800ms); guarded scrollIntoView+focus; `.toast--error` via dark-safe `--color-warning-*` tokens
3. **Task 3 (migrate add-session error toasts)** - `e7b0f9a` (feat) — field-bound error toasts pass a focus target; DB/network errorGeneric tone-only; success/info toasts untouched
4. **Task 4 (rangeUnderflow guard, RED-first + i18n ×4)** - `c06e2ae` (feat) — #nextSessionDate guard extended to block `validity.rangeUnderflow` with the new `toast.nextSessionDateTooEarly` key; RED-first scenario in tests/38-next-session-partial-guard.test.js (now 7/7)

_The Task 4 scope addition was authorized in a separate plan-amendment commit `22cc5ec` (docs) before implementation. Task 5 was a human-verify checkpoint (no source commit) — approved on-device 2026-07-07. A paused-at-checkpoint session-state note was committed as `10140a8` (docs) while awaiting Ben's on-device sign-off._

## Files Created/Modified
- `tests/38-12-toast-tone-focus.test.js` (created) - Falsifiable jsdom/vm behavior test: error tone class + >1800ms duration + focus/scroll side effects; default success path unchanged (no error class, 1800ms, no focus); 2-arg backward-compat path.
- `assets/app.js` - showToast gains a backward-compatible third options param ({ tone, focus }); tone "error" adds the `toast--error` class and uses a 4000ms dwell; focus target is scrolled into view and focused (both guarded); success default remains 1800ms/single-style/no-focus; JSDoc updated.
- `assets/app.css` - New `.toast--error` variant using `--color-warning-bg`/`--color-warning-text` (dark-safe), visually distinct from the base success toast; base `.toast` rules untouched.
- `assets/add-session.js` - Error toasts (incomplete-date guard + session/client form validation) adopt tone "error"; field-bound ones pass their control as options.focus; DB/network errorGeneric toasts get tone only; success/info toasts untouched. The #nextSessionDate guard additionally blocks `validity.rangeUnderflow`.
- `assets/i18n-en.js` / `i18n-he.js` / `i18n-de.js` / `i18n-cs.js` - New `toast.nextSessionDateTooEarly` key (four languages, 38-03 pattern) conveying "the next-session date can't be before the session date — fix or clear it".
- `tests/38-next-session-partial-guard.test.js` (modified) - Extended with a RED-first rangeUnderflow scenario mirroring the existing badInput scenarios (abort save, surface the new key, carry tone "error" + focus); EXPECTED_COUNT guard updated; now 7/7.

## Decisions Made
- showToast keeps its (message, key) positional signature and adds a THIRD options param — total backward compatibility for the ~30 existing 2-arg callers and existing toast tests.
- Error tone uses the dark-safe `--color-warning-*` tokens (not the light-only `--color-danger-*`) plus a distinctly longer 4000ms dwell; the success path stays exactly 1800ms.
- Scope addition (Ben-approved 2026-07-07): the #nextSessionDate save guard now blocks `validity.rangeUnderflow` too, closing the typed-too-early-date bypass of the calendar-only `min`; `min` stays relative to the session date (D-08: same-day allowed, historical sessions unaffected).
- Migration scope limited to add-session.js error toasts; success/info toasts and error toasts in other files untouched.

## Deviations from Plan

### Ben-approved Scope Addition

**1. [Rule 4 - Architectural, pre-approved] rangeUnderflow save guard (typed too-early date)**
- **Found during:** Wave-1 UAT re-verification (before this plan executed); Ben approved the addition 2026-07-07 and the plan was amended in `22cc5ec` before implementation.
- **Issue:** Manually TYPING a next-session date earlier than the session's own date bypassed the dynamic `min` attribute (the calendar picker respects `min`, but a typed too-early value only sets `validity.rangeUnderflow`, which the 38-09 badInput-only guard never checked) — so it saved silently.
- **Fix:** Task 4 extended the same #nextSessionDate save guard to block `validity.rangeUnderflow` with its own i18n message (`toast.nextSessionDateTooEarly`, four languages), using the new error-tone + focus API. RED-first test scenario added.
- **Files modified:** assets/add-session.js, assets/i18n-en.js, assets/i18n-he.js, assets/i18n-de.js, assets/i18n-cs.js, tests/38-next-session-partial-guard.test.js
- **Verification:** guard test RED→GREEN (7/7); full suite 131/131; Ben approved on-device.
- **Committed in:** `c06e2ae` (plan amendment `22cc5ec`)

---

**Total deviations:** 1 Ben-approved scope addition (pre-authorized, plan amended before implementation)
**Impact on plan:** Broadened the save guard from badInput-only to badInput+rangeUnderflow within the same file set and the same guard choke point; no unplanned scope creep beyond the amendment.

## Issues Encountered
None beyond the pre-approved scope addition documented above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None.

## Human Field-Verification Required
Complete — Ben approved on-device in real Safari 2026-07-07: partial next-session date block shows a distinct, longer warning toast that scrolls to/focuses #nextSessionDate; a typed too-early date is blocked then a valid date saves; other form errors behave the same; success toasts unchanged; error toast legible in dark mode and reads naturally in Hebrew RTL.

## Next Phase Readiness
- UAT test 8 closed on-device — the LAST open Phase 38 UAT gap. All 12 Phase 38 plans (7 core + 5 gap-closure) are now complete. Next: Phase 38 verification, then phase.complete.

## Self-Check: PASSED
- FOUND: tests/38-12-toast-tone-focus.test.js
- FOUND: tests/38-next-session-partial-guard.test.js
- FOUND commits: ca426c5, e1a3014, e7b0f9a, c06e2ae

---
*Phase: 38-next-session-date-field-with-overview-column*
*Completed: 2026-07-07*
