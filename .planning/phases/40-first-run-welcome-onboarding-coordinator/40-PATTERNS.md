# Phase 40: First-Run Welcome & Onboarding Coordinator - Pattern Map

**Mapped:** 2026-07-08
**Files analyzed:** 11 (2 new source, 5 edited source, 4 new tests)
**Analogs found:** 11 / 11 (every surface has a shipped analog — this phase composes, it does not invent)

> **Reuse-verification note (per project standing guidance):** every excerpt below was read from the live source THIS session (`assets/app.js`, `index.html`, `assets/version.js`, `sw.js`, `tests/39-*.js`) and the line numbers are current. One discrepancy vs. RESEARCH.md is flagged: the existing security note renderer uses `innerHTML` + `t()` interpolation (app.js:1372-1377), NOT `textContent` — see the security-note surface note. This is trusted-i18n interpolation (no user input), but the "all copy via textContent" convention the new surfaces must follow is stricter than the analog they gate.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `assets/attention-coordinator.js` (NEW) | coordinator/registry + surface impls | event-driven (session arbitration) | `assets/app.js` initHelpEntry + version.js buildNudge (IIFE module idiom) | role-match |
| — welcome overlay surface (in above) | component (modal) | request-response (show/dismiss) | `assets/app.js` `lockBodyScroll`/`unlockBodyScroll` + modal idiom | exact |
| — install-nudge surface (in above) | component (dismissable card) | event-driven (`beforeinstallprompt`) | `index.html:367-378` iOS banner (dismissable-surface idiom) | role-match |
| — mobile-hint surface (in above) | component (bottom bar) | one-shot render | `index.html:367-378` iOS banner (successor) + security note | role-match |
| `assets/app.js` (EDIT: initCommon, initHelpEntry, register security-note) | controller wiring | request-response | self (existing `initHelpEntry`, `showFirstLaunchSecurityNote`) | exact |
| `index.html` (EDIT: delete iOS banner, add coordinator `<script>`) | config/markup | — | self (script-order block `index.html:350-360`) | exact |
| 7 other app pages (EDIT: add `<script>`) | config/markup | — | `index.html:356-360` script order | exact |
| `assets/app.css` / `help.css` (EDIT: overlay/card/hint styles) | style | — | garden tokens (`assets/tokens.css`) | role-match |
| `assets/i18n-{en,he,de,cs}.js` (EDIT: new keys) | i18n data | — | existing `help.entry.*` / `security.note.*` keys | exact |
| `sw.js` (EDIT: PRECACHE_URLS) | config | — | `sw.js:33-44` PRECACHE_URLS | exact |
| `tests/40-coordinator.test.js` + welcome/install (NEW) | test (behavior) | — | `tests/39-help-entry.test.js` (eval-into-jsdom) | exact |
| `tests/40-ios-banner-removed.test.js` + precache (NEW) | test (static grep) | — | `tests/39-help-precache.test.js` (fs source-scan) | exact |

## Pattern Assignments

### `assets/attention-coordinator.js` — the coordinator registry (NEW, coordinator, event-driven)

**Analog for module shape:** `assets/version.js` — a top-level IIFE that attaches a single namespaced global (`window.AppVersion = {...}`). The coordinator mirrors this: `window.AttentionCoordinator = { register, run }`.

**Analog for demo-mode gate** (`assets/app.js`, verified this session — multiple call sites, e.g. line 601):
```javascript
// assets/app.js:601 — the established demo seam D-09 must copy verbatim
if (typeof window !== 'undefined' && window.name === 'demo-mode') return;
```
Apply this as the FIRST line of `run()` (D-09). Same guard also at app.js:278, 328, 347, 362.

**Analog for try/catch storage reads** (`assets/app.js:1379-1382`, security note dismissal write):
```javascript
localStorage.setItem('securityGuidanceDismissed', new Date().toISOString());
```
The coordinator's sessionStorage marker + all dismissal flags follow this one-flag-per-surface idiom; wrap every read/write in try/catch (private-mode/quota) — established convention (RESEARCH Pitfall 4).

**Core registry pattern:** use RESEARCH Pattern 1 (40-RESEARCH.md lines 203-231) — precedence array as data, `registry[id] = {eligible, show}`, `run()` walks and shows first eligible then STOPs. This is a synthesized pattern (no exact registry analog exists in-repo — closest is the flat `initCommon` sequential-call block at app.js:891-897), so it is net-new logic that the behavior test must pin first.

---

### Welcome overlay surface (in attention-coordinator.js) — component, modal (ONBD-01, D-10)

**Analog:** `assets/app.js` `lockBodyScroll`/`unlockBodyScroll` — VERIFIED at lines 1598-1612:
```javascript
function lockBodyScroll() {
  var scrollY = window.scrollY;
  document.body.style.top = "-" + scrollY + "px";
  document.body.classList.add("is-modal-open");
  document.body.dataset.scrollY = scrollY;
}
function unlockBodyScroll() {
  document.body.classList.remove("is-modal-open");
  document.body.style.top = "";
  window.scrollTo(0, parseInt(document.body.dataset.scrollY || "0"));
}
```
Both are exported on the `App` return object (app.js:1614+). The welcome `show()` calls `App.lockBodyScroll()` on mount, `App.unlockBodyScroll()` on dismiss. Do NOT hand-roll `overflow:hidden` (breaks iOS Safari — RESEARCH Don't-Hand-Roll).

**Structure:** Variant B split from `.planning/sketches/001-welcome-overlay/index.html #variant-b` (RESEARCH Pattern 2, lines 239-257). `role="dialog" aria-modal="true"`, `data-i18n="help.welcome.title/subtitle/ctaTour/ctaExplore"`.

**Dismissal + upgrader last-seen-version write** (D-03) — read `APP_VERSION` from the hand-set semver only. VERIFIED `assets/version.js:27` `var APP_VERSION = '1.3.0';` exported at version.js:332 as `AppVersion.APP_VERSION`. NEVER read `INTEGRITY_TOKEN` (version.js:33, the deploy hash). Use RESEARCH Code Example lines 394-406. `isReplay` flag skips the flag write (Pitfall 5).

**Copy rule:** all labels via `textContent` from `t()` / `data-i18n` — the stricter convention (welcome must NOT copy the security note's `innerHTML`+`t()` interpolation).

---

### Install-nudge surface (in attention-coordinator.js) — component, event-driven (ONBD-04, D-12)

**Analog (dismissable-surface idiom being replaced):** the iOS banner IIFE, VERIFIED `index.html:366-378` (this is also the DELETE target D-15):
```javascript
// index.html:368-377 — the standalone check + per-surface dismissal-flag idiom to CARRY,
// while the hard-coded English + always-mobile promo is what D-15 KILLS.
if(/iP(hone|ad|od)/.test(navigator.userAgent)&&!window.matchMedia('(display-mode: standalone)').matches&&!sessionStorage.getItem('iosPromptDismissed')){
  ...
  b.innerHTML='<span>Install Sessions Garden: tap the Share button ...</span>...';
}
```
Reuse `matchMedia('(display-mode: standalone)')` for the `eligible()` already-installed gate. Replace the `sessionStorage` dismissal with a **localStorage** persistent flag (D-14 "gone forever" — Pitfall 4: opposite storage class from the session marker).

**`beforeinstallprompt` capture:** RESEARCH Pattern 3 (lines 262-277) — register the listener at eval-time top-level of the coordinator file (Pitfall 7 load order + Pitfall 1 timing), `preventDefault()`, stash `deferredPrompt`; `appinstalled` nulls it. Platform branch in `show()`: `deferredPrompt` present → real `[Install]` button calling `prompt()` once (Pitfall 2); absent → macOS Safari "File → Add to Dock" pointer + link to the Phase 39 install help topic.

---

### Mobile-hint surface (in attention-coordinator.js) — component, one-shot render (D-16)

**Analog:** same iOS banner (`index.html:366-378`) as the successor it replaces, PLUS the fixed-bottom-bar styling reference — but per UI-SPEC use `--color-surface` bg / `--color-text` copy / soft top border, NEVER `--color-primary` fill (the banner's `background:var(--color-primary);color:#fff` accent is exactly the warning tone D-16 removes). Phone-class detection: RESEARCH Pattern 4 (lines 286-291), `uaMobile || (coarse && narrow@820px)`. One-shot localStorage dismissal, all copy `data-i18n`.

---

### `assets/app.js` edits — controller wiring (exact self-analog)

**1. initCommon call-site swap** — VERIFIED `app.js:891-893`:
```javascript
requestPersistentStorage();
showFirstLaunchSecurityNote();   // ← REPLACE this unconditional call with AttentionCoordinator.run()
initPersistentSecuritySection();
```
Guard defensively: `if (typeof AttentionCoordinator !== 'undefined') AttentionCoordinator.run();` (Pitfall 7). The security note becomes a registered surface, not a direct call.

**2. Register security-note surface** — wraps the EXISTING renderer unchanged. VERIFIED `app.js:1356-1383` `showFirstLaunchSecurityNote()` — its gates (`portfolioLicenseActivated === '1'`, 7-day `securityGuidanceDismissed` window, `#security-guidance-container` presence) become the surface's `eligible()`; the renderer stays its `show()`. D-08 resolution: `eligible()` returns false when the container is absent (app.js:1369-1370 already early-returns on missing container — but as a surface it must gate in `eligible()` so it doesn't consume the session slot). Use RESEARCH Code Example lines 412-425.

**3. Extend initHelpEntry items array for "Replay welcome"** (D-17, ONBD-02) — VERIFIED `app.js:513-528`, the array is currently href-only:
```javascript
// app.js:515-518 — current day-one items (href-only)
var items = [
  { labelKey: 'help.entry.center', href: './help.html' },
  { labelKey: 'help.entry.contact', href: 'mailto:contact@sessionsgarden.app' }
];
items.forEach(function (item) {
  var a = document.createElement('a');   // app.js:520 — always an <a href>
  ...
});
```
Extend the loop to support an `action` handler alternative (RESEARCH Pattern 5, lines 300-308): if `item.href` → `<a href>` (current path), else if `item.action` → `<button role="menuitem">` calling `AttentionCoordinator.showWelcome()` directly (bypasses `run()`, never re-arms — Pitfall 5). Suggested position: after `help.entry.center`, before `help.entry.contact` (D-17 discretion).

**Preserve the re-translate wiring** — VERIFIED `app.js:552-565` `initHelpEntry._listenerInstalled` guard + `app:language` listener re-translates `.help-entry-item` via `data-label-key`. The new action row must carry `data-label-key` so it re-translates too (A1 in RESEARCH assumptions).

---

### `index.html` + 7 other app pages — script wiring (exact self-analog)

**Script load order** — VERIFIED `index.html:356-360`:
```html
<script src="./assets/version.js"></script>
<script src="./assets/crashlog.js"></script>
<script src="./assets/shared-chrome.js"></script>
<script src="./assets/date-format.js"></script>
<script src="./assets/app.js"></script>
```
Insert `<script src="./assets/attention-coordinator.js"></script>` **before** `app.js` (Pitfall 7). Apply to all pages that load app.js (index/add-client/add-session/help/report/sessions/settings/reporting — verify the exact set during planning; NOT demo.html).

**Delete iOS banner** (D-15) — VERIFIED the entire IIFE at `index.html:366-378`. Static test asserts `index.html` no longer contains `ios-install-banner`.

---

### `sw.js` PRECACHE — config (exact self-analog)

**Analog:** VERIFIED `sw.js:33` `const PRECACHE_URLS = [` with `'/assets/app.js'` at line 44. Add `'/assets/attention-coordinator.js'`. Per MEMORY `reference-pre-commit-sw-bump`: PRECACHE edit needs the manual cache-bump chore follow-up commit (CACHE_NAME derives from INTEGRITY_TOKEN). RESEARCH Pitfall 6.

---

### Tests (exact self-analogs)

**Behavior tests** (`40-coordinator`, `40-welcome-overlay`, `40-install-nudge`) — analog `tests/39-help-entry.test.js` (VERIFIED): eval-into-jsdom harness, `JSDOM` from `require('jsdom')`, `readAsset(rel)` reading real `assets/*` into an isolated window, `App.initHelpEntry` driven as a test seam. Mirror its `buildWindow()` + `check()`/`assert` structure. Project rule (MEMORY `feedback-behavior-verification`): author the coordinator behavior test BEFORE the impl. Mock `matchMedia`, `navigator.userAgentData`, and a synthetic `beforeinstallprompt` event for the install-nudge test.

**Static tests** (`40-ios-banner-removed`, precache) — analog `tests/39-help-precache.test.js` (VERIFIED): `fs.readFileSync` the target file, isolate the `PRECACHE_URLS` array via regex (lines 44-52), `check(name, cond)` + `process.exit(failed===0?0:1)`. The banner-removed test greps `index.html` for absence of `ios-install-banner`.

## Shared Patterns

### Demo-mode disable (D-09)
**Source:** `assets/app.js:601` (and 278/328/347/362) — `if (typeof window !== 'undefined' && window.name === 'demo-mode') return;`
**Apply to:** `AttentionCoordinator.run()` first line. No governed surface renders in the demo iframe.

### One-flag-per-surface storage (with try/catch)
**Source:** `assets/app.js:1379-1382` (security note dismissal) + `index.html:369` (iOS session flag)
**Apply to:** session marker → **sessionStorage** (dies on close, D-02); `sg.welcomeSeen` + install/mobile dismissals + last-seen-version → **localStorage** (survive restart, D-14/D-16). Opposite storage classes — Pitfall 4. All reads/writes in try/catch.

### Modal scroll-lock
**Source:** `assets/app.js:1598-1612` `lockBodyScroll`/`unlockBodyScroll` (exported on `App`)
**Apply to:** welcome overlay mount/dismiss. Do not hand-roll.

### i18n via data-i18n + textContent, 4-locale parity
**Source:** `assets/app.js:526` (`a.textContent = t(item.labelKey)`) + re-translate listener (552-565)
**Apply to:** every new string — `help.welcome.*`, `onboard.install.*`, `onboard.mobileHint.*`, `help.entry.replayWelcome` authored in EN/HE/DE/CS (Hebrew noun/infinitive, P24 D-05). NONE exist yet. Never hard-code English (the exact fault D-15 fixes).

### Namespaced-global IIFE module
**Source:** `assets/version.js` (`window.AppVersion = {...}`)
**Apply to:** `window.AttentionCoordinator = { register, run }`. No new globals beyond the one namespace (Phase 31 extraction pattern).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — (none) | — | — | Every surface composes a shipped idiom. The registry-arbitration LOGIC (precedence walk) is net-new synthesis with no in-repo analog — closest is the flat sequential call block at `app.js:891-897`. Its correctness is pinned by `40-coordinator.test.js`, authored before impl. |

## Metadata

**Analog search scope:** `assets/app.js`, `assets/version.js`, `index.html`, `sw.js`, `tests/39-*.js`
**Files scanned:** 6 source + 3 test files read this session
**Pattern extraction date:** 2026-07-08
</content>
</invoke>
