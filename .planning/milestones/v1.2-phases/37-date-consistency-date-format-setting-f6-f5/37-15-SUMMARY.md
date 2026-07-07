---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 15
subsystem: ui
tags: [overview, sort, sortable-headers, aria-sort, createElementNS, i18n, headless-chrome, rtl]

# Dependency graph
requires:
  - phase: 37-10
    provides: the pinned RED behavior spec (tests/37-overview-sort.test.js) this plan turns GREEN
  - phase: 37-11
    provides: th.sortable/.sort-arrow CSS (front-loaded), so this plan touches NO app.css
  - phase: 37-13
    provides: Overview filter controls included in the visual gate renders
  - phase: 37-14
    provides: Sessions filter controls included in the visual gate renders; both old dropdowns gone (precondition for the dead-sub-key removal)
provides:
  - Overview click-to-sort on Name / Sessions / Last Session headers with direction arrows, two-way-synced with #clientSortSelect (D2b)
  - Retirement of the dead sessions.filter.type.all/.heartShield/.regular sub-keys across all 4 bundles (parent toggle label intact)
  - Headless visual gate — 6 renders (Overview/Sessions × LTR / Hebrew RTL / 500px mobile), zero horizontal overflow, Ben-checkpointed
affects: [overview, any future table-sort work, i18n bundle hygiene]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One shared sort state {key, dir} drives BOTH header clicks and the dropdown; per-key pinned default directions (name↑, sessions↓, lastSession↓); _sortInteracted guards the first-click flip"
    - "Arrow glyph built once per header via createElementNS; visual direction driven purely by th[aria-sort] CSS rotation — no per-click DOM rebuild"

key-files:
  created: []
  modified:
    - index.html (th.sortable + data-sort-key + aria-sort + span.sort-label/span.sort-arrow on 3 headers)
    - assets/overview.js (SORT_DEFAULT_DIR, setSort, syncSortIndicators, buildSortArrows, header click/keydown wiring, dropdown sync)
    - assets/i18n-en.js, assets/i18n-he.js, assets/i18n-de.js, assets/i18n-cs.js (3 dead sub-keys removed each; 557-key parity)
    - tests/37-overview-sort.test.js (post-checkpoint hardening: assert buildSortArrows actually injects the chevron svg)

key-decisions:
  - "D2b Sort = BOTH: header click and #clientSortSelect share one state; clicking an already-active key flips direction, any new key applies its pinned default"
  - "Sessions-page columns deliberately NOT sortable (Overview-only feature) — clicking them is a no-op by design"
  - "Checkpoint issue 'no sort icon on click' root-caused to surfaces that lack the feature (demo.html still ships the reduced pre-37 overview markup; deployed site has nothing of Phase 37) — index.html itself field-verified working end-to-end in real Chromium via Playwright"

patterns-established:
  - "Visual gate harness: isolated-markup pages replicating the BUILT DOM + real tokens.css/app.css via file://, self-measuring scrollWidth===innerWidth into a visible banner; Playwright (from TPM_Docs/video-pipeline) for interactive field checks headless-Chrome screenshots can't do"

requirements-completed: [FILT-03]

coverage:
  - id: D1
    description: "Click-to-sort Overview headers (Name/Sessions/Last Session) with direction arrows, aria-sort, per-key defaults, and two-way #clientSortSelect sync"
    requirement: FILT-03
    verification:
      - kind: unit
        ref: "tests/37-overview-sort.test.js (5/5, incl. injected-svg assertion added post-checkpoint)"
        status: pass
      - kind: e2e
        ref: "Playwright field check vs real index.html on localhost: svg injected 3/3, click→aria-sort descending→select synced→second click flips ascending"
        status: pass
    human_judgment: false
  - id: D2
    description: "Dead heart-dropdown sub-keys (sessions.filter.type.all/.heartShield/.regular) retired across all 4 bundles; parent key intact; bundles at 557-key parity"
    requirement: FILT-03
    verification:
      - kind: other
        ref: "grep bundle key counts (557 ×4) + full suite green"
        status: pass
    human_judgment: false
  - id: D3
    description: "Visual gate: 6 headless renders (Overview/Sessions × LTR/RTL/500px), zero horizontal overflow, RTL chevron/toggle/arrow sides correct"
    verification:
      - kind: manual_procedural
        ref: "6 PNGs + self-measured overflow banners, sent to Ben 2026-07-05; checkpoint answered 2026-07-06"
        status: pass
    human_judgment: true
    rationale: "Visual quality and RTL correctness need human eyes; Ben reviewed the renders. His two flags were investigated and resolved (see Deviations)."

# Metrics
duration: 2 sessions (Tasks 1+1.5 on 2026-07-05; Task 2 gate + checkpoint on 2026-07-06)
completed: 2026-07-06
status: complete
---

# Phase 37 Plan 15: Overview Click-to-Sort + Visual Gate Summary

Delivered D2b click-to-sort on the Overview table (Name/Sessions/Last Session, direction arrows, RTL-aware, aria-sort, two-way dropdown sync), retired the three dead heart-dropdown i18n sub-keys, and closed the work package with the headless visual gate — 6 renders across both screens in LTR/RTL/mobile, all with self-measured zero horizontal overflow, checkpointed with Ben.

## What Was Built

**Task 1 — Click-to-sort headers ↔ dropdown sync (commit e41bdb4)**
- `index.html`: Name/Sessions/Last Session th → `.sortable[data-sort-key][aria-sort][tabindex=0]` with `span.sort-label > span.sort-arrow`; Type + Actions untouched.
- `assets/overview.js`: shared `{_sortKey,_sortDir}` state; `SORT_DEFAULT_DIR` (name↑, sessions↓, lastSession↓); `setSort` (repeat-click flips, new key applies pinned default, `_sortInteracted` prevents first-click flip); `syncSortIndicators` (aria-sort + dropdown value); `buildSortArrows` (createElementNS chevron, direction via `th[aria-sort]` CSS rotation); click + Enter/Space keydown wiring; dropdown `change` drives the same state.

**Task 1.5 — Dead sub-key retirement (commit 9ff9ac8)**
- `sessions.filter.type.all/.heartShield/.regular` removed from all 4 bundles (+ HTML fallback references); parent `sessions.filter.type` ("Heart-Wall" toggle label) intact. Bundles verified at 557-key parity.

**Task 2 — Headless visual gate + checkpoint (this session)**
- Scratchpad harness (not shipped): 6 isolated-markup pages replicating the built DOM (open multi-select with 2 checked + "2 selected"/"2 נבחרו" summary, Heart-Wall toggle ON, injected sort-arrow SVGs, one th descending, 2 static rows) linking the real `tokens.css`/`app.css`. Configs: overview/sessions × LTR(en,900px) / RTL(he) / mobile(500px). Every render self-measures `scrollWidth === innerWidth` into a banner — **6/6 green (zero horizontal overflow)**. RTL verified: chevron flips left, checkboxes on inline-start, arrows follow header text, toggle mirrors.
- Suite gate: plain `npm test` → **124/124 GREEN** (run three times this session).

## Checkpoint (Ben, 2026-07-06) and resolutions

1. **"Clicking a column doesn't add the sort icon"** — investigated with a Playwright field check against the real `index.html` (licensed profile, real clicks): arrows ARE injected (3/3), click sorts, icon flips, second click reverses. The sighting is explained by surfaces that genuinely lack the feature: `demo.html` still ships the reduced pre-37 overview markup (no sortable headers, no 37 filter bar at all), the Sessions page is not sortable by design, and the deployed site has none of Phase 37 (nothing pushed). Hardened `tests/37-overview-sort.test.js` to assert the injected svg (commit dece141) so an icon-less sorted state can never pass again. **Open decision for Ben: should demo.html gain the Phase 37 controls (backlog)?**
2. **"Sessions table wraps date/client to 2 lines (mobile render)"** — pre-existing: only `tr.client-row` (Overview) has the ≤640px stacked-card treatment; `tr.session-row` never had one, so the sessions table squeezes/clips at 500px. Not a 37-15 regression; logged as a backlog candidate.

## Verification

- `node tests/37-overview-sort.test.js` → 5/5 (including the new svg-injection assertion).
- Full suite plain `npm test` → 124/124.
- Playwright e2e field check (real Chromium, real index.html): init completes, svgs 3/3, click→`aria-sort=descending`+`select=sessions`+arrow opacity 1, second click→`ascending`.
- 6 visual renders: 6/6 zero-overflow banners; eyeballed + Ben-reviewed.

## Deviations

- Test file was modified AFTER the checkpoint (svg-injection assertion) — a strengthening addition driven by the UAT finding, not a weakening; the pinned behavior cases are byte-identical.
- The plan's "one th aria-sort=descending" render state was realized on the Sessions column (its pinned default direction).
