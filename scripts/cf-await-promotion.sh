#!/bin/sh
#
# cf-await-promotion.sh — fail-closed deploy sentinel-then-blocking-purge.
#
# WHAT: after a deploy pushes new assets to Cloudflare Pages, POLL the live
# production origin for the new deploy token, and ONLY once the origin is
# confirmed serving it, PURGE the Cloudflare zone cache. Prints nothing to stdout
# on the happy path except a short progress/confirmation line; all banners and
# diagnostics go to stderr. deploy.yml (Wave 2, Plan 04) calls this ONE script to
# replace the old immediate, non-blocking purge; tests/cf-await-promotion.test.js
# drives every branch offline with a stubbed curl (D-21, feedback-behavior-verification).
#
# WHY it exists (DEBT-02): the v1.3.0 incident was a mixed-cache Integrity/
# Availability failure. The old deploy purged the edge on a fixed sleep, BEFORE
# Pages promoted, so edges re-cached OLD assets and poisoned installed PWA
# precaches. The mitigation is strict sequencing: confirm the live origin serves
# the new short-SHA BUILD_TOKEN FIRST (assets/version.js is served no-cache per
# _headers, so each poll revalidates against origin and is not masked by the stale
# edge), THEN purge. Both failure modes fail CLOSED:
#   - promotion never confirmed (poll timeout) → exit 1, NO purge. A uniformly-
#     stale cache is safe; a mixed one is not. Ben re-runs the job.
#   - purge fails AFTER confirmed promotion → exit 1, loud. Confirmed-new origin +
#     un-purged edge IS the mixed-cache bug; `gh run rerun` re-purges.
#
# CONTRACT:
#   stdout — a short progress/confirmation line only.
#   stderr — every banner, notice, diagnostic.
#   exit 0 — origin confirmed serving the new token AND purge succeeded.
#   exit 1 — poll timeout (no purge), or purge failure after a confirmed promotion.
#
# ENV:
#   GITHUB_SHA        — the tip commit of the push (set by GitHub Actions). Only its
#                       first 7 hex chars are polled for (the deploy seds
#                       __BUILD_TOKEN__ → ${GITHUB_SHA::7}); NEVER the full SHA.
#   CF_ZONE_ID        — Cloudflare zone id for the purge (existing secret).
#   CF_PURGE_TOKEN    — Cloudflare API token for the purge (existing secret).
#   POLL_URL          — override the poll target (default the live version.js).
#   SENTINEL_INTERVAL — seconds between polls (default 10).
#   SENTINEL_TIMEOUT  — total seconds to await promotion before failing (default 300).

set -eu

POLL_URL="${POLL_URL:-https://sessionsgarden.app/assets/version.js}"
SENTINEL_INTERVAL="${SENTINEL_INTERVAL:-10}"
SENTINEL_TIMEOUT="${SENTINEL_TIMEOUT:-300}"

# ── Fail-fast env validation ─────────────────────────────────────────────────
# `set -u` catches an UNSET variable, but GitHub Actions injects a MISSING
# secret as an EMPTY string, which -u does not catch. With empty creds the
# script would poll up to 5 minutes, confirm promotion, then fail the purge —
# discovering the misconfig only in the exact mixed-cache state (origin=new,
# edge=old) it exists to prevent. Validate all three before the first poll.
[ -n "${GITHUB_SHA:-}" ] || {
  echo "ERROR: GITHUB_SHA is required and non-empty; refusing to start." >&2
  exit 1
}
[ -n "${CF_ZONE_ID:-}" ] || {
  echo "ERROR: CF_ZONE_ID is required and non-empty (missing secret?); refusing to poll — fix the secret and re-run." >&2
  exit 1
}
[ -n "${CF_PURGE_TOKEN:-}" ] || {
  echo "ERROR: CF_PURGE_TOKEN is required and non-empty (missing secret?); refusing to poll — fix the secret and re-run." >&2
  exit 1
}

# The short SHA is the FIRST 7 chars of GITHUB_SHA (Pitfall 1 — never the full
# SHA). POSIX `printf '%.7s'` is used, NOT bash-only ${GITHUB_SHA::7}, because this
# script runs under `sh`.
SHORT="$(printf '%.7s' "$GITHUB_SHA")"

DEADLINE=$(( $(date +%s) + SENTINEL_TIMEOUT ))
echo "Awaiting promotion of ${SHORT} at ${POLL_URL}"

# ── Content-sentinel promotion poll ──────────────────────────────────────────
# Poll the no-cache version.js until the body carries the new short-SHA token.
# `curl -fsS` with a cache-buster; `|| true` so a transient curl failure just
# retries rather than tripping `set -e`. The grep pattern includes the CLOSING
# quote so a body carrying the full SHA does NOT satisfy the short-token match.
# `--max-time`/`--connect-timeout` bound each request: the DEADLINE is checked
# only BETWEEN polls, so without a per-request cap a server that accepts the
# connection but never responds would hang one poll indefinitely — the
# SENTINEL_TIMEOUT would never be consulted again and the job would run until
# the Actions job-level timeout (6h default). Both caps are well under
# SENTINEL_INTERVAL-scale so the deadline check stays live.
while :; do
  body="$(curl -fsS --max-time 20 --connect-timeout 10 -H 'Cache-Control: no-cache' "${POLL_URL}?cb=$(date +%s)" || true)"
  if printf '%s' "$body" | grep -q "BUILD_TOKEN = '${SHORT}'"; then
    echo "Promotion confirmed: live origin serves ${SHORT}."
    break
  fi
  if [ "$(date +%s)" -ge "$DEADLINE" ]; then
    echo "ERROR: timed out waiting for promotion of ${SHORT}; NOT purging (a uniformly-stale cache is safe, a mixed one is not)." >&2
    exit 1
  fi
  sleep "$SENTINEL_INTERVAL"
done

# ── Blocking purge (only after a confirmed match) ────────────────────────────
# Now that the origin is confirmed new, a purge FAILURE is the mixed-cache
# condition (origin=new, edge=old for up to 24h), so it must block: exit 1 loudly.
# `|| true` so a hard curl transport failure (DNS blip, TLS error, reset) does
# NOT abort at this assignment under `set -e` with only curl's terse error: an
# empty/partial $resp falls through to the grep below, which owns ALL purge
# failures and prints the loud mixed-cache runbook diagnostic the CONTRACT
# promises. The exit is 1 either way — only the loudness is at stake.
resp="$(curl -sS --max-time 30 -X POST \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_PURGE_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}' || true)"

if printf '%s' "$resp" | grep -q '"success":true'; then
  echo "Cache purged."
  exit 0
else
  echo "ERROR: purge failed AFTER confirmed promotion — edge may serve a mixed cache; re-run this job." >&2
  printf '%s\n' "$resp" >&2
  exit 1
fi
