---
phase: 38-next-session-date-field-with-overview-column
scope: 38-08 gap closure (scoped re-review — NOT a full-phase review)
reviewed: 2026-07-07T00:00:00Z
depth: standard
diff_base: 4000506960380687db30bd09baff5a3512fe63f9
files_reviewed: 2
files_reviewed_list:
  - assets/overview.js
  - tests/37-overview-sort.test.js
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: issues_found
prior_review: full 20-file phase review (commit 9a4a198 scope) fully triaged — WR-01 fixed in 07a649a (annotated b9ecf67), IN-01..IN-03 accepted as-is; that review is preserved in git history and is SUPERSEDED here where it described the old blanks-to-bottom-under-both-directions sort (revised by D-03-R1 / plan 38-08)
---

# Phase 38: Code Review Report (scoped re-review — 38-08 gap closure)

**Reviewed:** 2026-07-07
**Depth:** standard
**Files Reviewed:** 2 (`assets/overview.js`, `tests/37-overview-sort.test.js`)
**Status:** issues_found (Info-only — no Critical, no Warning)

## Summary

Scoped re-review of the 38-08 change (commits a371812, 9606893): the overview `nextSession` sort
branch now substitutes a far-future sentinel (`"9999-12-31"`) for blank next-dates so blanks ride
the shared `dir * base` flip — bottom under ascending (default), top under descending (revised
D-03 / D-03-R1, NEXT-04). This supersedes the prior review's description of the early-return
blanks-to-bottom-under-both-directions rule.

The change was traced adversarially and holds:

- **Sentinel correctness:** `"9999-12-31"` lexicographically sorts after every real `YYYY-MM-DD`
  value the app can store (HTML date inputs cap at year 9999), so `localeCompare` on the sentinel
  yields blanks-last under ascending and blanks-first under descending via the shared
  `dir * base` multiply. Verified by execution — `tests/37-overview-sort.test.js` passes 9/9,
  including both direction cases (7 and 8).
- **Edge cases traced:**
  - Client with **zero sessions**: `mostRecentSession(undefined)` → `null` →
    `null?.nextSessionDate` → `undefined` → sentinel. Collapses into the same blank group as a
    blank most-recent next-date, matching the displayed `-` cell in both cases. Consistent.
  - `nextSessionDate === ""` vs `undefined`: both falsy → sentinel via `||`. Consistent.
  - **Blank-vs-blank tie:** both sentinel → `base = 0` → stable sort preserves prior order —
    the same tie semantics as the `lastSession` branch's empty-string compare. The comparator is
    deterministic (`mostRecentSession` is a pure derivation), so no inconsistent-comparator risk.
  - **Dated ordering under descending:** latest-first confirmed (fixture: Alice 2026-08-01 before
    Bob 2026-07-01).
- **Reduce-max trap still guarded (D-01):** the fixture keeps Carol's older session carrying a
  next-date while her most-recent is blank; test 7 fails if the sort regresses to a reduce-max
  derivation.
- **Test revision is a legitimate D-03 revision, not a weakened test:** the old
  blanks-last-under-both assertion was inverted deliberately per revised D-03/NEXT-04. No other
  test pins the superseded behavior — grepped `tests/`; `38-next-session.test.js` and
  `38-next-overdue.test.js` contain no sort assertions and both pass (6/6, 5/5).
- **Count guard intact:** `EXPECTED_COUNT = 9` matches the 9 executed cases.
- **Cross-file wiring confirmed:** `index.html` carries the `nextSession` dropdown option
  (line 154) and sortable header (lines 178-179); `SORT_DEFAULT_DIR` includes
  `nextSession: "ascending"`.

No incorrect behavior, security surface, or data-loss risk found in the diff. Two Info-level
documentation-staleness items below (IDs continue the phase sequence; IN-01..IN-03 from the prior
full review were accepted as-is and are not restated).

## Info

### IN-04: Stale hardcoded line references to the render tiebreak comparator

**File:** `assets/overview.js:616-617` (also `tests/37-overview-sort.test.js:281`)
**Issue:** The `mostRecentSession()` doc comment says the tiebreak matches "the row render applies
at :619-626", and the test's fixture comment repeats ":619-626". The render-side comparator
actually lives at `assets/overview.js:658-665` today (and drifts further with every edit above
it). A future reader following ":619-626" lands mid-file on unrelated code.
**Fix:** Replace the line-number citations with a stable anchor, e.g. "the same tiebreak
`renderClientRows()` applies in its `clientSessions.sort(...)` (date desc → createdAt desc →
id desc)".

### IN-05: Test docblock still claims RED state for landed features

**File:** `tests/37-overview-sort.test.js:11-13,345,362`
**Issue:** The header docblock says "TDD RED: the sortable-header contract DOES NOT EXIST YET …
It FAILS RED now", and two assertions still say "(RED until Plan 38-05)". All 9 cases are GREEN
against current source (verified by execution). The stale RED framing misdescribes the suite's
current role (regression pin, not RED spec) and could mislead a future session into treating a
real failure as "expected RED".
**Fix:** Update the docblock status to note the suite is now GREEN/regression-pinning (keeping
the historical contract description) and drop the two "(RED until Plan 38-05)" parentheticals.

---

_Reviewed: 2026-07-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard (scoped re-review of the 38-08 diff since 4000506)_
