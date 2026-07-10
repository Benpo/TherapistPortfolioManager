---
status: complete
phase: 40-first-run-welcome-onboarding-coordinator
source: [40-VERIFICATION.md]
started: 2026-07-08T14:21:39Z
updated: 2026-07-10T06:08:16Z
---

## Current Test

[testing complete — both on-device items confirmed pass by Ben, 2026-07-08]

## Tests

### 1. Real-browser visual + dark-mode check of the gap-closure UI fixes
expected: In Chromium AND Safari/WebKit, light AND dark — (1) the header shows only the "?" icon with no duplicate green "Help" pill, (2) the "?" menu's action row no longer looks grey/preselected and matches the link rows with hover working on both, and (3) the welcome overlay renders two distinct EN paragraphs (value/experience first, privacy second) with a comfortable gap.
why_human: jsdom asserts DOM structure and CSS rule text, not rendered layout/color in a real engine; this project has previously hit Chromium-only-gate blind spots on WebKit (MEMORY: reference-webkit-chromium-svg-visual-verification).
result: pass

### 2. Real Chromium install flow via the beforeinstallprompt re-arm
expected: On a fresh (not-yet-installed), install-eligible Chromium profile, load an app page and confirm the install nudge now appears this session once the real beforeinstallprompt fires (subject to D-02 one-per-session / PRECEDENCE), and that clicking [Install app] fires the native install dialog exactly once and the app installs — no double-prompt, no lingering card.
why_human: beforeinstallprompt/prompt() is a real, heuristics-gated browser API jsdom only exercises via an injected mock; the original 40-UAT test-3 failure was that this had never been exercised on a real profile, and 40-06-SUMMARY documents this same check as still outstanding.
result: pass

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

_Gap-closure round 40-06 / 40-07 / 40-08 closed all 5 previously-diagnosed gaps
(install-nudge re-arm, redundant Help pill, preselected action row, flat welcome
subtitle, awkward menu label) — verified in source by 40-VERIFICATION.md
(re_verification.gaps_remaining: []). The 2 tests above are on-device re-confirmation
of those fixes, not new defects. No open gaps._
