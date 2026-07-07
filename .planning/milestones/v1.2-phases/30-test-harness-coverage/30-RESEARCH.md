# Phase 30: Test Harness & Coverage - Research

**Researched:** 2026-06-26
**Domain:** Test infrastructure (Node built-in runner + jsdom), characterization testing of two DOM-coupled god modules, first-ever `package.json` for a zero-runtime-dependency vanilla-JS PWA
**Confidence:** HIGH (everything below was verified by direct codebase inspection and by executing the tests on local Node v22.20.0 with jsdom 29.1.1; nothing here is assumed)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Introduce the project's **first `package.json`** — `private: true`, `devDependencies` only (`jsdom`), an `npm test` script that runs the whole suite, and `node_modules` added to `.gitignore`. This is TEST-04's "single documented command."
- **D-02:** **Production stays genuinely zero-runtime-dependency / ~50KB / no build.** Cloudflare Pages deploys static `/assets/*` only — it never sees `node_modules`. devDependencies never ship.
- **D-03 (PRINCIPLE — promote to PROJECT.md Key Decisions):** The zero-dependency restriction applies to **production/runtime code only.** Dev/test tooling may use npm freely.
- **D-04:** One shared jsdom helper under `tests/_helpers/` (e.g. `jsdom-pdf-env.js`); all 7 broken PDF tests adopt it. Root causes: (a) jsdom lacks `HTMLCanvasElement.getContext` → stub to `null`; (b) old-Node `blob.arrayBuffer` absence → resolved by a modern Node floor.
- **D-05:** Minimum Node version via `engines` so `blob.arrayBuffer` cannot recur. (Floor recommended below.)
- **D-06 (helper-extraction scope guardrail):** The shared helper must be adopted by the **7 broken** PDF tests at minimum. Migrating the already-green jsdom test(s) is opportunistic/optional. **Never let helper consolidation turn a green test red.**
- **D-07:** **Go BROAD** — wide behavior-characterization net over `settings.js` and `add-session.js` before the refactor.
- **D-08 (load-bearing):** Test **observable behavior only** — inputs→outputs, save/load round-trips, what is persisted, what renders — **never internal plumbing/structure.** Internals are exactly what Phase 31 rearranges.
- **D-09:** Evaluate the "load the real page fragment into jsdom and exercise the real handlers" approach for these two DOM-coupled modules vs the brittle hand-stubbed `document` used elsewhere.
- **D-10 (effort guardrail):** Research must produce a concrete **behavior inventory with an effort estimate** per module. Format: per-function row with observable behavior, Tech×Biz score, and a Cheap/jsdom/Skip tier; cross-check existing `tests/` so already-covered helpers aren't re-tested. Broad ≠ unbounded.
- **D-11 (RTL guard default):** Guard tests the actual `dir`-applying code path across all 4 locales (HE→rtl, EN/DE/CS→ltr) and FAILS if rtl is applied to a non-Hebrew locale. Reference `tests/29-02-migration-escape-hatch.test.js` (case 5) and the 4-locale loader in `tests/25-11-i18n-parity.test.js`.
- **D-12 (process — MANDATORY):** The PLAN.md must pass an **architect-soundness verification round BEFORE Ben**, separate from and after `gsd-plan-checker`. Order: research → planner → plan-checker → architect verifier → resolve material findings → Ben.
- **D-13a:** Full-file coverage map of ALL `assets/*.js` (lines × existing test-file count) with explicit in-scope/out-of-scope verdict + reason.
- **D-13b:** Per-finding forward-improvement classification: `keep-as-is` / `consolidate-in-P31` / `extract-later (backlog)` / `backfill-tests-later (backlog)`.
- **D-13c:** Glue-duplication / consolidation-candidate list (god modules → Phase 31; app-wide → backlog).
- **D-14 (scope boundary):** Real, dangerous gaps in OTHER files (`app.js`, `license.js`, `backup.js`, `pdf-export.js`, `db.js`) are OUT of v1.2 scope. List in the coverage map and route to backlog — do NOT silently expand into them.

### Claude's Discretion
Exact name/location of the shared PDF helper, the precise Node floor, the `npm test` runner implementation (`tests/run-all.js` vs shell glob), and the specific behavior list in the inventory — all left to research + planning, constrained by the decisions above.

### Deferred Ideas (OUT OF SCOPE)
- Migrating already-passing jsdom test(s) onto the shared helper (opportunistic only; leave green tests as-is if it grows).
- Coverage tooling / enforced thresholds (coverage stays informal).
- End-to-end / browser visual-regression testing (Playwright/Cypress).
- The 10 phase-match todos surfaced during discuss — none relate to a test harness; none folded.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | The 7 currently-unrunnable PDF tests run green in Node (resolve `getContext` gap + old-Node `blob.arrayBuffer`) | §TEST-01: the 7 tests are named & verified; both root causes confirmed by execution; shared helper + Node floor specified |
| TEST-02 | RTL regression guard fails if `dir="rtl"` is applied to EN/DE/CS | §TEST-02: canonical code path is `App.setLanguage()` (app.js:124), exported via `window.App`; 4-locale guard design given |
| TEST-03 | Behavior tests capture current observable behavior of `settings.js` + `add-session.js` (pre-refactor green baseline) | §God-Module Behavior Inventory: per-IIFE observable-behavior tables, tiers, effort, existing-coverage cross-check, jsdom-real-page feasibility |
| TEST-04 | Full suite via a single documented command | §TEST-04: `package.json` shape, `npm test` runner options, pre-commit-hook safety verified, production zero-dep preserved |
</phase_requirements>

## Summary

This phase is **infrastructure + characterization, not feature work**. Three of the four requirements are low-to-moderate effort and well-bounded; the fourth (TEST-03, "go broad") is the only large item and its size is **much smaller than the raw line counts suggest** because ~70% of `settings.js` and the pure helpers of `add-session.js` are already covered by the 27 existing tests that load these two files.

I executed all PDF/jsdom tests on Node v22.20.0 with a freshly-installed jsdom 29.1.1. **All 8 jsdom-dependent tests exit 0 today** once jsdom is actually present — so "unrunnable" means *"there is no documented, repeatable way to install jsdom and run them"* (the fragile `/tmp/node_modules/jsdom` convention), plus cosmetic `getContext` console noise on 7 of them. The 7 that need the shared helper are exactly the 7 that do **not** currently stub `getContext`; the 8th (`quick-260620-q8m-pdf-paragraph-linebreaks`) already stubs it and is the reference template.

The single most important architectural finding for TEST-03 is about **D-09**: most of `add-session.js`'s logic lives inside one `DOMContentLoaded` IIFE and is **not exported**, so the existing "tests" for it (e.g. `quick-260615-export-section-order`) resort to **static source-slicing with string/regex matching** — which couples to internals and **violates D-08**. The correct, D-08-compliant way to pin these behaviors is exactly the D-09 approach: **load the real HTML fragment into jsdom, stub `App` + `PortfolioDB`, fire `DOMContentLoaded`, drive the real handlers, and assert on observable output** (the emitted markdown string, the active-step class, the persisted settings record). The existing `tests/_helpers/mock-portfolio-db.js` already provides the DB spy this needs.

**Primary recommendation:** Land the `package.json` + shared jsdom helper + Node floor first (small, unblocks everything and silences noise), add the RTL guard (small, real code path already exported), then invest the bulk of the phase in a **jsdom-real-page characterization harness** for the two god modules, prioritizing the genuinely-uncovered observable behaviors (section-title save/load round-trip in `settings.js`; the export-modal stepper + markdown builders in `add-session.js`) and *not* re-testing the snippet/photo/backup helpers that 25-xx already pins.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Run the test suite | Dev workbench (Node + npm) | — | `npm test` drives the existing Node files; never ships to production |
| jsdom "fake browser" for PDF + DOM modules | Dev workbench (jsdom devDep) | — | jsPDF + the god modules need DOM APIs Node lacks |
| `dir="rtl"` locale switching (under test) | Browser/Client (`App.setLanguage`) | — | Runtime DOM attribute on `<html>`; the guard exercises the real client code path |
| Settings persistence (under test) | Storage (`PortfolioDB` / IndexedDB) | Browser/Client (settings.js handlers) | Save/load round-trip is the observable behavior; DB is mocked, handlers are real |
| Export markdown / PDF generation (under test) | Browser/Client (add-session.js + pdf-export.js) | — | Pure-ish string building + jsPDF draw calls; observable via returned text / draw-call spies |
| Production runtime | Browser/Client + CDN static | — | Cloudflare Pages serves `/assets/*` only — **never** `node_modules` (D-02) |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in test loop + `assert` | bundled w/ Node ≥18 | Test runner + assertions | Already the project's entire harness (74 files); zero new deps; TESTING.md §Test Structure [VERIFIED: codebase] |
| `node:vm` | bundled | Load asset files into an isolated sandbox | Established pattern; isolates browser globals from Node [VERIFIED: codebase TESTING.md] |
| jsdom | `29.1.1` (latest) | "Fake browser" DOM for jsPDF + the DOM-coupled god modules | Already the de-facto PDF-test dependency; the *only* new devDependency D-01 introduces [VERIFIED: npm registry — latest 29.1.1, no postinstall script] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tests/_helpers/mock-portfolio-db.js` | in-repo | IndexedDB write-spy / read-stub | Settings save/load round-trip, any handler that touches `PortfolioDB` [VERIFIED: codebase] |
| `tests/_helpers/mock-navigator-share.js` | in-repo | Stubs `navigator.share` | Export-modal share path [VERIFIED: codebase] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node built-in loop | `node --test` (built-in test runner, Node ≥18) | Tempting, but it would force rewriting 74 passing files; D-01 says `npm test` must *drive the same files*, not replace the runner. Reject. |
| jsdom | `happy-dom`, `linkedom` | Faster/lighter, but jsdom is already vendored-in by convention, has the canvas-stub pattern documented, and runs jsPDF correctly. No reason to switch. Reject. |
| jsdom (+ `canvas` npm pkg) | install `canvas` to get a real `getContext` | `canvas` is a heavy native-compile dependency; the established pattern stubs `getContext → null` because jsPDF only needs the *text* metrics path, not raster. Reject — keep the stub. |

**Installation (the entire new dependency footprint):**
```bash
npm install   # installs jsdom (devDependency) into node_modules/ — gitignored, never deployed
npm test      # runs the whole suite (TEST-04)
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| jsdom | npm | 14+ yrs (since 2010) | ~30M+/wk | github.com/jsdom/jsdom | OK | Approved — sole devDependency |

- **Packages removed due to [SLOP] verdict:** none
- **Packages flagged as suspicious [SUS]:** none
- jsdom `npm view jsdom scripts.postinstall` → empty (no postinstall script) [VERIFIED: npm registry]. Latest is `29.1.1`. It is one of the most-downloaded test packages in the ecosystem and is the canonical DOM emulator; legitimacy is not in question.

## Architecture Patterns

### System Architecture Diagram

```
                         npm test  (single documented command — TEST-04)
                              │
                              ▼
                   ┌──────────────────────┐
                   │ tests/run-all.js  OR │   ← discovers tests/*.test.js
                   │ shell glob in script │      (see TEST-04 trade-off below)
                   └──────────┬───────────┘
                              │ spawns / requires each file (exit 0/1 contract preserved)
            ┌─────────────────┼───────────────────────────────┐
            ▼                 ▼                                 ▼
   ┌────────────────┐  ┌─────────────────┐          ┌────────────────────────┐
   │ pure vm tests  │  │ jsdom PDF tests │          │ jsdom REAL-PAGE tests  │
   │ (existing)     │  │ (7 + 1 ref)     │          │ (NEW — TEST-03 broad)  │
   │ node:vm + stub │  │                 │          │                        │
   │ document       │  │ tests/_helpers/ │◄─shared──│ tests/_helpers/        │
   └───────┬────────┘  │ jsdom-pdf-env.js│  helper  │ jsdom-pdf-env.js +     │
           │           │ (getContext→null│  (D-04)  │ mock-portfolio-db.js + │
           │           │  + det. date/id)│          │ App stub               │
           ▼           └────────┬────────┘          └───────────┬────────────┘
   asset under test            │ loads                          │ loads HTML fragment
   via __testExports     assets/jspdf.min.js              settings.html / add-session.html
                          assets/pdf-export.js             + assets/settings.js|add-session.js
                                                            → fire DOMContentLoaded
                                                            → drive real handlers
                                                            → assert observable output
                                                              (markdown text, active-step
                                                               class, persisted DB record,
                                                               document.documentElement.dir)
```

### Recommended Project Structure
```
/
├── package.json            # NEW (D-01): private:true, devDeps={jsdom}, engines, "test" script
├── .gitignore              # add node_modules/  (already present — verified below)
├── tests/
│   ├── _helpers/
│   │   ├── jsdom-pdf-env.js     # NEW (D-04): the ONE shared jsdom env (getContext→null,
│   │   │                        #   deterministic setCreationDate/setFileId, jspdf+bidi+font+pdf-export load)
│   │   ├── mock-portfolio-db.js # EXISTING: reuse for settings save/load round-trip
│   │   └── mock-navigator-share.js # EXISTING: reuse for export-share path
│   ├── run-all.js          # OPTIONAL (D-01 discretion): tiny discovery runner
│   ├── pdf-*.test.js        # 7 adopt the shared helper
│   └── 30-*.test.js         # NEW: RTL guard + god-module characterization
```

### Pattern 1: The shared jsdom PDF env (D-04)
**What:** Extract the inlined `buildJsdomEnv()` (duplicated across the 7 broken PDF tests) into one helper that (a) builds the JSDOM, (b) stubs `getContext → null`, (c) loads jspdf+bidi+heebo-font+pdf-export, (d) exposes a deterministic-pinning helper.
**When to use:** every PDF test, and every jsdom-real-page god-module test that needs jsPDF.
**Example (the exact existing inline shape to extract — verified in `tests/pdf-bold-rendering.test.js:90` and TESTING.md):**
```js
// Source: tests/pdf-bold-rendering.test.js (inline buildJsdomEnv, lines 90-93)  [VERIFIED: codebase]
function buildJsdomEnv() {
  var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'file://' + REPO_ROOT + '/test-harness.html',
    runScripts: 'outside-only',
  });
  var win = dom.window;
  win.HTMLCanvasElement.prototype.getContext = () => null;   // ← the stub the 7 are MISSING
  win.eval(fs.readFileSync('assets/jspdf.min.js', 'utf8'));
  win.eval(fs.readFileSync('assets/bidi.min.js', 'utf8'));
  win.eval(fs.readFileSync('assets/fonts/heebo-base64.js', 'utf8'));
  win.eval(fs.readFileSync('assets/pdf-export.js', 'utf8'));
  return dom;
}
// Deterministic output pinning (TESTING.md §PDF Tests):
doc.setCreationDate("D:20260101000000+00'00'");
doc.setFileId('00000000000000000000000000000000');
```
**Note:** the helper should accept the jsdom `JSDOM` constructor by reference (or `require` it itself from the now-installed dependency) so individual tests no longer need the `JSDOM_PATH || '/tmp/node_modules/jsdom'` dance.

### Pattern 2: jsdom real-page characterization (D-09 — the TEST-03 enabler)
**What:** Load the real `*.html` body fragment into jsdom, install lightweight stubs for `App.*` and `PortfolioDB` (the mock helper), fire `DOMContentLoaded`, then drive the real event handlers and assert on **observable output only** (D-08).
**When to use:** the section-title save/load round-trip (settings.js) and the export-modal/markdown behaviors (add-session.js) — the parts that are NOT reachable via `__testExports`.
**Why it beats the alternatives:** the brittle hand-stubbed `document` used elsewhere can't represent a real form; static source-slicing (what `quick-260615` does today) couples to internals and breaks the moment Phase 31 moves a function — exactly the failure mode D-08 forbids.

### Anti-Patterns to Avoid
- **Static source-slicing as a "behavior test"** (e.g. `functionBody(name)` string-index + regex over the source, as in `tests/quick-260615-export-section-order.test.js`). It asserts *shape*, not *behavior*, and couples to internal structure — a Phase 31 rename makes it fail with no behavior change. **This is precisely the net that gives false confidence (the D-12 architect risk).** Replace/augment with a real executing test.
- **Testing internal helper names** (e.g. asserting `renderSnippetList` exists / is called). Phase 31 will rename these. Assert the *rendered list contents*, not the function.
- **Letting the shared helper turn a green test red** (D-06). Adopt it in the 7; only migrate the green ones if trivially safe.
- **Raising the `engines` floor higher than the real requirement.** The only hard need is native `Blob.prototype.arrayBuffer`; over-pinning would block contributors needlessly.

## God-Module Behavior Inventory (TEST-03, D-10) — the core deliverable

### How to read this
- **Tier:** `Cheap` = pure/near-pure, testable via `node:vm` + `__testExports` (fast, no jsdom). `jsdom` = needs the real-page harness (Pattern 2). `Skip` = thin glue / framework wrapper / not observable on its own — do NOT test; classify forward instead.
- **Tech×Biz:** importance for the refactor safety net. Tech = "how likely Phase 31 touches/breaks this"; Biz = "how visible the breakage is to a therapist." Scored Low/Med/High.
- **Existing coverage** column prevents re-testing (D-10). Cross-checked against the 27 tests that load these two files.
- **Fwd (D-13b):** `keep` / `consolidate-P31` / `extract-later` / `backfill-later`.

### Module A — `assets/settings.js` (2,969 lines; **5 separate IIFEs**, 21 existing test files load it)

Critical sizing finding: settings.js is **not one module** — it is five IIFEs, and **three of them are already heavily characterized** by the 25-xx suite. Only IIFE-1 (section titles) and IIFE-3 (tab nav) are genuinely uncovered.

> **Inventory corrected post-re-audit (2026-06-27).** The 13-region execution-backed re-audit (`30-VERIFICATION.md`) found that this inventory over-credited coverage by counting file-mentions, not running the code. The "Existing coverage" cells below are corrected against the verification's "Documentation corrections" table: several 25-xx tests credited to settings.js actually load **different** modules (`assets/backup.js`, `assets/crop.js`, `assets/db.js`), and the snippet/report/photos/backups credits are **leaf-only** with screen wiring uncovered (GAP-03/04/08/09). Treat "three IIFEs already characterized" above as **leaf-level**, not wiring-level.

| IIFE / Section (lines) | Key functions | Observable behavior to pin | Tier | Tech×Biz | Existing coverage | Fwd (D-13b) |
|------------------------|---------------|----------------------------|------|----------|-------------------|-------------|
| **IIFE-1 `SettingsPage` — Section-title editor (14–688)** | `loadAndRender`, `onSave`, `onDiscard`, `showSavedNotice`/`dismissSavedNotice`, `computeDisableTransitions`, `buildReportRow`/`mountReportRow` | **THE key gap (TESTING.md "What Is NOT Tested: Settings save/load round-trips").** Load reads `PortfolioDB.getAllTherapistSettings()` and renders rows; Save persists a record via `PortfolioDB.setTherapistSetting` and shows the "saved" notice; Discard reverts. Round-trip: edit → save → reload → values persist. | **jsdom** | High×High | NONE for the round-trip. (re-audit 2026-06-27: `29-03-report-wiring` **is behavioral** — asserts label text + report.html target — but **leaf-only**; `mountReportRow` boot wiring is uncovered) | **backfill-later→ DO NOW**; `keep-as-is` post-test |
| IIFE-1 — saved-notice timing | `showSavedNotice`, auto-dismiss timer, `attachDismissTriggers` | Notice appears on save, auto-dismisses after `NOTICE_AUTO_DISMISS_MS`, dismissable on input/close | jsdom | Med×Med | Partially via 25-11-toast-behavior | `keep-as-is` |
| **IIFE-2 — Snippet Settings UI (712–2018)** | `isTriggerUnique`, `validateImportPayload`, `detectImportCollisions`, `filterSnippetList`, `isModifiedSeed`, `isValidTrigger`, `hyphenateSpaces`, `getCrossLangWarning`, `openEditor`/`handleSave`/`handleDelete`/`handleImport`/`applyImport`, tag-chip logic | Snippet CRUD, import collision detection, trigger validation, tag filtering | **Cheap (mostly already done)** | High×High | **EXTENSIVE at LEAF level only** (re-audit 2026-06-27): 24-05-import-validator, 24-05-list-filter, 24-05-modified-seed, 24-05-trigger-dedupe, quick-260619-okw-*, quick-260620-p3f, quick-260626-h5j-* pin the leaf helpers; the **screen wiring** (`openEditor`/`handleSave`/`handleDelete`/`handleImport`→`applyImport`/`renderSnippetList`/boot bindings) is **uncovered** (GAP-03) | `keep-as-is`; **glue → consolidate-P31** (see D-13c) |
| IIFE-2 — glue helpers | `t`, `getCurrentLang`, `showToast`, `postSnippetsChanged` | (thin wrappers — not observable alone) | **Skip** | Low×Low | n/a | **`consolidate-P31`** (`t`,`showToast` dup app-wide; `getCurrentLang` 5-line wrapper) |
| **IIFE-3 — Tab nav (2035–2113)** | `readUrlTab`, `writeUrlTab`, `boot`, `activate` | `?tab=` URL param selects the active tab; switching tabs writes the URL; invalid tab falls back | **Cheap** | Med×Med | NONE | **backfill-later→ DO NOW (cheap)**; `keep-as-is` |
| **IIFE-4 — Backups tab (2135–2344)** | `readScheduleMode`, `readPasswordAcked`, `readCustomDays`, `refreshFrequencyHelper`, `refreshCustomDaysVisibility`, `applyFrequencyChange`, `bindBackupsTab` | Schedule frequency → helper text + custom-days visibility; password-ack gating; save-toast on schedule change | Cheap (already done) | High×High | **Corrected (re-audit 2026-06-27):** 25-04-schedule-interval / 25-05-schedule-* load `assets/backup.js` (the `BackupManager` engine), **not** settings.js screen wiring. The settings.js Backups screen-wiring is covered only by 25-12-custom-days-*, 25-12-schedule-saved-toast, 25-12-password-*; `refreshFrequencyHelper` helper-text + the password-gate **rejection** path remain gaps (GAP-08) | `keep-as-is` |
| **IIFE-5 — Photos tab (2370–2969)** | `humanBytes`, `estimatePhotoSavings`, `dataURLToBlob`/`blobToDataURL`, `_deleteAllPhotosLoop`, `_optimizeAllPhotosLoop`, `refreshPhotosTab`, `handleOptimize`, `handleDeleteAll` | Bytes formatting, savings estimate floor/verdict, optimize/delete-all loops, language re-render | Cheap (already done) | High×High | **Corrected (re-audit 2026-06-27):** 25-06-resize-pure loads `assets/crop.js` and 25-07-photo-bytes-estimator loads `assets/db.js` — both **off-region** for settings.js. Real settings.js photos coverage: 25-07-delete-all-photos, 25-12-optimize-{estimate-floor,stale-estimate,verdict}, 25-12-photos-usage-language-rerender (all leaf/render-level). The `_optimizeAllPhotosLoop` body **never executes** — a gap (GAP-09) | `keep-as-is`; `_optimizeAllPhotosLoop` sequential → **`extract-later`** (PERF-03 backlog) |

**Settings.js effort estimate:** **~1.5–2.5 days.** The bulk (IIFE-2/4/5, ~2,200 of the 2,969 lines) is already pinned — re-testing would be waste (D-10). Net-new work is concentrated in **IIFE-1 section-title save/load round-trip (the documented gap, jsdom-real-page, ~1 day)** and **IIFE-3 tab nav (cheap, ~0.5 day)**. Add a thin layer of jsdom-real-page coverage over IIFE-1's saved-notice and the "Report a problem"/crashlog clear button on the page (`CrashLog.clear()` at line 618, ties to Phase 29).

### Module B — `assets/add-session.js` (2,173 lines; 1 giant `DOMContentLoaded` IIFE + top/bottom free functions; 6 existing test files load it)

Critical sizing finding: almost all logic is **trapped inside one `DOMContentLoaded` async IIFE** and **not exported** (only `computeGrowHeight` is, via `window.__addSessionTestHooks`). The export modal (RFCT-02's extraction target) is the highest-risk, lowest-covered region.

| Section (lines) | Key functions | Observable behavior to pin | Tier | Tech×Biz | Existing coverage | Fwd (D-13b) |
|-----------------|---------------|----------------------------|------|----------|-------------------|-------------|
| Textarea autogrow (17–34) | `computeGrowHeight`, `autoGrow`, `growAllSessionTextareas` | Height computed from scrollHeight within min/max | **Cheap** | Low×Low | **DONE**: quick-260516-rna-textarea-autogrow | `keep-as-is` |
| **Markdown builders (730–1180)** | `buildSessionMarkdown`, `buildFilteredSessionMarkdown`, `buildFieldCopyText`, `getClientNameForCopy`, `exportDefaultI18nKey`, `getCurrentSessionDataForExport` | **Session form data → markdown string** (the copy/export output a therapist sees). Section order, included/excluded sections, scale labels, headings. | **jsdom** (reads form DOM) | High×High | **shape-only via static slicing** (quick-260615-export-section-order, quick-260516-g7p-export-editor-snippets — these slice source, do NOT execute) | **backfill-later→ DO NOW with a REAL executing test**; `consolidate-in-P31` (extract w/ export modal) |
| **Export modal stepper (1180–1835)** | `exportRenderStep1Rows`, `exportSetActiveStep`, `exportUpdatePreview`, `exportApplyMobileTabs`/`exportWireMobileTabs`, `exportCloseDialog`, `exportHandleDownloadPdf`, `exportHandleDownloadMd`, `exportHandleShare`, `exportProbeShareSupport`, `openExportDialog` | 3-step stepper state (active-step class 1→2→3), preview text updates with section toggles, PDF/MD/share dispatch, dialog open/close | **jsdom** | High×High (this is **RFCT-02's exact extraction target**) | thin: quick-260615-share-files-only (slicing), 25-08-roundtrip (share-encrypt) | **backfill-later→ DO NOW**; **`consolidate-in-P31`** (extract to `export-modal.js`) |
| Section visibility/labels (901–1054) | `sectionHasData`, `applySectionVisibility`, `applySectionLabels` | Empty sections hidden; labels reflect user-customized section titles | jsdom | Med×High | none direct | `backfill-later→ DO NOW`; `keep-as-is` |
| Issue management (502–662) | `createIssueBlock`, `updateAddIssueState`, `updateRemoveButtons`, `removeIssue`, `updateDelta`, `getIssuesPayload`, `validateIssues` | Add/remove issue rows; severity before/after **delta computation**; payload shape; validation blocks empty | **Cheap→jsdom** (delta is near-pure; rows need DOM) | High×High | partial via 24-06-spotlight-session-info | `backfill-later→ DO NOW` (delta + payload, high value); `keep-as-is` |
| Form dirty/revert (679–718) | `snapshotFormState`, `revertSessionForm`, `updateCancelButtonLabel`, `PortfolioFormDirty` | Snapshot → edit → revert restores; dirty flag drives nav-guard | jsdom | Med×Med | none | `backfill-later→ DO NOW`; `keep-as-is` |
| Read mode (178–283) | `setReadMode`, `applyCopyLabels`, `resizeReadModeTextareas`, `openEditClientModal`/`closeEditClientModal` | Read-only rendering of a past session; edit-client modal open/close | jsdom | Med×Med | none | `extract-later` (candidate); `backfill-later (optional)` |
| Bottom free fns (1865–2173) | `loadClients`, `getSelectedClient`, `getClientDisplayName`, `renderSpotlightSessionInfo`, `populateSpotlight`, `updateSessionTitle`, `populateSession` | Client dropdown population; spotlight info; title from selection | Cheap/jsdom | Med×Med | **Corrected (re-audit 2026-06-27):** 24-06-spotlight-session-info pins **only** `renderSpotlightSessionInfo` (leaf-only); `quick-260516-g7p-save-returns-to-session` was a **fake** (source-slicer, removed in 30-12). `loadClients`/`populateSpotlight`/`updateSessionTitle`/`populateSession` wiring is **uncovered** (GAP-04) | `keep-as-is` |

**Add-session.js effort estimate:** **~2.5–3.5 days** — the heaviest single item in the phase. The driver is that the high-value regions (markdown builders + export modal + issue delta) are currently only *shape-tested via source-slicing*, so they need **real executing jsdom-real-page tests built from scratch**, plus an `App` stub (the module calls `App.t` ×41, `App.getSectionLabel` ×21, `App.showToast` ×16, `App.getSeverityValue`, `App.formatDate`, etc. — a moderately large but mechanical stub surface, verified by grep). Recommend exposing a wider `window.__addSessionTestHooks` surface (benign, non-behavioral) for `buildSessionMarkdown` / `buildFilteredSessionMarkdown` / the export-step functions so they can be driven directly after the page loads, reducing the DOM-event choreography.

**Combined TEST-03 estimate: ~4–6 working days.** This is the "right-size at plan time" signal D-10 asks for: the breadth is real but bounded, and roughly half of it is the one-time cost of building the `App` stub + the jsdom-real-page harness, which then amortizes across both modules and protects Phase 31.

### D-09 verdict (load the real page into jsdom): **CONFIRMED feasible and correct, with a measured cost.**
- **For settings.js IIFE-1:** *Strongly recommended and cheap-ish.* `loadAndRender`/`onSave` only depend on `PortfolioDB.getAllTherapistSettings`/`setTherapistSetting` (both already in `mock-portfolio-db.js`) and `App.initCommon`/`App.t`. Fire `DOMContentLoaded` (handler at settings.js:643), edit a field, click save, assert the spy captured the record and a reload re-renders it. This is the canonical D-08 round-trip and directly closes the documented gap.
- **For add-session.js:** *Recommended but heavier.* The `App` stub surface is larger (~12 methods, all mechanical). Two viable shapes: (1) full jsdom-real-page driving DOM events (most faithful, tests wiring too); (2) jsdom page-load + widened `__testExports` to call `buildSessionMarkdown`/export functions directly (less choreography, still real execution, still observable-output assertions). Recommend (2) for the markdown builders and (1) for the stepper state machine.
- **Landmines (verified):** the IIFEs run on `DOMContentLoaded` and `await App.initCommon()` — the stub's `initCommon` must resolve; missing DOM IDs cause the handler to no-op or throw (the HTML fragment must include the form's `data-section-key` elements and the issue-list/export-dialog containers); `App.installNavGuard` and `BroadcastChannel` are referenced (stub to no-ops); jsPDF must be loaded for the PDF download path (reuse the shared helper). None are blockers — all are standard jsdom stubbing.

## Full-File Coverage Map (D-13a)

ALL `assets/*.js` listed. Verdict is **for Phase 30 only.** "test-files" = number of existing test files referencing the asset (verified by grep, 2026-06-26).

| File | Lines | test-files | Phase 30 verdict | Reason |
|------|-------|-----------|------------------|--------|
| **settings.js** | 2,969 | 21 | **IN SCOPE** | God module #1; characterize observable behavior pre-refactor (TEST-03). Only IIFE-1/IIFE-3 are net-new. |
| **add-session.js** | 2,173 | 6 | **IN SCOPE** | God module #2; export modal + markdown builders need real executing tests (TEST-03). |
| pdf-export.js | 1,198 | 9 | partial (helper only) | TEST-01 fixes the 7 PDF tests that exercise it; not characterized further. Well-covered already. |
| app.js | 1,474 | 8 | **OUT** → backlog | D-14: real gap (8 tests for 1,474 lines incl. `setLanguage` — but TEST-02 exercises only `setLanguage`'s dir behavior). Broader app.js coverage = v1.3 backlog. |
| license.js | 568 | **0** | **OUT** → backlog | D-14: **0 tests, dangerous** (paywall/activation). Explicitly routed to v1.3 Codebase Health II backlog; NOT Phase 30/31. |
| backup.js | 1,575 | 21 | **OUT** | Not a v1.2 refactor target; already heavily covered by 25-xx. |
| db.js | 1,116 | 12 | **OUT** | Migration/IDB; covered by 24-04-idb-migration, 29-02; `openDB` pooling is RFCT-03/backlog. |
| landing.js | 762 | **0** | **OUT** → backlog | D-14: 0 tests; marketing page, not a god module; has its own `dir` setter (same `=== 'he'` rule). |
| overview.js | 712 | 2 | **OUT** | `innerHTML`+i18n hardening is RFCT-03 (Phase 31 opportunistic), not Phase 30. |
| snippets.js | 551 | 5 | **OUT** | Engine well-covered (24-04/24-05). |
| backup-modal.js | 506 | 3 | **OUT** | Covered enough; not a target. |
| crashlog.js | 480 | 4 | **OUT** | Phase 29 just covered it. |
| report.js | 418 | 1 | **OUT** | Not a target. |
| disclaimer.js | 357 | **0** | **OUT** → backlog | 0 tests; legal gate; has unconditional-in-he-branch `dir` setters (verify same rule in backlog). |
| version.js | 353 | 4 | **OUT** | Phase 28 covered it; nudge has a `dir` setter (same rule). |
| snippets-seed.js | 344 | (via snippets) | **OUT** | Data file. |
| crop.js | 289 | 2 | **OUT** | Covered (25-06). |
| add-client.js | 264 | 2 | **OUT** | Covered. |
| i18n-disclaimer.js | 285 | — | **OUT** | Data/strings. |
| sessions.js | 184 | **0** | **OUT** → backlog | D-14: 0 tests; `innerHTML`+i18n (RFCT-03) + pagination (PERF-01 backlog). |
| shared-chrome.js | 164 | 1 | **OUT** | Thin chrome; footer/back-link. |
| globe-lang.js, md-render.js, report.js (dup), reporting.js, demo*.js, i18n-*.js | <420 each | varies/0 | **OUT** | Small modules, data, or already covered; none are v1.2 refactor targets. |
| jspdf.min.js, bidi.min.js, jszip.min.js | vendored | — | **OUT** | Vendored bundles (HARD-02 backlog: version pinning). |

**Conscious scoping statement:** Only `settings.js` and `add-session.js` are in scope for Phase 30 characterization. `app.js` is touched *only* to the extent TEST-02 exercises `App.setLanguage`'s `dir` behavior. Every out-of-scope file with a genuine gap (`license.js` 0 tests, `landing.js` 0, `disclaimer.js` 0, `sessions.js` 0, `app.js` thin) is **named here and routed to the v1.3 "Codebase Health II" backlog item** per D-14 — not silently dropped, not expanded into.

## Glue-Duplication / Consolidation Candidates (D-13c)

Verified by grep across `assets/*.js` (2026-06-26):

| Duplicated glue | Where | Belongs to | Disposition |
|-----------------|-------|------------|-------------|
| `function t(` (i18n shorthand) | app.js, settings.js, report.js, disclaimer.js (+ vendored jspdf) | god modules → Phase 31; app-wide → backlog | settings.js copy: **`consolidate-in-P31`**; app-wide dedupe: **`extract-later (backlog)`** |
| `function showToast(` | app.js, settings.js | god modules → Phase 31 | settings.js copy: **`consolidate-in-P31`** (app.js already exposes `App.showToast` — add-session.js correctly uses it ×16) |
| `function getCurrentLang()` (5-line wrapper around `window.App.getLanguage()`) | settings.js only | Phase 31 | **Skip-for-test + `consolidate-in-P31`** (the canonical example from D-13b; replace with `App.getLanguage()`) |
| Inline `buildJsdomEnv()` | 7 PDF test files | Phase 30 itself | **`consolidate-in-P31`-style NOW** — this is exactly D-04's shared helper |

**Note:** add-session.js does NOT define its own `t`/`showToast`/`getCurrentLang` — it already delegates to `App.*`. So the cross-IIFE glue duplication is concentrated in **settings.js**, which is convenient: Phase 31's settings extraction can drop these three wrappers in favor of the `App.*` canonicals with no behavior change (the Phase 30 net will prove it).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOM/`document`/`window` in Node | A hand-stubbed `document` object per test | jsdom (the real-page harness, D-09) | The hand-stub can't represent a form, event bubbling, or `dir` on `<html>`; it's the brittle pattern D-09 explicitly moves away from |
| IndexedDB in tests | A bespoke IDB fake | `tests/_helpers/mock-portfolio-db.js` | Already exists, has write-spies + `assertNoWrites`, used by 25-03/25-08 |
| Canvas raster for jsPDF | install `canvas` native pkg | `getContext → null` stub | jsPDF only needs text metrics; the stub is the documented, working pattern |
| Deterministic PDF bytes | strip timestamps post-hoc | `setCreationDate`/`setFileId` pinning | Already the established determinism trick (TESTING.md) |
| Test discovery/runner | a framework (Jest/Vitest) | the existing Node loop + a `tests/run-all.js` glob | D-01 says drive the *same* files; a framework would rewrite 74 passing tests and add runtime deps |

**Key insight:** Phase 30 should add **one** new dependency (jsdom) and **one** new helper (the shared jsdom env); everything else reuses patterns and helpers already in the repo. The temptation to "modernize the harness" (a real test runner, coverage tooling) is explicitly deferred (CONTEXT Deferred Ideas) and would inflate scope and risk turning green tests red.

## Common Pitfalls

### Pitfall 1: The "safety net" that gives false confidence (the D-12 architect risk)
**What goes wrong:** Tests are written by slicing source and regex-matching internal function bodies (as `quick-260615` does). They pass today, but a Phase 31 rename/move makes them fail with **zero behavior change** — or worse, they keep passing while behavior silently breaks because they never executed the code.
**Why it happens:** the logic is trapped in a `DOMContentLoaded` IIFE and not exported, so slicing is the path of least resistance.
**How to avoid:** D-08 + D-09 — execute the real handlers under jsdom and assert on observable output. The architect pass (D-12) must specifically check that each TEST-03 test *executes* the module and would *fail if the observable output changed* (and would *pass* through an internal rename).
**Warning signs:** a test file that reads the asset with `fs.readFileSync` and never `eval`/`vm.runInContext`/jsdom-loads it; assertions referencing function names or `indexOf('function ')`.

### Pitfall 2: `getContext` console noise mistaken for failure
**What goes wrong:** The 7 tests print `Not implemented: HTMLCanvasElement's getContext()` repeatedly but **still exit 0**. A reviewer may think they failed.
**Why it happens:** jsdom routes unimplemented-API warnings to its virtual console; without the `getContext → null` stub the warning fires on every jsPDF text measure.
**How to avoid:** the shared helper's stub silences it (the reference test `quick-260620-q8m` is clean precisely because it stubs). Verify exit code, not stderr volume.

### Pitfall 3: Over-pinning the Node `engines` floor
**What goes wrong:** Setting `"node": ">=22"` blocks Sapir or CI on Node 20.
**Why it happens:** confusing "what we run" with "what we require."
**How to avoid:** the only hard requirement is native `Blob.prototype.arrayBuffer` → Node 18.0.0. Recommend `>=18.0.0` (see TEST-01). The team runs 22; that's fine and unaffected.

### Pitfall 4: Re-testing already-covered helpers (D-10 waste)
**What goes wrong:** "Go broad" is misread as "test every function," duplicating the 25-xx snippet/photo/backup coverage and inflating the phase by days.
**How to avoid:** the inventory's "Existing coverage" column is the authority — only the rows marked "NONE"/"shape-only" / "DO NOW" are net-new work.

## Code Examples

### RTL guard — exercise the real `App.setLanguage` across 4 locales (TEST-02)
```js
// Source: assets/app.js:116-126 (the real dir-applying code path)  [VERIFIED: codebase]
//   document.documentElement.setAttribute("dir", currentLang === "he" ? "rtl" : "ltr");
// App exposes { setLanguage, getLanguage } at assets/app.js:1346-1347.
// Load app.js into jsdom (or vm with a documentElement stub that records setAttribute),
// then:
for (const [lang, expected] of [['he','rtl'], ['en','ltr'], ['de','ltr'], ['cs','ltr']]) {
  win.App.setLanguage(lang);
  assert.strictEqual(
    win.document.documentElement.getAttribute('dir'), expected,
    `locale ${lang} must map to dir=${expected}`
  );
}
// FALSIFIABLE: if someone changes the condition to e.g. `currentLang !== 'en'`,
// the de/cs assertions flip to 'rtl' and FAIL. Mirrors tests/29-02 case 5 (db.js banner).
```

### Settings save/load round-trip (TEST-03, settings.js IIFE-1, jsdom-real-page)
```js
// Pattern 2 + mock-portfolio-db. Closes TESTING.md "What Is NOT Tested:
// Settings save/load round-trips in a real browser context."  [VERIFIED: settings.js:392,448,495,643]
const { createMockPortfolioDB } = require('./_helpers/mock-portfolio-db');
const mockDb = createMockPortfolioDB({ therapistSettings: [/* seeded section labels */] });
// jsdom: load settings.html body fragment, win.PortfolioDB = mockDb, win.App = appStub
// fire DOMContentLoaded (settings.js:643 handler runs loadAndRender)
// → edit a section-title input → click Save (onSave at :448)
assert.ok(mockDb.__calls.get('setTherapistSetting').length >= 1);   // persisted
// → re-run loadAndRender → assert the rendered input shows the saved value
// Asserts OBSERVABLE persistence, not which internal function wrote it (survives Phase 31).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `/tmp/node_modules/jsdom` + `JSDOM_PATH` env convention | `package.json` devDependency + `npm install` | Phase 30 (D-01) | jsdom becomes reproducibly installed; `npm test` runs everything |
| No `package.json` at all | First `package.json`, `private:true`, devDeps-only | Phase 30 | Reconciles "zero deps" (now scoped to production, D-02/D-03) |
| Source-slicing "behavior" tests for trapped IIFE logic | jsdom real-page execution (D-09) | Phase 30 | D-08-compliant net that survives the Phase 31 refactor |

**Deprecated/outdated after this phase:**
- The `JSDOM_PATH || '/tmp/node_modules/jsdom'` fallback line in the 7 PDF tests — replaced by `require('jsdom')` via the shared helper (node resolves it from the installed devDependency).

## TEST-01 — The 7 PDF tests, root causes, Node floor (VERIFIED by execution)

**The 7 currently-unrunnable tests** (verified: these are exactly the jsdom PDF tests that do NOT stub `getContext`; the 8th, `quick-260620-q8m`, already stubs it and is the reference template):
1. `tests/pdf-bold-rendering.test.js`
2. `tests/pdf-digit-order.test.js`
3. `tests/pdf-glyph-coverage.test.js`
4. `tests/pdf-latin-regression.test.js`
5. `tests/quick-260522-iwr-ordered-list-export.test.js`
6. `tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js`
7. `tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js`

(`tests/pdf-bidi.test.js` is a PDF test but does NOT use jsdom — it passed 12/12 standalone; not part of the 7.)

**Root cause (a) — `HTMLCanvasElement.getContext`:** Confirmed by execution: the 7 emit `Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package`. `grep -c getContext` = 0 in all 7; = 2 in the reference. **Fix:** the shared helper stubs `win.HTMLCanvasElement.prototype.getContext = () => null` (TESTING.md established pattern). [VERIFIED: ran all 8 on Node v22.20.0 + jsdom 29.1.1]

**Root cause (b) — `blob.arrayBuffer`:** Confirmed the tests call `await blob.arrayBuffer()` (`pdf-bold-rendering.test.js:289`, `quick-260608-c8x:233`). Native `Blob.prototype.arrayBuffer` exists since the global `Blob` landed in **Node 18.0.0** (verified locally: `typeof new Blob(['x']).arrayBuffer === 'function'` on v22). [VERIFIED: local node] Old Node (pre-18, or pre-15.7 `buffer.Blob`) lacked it → the documented failure.

**Recommended Node floor (D-05):**
```json
"engines": { "node": ">=18.0.0" }
```
Rationale: 18.0.0 is the exact version where native global `Blob`/`Blob.prototype.arrayBuffer` became available — the true technical minimum. Setting it here means the `blob.arrayBuffer` failure **cannot recur**. The team runs Node 22 and CI should too; `>=18` is the permissive floor that won't block contributors (Pitfall 3). [CITED: nodejs.org — global `Blob` stabilized in Node 18; ASSUMED-precise patch level, verified API presence locally] — if the planner wants a "still-in-support in mid-2026" floor instead, `>=20.0.0` is the conservative LTS alternative; either satisfies the API requirement.

**Shared helper adoption (D-04/D-06):** all 7 adopt `tests/_helpers/jsdom-pdf-env.js`. The 8th (`quick-260620-q8m`) is already green and may be migrated opportunistically only if it stays green.

## TEST-04 — package.json, runner, hook safety (VERIFIED)

**The new `package.json` (minimal, D-01/D-02):**
```json
{
  "private": true,
  "name": "sessions-garden",
  "version": "0.0.0",
  "description": "Dev/test workbench only — production ships static /assets/* with zero runtime deps.",
  "scripts": { "test": "node tests/run-all.js" },
  "devDependencies": { "jsdom": "^29.1.1" },
  "engines": { "node": ">=18.0.0" }
}
```

**`run-all.js` vs shell glob (Claude's discretion):**
- **Recommend `tests/run-all.js`** (small Node script: `fs.readdirSync('tests').filter(f=>f.endsWith('.test.js'))`, spawn each with `node`, aggregate exit codes, print a summary). Reasons: (1) cross-platform (Sapir on macOS, CI on Linux — a `for f in tests/*.test.js` shell glob is fine on both but a `.js` runner is the project's own idiom and avoids shell-quoting surprises); (2) it can set a default `JSDOM_PATH`-free environment and continue-on-failure to show ALL failures, not stop at the first; (3) it can exclude `_helpers/`. A shell glob (`"test": "for f in tests/*.test.js; do node \"$f\" || fail=1; done; exit $fail"`) is acceptable but stops aggregation logic in the JSON string. The architect pass should confirm the runner preserves the per-file `exit 0/1` contract and **fails the suite if any file fails**.

**Production stays zero-runtime-dep (D-02/D-03):** Verified — Cloudflare Pages serves the repo's static files; `node_modules/` is gitignored and never built/deployed. No `assets/*.js` imports anything from `node_modules`. The ~50KB production identity is untouched.

**Pre-commit hook safety (VERIFIED):** The hook (`.git/hooks/pre-commit`) auto-bumps `sw.js` `CACHE_NAME` **only** when a staged file matches `assets/*`, `*.html`, or `manifest.json`. The new files — `package.json` (root), `tests/**`, `.gitignore` — match **none** of those patterns, so adding test infra **does not trigger a bump and does not disturb** the version machinery. [VERIFIED: read the hook + pattern logic, 2026-06-26]. Caveat unchanged from `reference-pre-commit-sw-bump.md`: if a Phase 30 change ever edits a precached `assets/*` file, the normal bump applies — but Phase 30 changes **no** `assets/*` production file (it only adds tests + root config), so no bump is expected at all.

**`.gitignore`:** already contains `node_modules/` (verified) — D-01's gitignore requirement is effectively pre-satisfied; just confirm.

## Validation Architecture

> nyquist_validation treated as enabled (no explicit `false` found). Each requirement below names the falsifiable behavior test(s) that prove it — FAIL before / PASS after, per `feedback-behavior-verification`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test loop + `assert` (no Jest/Vitest) + `node:vm` + jsdom 29.1.1 |
| Config file | none → `package.json` introduced this phase (Wave 0) |
| Quick run command | `node tests/<file>.test.js` (single file) |
| Full suite command | `npm test` (→ `node tests/run-all.js`) — NEW this phase |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | 7 PDF tests run green via the shared helper; `getContext` stubbed; `blob.arrayBuffer` works | jsdom integration | `npm test` (runs the 7) | ✅ tests exist; ❌ shared helper `tests/_helpers/jsdom-pdf-env.js` (Wave 0) |
| TEST-02 | `App.setLanguage('he')→dir=rtl`; `en/de/cs→ltr`; FAILS if rtl on non-Hebrew | jsdom/vm behavior | `node tests/30-rtl-guard.test.js` | ❌ Wave 0 |
| TEST-03a | settings.js section-title **save→reload round-trip** persists & renders | jsdom real-page | `node tests/30-settings-section-roundtrip.test.js` | ❌ Wave 0 (closes the documented gap) |
| TEST-03b | settings.js tab nav: `?tab=` selects active tab; invalid falls back | vm/jsdom | `node tests/30-settings-tabnav.test.js` | ❌ Wave 0 |
| TEST-03c | add-session.js `buildSessionMarkdown`/`buildFilteredSessionMarkdown` emit correct sections/order/labels (EXECUTED, not sliced) | jsdom real-page | `node tests/30-export-markdown.test.js` | ❌ Wave 0 (replaces source-slicing) |
| TEST-03d | add-session.js export stepper: active-step 1→2→3, preview updates with toggles | jsdom real-page | `node tests/30-export-stepper.test.js` | ❌ Wave 0 |
| TEST-03e | add-session.js issue severity **delta** + payload shape + empty-validation | vm/jsdom | `node tests/30-issue-delta.test.js` | ❌ Wave 0 |
| TEST-04 | `npm test` runs all `tests/*.test.js`, fails if any file exits non-zero | meta/runner | `npm test` | ❌ Wave 0 (`run-all.js` + `package.json`) |

### Sampling Rate
- **Per task commit:** the single new/affected `node tests/<file>.test.js`.
- **Per wave merge:** `npm test` (full suite) green.
- **Phase gate:** full suite green before `/gsd-verify-work`; this green suite is the Phase 31 guardrail.

### Wave 0 Gaps
- [ ] `package.json` (private, devDeps={jsdom}, engines `>=18`, `test` script) — TEST-04
- [ ] `tests/run-all.js` — suite runner (continue-on-fail, aggregate exit) — TEST-04
- [ ] `tests/_helpers/jsdom-pdf-env.js` — shared jsdom env (getContext→null + det. pinning) — TEST-01
- [ ] `tests/_helpers/app-stub.js` (new) — `App.*` stub surface for the real-page god-module tests (App.t, getSectionLabel, showToast, getSeverityValue, formatDate, initCommon, installNavGuard, isSectionEnabled, createSeverityScale, …) — TEST-03
- [ ] HTML fixtures: reuse `settings.html` / `add-session.html` bodies directly (no new fixture files needed — they exist at 347 / 612 lines)
- [ ] Confirm `.gitignore` has `node_modules/` (already present — verify only)
- [ ] Framework install: `npm install` (jsdom) — once

## Security Domain

> `security_enforcement` assumed enabled. This phase changes **no production behavior** and ships **no runtime code** — security surface is minimal but two items apply.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture (supply chain) | yes | One devDependency (jsdom); legitimacy audited above; `node_modules` never deployed |
| V5 Input Validation | no (no new runtime input) | — (tests assert existing validators; they don't add input paths) |
| V6 Cryptography | no | — (backup AES path untouched) |
| V14 Configuration | yes | `private:true`, devDeps-only, `engines` floor; production bundle unchanged |

### Known Threat Patterns for this phase
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious/typo-squatted devDependency | Tampering | Only `jsdom` (audited OK, no postinstall); pin `^29.1.1`; review lockfile |
| Test infra accidentally shipped to prod | Information disclosure / bloat | `node_modules` gitignored; Cloudflare serves static `/assets/*` only; verify deploy excludes it |
| Supply-chain via transitive deps of jsdom | Tampering | jsdom's tree is well-known; `npm audit` in CI; devDeps never reach the customer (D-02) |

No new production attack surface is introduced. The licensing/CSP/`innerHTML` concerns in CONCERNS.md are explicitly OUT of Phase 30 (D-14) and routed to backlog.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | entire harness | ✓ | v22.20.0 (≥18 floor) | — |
| npm | install jsdom, `npm test` | ✓ | bundled w/ Node 22 | — |
| jsdom | PDF tests + god-module real-page tests | ✓ (verified installable) | 29.1.1 | — (it's the point of D-01) |
| `assets/fonts/heebo-base64.js`, `jspdf.min.js`, `bidi.min.js` | PDF test font/render | ✓ | in-repo | — |
| `settings.html`, `add-session.html` | jsdom real-page fixtures | ✓ | in-repo (347 / 612 lines) | — |

**Missing dependencies with no fallback:** none.
**Missing with fallback:** none — every input the phase needs is present or trivially installable.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Node `>=18.0.0` is the exact floor for native `Blob.prototype.arrayBuffer` | TEST-01 / D-05 | Low — API presence verified locally on 22; if 18 ever lacked it on some platform, bump to `>=20`. Floor only needs to be *at least* high enough. |
| A2 | The `App.*` stub surface (~12 methods) is sufficient for add-session real-page tests | God-Module Inventory B / D-09 | Med — if a handler calls an un-stubbed `App.*`, the test throws; mechanical to fix during planning/execution. Grep-derived list is in §Add-session deps. |
| A3 | Combined TEST-03 effort ≈ 4–6 working days | Inventory effort estimates | Med — it's a right-sizing estimate (D-10), not a guarantee; the `App`-stub + harness build is the swing factor. Surfaced precisely so Ben can right-size at plan time. |
| A4 | `run-all.js` is preferable to a shell glob | TEST-04 | Low — either works; this is a discretion call, architect pass can overturn. |

**Everything else in this document was VERIFIED** by reading the code and/or executing the tests on Node v22.20.0 with jsdom 29.1.1 on 2026-06-26.

## Open Questions

1. **How wide should the `__addSessionTestHooks` export surface get?**
   - What we know: only `computeGrowHeight` is exported today; the markdown builders + export functions are trapped in the IIFE.
   - What's unclear: whether to (a) widen the test-hook surface (benign, non-behavioral, easier tests) or (b) drive everything purely through DOM events (most faithful, heavier).
   - Recommendation: (a) for the markdown builders, (b) for the stepper state machine. The architect pass (D-12) should ratify, since widening exports slightly increases the public surface Phase 31 must preserve.

2. **Does CI need to run jsdom tests, or just local?**
   - What we know: no CI config was found in the repo for tests (the pre-commit hook only bumps `sw.js`).
   - Recommendation: out of scope for Phase 30's requirements (TEST-04 is "single documented command," satisfied by `npm test`); note as a possible Phase 32 README item.

## Sources

### Primary (HIGH confidence — verified this session)
- Direct codebase inspection of `assets/settings.js`, `assets/add-session.js`, `assets/app.js`, `.git/hooks/pre-commit`, `.gitignore`, all `tests/` — 2026-06-26
- Execution of all 8 jsdom PDF tests on Node v22.20.0 + jsdom 29.1.1 (exit codes, `getContext` warnings, `grep -c getContext`) — authoritative for the "7 tests" identification and both root causes
- `npm view jsdom version / dist-tags.latest / scripts.postinstall` — legitimacy audit
- Local `node -e` check of `Blob.prototype.arrayBuffer`
- `.planning/codebase/TESTING.md`, `.planning/codebase/CONCERNS.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/phases/30-test-harness-coverage/30-CONTEXT.md`

### Secondary (MEDIUM confidence)
- nodejs.org Blob/global-Blob availability (Node 18.0.0) — API presence cross-verified locally

### Tertiary (LOW confidence)
- none material

## Metadata

**Confidence breakdown:**
- TEST-01 (7 tests, root causes, Node floor): **HIGH** — identified and reproduced by execution.
- TEST-02 (RTL code path): **HIGH** — exact code path + export surface verified in app.js.
- TEST-03 inventory (what to test, tiers, coverage cross-check): **HIGH** for the map/coverage; **MEDIUM** for effort-day estimates (inherently estimative, flagged A3).
- TEST-04 (package.json, runner, hook safety): **HIGH** — hook logic and gitignore verified.
- D-09 feasibility: **HIGH** — dependency surfaces grepped; mock-portfolio-db confirmed sufficient for the settings round-trip.

**Research date:** 2026-06-26
**Valid until:** ~2026-07-26 (stable; the only fast-moving fact is jsdom's latest version — pin `^29.1.1`).
