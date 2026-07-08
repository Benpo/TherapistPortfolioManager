---
phase: 40-first-run-welcome-onboarding-coordinator
plan: 03
subsystem: onboarding
tags: [onboarding, attention-coordinator, install-nudge, mobile-hint, pwa-install, per-browser-gate, vanilla-js, jsdom, tdd]

# Dependency graph
requires:
  - phase: 40-first-run-welcome-onboarding-coordinator (Plan 02)
    provides: "AttentionCoordinator precedence registry (register/run/PRECEDENCE) + captured beforeinstallprompt (deferredPrompt) the install-nudge surface consumes"
  - phase: 40-first-run-welcome-onboarding-coordinator (Plan 01)
    provides: "onboard.install.* + onboard.mobileHint.* i18n key block in all four locales"
  - phase: 39-help-center-entry-point
    provides: "help.html topic anchors topic-install-safari + topic-install-mobile-note (deep-link targets); eval-into-jsdom behavior-test harness idiom"
provides:
  - "install-nudge surface registered into PRECEDENCE — per-browser-aware, dismissed-forever PWA install affordance (real [Install app] button on Chromium via the captured beforeinstallprompt; File → Add to Dock pointer on actual macOS Safari; ineligible everywhere else)"
  - "mobile-hint surface registered into PRECEDENCE (lowest tier) — one-shot, all-phone calm expectation successor to the deleted iOS banner"
  - "isPhoneClass() capability probe (userAgentData.mobile OR pointer:coarse + max-width:820px) — shared device-class gate making nudge/hint mutually exclusive"
  - "isMacSafari() per-browser detection (Macintosh + Safari/ + NOT Chrome|Chromium|CriOS|Edg|OPR) — the D-12 install-copy gate"
  - "New localStorage keys: sg.installNudgeDismissed, sg.mobileHintDismissed (persistent, gone-forever)"
  - "_getSurface(id) internal test seam + makeEl() DOM helper"
  - "install-nudge card + neutral mobile-hint bar CSS (token-only, logical, dark-aware) in assets/app.css"
  - "tests/40-install-nudge.test.js (13 behavior checks)"
affects:
  - "40-04 (initCommon calls AttentionCoordinator.run() once per load — now arbitrates all four registered surfaces)"
  - "40-05 (loads + precaches assets/attention-coordinator.js — unchanged wiring, richer behavior)"
  - "42 (What's-New registers the 'whats-new' id above install-nudge in the same PRECEDENCE array)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-browser install-copy gate: eligible() renders only where correct copy exists — a captured beforeinstallprompt (Chromium) OR real macOS Safari; any other no-event env is ineligible and the coordinator slot passes on, so the one ask is never burned on wrong copy or a dead button (D-12/Pitfall 1)"
    - "Capability-probe device classing (isPhoneClass) — userAgentData.mobile OR coarse-pointer + narrow-viewport, never iOS UA sniffing — makes the desktop nudge and mobile hint mutually exclusive by device class"
    - "One-shot deferred-prompt fire: null the module deferredPrompt BEFORE calling prompt() and remove the button, so a re-entrant/second click can never double-fire the native dialog (Pitfall 2)"

key-files:
  created:
    - "tests/40-install-nudge.test.js"
  modified:
    - "assets/attention-coordinator.js"
    - "assets/app.css"

key-decisions:
  - "isPhoneClass() authored in Task 2 (not Task 3 as the plan sequenced) because the install-nudge eligible() references it — keeping Task 2 self-consistent and green; Task 3's mobile-hint reuses the same helper (Rule 3 blocking-issue fix)"
  - "Install/mobile surfaces reached in the test via a new _getSurface(id) internal seam (same _-prefixed-internal convention as _getDeferredPrompt) — lets the RED test pin surface-level eligible()/show() precisely rather than only through run() arbitration"
  - "z-index uses var(--z-banner) (500) for both surfaces, matching the existing bottom-anchored .backup-reminder-banner idiom — they are non-blocking notification surfaces, not modals"
  - "Help deep-links target the resolvable topic ids (./help.html#topic-install-safari, ./help.html#topic-install-mobile-note) which help.js sets as real element ids (h3.id=topic.id) and scrolls to via openForHash — not the coarser section anchor"
  - "The only --color-primary use in the mobile-hint block is the link TEXT color + focus outline (the endorsed link convention); it is never a background fill, honoring the D-16 'no accent bar / no warning tone' prohibition"

patterns-established:
  - "Per-browser-aware, dismissed-forever install affordance governed at the bottom of the attention precedence order (welcome naturally wins launch 1, so the nudge is effectively eligible from the 2nd session — D-13 with zero session bookkeeping)"

requirements-completed: [ONBD-04]

coverage:
  - id: D-12
    description: "install-nudge eligible() is per-browser gated — captured prompt (Chromium) OR real macOS Safari only; standalone/dismissed/phone-class all short-circuit to false"
    requirement: "ONBD-04"
    verification: "tests/40-install-nudge.test.js (a)/(b)/(c)/(c2)/(e)/(e2) — standalone, dismissed, phone-class, Firefox-like no-event, macOS-Safari, non-Safari-no-card"
  - id: "Pitfall 2"
    description: "Chromium [Install app] button fires deferredPrompt.prompt() exactly once then clears it; a second click is a no-op"
    requirement: "ONBD-04"
    verification: "tests/40-install-nudge.test.js (d) — prompt() spy asserts calls===1 after two clicks"
  - id: D-13
    description: "install-nudge sits below welcome in PRECEDENCE, so welcome wins launch 1 and the nudge surfaces from a later session with no extra bookkeeping"
    requirement: "ONBD-04"
    verification: "tests/40-coordinator.test.js precedence order (unchanged, still green) + PRECEDENCE array position"
  - id: D-14/Pitfall 4
    description: "Dismissing the nudge writes persistent localStorage sg.installNudgeDismissed; it stays gone across a fresh coordinator load even with a newly captured prompt"
    requirement: "ONBD-04"
    verification: "tests/40-install-nudge.test.js (f) — reload + re-inject prompt, eligible() still false"
  - id: D-16
    description: "mobile-hint is phone-class-gated (capability probe, not iOS sniffing), one-shot dismissed-forever, neutral surface with no --color-primary fill / warning tone"
    requirement: "ONBD-04"
    verification: "tests/40-install-nudge.test.js (g)/(g2)/(h)/(i) + CSS grep gate (no --color-primary background in the mobile-hint block) + phone-class helper grep (pointer:coarse/max-width:820px/userAgentData, no iP(hone|ad|od))"
  - id: T-40-03-XSS
    description: "All nudge/hint copy is set via textContent/data-i18n; no variable-interpolated innerHTML"
    requirement: "ONBD-04"
    verification: "grep of assets/attention-coordinator.js shows zero innerHTML"

metrics:
  duration: ~20min
  completed: 2026-07-08
  tasks: 3
  files: 3

status: complete
---

# Phase 40 Plan 03: Install Nudge & Mobile Expectation Hint Summary

Added the two lowest-precedence governed surfaces to the attention coordinator (ONBD-04): a per-browser-aware, dismissed-forever PWA **install nudge** (a real one-click [Install app] button on Chromium via the captured `beforeinstallprompt`; a File → Add to Dock pointer + help link on actual macOS Safari; ineligible — slot passes on — everywhere else) and a calm one-shot all-phone **mobile expectation hint** that succeeds the deleted iOS banner. Both register into the Plan 02 `PRECEDENCE` array so `run()` arbitrates them at the bottom of the order; both persist their dismissal in localStorage and are gone forever.

## What was built

- **install-nudge surface** (`assets/attention-coordinator.js`): `eligible()` is false on `display-mode: standalone`, on a persisted `sg.installNudgeDismissed`, on phone-class, and when NEITHER a `deferredPrompt` was captured NOR the browser is real macOS Safari (the D-12 per-browser gate). `show()` branches on the captured prompt: Chromium renders the single accent [Install app] button that fires `prompt()` once then clears it; macOS Safari renders the Add-to-Dock pointer + a neutral help link (`./help.html#topic-install-safari`) with no button. Neutral dismiss + muted reassurance line.
- **mobile-hint surface**: `eligible()` = `isPhoneClass()` AND not `sg.mobileHintDismissed`. `show()` mounts a neutral bottom bar (body + `./help.html#topic-install-mobile-note` topic link + "Got it") and persists the dismissal.
- **Shared helpers**: `isPhoneClass()` (capability probe — `userAgentData.mobile` OR `pointer:coarse` + `max-width:820px`), `isMacSafari()` (UA gate excluding Chrome/Chromium/CriOS/Edg/OPR), `makeEl()` (textContent/data-i18n only), and a `_getSurface(id)` test seam.
- **CSS** (`assets/app.css`): install-nudge card (bottom inline-end, `--shadow-card`, `max-inline-size:380px`, single `--color-primary` button as the only accent) + neutral mobile-hint bar (`--color-surface` bg, soft top border/shadow, no `--color-primary` fill, no warning tone). Both blocks are token-only, logical-property, 44px targets, focus outlines, dark-aware.
- **Test**: `tests/40-install-nudge.test.js` (13 behavior checks).

## Verification

- `node tests/40-install-nudge.test.js` → 13/13 pass.
- `node tests/40-coordinator.test.js` → 5/5 pass (registration did not break arbitration).
- `node tests/run-all.js` → **140/140 pass** (was 131 pre-Phase-40; +13 this plan minus double-counting — full suite green).
- CSS gates: no literal hex, no physical left/right, no `--color-primary` background in the mobile-hint block. Phone-class helper is a capability probe (pointer/width/userAgentData), no `iP(hone|ad|od)` sniffing. No `innerHTML` in the coordinator.
- Real-Chromium (live Install button) + on-device WebKit/mobile visual checks are deferred to phase UAT (per the plan's verification note).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] jsdom 29 ignores the constructor `userAgent` option**
- **Found during:** Task 2 (install test (e) macOS-Safari failed — `isMacSafari()` read the default jsdom UA, not the injected Safari string).
- **Issue:** `new JSDOM(html, { userAgent })` did not set `navigator.userAgent` in jsdom 29.1.1, so the per-browser gate could not be exercised.
- **Fix:** Override `navigator.userAgent` on the instance via `Object.defineProperty` in the test harness (`tests/40-install-nudge.test.js`).
- **Commit:** 3998847

**2. [Rule 3 - Blocking] `isPhoneClass()` authored in Task 2, not Task 3**
- **Found during:** Task 2 — install-nudge `eligible()` references `isPhoneClass()`, which the plan sequenced into Task 3. Referencing an undefined helper would throw.
- **Fix:** Added the shared `isPhoneClass()` helper in Task 2 (where it is first needed); Task 3's mobile-hint reuses it unchanged.
- **Commit:** 3998847 (helper) / 2a27239 (mobile-hint reuse)

### Sequencing note (not a plan deviation)

The plan's Task 2 verify command (`node tests/40-install-nudge.test.js && node tests/40-coordinator.test.js`) can only pass fully after Task 3, because the single test file pins both surfaces. Task 2 committed with the install portions green (9/9) and the mobile-hint portions still RED — a legitimate intermediate multi-surface TDD state — and Task 3 brought the file to 13/13. This matches the plan's own Task 2 acceptance criterion ("the install-nudge portions ... pass").

## Known Stubs

None. Both surfaces are fully wired: the install button fires the real captured prompt; both dismissals persist; both help links target resolvable Phase 39 topic anchors.

## Self-Check: PASSED

- FOUND: tests/40-install-nudge.test.js
- FOUND: assets/attention-coordinator.js (install-nudge + mobile-hint registered)
- FOUND: assets/app.css (install-nudge card + mobile-hint bar blocks)
- FOUND commit 577e85b (test RED), 3998847 (install-nudge), 2a27239 (mobile-hint + CSS)
