---
phase: 42-in-app-changelog-what-s-new
plan: 06
subsystem: attention-coordinator
tags: [coordinator, onboarding-tour, surface-suppression, tdd]
requires: [42-01]
provides:
  - "coordinator-level tour-active suppression guard in run()"
affects:
  - assets/attention-coordinator.js
tech-stack:
  added: []
  patterns:
    - "typeof-guarded window.Tour.isActive() early-return (mirrors defense-in-depth idiom at attention-coordinator.js:242)"
    - "non-claiming early return — returns before the session-marker claim so the one-per-session slot is never burned"
key-files:
  created: []
  modified:
    - assets/attention-coordinator.js
decisions:
  - "Guard is ONE check at the coordinator run() entry point, not per-surface — every current and future PRECEDENCE surface (welcome, security-note, install-nudge, mobile-hint, tour-reminder, whats-new) inherits tour-suppression automatically"
  - "Guard placed AFTER isDemo() (D-09) and BEFORE the session-marker check (D-02) and the PRECEDENCE loop — non-claiming, so a suppressed run() does not consume the one-per-session slot"
metrics:
  duration: ~6min
  completed: 2026-07-09
status: complete
---

# Phase 42 Plan 06: Coordinator-Level Tour Guard Summary

Added one typeof-guarded `window.Tour.isActive()` early-return to `assets/attention-coordinator.js`'s `run()` so the onboarding tour suppresses every governed attention surface (What's-New popup + welcome, security-note, install-nudge, mobile-hint, tour-reminder) from a single coordinator check, without burning the one-per-session marker.

## What Was Built

A third non-claiming early-return guard in `run()`, sitting alongside the existing `isDemo()` (D-09) and `ssGet(SESSION_MARKER)` (D-02) guards:

```js
if (window.Tour && typeof window.Tour.isActive === 'function' && window.Tour.isActive()) return;
```

Placed BEFORE the session-marker check and the PRECEDENCE loop, so a tour-suppressed run never sets `sg.surfaceShownThisSession` — once the tour ends, a later `run()` can still show an eligible surface. The `run()` header doc-comment was updated to name the tour-active guard alongside demo-off (D-09) and one-per-session (D-02).

This is the coordinator half of the Ben-locked split recorded in STATE.md completed-task 260709-o77: o77 fixed the backup **schedule prompt** narrowly in `checkBackupSchedule()` (the backup surface is not coordinator-governed per Phase 40 D-04); this plan is the coordinator-level guard explicitly assigned to Phase 42. The two are disjoint (o77 = backup modal; this = the six governed coordinator surfaces) and this catches re-invoked `run()` calls (e.g. install-nudge re-arming `run()` when `beforeinstallprompt` fires mid-tour).

## TDD Flow

- **RED (pre-existing, plan 01):** `tests/42-coordinator-tour-guard.test.js` — 2 of 4 failing (tour-active shows a surface; suppressed run burns the marker).
- **GREEN (this plan):** single guard added → 4/4 pass. No separate RED commit here; the RED test was authored and committed in plan 01, so this plan is one `feat` GREEN commit.

## Verification

| Check | Result |
|-------|--------|
| `node -c assets/attention-coordinator.js` | OK |
| `node tests/42-coordinator-tour-guard.test.js` | 4 passed, 0 failed (was 2/2 RED) |
| `node tests/40-coordinator.test.js` | 5 passed, 0 failed (no regression) |
| `grep -n 'Tour' assets/attention-coordinator.js` | guard is the ONLY new tour check in run(); no per-surface tour flags |

Threat register: T-42-07 (UX-integrity DoS — surface over active tour) mitigated by the non-claiming guard; T-42-08 (Tour stub/absence) accepted — typeof-guard degrades to prior behavior with no crash (control test "no window.Tour" passes).

## Deviations from Plan

None — plan executed exactly as written.

## Commits

- `39e2055` feat(42-06): add coordinator-level tour-active guard to run()

## Self-Check: PASSED

- FOUND: assets/attention-coordinator.js (modified, guard present at run())
- FOUND: commit 39e2055
