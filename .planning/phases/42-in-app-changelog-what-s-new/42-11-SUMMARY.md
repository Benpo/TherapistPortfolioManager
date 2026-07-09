---
phase: 42-in-app-changelog-what-s-new
plan: 11
subsystem: changelog-content
tags: [changelog, copy, D-04, CHLG-04, self-hosting]
requires: [42-04, 42-07, 42-09]
provides: [approved-changelog-copy, CHLG-04-self-hosting-proof]
affects: [assets/changelog-content-en.js]
tech-stack:
  added: []
  patterns: [D-03 wording pipeline, D-04 human copy-approval gate]
key-files:
  created: []
  modified:
    - assets/changelog-content-en.js
decisions:
  - "D-04 APPROVED by Ben 2026-07-09 with one verbatim revision: strip internal 'first paid release' framing from the v1.1 lede AND its section-comment label — this asset (including comments) is served to clients, so no internal business framing may appear anywhere in the file"
  - "All other entries (v1.3, v1.2, v1.0, popup highlights) approved exactly as drafted in commit f6a50db"
metrics:
  duration: ~10min (continuation from checkpoint)
  completed: 2026-07-09
status: complete
---

# Phase 42 Plan 11: Final Changelog Copy (D-04 Approval) Summary

Ben-approved (D-04) changelog BODY copy locked into `assets/changelog-content-en.js`, closing CHLG-04's self-hosting proof; approval carried one verbatim revision removing internal "first paid release" framing from the v1.1 entry and comments.

## What Was Done

- **Task 1 (prior executor, commit f6a50db):** Drafted all four entry bodies (v1.3 self-hosting, v1.2 consolidated, v1.1, v1.0 origin line) through the D-03 wording pipeline — factual → register-filter → native-speaker → DNA/voice — with the header comment flagged pending D-04.
- **Task 2 (checkpoint):** Halted at the D-04 human copy-approval gate. Ben reviewed the entries as rendered on the real /changelog page + What's-New popup.
- **Task 3 (this executor, commit 2ed953d):** Applied Ben's approval verbatim:
  - v1.1 lede changed from "The first paid release, built to help you export, reuse, and protect your work." to "Built to help you export, reuse, and protect your work."
  - v1.1 section-comment label changed from "v1.1 — first paid release" to "v1.1 — export, snippets & encrypted backups".
  - Header COPY STATUS block updated to record D-04 APPROVED (2026-07-09); the "pending approval" marker removed.
  - All other entries left exactly as drafted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical hygiene] Removed the literal "first paid release" phrase from the header comment too**
- **Found during:** Task 3 verification (grep after applying edits)
- **Issue:** After applying Ben's two edits, the descriptive header comment I wrote to document the revision still contained the literal phrase "first paid release" twice. Ben's explicit directive was that the asset — INCLUDING its comments — is served to clients, so the internal framing must not appear anywhere in the served file.
- **Fix:** Reworded the header COPY STATUS explanation to describe the revision without repeating the forbidden phrase. Verified `grep -rn "first paid release" assets/changelog-content-en.js` returns nothing.
- **Files modified:** assets/changelog-content-en.js
- **Commit:** 2ed953d

## Verification

- `node tests/42-changelog-integrity.test.js` — 9 passed, 0 failed (structure intact: highlights 2-4, categories ⊆ {new,improved,fixed}, v1.0 origin-only, first == 1.3.0, no emoji).
- `npm test` (full suite) — 162 passed, 0 failed.
- Emoji code-point grep — clean.
- "first paid release" grep across the file — no matches (comments included).

## Requirements Closed

- **CHLG-04** — the v1.3 entry self-hosts as the first, approved changelog entry (pipeline proven on its own release notes).
- CHLG-02 / CHLG-03 body copy finalized (structural entry points landed in plans 04/07/09/10).

## Self-Check: PASSED
- FOUND: assets/changelog-content-en.js
- FOUND commit: f6a50db (Task 1 draft)
- FOUND commit: 2ed953d (Task 3 approved copy)
