---
phase: 43-docs-maintenance-hard-gate
verified: 2026-07-10T21:15:00Z
status: human_needed
score: 3/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 2/4
  gaps_closed:
    - "GATE-02: the CI step is the unbypassable, fail-closed enforcement layer (CR-01) — scripts/ci-resolve-docs-range.sh now branches three ways on the exact ls-remote exit code; rc=128 (or any rc not in {0,2}) fails closed instead of silently bootstrapping; proven by tests/ci-resolve-docs-range.test.js (4/4 GREEN)."
    - "GATE-01/GATE-03: satisfier detection is singular (WR-01) — role-table.js now exports anchored isHelpSatisfier/isChangelogSatisfier (^assets/...$); docs-gate.js consumes them, removing its own unanchored regex; proven by the ANCHOR WR-01 case in tests/docs-gate.test.js and 4 new cases in tests/docs-gate-role-table.test.js."
    - "GATE-03: CLAUDE.md's 'exact casing (case-sensitive)' contract is now true (WR-03) — docs-gate.js post-filters trailer values by exact key case (exactCaseTrailerValues); a lowercase docs-emergency-skip is no longer honored; proven by the CASE WR-03 case."
    - "D-14/OD-3: a folded multi-file *-Unaffected trailer parses as one value (WR-04) — both trailer readers now use the unfold format specifier; proven by the FOLD WR-04 case."
    - "GATE-04: the release-moment check has a tripwire (WR-06) — extractAppVersion lifted to scripts/lib/version-parse.js (one implementation, two callers); a fifth invariant checkVersionParse() throws in Phase 1 if the live assets/version.js format ever drifts; proven by tests/docs-gate-version-parse.test.js (7/7 GREEN) and a manual drift-then-revert proof recorded in 43-10-SUMMARY.md."
    - "WR-02 (paired with CR-01): the CI anchor-unresolvable dead-end is now documented — scripts/ci-resolve-docs-range.sh prints a non-destructive recovery runbook to stderr and CLAUDE.md carries the same runbook."
  gaps_remaining: []
  regressions: []
---

# Phase 43: Docs-Maintenance Hard Gate Verification Report

**Phase Goal:** No user-facing change can ship without a changelog entry and updated help topics — enforced by a layered, hard (blocking) gate, validated against v1.3's own release.
**Verified:** 2026-07-10T21:15:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (43-08, 43-09, 43-10)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GATE-01: a user-facing change without a changelog entry/help update blocks loudly (not a warning) | ✓ VERIFIED | `scripts/docs-gate.js` invariants-first then range rule; `tests/docs-gate.test.js` 20/20 GREEN (ran) covering changelog block/pass, help block/pass, uncovered block, all three trailers (exact-case now), multi-file/folded trailer, tip-only emergency skip anti-leak, release moment, fenced-trailer decoy, and the new WR-01/WR-03/WR-04 falsifiers. The previously-verified WR-01 fail-open (unanchored satisfier regex) is closed: `roleTable.isHelpSatisfier`/`isChangelogSatisfier` are anchored `^assets/...$`, consumed directly by `docs-gate.js:209-210` (no second regex). |
| 2 | GATE-02: enforcement is layered — local hook + CI (the unbypassable layer) + GSD DoD gate | ✓ VERIFIED | `.githooks/pre-push` (executable, `core.hooksPath` confirmed `.githooks`), `.github/workflows/deploy.yml` gate step, and `CLAUDE.md`'s DoD section all wired to the same `scripts/docs-gate.js`. **CR-01 is fixed**: the range resolution is lifted into `scripts/ci-resolve-docs-range.sh`, which captures the exact `ls-remote` exit code and branches three ways — rc=0 anchored, rc=2 bootstrap, any other rc (e.g. 128) exits 1 (fail closed). Verified by reading the script and by running `tests/ci-resolve-docs-range.test.js` (4/4 GREEN), including the rc=128 fail-closed case and the unresolvable-anchor recovery-runbook case. `deploy.yml` diff is limited to delegating to this one script. |
| 3 | GATE-03: a written, checkable "user-facing change" definition + a logged escape hatch (no silent `--no-verify`) | ✓ VERIFIED | `scripts/lib/role-table.js` header is the written, two-axis definition; `tests/docs-gate-role-table.test.js` 30/30 GREEN (ran). `Docs-Emergency-Skip:` prints a loud, auditable banner. `--no-verify` bypasses only the local hook per design, documented in CLAUDE.md. **WR-03 is fixed**: trailer keys are now post-filtered by exact case (`exactCaseTrailerValues`), so CLAUDE.md's "exact casing (case-sensitive)" claim is now true in code — confirmed by the CASE WR-03 case (a lowercase `docs-emergency-skip` is BLOCKED, not honored). **New finding (informational, not blocking this SC):** the fresh post-gap-closure code review (`43-REVIEW.md`, `00f4cca`) found that `Docs-Emergency-Skip` does not bypass the Phase-1 invariants (only Phase 2), which is stricter than CLAUDE.md's "bypass the whole gate" wording implies — this narrows/over-promises the escape hatch, it does not weaken the "no shipping without docs" gate. See Anti-Patterns and Human Verification below. |
| 4 | GATE-04: the gate hooks the `APP_VERSION` release moment, validated against v1.3's own ship | ⚠️ PARTIAL — tripwire VERIFIED, live-ship clause UNCERTAIN (human/milestone item) | The release-moment logic (`versionParse.extractAppVersion` at both range endpoints, `versionChanged` gate) is exercised GREEN by `tests/docs-gate.test.js`'s RELEASE cases. **WR-06 is fixed**: `extractAppVersion` now lives in one shared `scripts/lib/version-parse.js`; a fifth invariant `checkVersionParse()` runs in Phase 1 and throws if the live `assets/version.js` format ever stops parsing — proven by `tests/docs-gate-version-parse.test.js` (7/7 GREEN, ran) and a recorded manual drift-then-revert proof in 43-10-SUMMARY.md. **The "validated against v1.3's own ship" clause is still NOT done**: `git ls-remote --heads origin deploy` shows the deploy branch's last real push predates this phase's commits (`gh run list` shows the most recent successful "Deploy to Cloudflare Pages" run was 2026-07-07, chore: bump version to 1.2.5 — before Phase 43 even started); the new CI gate step has never actually executed against a real GitHub Actions run. This is an explicit, open milestone-close item (43-07's and 43-10's own SUMMARYs both flag it as deferred/out of scope for phase-level closure) and cannot be verified by static analysis or local test execution. |

**Score:** 3/4 truths verified, 1 partial-with-open-human-item (tripwire portion of GATE-04 is verified; the live-ship validation clause is not yet performed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/docs-gate.js` | Shared fail-closed gate CLI | ✓ VERIFIED | `node -c` valid; invariants-first then range rule; satisfier detection and trailer readers now delegate to role-table/exact-case logic. |
| `scripts/lib/role-table.js` | Written GATE-03 definition + classify() + anchored satisfier predicates | ✓ VERIFIED | `isHelpSatisfier`/`isChangelogSatisfier` added, anchored `^assets/...$`; 30/30 self-consistency test GREEN (ran). |
| `scripts/lib/invariants.js` | Five D-17/WR-06 shared invariants | ✓ VERIFIED | `checkHelpMapFresh`/`checkCoversExist`/`checkChangelogSchema`/`checkRoleTable`/`checkVersionParse` all pass on live repo (ran via full suite + version-parse test). |
| `scripts/lib/version-parse.js` (new, 43-10) | Single shared `extractAppVersion` | ✓ VERIFIED | `node -c` valid; byte-for-byte semantics of the former local copy; only implementation in the repo (`grep -c 'function extractAppVersion' scripts/docs-gate.js` = 0). |
| `scripts/ci-resolve-docs-range.sh` (new, 43-08) | Shared, fail-closed CI range resolver | ✓ VERIFIED | `sh -n` clean; three-way rc branch confirmed by direct read; tracked by git (`.gitignore` allowlist updated); `tests/ci-resolve-docs-range.test.js` 4/4 GREEN (ran). |
| `.githooks/pre-push` | Fast local preview hook | ✓ VERIFIED | Executable, `core.hooksPath` confirmed `.githooks` in this checkout, delegates to shared gate. |
| `.github/workflows/deploy.yml` gate step | Unbypassable CI layer | ✓ VERIFIED | Step delegates to `scripts/ci-resolve-docs-range.sh` then `node scripts/docs-gate.js --range "$range"`; diff limited to that one step (five other steps byte-identical per 43-08-SUMMARY). CR-01's rc-conflation is closed. |
| `CLAUDE.md` DoD section | GSD definition-of-done contract | ✓ VERIFIED | Section exists with DoD line, role-table.js/HELP-MAP.md pointers, trailer keys (now truthfully "case-sensitive"), multi-file example, tip-only rule, `--no-verify` note, and a new WR-02 recovery-runbook paragraph. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `tests/docs-gate.test.js` | `scripts/docs-gate.js` | `execFileSync` over a throwaway git repo | ✓ WIRED | 20/20 pass (ran). |
| `tests/docs-gate-role-table.test.js` | `scripts/lib/role-table.js` | `require` | ✓ WIRED | 30/30 pass (ran). |
| `tests/docs-gate-version-parse.test.js` | `scripts/lib/version-parse.js` + `scripts/lib/invariants.js` | `require` | ✓ WIRED | 7/7 pass (ran). |
| `tests/ci-resolve-docs-range.test.js` | `scripts/ci-resolve-docs-range.sh` | stubbed-git `spawnSync` | ✓ WIRED | 4/4 pass (ran). |
| `scripts/docs-gate.js` | `scripts/lib/invariants.js` | `require`, invariants run first, now 5 checks | ✓ WIRED | Confirmed via source read; `checkVersionParse()` call present in `runInvariants()`. |
| `scripts/docs-gate.js` | `scripts/lib/role-table.js` | `roleTable.isHelpSatisfier`/`isChangelogSatisfier` | ✓ WIRED | Confirmed via source read (lines 209-210); no local unanchored regex remains. |
| `.githooks/pre-push` | `scripts/docs-gate.js` | shell `node ... --range` | ✓ WIRED | Confirmed by source read. |
| `.github/workflows/deploy.yml` | `scripts/ci-resolve-docs-range.sh` → `scripts/docs-gate.js` | shell pipeline | ✓ WIRED (CR-01 closed) | Range computation now fails closed on any ls-remote fault other than a genuinely-absent branch. |
| `assets/help-content-en.js` covers[] | `HELP-MAP.md` | `gen-help-map.js` | ✓ WIRED | `--check` fresh (part of full suite green). |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite stays green | `node tests/run-all.js` | `168 passed, 0 failed, 168 total` | ✓ PASS |
| Docs-gate behavior spec (D-21 falsifiability, now with WR-01/03/04 falsifiers) | `node tests/docs-gate.test.js` | `20 passed, 0 failed` | ✓ PASS |
| Role-table self-consistency spec (now with anchored-predicate cases) | `node tests/docs-gate-role-table.test.js` | `30 passed, 0 failed` | ✓ PASS |
| Version-parse + fifth-invariant spec (WR-06) | `node tests/docs-gate-version-parse.test.js` | `7 passed, 0 failed` | ✓ PASS |
| CI range-resolver spec (CR-01/WR-02) | `node tests/ci-resolve-docs-range.test.js` | `4 passed, 0 failed` | ✓ PASS |
| Syntax validity of all modified/new gate scripts | `node -c` / `sh -n` on docs-gate.js, role-table.js, version-parse.js, invariants.js, ci-resolve-docs-range.sh | all clean | ✓ PASS |
| No debt markers in phase-modified files | `grep -n -E "TBD\|FIXME\|XXX"` across gate scripts, tests, deploy.yml, CLAUDE.md | no matches | ✓ PASS |
| Local hook installed | `git config core.hooksPath` | `.githooks` | ✓ PASS |
| CR-01 fix present in source (not just claimed) | direct read of `scripts/ci-resolve-docs-range.sh:72-113` | explicit `rc=$?` capture, three-way `if/elif/else` on 0 / 2 / other | ✓ CONFIRMED PRESENT |
| Gate scripts tracked despite `.gitignore` `scripts/*` rule | `git ls-files scripts/ci-resolve-docs-range.sh scripts/lib/version-parse.js ...` | all listed as tracked | ✓ PASS |
| GATE-04 live-ship proof | `gh run list --workflow=deploy.yml --limit 5` | latest successful run is 2026-07-07 (pre-Phase-43); the new gate step has never executed in a real CI run | ✗ NOT YET PERFORMED (expected — see truth 4) |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|-------------|--------|----------|
| GATE-01 | 43-01, 43-03, 43-04, 43-05, 43-06, 43-09 | Blocking gate for missing changelog/help | ✓ SATISFIED | Gate exists, tested GREEN (20/20); the previously-verified anchoring gap (WR-01) is closed. |
| GATE-02 | 43-02, 43-07, 43-08 | Layered enforcement (hook + CI + DoD) | ✓ SATISFIED | CR-01 (the "unbypassable" CI-layer defeater) is closed and proven by a stubbed-git behavior test. |
| GATE-03 | 43-01, 43-03, 43-05, 43-09 | Written, checkable definition + escape hatch | ✓ SATISFIED | role-table.js + self-consistency test; CLAUDE.md's trailer-case contract (WR-03) is now true in code. |
| GATE-04 | 43-01, 43-06, 43-07, 43-10 | Release-moment hook + v1.3 validation | ⚠️ PARTIALLY SATISFIED | Release logic implemented, tripwire-hardened (WR-06), and tested GREEN; the "validated against v1.3's own ship" clause remains an explicit, open milestone-close item requiring a real CI push, not yet performed. |

REQUIREMENTS.md's Phase 43 row (GATE-01..04) is fully accounted for across the ten plans' `requirements:` frontmatter. No orphaned requirements. REQUIREMENTS.md itself marks all four `[x]` complete and lists Phase 43 as "Complete" in its coverage table — this verification's GATE-04 finding means that mark is premature on the live-ship clause specifically (a milestone-close item, not a phase-plan defect).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/docs-gate.js` | 379-394 / 215-226 | `Docs-Emergency-Skip` does not bypass Phase-1 invariants, though CLAUDE.md says it bypasses "the whole gate" (new finding, post gap-closure, `43-REVIEW.md` WR-01) | ⚠️ Warning | Availability trap in a genuine emergency where an invariant is also broken — not a fail-open/security issue; makes the gate MORE strict than documented, not less. Does not defeat the phase's "no shipping without docs" goal. |
| `scripts/docs-gate.js` | 96-98 | Comment claims `*-Unaffected` trailers are uniformly "file-scoped ... harmless" when `Changelog-Unaffected` is actually push-global and can leak from an inherited merge commit (new finding, `43-REVIEW.md` WR-02) | ⚠️ Warning | Documentation-in-code inaccuracy; the actual behavior matches CLAUDE.md's documented contract ("honored from any commit"), so this is a comment fix, not a behavior fix. |
| `scripts/docs-gate.js` | 209-210, 333 | Help/changelog satisfaction is push-global and any-locale — editing any one of the 4 locale satisfier files satisfies the demand for every covered trigger, regardless of which topic/locale is actually relevant (new finding, `43-REVIEW.md` WR-03) | ⚠️ Warning | A real coverage-precision gap, but consistent with the phase's own stated design as a "path-based heuristic" (ROADMAP SC3 wording) rather than content-level verification; not a violation of the "blocks loudly" success criterion. |
| `scripts/docs-gate.js` | 371-377 | `parseArgs` falls back to a default range on a missing/empty `--range` value instead of failing closed (new finding, `43-REVIEW.md` WR-04) | ⚠️ Warning | Latent, unreachable through the two shipped callers today (both use `set -eu` and a pinned non-empty range contract); a defense-in-depth gap, not an active fail-open. |
| — | — | 6 further Info-tier findings in `43-REVIEW.md` (IN-01..IN-06: deploy-file-list/role-table parity note, stale RED-framing comments, duplicated freshness-compare logic, dead hook variable, working-tree-vs-tip divergence note, a vacuous-pass risk in one fixture assertion) | ℹ️ Info | Cosmetic/robustness notes; no functional impact on the phase goal. |

No TBD/FIXME/XXX debt markers found in any phase-modified file. All six previously-identified findings (CR-01, WR-01, WR-02, WR-03, WR-04, WR-06 from the original `43-REVIEW.md`) are independently re-confirmed FIXED — by direct source read AND by running every named behavior test (not merely trusting SUMMARY.md's claims). The four new Warning-tier findings above come from a second, independent code review (`43-REVIEW.md`, commit `00f4cca`, dated after the gap-closure plans) that re-reviewed the current state fresh; none are rated Critical, and this verification's own reading of the affected code confirms the review's characterization of severity (documentation-precision and defense-in-depth gaps, not fail-open defeats of the core blocking mechanism).

### Human Verification Required

### 1. GATE-04 live-ship proof at v1.3.0 milestone close

**Test:** Push v1.3.0's real release commit to `main` and confirm the new CI docs-gate step (`.github/workflows/deploy.yml` → `scripts/ci-resolve-docs-range.sh` → `scripts/docs-gate.js`) runs GREEN against the anchored range, and that a genuine multi-commit push is gated (not tip-only).
**Expected:** The "Docs gate (fail-closed)" CI step passes, echoes a range with commit count > 1 (or a correct rc=2 bootstrap notice if this is genuinely the first run since the resolver shipped), and the deploy proceeds.
**Why human:** Requires an actual GitHub Actions run against the live deploy branch/anchor at the v1.3.0 milestone close — not reproducible by static analysis or local execution. Confirmed via `gh run list`: the most recent successful deploy run (2026-07-07) predates all of Phase 43's commits, so the new gate step has never executed for real. 43-07's and 43-10's own SUMMARYs both record this as an explicitly open milestone-close item.

### 2. Escape-hatch documentation precision (WR-01/WR-02/WR-03 new findings in 43-REVIEW.md)

**Test:** Decide whether CLAUDE.md's "`Docs-Emergency-Skip:` bypasses the whole gate" wording should be corrected to note it does not bypass Phase-1 invariants, whether the in-code comment about `*-Unaffected` trailer scoping should be fixed, and whether help/changelog satisfaction should be narrowed to the EN files only (since EN is the corpus of record for `covers[]` and the release check).
**Expected:** A maintainer decision on whether these are acceptable as documented limitations (in which case CLAUDE.md/comments should be updated to state them honestly) or should be tightened in code.
**Why human:** Judgment call on acceptable design tradeoffs vs. documentation precision; none of the three defeats the phase's core "no shipping without docs" promise, but the written contract in CLAUDE.md should not overclaim.

### Gaps Summary

All items from the previous verification (`gaps_found`, score 2/4) are closed and independently re-verified in this pass — not by reading SUMMARY.md claims, but by reading the actual current source and by running every named behavior test:

- **CR-01** (the sole Blocker): `.github/workflows/deploy.yml`'s range resolution is now lifted into `scripts/ci-resolve-docs-range.sh`, which captures the exact `git ls-remote` exit code and branches three ways (rc=0 anchored / rc=2 bootstrap / any other rc fails closed). Proven by `tests/ci-resolve-docs-range.test.js` (4/4 GREEN), including the rc=128 fail-closed falsifier that is the direct negative-proof of the original defect.
- **WR-01** (unanchored satisfier regex): `role-table.js` now exports `isHelpSatisfier`/`isChangelogSatisfier`, anchored `^assets/...$`; `docs-gate.js` consumes them and keeps no second definition. Proven by a dedicated ANCHOR falsifier in `tests/docs-gate.test.js` and 4 new cases in `tests/docs-gate-role-table.test.js`.
- **WR-02** (undocumented CI-anchor-unresolvable dead end): `scripts/ci-resolve-docs-range.sh` prints a non-destructive recovery runbook to stderr and CLAUDE.md now documents the same recovery path.
- **WR-03** (case-insensitive trailer matching contradicting CLAUDE.md's "case-sensitive" claim): trailer readers now post-filter by exact key case. Proven by the CASE WR-03 falsifier (a lowercase `docs-emergency-skip` is now BLOCKED).
- **WR-04** (folded multi-file trailers mis-blocked): both trailer readers now use git's `unfold` specifier. Proven by the FOLD WR-04 case.
- **WR-06** (release-moment self-disable on version.js drift): `extractAppVersion` is now a single shared implementation in `scripts/lib/version-parse.js`; a fifth invariant `checkVersionParse()` throws in Phase 1 on drift. Proven by `tests/docs-gate-version-parse.test.js` (7/7 GREEN) and a recorded manual drift-then-revert proof.

The full regression suite stands at 168/168 GREEN (up from 166 at the last verification), reflecting the new resolver test, the version-parse test, and the new falsifier cases added to the existing gate/role-table specs, with zero regressions.

One item from the phase's own explicit success criteria remains genuinely open and cannot be closed at phase-verification scope: **GATE-04's "validated against v1.3's own ship" clause**. The tripwire and detection logic are built and tested, but the new CI gate step has not yet run against a real GitHub Actions deploy — the last successful deploy run predates Phase 43's commits entirely. This is not a defect in the phase's implementation; it is a milestone-close activity (a real push through the pipeline) that both 43-07's and 43-10's SUMMARYs already flag as deferred, and this verification concurs it cannot be manufactured by static analysis.

A second, independent code review performed after gap closure (`43-REVIEW.md`, `00f4cca`) found four new Warning-tier and six Info-tier issues while confirming all six original findings fixed. None are rated Critical. This verification's own reading of the affected code agrees with that severity classification: the new findings are documentation-precision gaps (the emergency skip is stricter than documented, not weaker; a code comment is factually wrong but the actual behavior matches the CLAUDE.md contract) and a coverage-precision tradeoff (locale-level rather than topic-level help satisfaction) that is consistent with the phase's own "path-based heuristic" framing in its success criteria. These are captured as human-verification item #2 above for a maintainer decision, not as blocking gaps, since none of them causes the gate to fail open on the core promise: a user-facing change without a changelog entry and help coverage still blocks the push, loudly, in every case this verification exercised.

---

_Verified: 2026-07-10T21:15:00Z_
_Verifier: Claude (gsd-verifier)_
