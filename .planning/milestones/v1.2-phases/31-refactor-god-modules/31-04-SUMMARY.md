---
phase: 31-refactor-god-modules
plan: 04
subsystem: settings-ui
tags: [god-module-extraction, behavior-preserving-move, settings-photos, RFCT-01, RFCT-03, test-shape-coupling, identity-handler-selection, service-worker-precache, coupled-iife-pair]

# Dependency graph
requires:
  - phase: 31-refactor-god-modules
    provides: "plan 31-03 (SnippetsUI extraction) landed; settings.js slimmed 2969->1639, DOMContentLoaded handlers down to 4, sibling loaders already made identity-based so they survive the Photos 4->3 drift"
  - phase: 25-photos-tab
    provides: "the two coupled Photos IIFEs (__PhotosTabHelpers helpers + UI wiring) and their protective test suite (25-07/25-08/25-11/25-12 photos)"
provides:
  - "assets/settings-photos.js — the Photos/StorageUsage page-private unit: TWO coupled anonymous DOMContentLoaded IIFEs (helpers IIFE FIRST sets window.__PhotosTabHelpers; UI IIFE below reads it, registers bindPhotosTab), extracted byte-for-byte from settings.js:1016-1639"
  - "window.__PhotosTabHelpers + window.__photosOptimizeResultTimer test hooks now resolve from settings-photos.js (moved verbatim) — no new public global"
  - "settings.js slimmed to section-titles / tab-nav / backups (3 DOMContentLoaded handlers, was 4)"
  - "settings.html loads settings-photos.js after settings-snippets.js, before settings.js (no defer); sw.js PRECACHE_URLS includes /assets/settings-photos.js"
affects: [31-05, 31-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coupled-IIFE-pair extraction: when a hook-producer IIFE (sets window.__X) and a hook-consumer IIFE (reads window.__X) are coupled, move BOTH together into one file keeping the producer physically FIRST so the synchronous eval-time assignment precedes the read"
    - "Behavior-preserving move under three test-coupling mechanisms: (1) runtime vm.runInContext loaders — eval the moved file into the SAME sandbox; (2) source-slice assertions — repoint match/indexOf/slice of a moved symbol to the new file's source; (3) pure-static presence audits — repoint positive checks to the COMBINED post-move source, leave negative/absence gates untouched"
    - "Verbatim move over touched-region cleanup when static-source tests read comment text: skipped optional RFCT-03 var->const / comment rewrites inside the moved region to keep the source string byte-identical (the `photos.usage.body` static audit reads a comment literal)"

key-files:
  created:
    - assets/settings-photos.js
  modified:
    - assets/settings.js
    - settings.html
    - sw.js
    - tests/30-photos-optimize-loop.test.js
    - tests/25-07-delete-all-photos.test.js
    - tests/25-11-toast-behavior.test.js
    - tests/25-12-optimize-estimate-floor.test.js
    - tests/25-12-optimize-verdict.test.js
    - tests/25-12-optimize-stale-estimate.test.js
    - tests/25-12-photos-usage-language-rerender.test.js
    - tests/25-08-single-source-audit.test.js
    - tests/25-11-hardcoded-english-removed.test.js

decisions:
  - "Pure verbatim move (no RFCT-03 in-region cleanup): the orchestrator mandate and the static-source audits (25-08 / 25-11-hardcoded reading comment + call-site text) make byte-identity the dominant constraint; touched-region var->const / comment rewrites were deliberately deferred to avoid drifting the source string that those audits scan"
  - "Located the two IIFEs by IDENTITY not line range: plan-03 already slimmed settings.js so the plan's PRE-03 line numbers (:2370-2969) were stale; anchored on the window.__PhotosTabHelpers assignment, the __PhotosTabHelpers read, and the bindPhotosTab DOMContentLoaded registration"
  - "Combined-source repoint for pure-static audits: 25-08 (CropModule.resizeToMaxDimension consumer + PortfolioDB.updateClient >=2 call-sites) and 25-11-hardcoded (photos.usage.body) scan settings.js + settings-photos.js, preserving identical assertion strength; negative/absence gates kept on settings.js alone"

metrics:
  duration: ~20m
  completed: 2026-06-28
  tasks: 3
  files_created: 1
  files_modified: 12
  commits: 3
  tests: "106 passed / 0 failed (full suite)"
  loc: "settings.js 1639 -> 1014 (-625); settings-photos.js +624"

status: complete
---

# Phase 31 Plan 04: Photos/StorageUsage Extraction Summary

Extracted the two coupled Photos/StorageUsage IIFEs out of `assets/settings.js` into a new page-private `assets/settings-photos.js` (RFCT-01, extraction 2 of 3) — behavior-preserving, helpers-IIFE-first so the `window.__PhotosTabHelpers` hook is set before the UI IIFE reads it; settings.js slimmed 1639→1014 lines.

## What was built

- **`assets/settings-photos.js`** (624 lines): the helpers IIFE (sets `window.__PhotosTabHelpers` with `_deleteAllPhotosLoop`, `_optimizeAllPhotosLoop`, `humanBytes`, dataURL adapters, `estimatePhotoSavings`, and the threshold constants) moved physically FIRST, then the UI IIFE (reads `__PhotosTabHelpers`, owns `refreshPhotosTab`/`handleOptimize`/`handleDeleteAll`, registers `bindPhotosTab` on DOMContentLoaded, exposes `__photosOptimizeResultTimer`) below it — both moved byte-for-byte, anonymous IIFEs, no new public global.
- **settings.js**: the entire Photos section (was :1016-1639) removed; retains section-titles, tab-nav, and the backups IIFE; DOMContentLoaded handler count drops 4→3.
- **Wiring**: `<script src="./assets/settings-photos.js">` added before `settings.js` (no defer) in settings.html; `/assets/settings-photos.js` added to sw.js PRECACHE_URLS. No CACHE_NAME/APP_VERSION bump (plan 06 consolidates).
- **Test repointing** (three coupling mechanisms): 7 photos tests load settings-photos.js into the same vm sandbox; the four 25-12-* source-slice assertions repoint to the settings-photos.js source for their moved symbols; the two pure-static audits (25-08, 25-11-hardcoded) repoint their positive presence checks to the combined source.

## How it was verified

- `node tests/30-photos-optimize-loop.test.js` exits 0 with the EXACT-savedBytes assertion executing → the moved `_optimizeAllPhotosLoop` body is byte-identical.
- All 9 individually-named photos tests exit 0; full `npm test` is **106 passed / 0 failed**.
- `grep '__PhotosTabHelpers\|bindPhotosTab' assets/settings.js` → nothing; the hook lives in settings-photos.js.
- Identity selector (`fn.name === 'bindPhotosTab'`) survives the 4→3 handler drift with no re-hardcoding; the third-mechanism enumeration sweep surfaced no remaining un-repointed positive check.

## Deviations from Plan

**RFCT-03 in-region cleanups intentionally deferred (not applied).** Task 1 offered optional touched-region cleanups (`var`→`const`, comment rewrites, catch-prefixes) "additively" within the moved regions. These were deliberately skipped to keep the moved source string byte-identical, because (a) the orchestrator mandate was a verbatim move and (b) two pure-static audits read literal comment/call-site text inside the moved region (25-11-hardcoded scans the `"photos.usage.body"` comment; 25-08 scans `CropModule.resizeToMaxDimension(` / `PortfolioDB.updateClient(` call-sites). Rewriting a comment or reflowing a call could have silently shifted those assertions. RFCT-03 remains satisfied at the phase level by the other plans' touched-region work; this plan's contribution to RFCT-01 (the extraction) is complete and byte-clean. No behavior changed.

No auto-fixed bugs, no architectural changes, no authentication gates.

## Known Stubs

None.

## Threat Flags

None — verbatim relocation of two coupled page-private IIFEs; no new endpoints, inputs, data flows, or window.* surface. Threat register entries T-31-04-A (undefined hook), T-31-04-A2 (stale precache), T-31-04-T (widened surface) all mitigated: helpers IIFE moved first, both load before settings.js, PRECACHE entry added, only pre-existing hooks exposed.

## Self-Check: PASSED

- FOUND: assets/settings-photos.js
- FOUND commits: 410d06e, 578e421, a36853b
- FOUND: 31-04-SUMMARY.md
