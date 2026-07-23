---
phase: 47-session-section-reordering
plan: 07
subsystem: session-form-severity
status: complete
tags: [session-form, severity, unrated, section-visibility, jsdom]
requires:
  - App.createSeverityScale / App.getSeverityValue with tap-again-to-clear (47-01)
  - App.isSectionEnabled('afterSeverity') (key 47-01, toggle 47-03)
  - D-02 form structure + afterSeverity container + severityField in createIssueBlock (47-04)
  - session.form.severityAtStart i18n key (47-02)
provides:
  - "unrated-aware form readers: getIssuesPayload forwards null (unrated) as-is"
  - "end-of-session-rating auto-hide keyed on an unrated (null) start rating (D-22)"
  - "start→end void on clear (D-22a): clearing a start rating clears the paired end scale"
  - "applySeverityVisibility() — couples every topic start-rating column to the Issue-severity switch"
  - "sectionHasData('afterSeverity') — numeric start/end rating counts as recorded severity data (G-11 mirror)"
  - "topic-row start-rating label swapped to 'Severity at start'"
affects:
  - assets/add-session.js
tech-stack:
  added: []
  patterns:
    - "reader forwards Number|null without coercion; validateIssues unchanged (payload.length > 0)"
    - "paired-widget void on anchor-clear (start clears end; end clears only itself)"
    - "per-topic column visibility mirrors the shipped disabled-section-with-data rule"
key-files:
  created:
    - tests/47-severity-form.test.js
  modified:
    - assets/add-session.js
decisions:
  - "The end-of-session auto-hide hides the whole per-topic summary row (issue summary block), so an unrated topic vanishes from the end-of-session block entirely rather than showing a name with no rating (D-22 'lists only start-rated topics')."
  - "Added an afterSeverity case to sectionHasData so the shipped disabled-section-with-data rule keeps a past session's recorded severity block visible+badged; without it the default-false path would have hidden recorded clinical data (Rule 2)."
  - "The G-11 'badged' affordance is carried by the afterSeverity block's existing .disabled-indicator-badge; the per-topic start columns mirror it by VISIBILITY parity (never hidden while the block shows) — no per-column badge DOM was invented (none exists / no i18n key)."
metrics:
  duration: ~25min
  completed: 2026-07-23
  tasks: 2
  files: 2
---

# Phase 47 Plan 07: Session-Form Severity Semantics Summary

Wired the session form's severity behavior on top of tap-again-to-clear (47-01) and
the D-02 structure (47-04). A topic's start rating is now optional: clearing it
(null) stays save-safe, round-trips through save→reload untouched, auto-hides that
topic's end-of-session rating row (keyed on emptiness), and voids the paired end
rating so no unmeasured topic carries a hidden exported value. The 'Issue severity'
toggle became the app-level severity switch — off hides both the end-of-session
block and every per-topic start-rating column on data-free sessions (topics stay),
keeps both visible+badged on past sessions carrying recorded severity, and restores
them on enable. The start-rating label now reads 'Severity at start'.

## What Was Built

**Task 1 — Unrated-aware readers + auto-hide + label (`assets/add-session.js`) [TDD]**
- `getIssuesPayload` is unchanged in shape — it already forwards `App.getSeverityValue`
  (a `Number` or `null`) as-is, so a cleared start/end rating persists as **null**
  (no coercion to 0, no marker). `validateIssues` is untouched (`payload.length > 0`
  only, never inspects ratings — G-17): a named topic with a cleared start rating
  stays in the payload and saves.
- `updateDelta` now toggles the topic's end-of-session summary row `is-hidden` when
  the start rating is `null`, so the end-of-session block lists only start-rated
  topics (D-22); selecting a numeric start restores the row and the numeric delta.
- New `onBeforeSeverityChange` handler on the start scale: when the start rating is
  cleared to `null`, it calls the new `clearSeverityScale` helper on the paired end
  scale (resets `dataset.value` + drops the active pill), so clearing the start
  **voids the pair** — `{before: null, after: null}` (D-22a). The end scale's own
  tap-again clears only itself; re-rating the start shows an empty end scale.
- Topic-row start-rating label swapped from `session.form.beforeSeverity` to
  `session.form.severityAtStart` ('Severity at start'). No skip-hint element exists
  (design dropped, D-19).
- Stored `null` round-trips: `createIssueBlock` still passes `initialIssue.before`
  through to `createSeverityScale`, and the end-of-init `updateDelta` hides the
  end-of-session row for a stored-null topic.

**Task 2 — Severity-off coupling (`assets/add-session.js`) [TDD]**
- Added an `afterSeverity` case to `sectionHasData`: any topic with a numeric start
  OR end rating counts as recorded severity data (an unrated null does not). This
  lets the shipped disabled-section-with-data rule in `applySectionVisibility` keep
  the end-of-session block visible+badged on a past rated session with the switch off.
- New **`applySeverityVisibility(isPastSession)`** pass: reads
  `App.isSectionEnabled('afterSeverity')` and hides every topic's start-rating column
  (`severityField`) when the switch is off AND the session carries no recorded
  severity; when a past session has recorded severity, the column stays visible so
  the start columns and the end block never disagree (G-11). Uses `is-hidden` class
  toggling — the node is never removed, so a selected value survives a disable→enable
  cycle.
- Wired the pass into form init (new + editing paths), the `app:settings-changed`
  handler (live toggle), and the add-topic path (a topic added while severity is off
  starts with its column hidden).

## Confirmations (per plan output spec)

- **Unrated persists as null, no marker:** `getIssuesPayload` forwards `null` for a
  cleared start/end rating; the round-trip test loads a stored `{before: null}` and
  re-renders it with no pill selected and no end-of-session row. No sentinel/marker
  value is introduced.
- **Severity-visibility pass name:** `applySeverityVisibility`.

## Deviations from Plan

**1. [Rule 2 — correctness] Added an `afterSeverity` case to `sectionHasData`**
- **Found during:** Task 2 (wiring the G-11 mirror).
- **Issue:** The plan assumed `applySectionVisibility` already keeps the afterSeverity
  block visible+badged for a disabled past session with data. But `sectionHasData`
  had no `afterSeverity` case, so it fell through to `default: return false` — meaning
  a disabled past session's recorded severity block would have been **hidden**, hiding
  recorded clinical data (the exact failure G-11 forbids).
- **Fix:** Added an `afterSeverity` case returning true when any topic carries a
  numeric start/end rating (guarded on `App.getSeverityValue` presence for the bare
  test stub). `applySeverityVisibility` reuses the same `sectionHasData('afterSeverity')`
  as its single data source, so the block and the columns always agree.
- **Files:** assets/add-session.js. **Commit:** 09049e1.

## Verification

- `node tests/47-severity-form.test.js` — **12/12 pass** (payload null-forward,
  save-safe + round-trip, end-of-session auto-hide, D-22a void, end-only clear,
  no-hint, label, severity-off no-data hide, severity-off past-data keep+badge,
  severity-on visible, added-topic hidden, hidden-not-removed value survival).
- `npm test` full suite — **217 passed, 0 failed** (no regression in existing
  add-session / severity tests — 34-severity-bars, 34-severity-unmeasured,
  30-issue-delta, 47-form-order, 47-severity-clear all still green).
- Comment hygiene: no planning IDs in the `assets/add-session.js` diff (grep swept).

## TDD Gate Compliance

Task 1: RED (`7cfbbe7` test) → GREEN (`c23f1dd` feat). Task 2: RED (`900f5e4` test)
→ GREEN (`09049e1` feat). Both feature commits are preceded by their failing-test
commit; no unexpected passes at RED.

## Manual Gate (before /gsd-verify-work)

Real-device: toggle Issue severity off in Settings → open a NEW form → the start-rating
column and the end-of-session block are gone, topics remain; open a PAST rated session
→ both visible with the disabled badge (G-11); clear a topic's start rating (tap the
active pill again) → its end-of-session row hides and its end rating voids (D-22/D-22a);
save + reopen → the pill stays unselected and the null round-trips.

## Known Stubs

None.

## Threat Flags

None. The readers forward `Number|null` without coercion (T-47-03 mitigated: null is
never confused with 0); no migration of existing sessions (T-47-12 mitigated: stored
before/after flow through the numeric/unrated branches unchanged, covered by the
past-session-with-numeric-data test case).

## Commits

- `7cfbbe7` — test(47-07): failing test for unrated-aware readers + end-of-session auto-hide
- `c23f1dd` — feat(47-07): unrated-aware form readers + end-of-session-rating auto-hide
- `900f5e4` — test(47-07): failing test for severity-off column coupling
- `09049e1` — feat(47-07): severity-off coupling — hide end-of-session block AND start column

## Self-Check: PASSED

- File created: tests/47-severity-form.test.js — present.
- File modified: assets/add-session.js — committed.
- Commits 7cfbbe7, c23f1dd, 900f5e4, 09049e1 — all present in git log.
