#!/bin/sh
# build-staging.sh — the single, shared prod/pre-prod staging transform (DEBT-03).
#
# WHAT
#   Reproduce the Cloudflare-Pages deploy staging transform that used to live inline
#   in .github/workflows/deploy.yml (the "Prepare deploy directory" step): copy an
#   explicit file whitelist from the repo working tree into <target-dir>, then stamp
#   the deploy token into the STAGED copy of assets/version.js. Optionally insert a
#   pre-prod-only `X-Robots-Tag: noindex` line into the base `/*` block of the
#   STAGED _headers (--noindex).
#
# WHY
#   One transform, two callers. Wave-2 deploy.yml (prod) and deploy-preprod.yml
#   (pre-prod) both invoke this script instead of each carrying their own copy of the
#   shell, so the prod and pre-prod staging trees can never drift (D-07). The only
#   sanctioned divergence is the single --noindex flag (D-09): pre-prod ships behind a
#   noindex header so the staging origin is never indexed, while prod does not.
#
# CONTRACT
#   Usage: sh scripts/build-staging.sh <target-dir> [--noindex]
#     - Runs from the repo root (source = current working directory).
#     - Requires GITHUB_SHA in the environment (the commit SHA to stamp).
#     - Copies EXACTLY the D-08 whitelist into <target-dir>:
#         _headers, _redirects, LICENSE, *.html, assets/ (recursive), manifest.json, sw.js
#       Nothing outside this whitelist is copied — that is the no-leak invariant
#       (.planning / .claude / CLAUDE.md / .env can never reach the staged tree).
#     - Stamps the 7-hex short SHA into <target-dir>/assets/version.js, replacing the
#       '__BUILD_TOKEN__' placeholder. The COMMITTED assets/version.js is never touched.
#     - With --noindex, INSERTS the line `  X-Robots-Tag: noindex` into the existing
#       first `/*` block of <target-dir>/_headers ONLY (right after the bare `/*`
#       pattern line). WHY insert-into-the-block, NOT an appended second `/*` block:
#       live verification on the real pre-prod origin (2026-07-12) proved Cloudflare
#       Pages treats a DUPLICATE identical path pattern in _headers as
#       LAST-ONE-WINS, not merge — an appended second `/*` block replaced the base
#       block and silently wiped Content-Security-Policy, X-Frame-Options, and
#       Permissions-Policy from every pre-prod response. (Non-duplicate patterns
#       like `/*.js` + `/assets/version.js` DO merge.) The D-09 intent is
#       unchanged: the divergence lives in the STAGED copy only.
#     - Writes ONLY under <target-dir>; the committed _headers/version.js stay byte-identical.
#
#   Portability: POSIX sh, no bashisms. The token substitution uses a redirect+mv
#   (NOT `sed -i`) so the offline test drives it identically on developer macOS (BSD
#   sed, where `sed -i` needs a backup-suffix arg) and ubuntu CI (GNU sed). The short
#   SHA uses `printf '%.7s'` (NOT bash `${GITHUB_SHA::7}`) for the same reason.
#
#   Contract pinned by: tests/build-staging.test.js (whitelist completeness, token
#   stamp, no-leak, noindex divergence). See 44-03-PLAN.md / T-44-05 / T-44-06.

set -eu

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  echo "usage: sh scripts/build-staging.sh <target-dir> [--noindex]" >&2
  exit 2
fi
NOINDEX="${2:-}"
# Reject anything that is not empty or exactly --noindex: a typo'd flag
# (--no-index, --noidex) or a stray extra arg would otherwise be silently
# ignored and yield an INDEXABLE pre-prod origin with exit 0 — the same
# fail-open class as a missed _headers insert, reachable from the call site.
if [ -n "$NOINDEX" ] && [ "$NOINDEX" != "--noindex" ]; then
  echo "build-staging: unknown argument '$NOINDEX' (expected --noindex)" >&2
  exit 2
fi
if [ "$#" -gt 2 ]; then
  echo "build-staging: too many arguments" >&2
  exit 2
fi

if [ -z "${GITHUB_SHA:-}" ]; then
  echo "build-staging: GITHUB_SHA is required in the environment" >&2
  exit 2
fi

mkdir -p "$TARGET"

# --- Whitelist copy (byte-faithful to deploy.yml "Prepare deploy directory") ------
# Include per D-08: _headers, _redirects, LICENSE, *.html, assets/, manifest.json, sw.js.
# This explicit whitelist IS the no-leak guard: nothing else is ever copied.
cp _headers "$TARGET/"
cp _redirects "$TARGET/"
cp LICENSE "$TARGET/"
cp *.html "$TARGET/"
cp -r assets "$TARGET/"
cp manifest.json "$TARGET/"
cp sw.js "$TARGET/"

# --- Stamp the deploy token into the STAGED version.js only (D-02/D-04) ------------
# Replace the '__BUILD_TOKEN__' placeholder with the git short-hash so INTEGRITY_TOKEN
# becomes the commit short-hash in the deployed copy; CACHE_NAME auto-derives from it.
# POSIX short-SHA (NOT bash ${GITHUB_SHA::7}); portable substitution via redirect+mv
# (NOT `sed -i`) so this runs identically on BSD sed (macOS) and GNU sed (ubuntu CI).
SHORT=$(printf '%.7s' "$GITHUB_SHA")
sed "s/'__BUILD_TOKEN__'/'$SHORT'/" "$TARGET/assets/version.js" > "$TARGET/assets/version.js.tmp"
mv "$TARGET/assets/version.js.tmp" "$TARGET/assets/version.js"

# --- Pre-prod-only noindex divergence (D-09) ---------------------------------------
# INSERT `  X-Robots-Tag: noindex` into the existing first `/*` block of the STAGED
# _headers, right after the bare `/*` pattern line. A duplicate `/*` block is
# FORBIDDEN: CF Pages resolves duplicate identical path patterns last-one-wins (live
# pre-prod finding, 2026-07-12), so a second `/*` block would replace the base block
# and wipe the CSP/X-Frame-Options/Permissions-Policy security headers. Portable awk
# + redirect+mv (no gawk-isms, no sed -i) so BSD (macOS) and GNU (ubuntu CI) agree.
# The committed _headers is untouched because we write into "$TARGET" only.
if [ "$NOINDEX" = "--noindex" ]; then
  awk '{ print; if (!done && $0 == "/*") { print "  X-Robots-Tag: noindex"; done = 1 } }' \
    "$TARGET/_headers" > "$TARGET/_headers.tmp"
  mv "$TARGET/_headers.tmp" "$TARGET/_headers"
  # Fail CLOSED if the insert did not land: the awk above fires only on a line
  # that is exactly `/*`, so a reformatted _headers (whitespace, block
  # reordering) would otherwise exit 0 and ship an INDEXABLE pre-prod origin —
  # the one sanctioned divergence silently failing open. Verify it landed.
  grep -q 'X-Robots-Tag: noindex' "$TARGET/_headers" || {
    echo "build-staging: --noindex insert failed — no bare '/*' line found in _headers" >&2
    exit 1
  }
fi
