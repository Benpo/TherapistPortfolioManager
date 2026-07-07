---
phase: 38-next-session-date-field-with-overview-column
plan: 07
subsystem: demo-seed
tags: [demo, next-session-date, relative-dates, backup-parity, NEXT-07]
requires: ["38-02", "35-04"]
provides:
  - "Demo self-freshening next-session dates (relative nextSessionDaysAgo seam)"
  - "Confirmed automatic backup/restore parity for nextSessionDate (no backup.js change)"
affects:
  - assets/demo-seed.js
  - assets/demo-seed-data.json
tech-stack:
  added: []
  patterns:
    - "nextSessionDaysAgo -> nextSessionDate conversion mirrors the existing daysAgo -> date seam (isoDaysAgo reused, negative = future)"
key-files:
  created: []
  modified:
    - assets/demo-seed.js
    - assets/demo-seed-data.json
decisions:
  - "D-12: demo next-dates are relative (negative nextSessionDaysAgo) so the column self-freshens and reads mostly-upcoming, never drifting all-overdue"
  - "D-11: backup carries nextSessionDate automatically (whole-object session export/restore); zero backup.js edits — verification only"
metrics:
  duration: "~8min"
  completed: 2026-07-07
  tasks: 2
  files: 2
status: complete
---

# Phase 38 Plan 07: Self-Freshening Demo Next-Session Dates + Backup Parity Spot-Check Summary

Added a relative `nextSessionDaysAgo` (negative = future) helper to the demo seed's `applyRelativeDates` conversion and seeded five recent demo sessions with near-future offsets (plus one deliberate overdue showcase), so the new Next Session overview column reads populated and mostly-upcoming while self-freshening forever; confirmed by inspection + green suite that `nextSessionDate` round-trips through backup with no `backup.js` change — NEXT-07 (D-11, D-12).

## What Was Built

### Task 1 — Relative next-session seam + seeded recent sessions (commit 81e61b9)
- **assets/demo-seed.js** — `applyRelativeDates` now, after the existing `daysAgo → date` conversion, converts an optional `nextSessionDaysAgo` into `copy.nextSessionDate = isoDaysAgo(nextSessionDaysAgo, now)` and deletes the helper key. NEGATIVE values yield a FUTURE date (`isoDaysAgo(-6)` is 6 days ahead of `now`). Sessions without the helper are untouched (no `nextSessionDate` injected). Reuses `isoDaysAgo` — no new date math. Keeps the DEMO-06 self-freshening invariant (D-12).
- **assets/demo-seed-data.json** — added `nextSessionDaysAgo` to the 5 most-recent-per-client sessions (the ones that are `clientSessions[0]` so the overview column reads populated):

  | Session (clientId) | daysAgo | nextSessionDaysAgo | Result |
  |---|---|---|---|
  | client 24 (Ben D) | 72 | -10 | future (aligns with the session's "Next session in 10 days" note) |
  | client 25 (Rexi A) | 23 | +4 | **the one deliberate near-past** overdue-cue showcase |
  | client 26 (Linda R) | 12 | -12 | future |
  | client 29 (Heart-Shield arc) | 0 | -7 | future (~1 week out) |
  | client 32 | 7 | -10 | future |

  Majority near-future negatives, exactly one near-past positive — invariant `nextSessionDaysAgo <= daysAgo` holds for every seeded session, so each computed `nextSessionDate >= its session's own computed date` (near-future, never backwards). JSON still parses; diff is minimal (5 added keys, no reformat churn).

### Task 2 — Backup/restore parity spot-check (verification only, no code change)
Confirmed by reading `assets/backup.js` that `nextSessionDate` rides along automatically as part of the whole session object:
- **:646–647** wholesale `db.getAllSessions()` → assembled into the ZIP (`sessions: allSessions`).
- **:1122–1123** restore via `await db.addSession(manifest.sessions[j])` — the whole session object is re-added, no per-field copy.
- **:1373** `BACKUP_CONTENTS_KEYS = ['clients', 'sessions', 'snippets', 'therapistSettings', 'photos']` is a TOP-LEVEL content-key list, NOT a per-field allowlist that would strip `nextSessionDate`.

No per-field backup serialization was added; `assets/backup.js` is unchanged (`git diff --quiet` → BACKUP_UNCHANGED). The backup round-trip test (`snippet-prefix-backup-roundtrip`) and the full suite are green.

## Verification
- `node tests/35-demo-seed.test.js` — **4/4 GREEN** (was the RED gate; NEXT-07 case now passes: seam exposed, ≥2 sessions carry `nextSessionDaysAgo`, each `nextSessionDate >= date`, `pastTodayCount == 1 ≤ 1`).
- `node tests/run-all.js` — **127 passed, 0 failed, 127 total** (full suite GREEN, including the backup round-trip test).
- `git diff --quiet -- assets/backup.js` — passes (BACKUP_UNCHANGED).
- Grep gates: `nextSessionDaysAgo` + `nextSessionDate` present in demo-seed.js; `nextSessionDaysAgo` count in JSON = 5.
- Manual (phase gate, deferred to Ben): open demo.html and confirm the Next Session column is populated and mostly upcoming with one overdue example.

## Deviations from Plan
None — plan executed exactly as written. Rules 1–4 not triggered; no auth gates.

## TDD Gate Compliance
This plan flipped a pre-existing Wave-1 RED gate (`tests/35-demo-seed.test.js`, authored in Plan 38-02) to GREEN by implementation only — no test file was edited. The RED→GREEN transition is the gate; the implementing commit is a `feat` (the RED `test` commit lives in Plan 38-02's history).

## Self-Check: PASSED
- assets/demo-seed.js — FOUND
- assets/demo-seed-data.json — FOUND
- Commit 81e61b9 — FOUND in git log
- backup.js — UNCHANGED (as required)
