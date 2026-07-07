# Phase 30: Test Harness & Coverage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-26
**Phase:** 30-test-harness-coverage
**Areas discussed:** Dev-dependency boundary, PDF test fix approach, God-module coverage target
**Areas offered but not selected:** RTL guard scope (planner-defaulted in CONTEXT D-11)

---

## Dev-dependency boundary (TEST-01, TEST-04)

| Option | Description | Selected |
|--------|-------------|----------|
| package.json, devDeps only | First package.json, `private`, jsdom in devDependencies, `npm test` script, gitignore node_modules. Production bundle unchanged. | ✓ |
| Keep zero-files convention | No package.json; document the /tmp/node_modules/jsdom + JSDOM_PATH manual approach. | |
| Drop jsdom entirely | Hand-vendor a minimal DOM/canvas stub; truly zero external deps but ~150–300 lines to maintain. | |

**User's choice:** package.json with devDependencies only.
**Notes:** Ben asked for a plain-English explanation. Key reframe that landed: production "zero deps" is about what ships to customers (the car); jsdom is a workbench tool (the crash-test dummy) that never ships. Ben then stated the general principle himself: "we don't need to be that restrictive if it's about testing of development and not production code." → captured as D-03 and promoted to a project Key Decision.

---

## PDF test fix approach (TEST-01)

| Option | Description | Selected |
|--------|-------------|----------|
| One shared helper file | jsdom setup in one tests/_helpers/ file used by all 7 PDF tests; set min Node version in package.json. | ✓ |
| Fix each test in place | Patch the missing stub into each of the 7 tests individually; same fix copy-pasted 7×. | |

**User's choice:** One shared helper file.
**Notes:** Two root causes explained plainly — missing `HTMLCanvasElement.getContext` (stub → null, already the pattern) and old-Node `blob.arrayBuffer` (resolved by requiring modern Node via `engines`). Guardrail added (D-06): adopt the helper for the 7 broken tests at minimum; migrating the ~9 already-green jsdom tests is opportunistic and must never turn a green test red.

---

## God-module coverage target (TEST-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Focused on what breaks | Pin the user-visible behaviors most likely disturbed by the refactor (save/load, form-state); accept <100% coverage. | |
| Go broad | Cover as much observable behavior of both files as practical before the refactor. | ✓ |
| Thin smoke layer | A few tests around the 2–3 riskiest functions only. | |

**User's choice:** Go broad.
**Notes:** Partner pushback given honestly — "go broad" is the highest-effort option because these files are UI-tangled. Ben held the line; rationale recorded (D-07): it protects Phase 31, the riskiest v1.2 work. Two enablers/guardrails captured: D-08 (test observable behavior only, never internal plumbing — else every test breaks during the refactor); D-09 (jsdom from D-01 unlocks loading the real page to exercise real handlers, making "broad" feasible); D-10 (research must produce a concrete behavior inventory + effort estimate so "broad" stays bounded, not a blank cheque).

---

## Claude's Discretion

- Exact shared-helper filename/location, the precise Node version floor, the `npm test` runner implementation (`tests/run-all.js` vs shell glob), and the specific god-module behavior inventory — all delegated to research + planning, constrained by the locked decisions.
- RTL guard scope (TEST-02) — not selected for discussion; CONTEXT D-11 sets the intended default (test the dir-applying function across all 4 locales, HE→rtl / EN·DE·CS→ltr) for the planner to refine.

## Deferred Ideas

- Migrating already-passing jsdom tests onto the shared helper — opportunistic only.
- Coverage tooling / enforced thresholds — out of scope; coverage stays informal.
- E2E / visual-regression testing (Playwright/Cypress) — out of scope.
