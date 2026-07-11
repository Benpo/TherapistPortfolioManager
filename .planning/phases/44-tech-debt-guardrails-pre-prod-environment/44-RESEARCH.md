# Phase 44: Tech-Debt Guardrails & Pre-Prod Environment - Research

**Researched:** 2026-07-11
**Domain:** CI/CD (GitHub Actions), Cloudflare Pages edge/CDN semantics, docs-gate anchoring, developer-convention docs
**Confidence:** HIGH (all load-bearing claims verified against live repo files + Cloudflare docs)

## Summary

This phase hardens three surfaces before v1.4 feature work: a CONVENTIONS.md instruction that leaks planning IDs into shipped code (DEBT-01, fully decided), the Cloudflare purge race that shipped a mixed cache in v1.3.0 (DEBT-02, primary), and the absence of a prod-faithful pre-release environment (DEBT-03, secondary). The work is entirely CI/pipeline shell, workflow YAML, `_headers`, and doc edits — **zero application code, zero npm packages**.

The DEBT-02 fix is a content-sentinel: after force-pushing the `deploy` branch, poll the live production origin `https://sessionsgarden.app/assets/version.js` (served `no-cache`, so every poll hits origin) until it serves the new `${GITHUB_SHA::7}` token, THEN purge — fail the run loudly with no purge on timeout. Cloudflare Pages auto-invalidates its own CDN cache on each deployment, so a pre-prod `*.pages.dev` project needs **no purge step at all** [VERIFIED: Cloudflare Pages docs]. DEBT-03 is a second GitHub Actions workflow triggered on a `pre-prod` branch that runs the same staging transform, injects `X-Robots-Tag: noindex` into the staging `_headers` only, and force-pushes a `deploy-preprod` branch a second CF Pages project watches — never touching the `deploy` branch the prod docs-gate anchors to.

**Primary recommendation:** Extract the promotion-poll + purge and the staging transform into two small POSIX scripts (`scripts/cf-await-promotion.sh`, `scripts/build-staging.sh`) that both workflows call, and add stub-binary offline behavior tests mirroring the existing `tests/ci-resolve-docs-range.test.js` precedent. This kills transform drift between prod and pre-prod, makes the poll/token-match logic falsifiably testable offline, and aligns with the phase's own "add guardrails" spirit.

## Architectural Responsibility Map

This phase has no browser/API tiers; the relevant tiers are pipeline/edge infrastructure.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Planning-ref hygiene rule (DEBT-01) | Dev-convention docs (`.planning/`) | Shipped source (one `add-client.js` string) | The root cause is an instruction in CONVENTIONS.md; only one runtime leak needs a code edit |
| Purge-after-promotion (DEBT-02) | CI (GitHub Actions `deploy.yml`) | CF edge/CDN (zone cache on custom domain) | Sequencing is a pipeline concern; the race exists because the zone edge cache is purged before Pages promotes |
| Promotion sentinel (DEBT-02) | CI shell (new script) | CF Pages origin (`version.js`, no-cache) | The check runs in CI but reads truth from the live edge/origin |
| Pre-prod deploy (DEBT-03) | CI (new `deploy-preprod.yml`) | CF Pages project #2 (git-connected to `deploy-preprod`) | A second workflow mirrors the transform; a manually-created second Pages project serves it |
| noindex divergence (DEBT-03) | CI staging transform | CF Pages `_headers` (pre-prod copy only) | Injected during staging so the shared committed `_headers` stays prod-only |
| Docs-gate isolation (DEBT-03) | Branch/trigger topology | `ci-resolve-docs-range.sh` anchor on `deploy` | Guaranteed by never triggering on `main` and never writing `deploy` |

## Standard Stack

No libraries or packages are introduced. The phase uses tooling already present and proven in the repo:

| Tool | Where | Purpose | Why standard here |
|------|-------|---------|-------------------|
| GitHub Actions | `.github/workflows/deploy.yml` | The prod pipeline; a second workflow mirrors it | Already the deploy mechanism since Phase 19 |
| Cloudflare Pages (git-integration) | prod project watches `deploy`; new project watches `deploy-preprod` | Static host, atomic deploys | Prod already uses git-connected Pages (no wrangler, no build command) |
| `curl` (in-runner) | sentinel poll + purge | Poll origin, POST purge | Already used for the purge step |
| POSIX `sh` scripts + stub-binary tests | `scripts/*.sh` + `tests/*.test.js` (zero-npm) | Testable pipeline logic | Precedent: `scripts/ci-resolve-docs-range.sh` + `tests/ci-resolve-docs-range.test.js` |
| `node tests/run-all.js` | zero-npm runner | Green gate for new behavior tests | Discovers every top-level `tests/*.test.js` |

### Package Legitimacy Audit

Not applicable — this phase installs **no external packages** (no `npm install`, no new dependencies). All tooling is the platform (GitHub Actions, Cloudflare Pages, `curl`, `git`, `node` built-ins) already in use.

## Architecture Patterns

### DEBT-02: current vs. target sequencing in `deploy.yml`

Current step order (`.github/workflows/deploy.yml`):

```
1. Docs gate (fail-closed)          lines 21–40
2. Prepare deploy directory         lines 42–59   (whitelist cp + sed __BUILD_TOKEN__ → ${GITHUB_SHA::7})
3. Verify no sensitive files        lines 61–73
4. Push to deploy branch            lines 75–86   (force-push `deploy`; CF Pages picks it up → builds → promotes)
5. Purge Cloudflare cache           lines 88–96   ← RACE: fires immediately, BEFORE Pages promotes
```

The race (from `2026-07-10-deploy-purge-race-mixed-cache.md`): step 5 purges the zone edge cache while Pages is still promoting the old→new deployment. Edges re-cache OLD assets (`/*.js` carries `max-age=86400` per `_headers`), then the new deployment promotes and the custom domain serves a MIX for up to 24h. Installed PWAs launching in the window run the NEW `INTEGRITY_TOKEN` service worker and precache the poisoned mix — a state only a token roll heals.

**Target order:** insert a promotion-sentinel step between step 4 and step 5. The purge moves so it runs ONLY after the live origin is confirmed serving the new token.

```
4. Push to deploy branch
4b. Await Pages promotion (content sentinel)  ← NEW; exit 1 on timeout, NO purge
5. Purge Cloudflare cache                      ← now blocking (exit 1 on failure)
```

### Pattern 1: content-sentinel promotion poll (DEBT-02 — SHIP THIS)

**What:** Poll the live custom-domain origin for the new deploy token before purging.
**Why this exact URL/token works:** `assets/version.js` is served `Cache-Control: no-cache` (`_headers` lines 22–23) and is the ONE file that changes every deploy — the staging transform seds `__BUILD_TOKEN__` → `${GITHUB_SHA::7}` (`deploy.yml:59`), producing the literal `var BUILD_TOKEN = '<7hex>';` at `assets/version.js:32`. Because it is `no-cache`, each poll revalidates against origin, so the poll flips to true as soon as the Pages production alias promotes — it is not itself masked by the stale edge cache. [VERIFIED: `_headers`, `deploy.yml`, `assets/version.js` in-repo]

```bash
# Source: derived from deploy.yml:59 sed + _headers:22-23 no-cache + assets/version.js:32
- name: Await Pages promotion (content sentinel)
  run: |
    set -eu
    SHORT="${GITHUB_SHA::7}"
    URL="https://sessionsgarden.app/assets/version.js"
    DEADLINE=$(( $(date +%s) + 300 ))   # 5 min ceiling (static promote is typically <60s)
    echo "Awaiting promotion of ${SHORT} at ${URL}"
    while :; do
      body="$(curl -fsS -H 'Cache-Control: no-cache' "${URL}?cb=$(date +%s)" || true)"
      if printf '%s' "$body" | grep -q "BUILD_TOKEN = '${SHORT}'"; then
        echo "Promotion confirmed: live origin serves ${SHORT}."
        break
      fi
      if [ "$(date +%s)" -ge "$DEADLINE" ]; then
        echo "ERROR: timed out waiting for Pages to promote ${SHORT}; NOT purging (a uniformly-stale cache is safe, a mixed one is not)." >&2
        exit 1
      fi
      sleep 10
    done
```

- **Poll interval:** 10s. **Total timeout:** 300s (5 min) — generous headroom; tune down if runs are consistently fast. [ASSUMED — actual promote latency is only verifiable in a real run; A-3]
- **Fail-closed idiom** matches the repo's existing loud-echo-to-stderr + `exit 1` pattern (docs-gate step, sensitive-files check, `ci-resolve-docs-range.sh`).

### Pattern 2: purge becomes blocking after confirmed promotion (DEBT-02)

Today's purge is deliberately non-blocking (`deploy.yml:96` — "Cache purge failed (non-blocking)"). Once it runs ONLY after confirmed promotion, a purge failure IS the mixed-cache condition (origin=new, edge=old for up to 24h), so it must now **block**:

```bash
# Source: rewrite of deploy.yml:88-96 — now blocking, runs only after the sentinel passes
- name: Purge Cloudflare cache
  run: |
    set -eu
    resp="$(curl -sS -X POST \
      "https://api.cloudflare.com/client/v4/zones/${{ secrets.CF_ZONE_ID }}/purge_cache" \
      -H "Authorization: Bearer ${{ secrets.CF_PURGE_TOKEN }}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}')"
    if printf '%s' "$resp" | grep -q '"success":true'; then
      echo "Cache purged."
    else
      echo "ERROR: purge failed AFTER confirmed promotion — edge may serve a mixed cache. Re-run this job." >&2
      printf '%s\n' "$resp" >&2
      exit 1
    fi
```

**New failure semantics (deliberate, both cases):**
| Condition | Old | New (recommended) | Rationale |
|-----------|-----|-------------------|-----------|
| Promotion never confirmed (poll timeout) | n/a (purged immediately) | **exit 1, NO purge** | Uniformly-stale cache is safe; alerts Ben to re-run |
| Purge fails after confirmed promotion | non-blocking warn | **exit 1, loud** | Confirmed-new origin + un-purged edge = the exact mixed-cache bug; `gh run rerun` re-purges |

### DEBT-02 four-direction recommendation (from the incident todo)

| Direction | Ship? | Reason |
|-----------|-------|--------|
| 1. Purge after confirmed promotion (sentinel poll) | **YES — the fix** | Directly satisfies the requirement; verifies the full edge path, not just Pages' internal state |
| 2. Double-purge with delay | No | Belt-and-braces that masks rather than fixes; the sentinel makes it unnecessary |
| 3. `max-age=86400` rethink | No (defer) | CONTEXT/REQUIREMENTS defer this to a future pipeline consideration; not needed once purge is correctly sequenced |
| 4. Post-deploy byte-consistency check | **Optional, only if cheap** | The sentinel already confirms the token asset. A tiny extra `curl` of 1–2 key assets comparing against the checkout is low-cost insurance, but not required by DEBT-02. Recommend as a stretch, not a gate |

### CF Pages deployment-status API vs. content-polling (DEBT-02)

The Pages REST API exposes `GET /accounts/{account_id}/pages/projects/{project}/deployments/{id}` with a `latest_stage` field you can poll [CITED: developers.cloudflare.com/pages/configuration/api/]. **Recommend content-polling, not the status API**, because:
- **No new secrets.** Content-polling curls a public URL. The status API needs `account_id` + `project_name` + an API token with **Pages:read** — the existing `CF_PURGE_TOKEN` is purge-scoped and almost certainly lacks Pages:read, so this would introduce a new secret. CONTEXT explicitly prefers "no new secrets."
- **Verifies the right thing.** The status API says Pages *believes* it deployed; content-polling proves the new bytes are actually served through the full edge path — which is exactly the property the v1.3.0 incident violated.
- **Simpler.** One `curl | grep`, no JSON parsing, no account/project plumbing.

### DEBT-03: pre-prod topology

```
push to `pre-prod` branch
        │
        ▼
.github/workflows/deploy-preprod.yml   (trigger: push branches:[pre-prod])
        │  concurrency: group=deploy-preprod, cancel-in-progress=true
        │  NO docs-gate step
        ▼
  staging transform  (same whitelist cp + sed __BUILD_TOKEN__ → ${GITHUB_SHA::7})
        │            + inject X-Robots-Tag: noindex into the STAGING _headers only
        ▼
  force-push `deploy-preprod` branch     (NEVER `deploy`)
        │
        ▼
  CF Pages project #2 (git-connected, production branch = deploy-preprod)
        │
        ▼
  <unguessable>.pages.dev   — noindex, no custom domain, no purge step
```

### Pattern 3: does pre-prod need a purge step? — NO (verified)

**Definitive answer: no purge step.** Two independent reasons:
1. **The zone purge is inapplicable.** `purge_everything` is scoped to `CF_ZONE_ID` — Ben's zone (`sessionsgarden.app`). A `*.pages.dev` hostname is not in that zone (it lives in Cloudflare's own `pages.dev` zone), so the existing purge API call cannot target it at all. [VERIFIED: Cloudflare Cache purge is zone-scoped; pages.dev ≠ Ben's zone]
2. **Pages auto-invalidates its own CDN cache on every deployment.** Per Cloudflare: "Every time you deploy an asset to Pages, the asset remains cached on the Cloudflare CDN until your next deployment" — i.e. a new deployment invalidates the prior CDN cache automatically. [CITED: developers.cloudflare.com/pages/configuration/serving-pages/]

**Important nuance the planner should record (not a blocker):** the same Cloudflare guidance warns that setting a custom `max-age` header (this repo's `_headers` sets `public, max-age=86400` on `/*.js`/`/*.css`) can cause **browser-level** staleness on a client that already fetched an asset — this is the residual of purge-race direction 3 and is why prod (custom domain) still needs the zone purge. For pre-prod's device-testing use case it is acceptable and out of scope: `sw.js` and `version.js` are `no-cache`, so the SW update mechanism and its `INTEGRITY_TOKEN` roll — the whole point of DEBT-03 — are always seen fresh; a tester can hard-reload if a `/*.js` asset is browser-cached. Do **not** add a purge step to chase this. [VERIFIED: `_headers` in-repo + Cloudflare docs]

### Pattern 4: noindex injection into the staging `_headers` only (DEBT-03, D-09)

The committed `_headers` has a global `/*` block (CSP + security headers, lines 1–6). Inject the pre-prod divergence by **appending a second `/*` block to the staged copy** — never editing the committed file:

```bash
# In deploy-preprod.yml, AFTER `cp _headers <staging>/` and the sed token stamp:
printf '\n/*\n  X-Robots-Tag: noindex\n' >> <staging>/_headers
```

Cloudflare `_headers` applies all matching rules for a path, so this adds `X-Robots-Tag: noindex` alongside the base security headers without touching the CSP line. Prefer append over `sed`-into-the-existing-block (append cannot mangle the CSP). [ASSUMED — multi-`/*`-block merge behavior should be confirmed on the first real pre-prod deploy, which is exactly what pre-prod is for; A-1]

### Pattern 5: docs-gate isolation (DEBT-03, D-08 — HARD CONSTRAINT, guaranteed by design)

The prod docs-gate anchors its range to the remote `deploy` branch's `Deploy from <sha>` commit subject via `scripts/ci-resolve-docs-range.sh` (reads `git log FETCH_HEAD` on `deploy`, lines 77–97). Two independent guarantees keep pre-prod from ever disturbing it:

1. **Trigger isolation.** `deploy.yml` triggers on `push: branches:[main]` only. Pre-prod pushes land on the `pre-prod` branch → `deploy.yml` (and its docs-gate step) **never runs** for pre-prod. The new `deploy-preprod.yml` deliberately contains **no docs-gate step**.
2. **Target isolation.** `deploy-preprod.yml` force-pushes the `deploy-preprod` branch. It never writes `deploy`, so the `Deploy from <sha>` subject the resolver reads is never altered, and the anchor never moves.

Therefore nothing pre-prod does can break the prod anchor. Everything still passes the gate when landing on `main` normally. (`_redirects` is a single comment file; the pre-prod project reproduces clean-URL semantics via CF Pages' native extension-stripping, same as prod — no `_redirects` divergence needed.)

### Pattern 6: share-vs-duplicate the transform (DEBT-03) — recommend shared script

CONTEXT blesses raw duplication ("faithfulness to the prod transform is the constraint; duplication is acceptable"). Two viable shapes:

| Approach | Pros | Cons |
|----------|------|------|
| **Raw duplication** (copy `deploy.yml` steps into `deploy-preprod.yml`) | Zero change to the proven prod transform; simplest diff | Two copies drift over time; the transform stays un-unit-testable |
| **Shared script** `scripts/build-staging.sh <target-dir> [--noindex]`, both workflows call it | Single source of truth (no drift); offline-unit-testable (whitelist completeness, token stamp, noindex-only-in-preprod, no-leak); serves the Validation Architecture directly | Touches prod's `deploy.yml` transform (mitigated: this phase already edits `deploy.yml` for the sentinel, and the extraction is covered by a new behavior test) |

**Recommendation: shared script**, because this phase is explicitly about hardening the pipeline and adding tests — extracting the transform is the single highest-leverage move for both goals, and `deploy.yml` is being edited anyway. If Ben/the planner would rather not touch the prod transform, raw duplication is the CONTEXT-approved fallback. Either way, keep the CF-side dumb-host contract: no build command, files at repo root of the deploy branch.

### Anti-Patterns to Avoid
- **Purging on a fixed `sleep`** instead of polling the sentinel — non-deterministic; the exact failure mode of the v1.3.0 incident.
- **Editing the committed `_headers`** to add noindex — it would ship to prod. Inject into the staging copy only.
- **Using `--no-verify` / any main-branch shortcut for pre-prod** — pre-prod must never route through `main`/`deploy`.
- **Adding a purge step to pre-prod** — inapplicable (wrong zone) and unnecessary (Pages auto-invalidates).
- **Reusable-workflow indirection** for two ~6-line transforms — a shared *script* is simpler and testable; a reusable workflow adds YAML indirection that can itself mask drift.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirming a deploy is live | A fixed delay / retry-count heuristic | Poll the `no-cache` `version.js` token | Deterministic, verifies the real edge path, no secrets |
| Pre-prod cache invalidation | A purge call against pages.dev | Nothing — Pages auto-invalidates on deploy | Zone purge can't target pages.dev; Pages does it for you |
| Clean-URL / redirect semantics for pre-prod | Custom `_redirects` rules | CF Pages native extension-stripping (same as prod) | Prod relies on it too; reproducing prod means using the same mechanism |
| Testing pipeline shell offline | A live CI dry-run | Stub-binary tests (stub `curl`/`git` on `PATH`) | Precedent `tests/ci-resolve-docs-range.test.js` drives every exit code offline |

**Key insight:** every "wait for X" and "invalidate cache" impulse in this domain has a platform-native or already-proven-in-repo answer. The only genuinely new code is the sentinel loop and the (optional) transform extraction — both small and both testable offline.

## DEBT-01 — canonical reference verification (near-zero research, per brief)

All four canonical file locations in CONTEXT were verified accurate against live files today:

| Ref | Expected | Verified |
|-----|----------|----------|
| `CONVENTIONS.md` §Comments "do not omit" | ~lines 149–157 | ✅ §Comments at line 149; "do not omit" at **line 153**; Constraint-notes para lines 155–157 |
| `REQUIREMENTS.md` DEBT-01 | ~line 46 | ✅ DEBT-01 bullet at **line 46** (describes the deferred forward grep-gate — must be re-cut per D-06) |
| `ROADMAP.md` Phase 44 criterion 1 | ~line 113 | ✅ criterion 1 at **line 113** — STILL describes the "baseline-aware test gate"; **editing it to match the re-cut IS deliverable D-06, not a contradiction to resolve** |
| `assets/add-client.js` console.warn | line 89 | ✅ **line 89** exactly: `console.warn("Large photo upload:", file.size, "bytes — proceeding per D-23 (no hard cap)");` — the sole runtime leak; one-line reword keeping the no-hard-cap rationale, dropping `D-23` |

**Source rules to fold into CONVENTIONS.md §Comments** (from Phase 36, verified at `36-CONTEXT.md`):
- **D-07 (line 40) — strip ALL planning IDs (option 3):** requirement IDs (`REQ-`/`OBS-`/`VER-`/`RFCT-`/`DOCS-`/`DEMO-`/`PDFX-`/`I18N-`/`TEST-`), decision IDs (`D-NN`), code-review IDs (`CR-NN`), task IDs (`T-N-N-N`) all become plain prose — only the ID leaves, the WHY/constraint stays. **Real technical tokens are NOT IDs and are untouched:** `AES-256`, `SHA-256`, schema `v1–v6`, `IDBDatabase`.
- **Both rationales to record (D-02):** (a) `.planning/` is archived per-milestone → an ID in shipped code becomes a dangling reference (`git blame` is the durable trace); (b) `assets/**` ships its comments → customer exposure (the `add-client.js` warn prints into customer DevTools today).
- **D-03 banner shape** (4-slot `OWNS · PUBLIC SURFACE · DEPENDENCIES · CONSTRAINTS`) — reference the archived `36-COMMENT-STYLE-GUIDE.md` for Do/Don't wording; it stays archived (D-03), not promoted.
- **Test-naming rule (D-04, locked 2026-07-10):** `{slug}.test.js`, no phase numbers in test filenames, provenance in git.

**Planner note on the test-naming rule:** the current `tests/` corpus is entirely phase-numbered (`24-04-…`, `30-…`, `quick-260516-…`). The new rule is **forward-looking only** — existing files are NOT renamed (that is the deferred v1.5 retrofit). The documented convention will visibly contradict the legacy corpus; that is acceptable and consistent with DEBT-01's "stop the bleeding" framing. No enforcement gate ships this phase (D-01, locked).

## Runtime State Inventory

This phase edits pipeline config, docs, and one string — it is not a rename/refactor. The only "runtime state" concern is CI/hosting state, inventoried here:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no datastore keys touched | None |
| Live service config | (1) Prod CF Pages project git-connected to `deploy` branch. (2) **NEW** second CF Pages project must be created manually, git-connected to `deploy-preprod`. (3) GitHub Actions secrets `CF_ZONE_ID`/`CF_PURGE_TOKEN` (prod only; pre-prod needs none) | Human checkpoint: create project #2 (click-path below) |
| OS-registered state | None | None |
| Secrets/env vars | Prod uses `CF_ZONE_ID`, `CF_PURGE_TOKEN`, `GITHUB_TOKEN`. **Pre-prod needs NO new secrets** (no purge; force-push uses `GITHUB_TOKEN`) | None new |
| Build artifacts | The `deploy` branch (force-pushed each prod deploy) and the **NEW** `deploy-preprod` branch (force-pushed each pre-prod deploy) | Create `deploy-preprod` on first pre-prod run |

### Manual CF dashboard click-path (human-checkpoint task for the plan)

One-time creation of the second Pages project (copy-pasteable steps for Ben):

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select the app's GitHub repository (the same repo the prod project uses).
3. Set up builds and deployments:
   - **Project name:** an unguessable slug (this becomes `<slug>.pages.dev`) — e.g. `sg-preprod-<random>`.
   - **Production branch:** `deploy-preprod`.
   - **Framework preset:** None.
   - **Build command:** (leave empty).
   - **Build output directory:** `/` (root) — the `deploy-preprod` branch already contains staged files at its root, exactly like the prod `deploy` branch.
4. **Save and Deploy.**
5. Record the `<slug>.pages.dev` URL for device testing (noindex + license-gated; holds no real data per D-09).

This mirrors how the prod project is configured against the `deploy` branch (dumb host, no build). CF Pages auto-deploys on every push to `deploy-preprod`.

## Common Pitfalls

### Pitfall 1: sentinel token mismatch (7-char vs full SHA)
**What goes wrong:** polling for the full `${GITHUB_SHA}` never matches — `version.js` is stamped with `${GITHUB_SHA::7}` (`deploy.yml:59`), while the `deploy` commit subject uses the full SHA (`deploy.yml:84`).
**How to avoid:** match `BUILD_TOKEN = '${GITHUB_SHA::7}'` exactly. **Warning sign:** every run times out at 5 min.

### Pitfall 2: noindex leaking to prod
**What goes wrong:** editing the committed `_headers` to add `X-Robots-Tag: noindex` de-indexes production.
**How to avoid:** inject only into the staging copy inside `deploy-preprod.yml` (append after `cp`). **Warning sign:** `noindex` appears in a `git diff` of `_headers`.

### Pitfall 3: pre-prod workflow accidentally writing `deploy`
**What goes wrong:** copying `deploy.yml`'s push step verbatim leaves `git checkout -b deploy` / `git push -f origin deploy` — pre-prod would clobber the prod deploy branch and move the docs-gate anchor.
**How to avoid:** change both to `deploy-preprod`. **Warning sign:** an unexpected prod deploy fires, or the docs-gate anchor jumps.

### Pitfall 4: version.js NOT actually no-cache at the edge
**What goes wrong:** if a future `_headers` change dropped the `/assets/version.js  Cache-Control: no-cache` rule (lines 22–23), the sentinel would poll a stale edge copy and either false-pass or hang.
**How to avoid:** the sentinel's correctness depends on that rule; add a cheap test asserting `_headers` still contains it (see Validation Architecture). **Warning sign:** sentinel confirms instantly even before promotion, or never.

## Validation Architecture

> Nyquist validation is enabled (`config.json workflow.nyquist_validation: true`). This phase's testable surface is CI/pipeline shell — the precedent is `scripts/ci-resolve-docs-range.sh` + its stub-binary behavior test.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | zero-npm handwritten runner (`tests/run-all.js`), one `node` child process per `tests/*.test.js`, exit-0/1 contract |
| Config file | none — discovery is `readdirSync('tests/')` top-level `*.test.js` |
| Quick run command | `node tests/<new-file>.test.js` |
| Full suite command | `node tests/run-all.js` |
| Stub-binary precedent | `tests/ci-resolve-docs-range.test.js` — drops a stub `git` on `PATH`, drives each exit code offline, asserts stdout/stderr/exit contract |

### Phase Requirements → Test Map
| Req | Behavior | Test type | Automated command | File exists? |
|-----|----------|-----------|-------------------|-------------|
| DEBT-01 | CONVENTIONS.md §Comments no longer says "do not omit"; `add-client.js` has no `D-23` | grep/source-audit (offline) | `node tests/44-conventions-hygiene.test.js` | ❌ Wave 0 |
| DEBT-02 | Sentinel poll: token-present→exit 0 fast; never-present→exit 1 after timeout, loud stderr; present-on-Nth-poll→exit 0 | stub-`curl` behavior (offline) | `node tests/44-cf-await-promotion.test.js` | ❌ Wave 0 |
| DEBT-02 | `_headers` still declares `version.js` no-cache (sentinel precondition) | source-audit (offline) | folded into the same test | ❌ Wave 0 |
| DEBT-03 | Staging transform: whitelist complete, `__BUILD_TOKEN__` stamped, NO `.planning`/`.claude`/`CLAUDE.md`/`.env` leak | run `build-staging.sh` against tmp checkout (offline) | `node tests/44-build-staging.test.js` | ❌ Wave 0 (requires shared-script extraction) |
| DEBT-03 | noindex present in pre-prod staged `_headers`, ABSENT in prod staged `_headers`; shared CSP block byte-identical | source-audit (offline) | folded into `44-build-staging.test.js` | ❌ Wave 0 |

### Offline-testable set the planner should REQUIRE
1. **Sentinel poll loop + token-match** (`scripts/cf-await-promotion.sh` + stub-`curl` test) — highest value; pins the exact bug class.
2. **Staging-transform fidelity / whitelist completeness / no-leak** (`scripts/build-staging.sh` + tmp-dir test) — turns the "Verify no sensitive files" invariant into a real test and prevents prod↔pre-prod drift. *Conditional on choosing the shared-script approach (Pattern 6).*
3. **noindex divergence** (pre-prod `_headers` has it, prod does not; CSP unchanged) — folded into #2.
4. **`_headers` no-cache precondition for `version.js`** — cheap source-audit guarding the sentinel.
5. **DEBT-01 hygiene grep** — CONVENTIONS.md text changed + `add-client.js` de-IDed.

### Only verifiable in real CI / against a real CF origin (document as manual/live)
- Actual Pages promotion latency and the real poll against `sessionsgarden.app`.
- Actual zone purge success.
- `*.pages.dev` clean-URL semantics + real `INTEGRITY_TOKEN` roll on a **real installed PWA / iOS Safari** (the whole DEBT-03 device test — jsdom/python cannot see it, per the preprod todo).
- The appended `/*` noindex block's header-merge behavior on the real pre-prod origin (Pitfall/Assumption A-1).

### Wave 0 Gaps
- [ ] `tests/44-cf-await-promotion.test.js` — stub-`curl` behavior spec (covers DEBT-02)
- [ ] `tests/44-build-staging.test.js` — transform fidelity + noindex divergence (covers DEBT-03) *(if shared-script chosen)*
- [ ] `tests/44-conventions-hygiene.test.js` — DEBT-01 source-audit
- [ ] `scripts/cf-await-promotion.sh` — extracted, testable poll
- [ ] `scripts/build-staging.sh` — extracted, testable transform *(if shared-script chosen)*

## Security Domain

`security_enforcement` is not disabled in config → treated as enabled. This phase is infra hardening; the relevant controls:

| Concern | Control |
|---------|---------|
| Pre-prod exposure | Open URL + `X-Robots-Tag: noindex` on an unguessable `*.pages.dev` name (D-09). No Cloudflare Access (a login wall degrades iOS standalone-PWA cold-launch/SW testing). App is license-gated and holds no real data. |
| Secret sprawl | Pre-prod introduces **no new secrets**; content-polling avoids the Pages:read token the status API would require. |
| Fail-closed CI | Sentinel timeout and purge failure both `exit 1` loudly — no silent degradation (mirrors docs-gate / sensitive-files idiom). |
| No planning-ref leak to customers | DEBT-01 removes the sole runtime leak (`add-client.js` DevTools string) and fixes the instruction that causes leakage. |

Threat note (STRIDE): the mixed-cache incident is an **Integrity/Availability** failure (users served an inconsistent asset set); the sentinel-then-purge sequencing is its mitigation. No injection/authz surface is added.

## Environment Availability

| Dependency | Required by | Available | Notes |
|------------|------------|-----------|-------|
| GitHub Actions | both workflows | ✓ | prod pipeline already runs here |
| Cloudflare Pages (git integration) | prod + new pre-prod project | ✓ prod; pre-prod project = manual one-time create | dumb host, no build command |
| `curl`, `git`, `sh`, `node` in runner | sentinel, transform, tests | ✓ | all used by the existing pipeline/tests |
| CF secrets `CF_ZONE_ID`/`CF_PURGE_TOKEN` | prod purge only | ✓ | pre-prod needs none |

**Missing dependencies with no fallback:** none — the only new "dependency" is the manually-created second Pages project, planned as a human checkpoint.

## State of the Art

| Old approach | Current approach | Impact |
|--------------|------------------|--------|
| Purge immediately after `deploy` push | Purge only after content-sentinel confirms promotion | Eliminates the mixed-cache incident class |
| Non-blocking purge ("failed (non-blocking)") | Blocking purge after confirmed promotion | A confirmed-new origin + failed purge now fails the run loudly |
| No prod-faithful pre-release env (`python3 -m http.server` false-passes SW/offline two ways) | Second CF Pages project on `deploy-preprod` | Real clean URLs, real `_redirects`/`_headers`, real deploy-stamped `INTEGRITY_TOKEN` on a real device |
| Inline, un-testable pipeline shell | Extracted scripts with stub-binary offline tests | Pipeline logic becomes falsifiably tested (per repo standing rule) |

**Out of scope this phase (confirmed):**
- The un-checked-in Cloudflare-faithful local server from Phase 42 UAT — Ben explicitly declined to check it in; the pre-prod CF Pages project IS the real fix. Do NOT check it in here.
- `max-age=86400` rethink (purge-race direction 3) — deferred; note as a future pipeline consideration.
- The ~680-line comment retrofit + forward grep-gate — deferred to v1.5 (D-01, locked).

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A-1 | Appending a second `/*` block to `_headers` merges `X-Robots-Tag` alongside the base security headers | Pattern 4 | If CF instead lets a later block *replace* the earlier, the base CSP could drop on pre-prod. Low risk (pre-prod only, no real data); verify on first pre-prod deploy — that is what pre-prod is for. Fallback: `sed`-inject into the existing `/*` block. |
| A-3 | 5-min poll timeout / 10s interval comfortably covers CF Pages static promote latency | Pattern 1 | If promotes routinely exceed 5 min, runs fail spuriously. Tunable in one line; real latency only observable in a live run. |

**Assumptions that were ELIMINATED by verification:** the "does pre-prod need a purge?" question (CONTEXT hypothesis) is now VERIFIED as "no" on two independent grounds (Pattern 3) — not an assumption.

## Open Questions

1. **Shared-script vs. raw duplication for the transform** (Pattern 6)
   - Known: both are correct; CONTEXT blesses duplication.
   - Unclear: whether Ben wants prod's `deploy.yml` transform touched.
   - Recommendation: shared script (better testability + no drift), fallback to duplication. Planner/Ben's call at planning.
2. **Optional byte-consistency check** (DEBT-02 direction 4)
   - Known: the sentinel already confirms the token asset.
   - Recommendation: add only if it stays a 1–2-asset `curl` compare; otherwise skip. Not required by DEBT-02.

## Sources

### Primary (HIGH confidence)
- In-repo, read this session: `.github/workflows/deploy.yml`, `scripts/cf-purge-cache.sh`, `scripts/ci-resolve-docs-range.sh`, `_headers`, `_redirects`, `assets/version.js`, `sw.js`, `assets/add-client.js`, `.planning/codebase/CONVENTIONS.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/milestones/v1.2-phases/36-code-comments-batch-2/36-CONTEXT.md`, `tests/ci-resolve-docs-range.test.js`, `tests/run-all.js`, both folded todos.
- [Cloudflare Pages — Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/) — Pages CDN auto-invalidation on deploy; custom `max-age` caveat.

### Secondary (MEDIUM confidence)
- [Cloudflare Pages — REST API](https://developers.cloudflare.com/pages/configuration/api/) and [Get Deployment Info](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/get/) — `latest_stage` polling (evaluated and rejected in favor of content-polling).
- [Cloudflare Cache — Purge](https://developers.cloudflare.com/cache/how-to/purge-cache/) — zone-scoped purge (why pages.dev cannot be zone-purged).
- Cloudflare Community threads on stale Pages cache after deploy/purge — corroborate the custom-domain edge-cache staleness that motivates the prod purge.

### Tertiary (LOW confidence)
- None load-bearing.

## Metadata

**Confidence breakdown:**
- DEBT-02 sequencing & sentinel: HIGH — verified against exact file lines (`deploy.yml:59/84/88-96`, `_headers:22-23`, `version.js:32`).
- DEBT-03 topology & no-purge finding: HIGH — verified against Cloudflare docs + zone/pages.dev boundary + docs-gate anchor logic.
- DEBT-01 refs: HIGH — every line number confirmed against live files.
- noindex header-merge (A-1) and poll latency (A-3): MEDIUM — only fully confirmable on a real pre-prod/CI run.

**Research date:** 2026-07-11
**Valid until:** ~2026-08-10 (stable; Cloudflare Pages caching behavior and the repo pipeline are slow-moving). Re-verify the four DEBT-01 line numbers if any of those files change before planning.
