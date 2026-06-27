---
phase: 30-test-harness-coverage
plan: 07
subsystem: testing
tags: [jsdom, characterization, add-session, shared-helpers, dirty-revert, read-mode, client-spotlight, base64-codec]

# Dependency graph
requires:
  - "30-02: tests/_helpers/app-stub.js (createAppStub) + tests/_helpers/mock-portfolio-db.js (spy mock + assertNoWrites)"
  - "30-06: the buildEnv real-page pattern (eval app.js → capture+await the single add-session DOMContentLoaded handler → settle)"
provides:
  - "tests/_helpers/mock-portfolio-db.js — store-backed getSession/getClient (read ledger) + addSnippet/deleteSnippet (WRITE_METHODS); getAllSnippets reads the live store; updateSnippet mutates by id (G2 shared surface for wave 2: 30-08..30-12)"
  - "tests/_helpers/app-stub.js — App.getSnippets (sync slice) + App.refreshSnippetCache (async, pulls window.PortfolioDB.getAllSnippets) mirroring app.js:87-104"
  - "tests/_helpers/base64-codec.js — faithful Buffer-backed atob/btoa/Blob/FileReader (deterministic vm-sandbox option for GAP-09 in 30-09)"
  - "tests/30-form-dirty-revert.test.js — executing characterization of B6 (GAP-01) on a real EDITING session"
  - "tests/30-read-mode.test.js — executing characterization of B7 (GAP-02) read mode + edit-client modal"
  - "tests/30-client-spotlight.test.js — executing characterization of B8 (GAP-04) dropdown/spotlight/title"
affects: [31]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Seeded-editing-session boot: set the jsdom URL to add-session.html?sessionId=<seededId>, seed the now-real PortfolioDB.getSession (Task 0), await the single DOMContentLoaded handler, settle() so the post-load Promise.resolve().then snapshot lands — pins the B6/B7 regions that early-return on a clean ?-URL env"
    - "Loud HARD precondition: assert body.classList.contains('read-mode')===true BEFORE any visibility/disabled assertion, so a case cannot pass vacuously against the default new-session DOM if read-mode entry never happened"
    - "Falsifiable sort seed: seed clients OUT OF alphabetical order so the localeCompare dropdown sort is observable (a dropped sort fails the order assertion)"
    - "Nav-guard wiring proof: capture the options object handed to App.installNavGuard via a createAppStub override and assert its isDirty() tracks live PortfolioFormDirty() — never assert merely that installNavGuard was called"

key-files:
  created:
    - tests/_helpers/base64-codec.js
    - tests/30-form-dirty-revert.test.js
    - tests/30-read-mode.test.js
    - tests/30-client-spotlight.test.js
  modified:
    - tests/_helpers/mock-portfolio-db.js
    - tests/_helpers/app-stub.js

key-decisions:
  - "Task 0 extends the shared doubles ADDITIVELY (store-backed, deep-copied seed) so the only behavior change is that writes are now observable on the next read; existing consumers (25-03, 25-08, 30-01..06) that assert only the __calls ledger stay green"
  - "getSession/getClient go on the READ ledger (id-keyed spy resolving the seeded record or null); addSnippet/deleteSnippet go in WRITE_METHODS so assertNoWrites covers them"
  - "app-stub.refreshSnippetCache reads window/global PortfolioDB.getAllSnippets — the ONE intentional production-matching PortfolioDB read in the stub (app.js:87-104)"
  - "Each of the three add-session tests builds its own env per case (the 30-06 buildEnv shape) and ends with an EXPECTED_COUNT guard; the cancel-button label flip is made observable via a t-override mapping session.discard/confirm.cancel to distinguishable strings"

patterns-established:
  - "Pattern: boot the real add-session module on a SEEDED ?sessionId=/?clientId= URL through the store-backed mock, then assert observable DOM/selection state only — the wave-2 plans (30-08..30-12) reuse the Task-0 shared surface rather than re-adding methods"

requirements-completed: [TEST-03]

coverage:
  - id: G2
    description: "Shared test doubles extended ONCE: store-backed getSession/getClient/addSnippet/deleteSnippet + getAllSnippets live readback + App.getSnippets/refreshSnippetCache + faithful base64 codec"
    requirement: "TEST-03"
    verification:
      - kind: integration
        ref: "node tests/30-settings-section-roundtrip.test.js && node tests/30-issue-delta.test.js && node tests/24-06-spotlight-session-info.test.js && node tests/25-03-testpassword-no-mutation.test.js && node tests/25-08-roundtrip-stores.test.js — all exit 0 (additive, existing consumers green)"
        status: pass
      - kind: behavior
        ref: "codec round-trip: Blob(10 bytes) → readAsDataURL → atob → decoded byte length === 10, byte-exact; mutation (constant data URL) → decoded len 3 ≠ 10 → exit 1; restored → exit 0"
        status: pass
    human_judgment: false
  - id: GAP-01
    description: "B6 form dirty/revert on a real EDITING session: PortfolioFormDirty() false→true on edit, true→false on revert with the field restored to the snapshot, cancel label flips confirm.cancel⇄session.discard, captured nav-guard isDirty() tracks live state"
    requirement: "TEST-03"
    verification:
      - kind: behavior
        ref: "node tests/30-form-dirty-revert.test.js → 4 cases pass; mutation (neutralise revertSessionForm restore) → 3 cases FAIL (exit 1); restored → exit 0"
        status: pass
    human_judgment: false
  - id: GAP-02
    description: "B7 read mode + edit-client modal, gated on a real read-mode entry: submit hidden / edit+copy+export visible, input disabled + textarea readOnly + add-issue disabled, modal open(populated)→close"
    requirement: "TEST-03"
    verification:
      - kind: behavior
        ref: "node tests/30-read-mode.test.js → 2 cases pass; mutation (early-return in setReadMode) → 4 assertions FAIL (exit 1); restored → exit 0"
        status: pass
    human_judgment: false
  - id: GAP-04
    description: "B8 client dropdown (placeholder + __new__ + name-sorted clients + preselect) + spotlight name/age/photo/notes (?clientId) + updateSessionTitle .section-title/document.title (?sessionId)"
    requirement: "TEST-03"
    verification:
      - kind: behavior
        ref: "node tests/30-client-spotlight.test.js → 3 cases pass; mutation A (drop localeCompare sort) → dropdown case FAILS; mutation B (neutralise updateSessionTitle) → title case FAILS; both exit 1; restored → exit 0"
        status: pass
    human_judgment: false
  - id: SUITE
    description: "Full suite stays green with the 3 new files + extended helpers"
    requirement: "TEST-03"
    verification:
      - kind: integration
        ref: "npm test → 'Suite: 97 passed, 0 failed, 97 total'; exit 0"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-06-27
status: complete
---

# Phase 30 Plan 07: add-session Safety-Net Completion + Shared-Helper Extension Summary

**Extends the shared test doubles ONCE (Task 0 / G2 — store-backed PortfolioDB getSession/getClient/addSnippet/deleteSnippet, App.getSnippets/refreshSnippetCache, and a faithful base64 codec) so the wave-2 gap plans drive the real methods, then closes the three high-risk add-session holes the Phase-31 refactor rearranges — B6 form dirty/revert (GAP-01), B7 read mode + edit-client modal (GAP-02), and B8 client/spotlight/title wiring (GAP-04) — with jsdom real-page tests that execute the real module and assert observable behavior only.**

## Performance
- **Duration:** ~5 min
- **Tasks:** 4 (Task 0 shared helpers + 3 add-session characterization tests)
- **Files created:** 4 (base64-codec.js + 3 test files)
- **Files modified:** 2 (mock-portfolio-db.js, app-stub.js — additive)

## Accomplishments
- **Task 0 — shared doubles extended ONCE (G2):** `mock-portfolio-db.js` is now backed by in-memory clients/sessions/snippets stores (deep-copied from `opts`). New `getSession(id)`/`getClient(id)` resolve the seeded record or null and record on the READ ledger; `addSnippet`/`deleteSnippet` mutate the snippet store and are in `WRITE_METHODS` (so `assertNoWrites` covers them); `getAllSnippets` now reads back the LIVE store and `updateSnippet` mutates by id — a write is observable on the next read. `app-stub.js` gains `getSnippets()` (sync slice of an internal `_snippetCache`) + `refreshSnippetCache()` (async, `_snippetCache = await window.PortfolioDB.getAllSnippets()`) mirroring `app.js:87-104`. New `base64-codec.js` provides a faithful Buffer-backed `atob/btoa/Blob/FileReader` whose `readAsDataURL` emits a REAL base64 data URL (round-trip preserves byte length). All additive — five existing consumers stay green.
- **Task 1 — GAP-01 / B6 (`30-form-dirty-revert.test.js`):** Boots the real module on a seeded `?sessionId=` editing session (real `getSession`), settles the post-load `Promise.resolve().then` so `lastSavedSnapshot` lands, and asserts `PortfolioFormDirty()===false` + `read-mode` as a HARD precondition (no vacuous no-op). Then drives observable actions: click edit → change a field + dispatch `input` → dirty true; click revert (confirm defaults true) → field restored to the snapshot + dirty false; the cancel label flips `confirm.cancel`⇄`session.discard`; and the captured `App.installNavGuard` `isDirty()` tracks live `PortfolioFormDirty()`.
- **Task 2 — GAP-02 / B7 (`30-read-mode.test.js`):** Boots on a seeded `?sessionId=` past session and asserts `body.read-mode` as a loud HARD precondition BEFORE any downstream assertion, then observable DOM: submit hidden / edit+copy+export visible, a date input `disabled` + a textarea `readOnly` + add-issue `disabled`, and the edit-client modal opening (populated from the seeded client) and closing via the real controls.
- **Task 3 — GAP-04 / B8 (`30-client-spotlight.test.js`):** Case 1 (`?clientId`) seeds clients OUT OF alphabetical order (Zoe/Adi/Maya) so the `localeCompare` sort is falsifiable, asserting the `<select>` is placeholder + `__new__` + name-sorted clients with the `?clientId` preselected, and the spotlight renders name/age/photo/notes. Case 2 (`?sessionId`) asserts `updateSessionTitle` sets `.section-title` text + `document.title` to `<client> • <date>`. `tests/24-06-spotlight-session-info.test.js` left unchanged and green.

## Task Commits
1. **Task 0 — shared-helper extension (G2)** — `57a3dfa` (test)
2. **Task 1 — GAP-01 form dirty/revert (B6)** — `90becbf` (test)
3. **Task 2 — GAP-02 read mode + edit-client modal (B7)** — `d7123da` (test)
4. **Task 3 — GAP-04 client dropdown / spotlight / title (B8)** — `6933f82` (test)

## Files Created/Modified
- `tests/_helpers/mock-portfolio-db.js` (MODIFIED, additive) — store-backed getSession/getClient/addSnippet/deleteSnippet; live getAllSnippets readback; updateSnippet mutates by id.
- `tests/_helpers/app-stub.js` (MODIFIED, additive) — getSnippets + refreshSnippetCache mirroring app.js:87-104; pass-through skip-list updated so they are not clobbered.
- `tests/_helpers/base64-codec.js` (NEW) — faithful Buffer-backed atob/btoa/Blob/FileReader for the GAP-09 vm-sandbox path.
- `tests/30-form-dirty-revert.test.js` (NEW) — GAP-01/B6, 4 cases, exits 0.
- `tests/30-read-mode.test.js` (NEW) — GAP-02/B7, 2 cases, exits 0.
- `tests/30-client-spotlight.test.js` (NEW) — GAP-04/B8, 3 cases, exits 0.

## Decisions Made
- Task 0 stores are deep-copied from the seed so a write never mutates the caller's seed arrays; the only observable behavior change is write→read visibility, keeping the extension additive for existing ledger-only consumers.
- The three add-session tests build a fresh env per case (the 30-06 pattern), each ending with an `EXPECTED_COUNT` guard, and gate read-mode-dependent cases on a loud `body.read-mode` precondition so no assertion can pass vacuously against the default new-session DOM.

## Mutation-Kills Recorded (G1)
- **Codec:** constant-output `readAsDataURL` → round-trip decoded byte length 3 ≠ blob.size 10 → exit 1; restored → exit 0.
- **GAP-01:** neutralise `revertSessionForm`'s snapshot restore → 3 cases FAIL (exit 1); restored → exit 0.
- **GAP-02:** early-return in `setReadMode` → 4 assertions FAIL (exit 1); restored → exit 0.
- **GAP-04:** drop the `localeCompare` sort → dropdown case FAILS; neutralise `updateSessionTitle` → title case FAILS; both exit 1; restored → exit 0.
- All mutations applied to a scratch backup of `assets/add-session.js` and reverted; `git diff --stat assets/add-session.js` is clean (no production file touched).

## Deviations from Plan
None - plan executed exactly as written. Each task committed atomically.

## Issues Encountered
None.

## User Setup Required
None - test-only files under `tests/`; no production change, no external service.

## Next Phase Readiness
- The three add-session high-risk regions (B6/B7/B8) are now pinned by executing observable behavior as part of the Phase 31 pre-refactor green baseline; the shared-helper surface (G2) the rest of the gap round (30-08..30-12) depends on is laid down ONCE.
- **Stub-masking limitation:** aside from the real severity pair, the surrounding App surface is stubbed and `initCommon` is a no-op, so green here guards the screen-wiring ORCHESTRATION, not that every therapist-visible label is correct.
- No `assets/*` production file was modified. No blockers.

---
*Phase: 30-test-harness-coverage*
*Completed: 2026-06-27*

## Self-Check: PASSED
- Created files present: tests/_helpers/base64-codec.js, tests/30-form-dirty-revert.test.js, tests/30-read-mode.test.js, tests/30-client-spotlight.test.js
- Modified files present: tests/_helpers/mock-portfolio-db.js, tests/_helpers/app-stub.js
- Task commits present in git history: 57a3dfa, 90becbf, d7123da, 6933f82
- Full suite: npm test → 97 passed, 0 failed, exit 0
