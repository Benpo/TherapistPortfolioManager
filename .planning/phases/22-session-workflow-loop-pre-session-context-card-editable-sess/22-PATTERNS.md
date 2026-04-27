# Phase 22: Session Workflow Loop — Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 16 (6 new, 10 modified)
**Analogs found:** 14 / 16 (2 vendored libraries — no in-repo analog beyond `jszip.min.js` precedent)

---

## File Classification

| File | New / Modified | Role | Data Flow | Closest Analog | Match Quality |
|------|----------------|------|-----------|----------------|---------------|
| `settings.html` | new | app-page (HTML shell) | request-response (form CRUD) | `sessions.html` + `add-session.html` | exact — same app-page contract |
| `assets/settings.js` | new | page-controller (IIFE-via-DOMContentLoaded) | CRUD | `assets/sessions.js` + `assets/add-session.js` | exact — same controller pattern |
| `assets/pdf-export.js` | new | service module (IIFE returning public API) | transform (data → PDF blob) | `assets/backup.js` (`window.BackupManager`) | exact — same IIFE module pattern |
| `assets/md-render.js` | new | utility (pure function, IIFE) | transform (markdown string → HTML string) | `assets/shared-chrome.js` (`var SharedChrome = (function(){})()`) | role-match — small pure-function utility |
| `assets/jspdf.min.js` | new (vendored) | third-party library | n/a | `assets/jszip.min.js` | exact — vendored-library precedent |
| `assets/fonts/noto-sans-base64.js` | new (vendored data) | font asset (base64 string export) | n/a | `assets/jszip.min.js` (precedent only — no in-repo font-as-JS file) | partial — first of its kind |
| `assets/db.js` | modified | persistence module | CRUD (IndexedDB) | self (existing) | n/a — extend in place |
| `assets/app.js` | modified | shared utility namespace | utility (cache + getter + BroadcastChannel) | self (existing `App.initCommon`) | n/a — extend in place |
| `assets/add-session.js` | modified | page controller | mixed (form rendering + clipboard + new modal trigger) | self (existing `buildSessionMarkdown`, `copySessionBtn` handler) | n/a — extend in place |
| `add-session.html` | modified | app-page (HTML) | request-response | self (existing `.session-header-actions`, `confirmModal`) | n/a — extend in place |
| `assets/backup.js` | modified | data export/import | file-I/O + transform | self (existing `exportBackup` / `importBackup`) | n/a — extend in place |
| `assets/shared-chrome.js` | modified | shared chrome | request-response | self | n/a — extend in place |
| `sw.js` | modified | service worker | network/cache | self | n/a — bump CACHE_NAME, append PRECACHE_URLS |
| `assets/i18n-en.js` / `-de.js` / `-he.js` / `-cs.js` | modified | i18n dictionaries | data (key → string) | self (existing `session.form.*` keys) | n/a — append new keys |
| `assets/app.css` (or new `assets/settings.css`) | modified | stylesheet | n/a | self (existing `.modal`, `.toggle-switch`, `.toggle-card`) | n/a — extend in place |

---

## Pattern Assignments

### `settings.html` (new app-page, request-response)

**Analog:** `sessions.html` (closest match — read-modify-write app page, identical chrome) + `add-session.html` (for the modal markup pattern).

**License gate + TOC gate + theme + meta + chrome** — copy verbatim from `sessions.html` lines 1-46. Change only `<body data-nav="settings">`.

```html
<!doctype html>
<html lang="en">
<head>
  <script>
    (function(){try{if(window.name==='demo-mode')return;if(!localStorage.getItem('portfolioTermsAccepted')){var n=encodeURIComponent(window.location.pathname+window.location.search);var l=localStorage.getItem('portfolioLang')||'en';var d=(l==='de')?'./disclaimer.html':'./disclaimer-'+l+'.html';window.location.replace(d+'?next='+n);}}catch(e){}})();
  </script>
  <script>
    (function(){try{if(window.name==='demo-mode')return;if(localStorage.getItem('portfolioTermsAccepted')&&(!localStorage.getItem('portfolioLicenseActivated')||!localStorage.getItem('portfolioLicenseInstance'))){window.location.replace('./license.html');}}catch(e){}})();
  </script>
  <script>
    (function(){try{var t=localStorage.getItem('portfolioTheme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();
  </script>
  <meta charset="utf-8" />
  <link rel="icon" type="image/png" sizes="32x32" href="./assets/branding/favicon-32.png">
  <link rel="icon" type="image/x-icon" href="./assets/branding/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="./assets/branding/icon-180.png">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.lemonsqueezy.com; font-src 'self'">
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sessions Garden</title>
  <link rel="stylesheet" href="./assets/tokens.css" />
  <link rel="stylesheet" href="./assets/app.css" />
  <link rel="manifest" href="./manifest.json" />
</head>
<body data-nav="settings">
  <div class="app-shell">
    <div class="container">
      <header class="app-header"> ... (copy brand block from sessions.html:27-46) </header>
```

**Footer scripts block** — copy from `sessions.html:93-107`. Add `<script src="./assets/settings.js"></script>` instead of `sessions.js`. Keep the SW registration block verbatim.

**Sticky bottom action bar pattern** — no in-repo sticky-bottom-action-bar exists; UI-SPEC dictates new CSS using existing tokens (`var(--color-surface)`, `var(--color-border-soft)`, `var(--color-modal-shadow)`). No analog code excerpt.

**Confirm modal markup for "Discard changes?"** — reuse the existing `#confirmModal` from `add-session.html:352-362`:

```html
<div id="confirmModal" class="modal is-hidden" role="dialog" aria-modal="true" aria-labelledby="confirmTitle" aria-describedby="confirmMessage">
  <div class="modal-overlay"></div>
  <div class="modal-card confirm-card">
    <div id="confirmTitle" class="confirm-title"></div>
    <div id="confirmMessage" class="confirm-body"></div>
    <div class="modal-actions confirm-actions">
      <button class="button ghost" type="button" id="confirmCancelBtn" data-i18n="confirm.cancel">Cancel</button>
      <button class="button danger" type="button" id="confirmOkBtn" data-i18n="confirm.delete">Delete</button>
    </div>
  </div>
</div>
```

`App.confirmDialog({ titleKey, messageKey })` (analog: `assets/app.js:300-346`) handles open/close/scroll-lock — already wired against `#confirmModal`. Do not duplicate the modal — include it once and call `App.confirmDialog` from `settings.js`.

---

### `assets/settings.js` (new page controller, CRUD)

**Analog:** `assets/sessions.js` (filter-and-render contract) — closest analog because it also reads from IDB on load, applies translations, listens for `app:language` re-render. Combine with the dirty-tracking + form-save pattern from `assets/add-session.js`.

**Module entry — DOMContentLoaded + initCommon** (from `assets/sessions.js:1-3, 163-169`):

```javascript
document.addEventListener("DOMContentLoaded", async () => {
  App.initCommon();

  // ... capture DOM refs, wire events, do initial render ...

  await loadInitialData();
  await render();

  document.addEventListener("app:language", async () => {
    await render();   // re-translate visible labels on language switch
  });
});
```

**Dirty-tracking pattern** (from `assets/add-session.js:5-6, 58-66`) — apply directly to the Settings form:

```javascript
let formDirty = false;
let formSaving = false;

if (settingsForm) {
  settingsForm.addEventListener("input",  () => { formDirty = true; });
  settingsForm.addEventListener("change", () => { formDirty = true; });
}
window.addEventListener("beforeunload", (e) => {
  if (formDirty && !formSaving) { e.preventDefault(); }
});
```

**Save handler — call `App.confirmDialog` for destructive cases** (from `assets/app.js:300-346`):

```javascript
const ok = await App.confirmDialog({
  titleKey: "settings.discard.title",
  messageKey: "settings.discard.body",
  confirmKey: "settings.discard.confirm",
  cancelKey:  "settings.discard.cancel",
});
if (!ok) return;
```

**BroadcastChannel sender (D-11)** — no in-repo precedent; sketch directly:

```javascript
const channel = new BroadcastChannel("sessions-garden-settings");
// after successful save:
channel.postMessage({ type: "therapist-settings-changed", at: Date.now() });
// on unload:
window.addEventListener("beforeunload", () => channel.close());
```

**Toast on save** (from `assets/app.js:282-289` + every existing call site like `assets/add-session.js:712`):

```javascript
App.showToast("", "settings.saved.toast");
```

---

### `assets/pdf-export.js` (new service module, transform)

**Analog:** `assets/backup.js` — closest analog because it's a service module returning a public API namespace, builds binary blobs (ZIP, .sgbackup), triggers downloads, and lazy-uses a vendored library (JSZip) loaded via `<script>` tag. The exact same shape applies to PDF.

**IIFE module skeleton** (from `assets/backup.js:1-16, 740-755`):

```javascript
/**
 * pdf-export.js — PDF generation module
 *
 * Builds a client-facing PDF from a session record + edited markdown.
 * Encapsulates jsPDF + Noto Sans / Noto Sans Hebrew base64 fonts.
 *
 * Exposes: window.PDFExport
 *
 * Dependencies (loaded lazily on first Export click via dynamic <script>):
 *   - jspdf.min.js                       (jsPDF UMD build)
 *   - fonts/noto-sans-base64.js          (Latin + extended diacritics)
 *   - fonts/noto-sans-hebrew-base64.js   (Hebrew, R2L)
 */
window.PDFExport = (function () {
  "use strict";

  // ... private helpers (lazy-load gate, font registration, slugify) ...

  async function buildSessionPDF(sessionData, opts) { /* ... */ }
  function triggerDownload(blob, filename) { /* same as backup.js:429-441 */ }

  return {
    buildSessionPDF: buildSessionPDF,
    triggerDownload: triggerDownload,
  };
})();
```

**Lazy-load vendored script pattern** — no exact analog exists, but follow how `assets/app.js:266-270` injects `demo-hints.js`:

```javascript
function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="' + src + '"]')) return resolve();
    var s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.body.appendChild(s);
  });
}
// First call from Export modal:
await loadScriptOnce('./assets/jspdf.min.js');
await loadScriptOnce('./assets/fonts/noto-sans-base64.js');
await loadScriptOnce('./assets/fonts/noto-sans-hebrew-base64.js');
```

**Trigger PDF download** — copy verbatim from `assets/backup.js:429-441`:

```javascript
function triggerDownload(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
}
```

**Filename slugify (D-04: ASCII-only, no diacritics, no spaces)** — no in-repo analog. Sketch:

```javascript
function slugify(name) {
  return (name || "client")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")  // strip diacritics
    .replace(/[^\w]+/g, "")                              // ASCII word chars only
    || "client";
}
// → "AnnaM_2026-04-27.pdf"
```

---

### `assets/md-render.js` (new utility, transform)

**Analog:** `assets/shared-chrome.js:5-105` — a small IIFE returning a tiny public surface. No existing markdown parser in the repo; this file is the first of its kind, but its **shape** mirrors `SharedChrome`.

**IIFE skeleton** (from `assets/shared-chrome.js:5-7, 95-104`):

```javascript
/**
 * md-render.js — minimal Markdown → HTML renderer for the export preview pane.
 * Supports: # / ## / ### / **bold** / *italic* / line breaks / - lists.
 * No external dependencies. No setInnerHTML on untrusted input — output is
 * piped into a sandboxed preview <div> that the user controls.
 */
var MdRender = (function () {
  'use strict';

  function escape(s) { /* HTML-escape & < > " ' */ }
  function render(markdown) { /* regex pipeline producing safe HTML */ }

  return {
    render: render,
  };
})();
```

The **rendering rules** are dictated by `22-UI-SPEC.md` (h1 → 22px/600/1.25; h2 → 16px/600 with bottom border; h3 → 14px/600; bold inline → 600 weight; lists with muted bullets). Plan-phase will spell out the regex pipeline; this PATTERNS file only locks the module shape.

---

### `assets/jspdf.min.js` (new vendored library)

**Analog:** `assets/jszip.min.js` — only in-repo precedent for a vendored runtime library. Same handling expected:

- Dropped at `assets/` root, named `<lib>.min.js`.
- Listed in `sw.js` `PRECACHE_URLS` (analog: `sw.js:23`).
- Loaded as a `<script>` tag — but **lazy** in this case (D-03: dynamic append on first Export click) rather than eager `<script src=...>` tag in HTML head.
- No package manifest — vendored byte-for-byte from upstream.

No code excerpt; this is a build artifact.

---

### `assets/fonts/noto-sans-base64.js` + `noto-sans-hebrew-base64.js` (new font assets)

**Analog:** None in-repo. Closest precedent is the WOFF2 fonts at `assets/fonts/Rubik-*.woff2` (loaded via `@font-face` in `assets/tokens.css:1-22`), but those are binary files served via CSS, not base64 strings exported by JS.

Lock the file contract in plan-phase: each file exports a single base64 string on `window.NotoSans` / `window.NotoSansHebrew` so `PDFExport.buildSessionPDF` can register the font with jsPDF's `addFileToVFS` + `addFont` APIs. Subset-to-glyph-range happens at vendoring time (offline tool), not at runtime.

---

### `assets/db.js` (modified)

**Analog:** self — extend the existing migration ladder.

**DB version bump + new store** — copy the migration-3 pattern at `assets/db.js:215-247` and add migration 4:

```javascript
const DB_VERSION = 4;   // was 3

const MIGRATIONS = {
  1: function initializeSchema(db) { /* unchanged */ },
  2: function expandDataModel(db, transaction) { /* unchanged */ },
  3: function heartShieldRedesign(db, transaction) { /* unchanged */ },
  4: function therapistSettingsStore(db /*, transaction */) {
    // No-op for existing data — just create the new store.
    if (!db.objectStoreNames.contains("therapistSettings")) {
      db.createObjectStore("therapistSettings", { keyPath: "sectionKey" });
    }
  },
};
```

**Public API additions** — mirror the shape of existing `getAllSessions`, `addSession`, etc. at `assets/db.js:431-440`:

```javascript
async function getAllTherapistSettings() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("therapistSettings", "readonly");
    const store = tx.objectStore("therapistSettings");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror   = () => reject(request.error);
  });
}

async function setTherapistSetting(record) {
  return withStore("therapistSettings", "readwrite", (store) => store.put(record));
}

async function clearTherapistSettings() {
  return withStore("therapistSettings", "readwrite", (store) => store.clear());
}
```

Then add to the returned object at `assets/db.js:486-499`:

```javascript
return {
  ...existing...,
  getAllTherapistSettings,
  setTherapistSetting,
  clearTherapistSettings,
};
```

**`clearAll`** — extend `assets/db.js:446-449` to also clear the new store on backup-restore:

```javascript
async function clearAll() {
  await clearStore("sessions");
  await clearStore("clients");
  await clearStore("therapistSettings");
}
```

---

### `assets/app.js` (modified — `App.getSectionLabel`, eager cache, BroadcastChannel listener)

**Analog:** self — extend the existing `App` namespace and `App.initCommon`.

**In-memory cache + getter** (insert near the i18n block at `assets/app.js:14-32`):

```javascript
// Section label cache: { sectionKey -> { customLabel, enabled } }
let _sectionLabelCache = new Map();

function getSectionLabel(sectionKey, defaultI18nKey) {
  const entry = _sectionLabelCache.get(sectionKey);
  if (entry && entry.customLabel) return entry.customLabel;
  return t(defaultI18nKey);   // fall back to current-UI-language i18n default
}

function isSectionEnabled(sectionKey) {
  const entry = _sectionLabelCache.get(sectionKey);
  return entry ? entry.enabled !== false : true;   // default to enabled
}
```

**Eager-load cache during `initCommon`** (extend `assets/app.js:241-271`). Insert before `setLanguage(savedLang)`:

```javascript
async function initCommon() {
  initDemoMode();
  renderNav();
  initThemeToggle();
  initLanguagePopover();

  // Phase 22: load therapist settings into in-memory cache before any page-specific JS runs.
  try {
    const rows = await PortfolioDB.getAllTherapistSettings();
    _sectionLabelCache = new Map(rows.map(r => [r.sectionKey, r]));
  } catch (err) {
    console.warn("Therapist settings unavailable:", err);
  }

  // Phase 22: cross-tab sync via BroadcastChannel
  if (typeof BroadcastChannel !== "undefined") {
    const ch = new BroadcastChannel("sessions-garden-settings");
    ch.addEventListener("message", async (e) => {
      if (e.data && e.data.type === "therapist-settings-changed") {
        const rows = await PortfolioDB.getAllTherapistSettings();
        _sectionLabelCache = new Map(rows.map(r => [r.sectionKey, r]));
        document.dispatchEvent(new CustomEvent("app:settings-changed"));
      }
    });
  }

  const savedLang = localStorage.getItem("portfolioLang") || window.I18N_DEFAULT || "en";
  setLanguage(savedLang);
  // ... rest unchanged ...
}
```

**Public API export** — append to the return block at `assets/app.js:780-817`:

```javascript
return {
  ...existing...,
  getSectionLabel,
  isSectionEnabled,
};
```

---

### `assets/add-session.js` (modified — `buildSessionMarkdown` reads custom labels, conditional section render, Export button)

**Analog:** self — extend the existing `buildSessionMarkdown` function and the `copySessionBtn` click handler.

**Replace hardcoded i18n calls with `App.getSectionLabel`** — change every section-label call in `assets/add-session.js:642-679`:

Before (line 663):
```javascript
lines.push("", `## ${stripRequired(App.t("session.form.trapped"))}`, trappedValue);
```

After:
```javascript
lines.push("", `## ${stripRequired(App.getSectionLabel("trapped", "session.form.trapped"))}`, trappedValue);
```

Apply identically to `limitingBeliefs`, `additionalTech`, `insights`, `comments`, `nextSession`, `heartShieldEmotions`, `issuesHeading` (line 650) — every section heading.

**Conditional section render** — wrap each section's render in `App.isSectionEnabled(key)` (with edit-mode-with-data fallback per REQ-5). Plan-phase decomposes this; the pattern is:

```javascript
function shouldRenderSection(sectionKey, hasStoredData, isEditMode) {
  if (App.isSectionEnabled(sectionKey)) return { render: true, indicator: false };
  if (isEditMode && hasStoredData)      return { render: true, indicator: true };
  return { render: false, indicator: false };
}
```

**New Export button click handler** — mirror the existing Copy MD handler at `assets/add-session.js:708-714`:

```javascript
const exportSessionBtn = document.getElementById("exportSessionBtn");
if (exportSessionBtn) {
  exportSessionBtn.addEventListener("click", () => {
    const initialMarkdown = buildSessionMarkdown();
    openExportDialog(initialMarkdown, /* sessionMeta */ { /* ... */ });
  });
}
```

`openExportDialog` is a new function in this file (or extracted to its own module) that wires the 3-step modal — its modal scaffolding follows the modal-card pattern at `add-session.html:352-362` and `assets/app.css:1333-1373`.

---

### `add-session.html` (modified)

**Analog:** self.

**Add Export button to `.session-header-actions`** (extend `add-session.html:51-59`):

```html
<div class="session-header-actions">
  <button class="button ghost icon-inline is-hidden" type="button" id="copySessionBtn">
    <span class="button-label" data-i18n="session.copyAll">Copy Session (MD)</span>
    <span class="button-icon" aria-hidden="true">&#128203;</span>
  </button>
  <button class="button icon-inline is-hidden" type="button" id="exportSessionBtn">  <!-- NEW -->
    <span class="button-label" data-i18n="session.export">Export</span>
    <span class="button-icon" aria-hidden="true">&#128228;</span>
  </button>
  <button class="icon-button is-hidden" type="button" id="editSessionBtn">
    <span aria-hidden="true">&#9998;</span>
  </button>
</div>
```

**Wrap each section with `data-section-key`** for hide/show + indicator badge — extend the markup at `add-session.html:206-296` so `add-session.js` can hide/show by enabled-state. Example for the trapped block at line 222-228:

```html
<div class="session-section" data-section-key="trapped">
  <div class="form-field">
    <label class="label-row">
      <span class="label" data-i18n="session.form.trapped">Trapped Emotions Released</span>
      <button class="icon-button field-copy" type="button" data-copy-target="trappedEmotions">...</button>
    </label>
    <textarea class="textarea session-textarea" id="trappedEmotions" data-i18n-placeholder="session.form.trapped.placeholder"></textarea>
    <span class="disabled-indicator-badge is-hidden" data-i18n="settings.indicator.disabled">Disabled in Settings</span>
  </div>
</div>
```

**Add the Export modal markup** alongside the existing `#confirmModal` block (`add-session.html:352-362`). The new modal uses the same `.modal` / `.modal-overlay` / `.modal-card` shell — UI-SPEC dictates the inner 3-step structure. Match the ARIA pattern of the existing modal:

```html
<div id="exportModal" class="modal is-hidden" role="dialog" aria-modal="true" aria-labelledby="exportTitle">
  <div class="modal-overlay"></div>
  <div class="modal-card export-card">
    <button class="modal-close" id="exportClose" aria-label="Close"></button>
    <h3 id="exportTitle" class="modal-title" data-i18n="export.title">Export Session</h3>
    <!-- step indicator + step bodies — see UI-SPEC layout -->
  </div>
</div>
```

**Footer scripts block** — register the new controllers (extend `add-session.html:438-450`):

```html
<script src="./assets/md-render.js"></script>
<!-- pdf-export.js + jspdf.min.js + font assets are LAZY loaded by add-session.js, NOT script-tagged here -->
<script src="./assets/add-session.js"></script>
```

---

### `assets/backup.js` (modified — round-trip therapistSettings, backward-compat)

**Analog:** self.

**Manifest version bump + new key** — extend the manifest at `assets/backup.js:391-401`:

```javascript
var allClients          = await db.getAllClients();
var allSessions         = await db.getAllSessions();
var allTherapistSettings = await db.getAllTherapistSettings();   // NEW

// ...

var manifest = {
  version: 2,                              // bump from 1 → 2
  exportedAt: new Date().toISOString(),
  appVersion: "1.0",
  clients: clientsClean,
  sessions: allSessions,
  therapistSettings: allTherapistSettings, // NEW
  settings: {
    language: localStorage.getItem("portfolioLang"),
    theme:    localStorage.getItem("portfolioTheme"),
  },
};
```

**Backward-compat normalization** — extend `normalizeManifest` at `assets/backup.js:326-343`:

```javascript
function normalizeManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Invalid backup manifest");
  }
  // Pre-Phase-22 backups (version 0 or 1) have no therapistSettings — apply default.
  if (!manifest.therapistSettings) {
    manifest.therapistSettings = [];   // empty == defaults applied silently
  }
  if (!manifest.version) {
    return {
      version: 0,
      exportedAt: manifest.exportedAt || null,
      appVersion: manifest.appVersion || null,
      clients:  manifest.clients  || [],
      sessions: manifest.sessions || [],
      therapistSettings: [],   // explicit empty
      settings: manifest.settings || null,
    };
  }
  return manifest;
}
```

**Restore loop** — extend the loop at `assets/backup.js:599-604`:

```javascript
for (var i = 0; i < manifest.clients.length;  i++) await db.addClient(manifest.clients[i]);
for (var j = 0; j < manifest.sessions.length; j++) await db.addSession(manifest.sessions[j]);
for (var k = 0; k < manifest.therapistSettings.length; k++) {
  await db.setTherapistSetting(manifest.therapistSettings[k]);   // NEW
}
```

`db.clearAll()` at line 597 already clears `therapistSettings` thanks to the `db.js` change above — no second call needed.

---

### `assets/shared-chrome.js` (modified — gear icon entry)

**Analog:** self + `assets/app.js:111-183` (`initLanguagePopover` — closest analog for "mount a control button into `#headerActions`").

**Where to mount:** UI-SPEC says the gear icon mounts in the `header-actions` area between theme-toggle and license-key. The simplest path is to add a new `App.initSettingsLink()` in `assets/app.js` (mirror `initLicenseLink` at `assets/app.js:224-235`) and call it from `initCommon`. Excerpt to mirror:

```javascript
function initSettingsLink() {
  var actions = document.getElementById('headerActions') || document.querySelector('.header-actions');
  if (!actions) return;
  var link = document.createElement('a');
  link.href = './settings.html';
  link.className = 'header-control-btn settings-gear-btn';
  link.setAttribute('aria-label', t('header.settings.label') || 'Settings');
  link.setAttribute('title',     t('header.settings.label') || 'Settings');
  link.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><!-- 8-cog gear path --></svg>';
  actions.appendChild(link);
}
```

Active-state (`.is-active` when on `settings.html`) — gate via `document.body.dataset.nav === "settings"` (matches the existing `data-nav="sessions"` pattern at `sessions.html:24`).

---

### `sw.js` (modified — bump CACHE_NAME, append PRECACHE_URLS)

**Analog:** self.

**Cache version bump** (line 12):

```javascript
const CACHE_NAME = 'sessions-garden-v50';   // was v49 — confirm latest at execution time
```

**Append new assets to PRECACHE_URLS** (extend the array at `sw.js:19-57`):

```javascript
const PRECACHE_URLS = [
  // ... existing entries ...
  '/assets/settings.js',                       // NEW
  '/assets/pdf-export.js',                     // NEW
  '/assets/md-render.js',                      // NEW
  '/assets/jspdf.min.js',                      // NEW (vendored)
  '/assets/fonts/noto-sans-base64.js',         // NEW (font data)
  '/assets/fonts/noto-sans-hebrew-base64.js',  // NEW (font data)
];
```

**Append new HTML page to PRECACHE_HTML** (extend `sw.js:74-94`):

```javascript
const PRECACHE_HTML = [
  '/',
  '/license',
  '/reporting',
  '/sessions',
  '/add-session',
  '/add-client',
  '/settings',     // NEW
  '/demo',
  // ... legal pages unchanged ...
];
```

---

### `assets/i18n-en.js` / `-de.js` / `-he.js` / `-cs.js` (modified)

**Analog:** self — append new keys to each of the 4 dictionaries.

**Append pattern** (matches existing `session.form.*` block at `assets/i18n-en.js:96-145`):

```javascript
window.I18N.en = {
  // ... existing keys ...

  // Phase 22 — Settings page
  "header.settings.label": "Settings",
  "settings.page.title": "Settings",
  "settings.page.helper": "Customize section names and choose which sections appear in your sessions. Changes are saved on this device.",
  "settings.syncMessage.heading": "About saved settings",
  "settings.syncMessage.body": "Saved labels appear immediately here. Open session forms will pick up the new labels on next page navigation. Refresh other tabs to see changes immediately.",
  "settings.row.trapped.description": "Released emotions logged during the session",
  // ... per-row description keys for the other 8 sections ...
  "settings.indicator.disabled": "Disabled in Settings",
  "settings.discard.title": "Discard unsaved changes?",
  "settings.discard.body":  "Your renames and toggles won't be saved.",
  "settings.discard.confirm": "Yes, discard",
  "settings.discard.cancel":  "Keep editing",
  "settings.saved.toast": "Settings saved",
  "settings.rename.tooLong": "Section name is too long. Maximum 60 characters.",
  "settings.rename.empty":   "Enter a name or leave blank to use the default.",

  // Phase 22 — Export modal
  "session.export": "Export",
  "export.title": "Export Session",
  "export.step1.title": "Choose sections",
  "export.step2.title": "Edit document",
  "export.step3.title": "Get document",
  "export.translate.cta": "Translate via Google",
  "export.translate.tooltip": "Opens translate.google.com in a new tab with the current text",
  "export.discard.title": "Discard your edits?",
  "export.discard.yes":   "Yes, discard",
  "export.discard.no":    "Keep editing",
  "export.pdf.failed":    "Could not generate PDF. Try again, or download Markdown instead.",
  "export.empty.body":    "This session has no content yet. Save the session first.",
  "export.download.pdf": "Download PDF",
  "export.download.md":  "Download Markdown",
  "export.share":        "Share via device",
  // ... etc per UI-SPEC Copywriting Contract ...
};
```

Replicate every key in `i18n-de.js`, `i18n-he.js`, `i18n-cs.js` with the localized values from `22-UI-SPEC.md` Copywriting Contract table. The 4 dictionaries are kept perfectly key-aligned by convention (Phase 14 standard).

---

### `assets/app.css` (or new `assets/settings.css`) (modified)

**Analog:** existing modal CSS at `assets/app.css:1333-1373` and `.toggle-switch` at `assets/app.css:1604-1648`.

**Modal scaffolding** — already covered. New CSS rules in this phase:

- `.export-card` — extends `.modal-card`; UI-SPEC width `min(720px, 92vw)`. Existing `.modal-card` already declares this — no change needed.
- `.export-step-indicator` — new, no analog. UI-SPEC dictates dot/connector layout.
- `.export-output-card` — new card style for the 3 download/share rows. Closest analog: existing `.toggle-card` (`assets/app.css:934`-area) — reuse hover lift and `border-radius: 16px`.
- `.disabled-indicator-badge` — new pill component. Closest analog: existing `.heartwall-badge` at `assets/app.css:863`-area (similar pill shape).
- `.settings-row` — new card row. Closest analog: existing `.card` block (Settings rows reuse `var(--color-surface)`, `var(--color-border-soft)`, `border-radius: 16px`).
- `.settings-info-banner` — new sticky info banner. Closest analog: `.backup-reminder-banner` style (existing `.backup-banner` block in app.css; declared via `assets/app.js:476-540`).
- `.settings-gear-btn` — new header button. Closest analog: existing `.header-control-btn` (`assets/app.css:126`-area), `.lang-globe-btn`, `.theme-toggle`. Inherit base size 36×36; UI-SPEC ensures 44px tap target via global rule at `assets/app.css:1147-1154`.

All new CSS MUST use logical properties (`padding-inline`, `inset-inline-start`) per Phase 18 standard — see existing `assets/app.css:1408, 1631, 1652` for canonical examples:

```css
/* From app.css — copy this property style */
.modal-close { inset-inline-end: 1rem; }
.toggle-slider::before { inset-inline-start: 3px; }
.heart-shield-conditional { padding-inline-start: 0.75rem; border-inline-start: 3px solid var(--color-primary); }
```

Plan-phase / executor decides whether to extend `app.css` in place or split into `assets/settings.css`. UI-SPEC implies a separate file is acceptable; SW `PRECACHE_URLS` must include it if so.

---

## Shared Patterns

### Pattern 1 — License gate + TOC gate + theme inline scripts

**Source:** `sessions.html:1-12`, `add-session.html:4-12`, `reporting.html:4-12` (identical block on every app page).
**Apply to:** `settings.html` only (the new app page).

```html
<script>
  (function(){try{if(window.name==='demo-mode')return;if(!localStorage.getItem('portfolioTermsAccepted')){var n=encodeURIComponent(window.location.pathname+window.location.search);var l=localStorage.getItem('portfolioLang')||'en';var d=(l==='de')?'./disclaimer.html':'./disclaimer-'+l+'.html';window.location.replace(d+'?next='+n);}}catch(e){}})();
</script>
<script>
  (function(){try{if(window.name==='demo-mode')return;if(localStorage.getItem('portfolioTermsAccepted')&&(!localStorage.getItem('portfolioLicenseActivated')||!localStorage.getItem('portfolioLicenseInstance'))){window.location.replace('./license.html');}}catch(e){}})();
</script>
<script>
  (function(){try{var t=localStorage.getItem('portfolioTheme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();
</script>
```

These three blocks must appear before any other `<head>` content, in order, on `settings.html`. Do not modify them.

---

### Pattern 2 — App page chrome + brand block

**Source:** `sessions.html:24-46` (canonical brand + nav-placeholder + header-actions block).
**Apply to:** `settings.html`.

```html
<body data-nav="settings">
  <div class="app-shell">
    <div class="container">
      <header class="app-header">
        <a href="./index.html" class="brand brand-link" style="text-decoration:none;color:inherit;">
          <div class="brand-mark"> <!-- leaf SVG, copy verbatim --> </div>
          <div>
            <div class="brand-title">Sessions Garden</div>
            <div class="brand-subtitle" data-i18n="app.subtitle">...</div>
          </div>
        </a>
        <div id="nav-placeholder"></div>
        <div class="header-actions" id="headerActions"></div>
      </header>
```

`App.initCommon()` populates `#nav-placeholder` and `#headerActions`. Do not hand-write nav links — let `renderNav` (`assets/app.js:59-78`) handle it. Add `nav.settings` i18n key for `renderNav` to pick up if a sidebar entry is desired (CONTEXT.md says the gear icon is the entry, not a nav link — so i18n key `header.settings.label` is the one that matters).

---

### Pattern 3 — Page footer scripts block

**Source:** `sessions.html:93-107`, `reporting.html:84-95`, `add-session.html:438-450` (always identical structure: i18n files → i18n.js → db.js → shared-chrome.js → app.js → page-specific JS → SW registration).
**Apply to:** `settings.html`.

```html
<div id="toast" class="toast" aria-live="polite"></div>

<script src="./assets/i18n-en.js"></script>
<script src="./assets/i18n-he.js"></script>
<script src="./assets/i18n-de.js"></script>
<script src="./assets/i18n-cs.js"></script>
<script src="./assets/i18n.js"></script>
<script src="./assets/db.js"></script>
<script src="./assets/shared-chrome.js"></script>
<script src="./assets/app.js"></script>
<script src="./assets/settings.js"></script>
<script>
  if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(e){console.warn('SW registration failed:',e)});});}
</script>
```

Same script-load order on `add-session.html`. The Export modal's lazy `pdf-export.js` is **NOT** a script tag here — it's loaded at runtime by `add-session.js` (D-03).

---

### Pattern 4 — IIFE module returning public API

**Source:** Every JS file in the project. Three canonical examples:

- `assets/app.js:1, 780-818` — `window.App = (() => { ... return { t, applyTranslations, ... }; })();`
- `assets/db.js:1, 486-500` — `window.PortfolioDB = (() => { ... return { addClient, getAllClients, ... }; })();`
- `assets/backup.js:15, 740-755` — `window.BackupManager = (function () { ... return { exportBackup, importBackup, ... }; })();`
- `assets/shared-chrome.js:5-6, 95-105` — `var SharedChrome = (function() { ... return { ... }; })();`

**Apply to:** `assets/settings.js`, `assets/pdf-export.js`, `assets/md-render.js`.

The pattern is rigid: no exports/imports, no globals leaked, single namespace assignment at the end of the IIFE.

---

### Pattern 5 — `data-i18n` + `App.applyTranslations`

**Source:** Every HTML page; `assets/app.js:14-32` defines `t()` + `applyTranslations()`. Used everywhere — e.g. `add-session.html:50, 54, 64, 65, 66, 70, 74, 78`.
**Apply to:** all new HTML markup in `settings.html` and the export modal markup in `add-session.html`.

```html
<span class="label" data-i18n="settings.row.trapped.description">Released emotions logged during the session</span>
<input class="input" data-i18n-placeholder="settings.rename.placeholder">
```

**Re-translate on language switch:** every page controller listens for the `app:language` event (canonical: `assets/sessions.js:166-169`):

```javascript
document.addEventListener("app:language", async () => {
  await render();   // reapplies translations + re-resolves custom labels
});
```

Settings page must additionally listen for `app:settings-changed` (new event from `app.js` BroadcastChannel listener) to swap labels when the user saves changes in another tab.

---

### Pattern 6 — Modal scaffolding (Phase 21 contract)

**Source:** `add-session.html:332-362` + `assets/app.css:1333-1373` + `assets/app.js:300-346` (`confirmDialog` + `lockBodyScroll`/`unlockBodyScroll` at lines 764-778).
**Apply to:** the new Export modal in `add-session.html` (3-step flow per UI-SPEC).

Markup scaffold (matches `confirmModal`):

```html
<div id="exportModal" class="modal is-hidden" role="dialog" aria-modal="true" aria-labelledby="exportTitle">
  <div class="modal-overlay"></div>
  <div class="modal-card export-card">
    <button class="modal-close" id="exportClose" aria-label="Close"></button>
    <h3 id="exportTitle" class="modal-title">...</h3>
    <div class="modal-card-body"> <!-- step content scrolls --> </div>
    <div class="modal-card-actions"> <!-- pinned action bar --> </div>
  </div>
</div>
```

Open/close handler — mirror `confirmDialog` at `assets/app.js:318-345`:

```javascript
modal.classList.remove("is-hidden");
App.lockBodyScroll();
// ... wire confirmBtn, cancelBtn, overlay click, Esc key ...
modal.classList.add("is-hidden");
App.unlockBodyScroll();
```

`.modal-card-body` (overflow-y: auto) and `.modal-card-actions` (flex-shrink: 0) at `assets/app.css:1363-1373` give the pinned-actions-with-scrolling-body contract for free.

---

### Pattern 7 — Trigger blob download

**Source:** `assets/backup.js:429-441` (`triggerDownload`).
**Apply to:** `assets/pdf-export.js` (PDF download), inline in the Export modal handler (Markdown download).

```javascript
function triggerDownload(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
}
```

For the Markdown file: `new Blob([markdownString], { type: "text/markdown;charset=utf-8" })` and pass to the same helper.

---

### Pattern 8 — Toast feedback

**Source:** `assets/app.js:282-289`. Used everywhere — e.g. `assets/add-session.js:712`, `assets/add-session.js:343`, etc.
**Apply to:** Settings save success ("Settings saved"), Settings save failure (existing `toast.errorGeneric`), copy-to-clipboard from Export Step 2 (existing `toast.copied`), MD download success.

```javascript
App.showToast("", "settings.saved.toast");
App.showToast("", "toast.copied");
App.showToast("", "export.pdf.failed");
```

The first arg is fallback text; the second is the i18n key. `t("settings.saved.toast")` is resolved at toast time so it reflects the current UI language.

---

### Pattern 9 — Logical CSS properties (RTL-safe)

**Source:** `assets/app.css:1408, 1631, 1652` — canonical uses of `inset-inline-end`, `inset-inline-start`, `padding-inline-start`, `border-inline-start`. Phase 18 made this the project standard.
**Apply to:** all new CSS in this phase (`.export-step-indicator`, `.export-output-card`, `.disabled-indicator-badge`, `.settings-row`, `.settings-info-banner`, `.settings-gear-btn`).

Example (from `assets/app.css:1650-1654`):

```css
.heart-shield-conditional {
  margin-block-start: 1rem;
  padding-inline-start: 0.75rem;
  border-inline-start: 3px solid var(--color-primary);
}
```

Apply identically — use `padding-inline`, `padding-block`, `inset-inline-start`, `margin-inline-end`. Never use `padding-left`/`padding-right`. The single legacy carve-out is the centering trick at `assets/app.css:1422` (`.modal-close::before`'s `left:50%`) — only because `transform: translate(-50%, -50%)` is direction-neutral.

---

### Pattern 10 — No external network requests at page load

**Source:** Every app page. CSP meta tag at `add-session.html:17` declares `connect-src 'self' https://api.lemonsqueezy.com` only. All assets (fonts, JS, images) are served from `'self'`.
**Apply to:** `settings.html` (copy CSP meta verbatim), `assets/pdf-export.js` (must NOT fetch fonts from Google Fonts — fonts are vendored as base64 strings per D-02).

The Translate shortcut (`export.translate.cta`) opens `translate.google.com` in a **new tab via `target="_blank" rel="noopener noreferrer"`** — it does NOT fetch from `translate.google.com` at runtime. The user's browser follows the link in a new tab; the app makes no HTTP call.

---

## No Analog Found

Files with no close in-repo match. Plan-phase should rely on `22-UI-SPEC.md` and library docs for these:

| File | Role | Reason |
|------|------|--------|
| `assets/jspdf.min.js` | vendored library | First PDF library in the project. Mirror `jszip.min.js` placement convention only — internal API is jsPDF's own. |
| `assets/fonts/noto-sans-base64.js` + `noto-sans-hebrew-base64.js` | font asset (base64 JS) | First base64-as-JS font asset. Existing fonts are WOFF2 served via `@font-face`. The contract (window-global string export, Hebrew RTL via jsPDF `R2L` flag) is locked in CONTEXT.md D-02. |
| Markdown→HTML preview parser logic | utility | No existing parser in repo. UI-SPEC dictates the rendering rules; plan-phase decomposes the regex pipeline. The IIFE module shape is borrowed from `shared-chrome.js`. |
| Step indicator + side-by-side preview layout | CSS | No existing 3-step modal in the project. UI-SPEC is the source of truth. |

---

## Metadata

**Analog search scope:**
- Repo root: `*.html` (8 app pages reviewed)
- `assets/`: 22 JS files + 2 CSS files reviewed
- `.planning/codebase/`: index files (CONVENTIONS.md, STRUCTURE.md, STACK.md noted but not loaded — pattern extraction grounded in actual source)

**Files scanned (in detail):** `sessions.html`, `reporting.html`, `add-session.html`, `assets/app.js`, `assets/db.js`, `assets/sessions.js`, `assets/add-session.js` (lines 1-120, 555-720), `assets/backup.js` (lines 1-200, 320-620, 740-755), `assets/shared-chrome.js`, `assets/app.css` (modal block 1330-1510, button block 390-440, toggle-switch block 1600-1655), `assets/tokens.css`, `assets/i18n-en.js` (sample), `sw.js`.

**Files NOT scanned (deemed unnecessary):** `disclaimer.js`, `license.js`, `landing.js`, `overview.js`, `add-client.js`, `crop.js`, `demo*.js`, `globe-lang.js`, `reporting.js` — none are closer analogs than the files above for the new modules in scope.

**Pattern extraction date:** 2026-04-27

---

## PATTERN MAPPING COMPLETE
