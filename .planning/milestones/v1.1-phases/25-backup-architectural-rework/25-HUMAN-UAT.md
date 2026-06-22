---
status: partial
phase: 25-backup-architectural-rework
source: [25-VERIFICATION.md]
started: 2026-05-16
updated: 2026-05-16
---

## Current Test

[1 failed → gap-closure; 2 blocked (no Firefox); 3 & 4 passed]

## Tests

### 1. Web Share API with a real .sgbackup file
expected: The Share action opens the native share sheet with the actual encrypted .sgbackup file attached (not an empty/placeholder share).
result: FAILED (Ben, Safari macOS 2026-05-16) — sharing to Mail composes an email with NO file; sharing to Messages does not open Messages at all. Root cause: `navigator.canShare({files})` false-positives on desktop Safari for .sgbackup; `navigator.share()` then resolves without delivering the file (no throw), so the mailto fallback at backup.js:780 never fires. Web Share file delivery is mobile-only in practice.

### 2. Web Share API mailto fallback
expected: On a browser without Web Share (e.g. Firefox), the flow downloads the .sgbackup and opens the mail client with an honest body that does NOT claim a non-existent attachment.
result: BLOCKED — no Firefox available to test. Carry forward.

### 3. Test-backup-password with real AES-GCM crypto
expected: Dropping a real encrypted .sgbackup + entering the correct password verifies successfully WITHOUT mutating current data; a wrong password fails clearly; current IDB data is untouched in both cases.
result: PASS (Ben, 2026-05-16) — "works".

### 4. Photos optimize — real photos, visual quality
expected: With real client photos, the 3-tier verdict reads correctly, Optimize-all actually reduces stored bytes, displayed savings are believable, and optimized photos remain visually acceptable.
result: PASS (Ben, 2026-05-16) — "works".

## Summary

total: 4
passed: 2
issues: 1
pending: 0
skipped: 0
blocked: 1

## Gaps

### GAP-25-H1 — Web Share file delivery broken on desktop Safari
severity: high
status: open
detail: navigator.canShare({files}) returns a false positive on Safari macOS for the
  application/octet-stream .sgbackup file. navigator.share() then resolves
  WITHOUT delivering the file (Mail composes empty; Messages never opens) and
  does NOT throw, so the existing throw/AbortError-only fallback at
  assets/backup.js:780-788 is never reached. Desktop browsers do not reliably
  deliver files via Web Share — it is effectively a mobile-only API.
files: [assets/backup.js, assets/backup-modal.js]
