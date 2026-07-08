---
phase: 40-first-run-welcome-onboarding-coordinator
plan: 02
subsystem: onboarding
tags: [onboarding, attention-coordinator, welcome-overlay, precedence-registry, vanilla-js, jsdom, tdd]

# Dependency graph
requires:
  - phase: 40-first-run-welcome-onboarding-coordinator (Plan 01)
    provides: "help.welcome.* i18n key block (title/subtitle/ctaTour/ctaExplore) in all four locales"
  - phase: 39-help-center-entry-point
    provides: "eval-into-jsdom behavior-test harness idiom (tests/39-help-entry.test.js)"
  - phase: 26-in-app-onboarding-overview-help-system
    provides: "Variant-B welcome overlay composition + copy contract (inherited into the UI-SPEC)"
provides:
  - "window.AttentionCoordinator = { register, run, showWelcome, PRECEDENCE } — the data-driven precedence registry that shows AT MOST ONE governed surface per browser session"
  - "First-run welcome overlay (Variant-B split, role=dialog aria-modal) + showWelcome(isReplay) replay path"
  - "New storage keys: sessionStorage sg.surfaceShownThisSession, localStorage sg.whatsNewLastSeenVersion (Phase 42 reads it), first write of sg.welcomeSeen"
  - "beforeinstallprompt capture (deferredPrompt stash + _getDeferredPrompt/_clearDeferredPrompt accessors) for Plan 03's install nudge"
  - "Welcome overlay CSS (.welcome-overlay/.welcome-panel/.welcome-art/.welcome-copy/.welcome-actions/.welcome-cta*) — token-only, logical-property, dark-aware"
  - "tests/40-coordinator.test.js + tests/40-welcome-overlay.test.js (12 behavior checks)"
affects:
  - "40-03 (install-nudge / mobile-hint surfaces register into PRECEDENCE + consume _getDeferredPrompt)"
  - "40-04 (initCommon calls AttentionCoordinator.run() once per load; 'Replay welcome' row calls showWelcome(true))"
  - "40-05 (loads + precaches assets/attention-coordinator.js)"
  - "41 (rewires the interim primary-CTA ./help.html target to the guided tour)"
  - "42 (What's-New reads sg.whatsNewLastSeenVersion + registers the 'whats-new' precedence id)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Data-driven precedence registry: one arbitration point (run()) walks a fixed PRECEDENCE array, shows the first eligible registered surface, claims a one-per-session marker only on a real show"
    - "Coordinator self-resolves i18n from the raw window.I18N dict (mounts overlays after App.applyTranslations has run) while still carrying data-i18n for later language switches"
    - "Scoped scale-token redeclaration (.welcome-overlay) mirroring help.css/.help-root — spacing/type/radius/tap tokens live on the overlay root, never leaking into shared chrome"

key-files:
  created:
    - "assets/attention-coordinator.js"
    - "tests/40-coordinator.test.js"
    - "tests/40-welcome-overlay.test.js"
  modified:
    - "assets/app.css"

key-decisions:
  - "Primary CTA is an <a href='./help.html'> (not a <button>) — the href is the directly-assertable interim tour target (D-11) and gives native keyboard/AT navigation; dismiss writes the keys on click, then the browser navigates via the href"
  - "Coordinator resolves copy from window.I18N itself (tiny t() reading portfolioLang || I18N_DEFAULT || 'en') because overlays mount after the static applyTranslations pass; nodes still carry data-i18n so a language switch re-translates them"
  - "Art-side uses an <img class='welcome-art-img app-botanical-img'> (watering-can.png) so the shared Phase-11 invert+screen dark-mode rule applies for free — no overlay-specific dark asset"
  - "Scale tokens (space/type/radius/tap) redeclared scoped to .welcome-overlay (tokens.css ships only color/shadow/border), matching the established help.css/.help-root convention"

patterns-established:
  - "AttentionCoordinator precedence-registry arbitration (one governed surface per session): demo-off → session-marker → walk PRECEDENCE → first-eligible claims-then-shows"

requirements-completed: [ONBD-01, ONBD-02, ONBD-03]

coverage:
  - id: D-01/D-08
    description: "run() shows the first eligible surface in PRECEDENCE order; ineligible higher-precedence surfaces are skipped without consuming the session slot"
    requirement: "ONBD-03"
    verification:
      - kind: unit
        ref: "tests/40-coordinator.test.js (first-eligible-wins, precedence, unrenderable-skip)"
        status: pass
    human_judgment: false
  - id: D-02/D-09
    description: "One governed surface per browser session (session marker); demo-mode suppresses all surfaces"
    requirement: "ONBD-03"
    verification:
      - kind: unit
        ref: "tests/40-coordinator.test.js (one-per-session, demo-off)"
        status: pass
    human_judgment: false
  - id: D-10/ONBD-01
    description: "First-launch welcome mounts a role=dialog aria-modal Variant-B overlay with two CTAs + body scroll-lock"
    requirement: "ONBD-01"
    verification:
      - kind: unit
        ref: "tests/40-welcome-overlay.test.js (mount structure + lock, eligible-when-unseen)"
        status: pass
    human_judgment: false
  - id: D-03
    description: "Esc / either CTA dismiss sets sg.welcomeSeen=1 and records AppVersion.APP_VERSION into sg.whatsNewLastSeenVersion; primary CTA targets ./help.html"
    requirement: "ONBD-01"
    verification:
      - kind: unit
        ref: "tests/40-welcome-overlay.test.js (secondary dismiss, Esc dismiss, primary CTA)"
        status: pass
    human_judgment: false
  - id: ONBD-02
    description: "showWelcome(true) replays the overlay WITHOUT writing sg.welcomeSeen, sg.whatsNewLastSeenVersion, or the session marker"
    requirement: "ONBD-02"
    verification:
      - kind: unit
        ref: "tests/40-welcome-overlay.test.js (replay non-re-arm)"
        status: pass
    human_judgment: false
  - id: UI-token
    description: "Welcome CSS is token-only, logical-property-only, 44px targets, focus outlines, weights 400/700 — real-WebKit + dark visual check deferred to phase UAT"
    requirement: "ONBD-01"
    verification:
      - kind: unit
        ref: "grep gates (no hex, no physical props, weights 400/700, 44px + focus outline); node tests/run-all.js 139/139"
        status: pass
    human_judgment: true
    rationale: "Layout/dark-mode/Safari fidelity is a visual judgment; jsdom tests do not assert layout. Chromium-only gates miss Safari-only bugs (MEMORY reference-webkit-chromium-svg-visual-verification) — deferred to phase UAT."

# Metrics
duration: 6min
completed: 2026-07-08
status: complete
---

# Phase 40 Plan 02: Attention Coordinator + Welcome Overlay Summary

**Built `window.AttentionCoordinator` — a data-driven precedence registry that shows exactly one governed surface per browser session — and the first-run Variant-B welcome overlay it governs (Esc/CTA dismiss, D-03 last-seen-version write, replay-without-re-arm), plus token-only welcome CSS. All 12 behavior checks green.**

## Performance
- **Duration:** 6 min
- **Completed:** 2026-07-08
- **Tasks:** 3
- **Files:** 4 (3 created, 1 modified)

## Accomplishments
- **Coordinator core (ONBD-03):** `run()` arbitrates one surface per session — demo-off gate (window.name==='demo-mode', D-09) → one-per-session marker (`sg.surfaceShownThisSession`, D-02) → walk `PRECEDENCE = ['welcome','whats-new','security-note','install-nudge','mobile-hint']` (D-01) → first surface whose `eligible()` is true claims the slot then `show()`s (D-08 skip-unrenderable; the marker is set only on a real show).
- **Welcome overlay (ONBD-01):** `showWelcome(false)` mounts the Variant-B split (`role=dialog aria-modal=true`, botanical art-side + copy-side, two CTAs), calls `App.lockBodyScroll`, and wires Esc + both CTAs to dismiss. Dismiss unlocks scroll, removes the node, and (non-replay) sets `sg.welcomeSeen='1'` + records `AppVersion.APP_VERSION` into `sg.whatsNewLastSeenVersion` (D-03). Primary CTA is an anchor to `./help.html` (interim tour, D-11).
- **Replay (ONBD-02):** `showWelcome(true)` mounts the same overlay but dismissal writes none of the three keys (Pitfall 5) — and since `showWelcome` never touches the session marker, replay can never re-arm the one-per-session gate.
- **Install-prompt groundwork:** eval-time `beforeinstallprompt` capture (preventDefault + stash) and `appinstalled` clear, exposed via `_getDeferredPrompt`/`_clearDeferredPrompt` for Plan 03.
- **CSS:** token-only, logical-property-only full-screen overlay with garden radial glow; 2-col panel (max 960px) collapsing to a single column ≤720px with the art-side on top via `border-block-end` (RTL-safe); primary CTA the sole accent, secondary neutral (D-10); 44px targets + 2px focus-visible outline; weights 400/700 only.
- Full suite 139/139 green (137 baseline + 2 new test files).

## Task Commits
1. **Task 1: RED behavior tests** — `0cef5a9` (test)
2. **Task 2: attention-coordinator.js** — `ae99ec5` (feat)
3. **Task 3: welcome overlay CSS** — `c9d5aab` (feat)

## Files Created/Modified
- `assets/attention-coordinator.js` — new IIFE global: registry + `run()` arbitration + welcome surface + `showWelcome(replay)` + beforeinstallprompt capture.
- `assets/app.css` — appended welcome-overlay CSS block (scoped scale tokens + Variant-B split + CTAs + phone stack).
- `tests/40-coordinator.test.js` — 5 checks (first-eligible-wins, precedence, one-per-session, demo-off, unrenderable-skip).
- `tests/40-welcome-overlay.test.js` — 7 checks (mount/dialog + lock, eligible-when-unseen, secondary dismiss, Esc, primary CTA ./help.html, eligible-false-after-seen, replay non-re-arm).

## Decisions Made
- **Primary CTA is an `<a href="./help.html">`, not a `<button>`.** The href is the directly-assertable interim tour target (D-11), gives native keyboard/AT navigation, and dismiss writes the keys on click before the browser follows the href.
- **Coordinator self-resolves i18n from `window.I18N`.** Overlays mount after `App.applyTranslations` has already walked the static DOM, so a tiny `t()` (portfolioLang || I18N_DEFAULT || 'en') resolves copy into `textContent`; nodes still carry `data-i18n` for a later language switch.
- **Art-side reuses `.app-botanical-img`** so the shared Phase-11 invert+screen dark-mode rule applies with no overlay-specific dark asset.
- **Scale tokens scoped to `.welcome-overlay`** (tokens.css ships only color/shadow/border) — identical to the help.css / `.help-root` convention.

## Deviations from Plan
None — plan executed exactly as written. (During Task 2 the module's header/inline comments initially contained the literal strings `INTEGRITY_TOKEN` and `backup-reminder`, which tripped the D-04/D-03 grep-zero acceptance gates; reworded the prose to "deploy/build integrity hash" and "backup reminder" so the gates read 0. No code-behavior change.)

## Threat Surface
No new trust boundaries beyond the plan's `<threat_model>`. T-40-02-XSS mitigated (all copy via `textContent`/`data-i18n`, no variable-interpolated markup — `grep -c innerHTML` == 0). T-40-02-VER mitigated (`grep -c INTEGRITY_TOKEN` == 0; version write reads public `APP_VERSION` only).

## Known Stubs
- Primary CTA `./help.html` is the **interim** guided-tour target (D-11) — Phase 41 rewires it to the real guided tour. Documented and intentional; the welcome dismiss/record behavior is fully wired.
- `_getDeferredPrompt`/`_clearDeferredPrompt` + `deferredPrompt` capture are groundwork with no consumer yet — Plan 03 registers the install-nudge surface that reads them.
- `'whats-new'` is in PRECEDENCE with no registered surface (skipped by `run()`) until Phase 42.

## Next Plan Readiness
- Plan 03 can `register()` `install-nudge` / `mobile-hint` surfaces and consume `_getDeferredPrompt()`.
- Plan 04 wires `initCommon → AttentionCoordinator.run()` and the "Replay welcome" row → `showWelcome(true)`.
- Plan 05 loads + precaches `assets/attention-coordinator.js` (NOT yet referenced by any page or the SW precache list — expected).

---
*Phase: 40-first-run-welcome-onboarding-coordinator*
*Completed: 2026-07-08*

## Self-Check: PASSED
- FOUND: assets/attention-coordinator.js, tests/40-coordinator.test.js, tests/40-welcome-overlay.test.js
- FOUND: commits 0cef5a9 (test), ae99ec5 (feat), c9d5aab (feat)
- Tests: 40-coordinator 5/5, 40-welcome-overlay 7/7, full suite 139/139 green
