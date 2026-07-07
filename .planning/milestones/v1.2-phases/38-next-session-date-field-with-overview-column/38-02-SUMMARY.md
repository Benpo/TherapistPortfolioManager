---
phase: 38-next-session-date-field-with-overview-column
plan: 02
subsystem: testing
status: complete
tags: [tdd, red-gate, overview-sort, export-markdown, demo-seed, snapshot-revert]
requirements: [NEXT-03, NEXT-04, NEXT-06, NEXT-07, NEXT-08]
dependency_graph:
  requires:
    - tests/37-overview-sort.test.js (shipped Phase 37 header-sort suite)
    - tests/30-export-markdown.test.js (Phase 30 export-builder characterization)
    - tests/30-section-visibility.test.js (Phase 30 section-toggle characterization)
    - tests/35-demo-seed.test.js (Phase 35 demo-seed gate + __demoSeedHelpers seam)
    - tests/30-form-dirty-revert.test.js (Phase 30 snapshot/revert harness)
    - assets/overview.js, assets/export-modal.js, assets/demo-seed.js, assets/add-session.js (real modules driven by the tests)
  provides:
    - RED gate for the nextSession overview column sort (NEXT-03/04) — flips GREEN at Plan 38-05
    - RED gate for the export next-session date line + date-only render (NEXT-06) — flips GREEN at Plan 38-06
    - RED gate for the self-freshening seeded next-date model (NEXT-07) — flips GREEN at Plan 38-07
    - RED gate for snapshotFormState nextSessionDate capture (Pitfall 2) — flips GREEN at Plan 38-04
  affects:
    - Plan 38-04 (field wiring + snapshot capture must satisfy the revert RED spec)
    - Plan 38-05 (overview sort branch + <th>/<option> must satisfy the ascending/blanks/derivation RED spec)
    - Plan 38-06 (export gates must flip to note-OR-date and append the date line)
    - Plan 38-07 (applyRelativeDates + seed JSON must satisfy the near-future next-date RED spec)
tech_stack:
  added: []
  patterns:
    - "extend an existing GREEN suite with RED-by-design assertions: existing assertions stay GREEN, only the new ones are RED, and each count-guard is bumped to trap silent skips"
    - "reduce-max regression guard via a fixture whose most-recent session has a BLANK next-date while an older session carries one (D-01)"
    - "blanks-to-bottom asserted under BOTH sort directions (D-03) — the assertion that fails if blanks ride through dir*base"
    - "date rendered/compared via the same App.formatDate path the export uses (compute expected via win.App.formatDate, never a hard-coded format)"
    - "date-only export driven through the REAL copy (full) + filtered builders and the step-1 checkbox, not a stub"
key_files:
  created: []
  modified:
    - tests/37-overview-sort.test.js
    - tests/30-export-markdown.test.js
    - tests/30-section-visibility.test.js
    - tests/35-demo-seed.test.js
    - tests/30-form-dirty-revert.test.js
decisions:
  - "38-02: nextSession sort cases drive #clientSortSelect for the ascending default and click the (not-yet-existing) header to flip descending — both RED until 38-05 adds the <option>/<th> + SORT_DEFAULT_DIR entry + branch; the structural-header loop in case 1 also now requires the nextSession header's injected chevron svg"
  - "38-02: export date assertions use the FULL builder clipboard spy (30-export-markdown) + the filtered step-1 flow (30-section-visibility), asserting win.App.formatDate(iso) appears — robust to whatever formatDate produces, RED until 38-06 flips the note-only gate to note-OR-date"
  - "38-02: section-visibility toggle-default proven by a CONTRAST — date-only ⇒ checked (green now/after) vs neither-note-nor-date ⇒ unchecked (RED now: nextSession default-checked is ungated) — so the content-check keying off note OR date is genuinely exercised"
  - "38-02: demo near-future assertion runs the REAL __demoSeedHelpers.applyRelativeDates and requires nextSessionDate >= the session's own computed date, the helper key deleted, and at most one past-today value (self-freshening, D-12); nextSessionDaysAgo + nextSessionDate added to the seed-key allowlist"
  - "38-02: form-dirty-revert seeds a nextSessionDate on the editing session (harmless to the 4 existing cases) so the new case proves snapshot capture via a genuine edit→revert round-trip (Pitfall 2)"
metrics:
  duration: ~30min
  tasks: 3
  files: 5
  completed: 2026-07-07
---

# Phase 38 Plan 02: Overview/Export/Demo/Revert RED Gates Summary

Extended five existing test suites with falsifiable, correctness-trap-aware assertions that gate the next-session overview column + sort (NEXT-03/04), the export date line + date-only render (NEXT-06), the self-freshening seeded next-date model (NEXT-07), and the snapshot-revert capture (Pitfall 2) — all authored BEFORE the Wave-2 implementation, RED-by-design, without weakening any existing assertion.

## What Was Built

### Task 1 — `tests/37-overview-sort.test.js` (commit 8906905)
- Updated the `allSortKeys` `deepStrictEqual` (and the structural-header loop) to include `nextSession`, so the Next-Session column must be a fourth sortable header carrying `.sortable` + `aria-sort` + the injected chevron svg.
- Added three cases against a fixture where each client's most-recent session (date/createdAt/id tiebreak) drives the sorted next-date, and Carol's **most-recent** session has a BLANK next-date while an **older** session carries one (the reduce-max bait):
  - ascending default (soonest first) with blank-most-recent client LAST, deriving from the most-recent session not a reduce-max (D-01) — a reduce-max would hoist Carol to the top;
  - blanks stay LAST under DESCENDING too (escape `dir*base`, D-03);
  - header ↔ `#clientSortSelect` two-way sync for the new key.
- Count guard 6 → 9. RED: 5 existing cases still PASS; the 4 new/updated assertions fail on the missing `nextSession` header and the reduce-max-correct order. Flips GREEN at Plan 38-05.

### Task 2 — export + section-visibility (commit e64cb5b)
- `tests/30-export-markdown.test.js`: two new FULL-builder (clipboard-spy) cases — a note+date session renders the note AND the formatted next-session date line; a date-only session (empty note, `#nextSessionDate` set) still emits the `## nextSession` block with the date (D-09 note-OR-date). Count 3 → 5.
- `tests/30-section-visibility.test.js`: new `buildExportEnv` (clean saved `?sessionId=1` session, mirroring the export-markdown harness) drives the REAL step-1 rows + filtered builder — the nextSession export toggle defaults ON for a date-only session and OFF when neither note nor date is present (content-check = note OR date), and unticking the section drops BOTH the note and the date. Count 4 → 6.
- RED: both files fail on `#nextSessionDate` existence (field lands at Plan 38-04) and would then fail on the note-only gate until Plan 38-06 flips it.

### Task 3 — demo-seed + form-dirty-revert (commit 0375c47)
- `tests/35-demo-seed.test.js`: added `nextSessionDaysAgo` + `nextSessionDate` to the permitted-seed-key allowlist; new NEXT-07 case asserts ≥2 seeded sessions carry an integer `nextSessionDaysAgo` that the REAL `__demoSeedHelpers.applyRelativeDates` converts to a `nextSessionDate` ≥ the session's own computed date (near-future), with the helper key deleted and at most one past-today value. Count 3 → 4.
- `tests/30-form-dirty-revert.test.js`: seeded a `nextSessionDate` on the editing session (harmless to the 4 existing cases); new case edits `#nextSessionDate`, asserts dirty flips true, then revert restores it to the last-saved snapshot value — the Pitfall-2 guard that `snapshotFormState()` captures the field. Count 4 → 5.
- RED: demo-seed fails on the absent `nextSessionDaysAgo` (seed lands at Plan 38-07); revert fails on `#nextSessionDate` existence (snapshot/populate wiring lands at Plan 38-04).

## Falsifiability / RED-for-the-right-reason
Each file was run and confirmed RED with the existing assertions still PASSING (never weakened):
- 37-overview-sort: 5 passed / 4 failed — the reduce-max fixture failure prints `got ["Alice Adams","Bob Brown","Carol Clark"]` vs expected `["Bob Brown","Alice Adams","Carol Clark"]`, i.e. a genuine ordering RED, not a load error.
- 30-export-markdown: 3 passed / 2 failed on field existence.
- 30-section-visibility: 4 passed / 2 failed on field existence.
- 35-demo-seed: 3 passed / 1 failed on absent `nextSessionDaysAgo`.
- 30-form-dirty-revert: 4 passed / 1 failed on field existence.

## Deviations from Plan
None — plan executed exactly as written. The `nextSession` sort direction-flip and header-sync cases are driven by clicking the not-yet-existing `nextSession` header (asserted present first), which is a clean falsifiable RED until Plan 38-05, matching the plan's "RED-by-design; do not weaken" directive.

## Verification
- `node tests/37-overview-sort.test.js` → exit 1 (5/4). ✓ (verify `test $? -ne 0`)
- `node tests/30-export-markdown.test.js` → exit 1; `node tests/30-section-visibility.test.js` → exit 1. ✓
- `node tests/35-demo-seed.test.js` → exit 1; `node tests/30-form-dirty-revert.test.js` → exit 1. ✓
- The reduce-max regression guard and the blanks-both-directions guard are both present in 37-overview-sort.test.js. ✓
- No existing assertion weakened; every new assertion flips GREEN only when the corresponding Wave-2 plan lands. ✓

## Self-Check: PASSED
- FOUND: tests/37-overview-sort.test.js (modified)
- FOUND: tests/30-export-markdown.test.js (modified)
- FOUND: tests/30-section-visibility.test.js (modified)
- FOUND: tests/35-demo-seed.test.js (modified)
- FOUND: tests/30-form-dirty-revert.test.js (modified)
- FOUND: commit 8906905 (Task 1)
- FOUND: commit e64cb5b (Task 2)
- FOUND: commit 0375c47 (Task 3)
