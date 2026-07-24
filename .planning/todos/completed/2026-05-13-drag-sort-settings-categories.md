---
created: 2026-05-13T00:00:00.000Z
title: Drag-and-drop reordering of session section categories in Settings page
area: feature
priority: medium
recommended_entry: /gsd-discuss-phase
target_phase: 24 (or later — Ben's call during discuss-phase)
files:
  - settings.html
  - assets/settings.js
  - assets/app.css
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
source: spun out from 2026-04-26-editable-session-section-titles.md after Ben's 2026-05-13 review
resolves_phase: 47
---

## Problem

Settings page lets therapists rename + toggle-off section categories (Phase 22 work). What's missing: the therapist can't control the ORDER in which sections appear on the session form. The order is hardcoded in `add-session.html`. A therapist who heavily uses some sections and rarely uses others can't promote the frequent ones to the top.

## Fix

Add drag-and-drop reordering of the section rows on the Settings page. The new order propagates to both new-session and edit-session forms (same propagation path as 22-14.3 rename).

## Design questions for discuss-phase

1. **Drag handle UX** — full-row drag, dedicated handle icon, or long-press on mobile?
2. **Persistence** — same `therapistSettings.{locale}` IDB record that already stores rename + toggle state, or a new top-level `sectionOrder` array?
3. **Mobile touch UX** — drag works differently on touch devices; need a clear affordance.
4. **Reset to default** — should there be a single "reset order" button alongside the per-row "Revert" rename button?
5. **What about disabled sections** — do they still take a slot in the ordering, or move to a "hidden" group at the bottom?

## Acceptance

- User drags row B above row A in Settings → Save.
- Open new-session form → row B appears above row A.
- Open existing session edit → row B appears above row A.
- Persists across refresh + locale switch.
- Reset (if implemented) returns to the locale-default order.

## Origin

Spun out from Sapir's broader "editable session section titles" ask. The rename + remove parts are already done (Phase 22 Settings page). This is the missing piece for full control of the session form structure.

## Related — export/copy order coupling (added 2026-06-15)

Quick task **260615** fixed a bug where the session **export PDF** and **copy** output listed sections in a different order than the add-session form. The fix made `buildFilteredSessionMarkdown` and `buildSessionMarkdown` (`assets/add-session.js`) emit sections in a **hardcoded** order that matches the *static* form DOM.

**When this drag-sort feature is built, those two builders MUST switch to the user's saved section order** (the `sectionOrder` persistence proposed above) instead of the hardcoded sequence — otherwise the export/copy order will diverge from the now-user-controlled form order and reintroduce the 260615 bug. The guard test `tests/quick-260615-export-section-order.test.js` currently asserts `export order == static form DOM order`; it will need updating to assert `export order == saved section order`.
