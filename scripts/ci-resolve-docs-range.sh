#!/bin/sh
#
# ci-resolve-docs-range.sh — the shared, fail-closed CI docs-gate range resolver.
#
# WHAT: prints (to stdout) the single git commit range that scripts/docs-gate.js
# must evaluate for the current push, ANCHORED to the last-deployed commit read
# from the remote `deploy` branch so a cancelled/superseded run's commits are
# re-covered on the next successful run (self-healing) rather than silently
# skipped. Both .github/workflows/deploy.yml and tests/ci-resolve-docs-range.test.js
# invoke this ONE script — one implementation, two callers (D-01/D-17), the same
# shape the gate itself uses.
#
# WHY it exists as a separate script (CR-01, D-21): the range decision is gate
# BEHAVIOR, and the project's standing rule is that runtime-behavior code needs a
# falsifiable behavior test. Inline YAML shell cannot be unit-tested, so the logic
# lives here where a stubbed-git test can drive every ls-remote exit code.
#
# THE FIX (CR-01): `git ls-remote --exit-code --heads origin deploy` returns
#   0   → the branch exists          → anchored range
#   2   → the branch is genuinely absent → first-run bootstrap (tip commit only)
#   !=0,2 (e.g. 128) → a network/auth fault — we CANNOT prove the branch is absent
# The old inline deploy.yml conflated ALL non-zero codes into the bootstrap branch,
# so a transient rc=128 on an EXISTING deploy branch collapsed the range to the tip
# commit only and silently un-gated the rest of a multi-commit push. This resolver
# captures the exact exit code and branches THREE ways: any code not in {0,2} fails
# CLOSED (exit 1). A gate that fails open under a realistic infra fault is not "the
# unbypassable layer".
#
# CONTRACT:
#   stdout — EXACTLY the one resolved range line, nothing else.
#   stderr — every banner, notice, diagnostic, and recovery runbook.
#   exit 0 — only on a resolvable anchored range or a genuine first-run bootstrap.
#   exit 1 — any ls-remote rc not in {0,2}, a fetch failure on an existing branch,
#            or an unresolvable deploy anchor (fail closed).
#
# ENV: GITHUB_SHA — the tip commit of the push (set by GitHub Actions).

set -eu

# The WR-02 recovery runbook. Printed (to stderr) whenever the deploy anchor cannot
# be resolved. A `Docs-Emergency-Skip:` trailer CANNOT rescue this condition because
# this shell runs BEFORE scripts/docs-gate.js reads any trailer — so the recovery is
# operational, not a commit trailer. It is deliberately non-destructive.
print_recovery_runbook() {
  {
    echo "------------------------------------------------------------"
    echo "  DOCS GATE RECOVERY RUNBOOK (anchor unresolvable)"
    echo "------------------------------------------------------------"
    echo "  The docs-gate anchor is read from the remote 'deploy' branch's"
    echo "  'Deploy from <sha>' commit subject. It could not be resolved in this"
    echo "  checkout — typically because main's history was rewritten and the"
    echo "  recorded deploy commit is no longer reachable, or the subject was"
    echo "  mangled."
    echo ""
    echo "  A 'Docs-Emergency-Skip:' commit trailer CANNOT bypass this: this"
    echo "  resolver runs BEFORE scripts/docs-gate.js, so no trailer is read here."
    echo ""
    echo "  Non-destructive recovery (pick one):"
    echo "    1. Delete the remote 'deploy' branch:"
    echo "         git push origin --delete deploy"
    echo "       The next deploy sees ls-remote rc=2 and takes the first-run"
    echo "       bootstrap path (tip commit only), then re-anchors normally."
    echo "    2. Re-point 'deploy' to a commit reachable from main's current tip"
    echo "       so its 'Deploy from <sha>' subject resolves again."
    echo "  Neither touches main or any source; both only reset the deploy anchor."
    echo "------------------------------------------------------------"
  } >&2
}

# Resolve the remote 'deploy' branch's existence explicitly, capturing the EXACT
# ls-remote exit code (the CR-01 fix hinges on distinguishing 2 from 128).
set +e
git ls-remote --exit-code --heads origin deploy >/dev/null 2>&1
rc=$?
set -e

if [ "$rc" -eq 0 ]; then
  # ── Existing branch → anchored range ──────────────────────────────────────
  if ! git fetch --no-tags origin deploy >/dev/null 2>&1; then
    echo "DOCS GATE: 'deploy' branch exists but could not be fetched — failing closed." >&2
    exit 1
  fi
  subject="$(git log FETCH_HEAD -1 --format=%s)"
  # The deploy commit message is "Deploy from <sha>". Accept a 7–40 hex token
  # (tolerates the pre-widening 7-char tip on the first run after this change).
  token="$(printf '%s\n' "$subject" | sed -n 's/^Deploy from \([0-9a-fA-F]\{7,40\}\).*/\1/p')"
  if [ -z "$token" ]; then
    echo "DOCS GATE: could not read a deploy anchor from '$subject' — failing closed." >&2
    print_recovery_runbook
    exit 1
  fi
  if ! anchor="$(git rev-parse --verify "${token}^{commit}" 2>/dev/null)"; then
    echo "DOCS GATE: deploy anchor '$token' does not resolve in this checkout — failing closed." >&2
    print_recovery_runbook
    exit 1
  fi
  echo "${anchor}..${GITHUB_SHA}"
elif [ "$rc" -eq 2 ]; then
  # ── Genuinely-absent branch → first-run bootstrap (tip commit only) ───────
  # This is the ONLY case that takes the bootstrap fallback.
  {
    echo "============================================================"
    echo "  DOCS GATE NOTICE — no 'deploy' branch yet (first-run bootstrap)"
    echo "  Only the tip commit ${GITHUB_SHA} is evaluated this run."
    echo "============================================================"
  } >&2
  echo "${GITHUB_SHA}^..${GITHUB_SHA}"
else
  # ── Any other rc (e.g. 128) → CANNOT prove the branch is absent → fail closed.
  # This is the CR-01 fix: a network/auth fault must NOT reach the bootstrap path.
  echo "DOCS GATE: ls-remote failed (rc=$rc) — cannot prove the deploy branch is absent; failing closed." >&2
  exit 1
fi
