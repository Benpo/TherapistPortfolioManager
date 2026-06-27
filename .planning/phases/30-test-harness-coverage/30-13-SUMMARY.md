---
phase: 30-test-harness-coverage
plan: 13
subsystem: test-harness
tags: [test-coverage, fake-detector, gap-closure, prevention, runner-hardening, jsdom, pdf, docs]
requires: ["30-07", "30-12"]
provides:
  - "fake-test-detector-gate"
  - "runner-timeout-hardening"
  - "pdf-wrapper-arg-forwarding"
  - "research-inventory-corrected"
affects: ["31-refactor"]
tech-stack:
  added: []
  patterns:
    - "permanent self-check gate: a tests/*.test.js that scans every other tests/*.test.js for the read-without-execute fake class, discovered+run by run-all.js inside npm test"
    - "comment+string char-state stripper so an execution-marker word in a comment/string cannot masquerade as genuine execution"
    - "same-module (b) heuristic: flag only when an EXECUTED asset-source var feeds a source-derived value into an EQUALITY assertion (not blanket source-inspection, which legit hybrid tests use)"
    - "spawnSync timeout+killSignal integrates with the existing signal!=null FAIL branch"
    - "Reflect.construct(Original, arguments) forwards all constructor args through a wrapper"
key-files:
  created:
    - tests/30-fake-test-detector.test.js
  modified:
    - tests/run-all.js
    - tests/_helpers/jsdom-pdf-env.js
    - .planning/phases/30-test-harness-coverage/30-RESEARCH.md
decisions:
  - "30-13: heuristic (b) scoped to EQUALITY-on-source-derived-from-an-EXECUTED-var, not the plan's literal blanket '.indexOf/.slice/regex over source'. The blanket form flags ~8 real, green characterization tests (25-01, 25-02, 25-12-optimize-*, 25-12-custom-days-visibility, 25-12-photos-usage-rerender, g7p-export-editor-snippets) that legitimately execute a module AND carve a function region from source for an auxiliary presence check. The plan's own hard constraints (gate MUST exit 0 on current tree, allowlist EXACTLY 4, must NOT hide a real fake) are only jointly satisfiable by the narrower scope, which still catches both the real fake class (via check (a)) and the subtle eval-then-assert-on-source fake (via (b)). Deviation Rule 1/3."
  - "30-13: check (a) (reads assets/*.js but no vm/eval/jsdom/runInContext after stripping) is the provably-correct primary gate — it caught both removed fakes and is exactly Prevention #1's definition; the 3 allowlisted guards are the ONLY read-without-execute files on the tree (proven non-vacuous)."
  - "30-13: WrappedJsPDF uses Reflect.construct(OriginalJsPDF, arguments) to forward all positional jsPDF args while keeping the per-instance setCreationDate/setFileId pins."
metrics:
  duration: ~40min
  completed: 2026-06-27
status: complete
---

# Phase 30 Plan 13: Prevention gate + runner/helper hardening + research correction — Summary

The final gap-closure plan bakes the durability fixes in: a **permanent fake-test detector gate** that fails any future source-slicing test on every `npm test`, plus two infra hardenings (runner timeout WR-01, PDF wrapper arg forwarding WR-02) and the correction of 5 mis-credits in the research behavior inventory. `npm test` → **103 passed, 0 failed**, exit 0.

## What was built

### Task 1 — Prevention #1: permanent fake-test detector gate (commit eeb20d5)
`tests/30-fake-test-detector.test.js` scans every top-level `tests/*.test.js` and flags the **read-without-execute** fake class:
- **Candidate scope = executable assets only:** a test is a candidate only if it reads an `assets/*.js` file as text. Recognises BOTH read forms — `path.join(ROOT,'assets','x.js')` and a literal `'assets/x.js'` string — and requires the `.js` extension so `.css`/`.html` readers (25-12-password-ack-*, 25-13-css-audit) are NEVER flagged.
- **Flag (a):** after comments AND string/template literals are stripped (char-state machine), the candidate has NO execution marker `vm|eval|jsdom|runInContext` → a source-slicer. This is the provably-correct primary gate (it catches the entire real fake class; a "jsdom" in a comment cannot satisfy it).
- **Flag (b):** an EXECUTED asset-source var feeds a value derived from its OWN source text (`.slice`/`.substring`/`.match`/regex `.exec`) into an EQUALITY assertion (deep/strict/notStrict/equal) — the subtle fake that eval's a module yet asserts on its source string, flagged even with a marker present.
- **Allowlist = exactly 4:** `25-08-single-source-audit`, `25-11-hardcoded-english-removed`, `25-12-folder-picker-removed`, and itself — each with an inline justification.

**Self-validation (the plan's CRITICAL step):** ran the detector in report mode over the post-30-12 tree → **zero non-allowlisted flags**. Independently proved the allowlist is non-vacuous and hides nothing: the read-without-execute set is EXACTLY the 3 named guards.

**Demonstrated mutation-kills (the detector's own falsifiability):**

| Scratch fake | Tell | Result |
|--------------|------|--------|
| eval's `app.js` then `assert.deepStrictEqual` over a `SRC.slice(...).match(...)` order | (b) eval-then-assert-on-source | detector exit **1** (flagged) |
| reads via `path.join(...,'assets','app.js')` with only a dead `jsdom`/`runInContext` **comment** marker | (a) no real execution after stripping | detector exit **1** (flagged) |
| real 30-* analog tests + the 3 allowlisted guards | genuine execution / allowlisted | detector exit **0** (PASS) |

Both scratch files were created in `tests/`, the kill captured, then deleted; the gate returns to exit 0 and is discovered by `run-all.js` (`30-*.test.js`).

### Task 2 — WR-01 + WR-02 runner/helper hardening (commit 473f15a)
- **WR-01:** `tests/run-all.js` per-file `spawnSync` now passes `timeout: 120000` + `killSignal: 'SIGKILL'`. A hung child is killed and counted FAIL by the existing `result.signal != null` branch; the PASS/FAIL/exit aggregation is unchanged. Demonstrated with a short-timeout harness over a `setInterval`-hung child → `signal SIGKILL` → FAIL.
- **WR-02:** `tests/_helpers/jsdom-pdf-env.js` `WrappedJsPDF` now uses `Reflect.construct(OriginalJsPDF, arguments)` to forward ALL constructor args (was `args[0]` only), while still applying `setCreationDate(PINNED_DATE)` + `setFileId(PINNED_FILE_ID)` and the optional `onJsPDF` hook per instance. All 7 migrated PDF tests stay byte-deterministic (TEST-01 preserved).

### Task 3 — D: correct 5 research mis-credits (commit 4a7be6d)
Surgical edits to the `30-RESEARCH.md` God-Module Behavior Inventory per the `30-VERIFICATION.md` corrections table, plus a dated "Inventory corrected post-re-audit (2026-06-27)" note:
1. IIFE-4 Backups — 25-04/25-05 load `assets/backup.js` (engine), not settings.js wiring; helper-text + password-gate are gaps (GAP-08).
2. IIFE-5 Photos — 25-06 loads `crop.js`, 25-07 loads `db.js`; `_optimizeAllPhotosLoop` body is a gap (GAP-09).
3. IIFE-2 Snippets — EXTENSIVE at LEAF level only; screen wiring uncovered (GAP-03).
4. buildReportRow — 29-03 is behavioral but leaf-only; `mountReportRow` wiring uncovered.
5. B8 bottom fns — 24-06 pins only `renderSpotlightSessionInfo`; quick-260516-g7p was a fake (removed in 30-12); rest of B8 uncovered (GAP-04).

No test files modified by Task 3.

## Deviations from Plan

**1. [Rule 1/3] Heuristic (b) scoped to equality-on-source-derived-from-an-executed-var, not the literal blanket source-inspection.**
- **Found during:** Task 1 self-validation (report mode).
- **Issue:** The plan's literal (b) ("feeds the asset's SOURCE TEXT into an assertion / `.indexOf(` / `.slice(` / regex, regardless of markers") flags many REAL, green characterization tests in this codebase. Empirically: `25-01`, `25-02-checklist-store-parity`, `25-12-optimize-{verdict,floor,stale}`, `25-12-custom-days-visibility`, `25-12-photos-usage-language-rerender`, and `quick-260516-g7p-export-editor-snippets` all genuinely execute a module AND carve/grep a function region from source for an auxiliary presence/removal check — exactly the pattern the deleted fakes used, minus the "never executes" tell. A first cut of (b) flagged `25-08-encrypt-then-share` (executes backup-modal.js but counts removed overview.js branches via `assert.strictEqual(oldBranches, 0)`).
- **Fix:** Scoped (b) to the acceptance criterion's literal wording — "a file that eval's a module AND feeds **its** source text into an assertion" — i.e. the source-derived value must root at an asset-source var that is **itself executed**, AND be fed into an **equality** assertion (the precise "source-as-behaviour" tell the removed fakes had: `assert.deepStrictEqual(orderExtractedFromSource, expected)`). Check (a) remains the primary, provably-correct gate for the real fake class. This is the only reading consistent with all three hard constraints (exit 0 on current tree, allowlist exactly 4, must not hide a real fake).
- **Files modified:** `tests/30-fake-test-detector.test.js`.
- **Commit:** eeb20d5.

## TDD Gate Compliance
Task 1 (`tdd="true"`) followed RED→GREEN via the detector's own mutation-kill: the two scratch fakes (the falsifying cases) were demonstrated to flip the gate to exit 1, and the real tree to exit 0, before the gate was finalized. The detector is non-vacuous by construction (proven kills + proven non-empty (a)-set).

## Verification
- `node tests/30-fake-test-detector.test.js` → exit 0 on the cleaned tree; flips to exit 1 on each scratch source-slicer (both forms).
- Report mode over the tree → zero non-allowlisted flags; read-without-execute set == the 3 named guards (non-vacuous).
- `grep -nE 'timeout|killSignal' tests/run-all.js` → both present on the per-file spawnSync; PASS/FAIL/exit aggregation unchanged.
- `WrappedJsPDF` forwards all args via `Reflect.construct(..., arguments)` and keeps `setCreationDate`/`setFileId` per instance.
- Hung-child demo → killed (`signal SIGKILL`), classified FAIL.
- 5 RESEARCH.md mis-credits corrected; dated note present; no test files touched by the doc task.
- `npm test` → **103 passed, 0 failed**, exit 0 (TEST-04 single command + TEST-01 PDF determinism preserved; the gate now protects TEST-02's RTL guard and the whole suite from source-slicing).

## Threat surface
Test-only / dev-tooling scope (T-30-13: accept). No new runtime surface, no endpoints, no data handling. No optional pre-commit hook was added (the npm-test self-check is the primary, required deliverable and is sufficient); no `assets/*` production file modified.

## Self-Check: PASSED
- Created file exists: `tests/30-fake-test-detector.test.js` (verified on disk).
- Modified files present: `tests/run-all.js`, `tests/_helpers/jsdom-pdf-env.js`, `.planning/phases/30-test-harness-coverage/30-RESEARCH.md`.
- Commits exist: eeb20d5, 473f15a, 4a7be6d (verified in `git log`).
- Full suite: `npm test` exit 0 (103 passed, 0 failed).
