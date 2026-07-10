# Phase 43: Docs-Maintenance Hard Gate - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the **docs-maintenance hard gate**: repo tooling (not app code) that makes it impossible to ship a user-facing change without (a) a changelog entry and (b) updated help topics — or an explicit, logged declaration that help is unaffected. Three layers: a committed `.githooks/pre-push` (fast local preview), a **CI step in `deploy.yml`** (the unbypassable layer), and a **GSD definition-of-done layer** (invariants test in `npm test` + a written DoD rule in `CLAUDE.md`). Governed by a written, path-based definition of "user-facing change" with a loud, logged emergency escape hatch. Validated by an automated RED/GREEN behavior test **and** v1.3.0's own live ship (GATE-01..04).

Two supporting deliverables fall out of the gate's needs:
1. **`covers[]` backfill + de-duplication** — extend existing help topics' `covers[]` so the path→topic index isn't leaky, and **strip `covers[]` from the three translated help files** (it is repo metadata, EN-canonical, never translatable content).
2. **`HELP-MAP.md`** — a generated, freshness-checked extract (section → topic → title → covers[]) so an agent can locate "where does this belong in help?" without reading the help corpus.

**Not this phase:** authoring any new help topic prose (the reporting page, the guided tour, and What's New remain uncovered — deferred); adding `npm test` to CI (deferred); an "Unreleased" changelog entry convention (rejected, D-09); gating the pre-prod branch (deferred until that infra lands); any change to app runtime behavior, the What's-New popup, or the changelog page rendering.

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
- **D-07: Satisfiers are never triggers.** `assets/help-content-*.js` edits **satisfy** the help requirement (they *are* the help update). `assets/changelog-content-*.js` edits **satisfy** the changelog requirement. Neither ever raises a demand of its own — otherwise editing help to pass the gate trips the gate, forever. This is a *role rule in the gate script*, not a denylist entry: those files are still watched for the `HELP-MAP.md` freshness check.

### What satisfies the gate

- **D-08: Two changelog rules, both mechanical, no schema change.**
  - *Ordinary push:* a user-facing change must also edit `assets/changelog-content-en.js` (append a bullet to the current version's entry as you go), **or** carry a `Docs-Gate: changelog-unaffected (<file> — reason)` trailer.
  - *Release push:* if `APP_VERSION` in `assets/version.js` changed in the range, an entry for **exactly that version** must exist, with a non-empty `highlights` array and a `date`. This is GATE-04's release-moment hook.
- **D-09: REJECTED — an `unreleased: true` entry convention.** Conceptually cleanest, but the real cost is a schema change plus render suppression in *both* the page and the popup, plus per-locale integrity-test churn across all four 42.1 locale files. The v1.3.0 entry already exists; the next milestone opens its entry early.
- **D-10: The gate never semantically diffs help content.** *Ben's directive, verbatim intent:* the checker must not read the help corpus to infer whether something changed. Relevance is decided **from the phase scope, by Ben and Claude together**, at plan/execute time. The gate's job is to **force that decision to be made and recorded** — never to guess it. Mechanically it is a presence check (`covers[]` reverse index) plus an explicit declaration.
- **D-11: Help satisfaction = touch the claiming topic, or declare.** For each changed, non-denylisted, non-satisfier path: the push must contain an edit to a topic that names it in `covers[]`, **or** a `Docs-Gate: help-unaffected (<file> — reason)` trailer.
- **D-12: An uncovered changed file BLOCKS.** *"`assets/tour.js` is covered by no help topic. Add it to a topic's `covers[]`, or declare `Docs-Gate: help-unaffected (assets/tour.js — reason)`."* This is the anti-rot engine: over time the gate teaches the help corpus to grow coverage. Accepted cost: until a file earns a topic, touching it needs one trailer line. Rejected: vacuous-pass for uncovered files (would permanently exempt the app's five biggest files) and a committed coverage-debt list (a second artifact to keep honest).

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

      Update one of these topics, or declare: Docs-Gate: help-unaffected (<file> — reason)
    ```
  - *`HELP-MAP.md`* — generated by a script from `assets/help-content-en.js`; a plain table of section → topic → title → `covers[]`. An agent planning a phase reads the map **cold, before writing code**, without running anything.
  - **The gate asserts the committed map matches a fresh regeneration.** Drift is impossible.
  - Neither route ever reads help *prose*. Only `covers[]` metadata is parsed. The four locale bodies are never touched by the gate.

### The declaration & the escape hatch

- **D-14: Two distinct trailers, deliberately different in cost.**
  - `Docs-Gate: help-unaffected (<file> — reason)` and `Docs-Gate: changelog-unaffected (<file> — reason)` — **cheap and expected**, not emergencies. Per D-10, "unaffected" is a normal outcome of scoping a phase.
  - `Docs-Gate: emergency-skip (<reason>)` — **loud**. CI honors it but prints a large banner naming the commit, the reason, and every skipped file. A script can list every emergency skip in history on demand.
  - Rationale for trailers over a waiver-ledger file: a trailer is *welded to the commit it justifies*. It cannot drift from what shipped, cannot be retroactively edited without rewriting history, and the hook and CI read the identical thing (the same commit range). A ledger row can say "n/a" and pass. Solo repo — self-approval is honest, so make the hatch **visible** rather than hard.
  - `--no-verify` bypasses the local hook by design and leaves no trace; that is precisely why **CI is the enforcement layer** and honors only the trailer.

### Layer wiring

- **D-15: `npm prepare` installs the hook.** `package.json` gains `"prepare": "git config core.hooksPath .githooks"`. It runs automatically on `npm install` — which anyone running the test suite already does, including cloud Claude Code on a fresh clone. Does **not** violate zero-build: `package.json` is already a test-only workbench, never shipped. *Blocker to clear:* `core.hooksPath` is currently pinned to `.git/hooks`, so a committed `.githooks/` is inert until this runs.
- **D-16: Delete `.claude/hooks/pre-commit`.** Tracked, but dead: it auto-bumped `sw.js` `CACHE_NAME`, obsolete since `CACHE_NAME` began auto-deriving from the deploy-stamped `INTEGRITY_TOKEN`. It is not installed (nothing lives in `.git/hooks`). Leaving a dead hook next to a new live one is how the new one gets ignored.
- **D-17: The GSD definition-of-done layer = invariants test + written DoD.**
  - The gate's push-range rule **cannot** run inside `npm test` (no push range exists there). What *can* run there are the gate's **invariants**, which need only the files on disk:
    1. `HELP-MAP.md` matches a fresh regeneration from `help-content-en.js`
    2. every path named in any `covers[]` exists on disk (a rename/delete leaves a dangling claim, and the gate would point at a file that isn't there)
    3. changelog entries have unique versions, non-empty `highlights`, real dates
    4. the denylist and satisfier tables neither overlap nor contradict
  - These go in `tests/43-docs-gate.test.js`, auto-discovered by `tests/run-all.js`. `gsd-verifier` runs `npm test` when verifying *any* phase — so every future phase silently checks the gate's own health, for free. It won't catch "you forgot the changelog" (no diff); it *will* catch the gate rotting into uselessness, which is the failure mode that actually kills tools like this.
  - Plus a written DoD line in `CLAUDE.md` (the file every agent reads at session start): *a phase is not done until the changelog entry exists and affected help topics are updated or declared unaffected.*
  - Rejected: a GSD `ship:pre` loop hook — it only fires if `/gsd-ship` is used, it lives in GSD config rather than the repo (a fresh clone doesn't get it), and it re-runs what CI runs minutes later.
- **D-18: CI = the gate step only.** Add one step to `.github/workflows/deploy.yml`, placed **before** "Prepare deploy directory" so a failing push never even stages. `deploy.yml` currently runs no tests at all; adding `npm test` to CI is a second capability with its own failure modes (a flaky jsdom test blocking a hotfix deploy) and is **deferred**.
  - **Accepted tradeoff, stated plainly:** the D-17 invariants test therefore runs only via `npm test` locally and through `gsd-verifier` — *not* in CI. The gate's push-range rule is unbypassable; its invariants are not. Ben chose this knowingly.

### The `covers[]` backfill (Ben's directive)

- **D-19: Metadata-only backfill — extend existing topics' `covers[]`, author no new prose.** `topic-new-session` covers `sessions.html` and `add-session.html` but not `assets/sessions.js` / `assets/add-session.js` — those files aren't *uncovered*, the topic that describes them simply never named the scripts behind the pages. Backfill: add each covered page's script(s), and assign obvious module owners (`assets/date-format.js` → `topic-date-format`, and so on). `covers[]` is metadata; this costs no translation work.
- **D-20: `covers[]` becomes EN-only — strip it from `help-content-{he,de,cs}.js`.** *Ben, verbatim intent:* "I don't want to save up on better design… the entire help is always 4 languages going forward, so I see no reason why we need this translated — better to fix this now than in the future." It is currently duplicated ×4 (34 entries in each file). The gate reads **only `assets/help-content-en.js`** (EN-canonical, per Phase 42 D-17). *Planner must handle:* the 42.1 per-locale integrity tests assert EN↔locale structure parity and will need adjusting, and `assets/help.js` must be checked for any runtime read of `covers[]` (expected: none).

### GATE-04 validation

- **D-21: Automated RED/GREEN behavior test, written BEFORE the gate script exists, plus the live v1.3.0 push.** The test builds a throwaway git repo in a temp dir, stages a user-facing change with no changelog entry, runs the real gate script, and asserts it exits non-zero with the right message; then adds the entry and asserts it passes. Then v1.3.0's actual push to `main` must go green through CI. *A gate that always passes also ships green — a passing push proves nothing about whether the gate can block.* This honors the project's standing rule: runtime-behavior code requires falsifiable behavior tests before implementation.

### Claude's Discretion

- Exact denylist/satisfier/trigger **role table** implementation — Ben set the principle (D-05/D-06/D-07); the concrete file→role mapping is written into the gate script's documented definition for review at plan time.
- Gate script **language and location** — plain `node` (matching `tests/`) or `bash`; likely `scripts/docs-gate.js` + a thin `.githooks/pre-push` shim, so hook and CI invoke one shared implementation (GATE-02's "shared script").
- `HELP-MAP.md` **location and exact table shape** — repo-root vs `.planning/`; must be readable cold by an agent and diff-friendly.
- The `HELP-MAP.md` **generator's** home (likely `scripts/`) and whether it doubles as the invariants test's regeneration source.
- The **merge-base fallback** implementation for an all-zeros baseline SHA (D-04).
- The precise **trailer parsing** rules (case sensitivity, multiple trailers per push, which commit in the range they may live in — recommend: any commit in the range).
- Wording of the `CLAUDE.md` DoD line (D-17) and of the written "user-facing change" definition (GATE-03) — both are user-visible contracts; keep them short and checkable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §Docs-Maintenance Hard Gate — GATE-01..04, the four locked requirement contracts.
- `.planning/ROADMAP.md` §Phase 43 — goal, the four success criteria, and the §11.4 sequencing note (scaffold-early / enforce-at-close is permitted; final enforcement must be HARD and validated on a live ship).

### The two data sources the gate parses
- `assets/help-content-en.js` — **the gate's only help input.** Header comment documents the schema; `covers[]` (Phase 39 **D-24**) is explicitly described as seeding "the Phase 43 docs-rot gate". 34 topics, currently naming 22 distinct repo paths.
- `assets/changelog-content-en.js` — **the gate's only changelog input.** Header comment documents the entry schema; `highlights` (Phase 42 **D-08**) is explicitly described as "the Phase-43 docs-rot hook". Reverse-chronological, unique `version` + `anchor` per entry, `origin: true` for the contentless v1.0 marker (no `highlights` — the release-moment check must tolerate this).
- `assets/version.js` — `APP_VERSION` (currently `'1.3.0'`, line ~27) is the hand-set release moment (GATE-04). `INTEGRITY_TOKEN` is deploy-stamped and **irrelevant to this gate** — do not confuse the two.

### The surfaces being modified
- `.github/workflows/deploy.yml` — runs on push to `main`; steps are checkout → Prepare deploy directory → **Verify no sensitive files** (the idiom the gate step should mirror: plain shell, loud `echo`, `exit 1`) → Push to deploy branch → Purge CF cache. **Runs no tests today.** Insert the gate step before "Prepare deploy directory".
- `package.json` — test-only workbench (`"test": "node tests/run-all.js"`, sole devDependency `jsdom`). Gains `"prepare"` (D-15).
- `.claude/hooks/pre-commit` — tracked, dead, **delete** (D-16).
- `CLAUDE.md` (repo root) — gains the written DoD line (D-17).

### Prior phase contracts
- `.planning/phases/42-in-app-changelog-what-s-new/42-CONTEXT.md` — D-08 (`highlights` hand-picked, "the Phase 43 gate can check the field exists"), D-17 (per-locale data files, EN canonical — the precedent D-20 extends), D-03 (curated artifacts, never commit archaeology).
- `.planning/phases/39-help-center-entry-point/39-CONTEXT.md` — D-24 (`covers[]` seeds this gate), D-18 (content-file pattern), D-25 (the integrity-test substrate).

### Tests
- `tests/39-help-integrity.test.js` — the static integrity gate for `help-content-en.js`; its header enumerates the invariants (incl. assertion 5: "every topic has … a non-empty `covers` array (D-24)"). **The template `tests/43-docs-gate.test.js` mirrors.** Note: it loads production JS into a `vm` sandbox — no jsdom needed.
- `tests/42-changelog-integrity.test.js` — the changelog schema gate; the release-moment check (D-08) must not duplicate what this already asserts.
- The 42.1 per-locale integrity tests (`tests/42.1-*`) — **assert EN↔locale structure parity; D-20 requires adjusting them.** Read before touching the locale files.
- `tests/run-all.js` — auto-discovers top-level `tests/*.test.js`, runs each as an isolated child process, exits non-zero if any file fails. `tests/_helpers/` is excluded.
- `.planning/codebase/TESTING.md` — assertion style, the `vm`-sandbox idiom, run commands.

### Conventions & constraints
- `.planning/codebase/CONVENTIONS.md` — zero-build / zero-npm for production code; naming (`{phase}-{plan}-{slug}.test.js`); comments cite the phase/plan that introduced them.
- `CLAUDE.md` (repo root) — the Lemon Squeezy store-ID rule (irrelevant here) and the mandatory `git pull` at session start.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`covers[]` reverse index** — the gate's core lookup already exists as data. 34 topics in `help-content-en.js` name 22 distinct paths. Inverting it (path → topics) is a few lines; no new metadata format is needed.
- **`highlights` field** — every content changelog entry carries a hand-picked 2–4 string array (Phase 42 D-08), built precisely so the release-moment check has something non-empty to assert. The `origin: true` v1.0 entry deliberately has none.
- **"Verify no sensitive files" step in `deploy.yml`** — the exact shape the gate's CI step should copy: inline shell, loud `echo`, `exit 1` on failure, no external action.
- **`tests/39-help-integrity.test.js` `vm`-sandbox loader** — loads `assets/*.js` into a sandbox with a fake `window` and reads the registered globals. The gate script and its test can reuse this to parse `help-content-en.js` and `changelog-content-en.js` without a bundler.
- **`tests/run-all.js` auto-discovery** — dropping `tests/43-docs-gate.test.js` into `tests/` is the entire wiring for D-17's invariants layer.

### Established Patterns
- Zero-build, zero-npm for shipped code; `package.json` + `node_modules` exist *only* for the test workbench. Node is available in CI (`ubuntu-latest`) and locally.
- Behavior tests before implementation (project rule; see D-21).
- Code comments cite the phase/plan that introduced them.
- EN-canonical content files with translated siblings (Phase 42 D-17) — D-20 sharpens this: *metadata* doesn't get a sibling at all.

### Integration Points
- `.githooks/pre-push` → thin shim → shared gate script. Activated by `core.hooksPath` (D-15).
- `.github/workflows/deploy.yml` → new step invoking the **same** shared gate script with CI's `before..after` range (D-01: one implementation, two callers).
- `tests/run-all.js` → `tests/43-docs-gate.test.js` (invariants) + the RED/GREEN behavior test (D-21).
- `assets/help-content-{he,de,cs}.js` → `covers[]` stripped (D-20); `tests/42.1-*` parity assertions adjusted.
- `CLAUDE.md` → the written DoD sentence.

### Landmines
- **`core.hooksPath` is currently set to `.git/hooks`.** A committed `.githooks/` directory is inert until D-15's `prepare` script runs. Verify with `git config core.hooksPath` after `npm install`.
- **`.claude/hooks/pre-commit` is tracked but not installed** and its logic (auto-bump `sw.js` `CACHE_NAME`) is obsolete. Delete it (D-16) rather than leaving two hook directories.
- **`covers[]` lives in all four locale files** (34 entries each) — D-20 removes three of them; the 42.1 parity tests will go red until adjusted.
- **`origin: true` entries have no `highlights`** — the release-moment assertion must special-case this or v1.0 breaks the gate.
- **The gate must not read `INTEGRITY_TOKEN`** — `APP_VERSION` is the release moment; the SW/integrity layer is independent (Phase 42 D-03 boundary).

</code_context>

<specifics>
## Specific Ideas

- **Ben's framing of the whole gate, in his words:** *"We have to keep both the changelog as well as the help section up to date. And we need to make sure that the agent checking it does not really go through all of the help section, but rather that we make an extract which is always up to date… I don't even think we need to go over what already is in the help section. In order to see if something has changed, we need to decide this based on the scope of the phase we are trying to commit and push. And based on that one we are deciding together if it's relevant for the users."* → D-10 + D-13. The gate is a **forcing function for a human/agent decision**, not an inference engine.
- **Ben's real pain point:** *"When we already decided that it needs to be added to the help or updated within the help section — how do we make it the most efficient to double-check where does it exist in the help section?"* → the gate's failure message answers this directly, by naming the topics. `HELP-MAP.md` answers it ahead of time, at plan time.
- **On `covers[]` duplication:** *"I don't want to save up on better design — from my perspective the entire help is always 4 languages also going forward, so I see no reason why we need this translated. So better to fix this now than in the future."* → D-20. Fix the design flaw while touching the files anyway.
- **The noise principle that drove D-01 and D-11:** the gate that annoys you is the gate you disable. `pre-push` over `pre-commit`, aggregate over per-commit, cheap trailers for the expected "unaffected" case, a loud one for the emergency.
- **Ben on the sessions gap:** *"I think `covers()` should be updated as the sessions must be in the help section."* — correct, and diagnostic: the session files were never *undocumented*, the index just named the pages and not the scripts. → D-19.

</specifics>

<deferred>
## Deferred Ideas

- **New help topics for the genuinely undocumented user surfaces** — `reporting.html` / `assets/reporting.js` is a whole user-facing page with **no help topic at all**; `assets/tour.js` and `assets/whats-new.js` (v1.3's own new surfaces) likewise. Writing these is a Phase-39-sized content effort (new prose × 4 locales, native-speaker gates, Sapir's Hebrew read) and does not belong in a tooling phase. Until then, touching those files costs one `help-unaffected` trailer — which, per D-12, is the gate *asking* for them.
- **Adding `npm test` to CI** (D-18) — `deploy.yml` runs no tests today; the 167-file suite is your only safety net and it currently runs on your laptop or nowhere. Its own infra decision, with its own failure modes (a flaky jsdom test blocking a hotfix deploy). Would also make the D-17 invariants layer genuinely unbypassable.
- **Gating the pre-prod branch** (D-03) — the open infra todo (commit `d037b17`: pre-prod branch + second CF Pages project). Extend the branch scope deliberately when that lands.
- **A generated waiver ledger** — a script that reconstructs a readable table of every `Docs-Gate:` trailer from git history. Rejected as a *mechanism* (D-14), but attractive later as a pure read-only view. Costs nothing to add once trailers exist.
- **A committed coverage-debt list** — considered as a middle path for D-12 (uncovered files pass if listed, with a written reason). Rejected: a second artifact to keep honest. Revisit only if the trailer volume becomes genuinely annoying.

### Reviewed Todos (not folded)
The `todo.match-phase 43` scan returned only keyword noise — no pending todo concerns the docs gate. Matches were `2026-03-18-verify-landing-page-translations.md` (matched on "translations"/"assets"), `2026-05-13-drag-sort-settings-categories.md`, `2026-05-13-modality-templates.md`, and `2026-06-30-demo-sessions-this-month-utc-undercount.md` (all matched on generic keywords like "settings", "page", "entry", "assets"). All remain pending for their own phases. Note the **open infra todo captured as commit `d037b17`** (pre-prod branch + second CF Pages project) is genuinely adjacent — see the deferred item above.

</deferred>

---

*Phase: 43-docs-maintenance-hard-gate*
*Context gathered: 2026-07-10*
</content>
</invoke>
