---
phase: 43-docs-maintenance-hard-gate
reviewed: 2026-07-10T16:45:37Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - .githooks/pre-push
  - .github/workflows/deploy.yml
  - .gitignore
  - CLAUDE.md
  - HELP-MAP.md
  - package.json
  - assets/changelog-content-cs.js
  - assets/changelog-content-de.js
  - assets/changelog-content-en.js
  - assets/changelog-content-he.js
  - assets/help-content-cs.js
  - assets/help-content-de.js
  - assets/help-content-en.js
  - assets/help-content-he.js
  - scripts/docs-gate.js
  - scripts/gen-help-map.js
  - scripts/lib/help-loader.js
  - scripts/lib/invariants.js
  - scripts/lib/role-table.js
  - tests/29-01-crashlog-capture.test.js
  - tests/30-fake-test-detector.test.js
  - tests/40-i18n-parity.test.js
  - tests/changelog-integrity-locale.test.js
  - tests/changelog-integrity.test.js
  - tests/docs-gate-role-table.test.js
  - tests/docs-gate.test.js
  - tests/help-integrity.test.js
  - tests/help-integrity-locale.test.js
  - tests/update-integrity-state.test.js
findings:
  critical: 1
  warning: 6
  info: 5
  total: 12
status: issues_found
---

# Phase 43: Code Review Report

**Reviewed:** 2026-07-10T16:45:37Z
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

Reviewed the docs-rot hard gate: the shared gate script (`scripts/docs-gate.js`), its
three library modules (role-table, invariants, help-loader), the HELP-MAP generator,
the pre-push hook, the CI enforcement step in deploy.yml, covers[] backfill in the EN
help corpus (verified stripped from he/de/cs), the five renamed integrity tests, and
the enforcement wiring (`.gitignore` carve-out, `prepare` hook, CLAUDE.md contract).

The implementation is unusually well-reasoned — trailers are read with git's
block-scoped `%(trailers:…)` parser (the fenced-decoy case is genuinely blocked),
the both-axes role table demonstrably prevents the self-bricking failure mode, all
17 behavior-spec cases plus 26 role-table cases pass, and `.gitignore`'s
`scripts/*` + `!scripts/lib/` negation was verified to actually track the gate files.

However, the review found one Critical defect that defeats the phase's central
"fail-closed" property in CI, and six Warnings — several of them empirically verified
fail-open or false-block paths (satisfier-regex anchoring, folded-trailer misparsing,
trailer-key case-insensitivity contradicting the CLAUDE.md contract, and a silent
self-disable of the GATE-04 release rule).

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: CI gate ls-remote failure conflation silently collapses the range to tip-only — skipped commits are never re-gated

**File:** `.github/workflows/deploy.yml:36-62`
**Issue:** The step's own comment states the design rule: a failure "cannot tell
'branch absent' from 'branch present but never fetched' — conflating them collapses
the range to the tip commit only and silently drops the rest of the push." The code
fixes this for `git fetch` but reintroduces the exact conflation at `git ls-remote`:

```yaml
if git ls-remote --exit-code --heads origin deploy >/dev/null 2>&1; then
  ...
else
  # treated as "deploy branch genuinely does not exist" → bootstrap
  range="${GITHUB_SHA}^..${GITHUB_SHA}"
fi
```

`git ls-remote --exit-code` exits **2** when the branch is absent but **128** on a
network/auth failure (verified empirically: no-such-branch → rc=2, unreachable
remote → rc=128). Both land in the `else` branch, and `2>&1` discards the error, so
a transient network blip at ls-remote time silently takes the bootstrap fallback and
gates only the tip commit of a multi-commit push. Worse, this is **not**
self-healing: if that run succeeds, the "Push to deploy branch" step writes `Deploy
from ${GITHUB_SHA}`, so the next run anchors at the new tip — the commits between the
old anchor and `${GITHUB_SHA}^` are permanently un-gated. This defeats the phase's
core fail-closed contract via an ordinary infra error.
**Fix:** Distinguish the exit codes; only rc=2 may bootstrap:
```bash
set +e
git ls-remote --exit-code --heads origin deploy >/dev/null 2>&1
rc=$?
set -e
if [ "$rc" -eq 0 ]; then
  ...existing anchored path...
elif [ "$rc" -eq 2 ]; then
  ...existing bootstrap path...
else
  echo "DOCS GATE: ls-remote failed (rc=$rc) — cannot prove the deploy branch is absent; failing closed."
  exit 1
fi
```

## Warnings

### WR-01: helpEdited/changelogEdited satisfier regexes are not anchored to assets/ — any repo path ending in a satisfier filename silently satisfies the demand

**File:** `scripts/docs-gate.js:185-186`
**Issue:** The gate's satisfaction test uses
`/(^|\/)help-content-(en|he|de|cs)\.js$/` (and the changelog twin), while the role
table's `SATISFIER_RE` is anchored `^assets\/…`. Verified: the gate regex matches
`tests/fixtures/help-content-en.js` (which `roleTable.classify` returns `ignored`
for). If a fixture/backup copy of a content file is ever committed and touched in a
push, editing it counts as "the help was edited" and waives the help demand for every
covered trigger in the range — a silent fail-open, and a divergence between the two
modules that role-table's header calls the single source of truth.
**Fix:** Reuse the role table instead of a second regex:
```js
var helpEdited = changed.some(function (p) {
  return /^assets\/help-content-(en|he|de|cs)\.js$/.test(normalize(p));
});
```
(or expose `isSatisfier`-style helpers split by kind from role-table.js and call those).

### WR-02: Docs-Emergency-Skip cannot bypass CI anchor-resolution failures, contradicting the documented contract; recovery path undocumented

**File:** `.github/workflows/deploy.yml:44-52`, `CLAUDE.md:45-53`
**Issue:** CLAUDE.md promises `Docs-Emergency-Skip:` "bypass[es] the whole gate" and
is the sanctioned way "to ship past the gate." But the anchor resolution
(`sed` parse of the deploy subject, `git rev-parse --verify "${token}^{commit}"`)
runs in shell *before* `node scripts/docs-gate.js` is ever invoked. After a history
rewrite of main (the old deploy anchor becomes unreachable and is absent from a fresh
clone) or a mangled deploy-branch subject, every deploy fails closed at line 49-51 —
and the tip-commit skip trailer can never be honored because the gate never runs. The
only recovery is manually deleting the `deploy` branch to trigger the bootstrap path,
which is documented nowhere.
**Fix:** Either (a) check the tip commit for a `Docs-Emergency-Skip` trailer in the
shell step before failing closed on anchor errors (keeping the loud banner), or at
minimum (b) document the recovery runbook (delete/re-point the deploy branch) in the
failure messages and CLAUDE.md so an anchor failure is not a dead end.

### WR-03: Trailer keys match case-insensitively, contradicting CLAUDE.md's "exact casing (case-sensitive)" contract

**File:** `scripts/docs-gate.js:78,85`, `CLAUDE.md:27`
**Issue:** git's `%(trailers:key=…)` matching is case-insensitive. Verified
empirically: a commit carrying lowercase `docs-emergency-skip: reason` IS returned
when queried with `key=Docs-Emergency-Skip` — so a lowercase emergency skip bypasses
the whole gate. CLAUDE.md states the three keys are case-sensitive and that "the
rules below are exactly what the gate enforces — nothing more, nothing less." The
gate enforces *less*: it honors waivers/skips the contract says it would reject.
**Fix:** Either correct CLAUDE.md to state key matching is case-insensitive, or
post-filter returned trailers by exact key casing (git can emit the key with
`%(trailers:key=…,only)` without `valueonly` for verification). Aligning the doc is
the cheaper, honest fix.

### WR-04: Folded (multi-line) trailer values are split on newlines and misparsed — false "malformed" block

**File:** `scripts/docs-gate.js:77-81,110-123`
**Issue:** git allows trailer values to be folded onto continuation lines.
`trailerValuesOverRange` reads `%(trailers:key=…,valueonly,only)` without the
`unfold` option and then splits output on `\n`. Verified empirically: a folded
`Help-Unaffected: assets/a.js,\n  assets/b.js — reason` comes back with an embedded
newline and is parsed as TWO trailer values — `assets/a.js,` (no separator →
malformed → BLOCK with a misleading "missing a reason" message) and
`assets/b.js — reason` (waives only b.js). The failure direction is closed (safe),
but the author did everything the contract asked and gets blocked with a wrong
diagnosis. `git commit` wraps long messages in some editors/tools, so this will be
hit in practice with multi-file trailers, which CLAUDE.md explicitly encourages.
**Fix:** Add `unfold` to both format specifiers:
```js
'--format=%(trailers:key=' + key + ',valueonly,only,unfold)'
```

### WR-05: The gate judges the working tree, not the range tip — pre-push verdicts can diverge from what is actually pushed

**File:** `scripts/docs-gate.js:130-148,175-176,248-250,274`
**Issue:** Triggers are computed from the commit range, but the covers index
(`buildCoversIndex` → reads `assets/` from disk), the release-entry check
(`loadChangelogEN(targetAssets)`), and the Phase-1 invariants all read the checkout's
working tree. In CI the checkout equals the tip, so they agree. In the pre-push hook
they can diverge: uncommitted local edits to help/changelog content, or pushing
`refs/heads/main` while a different branch is checked out, make the gate judge a
corpus that is not the one being pushed — in either direction (false pass: an
uncommitted covers[] addition satisfies coverage for a pushed commit that lacks it;
false block: local WIP breaks an invariant for an unrelated push). The hook is
documented as a non-authoritative preview, which bounds the damage, but this specific
divergence is documented nowhere.
**Fix:** Read the corpus from the range tip (`git show <tip>:assets/help-content-en.js`
piped into the vm loader) instead of disk for Phase 2; or, minimally, document in the
gate header and CLAUDE.md that the local preview evaluates the working tree and can
disagree with CI when the checkout differs from the pushed tip.

### WR-06: GATE-04 release rule silently self-disables if the APP_VERSION literal ever changes shape

**File:** `scripts/docs-gate.js:99-103,248-250`
**Issue:** `versionChanged = oldVer && newVer && oldVer !== newVer` — if
`extractAppVersion` returns null at either endpoint (APP_VERSION renamed, re-quoted
with backticks, moved, or reformatted so the regex
`/APP_VERSION\s*[:=]\s*['"](\d+\.\d+\.\d+)['"]/` no longer matches), the release
check is skipped with no warning, permanently and silently. Nothing anywhere asserts
that the extractor still parses the live `assets/version.js`, so a benign refactor of
version.js turns GATE-04 off for every future release. The regex matches today
(`var APP_VERSION = '1.3.0';`, verified), but this is a fail-open degradation with no
tripwire — the exact rot class this phase exists to prevent.
**Fix:** Add a fifth invariant (or extend `checkRoleTable`) asserting
`extractAppVersion(fs.readFileSync('assets/version.js'))` is non-null, so a format
drift fails closed at the next push instead of silently disabling the release rule.
Export `extractAppVersion` from a lib module so the invariant and the gate share it.

## Info

### IN-01: parseRange mishandles three-dot ranges — tip resolves to a garbage ref, silently degrading skip/version checks

**File:** `scripts/docs-gate.js:66-72`
**Issue:** `parseRange('A...B')` finds the first `..` and yields tip `'.B'`
(verified). The diff/log/trailer-over-range calls still work (git accepts `A...B`),
but `trailerValueForCommit('.B', …)` and the version endpoints silently fail — so a
tip `Docs-Emergency-Skip` would be ignored and GATE-04 disabled for that invocation.
Both current callers pass two-dot ranges only.
**Fix:** Reject or normalize `...` explicitly at the top of `parseRange` (fail closed
with a "two-dot ranges only" message).

### IN-02: Dead variable in the pre-push hook

**File:** `.githooks/pre-push:18`
**Issue:** `remote="${1:-}"` is assigned and never used.
**Fix:** Delete the line (or use it in log output).

### IN-03: Unknown CLI arguments are silently ignored, falling back to a default range

**File:** `scripts/docs-gate.js:347-353`
**Issue:** `parseArgs` only recognizes `--range`; a typo (`--rang X`) silently
evaluates the default `origin/main..HEAD` instead — a different verdict with no
signal. Both wired callers spell it correctly, but the gate is also invoked by hand.
**Fix:** Exit non-zero on unrecognized arguments.

### IN-04: normalize() duplicated across gate modules

**File:** `scripts/docs-gate.js:150-152`, `scripts/lib/role-table.js:81-83`
**Issue:** Identical path-normalization helpers are maintained in two modules; a
future edit to one (e.g., case-folding) silently desynchronizes classification from
the gate's set/index keys.
**Fix:** Export `normalize` from role-table.js and require it in docs-gate.js.

### IN-05: covers[] names a denylisted file — an unreachable reverse-index entry

**File:** `assets/help-content-en.js:500`, `scripts/lib/role-table.js:59-71`
**Issue:** `topic-trial` covers `landing.html`, which is denylisted; `classify` puts
denylist ahead of the watch test, so a landing.html change never becomes a trigger
and that covers entry can never be consulted by the gate. Harmless today, but a
covers[] entry that looks load-bearing and is dead invites false confidence. No
invariant guards covers[] entries being watchable paths.
**Fix:** Either drop `landing.html` from that covers[] list or add an invariant note
that covers[] may include denylisted context paths intentionally.

---

_Reviewed: 2026-07-10T16:45:37Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
