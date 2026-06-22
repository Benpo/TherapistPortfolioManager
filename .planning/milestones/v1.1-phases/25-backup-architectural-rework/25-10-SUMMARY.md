---
phase: 25-backup-architectural-rework
plan: 10
subsystem: backup-restore
tags: [backup, restore, sentinel, snippets, gap-closure, tdd, behavior-test, data-integrity, CR-02]
requires:
  - 25-09
provides:
  - PortfolioDB._writeTherapistSentinel (raw sentinel write path)
  - ALLOWED_SENTINEL_KEYS branch in backup.js importBackup loop
  - tests/25-10-snippets-sentinel-roundtrip.test.js (CR-02 behavior test)
  - sentinel coverage in tests/25-08-roundtrip-stores.test.js (regression guard)
affects:
  - assets/db.js
  - assets/backup.js
  - tests/_helpers/mock-portfolio-db.js
  - sw.js (CACHE_NAME auto-bump v159 → v160 by pre-commit hook)
tech-stack:
  added: []
  patterns:
    - tdd-red-green-refactor
    - dedicated-write-path-per-row-shape
    - allow-set-per-row-shape
    - write-order-sequence-spy
key-files:
  created:
    - tests/25-10-snippets-sentinel-roundtrip.test.js
  modified:
    - assets/db.js
    - assets/backup.js
    - tests/25-08-roundtrip-stores.test.js
    - tests/_helpers/mock-portfolio-db.js
decisions:
  - Sentinel rows get a dedicated PortfolioDB write path (_writeTherapistSentinel) instead of overloading setTherapistSetting, so section-row coercion (customLabel/enabled trimming) cannot pollute sentinel records.
  - The sentinel allow-set is intentionally a Set of one (`{'snippetsDeletedSeeds'}`) — adding any future sentinel REQUIRES editing both `_SENTINEL_KEYS` in db.js and `ALLOWED_SENTINEL_KEYS` in backup.js, in lock-step. This is the defence-in-depth boundary.
  - The sentinel branch lives in the existing therapistSettings restore loop (not a separate pre-pass) so it inherits the partial-restore-tolerance contract from Phase 22 T-22-07-07: a failed sentinel write logs and continues, never aborts.
  - The behavior test uses an inline sequence-aware mock rather than mutating the shared helper, then Task 3 backports the additive `_writeTherapistSentinel` spy to the shared helper so the canonical D-29 round-trip test can lock the contract.
metrics:
  duration: "~25 min wall-clock"
  completed_at: 2026-05-15T18:31:57Z
  tasks_complete: 3
  tasks_total: 3
  test_assertions_new: 7  # 6 in 25-10 + 1 in 25-08-roundtrip
  red_then_green: true
---

# Phase 25 Plan 10: CR-02 snippetsDeletedSeeds Sentinel Round-Trip — Summary

Closes verifier blocker **CR-02** from `25-VERIFICATION.md`. The `importBackup`
loop now preserves the `snippetsDeletedSeeds` sentinel record on restore, so
users no longer lose their seed-snippet deletion preferences when they restore
from a backup. D-29 round-trip completeness is restored for the full
`therapistSettings` store, including non-section rows.

## The Bug (CR-02 recap)

Pre-Plan-10 behavior chain on restore:

1. `importBackup.clearAll()` wipes the IDB and resets `_seedingDone = false`.
2. The therapistSettings restore loop walks `manifest.therapistSettings`, but
   the 9-key `ALLOWED_KEYS` whitelist at `backup.js:994` only knew about
   section rows (`trapped`, `insights`, …). The `snippetsDeletedSeeds` sentinel
   was silently logged-and-skipped at line 1011.
3. Snippets get restored from the backup (only the survivors — the deleted ids
   are NOT in the export).
4. The next `openDB()` triggers `seedSnippetsIfNeeded`, which reads an EMPTY
   `deletedIds` set (because the sentinel was dropped in step 2) and re-seeds
   the full seed pack — wiping the user's deletion preference.

Silent data regression. Affected every user who had deleted any seed snippet
to match their modality.

## The Fix

### Task 1 — RED behavior test (commit 66543d2)

`tests/25-10-snippets-sentinel-roundtrip.test.js` (421 lines, 6 assertions).
Re-uses the Plan 25-08 vm-sandbox pattern (real JSZip + real backup.js) with
an inline sequence-aware PortfolioDB mock that adds:

- `_writeTherapistSentinel` spy (so the test can assert it IS called).
- A global monotonic sequence counter shared by all write spies (so the test
  can assert the sentinel write precedes the first snippet write).

Three assertion groups:

- **A1 / A2 / A3:** sentinel reaches `_writeTherapistSentinel` exactly once
  with verbatim `sectionKey` + `deletedIds`, and does NOT leak into
  `setTherapistSetting`.
- **B:** simulated `seedSnippetsIfNeeded` pass over the restored snippet
  store sees the sentinel's deletedIds and skips re-seeding.
- **C:** sentinel write sequence precedes the first snippet write sequence
  (ordering guarantee — without it, an openDB() side-effect during snippet
  restore would see empty deletedIds).

Verify: pre-fix `node tests/25-10-...test.js` exits 1 (A1/A2/B/C all fail).

### Task 2 — GREEN implementation (commit e22a57b)

**`assets/db.js`** — added `PortfolioDB._writeTherapistSentinel(record)`:

```js
const _SENTINEL_KEYS = new Set([DELETED_SEEDS_KEY]); // 'snippetsDeletedSeeds'

async function _writeTherapistSentinel(record) {
  if (!record || typeof record.sectionKey !== "string") {
    throw new Error("_writeTherapistSentinel: record.sectionKey required");
  }
  if (!_SENTINEL_KEYS.has(record.sectionKey)) {
    throw new Error("_writeTherapistSentinel: sectionKey '" +
      record.sectionKey + "' is not a registered sentinel");
  }
  const rawIds = Array.isArray(record.deletedIds) ? record.deletedIds : [];
  const cleanIds = rawIds.filter((x) => typeof x === "string");
  return withStore("therapistSettings", "readwrite", function (store) {
    return store.put({
      sectionKey: record.sectionKey,
      deletedIds: cleanIds,
    });
  });
}
```

The method bypasses `setTherapistSetting` entirely (no `customLabel`/`enabled`
coercion). String filtering matches the discipline already in
`_setDeletedSeedIds`. Method exposed on the public PortfolioDB export.

**`assets/backup.js`** — three changes inside `importBackup`:

1. Renamed `ALLOWED_KEYS` → `ALLOWED_SECTION_KEYS` (precise naming; pairs with
   the new sentinel whitelist).
2. Added `var ALLOWED_SENTINEL_KEYS = new Set(["snippetsDeletedSeeds"]);`
3. In the therapistSettings loop, branched on `sectionKey` BEFORE the
   section-key check. Sentinel rows route to `db._writeTherapistSentinel(...)`
   with `deletedIds` defaulted to `[]`; section rows continue through the
   existing `setTherapistSetting` path.

The therapistSettings loop already executes before the snippet-restore loop
in `importBackup`, so the ordering guarantee (Assertion C) is satisfied by
the existing structure — no relocation needed.

`normalizeManifest` now also defensively defaults a sentinel row with missing
`deletedIds` to `[]` so older backups don't trip the import.

### Task 3 — regression guard (commit ace9657)

Extended `tests/25-08-roundtrip-stores.test.js`:

- `SOURCE_THERAPIST_SETTINGS` gains a third row:
  `{sectionKey:'snippetsDeletedSeeds', deletedIds:['seed-x','seed-y']}`.
- Reshaped the therapistSettings COUNT assertion: `setTherapistSetting` now
  expects only the 2 section rows (sentinel goes elsewhere).
- New assertion: `_writeTherapistSentinel` called exactly once, `sectionKey` +
  `deletedIds` round-trip verbatim.
- Assertion count: 15 → 16.

Backported the `_writeTherapistSentinel` spy to
`tests/_helpers/mock-portfolio-db.js` (additive — also strengthens
`assertNoWrites` for the 25-03 dry-run tests).

## Verification

| Check | Result |
|---|---|
| `node tests/25-10-snippets-sentinel-roundtrip.test.js` | 6/6 PASS (was 2/4 RED pre-fix) |
| `node tests/25-08-roundtrip-stores.test.js` | 16/16 PASS (was 15/15) |
| `node tests/25-08-encrypt-then-share.test.js` | 10/10 PASS |
| `node tests/25-08-single-source-audit.test.js` | 18/18 PASS |
| All 26 Phase 25 test files | ALL PASS (zero regressions) |
| `grep -n "ALLOWED_SENTINEL_KEYS" assets/backup.js` | 1 declaration + 1 `.has(` lookup |
| `grep -n "_writeTherapistSentinel" assets/db.js` | definition + JSDoc + 2 internal references + 1 export |
| `grep -n "snippetsDeletedSeeds" assets/backup.js` | sentinel branch + normalizeManifest default |

## Effect on 25-VERIFICATION.md

| Truth | Pre-Plan-10 | Post-Plan-10 |
|---|---|---|
| #18 D-29 round-trip including snippetsDeletedSeeds sentinel | PARTIAL — FAILED | VERIFIED |
| CR-02 status | FAILED — BLOCKER | SATISFIED |

When the orchestrator re-verifies Phase 25 after this wave merges, the CR-02
gap row should close. D-29 satisfaction count rises from 18/21 → 19/21
(CR-01 closed by 25-09; CR-03 closed by 25-11; this plan closes CR-02).

## Files Touched

| File | Change |
|---|---|
| `assets/db.js` | +51 lines (`_writeTherapistSentinel` + export) |
| `assets/backup.js` | +50 / −3 lines (rename + sentinel branch + normalizeManifest default) |
| `tests/25-10-snippets-sentinel-roundtrip.test.js` | +421 lines (new) |
| `tests/25-08-roundtrip-stores.test.js` | +29 / −3 lines (sentinel coverage) |
| `tests/_helpers/mock-portfolio-db.js` | +16 / −0 lines (sentinel spy) |
| `sw.js` | CACHE_NAME v159 → v160 (auto-bump by pre-commit hook) |

## Deviations from Plan

None — plan executed exactly as written. The plan's "relocate the snippet-restore
loop if Assertion C fails" branch was not needed because the existing
therapistSettings loop already runs before the snippet-restore loop, and the
sentinel branch is the first thing inside that loop.

## Commits

| Task | Type | Hash | Message |
|---|---|---|---|
| 1 | test | `66543d2` | test(25-10): RED — CR-02 snippetsDeletedSeeds sentinel round-trip |
| 2 | fix  | `e22a57b` | fix(25-10): GREEN — preserve snippetsDeletedSeeds sentinel on restore (CR-02) |
| 3 | test | `ace9657` | test(25-10): extend 25-08-roundtrip-stores with sentinel coverage |

TDD gate sequence: test → fix → test. RED–GREEN–regression locked in git
history.

## Self-Check: PASSED

All 6 files claimed present in worktree. All 3 task commit hashes present in
`git log --oneline --all`. Verified at 2026-05-15T18:31:57Z immediately after
SUMMARY Write and before metadata commit.
