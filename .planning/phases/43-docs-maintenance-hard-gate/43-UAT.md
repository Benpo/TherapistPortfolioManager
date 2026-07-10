---
status: testing
phase: 43-docs-maintenance-hard-gate
source: [43-VERIFICATION.md]
started: 2026-07-10T18:42:25Z
updated: 2026-07-10T18:42:25Z
---

## Current Test

number: 1
name: GATE-04 live-ship proof at v1.3.0 milestone close
expected: |
  The "Docs gate (fail-closed)" CI step passes on the real v1.3.0 release push,
  echoes a range with commit count > 1 (or a correct rc=2 bootstrap notice if this
  is genuinely the first run since the resolver shipped), and the deploy proceeds.
awaiting: user response

## Tests

### 1. GATE-04 live-ship proof at v1.3.0 milestone close
expected: Push v1.3.0's real release commit to `main` and confirm the new CI docs-gate step (`.github/workflows/deploy.yml` → `scripts/ci-resolve-docs-range.sh` → `scripts/docs-gate.js`) runs GREEN against the anchored range, and that a genuine multi-commit push is gated (not tip-only). The step passes, echoes a range with commit count > 1 (or a correct rc=2 bootstrap notice on the true first run), and the deploy proceeds. Not reproducible locally — requires a real GitHub Actions run; the last successful deploy run (2026-07-07) predates all Phase 43 commits.
result: [pending]

### 2. Escape-hatch documentation precision (WR-01/WR-02/WR-03 new findings in 43-REVIEW.md)
expected: Maintainer decision on the three documentation-precision findings from the post-gap-closure review — (a) CLAUDE.md says `Docs-Emergency-Skip:` "bypasses the whole gate" but it does not bypass Phase-1 invariants (stricter than documented); (b) the in-code comment claiming inherited `*-Unaffected` trailers are file-scoped/harmless is wrong for the push-global `Changelog-Unaffected`; (c) help/changelog satisfaction is any-locale rather than EN-only (EN is the corpus of record). Decide: accept as documented limitations (then fix CLAUDE.md/comments to state them honestly) or tighten in code. None defeats the core "no shipping without docs" promise.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
