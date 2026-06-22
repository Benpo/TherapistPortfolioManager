# Phase 28: Update Reliability & Versioning - Pattern Map

**Mapped:** 2026-06-22
**Files analyzed:** 8 (5 modified, 2 created, 1 cross-file edit across 21 HTML pages)
**Analogs found:** 8 / 8 (every new surface has an in-repo precedent — no inventing)

> Brownfield, zero-build, zero-npm vanilla-JS PWA. IIFE-global modules, files served verbatim, load-order-sensitive `<script>` tags. Every pattern below is an established in-repo idiom — the planner should reuse, not reinvent. Line numbers verified against live code this session.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `assets/version.js` (**NEW**) | config / shared constant | transform (read-once) | `assets/shared-chrome.js` IIFE-global module | role-match |
| `assets/shared-chrome.js` (MOD) | utility (footer render) | request-response (DOM) | self — `renderFooter` + `FOOTER_STRINGS` | exact (self-edit) |
| `sw.js` (MOD) | service-worker / config | event-driven (lifecycle) | self — `CACHE_NAME` + `activate` cache-delete | exact (self-edit) |
| `assets/app.js` (MOD) | controller (SW registration / lifecycle) | event-driven | self — `controllerchange` listener (~693–698) | exact (self-edit) |
| `_headers` (MOD) | config | request-response (HTTP) | self — existing header blocks | exact (self-edit) |
| Integrity-mismatch nudge — JS (**NEW**, likely in `version.js` or a small new module) | component (DOM banner) | event-driven | `assets/db.js:399–449` `.db-error-banner` family | exact (structural) |
| Integrity-mismatch nudge — CSS (MOD `assets/app.css`) | component (styles) | — | `assets/app.css:2132–2178` `.db-error-banner`/`.db-error-btn` | exact (structural) |
| 21 `*.html` pages (MOD) — delete CSP `<meta>`, wire `version.js` `<script>` | config / markup | — | `index.html:23` CSP meta, `index.html:333–344` script block | exact (self-edit) |

---

## Pattern Assignments

### `assets/version.js` (NEW — shared version constant, single source of truth)

**Analog:** `assets/shared-chrome.js` (the established cross-context IIFE-global shared-constant module).

**Critical constraint discovered:** `sw.js` currently has **no `importScripts`** (verified — `grep importScripts sw.js` → none). To make `version.js` the single source consumed by BOTH page context and SW context, the SW must adopt `importScripts('/version.js')` at the top of `sw.js`, and `version.js` must be written to work in both a `window` (page) and `self` (worker) global scope. The existing IIFE-global idiom (`var SharedChrome = (function(){ ... })()`) is the model — but `version.js` must assign to `self`/`globalThis` so both contexts see it.

**IIFE-global module pattern to copy** (`shared-chrome.js:5-8, 95-105`):
```javascript
var SharedChrome = (function() {
  'use strict';
  var APP_VERSION = '1.1.0';
  // ...
  return { /* exported surface */, APP_VERSION: APP_VERSION };
})();
```

**Hybrid-token model (D-02):** the hand-set semver (`1.2.0`) is a literal in this file; the deploy token is git-short-hash stamped at deploy time (see `_headers`/deploy section below), with a `'dev'` fallback for `file://`/local. So `version.js` exposes two values: `APP_VERSION = '1.2.0'` (hand-set) and an `INTEGRITY_TOKEN` (deploy-stamped placeholder, e.g. `'__BUILD_TOKEN__'` → replaced by the deploy step, falling back to `'dev'` when unreplaced).

**Where it loads in the page** (must precede `shared-chrome.js` and `sw.js`-registration so the footer and integrity check can read it): inject the `<script src="./assets/version.js">` tag in each HTML page ABOVE `shared-chrome.js` (currently `index.html:338`). The script-tag-ordering precedent is `index.html:329-341` (load-order-sensitive globals).

**Add to precache list** (`sw.js:19` `PRECACHE_URLS`) so installed users cache it.

---

### `assets/shared-chrome.js` (MODIFIED — footer reads version constant + honest marker)

**Analog:** self. Three exact touch-points:

**1. Replace the static `APP_VERSION` placeholder** (`shared-chrome.js:8`):
```javascript
var APP_VERSION = '1.1.0';   // ← replace: read from window.AppVersion (version.js) → '1.2.0'
```
Per D-01/VER-02 this becomes a read of the `version.js` global rather than a hardcoded literal. Keep the exported `APP_VERSION` on the return object (`:103`) for back-compat callers.

**2. Footer copy line render** (`shared-chrome.js:88`) — append the honest marker:
```javascript
'<p class="app-footer-copy">&copy; 2026 Sessions Garden &middot; v' + APP_VERSION + '</p>' +
```
UI-SPEC Surface 2: clean → `v1.2.0`; mismatch → append ` ` + `⚠` wrapped in `<span class="app-footer-version-warn" title="…" aria-label="…">⚠</span>`. The aria/title text uses the inline 4-language string source (see nudge strings). Render clean optimistically; upgrade to marker only when the integrity check reports a mismatch — never the reverse (D-09).

**3. Inline-string-object idiom** (`FOOTER_STRINGS`, `shared-chrome.js:59-64`) — this is the exact precedent for early-lifecycle strings that render before `i18n.js`:
```javascript
var FOOTER_STRINGS = {
  en: { impressum: 'Impressum', /* ... */ },
  he: { /* \u-escaped Hebrew */ },
  de: { /* ... */ },
  cs: { /* ... */ }
};
```
The footer-marker `aria-label` string belongs in this same `{ en, he, de, cs }` shape (or colocated with the nudge — see below). Note the Hebrew/Czech/German use `\u`-escapes in this file; `db.js` uses raw UTF-8. Either is in-repo; raw UTF-8 (db.js style) is the more recent idiom.

---

### `sw.js` (MODIFIED — cache name auto-derived, keep takeover, drop forced reload's partner)

**Analog:** self.

**1. `CACHE_NAME`** (`sw.js:12`):
```javascript
const CACHE_NAME = 'sessions-garden-v212';   // ← replace: derive from version.js deploy token
```
Per D-02 this becomes `'sessions-garden-' + INTEGRITY_TOKEN` after `importScripts('/version.js')` at the top of the file. This kills the manual-bump failure class (CONCERNS "Service Worker Cache Version Requires Manual Bump", `sw.js:12`).

**2. Add `importScripts` at top of `sw.js`** (NEW — no precedent in this file, but standard SW idiom):
```javascript
importScripts('/version.js');   // exposes the deploy token to CACHE_NAME
```

**3. Keep `skipWaiting()` + `clients.claim()`** (`sw.js:159` and `activate` handler `:165-177`). D-05: keep SW takeover; only the page-side forced reload is removed. The `activate` handler already deletes stale caches (`:167-172`) — this is the exact cache-deletion idiom the nudge's genuine recovery should trigger.

---

### `assets/app.js` (MODIFIED — remove forced reload, add launch update check)

**Analog:** self (`app.js:693-698`).

**Remove the forced reload** (D-05) — current code:
```javascript
// Auto-reload when a new service worker takes control (ensures fresh assets)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();   // ← REMOVE this forced reload (D-05)
  });
}
```
Apply-on-next-navigation: delete the `window.location.reload()`. Keep SW takeover (handled by sw.js).

**Add `registration.update()` on launch / visibilitychange** (D-06, general SW-lifecycle reliability fix). Reuse the EXACT visibilitychange-listener idiom already in this file at `app.js:675-682` (backup-schedule check) — same guard + listener shape:
```javascript
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible') {
    try { /* registration.update() */ } catch (_) {}
  }
});
```
This is the established "re-check on tab return" pattern; the SW update check should mirror it (idempotent listener-install guard like `initCommon._backupScheduleListenerInstalled`, the silent `catch (_)` is the in-repo norm — though CONCERNS flags silent catches; add a `console.warn` tag here per the error-handling recommendation).

---

### `_headers` (MODIFIED — add CSP header, raise cache TTL) + deploy version-stamp

**Analog:** self.

**1. CSP header migration (VER-04)** — copy the meta content verbatim (`index.html:23`, identical across all 21 pages and `landing.html:12`):
```
default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.lemonsqueezy.com; font-src 'self'
```
Add as `Content-Security-Policy:` under the existing global `/*` block (`_headers:1-5`). Keep `unsafe-inline` verbatim (removal out of scope). Then delete the `<meta http-equiv="Content-Security-Policy">` from all 21 HTML pages.

**2. `landing.html` X-Frame nuance:** `_headers:2` sets `X-Frame-Options: SAMEORIGIN` globally; landing.html embeds a demo iframe (same-origin) — verify the global CSP `default-src 'self'` doesn't break the demo iframe's framing. Scope a page-specific block in `_headers` if needed (the `/*.html` and `/sw.js` blocks at `:7,16` are the per-path-block precedent).

**3. Cache TTL (VER-05)** — current (`_headers:10-14`):
```
/*.js
  Cache-Control: public, max-age=3600    ← raise to max-age=86400
/*.css
  Cache-Control: public, max-age=3600    ← raise to max-age=86400
```
HTML and sw.js stay `no-cache` (`:7-8, 16-17`) — unchanged.

**4. Deploy version-stamp step (D-02/D-04)** — `.github/workflows/deploy.yml`. The git-short-hash is ALREADY available in the workflow: `${GITHUB_SHA::7}` is used at `deploy.yml:56` (`git commit -m "Deploy from ${GITHUB_SHA::7}"`). Add a small `sed`-style stamp step in the "Prepare deploy directory" block (`deploy.yml:21-32`) that replaces the `__BUILD_TOKEN__` placeholder in `deploy-staging/assets/version.js` with `${GITHUB_SHA::7}`. This is a deliberate, visible single-line transform — NOT a bundler (D-04, out of scope). Reconcile/remove the pre-commit `CACHE_NAME`-bump hook (memory `reference-pre-commit-sw-bump`) since the cache name is now auto-derived.

---

### Integrity-mismatch nudge — JS (NEW DOM builder)

**Analog:** `assets/db.js:399-449` — the `.db-error-banner` builder family (`showDBVersionChangedMessage`, `showDBMigrationError`). This is the EXACT structural + behavioral precedent named by the UI-SPEC.

**Banner-builder pattern to copy** (`db.js:412-426`, the version-changed banner — closest match: top-fixed alert with a CTA button):
```javascript
const banner = document.createElement("div");
banner.id = "dbVersionChangedBanner";
banner.setAttribute("role", "alert");
banner.className = "db-error-banner db-error-banner--version";

const msg = document.createElement("span");
msg.textContent = dbStr('versionChanged');

const btn = document.createElement("button");
btn.textContent = dbStr('refresh');
btn.className = "db-error-btn";
btn.onclick = () => location.reload();

banner.append(msg, btn);
document.body.prepend(banner);
```

**Adaptations for the nudge** (UI-SPEC Surface 1):
- Class: `.integrity-nudge` with state modifiers `--online` / `--offline` / `--wedged` (mirrors `--blocked`/`--version`/`--migration`).
- `role="alert"` and `document.body.prepend()` — keep verbatim.
- `createElement` + `textContent` (never `innerHTML` for the body — matches the db.js builder and the CONCERNS XSS guidance).
- **Dismissible** (unlike DB banners): add a real `<button>` close affordance at `inset-inline-end` (CSS logical property, RTL-safe per Phase 18). Dismissal hides for the session only; may re-surface next load if mismatch persists (D-12 "never a looped lie").
- The CTA `onclick` must NOT be `location.reload()` (D-10). It runs genuine recovery: `registration.update()` → activate new SW → delete stale caches (reuse the `activate`-handler cache-delete idiom, `sw.js:167-172`) → reload. The existing duplicate-guard (`const existing = document.getElementById(...); if (existing) return;`, `db.js:409-410`) is the precedent for not double-rendering.
- Three honest states chosen at render time from `navigator.onLine` + a "recovery already attempted this load" flag (UI-SPEC table). Button label and body copy bound to state so words can never disagree with the action.

**Inline 4-language string source** (`db.js:153-188`) — the EXACT pattern for strings that may render before `i18n.js`:
```javascript
const DB_STRINGS = {
  en: { versionChanged: "...", refresh: "Refresh", migrationFailed: "Database update failed. Your data is safe. ...", ... },
  he: { /* raw UTF-8 Hebrew */ },
  de: { migrationFailed: "...Deine Daten sind sicher...", ... },
  cs: { ... }
};
function dbStr(key) {
  var lang = localStorage.getItem('portfolioLang') || 'en';
  var strings = DB_STRINGS[lang] || DB_STRINGS.en;
  return strings[key] || DB_STRINGS.en[key] || key;
}
```
Build an `INTEGRITY_STRINGS = { en, he, de, cs }` object + an identical `integStr(key)` getter colocated with the nudge. Do NOT route through `i18n.js`/`t()` (UI-SPEC early-lifecycle requirement). Reuse tone from `DB_STRINGS.migrationFailed` ("Your data is safe" / "Deine Daten sind sicher" / "הנתונים שלך בטוחים" / "Tvoje data jsou v bezpeci") and `DB_STRINGS.refresh` (Aktualisieren / רענון / Obnovit) for the EN/HE/DE/CS copy in the UI-SPEC Copywriting Contract. HE must be gender-neutral (Phase 18). Read lang/dir from `localStorage.getItem('portfolioLang')` and set the element's `dir` defensively (matches `dbStr` + DB-banner-era behavior).

---

### Integrity-mismatch nudge — CSS (MODIFIED `assets/app.css`)

**Analog:** `assets/app.css:2132-2178` — `.db-error-banner` / `.db-error-btn`.

**Base banner styles to copy** (`app.css:2132-2146`):
```css
.db-error-banner {
  position: fixed;
  top: 0; left: 0; right: 0;
  padding: var(--space-md, 12px) var(--space-lg, 16px);
  text-align: center;
  z-index: var(--z-banner);
  font-family: var(--font-family, Rubik, system-ui, sans-serif);
  font-size: var(--text-base, 14px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
```

**State-band modifiers to mirror** (`app.css:2148-2161`):
```css
.db-error-banner--blocked  { background: var(--color-warning-bg, #fff3cd); color: var(--color-warning-text, #856404); }
.db-error-banner--version  { background: var(--color-info-bg, #cce5ff);    color: var(--color-info-text, #004085); }
.db-error-banner--migration{ background: var(--color-danger-bg, #f8d7da);  color: var(--color-danger-text, #721c24); }
```
Map: `.integrity-nudge--online` → info band (`--color-info-*`); `--offline` → warning band (`--color-warning-*`); `--wedged` → danger band (`--color-danger-*`, reserved for the wedged escalation ONLY, Phase 27 red-discipline).

**CTA button to copy** (`app.css:2163-2178`):
```css
.db-error-btn {
  margin-top: var(--space-sm, 4px);
  padding: var(--space-xs, 2px) var(--space-md, 12px);
  border: none;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  font-family: var(--font-family, Rubik, system-ui, sans-serif);
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  background: var(--color-primary, #2d6a4f);
  color: var(--color-text-inverse, #fff);
}
```

**BINDING fallback-literal rule (UI-SPEC Spacing FLAG-resolved):** none of the `--space-*` scale tokens are defined in `:root`, so the fallback literal you write is what renders. Copy the banner family's *tighter* fallbacks VERBATIM — `var(--space-md, 12px)`, `var(--space-xs, 2px)`, `var(--space-sm, 4px)`, hardcoded `gap: 12px`. Do NOT normalize the `12px` md-padding up to the canonical `16px`, do NOT change `2px`/`4px`. RTL: replace any physical left/right with logical properties (`inset-inline-end` for the close button); the close affordance and inline gap use `margin-inline`/`gap`.

---

### 21 `*.html` pages (MODIFIED — delete CSP meta, add version.js script)

**Analog:** `index.html:23` (CSP meta to delete) and `index.html:333-344` (script-tag block to extend).

- **Delete** `<meta http-equiv="Content-Security-Policy" content="...">` from all 21 pages (20 SW-registered app pages + `landing.html`) once the `_headers` CSP is verified equivalent. Verified identical content across pages.
- **Add** `<script src="./assets/version.js"></script>` ABOVE `shared-chrome.js` (`index.html:338`) on every page that renders the footer / runs the integrity check. Load-order matters (globals).
- The SW-registration inline `<script>` (`index.html:343`) is duplicated across the 20 app pages (NOT landing — `landing.html` has no SW registration, verified). Any registration-side update logic (D-06 launch `registration.update()`) lives in `app.js` (already loaded everywhere), so the inline registration script itself likely stays as-is — preferred over editing 20 inline copies.

---

## Shared Patterns

### Early-lifecycle inline i18n strings (renders before i18n.js)
**Source:** `assets/db.js:153-188` (`DB_STRINGS` + `dbStr()`); also `shared-chrome.js:59-64` (`FOOTER_STRINGS`).
**Apply to:** the integrity nudge AND the footer marker aria-label. A colocated `{ en, he, de, cs }` object + a getter reading `localStorage.getItem('portfolioLang')` → lang table → `en` → key. NEVER `i18n.js`/`t()` for these surfaces.

### Top-fixed alert banner DOM builder
**Source:** `assets/db.js:399-449`.
**Apply to:** the integrity nudge. `createElement` + `textContent` (never `innerHTML`), `role="alert"`, `document.body.prepend()`, duplicate-render guard (`getElementById` → `return`).

### `var(--token, fallback)` styling with literal fallbacks
**Source:** `assets/app.css:2132-2178`.
**Apply to:** all nudge CSS. Semantic `--color-*` tokens exist in `:root`; scale tokens (`--space-*`, `--text-*`, `--radius-*`, `--font-family`) do NOT — always supply the banner-family fallback literal.

### Cross-context shared global module
**Source:** `assets/shared-chrome.js:5-105` (IIFE-global). For the SW side, add `importScripts('/version.js')` (no existing `importScripts` in `sw.js` — new but standard).
**Apply to:** `version.js` — must expose its constant on a global readable from both `window` (page) and `self` (worker).

### visibilitychange "re-check on tab return"
**Source:** `assets/app.js:675-682` (backup-schedule check).
**Apply to:** the D-06 launch/foreground `registration.update()` SW-update check — mirror the listener-install guard + `document.visibilityState === 'visible'` + try/catch shape.

### Deploy-time git-short-hash stamp
**Source:** `.github/workflows/deploy.yml:56` (`${GITHUB_SHA::7}` already in use).
**Apply to:** stamping `version.js`'s deploy token in the "Prepare deploy directory" step; auto-derived `CACHE_NAME` + integrity token, killing manual bumps.

---

## No Analog Found

None. Every Phase 28 surface maps to an existing in-repo idiom. The two genuinely-new files (`version.js`, the nudge) compose existing patterns (IIFE-global module + `.db-error-banner` builder + `DB_STRINGS` inline strings). The only new-to-this-file mechanic is `importScripts` in `sw.js`, which is the standard SW way to consume a shared script.

---

## Metadata

**Analog search scope:** `assets/shared-chrome.js`, `assets/db.js`, `assets/app.js`, `assets/app.css`, `sw.js`, `_headers`, `index.html`, `landing.html`, `.github/workflows/deploy.yml`
**Files scanned:** 9 read + repo-wide greps (CSP meta in 21 HTML pages, SW registration in 20)
**Line numbers:** verified against live code 2026-06-22 (CONTEXT cited `sw.js:12 v212` — confirmed; `app.js:693-698` forced reload — confirmed)
**Pattern extraction date:** 2026-06-22
