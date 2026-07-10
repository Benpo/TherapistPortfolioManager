---
phase: 43
fixed_at: 2026-07-10
review_path: .planning/phases/43-docs-maintenance-hard-gate/43-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 43: Code Review Fix Report

**Fixed at:** 2026-07-10
**Source review:** `.planning/phases/43-docs-maintenance-hard-gate/43-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (4 Warning + 6 Info)
- Fixed: 10
- Skipped: 0
- Full suite: `node tests/run-all.js` → **168 files passed, 0 failed** (run-all counts
  test *files*, each run as its own process; ~15 new cases were added inside existing
  files, so the file total stays 168 while every file still exits green).
- Sanity: `node scripts/docs-gate.js --range HEAD~1..HEAD` → `docs-gate OK`, exit 0
  (crash-free).

Per Ben's explicit direction, several fixes take the behavior-changing option (not the
minimal doc-only alternative the report also offered). Every behavior change is mirrored
by a matching CLAUDE.md contract edit so the "exactly what the gate enforces" claim stays
true.

## Fixed Issues

### WR-01: tip `Docs-Emergency-Skip` must bypass the WHOLE gate (invariants included)

**Decision:** Behavior fix (report option a), not the doc-only option b.
**Files modified:** `scripts/docs-gate.js`, `tests/docs-gate.test.js`, `CLAUDE.md`
**Commit:** `0fd7fce`
**Applied fix:** `main()` now probes the range tip's `Docs-Emergency-Skip` trailer BEFORE
`runInvariants()`; a valid tip skip skips Phase 1 entirely and the range rule prints the
loud banner with an added line stating the structural invariants were also bypassed.
Non-tip skips remain ignored+reported. Added a fail-closed test seam
(`DOCS_GATE_INVARIANTS_ROOT`) that points Phase 1 at a fixture root; the seam blocks if
the override is not a readable directory (never silently reverts to the live repo).
**Test evidence:** New falsifiable pair — a control case (broken invariants root, no tip
skip → BLOCK with an invariant message, proving the override bites) and the subject case
(broken root + tip skip → PASS + banner asserting invariants bypassed). Both green.

### WR-02: `Changelog-Unaffected` is now TIP-ONLY (contract revision, Ben-approved)

**Decision:** Behavior + contract change. `Help-Unaffected` stays any-commit;
`Changelog-Unaffected` moves to tip-only like the emergency skip.
**Files modified:** `scripts/docs-gate.js`, `tests/docs-gate.test.js`, `CLAUDE.md`,
`.planning/phases/43-docs-maintenance-hard-gate/43-CONTEXT.md`
**Commit:** `0e2f52f`
**Applied fix:** `changelogWaived` now reads only the tip commit's trailer; a non-tip
`Changelog-Unaffected` is ignored and reported via a NOTE naming the carrying commit
(mirroring inherited-skip reporting). Corrected the false "file-scoped so harmless"
comment above `trailerValuesOverRange`. CLAUDE.md's three trailer keys now read
Help=any-commit, Changelog=tip-only, Emergency-Skip=tip-only. OD-4 in 43-CONTEXT.md gets
a dated decision-revision note (append-only, history preserved).
**Test evidence:** Tip waiver → PASS; inherited (merged side-branch) waiver → BLOCK on the
changelog demand + reports the ignored inherited waiver naming the source commit. Both
green. Existing single-commit tip `Changelog-Unaffected` test still passes.

### WR-03: satisfiers narrowed to the EN files only (EN is the corpus of record)

**Decision:** Behavior fix (report option a) + honest contract wording (option b).
**Files modified:** `scripts/lib/role-table.js`, `tests/docs-gate-role-table.test.js`,
`tests/docs-gate.test.js`, `CLAUDE.md`
**Commit:** `dcb0763`
**Applied fix:** `HELP_SATISFIER_RE` / `CHANGELOG_SATISFIER_RE` now match only
`assets/help-content-en.js` / `assets/changelog-content-en.js`. Locale files still
classify as `satisfier` (non-triggers) via the unchanged `SATISFIER_RE`, so they never
become "covered trigger" files. CLAUDE.md states satisfaction = an EN help/changelog edit
must accompany the push, and that WHICH topic was edited is trusted, not verified.
**Test evidence:** role-table spec flipped (only EN satisfies; HE/DE/CS do not) + a new
case proving locale files still classify as satisfiers; docs-gate spec adds HE-only-help
→ BLOCK, EN-help → PASS, CS-only-changelog → BLOCK. All green.

### WR-04: `parseArgs` fails closed on missing/empty `--range`; rejects three-dot ranges

**Decision:** Behavior fix, verbatim in spirit, plus the three-dot guard.
**Files modified:** `scripts/docs-gate.js`, `tests/docs-gate.test.js`
**Commit:** `5efa7b4`
**Applied fix:** `--range` with a missing/empty value prints a stderr reason and exits 1;
a `A...B` three-dot range is rejected with a clear message. The `origin/main..HEAD`
default remains only for the no-flag local-dev invocation.
**Test evidence:** `--range ""` → exit 1 with the message; `--range A...B` → exit 1;
no-flag default → PASS on the empty baseline range (`docs-gate OK`). All green.

### IN-01: role-table shipped-path limitation names `_headers`/`_redirects`/`LICENSE`

**Files modified:** `scripts/lib/role-table.js` (doc comment only)
**Commit:** `dcb0763` (landed with WR-03 — same file, same comment region)
**Applied fix:** Extended the accepted-limitation paragraph to name the three
behavior-bearing shipped-but-unwatched config files.

### IN-02: stale "fails RED today" test headers rephrased to past tense

**Files modified:** `tests/docs-gate.test.js`, `tests/docs-gate-role-table.test.js`,
`tests/ci-resolve-docs-range.test.js`, `tests/changelog-integrity-locale.test.js`
**Commit:** `4f3dfff`
**Applied fix:** Headers now read "Authored RED-first before X existed … absence guards
remain as harness self-defense"; the ci-resolver in-suite absent notice reframed as a
regression signal rather than "expected until it ships".

### IN-03: `gen-help-map.js` freshness-invariant comment corrected

**Files modified:** `scripts/gen-help-map.js` (comment only)
**Commit:** `4f3dfff`
**Applied fix:** Comment now says the freshness invariant shares the `buildMap()`
substrate and does its own read + compare rather than calling `checkMap()`. API
unchanged (no refactor).

### IN-04: pre-push unused `remote` dropped; gate stdin redirected from `/dev/null`

**Files modified:** `.githooks/pre-push`
**Commit:** `4f3dfff`
**Applied fix:** Removed `remote="${1:-}"`; added `< /dev/null` to the `node "$gate"`
invocation so a future stdin-reading child cannot swallow the loop's ref lines.

### IN-05: pre-push header notes working-tree-vs-tip divergence

**Files modified:** `.githooks/pre-push`
**Commit:** `4f3dfff`
**Applied fix:** Added a sentence: the gate reads the docs corpus from the working tree,
not the pushed tip — a dirty tree can produce a verdict CI will not reproduce.

### IN-06: CASE WR-03 test can no longer pass vacuously under live-corpus rot

**Files modified:** `tests/docs-gate.test.js`
**Commit:** `4f3dfff`
**Applied fix:** The lowercase-emergency-skip case now also asserts
`!/docs invariant is broken/`, so a Phase 1 invariant failure against the live repo
cannot satisfy it for the wrong reason.

## Deviations from instructions

- **IN-01 committed with WR-03**, not in the Info batch. Both edit the same header comment
  region of `scripts/lib/role-table.js`; committing them together keeps the file's history
  clean and avoids a spurious second touch. Noted in the WR-03 commit body.
- **All 6 Info items → the single behavior/comment batch commit `4f3dfff`** (the prompt
  allowed 1–2). Splitting docs-vs-behavior would have straddled `tests/docs-gate.test.js`
  across two commits (IN-02 header + IN-06 assertion), so one commit was cleaner.
- **Test count stays 168.** run-all.js counts test *files*, not cases; ~15 new cases were
  added inside existing files. No new test files were created (avoids the `.gitignore`
  `scripts/*` allowlist concern and needless surface).

---

_Fixed: 2026-07-10_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
