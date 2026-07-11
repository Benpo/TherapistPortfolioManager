# Phase 44: Tech-Debt Guardrails & Pre-Prod Environment - Pattern Map

**Mapped:** 2026-07-11
**Files analyzed:** 9 (5 new, 4 modified)
**Analogs found:** 8 / 9 (the CONVENTIONS.md doc edit needs no code analog)

> RESEARCH.md already located every analog with exact line numbers; this map confirms
> them against live source and pins the concrete excerpts the planner copies from.
> **Test-naming (D-04):** new test files are `{slug}.test.js` — NO `44-` prefix — despite
> the RESEARCH § Validation Architecture tables showing `44-*.test.js`. Use the slugs in
> the classification table below.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/cf-await-promotion.sh` (NEW) | script (CI shell) | request-response (poll) | `scripts/ci-resolve-docs-range.sh` (fail-closed shape) + `scripts/cf-purge-cache.sh` (curl idiom) | role-match |
| `scripts/build-staging.sh` (NEW, if shared-script) | script (build transform) | file-I/O / transform | `.github/workflows/deploy.yml:42-59` inline transform | exact (extraction of the analog) |
| `.github/workflows/deploy-preprod.yml` (NEW) | config (CI workflow) | event-driven (push trigger) | `.github/workflows/deploy.yml` (full) | exact |
| `.github/workflows/deploy.yml` (MODIFIED) | config (CI workflow) | event-driven | self (insert sentinel 86→88, make purge blocking) | self |
| `tests/cf-await-promotion.test.js` (NEW) | test | stub-binary offline | `tests/ci-resolve-docs-range.test.js` | exact |
| `tests/build-staging.test.js` (NEW) | test | tmp-dir offline | `tests/ci-resolve-docs-range.test.js` | role-match |
| `tests/conventions-hygiene.test.js` (NEW) | test | source-audit offline | `tests/ci-resolve-docs-range.test.js` (harness shell) | partial |
| `.planning/codebase/CONVENTIONS.md` §Comments (MODIFIED) | docs | n/a | *no code analog* — see Shared Patterns / D-02–D-04 | none |
| `assets/add-client.js:89` (MODIFIED) | source (one string) | n/a | self (in-place reword) | self |

## Pattern Assignments

### `scripts/cf-await-promotion.sh` (CI shell, poll-then-signal)

**Analogs:** `scripts/ci-resolve-docs-range.sh` (fail-closed exit-1 shape + doc-comment WHAT/WHY/CONTRACT header + testable-as-a-separate-script rationale) and `scripts/cf-purge-cache.sh` (curl + `grep -q '"success":true'` idiom).

**Shebang / strict-mode + doc-header pattern** — copy `ci-resolve-docs-range.sh:1-38`. That header states WHAT (one line to stdout), WHY it's a separate script (behavior needs a falsifiable test — inline YAML can't be unit-tested), and a CONTRACT block (stdout / stderr / exit-0 / exit-1). The new sentinel needs the same header shape: stdout quiet, all banners to stderr, exit 1 on timeout.

**Strict mode** (`ci-resolve-docs-range.sh:38`):
```sh
set -eu
```

**Fail-closed idiom to mirror** (`ci-resolve-docs-range.sh:79-82, 108-113`) — loud echo to `>&2`, then `exit 1`; never fall through to the success path on an unprovable condition:
```sh
echo "DOCS GATE: ls-remote failed (rc=$rc) — cannot prove ... failing closed." >&2
exit 1
```

**Core poll loop** — RESEARCH § Pattern 1 (lines 73-94) gives the exact loop derived from `deploy.yml:59` sed + `_headers:22-23` no-cache + `version.js:32` token. Match `BUILD_TOKEN = '${GITHUB_SHA::7}'` (7-hex, NOT full SHA — Pitfall 1). Timeout to stderr + `exit 1`, NO purge on timeout.

**curl idiom** — from `cf-purge-cache.sh:28-32` (POST + `--data '{"purge_everything":true}'`) for the purge; for the poll use `curl -fsS` against `https://sessionsgarden.app/assets/version.js` with a cache-buster query.

---

### `scripts/build-staging.sh` (build transform) — only if shared-script approach (Pattern 6, planner's call)

**Analog:** the inline transform in `.github/workflows/deploy.yml:42-59` — copy verbatim into a parameterized script, then have both workflows call it.

**Whitelist `cp` recipe** (`deploy.yml:44-52`):
```bash
mkdir -p deploy-staging
cp _headers deploy-staging/
cp _redirects deploy-staging/
cp LICENSE deploy-staging/
cp *.html deploy-staging/
cp -r assets deploy-staging/
cp manifest.json deploy-staging/
cp sw.js deploy-staging/
```

**Token stamp** (`deploy.yml:59`) — the load-bearing single transform; the committed `version.js` keeps its `'__BUILD_TOKEN__'` placeholder:
```bash
sed -i "s/'__BUILD_TOKEN__'/'${GITHUB_SHA::7}'/" deploy-staging/assets/version.js
```

**noindex divergence (pre-prod only, D-09 / Pattern 4)** — a `--noindex` flag that APPENDS a second `/*` block to the staged `_headers` copy only, never the committed file:
```bash
printf '\n/*\n  X-Robots-Tag: noindex\n' >> "<staging>/_headers"
```
The committed `_headers` global `/*` block (CSP + security headers) is lines 1-6 — must stay byte-identical; append, do not `sed`-into-block (Pitfall 2).

**No-leak invariant to preserve** (`deploy.yml:61-69`) — the "Verify no sensitive files" guard (`.planning`, `.claude`, `CLAUDE.md`, `.env`) becomes a real test assertion in `tests/build-staging.test.js`.

---

### `.github/workflows/deploy-preprod.yml` (NEW workflow)

**Analog:** `.github/workflows/deploy.yml` (full file) — mirror structure, change 4 things.

**Trigger + concurrency** — copy `deploy.yml:1-19`, change:
```yaml
on:
  push:
    branches: [pre-prod]      # was: [main]
concurrency:
  group: deploy-preprod       # was: deploy — MUST be separate group
  cancel-in-progress: true
```

**Push step** — copy `deploy.yml:75-86`, change BOTH the branch name and the remote target to `deploy-preprod` (Pitfall 3 — a verbatim copy would clobber prod's `deploy` branch and move the docs-gate anchor):
```bash
git checkout -b deploy-preprod   # was: deploy
git push -f origin deploy-preprod # was: origin deploy
```

**Deliberate omissions (D-08, D-09, Pattern 3):**
- NO "Docs gate (fail-closed)" step (`deploy.yml:21-40`) — docs-gate protects prod only.
- NO "Purge Cloudflare cache" step (`deploy.yml:88-96`) — pages.dev is out of Ben's zone; Pages auto-invalidates.
- The staging step injects the noindex `/*` block (see build-staging above).

---

### `.github/workflows/deploy.yml` (MODIFIED — DEBT-02)

**Insert** a new "Await Pages promotion (content sentinel)" step BETWEEN the push step (ends line 86) and the purge step (line 88) — calls `scripts/cf-await-promotion.sh` (RESEARCH § Pattern 1).

**Rewrite** the purge step (`deploy.yml:88-96`) from non-blocking to blocking (RESEARCH § Pattern 2). The current tail is the anti-pattern to replace:
```bash
    | grep -q '"success":true' && echo "Cache purged" || echo "Cache purge failed (non-blocking)"
```
Becomes: `set -eu`, capture response, `grep -q '"success":true'` → else loud stderr + `exit 1` (a confirmed-new origin + failed purge IS the mixed-cache bug).

---

### `tests/cf-await-promotion.test.js` (NEW — DEBT-02)

**Analog:** `tests/ci-resolve-docs-range.test.js` (the whole file is the template).

**Copy the harness scaffolding wholesale** (`ci-resolve-docs-range.test.js:45-109`):
- `test()` / `assert()` mini-runner (lines 60-65).
- `fs.mkdtempSync` temp dir + a stub executable written to a `bin/` dir, `chmodSync(..., 0o755)`, prepended to `PATH` (lines 67-89). **Here stub `curl`** (not `git`): a `#!/bin/sh` script whose output/exit is driven by `STUB_*` env vars per case.
- `spawnSync('sh', [SCRIPT], { env })` capturing `{ code, stdout, stderr }` (lines 95-109) — spawnSync (not execFileSync) so stderr is captured on BOTH success and failure.
- `finally { fs.rmSync(tmp, { recursive: true, force: true }); }` (lines 166-168) + `process.exit(failed === 0 ? 0 : 1)`.

**Cases to drive** (RESEARCH § Test Map): token-present→exit 0 fast; never-present→exit 1 after timeout with loud stderr, no range/no purge; present-on-Nth-poll→exit 0. Fold in a source-audit that `_headers` still declares `/assets/version.js` no-cache (Pitfall 4).

---

### `tests/build-staging.test.js` (NEW — DEBT-03, if shared-script)

**Analog:** same harness as above. Instead of stubbing a binary, run `sh scripts/build-staging.sh <tmp-dir>` against a checkout and assert on the staged tree:
- whitelist complete (all of `_headers`/`_redirects`/`LICENSE`/`*.html`/`assets/`/`manifest.json`/`sw.js` present).
- `__BUILD_TOKEN__` stamped in staged `version.js`.
- NO `.planning`/`.claude`/`CLAUDE.md`/`.env` in staged tree (turns `deploy.yml:61-69` into a real assertion).
- `--noindex` run has `X-Robots-Tag: noindex` in staged `_headers`; non-noindex run does NOT; CSP `/*` block (line 2) byte-identical in both.

---

### `tests/conventions-hygiene.test.js` (NEW — DEBT-01)

**Analog:** `tests/ci-resolve-docs-range.test.js` harness (`test`/`assert`/`readFileSync`), but a pure offline source-audit (no stub binary):
- `.planning/codebase/CONVENTIONS.md` §Comments no longer contains "do not omit" and now carries the strip-all-planning-IDs rule.
- `assets/add-client.js` contains no `D-23` (nor other `D-NN` planning IDs).

---

### `.planning/codebase/CONVENTIONS.md` §Comments (MODIFIED — DEBT-01, no code analog)

Pure docs edit (lines 149-157). Replace the "Phase/plan references … do not omit" instruction (line 151-153, the ROOT CAUSE) with the Phase 36 D-07 rule folded in: strip ALL planning IDs (`REQ-`/`OBS-`/`VER-`/`D-NN`/`CR-NN`/`T-N-N-N` → plain prose; keep the WHY). Preserve real technical tokens (`AES-256`, `SHA-256`, schema `v1–v6`, `IDBDatabase`). Record BOTH rationales (D-02): archived-`.planning/` dangling refs AND `assets/**` customer exposure. Fold in the test-naming rule (D-04): `{slug}.test.js`, no phase numbers. Source material: `36-COMMENT-STYLE-GUIDE.md` (stays archived, D-03). This is `.planning/`-only — no docs-gate implication.

### `assets/add-client.js:89` (MODIFIED — DEBT-01, one-line reword)

The ONLY shipped-comment/string edit this phase. Current (verified line 89):
```javascript
console.warn("Large photo upload:", file.size, "bytes — proceeding per D-23 (no hard cap)");
```
Reword to keep the no-hard-cap rationale, drop the `D-23` ID (customer-visible in DevTools today). Also edit `.planning/REQUIREMENTS.md` DEBT-01 (~line 46) and `.planning/ROADMAP.md` Phase 44 criterion 1 (~line 113) per D-06 (gate → v1.5 deferred) — both `.planning/`-only.

## Shared Patterns

### Fail-closed CI shell (loud stderr + exit 1)
**Source:** `scripts/ci-resolve-docs-range.sh:38, 79-82, 108-113`
**Apply to:** `cf-await-promotion.sh` (timeout, no purge), the rewritten purge step in `deploy.yml`.
```sh
set -eu
# ...
echo "ERROR: <condition> — failing closed." >&2
exit 1
```

### Testable-script-not-inline-YAML
**Source:** `scripts/ci-resolve-docs-range.sh:13-16` doc-header rationale + its paired test.
**Apply to:** both new scripts — the reason to extract shell out of workflow YAML is that only a separate script gets a stub-binary offline test.

### Stub-binary offline behavior test
**Source:** `tests/ci-resolve-docs-range.test.js:67-109`
**Apply to:** all three new test files. Temp `bin/` on `PATH`, `#!/bin/sh` stub driven by `STUB_*` env, `spawnSync('sh', ...)`, capture code/stdout/stderr, self-clean in `finally`.
**Runner:** discovered automatically by `node tests/run-all.js` (top-level `tests/*.test.js`); quick run `node tests/<file>.test.js`.

### curl-purge idiom
**Source:** `scripts/cf-purge-cache.sh:28-32` and `deploy.yml:91-96`
**Apply to:** `cf-await-promotion.sh` purge branch — `POST .../purge_cache`, `--data '{"purge_everything":true}'`, `grep -q '"success":true'`.

### Staging transform fidelity (whitelist cp + token sed)
**Source:** `.github/workflows/deploy.yml:44-59`
**Apply to:** `build-staging.sh` (if shared) and `deploy-preprod.yml` — the constraint is byte-faithfulness to the prod transform.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.planning/codebase/CONVENTIONS.md` §Comments | docs | n/a | Prose convention edit; no code pattern to copy. Source material is `36-COMMENT-STYLE-GUIDE.md` (archived, stays put). |

## Metadata

**Analog search scope:** `.github/workflows/`, `scripts/`, `tests/`, `_headers`, `assets/`, `.planning/codebase/`
**Files scanned:** 8 (deploy.yml, cf-purge-cache.sh, ci-resolve-docs-range.sh, ci-resolve-docs-range.test.js, _headers, CONVENTIONS.md, add-client.js, plus CONTEXT+RESEARCH)
**Pattern extraction date:** 2026-07-11
</content>
</invoke>
