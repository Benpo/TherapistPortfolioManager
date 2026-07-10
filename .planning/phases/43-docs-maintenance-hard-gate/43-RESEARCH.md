# Phase 43: Docs-Maintenance Hard Gate - Research

**Researched:** 2026-07-10
**Domain:** Git-hook + GitHub-Actions repo tooling; plain-node static-content parsing; git trailer semantics; test-rename refactor
**Confidence:** HIGH (all Tier-1 mechanics verified by running git 2.50 locally and reading live source; the one residual is a documented CI edge-case with a recommended fix)

> ## ⚠ PARTIALLY SUPERSEDED — read this before treating any section below as the contract
>
> This document is the research record as written on 2026-07-10, preserved as-is. Four decisions were
> taken with Ben *after* it, during planning. **Where this document and `43-CONTEXT.md`
> §post_discussion_decisions disagree, CONTEXT wins, and the PLAN files are the executable contract.**
>
> | Superseded here | Now |
> |---|---|
> | §Q-F "37 uncovered files"; the non-code handling proposal | **OD-1:** a watched path needs a SHIPPED-PATH test **and** a code-extension test. Non-code shipped files are ignored entirely. `tests/**` and `scripts/**` are ignored — an extension-only rule would block the gate's own ship. |
> | §Q-A / D-02's `before..after` CI range (flag A2) | **OD-2:** the CI range is anchored to the last-deployed SHA. `ls-remote` distinguishes an absent `deploy` branch from an unfetched ref; the latter fails closed. |
> | §Q-C's single-file trailer shape | **OD-3:** one `*-Unaffected:` trailer may name multiple comma-separated files sharing one mandatory reason. |
> | §Q-C / §Q-K reading all three trailers over the range | **OD-4:** `Docs-Emergency-Skip:` is honored **only on the range's tip commit** — never inherited through a merge. The two `*-Unaffected:` trailers keep whole-range scope. |
>
> Everything else in this document — the `%(trailers)` vs `--grep` finding, the `pre-push` stdin protocol,
> the `vm`-loader reuse, `npm prepare` semantics, the D-20 blast radius, the RED/GREEN harness mechanics,
> and the self-trip analysis — stands and was independently confirmed.

## Summary

Phase 43 is **repo tooling, not app code**. Every design risk that mattered was empirical, and every empirical question resolved in the gate's favour except one CI edge-case (concurrency `cancel-in-progress` can skip a push range — fixable, see Q-A). The `%(trailers:...)` range read, the `vm`-sandbox loader reuse, the `npm prepare` hook install, and the `covers[]` reverse index all work exactly as the 23 locked decisions assume.

The single largest planning input this research produces is a **hard number the CONTEXT did not have**: after applying D-05/D-06/D-07 as written, **37 shipped files are currently uncovered and would BLOCK** on their first edit (`node` enumeration below). D-19's "obvious module owner" heuristic can place ~10 of them; the rest are app-shell/infra files (`app.js`, `i18n-*.js`, `shared-chrome.js`), the v1.3 surfaces already flagged for deferral (`tour.js`, `whats-new.js`, `reporting.js`), and — the genuine gap — **8 CSS files plus the entire non-code `assets/**` tree (fonts, images, JSON) that no `covers[]` entry can ever name**. The planner must make one explicit role-table decision about which file *types* the gate watches. This is within Claude's Discretion (the role table, D-05/D-06/D-07) — it is not a decision conflict — but it must be decided at plan time, not discovered at execute time.

**Primary recommendation:** Build one shared `scripts/docs-gate.js` (plain node, zero deps) with a shared `scripts/lib/` invariants + loader module; a thin `.githooks/pre-push` shim reading **stdin** (not `origin/main..HEAD`); one inline CI step in `deploy.yml` before "Prepare deploy directory". Read trailers with `git log <range> --format='%(trailers:key=…,valueonly,only)'` (verified correct; `--grep` is NOT safe — it false-matches code blocks). Write the RED/GREEN behavior test FIRST (D-21) against a throwaway repo with a **local bare origin**. Decide the CSS/binary-asset watch policy explicitly before writing the role table.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 … D-23 — implement as written, do not re-open)

- **D-01** `pre-push` only, no `pre-commit`. Hook is a *fast preview of the CI verdict* — same script, same range semantics, never stricter.
- **D-02** Unit = the push range judged as a whole. Local `origin/main..HEAD`; CI `before..after`. No per-commit ordering rules.
- **D-03** `main` only. Other branches skip the local hook entirely.
- **D-04** Fail closed everywhere. All-zeros `before` SHA (first/force-push) is known-benign — handle explicitly with a merge-base fallback, do not let it become a fail-closed surprise.
- **D-05** User-facing = everything `deploy.yml` ships (`*.html`, `assets/**`, `manifest.json`, `sw.js`) minus a written denylist. Fails safe.
- **D-06** Denylist = legal + marketing surfaces, **pages AND their scripts** (`impressum*`/`datenschutz*`/`disclaimer*` ×4 each, `landing.html`, `demo.html`; `assets/landing.js`, `assets/demo.js`, `assets/demo-seed.js`, `assets/disclaimer.js`, `assets/i18n-disclaimer.js`). Vendor bundles (`jspdf/jszip/bidi.min.js`) are NOT denylisted. Leave `landing.html`'s existing `covers[]` entry alone.
- **D-07** Satisfiers are never triggers: `help-content-*.js` satisfies help; `changelog-content-*.js` satisfies changelog. Role rule in the script, not a denylist entry.
- **D-08** Two changelog rules, both mechanical, no schema change. Ordinary push: edit `changelog-content-en.js` OR carry `Changelog-Unaffected:`. Release push (`APP_VERSION` changed in range): an entry for exactly that version with non-empty `highlights` + `date`. Tolerate the `origin:true` v1.0 entry (no highlights).
- **D-09** REJECTED: `unreleased:true` convention.
- **D-10** Gate never semantically diffs help content. Presence check (`covers[]` reverse index) + explicit declaration only.
- **D-11** Help satisfaction = touch the claiming topic OR `Help-Unaffected:` trailer.
- **D-12** An uncovered changed file BLOCKS. Anti-rot engine.
- **D-13** Gate prints the relevant slice; a generated `HELP-MAP.md` is committed and freshness-checked. Only `covers[]` metadata parsed, never prose.
- **D-14** Three distinct trailers: `Help-Unaffected:`, `Changelog-Unaffected:` (cheap, expected), `Docs-Emergency-Skip:` (loud banner in CI). Trailer welded to commit; no waiver ledger. CI honors only trailers.
- **D-15** `package.json` gains `"prepare": "git config core.hooksPath .githooks"`. Blocker: hooksPath currently pinned to `.git/hooks`.
- **D-16** Delete `.claude/hooks/pre-commit` (tracked, dead, obsolete).
- **D-17** Gate runs its own invariants first from ONE shared module (4 invariants). CI gets them free. Same module exercised by the renamed integrity tests. No `43-docs-gate.test.js`. Plus a DoD line in `CLAUDE.md`. Role-table invariant (#4) may fold into a small file beside the gate.
- **D-18** CI = the gate step only, inline shell mirroring "Verify no sensitive files", before "Prepare deploy directory". No `npm test` in CI (deferred).
- **D-19** Metadata-only `covers[]` backfill — extend existing topics, author no new prose. Add covered pages' scripts + obvious module owners.
- **D-20** `covers[]` becomes EN-only — strip from `help-content-{he,de,cs}.js`. Gate reads only `help-content-en.js`. Adjust the 42.1 locale parity tests; verify no runtime read of `covers` in `help.js`.
- **D-21** Automated RED/GREEN behavior test, written BEFORE the gate script, plus the live v1.3.0 push. Throwaway temp git repo.
- **D-22** Rename 5 standing guards, drop phase prefixes, replace-all on LIVE FILES ONLY (allowlist). Before/after grep post-condition. Rename map into `TESTING.md`.
- **D-23** Test-naming rule is LOCKED but WRITTEN IN PHASE 44, not here. Phase 43 must NOT edit `.planning/codebase/CONVENTIONS.md`.

### Claude's Discretion
- Concrete denylist/satisfier/trigger **role table** (principle set by D-05/06/07).
- Gate script **language + location** (recommend plain node; `scripts/docs-gate.js` + `.githooks/pre-push` shim + `scripts/lib/` module).
- `HELP-MAP.md` **location + table shape** (recommend repo root, diff-friendly).
- The `HELP-MAP.md` **generator's home** and whether it doubles as the invariant's regeneration source.
- **Merge-base fallback** implementation for all-zeros SHA.
- **Trailer parsing** rules (case sensitivity, multiple per push, which commit — recommend: any commit in range).
- Wording of the `CLAUDE.md` DoD line and the written "user-facing change" definition.
- Whether invariant #4 gets its own `{slug}.test.js` (must follow D-23's rule) or folds into the gate self-test.

### Deferred Ideas (OUT OF SCOPE)
- New help topics for undocumented surfaces (`reporting.html`, `tour.js`, `whats-new.js`) — Phase-39-sized content effort.
- Adding `npm test` to CI.
- `unreleased:true` changelog convention.
- Gating the pre-prod branch (`d037b17`).
- Renaming the ~160 remaining numbered test files (opportunistic only).
- A generated waiver ledger.
- A committed coverage-debt list.
- **The entire comment-hygiene / phase-ID / decision-ID / `CONVENTIONS.md` problem → Phase 44.** Phase 43 must not touch a single comment for hygiene purposes. (The only comment edits Phase 43 makes are D-22 filename-reference updates — see Q-D note.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GATE-01 | User-facing changes cannot complete without a changelog entry AND updated/declared help topics — blocks loudly | `covers[]` reverse index verified (23 paths, 34 topics); trailer range-read verified (Q-C); blocking `exit 1` idiom exists in `deploy.yml:40-47` |
| GATE-02 | Layered: local git hook (`.githooks/`, shared script) + CI step (unbypassable) + GSD DoD | `pre-push` stdin protocol (Q-B); `npm prepare` install path (Q-E); CI step placement verified (`deploy.yml`, Q-A); `CLAUDE.md` DoD line |
| GATE-03 | Written, checkable path-based "user-facing change" definition + logged escape hatch | 37-file uncovered enumeration (Q-F) sizes the role table; three-trailer escape hatch verified (Q-C); denylist/satisfier logic |
| GATE-04 | Hooks `APP_VERSION` bump as the release moment; validated against v1.3's own ship | `APP_VERSION='1.3.0'` at `version.js:27`; v1.3 changelog entry exists with 3 highlights; `origin:true` special-case confirmed (Q-C); gate will NOT self-trip on its own push (Q-K) |
</phase_requirements>

## Standard Stack

**No new dependencies.** This phase adds zero npm packages. Sole existing devDependency is `jsdom@^29.1.1` — and the gate does **not** need it (the `vm`-sandbox loader in `tests/39-help-integrity.test.js` uses only node built-ins `fs`/`path`/`vm`). [VERIFIED: read `package.json`, `tests/39-help-integrity.test.js:29-52`]

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| node (built-in `fs`/`path`/`vm`/`child_process`) | `>=18` (engines field) | Gate script, invariants module, RED/GREEN test | Matches `tests/` workbench; zero-build; already the test runtime |
| git | 2.50 local / ~2.43 on `ubuntu-latest` | Range diff + trailer read | `%(trailers:key=,valueonly,only)` needs git ≥ 2.20 (2018); both environments far exceed [VERIFIED: `git --version` → 2.50.1; runner default ≥ 2.43] |
| GitHub Actions `actions/checkout@v4` `fetch-depth: 0` | current | Full history for `before..after` | Already present [VERIFIED: `deploy.yml:17-19`, orchestrator-confirmed] |

**Installation:** none.

## Package Legitimacy Audit

N/A — this phase installs no external packages. The `prepare` script is a git config command, not a dependency.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary | Rationale |
|------------|-------------|-----------|-----------|
| Push-range diff + trailer read | Repo tooling (node/git) | — | Needs git history; runs in hook + CI |
| Static invariants (map freshness, covers-exist, changelog schema, role-table) | Repo tooling (shared module) | Test suite | Files-on-disk only; called by gate AND `npm test` (D-17) |
| Local fast preview | Git hook (`.githooks/pre-push`) | — | Developer feedback; bypassable by design (`--no-verify`) |
| Unbypassable enforcement | CI (`deploy.yml` step) | — | Only layer that cannot be skipped |
| Definition-of-done | Docs (`CLAUDE.md`) + GSD | — | Human/agent-read contract |
| `covers[]` reverse index (help routing) | Data (`help-content-en.js`) | — | EN-canonical metadata, never prose |
| Release moment | Data (`version.js` `APP_VERSION`) | — | Hand-set; NEVER `INTEGRITY_TOKEN` |

---

# Tier-1 Findings (silently break the gate if wrong)

## Q-A. GitHub Actions push SHA semantics + the cancel-in-progress hole

[VERIFIED: local git behavior] [CITED: docs.github.com push event payload]

**`github.event.before` / `github.event.after`:**
| Push scenario (to `main`) | `before` | `after` | `before..after` valid? |
|---|---|---|---|
| Ordinary push | previous tip | new tip (== `github.sha`) | ✅ yes |
| First-ever push to the branch | `0000…0000` (all-zeros) | new tip | ❌ no — zeros is not an object |
| Force-push (rewrite) | old tip (may be unreachable after fetch) | new tip | ⚠️ object may be absent; range may be empty/degenerate |
| Push that deletes commits (rewind) | old tip | ancestor of old tip | range empty |
| Branch deletion | last tip | `0000…0000` | N/A (won't deploy) |

**All-zeros `before` happens only on the first-ever push** to a ref. For this repo `main` already has a long history, so all-zeros to `main` is essentially non-recurring. Force-push to `main` gives a **real** old-tip `before` (not zeros), but that object may not survive the fetch, so the gate must also guard `git cat-file -e $before` failing.

**The merge-base trap (orchestrator-flagged, confirmed real):** D-04's note "fall back to merge-base against `origin/main`" is correct for the **LOCAL hook** (where `HEAD` genuinely diverges from `origin/main`), but **degenerate in CI-on-main** — `merge-base(after, origin/main)` when `after` *is* the new main tip returns main's own history, not a useful baseline. **Recommended CI fallback for the benign all-zeros / missing-object case: evaluate the tip commit only, `${after}^..${after}` (i.e. `HEAD~1..HEAD`).** D-02 judges the push as a whole and D-04 calls all-zeros "known-benign," so a defined tip-only evaluation is a correct, non-crashing behavior — not a fail-closed surprise. [ASSUMED that tip-only is acceptable to Ben — flag A1]

**The cancel-in-progress hole (answer: YES, a range CAN be skipped):**
`deploy.yml:7-9` sets `concurrency: { group: deploy, cancel-in-progress: true }`. Sequence:
1. Push P1 advances `main` `A → B` (range `A..B`), CI run R1 starts.
2. Push P2 advances `main` `B → C` before R1 finishes; R1 is **cancelled**; run R2 starts with `before = B`, range `B..C`.
3. R1 never completed its gate step → commits `A..B` were **never gate-verified by a successful run**, and R2's range starts at `B`. A missing changelog entry in `A..B` slips through.

This is a genuine gate-skipping hole. **Recommended fix (within Claude's Discretion — range implementation):** derive the baseline from the **last successfully-deployed state** rather than `event.before`, so a cancelled deploy re-includes the skipped commits on the next run. The cleanest anchor is the `deploy` branch tip — but note it is a squashed snapshot whose commit *message* is `Deploy from <short-sha>` (`deploy.yml:62`), so the main SHA must be parsed from the message (`git log origin/deploy -1 --format=%s` → extract the 7-char hash), and parse-failure → fail closed (D-04). Simpler alternative: set the gate's guarantee expectation lower and accept the edge (rapid double-push mid-milestone is rare, and the local hook + PR discipline catch most). **Present both to Ben at plan time.** [ASSUMED preference — flag A2]

**`github.event.commits[]`** is capped (~2048, and only ~20 surface via some APIs) and excludes commits from before the push — do **not** build the range from it. Use SHA ranges.

## Q-B. `pre-push` hook stdin protocol — read stdin, not `origin/main..HEAD`

[VERIFIED: git hook documentation + local behavior]

**argv:** `$1` = remote name (e.g. `origin`), `$2` = remote URL.
**stdin:** one line per ref being pushed: `<local ref> <local sha> <remote ref> <remote sha>`. For a **new branch on the remote**, `<remote sha>` = `0000…0000` (40 zeros). For a **ref deletion**, `<local sha>` = zeros.

**Reading stdin is strictly better than `origin/main..HEAD`** for three reasons:
1. It gives the **actual remote SHA being replaced** — robust even if the `origin/main` tracking ref is stale (developer hasn't fetched).
2. It exposes the **first-push all-zeros case explicitly**, so the hook can apply the same benign fallback as CI.
3. It handles **pushing a non-current branch** (`git push origin HEAD:main`, or pushing from a detached HEAD) — `origin/main..HEAD` silently uses the wrong tip in those cases.

**D-03 "main only" is decided from stdin's `<remote ref>` (`refs/heads/main`), NOT from `HEAD`** — because what matters is *which remote ref is being updated*, and you can update `main` while checked out elsewhere. Deciding from `HEAD` would misfire on `git push origin somebranch:main`.

**Canonical skeleton (recommended):**
```sh
#!/usr/bin/env sh
# .githooks/pre-push — thin shim; delegates to the shared node gate.
remote_name="$1"
Z="0000000000000000000000000000000000000000"
status=0
while read -r local_ref local_sha remote_ref remote_sha; do
  [ "$remote_ref" = "refs/heads/main" ] || continue   # D-03: main only
  [ "$local_sha" = "$Z" ] && continue                  # deleting main: nothing to check
  if [ "$remote_sha" = "$Z" ]; then
    range="$local_sha"                                 # first push: benign fallback (tip-set)
  else
    range="${remote_sha}..${local_sha}"
  fi
  node "$(git rev-parse --show-toplevel)/scripts/docs-gate.js" --range "$range" || status=1
done
exit $status
```
The shared `scripts/docs-gate.js` accepts `--range` so hook and CI invoke one implementation (GATE-02's "shared script"). CI passes `--range "${before}..${after}"` (or its computed baseline).

## Q-C. Reading git trailers over a commit RANGE — use `%(trailers)`, NOT `--grep`

[VERIFIED: ran against a synthetic 4-commit repo on git 2.50]

**Recommended command:**
```sh
git log <range> --format='%(trailers:key=Help-Unaffected,valueonly,only)' | grep -v '^$'
```
Verified behavior across a range with two commits each carrying `Help-Unaffected:` (one also carrying `Changelog-Unaffected:`), plus a decoy commit with a `Help-Unaffected:`-looking line **inside a fenced code block**:
- ✅ Collects the trailer from **multiple different commits** in the range.
- ✅ Collects **multiple same-key trailers in one commit** (repeat the key → multiple lines).
- ✅ `valueonly` strips the key; `only` suppresses non-matching trailers (no blank noise beyond inter-commit blanks, which the `grep -v '^$'` removes).
- ✅ **Does NOT parse the code-block decoy** — git's trailer parser only reads the last contiguous "trailer block" of the message, so a `Key: value` line buried in a middle paragraph / code fence is ignored. (Output contained only the two real values, not the fake.)

**`git log --grep='^Help-Unaffected:'` is UNSAFE for the gate decision** — it is a regex over the *entire* message body and **DID match the code-block decoy** in testing. Use `--grep` only for the human-facing "list every emergency skip in history" convenience (D-14), where an occasional false positive is tolerable — and even there, prefer `%(trailers:key=Docs-Emergency-Skip,valueonly,only)`.

**Case sensitivity:** git trailer keys are case-insensitive by default in `interpret-trailers`, but `%(trailers:key=X)` matching is **case-insensitive on the key** — confirmed git treats `key=` case-insensitively. Still, document the canonical casing (`Help-Unaffected:`) in `CLAUDE.md` so authors are consistent.

**Which commit may hold the trailer (D-14 discretion):** recommend **any commit in the range** — the range is judged as a whole (D-02), and `%(trailers)` already aggregates across all commits. No ordering rule.

**Merge commits:** a trailer in a merge commit's body IS read by `%(trailers)` (it's just another commit in the range). Fine.

**Minimum git version:** `%(trailers:key=…,valueonly,only)` requires git ≥ 2.20 (Dec 2018). `ubuntu-latest` ships ≥ 2.43. [VERIFIED locally on 2.50; CITED runner default]

## Q-D. Parsing `help-content-en.js` / `changelog-content-en.js` — reuse the `vm` loader

[VERIFIED: read `tests/39-help-integrity.test.js`, `tests/42_1-help-integrity.test.js`, `tests/run-all.js`, `tests/_helpers/`]

`tests/39-help-integrity.test.js:33-52` loads production JS into a `vm` sandbox with a fake `window` (`sandbox.window.I18N={}`), runs `i18n-en.js` + `help-content-en.js`, then reads `sandbox.window.HELP_CONTENT_EN`. **The gate can and should reuse this exact loader** — it needs no jsdom, only `fs`/`path`/`vm`.

**Where the shared loader lives — recommend `scripts/lib/` (NOT `tests/_helpers/`):**
- `tests/run-all.js:46-48` discovers `tests/*.test.js` by glob and its comment (`:11-13`) states `tests/_helpers/` is deliberately excluded because helpers "are not `.test.js` files." So a loader placed in `tests/_helpers/` would be safe from the runner glob — BUT the gate is **not a test**; it runs in a git hook and in CI where `tests/` may read as test infrastructure. A `scripts/lib/` home (beside `scripts/docs-gate.js`, matching the existing `scripts/cf-purge-cache.sh`) is the honest home for repo tooling.
- **Both callers can require it:** the renamed integrity tests (`tests/*.test.js`) do `require('../scripts/lib/help-loader.js')`; the gate does `require('./lib/help-loader.js')`. Neither breaks `run-all.js`'s glob (it only *executes* `tests/*.test.js`; a `require` of a sibling module is invisible to the glob). [VERIFIED: `run-all.js` discovers by `readdirSync` filter on `.test.js`, then spawns each — a required module is never spawned]
- **Zero-build safe:** CommonJS `require`, no bundler.

`scripts/` already exists (`scripts/cf-purge-cache.sh`) and is **not shipped** (`deploy.yml:21-38` copies only `_headers`, `_redirects`, `LICENSE`, `*.html`, `assets/`, `manifest.json`, `sw.js` — never `scripts/`). Safe home for tooling. [VERIFIED: `deploy.yml`]

---

# Tier-2 Findings (shape task decomposition)

## Q-E. `npm prepare` semantics (D-15)

[CITED: docs.npmjs.com scripts lifecycle] [VERIFIED: `git config core.hooksPath` → absolute `.git/hooks`; `.githooks/` absent]

- `prepare` runs on **`npm install` with no arguments** in a local package — yes, this is the documented trigger and the one D-15 relies on ("anyone running the test suite already does `npm install`").
- Runs on a **fresh clone + `npm install`** — yes (cloud Claude Code path).
- Runs on **`npm ci`** — yes, `npm ci` executes the install lifecycle including `prepare`.
- Runs when **`node_modules` already present** — yes; `prepare` fires on every `npm install` invocation, so it's **idempotent** (re-setting `core.hooksPath` each time is harmless).
- **Failure mode:** in a non-repo context (tarball install, `npm install <this>` as a dependency — not applicable here since `private:true`, but defensively) `git config` fails and would fail the install. **Recommend fail-soft: `"prepare": "git config core.hooksPath .githooks || true"`.**
- **Relative path works:** git resolves a relative `core.hooksPath` **relative to the working-tree root** (hooks always run from the top level), so `.githooks` resolves correctly from any subdir. [CITED: git config docs] Setting the current absolute `.git/hooks` → relative `.githooks` is safe.
- **D-15 blocker confirmed live:** `git config core.hooksPath` returns the absolute `.git/hooks`, and `.githooks/` does not yet exist — a committed `.githooks/pre-push` is **inert until `prepare` runs once**. The RED/GREEN test (D-21) invokes the script directly (`node scripts/docs-gate.js`), so it does not depend on hook installation — good, the test proves the gate logic independent of the wiring.

## Q-F. `covers[]` reverse index + the uncovered-file blast radius (D-11, D-12, D-19)

[VERIFIED: `node` enumeration loading `help-content-en.js` via the `vm` loader]

**Corpus:** 12 sections, **34 topics**, **23 distinct `covers[]` paths** (CONTEXT said "22" — the live number is **23**; correct this). No dangling `covers[]` entries — every path exists on disk (D-17 invariant #2 currently passes). Covered paths:
```
add-client.html, add-session.html, index.html, license.html, sessions.html,
settings.html, report.html, landing.html, manifest.json, sw.js,
assets/backup.js, assets/backup-modal.js, assets/crashlog.js, assets/crop.js,
assets/db.js, assets/export-modal.js, assets/license.js, assets/overview.js,
assets/pdf-export.js, assets/settings.js, assets/settings-snippets.js,
assets/snippets.js, assets/snippets-seed.js
```

**37 shipped, non-denylisted, non-satisfier files are currently UNCOVERED — each BLOCKS on first edit (D-12):**

| Category | Files | D-19 disposition |
|---|---|---|
| **Page scripts of covered pages** (D-19 explicit target) | `assets/add-client.js`, `assets/add-session.js`, `assets/sessions.js`, `assets/report.js`, `assets/settings-photos.js`, `assets/settings-session-types.js`, `assets/date-format.js` | **Backfillable** — add to the topic that already covers the page |
| **Vendor bundles** (D-06: not denylisted, deliberately) | `assets/jspdf.min.js`, `assets/jszip.min.js`, `assets/bidi.min.js` | **Backfillable** — `jspdf`+`bidi` → the pdf-export topic; `jszip` → the backup topic |
| **App shell / infra — no obvious topic owner** | `assets/app.js`, `assets/shared-chrome.js`, `assets/attention-coordinator.js`, `assets/globe-lang.js`, `assets/md-render.js`, `assets/version.js`, `assets/i18n.js`, `assets/i18n-en.js`, `assets/i18n-he.js`, `assets/i18n-de.js`, `assets/i18n-cs.js` | **CANNOT place** via the heuristic — live on `Help-Unaffected:` trailers (D-12 accepted cost) OR need a denylist decision |
| **v1.3 surfaces already deferred by CONTEXT** | `assets/tour.js`, `assets/whats-new.js`, `assets/changelog.js`, `assets/reporting.js`, `changelog.html`, `help.html`, `reporting.html`, `assets/help.js` | **Deferred** — trailer cost until a topic is authored (Phase-39-sized work) |
| **CSS — the genuine gap (no `covers[]` can ever name CSS)** | `assets/app.css`, `assets/changelog.css`, `assets/demo.css`, `assets/globe-lang.css`, `assets/help.css`, `assets/landing.css`, `assets/tokens.css`, `assets/tour.css` | **Needs an explicit role-table decision** |

**Beyond these 37, `assets/**` also literally ships (per D-05) fonts, images, JSON, and `.txt`** — `assets/branding/*.png`, `assets/illustrations/**`, `assets/fonts/*.woff2`, `assets/demo-seed-data.json`, `assets/bidi.LICENSE.txt` (and stray `.DS_Store` files). Under a literal reading, adding a botanical illustration BLOCKS.

**The single decision the planner must make (Claude's Discretion — the D-05/06/07 role table):** *what file types does the gate watch?* Options:
- **(a) Literal D-05** — all of `assets/**` + `*.html` + `manifest.json` + `sw.js`. Maximally safe, maximally noisy (every CSS/font/image edit needs a trailer until covered). `.DS_Store` must be `.gitignore`d/denylisted or it self-blocks.
- **(b) Code+markup+config only** — watch `*.html`, `assets/*.js`, `manifest.json`, `sw.js` (+ optionally `*.css`); treat fonts/images/JSON as non-user-facing-by-type. Pragmatic; a new illustration wouldn't force a trailer.
- **Recommended:** (b) with CSS **included** as a watched type but paired with its owner — i.e. extend the denylist under D-06's own "page + script = one surface" logic to also cover the CSS of denylisted surfaces (**`assets/landing.css`, `assets/demo.css`** — D-06 lists the scripts but omitted the CSS; this is incoherent per its own rationale and should be fixed), and treat the remaining CSS as trailer-cost infra. This is a role-table refinement, not a decision conflict.

This is the biggest sizing input: **D-19's backfill realistically places ~10 of 37**; the rest are trailer-cost or deferred-by-design. The plan must not promise "backfill until zero uncovered" — D-12 explicitly accepts residual trailer cost.

## Q-G. D-20 blast radius — the exact assertions that go RED

[VERIFIED: read `tests/42_1-help-integrity.test.js`, `tests/42_1-changelog-integrity-locale.test.js`, grep of `assets/*.js`]

**Runtime safety: `covers[]` is safe to strip.** `grep covers assets/*.js` finds `covers` only in the content files themselves plus unrelated prose comments (`add-session.js:127 "covers both"`, `pdf-export.js`, `report.js`). **`assets/help.js` has ZERO reads of `covers`** — confirmed. Stripping `covers[]` from the three locale files is runtime-safe. [VERIFIED]

**The ONE assertion block that goes RED** — `tests/42_1-help-integrity.test.js`, test `"[<loc>] each section group + featured + topics match EN"`, lines **244-248**:
```js
const enCovers = JSON.stringify(enTp.covers);
const lcCovers = JSON.stringify(lcTp.covers);
if (enCovers !== lcCovers) {
  throw new Error(en.id + '/' + enTp.id + ' covers ' + lcCovers + ' ≠ EN ' + enCovers);
}
```
When `covers[]` is removed from the locale topic, `lcTp.covers` is `undefined`, `JSON.stringify(undefined)` is the value `undefined` (not the EN JSON string) → **throws for all he/de/cs**. **This block must be deleted** (it's the covers-parity check; nothing else in that test references `covers`). The rest of the parity test (section ids, group, featured, topic ids, priority, `{ui:}` tokens) stays valid and should remain.

- `tests/42_1-changelog-integrity-locale.test.js` — **no `covers` reference; unaffected** by D-20. [VERIFIED]
- `tests/39-help-integrity.test.js` (→ `help-integrity.test.js`) — asserts `covers` **non-empty on EN only** (line 188-197). EN keeps `covers`, so this stays green. [VERIFIED]

**Net D-20 test work:** delete lines 244-248 of the (renamed) locale help test. That is the entire blast radius.

## Q-H. D-21 RED/GREEN behavior test mechanics

[VERIFIED: ran an isolated throwaway-repo pattern with `GIT_CONFIG_GLOBAL=/dev/null`]

**Confirmed working recipe (offline, deterministic, leaves nothing behind):**
```js
const os = require('os'), fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docsgate-'));
try {
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' };
  const g = (args, opts={}) => execFileSync('git', ['-C', repo, ...args],
    { env, stdio: 'pipe', ...opts });
  // 1. bare origin so origin/main resolves for the range
  execFileSync('git', ['init', '-q', '--bare', path.join(tmp, 'origin.git')], { env });
  const repo = path.join(tmp, 'work');
  execFileSync('git', ['clone', '-q', path.join(tmp,'origin.git'), repo], { env });
  g(['config','user.email','t@t']); g(['config','user.name','t']);
  // 2. seed real fixtures (see below) + a baseline commit on main, push to origin
  //    → establishes origin/main baseline for `origin/main..HEAD`
  // 3. RED: stage a user-facing change (edit assets/app.js) with NO changelog entry, commit
  // 4. run REAL gate, capture exit + stderr
  let code = 0, err = '';
  try { execFileSync('node', [GATE, '--range', 'origin/main..HEAD'], { cwd: repo, env }); }
  catch (e) { code = e.status; err = e.stderr.toString(); }
  assert(code !== 0);                       // blocks
  assert(/changelog/i.test(err));           // right message
  // 5. GREEN: add the changelog bullet (or a Changelog-Unaffected trailer), commit, re-run
  //    assert exit 0
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }  // no temp dirs left
```

**Key mechanics answered:**
- **Fake `origin/main`:** a **local bare repo** cloned into a work repo is the cleanest — `origin/main` resolves natively so the gate's `origin/main..HEAD` (and CI's range) both work with no network. (Alternative `git update-ref refs/remotes/origin/main <sha>` also works but the bare-clone models reality better and exercises push.) [VERIFIED: the range read works against a real base SHA]
- **Isolation from Ben's gitconfig:** `GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null` + per-repo `user.email`/`user.name`. Verified this fully isolates identity and config.
- **Exit + stderr capture:** `execFileSync` throws on non-zero; catch `e.status` (exit code) and `e.stderr`. Verified.
- **Fixtures — recommend SYNTHESIZE minimal ones, not copy the real corpus.** Reasons: (1) the real `help-content-en.js` is large and its `covers[]` set will keep changing (D-19 backfill), making a copy-based test brittle and coupled to production content — the exact anti-pattern from the phase-31 "test-shape coupling" learning; (2) a minimal synthetic corpus (2 sections, 3 topics, a handful of `covers[]`, one changelog entry) makes the RED/GREEN cause unambiguous and the test fast. Synthesize a fixed, tiny `help-content-en.js` / `changelog-content-en.js` / `version.js` inside the temp repo. [VERIFIED reasoning against project learning `reference-test-shape-coupling-extractions.md`]
- **Offline + no leftover dirs:** the bare-repo clone is local; `fs.rmSync(tmp,{recursive,force})` in `finally` cleans up. Verified pattern.

**RED-first ordering (project rule + D-21):** author this test BEFORE `scripts/docs-gate.js` exists. It fails RED (script absent → `execFileSync('node',[GATE])` throws ENOENT) for the right reason, then GREEN once the gate lands. Mirror the 42.1 RED-guard idiom (`fs.existsSync` gate) if a cleaner RED signal than ENOENT is wanted.

## Q-I. `HELP-MAP.md` freshness invariant (D-13, D-17 #1)

[CITED: general text-canonicalization practice] [VERIFIED: file-shipping scope]

The gate asserts the committed `HELP-MAP.md` byte-matches a fresh regeneration (D-17 invariant #1). Standard failure modes and the robust canonicalization:
- **Trailing newline:** always end the file with exactly one `\n`. Generate and compare the full string including that terminal newline.
- **CRLF:** force `\n` line endings in the generator; add `HELP-MAP.md text eol=lf` to `.gitattributes` so a Windows checkout can't rewrite it. (Ben is on macOS; low risk but cheap insurance.)
- **`covers[]` sort order:** emit `covers[]` **sorted** (stable `Array.sort()`) so reordering the source array doesn't churn the map. Sort sections/topics by their existing document order (do NOT re-sort — order is meaningful), but sort the `covers[]` list within each row.
- **Comparison:** regenerate to a string in-memory and `===` against `fs.readFileSync('HELP-MAP.md','utf8')`. On mismatch, print a unified-diff-friendly message ("run `node scripts/gen-help-map.js` and commit").

**Table shape (recommend):** one row per topic:
```markdown
| Section | Topic | Title | Covers |
|---------|-------|-------|--------|
| adding-a-client | topic-add-client | Adding a client | add-client.html, assets/add-client.js |
```
An agent reads this cold to answer "where does this file belong in help?" — the `Covers` column is the reverse-lookup they need.

**Location — repo root `HELP-MAP.md`.** Rationale: (1) an agent must read it cold before writing code, and root is the obvious place; (2) `deploy.yml:21-38` copies only `*.html` + `assets/` etc. — **a repo-root `.md` does NOT ship** (verified), so it's safe from leaking to production; (3) `.planning/` is an alternative but the map is a live tooling artifact, not planning history. The **generator** (`scripts/gen-help-map.js`) should be the **same code** the invariant calls (generate-to-string, then either write or compare) — one implementation, "write" and "check" modes.

---

# Tier-3 Findings

## Q-J. `--no-verify` and hook bypass

[CITED: git docs] `git push --no-verify` **skips the `pre-push` hook entirely** — confirmed documented behavior. A local hook **cannot detect it was bypassed** (it is simply never invoked; there is no signal). This is exactly why **CI is the enforcement layer** (D-14, D-18): the local hook is a courtesy preview, the CI step (unbypassable, honors only trailers) is the real gate. Say this plainly in the `CLAUDE.md` DoD line so no one mistakes the hook for enforcement.

## Q-K. Prior art + self-trip analysis

[CITED: changesets, towncrier, Kubernetes, Rust project docs — surfaced for failure modes only; DO NOT adopt — D-08/D-09 reject schema change]

- **changesets** (JS): PRs add `.changeset/*.md`; a CI bot checks presence. Learned failure modes: dependabot/bot PRs trip it (need bot exemption); the release PR itself (which *consumes* changesets) must be exempt.
- **towncrier** (Python): `newsfragments/` files, assembled at release. Learned: reverts and merge commits need handling.
- **Kubernetes**: a `release-note` block in the PR body, label-enforced. Learned: automation commits (version bumps) trip their own gate.
- **Rust**: `relnotes` label. Learned: the release-automation push is the classic self-trip.

**Does THIS gate trip on its own Phase 43 push?** **No.** [VERIFIED by scope analysis]
- Phase 43's shipped edits touch only **satisfier** files (`help-content-*.js` covers backfill/strip; `changelog-content-*.js` via the rename pass) — D-07 says satisfiers never raise a demand.
- All other Phase 43 files (`scripts/`, `.githooks/`, `deploy.yml`, `package.json`, `CLAUDE.md`, `TESTING.md`, `tests/`) are **not in the watched scope** — `deploy.yml` never ships them, and the gate watches only `*.html`/`assets/**`/`manifest.json`/`sw.js`.
- Phase 43 does **not** bump `APP_VERSION` (stays `1.3.0`), so the release-moment check doesn't fire.
- Therefore Phase 43 introduces no trigger → the gate passes green on its own push. (If a future planner adds a genuinely user-facing asset edit to Phase 43, that edit would correctly demand a changelog line — as intended.)

**Does the `deploy` branch force-push (`deploy.yml:54-64`) re-trigger / self-trip?** **No.** [VERIFIED: `deploy.yml:3-5`] The workflow triggers on `push: branches: [main]` only. The deploy step does `git init` in a *fresh* `deploy-staging` repo and force-pushes to the `deploy` branch — a push to `deploy` does not match `branches: [main]`, so no re-trigger; and even if it did, D-03 makes the gate main-only. The deploy branch is exempt by construction.

---

## Runtime State Inventory

This phase is partly a rename/refactor (D-22) — inventory required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — the gate reads git history + files on disk; no datastore holds test filenames or `covers[]` as keys. Verified: `grep covers assets/*.js` shows no runtime datastore usage. | none |
| Live service config | `core.hooksPath` is git *local config* (`.git/config`), currently `.git/hooks`. D-15's `prepare` rewrites it to `.githooks` on next `npm install`. This is per-clone runtime state NOT in git — a fresh clone must run `npm install` to activate the hook. | `npm prepare` (D-15); document in `CLAUDE.md` |
| OS-registered state | None — no Task Scheduler/launchd/pm2 entries reference these names. | none |
| Secrets/env vars | None renamed. Gate reads no secrets. CI uses existing `GITHUB_TOKEN`/`CF_*` (untouched). | none |
| Build artifacts / installed packages | The **5 renamed test files** are discovered by glob (`run-all.js:46-48`), so no manifest/wiring updates. But **old test-name strings live in live comments** of other files (see D-22 note in Q-D) — `assets/help-content-*.js` (×4), `assets/changelog-content-*.js` (×4), `tests/40-i18n-parity.test.js`, `tests/29-01-crashlog-capture.test.js`, plus `.planning/REQUIREMENTS.md`/`ROADMAP.md`/`43-*`. These are in D-22's allowlist and MUST be updated; 51 historical artifacts must NOT. | D-22 replace-all + before/after grep post-condition |

**Note on D-22 vs the "no comments" constraint:** the hard constraint forbids touching comments for *hygiene* purposes (phase/decision/plan-ID traceability — Phase 44's job). D-22's replace-all edits comments only to update a **renamed filename token** (e.g. `tests/39-help-integrity.test.js` → `help-integrity.test.js`) — a mechanical path rename, explicitly authorized by D-22's allowlist (which includes `assets/**`). These are distinct; Phase 43 changes no phase/decision/plan-ID citation. Flag this to Ben so the two rules aren't seen to collide.

## Common Pitfalls

### Pitfall 1: `--grep` for the gate decision
`git log --grep='^Help-Unaffected:'` false-matches trailer-looking lines inside commit-body code blocks (VERIFIED). Use `%(trailers:key=…,valueonly,only)` for all gate logic. Warning sign: a push passes with a `Help-Unaffected` that was actually pasted example text.

### Pitfall 2: D-22 substring collision
Naively normalizing `39-help-integrity` → `help-integrity` FIRST, then `42_1-help-integrity` → `help-integrity-locale`, corrupts because `help-integrity` is a substring of `help-integrity-locale`. **Anchor each replace on the FULL old token** (`39-help-integrity`, `42_1-help-integrity`, `42-changelog-integrity`, `42_1-changelog-integrity-locale`, `28-04-integrity-state`) — VERIFIED none of the five old names is a substring of another, so full-token replacement is collision-free. Run the before/after grep (D-22).

### Pitfall 3: CI range degeneracy on `main`
`merge-base(after, origin/main)` is degenerate in CI-on-main (Q-A). Use tip-only `${after}^..${after}` for the benign all-zeros/missing-object case, and consider a deploy-baseline range to close the cancel-in-progress hole.

### Pitfall 4: `origin:true` breaks a naive release check
The v1.0 entry has no `highlights` (VERIFIED `changelog-content-en.js:150-157`). The release-moment check (D-08) must special-case `origin:true` — only assert `highlights` non-empty on non-origin entries.

### Pitfall 5: Trailing-newline / sort churn in `HELP-MAP.md`
See Q-I. Without canonicalization the freshness invariant flaps on cosmetic diffs and trains people to ignore it.

### Pitfall 6: hooksPath inert without `npm install`
A committed `.githooks/pre-push` does nothing until `prepare` runs (VERIFIED: hooksPath currently `.git/hooks`). The RED/GREEN test must invoke `node scripts/docs-gate.js` directly, not rely on the hook firing.

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Parse trailers over a range | A `%B` body regex splitter | `git log --format='%(trailers:key=…,valueonly,only)'` | Git's parser correctly scopes to the trailer block, ignores code-block decoys (VERIFIED) |
| Load `HELP_CONTENT_EN` without a bundler | A regex/AST extractor | The existing `vm`-sandbox loader (`39-help-integrity.test.js`) | Runs the real file; zero deps; already trusted |
| Isolate a throwaway test repo | Hand-managed HOME | `GIT_CONFIG_GLOBAL=/dev/null` + `mkdtempSync` + bare origin | VERIFIED isolation; offline; self-cleaning |
| Detect the range | Guess from `HEAD` | `pre-push` stdin `<remote ref> <remote sha>` (local) / `before..after` w/ deploy-baseline (CI) | Handles first-push, non-current-branch, stale tracking ref |

## Validation Architecture

Nyquist validation is **enabled** (`config.json: "nyquist_validation": true`). The project's standing rule — *runtime-behavior code requires falsifiable behavior tests written BEFORE implementation* — is D-21, applied directly.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bespoke node runner — `node tests/run-all.js`; each `tests/*.test.js` is a standalone `exit 0/1` process (`run-all.js:62-86`) |
| Config file | none (glob discovery; zero registration) |
| Quick run command | `node tests/<the-new-gate-test>.test.js` and `node scripts/docs-gate.js --range <r>` |
| Full suite command | `npm test` (164 live `.test.js` files today — correct `TESTING.md`'s stale "106") |

### GATE-01..04 → observable behavior + sampling rate
| Req | Observable behavior that PROVES it | How proven | Sampling rate |
|-----|-----------------------------------|-----------|---------------|
| **GATE-01** (blocks, doesn't warn) | RED case: a staged user-facing change with no changelog entry → gate `exit ≠ 0` with a message naming the file+topics. GREEN case: add the entry/trailer → `exit 0`. | D-21 RED/GREEN throwaway-repo test (Q-H); invariants module unit-exercised by renamed integrity tests | Per commit (quick: run the gate test) + per push (hook) + per deploy (CI) |
| **GATE-02** (layered) | (i) `.githooks/pre-push` fires after `npm install` sets hooksPath (`git config core.hooksPath` → `.githooks`); (ii) CI step present in `deploy.yml` before "Prepare deploy directory" and `exit 1`s on breach; (iii) `CLAUDE.md` DoD line present. | Static presence assertions + the live v1.3 CI run going through the new step; manual `git config` check post-install | Per deploy (CI); once at wiring time (hook + DoD) |
| **GATE-03** (written def + escape hatch) | The role table (denylist/satisfier/trigger) exists and is self-consistent (D-17 invariant #4 — no path both denylisted and covered); each of the 3 trailers demonstrably flips a BLOCK to PASS. | Invariant #4 self-test (its own `{slug}.test.js` per D-23, or gate self-test); trailer cases in the RED/GREEN test | Per commit (invariant runs first, D-17) |
| **GATE-04** (release moment + live ship) | `APP_VERSION` change in range with a matching non-empty-`highlights` entry → PASS; missing entry → BLOCK; `origin:true` tolerated. AND v1.3.0's actual push to `main` goes **green** through the new CI step. | Release-moment branch in the RED/GREEN test + the live v1.3 ship (a passing push proves it doesn't false-block; the RED test proves it *can* block) | Per release push (CI); the milestone-closing ship is the one-time live proof |

### Sampling rationale (Nyquist)
- **Per task commit:** the local hook + `node scripts/docs-gate.js` give sub-second feedback — high enough sampling that no user-facing change reaches a push unexamined.
- **Per push / per deploy:** the CI step is the unbypassable Nyquist floor — every shipped change is sampled exactly at the deploy boundary, which is the event GATE-04 cares about.
- **Phase gate:** full `npm test` green (incl. the renamed integrity tests carrying the D-17 invariants) before `/gsd-verify-work`.

### Wave 0 Gaps (write BEFORE implementation — D-21)
- [ ] `tests/docs-gate.test.js` (name per D-23, no phase prefix) — the RED/GREEN behavior test (Q-H). Write first; it fails RED until `scripts/docs-gate.js` lands.
- [ ] Invariant #4 role-table test — either its own `{slug}.test.js` (e.g. `tests/docs-gate-role-table.test.js`) or folded into the gate self-test (Claude's Discretion).
- [ ] Adjust `tests/42_1-help-integrity.test.js` (→ `help-integrity-locale.test.js`) — delete the covers-parity block (lines 244-248) as part of D-20 (RED until locale `covers[]` stripped).
- [ ] Shared invariants + loader module in `scripts/lib/` — exercised by the renamed `help-integrity.test.js` / `changelog-integrity.test.js`.

## State of the Art

| Old approach | Current approach | Impact |
|--------------|------------------|--------|
| Changelog-required gates via PR-body labels / bot checks (Kubernetes, Rust) | Path-based file gate + git trailers welded to commits (this phase) | No bot, no forkable PR-body state; the justification travels with the commit (D-14) |
| Waiver ledger file | Git trailer per commit | Cannot drift from what shipped; hook and CI read the identical thing (D-14) |
| `covers[]` duplicated ×4 locales | EN-canonical metadata, no locale sibling (D-20) | Removes a whole class of parity churn |

## Decision Conflicts

**None — all 23 decisions are implementable as locked.**

Two items need a **plan-time choice within Claude's Discretion** (explicitly delegated by CONTEXT — the role table and the merge-base fallback), NOT amendments to any locked decision:

1. **Role-table file-type scope (Q-F).** D-05 literally scopes `assets/**`, which includes 8 CSS files + fonts/images/JSON that no `covers[]` can name. The gate needs an explicit watched-type policy. Recommended: watch `*.html` + `assets/*.js` + `*.css` + `manifest.json` + `sw.js`; extend the denylist to `assets/landing.css` + `assets/demo.css` (D-06's own "one surface" logic); treat fonts/images/JSON as non-user-facing-by-type; `.gitignore` or denylist `.DS_Store`. This operationalizes D-05/06/07 — it does not contradict them.

2. **CI range baseline (Q-A).** D-04's "merge-base against origin/main" is right for the local hook but degenerate in CI-on-main, and `cancel-in-progress` can skip a range. Recommended: tip-only fallback for all-zeros, and (optionally) a deploy-branch baseline to close the cancel hole. This refines D-04's planner note — the decision text ("fail closed; handle all-zeros explicitly") is honored exactly.

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | Tip-only (`after^..after`) is an acceptable benign fallback for the all-zeros/missing-object CI case | Q-A | If Ben wants the *entire* first-push evaluated, a different fallback is needed — but all-zeros to `main` is essentially non-recurring here |
| A2 | Deploy-baseline range (to close the cancel-in-progress hole) is worth the extra complexity | Q-A | If not adopted, a rapid mid-milestone double-push can skip a range; low frequency, mitigated by local hook + PR discipline |
| A3 | CSS should be watched but landing/demo CSS denylisted; fonts/images/JSON not watched by type | Q-F | If Ben wants literal D-05 (all `assets/**`), every image/font edit needs a trailer — noisier but safe |
| A4 | `npm ci` runs `prepare` | Q-E | Cloud Claude Code uses `npm install` (which definitely runs it), so the gate installs regardless |

## Open Questions

1. **Role-table watched types** — see Decision Conflicts #1. Recommend deciding with Ben at plan/discuss time; the 37-file table (Q-F) is the input.
2. **CI range baseline** — see Decision Conflicts #2. Recommend the deploy-baseline variant; confirm Ben accepts the added shell.
3. **Invariant #4 home** — own `{slug}.test.js` vs gate self-test (Claude's Discretion, D-17). Recommend a tiny `tests/docs-gate-role-table.test.js` so `npm test` catches role-table drift independently of a push.

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| node | gate script, tests | ✓ | ≥ 18 (`engines`) | — |
| git | range + trailers | ✓ | 2.50 local / ≥2.43 CI | — |
| `%(trailers:…,only)` | trailer read | ✓ | needs git ≥ 2.20 | — (both envs exceed) |
| jsdom | NOT needed by gate | ✓ (devDep) | ^29.1.1 | gate uses `vm` only |

No missing dependencies.

## Sources

### Primary (HIGH confidence — tool-verified this session)
- Local git 2.50 experiments: trailer range read, code-block decoy, throwaway-repo isolation, all-zeros test — the Tier-1 backbone.
- `node` enumeration of `help-content-en.js` via the `vm` loader — the 23-path index and 37-file uncovered blast radius.
- Live source read: `deploy.yml`, `package.json`, `tests/39-help-integrity.test.js`, `tests/42_1-help-integrity.test.js`, `tests/run-all.js`, `assets/changelog-content-en.js`, `.claude/hooks/pre-commit`, `assets/version.js`, `CLAUDE.md`, `.planning/config.json`, grep of `assets/*.js` for `covers`.

### Secondary (MEDIUM — docs)
- npm scripts lifecycle (`prepare` triggers), git `core.hooksPath` relative-path resolution, git `pre-push` stdin protocol, GitHub Actions push-event payload (`before`/`after`/all-zeros).

### Tertiary (LOW — surfaced for failure modes only, not adopted)
- changesets, towncrier, Kubernetes release-note, Rust `relnotes` — prior-art self-trip patterns (Q-K).

## Metadata

**Confidence breakdown:**
- Gate mechanics (trailers, stdin, vm loader, prepare): **HIGH** — verified by execution.
- Uncovered-file sizing (37 files): **HIGH** — computed from live source.
- CI range/cancel-in-progress edge: **MEDIUM** — behavior is certain; the *recommended fix* is a discretionary design choice needing Ben's sign-off.
- Role-table file-type policy: **MEDIUM** — a real decision the plan must make; research sizes it but does not pre-decide it.

**Research date:** 2026-07-10
**Valid until:** ~2026-08-10 (stable; git/npm semantics don't move. The `covers[]`/uncovered numbers are a live snapshot — re-run the enumeration if help content changes before planning.)

## RESEARCH COMPLETE
