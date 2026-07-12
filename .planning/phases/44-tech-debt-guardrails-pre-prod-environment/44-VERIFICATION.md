---
phase: 44-tech-debt-guardrails-pre-prod-environment
verified: 2026-07-12T07:43:03Z
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "When the accumulated local work (Phase 44 + everything since origin/main's current tip 0cae46e) is finally pushed to origin/main, confirm the TIP commit of that push carries both docs-gate trailer lines verbatim: `Changelog-Unaffected: — DevTools-only console.warn reword, not user-facing` and `Help-Unaffected: assets/add-client.js — internal log-string reword, no help surface` (or that an equivalent EN changelog/help edit satisfies the demand instead)."
    expected: "scripts/docs-gate.js does not block the push; the trailers (or equivalent EN edits) are present on the tip commit per CLAUDE.md's Definition of Done contract."
    why_human: "origin/main is currently still at pre-v1.4 commit 0cae46e — the push carrying assets/add-client.js (09ab1f3) has not happened yet, so this key link cannot be observed in the repository today. It is a future action correctly documented in 44-01-SUMMARY.md but not independently checkable until push time."

  - test: "Review 44-REVIEW.md finding WR-06 (cancel-in-progress + the new 0-300s promotion-await window can cancel a deploy run between the deploy-branch push and the purge, recreating a DEBT-02-class mixed-cache condition with no failed run to signal it) and decide whether to accept the residual risk or apply the suggested fix (queue instead of cancel, or document the runbook note)."
    expected: "A conscious accept/fix decision recorded (e.g. a follow-up todo or a queued fix), since the code-review is not itself a phase gate."
    why_human: "This is a judgment call about risk tolerance on a narrow concurrent-push race window; it does not fail any of this phase's stated success criteria (the primary v1.3.0 immediate-non-blocking-purge incident class is closed and tested), but a human should decide whether the residual edge case needs a follow-up."
---

# Phase 44: Tech-Debt Guardrails & Pre-Prod Environment Verification Report

**Phase Goal:** Development guardrails and the deploy pipeline are hardened before any feature work begins — new planning references can't leak into shipped code (per the re-cut: corrected CONVENTIONS.md instructions + the one runtime leak removed, NO enforcement gate this milestone), cache purges can't race the Pages promotion, and a real pre-prod environment exists for on-device pre-release testing.
**Verified:** 2026-07-12T07:43:03Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `CONVENTIONS.md` §Comments no longer instructs agents to cite phase/plan IDs; carries the strip-all-planning-IDs rule with both rationales, the 4-slot banner shape, and the `{slug}.test.js` naming rule (DEBT-01, re-cut criterion 1) | ✓ VERIFIED | `.planning/codebase/CONVENTIONS.md:149-192` read directly — old "cite the phase and plan … do not omit" mandate absent, strip-all rule + both rationales (archived-`.planning` dangling refs, `assets/**` DevTools exposure) + banner shape + test-naming rule all present. `node tests/conventions-hygiene.test.js` → 3/3 pass, exit 0 |
| 2 | The single runtime planning-ref leak (`assets/add-client.js` large-photo `console.warn`) no longer prints a decision-ID token, keeps the no-hard-cap rationale in plain prose | ✓ VERIFIED | `assets/add-client.js:89` read directly: `"Large photo upload:", file.size, "bytes — proceeding (soft warning only, no hard size cap)"` — no `D-\d+` token. Pinned by the same test above |
| 3 | No enforcement/test gate over shipped comments ships this phase (D-01 prohibition) | ✓ VERIFIED | `tests/conventions-hygiene.test.js` read in full — 3 narrowly-scoped assertions only (old mandate absent, new rule present, one specific line de-IDed); explicitly does NOT blanket-scan for `D-\d+` across the file (documented in its own header) |
| 4 | Deploy purges the Cloudflare cache only AFTER Pages promotion is confirmed live via the new short-SHA token; poll timeout and purge failure both fail closed with no purge / loud stderr (DEBT-02, re-cut criterion 2) | ✓ VERIFIED | `scripts/cf-await-promotion.sh` read directly — sentinel poll loop before purge, `exit 1` + no purge on timeout, `exit 1` + loud stderr on purge failure. `node tests/cf-await-promotion.test.js` → 6/6 pass (all four exit-code cases + short-SHA guard + `_headers` no-cache precondition), exit 0 |
| 5 | `deploy.yml` wires both scripts in: stages via `build-staging.sh`, purges via `cf-await-promotion.sh` positioned after the deploy-branch push; prod trigger/docs-gate/anchor/topology otherwise unchanged | ✓ VERIFIED | `.github/workflows/deploy.yml` read directly — `sh scripts/build-staging.sh deploy-staging` (Prepare deploy directory step), `sh scripts/cf-await-promotion.sh` (Await promotion, then purge step, after Push to deploy branch); trigger `push: branches:[main]`, docs-gate step, full-SHA `Deploy from ${GITHUB_SHA}` commit message, and `Verify no sensitive files` step all unchanged |
| 6 | A `pre-prod` branch deploys to a second, isolated CF Pages project reproducing prod URL semantics (clean URLs, `_redirects`, deploy-stamped integrity token, all 5 base security headers + noindex) without ever touching the `deploy` branch or docs-gate anchor (DEBT-03, re-cut criterion 3) | ✓ VERIFIED | `.github/workflows/deploy-preprod.yml` read directly — trigger `branches:[pre-prod]`, `concurrency: group: deploy-preprod`, `sh scripts/build-staging.sh deploy-staging --noindex`, push targets `deploy-preprod` only, no docs-gate step, no purge step, `Verify no sensitive files` retained. Live-verified (orchestrator, 2026-07-12): `https://sg-prpr-98xxj34.pages.dev` serves all 5 base security headers + `X-Robots-Tag: noindex`, `assets/version.js` BUILD_TOKEN = e596dd9 (deploy-time HEAD short SHA), `/license` returns 200; remote `pre-prod`/`deploy-preprod` branches exist; prod `deploy` branch untouched |
| 7 | `scripts/build-staging.sh` is the single shared transform both workflows call; the committed `_headers`/`assets/version.js` are never mutated; the noindex divergence lives only in the staged copy and preserves all 5 base security headers (post-live-verification mechanism fix) | ✓ VERIFIED | `scripts/build-staging.sh` read directly — whitelist `cp`, POSIX short-SHA stamp via redirect+mv, `--noindex` INSERTS into the existing first `/*` block (not a duplicate block, per the documented A-1 live-verification fix in `e596dd9`). `node tests/build-staging.test.js` → 5/5 pass including the noindex divergence + committed-files-untouched cases |

**Score:** 7/7 truths verified (0 present-but-behavior-unverified)

### Full Suite

`node tests/run-all.js` → **172 passed, 0 failed, 172 total** (includes all three new phase-44 spec files plus the pre-existing suite; run once, not re-filtered per truth).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/conventions-hygiene.test.js` | Offline source-audit pinning the DEBT-01 edits | ✓ VERIFIED | Exists, substantive (3 real assertions against real files), 3/3 pass |
| `.planning/codebase/CONVENTIONS.md` | §Comments rewritten to D-02/D-03/D-04 | ✓ VERIFIED | Rewritten section confirmed by direct read |
| `assets/add-client.js` | De-IDed `console.warn` | ✓ VERIFIED | Line 89 confirmed de-IDed; `git diff`-scope was exactly one line per 44-01-SUMMARY |
| `scripts/cf-await-promotion.sh` | POSIX-sh sentinel-then-blocking-purge | ✓ VERIFIED | Exists, executable, `sh -n` clean (per SUMMARY), all 6 test cases pass |
| `tests/cf-await-promotion.test.js` | Stub-curl offline behavior spec | ✓ VERIFIED | Exists, 6/6 pass |
| `scripts/build-staging.sh` | Parameterized shared staging transform | ✓ VERIFIED | Exists, executable, whitelist/token-stamp/no-leak/noindex all pass |
| `tests/build-staging.test.js` | tmp-dir fidelity + noindex-divergence spec | ✓ VERIFIED | Exists, 5/5 pass |
| `.github/workflows/deploy.yml` (modified) | Hardened prod pipeline | ✓ VERIFIED | Both Wave-1 scripts wired in; topology otherwise unchanged |
| `.github/workflows/deploy-preprod.yml` (new) | Isolated pre-prod pipeline | ✓ VERIFIED | Exists, four deliberate divergences confirmed, no docs-gate/purge |
| Second CF Pages project | git-connected to `deploy-preprod`, noindex, unguessable slug | ✓ VERIFIED | Live-verified by orchestrator: `sg-prpr-98xxj34.pages.dev` serves correct headers + token |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `deploy.yml` | `scripts/build-staging.sh` | `sh scripts/build-staging.sh deploy-staging` in "Prepare deploy directory" | WIRED | Confirmed by direct read |
| `deploy.yml` | `scripts/cf-await-promotion.sh` | `sh scripts/cf-await-promotion.sh` in "Await promotion, then purge Cloudflare cache", with `CF_ZONE_ID`/`CF_PURGE_TOKEN` env | WIRED | Confirmed by direct read; positioned after "Push to deploy branch" |
| `deploy-preprod.yml` | `scripts/build-staging.sh --noindex` | "Prepare pre-prod directory" step | WIRED | Confirmed by direct read |
| `deploy-preprod.yml` | CF Pages project #2 | production branch = `deploy-preprod` | WIRED | Live-verified by orchestrator (correct headers/token on the real origin) |
| Push carrying `assets/add-client.js` | docs-gate trailers | `Changelog-Unaffected:` + `Help-Unaffected:` on the tip commit | NOT YET OBSERVABLE | `origin/main` is still at pre-v1.4 commit `0cae46e`; the push carrying `09ab1f3` has not happened. Correctly documented verbatim in `44-01-SUMMARY.md` for whoever pushes — see Human Verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DEBT-01 | 44-01-PLAN.md | CONVENTIONS.md root-cause fix + one-line runtime-leak reword; no gate ships | ✓ SATISFIED | Truths 1-3 above; REQUIREMENTS.md line 46 marked `[x]`, describes only the re-cut scope |
| DEBT-02 | 44-02-PLAN.md, 44-04-PLAN.md | Deploy purges Cloudflare cache only after confirmed promotion | ✓ SATISFIED | Truths 4-5 above; REQUIREMENTS.md line 47 marked `[x]` |
| DEBT-03 | 44-03-PLAN.md, 44-04-PLAN.md, 44-05-PLAN.md | Pre-prod branch deploys to a second CF Pages project reproducing prod URL semantics | ✓ SATISFIED | Truths 6-7 above; REQUIREMENTS.md line 48 marked `[x]` |

**Orphan check:** `.planning/REQUIREMENTS.md` maps exactly DEBT-01, DEBT-02, DEBT-03 to Phase 44 (lines 108-110, 124). No additional requirement IDs are mapped to Phase 44 that are absent from the plans' `requirements` frontmatter — no orphans.

**Re-cut consistency check (per verification brief):** ROADMAP.md Phase 44 success criterion 1 (line 115) and REQUIREMENTS.md DEBT-01 (line 46) both consistently describe the re-cut scope (CONVENTIONS fix + console.warn reword only, forward gate deferred to v1.5) — no drift between the two documents. Both Deferred/Future sections (ROADMAP.md line 204, REQUIREMENTS.md line 61) name the forward gate + retrofit as a v1.5 candidate traveling together.

### Anti-Patterns Found

None. Scanned all phase-modified/created files (`scripts/cf-await-promotion.sh`, `scripts/build-staging.sh`, `.github/workflows/deploy.yml`, `.github/workflows/deploy-preprod.yml`, `assets/add-client.js`, and all three new test files) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` — zero matches.

A separate `gsd-code-review` pass (`.planning/phases/44-tech-debt-guardrails-pre-prod-environment/44-REVIEW.md`, 2026-07-12) already ran against the same file set and found **0 critical, 6 warnings, 6 info** — all robustness/edge-case findings (fail-open on a malformed `--noindex` argument or a reformatted `_headers`, unvalidated empty secrets, no curl timeout, a narrow `cancel-in-progress` race window that can reopen a DEBT-02-class condition without a failed run to flag it). None of these falsify the phase's stated success criteria — the core sentinel-then-purge and shared-transform mechanisms are directly tested and wired — but WR-06 (the cancellation race) is surfaced below as a human-judgment item since it touches the DEBT-02 goal statement ("cache purges can't race the Pages promotion").

### Human Verification Required

1. **Docs-gate trailers on the eventual push to origin/main**
   **Test:** When the accumulated local work is pushed to `origin/main`, confirm the tip commit carries `Changelog-Unaffected:` and `Help-Unaffected: assets/add-client.js` (or an equivalent EN changelog/help edit).
   **Expected:** `scripts/docs-gate.js` does not block the push.
   **Why human:** `origin/main` is still at the pre-v1.4 commit; the push has not happened yet, so this cannot be observed in the repository today.

2. **WR-06 residual concurrency-race risk (informational, from 44-REVIEW.md)**
   **Test:** Decide whether to accept the residual DEBT-02-class race window under `cancel-in-progress: true` + the new 0-300s promotion-await window, or apply the review's suggested fix (queue instead of cancel).
   **Expected:** A recorded accept/fix decision.
   **Why human:** Judgment call on residual risk tolerance; does not fail this phase's tested success criteria.

### Gaps Summary

No gaps. All three requirement IDs (DEBT-01, DEBT-02, DEBT-03) are satisfied with direct codebase evidence (rewritten CONVENTIONS.md, de-IDed console.warn, fail-closed sentinel-then-purge script wired into deploy.yml, isolated pre-prod pipeline + live-verified second CF Pages origin). All plan-declared `must_haves` (truths, artifacts, key_links, prohibitions) hold. The full test suite is green (172/172). Status is `human_needed` rather than `passed` solely because one key_link (the docs-gate trailer application) is a future action tied to a push event that has not yet occurred, and one code-review finding (WR-06) warrants a conscious human risk decision — neither is a failure of anything this phase's plans committed to deliver.

---

_Verified: 2026-07-12T07:43:03Z_
_Verifier: Claude (gsd-verifier)_
