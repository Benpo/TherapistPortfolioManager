---
phase: 38-next-session-date-field-with-overview-column
scope: 38-09 gap closure (scoped re-review — NOT a full-phase review)
reviewed: 2026-07-07T00:00:00Z
depth: standard
diff_base: 27ae29ff3383d48f2517f13b10eda90f15d7e1fc
files_reviewed: 6
files_reviewed_list:
  - assets/add-session.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
  - tests/38-next-session-partial-guard.test.js
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
carried_forward: "IN-04, IN-05 (Info, from the 38-08 scoped re-review) — still open; their files (assets/overview.js, tests/37-overview-sort.test.js) were untouched by the 38-09 diff"
prior_review: "full 20-file phase review (commit 9a4a198 scope) fully triaged — WR-01 fixed in 07a649a (annotated b9ecf67), IN-01..IN-03 accepted as-is; the 38-08 scoped re-review (preserved in git history, superseded by this file) found IN-04/IN-05 (Info, doc/comment staleness in assets/overview.js and tests/37-overview-sort.test.js), both restated below as still open"
---

# Phase 38: Code Review Report (scoped re-review — 38-09 gap closure)

**Reviewed:** 2026-07-07
**Depth:** standard
**Files Reviewed:** 6 (`assets/add-session.js`, 4× `assets/i18n-*.js`, `tests/38-next-session-partial-guard.test.js`)
**Status:** issues_found (1 Warning, 2 new Info, 2 carried-forward Info — no Critical)

## Summary

Scoped re-review of the 38-09 change (partial next-session date save guard, NEXT-01 / UAT
test 5): a new pure guard `isNextSessionDateIncomplete(el)` in `assets/add-session.js` keyed
strictly on `validity.badInput`, wired into `saveSessionForm()` before the DB write
(toast + `return null` on block), a `toast.nextSessionDateIncomplete` key in all four locales,
and a new unit test suite driving the pure guard against stubbed validity objects.

The diff was traced adversarially:

- **Guard logic is correct and fail-open in the right direction:** `!!(el && el.validity &&
  el.validity.badInput)` blocks ONLY the partial/unparseable state; empty (`badInput=false`,
  `value=""`) and complete dates pass, a missing `#nextSessionDate` element or missing
  `validity` object (jsdom, exotic engines) returns `false` — the optional field can never be
  spuriously locked. Pure over the argument; no DOM mutation.
- **Choke-point claim verified against source:** `saveSessionForm()` is the only session
  persist path on the page (`PortfolioDB.addSession`/`updateSession` both live inside it), and
  it has exactly ONE caller — the form-submit handler at `assets/add-session.js:1237`
  (grep across `assets/` and root HTML). The export flow never saves
  (`assets/export-modal.js:915-916`: reachable only in read mode on a saved session), and
  `snapshotFormState()` (revert-only, no DB write) is correctly left unguarded. One caveat on
  the comment's wording — see IN-06.
- **Guard placement:** after the existing client/date/issues/Heart-Shield validations, directly
  before the `nextSessionDate` read and DB write, mirroring the `heartShieldRequired`
  validate → toast → return-null pattern. The blocked path leaves the form editable with the
  user's partial segments intact.
- **No regression in the save path, verified by execution:** new suite 5/5
  (`tests/38-next-session-partial-guard.test.js`), plus `30-save-redirect` 3/3,
  `38-next-session` 6/6, `38-next-overdue` 5/5 — jsdom's `badInput` is always false, so all
  existing jsdom saves pass through the guard untouched.
- **Test quality:** count guard (`EXPECTED_COUNT = 5`) matches executed cases; test 1 rejects a
  value-only implementation, test 2 rejects a block-on-empty mistake, test 4 pins the fail-open
  null-element contract; harness mirrors the established `buildEnv` idiom and evals the real
  `assets/add-session.js`. One staleness item — see IN-07.
- **i18n:** key present in all 4 locales at parity (executed `25-11-i18n-parity` 23/23 and
  `33-i18n-de-cs-completion` 4/4); terminology consistent with sibling next-session keys
  ("nächsten Sitzung", "příští sezení", "המפגש הבא"). No injection surface —
  `App.showToast` renders via `textContent` (`assets/app.js:841`).
- **No debug artifacts, secrets, or dead code introduced.**

One Warning: the fix's effectiveness rests on an as-yet-unverified real-Safari premise, and the
UAT evidence itself leaves room for the guard being inert in the exact reported scenario
(WR-02). This is already tracked as the plan's human-check; the warning sharpens what that
check must prove before NEXT-01/UAT-5 is closed.

## Warnings

### WR-02: Guard effectiveness rests on an unverified Safari premise — the UAT evidence is also consistent with `badInput=false` at submit time

**File:** `assets/add-session.js:1165-1169` (interaction with `add-session.html:67`)
**Issue:** The guard fires only when `validity.badInput === true` at the moment
`saveSessionForm()` runs. `#sessionForm` (`add-session.html:67`) has NO `novalidate`
attribute, so in a browser that both sets `badInput` and enforces interactive constraint
validation, an invalid date input would block submission BEFORE the submit event — yet the UAT
reproduction saw the SUCCESS toast fire, i.e. the submit event did run. That observation is
consistent with two worlds jsdom/Chromium cannot distinguish (neither can raise `badInput` on a
date input):

1. Safari sets `badInput=true` for the one-segment edit but does not interactively block the
   submit → the new guard fires, toast shows, bug fixed.
2. Safari reports `badInput=false` at submit time (e.g. the partial entry is normalized/cleared
   when focus moves to the Save button) → the guard is inert, the session still silently saves
   `""` with a success toast, and UAT test 5 is NOT actually closed.

The code cannot decide this; only the plan's pending real-Safari field check can
(38-09-SUMMARY explicitly holds NEXT-01 open "awaiting the real-Safari field check").
**Fix:** Before closing NEXT-01/UAT-5, run the tracked human-check with these specific
assertions: (a) a one-segment edit followed by clicking Save is BLOCKED, (b) the block is the
localized toast — not a native validation bubble and not a silent non-submit, (c) the session
record is unchanged in IndexedDB. If (a) fails because `badInput` is false at submit time,
the mechanism needs a fallback (e.g. detect the partially-edited state via the input's
focus/`input`-event lifecycle rather than `validity` alone). No code change required if the
field check passes — annotate the human-check result and close.

## Info

### IN-06: New guard comment repeats a nonexistent "save-then-export trigger" second caller

**File:** `assets/add-session.js:1156-1157` (same stale claim pre-existing at :1179, from Phase 34)
**Issue:** The new choke-point comment asserts "BOTH the submit handler and the save-then-export
trigger route through saveSessionForm". There is no save-then-export trigger in the codebase:
`saveSessionForm` has exactly one caller (the submit listener, :1237), and the export flow is
reachable only in read mode on an already-saved session (`assets/export-modal.js:915-916`).
The claim was copied forward from the Phase-34-era comment at :1179. A future reader auditing
save entry points will hunt for a caller that does not exist — or worse, assume the export path
performs a save.
**Fix:** Reword both comments to the verifiable fact: "the submit handler is the SOLE caller of
saveSessionForm (export is read-mode-only and never saves), so this one placement guards every
user-triggerable save."

### IN-07: New test docblock hard-codes stale RED framing for a landed guard

**File:** `tests/38-next-session-partial-guard.test.js:4,29-34,45,135`
**Issue:** The header says "Authored BEFORE the guard lands — RED-BY-DESIGN", has a "WHY IT IS
RED TODAY" section, and the run comment plus the first assertion message both say "(RED until
Plan 38-09 Step B lands)". The guard has landed; the suite is GREEN 5/5 (verified by
execution). Same failure class as IN-05: the stale RED framing misdescribes the suite's current
role (regression pin, not RED spec) and could lead a future session to treat a real failure as
"expected RED".
**Fix:** Update the docblock to note the suite is now GREEN/regression-pinning (keep the
historical RED-first contract description), change "WHY IT IS RED TODAY" to past tense, and
drop the two "(RED until Plan 38-09 Step B lands)" parentheticals.

## Carried-Forward Open Findings (from the 38-08 scoped re-review)

These two Info findings from the prior review remain open — their files were not touched by the
38-09 diff. Restated compactly so they survive this file replacing the 38-08 report; full text
in git history.

### IN-04: Stale hardcoded line references to the render tiebreak comparator (still open)

**File:** `assets/overview.js:616-617` (also `tests/37-overview-sort.test.js:281`)
**Issue:** `mostRecentSession()` doc comment and the test fixture cite the render comparator at
":619-626"; it actually lives around `assets/overview.js:658-665` and drifts with every edit.
**Fix:** Replace line-number citations with a stable anchor (name the `renderClientRows()`
`clientSessions.sort(...)` tiebreak: date desc → createdAt desc → id desc).

### IN-05: Test docblock still claims RED state for landed features (still open)

**File:** `tests/37-overview-sort.test.js:11-13,345,362`
**Issue:** Header docblock claims "TDD RED … It FAILS RED now" and two assertions say "(RED
until Plan 38-05)"; all 9 cases are GREEN against current source.
**Fix:** Update the docblock to GREEN/regression-pinning status and drop the two RED
parentheticals.

---

_Reviewed: 2026-07-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard (scoped re-review of the 38-09 diff since 27ae29f)_
