---
phase: 43-docs-maintenance-hard-gate
plan: 08
subsystem: ci-docs-gate
tags: [ci, docs-gate, fail-closed, posix-sh, tdd]
requires: [scripts/docs-gate.js, scripts/lib/role-table.js]
provides: [scripts/ci-resolve-docs-range.sh]
affects: [.github/workflows/deploy.yml, CLAUDE.md, .gitignore]
tech-stack:
  added: []
  patterns: [one-implementation-two-callers, three-way-exit-code-branch, fail-closed, stubbed-git-behavior-test]
key-files:
  created:
    - scripts/ci-resolve-docs-range.sh
    - tests/ci-resolve-docs-range.test.js
  modified:
    - .github/workflows/deploy.yml
    - CLAUDE.md
    - .gitignore
decisions:
  - "Range resolution lifted from inline deploy.yml YAML into a shared POSIX-sh script so a stubbed-git behavior test can drive every ls-remote exit code (D-01/D-17/D-21)."
  - "ls-remote exit code captured explicitly and branched THREE ways: rc=0 anchored, rc=2 bootstrap, any other rc → exit 1 fail-closed (CR-01/D-04)."
  - "WR-02 recovery documented in both the resolver's stderr runbook and CLAUDE.md; the emergency-skip trailer cannot bypass a shell step that runs before the gate."
  - "scripts/ci-resolve-docs-range.sh added to the .gitignore allowlist (scripts/* is ignored except docs-rot gate tooling CI must run)."
requirements: [GATE-02, GATE-03]
metrics:
  duration: ~6min
  completed: 2026-07-10
status: complete
---

# Phase 43 Plan 08: Fail-Closed CI Docs-Gate Range Resolver Summary

Lifted CI docs-gate range resolution into a shared, unit-tested POSIX-sh script that branches three ways on the exact `git ls-remote` exit code — fixing the CR-01 Blocker where a transient network/auth fault (rc=128) on an existing `deploy` branch silently collapsed the gate range to the tip commit only, and documenting the WR-02 emergency-skip dead-end with a non-destructive recovery runbook.

## What Was Built

- **`scripts/ci-resolve-docs-range.sh`** (`#!/bin/sh`, `set -eu`) — the shared, fail-closed CI range resolver. Captures the `git ls-remote --exit-code --heads origin deploy` exit code with `set +e; …; rc=$?; set -e`, then branches:
  - `rc=0` → fetch `deploy`, read the `Deploy from <sha>` subject, extract a 7–40 hex token, `rev-parse --verify` it, and print `<anchor>..<GITHUB_SHA>` to stdout. Fetch failure or an empty/unresolvable anchor fails closed (exit 1).
  - `rc=2` → genuinely-absent branch; print a first-run bootstrap NOTICE to stderr and `<GITHUB_SHA>^..<GITHUB_SHA>` to stdout.
  - **any other rc (e.g. 128)** → print `ls-remote failed (rc=$rc) … failing closed` to stderr and exit 1. This is the CR-01 fix — a network/auth fault can no longer reach the bootstrap path.
  - Contract: stdout carries ONLY the range line; every banner/notice/runbook goes to stderr; every fail-closed condition exits non-zero.
- **`tests/ci-resolve-docs-range.test.js`** — node-built-ins-only, offline, self-cleaning behavior spec. Drops a stub `git` on PATH driven by `STUB_*` env vars and asserts the four cases: rc=0 anchored, rc=2 bootstrap, rc=128 fail-closed (names the code + "failing closed", no range on stdout), and rc=0-unresolvable-anchor fail-closed-with-runbook.
- **`.github/workflows/deploy.yml`** — the "Docs gate (fail-closed)" step now delegates to `range="$(sh scripts/ci-resolve-docs-range.sh)"` and keeps the auditable `rev-list --count` echo and `node scripts/docs-gate.js --range "$range"` call. Diff limited to that one step; the other five steps are byte-identical.
- **`CLAUDE.md`** — a recovery-path paragraph appended to the Definition-of-Done section (no existing sentence altered) documenting the WR-02 runbook: delete or re-point the remote `deploy` branch; the emergency-skip trailer cannot bypass a shell step that runs before the gate.

## How It Works (key links)

`.github/workflows/deploy.yml` → `sh scripts/ci-resolve-docs-range.sh` (resolves the range, fail-closed) → `node scripts/docs-gate.js --range "$range"`. One shared resolver, invoked by both deploy.yml and the behavior test — the same "one implementation, two callers" shape the gate itself uses.

## Verification

- `sh -n scripts/ci-resolve-docs-range.sh` — clean, no syntax error.
- `node tests/ci-resolve-docs-range.test.js` — 4 passed, 0 failed (GREEN), including the rc=128 fail-closed falsifier and the unresolvable-anchor recovery-runbook case.
- `node tests/run-all.js` — **167 passed, 0 failed, 167 total** (prior 166 + the new file; no regression).
- Manual: deploy.yml diff limited to the one gate step (all six step `name:` lines intact); resolver confirmed tracked (`git ls-files`) after the .gitignore allowlist fix.
- None of the modified files classify as a `trigger` in `role-table.js`, so the eventual push to main needs no Changelog-Unaffected/Help-Unaffected trailer.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test harness dropped stderr on exit-0 runs**
- **Found during:** Task 2 (first GREEN run)
- **Issue:** The RED test used `execFileSync`, which returns only stdout. The rc=2 bootstrap case exits 0 yet must emit its NOTICE to stderr, so that assertion could never observe the NOTICE (false FAIL on a correct resolver).
- **Fix:** Switched `runResolver()` to `spawnSync` with `encoding:'utf8'`, capturing stdout AND stderr regardless of exit code.
- **Files modified:** tests/ci-resolve-docs-range.test.js
- **Commit:** e4b2f21 (folded into the GREEN commit)

**2. [Rule 3 - Blocking] Resolver was gitignored by `scripts/*`**
- **Found during:** Task 2 commit
- **Issue:** `.gitignore` ignores `scripts/*` with an explicit allowlist for docs-rot gate tooling CI must run. The new resolver matched the ignore rule, so the first commit silently excluded it — deploy.yml would reference a file absent from the CI checkout.
- **Fix:** Added `!scripts/ci-resolve-docs-range.sh` to the allowlist (matching the documented convention for `docs-gate.js` / `gen-help-map.js`), then amended the unpushed GREEN commit so deploy.yml and the tracked resolver land together.
- **Files modified:** .gitignore
- **Commit:** e4b2f21

## TDD Gate Compliance

- RED: `test(43-08): add failing behavior spec …` — commit 38fd568 (spec failed for the right reason: resolver absent).
- GREEN: `feat(43-08): shared fail-closed CI docs-gate range resolver …` — commit e4b2f21.
- No REFACTOR commit (implementation shipped clean).

## Threat Model Compliance

All three registered threats are mitigated by the shipped resolver:
- **T-43-08-01** (transient ls-remote fault collapsing the range): rc captured; any rc ∉ {0,2} exits 1. Proven by the rc=128 test case.
- **T-43-08-02** (emergency-skip dead-end): fail-closed on unresolvable anchor + recovery runbook on stderr and in CLAUDE.md.
- **T-43-08-03** (forged/mangled deploy subject): token must be 7–40 hex AND `rev-parse --verify` must resolve, else fail closed with the runbook.

No new security surface introduced; no threat flags.

## Known Stubs

None.

## Deferred (per plan, out of scope for this gap-closure run)

- GATE-04 live-ship proof at v1.3.0 milestone close (human/milestone-close item).
- WR-05 (local hook reads working tree, not range tip) — Info/Warning; CI checkout == tip.
- IN-01..IN-05 (Info-tier cleanups in docs-gate internals) — left for opportunistic cleanup.

## Self-Check: PASSED

- Artifacts present: scripts/ci-resolve-docs-range.sh, tests/ci-resolve-docs-range.test.js, .github/workflows/deploy.yml, CLAUDE.md, .gitignore — all FOUND.
- Commits exist: 38fd568 (RED), e4b2f21 (GREEN) — both FOUND.
- Resolver confirmed TRACKED by git.
