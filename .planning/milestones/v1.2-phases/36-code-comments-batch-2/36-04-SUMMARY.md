---
phase: 36-code-comments-batch-2
plan: "04"
subsystem: assets/add-client.js · assets/reporting.js · assets/shared-chrome.js · assets/version.js · assets/globe-lang.js · assets/md-render.js · assets/demo-seed.js · assets/demo.js · sw.js
tags: [code-comments, docs, de-phase, banner, batch-2, comments-only]
dependency_graph:
  requires: ["36-01"]
  provides: [batch-2-banners, batch-2-de-phase, 9-module-coverage]
  affects:
    - assets/add-client.js
    - assets/reporting.js
    - assets/shared-chrome.js
    - assets/version.js
    - assets/globe-lang.js
    - assets/md-render.js
    - assets/demo-seed.js
    - assets/demo.js
    - sw.js
tech_stack:
  added: []
  patterns: [four-slot-banner, concise-D05-banner, comments-only-gate, strip-and-compare, light-de-phase]
key_files:
  created: []
  modified:
    - assets/add-client.js
    - assets/reporting.js
    - assets/shared-chrome.js
    - assets/version.js
    - assets/globe-lang.js
    - assets/md-render.js
    - assets/demo-seed.js
    - assets/demo.js
    - sw.js
decisions:
  - "add-client.js four-slot banner: PUBLIC SURFACE is none (self-boots on DOMContentLoaded, no window.* export); DEPENDENCIES lists App, PortfolioDB, and CropModule methods verified against call sites"
  - "reporting.js concise 3-line banner per D-05 (57 lines — thin stub); no fabricated sections"
  - "shared-chrome.js header converted from /** */ JSDoc to // labelled four-slot banner; window.AppVersion.APP_VERSION added to DEPENDENCIES after verifying it is read (line 12-14 fallback)"
  - "version.js light de-phase only (D-05): kept /** */ JSDoc header shape + dual page/SW-scope rationale; stripped all VER-NN, D-NN, UI-SPEC, Phase/Plan/OBS refs throughout the file"
  - "sw.js CRITICAL SAFETY NOTE (SW never touches IndexedDB) preserved verbatim as a CONSTRAINTS-slot invariant in the new // banner"
  - "globe-lang.js, md-render.js, demo-seed.js: concise 3-4 line D-05 banners (replaced /** */ JSDoc headers)"
  - "demo.js: 1-line banner replacing the /* === DEMO MODE CONTROLLER === */ triple-block (21 lines — minimal stub)"
  - "md-render.js body de-phase: D-23/D-24 decision tags in renderBlock comment rewritten to plain prose (LOCKED note kept)"
  - "demo-seed.js body de-phase: D-06/DEMO-06 stripped from the relative-date seam header comment"
  - "sw.js body de-phase: ISO date 2026-06-21 stripped from the staleness-incident comment; no CACHE_NAME bump"
metrics:
  duration_minutes: 8
  completed_date: "2026-07-02"
  tasks_completed: 3
  files_modified: 9
status: complete
---

# Phase 36 Plan 04: Small/Chrome/SW/Stubs — Banner + De-phase Summary

**One-liner:** Four-slot banners added to add-client.js and shared-chrome.js, concise D-05 banners added to reporting.js/globe-lang.js/md-render.js/demo-seed.js/demo.js, version.js lightly de-phased (header shape kept, all planning IDs stripped), sw.js banner refined with CRITICAL SAFETY NOTE preserved — all 9 files comment-only proven via strip-and-compare + green suite.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | add-client.js (new four-slot banner + body de-phase), reporting.js (new concise banner), shared-chrome.js (new four-slot // banner + body de-phase), version.js (light de-phase — all VER-NN/D-NN/Phase/OBS/UI-SPEC tags stripped to prose) | 6a04b7f |
| 2 | sw.js (de-phase + refined banner, SAFETY NOTE preserved, no CACHE_NAME bump), globe-lang.js (concise 3-line banner), md-render.js (concise 4-line banner + body de-phase), demo-seed.js (concise 3-line banner + body de-phase), demo.js (1-line banner) | 6a04b7f |
| 3 | Prove comments-only: strip-and-compare COMMENTS_ONLY_OK + SW_COMMENTS_ONLY_OK, npm test 119/119 green, scope fence confirmed | 6a04b7f |

All three tasks were committed together in a single atomic commit (Tasks 1+2 instructed "Do NOT commit yet" pending Task 3's gate).

## Verification Results

- `npm test`: **119/119 passed, 0 failed** — suite stays green
- Strip-and-compare gate: **COMMENTS_ONLY_OK** — zero code lines changed across all 9 files
- SW-specific strip-and-compare: **SW_COMMENTS_ONLY_OK** — CACHE_NAME/APP_VERSION unchanged, no PRECACHE_URLS entry touched
- De-phase grep (all 9 files): **DEPHASE_CLEAN** — no ID-shaped tokens remain; KEEP allowlist (AES-256, SHA-256, UTF-8, base64, v1–v6, file.js:NNN) not flagged
- Banner checks: add-client.js and reporting.js now open with `//` comment lines (NEW_BANNERS_OK); VER-ID_STRIPPED confirmed for version.js
- Scope fence: `git diff --name-only` contains none of assets/backup.js, assets/app.js, assets/pdf-export.js

## What Was Built

### assets/add-client.js — new four-slot banner

Previously header-less (started at `document.addEventListener`). Added a 17-line four-slot `//` banner documenting:
- **OWNS:** add/edit-client form, client fields, inline photo capture/crop via CropModule
- **PUBLIC SURFACE:** none — self-boots on DOMContentLoaded, no global registered
- **DEPENDENCIES:** App.{initCommon, initBirthDatePicker, t, showToast, confirmDialog, applyTranslations, setSubmitLabel, readFileAsDataURL}, PortfolioDB.{getClient, addClient, updateClient, deleteClientAndSessions}, window.CropModule.{openCropModal, resizeToMaxDimension}
- **CONSTRAINTS:** user text via textContent/.value, never innerHTML; referral "other" fallback; photo stored as data URL after resize ≤800 px

Body de-phased: D-23 soft-cap comment, D-21 resize comment, D-22 crop-only storage comment — all rewritten to plain prose.

### assets/reporting.js — new concise 3-line banner

Previously header-less (started at `document.addEventListener`). Added a concise D-05 banner: describes what the reporting page aggregates and that it self-boots with no window.* export.

### assets/shared-chrome.js — new four-slot // banner

Replaced the thin 4-line `/** */` JSDoc header (which only covered owns+used-by) with a 20-line four-slot `//` banner. PUBLIC SURFACE names `window.SharedChrome` with all 8 exported members; DEPENDENCIES lists all verified `window.AppVersion.*` reads + optional `window.CrashLog.logError`; CONSTRAINTS documents the inlined strings rationale, demo-mode license-link omission, and one-directional ⚠ marker rule.

Body de-phased: VER-02/Plan 03 (APP_VERSION fallback comment), D-09 (footer marker comment), Phase 35 Plan 06/DEMO-10 (iframe-escape context, two occurrences), D-09 (optimistic render comment), D-09/VER-03 (honest-footer comment), Phase 28→29/D-01/28-CONTEXT D-12/OBS-01/OBS-02 (crash-log feature-gate comment).

### assets/version.js — light de-phase

Kept the `/** */` JSDoc header shape and the dual page/SW-scope rationale intact. Stripped all planning IDs throughout the file: VER-02 (title), D-01/D-02 (header exposed-values bullets), VER-06 ×3 (header, readLoadedToken, genuine-recovery), VER-03/D-08 (integrity-self-check section header), VER-06 (states list), D-12/Phase 29 (wedged-state rationale), VER-03/UI-SPEC Copywriting Contract (INTEGRITY_STRINGS section header), Phase 18 (Hebrew gender note), D-10 (genuine-recovery section header), D-10/D-11/D-12 (nudge-DOM-builder section), offline D-11 and wedged D-12 state bullets, Phase 29/OBS-03/Plan 02 (wedged-recover route comment), Phase 29/OBS-02 (wedged-report route comment), D-09 (one-directional footer marker comment). All explanatory prose kept.

### sw.js — de-phase + refined banner (no cache bump)

Replaced the `/** */` JSDoc with a `//` four-slot banner plus the CRITICAL SAFETY NOTE (preserved verbatim as the CONSTRAINTS invariant). Banner documents: OWNS (static-asset precache + cache-first strategy + HTML precache with redirect-safe fetch+put), PUBLIC SURFACE (SW lifecycle events), DEPENDENCIES (importScripts /assets/version.js for INTEGRITY_TOKEN), CONSTRAINTS (SW never touches IndexedDB — the SAFETY NOTE).

Body de-phase: the staleness-incident ISO date `2026-06-21` stripped from the install-handler comment; D-02 reference in the cache-name derivation comment stripped. No CACHE_NAME bump, no PRECACHE_URLS edits.

### assets/globe-lang.js — concise 3-line D-05 banner

Replaced the 9-line `/** */` JSDoc block (which included param documentation) with a 3-line concise banner: module name + what it does + notes RTL-awareness and the initGlobeLang call signature. No window.* export noted inline.

### assets/md-render.js — concise 4-line D-05 banner + body de-phase

Replaced the 10-line `/** */` JSDoc block with a 4-line concise banner that names window.MdRender, the supported Markdown subset, and the HTML-escape security guarantee. Body de-phased: D-23/Phase 24 and D-24/Phase 24 tags on the LOCKED single-newline paragraph behavior comment and heading-regex comment.

### assets/demo-seed.js — concise 3-line D-05 banner + body de-phase

Replaced the triple `/* === DEMO SEED DATA === */` block with a 3-line concise banner: what it does, the exposed window.demoSeedReady Promise, and the load-order constraint (after db.js, before overview.js). Body de-phased: D-06/DEMO-06 stripped from the relative-date seam section header.

### assets/demo.js — 1-line banner

Replaced the triple `/* === DEMO MODE CONTROLLER === */` block (3 lines) with a 1-line banner per D-05: "demo.js — demo-mode controller: syncs language from the parent landing page."

## Deviations from Plan

None — plan executed exactly as written. All 9 files match the prescribed treatment (new banner vs concise vs light de-phase per D-05), all planning IDs stripped to prose per D-07, gates green.

## Known Stubs

None. This is a comment-only plan — no code symbols, data flows, or UI elements.

## Threat Flags

None. Comment-only edits add no attack surface. No new schema push, no new network endpoints, no new auth paths. sw.js PRECACHE_URLS and CACHE_NAME are unchanged — no cache roll.

## Self-Check: PASSED

- `assets/add-client.js` exists with banner: confirmed (starts with `// ────`)
- `assets/reporting.js` exists with banner: confirmed (starts with `// reporting.js`)
- `assets/shared-chrome.js` exists with banner: confirmed (starts with `// ────`)
- `assets/version.js` exists with de-phased header: confirmed (VER-NN stripped)
- `assets/globe-lang.js` exists with concise banner: confirmed
- `assets/md-render.js` exists with concise banner: confirmed
- `assets/demo-seed.js` exists with concise banner: confirmed
- `assets/demo.js` exists with 1-line banner: confirmed
- `sw.js` exists with refined banner + CRITICAL SAFETY NOTE: confirmed
- Commit `6a04b7f` exists: confirmed
- `npm test` 119/119: confirmed
- `COMMENTS_ONLY_OK` strip-and-compare: confirmed
- `SW_COMMENTS_ONLY_OK`: confirmed
- `DEPHASE_CLEAN` all 9 files: confirmed
- Scope fence (giants untouched): confirmed
