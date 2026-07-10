# Phase 43 Plan Verification — Docs-Maintenance Hard Gate (RE-CHECK)

**Re-verified against:** 43-CONTEXT.md (D-01..D-23 + post-discussion OD-1..OD-4), 43-RESEARCH.md
(superseded banner), 43-VALIDATION.md, 43-01..07-PLAN.md (post-hand-edit), assert-rename-postcondition.sh.

**Trigger:** Five of seven plans (43-01, 43-02, 43-05, 43-06, 43-07) were hand-edited after original
approval to apply an adversarial architect review's findings (the B1 isWatched blocker, OD-3, OD-4,
OD-2 ls-remote fix, the assert-rename-postcondition.sh replacement). This is a consistency re-hunt of
those edits, not a fresh review.

## PLANS APPROVED

No blockers, no warnings found. Every focus area in the hand-off was checked explicitly and holds.

---

## Findings by focus area

**1. B1 fix (isWatched two-axis) — CONSISTENT.**
`scripts/lib/role-table.js`'s spec in 43-05 (frontmatter truths + Task 1 action + verify block) and the
two RED tests it must satisfy in 43-01 (`must_haves.truths` OD-1 line + Task 2 action) all state the
same rule: a watched path needs BOTH a shipped-path test (root `*.html`, `assets/**`, `manifest.json`,
`sw.js`) AND a code-extension test (`.js`/`.css`/`.html`), with the two named singletons watched by name
regardless of extension. No surviving extension-only phrasing anywhere. 43-05's verify block asserts
`ignored` on `tests/help-integrity.test.js`, `scripts/docs-gate.js`, `package.json`, `.github/workflows/
deploy.yml`, `.planning/ROADMAP.md` (the path axis) and `trigger` on `manifest.json`/`sw.js` (the named
carve-in) — matching 43-01's RED-test assertions exactly, so the RED test and the GREEN implementation
are the same specification, not two independently-drifted claims.

**2. Docs-Emergency-Skip scope (OD-4) — CONSISTENT.**
Grepped all mentions across all 7 plans (43-01, 43-06, 43-07 are the only plans that mention the key).
Every occurrence says tip-commit-only: 43-01's RED test builds the anti-leak case explicitly (side-branch
commit + `--no-ff` merge + ordinary commit on top → BLOCK + reported inherited-skip); 43-06 reads it with
`git log -1 <range-tip>` and documents why (worktree-merge inheritance); 43-07's CLAUDE.md DoD spec states
it plainly and contrasts it with the two `*-Unaffected:` keys, which correctly keep whole-range scope
("honored from ANY commit in the range" — 43-06 lines 19/59/103, 43-07 line 179). No plan states or
implies range-wide scope for `Docs-Emergency-Skip`.

**3. isWatched two-axis rule — CONSISTENT.**
Confirmed via targeted grep: every "extension-only" mention across 43-01 and 43-05 is framed as the
failure mode being tested against and guarded against, never as the implemented rule. No plan outside
43-01/43-05/43-06 references `isWatched`/`classify` at all, so there is no second, drifted copy of the
rule to check.

**4. Vacuous verify blocks — none found beyond the one already fixed.**
Re-read every `<automated>` block in all 7 plans. The previously-caught vacuous grep
(`Help-Unaffected:.*,.*` matching the trailer-key-listing prose line) is now replaced in 43-07 Task 3
with `grep -E 'Help-Unaffected:' CLAUDE.md | grep -Eq '\.(js|css|html), *[A-Za-z0-9._/-]+\.(js|css|html)'`
— requires two real code-extension paths separated by a comma on an actual `Help-Unaffected:` line, which
the mere trailer-key list (no code extensions, no comma between two `.ext` tokens) cannot satisfy. The
plan's own `<note>` documents this was checked against both a lazy and a correct CLAUDE.md before
shipping. No other verify block in any plan asserts a hard-coded count without in-plan measurement
provenance (43-02's "164"/"17"/"75"/"59" figures are all computed at execute time via `wc -l`/`ls | wc -l`
inside the verify commands or the postcondition script itself, not hard-coded assumptions), and no other
`2>/dev/null || echo` pattern feeding a swallowed-error comparison was found.

**5. assert-rename-postcondition.sh — correct, both directions verified.**
- **Bidirectional:** Direction (i) is a `git grep -lE` for the 5 old tokens scoped to `LIVE_PREFIXES`
  (`^(assets/|tests/|\.planning/(REQUIREMENTS|ROADMAP)\.md)`) — a live-file-missed check. Direction (ii)
  is a `git diff --name-only $GSD_PLAN_BASE_SHA..HEAD -- .planning/phases/ .planning/milestones/` filtered
  to exclude `^\.planning/phases/43-` — a historical-clobber check, correctly implemented as a **content
  diff**, not a token grep (per the script's own comment, this is deliberate: a clobber that happens to
  leave the token string intact would slip past a grep).
- **LIVE_PREFIXES coverage:** `assets/` and `tests/` prefixes cover the 7 tests/ + 8 assets/ live targets;
  `\.planning/(REQUIREMENTS|ROADMAP)\.md` covers the remaining 2 — all 17 live targets named in the
  hand-off are covered by the regex. `.planning/codebase/TESTING.md` (the rename map, which legitimately
  retains old tokens) sits under `.planning/codebase/`, matched by neither `LIVE_PREFIXES` nor the
  `git diff` path patterns — correctly excluded from both directions, as its comment states.
- **Historical carve-out — NOT the regex named in the hand-off, and that is not a bug.** The script does
  not use a hardcoded `^\.planning/(phases/(0|1|2|3[0-9]|4[012])|milestones/)` pattern (no phase-number
  enumeration exists anywhere in the script). Instead it diffs the two real historical roots
  (`.planning/phases/` and `.planning/milestones/`) and excludes only `^\.planning/phases/43-` from the
  result. This is strictly more correct than an enumerated phase-range regex: it has no off-by-one
  surface (it doesn't need to enumerate "0|1|2|3[0-9]|4[012]" and risk missing a phase number), and it
  correctly treats any future phase directory (44+) as historical the moment it exists, since only 43-*
  is carved out. No clobber-through risk found.
- **Fail-closed on unset `GSD_PLAN_BASE_SHA`:** `: "${GSD_PLAN_BASE_SHA:?FAIL: ...}"` at the top, exits
  non-zero before any diff runs. Confirmed.
- **TESTING.md housekeeping checks:** the script also asserts TESTING.md contains the live test count
  (computed live via `ls tests/*.test.js | wc -l`, not hard-coded) and still contains the rename map (old
  tokens present) — both correctly required, matching 43-02 Task 3's `<action>`.

**6. Wave/dependency soundness — CONSISTENT.**
`43-05` frontmatter now reads `depends_on: [43-01, 43-02, 43-03]` (wave 3 = max(w1,w1,w2)+1, correct).
`43-06` now reads `depends_on: [43-01, 43-03, 43-05]` (wave 4 = max(w1,w2,w3)+1, correct). This resolves
the prior check's non-blocking WARNING (undeclared file dependency on 43-01) — both plans now declare it.
No cycles. Wave-2 file disjointness holds: 43-03 touches `assets/help-content-en.js`,
`scripts/gen-help-map.js`, `HELP-MAP.md`; 43-04 touches `assets/help-content-{he,de,cs}.js`,
`tests/help-integrity-locale.test.js`. Zero overlap.

**7. RESEARCH.md superseded banner — respected.**
No plan `@`-includes RESEARCH.md and relies on a superseded claim without an explicit override. 43-01,
43-05, 43-06 all `@`-include RESEARCH.md but every superseded item (role-table watch policy, CI range
baseline, trailer multiplicity, trailer range scope) is explicitly overridden in-plan by OD-1..OD-4 text
that supersedes the included RESEARCH content, matching the banner's own "where they disagree, CONTEXT
wins, plans are the executable contract" rule.

**8. Scope fence — held.**
No plan edits a code comment, a phase/decision ID in source, or `.planning/codebase/CONVENTIONS.md`.
Every plan's action text explicitly states "no phase/decision-ID citations" / "do not edit
CONVENTIONS.md" where relevant (43-01, 43-02, 43-05, 43-06, 43-07 Task 3). D-NN citations appearing in
`must_haves` frontmatter are the required decision-coverage evidence, not a fence violation. The D-22
rename's edit of filename-token strings inside comments (the `Run: node tests/<old>` header lines) is the
approved rename itself, not a hygiene edit — correctly scoped to self-referential filename tokens only,
explicitly excluding any phase/decision-ID citation in the same header ("do NOT touch any phase/plan/
decision-ID citation in those headers").

---

## Prior warnings — status

- **Dependency-declaration warning (prior check, dimension 3):** RESOLVED — 43-05/43-06 now declare
  `43-01` in `depends_on`.
- **Research-resolution warning (prior check, dimension 11):** UNCHANGED, still non-blocking. RESEARCH.md's
  `## Open Questions` heading (if still unmarked) is a documentation-hygiene gap in RESEARCH.md itself; the
  resolutions exist (OD-1/OD-2/43-01's role-table-test choice) and every plan correctly implements them.
  Not re-verified line-by-line in this pass since it does not affect PLAN.md executability — flagged again
  here only for completeness, not as a new finding.

---

## Summary

| Dimension | Result |
|---|---|
| B1 fix (isWatched two-axis) consistency | PASS |
| Docs-Emergency-Skip tip-only scope | PASS |
| Vacuous verify blocks | PASS (none found) |
| assert-rename-postcondition.sh correctness | PASS |
| Wave/dependency soundness | PASS (prior warning resolved) |
| RESEARCH.md superseded-banner compliance | PASS |
| Scope fence (comments/CONVENTIONS.md) | PASS |

**0 blockers, 0 warnings.**

## PLANS APPROVED
