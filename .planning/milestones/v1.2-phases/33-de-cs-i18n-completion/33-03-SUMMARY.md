---
phase: 33-de-cs-i18n-completion
plan: 03
subsystem: testing
tags: [i18n, parity-test, vm-sandbox, requirements-note]

# Dependency graph
requires:
  - phase: 33-01
    provides: German translations for the 13 export-modal keys (no // TODO i18n markers)
  - phase: 33-02
    provides: Czech translations for the 13 export-modal keys (no // TODO i18n markers)
provides:
  - Standing machine-checked D-06 gate — zero '// TODO i18n' markers and exact bidirectional DE↔EN / CS↔EN key parity
  - REQUIREMENTS.md I18N-01/I18N-02 note aligned to the AI native-translation-panel source (D-02), human-translator dependency removed
affects: [i18n, export-modal, requirements-traceability]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Exact bidirectional key-parity gate (no missing AND no extra keys) over the complete finite key set — full-population verification, not sampling"
    - "Raw-source marker scan complements per-key vm-sandbox parity checks"

key-files:
  created:
    - tests/33-i18n-de-cs-completion.test.js
  modified:
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Gate key STRUCTURE + markers only, not translation VALUE (cognates like 'Export' make value-equality unreliable; translation quality is the D-06 manual visual check)"
  - "Reuse tests/run-all.js auto-discovery + exit-0/1 contract — no new runner, no new dependency (plain fs + vm)"

patterns-established:
  - "D-06 completion gate: raw no-marker scan + exact bidirectional parity as a single self-contained tests/*.test.js file"

requirements-completed: [I18N-01, I18N-02]

coverage:
  - id: D1
    description: "Automated gate asserting zero '// TODO i18n' markers in assets/i18n-de.js and assets/i18n-cs.js"
    requirement: "I18N-01"
    verification:
      - kind: unit
        ref: "tests/33-i18n-de-cs-completion.test.js#No \"// TODO i18n\" marker remains"
        status: pass
    human_judgment: false
  - id: D2
    description: "Automated gate asserting exact bidirectional DE↔EN and CS↔EN key parity (no missing, no extra)"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "tests/33-i18n-de-cs-completion.test.js#EXACT bidirectional key parity"
        status: pass
    human_judgment: false
  - id: D3
    description: "REQUIREMENTS.md I18N-01/I18N-02 note reflects the AI native-translation-panel source (D-02), no human-translator dependency"
    requirement: "I18N-01"
    verification:
      - kind: other
        ref: "node -e '<stale (needs Sapir) note absent check>' on .planning/REQUIREMENTS.md I18N section"
        status: pass
    human_judgment: false
  - id: D4
    description: "Manual visual check: switch app locale to DE and CS, open export modal, confirm steps 1-3 render in-language and fit (no overflow/clipping)"
    verification: []
    human_judgment: true
    rationale: "Translation quality and layout fit require a human visual pass on a real device — cannot be automated; tracked as a phase-level UAT item, non-blocking for the autonomous plans"

# Metrics
duration: 2min
completed: 2026-07-06
status: complete
---

# Phase 33 Plan 03: DE/CS i18n Completion Gate Summary

**A self-contained `fs`+`vm` test enforcing zero `// TODO i18n` markers and exact bidirectional DE↔EN / CS↔EN key parity, plus a REQUIREMENTS.md note realigned to the AI native-translation source (D-02).**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-06T12:39:27Z
- **Completed:** 2026-07-06T12:42:01Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `tests/33-i18n-de-cs-completion.test.js` — the standing D-06 gate: raw no-marker scan over both target files + exact bidirectional key parity (no missing AND no extra keys) for DE and CS against EN.
- Verified the gate genuinely fails when a `// TODO i18n` marker is reintroduced or a key is added/removed (negative test on a mutated copy exited 1 with both offending cases reported).
- Full suite green: `npm test` reports 125 passed, 0 failed, 125 total — the new file is auto-discovered by `tests/run-all.js` with no runner change and no new dependency.
- Realigned the REQUIREMENTS.md I18N-01/I18N-02 note to the AI native-translation-panel source (D-02); removed the stale `(needs Sapir's strings)` human-translator dependency and stale line ranges, phrasing as "the 13 export-modal keys".

## Task Commits

1. **Task 1: Add the parity + no-TODO verification test** - `e40e70c` (test)
2. **Task 2: Update the REQUIREMENTS.md I18N source note (D-02)** - `ac81b1e` (docs)

## Files Created/Modified
- `tests/33-i18n-de-cs-completion.test.js` - D-06 gate: no-marker scan + exact bidirectional DE↔EN / CS↔EN key parity; plain `fs`+`vm`, exit-0/1 contract.
- `.planning/REQUIREMENTS.md` - I18N-01/I18N-02 note now cites the AI native-translation panel (D-01), no human-translator dependency, no stale line refs.

## Decisions Made
- Gate key STRUCTURE and markers only, not translation VALUE — cognates make value-equality unreliable; translation quality remains the D-06 manual visual check (tracked as UAT item D4).
- Reused the existing `tests/run-all.js` auto-discovery and exit-0/1 contract; no new runner, no new runtime dependency.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- D-06 automated half is complete and standing. The remaining D-06 manual visual check (DE/CS export-modal render, steps 1-3, no overflow/clipping) is a phase-level UAT item (coverage D4) and does not block the autonomous plans.
- Phase 33 plans 01/02/03 all complete; phase ready for verification/UAT.

---
*Phase: 33-de-cs-i18n-completion*
*Completed: 2026-07-06*

## Self-Check: PASSED
- FOUND: tests/33-i18n-de-cs-completion.test.js
- FOUND: .planning/phases/33-de-cs-i18n-completion/33-03-SUMMARY.md
- FOUND commit: e40e70c (Task 1 test)
- FOUND commit: ac81b1e (Task 2 REQUIREMENTS.md)
