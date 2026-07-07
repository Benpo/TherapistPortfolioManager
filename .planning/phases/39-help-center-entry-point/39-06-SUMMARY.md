---
phase: 39-help-center-entry-point
plan: 06
subsystem: infra
tags: [service-worker, precache, offline, pwa, help-center, content-review, i18n, webkit, HELP-07, HELP-04]

# Dependency graph
requires:
  - plan: 39-01
    provides: "window.HELP_CONTENT_EN + assets/help-content-en.js (the precached content data)"
  - plan: 39-03
    provides: "'?' header popover Help entry (the offline-navigation start point verified in Task 2)"
  - plan: 39-04
    provides: "help.html + assets/help.js + assets/help.css (the surfaces added to the SW precache)"
provides:
  - "Help center precached for offline use: /help in PRECACHE_HTML + help.js/help-content-en.js/help.css in PRECACHE_URLS"
  - "APP_VERSION 1.2.5 → 1.3.0 cache-roll (the deliberate CACHE_NAME refresh signal for installed PWAs)"
  - "tests/39-help-precache.test.js — static precache guard that also re-asserts the reload-mode anti-stale fetch"
  - "HELP-07 field-verified: Help opens fully offline on Ben's installed PWA (Safari included)"
  - "HELP-04 content signed off through the D-19 gate pipeline (A/B/C + locale chrome) on the rendered page"
affects: [40-welcome-onboarding, 42-whats-new-changelog, 43-docs-maintenance-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PRECACHE_URLS edit + APP_VERSION bump is a TWO-STEP chore: the pre-commit hook skips the auto CACHE_NAME bump when sw.js is in the diff, so the version.js semver bump is the deliberate cache-refresh signal (reference-pre-commit-sw-bump.md)"
    - "Static precache test doubles as an anti-stale regression guard — it re-asserts the reload-mode static fetch so reverting the anti-stale form also fails this test"

key-files:
  created:
    - tests/39-help-precache.test.js
  modified:
    - sw.js
    - assets/version.js
    - assets/help-content-en.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js

key-decisions:
  - "APP_VERSION set to 1.3.0 (v1.3's first shipped phase) as the CACHE_NAME cache-roll signal — Ben's phase-close call, per the plan's proposed value"
  - "Reporting empty-state string help.deeplink.readDashboard references each locale's REPORTS word (nav.reporting), NOT the overview/dashboard word the content reviewers suggested — orchestrator override because the string renders on the Reporting page, not Overview"
  - "Sapir's human read of the rendered help.html (D-19 step 5) is DEFERRED post-phase (Ben's explicit 'put a pin on that', 2026-07-08) — pinned as a todo; all wording remains subject to that final review"

patterns-established:
  - "Language-facing D-19 gate agents run at Sonnet tier (D-20); the factual Gate A runs at Opus"
  - "Real-offline + real-WebKit checkpoints are cleared on Ben's installed PWA, not the jsdom/vm harness (Pitfall 2 — Chromium passing does not prove Safari)"

requirements-completed: [HELP-07, HELP-04]

coverage:
  - id: D1
    description: "sw.js precaches the four help entries: /assets/help.js, /assets/help-content-en.js, /assets/help.css in PRECACHE_URLS and /help in PRECACHE_HTML"
    requirement: HELP-07
    verification:
      - kind: unit
        ref: "tests/39-help-precache.test.js — asserts the three assets in PRECACHE_URLS + the extensionless /help in PRECACHE_HTML"
        status: pass
    human_judgment: false
  - id: D2
    description: "The reload-mode static precache fetch (anti-stale guard) is preserved, not regressed by the help-asset edit"
    requirement: HELP-07
    verification:
      - kind: unit
        ref: "tests/39-help-precache.test.js re-asserts the reload-mode fetch + tests/sw-precache-cache-reload.test.js exits 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "A CACHE_NAME refresh ships so installed PWAs re-precache the new files (APP_VERSION 1.2.5 → 1.3.0)"
    requirement: HELP-07
    verification:
      - kind: manual_procedural
        ref: "assets/version.js APP_VERSION = '1.3.0'; footer version confirmed bumped on Ben's installed PWA before the offline test"
        status: pass
    human_judgment: false
  - id: D4
    description: "Help opens fully offline on a real installed PWA (Safari included) — '?' → Help center path, rail/cards/search/deep-link work with no connection, no asset 404s"
    requirement: HELP-07
    verification:
      - kind: manual_procedural
        ref: "Task 2 blocking checkpoint — Ben verified offline navigation on his installed PWA; approved 2026-07-07"
        status: pass
    human_judgment: true
    rationale: "Real service-worker + offline navigation on installed Safari cannot be exercised by the zero-dep jsdom/vm harness (Pitfall 2); requires a human on a real installed PWA"
  - id: D5
    description: "Rendered help.html passes the D-19 content-review gates (Gate A factual, Gate B native-EN, Gate C App-DNA, + HE/DE/CS chrome gate) and the WebKit RTL/dark/soft-type visual check"
    requirement: HELP-04
    verification:
      - kind: automated_ui
        ref: "Playwright real-WebKit probe of the final page: 16/16 (cards/rail/chips, popover, search no-match, deep-link auto-expand, dark surfaces, HE dir=rtl + mirrored rail + live Hebrew chips, real Rubik, zero page errors/404s)"
        status: pass
      - kind: manual_procedural
        ref: "D-19 gates A/B/C + locale gate all ran; all blockers + minors applied (commits 9140182, 541ecf2); Ben verified Safari + RTL and pre-approved completion 2026-07-07/08"
        status: pass
    human_judgment: true
    rationale: "Content voice/quality + soft-type/dark/RTL feel are human judgment; Sapir's own editorial read (D-19 step 5) is DEFERRED post-phase (pinned todo) — all wording remains subject to it"

# Metrics
duration: ~100min
completed: 2026-07-08
status: complete
---

# Phase 39 Plan 06: Ship Help Offline + Close the Human-Verification Gates Summary

**Help center precached for offline use (`/help` + `help.js`/`help-content-en.js`/`help.css`) with an `APP_VERSION 1.2.5 → 1.3.0` cache-roll and a static precache-plus-anti-stale test, then the three human-only gates cleared: real-offline navigation on Ben's installed PWA (HELP-07), the D-19 content-review pipeline on the rendered page, and the real-WebKit RTL/dark/soft-type check (HELP-04) — with Sapir's final editorial read deliberately pinned for post-phase.**

## Performance

- **Duration:** ~100 min (spanned the offline deploy + the D-19 checkpoint window, 2026-07-07 22:25 → 2026-07-08 00:05)
- **Completed:** 2026-07-08
- **Tasks:** 3 (1 auto + 2 blocking human-verify checkpoints)
- **Files modified:** 7 (1 created, 6 modified across the task + checkpoint-window fixes)

## Accomplishments

- **Task 1 — SW precache + cache-roll + test (`c737535`):** Added `/assets/help.js`, `/assets/help-content-en.js`, `/assets/help.css` to `sw.js` `PRECACHE_URLS` and the extensionless `/help` to `PRECACHE_HTML` (CF pretty-URL convention), leaving the reload-mode static fetch (anti-stale guard) untouched and introducing no new fetch origins. Bumped `assets/version.js` `APP_VERSION` `1.2.5 → 1.3.0` as the deliberate CACHE_NAME refresh signal (the pre-commit hook skips the auto-bump when sw.js is in the diff — the two-step chore). Created `tests/39-help-precache.test.js`, an fs source-scan that asserts the three assets + `/help` are present AND re-asserts the reload-mode fetch (so it also fails if the anti-stale form is reverted).
- **Task 2 — Real offline navigation (HELP-07), blocking checkpoint, APPROVED 2026-07-07:** Ben verified Help loads fully offline on his installed PWA — rail/cards/search and deep-links work with the network off, no asset 404s, Safari included. One mid-checkpoint fix was required and applied: the "?" popover had no CSS (its classes were never shipped) — fixed in `3b68d87`.
- **Task 3 — D-19 content review + WebKit RTL/dark/soft-type (HELP-04), blocking checkpoint, CLEARED with one pinned residual:** The full D-19 gate pipeline ran against the rendered page and every finding was applied (see Deviations); a Playwright real-WebKit probe of the final page passed 16/16; Ben personally verified Safari + RTL and pre-approved completion. Sapir's own editorial read (D-19 step 5) is pinned for post-phase.

## Task Commits

1. **Task 1: SW precache + CACHE_NAME chore + precache test** — `c737535` (feat)
2. **Task 2: Real offline navigation (HELP-07)** — verification checkpoint, no code; one fix landed: `3b68d87` (fix, popover CSS)
3. **Task 3: D-19 content review + WebKit check (HELP-04)** — verification checkpoint, no code; fixes landed: `9140182` (fix), `541ecf2` (fix), plus content/render additions `4dd8d67` (feat) and `dd2bc51` (feat)

**Plan metadata:** committed with this SUMMARY + the pinned-residual todo (`docs(39-06): complete offline-ship plan`).

## Files Created/Modified

- `sw.js` — three help assets added to PRECACHE_URLS, `/help` added to PRECACHE_HTML; reload-mode anti-stale fetch preserved (Task 1)
- `assets/version.js` — APP_VERSION 1.2.5 → 1.3.0 cache-roll signal (Task 1)
- `tests/39-help-precache.test.js` — static precache + anti-stale regression guard (Task 1, created)
- `assets/help-content-en.js` — D-19 factual/native/DNA fixes + expanded snippets coverage (checkpoint fixes)
- `assets/i18n-en.js` / `assets/i18n-he.js` / `assets/i18n-de.js` / `assets/i18n-cs.js` — locale chrome-string fixes (checkpoint gate batch)

## Decisions Made

- **APP_VERSION = 1.3.0** — v1.3's first shipped phase; the semver bump is the CACHE_NAME cache-roll signal for installed PWAs (Ben's phase-close call, matching the plan's proposal).
- **Reporting empty-state (`help.deeplink.readDashboard`) uses each locale's REPORTS word, not the overview/dashboard word** — orchestrator override of the reviewers' suggestion, because the string renders on the Reporting page.
- **Sapir's rendered-page read is DEFERRED post-phase** — Ben's explicit "put a pin on that" (2026-07-08). All wording remains subject to that final D-19 step; captured as a pinned todo.

## Deviations from Plan

The two blocking checkpoints ran exactly as planned; the checkpoint WINDOW surfaced fixes that were applied before sign-off. These are checkpoint-driven fixes, not scope creep.

### Auto-fixed Issues (checkpoint window)

**1. [Rule 1 - Bug] "?" help-entry popover had no CSS**
- **Found during:** Task 2 (real-offline verification)
- **Issue:** The Plan 03 "?" popover referenced classes that were never shipped with styles — the popover rendered unstyled.
- **Fix:** Shipped the missing CSS for the popover classes.
- **Committed in:** `3b68d87` (fix(39-03))

**2. [Rule 1 - Content correctness] D-19 factual/native/terminology gate findings**
- **Found during:** Task 3 (D-19 pipeline on the rendered page)
- **Issue:** Gate A (Opus, factual) — 5 blockers: 2 orphan `{ui:}` tokens quoting labels never rendered in the UI, built-ins list missing Remote+Proxy, text-export described as copy, a trial topic describing a nonexistent in-app trial (+8 minors). Gate B (Sonnet, native-EN per D-20) — 2 blockers: an "Open Add Session" verb and a doubled "choose Choose backup file" (+7 minors). Gate C (Sonnet, App-DNA) — "dashboard" drift vs canonical "Overview". Locale gate (HE/DE/CS chrome) — 6 findings (HE double-להתחיל + dashboard calque; DE comma + redundant tail + Dashboard loanword; CS comma).
- **Fix:** ALL blockers + minors applied. Gate B endorsed `help.search.noMatch` as-is. The Reporting empty-state override (reports word, not overview word) recorded as a decision.
- **Committed in:** `9140182` (fix(39-01) "Choose Add Client"), `541ecf2` (fix(39) full gate batch — help-content-en.js + 4 i18n files)

**3. [Rule 2 - Requested additions] UI-label chips + expanded snippets coverage**
- **Found during:** Task 3 (mid-UAT, Ben-requested)
- **Issue:** `{ui:key}` labels read better as soft chips; snippets help coverage was thin.
- **Fix:** Rendered `{ui:key}` labels as soft `.ui-label` chips; expanded snippets coverage (make-it-yours + topic depth).
- **Committed in:** `4dd8d67` (feat(39-04)), `dd2bc51` (feat(39-01))

---

**Total deviations:** 3 groups (1 bug, 1 content-correctness gate batch, 1 requested addition), all surfaced by the blocking checkpoints and applied before sign-off. No scope creep — all within the help surface this plan gates.
**Impact on plan:** All fixes necessary to clear the HELP-07 and HELP-04 human gates. Full suite 136/136 green after all fixes.

## Pinned Residual

**Sapir's human read of the rendered `help.html` (D-19 step 5) is DEFERRED post-phase** — Ben's explicit decision 2026-07-08 ("put a pin on that"). D-19 steps 1–4 (Gate A factual, Gate B native-EN, Gate C App-DNA, + the HE/DE/CS chrome gate) all ran and every finding was applied; the remaining step is Sapir's own editorial/voice read of exactly what practitioners see. All wording remains subject to it. Captured as `todos/pending/2026-07-08-sapir-help-content-review.md` with the flagged items (help.search.noMatch phrasing, expanded snippets copy, the reports-word override ×4 locales, and the "First Name *" asterisk rendering inside chips).

## Issues Encountered

None beyond the checkpoint-window fixes above (all resolved and committed before sign-off).

## Verification

- `node tests/39-help-precache.test.js` + `node tests/sw-precache-cache-reload.test.js` exit 0; full `npm test` → 136/136 green after all fixes.
- Task 2: Help opens fully offline on Ben's installed PWA (Safari included) — approved.
- Task 3: D-19 gates A/B/C + locale gate all applied; Playwright real-WebKit probe 16/16; Ben verified Safari + RTL and pre-approved.

## Threat Model Compliance

- **T-39-10 (Tampering — stale/poisoned SW cache):** reload-mode static precache preserved (anti-stale, bypasses HTTP cache) + CACHE_NAME rolled via the APP_VERSION 1.3.0 bump so installed PWAs re-precache; guarded by `tests/sw-precache-cache-reload.test.js` + `tests/39-help-precache.test.js` and field-verified offline on real Safari (Task 2). Mitigation present.
- **T-39-11 (DoS — help unavailable offline):** static precache test asserts all four help entries present; the real-offline checkpoint confirmed end-to-end. Mitigation present.
- No new fetch origins, no package-manager installs (T-39-SC n/a).

## Next Phase Readiness

- Phase 39 is complete (6/6 plans). The help center is offline-capable and content-signed-off through the automated + gate pipeline; only Sapir's editorial read is pinned (does not block the phase).
- **Phase 40 (welcome/onboarding):** the welcome "take the tour" / "learn more" CTAs can target the now-shipped, offline help center.
- **Phase 42 (What's-New changelog):** the changelog page lives inside the help center — this precache scope will need the changelog assets added when that phase ships (same two-step version-bump chore).
- **Reminder:** any future help-asset additions must repeat the PRECACHE edit + APP_VERSION bump two-step (the pre-commit hook skips the auto CACHE_NAME bump when sw.js is in the diff).

## Self-Check: PASSED

- Files verified on disk: `sw.js`, `assets/version.js` (APP_VERSION 1.3.0), `tests/39-help-precache.test.js`, `.planning/todos/pending/2026-07-08-sapir-help-content-review.md`
- Commits verified in git log: `c737535` (Task 1), `3b68d87` / `9140182` / `541ecf2` (fixes), `4dd8d67` / `dd2bc51` (additions)

---
*Phase: 39-help-center-entry-point*
*Completed: 2026-07-08*
