---
phase: 41-replayable-guided-tour
plan: 02
subsystem: guided-tour
status: complete
tags: [tour, anchors, rot-guard, data-tour, chrome]
requires: []
provides:
  - "10 data-tour anchor attributes on always-present chrome (the tour engine's selector contract)"
  - "tests/41-anchor-presence.test.js — source-scan rot guard over the 10-anchor contract"
affects:
  - "Plan 41-03 (tour engine STEPS[]) binds each step to these exact data-tour values"
tech_stack:
  added: []
  patterns:
    - "Locale-independent, RTL-stable anchor contract via data-tour attributes (never #id/text selectors, D-02)"
    - "fs source-scan rot guard tolerant of both HTML attribute and JS setAttribute binding forms"
key_files:
  created:
    - tests/41-anchor-presence.test.js
  modified:
    - index.html
    - add-session.html
    - sessions.html
    - reporting.html
    - assets/app.js
    - tests/30-fake-test-detector.test.js
decisions:
  - "Registered 41-anchor-presence in the fake-test-detector ALLOWLIST — it reads assets/app.js as text by design (deliberate rot guard), mirroring the sanctioned static-guard pattern"
  - "session-setup anchor placed on the .form-grid wrapper (encloses client select + session-format toggle group + session date) — the first form section inside #sessionForm"
metrics:
  duration: ~10min
  completed: 2026-07-08
  tasks: 2
  files: 7
---

# Phase 41 Plan 02: Tour Anchor Contract Summary

Added the 10 `data-tour="…"` anchor attributes to real, always-present chrome across 4 page shells + 2 JS-mounted header buttons, and shipped a source-scan rot-guard test that fails if any anchor is silently dropped by a future refactor.

## What Was Built

**Task 1 (RED rot guard) — `c182c1f`**
- `tests/41-anchor-presence.test.js`: an fs source-scan mirroring `tests/40-precache.test.js`. Hardcodes the 10-anchor contract table (`{ value, sourceFile }`) and asserts each `data-tour` token is bound to its value in the declared file. The match regex `data-tour['"=\s,)]+value\b` accepts BOTH the HTML attribute form (`data-tour="value"`) and the JS setAttribute form (`setAttribute('data-tour', 'value')`). Authored RED — exits 1 with all 10 anchors missing.

**Task 2 (GREEN anchors) — `4767974`**
- `index.html`: `data-tour="overview"` (#greeting-card), `data-tour="add-client"` (#addClientBtn), `data-tour="add-session"` (#addSessionBtn)
- `add-session.html`: `data-tour="session-setup"` (.form-grid wrapper), `data-tour="session-heart"` ([data-accordion="heart-shield"]), `data-tour="session-save"` (.session-save-button)
- `sessions.html`: `data-tour="sessions"` (.section-title)
- `reporting.html`: `data-tour="reporting"` (.section-title)
- `assets/app.js`: `setAttribute('data-tour', 'help')` in `initHelpEntry` (.help-entry-btn), `setAttribute('data-tour', 'backup')` in `mountBackupCloudButton` (#backupCloudBtn)

All anchors are inert presentation attributes — no element behavior changed.

## Verification

- `node tests/41-anchor-presence.test.js` → exits 0 (all 10 anchors present); RED→GREEN confirmed
- `grep -rn "data-tour" index.html add-session.html sessions.html reporting.html assets/app.js` → exactly 10 matches (8 HTML attributes + 2 setAttribute calls)
- Acceptance greps: `data-tour="overview"` in index.html = 1; `data-tour="session-heart"` in add-session.html = 1; `setAttribute('data-tour', 'backup')` in app.js = 1
- `node tests/run-all.js` → 146 passed, 0 failed
- #addSessionBtn / #addClientBtn retain their id + existing classes (anchors additive)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Register 41-anchor-presence in the fake-test-detector ALLOWLIST**
- **Found during:** Task 2 verification (`node tests/run-all.js`)
- **Issue:** `tests/30-fake-test-detector.test.js` flagged the new rot guard as a "source-slicing" fake test because it reads `assets/app.js` as text to verify the backup/help anchors — exactly the pattern the detector polices. This is a legitimate deliberate static/audit guard, and the detector's own error message instructs registering such guards in the ALLOWLIST with a justification.
- **Fix:** Added `41-anchor-presence` to the detector's ALLOWLIST (and the doc-comment list) with a justification noting it is a by-design tour-anchor rot guard mirroring 40-precache. `40-precache` itself is not flagged because it reads HTML pages / sw.js, not `assets/*.js` directly.
- **Files modified:** tests/30-fake-test-detector.test.js
- **Commit:** 4767974 (folded into the Task 2 GREEN commit since it is part of making the suite green for this task)

## TDD Gate Compliance

- RED gate: `test(41-02)` commit `c182c1f` — anchor-presence guard authored failing (exit 1), no anchors present.
- GREEN gate: `feat(41-02)` commit `4767974` — anchors added, guard flips to exit 0, full suite green.
- No REFACTOR needed.

## Known Stubs

None — all 10 anchors bind live, always-present chrome (section titles + form zones + header buttons persist on an empty app, D-02).

## Self-Check: PASSED

- Created files exist: `tests/41-anchor-presence.test.js` FOUND
- Commits exist: `c182c1f` FOUND, `4767974` FOUND
- All 10 anchors resolve in their declared source (rot guard exits 0); full suite 146/146 green
