---
phase: 35-demo-system-refresh-version-parity
plan: 04
subsystem: demo
tags: [demo-seed, heart-shield, relative-dates, indexeddb, overview, jsdom]

# Dependency graph
requires:
  - phase: 35-02
    provides: Wave-0 RED gate tests/35-demo-seed.test.js (DEMO-05/06/07 seam + arc + schema contract)
provides:
  - "Relative-date seam in demo-seed.js (isoDaysAgo + applyRelativeDates) exposed via window.__demoSeedHelpers"
  - "Refreshed demo-seed-data.json: Heart Shield removal arc, other-type client + other session, per-session daysAgo"
affects: [35-06, demo-exposure, version-parity, demo-uat]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Computed-date seed model: seed JSON carries integer daysAgo; demo-seed.js computes absolute dates at load time (self-freshening)"
    - "Pure transform seam exposed on window BEFORE a context-gated early-return so tests can exercise it without side effects"

key-files:
  created: []
  modified:
    - assets/demo-seed.js
    - assets/demo-seed-data.json

key-decisions:
  - "isoDaysAgo anchors at LOCAL NOON before subtracting whole days, so countSessionsThisMonth's local new Date(session.date) never slips across a month edge (Pitfall 5)"
  - "Heart Shield arc authored against overview.js's .some(shieldRemoved===true) badge path — a single removed session flips the client row to the removed (✅) badge (Pitfall 2)"
  - "Newest session (Anita's shield-removed) is daysAgo:0 so >=1 session always lands in the current month regardless of where 'now' falls"
  - "other-type variety delivered via a non-person subject (Maple House, a home/space energy clearing) which is also the only sessionType:other session"
  - "DEMO-05/06/07 requirements NOT marked complete and plan NOT advanced — gated on the D-05 blocking-human clinical sign-off by Ben + Sapir"

patterns-established:
  - "Self-freshening demo data: relative offsets in JSON + load-time computation keeps the demo from ever looking abandoned"
  - "Author seed content to the live render path's actual predicate (.some not .every), proven by the real renderClientRows in jsdom"

requirements-completed: []  # DEMO-05/06/07 drafted + gates GREEN, but withheld pending the D-05 human sign-off

coverage:
  - id: D1
    description: "Relative-date seam: isoDaysAgo(n, now?) (noon-anchored) + applyRelativeDates(sessions, now?) exposed via window.__demoSeedHelpers before the demo-mode early-return; seedData() applies it at load (DEMO-06)"
    requirement: "DEMO-06"
    verification:
      - kind: unit
        ref: "tests/35-demo-seed.test.js#DEMO-06: every session has an integer daysAgo (one === 0) and the seam keeps >=1 session in-month at both month edges"
        status: pass
    human_judgment: false
  - id: D2
    description: "Refreshed seed conforms exactly to db.js v6 schema (key union, sessionType enum, issues[] shape, no legacy fields) with per-session daysAgo and no absolute date; other-type client + other sessionType added (DEMO-07)"
    requirement: "DEMO-07"
    verification:
      - kind: unit
        ref: "tests/35-demo-seed.test.js#DEMO-07: every seed session conforms to the v6 schema"
        status: pass
    human_judgment: false
  - id: D3
    description: "Heart Shield removal arc on Anita C renders the .heart-badge.heart-badge-removed node through the REAL overview.js renderClientRows (DEMO-05)"
    requirement: "DEMO-05"
    verification:
      - kind: unit
        ref: "tests/35-demo-seed.test.js#DEMO-05: the seed tells a Heart-Shield removal arc and renderClientRows emits a .heart-badge.heart-badge-removed"
        status: pass
    human_judgment: false
  - id: D4
    description: "Clinical authenticity of the drafted sample content — emotion names, before→after severity drops, insights/comments, the Heart Shield arc beats, and type variety read as believable real-practice content"
    verification: []
    human_judgment: true
    rationale: "D-05 is a blocking-human checkpoint: the seed CONTENT is a brand/clinical decision that only Ben (product) and Sapir (clinical domain owner) can sign off on, in a real browser. Not automatable."

# Metrics
duration: 12min
completed: 2026-06-30
status: complete
---

# Phase 35 Plan 04: Demo Seed Refresh Summary

**Heart Shield removal arc + self-freshening relative dates + schema-clean v6 seed with an other-type client — the Wave-0 RED gate (tests/35-demo-seed.test.js) now passes 3/3; pending the D-05 blocking clinical sign-off before ship.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-30T13:07:00Z (approx)
- **Completed (drafting):** 2026-06-30T13:19:34Z
- **Tasks:** 2 of 3 (Task 3 is the D-05 blocking-human checkpoint — NOT executed by the agent)
- **Files modified:** 2

## Accomplishments
- **Relative-date seam (DEMO-06):** `isoDaysAgo(n, now?)` (noon-anchored) and `applyRelativeDates(sessions, now?)` (pure, no IndexedDB) added to `demo-seed.js`, exposed as `window.__demoSeedHelpers` BEFORE the `window.name !== 'demo-mode'` early-return; `seedData()` computes each session's date from `daysAgo` at load time so the demo self-freshens.
- **Heart Shield removal arc (DEMO-05 / D-03):** Anita C now owns a 3-session arc — shield detected (active) → in progress (active) → removed (`shieldRemoved:true`). Authored against overview.js's real `.some()` badge predicate, verified to render `.heart-badge.heart-badge-removed` through the live `renderClientRows`.
- **Schema + variety (DEMO-07 / D-04):** every session carries an integer `daysAgo` (newest = 0), the absolute `date` field is dropped, all keys conform to the db.js v6 union, and a new `other`-type client (Maple House, a home/space energy clearing) plus the previously-unshowcased `sessionType:"other"` were added. Client types now adult×3 / child×3 / animal×1 / other×1; session types online×9 / clinic×2 / other×1.
- **Gate flip:** `tests/35-demo-seed.test.js` went 0/3 → 3/3. Full suite 115→116 passing (the one remaining failure, `35-demo-exposure.test.js`, belongs to plan 35-06 and was already RED at baseline — out of scope here).

## Task Commits

1. **Task 1: Relative-date seam in demo-seed.js (DEMO-06)** — `9a21980` (feat)
2. **Task 2: Author the refreshed seed dataset (DEMO-05/07, D-03/D-04)** — `01668d2` (feat)
3. **Task 3: Ben + Sapir clinical sign-off (D-05)** — PENDING (blocking-human checkpoint, not agent-executable)

**Plan metadata:** docs commit (this SUMMARY + STATE + ROADMAP)

## Files Created/Modified
- `assets/demo-seed.js` — added the pure relative-date helpers + `window.__demoSeedHelpers` seam before the demo-mode early-return; `seedData()` applies `applyRelativeDates` before the addSession loop.
- `assets/demo-seed-data.json` — 8 clients / 12 sessions: Heart Shield arc on Anita C, new `other`-type Maple House client + `other` session, per-session `daysAgo`, absolute `date` removed, schema-clean; existing client `photoData` base64 preserved verbatim.

## Decisions Made
- **Noon anchor:** `isoDaysAgo` sets local noon before subtracting whole days, so the formatted YYYY-MM-DD never slips a month when `countSessionsThisMonth` re-parses it with local `new Date()` (Pitfall 5).
- **Author to `.some()` not `.every()`:** overview.js:395 computes the client badge via `heartShieldSessions.some(s => s.shieldRemoved === true)` (despite the local var being named `allRemoved`), so a single removed session in the arc flips the client row to the ✅ badge (Pitfall 2).
- **daysAgo:0 anchor:** the flagship (shield-removed) session is "today" so the dashboard's "this month" count is guaranteed ≥1 at every point in the calendar.
- **other-type as a space clearing:** rather than force a person into the `other` bucket, Maple House models a proxy home/space clearing — a clinically common Emotion Code subject — and naturally carries the `sessionType:"other"` session.
- **Requirements withheld:** DEMO-05/06/07 are drafted and their automated gates are GREEN, but they are NOT marked complete and the plan counter was NOT advanced, because the seed content is gated on the D-05 blocking-human clinical sign-off.

## Deviations from Plan
None - plan executed exactly as written. (Rules 1–3 not triggered; the only remaining work is the planned D-05 human checkpoint.)

## Issues Encountered
- `gsd-tools query state.*` write handlers take named flags (`--phase`, `--summary`, `--stopped-at`), not positional args; the dot-form positional calls returned "required" errors until switched to the space subcommand + flag form. State writes then succeeded.

## Pending Sign-Off (D-05 — BLOCKING, never auto-approved)

This plan is **non-autonomous**. The autonomous drafting is complete and committed; the seed is **NOT yet approved to ship**. Task 3 requires both Ben (product) and Sapir (clinical) to review the drafted content in a real browser on Ben's machine. See the checkpoint detail returned to the orchestrator. On approval, the orchestrator/verifier marks DEMO-05/06/07 complete and advances the plan; if revisions are requested, only the sample wording/arc changes (structure + GREEN gates stay intact).

## Next Phase Readiness
- The seed seam and dataset are ready and the automated gates are GREEN.
- **Blocker:** D-05 Ben + Sapir clinical sign-off pending before the seed ships.
- Plan 35-06 (demo exposure) gate `35-demo-exposure.test.js` remains RED by design (its own plan).

---
*Phase: 35-demo-system-refresh-version-parity*
*Completed (drafting): 2026-06-30 — pending D-05 sign-off*
