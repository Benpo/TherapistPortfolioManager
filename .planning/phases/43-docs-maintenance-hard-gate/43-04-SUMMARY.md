---
phase: 43-docs-maintenance-hard-gate
plan: 04
subsystem: help-content
tags: [help, i18n, locale, metadata, D-20]
status: complete
requires: [43-02]
provides:
  - covers-en-only
affects:
  - assets/help-content-he.js
  - assets/help-content-de.js
  - assets/help-content-cs.js
  - tests/help-integrity-locale.test.js
tech-stack:
  added: []
  patterns:
    - "covers[] is EN-canonical repo metadata, stripped from locale mirrors"
key-files:
  created: []
  modified:
    - assets/help-content-he.js
    - assets/help-content-de.js
    - assets/help-content-cs.js
    - tests/help-integrity-locale.test.js
decisions:
  - "D-20: covers[] is EN-only gate metadata, not translatable content — stripped from he/de/cs; the locale parity test's covers-comparison block deleted so the suite stays green."
metrics:
  duration: ~3min
  completed: 2026-07-10
requirements: [GATE-01]
---

# Phase 43 Plan 04: covers[] EN-Only (D-20) Summary

Made `covers[]` EN-canonical by stripping it from the three locale help files (he/de/cs)
and deleting the single locale-parity assertion that would otherwise go red.

## What Was Done

- **Task 1** — Removed the `covers[]` property from every topic in `assets/help-content-{he,de,cs}.js`.
  **34 topics stripped per file** (102 line deletions total, 34 × 3). Only the `covers:` metadata
  line was removed from each topic; all translated prose, `id`, `priority`, `title`, `body`, and
  `{ui:}` tokens are byte-unchanged. `assets/help-content-en.js` was not touched — EN keeps
  `covers[]` as the gate's canonical source (backfilled in 43-03).
- **Task 2** — Deleted the `enCovers`/`lcCovers` `JSON.stringify` comparison block from
  `tests/help-integrity-locale.test.js` (the file 43-02 renamed from `42_1-help-integrity.test.js`).
  All other locale parity assertions remain and still run: section ids, group, featured flag,
  topic ids, priority, and `{ui:}` token parity. Also updated the file's header doc-comment so it
  no longer lists `topic covers[]` among the cross-checked fields (accuracy fix directly caused by
  the block removal).

## Verification

- Task 1 verify: all three locale files load in a fresh vm sandbox and **no topic carries a
  `covers` property** (`OK all locales covers-free`).
- Task 2 verify: `node tests/help-integrity-locale.test.js` passes (31/31) with `lcCovers` absent
  from the file (`LOCALE-PARITY-OK`). The locale parity test still asserts id/group/priority/{ui:}
  parity — confirmed by the passing `[loc] each section group + featured + topics match EN` and
  `{ui:key} token set is byte-identical to EN per topic` assertions.
- `node tests/help-integrity.test.js` stays green (12/12) — EN still asserts a **non-empty covers
  array** per topic, confirming covers[] is now EN-only.
- Diff audit: the locale-file change is exactly 102 deletions, 0 additions, 0 non-covers edits.

## Deviations from Plan

**1. [Rule 1 — Accuracy] Updated a stale header doc-comment in the locale test**
- **Found during:** Task 2
- **Issue:** The test file's top doc-comment (line 18) enumerated the fields the test cross-checks
  and included "topic covers[]". After deleting the covers-parity block that claim became false.
- **Fix:** Changed the comment to drop `/ topic covers[]` from the enumerated list, keeping it
  truthful. No code/behavior change.
- **Files modified:** tests/help-integrity-locale.test.js
- **Commit:** f0e267c

## Deferred / Out-of-Scope Notes

- `npm test` reports 2 failing files — `tests/docs-gate.test.js` and
  `tests/docs-gate-role-table.test.js` (17 assertions, all `gate script absent … expected RED
  until it ships`). These are **intentional TDD RED tests** for `scripts/docs-gate.js`, a
  deliverable of a later plan in this phase (not yet built). They are **pre-existing and unrelated
  to this plan** — the strip touched only locale help content and the locale integrity test.
  No action taken (out of scope; owned by a later 43-xx plan).

## Self-Check: PASSED

- FOUND: assets/help-content-he.js (0 covers properties)
- FOUND: assets/help-content-de.js (0 covers properties)
- FOUND: assets/help-content-cs.js (0 covers properties)
- FOUND: tests/help-integrity-locale.test.js (lcCovers absent, test green)
- FOUND commit: bf3354c (Task 1 — strip covers[] from locale files)
- FOUND commit: f0e267c (Task 2 — drop covers-parity assertion)
