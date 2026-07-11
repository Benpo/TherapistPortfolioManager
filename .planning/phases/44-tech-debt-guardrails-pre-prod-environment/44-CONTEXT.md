# Phase 44: Tech-Debt Guardrails & Pre-Prod Environment - Context

**Gathered:** 2026-07-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Development guardrails and the deploy pipeline are hardened before any v1.4 feature work begins: the CONVENTIONS.md instruction that causes planning-ref leakage into shipped code is fixed at the root (DEBT-01, **re-cut — see D-01**), the Cloudflare cache purge can no longer race the Pages promotion (DEBT-02), and a real pre-prod environment on a second Cloudflare Pages project exists for on-device pre-release testing (DEBT-03).

**SCOPE RE-CUT (Ben, 2026-07-11, this discussion):** the baseline-aware forward grep-gate originally in DEBT-01 is **descoped to v1.5**, where it travels together with the ~680-line comment retrofit ("gate + hygiene work together"). Phase 44 must **edit REQUIREMENTS.md DEBT-01 and ROADMAP.md Phase 44 success criterion 1** to reflect this — that doc alignment is in scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### DEBT-01 — CONVENTIONS fix (no technical gate)
- **D-01 (scope re-cut):** NO test gate ships in Phase 44. The forward gate moves to v1.5 alongside the ~680-line retrofit. Rationale (Ben): gate and hygiene work belong together; bonus: a post-retrofit gate needs no baseline machinery — it can be a simple zero-tolerance grep. Accepted tradeoff (named and confirmed): v1.4's feature phases are protected only by the corrected instructions, with no enforcement layer.
- **D-02:** Phase 44 rewrites `.planning/codebase/CONVENTIONS.md` §Comments: replace "cite the phase and plan — do not omit" with the Phase 36 D-07 rule (no planning IDs in shipped code — phase/plan citations, D-NN, CR-NN, requirement IDs, process framing all become plain prose; the WHY/constraint stays). Record BOTH rationales: archived-`.planning/` dangling references AND customer exposure (`assets/**` ships its comments).
- **D-03:** The operative comment-style rules are **folded directly into CONVENTIONS.md §Comments** — one live doc every planner/executor reads. The archived `36-COMMENT-STYLE-GUIDE.md` is NOT promoted/moved; it stays as history.
- **D-04:** The rewrite also folds in Ben's test-naming rule (locked 2026-07-10): `{slug}.test.js`, no phase numbers in test filenames, provenance lives in git. Phase 43 deliberately left CONVENTIONS.md to this phase so the file is rewritten once, coherently.
- **D-05:** The single RUNTIME planning-ref leak — `assets/add-client.js:89` `console.warn(... "per D-23 (no hard cap)")` — **stays in Phase 44** (one-line reword keeping the no-hard-cap rationale, dropping the ID). It is customer-visible in DevTools today. This is the ONLY shipped-comment/string edit in this phase; no other comment content is touched.
- **D-06:** REQUIREMENTS.md DEBT-01 text and ROADMAP.md Phase 44 success criterion 1 are edited in-phase to match the re-cut (CONVENTIONS fix + console.warn reword only; gate → v1.5 deferred item in both docs' deferred sections).

### DEBT-03 — Pre-prod topology & access
- **D-07:** Delivery mirrors the prod pipeline: push to a `pre-prod` branch → a second GitHub Actions workflow runs the SAME staging transform as `deploy.yml` (whitelist `cp` into a staging dir, `__BUILD_TOKEN__` → git short-SHA stamp in `assets/version.js`) → force-pushes a `deploy-preprod` branch → the second CF Pages project serves that branch. No CF-side build command; CF stays a dumb host, and `.planning/`/`.claude/` can never leak.
- **D-08:** The docs-gate does NOT run on pre-prod pushes. It protects production releases; its range anchor reads the `deploy` branch (which pre-prod must never touch — ROADMAP success criterion 3). Everything still passes the gate when landing on main.
- **D-09:** Access control: open URL + noindex. Unguessable `*.pages.dev` project name, plus `X-Robots-Tag: noindex` added to the pre-prod copy of `_headers` — the ONE deliberate divergence from prod semantics. No Cloudflare Access (a login wall degrades iOS standalone-PWA cold-launch/SW testing, the core DEBT-03 use case). The app is license-gated and holds no real data.
- **D-10:** `pre-prod` is an ephemeral, force-pushable pointer: reset it to whatever needs device testing (main, main+feature, any candidate) with no merge ceremony. History has no value — same philosophy as the existing `deploy` branch.

### Claude's Discretion
- **DEBT-02 purge sequencing (Ben chose not to discuss — planner/researcher decide):** research should lead with the content-sentinel approach — after pushing `deploy-preprod`/`deploy`, poll the LIVE production origin (e.g. `assets/version.js`, which is no-cache) until it serves the new `GITHUB_SHA::7`, THEN purge; on timeout fail the run loudly (no purge — a consistently-old cache is safe, a mixed one is not). No new secrets needed vs the CF Pages status API. The planner picks among the incident todo's four directions (sentinel poll, double purge, `max-age` rethink, post-deploy byte-consistency check) — the requirement demands only purge-after-confirmed-promotion; the consistency check is recommended if cheap.
- Pre-prod workflow mechanics: workflow file name, staging-dir name, concurrency group (must be separate from the prod `deploy` group), whether to parameterize/share steps with `deploy.yml` or duplicate them — planner's call. Duplication is acceptable; faithfulness to the prod transform is the constraint.
- CF Pages second-project creation is a one-time MANUAL step (Ben, in the CF dashboard: new Pages project → connect repo → production branch `deploy-preprod`). Plan it as a human checkpoint with exact click-path instructions.
- Whether pre-prod needs its own cache purge: pages.dev is not in Ben's CF zone, so the prod zone-purge doesn't apply; likely no purge step at all. Verify during research.

### Folded Todos
- **`2026-07-10-deploy-purge-race-mixed-cache.md`** (resolves_phase: 44) — the v1.3.0 mixed-cache incident: `deploy.yml` purges CF cache BEFORE Pages promotes, edges re-cache old assets, installed PWAs precache a poisoned mix. Phase 44 closes it via DEBT-02.
- **`2026-07-10-preprod-branch-cf-pages-environment.md`** (resolves_phase: 44) — no environment reproduces prod URL semantics (`python3 -m http.server` false-passes SW/offline tests two silent ways). Phase 44 closes it via DEBT-03.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### DEBT-01 — comment hygiene
- `.planning/todos/pending/2026-07-10-comment-hygiene-retrofit-and-forward-gate.md` — the forensic audit: root-cause contradiction, regression evidence, load-bearing citations that must be reworded not deleted. **NOT closed by this phase** (retrofit + gate stay in it for v1.5); note the DEBT-01 re-cut when consuming it.
- `.planning/codebase/CONVENTIONS.md` §Comments (lines ~149–157) — the text to rewrite (the "do not omit" instruction is the root cause).
- `.planning/milestones/v1.2-phases/36-code-comments-batch-2/36-COMMENT-STYLE-GUIDE.md` — source material for the rules folded into §Comments (stays archived).
- `.planning/milestones/v1.2-phases/36-code-comments-batch-2/36-CONTEXT.md` (line ~40) — Phase 36 D-07, the rule being adopted.
- `.planning/REQUIREMENTS.md` (DEBT-01, line ~46) and `.planning/ROADMAP.md` (Phase 44 criterion 1, line ~113) — both must be edited per D-06.

### DEBT-02 / DEBT-03 — deploy pipeline & pre-prod
- `.planning/todos/pending/2026-07-10-deploy-purge-race-mixed-cache.md` — incident anatomy + four candidate fix directions.
- `.planning/todos/pending/2026-07-10-preprod-branch-cf-pages-environment.md` — why local servers false-pass; what only a real CF origin covers; the un-checked-in Cloudflare-faithful local server from Phase 42 UAT.
- `.github/workflows/deploy.yml` — the prod pipeline to fix (purge step, lines 88–96) and to mirror (staging transform, lines 42–59). Its `Deploy from <sha>` commit subject is the docs-gate anchor — the pre-prod pipeline must not disturb the `deploy` branch or that anchoring.
- `scripts/ci-resolve-docs-range.sh` + `scripts/docs-gate.js` — the gate whose anchoring constrains pre-prod (D-08); recovery runbook context in the project CLAUDE.md.
- `_headers`, `_redirects`, `assets/version.js`, `sw.js` — prod URL/caching semantics the pre-prod project must reproduce (clean URLs, no-cache rules, deploy-stamped `INTEGRITY_TOKEN`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `deploy.yml` staging transform (whitelist cp + sed token stamp) — the exact recipe the pre-prod workflow mirrors; proven since Phase 19/28.
- `scripts/cf-purge-cache.sh` — existing purge helper; candidate home for the sentinel-then-purge logic.
- Custom zero-npm test runner (`tests/run-all.js`) — relevant only if the planner adds pipeline behavior tests (precedent: `scripts/ci-resolve-docs-range.sh` has stubbed-git behavior tests).

### Established Patterns
- Fail-closed CI steps with loud echo + exit 1 (docs-gate step, sensitive-files check) — the purge sequencing and any new checks should follow this idiom. Note the current purge is explicitly non-blocking ("Cache purge failed (non-blocking)"); DEBT-02 changes its sequencing, and the planner must decide its new failure semantics deliberately.
- `assets/version.js` is deploy-stamped and served no-cache — this is what makes it the natural promotion sentinel (D-28-04 precedent: token file must be no-cache).
- Concurrency group `deploy` with cancel-in-progress on the prod workflow — the pre-prod workflow needs its own group.

### Integration Points
- Second CF Pages project watches `deploy-preprod` (new branch, new workflow) — zero contact with `main`→`deploy` flow.
- `_headers` gets a pre-prod-only `X-Robots-Tag: noindex` injected during the pre-prod staging transform (do NOT commit it to the shared `_headers`).
- REQUIREMENTS.md / ROADMAP.md edits (D-06) touch `.planning/` only — no docs-gate implications (not shipped code).

</code_context>

<specifics>
## Specific Ideas

- Ben (Phase 42 UAT, origin of DEBT-03): "I would just create a second branch with pre-prod version of the app which we can connect to another CF page" — the discussion confirmed exactly this shape, mirrored through a `deploy-preprod` branch.
- Ben (this discussion): "I want the future gate to also be part of the hygiene work together — so both are pushed. But the conventions fix could be done, just not a real technical gate."
- v1.3.0 incident remediation knowledge (from the purge-race todo): `gh run rerun` re-lands the purge post-promotion; an empty-commit deploy rolls the token to heal poisoned PWA caches. The post-fix pipeline should make both unnecessary.

</specifics>

<deferred>
## Deferred Ideas

- **v1.5 — comment-hygiene retrofit + forward gate (travel together, Ben 2026-07-11):** the ~680-line / ~43-file reword sweep AND the enforcement gate. Post-retrofit the gate needs no baseline-awareness — plan it as a simple zero-tolerance grep over shipped comments/strings. Keep the todo's "load-bearing citations — reword, do NOT bare-delete" list authoritative.
- `max-age=86400` on assets without cache-busting filenames (purge-race todo, direction 3) — only in scope for Phase 44 if the planner's DEBT-02 solution requires it; otherwise note as a future pipeline consideration.

### Reviewed Todos (not folded)
- `2026-07-10-comment-hygiene-retrofit-and-forward-gate.md` — reviewed; NOT folded. Phase 44 executes only its CONVENTIONS.md fix + console.warn reword; the todo stays pending as the v1.5 retrofit+gate seed. Add a note to the todo marking those two items as handled in Phase 44.

</deferred>

---

*Phase: 44-Tech-Debt Guardrails & Pre-Prod Environment*
*Context gathered: 2026-07-11*
