---
phase: 43-docs-maintenance-hard-gate
plan: 05
subsystem: docs-rot-gate
tags: [role-table, invariants, docs-gate, help-content, changelog]
status: complete
requires:
  - "43-01: tests/docs-gate-role-table.test.js (RED spec this plan turns GREEN)"
  - "43-02: scripts/lib/help-loader.js (shared vm-sandbox loader — input substrate)"
  - "43-03: scripts/gen-help-map.js + HELP-MAP.md (freshness invariant #1 reuses buildMap)"
provides:
  - "scripts/lib/role-table.js: the written user-facing-change definition (isWatched two-axis, denylist, satisfiers, classify)"
  - "scripts/lib/invariants.js: the four D-17 gate checks (checkHelpMapFresh, checkCoversExist, checkChangelogSchema, checkRoleTable), fail-closed (throw on violation)"
  - "renamed integrity tests now call the shared invariants — one implementation, two callers"
affects:
  - "43-06: docs-gate.js requires role-table.js + invariants.js and runs all four invariants FIRST, before the push-range rule (D-17 order)"
  - "43-07: enforce-at-close push depends on the watch set never firing on tests/** or scripts/** (OD-1 path axis)"
tech-stack:
  added: []
  patterns:
    - "two-axis watch predicate (shipped-path AND code-extension) — extension-only is a ship-bricking bug, path axis is load-bearing"
    - "fail-closed invariants: each throws a descriptive Error on violation, quiet on pass — composes as both a gate guard (try/catch) and a test assertion (harness catch)"
    - "one implementation two callers: invariants reuse gen-help-map buildMap + help-loader + role-table; tests call invariants rather than forking logic (D-17)"
    - "additive test wiring (phase-31 test-shape-coupling caution): shared calls ADDED alongside existing inline assertions, none removed"
key-files:
  created:
    - scripts/lib/role-table.js
    - scripts/lib/invariants.js
  modified:
    - tests/help-integrity.test.js
    - tests/changelog-integrity.test.js
decisions:
  - "role-table isWatched requires BOTH a shipped-path test (root *.html | under assets/ | manifest.json/sw.js) AND a code-extension test (.js/.css/.html + the two named singletons). Extension-only would classify all 164 tests/*.js and the gate's own scripts/*.js as triggers and brick Phase 43's own ship."
  - "OD-1 accepted gap written into role-table.js header: image/font/.txt/.json shipped files (incl. assets/demo-seed-data.json) are ignored — a logo swap or new hero illustration ships with NO changelog demand and the gate stays silent by design. Vendor bundles stay watched (they are .js)."
  - "D-06 CSS denylist extension: assets/landing.css + assets/demo.css ADDED to the denylist (page + script + style = one surface). Without this they are watched-and-uncovered under OD-1 and would permanently BLOCK. NOT yet acked by Ben — surfaced below for confirmation."
  - "invariants fail closed by THROWING (not returning {ok,errors}) so the Task 2 verify and the test wiring both surface a violation without needing an explicit .ok check (D-04)."
  - "checkHelpMapFresh reuses gen-help-map buildMap (the canonicalization substrate) and does the read/compare against a repoRoot-relative HELP-MAP.md, so the gate can aim it at a target checkout rather than this module's own repo."
metrics:
  duration: ~18min
  completed: 2026-07-10
  tasks: 3
  files: 4
---

# Phase 43 Plan 05: Shared Role-Table + Invariants Summary

The written GATE-03 "user-facing change" definition now exists as a checkable role
table with self-consistency enforced, and the four D-17 file-on-disk invariants live
in one shared module that both the docs gate (43-06) and `npm test` run — with the
43-01 role-table spec flipped RED → GREEN.

## What Was Built

**Task 1 — `scripts/lib/role-table.js` (`de50aa9`).** The single source of truth for
"what is user-facing." `isWatched(path)` tests two independent axes and requires BOTH:
a shipped-path test (root-level `*.html`, or under `assets/`, or the root singletons
`manifest.json`/`sw.js`) AND a code-extension test (`.js`/`.css`/`.html`, plus the two
singletons by name). Exports `isShipped`, `isCodeExtension`, `isWatched`,
`isDenylisted`, `isSatisfier`, and `classify(path)` → `trigger | satisfier |
denylisted | ignored`. The 21-entry `DENYLIST` covers the 12 legal pages
(impressum/datenschutz/disclaimer ×4), landing/demo, their five scripts, and the two
marketing stylesheets. The module header is the written definition itself — plain
English, no decision-ID citations — and states the OD-1 accepted gap plainly.

**Task 2 — `scripts/lib/invariants.js` (`c553fa9`).** Four fail-closed checks, each
throwing a descriptive Error on violation and returning quietly on success:
`checkHelpMapFresh` (reuses `gen-help-map` `buildMap`, no map logic re-implemented),
`checkCoversExist` (every EN `covers[]` path is a real file), `checkChangelogSchema`
(unique reverse-chronological semver + highlights 2–4 on content entries, origin
tolerated), `checkRoleTable` (role-table self-consistency: nothing both denylisted and
a trigger, no satisfier is a trigger, watch set is exactly the intended types, every
denylist entry is a real shipped file). Assets/repo dir is a parameter defaulting to
the module's own repo root so the gate can point them at a target checkout.

**Task 3 — integrity test wiring (`5d11a9f`).** `tests/help-integrity.test.js` now
calls `checkHelpMapFresh()` + `checkCoversExist()`; `tests/changelog-integrity.test.js`
now calls `checkChangelogSchema()`. Additive only — every pre-existing inline assertion
stays (phase-31 test-shape-coupling caution). This also confirms the previously-RED
`tests/docs-gate-role-table.test.js` is now GREEN (26/26).

## Verification

- Task 1 verify: `classify()` matrix passes; `tests/docs-gate-role-table.test.js` 26/26 GREEN.
- Task 2 verify: all four invariants pass on the live repo.
- Task 3 verify: help-integrity 14/14, changelog-integrity 10/10, role-table 26/26.
- `npm test`: 165 passed, 1 failed (`docs-gate.test.js`) — see Deferred Issues; that
  failure is the pre-existing 43-01 RED spec for `scripts/docs-gate.js`, which 43-06
  builds. It fails RED for the right reason (`scripts/docs-gate.js` is ABSENT) and was
  RED before this plan; nothing here touches it.

## Deviations from Plan

### D-06 CSS denylist extension — NOT yet acked by Ben (needs confirmation)

Per the plan's `<deviations>`, `assets/landing.css` and `assets/demo.css` were ADDED to
the denylist. Rationale: D-06 denylists `landing.html`+`assets/landing.js` and
`demo.html`+`assets/demo.js` under "a page and its script are one surface," but never
names the stylesheets. Under OD-1 WATCH-CODE-ONLY those `.css` files are watched-and-
uncovered and would permanently BLOCK any push that touches marketing CSS. By D-06's own
"one surface" logic they belong on the denylist (page + script + style). This plan
implemented the extension. **Ben has not explicitly acked this.** If he rejects it,
remove those two `DENYLIST` entries (and the two matching lines in the 43-01 spec's
`EXPECT_DENYLISTED` array) and accept that touching landing/demo CSS costs a changelog
trailer.

### OD-1 accepted cost (already agreed, recorded)

Image/font/`.txt`/`.json` shipped files are ignored — a logo swap or new hero
illustration ships with NO changelog demand and the gate stays silent by design.
Written into `role-table.js`'s header, not hidden. Vendor bundles remain watched (`.js`).

No auto-fixed bugs (Rules 1–3): the plan executed as written. No authentication gates.

## Deferred Issues

- `tests/docs-gate.test.js` remains RED — it is the 43-01 behavior spec for
  `scripts/docs-gate.js`, which Plan 43-06 builds. Out of scope for this plan; do not
  "fix" it here. It turns GREEN when 43-06 lands.

## Known Stubs

None. All exports are wired to real logic and pass on the live repo.

## Self-Check: PASSED

- FOUND: scripts/lib/role-table.js
- FOUND: scripts/lib/invariants.js
- FOUND: tests/help-integrity.test.js (modified, invariants wired)
- FOUND: tests/changelog-integrity.test.js (modified, invariants wired)
- FOUND commit de50aa9 (Task 1)
- FOUND commit c553fa9 (Task 2)
- FOUND commit 5d11a9f (Task 3)
