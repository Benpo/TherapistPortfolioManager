---
phase: 44-tech-debt-guardrails-pre-prod-environment
plan: 03
subsystem: deploy
tags: [deploy, staging-transform, shared-script, noindex, no-leak, whitelist, tech-debt, DEBT-03]

requires:
  - phase: 28-pwa-update-reliability
    provides: assets/version.js single-source __BUILD_TOKEN__ placeholder (the sed-stamp target) + _headers base CSP /* block (the byte-identity anchor for the noindex divergence)
provides:
  - scripts/build-staging.sh (POSIX-sh parameterized shared staging transform — <target-dir> [--noindex]; whitelist cp + short-SHA token stamp, with a pre-prod-only noindex append; the single source of truth both deploy.yml Wave-2 Plan-04 and deploy-preprod.yml Wave-2 Plan-05 will call)
  - tests/build-staging.test.js (tmp-dir offline fidelity spec — whitelist completeness, token stamp, no-leak invariant, noindex divergence with base CSP block byte-identical, committed files untouched)
  - .gitignore whitelist for the new CI-run script (!scripts/build-staging.sh)
  - fake-test-detector allowlist entry for build-staging.test.js (executes the real script; asset reads are of the output tree, not source-slicing)
affects: [deploy.yml-wave-2-plan-04, deploy-preprod.yml-wave-2-plan-05, prod-preprod-transform-drift]

tech-stack:
  added: []
  patterns:
    - "Shared parameterized deploy transform: one POSIX-sh script both prod and pre-prod workflows call, with a single flag (--noindex) as the only sanctioned divergence — kills prod<->pre-prod drift (D-07)"
    - "tmp-dir offline fidelity harness (mkdtempSync target dir, spawnSync('sh',[SCRIPT,target],{cwd:REPO_ROOT,env:{GITHUB_SHA}}) capturing {code,stdout,stderr}, assert on the staged output tree, self-clean in finally) — the ci-resolve/cf-await harness shape, here driving a real transform instead of a stubbed binary"
    - "Append-not-edit divergence: noindex is a second /* block appended to the STAGED _headers, keeping the base CSP block byte-identical and the committed file untouched (Pitfall 2 / D-09)"
    - "Portable sed substitution via redirect+mv (NOT sed -i) + printf '%.7s' short-SHA (NOT bash ${VAR::7}) so the offline test runs identically on developer macOS (BSD sed) and ubuntu CI (GNU sed)"

key-files:
  created:
    - scripts/build-staging.sh
    - tests/build-staging.test.js
  modified:
    - .gitignore
    - tests/30-fake-test-detector.test.js

key-decisions:
  - "New test filename is build-staging.test.js (no 44- prefix), per D-04 — the same self-applied naming rule as Plans 01/02; run-all.js discovers it by the *.test.js suffix"
  - "The no-leak invariant (deploy.yml's 'Verify no sensitive files' echo) is now a real falsifiable assertion: the test asserts NO .planning/.claude/CLAUDE.md/.env in the staged tree, resting on the explicit whitelist being the ONLY copy path (T-44-05)"
  - "noindex is appended as a second /* block to the staged _headers only; the test pins the base CSP /* block byte-identical between plain and --noindex staged copies, and asserts committed _headers/version.js are never mutated (T-44-06 / Pitfall 2)"
  - "scripts/build-staging.sh whitelisted in .gitignore (scripts/* is denied by default) so the Wave-2 CI callers can run the version-controlled script — same pattern as cf-await-promotion.sh"

metrics:
  duration_minutes: 5
  completed: 2026-07-11
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  commits: 2

status: complete
---

# Phase 44 Plan 03: Shared Staging Transform (build-staging.sh) Summary

Extracted the prod Cloudflare-Pages staging transform out of the inline `deploy.yml` shell into a single parameterized, offline-testable POSIX-sh script — `scripts/build-staging.sh <target-dir> [--noindex]` — that is byte-faithful to the old inline transform (whitelist `cp` + `__BUILD_TOKEN__` short-SHA stamp) and adds one deliberate pre-prod-only divergence behind `--noindex` (append an `X-Robots-Tag: noindex` block to the staged `_headers` only). A tmp-dir behavior spec turns the previously-cosmetic "no sensitive files leaked" echo into a real, falsifiable assertion.

## What was built

- **`scripts/build-staging.sh`** (new, executable, `#!/bin/sh` + `set -eu`, WHAT/WHY/CONTRACT header): `mkdir -p "$1"`, whitelist `cp` of the exact D-08 set (`_headers`, `_redirects`, `LICENSE`, `*.html`, `assets/` recursive, `manifest.json`, `sw.js`) into the target, then a portable token stamp (`printf '%.7s' "$GITHUB_SHA"` → `sed 's/…/…/' > tmp && mv`) into the STAGED `assets/version.js` only. With `--noindex` it appends `\n/*\n  X-Robots-Tag: noindex\n` to the staged `_headers`. It writes only under `$1`; the committed `_headers`/`version.js` are never mutated.
- **`tests/build-staging.test.js`** (new, tmp-dir offline spec): five cases — (1) whitelist completeness, (2) token stamped with the fixture short-SHA and `__BUILD_TOKEN__` gone, (2b) committed `_headers`/`version.js` untouched after a `--noindex` run (control), (3) no-leak (no `.planning`/`.claude`/`CLAUDE.md`/`.env` in the staged tree), (4) noindex divergence with the base CSP `/*` block byte-identical between plain and `--noindex` staged copies. Self-cleans all tmp dirs in `finally`.
- **`.gitignore`**: whitelisted `!scripts/build-staging.sh` (scripts/* is denied by default) so Wave-2 CI callers can run the version-controlled script.
- **`tests/30-fake-test-detector.test.js`**: allowlisted `build-staging` (code + header doc) — the test executes the real script via `spawnSync` and asserts on its output tree; the `assets/version.js` reads are of the script's output plus a committed-untouched control, not source-slicing to fake behavior (the sanctioned `docs-gate`-style exemption).

## How it was verified

- `node tests/build-staging.test.js` — 5 passed, 0 failed (RED at Task 1 with exit 127 script-absent; GREEN at Task 2).
- `node tests/run-all.js` — 172 passed, 0 failed.
- `sh -n scripts/build-staging.sh` — parses clean.
- `git status --porcelain _headers assets/version.js` — empty after runs (committed files untouched).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Allowlisted the new test in the fake-test-detector gate**
- **Found during:** Task 2 (running `node tests/run-all.js`)
- **Issue:** `tests/30-fake-test-detector.test.js` flagged `build-staging.test.js` as a "source-slicing assets/*.js" fake test, because the test reads `assets/version.js` as text and does `.indexOf()` on it. This is a heuristic false positive: the test genuinely EXECUTES the real transform via `spawnSync` and asserts on the staged output tree — the read is of the script's output (and a committed-untouched control), not source-slicing to fake behavior.
- **Fix:** Added a `build-staging` entry to the detector's `ALLOWLIST` (and mirrored it in the header doc comment) with a justification mirroring the existing `docs-gate` exemption — the execution sink is the `build-staging.sh` process, which the detector cannot see. This is the detector's own sanctioned escape hatch ("if it is a deliberate … guard, add it to ALLOWLIST with a justification").
- **Files modified:** `tests/30-fake-test-detector.test.js`
- **Commit:** 628c248

**2. [Rule 3 - Blocking] Whitelisted the new script in .gitignore**
- **Found during:** Task 2
- **Issue:** `.gitignore` denies `scripts/*` by default with explicit per-file whitelists; without a whitelist entry the new CI-run script would be untracked and could not run in the Wave-2 workflows.
- **Fix:** Added `!scripts/build-staging.sh`, matching the existing `cf-await-promotion.sh` pattern. (Explicitly anticipated by the plan/dispatch note.)
- **Files modified:** `.gitignore`
- **Commit:** 628c248

## Threat mitigations landed

- **T-44-05 (Information Disclosure — staged tree):** the explicit whitelist is the only copy path, and `tests/build-staging.test.js` asserts NO `.planning`/`.claude`/`CLAUDE.md`/`.env` in the staged tree — the deploy.yml verify echo is now a real test.
- **T-44-06 (Tampering — committed _headers CSP block):** noindex is appended to the staged copy only; the test pins the base CSP `/*` block byte-identical between plain and `--noindex` staged copies and asserts the committed `_headers`/`version.js` are never mutated.

## Notes for Wave 2

- `scripts/build-staging.sh` is the single transform Plan 04 (deploy.yml) and Plan 05 (deploy-preprod.yml) will both call: prod calls it plain, pre-prod calls it with `--noindex`. Replacing the inline deploy.yml transform with a call to this script (Plan 04) removes the drift risk (D-07); the workflows should retain their verify-no-sensitive-files guard on the output as defense-in-depth.
- The script reads `GITHUB_SHA` from the environment (exits 2 if unset) and treats the current working directory as the source repo root — both callers already run from the checked-out repo with `GITHUB_SHA` set.

## Self-Check: PASSED

- `scripts/build-staging.sh` — FOUND
- `tests/build-staging.test.js` — FOUND
- Commit bb17115 (RED test) — FOUND
- Commit 628c248 (GREEN script) — FOUND

## Post-completion fix (2026-07-12): noindex mechanism changed append → insert

Live verification on the real pre-prod origin (the plan's Assumption A-1 check) **disproved the append-a-second-`/*`-block approach**: Cloudflare Pages resolves a DUPLICATE identical path pattern in `_headers` as **last-one-wins, not merge**. The deployed staged `_headers` was complete and correct (base CSP block intact + appended `/*` noindex block), but the live origin served `x-robots-tag: noindex` while **missing** `content-security-policy`, `x-frame-options`, and `permissions-policy` — the second `/*` block had replaced the first. (Non-duplicate patterns, e.g. `/*.js` + `/assets/version.js`, do merge.)

**Mechanism change** (D-09 intent unchanged — the divergence still lives in the staged copy only, committed `_headers` never touched):
- `scripts/build-staging.sh` now INSERTS `  X-Robots-Tag: noindex` into the existing first `/*` block of the staged `_headers` (portable awk + redirect+mv, POSIX-sh, BSD/GNU-identical), instead of appending a duplicate `/*` block.
- `tests/build-staging.test.js` noindex case now pins: all five base security headers AND the noindex line inside the first `/*` block; exactly ONE bare `/*` pattern line (the CF last-wins falsifier — the old append behavior fails this); the plain staged copy byte-identical to the committed `_headers`; committed files untouched.
- Verified: `node tests/build-staging.test.js` 5/5, `node tests/run-all.js` 172/172, `sh -n` clean.
