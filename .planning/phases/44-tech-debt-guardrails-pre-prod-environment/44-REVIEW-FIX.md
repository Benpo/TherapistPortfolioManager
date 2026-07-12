---
phase: 44-tech-debt-guardrails-pre-prod-environment
fixed_at: 2026-07-12T08:20:00Z
review_path: .planning/phases/44-tech-debt-guardrails-pre-prod-environment/44-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 44: Code Review Fix Report

**Fixed at:** 2026-07-12T08:20:00Z
**Source review:** .planning/phases/44-tech-debt-guardrails-pre-prod-environment/44-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (WR-01 through WR-06; fix_scope=critical_warning, IN-01..IN-06 excluded)
- Follow-up: IN-04 fixed afterwards on Ben's request (see "Follow-up fixes" below); IN-01/02/03/05/06 remain open
- Fixed: 6
- Skipped: 0

Both pinned behavior suites were run after EVERY fix touching their script and stayed green
throughout: `tests/build-staging.test.js` 5/5, `tests/cf-await-promotion.test.js` 6/6.
No test needed updating — every fix tightens a failure edge the suites do not pin
(the happy-path contracts are unchanged). Fixes were applied in an isolated worktree
on a temp branch and fast-forwarded back to `main`.

## Fixed Issues

### WR-01: `--noindex` silently no-ops if the staged `_headers` has no bare `/*` line

**Files modified:** `scripts/build-staging.sh`
**Commit:** bf6f87a
**Applied fix:** After the awk insert + mv, added a fail-closed `grep -q 'X-Robots-Tag: noindex'`
verification on the staged `_headers`; if the insert did not land (e.g. `_headers`
reformatted so no line is exactly `/*`), the script now prints a loud stderr message and
exits 1 instead of shipping an indexable pre-prod origin with exit 0. Verified: suite 5/5.

### WR-02: Unknown second argument is silently ignored — a typo'd `--noindex` produces an indexable pre-prod

**Files modified:** `scripts/build-staging.sh`
**Commit:** df4c5ff
**Applied fix:** After `NOINDEX="${2:-}"`, any value that is not empty or exactly `--noindex`
now exits 2 with `unknown argument '<arg>' (expected --noindex)`, and `$# > 2` exits 2 with
`too many arguments`. Negative-tested by hand: `--no-index` → exit 2, `--noindex extra` →
exit 2; suite still 5/5 (both sanctioned invocations unchanged).

### WR-03: `CF_ZONE_ID`/`CF_PURGE_TOKEN` not validated before the poll loop — misconfig discovered only after promotion, in the exact mixed-cache state

**Files modified:** `scripts/cf-await-promotion.sh`
**Commit:** 1f07acc
**Applied fix:** Added three explicit `[ -n "${VAR:-}" ]` fail-fast checks (GITHUB_SHA,
CF_ZONE_ID, CF_PURGE_TOKEN) before the first poll, each with a runbook-style stderr message
and exit 1. Used explicit checks instead of the review's `eval` loop (same behavior, no eval).
Covers both the empty-string secret (which `set -u` misses) and replaces the bare `set -u`
abort with guided output. Negative-tested by hand: empty CF_ZONE_ID and empty GITHUB_SHA
both exit 1 immediately with the message, no poll issued; suite still 6/6.

### WR-04: A hard curl failure on the purge POST skips the loud mixed-cache diagnostic

**Files modified:** `scripts/cf-await-promotion.sh`
**Commit:** b6f5916
**Applied fix:** Appended `|| true` to the purge `curl` command substitution so a transport
failure (DNS/TLS/reset) no longer aborts at the assignment under `set -e` with only curl's
terse error: an empty/partial `$resp` now falls through to the `"success":true` grep, whose
else-branch owns ALL purge failures and prints the CONTRACT-promised
"purge failed AFTER confirmed promotion — edge may serve a mixed cache; re-run this job"
runbook line. Exit stays 1 either way. Suite still 6/6 (case 4 pins exactly this branch).

### WR-05: No `--max-time` on any curl call — a stalled connection can hang the deploy far past `SENTINEL_TIMEOUT`

**Files modified:** `scripts/cf-await-promotion.sh`
**Commit:** 2e8ec59
**Applied fix:** Poll curl now carries `--max-time 20 --connect-timeout 10`; purge POST
carries `--max-time 30`. Both caps are well under SENTINEL_INTERVAL-scale so the
between-polls deadline check stays live, and a server that accepts but never responds can
no longer hold the job until the 6h Actions job timeout. Comment added explaining why.
Suite still 6/6 (the stub curl ignores the extra flags, as intended).

### WR-06: `cancel-in-progress: true` + the new 0–300s await window can cancel between deploy-branch push and purge — recreating the DEBT-02 condition with no failed run

**Files modified:** `.github/workflows/deploy.yml`
**Commit:** 6aff9f9
**Applied fix:** Set `cancel-in-progress: false` for the `deploy` concurrency group (runs
queue instead of cancel — the review's recommended cheap, correct option) and added a
workflow comment explaining the push→purge atomicity rationale: cancellation inside the
0–300s await window leaves origin=new/edge=old, and a superseding run that fails its docs
gate never purges, ending the pipeline with one cancelled + one gate-failed run and no red
"purge missing" signal. Structural YAML check passed (block shape verified, no tabs).

## Skipped Issues

None — all six in-scope findings were fixed.

## Follow-up fixes (outside fix_scope, user-directed)

### IN-04: No CI job runs the test suites — the specs that pin these scripts gate nothing in the deploy path

**Files modified:** `.github/workflows/deploy.yml`, `.github/workflows/deploy-preprod.yml`
**Commit:** e8f2b65
**Applied fix:** Added a `Pipeline script tests (fail-closed)` step to both workflows,
before the staged tree is built. Prod runs both pinned suites
(`tests/build-staging.test.js`, `tests/cf-await-promotion.test.js`); pre-prod runs only
`build-staging.test.js` (the one script that path executes — cf-await-promotion.sh is
prod-only). Both suites `process.exit(1)` on any failure (verified in source), so a
pinned-contract regression now fails the deploy instead of shipping on the push that
introduced it. This closes the amplifier the review flagged for WR-01/WR-02. YAML
validated (both workflows parse; step order confirmed). IN-01/02/03/05/06 remain open.

---

_Fixed: 2026-07-12T08:20:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
