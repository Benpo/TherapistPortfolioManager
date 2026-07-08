---
phase: 41-replayable-guided-tour
plan: 06
subsystem: pwa-offline
tags: [tour, precache, service-worker, offline, page-shell]
status: complete
requires: ["41-02", "41-04"]
provides:
  - "window.Tour engine loaded on all 8 app-chrome pages"
  - "tour.js + tour.css precached for offline (installed PWA)"
affects:
  - index.html
  - add-client.html
  - add-session.html
  - sessions.html
  - reporting.html
  - report.html
  - settings.html
  - help.html
  - sw.js
tech_stack:
  added: []
  patterns:
    - "Static asset precache no-drift guard (fs source-scan; Phase 40 40-precache idiom)"
    - "PRECACHE_URLS-only edit; CACHE_NAME auto-rolls from INTEGRITY_TOKEN (no manual bump)"
key_files:
  created:
    - tests/41-precache.test.js
  modified:
    - index.html
    - add-client.html
    - add-session.html
    - sessions.html
    - reporting.html
    - report.html
    - settings.html
    - help.html
    - sw.js
decisions:
  - "tour.css added after app.css on 7 pages, after help.css on help.html (additive alongside existing help.css)"
  - "tour.js <script> placed immediately after ./assets/app.js on all 8 pages (window.App + initCommon Tour.resume dependency)"
  - "demo.html excluded from the tour (D-16); precache test asserts the exclusion"
metrics:
  duration: 9min
  completed: 2026-07-08
  tasks: 2
  files: 10
---

# Phase 41 Plan 06: Ship Tour Engine to Production Offline Summary

Shipped the bespoke guided-tour engine (`assets/tour.js` + `assets/tour.css`) to production on all eight app-chrome pages and into the service-worker precache, guarded by a RED-first 8-page no-drift precache test — so the tour works fully offline on an installed PWA and no launch surface is ever dead UI.

## What Was Built

- **`tests/41-precache.test.js` (new, RED-first)** — mirrors the Phase 40 `40-precache.test.js` fs-scan idiom. Asserts (1) both `/assets/tour.js` and `/assets/tour.css` are in `sw.js` PRECACHE_URLS; (2) each of the eight `CHROME_PAGES` references `./assets/tour.js` as a `<script>` and `./assets/tour.css` as a `<link>` at the same paths (no drift); (3) `demo.html` references neither (D-16). Authored RED (exited 1, 18 failing checks) before the tags landed, then flipped GREEN after Task 2.
- **8 page shells** — `<link rel="stylesheet" href="./assets/tour.css" />` added in `<head>` (after `app.css` on the 7 standard pages, after the existing `help.css` on `help.html`), and `<script src="./assets/tour.js"></script>` added immediately after the `./assets/app.js` script on index, add-client, add-session, sessions, reporting, report, settings, help.
- **`sw.js`** — `/assets/tour.js` + `/assets/tour.css` appended to PRECACHE_URLS next to the Phase 39 help block, with a comment documenting the A1/Pitfall-7 rationale.

## Key Implementation Details

- **Load order preserved (key_link):** verified `tour.js` line > `app.js` line on all 8 pages — the engine depends on `window.App.lockBodyScroll` and the `initCommon` `Tour.resume()` call, both of which require `window.App` to be defined first.
- **A1 rationale honored:** the eight pages are exactly those that load `app.js` + `attention-coordinator.js`, i.e. every page a launch surface renders on (welcome CTA, '?' 'Take the tour' row, reminder Start). Loading the engine everywhere means `window.Tour` is present wherever a launch can fire; anchors themselves remain on the 4 step-pages (Plan 02, unchanged).
- **No manual cache bump:** CACHE_NAME derives from the deploy-stamped `INTEGRITY_TOKEN`, so the PRECACHE_URLS edit alone ships the offline entry — no `chore` cache-bump commit needed (repo gotcha noted in the plan).

## Verification

- `node tests/41-precache.test.js` → exit 0 (20/20 PASS, was RED 18-fail before Task 2)
- `node tests/run-all.js` → **152 passed, 0 failed, 152 total**
- Ordering check: `app.js` line < `tour.js` line on all 8 pages (all OK)
- Grep acceptance: each of the 8 pages has exactly 1 `tour.js` + 1 `tour.css`; `demo.html` has 0; `sw.js` has 1 each
- Real offline availability is confirmed in Plan 07's UAT (installed PWA, offline navigation) — out of scope for this shape guard

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `tests/41-precache.test.js` — FOUND
- Commit `112eef3` (RED test) — FOUND
- Commit `5d9b04a` (tags + precache) — FOUND
- All 8 page shells + `sw.js` modified and committed — FOUND
