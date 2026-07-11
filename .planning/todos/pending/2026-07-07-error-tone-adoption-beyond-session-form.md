---
created: 2026-07-07T12:30:00.000Z
title: Adopt the error-tone toast beyond the session form — add-client, PDF export, backup errors (WR-04)
area: enhancement
priority: low
recommended_entry: /gsd-quick
target_phase: v1.3 candidate
files:
  - assets/settings.js
  - assets/backup-modal.js
  - assets/export-modal.js
  - assets/add-client.js
source: Phase 38 full-phase code review (38-REVIEW.md WR-04, 2026-07-07) — 38-12 deliberately scoped error-tone migration to add-session.js only
resolves_phase: 48
---

## Problem

38-12 gave `showToast` a generalized `{ tone: "error", focus }` API but migrated only the add-session form's error call sites (Ben's scope). Result: `toast.errorRequired` renders error-toned on add-session but success-styled on the add-client page (same key, contradictory treatment), and the highest-cost failures — PDF export failure, backup import/export errors — still render identical to "saved successfully" for 1.8s.

## Fix (direction)

Sweep the remaining error-toast call sites (settings/backup/export/add-client pages) and pass `{ tone: "error" }` (+ `focus` where a specific field is fixable). Success/info toasts stay untouched. Mechanical, low-risk — the API is already backward-compatible and tested.

## Acceptance

- Every user-facing failure toast app-wide renders the error tone (distinct color, 4s dwell); field-bound ones focus their field.
- Success/info toasts unchanged; suite green.
