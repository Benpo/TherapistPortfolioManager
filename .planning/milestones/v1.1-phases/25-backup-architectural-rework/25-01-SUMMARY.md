---
phase: 25-backup-architectural-rework
plan: 01
subsystem: backup
tags: [backup, web-share-api, security, i18n, tdd]
requires:
  - assets/backup.js (BackupManager IIFE module)
  - tests/24-05-import-validator.test.js (vm-sandbox test convention)
provides:
  - BackupManager.shareBackup(blob, filename) — encryption-inheriting Web Share
  - BackupManager.isShareSupported(file) — feature probe with the actual File
  - tests/_helpers/mock-navigator-share.js — reusable share/canShare mock (used by Plan 08)
  - 3 new i18n keys × 4 locales: backup.action.share, backup.share.title, backup.share.fallback.body
affects:
  - assets/overview.js:129-139 (sendBackupBtn handler — references removed BM.sendToMyself; handler block is removed by Plan 02)
tech_stack:
  added: [navigator.share files API]
  patterns: [feature-detect with actual File (RESEARCH.md Pattern 1), encryption-inheritance via caller-supplied blob (D-04)]
key_files:
  created:
    - tests/_helpers/mock-navigator-share.js
    - tests/25-01-sendToMyself-removed.test.js
    - tests/25-01-share-fallback.test.js
    - tests/25-01-share-encryption-inherit.test.js
  modified:
    - assets/backup.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - D-01: Removed BackupManager.sendToMyself entirely (definition + public API + source string) — closes the encryption-bypass + fake-attachment regression.
  - D-02: shareBackup uses navigator.share files API on supported browsers; falls back to triggerDownload + honest mailto on others.
  - D-04: shareBackup ACCEPTS (blob, filename) and never re-derives via exportBackup/exportEncryptedBackup — encryption inheritance is enforced by signature and verified by tests/25-01-share-encryption-inherit.test.js.
  - D-27: Hebrew strings use noun/infinitive forms ("שיתוף גיבוי", not the imperative "שתף גיבוי").
  - D-28: 4-locale parity for every new string (EN/HE/DE/CS).
metrics:
  duration: ~35 min
  completed: 2026-05-15
  tasks: 2
  tests_added: 3
  test_helpers_added: 1
  commits: 3 (RED + GREEN + i18n)
---

# Phase 25 Plan 01: Send-to-Myself Fix Summary

**One-liner:** Closed the sendToMyself encryption-bypass + fake-attachment regression by deleting the function and replacing it with an encryption-inheriting shareBackup(blob, filename) that uses Web Share API on supported browsers and falls back to download + an honest mailto.

## What Shipped

### `BackupManager.shareBackup(blob, filename)` (new)

A two-path async helper that takes an already-built blob (encrypted or not — the caller decides) and shares it through the Web Share API. Falls back to `triggerDownload(blob, filename)` + a `mailto:?subject=...&body=...` whose body literally says **"Please attach {filename} to this email manually"** when the share API is unavailable.

Returns one of:
- `{ ok: true,  via: 'share' }` — share sheet completed successfully
- `{ ok: false, via: 'share', cancelled: true }` — user dismissed the sheet (silent per UI-SPEC)
- `{ ok: true,  via: 'mailto-fallback' }` — fallback path: file downloaded, mailto opened

Location: `assets/backup.js`, between `exportEncryptedBackup` and `importBackup`.

### `BackupManager.isShareSupported(file)` (new)

Feature probe that calls `navigator.canShare({ files: [file] })` with the **actual File** the caller intends to share. This mitigates Pitfall 1 (Safari macOS may reject the `.sgbackup` MIME type at share time despite `canShare` returning true — by probing with the real File the rejection surfaces here, not inside `navigator.share()`).

Returns `false` whenever `navigator.canShare` is unavailable, throws, or returns false.

### `sendToMyself` (removed)

The old `async function sendToMyself(blob, filename)` and its leading comment band are deleted from `assets/backup.js`. The public-API return object no longer contains `sendToMyself`. `grep -c "sendToMyself" assets/backup.js` returns `0`.

### Tests

- **tests/_helpers/mock-navigator-share.js** — `createShareMock({ canShareReturns, shareThrows, shareReturns })` factory exporting a `{canShare, share, calls}` triple. Reusable by Plan 08's round-trip test.
- **tests/25-01-sendToMyself-removed.test.js** — 4 assertions: sendToMyself is `undefined` on the public API, shareBackup + isShareSupported are functions, and the literal string "sendToMyself" is absent from the source file.
- **tests/25-01-share-fallback.test.js** — drives `shareBackup` with `canShareReturns: false`, asserts: URL.createObjectURL called once with the exact blob (no re-encoding); an `<a download="test.sgbackup">` is created; `localStorage.portfolioLastExport` updated; `window.location.href` set to a `mailto:?...` URL whose decoded body contains the literal filename; `navigator.share` not called.
- **tests/25-01-share-encryption-inherit.test.js** — drives `shareBackup` with `canShareReturns: true`; replaces `BM.exportBackup` and `BM.exportEncryptedBackup` with throwing stubs; asserts neither is called from inside shareBackup (D-04 enforcement), and `navigator.share` receives the exact filename passed in.

All three test files exit 0. They follow the existing vm-sandbox convention from `tests/24-05-import-validator.test.js` (no Jest, just `node tests/<name>.test.js`).

### i18n (EN/HE/DE/CS × 3 new keys, 1 retired key)

| Key                              | EN                                                                                              | HE                                                                                | DE                                                                                                | CS                                                                                                |
|----------------------------------|-------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| `backup.action.share`            | Share backup                                                                                    | שיתוף גיבוי                                                                       | Backup teilen                                                                                     | Sdílet zálohu                                                                                     |
| `backup.share.title`             | Sessions Garden backup                                                                          | גיבוי Sessions Garden                                                              | Sessions Garden Backup                                                                            | Záloha Sessions Garden                                                                            |
| `backup.share.fallback.body`     | Backup downloaded to your Downloads folder. Please attach {filename} to this email manually.    | קובץ הגיבוי הורד לתיקיית ההורדות. נא לצרף את {filename} לאימייל זה ידנית.       | Backup wurde in den Download-Ordner geladen. Bitte hängen Sie {filename} manuell an diese E-Mail an. | Záloha byla stažena do složky Downloads. Přiložte prosím {filename} k tomuto e-mailu ručně.       |

**Retired:** `overview.sendBackup` (the label for the now-deleted button) is removed from all four locale files.

Hebrew uses noun/infinitive per D-27. The `{filename}` placeholder is a literal substring — `shareBackup` substitutes it with `String.prototype.replace`.

## Commits

| Phase    | Hash     | Subject                                                                  |
|----------|----------|--------------------------------------------------------------------------|
| RED      | 1ccf7df  | test(25-01): RED — failing tests for sendToMyself removal + shareBackup contract |
| GREEN    | cee5911  | feat(25-01): GREEN — shareBackup + isShareSupported; remove sendToMyself |
| Task 2   | d3f7b01  | feat(25-01): 4-locale strings for Share affordance; retire overview.sendBackup |

(The `cee5911` and `d3f7b01` commits also include an automatic `sw.js` CACHE_NAME bump from the pre-commit hook — `sessions-garden-v139 → v140 → v141`. This is the project's established convention for asset changes; documented in `memory/reference-pre-commit-sw-bump.md`.)

## Pitfall 1 (.sgbackup on Safari macOS) — Status

**Mitigated by feature-probe + fallback.**

`isShareSupported(file)` calls `navigator.canShare({ files: [file] })` with the actual File whose MIME type is taken from `blob.type` (already `application/octet-stream` for encrypted `.sgbackup` per `_encryptBlob` line 67). If canShare returns false, shareBackup goes straight to the mailto fallback.

In the case where Safari's canShare returns true but `navigator.share()` later rejects (the documented Pitfall 1 false-positive window), the catch handler distinguishes `AbortError` (user cancel, silent) from all other errors (logged, then mailto fallback). Either way the user sees an honest outcome — never a silent leak.

A test enforces the canShare=false → mailto-with-honest-body flow end-to-end.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Test spy on triggerDownload via closure binding**

- **Found during:** Task 1 GREEN phase, first test run
- **Issue:** The plan's behavior spec said "Spy on BackupManager.triggerDownload (replace with sinon-style call recorder)". This is impossible — `triggerDownload` inside the IIFE is a closure binding, and `shareBackup` calls it directly. Replacing `BM.triggerDownload` on the public-API return object only affects the public reference, not the closure binding that `shareBackup` actually calls.
- **Fix:** Switched the share-fallback test to observe triggerDownload's three side effects instead: `URL.createObjectURL(blob)` is called with the exact blob, `document.createElement('a')` produces an anchor with `.download === filename`, and `localStorage.portfolioLastExport` is updated to a numeric timestamp. All three together prove triggerDownload ran. This is actually a stronger assertion than a function-call spy — it also verifies the blob reference is preserved (no re-encoding).
- **Files modified:** `tests/25-01-share-fallback.test.js`
- **Commit:** `cee5911` (folded into GREEN commit)

**2. [Rule 2 — Auto-fix] Comment that referenced "sendToMyself" tripped the source-grep gate**

- **Found during:** Task 1 GREEN phase, first verify run
- **Issue:** My initial comment block on the new `shareBackup` function said "...this was the original sendToMyself security regression." That made `grep -c "sendToMyself" assets/backup.js` return 1 instead of 0, failing the plan's verify gate.
- **Fix:** Rewrote the comment to reference "the original Phase 22-era security regression" without naming the deleted function. The defense-in-depth source-string assertion in `tests/25-01-sendToMyself-removed.test.js` (which I added proactively) caught this immediately.
- **Files modified:** `assets/backup.js`
- **Commit:** `cee5911` (folded into GREEN commit)

### Cosmetic Deviations

**3. CS file new keys use literal Unicode (not `\u` escapes)** — the existing CS file uses `\uXXXX` escapes for all non-ASCII characters, but the plan's acceptance criterion `grep -F "Sdílet zálohu" assets/i18n-cs.js` requires literal characters. The plan stated "existing files use literal Unicode" which is true for HE/EN but NOT for DE/CS — those existing files escape. I resolved the conflict by following the explicit verify command (literal Unicode for the 3 new keys), leaving all existing CS keys unchanged. This is a one-time, surgical inconsistency limited to lines 280–282 of `assets/i18n-cs.js`.

**4. Diff size slightly larger than the plan's stylized "3 insert / 1 delete per file"** — the actual per-file diff is `-1` (overview.sendBackup removal) `+5` (1 comment line + 1 blank line + 3 new keys). The substance matches; the +2 extra is a labeled section header (matches the existing convention of every backup.passphrase.* group and Phase 22 settings block in these files).

## Hand-off to Plan 02

`BackupManager.shareBackup(blob, filename)` and `BackupManager.isShareSupported(file)` are exposed but **NOT YET WIRED to any button**. The existing `sendBackupBtn` in `index.html` and its handler in `assets/overview.js:129-139` still reference the now-deleted `BackupManager.sendToMyself`. **This is an INTENTIONAL pending state** — Plan 02 deletes that handler block together with the surrounding 3-button cluster and the overview button itself, replacing them with the single header cloud icon (D-08) and the new Backup & Restore modal that contains the "Share backup" CTA wired to `shareBackup`.

Plan 02 should:
1. Remove the `sendBackupBtn` element from `index.html` (lines 99-115 vicinity).
2. Remove the handler block at `assets/overview.js:129-139` that calls the (now-undefined) `BackupManager.sendToMyself`.
3. Inside the new export dialog's Share secondary button, call:
   ```js
   const { blob, filename } = await BackupManager.exportBackup(); // or the encrypted result
   await BackupManager.shareBackup(blob, filename);
   ```
4. Probe-hide the Share button via `BackupManager.isShareSupported(probeFile)` per UI-SPEC line 261.

## Threat Closure (from PLAN.md `<threat_model>`)

| ID         | Disposition | Status                                                                                                                |
|------------|-------------|-----------------------------------------------------------------------------------------------------------------------|
| T-25-01-01 | mitigate    | **CLOSED.** shareBackup signature accepts (blob, filename); enforcement test asserts neither exportBackup nor exportEncryptedBackup is called from inside shareBackup. |
| T-25-01-02 | mitigate    | **CLOSED.** The File wraps the EXACT blob reference passed in (no re-read, no re-encode); test asserts `URL.createObjectURL` receives the same reference and `files[0].name` matches the input filename. |
| T-25-01-03 | mitigate    | **CLOSED.** All four-locale `backup.share.fallback.body` strings literally say "Please attach {filename} to this email manually" — no claim of attachment. Test asserts the decoded mailto body contains the filename. |
| T-25-01-04 | accept      | **As planned.** Pitfall 1 (Safari false-positive canShare on `.sgbackup`) is wrapped by a try/catch around `navigator.share` that distinguishes AbortError from other errors and falls through to the honest mailto fallback. |

## Self-Check: PASSED

Verified by manual command-line run after final commit `d3f7b01`:

| Claim                                                       | Verification                                            | Result |
|-------------------------------------------------------------|---------------------------------------------------------|--------|
| tests/_helpers/mock-navigator-share.js exists               | `[ -f tests/_helpers/mock-navigator-share.js ]`         | FOUND  |
| tests/25-01-sendToMyself-removed.test.js exists             | `[ -f tests/25-01-sendToMyself-removed.test.js ]`       | FOUND  |
| tests/25-01-share-fallback.test.js exists                   | `[ -f tests/25-01-share-fallback.test.js ]`             | FOUND  |
| tests/25-01-share-encryption-inherit.test.js exists         | `[ -f tests/25-01-share-encryption-inherit.test.js ]`   | FOUND  |
| All 3 test files exit 0                                     | `node tests/25-01-*.test.js`                            | PASS   |
| Commit 1ccf7df (RED) exists                                 | `git log --oneline \| grep -q 1ccf7df`                  | FOUND  |
| Commit cee5911 (GREEN) exists                               | `git log --oneline \| grep -q cee5911`                  | FOUND  |
| Commit d3f7b01 (i18n) exists                                | `git log --oneline \| grep -q d3f7b01`                  | FOUND  |
| `grep -c "sendToMyself" assets/backup.js` = 0               | source-string purge                                     | PASS   |
| `grep -c "overview.sendBackup" assets/i18n-*.js` = 0 (each) | i18n purge                                              | PASS   |
| All 4 locale files parse as valid JavaScript                | `node -e "vm.runInNewContext(fs.readFileSync(...))"`    | PASS   |
| No existing Phase 24 tests regressed                        | 10/10 tests/24-04-* and tests/24-05-* exit 0            | PASS   |
