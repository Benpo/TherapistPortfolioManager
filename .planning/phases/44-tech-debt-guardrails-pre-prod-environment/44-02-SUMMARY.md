---
phase: 44-tech-debt-guardrails-pre-prod-environment
plan: 02
subsystem: deploy
tags: [deploy, cloudflare, cache-purge, mixed-cache, fail-closed, sentinel, tech-debt, DEBT-02]

requires:
  - phase: 28-pwa-update-reliability
    provides: assets/version.js single-source BUILD_TOKEN + _headers /assets/version.js no-cache rule (the content sentinel this poll depends on)
provides:
  - scripts/cf-await-promotion.sh (POSIX-sh sentinel-then-blocking-purge — polls the live no-cache version.js for the new short-SHA BUILD_TOKEN, then purges the CF zone cache; fails closed on poll timeout or purge failure)
  - tests/cf-await-promotion.test.js (stub-curl offline behavior spec — four exit-code cases + short-SHA guard + _headers no-cache source-audit)
  - .gitignore whitelist for the new CI-run script
affects: [deploy.yml-wave-2-plan-04, cloudflare-cache-purge-sequencing]

tech-stack:
  added: []
  patterns:
    - "Stub-binary offline behavior harness (mkdtemp temp dir, stub executable on a prepended bin/ PATH, spawnSync('sh',[SCRIPT],{env}) capturing {code,stdout,stderr}, self-clean in finally) — reused from ci-resolve-docs-range.test.js, here stubbing curl instead of git"
    - "Fail-closed deploy step: loud stderr + exit 1, stdout quiet — matches ci-resolve-docs-range.sh / docs-gate shape"

key-files:
  created:
    - scripts/cf-await-promotion.sh
    - tests/cf-await-promotion.test.js
  modified:
    - .gitignore

key-decisions:
  - "New test filename is cf-await-promotion.test.js (no 44- prefix), per D-04 — the same self-applied naming rule as Plan 01"
  - "Whitelisted scripts/cf-await-promotion.sh in .gitignore (scripts/* is denied by default; only CI-run tooling is un-ignored, exactly as ci-resolve-docs-range.sh) — the script is dead unless deploy.yml can run it in CI (Wave 2)"
  - "Short SHA computed via POSIX printf '%.7s' \"$GITHUB_SHA\", never bash ${GITHUB_SHA::7}, so the script runs under sh"
  - "grep pattern includes the CLOSING quote (BUILD_TOKEN = '<short>') so a body carrying the FULL SHA does not satisfy the short-token match (Pitfall 1 guard, pinned by test case 6)"

patterns-established:
  - "Sentinel-then-purge deploy sequencing: confirm the live origin serves the new token BEFORE invalidating the edge; both a promotion timeout and a post-promotion purge failure fail closed"

requirements-completed: [DEBT-02]

coverage:
  - id: C1
    description: "The script polls the live origin until the body carries the new short-SHA BUILD_TOKEN, then purges the CF zone cache"
    requirement: "DEBT-02"
    verification:
      - kind: unit
        ref: "tests/cf-await-promotion.test.js#new token on first poll → purge success → exit 0, only one poll issued"
        status: pass
      - kind: unit
        ref: "tests/cf-await-promotion.test.js#token appears on the 3rd poll → exit 0 after polling"
        status: pass
    human_judgment: false
  - id: C2
    description: "On poll timeout the script exits 1 loudly and does NOT purge (a uniformly-stale cache is safe; a mixed one is not)"
    requirement: "DEBT-02"
    verification:
      - kind: unit
        ref: "tests/cf-await-promotion.test.js#token never appears → exit 1 after timeout, stderr names timeout + not-purging, NO purge issued"
        status: pass
    human_judgment: false
  - id: C3
    description: "After a confirmed promotion, a failed purge exits 1 loudly (confirmed-new origin + un-purged edge IS the mixed-cache bug)"
    requirement: "DEBT-02"
    verification:
      - kind: unit
        ref: "tests/cf-await-promotion.test.js#confirmed promotion but purge returns success:false → exit 1 with loud stderr"
        status: pass
    human_judgment: false
  - id: C4
    description: "The token match is the 7-hex short SHA, never the full SHA (Pitfall 1)"
    requirement: "DEBT-02"
    verification:
      - kind: unit
        ref: "tests/cf-await-promotion.test.js#body carrying the FULL SHA but not the short token → still times out (matches short SHA only)"
        status: pass
    human_judgment: false
  - id: C5
    description: "The sentinel precondition holds: _headers still declares /assets/version.js no-cache (Pitfall 4)"
    requirement: "DEBT-02"
    verification:
      - kind: unit
        ref: "tests/cf-await-promotion.test.js#_headers still declares /assets/version.js no-cache (sentinel precondition)"
        status: pass
    human_judgment: false

metrics:
  duration: 10min
  completed: 2026-07-11
  tasks: 2
  files: 3

status: complete
---

# Phase 44 Plan 02: Deploy Cache-Purge Sentinel (DEBT-02) Summary

A fail-closed, offline-tested `scripts/cf-await-promotion.sh` that purges the Cloudflare zone cache ONLY after the live production origin is confirmed serving the new deploy's short-SHA BUILD_TOKEN — closing the v1.3.0 mixed-cache incident class.

## What Was Built

**`scripts/cf-await-promotion.sh`** (POSIX `#!/bin/sh`, `set -eu`, WHAT/WHY/CONTRACT doc-header):
- Computes the short SHA as `printf '%.7s' "$GITHUB_SHA"` (POSIX, not bash `${GITHUB_SHA::7}`).
- Polls `POLL_URL` (default `https://sessionsgarden.app/assets/version.js`, served no-cache) with a `?cb=<epoch>` cache-buster and `Cache-Control: no-cache`, grepping the body for `BUILD_TOKEN = '<short>'` (closing quote included).
- On match → blocking purge of `zones/$CF_ZONE_ID/purge_cache` with `"purge_everything":true`; `"success":true` → exit 0, else loud stderr + exit 1.
- On poll timeout (`SENTINEL_TIMEOUT`, default 300s; interval `SENTINEL_INTERVAL`, default 10s) → loud stderr "NOT purging" + exit 1, no purge.
- stdout quiet (progress/confirmation line only); all banners to stderr.

**`tests/cf-await-promotion.test.js`** (stub-curl offline behavior spec, node built-ins only):
- Stubs `curl` on a prepended temp `bin/` PATH; the stub distinguishes a version GET (counter-driven old→new token) from a purge POST (marker + `success` toggle) by scanning args for `purge_cache`.
- Six cases: first-poll match → exit 0 (one poll); never-appears → exit 1 after a shortened timeout with NO purge; 3rd-poll match → exit 0; purge `success:false` → exit 1 loud; `_headers` no-cache source-audit; full-SHA-only body → still times out (short-SHA guard).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `.gitignore` denied the new script**
- **Found during:** Task 2 commit
- **Issue:** `.gitignore` line 11 denies `scripts/*` (only CI-run tooling is whitelisted). The initial `git add scripts/cf-await-promotion.sh` was rejected as ignored, so the script — which deploy.yml must run in CI (Wave 2, Plan 04) — could not be tracked.
- **Fix:** Added `!scripts/cf-await-promotion.sh` to the existing whitelist block, directly alongside `!scripts/ci-resolve-docs-range.sh` (same rationale: version-controlled because CI runs it).
- **Files modified:** `.gitignore`
- **Commit:** ba6d662

## Verification

- `node tests/cf-await-promotion.test.js` → 6 passed, 0 failed (exit 0).
- `node tests/run-all.js` → 171 passed, 0 failed (exit 0).
- `sh -n scripts/cf-await-promotion.sh` → parses clean.
- **Manual/live only** (per VALIDATION.md): the real poll against `sessionsgarden.app` and the real zone purge are verifiable only on a live CI run once deploy.yml calls the script in Wave 2.

## TDD Gate Compliance

RED (`test(44-02): …`, 26728f4) preceded GREEN (`feat(44-02): …`, ba6d662). RED was confirmed failing (4 of 6 cases red on absent script) before the implementation was written.

## Commits

- 26728f4 — test(44-02): add failing sentinel-then-purge behavior spec (RED)
- ba6d662 — feat(44-02): add fail-closed sentinel-then-purge deploy script (GREEN) + .gitignore whitelist

## Self-Check: PASSED
- FOUND: scripts/cf-await-promotion.sh (tracked)
- FOUND: tests/cf-await-promotion.test.js (tracked)
- FOUND commit: 26728f4
- FOUND commit: ba6d662
