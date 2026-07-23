---
phase: 47-session-section-reordering
plan: 13
subsystem: session-form-severity
status: complete
tags: [session-form, severity, dirty-flag, section-visibility, jsdom, gap-closure]
requires:
  - applySectionVisibility / applySeverityVisibility / sectionHasData('afterSeverity') (47-07)
  - App.createSeverityScale onChange fires only on user click, set AND clear (47-01)
  - formDirty + updateCancelButtonLabel + window.PortfolioFormDirty leave-guard (shipped)
provides:
  - "onSeverityInteraction — shared severity-pill onChange hook: marks the form dirty AND re-runs section/severity visibility live"
  - "severity pill set/clear now sets formDirty so the leave-guard warns on navigation (G4 closed)"
  - "live section-visibility re-eval so a disabled, fully-emptied afterSeverity section collapses header-and-all (G3 closed)"
affects:
  - assets/add-session.js
tech-stack:
  added: []
  patterns:
    - "wire dirty + visibility at the widget's user-interaction onChange seam only, never in the shared helpers the init/load paths call programmatically"
    - "past-session flag (!!editingSession) drives the live re-eval, same source the init/settings-changed passes use"
key-files:
  created: []
  modified:
    - assets/add-session.js
    - tests/47-severity-form.test.js
decisions:
  - "The dirty flag + visibility re-eval are wired in a shared onSeverityInteraction hook called from the two scales' onChange arrows only — NOT inside updateDelta/onBeforeSeverityChange, which run programmatically at init/load (createIssueBlock ~852, populateSession) and would false-dirty a freshly opened form."
  - "G3 guards drive the real read→edit flow: a past session opens in read mode (severity pills disabled), so the tests click #editSessionBtn before clearing — a disabled button dispatches no click in jsdom, and the un-edited version was a false pass. This mirrors the UAT repro exactly (open past session → Edit → clear)."
  - "app.js was NOT touched: App.createSeverityScale already fires onChange only on user click for both set and clear, so the existing callback is a sufficient seam."
metrics:
  duration: ~40min
  completed: 2026-07-23
  tasks: 2
  files: 2
---

# Phase 47 Plan 13: Severity dirty-flag + live section-visibility gap closure Summary

Closed G3 and G4 from 47-UAT.md, both in the session form's severity behavior.
A single shared `onSeverityInteraction(issueObj, apply)` hook now sits at the
start- and end-scale `onChange` seam in `createIssueBlock`: it runs the existing
per-scale helper, marks the form dirty, and re-evaluates section visibility live.
Every severity pill set/clear now trips the leave-guard (G4), and a disabled,
fully-emptied end-of-session severity section collapses header-and-all as its last
numeric rating is cleared (G3).

## What Was Built

**Task 1 — G4: every severity interaction marks the form dirty (`assets/add-session.js`) [TDD]**
- New `onSeverityInteraction(issueObj, apply)` helper: calls `apply(issueObj)` (the
  existing per-scale handler), then sets `formDirty = true` and calls
  `updateCancelButtonLabel()`, mirroring the form input/change listeners.
- The two scale callbacks in `createIssueBlock` now route through it:
  start scale → `onSeverityInteraction(issueRef.obj, onBeforeSeverityChange)`,
  end scale → `onSeverityInteraction(issueRef.obj, updateDelta)`.
- The severity pills are `<button>` elements whose clicks never fire the form
  input/change events the dirty tracker listens to; wiring at the onChange seam
  closes that silent-loss path. Because `App.createSeverityScale` fires `onChange`
  only on a user click (never on the initial-value render), the programmatic
  init/load calls to `updateDelta` / `onBeforeSeverityChange` stay outside the hook
  and never false-dirty a freshly loaded form.

**Task 2 — G3: live section-visibility re-eval as ratings empty (`assets/add-session.js`) [TDD]**
- Extended `onSeverityInteraction` to re-run `applySectionVisibility(!!editingSession)`
  and `applySeverityVisibility(!!editingSession)` after each interaction.
- When the severity switch is off and clearing the last numeric rating flips
  `sectionHasData('afterSeverity')` to false, the re-eval hides the emptied disabled
  `afterSeverity` section — header and disabled badge included. The disabled-with-data
  rule is preserved unchanged: a section still carrying a numeric rating stays
  visible + badged, and clear-voids-pair / unrated-by-default semantics are untouched.

## Confirmations (per plan guidance)

- **app.js untouched:** the fix lives entirely in add-session.js at the existing
  onChange seam; `App.createSeverityScale` already exposes the needed user-click
  callback for set and clear on both scales.
- **No false-dirty on load:** dirty-marking is at the onChange arrow only, not in the
  shared helpers; the existing suite (loads that call `updateDelta`/`onBeforeSeverityChange`
  programmatically) stays green.

## Deviations from Plan

**1. [Rule 1 — test correctness] G3 guards must enter edit mode before clearing**
- **Found during:** Task 2 (writing the live-collapse guard).
- **Issue:** A past session (`sessionId`) loads via `populateSession` and then
  `setReadMode(true)`, which sets `disabled = true` on every `.severity-button`. A
  disabled button dispatches no click in jsdom, so clicking a pill did nothing and the
  section trivially "stayed visible" — a false pass that would never exercise the
  re-eval.
- **Fix:** The two G3 cases now click `#editSessionBtn` (→ `setReadMode(false)`) before
  clearing ratings, exactly matching the UAT repro (open past session → Edit → clear).
  Verified the guard is real: temporarily stripping the two visibility calls makes
  case 17 fail (17 passed / 1 failed), and restoring them makes all 18 pass.
- **Files:** tests/47-severity-form.test.js. **Commit:** 1cae898.

## Verification

- `node --check assets/add-session.js` — passes.
- `node tests/47-severity-form.test.js` — **18/18 pass** (12 existing + 4 new dirty
  cases: start set, start clear, end set+clear, save-resets-clean; + 2 new live-collapse
  cases: clear-all hides header+badge, one-rating-kept stays visible+badged).
- `node tests/30-section-visibility.test.js` — **6/6 pass** (no regression to the
  disabled-with-data rule).
- `npm test` — **218 passed, 0 failed** (full suite, no regressions).
- Comment-hygiene grep over the full plan diff (add-session.js + test): no planning
  tokens (ORDR-/D-/G-/R-/47-/"Phase 47") in any added line.

## TDD Gate Compliance

Task 1: RED (`a65b6cd` test) → GREEN (`d4ab62f` feat). Task 2: RED (`a567448` test)
→ GREEN (`1cae898` feat). Each feature commit is preceded by its failing-test commit;
no unexpected passes at RED (the dirty cases failed pre-fix; case 17 failed pre-fix).

## Manual Gate (real device, Hebrew — before /gsd-verify-work)

Toggle Issue severity off in Settings → open a past rated session → click Edit →
clear both topics' start ratings: the end-of-session severity section
(דרגת חומרה — סיום המפגש) disappears, header included. On a session where one topic
keeps a rating the section stays visible + badged. Clear a rating then click the logo:
the "lose your changes?" leave-guard fires. Save, then navigate: no warning.

## Known Stubs

None.

## Threat Flags

None. This re-wires existing client-side form event handling only — no new trust
boundary, no new input, no persistence-format change, no package install. T-4713-01
(silent data loss on navigation) and T-4713-02 (stale empty section header) are both
mitigated as planned; readers still forward `Number|null` without coercion.

## Commits

- `a65b6cd` — test(47-13): failing guards — severity pill interactions must mark the form dirty
- `d4ab62f` — feat(47-13): mark the form dirty on every severity-pill interaction
- `a567448` — test(47-13): failing guard — emptied disabled severity section must live-hide
- `1cae898` — feat(47-13): live section-visibility re-eval as severity ratings empty

## Self-Check: PASSED

- File modified: assets/add-session.js — committed (d4ab62f, 1cae898).
- File modified: tests/47-severity-form.test.js — committed (a65b6cd, a567448, 1cae898).
- Commits a65b6cd, d4ab62f, a567448, 1cae898 — all present in git log.
