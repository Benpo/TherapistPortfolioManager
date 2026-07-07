---
phase: 38
plan: 05
subsystem: overview
tags: [overview, sort, next-session, overdue-cue, rtl, a11y]
requires:
  - "38-02 (tests/37-overview-sort.test.js RED gate + nextSessionDate field)"
  - "38-03 (i18n keys overview.table.nextSession / .overdue / overview.filter.sort.nextSession)"
  - "38-04 (nextSessionDate wired end-to-end into session records)"
provides:
  - "Sortable Next Session overview column (index.html + demo.html)"
  - "mostRecentSession(sessions) helper (overview.js)"
  - "nextSession sort key (ascending default, blanks-to-bottom both dirs)"
  - "Overdue cue CSS (.next-session-cell.is-overdue / .next-overdue-dot)"
affects:
  - "38-06 (export rendering — reuses nextSessionDate value, not the cue)"
tech-stack:
  added: []
  patterns:
    - "textContent/createTextNode/createElement-only cell render (no innerHTML with data)"
    - "logical margin-inline-end for RTL-safe marker spacing"
    - "early-return blank handling to escape the shared dir*base sort flip"
key-files:
  created: []
  modified:
    - index.html
    - demo.html
    - assets/app.css
    - assets/overview.js
decisions:
  - "Sort derives most-recent via mostRecentSession() (date/createdAt/id desc tiebreak), NOT lastSession's reduce-max — matches the displayed cell (D-01)"
  - "nextSession defaults ascending (soonest-due first), opposite of lastSession descending (D-03)"
  - "Blank next-dates sink to the bottom under BOTH directions via early-return +1/-1 (D-03)"
  - "Overdue = strictly before today-local (window.DateFormat.parseLocal); today is NOT overdue (D-04)"
  - "Overdue cue is dimmed text + amber ● with title/aria-label — not color-only (WCAG 1.4.1)"
metrics:
  duration: ~15min
  completed: 2026-07-07
status: complete
---

# Phase 38 Plan 05: Next Session Overview Column Summary

Added a sortable "Next Session" overview column (index.html + demo.html) rendering the most-recent session's `nextSessionDate` with a subtle accessible overdue cue, plus an ascending/blanks-to-bottom sort branch — NEXT-03, NEXT-04, NEXT-05.

## What Was Built

1. **Column header + sort option (Task 1)** — a `<th class="sortable" data-sort-key="nextSession">` mirroring the Last Session header, inserted between Last Session and Actions in BOTH `index.html` and `demo.html`; a matching `<option value="nextSession">` added to `#clientSortSelect` immediately after the lastSession option in both files. One new CSS rule block in `app.css` (`.next-session-cell.is-overdue` + `.next-overdue-dot`) reusing the shipped `--color-text-muted` / `--color-warning-text` tokens (both confirmed present in light AND dark scopes of `tokens.css` before shipping).

2. **Cell render + overdue cue + colSpan (Task 2)** — a module-level `mostRecentSession(sessions)` helper reproducing the render tiebreak at `:619-626` (date desc → createdAt desc → id desc). The `nextSessionCell` reads `clientSessions[0]?.nextSessionDate` (already most-recent post render-sort), renders the literal dash when empty, and on the overdue path (`parseLocal(next) < today-local`, today NOT overdue) adds `.is-overdue` plus a prepended amber `●` `.next-overdue-dot` carrying `title` + `aria-label` from `overview.table.nextSession.overdue`. Everything built via `textContent`/`createTextNode`/`createElement` — never `innerHTML` with data. Detail-row `colSpan` bumped 5 → 6.

3. **Sort branch (Task 3)** — `nextSession: "ascending"` added to `SORT_DEFAULT_DIR`; a `nextSession` comparator branch placed FIRST so its blank early-returns (`+1`/`-1`) escape the shared `return dir * base` flip and pin blanks to the bottom under both directions. The branch derives each row's next-date via `mostRecentSession(_sessionsByClient.get(id))?.nextSessionDate` (NOT reduce-max, NOT `clientSessions[0]` — the per-client arrays are raw IDB order at sort time). The existing header↔`#clientSortSelect` two-way sync picks up the new key automatically via `SORT_DEFAULT_DIR.hasOwnProperty`; no new sync code needed.

## Verification

- `node tests/37-overview-sort.test.js` — **9/9 GREEN** (was 5/9 RED at baseline; flipped GREEN by implementation, never by editing tests): allSortKeys includes nextSession, ascending default, blanks-to-bottom under both directions, most-recent (not reduce-max) derivation, header↔select sync.
- `node tests/31-overview-render-hardening.test.js` — **2/2 GREEN** (textContent-only invariant intact).
- Full suite: **124 passed / 3 failed**. All 3 failures are pre-existing downstream RED gates, NOT regressions from this plan (see Deferred Issues).

## Deviations from Plan

None — plan executed exactly as written. All three tasks landed in one atomic commit each with no auto-fixes required.

## Deferred Issues (out of scope — downstream Phase 38 RED gates)

The following 3 suite failures are RED gates authored by Plan 38-02 for LATER waves; they are NOT caused by this plan's 4-file change (confirmed: `30-export-markdown` and `30-section-visibility` do not load any file this plan touched; `35-demo-seed` only EVALs overview.js incidentally and its failing assertion targets `assets/demo-seed-data.json`, printing "RED expected at this wave"):

| Test | Failing assertion | Owning plan |
|------|-------------------|-------------|
| `30-export-markdown` | note+date export line (D-09) | 38-06 (export rendering) |
| `30-section-visibility` | nextSession export toggle content-check (D-09) | 38-06 (export rendering) |
| `35-demo-seed` | seed `nextSessionDaysAgo` relative next-appointment model (NEXT-07) | 38-07 (demo seed) |

## Notes

- Both overdue tokens (`--color-text-muted`, `--color-warning-text`) were grep-confirmed in light (tokens.css:101,108) and dark (tokens.css:154,191) before shipping — no new design token invented.
- `sw.js` CACHE_NAME was NOT bumped (it derives from the deploy-stamped INTEGRITY_TOKEN; local static `dev`). No manual bump needed — users auto-update on deploy.

## Self-Check: PASSED

- Commits FOUND: a3cf892, 0966c29, d7ef489
- Artifacts FOUND: index.html th, demo.html th, app.css overdue rule, mostRecentSession helper, SORT_DEFAULT_DIR nextSession ascending
