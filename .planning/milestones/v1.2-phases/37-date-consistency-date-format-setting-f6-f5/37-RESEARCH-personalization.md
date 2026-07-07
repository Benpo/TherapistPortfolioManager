# Phase 37: Personalization Settings Surface — Research (F4 + F5-picker + tab + storage + backup + birthdate-input + i18n)

**Researched:** 2026-07-02
**Domain:** Vanilla-JS settings UI (tab nav, `<select>` picker, two-tier list editor), localStorage/IndexedDB persistence, backup/restore, native `<input type="date">`, 4-language i18n
**Confidence:** HIGH (all findings verified by reading the current source; every line number below re-grepped against `main`)
**Lane:** Personalization surface ONLY. The date ENGINE (`date-format.js` internals, UTC sweep, PDF date output, TZ-pinned date-correctness tests) is the other researcher's lane. Seams flagged inline.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions (my lane: D-05, D-09, D-10..D-18)
- **D-05** — 6 format options: Auto / Month Day, Year / Day Month Year / MM/DD/YYYY / DD/MM/YYYY / YYYY-MM-DD.
- **D-09** — `portfolioDateFormat` in localStorage, mirrors `portfolioLang`/`portfolioTheme`; default `"auto"`; included in backup export/restore.
- **D-10** — New "Personalization" Settings tab hosts BOTH the date-format picker (F5) and the session-type editor (F4). No new header/nav control.
- **D-11** — Tab name "Personalization" (or "Customization"/"General" — planner picks; must be translated across all 4 languages).
- **D-12** — Replace the 3 birthdate month/day/year `<select>` dropdowns with a single `<input type="date">`; value always `YYYY-MM-DD` (no data migration).
- **D-13** — 5 locked defaults: In-person/`clinic`, Online/`online`, Remote/`remote`, Proxy/`proxy`, Other/`other`.
- **D-14** — 3 existing keys (`clinic`/`online`/`other`) stay permanently locked; `remote`/`proxy` are new locked defaults (no session references them → no migration).
- **D-15** — Two-tier editor modeled on `settings-snippets.js`: locked rows show rename + lock icon (no delete); custom rows show rename + delete; add-new input at bottom.
- **D-16** — Renames are GLOBAL: one language-agnostic override string per type, overrides the i18n label app-wide (like snippets/section-labels).
- **D-17** — Session-type list storage: planner decides (localStorage JSON vs IndexedDB); MUST be in backup export/restore either way.
- **D-18** — Graceful fallback: an unmapped type string displays raw as-is (no crash, no data loss).

### Claude's Discretion
- Personalization tab i18n key names (follow `settings.*` convention).
- Session-type list storage mechanism (localStorage vs IndexedDB).
- F4 type order in list (recommend: In-person, Online, Remote, Proxy, Other, then custom).
- Exact `portfolioDateFormat` key values — **now LOCKED by the seam contract** (see below).

### Deferred Ideas (OUT OF SCOPE)
- F1, F2, F3, F7, F8, F9, F10; Batch-3 comments; F5 per-language rename; License re-validation.

---

## Seam Contract (shared with the engine researcher — do NOT solve their half)

- **`portfolioDateFormat` values (LOCKED — both lanes use these EXACT keys):** `"auto"`, `"month-day-year"`, `"day-month-year"`, `"mm/dd/yyyy"`, `"dd/mm/yyyy"`, `"yyyy-mm-dd"`. Default when unset = `"auto"`.
  - **My lane:** the `<select>` whose 6 `<option value="...">` carry these keys; persistence; re-render trigger.
  - **Engine lane:** how each key → an actual formatted date string (`window.DateFormat`). The picker's option DISPLAY labels show a formatted example date — that example string comes from the engine helper; the picker CALLS it, does not hand-roll it.
- **Birthdate:** My lane swaps the 3 dropdowns → `<input type="date">` and owns element + value read/write. Engine lane owns that the age-math parses `.value` (string) not `.valueAsDate` (UTC). I flag every age-math site below and defer the parse-fix to them.
- **`date-format.js` helper + app-wide sweep + PDF date output + date baselines:** entirely engine lane. Not covered here.

---

## Summary

The Personalization surface is a low-risk, well-precedented build. The Settings page already has a complete, tested 4-tab WAI-ARIA tablist driven by a self-contained IIFE in `assets/settings.js` (lines 721–799); adding a 5th "Personalization" tab is a pure markup insertion in `settings.html` plus one string in the tab-nav whitelist. The F5 date-format picker is a plain `<select>` whose values are the locked seam keys, persisted with the exact `localStorage.getItem/setItem("portfolioDateFormat")` pattern used for `portfolioLang`/`portfolioTheme`. The F4 two-tier session-type editor maps cleanly onto `settings-snippets.js` — the divergence is only "locked rows reject delete + show a lock icon," which mirrors the *existing* locked-rename pattern in `settings.js` (`LOCKED_RENAME` set + `buildInfoIconSvg`).

The single genuine design decision is D-17 storage. **Recommendation: store the session-type list in IndexedDB `therapistSettings`** (a single row, `sectionKey: "sessionTypes"`), because (a) that store already exists (`db.js:306`, DB_VERSION 6, no schema bump needed), (b) it is already exported+restored wholesale by backup.js as `allTherapistSettings` (so backup is nearly free), and (c) the app already has an eager-load→sync-read cache pattern (`_sectionLabelCache`, `app.js:39`) that the resolver and global-rename lookup can reuse verbatim. The scalar `portfolioDateFormat` still goes in localStorage (it is a device preference, like theme) and is added to `manifest.settings` alongside `language`/`theme`.

The `App.formatSessionType` resolver (`app.js:1207`) is a 2-line function today; it becomes a cache lookup with graceful raw-string fallback (D-18). The 3 hardcoded radio cards (`add-session.html:77–90`) become data-driven from the list. The birthdate swap deletes `initBirthDatePicker` (`app.js:1251–1372`, ~120 lines) and replaces 3 container divs with native date inputs.

**Primary recommendation:** Insert a 5th "Personalization" tab; store `portfolioDateFormat` in localStorage and the session-type list as a single `therapistSettings` IDB row (`sectionKey:"sessionTypes"`); model the F4 editor on `settings-snippets.js` reusing `settings.js`'s locked-row lock-icon pattern; add both to backup via the existing `therapistSettings` + `manifest.settings` paths (no backup schema bump). Re-render on change via the existing `app:language`-style event, NOT a page reload.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary | Rationale |
|------------|-------------|-----------|-----------|
| Personalization tab nav | Settings page IIFE (`settings.js` tab-nav IIFE) | `settings.html` markup | Tab nav is a self-contained client IIFE; adding a tab is markup + whitelist |
| Date-format picker persistence | Browser localStorage | — | Device preference, mirrors theme/lang (D-09) |
| Date example rendering in `<option>` | **Engine `window.DateFormat`** (SEAM) | picker calls it | Engine owns date-string formatting |
| Session-type list storage | IndexedDB `therapistSettings` (recommended) | backup.js already carries it | Persisted app data, backup-native, cache pattern exists |
| Session-type resolver + global rename | `App` module (`app.js`) eager-load cache | — | Same shape as `getSectionLabel` (D-16) |
| Session-type cards render | `add-session.js` / `add-session.html` | reads list from `App` | Cards are data-driven from the managed list |
| Birthdate entry | Browser native `<input type="date">` | `add-client.js`/`add-session.js` | Native element; zero custom JS (D-12) |
| Backup of both prefs | `backup.js` export/restore | — | Single manifest is the portability boundary |
| i18n chrome strings | `i18n-{en,he,de,cs}.js` | — | UI labels only (not date-string formats) |

---

## Standard Stack

Zero new dependencies. This is 100% vanilla in-repo patterns. No npm/bundler in production (constraint confirmed: all modules are `window.X = (() => {'use strict';...})()` IIFEs).

| "Library" (in-repo pattern) | Location | Purpose |
|---|---|---|
| Tab-nav IIFE | `settings.js:721–799` | WAI-ARIA tablist; `?tab=` deep-link; whitelist at `:729` |
| Snippet editor IIFE | `settings-snippets.js` (whole file) | Template for F4 list render/add/rename/delete/persist |
| Locked-row lock-icon pattern | `settings.js:35` (`LOCKED_RENAME`), `:74` (`buildInfoIconSvg`), `:170–197` | Template for F4 locked-vs-custom divergence |
| Eager-load→sync-read cache | `app.js:39` `_sectionLabelCache`, `:58` `getSectionLabel`, `:665–673` load in `initCommon` | Template for session-type resolver + global rename (D-16) |
| localStorage scalar pattern | `app.js:122/179/218` (lang/theme) | Template for `portfolioDateFormat` (D-09) |
| IDB `therapistSettings` store | `db.js:306–312` (`keyPath:"sectionKey"`), `getAllTherapistSettings`/`setTherapistSetting` | Recommended session-type list home |
| Native `<input type="date">` | `add-session.html:94` (`#sessionDate`) | Exact template for birthdate swap |

**Installation:** none. No `npm install`.

*(No Package Legitimacy Audit — zero external packages installed this phase in my lane.)*

---

## 1. New Personalization Tab (D-10 / D-11)

### How tabs work today
- **Markup** (`settings.html:58–63`): a `<div class="settings-tabs" role="tablist">` with 4 `<button role="tab">` — each has `id`, `class="settings-tab"`, `aria-selected`, `aria-controls="<panelId>"`, `data-tab="<name>"`, `tabindex="-1"` (except active), and `data-i18n="settings.tab.<name>"`.
- **Panels** (`settings.html:65/118/165/209`): one `<div role="tabpanel" class="settings-tabpanel" aria-labelledby="<btnId>" hidden>` per tab (the first, `fields`, has no `hidden`).
- **Logic** (`settings.js:721–799`, self-booting IIFE): `readUrlTab()` (`:724`) whitelists valid `?tab=` values at **`:729`** (`fields|snippets|backups|photos`); `activate(name)` toggles `is-active`, `aria-selected`, `tabIndex`, and panel `hidden`; keyboard Arrow/Home/End nav; `writeUrlTab` does `history.replaceState`. Default = first tab if no valid `?tab=`.
- **Current tab labels** (`i18n-en.js:422–426`): "Custom field names" / "Text Snippets" / "Backups" / "Photos".

### Exact steps to add the Personalization tab
1. **`settings.html` — add a tab button** in the tablist (`:58–63`). Recommend inserting it **first** (Personalization is the most user-facing/customization surface) OR right after `fields`. Suggested markup:
   ```html
   <button type="button" role="tab" id="settingsTabPersonalizeBtn" class="settings-tab"
           aria-selected="false" aria-controls="settingsTabPersonalize" data-tab="personalize"
           tabindex="-1" data-i18n="settings.tab.personalize">Personalization</button>
   ```
2. **`settings.html` — add the panel** (a sibling of the other `settingsTabpanel` divs, `hidden`):
   ```html
   <div id="settingsTabPersonalize" role="tabpanel" class="settings-tabpanel"
        aria-labelledby="settingsTabPersonalizeBtn" hidden>
     <!-- F5 date-format picker (section 2) -->
     <!-- F4 session-type editor (section 3) -->
   </div>
   ```
3. **`settings.js:729` — add `personalize` to the `?tab=` whitelist:**
   ```js
   if (t === "fields" || t === "snippets" || t === "backups" || t === "photos" || t === "personalize") return t;
   ```
   (This is the ONLY JS change needed for the tab-nav itself — the IIFE reads all tabs dynamically via `querySelectorAll('[role="tab"]')`.)
4. **i18n:** add `settings.tab.personalize` to all 4 bundles.

### Tab name recommendation
Use **"Personalization"** (key `settings.tab.personalize`). It reads as user-facing customization and is distinct from the neutral "Custom field names" (fields) tab. All 4 translations below.

### Ordering within the tab
Put **F5 (date-format picker) first, then F4 (session-type editor)** — the picker is a single control (quick to grok), the editor is the larger interactive list. Separate them with an `<h3>`/section header each, matching the Snippets panel's subsection headers (`settings.html:132`).

---

## 2. F5 Date-Format Picker (`<select>`) — D-05 / D-09

### Markup (inside the Personalization panel)
A `.form-field` mirroring the Backups frequency `<select>` (`settings.html:171–179`):
```html
<div class="form-field">
  <label class="label" for="dateFormatSelect" data-i18n="settings.dateFormat.label">Date format</label>
  <select class="input select-field" id="dateFormatSelect">
    <option value="auto"           data-i18n="settings.dateFormat.auto">Automatic (follow language)</option>
    <option value="month-day-year" data-df-example>Jul 2, 2026</option>
    <option value="day-month-year" data-df-example>2 Jul 2026</option>
    <option value="mm/dd/yyyy"     data-df-example>07/02/2026</option>
    <option value="dd/mm/yyyy"     data-df-example>02/07/2026</option>
    <option value="yyyy-mm-dd"     data-df-example>2026-07-02</option>
  </select>
</div>
```
> **SEAM:** the example strings shown in the 5 non-auto options are ENGINE output. At wire time, call `window.DateFormat` (engine helper) to fill each `data-df-example` option's `textContent` with a formatted example of a fixed reference date so the label always matches the real formatter. Only the `"auto"` option has a static i18n label. Do NOT hand-roll the example strings — that would drift from the engine. (Planner: add a task note that the option-label rendering depends on the engine helper's public signature; coordinate the exact call with the engine plan.)

### Persistence (mirror lang/theme verbatim)
Read/write pattern lifted from `app.js:122` (`localStorage.setItem("portfolioLang", ...)`) and `:179` (`portfolioTheme`):
```js
function readDateFormat() {
  try { return localStorage.getItem("portfolioDateFormat") || "auto"; } catch (_) { return "auto"; }
}
// on <select> change:
sel.addEventListener("change", function () {
  try { localStorage.setItem("portfolioDateFormat", sel.value); } catch (_) {}
  document.dispatchEvent(new CustomEvent("app:dateformat", { detail: { format: sel.value } }));
  if (window.App && App.showToast) App.showToast("", "settings.dateFormat.savedToast");
});
// init: sel.value = readDateFormat();
```

### Re-render propagation (matches the language pattern — NO reload)
- **Language changes do NOT reload the page today.** `setLanguage` (`app.js:122–126`) writes localStorage then `document.dispatchEvent(new CustomEvent("app:language", {detail:{lang}}))`; every date/label surface listens for `app:language` and re-renders in place (e.g. `settings.js:683`, `settings-snippets.js:1313`, birthdate picker `app.js:1323`).
- **The date-format change SHOULD follow the same live-re-render path.** Emit a new `app:dateformat` CustomEvent (as above). The **engine researcher** owns wiring the actual date-display surfaces (session list, overview, title, PDF) to re-read the preference — but the propagation MECHANISM they should hook into is this event. Flag for the planner: the picker fires `app:dateformat`; the engine's display sites subscribe. (Alternatively the engine may choose to fold it into `app:language` re-render; the seam is "an event fires, display sites re-render, no reload.")

**Confidence: HIGH** — persistence + event pattern verified against `app.js` lang/theme code.

---

## 3. F4 Two-Tier Session-Type Editor (D-13..D-18)

### The template + the divergence
`settings-snippets.js` gives the list-CRUD skeleton; `settings.js`'s section rows give the locked-row lock-icon pattern. Build a **new self-contained IIFE** (recommend `assets/settings-session-types.js`, self-booting on `DOMContentLoaded` like `settings-snippets.js:1326`) so `settings.js` stays slim (per its extraction philosophy, `settings.js:11–14`).

### Data model (the 5 locked defaults)
```js
var DEFAULT_TYPES = [
  { key: "clinic", i18nKey: "session.type.clinic", locked: true },   // In-person (existing)
  { key: "online", i18nKey: "session.type.online", locked: true },   // Online (existing)
  { key: "remote", i18nKey: "session.type.remote", locked: true },   // Remote (NEW)
  { key: "proxy",  i18nKey: "session.type.proxy",  locked: true },   // Proxy (NEW)
  { key: "other",  i18nKey: "session.type.other",  locked: true },   // Other (existing)
];
```
> **New i18n keys needed:** `session.type.remote`, `session.type.proxy` (and `session.form.remote`/`session.form.proxy` if the add-session card labels reuse the `session.form.*` family — see §4). The 3 existing keys already exist (`i18n-en.js:272–274`).

### Snippet-editor → session-type-editor mapping

| Snippet-editor mechanism (`settings-snippets.js`) | Session-type equivalent | Locked-vs-custom divergence |
|---|---|---|
| `renderSnippetList()` (`:427`) reads `App.getSnippets()`, clears list, appends rows | `renderTypeList()` reads `App.getSessionTypes()` (new resolver, §5), renders 5 defaults **in fixed order first**, then custom types | Defaults always render (materialized from `DEFAULT_TYPES` ∪ overrides); custom from stored list |
| `buildListRow()` (`:471`) builds a row with trigger + preview + **edit** + **delete** buttons | `buildTypeRow()` builds: **rename `<input>`** (prefilled with resolved label) + affordance | **Locked:** rename input + **lock icon** (`buildInfoIconSvg`, `settings.js:74`), NO delete. **Custom:** rename input + **delete button** (`TRASH_ICON_PATHS`, `settings-snippets.js:527`) |
| `handleSave()` (`:828`) validates + `PortfolioDB.updateSnippet/addSnippet` + `afterSnippetMutation()` | `commitRename(key, newLabel)` writes the override string to the stored list; `addCustomType(label)` appends a new custom entry | Locked rows: rename allowed → writes an **override** (D-16), never deletes. Custom rows: rename + delete both allowed |
| `handleDelete()` (`:925`) confirm dialog → `PortfolioDB.deleteSnippet` → refresh | `handleDeleteCustom(key)` confirm → remove from stored list → refresh | **Guard: reject delete on any `locked:true` key** (defense-in-depth: no delete button is rendered for locked rows, AND the handler early-returns if `key` is a default) |
| Add button `#addSnippetBtn` → `openEditor(null)` (`:1228`) | Add-new `<input>` + button at list bottom → `addCustomType(input.value)` | Same shape; custom key generated as a slug/`custom.<ts>` |
| `afterSnippetMutation()` (`:266`) refreshes `App` cache + BroadcastChannel + re-render | `afterTypeMutation()` refreshes `App`'s session-type cache + `app:session-types-changed` event + re-render | Reuse the BroadcastChannel `"sessions-garden-settings"` (`settings-snippets.js:232`) with a new `type:"session-types-changed"` |
| `document.addEventListener("app:language", renderSnippetList)` (`:1313`) | same — re-render on language change so default labels re-translate | Overridden (renamed) labels stay fixed across languages (D-16); only un-renamed defaults re-translate |

### Rename semantics (D-16 — GLOBAL, language-agnostic)
Exactly the `getSectionLabel` model (`app.js:58`): a stored **override string per type key**. The resolver (§5) returns the override if present-and-non-empty, else the i18n default. One override, all languages. Renaming "In-person"→"Face-to-face" writes `overrides["clinic"]="Face-to-face"` and it shows everywhere.

### SECURITY (inherit the contract)
All labels are user text → render via `.textContent` / `input.value` only, **never `innerHTML`** (`settings.js` header `:25`, `settings-snippets.js:20`). Icons built via `createElementNS` DOM APIs (reuse `buildInfoIconSvg` / `buildIconSvg`).

**Confidence: HIGH** — every mapped mechanism read in source.

---

## 4. Session-Type Resolver + Data-Driven Cards (D-16, D-18)

### `App.formatSessionType` rework (`app.js:1207–1210`)
Today:
```js
function formatSessionType(type) {
  const key = 'session.type.' + (type || 'clinic');
  return t(key);
}
```
Rework to resolve against the managed list + global renames + graceful fallback:
```js
function formatSessionType(type) {
  var key = type || 'clinic';
  var entry = _sessionTypeCache.get(key);            // new eager-load cache (mirror _sectionLabelCache)
  if (entry && typeof entry.customLabel === 'string' && entry.customLabel.trim()) return entry.customLabel; // D-16
  var def = DEFAULT_TYPE_I18N[key];                  // {clinic:'session.type.clinic', ...}
  if (def) return t(def);
  return String(key);                                // D-18 graceful fallback: raw string, no crash
}
```
- **Callers** (all pass a stored key, all render via textContent — safe):
  - `overview.js:498` — `${App.formatDate(session.date)} • ${App.formatSessionType(session.sessionType)}`
  - `sessions.js:112` — `typeCell.textContent = App.formatSessionType(session.sessionType)`
  - `export-modal.js:329` — `App.formatSessionType(sessionTypeInput.value)`
- **New cache load:** add to `initCommon` right beside the `_sectionLabelCache` load (`app.js:665–673`) — read the stored session-type list once, build `_sessionTypeCache`. Expose `App.getSessionTypes()` (sync read, shallow copy) mirroring `getSnippets` (`app.js:87`).

### Data-driven session-type cards (`add-session.html:77–90`)
Today 3 hardcoded `.toggle-card` radios (`clinic`/`online`/`other`). Rework:
- Render the cards **from `App.getSessionTypes()`** (5 defaults + custom) into `#sessionTypeGroup` at form init. Each card: `<label class="toggle-card" data-type="<key>"><input type="radio" name="sessionType" value="<key>"><span>…resolved label…</span></label>`.
- Keep the FIRST as `checked`/`active` default (currently `clinic`).
- **Wiring is unchanged:** `setupToggleGroup("sessionTypeGroup")` (`add-session.js:520`, `:1315`) works on any `.toggle-card` set generically; read stays `document.querySelector("input[name='sessionType']:checked").value` (`add-session.js:729/1104`); edit-repopulate loop `add-session.js:1528–1531` iterates `input[name='sessionType']` generically — both survive dynamic cards.
- **Card label source:** use `App.formatSessionType(key)` for each card's `<span>` (resolves renames) rather than static `data-i18n`. On `app:language` re-render, re-resolve.
- **Note (memory `feedback-optional-fields-no-hints`):** do not add "optional"/helper hints under the cards.

**Confidence: HIGH.**

---

## 5. Session-Type List Storage (D-17) — RECOMMENDATION

### How snippets store today
Snippets use **IndexedDB** via `PortfolioDB` (store `snippets`, `db.js:320`, `keyPath:"id"`), with `getAllSnippets/addSnippet/updateSnippet/deleteSnippet`. The snippet PREFIX scalar lives in localStorage (`portfolioSnippetPrefix`). Section-label overrides + enabled flags live in IDB `therapistSettings` (`db.js:306`, `keyPath:"sectionKey"`), read/written via `getAllTherapistSettings`/`setTherapistSetting`.

### Two options
| | localStorage (JSON array) | **IndexedDB `therapistSettings` (recommended)** |
|---|---|---|
| Aligns with | `portfolioLang`/`portfolioTheme` scalars | snippets/section-labels (structured app data) |
| Schema change | none | **none** — store already exists at DB_VERSION 6 |
| Backup | must add a NEW key to `manifest.settings` + restore | **already exported** wholesale as `allTherapistSettings` (`backup.js:600`) and restored (needs a restore-loop addition, §6) |
| Cache pattern | ad-hoc | reuse `_sectionLabelCache` eager-load→sync-read (`app.js:665`) |
| Cross-tab sync | manual | existing `"sessions-garden-settings"` BroadcastChannel |

### Recommendation: **IndexedDB `therapistSettings`, one row**
Store the entire session-type config as a **single `therapistSettings` record** with `sectionKey: "sessionTypes"`:
```js
{
  sectionKey: "sessionTypes",
  overrides: { clinic: "Face-to-face", proxy: "" },   // D-16 global renames; empty/absent = use i18n default
  custom: [ { key: "custom.1720000000", label: "Group session" } ], // D-15 user-added
}
```
Rationale: no DB migration/version bump; backup export is **already done** (it dumps all `therapistSettings` rows at `backup.js:645`); the resolver reuses the existing eager-load cache. `setTherapistSetting` (`db.js`) writes it; `getAllTherapistSettings` reads it (filter for `sectionKey:"sessionTypes"`).

> **Shape decisions:** defaults are **implicit** (materialized at render from `DEFAULT_TYPES`), NOT stored — only *deviations* (overrides + custom additions) persist. "Which defaults were renamed" = the keys present in `overrides` with a non-empty string. This keeps the record tiny and makes D-18 automatic (a session referencing a `custom.*` key that was later deleted finds no entry → raw fallback).

> **Backup compatibility note:** because the store is already in the manifest, choosing IDB means the EXPORT side needs zero new code; only the RESTORE loop needs a session-types-aware write (it currently restores `therapistSettings` rows generically — verify the restore loop covers arbitrary `sectionKey`s, see §6).

**Confidence: HIGH** for the mechanism; **MEDIUM** on whether the existing restore loop already writes arbitrary `therapistSettings` rows (planner must confirm the restore path — see §6 open item).

---

## 6. Backup Export/Restore (D-09 / D-17)

### Exact sites
- **Export — scalars** (`backup.js:602–613`): the `settings:` object carries `language`, `theme`, `snippetPrefix`. **Add `dateFormat`:**
  ```js
  settings: {
    language: localStorage.getItem("portfolioLang"),
    theme: localStorage.getItem("portfolioTheme"),
    snippetPrefix: localStorage.getItem("portfolioSnippetPrefix"),
    dateFormat: localStorage.getItem("portfolioDateFormat"),   // NEW (D-09)
  },
  ```
- **Export — session-type list:** if stored in `therapistSettings` (recommended), it is **already exported** at `backup.js:642–650` as `allTherapistSettings` → `manifest.therapistSettings` (`:600`). **No export code needed.** (If the planner instead picks localStorage, add a `sessionTypes` key to the `settings:` object here.)
- **Restore — scalars** (`backup.js:1210–1216`): mirrors export. **Add:**
  ```js
  if (manifest.settings.dateFormat) {
    localStorage.setItem("portfolioDateFormat", manifest.settings.dateFormat);
  }
  ```
  Place it right after the `theme` restore (`:1215`). Guard for absent key (older backups) exactly like the `snippetPrefix` back-compat guard (`:1217–1229`).
- **Restore — session-type list:** the `therapistSettings` restore loop is elsewhere in the restore flow (near the snippets restore loop at `backup.js:1192`). **OPEN ITEM (planner must verify):** confirm the restore path writes ALL `manifest.therapistSettings` rows (arbitrary `sectionKey`) via `setTherapistSetting`. If it does, the session-types row restores for free. If the restore is selective (only the known section keys), add `"sessionTypes"` to it. Grep target: `manifest.therapistSettings` in `backup.js`.

### Schema/version bump
- **Backup manifest `version` (`backup.js:595`, currently `3`): NO bump required.** `dateFormat` is an additive optional field inside `settings`; session-types ride the existing `therapistSettings` array. Restore guards treat missing fields as "leave as-is" (the established back-compat convention). Leave `version: 3` unless the planner wants a defensive bump for provenance — additive-optional does not require it.
- **IDB `DB_VERSION` (`db.js:33`, currently `6`): NO bump** — reusing the existing `therapistSettings` store, no new object store.

**Confidence: HIGH** on export scalar + restore scalar sites (read directly). **MEDIUM** on the therapistSettings restore-loop coverage (flagged open item).

---

## 7. Birthdate Input Swap (D-12)

### What exists today
`App.initBirthDatePicker(containerId, hiddenInputId)` (`app.js:1251–1372`, ~120 lines) builds 3 `<select>` (day/month/year), syncs to a hidden `YYYY-MM-DD` input, localizes month names on `app:language`, and already has a **mobile branch that swaps to a native `<input type="date">`** (`app.js:1336–1354`). D-12 makes the native input the ONLY path for all viewports → the whole `initBirthDatePicker` complexity collapses.

### Element + value plumbing (my lane)
Replace each `<div id="…BirthDatePicker">` + hidden input pair with a single native date input mirroring `#sessionDate` (`add-session.html:94`: `<input class="input" id="…" type="date" />`). Value is `YYYY-MM-DD` natively → no storage migration.

### Every site touched
**HTML (3 container+hidden pairs → 3 native inputs):**
- `add-client.html:63–65` — `#birthDatePicker` div + `#clientBirthDate` hidden → `<input type="date" id="clientBirthDate">`
- `add-session.html:150–152` — `#inlineBirthDatePicker` + `#inlineClientBirthDate` → native (inline new-client form)
- `add-session.html:530–532` — `#editBirthDatePicker` + `#editClientBirthDate` → native (edit-client modal)

**JS (init + populate-on-edit + read-on-save):**
- `add-client.js:38` — `App.initBirthDatePicker('birthDatePicker','clientBirthDate')` → delete; native input needs no init. `:140–141` populate-on-edit `birthDatePicker.setValue(editingClient.birthDate)` → `document.getElementById('clientBirthDate').value = editingClient.birthDate || ''`. Read-on-save `:218` already reads `.value` — unchanged.
- `add-session.js:148–149` — two `initBirthDatePicker` calls → delete. Populate `:344–347` (`editBirthDatePicker.setValue/clear`) and clear `:267–268` (`inlineBirthDatePicker.clear()`) → set `.value` directly. Reads `:472`, `:1026` already read `.value` — value plumbing unchanged.
- `App.initBirthDatePicker` itself (`app.js:1251–1372`) + its export (`app.js:1438`): remove (or stub) once all callers are migrated.

### SEAM — age-math (defer parse-fix to engine researcher)
Every age calculation currently does `new Date(birthDate)` on the `YYYY-MM-DD` string, which parses as **UTC midnight** (off-by-one in negative-UTC TZs). Sites I encountered (hand these to the engine lane's UTC-sweep):
- `add-client.js:219` — `Math.floor((Date.now() - new Date(birthDate)) / …)`
- `add-session.js:473` — edit-client age
- `add-session.js:1027` — inline-client age
- `add-session.js:1428` — spotlight age
- `overview.js:620` — age (per CONTEXT D-03)
> **My lane guarantees** the input `.value` is a clean `YYYY-MM-DD` string (native input never yields `.valueAsDate`-only). **Engine lane owns** replacing `new Date(birthDate)` with the canonical local parse. I do NOT change the age math.

**Confidence: HIGH.**

---

## 8. i18n Keys (D-11 + Discretion)

Follow the existing `settings.*` family (`i18n-en.js:418–457`). Add these to **all 4 bundles** (`i18n-en.js`, `i18n-he.js`, `i18n-de.js`, `i18n-cs.js`). Chrome strings ONLY — the date-string example labels are engine output (SEAM), not i18n.

### Keys needed
**Tab + panel:**
- `settings.tab.personalize` — tab button label

**F5 date-format picker:**
- `settings.dateFormat.label` — field label ("Date format")
- `settings.dateFormat.auto` — the only static option label ("Automatic (follow language)")
- `settings.dateFormat.savedToast` — save confirmation (reuse `schedule.savedToast` shape)
- `settings.dateFormat.helper` — optional one-line helper (skip if not needed; do NOT add "optional" hints)

**F4 session-type editor:**
- `settings.sessionTypes.heading` — section header
- `settings.sessionTypes.helper` — one-line explainer
- `settings.sessionTypes.add.label` — add-new button
- `settings.sessionTypes.add.placeholder` — add-new input placeholder
- `settings.sessionTypes.locked.tooltip` — lock-icon tooltip ("This is a built-in type — it can be renamed but not deleted.") — reuse the `settings.rename.locked.tooltip` pattern (`i18n-en.js:454`)
- `settings.sessionTypes.delete.aria` — delete button aria-label (custom rows)
- `settings.sessionTypes.rename.aria` — rename input aria-label
- `settings.sessionTypes.confirm.delete.title` / `.body` / `.confirm` — delete-custom confirm dialog (reuse `snippets.confirm.delete.*` shape)
- `settings.sessionTypes.empty` — empty-state for the custom list (if desired)
- `settings.sessionTypes.savedToast` — rename/add saved

**New session-type default labels (D-13 — the 2 new types):**
- `session.type.remote` + `session.type.online` already there; **add** `session.type.remote`, `session.type.proxy`
- If add-session cards reuse the `session.form.*` family (`i18n-en.js:104–106`): also add `session.form.remote`, `session.form.proxy`

### English proposed values (translate for he/de/cs)
| Key | EN value |
|---|---|
| `settings.tab.personalize` | Personalization |
| `settings.dateFormat.label` | Date format |
| `settings.dateFormat.auto` | Automatic (follow language) |
| `settings.dateFormat.savedToast` | Date format updated. |
| `settings.sessionTypes.heading` | Session types |
| `settings.sessionTypes.helper` | Rename the built-in types or add your own. |
| `settings.sessionTypes.add.label` | Add type |
| `settings.sessionTypes.add.placeholder` | New session type |
| `settings.sessionTypes.locked.tooltip` | Built-in type — can be renamed but not deleted. |
| `settings.sessionTypes.delete.aria` | Delete this session type |
| `settings.sessionTypes.confirm.delete.title` | Delete this session type? |
| `settings.sessionTypes.confirm.delete.body` | Existing sessions that used it will keep their saved value. |
| `settings.sessionTypes.confirm.delete.confirm` | Delete type |
| `session.type.remote` | Remote |
| `session.type.proxy` | Proxy |

> **Hebrew RTL note (adjacent to engine's D-07):** the tab/editor CHROME strings are plain text and need no `<bdo>`. That LTR-wrap only applies to numeric DATE strings (engine lane). No RTL special-casing in my surface beyond what existing settings tabs already handle.

**Confidence: HIGH** on key structure; **MEDIUM** on the exact he/de/cs translations (need native review — flag as `[ASSUMED]` translations pending Sapir/Ben confirmation).

---

## 9. Validation Architecture (my lane — nyquist_validation: true)

Follow `tests/30-settings-tabnav.test.js` (jsdom real-page, capture DOMContentLoaded handler by stable-identity substring, assert OBSERVABLE state, end-of-file count guard) and `tests/30-settings-section-roundtrip.test.js` (mock `PortfolioDB` mirrors writes into reads for a genuine round-trip). Behavior tests (author BEFORE implementation, per memory `feedback-behavior-verification`):

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in `assert` + `jsdom` (no test runner); each file self-executes, `process.exit(failed?1:0)` |
| Quick run | `node tests/<file>.test.js` |
| Full suite | the repo's test-all script (all `tests/*.test.js`) |

### Requirements → Test Map (my lane)
| Behavior | Test type | Command | Wave 0? |
|---|---|---|---|
| Personalization tab appears + `?tab=personalize` deep-links + invalid falls back | jsdom real-page (extend `30-settings-tabnav` whitelist test) | `node tests/30-settings-tabnav.test.js` | extend existing (bump `EXPECTED_COUNT`) |
| Date-format picker persists to `localStorage["portfolioDateFormat"]` + survives reload; default `"auto"` when unset | jsdom + localStorage spy | `node tests/37-dateformat-picker.test.js` | ❌ new (Wave 0) |
| Picker `change` fires `app:dateformat` (propagation seam) | jsdom event spy | same file | ❌ new |
| F4 add custom type → persists; rename default → override persists + resolves app-wide (D-16); delete custom → gone | jsdom + mock `PortfolioDB` round-trip (model on `30-settings-section-roundtrip`) | `node tests/37-session-types-editor.test.js` | ❌ new |
| Locked row renders lock icon + NO delete button; delete handler rejects a locked key | jsdom DOM assertion | same file | ❌ new |
| `App.formatSessionType` resolves managed label, applies rename, raw-string fallback for unknown key (D-18) | pure unit (no DOM) | `node tests/37-format-session-type.test.js` | ❌ new |
| Session-type cards render from list (5 defaults + custom), selection reads correct key | jsdom on add-session form | same or `37-session-type-cards.test.js` | ❌ new |
| Backup round-trips `dateFormat` + session-type list (export→restore→assert) | jsdom + mock DB (model on backup tests) | `node tests/37-backup-personalization-roundtrip.test.js` | ❌ new |
| Birthdate native input persists + edits correctly (populate-on-edit sets `.value`, read-on-save reads `.value`) | jsdom on add-client form | `node tests/37-birthdate-input.test.js` | ❌ new |

### Sampling
- **Per task commit:** run the touched `tests/37-*.test.js`.
- **Per wave merge:** full suite green.
- **Phase gate:** full suite green before `/gsd-verify-work`.

### Wave 0 gaps (author before implementation)
- [ ] `tests/37-dateformat-picker.test.js`
- [ ] `tests/37-session-types-editor.test.js`
- [ ] `tests/37-format-session-type.test.js`
- [ ] `tests/37-backup-personalization-roundtrip.test.js`
- [ ] `tests/37-birthdate-input.test.js`
- [ ] extend `tests/30-settings-tabnav.test.js` (add `personalize` case; bump `EXPECTED_COUNT` 3→4)
- Reuse helpers: `tests/_helpers/app-stub.js`, `tests/_helpers/mock-portfolio-db.js` (both already exist and are used by the 30-settings tests).

> **NOT my lane:** the TZ-pinned date-correctness tests (D-20), PDF baseline regen (D-19), `jsdom-pdf-env.js` `window.DateFormat` injection (D-21) — engine researcher's Validation Architecture.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Tab nav / ARIA / deep-link | New tab controller | Existing `settings.js` tab-nav IIFE; just add markup + 1 whitelist token | Fully built + tested (`30-settings-tabnav`) |
| Locked-vs-editable row w/ lock icon | Custom lock UI | `settings.js` `LOCKED_RENAME` + `buildInfoIconSvg` pattern | Themed, RTL-safe, a11y-labeled already |
| List CRUD (add/rename/delete/persist) | From scratch | Clone `settings-snippets.js` structure | Handles security (textContent), BroadcastChannel, re-render |
| Global-rename resolver + cache | New cache | `app.js` `_sectionLabelCache` + `getSectionLabel` eager-load pattern | Sync-read, initCommon-loaded, cross-tab-synced |
| Birthdate 3-dropdown localization | Keep/extend dropdowns | Native `<input type="date">` (already the mobile branch) | Browser handles locale ordering; zero JS (D-12) |
| Backup of session types | New export block | Existing `therapistSettings` array in manifest | Already exported wholesale |
| Date example strings in picker | Format dates yourself | Call engine `window.DateFormat` (SEAM) | Single source of truth; avoids drift |

**Key insight:** Nearly every piece of this surface already exists in a sibling feature. The phase is *composition*, not invention — the risk is divergence (re-implementing a pattern slightly differently), not missing capability.

---

## Common Pitfalls

### Pitfall 1: Double-mounting via a second `initCommon`
`settings-snippets.js:1318–1328` documents that registering a second `DOMContentLoaded` handler that ALSO calls `App.initCommon()` double-mounts header chrome. The new session-type IIFE must **boot directly** (like snippets), NOT call `initCommon`.

### Pitfall 2: Reload vs live re-render for date-format
Language change does NOT reload today (`app.js:126` dispatches an event). If the date-format picker triggers a reload, it breaks the established UX and loses form state. Fire `app:dateformat` and let display sites re-render (engine wires them).

### Pitfall 3: Storing materialized defaults
If you persist all 5 defaults into storage, a future default-label change (or a 6th default) won't reach existing users. Store only *deviations* (overrides + custom). Defaults are code (`DEFAULT_TYPES`).

### Pitfall 4: Deleting a locked default
Two-layer guard: (a) don't render a delete button for locked rows, (b) the delete handler early-returns on a `locked:true`/default key. Test both (a green "no button" test alone won't catch a handler regression).

### Pitfall 5: Backup version fear-bump
Additive-optional fields do NOT need a manifest version bump; the restore guards already treat missing fields as "leave as-is." Bumping unnecessarily risks older-app restore rejection.

### Pitfall 6 (SEAM): touching age-math
The birthdate swap is tempting to "fix fully" including `new Date(birthDate)`. That's the engine lane's UTC sweep — changing it here risks colliding with their edits to the same lines (`add-client.js:219`, `add-session.js:473/1027/1428`, `overview.js:620`).

---

## Proposed Requirements (personalization surface)

Advisory only; orchestrator reconciles final IDs.

| ID | Requirement |
|---|---|
| PERS-01 | New "Personalization" Settings tab (button + panel + `?tab=personalize` deep-link + whitelist), translated 4 langs |
| PERS-02 | Date-format `<select>` (6 seam-key options) persists to `localStorage["portfolioDateFormat"]`, default `"auto"`, fires re-render event on change |
| PERS-03 | Two-tier session-type editor: 5 locked defaults (rename + lock icon, no delete), custom types (rename + delete), add-new input; renames global (D-16) |
| PERS-04 | Session-type list stored in IDB `therapistSettings` (`sectionKey:"sessionTypes"`); resolver `App.formatSessionType` resolves overrides + raw fallback (D-18); add-session cards data-driven |
| PERS-05 | Backup export/restore carries `portfolioDateFormat` (scalar) + session-type list (via therapistSettings); no schema bump |
| PERS-06 | Birthdate entry swapped to native `<input type="date">` across add-client + add-session (inline + edit); value plumbing only (age-math parse deferred to engine) |
| PERS-07 | i18n `settings.tab.*` / `settings.dateFormat.*` / `settings.sessionTypes.*` + `session.type.remote|proxy` across en/he/de/cs |
| PERS-08 | Behavior tests (Wave 0) per §9 |

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | Hebrew/German/Czech translations of the new i18n strings (English proposed values only) | §8 | Wrong/awkward translations shipped — mitigate: native review by Sapir/Ben |
| A2 | The backup RESTORE loop writes arbitrary `therapistSettings` rows (so `sessionTypes` restores for free) | §5/§6 | If restore is selective, session types silently lost on restore — planner MUST grep `manifest.therapistSettings` in backup.js restore path |
| A3 | The engine helper `window.DateFormat` exposes a callable that the picker can use to render option example strings | §2 | Picker option labels can't be engine-sourced — coordinate signature with engine plan |
| A4 | `app:dateformat` is the agreed propagation event (vs folding into `app:language`) | §2 | Display sites don't re-render on format change — resolve with engine researcher at plan time |

---

## Open Questions

1. **Restore-loop coverage for `therapistSettings` (A2).** Confirm the restore path writes all rows generically. What we know: export dumps all rows; snippet restore loop is at `backup.js:1192`. What's unclear: whether therapistSettings restore is generic. Recommendation: planner greps `manifest.therapistSettings` in the restore flow; add a `sessionTypes` write if selective.
2. **Propagation event name (A3/A4).** `app:dateformat` (new) vs reuse `app:language`. Recommendation: new dedicated event; engine subscribes. Decide jointly with the engine plan.
3. **Tab position.** First tab vs after "fields". Recommendation: after "fields" (keeps "Custom field names" as the primary, adds Personalization as a natural neighbor). Low-stakes; planner picks.

---

## Sources

### Primary (HIGH confidence) — read directly this session
- `settings.js` (tab-nav IIFE :721–799; locked-row pattern :35/:74/:170–197; backups `<select>` pattern)
- `settings-snippets.js` (full list-CRUD template; double-mount note :1318)
- `settings.html` (tab markup :58–63; panels :65–226; native select/date patterns)
- `app.js` (`formatSessionType` :1207; `initBirthDatePicker` :1251–1372; `getSectionLabel`/`_sectionLabelCache` :38–75/:665; lang/theme localStorage :122/:179; `setLanguage` event :126)
- `add-session.js` (`setupToggleGroup` :1315; type read :729/:1104; edit repopulate :1528; birthdate init :148; age sites :473/:1027/:1428)
- `add-session.html` (session-type cards :77–90; `#sessionDate` :94; birthdate containers :150/:530)
- `add-client.js` (:38 init, :140 populate, :218–219 read+age) / `add-client.html` (:63–65)
- `backup.js` (export settings :594–614; therapistSettings export :642–650; restore settings :1210–1230; snippet restore :1192)
- `db.js` (DB_VERSION 6 :33; therapistSettings store :306–312; snippets store :320)
- `i18n-en.js` (settings.tab.* :422–426; session.type.* :272–274; session.form.* :104–106; settings.* family :418–457)
- `tests/30-settings-tabnav.test.js`, `tests/30-settings-section-roundtrip.test.js` (test patterns)
- `.planning/config.json` (`nyquist_validation: true`)

## Metadata
- Standard stack: HIGH — zero new deps, all in-repo patterns verified
- Architecture: HIGH — every insertion point read + line-verified
- Storage recommendation: HIGH mechanism / MEDIUM restore-loop coverage (A2)
- i18n: HIGH structure / MEDIUM translations (A1)
- **Research date:** 2026-07-02 · **Valid until:** ~2026-08-01 (stable vanilla codebase)
