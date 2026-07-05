---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 10
subsystem: testing
tags: [tdd-red, filters, session-format, heart-wall, sort, jsdom, FILT-04]
requires:
  - assets/overview.js (real render booted in jsdom)
  - assets/sessions.js (real render booted in jsdom)
  - assets/app.js getSessionTypes/formatSessionType (seam mirrored in the stub)
  - tests/_helpers/mock-portfolio-db.js
  - tests/_helpers/app-stub.js
provides:
  - tests/37-overview-filters.test.js (RED; green by 37-13)
  - tests/37-sessions-filters.test.js (RED; green by 37-14)
  - tests/37-overview-sort.test.js (RED; green by 37-15)
  - app-stub default getSessionTypes() (localStorage-seeded) for downstream tests
affects:
  - Plans 37-13 (Overview filters), 37-14 (Sessions filters), 37-15 (Overview sort)
tech-stack:
  added: []
  patterns:
    - "boot the REAL page (index.html/sessions.html + its render module) in jsdom against a mock PortfolioDB, then assert the pinned DOM/selector contract"
    - "RED-on-missing-DOM: load the real date engine first so the boot completes and rows render, so the failure is a clean AssertionError on the absent control, not a harness crash"
    - "inverted RED gate `! node tests/...` — exits 0 only while the test exits non-zero"
key-files:
  created:
    - tests/37-overview-filters.test.js
    - tests/37-sessions-filters.test.js
    - tests/37-overview-sort.test.js
  modified:
    - tests/_helpers/app-stub.js
decisions:
  - "app-stub getSessionTypes() default reads the seeded localStorage['portfolioSessionTypes'] via an explicit overrides.localStorage reference (the stub runs in Node, not the jsdom window) so option-build assertions are non-vacuous; an explicit override still wins (additive)"
  - "pill-summary tests use a t() that returns a '{count} selected' template for filter.sessionFormat.count so the caller-side .replace('{count}', N) contract is falsifiable (summary contains the number, never the literal token)"
  - "sort test pins the default directions from the dom_contract (name asc, sessions/lastSession desc, repeat-click flips) and asserts row order off the REAL rendered #clientTableBody"
metrics:
  duration: ~20min
  tasks: 3
  files: 4
  completed: 2026-07-05
status: complete
---

# Phase 37 Plan 10: RED filter + sort behavior specs (Session Format / Heart-Wall / header-sort) Summary

Authored the three falsifiable RED behavior tests that lock the DOM/selector contract and predicate behavior for the genuinely-new logics of the F6/F5 filter work package — Overview Session-Format multi-select + Heart-Wall toggle (→37-13), the same pair on Sessions (→37-14), and Overview click-to-sort header ↔ `#clientSortSelect` two-way sync (→37-15) — split one-file-per-implementation-plan so each turns its own file GREEN independently across later waves. All three genuinely fail RED now on the missing controls (not a harness crash: each page boots and renders real rows first), and are auto-discovered by `tests/run-all.js`.

## What was built

- **tests/37-overview-filters.test.js** (8 cases) — boots real `index.html` + `overview.js` against a mock `PortfolioDB` (real client rows render). Pins `#clientFormatFilter` (`.multi-select`) / `#clientFormatFilterToggle` / `#clientFormatFilterPanel` with option `input[type=checkbox][data-format-key]` set == `getSessionTypes()` keys (5 defaults + custom); the union filter (`online`+`remote`), legacy-undefined→`clinic`; the `#clientHeartWallToggle` inside `label.toggle-switch`/`span.toggle-slider` (shieldRemoved-agnostic, released session still counts; old `#clientHeartShieldFilter` dropdown removed); the pill-summary interpolation contract (0 checked → `filter.sessionFormat.all`; N → contains the number, never `{count}`; no `data-i18n` on the summary node) + panel open / Escape / outside-click; and the **T-37-10-SEC** XSS-as-literal-text guard on a custom label.
- **tests/37-sessions-filters.test.js** (8 cases) — mirrors the above for `sessions.html` + `sessions.js` at the SESSION level (rows identified by a unique `trappedEmotions` marker per seeded session): `#sessionFormatFilter`/`…Toggle`/`…Panel`, union + session-level legacy→clinic, `#sessionHeartWallToggle` (both active + released shown; old `#sessionTypeFilter` removed), pill summary + panel behavior, and the XSS guard.
- **tests/37-overview-sort.test.js** (5 cases) — boots `index.html` + `overview.js` with clients differing in name / session-count / last-session date (a distinct ordering per key). Pins `th.sortable[data-sort-key="name|sessions|lastSession"]` with `aria-sort` + child `span.sort-arrow` (Type + Actions NOT sortable), header-click → `#clientSortSelect` sync + directional `aria-sort` + others reset to `none` + real row reorder, repeat-click direction flip, and dropdown→header sync (dropdown drives the same state).
- **tests/_helpers/app-stub.js** (STUB EXTENSION, additive) — a default `getSessionTypes()` derived from the seeded `localStorage['portfolioSessionTypes']` (5 defaults + overrides + custom, mirroring `app.js:1329`), sourced via an explicit `overrides.localStorage` reference (the stub is a Node object; it cannot see the jsdom window's `localStorage` implicitly). An explicit `overrides.getSessionTypes` (e.g. `37-personalization.test.js`'s `()=>[]`) still wins.

## Verification

- Each file executes assertions and exits **NON-zero (RED)** with messages naming the missing controls (`#clientFormatFilter` / `#clientHeartWallToggle` / `#sessionFormatFilter` / `#sessionHeartWallToggle` / `th[data-sort-key=…]`). Confirmed the failures are RED-on-missing-DOM, not a crash, by a standalone boot proving the pages render **2 / 2 / (3) real rows** and `getSessionTypes()` yields `clinic,online,remote,proxy,other,custom.900`.
- Inverted RED gate `! node tests/37-overview-filters.test.js` → exit 0 (holds for all three).
- `npm test` (`tests/run-all.js`, globs `tests/*.test.js`): **121 passed, 3 failed, 124 total** — the 3 failures are exactly the new RED files; the pre-existing 121 (including `30-fake-test-detector` and `37-personalization` 18/18) are unchanged. The stub extension is additive-only: `npm test` was 121/0 immediately after the stub edit, before the RED files were added.
- Fake-test-detector: the three files `win.eval` the real assets (executing, not source-slicing) and never assert equality over source text, so they pass `30-fake-test-detector` without an allowlist entry.

## Deviations from Plan

None — plan executed exactly as written (RED-first, three files, additive stub extension, `test(37): …` commits).

## Notes for downstream (37-13 / 37-14 / 37-15)

- The pinned selectors/attributes in these files ARE the contract to implement verbatim. Do NOT weaken the tests to green — implement the controls until each file exits 0 unchanged.
- Pill-summary interpolation is caller-side `.replace('{count}', String(N))` (applyTranslations does no interpolation); the summary text node must carry NO `data-i18n`.
- Heart-Wall predicate is `isHeartShield === true` regardless of `shieldRemoved`; resolved format key is `session.sessionType || "clinic"`.
- Sort defaults: first click name → ascending; first click sessions/lastSession → descending; repeat click flips; the header and `#clientSortSelect` share one sort state.

## Self-Check: PASSED

- FOUND: tests/37-overview-filters.test.js, tests/37-sessions-filters.test.js, tests/37-overview-sort.test.js, tests/_helpers/app-stub.js
- FOUND commits: 98b4f33 (Task 1 + stub), c1ed145 (Task 2), ba08717 (Task 3)
