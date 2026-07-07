---
phase: 32
slug: readme-code-comments
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-28
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> This is a **documentation phase** (README rewrite + comment-only edits + two `.planning/` planning artifacts). There is **no new runtime behavior** to sample. Validation rests on three legs: (1) the existing suite stays green, (2) the DOCS-02 diff is provably comments-only, (3) source/artifact assertions on the produced docs. Full rationale: `32-RESEARCH.md` → `## Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test`-style custom harness via `tests/run-all.js` (+ `jsdom` for DOM-dependent suites) |
| **Config file** | none — custom runner (`tests/run-all.js`); `jsdom` is a dev-only devDependency |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` (= `node tests/run-all.js`) |
| **Estimated runtime** | single command; whole suite |

> Production ships static `/assets/*` with **zero runtime dependencies**. `package.json` / `node_modules` exist solely to run the suite. No code in the 5 comment-target files is modified, so the suite is a **regression backstop**, not new coverage.

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After the DOCS-02 comment edits:** Run the **comments-only diff gate** (strip-and-compare: baseline `git show` vs working tree, comments + whitespace stripped, assert byte-equal — sound even with an imperfect stripper because unchanged code lines are processed identically on both sides). The diff must touch **zero code lines** across all 5 files.
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite green + comments-only gate green.
- **Max feedback latency:** one suite run.

---

## Per-Task Verification Map

> Populated per-plan by the planner. The dominant verify mechanisms for this phase are:

| Deliverable | Requirement | Verify mechanism (automated unless noted) |
|-------------|-------------|-------------------------------------------|
| README rewrite | DOCS-01 | grep assertions on required `##` sections (Run locally · Deploy/ship · File-map · How do I… · Run the tests · Rules an agent must not break · Troubleshoot); recipe accuracy = manual review against live files |
| Stop shipping README (D-04) | DOCS-01 | `.github/workflows/deploy.yml` no longer contains `cp README.md` (grep returns empty) |
| Comment edits on 5 files | DOCS-02 | `npm test` green **and** comments-only strip-and-compare gate green (zero code lines changed) |
| De-phase-numbering (D-10a) | DOCS-02 | grep: no `// Phase NN` / `Plan NN` / `D-NN (Phase X)` archaeology remains in the 5 files |
| Responsibility banners (D-10b) | DOCS-02 | each of the 5 files opens with a header banner (owns · public surface · `window.*` deps · invariants); `add-session.js` gains a brand-new header |
| Help-content inventory (D-13) | DOCS-01 | artifact exists at its `.planning/` path with topic/workflow tree + per-leaf tags |
| Comment-coverage map (D-14) | DOCS-02 | artifact exists at its `.planning/` path; every JS module flagged done/remaining; batch-1 = `db.js`/`overview.js`/`sessions.js` |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] None — existing `tests/run-all.js` harness is the regression backstop; this is a docs/comment-only phase that adds **no new test files**. The DOCS-02 risk is mitigated by the comments-only diff gate (a one-shot scripted check, not a committed test — reusable comment-gate tooling is a batch-2 concern per RESEARCH.md open question #1), not by new unit tests.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| README recipe accuracy | DOCS-01 | Prose correctness can't be unit-asserted | Walk each "how do I…" recipe against the live file it documents (`deploy.yml`, `version.js`, `sw.js` `PRECACHE_URLS`, `package.json`); confirm `APP_VERSION` and commands match |
| Banner orientation quality | DOCS-02 | "Does this header actually orient a reader/agent?" is a judgment call | Read each new/edited banner; confirm it states what the file owns, its public surface, its `window.*` dependency chain, and key invariants |

---

## Validation Sign-Off

- [ ] All deliverables have an automated assertion OR a documented manual verification
- [ ] Sampling continuity: `npm test` after every commit; comments-only gate after DOCS-02
- [ ] Wave 0 covers all MISSING references (N/A — no new tests)
- [ ] No watch-mode flags
- [ ] Feedback latency = one suite run
- [ ] `nyquist_compliant: true` set in frontmatter (set by planner once per-task verify is wired)

**Approval:** pending
