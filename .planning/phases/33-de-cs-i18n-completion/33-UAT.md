---
status: testing
phase: 33-de-cs-i18n-completion
source: [33-VERIFICATION.md]
started: 2026-07-06T12:50:55Z
updated: 2026-07-06T12:50:55Z
---

## Current Test

number: 1
name: DE/CS export-modal visual fit check
expected: |
  Switch app locale to German, then to Czech; open the export modal and step through 1→2→3.
  Stepper-label chips show the short translated labels without overflow/wrapping; step helper
  text is fully visible without clipping; the four formatting-tips lines render correctly
  (heading tip still shows literal # / ##).
awaiting: user response

## Tests

### 1. DE/CS export-modal visual fit check
expected: Switch app locale to German, then to Czech; open the export modal and step through 1→2→3. Stepper-label chips show the short translated labels without overflow/wrapping; step helper text is fully visible without clipping; the four formatting-tips lines render correctly (heading tip still shows literal `#` / `##`).
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
