---
phase: 28-update-reliability-versioning
plan: 01
subsystem: infra
tags: [pwa, service-worker, versioning, cache, github-actions, ci]

requires:
  - phase: 19-go-live-preparation
    provides: the deploy GitHub Action (verbatim file copy, ${GITHUB_SHA::7} short-hash in commit message)
provides:
  - "assets/version.js — single source-of-truth module exposing APP_VERSION (semver) + INTEGRITY_TOKEN (deploy-stamped), dual-context (self/window/globalThis)"
  - "sw.js CACHE_NAME auto-derived from the deploy token via importScripts — no manual cache bump ever again"
  - "deploy.yml version-stamp step (single sed transform) that writes the git short-hash into the staging version.js"
affects: [28-03-footer-version, 28-04-integrity-check, runtime-integrity-self-check]

tech-stack:
  added: []
  patterns:
    - "Cross-context shared global module: IIFE assigns its export to self/globalThis so BOTH page (window) and SW (self) read one constant"
    - "Hybrid version model: hand-set semver literal + deploy-stamped git-short-hash token with a 'dev' file:// fallback"
    - "Deploy-time single-sed stamp (NOT a bundler) on the staging copy only"

key-files:
  created:
    - assets/version.js
  modified:
    - sw.js
    - .github/workflows/deploy.yml

key-decisions:
  - "Global module named AppVersion (assigned to self/globalThis for dual-context read)"
  - "Placeholder literal is '__BUILD_TOKEN__'; the 'dev'-fallback comparison literal is string-split ('__BUILD' + '_TOKEN__') so the deploy sed only rewrites the BUILD_TOKEN assignment, never the fallback check"
  - "CACHE_NAME = 'sessions-garden-' + self.AppVersion.INTEGRITY_TOKEN — the numeric literal is gone, killing the manual-bump failure class (D-02)"

patterns-established:
  - "version.js dual-context global is the single source the footer (Plan 03) and integrity check (Plan 04) will consume"
  - "Deploy stamp acts on deploy-staging copy only; the committed file keeps its placeholder so file:// degrades to the distinct 'dev' cache name (degrades safe)"

requirements-completed: [VER-01, VER-02, VER-06]

duration: 9min
completed: 2026-06-22
status: complete
---

# Phase 28 Plan 01: Update Reliability & Versioning Foundation Summary

**A dual-context `assets/version.js` single source of truth (semver `1.2.0` + deploy-stamped git-short-hash token) now drives the SW `CACHE_NAME` via `importScripts`, with a deploy-time sed stamp — killing the manual cache-bump failure class at the root.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-06-22T11:47:00Z
- **Completed:** 2026-06-22T11:56:38Z
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- New `assets/version.js`: an IIFE-global `AppVersion` object readable from both the page (`window`) and the service worker (`self`) scope, exposing `APP_VERSION='1.2.0'` (hand-set semver, D-01) and `INTEGRITY_TOKEN` (deploy-stamped, `'dev'` fallback for `file://`). Zero network calls (VER-06).
- `sw.js` now `importScripts('/version.js')` and derives `CACHE_NAME = 'sessions-garden-' + self.AppVersion.INTEGRITY_TOKEN` — the hardcoded numeric cache version is gone (D-02). `version.js` added to `PRECACHE_URLS`; `skipWaiting()` + `clients.claim()` + stale-cache deletion preserved (D-05).
- `deploy.yml` gained a single deliberate `sed` step in "Prepare deploy directory" that replaces the `__BUILD_TOKEN__` placeholder in the **staging** `version.js` with `${GITHUB_SHA::7}` (D-04) — not a bundler. The committed file keeps its placeholder.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create assets/version.js — dual-context single source of truth** — `7d0e427` (feat)
2. **Task 2: Wire sw.js CACHE_NAME to the version.js token via importScripts** — `9ba8037` (feat)
3. **Task 3: Add deploy-time version-stamp step** — `867922f` (feat)

## Files Created/Modified
- `assets/version.js` (NEW) — single source-of-truth: `AppVersion.APP_VERSION` (semver) + `AppVersion.INTEGRITY_TOKEN` (deploy token / `'dev'`), dual-context global.
- `sw.js` (MOD) — `importScripts('/version.js')`; `CACHE_NAME` derived from the token; `version.js` precached; SW takeover preserved.
- `.github/workflows/deploy.yml` (MOD) — single `sed` stamp of the git short-hash into `deploy-staging/assets/version.js`.

## Decisions Made
- **Global name `AppVersion`** assigned to `self`/`globalThis` (not only `window`) so the worker context can read it via `importScripts`.
- **Placeholder literal `'__BUILD_TOKEN__'`**, with the `'dev'`-fallback comparison string-split as `'__BUILD' + '_TOKEN__'`. This is load-bearing: it guarantees the deploy `sed "s/'__BUILD_TOKEN__'/.../"` rewrites only the `BUILD_TOKEN` assignment and never the fallback comparison — so a stamped build resolves to the hash while an unstamped (local) file still resolves to `'dev'`. Verified by simulating the sed on a temp copy (`abc1234` → `INTEGRITY_TOKEN='abc1234'`).
- Reused the existing `${GITHUB_SHA::7}` already present in `deploy.yml` (no new secret/input) — degrades safe: a no-op sed yields the benign distinct `'dev'` cache name, never silently same-as-prod (T-28-01).

## Deviations from Plan

None - plan executed exactly as written. (No Rule 1-4 deviations; all three automated verifies passed first try.)

## Issues Encountered
- The local `.git/hooks/pre-commit` cache-bump hook fired on the Task 1 commit and auto-bumped `sw.js` `CACHE_NAME` `v212 → v213`, auto-staging `sw.js` into that commit. This was benign: Task 2 immediately replaced that hardcoded literal with the token-derived value, so the bump was overwritten one commit later. On the Task 2 commit the hook correctly skipped (sw.js already staged). This is exactly the now-redundant hook flagged for removal — see **Manual follow-up** below.

## Manual Follow-up for Ben (D-04 reconciliation — IMPORTANT)

The local `.git/hooks/pre-commit` cache-bump hook is now **redundant and should be deleted/disabled**:

- It auto-bumps a numeric `CACHE_NAME` literal in `sw.js`. After this plan, `sw.js` no longer has a numeric literal — `CACHE_NAME` is auto-derived from the deploy token. So the hook is now a no-op (it can only act when `sw.js` is *not* in the diff, and there is nothing left to bump).
- It is an **untracked, local-only** hook (`.git/hooks/` is not version-controlled) — a tracked commit cannot remove it. Each developer (Ben, Sapir) must remove it on their own machine.
- **Action:** `rm .git/hooks/pre-commit` (or disable it), on every machine that has it. Keeping it causes only confusion (a spurious "bumped CACHE_NAME" line on the first sw.js-free commit), not breakage.

## Next Phase Readiness
- **Plan 03 (footer)** can now replace `shared-chrome.js`'s static `var APP_VERSION = '1.1.0'` with a read of `window.AppVersion.APP_VERSION` → renders `v1.2.0`. Requires adding the `<script src="./assets/version.js">` tag ABOVE `shared-chrome.js` in the HTML pages.
- **Plan 04 (integrity check)** can read `window.AppVersion.INTEGRITY_TOKEN` as the reference token for the runtime self-check and the footer `⚠` marker.
- The token side already flows to `CACHE_NAME` today; full single-source-of-truth (footer + cache + integrity all from one constant) closes in Plan 04.

## Self-Check: PASSED
- FOUND: assets/version.js
- FOUND commit 7d0e427 (Task 1)
- FOUND commit 9ba8037 (Task 2)
- FOUND commit 867922f (Task 3)

---
*Phase: 28-update-reliability-versioning*
*Completed: 2026-06-22*
