---
phase: 42
slug: in-app-changelog-what-s-new
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-09
---

# Phase 42 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `42-RESEARCH.md` → `## Validation Architecture` (11 tests T-42-V1..V11).
> Project rule: behavior tests authored RED **before** implementation (memory `feedback-behavior-verification.md`).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in (`assert`) + `jsdom` (existing devDependency) + `vm` sandbox — the project's zero-config harness. No test-runner package. |
| **Config file** | none — `tests/run-all.js` auto-discovers top-level `tests/*.test.js` |
| **Quick run command** | `node tests/42-<name>.test.js` (single file, <1s each) |
| **Full suite command** | `npm test` (→ `node tests/run-all.js`, ~131+ files) |
| **Estimated runtime** | full suite ~seconds; per-file <1s |

---

## Sampling Rate

- **After every task commit:** Run the relevant `node tests/42-<name>.test.js`
- **After every plan wave:** Run `npm test` (full suite must stay green)
- **Before `/gsd-verify-work`:** Full suite green **plus** a real-device offline UAT (see Manual-Only) — the vm/jsdom harness cannot exercise the real service worker
- **Max feedback latency:** < 5 seconds (per-file); no 3 consecutive tasks without an automated verify

---

## Per-Task Verification Map

> Task IDs are assigned by the planner. Map each test below to the task that implements the behavior it guards. Wave 0 authors all seven test files RED before any implementation task runs.

| Test ID | Wave | Requirement / Decision | Behavior guarded | Test Type | Automated Command | File Exists |
|---------|------|------------------------|------------------|-----------|-------------------|-------------|
| T-42-V1 | 0→impl | CHLG-01 | Once-per-version gating (`eligible()` true iff `APP_VERSION !== sg.whatsNewLastSeenVersion` AND entry exists) | behavior (jsdom) | `node tests/42-whats-new-gating.test.js` | ❌ W0 |
| T-42-V2 | 0→impl | CHLG-01 | First-ever-launch suppression (fresh state → welcome, not whats-new; post-welcome-dismiss → whats-new ineligible) | behavior (jsdom) | `node tests/42-whats-new-gating.test.js` | ❌ W0 |
| T-42-V3 | 0→impl | CHLG-01 / D-07 | Silent-skip reconcile (version differs, no entry → `show()` never called AND lastSeen advanced) | behavior (jsdom) | `node tests/42-whats-new-gating.test.js` | ❌ W0 |
| T-42-V4 | 0→impl | CHLG-01 / D-09 | Deliberate-dismiss (backdrop = no-op; Close/Esc/"See everything new" each remove + record lastSeen) | behavior (jsdom) | `node tests/42-whats-new-dismiss.test.js` | ❌ W0 |
| T-42-V5 | 0→impl | CHLG-01 | Popup content + a11y (renders latest `highlights` 2–4; `role=dialog`, `aria-modal`, `aria-labelledby`, focus into dialog) | behavior (jsdom) | `node tests/42-whats-new-dismiss.test.js` | ❌ W0 |
| T-42-V6 | 0→impl | CHLG-01/02 | Offline precache SHAPE (`PRECACHE_URLS` ⊇ {changelog.js, changelog.css, changelog-content-en.js, whats-new.js}; `PRECACHE_HTML` ⊇ `/changelog`; `cache:'reload'` intact) | shape (fs scan) | `node tests/42-precache.test.js` | ❌ W0 |
| T-42-V7 | 0→impl | CHLG-02 | Page render (reverse-chron cards; empty categories omitted; v1.0 one-line; stable kebab anchors) | behavior (jsdom) | `node tests/42-changelog-render.test.js` | ❌ W0 |
| T-42-V8 | 0→impl | CHLG-02 / D-16 | EN-fallback (missing locale/entry → EN renders; history complete every locale) | behavior (jsdom) | `node tests/42-changelog-render.test.js` | ❌ W0 |
| T-42-V9 | 0→impl | CHLG-03/04 / D-08/10 | Data-source integrity (unique semver; reverse-chron; lede+highlights[2–4]+categories⊆{new,improved,fixed}; v1.0 origin-only; latest has highlights; no emoji) + v1.3 first with `version==='1.3.0'` | integrity (vm) | `node tests/42-changelog-integrity.test.js` | ❌ W0 |
| T-42-V10 | 0→impl | D-15 | Demo hiding (`window.name==='demo-mode'` → no `whatsNew.menuRow`; footer version link inert) | behavior (jsdom) | `node tests/42-demo-gate.test.js` | ❌ W0 |
| T-42-V11 | 0→impl | D-17 | i18n parity (`changelog.*` / `whatsNew.*` keys present + non-empty + no-emoji across en/he/de/cs) | parity (vm) | `node tests/42-i18n-parity.test.js` | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Author all seven RED before implementation (jsdom already a devDependency; `run-all.js` auto-discovers — no framework install):

- [ ] `tests/42-whats-new-gating.test.js` — T-42-V1/V2/V3 (jsdom; reuse `tests/40-coordinator.test.js` builder + `_getSurface('whats-new')`)
- [ ] `tests/42-whats-new-dismiss.test.js` — T-42-V4/V5 (jsdom)
- [ ] `tests/42-precache.test.js` — T-42-V6 (fs scan; mirror `tests/39-help-precache.test.js`, respect the two-array split)
- [ ] `tests/42-changelog-render.test.js` — T-42-V7/V8 (jsdom)
- [ ] `tests/42-changelog-integrity.test.js` — T-42-V9 (vm; mirror `tests/39-help-integrity.test.js`)
- [ ] `tests/42-demo-gate.test.js` — T-42-V10 (jsdom; mirror `tests/41-demo-gate.test.js`)
- [ ] `tests/42-i18n-parity.test.js` — T-42-V11 (vm; mirror `tests/40-i18n-parity.test.js`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real offline popup + `/changelog` navigation on an installed PWA | CHLG-01/02 | jsdom/vm cannot exercise the real service worker or the two-array precache at runtime (`39-help-precache.test.js:18-22`) | On an installed PWA: bump/seed `APP_VERSION`, go offline, cold-launch → What's-New popup shows offline; tap "See everything new" → `/changelog` loads offline; reload → no repeat popup |
| Entry BODY copy quality | CHLG-02/03/04 / D-03/D-04 | Copy passes the D-03 wording pipeline (factual → native-speaker → DNA/voice) and requires Ben's explicit approval (D-04) — not auto-verifiable | Copy-approval checkpoint covering the v1.1→v1.3 backfill AND the v1.3 entry before ship |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (7 test files above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter (set by planner once every task maps to a test or Wave 0 dep)

**Approval:** pending
