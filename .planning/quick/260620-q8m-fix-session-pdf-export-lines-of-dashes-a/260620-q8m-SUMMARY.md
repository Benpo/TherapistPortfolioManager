---
phase: quick-260620-q8m
plan: 01
subsystem: ui
tags: [pdf-export, jspdf, markdown, parseMarkdown, line-breaks, jsdom, behavior-test]

# Dependency graph
requires:
  - phase: quick-260522-iwr
    provides: the pdf-export Node test harness (jsdom + jsPDF/bidi/Heebo preload + WrappedJsPDF date/id pinning) that this test mirrors
provides:
  - parseMarkdown() preserving intra-paragraph hard line breaks (join("\n") not join(" "))
  - falsifiable doc.text-spy behavior test for own-line rendering of an intra-paragraph dash separator
affects: [pdf-export, session-export, parseMarkdown, editor-preview-fidelity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PDF render-behavior assertion via a per-INSTANCE jsPDF doc.text spy (jsPDF installs text as an own property per doc, NOT on the prototype) capturing { str, y }; distinct baseline-y == distinct rendered rows. Avoids glyph-CID parsing and does not depend on jsdom Blob.arrayBuffer."

key-files:
  created:
    - tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js
  modified:
    - assets/pdf-export.js

key-decisions:
  - "One-line fix: parseMarkdown() joins contiguous paragraph source lines with \"\\n\" instead of \" \" so single intra-paragraph hard line breaks survive into the PDF (jsPDF splitTextToSize treats embedded \\n as a forced break) — matching the editor preview (md-render.js converts single newlines to <br>). No <hr> handling added."
  - "Behavior test reads rows from a doc.text spy rather than from PDF bytes, making it self-sufficient (does not need jsdom Blob.arrayBuffer) and font-revendor-proof."

patterns-established:
  - "Per-instance jsPDF doc.text spy for asserting rendered-row layout in PDF export tests"

requirements-completed: [QUICK-260620-q8m]

# Metrics
duration: ~15min
completed: 2026-06-20
---

# Quick 260620-q8m: Session PDF export — preserve own-line dash separators Summary

**parseMarkdown() now joins paragraph source lines with `\n` (not a space) so a dash separator typed on its own line exports to PDF on its own row, matching the editor preview — proven by a falsifiable doc.text-spy behavior test.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-06-20T17:04:56Z
- **Tasks:** 2
- **Files modified:** 2 (1 source + 1 new test); +1 incidental `sw.js` CACHE_NAME bump (pre-commit hook)

## Accomplishments
- Fixed the editor↔PDF fidelity bug: a line of dashes (`----------------`) typed on its own line between two text lines now renders on its OWN line in the exported PDF instead of being inline-collapsed into `textA ---------------- textB`.
- Added a falsifiable Node behavior test (`tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js`) per the project's behavior-verification policy.
- Verified no regressions in the existing pdf-export test suites.

## Task Commits

Each task was committed atomically (code only — docs commit handled by orchestrator):

1. **Task 1: Preserve intra-paragraph line breaks in parseMarkdown()** — `dd92b3e` (fix)
   - Also includes an incidental `sw.js` `CACHE_NAME` bump (sessions-garden-v208 → v209) auto-added by the repo pre-commit hook because `assets/pdf-export.js` is a cached asset. Expected, documented behavior (MEMORY: reference-pre-commit-sw-bump).
2. **Task 2: Add falsifiable behavior test for own-line dash rendering** — `f1eb7fd` (test)

## Files Created/Modified
- `assets/pdf-export.js` — parseMarkdown() paragraph push now `paraLines.join("\n")` (was `join(" ")`); added an explanatory comment. No other behavior change; no `<hr>` handling.
- `tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js` — new behavior test. Mirrors the quick-260522-iwr harness; spies on each jsPDF doc instance's own `text` method to capture `{ str, y }` per drawn line, groups body draws by rounded baseline-y into rows, and asserts the fixture `"textA\n----------------\ntextB"` renders as 3 distinct rows with a dashes-only row on a separate baseline from textA/textB, and that no single row mixes a dash with a letter.

## Decisions Made
- Followed the plan exactly: the minimal one-line `join(" ")` → `join("\n")` fix, no `<hr>`/horizontal-rule handling (the user wants the literal dashes preserved on their own line, like the preview).
- The test asserts behavior via a doc.text spy (per-instance, since jsPDF installs `text` as an own property on each doc, not on the prototype) instead of parsing glyph CIDs — more robust, font-revendor-proof, and independent of jsdom's Blob implementation.

## Falsifiability spot-check (observed exit codes)

Per the plan's `<verification>`, the join change was temporarily reverted to confirm the test genuinely discriminates the bug:

| pdf-export.js state            | Test result          | Exit code |
| ------------------------------ | -------------------- | --------- |
| Fixed (`paraLines.join("\n")`) | Passed 4/4, Failed 0 | **0**     |
| Reverted (`paraLines.join(" ")`) | Passed 0/4, Failed 4 | **1**     |

On the reverted (pre-fix) code the captured body rows were a single row `"textA ---------------- textB"` at baseline y=115 — exactly the reported bug. On the fixed code the captured rows were `textA` (y=115), `----------------` (y=131), `textB` (y=147) — 3 distinct baselines, dashes on their own row. The fix was restored after the check and re-verified at 4/4 pass.

## Regression Results

| Test                                            | Result               | Exit |
| ----------------------------------------------- | -------------------- | ---- |
| tests/quick-260620-q8m-pdf-paragraph-linebreaks | Passed 4/4           | 0    |
| tests/quick-260522-iwr-ordered-list-export      | Passed 10/10         | 0    |
| tests/pdf-bold-rendering                        | Passed 9/9           | 0    |

## Deviations from Plan

None — plan executed exactly as written (the one-line fix and the test as specified). No deviation rules were triggered.

## Issues Encountered

Test-environment / harness issues (resolved; none affected app code):

1. **Broken jsdom at the canonical path.** `/tmp/node_modules/jsdom` existed only as empty directory skeletons (a `lib/` with zero files) — not resolvable as a module. Reinstalled jsdom (settled on 24.1.3) into `/tmp/node_modules` so the tests could run. This is test infrastructure, not an app dependency.
2. **jsdom does not implement `Blob.prototype.arrayBuffer()`.** No jsdom version in this line implements it (only `slice/size/type`). My NEW test was made self-sufficient (it reads rendered rows from the doc.text spy, not from PDF bytes), so it does not need it. The two EXISTING regression tests DO call `blob.arrayBuffer()` to read the generated PDF bytes; to run them unchanged I provided an external test-runner preload (`/tmp/jsdom-blob-polyfill.cjs`, NOT committed to the repo) that patches the jsdom-realm `Blob` to read bytes from its internal `[Symbol(impl)]._buffer`. With the polyfill both regression suites pass 10/10 and 9/9. The original passing environment must have supplied an equivalent polyfill externally.
3. **jsdom `HTMLCanvasElement.getContext` "Not implemented" throw** aborted the build before the body was drawn in my new test. Stubbed `getContext` to a no-op in the new test's `buildJsdomEnv` (jsPDF does not need a real 2D context to lay out text). The existing tests print the same non-fatal jsdom stub message but recover internally.

## Next Steps / Readiness
- Fix is complete and verified. No follow-up required.
- Note for future PDF test runs in this environment: a complete jsdom must be present at `JSDOM_PATH` (default `/tmp/node_modules/jsdom`), and the existing CID-based regression tests need a `Blob.arrayBuffer` polyfill at the runner level (the new q8m test does not).

## Self-Check: PASSED

- FOUND: `tests/quick-260620-q8m-pdf-paragraph-linebreaks.test.js`
- FOUND: `.planning/quick/260620-q8m-fix-session-pdf-export-lines-of-dashes-a/260620-q8m-SUMMARY.md`
- FOUND commit: `dd92b3e` (Task 1 fix)
- FOUND commit: `f1eb7fd` (Task 2 test)
- VERIFIED: `assets/pdf-export.js:603` contains `paraLines.join("\n")`

---
*Quick task: 260620-q8m*
*Completed: 2026-06-20*
