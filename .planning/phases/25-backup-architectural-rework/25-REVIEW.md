---
phase: 25-backup-architectural-rework
reviewed: 2026-05-15T10:42:56Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - assets/add-client.js
  - assets/app.css
  - assets/app.js
  - assets/backup.js
  - assets/crop.js
  - assets/db.js
  - assets/i18n-cs.js
  - assets/i18n-de.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/overview.js
  - assets/settings.js
  - index.html
  - settings.html
findings:
  critical: 3
  warning: 7
  info: 5
  total: 15
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-05-15T10:42:56Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 25 reshapes the backup UX end-to-end: a new header cloud icon, a unified Backup & Restore modal, the Test-backup-password dry-run, schedule-coupled state colors, dedicated Backups + Photos settings tabs, and resize-on-upload. The cryptographic core (AES-256-GCM + PBKDF2 310k) is unchanged and the encrypt-then-share contract correctly forwards the encrypted blob to `BackupManager.shareBackup` (D-04 closed).

Three correctness defects justify BLOCKER status:

- **CR-01 (BLOCKER):** `BackupManager.checkBackupSchedule` advances the 1-hour debounce key BEFORE checking whether `window.openBackupModal` is reachable. On every page that loads `app.js` but not `overview.js` (i.e., `settings.html`, `add-client.html`, `add-session.html`, etc.), the schedule fire silently no-ops AND consumes the debounce, suppressing the next attempt on `index.html` for an hour. Users whose first foreground tick after the interval lapses lands on any non-overview page will routinely miss their scheduled reminder.

- **CR-02 (BLOCKER):** `importBackup` filters `manifest.therapistSettings` through a 9-item whitelist that does NOT include `snippetsDeletedSeeds`. Combined with `clearAll`'s reset of `_seedingDone`, every restore re-populates seed snippets the user explicitly deleted before exporting. Existing user-state lost on restore — silent data regression.

- **CR-03 (BLOCKER):** Multiple Hebrew strings rendered from Phase 25 surfaces use masculine-singular imperative verbs ("השתמש" / "פתח"), violating the project's stated gender-neutral phrasing rule for the Hebrew locale. These keys ship today and are visible to female therapists (the primary HE audience for the app).

Warnings cover localization-tone misses on imperative phrasing, hardcoded English error toasts in three failure paths, an `err.name` access without null-check, a stale `is-hidden` reuse that conflicts with the `[hidden]` attribute pattern, an unused `data-i18n-aria-label` attribute the framework does not understand, and the `portfolioAutoBackupEnabled` localStorage flag being permanently set yet never read.

The four locale files (i18n-en/he/de/cs) have identical key sets (483 each) — parity is clean.

## Critical Issues

### CR-01: `checkBackupSchedule` advances debounce key on pages that cannot open the modal

**File:** `assets/backup.js:1300-1336`
**Issue:** `checkBackupSchedule` writes `localStorage.portfolioBackupSchedulePromptedAt = now` (line 1324) BEFORE checking `typeof window.openBackupModal === 'function'` (line 1332). `window.openBackupModal` is defined only in `assets/overview.js`, which is loaded only on `index.html` (and `demo.html`). On every other page that calls `initCommon` (settings.html, add-client.html, add-session.html, sessions.html, reporting.html, etc.) the `app.js` `initCommon` invokes `checkBackupSchedule`, the timestamp advances, and the `try/catch` swallows the missing-function branch. Net behavior: the schedule fire frequently sets the 1-hour debounce on a page that has no modal markup to open, suppressing the prompt the next time the user navigates to overview.

In practice: a user with `daily` schedule opens the app on settings.html in the morning after the daily interval expires → the prompt silently no-ops; the 1-hour debounce activates; the user navigates to overview within the hour but sees no reminder.

**Fix:** Gate the timestamp write on a successful open, OR redirect to `index.html?openBackup=1` when the modal markup isn't present on the current page (mirroring the cloud-icon click handler at `assets/app.js:475-481`).

```js
// Replace the trailing block at backup.js:1318-1335 with:
var lastPromptKey = 'portfolioBackupSchedulePromptedAt';
var lastPrompt;
try { lastPrompt = Number(localStorage.getItem(lastPromptKey)) || 0; }
catch (_) { lastPrompt = 0; }
if (now - lastPrompt < 60 * 60 * 1000) return;

var opened = false;
try {
  if (typeof window !== 'undefined' && typeof window.openBackupModal === 'function') {
    window.openBackupModal();
    opened = true;
  } else if (typeof window !== 'undefined' && window.location &&
             !/index\.html$/.test(window.location.pathname) &&
             window.location.pathname !== '/') {
    // Modal markup only ships on overview — route there with auto-open hint.
    window.location.href = './index.html?openBackup=1';
    opened = true;
  }
} catch (_) {}

// Only consume the debounce when we actually surfaced (or routed to) the prompt.
if (opened) {
  try { localStorage.setItem(lastPromptKey, String(now)); } catch (_) {}
}
```

---

### CR-02: Backup restore re-seeds previously-deleted snippets (silent data regression)

**File:** `assets/backup.js:994-1025`
**Issue:** `importBackup`'s `ALLOWED_KEYS` whitelist contains only the 9 user-customizable section keys (`trapped`, `insights`, …, `nextSession`). The therapistSettings store ALSO holds a sentinel record at `sectionKey: "snippetsDeletedSeeds"` (used by `db.js:_setDeletedSeedIds` / `_getDeletedSeedIds`) that records which seed snippets the user has deleted. On restore:

1. `clearAll()` wipes the therapistSettings store AND resets `_seedingDone = false` (db.js:571-572).
2. The therapistSettings loop sees `snippetsDeletedSeeds` in the manifest but skips it because the key is not in `ALLOWED_KEYS` (line 1011 — logs a "ignoring unknown sectionKey" warning).
3. The next `openDB()` call inside the snippet-restore loop triggers `seedSnippetsIfNeeded`, which reads an empty deleted-ids set and re-seeds the FULL seed pack.
4. The manifest's `snippets` array does NOT include the deleted seeds (the user deleted them, so they're not in the snippets store at export time and not exported).

Net: the user loses the "I deleted these seed snippets" preference every time they restore from any backup. The very feature the seed-pack delete is supposed to provide (a way to opt out of seed snippets that don't match your modality) is wiped by routine disaster-recovery flow.

The export side (`getAllTherapistSettings`) DOES export the sentinel — the regression is import-only.

**Fix:** Add the sentinel key to the whitelist and use a separate write path so it isn't filtered through the customLabel/enabled coercion that `setTherapistSetting` applies.

```js
// In assets/backup.js around line 994, separate the sentinel from the section list:
var ALLOWED_SECTION_KEYS = [
  "trapped", "insights", "limitingBeliefs", "additionalTech",
  "heartShield", "heartShieldEmotions", "issues", "comments", "nextSession",
];
var ALLOWED_SENTINEL_KEYS = new Set(["snippetsDeletedSeeds"]);

for (var k = 0; k < manifest.therapistSettings.length; k++) {
  var rec = manifest.therapistSettings[k];
  if (!rec || typeof rec !== "object" || typeof rec.sectionKey !== "string") {
    console.warn("Backup restore: skipping malformed therapistSettings row", rec);
    continue;
  }
  if (ALLOWED_SENTINEL_KEYS.has(rec.sectionKey)) {
    // Sentinel row — preserve verbatim shape (deletedIds array).
    try {
      var deletedIds = Array.isArray(rec.deletedIds) ? rec.deletedIds.filter(
        function (id) { return typeof id === "string"; }
      ) : [];
      await db._writeTherapistSentinel({ sectionKey: rec.sectionKey, deletedIds: deletedIds });
    } catch (e) {
      console.warn("Backup restore: sentinel write failed", rec.sectionKey, e);
    }
    continue;
  }
  if (ALLOWED_SECTION_KEYS.indexOf(rec.sectionKey) === -1) {
    console.warn("Backup restore: ignoring unknown sectionKey", rec.sectionKey);
    continue;
  }
  // ... existing customLabel/enabled coercion path ...
}
```

(Or, simpler: expose a small public helper on `PortfolioDB` that writes a raw therapistSettings record, and call it for the sentinel.) Also relocate the snippet-restore loop to run AFTER the sentinel write so `seedSnippetsIfNeeded` (triggered by the openDB call in the snippet-write loop) sees the restored deleted-ids list.

---

### CR-03: Hebrew strings rendered from Phase 25 surfaces use masculine-singular imperatives

**File:** `assets/i18n-he.js:271, 285`
**Issue:** The phase brief calls out Hebrew (he) gender-neutral phrasing as a release blocker. Two strings visible on Phase 25 surfaces use masculine-singular imperative verbs that are not gender-neutral:

- Line 285 `backup.passphrase.tooSimple`: `"הסיסמה פשוטה מדי. השתמש בשילוב של אותיות ומספרים."` — "השתמש" is masculine-singular imperative ("[you, masc] use!"). This message is reachable through the new passphrase modal (`assets/backup.js:_showPassphraseModal` reject branch).
- Line 271 `security.persistent.body`: `"...השתמש בגיבויים מוצפנים ונעל את המכשיר שלך..."` — both "השתמש" (use) and "נעל" (lock) are masculine-singular imperative. This message is rendered on every page via `App.initPersistentSecuritySection` and is co-localized with the new backup messaging.

The convention elsewhere in this file uses gender-neutral forms — `overview.missingBirth.notice` (line 56) uses `"פתח/י"` (the slash form), and the Phase 25-introduced photos/schedule strings consistently use passive/infinitive constructions ("נא לאשר", "להכיל", "לבחור"). The two flagged strings predate Phase 25 but they sit immediately adjacent to Phase-25 copy in the user's flow, so the inconsistency is amplified.

**Fix:** Rewrite the two strings in a passive/infinitive register matching the rest of the file.

```js
// Line 271:
"security.persistent.body": "כל הנתונים שלך נשמרים רק בדפדפן הזה — שום דבר לא נשלח לשרת כלשהו. מחיקת נתוני הדפדפן או הסרת האפליקציה מוחקת את כל הרשומות לצמיתות. מומלץ להשתמש בגיבויים מוצפנים ולנעול את המכשיר כדי להגן על הפרטיות של הלקוחות שלך.",

// Line 285:
"backup.passphrase.tooSimple": "הסיסמה פשוטה מדי. מומלץ להשתמש בשילוב של אותיות ומספרים.",
```

(Both swap `השתמש`/`נעל` for the infinitive `להשתמש`/`לנעול`, prefixed by `מומלץ` to preserve the recommendation tone without imposing a gendered command.)

While in the file, also audit `backup.passphrase.warningEncrypt` (line 277, `"יש להזין..."`) and `backup.passphrase.warningDecrypt` (line 278) — those already use the passive `יש ל...` construction, so they're fine; flagged only for completeness.

## Warnings

### WR-01: Hardcoded English error toasts in Photos / Settings save paths

**File:** `assets/settings.js:521, 2385, 2413, 2458`
**Issue:** Four user-visible error toasts pass English strings as `App.showToast`'s first (literal) argument with an empty `key` second argument. The first argument is rendered verbatim — no i18n lookup. Hebrew/German/Czech users on the only paths these can fire (CropModule not loaded, optimize-loop throw, delete-loop throw, settings save throw) see English regardless of `portfolioLang`.

Hits:
- `settings.js:521` — `App.showToast("Save failed", "")` (Save handler catch — therapist settings page).
- `settings.js:2385` — `App.showToast('Optimize is unavailable — photo helpers not loaded', '')`.
- `settings.js:2413` — `App.showToast('Could not optimize photos', '')`.
- `settings.js:2458` — `App.showToast('Could not delete photos', '')`.

**Fix:** Add i18n keys for each and switch to the keyed-second-arg form. Recommended key names: `settings.save.failed`, `photos.optimize.unavailable`, `photos.optimize.failed`, `photos.deleteAll.failed`. Then in each call:

```js
App.showToast('', 'settings.save.failed');
App.showToast('', 'photos.optimize.unavailable');
// etc.
```

---

### WR-02: `err.name` access without null-check in importBackup decrypt path

**File:** `assets/backup.js:909-915`
**Issue:** Inside the .sgbackup decrypt branch, the catch handler reads `err.name === 'OperationError'` without first verifying `err` is an object. If `_decryptBlob` or its downstream awaited promise resolves to a thrown non-Error value (`throw null`, `throw "wrong password"`, or a Symbol from a corrupt File handle), the property access throws a TypeError, which then bubbles up uncaught from the async onConfirm callback into the surrounding Promise constructor and is lost — the user sees an indefinite spinner because neither `resolve` nor `reject` ever runs.

Compare with the better-shaped catch in `testBackupPassword` (line 829-834) and other guards in this file that use `err && err.name === ...`.

**Fix:**

```js
} catch (err) {
  if (err && err.name === 'OperationError') {
    reject(new Error(_t('backup.passphrase.wrongPassphrase')));
  } else {
    reject(err);
  }
}
```

---

### WR-03: `schedulePasswordCallout` reuses `.backup-reminder-banner` styling for a different semantic

**File:** `settings.html:171`
**Issue:** The Settings → Backups password callout uses `class="backup-reminder-banner schedule-password-callout"`. `.backup-reminder-banner` is the styling class for the OLD 7-day reminder banner that lives at the top of every page (defined in `app.css`, applied by `app.js:showBackupBanner`). Reusing it here couples two unrelated UI elements: if Plan-05-followup work tunes the reminder banner (e.g., adds a slide-in animation, changes background hue for the "danger" timing), the schedule callout in Settings will animate/repaint along with it.

Additionally, the reminder banner has `role="alert"` semantics with assistive tech, while the callout uses `role="note"` — re-painting one will not break the other functionally, but the visual-style coupling will cause confusion in future maintenance.

**Fix:** Drop `.backup-reminder-banner` from this element and add a dedicated styling class for the callout (or rely on `.schedule-password-callout` + new CSS rules).

```html
<div class="schedule-password-callout" id="schedulePasswordCallout" role="note">
```

---

### WR-04: `data-i18n-aria-label` attribute is set but the framework never reads it

**File:** `settings.html:98-99`
**Issue:** The settings-saved-notice close button carries `data-i18n-aria-label="settings.saved.dismiss"`, but `App.applyTranslations` (assets/app.js:23-32) only processes `data-i18n` and `data-i18n-placeholder`. The aria-label gets its initial value from the static `aria-label="Dismiss"` attribute and is never re-translated on language switch. Hebrew/German/Czech users with screen readers will hear "Dismiss" regardless of locale.

This attribute is not new in Phase 25 (the notice predates this phase), but it's reachable from the post-save flow that Phase 25 touches and is worth fixing now that backup/schedule i18n is being audited.

**Fix:** Either remove the dead attribute, or extend `applyTranslations`:

```js
// In assets/app.js applyTranslations() add:
root.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
  const key = el.getAttribute("data-i18n-aria-label");
  el.setAttribute("aria-label", t(key));
});
```

Then translation key `settings.saved.dismiss` (already present in all four locale files? — verify before deciding) will resolve correctly. If the key doesn't exist yet, prefer removing the attribute.

---

### WR-05: `_savedDirHandle` resets each session but `portfolioAutoBackupEnabled` persists forever

**File:** `assets/backup.js:19, 1081-1105`
**Issue:** `_savedDirHandle` is a module-scoped `let` reset to `null` on every page load (script re-evaluation). `pickBackupFolder` sets `localStorage.setItem("portfolioAutoBackupEnabled", "true")` (line 1096), but no code path ever reads `portfolioAutoBackupEnabled` again. Combined with `isAutoBackupActive() => _savedDirHandle !== null` (line 1082), the localStorage flag has no observable effect.

User-visible consequence: in Settings → Backups, after picking a folder the `portfolioBackupFolderName` UI hint persists across reloads (settings.js:1948-1957 reads it), but `BackupManager.isAutoBackupActive()` returns `false` after every reload. The "auto-save" actually only fires within the same page load as the folder pick. Users will see "Folder: backups — Re-pick" in Settings but no file will be written automatically on export.

This is technically by design per D-20 (handles are non-persistable), but the leftover localStorage write makes the design intent murky and primes future code to do the wrong thing.

**Fix:** Delete the `localStorage.setItem("portfolioAutoBackupEnabled", "true")` write (line 1096) — it's dead. Optionally remove the key on `pickBackupFolder` rejection so a previously-set "true" doesn't linger.

If the design DOES intend to ask the user to re-pick on each session, surface that via a notice in Settings → Backups when `portfolioBackupFolderName` is set but the handle is null — currently the UI just shows the stale name without explaining why auto-save isn't running.

---

### WR-06: `getAllTherapistSettings` exports the seed-deletion sentinel but `importBackup` drops it (companion to CR-02)

**File:** `assets/backup.js:545-554, 994-1004`
**Issue:** Same root cause as CR-02, separately worth flagging as a quality defect. `exportBackup` calls `db.getAllTherapistSettings()` which returns ALL rows from the therapistSettings store, including the `snippetsDeletedSeeds` sentinel and the schema-validation-test seed-deleted records. These are serialized into `manifest.therapistSettings` and persist into the backup. The export-side comment promises "custom section labels + disabled flags", which is misleading.

**Fix:** Either accept that the store is a kitchen-sink and document it, OR add a public `db.getAllSectionSettings()` that returns only the 9 section rows. Tightening the export side AND the import side together avoids the silent loss in CR-02.

---

### WR-07: `resizeToMaxDimension` re-encodes to JPEG even when source is already smaller than `maxEdge`

**File:** `assets/crop.js:209-248`
**Issue:** When the source image's longest edge is already ≤ `maxEdge`, `scale` becomes `1`, the resize hints are skipped (line 228), but the function still proceeds to re-decode via `createImageBitmap`, redraw onto a canvas, and re-encode as JPEG at the supplied quality. For a small input (e.g., a 200×200 PNG icon), this round-trips through JPEG compression unnecessarily AND drops the alpha channel.

The Settings → Photos optimize-all loop guards against bloat ("only persist when smaller" at settings.js:2204), but the add-client upload path at `assets/add-client.js:79` accepts the resized blob unconditionally. A user uploading a small PNG portrait gets a JPEG-encoded version with a black background.

Strip-EXIF-via-canvas is intentional (the resize comment cites threat T-25-06-01), but doing so by JPEG-encoding a small PNG is a UX regression.

**Fix:** Short-circuit when no resize is needed: if `scale >= 1` AND the input is already JPEG, return the original blob (still strips EXIF only if the user opted in elsewhere — but for already-small JPEGs the EXIF was already stripped on a previous edit if applicable). Or detect alpha and emit PNG instead of JPEG. Minimal fix:

```js
if (scale >= 1 && blob.type === 'image/jpeg') {
  return blob; // already within bounds and not encoded loss-twice — return as-is.
}
```

(This trades off the EXIF strip for the no-op case. If EXIF strip is the priority on every path, leave the code as-is but add a comment explaining the deliberate re-encoding.)

## Info

### IN-01: `recropBtn` listener registers even when there's no photo to recrop

**File:** `assets/add-client.js:26-41`
**Issue:** The recrop click handler is registered unconditionally; inside it, the `if (photoData)` check prevents misuse, but the listener fires on every click of a button that's been hidden (`is-hidden`) until a photo exists. Defensive but redundant. Not user-visible.

**Fix:** Wire the listener only after the first photo is loaded, OR keep the current shape and add a `disabled` attribute when `photoData` is empty so click-as-keyboard-focus is rejected too.

---

### IN-02: `dataURLToBlob` does no bounds checking on malformed data URLs

**File:** `assets/settings.js:2125-2134`
**Issue:** `dataURLToBlob` assumes the input is a well-formed `data:...;base64,XXX` URL. If `commaIdx === -1` (no comma), `dataURL.slice(commaIdx + 1)` returns the whole string and `atob` throws. The optimize-loop wraps each iteration in a try/catch (settings.js:2210-2212), so a malformed photoData is counted as a "failed" photo rather than crashing the whole loop — acceptable but the failure mode is silent (no log, no user-facing detail).

**Fix:** Add a comma check + log:

```js
function dataURLToBlob(dataURL) {
  var commaIdx = dataURL.indexOf(',');
  if (commaIdx < 0) throw new Error('Not a data URL');
  // ... rest of function ...
}
```

---

### IN-03: Magic numbers for relative-time thresholds in `formatRelativeTime`

**File:** `assets/overview.js:31-37`
**Issue:** `dayMs`, `hourMs`, `minMs` are recomputed every call. They're also duplicated in `backup.js:1186-1188` (`SCHEDULE_INTERVAL_MS`) and `app.js:941` (`sevenDays = 7 * 24 * 60 * 60 * 1000`). A single shared constant would reduce drift risk.

**Fix:** Extract to a shared util module (or to `App.TIME_MS = { day, hour, minute }`) and import from one place.

---

### IN-04: `db.js:567 — `objectStoreNames.contains("snippets")` check inside `clearAll` is dead code

**File:** `assets/db.js:567-569`
**Issue:** Since DB_VERSION is 5 and migration 5 always creates the snippets store (db.js:257-268), every successfully-opened DB will contain the "snippets" store. The defensive `if` branch only matters during a partial-failed upgrade — a transient state that should not reach `clearAll` (which is called from the imported backup flow after DB open). Harmless but misleading.

**Fix:** Drop the conditional and always call `await clearStore("snippets");`. (Optional — keep if there's an upgrade-path scenario you don't want to revisit.)

---

### IN-05: `console.log` in db.js migration paths

**File:** `assets/db.js:81, 145`
**Issue:** Two `console.log` calls in `migrateOldDB` log successful migration outcomes to the browser console. These are diagnostic prints that will show up in every user's devtools (even if they never open it). The error-path uses `console.error` and the warn-path uses `console.warn` — using `console.log` for success-path output is the odd one out and might appear noisy in long-running sessions on Chrome (which keeps console history).

**Fix:** Demote to `console.debug` or remove entirely — these messages don't help end users and were intended for the migration test window.

---

_Reviewed: 2026-05-15T10:42:56Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
