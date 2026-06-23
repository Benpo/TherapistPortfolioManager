---
phase: 29-reliability-observability
reviewed: 2026-06-23T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - assets/crashlog.js
  - assets/db.js
  - assets/backup.js
  - assets/report.js
  - assets/settings.js
  - assets/version.js
  - assets/shared-chrome.js
  - assets/app.css
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
  - tests/29-01-crashlog-capture.test.js
  - tests/29-02-migration-escape-hatch.test.js
  - tests/29-02-recovery-export.test.js
  - tests/29-03-report-wiring.test.js
  - tests/29-03-report.test.js
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 29: Code Review Report

**Reviewed:** 2026-06-23
**Depth:** standard
**Files Reviewed:** 17 (app.css and i18n-*.js scanned, not individually narrated)
**Status:** issues_found

## Summary

Phase 29 ships OBS-01 crash logging (`crashlog.js`), OBS-03 DB-migration reset/recover (`db.js` `showDBMigrationError` + `getAllForRecoveryExport`), and OBS-02 "Report a problem" (`report.js`), plus wiring in `settings.js`, `version.js`, and `shared-chrome.js`. The zero-network and privacy posture is generally well-honored: every storage/DOM op is guarded, the recovery export reads around a failed migration, the reset path is double-gated (checkbox + danger confirm), and the report screen treats the editable textarea as the final privacy gate. All five Phase 29 behavior tests pass.

However, the review surfaced one **BLOCKER**: `crashlog.js`'s `ingestEarlyBuffer()` runs unconditionally on every page load and routes the ≤5-entry localStorage mirror through `replaceAllCrashlog`, which is a destructive clear-and-replace of the entire IndexedDB `crashlog` store. This silently destroys up to 45 of the 50 retained crash entries on every page load, defeating the D-02/D-03 "IDB is the primary bounded set" design. The test suite misses it because every case calls `clear()` first and never re-runs module init against an already-populated IDB store.

Secondary concerns: `report.js` `dbVersion()` is dead — it reads `PortfolioDB.DB_VERSION`, which `db.js` does not export (the test only passes because it stubs a fake `DB_VERSION`), so the diagnostic header always reports `unknown`; the report redactor mangles the `User agent:` line despite a comment claiming it is "re-stitched"; an APP_VERSION drift between `version.js` (1.2.1) and the `shared-chrome.js` fallback (1.2.0); and a stray `innerHTML` build path in `shared-chrome.js`'s footer.

## Critical Issues

### CR-01: `ingestEarlyBuffer` wipes the IndexedDB crash log down to the 5-entry mirror on every page load

**File:** `assets/crashlog.js:345-354` (and init at `:356-362`, `persistToIDB:177-191`, `db.js replaceAllCrashlog:1050-1065`)

**Issue:** On module load, `ingestEarlyBuffer()` is invoked unconditionally:

```js
installHandlers();
ingestEarlyBuffer();   // runs on EVERY page load
```

`ingestEarlyBuffer` reads the localStorage mirror (capped at `MIRROR_DEPTH = 5` by `writeMirror`) and calls `persistToIDB(prune(buffered))`. `persistToIDB` calls `db.replaceAllCrashlog(pruned)`, which is **not** an additive merge — it clears the entire store first:

```js
async function replaceAllCrashlog(entries) {
  ...
  store.clear();                 // <-- destroys ALL persisted IDB entries
  for (const e of entries) { ... store.add(rest); }
  ...
}
```

So consider a returning user whose IDB `crashlog` store holds 40 entries accumulated over weeks, with the mirror holding the most recent 5. On the next normal page load (no early-buffer errors at all), `ingestEarlyBuffer` reads those 5 mirror entries and `replaceAllCrashlog` clears the store and writes back only those 5 — **silently discarding the other 35**. The module comment asserts the opposite ("drains it into the primary store while leaving the mirror intact for crash-survival"), but the implementation is a destructive overwrite, not a drain/merge.

This is not recoverable on read either: `getEntries()` only falls back to the mirror when IDB is *empty* (`if (list.length === 0 && mirror.length > 0)`), so once IDB has been truncated to 5 it stays at 5. The net effect: the OBS-01 log can never hold more than ~5 entries across sessions, defeating the D-03 50-entry / 30-day retention contract and severely weakening the OBS-02 report's diagnostic value.

The behavior tests miss this because `29-01-crashlog-capture.test.js` calls `CrashLog.clear()` at the start of every case and never re-invokes module init / `ingestEarlyBuffer` after IDB has been populated beyond the mirror depth.

**Fix:** Make early-buffer ingest additive — merge the mirror into the existing IDB set instead of replacing it, e.g. read current IDB entries, concat the mirror, dedupe, prune, then persist:

```js
function ingestEarlyBuffer() {
  try {
    var buffered = readMirror();
    if (buffered.length === 0) return;
    // Merge with the existing IDB primary, never overwrite it.
    Promise.resolve(getEntries())          // already merges IDB + mirror-on-empty
      .then(function (existing) {
        var merged = prune((existing || []).concat(buffered));
        return persistToIDB(merged);
      })
      .catch(function (e) { warn('ingestEarlyBuffer failed', e); });
  } catch (e) {
    warn('ingestEarlyBuffer failed', e);
  }
}
```

Add a dedup key (e.g. on `timestamp+message+source`) before persisting so re-ingesting the same mirror across loads does not create duplicates. Then add a regression test that: (a) seeds IDB with >5 entries, (b) writes a 5-entry mirror, (c) re-runs `ingestEarlyBuffer`, and asserts the IDB count is NOT reduced to 5.

## Warnings

### WR-01: `report.js` diagnostic header always reports `DB version: unknown` (dead read + misleading test)

**File:** `assets/report.js:117-124`; corroborated by `db.js:1067-1106` (export list) and `tests/29-03-report.test.js:172`

**Issue:** `dbVersion()` reads `window.PortfolioDB.DB_VERSION`:

```js
if (typeof window !== 'undefined' && window.PortfolioDB && window.PortfolioDB.DB_VERSION != null) {
  return String(window.PortfolioDB.DB_VERSION);
}
```

But `DB_VERSION` is a private `const` inside the `PortfolioDB` IIFE (`db.js:4`) and is **not** in the returned public object. So in production `window.PortfolioDB.DB_VERSION` is `undefined` and the header line is always `DB version: unknown`. The behavior test passes only because it injects a fake `PortfolioDB: { DB_VERSION: 6 }` stub (`29-03-report.test.js:172`), giving false confidence that the real read works. DB version is one of the most useful facts in a migration-failure report (OBS-03 is literally about migration failures), so losing it materially weakens the report.

**Fix:** Export `DB_VERSION` from `db.js`'s returned API:

```js
return {
  ...
  DB_VERSION: DB_VERSION,
  ...
};
```

and change the test stub to load real `db.js` (or at minimum assert against the real export), so the test would fail if the field were missing.

### WR-02: `redactReport` corrupts the `User agent:` line; comment claims a re-stitch that does not exist

**File:** `assets/report.js:196-232` (esp. the comment at `:193-194` and the name regex at `:212-226`)

**Issue:** The block comment states: "we deliberately keep the userAgent line readable by re-stitching it." There is no re-stitching code. The name-redaction regex matches any run of 2–3 capitalized words and replaces them with `[redacted-name]`, and the `keep` allowlist only preserves header field labels (`User agent`, `App version`, …) — not the userAgent *value*. Verified empirically:

```
input:  "User agent: Mozilla Firefox Gecko"
output: "User agent: [redacted-name]"
```

A real UA string (`Mozilla/5.0 ... Firefox/...`, `... Mobile Safari`) contains multi-word capitalized tokens that get clobbered, so the most diagnostically useful field is destroyed for many browsers. This is a privacy-floor over-reach (the editable preview is still the gate, so it is not a leak), but it degrades OBS-02's purpose and the comment is actively misleading.

**Fix:** Either exclude the `User agent:` line from name-redaction (split the assembled text, redact only the entries body, then re-join the untouched header — i.e. actually implement the "re-stitch" the comment describes), or add common UA tokens (`Mozilla`, `Safari`, `Chrome`, `Firefox`, `Mobile`, `Gecko`, `Version`, etc.) to the `keep` allowlist. At minimum, correct the comment so it does not claim behavior the code lacks.

### WR-03: APP_VERSION drift between `version.js` (1.2.1) and `shared-chrome.js` fallback (1.2.0)

**File:** `assets/shared-chrome.js:12-14` vs `assets/version.js:25`

**Issue:** `version.js` is documented as the single source of truth for the app version and declares `APP_VERSION = '1.2.1'`. `shared-chrome.js`'s defensive fallback hardcodes `'1.2.0'`:

```js
var APP_VERSION = (... window.AppVersion.APP_VERSION) ? window.AppVersion.APP_VERSION : '1.2.0';
```

If `version.js` ever fails to load (the exact case the fallback exists for), the footer renders `v1.2.0` — a wrong version — which is precisely the stale-version confusion class Phase 28/29's integrity work is trying to eliminate. The drift also signals the fallback was not updated at the last version bump.

**Fix:** Bump the fallback literal to match (`'1.2.1'`) and add it to the per-release bump checklist, or remove the literal fallback entirely and render no version number when `AppVersion` is unavailable (a missing number is less misleading than a wrong one).

### WR-04: `shared-chrome.js` footer built with `innerHTML` and interpolated link hrefs

**File:** `assets/shared-chrome.js:87-104`

**Issue:** `renderFooter` assigns a large `footer.innerHTML = '...'` string that interpolates `getLocalizedLegalLink('disclaimer', lang)` etc. The whole codebase otherwise enforces a strict "createElement + textContent, NEVER innerHTML" contract (see the explicit security comments in `settings.js:112`, `db.js:896-897`, `version.js:231-233`). The interpolated values here are derived from `lang` (a controlled allowlist of `de/he/cs/en`) so this is not currently an injection vector, but it is an inconsistent pattern that (a) violates the project's own stated contract and (b) is fragile if any interpolated segment ever becomes user- or storage-derived. The `lang` value comes from `localStorage.getItem('portfolioLang')` with no validation against the allowlist before being concatenated into the href.

**Fix:** Build the footer with `document.createElement` + `textContent` + `setAttribute('href', ...)` like every other DOM builder in the phase (`buildNudge`, `showDBMigrationError`, `buildReportRow`), or at minimum validate `lang` against `['en','he','de','cs']` before interpolating it into hrefs.

### WR-05: `_decryptBlob` can throw a non-`OperationError` on a too-short `.sgbackup`, surfacing a raw error

**File:** `assets/backup.js:74-86`, consumed by `testBackupPassword:936-981` and `exportRecoveryBackup` decrypt path

**Issue:** `_decryptBlob` checks the 4-byte magic, then slices salt/iv/ciphertext at fixed offsets (4/20/32). A file whose first 4 bytes match the magic but is shorter than 32 bytes (or has an empty ciphertext) yields empty/short `iv`/`ciphertext`, and `crypto.subtle.decrypt` rejects with an error that may not be named `OperationError`. `testBackupPassword` only maps `OperationError` → friendly "wrong passphrase" and rethrows everything else raw, so a crafted/truncated file can surface an unfriendly raw exception to the user. This file predates Phase 29, but `exportRecoveryBackup` (new this phase) reuses `_encryptBlob`/the same format on the recovery path, so the robustness gap is now load-bearing for OBS-03.

**Fix:** Add a length guard in `_decryptBlob` (return `null` when `data.length < 32`, treated as "invalid file"), and/or broaden the `testBackupPassword` catch to map any decrypt rejection to a friendly message rather than rethrowing.

## Info

### IN-01: i18n typo "nesehlo" in Czech crashlog empty-state body

**File:** `assets/crashlog.js:66`

**Issue:** `cs.emptyBody` reads "Na tomto zařízení nic nesehlo špatně." The Czech for "went wrong" should be "nešlo" / "se nepokazilo" — "nesehlo" appears to be a typo. Low impact (empty-state copy) but user-visible.

**Fix:** Have a Czech speaker confirm; likely "Na tomto zařízení se nic nepokazilo."

### IN-02: `clearAll()` opens the DB redundantly to feature-detect stores

**File:** `assets/db.js:697-710`

**Issue:** `clearAll()` calls `await openDB()` twice inside conditionals purely to check `objectStoreNames.contains(...)`:

```js
if ((await openDB()).objectStoreNames.contains("snippets")) { await clearStore("snippets"); }
if ((await openDB()).objectStoreNames.contains("crashlog")) { await clearStore("crashlog"); }
```

`openDB()` is cached/idempotent so this is not a correctness bug, but it is repeated work and slightly obscures intent. Note also that `clearAll()` (used by backup *import* / restore) does NOT clear the `crashlog` store contents conditionally being fine, but worth confirming restore semantics intend to preserve vs. wipe the crash log.

**Fix:** Cache the handle once (`const db = await openDB();`) and reuse it for both `contains` checks.

### IN-03: `crashlog.js` `getEntries` mirror-fallback only triggers on empty IDB, never merges

**File:** `assets/crashlog.js:195-218`

**Issue:** `getEntries` merges the mirror only when IDB returns zero entries (`list.length === 0 && mirror.length > 0`). If IDB has 1 stale entry but the mirror holds 5 fresher ones (a partial-failure window), the 4 mirror-only entries are dropped from the report. This is an acceptable simplification given the mirror is a crash-survival backstop, but combined with CR-01 it means there is no read path that reconstructs a truncated IDB log from the mirror. Worth a comment or a true merge-and-dedupe once CR-01 is fixed.

**Fix:** When CR-01 is addressed with a real merge, reuse that merge in `getEntries` so reads and writes share one dedupe path.

---

_Reviewed: 2026-06-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
