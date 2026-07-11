---
phase: 44-tech-debt-guardrails-pre-prod-environment
plan: 04
subsystem: ci-deploy
tags: [deploy, cloudflare, cache-purge, ci, tech-debt]
requires:
  - scripts/build-staging.sh (Wave 1, 44-03)
  - scripts/cf-await-promotion.sh (Wave 1, 44-02)
provides:
  - hardened .github/workflows/deploy.yml (shared staging transform + sentinel-then-blocking purge)
affects:
  - production Cloudflare Pages deploy pipeline
tech-stack:
  added: []
  patterns:
    - "deploy.yml delegates its staging transform and cache purge to versioned, offline-tested shared scripts"
    - "sentinel-then-blocking purge: confirm live-origin promotion before purging; fail the run on timeout or purge failure"
key-files:
  created: []
  modified:
    - .github/workflows/deploy.yml
decisions:
  - "Prod deploy stages via `sh scripts/build-staging.sh deploy-staging` (no --noindex) — behavior-preserving extraction (DEBT-03, D-07)"
  - "Cloudflare purge moved AFTER the deploy-branch push and delegated to cf-await-promotion.sh — purge only after confirmed promotion, blocking on failure (DEBT-02)"
metrics:
  duration: 6min
  completed: 2026-07-11
status: complete
---

# Phase 44 Plan 04: Wire Wave-1 scripts into prod deploy.yml Summary

Hardened `.github/workflows/deploy.yml` so the prod pipeline stages via the shared `build-staging.sh` transform and purges the Cloudflare cache only after `cf-await-promotion.sh` confirms the live origin serves the new deploy token — closing the DEBT-02 mixed-cache class and landing the DEBT-03 shared-transform extraction atomically in the one blast-radius file.

## What Was Built

**Task 1 — shared staging transform (refactor, 9627b29):**
Replaced the "Prepare deploy directory" step's inline body (the `mkdir`, seven `cp` whitelist lines, and the `sed` token-stamp) with a single `sh scripts/build-staging.sh deploy-staging` call. Behavior-preserving extraction; the "Verify no sensitive files" defense-in-depth guard on the staged output is retained unchanged. Pinned byte-faithful by `tests/build-staging.test.js`.

**Task 2 — sentinel-then-blocking purge (feat, 1d14a91):**
Replaced the immediate, non-blocking "Purge Cloudflare cache" step (`if: success()` … `|| echo "…non-blocking"`) with a step positioned AFTER "Push to deploy branch" that runs `sh scripts/cf-await-promotion.sh`, wiring `CF_ZONE_ID` and `CF_PURGE_TOKEN` via a step `env:` block (`GITHUB_SHA` comes from the Actions context). The script awaits the live origin serving the new short-SHA token, then purges, and fails the run (exit 1) on either a promotion timeout (no purge — a uniformly-stale cache is safe) or a purge failure after confirmed promotion.

Prod topology otherwise unchanged: the `push: branches:[main]` trigger, the fail-closed docs-gate, the deploy-branch force-push, the concurrency group, and the `Deploy from <sha>` anchor subject are all untouched.

## Verification

- `node tests/build-staging.test.js` → 5 passed, 0 failed
- `node tests/cf-await-promotion.test.js` → 6 passed, 0 failed
- `node tests/run-all.js` → 172 passed, 0 failed, 172 total
- Diff review: exactly one Cloudflare purge path remains, delegated to `cf-await-promotion.sh`, positioned after "Push to deploy branch"; the "Prepare deploy directory" step contains only the `build-staging.sh` call; the "Verify no sensitive files" guard is unchanged; trigger, docs-gate, deploy-branch push, and the `Deploy from <sha>` anchor are unchanged.
- Manual/live (VALIDATION.md): the real promotion poll + zone purge are only verifiable on a live prod deploy run.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface

No new security surface introduced. The change reduces risk: purge sequencing (T-44-03) is now strict and blocking, and the transform extraction (T-44-07) is behavior-preserving with the no-leak guard retained. Trigger/branch/anchor (T-44-10) left untouched.

## Self-Check: PASSED

- FOUND: .github/workflows/deploy.yml (modified)
- FOUND commit 9627b29 (Task 1)
- FOUND commit 1d14a91 (Task 2)
