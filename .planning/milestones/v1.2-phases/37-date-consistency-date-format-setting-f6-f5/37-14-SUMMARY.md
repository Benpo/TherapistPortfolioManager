---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 14
subsystem: ui
tags: [sessions, filters, multi-select, heart-wall, session-format, xss-safe, tdd]

# Dependency graph
requires:
  - phase: 37-10
    provides: the pinned RED behavior spec (tests/37-sessions-filters.test.js) this plan turns GREEN
  - phase: 37-11
    provides: the .multi-select/.toggle-switch CSS classes + filter.sessionFormat* i18n keys + repurposed sessions.filter.type label ("Heart-Wall")
  - phase: 37-13
    provides: the Overview checkbox-dropdown DOM structure this plan mirrors verbatim
provides:
  - Sessions Session Format multi-select filter (pill + checkbox panel), filtering sessions by resolved format key
  - Sessions Heart-Wall toggle replacing the mislabeled #sessionTypeFilter dropdown (shieldRemoved-agnostic)
affects: [37-15, sessions-list, any future session-filter work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Session-level multi-select predicate: session passes if (session.sessionType || 'clinic') is in a persistent checked Set; empty Set = no filter"
    - "Pill summary via caller-side .replace('{count}', N) with NO data-i18n on the text node; checked-set restored on app:language rebuild"

key-files:
  created: []
  modified:
    - sessions.html (added #sessionFormatFilter multi-select; replaced #sessionTypeFilter with #sessionHeartWallToggle)
    - assets/sessions.js (format option build + predicate + Heart-Wall predicate/wiring)

key-decisions:
  - "Mirrored 37-13's Overview DOM structure/classes verbatim so both screens render identically (buildFormatOptions/renderFormatSummary parity)"
  - "Heart-Wall ON keeps isHeartShield===true regardless of shieldRemoved (D2a) — released Heart-Walls still count as handled"
  - "Legacy/undefined sessions resolve to 'clinic' in the format predicate; kept the modality Type column + Heart-Wall badge cell render unchanged"

patterns-established:
  - "DOM-API + textContent-only option build (no new innerHTML) keeps the sessions.js markup-string count at its pre-plan baseline of 6 and closes the T-37-14-SEC XSS surface"

status: complete
---

# Phase 37 Plan 14: Sessions Session-Format Multi-Select + Heart-Wall Toggle Summary

Replaced the Sessions filter bar's mislabeled `#sessionTypeFilter` heart dropdown with the two decided controls (D2/D2a): a Session Format multi-select that filters sessions by resolved format key, and a Heart-Wall toggle that shows every session where the Heart-Wall was handled (`isHeartShield===true`, released or not). Turned the 37-10 RED spec GREEN (8/8) without touching the test file, any i18n bundle, or app.css.

## What Was Built

**Task 1 — Session Format multi-select (commit 7ff89c5)**
- `sessions.html`: new `.filter-field` with `#sessionFormatFilter.multi-select` (pill `#sessionFormatFilterToggle` + `#sessionFormatFilterPanel.is-hidden`), no hand-authored option rows.
- `assets/sessions.js`: `buildFormatOptions()` builds one `input[type=checkbox][data-format-key]` per `App.getSessionTypes()` entry with a `textContent`-only label; `renderFormatSummary()` writes the pill summary (0 checked → `t('filter.sessionFormat.all')`; N → `t('filter.sessionFormat.count').replace('{count}', N)`), no `data-i18n` on the text node. Panel opens on the pill, closes on outside-click + Escape. Predicate added to `renderSessions`: with a non-empty checked set, a session passes only if `(session.sessionType || 'clinic')` is in the set. Checked set persists and is restored on `app:language`.

**Task 2 — Heart-Wall toggle (commit 4dc6eb3)**
- `sessions.html`: removed the `#sessionTypeFilter` select; added a `.filter-toggle` field with `label.toggle-switch > input#sessionHeartWallToggle + span.toggle-slider` (mirrors the settings toggle build), unchecked by default. Label reuses `data-i18n="sessions.filter.type"` (repurposed to "Heart-Wall" by 37-11).
- `assets/sessions.js`: deleted the `typeFilter` lookup, the `selectedType` read, and the `heartShield`/`regular` predicate branch; added the `#sessionHeartWallToggle` lookup and predicate (`heartWallOn && session.isHeartShield !== true → drop`), wired the toggle's `change` into `renderSessions`.

## Verification

- `node tests/37-sessions-filters.test.js` → **8 passed, 0 failed**; the pinned test file is byte-for-byte unchanged (`git diff` empty).
- Task 1 grep gate passed; `innerHTML` count in `sessions.js` stays at the pre-plan baseline of 6 (no new markup-string DOM).
- Scope check: only `sessions.html` + `assets/sessions.js` changed across both commits — no i18n bundle, no app.css, no overview.js/index.html.
- Regression spot-check: `tests/31-sessions-render-hardening.test.js` and `tests/37-overview-filters.test.js` both exit 0.
- `#sessionTypeFilter` fully removed; the modality Type column and the Heart-Wall badge cell render unchanged.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Surface

- **T-37-14-SEC (XSS, mitigated):** custom Session Format labels render via `textContent` only; the security case asserts an HTML-injection payload appears as literal text with no injected `<img>` and no `onerror` execution — GREEN.
- **T-37-14-01 (legacy/custom keys, mitigated):** resolved key = `sessionType || 'clinic'`, options sourced from `getSessionTypes()`; union/legacy cases GREEN.
- No new security-relevant surface introduced beyond the plan's threat register.

## Self-Check: PASSED

- `sessions.html` contains `#sessionFormatFilter` + `#sessionHeartWallToggle`, no `#sessionTypeFilter` — verified.
- `assets/sessions.js` has the format build + both predicates, no `typeFilter`/`selectedType` residue — verified.
- Commits 7ff89c5 and 4dc6eb3 exist in `git log`.
