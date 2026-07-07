---
phase: 39
slug: help-center-entry-point
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-07
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Transcribed from the six 39-0X-PLAN.md files after plan-checker verification (2026-07-07).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Zero-dep Node runner — `tests/run-all.js` (auto-discovers `tests/*.test.js`; fs/vm/jsdom; exit-0/1 per file) |
| **Config file** | none — convention-based discovery; `package.json` `"test": "node tests/run-all.js"` |
| **Quick run command** | the task's own `<automated>` command (see Per-Task Verification Map) |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~60 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` command from the map below
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 39-01-01 | 01 | 1 | HELP-04, HELP-06 | — | N/A | unit (inline vm) | `node -e` session-loop sections assertion (plan 01 task 1) | ✅ inline | ⬜ pending |
| 39-01-02 | 01 | 1 | HELP-04, HELP-05, HELP-06 | — | N/A | unit (inline vm) | `node -e` technical sections + HELP_DEEPLINKS assertion (plan 01 task 2) | ✅ inline | ⬜ pending |
| 39-01-03 | 01 | 1 | HELP-03, HELP-04, HELP-06 | — | N/A | integration (fs/vm) | `node tests/39-help-integrity.test.js` | created in-task | ⬜ pending |
| 39-02-01 | 02 | 1 | HELP-01, HELP-02, HELP-05 | — | N/A | unit (inline vm) | `node -e` EN chrome-key presence assertion (plan 02 task 1) | ✅ inline | ⬜ pending |
| 39-02-02 | 02 | 1 | HELP-01, HELP-02, HELP-05 | — | N/A | unit (inline vm) | `node -e` 4-locale parity assertion (plan 02 task 2) | ✅ inline | ⬜ pending |
| 39-03-01 | 03 | 2 | HELP-01, HELP-02 | — | N/A | source assertion (tdd) | `node -e` app.js `initHelpEntry` wiring assertion (plan 03 task 1) | ✅ inline | ⬜ pending |
| 39-03-02 | 03 | 2 | HELP-01, HELP-02 | — | N/A | integration (jsdom) | `node tests/39-help-entry.test.js` | created in-task | ⬜ pending |
| 39-04-01 | 04 | 2 | HELP-02 | — | N/A | source assertion | `node -e` help.html shell + help.css token/logical-property assertion (plan 04 task 1) | ✅ inline | ⬜ pending |
| 39-04-02 | 04 | 2 | HELP-02, HELP-03, HELP-06 | — | N/A | integration (jsdom, tdd) | `node tests/39-help-render.test.js` | created in-task | ⬜ pending |
| 39-04-03 | 04 | 2 | HELP-02, HELP-06 | — | N/A | integration (jsdom) | `node tests/39-help-render.test.js` | ✅ from 39-04-02 | ⬜ pending |
| 39-05-01 | 05 | 2 | HELP-05 | — | N/A | source assertion (tdd) | `node -e` overview+sessions deep-link wiring assertion (plan 05 task 1) | ✅ inline | ⬜ pending |
| 39-05-02 | 05 | 2 | HELP-05 | — | N/A | source assertion (tdd) | `node -e` reporting wiring assertion (plan 05 task 2) | ✅ inline | ⬜ pending |
| 39-05-03 | 05 | 2 | HELP-05 | — | N/A | integration (jsdom) | `node tests/39-empty-state-coaching.test.js` | created in-task | ⬜ pending |
| 39-06-01 | 06 | 3 | HELP-07 | T-39-11 | Help assets present in precache → app help available offline (DoS mitigation) | static assertion | `node tests/39-help-precache.test.js && node tests/sw-precache-cache-reload.test.js` | created in-task | ⬜ pending |
| 39-06-02 | 06 | 3 | HELP-07 | T-39-11 | Real offline navigation works end-to-end | checkpoint:human-verify (blocking) | — (manual, see Manual-Only) | — | ⬜ pending |
| 39-06-03 | 06 | 3 | HELP-04 | — | N/A | checkpoint:human-verify (blocking) | — (manual, see Manual-Only) | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The `tests/run-all.js` harness and jsdom are already in-repo; each new phase test file (`tests/39-help-integrity.test.js`, `tests/39-help-entry.test.js`, `tests/39-help-render.test.js`, `tests/39-empty-state-coaching.test.js`, `tests/39-help-precache.test.js`) is created inside the task that needs it — no separate Wave 0 setup.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Help opens fully offline on a real installed PWA (Safari included) | HELP-07 | The zero-dep jsdom/vm harness cannot exercise a real service worker + offline navigation; WebKit-only stale-SW failures are invisible to Chromium (Pitfall 2) | Install/refresh the PWA, turn network off, relaunch, open "?" → Help center, follow a deep link (39-06 task 2 checkpoint steps) |
| Rendered help content passes D-19 review (Gate A factual, Gate B native-speaker, Gate C App-DNA at Sonnet tier, Sapir sign-off) + real-WebKit RTL/dark/soft-type visual check | HELP-04 | Language quality, brand voice, and WebKit rendering (Rubik soft type, RTL mirroring, dark mode) require human/agent review of the rendered page, not source assertions | Run the D-19 pipeline against rendered help.html, then verify in real Safari: RTL mirroring, dark theme, Rubik (not system fallback) (39-06 task 3 checkpoint steps) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (13 automated tasks; 2 justified blocking human-verify checkpoints in plan 06)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none missing — harness in-repo, test files created in-task)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-07 (transcribed from 39-0X-PLAN.md after gsd-plan-checker VERIFICATION PASSED)
