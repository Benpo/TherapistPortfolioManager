# Phase 29: Reliability & Observability - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-22
**Phase:** 29-reliability-observability
**Areas discussed:** Reset & recover safety (OBS-03), Report contents & privacy (OBS-02), Report delivery UX (OBS-02), Crash-log scope & resilience (OBS-01), Crash-log retention

---

## Owner pre-question — "What counts as 'stuck in a loop'?"

Ben (as app owner) asked, before deciding the OBS-03 fix, which cases today are
covered and how the loop could even occur. Answered in session:
- The loop = `db.js` migration throw → `transaction.abort()` (data safe at old
  version) → `showDBMigrationError()` banner whose only action is "Refresh" →
  `location.reload()` → re-runs the same migration → re-fails → forever.
- Realistic cause: a **future** migration (v6+) with a bug, which bricks **only
  users who already have data** (fresh installs skip straight to target version).
- On current v5 schema there is **no known reproducible loop** — OBS-03 is
  forward-looking insurance, sized for the non-technical maintainer (Sapir)
  shipping a bad migration later.

This framing is recorded in CONTEXT.md `<specifics>`.

---

## Reset & recover safety (OBS-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Backup-first, automatic | Auto-run ZIP export, then wipe + rebuild | |
| Backup offered, user-gated | Prominent "Download backup first" + "Reset now" | ✓ (refined) |
| Plain reset (wipe + reload) | deleteDatabase + reload, no backup step | |

**User's choice:** Backup-first in spirit, but Ben caught a blocker: **export
can't run silently — it always requires a passphrase** (or an explicit
skip-encryption confirm). So: offer "Export backup now" (interactive), then gate
the destructive reset behind a **checkbox affirmation** ("I have a backup I can
restore from") **plus double-confirm**, emphatic if no export was made this
session.
**Notes:** Verified against `backup.js` — `exportEncryptedBackup()` always shows
a passphrase modal; even "Skip encryption" forces "Yes, export unprotected"
(lines 115–118). Confirms no silent-export path exists. Known wrinkle flagged
for planning: a failed migration may also block the normal export path
(export re-opens the DB) → may need a read-only open at the existing version.

---

## Report contents & privacy (OBS-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Redact + preview | Scrub obvious PII AND show editable preview before copy | ✓ |
| Preview only | Show before copy, no automated redaction | |
| Redact only, silent copy | Auto-scrub, copy with just a toast | |

**User's choice:** Redact + preview.
**Notes:** Belt-and-suspenders — automated scrub as a floor, the user's own eyes
as the final gate, since the report gets pasted into an email. Reinforces the
"nothing leaves the device" promise.

---

## Report delivery UX (OBS-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Copy + prefilled mailto: | Copy to clipboard + open prefilled email to support | |
| Copy-only + instructions | Copy + show support address, no mailto | |
| You decide | Builder picks cleanest pattern | |
| **Dedicated report screen** (follow-up) | In-app "Report a problem" page: preview + copy + mailto handoff | ✓ |

**User's choice:** Ben asked "won't it make sense to integrate some email
sendout page?" → clarified the hard constraint: the app has **no backend / zero
network**, so it can't send email itself (OBS-02 forbids auto-transmission).
Resolved to a **dedicated "Report a problem" screen** that assembles + previews
+ copies, then hands off to the user's own email client via `mailto:`.
**Notes:** Copy carries the full log (mailto bodies can't hold long logs);
mailto opens a short "paste below" email. Degrade to copy-only + shown address
if mailto is unreliable in the installed PWA.

---

## Crash-log scope & resilience (OBS-01)

| Option | Description | Selected |
|--------|-------------|----------|
| IDB + localStorage mirror | IDB primary + mirror last few to localStorage | ✓ |
| IndexedDB only | Literal to requirement; can't log IDB-open failures | |
| localStorage only | Most resilient but caps size, diverges from "IndexedDB" wording | |

**User's choice:** IDB + localStorage mirror.
**Notes:** Closes the paradox — an IDB-migration failure (the OBS-03 scenario)
is exactly when IDB is broken, so the mirror ensures that failure class is still
captured and reportable. Capture set: `window.onerror` + `unhandledrejection` +
the Phase 28 integrity mismatch.

---

## Crash-log retention

| Option | Description | Selected |
|--------|-------------|----------|
| 30 days + 50 max | Prune on write: ≤30 days old AND ≤50 entries | ✓ |
| 14 days + 50 max | Tighter 2-week window | |
| Count-only (last 50) | Plain ring buffer, no age check | |

**User's choice:** 30 days + 50 max.
**Notes:** Ben flagged that a count-only buffer could hoard months-old, useless
entries. Dual cap (age + count, whichever is tighter), pruned on write — bounded
size and self-cleaning. 30 days keeps "report last week's bug" workable.

---

## Claude's Discretion

- Global error-handler module shape and load order (must load early on all ~20
  app pages, like `version.js`).
- Exact diagnostic-context fields in the report (app version, language,
  userAgent, DB version, store counts, storage usage) — bounded by the redaction
  + preview safety net.
- Optional crash-log "clear" affordance.
- localStorage mirror depth (how many recent entries to mirror).

## Deferred Ideas

- Tagged logging in silent `catch` blocks across the codebase → Phase 31 (RFCT-03).
- `onblocked` (another-tab) stuck-state UX → distinct from the loop; not OBS-03.
- Standing "nuclear reset" button in Settings (independent of a migration
  failure) → not requested; future hardening only if support reports warrant it.
- 5 todo keyword-matches reviewed, none folded (all generic false-positives).
