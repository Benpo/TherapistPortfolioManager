---
phase: 42-in-app-changelog-what-s-new
plan: "02"
subsystem: changelog
tags: [tests, tdd, red, changelog, whats-new, integrity, jsdom, vm]
status: complete
requires:
  - "tests/39-help-render.test.js (jsdom render harness analog)"
  - "tests/39-help-integrity.test.js (vm-sandbox integrity analog)"
  - "tests/_helpers/app-stub.js (App.* stub with getLanguage seam)"
provides:
  - "tests/42-changelog-render.test.js — RED gate pinning window.Changelog.render() page behavior (T-42-V7/V8)"
  - "tests/42-changelog-integrity.test.js — RED gate pinning window.CHANGELOG_CONTENT_EN schema (T-42-V9)"
  - "Seam contract for Plan 06 (window.Changelog.render + #changelogEntries/.changelog-entry/.changelog-cat DOM)"
  - "Schema contract for Plan 04 (single CHANGELOG_CONTENT_EN source, D-08/D-10/D-01/CHLG-04)"
affects:
  - "Plan 04 (changelog-content-en.js) — turns integrity GREEN"
  - "Plan 06 (changelog.js) — turns render GREEN"
tech-stack:
  added: []
  patterns:
    - "RED-first behavior/integrity gates authored before implementation (project rule)"
    - "Clean existence-guard RED (labeled message + exit 1) instead of an ENOENT stack, so RED fails for the right reason"
    - "vm-sandbox load of the REAL data module (not a fixture) for genuine integrity validation"
    - "jsdom render driven through a window.Changelog test seam mirroring window.Help"
key-files:
  created:
    - tests/42-changelog-render.test.js
    - tests/42-changelog-integrity.test.js
  modified: []
decisions:
  - "Render test seeds its OWN window.CHANGELOG_CONTENT_{EN,HE} fixtures (independent of Plan 04) and builds a minimal inline shell skeleton so the ONLY missing piece is assets/changelog.js — RED for the right reason."
  - "Defined the Plan-06 DOM seam contract in the test header: #changelogEntries container, one .changelog-entry per EN entry with id===anchor, .changelog-cat[data-cat] blocks (absent categories omitted), .changelog-entry--origin one-liner."
  - "EN-fallback (D-16) pinned two ways: whole-locale-absent AND per-entry-missing both fall back to EN, with history always complete (driven by the canonical EN order)."
  - "Integrity semver reverse-chron proven falsifiable (GREEN on a valid temp fixture, correct FAIL on a reorder mutation) before shipping, catching an initially-inverted comparison."
metrics:
  duration: 6min
  tasks: 2
  files: 2
  completed: "2026-07-09"
---

# Phase 42 Plan 02: Changelog RED Behavior + Integrity Tests Summary

Two RED-first test gates that pin the changelog PAGE render (T-42-V7/V8) and the single DATA-SOURCE integrity + self-hosting v1.3 entry (T-42-V9) before any implementation exists — guarding the two hardest correctness claims (one source drives both surfaces; the data shape is Phase-43-checkable).

## What was built

- **`tests/42-changelog-render.test.js`** (commit `09964ce`) — jsdom gate mirroring `tests/39-help-render.test.js`. Seeds its own `window.CHANGELOG_CONTENT_EN` (v1.3 with `{new, improved}` but no `fixed`; v1.2 with all three; v1.0 `origin:true`), evals the (absent) `assets/changelog.js`, drives `window.Changelog.render()`, and asserts:
  - **T-42-V7**: reverse-chron card order (v1-3 → v1-2 → v1-0); absent category renders no block (D-11); v1.0 origin renders as a one-line marker with zero category blocks (D-01); each card `id` === its kebab `anchor`.
  - **T-42-V8** (D-16 EN-fallback): a whole missing locale array falls back to EN; a partial locale array falls back per-entry to EN while keeping history complete (v1.2 shows EN lede, v1.3 shows HE lede).
  - A vacuous-green guard (15th assertion) so a silent skip can't exit green.
- **`tests/42-changelog-integrity.test.js`** (commit `c66b200`) — vm-sandbox gate mirroring `tests/39-help-integrity.test.js`. Loads the REAL `assets/i18n-en.js` + `assets/changelog-content-en.js` and asserts: unique valid semver + strictly reverse-chron; unique non-empty kebab anchors; content entries have a non-empty `lede`, `highlights[2-4]` (D-08), and `categories` keys ⊆ {new,improved,fixed} each a non-empty string array; v1.0 is `origin:true` with no highlights/categories (D-01); the first element is `1.3.0` with highlights (self-hosting, CHLG-04); no emoji in any string field (D-10, same regex as the shipped i18n no-emoji gate).

Both fail RED via a clean labeled existence guard (not an ENOENT stack), are valid JS (`node -c` passes), and are auto-discovered by `tests/run-all.js` (`tests/*.test.js`). Plan 04 turns the integrity gate GREEN; Plan 06 turns the render gate GREEN.

## Verification performed

- `node -c` passes on both files.
- Both exit non-zero now (RED) for the right reason: missing `assets/changelog.js` / `assets/changelog-content-en.js` respectively.
- **Falsifiability of the integrity gate proven** by temporarily creating a valid `assets/changelog-content-en.js` fixture: 9/9 GREEN; then injecting an out-of-order (`1.2.5` before `1.3.0`) mutation → the reverse-chron and first-entry checks FAIL (exit 1). The temp file was removed afterward (specific-file `rm` of a file I created, never `git clean`); working tree confirmed clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed inverted semver reverse-chron comparison**
- **Found during:** Task 2 falsifiability check
- **Issue:** The first draft of the reverse-chron test used `if (cmpSemverDesc(prev, cur) >= 0) continue;`, which inverted the pass/fail logic — it would have passed on mis-ordered data and failed on correctly-ordered data (a false gate). This would not have surfaced during the RED phase (data module absent), only silently after Plan 04.
- **Fix:** Rewrote to throw when `c > 0` (cur newer than prev) and when `c === 0` (adjacent equal), with a clarifying comment on `cmpSemverDesc` sign semantics.
- **Files modified:** tests/42-changelog-integrity.test.js
- **Commit:** c66b200 (fix folded into the task commit, before the file was ever GREEN)

**2. [Rule 1 - Bug] Reverted premature requirements completion (state hygiene)**
- **Found during:** State updates
- **Issue:** `requirements.mark-complete` (run from this plan's frontmatter `requirements: [CHLG-02, CHLG-03, CHLG-04]`) flipped those three to Complete in REQUIREMENTS.md. But this plan only authored RED tests — the changelog page (CHLG-02), single data source (CHLG-03), and v1.3 self-hosting (CHLG-04) are NOT implemented yet, and those same requirement IDs are shared with the implementation plans 03/04/07/08. Marking them Complete now is a false "satisfied" signal a phase audit would trust.
- **Fix:** Reverted REQUIREMENTS.md to its prior state (`[ ]` / Pending) via `git checkout -- .planning/REQUIREMENTS.md`. The owning implementation plans will mark them complete when the features actually land.
- **Files modified:** none shipped (revert only)

## Known Stubs

None. These are test-only RED gates; no product code, no data stubs.

## Threat surface

No new security surface. Both files are read-only test harnesses (jsdom eval / vm sandbox) that write no production files. The integrity gate itself implements the T-42-04 mitigation (D-10 no-emoji contract on all data strings); the T-42-01 render-path textContent mitigation is asserted by the render gate's structure and lands in Plan 06.

## Self-Check: PASSED

- FOUND: tests/42-changelog-render.test.js
- FOUND: tests/42-changelog-integrity.test.js
- FOUND commit: 09964ce (render gate)
- FOUND commit: c66b200 (integrity gate)
