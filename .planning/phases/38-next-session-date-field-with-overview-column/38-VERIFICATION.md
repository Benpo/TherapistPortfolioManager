---
phase: 38-next-session-date-field-with-overview-column
verified: 2026-07-07T05:48:21Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 8/8 (with 2 open human-verification items)
  gaps_closed:
    - "Blank next-dates now travel WITH the sort direction — bottom under ascending (default), top under descending — mirroring Last Session (revised D-03, closed by plan 38-08)"
  gaps_remaining: []
  regressions: []
---

# Phase 38: Next Session Date Field With Overview Column Verification Report

**Phase Goal:** Add an optional, real date field for the next session — stored on the session record alongside the existing free-text "information for the next session" note — and surface it in the overview table as its own column, mirroring how the last-session date is already shown. (Depends on Phase 37's date engine, native date input, portfolioDateFormat setting, and RTL/locale-aware overview date-column formatter.)
**Verified:** 2026-07-07T05:48:21Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 38-08, closing UAT test 3 / decision revision D-03-R1)

## Context

This is a re-verification following execution of 38-08, a gap-closure plan that resolved a
**decision revision** (not a code defect) discovered during Phase 38 UAT: test 3 found that the
original locked D-03 ("blanks pin to the bottom under both sort directions") felt unintuitive
next to Last Session's toggle — with a single dated row among mostly-blank rows, toggling the
Next Session sort direction never visibly moved that row. Ben revised the decision on 2026-07-07
(D-03-R1): blank next-dates now **travel with** the sort direction (bottom on ascending/default,
top on descending), mirroring Last Session. This report verifies the revised behavior against the
live codebase, not against the superseded plan text, per the decision-revision note.

The prior `38-VERIFICATION.md` (2026-07-06, status `human_needed`, 8/8 truths pre-revision) and
`38-UAT.md` (2026-07-07, 3/4 passed, 1 issue = the D-03 revision) are both superseded by this
report. The two open human-verification items from the prior VERIFICATION.md (overdue-cue visual
check, demo column "reads naturally") were subsequently performed and both **passed** per
`38-UAT.md` tests 1 and 2 (2026-07-07) — they are closed, not re-opened here.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | An optional `nextSessionDate` field exists on the session record, entered via a native `<input type="date">` below the note, wired into save/add/populate/reset (NEXT-01) | ✓ VERIFIED | `add-session.html:341` — `<input class="input" id="nextSessionDate" type="date" />` below `#customerSummary`. Regression-checked: still wired in `add-session.js` save/populate paths (unchanged since prior verification, no diff in this range). |
| 2 | The date input's `min` is dynamically bound to `#sessionDate` (never `min=today`), removed when the session date is empty, re-applied on change (NEXT-02) | ✓ VERIFIED | `assets/add-session.js:1682` `syncNextSessionMin()`; called at :523 (new-session default) and wired to `#sessionDate` `change` at :525; called again at :1711 (populate). Unchanged since prior verification. |
| 3 | A "Next Session" column appears in the overview table in both index.html and demo.html, immediately after Last Session, showing the most-recent session's value formatted via `App.formatDate`, blank renders `-` (NEXT-03) | ✓ VERIFIED | `index.html:178`, `demo.html:167` both have `<th data-sort-key="nextSession">` after Last Session. Cell-render code (`overview.js`) confirmed unchanged by the 38-08 diff (only the sort branch changed). |
| 4 | The column is sortable via a `nextSession` key defaulting ascending, synced with `#clientSortSelect`, with **empty next-dates traveling WITH the sort direction — bottom under ascending (default), top under descending** (revised NEXT-04/D-03-R1) | ✓ VERIFIED | `assets/overview.js:305-317`: early-return blank pins removed; blank next-dates substituted with `BLANK_SENTINEL = "9999-12-31"` before `localeCompare`, riding the shared `dir * base` flip. `node tests/37-overview-sort.test.js` → **9/9 PASS**, executed directly in this session — including the rewritten descending case (`['Carol Clark','Alice Adams','Bob Brown']`, blank Carol at TOP) and the unchanged ascending case (`['Bob Brown','Alice Adams','Carol Clark']`, blank Carol still LAST). |
| 5 | A subtle, accessible overdue cue (dimmed text + amber dot) shows when `nextSessionDate` is strictly before today-local; today is not overdue; empty renders `-` with no cue (NEXT-05) | ✓ VERIFIED | `assets/overview.js:725,727` (`is-overdue` class, `next-overdue-dot`); `assets/app.css:4638-4647`. Unchanged since prior verification (confirmed by grep — not touched in 38-08 diff). Visual cross-theme/RTL confirmation additionally **passed by human** per `38-UAT.md` test 1 (2026-07-07). |
| 6 | The next-session date renders in the PDF/markdown export beside the note, gated by the same nextSession section toggle; date-only sessions still render (NEXT-06) | ✓ VERIFIED | `assets/export-modal.js:286-288,432-434` — both builders gate on `summaryValue.length > 0 \|\| nextDateRaw` (note-OR-date). Confirmed by human retest during UAT (`38-UAT.md` test 4, 2026-07-07): "now it does export" — pass; original complaint attributed to a stale service-worker cache, not a code defect. |
| 7 | Demo + backup parity: demo.html gets the column, seed data carries near-future relative next-dates, backup/restore carries the field automatically with no backup.js change (NEXT-07) | ✓ VERIFIED | `assets/demo-seed.js:42` converts `nextSessionDaysAgo`→`nextSessionDate`; `assets/demo-seed-data.json` seeds 5 values. `git diff --stat 4000506 -- assets/backup.js` → empty (no changes in the gap-closure range or since). Demo column "reads naturally" additionally confirmed by human per `38-UAT.md` test 2 (pass). |
| 8 | Falsifiable behavior tests, authored before implementation, cover the TZ-pinned overdue boundary, **blanks-travel-with-direction sort** (revised), dynamic-min constraint; PDF/markdown golden baselines regenerated deliberately only if truly needed (revised NEXT-08) | ✓ VERIFIED | `tests/37-overview-sort.test.js` test 8 was rewritten RED-first (commit `a371812`, confirmed failing against pre-38-08 code per plan's own verification step) then made GREEN (commit `9606893`). `node tests/38-next-overdue.test.js` unaffected/still green. Full suite: `node tests/run-all.js` → **127 passed, 0 failed, 127 total**, executed directly in this verification session. No `.sha256` fixture touched by 38-08 (git show confirms only `overview.js`/test/docs files changed). |

**Score:** 8/8 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/overview.js` | Reworked `nextSession` sort branch (sentinel, no early-return pins), comment updated | ✓ VERIFIED | Confirmed at lines 305-317; comment documents revised D-03/NEXT-04 rule; sentinel is `"9999-12-31"` |
| `tests/37-overview-sort.test.js` | Test 8 locks blanks-at-top under descending; test 7 (ascending) untouched; 9/9 pass | ✓ VERIFIED | Executed directly — 9 passed, 0 failed |
| `.planning/phases/38-next-session-date-field-with-overview-column/38-CONTEXT.md` | D-03-R1 revision note appended, original D-03 preserved | ✓ VERIFIED | Line 34 — full revision note present, references mechanism + supersession |
| `.planning/REQUIREMENTS.md` | NEXT-04 and NEXT-08 updated to travel-with-direction rule, no stale "bottom regardless of direction" clause | ✓ VERIFIED | NEXT-04 (line 122) and NEXT-08 (line 126) both read "travel WITH the sort direction... revised D-03, 2026-07-07"; negative grep for old "regardless of direction"/"blanks-to-bottom-both" phrasing returns nothing on these lines |
| `assets/backup.js` | UNCHANGED (field rides along automatically) | ✓ VERIFIED | `git diff --stat 4000506 -- assets/backup.js` empty |
| All 10 artifacts verified in the prior (2026-07-06) VERIFICATION.md | Unchanged / still present | ✓ VERIFIED (regression check) | Spot-checked NEXT-01/02/03/05/06/07 artifacts directly in this session (see Observable Truths above) — no drift |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `overview.js` nextSession sort branch | shared `dir * base` flip | `BLANK_SENTINEL` substitution before `localeCompare` | ✓ WIRED | Lines 313-317; no special-casing of direction inside the branch — sentinel rides the same flip lastSession's empty-string compare rides |
| `tests/37-overview-sort.test.js` test 8 | `assets/overview.js` sort branch | direct `applyFiltersAndSort()` invocation against jsdom fixture | ✓ WIRED | Executed — PASS, asserting the exact revised order |
| `38-CONTEXT.md` D-03-R1 | `REQUIREMENTS.md` NEXT-04/NEXT-08 | consistent revision date (2026-07-07) and mechanism description | ✓ WIRED | Cross-checked wording — all three artifacts describe the same sentinel mechanism and travel-with-direction rule, no contradiction |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|-------------|--------|----------|
| NEXT-01 | 38-01, 38-03, 38-04 | Field added, wired into add/edit save payloads | ✓ SATISFIED | Truth 1 (regression-checked, unchanged) |
| NEXT-02 | 38-01, 38-04 | Dynamic `min` bound to session's own date | ✓ SATISFIED | Truth 2 (regression-checked, unchanged) |
| NEXT-03 | 38-02, 38-03, 38-05 | Next Session overview column, both files | ✓ SATISFIED | Truth 3 (regression-checked, unchanged) |
| NEXT-04 | 38-02, 38-03, 38-05, **38-08 (revision)** | Sortable, ascending default, **blanks travel with direction (revised D-03-R1)** | ✓ SATISFIED | Truth 4 — 9/9 tests pass on the revised rule |
| NEXT-05 | 38-01, 38-03, 38-05 | Overdue cue, strictly-before-today | ✓ SATISFIED | Truth 5; visual cross-theme/RTL human-verified pass (38-UAT.md test 1) |
| NEXT-06 | 38-02, 38-06 | Export markdown/PDF renders date, note-OR-date gate | ✓ SATISFIED | Truth 6; human-verified pass (38-UAT.md test 4) |
| NEXT-07 | 38-02, 38-07 | Demo + backup parity | ✓ SATISFIED | Truth 7; "reads naturally" human-verified pass (38-UAT.md test 2) |
| NEXT-08 | 38-01, 38-02, 38-06, **38-08 (revision)** | Falsifiable tests pre-implementation; **revised blank-sort test coverage**; golden baselines discipline | ✓ SATISFIED | Truth 8 — RED-first-confirmed test 8, full suite green |

All 8 REQUIREMENTS.md IDs (NEXT-01..08) are claimed by at least one plan's `requirements`
frontmatter (38-08 additionally claims NEXT-04/NEXT-08 for the revision). REQUIREMENTS.md's own
coverage table marks all 8 "Complete." No orphaned requirements.

### Anti-Patterns Found

None. Grepped `assets/overview.js` and `tests/37-overview-sort.test.js` (the two files touched by
the gap-closure plan) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` — zero matches. No stray
`innerHTML` introduced; the sentinel substitution is a plain string comparison with no new DOM
write.

**Note (non-blocking, Info-level, from `38-REVIEW.md`):** two stale documentation artifacts remain
— `overview.js:616-617`'s `mostRecentSession()` doc comment cites an outdated line-number anchor
(":619-626" for the render tiebreak, which has drifted to :658-665), and
`tests/37-overview-sort.test.js`'s header docblock still says "TDD RED... FAILS RED now" for
features that are now green/regression-pinning. Both are classified Info by the code-reviewer (no
Critical/Warning), do not affect behavior or goal achievement, and do not block phase completion.

### Behavioral Spot-Checks / Test Execution

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| nextSession blank-sort revision (this gap's fix) | `node tests/37-overview-sort.test.js` | 9 passed, 0 failed | ✓ PASS |
| Full regression suite | `node tests/run-all.js` | 127 passed, 0 failed, 127 total | ✓ PASS |
| No debt markers in touched files | `grep -n -E "TBD\|FIXME\|XXX" assets/overview.js tests/37-overview-sort.test.js` | no matches | ✓ PASS |
| `backup.js` untouched by revision | `git diff --stat 4000506 -- assets/backup.js` | empty | ✓ PASS |

All tests executed directly in this verification session (not taken on SUMMARY.md's word).

### Code Review Follow-up (38-REVIEW.md, scoped re-review of the 38-08 diff)

- Scoped re-review of commits `a371812`/`9606893` found 0 Critical, 0 Warning, 2 Info (documentation
  staleness only — see Anti-Patterns above). Sentinel correctness, edge cases (zero-session client,
  `""` vs `undefined`, blank-vs-blank tie, reduce-max trap guard, cross-file wiring) were all traced
  and confirmed correct by the reviewer and independently spot-checked by this agent.
- The prior full-phase review (commit `9a4a198` scope) is preserved in git history; its WR-01
  finding was already fixed (07a649a) and its IN-01..IN-03 items were accepted as non-blocking —
  unaffected by this revision.

## Human Verification Required

None outstanding. The two items open in the prior VERIFICATION.md (overdue-cue visual
LTR/RTL/dark-theme check; demo column "reads naturally") were performed and both **passed** during
UAT (`38-UAT.md`, 2026-07-07, tests 1 and 2). UAT test 3 (the sort-toggle complaint) is the gap
this re-verification closes; UAT test 4 (export date-only) also passed on retest.

## Gaps Summary

No gaps found. The single gap identified by Phase 38 UAT (test 3 — a decision revision of D-03, not
a code defect) was closed by gap-closure plan 38-08: `assets/overview.js`'s `nextSession` sort
branch now substitutes a far-future sentinel for blank next-dates so they travel with the sort
direction (bottom on ascending/default, top on descending), mirroring Last Session. This was
verified directly in this session: the revised test 8 passes (9/9 total), the full 127-file suite
is green, the decision-revision is recorded consistently across `38-CONTEXT.md` (D-03-R1) and
`REQUIREMENTS.md` (NEXT-04, NEXT-08), no stale "blanks pin to the bottom under both directions"
language remains in any source artifact, and a scoped code review found no Critical/Warning issues
(2 Info-level doc-staleness notes, non-blocking). All other NEXT-01..08 truths from the prior
verification were regression-checked and remain intact with no drift. Phase 38 goal is achieved.

---

_Verified: 2026-07-07T05:48:21Z_
_Verifier: Claude (gsd-verifier)_
