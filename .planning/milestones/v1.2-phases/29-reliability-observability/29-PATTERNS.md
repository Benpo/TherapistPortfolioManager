# Phase 29: Reliability & Observability - Pattern Map

**Mapped:** 2026-06-22
**Files analyzed:** 7 (4 new, 3 modified)
**Analogs found:** 7 / 7 (every new file has a strong in-repo analog — this is a mature ~28-phase PWA)

> Zero-build, zero-npm, IIFE-global, IndexedDB-only, **zero network calls**, 4 languages (EN/HE/DE/CS) RTL-safe. Every pattern below already honors these constraints. Do **not** introduce npm packages, build steps, `fetch`/XHR, or `data-i18n` on the pre-i18n failure surface.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `assets/crashlog.js` (NEW) — OBS-01 capture module | utility / module | event-driven (global error handlers) + IndexedDB+localStorage write | `assets/version.js` (early multi-page IIFE-global) + `assets/db.js` `DB_STRINGS`/`dbStr` | exact (two-analog blend) |
| `assets/report.js` (NEW) — OBS-02 report screen logic | controller / view | transform + clipboard + `mailto:` request-response | `assets/backup.js` (`exportBackup`, `shareBackup` mailto) + `assets/add-session.js` `copyTextToClipboard` | exact |
| OBS-03 escape hatch (NEW; extends `assets/db.js`) | view + utility | event-driven (failure path) + IndexedDB destructive op | `assets/db.js` `showDBMigrationError()` + `assets/version.js` `buildNudge()` | exact |
| Read-only/versioned DB-open helper for export-around-failure (NEW; in `db.js`) | utility | file-I/O / DB read | `assets/db.js` old-DB read-only open (`db.js:86–96`) | role+flow match |
| `assets/db.js` (MODIFY) — replace dead-end banner, add reset+read-only-open | utility | — | self (in-file) | n/a |
| `assets/settings.js` (MODIFY) — "Report a problem" entry row | view | request-response (navigation) | `assets/settings.js` `renderRow()` `.settings-row` | exact (self-pattern) |
| `report.html` or modal in existing page (NEW; Open Q1) — OBS-02 surface | template | — | existing app chrome + `.modal-card` family | role match |

---

## Pattern Assignments

### `assets/crashlog.js` (OBS-01 — capture module, event-driven)

**Analog A — early multi-page IIFE-global wiring:** `assets/version.js`
**Analog B — pre-i18n 4-language strings:** `assets/db.js:153–188`

This module must install `window.onerror` + `unhandledrejection` handlers and load **before any other script can throw**, on all ~20 pages. Page script order (verified, `settings.html:303–333`) is: i18n bundles → `i18n.js` → `snippets-seed.js` → `db.js` → `version.js` → `shared-chrome.js` → `app.js` → … `backup.js` → `settings.js`. `version.js` is the established "load early on every page" precedent. **Recommendation for planner:** install the global handlers as early as possible — ideally an inline `<script>` at the top of `<head>` (the `settings.html:4–10` inline blocks run first) registering minimal handlers that buffer to `localStorage`, with the full `crashlog.js` IIFE attaching richer capture once loaded. The handlers must catch errors thrown by scripts that load after them.

**IIFE-global + dual-scope export pattern** (`version.js:22`, `314–337`):
```javascript
var CrashLog = (function() {
  'use strict';
  // ... module body, pure where possible, NO network ...
  var exported = { logError: logError, getEntries: getEntries, /* ... */ };
  (typeof self !== 'undefined' ? self
    : typeof globalThis !== 'undefined' ? globalThis
    : this).CrashLog = exported;
  return exported;
})();
```
Use the `window`/`self`/`globalThis` triple so the SW scope (no `window`) is safe — same reason `version.js` does it.

**Never-throwing, network-free handler idiom** (every `version.js` function is wrapped — e.g. `readLoadedToken` `:104–107`, `runGenuineRecovery` `:222–224`): wrap all capture logic in `try/catch` with `try { console.warn(...) } catch(e){}` so the crash logger can never itself crash a page. **Zero network** is mandatory (`version.js` header `:19–20`, VER-06).

**Dual storage (D-02)** — primary IndexedDB log + last-N `localStorage` mirror. IndexedDB write reuses the `db.js` store helpers (`addRecord`/`withStore`, `db.js:452–470`). **Critical:** the `localStorage` mirror exists precisely so an IDB-open failure is still captured — the mirror write must NOT route through `openDB()` (which can be the very thing failing). Write the mirror with a plain guarded `localStorage.setItem` (idiom: `version.js:188`, `db.js:185`).

**Retention prune-on-write (D-03)** — ≤30 days AND ≤50 entries, trimmed every append. No timer. Plain array filter + slice before persisting.

**Pre-i18n 4-language string object + accessor** (copy verbatim shape from `db.js:153–188` and `version.js:143–191`):
```javascript
const CRASHLOG_STRINGS = { en: {...}, he: {...}, de: {...}, cs: {...} };
function clStr(key) {
  var lang = 'en';
  try { lang = (typeof localStorage !== 'undefined' && localStorage.getItem('portfolioLang')) || 'en'; } catch (e) {}
  var s = CRASHLOG_STRINGS[lang] || CRASHLOG_STRINGS.en;
  return s[key] || CRASHLOG_STRINGS.en[key] || key;
}
```
Note `db.js` reads `portfolioLang` from `localStorage` (HE → RTL). Hebrew is gender-neutral (Phase 18). HE strings → set `dir="rtl"` defensively (`version.js:250–253`).

**Phase 28 integration contract (D-01 / 28-CONTEXT D-12):** export a stable `CrashLog.logError(entry)` entry point so `version.js`'s integrity self-check can persist the mismatch into the OBS-01 log. The `version.js` `buildNudge` `wedged` branch currently stubs `report.onclick = function(){}` (`version.js:284`) — Phase 29 wires that stub to the OBS-02 report screen, and `recover.onclick` (`:278`) to the OBS-03 hatch.

---

### `assets/report.js` (OBS-02 — report screen, transform + clipboard + mailto)

**Analog:** `assets/backup.js` (mailto handoff) + `assets/add-session.js` (clipboard)

**Clipboard copy — full SecureContext + execCommand fallback** (`add-session.js:738–763`, copy verbatim — carries the full multi-line log per D-06):
```javascript
async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (error) { return false; }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus(); textarea.select();
  try { document.execCommand("copy"); return true; }
  catch (error) { return false; }
  finally { textarea.remove(); }
}
```

**`mailto:` handoff** (`backup.js:797–801`) — short prefilled email, NOT the full log (URL-length limits, D-06). Subject preset; body = "paste your report below this line". Support address `contact@sessionsgarden.app` (UI-SPEC §OBS-02.3):
```javascript
var subject = 'Sessions Garden — problem report';
window.location.href = 'mailto:' + SUPPORT_ADDRESS +
  '?subject=' + encodeURIComponent(subject) +
  '&body=' + encodeURIComponent(body);
```
D-06 degradation: if `mailto:` is unreliable in the installed PWA (field-verify per Phase 28 lesson), drop to copy-only + visible support address.

**Redact-then-preview (D-04):** assemble report → best-effort scrub of client-identifying tokens from messages/stacks → render into an **editable** `<textarea>` (surface `--color-surface-alt`, UI-SPEC) so the user's own eyes are the final gate before paste. Diagnostic context fields (app version via `AppVersion.APP_VERSION`, language, `userAgent`, DB version `db.js:4`, store counts, storage usage) — builder's discretion, all behind the redaction.

**Empty-state** ("No problems logged") per UI-SPEC Copywriting Contract when the log is empty.

---

### OBS-03 Reset & recover escape hatch (replaces `showDBMigrationError`, failure-surface view + destructive DB op)

**Analog A — the banner it replaces:** `assets/db.js:429–450`
**Analog B — multi-action pre-i18n banner with buttons:** `assets/version.js:240–303` (`buildNudge`)
**Analog C — destructive double-confirm dialog:** `app.js:780` (`confirmDialog`)

**Current dead-end (to be replaced)** — `showDBMigrationError()` (`db.js:429–450`) builds `.db-error-banner--migration` (createElement + `textContent`, NEVER innerHTML; `getElementById` duplicate guard; `document.body.prepend`) whose only action is `btn.onclick = () => location.reload()` — which re-runs the same failing migration forever (D-09). Note the migration transaction `abort()`s (`db.js:293`) so **data stays at the old version and is safe** — the reassuring "Your data is safe" copy is literally true.

**Replacement banner** = `db.js` banner skeleton (`:435–449`) extended with the `version.js buildNudge` **multi-button** pattern (`:263–286`): primary "Export backup now" button + the destructive "Reset & recover" affordance. Keep `.db-error-banner--migration` danger band (UI-SPEC red-discipline: the band may use danger; the wipe-confirm dialog is the only red CTA). Reuse `dbStr()` for all copy — add `migrationFailed` next-step keys to `DB_STRINGS` (`db.js:153–182`). This surface may render before `i18n.js` → inline strings only, `dir="rtl"` defensive set (`version.js:250–253`).

**"Export backup now" (D-07)** routes through the **existing interactive** export flow — `exportEncryptedBackup()` (`backup.js:689`, passphrase modal) / `exportBackup()` (`backup.js:550`). Every export is interactive (passphrase, or explicit "Yes, export unprotected" skip-confirm at `backup.js:115–118`) — confirms D-07's "no silent export." **BUT see OBS-03 wrinkle below — the standard path re-opens the broken DB.**

**Hard affirmation gate (D-08):** a `.checkbox-field` (`app.css:1384–1391`) "I have saved a backup I can restore from" keeps the destructive button **disabled** until checked, THEN `App.confirmDialog({ tone: 'danger' })` (`app.js:780`) double-confirm. Make the confirm **extra-emphatic when no export happened this session** — track a session flag (set after a successful export; `backup.js` already records `portfolioLastExport` to `localStorage` at `:659`/`:707`, but use an in-session flag for "this session"). The two confirm copy variants are in UI-SPEC Copywriting Contract.

**The wipe** — only after both gates: `indexedDB.deleteDatabase(DB_NAME)` + `location.reload()` into a fresh DB. `DB_NAME` is `db.js:2`. Precedent for `deleteDatabase`: `db.js:48`, `:80`, `:143`.

`confirmDialog` shape (`app.js:780`) takes i18n keys + `tone` + `placeholders` and drives `#confirmModal`/`.confirm-card`:
```javascript
function confirmDialog({ titleKey, messageKey, confirmKey = "confirm.delete",
  cancelKey = "confirm.cancel", tone = "danger", placeholders = null }) { ... }
```
Note: `confirmDialog` uses `data-i18n` (full-app i18n). The destructive confirm is **Surface A** (runtime, after the user chose to act) so `data-i18n` is acceptable here — only the failure **banner** itself is the pre-i18n Surface B.

---

### Read-only / un-upgraded DB-open helper (OBS-03 wrinkle — file-I/O)

**Analog:** `assets/db.js:85–96` — the migration code's read-only open of the OLD db.

⚠️ **OBS-03 KNOWN WRINKLE (D-09 / CONTEXT "Known wrinkle"):** `exportBackup()` (`backup.js:550`) reads via `window.PortfolioDB.getAllClients()` etc., which route through `openDB()` (`db.js:272`). `openDB()` calls `indexedDB.open(DB_NAME, DB_VERSION)` with `DB_VERSION = 5` (`db.js:4`) — so on a failed-migration device it **re-triggers `onupgradeneeded` and re-runs the same throwing migration**, re-aborting (`db.js:293`). The export path is therefore blocked by the exact failure it's trying to escape.

**Resolution analog — open WITHOUT a version number to get the current (un-upgraded) version, read-only** (`db.js:86–96`, already in the codebase for the old-DB read):
```javascript
const oldDB = await new Promise((resolve, reject) => {
  // Open without specifying a version so we get whatever version it is at
  const req = indexedDB.open(OLD_DB_NAME);     // ← no version arg = no upgrade
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
  req.onupgradeneeded = () => {                 // should not fire; abort defensively
    req.transaction.abort();
    reject(new Error("Unexpected upgradeneeded ..."));
  };
});
// then read-only getAll over whatever object stores exist:
if (!oldDB.objectStoreNames.contains("clients")) return resolve([]);
const tx = oldDB.transaction("clients", "readonly");
const req = tx.objectStore("clients").getAll();
```
**Planner action:** the escape hatch's "Export backup now" should use a **dedicated read-only export path** that opens `sessions_garden` with NO version arg (so the browser opens it at its existing version 4-and-below, no upgrade fires), enumerates whatever stores exist (`objectStoreNames.contains` guards — the failing v6 store may be absent), and feeds those records into the ZIP builder. Iterate over store names defensively because the un-upgraded DB lacks the new store. This reuses `exportBackup()`'s manifest/ZIP assembly (`backup.js:579–637`) but swaps the data source from `PortfolioDB.getAll*()` to the read-only open. Resolve exact mechanics in planning; the analog above is the load-bearing pattern.

---

### `assets/settings.js` — "Report a problem" entry row (MODIFY, navigation)

**Analog (self-pattern):** `settings.js:90–131` `renderRow()`

`.settings-row` structure with `data-section-key`, `.settings-row-meta` → `.settings-row-label`/`.settings-row-desc microcopy`, all `textContent` (SECURITY: never innerHTML, `settings.js:112`). Add an isolated, cohesive "Report a problem" row routing to the OBS-02 screen. **Note (CONTEXT code_context):** `settings.js` is a Phase 31 refactor/extraction target — keep the addition self-contained so it survives the extraction. Optional crash-log "clear" affordance → `.button.ghost` + neutral-tone `confirmDialog`.

---

## Shared Patterns

### Early pre-i18n 4-language strings (Surface B)
**Source:** `assets/db.js:153–188` (`DB_STRINGS` + `dbStr`), mirrored by `assets/version.js:143–191` (`INTEGRITY_STRINGS` + `integStr`)
**Apply to:** `crashlog.js`, OBS-03 escape-hatch banner. Inline object keyed `en/he/de/cs`; accessor reads `localStorage.getItem('portfolioLang')`, falls back to `en`, never throws. RTL: set element `dir` from lang (`version.js:250–253`).

### Safe DOM construction (no innerHTML)
**Source:** `db.js:435–449`, `version.js:245–301`, `settings.js:112`
**Apply to:** every new banner/row/preview. `createElement` + `textContent` only; `role="alert"` on banners; `getElementById` duplicate-render guard; `document.body.prepend`.

### Never-throw, network-free guard wrapping
**Source:** `version.js:104–107`, `:222–224`
**Apply to:** all crash-log capture + storage. `try { ... } catch(e) { try{console.warn(...)}catch(_){} }`. No `fetch`/XHR/dynamic import anywhere (zero-network constraint).

### IndexedDB access helpers
**Source:** `db.js:452–470` (`withStore`, `addRecord`) and `db.js:86–116` (read-only open + `getAll` over guarded stores)
**Apply to:** OBS-01 primary-log writes (via helpers) and OBS-03 read-only export (via no-version open). Note the **deliberate exception**: the `localStorage` crash mirror must bypass these helpers so it survives an IDB failure.

### Destructive double-confirm
**Source:** `app.js:780` `confirmDialog({ tone: 'danger' })` + `.checkbox-field` (`app.css:1384–1391`)
**Apply to:** OBS-03 wipe (checkbox-gated + double-confirm, extra-emphatic when no session export), optional crash-log clear (neutral tone).

### Clipboard + mailto handoff
**Source:** `add-session.js:738–763` (clipboard, SecureContext + execCommand fallback); `backup.js:797–801` (`mailto:` via `window.location.href` + `encodeURIComponent`)
**Apply to:** OBS-02 "Copy report" and "Open email to support".

### Version / diagnostic context
**Source:** `version.js:25` `AppVersion.APP_VERSION` (`'1.2.1'`), `db.js:4` `DB_VERSION = 5`
**Apply to:** OBS-02 diagnostic-context fields.

---

## No Analog Found

None. Every new file maps to a strong existing pattern. The only **unresolved mechanic** (not a missing analog) is the OBS-03 read-only export-around-failure path — the closest analog (`db.js:86–96` no-version read-only open) is mapped above; the planner must compose it with `exportBackup`'s ZIP assembly.

---

## Open Questions (carried from UI-SPEC — planner/orchestrator to surface)

1. **Report screen: dedicated HTML page vs. `.modal-card` overlay** (UI-SPEC Open Q1). Affects whether a new `report.html` is created or a modal is added to an existing page. Both are acceptable; multi-page architecture may favor a modal.
2. **Does OBS-03 ever render in normal app chrome, or only as the pre-i18n failure banner?** Default (UI-SPEC Open Q2): failure-path-only (Surface B). A standing Settings "nuclear reset" is explicitly deferred (CONTEXT Deferred).
3. **`mailto:` reliability in the installed PWA** (D-06). Field-verify; degrade to copy-only + visible support address if it fails.

---

## Metadata

**Analog search scope:** `assets/version.js`, `assets/db.js`, `assets/backup.js`, `assets/add-session.js`, `assets/settings.js`, `assets/app.js`, page `<script>` order (`settings.html`)
**Files scanned:** 7 source + HTML wiring
**Pattern extraction date:** 2026-06-22
