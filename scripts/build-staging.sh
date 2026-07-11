#!/bin/sh
# build-staging.sh — the single, shared prod/pre-prod staging transform (DEBT-03).
#
# WHAT
#   Reproduce the Cloudflare-Pages deploy staging transform that used to live inline
#   in .github/workflows/deploy.yml (the "Prepare deploy directory" step): copy an
#   explicit file whitelist from the repo working tree into <target-dir>, then stamp
#   the deploy token into the STAGED copy of assets/version.js. Optionally append a
#   pre-prod-only `X-Robots-Tag: noindex` block to the STAGED _headers (--noindex).
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
#     - With --noindex, appends a second `/*` block carrying X-Robots-Tag: noindex to
#       <target-dir>/_headers ONLY (append, never edit the base CSP /* block — Pitfall 2).
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

# --- Pre-prod-only noindex divergence (D-09 / Pitfall 2) ---------------------------
# Append a SECOND `/*` block to the STAGED _headers only. Appending (never editing the
# existing block) keeps the base CSP /* block byte-identical, and the committed
# _headers is untouched because we write into "$TARGET".
if [ "$NOINDEX" = "--noindex" ]; then
  printf '\n/*\n  X-Robots-Tag: noindex\n' >> "$TARGET/_headers"
fi
