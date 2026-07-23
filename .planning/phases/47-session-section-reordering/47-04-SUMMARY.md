---
phase: 47-session-section-reordering
plan: 04
subsystem: session-form-render
status: complete
tags: [session-form, section-order, groups, tour, empty-group-hide, jsdom]
requires:
  - App.getSectionOrder / App.pinSectionOrder (47-01)
  - App.isSectionEnabled / App.getSectionLabel (existing)
  - session.group.wrapup / session.form.afterSeverityTitle i18n keys (47-02)
provides:
  - "D-02 default session-form structure (bare Session topics → Emotions & Techniques group → Issue severity → Session Wrap-up group)"
  - "#sessionSectionsHost — the reorderable top-level container host"
  - "add-session.js applySectionOrder() — order-driven arrange (appendChild-only)"
  - "group-empty-hide pass on applySectionVisibility (keyed on [data-group-id])"
  - "afterSeverity section container (.accordion-section[data-section-key=afterSeverity], holding #issueSummaryList) for 47-07 to target"
affects:
  - add-session.html
  - assets/add-session.js
tech-stack:
  added: []
  patterns:
    - "order-driven DOM arrange by moving (not rebuilding) existing containers"
    - "page-pinned order snapshot read once at form open (no live reshuffle)"
    - "container-level empty-group hide layered on the existing per-section visibility walker"
key-files:
  created:
    - tests/47-form-order.test.js
  modified:
    - add-session.html
    - assets/add-session.js
decisions:
  - "Bare sections (issues, afterSeverity) carry data-section-key on their accordion container and the title lives in an accordion-header .label span, so the existing applySectionVisibility/applySectionLabels walkers drive them with no double-heading; groups carry data-group-id and hold member .session-section nodes."
  - "Empty-group hide is a container-level pass appended to applySectionVisibility (keyed on [data-group-id]); bare-section disable-hide stays handled by the per-section walker, so the two concerns never overlap."
  - "The App.pinSectionOrder()/applySectionOrder() calls are guarded on the real App surface so the 20+ existing add-session jsdom tests (which boot on the bare App stub) keep passing while the new order test supplies the stub."
metrics:
  duration: ~30min
  completed: 2026-07-23
  tasks: 2
  files: 3
---

# Phase 47 Plan 04: Order-Driven Session Form Summary

The static 4-accordion session form became the D-02 default structure and is now
arranged at open to the therapist's saved order, with empty groups hidden and the
Heart-Wall conditional safely anchored. Form order reads the same pinned
`App.getSectionOrder()` snapshot the same-page export builders (47-05) will read,
laying the three-way invariant foundation.

## What Was Built

**Task 1 — D-02 form restructure (`add-session.html`)**
- Wrapped the reorderable region in `#sessionSectionsHost` and rebuilt it to the
  D-02 default source order: **Session topics** (bare, first, `data-section-key="issues"`)
  → **Emotions & Techniques** group (`data-group-id="emotionsTech"`, `data-tour="session-heart"`)
  → **Issue severity** (bare, `data-section-key="afterSeverity"`, holding `#issueSummaryList`)
  → **Session Wrap-up** group (`data-group-id="wrapup"`).
- The emotionsTech group holds `heartShield, heartShieldEmotions, trapped,
  insights, limitingBeliefs, additionalTech` in D-02 order, with
  `#heartShieldConditional` relocated (moved, not recreated) to the **last child**
  of the group so an empty-group hide can never strand the required conditional (G-16).
- The wrap-up group header renders `session.group.wrapup` ("Session Wrap-up"),
  **not** `session.form.comments.title` (G-4).
- Bare sections put their title in an `.accordion-header > .label[data-i18n]` span
  and carry `data-section-key` on the accordion container, so the existing
  visibility/label walkers drive them without a duplicated heading.
- Every original input id (`#issueList, #issueSummaryList, #trappedEmotions,
  #sessionInsights, #limitingBeliefs, #additionalTech, #heartShieldToggle,
  #heartShieldEmotions, #sessionComments, #customerSummary, #nextSessionDate`)
  is preserved exactly once; the `session-setup`/`session-heart`/`session-save`
  tour anchors all still resolve.

**Task 2 — Order-driven render + empty-group hide (`assets/add-session.js`) [TDD]**
- `applySectionOrder()` — pins the order (`App.pinSectionOrder()`) at form open,
  reads `App.getSectionOrder()`, and `appendChild`-moves the top-level containers
  into order; for each group it re-appends the member `[data-section-key]` nodes
  into the group body in member order, then re-appends `#heartShieldConditional`
  last. Nodes are moved, never rebuilt, so inputs/values/listeners survive.
- `applySectionVisibility` gained a container-level pass: a `[data-group-id]`
  group is hidden only when **every** member is effectively hidden, and stays
  visible when a disabled past-session member carries data and stays badged
  (G-11/R2-2 — clinical data is never hidden behind a collapsed group).
- Removed the now-dead heart-shield accordion-header sync (that accordion no
  longer exists; the heartShield section's own `.label` is handled by the main walker).
- Wired `pinSectionOrder()` + `applySectionOrder()` into form init before the
  new-session / editing branch so both paths arrange once.

## Key Handoffs for Downstream Plans

| Consumer | What to target |
|----------|----------------|
| 47-05 (export) | reads the SAME pinned `App.getSectionOrder()` on this page → form order == export order for the page's life |
| 47-07 (severity column-hide / unrated) | `.accordion-section[data-accordion="severity"][data-section-key="afterSeverity"]`, holding `#issueSummaryList` |
| 47-06 (settings reorder / group title override) | group containers `[data-group-id="emotionsTech"]`, `[data-group-id="wrapup"]` |

- Render function: **`applySectionOrder()`**.
- Group-container selectors: `[data-group-id="emotionsTech"]`, `[data-group-id="wrapup"]`.
- `#heartShieldConditional` home: **last child of the emotionsTech group body**.
- The form **pins the order at open** via `App.pinSectionOrder()`.

## Deviations from Plan

**1. [Rule 2 — correctness] Bare-section disable hides the whole card, not just an inner block**
- **Found during:** Task 1 structure design.
- **Issue:** The plan's group-empty-hide targets `[data-group-id]` containers, but
  the bare sections (issues, afterSeverity) are single-section cards; putting
  `data-section-key` on an inner block would leave an orphan header when disabled.
- **Fix:** `data-section-key` sits on the bare-section accordion container itself,
  so the existing per-section walker hides the whole card. No behavior invented —
  it reuses the shipped visibility contract.
- **Files:** add-session.html, assets/add-session.js. **Commits:** c1e0081, 58ab9f2.

**2. [Rule 3 — test-stub compatibility] Guarded the pin/order calls on the real App surface**
- **Found during:** Task 2 (protecting the 20+ existing add-session jsdom tests).
- **Issue:** Those tests boot add-session.js on the bare App stub, which lacks the
  47-01 order APIs; an unguarded call would throw at boot and redden them.
- **Fix:** `applySectionOrder` returns early when `App.getSectionOrder` is absent
  and the pin call is `typeof`-guarded. Production (real app.js) always has both.
- **Files:** assets/add-session.js. **Commit:** 58ab9f2.

## Verification

- `node tests/47-form-order.test.js` — **6/6 pass** (order arrange, all-disabled
  group hidden, past-session data keeps group visible + badged, node-move value
  survival, pin-at-open, conditional-in-group).
- `npm test` full suite — **214 passed, 0 failed** (no regression in the existing
  add-session / export / visibility jsdom tests after the restructure).
- Task 1 grep gate prints OK; every input id present exactly once; all three tour
  anchors resolve; DOM structure confirmed via jsdom (host order + group membership).
- Comment hygiene: no planning IDs in add-session.html / add-session.js diffs.

## TDD Gate Compliance

RED (`5c9a64a` test) → GREEN (`58ab9f2` feat). At RED, cases 1 (order), 2
(group-hide), 5 (pin) failed as expected; cases 3/4/6 passed on the static
structure. No REFACTOR commit needed.

## Manual Gate (before /gsd-verify-work)

Real-device: open add-session with a reordered saved order → sections appear in
that order; a fully-disabled group hides; run the guided tour end-to-end and
confirm the `session-heart` step still anchors the Emotions & Techniques group.

## Known Stubs

None. Severity value semantics (tap-again-to-clear column-hide, unrated auto-hide)
are intentionally deferred to 47-07; the export side to 47-05 — both consume the
containers this plan ships.

## Threat Flags

None. The render reads the already-sanitized `App.getSectionOrder()` (47-01) and
moves existing DOM nodes — no `innerHTML`, no new trust boundary (T-47-05 mitigated).

## Commits

- `c1e0081` — feat(47-04): restructure session form into D-02 groups + afterSeverity key
- `5c9a64a` — test(47-04): add failing test for order-driven form render + empty-group hide
- `58ab9f2` — feat(47-04): order-driven session form render + empty-group hide

## Self-Check: PASSED

- Files created: tests/47-form-order.test.js — present.
- Files modified: add-session.html, assets/add-session.js — committed.
- Commits c1e0081, 5c9a64a, 58ab9f2 — all present in git log.
