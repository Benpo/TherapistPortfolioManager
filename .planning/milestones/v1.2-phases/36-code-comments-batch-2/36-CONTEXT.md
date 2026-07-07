# Phase 36: Code Comments — Batch 2 - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning
**Source:** Capture-inline (continuation of Phase 32 pilot; convention/guardrail/coverage-map inherited — no full discuss-phase). Scope decided with Ben 2026-07-01.

<domain>
## Phase Boundary

Extend the **Phase 32 code-comment pilot** (which covered 5 files) to the rest of the production JS surface, in a **core batch** that defers the largest files. This is **DOCS-03**, a continuation of the completed **DOCS-02**.

**What this phase delivers:** file-top **banner comments** on **22 production modules** — the 3 batch-1 modules plus every small/mid module — following the Phase 32 convention, with `// Phase X` / `// D-NN` / bug-ticket archaeology de-phased into plain what-it-does text. **Comment-only, zero behavior change**, verified per batch by green `npm test` + the comments-only strip-and-compare gate.

**Explicitly NOT this phase:**
- **The 3 giants — deferred to batch-3** (Ben's scope call, D-01): `backup.js` (1,575L), `app.js` (1,531L), `pdf-export.js` (1,899L). Each is 1,500L+; deferring them roughly halves the executor reading load (~7,800L vs ~12,800L).
- **Vendored libraries** (`jspdf.min.js`, `jszip.min.js`, `bidi.min.js`) and the **i18n dictionaries** (`i18n-en/he/de/cs.js`, `i18n-disclaimer.js`) — data/vendor, not authored logic (excluded from the coverage-map scope).
- **The already-done 5** from Phase 32 (`settings-snippets.js`, `settings-photos.js`, `export-modal.js`, `settings.js`, `add-session.js`).
- Any **code change**. If a real bug/smell surfaces while reading, note it — do **not** fix it here (would break the comments-only gate).

**Churn concern resolved:** the roadmap flagged `pdf-export.js`/demo files to comment "after Phases 34/35 settle." Both phases are now **complete + verified** (34: 10/10 plans `passed`; 35: 6/6 plans `passed`). So those files are stable — `pdf-export.js` is deferred only because it's a *giant* (D-01), not for churn; the demo files (`demo.js`, `demo-seed.js`) are small and **included**. `demo-hints.js` was removed in 35-05.

</domain>

<decisions>
## Implementation Decisions

### Scope
- **D-01 — Core coverage, defer the 3 giants.** Cover batch-1 + **all** small/mid production modules = **22 modules** (list in `<code_context>`). Defer `backup.js`, `app.js`, `pdf-export.js` (all 1,500L+) to a follow-up **batch-3**. *(Ben, 2026-07-01: "Core, defer 3 giants.")*
- **D-02 — Sequence batch-1 first.** Start with `db.js`, `overview.js`, `sessions.js` — freshly touched in the P31 refactor → lowest staleness (per the D-14 coverage map). Remaining modules follow in later waves.

### Convention (inherited from Phase 32 — LOCKED, do not re-litigate)
- **D-03 — Banner convention = the Phase 32 pilot.** Each file-top banner states, in the canonical `//` labelled block with the four slots in this exact order: **`OWNS:` (what it owns) · `PUBLIC SURFACE:` (the `window.*` it registers + key handshake) · `DEPENDENCIES:` (the cross-`window.*` chain it reads) · `CONSTRAINTS:` (key invariants)**. **Reference template = `assets/settings.js:1–29`** — the 4-slot content model (labelled `OWNS`/`PUBLIC SURFACE`/`DEPENDENCIES`/`SECURITY (invariant)`). Note: `assets/export-modal.js:1–19` is a **specialized variant** (a ctx-injected extraction sub-module; it lacks a Dependencies slot and its inline comments are pre-option-3 — do not model inline style on it). The **canonical format is the `//` labelled block** (settings.js happens to use `/** */` syntax — the content/shape is the model, not the comment syntax). Full rules + worked example: `36-COMMENT-STYLE-GUIDE.md` Part A.
- **D-04 — Two comment jobs, both comment-only.** (a) **Header-less files** get a **brand-new** banner. (b) **De-phase archaeology:** rewrite `// Phase 24 Plan 05 …`, `// D-NN (Phase X)`, and bug-ticket refs (`// Quick 260516-g7p Bug #4`, `260630-sa8`, etc.) into plain what-it-does text. Files that already have a header get de-phased + refined to the banner shape.
- **D-05 — Proportionate depth for trivial files.** Tiny modules (`i18n.js` 4L stub, `demo.js` 21L, `reporting.js` 57L, `md-render.js` 81L, `globe-lang.js` 84L, `demo-seed.js` 84L) get a concise **1–3 line** banner — do **not** fabricate "invariants"/"dependencies" sections where there is nothing to say. `version.js` is already well-headed → **light de-phase only**.

### Guardrail (inherited — LOCKED)
- **D-06 — Zero behavior change, verified per batch.** Every batch is verified by (a) green `npm test` and (b) the **comments-only strip-and-compare gate**: baseline `git show` vs working tree, comments + whitespace stripped, assert byte-equal → **zero code lines changed** across the batch's files. This makes "it's only comments, so it's low-risk" a *verified* claim.

### ID handling + best-practice (added 2026-07-02, with Ben)
- **D-07 — Strip ALL planning IDs (option 3).** No planning ID survives in product code. Requirement IDs (`REQ-`/`OBS-`/`VER-`/`RFCT-`/`DOCS-`/`DEMO-`/`PDFX-`/`I18N-`/`TEST-`), decision IDs (`D-NN`), code-review IDs (`CR-NN`), and task IDs (`T-N-N-N`) all become plain prose — only the ID/tag leaves; the WHY/constraint it carried stays. Real technical tokens (`AES-256`, `SHA-256`, schema `v1–v6`, `IDBDatabase`) are NOT IDs — untouched. Rationale: `.planning/` is archived per-milestone, so an ID in shipped code becomes a dangling reference; `git blame` is the durable trace. This **supersedes the Phase-32 pilot's keep-`REQ`/`OBS`/`VER` approach** (see D-09). Full rules: `36-COMMENT-STYLE-GUIDE.md` Part B.
- **D-08 — The style guide is the canonical comment standard.** Every executor reads `.planning/phases/36-code-comments-batch-2/36-COMMENT-STYLE-GUIDE.md` (Do's/Don'ts · real good/bad examples · de-phase before→after pairs · per-file checklist) BEFORE writing any comment — it is the FIRST entry in each plan's `<read_first>` and in `<context>`. This anchors comment quality to written rules + worked examples, not to agent judgment (closes the "quality is subjective" gap Ben flagged).
- **D-09 — Pilot-file ID sweep (plan 36-05).** The 5 already-shipped Phase-32 files — `settings-snippets.js`, `settings-photos.js`, `export-modal.js`, `settings.js`, `add-session.js` — get their leftover `REQ-/OBS-/VER-` IDs stripped to prose so the whole codebase is consistent under D-07. **Their banners already exist and are good — do NOT rewrite them; this is an ID/tag sweep only**, verified by the same option-3 de-phase grep + strip-and-compare + green `npm test`. Sequenced **last**, after the round-1 human checkpoint.

### Claude's Discretion (planner/executor finalize within D-01…D-09)
- **Plan/wave batching** of the 22 modules — suggested grouping in `<code_context>` (≈4 plans, ~1,600–2,400L each), non-binding. Keep `db.js` (largest here, IndexedDB choke-point) manageable; group tiny files together.
- **Exact banner wording** per file, within the D-03 shape.
- **Per-file header-state classification** (new banner vs de-phase-and-refine): the coverage map's "—" entries were **not** verified at current code — the executor **must scan each file's current top** before deciding. Confirmed at current code: `db.js` and `sessions.js` are header-less; `overview.js` opens with a thin `// Module-level storage` line + bug-ticket archaeology.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The convention + scope (the pilot this phase extends)
- `.planning/phases/32-readme-code-comments/32-COMMENT-COVERAGE-MAP.md` — the per-module done/batch-1/remaining map + header-less flags. **Line counts are stale (2026-06-28)** — use current counts in `<code_context>` below.
- `.planning/phases/32-readme-code-comments/32-CONTEXT.md` §D-09–D-14 — the pilot convention decisions (what a banner contains; the two comment jobs; the guardrail).
- `assets/export-modal.js` (header, lines 1–19) — the **banner reference template**.
- `.planning/phases/32-readme-code-comments/32-RESEARCH.md` §"Validation Architecture" + comment-method sections — the researched approach this phase **reuses** (fresh research skipped).
- `.planning/phases/32-readme-code-comments/32-01-PLAN.md` … `32-04-PLAN.md` — how the pilot batched files + wrote the comments-only gate into task `<verify>` blocks (the executable template to mirror).

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §"Code Comments — Batch 2 (Phase 36)" → **DOCS-03** (backfilled 2026-07-01).
- `.planning/ROADMAP.md` §"Phase 36" — goal, success criteria, and the **Scope note (2026-07-01)**.

### The current codebase (PRIMARY source for banner content)
- `.planning/codebase/ARCHITECTURE.md` — the cross-IIFE `window.*` resolution chain (each banner's "dependencies" line).
- `.planning/codebase/CONVENTIONS.md` — the IIFE module pattern + `window.*` registration + ordered `<script>` load (each banner's "public surface" + "invariants").
- The 22 target files themselves (`assets/*.js` + root `sw.js`) — read each before editing (current header state, real `window.*` registrations/reads, real invariants).

### Project memory (process)
- `reference-pre-commit-sw-bump.md` — editing `sw.js` comments won't bump `CACHE_NAME`; if only comments change, no manual bump is needed, but be aware the pre-commit hook skips the bump when `sw.js` is in the diff.
- `feedback-optional-fields-no-hints.md` / prior comment-phase learnings — banners orient, they don't editorialize.

</canonical_refs>

<code_context>
## Existing Code Insights

### The 22 target modules (current line counts, 2026-07-01)

**Batch-1 (start here — freshly touched in P31, lowest staleness):**
| Module | Lines | Header state (current) | Job |
|--------|-------|------------------------|-----|
| `db.js` | 1154 | **header-less** (`window.PortfolioDB = (() => {`) | NEW banner — IndexedDB choke-point |
| `overview.js` | 734 | thin `// Module-level storage` + `260516-g7p` archaeology | banner + de-phase |
| `sessions.js` | 198 | **header-less** (`document.addEventListener…`) | NEW banner |

**Small/mid modules (rest of scope):**
| Module | Lines | Header (per map — VERIFY at current code) | Job |
|--------|-------|-------------------------------------------|-----|
| `landing.js` | 762 | — | scan → banner |
| `license.js` | 583 | has header | de-phase + refine |
| `snippets.js` | 551 | — | scan → banner |
| `backup-modal.js` | 513 | — | scan → banner |
| `crashlog.js` | 480 | — | scan → banner |
| `report.js` | 418 | — | scan → banner |
| `disclaimer.js` | 357 | — | scan → banner |
| `version.js` | 353 | well-headed | light de-phase only (D-05) |
| `snippets-seed.js` | 344 | — | scan → banner (seed data) |
| `crop.js` | 289 | — | scan → banner |
| `sw.js` (root) | 285 | has header | de-phase + refine (precache/cache strategy) |
| `add-client.js` | 264 | **header-less** | NEW banner |
| `shared-chrome.js` | 185 | — | scan → banner |
| `globe-lang.js` | 84 | — | concise banner (D-05) |
| `demo-seed.js` | 84 | — | concise banner (D-05; settled by P35) |
| `md-render.js` | 81 | — | concise banner (D-05) |
| `reporting.js` | 57 | **header-less** | NEW concise banner (D-05) |
| `demo.js` | 21 | — | 1-line banner (D-05; settled by P35) |
| `i18n.js` | 4 | **ALREADY DONE** — has a 3-line loader-stub banner + no planning IDs (verified at current code 2026-07-02) | **none** — compliant under D-07; dropped from 36-04's active scope → **36-04 covers 9 files** |

**Total: 22 modules in the coverage map, ~7,800 lines. `i18n.js` is already compliant (no work) → 21 modules actually edited across plans 36-01…36-04; 36-04's active file set is 9.**

**Deferred to batch-3 (NOT this phase):** `backup.js` (1,575), `app.js` (1,531), `pdf-export.js` (1,899).
**Excluded (not authored logic):** `jspdf.min.js`, `jszip.min.js`, `bidi.min.js`, `i18n-en/he/de/cs.js`, `i18n-disclaimer.js`.

### Suggested batching (non-binding — planner finalizes)
- **Plan A / Wave 1 — batch-1:** `db.js`, `overview.js`, `sessions.js` (~2,086L). Start here.
- **Plan B / Wave 2 — larger mid:** `landing.js`, `license.js`, `snippets.js`, `backup-modal.js` (~2,409L).
- **Plan C / Wave 2 — mid:** `crashlog.js`, `report.js`, `disclaimer.js`, `snippets-seed.js`, `crop.js` (~1,708L).
- **Plan D / Wave 2 — small + chrome + sw + stubs:** `version.js`, `add-client.js`, `shared-chrome.js`, `globe-lang.js`, `demo-seed.js`, `md-render.js`, `reporting.js`, `sw.js`, `demo.js` (~1,597L). *(`i18n.js` was in this group but is already compliant under D-07 — dropped; Plan D / 36-04 now covers 9 files.)*

Waves 2 plans are independent of each other (disjoint file sets) → parallelizable after Wave 1 establishes the rhythm. Every plan runs its own comments-only gate over exactly its file set.

### Established patterns (banner source-of-truth)
- **IIFE page-private modules + ordered `<script>` + cross-`window.*` resolution chain** (`App.*`, `PortfolioDB.*`, `Snippets.*`, `SNIPPETS_SEED`, `I18N`) — documented inline at `settings.js:698–705`. Each banner's "dependencies" line names the `window.*` it reads.
- **Zero-build / zero-runtime-dependency production**; `package.json`/`jsdom` are dev-only (the `npm test` harness). No banner should imply a build step.

</code_context>

<specifics>
## Specific Ideas

- **The banner is agent-context.** With cloud Claude Code a live workflow, a precise "what it owns · surface · deps · invariants" banner on every module is high-leverage for AI-assisted maintenance. Write for a capable agent + Ben, dense not hand-holdy.
- **De-phase, don't delete the knowledge.** Turn `// Phase 24 Plan 05` / `// D-03` / `// Quick 260516-g7p Bug #4` into the *reason* the code is shaped that way, in plain words — the archaeology encodes real constraints (e.g. `overview.js`'s missing-birth-year filter flag). Keep the WHY, drop the phase/ticket number.
- **The gate makes "comments-only" a fact.** The strip-and-compare check per batch is the whole safety story — it's why this is a low-risk phase despite touching 22 files. Wire it into each plan's `<verify>` exactly as Phase 32 did (`32-0N-PLAN.md`).
- **Proportionality over completionism.** A 4-line loader stub does not need a 4-section banner. D-05 keeps trivial files honest — one line that says what it does.

</specifics>

<deferred>
## Deferred Ideas

- **Batch-3 — the 3 giants:** `backup.js`, `app.js`, `pdf-export.js`. Same convention + gate, their own phase (Ben's D-01 deferral). Completes DOCS-03's coverage.
- **Reusable comment-gate tooling.** Phase 32 ran the strip-and-compare as a one-shot scripted check (RESEARCH open-question #1). If the per-batch gate is repetitive across 4 plans, the executor MAY factor a small throwaway script under the phase dir — but a committed test harness for it is out of scope (still a later concern).
- **Vendor-dependency pinning** (`jspdf`/`jszip`/`bidi`) and **v1.3 "Codebase Health II"** (broader extraction + test coverage of `app.js`/`license.js`/etc.) — separate deferred phases, not comment work.

</deferred>

---

*Phase: 36-code-comments-batch-2*
*Context captured inline: 2026-07-01 (scope decided with Ben; convention inherited from Phase 32)*
