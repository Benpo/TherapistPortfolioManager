---
phase: 37-date-consistency-date-format-setting-f6-f5
reviewed: 2026-07-03T10:30:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - assets/date-format.js
  - assets/app.js
  - assets/overview.js
  - assets/backup.js
  - assets/pdf-export.js
  - assets/export-modal.js
  - assets/add-client.js
  - assets/add-session.js
  - assets/settings.js
  - assets/settings-session-types.js
  - assets/settings-snippets.js
  - sw.js
  - add-session.html
  - add-client.html
  - settings.html
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: issues_found
---

# Phase 37: Code Review Report

**Reviewed:** 2026-07-03T10:30:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 37 correctly fixes the UTC-midnight off-by-one at every call site: `parseLocal` regex-extracts the leading `YYYY-MM-DD` and constructs a LOCAL `Date(y, m-1, d)`, replacing all raw `new Date("YYYY-MM-DD")` calls in overview.js, add-client.js, add-session.js (three age-calculation locations), and the session-date default. The new `DateFormat` engine, `formatSessionType`/`getSessionTypes` in app.js, and the `settings-session-types.js` IIFE are well-structured. XSS surface is correctly closed — no innerHTML in the session-type editor.

One prior-session hypothesis (settings.html missing the date-format.js script tag) is a **false positive**: settings.html line 354, index.html line 344, add-session.html line 586, and add-client.html all correctly load `date-format.js` before `app.js`.

Five issues need attention before this ships: a backup restore fidelity gap (null format/sessionTypes not cleared on target), double DOM rebuild per mutation, no dup-check on locked-type renames, missing cross-tab dateformat relay, and an unguarded `window.DateFormat` reference in two App functions.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Double `renderTypeList()` per mutation in settings-session-types.js

**File:** `assets/settings-session-types.js:308-309, 327-329, 345-346`

**Issue:** Every mutation path calls `persist(types)` which dispatches `CHANGED_EVENT` synchronously. Because `CustomEvent` dispatch is synchronous in browsers, the `document.addEventListener(CHANGED_EVENT, renderTypeList)` listener registered in `boot()` fires immediately inside `persist()`, executing a full DOM rebuild of the type list. Control then returns to the caller (`commitRename`, `addCustomType`, `deleteType`), which calls `renderTypeList()` explicitly a second time. Every save triggers two complete list rebuilds in immediate succession.

Specific locations:
- `commitRename` lines 308–309: `persist(types)` then `renderTypeList()`
- `addCustomType` lines 327, 329: `persist(types)` then `renderTypeList()`
- `deleteType` lines 345–346: `persist(types)` then `renderTypeList()`

**Fix:** Remove the explicit `renderTypeList()` calls that follow `persist(types)`. The event listener already handles the re-render. The `showToast` call (in `commitRename` / `addCustomType`) must remain.

```js
// commitRename — after the if/else block:
persist(types);
// renderTypeList(); ← DELETE THIS LINE
showToast("settings.sessionTypes.savedToast");

// addCustomType:
persist(types);
input.value = "";
// renderTypeList(); ← DELETE THIS LINE
showToast("settings.sessionTypes.savedToast");

// deleteType:
types.custom.splice(idx, 1);
persist(types);
// renderTypeList(); ← DELETE THIS LINE
return true;
```

---

### WR-02: Backup restore silently skips resetting `dateFormat` and `sessionTypes` when source used defaults

**File:** `assets/backup.js:1235-1240`

**Issue:** The backup manifest stores `localStorage.getItem("portfolioDateFormat")` (line 621) and `localStorage.getItem("portfolioSessionTypes")` (line 622). When the source device uses the default 'auto' format (never changed), `getItem` returns `null` and the manifest stores `dateFormat: null`. On restore, the guard:

```js
if (manifest.settings.dateFormat) {   // null is falsy → SKIPPED
  localStorage.setItem("portfolioDateFormat", manifest.settings.dateFormat);
}
```

silently skips the restore. If the target device had `portfolioDateFormat = "mm/dd/yyyy"`, it retains that format after restoring a backup from a source device that used the default 'auto'. The same gap applies to `sessionTypes: null` — a target device's custom session types survive a restore from a backup made on a source that never customized types. The comment at line 619 ("Guarded restores below handle older backups that lack these fields") documents the intent for ABSENT fields, but null-valued fields in new backups are silently treated the same as absent fields in old backups.

**Fix:** Distinguish "field absent" (old backup, backward-compat skip) from "field null" (new backup, source used default, should reset):

```js
// dateFormat
if ('dateFormat' in manifest.settings) {
  if (manifest.settings.dateFormat) {
    localStorage.setItem("portfolioDateFormat", manifest.settings.dateFormat);
  } else {
    // source used the default (null) — reset target so it matches
    localStorage.removeItem("portfolioDateFormat");
  }
}
// sessionTypes
if ('sessionTypes' in manifest.settings) {
  if (manifest.settings.sessionTypes) {
    localStorage.setItem("portfolioSessionTypes", manifest.settings.sessionTypes);
  } else {
    localStorage.removeItem("portfolioSessionTypes");
  }
}
```

---

### WR-03: No duplicate-label guard on locked-type renames

**File:** `assets/settings-session-types.js:277-284`

**Issue:** The `commitRename` function applies a case-insensitive duplicate check only for custom types (lines 296–304). The locked-type branch (lines 277–284) stores the override directly without checking whether the new label already matches any other type's current label:

```js
if (locked) {
  if (label === "") {
    delete types.overrides[key];
  } else {
    types.overrides[key] = label;   // no dup check
  }
}
```

A user can rename "Clinic" to "Online", producing two displayed entries both labeled "Online". The data keys remain distinct (`clinic` vs `online`), so no records are corrupted, but the displayed list becomes ambiguous: both rows look identical. The `existingLabelsLower` helper already resolves all locked labels correctly — it just isn't called on the locked rename path.

**Fix:** Apply the same guard before storing a locked override:

```js
if (locked) {
  if (label === "") {
    delete types.overrides[key];
  } else {
    // Dup check: build existing labels, remove the current key's own label first
    var selfLabel = String(resolveLabel(key, types, true)).toLowerCase();
    var selfRemoved = false;
    var others = existingLabelsLower(types).filter(function (l) {
      if (!selfRemoved && l === selfLabel) { selfRemoved = true; return false; }
      return true;
    });
    if (others.indexOf(label.toLowerCase()) >= 0) {
      showToast("settings.sessionTypes.add.invalid");
      renderTypeList();
      return;
    }
    types.overrides[key] = label;
  }
}
```

---

### WR-04: `portfolioDateFormat` changes have no cross-tab relay

**File:** `assets/app.js:719-729`

**Issue:** The `initCommon` storage event listener (lines 719–729) relays `portfolioSessionTypes` changes to peer tabs via `app:session-types-changed`. There is no equivalent relay for `portfolioDateFormat`. When the user changes the date format on the settings page, the native `storage` event fires in all other open tabs, but nothing re-renders dates there. A user with the overview tab open alongside the settings tab would see stale date format on the overview page until a page reload or navigation. `App.formatDate` reads localStorage on every call (correctly), but there is no re-render trigger in peer tabs.

Compare: `portfolioSessionTypes` gets full cross-tab sync. `portfolioDateFormat` is explicitly mentioned as the parallel scalar in the code comments yet lacks the symmetric treatment.

**Fix:** Add a `portfolioDateFormat` branch in the storage event handler:

```js
window.addEventListener("storage", function (e) {
  if (e && e.key === "portfolioSessionTypes") {
    try {
      document.dispatchEvent(new CustomEvent("app:session-types-changed"));
    } catch (_) { /* ignore */ }
  }
  if (e && e.key === "portfolioDateFormat") {
    try {
      document.dispatchEvent(new CustomEvent("app:dateformat", {
        detail: { format: e.newValue || "auto" }
      }));
    } catch (_) { /* ignore */ }
  }
});
```

Note: display pages will also need to listen for `app:dateformat` and trigger a date re-render when it fires, but that is a forward-compat wiring decision already acknowledged in the codebase.

---

### WR-05: `App.formatDate` and `downloadJSON` call `window.DateFormat` without a null guard

**File:** `assets/app.js:968, 1044`

**Issue:** Both functions access `window.DateFormat` unconditionally:

```js
// line 968
function formatDate(dateString) {
  return window.DateFormat.format(dateString, window.DateFormat.getPreference(), currentLang);
}

// line 1044
a.download = `portfolio-backup-${window.DateFormat.todayLocalISO()}.json`;
```

If `date-format.js` fails to load for any reason (script 404, network error on first visit before the service worker caches it), both calls throw `TypeError: Cannot read properties of undefined (reading 'format')` and `(reading 'todayLocalISO')` respectively, crashing all date display and the JSON export.

By contrast, `pdf-export.js` applies a defensive guard pattern:
```js
var DF = (typeof window !== 'undefined') ? window.DateFormat : null;
if (DF && typeof DF.format === 'function') {
  return DF.format(sessionDate, DF.getPreference(), uiLang);
}
return String(sessionDate); // graceful pass-through
```

`App.formatDate` is called from at least overview.js, add-session.js, and export-modal.js. An unguarded crash there would break every date visible in the app.

**Fix:** Match the defensive pattern used in pdf-export.js:

```js
function formatDate(dateString) {
  var DF = window.DateFormat;
  if (DF && typeof DF.format === 'function') {
    return DF.format(dateString, DF.getPreference(), currentLang);
  }
  return dateString ? String(dateString) : '';
}
```

For `downloadJSON`, fall back to the local-getter pattern already used in `_assembleBackupZip` (backup.js lines 633–638):

```js
var dateStr = (window.DateFormat && window.DateFormat.todayLocalISO)
  ? window.DateFormat.todayLocalISO()
  : (function() { var t = new Date(); return t.getFullYear() + '-' + String(t.getMonth()+1).padStart(2,'0') + '-' + String(t.getDate()).padStart(2,'0'); })();
a.download = `portfolio-backup-${dateStr}.json`;
```

---

## Info

### IN-01: Invisible Unicode characters U+2066/U+2069 in date-format.js source

**File:** `assets/date-format.js:34-35`

**Issue:** The LRI and PDI directional isolate characters are embedded as literal invisible characters in the source string assignments. The comment correctly identifies them (U+2066 / U+2069) and the behavior is intentional per D-07, but the characters are not visible in most editors or code review tools. An auditor cannot verify the value without a hex dump.

**Fix:** Replace the literal characters with Unicode escape sequences, which are transparent to all reviewers:
```js
var LRI = '⁦'; // U+2066 LEFT-TO-RIGHT ISOLATE
var PDI = '⁩'; // U+2069 POP DIRECTIONAL ISOLATE
```

---

### IN-02: Session-type constants duplicated between app.js and settings-session-types.js

**File:** `assets/app.js` (DEFAULT_TYPE_I18N, SESSION_TYPE_ORDER), `assets/settings-session-types.js:51-57` (DEFAULT_TYPE_I18N, LOCKED_DEFAULTS)

**Issue:** The i18n key map and the ordered list of the five default session types are defined identically in both IIFEs. Both are private to their IIFE scope. If a sixth built-in type is added in a future phase, both files must be updated in sync or the two editors will diverge silently.

**Fix:** Expose the canonical order via `window.App.SESSION_TYPE_ORDER` (mirroring `App.getSessionTypes`), and have settings-session-types.js read from there. No action needed before this phase ships; log as technical debt.

---

### IN-03: `app:dateformat` custom event dispatched but has no registered consumers

**File:** `assets/settings.js:860`

**Issue:** The Personalization IIFE dispatches `app:dateformat` on format change and the code comment calls it a "forward-compat live-re-render hook." No file in the reviewed set registers a listener for this event. The format IS applied correctly on every call to `App.formatDate` (it reads localStorage synchronously), and navigating between pages applies the new format, so the absence of a consumer is not currently user-visible. However, the dispatched event is a dead signal today and may mislead a future implementor who searches for its consumers.

**Fix:** No immediate code change required. When WR-04's cross-tab relay is implemented, the receiving tabs should fire this same event so overview.js and add-session.js can subscribe to it for live re-rendering.

---

_Reviewed: 2026-07-03T10:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
