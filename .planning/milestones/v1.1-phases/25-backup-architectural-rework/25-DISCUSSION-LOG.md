# Phase 25: Backup Architectural Rework — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 25-backup-architectural-rework
**Areas discussed:** Send-to-myself fix path, 3-button consolidation + entry point, Surface contents + scheduled-backup fold, Backup awareness on overview, Photo handling (new topic), Existing-photo migration (new topic), Scheduled-backup detail scope (new topic), Cross-cutting requirements (new topic)

**Pre-discussion scope decision:** The user initially asked to bundle Phase 25 (backup rework) with a new "in-app overview/onboarding/help" topic. Claude flagged scope creep — the two topics are different domains. User chose to **split into two phases**: Phase 25 stays the backup rework; new **Phase 26** added to ROADMAP.md for the onboarding/help system; new TODO `2026-05-15-in-app-onboarding-overview-help.md` captured as `priority: critical` pointer.

---

## Area 1 — Send-to-Myself Fix Path

| Option | Description | Selected |
|---|---|---|
| Web Share API + mailto fallback | Use `navigator.share` where supported; mailto fallback with honest body elsewhere | partial ✓ |
| Remove send-to-myself entirely | Drop the button, replace with guidance text | ✓ |
| Keep mailto, fix lying email body | Minimal-touch fix to body copy | |
| Backend SMTP send | Real email send via n8n/SMTP — adds GDPR scope | (rejected) |

**User's choice:** **Remove the button** — but ALSO add Web Share API inside the existing encrypt-aware export dialog (so Share inherits encryption choice rather than being a separate unencrypted shortcut).
**Notes:** Decisive reason was a security insight — current `sendToMyself()` calls unencrypted `exportBackup()` directly, bypassing the encrypt/skip modal. Not just a UX bug, a privacy hole. Removing it closes the hole. Web Share API hooks into the proper encryption-aware export flow instead.

**Naming sub-question:**

| Option | Description | Selected |
|---|---|---|
| 'Share backup' | Matches Web Share API semantics; works in both share-sheet and mailto-fallback paths | ✓ |
| Keep 'Send to myself' | Familiar to existing user; only fix body | |
| 'Email backup' | Explicit destination; loses generality | |

**User's choice:** 'Share backup'.
**Notes:** None — recommended option accepted as-is.

---

## Area 2 — 3-Button Consolidation + Entry Point

| Option | Description | Selected |
|---|---|---|
| Single modal, Export prominent + Import secondary | One Backup & Restore button → modal with Export on top, Import as collapsed/footer section | ✓ |
| Dual-pane modal (Export \| Import side-by-side) | Symmetric 50/50 layout | (considered) |
| Export on overview, Import on Settings (new tab) | Strong separation of frequent vs destructive | (considered) |

**User's choice:** Single modal with Export prominent + Import secondary.
**Notes:** User initially proposed dual-pane, then asked Claude to think through tradeoffs together. Claude's analysis: equal visual weight risks mis-clicks; export needs to drive habit; co-location matters for new-device-restore discoverability. User accepted the asymmetric recommendation.

---

## Area 3 — Surface Contents + Scheduled-Backup Fold

| Option | Description | Selected |
|---|---|---|
| Backup contents visibility (V icons + descriptions) | Show what's inside the backup file with checkmarks | ✓ |
| Last-backup-at indicator inside the modal | Reinforces habit at the moment user opens dialog | ✓ |
| Fold scheduled-backup TODO (2026-03-12) | Add frequency selector + auto-backup interval + configurable reminder | ✓ |
| Backup folder picker | Pull the currently-hidden 'Set backup folder' button into the surface | (folded into scheduled-backup) |

**User's choice:** First three selected. Folder picker not separately selected — handled inside scheduled-backup settings (D-11).
**Notes:** User flagged a coupling concern: "if the therapist chooses every 2 weeks and the overview-page nudge continues every week — this would be weird." This sparked the schedule ↔ banner ↔ chip coupling decisions captured in D-13/14/15/19.

---

## Area 4 — Backup Awareness on Overview

| Option | Description | Selected |
|---|---|---|
| Passive 'last backup' chip (always visible, color-thresholded) | Always-on signal; warning/danger colors when overdue | ✓ |
| Rely only on 7-day reminder banner | Simplest; no extra UI | |
| Chip only when overdue | Less constant; loses positive reinforcement | |

**User's choice:** Recommended approach (always-visible chip).
**Notes:** User explicitly tied this back to scheduling coupling — chip thresholds must align with user's chosen interval if schedule is on, otherwise green ≤7 days / warning ≤14 / danger >14.

---

## Area 5 — Photo Handling (NEW topic raised by user during Area 1 discussion)

User raised mid-discussion: "topic of photos — I want to not accept huge photos as some users then have huge storage in the browser ... can we add resizer to the app without crossing the line of standard JS app, or is there another solution for that?"

| Option | Description | Selected |
|---|---|---|
| Canvas-based resize on upload (800px / JPEG 0.75) | Pure JS, no library, reuses existing crop canvas | ✓ |
| 600px / JPEG 0.70 (tighter) | Smaller files, mild pixelation risk on zoom | |
| 1000px / JPEG 0.80 (more generous) | Better quality, larger files | |
| Hard size cap only, no resize | Reject >2MB files; simpler but worse UX | |
| Defer to its own phase | Split off | |

**User's choice:** 800px / JPEG 0.75. Plus a sharper suggestion: store only the cropped/positioned result, NOT the original.
**Notes:** User's photo-crop-only insight is captured as D-22 — significantly bigger storage win than resize alone. Decision is hard, not soft: future phases should not regress by re-introducing original-file storage.

---

## Area 6 — Existing Photo Migration (NEW topic — emerged from Area 5)

| Option | Description | Selected |
|---|---|---|
| Optional one-time 'Optimize photos' button in Settings | Surface action with estimated savings preview; user-triggered | ✓ |
| Leave existing photos alone | Simplest; no storage win for current users | |
| Silent auto-migration on next app open | Risky; no opt-out; not recommended | |

**User's choice:** Optional Settings button. User then expanded the scope: dedicated "Photos" section in Settings with optimize + delete-all + storage usage display (captured as D-25).
**Notes:** User asked for "estimated size gained/saved" preview before running — captured in D-25.

---

## Area 7 — Scheduled-Backup Detail Scope (NEW sub-area inside fold)

| Option | Description | Selected |
|---|---|---|
| Frequency selector | Off / Daily / Weekly / Monthly / Custom days | ✓ |
| Auto-save to chosen folder (interval-based) | Silent folder-write on schedule fire | (deferred) |
| Interval-end prompt with password if encryption is on | Modal pops at interval end, downloads with password prompt | ✓ |
| Suppress 7-day banner when schedule is ON | Coupling rule — banner and schedule never compete | ✓ |

**User's choice:** Frequency + interval-end prompt + banner suppression. Auto-save-to-folder deferred (D-20).
**Notes:** User added a strong rule: scheduled backups MUST require a password — "Data is sensitive and crucial, and people won't express the importance themselves if we allow them to skip passwords, so they need a 'push'." Captured as D-18 (password-mandatory).

User also added a new feature mid-area: **"Test backup password" dry-run** — let user upload a backup just to verify they remember the password, without restoring. Captured as D-12 (safety net for the worst-case "I forgot my password" scenario).

---

## Area 8 — Cross-Cutting Requirements (NEW — raised by user at wrap-up)

User stated: "For everything we decide now, we need instructions and headers clearly. Regardless where we add stuff into."

Not an option-tree — a cross-cutting rule captured as **D-26**: every new surface (modal, Settings section, prompt) must have clear headers + one-line descriptions. No bare button grids.

**Notes:** This is a local instance of the Phase 26 concern (in-app help / onboarding). Phase 25 raises the bar for backup-related surfaces; Phase 26 will tackle the rest of the app systematically.

---

## Claude's Discretion

- Exact modal layout within "Export prominent, Import secondary" constraint
- Where "Test backup password" feature lives (modal vs Settings)
- Where "Backup folder" picker UI lives within scheduled-backup settings
- Storage-usage display unit & precision
- Modal entry button label & position (must be visually prominent)

---

## Deferred Ideas

- Silent auto-save to chosen folder on schedule fire (D-20 explicitly defers)
- In-app onboarding / help system → Phase 26
- v12 full IndexedDB encryption → separate phase per ROADMAP
- PWA install guidance + user manual → Phase 26
- Re-crop UI on existing photos (no original stored after D-22)
- Per-client photo size budget / quotas
- Backend-mediated send (option D from N7) — rejected outright on principle (data-never-leaves-device value)
