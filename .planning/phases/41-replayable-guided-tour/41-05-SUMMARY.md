---
phase: 41-replayable-guided-tour
plan: 05
subsystem: guided-tour
tags: [tour, onboarding, help, attention-coordinator, demo-gate, rtl]
requires:
  - "window.Tour = { start, resume } — the Plan 03/04 engine (assets/tour.js)"
  - "initHelpEntry ADDABLE items array + demo seam window.name==='demo-mode' (app.js)"
  - "AttentionCoordinator.register/run/PRECEDENCE + welcome overlay (attention-coordinator.js)"
  - "sg.tourRemindLater / sg.tourCompleted / sg.tourNeverRemind flags (Plan 04 exit choice)"
  - "help.entry.takeTour / help.tour.reminder.* i18n keys (Plan 01, EN canonical)"
provides:
  - "'Take the tour' popover row (demo-gated) → window.Tour.start() (TOUR-01)"
  - "Tour.resume() cross-page resume hook in initCommon, after setLanguage (TOUR-03/A7)"
  - "welcome primary CTA launches the tour in place with dismiss() bookkeeping (D-12)"
  - "coordinator-governed 'tour-reminder' surface at the lowest PRECEDENCE slot (D-08)"
affects:
  - "Plan 06 loads tour.js + tour.css on the eight chrome pages and precaches them (the launch surfaces are now live once tour.js is present)"
  - "Phase 42 whats-new surface — tour-reminder is appended LAST so whats-new is never starved"
tech-stack:
  added: []
  patterns:
    - "demo gate via items.filter() BEFORE the mount loop (no dead row rendered)"
    - "typeof-guarded window.Tour calls (defense-in-depth; Plan 06 guarantees presence, A1)"
    - "coordinator offer-only surface — Tour.start() reachable ONLY from the Start button, run() unmodified (TOUR-01/T-41-06)"
    - "resume hook ordered AFTER setLanguage so a resuming RTL user paints correct direction (A7/TOUR-04)"
key-files:
  created:
    - "tests/41-demo-gate.test.js"
  modified:
    - "assets/app.js"
    - "assets/attention-coordinator.js"
decisions:
  - "Welcome primary CTA kept as an <a> (focusable/tabbable for the existing focus trap) with a preventDefault-guarded ./help.html href fallback; the click never navigates — it runs dismiss() then Tour.start() in place (D-12)"
  - "tour-reminder Dismiss removes the card only (writes no flag), so the remind-later offer returns next session until the tour is completed or never-remind is chosen"
  - "tour-reminder appended LAST in PRECEDENCE (lowest slot) so a future Phase-42 whats-new surface is never starved (Open Question 2)"
  - "Tour.resume() placed IMMEDIATELY AFTER setLanguage(savedLang) in initCommon (not at chrome-mount) so a resuming Hebrew user renders RTL on first paint — no one-tick LTR flash (architect-gate A7 / TOUR-04)"
metrics:
  duration_min: 12
  tasks: 2
  files: 3
  completed: 2026-07-08
status: complete
---

# Phase 41 Plan 05: Tour Launch Surfaces (popover row, welcome CTA, resume hook, reminder) Summary

Wired the inert tour engine into its three explicit launch surfaces plus the re-entry reminder: the demo-gated "Take the tour" row in the "?" popover, the welcome-overlay primary CTA rewire (dismiss bookkeeping + `Tour.start()` in place, no `./help.html` nav), the cross-page `Tour.resume()` hook in `initCommon` (ordered after `setLanguage` for RTL-correct first paint), and a coordinator-governed lowest-precedence `tour-reminder` surface that OFFERS to finish — never auto-runs. TOUR-01 stays intact: every launch path requires an explicit user click.

## What Was Built

- **Task 1 — app.js "Take the tour" row + resume hook + RED demo-gate test**
  - `tests/41-demo-gate.test.js` (authored RED first): jsdom-mounts the real `App.initHelpEntry` via the test seam; asserts a `.help-entry-item[data-label-key="help.entry.takeTour"]` mounts on a normal page (with its `t()` label, positioned AFTER the Replay welcome row per D-17), and is ABSENT when `window.name==='demo-mode'` (filtered out, not a dead row) while the day-one center/contact rows still mount. RED at authoring (assertion 1 failed with the row absent).
  - `initHelpEntry` (app.js): appended `{ labelKey: 'help.entry.takeTour', action }` after the `help.entry.replayWelcome` row; the action calls `window.Tour.start()` (typeof-guarded). A demo filter (`window.name==='demo-mode'`) removes the tour row from the `items` array BEFORE the mount loop (D-16). The new row re-translates for free via the existing `initHelpEntry._listenerInstalled` `app:language` listener.
  - `initCommon` (app.js): added `if (typeof window.Tour !== 'undefined' && window.Tour.resume) window.Tour.resume();` IMMEDIATELY AFTER `setLanguage(savedLang);` (~line 892) so a cross-page navigation resumes on load AND a resuming RTL-preference user paints RTL on the first tick (architect-gate A7, TOUR-03/TOUR-04).

- **Task 2 — welcome CTA rewire + coordinator tour-reminder (attention-coordinator.js)**
  - **D-12 welcome CTA:** the primary CTA click now `preventDefault()`s the retained `./help.html` href, runs the existing `dismiss()` bookkeeping (records `sg.welcomeSeen` + `sg.whatsNewLastSeenVersion` on the non-replay path — Pitfall 8), then calls `window.Tour.start()` (typeof-guarded). Kept as an `<a>` so the existing aria-modal focus trap (Tab cycle + `primary.focus()`) is unchanged. The replay path and secondary CTA are untouched.
  - **D-08 reminder:** `'tour-reminder'` appended to `PRECEDENCE` at the lowest slot; `register({ id:'tour-reminder', eligible, show })` added. `eligible()` reads `sg.tourRemindLater==='1' && sg.tourCompleted!=='1' && sg.tourNeverRemind!=='1'`. `show()` mounts a "Ready to finish the tour?" card via `makeEl` (textContent only) with Start → `window.Tour.start()` and Dismiss → remove-card. The reminder OFFERS only: `run()` is unmodified, and `Tour.start()` appears nowhere except the Start handler (TOUR-01 / T-41-06).
  - **A9 comment upkeep:** the two "five governed ids" comments (PUBLIC SURFACE banner + the PRECEDENCE declaration) now read "six governed" to match the appended id.

## Deviations from Plan

None — plan executed exactly as written. The welcome primary CTA was kept as an `<a>` (rather than converting to a `<button>`) to preserve the existing focus-trap tabbability, which the plan explicitly permits ("if kept as an `<a>`, preventDefault on click").

## Verification

- `node tests/41-demo-gate.test.js` exits 0 (row present normally, absent in demo).
- `node tests/run-all.js` — full suite 151 passed, 0 failed (existing coordinator/welcome-overlay tests unbroken).
- Acceptance greps all pass: `help.entry.takeTour` ≥1 with `window.Tour.start()`; `Tour.resume` in initCommon; `awk` line-order proves `Tour.resume` AFTER `setLanguage(savedLang)`; `'tour-reminder'` is the last PRECEDENCE element; `eligible()` reads all three `sg.tour*` flags; `Tour.start()` never appears in `run()`; `six governed` count = 2.

## Notes for Downstream

- The launch surfaces are wired but **inert until Plan 06 loads `tour.js`/`tour.css` on the chrome pages and precaches them** — the typeof-guards mean nothing throws before then; the rows/CTA simply no-op if `window.Tour` is absent.
- `tour-reminder` sits below `mobile-hint` at the lowest PRECEDENCE slot; the Phase-42 whats-new surface (higher slot) will never be starved by it.

## Self-Check: PASSED
