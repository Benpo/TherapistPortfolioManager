---
phase: 36
slug: code-comments-batch-2
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-01
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> This is a **comment-only phase** (file-top banners + de-phasing archaeology on 22 production modules). There is **no new runtime behavior** to sample. Validation rests on three legs: (1) the existing suite stays green, (2) each batch's diff is provably comments-only, (3) source assertions on the produced banners. Method reused from `32-RESEARCH.md` → `## Validation Architecture` (fresh research skipped for this continuation).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | custom `node:test`-style harness via `tests/run-all.js` (+ `jsdom` for DOM-dependent suites) |
| **Config file** | none — custom runner (`tests/run-all.js`); `jsdom` is a dev-only devDependency |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` (= `node tests/run-all.js`) |
| **Estimated runtime** | single command; whole suite |

> Production ships static `/assets/*` with **zero runtime dependencies**. `package.json` / `node_modules` exist solely to run the suite. **No code line in any of the 22 target files is modified**, so the suite is a **regression backstop**, not new coverage.

---

## Sampling Rate

- **After every task commit:** Run `npm test`.
- **After each batch's comment edits:** Run the **comments-only diff gate** (strip-and-compare: baseline `git show` vs working tree, comments + whitespace stripped, assert byte-equal — sound even with an imperfect stripper because unchanged code lines are processed identically on both sides). The diff must touch **zero code lines** across that batch's files.
- **After every plan wave:** Run `npm test`.
- **Before `/gsd-verify-work`:** Full suite green + comments-only gate green over **all 22 files**.
- **Max feedback latency:** one suite run.

---

## Per-Task Verification Map

> Populated per-plan by the planner. The dominant verify mechanisms for this phase are:

| Deliverable | Requirement | Verify mechanism (automated unless noted) |
|-------------|-------------|-------------------------------------------|
| Comment edits on each batch's files | DOCS-03 | `npm test` green **and** comments-only strip-and-compare gate green (zero code lines changed) for that batch's exact file set |
| New banners on header-less files | DOCS-03 | each header-less file (`db.js`, `sessions.js`, `add-client.js`, `reporting.js`, + any found on scan) now **opens** with a `//` banner block; grep: file's first non-blank line is a comment |
| De-phase-numbering | DOCS-03 | grep across the batch's files: **no** `// Phase NN` / `Plan NN` / `D-NN` / bug-ticket (`\d{6}-[a-z0-9]{3}`) archaeology remains |
| Banner shape (D-03) | DOCS-03 | each banner names what the file owns, its public `window.*` surface, its cross-`window.*` deps, and key invariants (proportionate per D-05 for trivial files) — manual read |
| Scope fence (D-01) | DOCS-03 | the three giants (`backup.js`/`app.js`/`pdf-export.js`) are **untouched** in this phase's diff (`git diff --name-only` excludes them) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] None — the existing `tests/run-all.js` harness is the regression backstop; this is a comment-only phase that adds **no new test files**. The DOCS-03 risk is mitigated by the per-batch comments-only diff gate (a one-shot scripted check, not a committed test — reusable gate tooling stays deferred per `32-RESEARCH.md` open question #1), not by new unit tests.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Banner orientation quality | DOCS-03 | "Does this header actually orient a reader/agent?" is a judgment call | Read each new/edited banner; confirm it states what the file owns, its public `window.*` surface, its dependency chain, and key invariants — and that trivial files (D-05) got a concise banner, not a padded one |
| De-phase preserves the WHY | DOCS-03 | Rewriting `// Phase X` / ticket refs into plain text must keep the *reason*, not just delete the number | Spot-check de-phased lines (e.g. `overview.js`'s missing-birth-year flag) — the constraint the archaeology encoded is still explained in plain words |

---

## Validation Sign-Off

- [ ] All deliverables have an automated assertion OR a documented manual verification
- [ ] Sampling continuity: `npm test` after every commit; comments-only gate after each batch
- [ ] Wave 0 covers all MISSING references (N/A — no new tests)
- [ ] No watch-mode flags
- [ ] Feedback latency = one suite run
- [ ] `nyquist_compliant: true` set in frontmatter (set by planner once per-task verify is wired)

**Approval:** pending
