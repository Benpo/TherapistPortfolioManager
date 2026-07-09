---
phase: 42-in-app-changelog-what-s-new
plan: 09
subsystem: offline-pwa-integration
tags: [changelog, whats-new, service-worker, precache, offline, attention-coordinator]
requires: [42-04, 42-05, 42-07]
provides:
  - "changelog-content-en.js + whats-new.js loaded on all 7 chrome-mounting pages"
  - "/changelog page + 4 changelog assets precached for full-offline delivery"
affects:
  - add-client.html
  - add-session.html
  - index.html
  - report.html
  - reporting.html
  - sessions.html
  - settings.html
  - sw.js
tech-stack:
  added: []
  patterns:
    - "two-array precache split (assets → PRECACHE_URLS, page → PRECACHE_HTML) to dodge CF pretty-URL redirect (Pitfall 1)"
    - "data global (CHANGELOG_CONTENT_EN) before popup surface before app.js initCommon so AttentionCoordinator.run finds a registered surface (Pitfall 2)"
key-files:
  created: []
  modified:
    - add-client.html
    - add-session.html
    - index.html
    - report.html
    - reporting.html
    - sessions.html
    - settings.html
    - sw.js
decisions:
  - "Popup CSS is NOT a separate precache entry — it lives in the already-precached app.css (no whats-new.css)"
  - "CACHE_NAME left untouched — auto-rolls from the deploy-stamped INTEGRITY_TOKEN"
metrics:
  duration: ~8min
  completed: 2026-07-09
status: complete
---

# Phase 42 Plan 09: Offline Wiring + Every-Page Popup Surface Summary

Wired the What's-New data source + popup surface onto all 7 chrome-mounting pages (correct load order so the popup can fire on whichever page starts the session) and added the two-array offline precache to `sw.js` — turning `tests/42-precache.test.js` green.

## What Was Built

**Task 1 — 7-page script-chain wiring (commit `6ad67b3`)**
Inserted two script tags — `assets/changelog-content-en.js` then `assets/whats-new.js` — immediately after `attention-coordinator.js` and before `app.js` on all 7 chrome-mounting pages (add-client, add-session, index, report, reporting, sessions, settings). Order guarantees: the data global (`CHANGELOG_CONTENT_EN`) loads before the popup surface registers into `AttentionCoordinator`, and both are present before `app.js` runs `initCommon` (which calls `AttentionCoordinator.run`). A four-line corpus comment documents the load-order contract on each page. `help.html` (plan 10) and `changelog.html` (plan 07) were deliberately NOT touched.

**Task 2 — two-array offline precache (commit `2c554e9`)**
Added the four changelog sub-resource assets (`/assets/changelog-content-en.js`, `/assets/whats-new.js`, `/assets/changelog.js`, `/assets/changelog.css`) to `PRECACHE_URLS`, and the extensionless page route `/changelog` to `PRECACHE_HTML` (mirroring the `/help` precedent). The page was kept OUT of `PRECACHE_URLS` to avoid the CF pretty-URL redirect storing a `redirected:true` response that blanks the page offline (Pitfall 1). Anti-stale `fetch(url, { cache: 'reload' })` guard left intact; `CACHE_NAME` not manually bumped.

## Verification

- `node -e` 7-page order check: **PASS** — all 7 pages contain `changelog-content-en.js` then `whats-new.js`, both after `attention-coordinator.js`.
- `node -c sw.js`: **PASS** (syntax clean).
- `node tests/42-precache.test.js`: **ALL PASS** (was RED from plan 03) — 4 assets in PRECACHE_URLS, `/changelog` in PRECACHE_HTML, page absent from PRECACHE_URLS, no `whats-new.css`, anti-stale guard intact, no bare `cache.add(url)`.
- `help.html` / `changelog.html` confirmed absent from the diff.
- Full suite (`tests/run-all.js`): 161 passed, 1 failed — the single failure is out of scope (see below).

Real offline cold-launch popup + `/changelog` navigation is field-verified at the phase-gate UAT (jsdom cannot exercise the SW).

## Deviations from Plan

None — plan executed exactly as written.

One micro-adjustment during Task 1 (not a plan deviation): the initial explanatory comment contained the literal string `whats-new.js`, which the Task-1 verifier's `indexOf('whats-new.js')` matched inside the comment (before the script tag), tripping the order check. Reworded the comment to say "the popup surface" instead of the literal filename; verifier then passed. No functional impact.

## Deferred / Out-of-Scope Issues

- **`tests/42-demo-gate.test.js` — 2 of 4 cases fail (PRE-EXISTING, out of scope).** These cases assert a "What's new" menu row and a footer version anchor to `./changelog.html` mount in `shared-chrome.js` on normal pages. `shared-chrome.js` has no changelog references yet — that wiring belongs to a later plan (menu-row / footer-anchor, plan 10/11). This plan (42-09) does not touch `shared-chrome.js`; the failure is an authored-RED gate for future work, not a regression from these commits. The two demo-mode suppression cases (D-15) already PASS. The precache gate this plan owns is fully GREEN.

## Known Stubs

None. All 4 precached assets exist on disk (`assets/changelog-content-en.js`, `whats-new.js`, `changelog.js`, `changelog.css`) and are loaded by real script tags.

## Self-Check: PASSED
