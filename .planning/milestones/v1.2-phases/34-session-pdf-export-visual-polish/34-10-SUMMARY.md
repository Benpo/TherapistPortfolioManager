---
phase: 34-session-pdf-export-visual-polish
plan: 10
subsystem: testing
tags: [pdf, jspdf, golden-baseline, sha256, regression, rtl, i18n, jsdom]

# Dependency graph
requires:
  - phase: 34-06
    provides: logo/header render fn (image XObject, keyline, title)
  - phase: 34-07
    provides: leaf-diamond section headings, body typography, three-zone footer band
  - phase: 34-09
    provides: two-bar before/after severity render fn
  - phase: 34-05
    provides: derived Session #N ordinal data contract
  - phase: 34-08
    provides: PDFX-03 save-before-export fence
  - phase: 23-04
    provides: pdf-latin-regression harness + 5-fixture golden-baseline protocol
provides:
  - Regenerated 5 SHA-256 golden PDF baselines (en/de/cs/he/he-mixed) locking the human-approved redesigned export as the new golden reference (D-11)
  - One approved Hebrew footer label tweak (pdf.footer.exportedOn -> "הופק בתאריך")
  - Full suite proven 112/112 green with pdf-latin-regression matching the new baselines
affects: [pdf-export, future-pdf-changes, latin-regression-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Golden-baseline regeneration is gated by a BLOCKING human visual sign-off (EN+HE) before commit — the SHA proves bytes changed, only the human proves they changed correctly (D-11)"

key-files:
  created:
    - .planning/phases/34-session-pdf-export-visual-polish/34-10-SUMMARY.md
  modified:
    - .planning/fixtures/phase-23/fixture-en.pdf.sha256
    - .planning/fixtures/phase-23/fixture-de.pdf.sha256
    - .planning/fixtures/phase-23/fixture-cs.pdf.sha256
    - .planning/fixtures/phase-23/fixture-he.pdf.sha256
    - .planning/fixtures/phase-23/fixture-he-mixed.pdf.sha256
    - assets/i18n-he.js

key-decisions:
  - "D-11: regenerated the 5 golden baselines deliberately AFTER a human visual sign-off (EN+HE), never as a silent edit"
  - "Approved Hebrew footer label change: pdf.footer.exportedOn 'יוצא בתאריך' -> 'הופק בתאריך' (HE locale value only; key-presence parity preserved)"
  - "Owner-approved design revisions at the checkpoint INTENTIONALLY override locked decisions D-05/header-subtitle (header simplified, severity repositioned, page-2 header restyled)"

patterns-established:
  - "Pattern: never regenerate baselines over a RED floor/render gate — confirm every floor + 34 gate is genuinely green (real PASS/FAIL output, bytes>0) before --regenerate"

requirements-completed: [PDFX-01]

coverage:
  - id: D1
    description: "5 SHA-256 golden PDF baselines (en/de/cs/he/he-mixed) regenerated to lock the human-approved redesigned export as the new golden reference"
    requirement: PDFX-01
    verification:
      - kind: unit
        ref: "tests/pdf-latin-regression.test.js (5/5 PASS against regenerated baselines)"
        status: pass
    human_judgment: true
    rationale: "The hash proves the bytes changed; only the owner's visual sign-off (EN+HE vs FINAL-mockup.html) proves they changed CORRECTLY. Checkpoint approved before commit (D-11)."
  - id: D2
    description: "Approved Hebrew footer 'exported on' label tweak (pdf.footer.exportedOn -> הופק בתאריך)"
    requirement: PDFX-01
    verification:
      - kind: unit
        ref: "tests/25-11-i18n-parity.test.js (23/23 PASS — key-presence parity preserved)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full test suite green with the new baselines and unchanged floor/render gates"
    verification:
      - kind: unit
        ref: "node tests/run-all.js (Suite: 112 passed, 0 failed, 112 total)"
        status: pass
    human_judgment: false

# Metrics
duration: ~15min
completed: 2026-06-30
status: complete
---

# Phase 34 Plan 10: Golden-Baseline Regeneration Summary

**Regenerated the 5 SHA-256 golden PDF baselines to lock the human-approved redesigned session export (EN+HE visually verified) as the new golden reference, plus one approved Hebrew footer label tweak — full suite proven 112/112 green.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-30T08:35:00Z
- **Completed:** 2026-06-30T08:50:00Z
- **Tasks:** 2 (Task 1 regenerate + Task 2 human-verify, approved before this continuation)
- **Files modified:** 6 (5 baselines + assets/i18n-he.js)

## Accomplishments

- Applied the single owner-approved Hebrew footer label change: `pdf.footer.exportedOn` `"יוצא בתאריך"` → `"הופק בתאריך"` (HE locale value only; i18n key-presence parity preserved, 23/23 green).
- Confirmed every floor + 34 gate is GENUINELY green (real PASS/FAIL output, bytes>0) BEFORE regenerating — no real regression masked: pdf-digit-order 4/4, pdf-glyph-coverage 3/3, pdf-bold-rendering 9/9, pdf-bidi 12/12, 30-issue-delta 7/7, 25-11-i18n-parity 23/23, 34-logo-embed 3/3, 34-pill-localized 12/12, 34-rtl-newblocks 3/3, 34-severity-bars 3/3, 34-session-ordinal 3/3, 34-save-before-export 5/5.
- Regenerated the 5 golden baselines via `node tests/pdf-latin-regression.test.js --regenerate` (Mitigation B pins /CreationDate + /ID for byte-determinism) — locking the human-approved redesigned output (D-11).
- Re-ran the full suite: **112/112 GREEN**, including pdf-latin-regression now matching the regenerated baselines (5/5).

## Regenerated baselines (short SHA-256)

| Fixture | New hash (12) |
|---------|---------------|
| fixture-en | `8b20e937710e` |
| fixture-de | `a99f81c01576` |
| fixture-cs | `63f211baad77` |
| fixture-he | `fcbed888dfcf` |
| fixture-he-mixed | `9d28556bc2d7` |

## Task Commits

1. **Hebrew footer label tweak** - `6413d25` (fix) — `assets/i18n-he.js`
2. **Regenerate 5 golden baselines** - `6e4418b` (chore) — `.planning/fixtures/phase-23/*.pdf.sha256`

**Plan metadata:** (this commit) `docs(34-10): complete baseline regeneration plan`

## Files Created/Modified

- `assets/i18n-he.js` - Hebrew `pdf.footer.exportedOn` value updated to the approved "הופק בתאריך".
- `.planning/fixtures/phase-23/fixture-{en,de,cs,he,he-mixed}.pdf.sha256` - regenerated golden baselines for the redesigned export.
- `.planning/phases/34-session-pdf-export-visual-polish/34-10-SUMMARY.md` - this summary.

## Decisions Made

- **D-11 honored:** baselines regenerated deliberately AFTER the owner's blocking visual sign-off (EN + HE both verified against `design-mockups/FINAL-mockup.html`), never a silent edit. The byte hash proves the bytes changed; only the human check proves they changed correctly.
- **Approved design revisions at the checkpoint intentionally override locked decisions** (owner-approved): the header was simplified (logo + subtitle removed), severity was moved to its form-order position, and the page-2 running header was restyled as page chrome. These deviate from the originally locked D-05/header-subtitle decisions by explicit owner approval at the visual checkpoint.
- **Label scope:** only the HE locale value was changed; en/de/cs untouched (parity is by key presence, so a value-only change keeps parity green).

## Deviations from Plan

None for this continuation — the only plan-authored change beyond Task 1 (regenerate) was the owner-requested Hebrew label tweak applied at the checkpoint, which is in scope of the approval.

## Issues Encountered

**Mid-phase test-harness defect (fixed earlier in the phase, recorded here for the trail):** `pdf-latin-regression` and three floor gates (pdf-digit-order / pdf-glyph-coverage / pdf-bold-rendering) were inert false-GREEN — `buildSessionPDF` never resolved under the jsdom harness because `loadScriptOnce` appended an unresolvable `<script>` (jsdom has no resource loader, so `onload`/`onerror` never fires; the event loop drained and the process exited 0 with 0 bytes). The inertness predated Phase 34 (regressed at the 30-03 test migration that dropped `<script>` stub injection). Fixed in:

- `a6951a8` — inject `IconLogoBase64` into the shared jsdom PDF test harness.
- `cb00179` — make `buildSessionPDF` dep/logo lazy-load non-blocking under jsdom (`loadScriptOnce` resolves synchronously when the global is already present; production append+await path preserved).

Full investigation trail: `.planning/debug/pdf-harness-loadscript-hang.md`. Because these gates are now genuinely live, the green results above are real, not inert.

## Next Phase Readiness

- D-11 closed: the redesigned PDF is the new golden reference, visually verified (EN+HE) and locked behind the regenerated baselines; full suite 112/112 green.
- Phase-level verification and completion are handled by the orchestrator (this plan does NOT mark the phase complete or spawn a verifier).

---
*Phase: 34-session-pdf-export-visual-polish*
*Completed: 2026-06-30*
