---
phase: 27-backup-restore-modal-visual-cohesion-ui-spec-pass
plan: 01
subsystem: ui
tags: [css, design-tokens, dark-mode, rtl, backup-modal, visual-cohesion, wcag-aa]

# Dependency graph
requires:
  - phase: 25-backup-architectural-rework
    provides: "Backup & Restore modal markup (backup-modal.js), modal CSS in app.css, Phase 25 test suite (25-02 modal-structure, 25-13 css-audit)"
  - phase: 27-ui-spec-pass
    provides: "27-UI-SPEC.md — approved, user-confirmed design contract (Fork 1 = Variant A plain+dividers; Fork 2 = amber Import band); checker Warning 2 dark-mode token fix"
provides:
  - "Single section rhythm: tinted cards removed from .backup-modal-section--contents and .backup-test-password-card; all sections are plain blocks on the modal surface separated by the existing hairline divider"
  - "One severity palette: .backup-modal-import-warning recoloured from danger -> warning tokens, matching .backup-test-password-result box metrics — both inline bands are now one amber component"
  - "Unified typography: all modal section headings at 1.125rem/700; Import-only heading override deleted"
  - "Dark-mode amber legibility: [data-theme=\"dark\"] --color-warning-bg/-text overrides (9.69:1 contrast on #202828) fix both the Import band and the pre-existing test-password error band"
affects: [backup-modal, future-ui-cohesion-phases, dark-mode-token-coverage]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Visual-only CSS pass: edit treatments/colour-mapping in app.css + token values in tokens.css; JS (backup-modal.js) preserved byte-for-byte"
    - "Severity inline-message component: two named selectors (.backup-modal-import-warning + .backup-test-password-result) share identical box metrics + the same --color-warning-* token family so they cannot drift"
    - "Dark-mode token override mirrors the success idiom: low-luminance bg + high-luminance text, verified WCAG-AA against the dark surface"

key-files:
  created:
    - .planning/phases/27-backup-restore-modal-visual-cohesion-ui-spec-pass/27-01-SUMMARY.md
  modified:
    - assets/app.css
    - assets/tokens.css

key-decisions:
  - "Kept the two inline bands as two named rules with identical values (plan-sanctioned over factoring a shared class) — existing tests assert each selector by name, so no hooked class was renamed"
  - "Dark amber pair = #3a2f00 bg / #ffd966 text (contrast 9.69:1 on #202828 — clears WCAG AA and AAA)"
  - "Deleted the now-empty .backup-modal-section--contents rule entirely rather than leaving an empty block"

patterns-established:
  - "Pattern: one severity palette per surface — Import warning + test-password error share --color-warning-* and box metrics; red is reserved for the moment-of-action confirm dialog only"
  - "Pattern: every token a modal references must have a dark-mode value; adding the missing --color-warning-* dark override closes the last gap (danger stays light-only by design)"

requirements-completed: [ROADMAP-27-1, ROADMAP-27-2, ROADMAP-27-3, ROADMAP-27-4, ROADMAP-27-5]

# Metrics
duration: 5min
completed: 2026-06-14
---

# Phase 27 Plan 01: Backup & Restore Modal Visual Cohesion Summary

**Visual-cohesion CSS pass that collapses the Backup & Restore modal to one section rhythm (plain blocks + dividers), one heading size (1.125rem), and one amber severity palette — plus the two previously-missing dark-mode `--color-warning-*` overrides — with `backup-modal.js` preserved byte-for-byte.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-14T22:12:00Z (approx)
- **Completed:** 2026-06-14T22:17:29Z
- **Tasks:** 3 (2 implementation + 1 [BLOCKING] verification)
- **Files modified:** 2 source files (assets/app.css, assets/tokens.css) + sw.js auto-bumped by pre-commit hook

## Accomplishments
- **One section rhythm (Fork 1 = Variant A):** removed the tinted-card background/radius/card-padding from `.backup-modal-section--contents` (rule deleted as it became empty) and `.backup-test-password-card` (flex-column 16px gap kept — a test asserts on it). Every section now sits on the plain modal surface, divided only by the existing hairline.
- **One severity palette (Fork 2):** recoloured `.backup-modal-import-warning` from the red danger tokens to the amber `--color-warning-*` tokens with box metrics identical to `.backup-test-password-result` (padding `var(--space-sm,8px) var(--space-md,16px)`, `border-radius:4px`, `4px` border-inline-start). The Import warning and test-password error now read as one inline-message component. No `--color-danger-*` token remains on the warning selector.
- **Unified typography:** `.backup-modal-section-heading` dropped from 1.4rem to 1.125rem; the redundant `.backup-modal-section--import .backup-modal-section-heading` override was deleted. All section headings (Export / Import / Test-password / Contents / "How reminders work" summary) now render at a single size.
- **Dark-mode amber legibility (checker Warning 2):** added `--color-warning-bg:#3a2f00` + `--color-warning-text:#ffd966` inside the `[data-theme="dark"]` block, mirroring the success low-bg/high-text idiom. Measured contrast 9.69:1 on `#202828` — clears WCAG AA (and AAA). Fixes both the recoloured Import band and the pre-existing test-password error band in one place (shared tokens).
- **Behaviour preserved:** `assets/backup-modal.js` is byte-for-byte unchanged (blob hash `7f8f2bbb` before and after). The red destructive-Import confirm (`App.confirmDialog` `messageKey: 'backup.confirmReplace'`) still fires and still gates `BM.importBackup(file)` via `if (!confirmed) return;`. Full test suite green: 66/66, FAIL=0.

## Task Commits

Each task was committed atomically:

1. **Task 1: Four CSS cohesion deltas (card removal, heading unification, amber import warning, shared box metrics)** — `65a68c9` (feat)
2. **Task 2: Dark-mode amber `--color-warning-*` overrides in tokens.css** — `70dd81e` (feat)
3. **Task 3: [BLOCKING] full-suite + behaviour-preservation gate** — verification only, no file changes (no commit)

**Plan metadata:** committed separately (docs: complete plan)

_Note: sw.js CACHE_NAME was auto-bumped by the pre-commit hook on each asset commit (v194 → v195 → v196) — not pre-bumped, per project rule._

## Files Created/Modified
- `assets/app.css` — Removed two tinted-card treatments; unified section heading to 1.125rem and deleted the Import-only override; recoloured the Import warning to the amber warning tokens with box metrics matching the test-password result band.
- `assets/tokens.css` — Added `--color-warning-bg` / `--color-warning-text` overrides inside the `[data-theme="dark"]` block (low-luminance amber bg + high-luminance amber text, AA on `#202828`).
- `sw.js` — CACHE_NAME auto-bumped by the pre-commit hook (v194 → v196). Not authored by this plan's edits.

## Decisions Made
- Kept the two inline bands as **two named rules with identical values** rather than factoring a shared `.backup-inline-message` class. The plan explicitly allowed either; the named-rules approach avoids any risk of renaming a class that tests/markup assert on. Visual result is identical and the two cannot drift (same tokens, same metrics).
- **Deleted** the `.backup-modal-section--contents` rule entirely once stripping its card properties left it empty, rather than leaving a no-op block.
- Chose the dark amber pair **`#3a2f00` / `#ffd966`** (the plan's suggested values) after verifying 9.69:1 contrast — comfortably above the 4.5:1 AA floor for the bold band copy.

## Deviations from Plan

None - plan executed exactly as written. All four CSS deltas and the two token overrides were applied with the exact selectors, tokens, and values specified in the plan and 27-UI-SPEC.md.

## Issues Encountered
None. Both implementation tasks passed their verify gates on the first run; the [BLOCKING] Task 3 gate (66/66 suite green, byte-for-byte backup-modal.js, red confirm intact, scope clean) passed without remediation.

## Verification Results
- **Task 1 gate:** `node tests/25-13-css-audit.test.js` 14/0; heading-base-1.125, import-override-deleted, warning-amber-no-danger, test-card-flex, dropzone-dashed, rtl-logical-props, no-new-hex — all PASS.
- **Task 2 gate:** dark-warning-overrides-present, dark-success-untouched, dark-danger-not-added — all PASS; light root `--color-warning-*` definitions unchanged; WCAG contrast 9.69:1.
- **Task 3 [BLOCKING] gate:** `PASS=66 FAIL=0` → SUITE-GREEN; red-confirm PASS; warning-hooks PASS; `backup-modal.js` blob hash `7f8f2bbb` unchanged; confirm gates `BM.importBackup`; all 7 required modal IDs present; result-class `.success`/`.error` toggling intact.
- **Scope:** only `assets/app.css` + `assets/tokens.css` changed by the edits; `sw.js` appeared only post-commit via the hook. No JS, markup, or i18n file touched.

## Known Stubs
None — no placeholder/TODO/FIXME patterns introduced; this is a colour/treatment-only change on existing, fully-wired markup.

## Next Phase Readiness
- The Backup & Restore modal now has one coherent visual system; the "modal reads as not thought through" UAT finding (Ben, 2026-05-16) is closed at the CSS layer.
- Every token the modal references now has a dark-mode value; no remaining dark-mode contrast gap in this modal.
- Ready for Ben's visual UAT (light + dark mode). No functional regression — Phase 25 behaviour preserved byte-for-byte.

## Self-Check: PASSED

- FOUND: `.planning/phases/27-backup-restore-modal-visual-cohesion-ui-spec-pass/27-01-SUMMARY.md`
- FOUND: commit `65a68c9` (Task 1 — CSS cohesion deltas)
- FOUND: commit `70dd81e` (Task 2 — dark-mode warning overrides)
- backup-modal.js blob `7f8f2bbb` unchanged; full suite 66/66 green.

---
*Phase: 27-backup-restore-modal-visual-cohesion-ui-spec-pass*
*Completed: 2026-06-14*
