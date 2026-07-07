---
phase: 30-test-harness-coverage
plan: 12
subsystem: test-harness
tags: [test-coverage, fake-cleanup, gap-closure, add-session, settings, jsdom]
requires: ["30-07"]
provides: ["30-12-fake-cleanup", "real-save-redirect-test", "real-settings-save-failed-test"]
affects: ["30-13"]
tech-stack:
  added: []
  patterns:
    - "jsdom-29 location is a non-configurable accessor → observe window.location.href via vm.runInContext over the jsdom realm through a global Proxy that overrides ONLY location + setTimeout (the settable-location equivalent of the 25-01/29-03 vm pattern, applied to a jsdom-parsed page)"
    - "deterministic 600ms timer: Proxy setTimeout records 600ms callbacks for on-demand invocation; all other delays pass through"
    - "settings save-failed catch pinned by a rejecting PortfolioDB.setTherapistSetting + win.eval(real settings.js) + IIFE-1-only boot"
key-files:
  created:
    - tests/30-save-redirect.test.js
    - tests/30-settings-save-failed-toast.test.js
  modified:
    - tests/25-11-toast-behavior.test.js
  deleted:
    - tests/quick-260615-export-section-order.test.js
    - tests/quick-260615-share-files-only.test.js
    - tests/25-12-optimize-placeholders.test.js
    - tests/quick-260516-g7p-save-returns-to-session.test.js
decisions:
  - "30-12: 30-save-redirect uses vm.runInContext over a jsdom realm (not the prescribed win.eval) because jsdom 29 makes window.location non-configurable; a settable href recorder is impossible inside the win.eval realm. The test still executes the real add-session.js submit+redirect and asserts the captured destination URL — the acceptance SPIRIT (real execution, captured destination, no source-slicing) is fully met; the literal win.eval bullet is superseded by the technical constraint (deviation Rule 3)."
  - "30-12: each replacement test carries a recorded mutation-kill (G1) proving falsifiability"
metrics:
  duration: ~11min
  completed: 2026-06-27
status: complete
---

# Phase 30 Plan 12: Remove fake tests + replace their real intent with executing tests — Summary

Removed the two confirmed source-slicing fakes (GAP-05, GAP-06) and the two redundant structural guards (GAP-16), and replaced the two pieces of REAL coverage the fakes pretended to provide (post-save redirect destination; settings save-failed toast) with tests that EXECUTE the real modules and assert observable output. The tree is now clean for the wave-3 fake-detector gate (30-13). `npm test` stays green: 102 passed, 0 failed.

## What was built

### Task 1 — GAP-05 + GAP-16 deletions (commit d61a624)
`git rm` of three tests whose behavior is already pinned by the real 30-* suite:
- `tests/quick-260615-export-section-order.test.js` (GAP-05 — regex-over-source fake; superseded by `tests/30-export-markdown.test.js`)
- `tests/quick-260615-share-files-only.test.js` (GAP-16 — structural guard; superseded by `tests/30-export-stepper.test.js` case C)
- `tests/25-12-optimize-placeholders.test.js` (GAP-16 — structural guard; superseded by the optimize floor/stale-estimate runtime tests)

Verified the superseding tests (`30-export-markdown`, `30-export-stepper`, `25-12-optimize-estimate-floor`, `25-12-optimize-stale-estimate`) stay green, and the legit static guards (`25-08-single-source-audit`, `25-11-hardcoded-english-removed`, `25-12-folder-picker-removed`) are untouched.

### Task 2 — GAP-06 save-redirect (commit a42dd0d)
Deleted `tests/quick-260516-g7p-save-returns-to-session.test.js` (re-implemented the navigation from the module text). Created `tests/30-save-redirect.test.js`, which:
- runs the REAL `assets/add-session.js` submit handler via `vm.runInContext` over a jsdom `add-session.html` realm,
- installs a settable `window.location.href` recorder + a 600ms redirect-timer capturer through a global Proxy,
- seeds a valid client + date + named issue, fires the real submit, runs the captured 600ms timer, and asserts the captured DESTINATION URL `=== ./add-session.html?sessionId=<id PortfolioDB.addSession resolved>` (Case A), and that two distinct resolved ids produce two distinct destinations (Case B) — proving the redirect is parameterised by the saved id, not a constant, and is NOT satisfied by asserting the save toast.

### Task 3 — GAP-15 settings save-failed toast (commit 99b9997)
Removed ONLY Scenario 5 from `tests/25-11-toast-behavior.test.js` (a hand-rewritten try/catch replayed against the settings.js text); scenarios 1-4 and 6 kept intact and green; coverage header updated. Created `tests/30-settings-save-failed-toast.test.js`, which evals the REAL `assets/settings.js` (`win.eval`), boots ONLY IIFE-1, forces `PortfolioDB.setTherapistSetting` to reject, clicks the real Save, and asserts the REAL onSave catch (settings.js:518-522) fires `App.showToast("", "settings.save.failed")` (Case A), with a negative companion that a successful save does NOT fire the failed toast (Case B).

## Mutation-kill (G1) records

| Test | Mutation applied to a scratch copy | Result |
|------|-------------------------------------|--------|
| `tests/30-save-redirect.test.js` | dropped the `?sessionId=${savedId}` query from the redirect target (`→ ./index.html`) | mutated exit **1**; restored exit **0** |
| `tests/30-settings-save-failed-toast.test.js` | swallowed the `App.showToast("", "settings.save.failed")` in the onSave catch | mutated exit **1** (Case A fails); restored exit **0** |

Both mutations were applied to `assets/*` in place, the test run captured, then reverted via `git checkout --` (production source unchanged).

## Verification

- Four target files deleted (verified absent).
- `node tests/30-save-redirect.test.js` → exit 0 (2/2).
- `node tests/30-settings-save-failed-toast.test.js` → exit 0 (2/2).
- `node tests/25-11-toast-behavior.test.js` → exit 0 (5/5: scenarios 1-4, 6; Scenario 5 removed).
- Positive structural grep `vm|eval|jsdom|runInContext` non-empty for both new files (17 / 7).
- Forbidden source-slice tokens (`SRC.indexOf(` / `SRC.slice(`) absent from both new files (0 / 0).
- `30-settings-save-failed-toast.test.js` contains `win.eval(readAsset('assets/settings.js'))` and invokes the captured IIFE-1 handler.
- `npm test` → **102 passed, 0 failed**, exit 0.

## Deviations from Plan

**1. [Rule 3 — Blocking technical constraint] `30-save-redirect.test.js` uses `vm.runInContext` over the jsdom realm instead of the prescribed `win.eval(readAsset('assets/add-session.js'))`.**
- **Found during:** Task 2.
- **Issue:** The plan's acceptance asked the redirect to be captured "via a settable window.location.href setter" AND for the file to contain `win.eval(readAsset('assets/add-session.js'))`. jsdom 29.1.1 makes `window.location` a NON-configurable accessor whose `href` setter performs a (unimplemented) real navigation. Redefining it — `Object.defineProperty(win, 'location', …)`, redefining the instance `href` accessor, the prototype accessor, and a `beforeParse` override — all throw "Cannot redefine property"; a full-document `location.href = …` assignment is dropped with only a generic "Not implemented: navigation" warning that carries no URL. A settable href recorder is therefore impossible inside the `win.eval` (real jsdom) realm.
- **Fix:** Execute the real `assets/app.js` + `assets/add-session.js` with `vm.runInContext` over the jsdom document through a thin global Proxy that overrides ONLY `location` (a settable href recorder) and `setTimeout` (a 600ms capturer); every other binding (document, DOM classes, Event, EventTarget methods) passes straight through to the genuine jsdom realm. This is the faithful equivalent of the 25-01/29-03 settable-location pattern applied to a jsdom-parsed page. The acceptance SPIRIT is fully met: the real module executes end-to-end and the assertion is the captured DESTINATION URL (not the toast). The positive structural grep `vm|eval|jsdom|runInContext` is satisfied; the forbidden source-slice tokens are absent.
- **Files modified:** `tests/30-save-redirect.test.js`.
- **Commit:** a42dd0d.

(Task 3 followed the plan exactly — settings.js does not navigate, so the jsdom `win.eval` real-page pattern works as written.)

## Threat surface

No new runtime surface. Test-only / dev-tooling scope (T-30-12 disposition: accept). No assets/* production files modified.

## Self-Check: PASSED
- Created files exist: `tests/30-save-redirect.test.js`, `tests/30-settings-save-failed-toast.test.js` (verified on disk).
- Deleted files absent: all four target files gone (verified).
- Commits exist: d61a624, a42dd0d, 99b9997 (verified in `git log`).
- Full suite: `npm test` exit 0 (102 passed, 0 failed).
