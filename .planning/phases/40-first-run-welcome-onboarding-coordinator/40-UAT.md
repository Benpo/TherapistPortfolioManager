---
status: complete
phase: 40-first-run-welcome-onboarding-coordinator
source: [40-VERIFICATION.md]
started: 2026-07-08T11:01:24Z
updated: 2026-07-08T12:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Native-speaker review of HE/DE/CS translations for the 15 new i18n keys
expected: Translations read naturally, match register (HE noun/infinitive per D-05, DE Sie, CS formal), and match the calm garden voice (welcome overlay ×4, help.entry.replayWelcome, install nudge ×7, mobile hint ×3). Automation only proved presence/parity/no-emoji, not fluency.
result: issue
reported: "(1) Welcome overlay copy is too flat — only privacy/security framing; wants at least 2 paragraphs with positive 'marketing' copy about smoothness of working in the app and added value beyond 'it's private'. (2) 'Replay welcome' menu label sounds bizarre — expects something like 'Onboarding Screen'."
severity: minor

### 2. Real-browser visual + dark-mode check of welcome overlay, install-nudge card, mobile-hint bar
expected: Layout matches the UI-SPEC (960px Variant-B split panel collapsing at 720px, art-side border flip under RTL, 44px targets, focus outlines) and renders correctly in light/dark and in real WebKit/Safari, not just jsdom (project memory — Chromium-only gates have missed Safari-only bugs).
result: issue
reported: "Real-browser visuals otherwise good. (1) In the '?' help menu, the 'Replay welcome' row appears preselected/highlighted when the menu opens — looks bad in dark mode and also visible in bright mode. (2) A green 'Help' text pill appeared in the main nav (Phase 39) — should be removed, keep the '?' icon only. Mobile hint bar: can't test (no device). Install-nudge card: never appeared (see Test 3)."
severity: minor

### 3. Real Chromium install flow via beforeinstallprompt
expected: On a real Chromium browser, the captured beforeinstallprompt fires prompt() once when [Install app] is clicked, the native install dialog appears, the app installs, and the card does not linger awkwardly afterward.
result: issue
reported: "Tried a new browser (Chrome) with fresh app — still no nudge or card ever appears, so the install flow can't be exercised at all."
severity: major

### 4. Offline navigation on an installed PWA runs the coordinator
expected: With the installed PWA in airplane mode, all 8 app pages load assets/attention-coordinator.js from the service-worker cache and AttentionCoordinator.run() executes without error (mirror of the Phase 39 offline verification, incl. WebKit stale-SW behavior).
result: pass

### 5. Decision on WR-01 (iPadOS Safari misclassification) and WR-02 (welcome overlay focus trap)
expected: A recorded decision — fix in a follow-up plan, or explicitly accept via a verification override with reasoning. WR-01 — isMacSafari() matches iPadOS Safari (Macintosh UA since iPadOS 13), so a landscape iPad gets the wrong "File → Add to Dock" copy and burns the one-ask; suggested fix requires navigator.maxTouchPoints <= 1. WR-02 — welcome overlay declares aria-modal="true" but never moves focus into the dialog or traps it (WCAG 2.4.3), diverging from the app's own confirmDialog() pattern.
result: pass
reason: "Decision recorded: both fixed inline before UAT — WR-01 in commit b46c1d2 (iPadOS excluded from isMacSafari via maxTouchPoints), WR-02 in commit b644428 (welcome overlay focuses on mount, traps Tab, restores opener on dismiss)."

## Summary

total: 5
passed: 2
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Welcome overlay copy matches the calm garden voice and communicates the product's value"
  status: failed
  reason: "User reported: subtitle is too flat — focuses only on privacy/data security; wants at least 2 paragraphs including positive copy about the smoothness of working in the app and its added value beyond 'it's private' (all 4 locales)"
  severity: minor
  test: 1
  artifacts: []
  missing: []
- truth: "Header/nav shows only the '?' icon as the help entry point"
  status: failed
  reason: "User reported: a green 'Help' text pill appeared in the main nav (added in Phase 39 commit 44d40d2 alongside the '?' entry) — remove it, keep the question-mark icon only"
  severity: minor
  test: 2
  artifacts: []
  missing: []
- truth: "'?' help menu opens with no row visually preselected"
  status: failed
  reason: "User reported: 'Replay welcome' row appears highlighted/preselected when the menu opens — looks bad in dark mode and also visible in bright mode (likely retained focus on the <button> row vs. the <a> rows)"
  severity: cosmetic
  test: 2
  artifacts: []
  missing: []
- truth: "Install nudge card appears on an eligible desktop Chromium browser so the install flow can run"
  status: failed
  reason: "User reported: fresh Chrome profile, app not installed — nudge/card never appears, install flow cannot be exercised. Suspect Pitfall 1 race: run() executes at page load before the late-firing beforeinstallprompt is captured, so installEligible() is false every session and the surface never wins the slot"
  severity: major
  test: 3
  artifacts: []
  missing: []
- truth: "Help menu 'Replay welcome' label reads naturally"
  status: failed
  reason: "User reported: 'Replay welcome' sounds bizarre; expects something like 'Onboarding Screen' (all 4 locales)"
  severity: minor
  test: 1
  artifacts: []
  missing: []
