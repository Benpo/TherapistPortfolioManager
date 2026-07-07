---
phase: 34-session-pdf-export-visual-polish
plan: 1
subsystem: pdf-export / offline-assets
status: complete
tags: [pdf-export, offline, base64-asset, service-worker, precache, D-05, FN-3]
requires: []
provides:
  - "window.IconLogoBase64 (raw base64 of icon-512.png) — embeddable offline logo for the PDF header band"
  - "/assets/branding/icon-512-base64.js precached so an installed PWA renders the logo with zero network"
affects:
  - "34-06 drawHeaderBand (consumes window.IconLogoBase64 via doc.addImage)"
tech-stack:
  added: []
  patterns:
    - "Vendored base64 JS module assigning a raw base64 string to a window global (mirrors assets/fonts/heebo-base64.js) — no fetch, no build step"
    - "SW cache invalidation via deploy git-SHA INTEGRITY_TOKEN (Phase 28 convention) — committing a new precache entry auto-rolls the cache at deploy; no hand-edited cache number"
key-files:
  created:
    - assets/branding/icon-512-base64.js
  modified:
    - sw.js
    - assets/version.js
decisions:
  - "Placed icon-512-base64.js in PRECACHE_URLS directly after logo-512.png to keep /assets/branding/* grouped; logo-512.png fallback entry retained (D-05)."
  - "Bumped APP_VERSION 1.2.2 -> 1.2.3 as the human-visible deploy marker (precedent 31-06 'bump APP_VERSION to roll PWA precache'). CACHE_NAME itself auto-derives from the deploy git-SHA INTEGRITY_TOKEN and is never hand-edited (Ben's hard constraint)."
metrics:
  duration: "~12 min"
  completed: 2026-06-29
  tasks: 2
  files: 3
---

# Phase 34 Plan 01: Offline PDF Logo Asset Summary

Vendored `icon-512.png` as a raw-base64 `window.IconLogoBase64` JS module and precached it, giving the redesigned PDF header band (34-06) an embedded, zero-network logo (D-05 / FN-3) and closing the offline gap where `icon-512.png` was absent from `PRECACHE_URLS` (Pitfall 4).

## What was built

- **`assets/branding/icon-512-base64.js`** — self-contained module assigning the raw base64 (no `data:` prefix) of `icon-512.png` to `window.IconLogoBase64`, mirroring the `assets/fonts/heebo-base64.js` pattern. Decodes to a valid PNG (magic bytes `89 50 4E 47`, 93,767 bytes — byte-identical to source). Provenance header names the source asset, the byte-identical `logo-512.png` fallback (shared md5 `f78c482f4d141b487fa68ce26f7a9558`), the consumer (`pdf-export.js drawHeaderBand → doc.addImage`), and the D-05 offline rationale. No build step (committed vendored asset).
- **`sw.js`** — added `'/assets/branding/icon-512-base64.js'` to `PRECACHE_URLS` (after `logo-512.png`, keeping branding assets grouped). `/assets` precache entry count went 52 → 53; `logo-512.png` fallback retained; nothing removed or reordered.
- **`assets/version.js`** — `APP_VERSION` 1.2.2 → 1.2.3 (human-visible deploy marker).

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Encode icon-512.png as a base64 JS module | e9fce0c | assets/branding/icon-512-base64.js |
| 2 | Add module to SW precache + bump APP_VERSION | d6db32e | sw.js, assets/version.js |

## Verification

- Task 1 automated check: `node` decode → PNG magic ok, bytes=93767 (>1KB, valid PNG). PASS.
- Task 2 automated check: both `icon-512-base64.js` AND `logo-512.png` present in `sw.js`. PASS.
- APP_VERSION falsifiable diff: pre-commit `1.2.2` → post-commit `1.2.3` (verified via `git show HEAD:assets/version.js`). PASS.
- No production behavior change yet — the module is consumed by 34-06.

## Deviations from Plan

**1. [Rule 1 — Outdated done-criterion premise] CACHE token mechanism corrected**
- **Found during:** Task 2.
- **Issue:** The plan's Task 2 action/done-criteria assume the pre-commit hook bumps `sw.js CACHE_NAME` (per `reference-pre-commit-sw-bump`) and that bumping the footer changes the "integrity-derived token". Both are stale: Phase 28 (commit `9ba8037`) made `CACHE_NAME = 'sessions-garden-' + AppVersion.INTEGRITY_TOKEN`, **removed the pre-commit hook** (none present at `.git/hooks/pre-commit`), and `INTEGRITY_TOKEN` is the **deploy-stamped git short-hash** (locally the `__BUILD_TOKEN__` placeholder → `'dev'`), NOT derived from `APP_VERSION`.
- **Consequence:** `CACHE_NAME` cannot be hand-edited (Ben's documented hard constraint) and does not change locally — it rolls automatically at deploy because this commit produces a new git SHA → new `INTEGRITY_TOKEN` → new `CACHE_NAME` → activate-event re-precache. The literal done-criterion ("diff the CACHE_NAME/INTEGRITY_TOKEN across pre/post-commit — it MUST differ") is unsatisfiable locally by design; it is satisfied at deploy by the new git-SHA.
- **Fix:** Satisfied the criterion's *spirit* (a falsifiable, diffable version change that rolls the precache) by bumping `APP_VERSION` 1.2.2 → 1.2.3 — the human-visible deploy marker, following precedent `02ac18a` (31-06: "bump APP_VERSION ... to roll PWA precache"). No `chore` follow-up commit was needed (the hook the plan referenced no longer exists).
- **Files modified:** sw.js, assets/version.js — **Commit:** d6db32e

**Note on mid-phase footer bump:** `project-version-bump-convention` says mid-milestone phase deploys *usually* leave the footer unchanged (the auto git-SHA hash already busts the cache). The plan explicitly instructed a footer bump and precedent 31-06 supports a patch bump for this purpose, so 1.2.3 was applied. Ben may still adjust the final footer (e.g. to a minor bump) at phase ship / milestone close per the documented bump-decision habit; this patch does not foreclose that.

## Self-Check: PASSED

- FOUND: assets/branding/icon-512-base64.js
- FOUND commit e9fce0c (Task 1)
- FOUND commit d6db32e (Task 2)
- APP_VERSION verified 1.2.2 → 1.2.3; local INTEGRITY_TOKEN = 'dev' (expected deploy placeholder)
