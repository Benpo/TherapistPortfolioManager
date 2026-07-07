# Phase 32: README + Code Comments - Research

**Researched:** 2026-06-28
**Domain:** Internal documentation (maintainer README) + code-comment pilot for a zero-build vanilla-JS PWA
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Audience (foundational reframe — supersedes PROJECT.md for doc purposes)**
- **D-01 — Maintainer = Ben, solo, technically-comfortable.** Drives Claude Code, comfortable in terminal/git/architecture-at-concept-level (not a daily JS author). Sapir is no longer hands-on (business/Gewerbe/domain owner, not developer). Calibrate docs for "an AI-assisted owner + his agents," denser/less hand-holdy than the original "for Sapir" wording.
- **D-02 — Cloud Claude Code is a feasible workflow.** README lives in-repo so a cloud agent can read it as context; drop multi-machine-collaboration emphasis; KEEP local-serve instructions (localhost required for Web Crypto secure-context backup features).

**README (DOCS-01)**
- **D-03 — One in-repo README**, rewriting existing root `README.md`. NOT split, NOT a separate `MAINTAINING.md`.
- **D-04 — Stop shipping the README publicly.** Remove the `cp README.md deploy-staging/` line from `.github/workflows/deploy.yml`. **This is the only production-adjacent change in the phase.** (Repo assumed private — verify before relying on it.)
- **D-05 — Operational-first depth.** Center of gravity = "run / deploy / make a change," not an architecture treatise. Section skeleton (planner refines): Run locally · Deploy & ship a change · Current file-map · How do I… (recipes) · Run the tests · Rules an agent must not break · Troubleshoot / get help.
- **D-06 — ~6 "how do I…" recipes** (refinable): (1) run locally (`python3 -m http.server` + why localhost matters for Web Crypto); (2) `npm test`; (3) ship a change (push `main` → Action → `deploy` branch → Cloudflare; the version/SW `CACHE_NAME` bump habit + pre-commit SW-bump gotcha); (4) bump the app version (`version.js` single source → footer + cache + integrity self-check); (5) add/edit a translation string (`i18n-*.js`, 4 languages, `// TODO i18n` pattern); (6) add a new JS module (IIFE + ordered `<script>` + `PRECACHE_URLS` + SW bump).
- **D-07 — "Rules an agent must not break" section** (highest-value content): zero-runtime-dependency production rule; the IIFE `<script>` load order / cross-`window.*` resolution chain; the pre-commit SW-bump gotcha; `PRECACHE_URLS` upkeep; no external network calls (offline/privacy promise).
- **D-08 — Architecture depth = navigate-level.** README carries its OWN current, self-contained file-map (accurate as of Phase 31). For deeper background it POINTS TO `.planning/codebase/*.md` rather than duplicating. Do not lean on a stale snapshot.

**Code comments (DOCS-02) — the PILOT**
- **D-09 — Scope = exactly 5 files.** 3 extracted modules — `assets/settings-snippets.js`, `assets/settings-photos.js`, `assets/export-modal.js` — plus 2 slimmed parents — `assets/settings.js`, `assets/add-session.js`. NOT `overview.js`/`sessions.js`/`db.js`.
- **D-10 — Two comment jobs, both comment-only.** (a) De-phase-numbering: rewrite `// Phase 24 Plan 05 …` / `// Phase 25 Plan 07 …` titles and `// D-NN (Phase X)` archaeology into plain what-it-does text. (b) Responsibility/structure banners: each file gets a header — what it owns · public surface · dependencies (the `window.*` chain) · key invariants. snippets/photos already have rich headers (mainly de-phase); export-modal header already good; settings.js/add-session.js get NEW orientation headers reflecting slimmed shape + what was extracted out.
- **D-11 — Guardrail.** Verify with (a) green `npm test` and (b) a comments-only diff check — the diff must touch only comment/header lines, zero code lines.
- **D-12 — This is the pilot** establishing the comment convention + process for a later v1.2 "comments — batch 2" phase.

**By-product artifacts (lightweight planning seeds, both in `.planning/`)**
- **D-13 — Help-content inventory.** ~4 persona lenses (struggling novice, trainer/onboarder, power user, domain expert) + 1 grounded feature-coverage auditor + 1 synthesizer (~6 agents; final count + prompts plan-time). Output = INVENTORY ONLY: topic/workflow tree, each leaf = title + one-line intent, mapped to a real feature/page, tagged `{persona source, P26 status, suggested format, priority}`. NOT help copy. Grounds in CURRENT live app + P26 spine. EXCLUDES `demo.html`/`demo-hints.js` (stale). EN-only. Suggested path: `.planning/phases/32-readme-code-comments/32-HELP-CONTENT-INVENTORY.md`.
- **D-14 — Comment-coverage map.** Every JS module marked done/remaining, with `overview.js`/`sessions.js`/`db.js` flagged as batch-1 for the follow-up phase. Suggested path: `.planning/phases/32-readme-code-comments/32-COMMENT-COVERAGE-MAP.md`.

### Claude's Discretion
Exact recipe wording and final count (~6); exact artifact filenames/paths; persona agent count (~6 total) and per-persona prompts; README section ordering and headings.

### Deferred Ideas (OUT OF SCOPE)
- **Comments — batch 2** (`overview.js`/`sessions.js`/`db.js` first). Own future v1.2 phase.
- **Vendor-dependency pinning** (HARD-02 + jszip + bidi). Own future phase. Facts captured: `jspdf.min.js` 2.5.2, `jszip.min.js` 3.10.1 (latest), `bidi.min.js` UMD `window.bidi_js()`. Approach: pin as exact-version devDependencies + `npm run vendor` copy script; reject CDN+SRI.
- **Demo refresh** (URGENT). `demo.html` stale UI. Own phase. Demo is non-authoritative everywhere; excluded as help-content source.
- **All-JS-files comment sweep** — this phase is the pilot only.
- **Refreshing `.planning/codebase/*.md`** — already done as this phase's pre-step (2026-06-28).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOCS-01 | A project README documents how to run, deploy, and understand the architecture of the app, written for the maintainer (reframed by D-01: Ben + agents, not Sapir) | Verified live mechanics for all 6 recipes: run (`python3 -m http.server`), test (`npm test` → `tests/run-all.js`, 106 files), deploy (`.github/workflows/deploy.yml`), version bump (`assets/version.js` `APP_VERSION='1.2.2'` + `INTEGRITY_TOKEN`), i18n (`// TODO i18n` markers confirmed in `i18n-cs.js`), new-module (`PRECACHE_URLS` in `sw.js`). Current file-map sourced from refreshed `.planning/codebase/STRUCTURE.md`. Agent-rules content sourced from `.planning/codebase/ARCHITECTURE.md` §Architectural Constraints + CONVENTIONS.md. |
| DOCS-02 | Refactored modules carry code-level comments describing structure and responsibilities | Surveyed before-state of all 5 target files (headers, phase-archaeology counts). Confirmed a sound, dependency-free comments-only-diff verification method (strip-and-compare). See Validation Architecture. |
</phase_requirements>

## Summary

This is a **documentation phase**, not a feature build. There is **near-zero value in external/library web research** — the entire ground truth is the in-repo codebase and the freshly-refreshed `.planning/codebase/*.md` maps (refreshed 2026-06-28 as this phase's pre-step). All research below was conducted by reading the actual repo files, so claims are tagged `[VERIFIED: <file>]` where confirmed against the live source and `[CITED: <map>]` where sourced from the codebase maps.

Two deliverables: (1) a **maintainer README** rewriting the existing public-leaning `README.md` into an operational, agent-readable in-repo guide; (2) a tight **5-file code-comment pilot** that de-phase-numbers headers and adds responsibility banners, guarded by green `npm test` + a comments-only diff. Plus two lightweight planning seeds (help-content inventory, comment-coverage map).

The single highest-value, lowest-confidence technical question — "how do you mechanically prove a diff is comments-only?" — is resolved: a **deterministic comment-strip-and-compare** check is sound even with an imperfect stripper (proof in Validation Architecture), needs zero new tooling, and matches the project's existing `fs.readFileSync`-based source-audit test style.

**Primary recommendation:** Rewrite `README.md` in place against the verified mechanics below; structure DOCS-02 as its own isolated commit(s) so the comments-only diff is trivial to gate; verify with green `npm test` + a deterministic strip-and-compare check (no acorn/parser dep — confirmed not resolvable top-level).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Maintainer README (DOCS-01) | Repo / docs (in-repo `README.md`) | — | D-02/D-03: lives in-repo as agent context; D-04 removes it from the deploy artifact so it is never a CDN/static-served asset |
| Code-comment banners (DOCS-02) | Source files (`assets/*.js`) | — | Comment-only edits to 5 existing browser-tier IIFE modules; no runtime tier touched |
| Deploy-pipeline edit (D-04) | CI/CD (`.github/workflows/deploy.yml`) | — | One-line removal; the only production-adjacent change |
| Help-content inventory (D-13) | Planning artifact (`.planning/`) | — | Seeds a future help phase; no app-tier impact |
| Comment-coverage map (D-14) | Planning artifact (`.planning/`) | — | Seeds a future comments-batch-2 phase; no app-tier impact |

**Tier sanity note for the planner:** every deliverable is either a doc/planning artifact or a comment-only source edit. The only file that affects production behavior at all is `deploy.yml` (D-04), and that change *removes* a copy step — it ships strictly less. No browser/API/DB/storage logic changes in this phase.

## Standard Stack

**Not applicable — no packages installed, no libraries added.** This phase is documentation + comment edits + one CI line removal. Production stays zero-runtime-dependency vanilla JS by hard constraint `[CITED: .planning/codebase/CONVENTIONS.md]`. The only tooling involved already exists:

| Tool | Version | Purpose | Status |
|------|---------|---------|--------|
| `python3 -m http.server` | system | Local serve (README recipe 1) | Present (system) |
| Node.js | `>=18.0.0` (engines field) | Run `npm test` + the comments-only-diff check | Present `[VERIFIED: package.json]` |
| `jsdom` | `^29.1.1` | Existing sole devDependency (test DOM) | Present `[VERIFIED: package.json]` |
| `git` | system | Baseline diff for the comments-only gate | Present (repo) |

**No installation step.** Do NOT add a parser dependency for the comments-only check — see Don't Hand-Roll and Validation Architecture.

## Package Legitimacy Audit

**N/A — this phase installs no external packages.** No npm/PyPI/crates additions. The deferred vendor-pinning work (HARD-02 + jszip/bidi) is explicitly out of scope (its own future phase) and would carry its own legitimacy audit when planned.

## Architecture Patterns

### System Architecture Diagram (what the README file-map + agent-rules must reflect)

```text
                 HTML page (e.g. settings.html)  ── entry point
                          │  ordered <script> tags = the dependency graph
                          ▼
   version.js → crashlog.js → i18n-*.js → i18n.js → app.js → db.js
              → backup.js → shared-chrome.js → <page module(s)>
                          │  every module is an IIFE that registers on window.*
                          ▼
   Cross-window.* resolution chain (NO import/export):
     window.App.*            (app.js)        i18n, nav, toasts, caches
     window.PortfolioDB.*    (db.js)         ALL IndexedDB I/O (choke-point)
     window.BackupManager.*  (backup.js)     ZIP + AES-256-GCM
     window.Snippets.* / window.SNIPPETS_SEED / window.I18N
                          │
                          ▼
          IndexedDB "sessions_garden" v6   (local-only, never transmitted)

   Parallel: sw.js  importScripts('/assets/version.js')
             → CACHE_NAME = 'sessions-garden-' + INTEGRITY_TOKEN
             → precaches PRECACHE_URLS  (SW never touches IndexedDB)
```
`[CITED: .planning/codebase/ARCHITECTURE.md]` `[VERIFIED: sw.js]` `[VERIFIED: assets/version.js]`

### Pattern 1: The maintainer README structure (DOCS-01)
**What:** Single in-repo operational guide. Recommended section order (D-05; planner may refine per Discretion):
1. What it is (one short paragraph — keep the privacy/offline value prop)
2. **Run locally** (recipe 1)
3. **Deploy & ship a change** (recipe 3)
4. **Current file-map** (self-contained, post-P31 — D-08)
5. **How do I… (recipes)** (recipes 2,4,5,6)
6. **Rules an agent must not break** (D-07)
7. **Troubleshoot / get help** (stale-SW-cache failure mode)
8. Pointer to `.planning/codebase/*.md` for deeper architecture (D-08)

**When to use:** This is the deliverable. The existing README (What It Does / Privacy / Tech Stack / Development / Project Structure / Deployment / License) is a workable skeleton but its **Project Structure block is stale** (predates P31 extractions, lists no `settings-snippets.js`/`settings-photos.js`/`export-modal.js`) `[VERIFIED: README.md lines 42–66]`.

### Pattern 2: The comment-banner convention (DOCS-02)
**What:** A file-top header block: *what it owns · public surface (the `window.*` it registers + key handshake) · dependencies (the cross-`window.*` chain it reads) · key invariants.*
**Template:** `assets/export-modal.js` lines 1–19 are the clean reference — describes the extraction rationale, the `ctx` handshake shape, and "only one global added" `[VERIFIED: assets/export-modal.js]`. Reuse this shape for the 5 banners.

### Anti-Patterns to Avoid
- **Duplicating the codebase maps into the README** — D-08 says point to them, don't copy (they will drift).
- **Re-introducing phase/plan numbers into comments** — the whole point of D-10a is to remove archaeology; new banners must be plain what-it-does text.
- **Editing code while "just touching comments"** — defeats D-11; structure as isolated commits and gate mechanically.
- **Writing the README for a non-technical first-timer** — D-01 reframes the audience; the old "for Sapir" framing is superseded.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verify a diff is comments-only | A full JS tokenizer/regex-aware comment stripper from scratch | A **deterministic** strip-and-compare against a git baseline (see Validation Architecture) | A from-scratch stripper that perfectly handles strings/regex/template-literals is the classic over-engineering trap. The strip-and-compare is *sound even with an imperfect stripper* because it processes unchanged code lines identically in both versions. |
| Robust AST-level comments-only proof | Adding `acorn`/`espree` as a direct devDependency for a 5-file pilot | The strip-and-compare + green `npm test` | `acorn` is **NOT resolvable** top-level (`require('acorn')` fails — it's buried in jsdom's tree) `[VERIFIED: node -e require test]`. Adding it for a pilot is disproportionate; revisit only if comments-batch-2 wants a reusable gate. |
| Confirm behavior unchanged | Bespoke before/after behavior harness | Existing `npm test` (106 files, behavior + source-audit) | Comment-only edits cannot change runtime behavior; the existing suite already covers it `[CITED: .planning/codebase/TESTING.md]`. |

**Key insight:** the comments-only assertion does not require a *correct* comment parser — only a *deterministic* one applied symmetrically to baseline and working tree. This collapses the hardest technical risk in the phase to near-zero with zero new tooling.

## Runtime State Inventory

This is a documentation + comment-only phase (plus one CI line removal). There is **no rename, data migration, or runtime-state change.** Each category checked explicitly:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no IDB store names, keys, user_ids, or collection names are touched. DOCS-02 edits only comments; README is a doc. | None |
| Live service config | None — Cloudflare Pages / Lemon Squeezy config unchanged. D-04 removes a `cp README.md` line from the GitHub Action; this only stops *publishing* a file (ships less), changes no service config. `[VERIFIED: .github/workflows/deploy.yml line 28]` | Remove one line (D-04) |
| OS-registered state | None — no Task Scheduler/pm2/launchd/systemd registrations involved. | None |
| Secrets / env vars | None — no secret/env-var names referenced or changed. (D-04 leaves the `Verify no sensitive files` step intact.) | None |
| Build artifacts / installed packages | None — no `package.json` change, no reinstall, no egg-info/binaries. The deploy `sed` token-stamp on staging `version.js` is untouched. | None |

**Net:** the only non-doc, non-comment change in the entire phase is deleting line 28 (`cp README.md deploy-staging/`) of `deploy.yml`. After that line is removed, no runtime system holds any stale reference, because nothing else changed.

## Common Pitfalls

### Pitfall 1: The comments-only check false-flags trailing inline comments
**What goes wrong:** A naive "every changed line must START with `//`" check flags legitimate de-phasing of *trailing* comments on code lines, e.g. `let lastSavedSnapshot = null; // D-06: snapshot for revertSessionForm` → `… // snapshot for revertSessionForm` `[VERIFIED: assets/add-session.js line 104]`. The line doesn't start with a comment marker, so the simple classifier reports a "code change."
**Why it happens:** `add-session.js` (30), `settings.js` (24), and `settings-photos.js` (27) carry many trailing/mid-body phase-archaeology refs, not just header titles `[VERIFIED: grep counts]`.
**How to avoid:** Use the **strip-and-compare** gate (authoritative), not line-prefix classification. The line-prefix check is fine only as a fast human smoke test.
**Warning signs:** Gate fails on a commit you know is comment-only.

### Pitfall 2: README file-map drifts from reality (the stale-snapshot trap)
**What goes wrong:** Copying the current README's Project Structure block forward — it predates the P31 extractions and omits the 3 new modules `[VERIFIED: README.md]`.
**How to avoid:** Build the file-map fresh from `.planning/codebase/STRUCTURE.md` (refreshed 2026-06-28) and the actual `assets/` listing.
**Warning signs:** File-map lists no `settings-snippets.js` / `settings-photos.js` / `export-modal.js`.

### Pitfall 3: Recipe drift — documenting mechanics that don't match the live files
**What goes wrong:** Writing a version-bump or deploy recipe from memory rather than the live files.
**How to avoid:** All six recipes were truth-checked this session — anchor each to the verified facts in "Code Examples / Verified Mechanics" below. In particular `APP_VERSION` is currently `'1.2.2'` (not 1.2.0 as version.js's own comment text says) `[VERIFIED: assets/version.js lines 9, 25]` — the recipe should describe the *constant*, not hardcode a number.
**Warning signs:** Recipe references a `cp README.md` step (being removed) or a hand-edited cache number (auto-derived from `INTEGRITY_TOKEN`).

### Pitfall 4: DOCS-02 edits bundled with the README commit
**What goes wrong:** The comments-only diff can't be isolated if the 5-file edits share a commit with README/artifact changes.
**How to avoid:** Plan DOCS-02 as its own commit(s); run the strip-and-compare against the pre-DOCS-02 git ref restricted to the 5 files.

### Pitfall 5: Help-content inventory grounded in the stale demo
**What goes wrong:** Persona/auditor agents harvest topics from `demo.html`/`demo-hints.js`, which is stale UI (D-13 explicit exclusion).
**How to avoid:** Ground the auditor in the 9 live app pages + the P26 spine + REQUIREMENTS only. The demo's *rendering pattern* may inform a future tour build, never the topic list.

## Code Examples / Verified Mechanics

These are the load-bearing facts each README recipe and comment banner depends on. All confirmed against live files this session.

### Recipe 1 — Run locally
```bash
python3 -m http.server 8080
# open http://localhost:8080/landing.html
```
Encrypted-backup features require `localhost` or HTTPS (Web Crypto secure-context). `[VERIFIED: README.md lines 32–39]`

### Recipe 2 — Run the tests
```bash
npm test            # node tests/run-all.js — 106 test files, isolated child processes
node tests/<file>.test.js   # single file
```
`[VERIFIED: package.json scripts.test]` `[CITED: .planning/codebase/TESTING.md]`

### Recipe 3 — Ship a change (deploy)
Push to `main` → `.github/workflows/deploy.yml` stages app-only files → stamps `__BUILD_TOKEN__` in *staging* `version.js` with `${GITHUB_SHA::7}` via `sed` (NOT a bundler) → force-pushes a `deploy` branch → Cloudflare Pages serves it → purges CF cache. The committed `assets/version.js` keeps its placeholder (`'dev'` fallback for `file://`). `[VERIFIED: .github/workflows/deploy.yml]`
**D-04 edit:** delete line 28 `cp README.md deploy-staging/`.
**Bump habit + gotcha (D-06/D-07):** when you edit `PRECACHE_URLS` in `sw.js`, the pre-commit hook skips the `CACHE_NAME` bump when `sw.js` is in the diff → needs a manual follow-up `[CITED: memory/reference-pre-commit-sw-bump.md]`. (Note: `CACHE_NAME` auto-derives from `INTEGRITY_TOKEN`, so the "bump" is really the PRECACHE list upkeep, not a hand-edited number `[VERIFIED: sw.js line 19]`.)

### Recipe 4 — Bump the app version
Single source of truth = `assets/version.js`. Set `APP_VERSION` (hand-set semver, currently `'1.2.2'`); it drives the footer, the SW `CACHE_NAME` (via `INTEGRITY_TOKEN`), and the runtime integrity self-check. `INTEGRITY_TOKEN` is deploy-stamped, not hand-set. `[VERIFIED: assets/version.js lines 4–31]` `[CITED: memory/project-version-bump-convention.md]`

### Recipe 5 — Add/edit a translation string
Add the key to all four dictionaries: `assets/i18n-en.js`, `assets/i18n-he.js`, `assets/i18n-de.js`, `assets/i18n-cs.js`; use `data-i18n="key"` in HTML or `App.t('key')` in JS; untranslated keys carry a `// TODO i18n: translate to <lang>` marker (confirmed present in `i18n-cs.js`) `[VERIFIED: assets/i18n-cs.js lines 445–456]` `[CITED: .planning/codebase/STRUCTURE.md]`.

### Recipe 6 — Add a new JS module
Create `assets/newmodule.js` as an IIFE registering on `window.*` → add a `<script>` tag in the correct load-order position in each HTML page that uses it → add its path to `PRECACHE_URLS` in `sw.js` (exact deployed path) → mind the SW-bump follow-up. `[CITED: .planning/codebase/STRUCTURE.md "Where to Add New Code"]` `[VERIFIED: sw.js PRECACHE_URLS]`

### DOCS-02 before-state (the 5 target files)

| File | Lines | Current header | De-phase / banner job |
|------|-------|----------------|------------------------|
| `settings-snippets.js` | 1329 | `// Phase 24 Plan 05 — Snippet Settings UI` — rich, has full cross-IIFE chain + SECURITY note; refs `.continue-here.md`, `snippets.js:457` | De-phase title + archaeology (5 refs); keep/refine the strong chain doc |
| `settings-photos.js` | 624 | `// Phase 25 Plan 07 — Photos Settings tab` — rich; inline `D-24/D-25/D-30` + mid-body `Phase 25 Plan 12 post-UAT fix` | De-phase title + heavy inline archaeology (27 refs) |
| `export-modal.js` | 803 | Clean descriptive header (the convention template); refs `RFCT-02` | Light: de-phase `RFCT-02` (2 refs); header otherwise good |
| `settings.js` | 1014 | JSDoc `settings.js — Settings page controller (Phase 22 Plan 04)`; refs `T-22-04-01` | De-phase (24 refs) + **rewrite to a slimmed-shape orientation header** noting snippets/photos were extracted out |
| `add-session.js` | 1518 | **NONE** — file starts at `let clientCache = [];` | **Add a NEW banner from scratch** + de-phase body archaeology (30 refs: `D-04/D-06`, `Quick 260516-rna`, `g7p __*TestHooks`) |
`[VERIFIED: head reads of all 5 files + grep archaeology counts]`

### The comments-only-diff gate (reference implementation)
```bash
# Run after the DOCS-02 commit(s), against the pre-DOCS-02 baseline ref.
BASE=<git ref before the comment commit>
FILES="assets/settings-snippets.js assets/settings-photos.js assets/export-modal.js assets/settings.js assets/add-session.js"

# Deterministic strip-and-compare (authoritative gate):
#   for each file: strip ALL comments from BASE:file and worktree:file the SAME way,
#   normalize whitespace, assert byte-equality. Any diff => a code line changed.
# Implement as a Node check (matches the project's fs.readFileSync source-audit style,
# e.g. tests/25-08-single-source-audit.test.js), comparing
#   git show $BASE:$f   vs   fs.readFileSync($f)
```
See Validation Architecture for the soundness argument and the fast human smoke-test variant.

## State of the Art

| Old framing | Current framing | When changed | Impact |
|-------------|-----------------|--------------|--------|
| README audience = "non-technical Sapir, multi-machine collab" | Maintainer = Ben solo + cloud Claude Code agents | 2026-06-28 (D-01/D-02) | Denser, agent-readable, in-repo; supersedes PROJECT.md Context lines for doc purposes `[CITED: memory/project-maintainer-reframe-ben-solo.md]` |
| Comments carry `// Phase X Plan Y` archaeology as primary traceability | Plain what-it-does comments; phase numbers removed | This phase (D-10a) | Note CONVENTIONS.md still documents the *old* phase-ref convention `[CITED: .planning/codebase/CONVENTIONS.md §Comments]` — that map describes current state and will itself drift once DOCS-02 lands. Do not treat it as a mandate to keep phase numbers. |
| README shipped publicly via `cp README.md` | README repo-only | This phase (D-04) | Avoids publishing maintenance detail at the product URL |

**Deprecated/outdated:**
- README "Project Structure" block — stale post-P31; replaced by the D-08 file-map.
- `demo.html` / `demo-hints.js` as any kind of source-of-truth — stale (deferred refresh).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The repo is private, so removing the public README copy (D-04) doesn't expose anything that's currently relied upon to be public | User Constraints / Runtime State | Low — D-04 only removes a copy; if repo is public the README was already visible, removal still reduces exposure. CONTEXT flags "verify before relying on it." |
| A2 | The pre-commit hook's SW-bump-skip behavior still matches the memory note (`reference-pre-commit-sw-bump.md`) | Recipe 3 | Low — sourced from project memory; planner/executor can confirm against `.claude/hooks/` if writing the exact recipe wording. |

**Note:** there are no `[ASSUMED]` package or compliance claims — this phase has no external dependencies and no security-standard choices.

## Open Questions

1. **Should the comments-only gate be a committed test (`tests/32-comments-only-*.test.js`) or a throwaway one-shot script?**
   - What we know: it matches the project's source-audit test style; a committed gate would be reusable for comments-batch-2.
   - What's unclear: whether a *baseline git ref* dependency makes it awkward as a permanent test (the baseline moves after merge).
   - Recommendation: run it as a **plan-time / executor verification step** (one-shot against the DOCS-02 baseline), not a permanent test. Permanent reusable tooling is a comments-batch-2 concern (D-12).

2. **Final persona count + per-persona prompts for D-13.**
   - What we know: ~4 lenses + auditor + synthesizer (~6 agents); ground in 9 live pages + P26 7-step spine.
   - What's unclear: exact prompts (Claude's Discretion).
   - Recommendation: planner finalizes; auditor lens must enumerate the 9 app pages (below) and the P26 spine steps.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm test`, comments-only check | ✓ | engines `>=18.0.0` `[VERIFIED: package.json]` | — |
| `jsdom` | existing test suite | ✓ | `^29.1.1` `[VERIFIED: package.json]` | — |
| `python3` | local-serve recipe | ✓ (system, macOS) | system | any static server |
| `git` | comments-only baseline diff | ✓ | repo present | — |
| `acorn` (parser) | (only if AST gate chosen) | ✗ | not top-level resolvable `[VERIFIED: require test]` | strip-and-compare (preferred) |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** `acorn` — not needed; the strip-and-compare gate is the recommended path.

## Validation Architecture

> `workflow.nyquist_validation: true` `[VERIFIED: .planning/config.json]` — section included.

This phase produces **no runtime behavior change** (a README, comment-only edits, one CI line removal, two planning artifacts). The Nyquist strategy is therefore a **shape/diff gate**, not a behavior-sampling gate.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Custom Node.js runner — `tests/run-all.js` (no Jest/Mocha/Vitest) `[CITED: .planning/codebase/TESTING.md]` |
| Config file | none — behavior hardcoded in `tests/run-all.js` |
| Quick run command | `node tests/<file>.test.js` |
| Full suite command | `npm test` (106 files) |

### Phase Requirements → Test/Check Map
| Req ID | Behavior | Check Type | Command / Method | Exists? |
|--------|----------|-----------|------------------|---------|
| DOCS-02 | No code line changed by the comment edits | comments-only diff (deterministic strip-and-compare) | Node check: `git show $BASE:$f` vs `fs.readFileSync($f)`, comments+whitespace stripped, assert equal, for the 5 files | ❌ Wave 0 (write the check) |
| DOCS-02 | Runtime behavior unchanged | full suite | `npm test` green | ✅ exists |
| DOCS-01 | README mechanics match live files | manual/grounded review | Cross-check each recipe against the Verified Mechanics table above | manual |
| D-04 | README no longer shipped | grep gate | assert `cp README.md` absent from `.github/workflows/deploy.yml` | ❌ Wave 0 (trivial grep) |

### The comments-only diff check — soundness (the key research finding)
**Method:** deterministic comment-strip-and-compare.
1. For each of the 5 files, read the **baseline** version (`git show $BASE:$f`) and the **working-tree** version.
2. Run the *same* comment stripper over both, then collapse whitespace.
3. Assert the two stripped strings are byte-identical. Any inequality ⇒ a code token changed ⇒ FAIL.

**Why it is sound even with an imperfect stripper:** the stripper need only be **deterministic**, not perfectly regex/string-aware. Unchanged code lines are processed identically in both versions (so they cancel); changed comment lines are removed from both (so they don't contribute); a genuinely changed *code* token survives stripping in exactly one version ⇒ inequality ⇒ correct FAIL. The only theoretical miss requires a real code change positioned *after* a `//`/`/*` sequence embedded in a string/regex on the same line — astronomically unlikely here and already covered by `npm test`. This is why **no `acorn`/AST dependency is needed** (and acorn isn't top-level resolvable anyway).

**Fast human smoke test (secondary, not authoritative):**
```bash
git diff -U0 -- <5 files> | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' \
  | grep -vE '^[+-][[:space:]]*(//|/\*|\*|\*/)' | grep -vE '^[+-][[:space:]]*$'
```
Empty output = no full-line code edits. **Caveat:** this WILL false-flag legitimate *trailing*-comment de-phasing on code lines (confirmed real in `add-session.js`) — so treat a non-empty result as "look closer," and rely on strip-and-compare as the gate.

### Sampling Rate
- **Per DOCS-02 commit:** comments-only strip-and-compare on the 5 files + `npm test`.
- **Per phase gate:** full `npm test` green + comments-only check passes + `deploy.yml` grep gate (no `cp README.md`).

### Wave 0 Gaps
- [ ] Comments-only strip-and-compare check (Node one-shot, baseline-ref based; modeled on `tests/25-08-single-source-audit.test.js` fs-read style) — covers DOCS-02.
- [ ] `deploy.yml` `cp README.md` absence assertion (trivial grep) — covers D-04.
- [ ] No framework install needed — runner + jsdom already present.

## Security Domain

> `security_enforcement` not explicitly `false` (treated as enabled). This is a docs/comment phase with effectively no new attack surface; the analysis is intentionally brief.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture/Docs | yes (mild) | The README must document the existing security invariants accurately (no external network calls; `textContent`/`.value` never `innerHTML`; client-side-only license) so agents don't violate them. Mis-documenting these is the only real risk. |
| V5 Input Validation | no (unchanged) | Existing inline sanitization + `validateSnippetShape` untouched `[CITED: .planning/codebase/ARCHITECTURE.md]` |
| V6 Cryptography | no (unchanged) | AES-256-GCM backup path untouched |
| V7 Errors/Logging | no (unchanged) | crashlog path untouched |
| V14 Config | yes (positive) | D-04 *reduces* information disclosure by no longer publishing the maintainer README at the product URL |

### Known Threat Patterns for this phase
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Information disclosure via public maintainer README | Information Disclosure | D-04 removes the `cp README.md` deploy step |
| Agent-rule documentation that is wrong → future code violates an invariant (e.g. adds a `fetch`, uses `innerHTML`) | Tampering (downstream) | D-07 "Rules an agent must not break" must be precise and verified against ARCHITECTURE.md §Architectural Constraints + §Anti-Patterns |
| Comment edit silently changes code | Tampering | comments-only strip-and-compare gate + green `npm test` (D-11) |

## Help-Content Inventory (D-13) — grounded method

**Agent orchestration (~6):** 4 persona lenses + 1 feature-coverage auditor + 1 synthesizer.
- **Persona lenses** (each proposes the topics/questions its persona needs): struggling novice ("stupid user") · trainer/onboarder · power user · domain expert (Sapir-like).
- **Feature-coverage auditor (grounded):** walk the **9 live app pages** — `index.html`, `sessions.html`, `add-client.html`, `add-session.html`, `settings.html`, `reporting.html`, `report.html`, `landing.html`, plus the demo entry only as a non-topic — and ensure every real feature has a topic. `[VERIFIED: ls *.html]`
- **Synthesizer:** dedupe persona + auditor outputs into one topic/workflow tree.

**Ground in:** the refreshed `.planning/codebase/*.md`, `.planning/REQUIREMENTS.md`, the real pages, and the **P26 workflow spine (7 steps)** + standalone Help-page design `[VERIFIED: 26-UI-SPEC.md lines 195–200]`. May harvest live guidance signals (empty-states in `overview.js`/`sessions.js`, greeting quotes) `[VERIFIED: grep]` but **EXCLUDE `demo.html`/`demo-hints.js`** (D-13).

**Output schema (inventory ONLY, not copy), EN-only:**
```
Topic tree → leaf = { title, one-line intent, mapped feature/page,
                      persona source, P26 status, suggested format (tour step|FAQ|page section), priority }
```
Suggested path: `.planning/phases/32-readme-code-comments/32-HELP-CONTENT-INVENTORY.md`.

## Comment-Coverage Map (D-14) — grounded module inventory

Full production-JS inventory captured this session for the map (excludes `*.min.js` vendor + i18n dictionaries). Mark the 5 DOCS-02 files **done**; flag `overview.js`/`sessions.js`/`db.js` as **batch-1** (freshly touched in P31 → lowest staleness); everything else **remaining**. Note which currently lack any file header (new banner needed): **`add-session.js`, `add-client.js`, `app.js`, `db.js`, `reporting.js`, `sessions.js`** all start with code, not a comment `[VERIFIED: header scan]`.

| Module | Lines | DOCS-02 status |
|--------|-------|----------------|
| `settings-snippets.js` | 1329 | **done (this phase)** |
| `settings-photos.js` | 624 | **done (this phase)** |
| `export-modal.js` | 803 | **done (this phase)** |
| `settings.js` | 1014 | **done (this phase)** |
| `add-session.js` | 1518 | **done (this phase)** — was header-less |
| `db.js` | 1154 | remaining — **batch-1**, header-less |
| `overview.js` | 734 | remaining — **batch-1**, has header |
| `sessions.js` | 198 | remaining — **batch-1**, header-less |
| `backup.js` | 1575 | remaining |
| `app.js` | 1474 | remaining — header-less |
| `pdf-export.js` | 1198 | remaining |
| `landing.js` | 762 | remaining |
| `license.js` | 568 | remaining |
| `snippets.js` | 551 | remaining |
| `backup-modal.js` | 506 | remaining |
| `crashlog.js` | 480 | remaining |
| `report.js` | 418 | remaining |
| `disclaimer.js` | 357 | remaining |
| `version.js` | 353 | remaining (already well-headed) |
| `snippets-seed.js` | 344 | remaining |
| `crop.js` | 289 | remaining |
| `add-client.js` | 264 | remaining — header-less |
| `shared-chrome.js` | 164 | remaining |
| `globe-lang.js` | 84 | remaining |
| `md-render.js` | 81 | remaining |
| `reporting.js` | 57 | remaining — header-less |
| `demo-hints.js` / `demo-seed.js` / `demo.js` / `i18n.js` | — | remaining (demo group low priority; stale) |
`[VERIFIED: ls + wc + header scan, 2026-06-28]`

Suggested path: `.planning/phases/32-readme-code-comments/32-COMMENT-COVERAGE-MAP.md`.

## Sources

### Primary (HIGH confidence) — live repo files read this session
- `.github/workflows/deploy.yml`, `package.json`, `README.md`, `sw.js`, `assets/version.js` — recipe + D-04 mechanics
- `assets/settings-snippets.js`, `assets/settings-photos.js`, `assets/export-modal.js`, `assets/settings.js`, `assets/add-session.js` — DOCS-02 before-state (headers + archaeology counts)
- `assets/i18n-cs.js` — `// TODO i18n` pattern
- `.planning/config.json` — nyquist/workflow flags
- `node -e require('acorn')` test — parser availability
- `ls *.html` / `wc -l assets/*.js` / header scan — page surface + coverage-map inventory

### Secondary (MEDIUM confidence) — refreshed codebase maps (2026-06-28)
- `.planning/codebase/{ARCHITECTURE,STRUCTURE,CONVENTIONS,TESTING}.md`

### Tertiary — project memory (process)
- `memory/reference-pre-commit-sw-bump.md`, `memory/project-version-bump-convention.md`, `memory/project-maintainer-reframe-ben-solo.md`
- `26-UI-SPEC.md` — P26 workflow spine for the help inventory

## Metadata

**Confidence breakdown:**
- README mechanics / recipes: HIGH — every recipe truth-checked against the live file this session.
- DOCS-02 before-state: HIGH — all 5 files read; archaeology counts measured.
- Comments-only-diff method: HIGH — soundness argument holds; dependency-free; acorn-unavailability confirmed.
- Help-inventory / coverage-map method: MEDIUM — method is grounded and specified; exact agent prompts are Claude's Discretion.

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (stable; internal docs phase — re-verify only if `deploy.yml`, `version.js`, or the 5 target files change before execution)
</content>
</invoke>
