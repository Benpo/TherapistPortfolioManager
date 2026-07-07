---
phase: 35-demo-system-refresh-version-parity
plan: 05
subsystem: demo-system
tags: [demo, dead-code-removal, service-worker, precache]
status: complete
requires:
  - 35-01 (DEMO-09 static gate definition)
provides:
  - DEMO-09 (dead demo-hints feature removed from shipped surface)
affects:
  - assets/app.js (initCommon iframe-injection block removed)
  - sw.js (PRECACHE_URLS entry removed)
tech-stack:
  added: []
  patterns:
    - "INTEGRITY_TOKEN-derived CACHE_NAME guarantees cache rolls on deploy — no manual cache bump needed for asset removal"
key-files:
  created: []
  modified:
    - assets/app.js
    - sw.js
  deleted:
    - assets/demo-hints.js
decisions:
  - "APP_VERSION semver bump (version.js) intentionally NOT done here — it is a phase-close decision for Ben (project-version-bump-convention); demo footer version parity is already delivered by 35-03."
metrics:
  duration: ~3min
  completed: 2026-06-30
  tasks: 2
  files: 3
---

# Phase 35 Plan 05: Remove Dead demo-hints.js Summary

Removed the orphaned 372-line guided-tour file `assets/demo-hints.js` via the three coordinated edits research proved are required (D-08 / DEMO-09): deleted the file, removed the `app.js` iframe-injection block, and removed the `sw.js` precache entry — then confirmed SW cache safety via the INTEGRITY_TOKEN-derived CACHE_NAME. The 35-01 DEMO-09 static gate is now GREEN.

## What Was Built

- **Task 1 — Delete file + remove app.js injection (commit 36cfd68):** `git rm assets/demo-hints.js` (379 lines removed) and removed the `if (window !== window.top) { ... s.src = './assets/demo-hints.js'; ... }` block (plus its "Load demo hints…" comment) from the end of `initCommon`. The block was located by content, not line number (Phase 34 had shifted app.js lines — the actual block was at L735-740, not the CONTEXT-assumed location). No `demo-hints` token remains in app.js; nothing else in initCommon changed.
- **Task 2 — Remove sw.js precache entry + cache reconciliation (commit 4546510):** Dropped `'/assets/demo-hints.js',` from `PRECACHE_URLS`. `PRECACHE_HTML`'s `/demo` entry was left untouched (D-01 keeps demo.html). 

## Cache Reconciliation (Decision-4 acceptance for DEMO-09)

`CACHE_NAME = 'sessions-garden-' + self.AppVersion.INTEGRITY_TOKEN` (sw.js:19) — token-derived. The next deploy's git-SHA rolls the cache, so a fresh install never lists the removed `demo-hints.js`. The install handler uses `allSettled` tolerance, so a missing asset could never break install anyway. 

No manual cache-number bump and no follow-up `chore` commit are required: the token-based CACHE_NAME has no `v<N>` for the pre-commit hook to parse, AND the hook skips its auto-bump when sw.js is itself staged (reference-pre-commit-sw-bump). Verified post-commit: `CACHE_NAME` line is unchanged.

## Deferred Decision

The APP_VERSION semver bump in `version.js` is a phase-close decision for Ben per the recurring bump habit (project-version-bump-convention) and was intentionally NOT done in this plan. The demo footer's version parity is already delivered by 35-03 (which reads the live APP_VERSION), so nothing in DEMO-09 depends on a version bump here.

## Verification

- **35-demo-static.test.js: 11 passed, 0 failed** — both DEMO-09 assertions flipped GREEN ("zero demo-hints references across the shipped surface" and "assets/demo-hints.js does NOT exist").
- **Full suite: 115 passed, 2 failed** (up from the 114-passing baseline). The 2 remaining failures (`35-demo-exposure.test.js`, `35-demo-seed.test.js`) are sibling-plan RED gates (35-02 / 35-04), out of this plan's scope.
- **tests/sw-precache-cache-reload.test.js: GREEN** — the INTEGRITY_TOKEN-derived CACHE_NAME contract was not broken (all 4 SW guard assertions pass, including "CACHE_NAME derived from AppVersion.INTEGRITY_TOKEN (no hardcoded vNNN)").
- **Final grep:** `grep -rn demo-hints assets/ sw.js *.html` returns nothing; `assets/demo-hints.js` is absent.

## Deviations from Plan

None — plan executed exactly as written. (The CONTEXT's original assumption that demo-hints was "loaded by no page" was already corrected in the plan itself; the live injection + precache references were both found and removed as the plan prescribed.)

## Threat Surface

No new security-relevant surface introduced. The plan's threat register (T-35-05-STALE, T-35-05-DANGLE) is mitigated: the stale-precache risk is closed by the rolling token cache + allSettled install tolerance, and the dangling-injection 404 risk is closed by removing the app.js block in the same plan as the file delete.

## Self-Check: PASSED

- Commit 36cfd68 — FOUND
- Commit 4546510 — FOUND
- assets/demo-hints.js — ABSENT (as intended)
- assets/app.js demo-hints token — none
- sw.js demo-hints token — none
