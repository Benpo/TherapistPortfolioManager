---
phase: 32-readme-code-comments
plan: 01
subsystem: docs
tags: [readme, documentation, deploy, ci, maintainer-guide, agent-rules]

requires:
  - phase: 31-refactor-god-modules
    provides: "Post-refactor module structure (settings-snippets.js, settings-photos.js, export-modal.js) that the file-map must reflect"
provides:
  - "Rewritten in-repo maintainer README — operational-first (run/deploy/file-map/recipes/agent-rules/troubleshoot)"
  - "6 verified how-do-I recipes anchored to live files"
  - "Rules an agent must not break section (zero-deps, no network, load-order chain, no innerHTML, SW/IDB separation, PRECACHE upkeep)"
  - "Fresh post-refactor file-map that points to .planning/codebase/*.md"
  - "Deploy pipeline no longer publishes README at the product URL"
affects: [32-02, comments-batch-2, future-help-content-phase]

tech-stack:
  added: []
  patterns:
    - "Maintainer README is repo-only agent context, not a published artifact"
    - "Recipes truth-checked against live files (no from-memory drift)"

key-files:
  created: []
  modified:
    - README.md
    - .github/workflows/deploy.yml

key-decisions:
  - "README audience reframed to Ben-solo + AI agents (D-01); old 'for Sapir / multi-machine' framing dropped"
  - "Architecture is pointer-to-codebase-maps, not duplicated (D-08), so it cannot drift"
  - "Removing the README deploy-staging copy is the only production-adjacent change and it ships strictly less (D-04)"

patterns-established:
  - "File-top maintainer guide built from .planning/codebase/STRUCTURE.md + live assets/ listing"
  - "Each recipe anchored to a specific live file and re-verified rather than trusted from memory"

requirements-completed: [DOCS-01]

coverage:
  - id: D1
    description: "README.md rewritten as in-repo maintainer guide with all required sections, post-refactor file-map, 6 verified recipes, and agent-rules section"
    requirement: "DOCS-01"
    verification:
      - kind: other
        ref: "grep gate: Run locally / Deploy / file-map / recipes / Rules an agent must not break / Troubleshoot / .planning/codebase / npm test / python3 -m http.server / APP_VERSION / PRECACHE_URLS / settings-snippets.js / settings-photos.js / export-modal.js all present"
        status: pass
    human_judgment: true
    rationale: "Recipe accuracy against the live files (the 6 how-do-I steps actually matching deploy.yml/version.js/sw.js/package.json mechanics) is a content-correctness judgment greps cannot fully prove; a maintainer should read the recipes once."
  - id: D2
    description: "deploy.yml no longer stages README.md into the published artifact; rest of pipeline byte-for-byte intact except the one removed line"
    requirement: "DOCS-01"
    verification:
      - kind: other
        ref: "grep gate: 'cp README.md' absent; 'cp _headers', 'sed -i', 'Verify no sensitive files' all still present; git diff --stat shows exactly 1 deletion"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-06-29
status: complete
---

# Phase 32 Plan 01: README + Deploy Cleanup Summary

**Root README rewritten into an operational, agent-readable in-repo maintainer guide (run / deploy / file-map / 6 verified recipes / "Rules an agent must not break" / troubleshoot), and the deploy pipeline no longer publishes it at the product URL.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-29T03:30:02Z (approx, plan execution)
- **Completed:** 2026-06-29
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Rewrote `README.md` in place as a single operational-first maintainer guide for Ben + AI agents (D-01/D-03/D-05), keeping the value-prop / "What It Does" / "Privacy by Design" framing and replacing the stale pre-refactor Project-Structure block.
- Authored 6 how-do-I recipes (run tests, ship a change, bump version, edit a translation, add a JS module, add a DB op), each anchored to the live file it documents — `APP_VERSION` described as a constant (not hardcoded), cache derivation noted as auto from `INTEGRITY_TOKEN`, no `cp README.md` step referenced.
- Wrote the "Rules an agent must not break" section sourced from `ARCHITECTURE.md` §Architectural Constraints + §Anti-Patterns: zero-runtime-dependency production, no external network calls, the script-load-order / cross-`window.*` resolution chain, never `innerHTML` for i18n/user data, SW-never-touches-IndexedDB, `PRECACHE_URLS` upkeep + pre-commit SW-bump gotcha, no secrets in client code.
- Built a fresh post-refactor file-map that lists `settings-snippets.js`, `settings-photos.js`, and `export-modal.js`, and points to `.planning/codebase/*.md` for deeper architecture rather than duplicating it (D-08).
- Removed the `cp README.md deploy-staging/` line from `.github/workflows/deploy.yml` so the maintainer README is repo-only (D-04) — reducing information disclosure (T-32-01).

## Task Commits

1. **Task 1: Rewrite README.md into the in-repo maintainer guide** — `c051f31` (docs)
2. **Task 2: Stop publishing the README at the product URL** — `cac8f51` (chore)

## Files Created/Modified
- `README.md` — rewritten in place into the operational maintainer guide
- `.github/workflows/deploy.yml` — one line removed (README no longer staged for deploy)

## Decisions Made
None beyond the plan — executed as specified. The plan's locked decisions (D-01 audience reframe, D-03 single rewrite-in-place README, D-04 stop publishing, D-05 operational-first order, D-08 pointer-not-duplicate architecture) were all honored.

## Deviations from Plan
None - plan executed exactly as written.

## Threat surface
No new surface. The single production-adjacent change (T-32-01) is the removal of the README staging line, which reduces information disclosure. No runtime code, network calls, or data flows introduced. The README contains no secrets, tokens, or private business data (treated as readable by anyone with repo access).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DOCS-01 complete. Plan 32-02 (the 5-file code-comment pilot, DOCS-02) and the planning-seed artifacts (help-content inventory D-13, comment-coverage map D-14) are next in the phase.
- The README's "Rules an agent must not break" and file-map are accurate as of the post-P31 structure; if 32-02 changes any of the 5 target files' shape it does not affect the README (comments-only edits).

## Self-Check: PASSED

- README.md — FOUND
- .github/workflows/deploy.yml — FOUND
- 32-01-SUMMARY.md — FOUND
- Commit c051f31 — FOUND
- Commit cac8f51 — FOUND

---
*Phase: 32-readme-code-comments*
*Completed: 2026-06-29*
