---
phase: 40
slug: first-run-welcome-onboarding-coordinator
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-08
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Filled from 40-RESEARCH.md `## Validation Architecture` + the five approved PLAN.md files.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Zero-dependency node runner + jsdom (`eval-into-jsdom`) — `tests/run-all.js` |
| **Config file** | none — discovery is `readdirSync(tests/)` for `*.test.js` |
| **Quick run command** | `node tests/40-coordinator.test.js` (single file, exits 0/1) |
| **Full suite command** | `node tests/run-all.js` |
| **Estimated runtime** | ~10 seconds (current baseline 131 tests; jsdom, no browser) |

---

## Sampling Rate

- **After every task commit:** Run the touched surface's file, e.g. `node tests/40-coordinator.test.js`
- **After every plan wave:** Run `node tests/run-all.js`
- **Before `/gsd-verify-work`:** Full suite must be green (baseline 131/131 per STATE.md — new tests must land green and raise the count)
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 01 | 1 | ONBD-01/02/04 | — | N/A | static (RED gate) | `node tests/40-i18n-parity.test.js; test $? -eq 1` | ❌ W0 | ⬜ pending |
| 40-01-02 | 01 | 1 | ONBD-01/02/04 | — | trusted-i18n only, no user input | static | `node tests/40-i18n-parity.test.js && node tests/run-all.js` | ❌ W0 | ⬜ pending |
| 40-02-01 | 02 | 2 | ONBD-01/02/03 | — | N/A | unit RED (jsdom) | `node tests/40-coordinator.test.js; a=$?; node tests/40-welcome-overlay.test.js; b=$?; test $a -ne 0 -a $b -ne 0` | ❌ W0 | ⬜ pending |
| 40-02-02 | 02 | 2 | ONBD-01/02/03 | V5 | textContent-only rendering in new surfaces | unit (jsdom) | `node tests/40-coordinator.test.js && node tests/40-welcome-overlay.test.js` | ❌ W0 | ⬜ pending |
| 40-02-03 | 02 | 2 | ONBD-01 | — | N/A | unit + suite | `node tests/40-welcome-overlay.test.js && node tests/run-all.js` | ❌ W0 | ⬜ pending |
| 40-03-01 | 03 | 3 | ONBD-04 | — | N/A | unit RED (jsdom) | `node tests/40-install-nudge.test.js; test $? -ne 0` | ❌ W0 | ⬜ pending |
| 40-03-02 | 03 | 3 | ONBD-04 | V5 | textContent-only; prompt() once; no UA secrets stored | unit (jsdom) | `node tests/40-install-nudge.test.js && node tests/40-coordinator.test.js` | ❌ W0 | ⬜ pending |
| 40-03-03 | 03 | 3 | ONBD-04 | — | N/A | unit + suite | `node tests/40-install-nudge.test.js && node tests/run-all.js` | ❌ W0 | ⬜ pending |
| 40-04-01 | 04 | 3 | ONBD-02/03 | — | N/A | unit RED (jsdom) | `node tests/40-app-wiring.test.js; test $? -ne 0` | ❌ W0 | ⬜ pending |
| 40-04-02 | 04 | 3 | ONBD-03 | — | existing security-note behavior preserved | unit (jsdom) | `node tests/40-app-wiring.test.js && node tests/run-all.js` | ❌ W0 | ⬜ pending |
| 40-04-03 | 04 | 3 | ONBD-02 | — | replay does not re-arm one-shot flags | unit (jsdom) | `node tests/40-app-wiring.test.js && node tests/39-help-entry.test.js && node tests/run-all.js` | ✅ (39) / ❌ W0 (40) | ⬜ pending |
| 40-05-01 | 05 | 3 | ONBD-03/04 | — | N/A | static RED | `node tests/40-ios-banner-removed.test.js; a=$?; node tests/40-precache.test.js; b=$?; test $a -ne 0 -a $b -ne 0` | ❌ W0 | ⬜ pending |
| 40-05-02 | 05 | 3 | ONBD-04 | — | N/A | static grep | `node tests/40-ios-banner-removed.test.js && node tests/run-all.js` | ❌ W0 | ⬜ pending |
| 40-05-03 | 05 | 3 | ONBD-03 | — | N/A | static | `node tests/40-precache.test.js && node tests/run-all.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Behavior tests are authored RED before implementation inside each plan (Task 1 of every plan — project rule, MEMORY `feedback-behavior-verification`):

- [ ] `tests/40-i18n-parity.test.js` — 15 new keys present/non-empty/parity/no-emoji across en/he/de/cs (ONBD-01/02/04)
- [ ] `tests/40-coordinator.test.js` — precedence, one-per-session, demo-off, unrenderable-skip (ONBD-03)
- [ ] `tests/40-welcome-overlay.test.js` — one-shot, dismiss paths, last-seen-version write, replay-doesn't-re-arm (ONBD-01/02)
- [ ] `tests/40-install-nudge.test.js` — platform branch + standalone gate + dismissed-forever + mobile hint (ONBD-04); mocks `matchMedia`, `navigator.userAgentData`, synthetic `beforeinstallprompt`
- [ ] `tests/40-app-wiring.test.js` — initCommon→run() wiring, security-note registration, D-08 container-absent skip, Replay row (ONBD-02/03)
- [ ] `tests/40-ios-banner-removed.test.js` — static assertion `index.html` no longer ships `ios-install-banner` (D-15)
- [ ] `tests/40-precache.test.js` — coordinator file listed in `sw.js` PRECACHE_URLS (mirrors `39-help-precache.test.js`)
- Framework install: none needed (node + jsdom already present).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Install button appears and `prompt()` fires once | ONBD-04 | `beforeinstallprompt` never fires in jsdom; Chromium-only runtime event | Open app in Chrome (not installed, not standalone), trigger nudge, click [Install app], accept; verify nudge never returns |
| Welcome overlay visual (Variant B split, dark mode, HE RTL) | ONBD-01 | jsdom asserts DOM, not layout; WebKit-only rendering bugs (MEMORY `reference-webkit-chromium-svg-visual-verification`) | Open in real Safari + Chrome, light/dark, EN + HE; check split panel, hero art, focus ring |
| Offline navigation on an installed PWA after precache change | ONBD-03 | Service-worker precache behavior not exercisable in jsdom | Install PWA, go offline, navigate all 8 pages; verify coordinator asset loads |
| HE/DE/CS copy quality | ONBD-01/04 | Native-speaker judgment | Milestone native-speaker agent review before ship |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-08 (filled from RESEARCH Validation Architecture after plan-checker PASS; plan-checker confirmed RED-then-GREEN ordering and sampling continuity)
