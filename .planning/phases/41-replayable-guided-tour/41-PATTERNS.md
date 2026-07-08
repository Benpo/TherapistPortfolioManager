# Phase 41: Replayable Guided Tour - Pattern Map

**Mapped:** 2026-07-08
**Files analyzed:** 15 (2 new source, 1 new CSS, 6 edited source, 4 edited page shells, 8 new tests)
**Analogs found:** 14 / 15 (only `assets/tour.js` render engine has no in-repo analog — it ports from sketch 003, an out-of-tree prototype)

> This phase is ~70% integration into surfaces built with this extension in mind. The single genuinely-new module (`assets/tour.js`) has a working, token-parity prototype at `.planning/sketches/003-tour-fallback/index.html` that is the port source. Prefer the real-codebase analogs below for every seam; use the sketch only for the render loop.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `assets/tour.js` (NEW) | engine/module (IIFE) | event-driven + transform | `assets/attention-coordinator.js` (module shape) + sketch 003 `render()` (render loop) | role-match (shape) / port-source (loop) |
| `assets/tour.css` (NEW) | config/styles | — | sketch 003 `<style>` (292-323) + `assets/help.css` local scale | port-source |
| `assets/attention-coordinator.js` (EDIT) | provider/registry | event-driven | itself — existing `register()` surfaces (install-nudge/mobile-hint) | exact (add one surface) |
| `assets/app.js` initHelpEntry (EDIT) | chrome/UI | request-response | `initHelpEntry` items array (app.js:516-526) | exact (append one item) |
| `assets/i18n-{en,he,de,cs}.js` (EDIT) | i18n data | CRUD (static dict) | existing `help.*` / `onboard.*` keys | exact |
| `index/add-session/sessions/reporting.html` (EDIT) | page shell | — | existing script-order + chrome markup | exact |
| `sw.js` PRECACHE_URLS (EDIT) | config | — | help.js precache block (Phase 39) | exact |
| `tests/41-anchor-presence.test.js` (NEW) | test | — | `tests/40-precache.test.js` (fs source-scan shape guard) | role-match |
| `tests/41-tour-i18n-parity.test.js` (NEW) | test | — | `tests/40-i18n-parity.test.js` (vm 4-locale parity) | exact |
| `tests/41-precache.test.js` (NEW) | test | — | `tests/40-precache.test.js` | exact |
| `tests/41-demo-gate.test.js` (NEW) | test | — | `tests/35-demo-*.test.js` + 40-precache demo-exclusion assert | role-match |
| `tests/41-resume-state.test.js` (covers D-09 relaunch-restart — no separate `41-relaunch-restart.test.js`), `41-fallback-degradation.test.js`, `41-lang-rerender.test.js`, `41-launch-explicit.test.js` (NEW) | test (jsdom/vm) | — | existing jsdom behavior tests | role-match |
| `tests/webkit/41-rtl-geometry.mjs` (NEW, ad-hoc) | test (Playwright-WebKit) | — | Phase 37 WebKit probe precedent (no committed analog) | no-analog |

## Shared Patterns

### Module shape (Phase 31 extraction pattern)
**Source:** `assets/attention-coordinator.js:40-45, 428-442`
**Apply to:** `assets/tour.js`
Single namespaced global via IIFE, `'use strict'`, four-slot responsibility banner at top, a `return { … }` public surface plus `_`-prefixed test seams, and the `if (typeof window !== 'undefined') window.X = X;` footer. No new globals beyond `window.Tour`.
```javascript
var AttentionCoordinator = (function () {
  'use strict';
  // ...private state + helpers...
  return { register, run, showWelcome, PRECEDENCE,
           _getSurface: function (id) { return registry[id]; } }; // test seam
})();
if (typeof window !== 'undefined') window.AttentionCoordinator = AttentionCoordinator;
```

### Storage helpers (private-mode / quota safe)
**Source:** `assets/attention-coordinator.js:57-60`
**Apply to:** `assets/tour.js` (all `sg.tour*` flag + sessionStorage resume reads)
```javascript
function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
```
Follow the `sg.*` naming convention: `sg.tourRemindLater`, `sg.tourNeverRemind`, `sg.tourCompleted` (localStorage), `sg.tourResume` (sessionStorage).

### i18n resolution for dynamically-mounted nodes
**Source:** `assets/attention-coordinator.js:67-73` + `makeEl` at 274-279
**Apply to:** `assets/tour.js` — the tour mounts chrome AFTER `applyTranslations()` walked the static DOM, so it resolves copy itself, but also stamps `data-i18n` so the `app:language` re-render re-translates through the shared pipeline.
```javascript
function t(key) {
  try {
    var lang = lsGet('portfolioLang') || window.I18N_DEFAULT || 'en';
    var dict = (window.I18N && (window.I18N[lang] || window.I18N.en)) || {};
    return (dict[key] != null) ? dict[key] : key;
  } catch (e) { return key; }
}
function makeEl(tag, cls, key) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  if (key) { el.setAttribute('data-i18n', key); el.textContent = t(key); } // textContent ONLY
  return el;
}
```
**XSS trust boundary (V5 / T-39-05 / T-40-03):** all tour copy is `textContent`, never `innerHTML`. The only `innerHTML` allowed is a compile-time-literal inline SVG with zero interpolation (see the "?" glyph pattern below).

### Demo-mode gate
**Source:** `assets/attention-coordinator.js:80-82`
**Apply to:** the "?" tour row (D-16) and any coordinator-run reminder (inherited).
```javascript
function isDemo() { return (typeof window !== 'undefined' && window.name === 'demo-mode'); }
```

### Body scroll-lock during the inert overlay (D-07)
**Source:** `assets/app.js:1671-1685` (`lockBodyScroll`/`unlockBodyScroll`, exported on `App`)
**Apply to:** `assets/tour.js` start/end — do NOT hand-roll scroll math; reuse via `window.App.lockBodyScroll()` / `unlockBodyScroll()` (the coordinator's welcome overlay calls them the same way at attention-coordinator.js:216, 235).
```javascript
try { if (window.App && window.App.lockBodyScroll) window.App.lockBodyScroll(); } catch (e) {}
```
> Open Question (Pitfall 4 / A4): steps 4–6 may need the form scrolled to bring a zone into view while clicks stay inert. Recommendation from research: engine-driven `scrollIntoView(anchor)` before measuring, overlay still blocking clicks. Planner decides and documents.

---

## Pattern Assignments

### `assets/tour.js` (engine, event-driven + transform) — NEW

**Analog (shape):** `assets/attention-coordinator.js`. **Analog (render loop):** `.planning/sketches/003-tour-fallback/index.html` (port source, NOT shipped).

**Declarative step schema (Pattern 1):** drive everything from a `STEPS` array; the render loop never changes when steps are added/reordered.
```javascript
// Adapt sketch 003:818-852 to the 10-step full-spine route + a `page` field
var STEPS = [
  { id:'overview',   page:'index.html',       anchor:'[data-tour="overview"]',   i18nKey:'help.tour.step.overview',  screenName:'Overview', takeMeThereHref:'./index.html' },
  { id:'add-client', page:'index.html',       anchor:'[data-tour="add-client"]', i18nKey:'help.tour.step.addClient', screenName:'Overview', takeMeThereHref:'./index.html' },
  { id:'heart',      page:'add-session.html', anchor:'[data-tour="heart"]',      i18nKey:'help.tour.step.heart',     screenName:'Session',  takeMeThereHref:'./add-session.html' },
  // …10 total across index / add-session / sessions / reporting
];
```

**Anchor degradation resolution (Pattern 2 / TOUR-02 rot guard):** never a silent skip.
```javascript
// Source: sketch 003 index.html:918-921
var el = document.querySelector(step.anchor);
var visible = el && el.offsetParent !== null;   // present AND rendered
if (visible) { spotlightAndTooltip(el, step); } // sketch 922-952
else         { centeredFallbackModal(step); }   // sketch 954-1021 — names where it lives + "Take me there"
```
Caveat (Pitfall 3): `offsetParent` is `null` for `position:fixed` even when visible. All 10 anchors are normal-flow chrome (D-02) so this holds; if any anchor becomes fixed, switch that step to a `getBoundingClientRect().width>0 && getComputedStyle(el).visibility!=='hidden'` test.

**Tethered tooltip + RTL-safe arrow (D-04):** logical properties only.
```javascript
// Source: sketch 003 index.html:924-952
var r = el.getBoundingClientRect(); var pad = 8;
spotlight.style.insetBlockStart  = (r.top  - pad) + 'px';
spotlight.style.insetInlineStart = (r.left - pad) + 'px';   // logical → RTL flips free
spotlight.style.width = (r.width + pad*2) + 'px';
spotlight.style.height = (r.height + pad*2) + 'px';
var below = (window.innerHeight - r.bottom) > 220;
tooltip.setAttribute('data-arrow', below ? 'top' : 'bottom');
var left = Math.max(12, Math.min(r.left + r.width/2 - tooltip.offsetWidth/2,
                                 window.innerWidth - tooltip.offsetWidth - 12));
tooltip.style.insetBlockStart = (below ? r.bottom + 14 : r.top - tooltip.offsetHeight - 14) + 'px';
tooltip.style.insetInlineStart = left + 'px';
tooltip.style.setProperty('--arrow-x',
  Math.max(14, Math.min(r.left + r.width/2 - left - 7, tooltip.offsetWidth - 28)) + 'px');
```

**Fallback modal names where it lives (TOUR-02):**
```javascript
// Source: sketch 003 index.html:972-994
loc.textContent = t('help.tour.fallbackBody').replace('{screen}', step.screenName); // "This is on the {screen} screen."
takeMe.textContent = t('help.tour.takeMeThere');
takeMe.onclick = function (e) { e.preventDefault(); location.href = step.takeMeThereHref; };
```

**Cleanup-then-replace language re-render (Pattern 3 / TOUR-04):** subscribe ONCE (mirror `initHelpEntry._listenerInstalled` idempotency at app.js:573-587).
```javascript
// clearTourChrome() = sketch 003:902-908; app:language dispatch = app.js:126
document.addEventListener('app:language', function () {
  if (!Tour.isActive()) return;
  clearTourChrome();   // remove spotlight/tooltip/fallback nodes
  render();            // re-resolve copy via i18n, re-measure geometry, re-flip arrow
});
```

**Cross-page resume (TOUR-03 / D-06 / D-09):** on Next-to-another-page write `sessionStorage {tourId,stepIndex}` then `location.href`; on load, `initCommon` calls `Tour.resume()` which reads and clears-appropriately. sessionStorage ONLY (Pitfall 6) — clear on both finish and mid-tour close; relaunch reads nothing → step 1.

**Re-measure on scroll/resize while a step is active (Pitfall 4):** debounce with `requestAnimationFrame` (sketch listeners at index.html:1115-1118).

---

### `assets/attention-coordinator.js` (registry) — EDIT: register the D-08 reminder

**Analog:** the install-nudge / mobile-hint surfaces already in this file (315-426) — a new `register()` call is exactly the extension the file was built for.

**Add `'tour-reminder'` to `PRECEDENCE` at the LOWEST slot** (append after `'mobile-hint'`; Open Question 2 / A2 — document the choice so a future Phase-42 `whats-new` surface is never starved):
```javascript
// current: assets/attention-coordinator.js:45
var PRECEDENCE = ['welcome', 'whats-new', 'security-note', 'install-nudge', 'mobile-hint'];
// → append 'tour-reminder' at the end (lowest)
```

**Register pattern (mirrors register at 76-78 + eligible/show idiom at 318-334):** OFFERS to start, never auto-runs (TOUR-01). Demo-off + one-per-session are inherited from `run()` (90-103) — do NOT re-implement.
```javascript
register({
  id: 'tour-reminder',
  eligible: function () {
    return lsGet('sg.tourRemindLater') === '1'
        && lsGet('sg.tourCompleted') !== '1'
        && lsGet('sg.tourNeverRemind') !== '1';
  },
  show: function () { /* mount "Ready to finish the tour?" card via makeEl; Start → window.Tour.start(); Dismiss → removeCard() */ }
});
```
> D-08 constraint: keep these flags independent of the pending `security-note-cadence-backoff` todo — no shared keys.

---

### `assets/app.js` initHelpEntry (chrome) — EDIT: append "Take the tour" row

**Analog:** the items array in the same function (app.js:516-526) — the documented D-09 extension slot; append one item, no rewrite. Suggested position: after "Replay welcome", before "Contact us".
```javascript
// Insert into the items array (app.js:516-526), demo-gated per D-16
{ labelKey: 'help.entry.takeTour', action: function () {
    if (typeof window.Tour !== 'undefined') window.Tour.start();
} },
```
**Demo-gate (D-16):** the tour row must be hidden when `window.name === 'demo-mode'` — either filter it out of `items` before the `forEach` (511-549), or skip its append. Do NOT show a dead row in demo. The existing "?" glyph SVG (app.js:494-499) is the only sanctioned compile-time-literal `innerHTML` — reuse an inline-SVG literal (no interpolation) if a colored export glyph is inlined for step 6's tooltip.
Language re-render of the new row's label is inherited free from the existing `initHelpEntry._listenerInstalled` listener (573-587) because it re-translates every `.help-entry-item[data-label-key]`.

**D-12 welcome CTA rewire** (attention-coordinator.js:178-186, 231): the primary CTA currently is `<a href="./help.html">` and its click handler calls `dismiss()`. Rewire so the CTA BOTH runs the existing `dismiss()` bookkeeping (records `sg.welcomeSeen` + `sg.whatsNewLastSeenVersion` on the non-replay path — Pitfall 8) AND calls `window.Tour.start()` instead of navigating to help.html. Trace the `dismiss()` flow at 215-227 to preserve the one-shot keys.

---

### `assets/i18n-{en,he,de,cs}.js` (i18n data) — EDIT: ~30 `help.tour.*` keys

**Analog:** existing `help.*` / `onboard.*` key blocks. Add ~10 step titles+bodies, finish-card strings, chrome strings (`help.tour.next/back/close/done/counter/fallbackBody/takeMeThere`, reminder card, exit choice), in ALL 4 locales (D-11). Hebrew: noun/infinitive forms, not imperatives (Phase 24 D-05 / Pitfall 9). Guarded by `tests/41-tour-i18n-parity.test.js`.

---

### Page shells `index/add-session/sessions/reporting.html` — EDIT

**Two edits per page:**
1. **Add `data-tour="…"` anchors to real chrome** (Pitfall 1 — they do NOT exist yet; `grep` returns zero). Attributes on nav links / buttons / form sections (never data rows). This is the contract; add before wiring.
2. **Add `<script src="./assets/tour.js"></script> after `app.js`** — the verified script order is `…attention-coordinator.js → app.js` (add-session.html:591-592); tour.js goes right after app.js on all 4 pages.

---

### `sw.js` PRECACHE_URLS — EDIT (Pitfall 7)

**Analog:** the Phase 39 help.js precache block (sw.js, end of PRECACHE_URLS). Add `'/assets/tour.js'` (and `'/assets/tour.css'` if a separate file). CACHE_NAME auto-rolls from INTEGRITY_TOKEN — no manual bump — but the URL-list edit is mandatory or the tour 404s offline.

---

### Tests — NEW (Wave 0, write-first for behavior)

| Test | Analog | Pattern to copy |
|------|--------|-----------------|
| `41-tour-i18n-parity.test.js` | `tests/40-i18n-parity.test.js:29-45` | vm sandbox load of all 4 `i18n-*.js` into `window.I18N`; per locale × key assert presence / non-empty-trim / cross-locale parity / no-emoji |
| `41-precache.test.js` | `tests/40-precache.test.js:24-40` | fs read of sw.js; isolate PRECACHE_URLS array; assert `/assets/tour.js` present AND every tour page `<script>` references the same path (no drift); demo.html excluded |
| `41-anchor-presence.test.js` (write FIRST) | `tests/40-precache.test.js` fs-scan shape | assert each of the 10 `STEPS[].anchor` resolves in its page's markup (source-scan or jsdom mount) — the TOUR-02 rot guard |
| `41-demo-gate.test.js` | `tests/35-demo-*.test.js` + 40-precache demo-exclusion | mount help entry with `window.name='demo-mode'`; assert no "Take the tour" row |
| `41-resume-state.test.js` (consolidated — also covers D-09 relaunch-restart) | jsdom/vm behavior tests | eval tour resume-parse logic via `vm`; assert sessionStorage `{tourId,stepIndex}` round-trips; relaunch with no resume key → step 1 (D-09); `endTour()` clears the resume key |
| `41-fallback-degradation.test.js` | jsdom | missing/hidden anchor → fallback modal with "Take me there", never advances (TOUR-02) |
| `41-lang-rerender.test.js` | jsdom | `app:language` dispatch re-renders step copy at TEXT level (jsdom has no layout — geometry NOT here) |
| `tests/webkit/41-rtl-geometry.mjs` (ad-hoc) | Phase 37 WebKit probe (no committed analog) | Playwright-WebKit RTL + tooltip/arrow geometry (D-14); NOT in `npm test` — documented manual gate |

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tests/webkit/41-rtl-geometry.mjs` | test (Playwright-WebKit) | — | No committed Playwright test in the repo (Playwright is a global, not a devDep); Phase 37 precedent was ad-hoc and not checked in. jsdom has no layout engine so geometry/RTL cannot be asserted in the normal suite. |

> `assets/tour.js`'s render loop has no in-repo analog either, but its port source (`sketch 003`) is concrete enough that it is treated as a match, not a gap.

## Metadata

**Analog search scope:** `assets/` (module + chrome seams), `tests/` (test structure), page shells, `sw.js`, `.planning/sketches/003-tour-fallback/`.
**Files scanned:** attention-coordinator.js (full), app.js (initHelpEntry + language dispatch + scroll-lock), sketch 003 render loop, sw.js PRECACHE, add-session.html script order, 40-precache.test.js, 40-i18n-parity.test.js.
**Pattern extraction date:** 2026-07-08
</content>
</invoke>
