---
phase: 35
slug: demo-system-refresh-version-parity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-30
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 35-RESEARCH.md `## Validation Architecture`. The demo ships static (no CI
> runner for the live demo), so validation = automated Node+jsdom structural/data
> assertions + a small set of manual browser observations. Assertions MUST check real
> DOM/data, never process exit code (see [[reference-pdf-jsdom-inert-gates]] — Pitfall 4).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node script runner + jsdom `^29.1.1` (already present) |
| **Config file** | none — `tests/run-all.js` iterates `tests/*.test.js` |
| **Quick run command** | `node tests/run-all.js` |
| **Full suite command** | `node tests/run-all.js` |
| **Estimated runtime** | ~few seconds (suite is fast) |

---

## Sampling Rate

- **After every task commit:** Run `node tests/run-all.js`
- **After every plan wave:** Run `node tests/run-all.js` (full; suite is fast)
- **Before `/gsd-verify-work`:** Full suite green + the manual DEMO-10 browser observations
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated Command / Check | Threat Ref | File Exists |
|-----|----------|-----------|---------------------------|------------|-------------|
| DEMO-01/04 | After convergence, demo home injected chrome matches index.html structure; a `.app-footer` with `v{version}` renders | jsdom render | `tests/35-demo-chrome.test.js`: boot demo home in jsdom with `window.name='demo-mode'`, run initCommon; assert `#headerActions` populated, exactly one lang picker, `.app-footer` present, footer text contains `version.js APP_VERSION` | — | ❌ W0 |
| DEMO-02 | No native `<select id="languageSelect">` remains in the demo home DOM source | static grep | `grep -c 'id="languageSelect"'` on the demo home file == 0 | — | ❌ W0 |
| DEMO-05 | Seed renders a removed-shield arc: ≥1 client row shows the removed badge; ≥1 session active and ≥1 removed | jsdom + data | `tests/35-demo-seed.test.js`: load seed JSON; assert a client has ≥2 `isHeartShield` sessions with mixed `shieldRemoved` and final `shieldRemoved:true`; render client row, assert `.heart-badge-removed`. Author the arc against `.some()` semantics (Pitfall 2), not `.every()` | — | ❌ W0 |
| DEMO-06 | Seed produces ≥1 session dated within the current month at seed time | data/unit | assert `countSessionsThisMonth(seededSessions) >= 1` after the relative-date transform with a mocked `now` (test 1st & last day of month — timezone month-edge, Pitfall 5) | — | ❌ W0 |
| DEMO-07 | Every seed session conforms to current schema (no legacy fields; `sessionType ∈ {clinic,online,other}`; `issues[]` shape) | data/unit | assert field whitelist + enum over all sessions | T-XSS | ❌ W0 |
| DEMO-08 | Demo home subtitle literal no longer says "therapeutic"; `data-i18n="app.subtitle"` present and resolves to "energy" copy in all 4 dicts | static grep | assert no "therapeutic" literal on demo home; `app.subtitle` resolves in he/en/de/cs | — | ❌ W0 |
| DEMO-09 | `demo-hints.js` referenced by zero live files (file + `app.js` injection block + `sw.js` precache entry all removed) | static grep | `grep -rn "demo-hints" assets/ sw.js *.html` (exclude sketches/worktrees) returns nothing; assert file absent | — | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/35-demo-chrome.test.js` — DEMO-01/02/04 (jsdom chrome render + no-native-select)
- [ ] `tests/35-demo-seed.test.js` — DEMO-05/06/07 (heart-shield arc, this-month, schema conformance)
- [ ] grep-based assertions for DEMO-08/09 (may live in the seed/chrome test files or a small `tests/35-demo-static.test.js`)
- [ ] No framework install needed (jsdom present).
- [ ] **Heed Pitfall 4:** assertions must check DOM/data, not process exit ([[reference-pdf-jsdom-inert-gates]]).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Landing demo entry point intact; gates bypass; language sync; edit-reset on home | DEMO-10 | Requires a real browser + iframe embedding; no headless equivalent for the full visitor flow | Open `landing.html`, scroll to `#demo`: demo loads in iframe, no redirect to landing/license; switch language in parent → demo re-translates; navigate demo→sessions→back; return to home resets in-demo edits |
| `window.name==='demo-mode'` set from iframe `name` attr before gate scripts run (D-02 only — assumption A1) | DEMO-10 | Browser-context-name timing under `sandbox` is not headless-verifiable; gated behind a human checkpoint | DevTools inside the iframe: `window.name === 'demo-mode'`; no flash/redirect on load |

---

## Security (from RESEARCH `## Security Domain`, ASVS L1)

| Threat Ref | Pattern | STRIDE | Mitigation (verify in plans) |
|------------|---------|--------|------------------------------|
| T-XSS | Stored XSS via seed strings | Tampering | Render seed via `textContent` (already the case in `overview.js`); never introduce `innerHTML` for seed fields |
| T-DBLEAK | Demo writes leaking into real DB | Tampering | `window.name` DB-name isolation (`demo_portfolio` vs `sessions_garden`) — the D-02 collapse MUST preserve it |
| T-IFRAME | Iframe escaping host | Elevation | Keep existing `sandbox="allow-scripts allow-same-origin allow-popups allow-forms"`; adding `name="demo-mode"` does not weaken it |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
