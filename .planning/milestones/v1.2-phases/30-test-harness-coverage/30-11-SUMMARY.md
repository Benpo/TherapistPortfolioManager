---
phase: 30-test-harness-coverage
plan: 11
subsystem: test-harness
tags: [test-coverage, characterization, jsdom, add-session, gap-closure]
status: complete
requires:
  - "30-07 Task 0 (shared jsdom test helpers: app-stub, mock-portfolio-db)"
provides:
  - "executing guard for add-session autogrow WIRING (GAP-12 / region B1)"
  - "executing guard for add-session per-field copy (GAP-13 / region B2)"
affects:
  - "Phase 31 (RFCT) extraction safety for add-session.js autogrow + per-field copy"
tech-stack:
  added: []
  patterns:
    - "real-page jsdom buildEnv (eval real add-session.js + add-session.html), captured DOMContentLoaded handler, settle() microtask/timer flush"
    - "observable-output assertions only (style.height set; captured clipboard writeText arg) — D-08/D-09"
    - "recorded mutation-kill (G1) per new test in a scratch copy of the production file"
key-files:
  created:
    - tests/30-autogrow-wiring.test.js
    - tests/30-field-copy.test.js
  modified: []
decisions:
  - "Autogrow test pins WIRING ONLY (R12): jsdom does no layout so scrollHeight===0 and computeGrowHeight always returns the 56 floor; grow-to-fit math stays guarded by the untouched quick-260516-rna leaf test"
  - "Input-listener wiring proven by clearing the boot-set style.height, dispatching a real input Event, then asserting height was re-set — isolates the delegated listener from the boot growAll call"
  - "Per-field copy asserted by exact field-scoped payload equality (session.copy.unknownClient\\n\\n<value>) plus negative whole-session checks — kills both the whole-session and empty-string mutations"
metrics:
  duration: 10min
  tasks: 2
  files: 2
  completed: 2026-06-27
---

# Phase 30 Plan 11: Add-Session Autogrow Wiring + Per-Field Copy Characterization Summary

Two narrow add-session holes (GAP-12 autogrow WIRING / region B1, GAP-13 per-field copy / region B2) are now guarded by jsdom tests that EXECUTE the real `assets/add-session.js` via real events and assert observable output, replacing the prior source-text-only coverage.

## What Was Built

**Task 1 — `tests/30-autogrow-wiring.test.js` (GAP-12 / B1):** Loads the real add-session page into jsdom (the 30-export-markdown `buildEnv` pattern), drives the captured async `DOMContentLoaded` handler, then:
- Case A (delegated listener wiring): clears the boot-set `style.height` on a `.session-textarea`, dispatches a real `input` Event, and asserts `style.height` is re-set to a px-shaped value — proving the delegated listener at `add-session.js:131-138` ran `autoGrow`. Isolating from the boot growAll (by clearing first) makes the input wiring the load-bearing thing under test.
- Case B (boot growAll): asserts every `.session-textarea` has `style.height` set after boot, proving `growAllSessionTextareas` iterated the nodes (`:1829` new-session branch).

**Honest scope (R12):** jsdom performs no layout, so `scrollHeight===0` and `computeGrowHeight` always returns the 56 floor. The test pins the WIRING (listener fired → autoGrow ran → growAll iterated), NOT the grow-to-fit height math — the doc block states this explicitly, and assertions check `style.height` is SET / px-shaped, never a specific grown number. The grow-to-fit computation remains guarded by the untouched `quick-260516-rna-textarea-autogrow` leaf test.

**Task 2 — `tests/30-field-copy.test.js` (GAP-13 / B2):** Same real-page env; populates `#sessionComments` with distinctive content (and a different field with decoy content), forces `isSecureContext=true`, installs a capturing `navigator.clipboard.writeText` spy, clicks the `.field-copy[data-copy-target="sessionComments"]` button, and asserts the captured argument equals the exact field-scoped `buildFieldCopyText` payload (`session.copy.unknownClient\n\nCOMMENTS_FIELD_DISTINCT_PAYLOAD_42`) — plus negative checks that it does NOT carry the whole-session title heading / issues section and does NOT leak the decoy field.

## Verification

- `node tests/30-autogrow-wiring.test.js` → exit 0 (2 cases)
- `node tests/30-field-copy.test.js` → exit 0 (1 case)
- `npm test` → full suite 104 passed, 0 failed, exit 0
- `grep -E 'vm|eval|jsdom|runInContext'` non-empty for both files
- `grep -c '__addSessionTestHooks'` = 0 in the autogrow test (test-hook surface not widened); `computeGrowHeight(` not called directly
- FORBIDDEN tokens absent (count 0): `SRC.indexOf(`, `SRC.slice(`, `__addSessionTestHooks` — doc-block prose scrubbed so mechanical gates read clean
- `assets/add-session.js` unchanged (git clean); `quick-260516-rna` leaf test still green

### Mutation-kill (G1)

| Test | Mutation (scratch copy of add-session.js) | Result |
|------|-------------------------------------------|--------|
| 30-autogrow-wiring | removed `autoGrow(target)` from the delegated input listener (`:138`) | mutant exit 1 (cleared-height case fails) → restored exit 0 |
| 30-field-copy | swapped `buildFieldCopyText(targetId)` → `buildSessionMarkdown()` (whole-session) | mutant exit 1 (scoped-equality fails) → restored exit 0 |

Both mutations were applied to a `mktemp` scratch copy and reverted; the production file was confirmed git-clean after each.

## Deviations from Plan

None — plan executed as written. One in-plan housekeeping commit (`2543087`) reworded doc-block prose so the literal grep tokens the acceptance criteria require to be absent (`__addSessionTestHooks`, `SRC.indexOf(`, `SRC.slice(`) no longer appear even in comments; no behavioral change.

## Commits

- `97d3e96` test(30-11): characterize autogrow wiring via real input events (GAP-12 region B1)
- `a790be2` test(30-11): characterize per-field copy via clipboard spy (GAP-13 region B2)
- `2543087` docs(30-11): scrub forbidden grep tokens from test doc blocks

## Self-Check: PASSED

- FOUND: tests/30-autogrow-wiring.test.js
- FOUND: tests/30-field-copy.test.js
- FOUND commit: 97d3e96
- FOUND commit: a790be2
- FOUND commit: 2543087
