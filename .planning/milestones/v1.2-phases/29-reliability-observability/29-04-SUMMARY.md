---
phase: 29-reliability-observability
plan: 04
subsystem: testing
tags: [crashlog, indexeddb, localstorage, observability, race-condition, tdd, zero-npm]

# Dependency graph
requires:
  - phase: 29-reliability-observability (29-01)
    provides: OBS-01 crash-log capture module (dual-store append, prune-on-write, CrashLog seam) + the zero-npm in-memory IDB shim test harness
  - phase: 29-reliability-observability (29-04 CR-01)
    provides: ingestEarlyBuffer merge contract (tests/29-04-crashlog-ingest-merge.test.js)
provides:
  - Serialized crashlog append() (module-level tail-promise queue) that closes the lost-update race in error cascades
  - Inline early-buffer P() neutralization post-load across all 21 SW-registered HTML pages (single-log guarantee)
  - tests/29-05-crashlog-double-log.test.js — falsifiable post-load double-log behavior test
affects: [reliability, observability, OBS-01, report-screen, phase-28-integrity-check]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level tail-promise queue serializes a racy async read-modify-write (read-all -> full-replace) without timers or globals — same single-flight shape as db.js _seedingPromise"
    - "Inline <head> early-buffer handler self-disables once the full module is present via `if(self.CrashLog)return;` guard, keeping pre-load buffering while eliminating post-load double-writes"
    - "Behavior test reads the REAL inline snippet from report.html so RED->GREEN flips purely from the HTML edit (true page-load-order integration test)"

key-files:
  created:
    - tests/29-05-crashlog-double-log.test.js
  modified:
    - assets/crashlog.js
    - index.html, add-session.html, add-client.html, sessions.html, reporting.html, settings.html, report.html, license.html, demo.html, disclaimer.html (+3 langs), impressum.html (+3 langs), datenschutz.html (+3 langs)

key-decisions:
  - "Serialize append() behind a module-level _appendTail promise; each link settles to a boolean (never rejects) so a failure cannot wedge the queue"
  - "Neutralize the inline P() with `if(self.CrashLog)return;` rather than touching crashlog.js installHandlers() chaining — the chained onerror calls the now-guarded P() which no-ops, preserving the never-drop-another-handler contract"
  - "29-05 reads the canonical inline snippet from report.html so the test reflects shipped HTML and transitions RED->GREEN from the Task 3 edit alone"

patterns-established:
  - "Tail-promise serialization for racy dual-store appends"
  - "self.CrashLog presence-guard to retire an inline bootstrap handler once its full module loads"

requirements-completed: [OBS-01]

coverage:
  - id: D1
    description: "Five concurrent CrashLog.logError() calls all persist — the lost-update race in append() is closed"
    requirement: OBS-01
    verification:
      - kind: unit
        ref: "tests/29-01-crashlog-capture.test.js#7. five concurrent logError calls all survive (no lost-update race)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A single post-load error/rejection yields exactly ONE persisted entry at its real source (not early+real duplicate)"
    requirement: OBS-01
    verification:
      - kind: integration
        ref: "tests/29-05-crashlog-double-log.test.js#A. a single post-load uncaught error yields exactly ONE persisted entry"
        status: pass
      - kind: integration
        ref: "tests/29-05-crashlog-double-log.test.js#B. a single post-load unhandledrejection yields exactly ONE persisted entry"
        status: pass
    human_judgment: false
  - id: D3
    description: "OBS-01 contract intact: 50-entry ceiling, 30-day prune, mirror-survives-IDB-failure, zero network, and the CR-01 ingest-merge retention contract"
    requirement: OBS-01
    verification:
      - kind: unit
        ref: "tests/29-01-crashlog-capture.test.js (cases 1-6) — 7 passed, 0 failed"
        status: pass
      - kind: unit
        ref: "tests/29-04-crashlog-ingest-merge.test.js — 3 passed, 0 failed"
        status: pass
      - kind: other
        ref: "grep -nE 'fetch|XMLHttpRequest|import\\(' assets/crashlog.js — no matches"
        status: pass
    human_judgment: false
  - id: D4
    description: "All 21 SW-registered HTML pages carry the byte-identical `if(self.CrashLog)return;` guard in the inline P()"
    requirement: OBS-01
    verification:
      - kind: other
        ref: "for f in <21 pages>; do grep -q 'if(self.CrashLog)return;' $f.html; done -> ALL-21-GUARDED; guarded P() md5 identical (aff4a4a4...) across all 21, count=1 each"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-06-25
status: complete
---

# Phase 29 Plan 04: Crash-Log Gap Closure Summary

**Serialized crashlog append() behind a tail-promise queue (closes the cascade lost-update race) and neutralized the inline early-buffer P() post-load across 21 pages (eliminates post-load double-logging) — both UAT-diagnosed OBS-01 gaps closed.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-25T18:41:50Z
- **Completed:** 2026-06-25T18:46:35Z
- **Tasks:** 3
- **Files modified:** 23 (assets/crashlog.js + 21 HTML pages + 1 new test)

## Accomplishments
- **GAP 1 (the race):** `append()` now serializes its read-modify-write behind a module-level `_appendTail` promise so each append's `getEntries()` sees the prior append's committed `replaceAllCrashlog` write. Five concurrent `logError()` calls now all persist (case 7 was 1/5, now 5/5). The link settles to a boolean and never rejects, so a failure can't wedge the queue.
- **GAP 2 (double-log):** Inserted `if(self.CrashLog)return;` as the first statement of the inline `P(m,s,u)` body on all 21 SW-registered pages. Once `crashlog.js` assigns `self.CrashLog`, the inline path (including the chained onerror) no-ops, so a post-load error is logged exactly once at its real source. Pre-load buffering is untouched.
- **New falsifiable test** `tests/29-05-crashlog-double-log.test.js`: reads the real inline snippet from report.html and runs it in true page-load order, asserting exactly one persisted entry per post-load error/rejection.

## Task Commits

Each task was committed atomically:

1. **Task 1: Serialize append() with a tail-promise queue (GAP 1, GREEN)** - `8409513` (fix)
2. **Task 2: Falsifiable post-load double-log test (GAP 2, RED)** - `490f8d9` (test)
3. **Task 3: Neutralize inline P() across 21 pages (GAP 2, GREEN)** - `bfa2c5e` (fix)

_Task 1 was GREEN-only: its RED gate (case 7) was already committed in a prior session._

## Files Created/Modified
- `assets/crashlog.js` - Added module-level `_appendTail` queue; split append into `append()` (normalize + chain) and `doAppend()` (read-modify-write). No change to prune/MIRROR_DEPTH/entryKey/dedupe/replaceAllCrashlog/IDB-fallback.
- `tests/29-05-crashlog-double-log.test.js` - New zero-npm behavior test (reuses 29-01 IDB shim + vm sandbox; reads inline snippet from report.html).
- 21 HTML pages (index, add-session, add-client, sessions, reporting, settings, report, license, demo, disclaimer +3 langs, impressum +3 langs, datenschutz +3 langs) - inserted the `if(self.CrashLog)return;` guard in the inline P().

## Decisions Made
- Serialize via a never-rejecting tail-promise (matches db.js `_seedingPromise` single-flight shape) — smallest correct fix, no re-architecture of the dual-store/prune-on-write design.
- Guard the inline P() rather than alter `installHandlers()` chaining: the chained onerror calls the now-guarded P() which no-ops, so the never-drop-another-consumer's-handler contract stays intact while the double-write is eliminated.
- 29-05 reads the actual report.html snippet so RED->GREEN flips purely from the Task 3 HTML edit (a true integration test of shipped behavior, not a hand-replicated stand-in).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `assets/crashlog.js` is classified by git/grep/`file` as binary "data" (pre-existing, caused by the embedded Hebrew/Czech UTF-8 CRASHLOG_STRINGS). This makes `git show --stat` report "0 insertions/0 deletions (Bin)". Verified the changes are committed correctly via `git show HEAD:assets/crashlog.js | grep -a -c '_appendTail'` (3 matches). No functional impact — node executes the file and all tests pass.

## User Setup Required
None - no external service configuration required.

## Verification Results
- `node tests/29-01-crashlog-capture.test.js` -> **7 passed, 0 failed** (case 7 race closed; cases 1-6 unregressed)
- `node tests/29-05-crashlog-double-log.test.js` -> **2 passed, 0 failed** (post-load error/rejection each yield exactly one real-source entry)
- `node tests/29-04-crashlog-ingest-merge.test.js` -> **3 passed, 0 failed** (CR-01 retention contract unregressed)
- All 21 pages contain `if(self.CrashLog)return;` (guarded P() md5 identical across all 21, count=1 each)
- `grep -nE 'fetch|XMLHttpRequest|import\(' assets/crashlog.js` -> no matches (zero-network capture path intact)

## Next Phase Readiness
- Both OBS-01 UAT gaps closed; crash-log capture is cascade-safe and single-logging. Ready for the OBS-01 re-verification / UAT pass.
- sw.js CACHE_NAME untouched (HTML-only edits; cache name auto-derives from the version token). A version/cache bump decision belongs to the phase/milestone close, not this gap-closure plan.

## Self-Check: PASSED

- tests/29-05-crashlog-double-log.test.js — FOUND
- assets/crashlog.js — FOUND
- 29-04-SUMMARY.md — FOUND
- Commits 8409513, 490f8d9, bfa2c5e — all FOUND in git log

---
*Phase: 29-reliability-observability*
*Completed: 2026-06-25*
