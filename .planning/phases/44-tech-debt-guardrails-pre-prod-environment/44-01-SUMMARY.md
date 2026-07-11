---
phase: 44-tech-debt-guardrails-pre-prod-environment
plan: 01
subsystem: testing
tags: [comment-hygiene, conventions, source-audit, docs-gate, tech-debt]

requires:
  - phase: 36-code-comments-batch-2
    provides: D-07 strip-all-planning-IDs rule + 36-COMMENT-STYLE-GUIDE.md (the source rules folded into CONVENTIONS.md)
provides:
  - Rewritten .planning/codebase/CONVENTIONS.md §Comments (strip-all-planning-IDs rule + both rationales + 4-slot banner shape + {slug}.test.js naming rule)
  - De-IDed assets/add-client.js large-photo console.warn (runtime leak removed)
  - tests/conventions-hygiene.test.js (offline source-audit pinning both changes)
  - REQUIREMENTS.md / ROADMAP.md aligned to the DEBT-01 re-cut (no gate ships v1.4)
affects: [comment-hygiene-v1.5-retrofit, forward-grep-gate, future phase planning/execution comment conventions]

tech-stack:
  added: []
  patterns:
    - "Offline source-audit test (readFileSync + assert on source text) for doc/string invariants — allowlisted in 30-fake-test-detector as a legit static guard"

key-files:
  created:
    - tests/conventions-hygiene.test.js
  modified:
    - .planning/codebase/CONVENTIONS.md
    - assets/add-client.js
    - tests/30-fake-test-detector.test.js
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/todos/pending/2026-07-10-comment-hygiene-retrofit-and-forward-gate.md

key-decisions:
  - "New test filename is conventions-hygiene.test.js (no 44- prefix) — the D-04 rule applied to its own first artifact, despite RESEARCH/PATTERNS naming it 44-conventions-hygiene.test.js"
  - "Fixed the CONVENTIONS.md Naming Patterns test-file line too (not only §Comments) to avoid shipping a fresh in-file self-contradiction — the exact bug class this phase fixes"
  - "No enforcement gate shipped (D-01) — the forward grep-gate defers to v1.5 with the ~680-line retrofit"

patterns-established:
  - "Comment convention of record: shipped code carries NO planning IDs; git blame is the durable trace; real technical tokens (AES-256/SHA-256/schema v1-v6/IDBDatabase) are content, not IDs"

requirements-completed: [DEBT-01]

coverage:
  - id: D1
    description: "CONVENTIONS.md §Comments drops the phase/plan citation mandate and carries the strip-all-planning-IDs rule (both rationales + 4-slot banner + {slug}.test.js rule)"
    requirement: "DEBT-01"
    verification:
      - kind: unit
        ref: "tests/conventions-hygiene.test.js#CONVENTIONS.md §Comments no longer instructs agents to cite the phase and plan"
        status: pass
      - kind: unit
        ref: "tests/conventions-hygiene.test.js#CONVENTIONS.md §Comments carries the strip-all-planning-IDs rule"
        status: pass
    human_judgment: false
  - id: D2
    description: "The single runtime planning-ref leak — assets/add-client.js large-photo console.warn — no longer prints a decision-ID token, keeps the no-hard-cap rationale in plain prose"
    requirement: "DEBT-01"
    verification:
      - kind: unit
        ref: "tests/conventions-hygiene.test.js#assets/add-client.js large-photo console.warn prints no decision-ID token"
        status: pass
    human_judgment: false
  - id: D3
    description: "REQUIREMENTS.md DEBT-01 + ROADMAP.md Phase 44 criterion 1 describe only the CONVENTIONS fix + console.warn reword; the forward gate is recorded as a v1.5 deferred item in both docs; the retrofit todo carries a dated Phase-44-handled note"
    requirement: "DEBT-01"
    verification:
      - kind: manual_procedural
        ref: "read REQUIREMENTS.md DEBT-01 + Deferred/Future; ROADMAP.md phase bullet + criterion 1 + deferred entry; retrofit todo Phase-44-handled note"
        status: pass
    human_judgment: true
    rationale: "Doc-alignment intent (does the prose match the re-cut and correctly defer the gate) is a judgment call not fully captured by an automated assertion"

duration: 7min
completed: 2026-07-11
status: complete
---

# Phase 44 Plan 01: DEBT-01 Comment-Hygiene "Stop the Bleeding" Summary

**Rewrote CONVENTIONS.md §Comments to the strip-all-planning-IDs rule (root-cause fix), removed the one runtime planning-ref leak in add-client.js, and pinned both with an offline source-audit — no enforcement gate shipped (deferred to v1.5).**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-07-11T20:46:58Z
- **Completed:** 2026-07-11T20:53:21Z
- **Tasks:** 3
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments
- Replaced the CONVENTIONS.md §Comments "cite the phase and plan … do not omit" mandate — the documented root cause of planning-ref leakage — with the Phase 36 D-07 strip-all-planning-IDs rule, recording BOTH rationales (archived-`.planning/` dangling refs + `assets/**` customer DevTools exposure), the 4-slot banner shape (`OWNS · PUBLIC SURFACE · DEPENDENCIES · CONSTRAINTS`), and the `{slug}.test.js` no-phase-number test-naming rule.
- Removed the sole RUNTIME leak: `assets/add-client.js` large-photo `console.warn` no longer prints `per D-23` — the no-hard-cap rationale stays in plain prose (exactly one shipped line changed).
- Added `tests/conventions-hygiene.test.js`, a pure offline source-audit (no phase-number prefix — the D-04 rule applied to its own first artifact) that fails RED and goes GREEN on the edits; full suite stays 170/170.
- Aligned REQUIREMENTS.md + ROADMAP.md to the re-cut and added a dated Phase-44-handled note to the retrofit todo.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author the DEBT-01 hygiene source-audit (RED)** - `94106ce` (test)
2. **Task 2: Rewrite CONVENTIONS.md §Comments + reword add-client.js console.warn (GREEN)** - `09ab1f3` (feat)
3. **Task 3: Align REQUIREMENTS/ROADMAP + record docs-gate trailers** - `feb02a4` (docs)

## Files Created/Modified
- `tests/conventions-hygiene.test.js` - NEW offline source-audit: §Comments mandate absent + strip-all rule present + add-client.js warn de-IDed
- `.planning/codebase/CONVENTIONS.md` - §Comments rewritten to the strip-all-planning-IDs rule; Naming Patterns test-file line updated to the forward `{slug}.test.js` rule
- `assets/add-client.js` - large-photo `console.warn` de-IDed (one line)
- `tests/30-fake-test-detector.test.js` - allowlisted `conventions-hygiene` as a legit static audit guard
- `.planning/REQUIREMENTS.md` - DEBT-01 + Deferred/Future re-cut (forward gate → v1.5)
- `.planning/ROADMAP.md` - Phase 44 bullet + criterion 1 + deferred entry re-cut
- `.planning/todos/pending/2026-07-10-comment-hygiene-retrofit-and-forward-gate.md` - dated Phase-44-handled note

## Docs-Gate Trailers (VERBATIM — apply on the TIP commit of the push carrying assets/add-client.js)

`assets/add-client.js` is a watched, shipped file and is NOT in the changelog-only tier, so BOTH the changelog and help demands are real and must be waived. The push carrying it MUST include, on the TIP commit, these two trailer lines exactly:

```
Changelog-Unaffected: — DevTools-only console.warn reword, not user-facing
Help-Unaffected: assets/add-client.js — internal log-string reword, no help surface
```

Note: this plan's commits are `.planning/` + `tests/` + the one `assets/add-client.js` line. If the eventual push also carries other watched shipped files from later Phase 44 plans, re-evaluate the trailers against the full pushed range at push time.

## Decisions Made
- **Test filename has no phase prefix** (`conventions-hygiene.test.js`, not `44-conventions-hygiene.test.js` as RESEARCH/PATTERNS drafted): the plan's D-04 acceptance criterion (`^conventions-hygiene\.test\.js$`) governs — the new naming rule is applied to its own first artifact.
- **Scoped the add-client.js assertion to the console.warn line only** (not a whole-file `D-\d+` scan): line 40's `Plan 08` ref is part of the deferred v1.5 retrofit and must not be touched this phase (D-05).
- **No enforcement gate** (D-01): the forward grep-gate travels with the ~680-line retrofit in v1.5.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - In-file contradiction] Updated the CONVENTIONS.md Naming Patterns test-file line**
- **Found during:** Task 2 (CONVENTIONS.md rewrite)
- **Issue:** The plan scoped the D-04 test-naming rule to §Comments, but the separate "Naming Patterns" section (line ~40) still stated `Test files: {phase}-{plan}-{slug}.test.js`. Leaving it would ship a NEW self-contradiction inside CONVENTIONS.md — the exact bug class (two live instructions disagreeing) this phase exists to fix.
- **Fix:** Reworded the Naming Patterns test-file bullet to the forward `{slug}.test.js` rule, noting the legacy corpus is left as-is pending the v1.5 retrofit — consistent with §Comments.
- **Files modified:** .planning/codebase/CONVENTIONS.md (already in scope)
- **Verification:** `node tests/run-all.js` 170/170; manual read confirms the two sections now agree.
- **Committed in:** `09ab1f3` (Task 2 commit)

**2. [Rule 3 - Blocking] Allowlisted conventions-hygiene in 30-fake-test-detector**
- **Found during:** Task 2 (running the full suite)
- **Issue:** `tests/30-fake-test-detector.test.js` flagged the new test as a "source-slicer" (reads `assets/*.js` as text but executes nothing), failing the suite. The detector requires deliberate static removal/audit guards to be allowlisted with a justification (same as `25-11-hardcoded-english-removed`, `35-demo-static`).
- **Fix:** Added a `conventions-hygiene` allowlist entry with a justification. (Editing a phase-numbered legacy test to add an entry is not a rename — the D-04 rule is forward-looking.)
- **Files modified:** tests/30-fake-test-detector.test.js
- **Verification:** `node tests/run-all.js` 170/170.
- **Committed in:** `09ab1f3` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 in-file contradiction fix, 1 blocking)
**Impact on plan:** Both necessary — one keeps CONVENTIONS.md internally consistent (the phase's own goal), the other unblocks the green suite for a legitimately-static audit test. No scope creep; no shipped comment other than the one console.warn was touched (D-05 honored); no enforcement gate shipped (D-01 honored).

## Issues Encountered
None beyond the two auto-fixed deviations above.

## Known Stubs
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The corrected CONVENTIONS.md §Comments now protects every later v1.4 phase's commits (the "stop the bleeding" goal).
- Wave-1 siblings 44-02 (DEBT-02 purge sentinel) and 44-03 (DEBT-03 build-staging transform) are independent (`depends_on: []`) and unaffected by this plan.
- Reminder for whoever pushes: apply the two docs-gate trailers above on the tip commit if this ships in a push carrying `assets/add-client.js`.

## Self-Check: PASSED

All created/modified files exist on disk; all three task commits (`94106ce`, `09ab1f3`, `feb02a4`) are present in git history.

---
*Phase: 44-tech-debt-guardrails-pre-prod-environment*
*Completed: 2026-07-11*
