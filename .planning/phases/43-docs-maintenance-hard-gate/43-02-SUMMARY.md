---
phase: 43-docs-maintenance-hard-gate
plan: 02
subsystem: testing
tags: [docs-gate, vm-loader, test-rename, integrity-guards, D-22, D-17]

# Dependency graph
requires:
  - phase: 39-help-center-entry-point
    provides: help-content-en.js + i18n-en.js vm-sandbox load idiom the loader extracts
  - phase: 42-in-app-changelog-what-s-new
    provides: changelog-content-en.js (window.CHANGELOG_CONTENT_EN) the loader also reads
provides:
  - "scripts/lib/help-loader.js — parameterized vm content loader (loadHelpContentEN / loadChangelogEN / loadHelpBundleEN) shared by the gate, map generator, and integrity guards"
  - "Five integrity guards renamed to the phase-prefix-free {slug}.test.js convention (D-22)"
  - "TESTING.md rename map + corrected live test count"
affects: [43-04-help-locale, 43-05-role-table, 43-06-gate-script]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single shared vm-sandbox loader with a parameterized assetsDir (defaults to repo-root assets/, overridable to a target repo or a throwaway fixture) — one implementation, many callers"
    - "Fail-closed loader: throws a file-named error on any read/eval failure rather than returning a half-populated object (D-04)"
    - "Full-token, longest-first, numeric-prefix-anchored replace scoped to a live allowlist; both-direction machine-checked post-condition (no live miss, no historical clobber)"

key-files:
  created:
    - scripts/lib/help-loader.js
  modified:
    - .gitignore
    - tests/help-integrity.test.js (renamed from 39-help-integrity.test.js)
    - tests/changelog-integrity.test.js (renamed from 42-changelog-integrity.test.js)
    - tests/help-integrity-locale.test.js (renamed from 42_1-help-integrity.test.js)
    - tests/changelog-integrity-locale.test.js (renamed from 42_1-changelog-integrity-locale.test.js)
    - tests/update-integrity-state.test.js (renamed from 28-04-integrity-state.test.js)
    - tests/40-i18n-parity.test.js
    - tests/29-01-crashlog-capture.test.js
    - assets/help-content-en.js
    - assets/help-content-he.js
    - assets/help-content-de.js
    - assets/help-content-cs.js
    - assets/changelog-content-en.js
    - assets/changelog-content-he.js
    - assets/changelog-content-de.js
    - assets/changelog-content-cs.js
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/codebase/TESTING.md

key-decisions:
  - "help-loader.js parameterizes assetsDir so the gate (43-06) can point it at a TARGET repo root and the RED/GREEN fixture test (43-01) at a throwaway dir — never its own __dirname"
  - "Renamed-file cross-references (comments like 'mirror 39-help-integrity.test.js') are LIVE filename references and were updated too — the D-22 post-condition scans ALL live tests/ files, so leaving them would fail direction (i)"
  - "scripts/ was blanket-gitignored; added targeted .gitignore negations (!scripts/lib/, !scripts/docs-gate.js) so the gate tooling is version-controlled for CI + pre-push while ad-hoc local scripts stay ignored"

requirements-completed: [GATE-02]

coverage:
  - id: D17
    description: "Shared vm-sandbox content loader extracted to one module both the gate and the integrity tests can require"
    requirement: GATE-02
    verification:
      - kind: unit
        ref: "node -e require('./scripts/lib/help-loader.js') loadHelpContentEN()=12 sections, loadChangelogEN()=4 entries"
        status: pass
    human_judgment: false
  - id: D22
    description: "Five integrity guards renamed (phase prefixes dropped); live refs updated on allowlist only; both-direction before/after post-condition proves no historical clobber and no missed live reference"
    requirement: GATE-02
    verification:
      - kind: unit
        ref: "assert-rename-postcondition.sh → POSTCOND-OK (dir i: no live old-token; dir ii: no historical file modified since base SHA)"
        status: pass
    human_judgment: false

status: complete
---

# Phase 43 Plan 02: Wave-1 Loader + Integrity-Guard Rename Summary

Laid the Wave-1 foundation: extracted the single shared vm-sandbox content loader (`scripts/lib/help-loader.js`, D-17) that the gate, map generator, and integrity guards all require, and executed the D-22 five-file rename with its two-direction, machine-checked before/after post-condition.

## Accomplishments

- **`scripts/lib/help-loader.js`** — a plain CommonJS module (fs/path/vm only, no jsdom) that evaluates the help/changelog content scripts in a fresh vm sandbox with a fake `window` and silenced `console`. Exports `loadHelpContentEN(assetsDir)` (sections array), `loadChangelogEN(assetsDir)` (changelog array), and `loadHelpBundleEN(assetsDir)` (`{ sections, deeplinks, i18n }` for callers resolving `{ui:key}` tokens). The assets directory is a **parameter** defaulting to repo-root `assets/`, so 43-06's gate can point it at a target repo root and 43-01's RED/GREEN test at a throwaway fixture. Fails closed: any read/eval error throws with the offending filename (D-04). Verified: `loadHelpContentEN()` → 12 sections, `loadChangelogEN()` → 4 entries.
- **Five integrity guards renamed via `git mv`** (phase prefixes dropped, `{slug}.test.js` shape, D-23):
  - `39-help-integrity` → `help-integrity`
  - `42-changelog-integrity` → `changelog-integrity`
  - `42_1-help-integrity` → `help-integrity-locale`
  - `42_1-changelog-integrity-locale` → `changelog-integrity-locale`
  - `28-04-integrity-state` → `update-integrity-state`
  All three still-green guards (`help-integrity`, `changelog-integrity`, `update-integrity-state`) pass under their new names; both locale guards remain green. `tests/run-all.js`'s glob auto-discovers the new names with no wiring change.
- **Live filename references updated** across the allowlist only — the two referencing tests (`40-i18n-parity`, `29-01-crashlog-capture`), the eight content files, and `REQUIREMENTS.md` + `ROADMAP.md` — using a full-token, longest-first, numeric-prefix-anchored replace so `help-integrity` never collided with `help-integrity-locale`. Phase/plan/decision-ID citations (e.g. "Plan 04", "Phase 39") were left untouched.
- **TESTING.md** now carries the old→new rename map (deliberately retaining old tokens — that is its purpose) and the corrected live test count (**166**, was the stale "106").

## The auditable D-22 conviction (before/after grep)

The rename ran on **live files only**; the claim is machine-proven, not promised. `GSD_PLAN_BASE_SHA=3e8644e` (the commit immediately before this plan's first commit).

- **Before-set: 76 files** containing an old token = 50 historical (`.planning/phases/{≠43}`, `.planning/milestones/`) + 9 phase-43 planning docs (incl. `assert-rename-postcondition.sh`) + **17 live targets** (5 renamed guards + `40-i18n-parity` + `29-01-crashlog` + 8 content files + `REQUIREMENTS.md` + `ROADMAP.md`).
- **After-set: 60 files** = 50 historical (untouched) + 9 phase-43 docs (untouched) + `TESTING.md` (new rename map). All 17 live targets are now clean.
- **Diff = the 17 live files cleaned, plus TESTING.md gaining the map.** 76 − 17 + 1 = 60. ✓
- **`assert-rename-postcondition.sh` → `POSTCOND-OK`:**
  - Direction (i) — no live file (`assets/**`, `tests/**`, `REQUIREMENTS.md`, `ROADMAP.md`) retains any of the 5 old tokens.
  - Direction (ii) — a **content diff** (`git diff --name-only 3e8644e..HEAD -- .planning/phases/ .planning/milestones/`, excluding `43-*`) confirms **no historical artifact was modified at all**. A grep alone could miss a clobber that left the token intact; the diff cannot.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `scripts/` was blanket-gitignored**
- **Found during:** Task 1 (first `git add scripts/lib/help-loader.js`)
- **Issue:** `.gitignore` line 10 (`scripts/`) ignored the entire directory, so the loader — and the whole phase-43 gate tooling (`scripts/docs-gate.js` in 43-06, `scripts/lib/role-table.js` in 43-05) that CI (`deploy.yml`) and the pre-push hook must execute — could not be committed. The gate cannot run in CI if its source is not version-controlled.
- **Fix:** Replaced `scripts/` with `scripts/*` + targeted negations `!scripts/lib/` and `!scripts/docs-gate.js`, so the gate tooling is tracked while ad-hoc local scripts (e.g. `scripts/foo-local.sh`) stay ignored. Verified via `git check-ignore`.
- **Files modified:** `.gitignore`
- **Commit:** f69f634

**2. [Rule 1 - Correctness] Renamed-file cross-references also updated (not only self-refs)**
- **Found during:** Task 2
- **Issue:** The plan's Task 2 prose says to update "ONLY" each renamed file's self-referential filename tokens, but the Task 3 D-22 post-condition (direction i) scans **all** live `tests/**` files for old tokens. Comments inside the renamed guards (e.g. `changelog-integrity.test.js` referencing "mirror 39-help-integrity", `help-integrity-locale.test.js` referencing "the 39-help-integrity idiom") are live filename references that would fail direction (i) and halt the plan if left.
- **Fix:** Applied the full-token replace to the renamed files' cross-references too. These are live filename tokens, not historical citations, so updating them is correct (Ben's "don't rewrite the record" concern applies to `.planning/phases` history, which direction (ii) protects — not to live test comments). Phase/plan/decision-ID citations were still left untouched.
- **Files modified:** the 5 renamed test files
- **Commit:** a4e537b

## Verification

- `node -e` loader check → `OK 12 sections 4 entries`.
- Task 2 verify → `RENAME-OK` (5 new names present, no old name survives, 3 green guards pass under new names).
- `node -c` clean on all 5 renamed + 2 referencing tests and the edited assets; both locale guards run green (no regression).
- `assert-rename-postcondition.sh` → `POSTCOND-OK` (both directions, whole-repo, fail-closed on unset base SHA).
- TESTING.md carries the rename map (old tokens present by design) and the live count 166.

## Note for the phase runner

`npm test` still reports the two 43-01 RED specs (`docs-gate.test.js`, `docs-gate-role-table.test.js`) as failing — that is the intended Wave-1 RED state (they go GREEN when 43-05/43-06 land the role table and gate), not a regression introduced here.

## Self-Check: PASSED

- FOUND: scripts/lib/help-loader.js
- FOUND: tests/help-integrity.test.js, changelog-integrity.test.js, help-integrity-locale.test.js, changelog-integrity-locale.test.js, update-integrity-state.test.js
- FOUND: .planning/codebase/TESTING.md
- GONE: all five old test filenames
- FOUND commits: f69f634 (Task 1), a4e537b (Task 2), 51ddaa7 (Task 3)
