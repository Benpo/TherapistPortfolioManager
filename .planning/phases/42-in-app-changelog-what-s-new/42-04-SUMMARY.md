---
phase: 42-in-app-changelog-what-s-new
plan: 04
subsystem: changelog-data
tags: [changelog, data-source, whats-new, i18n, schema]
status: complete
requires:
  - tests/42-changelog-integrity.test.js (RED gate authored in plan 02)
  - assets/version.js (APP_VERSION semantics)
provides:
  - window.CHANGELOG_CONTENT_EN (the ONE structured changelog source)
affects:
  - assets/whats-new.js (plan 05 — reads latest .highlights)
  - assets/changelog.js (plan 06 — renders full history)
  - plan 10 (final approved BODY copy, D-04)
tech-stack:
  added: []
  patterns:
    - IIFE + "use strict" + window global registration (mirrors help-content-en.js)
    - documented schema header-comment contract enforced by an integrity test
key-files:
  created:
    - assets/changelog-content-en.js
  modified: []
decisions:
  - "One source of truth: window.CHANGELOG_CONTENT_EN read by BOTH popup and page; never a second version constant, never git-scraped (CHLG-03)"
  - "Versions/dates/anchors are FINAL now; lede/highlights/category BODY copy is structurally-valid PLACEHOLDER pending the D-03 pipeline + Ben's D-04 approval in plan 10"
  - "v1.2 consolidates v1.2.1-v1.2.4 into one entry dated 'July 2026' (D-02); v1.0 is an origin-only marker with no highlights/categories (D-01)"
metrics:
  duration: ~10min
  completed: 2026-07-09
  tasks: 1
  files: 1
---

# Phase 42 Plan 04: Changelog Data Source Summary

Created `assets/changelog-content-en.js` (`window.CHANGELOG_CONTENT_EN`) — the single structured, reverse-chronological changelog array both the What's-New popup and the changelog page will read — with a documented schema header and four entries (v1.3 self-hosting, consolidated v1.2, v1.1, v1.0 origin), turning the T-42-V9 integrity gate GREEN (9/9).

## What Was Built

- **One data module, one global.** An IIFE with `"use strict"` assigns `window.CHANGELOG_CONTENT_EN` a reverse-chronological array `[v1.3, v1.2, v1.1, v1.0]`, mirroring the `assets/help-content-en.js` idiom.
- **Documented schema contract.** A header comment block documents every field (`version`, `anchor`, `date`, `lede`, `highlights` 2-4, `categories` ⊆ {new,improved,fixed}, optional `origin`), the reverse-chron rule, the no-emoji rule (D-10), and the "never read the SW/INTEGRITY_TOKEN layer" anti-pattern (CHLG-03).
- **Four entries.** v1.3.0 (`v1-3`, first/self-hosting, highlights = help center + tour + in-app changelog), a consolidated v1.2.0 (`v1-2`, July 2026, D-02, with new/improved/fixed), v1.1.0 (`v1-1`, June 2026), and v1.0.0 (`v1-0`, May 2026, `origin:true`, no highlights/categories).
- **Copy status flagged.** A `COPY STATUS: DRAFT / PLACEHOLDER` header block marks all BODY strings as structurally-valid placeholders (seeded from PROJECT.md's Validated ledger + the v1.2.4 users draft), with final approved wording deferred to plan 10 (D-04). Versions/dates/anchors are final.

## Verification

- `node tests/42-changelog-integrity.test.js` — **9 passed, 0 failed** (was RED before this plan; the file's absence was the RED reason).
- `node -c assets/changelog-content-en.js` — passes.
- Emoji grep (`[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}\x{1F1E6}-\x{1F1FF}]`) — no matches (D-10 clean).

## Deviations from Plan

None - plan executed exactly as written. TDD note: the RED test (`tests/42-changelog-integrity.test.js`) was authored in plan 02, so this plan performed only the GREEN step (one `feat` commit); no separate RED commit was needed here.

## Known Stubs

The lede / highlights / category strings are intentional DRAFT placeholders, documented in the file's `COPY STATUS` header and in the plan's own objective. This is NOT an unresolved stub blocking the plan's goal — plan 04's goal is the SHAPE (schema + one source), which is fully delivered; final BODY copy is scoped to plan 10 (Ben's D-04 approval). Versions, dates, and anchors are final, not placeholder.

## Self-Check: PASSED

- FOUND: assets/changelog-content-en.js
- FOUND commit: 72184e7
