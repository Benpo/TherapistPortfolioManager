# Phase 39: Help Center & "?" Entry Point - Pattern Map

**Mapped:** 2026-07-07
**Files analyzed:** 11 (4 new, 7 modified)
**Analogs found:** 11 / 11 (every capability has an in-repo analog — this is a composition phase, zero new deps)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `help.html` (NEW) | page (HTML shell) | request-response (static render) | `sessions.html` / `reporting.html` head+body | role-match |
| `assets/help.js` (NEW) | renderer/component | transform (content-array → DOM) | ported from `.planning/sketches/002-help-page-ia/hybrid.html` + `overview.js` DOM-build | exact (mockup) |
| `assets/help-content-en.js` (NEW) | data/content asset | static data | `assets/i18n-en.js` (window.* dict export) + `assets/snippets-seed.js` | role-match |
| `assets/help.css` (NEW) | config (styles) | n/a | `assets/globe-lang.css` / `assets/app.css` token usage | role-match |
| `assets/app.js` — `initHelpEntry()` (EDIT) | chrome/controller | event-driven (popover) | `initSettingsLink` (`app.js:391`) + `initLanguagePopover` (`app.js:202`) | exact |
| `assets/app.js` — `renderNav()` (EDIT) | chrome/nav | request-response | `renderNav()` itself (`app.js:137`) | exact |
| `assets/overview.js` (EDIT) | component (empty state) | event-driven | `renderClientRows` empty branch (`overview.js:638-648`) | exact |
| `assets/sessions.js` (EDIT) | component (empty state) | event-driven | filter-empty branch (`sessions.js:168-172`) | role-match (needs true-empty split) |
| `assets/reporting.js` (EDIT) | component (empty state) | event-driven | overview empty-state pattern | partial |
| `assets/i18n-{en,he,de,cs}.js` (EDIT) | data (i18n keys) | static data | existing key blocks | exact |
| `sw.js` (EDIT) | config (precache) | n/a | `PRECACHE_URLS`/`PRECACHE_HTML` (`sw.js:33`/`:106`) | exact |
| `tests/39-help-integrity.test.js` (NEW) | test | batch (fs/vm static) | `tests/33-i18n-de-cs-completion.test.js` | exact |

## Pattern Assignments

### `assets/app.js` — `initHelpEntry()` (chrome, event-driven popover)

**Analogs:** `initSettingsLink` (`app.js:391-455`) for the icon-button mount; `initLanguagePopover` (`app.js:202-274`) for the popover open/close/dismiss.

**Mount + idempotency + i18n label** — copy the shape of `initSettingsLink` (`app.js:392-401`):
```javascript
var actions = document.getElementById('headerActions') || document.querySelector('.header-actions');
if (!actions) return;
if (actions.querySelector('.help-entry-btn')) return;   // idempotent double-mount guard
var btn = document.createElement('button');
btn.type = 'button';
btn.className = 'header-control-btn help-entry-btn';
var label = (typeof t === 'function' ? t('help.entry.label') : '') || 'Help';
btn.setAttribute('aria-label', label);
btn.setAttribute('title', label);
btn.setAttribute('aria-expanded', 'false');
```
Note the inline SVG is a **compile-time literal** (no user input) — same convention as the gear (`app.js:405-409`). Render 20×20 in a 24×24 viewBox, `stroke="currentColor"`, `stroke-width="1.8"`, `aria-hidden="true"`.

**`.is-active` parity** — mirror `app.js:412-414`:
```javascript
if (document.body && document.body.dataset && document.body.dataset.nav === 'help') {
  btn.classList.add('is-active');
}
```

**Popover open/close/dismiss** — copy from `initLanguagePopover` (`app.js:258-269`). This is the exact RTL-safe, outside-click-dismiss pattern D-09 mandates:
```javascript
btn.addEventListener('click', function(e) {
  e.stopPropagation();
  popover.hidden = !popover.hidden;
  btn.setAttribute('aria-expanded', String(!popover.hidden));
});
document.addEventListener('click', function(e) {
  if (!popover.hidden && !btn.contains(e.target) && !popover.contains(e.target)) {
    popover.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }
});
```
Build the popover items as an **addable list** (D-09, so P40–42 can append):
```javascript
// [ { labelKey:'help.entry.center',  href:'./help.html' },
//   { labelKey:'help.entry.contact', href:'mailto:contact@sessionsgarden.app' } ]
```
Each item = a `<button>`/`<a>` with `textContent` set from `t(labelKey)` (never innerHTML) — mirror the `lang-option` loop (`app.js:233-256`).

**Re-translate on language switch** — copy the install-once listener guard from `initSettingsLink` (`app.js:444-454`):
```javascript
if (!initHelpEntry._listenerInstalled) {
  document.addEventListener('app:language', function () { /* re-set aria-label + item labels */ });
  initHelpEntry._listenerInstalled = true;
}
```

**Call site:** add `initHelpEntry()` inside `initCommon()` (`app.js:~648`) after `initSettingsLink()`, matching how the other chrome mounts are wired.

---

### `assets/app.js` — `renderNav()` Help entry (nav, request-response)

**Analog:** `renderNav()` itself (`app.js:137-156`).

Append one anchor to the nav template (`app.js:142-148`), likely last (Claude's discretion):
```html
<a href="./help.html" data-nav="help" data-i18n="nav.help">Help</a>
```
Active marking is automatic: `help.html` sets `<body data-nav="help">` and the existing loop (`app.js:150-153`) toggles `.active`. `applyTranslations(placeholder)` (`app.js:155`) resolves `data-i18n`.

---

### `help.html` (page shell, static)

**Analog:** `sessions.html` / `reporting.html` head+body scaffold (SW register, `#headerActions`, `#nav-placeholder`, script order).

Copy an existing per-page HTML head verbatim (meta, theme bootstrap, `tokens.css` + `app.css` links), then add `help.css`. Body carries `data-nav="help"`. Script order: i18n files → `app.js` → `shared-chrome.js` → `help-content-en.js` → `help.js`. Footer via `SharedChrome.renderFooter()` — see below. **Start layout/behavior from the approved mockup** `.planning/sketches/002-help-page-ia/hybrid.html`, not from the A/B/C `index.html` variants.

---

### `assets/help.js` (renderer, content-array → DOM transform)

**Primary analog:** the approved mockup `.planning/sketches/002-help-page-ia/hybrid.html` (JS at lines ~722–835). Port `setOpen`, rail-click-scroll-and-expand, in-rail chevron, `applySearch`, `IntersectionObserver` scroll-spy (`rootMargin: '-10% 0px -70% 0px'`), and `openForHash` near-verbatim — change only the content source to iterate `window.HELP_CONTENT_EN`.

**DOM-build (NOT innerHTML)** — analog `overview.js:672-679` (`createElement` + `textContent`). The repo convention is to build dynamic text via `textContent`; reserve `innerHTML` for compile-time literal SVG only. The search no-match echo of the user's term MUST be `textContent` (XSS guard, V5).

**`{ui:key}` live-label interpolation (D-23)** — reuse `t()` (`app.js:14`):
```javascript
function interpolateUiLabels(text) {
  return text.replace(/\{ui:([^}]+)\}/g, function (_, key) { return t(key.trim()); });
}
```

**Deep-link auto-expand (D-11/D-22)** — ported from mockup `hybrid.html:747`:
```javascript
function openForHash(hash) {
  if (!hash) return;
  var target = document.querySelector(hash);
  if (!target) return;
  var card = target.closest('.help-card');
  if (card) setOpen(card, true);
}
openForHash(location.hash);
if (location.hash) {
  var el = document.querySelector(location.hash);
  if (el) setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 50);
}
```

---

### `assets/help-content-en.js` (content data asset)

**Analog:** `assets/i18n-en.js` (a `window.*` dictionary export) and `assets/snippets-seed.js` (structured seed array). Export a single global (name = Claude's discretion, e.g. `window.HELP_CONTENT_EN = [ ... ]`) so the vm test and `help.js` both read it. Topic object minimum fields: `{ id, section, title, body, priority, covers }` (D-18/D-24). Recommend a block-capable `body` (array of typed nodes) so numbered steps + install-SVG glyphs + prose coexist while staying flat enough for the integrity test to scan `{ui:key}` tokens and anchor refs.

---

### `assets/overview.js` — empty-state "Show me how" (component, event-driven)

**Analog (exact):** the true-empty branch already exists — `renderClientRows` (`overview.js:638-648`) shows `#emptyState` when `!clients.length`. This is a genuine no-clients state (D-21). Add a soft secondary (non-accent) "Show me how" button into that empty-state block → `help.html#<adding-a-client-topic-id>`. Build the button with `createElement` + `textContent` (label via `App.t(...)`).

---

### `assets/sessions.js` — true-empty split (component, event-driven)

**Analog:** `sessions.js:168-172` filter-empty branch. **Pitfall 3:** today the only empty string (`sessions.empty`, `i18n-en.js:259`) is a FILTER-empty shown on `!filtered.length`. D-21 requires distinguishing "zero sessions ever" from "filter matches nothing." Add a true-empty check (e.g. compare unfiltered total count to 0 BEFORE the filter runs) and show coaching + "Show me how → Starting a session" only on true-empty; leave the filter-empty message as-is. Detection approach is Claude's discretion.

---

### `assets/reporting.js` — no-data coaching (component, event-driven)

**Analog:** overview empty-state pattern (partial — confirm the reporting.html dashboard empty path; `report.empty.*` strings belong to the crash-report page, not the dashboard). Add "Show me how → Reading your dashboard" on the true no-data state.

---

### `sw.js` — precache (config)

**Analog (exact):** `PRECACHE_URLS` (`sw.js:33-89`) and `PRECACHE_HTML` (`sw.js:106-128`).
- Add to `PRECACHE_URLS`: `/assets/help.js`, `/assets/help-content-en.js`, `/assets/help.css`. (Rubik faces + watering-can.png already present — lines 61-67.)
- Add to `PRECACHE_HTML`: `/help` (extensionless, CF pretty-URL convention — see `sw.js:91-105`).
- **Pitfall 1 (must-do):** the pre-commit hook skips the `CACHE_NAME` auto-bump when `sw.js` is in the diff. Treat the precache edit as two steps: edit + a manual chore commit to refresh `CACHE_NAME`. Do NOT regress the `{cache:'reload'}` precache mode (guarded by `tests/sw-precache-cache-reload.test.js`).

---

### `tests/39-help-integrity.test.js` (test, fs/vm batch)

**Analog (exact):** `tests/33-i18n-de-cs-completion.test.js` (`tests/33-...:28-70`). Copy the sandbox + vm.runInContext + `test(name, fn)` + exit-0/1 harness verbatim:
```javascript
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sandbox = { window: { I18N: {}, QUOTES: {} }, console: { log(){}, warn(){}, error(){} } };
vm.createContext(sandbox);
for (const f of ['i18n-en.js', 'help-content-en.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','assets',f),'utf8'), sandbox, { filename: 'assets/'+f });
}
const en = sandbox.window.I18N.en;
const topics = sandbox.window.HELP_CONTENT_EN;
const ids = new Set(topics.map(t => t.id));
// 1) every {ui:key} in every topic body resolves in en
// 2) every deep-link anchor (empty-state buttons, "?" popover items, rail subs) ∈ ids
```
Extend with a precache-shape assertion (read `sw.js` source, require the three new help files present), or add that to `tests/sw-precache-cache-reload.test.js`. Auto-discovered by `tests/run-all.js`; `npm test` runs it.

## Shared Patterns

### Popover (open / close / outside-click dismiss / RTL / aria-expanded)
**Source:** `initLanguagePopover` (`app.js:258-269`); mirror `globe-lang.js:46-77` for the `open()/close()` helper factoring.
**Apply to:** the "?" entry popover.

### Header icon-button mount (idempotent, i18n label, `.is-active`, re-translate)
**Source:** `initSettingsLink` (`app.js:391-455`).
**Apply to:** `initHelpEntry()`.

### DOM-build via createElement + textContent (never innerHTML for dynamic text)
**Source:** `overview.js:672-679`, `lang-option` loop `app.js:233-256`.
**Apply to:** all of `help.js` (cards, rail, search results, no-match echo), popover items, empty-state buttons. Compile-time literal SVG is the only sanctioned `innerHTML`.

### i18n resolution with EN fallback
**Source:** `t()` (`app.js:14`), `applyTranslations()` (`app.js:23`), `data-i18n` attribute.
**Apply to:** all new UI-chrome strings (`help.entry.*`, `help.search.*`, `nav.help`, empty-state coaching labels) — 4-locale parity required (help BODY content is EN-only in `help-content-en.js`, D-18). New HE keys use noun/infinitive forms.

### Footer / nav chrome
**Source:** `SharedChrome.renderFooter` (`shared-chrome.js:100`, public surface `:185-189`).
**Apply to:** `help.html` footer parity.

### Static fs/vm integrity test harness
**Source:** `tests/33-i18n-de-cs-completion.test.js`.
**Apply to:** `tests/39-help-integrity.test.js`.

## No Analog Found

None — every capability composes an existing repo pattern. The closest thing to "new" is the `{ui:key}` interpolation layer, but it reuses `t()`; and the block-capable content schema, which follows the `window.*` dict-export convention of `i18n-en.js`.

## Metadata

**Analog search scope:** `assets/` (app.js, globe-lang.js, overview.js, sessions.js, shared-chrome.js), `sw.js`, `tests/`, `.planning/sketches/002-help-page-ia/hybrid.html`
**Files scanned:** ~9 source files + CONTEXT + RESEARCH
**Pattern extraction date:** 2026-07-07
</content>
</invoke>
