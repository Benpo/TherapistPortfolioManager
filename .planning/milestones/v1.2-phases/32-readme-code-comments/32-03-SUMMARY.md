---
phase: 32-readme-code-comments
plan: 03
subsystem: docs / code-comments
tags: [DOCS-02, comments-only, de-phase, banner-convention, slimmed-parent]
requires: [P31 extractions (settings-snippets.js, settings-photos.js, export-modal.js)]
provides: [comment-pilot-convention-complete, comments-only-diff-process]
affects: [assets/settings.js, assets/add-session.js]
tech-stack:
  added: []
  patterns: [responsibility-banner four-slot convention, deterministic comments-only strip-and-compare gate]
key-files:
  created: []
  modified:
    - assets/settings.js
    - assets/add-session.js
decisions:
  - "Comments-only proof run against the true pre-plan baseline (commit f3f723b, before Task 1) rather than live HEAD, because the sequential executor commits per task — preserves the D-11 guarantee across the atomic per-task commits."
  - "add-session.js deps slot documents only the globals the file actually reads (App.* + PortfolioDB.* + window.__exportModalInit); it does NOT invoke Snippets.*/SNIPPETS_SEED/I18N directly (those compose via the snippets layer's input listener), so the banner reflects real usage, not the plan's read_first floor."
metrics:
  duration: ~14min
  completed: 2026-06-29
status: complete
---

# Phase 32 Plan 03: README + Code Comments (DOCS-02 part B — the 2 slimmed parents) Summary

Rewrote `settings.js`'s JSDoc header to a four-slot responsibility banner reflecting its post-P31 SLIMMED shape (Snippets + Photos extracted out), gave header-less `add-session.js` a brand-new four-slot banner documenting its export-modal boot handshake, and de-phased both files of all build-history archaeology — proven comments-only by a deterministic strip-and-compare against the pre-plan baseline plus a green 106-file suite. With plan 02 this completes the comment pilot and its reusable convention + comments-only-diff process.

## What Was Built

- **settings.js (de-phase + slimmed-shape rewrite):** rewrote the JSDoc banner to the four-slot convention — OWNS (the 9 section rows + Save flow + success pill + Report row + tablist + Backups handlers), EXTRACTED OUT (explicitly names `settings-snippets.js` and `settings-photos.js` as the modules the Snippets section and Photos tab moved into), PUBLIC SURFACE (the `{ buildReportRow, mountReportRow }` return), DEPENDENCIES (the App.*/PortfolioDB.*/BackupManager.*/CrashLog.* + "sessions-garden-settings" BroadcastChannel chain), and the SECURITY/innerHTML invariant (kept verbatim in meaning). Converted ~30 inline references across every dialect (`Phase 22 Plan 04`, `T-22-04-01`, `Gap 1/4/N4/N5/2`, `D1/D2`, `D-18`, `UAT-D1/D3`, `WR-01 (code-review 2026-05-16)`, `Phase 25 round-6 (#7, Ben 2026-05-15)`, `2026-04-28`, `Phase 24/25 Plan 05/12`) into plain behavior prose. Kept the JSDoc `/** */` style throughout.
- **add-session.js (new banner + body de-phase):** added a brand-new top-of-file `//` banner (the file previously opened on `let clientCache = [];` with no header) covering all four slots and explicitly documenting that the file calls `window.__exportModalInit(ctx)` once at boot, pairing with `export-modal.js`. De-phased ~32 body references including trailing comments on code lines (`let lastSavedSnapshot = null; // D-06: …` → `// snapshot …`; `updateCancelButtonLabel(); // D-04: …` → `// swap to …`) and the `g7p __*TestHooks`, `Quick 260516-rna`, `Phase 22/24 Plan 08/12`, `RFCT-02`, `BLOCKER`, and dated `amended 2026-04-28` tags.

## How It Works

Each banner follows the export-modal four-slot convention (owns · public surface · window.* deps · invariants) with zero phase/plan numbers. The de-phase preserved living-doc traceability (bare `REQ-3`/`REQ-5`/`OBS-01` and `UI-SPEC` references untouched) and all design rationale (every "textContent — never innerHTML" security note survives; only its build-process tag was dropped). The banners reflect the files' real post-P31 shape: settings.js names its two extracted-out child modules, and add-session.js documents the export-modal handshake that replaced its inlined export region.

## Verification

- `npm test` → **106 passed, 0 failed** (after each task).
- Broadened archaeology grep over both files → **empty** (DEPHASE_CLEAN) across every build-history dialect (phase/plan, D-/T-/RFCT-, UAT, Gap, Round/Change, WR-, g7p, Quick, code-review, ISO dates, #issue). Verified NOT to flag the preserved bare REQ-/OBS-/UI-SPEC references.
- settings.js banner names both `settings-snippets` and `settings-photos` → **EXTRACTION_NOTED** (slimmed-shape rewrite, D-10b).
- add-session.js now opens with a `//` banner → **HAS_BANNER** (it previously started with code).
- Comments-only strip-and-compare (strip block/line/trailing comments + collapse whitespace, assert byte-equal) against the pre-plan baseline `f3f723b` → **COMMENTS_ONLY_OK** — zero code lines changed across both files (D-11).

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Process note (not a code deviation)

The plan's Task 3 gate compares the working tree against `git HEAD` assuming all edits are uncommitted. As a sequential executor I commit per task, so by Task 3 both files were already in HEAD. To keep the D-11 guarantee sound, the strip-and-compare was run against the **pre-plan baseline `f3f723b`** (the commit before Task 1's first edit; neither file was touched between it and the edits). Result identical in intent: COMMENTS_ONLY_OK. This mirrors the documented approach from plan 02.

### Banner-accuracy note

The plan's read_first listed `Snippets.*/SNIPPETS_SEED, I18N` as part of add-session.js's dependency chain. The actual code reads only `App.*` and `PortfolioDB.*` (plus the `window.__exportModalInit` handshake); the snippet-expansion `input` listener is attached by the snippets layer, not invoked by this file. The banner documents the real surface to stay truth-checked against the live file (the pilot's whole point), with a one-line note that the snippet listener composes with the autoGrow handler.

## Pilot Outcome (D-12)

This plus plan 02 completes the DOCS-02 comment pilot: the four-slot banner convention and the comments-only strip-and-compare process now have working precedents across the 3 extracted modules (plan 02) and the 2 slimmed parents (this plan), including the hardest cases — a from-scratch banner on a header-less 1500-line controller and a JSDoc slimmed-shape rewrite. The convention and gate are ready to template a later batch-2 phase (`overview.js`/`sessions.js`/`db.js`).

## Self-Check: PASSED

- assets/settings.js — FOUND (modified, committed d24d624)
- assets/add-session.js — FOUND (modified, committed b0bf317)
- Commit d24d624 — FOUND
- Commit b0bf317 — FOUND
