---
phase: 43-docs-maintenance-hard-gate
reviewed: 2026-07-10T18:10:00Z
depth: standard
files_reviewed: 33
files_reviewed_list:
  - .claude/hooks/pre-commit
  - .githooks/pre-push
  - .github/workflows/deploy.yml
  - .gitignore
  - CLAUDE.md
  - HELP-MAP.md
  - assets/changelog-content-cs.js
  - assets/changelog-content-de.js
  - assets/changelog-content-en.js
  - assets/changelog-content-he.js
  - assets/help-content-cs.js
  - assets/help-content-de.js
  - assets/help-content-en.js
  - assets/help-content-he.js
  - package.json
  - scripts/ci-resolve-docs-range.sh
  - scripts/docs-gate.js
  - scripts/gen-help-map.js
  - scripts/lib/help-loader.js
  - scripts/lib/invariants.js
  - scripts/lib/role-table.js
  - scripts/lib/version-parse.js
  - tests/29-01-crashlog-capture.test.js
  - tests/30-fake-test-detector.test.js
  - tests/40-i18n-parity.test.js
  - tests/changelog-integrity-locale.test.js
  - tests/changelog-integrity.test.js
  - tests/ci-resolve-docs-range.test.js
  - tests/docs-gate-role-table.test.js
  - tests/docs-gate-version-parse.test.js
  - tests/docs-gate.test.js
  - tests/help-integrity-locale.test.js
  - tests/help-integrity.test.js
  - tests/update-integrity-state.test.js
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
prior_findings_closed:
  - CR-01
  - WR-01
  - WR-02
  - WR-03
  - WR-04
  - WR-06
status: issues_found
---

# Phase 43: Code Review Report (Re-Review after Gap Closure 43-08/43-09/43-10)

**Reviewed:** 2026-07-10T18:10:00Z
**Depth:** standard
**Files Reviewed:** 33 (`.claude/hooks/pre-commit` reviewed as an intentional deletion — no dangling references remain)
**Status:** issues_found

## Summary

This re-review verifies the 43-08/43-09/43-10 gap closures and hunts for new defects, with focus on fail-open paths in the enforcement chain (`.githooks/pre-push` → `scripts/docs-gate.js` → `deploy.yml` + `scripts/ci-resolve-docs-range.sh`).

**All six prior findings are verified FIXED in current source, with executed evidence (not just reading):**

| Prior finding | Fix location | Verified by |
|---|---|---|
| CR-01 (CI range fail-open) | `scripts/ci-resolve-docs-range.sh:72-113` — three-way `ls-remote --exit-code` branch; any rc ∉ {0,2} exits 1 | `tests/ci-resolve-docs-range.test.js` — 4/4 pass (ran) |
| WR-01 (unanchored satisfier regex) | `scripts/lib/role-table.js:83-84,124-129` + `scripts/docs-gate.js:209-210` consumes the anchored predicates | role-table spec 30/30 + docs-gate ANCHOR case pass (ran) |
| WR-02 (missing recovery runbook) | `scripts/ci-resolve-docs-range.sh:44-68` runbook to stderr + CLAUDE.md recovery section | resolver test asserts runbook + `Docs-Emergency-Skip` caveat (ran) |
| WR-03 (case-insensitive trailer keys) | `scripts/docs-gate.js:82-94` exact-case post-filter over git's case-insensitive matcher | docs-gate CASE WR-03 case blocks (ran) |
| WR-04 (folded trailers mis-blocked) | `scripts/docs-gate.js:100,106` `unfold` in `%(trailers:…)` format | docs-gate FOLD WR-04 case passes (ran) |
| WR-06 (version-parse self-disable) | `scripts/lib/version-parse.js` shared extractor + fifth invariant `scripts/lib/invariants.js:244-266` | version-parse spec 7/7 pass; all 5 invariants green on live repo (ran) |

Full suites executed during review: `docs-gate.test.js` 20/20, `docs-gate-role-table.test.js` 30/30, `docs-gate-version-parse.test.js` 7/7, `ci-resolve-docs-range.test.js` 4/4, plus the four renamed integrity tests, `30-fake-test-detector`, `40-i18n-parity`, `update-integrity-state`, `29-01-crashlog-capture` — all green. All five invariants pass against the live repo (HELP-MAP.md fresh; every new `covers[]` entry exists on disk; changelog 1.3.0 entry matches `APP_VERSION = '1.3.0'`). Both `.githooks/pre-push` and `scripts/ci-resolve-docs-range.sh` are committed with mode 100755, and the `.gitignore` un-ignore idiom (`scripts/*` + `!scripts/lib/` + explicit files) correctly tracks all seven gate scripts.

I also probed the chain adversarially for new fail-open paths (deleted help/changelog corpus → invariants or covers-index load throws → blocked; deleted HELP-MAP → invariant 1 throws; net-diff reverts; force-push-to-ancestor ranges; three-dot ranges; `__proto__`-named paths; empty `GITHUB_SHA` under the resolver's `set -eu`; `git show` failures on `version.js` at the range base; trailer decoys in fenced blocks; uppercase/lowercase trailer-key variants): every probed path degrades fail-closed or is caught upstream. No Critical findings. Four Warnings remain — three are contract/documentation divergences in the gate's semantics, one is a latent fail-open default in argument parsing.

## Warnings

### WR-01: `Docs-Emergency-Skip` does NOT bypass Phase 1 invariants, contradicting the documented "bypass the whole gate" contract

**File:** `scripts/docs-gate.js:379-394` (main: `runInvariants()` runs before `runRangeRule()`; the tip-skip check lives inside `runRangeRule` at :215-226); contract at `CLAUDE.md` ("`Docs-Emergency-Skip:` — bypass the whole gate")
**Issue:** The emergency-skip trailer is only honored in Phase 2. If any of the five invariants is broken at the pushed tip (stale `HELP-MAP.md`, dangling `covers[]` entry, changelog schema violation, unparseable `version.js`), CI blocks even a push carrying a valid tip `Docs-Emergency-Skip`. That is the exact scenario the skip exists for: prod is down, and the state that broke prod may plausibly be the same bad merge that also broke a docs invariant. The documented emergency mechanism then does not ship, and the operator gets no runbook (the resolver runbook covers only the anchor case). Fail-closed, so not a security hole — but an availability trap that contradicts the written contract ("the rules below are exactly what the gate enforces — nothing more, nothing less").
**Fix:** Either (a) probe `trailerValueForCommit(tip, 'Docs-Emergency-Skip')` in `main()` before `runInvariants()`; on hit, print the banner including a note that invariants were also bypassed, exit 0 — or (b) amend CLAUDE.md's `Docs-Emergency-Skip` bullet to state that the structural invariants are NOT bypassed and describe recovery. Option (a) matches the documented intent of an emergency valve; option (b) is the minimal change.
**Fixed:** `0fd7fce` — option (a): `main()` probes the tip skip before `runInvariants()`; banner adds a "structural invariants also bypassed" line; fail-closed `DOCS_GATE_INVARIANTS_ROOT` test seam makes the bypass falsifiable; CLAUDE.md says "including the structural invariants".

### WR-02: docs-gate comment falsely claims inherited `*-Unaffected` trailers are "file-scoped so … harmless" — `Changelog-Unaffected` is global and inherits the OD-4 leak class

**File:** `scripts/docs-gate.js:96-98` (comment above `trailerValuesOverRange`), behavior at :266-269
**Issue:** The comment justifying honoring `*-Unaffected` trailers from any commit in the range reads "the *-Unaffected trailers are file-scoped so an inherited one is harmless". True for `Help-Unaffected` (per-file, stale declarations warned at :259-263); false for `Changelog-Unaffected`: it is push-GLOBAL — any non-empty value anywhere in the range waives the changelog demand for the whole push. A months-old side branch carrying `Changelog-Unaffected: typo fix`, merged into a multi-commit push containing genuine feature triggers, silently waives the changelog demand for the unrelated feature work — the same inheritance-leak class OD-4 deliberately blocks for `Docs-Emergency-Skip` (tip-only, :215). CLAUDE.md documents "honored from any commit", so behavior matches the written contract, but the in-code rationale is wrong and the leak vector is real and unaudited.
**Fix:** Minimum: correct the comment ("Help-Unaffected is file-scoped and stale-warned; Changelog-Unaffected is global and CAN be inherited from a merge — accepted per CLAUDE.md"). Better: report an inherited non-tip `Changelog-Unaffected` the way inherited skips are reported (a NOTE naming the carrying commit, :229-241), so the waiver's origin is auditable in the CI log.
**Fixed:** `0e2f52f` — Ben-approved contract revision beyond the report: `Changelog-Unaffected` is now TIP-ONLY (a non-tip one is ignored + reported by NOTE); false comment corrected; CLAUDE.md + OD-4 (43-CONTEXT.md) updated with a dated decision-revision note; tip-waives / inherited-blocks falsifiers added.

### WR-03: satisfaction is push-global and any-locale — one character in any of the 8 satisfier files satisfies every help/changelog demand, weaker than the documented contract

**File:** `scripts/docs-gate.js:209-210` (`helpEdited`/`changelogEdited` computed as range-wide booleans), :333 (`if (helpEdited) return;` per covered trigger); contract at `CLAUDE.md` ("every affected **help topic** is updated … the rules below are exactly what the gate enforces — nothing more, nothing less")
**Issue:** The gate demands per-file help coverage but accepts a single edit to ANY of `assets/help-content-{en,he,de,cs}.js` as satisfying the help demand for ALL covered trigger files in the push — including an edit to an unrelated topic, or a whitespace-only edit to the Hebrew file while EN (the corpus `buildCoversIndex` actually reads, :151) is untouched. Same for changelog: a CS-only edit satisfies the demand while `assets/changelog-content-en.js` — the file the block message at :290 tells the author to edit, and the only one the release check (:298) reads — gains nothing. The locale-parity tests that would catch an EN-less locale edit run only under `npm test`; `deploy.yml` has no test step, so the authoritative CI layer never runs them. CLAUDE.md's claim of exact enforcement of "every affected help topic is updated" is an overstatement; the gate enforces "some help file was touched".
**Fix:** (a) Narrow the gate's satisfier checks to the EN files (`assets/help-content-en.js` / `assets/changelog-content-en.js`), since EN is the corpus of record for covers[] and the release check — locale edits alone should not satisfy; and/or (b) soften the CLAUDE.md wording to state the enforced rule honestly ("a help-content edit must accompany the push; WHICH topic was edited is trusted, not verified"). Topic-level verification would require per-topic content diffing — likely out of scope; say so in the doc instead of overclaiming.
**Fixed:** `dcb0763` — both (a) and (b): `isHelpSatisfier`/`isChangelogSatisfier` narrowed to the EN files; locale files still classify as non-triggering satisfiers; CLAUDE.md states the trusted-not-verified EN-only satisfaction rule; HE/CS-only falsifiers added.

### WR-04: `parseArgs` silently falls back to a default range on a missing/empty `--range` value — a latent fail-open in fail-closed code

**File:** `scripts/docs-gate.js:371-377`
**Issue:** `if (argv[i] === '--range' && argv[i + 1])` — when `--range` is passed with a missing or empty value (`--range ""`), the guard is falsy and the gate silently evaluates the default `'origin/main..HEAD'`. In the CI checkout that range is EMPTY (HEAD == origin/main after the push event), so a caller wiring bug producing an empty range argument would make the authoritative gate print `docs-gate OK` and pass with zero files inspected. Today this is unreachable through the shipped callers (`set -eu` plus the resolver's pinned stdout contract guarantee a non-empty range), but this gate is the fail-closed layer of defense — an invocation error inside it must abort, not default. Every other error path in this file fails closed; this one fails open.
**Fix:**
```js
function parseArgs(argv) {
  for (var i = 0; i < argv.length; i++) {
    if (argv[i] === '--range') {
      if (!argv[i + 1]) {
        errln('docs-gate: --range requires a non-empty value (failing closed)');
        process.exit(1);
      }
      return { range: argv[i + 1] };
    }
  }
  return { range: 'origin/main..HEAD' }; // explicit local-dev default only
}
```
While there, consider rejecting a three-dot range (`A...B`): `parseRange` (:67-73) splits on the first `..`, yielding `tip='.B'` and scrambled tip-skip/release semantics. No shipped caller passes one, but the guard is one line.

**Fixed:** `5efa7b4` — applied the report's fix plus the three-dot guard: empty `--range` → exit 1; `A...B` → exit 1; default retained for the no-flag invocation only; empty/three-dot/no-flag tests added.

## Info

### IN-01: `role-table.js` shipped-path definition claims exact parity with the deploy copy list but omits `_headers`, `_redirects`, `LICENSE`

**File:** `scripts/lib/role-table.js:12-15,92-99`; deploy list at `.github/workflows/deploy.yml:44-52`
**Issue:** The header says the SHIPPED-PATH test is "exactly what the deploy step publishes", but deploy.yml also copies `_headers`, `_redirects`, and `LICENSE`. Classification outcomes are unchanged (all three would fail the code-extension axis anyway), but `_redirects`/`_headers` are behavior-bearing shipped config — a redirect-rule or CSP/caching change ships with no docs demand, and the "Accepted limitation" paragraph (:31-37) names only images/fonts/.txt/.json, not these.
**Fix:** Extend the accepted-limitation paragraph to name `_headers`/`_redirects`/`LICENSE` explicitly, or add the two config files as watched-by-name singletons if a changelog demand is wanted for routing/header changes.
**Fixed:** `dcb0763` — accepted-limitation paragraph now names `_headers`/`_redirects`/`LICENSE` (doc comment only; committed with WR-03 as the same file/region).

### IN-02: stale "fails RED today — script absent" framing comments in shipped test files

**File:** `tests/docs-gate.test.js:4-10,17-18`; `tests/ci-resolve-docs-range.test.js:15-18,115-118`; `tests/docs-gate-role-table.test.js:9-10`; `tests/changelog-integrity-locale.test.js:5-9`
**Issue:** Headers still assert present-tense claims that are now false ("It fails RED today (scripts/docs-gate.js is absent …)", "Authored in Wave 0 BEFORE … exist"). The runtime absence guards (`GATE_EXISTS`, the resolver-absent notice) are harmless dead code now, but the prose will misdirect a future reader diagnosing a failure.
**Fix:** Rephrase to past tense ("Authored RED-first before the gate existed; the absence guards remain as harness self-defense").
**Fixed:** `4f3dfff` — all four headers (plus the ci-resolver in-suite notice) rephrased to past tense with the self-defense framing.

### IN-03: `checkHelpMapFresh` re-implements the freshness compare instead of using the exported `checkMap()` it claims to require

**File:** `scripts/lib/invariants.js:57-77`; claim at `scripts/gen-help-map.js:18-19` ("The check path is exported (checkMap) so the freshness invariant requires this one implementation")
**Issue:** The invariant calls `buildMap()` and duplicates the read+`===` compare rather than calling `checkMap()`. The canonicalization substrate (buildMap) IS shared, so drift risk is low, but there are now two compare implementations and the gen-help-map comment describing the design is inaccurate.
**Fix:** Have `checkHelpMapFresh` call `genHelpMap.checkMap()` (needs a repoRoot/mapPath parameter added) and throw on `!res.ok`, or correct the gen-help-map comment.
**Fixed:** `4f3dfff` — comment-only per instruction (no API refactor): gen-help-map.js now says the invariant shares `buildMap()` and does its own compare.

### IN-04: pre-push hook — unused `remote` variable and stdin shared with the loop's `node` child

**File:** `.githooks/pre-push:18,50`
**Issue:** (a) `remote="${1:-}"` is assigned and never used. (b) `node "$gate"` runs inside the `while read` loop and inherits the hook's stdin; nothing in the gate reads stdin today, but if any future git subprocess in the gate did, it would swallow the remaining ref lines and silently skip gating the rest of a multi-ref push.
**Fix:** Drop the unused assignment; add `< /dev/null` to the `node` invocation as cheap insurance.
**Fixed:** `4f3dfff` — dropped `remote="${1:-}"`; added `< /dev/null` to the gate invocation.

### IN-05: local hook evaluates the WORKING TREE corpus and install-root invariants, not the pushed tip

**File:** `scripts/docs-gate.js:150-151,175-188,298` (on-disk reads); `.githooks/pre-push` (preview caller)
**Issue:** Phase 2 reads `assets/` help/changelog content from disk and Phase 1 reads the install's own working tree. In CI, disk == pushed tip, so the authoritative layer is sound. Locally, a dirty working tree or a `git push origin <old-sha>:main` refspec makes the local verdict diverge from the tip being pushed (false block or false pass). The hook header already says "only a preview", but the specific divergence mode (disk-vs-tip) is worth a line so a confusing local verdict is self-explaining.
**Fix:** One sentence in the `.githooks/pre-push` header: "The gate reads the docs corpus from the working tree, not the pushed tip — a dirty tree can produce a verdict CI will not reproduce."
**Fixed:** `4f3dfff` — that sentence added to the pre-push header.

### IN-06: `docs-gate.test.js` fixture cases are coupled to the LIVE repo's invariants; the CASE WR-03 test can pass vacuously under live-corpus rot

**File:** `tests/docs-gate.test.js:499-507`; cause at `scripts/docs-gate.js:175-189` (Phase 1 always targets `DEFAULT_REPO_ROOT`)
**Issue:** The spec spawns the real gate with cwd = fixture repo, but Phase 1 invariants always run against the gate's own install repo. If the live repo's HELP-MAP goes stale mid-development, every fixture case exits 1 with an invariant message: the PASS cases and message-asserting BLOCK cases go red (good, if confusingly), but the CASE WR-03 test asserts only `r.code !== 0` with no message match — it would keep passing for the wrong reason.
**Fix:** In the CASE WR-03 test, additionally assert the block is not an invariant block, e.g. `assert(!/docs invariant is broken/.test(out(r)))`.
**Fixed:** `4f3dfff` — added `assert(!/docs invariant is broken/.test(out(r)))` to the CASE WR-03 test so it can no longer pass vacuously under live-corpus rot.

---

_Reviewed: 2026-07-10T18:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
