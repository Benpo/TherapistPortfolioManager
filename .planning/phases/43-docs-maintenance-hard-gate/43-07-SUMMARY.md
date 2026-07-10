---
phase: 43-docs-maintenance-hard-gate
plan: 07
subsystem: docs-gate / CI / repo-hooks
tags: [enforcement, ci, git-hooks, definition-of-done, docs-rot]
status: complete
requires:
  - "scripts/docs-gate.js (43-06 — the shared gate)"
  - "scripts/lib/role-table.js, invariants.js, help-loader.js (43-01..06)"
  - "HELP-MAP.md (topic index)"
provides:
  - ".githooks/pre-push (local preview layer)"
  - "deploy.yml docs-gate CI step (unbypassable layer)"
  - "CLAUDE.md DoD contract (GSD layer)"
  - "package.json prepare → core.hooksPath activation"
affects:
  - ".github/workflows/deploy.yml"
  - "CLAUDE.md"
  - "package.json"
tech-stack:
  added: []
  patterns:
    - "Three-layer enforcement: bypassable local hook + unbypassable CI + written DoD"
    - "Self-healing anchored CI range read from the deploy branch commit message"
key-files:
  created:
    - .githooks/pre-push
  modified:
    - package.json
    - .github/workflows/deploy.yml
    - CLAUDE.md
  deleted:
    - .claude/hooks/pre-commit
decisions:
  - "OD-2 anchored range chosen over before..after: self-healing against cancel-in-progress at the cost of extra CI shell + a full-SHA deploy message"
  - "Bootstrap split: only a genuinely absent deploy branch (ls-remote exit 2) takes the tip-only fallback; an unfetched existing branch fails closed"
  - "CLAUDE.md authored directly against docs-gate.js behavior to prevent doc↔gate drift"
metrics:
  duration: ~10min
  tasks: 3
  files: 5
  completed: 2026-07-10
---

# Phase 43 Plan 07: Enforce-at-Close — Local Hook + CI Gate + DoD Line Summary

Wired the three docs-rot enforcement layers at phase close — a committed pre-push preview
hook, an unbypassable CI gate step with a self-healing anchored range, and a written
definition-of-done contract in CLAUDE.md — and removed the dead pre-commit hook.

## What was built

**Task 1 — Local layer (commit `bb50517`).** Created `.githooks/pre-push` (POSIX sh,
executable, mode 100755): reads the git pre-push stdin protocol, acts only on
`refs/heads/main`, skips a main deletion (all-zeros local sha), computes its own range
(`remote_sha..local_sha`, with a merge-base-against-origin/main fallback on first push),
and delegates to the shared `scripts/docs-gate.js --range`. Added a fail-soft
`prepare` script (`git config core.hooksPath .githooks || true`) so `npm install`
activates the committed hook path. Deleted the tracked, dead `.claude/hooks/pre-commit`
(D-16) so it can never shadow the live hook.

**Task 2 — CI layer (commit `fbfdc95`).** Added a `Docs gate (fail-closed)` step to
`deploy.yml` **before** `Prepare deploy directory`, mirroring the existing
"Verify no sensitive files" idiom (inline shell, loud echo, exit 1). It computes the OD-2
anchored range: it uses `git ls-remote --exit-code --heads origin deploy` to distinguish a
genuinely-absent deploy branch (benign tip-only bootstrap, with a loud notice) from an
existing-but-unfetched branch (fail closed), reads the anchor from the deploy commit
message (`Deploy from <sha>`, 7–40 hex, resolved via `rev-parse --verify …^{commit}`),
echoes the resolved range and its `rev-list --count`, then invokes the gate. Widened the
deploy commit message from `${GITHUB_SHA::7}` to the full `${GITHUB_SHA}` so the next run's
anchor is unambiguous. (The version.js staging token keeps `::7` — that's the build token,
not the anchor.)

**Task 3 — GSD layer (commit `ebbefe8`).** Appended a "Definition of Done — docs must not
rot" section to repo-root `CLAUDE.md` (the checked-in file every agent reads; it never
ships — the "Verify no sensitive files" step asserts that). It states the DoD line; points
at `scripts/lib/role-table.js` (the written user-facing definition) and `HELP-MAP.md` (the
topic index); documents the three trailer keys with exact casing; shows the OD-3 multi-file
trailer shape with a worked example and a mandatory reason (no brace-expansion); states the
OD-4 tip-commit-only rule for `Docs-Emergency-Skip:` (vs. the two `*-Unaffected:` trailers
honored from any commit); and clarifies that `--no-verify` bypasses only the local hook.

## Verification

- Task 1 automated: `LOCAL-LAYER-OK` — hook executable, `sh -n` clean, prepare present, pre-commit gone.
- Task 2 automated: yaml parse OK, gate step present and ordered before "Prepare deploy directory", full-SHA deploy message confirmed (line 111, via `grep -F`).
- Task 3 automated: `DOD-OK` — all trailer keys, both pointer paths, tip-commit + no-verify language, and the two-real-path multi-file assertion all present.
- Task 3 manual (doc↔gate consistency): authored directly against `scripts/docs-gate.js` as implemented in 43-06; every rule stated in CLAUDE.md maps to a rule the gate enforces (trailer casing, per-file `Help-Unaffected` vs global `Changelog-Unaffected`, tip-only emergency skip, malformed-reason rejection) and vice versa.
- Full suite: **166 passed, 0 failed** — the gate's invariants stay green.

## D-15 activation (recorded)

- `git config core.hooksPath` **before** prepare: `.git/hooks` (default — the committed hook was INERT).
- After running the prepare command: `git config core.hooksPath` returns **`.githooks`**; `.githooks/pre-push` resolves and is executable.
- Fail-soft confirmed: the prepare command run outside any git repo (`/tmp`) exits `0` (the `|| true` swallows `fatal: not in a git directory`).

## Deviations from Plan

None — plan executed as written. (One process note: the Task 1 commit was created in two
git operations — the `git rm` of the dead hook had already staged its deletion, so the
first `git add` of a now-absent pathspec added nothing; the hook + package.json were folded
into the same commit via `--amend`, keeping Task 1 a single atomic commit `bb50517`.)

## Known Stubs

None.

## Threat Flags

None — no new security surface. The changes are enforcement/tooling: a git-config command
on install (no dependency, no network — T-43-SC/T-43-19 accept/mitigate hold) and CI shell
that only reads git metadata and invokes the existing gate.

## Outstanding — milestone-close (GATE-04)

**GATE-04 LIVE-SHIP PROOF is still open** and must be closed at v1.3.0 milestone close, not
here: v1.3.0's real push to `main` must go GREEN through the new CI step. A passing push
proves the gate does NOT false-block; only `tests/docs-gate.test.js` proves it CAN block.
BOTH are required before the milestone is considered validated. This plan lands the
enforcement; the live-ship confirmation is a phase/milestone-exit item.

## Self-Check: PASSED

All 5 files present, `.claude/hooks/pre-commit` confirmed deleted, and all 4 commits
(`bb50517`, `fbfdc95`, `ebbefe8`, `8a7189a`) exist in the git log.
