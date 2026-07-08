---
status: testing
phase: 40-first-run-welcome-onboarding-coordinator
source: [40-VERIFICATION.md]
started: 2026-07-08T11:01:24Z
updated: 2026-07-08T11:01:24Z
---

## Current Test

number: 1
name: Native-speaker review of HE/DE/CS translations for the 15 new i18n keys
expected: |
  Translations read naturally, match register (HE noun/infinitive per D-05, DE Sie,
  CS formal), and match the calm garden voice — for the welcome overlay, Replay
  welcome label, install nudge, and mobile hint strings.
awaiting: user response

## Tests

### 1. Native-speaker review of HE/DE/CS translations for the 15 new i18n keys
expected: Translations read naturally, match register (HE noun/infinitive per D-05, DE Sie, CS formal), and match the calm garden voice (welcome overlay ×4, help.entry.replayWelcome, install nudge ×7, mobile hint ×3). Automation only proved presence/parity/no-emoji, not fluency.
result: [pending]

### 2. Real-browser visual + dark-mode check of welcome overlay, install-nudge card, mobile-hint bar
expected: Layout matches the UI-SPEC (960px Variant-B split panel collapsing at 720px, art-side border flip under RTL, 44px targets, focus outlines) and renders correctly in light/dark and in real WebKit/Safari, not just jsdom (project memory — Chromium-only gates have missed Safari-only bugs).
result: [pending]

### 3. Real Chromium install flow via beforeinstallprompt
expected: On a real Chromium browser, the captured beforeinstallprompt fires prompt() once when [Install app] is clicked, the native install dialog appears, the app installs, and the card does not linger awkwardly afterward.
result: [pending]

### 4. Offline navigation on an installed PWA runs the coordinator
expected: With the installed PWA in airplane mode, all 8 app pages load assets/attention-coordinator.js from the service-worker cache and AttentionCoordinator.run() executes without error (mirror of the Phase 39 offline verification, incl. WebKit stale-SW behavior).
result: [pending]

### 5. Decision on WR-01 (iPadOS Safari misclassification) and WR-02 (welcome overlay focus trap)
expected: A recorded decision — fix in a follow-up plan, or explicitly accept via a verification override with reasoning. WR-01 — isMacSafari() matches iPadOS Safari (Macintosh UA since iPadOS 13), so a landscape iPad gets the wrong "File → Add to Dock" copy and burns the one-ask; suggested fix requires navigator.maxTouchPoints <= 1. WR-02 — welcome overlay declares aria-modal="true" but never moves focus into the dialog or traps it (WCAG 2.4.3), diverging from the app's own confirmDialog() pattern.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
