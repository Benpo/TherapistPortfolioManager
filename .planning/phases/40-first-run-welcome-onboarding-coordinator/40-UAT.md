---
status: diagnosed
phase: 40-first-run-welcome-onboarding-coordinator
source: [40-VERIFICATION.md]
started: 2026-07-08T11:01:24Z
updated: 2026-07-08T12:25:00Z
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
  root_cause: "Content, not a defect. help.welcome.subtitle is a single privacy-framed sentence; the overlay renders exactly one <p> (sub) after the <h1>. Warmer/longer value copy was never authored — the string simply reads flat by design."
  artifacts:
    - path: "assets/i18n-en.js:602"
      issue: "help.welcome.subtitle is one flat privacy sentence; no value/experience copy"
    - path: "assets/attention-coordinator.js:159-160"
      issue: "overlay renders a single subtitle <p> — no second paragraph slot"
  missing:
    - "Author warmer EN welcome copy: keep the calm garden voice, add a second paragraph on the smooth day-to-day experience and value beyond privacy"
    - "Ben to approve/adjust EN copy before it is treated as final (his marketing voice)"
    - "Add a second i18n key (e.g. help.welcome.subtitle2) + render a second <p> in showWelcome()"
    - "Mirror the new/updated strings across HE/DE/CS (coordinate with Phase 42.1 translation scope)"
  debug_session: inline (static diagnosis)
- truth: "Header/nav shows only the '?' icon as the help entry point"
  status: failed
  reason: "User reported: a green 'Help' text pill appeared in the main nav (added in Phase 39 commit 44d40d2 alongside the '?' entry) — remove it, keep the question-mark icon only"
  severity: minor
  test: 2
  root_cause: "renderNav() hardcodes an <a href=./help.html data-nav=help> Help nav link (app.js:148), added in Phase 39 (44d40d2) at the same time as the '?' entry button. The two are redundant; Ben wants only the '?' icon."
  artifacts:
    - path: "assets/app.js:148"
      issue: "redundant Help nav <a> link in renderNav() — duplicates the '?' help entry"
  missing:
    - "Remove the Help <a> from renderNav() (and its active-state handling if any)"
    - "Confirm nav.help i18n key can be retired or is still referenced elsewhere (help.html page title uses its own string)"
    - "Verify no test asserts the Help nav link's presence"
  debug_session: inline (static diagnosis)
- truth: "'?' help menu opens with no row visually preselected"
  status: failed
  reason: "User reported: 'Replay welcome' row appears highlighted/preselected when the menu opens — looks bad in dark mode and also visible in bright mode"
  severity: cosmetic
  test: 2
  root_cause: "The 'Replay welcome' row is a native <button> (app.js:535, it is the only action row vs the <a> link rows). .help-entry-item (app.css:216) styles padding/color/etc but never resets the button's native chrome (background, border, appearance, font, width), so the button renders with the UA's default grey box + border — read as 'preselected'. Not a focus/aria state at all."
  artifacts:
    - path: "assets/app.css:216-228"
      issue: ".help-entry-item lacks a button reset (appearance/background/border/font/width/cursor)"
    - path: "assets/app.js:535"
      issue: "action rows are <button> elements sharing the .help-entry-item class with <a> rows"
  missing:
    - "Add a button reset to .help-entry-item (appearance:none; background:transparent; border:0; width:100%; font:inherit; cursor:pointer) so button rows match anchor rows in light and dark"
    - "Verify the :hover state still reads correctly for both element types"
  debug_session: inline (static diagnosis)
- truth: "Install nudge card appears on an eligible desktop Chromium browser so the install flow can run"
  status: failed
  reason: "User reported: fresh Chrome profile, app not installed — nudge/card never appears on any session (incl. quit + reopen), install flow cannot be exercised"
  severity: major
  test: 3
  root_cause: "CONFIRMED Pitfall-1 race with no re-arm. AttentionCoordinator.run() is called once per page at DOMContentLoaded (app.js:1456 via bootAttentionSurfaces). Chrome fires beforeinstallprompt AFTER load, so at run() time deferredPrompt is still null and installEligible() (attention-coordinator.js:302 = !!deferredPrompt || isMacSafari()) returns false. The beforeinstallprompt handler (attention-coordinator.js:235-238) only stashes deferredPrompt — it NEVER re-invokes run(). Because run() always beats the event and never runs again, the install-nudge surface can never win the slot on ANY session. On session 1 welcome wins anyway; on later sessions run() finds nothing eligible and the marker is (correctly) not claimed, but nothing re-triggers arbitration when the prompt finally arrives."
  artifacts:
    - path: "assets/attention-coordinator.js:235-238"
      issue: "beforeinstallprompt handler stashes deferredPrompt but never re-triggers coordinator arbitration"
    - path: "assets/attention-coordinator.js:289-303"
      issue: "installEligible() depends on deferredPrompt which is null at run() time every session"
    - path: "assets/app.js:1456"
      issue: "run() invoked once at DOMContentLoaded, before the late-firing install event"
  missing:
    - "In the beforeinstallprompt handler, after stashing deferredPrompt, re-run arbitration if the session slot is unclaimed (e.g. call run() again) so a late prompt can still surface the nudge"
    - "Preserve one-per-session (D-02) and PRECEDENCE semantics — only surface if nothing else claimed the slot this session"
    - "Add a behavior test: prompt fires AFTER run() → nudge still appears (guards the re-arm)"
    - "Note environmental caveat: Chrome only fires beforeinstallprompt when PWA install criteria + engagement heuristics are met; document how to force it for manual verification"
  debug_session: inline (static diagnosis)
- truth: "Help menu 'Replay welcome' label reads naturally"
  status: failed
  reason: "User reported: 'Replay welcome' sounds bizarre; expects something like 'Onboarding Screen' (all 4 locales)"
  severity: minor
  test: 1
  root_cause: "Content, not a defect. help.entry.replayWelcome copy is literally 'Replay welcome' (i18n-en.js:599); the label just reads awkwardly. Ben prefers wording like 'Onboarding Screen'."
  artifacts:
    - path: "assets/i18n-en.js:599"
      issue: "help.entry.replayWelcome = 'Replay welcome' reads awkwardly"
  missing:
    - "Rename the EN label to Ben-approved wording (e.g. 'Onboarding screen' / 'Replay welcome tour' — confirm exact text with Ben)"
    - "Mirror across HE/DE/CS (coordinate with Phase 42.1 translation scope)"
  debug_session: inline (static diagnosis)
