---
created: 2026-06-26T17:30:00.000Z
title: Broader module extraction + test-coverage health (post-v1.2 outlook — likely v1.3)
area: codebase-health
priority: high
type: roadmap-outlook
files:
  - assets/app.js
  - assets/backup.js
  - assets/pdf-export.js
  - assets/db.js
  - assets/license.js
---

## Context

During Phase 30 discussion (2026-06-26), reviewing the full `.js` landscape surfaced two
risks that go **beyond v1.2's scope** (v1.2 only char-tests + refactors the two god modules
`settings.js` + `add-session.js`). Ben flagged both as **backlog / roadmap, NOT Phase 30/31**:

1. **Test-coverage gap is dangerous going forward.** Several large files are barely (or not)
   automatically tested — so future changes ship without a regression net.
2. **Extraction shouldn't stop at two files.** Other 4-digit-line modules are extraction
   candidates — but "big" is a smell, not a verdict; each needs the same triage, not an
   automatic split.

Ben's exact framing: *"app.js can't have 6 tests — that makes 0 sense! … maybe not phase 31
but definitely must be part of backlog and roadmap/outlook."*

## Full-file coverage map (snapshot 2026-06-26)

| File | Lines | Test files referencing it | Read |
|---|---|---|---|
| `settings.js` | 2,969 | 21 | 🎯 v1.2 (P30 char-test + P31 refactor) |
| `add-session.js` | 2,173 | 5 | 🎯 v1.2 (P30 char-test + P31 refactor) |
| `backup.js` | 1,575 | 20 | well-tested; extraction triage candidate |
| `app.js` | 1,474 | **6** | ⚠ under-tested for its size; strong god-module + extraction candidate |
| `pdf-export.js` | 1,198 | 9 | cohesive PDF concern; triage |
| `db.js` | 1,116 | 12 | data layer — possibly cohesive-large (assess, don't assume) |
| `landing.js` | 762 | **0** | marketing page; lower risk |
| `overview.js` | 712 | 2 | under-tested; triage |
| `license.js` | 568 | **0** | ⚠ untested paywall (hardening already backlogged separately) |

(Smaller files <500 lines: assess opportunistically.)

## Work to scope (when promoted)

1. **Extraction triage** of the 4-digit files (`app.js`, `backup.js`, `pdf-export.js`, `db.js`):
   classify each as god-module-needs-split vs cohesive-but-large-and-fine. `app.js` is the
   prime suspect (1,474 lines / 6 tests). Use the Phase 31 behavior-preserving-extraction
   pattern as the template.
2. **Test-coverage backfill** — characterization/behavior safety net for the under-tested large
   modules (`app.js`, `overview.js`, `license.js`, `landing.js`), prioritized by lines × risk.
   This is the more urgent half: untested = silent breakage, independent of refactoring.
3. **App-wide glue consolidation** — duplicated thin glue (`t()` in 5 files, `showToast` in 2,
   `getCurrentLang`, etc.) into shared helpers. Phase 31 handles this for the two god modules;
   the app-wide sweep is this item.

## Sequencing / rationale

Best done **after** v1.2: Phase 30 establishes the test harness (incl. the `package.json` +
jsdom dev-tooling) and Phase 31 proves the extraction pattern. Those become the reusable
template, so this work is cheaper and lower-risk once they exist. Candidate home: a **v1.3 —
Codebase Health II** milestone. Decide at v1.2 close (`/gsd-complete-milestone` / new-milestone).

Cross-ref: `.planning/codebase/CONCERNS.md`, `.planning/codebase/TESTING.md` ("Coverage Status"
— coverage is informal, no threshold), and Phase 30 `30-CONTEXT.md` D-13/D-14.

## Structural test gaps — confirmed against the suite (2026-06-28 remap)

The 2026-06-28 codebase remap (`/gsd-map-codebase`) flagged 4 test gaps in `CONCERNS.md`.
Verified each against the 106-file `tests/*.test.js` suite. Phase 30 added good *functional*
breadth (the `30-*` series), but these **structural** properties remain out of jsdom's reach:

| Gap | Status after P30 | Evidence | Priority |
|---|---|---|---|
| **License gate untested** | ❌ still open | `grep -lE 'isLicensed\|portfolioLicenseActivated\|license\.html' tests/` → **zero hits**. The paywall is pure localStorage logic (`license.js`, `app.js:1103`, `shared-chrome.js:23`) that a refactor could silently remove with no failing test. | **The one concrete, jsdom-fixable gap** — unit-test the gate decision directly |
| **Script load-order untested** | ❌ still open | jsdom stubs all globals, so a mis-ordered `<script>` tag (e.g. `snippets-seed.js` must precede `db.js`) produces a real-page `TypeError` no test reproduces. | Medium — needs a real-DOM/Playwright harness, not jsdom |
| **Cross-page navigation flows** | 🟡 partial | `30-save-redirect.test.js` now covers save→sessions. License-activation redirect + demo→live switch still uncovered. | Low — manual UAT catches these today |
| **PDF rendering in a real browser** | 🟡 mitigated | 10+ PDF test files exist (`pdf-bidi`, `pdf-glyph-coverage`, …) but all jsdom-stubbed via `jsdom-pdf-env.js`. Real-browser bidi/glyph/font loading unverified. | Medium — a font/jsPDF bump could silently break Hebrew output |

**Takeaway for scoping:** the license-gate test is small and should land early (pure logic, no
harness needed). Load-order + real-browser PDF justify standing up a Playwright/cross-browser
layer — which is *also* the long-open "Quality & DevEx: Playwright + cross-browser + maintenance
guide" goal (migrated here from the retired `.planning/OPEN-ITEMS.md`, 2026-06-28). Fold them
together when this is promoted to v1.3.
