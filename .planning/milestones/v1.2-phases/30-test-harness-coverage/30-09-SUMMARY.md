---
phase: 30-test-harness-coverage
plan: 09
subsystem: testing
tags: [jsdom, vm, settings.js, base64-codec, characterization, backups, photos]

# Dependency graph
requires:
  - phase: 30-test-harness-coverage (plan 07)
    provides: tests/_helpers/base64-codec.js (faithful Buffer-backed atob/btoa/Blob/FileReader)
  - phase: 30-test-harness-coverage (plan 04)
    provides: settings.html real-page jsdom buildEnv + 5-handler capture pattern
provides:
  - tests/30-backups-helper-gate.test.js — pins the A4 backups frequency helper-text wiring + the REAL D-18 password-gate rejection + ack un-check force-off
  - tests/30-photos-optimize-loop.test.js — executes the REAL A5 _optimizeAllPhotosLoop body with truthful byte math + the real dataURL adapters + the real handleOptimize success path
affects: [phase-31-refactor-god-modules, settings.js]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GAP-08: force the REAL gate by overriding BackupManager.canEnableSchedule→false (not the dead :2201 readPasswordAcked fallback) so the rejection branch actually executes"
    - "GAP-09: vm-load settings.js + inject the 30-07 faithful base64 codec so the REAL dataURLToBlob/blobToDataURL produce truthful base64 lengths and savedBytes is an EXACT integer, not >0"
    - "Mutation-kill (G1) recorded per file: revert the guarded branch in a scratch copy → test exits non-zero; restore → exit 0"

key-files:
  created:
    - tests/30-backups-helper-gate.test.js
    - tests/30-photos-optimize-loop.test.js
  modified: []

key-decisions:
  - "GAP-08 forces the real canEnableSchedule→false gate; the :2201 readPasswordAcked fallback is dead in production (BackupManager always present) and is explicitly NOT the target"
  - "GAP-09 calls the REAL __PhotosTabHelpers._optimizeAllPhotosLoop directly (NO monkey-patch) and drives the real handleOptimize success path via captured[4]; the 25-11 constant-output Blob/FileReader fakes are deliberately avoided"
  - "App.t stub maps the two helper keys to distinct strings so refreshFrequencyHelper's textContent wiring is observable (the key-returning default would fall back to the original HTML text)"

patterns-established:
  - "Observable-only assertions: helper data-i18n/text, select value, #schedulePasswordError visibility, EXACT persisted bytes, returned counts, toast spy — never internal function names"

requirements-completed: [TEST-03]

coverage:
  - id: D1
    description: "A4 backups: frequency helper-text wiring (helperOff/helperOn), the REAL D-18 password-gate rejection (error shown + select reverted + no savedToast), and ack un-check force-off"
    requirement: TEST-03
    verification:
      - kind: unit
        ref: "tests/30-backups-helper-gate.test.js (node, 3/3 pass; mutation-kill: drop the !gateAllowed rejection block → exit 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A5 photos: REAL _optimizeAllPhotosLoop body with EXACT savedBytes, no-shrink no-op, real dataURL adapters, and the real handleOptimize success-path dependency assembly (inline pill + success toast)"
    requirement: TEST-03
    verification:
      - kind: unit
        ref: "tests/30-photos-optimize-loop.test.js (node, 3/3 pass; mutation-kill: newBytes<origBytes → always-persist → exit 1)"
        status: pass
    human_judgment: false

# Metrics
duration: 17min
completed: 2026-06-27
status: complete
---

# Phase 30 Plan 09: Backups gate + Photos optimize-loop characterization Summary

**Two characterization tests that EXECUTE the previously-unhit settings.js regions — the real D-18 password-gate rejection (forced via canEnableSchedule→false) and the real photo optimize-loop body with truthful base64 byte math — so a Phase-31 refactor cannot silently break either.**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-06-27T13:00:00Z
- **Completed:** 2026-06-27T13:17:21Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- **GAP-08 (A4 backups):** `tests/30-backups-helper-gate.test.js` loads the REAL settings.html + settings.js into jsdom, invokes ONLY the IIFE-4 backups handler (`captured[3]`), and asserts (1) the frequency helper text flips helperOff↔helperOn through a real change, (2) the REAL gate rejection — with `BackupManager.canEnableSchedule→false` — un-hides `#schedulePasswordError`, reverts the `<select>`, and emits NO `schedule.savedToast`, and (3) un-acking an active schedule force-disables it. The previously-permissive roundtrip stub left the rejection branch unreachable; this test forces the real path (not the dead `:2201` fallback).
- **GAP-09 (A5 photos):** `tests/30-photos-optimize-loop.test.js` vm-loads the REAL settings.js (no monkey-patch), installs the 30-07 Task-0 faithful base64 codec, and (1) runs the REAL `_optimizeAllPhotosLoop` so a strictly-smaller resize persists the optimized dataURL with an EXACT `savedBytes` integer computed from real base64 lengths, (2) proves a same-size resize is a no-op (`savedBytes === 0`), and (3) drives the real `handleOptimize` success path so the real dependency assembly (settings.js:2831-2840) renders the inline preview pill + success toast.
- **Mutation-kill (G1) recorded for both** — see below.
- **Full suite green:** `npm test` → 102 passed, 0 failed (exit 0).

## Task Commits

Each task was committed atomically:

1. **Task 1: GAP-08 backups helper-text + password-gate rejection** - `7b26fbc` (test)
2. **Task 2: GAP-09 photos optimize-loop + dataURL adapters + success path** - `550a998` (test)

_TDD note: these are characterization (RED-first not applicable — they pin existing production behavior); each was authored to fail on a falsifying mutation, verified via the mutation-kill below._

## Files Created/Modified
- `tests/30-backups-helper-gate.test.js` - Real-page jsdom A4 backups gate/helper/force-off characterization
- `tests/30-photos-optimize-loop.test.js` - vm-loaded A5 photos optimize-loop body + adapters + success-path characterization

## Decisions Made
- GAP-08 targets the REAL `canEnableSchedule` gate (overridden to `false` for non-off modes), NOT the defensive `readPasswordAcked` fallback at settings.js:2201 (dead in production because BackupManager is always present).
- GAP-09 uses the faithful 30-07 base64 codec on the vm sandbox so `savedBytes` is a truthful EXACT integer; the 25-11 constant-output Blob/FileReader/atob/btoa fakes were deliberately avoided.
- The backups helper-text assertion uses an `App.t` map (distinct strings for the two helper keys) so `refreshFrequencyHelper`'s `textContent` write is observable; the data-i18n attribute is also asserted as the primary signal.

## Mutation-Kill Verification (G1)

- **Task 1:** In a scratch copy of `assets/settings.js`, neutralizing the `if (!gateAllowed) { … return false; }` rejection block (→ `if (false)`) made the rejection case FAIL (error not shown / select not reverted) → `node tests/30-backups-helper-gate.test.js` exited **1**; restored → exited **0**. settings.js left clean (`git diff` empty).
- **Task 2:** In a scratch copy, changing the loop guard `if (newBytes < origBytes)` to `if (true)` (always-persist) made the no-shrink-no-op case FAIL → `node tests/30-photos-optimize-loop.test.js` exited **1**; restored → exited **0**. settings.js left clean.

## Deviations from Plan

None - plan executed exactly as written. No `assets/*` production file was modified.

## Issues Encountered
- Initial Task-1 `textContent` assertion expected the raw i18n key, but `tt()` only uses `App.t`'s value when it differs from the key — the key-returning stub fell back to the original HTML text. Resolved by giving the stub a distinct translation map for the two helper keys (observable wiring, no production change).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- A4 backups gating and A5 photos optimize-loop are now guarded by tests that execute the real code paths and assert observable behavior — the Phase 31 god-module refactor of `settings.js` has a tighter safety net.
- No blockers.

## Self-Check: PASSED
- tests/30-backups-helper-gate.test.js — FOUND (exit 0, 3/3)
- tests/30-photos-optimize-loop.test.js — FOUND (exit 0, 3/3)
- Commit 7b26fbc — FOUND
- Commit 550a998 — FOUND
- npm test — exit 0 (102 passed)

---
*Phase: 30-test-harness-coverage*
*Completed: 2026-06-27*
