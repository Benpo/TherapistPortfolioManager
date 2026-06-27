---
phase: 30-test-harness-coverage
plan: 08
subsystem: testing
tags: [jsdom, characterization, settings, snippets, import-merge, saved-notice, disable-confirm, mutation-kill]

# Dependency graph
requires:
  - "30-07 Task 0: store-backed PortfolioDB.addSnippet/updateSnippet/deleteSnippet (WRITE_METHODS) + getAllSnippets live readback; App.getSnippets/refreshSnippetCache (app.js:87-104 contract)"
  - "30-04: the settings.html buildEnv pattern (capture all 5 DOMContentLoaded handlers, invoke ONLY the target IIFE, captured.length===5 self-check, settle())"
provides:
  - "tests/30-snippet-wiring.test.js — executing characterization of the snippet editor SCREEN WIRING (GAP-03a / region A2): openEditor → handleSave add+update, handleDelete, afterSnippetMutation → renderSnippetList"
  - "tests/30-snippet-import-merge.test.js — executing characterization of the import collision-MERGE REPLACE branch (GAP-03b / region A2) via the real file-input → FileReader → applyImport path"
  - "tests/30-settings-saved-notice.test.js — executing characterization of the saved-notice pill + disable-confirm gate (GAP-07 / region A1)"
affects: [31]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IIFE selection by captured index: IIFE-1 fields = captured[0] (settings.js:643), IIFE-2 snippets boot = captured[1] (settings.js:1898); invoke ONLY the target handler with a captured.length===5 self-check so an index drift fails loudly"
    - "global.PortfolioDB mirror: app-stub.refreshSnippetCache resolves PortfolioDB via window/global and runs in Node scope (window undefined), so buildEnv sets global.PortfolioDB = mockDb so afterSnippetMutation → refreshSnippetCache pulls the LIVE store back into App.getSnippets() — a write becomes observable in the rendered list with no per-test plumbing; cleared at end-of-file"
    - "Real import plumbing (no leaf): seed a colliding snippet, build a File via win.File, Object.defineProperty the file-input.files, dispatch change → FileReader.onload → detectImportCollisions → collision modal default replace → click the real #snippetImportApply → applyImport REPLACE branch; assert preserved existingId + single rendered row — never call window.__SnippetEditorHelpers.detectImportCollisions"
    - "Controllable window timers: override the jsdom window setTimeout/clearTimeout with a manual queue so showSavedNotice's 8000ms auto-dismiss + 200ms leave-cleanup fire deterministically/instantly; the harness settle() uses Node's global setTimeout so it is unaffected"

key-files:
  created:
    - tests/30-snippet-wiring.test.js
    - tests/30-snippet-import-merge.test.js
    - tests/30-settings-saved-notice.test.js
  modified: []

key-decisions:
  - "Editor ADD/UPDATE triggers use bare alphanumeric strings (welcome/greet/signoff): handleSave runs them through isValidTrigger (TRIGGER_REGEX = letters/digits/hyphen, 2-32) which rejects a prefix char; the import test can use any trigger because validateImportPayload runs the injected mock validator (returns true), not isValidTrigger"
  - "UPDATE/DELETE editor entry is driven through the REAL list-row edit/delete buttons (buildListRow → openEditor/handleDelete closures), not a direct openEditor call, so the boot() bindings + list wiring are part of what is pinned"
  - "Disable-confirm Save is enabled by toggling a section-enable checkbox (its change handler sets formDirty); the decline case asserts assertNoWrites (the gate returns before formSaving), the accept case asserts setTherapistSetting fired"
  - "The 8 leaf snippet helper tests are left untouched and stay green; no assets/* production file was modified"

patterns-established:
  - "Pattern: pin a god-module SCREEN by executing the real page IIFE and asserting persistence-call args (mock __calls spy) + rendered DOM only — an internal rename stays GREEN, a behavior break FAILS; proven per file by a recorded mutation-kill"

requirements-completed: [TEST-03]

coverage:
  - id: GAP-03a
    description: "Snippet editor open/save(add+update)/delete + list render wiring (region A2, IIFE-2) pinned by observable DOM + persistence-call args"
    requirement: "TEST-03"
    verification:
      - kind: integration
        ref: "node tests/30-snippet-wiring.test.js — exits 0 (ADD/UPDATE/DELETE)"
        status: pass
      - kind: behavior
        ref: "mutation-kill G1: handleSave forced to always addSnippet → UPDATE case exits non-zero (updateSnippet count 0 ≠ 1); restored → exit 0; working tree clean"
        status: pass
  - id: GAP-03b
    description: "Import collision-MERGE REPLACE branch (region A2) pinned by driving the real file-input → FileReader → applyImport path"
    requirement: "TEST-03"
    verification:
      - kind: integration
        ref: "node tests/30-snippet-import-merge.test.js — exits 0 (REPLACE preserves existingId, trigger once)"
        status: pass
      - kind: behavior
        ref: "mutation-kill G1: drop id:collision.existingId in the REPLACE branch (mint new id) → existingId assertion exits non-zero ('mutant.*' ≠ 'user.existing-greet'); restored → exit 0; working tree clean"
        status: pass
  - id: GAP-07
    description: "Saved-notice pill visibility/auto-dismiss + disable-confirm persistence gate (region A1, IIFE-1) pinned by observable DOM + write-gate"
    requirement: "TEST-03"
    verification:
      - kind: integration
        ref: "node tests/30-settings-saved-notice.test.js — exits 0 (notice show/hide, decline-no-write, accept-write)"
        status: pass
      - kind: behavior
        ref: "mutation-kill G1: neutralize the disable-confirm gate (if(false) — persist regardless) → decline case fails assertNoWrites (setTherapistSetting called 9×); restored → exit 0; working tree clean"
        status: pass

# Metrics
metrics:
  duration: ~20m
  completed: 2026-06-27
  tasks: 3
  files_created: 3
status: complete
---

# Phase 30 Plan 08: Settings snippet-wiring + saved-notice coverage Summary

Closed the two highest-priority `assets/settings.js` characterization holes the Phase-31 extraction will rearrange — GAP-03 (A2 snippet-settings SCREEN WIRING) and GAP-07 (A1 saved-notice pill + disable-confirm gate) — with three jsdom real-page tests that EXECUTE the real settings.js IIFEs and assert OBSERVABLE behavior only (persistence-call args + rendered DOM), each falsifiable via a recorded mutation-kill. No production file changed; the 8 leaf snippet-helper tests stay green; `npm test` is 100/100.

## What was built

- **Task 1 — `tests/30-snippet-wiring.test.js` (GAP-03a, region A2 / IIFE-2):** boots the real snippets handler (captured[1], settings.js:1898) and drives observable user actions. ADD: click add → fill trigger+expansion → Save asserts `addSnippet` args (trigger/expansion.he/updatedAt) + `snippets.toast.saved` + the new trigger renders. UPDATE: open a seeded row via its real edit button → Save asserts `updateSnippet` (not `addSnippet`) with the preserved id and no duplicate row. DELETE: real list-row delete button → asserts `deleteSnippet(id)` + `snippets.toast.deleted` + row leaves the list. The write→list visibility round-trip works because `afterSnippetMutation → App.refreshSnippetCache` re-pulls the live mock store (via `global.PortfolioDB`).
- **Task 2 — `tests/30-snippet-import-merge.test.js` (GAP-03b, region A2):** seeds a colliding snippet, then drives the REAL import plumbing — build a `win.File`, set `file-input.files`, dispatch `change` → `FileReader.onload` → `detectImportCollisions` → collision modal (default "replace") → click the real `#snippetImportApply` → `applyImport` REPLACE branch. Asserts `updateSnippet` called with the PRESERVED `existingId` (settings.js:1842), `addSnippet` NOT called for the colliding trigger, and the trigger renders EXACTLY ONCE. It never calls the leaf `detectImportCollisions` to prove merge (per plan prohibition).
- **Task 3 — `tests/30-settings-saved-notice.test.js` (GAP-07, region A1 / IIFE-1):** boots the fields handler (captured[0], settings.js:643). Saved-notice: an edit→Save shows `#settingsSavedNotice` (`hidden=false` + `dataset.active`), then controllable window-timers fire the 8000ms auto-dismiss + 200ms leave-cleanup → hidden again. Disable-confirm: toggling a section OFF then Save with the confirm DECLINED writes nothing (`assertNoWrites`, confirm fired once); ACCEPTED proceeds to `setTherapistSetting`.

## Verification

- `node tests/30-snippet-wiring.test.js` → 3 passed, exit 0
- `node tests/30-snippet-import-merge.test.js` → 1 passed, exit 0
- `node tests/30-settings-saved-notice.test.js` → 3 passed, exit 0
- `npm test` → Suite: 100 passed, 0 failed, exit 0
- Structural gates: each file contains `win.eval(readAsset('assets/settings.js'))`, `grep -E 'vm|eval|jsdom|runInContext'` non-empty, invokes the correct captured IIFE index; FORBIDDEN (`SRC.indexOf(`, `SRC.slice(`, leaf-call to prove merge) absent.

## Mutation-kill log (G1 — falsifiability proof)

| File | Mutation in a scratch copy of settings.js | Result | Restore |
|------|-------------------------------------------|--------|---------|
| 30-snippet-wiring | handleSave forced to always `addSnippet` | UPDATE case exit non-zero (updateSnippet 0≠1) | restored → exit 0, tree clean |
| 30-snippet-import-merge | drop `id: collision.existingId` (mint new id) | existingId assert exit non-zero (`mutant.*`≠`user.existing-greet`) | restored → exit 0, tree clean |
| 30-settings-saved-notice | neutralize disable-confirm gate (`if(false)`) | decline case fails `assertNoWrites` (setTherapistSetting 9×) | restored → exit 0, tree clean |

Each mutation was applied to a backup-and-restored copy of `assets/settings.js`; `git diff --stat assets/settings.js` is empty after every restore.

## Deviations from Plan

None — plan executed exactly as written. The plan's illustrative import trigger `";hi"` was realized as a bare valid trigger (`greet`); this is cosmetic (the import path uses the injected mock validator, so any trigger works) and does not change the REPLACE-branch behavior under test.

## Commits

- `3a2ded8` test(30-08): pin snippet editor open/save/delete + list render (GAP-03a)
- `4d5dded` test(30-08): pin import collision-MERGE REPLACE branch (GAP-03b)
- `7814354` test(30-08): pin saved-notice pill + disable-confirm gate (GAP-07)

## Self-Check: PASSED

- FOUND: tests/30-snippet-wiring.test.js, tests/30-snippet-import-merge.test.js, tests/30-settings-saved-notice.test.js
- FOUND commits: 3a2ded8, 4d5dded, 7814354
- assets/settings.js unchanged (no production-file modification)
