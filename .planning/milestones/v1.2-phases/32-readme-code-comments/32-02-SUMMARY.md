---
phase: 32-readme-code-comments
plan: 02
subsystem: docs / code-comments
tags: [DOCS-02, comments-only, de-phase, banner-convention]
requires: [P31 extractions (export-modal.js, settings-snippets.js, settings-photos.js)]
provides: [comment-pilot-convention, comments-only-diff-process]
affects: [assets/export-modal.js, assets/settings-snippets.js, assets/settings-photos.js]
tech-stack:
  added: []
  patterns: [responsibility-banner four-slot convention, deterministic comments-only strip-and-compare gate]
key-files:
  created: []
  modified:
    - assets/export-modal.js
    - assets/settings-snippets.js
    - assets/settings-photos.js
decisions:
  - "Comments-only proof run against the true pre-edit baseline (commit before Task 1) rather than live HEAD, because the sequential executor commits per task — preserves the D-11 guarantee for export-modal.js after its own commit."
metrics:
  duration: ~12min
  completed: 2026-06-29
status: complete
---

# Phase 32 Plan 02: README + Code Comments (DOCS-02 part A — the 3 extracted modules) Summary

De-phased the comments of the three P31-extracted IIFE modules so each opens with a plain four-slot responsibility banner (owns · public surface · window.* deps · invariants) and carries zero build-history archaeology — proven comments-only by a deterministic strip-and-compare against the pre-edit baseline plus a green 106-file suite.

## What Was Built

- **export-modal.js (light de-phase):** kept the gold-standard banner shape; removed the `RFCT-02` header tag, the `T-22-06-02 mitigation` tag on the `textContent` security line (rationale preserved), and the `UAT Test 2` root-cause tag on the modal-close stacking comment.
- **settings-snippets.js (header + inline de-phase):** rewrote the `Phase 24 Plan 05` title to a plain what-it-does title; dropped the `.continue-here.md` source pointer; stripped `D-16`, `D-12`, `Plan 04`, and two `UAT bug` tags from body comments while keeping each explanation. Preserved the **cross-IIFE identifier-resolution chain block** (the deps slot) and the **SECURITY note** (the invariants slot).
- **settings-photos.js (heaviest de-phase):** rewrote both `Phase 25 Plan 07` header titles; converted ~27 inline references (`D-24/D-25/D-30`, `UAT-C2/C3/D4`, `round-2/round-5/round-6`, `Change B/Change 3`, `Plan 11/12/24`, `Task 2`, dated `2026-05-15` post-UAT fix-notes, and a `app.js setLine 126` pointer) into plain behavior prose — explanations and design rationale kept, only the historical tags dropped.

## How It Works

Each banner now follows the export-modal four-slot convention with no phase/plan numbers. The de-phase preserved living-doc traceability (bare `REQ-`/`OBS-`/`UI-SPEC` references untouched) and all design rationale (e.g. the "textContent — never innerHTML" security note survives, only its mitigation tag was dropped).

## Verification

- `npm test` → **106 passed, 0 failed** (after each task).
- Broadened archaeology grep over all three files → **empty** (DEPHASE_CLEAN) across every build-history dialect.
- `settings-snippets.js` retains the cross-IIFE chain block → **CHAIN_PRESERVED**.
- Comments-only strip-and-compare (strip block/line/trailing comments + collapse whitespace, assert byte-equal) against the pre-edit baseline `5526589` → **COMMENTS_ONLY_OK** — zero code lines changed across all three files (D-11).

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Process note (not a code deviation)

The plan's Task 3 gate compares the working tree against `git HEAD` assuming all edits are uncommitted. The sequential executor commits per task, so by Task 3 the export-modal.js edit was already in HEAD. To keep the D-11 guarantee sound for that file, the strip-and-compare was run against the **commit before Task 1** (`5526589`, the true pre-edit baseline for all three files — none were touched between that commit and the edits). Result identical in intent: COMMENTS_ONLY_OK.

## Commits

- `a552478` docs(32-02): de-phase export-modal.js comments (Task 1)
- `add3671` docs(32-02): de-phase settings-snippets + settings-photos comments (Task 2)

(Task 3 is the comments-only proof — a one-shot verification gate, no separate code commit; its work is the green strip-and-compare above.)

## Pilot Outcome (D-12)

This plus plan 03 establishes the reusable comment convention (the four-slot banner) and the comments-only-diff process (deterministic strip-and-compare + green suite) for a later batch-2 phase. The convention transferred cleanly from the export-modal template to two files with rich pre-existing headers and one with heavy inline archaeology.

## Self-Check: PASSED

- assets/export-modal.js — FOUND (modified, committed a552478)
- assets/settings-snippets.js — FOUND (modified, committed add3671)
- assets/settings-photos.js — FOUND (modified, committed add3671)
- Commit a552478 — FOUND
- Commit add3671 — FOUND
