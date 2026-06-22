---
phase: 25-backup-architectural-rework
plan: 03
subsystem: backup
tags: [backup, dry-run, encryption, safety-net, i18n, tdd, no-mutation]
requires:
  - assets/backup.js (BackupManager IIFE — _decryptBlob, SGBACKUP_MAGIC, _t fallbacks map)
  - assets/db.js (PortfolioDB write methods — surfaces testBackupPassword MUST NOT TOUCH)
  - assets/overview.js (DOMContentLoaded modal-handler block — extended in place)
  - tests/24-05-import-validator.test.js (vm-sandbox test convention)
  - .planning/phases/25-backup-architectural-rework/25-02-SUMMARY.md (#backupModalTestPasswordSection placeholder)
  - .planning/phases/25-backup-architectural-rework/25-CONTEXT.md (D-12 dry-run contract, D-26 every surface has header+helper, D-27 HE noun/infinitive, D-28 4-locale parity)
provides:
  - BackupManager.testBackupPassword(file, passphrase) — memory-only dry-run; rejects with 3 distinct i18n messages
  - tests/_helpers/mock-portfolio-db.js — spy-instrumented PortfolioDB mock (reusable by Plan 08)
  - 10 new i18n keys × 4 locales (40 entries)
  - 10 new EN fallback strings in backup.js's `_t` fallbacks map (pre-App-init resolution)
  - 6 CSS utility classes (.backup-test-password-* in the Phase 25 modal band)
  - tests/25-03-testpassword-no-mutation.test.js (3 assertions — load-bearing for T-25-03-01)
  - tests/25-03-testpassword-wrong.test.js (2 assertions)
  - tests/25-03-testpassword-invalid.test.js (5 assertions across 5 sub-cases)
affects:
  - index.html (#backupModalTestPasswordSection filled with sub-card markup)
  - assets/backup.js (new function + 10 EN fallbacks + public-API entry)
  - assets/overview.js (handler block + inline closeBackupModal reset)
  - assets/app.css (6 utility classes in the Phase 25 band)
  - assets/i18n-{en,he,de,cs}.js (10 keys each)
  - service worker CACHE_NAME (auto-bumped by pre-commit hook v145 → v146 → v147)
tech_stack:
  added: []
  patterns:
    - Pre-App-init i18n fallback (D-26) — every reject-path string lives in backup.js's `_t` fallbacks map AND in i18n-*.js, so the function works regardless of App boot order.
    - Falsifiable safety contract (T-25-03-01) — D-12's "your data is not touched" promise is enforced by tests/25-03-testpassword-no-mutation.test.js, not by policy.
    - Spy-instrumented mock as test-shared infrastructure — tests/_helpers/mock-portfolio-db.js is the canonical PortfolioDB mock (Plan 08 reuses it for the round-trip test).
    - Inline reset over rebinding — closeBackupModal is a hoisted function declaration; the Test-password reset logic is inlined into the existing body (cleaner than swapping to `let closeBackupModal = ...`).
key_files:
  created:
    - tests/_helpers/mock-portfolio-db.js
    - tests/25-03-testpassword-no-mutation.test.js
    - tests/25-03-testpassword-wrong.test.js
    - tests/25-03-testpassword-invalid.test.js
    - .planning/phases/25-backup-architectural-rework/25-03-SUMMARY.md
  modified:
    - assets/backup.js
    - assets/overview.js
    - assets/app.css
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
    - index.html
decisions:
  - D-12: Test-backup-password dry-run lives inside the Backup & Restore modal (under the Import section). Implemented as a pure-function public API that never touches IndexedDB or localStorage.
  - D-26: Every surface has heading + helper text. The sub-card uses backup.testPassword.heading + backup.testPassword.helper.
  - D-27: HE uses noun/infinitive forms ("בדיקת סיסמת גיבוי", "בדיקת סיסמה", "סיסמת גיבוי", "גרירת"/"לחיצה"/"לבחירה" — no imperatives).
  - D-28: 10 keys × 4 locales = 40 i18n entries shipped together.
  - Per-key fallback grep gate adapted from `"\"$K\""` (the literal plan form) to `['\"]$K['\"]\\s*:` so single-quoted entries match the established `_t` fallbacks map style.
metrics:
  duration: ~10 min
  completed: 2026-05-15
  tasks: 2
  tests_added: 3 (10 assertions across them)
  tests_passing: 10 (this plan) + 17 (25-02) + 16 (25-01) — no regressions
  commits: 3 (RED + Task 1 GREEN + Task 2)
---

# Phase 25 Plan 03: Test-Backup-Password Dry-Run Safety Net — Summary

**One-liner:** Added `BackupManager.testBackupPassword(file, passphrase)` as a memory-only dry-run that decrypts a `.sgbackup` to verify the password works WITHOUT mutating IndexedDB or localStorage (D-12); filled the Plan-02 placeholder sub-card with file-drop + password + result UI; shipped a spy-instrumented `PortfolioDB` mock that proves the safety promise via tests/25-03-testpassword-no-mutation.test.js (the falsifiable contract for T-25-03-01).

## What Shipped

### New BackupManager function (assets/backup.js)

```js
async function testBackupPassword(file, passphrase) → Promise<{
  ok: true,
  manifestVersion: number | null,
  exportedAt: string | null,    // ISO timestamp from manifest header
  clientCount: number,
  sessionCount: number
}>
```

Placement: between `shareBackup` and `importBackup`, grouped with the encrypt/share utilities. Exposed on the public API at `BackupManager.testBackupPassword`.

**Reject paths** (each surfaces a distinct, honest i18n-resolved message via `_t(...)`):

| Trigger                                          | Error message                              |
|--------------------------------------------------|--------------------------------------------|
| `file` is null/undefined                         | `backup.testPassword.invalid`              |
| File extension !== `sgbackup` (.zip / .json / …) | `backup.testPassword.notEncrypted`         |
| `_decryptBlob` returns `null` (magic mismatch)   | `backup.testPassword.invalid`              |
| `crypto.subtle.decrypt` throws OperationError    | `backup.testPassword.wrongPassphrase`      |
| `JSZip.loadAsync` resolves but no `backup.json`  | `backup.testPassword.invalid`              |
| `JSON.parse(backup.json)` throws                 | `backup.testPassword.invalid`              |

The early extension check is the V5 input-validation defense (T-25-03-04): we never call `_decryptBlob` on a non-`.sgbackup` file. `normalizeManifest` is intentionally NOT called — it mutates its argument with defensive defaults, and we want the raw manifest header for the result.

### 10 EN fallback strings in the `_t` fallbacks map (assets/backup.js lines 124–143)

All 10 new keys live in the fallbacks map so `_t(key)` returns the EN string when `App.t` is unavailable (pre-App-init):

```js
'backup.action.testPassword': 'Test backup password',
'backup.testPassword.heading': 'Test backup password',
'backup.testPassword.helper': "Check that you can decrypt a backup file with your password. Your current data is not touched.",
'backup.testPassword.filePlaceholder': 'Drop a backup file here, or click to choose one.',
'backup.testPassword.passwordPlaceholder': 'Backup password',
'backup.testPassword.run': 'Test password',
'backup.testPassword.success': 'Decrypted successfully. Backup from {date} — {clients} clients, {sessions} sessions.',
'backup.testPassword.wrongPassphrase': "That password didn't decrypt this file. Double-check the password you used when creating the backup, or try a different file.",
'backup.testPassword.notEncrypted': "This file isn't an encrypted backup, so no password is needed. You can import it directly from the Import section.",
'backup.testPassword.invalid': "This file isn't a valid Sessions Garden backup. Try a different file."
```

This satisfies the plan's acceptance criterion that the reject-path messages resolve correctly even when `App` has not finished booting. The 4 UI-rendering keys (action/helper/filePlaceholder/passwordPlaceholder) ship in the same fallbacks block because the modal markup may render before App initializes — applying translations works either way.

### i18n: 10 keys × 4 locales = 40 entries

Inserted just after `backup.modal.scheduleFooter` (the Plan 02 boundary) in each of `assets/i18n-{en,he,de,cs}.js`.

| Key                                    | EN                          | HE (noun/infinitive — D-27)   | DE                              | CS                              |
|----------------------------------------|------------------------------|-------------------------------|---------------------------------|---------------------------------|
| `backup.action.testPassword`           | Test backup password         | בדיקת סיסמת גיבוי              | Backup-Passwort testen          | Otestovat heslo zálohy          |
| `backup.testPassword.heading`          | Test backup password         | בדיקת סיסמת גיבוי              | Backup-Passwort testen          | Otestovat heslo zálohy          |
| `backup.testPassword.helper`           | Check that you can decrypt … | בדיקה שניתן לפענח …            | Prüfen Sie, ob Sie …            | Ověřte, že lze dešifrovat …     |
| `backup.testPassword.filePlaceholder`  | Drop a backup file …          | גרירת קובץ גיבוי לכאן …        | Backup-Datei hier ablegen …     | Sem přetáhněte soubor zálohy …  |
| `backup.testPassword.passwordPlaceholder` | Backup password           | סיסמת גיבוי                    | Backup-Passwort                 | Heslo zálohy                    |
| `backup.testPassword.run`              | Test password                | בדיקת סיסמה                    | Passwort testen                 | Otestovat heslo                 |
| `backup.testPassword.success`          | Decrypted successfully …     | פוענח בהצלחה …                 | Erfolgreich entschlüsselt …     | Úspěšně dešifrováno …           |
| `backup.testPassword.wrongPassphrase`  | That password didn't …       | הסיסמה לא פיענחה …             | Mit diesem Passwort konnte …    | Tímto heslem se soubor …        |
| `backup.testPassword.notEncrypted`     | This file isn't an encrypted backup … | הקובץ אינו גיבוי מוצפן …  | Diese Datei ist kein verschlüsseltes … | Tento soubor není zašifrovaná … |
| `backup.testPassword.invalid`          | This file isn't a valid …    | הקובץ אינו גיבוי תקין …        | Diese Datei ist kein gültiges … | Tento soubor není platná …      |

**HE spot-check (D-27):** `בדיקה / בדיקת` are nouns (construct: "checking of"), `סיסמה / סיסמת` are nouns ("password"), `גרירת / לחיצה / לבחירה` are verbal-noun forms ("dragging" / "clicking" / "for choosing"). No imperative verbs like `בדוק` / `בחר` / `פענח`.

**DE/CS literal-Unicode precedent:** the new keys use literal characters rather than `\uXXXX` escapes, matching the Plan 25-01 SUMMARY one-time precedent (deviation #3 there). Existing keys in those files remain untouched. All 4 locale files parse as valid JavaScript (verified via `vm.runInNewContext`).

### Modal Test-password sub-card (index.html)

Replaced the empty `#backupModalTestPasswordSection` (the Plan-02 placeholder) with:

```html
<section class="backup-modal-section backup-modal-section--test" id="backupModalTestPasswordSection">
  <div class="backup-test-password-card">
    <h3 data-i18n="backup.testPassword.heading">Test backup password</h3>
    <p data-i18n="backup.testPassword.helper">Check that you can decrypt …</p>
    <div class="form-field">
      <label class="button ghost backup-test-password-filebtn import-label" for="backupTestPasswordFile">
        <span id="backupTestPasswordFileLabel" data-i18n="backup.testPassword.filePlaceholder">Drop a backup file …</span>
        <input id="backupTestPasswordFile" type="file" accept=".sgbackup" class="is-hidden" />
      </label>
    </div>
    <div class="form-field">
      <input id="backupTestPasswordInput" class="input" type="password" autocomplete="off"
             data-i18n-placeholder="backup.testPassword.passwordPlaceholder" placeholder="Backup password" />
    </div>
    <div class="backup-modal-button-row">
      <button id="backupTestPasswordRun" data-i18n="backup.testPassword.run" disabled>Test password</button>
    </div>
    <p id="backupTestPasswordResult" class="backup-test-password-result" role="status" aria-live="polite" hidden></p>
  </div>
</section>
```

Five new IDs (File / FileLabel / Input / Run / Result), all unique. Run button is `disabled` by default until both file and password are present.

### CSS (assets/app.css — Phase 25 modal band)

Six new utility classes appended after `.backup-modal-footer`:

```css
.backup-test-password-card        /* alt-surface card, rounded */
.backup-test-password-filebtn     /* inline-flex label */
.backup-test-password-result      /* base padding + radius */
.backup-test-password-result.success  /* green tokens — success-bg / -text / -border */
.backup-test-password-result.error    /* yellow tokens — warning-bg / -text — also used as border */
```

All values use semantic `var(--color-*)` / `var(--space-*)` tokens with fallback literals; no new colors introduced. Color choice uses warning (yellow) for the error state per the plan's UI-SPEC — distinguishes "your test failed" (recoverable) from the existing destructive-import warning (red).

### Handler wiring (assets/overview.js)

New handler block added inside the DOMContentLoaded handler (after `#backupModalImportInput`):

- `refreshTestPasswordButtonState()` — toggles `disabled` based on `hasFile && hasPwd`.
- File `change`: renders chosen filename (drops the `data-i18n` binding so applyTranslations does not overwrite the dynamic value — mirrors `renderLastBackupSubtitle`); clears any prior result; refreshes button state.
- Password `input`: clears result + refreshes button state on every keystroke.
- Run button `click`:
  - Calls `BackupManager.testBackupPassword(file, password)` — the no-mutation public API.
  - On resolve: substitutes `{date}` / `{clients}` / `{sessions}` placeholders in `App.t('backup.testPassword.success')`, renders green `.success` band. Locale-aware date via `toLocaleDateString(localStorage.getItem('portfolioLang') || 'en')`.
  - On reject: renders `error.message` (already an i18n-resolved string from `_t`) in the yellow `.error` band.
  - `finally`: refreshes button state.

**Closing the modal resets the sub-card** (file/password/result/button-state) by extending `closeBackupModal` in place. **Picked the inline option over re-binding** because `closeBackupModal` is a hoisted `function` declaration — switching to `let closeBackupModal = function() { … }` would touch Plan-02 code unnecessarily and risk regression on the cross-page open path.

### Tests (TDD)

**tests/_helpers/mock-portfolio-db.js** — `createMockPortfolioDB({ clients?, sessions?, … })` returns a PortfolioDB mock where every write method (`clearAll`, `addClient`, `addSession`, `setTherapistSetting`, `updateSnippet`) is a spy recording its calls on `__calls`. Reads return `[]` by default (configurable). `assertNoWrites(mock)` throws if any write fired. CommonJS exports: `{ createMockPortfolioDB, assertNoWrites, WRITE_METHODS, READ_METHODS }`. Reusable by Plan 08's round-trip test.

**tests/25-03-testpassword-no-mutation.test.js** — 3 assertions, all PASS:
1. Happy path resolves `{ ok: true, clientCount: number, sessionCount: number }`.
2. `assertNoWrites(mockDb)` holds — zero writes during a successful dry-run.
3. No `localStorage.setItem` call lands on a `portfolio*` key.

**tests/25-03-testpassword-wrong.test.js** — 2 assertions, all PASS:
1. OperationError → rejects with the i18n key OR EN fallback for `backup.testPassword.wrongPassphrase`.
2. The wrong-password path leaves the mock DB untouched.

**tests/25-03-testpassword-invalid.test.js** — 5 sub-cases, all PASS:
- A: `.zip` → notEncrypted
- A.2: `.json` → notEncrypted
- B: `.sgbackup` with bad magic → invalid
- C: decrypts but no `backup.json` in the zip → invalid
- D: `null` file → invalid

Each sub-case asserts `assertNoWrites(mockDb)`.

**Total Phase 25-03: 10 assertions, all pass.** Regression: Phase 25-01 (16/16) and Phase 25-02 (17/17) still pass.

### Test-harness portability note

The three new test files duck-type the rejection on `typeof err.message === 'string'` rather than `err instanceof Error`. Reason: `vm.runInContext` runs `assets/backup.js` in its own realm — the `Error` constructor differs from the host realm, so `instanceof Error` always returns `false` for errors thrown inside the sandbox. The `.message` shape check is the meaningful invariant.

## Plan-Wide Grep Gates (all PASS)

| Gate                                                            | Result |
|-----------------------------------------------------------------|--------|
| `function testBackupPassword` declared in backup.js             | PASS   |
| `testBackupPassword: testBackupPassword` exposed on public API  | PASS   |
| No forbidden calls (`db.clearAll/addClient/addSession/setTherapistSetting/updateSnippet`, `localStorage.setItem`) inside testBackupPassword body | PASS   |
| All 10 EN fallback strings present in backup.js `_t` map        | PASS   |
| All 4 IDs (#backupTestPasswordFile/Input/Run/Result) in index.html | PASS |
| `BackupManager.testBackupPassword(` invoked from overview.js    | PASS   |
| 10 keys × 4 locales = 40 i18n entries                            | PASS   |
| `{date}` / `{clients}` / `{sessions}` placeholders present in EN | PASS   |

## Commits

| Hash     | Type   | Subject                                                                                    |
|----------|--------|--------------------------------------------------------------------------------------------|
| 20f7a6f  | test   | RED — failing testBackupPassword tests + shared PortfolioDB mock                            |
| d297398  | feat   | GREEN — implement BackupManager.testBackupPassword (Task 1)                                 |
| 7a15858  | feat   | wire Test-password sub-card UI + 10 i18n keys in 4 locales (Task 2)                         |

Both `feat(...)` commits triggered the pre-commit hook's automatic `sw.js` `CACHE_NAME` bump (v145 → v146 → v147) because cached assets were modified. Per `memory/reference-pre-commit-sw-bump.md`, this is the project's established convention.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] `instanceof Error` is unreliable across vm realms**

- **Found during:** Task 1 GREEN — three test files initially asserted `caught instanceof Error`, which the harness reported as failing even though the rejection clearly was an Error from inside the sandbox.
- **Root cause:** `vm.runInContext(src, sandbox, ...)` gives `assets/backup.js` its own realm; `Error` in that realm is a different constructor from the host-test realm. `instanceof` is a per-realm predicate.
- **Fix:** Replaced `assert.ok(err instanceof Error, …)` with `assert.strictEqual(typeof err.message, 'string', …)`. The meaningful invariant is the `.message` shape, not the constructor identity.
- **Files modified:** tests/25-03-testpassword-wrong.test.js, tests/25-03-testpassword-invalid.test.js
- **Commit:** Folded into `d297398` (Task 1 GREEN).

**2. [Cosmetic] Per-key fallback grep gate adapted to match the established quote style**

- **Found during:** Task 1 GREEN verify pass.
- **Issue:** The plan's `<verify>` block uses `grep -F "\"$K\""` to assert each fallback string is present — that grep form only matches double-quoted keys. The established `_t` fallbacks map style at backup.js lines 99–128 uses single quotes (every prior fallback entry is `'key.path': 'value'`).
- **Fix:** Kept the established convention (single-quoted keys) and adapted the verify gate to `grep -E "^[[:space:]]+['\"]${K}['\"][[:space:]]*:" assets/backup.js`. The intent — "all 10 keys present in the fallbacks map" — is preserved; only the literal grep form changed.
- **Files modified:** none (verification adjustment only).
- **Documented in `decisions:` frontmatter for downstream agents.**

### Cosmetic Deviations

**3. DE/CS new keys use literal Unicode** — follows the Plan 25-01 / Plan 25-02 one-time precedent (Plan 25-02 SUMMARY deviation #3). The new Phase-25 keys at the Phase-25 band use literal characters; existing `\uXXXX`-escaped keys elsewhere in those files remain untouched. All 4 locale files parse as valid JavaScript.

## Threat Closure (from PLAN.md `<threat_model>`)

| ID          | Disposition | Status                                                                                                                                                                                                                                                                                                                                                                                                |
|-------------|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| T-25-03-01  | mitigate    | **CLOSED.** `tests/25-03-testpassword-no-mutation.test.js` asserts (1) zero calls to clearAll/addClient/addSession/setTherapistSetting/updateSnippet on the happy path AND (2) zero `localStorage.setItem` calls on `portfolio*` keys. The function body grep gate inside `<verify>` confirms zero forbidden identifiers inside the body. D-12's safety promise is now falsifiable, not policy. |
| T-25-03-02  | mitigate    | **CLOSED.** The result object exposes only manifest.version, exportedAt, clients.length, sessions.length — never client names, session content, or settings. The user already supplied the file; revealing the counts is consensual disclosure of their own data.                                                                                                                                       |
| T-25-03-03  | mitigate    | **CLOSED.** Test sub-case C (decrypts but no `backup.json`) and the `JSON.parse` catch-branch reject with `backup.testPassword.invalid`. A crafted backup that decrypts cleanly but has hostile content cannot DO anything because there is no DB-write path in testBackupPassword.                                                                                                                |
| T-25-03-04  | mitigate    | **CLOSED.** The early `ext !== 'sgbackup'` check prevents calling `_decryptBlob` on `.zip` / `.json` / arbitrary file types. Tests A and A.2 prove the rejection happens BEFORE the crypto stub is reached (test uses a JSZip stub that throws if called).                                                                                                                                          |

## Hand-offs

### To Plan 04 (cloud icon state-color wiring)

No direct dependency. Plan 04 swaps `BackupManager.computeBackupRecencyState()`'s body; testBackupPassword does not interact with that helper.

### To Plan 05 (scheduled-backup Settings tab)

No direct dependency. Plan 05's interval-end prompt calls `openBackupModal`; the modal now includes the Test-password sub-card by default and resets it cleanly via `closeBackupModal`.

### To Plan 08 (single-source export refactor + round-trip integration test)

- **Reuse the mock.** `tests/_helpers/mock-portfolio-db.js` is the canonical PortfolioDB spy mock. Plan 08's round-trip test should:
  1. Build a manifest, run exportBackup → produce a ZIP blob.
  2. Pass the blob into a fresh `createMockPortfolioDB()` instance + call importBackup.
  3. Assert the writes recorded on the mock match the original manifest 1:1 (using `mock.__calls.get('addClient')`, etc.).
- **Reuse the manifest-shape parsing approach.** testBackupPassword parses only `backup.json` text + checks `clients` / `sessions` lengths. Plan 08's test can extend this — read every store from the parsed manifest (loop over `BACKUP_CONTENTS_KEYS`) and assert the count + ID-set parity against the source.
- **No exportEncryptedBackup refactor needed for Plan 03.** The Share button visibility hack from Plan 02 stays as-is; Plan 08 removes it as part of the encrypted-export refactor.

## Self-Check: PASSED

| Claim                                                  | Verification                                                | Result |
|--------------------------------------------------------|-------------------------------------------------------------|--------|
| tests/25-03-testpassword-no-mutation.test.js exists    | `[ -f tests/25-03-testpassword-no-mutation.test.js ]`        | FOUND  |
| tests/25-03-testpassword-wrong.test.js exists          | `[ -f tests/25-03-testpassword-wrong.test.js ]`              | FOUND  |
| tests/25-03-testpassword-invalid.test.js exists        | `[ -f tests/25-03-testpassword-invalid.test.js ]`            | FOUND  |
| tests/_helpers/mock-portfolio-db.js exists             | `[ -f tests/_helpers/mock-portfolio-db.js ]`                 | FOUND  |
| All three test files exit 0                            | `node tests/25-03-testpassword-*.test.js` each               | PASS   |
| Commit 20f7a6f (RED) exists                            | `git log --oneline \| grep -q 20f7a6f`                       | FOUND  |
| Commit d297398 (Task 1 GREEN) exists                   | `git log --oneline \| grep -q d297398`                       | FOUND  |
| Commit 7a15858 (Task 2) exists                         | `git log --oneline \| grep -q 7a15858`                       | FOUND  |
| BackupManager.testBackupPassword exposed               | `grep -E "testBackupPassword:\s*testBackupPassword" assets/backup.js` | FOUND |
| All 10 EN fallback strings in backup.js                | per-key grep with `['\"]K['\"]:` form                        | PASS (10/10) |
| 10 i18n keys × 4 locales (40 entries)                  | per-locale per-key `"$K":` grep                              | PASS (40/40) |
| All 4 locale files parse as valid JavaScript           | `vm.runInNewContext` of each                                 | PASS   |
| No regression on Phase 25-01 / 25-02 tests             | re-ran all five existing tests                               | PASS (16+17) |
| No forbidden calls in testBackupPassword body          | awk-extracted function body + grep                           | PASS (count=0) |

Verified by manual command-line run after final Task-2 commit `7a15858`.

## Known Stubs

None. No placeholder values or "coming soon" rendering paths shipped. The Test-password sub-card is fully wired end-to-end (file input → password input → BackupManager API → result paragraph).
