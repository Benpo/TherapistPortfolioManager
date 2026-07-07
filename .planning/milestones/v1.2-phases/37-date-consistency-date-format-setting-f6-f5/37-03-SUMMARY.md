---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 03
subsystem: date-engine
status: complete
tags: [date-format, i18n, bidi, service-worker, pdf, tdd]
requires:
  - "37-01: TZ-pinned RED spec (tests/37-date-format.test.js) authored before this engine"
provides:
  - "window.DateFormat (assets/date-format.js): format/parseLocal/todayLocalISO/getPreference"
  - "App.formatDate delegating wrapper (assets/app.js)"
  - "date-format.js load-order + sw.js precache + jsdom-pdf-env injection (D-21)"
affects:
  - "37-04 (UTC sweep + PDF path): consumes window.DateFormat + the D-21 jsdom injection"
  - "37-05/06/07/08 (personalization surface): the picker writes portfolioDateFormat which getPreference reads"
tech-stack:
  added: []
  patterns:
    - "Zero-dependency window IIFE (mirrors crashlog.js/version.js), registered on window"
    - "Local-time calendar parse: regex-extract leading YYYY-MM-DD -> new Date(y,m-1,d)"
    - "Unicode directional isolates U+2066/U+2069 as a bare string (no <bdo> markup)"
key-files:
  created:
    - assets/date-format.js
  modified:
    - assets/app.js
    - index.html
    - add-client.html
    - add-session.html
    - sessions.html
    - settings.html
    - report.html
    - reporting.html
    - demo.html
    - sw.js
    - tests/_helpers/jsdom-pdf-env.js
decisions:
  - "D-01/D-02: centralize local-vs-UTC parse in one parseLocal; regex handles bare + legacy full-ISO values"
  - "D-04: 'auto' reproduces the prior App.formatDate rule byte-for-byte (en->en-US short, de/cs long, en/he short)"
  - "D-06: numeric formats hand-assembled with ASCII digits, / for slash formats and - for yyyy-mm-dd"
  - "D-07: Hebrew numeric output wrapped in U+2066/U+2069 isolates; named-month Hebrew NOT wrapped"
  - "sw.js CACHE_NAME is auto-derived from AppVersion.INTEGRITY_TOKEN (Phase 28 scheme) — no manual vNNN bump needed or possible"
metrics:
  duration: "~25 min"
  completed: "2026-07-03"
  tasks: 2
  files_created: 1
  files_modified: 11
---

# Phase 37 Plan 03: Date-Correctness Engine Spine Summary

One canonical zero-dependency `window.DateFormat` engine now parses calendar dates in LOCAL time and formats them across 6 options × 4 locales; `App.formatDate` delegates to it, and it is loaded before app.js/pdf-export.js on every page, precached, and injected into the PDF test env — turning Plan 37-01's TZ-pinned RED spec fully GREEN (13/13).

## What Was Built

**Task 1 — `assets/date-format.js` + `App.formatDate` delegation** (commit `8d683a5`)
- New `window.DateFormat` IIFE (zero imports/requires) exposing `format(input, formatKey, lang)`, `parseLocal(input)`, `todayLocalISO()`, `getPreference()`.
- Core fix: `parseLocal` regex-extracts the leading `YYYY-MM-DD` and constructs `new Date(y, m-1, d)` (LOCAL) — never `new Date("YYYY-MM-DD")` (UTC midnight), killing the off-by-one bug class at the root (D-01/D-02). The regex also tolerates legacy full-ISO values.
- `format()` switches on the 6 D-05 keys: `auto` uses `Intl` reproducing the prior app.js rule (long month for de/cs, short for en/he, en-US for en per D-04); named-month options hand-assemble with an `Intl {month:'short'}` token for stable order; numeric options hand-assemble ASCII digits with D-06 separators (`/` for slash formats, `-` for yyyy-mm-dd). Hebrew numeric output is wrapped in U+2066/U+2069 isolates (D-07); named-month Hebrew is not.
- `App.formatDate` body reduced to a single delegation: `window.DateFormat.format(dateString, window.DateFormat.getPreference(), currentLang)`. Signature and exported symbol unchanged — all ~10 callers untouched; empty/unparseable pass-through preserved by the engine.

**Task 2 — load-order + precache + PDF test-env wiring (D-02/D-21)** (commit `29ccce1`)
- Added `<script src="./assets/date-format.js">` immediately before `./assets/app.js` on all 8 app.js pages (verified date-format precedes app.js on each). Landing/license/legal pages untouched (they do not load app.js).
- Added `/assets/date-format.js` to `sw.js` PRECACHE_URLS alongside version.js/crashlog.js.
- `tests/_helpers/jsdom-pdf-env.js` now `win.eval`s date-format.js immediately before pdf-export.js, so PDF tests exercise the real engine (D-21).

## Verification (GREEN gate)

- `node tests/37-date-format.test.js` → **13 passed, 0 failed** (SPINE `App.formatDate('2026-07-02') === 'Jul 2, 2026'` under TZ=America/New_York, was `Jul 1, 2026`; all 6 format options; D-06 separators; D-07 Hebrew isolate + LTR order; DATE-06 month boundary; DATE-02 age math; todayLocalISO local).
- `tests/34-date-locale.test.js` → **7 passed, 0 failed** — fully GREEN, including the D-21 assertion "jsdom PDF env has window.DateFormat". (The green-gate note allowed a residual PDF-env-only failure until 37-04; in fact none remains — the engine + D-21 injection already satisfy it. No 37-01 assertion was weakened.)
- Full suite `npm test` → **119 passed, 2 failed, 121 total**. The 2 failures are out of scope (see below).

## Deviations from Plan

None — plan executed as written. No Rule 1-4 deviations were required.

## Out-of-Scope Failures (expected RED, not introduced here)

Two suite files remain RED; both are pre-existing RED specs authored by Plan 37-02 for the **Personalization surface** (Plans 05-08), not by this plan. Proven out of scope by stashing this plan's Task 2 changes and re-running — they fail identically without them, and neither depends on the date engine's correctness:

- `tests/37-personalization.test.js` (0/13) — session-type editor, native `<input type="date">` birthdate, backup round-trip of `portfolioDateFormat`/`portfolioSessionTypes`, Personalization tab. Authored in commit `ab75806` (test 37-02). Lands in Plans 05-08.
- `tests/30-settings-tabnav.test.js` (3/4) — the one failing case requires `#settingsTabPersonalizeBtn` (the Personalization tab) in settings.html. Authored in commit `4a0644f` (test 37-02). Lands in Plan 05/06.

These are tracked by the plan's own `<artifacts_produced>` catalog as future-plan deliverables; not fixed here by design.

## sw.js CACHE_NAME note (precache gotcha reconciled)

The historical "manual CACHE_NAME bump when sw.js is in the diff" gotcha does **not** apply. Under the Phase 28 scheme `CACHE_NAME = 'sessions-garden-' + self.AppVersion.INTEGRITY_TOKEN` is auto-derived from the deploy-stamped git short-hash — there is no hardcoded `vNNN` to bump, and the pre-commit hook is empty (the auto-bump/skip logic was reconciled away in Phase 28). Adding `/assets/date-format.js` to PRECACHE_URLS ships correctly on the next deploy because the new git SHA rolls INTEGRITY_TOKEN → a fresh CACHE_NAME → precache re-runs including the new asset. The suite's `sw-precache-cache-reload.test.js` assertion "CACHE_NAME derived from AppVersion.INTEGRITY_TOKEN (no hardcoded vNNN)" passed, confirming no manual bump is warranted.

## Known Stubs

None. `assets/date-format.js` is fully wired (no TODO/FIXME/placeholder), and `App.formatDate` delegates to a live engine.

## Threat Flags

None. This plan adds a pure transform utility + script wiring; the only inserted characters are the two inert directional-isolate control points (U+2066/U+2069) around Hebrew numeric dates, emitted as a bare string with no markup surface (matches the plan's threat register T-37-03-01, disposition: mitigate).

## Self-Check: PASSED

- FOUND: assets/date-format.js
- FOUND commit: 8d683a5 (feat: engine + delegation)
- FOUND commit: 29ccce1 (feat: wiring)
- `node tests/37-date-format.test.js` re-confirmed 13 passed, 0 failed
