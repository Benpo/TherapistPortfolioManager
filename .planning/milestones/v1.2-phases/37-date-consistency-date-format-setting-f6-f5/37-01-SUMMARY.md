---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 01
subsystem: testing
tags: [tests, date-engine, tz-pinned, red-gate, wave-0, i18n, pdf]
requires:
  - "assets/app.js App.formatDate (current display site)"
  - "tests/_helpers/jsdom-pdf-env.js (PDF harness)"
  - "tests/run-all.js (per-process env; TZ pin is file-local)"
provides:
  - "tests/37-date-format.test.js — TZ-pinned falsifiable engine spec (RED)"
  - "tests/34-date-locale.test.js — rewritten to assert fixed engine behavior (RED)"
  - "The Wave-0 gate that Plans 37-03 (engine) and 37-04 (PDF/D-21) must turn GREEN"
affects:
  - "Plan 37-03 must create assets/date-format.js (window.DateFormat) to green the spine + unit assertions"
  - "Plan 37-04 must add D-21 injection to tests/_helpers/jsdom-pdf-env.js + raw-ISO export chain"
tech-stack:
  added: []
  patterns:
    - "TZ re-exec pin (spawnSync child with TZ=America/New_York) + EDT-offset self-check"
    - "vm-sandbox execution of the real module (never source-text assertions)"
    - "Unicode LTR isolate (U+2066/U+2069) assertion for Hebrew numeric dates"
key-files:
  created:
    - tests/37-date-format.test.js
  modified:
    - tests/34-date-locale.test.js
decisions:
  - "TZ pin via spawnSync re-exec (propagates child exit code cleanly) rather than execFileSync (which throws on RED non-zero exit)"
  - "Engine assertions guarded by a DF() accessor so a missing window.DateFormat yields a clean per-test RED message instead of a FATAL crash — the file flips GREEN cleanly when the module lands"
  - "Export-chain RED is anchored on the D-21 window.DateFormat injection assertion in the jsdom PDF env (proves the harness works; only the injection is missing)"
metrics:
  duration: ~15min
  completed: 2026-07-03
  tasks: 2
  files: 2
status: complete
---

# Phase 37 Plan 01: Date-Engine RED Tests Summary

TZ-pinned falsifiable date-engine RED tests authored FIRST (Wave 0): a new `tests/37-date-format.test.js` pinning `America/New_York` proves the UTC-midnight off-by-one on the real `App.formatDate`, and `tests/34-date-locale.test.js` was rewritten to assert the fixed `window.DateFormat` engine + raw-ISO PDF export chain — both RED against the current tree, establishing the gate Plans 37-03/37-04 must green.

## What Was Built

### Task 1 — `tests/37-date-format.test.js` (NEW, RED)
A bespoke zero-dependency node test that:
- Pins `process.env.TZ='America/New_York'` on the first executable line and **re-execs** via `spawnSync` (V8 caches TZ at startup), then self-checks `new Date(2026,6,2).getTimezoneOffset() === 240` (EDT) so a silently-inert pin fails loudly.
- Executes the REAL modules via a `vm` sandbox (mirrors the 34-date-locale `loadApp` pattern): evals `assets/date-format.js` first **if present** (absent today → RED), then `app.js`, never asserting on source text.
- Falsifiable spine: `App.formatDate('2026-07-02') === 'Jul 2, 2026'` — RED now with the genuine bug output `'Jul 1, 2026'`.
- One assertion per D-05 format option (`auto`/`month-day-year`/`day-month-year`/`mm/dd/yyyy`/`dd/mm/yyyy`/`yyyy-mm-dd`), D-06 separator rules, and the D-04/D-07 Hebrew numeric LTR isolate (U+2066…U+2069 present, isolate-stripped `02/07/2026`, LTR order preserved).
- DATE-06 month-boundary (`parseLocal('2026-07-01').getMonth()===6`), DATE-02 age-math (`parseLocal('2000-01-01')` → 2000/0/1, not 1999), and local-today input-default proofs.

### Task 2 — `tests/34-date-locale.test.js` (REWRITTEN, RED)
Replaced the old pre-formatted-string / en-GB-PDF assertions with fixed-behavior assertions (D-19):
- Loads `assets/date-format.js` into the vm sandbox alongside `app.js`.
- Asserts `window.DateFormat` public surface + `auto` per-locale outputs (en-US `'Jul 2, 2026'` per D-04, de `'15. Juni 2026'`, cs `'15. června 2026'`, he `'15 ביוני 2026'`).
- Asserts `App.formatDate` **delegates** to the engine (its output equals the engine `auto` output).
- Asserts the PDF export chain passes **raw ISO** into `buildSessionPDF` and that the jsdom PDF env has **`window.DateFormat` injected (D-21)** and formats `'2026-05-08'` en as `'May 8, 2026'`, producing a non-empty PDF.

## Observed RED Output (captured before implementation)

`node tests/37-date-format.test.js` → exit 1, **0 passed / 13 failed**. Spine fails for the RIGHT reason:
```
FAIL  SPINE: App.formatDate("2026-07-02") === "Jul 2, 2026" (lang en) ...
      expected "Jul 2, 2026", got "Jul 1, 2026" (UTC-midnight off-by-one still present)
FAIL  format option "auto" (en) === "Jul 2, 2026"
      window.DateFormat is undefined — engine (assets/date-format.js) not implemented yet (expected RED before Plan 37-03)
... (11 more engine assertions RED on the same missing module)
```

`node tests/34-date-locale.test.js` → exit 1, **0 passed / 7 failed**:
```
FAIL  engine: window.DateFormat exposes format / parseLocal / todayLocalISO / getPreference
      window.DateFormat is undefined — engine (assets/date-format.js) not implemented yet (expected RED before Plan 37-03)
FAIL  export chain: jsdom PDF env has window.DateFormat (D-21) + raw-ISO sessionDate builds a non-empty en PDF
      jsdom PDF env is missing window.DateFormat — D-21 injection not applied yet (expected RED before Plan 37-04)
... (5 more auto/delegation assertions RED)
```

Every failure is a corrected-behavior assertion failing because the implementation is still wrong/absent — not a weakened assertion. The spine's `'Jul 1, 2026'` output was independently reproduced (`TZ=America/New_York node -e 'new Date("2026-07-02")...'`) to confirm it is the real UTC-midnight bug, not a test artifact.

## Verification

| Check | Result |
|-------|--------|
| `node tests/37-date-format.test.js` exits non-zero (RED) | ✓ exit 1 |
| `node tests/34-date-locale.test.js` exits non-zero (RED) | ✓ exit 1 |
| Spine fails with actual bug output `'Jul 1, 2026'` (right reason) | ✓ |
| Both files execute the real module via vm/jsdom (no source-text assertions) | ✓ |
| TZ pin verified live (EDT offset 240) | ✓ |
| All Intl expected strings pre-verified against Node 22 / full-ICU | ✓ |

## Deviations from Plan

None — plan executed exactly as written. Both tasks are test-only; no production code was written (the engine is Plan 37-03's job, PDF/D-21 is Plan 37-04's job).

## Notes for Downstream Plans

- **Plan 37-03**: creating `assets/date-format.js` with the researched `window.DateFormat` surface + delegating `App.formatDate` will green the spine, all 6 format options, the Hebrew isolate, and the boundary/age/today assertions in BOTH files. Expected `auto` tokens are pinned to full-ICU Node 22 output; if CI uses small-ICU the month tokens may differ (Assumption A1 — adjust expectations, do not weaken).
- **Plan 37-04**: must add `win.eval(readAsset('assets/date-format.js'))` **before** `assets/pdf-export.js` in `tests/_helpers/jsdom-pdf-env.js` (D-21) and switch `export-modal.js` to pass raw ISO — that greens the 34-date-locale export-chain assertion.
- These two files are DELIBERATELY RED for Wave 0; the full `npm test` suite will report them as failing until Waves 1–2 land. Do not "fix" them by weakening assertions.

## Self-Check: PASSED
- FOUND: tests/37-date-format.test.js (commit 7f4daaa)
- FOUND: tests/34-date-locale.test.js rewrite (commit 2437347)
- Both commits present in `git log`.
