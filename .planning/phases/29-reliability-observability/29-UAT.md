---
status: testing
phase: 29-reliability-observability
source: [29-VERIFICATION.md]
started: 2026-06-23T12:00:00Z
updated: 2026-06-23T12:00:00Z
---

## Current Test

number: 1
name: D-06 — "Open email to support" mailto opens the mail client on a real installed PWA
expected: |
  On a real installed Sessions Garden PWA (iOS / Android / desktop):
  Settings → "Report a problem" → tap "Open email to support" opens the device's
  native mail client with recipient = contact@sessionsgarden.app, a pre-filled
  subject line, and a SHORT "paste below this line" body (NOT the full diagnostic
  log — the full log travels via "Copy report").
  If it opens correctly → pass, no change needed.
  If it fails / does nothing → flip the report screen to copy-only by calling
  degradeToVisibleAddress() on load (un-hide #reportSupportAddress /
  .report-support-fallback) so the visible support address is always shown.
awaiting: user response

## Tests

### 1. D-06 mailto reliability on installed PWA (on-device)
expected: Native mail client opens with recipient contact@sessionsgarden.app, pre-filled subject, and a short "paste below this line" body (full log NOT in the mailto). Degradation path degradeToVisibleAddress() is the fallback if mailto fails.
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
