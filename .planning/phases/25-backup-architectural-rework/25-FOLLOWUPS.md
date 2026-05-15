# Phase 25 — Deferred follow-ups (non-blocking)

Captured 2026-05-16 after code review. None block v1.1 launch; bundle into a
future cleanup pass.

## From code review (25-REVIEW.md)

- **WR-02** `assets/app.js` (~786-792): `confirmDialog` placeholder path
  strips `data-i18n` from the shared modal, so an open dialog won't
  re-translate if the user switches language mid-dialog. Edge case.
- **WR-03** `assets/settings.js` (~2504-2509): `{n}` photo count and `{size}`
  savings estimate use different photo-field coverage (`photoData` only vs
  `photoData || photo`), so the count and the size can disagree slightly.
  Cosmetic — no data corruption.
- **Info-1** markup duplication (static index.html modal + injected copy —
  intentional, static wins; cosmetic dedupe only).
- **Info-2** stale comment.
- **Info-3** dead pre-reload DOM work.
- **Info-4** pre-existing `tx.onabort` gap (not introduced by phase 25).
