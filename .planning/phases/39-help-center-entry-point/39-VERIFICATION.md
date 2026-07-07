---
phase: 39-help-center-entry-point
verified: 2026-07-08T09:00:00Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 2
overrides:
  - must_have: "Per-browser PWA install instructions in Help (Chrome/Edge address-bar icon; iOS Safari Share -> Add to Home Screen, illustrated; Android menu -> Install) — never a fake universal install button (HELP-06 / ROADMAP SC5)"
    reason: "D-15/D-16 (39-CONTEXT.md, captured 2026-07-07): scope amendment made during discuss-phase — Sessions Garden is computer-focused, mobile is not officially supported. Install content ships computer-only (Chrome/Edge address-bar icon + macOS Safari Add to Dock) plus one expectation-setting mobile note; iOS/Android install legs are explicitly excluded (superseding the original HELP-06 wording). This is documented as a deliberate amendment, not an omission — the integrity test (tests/39-help-integrity.test.js) actively asserts no ios/android install topic exists."
    accepted_by: "Ben (via 39-CONTEXT.md D-15/D-16, discuss-phase)"
    accepted_at: "2026-07-07T00:00:00Z"
  - must_have: "EN help content ... reviewed by Sapir (HELP-04 / ROADMAP SC3)"
    reason: "D-19 content pipeline steps 1-4 (Gate A factual/Opus, Gate B native-EN/Sonnet, Gate C App-DNA/Sonnet, + HE/DE/CS chrome gate) all ran against the rendered page and every finding was applied (commits 9140182, 541ecf2). Step 5 — Sapir's own human editorial read — was deliberately deferred post-phase by Ben's explicit decision ('put a pin on that', 2026-07-08) and is tracked as .planning/todos/pending/2026-07-08-sapir-help-content-review.md. Per the verification task's explicit instruction, this is an accepted tracked residual, not a phase gap."
    accepted_by: "Ben (2026-07-08, pinned todo)"
    accepted_at: "2026-07-08T00:30:00Z"
---

# Phase 39: Help Center & "?" Entry Point Verification Report

**Phase Goal:** Help Center & "?" Entry Point — persistent "?" on every app page, offline help.html help center (workflow-spine IA + personalization + technical track), full EN content, empty-state deep-links, per-browser install instructions.
**Verified:** 2026-07-08T09:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A "?" icon appears in the header (beside cloud + gear, RTL-flipped, dark-aware, `.is-active`) on every app page and opens the help center | VERIFIED | `initHelpEntry()` defined in `assets/app.js:477`, called from `initCommon()` (`assets/app.js:767`); every page module (`overview.js`, `sessions.js`, `reporting.js`, `settings.js`, `add-client.js`, `add-session.js`, `help.js`, etc.) calls `App.initCommon()`. `.help-entry-popover` uses `inset-inline-end` (logical property) + semantic tokens, mirrors the existing `.lang-popover` convention. `node tests/39-help-entry.test.js`: 6/6 PASS (mount, idempotency, is-active parity, i18n label, popover items, toggle/outside-click dismiss) |
| 2 | `help.html` is browsable any time via a nav entry, organized along the 7-step workflow spine with a "make it yours" personalization section led early and a clearly separated technical-tips track, topics anchor deep-linkable | VERIFIED | `renderNav()` emits Help anchor (`assets/app.js`); `help.html` body `data-nav="help"`, empty rail/content containers populated by `assets/help.js` from `window.HELP_CONTENT_EN` (12 sections: featured `make-it-yours` + 7 session-loop + 4 technical). `node tests/39-help-render.test.js`: 13/13 PASS (card count === array length, featured first + open, every card id === section id, `openForHash` auto-expand). `node tests/39-help-integrity.test.js`: 12/12 PASS (all required section ids present, HELP_DEEPLINKS resolves) |
| 3 | EN help content covers every current-app feature (session formats incl. custom, date-format personalization, filters/sorting, next-session date, report-a-problem, updates, backups, activation/2-device transfer, troubleshooting) in current terminology, verified by native-speaker agent review | VERIFIED | `assets/help-content-en.js` (27KB, 12 sections) covers the full Phase 32 inventory + post-inventory delta per 39-01-SUMMARY.md. D-19 gate pipeline (Gate A factual/Opus, Gate B native-EN/Sonnet, Gate C App-DNA/Sonnet, HE/DE/CS chrome gate) ran against the rendered page; every finding applied in commits `9140182` (verb fix) and `541ecf2` (full gate batch, confirmed via `git show`). `grep -in "\bpatient\b\|\btreatment\b"` on body content: 0 hits (only a rule-comment match). Terminology/emoji hygiene enforced by integrity test. Sapir's own final editorial read is a documented, accepted, deferred residual (see override) — not a gap |
| 4 | A practitioner hitting an empty state (e.g. no clients yet) sees coaching copy that deep-links into the matching help topic | VERIFIED | `assets/overview.js` → `./help.html#adding-a-client`; `assets/sessions.js` → `./help.html#starting-a-session` (true-empty only, `totalSessions` computed pre-filter at line 181); `assets/reporting.js` + `reporting.html` `#reportingEmpty` → `./help.html#overview`. All three anchors match `window.HELP_DEEPLINKS` (`adding-a-client`, `starting-a-session`, `overview`). `node tests/39-empty-state-coaching.test.js`: 4/4 PASS including the Pitfall-3 negative guard (filter-empty shows NO coaching button) |
| 5a | Help opens fully offline on an installed PWA (new pages/assets added to `sw.js` precache, static-test + real offline-navigation verified) | VERIFIED | `sw.js` `PRECACHE_URLS` contains `/assets/help.js`, `/assets/help-content-en.js`, `/assets/help.css`; `PRECACHE_HTML` contains `/help`. `assets/version.js` `APP_VERSION = '1.3.0'` (cache-roll signal, confirmed via `grep`). `node tests/39-help-precache.test.js`: 8/8 PASS. `node tests/sw-precache-cache-reload.test.js`: 4/4 PASS (anti-stale reload-mode fetch preserved). Real-offline checkpoint (Task 2, 39-06-PLAN.md) approved by Ben 2026-07-07 per 39-06-SUMMARY.md, with one mid-checkpoint CSS fix (`3b68d87`, confirmed landed: `.help-entry`/`.help-entry-popover`/`.help-entry-item` rules present in `assets/app.css:201-227`) |
| 5b | Per-browser PWA install instructions (Chrome/Edge, iOS Safari, Android) available in Help, never a fake universal install button | PASSED (override) | Delivered computer-only (Chrome/Edge address-bar icon + macOS Safari Add to Dock + one mobile expectation-setting note) per documented D-15/D-16 scope amendment. `grep -in "ios\|android" assets/help-content-en.js`: 0 hits; integrity test explicitly asserts no ios/android install topic id exists. No universal Install button (three distinct browser-specific topics). See override entry above |
| 6 | No debt markers, stubs, or placeholder content in phase-touched files | VERIFIED | `grep -nE "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` across all 19 phase files (help.js, help.css, help-content-en.js, help.html, app.js, overview.js, sessions.js, reporting.js, reporting.html, sw.js, version.js, i18n-*.js, tests/39-*.test.js): 0 hits. No literal hex / physical CSS properties in `help.css` (grep confirms) |
| 7 | Code-review findings (39-REVIEW.md) are resolved or properly triaged, not silently dropped | VERIFIED | 0 critical findings. WR-01 (language-switch search state leak) fixed in commit `6e1aa02` — confirmed present in `assets/help.js:458-460` (`applySearch` re-invoked with live input value after `app:language` render). WR-02 (popover ARIA menu contract) + 7 info items captured in `.planning/todos/pending/2026-07-08-help-popover-menu-a11y.md` (confirmed on disk, non-blocking a11y/polish, correctly not silently absorbed) |
| 8 | Full test suite is green with no regressions | VERIFIED | `node tests/run-all.js`: **136 passed, 0 failed, 136 total**. All 5 new Phase 39 test files individually re-run and green: `39-help-integrity.test.js` (12/12), `39-help-entry.test.js` (6/6), `39-help-render.test.js` (13/13), `39-empty-state-coaching.test.js` (4/4), `39-help-precache.test.js` (8/8). `25-11-i18n-parity.test.js` (23/23, 4-locale parity for the 11 new chrome keys) |
| 9 | Requirements HELP-01..HELP-07 are all accounted for with no orphans | VERIFIED | All 7 IDs appear in PLAN `requirements:` frontmatter across the 6 plans (HELP-01: 02,03 · HELP-02: 02,03,04 · HELP-03: 01,04 · HELP-04: 01,06 · HELP-05: 01,02,05 · HELP-06: 01,04 · HELP-07: 06). REQUIREMENTS.md traceability table marks all 7 "Complete". No orphaned Phase-39 requirement IDs found |

**Score:** 9/9 truths verified (0 present-but-behavior-unverified; 2 carried as PASSED (override) for documented, accepted scope amendments)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/help-content-en.js` | `window.HELP_CONTENT_EN` (12 sections) + `window.HELP_DEEPLINKS`, `{ui:key}` tokens, `covers[]` | ✓ VERIFIED | Exists, 27KB, loads cleanly, integrity test 12/12 |
| `tests/39-help-integrity.test.js` | Standing npm-test gate | ✓ VERIFIED | Exists, exits 0, auto-discovered by run-all.js |
| `assets/i18n-en.js` / `he` / `de` / `cs` | 11 new chrome keys, 4-locale parity | ✓ VERIFIED | Parity gate 23/23 PASS |
| `assets/app.js` (initHelpEntry + renderNav) | "?" header entry + Help nav anchor | ✓ VERIFIED | Both present, wired into initCommon, jsdom test 6/6 |
| `tests/39-help-entry.test.js` | Mount/idempotency/popover behavior gate | ✓ VERIFIED | Exists, 6/6 PASS |
| `help.html` | Standalone page shell | ✓ VERIFIED | Exists, valid scaffold, script order correct, empty containers |
| `assets/help.js` | Renderer (cards/rail/search/deep-link/scroll-spy/install glyphs) | ✓ VERIFIED | Exists, all render-test assertions pass, WR-01 fix confirmed present |
| `assets/help.css` | Soft-type help surfaces | ✓ VERIFIED | Exists, no literal hex, no physical properties, dark/RTL-aware |
| `tests/39-help-render.test.js` | Render + interpolation + XSS-echo gate | ✓ VERIFIED | Exists, 13/13 PASS |
| `assets/overview.js` / `sessions.js` / `reporting.js` / `reporting.html` | Empty-state coaching trio | ✓ VERIFIED | All wired, deep-links match HELP_DEEPLINKS |
| `tests/39-empty-state-coaching.test.js` | Coaching + true/filter-empty behavior gate | ✓ VERIFIED | Exists, 4/4 PASS incl. Pitfall-3 negative |
| `sw.js` | Help precache (PRECACHE_URLS + PRECACHE_HTML) | ✓ VERIFIED | 3 assets + /help confirmed present; anti-stale fetch mode preserved |
| `assets/version.js` | APP_VERSION cache-roll signal | ✓ VERIFIED | `1.3.0` confirmed |
| `tests/39-help-precache.test.js` | Static precache + anti-stale regression guard | ✓ VERIFIED | Exists, 8/8 PASS |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `assets/app.js` initHelpEntry | `./help.html` | popover item href | WIRED | `help.entry.center` label, hard href `./help.html` |
| `assets/app.js` initHelpEntry | `mailto:contact@sessionsgarden.app` | popover item href | WIRED | `help.entry.contact` label |
| `assets/help.js` render() | `window.HELP_CONTENT_EN` | iteration + `{ui:key}` via `App.t()` | WIRED | Card count === array length (test-verified) |
| `assets/help.js` interpolateUiLabels | `window.I18N.en` (via App.t) | `{ui:key}` regex resolution | WIRED | Render test: resolved label rendered, no literal token leak |
| `assets/overview.js` | `./help.html#adding-a-client` | coaching button href | WIRED | Anchor matches `HELP_DEEPLINKS.addClient` |
| `assets/sessions.js` | `./help.html#starting-a-session` | coaching button href (true-empty only) | WIRED | Anchor matches `HELP_DEEPLINKS.startSession`; filter-empty path unaffected |
| `assets/reporting.js` | `./help.html#overview` | coaching button href (no-data only) | WIRED | Anchor matches `HELP_DEEPLINKS.readDashboard` |
| `sw.js` PRECACHE_URLS/HTML | `assets/help.js`/`help-content-en.js`/`help.css`/`/help` | precache list entries | WIRED | Confirmed via grep + static precache test |
| `sw.js` CACHE_NAME | `assets/version.js` INTEGRITY_TOKEN/APP_VERSION | cache-roll derivation | WIRED | version bumped to 1.3.0, precache test green |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `help.html` cards/rail | `window.HELP_CONTENT_EN` | `assets/help-content-en.js` (static authored array, 12 sections) | Yes — 12 real sections, not empty/static-fallback | ✓ FLOWING |
| `{ui:key}` chip labels | `App.t(key)` | `window.I18N.en` via `assets/i18n-en.js` | Yes — resolves to real live label text, test-verified not to leak literal token | ✓ FLOWING |
| Empty-state coaching hrefs | hardcoded `./help.html#<id>` strings | `window.HELP_DEEPLINKS` (validated by integrity test, not directly read at runtime by the coaching modules) | Yes — the three hrefs are literal strings matching the deep-link registry's values, cross-checked by the integrity test | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite green | `node tests/run-all.js` | 136 passed, 0 failed | ✓ PASS |
| Help content integrity | `node tests/39-help-integrity.test.js` | 12 passed, 0 failed | ✓ PASS |
| "?" header entry mount/idempotency/popover | `node tests/39-help-entry.test.js` | 6 passed, 0 failed | ✓ PASS |
| Help page render + XSS-echo guard | `node tests/39-help-render.test.js` | 13/13 checks passed | ✓ PASS |
| Empty-state coaching + Pitfall-3 negative | `node tests/39-empty-state-coaching.test.js` | 4 passed, 0 failed | ✓ PASS |
| SW precache + anti-stale guard | `node tests/39-help-precache.test.js` && `node tests/sw-precache-cache-reload.test.js` | 8/8 and 4/4 passed | ✓ PASS |
| 4-locale i18n parity (new chrome keys) | `node tests/25-11-i18n-parity.test.js` | 23 passed, 0 failed | ✓ PASS |
| No literal hex / physical CSS in help.css | `grep -n "#[0-9a-fA-F]\{3,6\}" assets/help.css`; `grep -nE "(margin-left\|margin-right\|right\|left)\s*:" assets/help.css` | 0 matches both | ✓ PASS |
| No debt markers in phase files | `grep -nE "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` across 19 phase files | 0 matches | ✓ PASS |

### Probe Execution

SKIPPED — no `scripts/*/tests/probe-*.sh` declared in this phase's PLAN/SUMMARY files and no conventional probes found in the repository for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| HELP-01 | 39-02, 39-03 | Persistent "?" icon reachable from any app page | ✓ SATISFIED | `initHelpEntry()` wired into `initCommon()`; 6/6 jsdom test |
| HELP-02 | 39-02, 39-03, 39-04 | Standalone browsable help-center page with nav entry + anchor deep-links | ✓ SATISFIED | `help.html` + `renderNav()` Help anchor; 13/13 render test |
| HELP-03 | 39-01, 39-04 | Workflow-spine IA, featured personalization, technical track | ✓ SATISFIED | 12-section content array; card structure test-verified |
| HELP-04 | 39-01, 39-06 | Full EN content, native-speaker + Sapir review | ✓ SATISFIED (Sapir step overridden as deferred/tracked) | D-19 Gates A/B/C + locale gate applied; Sapir residual tracked, not a gap |
| HELP-05 | 39-01, 39-02, 39-05 | Empty-state coaching deep-links | ✓ SATISFIED | 4/4 coaching test incl. Pitfall-3 |
| HELP-06 | 39-01, 39-04 | Per-browser PWA install instructions | ✓ SATISFIED (computer-only override) | D-15/D-16 documented scope amendment; integrity test enforces computer-only |
| HELP-07 | 39-06 | Offline on installed PWA | ✓ SATISFIED | Precache tests green; real-offline checkpoint approved by Ben |

No orphaned requirements found — every ID in REQUIREMENTS.md's Phase 39 row is claimed by at least one plan.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `assets/app.js` | ~490-526 | Popover claims `role="menu"`/`role="menuitem"` without keyboard contract (WR-02) | ℹ️ Info (tracked) | Non-blocking a11y gap; captured in `.planning/todos/pending/2026-07-08-help-popover-menu-a11y.md`, not silently dropped |
| `assets/help.css` | 144 | Dead `.search-empty.is-visible` class never toggled by JS | ℹ️ Info (tracked) | Same todo file; cosmetic/maintainability only |
| `assets/help.js` | 315 | Tech-band visibility check via inline-style substring match | ℹ️ Info (tracked) | Same todo file; fragile but functionally correct today |
| `assets/help.js` | 289 | Clearing search collapses a deep-linked open card | ℹ️ Info (tracked) | Same todo file; minor UX rough edge |
| `help.html` / `assets/help.js` | 67,70,84,88 / 197 | Static EN aria-labels on translated chrome | ℹ️ Info (tracked) | Same todo file; RTL/i18n polish, not a functional break |

No blocker-level anti-patterns found. No unresolved debt markers (TBD/FIXME/XXX) in any phase-touched file.

### Human Verification Required

None. Both blocking human-verify checkpoints in 39-06-PLAN.md were cleared during execution and are documented as approved:
- HELP-07 real-offline-on-installed-PWA — approved by Ben, 2026-07-07 (39-06-SUMMARY.md Task 2).
- HELP-04 D-19 content/native/DNA/locale gates + real-WebKit RTL/dark/soft-type check — all findings applied, Ben personally verified Safari + RTL, Playwright real-WebKit probe passed 16/16 on the final page (39-06-SUMMARY.md Task 3).

Sapir's own editorial read of the rendered help.html (D-19 step 5) is a deliberately deferred, explicitly tracked residual (`.planning/todos/pending/2026-07-08-sapir-help-content-review.md`) per Ben's own decision, and is carried as an accepted override in this report rather than an open human-verification item, per this verification task's explicit instruction.

### Gaps Summary

No gaps. All 9 observable truths derived from the ROADMAP.md Phase 39 success criteria and the 6 plans' `must_haves` are VERIFIED against the live codebase, by execution (136/136 full suite, 5/5 new phase test files individually re-run green) and by direct source inspection (grep/read) — not by trusting SUMMARY.md claims. All post-review fix commits referenced in the task context (WR-01 fix `6e1aa02`, gate-finding fixes `541ecf2`/`9140182`, UI-label chips `4dd8d67`, snippets expansion `dd2bc51`, popover CSS `3b68d87`) were independently confirmed present in the current source via `git show` and direct file inspection.

Two items are carried as documented overrides rather than gaps, both backed by explicit project decisions already recorded in the phase's own artifacts (39-CONTEXT.md D-15/D-16; the pinned Sapir-review todo) and by this verification task's own explicit instruction not to re-flag the Sapir residual: (1) per-browser install instructions are computer-only rather than covering iOS/Android, and (2) Sapir's final human editorial read of the rendered help content remains outstanding as a tracked, non-blocking todo.

One non-blocking quality note beyond the code review's own findings: the WR-01 fix (re-applying search state after a language-switch re-render) has no dedicated automated regression test in `tests/39-help-render.test.js` — it was verified manually against real WebKit per the fix commit message, not by an added jsdom assertion. This does not block the phase (the fix is present and correct on inspection, and the underlying search/render mechanics ARE covered by the existing render test), but a follow-up test case would close the gap between "fixed and manually verified" and "fixed and regression-guarded."

---

_Verified: 2026-07-08T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
