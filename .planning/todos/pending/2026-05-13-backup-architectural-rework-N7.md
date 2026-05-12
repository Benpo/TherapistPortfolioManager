---
created: 2026-05-13T00:00:00.000Z
title: Backup architectural rework — fix "Send to myself" no-attachment + 3-button dominance
area: bug+architecture
priority: major
recommended_entry: /gsd-discuss-phase
target_phase: 24
files:
  - overview.html
  - assets/overview.js
  - assets/backup.js
  - assets/app.css
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
source: 22-HUMAN-UAT.md N7 (Phase 22 round-3 UAT, 2026-05-07)
prior_label: "22-16 (deferred in Phase 22 backlog)"
---

## Problem — two issues bundled together

### 1. "Send to myself" email contains no attachment

The "Send backup to myself" button on the overview screen opens a `mailto:` URL with a plain text body claiming an attachment is included. **No file actually attaches** — `mailto:` doesn't support attachments in any browser (security model). The therapist receives an email with text but no backup file. The actual backup never reaches them.

### 2. Three backup buttons dominate the overview screen

Backup currently has 3 separate buttons on the main overview screen — the most prominent UI cluster. UX concern: backup is an admin task, not the primary workflow, yet it visually dominates over the actual content (client list / sessions / recent activity).

## Fix scope (decisions for discuss-phase)

### For issue 1 (no attachment)
- **Option A:** Remove the "send to myself" option. Replace with a "Download backup, then attach manually" two-step flow with clear instructions.
- **Option B:** Generate backup file + open mailto:, with explicit "Please attach the downloaded file" instruction in the body.
- **Option C:** Move to a real send mechanism — Web Share API (mobile-friendly) for "share to email/Drive/etc."
- **Option D:** Backend-mediated send via n8n/SMTP (adds GDPR scope — new data processor, needs Datenschutz update).
- **Recommendation to evaluate:** A or C (avoid backend dependency).

### For issue 2 (3-button dominance)
- **Option A:** Move all backup actions to a dedicated "Backup" page reachable via a single nav item / icon button.
- **Option B:** Consolidate into a single "Backup" button that opens a modal with the 3 actions inside.
- **Option C:** Keep current layout, just visually de-emphasize.
- **Recommendation to evaluate:** B (modal) — keeps discoverability AND reclaims overview real estate.

## Acceptance

- "Send to myself" email path either works (attachment delivered) OR is removed and replaced with a clear alternative.
- No user can end up with an email that claims an attachment but contains none.
- Overview screen has at most ONE backup-related primary affordance (button or icon).
- The full backup feature set (export, import, encrypted, unencrypted, send) remains accessible.
- All 4 locale strings updated.

## Cross-references

- N7 in 22-HUMAN-UAT.md (round-3 finding) — failed / major / scope: backup-architecture.
- Previously labeled "22-16" in the Phase 22 backlog (deferred after Phase 22 shipped).
- Related encryption UX fixes already shipped in 22-15 (N11 + N12).
- Related TODO: `2026-03-12-add-scheduled-backup-reminder-and-auto-backup-setting.md` (scheduled backup reminders) — could combine scope here.

## Origin

Reported by Ben during Phase 22 round-3 UAT (2026-05-07). Bundled into a single backup-architecture concern.
