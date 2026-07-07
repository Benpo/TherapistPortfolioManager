---
phase: 29-reliability-observability
plan: 01
subsystem: observability
tags: [crash-log, indexeddb, localstorage, error-capture, zero-network, pwa, service-worker, i18n]

# Dependency graph
requires:
  - phase: 28-update-reliability-versioning
    provides: "version.js IIFE-global early-load precedent + the integrity self-check that will call CrashLog.logError (28-CONTEXT D-12)"
provides:
  - "assets/crashlog.js — OBS-01 capture module: window.onerror + unhandledrejection handlers, dual IDB+localStorage persistence, prune-on-write retention, CrashLog.logError/getEntries/clear seam"
  - "db.js v6 `crashlog` object store + addCrashlog/getAllCrashlog/clearCrashlog/replaceAllCrashlog accessors"
  - "Early inline head buffer (crashlogBuffer localStorage mirror) wired onto all 20 SW-registered pages"
  - "CRASHLOG_STRINGS + clStr — 4-language (EN/HE/DE/CS) pre-i18n strings for the Wave 2 report screen"
affects: [29-02 report screen (OBS-02), 29-03 reset-recover hatch (OBS-03), phase-28 integrity-mismatch logging seam]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-store crash persistence (IDB primary + localStorage mirror that bypasses openDB so it survives an IDB-open failure)"
    - "Prune-on-write retention (≤30 days AND ≤50 entries, pure filter+slice, no timer)"
    - "Early inline <head> error buffer + later full-module ingest (captures errors thrown before the module loads)"
    - "Never-throwing guard-wrapped capture (logger can never crash the page it observes)"

key-files:
  created:
    - assets/crashlog.js
    - tests/29-01-crashlog-capture.test.js
  modified:
    - assets/db.js
    - sw.js
    - "20 SW-registered HTML pages (index, add-session, add-client, sessions, reporting, settings, license, disclaimer±lang, impressum±lang, datenschutz±lang, demo)"

key-decisions:
  - "Followed the project's zero-npm test convention (handwritten in-memory IDB shim + vm sandbox) instead of the plan's suggested jsdom + fake-indexeddb, which would have violated the zero-dependency constraint"
  - "Added replaceAllCrashlog (clear+bulk-add in one tx) so the ≤50/≤30-day ceiling is enforced atomically on every append"
  - "Precached /assets/crashlog.js in sw.js so the capture module loads offline in the installed PWA"

patterns-established:
  - "Dual-store crash log: localStorage mirror is written DIRECTLY (never via openDB) so an IDB failure is still captured and reportable"
  - "Stable CrashLog.logError(entry) seam consumed by the Phase 28 integrity check and the Wave 2 report screen; always async-safe, never throws"

requirements-completed: [OBS-01]

# Metrics
duration: 22min
completed: 2026-06-23
status: complete
---

# Phase 29 Plan 01: Crash-Log Capture Foundation (OBS-01) Summary

**Zero-network crash-log capture module: global error + unhandled-rejection handlers persist bounded entries to an IndexedDB `crashlog` store (db.js v6) with a localStorage mirror that survives IDB failure, prune-on-write retention (≤30 days / ≤50 entries), and a stable `CrashLog.logError()` seam wired onto all 20 app pages.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-06-23T10:00:00Z (approx)
- **Completed:** 2026-06-23
- **Tasks:** 2 (Task 1 was TDD: RED → GREEN)
- **Files modified:** 23 (2 created, 21 modified)

## Accomplishments
- `assets/crashlog.js`: IIFE-global `CrashLog` (window/self/globalThis triple) that installs `window.onerror` (chaining any prior handler) and `unhandledrejection`, each fully guarded so the logger can never itself crash a page.
- Dual storage (D-02): IndexedDB `crashlog` primary log + a `crashlogBuffer` localStorage mirror written directly (never through `openDB()`), so an IDB-open/migration failure is still captured — closing the IDB paradox OBS-03 depends on.
- Prune-on-write (D-03): every append drops entries older than 30 days and trims to the 50 most-recent — bounded by construction (T-29-03 DoS mitigated).
- Stable `CrashLog.logError/getEntries/clear` seam exported for the Phase 28 integrity self-check (28-CONTEXT D-12) and the Wave 2 report screen; `CRASHLOG_STRINGS`+`clStr` give 4-language pre-i18n strings.
- db.js bumped to v6 with an additive `crashlog` store + accessors; the new asset wired (with an early inline buffer) onto all 20 SW-registered pages and precached in sw.js.
- Zero network across the entire capture path (crashlog.js + inline handler) — T-29-02 mitigated by grep + a runtime spy that traps `fetch`/`XMLHttpRequest`.

## Task Commits

1. **Task 1 (RED): failing behavior test** - `5753b63` (test)
2. **Task 1 (GREEN): capture module + db.js v6 store** - `a7bc974` (feat)
3. **Task 2: early head buffer + wire 20 pages + sw precache** - `accf8a9` (feat)

_TDD task 1 produced a RED then a GREEN commit._

## Files Created/Modified
- `assets/crashlog.js` (created) - OBS-01 capture module: handlers, dual store, retention prune, logError/getEntries/clear, 4-language strings, early-buffer ingest.
- `tests/29-01-crashlog-capture.test.js` (created) - 6 falsifiable behavior cases (onerror/rejection persistence, 50-ceiling, 30-day prune, mirror-survives-IDB-failure, zero-network).
- `assets/db.js` (modified) - DB_VERSION 5→6, additive MIGRATIONS[6] `crashlog` store, addCrashlog/getAllCrashlog/clearCrashlog/replaceAllCrashlog accessors, crashlog added to clearAll.
- `sw.js` (modified) - precache `/assets/crashlog.js`.
- 20 HTML pages (modified) - early inline head buffer + `<script src="./assets/crashlog.js">` after version.js.

## Decisions Made
- **Test framework:** Used the repo's established zero-npm pattern (handwritten in-memory IDB shim + `vm` sandbox, run via `node tests/...`) rather than the plan's suggested `jsdom + fake-indexeddb`. The plan's suggestion would have introduced npm dependencies, violating the project's hard zero-dependency / zero-build constraint. Behavior coverage is identical (every case asserts an observable effect, not a symbol's presence).
- **`replaceAllCrashlog`:** Added a clear+bulk-add-in-one-transaction accessor so the prune-then-persist step enforces the retention ceiling atomically; the logger owns the prune policy, db.js stays a thin storage primitive.
- **sw.js precache:** Added crashlog.js to PRECACHE_URLS so the installed offline PWA does not 404 on the new app-critical script.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test convention conflict (jsdom/fake-indexeddb → handwritten shim)**
- **Found during:** Task 1 (RED test authoring)
- **Issue:** The plan's `<automated>` block specified `jsdom + fake-indexeddb`, but the project has no package.json, no node_modules, and a hard zero-npm constraint. Those deps are not installable here and would violate the constraint.
- **Fix:** Wrote the behavior test using the project's existing handwritten in-memory IDB shim + `vm` sandbox pattern (as in tests/24-04 and tests/28-04). All 6 required assertions are preserved.
- **Files modified:** tests/29-01-crashlog-capture.test.js
- **Verification:** Test FAILS before crashlog.js exists (RED), PASSES after (GREEN, 6/6).
- **Committed in:** 5753b63 (RED) / a7bc974 (GREEN)

**2. [Rule 2 - Missing Critical] Precache crashlog.js in sw.js**
- **Found during:** Task 2 (page wiring)
- **Issue:** crashlog.js loads on all 20 SW-registered pages but was not in PRECACHE_URLS — an offline installed PWA would 404 on it and the capture module would never load, defeating OBS-01 exactly when diagnostics matter most.
- **Fix:** Added `/assets/crashlog.js` to PRECACHE_URLS right after version.js.
- **Files modified:** sw.js
- **Verification:** sw-precache-cache-reload.test.js still passes; CACHE_NAME auto-derives from the version token (no manual bump needed).
- **Committed in:** accf8a9 (Task 2 commit)

**3. [Rule 1 - Bug] Test IDB shim missing openCursor**
- **Found during:** Task 1 (GREEN, case 3 returned 5 instead of 50)
- **Issue:** The full v0→v6 upgrade path runs migrations 2 & 3 which call `clientStore.openCursor()`; the trimmed test shim lacked it, so the upgrade aborted, the crashlog store was never created, and IDB writes silently no-op'd (getEntries fell back to the 5-entry mirror).
- **Fix:** Added a no-op-capable `openCursor` to the test shim's store facade (empty demo stores resolve null immediately).
- **Files modified:** tests/29-01-crashlog-capture.test.js
- **Verification:** All 6 cases pass; 24-04 migration test still green.
- **Committed in:** a7bc974 (Task 1 GREEN commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 1 missing-critical, 1 bug)
**Impact on plan:** All three were necessary for correctness/offline-operation/test-fidelity within the project's hard constraints. No scope creep — the module's behavior matches the plan's must_haves exactly.

## Issues Encountered
- Plan `read_first` line numbers for db.js had drifted (file evolved since planning); resolved by reading the current file structure directly. No functional impact.

## Threat Flags
None — no new security surface beyond what the threat_model anticipated. T-29-02 (zero-network) and T-29-03 (bounded retention) are mitigated and tested; T-29-04 (never-throwing logger) is enforced by guard-wrapping.

## Known Stubs
None — the module is fully wired. `CRASHLOG_STRINGS` intentionally carries only the empty-state heading/body for now; the Wave 2 report screen (29-02) will add its own report-screen labels, as the plan permits.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- **OBS-02 (29-02 report screen):** `CrashLog.getEntries()` returns merged most-recent-first entries; `clStr`/`CRASHLOG_STRINGS` provide the empty-state copy. Ready to consume.
- **OBS-03 (29-03 reset & recover):** the localStorage mirror guarantees a reportable log even when IDB is the failing component — the escape hatch can rely on it.
- **Phase 28 seam:** `CrashLog.logError(entry)` is the stable entry point for the integrity-mismatch persistence (28-CONTEXT D-12); Wave 2 wires the version.js nudge stub to it.

## Self-Check: PASSED

---
*Phase: 29-reliability-observability*
*Completed: 2026-06-23*
