---
phase: 41
slug: replayable-guided-tour
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-08
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Populated from `41-RESEARCH.md` §Validation Architecture and reconciled against the real tasks/tests in plans `41-01`..`41-07`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Custom Node runner — `tests/run-all.js` (spawnSync per `tests/*.test.js`), Node `assert`, jsdom v29 |
| **Config file** | none — discovery + behavior hardcoded in `tests/run-all.js` |
| **Quick run command** | `node tests/41-<slug>.test.js` (single file) |
| **Full suite command** | `npm test` (= `node tests/run-all.js`) |
| **Estimated runtime** | single file ~1–3s; full suite ~1–3 min (~146 spawnSync files — estimate) |

> jsdom has **no layout engine** (`getBoundingClientRect` → 0s), so RTL/pixel-geometry assertions CANNOT run in the Node suite. They are the Plan 41-07 Playwright-WebKit manual gate (see Manual-Only Verifications). Playwright is a **global** install, not a project devDependency, so the WebKit probe is deliberately NOT in `npm test` and lives under `tests/webkit/` (outside the runner glob).

---

## Sampling Rate

- **After every task commit:** Run `node tests/41-<touched>.test.js` (the file(s) the task affects)
- **After every plan wave:** Run `npm test` (full suite — ~146 files must stay green)
- **Before `/gsd-verify-work`:** Full suite green **+** `node tests/webkit/41-rtl-geometry.mjs` (WebKit RTL/geometry gate) passes **+** one real-Safari UAT sign-off (Plan 41-07)
- **Max feedback latency:** single-file < ~5s; full suite per wave

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 41-01-01 | 01 | 1 | TOUR-01, TOUR-04 | T-41-01 | Copy is bundled static data; downstream engine renders via textContent | static parity (vm) | `node tests/41-tour-i18n-parity.test.js` (expect exit 1 — RED) | ❌ W0 (creates) | ⬜ pending |
| 41-01-02 | 01 | 1 | TOUR-01, TOUR-04 | T-41-01 | 30 `help.tour.*` keys × 4 locales, no interpolation of untrusted input | static parity (vm) | `node tests/41-tour-i18n-parity.test.js && node tests/run-all.js` | ✅ (41-01-01) | ⬜ pending |
| 41-02-01 | 02 | 1 | TOUR-02 | T-41-02 | Rot guard prevents silent anchor removal → silent skip | unit (fs source-scan) | `node tests/41-anchor-presence.test.js` (expect exit 1 — RED) | ❌ W0 (creates) | ⬜ pending |
| 41-02-02 | 02 | 1 | TOUR-02, TOUR-03 | T-41-02 | Anchors are inert compile-time-literal attributes; no behavior attaches | unit (fs source-scan) | `node tests/41-anchor-presence.test.js && node tests/run-all.js` | ✅ (41-02-01) | ⬜ pending |
| 41-03-01 | 03 | 2 | TOUR-01, TOUR-02, TOUR-03 | T-41-01 | Pins no-auto-run, never-silent-skip, D-09 relaunch-from-1 before code | unit (jsdom/vm) | `for t in launch-explicit fallback-degradation resume-state; do node tests/41-$t.test.js; test $? -eq 1 \|\| exit 1; done` | ❌ W0 (creates 3) | ⬜ pending |
| 41-03-02 | 03 | 2 | TOUR-01, TOUR-02, TOUR-03 | T-41-01, T-41-03, T-41-04 | textContent-only copy; only innerHTML is a compile-time SVG literal; page inert via App.lockBodyScroll | unit (jsdom/vm) | `node tests/41-launch-explicit.test.js && node tests/41-fallback-degradation.test.js && node tests/41-resume-state.test.js && node tests/run-all.js` | ✅ (41-03-01) | ⬜ pending |
| 41-03-03 | 03 | 2 | TOUR-02, TOUR-04 (visual) | T-41-01 | Token-only + logical-property CSS; no literal hex / physical left-right | static gate (grep) + regression; visual → WebKit (Plan 07) | `node tests/run-all.js && ! grep -nE '#[0-9a-fA-F]{3,6}\b' assets/tour.css && ! grep -nE '\b(left\|right):' assets/tour.css` | n/a (CSS) | ⬜ pending |
| 41-04-01 | 04 | 3 | TOUR-04 | T-41-01 | Pins text-level re-render on `app:language` before code | unit (jsdom/vm) | `node tests/41-lang-rerender.test.js` (expect exit 1 — RED) | ❌ W0 (creates) | ⬜ pending |
| 41-04-02 | 04 | 3 | TOUR-01, TOUR-04 | T-41-01, T-41-05 | cleanup-then-replace re-render, once-only listener; sg.tour* flags disjoint from security-note; textContent-only | unit (jsdom/vm) | `node tests/41-lang-rerender.test.js && node tests/41-launch-explicit.test.js && node tests/41-fallback-degradation.test.js && node tests/41-resume-state.test.js && node tests/run-all.js` | ✅ (41-04-01) | ⬜ pending |
| 41-04-03 | 04 | 3 | TOUR-04, TOUR-05 (visual) | T-41-01 | Bottom-sheet / finish / exit CSS token-only, logical props only | static gate (grep) + regression; visual → WebKit (Plan 07) | `node tests/run-all.js && ! grep -nE '#[0-9a-fA-F]{3,6}\b' assets/tour.css && ! grep -nE '\b(left\|right):' assets/tour.css` | n/a (CSS) | ⬜ pending |
| 41-05-01 | 05 | 4 | TOUR-01, TOUR-03 | T-41-01, T-41-06 | "?" tour row demo-gated (window.name==='demo-mode'); resume typeof-guarded; no auto-run | unit (jsdom) | `node tests/41-demo-gate.test.js && node tests/run-all.js` (RED-first, then green) | ❌ W0 (creates) | ⬜ pending |
| 41-05-02 | 05 | 4 | TOUR-01, TOUR-03 | T-41-05, T-41-06 | Reminder OFFERS only (Tour.start only in Start handler); welcome CTA keeps dismiss bookkeeping (Pitfall 8); disjoint flags | regression | `node tests/run-all.js` | ✅ (existing coordinator suite) | ⬜ pending |
| 41-06-01 | 06 | 4 | TOUR-03, offline | T-41-07 | Precache no-drift guard (page refs == precached paths); demo excluded | static (fs-scan) | `node tests/41-precache.test.js` (expect exit 1 — RED) | ❌ W0 (creates) | ⬜ pending |
| 41-06-02 | 06 | 4 | TOUR-03, TOUR-04 | T-41-07 | tour.js/tour.css precached (offline availability); loaded after app.js; demo.html excluded (D-16) | static (fs-scan) | `node tests/41-precache.test.js && node tests/run-all.js` | ✅ (41-06-01) | ⬜ pending |
| 41-07-01 | 07 | 5 | TOUR-02, TOUR-04 | T-41-08 | Real-WebKit gate catches Phase-37/40 WebKit-only defect class before ship | manual/scripted (Playwright-WebKit) | `node tests/webkit/41-rtl-geometry.mjs` (ad-hoc — NOT in npm test) | ❌ W0 (creates) | ⬜ pending |
| 41-07-02 | 07 | 5 | TOUR-01..04 | T-41-08 | Real-Safari + installed-PWA offline UAT; 8-point human sign-off | manual (human-verify checkpoint) | Plan 41-07 Task 2 — see Manual-Only Verifications | n/a (manual) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **Structure note:** this phase has **no separate Wave 0 plan**. Each implementing plan writes its own RED test as its FIRST task (write-first / TDD), then the following task flips it green. "❌ W0 (creates)" marks the RED-authoring task that creates the scaffold; "✅ (NN-NN)" marks the task that inherits an already-created test from the prior task. `41-05-01` authors its demo-gate test RED then greens it inside the same task.

---

## Wave 0 Requirements

No dedicated Wave 0 plan. All write-first (RED) test scaffolds are embedded as the first task of their implementing plan and are created during execution (hence `wave_0_complete: false` — the scaffolds are fully *planned* but not yet on disk). Every MISSING test reference below has a designated creating task:

- [ ] `tests/41-tour-i18n-parity.test.js` — 4-locale key parity gate (Plan 41-01 Task 1, RED-first)
- [ ] `tests/41-anchor-presence.test.js` — TOUR-02 rot guard, source-scan (Plan 41-02 Task 1, RED-first — write BEFORE anchors land)
- [ ] `tests/41-launch-explicit.test.js` — TOUR-01 no-auto-run / explicit start (Plan 41-03 Task 1, RED-first)
- [ ] `tests/41-fallback-degradation.test.js` — TOUR-02 fallback modal, never-silent-skip (Plan 41-03 Task 1, RED-first)
- [ ] `tests/41-resume-state.test.js` — TOUR-03 cross-page round-trip **+ D-09 relaunch-from-step-1 + clear-on-end** (consolidated; no separate `41-relaunch-restart.test.js`) (Plan 41-03 Task 1, RED-first)
- [ ] `tests/41-lang-rerender.test.js` — TOUR-04 text-level re-render on `app:language` (Plan 41-04 Task 1, RED-first)
- [ ] `tests/41-demo-gate.test.js` — TOUR-01 "?" tour row hidden in demo (Plan 41-05 Task 1, RED-first-then-green)
- [ ] `tests/41-precache.test.js` — offline precache + page-reference no-drift (Plan 41-06 Task 1, RED-first)
- [ ] `tests/webkit/41-rtl-geometry.mjs` — Playwright-WebKit RTL/geometry probe (Plan 41-07 Task 1; ad-hoc manual gate, NOT in `npm test`)
- [ ] Implementation prerequisite (not a test): `data-tour` anchors on all 10 chrome elements across 4 pages + app.js — guarded by `41-anchor-presence.test.js` (Plan 41-02 Task 2)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RTL (Hebrew) tether-arrow flip + tooltip/spotlight on-anchor geometry + clean EN→HE→DE→CS mid-tour re-render | TOUR-04 (+ TOUR-02 fallback geometry) | jsdom has no layout engine (`getBoundingClientRect` → 0); needs real WebKit layout. Playwright is a **global** install, not a project devDep, so it is intentionally excluded from `npm test`. | `node tests/webkit/41-rtl-geometry.mjs` (Plan 41-07 Task 1). Launches WebKit, starts the live tour, asserts the Hebrew arrow side differs from English (real flip, not just `direction:rtl`), tooltip inside viewport, spotlight overlaps anchor, and each locale cycle re-renders cleanly. Exit 0 on pass. Re-install binary if stale: `npx playwright install webkit`. |
| Full 10-step spine on a real device — welcome-CTA launch + dismiss bookkeeping (Pitfall 8), cross-page resume (3→4, 6→7, 7→8), mid-tour language switch, fresh-app spotlights (not fallbacks), exit choice → low-precedence reminder OFFER, finish card + relaunch-from-step-1 (D-09), offline availability, demo-exclusion | TOUR-01 / TOUR-02 / TOUR-03 / TOUR-04 | Real-device Safari rendering + installed-PWA offline behavior cannot be automated in this repo's runner; the Phase-37/40 WebKit-only bug class only surfaces on shipping Safari. | Plan 41-07 Task 2 (`checkpoint:human-verify`, gate=blocking). Prefer an installed PWA in Safari; run the 8-point script in the plan; Ben signs off ("approved") before `/gsd-verify-work`. Any RTL/geometry/resume/silent-skip issue routes as gap-closure. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or a documented manual gate (WebKit probe + real-Safari UAT)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every implementing task runs its test file + `run-all`; CSS tasks run `run-all` + grep gates)
- [x] Wave 0 covers all MISSING references (every MISSING test has a write-first creating task inside its plan; no separate Wave 0 plan)
- [x] No watch-mode flags (all commands are single-shot `node …`)
- [x] Feedback latency < ~5s single file / full suite per wave
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-08 — populated from 41-RESEARCH.md §Validation Architecture; per-task map reconciled against the real tasks in plans 41-01..41-07. `wave_0_complete: false` because the write-first RED scaffolds are created during execution (each plan's first task), not pre-built.
