---
phase: 44
slug: tech-debt-guardrails-pre-prod-environment
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-11
---

# Phase 44 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Detailed requirement→test map source of truth: `44-RESEARCH.md` § Validation Architecture — the planner lifts Wave 0 tests from there.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | zero-npm handwritten runner — one `node` child process per `tests/*.test.js`, exit-0/1 contract |
| **Config file** | none — discovery is top-level `tests/*.test.js` via `tests/run-all.js` |
| **Quick run command** | `node tests/<file>.test.js` |
| **Full suite command** | `node tests/run-all.js` |
| **Estimated runtime** | ~seconds (offline stub-binary tests; no network) |

---

## Sampling Rate

- **After every task commit:** Run `node tests/<file>.test.js` for the touched behavior
- **After every plan wave:** Run `node tests/run-all.js`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

Populated by the planner from RESEARCH § Validation Architecture → "Phase Requirements → Test Map".
**Test filenames MUST follow the D-04 rule this phase establishes — `{slug}.test.js`, NO phase numbers**
(matches the precedent `tests/ci-resolve-docs-range.test.js`; the `44-*` names in RESEARCH are illustrative and superseded by D-04).

| Requirement | Behavior | Test type | Automated command |
|-------------|----------|-----------|-------------------|
| DEBT-01 | CONVENTIONS.md §Comments no longer says "do not omit"; `add-client.js` has no `D-23` | source-audit (offline) | `node tests/conventions-hygiene.test.js` |
| DEBT-02 | Sentinel poll: token-present→exit 0 fast; never-present→exit 1 after timeout (loud stderr); present-on-Nth-poll→exit 0 | stub-`curl` behavior (offline) | `node tests/cf-await-promotion.test.js` |
| DEBT-02 | `_headers` still declares `version.js` no-cache (sentinel precondition) | source-audit (offline) | folded into `cf-await-promotion.test.js` |
| DEBT-03 | Staging transform: whitelist complete, `__BUILD_TOKEN__` stamped, no `.planning`/`.claude`/`CLAUDE.md`/`.env` leak | run `build-staging.sh` vs tmp checkout (offline) | `node tests/build-staging.test.js` |
| DEBT-03 | noindex present in pre-prod staged `_headers`, ABSENT in prod staged `_headers` | source-audit (offline) | folded into `build-staging.test.js` |

*The `build-staging.*` items are conditional on the shared-script approach (RESEARCH Pattern 6 / Open Question 1). If the planner chooses raw duplication, the transform-fidelity test attaches to the pre-prod workflow logic instead — the behavior is still required.*

---

## Wave 0 Requirements

- [ ] `tests/conventions-hygiene.test.js` — DEBT-01 source-audit stub
- [ ] `tests/cf-await-promotion.test.js` — DEBT-02 stub-`curl` behavior spec
- [ ] `tests/build-staging.test.js` — DEBT-03 transform fidelity + noindex divergence *(if shared-script chosen)*
- [ ] `scripts/cf-await-promotion.sh` — extracted, testable poll (DEBT-02)
- [ ] `scripts/build-staging.sh` — extracted, testable transform *(if shared-script chosen)*

*Precedent: `scripts/ci-resolve-docs-range.sh` + `tests/ci-resolve-docs-range.test.js` (stub-binary offline pattern).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CF Pages promotion latency + real poll against `sessionsgarden.app` | DEBT-02 | Only observable on a live CI run against the real edge | Trigger a real prod deploy; confirm sentinel confirms, then purge runs |
| Actual zone purge success | DEBT-02 | Requires real CF zone + secrets | Observe deploy log: purge after confirmed promotion |
| `*.pages.dev` clean-URL + `INTEGRITY_TOKEN` roll on a real installed PWA / iOS Safari | DEBT-03 | jsdom/python false-pass SW/offline (the whole reason pre-prod exists) | Push `pre-prod`, install PWA from `<slug>.pages.dev`, cold-launch offline |
| noindex header-merge on real pre-prod origin (Assumption A-1) | DEBT-03 | CF header-merge behavior only confirmable live | `curl -I` the pre-prod origin; assert `X-Robots-Tag: noindex` + base CSP both present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
