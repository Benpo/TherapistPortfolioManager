---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 04
subsystem: testing
tags: [pdf, jspdf, date-format, golden-baseline, sha256, bidi, i18n]

requires:
  - phase: 37-01
    provides: TZ-pinned RED gates (34-date-locale.test.js rewrite, D-21 injection expectation)
  - phase: 37-03
    provides: window.DateFormat engine (assets/date-format.js — format/parseLocal/todayLocalISO/getPreference)
provides:
  - PDF date path unified on window.DateFormat (pdf-export.js formatDate delegates; export-modal.js passes raw ISO + local-today footer)
  - Hebrew-numeric mm/dd/yyyy PDF assertion (2026 present / 6202 absent) proving U+2066/U+2069 isolates survive bidi.min.js (DATE-04 PDF half)
  - fixture-en golden SHA-256 baseline regenerated (en-GB→en-US) from a human-verified real render (DATE-07)
affects: [pdf-export, export-modal, date-format, golden-baseline-regen, phase-verification]

tech-stack:
  added: []
  patterns:
    - "PDF golden-baseline regen: real render → human visual sign-off → --regenerate → check-mode confirm (never blind --regenerate)"
    - "jsdom PDF/export harnesses must eval assets/date-format.js before pdf-export.js (mirrors index.html load order) now that the PDF date path delegates to window.DateFormat"

key-files:
  created: []
  modified:
    - assets/pdf-export.js
    - assets/export-modal.js
    - tests/pdf-digit-order.test.js
    - tests/30-export-stepper.test.js
    - .planning/fixtures/phase-23/fixture-en.pdf.sha256

key-decisions:
  - "Option A (human-approved): regenerate ONLY fixture-en; leave de/cs/he/he-mixed baselines untouched"
  - "FIX-4 reality: only 1 of the predicted 3 fixtures drifted — Hebrew fixtures are byte-identical because their fixture date is 2026-05-08 (May), where Hebrew long-month == short-month ('מאי'). D-08 short-month is live+engine-tested, just invisible for May."

patterns-established:
  - "Golden-baseline regen honors 'leave N untouched' by running --regenerate (all 5) then confirming git shows only the intended file changed (unchanged fixtures rewrite byte-identical → no diff)"
  - "A source change that adds a window.DateFormat dependency requires auditing every jsdom harness that evals the touched modules for the engine injection"

requirements-completed: [DATE-04, DATE-05, DATE-07]

coverage:
  - id: D1
    description: "PDF date path unified on window.DateFormat — pdf-export.js formatDate delegates; export-modal.js passes raw ISO sessionDate + footer exportedOn = App.formatDate(DateFormat.todayLocalISO())"
    requirement: DATE-05
    verification:
      - kind: unit
        ref: "tests/34-date-locale.test.js (fixed en-US + raw-ISO export chain)"
        status: pass
      - kind: unit
        ref: "tests/30-export-stepper.test.js (share/download seams reach buildRenderInputs with DateFormat present)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Hebrew-numeric mm/dd/yyyy PDF renders LTR — year 2026 present, reversed 6202 absent, month 07 present (isolates survive bidi.min.js)"
    requirement: DATE-04
    verification:
      - kind: unit
        ref: "tests/pdf-digit-order.test.js (7/7, incl. new he mm/dd/yyyy assertion)"
        status: pass
    human_judgment: false
  - id: D3
    description: "fixture-en PDF golden SHA-256 baseline regenerated en-GB→en-US; de/cs/he/he-mixed unchanged; 5/5 baselines GREEN"
    requirement: DATE-07
    verification:
      - kind: unit
        ref: "tests/pdf-latin-regression.test.js (5/5 pass, check mode)"
        status: pass
      - kind: manual_procedural
        ref: "Human visual sign-off (Task 3 checkpoint) — Option A approved"
        status: pass
    human_judgment: true
    rationale: "Golden-baseline overwrite requires human eyes on the rendered bytes — a jsdom PDF build can hang→exit-0 silently (MEMORY reference-pdf-jsdom-inert-gates); a green test alone is not proof."

duration: 20min
completed: 2026-07-03
status: complete
---

# Phase 37 Plan 04: Unify PDF date path on window.DateFormat + regenerate golden baseline Summary

**PDF card + footer dates now flow through window.DateFormat (raw-ISO export chain, local-today footer), Hebrew numeric survives jsPDF LTR, and the fixture-en golden baseline was regenerated en-GB→en-US after human visual sign-off — with only 1 of the predicted 3 fixtures actually drifting.**

## Performance

- **Duration:** ~20 min (continuation session; full plan spanned two sessions)
- **Completed:** 2026-07-03
- **Tasks:** 3 (Task 1 + Task 2a/2b in prior session; Task 3 checkpoint resolved this session)
- **Files modified:** 5

## Accomplishments
- Unified the PDF date path on `window.DateFormat` — `pdf-export.js formatDate` delegates to the engine, `export-modal.js` stops pre-formatting (passes raw ISO) and the footer `exportedOn` uses local today (Task 1, prior session).
- Extended `tests/pdf-digit-order.test.js` with a Hebrew mm/dd/yyyy assertion proving U+2066/U+2069 isolates render LTR in jsPDF (2026 present / 6202 absent / 07 present) — DATE-04 PDF half (Task 2a, prior session).
- Resolved the Task 3 human-verify checkpoint: **Option A** approved — regenerated **only** `fixture-en.pdf.sha256` (en-GB `8 May 2026` → en-US `May 8, 2026`) from a real, Mitigation-B-pinned render; de/cs/he/he-mixed left byte-identical.
- Fixed a Task-1-introduced regression in `tests/30-export-stepper.test.js` (Rule 1) so the full suite returns to green minus the expected Plans-07/08 RED.

## Task Commits

1. **Task 1: Delegate pdf-export.js formatDate + raw-ISO export chain + local-today footer** — `b287a16` (feat) [prior session]
2. **Task 2a: Hebrew-numeric PDF assertion (DATE-04)** — `78b276f` (test) [prior session]
3. **Checkpoint-pending state record** — `25abb2a` (docs) [prior session]
4. **Rule 1 fix: inject window.DateFormat into 30-export-stepper jsdom env** — `ffd4a9c` (test)
5. **Task 3: Regenerate fixture-en PDF golden baseline (en-GB→en-US, Option A)** — `cc789b7` (chore)

**Plan metadata:** docs(37-04) commit with SUMMARY + STATE + ROADMAP.

## Files Created/Modified
- `assets/pdf-export.js` — `formatDate` delegates to `window.DateFormat.format` (Task 1)
- `assets/export-modal.js` — raw-ISO pass-through + `exportedOn = App.formatDate(DateFormat.todayLocalISO())` (Task 1)
- `tests/pdf-digit-order.test.js` — Hebrew mm/dd/yyyy LTR assertion (Task 2a)
- `tests/30-export-stepper.test.js` — evals `assets/date-format.js` before `pdf-export.js` in `loadRealPdf` (Rule 1 fix)
- `.planning/fixtures/phase-23/fixture-en.pdf.sha256` — `8b20e937…` → `efc5cea67334ac724b43ba7d620adc22288bf63eeba8e8bc310ec94ec5d5af32` (Task 3)

## Decisions Made
- **Option A (regenerate only fixture-en)** — chosen by the human (Ben) at the Task 3 checkpoint after reviewing the candidate renders. The Hebrew fixtures were NOT re-dated (Option B, rejected).
- The single-fixture drift is correct, not a regression: the D-08 Hebrew short-month rule is live and engine-tested (Plan 03); it is simply invisible for the fixtures' May date.

## Deviations from Plan

### Deviation 1: FIX-4 predicted 3 drifting fixtures; reality is 1 (expected, not a defect)

- **Where:** Task 2/Task 3 (baseline regeneration)
- **Plan's claim (FIX-4):** THREE baselines shift — `fixture-en` (en-GB→en-US) AND `fixture-he` + `fixture-he-mixed` (Hebrew long-month→short-month per D-08).
- **Reality:** Only **fixture-en** drifted (`8b20e937…` → `efc5cea6…`). `fixture-he`, `fixture-he-mixed`, `fixture-de`, `fixture-cs` are all byte-identical to their committed baselines.
- **Root cause:** All five fixtures use session date `2026-05-08` (May). For May, the Hebrew long-month and short-month forms are identical (`מאי`), so the D-08 long→short change produces the same bytes. The behavior IS live (engine-tested in Plan 03) — it is invisible for a May date. de/cs use `month:'long'` in both old and new paths (genuinely unchanged), matching the plan.
- **Resolution:** Confirmed via check-mode (4/5 PASS, only fixture-en FAIL) before regenerating. Human approved **Option A** — regenerate only fixture-en, do not re-date the Hebrew fixtures.

### Auto-fixed Issues

**1. [Rule 1 - Bug] Task-1 regression in tests/30-export-stepper.test.js**
- **Found during:** Task 3 (full-suite run before finalizing)
- **Issue:** Task 1 (b287a16) routed `export-modal.js` footer `exportedOn` and `pdf-export.js` `formatDate` through `window.DateFormat`. The `30-export-stepper` harness never eval'd `assets/date-format.js`, so `buildRenderInputs` threw `TypeError: Cannot read properties of undefined (reading 'todayLocalISO')` — the share (files-only) and step-3 PDF/MD download seam tests regressed (5/7 → the 2 that hit the render path failed). Production is unaffected (index.html always loads date-format.js).
- **Fix:** Added `win.eval(readAsset('assets/date-format.js'))` before `pdf-export.js` in `loadRealPdf` (mirrors index.html / the D-21 injection pattern already used in 34-date-locale + the PDF harnesses).
- **Files modified:** `tests/30-export-stepper.test.js`
- **Verification:** `node tests/30-export-stepper.test.js` → 7/7 PASS.
- **Committed in:** `ffd4a9c`

---

**Total deviations:** 1 documented reality-vs-prediction (FIX-4, expected — no action needed beyond confirmation) + 1 auto-fixed (Rule 1 regression).
**Impact on plan:** No scope creep. The FIX-4 delta is a correct narrowing of the predicted drift; the Rule 1 fix restores a test broken by this plan's own Task 1.

## Green-Gate Evidence
- `tests/pdf-latin-regression.test.js` (check mode): **5/5 PASS** — fixture-en `efc5cea6…` + de/cs/he/he-mixed unchanged.
- `tests/pdf-digit-order.test.js`: **7/7 PASS** (incl. new Hebrew mm/dd/yyyy assertion).
- `tests/30-export-stepper.test.js`: **7/7 PASS** (after Rule 1 fix).
- Real-render guard (not jsdom false-GREEN): `pdfForFixture` throws unless the `/CreationDate` and `/ID` Mitigation-B pins are visible in the actual PDF bytes; 4 fixtures reproduced their committed hashes while 1 differed → genuine non-empty renders, not a hung exit-0 (MEMORY reference-pdf-jsdom-inert-gates).
- **Full suite (`npm test`): 120 passed, 1 failed / 121.** The single RED file is `37-personalization.test.js` (Plans 07/08 scope — expected). Before the Rule 1 fix it was 119/2 (the extra failure was the 30-export-stepper regression, now fixed).

## Issues Encountered
- The full-suite run surfaced a second RED file (`30-export-stepper.test.js`) not flagged in the resume instructions. Traced to this plan's own Task 1 dependency addition; fixed under Rule 1 (see Deviations).

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- DATE-04 (PDF half), DATE-05, DATE-07 complete. PDF date path fully on `window.DateFormat`; golden baselines match the fixed code.
- Remaining phase work: Plans 07/08 (personalization surface) — `37-personalization.test.js` is the expected RED gate for that scope.

## Self-Check: PASSED
- All 5 modified files present on disk.
- All plan commits present (b287a16, 78b276f, ffd4a9c, cc789b7).
- fixture-en.pdf.sha256 = efc5cea6…c5d5af32 (regenerated).

---
*Phase: 37-date-consistency-date-format-setting-f6-f5*
*Completed: 2026-07-03*
