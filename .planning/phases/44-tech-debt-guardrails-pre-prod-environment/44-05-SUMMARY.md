---
phase: 44-tech-debt-guardrails-pre-prod-environment
plan: 05
subsystem: infra
tags: [deploy, cloudflare-pages, pre-prod, github-actions, noindex, staging-transform, pwa, tech-debt, DEBT-03]

requires:
  - phase: 44-tech-debt-guardrails-pre-prod-environment
    provides: scripts/build-staging.sh (shared parameterized staging transform + --noindex divergence, from Plan 03)
  - phase: 19-go-live-preparation
    provides: .github/workflows/deploy.yml (the prod pipeline this mirrors) + the deploy branch / docs-gate anchor contract
provides:
  - .github/workflows/deploy-preprod.yml (isolated pre-prod pipeline — trigger pre-prod, group deploy-preprod, --noindex staging, force-pushes deploy-preprod only; no docs-gate, no purge)
  - the deploy-preprod branch (ephemeral, force-pushed on each pre-prod run)
  - the pre-prod branch (ephemeral force-pushable pointer to any device-test candidate)
  - second CF Pages project (sg-prpr-98xxj34) serving https://sg-prpr-98xxj34.pages.dev at a noindex, license-gated origin
affects: [45-rich-text-rendering, 48-mobile-pass-validation, on-device-pwa-verification]

tech-stack:
  added: []
  patterns:
    - "Isolated pre-prod pipeline: a full mirror of the prod deploy workflow diverging in exactly four deliberate ways — trigger (pre-prod, never main), concurrency group (deploy-preprod, never deploy), staging flag (--noindex), and push target (deploy-preprod, never deploy) — so it provably cannot write the deploy branch or move the docs-gate anchor (D-07/D-08, Pitfall 3)"
    - "Ephemeral force-pushable pre-prod pointer: the pre-prod branch is reset (git push -f origin <candidate>:pre-prod) to whatever needs device testing — main, main+feature, any candidate — with no merge ceremony, mirroring the existing deploy-branch philosophy (D-10)"
    - "Public-but-hidden pre-prod origin: unguessable *.pages.dev slug + X-Robots-Tag: noindex + license gate + no real data, and NO Cloudflare Access login wall (which would degrade iOS standalone-PWA cold-launch/SW testing) (D-09)"

key-files:
  created:
    - .github/workflows/deploy-preprod.yml
  modified: []

key-decisions:
  - "Pre-prod URL is https://sg-prpr-98xxj34.pages.dev (project sg-prpr-98xxj34, production branch deploy-preprod, no build command, output dir /) — unguessable slug per D-09"
  - "deploy-preprod.yml omits BOTH the docs-gate step (D-08 — the gate protects prod releases and anchors to the deploy branch) and the Cloudflare purge step (Pattern 3 — pages.dev is outside Ben's CF zone and Pages auto-invalidates on deploy); GITHUB_TOKEN suffices, no CF secrets on pre-prod"
  - "The Verify-no-sensitive-files guard is retained on the staged output as defense-in-depth even though scripts/build-staging.sh's whitelist is the only copy path"

requirements-completed: [DEBT-03]

coverage:
  - id: D1
    description: "deploy-preprod.yml triggers only on pre-prod, uses its own deploy-preprod concurrency group, stages via build-staging.sh --noindex, and force-pushes deploy-preprod only — never docs-gate, never purge, never the deploy branch or main"
    requirement: "DEBT-03"
    verification:
      - kind: unit
        ref: "node tests/build-staging.test.js (the --noindex transform the workflow invokes; 5/5 pass)"
        status: pass
      - kind: unit
        ref: "node tests/run-all.js (172/172 pass)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A second CF Pages project (sg-prpr-98xxj34) serves the deploy-preprod branch at https://sg-prpr-98xxj34.pages.dev with X-Robots-Tag: noindex alongside the five base security headers; a first pre-prod push ran deploy-preprod.yml green and deployed end-to-end"
    requirement: "DEBT-03"
    verification:
      - kind: manual_procedural
        ref: "curl -I https://sg-prpr-98xxj34.pages.dev/ → 5 base security headers + X-Robots-Tag: noindex; /license → 200; assets/version.js BUILD_TOKEN=e596dd9; GitHub Actions runs 29183950244 + 29184228752 green"
        status: pass
    human_judgment: true
    rationale: "The origin's live header set and the end-to-end deploy required a human to create the CF Pages project (interactive GitHub-OAuth) and to observe the real origin; the origin is not reachable from the automated test harness."
  - id: D3
    description: "Installed-PWA cold launch + integrity-token cache roll verified on a real iOS device (VALIDATION.md manual-only DEBT-03 item)"
    verification: []
    human_judgment: true
    rationale: "Deferred — requires a real iOS device installing the PWA from the pre-prod origin; not blocking plan completion. This is the whole reason the pre-prod origin exists (python3 -m http.server false-passes SW/offline tests)."

metrics:
  duration_minutes: 30
  completed: 2026-07-12
  tasks_completed: 2
  files_created: 1
  files_modified: 0
  commits: 1

status: complete
---

# Phase 44 Plan 05: Isolated Pre-Prod Deploy Pipeline Summary

**A new `.github/workflows/deploy-preprod.yml` that mirrors the prod pipeline but diverges in exactly four deliberate ways (trigger `pre-prod`, group `deploy-preprod`, `--noindex` staging, push `deploy-preprod` only), plus a human-created second CF Pages project serving a real, noindex CF origin at https://sg-prpr-98xxj34.pages.dev for on-device PWA/SW/offline pre-release testing.**

## Performance

- **Duration:** ~30 min (including the human CF-dashboard checkpoint + two live deploys)
- **Completed:** 2026-07-12
- **Tasks:** 2 (Task 1 auto; Task 2 human-action checkpoint — resolved + verified)
- **Files modified:** 1 created

## Accomplishments

- **`.github/workflows/deploy-preprod.yml`** — a faithful, isolated mirror of `deploy.yml`: triggers `on: push: branches: [pre-prod]` (never main), declares its OWN `concurrency: group: deploy-preprod` (never `deploy`), stages via `sh scripts/build-staging.sh deploy-staging --noindex`, retains a Verify-no-sensitive-files guard on the staged tree, and force-pushes ONLY `deploy-preprod` with `GITHUB_TOKEN`. It DELIBERATELY OMITS the docs-gate step (D-08) and any Cloudflare purge step (Pattern 3) — both omissions carry inline comments explaining why. Provably cannot write the prod `deploy` branch, trigger on main, or move the docs-gate `Deploy from <sha>` anchor.
- **Second CF Pages project (`sg-prpr-98xxj34`)** — human-created (interactive GitHub-OAuth, not scriptable), git-connected to the `deploy-preprod` branch (production branch = `deploy-preprod`, no build command, output dir `/`), serving an unguessable, noindex, license-gated origin at **https://sg-prpr-98xxj34.pages.dev** with no real data (D-09).
- **A real CF origin for device testing** — clean URLs, real `_redirects`/`_headers`, a deploy-stamped `INTEGRITY_TOKEN` — the thing `python3 -m http.server` cannot faithfully reproduce for installed-PWA cold launch + integrity-token roll.

## Task Commits

1. **Task 1: Author deploy-preprod.yml (mirror prod, four deliberate changes)** — `5e246ac` (feat)
2. **Task 2: [CHECKPOINT human-action] Create second CF Pages project** — no repo file (Cloudflare dashboard). Resolved: Ben created the project and the deploy was verified end-to-end.

The A-1 noindex header-merge fix discovered during live verification landed separately in `e596dd9` (see Deviations).

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified

- `.github/workflows/deploy-preprod.yml` — the isolated pre-prod pipeline (created, Task 1)

## Checkpoint Resolution

Task 2 was a `checkpoint:human-action` (blocking) — the second CF Pages project requires interactive GitHub-OAuth authorization in the Cloudflare dashboard, which has no clean scriptable path. **APPROVED and verified** (2026-07-12):

- Ben created project `sg-prpr-98xxj34` (production branch `deploy-preprod`, no build command, output dir `/`).
- A first pre-prod deploy was triggered: the `pre-prod` and `deploy-preprod` branches were created; `deploy-preprod.yml` ran green (GitHub Actions runs **29183950244** and **29184228752**); the prod `deploy` branch was left untouched.
- Live end-to-end verification on the real origin:
  - `curl -I https://sg-prpr-98xxj34.pages.dev/` returns all five base security headers (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) **plus** `X-Robots-Tag: noindex`.
  - The deploy-stamped token is live: `assets/version.js` on the origin serves `BUILD_TOKEN` `e596dd9` (= repo HEAD short SHA at deploy time).
  - The clean URL `/license` returns `200`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Live verification of Assumption A-1 disproved the append-a-second-`/*`-block noindex mechanism**
- **Found during:** Task 2 live verification (the plan's Assumption A-1 header-merge check on the real pre-prod origin)
- **Issue:** The first deploy's staged `_headers` was complete and correct (base CSP block intact + an appended second `/*` noindex block), but the live origin served `X-Robots-Tag: noindex` while **missing** `Content-Security-Policy`, `X-Frame-Options`, and `Permissions-Policy`. Cloudflare Pages resolves a **duplicate identical path pattern** in `_headers` as **last-one-wins, not merge** — the appended second `/*` block had replaced the base security-headers block. (Non-duplicate patterns still merge.)
- **Fix:** Changed `scripts/build-staging.sh --noindex` to INSERT the `X-Robots-Tag: noindex` line INTO the existing first `/*` block of the staged `_headers` (portable awk + redirect+mv), instead of appending a duplicate `/*` block. `tests/build-staging.test.js` updated to pin all five base security headers AND the noindex line inside the first `/*` block, plus exactly ONE bare `/*` pattern (the CF last-wins falsifier). D-09 staged-copy-only intent unchanged — the committed `_headers` is never touched. This fix is owned by Plan 03's artifact; see `44-03-SUMMARY.md` § "Post-completion fix (2026-07-12)" for the full detail.
- **Files modified:** `scripts/build-staging.sh`, `tests/build-staging.test.js` (Plan 03 artifacts)
- **Verification:** `node tests/build-staging.test.js` 5/5, `node tests/run-all.js` 172/172, `sh -n` clean; second deploy verified correct (all five base headers + noindex live).
- **Commit:** `e596dd9` — `fix(44-03): insert noindex into base /* block — CF Pages last-wins on duplicate _headers patterns`

---

**Total deviations:** 1 auto-fixed (1 bug — the A-1 assumption failed under live CF header-merge semantics; found and fixed exactly where the plan flagged it as a live risk).
**Impact on plan:** Necessary for correctness (the pre-prod origin must serve the full security-header set, not just noindex). The mechanism change is confined to the shared staging transform; the deploy-preprod.yml authored here was unaffected. No scope creep.

## Threat mitigations landed

- **T-44-08 (Tampering/Availability — pre-prod writing the deploy branch or docs-gate anchor):** trigger isolation (`pre-prod` only, never main) + target isolation (force-push `deploy-preprod` only) + no docs-gate step; the prod `deploy` branch was provably untouched across both live deploys.
- **T-44-09 (Information Disclosure — public pre-prod origin):** `X-Robots-Tag: noindex` (verified live) + unguessable `sg-prpr-98xxj34.pages.dev` slug + license gate + no real data; no Cloudflare Access wall (would break iOS standalone-PWA testing).
- **T-44-05 (Information Disclosure — staged tree leak):** retained Verify-no-sensitive-files guard on the pre-prod staged output as defense-in-depth on top of build-staging.sh's whitelist.

## Issues Encountered

The A-1 header-merge discovery (documented above under Deviations) was the only issue; it was resolved by the mechanism change in `e596dd9` and a second, verified-correct deploy.

## User Setup Required

Completed during this plan (Task 2 checkpoint): the second CF Pages project `sg-prpr-98xxj34` was created and connected to the `deploy-preprod` branch. No further setup is required for the pipeline to run — a pre-prod deploy is triggered by force-pushing a candidate to the `pre-prod` branch (e.g. `git push -f origin main:pre-prod`).

## Next Phase Readiness

- Phase 44 is COMPLETE (5/5 plans). All three v1.4 guardrail requirements (DEBT-01, DEBT-02, DEBT-03) are delivered; the deploy pipeline is hardened and a real pre-prod environment exists.
- **Deferred (manual-only, not blocking):** installed-PWA cold launch + integrity-token cache roll on a real iOS device from the pre-prod origin — the VALIDATION.md manual DEBT-03 item, and the reason the pre-prod origin was built. This is the on-device verification lever for the device-heavy work in Phases 45 and 48.

## Self-Check: PASSED

- `.github/workflows/deploy-preprod.yml` — FOUND
- Commit `5e246ac` (Task 1) — FOUND
- Commit `e596dd9` (A-1 fix) — FOUND

---
*Phase: 44-tech-debt-guardrails-pre-prod-environment*
*Completed: 2026-07-12*
