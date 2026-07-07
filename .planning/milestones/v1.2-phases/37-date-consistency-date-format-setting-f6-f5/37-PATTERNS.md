# Phase 37: Date consistency + date-format setting (F6+F5+F4) - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 12 new/modified (+ 4-lang i18n bundles + backup/db touchpoints)
**Analogs found:** 12 / 12 (this is a reuse-only phase — every new element has a live sibling)

> **Reuse-only phase.** The value of this map is pinning each NEW element to the closest EXISTING analog with concrete line references, so the planner/executor **compose rather than re-invent**. All line numbers below were re-verified against the live tree on 2026-07-02 (the CONTEXT.md refs had drifted; RESEARCH files were already line-accurate).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `assets/date-format.js` (NEW) | utility (window-IIFE) | transform (string→Date→string) | `assets/crashlog.js` / `assets/version.js` | exact (IIFE shape) |
| `assets/app.js` `formatDate` (MOD) | utility wrapper | transform | itself (delegate to `DateFormat`) | in-place rework |
| `assets/app.js` `formatSessionType` (MOD) | resolver | transform + cache-read | `app.js` `getSectionLabel` / `_sectionLabelCache` | exact (same pattern) |
| `assets/settings-session-types.js` (NEW) | component (list editor IIFE) | CRUD | `assets/settings-snippets.js` | exact |
| F5 date-format `<select>` (in `settings.html` + JS) | component (picker) | request-response (persist) | Backups frequency `<select>` (`settings.html:171`) + `app.js` lang/theme localStorage | exact |
| Personalization tab (button + panel) | component (tab) | event-driven (tab nav) | `settings.js` tab-nav IIFE + `settings.html:58-63` | exact |
| Session-type cards (`add-session.html`/`.js`) | component | request-response | existing `.toggle-group#sessionTypeGroup` (`add-session.html:77`) | in-place, data-driven |
| Birthdate `<input type="date">` (3 sites) | component | request-response | `#sessionDate` native input (`add-session.html:94`) | exact |
| `assets/backup.js` (MOD) | service | file-I/O (export/restore) | existing `settings:` + `therapistSettings` blocks | in-place additive |
| `assets/pdf-export.js` `formatDate` (MOD) | utility wrapper | transform | delegate to `DateFormat` | in-place rework |
| `assets/export-modal.js` (MOD) | controller | request-response | itself (stop pre-formatting) | in-place rework |
| `tests/37-*.test.js` (NEW) + `tests/34-date-locale.test.js` (REWRITE) | test | — | `34-date-locale.test.js` `loadApp` vm sandbox; `30-settings-tabnav.test.js`; `_helpers/jsdom-pdf-env.js` | exact |

---

## Pattern Assignments

### `assets/date-format.js` (NEW — utility, window-IIFE, transform)

**Analog:** `assets/crashlog.js` (line 24), `assets/version.js` (line 22)

**IIFE shape to copy** (`assets/crashlog.js:24`, `assets/version.js:22`):
```js
var CrashLog = (function () {
  'use strict';
  var MIRROR_KEY = 'crashlogBuffer';
  // ... private fns ...
  return { /* public surface */ };
})();
```
```js
var AppVersion = (function() {
  'use strict';
  var APP_VERSION = '1.2.3';
})();
```

**Apply:** `window.DateFormat = (function () { 'use strict'; ... })()`. Zero-dependency vanilla. Public surface per RESEARCH §"Module API": `format(input, formatKey, lang)`, `parseLocal(input)`, `todayLocalISO()`, `getPreference()`. Core rule: regex-extract leading `\d{4}-\d{2}-\d{2}` → `new Date(y, m-1, d)` (LOCAL, never `new Date("YYYY-MM-DD")` which is UTC). Full reference implementation is in `37-RESEARCH.md` lines 83-167 — copy it. Registers on `window` (production convention) rather than the bare `var` used by crashlog/version.

**getPreference try/catch** mirrors the localStorage-read guard used across the app (e.g. `backup.js` reads). Returns `localStorage.getItem('portfolioDateFormat') || 'auto'`.

---

### `assets/app.js` `formatDate` (MOD — primary date bug site)

**Analog:** itself. Current body (`app.js:940-958`, VERIFIED):
```js
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);                 // <-- UTC-midnight bug
  if (Number.isNaN(date.getTime())) return dateString;
  const localeMap = { he: "he-IL", de: "de-DE", cs: "cs-CZ" };
  const locale = localeMap[currentLang] || "en-US";
  const month = (currentLang === "de" || currentLang === "cs") ? "long" : "short";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month, day: "numeric" }).format(date);
}
```

**Rework:** delegate entire body to
```js
return window.DateFormat.format(dateString, window.DateFormat.getPreference(), currentLang);
```
The `localeMap` + `month` logic moves into `date-format.js`'s `autoFormat`/`resolveLocale` (reproduces this exact rule for `auto`). ~10 `App.formatDate(...)` callers stay unchanged.

---

### `assets/app.js` `formatSessionType` (MOD — resolver, F4)

**Analog:** `app.js` `getSectionLabel` + `_sectionLabelCache` (VERIFIED `app.js:39, 58-60`)

**Cache pattern to copy** (`app.js:39`, `app.js:58`):
```js
let _sectionLabelCache = new Map();   // populated in initCommon BEFORE setLanguage
...
function getSectionLabel(sectionKey, defaultI18nKey) {
  const entry = _sectionLabelCache.get(sectionKey);
  if (entry && typeof entry.customLabel === "string" && entry.customLabel.trim().length > 0) {
    return entry.customLabel;         // user override (global rename)
  }
  // ... i18n fallback ...
}
```

**Current `formatSessionType`** (`app.js:1207-1210`, VERIFIED):
```js
function formatSessionType(type) {
  const key = 'session.type.' + (type || 'clinic');
  return t(key);
}
```

**Rework** (mirror `getSectionLabel`): add a `_sessionTypeCache` (loaded in `initCommon` beside `_sectionLabelCache`), return `entry.customLabel` if non-empty (D-16 global rename), else `t('session.type.'+key)`, else raw `String(key)` (D-18 graceful fallback). Expose `App.getSessionTypes()` mirroring `App.getSnippets()`.

---

### `assets/settings-session-types.js` (NEW — F4 two-tier editor)

**Analog:** `assets/settings-snippets.js` (whole file) + locked-row pattern from `assets/settings.js`

**Self-boot pattern to copy** (`settings-snippets.js:1318-1328`, VERIFIED — do NOT call `initCommon`, avoids double-mount):
```js
document.addEventListener("app:snippets-changed", renderSnippetList);
document.addEventListener("app:language", renderSnippetList);
renderSnippetList();
// ...
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", boot);   // boot directly, NOT initCommon
}
```

**List render + row build** (`settings-snippets.js:427` `renderSnippetList`, `:471` `buildListRow`, VERIFIED):
```js
function renderSnippetList() {
  var listEl = $("snippetList");
  var cache = (window.App && typeof window.App.getSnippets === "function")
    ? window.App.getSnippets() : [];
  // clear + append rows
}
function buildListRow(snippet, prefix, lang) {
  var row = document.createElement("div");
  row.className = "snippets-list-row";
  var trig = document.createElement("span");
  trig.textContent = snippet.trigger || "";   // .textContent, never innerHTML
}
```

**Delete icon** (`settings-snippets.js:510, 527`): `delBtn.appendChild(buildIconSvg(TRASH_ICON_PATHS));` — reuse for CUSTOM rows only.

**Locked-row lock icon** (`settings.js:35, 74-80`, VERIFIED):
```js
var LOCKED_RENAME = new Set(["heartShield", "issues", "nextSession"]);
...
function buildInfoIconSvg(size) { /* createElementNS SVG */ }
```
**Apply:** the 5 locked defaults (`clinic/online/remote/proxy/other`) render `buildInfoIconSvg` (lock/info) + rename input, NO delete button; custom rows render `TRASH_ICON_PATHS` delete + rename input. Two-layer delete guard (no button rendered AND handler early-returns on `locked:true`). Data model + mapping table in `37-RESEARCH-personalization.md` §3.

---

### F5 date-format `<select>` (settings.html markup + picker JS)

**Analog:** Backups frequency `<select>` markup (`settings.html:171`) + `app.js` lang/theme localStorage

**localStorage scalar pattern** (`app.js:122`, `app.js:126`, `app.js:179`, VERIFIED):
```js
localStorage.setItem("portfolioLang", currentLang);
document.dispatchEvent(new CustomEvent("app:language", { detail: { lang: currentLang } }));
...
localStorage.setItem('portfolioTheme', next);
```
**Apply:** `portfolioDateFormat` read (`localStorage.getItem("portfolioDateFormat") || "auto"`, try/catch) + write on `change`, then `document.dispatchEvent(new CustomEvent("app:dateformat", { detail:{ format } }))` — **live re-render, never a reload** (mirrors `app:language`). The 6 `<option value>` carry the locked seam keys. The 5 non-`auto` option **labels** are filled at wire-time by calling `window.DateFormat` (SEAM) — never hand-typed. Full markup in `37-RESEARCH-personalization.md` §2.

---

### Personalization tab (button + panel)

**Analog:** `settings.js` tab-nav IIFE (`readUrlTab`) + `settings.html:58-63` tablist

**Whitelist to extend** (`settings.js` `readUrlTab`, VERIFIED):
```js
function readUrlTab() {
  var t = params.get("tab");
  if (t === "fields" || t === "snippets" || t === "backups" || t === "photos") return t;
  return null;
}
```
**Apply:** add `|| t === "personalize"`. This is the ONLY tab-nav JS change (the IIFE reads all tabs dynamically via `querySelectorAll('[role="tab"]')`). Add one `<button role="tab" data-tab="personalize" data-i18n="settings.tab.personalize">` to the tablist and one `<div role="tabpanel" hidden>` panel. Exact markup in `37-RESEARCH-personalization.md` §1.

---

### Session-type cards (`add-session.html` / `add-session.js`)

**Analog:** existing hardcoded `.toggle-group#sessionTypeGroup` (`add-session.html:77-91`, VERIFIED):
```html
<div class="toggle-group" id="sessionTypeGroup">
  <label class="toggle-card active" data-type="clinic">
    <input type="radio" name="sessionType" value="clinic" checked />
    <span data-i18n="session.form.clinic">Clinic</span>
  </label>
  ...
</div>
```
**Apply:** render cards data-driven from `App.getSessionTypes()` (5 defaults + custom); first card `.active`; label via `App.formatSessionType(key)`; re-resolve on `app:language`. Wiring (`setupToggleGroup`, checked-value read, edit-repopulate) is generic and survives dynamic cards (RESEARCH-personalization §4).

---

### Birthdate `<input type="date">` (3 sites)

**Analog:** `#sessionDate` native input (`add-session.html:94`, VERIFIED):
```html
<input class="input" id="sessionDate" type="date" required />
```
**Apply:** replace the 3 `<div>`+hidden-input dropdown pairs (`add-client.html:63-65`, `add-session.html:150-152`, `add-session.html:530-532`) with this exact native input shape. Delete `App.initBirthDatePicker` (`app.js:1251-1372`) and its callers; set/read `.value` directly (`YYYY-MM-DD`, no migration). Age-math parse-fix is the ENGINE lane (do not touch `new Date(birthDate)` here).

---

### `assets/backup.js` (MOD — export/restore)

**Analog:** existing `settings:` export block + `therapistSettings` array

**Export scalar block** (`backup.js:601-613`, VERIFIED):
```js
settings: {
  language: localStorage.getItem("portfolioLang"),
  theme: localStorage.getItem("portfolioTheme"),
  snippetPrefix: localStorage.getItem("portfolioSnippetPrefix"),
},
```
**Apply:** add `dateFormat: localStorage.getItem("portfolioDateFormat"),`.

**Restore scalar block** (`backup.js:1210-1216`, VERIFIED):
```js
if (manifest.settings.language) { localStorage.setItem("portfolioLang", manifest.settings.language); }
if (manifest.settings.theme) { localStorage.setItem("portfolioTheme", manifest.settings.theme); }
```
**Apply:** mirror TWO keys into the export `settings` object beside `snippetPrefix` — `dateFormat: localStorage.getItem("portfolioDateFormat")` and `sessionTypes: localStorage.getItem("portfolioSessionTypes")` — and add matching guarded restores `if (manifest.settings.dateFormat) { localStorage.setItem("portfolioDateFormat", manifest.settings.dateFormat); }` and `if (manifest.settings.sessionTypes) { localStorage.setItem("portfolioSessionTypes", manifest.settings.sessionTypes); }` right after theme. No manifest `version` bump (additive-optional).

**Session-type list → localStorage (A2 CORRECTED — the IDB path does NOT round-trip):** the earlier "restore loop writes arbitrary `sectionKey` rows" claim was **FALSE**. VERIFIED: `backup.js:1169` DROPS any `sectionKey` not in `ALLOWED_SECTION_KEYS` (`sessionTypes` is not in it), and `backup.js:1173-1177` COERCES the surviving rows to `{sectionKey, customLabel, enabled}` (stripping `overrides`/`custom`). So an IDB `therapistSettings` `{sectionKey:"sessionTypes", ...}` row would silently lose every rename/custom type on restore (PERS-05/D-17 violation). Storage therefore lives in `localStorage['portfolioSessionTypes']` as JSON `{ overrides:{<lockedKey>:"<label>"}, custom:[{key,label}] }`, read/written like `portfolioDateFormat` (try/catch + JSON.parse with default), and rides the localStorage settings block exactly like `dateFormat` — that additive scalar is the ONLY backup edit; the therapistSettings whitelist is left untouched.

---

### `assets/pdf-export.js` `formatDate` + `assets/export-modal.js` (MOD)

**Analog:** delegate to `DateFormat` (same wrapper pattern as `app.js formatDate`). `pdf-export.js:674` → `return window.DateFormat.format(sessionDate, window.DateFormat.getPreference(), uiLang);` (old en-GB `T00:00:00` body becomes dead). `export-modal.js` stops pre-formatting (`:326-327`), passes raw ISO into `buildSessionPDF`, and footer `exportedOn = App.formatDate(DateFormat.todayLocalISO())`. Full site table in `37-RESEARCH.md` §"The Definitive UTC-Parse Sweep" and §"PDF Integration".

---

### Tests (NEW + REWRITE)

**vm-sandbox analog** (`tests/34-date-locale.test.js:69` `loadApp`, VERIFIED): loads `app.js` into a `vm` sandbox with `Intl`/document stubs. **Apply:** `tests/37-date-format.test.js` loads `date-format.js` THEN `app.js` into the same sandbox; TZ-pinned via top-of-file `process.env.TZ='America/New_York'` + re-exec (V8 caches TZ; skeleton in RESEARCH.md §"Falsifiable TZ-Pinned Tests").

**jsdom-pdf-env injection** (`tests/_helpers/jsdom-pdf-env.js:118-125`, VERIFIED — sequential `win.eval(readAsset(...))`): add `win.eval(readAsset('assets/date-format.js'));` BEFORE the `pdf-export.js` eval (D-21).

**Settings tab test analog** (`tests/30-settings-tabnav.test.js`): extend the `?tab=` whitelist case for `personalize`; bump the end-of-file expected-count guard.

**Personalization behavior tests:** model on `tests/30-settings-section-roundtrip.test.js` (mock `PortfolioDB` mirrors writes→reads) + helpers `tests/_helpers/app-stub.js`, `tests/_helpers/mock-portfolio-db.js`. Full test map in RESEARCH-personalization §9.

---

## Shared Patterns

### Window-IIFE module shape
**Source:** `assets/crashlog.js:24`, `assets/version.js:22`
**Apply to:** `assets/date-format.js` (new), `assets/settings-session-types.js` (new)
```js
window.X = (function () { 'use strict'; /* private */ return { /* public */ }; })();
```

### localStorage scalar preference (read || default, try/catch, event on write)
**Source:** `assets/app.js:122` (`portfolioLang`), `:179` (`portfolioTheme`), `:126` (CustomEvent dispatch)
**Apply to:** `portfolioDateFormat` picker persistence + `app:dateformat` live re-render event

### Eager-load → sync-read override cache (global rename)
**Source:** `assets/app.js:39` (`_sectionLabelCache`), `:58-60` (`getSectionLabel`)
**Apply to:** `_sessionTypeCache` + reworked `App.formatSessionType` (D-16 global rename, D-18 raw fallback)

### List-CRUD editor (render/add/rename/delete/persist, textContent-only)
**Source:** `assets/settings-snippets.js` (`:427` render, `:471` row build, `:510/527` trash icon, `:1318` self-boot)
**Apply to:** `assets/settings-session-types.js`

### Locked-row lock-icon divergence
**Source:** `assets/settings.js:35` (`LOCKED_RENAME` Set), `:74` (`buildInfoIconSvg` via `createElementNS`)
**Apply to:** F4 locked defaults (lock icon, no delete) vs custom rows (delete button)

### Backup additive-optional field (no version bump)
**Source:** `assets/backup.js:601-613` export, `:1210-1216` restore, `:1145-1181` generic therapistSettings restore loop
**Apply to:** `dateFormat` scalar + `sessionTypes` therapistSettings row

### Native date input (zero custom JS)
**Source:** `add-session.html:94` (`#sessionDate type="date"`)
**Apply to:** all 3 birthdate inputs

### Security: user text via .textContent / input.value, never innerHTML
**Source:** `settings.js` header, `settings-snippets.js:471` (`.textContent`), `app.js:getSectionLabel` doc
**Apply to:** all F4 rename inputs + resolved labels + card spans

---

## No Analog Found

None. Every new element maps to a live sibling pattern. The single genuinely-new mechanism — Hebrew numeric LTR wrapping via Unicode isolates `U+2066/U+2069` (D-07/DATE-04) — has **no precedent** in the codebase (grep found only a comment at `pdf-export.js:309`), so the planner should follow `37-RESEARCH.md` §"Hebrew Numeric LTR Wrapping" (bare-string isolates, PDF tolerance test-gated with a strip-fallback) rather than an existing analog.

---

## Metadata

**Analog search scope:** `assets/` (app.js, date-format target, crashlog.js, version.js, settings.js, settings-snippets.js, backup.js, db.js, pdf-export.js, export-modal.js), `*.html` (add-session, add-client, settings), `tests/` (34-date-locale, 30-settings-tabnav, 30-settings-section-roundtrip, _helpers/jsdom-pdf-env)
**Files scanned:** ~18 source + 4 test files
**Verification:** all cited file:line confirmed against the live tree 2026-07-02 (RRESEARCH files were already accurate; CONTEXT.md line refs were approximate and are superseded by the verified numbers here)
**Pattern extraction date:** 2026-07-02
</content>
</invoke>
