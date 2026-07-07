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
  - "Refreshed demo-seed-data.json: Heart Shield removal arc, per-session daysAgo, v6-schema-clean (7 clients / 11 sessions; D-05-signed-off, other-type client removed per Ben — overrides D-04)"
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
  - "D-05 sign-off (Ben): the other-type demo client (Maple House) + its lone other-type session were REMOVED — a brand decision that OVERRIDES D-04 (which had called for an other-type for variety). The sessionType enum still includes 'other'; the seed simply carries no instance of it."
  - "DEMO-05/06/07 marked complete after the D-05 blocking-human sign-off by Ben"

patterns-established:
  - "Self-freshening demo data: relative offsets in JSON + load-time computation keeps the demo from ever looking abandoned"
  - "Author seed content to the live render path's actual predicate (.some not .every), proven by the real renderClientRows in jsdom"

requirements-completed: [DEMO-05, DEMO-06, DEMO-07]  # marked complete after Ben's D-05 sign-off

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
    description: "Refreshed seed conforms exactly to db.js v6 schema (key union, sessionType enum, issues[] shape, no legacy fields) with per-session daysAgo and no absolute date (DEMO-07). Note: the other-type client + other sessionType instance were drafted then REMOVED at the D-05 sign-off (D-04 override) — the schema gate validates enum membership, not the presence of an other-type instance, so it stays GREEN."
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
    description: "Clinical authenticity of the drafted sample content — emotion names, before→after severity drops, insights/comments, the Heart Shield arc beats. SIGNED OFF by Ben at D-05 with one revision (remove the other-type client; overrides D-04)."
    verification:
      - kind: human
        ref: "D-05 blocking-human sign-off — Ben approved 2026-06-30; revision applied in commit be27c2f"
        status: pass
    human_judgment: true
    rationale: "D-05 is a blocking-human checkpoint: the seed CONTENT is a brand/clinical decision only Ben (product) + Sapir (clinical) can sign off on. Ben signed off. Final clinical WORDING (emotion names, before→after, insights) remains Sapir's domain and will be visually re-reviewed during the 35-06 DEMO-10 real-browser regression."

# Metrics
duration: 12min
completed: 2026-06-30
status: complete
---

# Phase 35 Plan 04: Demo Seed Refresh Summary

**Heart Shield removal arc + self-freshening relative dates + schema-clean v6 demo seed — Wave-0 gate (tests/35-demo-seed.test.js) passes 3/3 and Ben signed off at the D-05 blocking-human gate with ONE revision: the other-type client (Maple House) was removed (a brand decision overriding D-04). Seed is now 7 clients / 11 sessions and approved to ship.**

## Performance

- **Duration:** ~12 min drafting + D-05 sign-off revision
- **Started:** 2026-06-30T13:07:00Z (approx)
- **Completed:** 2026-06-30 — D-05 signed off, revision applied (`be27c2f`)
- **Tasks:** 3 of 3 (Task 3 = D-05 blocking-human sign-off — resolved by Ben with one revision)
- **Files modified:** 2

## Accomplishments
- **Relative-date seam (DEMO-06):** `isoDaysAgo(n, now?)` (noon-anchored) and `applyRelativeDates(sessions, now?)` (pure, no IndexedDB) added to `demo-seed.js`, exposed as `window.__demoSeedHelpers` BEFORE the `window.name !== 'demo-mode'` early-return; `seedData()` computes each session's date from `daysAgo` at load time so the demo self-freshens.
- **Heart Shield removal arc (DEMO-05 / D-03):** Anita C now owns a 3-session arc — shield detected (active) → in progress (active) → removed (`shieldRemoved:true`). Authored against overview.js's real `.some()` badge predicate, verified to render `.heart-badge.heart-badge-removed` through the live `renderClientRows`.
- **Schema (DEMO-07):** every session carries an integer `daysAgo` (newest = 0), the absolute `date` field is dropped, and all keys conform to the db.js v6 union.
- **D-05 sign-off + D-04 override:** an `other`-type client (Maple House) plus a lone `sessionType:"other"` session were drafted for variety per D-04, then REMOVED at Ben's D-05 sign-off ("no other is needed, otherwise fine") — a brand decision that overrides D-04. Final seed: **7 clients / 11 sessions** (client types adult×3 / child×3 / animal×1; session types online×9 / clinic×2). The schema gate validates the sessionType *enum membership*, not the presence of an `other` instance, so it stays GREEN with no test change.
- **Gate flip:** `tests/35-demo-seed.test.js` went 0/3 → 3/3 and stays 3/3 after the D-05 removal. Full suite 116 passing / 1 failing (the one failure, `35-demo-exposure.test.js`, belongs to plan 35-06 and is RED by design — out of scope here). No test was edited to force green.

## Task Commits

1. **Task 1: Relative-date seam in demo-seed.js (DEMO-06)** — `9a21980` (feat)
2. **Task 2: Author the refreshed seed dataset (DEMO-05/07, D-03/D-04)** — `01668d2` (feat)
3. **Task 3: Ben D-05 sign-off + revision** — RESOLVED. Ben approved with one revision (remove the other-type client). Applied in `be27c2f` (fix, seed-only, 35 deletions; overrides D-04).

**Plan metadata:** docs commit (this SUMMARY + STATE + ROADMAP + REQUIREMENTS)

## Files Created/Modified
- `assets/demo-seed.js` — added the pure relative-date helpers + `window.__demoSeedHelpers` seam before the demo-mode early-return; `seedData()` applies `applyRelativeDates` before the addSession loop.
- `assets/demo-seed-data.json` — **7 clients / 11 sessions** after the D-05 removal: Heart Shield arc on Anita C, per-session `daysAgo`, absolute `date` removed, schema-clean; existing client `photoData` base64 preserved verbatim. (Drafted at 8/12 with a Maple House `other`-type client + `other` session; both removed in `be27c2f` per Ben's D-05 revision.)

## Decisions Made
- **Noon anchor:** `isoDaysAgo` sets local noon before subtracting whole days, so the formatted YYYY-MM-DD never slips a month when `countSessionsThisMonth` re-parses it with local `new Date()` (Pitfall 5).
- **Author to `.some()` not `.every()`:** overview.js:395 computes the client badge via `heartShieldSessions.some(s => s.shieldRemoved === true)` (despite the local var being named `allRemoved`), so a single removed session in the arc flips the client row to the ✅ badge (Pitfall 2).
- **daysAgo:0 anchor:** the flagship (shield-removed) session is "today" so the dashboard's "this month" count is guaranteed ≥1 at every point in the calendar.
- **D-05 sign-off overrides D-04 (other-type removed):** the seed was drafted with a Maple House `other`-type client (a proxy home/space clearing) + its `sessionType:"other"` session to satisfy D-04's variety ask. At the D-05 gate Ben said "no other is needed, otherwise fine" — a brand decision that OVERRIDES D-04. Both objects were removed (commit `be27c2f`). The sessionType enum still includes `other`; the seed just carries no instance, and the schema gate (enum-membership, not instance-presence) stays GREEN.
- **Requirements completed:** DEMO-05/06/07 marked complete after Ben's D-05 sign-off; the plan is advanced (5 of 6 phase-35 plans done).

## Deviations from Plan
- **[D-05 sign-off revision] Removed the other-type demo client (overrides D-04).** Ben approved the seed at the D-05 blocking-human gate with one revision — remove the Maple House `other`-type client + its lone `other`-type session. This is an owner brand decision that intentionally overrides decision D-04 (which had called for an `other`-type for variety). Applied atomically in `be27c2f` (seed-only, 35 deletions); no test change needed (the schema gate validates enum membership, not instance presence) and no regression (seed gate stayed 3/3, suite 116/1). Everything else in the seed (Heart Shield arc, relative dates, schema conformance) was approved as-is.

## Issues Encountered
- `gsd-tools query state.*` write handlers expect named flags, not positional args, and `state.add-decision` returned a `summary required` error under several flag forms; the D-05 override decision was therefore recorded by a targeted edit to the STATE.md Decisions list (updating the now-stale draft entry) rather than via the SDK append handler.

## Sign-Off (D-05 — RESOLVED)

This plan was **non-autonomous**: the drafting was committed and the seed paused at the D-05 blocking-human gate. **Ben signed off on 2026-06-30** with one revision — remove the `other`-type client (overrides D-04). The revision is applied (`be27c2f`), DEMO-05/06/07 are marked complete, and the plan is advanced. Final clinical WORDING (emotion names, before→after severity, insights) remains Sapir's domain and will be visually re-reviewed during the 35-06 DEMO-10 real-browser regression.

## Next Phase Readiness
- The seed seam and dataset are shipped and the automated gates are GREEN.
- **No blocker:** D-05 signed off. Wave 3 (35-06 demo exposure) is next; its gate `35-demo-exposure.test.js` is RED by design and turns GREEN there.

## Self-Check: PASSED

- Files exist: `assets/demo-seed.js`, `assets/demo-seed-data.json`, `35-04-SUMMARY.md` — all FOUND.
- Commits exist: `9a21980` (seam), `01668d2` (seed), `b440fc6` (docs), `be27c2f` (D-05 revision) — all FOUND.
- Scope clean: the revision commit `be27c2f` touched `assets/demo-seed-data.json` ONLY; tracking commit scoped to `.planning/` files only (no unrelated pre-existing working-tree files — 32-VERIFICATION.md, `.claude/` docs — staged).
- Seed integrity: JSON valid, 7 clients / 11 sessions, no `id:33`/`clientId:33`, no `type:"other"` client or `sessionType:"other"` session; Anita C (id 29) keeps her 3-session Heart-Shield arc.
- Gate: `tests/35-demo-seed.test.js` exits 0 (3/3 GREEN); full suite 116 passed / 1 failed (the 1 = plan 35-06's out-of-scope `35-demo-exposure.test.js`, RED by design); no test edited to force green.

---
*Phase: 35-demo-system-refresh-version-parity*
*Completed: 2026-06-30 — D-05 signed off (other-type client removed, overrides D-04)*
