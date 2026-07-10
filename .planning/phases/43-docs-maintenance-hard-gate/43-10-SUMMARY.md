---
phase: 43-docs-maintenance-hard-gate
plan: 10
subsystem: ci-docs-gate
tags: [docs-gate, fail-closed, version-parse, invariant, tripwire, tdd, gap-closure]
requires: [scripts/docs-gate.js, scripts/lib/invariants.js, assets/version.js]
provides: [scripts/lib/version-parse.js, invariants.checkVersionParse]
affects: [scripts/docs-gate.js, scripts/lib/invariants.js, tests/docs-gate.test.js]
tech-stack:
  added: []
  patterns: [single-source-of-truth-extractor, fifth-invariant-fail-closed-tripwire, red-green-falsifier, source-parser-allowlist]
key-files:
  created:
    - scripts/lib/version-parse.js
    - tests/docs-gate-version-parse.test.js
  modified:
    - scripts/lib/invariants.js
    - scripts/docs-gate.js
    - tests/30-fake-test-detector.test.js
decisions:
  - "extractAppVersion is lifted into scripts/lib/version-parse.js as the ONE shared implementation; both the gate's release-moment check and the new invariant consume it, so no forked copy can drift (D-17)."
  - "A FIFTH invariant checkVersionParse(repoRoot) reads the live assets/version.js and THROWS if the shared extractor returns null — a benign version.js reformat now fails the NEXT push closed instead of silently, permanently disabling GATE-04 (WR-06)."
  - "checkVersionParse also fails closed on an unreadable assets/version.js (a missing file is as bad as an unparseable literal)."
  - "The new behavior test docs-gate-version-parse.test.js is allowlisted in the fake-test detector (Rule 3): extractAppVersion is a source-text parser by design, so reading version.js and feeding it to the parser/invariant is the correct test shape, not source-slicing."
requirements: [GATE-04]
metrics:
  duration: ~15min
  completed: 2026-07-10
status: complete
---

# Phase 43 Plan 10: Version-Parse Tripwire — GATE-04 Can No Longer Silently Self-Disable Summary

Gave GATE-04's release-moment check a fail-closed tripwire: the APP_VERSION extractor now lives in one shared module consumed by both the gate and a new fifth invariant, and that invariant throws on the next push if a benign `assets/version.js` reformat ever stops the extractor from parsing — closing WR-06, the exact "docs rot with no tripwire" failure class the phase exists to prevent, which was sitting inside the phase's own release-detection logic.

## What Was Built

- **`scripts/lib/version-parse.js` (new)** — exports `extractAppVersion(src)` with byte-for-byte the semantics of the former local copy in `docs-gate.js`: `null` on falsy input, otherwise the first capture of `/APP_VERSION\s*[:=]\s*['"](\d+\.\d+\.\d+)['"]/` or `null`. This is now the single source of the release-moment literal parse (D-17).

- **`scripts/lib/invariants.js`** — new fifth invariant `checkVersionParse(repoRoot)`, following the shape of the existing four: resolves `path.join(repoRoot || DEFAULT_REPO_ROOT, 'assets', 'version.js')`, reads it with `fs` (throwing a clear "cannot read assets/version.js" message if unreadable — fail closed), and throws an Error naming `version.js` and `APP_VERSION`/the extractor if `versionParse.extractAppVersion(src)` is `null`. Returns quietly on success. Added to `module.exports`. The four pre-existing checks are unchanged.

- **`scripts/docs-gate.js`** — the local `extractAppVersion` function is removed and replaced by `require('./lib/version-parse.js')`; the two release-moment call sites in `runRangeRule` (`oldVer`/`newVer`) now call `versionParse.extractAppVersion(...)`. `runInvariants()` calls `invariants.checkVersionParse()` in Phase 1 after `checkRoleTable()`, so a format drift fails closed before the range is ever inspected. Exactly one `extractAppVersion` implementation exists in the repo after this change.

- **`tests/docs-gate-version-parse.test.js` (new)** — a falsifiable behavior spec (D-21) covering: non-null on the live `version.js`; null on backtick/renamed/empty/falsy drift; `checkVersionParse()` quiet on the live repo; `checkVersionParse(tmpRoot)` THROWS on a temp repo with a drifted (backtick) literal and on an absent file, and PASSES on a temp repo with a valid literal. Temp dirs are cleaned up in `finally`.

## How It Was Verified

- `node tests/docs-gate-version-parse.test.js` — 7 passed, 0 failed (extractor + invariant behaviors).
- `node tests/docs-gate.test.js` — 20 passed, 0 failed (the behavior spec, GREEN with the shared extractor and the new Phase-1 invariant, because `runInvariants` targets the gate's own repo whose live `version.js` parses).
- `node tests/run-all.js` — 168 passed, 0 failed (full suite).
- Acceptance greps: `grep -c 'function extractAppVersion' scripts/docs-gate.js` → 0; `... scripts/lib/version-parse.js` → 1; `checkVersionParse` present inside `runInvariants`.
- **Manual tripwire proof (Task 2 acceptance):** temporarily backtick-quoting the live `assets/version.js` APP_VERSION literal made `node scripts/docs-gate.js --range HEAD~1..HEAD` exit 1 with a Phase-1 message naming `version.js`; restoring the file returned exit 0 with no working-tree diff. Confirmed, then reverted — the drift was never committed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] New behavior test tripped the fake-test detector suite gate**
- **Found during:** Task 2 (full-suite run `node tests/run-all.js`)
- **Issue:** `tests/30-fake-test-detector.test.js` flagged `docs-gate-version-parse.test.js` as a "source-slicer" because it reads `assets/version.js` as text but does not pass a variable to a vm/eval/runInContext execution sink. This failed the suite (167/1).
- **Root cause / rationale:** By design, `extractAppVersion` IS a source-text parser (it lifts the version literal out of the file) and the fifth invariant reads the live file — so a source read fed to the parser is the CORRECT test shape, not a fake. This is directly analogous to the already-allowlisted `docs-gate` entry whose execution sink the detector likewise cannot see.
- **Fix:** Added `docs-gate-version-parse` to the detector's `ALLOWLIST` (and its header comment) with a justification. No behavior change to the detector's real scan.
- **Files modified:** `tests/30-fake-test-detector.test.js`
- **Commit:** 40fd255

## Known Stubs

None.

## Threat Flags

None — this plan removes a fail-open surface (release-moment self-disable) and introduces no new network endpoint, auth path, file-access pattern, or schema change. The two registered threats (T-43-10-01 release-moment self-disable; T-43-10-02 forked extractor drift) are both mitigated: the fifth invariant is the tripwire, and the single shared `version-parse.js` is the anti-drift measure.

## Notes for Downstream

- The out-of-scope GATE-04 live-ship proof at the v1.3.0 milestone close remains a human/milestone-close item (43-07's SUMMARY records it open) — not closable at phase scope.
- None of the files this plan touches classify as `trigger` in `role-table.js` (all under `scripts/**` or `tests/**`), so the eventual push needs no changelog/help trailer.

## Self-Check: PASSED

- All created/modified files present on disk (version-parse.js, docs-gate-version-parse.test.js, invariants.js, docs-gate.js, 30-fake-test-detector.test.js, 43-10-SUMMARY.md).
- Both task commits verified in git log: 356a79a (Task 1), 40fd255 (Task 2).
