# Phase 30: Test Harness & Coverage - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a green, runnable **test safety net BEFORE the Phase 31 god-module refactor**. Concretely:
- Make the 7 currently-unrunnable PDF tests run green in Node (TEST-01)
- Add an automated RTL regression guard (TEST-02)
- Characterize the current observable behavior of the two god modules `settings.js` (~2,969 lines) and `add-session.js` (~2,173 lines) so the refactor has a guardrail (TEST-03)
- Make the full suite runnable via a single documented command (TEST-04)

**This phase does NOT refactor anything.** It only establishes the safety net. The actual extraction is Phase 31. No production code behavior changes in Phase 30.
</domain>

<decisions>
## Implementation Decisions

### Dev-dependency boundary (TEST-01, TEST-04)
- **D-01:** Introduce the project's **first `package.json`** — marked `private: true`, carrying **`devDependencies` only** (`jsdom`), an `npm test` script that runs the whole suite, and `node_modules` added to `.gitignore`. This is the "single documented command" for TEST-04.
- **D-02:** **Production stays genuinely zero-runtime-dependency / ~50KB / no build.** Cloudflare Pages deploys the static `/assets/*` only — it never sees `node_modules`. devDependencies never ship. The "zero deps" identity (PROJECT.md Key Decisions) is preserved because it has always been about *production*, not the workbench.
- **D-03 (PRINCIPLE — promote to project Key Decision):** The zero-dependency restriction applies to **production/runtime code only**. Dev/test tooling may use npm dependencies freely. Ben confirmed: "we don't need to be that restrictive if it's about testing of development and not production code."

### PDF-test fix approach (TEST-01)
- **D-04:** Put the jsdom "fake browser" setup for PDF tests in **ONE shared helper** under `tests/_helpers/` (e.g. `jsdom-pdf-env.js`), and have all 7 broken PDF tests use it (fix-once, reuse for future PDF tests). The two root causes are: (a) jsdom lacks `HTMLCanvasElement.getContext` → stub it to `null` (this is already the established pattern, see TESTING.md §"PDF Tests"); (b) old-Node `blob.arrayBuffer` absence → resolved by requiring a modern Node.
- **D-05:** Set a **minimum Node version** via an `engines` field in the new `package.json` so the `blob.arrayBuffer` issue cannot recur. (Research/plan picks the exact floor — Node 18+ has `Blob.prototype.arrayBuffer` natively; pick a conservative LTS.)
- **D-06 (scope guardrail for the helper extraction):** The shared helper must be adopted by the **7 currently-broken** PDF tests at minimum. Migrating the already-passing jsdom tests (the other ~9 that inline `buildJsdomEnv`) onto the shared helper is **opportunistic/optional** — do it only if it stays cheap and keeps them green. Never let helper consolidation turn a green test red.

### God-module safety net (TEST-03)
- **D-07:** **Go BROAD.** Cast a wide behavior-characterization net over `settings.js` and `add-session.js` before the refactor — the strongest protection, justified because Phase 31 is the riskiest work in v1.2 and the wide net is the insurance that makes the refactor safe to attempt. Ben explicitly chose breadth over the narrower "focused on what's likely to break" and "thin smoke layer" options.
- **D-08 (HOW broad is done — load-bearing):** Test **observable behavior only** — inputs→outputs, save/load round-trips, what gets persisted, what renders — **never internal plumbing/structure.** The internals are exactly what Phase 31 will rearrange; tests coupled to internals would all break during the refactor and make the net worthless. This is the characterization-testing discipline and it is mandatory.
- **D-09:** jsdom (now an allowed dev dependency per D-01) **unlocks** broad testing of these DOM-coupled modules: the harness can load the real page fragment into jsdom and exercise the real handlers, instead of the brittle hand-stubbed `document` used elsewhere. This synergy is why "go broad" is feasible without ballooning. Research should evaluate the jsdom-load-the-real-page approach for these two modules.
- **D-10 (effort guardrail):** Because "broad" on heavily UI-tangled files is the highest-effort option, the **research step must produce a concrete behavior inventory** (the list of observable behaviors to pin, per module) **with an effort estimate**, so Ben can right-size at plan time if it's bigger than expected. Broad ≠ unbounded — it's "cover the observable behaviors," not "chase line coverage."

### RTL regression guard (TEST-02) — not discussed, planner default
- **D-11:** Ben did not select this area for discussion. **Default:** the guard tests the actual `dir`-applying code path (the function in shared chrome / i18n that sets `dir="rtl"`/`document.dir`) across **all 4 locales**, asserting HE → `rtl` and EN/DE/CS → `ltr`, and FAILS if `rtl` is ever applied to a non-Hebrew locale. Reference the existing pattern in `tests/29-02-migration-escape-hatch.test.js` (case 5: "the banner sets dir=rtl when portfolioLang=he"). Planner may refine; this is the intended shape.

### Plan verification gate (process — MANDATORY)
- **D-12:** The PLAN.md for this phase must pass an **architect-soundness verification round BEFORE it reaches Ben** — separate from and in addition to the built-in `gsd-plan-checker`. The plan-checker verifies *completeness* (does the plan achieve the goal?); the architect pass verifies *soundness* (right approach? right sequencing? will the broad characterization net actually protect the Phase 31 refactor, or give false confidence? where's the risk?). Order: research → planner → plan-checker → **architect verifier** → resolve material findings → Ben. Per `feedback-architect-plan-verifier-gate` (auto-memory). Ben stated this explicitly during discuss (2026-06-26).

### Claude's Discretion
- Exact name/location of the shared PDF helper, the precise Node version floor, the `npm test` runner implementation (a small `tests/run-all.js` vs a shell glob), and the specific list of behaviors in the god-module inventory are all left to research + planning, constrained by the decisions above.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` §TEST-01..TEST-04 — the four locked requirements this phase delivers
- `.planning/ROADMAP.md` §"Phase 30" — phase goal, depends-on (none; Phase 31 depends on THIS), success criteria
- `.planning/PROJECT.md` §"Key Decisions" — the "zero npm dependencies" / "vanilla JS, no build" production constraints that D-01..D-03 reconcile

### Testing patterns (READ FIRST — defines the existing harness this phase extends)
- `.planning/codebase/TESTING.md` — the complete current test setup: Node built-in runner + `assert` + `node:vm`, the existing jsdom PDF pattern (`buildJsdomEnv`, `getContext → null`, deterministic date/fileId pinning), the `JSDOM_PATH`/`/tmp/node_modules/jsdom` convention being replaced, behavior-test discipline, and the "What Is NOT Tested" gaps (notably "Settings save/load round-trips in a real browser context")
- `.planning/codebase/CONCERNS.md` — the triage that sourced v1.2 scope (god-module sizes, test gaps)

### Project memory (behavior-test discipline — non-negotiable)
- `feedback-behavior-verification.md` (auto-memory) — runtime-behavior code requires a falsifiable behavior test that FAILS before / PASSES after; grep/shape gates are insufficient. Governs TEST-03 directly.

### Reference test files (existing patterns to mirror)
- `tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js` — example PDF/jsdom behavior test (spies on `doc.text`)
- `tests/29-02-migration-escape-hatch.test.js` — existing `dir=rtl` assertion pattern (RTL guard seed)
- `tests/25-11-i18n-parity.test.js` — multi-locale vm-sandbox loading pattern (useful for the RTL guard across 4 locales)

### Source under characterization (TEST-03 targets)
- `assets/settings.js` (~2,969 lines) — god module #1
- `assets/add-session.js` (~2,173 lines) — god module #2
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Existing jsdom PDF harness** (`buildJsdomEnv` inlined across ~9 PDF tests, documented in TESTING.md §"PDF Tests") — the shared helper (D-04) extracts/standardizes this; the `getContext → null` stub and deterministic `setCreationDate`/`setFileId` pinning already exist and must be preserved.
- **vm-sandbox + custom test-runner loop** (TESTING.md §"Test Structure") — the canonical no-framework pattern; all new Phase 30 tests follow it.
- **`tests/_helpers/mock-portfolio-db.js` + `mock-navigator-share.js`** — existing shared stubs; the new PDF helper joins them in `tests/_helpers/`.
- **Multi-locale loader** (`tests/25-11-i18n-parity.test.js`) — reuse for the RTL guard's 4-locale sweep.

### Established Patterns
- Node built-in runner only (`node tests/<file>.test.js`), `assert`, exit 0/1. The new `npm test` script (D-01) must drive these same files, not replace the runner.
- Behavior tests open with a doc block (phase, scenarios, Run command, exit contract, and for behavior tests the root-cause/fix/falsifiability note).

### Integration Points
- **New `package.json`** at repo root — first ever; `private: true`, devDeps-only, `engines`, `test` script. Must NOT introduce any runtime/production dependency.
- **`.gitignore`** — add `node_modules/`.
- The **pre-commit hook** currently warns "Could not parse version from sw.js — skipping auto-bump"; adding package.json/test infra should not disturb the version-bump machinery (see `reference-pre-commit-sw-bump.md`). Verify the hook still behaves.
</code_context>

<specifics>
## Specific Ideas

- Ben's framing to preserve in the README/docs (Phase 32) and in the package.json rationale: testing tools are "the workbench / crash-test dummy," production is "the car the customer drives." Dev deps never reach the customer.
- "Go broad" is a deliberate, eyes-open investment in the refactor's safety — not gold-plating. Treat the breadth as protecting Phase 31, and surface the effort estimate (D-10) rather than silently expanding scope.
</specifics>

<deferred>
## Deferred Ideas

- **Migrating the already-passing jsdom tests onto the shared helper** — optional/opportunistic within Phase 30 (D-06); if it grows, leave the green tests as-is and note it for Phase 31's "opportunistic in touched code" cleanup.
- **Coverage tooling / enforced thresholds** — not in scope; the project's coverage stays informal (TESTING.md §"Coverage Status"). Revisit only if a future milestone wants it.
- **End-to-end / browser visual-regression testing (Playwright/Cypress)** — explicitly out of scope; stays in the "What Is NOT Tested" list.

### Reviewed Todos (not folded)
The phase-match query surfaced 10 todos, but all were generic keyword hits (deactivation warning, PWA manual, terms-acceptance, IDB encryption, drag-sort settings, modality templates, onboarding, landing translations) — **none relate to a test harness.** None folded; they remain in their own backlog/phases.
</deferred>

---

*Phase: 30-test-harness-coverage*
*Context gathered: 2026-06-26*
