# Phase 32: README + Code Comments - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Two documentation deliverables for the maintainer of the app:

1. **DOCS-01 — Maintainer README.** Rewrite the existing root `README.md` into a single, in-repo maintainer guide: how to run locally, how to deploy, a current file-map of how the app is organized, a small set of "how do I…" recipes, how to run the tests, and the invariants an AI agent must not break.
2. **DOCS-02 — Code-comment pilot.** De-phase-number and add responsibility/structure header banners to the **5 files touched by the Phase 31 refactor** (the 3 extracted modules + their 2 slimmed parents). Comment-only, guarded by the green suite + a comments-only diff check.

Plus **two lightweight by-product planning artifacts** produced as a natural by-product of the doc work (both seed *future* phases, both live in `.planning/`):
- a **help-content inventory** (concretizes Phase 26's workflow spine), and
- a **comment-coverage map** (which JS files are done / remain → seeds a "comments — batch 2" phase).

The audience reframe is foundational and supersedes PROJECT.md's older "non-technical Sapir, multi-machine collab" framing (see D-01/D-02).

**Explicitly NOT this phase** (surfaced today, captured in Deferred for their own phases):
- Vendored-lib version pinning (HARD-02 + jszip/bidi) — code/tooling, not docs.
- Refreshing `demo.html` to the current UI — its own (urgent) phase.
- An all-JS-files comment sweep — this phase is the *pilot*; batch-2 is a later phase.
- Refreshing `.planning/codebase/*.md` — already done as the pre-step (maps refreshed 2026-06-28).

</domain>

<decisions>
## Implementation Decisions

### Audience (foundational reframe — supersedes PROJECT.md for doc purposes)
- **D-01 — Maintainer = Ben, solo, technically-comfortable.** Ben drives Claude Code, is comfortable in a terminal / with git / with architecture at a concept level (not a daily JS author). **Sapir is no longer hands-on** — she remains the business/Gewerbe/domain owner, not the developer. The docs are calibrated for "an AI-assisted owner + his agents," not a non-technical first-timer. This is denser/less hand-holdy than the original DOCS-01 "for Sapir" wording, but serves the same intent (a maintainable app).
- **D-02 — Cloud Claude Code is now a feasible workflow** (Ben: "a more feasible approach nowadays," which "wasn't really there when we started" — raised as a reason to update the audience framing, not asserted as his sole/primary workflow). Consequences: the README lives **in the repo** so a cloud agent can read it as context (reinforces D-03); drop the multi-machine-collaboration emphasis; **keep** local-serve instructions (localhost is required for the Web Crypto secure-context backup features).

### README (DOCS-01)
- **D-03 — One in-repo README**, rewriting the existing root `README.md`. NOT split, NOT a separate `MAINTAINING.md` (audience-separation rationale evaporated when Sapir stepped back; one doc is simplest for a solo owner + agents).
- **D-04 — Stop shipping the README publicly.** Remove the `cp README.md deploy-staging/` line from `.github/workflows/deploy.yml` so the maintainer README stays repo-only. **This is the only production-adjacent change in the phase.** (Repo *assumed* private — Ben didn't correct the assumption when offered; verify before relying on it. The Cloudflare copy was unlinked — no loss. Avoids publishing maintenance/deploy detail at the product URL.)
- **D-05 — Operational-first depth.** Center of gravity = "run / deploy / make a change," not an architecture treatise. Section skeleton (planner refines): Run locally · Deploy & ship a change · Current file-map · How do I… (recipes) · Run the tests · Rules an agent must not break · Troubleshoot / get help.
- **D-06 — ~6 "how do I…" recipes** (refinable at plan time): (1) run locally (`python3 -m http.server` + why localhost matters for Web Crypto); (2) `npm test`; (3) ship a change (push `main` → Action → `deploy` branch → Cloudflare; the version / SW `CACHE_NAME` bump habit + the pre-commit SW-bump gotcha); (4) bump the app version (`version.js` single source → footer + cache + integrity self-check); (5) add/edit a translation string (`i18n-*.js`, 4 languages, the `// TODO i18n` pattern); (6) add a new JS module (IIFE + ordered `<script>` + `PRECACHE_URLS` + SW bump).
- **D-07 — "Rules an agent must not break" section** (the highest-value content for cloud-agent maintenance): zero-runtime-dependency production rule; the IIFE `<script>` load order / cross-`window.*` resolution chain; the pre-commit SW-bump gotcha; `PRECACHE_URLS` upkeep; no external network calls (offline/privacy promise).
- **D-08 — Architecture depth = navigate-level.** The README carries its OWN current, self-contained file-map (accurate as of Phase 31). For deeper background it **points to** the freshly-refreshed `.planning/codebase/*.md` rather than duplicating them. Do not lean on a stale snapshot — the file-map must reflect the post-P31 structure.

### Code comments (DOCS-02) — the PILOT
- **D-09 — Scope = exactly 5 files.** The 3 extracted modules — `assets/settings-snippets.js`, `assets/settings-photos.js`, `assets/export-modal.js` — plus the 2 slimmed parents — `assets/settings.js`, `assets/add-session.js`. NOT `overview.js`/`sessions.js`/`db.js` (those are the natural batch-2 first group; see D-14). Deliberately tight so it's a clean, reviewable pilot whose convention transfers.
- **D-10 — Two comment jobs, both comment-only.** (a) **De-phase-numbering:** rewrite `// Phase 24 Plan 05 …` / `// Phase 25 Plan 07 …` header titles and any `// D-NN (Phase X)` archaeology into plain what-it-does text (finishes the D-05 deferral from Phase 31). (b) **Responsibility/structure banners:** each file gets a header — *what it owns · its public surface · its dependencies (the `window.*` chain) · key invariants.* `settings-snippets.js`/`settings-photos.js` already have rich headers (mainly de-phase them); `export-modal.js`'s header is already good; `settings.js`/`add-session.js` get **new** orientation headers reflecting their slimmed shape + what was extracted out.
- **D-11 — Guardrail.** Verify with (a) green `npm test`, and (b) a **comments-only diff check** — the diff must touch only comment/header lines, zero code lines. This makes "it's only comments, so it's low-risk" a *verified* claim, not an assumption.
- **D-12 — This is the pilot** that establishes the comment convention + process for a later v1.2 "comments — batch 2" phase (see Deferred). Capturing the *approach* cleanly is part of the deliverable.

### By-product artifacts (lightweight planning seeds, both in `.planning/`)
- **D-13 — Help-content inventory** (extends Phase 26's workflow spine). **Method:** ~4 persona lenses — *struggling novice*, *trainer/onboarder*, *power user*, *domain expert (Sapir-like)* — + 1 **grounded feature-coverage auditor** + 1 **synthesizer** (~6 agents; final count + per-persona prompts are plan-time). *(Attribution: Ben explicitly named the struggling novice — his "stupid user" — and the trainer, and asked "what other personas/questions exist?"; power user and domain expert are proposed additions answering that.)* **Output = inventory ONLY:** a topic/workflow tree, each leaf = title + one-line intent, mapped to a real feature/page and tagged `{persona source, P26 status, suggested format (tour step / FAQ / page section), priority}`. **NOT help copy** (that's the future help phase + P26's copy contract). **Grounds in the CURRENT live app** (refreshed maps + REQUIREMENTS + real pages) + the P26 spine. **EXCLUDES `demo.html` / `demo-hints.js` as a topic source — the demo is stale** (its *rendering pattern* may inform the future tour build, never the topics). EN-only. May harvest live guidance signals (empty states, greeting quotes) but not the demo. Suggested path: `.planning/phases/32-readme-code-comments/32-HELP-CONTENT-INVENTORY.md`.
- **D-14 — Comment-coverage map.** Every JS module marked done / remaining, with `overview.js` / `sessions.js` / `db.js` flagged as the natural **batch-1** for the follow-up phase (freshly touched in P31 → lowest staleness). Seeds the "comments — batch 2" phase. Suggested path: `.planning/phases/32-readme-code-comments/32-COMMENT-COVERAGE-MAP.md`.

### Claude's Discretion
- Exact recipe wording and final count (~6); exact artifact filenames/paths; persona agent count (~6 total) and per-persona prompts; README section ordering and headings. Planner/executor finalize within the decisions above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` §DOCS-01, DOCS-02 — the two locked requirements (note DOCS-01's "for Sapir" wording is reframed by D-01: maintainer = Ben + agents).
- `.planning/ROADMAP.md` §"Phase 32: README + Code Comments" — goal, depends-on (Phase 31), success criteria.
- `.planning/PROJECT.md` §Context / Constraints / Key Decisions — zero-runtime-dependency / vanilla-JS / no-build production constraints; the dev/prod npm split locked 2026-06-26 (devDeps may use npm; production stays static); **note the audience reframe (D-01) supersedes the "non-technical Sapir / multi-machine" Context lines for doc purposes.**

### The current codebase (PRIMARY source — refreshed 2026-06-28 as this phase's pre-step)
- `.planning/codebase/ARCHITECTURE.md` — how pages/modules wire via the cross-IIFE `window.*` chain (README architecture section + the comment banners' "dependencies" lines).
- `.planning/codebase/STRUCTURE.md` — asset/file layout (the README file-map).
- `.planning/codebase/CONVENTIONS.md` — the IIFE module pattern, `window.*` registration, ordered `<script>` loading (the "rules an agent must not break" + comment-header convention).
- `.planning/codebase/CONCERNS.md` §vendored libs / demo staleness — sourced today's two adjacent items (vendor pinning; demo refresh).
- `.planning/codebase/STACK.md`, `.planning/codebase/INTEGRATIONS.md`, `.planning/codebase/TESTING.md` — stack, external touchpoints (Lemon Squeezy, Cloudflare), and the `npm test` harness (the test recipe).

### The refactor this phase documents
- `.planning/phases/31-refactor-god-modules/31-CONTEXT.md` — D-05 deferred the phase-number → descriptive comment pass to Phase 32; describes the extracted-module structure DOCS-02 banners must reflect.
- Comment targets (the 5 files): `assets/settings-snippets.js`, `assets/settings-photos.js`, `assets/export-modal.js`, `assets/settings.js`, `assets/add-session.js`.

### README mechanics
- `README.md` (current root) — the doc being rewritten (a decent skeleton; public/marketing-leaning today).
- `.github/workflows/deploy.yml` — the deploy pipeline (the "ship a change" recipe + the `cp README.md` line to remove per D-04).
- `package.json` — dev/test tooling (the `npm test` recipe; the vendored-lib pinning context for the future phase).
- `assets/version.js` + `sw.js` `PRECACHE_URLS` — the version-bump / new-module recipes.

### Help inventory source
- `.planning/milestones/v1.1-phases/26-in-app-onboarding-overview-help-system/26-UI-SPEC.md` — the standalone Help page + **workflow-spine (~7 steps)** + guided-tour design the inventory **extends** (and its copywriting contract: domain-correct, not generic-SaaS).

### Project memory (process)
- `reference-pre-commit-sw-bump.md` — `PRECACHE_URLS` edits need a manual `CACHE_NAME` bump follow-up (ship-a-change recipe + agent invariants).
- `reference-pwa-sw-cache-updates.md` — stale-SW-cache failure mode (deploy/troubleshoot section).
- `project-version-bump-convention.md` — the version scheme (bump-the-version recipe).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Existing root `README.md`** — a workable skeleton (What It Does / Privacy / Tech Stack / Development / Project Structure / Deployment / License). Rewrite in place; its Project-Structure block is now stale (predates the P31 extractions) and is exactly what D-08's current file-map replaces.
- **The 3 extracted modules already carry header blocks** — `settings-snippets.js` and `settings-photos.js` have rich headers but still titled `// Phase 24 Plan 05` / `// Phase 25 Plan 07` (the de-phase target, D-10a); `export-modal.js`'s header (context-injection handshake) is already clean and descriptive — a good template for the banner convention.
- **Freshly-refreshed `.planning/codebase/*.md`** — the primary, now-accurate source for the README architecture/file-map and the comment banners' dependency lines.

### Established Patterns
- **IIFE page-private modules + ordered `<script>` + cross-`window.*` resolution chain** (`App.*`, `PortfolioDB.*`, `Snippets.*`, `SNIPPETS_SEED`, `I18N`) — documented inline at `settings.js:698–705`. The README's "agent rules" and the comment banners both describe this.
- **Zero-build / zero-runtime-dependency production**; dev/test tooling (`package.json`, `jsdom`) is dev-only and never ships. The README must state this as a hard invariant.
- **Deploy = `main` → GitHub Action → `deploy` branch → Cloudflare Pages**, with a dev-only `sed` token-stamp on `version.js` (not a bundler). The ship-a-change recipe mirrors this.

### Integration Points
- `.github/workflows/deploy.yml` — remove the `cp README.md` line (D-04).
- The 5 comment-target files — header/comment edits only (D-09/D-11).
- New planning artifacts under `.planning/phases/32-readme-code-comments/` (help inventory, coverage map).

</code_context>

<specifics>
## Specific Ideas

- **The README doubles as agent-context.** With cloud Claude Code now a feasible workflow, an in-repo README whose "rules an agent must not break" section is precise is a high-leverage maintenance artifact — write it for a capable agent + Ben, not for a non-technical first-timer.
- **End the comment-topic drag deliberately.** The comment work has carried since ~Phase 29; this phase resolves it not by sweeping every file (staleness/accuracy risk on un-touched files) but by a tight pilot (5 files) + a coverage map that makes a templated batch-2 phase plannable. The goal is "done and repeatable," not "carried forward again."
- **Vendored libs were constraint-correct, not negligent.** Vendoring jsPDF/JSZip/bidi locally is *required* by zero-build + offline + `file://` + the no-external-calls privacy promise. The real gap is provenance/version-tracking — and that was only *fixable* once `package.json` arrived in Phase 30. (Details in Deferred.)
- **`demo.html` is stale and must never be a help-content source.** Flagged explicitly so the persona/auditor agents ground only in the current live app.

</specifics>

<deferred>
## Deferred Ideas

**Three post-32 v1.2 candidate phases surfaced today (a real expansion of v1.2; sequence via `/gsd-phase` when Ben is ready — not added unilaterally):**

1. **Comments — batch 2.** Apply this phase's comment pilot (convention + comments-only-diff guardrail) to the next file group. **Batch-1 candidates:** `overview.js`, `sessions.js`, `db.js` (freshly touched in P31 → lowest staleness). Driven by the D-14 coverage map. Best run before any further code change to those files (no staleness window). **Placement (Ben):** "after 32 — maybe pushing the existing 33, or after the existing 33, let's see." Within v1.2 (distinct from the v1.3 broader-extraction backlog).

2. **Vendor-dependency pinning (HARD-02, extended to jszip + bidi).** *Captured understanding (per Ben's request):*
   - **Facts (2026-06-28):** `jspdf.min.js` = 2.5.2 (a major behind the 3.x line; lazy-loaded by `pdf-export.js`); `jszip.min.js` = 3.10.1 (**already latest**; used in `backup.js` on 7 pages); `bidi.min.js` = tiny `window.bidi_js()` UMD (Hebrew RTL). None referenced in `package.json`.
   - **Why it's like this:** vendoring is constraint-correct (zero-build, offline, `file://`, no external calls). The gap is provenance/version-tracking, only *fixable* since `package.json` landed in P30.
   - **Risk:** hygiene gap, low immediate exploitability (input is the user's own data, rendered locally; JSZip already current).
   - **Recommended approach:** pin all three as exact-version **devDependencies** + an `npm run vendor` copy script (production still ships the static copy — dev-only step, matches the 2026-06-26 dev/prod split). **Reject** CDN+SRI (breaks offline + privacy + CSP). Manifest-only (`VENDOR.md`) is the MVP fallback. **The real task:** verify the npm dist files are equivalent to the current vendored copies (especially `bidi-js` — the `window.bidi_js()` global implies a specific UMD build).

3. **Demo refresh (URGENT, per Ben).** `demo.html` uses very old UI and is fully stale → update it to the current app. Its own phase (not Phase 32). Until then, the demo is treated as non-authoritative everywhere (and is excluded as a help-content source, D-13).

**Other:**
- **v1.3 "Codebase Health II" backlog** — broader extraction + test-coverage health (`app.js`, `license.js`, etc.) per `.planning/todos/pending/2026-06-26-broader-extraction-and-test-coverage-health.md`. The comments batch-2 phase is narrower (comments only) and stays inside v1.2.

### Reviewed Todos (not folded)
The phase-match query surfaced **14 todos, all generic keyword hits (score 0.4–0.6); none is genuine Phase-32 docs work — none folded.** Notable:
- `2026-03-24-pwa-install-guidance-and-user-manual.md` — an **end-user** manual (PWA install + user help), a *different audience* from the maintainer README. Stays deferred; partially related to the future help-section phase, not this one.
- `2026-06-28-phase31-code-review-followups.md`, `2026-06-27-phase30-test-helper-quality-followups.md` — tech-debt/testing, not docs.
- The rest are feature/UX items unrelated to documentation.

</deferred>

---

*Phase: 32-readme-code-comments*
*Context gathered: 2026-06-28*
