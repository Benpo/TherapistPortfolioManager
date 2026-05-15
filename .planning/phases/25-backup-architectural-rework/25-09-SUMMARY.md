---
phase: 25-backup-architectural-rework
plan: 09
subsystem: backup
tags: [backup, schedule, debounce, gap-closure, tdd, behavior-test, cr-01]

requires:
  - phase: 25-backup-architectural-rework
    provides: BackupManager.checkBackupSchedule, ?openBackup=1 URL-param hook in overview.js, App.mountBackupCloudButton
provides:
  - Gated debounce write in checkBackupSchedule (CR-01 fix)
  - Cross-page redirect fallback (./index.html?openBackup=1) when modal is unreachable
  - Falsifiable behavior test covering 4 modal-availability × page scenarios
affects: [25-VERIFICATION re-run, 25-09 gap closure, future scheduled-backup work]

tech-stack:
  added: []
  patterns: [opened-flag deferred-write pattern, per-branch try/catch isolation]

key-files:
  created:
    - tests/25-09-schedule-debounce-no-modal.test.js
  modified:
    - assets/backup.js

key-decisions:
  - "Use the existing cloud-icon redirect pattern (./index.html?openBackup=1) as the cross-page fallback — same approach the cloud-icon click handler already uses in assets/app.js:475-481. No new code paths."
  - "Pathological 'on overview + no modal' case leaves the debounce intact so the NEXT visit (with modal mounted) can still prompt — rather than wastefully consuming the debounce."
  - "Each window-touching branch has its own try/catch so a thrown SecurityError / DOMException on a hardened-iframe page leaves the function safely no-op rather than half-committed."

patterns-established:
  - "Opened-flag deferred-write: when a side-effect should only run on a successful action path, set a local `opened` flag during each branch and gate the side-effect on `if (opened)` afterward."
  - "Cross-page redirect IS the prompt: ./index.html?openBackup=1 + the existing URL-param auto-open handler in overview.js (lines 302-313) makes a redirect equivalent to opening the modal in-place from a debounce-accounting perspective."

requirements-completed: []

duration: 8min
completed: 2026-05-15
---

# Phase 25 Plan 09: CR-01 Gap Closure Summary

**Gated `BackupManager.checkBackupSchedule` debounce write on a successful modal-open or cross-page redirect, closing the silent-reminder-loss bug on every non-overview page.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-15T18:00:00Z (approximate)
- **Completed:** 2026-05-15T18:08:17Z
- **Tasks:** 3 (1 RED test, 1 GREEN fix, 1 verification no-op)
- **Files modified:** 2 (`assets/backup.js`, `tests/25-09-schedule-debounce-no-modal.test.js`)

## Accomplishments

- **CR-01 closed:** `assets/backup.js:1324` no longer writes `localStorage.setItem('portfolioBackupSchedulePromptedAt', String(now))` unconditionally. The stamp is now gated on `if (opened)` after either a successful in-place `window.openBackupModal()` call OR a cross-page redirect to `./index.html?openBackup=1`.
- **UAT-D2 silent-loss symptom closed:** the redirect path means the scheduled reminder reaches the user via the same well-trodden cloud-icon redirect already used by `assets/app.js:475-481` — no more pages where the prompt is silently lost.
- **Falsifiable behavior test added:** `tests/25-09-schedule-debounce-no-modal.test.js` exercises 4 scenarios that the existing Plan 05 test never covered (the Plan 05 test always mocks `openBackupModal` as available).

## Task Commits

1. **Task 1: RED — failing behavior test for CR-01** — `85c8081` (test)
2. **Task 2: GREEN — gate schedule debounce on modal open or redirect (CR-01)** — `784fcc9` (fix)
3. **Task 3: Verify openBackup=1 URL-param hook on overview** — _no-op verification_ (no code change required; hook already present at `assets/overview.js:302-313`, exposed at line 223)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

### Created
- `tests/25-09-schedule-debounce-no-modal.test.js` — 4-case vm-sandbox behavior test:
  - **Case A** (modal=undefined, pathname=`/settings.html`): conditional pass — if redirect to `./index.html?openBackup=1` occurred, stamp may advance; if href unchanged, stamp MUST stay unchanged.
  - **Case B** (modal=undefined, pathname=`/index.html`): pathological — stamp MUST NOT advance, no redirect occurs.
  - **Case C** (modal=function, pathname=`/index.html`): happy-path regression guard — modal opens, stamp advances, no redirect.
  - **Case D** (modal=function, pathname=`/settings.html`): alternate-fix regression guard — if a future change ever mounts the modal cross-page, the redirect must NOT fire spuriously.

### Modified
- `assets/backup.js` — `checkBackupSchedule` (lines 1300–1361) restructured per `25-REVIEW.md` CR-01:

  **Before (problematic shape):**
  ```js
  if (now - lastPrompt < 60 * 60 * 1000) return;
  try { localStorage.setItem(lastPromptKey, String(now)); } catch (_) {}  // ← UNCONDITIONAL
  try {
    if (typeof window !== 'undefined' && typeof window.openBackupModal === 'function') {
      window.openBackupModal();
    }
  } catch (_) {}
  ```

  **After (gated shape):**
  ```js
  if (now - lastPrompt < 60 * 60 * 1000) return;
  var opened = false;
  try {
    if (typeof window !== 'undefined' && typeof window.openBackupModal === 'function') {
      window.openBackupModal();
      opened = true;
    }
  } catch (_) {}
  if (!opened) {
    try {
      if (typeof window !== 'undefined' && window.location && typeof window.location.pathname === 'string') {
        var pathname = window.location.pathname;
        var onOverview = (/index\.html$/.test(pathname)) || (pathname === '/');
        if (!onOverview) {
          window.location.href = './index.html?openBackup=1';
          opened = true;
        }
      }
    } catch (_) {}
  }
  if (opened) {
    try { localStorage.setItem(lastPromptKey, String(now)); } catch (_) {}
  }
  ```

  Line-number map (pre → post fix):
  | Before | After  | What         |
  |--------|--------|--------------|
  | 1324   | 1359   | Stamp write (now gated on `opened`) |
  | 1332   | 1339   | Modal availability check |
  | —      | 1359   | New `if (opened)` gate (must_haves grep match) |

## Decisions Made

- **Redirect chosen as the cross-page fix path** (not "mount modal markup cross-page"). The plan's `<objective>` explicitly defers in-place cross-page modal mounting to a follow-up phase (UAT-D2's deeper rework) because it would touch every HTML page and is itself an architectural change. The redirect path closes both CR-01 and UAT-D2's bug (silent loss) without touching any non-backup code.
- **Pathological case (on overview + no modal) preserves the debounce.** Rather than advancing the stamp and silently losing the reminder, the function backs off so the next visit (with modal mounted, the normal case) still fires.
- **Per-branch try/catch.** A thrown SecurityError on `window.location.pathname` (cross-origin iframe context) is caught in isolation so it does not poison the modal-availability check or the subsequent stamp write.

## Deviations from Plan

None — plan executed exactly as written. The plan's `<done>` clause for Task 3 explicitly allowed a no-op verification path when the `openBackup=1` URL-param hook is already present (it is — `assets/overview.js:302-313`).

## Issues Encountered

None.

## Verification Evidence

Plan-level verification commands (from `<verification>` block):

```
$ node tests/25-09-schedule-debounce-no-modal.test.js
  PASS  Case A: modal undefined + pathname=/settings.html → debounce stamp MUST NOT advance UNLESS redirect occurred
  PASS  Case B: modal undefined + pathname=/index.html → debounce stamp MUST NOT advance
  PASS  Case C: modal available + pathname=/index.html → modal opens AND debounce stamp advances
  PASS  Case D: modal available + pathname=/settings.html → modal opens in-place, no redirect, debounce advances
Plan 09 schedule-debounce-no-modal tests — 4 passed, 0 failed

$ node tests/25-05-schedule-debounce.test.js
  PASS  lastPromptedAt = 30 min ago → check does NOT re-fire (within 1h debounce)
  PASS  lastPromptedAt = 90 min ago → check DOES fire (debounce expired)

$ node tests/25-05-schedule-fires.test.js
  PASS  schedule=daily + lastExport 25h ago + no debounce → openBackupModal called once
  PASS  schedule=off → openBackupModal NOT called

$ node tests/25-05-schedule-password-mandatory.test.js
  7 passed, 0 failed
```

Grep gates (from must_haves and `<verification>`):

```
$ grep -n "if (opened)" assets/backup.js
1359:    if (opened) {

$ grep -E "openBackup.*=.*1|new URLSearchParams\(.*search.*\).*get\(.openBackup" assets/overview.js | grep -v '^\s*//'
    if (params.get("openBackup") === "1") {
```

Both gates pass.

**RED→GREEN transition evidence:** Before the Task 2 fix, Cases A and B FAILED with the message `portfolioBackupSchedulePromptedAt MUST NOT advance — got <now>, expected <2h-ago value>. This is CR-01: debounce silently consumed.` After the fix, all 4 cases PASS.

## CR-01 Status Transition

| Status | Before Plan 09 | After Plan 09 |
|--------|---------------|---------------|
| `25-VERIFICATION.md` CR-01 (gap 1) | `status: failed` | `status: satisfied` |
| `assets/backup.js:1324` stamp write | unconditional | gated on `opened===true` |
| Non-overview-page coverage in tests | none (Plan 05 always mocks modal available) | 4 cases in Plan 09 test |
| UAT-D2 silent-loss symptom | reproducible | closed via redirect path |

CR-01 should flip from `failed` → `satisfied` on the next verifier run.

## Next Phase Readiness

- The CR-01 gap is closed; the next gap-closure plan (CR-02: `snippetsDeletedSeeds` sentinel dropped on restore) and CR-03 (Hebrew imperatives on Phase 25 surfaces) are independent of this work and can run in parallel or sequentially.
- No follow-up CACHE_NAME bump is needed — the pre-commit hook auto-bumped `sessions-garden-v156 → v157` in commit `784fcc9` when `assets/backup.js` changed.
- No new IDB stores, no schema changes, no i18n changes — this is a pure runtime-behavior fix gated by an additional local flag and a defensive redirect.

## Self-Check

**Files claimed created:**
- `tests/25-09-schedule-debounce-no-modal.test.js` — FOUND

**Files claimed modified:**
- `assets/backup.js` — FOUND (and diff includes the `if (opened)` gate at line 1359)

**Commits claimed:**
- `85c8081` (Task 1 RED) — FOUND in `git log --all`
- `784fcc9` (Task 2 GREEN) — FOUND in `git log --all`

## Self-Check: PASSED

---

## Round-5 post-UAT (Ben 2026-05-15) — UAT-D2 fully closed in-place

Plan 09's objective explicitly deferred UAT-D2's "modal opens in-place on
every page" rework (the redirect was the gap-closure compromise). Ben's
round-5 UAT requested the full in-place behavior. It is now delivered:
the modal markup + handlers + `window.openBackupModal` moved to the
page-agnostic `assets/backup-modal.js` (loaded on every app page), so the
cloud icon — and this plan's `checkBackupSchedule` scheduled prompt —
open the modal in-place wherever the user is. The CR-01 `if (opened)`
debounce gate and the redirect fallback are preserved; the CR-01
behavior test (`tests/25-09-schedule-debounce-no-modal.test.js`) remains
4/4 GREEN. Full record + commits: see the **"Round-5 post-UAT fixes
(Ben 2026-05-15)"** section in `25-13-SUMMARY.md` (Change 1). New
behavior test: `tests/25-09-modal-global-inplace.test.js` (4/4).

---
*Phase: 25-backup-architectural-rework*
*Plan: 09*
*Completed: 2026-05-15*
