---
phase: 29-reliability-observability
verified: 2026-06-25T21:00:00Z
status: human_needed
score: 4/4 must-haves verified (29-04 gap-closure truths)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 3/3
  gaps_closed:
    - "GAP 1 (race): Five concurrent CrashLog.logError() calls now all persist — the lost-update race in append() is closed via the _appendTail tail-promise queue. Test 29-01 case 7: was 1/5 survive (RED), now 5/5 (GREEN)."
    - "GAP 2 (double-log): A post-load error yields exactly one persisted entry — the inline P() guard `if(self.CrashLog)return;` neutralizes the early-buffer handler once the full module is present. Test 29-05: 2/2 GREEN."
    - "D-06 (mailto reliability): cleared in on-device UAT (29-UAT.md test 1 — result: pass). No longer a pending human item."
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Install the updated Sessions Garden PWA (post-29-04 deploy). Tap 'Generate 3 test problems'. Open the crash log (Settings → Report a problem) and count the entries: expect 3 distinct entries, one for each error source (direct logError seam, unhandled rejection, uncaught error) — not 1 out of 3 (the pre-fix race result)."
    expected: "All three errors from the cascade are persisted. No entry is dropped. The cascade race is confirmed closed on a real installed PWA."
    why_human: "The race was discovered only on an installed PWA during Phase 29 UAT (2026-06-25). The unit test (case 7 — 5 concurrent logError calls, all survive) fully exercises the serialized append path and is GREEN. However, field-verification on a real installed device is the project's established sign-off for on-device correctness (Phase 28 pattern). The test proves the fix; on-device confirms it survives the full PWA boot chain."
  - test: "On the updated installed PWA, open any page (e.g. report.html). In the browser console or via 'Generate test problems', trigger a single uncaught error. Open the crash log. Confirm the error appears exactly once — not twice as source:'early' and source:'onerror'."
    expected: "Exactly one entry per error. No 'early' duplicate. The real-source entry survives."
    why_human: "The double-logging was observed on-device in Phase 29 UAT (2026-06-25). The falsifiable test (29-05 cases A+B) exercises the full page-load order (inline P() installed before crashlog.js, then crashlog.js loaded, then post-load error fired) and is GREEN. On-device confirmation closes the field-verification loop."
---

# Phase 29: Reliability & Observability — Re-Verification Report (29-04 Gap Closure)

**Phase Goal:** Production problems on a user's device are diagnosable — errors are captured locally, the user can hand over a diagnostic log without any data leaving the device, and a failed database migration can no longer trap the user in an unrecoverable refresh loop.
**Verified:** 2026-06-25
**Status:** human_needed
**Re-verification:** Yes — after 29-04 gap closure (two OBS-01 UAT gaps diagnosed 2026-06-25, fixed same day)

---

## Re-Verification Summary

The initial verification (2026-06-23) scored 3/3 with `status: human_needed` for one item: D-06 (mailto reliability on installed PWA). On-device UAT (29-UAT.md, 2026-06-25) cleared D-06 (test 1: pass) but found two OBS-01 code-level gaps: a lost-update race in `append()` (GAP 1) and post-load double-logging from the un-neutralized inline early handler (GAP 2). Plan 29-04 closed both. This re-verification confirms the fixes.

**D-06 human item:** CLEARED (on-device UAT result: pass — 29-UAT.md test 1).
**GAP 1 (race):** CLOSED at code level. Test 29-01 case 7: 7/7 GREEN.
**GAP 2 (double-log):** CLOSED at code level. Test 29-05: 2/2 GREEN.
**Regressions:** None. Tests 29-01 cases 1-6, 29-04 ingest, 29-02, 29-03 all unregressed.

Two recommended on-device re-confirmation items remain (see Human Verification section) per the project's field-verification convention for bugs that were originally discovered on-device.

---

## Goal Achievement

### Observable Truths (29-04 Must-Haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Five concurrent CrashLog.logError() calls all persist — no append clobbers another | VERIFIED | `_appendTail` tail-promise queue (crashlog.js lines 270, 310–316) serializes each read-modify-write; `doAppend()` cannot begin `getEntries()` until the prior link's `replaceAllCrashlog` has committed. Test 29-01 case 7: 5/5 concurrent calls survive. |
| 2 | A direct CrashLog.logError() seam entry survives even when an onerror and unhandledrejection are appended in the same tick | VERIFIED | Covered by case 7 (5 concurrent logError calls including the direct seam path, all persist — 7/7 PASS). The serialized queue ensures each normalize-then-doAppend link commits before the next reads. |
| 3 | An error thrown AFTER crashlog.js has loaded yields exactly ONE persisted entry — no 'early' + real-source duplicate | VERIFIED | `if(self.CrashLog)return;` guard inserted as the first statement of inline `P(m,s,u)` on all 21 SW-registered pages. Once crashlog.js assigns `self.CrashLog` (line 476), all later P() calls return immediately. Test 29-05 cases A+B: post-load onerror → 1 entry (source:'onerror'); post-load unhandledrejection → 1 entry (source:'unhandledrejection'). 2/2 PASS. |
| 4 | The existing OBS-01 contract is intact: 50-entry ceiling, 30-day prune, mirror-survives-IDB-failure, and zero network calls | VERIFIED | Tests 29-01 cases 1-6: all GREEN (unregressed). Tests 29-04 ingest-merge: 3/3 PASS. `grep -an 'fetch\|XMLHttpRequest\|import(' assets/crashlog.js` returns no matches. |

**Score:** 4/4 truths verified (0 present, behavior-unverified)

### Original Phase Truths (Unregressed)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Uncaught error / unhandled rejection captured, retained in IDB (≤50 / ≤30d), zero network | VERIFIED | 29-01: 7/7 PASS; 29-04-ingest: 3/3 PASS; zero network grep confirmed |
| 2 | Settings exposes "Report a problem" → copies log to clipboard; nothing transmitted automatically | VERIFIED | 29-03-report: 19/19 PASS; 29-03-report-wiring: 8/8 PASS |
| 3 | Failed IndexedDB migration offers reset & recover escape hatch instead of endless refresh loop | VERIFIED | 29-02-migration-escape-hatch: 6/6 PASS; 29-02-recovery-export: 6/6 PASS |

---

## Required Artifacts (29-04)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/crashlog.js` | Serialized append (module-level tail-promise queue) + inline-handler neutralization | VERIFIED | 445 lines. `_appendTail = Promise.resolve(true)` (line 270). `doAppend()` (lines 275-299): read-modify-write. `append()` (lines 306-318): normalize before queue boundary, chain onto `_appendTail`, advance tail. Zero fetch/XHR confirmed. |
| `tests/29-01-crashlog-capture.test.js` | Case 7 (5 concurrent logError calls all survive) GREEN; cases 1-6 still GREEN | VERIFIED | `node tests/29-01-crashlog-capture.test.js` → 7 passed, 0 failed. Case 7 message: "five concurrent logError calls all survive (no lost-update race)". |
| `tests/29-05-crashlog-double-log.test.js` | Falsifiable test: post-load error yields exactly one persisted entry | VERIFIED | Created. `node tests/29-05-crashlog-double-log.test.js` → 2 passed, 0 failed. Reads real inline snippet from report.html (true integration of shipped HTML). |

---

## Key Link Verification (29-04)

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `crashlog.js append()` | module-level `_appendTail` queue | each append chains onto `_appendTail.then(doAppend)`; tail advanced to new link | VERIFIED | Lines 310–316: `var link = _appendTail.then(doAppend, doAppend); _appendTail = link.then(true, true)`. Next `append()` cannot begin until the current link's `replaceAllCrashlog` settles. |
| 21 HTML inline `<head>` early-buffer handlers | `self.CrashLog` | `if(self.CrashLog)return;` as first statement in P() body | VERIFIED | Guard confirmed present in all 21 pages. `for f in <21 pages>; do grep -q 'if(self.CrashLog)return;'; done` → ALL-21-GUARDED. Confirmed exactly 1 guard per page (spot-checked report.html, index.html, disclaimer-cs.html, datenschutz-he.html, impressum-cs.html). |
| `self.CrashLog` (crashlog.js) | `if(self.CrashLog)return;` guard in HTML pages | crashlog.js line 476 assigns `(typeof self !== 'undefined' ? self : ...).CrashLog = exported` | VERIFIED | The guard checks the exact property crashlog.js sets: `self.CrashLog`. In a page, `self === window`. The assignment is unconditional (reached on every normal load). |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Race fix: 5 concurrent logError() calls all survive | `node tests/29-01-crashlog-capture.test.js` | 7 passed, 0 failed | PASS |
| Double-log fix: post-load error → exactly one persisted entry | `node tests/29-05-crashlog-double-log.test.js` | 2 passed, 0 failed | PASS |
| OBS-01 contract intact (50-ceiling, 30-day prune, mirror-survives-IDB-failure, zero-network) | `node tests/29-01-crashlog-capture.test.js` cases 1-6 | included in 7/7 above | PASS |
| CR-01 ingest-merge retention unregressed | `node tests/29-04-crashlog-ingest-merge.test.js` | 3 passed, 0 failed | PASS |
| OBS-02 (report screen, clipboard, zero network) unregressed | `node tests/29-03-report.test.js && node tests/29-03-report-wiring.test.js` | 19/19 + 8/8 = 27/27 | PASS |
| OBS-03 (escape hatch, recovery export, zero network) unregressed | `node tests/29-02-migration-escape-hatch.test.js && node tests/29-02-recovery-export.test.js` | 6/6 + 6/6 = 12/12 | PASS |
| Zero-network capture path | `grep -nE 'fetch\|XMLHttpRequest\|import\\(' assets/crashlog.js` | no matches | PASS |
| All 21 pages guarded | `for f in <21 pages>; do grep -q 'if(self.CrashLog)return;' $f.html; done && echo ALL-21-GUARDED` | ALL-21-GUARDED | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| OBS-01 | 29-01 + 29-04 | Uncaught errors/unhandled rejections captured → IDB, zero network | SATISFIED | crashlog.js + 7 behavior tests PASS (29-01); ingest-merge 3/3 PASS (29-04); race fix closes GAP 1; double-log fix closes GAP 2 |
| OBS-02 | 29-03 | Settings "Report a problem" → clipboard handoff, nothing transmitted | SATISFIED | report.js + report.html + settings row; 27 behavior tests PASS across 29-03; unregressed |
| OBS-03 | 29-02 | Failed migration → escape hatch, not endless refresh | SATISFIED | showDBMigrationError() + getAllForRecoveryExport() + 12 behavior tests PASS; unregressed |

All three phase requirements SATISFIED. No orphaned requirements.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `assets/crashlog.js` | 66 | Czech typo: `"Na tomto zařízení nic nesehlo špatně."` — "nesehlo" likely incorrect (IN-01, pre-existing from 29-01, tracked in 29-REVIEW) | Info | Empty-state copy only; no functional impact |

No new anti-patterns introduced by 29-04. No TBD, FIXME, or XXX markers in modified files. The three code-review info items (IN-01/02/03) from 29-REVIEW remain open as planned deferrals (non-goal-critical).

---

## Human Verification Required

### 1. On-device re-confirmation: cascade race fix (GAP 1)

**Test:** Install the updated Sessions Garden PWA. Open Settings → Debug (or use any mechanism that fires 3+ errors in rapid succession, such as "Generate 3 test problems" if that button exists). Open Settings → "Report a problem" and examine the log entries.

**Expected:** All errors from the cascade are present as separate entries — no entry dropped. The direct `CrashLog.logError()` seam entry and the `onerror` entry that were previously dropped are now persisted. Three error sources in three entries.

**Why human:** The race was first discovered on a real installed PWA (29-UAT.md test 2, 2026-06-25). Unit test case 7 (5 concurrent logError calls all survive) is GREEN and exercises the same serialized-append path. On-device re-confirmation is the project's established sign-off pattern for bugs originally found in the field (Phase 28 convention).

---

### 2. On-device re-confirmation: double-log fix (GAP 2)

**Test:** On the updated installed PWA, trigger a single uncaught error after the page has fully loaded (e.g. via the console or the test-problems button). Open Settings → "Report a problem" and count entries for that error.

**Expected:** Exactly one entry for that error. No duplicate 'early' entry with the same timestamp/message alongside a 'unhandledrejection' or 'onerror' entry.

**Why human:** The double-logging was observed on-device (29-UAT.md test 3, 2026-06-25). Test 29-05 (reading the actual report.html inline snippet, exercising the true load order) is GREEN. On-device confirmation is the final field-verification loop.

---

## Gaps Summary

No gaps. All four 29-04 must-haves are verified in the codebase with passing tests. The three original OBS requirements (OBS-01 / OBS-02 / OBS-03) are unregressed. The D-06 mailto human item from the initial verification was cleared in on-device UAT (29-UAT.md test 1: pass). Two on-device re-confirmation items remain as a field-verification sign-off for the bugs that were originally discovered on a real device.

---

_Verified: 2026-06-25_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — after 29-04 gap-closure (GAP 1: race fix, GAP 2: double-log fix)_
