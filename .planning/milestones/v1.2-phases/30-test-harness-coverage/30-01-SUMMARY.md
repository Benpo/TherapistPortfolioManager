---
phase: 30-test-harness-coverage
plan: 01
subsystem: testing
tags: [npm, jsdom, node, test-runner, package-json]

# Dependency graph
requires: []
provides:
  - "First-ever root package.json (npm dev/test boundary, devDependencies-only)"
  - "tests/run-all.js suite runner + npm test single command (TEST-04)"
  - "JSDOM_PATH bridge resolving the 8 legacy jsdom tests to the installed devDependency"
  - "engines.node >=18.0.0 floor pinning native Blob.prototype.arrayBuffer (D-05 PDF fix)"
affects: [30-02, 30-03, 30-04, 30-05, 30-06, phase-31-refactor]

# Tech tracking
tech-stack:
  added: [jsdom@^29.1.1 (devDependency)]
  patterns:
    - "npm dev/test boundary: package.json carries devDependencies only; production stays zero-runtime-dependency"
    - "run-all.js discovery runner: readdirSync top-level *.test.js, spawn node per file, continue-on-fail, aggregate non-zero exit"
    - "Unconditional JSDOM_PATH bridge overriding stale legacy /tmp exports (F-G)"

key-files:
  created: [package.json, package-lock.json, tests/run-all.js]
  modified: []

key-decisions:
  - "engines.node floor set to >=18.0.0 (not higher) — the exact version where native Blob.prototype.arrayBuffer landed; over-pinning would block contributors (Pitfall 3)"
  - "JSDOM_PATH set unconditionally to repo node_modules/jsdom, overriding inherited values; a caller override is honored only when it resolves on disk (F-G)"
  - "package-lock.json committed for reproducible installs and lockfile review (threat T-30-01)"

patterns-established:
  - "Pattern: single documented green command `npm test` gates the whole suite and will guard the Phase 31 refactor"
  - "Pattern: suite runner is top-level-only discovery, so tests/_helpers/ is never executed as tests"

requirements-completed: [TEST-04, TEST-01]

coverage:
  - id: D1
    description: "Root package.json: private, devDependencies-only (jsdom ^29.1.1), engines.node >=18.0.0, scripts.test, no dependencies key"
    requirement: "TEST-04"
    verification:
      - kind: unit
        ref: "node -e assert (p.private, devDependencies.jsdom, !dependencies, engines.node '>=18.0.0', scripts.test) → 'assert ok'"
        status: pass
    human_judgment: false
  - id: D2
    description: "npm test runs every top-level tests/*.test.js green and exits 0 (87/87), excluding tests/_helpers/"
    requirement: "TEST-04"
    verification:
      - kind: integration
        ref: "npm test → 'Suite: 87 passed, 0 failed, 87 total'; exit=0"
        status: pass
    human_judgment: false
  - id: D3
    description: "npm test exits non-zero if any single test file fails (the Phase 31 guard)"
    requirement: "TEST-04"
    verification:
      - kind: integration
        ref: "temp tests/zz-temp-fail.test.js calling process.exit(1) → 'Suite: 87 passed, 1 failed'; exit=1"
        status: pass
    human_judgment: false
  - id: D4
    description: "8 jsdom tests resolve jsdom from the installed devDependency; bridge survives a stale inherited JSDOM_PATH=/tmp/... export (F-G)"
    requirement: "TEST-01"
    verification:
      - kind: integration
        ref: "JSDOM_PATH=/tmp/does-not-exist npm test → 'Suite: 87 passed, 0 failed'; exit=0; 0 jsdom FATAL"
        status: pass
    human_judgment: false
  - id: D5
    description: "engines.node >=18.0.0 floor pins native Blob.prototype.arrayBuffer so the PDF blob path cannot regress (D-05, TEST-01 root cause b)"
    requirement: "TEST-01"
    verification:
      - kind: unit
        ref: "package.json engines.node === '>=18.0.0' (asserted in D1)"
        status: pass
    human_judgment: false

# Metrics
duration: 2min
completed: 2026-06-26
status: complete
---

# Phase 30 Plan 01: Test Harness Foundation Summary

**First-ever root package.json (jsdom-only devDependency, Node >=18 floor) plus a `tests/run-all.js` runner that makes `npm test` run the full 87-file suite green and bridges the 8 legacy jsdom tests off the fragile `/tmp` convention.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-26T21:36:35Z
- **Completed:** 2026-06-26T21:39:00Z
- **Tasks:** 2
- **Files modified:** 3 (package.json, package-lock.json, tests/run-all.js)

## Accomplishments
- Established the project's first npm dev/test boundary: `package.json` with `private:true`, `devDependencies={jsdom ^29.1.1}` only, and a `>=18.0.0` Node floor — production stays genuinely zero-runtime-dependency (no `dependencies` key).
- Added `tests/run-all.js`, the single documented `npm test` command (TEST-04): it discovers every top-level `tests/*.test.js`, runs each in its own node child, continues on failure, prints per-file PASS/FAIL plus a summary, and exits non-zero if any single file fails — the green gate that will guard the Phase 31 refactor.
- Built the unconditional JSDOM_PATH bridge (F-G) so the 8 legacy jsdom tests resolve jsdom from the installed devDependency; verified the bridge survives a stale inherited `JSDOM_PATH=/tmp/...` export with zero jsdom FATALs.
- Pinned `engines.node >=18.0.0`, the D-05 fix that makes the PDF tests' `blob.arrayBuffer` root cause (TEST-01 root cause b) impossible to recur.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create root package.json and install jsdom** - `f4be52a` (chore)
2. **Task 2: Create tests/run-all.js suite runner with JSDOM_PATH bridge** - `82aed23` (feat)

## Files Created/Modified
- `package.json` - First-ever root config: private, devDependencies-only (jsdom ^29.1.1), engines.node >=18.0.0, scripts.test = node tests/run-all.js
- `package-lock.json` - Generated lockfile for reproducible jsdom installs (reviewed per threat T-30-01)
- `tests/run-all.js` - Suite runner: top-level discovery, continue-on-fail, aggregate non-zero exit, unconditional JSDOM_PATH bridge

## Decisions Made
- Set `engines.node` floor to exactly `>=18.0.0` — Node 18 is where native `Blob.prototype.arrayBuffer` landed; raising it higher would needlessly block contributors (Pitfall 3).
- JSDOM_PATH is set unconditionally to the repo's `node_modules/jsdom`, overriding any inherited value; a caller-supplied override is honored only when `fs.existsSync` confirms it resolves (F-G) — a "default only if unset" guard would let a stale `/tmp` export FATAL all 8 jsdom tests.
- Committed `package-lock.json` alongside `package.json` so the sole new dependency is pinned and the lockfile is reviewable (threat T-30-01 mitigation).

## Deviations from Plan
None - plan executed exactly as written. (`package-lock.json` was generated by the planned `npm install` and committed as part of the dependency footprint; the plan's `files_modified` lists `package.json`/`tests/run-all.js`, and the lockfile is the expected install byproduct.)

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Contributors run `npm install` then `npm test`.

## Next Phase Readiness
- Green `npm test` (87/87) and the npm boundary are in place — plan 30-02 can add the shared `tests/_helpers/jsdom-pdf-env.js` and `app-stub.js` against an installed jsdom.
- The JSDOM_PATH bridge is a temporary compatibility layer; plan 30-03 migrates the 7 PDF tests onto the shared helper, after which individual tests no longer need the legacy env fallback.
- No blockers.

---
*Phase: 30-test-harness-coverage*
*Completed: 2026-06-26*

## Self-Check: PASSED
- All created files present (package.json, package-lock.json, tests/run-all.js, 30-01-SUMMARY.md)
- All task commits exist in git history (f4be52a, 82aed23)
