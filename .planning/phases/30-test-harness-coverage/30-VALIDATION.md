---
phase: 30
slug: test-harness-coverage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-26
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `30-RESEARCH.md` §"Validation Architecture". Every requirement names the
> falsifiable behavior test(s) that prove it — FAIL before / PASS after, per
> `feedback-behavior-verification`. **For TEST-03 this is the whole point:** a test must
> *execute* the module and fail on an observable-output change while surviving an internal
> rename (the D-12 architect risk).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test loop + `assert` + `node:vm` + jsdom 29.1.1 (no Jest/Vitest) |
| **Config file** | none today → `package.json` introduced this phase (Wave 0) |
| **Quick run command** | `node tests/<file>.test.js` (single file) |
| **Full suite command** | `npm test` (→ `node tests/run-all.js`) — NEW this phase |
| **Estimated runtime** | ~30–60s full suite (jsdom real-page tests dominate) |

---

## Sampling Rate

- **After every task commit:** Run the single new/affected `node tests/<file>.test.js`
- **After every plan wave:** Run `npm test` (full suite green)
- **Before `/gsd-verify-work`:** Full suite must be green — this green suite IS the Phase 31 guardrail
- **Max feedback latency:** ~60 seconds

---

## Per-Requirement Verification Map

> Task IDs are assigned by the planner (PLAN.md). This map is the requirement→test contract
> the planner must honor; each test file is a Wave 0 / Wave 1 deliverable.

| Requirement | Behavior to prove (observable) | Test Type | Automated Command | File Exists? |
|-------------|-------------------------------|-----------|-------------------|-------------|
| TEST-01 | 7 PDF tests run green via the shared helper; `getContext` stubbed→null; `blob.arrayBuffer` present | jsdom integration | `npm test` (runs the 7) | ✅ tests exist; ❌ shared helper (Wave 0) |
| TEST-02 | `App.setLanguage('he')`→`dir=rtl`; `en/de/cs`→`ltr`; FAILS if rtl applied to non-Hebrew | jsdom/vm behavior | `node tests/30-rtl-guard.test.js` | ❌ Wave 0 |
| TEST-03a | `settings.js` section-title **save→reload round-trip** persists & re-renders | jsdom real-page | `node tests/30-settings-section-roundtrip.test.js` | ❌ Wave 0 (closes documented gap) |
| TEST-03b | `settings.js` tab nav: `?tab=` selects active tab; invalid value falls back | vm/jsdom | `node tests/30-settings-tabnav.test.js` | ❌ Wave 0 |
| TEST-03c | `add-session.js` `buildSessionMarkdown` / `buildFilteredSessionMarkdown` emit correct sections/order/labels (EXECUTED, not source-sliced) | jsdom real-page | `node tests/30-export-markdown.test.js` | ❌ Wave 0 (replaces regex slicing) |
| TEST-03d | `add-session.js` export stepper: active-step 1→2→3, preview updates with toggles | jsdom real-page | `node tests/30-export-stepper.test.js` | ❌ Wave 0 |
| TEST-03e | `add-session.js` issue severity **delta** + payload shape + empty-validation | vm/jsdom | `node tests/30-issue-delta.test.js` | ❌ Wave 0 |
| TEST-04 | `npm test` runs all `tests/*.test.js`; fails if any file exits non-zero | meta/runner | `npm test` | ❌ Wave 0 (`run-all.js` + `package.json`) |

*Status legend: ✅ green · ❌ red/missing · ⚠️ flaky. Test filenames above are research recommendations; the planner may refine names, not the behavior contract.*

---

## Wave 0 Requirements

- [ ] `package.json` — `private:true`, `devDependencies={jsdom ^29.1.1}`, `engines >=18`, `test` script — **TEST-04**
- [ ] `tests/run-all.js` — suite runner (continue-on-fail, aggregate non-zero exit) — **TEST-04**
- [ ] `tests/_helpers/jsdom-pdf-env.js` — shared jsdom env (`getContext`→null + deterministic date/fileId pinning) — **TEST-01**
- [ ] `tests/_helpers/app-stub.js` — `App.*` stub surface for real-page god-module tests (`App.t`, `getSectionLabel`, `showToast`, `getSeverityValue`, `formatDate`, `initCommon`, `installNavGuard`, `isSectionEnabled`, `createSeverityScale`, …) — **TEST-03**
- [ ] HTML fixtures: reuse `settings.html` / `add-session.html` bodies directly — no new fixture files (they exist at 347 / 612 lines)
- [ ] Verify `.gitignore` contains `node_modules/` (already present — verify only)
- [ ] `npm install` (jsdom) — once

---

## Manual-Only Verifications

*All phase behaviors have automated verification* — every requirement is an automated Node/jsdom test. No manual-only checks (this is a test-infrastructure phase).

The one human-judgement item is **not** a behavior test but a process gate: the D-12 architect-soundness review of PLAN.md (research → planner → plan-checker → architect-verifier → Ben).

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`run-all.js` runs once, exits)
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter (post-Wave-0)

**Approval:** pending
