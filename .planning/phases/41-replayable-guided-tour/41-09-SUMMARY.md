---
phase: 41-replayable-guided-tour
plan: 09
subsystem: guided-tour
tags: [tour, anchors, data-tour, settings-first, rot-guard]
status: complete
requires:
  - 41-STORYLINE.md v3 (settings-first, 12 steps, Ben-approved 2026-07-09)
provides:
  - 12-anchor v3 data-tour contract (overview/settings/personalize/fields/snippets/nav/session-setup/session-heart/session-save/nav-sessions/backup/help)
  - anchor-presence rot guard enforcing the 12-anchor v3 contract (hyphen-safe boundary)
affects:
  - 41-10 (tour engine STEPS[] binds to these exact data-tour values + per-step tab activation)
tech-stack:
  added: []
  patterns:
    - JS setAttribute tour-anchor idiom (gear mirrors help/backup)
    - renderNav template-literal data-tour attributes (dynamic chrome, every page)
key-files:
  created: []
  modified:
    - tests/41-anchor-presence.test.js
    - index.html
    - add-session.html
    - settings.html
    - sessions.html
    - reporting.html
    - assets/app.js
decisions:
  - "Hyphen-safe value boundary ((?![\\w-])) so the nav row cannot be satisfied by data-tour=nav-sessions — nav and nav-sessions are distinct contract rows."
  - "session-heart anchor moved from the heart-shield accordion to the emotions accordion (open by default) for deixis honesty — the lit section matches the copy's first noun."
  - "No home begin anchor and no nav-reporting anchor in v3 (home begin replaced by whole-menu step 6; Reporting named in finish copy, not visited)."
metrics:
  duration: 3min
  completed: 2026-07-09
  tasks: 3
  files: 7
---

# Phase 41 Plan 09: Recompose Tour Anchor Contract to v3 (settings-first) Summary

Re-anchored the guided tour to the Ben-approved 41-STORYLINE.md v3 12-step settings-first arc: added personalize/fields/snippets anchors on the three settings.html tab panels, nav on the whole `.app-nav` menu and nav-sessions on the Sessions link in renderNav, settings on the header gear, moved session-heart to the emotions accordion, retired the per-button (index.html) and section-title (sessions.html/reporting.html) anchors, and updated the anchor-presence rot guard (RED→GREEN) to enforce the new 12-anchor contract with a hyphen-safe value boundary.

## What Was Built

- **Task 1 (RED):** `tests/41-anchor-presence.test.js` ANCHORS[] table rewritten to the 12 v3 values in step order (overview, settings, personalize, fields, snippets, nav, session-setup, session-heart, session-save, nav-sessions, backup, help), retired rows removed, no nav-reporting row added. Value-boundary changed from bare `\b` to `(?![\w-])` so `nav` is not satisfied by `data-tour="nav-sessions"`. Header doc-comment step→file mapping updated. Ran RED (6 fails: settings/personalize/fields/snippets/nav/nav-sessions) as designed.
- **Task 2 (HTML anchors):** settings.html — `data-tour="personalize"` on `#settingsTabPersonalize` (default-active), `data-tour="fields"` on `#settingsTabFields` (keeps `hidden`), `data-tour="snippets"` on `#settingsTabSnippets` (keeps `hidden`). add-session.html — `data-tour="session-heart"` moved off the heart-shield accordion onto the `data-accordion="emotions"` accordion (open by default). index.html — removed `data-tour="add-client"`/`data-tour="add-session"` (ids/classes/labels/icons intact; `data-tour="overview"` untouched). sessions.html/reporting.html — removed section-title `data-tour` attributes (data-i18n + text intact).
- **Task 3 (JS anchors → GREEN):** renderNav template — `data-tour="nav"` on the `<nav class="app-nav">` element, `data-tour="nav-sessions"` on the Sessions `<a>`. initSettingsLink — `link.setAttribute('data-tour', 'settings')` on the `.settings-gear-btn` (mirrors the help/backup anchor idiom). navGuard wiring, gear SVG, insertion order and language listener untouched.

## Verification

- `node tests/41-anchor-presence.test.js` → RED (exit 1, 6 fails) after Task 1; GREEN (exit 0, 12/12 PASS) after Task 3. Hyphen-safe boundary confirmed: `nav` satisfied by `.app-nav`, `nav-sessions` by the Sessions link, as distinct rows.
- `node tests/run-all.js` → 152 passed, 0 failed (no regression; guard now runs 12 checks vs 10).
- All per-task grep gates pass: retired anchors = 0, new anchors present with correct counts, `#settingsTabFields` retains `hidden`, `#addClientBtn`/`#addSessionBtn` ids intact, `App.installNavGuard` present, no nav-reporting anchor.

## Deviations from Plan

None — plan executed exactly as written. One in-file wording adjustment during Task 1: the new doc-comment initially contained the literal token "nav-reporting" which tripped the plan's own retired-anchor grep gate (grep expected 0); reworded to "no Reporting nav anchor" so the gate reads 0. This is a comment-text fix inside the same task, not a scope change.

## Self-Check: PASSED

- `tests/41-anchor-presence.test.js` FOUND, GREEN (12/12).
- index.html, add-session.html, settings.html, sessions.html, reporting.html, assets/app.js — all modified and verified via grep.
- Commits present: 9727a5e (Task 1), 490bf3d (Task 2), ac1be28 (Task 3).
