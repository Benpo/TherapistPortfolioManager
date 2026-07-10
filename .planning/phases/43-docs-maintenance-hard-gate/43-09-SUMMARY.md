---
phase: 43-docs-maintenance-hard-gate
plan: 09
subsystem: ci-docs-gate
tags: [docs-gate, fail-closed, satisfier-anchoring, trailer-parsing, tdd, gap-closure]
requires: [scripts/lib/role-table.js, scripts/docs-gate.js]
provides: [role-table.isHelpSatisfier, role-table.isChangelogSatisfier]
affects: [scripts/docs-gate.js, scripts/lib/role-table.js, tests/docs-gate.test.js, tests/docs-gate-role-table.test.js]
tech-stack:
  added: []
  patterns: [single-source-of-truth-predicate, exact-case-trailer-post-filter, git-unfold-specifier, red-green-falsifier]
key-files:
  created: []
  modified:
    - scripts/lib/role-table.js
    - scripts/docs-gate.js
    - tests/docs-gate.test.js
    - tests/docs-gate-role-table.test.js
decisions:
  - "role-table.js owns the SINGLE assets/-anchored satisfier definition; the gate consumes isHelpSatisfier/isChangelogSatisfier rather than keeping a second unanchored regex (WR-01/D-17)."
  - "CLAUDE.md's 'exact casing (case-sensitive)' contract is made TRUE in code (post-filter trailers by exact key case) rather than weakening the doc — preserves the security-sensitive emergency-skip exact-match surface (WR-03)."
  - "Both git trailer readers switched from valueonly to emitting Key: value with unfold; git emits the key AS WRITTEN so a lowercase key is dropped by the exact-case post-filter, and a folded multi-line value arrives as one physical line (WR-03 + WR-04 fixed in the same two functions)."
requirements: [GATE-01, GATE-03]
metrics:
  duration: ~12min
  completed: 2026-07-10
status: complete
---

# Phase 43 Plan 09: Anchored Satisfier Detection & Exact-Case, Unfolded Trailer Readers Summary

Closed three verified Warning-tier fail-open / false-diagnosis paths in the docs gate's core matching logic: satisfier detection is now singular and anchored to `assets/` (WR-01), every trailer key is honored only at exact case so CLAUDE.md's "case-sensitive" contract is now true (WR-03), and a correctly-authored folded multi-file `*-Unaffected` trailer waives all its files instead of being mis-blocked as malformed (WR-04) — each pinned by a behavior case that was RED against the pre-fix gate and is GREEN after.

## What Was Built

- **`scripts/lib/role-table.js`** — two new exported predicates, `isHelpSatisfier(p)` and `isChangelogSatisfier(p)`, anchored `^assets/help-content-(en|he|de|cs)\.js$` and `^assets/changelog-content-(en|he|de|cs)\.js$`, derived from the same `assets/`-anchored family as the pre-existing `SATISFIER_RE`. They reuse the existing `normalize()` helper. The pre-existing `isSatisfier` (help OR changelog) and all prior exports are unchanged. These are the single, anchored source of truth the gate now consumes.

- **`scripts/docs-gate.js`** — two fixes:
  - **Satisfier detection (WR-01):** `helpEdited`/`changelogEdited` now call `roleTable.isHelpSatisfier(normalize(p))` / `roleTable.isChangelogSatisfier(normalize(p))`. The two local, `assets/`-UNanchored regexes (`/(^|\/)help-content-…/` and its changelog twin) are removed entirely, so the gate keeps no second definition that could diverge from role-table's.
  - **Trailer readers (WR-03 + WR-04):** `trailerValuesOverRange` and `trailerValueForCommit` switched their `git log` format specifier from `%(trailers:key=<key>,valueonly,only)` to `%(trailers:key=<key>,only,unfold)`. A new shared `exactCaseTrailerValues(out, key)` helper splits each emitted `Key: value` line on the FIRST colon and keeps only lines whose trimmed key EXACTLY equals the requested key (case-sensitive). Because git emits the key as it was written in the commit (verified empirically — a lowercase `docs-emergency-skip:` is emitted lowercase), the exact-case filter drops mis-cased keys; `unfold` collapses a folded continuation-line value to one physical line so `parseUnaffected` receives the whole value. `parseUnaffected` itself is untouched. All three trailer keys (`Docs-Emergency-Skip`, `Help-Unaffected`, `Changelog-Unaffected`) flow through these two readers, so all three become exact-case.

- **`tests/docs-gate-role-table.test.js`** — four new anchoring cases: `isHelpSatisfier` true for `assets/help-content-en.js` / false for a `tests/fixtures/help-content-en.js` decoy; the symmetric changelog pair; all four locales recognized per kind; and cross-kind exclusivity (a help satisfier is not a changelog satisfier and vice-versa). 30 pass (was 26).

- **`tests/docs-gate.test.js`** — three new falsifying behavior cases (ANCHOR WR-01, CASE WR-03, FOLD WR-04), each RED against the pre-fix gate and GREEN after. 20 pass (was 17), all pre-existing cases unchanged.

## How It Was Verified

- **TDD gate compliance (Task 2 RED → Task 3 GREEN):** the three new `docs-gate.test.js` cases were committed as a `test(...)` commit while failing 3/20 against the unmodified gate (exit 1), then turned green by the `fix(...)` commit. Confirmed order: `test` commit `e29f835` precedes `fix` commit `2f9a297`.
- `node tests/docs-gate-role-table.test.js` → 30 passed, 0 failed.
- `node tests/docs-gate.test.js` → 20 passed, 0 failed (17 prior + 3 new falsifiers).
- `node tests/run-all.js` → 167 passed, 0 failed (whole suite, no regression).
- Grep acceptance: no `help-content-(en…` satisfier regex remains in `docs-gate.js`; both readers include `unfold` and neither includes `valueonly`; the gate references `isHelpSatisfier`/`isChangelogSatisfier`.
- Empirical git probe confirmed `%(trailers:key=…,only,unfold)` emits the key as written (lowercase stays lowercase) and collapses a folded value to one line — the two behaviors the WR-03/WR-04 fixes depend on.
- `node -e` one-liner acceptance for the anchored predicates exits 0.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Outcome

All three mitigate-disposition threats from the plan's STRIDE register are closed:
- **T-43-09-01 (Spoofing, high):** satisfier detection anchored to role-table's `^assets/` predicates — a non-assets/ path with a satisfier basename no longer waives the demand (WR-01).
- **T-43-09-02 (Elevation of Privilege, high):** trailers post-filtered by exact key case — a lowercase `docs-emergency-skip` no longer bypasses the gate (WR-03).
- **T-43-09-03 (Tampering, low):** `unfold` added — a correctly-authored folded waiver parses as one value, fail-closed direction preserved (WR-04).

No new security surface introduced. No package-manager installs (node built-ins only).

## Known Stubs

None.

## Notes for the Verifier

- Out of scope (deferred, per 43-08's objective): WR-05, IN-01..IN-05, and the GATE-04 live-ship proof. WR-06 (release-moment invariant) is closed separately in 43-10.
- None of the four modified files classify as `trigger` in role-table (all under `scripts/`/`tests/`, never shipped), so the eventual push needs no changelog/help trailer. The commits carry `Changelog-Unaffected` trailers documenting this.

## Self-Check: PASSED

- scripts/lib/role-table.js — FOUND (isHelpSatisfier/isChangelogSatisfier exported)
- scripts/docs-gate.js — FOUND (predicates consumed, unfold readers)
- tests/docs-gate.test.js — FOUND (3 new cases)
- tests/docs-gate-role-table.test.js — FOUND (4 new cases)
- Commit 9caf3cb (Task 1) — present
- Commit e29f835 (Task 2) — present
- Commit 2f9a297 (Task 3) — present
