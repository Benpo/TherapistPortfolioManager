---
created: 2026-06-30T00:00:00.000Z
title: Demo "Sessions This Month" undercounts at month boundaries (UTC date re-parse)
area: bug
priority: medium
files:
  - assets/overview.js
  - assets/demo-seed.js
---

## Problem

Found by the Phase 35 code review (WR-02), advisory/non-blocking. The seed dates are
generated **local** (noon-anchored relative `daysAgo`, `demo-seed.js applyRelativeDates`),
but `overview.js countSessionsThisMonth` (~`overview.js:568`) re-parses each `YYYY-MM-DD`
via `new Date("YYYY-MM-DD")`, which JS interprets as **UTC midnight**.

For a visitor in a **negative-UTC (western-hemisphere) timezone**, at a month boundary a
`daysAgo: 0` ("today", local) session re-parses to UTC midnight of a date that is still the
**previous local month** — so the demo's "Sessions This Month" KPI **undercounts** (can read
0 on the 1st). That quietly undermines **DEMO-06**'s entire point ("≥1 session this month so
the demo never looks abandoned") for US prospective buyers. Berlin/positive-UTC testing
cannot reproduce it (which is why DEMO-10 browser verification didn't catch it).

Compounding: the `demo-seed.js:16-18` comment **claims the noon anchor protects this
`countSessionsThisMonth` re-parse** — it does not. The comment is misleading and should be
corrected (or the fix made real).

## Solution

1. Parse the date **locally** in `countSessionsThisMonth` — e.g. split `YYYY-MM-DD` and build
   `new Date(y, m-1, d)` (local), or compare year/month components directly — so the
   month-membership test matches the local-noon seeding (and real users' local dates).
2. Fix or remove the misleading `demo-seed.js` noon-anchor comment so it matches reality.
3. Add a **falsifiable** test that drives `countSessionsThisMonth` at a month edge from a
   negative-UTC perspective (fixed clock + fixed TZ offset) — RED before, GREEN after. This
   is a real-app correctness fix, not demo-only, so cover the real consumer path.

## Notes

- Touches `overview.js` (core, outside the Phase 35 changed-file set) — that's why it was a
  cross-reference advisory, not a phase blocker.
- Low-to-medium urgency: only manifests for negative-UTC visitors at month boundaries, but it
  is exactly the DEMO-06 promise and the fix is small.
