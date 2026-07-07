---
phase: 31-refactor-god-modules
plan: 02
subsystem: ui-render
tags: [output-encoding, textcontent, innerHTML, characterization-test, overview.js, sessions.js, RFCT-03, xss-hygiene]

# Dependency graph
requires:
  - phase: 30-decompose-god-modules
    provides: jsdom real-page characterization pattern (capture-and-await DOMContentLoaded, assert observable DOM) + tests/_helpers/app-stub.js (key-returning App.t, resolving initCommon) + tests/_helpers/mock-portfolio-db.js (seeded getAllClients/getAllSessions)
provides:
  - "overview.js empty-state (:456) + view-button (:510) render via textContent/DOM nodes — no interpolated-i18n innerHTML remains at those sites"
  - "sessions.js view-button (:147) render via textContent/DOM nodes — no interpolated-i18n innerHTML remains at that site"
  - "tests/31-overview-render-hardening.test.js — characterizes the overview empty-state + view-button rendered output (helper-text text, button-label text, data-i18n attr, button-icon svg)"
  - "tests/31-sessions-render-hardening.test.js — FIRST-EVER test for sessions.js; characterizes the view-button rendered output"
affects: [31-03, 31-04, 31-05, 31-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Output-encoding hygiene: app-controlled i18n strings rendered via createElement + textContent instead of string-interpolated innerHTML (matches settings.js discipline, V5)"
    - "Static/app-controlled SVG markup (no interpolation) kept as a one-shot innerHTML assignment on a dedicated icon span — only the i18n label moves to textContent"
    - "Test-first DOM swap (D-03/D-06): write a characterization test GREEN on the unchanged source, then refactor and keep it GREEN to prove byte-identical observable output"
    - "Call a top-level render fn directly when it is page-global (overview.renderClientRows); boot the DOMContentLoaded handler when the render is a closure (sessions.renderSessions)"

key-files:
  created:
    - tests/31-overview-render-hardening.test.js
    - tests/31-sessions-render-hardening.test.js
  modified:
    - assets/overview.js
    - assets/sessions.js

key-decisions:
  - "overview test calls win.renderClientRows() DIRECTLY (it is a page-global function declaration needing no PortfolioDB) — simpler and async-trap-free; sessions test must boot the DOMContentLoaded handler because renderSessions is a closure"
  - "Scoped the empty-state assertion to `#clientTableBody` because the page's global #emptyState element ALSO carries class .helper-text — an unscoped querySelector('.helper-text') would match the wrong (empty) element and give a false pass"
  - "Kept the static view/empty SVG markup as innerHTML on the icon span (plan-sanctioned: no interpolation) rather than hand-building SVG nodes — preserves byte-identical output with minimal surface change"
  - "Key-returning App.t stub (App.t(k) === k) so an asserted textContent equals the exact i18n KEY the production site passed — falsifiable against a dropped/renamed key"

patterns-established:
  - "Per-render characterization test for an innerHTML->textContent swap: assert label textContent + data-i18n attr + icon-svg presence, green before AND after"

requirements-completed: [RFCT-03]

coverage:
  - id: D1
    description: "overview.js empty-state: a client with zero sessions renders a .helper-text (inside #clientTableBody) whose textContent is App.t('overview.sessions.none')"
    requirement: "RFCT-03"
    verification:
      - kind: unit
        ref: "tests/31-overview-render-hardening.test.js#a client with ZERO sessions renders a .helper-text"
        status: pass
    human_judgment: false
  - id: D2
    description: "overview.js view-button: a populated row renders a .button-label (textContent App.t('overview.table.view')) + data-i18n attr + .button-icon svg"
    requirement: "RFCT-03"
    verification:
      - kind: unit
        ref: "tests/31-overview-render-hardening.test.js#a client WITH a session renders a view button"
        status: pass
    human_judgment: false
  - id: D3
    description: "sessions.js view-button: a populated row renders a .button-label (textContent App.t('sessions.table.view')) + data-i18n attr + .button-icon svg"
    requirement: "RFCT-03"
    verification:
      - kind: unit
        ref: "tests/31-sessions-render-hardening.test.js#a populated session row renders a view button"
        status: pass
    human_judgment: false
  - id: D4
    description: "No interpolated-i18n innerHTML assignment remains at the three hardened sites (overview.js former :456/:510; sessions.js former :147)"
    requirement: "RFCT-03"
    verification:
      - kind: grep
        ref: "grep -n innerHTML assets/overview.js assets/sessions.js — only safe `= \"\"` clears + static SVG icon assignments remain; no ${App.t(...)} interpolation"
        status: pass
    human_judgment: false

metrics:
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  tests_added: 2
  suite_total: 106
  completed: 2026-06-28

status: complete
---

# Phase 31 Plan 02: Harden interpolated-i18n innerHTML render sites Summary

RFCT-03 output-encoding hygiene: the three plan-named interpolated-i18n `innerHTML` sites — `overview.js` empty-state (:456) and view-button (:510), and `sessions.js` view-button (:147) — now build their nodes with `createElement` + `textContent`, each locked test-first by a new characterization test that was green on the unchanged source and stayed green after the swap (proving identical observable output). `sessions.js` gained its first-ever test.

## What was built

- **tests/31-overview-render-hardening.test.js** (new): loads the real `index.html` into jsdom, evals `overview.js`, injects the key-returning `App.t` stub, and calls the page-global `renderClientRows()` directly (no PortfolioDB / no async handler needed). Two cases: an empty-session client → `.helper-text` (scoped inside `#clientTableBody`) with the `overview.sessions.none` key; a session-bearing client → a view button with `.button-label` = `overview.table.view`, the `data-i18n` attribute, and a `.button-icon svg`.
- **assets/overview.js** (:456, :510): replaced both `innerHTML = `…${App.t(…)}…`` assignments with explicit DOM construction. The empty-state helper and the view-button label now use `textContent`; the `data-i18n` attribute is preserved; the static (interpolation-free) SVG is assigned once to a dedicated `.button-icon` span's `innerHTML`. The safe `= ""` clears (:316/:355/:617) and the static detail-toggle SVG (:430) were left untouched.
- **tests/31-sessions-render-hardening.test.js** (new — first test for `sessions.js`): loads `sessions.html` into jsdom, captures-and-awaits the async `DOMContentLoaded` handler (the `renderSessions` closure cannot be called directly), injects the App stub + a mock `PortfolioDB` seeded with one client + one session, and asserts the rendered view button (label text, `data-i18n`, icon svg). Includes an F-A count guard against the async vacuous-green trap.
- **assets/sessions.js** (:147): same swap — `textContent` label, preserved `data-i18n`, static SVG on the icon span. Safe `= ""` clears (:16/:79) untouched.

## How it works

i18n strings are app-controlled (they originate from in-repo `i18n-*.js`), so the live XSS risk was low — this is defensive consistency with the `textContent`-only discipline `settings.js` already enforces (V5), not a live-vuln fix. The swap nonetheless *reduces* the (low) XSS surface by removing string-interpolated DOM writes. Each test asserts OBSERVABLE rendered DOM only (D-08) — label textContent, `data-i18n` attribute, and `.button-icon svg` presence — never that a render function "was called", so the assertions are agnostic to whether the markup came from `innerHTML` or DOM nodes and therefore prove the output is identical across the swap.

## Deviations from Plan

None — plan executed exactly as written. The opportunistic RFCT-03 touched-region cleanups (`var`->`const`/`let`, silent-catch tagging) found nothing to do: both files already have zero `var` and no silent catch sits in the touched regions.

## Verification

- `node tests/31-overview-render-hardening.test.js` → exit 0 BEFORE the swap (characterization baseline) and AFTER the swap.
- `node tests/31-sessions-render-hardening.test.js` → exit 0 BEFORE and AFTER the swap.
- `grep -n innerHTML assets/overview.js assets/sessions.js` → no `${App.t(...)}` interpolation remains at any of the three hardened sites; only safe `= ""` clears and static (interpolation-free) SVG assignments remain.
- `npm test` → 106 passed, 0 failed (was 104 before this plan; +2 new test files).

## TDD Gate Compliance

Per-task commits follow a test-then-implement shape within each `feat` commit (the characterization test was authored and confirmed green on the unchanged source before the swap, then re-confirmed after). Both render swaps are behavior-preserving, so test and implementation ship together per task; the "green before AND after" baseline is recorded above and reproducible by checking out the pre-swap blob.

## Self-Check: PASSED

- FOUND: tests/31-overview-render-hardening.test.js
- FOUND: tests/31-sessions-render-hardening.test.js
- FOUND: assets/overview.js (hardened :456/:510)
- FOUND: assets/sessions.js (hardened :147)
- FOUND commit e2bf5cc: feat(31-02): harden overview.js i18n innerHTML to textContent/DOM nodes
- FOUND commit 53c3ffe: feat(31-02): harden sessions.js view-button i18n innerHTML to textContent/DOM
