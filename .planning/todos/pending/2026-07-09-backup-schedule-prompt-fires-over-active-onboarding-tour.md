---
created: 2026-07-09T14:21:59.407Z
title: Backup schedule prompt fires over active onboarding tour (Phase 41 escape — fix before release)
area: bug
files:
  - assets/backup.js:1483-1562
  - assets/app.js:1455-1473
  - assets/backup-modal.js:197
  - assets/tour.js
  - assets/attention-coordinator.js
---

## Problem

Bug found AFTER Phase 41 (onboarding tour) was signed off — a Phase 41 escape, not a new feature. Ben classifies it as a **release blocker**: must be fixed before anything ships.

**Repro (Ben, 2026-07-09, screenshot on file):** Start the tour, leave the tab open/idle for an hour or two, come back to the browser → the **Backup & Restore modal opens on top of the active tour**. Visual result: backup modal sandwiched between the tour dimmer and the "Step 1 of 10 — Welcome to your garden" tooltip. Does NOT happen on a fresh app open.

**Root cause (verified in source):** `checkBackupSchedule()` (assets/backup.js:1500, D-17 foreground schedule check) runs on page load AND on `visibilitychange`. When time-since-last-export exceeds the schedule interval and the 1-hour debounce has passed, it calls `window.openBackupModal()` directly (backup.js:1538-1539). It never checks whether the tour is active. This matches the repro exactly: returning to a long-idle tab fires `visibilitychange` → prompt is due → modal opens mid-tour.

This is by (now-stale) design: Phase 40's D-04 deliberately kept backup surfaces OUT of the AttentionCoordinator arbitration — see the comment at assets/app.js:1460-1462 ("The backup reminder banner and footer integrity nudge stay INDEPENDENT (D-04) — they are NOT routed through the coordinator"). D-04 predates the tour; the interval-end **modal prompt** colliding with a tour overlay was never considered. The security note IS governed (app.js:1464-1473), which is why it doesn't collide.

## Solution

Two candidate directions — **confirm fix direction with Ben before dispatching** (per feedback-quick-bug-intent-check):

1. **Minimal guard (likely right size):** in `checkBackupSchedule()`, skip/defer the prompt while the tour is active (tour.js exposes a namespaced global + tour-active flags around tour.js:538). Don't write the debounce key on the suppressed path so the prompt re-fires after the tour closes (CR-01 pattern already in backup.js:1524-1530).
2. **Route the interval-end prompt through AttentionCoordinator** — revisit D-04 for the modal prompt specifically (banner + footer nudge can stay independent). Cleaner architecturally, bigger blast radius.

Also worth a quick sweep while in there: any OTHER ungoverned surface that can fire over the tour (7-day banner is inline, probably fine; integrity nudge is a footer, probably fine — the modal prompt is the offender).

**Scheduling constraint:** Phase 42 (changelog) is being discussed in a parallel session — coordinate so this fix doesn't clobber roadmap/STATE, and don't run it as a concurrent worktree executor (see reference-worktree-stale-base-concurrent-sessions). Slot as a Phase 41.x bugfix insert or a /gsd-quick on main once the parallel session is at a safe point.
