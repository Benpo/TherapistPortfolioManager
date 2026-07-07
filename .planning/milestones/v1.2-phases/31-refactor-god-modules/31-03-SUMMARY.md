---
phase: 31-refactor-god-modules
plan: 03
subsystem: settings-ui
tags: [god-module-extraction, behavior-preserving-move, settings-snippets, RFCT-01, RFCT-03, test-shape-coupling, identity-handler-selection, service-worker-precache]

# Dependency graph
requires:
  - phase: 31-refactor-god-modules
    provides: "plan 31-01 (openDB pooling) + 31-02 (i18n innerHTML hardening) landed; settings.js god-module ready for first IIFE extraction (D-07 order: Snippets FIRST)"
  - phase: 30-decompose-god-modules
    provides: "jsdom real-page characterization pattern + tests/_helpers/app-stub.js + mock-portfolio-db.js; the win.eval(readAsset()) / vm.runInContext loader idiom the snippet tests use"
provides:
  - "assets/settings-snippets.js — the SnippetsUI page-private IIFE (editor + tag-chip autocomplete, list + filter chips, import/export + collision modal, 8 validators), extracted verbatim from settings.js:712-2018"
  - "window.__SnippetEditorHelpers test hook now resolves from settings-snippets.js (moved byte-for-byte, formerly settings.js:863) — leaf-helper tests 24-05/quick-* pass through the hook"
  - "settings.js slimmed to section-titles / tab-nav / backups / photos (4 DOMContentLoaded handlers, was 5)"
  - "settings.html loads settings-snippets.js after snippets.js, before settings.js (no defer); sw.js PRECACHE_URLS includes /assets/settings-snippets.js"
  - "extraction-robust test-loader pattern: snippets boot captured by +1 handler delta; sibling settings.js loaders select handlers by stable identity (count/index-INDEPENDENT) so they survive the later Photos 4->3 drift in plan 04"
affects: [31-04, 31-05, 31-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Behavior-preserving god-module extraction: relocate a self-contained IIFE byte-for-byte into a new page-private file, preserve its window.__* test hook exactly, keep it an anonymous DOMContentLoaded IIFE (no new public global)"
    - "Wiring an extracted asset: <script src> in dependency order (after the window.* providers, before the consumer, matching the consumer's sync/defer timing) + a PRECACHE_URLS entry; CACHE_NAME/version bump deferred to a consolidated chore"
    - "Extraction-robust handler capture: snapshot captured.length, eval the new file, assert a +1 delta, select captured[last] — no fixed count or positional index"
    - "Identity-based handler selection: filter captured handlers by a stable source/name token (App.initCommon / settings-tabs tablist / fn.name === bindBackupsTab|bindPhotosTab) asserting exactly-one match — replaces brittle captured.length===N + captured[index] coupling that breaks on every extraction"
    - "vm.runInContext loader repoint: eval the extracted file's source into the SAME sandbox before the origin file so a moved window.__* hook still resolves"

key-files:
  created:
    - assets/settings-snippets.js
  modified:
    - assets/settings.js
    - settings.html
    - sw.js
    - tests/30-snippet-wiring.test.js
    - tests/30-snippet-import-merge.test.js
    - tests/30-settings-save-failed-toast.test.js
    - tests/30-settings-saved-notice.test.js
    - tests/30-settings-section-roundtrip.test.js
    - tests/30-settings-tabnav.test.js
    - tests/30-backups-helper-gate.test.js
    - tests/30-photos-optimize-loop.test.js
    - tests/24-05-import-validator.test.js
    - tests/24-05-list-filter.test.js
    - tests/24-05-modified-seed.test.js
    - tests/24-05-trigger-dedupe.test.js
    - tests/quick-260619-okw-cross-lang-warning.test.js
    - tests/quick-260619-okw-trigger-unicode.test.js
    - tests/quick-260620-p3f-pending-tag-commit.test.js
    - tests/quick-260626-h5j-trigger-autoconvert.test.js

key-decisions:
  - "Moved the SnippetsUI IIFE strictly VERBATIM (settings.js:690-2018 incl. its doc-comment header) and deferred ALL optional RFCT-03 cleanups (D-04 glue dedup, var->const, comment rewrites, catch console.warn) — the orchestrator's explicit VERBATIM directive + D-02 behavior-preserving-MOVE made byte-for-byte relocation the lowest-risk path; the local t()/getCurrentLang()/showToast() glue wrappers travelled with the IIFE unchanged"
  - "Snippets boot captured by an extraction-robust +1 delta (beforeSnip snapshot -> eval settings-snippets.js -> assert delta===1 -> captured[last]) instead of captured.length===5 + captured[1] — survives the later Photos 4->3 drift in plan 04 without re-edit"
  - "The 6 count/index-coupled sibling loaders rewritten to select by stable IDENTITY asserting exactly-one match (fields=App.initCommon source token; tab-nav=settings-tabs[role=tablist] source token; backups=fn.name bindBackupsTab; photos=fn.name bindPhotosTab) — NO hardcoded replacement count (never !== 4), so they are immune to an arbitrary number of future extractions"
  - "30-photos-optimize-loop selects the photos handler by bindPhotosTab identity and exposes it as ctx.photosBoot (replacing ctx.captured[4]()); it still reads __PhotosTabHelpers from settings.js (photos region not extracted until plan 04) so it loads ONLY settings.js this plan"
  - "Stale doc-comment references to the old captured[N] / 5-handler model were rewritten in the touched test headers so the comments match the new identity/delta selection (avoids future-reader confusion and satisfies the no-positional-selector gate)"

# Metrics
metrics:
  duration: ~35min
  tasks: 3
  files_changed: 20
  completed: 2026-06-28

status: complete
---

# Phase 31 Plan 03: Extract SnippetsUI to settings-snippets.js Summary

RFCT-01 extraction 1 of 3 (D-07 order: Snippets FIRST) — the self-contained SnippetsUI IIFE (~1,300 lines: modal editor + tag-chip autocomplete, list + search/tag/origin filters, import/export + collision modal, 8 validators) was moved byte-for-byte out of the `settings.js` god-module into a new page-private file `assets/settings-snippets.js`, with its `window.__SnippetEditorHelpers` test hook preserved exactly. The file was wired into `settings.html` (dependency order, no defer) and `sw.js` PRECACHE_URLS, and every structure-coupled snippet/settings test loader was repointed to an extraction-robust shape so the full suite stays green now AND through the later Photos extraction.

## What was built

**Task 1 — verbatim extraction (commit 0d088c7).** Extracted `settings.js:690-2018` (the snippet doc-comment header + the anonymous `DOMContentLoaded` IIFE) byte-for-byte into `assets/settings-snippets.js` (1,329 lines), then deleted that region from `settings.js` (2,969 -> 1,639 lines). The `window.__SnippetEditorHelpers = {...}` live assignment (formerly `settings.js:863`) and its `typeof window !== "undefined"` guard travelled intact. The new file stays an anonymous IIFE — no new public global. `settings.js` retains section-titles, tab-nav, backups, and photos (the photos region moves in plan 04). Both files parse via `vm.Script`.

**Task 2 — wiring (commit 5635433).** Added `<script src="./assets/settings-snippets.js"></script>` between `snippets.js` (defer) and `settings.js` in `settings.html` (no defer, matching settings.js sync timing so the snippet IIFE boots in the same DOMContentLoaded pass after App/PortfolioDB/Snippets/SNIPPETS_SEED register). Added `'/assets/settings-snippets.js'` to `sw.js` PRECACHE_URLS after the `settings.js` entry. CACHE_NAME/version bump intentionally NOT done here (deferred to the consolidated plan-06 chore; CACHE_NAME is derived from INTEGRITY_TOKEN, so the pre-commit auto-bump hook is a no-op anyway).

**Task 3 — test-loader repoint (commit 7c3ba29).** Three structure-coupling mechanisms handled:
1. **Hook relocation (8 vm.runInContext tests):** `24-05-import-validator/list-filter/modified-seed/trigger-dedupe` + `quick-260619-okw-cross-lang-warning/trigger-unicode` + `quick-260620-p3f-pending-tag-commit` + `quick-260626-h5j-trigger-autoconvert` now read & eval `settings-snippets.js` into the same sandbox BEFORE `settings.js` (the `__SnippetEditorHelpers` hook moved there).
2. **Boot-handler delta (2 tests):** `30-snippet-wiring` + `30-snippet-import-merge` capture the snippets boot via a `+1` handler delta and `captured[last]` instead of `captured.length===5` + `captured[1]`.
3. **Count/index siblings (6 tests):** `30-settings-saved-notice/save-failed-toast/section-roundtrip` (fields = `App.initCommon`), `30-settings-tabnav` (tab-nav = `settings-tabs[role="tablist"]`), `30-backups-helper-gate` (`fn.name === 'bindBackupsTab'`), `30-photos-optimize-loop` (`fn.name === 'bindPhotosTab'`) now select their target handler by stable identity asserting exactly-one match — count/index-INDEPENDENT, no hardcoded `!== 4`.

## Verification evidence

- `npm test` -> **106 passed, 0 failed, 106 total** (was 90/16 immediately after Tasks 1-2).
- All three mandatory enumeration gates run:
  - ENUM `captured.length|captured[`: only single-handler add-session/sessions tests (`!== 1` guards) still use `captured[0]` — none are settings.js loaders, correctly left unchanged.
  - ENUM static `readFileSync ... settings.js`: the 24-05/quick reads are read-then-eval runtime loaders, NOT static assertions on moved symbols; no `.match/.test/.includes/.indexOf/.slice` on a moved snippet symbol — zero static-audit repoints needed (snippet symbols are runtime-only).
  - ENUM settings.js loaders cross-referenced — all 16 failing files were exactly the plan's `files_modified` set; no surprise class.
- `grep 'openEditor|handleSave|renderSnippetList' assets/settings.js` -> NONE (snippet live code fully removed).
- `grep 'window.__SnippetEditorHelpers = {' assets/settings-snippets.js` -> line 174 (hook present); no `window.SettingsSnippets`/public global.
- `grep 'settings-snippets.js' settings.html sw.js` -> one `<script>` tag (line 342) + one PRECACHE entry (line 68).
- settings.js DOMContentLoaded handlers after extraction: 4 (fields :643, tab-nav :781, bindBackupsTab :1012, bindPhotosTab :1619) — identity tokens confirmed unique.

## Deviations from Plan

### RFCT-03 cleanups intentionally deferred (not auto-fixed)

The plan's Task 1 offered OPTIONAL RFCT-03 cleanups within the moved region (D-04 glue dedup to App.t/App.showToast/App.getLanguage, var->const/let, archaeology-comment rewrites, tagged console.warn on silent catches). The orchestrator's spawn directive was explicit: "Move the SnippetsUI IIFE VERBATIM ... do not refactor logic while moving." Honoring that (and D-02 behavior-preserving-MOVE + the D-04 "revert any divergent replacement" guidance), the IIFE was relocated byte-for-byte and ALL cleanups were skipped. The local `t()`/`getCurrentLang()`/`showToast()` glue wrappers remain in `settings-snippets.js` unchanged. This is a conservative scope choice, not a bug — the cleanups can be done as a follow-up if desired; nothing about correctness, security, or the green suite depends on them.

### No Rule 1-3 auto-fixes triggered

The extraction was clean — no bugs, missing functionality, or blocking issues discovered. No architectural (Rule 4) decisions arose.

## Known Stubs

None. No placeholder/empty-value stubs introduced; this is a relocation of working code.

## Notes for downstream plans

- **Plan 04 (Photos)** will drift the settings.js handler count 4 -> 3. The 6 sibling loaders rewritten here are already count/index-INDEPENDENT (identity selection), so they should NOT need re-edit — only the photos-specific tests that move with the Photos IIFE will need a settings-photos.js loader. `30-photos-optimize-loop` currently loads only settings.js and reads `__PhotosTabHelpers` from it; plan 04 must add a settings-photos.js loader there once the hook moves.
- **Plan 06** owns the single consolidated CACHE_NAME/APP_VERSION bump after all three extractions (Snippets/Photos/export-modal) land.

## Self-Check: PASSED

- assets/settings-snippets.js — FOUND
- Commit 0d088c7 (Task 1) — FOUND
- Commit 5635433 (Task 2) — FOUND
- Commit 7c3ba29 (Task 3) — FOUND
