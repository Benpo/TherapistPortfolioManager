---
phase: 40-first-run-welcome-onboarding-coordinator
plan: 05
subsystem: ui
tags: [pwa, service-worker, onboarding, attention-coordinator, ios-banner, precache]

# Dependency graph
requires:
  - phase: 40-first-run-welcome-onboarding-coordinator (Plan 02)
    provides: assets/attention-coordinator.js (the AttentionCoordinator the pages now load)
provides:
  - Coordinator <script> loaded before app.js on all 8 app pages (index, add-client, add-session, report, reporting, sessions, settings, help)
  - Legacy hardcoded-English iOS install banner IIFE removed from index.html (D-15)
  - '/assets/attention-coordinator.js' added to sw.js PRECACHE_URLS so the installed PWA runs it offline (ONBD-03)
  - Two static regression gates (banner removed + coordinator precached)
affects: [onboarding, coordinator run() wiring in app.js, phase-40 UAT offline check]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Script-order discipline: coordinator loaded before app.js on every page that boots initCommon (Pitfall 7)"
    - "Zero-dependency fs source-scan static gates mirroring tests/39-help-precache.test.js"
    - "CACHE_NAME auto-rolls via AppVersion.INTEGRITY_TOKEN — precache additions need no manual cache bump"

key-files:
  created:
    - tests/40-ios-banner-removed.test.js
    - tests/40-precache.test.js
  modified:
    - index.html
    - add-client.html
    - add-session.html
    - report.html
    - reporting.html
    - sessions.html
    - settings.html
    - help.html
    - sw.js

key-decisions:
  - "Deleted the whole ios-install-banner IIFE from index.html (no styling carried forward) — D-15"
  - "demo.html deliberately NOT given the coordinator (disabled in demo mode, D-09)"
  - "Did NOT hand-edit CACHE_NAME: it derives from INTEGRITY_TOKEN so the next deploy auto-rolls the cache (Pitfall 6)"

patterns-established:
  - "Pattern 1: new page-boot asset → precache it AND load it before app.js on all initCommon pages, guard demo.html out"
  - "Pattern 2: banner/emoji removal pinned by an fs static gate asserting absence of both the element id and the U+1F4E4 code point (literal + \\u{...} escape)"

requirements-completed: [ONBD-03, ONBD-04]

coverage:
  - id: D1
    description: "Attention coordinator loaded before app.js on all 8 app pages; demo.html excluded"
    requirement: "ONBD-03"
    verification:
      - kind: unit
        ref: "tests/40-precache.test.js#<page> references './assets/attention-coordinator.js' (8 pages) + demo.html does NOT reference"
        status: pass
    human_judgment: false
  - id: D2
    description: "Legacy hardcoded-English iOS install banner IIFE removed from index.html"
    requirement: "ONBD-04"
    verification:
      - kind: unit
        ref: "tests/40-ios-banner-removed.test.js#no 'ios-install-banner' id, no U+1F4E4 emoji, coordinator reference present"
        status: pass
    human_judgment: false
  - id: D3
    description: "Coordinator precached in sw.js PRECACHE_URLS so the installed PWA runs it offline"
    requirement: "ONBD-03"
    verification:
      - kind: unit
        ref: "tests/40-precache.test.js#PRECACHE_URLS contains '/assets/attention-coordinator.js'"
        status: pass
    human_judgment: false
  - id: D4
    description: "Real offline-navigation on an installed PWA runs the coordinator (field verification)"
    verification: []
    human_judgment: true
    rationale: "Service-worker + offline navigation (esp. WebKit stale-SW, Pitfall 2) cannot be exercised by the zero-dependency vm/jsdom harness; mirror the Phase 39 installed-PWA offline check at phase UAT."

# Metrics
duration: ~15min
completed: 2026-07-08
status: complete
---

# Phase 40 Plan 05: Coordinator Page Wiring, iOS Banner Removal & Precache Summary

**Wired assets/attention-coordinator.js before app.js on all 8 app pages, deleted the legacy hardcoded-English iOS install banner from index.html, and precached the coordinator so the installed PWA runs it offline — all pinned by two zero-dependency static gates.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-08T12:40:47+02:00
- **Completed:** 2026-07-08T12:43:21+02:00
- **Tasks:** 3
- **Files modified:** 9 (2 created, 9 edited HTML+sw.js)

## Accomplishments
- Coordinator `<script>` inserted immediately before `app.js` on index, add-client, add-session, report, reporting, sessions, settings, help — ordering verified per page (coord line < app.js line) to satisfy Pitfall 7.
- Deleted the entire `ios-install-banner` IIFE (UA-sniff, accent-fill, 📤 emoji, hardcoded English) from index.html with no orphan markup (D-15); demo.html left untouched (D-09).
- Added `/assets/attention-coordinator.js` to `PRECACHE_URLS` in sw.js adjacent to `app.js`; CACHE_NAME left INTEGRITY_TOKEN-derived so a fresh deploy auto-rolls the cache and re-precaches (Pitfall 6, no manual bump).
- Full suite green: 143 passed / 0 failed / 143 total.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author RED static tests (banner removed + coordinator precached)** - `3e88f67` (test)
2. **Task 2: Add coordinator <script> to 8 app pages and delete iOS banner** - `5726884` (feat)
3. **Task 3: Add coordinator to sw.js PRECACHE_URLS** - `77e98bf` (feat)

_TDD flow: Task 1 authored both gates RED (banner + precache both exited non-zero); Task 2 turned the banner gate green; Task 3 turned the precache gate green._

## Files Created/Modified
- `tests/40-ios-banner-removed.test.js` - fs source-scan asserting index.html drops 'ios-install-banner' + U+1F4E4 (literal + `\u{...}` escape) and gains the coordinator reference
- `tests/40-precache.test.js` - fs source-scan asserting `/assets/attention-coordinator.js` in PRECACHE_URLS, present on all 8 app pages, absent from demo.html
- `index.html` - coordinator `<script>` before app.js; iOS banner IIFE deleted
- `add-client.html`, `add-session.html`, `report.html`, `reporting.html`, `sessions.html`, `settings.html`, `help.html` - coordinator `<script>` before app.js
- `sw.js` - `/assets/attention-coordinator.js` added to PRECACHE_URLS (CACHE_NAME unchanged)

## Decisions Made
- Followed plan as specified: full IIFE deletion, demo.html excluded, no CACHE_NAME hand-edit.
- report.html carries the coordinator for precache/uniformity only — it boots report.js's own init(), not initCommon, so the coordinator is inert there until a page calls run() (accepted exclusion, source-verified in the plan objective). No wiring of report.js to the coordinator, by design.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- The Edit tool could not match the banner IIFE block because line contained mixed source escapes (`\u{1F4E4}`, `“`/`”`) that defeated exact-string matching. Resolved by deleting the block via a content-anchored node splice (matched on the "iOS install prompt" comment and the bare `<script>`/`</script>` fences), then verified: 0 `ios-install-banner`, 0 U+1F4E4, coordinator present, clean `</body>`. Not a plan deviation — same intended edit, different mechanism.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Coordinator now loads and precaches on every app page; app.js run() wiring (Plan 04) can drive it in the correct load order.
- Queued for phase UAT: real offline-navigation check on an installed PWA (mirror Phase 39's installed-PWA offline verification) — not automatable in the vm/jsdom harness (D4, human_judgment).

## Self-Check: PASSED
- FOUND: tests/40-ios-banner-removed.test.js
- FOUND: tests/40-precache.test.js
- FOUND commit: 3e88f67
- FOUND commit: 5726884
- FOUND commit: 77e98bf

---
*Phase: 40-first-run-welcome-onboarding-coordinator*
*Completed: 2026-07-08*
