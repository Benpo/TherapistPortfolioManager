---
created: 2026-06-23T12:00:00.000Z
title: Phase 29 code-review INFO items — IN-01 Czech string, IN-02 restore preserves crashlog, IN-03 read-path merge
area: reliability-observability
priority: medium
files:
  - assets/crashlog.js
  - assets/db.js
  - tests/29-04-crashlog-ingest-merge.test.js
---

## Context

Three INFO-level findings from the Phase 29 code review
(`.planning/phases/29-reliability-observability/29-REVIEW.md`, IN-01..IN-03) were
left open at phase close — non-goal-critical, so they did not block. Ben asked to
queue them for a **planned fix pass** (parallel to the remaining Phase 29 close-out),
to be **discussed during `/gsd-verify-work 29`**. Decisions are baked in below so
this is execution-ready. All three are behavior-touching → each needs a falsifiable
test (project memory `feedback-behavior-verification`). Zero-npm project: tests are
`node tests/*.test.js`.

---

## IN-03 — report read path drops mirror-only entries — DECISION: FIX (Ben: "03 for sure")

**File:** `assets/crashlog.js:195-218` (`getEntries`).
**Problem:** `getEntries` uses the localStorage mirror only when IDB returns *zero*
entries (`list.length === 0 && mirror.length > 0`). In a partial-failure window
(IDB has 1 stale entry, mirror has 5 fresher) the 4 mirror-only entries are dropped
from the report. Now that the CR-01 fix (commit `04b1073`) added a real merge+dedupe
on the WRITE path, reads and writes should share one dedupe path.
**Fix:** Reuse the same merge+dedupe helper from the CR-01 fix inside `getEntries`:
read IDB, union with the mirror, dedupe on the stable content key, prune, return.
Keep the never-throw / mirror-fallback contract.
**Test:** extend `tests/29-04-crashlog-ingest-merge.test.js` (or a new case) — seed IDB
with 1 entry + mirror with 5 fresher distinct entries, assert `getEntries()` returns
all 6 (deduped), most-recent-first.

---

## IN-02 — clearAll() — DECISION (Ben delegated: "02 you should make a decision")

**File:** `assets/db.js:697-710` (`clearAll`).
**Investigated:** `clearAll()` has exactly ONE caller — `assets/backup.js:1096`, the
backup **restore/import** path. It is NOT a user-facing "delete all my data" feature
(the OBS-03 reset & recover uses `indexedDB.deleteDatabase(DB_NAME)`; "delete all
photos" clears photoData per-client). So `clearAll()` == restore-only.

**DECISION (2 parts):**
1. **Preserve the crash log across a backup restore — REMOVE the `crashlog` clear from
   `clearAll()`.** Rationale: the crash log is device-local *diagnostic* data, is NOT
   part of the backup file, and is most valuable exactly when a user restores (often
   because something broke). Wiping it destroys the diagnostic trail with nothing to
   replace it — counter to the whole point of OBS-01/02. The OBS-03 full-reset path
   still wipes everything via `deleteDatabase`, so a user who wants a true clean slate
   still has one. No privacy regression (data stays on-device; restore transmits
   nothing). This is a small behavior change to a sensitive, well-tested flow → test it.
2. **Tidy the redundant `await openDB()` calls** — cache one `const db = await openDB();`
   and reuse it for the remaining `objectStoreNames.contains("snippets")` check.
   Cosmetic, zero-risk, matches Phase 31's "openDB() connection pooling" cleanup list.
**Test:** restore-preserves-crashlog — seed crashlog with N entries, run the restore
(`clearAll()` + re-add path), assert the N crashlog entries SURVIVE while clients/
sessions/snippets are replaced from the backup.

---

## IN-01 — Czech typo in crash-log empty-state — RESOLVED (native-speaker confirmed)

**File:** `assets/crashlog.js:66` (`CRASHLOG_STRINGS.cs.emptyBody`).
A native Czech localizer reviewed it (vykání/formal register confirmed):
- `cs.emptyHeading` "Žádné problémy nezaznamenány" → **OK, do not change.**
- `cs.emptyBody` — "nesehlo" is a non-word. Replace EXACTLY:
  - current: `Na tomto zařízení nic nesehlo špatně. Není co hlásit.`
  - **corrected: `Na tomto zařízení se nic nepokazilo. Není co hlásit.`**
  - (reflexive verb *pokazit se* = "go wrong/break"; drop redundant "špatně"; second
    sentence already correct.)
**Note:** `report.js` has NO Czech strings — the OBS-02 report-screen `cs` strings live
in `assets/i18n-cs.js`. A FULLER review of the Phase-29 Czech/German report keys in
`i18n-cs.js`/`i18n-de.js` was NOT done here and is a natural ride-along for **Phase 33
(DE/CS i18n)** with Sapir.

---

## Suggested routing
- **IN-03 + IN-02**: one small behavior-tested commit each — fold into the Phase 29
  close-out fixing pass, or Phase 31's opportunistic-in-touched-code cleanup.
- **IN-01**: the one string is ready to drop in now; broader CS/DE report-key review → Phase 33.

---

## RESOLUTION — 2026-06-26 (all three fixed & committed)

- **IN-03** (commit `2948b39`): `getEntries()` now unions IDB ∪ mirror, dedupes, prunes. Test `tests/29-in03-getentries-merge.test.js` (2 cases).
- **IN-02** (commit `f68e6df`): `clearAll()` no longer wipes `crashlog` (restore preserves the diagnostic trail) + cached `openDB()`. Test `tests/29-in02-restore-preserves-crashlog.test.js`.
- **IN-01** (rode in with `2948b39`): cs.emptyBody → `Na tomto zařízení se nic nepokazilo. Není co hlásit.`
- All 9 Phase-29 tests green. Broader CS/DE report-key review → Phase 33.
