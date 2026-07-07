---
phase: 39-help-center-entry-point
plan: 01
subsystem: ui
tags: [help-center, content-model, i18n, static-test, anti-rot, vanilla-js]

# Dependency graph
requires:
  - phase: 32-readme-code-comments
    provides: 32-HELP-CONTENT-INVENTORY.md (the ~40-leaf grounded topic tree + per-leaf priority + feature/file mapping)
  - phase: 26-in-app-onboarding-overview-help-system
    provides: the 7-step workflow spine + copywriting contract (noun headings, no emojis, i18n keys)
provides:
  - "assets/help-content-en.js — window.HELP_CONTENT_EN (12 sections: featured make-it-yours + 7 session-loop + 4 technical) with {ui:key} live-label tokens and per-topic covers metadata"
  - "window.HELP_DEEPLINKS — addClient/startSession/readDashboard → section id anchor contract for the empty-state coaching trio"
  - "tests/39-help-integrity.test.js — standing npm test gate for {ui:key} resolution, id uniqueness, deep-link resolution, coverage, computer-only install, terminology/emoji hygiene"
affects: [39-04-help-page-render, 39-05-empty-state-deeplinks, 43-docs-maintenance-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Live-label interpolation: help body quotes UI labels as {ui:key} tokens keyed to window.I18N.en (D-23), so quoted labels never drift"
    - "Per-topic covers[] metadata seeded from the Phase 32 inventory — the diff hook for the Phase 43 docs-rot gate (D-24)"
    - "Co-located zero-dep static integrity test joining tests/run-all.js auto-discovery (fs/vm sandbox, 33-i18n pattern)"

key-files:
  created:
    - assets/help-content-en.js
    - tests/39-help-integrity.test.js
  modified: []

key-decisions:
  - "Body schema: block nodes p / note / steps / glyph; P1 topics use full numbered steps (D-13), install glyphs carry a name resolved by help.js in Plan 04"
  - "Install is computer-only: chrome + safari (Add to Dock) + one mobile expectation-setting note; no iOS/Android topics (D-15/D-16)"
  - "License topics use prose (license.html carries no i18n keys); only nav.license is tokenized"

patterns-established:
  - "{ui:key} interpolation as the anti-drift seam between EN help copy and the live i18n dictionary"
  - "covers[] as the machine-checkable docs-coverage contract for Phase 43"

requirements-completed: [HELP-03, HELP-04, HELP-05, HELP-06]

coverage:
  - id: D1
    description: "help-content-en.js exports window.HELP_CONTENT_EN — 12 spine-organized sections covering the inventory + post-inventory delta, featured-first, {ui:key}-interpolated, covers on every topic"
    requirement: HELP-04
    verification:
      - kind: unit
        ref: "tests/39-help-integrity.test.js#Every {ui:key} token resolves to a real window.I18N.en key"
        status: pass
      - kind: unit
        ref: "tests/39-help-integrity.test.js#All required section ids from Plan 01 are present"
        status: pass
    human_judgment: false
  - id: D2
    description: "window.HELP_DEEPLINKS gives Plan 05 stable anchor targets (addClient/startSession/readDashboard → real section ids)"
    requirement: HELP-05
    verification:
      - kind: unit
        ref: "tests/39-help-integrity.test.js#Every HELP_DEEPLINKS value is a real section id"
        status: pass
    human_judgment: false
  - id: D3
    description: "Computer-only install content (Chrome/Edge + macOS Safari Add to Dock + mobile expectation note), no iOS/Android install legs"
    requirement: HELP-06
    verification:
      - kind: unit
        ref: "tests/39-help-integrity.test.js#Install section is computer-only (chrome + safari + mobile-note, no ios/android)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Static integrity test is a standing npm test gate (auto-discovered, green, proven falsifiable)"
    requirement: HELP-03
    verification:
      - kind: unit
        ref: "node tests/run-all.js — 132 passed, 0 failed (39-help-integrity.test.js discovered green)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Help copy reads native-quality in the Sessions Garden calm voice for a global audience (D-17), terminology consistent (client/session, Heart-Wall)"
    requirement: HELP-04
    verification: []
    human_judgment: true
    rationale: "Voice/naturalness and clinical-framing correctness are the D-19 Gate B/C + Sapir rendered-page review; automation checks terminology/emoji hygiene but not prose quality"

# Metrics
duration: ~15min
completed: 2026-07-07
status: complete
---

# Phase 39 Plan 01: Help-Content Substrate Summary

**Anti-rot EN help corpus in `assets/help-content-en.js` — 12 spine-organized sections with `{ui:key}` live-label tokens, per-topic `covers` metadata, a deep-link registry, and a co-located static integrity test that joins `npm test`.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-07T19:23:00Z
- **Completed:** 2026-07-07T19:38:28Z
- **Tasks:** 3
- **Files modified:** 2 (both created)

## Accomplishments
- `window.HELP_CONTENT_EN`: featured `make-it-yours` + 7 session-loop sections + 4 technical sections, each topic priority-scaled (P1 = full numbered steps) with grounded `covers[]` metadata seeded from the Phase 32 inventory.
- 58 distinct `{ui:key}` live-label tokens, every one resolving against `window.I18N.en` — the D-23 anti-drift seam (a Hebrew-UI reader sees actual Hebrew button names under EN help).
- Computer-only install content (Chrome/Edge address-bar icon + macOS Safari Add to Dock + one mobile expectation note), no iOS/Android legs — supersedes the mockup's mobile install legs per D-15/D-16.
- `window.HELP_DEEPLINKS` anchor contract for the empty-state coaching trio (Plan 05).
- `tests/39-help-integrity.test.js`: 12 named checks, green in the full suite (132/132), proven falsifiable.

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema + featured & session-loop sections** - `abda526` (feat)
2. **Task 2: Technical track + computer-only install + deep-link registry** - `eabc53a` (feat)
3. **Task 3: Static integrity test (D-25)** - `0dee423` (test)

## Files Created/Modified
- `assets/help-content-en.js` - The EN help corpus: `window.HELP_CONTENT_EN` (12 sections) + `window.HELP_DEEPLINKS`, with a documented block-node schema (`p`/`note`/`steps`/`glyph`).
- `tests/39-help-integrity.test.js` - Zero-dep fs/vm integrity gate loading i18n-en.js + help-content-en.js; auto-discovered by tests/run-all.js.

## Decisions Made
- Body schema uses four block-node types (`p`, `note`, `steps`, `glyph`); install glyphs carry only a `name` (`install-chrome`/`install-safari`) resolved to inline SVG by help.js in Plan 04.
- License topics are prose (license.html exposes no i18n keys); only `nav.license` is tokenized. Documented so the Plan 04/43 grounding checks don't flag missing tokens.
- Post-inventory delta placed per plan: custom session formats + date format under `make-it-yours`; filters/sort + next-session date under `overview`; report-a-problem under `troubleshooting`; working-offline + updates + privacy anchor under `backups`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing array-element comma after the overview section**
- **Found during:** Task 2 (appending the technical track)
- **Issue:** The Edit that inserted the technical sections left the `overview` section object without a trailing comma before the next `{`, so `require()` threw a SyntaxError at the first technical section.
- **Fix:** Added the missing `,` after the overview section's closing brace.
- **Files modified:** assets/help-content-en.js
- **Verification:** `node -e "require('./assets/help-content-en.js')"` loads cleanly; Task 2 verify + full integrity test pass.
- **Committed in:** eabc53a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Trivial in-task syntax fix; no scope change.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Section/topic ids and `covers[]` are now stable anchors for Plan 04 (page render), Plan 05 (empty-state deep-links), and the Phase 43 docs gate.
- Plan 04 must implement the `glyph` node renderer (inline SVG for `install-chrome` / `install-safari`) and resolve `{ui:key}` tokens against the live i18n dict.
- Reminder for a later plan: `sw.js` PRECACHE_URLS must gain `help.html` + `help-content-en.js` (HELP-07) — a known manual chore-commit follow-up.

## Self-Check: PASSED
- Files verified on disk: assets/help-content-en.js, tests/39-help-integrity.test.js, 39-01-SUMMARY.md
- Commits verified in git log: abda526, eabc53a, 0dee423

---
*Phase: 39-help-center-entry-point*
*Completed: 2026-07-07*
