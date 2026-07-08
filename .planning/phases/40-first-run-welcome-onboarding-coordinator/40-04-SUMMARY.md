---
phase: 40-first-run-welcome-onboarding-coordinator
plan: 04
subsystem: onboarding
tags: [onboarding, attention-coordinator, security-note, help-popover, replay-welcome, vanilla-js, jsdom, tdd]

# Dependency graph
requires:
  - phase: 40-first-run-welcome-onboarding-coordinator (Plan 02)
    provides: "window.AttentionCoordinator = { register, run, showWelcome, PRECEDENCE } — the precedence registry this plan wires into app.js"
  - phase: 39-help-center-entry-point (Plan 03)
    provides: "App.initHelpEntry '?' popover with an ADDABLE items array + app:language re-translate listener; eval-into-jsdom behavior-test harness idiom"
provides:
  - "initCommon arbitrates governed attention surfaces via a typeof-guarded AttentionCoordinator.run() (bootAttentionSurfaces seam) instead of the former direct showFirstLaunchSecurityNote() call (ONBD-03)"
  - "The security note registered as the coordinator surface id 'security-note' — securityNoteEligible() boolean gate (D-08 container-absent → false, license + 7-day cadence) with the unchanged renderer as show() (D-05)"
  - "The '?' help popover mounts a 'Replay welcome' action-button row (D-17 position) that calls AttentionCoordinator.showWelcome(true) — a direct open that never re-arms sg.welcomeSeen or the session marker (ONBD-02)"
  - "initHelpEntry items schema extended to support { action } button rows alongside { href } link rows (Phase 41 'Take the tour' reuses this)"
  - "tests/40-app-wiring.test.js (6 behavior checks)"
affects:
  - "41 (appends its own 'Take the tour' action row to the same items array; rewires the welcome primary CTA)"
  - "42 (What's-New registers the 'whats-new' precedence id above 'security-note')"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Governed-surface wiring: a page-init seam registers a domain surface { id, eligible, show } with the coordinator then calls run() once, typeof-guarded so pages without the coordinator never throw"
    - "Addable popover items support both { href } link rows and { action } button rows through one forEach, so onboarding entry points are added by data, not by rewriting the loop"
    - "Behavior test injects a FAKE window.AttentionCoordinator to observe register/run/showWelcome without loading the real module; the D-08 eligible() gate is exercised through the smallest real seam (App.bootAttentionSurfaces)"

key-files:
  created:
    - "tests/40-app-wiring.test.js"
  modified:
    - "assets/app.js"
    - "tests/39-help-entry.test.js"

key-decisions:
  - "bootAttentionSurfaces() is a single typeof-guarded seam that registers the security-note surface THEN calls run() — one guard covers both, register always precedes run so the note participates in arbitration (Pitfall 7)"
  - "The security note is referenced as show: showFirstLaunchSecurityNote (no parens) so the renderer stays unchanged (D-05) and the direct initCommon call is genuinely gone — the renderer is now invoked only via the surface"
  - "The Replay-welcome row is a <button role=menuitem>, not an <a href> — a direct showWelcome(true) open that closes the popover then bypasses run() and writes none of sg.welcomeSeen / last-seen-version / session marker (ONBD-02 / Pitfall 5)"
  - "Deviation: decoupled tests/39-help-entry.test.js item assertion from exact-count-2 + positional index to data-label-key identity — the D-17 Replay row necessarily makes 3 .help-entry-item rows, so the plan's 'keep 39 green + run-all green' is only satisfiable by pinning the day-one rows by identity (Rule 3)"

patterns-established:
  - "Page-init coordinator wiring: register domain surface then run() behind one typeof guard, exposed as a test seam that a fake coordinator observes"

requirements-completed: [ONBD-02, ONBD-03]

coverage:
  - id: ONBD-03/run-swap
    description: "initCommon calls bootAttentionSurfaces() (typeof-guarded AttentionCoordinator.run()) instead of the direct showFirstLaunchSecurityNote() call; register precedes run"
    requirement: "ONBD-03"
    verification:
      - kind: unit
        ref: "tests/40-app-wiring.test.js (bootAttentionSurfaces registers security-note AND calls run)"
        status: pass
    human_judgment: false
  - id: D-05/D-08
    description: "'security-note' surface: eligible() false when #security-guidance-container absent (D-08) and false without license / within 7-day cadence; show() is the unchanged renderer (D-05)"
    requirement: "ONBD-03"
    verification:
      - kind: unit
        ref: "tests/40-app-wiring.test.js (container-absent eligible=false; container+license+no-dismissal eligible=true; not-activated / recent-dismissal false)"
        status: pass
    human_judgment: false
  - id: ONBD-02/replay
    description: "'Replay welcome' action row (button/menuitem, D-17 position, data-label-key) calls showWelcome(true) without re-arming sg.welcomeSeen or the session marker; re-translates on app:language"
    requirement: "ONBD-02"
    verification:
      - kind: unit
        ref: "tests/40-app-wiring.test.js (row element/position/label; click → showWelcome(true) + no re-arm; app:language re-translate)"
        status: pass
    human_judgment: false
  - id: D-04
    description: "Backup reminder banner + footer integrity nudge stay independent — NOT routed through the coordinator"
    requirement: "ONBD-03"
    verification:
      - kind: static
        ref: "grep — checkBackupReminder still called directly (line 870), not wrapped in a register() call"
        status: pass
    human_judgment: false

# Metrics
duration: 15min
completed: 2026-07-08
status: complete
---

# Phase 40 Plan 04: Wire Coordinator into app.js Summary

**initCommon now arbitrates governed attention surfaces via a typeof-guarded `AttentionCoordinator.run()` (the `bootAttentionSurfaces` seam) instead of firing the security note directly; the security note is a governed `security-note` surface with the D-08 container gate and unchanged renderer (D-05); and the "?" popover mounts a non-re-arming "Replay welcome" action button (ONBD-02). All 6 wiring checks + full suite 141/141 green.**

## Performance
- **Duration:** ~15 min
- **Completed:** 2026-07-08
- **Tasks:** 3
- **Files:** 3 (1 created, 2 modified)

## Accomplishments
- **run() swap (ONBD-03):** `initCommon` line ~892 `showFirstLaunchSecurityNote();` → `bootAttentionSurfaces();`. The new seam registers the `security-note` surface then calls `AttentionCoordinator.run()`, both behind one `typeof AttentionCoordinator !== 'undefined'` guard (Pitfall 7 — demo.html and coordinator-less pages never throw). The direct renderer call is gone; the renderer is now invoked only via the surface `show()`.
- **Governed security note (D-05 / D-08):** `securityNoteEligible()` reproduces the existing gates as a boolean — returns `false` when `#security-guidance-container` is absent (D-08, so an unrenderable winner never consumes the one-per-session slot on a non-Overview page), `false` without `portfolioLicenseActivated==='1'`, `false` when `securityGuidanceDismissed` is within 7 days (legacy `'1'` counts as expired → eligible). `show: showFirstLaunchSecurityNote` keeps the renderer byte-for-byte unchanged (same copy, cadence, container, dismissal write).
- **Replay welcome (ONBD-02):** `initHelpEntry`'s items array gained a middle `{ labelKey:'help.entry.replayWelcome', action }` entry (D-17: after Help center, before Contact us). The forEach now branches — `{ href }` builds the unchanged `<a>` link row; `{ action }` builds a `<button class="help-entry-item" role="menuitem">` whose click closes the popover then calls `AttentionCoordinator.showWelcome(true)` (typeof-guarded). It writes none of `sg.welcomeSeen` / last-seen-version / session marker (Pitfall 5), carries `data-label-key`, and the existing `app:language` listener re-translates it (it iterates all `.help-entry-item`).
- **Independence preserved (D-04):** `checkBackupReminder()` still called directly (line 870); no `register()` wraps the backup banner or footer nudge.
- Full suite **141/141** green (140 baseline + 1 new file).

## Task Commits
1. **Task 1: RED wiring test** — `f895faf` (test)
2. **Task 2: initCommon → run() + security-note surface** — `8e96225` (feat)
3. **Task 3: Replay-welcome action row (+ 39-test decouple)** — `a4d9354` (feat)

## Files Created/Modified
- `assets/app.js` — `securityNoteEligible()` + `bootAttentionSurfaces()` added; initCommon call-site swapped; `initHelpEntry` items schema extended with `{ action }` button rows + the Replay-welcome entry; `bootAttentionSurfaces` exported as a test seam.
- `tests/40-app-wiring.test.js` — 6 checks (Replay row element/position/label; click → showWelcome(true) + no re-arm; app:language re-translate; register+run; D-08 container-absent gate; D-05 license/cadence gates).
- `tests/39-help-entry.test.js` — item assertion decoupled from exact-count/index to `data-label-key` identity (deviation, see below).

## Decisions Made
- **One guarded seam (`bootAttentionSurfaces`) for register+run.** A single `typeof` guard covers both; register always precedes run so the security note participates in arbitration. Exposed on `App` as the jsdom test seam (matches the Phase 39 `initHelpEntry` seam convention).
- **`show: showFirstLaunchSecurityNote` by reference (no parens).** Keeps the renderer unchanged (D-05) and demonstrably removes the direct initCommon call.
- **Replay row is a `<button>`, not an `<a href>`.** It is an action, not navigation — a direct `showWelcome(true)` that bypasses `run()` and never re-arms first-run state (ONBD-02).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Decoupled tests/39-help-entry.test.js from exact item count/index**
- **Found during:** Task 3
- **Issue:** The plan's Task 3 acceptance requires BOTH `node tests/39-help-entry.test.js` staying green AND `node tests/run-all.js` green, but D-17 mandates the Replay row be a `.help-entry-item` positioned between the two day-one rows — necessarily making 3 rows. The 39 test's assertion 3 asserted `items.length === 2` and indexed `items[1]` for Contact us, so it broke (contact shifted to index 2; `3 !== 2`). The two requirements are only jointly satisfiable by updating the coupled assertion.
- **Fix:** Rewrote assertion 3 to select the Help-center and Contact-us rows by `data-label-key` identity (not exact count / positional index) and assert their textContent + hrefs. This preserves the test's intent (both day-one rows mount correctly) while tolerating additive action rows (Phase 40 Replay, Phase 41 tour). Docblock note updated to match.
- **Files modified:** `tests/39-help-entry.test.js`
- **Commit:** `a4d9354`
- **Note:** This file was outside the plan's `files_modified` (app.js + the new test only), but the plan's own acceptance criteria could not otherwise be met. The change is a test-robustness fix, not a weakening — the day-one rows are still pinned by label + href.

## Threat Surface
No new trust boundaries beyond the plan's `<threat_model>`. T-40-04-REF mitigated (`typeof AttentionCoordinator !== 'undefined'` guard on both register and run). T-40-04-ARM mitigated (replay writes none of `sg.welcomeSeen` / last-seen-version / session marker — test-gated). T-40-04-XSS mitigated (new row label via `textContent` / `data-label-key`, no interpolated innerHTML). Zero packages installed (T-40-SC N/A).

## Known Stubs
None. The security note is fully governed; the Replay row is fully wired to the (already-shipped, Plan 02) `showWelcome`.

## Accepted Exclusion (carried from plan)
- **report.html is NOT wired.** `assets/report.js` boots its own `init()` on DOMContentLoaded and never calls `initCommon`, so the coordinator does not run there even though Plan 05 adds the `<script>` tag. By design (print-oriented leaf page); a session starting there defers governed surfaces to the next navigation. No `initCommon`/`run()` call was added to report.js.

## Next Plan Readiness
- Plan 05 loads + precaches `assets/attention-coordinator.js` (adds the `<script>` tag before app.js on every initCommon page). Until then, `typeof AttentionCoordinator === 'undefined'` on live pages and the guarded seam is a no-op — expected.
- Real-browser verification of the Replay row + governed security note is a phase-UAT item (jsdom does not assert layout / real navigation).

---
*Phase: 40-first-run-welcome-onboarding-coordinator*
*Completed: 2026-07-08*

## Self-Check: PASSED
- FOUND: tests/40-app-wiring.test.js
- FOUND: commits f895faf (test), 8e96225 (feat), a4d9354 (feat)
- Tests: 40-app-wiring 6/6, 39-help-entry 6/6, full suite 141/141 green
