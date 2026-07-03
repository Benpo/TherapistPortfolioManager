---
status: testing
phase: 37-date-consistency-date-format-setting-f6-f5
source: [37-VERIFICATION.md]
started: 2026-07-03T10:45:00Z
updated: 2026-07-03T10:45:00Z
---

## Current Test

number: 1
name: he/de/cs translation quality for new F5/F4 session-type + date-format keys
expected: |
  All new i18n keys render with natural, native-quality Hebrew/German/Czech strings
  (not machine-translation artifacts). Keys currently flagged [ASSUMED] in the
  he/de/cs bundles — notably session.type.proxy and session.type.remote — read
  correctly to a native speaker. Structurally the keys exist in all 4 bundles and
  tests pass; only native-quality review is outstanding.
awaiting: user response

## Tests

### 1. he/de/cs translation quality (native review)
expected: New F5/F4 i18n keys read naturally in Hebrew/German/Czech (Sapir/native review); [ASSUMED] flags removed once confirmed.
result: [pending]

### 2. WR-02 backup-restore default-value fidelity (decision)
expected: |
  Decide the intended behavior when a backup was taken on a device using DEFAULT
  (null) portfolioDateFormat / portfolioSessionTypes. Current code
  (`if (manifest.settings.dateFormat)`) skips restoring the null/default, so a
  target device retains its own customization instead of being reset to the
  source's default. Either (a) accept as-is (documented), or (b) apply the
  `'dateFormat' in manifest.settings` + removeItem-on-null fix so restore is a
  faithful mirror of the source.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
