---
phase: 40-first-run-welcome-onboarding-coordinator
plan: 06
subsystem: onboarding / attention-coordinator
tags: [pwa, install-nudge, beforeinstallprompt, arbitration, gap-closure, tdd]
requires:
  - assets/attention-coordinator.js (run(), beforeinstallprompt capture, installEligible)
provides:
  - Late-firing beforeinstallprompt now re-arms coordinator arbitration (install nudge reachable this session)
affects:
  - assets/attention-coordinator.js
tech-stack:
  added: []
  patterns:
    - "Event-driven re-arm: a late capture re-invokes the existing arbitration entry point rather than duplicating gating logic"
    - "Guard-by-construction: run()'s internal isDemo/one-per-session/PRECEDENCE checks make an external session guard redundant"
key-files:
  created:
    - tests/40-install-nudge-rearm.test.js
  modified:
    - assets/attention-coordinator.js
decisions:
  - "Call run() directly in the beforeinstallprompt handler (no external session-marker check) — run() already enforces D-02 and D-01, so re-checking would duplicate and risk drift"
  - "installEligible() logic left unchanged; only its stale Pitfall-1 comment refreshed"
metrics:
  duration: ~15m
  completed: 2026-07-08
  tasks: 2
  files: 2
status: complete
---

# Phase 40 Plan 06: Install-Nudge Re-Arm Summary

Closed the MAJOR UAT gap where the install nudge never appeared on any Chromium session: the beforeinstallprompt handler now re-runs `run()` after stashing `deferredPrompt`, so a late-firing prompt surfaces the nudge the same session while preserving one-per-session (D-02) and precedence (D-01) by construction.

## What Was Built

- **tests/40-install-nudge-rearm.test.js** — a zero-dependency jsdom behavior guard mirroring the `40-install-nudge` harness. Three cases through the real coordinator: (i) a prompt firing AFTER `run()` surfaces the nudge this session, (ii) a claimed slot suppresses the late prompt (D-02), (iii) an eligible welcome still wins (PRECEDENCE). Authored RED — cases (i) and (iii) failed before the fix; (ii) already held.
- **assets/attention-coordinator.js** — inside the existing `beforeinstallprompt` capture listener, after `deferredPrompt = e`, a guarded `try { run(); } catch {}` re-triggers arbitration. No external guard added: `run()` already early-returns on `isDemo()` (D-09) and the one-per-session marker (D-02), and iterates PRECEDENCE (D-01). Refreshed the now-accurate `installEligible()` comment (logic unchanged: still `!!deferredPrompt || isMacSafari()`).

## Root Cause Closed

`run()` executes once at DOMContentLoaded, BEFORE Chrome's late-firing `beforeinstallprompt`, so `deferredPrompt` was null at arbitration and `installEligible()` was always false. The old handler only stashed the prompt and never re-armed the coordinator, so the nudge could never win the slot on any session (confirmed Pitfall-1 race, 40-UAT.md test 3).

## Verification

- `node tests/40-install-nudge-rearm.test.js` — 3/3 (re-arm, D-02, precedence).
- `node tests/40-install-nudge.test.js` — 13/13 (eligibility + arbitration unregressed).
- `node tests/40-coordinator.test.js` — 5/5.
- `node tests/run-all.js` — 144 passed, 0 failed (full suite green).

**Human UAT still required:** Chrome fires `beforeinstallprompt` only when PWA install criteria + engagement heuristics are met, so the true browser-mediated flow (install nudge appears on a fresh eligible Chromium profile, [Install app] fires the native prompt once) stays a manual check — jsdom proves the re-arm wiring, not Chrome's heuristics. This caveat is recorded in the handler comment.

## TDD Gate Compliance

- RED: `test(40-06)` commit c493bfb (2 of 3 cases failing before implementation, as expected).
- GREEN: `fix(40-06)` commit 9d57cf1 (all cases pass, full suite green).
- REFACTOR: none needed.

## Threat Surface

Both registered threats (T-40-06-01 tampering, T-40-06-02 DoS from a throw in the re-arm) are mitigated as planned: the re-arm adds no new DOM/markup and no user-controlled data path (`run()` only reads the trusted registry + storage flags; all surface copy stays `textContent`/`data-i18n`), and the `run()` call is wrapped in its own `try/catch` so a failure can never break `beforeinstallprompt` capture or `appinstalled` cleanup. No new threat surface introduced.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: tests/40-install-nudge-rearm.test.js
- FOUND: assets/attention-coordinator.js (modified)
- FOUND commit: c493bfb (test RED)
- FOUND commit: 9d57cf1 (fix GREEN)
