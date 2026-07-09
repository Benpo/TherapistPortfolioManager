---
phase: 42-in-app-changelog-what-s-new
plan: 01
subsystem: attention-surfaces / testing
tags: [tdd, red-tests, whats-new, changelog, attention-coordinator, a11y, jsdom]
status: complete
requires:
  - assets/attention-coordinator.js (existing coordinator + _getSurface seam)
  - jsdom devDependency (already installed)
provides:
  - tests/42-whats-new-gating.test.js (T-42-V1/V2/V3 — RED)
  - tests/42-whats-new-dismiss.test.js (T-42-V4/V5 — RED)
  - tests/42-coordinator-tour-guard.test.js (T-42-V12 — RED)
affects:
  - Plan 05 (assets/whats-new.js) turns the two popup tests GREEN
  - Plan 06 (coordinator tour guard) turns the tour-guard test GREEN
tech-stack:
  added: []
  patterns:
    - jsdom eval harness mirroring tests/40-coordinator.test.js & tests/40-welcome-overlay.test.js
    - behavior-tests-before-implementation (project hard rule feedback-behavior-verification.md)
key-files:
  created:
    - tests/42-whats-new-gating.test.js
    - tests/42-whats-new-dismiss.test.js
    - tests/42-coordinator-tour-guard.test.js
  modified: []
decisions:
  - "RED for the popup tests is a load failure (ENOENT on assets/whats-new.js); RED for the tour-guard test is a real assertion failure (guard absent, control cases pass) — the stronger, more meaningful RED"
  - "Popup body contract fixed at .whats-new-overlay (backdrop) > [role=dialog][aria-modal] (panel), with .whats-new-close and .whats-new-seeall controls — Plan 05 must match these hooks"
  - "Headline version assertion is data-driven (/1\\.3(\\.0)?/), not i18n-key-dependent, so the 10 new i18n keys landing in Plan 05 do not couple the test"
metrics:
  duration: ~12min
  tasks: 3
  files: 3
  completed: 2026-07-09
---

# Phase 42 Plan 01: What's-New RED Behavior Tests Summary

Authored three Wave-0 RED jsdom behavior tests that pin the What's-New popup contract (CHLG-01) and a coordinator-level tour-active suppression guard BEFORE any implementation — gating/first-launch/reconcile, content+a11y+deliberate-dismiss, and run()-suppression-during-tour with the marker-not-burned invariant.

## What Was Built

- **tests/42-whats-new-gating.test.js (T-42-V1/V2/V3)** — mirrors the `tests/40-coordinator.test.js` jsdom harness; evals `attention-coordinator.js` then the absent `assets/whats-new.js`, seeds `window.AppVersion` + a `window.CHANGELOG_CONTENT_EN` fixture, reaches the surface via `AttentionCoordinator._getSurface('whats-new')`. Pins once-per-version gating on the literal `sg.whatsNewLastSeenVersion` key, first-ever-launch welcome-wins suppression, and the D-07 silent-skip reconcile (advances lastSeen → APP_VERSION when no entry exists).
- **tests/42-whats-new-dismiss.test.js (T-42-V4/V5)** — mirrors `tests/40-welcome-overlay.test.js`; fixture entry carries 3 highlights. Pins `role="dialog"` / `aria-modal="true"` / `aria-labelledby` → headline, a version-bearing headline, verbatim highlight `textContent`, focus-into-dialog, plus the D-09 deliberate-dismiss contract: a backdrop click is a NO-OP (popup stays, lastSeen unchanged) while Close / Escape / "See everything new" each remove the overlay AND write `sg.whatsNewLastSeenVersion = APP_VERSION`.
- **tests/42-coordinator-tour-guard.test.js (T-42-V12)** — mirrors `tests/40-coordinator.test.js`; stubs the real `window.Tour.isActive()` signal (tour.js:657). Pins coordinator-level `run()` suppression while a tour is active (protecting all six PRECEDENCE surfaces, not a per-popup check) and the marker-not-burned invariant, with tour-inactive and absent-`window.Tour` control cases.

## Verification / RED Evidence

| Test | Exit | RED reason |
|------|------|-----------|
| 42-whats-new-gating | 1 (0/3) | ENOENT — `assets/whats-new.js` absent (Plan 05) |
| 42-whats-new-dismiss | 1 (0/5) | ENOENT — `assets/whats-new.js` absent (Plan 05) |
| 42-coordinator-tour-guard | 1 (2 pass / 2 fail) | assertion `1 !== 0`, `'1' !== null` — coordinator tour guard absent (Plan 06); control cases pass |

All three pass `node -c` (valid JS; RED is behavioral/load, not a parse error). All are auto-discovered by `tests/run-all.js` (top-level `tests/*.test.js`).

## Deviations from Plan

None — plan executed exactly as written.

## Notes for Downstream Plans

- **Plan 05** must register the `'whats-new'` surface with `{ id, eligible, show }`, mount `.whats-new-overlay` > `[role="dialog"][aria-modal="true"]` with `.whats-new-close` and `.whats-new-seeall` controls, render highlights via `textContent`, run the D-07 reconcile at eval time, and write `sg.whatsNewLastSeenVersion` on every deliberate-dismiss path.
- **Plan 06** must add the tour guard at the coordinator `run()` entry point (before the PRECEDENCE loop and before the session-marker write), reading `window.Tour.isActive()` defensively (tolerate absent `window.Tour`).

## Self-Check: PASSED

- FOUND: tests/42-whats-new-gating.test.js
- FOUND: tests/42-whats-new-dismiss.test.js
- FOUND: tests/42-coordinator-tour-guard.test.js
- FOUND commit fb6d4e6 (Task 1), 67d4eeb (Task 2), a9f2aa2 (Task 3)
