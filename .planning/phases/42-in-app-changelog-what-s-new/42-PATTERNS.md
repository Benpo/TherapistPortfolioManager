# Phase 42: In-App Changelog & What's-New - Pattern Map

**Mapped:** 2026-07-09
**Files analyzed:** 20 (5 new source + 1 new page + 6 modified + 7 new tests + 1 css-location decision)
**Analogs found:** 20 / 20 (all reuse claims verified against real source this session)

> This map builds ON `42-RESEARCH.md` (verified `## Reuse Verification` + `## Architecture Patterns` + `## Entry Schema`). Where research already cited an anchor, this file adds the concrete excerpt an executor copies from. No research claim is contradicted; the three RESEARCH corrections (two-array precache, every-page load, literal-hex on port) are re-flagged inline.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| NEW `assets/changelog-content-en.js` | model / data-module | transform (static read) | `assets/help-content-en.js` | exact |
| NEW `assets/whats-new.js` | provider / coordinator-surface | event-driven (coordinator run) | welcome surface in `assets/attention-coordinator.js` | exact (idiom) |
| NEW `assets/changelog.js` | component / page-renderer | transform (array → DOM) | `assets/help.js` | exact |
| NEW `changelog.html` | config / page-shell | request-response (navigation) | `help.html` | exact |
| NEW `assets/changelog.css` | config / stylesheet | — | `assets/help.css` + sketch 005 Variant B | role-match |
| POPUP CSS location (open Q1) | config / stylesheet | — | `app.css` (always-loaded) | decision |
| MOD `assets/attention-coordinator.js` | provider registration | event-driven | `register({id:'welcome'…})` :256 | exact |
| MOD `assets/app.js` `initHelpEntry` | component / menu | request-response | items array :518-529 + demo filter :533-535 | exact |
| MOD `assets/shared-chrome.js` footer | component / chrome | — | footer version line :135-136 | exact |
| MOD `help.html` | config / page-shell | — | help center rail/card static chrome | role-match |
| MOD `sw.js` | config / precache | file-I/O (SW cache) | `PRECACHE_URLS` :33 + `PRECACHE_HTML` :120 | exact |
| MOD `assets/i18n-en.js` (+he/de/cs) | config / i18n | — | `help.entry.*` keys :596-650 | exact |
| NEW `tests/42-whats-new-gating.test.js` | test | behavior (jsdom) | `tests/40-coordinator.test.js` | exact |
| NEW `tests/42-whats-new-dismiss.test.js` | test | behavior (jsdom) | `tests/40-welcome-overlay.test.js` | role-match |
| NEW `tests/42-changelog-render.test.js` | test | behavior (jsdom) | `tests/39-help-render.test.js` | exact |
| NEW `tests/42-changelog-integrity.test.js` | test | integrity (vm) | `tests/39-help-integrity.test.js` | exact |
| NEW `tests/42-precache.test.js` | test | shape (fs scan) | `tests/39-help-precache.test.js` | exact |
| NEW `tests/42-demo-gate.test.js` | test | behavior (jsdom) | `tests/41-demo-gate.test.js` | exact |
| NEW `tests/42-i18n-parity.test.js` | test | parity (vm) | `tests/40-i18n-parity.test.js` | exact |

---

## Pattern Assignments

### `assets/changelog-content-en.js` (model, static data)

**Analog:** `assets/help-content-en.js:1-50`

**Header-comment schema pattern** (`help-content-en.js:1-46`) — mirror this documented-contract style so `tests/42-changelog-integrity.test.js` and the Phase 43 gate key off it. help-content-en documents its globals, its loaded-by scope, and a `── Schema (enforced by tests/…) ──` block, then closes with a terminology + "No emojis in any text" note.

**Registration idiom** (`help-content-en.js:47-50`):
```javascript
(function () {
  "use strict";
  var SECTIONS = [ /* … */ ];
  // …later assigns window.HELP_CONTENT_EN = SECTIONS;
```
Mirror as `window.CHANGELOG_CONTENT_EN` (a REVERSE-CHRONOLOGICAL array — newest first). Use the schema from RESEARCH `## Entry Schema` (version / anchor / date / lede / highlights[2-4] / categories{new?,improved?,fixed?} / origin?). Keep the global name matching the `HELP_CONTENT_EN` precedent.

> Content is placeholder until the D-03 wording pipeline + D-04 Ben approval. Only the STRUCTURE is locked here.

---

### `assets/whats-new.js` (provider, coordinator surface)

**Analog:** welcome surface in `assets/attention-coordinator.js` — register :256, dismiss :220-232, keydown/focus-trap :201-218.

**Storage helpers + key** (`attention-coordinator.js:51,59-60`) — the key ALREADY exists; reuse the exact string, do not invent:
```javascript
var WHATS_NEW_LAST_SEEN = 'sg.whatsNewLastSeenVersion';
function lsGet(k){ try { return window.localStorage.getItem(k); } catch(e){ return null; } }
function lsSet(k,v){ try { window.localStorage.setItem(k,v); } catch(e){} }
```

**Register at eval time** (mirror `attention-coordinator.js:256`):
```javascript
register({ id: 'welcome', eligible: welcomeEligible, show: function () { showWelcome(false); } });
```
becomes, in `whats-new.js`, a self-registering IIFE that runs BEFORE `run()` (run() fires at DOMContentLoaded via `app.js` bootAttentionSurfaces):
```javascript
window.AttentionCoordinator.register({ id: 'whats-new', eligible: eligible, show: show });
```
`'whats-new'` is `PRECEDENCE[1]` already (`attention-coordinator.js:47`) — `run()` skips it today only because no surface is registered (:97 comment).

**Deliberate-dismiss helper (D-09)** — mirror welcome `dismiss()` (`attention-coordinator.js:220-232`): unlock scroll, remove keydown listener, remove overlay, restore focus to opener, THEN write the last-seen key. Welcome writes it only on the non-replay path (:227-231); whats-new writes it on EVERY dismiss path (Close / Esc / "See everything new"). NO overlay-click handler (Pitfall 5 — welcome has none either).
```javascript
if (!isReplay) {
  lsSet(WELCOME_SEEN, '1');
  var v = (window.AppVersion && window.AppVersion.APP_VERSION);
  if (v) lsSet(WHATS_NEW_LAST_SEEN, v);   // ← whats-new: unconditional, all 3 paths
}
```

**Focus trap + Esc** (`attention-coordinator.js:201-218`) — copy the `onKeydown` Tab-cycle + `Escape → dismiss()` verbatim; adjust the two focus endpoints to the popup's CTAs.

**Mount + a11y contract** (`attention-coordinator.js:129-133, 247-253`): overlay gets `role=dialog`, `aria-modal=true`, `aria-labelledby`; remember `opener=doc.activeElement`, `App.lockBodyScroll()`, append, focus the primary CTA.

**D-07 silent-skip reconcile** — no analog (new behavior; RESEARCH Pitfall 3 / Pattern 1). On eval, if `APP_VERSION !== lastSeen && !entryFor(APP_VERSION)` → `lsSet(WHATS_NEW_LAST_SEEN, APP_VERSION)`. Tested by T-42-V3.

---

### `assets/changelog.js` (component, array → DOM)

**Analog:** `assets/help.js:26-49` (banner + inline-SVG rule), `:349-464` (render), `:466-478` (boot).

**XSS trust-boundary banner** (`help.js:22-24`) — copy the "ALL dynamic text via createElement+textContent; only compile-time-literal SVG uses innerHTML" contract verbatim. Entry text is `textContent` only (V5 / T-42 render tests).

**Render-from-global pattern** (`help.js:349-355`):
```javascript
function render() {
  var sections = window.HELP_CONTENT_EN;
  if (!Array.isArray(sections)) return;
  var featured = sections.filter(function (s) { return s.featured; });
  // …builds DOM into empty shell containers
```
Mirror: read `window.CHANGELOG_CONTENT_EN`, iterate reverse-chron, build Variant-B entry cards into the empty `changelog.html` container. Empty categories omitted; v1.0 (`origin:true`) renders the one-liner with no category blocks; each entry gets a stable kebab `anchor` id (`v1-3`) for deep-links.

**Live-label / chrome via `t()`** (`help.js:358-364`) — title + intro from i18n keys:
```javascript
var title = document.getElementById("helpTitle");
if (title) title.textContent = t("help.page.title");
```

**app:language re-render** (`help.js:455-463`) — copy the once-wired listener that calls `render()` on language switch.

**boot** (`help.js:466-478`) — copy verbatim (`App.initCommon()` then `render`, DOMContentLoaded guard).

**EN-fallback loader (D-16)** — no direct analog (help is EN-only, no fallback merge yet). Use RESEARCH Pattern 2 `localeEntries()` shape: read `CHANGELOG_CONTENT_<LANG>`, fall back per-entry to EN. Expose a `window.Changelog = {…}` test seam mirroring help.js's `window.Help`.

---

### `changelog.html` (config, page shell)

**Analog:** `help.html` (full file, 1-140).

Copy verbatim and adapt:
- The 4 head guard scripts (`help.html:4-15`) — crashlog buffer, terms-gate, license-gate, dark-theme — copy UNCHANGED (every app page has them).
- CSS chain (`:22-26`): `tokens.css → app.css → changelog.css` (+ any always-loaded popup css). Do NOT drop `app.css` — the popup reuses `.btn-primary`.
- `body data-nav` (`:28`) — use `data-nav="changelog"` or omit (RESEARCH open Q2: "?" need not be active on this page; `initHelpEntry` only sets is-active for `nav==='help'`, `app.js:504`).
- Empty content container(s) for `changelog.js` to fill (mirror the empty `#helpCards`/`#railBody` idiom `:73,93`).
- Script chain (`:114-136`): the i18n → db → version → shared-chrome → attention-coordinator → app.js core, THEN — mirroring the help corpus comment `:133-135` — load `changelog-content-en.js` BEFORE `changelog.js`.
- SW registration footer script (`:137-139`) verbatim.

> **Every-page load (RESEARCH Pitfall 2 / A3):** `changelog-content-en.js` + `whats-new.js` must ALSO be added to the script chain of EVERY chrome-mounting page (the set that loads `attention-coordinator.js`), not just `changelog.html` — because `run()`/`eligible()` fire on the launch page. This is the real integration cost; touch each page's `<script>` block.

---

### `assets/changelog.css` (config, styles)

**Analog:** `assets/help.css` (page-scoping idiom) + sketch `005-changelog-register/index.html:56-99` (Variant B `.entry`/`.cat-sec`/`.entry-lede`).

Port ONLY Variant B token-based rules. **RESEARCH correction (Pitfall 6 / Reuse row):** do NOT port `.btn-primary{color:#fff}` (`sketch:157`) or Variant-A chip hex (`sketch:111,114`) — reuse app's `.btn-primary`/`.btn-quiet` and `var(--color-text-inverse)`. Grep the ported CSS for `#` hex before commit.

**Open Q1 (popup CSS location):** popup `.overlay`/`.popup` rules must live in an ALWAYS-LOADED stylesheet (`app.css` or a small `whats-new.css` added to every page + `PRECACHE_URLS`), NOT `changelog.css` (only loaded on the page → popup unstyled elsewhere). Planner decides; flag as a task detail.

---

### `assets/attention-coordinator.js` (MODIFY — registration only, or none)

**Analog:** `register(...)` :256. The slot is pre-reserved (`PRECEDENCE` :47). Per RESEARCH Pattern 1, registration lives in the new `whats-new.js` module (self-registers, like the other eval-time surfaces), so this file may need NO edit — confirm during planning. If a `_getSurface('whats-new')` test hook path is needed, it already exists (`:502`, per RESEARCH test note).

---

### `assets/app.js` `initHelpEntry` (MODIFY — add menu row)

**Analog:** the ADDABLE items array `app.js:518-529` + demo filter `:533-535`. The `:471-472` comment already names "What's new" as the anticipated third append.

**Add the row** (before the demo filter):
```javascript
{ labelKey: 'whatsNew.menuRow', href: './changelog.html' },   // NEW — opens the PAGE (D-14)
```
Place per D-14 (opens page, never re-triggers popup). Exact slot is discretion.

**Extend the demo gate** (`app.js:533-535`) — the existing filter drops `help.entry.takeTour`; add `whatsNew.menuRow` to the dropped set (D-15):
```javascript
if (typeof window !== 'undefined' && window.name === 'demo-mode') {
  items = items.filter(function (item) {
    return item.labelKey !== 'help.entry.takeTour'
        && item.labelKey !== 'whatsNew.menuRow';
  });
}
```

---

### `assets/shared-chrome.js` footer (MODIFY — discretionary version link)

**Analog:** footer render `:135-136`, demo seam `:108-111`, independent nudge `:149-183`.

**Current** (`:135-136`):
```javascript
'<p class="app-footer-copy">&copy; 2026 Sessions Garden &middot; v' + APP_VERSION +
  '<span class="app-footer-version-warn" aria-hidden="true"></span></p>'
```
**Change (UI-SPEC resolved YES):** wrap ONLY the `v{APP_VERSION}` text in `<a href="./changelog.html">`; the `.app-footer-version-warn` span stays a SIBLING OUTSIDE the anchor (independence guard — never touch `maybeUpgradeFooterAndNudge`/`buildNudge` :149-183). In demo, render inert text using the already-computed `isDemo` (`:108`, pattern from `licenseLinkHtml` :109-111). Link styled `--color-text-muted`, underline on hover only.

---

### `help.html` (MODIFY — link to changelog page)

**Analog:** the static chrome cards/rail in `help.html` (e.g. the contact-band `:99-104`). Add a "What's new" card/rail link → `./changelog.html`. Exact IA placement is discretion (D-13). Keep it static chrome (not injected by help.js) or add to help.js's static shell — planner's call.

---

### `sw.js` (MODIFY — two-array precache)

**Analog:** `PRECACHE_URLS` :33-45, `PRECACHE_HTML` :120-143.

**RESEARCH correction #1 — TWO arrays, do not conflate.**
Add to `PRECACHE_URLS` (sub-resources): `/assets/changelog-content-en.js`, `/assets/whats-new.js`, `/assets/changelog.js`, `/assets/changelog.css` (+ `/assets/whats-new.css` if that popup-css option is chosen).
Add to `PRECACHE_HTML` (extensionless pages, mirror `/help` :142): `'/changelog'`.
No manual CACHE_NAME bump (auto-rolls from INTEGRITY_TOKEN). Keep the anti-stale `fetch(url,{cache:'reload'})` guard intact.

---

### `assets/i18n-en.js` (+ he/de/cs) (MODIFY — new UI-chrome keys)

**Analog:** `help.entry.*` keys at `i18n-en.js:596-598,650`:
```javascript
"help.entry.label": "Help",
"help.entry.center": "Help center",
"help.entry.contact": "Contact us",
// …
"help.entry.takeTour": "Onboarding Tour",
```
Add in ALL 4 locales THIS phase (D-17, standing rule — chrome strings only, not entry body):
`changelog.page.title`, `changelog.page.intro`, `changelog.cat.new`, `changelog.cat.improved`, `changelog.cat.fixed`, `whatsNew.title`, `whatsNew.sub`, `whatsNew.seeAll`, `whatsNew.close`, `whatsNew.menuRow`.

---

### Tests (7 new, all RED first)

| New test | Analog to copy | Pattern notes |
|----------|----------------|---------------|
| `tests/42-whats-new-gating.test.js` (V1/V2/V3) | `tests/40-coordinator.test.js` | jsdom builder: eval `attention-coordinator.js` + `whats-new.js`, seed `window.AppVersion` + `window.CHANGELOG_CONTENT_EN`; reach surface via `AttentionCoordinator._getSurface('whats-new')` (`attention-coordinator.js:502`) |
| `tests/42-whats-new-dismiss.test.js` (V4/V5) | `tests/40-welcome-overlay.test.js` | assert backdrop-click leaves popup + lastSeen unchanged; Close/Esc/CTA each write lastSeen; a11y attrs on mount |
| `tests/42-changelog-render.test.js` (V7/V8) | `tests/39-help-render.test.js` | reverse-chron cards, empty categories omitted, v1.0 one-line, kebab anchors; EN-fallback |
| `tests/42-changelog-integrity.test.js` (V9) | `tests/39-help-integrity.test.js:29-52` | vm sandbox loads `i18n-en.js` + `changelog-content-en.js`; unique semver, order, highlights len 2-4, categories ⊆ {new,improved,fixed}, v1.0 origin-only, latest==APP_VERSION has highlights, no-emoji |
| `tests/42-precache.test.js` (V6) | `tests/39-help-precache.test.js:44-71` | fs scan: isolate `PRECACHE_URLS` regex + `PRECACHE_HTML` regex; assert new assets in URLS, `/changelog` in HTML, anti-stale `fetch(url,{cache:'reload'})` intact, no bare `cache.add(url)` |
| `tests/42-demo-gate.test.js` (V10) | `tests/41-demo-gate.test.js` | `window.name='demo-mode'` → no `whatsNew.menuRow` row; footer version link inert |
| `tests/42-i18n-parity.test.js` (V11) | `tests/40-i18n-parity.test.js` | presence + non-empty + parity + no-emoji for all `changelog.*`/`whatsNew.*` across en/he/de/cs |

All auto-discovered by `tests/run-all.js` (top-level `*.test.js` glob) — no wiring.

---

## Shared Patterns

### try/catch localStorage access
**Source:** `attention-coordinator.js:59-62`
**Apply to:** `whats-new.js` (all `sg.*` reads/writes)
```javascript
function lsGet(k){ try { return window.localStorage.getItem(k); } catch(e){ return null; } }
function lsSet(k,v){ try { window.localStorage.setItem(k,v); } catch(e){} }
```

### XSS trust boundary — textContent only
**Source:** `help.js:22-24`
**Apply to:** `changelog.js`, `whats-new.js` (all data-derived text)
Only compile-time-literal SVG may use `innerHTML`; every entry/highlight string is `createElement` + `textContent`.

### Version source of truth
**Source:** `version.js:27` → `window.AppVersion.APP_VERSION` (`'1.3.0'`)
**Apply to:** `whats-new.js` gating + `shared-chrome.js` footer + popup headline
NEVER read `INTEGRITY_TOKEN`, SW cache name, or a second constant (anti-pattern).

### Demo seam
**Source:** `window.name === 'demo-mode'` (`app.js:533`, `shared-chrome.js:108`, `attention-coordinator.js:83`)
**Apply to:** "?" menu row (app.js), footer link (shared-chrome), page reachability. Popup is already impossible in demo (`run()` early-returns, `:93`).

### aria-modal deliberate-dismiss idiom
**Source:** `attention-coordinator.js:126-254` (welcome overlay)
**Apply to:** the whats-new popup — role/aria-modal/aria-labelledby, focus-trap Tab cycle, Esc, opener focus restore, `App.lockBodyScroll`, NO backdrop-close.

---

## No Analog Found

| File / behavior | Role | Data Flow | Reason |
|-----------------|------|-----------|--------|
| D-07 silent-skip reconcile (in `whats-new.js`) | provider | event-driven | No existing surface advances its last-seen key on a no-show path; new behavior per RESEARCH Pitfall 3 (use `reconcileSilentSkip` shape) |
| EN-fallback merge loader (in `changelog.js`) | component | transform | help.js is EN-only with no per-entry fallback; use RESEARCH Pattern 2 `localeEntries()` shape (Phase 42.1 fills the locale siblings) |

---

## Verification Notes (reuse claims that HOLD, with one caveat)

- ✅ `PRECEDENCE` contains `'whats-new'` at index 1 — `attention-coordinator.js:47`.
- ✅ `WHATS_NEW_LAST_SEEN='sg.whatsNewLastSeenVersion'` declared `:51`, written by welcome dismiss `:227-231`.
- ✅ `register({id,eligible,show})` contract `:78-80`; `run()` iterates + guards throws `:92-105`.
- ✅ `initHelpEntry` addable array `:518-529` + demo filter `:533-535`; `:471-472` comment names "What's new".
- ✅ Footer version line `:135-136`; independent nudge `:149-183`; demo seam `:108`.
- ✅ `help.html` shell + `help.js:349-478` render/boot directly copyable.
- ✅ `sw.js` two-array split `:33` / `:120-143`; `/help` precedent `:142`.
- ✅ i18n `help.entry.*` :596-650 (note `takeTour` sits at :650, separated from the :596-598 block — add new keys in the same file, position flexible).
- ⚠️ **Caveat (RESEARCH corrections stand):** (1) page → `PRECACHE_HTML` not `PRECACHE_URLS`; (2) sketch CSS has literal hex — reuse app classes; (3) surface + data module load on EVERY page, not just the changelog page. None invalidate the reuse premise; all three MUST become explicit tasks.

## Metadata

**Analog search scope:** `assets/` (source modules), root HTML shells, `sw.js`, `tests/`, `.planning/sketches/005-changelog-register/`
**Files read this session:** help-content-en.js, help.js, help.html, attention-coordinator.js (2 ranges), app.js (initHelpEntry), shared-chrome.js (footer), sw.js (both arrays), 39-help-precache.test.js, 39-help-integrity.test.js, i18n-en.js (grep)
**Pattern extraction date:** 2026-07-09
