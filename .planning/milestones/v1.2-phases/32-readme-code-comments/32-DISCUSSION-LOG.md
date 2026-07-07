# Phase 32: README + Code Comments - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 32-readme-code-comments
**Areas discussed:** README home, README depth, Task recipes, Code comments, Help-content inventory, Audience reframe, Codebase-map refresh, Vendored libs, Demo staleness

---

## Audience reframe (raised by Ben mid-discussion)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep "non-technical Sapir, multi-machine collab" (PROJECT.md) | Original framing | |
| Ben as sole technically-comfortable owner + AI agents (cloud Claude Code) | Reality changed; Sapir hands-off | ✓ |

**User's choice:** Ben is now the sole hands-on maintainer; a more technical background can be assumed; cloud Claude Code is a feasible primary workflow that didn't exist at project start.
**Notes:** Reframe sharpens (not reverses) the operational-first README choice → adds a "rules an agent must not break" section; README stays in-repo as agent context; multi-machine-collab emphasis dropped; local-serve kept (Web Crypto needs localhost).

---

## README home

| Option | Description | Selected |
|--------|-------------|----------|
| One README, stop shipping it | Rewrite root README as the single maintainer doc + drop `cp README.md` in deploy.yml | ✓ |
| Split: public README + repo-only MAINTAINING.md | Two docs, audience separation | |
| Rewrite in place, keep shipping | One doc, stays publicly fetchable on Cloudflare | |

**User's choice:** One README, stop shipping it.
**Notes:** Ben first deferred and asked for the pros/cons breakdown. After it: the split's audience-separation rationale evaporated with Sapir hands-off; "keep shipping" is just exposure with no upside. Repo assumed private (uncorrected). Removing the `cp README.md` line is the only production-adjacent change in the phase.

---

## README depth

| Option | Description | Selected |
|--------|-------------|----------|
| Operational-first + recipes | Run/deploy/change + current file-map + ~5-7 recipes; link the codebase maps for depth | ✓ |
| Minimal / reference-only | Run/deploy/test + short file list, no cookbook | |
| Architecture-heavy | Full mental model (IIFE chain, migrations, version/integrity) | |

**User's choice:** Operational-first + recipes.
**Notes:** Reinforced by the audience reframe. Findings shaping it: the README ships publicly today (informs README home), and `.planning/codebase/*.md` predated the P31 refactor (so the README carries its own current file-map; maps refreshed as the pre-step).

---

## Code comments (DOCS-02)

| Option | Description | Selected |
|--------|-------------|----------|
| All JS files — end the drag | De-phase + responsibility headers across all modules, comment-only, guarded | |
| Refactored modules + slim parents | Headers on the 3 extracted + settings.js/add-session.js (5 files) | ✓ |
| Refactored modules only | Strictly the 3 extracted files | |

**User's choice:** Refactored modules + slim parents (5 files) — **as a pilot.**
**Notes:** Ben pushed back on the comment topic dragging since ~P29 and argued comment-only changes are low risk. Resolution (sharper than the all-files sweep): keep Phase 32 a tight, reviewable pilot on the 5 files, AND generate a comment-coverage map so a later v1.2 "comments — batch 2" phase applies the proven approach to the next group (no staleness if run before further code change). Clarified the work = two comment-only jobs: de-phase-numbering + responsibility/structure banners. Guardrail: green `npm test` + comments-only diff check.

---

## Help-content inventory (Ben's thread → Yes, with a method)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — planning inventory, extend P26 spine | By-product inventory in `.planning/`, building on Phase 26's workflow spine | ✓ |
| Yes — end-user help-content seed in docs/ | Same, framed as end-user copy outline in docs/ | |
| No — Deferred Ideas only | Keep Phase 32 strictly README + comments | |

**User's choice:** Yes — planning inventory extending the P26 spine. Then a follow-up discussion on *method*.
**Notes:** Method locked (D-13): ~4 persona lenses (struggling novice / trainer / power user / domain expert) + 1 grounded feature-coverage auditor + 1 synthesizer (~6 agents). Output = inventory only (titles + one-line intent, mapped to real features), NOT copy. Grounds in the current live app + P26 spine. **`demo.html` excluded as a source — stale** (Ben's late catch).

---

## Codebase-map refresh (raised by Ben)

| Option | Description | Selected |
|--------|-------------|----------|
| Refresh now, pre-step | Run `/gsd-map-codebase` before planning; clears the stale-map debt | ✓ |
| Skip — researcher reads source | No extra pass; maps stay stale | |
| Refresh later, separate task | Decouple | |

**User's choice:** Refresh now — Ben ran `/gsd-map-codebase` in parallel during the discussion; **completed 2026-06-28** (all 7 maps). The README + comments build on the fresh maps.
**Notes:** The verifier had flagged the 2026-06-22 maps as stale; advice had been to wait until after the P30/P31 churn — now done.

---

## Vendored libs (raised by Ben from the fresh CONCERNS.md)

| Option | Description | Selected |
|--------|-------------|----------|
| Capture now, new phase later | Record understanding + approach in CONTEXT; spin up a phase via `/gsd-phase` later | ✓ |
| Create the new phase now | Add the roadmap phase immediately | |
| Just backlog HARD-02 | Leave in backlog as-is | |

**User's choice:** Capture now, new phase later (after Ben digests it).
**Notes:** Pros/cons delivered: vendoring is constraint-correct (zero-build/offline/no-external-calls), only *fixable* since P30's package.json; recommended approach = pin all three (jspdf/jszip/bidi) as devDeps + `npm run vendor` copy script; reject CDN+SRI. HARD-02 extended to jszip/bidi. Full detail in CONTEXT Deferred.

---

## Demo staleness (raised by Ben)

| Option | Description | Selected |
|--------|-------------|----------|
| — | `demo.html` is fully stale (old UI); needs its own urgent refresh phase; meanwhile never use it as a help/onboarding source | ✓ (directive) |

**User's choice:** Exclude the demo as a help-content source (amends D-13); capture a demo-refresh as a separate URGENT phase.
**Notes:** Not Phase 32. Joins the post-32 v1.2 candidate-phase cluster.

---

## Claude's Discretion

- Exact recipe wording and final count (~6, refinable at plan time).
- Exact artifact filenames/paths for the help inventory and comment-coverage map.
- Persona agent count (~6 total) and per-persona prompts for the inventory.
- README section ordering and headings.

## Deferred Ideas

- **Three post-32 v1.2 candidate phases** (sequence via `/gsd-phase`): (1) Comments — batch 2 (batch-1 = overview/sessions/db); (2) Vendor-dependency pinning (HARD-02 + jszip/bidi); (3) Demo refresh (URGENT).
- **v1.3 "Codebase Health II"** broader-extraction + test-coverage backlog (distinct from comments batch-2).
- **14 phase-match todos reviewed, none folded** (all generic keyword hits). The PWA install-guidance + user-manual todo is an *end-user* deliverable, separate from the maintainer README.
