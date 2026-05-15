---
status: partial
phase: 25-backup-architectural-rework
source: [25-VERIFICATION.md]
started: 2026-05-16
updated: 2026-05-16
---

## Current Test

[awaiting human testing]

## Tests

### 1. Web Share API with a real .sgbackup file
expected: On iOS Safari / Chrome macOS, the Share action opens the native share sheet with the actual encrypted .sgbackup file attached (not an empty/placeholder share).
result: [pending]

### 2. Web Share API mailto fallback
expected: On a browser without Web Share (e.g. Firefox), the flow downloads the .sgbackup and opens the mail client with an honest body that does NOT claim a non-existent attachment.
result: [pending]

### 3. Test-backup-password with real AES-GCM crypto
expected: Dropping a real encrypted .sgbackup + entering the correct password verifies successfully WITHOUT mutating current data; a wrong password fails clearly; current IDB data is untouched in both cases.
result: [pending]

### 4. Photos optimize — real photos, visual quality
expected: With real client photos, the 3-tier verdict reads correctly, Optimize-all actually reduces stored bytes, displayed savings are believable, and optimized photos remain visually acceptable (no obvious quality destruction).
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
