---
status: diagnosed
phase: 29-reliability-observability
source: [29-VERIFICATION.md, 29-01-SUMMARY.md, 29-03-SUMMARY.md]
started: 2026-06-23T12:00:00Z
updated: 2026-06-25T17:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. D-06 mailto reliability on installed PWA (on-device)
expected: Native mail client opens with recipient contact@sessionsgarden.app, pre-filled subject, and a short "paste below this line" body (full log NOT in the mailto). Degradation path degradeToVisibleAddress() is the fallback if mailto fails.
result: pass

### 2. Crash log captures every error in a cascade (multiple errors in the same tick)
expected: When several errors occur in quick succession (a real crash cascade), all of them are persisted — including direct CrashLog.logError() seam calls (the seam Phase 28's integrity self-check uses).
result: issue
reported: "On-device (installed PWA, 2026-06-25): one 'Generate 3 test problems' tap fired 3 distinct sources (direct logError, unhandled rejection, uncaught error); the direct logError() seam entry and the onerror entry were dropped every time — only the rejection survived. Reproduced deterministically in a unit test: 5 concurrent logError calls, only 1 survives."
severity: major

### 3. Each error is logged once (no early-buffer double-count after module load)
expected: An error thrown AFTER crashlog.js has loaded is captured once, not twice. The inline <head> early-buffer handler is only meant to catch errors thrown BEFORE the module loads.
result: issue
reported: "On-device (2026-06-25): the same unhandled rejection appeared twice — once as source 'early' (entry [3]) and once as 'unhandledrejection' (entry [4]), identical timestamp/message/url."
severity: minor

## Summary

total: 3
passed: 1
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "The crash log captures every error in a cascade — multiple errors in the same tick are all persisted, including direct CrashLog.logError() seam calls."
  status: failed
  reason: "User reported (on-device installed PWA, 2026-06-25): a 'Generate 3 test problems' tap fired 3 distinct sources; the direct logError() seam entry and the crashlog onerror entry were dropped every time — only the rejection survived. Reproduced deterministically: tests/29-01-crashlog-capture.test.js case 7 — 5 concurrent logError calls, only 1/5 survives."
  severity: major
  test: 2
  root_cause: "Lost-update race in crashlog.js append(): each append does an async getEntries() read-all, then db.replaceAllCrashlog() FULL REPLACE (clear + re-add the whole set). Concurrent appends each read the pre-write set and clobber one another — last writer wins. The read-modify-write cycle is not serialized or atomic across calls."
  artifacts:
    - path: "assets/crashlog.js"
      issue: "append() (~L259-284): read-modify-write via getEntries()→replaceAllCrashlog() is non-atomic across concurrent calls; no append queue / serialization."
    - path: "tests/29-01-crashlog-capture.test.js"
      issue: "case 7 (added 2026-06-25 by verify-work) reproduces the race — currently RED (1/5 survive). Make it GREEN."
  missing:
    - "Serialize appends (a module-level tail-promise queue) so each append's read-modify-write sees the previous append's committed result. Make tests/29-01 case 7 GREEN without regressing cases 1-6 (especially the 50-count ceiling and 30-day prune)."
  debug_session: ""

- truth: "Each error is logged once — an error thrown AFTER crashlog.js loads is not double-counted by both the inline early-buffer handler and the full module."
  status: failed
  reason: "User reported (on-device 2026-06-25): the same unhandled rejection appeared twice — source 'early' (entry [3]) and 'unhandledrejection' (entry [4]), identical timestamp/message/url. The inline <head> early handler stays installed after crashlog.js loads and keeps writing source:'early'; the content-key dedupe includes 'source' so the two are not collapsed."
  severity: minor
  test: 3
  root_cause: "The early-buffer inline handler (present in all 20 SW-registered pages) is never neutralized once the full crashlog.js module loads, so post-load errors are captured twice (once as 'early', once as the real source). entryKey() includes 'source', so dedupe() keeps both. Inflates counts and consumes the 50-entry retention budget ~2x faster."
  artifacts:
    - path: "report.html + 19 other SW-registered pages"
      issue: "inline <head> early handler P() has no guard to defer once window.CrashLog exists."
    - path: "assets/crashlog.js"
      issue: "installHandlers() chains the prior (inline) onerror, so an uncaught error is logged by both the inline handler and the module."
  missing:
    - "Guard the inline early handler to no-op once the full module is present (e.g. `if (self.CrashLog) return;` inside P), and/or stop crashlog.js chaining the inline onerror. Ensure a post-load error yields exactly one persisted entry."
  debug_session: ""
