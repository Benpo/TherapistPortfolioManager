# Phase 31: Refactor God Modules - Context

**Gathered:** 2026-06-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Decompose the two largest modules into cohesive single-responsibility IIFE modules **with no observable behavior change**, verified by the green Phase 30 suite staying green throughout.

Concretely (RFCT-01/02/03):
- Extract cohesive units out of `settings.js` (2,969 lines; already 5 internal IIFEs) — **SnippetsUI** and **Photos/StorageUsage** — into their own files (RFCT-01).
- Extract the **export-modal + markdown builders** out of `add-session.js` (2,173 lines; one giant `DOMContentLoaded` IIFE) into its own file (RFCT-02).
- Apply **opportunistic cleanups within touched code** (RFCT-03): `var`→`const`/`let`, `innerHTML`+i18n hardening, `openDB()` connection pooling, tagged logging in silent `catch` blocks, and glue-wrapper consolidation.

**This is a behavior-PRESERVING MOVE, not a rewrite.** The phase relocates code so it stops bloating the two god modules; it does NOT re-implement logic. The contract "no observable behavior change / `npm test` green throughout" is the sacred constraint every decision below ladders up to.

**Explicitly NOT this phase:** shrinking/rewriting feature logic, refactoring any file other than the two god modules (+ the RFCT-03-named `overview.js`/`sessions.js`/`db.js`), or the app-wide glue/comment sweeps (those are backlog / Phase 32).

</domain>

<decisions>
## Implementation Decisions

### Extraction scope & granularity (RFCT-01, RFCT-02)
- **D-01 — Extract the cohesive big units only.** Out of `settings.js`: **SnippetsUI** (IIFE at 712–2018, ~1,300 lines) and **Photos/StorageUsage** (IIFE at 2370–2969, ~600 lines). Out of `add-session.js`: the **export-modal + markdown builders** (~730–1835). The slimmed `settings.js` **retains** Section-titles (IIFE-1, 14–688), Tab-nav (IIFE-3, 2035–2113), and Backups (IIFE-4, 2135–2344). Rationale: hits the roadmap's named units (SnippetEditor / PhotoManager / StorageUsage + export-modal), captures the biggest line wins, lowest risk. *Rejected:* full decomposition (every IIFE → own file — more churn/risk for marginal gain) and minimal (Snippets + export only — leaves the ~600-line Photos win on the table).
- **D-02 — Behavior-preserving MOVE, not shrink.** Ben challenged the snippets size; investigation confirmed the ~1,300 lines are **legitimate feature code**, not bloat: 41 functions (~26 lines each), editor + tag-chip autocomplete ~445 lines, list-render + filter chips ~180, import/export + collision modal ~180, 8 pure validation/filter helpers ~200, only 2 `innerHTML` uses, ~240 lines comments/blanks. Phase 31 **relocates it as-is** + cosmetic cleanups only. Materially shrinking it = a logic rewrite (esp. the editor/tag-chip block) = a different, higher risk class that contradicts the behavior-preserving contract and would need its own new tests. (See Deferred Ideas for the v1.3 reducibility spike.)

### RFCT-03 opportunistic cleanups
- **D-03 — Cleanup reach = named files, test-first.** Do the RFCT-03 cleanups the requirement **explicitly names** even in non-extracted files — `overview.js`/`sessions.js` `innerHTML`+i18n hardening, and `db.js` `openDB()` connection pooling (cache the resolved `IDBDatabase`) — but **write a characterization test FIRST** for each thin spot before changing it (these files carry 0–2 tests today; `db.js`'s connection-lifecycle change is the riskiest). Plus `var`→`const`/`let` and tagged `catch`-logging within touched code. *Rejected:* "strictly extracted code only" (drops RFCT-03's named items) and "named files, no new tests" (highest risk on weakly-covered code).
- **D-04 — Glue consolidation (Phase 30 D-13c), net-verified.** Replace `settings.js`'s **local** `t()` / `showToast()` / `getCurrentLang()` wrappers with the `App.*` canonicals during extraction; rely on the green suite to prove behavior is identical; **if any divergence is found, leave that one wrapper and note it.** App-wide dedupe (`app.js`/`report.js`/`disclaimer.js`) stays in backlog (scope creep for P31). Note: `add-session.js` already delegates to `App.*` — the duplication is concentrated in `settings.js`, which is convenient.
- **D-05 — Phase-number COMMENT cleanup (Ben's addition), opportunistic in touched code.** When Phase 31 touches a region, rewrite its `// Phase N Plan M …` / `// D-06 (Phase 24) …` archaeology comments into plain **what-it-does** comments, and fix the **one production log string** (`add-session.js:2071` `console.warn("Phase 24 Plan 06: failed to load sessions for spotlight:", …)`). **Production function/variable names are already phase-free** (verified — only that single log string carried a phase number). The full descriptive-comment pass lands in **Phase 32**. This is touched-code-only, NOT an app-wide sweep.

### Refactor safety protocol
- **D-06 — Atomic per-unit extraction.** Extract ONE cohesive unit → run full `npm test` → commit **only when green**. Characterization-test-before-move for any thin spot (couples to D-03). Result: clean per-unit rollback; a red suite bisects to a single move. *(Ben chose this over batched-by-module and "you decide cadence".)*
- **D-07 — Extraction order (default, Ben deferred to safe default).** **Snippets first** (it's already a self-contained IIFE exposing `window.__SnippetEditorHelpers` test hooks → the lowest-risk proof-of-pattern), **then Photos/StorageUsage**, **then the `add-session.js` export-modal last** (the hardest — trapped in one `DOMContentLoaded` IIFE — using the now-proven extraction pattern).
- **D-08 — Manual UAT smoke-test phase gate (default, Ben deferred to safe default).** ON TOP of green `npm test`, a short human smoke-test of the 3 extracted features is a phase gate: snippets CRUD + import/export with collisions; photos optimize / delete-all; export-modal stepper 1→2→3 + preview + PDF/MD/share. Rationale: the phase's whole premise is "no observable change," and Phase 30's re-audit found the net had been **over-credited at leaf-level** before gap-closure (per `feedback-test-coverage-count-not-real`) — a 10-minute human check cheaply backstops any residual net gap.

### Plan verification (process — MANDATORY)
- **D-09 — Architect-soundness gate via a DEDICATED SUB-AGENT.** After `gsd-planner` + the built-in `gsd-plan-checker`, a **fresh, independent-context agent** reviews `PLAN.md` for *soundness* (not just completeness): right approach & sequencing? Does the green net **genuinely protect each extraction, or give FALSE confidence** (the core risk)? Where is the residual risk? Material findings are resolved, **then** the plan reaches Ben. Order: research → planner → plan-checker → **architect sub-agent** → resolve → Ben. Per `feedback-architect-plan-verifier-gate` (auto-memory); Ben confirmed the sub-agent mechanism (over inline self-review).

### Claude's Discretion (planner/executor notes — constrained by the decisions above)
- **New file names** must be distinct from the existing `assets/snippets.js` (the snippet *engine*) and `assets/snippets-seed.js`. Recommend `settings-snippets.js` / `settings-photos.js` (or `settings-snippets-ui.js`); planner picks final names.
- **Extracted modules stay page-private anonymous `DOMContentLoaded` IIFEs.** Preserve the EXISTING test hooks **exactly** (`window.__SnippetEditorHelpers` at `settings.js:717`; `window.__addSessionTestHooks` / `computeGrowHeight`; any settings `__testExports`). Do **not** introduce new public `window.*` globals beyond what tests already rely on — widening the public surface increases what the refactor must preserve.
- **Wiring checklist (mechanical):** each new file → (a) an ordered `<script src>` tag in `settings.html` / `add-session.html` respecting the cross-IIFE `window.*` resolution chain (`App`, `PortfolioDB`, `Snippets`, `SNIPPETS_SEED` must load before consumers — documented inline at `settings.js:698–705`); (b) add to `sw.js` `PRECACHE_URLS` (currently 39 entries); (c) **pre-commit PRECACHE gotcha** — the hook skips the `CACHE_NAME` bump when `sw.js` is in the diff, so `PRECACHE_URLS` edits need a manual chore/version-bump follow-up (`reference-pre-commit-sw-bump`). The Phase 28 integrity token is a deploy git-hash, **not** a per-file manifest — no per-file hashing to maintain.
- **Shared in-IIFE helpers** (e.g. the `$` selector): planner decides whether the extracted file gets its own small copy or references a shared one — keep behavior identical either way.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` §RFCT-01..RFCT-03 — the three locked requirements this phase delivers
- `.planning/ROADMAP.md` §"Phase 31: Refactor God Modules" — goal, depends-on (Phase 30), success criteria
- `.planning/PROJECT.md` §"Key Decisions" — the zero-runtime-dependency / vanilla-JS / no-build production constraints the extraction MUST preserve; the v1.2 dependency-order rationale

### The Phase 30 safety net + forward map (READ FIRST — this phase is built directly on it)
- `.planning/phases/30-test-harness-coverage/30-RESEARCH.md` — **THE key input.** Contains the **God-Module Behavior Inventory** (per-IIFE tables with key functions, tiers, Tech×Biz, existing coverage, and the **Fwd D-13b** classification: `keep-as-is` / `consolidate-in-P31` / `extract-later` / `backfill-later`), the **Full-File Coverage Map (D-13a)**, the **Glue-Duplication / Consolidation list (D-13c)**, the jsdom real-page characterization pattern, and the `App.*` stub surface. This maps exactly what to extract and what to consolidate.
- `.planning/phases/30-test-harness-coverage/30-CONTEXT.md` — the decisions behind the net (D-07 go-broad, D-08 observable-behavior-only, D-13a/b/c forward-looking outputs, D-14 scope boundary that confines v1.2 refactor to these two files)
- `.planning/phases/30-test-harness-coverage/30-VERIFICATION.md` — the 13-region execution-backed re-audit that corrected over-credited (file-mention) coverage into wiring-level gaps (GAP-01..16); the evidence base for **why D-08's manual UAT gate is prudent**
- `.planning/phases/30-test-harness-coverage/30-REVIEW.md` — remaining open low-risk items (WR-03/04/06 helper-fidelity / info) — Phase-31-relevant residual-risk context
- `tests/` (the green suite — 103 files; `npm test` is the gate) — the guardrail. Phase-31-critical tests: `30-settings-section-roundtrip`, `30-settings-tabnav`, `30-export-markdown`, `30-export-stepper`, `30-issue-delta`, plus the `30-07`..`30-13` gap-closure tests covering snippet / photos / backups **screen wiring**

### Codebase patterns (the IIFE module convention + wiring)
- `.planning/codebase/CONVENTIONS.md` — the IIFE module pattern, `window.*` registration, plain ordered `<script>` loading
- `.planning/codebase/STRUCTURE.md` — asset/file layout
- `.planning/codebase/ARCHITECTURE.md` — how pages/modules wire together via the cross-IIFE global chain
- `.planning/codebase/CONCERNS.md` — the god-module-size concern that sourced v1.2 scope; the origins of the RFCT-03 cleanups (`innerHTML`, `var`, `openDB`)
- `.planning/codebase/TESTING.md` — the harness the gate runs on (`npm test`, jsdom real-page, observable-behavior discipline)

### Project memory (process — non-negotiable)
- `feedback-architect-plan-verifier-gate.md` (auto-memory) — the architect-soundness gate before Ben (D-09)
- `feedback-behavior-verification.md` (auto-memory) — runtime-behavior code needs falsifiable behavior tests BEFORE implementation; governs the test-first cleanups (D-03) and the characterization-before-move rule (D-06)
- `feedback-test-coverage-count-not-real.md` (auto-memory) — coverage = running the code, not counting file-mentions; the rationale for the manual UAT gate (D-08)
- `reference-pre-commit-sw-bump.md` (auto-memory) — `PRECACHE_URLS` edits need a manual `CACHE_NAME` bump follow-up (wiring checklist)

### Source under refactor (the extraction & cleanup targets — with line anchors)
- `assets/settings.js` (2,969 lines; 5 IIFEs) — god module #1. **Extract:** SnippetsUI (712–2018), Photos/StorageUsage (2370–2969). **Glue-dedup:** local `t`/`getCurrentLang`/`showToast` (~937–978). **Retain in slimmed file:** Section-titles (14–688), Tab-nav (2035–2113), Backups (2135–2344).
- `assets/add-session.js` (2,173 lines; 1 `DOMContentLoaded` IIFE + free fns) — god module #2. **Extract:** export-modal + markdown builders (~730–1835). **Comment cleanup:** the ~20 `Phase N` comments + the `:2071` log string.
- `assets/overview.js` (712 lines, 2 tests) and `assets/sessions.js` (184 lines, 0 tests) — RFCT-03 `innerHTML`+i18n hardening (test-first per D-03)
- `assets/db.js` (1,116 lines) — RFCT-03 `openDB()` connection pooling (test-first per D-03)
- `settings.html`, `add-session.html` — `<script>` wiring; `sw.js` — `PRECACHE_URLS`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **The Phase 30 jsdom real-page harness + `tests/_helpers/`** (`jsdom-pdf-env.js`, `mock-portfolio-db.js`, `app-stub.js`, `mock-navigator-share.js`) — the green net that guards every extraction; `npm test` runs it. New characterization tests (D-03/D-06) reuse these helpers.
- **Existing test hooks to PRESERVE during extraction** — `window.__SnippetEditorHelpers` (`settings.js:717`, "mirrors `Snippets.__testExports`"), `window.__addSessionTestHooks` (`computeGrowHeight` + any Phase 30 widenings), settings `__testExports`. The net asserts observable behavior through these; moving the code must keep them resolvable.
- **The established IIFE module pattern** — anonymous `DOMContentLoaded` IIFE that binds DOM and registers `window.*` only where cross-module access is needed. Extracted modules follow it exactly.

### Established Patterns
- **Plain ordered `<script src>` loading** (no ES modules, no bundler, no build) — extraction adds tags in cross-IIFE-dependency order.
- **Cross-IIFE identifier-resolution chain via `window` globals** (`App.{t,getLanguage,initCommon,…}`, `PortfolioDB.*`, `Snippets.{getPrefix,setPrefix}`, `SNIPPETS_SEED`) — documented inline at `settings.js:698–705`. The extracted files depend on these being loaded first.
- **Behavior-test discipline (observable behavior only, never internals)** — Phase 30 D-08. This is WHY the net survives the refactor: it asserts rendered output / persisted records / `dir` attribute, not internal function names that Phase 31 will move.

### Integration Points
- `settings.html` / `add-session.html` — new `<script>` tags (ordered).
- `sw.js` `PRECACHE_URLS` — new files added (+ the pre-commit `CACHE_NAME`-bump gotcha).
- `App.*` canonical helpers — the glue-consolidation target (`t` / `showToast` / `getCurrentLang`).

</code_context>

<specifics>
## Specific Ideas

- **Ben's snippets-size challenge (preserve the reasoning):** `settings.js`'s snippets block is ~1,300 lines because it is a **complete snippet manager** (editor + tag-chip autocomplete, list + filter chips, import/export + collision resolution, multi-language expansions, cross-tab broadcast sync, 8 pure validators) — **not duplication or padding**. Phase 31 **moves** it; the question of whether the ~445-line editor/tag-chip region is genuinely reducible is a **separate logic-rewrite** captured as a v1.3 spike (Deferred Ideas).
- **The contract is sacred:** "no observable behavior change, `npm test` green throughout." Every decision here — atomic per-unit commits (D-06), test-first cleanups (D-03), the manual UAT gate (D-08), the architect sub-agent (D-09) — exists to make the refactor *provably* safe rather than *probably* safe.
- **Framing for Phase 32 docs:** the extracted modules' new structure (SnippetsUI, Photos/StorageUsage, export-modal as their own files) becomes the architecture the Phase 32 README + code comments describe.

</specifics>

<deferred>
## Deferred Ideas

- **v1.3 "snippets editor/tag-chip reducibility" spike** — is the ~445-line editor + autocomplete region genuinely shrinkable via a logic rewrite (with its own new tests)? Out of Phase 31 (which is a behavior-preserving move only). Surfaced from Ben's D-02 challenge.
- **App-wide glue dedupe** (`t()` / `showToast()` across `app.js` / `report.js` / `disclaimer.js`) — Phase 31 consolidates only the `settings.js` copies (D-04); the app-wide sweep stays in the post-v1.2 "v1.3 Codebase Health II" backlog item.
- **App-wide phase-number comment sweep** — Phase 31 cleans only touched code (D-05); the rest is Phase 32 (full descriptive-comment pass) / backlog.
- **Broader extraction + test-coverage health** (`app.js` 1,474 lines / 6 tests; `license.js` 568 / 0; `backup.js`; `pdf-export.js`; `db.js` full coverage) — the v1.3 outlook item (`.planning/todos/pending/2026-06-26-broader-extraction-and-test-coverage-health.md`). Phase 30 **D-14** boundary holds: Phase 31 refactors ONLY `settings.js` + `add-session.js` (plus the RFCT-03-named `overview.js`/`sessions.js`/`db.js` cleanups).
- **`_optimizeAllPhotosLoop` sequential → parallel/Web-Worker** (PERF backlog) — noted `extract-later` in the Phase 30 inventory; not Phase 31.

### Reviewed Todos (not folded)
The phase-match query surfaced **7 todos — all generic keyword hits (score 0.6), all feature work unrelated to a behavior-preserving refactor:** deactivation data-loss warning, PWA install guidance / user manual, terms-acceptance restructure, "v1.2 full IndexedDB encryption", drag-sort settings categories, modality templates, in-app onboarding/overview-help. **None folded** — they remain in their own backlog / phases.

</deferred>

---

*Phase: 31-refactor-god-modules*
*Context gathered: 2026-06-27*
