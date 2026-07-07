---
phase: 34-session-pdf-export-visual-polish
plan: 3
subsystem: testing
tags: [pdf, jspdf, jsdom, rtl, bidi, i18n, tdd, content-stream]

# Dependency graph
requires:
  - phase: 34-01
    provides: window.IconLogoBase64 vendored offline logo asset (assets/branding/icon-512-base64.js)
  - phase: 34-02
    provides: session.type.* i18n keys present across en/he/de/cs
  - phase: 23
    provides: shapeForJsPdf / drawSegmentedLine RTL pipeline + isInputVisual:false invariant
  - phase: 30
    provides: tests/_helpers/jsdom-pdf-env.js shared jsdom+jsPDF harness (getContext stub, date/fileId pins, onJsPDF hook)
provides:
  - "tests/34-logo-embed.test.js — RED gate: PDF embeds an image XObject + builds offline (FN-3/D-05); gates 34-06"
  - "tests/34-pill-localized.test.js — RED gate: localized session-type label rendered verbatim as a standalone pill draw across 12 (type×locale) combos (FN-2/D-04); gates 34-06"
  - "tests/34-rtl-newblocks.test.js — RED gate: new-block digit visual-order (Session #N, severity) + start-edge anchoring under uiLang:'he' (D-10); grows GREEN across 34-06/07/09"
affects: [34-06, 34-07, 34-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RED-first render-tier gate: assert observable PDF behavior (image XObject in bytes, verbatim label via doc.text spy, digit-GID order + anchor-side x differential) BEFORE the render code exists"
    - "Dep-stub injection: append <script src> stubs matching the lazy-load chain so PDFExport.loadScriptOnce() resolves under standalone jsdom (loadScriptOnce finds the stub via querySelector); mirrors quick-260620-q8m"
    - "Anchor-side differential: prove RTL start-edge anchoring by comparing the same element's x-origin between uiLang:'he' and uiLang:'en' (no absolute coordinates)"

key-files:
  created:
    - tests/34-logo-embed.test.js
    - tests/34-pill-localized.test.js
    - tests/34-rtl-newblocks.test.js
  modified: []

key-decisions:
  - "Pill verbatim-label asserted via the doc.text() string probe (onJsPDF hook), accepting the label OR its visual reverse — robust across LTR identity and Hebrew pure-RTL shaping, and falsifiable against a hardcoded label without measuring per-glyph GIDs"
  - "Each test injects its own dep <script> stubs so it is RED-correct both standalone and under tests/run-all.js (standalone jsdom does not fire load/error for appended scripts, which would otherwise hang loadScriptOnce)"
  - "Task-3 anchor check is a he-vs-en x-origin differential on the pill label (anchor-SIDE, not absolute y), so it survives layout tuning and fails a left-anchored RTL block"
  - "Sentinel numerals 12 / 10 / 8 chosen to not collide with the rendered date runs (2026, 24) or footer (Page 1 of 1) — verified against current output"

requirements-completed: [PDFX-01]

# Metrics
duration: 30min
completed: 2026-06-29
status: complete
---

# Phase 34 Plan 03: Render-tier Wave-0 RED tests (FN-2 / FN-3 / D-10) Summary

**Three falsifiable, RED-now content-stream tests pinning the embedded-logo image XObject (FN-3), the verbatim localized session-type pill across 12 type×locale combos (FN-2), and the RTL digit-order + start-edge anchoring invariant for the new blocks (D-10) — authored before the render code, gating 34-06/07/09.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-06-29
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- **tests/34-logo-embed.test.js** — asserts the PDF byte stream contains an image XObject (`/Subtype /Image`) and the build resolves offline with `window.fetch` stubbed to throw. RED now on the missing XObject; the two offline-safety assertions (vendored `window.IconLogoBase64` present, offline build produces a PDF) already pass.
- **tests/34-pill-localized.test.js** — for all 12 combinations of (clinic/online/other) × (en/he/de/cs), resolves the localized label from `window.I18N[lang]['session.type.<type>']` (the same source `App.formatSessionType` reads) and asserts it is emitted as a standalone verbatim `doc.text()` draw (the pill). RED now: the label is only ever fused into the centered meta line.
- **tests/34-rtl-newblocks.test.js** — under `uiLang:'he'` asserts (A) Session #12 digit run "12" present / "21" absent, (B) severity before=10 / after=8 runs "10" & "8" present / "01" absent, (C) the pill label is start-edge anchored (he x-origin right of en, not at the LTR left margin). RED now: ordinal/issues/pill are unrendered.

## Task Commits

Each task committed atomically:

1. **Task 1: 34-logo-embed.test.js (FN-3)** - `a195c43` (test)
2. **Task 2: 34-pill-localized.test.js (FN-2)** - `ec7f6de` (test)
3. **Task 3: 34-rtl-newblocks.test.js (D-10)** - `0385794` (test)

## Files Created/Modified
- `tests/34-logo-embed.test.js` - RED gate for the embedded, offline logo (image XObject)
- `tests/34-pill-localized.test.js` - RED gate for the verbatim localized pill across 4 locales
- `tests/34-rtl-newblocks.test.js` - RED gate for new-block RTL digit order + start-edge anchoring

## Verification (RED-now is the success condition)

Run via the canonical suite runner `node tests/run-all.js`:

- **Suite: 106 passed, 3 failed, 109 total.** The 3 failures are exactly these new gates (each `exit 1`), and zero tests FATAL'd — every failure is an assertion on not-yet-built behavior, not a harness crash.
- **MUST-STAY-GREEN invariants confirmed GREEN:** `pdf-digit-order`, `pdf-glyph-coverage`, `pdf-bold-rendering`, `pdf-bidi`, `pdf-latin-regression`, and `30-issue-delta` all PASS — undisturbed (no production or existing-test files were touched).
- **RED reasons confirmed under the suite runner:**
  - logo-embed: `[PASS]` offline source + `[PASS]` offline build; `[FAIL]` image XObject (no `/Subtype /Image` yet → gates 34-06).
  - pill-localized: 0/12 — label fused into the meta line, never standalone (→ gates 34-06); falsifiable against a hardcoded label (he/de/cs would fail a constant).
  - rtl-newblocks: 3/3 — Session #N / severity values / pill draw all absent (→ grows GREEN across 34-06/07/09).

Each test documents its falsifiability and the blocks it gates in a header comment, and self-exits 0/1 (`node tests/34-*.test.js`).

## Decisions Made
- Used the `doc.text()` string probe (via the helper's `onJsPDF` hook) for the verbatim-label check instead of per-glyph GID measurement: equally falsifiable, far more robust across scripts, and proven by the green `quick-260620-q8m` test. Accept label OR its visual reverse to cover LTR identity and Hebrew RTL shaping uniformly.
- Anchor correctness expressed as a he-vs-en x-origin differential (anchor-SIDE, not absolute coordinates) so it survives layout tuning yet fails a left-anchored RTL block.
- Each test injects its own dep `<script>` stubs so it is RED-correct both standalone and in-suite.

## Deviations from Plan
None - plan executed exactly as written. No production code was modified (this plan authors tests only); all three files match the plan's `files_modified`.

## Issues Encountered
- Standalone `node tests/<pdf-file>.test.js` hangs in this shell because jsdom (no resource loader) never fires load/error for an appended `<script src>`, so `PDFExport.loadScriptOnce()` never resolves. The canonical `tests/run-all.js` runner does not exhibit this (the invariant PDF tests pass there). To make the new gates deterministic in BOTH contexts, each injects `<script src>` stubs matching the lazy-load chain (the proven q8m pattern) so `loadScriptOnce`'s `querySelector` resolves immediately. This is contained entirely within the three new test files — the shared helper and existing tests were left untouched (avoiding any risk to the must-stay-green invariants).

## Next Phase Readiness
- 34-06 (header band + client card + logo + pill), 34-07 (footer/headings), and 34-09 (severity bars) now have executable RED gates to turn GREEN:
  - 34-06 → flips `34-logo-embed` (add `doc.addImage(window.IconLogoBase64,'PNG',…)`), `34-pill-localized` (draw the localized label as its own start-edge text), and parts A/C of `34-rtl-newblocks` (Session #N digits + pill anchor).
  - 34-09 → flips part B of `34-rtl-newblocks` (structured `issues[]` severity values).
- No blockers. The contract these gates assume: `buildSessionPDF` consumes `sessionData.sessionNumber` and a structured `sessionData.issues[] = {name,before,after}`, and renders the pill label via `shapeForJsPdf` + the `docDir` anchor convention.

## Self-Check: PASSED
- All 3 test files exist on disk.
- All 3 task commits present (a195c43, ec7f6de, 0385794).

---
*Phase: 34-session-pdf-export-visual-polish*
*Completed: 2026-06-29*
