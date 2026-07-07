---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 13
subsystem: overview-filters
tags: [overview, filters, session-format, heart-wall, tdd-green, xss-safe]
requires:
  - "37-10: pinned RED behavior spec tests/37-overview-filters.test.js"
  - "37-11: .multi-select*/.filter-toggle CSS + filter.sessionFormat* i18n keys"
provides:
  - "Overview Session Format multi-select filter (#clientFormatFilter)"
  - "Overview Heart-Wall toggle (#clientHeartWallToggle) replacing #clientHeartShieldFilter"
affects:
  - assets/overview.js
  - index.html
tech-stack:
  added: []
  patterns:
    - "Caller-side i18n interpolation (App.t(...).replace('{count}', N)) — applyTranslations does no substitution"
    - "User-data option labels via textContent + DOM node removal (no markup-string assignment) — XSS-safe"
    - "Delegated change listener on a persistent panel survives per-load option rebuilds"
key-files:
  created: []
  modified:
    - "assets/overview.js: format multi-select build + predicate, Heart-Wall toggle predicate, wiring"
    - "index.html: #clientFormatFilter multi-select + #clientHeartWallToggle (replaced #clientHeartShieldFilter)"
decisions:
  - "Session Format resolved key = session.sessionType || 'clinic' (legacy/undefined counts as clinic); empty selection = no filter; client-level union (>=1 matching session)"
  - "Heart-Wall predicate is shieldRemoved-agnostic (isHeartShield===true regardless) per D2a"
  - "Format field label kept OUTSIDE the pill so the pill textContent equals the interpolated summary only (test contract)"
metrics:
  duration: "~30m"
  completed: "2026-07-05"
  tasks: 2
  files: 2
status: complete
---

# Phase 37 Plan 13: Overview Session-Format + Heart-Wall Filters Summary

Replaced the Overview filter bar's mislabeled heart dropdown with a Session Format multi-select (dropdown-with-checkboxes) and a Heart-Wall toggle, turning the 37-10 RED spec `tests/37-overview-filters.test.js` GREEN (8/8) without touching the test, any i18n bundle, or app.css.

## What Was Built

**Task 1 — Session Format multi-select (`feat(37-13)` d2f73b6)**
- `index.html`: added `#clientFormatFilter.multi-select` (pill `#clientFormatFilterToggle` + panel `#clientFormatFilterPanel.is-hidden`) as a new `.filter-field`; the field's `.label` (`data-i18n="filter.sessionFormat"`) sits OUTSIDE the pill so the pill's `textContent` is exactly the summary.
- `assets/overview.js`: `buildFormatOptions()` builds one `input[type=checkbox][data-format-key]` per `App.getSessionTypes()` entry, label via `textContent` (XSS-safe), panel cleared by DOM node removal (markup-string-assignment count held at the pre-plan baseline of 9). `renderFormatSummary()` does caller-side interpolation (`0 checked → filter.sessionFormat.all`; `N → filter.sessionFormat.count`.replace('{count}', N)); the summary node carries no `data-i18n`.
- Predicate in `applyFiltersAndSort`: with a non-empty `_selectedFormats` set, a client passes if some session's `sessionType || "clinic"` is in the set. Wired into `onFilterChange`, `updateClearButton`, Clear Filters; panel opens on pill click, closes on Escape + outside-click; `_selectedFormats` persists across `loadOverview()` rebuilds so language switch restores the checked set.

**Task 2 — Heart-Wall toggle (`feat(37-13)` 32c352f)**
- `index.html`: removed the `#clientHeartShieldFilter` select; added `.filter-field.filter-toggle` with `#clientHeartWallToggle` inside `label.toggle-switch` (+ `span.toggle-slider`), mirroring the settings.js toggle build.
- `assets/overview.js`: deleted the `clientHeartShieldFilter` lookup, `shieldVal` read, and the heartShield/regular dropdown predicate. Added the toggle lookup + a `heartWallOn` predicate keeping clients with `>=1` session `isHeartShield===true` regardless of `shieldRemoved` (D2a). Wired into the change path, `updateClearButton`, and Clear Filters. The client-row Heart-Wall badge render is unchanged.

## Verification

- `node tests/37-overview-filters.test.js` → 8 passed, 0 failed; test file unchanged (git-clean).
- Sibling specs still RED as expected: `37-sessions-filters` (37-14), `37-overview-sort` (37-15).
- No regression: `31-overview-render-hardening` GREEN, `37-personalization` GREEN.
- No edits to any i18n bundle or `app.css`; `#clientHeartShieldFilter` fully removed; per-session single-select entry untouched.
- overview.js `innerHTML` token count = 9 (baseline preserved).

## Deviations from Plan

None — plan executed as written. (One intra-task correction: initial doc comments contained the literal token `innerHTML`, which inflated the verify's raw token count to 12; reworded the comments to keep the count at the baseline 9. No behavior change.)

## Threat Surface

Threat register mitigations applied as written: T-37-13-SEC (option labels via `textContent`, no markup-string assignment — covered by the XSS-as-literal-text test, PASS) and T-37-13-01 (resolved key `sessionType || 'clinic'`, options sourced from `getSessionTypes()` — covered by union/legacy cases, PASS). No new security surface introduced beyond the plan's threat model.

## Self-Check: PASSED

- FOUND: assets/overview.js (modified)
- FOUND: index.html (modified)
- FOUND: commit d2f73b6 (Task 1)
- FOUND: commit 32c352f (Task 2)
