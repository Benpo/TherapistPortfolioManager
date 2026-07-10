# Phase 43: Docs-Maintenance Hard Gate - Pattern Map

**Mapped:** 2026-07-10
**Files analyzed:** 18 create/modify targets
**Analogs found:** 14 with strong analogs / 18 (2 are genuinely greenfield; 2 are pure deletes/config)

> **Scope note (orchestrator override, 2026-07-10):** This is **repo tooling**, not app
> code. All analogs live in `tests/`, `scripts/`, `.github/workflows/`, `package.json`.
> Two orchestrator decisions override RESEARCH.md where they conflict — captured inline
> below (WATCH-CODE-ONLY role table; anchored CI range). One D-06 gap is surfaced for
> Ben's ack, not silently absorbed. **Phase 43 must not touch a single code comment,
> phase ID, or decision ID, and must not edit `.planning/codebase/CONVENTIONS.md`** — that
> is Phase 44.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/docs-gate.js` (new) | gate script / CLI | request-response (git range → verdict) | `tests/39-help-integrity.test.js` (vm loader + exit contract) + `scripts/cf-purge-cache.sh` (scripts home) | role-match |
| `scripts/lib/help-loader.js` (new) | shared module (loader) | transform (JS file → object) | `tests/39-help-integrity.test.js:33-52` (vm sandbox) + `tests/_helpers/base64-codec.js` (helper-module shape) | exact (extract) |
| `scripts/lib/invariants.js` (new) | shared module (validators) | batch/validation | `tests/42-changelog-integrity.test.js` + `tests/39-help-integrity.test.js` (the assertion bodies moving here) | exact (extract) |
| `scripts/gen-help-map.js` (new) | generator (write+check modes) | transform (corpus → markdown) | `tests/39-help-integrity.test.js` vm loader for input; no exact generator analog | partial |
| `HELP-MAP.md` (new, generated) | generated data artifact | file-I/O | none (new artifact type) | no analog |
| `.githooks/pre-push` (new) | git hook shim (sh) | event-driven (stdin refs) | RESEARCH Q-B skeleton; no existing hook of this shape | partial |
| `.github/workflows/deploy.yml` (modify: +1 step) | CI config | event-driven | `deploy.yml:40-48` "Verify no sensitive files" step | exact |
| `package.json` (modify: +`prepare`) | config | — | its own `scripts` block | exact |
| `.claude/hooks/pre-commit` (DELETE) | dead hook | — | n/a (D-16 delete) | n/a |
| `CLAUDE.md` (modify: +DoD line) | docs contract | — | existing repo-root CLAUDE.md | trivial |
| `tests/docs-gate.test.js` (new) | behavior test (RED/GREEN) | request-response over child process | `tests/37-date-format.test.js:30-37` (child-process re-exec); RESEARCH Q-H recipe | partial (greenfield git-repo harness) |
| `tests/docs-gate-role-table.test.js` (new, optional) | test (invariant #4) | validation | `tests/39-help-integrity.test.js` | role-match |
| `tests/39-help-integrity.test.js` → `help-integrity.test.js` (rename + gain invariants) | test | validation | itself | exact |
| `tests/42-changelog-integrity.test.js` → `changelog-integrity.test.js` (rename + gain invariants) | test | validation | itself | exact |
| `tests/42_1-help-integrity.test.js` → `help-integrity-locale.test.js` (rename + delete covers-parity) | test | validation | itself; strip block at 244-248 | exact |
| `tests/42_1-changelog-integrity-locale.test.js` → `changelog-integrity-locale.test.js` (rename only) | test | validation | itself | exact |
| `tests/28-04-integrity-state.test.js` → `update-integrity-state.test.js` (rename only) | test | validation | itself | exact |
| `assets/help-content-en.js` (modify: `covers[]` backfill) + `{he,de,cs}` (strip `covers[]`) | data | transform | Phase 42 EN-canonical precedent | exact |
| `.planning/codebase/TESTING.md` (modify: rename map + fix count) | docs | — | its own tables | trivial |

---

## Pattern Assignments

### `scripts/lib/help-loader.js` (shared module — the vm sandbox loader)

**Analog:** `tests/39-help-integrity.test.js:33-52` — the exact loader to extract, per D-17
("one implementation, two callers") and RESEARCH Q-D (`scripts/lib/` home, not `tests/_helpers/`).

Verified live at `tests/39-help-integrity.test.js:33-52`:

```javascript
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
  window: {},
  console: { log() {}, warn() {}, error() {} },
};
sandbox.window.I18N = {};
sandbox.window.QUOTES = {};
vm.createContext(sandbox);

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const FILES = ['i18n-en.js', 'help-content-en.js'];
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ASSETS_DIR, f), 'utf8');
  try {
    vm.runInContext(src, sandbox, { filename: 'assets/' + f });
  } catch (err) {
    console.error('FATAL: assets/' + f + ' failed to load in vm sandbox.');
    process.exit(1);
  }
}
const EN = sandbox.window.I18N.en;
const SECTIONS = sandbox.window.HELP_CONTENT_EN;   // the covers[] source
```

**Extract note:** the loader hard-codes `ASSETS_DIR = path.join(__dirname, '..', 'assets')`.
Moving it to `scripts/lib/` keeps `..` correct (`scripts/lib/` → repo root → `assets/`).
Parameterize `ASSETS_DIR` or the file list so the RED/GREEN test can point it at a
throwaway fixture dir (D-21 synthesizes a tiny corpus, not the real one).

**Helper-module shape to mirror** — `tests/_helpers/base64-codec.js`: plain CommonJS,
`'use strict'`, `module.exports = {...}`, a header comment block (Phase 43 keeps its own
comments citation-free per the hard constraint — describe behavior, not phase IDs).

**Caller wiring (verified safe):** `tests/*.test.js` require it via `require('../scripts/lib/help-loader.js')`;
`scripts/docs-gate.js` via `require('./lib/help-loader.js')`. `tests/run-all.js:46-48`
discovers test files by `readdirSync(...).filter(f => f.endsWith('.test.js'))` and only
*spawns* those — a `require`d sibling module is invisible to the glob. Existing tests
already require across dirs (`tests/25-*`, `tests/30-*` require `_helpers/*`), so
cross-dir require is an established, working pattern.

---

### `scripts/docs-gate.js` (gate script — CLI entry, shared by hook + CI)

**Analog (structure):** `tests/39-help-integrity.test.js` for the load + exit-code
contract; `scripts/cf-purge-cache.sh` for the `scripts/` home and loud-echo/`exit 1` idiom.

**Exit contract to mirror** (every `tests/*.test.js` and `run-all.js` obey it): `exit 0`
on pass, non-zero on any failure; FATAL conditions print `console.error('FATAL: ...')` then
`process.exit(1)`. D-04 (fail closed) = default-deny on any throw/parse error.

**CLI shape:** accept `--range <A..B>` so the hook and the CI step invoke one
implementation (D-01/GATE-02). RESEARCH Q-B/Q-C give the git commands:
- range diff of changed paths: `git diff --name-only <range>`
- trailer read (VERIFIED safe, NOT `--grep`): `git log <range> --format='%(trailers:key=Help-Unaffected,valueonly,only)'`

**Order (D-17):** run the shared invariants module FIRST (files-on-disk checks), fail
closed on any breach, THEN the push-range rule.

**Failure-message shape (D-13):** name the changed file and each claiming topic id + title
from the `covers[]` reverse index, then print the `Help-Unaffected:` escape line. This is
the exact format quoted in CONTEXT D-13.

---

### `scripts/lib/invariants.js` (shared validators — the 4 invariants of D-17)

**Analog:** the assertion bodies already living in `tests/39-help-integrity.test.js`
(help schema, `covers` non-empty at line ~188) and `tests/42-changelog-integrity.test.js`
(unique versions, `highlights` 2–4, real dates, `origin:true` special-case).

**`changelog-integrity.test.js` already encodes the release-moment shape** — header
enumerates: unique semver `version`, reverse-chronological, each non-origin entry has
`highlights` length 2–4, and **"The v1.0 entry has `origin:true` and NO `highlights`"**
(invariant #4 in that file). **The D-08 release-moment check must NOT duplicate this** —
call the shared invariant, don't re-assert. `origin:true` special-case is Pitfall 4 and is
already handled here — reuse it.

**Invariant #2 (covers paths exist on disk):** currently implied-green (RESEARCH Q-F: all
23 covered paths exist). New assertion lives here so a future rename/delete that orphans a
`covers[]` entry fails loudly.

---

### `.github/workflows/deploy.yml` — new gate step (modify)

**Analog (EXACT):** the `Verify no sensitive files` step, `deploy.yml:40-48`. Copy this idiom
verbatim — inline shell, loud `echo`, `exit 1`, no external action (D-18):

```yaml
      - name: Verify no sensitive files
        run: |
          if [ -d "deploy-staging/.planning" ] || [ -d "deploy-staging/.claude" ] || [ -f "deploy-staging/CLAUDE.md" ] || [ -f "deploy-staging/.env" ]; then
            echo "ERROR: Sensitive files found in deploy-staging!"
            ls -la deploy-staging/
            exit 1
          fi
          echo "Deploy directory is clean."
```

**Placement (D-18):** insert the gate step BEFORE `Prepare deploy directory`
(`deploy.yml:21`) so a failing push never even stages. The step invokes
`node scripts/docs-gate.js --range <computed>`.

**CI range — ORCHESTRATOR OVERRIDE (supersedes RESEARCH Q-A / D-04 note):** the range is
**anchored to the last-deployed SHA**, NOT `github.event.before..after`. Rationale:
`concurrency.cancel-in-progress: true` (`deploy.yml:7-9`) can drop a push range entirely;
an anchored range is self-healing. The anchor is `deploy.yml:62`'s deploy commit message:

```yaml
          git commit -m "Deploy from ${GITHUB_SHA::7}"   # deploy.yml:62 — WIDEN to full SHA
```

**Action:** widen `${GITHUB_SHA::7}` → full `${GITHUB_SHA}` so the anchor is unambiguous;
the gate step reads `git log origin/deploy -1 --format=%s`, extracts the SHA, and uses
`<anchor>..${GITHUB_SHA}`. **Fail closed (D-04) if the anchor cannot be resolved.**

---

### `package.json` — add `prepare` (modify)

**Analog:** its own `scripts` block (verified — currently only `"test": "node tests/run-all.js"`).
Add per D-15, fail-soft per RESEARCH Q-E:

```json
"prepare": "git config core.hooksPath .githooks || true"
```

`package.json` is a test-only workbench (`"private": true`, sole devDep `jsdom`) and never
ships (`deploy.yml:24-31` copies only `_headers`/`_redirects`/`LICENSE`/`*.html`/`assets/`/
`manifest.json`/`sw.js`). Zero-build unaffected.

**Landmine (verified live):** `git config core.hooksPath` currently returns the absolute
`.git/hooks`. A committed `.githooks/pre-push` is INERT until `prepare` runs once on the
next `npm install`.

---

### `tests/docs-gate.test.js` (RED/GREEN behavior test — D-21)

**Closest analog (partial):** `tests/37-date-format.test.js:30-37` is the only existing
pattern that shells out to a child process — but it re-execs *itself* to pin `TZ`:

```javascript
if (process.env.TZ !== 'America/New_York') {
  process.env.TZ = 'America/New_York';
  var reexec = require('child_process').spawnSync(
    process.execPath, [__filename],
    { stdio: 'inherit', env: Object.assign({}, process.env, { TZ: 'America/New_York' }) }
  );
  process.exit(reexec.status == null ? 1 : reexec.status);
}
```

**GREENFIELD — state plainly:** **no existing test builds a temp dir or a throwaway git
repo.** `grep -rlE "mkdtemp|os.tmpdir" tests/*.test.js` returns nothing; no test spawns
`git` (`grep "'git'" tests/*.test.js` → empty). D-21's throwaway-git-repo harness
(`mkdtempSync` + local bare origin + `execFileSync('git', ...)` with
`GIT_CONFIG_GLOBAL=/dev/null`) is a **genuinely new pattern for this repo.** The planner
must treat it as new work — RESEARCH Q-H supplies the verified recipe; there is no
in-repo analog to copy the git-harness half from. Only the `spawnSync`/exit-capture and the
`'use strict'` + exit-0/1 contract are reusable from `37-date-format.test.js`.

**RED-first ordering:** author BEFORE `scripts/docs-gate.js` exists (project rule +
`42-changelog-integrity.test.js` header precedent: "Authored BEFORE ... fails RED for the
right reason (module absent)"). Fixtures: synthesize a tiny corpus, do NOT copy the real
`help-content-en.js` (Q-H reasoning against the phase-31 test-shape-coupling learning).

---

### The 5 test renames (D-22)

**Analog:** each file is its own analog — pure filename token replace, no logic change.

**Verified live-file token spread** (`grep -rlE "<5 old tokens>"` excluding
`.planning/phases` + `.planning/milestones`):

```
assets/changelog-content-{en,he,de,cs}.js
assets/help-content-{en,he,de,cs}.js
tests/40-i18n-parity.test.js
tests/29-01-crashlog-capture.test.js
tests/42_1-changelog-integrity-locale.test.js
tests/42-changelog-integrity.test.js
tests/42_1-help-integrity.test.js
tests/29-01-crashlog-capture.test.js
tests/28-04-integrity-state.test.js
tests/39-help-integrity.test.js
.planning/ROADMAP.md
.planning/REQUIREMENTS.md
```

These 8 assets + 6 tests + 2 planning docs are the allowlist targets (all references are
inside comments / hint strings). **Pitfall 2 (RESEARCH):** anchor each replace on the FULL
old token (`39-help-integrity`, `42_1-help-integrity`, `42-changelog-integrity`,
`42_1-changelog-integrity-locale`, `28-04-integrity-state`) — never the bare stem, or
`help-integrity` collides with `help-integrity-locale`. **Post-condition (D-22):**
`grep -rl <old-name>` after the rename must return exactly the 51 historical artifacts —
run before/after and diff the sets.

**Constraint reminder:** these comment edits update a renamed *filename token* only. They
are NOT the phase-ID/decision-ID hygiene edits forbidden this phase — that is Phase 44.
Do not opportunistically clean any citation you pass.

---

### `assets/help-content-en.js` backfill + `{he,de,cs}` strip (D-19 / D-20)

**Analog:** Phase 42 EN-canonical precedent (metadata lives EN-only). `covers[]` is
metadata (Phase 39 D-24), no prose, no translation.

**Runtime safety VERIFIED:** `grep -n "covers" assets/help.js` → **NONE**. Stripping
`covers[]` from the three locale files is runtime-safe (Q-G confirmed; the only other
`covers` hits in `assets/*.js` are unrelated prose comments).

**The one assertion that goes RED (D-20)** — `tests/42_1-help-integrity.test.js:244-248`
(verified live):

```javascript
const enCovers = JSON.stringify(enTp.covers);
const lcCovers = JSON.stringify(lcTp.covers);
if (enCovers !== lcCovers) {
  throw new Error(en.id + '/' + enTp.id + ' covers ' + lcCovers + ' ≠ EN ' + enCovers);
}
```

**Delete this block** (the covers-parity check; nothing else in that test references
`covers`). `tests/42_1-changelog-integrity-locale.test.js` has no `covers` reference —
unaffected. `tests/39-help-integrity.test.js` asserts `covers` non-empty on EN only (~line
188) — stays green.

---

## Shared Patterns

### The vm-sandbox loader (D-17 "one implementation, two callers")
**Source:** `tests/39-help-integrity.test.js:33-52`
**Apply to:** `scripts/lib/help-loader.js`, then required by `scripts/docs-gate.js`,
`scripts/gen-help-map.js`, `help-integrity.test.js`, `changelog-integrity.test.js`.
Node built-ins `fs`/`path`/`vm` only — jsdom NOT needed.

### Loud-echo / `exit 1` fail-closed idiom
**Source:** `deploy.yml:40-48` ("Verify no sensitive files") and `scripts/cf-purge-cache.sh:37-49`
**Apply to:** the new `deploy.yml` gate step and `scripts/docs-gate.js`'s failure path.
Print a human-readable ERROR/BLOCKED banner, then non-zero exit. Never pass on error (D-04).

### Exit-0/1 test contract + RED-first authoring
**Source:** `tests/run-all.js:77` (`result.status === 0 && result.signal == null`),
`tests/42-changelog-integrity.test.js` header ("Authored BEFORE ... fails RED")
**Apply to:** `tests/docs-gate.test.js`, `tests/docs-gate-role-table.test.js`, and the shared
`scripts/lib/invariants.js` exercised by the renamed integrity tests.

### Cross-dir CommonJS require (glob-invisible)
**Source:** `tests/25-*`/`tests/30-*` requiring `tests/_helpers/*` (e.g. `base64-codec.js`)
**Apply to:** tests requiring `../scripts/lib/*`. Confirmed safe: `run-all.js` only spawns
`tests/*.test.js`; required modules are never enumerated.

---

## Surfaced Gap — D-06 denylist omits two stylesheets (needs Ben's ack, NOT settled)

Under the orchestrator's **WATCH-CODE-ONLY** override, the role table watches `.js`, `.css`,
`.html` (plus `manifest.json` + `sw.js`). D-06 denylists `landing.html` + `assets/landing.js`
and `demo.html` + `assets/demo.js` under the stated rationale *"a page and its script are
one surface"* — but it **never names `assets/landing.css` or `assets/demo.css`**. Both files
exist and are now watched-and-uncovered, so they will BLOCK. By D-06's own rationale they
belong on the denylist (page + script + **stylesheet** = one surface).

**Proposed denylist extension (needs Ben's ack at plan approval):** add `assets/landing.css`
and `assets/demo.css`. Do **not** treat as settled — flag it explicitly in the plan's scope
confirmation (per MEMORY `feedback-surface-deferrals-at-scope-confirmation`).

## Role table — WATCH-CODE-ONLY (orchestrator override, supersedes RESEARCH Q-F)

**Ben's call, 2026-07-10:** the gate watches `.js`, `.css`, `.html` + the explicitly-named
`manifest.json` and `sw.js`. Non-code shipped files — `.png`, `.jpg`, `.ico`, `.woff2`,
`.txt`, `assets/demo-seed-data.json` — are **neither triggers nor satisfiers; ignored
entirely.** RESEARCH's "37 uncovered files" enumeration and its proposed non-code handling
are **superseded**. Vendor bundles (`jspdf.min.js`, `jszip.min.js`, `bidi.min.js`) remain
watched — they are `.js` and D-06 deliberately declined to denylist them (RESEARCH Q-F still
correctly places `jspdf`+`bidi`→pdf-export topic, `jszip`→backup topic for D-19 backfill).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `HELP-MAP.md` | generated data artifact | file-I/O | New artifact type — no committed generated markdown exists. RESEARCH Q-I supplies table shape + canonicalization (LF, trailing `\n`, sorted `covers[]`). Repo-root; does NOT ship (deploy.yml copies only `*.html`/`assets/`, not root `.md`). |
| `scripts/gen-help-map.js` | generator (write+check) | transform | No existing generate-then-compare script. Reuses the vm loader for input; the write/check dual-mode is new. |
| `.githooks/pre-push` | git hook shim | event-driven (stdin) | No existing pre-push hook. `.claude/hooks/pre-commit` is a different trigger and is being DELETED (D-16). RESEARCH Q-B supplies the verified stdin skeleton. |
| `tests/docs-gate.test.js` (git-harness half) | behavior test | child-process/git | **Greenfield:** no test builds a temp git repo. Only the `spawnSync`+exit-capture half has an analog (`37-date-format.test.js`). |

## Metadata

**Analog search scope:** `scripts/`, `tests/`, `tests/_helpers/`, `.github/workflows/`,
`.claude/hooks/`, `package.json`, `assets/help.js`, `assets/*content*.js`
**Files scanned:** deploy.yml, run-all.js, 39-help-integrity.test.js, 42-changelog-integrity.test.js,
42_1-help-integrity.test.js (blocks), package.json, cf-purge-cache.sh, base64-codec.js,
37-date-format.test.js, help.js (grep), + rename-token grep across repo
**Pattern extraction date:** 2026-07-10
