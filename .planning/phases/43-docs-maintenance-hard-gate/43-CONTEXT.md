# Phase 43: Docs-Maintenance Hard Gate - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the **docs-maintenance hard gate**: repo tooling (not app code) that makes it impossible to ship a user-facing change without (a) a changelog entry and (b) updated help topics — or an explicit, logged declaration that help is unaffected. Three layers: a committed `.githooks/pre-push` (fast local preview), a **CI step in `deploy.yml`** (the unbypassable layer), and a **GSD definition-of-done layer** (invariants + a written DoD rule in `CLAUDE.md`). Governed by a written, path-based definition of "user-facing change" with a loud, logged emergency escape hatch. Validated by an automated RED/GREEN behavior test **and** v1.3.0's own live ship (GATE-01..04).

Three supporting deliverables fall out of the gate's needs. Each is here because the gate is unsound or dishonest without it — not because the phase is tidying up:

1. **`covers[]` backfill + de-duplication** (D-19, D-20) — extend existing help topics' `covers[]` so the path→topic index isn't leaky, and **strip `covers[]` from the three translated help files** (repo metadata, EN-canonical, never translatable content).
2. **`HELP-MAP.md`** (D-13) — a generated, freshness-checked extract (section → topic → title → covers[]) so an agent can locate "where does this belong in help?" without reading the help corpus.
3. **Test rename pass** (D-22) — the phase already forces the 42.1 parity tests to change and consolidates invariants into the `*-integrity` family. Drop the phase-number prefixes from the five standing guards. **The `CONVENTIONS.md` naming rule is deliberately NOT written here** (D-23) — Phase 44 rewrites that file once, coherently, alongside the comments rule.

**Not this phase:**
- Authoring any new help topic prose (`reporting.html`, `tour.js`, `whats-new.js` remain uncovered — deferred).
- Adding the 166-file `npm test` suite to CI (deferred; D-17 already makes the gate's invariants unbypassable without it).
- An "Unreleased" changelog entry convention (rejected, D-09).
- Gating the pre-prod branch (deferred until that infra lands).
- Any change to app runtime behavior, the What's-New popup, or the changelog page rendering.
- **Anything about comments, phase IDs, decision IDs, or `CONVENTIONS.md` content.** Ben, 2026-07-10: *"let's push this one as well to phase 44 with everything talking about comments and phase ids and so on. But I want phase 44 to properly remove everything FINALLY."* That work — a ~680-line retrofit across ~43 shipped files, plus the `CONVENTIONS.md` contradiction that causes it, plus its own forward gate — is fully seeded in `.planning/todos/pending/2026-07-10-comment-hygiene-retrofit-and-forward-gate.md`. **Phase 43 must not touch a single comment.**

**Planning guidance from Ben (2026-07-10):** this phase widened three times during discussion and he accepted each widening on one condition — *"split to subagents properly, plan it better upfront and it's all fine."* The planner should decompose aggressively into parallelizable plans with clean file boundaries (gate script / rename pass / covers[] backfill / HELP-MAP generator / docs), not a single serial thread.

</domain>

<decisions>
## Implementation Decisions

### Trigger point & evaluation unit

- **D-01: `pre-push` only — no `pre-commit` hook.** Every GSD phase produces 5–15 atomic commits (one per task, by `gsd-executor`). A `pre-commit` changelog gate would block task 1 of 8 with no human present to unblock it, forcing a blanket waiver and normalizing exactly the `--no-verify` culture GATE-03 forbids. `pre-push` sees the finished branch — the same view CI has — so the local hook is a *fast preview of the CI verdict*, running the **same script** with the **same range semantics**, never a second, stricter rule.
- **D-02: The unit is the push range, judged as a whole.** Local: `origin/main..HEAD`. CI: the push's `before..after`. Commit 3 may touch `assets/help.js` and commit 11 may add the changelog entry — the push passes. There are **no per-commit ordering rules**.
- **D-03: `main` only.** Pushes to other branches skip the local hook entirely (work-in-progress and spike branches stay frictionless — nothing ships from them). The pre-prod branch (open infra todo, commit `d037b17`) gets the gate later, deliberately.
- **D-04: Fail closed everywhere.** Any error — unparseable `changelog-content-en.js`, a `node` throw, a missing baseline SHA — exits non-zero in **both** the hook and CI. A gate that passes when it is broken is not a gate. The escape hatch (D-14) is the pressure-release valve, not a silent crash. *Planner note: the all-zeros `before` SHA (first push / force-push) is a known-benign case; handle it explicitly (fall back to merge-base against `origin/main`) rather than letting it become a fail-closed surprise.*

### Definition of "user-facing change" (GATE-03)

- **D-05: Broad + explicit denylist.** Everything `deploy.yml` ships counts: `*.html`, `assets/**`, `manifest.json`, `sw.js`. A short **written denylist** carves out what is genuinely not user-feelable. This fails *safe*: a file added in a future phase is user-facing until someone says otherwise. Rejected: a `covers[]`-only rule (leaky — `app.js`, `add-session.js`, `sessions.js`, `tour.js` are claimed by zero topics) and a hand-curated allowlist (fails open; nobody remembers to extend it).
- **D-06: Denylist = legal + marketing surfaces, pages *and* their scripts.**
  - Pages: `impressum*.html` (×4), `datenschutz*.html` (×4), `disclaimer*.html` (×4), `landing.html`, `demo.html`
  - Scripts: `assets/landing.js`, `assets/demo.js`, `assets/demo-seed.js`, `assets/disclaimer.js`, `assets/i18n-disclaimer.js`
  - Rationale: a page and its script are one surface; gating `landing.js` while ignoring `landing.html` is incoherent. Legal pages change for legal reasons, not product reasons.
  - **Vendor bundles (`jspdf.min.js`, `jszip.min.js`, `bidi.min.js`) are NOT denylisted** — deliberately. A jsPDF upgrade changes real PDF output users see; that is the easiest change to forget to mention.
  - Note: `landing.html` currently appears in `topic-trial`'s `covers[]`. It stays in `HELP-MAP.md` (the map reflects the corpus); the gate simply never fires on it. Leave the `covers[]` entry alone.
- **D-07: Satisfiers are never triggers.** `assets/help-content-*.js` edits **satisfy** the help requirement (they *are* the help update). `assets/changelog-content-*.js` edits **satisfy** the changelog requirement. Neither ever raises a demand of its own — otherwise editing help to pass the gate trips the gate, forever. This is a *role rule in the gate script*, not a denylist entry: those files are still watched by the invariants (D-17).

### What satisfies the gate

- **D-08: Two changelog rules, both mechanical, no schema change.**
  - *Ordinary push:* a user-facing change must also edit `assets/changelog-content-en.js` (append a bullet to the current version's entry as you go), **or** carry a `Changelog-Unaffected:` trailer (D-14).
  - *Release push:* if `APP_VERSION` in `assets/version.js` changed in the range, an entry for **exactly that version** must exist, with a non-empty `highlights` array and a `date`. This is GATE-04's release-moment hook. *Must tolerate the `origin: true` v1.0 entry, which deliberately has no `highlights`.*
- **D-09: REJECTED — an `unreleased: true` entry convention.** Conceptually cleanest, but the real cost is a schema change plus render suppression in *both* the page and the popup, plus per-locale integrity-test churn across all four 42.1 locale files. The v1.3.0 entry already exists; the next milestone opens its entry early.
- **D-10: The gate never semantically diffs help content.** *Ben's directive:* the checker must not read the help corpus to infer whether something changed. Relevance is decided **from the phase scope, by Ben and Claude together**, at plan/execute time. The gate's job is to **force that decision to be made and recorded** — never to guess it. Mechanically it is a presence check (`covers[]` reverse index) plus an explicit declaration.
- **D-11: Help satisfaction = touch the claiming topic, or declare.** For each changed, non-denylisted, non-satisfier path: the push must contain an edit to a topic that names it in `covers[]`, **or** a `Help-Unaffected:` trailer (D-14).
- **D-12: An uncovered changed file BLOCKS.** *"`assets/tour.js` is covered by no help topic. Add it to a topic's `covers[]`, or declare `Help-Unaffected: assets/tour.js — reason`."* This is the anti-rot engine: over time the gate teaches the help corpus to grow coverage. Accepted cost: until a file earns a topic, touching it needs one trailer line. Rejected: vacuous-pass for uncovered files (would permanently exempt the app's five biggest files) and a committed coverage-debt list (a second artifact to keep honest).

### The extract (Ben's requirement: never read the whole help corpus)

- **D-13: Gate prints the relevant slice, AND a generated `HELP-MAP.md` is committed.**
  - *The gate's failure message names the topics itself*, e.g.:
    ```
    BLOCKED: 2 changed files have help topics that weren't updated

      assets/settings.js
        → topic-date-format      "Choosing how dates look"
        → topic-session-formats  "Your session formats"
      add-session.html
        → topic-new-session      "Logging a session"

      Update one of these topics, or declare:
        Help-Unaffected: <file> — <reason>
    ```
  - *`HELP-MAP.md`* — generated by a script from `assets/help-content-en.js`; a plain table of section → topic → title → `covers[]`. An agent planning a phase reads the map **cold, before writing code**, without running anything.
  - **The gate asserts the committed map matches a fresh regeneration** (D-17). Drift is impossible.
  - Neither route ever reads help *prose*. Only `covers[]` metadata is parsed. The four locale bodies are never touched by the gate.

### The declaration & the escape hatch

- **D-14: Three distinct git trailers, deliberately different in cost.** No shared prefix — each key states its own job, and each is independently greppable with `git log --grep`.
  ```
  Help-Unaffected: assets/settings.js — internal refactor, no visible behavior change
  Changelog-Unaffected: assets/settings.js — internal refactor
  Docs-Emergency-Skip: hotfix for broken activation; entry backfilled same day
  ```
  - The two `*-Unaffected:` trailers are **cheap and expected**, not emergencies. Per D-10, "unaffected" is a normal outcome of scoping a phase.
  - `Docs-Emergency-Skip:` is **loud**. CI honors it but prints a large banner naming the commit, the reason, and every skipped file. A script can list every emergency skip in history on demand.
  - Rejected: a `Docs-Gate:` prefix carrying a typed payload — the prefix carries no information, the payload does all the work, and the emergency case must not look identical to the routine one.
  - Rejected: a waiver-ledger file. A trailer is *welded to the commit it justifies*. It cannot drift from what shipped, cannot be retroactively edited without rewriting history, and the hook and CI read the identical thing (the same commit range). A ledger row can say "n/a" and pass.
  - `--no-verify` bypasses the local hook by design and leaves no trace; that is precisely why **CI is the enforcement layer** and honors only the trailers.

### Layer wiring

- **D-15: `npm prepare` installs the hook.** `package.json` gains `"prepare": "git config core.hooksPath .githooks"`. It runs automatically on `npm install` — which anyone running the test suite already does, including cloud Claude Code on a fresh clone. Does **not** violate zero-build: `package.json` is already a test-only workbench, never shipped. *Blocker to clear:* `core.hooksPath` is currently pinned to `.git/hooks`, so a committed `.githooks/` is inert until this runs.
- **D-16: Delete `.claude/hooks/pre-commit`.** Tracked, but dead: it auto-bumped `sw.js` `CACHE_NAME`, obsolete since `CACHE_NAME` began auto-deriving from the deploy-stamped `INTEGRITY_TOKEN`. It is not installed (nothing lives in `.git/hooks`). Leaving a dead hook next to a new live one is how the new one gets ignored.
- **D-17: The gate script runs its own invariants first, from a shared module. There is NO `43-docs-gate.test.js`.**
  - The gate really has two kinds of rule. The **push-range rule** needs a git diff (D-02). The **invariants** need only the files on disk:
    1. `HELP-MAP.md` matches a fresh regeneration from `help-content-en.js`
    2. every path named in any `covers[]` exists on disk (a rename/delete leaves a dangling claim, and the gate would point at a file that isn't there)
    3. changelog entries have unique versions, non-empty `highlights`, real dates
    4. the denylist / satisfier / trigger role table neither overlaps nor contradicts itself
  - The invariants live in **one shared module**. The gate script calls it **before** the push-range rule and fails closed on any breach — so **CI gets the invariants for free**, in the step it already runs. Same "one implementation, two callers" shape as D-01.
  - The **same module** is exercised by the test suite, so `npm test` and `gsd-verifier` still catch drift locally. Per D-22's consolidation, those assertions live in the renamed `help-integrity.test.js` and `changelog-integrity.test.js`, plus one small file for the role table (invariant 4) beside the gate script. **No third `help-changelog-integrity.test.js`** — three files whose names differ only in which nouns they list would be unnavigable.
  - Plus a written DoD line in `CLAUDE.md` (the file every agent reads at session start): *a phase is not done until the changelog entry exists and affected help topics are updated or declared unaffected.*
  - Rejected: a GSD `ship:pre` loop hook — it only fires if `/gsd-ship` is used, it lives in GSD config rather than the repo (a fresh clone doesn't get it), and it re-runs what CI runs minutes later.
- **D-18: CI = the gate step only, and that is now sufficient.** Add one step to `.github/workflows/deploy.yml`, placed **before** "Prepare deploy directory" so a failing push never even stages. Mirror the existing "Verify no sensitive files" idiom: inline shell, loud `echo`, `exit 1`, no external action.
  - Because of D-17, the invariants run inside the gate script, so they are **unbypassable in CI** without the 166-file suite ever touching the deploy path.
  - Adding `npm test` to CI remains **deferred** — a second capability with its own failure modes (a flaky jsdom test blocking a hotfix deploy). *`deploy.yml` currently runs no tests at all.*

### The `covers[]` backfill (Ben's directive)

- **D-19: Metadata-only backfill — extend existing topics' `covers[]`, author no new prose.** `topic-new-session` covers `sessions.html` and `add-session.html` but not `assets/sessions.js` / `assets/add-session.js` — those files aren't *uncovered*, the topic that describes them simply never named the scripts behind the pages. Backfill: add each covered page's script(s), and assign obvious module owners (`assets/date-format.js` → `topic-date-format`, and so on). `covers[]` is metadata; this costs no translation work.
- **D-20: `covers[]` becomes EN-only — strip it from `help-content-{he,de,cs}.js`.** *Ben, verbatim:* "I don't want to save up on better design… the entire help is always 4 languages going forward, so I see no reason why we need this translated — better to fix this now than in the future." It is currently duplicated ×4 (34 entries in each file). The gate reads **only `assets/help-content-en.js`** (EN-canonical, per Phase 42 D-17). *Planner must handle:* the 42.1 per-locale integrity tests assert EN↔locale structure parity and will need adjusting, and `assets/help.js` must be checked for any runtime read of `covers[]` (expected: none).

### GATE-04 validation

- **D-21: Automated RED/GREEN behavior test, written BEFORE the gate script exists, plus the live v1.3.0 push.** The test builds a throwaway git repo in a temp dir, stages a user-facing change with no changelog entry, runs the real gate script, and asserts it exits non-zero with the right message; then adds the entry and asserts it passes. Then v1.3.0's actual push to `main` must go green through CI. *A gate that always passes also ships green — a passing push proves nothing about whether the gate can block.* This honors the project's standing rule: runtime-behavior code requires falsifiable behavior tests before implementation.

### Test naming & the rename pass

- **D-22: Rename the five standing guards, drop the phase prefixes, replace-all on LIVE FILES ONLY.**

  | Former name | Current name |
  |---|---|
  | `39-help-integrity.test.js` | `help-integrity.test.js` |
  | `42-changelog-integrity.test.js` | `changelog-integrity.test.js` |
  | `42_1-help-integrity.test.js` | `help-integrity-locale.test.js` |
  | `42_1-changelog-integrity-locale.test.js` | `changelog-integrity-locale.test.js` |
  | `28-04-integrity-state.test.js` | `update-integrity-state.test.js` |

  - **Breakage risk is nil, and this was verified, not assumed.** Nothing `require()`s a test file; nothing reads one by path; `tests/run-all.js` discovers `tests/*.test.js` by glob. Every reference in the repo sits inside a comment (sole exception: a `console.error` hint string in `42-changelog-integrity.test.js` that prints its own name).
  - **The 28-04 rename is deliberate scope-widening, agreed by Ben.** "Integrity" currently means two unrelated things in this repo: static content-schema integrity (help/changelog) and the runtime deploy-token integrity state machine. Disambiguate it.
  - **`live files only` is an allowlist, not a judgment call.** Replace-all runs ONLY in: `assets/**`, `tests/**`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/codebase/*.md`, `CLAUDE.md`, `README.md`, and this phase's own `.planning/phases/43-*/` directory.
  - **51 historical artifacts stay untouched** — every `*-PLAN.md`, `*-SUMMARY.md`, `*-RESEARCH.md`, `*-PATTERNS.md`, `*-REVIEW.md`, `*-VERIFICATION.md`, `*-VALIDATION.md`, `*-SECURITY.md` under `.planning/phases/` (phases ≠ 43) and everything under `.planning/milestones/`. A SUMMARY saying *"created `tests/42_1-help-integrity.test.js`"* is a true statement about a past event; rewriting it makes the record claim an executor did something it did not do.
  - **Post-condition, asserted as a plan task (this is where the conviction comes from):** after the rename, `grep -rl <old-name>` across the repo must return **exactly** the 51 historical artifacts — no more (a live file was missed), no fewer (a historical file was clobbered). Run it before and after; diff the sets.
  - **A rename map goes in `.planning/codebase/TESTING.md`** so anyone landing on an old SUMMARY can follow the name forward. The map is itself docs maintenance.

- **D-23: The test-naming rule is LOCKED but written in Phase 44, not here.**
  - The rule Ben locked (2026-07-10): **`{slug}.test.js`, named for the behavior or mechanism it guards.** No phase, no plan number. Provenance lives in git — `git blame` gives the commit, the commit message gives `docs(39):`, the phase artifacts give the reasoning. It replaces `CONVENTIONS.md` line 40 outright rather than adding an exception.
  - The rule is not invented here — `pdf-bidi`, `pdf-bold-rendering`, `pdf-digit-order`, `pdf-glyph-coverage`, `pdf-latin-regression`, `snippet-prefix-backup-roundtrip` and `sw-precache-cache-reload` already do exactly this by instinct. The convention was real and unwritten, which is why `39-help-integrity.test.js` got a number it shouldn't have.
  - The ~160 existing numbered files are **legacy, not wrong.** They get renamed only when a phase touches them anyway.
  - **Why Phase 44 writes it:** Phase 44 must rewrite `CONVENTIONS.md` §Comments regardless (that section is the root cause of the comment-ID regression — see the seed). Two phases editing the same file days apart, each landing half a rule, is how conventions files start contradicting themselves. Phase 43 renames the files and records the map in `TESTING.md`; Phase 44 writes the rule.
  - **Phase 43 must not edit `.planning/codebase/CONVENTIONS.md`.**

### Claude's Discretion

- Exact denylist/satisfier/trigger **role table** implementation — Ben set the principle (D-05/D-06/D-07); the concrete file→role mapping is written into the gate script's documented definition for review at plan time.
- Gate script **language and location** — plain `node` (matching `tests/`) or `bash`; likely `scripts/docs-gate.js` + a thin `.githooks/pre-push` shim, so hook and CI invoke one shared implementation (GATE-02's "shared script"). The invariants module (D-17) sits beside it.
- `HELP-MAP.md` **location and exact table shape** — repo-root vs `.planning/`; must be readable cold by an agent and diff-friendly.
- The `HELP-MAP.md` **generator's** home (likely `scripts/`) and whether it doubles as the invariants module's regeneration source.
- The **merge-base fallback** implementation for an all-zeros baseline SHA (D-04).
- Precise **trailer parsing** rules — case sensitivity, multiple trailers per push, which commit in the range they may live in (recommend: any commit in the range).
- Wording of the `CLAUDE.md` DoD line (D-17) and of the written "user-facing change" definition (GATE-03) — both are contracts; keep them short and checkable. *(The `CONVENTIONS.md` naming rule is Phase 44's to write — D-23.)*
- Whether the role-table invariant (D-17 #4) warrants its own test file or folds into the gate script's own self-test.
- The name of the new role-table test file, if one is created — it must follow D-23's rule (`{slug}.test.js`, no phase number) even though the rule isn't yet written down.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §Docs-Maintenance Hard Gate — GATE-01..04, the four locked requirement contracts.
- `.planning/ROADMAP.md` §Phase 43 — goal, the four success criteria, and the §11.4 sequencing note (scaffold-early / enforce-at-close is permitted; final enforcement must be HARD and validated on a live ship).

### The two data sources the gate parses
- `assets/help-content-en.js` — **the gate's only help input.** Header comment documents the schema; `covers[]` (Phase 39 D-24) was built to seed this gate. 34 topics, currently naming 22 distinct repo paths.
- `assets/changelog-content-en.js` — **the gate's only changelog input.** Header comment documents the entry schema; `highlights` (Phase 42 D-08) was built as this gate's hook. Reverse-chronological, unique `version` + `anchor` per entry, `origin: true` for the contentless v1.0 marker (no `highlights` — the release-moment check must tolerate this).
- `assets/version.js` — `APP_VERSION` (currently `'1.3.0'`, line ~27) is the hand-set release moment (GATE-04). `INTEGRITY_TOKEN` is deploy-stamped and **irrelevant to this gate** — do not confuse the two.

### The surfaces being modified
- `.github/workflows/deploy.yml` — runs on push to `main`; steps are checkout → Prepare deploy directory → **Verify no sensitive files** (the idiom the gate step should mirror: plain shell, loud `echo`, `exit 1`) → Push to deploy branch → Purge CF cache. **Runs no tests today.** Insert the gate step before "Prepare deploy directory".
- `package.json` — test-only workbench (`"test": "node tests/run-all.js"`, sole devDependency `jsdom`). Gains `"prepare"` (D-15).
- `.claude/hooks/pre-commit` — tracked, dead, **delete** (D-16).
- `CLAUDE.md` (repo root) — gains the written DoD line (D-17).
- `.planning/codebase/TESTING.md` — gains the rename map (D-22). Note its "106 test files" figure is stale; there are 167.
- `.planning/codebase/CONVENTIONS.md` — **read for context, DO NOT EDIT.** Phase 44 owns it (D-23).

### Prior phase contracts
- `.planning/phases/42-in-app-changelog-what-s-new/42-CONTEXT.md` — D-08 (`highlights` hand-picked, "the Phase 43 gate can check the field exists"), D-17 (per-locale data files, EN canonical — the precedent D-20 extends), D-03 (curated artifacts, never commit archaeology).
- `.planning/phases/39-help-center-entry-point/39-CONTEXT.md` — its D-24 (`covers[]` seeds this gate), D-18 (content-file pattern), D-25 (the integrity-test substrate).
- `.planning/todos/pending/2026-07-10-comment-hygiene-retrofit-and-forward-gate.md` — **the Phase 44 seed.** Read it only to confirm what Phase 43 must NOT do: touch comments, phase IDs, decision IDs, or `CONVENTIONS.md`.

### Tests
- `tests/39-help-integrity.test.js` → **`help-integrity.test.js`** (D-22) — the static integrity gate for `help-content-en.js`; its header enumerates the invariants (incl. assertion 5: "every topic has … a non-empty `covers` array"). **Gains the help invariants from D-17.** Loads production JS into a `vm` sandbox — no jsdom needed.
- `tests/42-changelog-integrity.test.js` → **`changelog-integrity.test.js`** (D-22) — the changelog schema gate. **Gains the changelog invariants from D-17.** The release-moment check (D-08) must not duplicate what this already asserts.
- `tests/42_1-help-integrity.test.js` and `tests/42_1-changelog-integrity-locale.test.js` — **assert EN↔locale structure parity; D-20 requires adjusting them.** Read before touching the locale files. Renamed per D-22.
- `tests/28-04-integrity-state.test.js` — unrelated domain (the runtime deploy-token state machine); renamed only to disambiguate the word "integrity" (D-22).
- `tests/run-all.js` — auto-discovers top-level `tests/*.test.js`, runs each as an isolated child process, exits non-zero if any file fails. `tests/_helpers/` is excluded. **Glob-based: renames are invisible to it.**
- `.planning/codebase/TESTING.md` — assertion style, the `vm`-sandbox idiom, run commands.

### Conventions & constraints
- `.planning/codebase/CONVENTIONS.md` — zero-build / zero-npm for production code; test naming (line 40, Phase 44 replaces it); §Comments (line ~150, Phase 44 rewrites it). **Phase 43 reads this file and edits nothing in it.**
- `CLAUDE.md` (repo root) — the mandatory `git pull` at session start; gains the DoD line.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`covers[]` reverse index** — the gate's core lookup already exists as data. 34 topics in `help-content-en.js` name 22 distinct paths. Inverting it (path → topics) is a few lines; no new metadata format is needed.
- **`highlights` field** — every content changelog entry carries a hand-picked 2–4 string array (Phase 42 D-08), built precisely so the release-moment check has something non-empty to assert. The `origin: true` v1.0 entry deliberately has none.
- **"Verify no sensitive files" step in `deploy.yml`** — the exact shape the gate's CI step should copy: inline shell, loud `echo`, `exit 1` on failure, no external action.
- **`tests/39-help-integrity.test.js` `vm`-sandbox loader** — loads `assets/*.js` into a sandbox with a fake `window` and reads the registered globals. The gate script and its invariants module can reuse this to parse `help-content-en.js` and `changelog-content-en.js` without a bundler.
- **`tests/run-all.js` auto-discovery** — glob-based; renaming and adding test files needs no wiring.

### Established Patterns
- Zero-build, zero-npm for shipped code; `package.json` + `node_modules` exist *only* for the test workbench. Node is available in CI (`ubuntu-latest`) and locally.
- Behavior tests before implementation (project rule; see D-21).
- EN-canonical content files with translated siblings (Phase 42 D-17) — D-20 sharpens this: *metadata* doesn't get a sibling at all.
- One shared implementation, multiple callers (D-01 hook↔CI; D-17 gate↔tests).

### Integration Points
- `.githooks/pre-push` → thin shim → shared gate script. Activated by `core.hooksPath` (D-15).
- `.github/workflows/deploy.yml` → new step invoking the **same** shared gate script with CI's `before..after` range.
- Shared invariants module → called by the gate script (D-17) **and** by the renamed integrity tests.
- `assets/help-content-{he,de,cs}.js` → `covers[]` stripped (D-20); the locale parity assertions adjusted.
- `CLAUDE.md` → the DoD sentence. `CONVENTIONS.md` → the naming rule + comment-hygiene rule. `TESTING.md` → the rename map.

### Landmines
- **`core.hooksPath` is currently set to `.git/hooks`.** A committed `.githooks/` directory is inert until D-15's `prepare` script runs. Verify with `git config core.hooksPath` after `npm install`.
- **`.claude/hooks/pre-commit` is tracked but not installed** and its logic is obsolete. Delete it (D-16) rather than leaving two hook directories.
- **`covers[]` lives in all four locale files** (34 entries each) — D-20 removes three of them; the locale parity tests go red until adjusted.
- **`origin: true` entries have no `highlights`** — the release-moment assertion must special-case this or v1.0 breaks the gate.
- **The gate must not read `INTEGRITY_TOKEN`** — `APP_VERSION` is the release moment; the SW/integrity layer is independent.
- **The rename's replace-all must not touch the 51 historical artifacts** (D-22) — assert with the before/after grep post-condition.
- **`.planning/codebase/TESTING.md` says "106 test files"; there are 167.** Stale figure; correct it while adding the rename map.

</code_context>

<specifics>
## Specific Ideas

- **Ben's framing of the whole gate, in his words:** *"We have to keep both the changelog as well as the help section up to date. And we need to make sure that the agent checking it does not really go through all of the help section, but rather that we make an extract which is always up to date… I don't even think we need to go over what already is in the help section. In order to see if something has changed, we need to decide this based on the scope of the phase we are trying to commit and push. And based on that one we are deciding together if it's relevant for the users."* → D-10 + D-13. The gate is a **forcing function for a human/agent decision**, not an inference engine.
- **Ben's real pain point:** *"When we already decided that it needs to be added to the help or updated within the help section — how do we make it the most efficient to double-check where does it exist in the help section?"* → the gate's failure message answers this directly, by naming the topics. `HELP-MAP.md` answers it ahead of time, at plan time.
- **On `covers[]` duplication:** *"I don't want to save up on better design — from my perspective the entire help is always 4 languages also going forward, so I see no reason why we need this translated. So better to fix this now than in the future."* → D-20. Fix the design flaw while touching the files anyway.
- **On the sessions gap:** *"I think `covers()` should be updated as the sessions must be in the help section."* — correct, and diagnostic: the session files were never *undocumented*, the index just named the pages and not the scripts.
- **On phase numbers in code:** *"I'm not sure if I want the 'when' to be GSD phases in the code."* Then, on being shown the scale: *"I just spent phase 29 or similar to remove exactly these comments from the code!! How can it be we still have it?"* That question triggered the forensic audit, which found the `CONVENTIONS.md` contradiction. Ben then pulled the whole topic out of Phase 43: *"this rule scope is getting a bit big — so let's push this one as well to phase 44 with everything talking about comments and phase ids and so on. But I want phase 44 to properly remove everything FINALLY."* **Phase 43 stays a pure changelog/help gate.**
- **The noise principle that drove D-01, D-11 and D-14:** the gate that annoys you is the gate you disable. `pre-push` over `pre-commit`, aggregate over per-commit, cheap trailers for the expected "unaffected" case, a loud one for the emergency.
- **On conviction:** Ben accepted the live-files-only rename *"as long as we make sure 'on live files only' is with high conviction."* → the before/after grep post-condition in D-22 is that conviction, made executable. A promise is not a mechanism.

</specifics>

<deferred>
## Deferred Ideas

- **New help topics for the genuinely undocumented user surfaces** — `reporting.html` / `assets/reporting.js` is a whole user-facing page with **no help topic at all**; `assets/tour.js` and `assets/whats-new.js` (v1.3's own new surfaces) likewise. Writing these is a Phase-39-sized content effort (new prose × 4 locales, native-speaker gates, Sapir's Hebrew read) and does not belong in a tooling phase. Until then, touching those files costs one `Help-Unaffected:` trailer — which, per D-12, is the gate *asking* for them.
- **Adding `npm test` to CI** (D-18) — `deploy.yml` runs no tests today; the 167-file suite is your only safety net and it currently runs on your laptop or nowhere. Its own infra decision, with its own failure modes (a flaky jsdom test blocking a hotfix deploy). Note D-17 already makes the *gate's* invariants unbypassable without it.
- **The entire comment-hygiene problem → Phase 44.** Seeded in full at `.planning/todos/pending/2026-07-10-comment-hygiene-retrofit-and-forward-gate.md`. Headline findings from the forensic audit run during this discussion:
  - **~680 offending lines across ~43 shipped files** (`assets/**` ships its comments; `deploy.yml` does `cp -r assets`). 335 decision IDs, 278 phase citations, 174 plan citations, 50 requirement IDs, 39 process-framing. One is a **runtime string**: `assets/add-client.js:89` prints `per D-23 (no hard cap)` to the customer's console.
  - **The cleanup Ben remembers was Phases 32 + 36, not 29** — and Phase 36's D-07 (*"no planning ID survives in product code"*) explicitly excluded the three 1,500L+ giants, the vendored bundles, and the `i18n-*` dictionaries. Those exclusions are six of today's top seven offenders. Batch-3 was deferred by design on 2026-07-01 and never scheduled.
  - **Root cause of the regression: `.planning/codebase/CONVENTIONS.md` §Comments still says the opposite** — *"Code comments cite the phase and plan … This is the primary traceability mechanism — do not omit."* Executors weren't ignoring D-07; they were obeying `CONVENTIONS.md`. **46% of the debt was created by phases 39–42.1.** Four files Phase 36 cleaned were re-dirtied on 2026-07-07 (`58db351`, `f99d97f`, `d7ef489`, `c06e2ae`).
  - Phase 44 must kill four things, in order: the `CONVENTIONS.md` contradiction → promote `36-COMMENT-STYLE-GUIDE.md` out of the archive → clean the ~680 lines → **add a forward gate** (no gate is why it decayed). Five load-bearing citations must be reworded, not bare-deleted.
  - **Milestone home undecided** — Ben floated closing v1.3 today after Phase 43 and running this in v1.4. Decide at v1.3 close.
- **Renaming the ~160 remaining numbered test files** (D-23) — legacy, renamed opportunistically when a phase touches them. Not a sweep.
- **Gating the pre-prod branch** (D-03) — the open infra todo (commit `d037b17`: pre-prod branch + second CF Pages project). Extend the branch scope deliberately when that lands.
- **A generated waiver ledger** — a script that reconstructs a readable table of every `*-Unaffected:` / `Docs-Emergency-Skip:` trailer from git history. Rejected as a *mechanism* (D-14), attractive later as a pure read-only view. Costs nothing to add once trailers exist.
- **A committed coverage-debt list** — considered as a middle path for D-12 (uncovered files pass if listed, with a written reason). Rejected: a second artifact to keep honest. Revisit only if the trailer volume becomes genuinely annoying.

### Reviewed Todos (not folded)
The `todo.match-phase 43` scan returned only keyword noise — no pending todo concerns the docs gate. Matches were `2026-03-18-verify-landing-page-translations.md`, `2026-05-13-drag-sort-settings-categories.md`, `2026-05-13-modality-templates.md`, and `2026-06-30-demo-sessions-this-month-utc-undercount.md` (all matched on generic keywords like "settings", "page", "entry", "assets"). All remain pending for their own phases. The **open infra todo captured as commit `d037b17`** (pre-prod branch + second CF Pages project) is genuinely adjacent — see the deferred item above.

</deferred>

---

<post_discussion_decisions>
## Decisions taken AFTER this context was written (2026-07-10, during plan-phase)

Four decisions were taken with Ben during research/planning, all inside this document's
"Claude's Discretion" fences. They amend no locked decision. Recorded here so the plans and the
decision record do not diverge — this phase exists to prevent exactly that.

- **OD-1 — The role table watches CODE ONLY.** Watched = a **shipped path** (root `*.html`, anything
  under `assets/`, plus `manifest.json` and `sw.js`) **AND** a code extension (`.js`, `.css`, `.html`).
  Non-code shipped files — `.png`, `.jpg`, `.ico`, `.woff2`, `.txt`, `assets/demo-seed-data.json` — are
  ignored entirely: neither trigger nor satisfier. The vendor bundles stay watched (they are `.js`, and
  D-06 deliberately declined to denylist them).
  - *Why:* taken literally, D-05 ("everything `deploy.yml` ships") + D-12 ("uncovered blocks") makes 31
    images/fonts block forever, since no `covers[]` entry can ever name `Rubik-Bold.woff2`.
  - *Accepted, known cost, stated plainly in `role-table.js`'s header:* **a logo swap or a new hero
    illustration ships with no changelog entry and the gate stays silent.** Ben chose this over splitting
    the changelog and help requirements, having been shown that consequence.
  - *Both axes are load-bearing.* An extension-only rule makes all 164 `tests/*.js` and the gate's own
    `scripts/*.js` into uncovered triggers — which would block Phase 43's own ship and every push after.
  - *D-06 gap closed:* D-06's rationale is "a page and its script are one surface," but it never named
    `assets/landing.css` / `assets/demo.css`. They are now denylisted alongside their pages.

- **OD-2 — The CI range is anchored to the last-deployed SHA**, not `github.event.before..after`.
  - *Why:* `deploy.yml`'s `concurrency: cancel-in-progress: true` can drop a push range entirely — a
    cancelled run's commits are never gate-verified, and the next run's range starts after them. Flipping
    the flag to `false` does not fix it (GitHub cancels a *pending* run when a third arrives).
  - The anchored range is self-healing: skipped ranges are re-covered by the next successful run. In
    steady state it equals `before..after` exactly. `deploy.yml`'s deploy-commit message widens to the
    full 40-char SHA. Fail closed on an unresolvable anchor; a genuinely absent `deploy` branch is the
    one documented benign bootstrap.

- **OD-3 — One `*-Unaffected:` trailer may name multiple files**, comma-separated, with one shared reason.
  - *Why:* replaying Phases 41 and 42 against this gate showed **8** and **12** required trailers. The
    recurring core (`app.js`, `i18n-{en,he,de,cs}.js`, `app.css`, `tokens.css`, `shared-chrome.js`) is
    touched nearly every phase and can never earn a help topic. Twelve one-file lines per push is
    boilerplate, and boilerplate is not a forcing function — it is the gate Ben would disable (§Specifics,
    the noise principle). Every uncovered file must still be named, with a reason. Only the ceremony shrinks.
  - **Revision (2026-07-10, Ben, first live dry-run).** The multi-file-trailer compromise proved to be
    exactly the noise principle's failure mode at the v1.3 ship dry-run (20 demands). The recurring core +
    docs-system machinery moved to a new changelog-only role — help demand dropped, changelog demand kept.
    Only genuinely feature-bearing files retain the per-file help demand.

- **OD-4 — `Docs-Emergency-Skip:` is honored ONLY on the tip commit of the pushed range.**
  - *Why:* this repo merges GSD executor worktree branches into `main`, and git reads trailers from every
    commit reachable in a range, including those pulled in by a merge. Without this, a genuine hotfix's
    emergency skip would — when its branch was later merged alongside ordinary work — silently excuse that
    ordinary work too. Tip-only means an emergency skip can only excuse the push it was written for, and
    costs a real emergency nothing. An inherited skip found on a non-tip commit is ignored **and reported**.
  - The two cheap `*-Unaffected:` trailers keep "any commit in the range" — they are file-scoped, so an
    inherited one can only ever excuse the file it names.
  - **Revision (2026-07-10, Ben, post-review decision).** The file-scoped premise above holds only for
    `Help-Unaffected`. `Changelog-Unaffected` is push-GLOBAL (one changelog for the app), so an inherited
    one could silently waive the changelog demand for unrelated feature work in a multi-commit push — the
    same leak class this decision blocks for `Docs-Emergency-Skip`. It was therefore moved to **tip-only**,
    matching the emergency skip; a non-tip `Changelog-Unaffected` is now ignored and reported. Only
    `Help-Unaffected` retains "any commit in the range".

</post_discussion_decisions>

---

*Phase: 43-docs-maintenance-hard-gate*
*Context gathered: 2026-07-10 · OD-1..OD-4 appended 2026-07-10 during plan-phase*
</content>
