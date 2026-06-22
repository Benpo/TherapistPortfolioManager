---
status: partial
phase: 17-audit-fix-business
source: [17-VERIFICATION.md]
started: 2026-03-24T12:35:00Z
updated: 2026-03-24T12:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Confirm LS product is fully configured in Lemon Squeezy dashboard
expected: Sessions Garden product at EUR 119, license key generation enabled, 2-device activation limit, post-purchase redirect URL set to https://sessions-garden.app/license.html?key={license_key}
result: [pending]

### 2. Complete a test purchase flow end-to-end
expected: Landing buy button opens LS checkout, after purchase customer is redirected to license.html with key auto-populated in input field, clicking Activate succeeds
result: [pending]

### 3. Verify Impressum Steuernummer status
expected: Either Steuernummer is present or intentionally omitted (Kleinunternehmer without USt-IdNr can lawfully omit per DDG section 5). Currently omitted — legally acceptable. Add when Finanzamt assigns one.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
