#!/usr/bin/env bash
#
# D-22 rename post-condition. Both directions, whole repo, fail-closed.
#
# Ben accepted the live-files-only rename on one condition: "as long as we make sure
# 'on live files only' is with high conviction." This script IS that conviction.
# A promise is not a mechanism.
#
# Direction (i)  no live file still references an old test-file token (a rename was missed).
# Direction (ii) no historical artifact was modified at all (the record was rewritten).
#
# Direction (ii) is a CONTENT diff, not a token grep. A clobber that happens to leave the
# token intact would slip past a grep. A SUMMARY saying "created tests/42_1-help-integrity.test.js"
# is a true statement about a past event; rewriting it makes the record claim an executor did
# something it did not do.
#
# Usage:  GSD_PLAN_BASE_SHA=<sha-before-first-rename-commit> bash <this script>
# Exits 0 and prints POSTCOND-OK only if BOTH directions hold.

set -euo pipefail

# Fail closed. `git diff ..HEAD` with an empty left side is a silent no-op, which would
# make direction (ii) always pass. That is the fail-open D-04 forbids.
: "${GSD_PLAN_BASE_SHA:?FAIL: GSD_PLAN_BASE_SHA is unset — direction (ii) cannot be checked}"

TOKENS='39-help-integrity|42-changelog-integrity|42_1-help-integrity|42_1-changelog-integrity-locale|28-04-integrity-state'

# Paths that are allowed to still contain an old token AFTER the rename:
#   .planning/phases/NN-*   (NN != 43)  historical artifacts — true statements about past events
#   .planning/milestones/**              archived milestones
#   .planning/phases/43-*                this phase's own planning docs (they discuss the rename)
#   .planning/codebase/TESTING.md        the rename map — containing old tokens is its entire purpose
#
# Everything else is a LIVE file and must be clean. Expressed as a prefix regex so the check
# does not rot if the live allowlist changes.
LIVE_PREFIXES='^(assets/|tests/|\.planning/(REQUIREMENTS|ROADMAP)\.md)'

fail=0

# ---- Direction (ii): no historical artifact modified ------------------------------------
clobber="$(git diff --name-only "${GSD_PLAN_BASE_SHA}"..HEAD -- .planning/phases/ .planning/milestones/ \
  | { grep -v '^\.planning/phases/43-' || true; })"

if [ -n "$clobber" ]; then
  echo "DIR-2 FAIL — historical artifact(s) modified. The record must not be rewritten:"
  printf '  %s\n' $clobber
  fail=1
fi

# ---- Direction (i): no live file retains an old token -----------------------------------
after="$(git grep -lE "$TOKENS" 2>/dev/null || true)"
stragglers="$(printf '%s\n' "$after" | { grep -E "$LIVE_PREFIXES" || true; })"

if [ -n "$stragglers" ]; then
  echo "DIR-1 FAIL — live file(s) still reference an old test token:"
  printf '  %s\n' $stragglers
  fail=1
fi

# ---- TESTING.md housekeeping -------------------------------------------------------------
live_count="$(ls tests/*.test.js | wc -l | tr -d ' ')"
if ! grep -q "$live_count" .planning/codebase/TESTING.md; then
  echo "FAIL — TESTING.md does not carry the live test count ($live_count); the stale figure was not corrected."
  fail=1
fi

if ! grep -qE "$TOKENS" .planning/codebase/TESTING.md; then
  echo "FAIL — TESTING.md carries no rename map (no old tokens found). D-22 requires the old→new table."
  fail=1
fi

[ "$fail" -eq 0 ] || exit 1

echo "POSTCOND-OK"
echo "  direction (i):  no live file references an old token"
echo "  direction (ii): no historical artifact modified since ${GSD_PLAN_BASE_SHA}"
echo "  after-set: $(printf '%s\n' "$after" | grep -c . || true) files (expected: ~50 historical + 43-* docs + TESTING.md)"
