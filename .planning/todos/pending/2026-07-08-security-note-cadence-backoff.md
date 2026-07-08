---
created: 2026-07-08T00:00:00.000Z
title: Spread the security-note reminder cadence with a backoff (7 → 10 → 14 → 21 → 60 → 120 days)
area: ux
priority: low
recommended_entry: /gsd-quick
target_phase: post-v1.3 backlog
files:
  - assets/app.js
source: Phase 40 discuss-phase (2026-07-08) — Ben, while deciding the first-run coordinator precedence
---

## Problem

The Phase 19 security note ("Your data lives here — keep it safe.", `showFirstLaunchSecurityNote` in `assets/app.js`) re-appears every 7 days after dismissal, forever. Pro users who already run backups don't need a weekly reminder; a gentle reminder still doesn't hurt occasionally.

## Fix (direction)

Replace the flat 7-day cadence with a widening backoff per dismissal, e.g. 7 → 10 → 14 → 21 → 60 → 120 days (exact cycle values TBD — Ben was explicitly unsure of the steps, revisit when picking this up). Store the dismissal count alongside the timestamp. Phase 40's coordinator gating (note only shows when no higher-priority surface claims the session) is separate and already handled.

## Acceptance

- Each dismissal pushes the next appearance further out along the chosen cycle.
- Existing `securityGuidanceDismissed` timestamps keep working (no migration break).
- Coordinator gating from Phase 40 unaffected.
