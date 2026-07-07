---
phase: 39-help-center-entry-point
plan: 05
subsystem: help-onboarding
tags: [help, onboarding, empty-state, deep-link, i18n, HELP-05]
requires:
  - "window.HELP_DEEPLINKS (Plan 01): adding-a-client, starting-a-session, overview"
  - "help.deeplink.cta / startSession / readDashboard i18n keys (Plan 02)"
  - "help.html deep-link card auto-expand on location.hash (Plan 04)"
provides:
  - "First-run empty-state coaching on the Overview / Sessions / Reporting trio"
  - "Sessions TRUE-empty vs FILTER-empty distinction (Pitfall 3)"
  - "tests/39-empty-state-coaching.test.js behavior guard"
affects:
  - assets/overview.js
  - assets/sessions.js
  - assets/reporting.js
  - reporting.html
tech-stack:
  added: []
  patterns:
    - "Coaching nodes are SIBLINGS of the data-i18n empty-state div (applyTranslations overwrites the div's textContent and would wipe a nested button)"
    - "createElement + textContent + data-i18n so applyTranslations re-localizes on language switch; non-accent .button.ghost (D-22)"
key-files:
  created:
    - tests/39-empty-state-coaching.test.js
  modified:
    - assets/overview.js
    - assets/sessions.js
    - assets/reporting.js
    - reporting.html
decisions:
  - "'No data' for Reporting == zero sessions to aggregate (every stat is session-derived); zero clients alone is not treated as no-data since the branch keys on totalSessions"
  - "Coaching buttons are <a class='button ghost'> deep-links (native hash navigation triggers Plan 04 card auto-expand); non-accent per D-22"
  - "Coaching nodes rendered as siblings of #emptyState/#sessionsEmpty (not children) so applyTranslations' textContent overwrite on language switch cannot wipe them"
metrics:
  duration: ~18min
  completed: 2026-07-07
status: complete
---

# Phase 39 Plan 05: First-Run Empty-State Coaching Deep-Links Summary

Wired the first-run "Show me how" coaching trio (HELP-05, D-21/D-22): a soft non-accent secondary deep-link under the calm empty sentence on Overview (no clients → `help.html#adding-a-client`), Sessions (true zero-sessions → `help.html#starting-a-session`), and Reporting (no data → `help.html#overview`), with Sessions correctly distinguishing its TRUE-empty from its existing FILTER-empty (Pitfall 3), guarded by a 4-case jsdom behavior test.

## What Was Built

- **Overview (`assets/overview.js`)** — `syncOverviewCoachButton(show)` appends/toggles `#overviewCoachBtn`, a `.button.ghost` `<a>` → `./help.html#adding-a-client`, as a sibling of `#emptyState`. Shown in the no-clients branch of `renderClientRows`, hidden when clients exist. The existing `overview.clients.empty` sentence is reused unchanged.
- **Sessions (`assets/sessions.js`)** — derived `totalSessions` from the UNFILTERED `getAllSessions()` result. In the `!filtered.length` branch: `totalSessions === 0` → `syncSessionsCoach(true)` shows a coaching block (`help.deeplink.startSession` sentence + `#sessionsCoachBtn` → `./help.html#starting-a-session`) and hides `#sessionsEmpty`; `totalSessions > 0` → the existing `sessions.empty` filter-empty message shows and no coaching appears.
- **Reporting (`assets/reporting.js` + `reporting.html`)** — added a hidden `#reportingEmpty` container near the stat grid. `renderReporting` branches on `totalSessions === 0`: builds `#reportingCoachBtn` → `./help.html#overview` + the `help.deeplink.readDashboard` sentence, shows the container, and hides `.stat-grid`; otherwise hides the container and renders stats as before.
- **Test (`tests/39-empty-state-coaching.test.js`)** — jsdom behavior guard: Overview direct `renderClientRows`; Sessions/Reporting real-page boot with a stubbed `PortfolioDB`. Four cases asserting DOM nodes (not source strings), including the falsifiable Pitfall-3 negative.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- Task 1 wiring smoke-check: `OK overview+sessions wiring`.
- Task 2 wiring smoke-check: `OK reporting wiring`.
- `node tests/39-empty-state-coaching.test.js` → 4 passed, 0 failed (exit 0).
- Pitfall-3 falsifiability: temporarily firing coaching on filter-empty makes case 3 FAIL (verified), reverted → all green.
- `npm test` → 135 passed, 0 failed.

## Threat Model Compliance

- **T-39-09 (Tampering, empty-state coaching DOM — mitigate):** all coaching sentences + buttons built via `createElement` + `textContent` from i18n dict values; hrefs/`data-i18n` set via `setAttribute` with static strings. No `innerHTML`, no user input. Mitigation present. No new security surface introduced.

## Notes for Downstream

- Deep-link hrefs resolve against `window.HELP_DEEPLINKS` (Plan 01) and are validated by the Plan 01 integrity test; Plan 04 `help.html` auto-expands the matching card on `location.hash`.
- Coaching labels come from the Plan 02 i18n keys — 4-locale parity is owned by the i18n layer, not this plan.

## Self-Check: PASSED

All 5 files verified present on disk; all 3 task commits (58db351, f99d97f, 51de620) verified in git log.
