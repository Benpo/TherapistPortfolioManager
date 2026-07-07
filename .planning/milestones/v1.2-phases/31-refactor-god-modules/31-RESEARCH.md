# Phase 31: Refactor God Modules - Research

**Researched:** 2026-06-27
**Domain:** Behavior-preserving refactor of vanilla-JS IIFE modules (zero-build PWA); test-net fidelity under code relocation
**Confidence:** HIGH (all claims grounded in live-source line numbers verified this session; no external packages involved)

## Summary

Phase 31 is a **mechanical code-relocation**, not a rewrite. The CONTEXT.md already locks *what* to extract (D-01 names units + line ranges), the *order* (D-07: Snippets → Photos → export-modal), the *safety protocol* (D-06 atomic-per-unit, D-03 test-first), and the *gates* (D-08 manual UAT, D-09 architect sub-agent). This research does not re-derive those — it **confirms them against the live source, flags where the line anchors have drifted, and pins down the three things the CONTEXT could not specify at planning fidelity**: (1) the exact test-net protection per extraction, (2) the cross-IIFE / test-hook resolution chain that must survive each move, and (3) the genuinely risky mechanics — the `add-session.js` closure-capture problem and the `db.js openDB()` lifecycle change.

The single most important mechanical fact, true for **every** extraction: **the test suite loads source by hardcoded filename.** Each test does `win.eval(readAsset('assets/settings.js'))` (or `add-session.js`) — there is **no auto-discovery of `<script src>` tags**. When code moves to a new file, every test that evals the origin file **must also eval the new file**, or the suite goes red because the code isn't loaded (a false-red), or — worse — a hook-guarded test silently passes while testing nothing (a false-green). The "green suite stays green" contract therefore has a mandatory, easy-to-miss companion task per extraction: **update the test loaders.**

**Net-protection verdict (D-09's core question — "real protection or false confidence?"):** All 16 Phase 30 gaps (GAP-01..16) are **closed with real, mutation-kill-confirmed jsdom tests**. The net genuinely protects all three extractions. The residual risk is **not** thin coverage — it is (a) the closure-capture mechanics of the `add-session.js` export extraction, (b) one vacuous-green test file lacking an `EXPECTED_COUNT` guard (WR-05, `25-11-toast-behavior`), and (c) the `openDB()` lifecycle change, which no current test exercises for the *cached*-connection path.

**Primary recommendation:** Execute D-07's order exactly. For each unit: write/confirm the characterization test → update the test loader to eval the new file → move the code verbatim → run `npm test` → commit only when green. Treat the `add-session.js` export extraction as a **context-injection** problem (pass an accessor object into the new module's `init()` — do NOT cut-paste closure-dependent code), and treat `openDB()` pooling as the one change needing a *new* lifecycle characterization test before touching it.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 — Extract the cohesive big units only.** From `settings.js`: **SnippetsUI** (712–2018, ~1,300 lines) and **Photos/StorageUsage** (2370–2969, ~600 lines). From `add-session.js`: the **export-modal + markdown builders** (~730–1835). Slimmed `settings.js` **retains** Section-titles (14–688), Tab-nav (2035–2113), Backups (2135–2344). Rejected: full decomposition; minimal (Snippets+export only).
- **D-02 — Behavior-preserving MOVE, not shrink.** The ~1,300 snippet lines are legitimate feature code; relocate as-is + cosmetic cleanups only. Materially shrinking = a logic rewrite = out of scope.
- **D-03 — Cleanup reach = named files, test-first.** Do RFCT-03's explicitly-named cleanups even in non-extracted files (`overview.js`/`sessions.js` innerHTML+i18n; `db.js` `openDB()` pooling) but **write a characterization test FIRST** for each thin spot. Plus `var`→`const`/`let` and tagged `catch`-logging within touched code.
- **D-04 — Glue consolidation, net-verified.** Replace `settings.js`'s local `t()`/`showToast()`/`getCurrentLang()` wrappers with `App.*` canonicals during extraction; rely on the green suite; if any divergence is found, leave that one wrapper and note it. App-wide dedupe stays in backlog.
- **D-05 — Phase-number COMMENT cleanup, opportunistic in touched code.** Rewrite `// Phase N …` archaeology comments into plain what-it-does comments within touched regions; fix the one production log string (`add-session.js:2071`). NOT an app-wide sweep (that is Phase 32).
- **D-06 — Atomic per-unit extraction.** Extract ONE unit → run full `npm test` → commit only when green. Characterization-test-before-move for any thin spot.
- **D-07 — Extraction order.** **Snippets first** (lowest risk, already self-contained with `window.__SnippetEditorHelpers`), **then Photos/StorageUsage**, **then add-session.js export-modal last** (hardest).
- **D-08 — Manual UAT smoke-test phase gate.** On top of green `npm test`: human smoke-test of the 3 extracted features (snippets CRUD + import/export collisions; photos optimize/delete-all; export-modal stepper 1→2→3 + preview + PDF/MD/share).
- **D-09 — Architect-soundness gate via a dedicated sub-agent.** After planner + plan-checker, a fresh independent-context agent reviews PLAN.md for soundness. Order: research → planner → plan-checker → architect sub-agent → resolve → Ben.

### Claude's Discretion
- **New file names** must be distinct from `assets/snippets.js` (engine) and `assets/snippets-seed.js`. Recommend `settings-snippets.js` / `settings-photos.js`; planner picks final names.
- **Extracted modules stay page-private anonymous `DOMContentLoaded` IIFEs.** Preserve EXISTING test hooks exactly (`window.__SnippetEditorHelpers`; `window.__addSessionTestHooks`/`computeGrowHeight`; `window.__PhotosTabHelpers`). Do **not** introduce new public `window.*` globals beyond what tests already rely on.
- **Wiring checklist (mechanical):** ordered `<script src>` in `settings.html`/`add-session.html`; add to `sw.js` `PRECACHE_URLS`; pre-commit `CACHE_NAME`-bump gotcha; Phase 28 integrity token is a deploy git-hash, not a per-file manifest.
- **Shared in-IIFE helpers** (e.g. `$` selector): planner decides own-copy vs. shared reference — keep behavior identical.

### Deferred Ideas (OUT OF SCOPE)
- v1.3 "snippets editor/tag-chip reducibility" spike (logic rewrite).
- App-wide glue dedupe (`app.js`/`report.js`/`disclaimer.js`) — Phase 31 does only `settings.js` copies.
- App-wide phase-number comment sweep — Phase 31 touches only touched code (rest = Phase 32).
- Broader extraction + test-coverage health (`app.js`, `license.js`, `backup.js`, `pdf-export.js`, `db.js` full coverage) — v1.3.
- `_optimizeAllPhotosLoop` sequential→parallel (PERF-03 backlog).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RFCT-01 | Cohesive units extracted from `settings.js` into separate IIFE modules, suite stays green | SnippetsUI (712–2018) + Photos/StorageUsage (2370–2969, **two** coupled IIFEs) confirmed in live source; protective tests + hooks mapped in Validation Architecture; test-loader-update task identified per extraction |
| RFCT-02 | Export-modal logic extracted from `add-session.js` into its own IIFE, behavior preserved | Export region confirmed nested inside the `DOMContentLoaded` closure (44–1863), capturing ~10 closure vars; context-injection pattern recommended; protected by real DOM-click tests `30-export-markdown`/`30-export-stepper` |
| RFCT-03 | Opportunistic cleanups within touched code: `var`→`const`/`let`, innerHTML+i18n hardening (`overview.js`/`sessions.js`), `openDB()` pooling, tagged `catch` logging | `var` counts mapped (settings.js 403, db.js 10, others 0); innerHTML sites enumerated; `openDB()` lifecycle analyzed with required characterization assertions |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Snippet manager UI (editor, tag-chip autocomplete, list/filter, import/export, collision modal) | Browser / Client (page-private IIFE on `settings.html`) | IndexedDB via `PortfolioDB.*` | Pure presentation + form wiring over the snippets store; the *engine* (`assets/snippets.js`) already owns trigger/expansion logic |
| Photos optimize/delete + storage-usage display | Browser / Client (page-private IIFE on `settings.html`) | IndexedDB + `navigator.storage.estimate()` | DOM-bound photo management + byte formatting; reads `PortfolioDB.estimatePhotosBytes` |
| Session export modal (3-step stepper) + markdown builders | Browser / Client (page-private IIFE on `add-session.html`) | `pdf-export.js`, `navigator.share`, clipboard | Reads the live session form DOM/state, builds markdown/PDF, dispatches share/download — strictly client-side |
| IndexedDB connection lifecycle (`openDB()`) | Database / Storage (`db.js` IIFE → `window.PortfolioDB`) | — | Owns the single `IDBDatabase` handle; pooling changes *how* the handle is shared across the 23 call sites |

**Tier sanity note for the planner:** every unit in this phase lives in the **Browser/Client tier** (this is a static offline-first PWA — there is no server tier). The only cross-tier touchpoint is the storage tier via `PortfolioDB.*` and `navigator.storage`. No capability is mis-assigned; the refactor does not move logic across tiers, only across *files within the client tier*.

## Standard Stack

**This phase installs ZERO external packages.** It is a refactor of existing vanilla-JS under the project's locked zero-build / no-bundler / no-ES-modules / offline-first constraints (`.planning/PROJECT.md` §Key Decisions). The Standard Stack is the *existing* toolchain, unchanged.

### Core (existing, unchanged)
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Node | v22.20.0 (engines `>=18`) `[VERIFIED: node --version]` | Test runner host | Already the suite host; no new floor needed |
| jsdom | `^29.1.1` (installed devDependency) `[VERIFIED: package.json]` | Real-page DOM for behavior tests | Phase 30's harness; characterization tests reuse it |
| `npm test` → `node tests/run-all.js` | — `[VERIFIED: package.json + tests/run-all.js]` | The single green gate | Discovers every `tests/*.test.js`, one child process each, continue-on-fail, non-zero if any fail |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| IIFE-global pattern | ES modules `import`/`export` | **Forbidden** — REQUIREMENTS.md §Out of Scope locks the zero-build/IIFE pattern. Not an option. |
| Plain ordered `<script>` | Bundler (esbuild/rollup) | **Forbidden** — zero-build constraint. Not an option. |

**Installation:** None. `npm install` (to materialize the existing `jsdom` devDependency) is the only setup, already done in Phase 30.

## Package Legitimacy Audit

**N/A — this phase installs no external packages.** No registry verification required. The only dependency (`jsdom@^29.1.1`) was vetted and installed in Phase 30 and is unchanged here.

## Architecture Patterns

### System Architecture Diagram (load + test-eval flow)

```
                       settings.html / add-session.html
                                    │
        ordered <script src> (synchronous, top-to-bottom)
                                    ▼
   i18n-*.js → i18n.js → snippets-seed.js → db.js → version.js → crashlog.js
        → shared-chrome.js → app.js → [page extras] → snippets.js → SOURCE.js
                                    │
                       sets window.* globals at eval time:
        App.{t,getLanguage,showToast,initCommon}  PortfolioDB.*  Snippets.*  SNIPPETS_SEED
                                    │
                       each IIFE binds on  DOMContentLoaded
                                    ▼
        registers test hooks: window.__SnippetEditorHelpers (settings.js:863)
                              window.__PhotosTabHelpers     (settings.js:2545)
                              window.__addSessionTestHooks  (add-session.js:38)

   ── TEST PATH (jsdom real-page) ───────────────────────────────────────────
   readAsset('settings.html') → new JSDOM(runScripts:'outside-only')
        → inject App stub + mock PortfolioDB
        → win.eval(readAsset('assets/<each source file BY NAME>'))   ◄── HARDCODED LIST
        → dispatch DOMContentLoaded
        → drive via real DOM events (.click()) OR via window.__*Helpers hooks
        → assert OBSERVABLE output (rendered text / persisted record / dir attr / active-step class)
```

**The load-bearing arrow for this phase is `win.eval(readAsset('assets/<file>'))`.** Extraction adds new files; the test eval-list is hardcoded per test, so it must be updated in lockstep.

### Recommended file layout after extraction
```
assets/
├── settings.js            # SLIMMED: section-titles, tab-nav, backups, glue
├── settings-snippets.js   # NEW: SnippetsUI IIFE (was settings.js 712–2018)
├── settings-photos.js     # NEW: Photos + StorageUsage (was settings.js 2370–2969, TWO IIFEs)
├── add-session.js         # SLIMMED: form, read-mode, issues, spotlight
├── export-modal.js        # NEW: markdown builders + export stepper (was add-session.js ~730–1835)
├── overview.js            # touched: innerHTML+i18n hardening (RFCT-03)
├── sessions.js            # touched: innerHTML+i18n hardening (RFCT-03)
└── db.js                  # touched: openDB() pooling (RFCT-03)
```

### Pattern 1: Page-private IIFE binding on DOMContentLoaded (the existing convention — copy it exactly)
**What:** Anonymous `(function () { … document.addEventListener("DOMContentLoaded", boot); })();` that resolves cross-module deps via `window.*` and registers a `window.__*Helpers` hook only for tests.
**When to use:** Every extracted file.
**Example (the live snippet IIFE skeleton, `settings.js:712–2018`):**
```javascript
// Source: assets/settings.js:698–705, 712, 863 (verified this session)
// Cross-IIFE identifier-resolution chain (must be loaded before this IIFE boots):
//   window.App.{t, showToast, getLanguage, initCommon}  — assets/app.js
//   window.PortfolioDB.*                                 — assets/db.js
//   window.Snippets.{getPrefix, setPrefix}               — assets/snippets.js
//   window.SNIPPETS_SEED                                 — assets/snippets-seed.js
(function () {
  // ... ~1,300 lines: editor, tag-chip autocomplete, list+filter, import/export ...
  window.__SnippetEditorHelpers = { /* mirrors Snippets.__testExports */ };
  document.addEventListener("DOMContentLoaded", boot);
})();
```

### Pattern 2: Context-injection for closure-coupled extraction (NEW — required for `add-session.js` export-modal)
**What:** When the extracted code reads closure-local state it cannot reach from a separate file, the origin IIFE passes an **accessor object** into the new module's `init()`. The new module stays page-private; no new public globals.
**When to use:** The `add-session.js` export-modal extraction (and only there — Snippets/Photos are already self-contained IIFEs).
**Why:** See Pitfall 1. The export region references `editingSession` (15×), `sessionDate` (19×), `clientSelect`, `insightsInput`, `customerSummaryInput`, `sessionId`, `getIssuesPayload()`, `submitButton`, `lastSavedSnapshot`, `isReadMode` — all defined inside the `DOMContentLoaded` closure (add-session.js 76–104, 662). A separate file cannot see them.
**Shape (recommended):**
```javascript
// assets/export-modal.js  — page-private; exposes ONE private init, no public globals
(function () {
  function initExportModal(ctx) {
    // ctx = { getEditingSession, getSessionId, isReadMode, getIssuesPayload,
    //         els: { sessionDate, clientSelect, insightsInput, customerSummaryInput } }
    // ... markdown builders + stepper wiring, reading state via ctx accessors ...
  }
  // register privately for the origin IIFE to call (NOT a behavioral public global):
  window.__exportModalInit = initExportModal;   // internal handshake only
})();

// in add-session.js DOMContentLoaded, at the point it currently wires export buttons:
window.__exportModalInit({
  getEditingSession: () => editingSession,
  getSessionId:      () => sessionId,
  isReadMode:        () => isReadMode,
  getIssuesPayload,
  els: { sessionDate, clientSelect, insightsInput, customerSummaryInput },
});
```
**Load order consequence:** `export-modal.js` must be evaled **before** `add-session.js` runs its `init` call (so `window.__exportModalInit` exists). Simplest: place `export-modal.js` `<script>` immediately **before** `add-session.js` in `add-session.html`, and in the test eval-list eval `export-modal.js` before `add-session.js`. Mutable state (`editingSession`) stays single-sourced in `add-session.js` — accessor closures read the live value, preserving behavior exactly.

### Anti-Patterns to Avoid
- **Cut-paste the export region into a new IIFE and hope.** It will throw `ReferenceError` on `editingSession`/`sessionDate` at first click. The tests will catch it (real red) — but you waste a cycle. Use context-injection from the start.
- **Re-`querySelector` the mutable JS state.** DOM elements (`sessionDate`, `clientSelect`) *can* be re-read inside the new module; **mutable JS state** (`editingSession`, `isReadMode`, `sessionId`, `lastSavedSnapshot`) **cannot** — re-reading would fork state and silently diverge. Thread these via accessors.
- **`var`→`const` blindly.** Convert to `const` only where never reassigned; `let` otherwise. `settings.js` has **403** `var` declarations — a sed-style sweep risks turning a reassigned `var` into a `const` (TypeError) or changing function-scoped hoisting semantics. Convert only within the moved regions, compile-check each.
- **Editing `sw.js` `PRECACHE_URLS` and assuming the cache version bumps.** The pre-commit hook skips the `CACHE_NAME` bump when `sw.js` is in the diff — you must follow up with a manual version-bump chore commit (`reference-pre-commit-sw-bump`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Proving behavior is unchanged | A new diff/snapshot framework | The existing `npm test` green net (103 files, mutation-kill confirmed) | The net already asserts observable behavior through the exact hooks the move preserves |
| Re-querying DOM in extracted module | New element-cache abstraction | Re-use the same `getElementById` IDs already in the origin file | The HTML element IDs are unchanged; identical lookups preserve behavior |
| Connection pooling primitive | A custom mutex/lock | A single cached `Promise<IDBDatabase>` + invalidate-on-close | Standard IDB pooling idiom; the only subtlety is cache invalidation (see Pitfall 3) |
| i18n output escaping | A bespoke HTML sanitizer | `textContent` + DOM nodes (the pattern `settings.js` already uses everywhere) | settings.js already proves textContent-only is sufficient; overview/sessions just need to match it |

**Key insight:** This phase's whole value is that the logic already exists and works. The risk is *relocation fidelity*, not invention. Every "build" instinct here is a trap — the answer is almost always "move it verbatim and update the wiring."

## Runtime State Inventory

> This is a code-move refactor (not a string-rename), so most runtime-state categories are inert. The one live category is the PWA cache.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None** — no IndexedDB store names, keys, `user_id`s, or record shapes are renamed. Snippet/photo/session data is read through unchanged `PortfolioDB.*` APIs. Verified: extraction touches DOM-wiring code, not store schemas. | None |
| Live service config | **None** — offline-first app, no external services (no n8n/Datadog/Cloudflare config embeds the moved code). | None |
| OS-registered state | **None** — no Task Scheduler / launchd / pm2 registrations reference these modules. | None |
| Secrets / env vars | **None** — no secret key or env-var name references the moved code. License/store config untouched. | None |
| Build artifacts | **`sw.js` `PRECACHE_URLS`** (51 `assets/` entries) must gain the 3 new files (`settings-snippets.js`, `settings-photos.js`, `export-modal.js`); **`CACHE_NAME`** must bump (pre-commit hook skips this when `sw.js` is in the diff → manual chore commit). The Phase 28 integrity token is a deploy git-hash, not a per-file manifest — no per-file hashing to maintain. | Edit `sw.js` PRECACHE_URLS + manual CACHE_NAME bump |

**Canonical refactor question — "after every file is updated, what still has the old structure cached?"** Answer: only the **service-worker precache** (installed PWAs serve old asset lists until `CACHE_NAME` bumps) and the **test eval-lists** (hardcoded filenames). Both are addressed by explicit tasks below. Nothing else persists the old module boundaries.

## Common Pitfalls

### Pitfall 1: The export region is welded to its closure (RFCT-02's core hazard)
**What goes wrong:** A naive extraction moves `buildSessionMarkdown` / `buildFilteredSessionMarkdown` / the `exportSetActiveStep`/`exportUpdatePreview`/`exportHandle*` family out of `add-session.js`, and every reference to `editingSession`, `sessionDate`, `clientSelect`, `insightsInput`, `customerSummaryInput`, `sessionId`, `getIssuesPayload()` becomes a `ReferenceError`.
**Why it happens:** These are **closure-local** declarations inside the single `DOMContentLoaded` async IIFE (`add-session.js:44–1863`). The export logic is *nested inside* that closure (builders at 776/1078, modal handlers at 1220–1801), not a sibling at module scope. Verified counts in the 765–1835 region: `sessionDate`×19, `editingSession`×15, `clientSelect`×7, `insightsInput`×6, `customerSummaryInput`×6, `sessionId`×4, `getIssuesPayload`×3, `submitButton`×2, `sessionForm`×2, `lastSavedSnapshot`×1, `isReadMode`×1.
**How to avoid:** Context-injection (Pattern 2). DOM elements can be re-`getElementById`'d in the new module; **mutable JS state must be threaded via accessor closures** so there is one source of truth.
**Warning signs:** `30-export-markdown`/`30-export-stepper` go red with `ReferenceError` on first `.click()` → you cut-pasted instead of injecting.

### Pitfall 2: The test loader silently no-ops the moved code (false-red AND false-green)
**What goes wrong:** After moving SnippetsUI to `settings-snippets.js`, `30-snippet-wiring.test.js` still does only `win.eval(readAsset('assets/settings.js'))`. The snippet code is gone from that file → `openEditor`/`handleSave` never wire → either the test asserts and fails (false-red, looks like a behavior break but isn't), or a hook-guarded test (`if (helpers) …`) passes while exercising nothing (false-green — the dangerous one).
**Why it happens:** Tests load source by **hardcoded filename** (`win.eval(readAsset('assets/<file>'))`); there is no `<script>`-tag auto-discovery. Verified: `30-snippet-wiring.test.js:123`, `30-export-markdown.test.js:132`, `30-export-stepper.test.js:146`.
**How to avoid:** For **every** test that evals an origin file, add `win.eval(readAsset('assets/<new-file>'))` in the correct order (new file before the consumer that calls its `init`; for self-contained IIFEs, before `DOMContentLoaded` is dispatched). Grep the suite for the origin filename to find all loaders: `grep -rl "assets/settings.js" tests/*.test.js` (30 files) and `grep -rl "assets/add-session.js" tests/*.test.js` (14 files) — **but most are comment mentions; only the lines doing `win.eval(readAsset('assets/<file>'))` matter.** Confirm by execution after each move.
**Warning signs:** A test "passes" but its assertion count drops, or a hook is `undefined`. The `30-fake-test-detector.test.js` meta-test and the per-extraction manual UAT gate (D-08) are the backstops.

### Pitfall 3: `openDB()` pooling reuses a CLOSED connection (RFCT-03's only lifecycle change)
**What goes wrong:** Caching the resolved `IDBDatabase` and returning it forever means that after `db.onversionchange` fires (`db.js:329` calls `db.close()`), the next of the 23 `openDB()` callers gets a **closed** handle → `InvalidStateError` on the first transaction.
**Why it happens:** Today every `openDB()` call opens a fresh connection (`indexedDB.open` at `db.js:295`), so a closed connection is never reused. Pooling removes that safety.
**How to avoid:** Cache a `Promise<IDBDatabase>` (`_dbPromise`); **invalidate it** in `db.onversionchange` (before/with `db.close()`) and in `request.onerror`, so the next call re-opens. Keep `migrateOldDB()` (`db.js:293`) and `seedSnippetsIfNeeded` idempotent — seeding already short-circuits via `_seedingDone`, so pooling does not change seeding, but verify `migrateOldDB()` stays single-run-safe.
**Warning signs:** Tests that exercise version-change or multi-open paths throw `InvalidStateError`; or a second tab's upgrade hangs because the cached connection never closed. **Write the characterization test FIRST (D-03/D-06)** — see Validation Architecture → openDB.

### Pitfall 4: `var`→`const` mass-conversion introduces TDZ/reassignment bugs
**What goes wrong:** `settings.js` has **403** `var` declarations; a blanket `const` conversion breaks any reassigned `var` (TypeError) or any code relying on function-scoped hoisting.
**Why it happens:** `var` is function-scoped + hoisted; `const`/`let` are block-scoped + TDZ. Most conversions are safe, a few are not.
**How to avoid:** Convert **only within the moved regions** (D-03 "touched code"); `const` where never reassigned, `let` otherwise; run `npm test` after the batch. `add-session.js`, `overview.js`, `sessions.js` already have **zero** `var` (verified) — so this cleanup is **settings.js (403) + db.js (10) only**, and only the subset inside the extracted Snippets/Photos regions and the `openDB` area.

### Pitfall 5: Vacuous-green test masks a Photos regression (WR-05)
**What goes wrong:** `25-11-toast-behavior.test.js` lacks an `EXPECTED_COUNT` guard (the only suite file without it) — a dropped `await test(...)` exits 0 with fewer scenarios run, so a Photos behavior change could pass silently.
**Why it happens:** No assertion that all N scenarios actually ran.
**How to avoid:** Per the Phase 30 verification recommendation, **add `EXPECTED_COUNT = 5` to `25-11-toast-behavior.test.js` before the Photos extraction.** Its Photos coverage is otherwise redundant with `30-photos-optimize-loop.test.js` (which *has* the guard), so the net is not eliminated — but close the vacuous-green hole as cheap insurance.

## Code Examples

### Verified live structure — settings.js IIFE boundaries (the extraction map)
```
// Source: assets/settings.js (verified this session — 2,969 lines, 6 IIFEs not 5)
//  14– 688  IIFE-1  Section-titles + saved-notice      → RETAIN
// 712–2018  IIFE-2  SnippetsUI (hook @863)             → EXTRACT → settings-snippets.js
//2035–2113  IIFE-3  Tab-nav                            → RETAIN
//2135–2344  IIFE-4  Backups                            → RETAIN
//2370–2571  IIFE-5a Photos helpers (__PhotosTabHelpers @2545)  ┐
//2585–2969  IIFE-5b Photos UI + StorageUsage (reads __PhotosTabHelpers) ┘ EXTRACT TOGETHER → settings-photos.js
```
**Drift / nuance vs. CONTEXT anchors:** (1) CONTEXT cites the snippet hook at `settings.js:717` — that line is a *comment*; the actual assignment is **line 863**. (2) CONTEXT describes Photos as one "IIFE at 2370–2969" — it is in fact **two** IIFEs (2370–2571 and 2585–2969) coupled by `window.__PhotosTabHelpers`; they **must move together and keep their relative order** (helpers IIFE first), or the UI IIFE reads an undefined hook. The retained ranges (14–688, 2035–2113, 2135–2344) match the live source exactly.

### Verified live structure — add-session.js (the closure boundary)
```
// Source: assets/add-session.js (verified — 2,173 lines)
//  12– 28  computeGrowHeight (PURE, module scope)          → stays / leaf-tested
//  38– 42  window.__addSessionTestHooks = { computeGrowHeight }  (module scope)
//  44–1863 DOMContentLoaded async IIFE  ← the giant closure
//          76–104  closure-local els + state (editingSession, sessionId, isReadMode, …)
//          662     getIssuesPayload()
//          776     buildSessionMarkdown()        ┐
//         1078     buildFilteredSessionMarkdown()│ EXTRACT (markdown builders, B2)
//         1220–1801 export modal handlers        ┘ EXTRACT (stepper, B3)  → export-modal.js
// 1865–2173 free fns: loadClients, renderSpotlightSessionInfo, spotlight loader → RETAIN
//         2071  console.warn("Phase 24 Plan 06: …")  → D-05 log-string fix
```

### openDB() pooling — the shape and the invalidation that makes it safe
```javascript
// Source pattern grounded in assets/db.js:292–348 (verified)
let _dbPromise = null;
function openDB() {
  if (_dbPromise) return _dbPromise;               // pooled
  _dbPromise = migrateOldDB().then(() => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => { /* unchanged migration loop */ };
    request.onblocked = () => showDBBlockedMessage();
    request.onsuccess = (e) => {
      const db = e.target.result;
      db.onversionchange = () => { _dbPromise = null; db.close(); showDBVersionChangedMessage(); }; // INVALIDATE
      seedSnippetsIfNeeded(db).then(() => resolve(db)).catch(() => resolve(db));
    };
    request.onerror = () => { _dbPromise = null; reject(request.error); };   // INVALIDATE on error
  }));
  return _dbPromise;
}
```
The two `_dbPromise = null` lines are the whole correctness story — without them, pooling returns a dead handle.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| God modules (`settings.js` 2,969; `add-session.js` 2,173) | Cohesive single-responsibility IIFE files | This phase | Smaller files; sets the architecture Phase 32 docs describe |
| `openDB()` opens a fresh connection every call | Pooled, cached `IDBDatabase` with invalidate-on-close | This phase (RFCT-03) | Fewer opens; the **only** runtime-lifecycle change in the phase |
| Test coverage credited by file-mention | Coverage = execution, mutation-kill confirmed | Phase 30 (GAP-01..16 closed) | The net genuinely protects the moves; `feedback-test-coverage-count-not-real` |

**Deprecated/outdated:** none introduced. The CONTEXT line anchor `settings.js:717` for the snippet hook is **stale** (real assignment at 863) and the "Photos = one IIFE" framing is **imprecise** (two IIFEs) — corrected above.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `migrateOldDB()` is idempotent enough that pooling (calling it once instead of per-open) preserves behavior | Pitfall 3 / openDB | LOW–MED — if a side-effect was relied on per-call, pooling changes it; the characterization test must assert the old-DB migration path still runs once and only once. Verify by reading `db.js:20–90` during planning. |
| A2 | No test relies on `openDB()` returning a *distinct* connection object per call (object identity) | Validation → openDB | LOW — grep `openDB` assertions during Wave 0; if any test checks `!==` identity, pooling breaks it and the test itself must be reconsidered. |
| A3 | Re-`getElementById` inside `export-modal.js` returns the same elements the closure captured (IDs unchanged) | Pattern 2 | LOW — element IDs are static in `add-session.html`; verified the closure uses `getElementById`, not dynamically-created refs, for the export inputs. |

**If a claim above proves wrong at plan time, it does not block — it sharpens a Wave 0 characterization test.** No assumed *decisions* here; the decisions are all locked in CONTEXT.

## Open Questions (RESOLVED)

1. **How wide should the export-modal handshake be?**
   - What we know: the export region needs ~10 closure values; DOM els are re-readable, mutable state is not.
   - What's unclear: whether to pass individual accessors or a single `ctx` object (cosmetic).
   - **RESOLVED:** single `ctx` object (Pattern 2) — one call site in `add-session.js`, easy to diff, no new public globals. Implemented in plan 31-05 (`window.__exportModalInit(ctx)`).

2. **Does any consumer outside settings.html load the snippet/photos code?**
   - What we know: SnippetsUI/Photos IIFEs are `settings.html`-only; the snippet *engine* (`snippets.js`) is loaded on both pages, but the *UI* IIFE is settings-only.
   - What's unclear: nothing observed to the contrary.
   - **RESOLVED:** confirmed settings-only; plan 31-06 acceptance criteria includes the `grep -rn "settings-snippets\|settings-photos" *.html` check (must appear only in `settings.html`).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | `npm test` gate | ✓ | v22.20.0 | — |
| jsdom | Behavior tests | ✓ | 29.1.1 (installed devDep) | — |
| `npm test` runner | Green gate | ✓ | `node tests/run-all.js` | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none. The phase is fully runnable on the current machine.

## Validation Architecture

> Nyquist validation is **ENABLED** (`config.json` → `workflow.nyquist_validation: true`). This is the load-bearing section for D-09's "real protection vs. false confidence" question.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Plain Node `assert` + jsdom real-page harness (no Jest/Mocha) |
| Config file | `package.json` (`"test": "node tests/run-all.js"`); runner `tests/run-all.js` |
| Quick run command | `node tests/<file>.test.js` (single file, exit-0/1) |
| Full suite command | `npm test` (discovers all `tests/*.test.js`, one child process each, fails if any fail) |

### Phase Requirements → Test Map (per extraction — does the green net genuinely protect this move?)

**Extraction 1 — SnippetsUI (settings.js 712–2018 → settings-snippets.js). Net verdict: STRONG / LOW risk.**
| Req | Behavior | Protective test (real, executing) | GAP status |
|-----|----------|-----------------------------------|------------|
| RFCT-01 | Editor open → add/update/delete → list re-render | `tests/30-snippet-wiring.test.js` (evals `settings.js` @123) | GAP-03a closed, mutation-kill |
| RFCT-01 | Import collision → REPLACE/MERGE via real FileReader | `tests/30-snippet-import-merge.test.js` | GAP-03b closed, mutation-kill |
| RFCT-01 | Trigger/expansion/validator leaf helpers | `24-04-trigger-regex`, `24-05-*` (via `Snippets.__testExports` + `window.__SnippetEditorHelpers`) | pre-existing real |
| **Hook to preserve** | `window.__SnippetEditorHelpers` assigned at **settings.js:863** | resolvable after move | **Test-loader task: every `settings.js`-evaling test must also eval `settings-snippets.js`** |

**Extraction 2 — Photos/StorageUsage (settings.js 2370–2969, two IIFEs → settings-photos.js). Net verdict: STRONG at loop+render / LOW-MED risk (one vacuous-green caveat).**
| Req | Behavior | Protective test | GAP status |
|-----|----------|-----------------|------------|
| RFCT-01 | `_optimizeAllPhotosLoop` body + dataURL adapters + handleOptimize success | `tests/30-photos-optimize-loop.test.js` (vm-loads real settings.js, exact savedBytes) | GAP-09 closed, mutation-kill |
| RFCT-01 | Delete-all photos | `tests/25-07-delete-all-photos.test.js` | pre-existing real |
| RFCT-01 | Optimize estimate floor / stale / verdict | `tests/25-12-optimize-{estimate-floor,stale-estimate,verdict}.test.js` | pre-existing real |
| RFCT-01 | Storage-usage line re-render on language change | `tests/25-12-photos-usage-language-rerender.test.js` | pre-existing real |
| **Caveat** | Toast scenarios | `tests/25-11-toast-behavior.test.js` — **no `EXPECTED_COUNT` guard (WR-05)** | **Add `EXPECTED_COUNT=5` before this extraction** (cheap; redundant with 30-photos-optimize-loop) |
| **Hooks to preserve** | `window.__PhotosTabHelpers` (settings.js:2545), `window.__photosOptimizeResultTimer` | resolvable after move; **two IIFEs must move together, helpers-IIFE first** | Test-loader task as above |

**Extraction 3 — Export-modal + markdown builders (add-session.js ~730–1835 → export-modal.js). Net verdict: STRONG (real DOM-click end-to-end) / MED risk (closure mechanics, not coverage).**
| Req | Behavior | Protective test | GAP status |
|-----|----------|-----------------|------------|
| RFCT-02 | `buildSessionMarkdown` payload (issues section, insights placement) via `copySessionBtn`/`exportSessionBtn` clicks → clipboard | `tests/30-export-markdown.test.js` (evals `add-session.js` @132; drives real `.click()`) | GAP-13/B2 closed |
| RFCT-02 | Stepper 1→2→3, close, download-seam, MdRender branch, mobile-tabs | `tests/30-export-stepper.test.js` (asserts `activeStep` class via real clicks) | GAP-10/B3 closed |
| RFCT-02 | Per-field copy scoped payload | `tests/30-field-copy.test.js` | GAP-13 closed |
| RFCT-02 | Issues → markdown delta/cap | `tests/30-issue-delta.test.js` | GAP-14 closed |
| RFCT-02 | Ordered-list export formatting | `tests/quick-260522-iwr-ordered-list-export.test.js` | pre-existing real |
| **Mechanism note** | Export fns are **NOT** on `__addSessionTestHooks` — tests drive them through the **full real DOM wiring**. This is *good*: a broken extraction (unbound buttons) fails loudly. | — | **Test-loader task: every `add-session.js`-evaling export test must also eval `export-modal.js` (before add-session.js).** Context-injection (Pattern 2) is the safe extraction mechanic. |

**RFCT-03 cleanups — test-first per D-03 (Wave 0 work):**
| Cleanup | File | Existing coverage | Wave-0 characterization test required |
|---------|------|-------------------|--------------------------------------|
| `openDB()` connection pooling | `db.js` | indirect via many tests; **no test exercises the cached-connection path** | **YES — the riskiest.** Assert: (a) repeated `openDB()` returns a working handle (a `getAll` succeeds); (b) after `onversionchange`→close, next `openDB()` yields a **fresh working** handle (cache invalidated); (c) concurrent `openDB()` calls don't double-open / double-seed; (d) `migrateOldDB` side-effect runs once. **Observable asserts only** (transaction succeeds / record returned), never internal `_dbPromise`. |
| innerHTML + i18n hardening | `overview.js` | 2 tests | **YES** — assert rendered button label text + structure at lines 456 (`overview.sessions.none`) and 510 (view-button) **before** swapping innerHTML→textContent/DOM. Safe clears (316/355/595 `= ""`) and static SVG (430) need no behavior change. |
| innerHTML + i18n hardening | `sessions.js` | **0 tests** | **YES** — assert the view-button render at line 147 before change; 16/79 are safe clears. |
| `var`→`const`/`let` | settings.js (403), db.js (10) | covered by the suite | No new test — but convert **only inside moved regions**, `npm test` after each batch (Pitfall 4). |
| Tagged `catch` logging | touched silent catches | covered | No new test — additive logging; assert nothing thrown. |
| Glue dedupe (`t`/`showToast`/`getCurrentLang` → `App.*`) | settings.js ~937–978 | suite-verified (D-04) | No new test — net-verified; if divergence, keep wrapper + note (D-04). |

### Sampling Rate
- **Per task commit (per extracted unit, D-06):** `npm test` (full suite — it is fast enough and is the contractual gate). Commit only when green.
- **Per Wave 0 cleanup (RFCT-03):** run the new characterization test red→green first, then `npm test`.
- **Phase gate:** full `npm test` green **plus** the D-08 manual UAT smoke-test of the 3 features, **plus** D-09 architect sub-agent sign-off.

### Wave 0 Gaps (tests/fixtures to create or fix BEFORE the moves)
- [ ] `tests/31-openDB-pooling.test.js` — characterization of the cached-connection lifecycle (4 asserts above). **Highest priority; RFCT-03's only lifecycle change.**
- [ ] `tests/31-overview-render-hardening.test.js` — characterize `overview.js` view-button + empty-state render before innerHTML→textContent swap.
- [ ] `tests/31-sessions-render-hardening.test.js` — characterize `sessions.js` view-button render (file has 0 tests today).
- [ ] Fix `tests/25-11-toast-behavior.test.js` — add `EXPECTED_COUNT = 5` (close WR-05 vacuous-green) before the Photos extraction.
- [ ] **Per-extraction test-loader updates (mechanical, not new files):** add `win.eval(readAsset('assets/<new-file>'))` to every test that evals the origin file. Enumerate with `grep -rl "assets/settings.js" tests/*.test.js` (30) and `grep -rl "assets/add-session.js" tests/*.test.js` (14); only the `win.eval(readAsset(...))` lines need editing.

## Security Domain

> `security_enforcement` is not disabled in config — included. This is a refactor with a narrow security surface (output encoding only).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (offline single-user app) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Validation / Sanitization / Encoding | **yes** | The RFCT-03 innerHTML+i18n hardening in `overview.js`/`sessions.js` = output-encoding hygiene: prefer `textContent` + DOM nodes (the pattern `settings.js` already enforces). i18n strings are app-controlled, so XSS risk is **low**; the hardening is defensive consistency, not a live vuln fix. |
| V6 Cryptography | no | — (no crypto touched; license/share encryption untouched) |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| innerHTML with interpolated i18n (`overview.js:456,510`; `sessions.js:147`) | Tampering / XSS (low, app-controlled strings) | Swap to `textContent` + DOM-built nodes; characterization test asserts identical rendered output first (D-03) |
| Refactor silently widening the public `window.*` surface | Tampering (larger attack/preserve surface) | Discretion rule: introduce **no** new public globals beyond existing test hooks; the export handshake uses a private `window.__exportModalInit`, not a feature API |
| Service-worker serving a stale asset list after extraction | Availability (broken update) | Update `PRECACHE_URLS` + manual `CACHE_NAME` bump (pre-commit gotcha) |

## Sources

### Primary (HIGH confidence — live source verified this session)
- `assets/settings.js` (2,969 lines) — IIFE boundaries 14/688/712/2018/2035/2113/2135/2344/2370/2571/2585/2969; hooks @863, @2545; 403 `var`; innerHTML discipline (textContent-only)
- `assets/add-session.js` (2,173 lines) — `DOMContentLoaded` closure 44–1863; export region 765–1835; closure-capture counts; `__addSessionTestHooks` @38; `:2071` log string
- `assets/db.js` (1,116 lines) — `openDB()` @292–348; `onversionchange`→close @329; 23 call sites; 10 `var`
- `assets/overview.js` / `assets/sessions.js` — innerHTML sites (overview 316/355/430/456/510/595; sessions 16/79/147); 0 `var`
- `settings.html` / `add-session.html` — full `<script src>` load order
- `sw.js` — 51 `assets/` PRECACHE entries; settings.js/add-session.js/snippets.js present
- `tests/30-snippet-wiring.test.js`, `tests/30-export-markdown.test.js`, `tests/30-export-stepper.test.js`, `tests/run-all.js`, `tests/_helpers/` — eval-by-filename mechanism; DOM-click invocation
- `package.json` — `npm test`, jsdom@^29.1.1, node>=18 (running v22.20.0)

### Secondary (HIGH — Phase 30 artifacts, execution-backed)
- `.planning/phases/30-test-harness-coverage/30-VERIFICATION.md` — GAP-01..16 all closed; A1–A5/B1–B8 region→test map; WR-05 vacuous-green flag
- `.planning/phases/30-test-harness-coverage/30-RESEARCH.md` — God-Module Behavior Inventory; Fwd D-13b classification; export-region risk call; `consolidate-in-P31` glue list
- `.planning/phases/31-refactor-god-modules/31-CONTEXT.md` — D-01..D-09 locked decisions

### Tertiary (LOW)
- none — no WebSearch needed (no external dependencies; refactor of owned source)

## Metadata

**Confidence breakdown:**
- Extraction map / line anchors: HIGH — verified against live source; two CONTEXT drifts corrected (hook @863 not 717; Photos = two IIFEs)
- Test-net protection: HIGH — Phase 30 verification shows all gaps closed with mutation-kill; loader mechanism confirmed by reading the tests
- Closure-capture (export) risk: HIGH — counted the exact captured identifiers in the live region
- openDB pooling: HIGH on the hazard + mitigation shape; MED on `migrateOldDB` idempotency detail (A1 — confirm at plan time)
- Cleanups (`var`, innerHTML, glue): HIGH — counts and sites enumerated

**Research date:** 2026-06-27
**Valid until:** ~2026-07-27 (stable — owned source, no external deps; only invalidated by edits to these files before planning)
