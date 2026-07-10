---
phase: 43
slug: docs-maintenance-hard-gate
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-10
---

# Phase 43 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `43-RESEARCH.md` §Validation Architecture. D-21 is the project's standing
> "behavior tests before implementation" rule applied to this phase.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bespoke node runner — each `tests/*.test.js` is a standalone `exit 0/1` process, discovered by glob in `tests/run-all.js` |
| **Config file** | none — glob discovery, zero registration |
| **Quick run command** | `node tests/docs-gate.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~2 seconds (quick) / ~90 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `node tests/docs-gate.test.js`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds (quick), 90 seconds (full)

The gate is itself a sampling instrument. Once `.githooks/pre-push` is installed, every
push samples the docs invariants; once the CI step lands, every deploy does. The Nyquist
floor is the deploy boundary — the exact event GATE-01 and GATE-04 constrain.

---

## Per-Requirement Verification Map

| Req | Observable behavior that proves it | Test type | Automated command | Wave 0 | Status |
|-----|-----------------------------------|-----------|-------------------|--------|--------|
| **GATE-01** | RED: staged user-facing change, no changelog entry → gate exits non-zero, message names file + claiming topics. GREEN: add entry → exit 0. | behavior | `node tests/docs-gate.test.js` | ❌ W0 | ⬜ pending |
| **GATE-02** (i) | After `npm install`, `git config core.hooksPath` returns `.githooks` | integration | `git config core.hooksPath` | ✅ | ⬜ pending |
| **GATE-02** (ii) | CI step exists in `deploy.yml` before "Prepare deploy directory" and exits 1 on breach | static + live | grep assertion + live v1.3.0 CI run | ✅ | ⬜ pending |
| **GATE-02** (iii) | DoD line present in `CLAUDE.md` | static | grep assertion | ✅ | ⬜ pending |
| **GATE-03** (a) | Role table is self-consistent: no path is both denylisted and a trigger; no satisfier raises its own demand | unit (invariant #4) | `node tests/docs-gate-role-table.test.js` | ❌ W0 | ⬜ pending |
| **GATE-03** (b) | Each of the 3 trailers demonstrably flips a BLOCK to a PASS | behavior | `node tests/docs-gate.test.js` | ❌ W0 | ⬜ pending |
| **GATE-04** (a) | `APP_VERSION` changed in range + matching entry with non-empty `highlights` → PASS; entry missing → BLOCK; `origin: true` entry tolerated | behavior | `node tests/docs-gate.test.js` | ❌ W0 | ⬜ pending |
| **GATE-04** (b) | v1.3.0's real push to `main` goes green through the new CI step | live ship | one-time, at milestone close | n/a | ⬜ pending |
| **D-17 #1** | `HELP-MAP.md` byte-matches a fresh regeneration | unit | `node tests/help-integrity.test.js` | ✅ | ⬜ pending |
| **D-17 #2** | Every path named in any `covers[]` exists on disk | unit | `node tests/help-integrity.test.js` | ✅ | ⬜ pending |
| **D-17 #3** | Changelog entries have unique versions, non-empty `highlights`, real dates | unit | `node tests/changelog-integrity.test.js` | ✅ | ⬜ pending |
| **D-20** | `covers[]` absent from all three locale files; locale parity tests green | unit | `node tests/help-integrity-locale.test.js` | ✅ | ⬜ pending |
| **D-22** | After rename, `grep -rl <old-name>` returns **exactly** the 51 historical artifacts | post-condition | before/after set diff, asserted as a plan task | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Written **before** the gate script exists (D-21). These fail RED until their implementation lands —
that redness is the proof the test is falsifiable.

- [ ] `tests/docs-gate.test.js` — the RED/GREEN behavior test. Builds a throwaway git repo in
      `fs.mkdtempSync(os.tmpdir())`, isolates from the real gitconfig (`GIT_CONFIG_GLOBAL=/dev/null`),
      seeds a fake `origin/main` ref, runs the **real** `scripts/docs-gate.js` via `execFileSync`,
      and asserts on exit code + stderr. Covers: block-on-missing-changelog, block-on-untouched-help-topic,
      block-on-uncovered-file, each of the 3 trailers flipping to PASS, and the GATE-04 release-moment branch.
- [ ] `tests/docs-gate-role-table.test.js` — D-17 invariant #4. Asserts the denylist / satisfier /
      trigger role table neither overlaps nor contradicts itself.
- [ ] `scripts/lib/` shared invariants + content loader module — the `vm`-sandbox loader currently
      inlined in `tests/39-help-integrity.test.js`, extracted so the gate script and the renamed
      integrity tests share one implementation (D-17's "one implementation, two callers").

*Everything else runs on existing infrastructure — `tests/run-all.js` glob discovery needs no wiring.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Local hook fires on a real push | GATE-02 (i) | Requires a real remote and a real `git push`; the automated test exercises the script, not git's hook dispatch | After `npm install`, confirm `git config core.hooksPath` → `.githooks`. Make a throwaway user-facing edit on a scratch branch off `main`, `git push` to a fork/scratch remote, observe the block. |
| CI step blocks a real push | GATE-02 (ii) | Requires GitHub Actions | Push a branch with a deliberate breach to a scratch repo, or observe the step in the v1.3.0 run. |
| v1.3.0 ships green | GATE-04 (b) | One-time live event | At milestone close, watch the deploy run. **A passing push proves the gate does not false-block; only `tests/docs-gate.test.js` proves it can block.** Both are required. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s (quick) / < 90s (full)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
