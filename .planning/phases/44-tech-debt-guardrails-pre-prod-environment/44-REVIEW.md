---
phase: 44-tech-debt-guardrails-pre-prod-environment
reviewed: 2026-07-12T07:37:06Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - .github/workflows/deploy-preprod.yml
  - .github/workflows/deploy.yml
  - .gitignore
  - assets/add-client.js
  - scripts/build-staging.sh
  - scripts/cf-await-promotion.sh
  - tests/30-fake-test-detector.test.js
  - tests/build-staging.test.js
  - tests/cf-await-promotion.test.js
  - tests/conventions-hygiene.test.js
findings:
  critical: 0
  warning: 6
  info: 6
  total: 12
status: issues_found
---

# Phase 44: Code Review Report

**Reviewed:** 2026-07-12T07:37:06Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed the Phase 44 deploy-pipeline hardening: the shared `build-staging.sh` transform, the fail-closed `cf-await-promotion.sh` sentinel-then-purge script, the prod/pre-prod workflow rewiring, the `.gitignore` whitelist additions, the DEBT-01 one-line `console.warn` reword in `assets/add-client.js`, and the four test files. All four test suites were executed and pass (5/5, 6/6, 3/3, detector green with the two new allowlist entries consistent).

Core correctness verified against the real repo: the `cf-await-promotion.sh` grep pattern (`BUILD_TOKEN = '<short>'`, closing quote included) matches the stamped `assets/version.js` line and correctly rejects a full-SHA body; the `sed` stamp preserves the split-string `'__BUILD' + '_TOKEN__'` dev check on line 33 of version.js; the awk `$0 == "/*"` insert matches the committed `_headers` line 1; `/assets/version.js` is `no-cache` so the sentinel poll revalidates against origin. The `.gitignore` whitelist covers every script the workflows invoke. The docs-gate step runs before any push to the `deploy` branch, and pre-prod provably cannot move the docs-gate anchor (separate branch, separate concurrency group).

No blockers found. The warnings cluster on two themes: (1) fail-open edges in `build-staging.sh`'s `--noindex` path — the one sanctioned divergence can silently no-op — and (2) the purge tail of `cf-await-promotion.sh`, where misconfiguration or a hard curl failure degrades the loud, operator-guiding failure the script was built to deliver, plus a new post-push/pre-purge cancellation window that recreates the DEBT-02 mixed-cache condition without a red run.

## Warnings

### WR-01: `--noindex` silently no-ops if the staged `_headers` has no bare `/*` line

**File:** `scripts/build-staging.sh:93-97`
**Issue:** The awk insert fires only on a line that is exactly `/*` (`$0 == "/*"` — no trim). If `_headers` is ever reformatted (leading/trailing whitespace, block reordering so the bare `/*` disappears), the awk pass completes with exit 0 and the pre-prod origin ships **without** `X-Robots-Tag: noindex` — the single sanctioned divergence fails open, silently. The pinning test (`build-staging.test.js` case 4) would catch it, but no CI job runs the test suite (see IN-04) and the pre-push hook runs only the docs gate, so nothing in the deploy path re-checks the insert. The script itself is the last line of defense and currently has none.
**Fix:** Verify the insert landed and fail closed:
```sh
if [ "$NOINDEX" = "--noindex" ]; then
  awk '{ print; if (!done && $0 == "/*") { print "  X-Robots-Tag: noindex"; done = 1 } }' \
    "$TARGET/_headers" > "$TARGET/_headers.tmp"
  mv "$TARGET/_headers.tmp" "$TARGET/_headers"
  grep -q 'X-Robots-Tag: noindex' "$TARGET/_headers" || {
    echo "build-staging: --noindex insert failed — no bare '/*' line found in _headers" >&2
    exit 1
  }
fi
```

### WR-02: Unknown second argument is silently ignored — a typo'd `--noindex` produces an indexable pre-prod

**File:** `scripts/build-staging.sh:56,93`
**Issue:** `NOINDEX="${2:-}"` is only compared with `[ "$NOINDEX" = "--noindex" ]`. Any other value (`--no-index`, `--noidex`, a stray extra arg) is accepted without error and the noindex path is skipped. In a caller like a future workflow edit, a one-character typo yields exit 0 and an indexable staging origin — the same fail-open class as WR-01, but reachable from the call site rather than from `_headers` drift. `$3+` is likewise ignored.
**Fix:** Reject anything that is not empty or exactly `--noindex`:
```sh
NOINDEX="${2:-}"
if [ -n "$NOINDEX" ] && [ "$NOINDEX" != "--noindex" ]; then
  echo "build-staging: unknown argument '$NOINDEX' (expected --noindex)" >&2
  exit 2
fi
if [ "$#" -gt 2 ]; then
  echo "build-staging: too many arguments" >&2
  exit 2
fi
```

### WR-03: `CF_ZONE_ID`/`CF_PURGE_TOKEN` are not validated before the poll loop — misconfig is discovered only after promotion, in the exact mixed-cache state

**File:** `scripts/cf-await-promotion.sh:41-52,76-80`
**Issue:** `set -u` catches an *unset* variable, but GitHub Actions injects a missing secret as an **empty string**, which `set -u` does not catch. With empty secrets, the script polls (up to 5 minutes), confirms promotion, then POSTs to `.../zones//purge_cache` with an empty bearer token — guaranteed failure, exit 1. The operator learns of the misconfig only after the origin has already been confirmed new with the edge unpurged: precisely the mixed-cache condition (origin=new, edge=old) this script exists to prevent, now held open until a human intervenes. An unset var is worse: the `set -u` abort at line 77 prints a bare shell error with no runbook guidance.
**Fix:** Fail fast before the poll loop:
```sh
for v in GITHUB_SHA CF_ZONE_ID CF_PURGE_TOKEN; do
  eval "val=\${$v:-}"
  [ -n "$val" ] || { echo "cf-await-promotion: $v is required and non-empty" >&2; exit 1; }
done
```
(or three explicit `[ -n "${CF_ZONE_ID:-}" ]` checks if `eval` is unwanted).

### WR-04: A hard curl failure on the purge POST skips the loud mixed-cache diagnostic

**File:** `scripts/cf-await-promotion.sh:76-80`
**Issue:** Unlike the poll (line 61, `|| true`), the purge `resp="$(curl -sS -X POST ...)"` has no failure guard. Under `set -e`, a curl transport failure (DNS blip, TLS error, connection reset — plausible right after a 5-minute wait) aborts the script at the assignment with curl's exit code. Exit is non-zero (fail-closed direction is preserved), but the block at lines 82-89 never runs, so the log carries only curl's terse error — **not** the `"purge failed AFTER confirmed promotion — edge may serve a mixed cache; re-run this job"` runbook line, which is the entire operator-guidance payload of this failure mode (the CONTRACT header promises "loud" for exactly this case).
**Fix:** Let the grep branch own all purge failures:
```sh
resp="$(curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_PURGE_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}' || true)"
```
An empty/partial `resp` then fails the `"success":true` grep and prints the loud diagnostic.

### WR-05: No `--max-time` on any curl call — a stalled connection can hang the deploy far past `SENTINEL_TIMEOUT`

**File:** `scripts/cf-await-promotion.sh:61,76`
**Issue:** The deadline (line 66) is checked only *between* polls. curl without `--max-time`/`--connect-timeout` has no overall transfer timeout, so a single poll against a server that accepts the connection but never responds blocks indefinitely — `SENTINEL_TIMEOUT=300` is never consulted again, and the job runs until the GitHub Actions job-level timeout (6h default) kills it, burning runner minutes and delaying the deploy signal. Same exposure on the purge POST.
**Fix:** Bound each request, e.g. `curl -fsS --max-time 20 --connect-timeout 10 ...` on the poll and `--max-time 30` on the purge POST (both well under `SENTINEL_INTERVAL`-scale so the deadline check stays live).

### WR-06: `cancel-in-progress: true` + the new 0–300s await window can cancel between deploy-branch push and purge — recreating the DEBT-02 condition with no failed run

**File:** `.github/workflows/deploy.yml:7-9,64-87`
**Issue:** The concurrency block predates this phase, but the reviewed change turns the push→purge gap from milliseconds into up to 5 minutes of polling. If a second push to main arrives during that window, the in-flight run is **cancelled** after `git push -f origin deploy` (origin promotes the new assets) but before the purge — origin=new, edge=old. The superseding run normally heals this with its own purge, but if it fails its docs gate (step 1), it never pushes and never purges, and the pipeline ends with one *cancelled* run and one *gate-failed* run — no run that says "purge missing", and the deploy anchor already moved. That is the v1.3.0 mixed-cache condition slipping back in through workflow cancellation rather than timing.
**Fix:** Set `cancel-in-progress: false` for the deploy group (runs queue instead of cancel — each completed run purges), or document the residual window and add the same "re-run this job" runbook note to the workflow comment. Queuing is the cheap, correct option for a pipeline whose whole design goal is push→purge atomicity.

## Info

### IN-01: Purge success check is whitespace-sensitive JSON matching

**File:** `scripts/cf-await-promotion.sh:82`
**Issue:** `grep -q '"success":true'` depends on Cloudflare emitting compact JSON. A formatting change (`"success": true`) turns every successful purge into a false exit 1. Failure direction is safe (loud, re-runnable), but it is a latent recurring-red risk on an API whose response formatting is not contractual.
**Fix:** Tolerate whitespace: `grep -Eq '"success"[[:space:]]*:[[:space:]]*true'`.

### IN-02: Target directory is never cleaned — stale files from a previous run survive

**File:** `scripts/build-staging.sh:63`
**Issue:** `mkdir -p "$TARGET"` plus copy never removes pre-existing content. On CI (fresh checkout) this is moot, but a local or reused invocation into the same target keeps files deleted from the repo (e.g. a removed `*.html`), and the workflow's `git add -A` would ship them. The header claims the script is the no-leak invariant; the invariant only holds for a fresh target.
**Fix:** Either `rm -rf "$TARGET"` before `mkdir -p`, or document "target must not pre-exist" in the CONTRACT header and `exit 2` if it does.

### IN-03: `build-staging.sh` error paths untested

**File:** `tests/build-staging.test.js`
**Issue:** The spec pins the four happy-path contracts but not the two guard exits: missing target arg → exit 2 with usage, missing `GITHUB_SHA` → exit 2. A regression that drops `set -eu` or the guards would pass this suite.
**Fix:** Add two cases asserting `runBuild('')`-style invocations exit 2 with the expected stderr.

### IN-04: No CI job runs the test suite — the specs that pin these scripts gate nothing in the deploy path

**File:** `.github/workflows/deploy.yml`, `.github/workflows/deploy-preprod.yml`
**Issue:** `npm test` (172 test files, including the new fidelity/behavior specs) runs only when someone runs it locally; the pre-push hook runs only the docs gate. The workflows execute `build-staging.sh` and `cf-await-promotion.sh` in production without any prior check that their pinned contracts still hold. This is the amplifier for WR-01/WR-02: the tests that would catch the fail-open regressions are not in the path that ships them.
**Fix:** Add a cheap gate step (or a separate PR/push workflow) running at minimum `node tests/build-staging.test.js && node tests/cf-await-promotion.test.js` before "Prepare deploy directory". (Noting this may be a deliberate deferral — flagging so it is a decision, not an accident.)

### IN-05: Broad negative assertion `!/do not omit/i` on §Comments

**File:** `tests/conventions-hygiene.test.js:82-83`
**Issue:** "do not omit" is a generic English phrase; any future benign use in a rewritten §Comments (e.g. "do not omit the license header") false-fails this guard. The other two signature phrases are distinctive; this one is not.
**Fix:** Anchor it to the old mandate's context, e.g. `/do not omit[^.]*phase|plan/i`, or accept the brittleness knowingly.

### IN-06: `$SHORT` interpolated unescaped into `sed` and `grep` patterns

**File:** `scripts/build-staging.sh:81-82`, `scripts/cf-await-promotion.sh:50,62`
**Issue:** In CI, `GITHUB_SHA` is a trusted 40-hex string, so this is safe. But both scripts are documented as locally runnable, and a caller-supplied `GITHUB_SHA` containing `/` breaks the sed expression (and regex metacharacters would corrupt the grep match). Not an injection risk in the CI trust model — a local-robustness footnote.
**Fix:** Validate shape once: `case "$GITHUB_SHA" in *[!0-9a-f]*|'') echo "GITHUB_SHA must be lowercase hex" >&2; exit 2;; esac`.

---

**Verified clean (checked, no finding):**
- `assets/add-client.js:89` — the in-scope reworded `console.warn` carries no planning-ID token; behavior unchanged.
- `.gitignore` — the two new whitelist entries are correct and complete; every script the workflows invoke (`docs-gate.js`, `ci-resolve-docs-range.sh`, `build-staging.sh`, `cf-await-promotion.sh`, `scripts/lib/`) is version-controlled.
- `tests/30-fake-test-detector.test.js` — the two new ALLOWLIST entries (`conventions-hygiene`, `build-staging`) match how those files actually read `assets/*.js` (static audit / output-tree reads), and the detector run confirms both are candidates that would otherwise flag — the allowlist entries are load-bearing, not decorative.
- `tests/cf-await-promotion.test.js` case 6 — confirmed against the script that the grep pattern includes the closing quote, so the full-SHA body correctly fails the short-token match.
- `scripts/build-staging.sh` sed pattern — replaces only the quoted `'__BUILD_TOKEN__'` literal, preserving version.js's split-string `('__BUILD' + '_TOKEN__')` dev-fallback comparison.
- `_headers` preconditions — bare `/*` at line 1 (awk insert target) and `/assets/version.js` → `Cache-Control: no-cache` (sentinel poll not masked by edge cache) both hold.

---

_Reviewed: 2026-07-12T07:37:06Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
