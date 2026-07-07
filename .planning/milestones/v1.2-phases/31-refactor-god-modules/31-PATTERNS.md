# Phase 31: Refactor God Modules - Pattern Map

**Mapped:** 2026-06-27
**Files analyzed:** 6 (3 new, 3 wiring/touched)
**Analogs found:** 6 / 6 (all in-repo — this is a behavior-preserving move, so analogs are exact)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `assets/settings-snippets.js` (NEW — was `settings.js` 712–2018) | page-module (UI controller) | CRUD over snippets store + DOM events | `assets/snippets.js` (engine IIFE) + the source IIFE itself | exact (in-place move) |
| `assets/settings-photos.js` (NEW — was `settings.js` 2370–2969, TWO IIFEs) | page-module (UI controller) | batch/transform (optimize loop) + IndexedDB read | the two source IIFEs themselves; analog `assets/snippets.js` | exact (in-place move) |
| `assets/export-modal.js` (NEW — was `add-session.js` ~730–1835) | page-module (stepper/builders) | transform (markdown/PDF) + request closure state | **no clean in-repo analog** — closest is the `Snippets`/`App` IIFE factory; needs context-injection (RESEARCH Pattern 2) | partial (no existing init(ctx) handshake exists) |
| `settings.html` / `add-session.html` | wiring (`<script src>`) | load-order | existing ordered block in same files | exact |
| `sw.js` `PRECACHE_URLS` | config (precache manifest) | static list | existing 51-entry array | exact |
| `tests/*.test.js` loaders | test | eval-by-filename | existing `win.eval(readAsset(...))` lines | exact |

## Pattern Assignments

### `assets/settings-snippets.js` (page-module, CRUD)

**Analog:** the source IIFE `settings.js:712–2018` itself (move verbatim). Structural template for a standalone page-private IIFE: `assets/snippets.js:22` (the engine) and the source IIFE wrapper.

**IIFE wrapper + cross-IIFE dependency doc comment** (`settings.js:698–713`) — preserve this header comment block verbatim; it documents the `window.*` resolution chain the new file depends on:
```javascript
// Cross-IIFE identifier-resolution chain (per .continue-here.md):
//   window.App.{getSnippets, refreshSnippetCache, t, showToast, confirmDialog,
//               getLanguage, initCommon}     — set by assets/app.js IIFE
//   window.PortfolioDB.{getSnippet, addSnippet, updateSnippet, ...}  — db.js
//   window.Snippets.{getPrefix, setPrefix}    — set by assets/snippets.js IIFE
//   window.SNIPPETS_SEED                      — set by assets/snippets-seed.js IIFE
(function () {
  "use strict";
```
This is an **anonymous `DOMContentLoaded` IIFE** (NOT `window.SettingsPage = (function(){...})`). Note IIFE-1 at `settings.js:14` IS named (`window.SettingsPage`); the snippet IIFE is anonymous. Keep it anonymous.

**Test hook to preserve EXACTLY** (`settings.js:861–874`) — move byte-for-byte; the net asserts behavior through this:
```javascript
// Expose for unit tests (mirrors Snippets.__testExports at snippets.js:457).
if (typeof window !== "undefined") {
  window.__SnippetEditorHelpers = {
    isTriggerUnique, validateImportPayload, detectImportCollisions,
    filterSnippetList, isModifiedSeed, isValidTrigger, hyphenateSpaces,
    getCrossLangWarning, pendingTagToCommit, commitPendingTag,
  };
```
(CONTEXT cites the hook at `:717` — that is the comment; the live assignment is **`:863`**, per RESEARCH drift correction.)

**Glue wrappers to consolidate (D-04)** (`settings.js:937–967`) — these LOCAL wrappers are the dedup target. Replace calls with `App.t` / `App.showToast` / `App.getLanguage` during the move; if the suite goes red on any, keep that wrapper and note it:
```javascript
function t(key) {
  return window.App && typeof window.App.t === "function" ? window.App.t(key) : key;
}
function getCurrentLang() {
  if (window.App && typeof window.App.getLanguage === "function") return window.App.getLanguage();
  return localStorage.getItem("portfolioLang") || "en";
}
function showToast(messageKey) {
  if (window.App && typeof window.App.showToast === "function") window.App.showToast("", messageKey);
}
```

**Shared `$` helper** (`settings.js:973`): `function $(id) { return document.getElementById(id); }` — each IIFE has its own copy. The new file keeps its own copy (planner discretion D, keep behavior identical).

---

### `assets/settings-photos.js` (page-module, batch/transform) — TWO coupled IIFEs

**Analog:** the two source IIFEs `settings.js:2370–2571` (helpers) and `settings.js:2585–2969` (UI). **They MUST move together, helpers IIFE FIRST.**

**IIFE-5a (helpers) registers the hook the UI IIFE reads** (`settings.js:2543–2571`):
```javascript
// Expose for unit tests (mirrors __SnippetEditorHelpers at settings.js:762).
if (typeof window !== 'undefined') {
  window.__PhotosTabHelpers = {
    _deleteAllPhotosLoop, _optimizeAllPhotosLoop, humanBytes,
    dataURLToBlob, blobToDataURL, estimatePhotoSavings,
    PHOTO_OPTIMIZED_BYTES_THRESHOLD, ESTIMATE_DISPLAY_FLOOR_BYTES,
    OPTIMIZE_RECOMMEND_THRESHOLD_BYTES,
  };
}
// Task 2 (UI wiring) is appended below this IIFE.
})();
```

**IIFE-5b (UI) reads `window.__PhotosTabHelpers`** — the coupling that forces same-file, ordered move (`settings.js:2585–2588`):
```javascript
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function tt(key, fallback) {
    if (typeof App !== 'undefined' && typeof App.t === 'function') { ... }
```
**Planner note:** keep the helpers IIFE physically above the UI IIFE in the new file, and keep the blank-line/comment separator between them. The UI IIFE reads the hook the helpers IIFE assigned on `window` at eval time.

---

### `assets/export-modal.js` (page-module, transform) — closure-coupled, NO clean analog

**Analog:** none in-repo does an `init(ctx)` accessor handshake. Closest structural references:
- The page-private anonymous IIFE shape: `assets/snippets.js:22`, the photos IIFEs above.
- The existing `window.__*` private-hook convention: `add-session.js:37–42` (shows the `Object.assign(window.__addSessionTestHooks || {}, {...})` guarded-assignment idiom).

**Why no cut-paste:** the export region (builders at `add-session.js:776`, `1078`; handlers `1220–1801`) is nested inside the single `DOMContentLoaded` closure and captures ~10 closure-locals declared at `add-session.js:76–104` + `getIssuesPayload` at `:662`. Counts in the 765–1835 region: `sessionDate`×19, `editingSession`×15, `clientSelect`×7, `insightsInput`×6, `customerSummaryInput`×6, `sessionId`×4, `getIssuesPayload`×3, `submitButton`×2, `lastSavedSnapshot`×1, `isReadMode`×1.

**Closure-local declarations that must be threaded** (`add-session.js:76–104`):
```javascript
const clientSelect = document.getElementById("clientSelect");
const sessionDate = document.getElementById("sessionDate");
const insightsInput = document.getElementById("sessionInsights");
const customerSummaryInput = document.getElementById("customerSummary");
const submitButton = sessionForm ? sessionForm.querySelector("button[type='submit']") : null;
const sessionId = sessionIdParam ? Number.parseInt(sessionIdParam, 10) : null;
let editingSession = null;   // MUTABLE — must thread via accessor, never re-read
let isReadMode = false;      // MUTABLE
let lastSavedSnapshot = null;// MUTABLE
```

**Builder entry point to move** (`add-session.js:776` + helper `:772`):
```javascript
function stripRequired(label) { return label.replace(/\s*\*$/, ""); }
function buildSessionMarkdown() {
  const beforeLabel = App.t("session.copy.scale.before"); // already delegates to App.* — no glue dedup needed here
  ...
}
```

**Required new pattern — context-injection (RESEARCH Pattern 2):** DOM els may be re-`getElementById`'d in the new file; **mutable JS state (`editingSession`/`isReadMode`/`sessionId`/`lastSavedSnapshot`) MUST be passed as accessor closures.** Template:
```javascript
// assets/export-modal.js — page-private; ONE private handshake global, no public API
(function () {
  function initExportModal(ctx) {
    // ctx = { getEditingSession, getSessionId, isReadMode, getIssuesPayload,
    //         els: { sessionDate, clientSelect, insightsInput, customerSummaryInput } }
  }
  window.__exportModalInit = initExportModal;   // internal handshake only — NOT a feature API
})();

// in add-session.js DOMContentLoaded, where it currently wires copy/exportSessionBtn:
window.__exportModalInit({
  getEditingSession: () => editingSession,
  getSessionId: () => sessionId,
  isReadMode: () => isReadMode,
  getIssuesPayload,
  els: { sessionDate, clientSelect, insightsInput, customerSummaryInput },
});
```
**Load order:** `export-modal.js` must eval BEFORE `add-session.js` calls `__exportModalInit` (so the global exists). The export fns are NOT on `__addSessionTestHooks` — tests drive them via real `.click()` on `copySessionBtn`/`exportSessionBtn` (`add-session.js:94–95`), so unbound buttons fail loudly.

---

## Shared Patterns

### Wiring — ordered `<script src>` block
**Source:** `settings.html:312–342`, `add-session.html:586–607`
**Apply to:** all 3 new files. New tags slot AFTER the dependency chain (`app.js`, `db.js`, `snippets.js`, `snippets-seed.js`) loads.

settings.html — new tags go between `snippets.js` (`:341`) and `settings.js` (`:342`):
```html
  <script src="./assets/snippets.js" defer></script>
  <!-- NEW: settings-snippets.js, settings-photos.js here -->
  <script src="./assets/settings.js"></script>
```
add-session.html — `export-modal.js` goes immediately BEFORE `add-session.js` (`:607`):
```html
  <script src="./assets/pdf-export.js"></script>
  <!-- NEW: export-modal.js here (before add-session.js so __exportModalInit exists) -->
  <script src="./assets/add-session.js"></script>
```

### Service-worker precache (config)
**Source:** `sw.js:26–75` (`PRECACHE_URLS`, currently 51 `assets/` entries — RESEARCH count; CONTEXT said 39, the higher count is current)
**Apply to:** add 3 new leading-slash entries (e.g. after `:67` `/assets/settings.js`):
```javascript
const PRECACHE_URLS = [
  ...
  '/assets/settings.js',
  '/assets/settings-snippets.js',   // NEW
  '/assets/settings-photos.js',     // NEW
  '/assets/export-modal.js',        // NEW
  ...
];
```
**Gotcha (`reference-pre-commit-sw-bump`):** the pre-commit hook SKIPS the `CACHE_NAME` bump when `sw.js` is in the diff (`CACHE_NAME` at `sw.js:19`). A `PRECACHE_URLS` edit needs a manual chore/version-bump follow-up commit.

### Test-loader update (mandatory companion to every extraction)
**Source:** `tests/30-snippet-wiring.test.js:123`, `30-export-markdown.test.js:132`, `30-export-stepper.test.js:146`
**Apply to:** every test that evals an origin file must ALSO eval the new file, in dependency order. Template line:
```javascript
win.eval(readAsset('assets/settings.js'));
// becomes:
win.eval(readAsset('assets/settings-snippets.js'));  // new file BEFORE consumer
win.eval(readAsset('assets/settings.js'));
```
For export: eval `export-modal.js` BEFORE `add-session.js` (`30-export-*` tests). Enumerate loaders with `grep -rl "assets/settings.js" tests/*.test.js` (30) and `grep -rl "assets/add-session.js" tests/*.test.js` (14) — only the `win.eval(readAsset(...))` lines matter, not comment mentions. **Watch the handler-count guard** at `30-snippet-wiring.test.js:125` (`captured.length !== 5`): moving the snippet IIFE out of `settings.js` drops `settings.js`'s DOMContentLoaded-handler count — this assertion will need updating to match the new split.

### Test hook + private-global guard idiom (for `export-modal.js`)
**Source:** `add-session.js:37–42`
```javascript
if (typeof window !== "undefined") {
  window.__addSessionTestHooks = Object.assign(window.__addSessionTestHooks || {}, { computeGrowHeight });
}
```
Use the same `typeof window !== "undefined"` guard for the `window.__exportModalInit` private handshake so vm-sandbox eval stays safe.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `assets/export-modal.js` (the `init(ctx)` handshake specifically) | page-module | transform + injected state | No existing module receives state via an accessor/`init(ctx)` handshake; every current IIFE is either self-contained (`snippets.js`, photos) or reads globals directly. Planner must build the context-injection mechanic from RESEARCH Pattern 2 (template above) — it is genuinely new structure, the only invented pattern in this phase. |

## Metadata

**Analog search scope:** `assets/*.js`, `settings.html`, `add-session.html`, `sw.js`, `tests/30-*.test.js`
**Files scanned:** 9
**Pattern extraction date:** 2026-06-27
