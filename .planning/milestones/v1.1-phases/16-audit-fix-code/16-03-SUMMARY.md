---
phase: 16-audit-fix-code
plan: "03"
subsystem: assets
tags: [refactor, dead-code, i18n, css-tokens, utility-extraction]
dependency_graph:
  requires: []
  provides: [App.formatSessionType, App.readFileAsDataURL]
  affects: [assets/app.js, assets/overview.js, assets/sessions.js, assets/add-session.js, assets/add-client.js, assets/i18n-en.js, assets/i18n-he.js, assets/i18n-de.js, assets/i18n-cs.js, assets/tokens.css, assets/app.css]
tech_stack:
  added: []
  patterns: [shared-utility-extraction, design-tokens, i18n-cleanup]
key_files:
  created: []
  modified:
    - assets/app.js
    - assets/overview.js
    - assets/sessions.js
    - assets/add-session.js
    - assets/add-client.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
    - assets/tokens.css
    - assets/app.css
decisions:
  - "formatSessionType uses session.type.* i18n keys (clinic/online/other only); dead types inPerson/proxy/surrogate excluded"
  - "readFileAsDataURL exposed as App.readFileAsDataURL so all file-input handlers share one implementation"
  - "--color-text-inverse added to both light and dark theme blocks in tokens.css"
metrics:
  duration: 15min
  completed: "2026-03-23"
  tasks: 2
  files: 11
---

# Phase 16 Plan 03: Dead Code Removal and Utility Extraction Summary

**One-liner:** Extracted formatSessionType/readFileAsDataURL into shared App API, removed dead i18n keys (overview.table.details/addSession), and replaced hardcoded `#fff` with `--color-text-inverse` design token.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extract formatSessionType() and readFileAsDataURL() to shared App API | b8d2ee8 | app.js, overview.js, sessions.js, add-session.js, add-client.js |
| 2 | Remove dead i18n keys and replace hardcoded CSS color with token | 62aad87 | i18n-en.js, i18n-he.js, i18n-de.js, i18n-cs.js, tokens.css, app.css |

## What Was Built

### Task 1: Shared Utility Extraction

Two utility functions existed in multiple files as near-identical copies:

- `formatSessionType(type)` — appeared in overview.js (dead version with inPerson/proxy/surrogate), sessions.js (same dead version), and add-session.js (correct version with clinic/online/other). Added to app.js using the correct 3-type pattern (`session.type.{type}` i18n key lookup). All 3 consumer files updated to call `App.formatSessionType()`.

- `readFileAsDataURL(file)` — appeared in add-session.js and add-client.js. Added to app.js as shared `App.readFileAsDataURL()`. Both consumer files updated.

Both functions are exposed on the `App` public API return object.

### Task 2: Dead Code and Token Cleanup

**i18n keys removed:** `overview.table.details` and `overview.table.addSession` from all 4 language files. Verified unused via grep across all JS and HTML files — keys only appeared in i18n definitions, never in active code.

**Design token added:** `--color-text-inverse: #fff` added to light theme `:root` block (already present when this plan ran — added by parallel 16-02 agent). Added `--color-text-inverse: #fff` to `[data-theme="dark"]` block which was missing it.

**CSS hardcoded color replaced:** `color: #fff` on `.edit-client-btn:hover` replaced with `color: var(--color-text-inverse, #fff)`. Other `#fff` occurrences in app.css are all inside `var()` fallback positions (not standalone property values), which is the accepted pattern.

## Decisions Made

1. **formatSessionType uses only clinic/online/other** — The old local implementations in overview.js and sessions.js had dead code for `inPerson`, `proxy`, `surrogate` session types that no longer exist post-Phase 3 migration. The shared function uses only the 3 valid types.

2. **Both tokens.css theme blocks** — `--color-text-inverse` must appear in both `:root` and `[data-theme="dark"]` to ensure correct value in all contexts.

## Deviations from Plan

### Note: Task 1 Already Committed by Parallel Agent

Task 1 changes (app.js, overview.js, sessions.js, add-session.js, add-client.js) were committed as part of commit `b8d2ee8 docs(16-02)` by the parallel 16-02 plan agent before this agent ran. The changes matched the plan spec exactly. This agent verified correctness and proceeded to Task 2.

### Auto-fixed Issues

**1. [Rule 2 - Missing] tokens.css dark theme block missing --color-text-inverse**
- **Found during:** Task 2
- **Issue:** Light theme `:root` had `--color-text-inverse: #ffffff` (added by parallel agent) but `[data-theme="dark"]` block did not have the token at all.
- **Fix:** Added `--color-text-inverse: #fff` to dark theme block.
- **Files modified:** assets/tokens.css
- **Commit:** 62aad87

## Verification Results

- `grep -rn "function formatSessionType" assets/` — 1 result: assets/app.js line 361
- `grep -rn "function readFileAsDataURL" assets/` — 1 result: assets/app.js line 366
- `grep -rn "inPerson|proxy|surrogate" assets/app.js` — 0 results
- `grep "overview.table.details" assets/i18n-*.js` — 0 results across all 4 files
- `grep "overview.table.addSession" assets/i18n-*.js` — 0 results across all 4 files
- `grep "color-text-inverse" assets/tokens.css` — 2 results (light and dark theme)
- `grep "var(--color-text-inverse" assets/app.css` — match confirmed
- No standalone `color: #fff` properties remain in app.css (all are inside var() fallbacks)

## Known Stubs

None — all functionality is wired and complete.

## Self-Check: PASSED

- assets/app.js contains formatSessionType and readFileAsDataURL: FOUND
- assets/tokens.css contains --color-text-inverse in both themes: FOUND
- assets/app.css uses var(--color-text-inverse): FOUND
- All i18n files have 0 occurrences of overview.table.details: CONFIRMED
- Task 2 commit 62aad87: FOUND
