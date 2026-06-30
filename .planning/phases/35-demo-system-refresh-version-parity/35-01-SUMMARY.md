---
phase: 35-demo-system-refresh-version-parity
plan: 01
subsystem: testing
tags: [jsdom, red-gate, demo, chrome-convergence, fake-test-detector, source-gate]

# Dependency graph
requires:
  - phase: 31-overview-render-hardening
    provides: "eval-into-jsdom + App-stub test pattern (31-overview-render-hardening.test.js) and the shared _helpers (app-stub, mock-portfolio-db)"
provides:
  - "tests/35-demo-chrome.test.js — RED behavioral gate: boots demo.html in jsdom, runs the REAL App.initCommon, asserts converged chrome (header controls, single globe lang picker, .app-footer v{APP_VERSION}, demo banner) with an .app-footer completion sentinel"
  - "tests/35-demo-static.test.js — RED source/grep gate for DEMO-01/02/08/09 (headerActions + shared-chrome markers, no native languageSelect, no 'therapeutic' literal, zero demo-hints across shipped surface + file absence)"
  - "fake-test-detector ALLOWLIST entry for the deliberate 35-demo-static source gate"
affects: [35-03, 35-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RED-first Wave-0 scaffold: tests assert desired post-implementation end state and fail TODAY on a concrete assertion (the still-shipping native select), flipping GREEN when the impl plans land — no test edits"
    - "Async completion sentinel (.app-footer) guards a real-initCommon jsdom gate against vacuous-green (Pitfall 4 / reference-pdf-jsdom-inert-gates)"
    - "Deliberate static/source audit gate registered in fake-test-detector ALLOWLIST (same class as 25-08/25-11/25-12)"

key-files:
  created:
    - tests/35-demo-chrome.test.js
    - tests/35-demo-static.test.js
  modified:
    - tests/30-fake-test-detector.test.js

key-decisions:
  - "Combined the 'exactly one language picker' check into a single test case (native select#languageSelect absent AND exactly one .lang-globe-btn) so today's RED fails precisely on the dead native picker"
  - "i18n app.subtitle regression guards assert NOT /therapeut/i (not brittle exact strings) so they stay GREEN now and guard against a terminology regression during 35-03"
  - "DEMO-09 scan scoped to assets/ (recursive) + sw.js + root *.html, excluding tests/ so the gate's own 'demo-hints' literals cannot self-match"
  - "Allowlisted 35-demo-static in the fake-test-detector rather than forcing artificial execution — its runtime sibling 35-demo-chrome covers behavior"

patterns-established:
  - "Wave-0 RED gates pair a behavioral (jsdom, executing) gate with a static (source/grep) gate; only the static one is allowlisted in fake-test-detector"

requirements-completed: []

# Coverage metadata
coverage:
  - id: D1
    description: "RED behavioral chrome gate: real App.initCommon on demo.html asserts converged header controls, single globe language picker, .app-footer carrying v{APP_VERSION}, demo banner; .app-footer completion sentinel guards the async path"
    requirement: "DEMO-01"
    verification:
      - kind: unit
        ref: "tests/35-demo-chrome.test.js (DEMO-01/02/03/04 cases; RED at Wave 0 — fails on native select#languageSelect, sentinel + 3 other cases PASS proving live wiring)"
        status: fail
    human_judgment: false
  - id: D2
    description: "RED source gate for DEMO-01/02/08/09: demo.html convergence markers (headerActions + shared-chrome), native languageSelect removal, 'therapeutic' literal removal + i18n subtitle regression guards, repo-wide demo-hints absence + file deletion"
    requirement: "DEMO-09"
    verification:
      - kind: unit
        ref: "tests/35-demo-static.test.js (11 cases; RED at Wave 0 — 5 green-now regression guards PASS, 6 implementation-pending gates FAIL for the documented reasons)"
        status: fail
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-06-30
status: complete
---

# Phase 35 Plan 01: Demo Wave-0 RED Scaffolds Summary

**Two falsifiable RED gates for demo-home chrome convergence and demo-hints dead-code removal — a jsdom gate that runs the REAL App.initCommon on demo.html and a source/grep gate over the shipped surface, both failing TODAY on concrete assertions and primed to flip GREEN when 35-03 and 35-05 land.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-30T12:39:03Z
- **Completed:** 2026-06-30T12:43:42Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `tests/35-demo-chrome.test.js`: boots demo.html under jsdom (`runScripts:'outside-only'`), evals the production scripts in load order, enters demo mode (`window.name='demo-mode'`), injects a store-backed PortfolioDB mock, and `await`s the REAL `App.initCommon()`. Asserts the `.app-footer` completion sentinel (proves initCommon ran to the end), injected header controls, exactly one language picker (native `select#languageSelect` absent + one `.lang-globe-btn`), `.app-footer-copy` carrying `v` + `AppVersion.APP_VERSION` (1.2.3), and a non-empty `.demo-banner-text`. RED today: 4 cases PASS, the native-select case FAILS — proving it is wired to live DOM, not a stub.
- `tests/35-demo-static.test.js`: pure `fs` source/grep gate. DEMO-01 (demo.html must declare `id="headerActions"` + load `shared-chrome.js`), DEMO-02 (no `id="languageSelect"`), DEMO-08 (no `therapeutic` literal + `data-i18n="app.subtitle"` retained + 4 i18n subtitle regression guards), DEMO-09 (zero `demo-hints` across assets/ + sw.js + root *.html + `assets/demo-hints.js` absent). RED today: 5 green-now regression guards PASS, 6 implementation-pending gates FAIL.
- Full suite confirms discovery and clean state: `node tests/run-all.js` → 113 passed, only the 2 intended new RED files fail.

## Task Commits

Each task was committed atomically:

1. **Task 1: Chrome render gate (DEMO-01/03/04)** - `b3a5e16` (test)
2. **Task 2: Source/grep gate (DEMO-01/02/08/09)** - `504b581` (test)
3. **Deviation fix: allowlist 35-demo-static in fake-test-detector** - `1f7b0e6` (test)

## Files Created/Modified
- `tests/35-demo-chrome.test.js` - NEW. RED behavioral chrome gate via real `App.initCommon` on demo.html.
- `tests/35-demo-static.test.js` - NEW. RED source/grep gate for the demo convergence + demo-hints removal markers.
- `tests/30-fake-test-detector.test.js` - MODIFIED. Added `35-demo-static` to the ALLOWLIST (deliberate static audit guard) + doc-comment list.

## Decisions Made
- Single-case "exactly one language picker" (native select absent AND one `.lang-globe-btn`) so the RED failure pins precisely to the dead native picker.
- i18n subtitle regression guards assert `!/therapeut/i` rather than brittle exact strings — GREEN now, guards against a 35-03 terminology regression.
- DEMO-09 scan scoped to the shipped surface (assets/ recursive + sw.js + root *.html), excluding tests/ so the gate cannot self-match its own `demo-hints` literals.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Allowlisted 35-demo-static in the fake-test-detector**
- **Found during:** Task 2 (Source/grep gate) verification via `node tests/run-all.js`
- **Issue:** The new `35-demo-static.test.js` reads `assets/*.js` as text without an execution sink, so `30-fake-test-detector.test.js` flagged it as a source-slicer fake test — a third (unintended) suite failure directly caused by this plan's new file.
- **Fix:** Added `35-demo-static` to the detector's `ALLOWLIST` with a justification (a deliberate static removal/audit guard, same class as the already-allowlisted 25-08/25-11/25-12; runtime behavior is covered by the executing 35-demo-chrome jsdom gate) and updated the doc-comment allowlist list. This is the detector's documented mechanism for legitimate static guards.
- **Files modified:** tests/30-fake-test-detector.test.js
- **Verification:** `node tests/30-fake-test-detector.test.js` exits 0; full suite now fails only the 2 intended RED files.
- **Committed in:** `1f7b0e6`

**Note:** During authoring, the static gate's own count guard correctly caught an off-by-one in `EXPECTED_COUNT` (10 vs the actual 11 cases) before commit — fixed in place, demonstrating the no-silent-skip guard works.

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** The allowlist entry is the detector's intended path for deliberate static audit gates; no scope creep. Both deliverables match the plan's task definitions exactly.

## Issues Encountered
None beyond the deviation above. `App.initCommon()` ran to completion under jsdom with no shimming needed beyond `matchMedia` (serviceWorker/BroadcastChannel are absent and already guarded), so the footer completion sentinel renders and the chrome gate fails for the right reason.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DEMO-01/03/04 (35-03 chrome convergence) and DEMO-02/08/09 (35-03 + 35-05) now have falsifiable RED acceptance locked. When 35-03 removes the native select, adds `id="headerActions"` + the shared-chrome script tag, and corrects the brand-subtitle terminology, both files advance toward GREEN; 35-05's demo-hints removal completes DEMO-09.
- No blockers. The two new files are the only intended Wave-0 reds; the rest of the suite (113 files) is green.

---
*Phase: 35-demo-system-refresh-version-parity*
*Completed: 2026-06-30*
