# Phase 42: In-App Changelog & What's-New - Research

**Researched:** 2026-07-09
**Domain:** Vanilla PWA feature assembly (attention-coordinator surface + standalone page + shared data module + offline precache + i18n)
**Confidence:** HIGH — every claim below is verified against real source; zero external dependencies.

## Summary

This is an **assemble-known-patterns** phase, not a greenfield one. Every mechanism the popup and page need already exists in the codebase and was verified this session: the `AttentionCoordinator` reserved slot, the `WHATS_NEW_LAST_SEEN` key (already written by the welcome), the `help.html` per-page shell, the `help-content-en.js` data-module schema, the `initHelpEntry` addable-row array, the footer version line, the two-array precache system, and the `39-help-*` test templates. The approved sketch 005 supplies the exact Variant-B CSS and popup DOM.

The research surfaced **three corrections to the CONTEXT/UI-SPEC reuse premises** that the planner must act on (details in `## Reuse Verification`):
1. **Offline precache uses TWO arrays, not one.** `changelog.html` does NOT go in `PRECACHE_URLS` — the extensionless `/changelog` goes in a separate `PRECACHE_HTML` array (CF Pages pretty-URL convention). JS/CSS/data assets go in `PRECACHE_URLS`. Putting `.html` in `PRECACHE_URLS` would hit the exact redirect failure that array split exists to avoid.
2. **The popup surface + the changelog data must load on EVERY app page**, not just `changelog.html` — because `AttentionCoordinator.run()` fires once on whichever page the session starts, and `eligible()` must read the changelog data to honor the D-07 silent-skip. This is a real integration cost (new `<script>` tags on every page's chain), not a single-page addition.
3. **The sketch's ported CSS contains literal hex** (`color:#fff` on `.btn-primary`) that violates the no-literal-hex rule — reuse the app's existing `.btn-primary`/`.btn-quiet` from `app.css` and `var(--color-text-inverse)` instead of porting the sketch's button block verbatim.

One design nuance the CONTEXT flagged but did not fully mechanize: **D-07's "silent skip … the last-seen version still updates quietly"** requires an explicit write of `sg.whatsNewLastSeenVersion = APP_VERSION` on the no-entry path. Since `eligible()` returns false and `show()` never runs on that path, nothing writes the key unless a dedicated reconcile step does. See Pitfall 3 + Validation test T-42-V3.

**Primary recommendation:** Ship a new `assets/whats-new.js` (self-registering coordinator surface, loaded on every page) + `assets/changelog-content-en.js` (data, loaded on every page) + `changelog.html` / `assets/changelog.js` / `assets/changelog.css` (page). Register the surface at script-eval time so it precedes `bootAttentionSurfaces()`'s `run()`. Precache JS/CSS/data in `PRECACHE_URLS` and `/changelog` in `PRECACHE_HTML`. Author all behavior + integrity tests RED first.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Backfill = detailed entries for v1.1 → v1.3, plus v1.0 as a one-line "initial launch" marker with no content bullets. v1.0 never reached customers — origin line only.
- **D-02:** The v1.2.x patch wave (v1.2.1→v1.2.4) consolidates into ONE v1.2 entry — a single benefit-led story dated with the final release date. No per-patch bugfix-log energy.
- **D-03:** Sourcing = curated artifacts, never commit archaeology. Draft from `PROJECT.md` "Validated" ledger, the v1.2.4 users draft, milestone archives. Git history used ONLY for release dates. Two filters: register filter (only user-feelable changes survive) + Phase 39 D-19 wording pipeline (writer → factual gate → native-speaker gate → DNA/voice gate).
- **D-04:** Ben approves ALL entry copy before ship (the v1.2.4 draft is source material only, never approved). Plan an explicit copy-approval checkpoint covering the backfill AND the v1.3 entry.
- **D-05:** Teaser + link popup: headline + top 2–4 highlights + primary "See everything new" button + quiet Close. The page carries the full story; the popup is an announcement, not a reader.
- **D-06:** Modest centered modal — standard app modal idiom with a garden touch. Full-screen treatment stays unique to the welcome overlay.
- **D-07:** Silent skip when there is no entry for the running version: no popup, but the last-seen version still updates quietly. Popup fires only when the data source has an entry for `APP_VERSION`.
- **D-08:** Highlights are hand-picked per release — each entry carries an explicit `highlights` field. Phase 43 gate can check the field exists.
- **D-09:** Deliberate dismiss only (welcome-overlay idiom): outside/backdrop clicks do NOTHING. Close, "See everything new", or Esc dismiss — each records the version as seen.
- **D-10:** No emojis in-app. Changelog page + popup follow the calm no-emoji register. Emoji register stays for WhatsApp/marketing OUTSIDE the app.
- **D-11:** Entry structure = sketch 005 Variant B — grouped by category: per-version heading (version + date) + one-sentence benefit lede + New/Improved/Fixed blocks with small colored uppercase category headings. Empty categories omitted. Start from the sketch's Variant B rendering.
- **D-12:** The full v1.3 entry is drafted NOW from the locked roadmap/REQUIREMENTS scope. GATE-04 (Phase 43) re-checks the entry against what actually shipped before the production push.
- **D-13:** Changelog is its own standalone page in the help family (not a section inside `help.html`). Help center links to it (a "What's new" card/rail link — exact IA placement Claude's discretion).
- **D-14:** The "?" popover gains a "What's new" row that opens the changelog PAGE (the destination link the app.js extension-slot comment anticipated). The popup is never re-triggerable from the menu.
- **D-15:** Hidden in demo mode (`window.name === 'demo-mode'`): the "?" What's-new row hides; the page is not reachable from the demo iframe. The popup is already impossible in demo (coordinator disabled).
- **D-16:** EN fallback per entry — an entry (or part) not yet translated renders in English inside an otherwise-localized page; history is always complete in every locale and the popup always has content.
- **D-17:** Per-locale data files, EN canonical — mirror the `help-content-en.js` precedent. Phase 42.1 adds HE/DE/CS siblings + per-locale integrity tests. "One structured data source" (CHLG-03) = one logical source; UI-chrome strings ship as `data-i18n` keys in all 4 locales THIS phase.

### Claude's Discretion
- **Footer version link** — Ben delegated ("You decide") whether the footer `v1.3.0` line becomes a quiet link to the changelog page. UI-SPEC resolved **YES** with guards: link wraps only the version TEXT, leaves the `.app-footer-version-warn` ⚠ span untouched and outside the link, suppressed in demo mode, `--color-text-muted` underline-on-hover only.
- **Dismiss/a11y micro-details** beyond D-09 (focus trap + restore, `aria-modal`, SR announcement) — follow the welcome overlay / confirmDialog idioms.
- Data module name and exact entry schema fields (beyond version, date, lede, categorized bullets, hand-picked `highlights`, and whatever hook Phase 43 needs); `sg.*` storage semantics beyond the established `sg.whatsNewLastSeenVersion` key.
- Exact "?" menu position of the "What's new" row and help-center card/rail placement.
- Multi-version jump: popup shows the latest entry; the page carries everything missed.
- Whether "See everything new" deep-links to the latest version's anchor (UI-SPEC resolved YES → `changelog.html#v1-3`).

### Deferred Ideas (OUT OF SCOPE)
- Emoji-flavored release announcements for WhatsApp/marketing — stays outside-the-app.
- Release history as a landing-page/demo marketing signal — landing-page effort, not an app change.
- Dismiss semantics & a11y as a formal discussion area — resolved to Claude's discretion within D-09's frame.
- **Not this phase:** the docs-maintenance hard gate (Phase 43); HE/DE/CS translation of entry content (Phase 42.1); rich-text authoring (v1.4); email/push announcements (AF-11); any change to the footer integrity nudge or backup reminder.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHLG-01 | Opening the app after a version change shows a "What's New in vX.Y.Z" popup exactly once — keyed on `APP_VERSION` vs stored last-seen, suppressed on first-ever launch (welcome owns first-run), dismiss records the version, works fully offline | Verified `AttentionCoordinator` slot + `WHATS_NEW_LAST_SEEN` key + first-run subsume-write (`attention-coordinator.js:47,51,227-231`). Offline via `PRECACHE_URLS` (whats-new.js + data) — the popup renders from precached JS/data on the launch page. See `## Architecture Patterns` P1, `## Offline Wiring`. |
| CHLG-02 | Persistent changelog page inside the help center — reverse-chronological, grouped by version + date, plain-language benefit-led (New/Improved/Fixed, no jargon) | Verified `help.html` shell + `help.js`/`help-content-en.js` render pattern to mirror; sketch 005 Variant B CSS to port. See `## Architecture Patterns` P2. |
| CHLG-03 | One structured, i18n-capable data source drives BOTH popup (latest entry) and page (history) — never forked, never scraped from git, no second version constant | Single `window.CHANGELOG_CONTENT_EN` array read by both `whats-new.js` (latest `.highlights`) and `changelog.js` (full history). Version read from `window.AppVersion.APP_VERSION` only. See `## Entry Schema`. |
| CHLG-04 | v1.3's own release notes ship as the first changelog entry (self-hosting proof) | v1.3 entry authored now from roadmap scope (D-12); v1.1/v1.2 backfill + v1.0 origin line (D-01/D-02). Sourcing per D-03. Copy-approval checkpoint per D-04. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Once-per-version popup gating | Browser / Client (localStorage) | — | Pure client state; `sg.whatsNewLastSeenVersion` vs `APP_VERSION`. No server exists. |
| Popup render + dismiss | Browser / Client (coordinator surface) | — | Mirrors welcome overlay; DOM built in JS, `textContent` only. |
| Changelog page render | Browser / Client (per-page module) | — | Mirrors `help.js` — reads a global data array, builds DOM. |
| Changelog data source | Static asset (precached JS) | — | `assets/changelog-content-en.js` global, like `help-content-en.js`. Zero fetch. |
| Offline availability | CDN/Static (SW precache) | — | `PRECACHE_URLS` (assets) + `PRECACHE_HTML` (`/changelog`). |
| Version source of truth | Static asset (`version.js`) | — | `window.AppVersion.APP_VERSION` only — never the SW/integrity token layer. |
| i18n UI-chrome | Static asset (i18n-*.js × 4) | — | `changelog.*` / `whatsNew.*` keys in all 4 locales this phase. |

## Standard Stack

**No external packages.** This is a zero-npm-dependency vanilla HTML/CSS/JS PWA (PROJECT.md hard constraint). The "stack" is the app's own established modules and conventions:

| Asset / Convention | Role in this phase | Why standard | Provenance |
|--------------------|--------------------|--------------|------------|
| `assets/attention-coordinator.js` | Governs the popup via reserved `'whats-new'` slot | Phase 40 built the slot specifically for this | [VERIFIED: attention-coordinator.js:47,51,78] |
| `assets/version.js` → `window.AppVersion.APP_VERSION` | The ONLY version the popup reads (`'1.3.0'`) | Single source of truth; integrity layer stays independent | [VERIFIED: version.js:27,331-351] |
| `assets/help-content-en.js` schema | Template for the changelog data module | The documented per-locale content-module precedent | [VERIFIED: help-content-en.js:1-46] |
| `assets/help.js` render pattern | Template for `changelog.js` (read global array → build DOM via createElement/textContent) | Same offline, XSS-safe, `app:language` re-render idiom | [VERIFIED: help.js:26-49,349-492] |
| `help.html` per-page shell | Template for `changelog.html` (tokens→app→page CSS, script chain, `data-nav`, `SharedChrome` footer) | The established per-page pattern | [VERIFIED: help.html:22-28,114-136] |
| `assets/app.js` `initHelpEntry` addable array | Where the "?" "What's new" row appends | Built addable for exactly Phases 40–42 (comment at ~472) | [VERIFIED: app.js:471-472,514-535] |
| `assets/shared-chrome.js` footer | Where the discretionary version link lands | Renders `v{APP_VERSION}` + independent ⚠ span | [VERIFIED: shared-chrome.js:135-136] |
| `assets/tokens.css` semantic tokens | All colors/spacing — no literal hex | Two-tier token system, dark-mode auto | [VERIFIED: tokens.css:29,41-42,56,76-77,82,85,114] |
| `tests/run-all.js` auto-discovery | New `tests/42-*.test.js` join `npm test` automatically | Top-level `*.test.js` glob | [VERIFIED: run-all.js:46-48] |

**Installation:** none. No `npm install`. No new dependencies.

## Package Legitimacy Audit

**Not applicable.** This phase installs zero external packages (vanilla PWA, zero npm runtime deps; only devDependency is the already-installed `jsdom` used by tests). No registry lookups performed because no packages are introduced.

## Architecture Patterns

### System Architecture Diagram

```
                    window.AppVersion.APP_VERSION ('1.3.0')   [version.js — semver ONLY,
                                   │                            never the SW/integrity token]
                                   │
          ┌────────────────────────┼────────────────────────────┐
          │                        │                             │
   window.CHANGELOG_CONTENT_EN  (single data source, CHLG-03)   │
   [assets/changelog-content-en.js — precached, loaded on ALL pages]
          │                                                      │
   ┌──────┴───────────────────┐                      ┌──────────┴───────────────┐
   │  assets/whats-new.js      │                      │  assets/changelog.js      │
   │  (coordinator surface,    │                      │  (page renderer,          │
   │   loaded on ALL pages)    │                      │   changelog.html only)    │
   │                           │                      │                           │
   │  self-registers at eval:  │                      │  reads FULL history →     │
   │  register({id:'whats-new',│                      │  reverse-chron entry      │
   │    eligible, show})       │                      │  cards (Variant B),       │
   └──────┬────────────────────┘                      │  EN-fallback per entry    │
          │  (registered BEFORE run())                └──────────┬────────────────┘
          ▼                                                      ▼
   AttentionCoordinator.run()  ← called once per page load     changelog.html
   [app.js bootAttentionSurfaces:1464-1473]                    (PRECACHE_HTML '/changelog')
          │  iterates PRECEDENCE: welcome → whats-new → …
          │  demo-off + one-per-session gated
          ▼
   eligible()?  APP_VERSION !== sg.whatsNewLastSeenVersion
                && entryExistsFor(APP_VERSION)          ┌─ true  → show() modest modal
                                                        │          (latest .highlights,
                                                        │           deliberate-dismiss,
                                                        │           records lastSeen)
                                                        └─ false → no popup
                                                                   (D-07: reconcile writes
                                                                    lastSeen quietly if no entry)

   Entry points → changelog.html:  "?" row (app.js) · help.html rail link · footer version link
   (all three suppressed/absent in demo mode)
```

### Component Responsibilities

| File (new) | Responsibility | Loaded on |
|------------|----------------|-----------|
| `assets/changelog-content-en.js` | The single EN data array `window.CHANGELOG_CONTENT_EN` (+ any registration global) | EVERY app page (popup needs it) |
| `assets/whats-new.js` | Coordinator surface: `eligible()`, `show()` (modal), silent-skip reconcile (D-07) | EVERY app page |
| `changelog.html` | Page shell (mirrors `help.html`) | itself |
| `assets/changelog.js` | Page renderer (mirrors `help.js`); EN-fallback loader (D-16) | `changelog.html` |
| `assets/changelog.css` | Page + entry-card styles (port sketch 005 Variant B) | `changelog.html` (+ popup CSS wherever the popup mounts) |

> **Design choice — keep the popup surface separate from the page renderer.** `whats-new.js` and `changelog.js` both read `window.CHANGELOG_CONTENT_EN` but run in different contexts (every page vs the page only). Merging them would force the full page renderer onto every app page. Follow the Phase 31 pattern: one IIFE per responsibility, four-slot banner, no new globals beyond the data array + surface registration.

### Pattern 1: Self-registering coordinator surface (the popup)

**What:** A new `assets/whats-new.js` IIFE that calls `AttentionCoordinator.register(...)` at script-eval time, so registration is complete before `bootAttentionSurfaces()` calls `run()` at DOMContentLoaded.

**When to use:** For the What's-New popup gating.

**Why this timing works:** `run()` is invoked inside `initCommon()` → `bootAttentionSurfaces()` (`app.js:1464-1473`), which fires on DOMContentLoaded — strictly after all synchronous `<script>` evaluation. The welcome/install-nudge/mobile-hint/tour-reminder surfaces already rely on this exact guarantee (they self-register at eval inside `attention-coordinator.js`). `security-note` is the one registered in `bootAttentionSurfaces` itself, immediately before `run()`. Registering `whats-new` at eval in its own module is consistent and safe.

```javascript
// Source: modeled on attention-coordinator.js:256 (welcome register) +
//         app.js:1467-1472 (security-note register + run)
// assets/whats-new.js  [ASSUMED shape — planner finalizes]
(function () {
  'use strict';
  var WHATS_NEW_LAST_SEEN = 'sg.whatsNewLastSeenVersion'; // MUST match coordinator's key

  function lsGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function lsSet(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
  function appVersion(){ return (window.AppVersion && window.AppVersion.APP_VERSION) || null; }
  function entries(){ return (window.CHANGELOG_CONTENT_EN) || []; }
  function entryFor(v){ return entries().filter(function(e){ return e.version === v; })[0] || null; }

  function eligible() {
    var v = appVersion(); if (!v) return false;
    if (v === lsGet(WHATS_NEW_LAST_SEEN)) return false;   // already seen this version
    return !!entryFor(v);                                  // D-07: only when an entry exists
  }
  function show() { /* build modest modal from entryFor(appVersion()).highlights; deliberate-dismiss */ }

  if (window.AttentionCoordinator && window.AttentionCoordinator.register) {
    window.AttentionCoordinator.register({ id: 'whats-new', eligible: eligible, show: show });
  }

  // D-07 silent-skip reconcile: if version changed but NO entry exists, advance
  // lastSeen quietly so it never re-checks forever (see Pitfall 3).
  (function reconcileSilentSkip(){
    var v = appVersion();
    if (v && v !== lsGet(WHATS_NEW_LAST_SEEN) && !entryFor(v)) lsSet(WHATS_NEW_LAST_SEEN, v);
  })();
})();
```

### Pattern 2: Per-page render module (the page)

**What:** `changelog.html` ships empty containers; `assets/changelog.js` reads `window.CHANGELOG_CONTENT_EN`, builds reverse-chronological entry cards (Variant B), and re-renders on `app:language`. Mirrors `help.js:349-464`.

**Key reuse:** `help.js` already demonstrates: `createElement`+`textContent` only (never `innerHTML` with content — `help.js:22-24`), compile-time-literal SVG the only exception, `App.initCommon()` boot (`help.js:467-473`), `app:language` re-render (`help.js:455-463`), and a `window.Help = {...}` test seam. Copy this shape as `window.Changelog = {...}`.

**EN-fallback loader (D-16):** This phase ships only EN. The loader must be written fallback-ready now:
```javascript
// Source: pattern for D-16 — [ASSUMED shape]
function localeEntries() {
  var lang = /* portfolioLang */ 'en';
  var loc = window['CHANGELOG_CONTENT_' + lang.toUpperCase()];
  var en  = window.CHANGELOG_CONTENT_EN || [];
  if (!loc) return en;                        // whole locale missing → all EN
  // per-entry / per-part fallback merges loc over en (Phase 42.1 fills loc)
  return en.map(function (base) {
    var t = loc.filter(function(e){ return e.version === base.version; })[0];
    return t || base;                         // untranslated entry → EN
  });
}
```

### Pattern 3: Data module mirroring help-content-en.js

**What:** `assets/changelog-content-en.js` registers `window.CHANGELOG_CONTENT_EN` (ordered newest-first array). Mirror the `help-content-en.js` header-comment schema documentation (`help-content-en.js:1-46`) so the Phase 43 gate and the integrity test have a documented contract.

### Anti-Patterns to Avoid
- **Reading the version from anywhere but `AppVersion.APP_VERSION`.** Never `INTEGRITY_TOKEN`, never the SW cache name, never a second constant. (ROADMAP §Phase 42; CHLG-03.)
- **Putting `changelog.html` in `PRECACHE_URLS`.** That array uses `fetch(url,{cache:'reload'})` for sub-resources; navigation HTML lives in `PRECACHE_HTML` as the extensionless `/changelog`. See `## Offline Wiring`.
- **`innerHTML` with entry content.** All entry text is `textContent` (XSS trust boundary — T-39-06/07). Only compile-time-literal SVG may use `innerHTML`.
- **Re-triggering the popup from the "?" menu.** The menu row opens the PAGE (D-14); announcements are one-time.
- **Double-signalling with the integrity nudge.** The footer version link must not touch `.app-footer-version-warn` or the `buildNudge` layer (D-independence guard).
- **Porting the sketch's `.btn-primary { color:#fff }` verbatim.** Literal hex; use the app's `.btn-primary`/`var(--color-text-inverse)` instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| One-per-session / precedence / demo-off gating | A custom "show popup once" flag + timers | `AttentionCoordinator.register/run` (`attention-coordinator.js`) | Already governs precedence, one-per-session, demo-off, throw-safety (`run()`:92-105) |
| First-ever-launch suppression | A separate "isFirstLaunch" check | The welcome's subsume-write (`attention-coordinator.js:227-231`) | Welcome writes `whatsNewLastSeenVersion=APP_VERSION` on first dismiss, so whats-new is naturally ineligible launch 1 |
| Modal focus trap / scroll lock / Esc / focus restore | A new a11y modal | The welcome overlay idiom (`attention-coordinator.js:126-254`) | Verified working pattern: `aria-modal`, Tab cycle, `App.lockBodyScroll`, opener restore |
| Offline page delivery | Fetching changelog JSON at runtime | Static precached JS global (`PRECACHE_URLS`) + `/changelog` in `PRECACHE_HTML` | Zero network; matches help center offline (HELP-07) |
| Page shell + footer + nav | A bespoke page | Mirror `help.html` + `SharedChrome.renderFooter()` | Consistent chrome, dark mode, RTL, back-links all inherited |
| i18n key parity across 4 locales | Manual eyeballing | `tests/40-i18n-parity.test.js` template | Automated presence/non-empty/parity/no-emoji gate |
| Live-label safety in copy | Interpolating labels into markup | `{ui:key}` tokens if any live labels are quoted (help.js:84-110) | Optional here (changelog copy is prose, not label-quoting) but available |

**Key insight:** Phase 40 deliberately reserved the `'whats-new'` slot and pre-wrote the storage key so Phase 42 is "literally one `register()` call" plus its surface DOM — the hardest problems (arbitration, first-run suppression, dismiss a11y) are already solved and tested.

## Runtime State Inventory

Not a rename/refactor/migration phase — this is additive feature work. One storage-key note:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `localStorage 'sg.whatsNewLastSeenVersion'` — already written by welcome dismiss (`attention-coordinator.js:230`). Phase 42 reads it and writes it on popup dismiss + on D-07 silent-skip reconcile. Value = public semver (e.g. `'1.3.0'`). | Reuse the EXISTING key name verbatim — do not invent a new key. |
| Live service config | None — no external services. | None. |
| OS-registered state | None. | None. |
| Secrets/env vars | None. | None. |
| Build artifacts | None — no compiled output; CACHE_NAME auto-rolls from the deploy INTEGRITY_TOKEN (no manual bump). | None. |

## Common Pitfalls

### Pitfall 1: Precaching the HTML in the wrong array
**What goes wrong:** Adding `/changelog.html` (or `/assets/changelog.js` fine, but the page) to `PRECACHE_URLS` — the page 404s or serves a redirect artifact offline.
**Why it happens:** `PRECACHE_URLS` fetches each entry as a sub-resource with `fetch(url,{cache:'reload'})` (`sw.js:175`). CF Pages serves HTML at extensionless pretty URLs, so navigation caching keys are extensionless (`sw.js:257-259`). HTML therefore lives in a SEPARATE `PRECACHE_HTML` array (`sw.js:120-143`) as `/changelog`.
**How to avoid:** JS/CSS/data → `PRECACHE_URLS`. Page → `PRECACHE_HTML` as `'/changelog'`. Mirror `tests/39-help-precache.test.js` exactly (it checks BOTH arrays).
**Warning signs:** "See everything new" opens the home page offline; `changelog.html` blank when network off.

### Pitfall 2: whats-new.js / changelog data not loaded on every page
**What goes wrong:** The popup never fires (or throws) on pages other than `changelog.html`, because `run()` executes on whichever page the session starts and `eligible()` can't find `window.CHANGELOG_CONTENT_EN`.
**Why it happens:** `AttentionCoordinator.run()` is called in `initCommon` on every page (`app.js:1472`); if the surface isn't registered there, the slot is empty and skipped.
**How to avoid:** Add `<script src="./assets/changelog-content-en.js">` and `<script src="./assets/whats-new.js">` to the script chain of EVERY app page that mounts chrome (the same set that loads `attention-coordinator.js`). Load order: after `version.js` + `attention-coordinator.js` + `changelog-content-en.js`, before `app.js` runs `initCommon`. Both must also be in `PRECACHE_URLS`.
**Warning signs:** Popup works on the changelog page but not on index/sessions/overview.

### Pitfall 3: D-07 silent-skip never advances last-seen
**What goes wrong:** A pure-internal release (version bumped, no changelog entry) leaves `sg.whatsNewLastSeenVersion` stale forever, so the moment an entry later exists for a *different* version the logic is fine — but D-07 explicitly says the last-seen version "still updates quietly" on the no-entry path.
**Why it happens:** `eligible()` returns false when no entry exists, so `show()` (which records the version) never runs — nothing writes the key.
**How to avoid:** Add a dedicated reconcile (Pattern 1 `reconcileSilentSkip`): if `APP_VERSION !== lastSeen && !entryFor(APP_VERSION)`, write `lastSeen = APP_VERSION`. This is a deliberate, testable behavior (T-42-V3), not incidental.
**Warning signs:** After a contentless version bump, `sg.whatsNewLastSeenVersion` stays at the old version.

### Pitfall 4: Dismiss records the version in only one path
**What goes wrong:** Only Close records the version; Esc or "See everything new" navigation leaves it unrecorded, so the popup reappears next session.
**Why it happens:** Three dismiss paths (Close, "See everything new", Esc — D-09), each must write `lastSeen`. The navigation path especially is easy to miss (it navigates away before recording).
**How to avoid:** Record `lastSeen = APP_VERSION` in a single `dismiss()` helper called by ALL three paths (mirror `attention-coordinator.js:220-232` where welcome's `dismiss()` writes the keys before acting). For the CTA, write BEFORE `location.href` navigation.
**Warning signs:** Popup reappears after Esc or after clicking "See everything new".

### Pitfall 5: Backdrop click closes the popup
**What goes wrong:** An accidental outside click eats the one-shot announcement (Ben hit exactly this in the sketch).
**Why it happens:** Everyday app modals backdrop-close; copying that idiom here breaks D-09.
**How to avoid:** Do NOT attach an overlay-click → dismiss handler. Only Close, "See everything new", and Esc dismiss (welcome-overlay idiom — the welcome has no backdrop-close handler either). Test T-42-V4 asserts a backdrop click leaves the popup open and `lastSeen` unchanged.
**Warning signs:** Clicking the dimmed background closes the popup.

### Pitfall 6: Literal hex leaks in from the sketch CSS
**What goes wrong:** The ported popup uses `color:#fff` (`sketch:157`) and Variant-A chips use `#b45309`/`#fdba74` — literal hex violates the token rule and breaks dark mode.
**Why it happens:** The sketch is a throwaway mockup; its chrome uses literal hex freely.
**How to avoid:** Variant B (the winner) does NOT use the chip hex. For the popup button, reuse the app's existing `.btn-primary`/`.btn-quiet` classes from `app.css`, or `var(--color-text-inverse)` (`tokens.css:114`) — never `#fff`. Grep the ported CSS for `#` hex before commit.
**Warning signs:** A hardcoded-color visual test flags the popup CTA; wrong button text color in dark mode.

## Code Examples

### Registering the surface (verified anchor)
```javascript
// Source: assets/attention-coordinator.js:256 (welcome) — same one-call contract
register({ id: 'whats-new', eligible: whatsNewEligible, show: whatsNewShow });
// PRECEDENCE already contains 'whats-new' at index 1 (attention-coordinator.js:47):
//   ['welcome', 'whats-new', 'security-note', 'install-nudge', 'mobile-hint', 'tour-reminder']
```

### Deliberate-dismiss helper (verified idiom to mirror)
```javascript
// Source: assets/attention-coordinator.js:220-232 (welcome dismiss writes keys)
function dismiss() {
  App.unlockBodyScroll();                // scroll lock release
  document.removeEventListener('keydown', onKeydown);
  overlay.remove();
  if (opener && opener.focus) opener.focus();   // restore focus to opener
  var v = window.AppVersion && window.AppVersion.APP_VERSION;
  if (v) lsSet('sg.whatsNewLastSeenVersion', v);  // ALL three paths record
}
// Esc → dismiss(); Close → dismiss(); "See everything new" → dismiss() THEN navigate.
// NO overlay-click handler (D-09).
```

### Appending the "?" row (verified extension slot)
```javascript
// Source: assets/app.js:518-535 — add to the `items` array BEFORE the demo filter
var items = [
  { labelKey: 'help.entry.center',   href: './help.html' },
  { labelKey: 'help.entry.takeTour', action: function(){ if (window.Tour) Tour.start(); } },
  { labelKey: 'whatsNew.menuRow',    href: './changelog.html' },   // NEW — opens the PAGE (D-14)
  { labelKey: 'help.entry.contact',  href: 'mailto:contact@sessionsgarden.app' }
];
// Demo gate (app.js:533-535) already filters by labelKey — extend the filter to
// also drop 'whatsNew.menuRow' in demo mode (D-15).
```

### Footer version link (verified target line)
```javascript
// Source: assets/shared-chrome.js:135-136 — wrap ONLY the version text, leave the warn span outside
// Current:
'<p class="app-footer-copy">&copy; 2026 Sessions Garden &middot; v' + APP_VERSION +
  '<span class="app-footer-version-warn" aria-hidden="true"></span></p>'
// New (non-demo): wrap "v{APP_VERSION}" in <a href="./changelog.html"> — the warn span
// stays a sibling OUTSIDE the anchor (independence guard). In demo: render inert text
// (isDemo already computed at shared-chrome.js:108, used for licenseLinkHtml:109-111).
```

## State of the Art

Not applicable in the usual sense (no external ecosystem). The relevant "state of the art" is internal — the codebase's own recent conventions:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `CACHE_NAME` version bump per deploy | Auto-rolls from deploy-stamped `INTEGRITY_TOKEN` | v1.2 (Phase 28) | Adding files to `PRECACHE_URLS`/`PRECACHE_HTML` needs NO manual cache bump |
| Unconditional `showFirstLaunchSecurityNote()` | Governed via `AttentionCoordinator` precedence | Phase 40 | The popup MUST route through the coordinator, not fire directly |
| `.html` naively cached | Two-array precache (`PRECACHE_URLS` assets + `PRECACHE_HTML` extensionless pages) | v1.2/Phase 39 | Page precache goes in `PRECACHE_HTML` as `/changelog` |

## Reuse Verification

The CONTEXT and UI-SPEC make specific reuse claims. Each was checked against real source:

| Claim (CONTEXT/UI-SPEC) | Verdict | Evidence |
|--------------------------|---------|----------|
| "`PRECEDENCE` already contains `'whats-new'` (slot #2)" | ✅ TRUE | `attention-coordinator.js:47` — `['welcome','whats-new',...]`, index 1 (2nd slot). |
| "`WHATS_NEW_LAST_SEEN='sg.whatsNewLastSeenVersion'` already written on welcome dismiss" | ✅ TRUE | `attention-coordinator.js:51` (const) + `:227-231` (non-replay dismiss writes it with `APP_VERSION`). |
| "`register({id, eligible(), show()})` is the one-call integration point" | ✅ TRUE | `attention-coordinator.js:78-80`; `run()` iterates + calls `eligible()`/`show()` `:95-104`. |
| "First-run suppression falls out of the welcome subsume-write" | ✅ TRUE | Welcome is `PRECEDENCE[0]`, eligible when `welcomeSeen!=='1'`; on dismiss writes lastSeen=version → whats-new ineligible launch 1. |
| "`window.AppVersion.APP_VERSION` (currently `1.3.0`)" | ✅ TRUE | `version.js:27` (`'1.3.0'`), exported `:332`, readable page+worker `:349-351`. |
| "`initHelpEntry` ~466–565, the ~472 comment anticipates 'What's new'" | ✅ TRUE | `app.js:471-472` comment names "Replay welcome / Take tour / **What's new**"; addable `items` array `:518-529`; demo filter `:533-535`. |
| "footer + `maybeUpgradeFooterAndNudge` for the version link" | ✅ TRUE | `shared-chrome.js:135-136` renders `v{APP_VERSION}` + `.app-footer-version-warn` span; `maybeUpgradeFooterAndNudge` `:149-183` owns the ⚠/nudge independently. Version link can wrap the text safely. |
| "mirror `help.html` shell" | ✅ TRUE | `help.html:22-28` CSS chain + `:114-136` script chain + `body data-nav`; `help.js:349-464` render pattern is directly copyable. |
| "port sketch 005 CSS" | ⚠️ TRUE **with correction** | Variant B CSS (`.entry`, `.cat-sec`, `.entry-lede`) is token-based and portable (`sketch:56-99`). BUT `.btn-primary{color:#fff}` (`:157`) and Variant-A chip hex (`:111,114`) are literal hex — reuse `app.css` `.btn-primary`/`var(--color-text-inverse)` instead. |
| "new page + data file(s) + new `assets/*.js` join `sw.js` PRECACHE_URLS" | ⚠️ IMPRECISE **— correction** | JS/CSS/data → `PRECACHE_URLS`; the PAGE → `PRECACHE_HTML` as `/changelog` (a SEPARATE array, `sw.js:120-143`). The `39-help-precache.test.js:49-62` template checks both. |
| "one `register()` call" integration | ✅ TRUE **but** note | One `register()` call — but it must live in a module loaded on EVERY page, and `changelog-content-en.js` must ALSO load on every page (eligible() reads it). See Pitfall 2. |
| Coordinator disabled in demo (popup impossible) | ✅ TRUE | `run()` early-returns `isDemo()` `:93` (`window.name==='demo-mode'` `:83`). |

**Net:** the reuse premise is sound. Two mechanical corrections (precache two-array split; literal-hex on port) and one integration-cost clarification (surface + data load on every page) — none invalidate the plan, all must be reflected in tasks.

## Validation Architecture

> nyquist_validation is enabled (`.planning/config.json` → `workflow.nyquist_validation: true`). Behavior tests are authored RED before implementation (project rule + memory `feedback-behavior-verification.md`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in (`assert`) + `jsdom` (installed devDependency) + `vm` sandbox — the project's zero-config harness. No test runner package. |
| Config file | none — `tests/run-all.js` auto-discovers top-level `tests/*.test.js` |
| Quick run command | `node tests/42-<name>.test.js` (single file, <1s each) |
| Full suite command | `npm test` (→ `node tests/run-all.js`) |

### Phase Requirements → Test Map
Harness note: the coordinator behavior tests reuse the `tests/40-coordinator.test.js` jsdom builder (eval `attention-coordinator.js` + `whats-new.js` + seeded `window.AppVersion` + `window.CHANGELOG_CONTENT_EN`), reaching the surface via `AttentionCoordinator._getSurface('whats-new')` (`attention-coordinator.js:502`). The integrity test reuses the `tests/39-help-integrity.test.js` vm pattern.

| ID | Test ID | Behavior | Type | Automated Command | File Exists? |
|----|---------|----------|------|-------------------|-------------|
| CHLG-01 | T-42-V1 | Once-per-version gating: `eligible()` true when `APP_VERSION !== sg.whatsNewLastSeenVersion` AND an entry exists; false when equal | behavior (jsdom) | `node tests/42-whats-new-gating.test.js` | ❌ Wave 0 |
| CHLG-01 | T-42-V2 | First-ever-launch suppression: fresh state (no `welcomeSeen`, no lastSeen) → `run()` shows `welcome` not `whats-new`; after simulated welcome dismiss (lastSeen=version) → whats-new `eligible()` false | behavior (jsdom) | `node tests/42-whats-new-gating.test.js` | ❌ Wave 0 |
| CHLG-01 | T-42-V3 | Silent-skip (D-07): version differs but NO entry for it → `eligible()` false, `show()` never called, AND `sg.whatsNewLastSeenVersion` is advanced to `APP_VERSION` by the reconcile | behavior (jsdom) | `node tests/42-whats-new-gating.test.js` | ❌ Wave 0 |
| CHLG-01 | T-42-V4 | Deliberate-dismiss (D-09): backdrop/outside click → popup stays, lastSeen unchanged; Close AND Esc AND "See everything new" each → popup removed AND lastSeen=`APP_VERSION` | behavior (jsdom) | `node tests/42-whats-new-dismiss.test.js` | ❌ Wave 0 |
| CHLG-01 | T-42-V5 | Popup content: modal renders the LATEST entry's `highlights` (2–4), headline uses `APP_VERSION`; a11y — `role=dialog`, `aria-modal=true`, `aria-labelledby`, focus moved into dialog on mount | behavior (jsdom) | `node tests/42-whats-new-dismiss.test.js` | ❌ Wave 0 |
| CHLG-01/02 | T-42-V6 | Offline precache SHAPE: `PRECACHE_URLS` contains `changelog.js`, `changelog.css`, `changelog-content-en.js`, `whats-new.js`; `PRECACHE_HTML` contains `/changelog`; anti-stale `fetch(url,{cache:'reload'})` intact | shape (fs scan) | `node tests/42-precache.test.js` | ❌ Wave 0 |
| CHLG-02 | T-42-V7 | Page render: `changelog.js` builds reverse-chronological entry cards from `CHANGELOG_CONTENT_EN`; empty categories omitted; v1.0 renders one-line (no category blocks); each entry has a stable kebab anchor id (`v1-3`) | behavior (jsdom) | `node tests/42-changelog-render.test.js` | ❌ Wave 0 |
| CHLG-02 | T-42-V8 | EN-fallback (D-16): when `CHANGELOG_CONTENT_<lang>` absent or an entry missing, the EN entry renders (history complete in every locale) | behavior (jsdom) | `node tests/42-changelog-render.test.js` | ❌ Wave 0 |
| CHLG-03 | T-42-V9 | Data-source structural integrity: unique semver `version` per entry; reverse-chronological order; each content entry has non-empty `lede` + `highlights[]` (len 2–4) + `categories` ⊆ {new,improved,fixed} with non-empty arrays; v1.0 has no categories/highlights; latest entry (=`APP_VERSION`) has `highlights` (popup source, D-08); no emoji code point in any text (D-10) | integrity (vm) | `node tests/42-changelog-integrity.test.js` | ❌ Wave 0 |
| CHLG-04 | T-42-V9 | v1.3 entry present as first array element with `version==='1.3.0'` and non-empty highlights (self-hosting proof) | integrity (vm) | `node tests/42-changelog-integrity.test.js` | ❌ Wave 0 |
| D-15 | T-42-V10 | Demo hiding: `initHelpEntry` in `window.name==='demo-mode'` renders NO `whatsNew.menuRow` row; footer version link suppressed (inert text) in demo | behavior (jsdom) | `node tests/42-demo-gate.test.js` | ❌ Wave 0 |
| D-17 | T-42-V11 | i18n parity: every new `changelog.*` / `whatsNew.*` UI-chrome key present + non-empty + no-emoji across en/he/de/cs (mirror `tests/40-i18n-parity.test.js`) | parity (vm) | `node tests/42-i18n-parity.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the relevant `node tests/42-<name>.test.js`
- **Per wave merge:** `npm test` (full suite, ~131+ files green)
- **Phase gate:** full suite green before `/gsd-verify-work`; plus a real-device offline UAT (popup + `/changelog` navigation offline on an installed PWA) — the vm/jsdom harness cannot exercise the real SW (see `39-help-precache.test.js:18-22`).

### Wave 0 Gaps
- [ ] `tests/42-whats-new-gating.test.js` — T-42-V1/V2/V3 (jsdom, coordinator harness)
- [ ] `tests/42-whats-new-dismiss.test.js` — T-42-V4/V5 (jsdom)
- [ ] `tests/42-precache.test.js` — T-42-V6 (fs scan, mirror 39-help-precache)
- [ ] `tests/42-changelog-render.test.js` — T-42-V7/V8 (jsdom)
- [ ] `tests/42-changelog-integrity.test.js` — T-42-V9 (vm, mirror 39-help-integrity)
- [ ] `tests/42-demo-gate.test.js` — T-42-V10 (jsdom, mirror 41-demo-gate)
- [ ] `tests/42-i18n-parity.test.js` — T-42-V11 (vm, mirror 40-i18n-parity)
- [ ] No framework install needed — jsdom already a devDependency; `run-all.js` auto-discovers.

## Entry Schema

Recommended `window.CHANGELOG_CONTENT_EN` shape (Variant B — D-11; i18n-ready — D-16/D-17; Phase-43-checkable — D-08):

```javascript
// assets/changelog-content-en.js  — mirror help-content-en.js header-comment style
// ── Schema (enforced by tests/42-changelog-integrity.test.js) ──
//   entry: {
//     version    — semver string, unique, e.g. '1.3.0'  (matches AppVersion.APP_VERSION)
//     anchor     — kebab id for deep-links, e.g. 'v1-3'  (major-minor)
//     date       — human release date string, e.g. 'July 2026' (git history for the date, D-03)
//     lede       — one benefit-led sentence (required for content entries)
//     highlights — array of 2–4 hand-picked strings (D-08; the popup source; Phase-43 hook)
//     categories — { new?: string[], improved?: string[], fixed?: string[] }
//                  empty categories OMITTED entirely (D-11)
//     origin     — optional boolean; v1.0 uses { version, anchor, date, lede, origin:true }
//                  with NO highlights/categories (one-line marker, D-01)
//   }
// Array is REVERSE-CHRONOLOGICAL (newest first): [v1.3, v1.2, v1.1, v1.0].
// No emojis in any string (D-10).
window.CHANGELOG_CONTENT_EN = [
  { version:'1.3.0', anchor:'v1-3', date:'July 2026',
    lede:'This release is all about feeling at home…',
    highlights:[ 'A "?" help button on every page…', 'A guided tour…', 'Release notes now live in the app.' ],
    categories:{ new:[…], improved:[…] } },
  { version:'1.2.0', anchor:'v1-2', date:'July 2026', lede:'…', highlights:[…],
    categories:{ new:[…], improved:[…], fixed:[…] } },
  { version:'1.1.0', anchor:'v1-1', date:'June 2026', lede:'…', highlights:[…],
    categories:{ new:[…], improved:[…] } },
  { version:'1.0.0', anchor:'v1-0', date:'May 2026',
    lede:'Where it all began — the first seed of Sessions Garden.', origin:true }
];
```

**Verified backfill facts (dates via git/PROJECT.md — D-03):**
- v1.1 shipped **2026-06-22** (PROJECT.md:5,45 — "Live and sold since v1.1"). Sketch says "June 2026". ✓
- v1.2 shipped **2026-07-07** (PROJECT.md:5,61). Sketch says "July 2026". ✓ Consolidate v1.2.1→v1.2.4 into one entry dated with the final date (D-02).
- v1.3 = **July 2026** (pending push after Phase 43; `APP_VERSION='1.3.0'`).
- v1.0 = origin only (~May 2026 in the sketch), never public (D-01).
- v1.1 content sources: PDF export, snippets, encrypted backups, backup reminders (PROJECT.md v1.1 section). v1.2 content: date engine/Personalize tab, Session Format rename + custom, filters/sorting, Heart-Wall consistency, Safari install reliability, DB self-recovery (PROJECT.md v1.2 section + v1.2.4 draft). v1.3 content: help center, welcome, guided tour, this changelog, mobile hint (roadmap scope, D-12).

> **Copy is NOT researched here.** All entry BODY copy is placeholder until it passes the D-03 wording pipeline (factual → native-speaker → DNA/voice gate) AND Ben's explicit approval (D-04). The schema/structure is what this research locks.

**i18n-chrome keys to add in all 4 locales this phase (D-17):** `changelog.page.title`, `changelog.page.intro`, `changelog.cat.new`, `changelog.cat.improved`, `changelog.cat.fixed`, `whatsNew.title`, `whatsNew.sub`, `whatsNew.seeAll`, `whatsNew.close`, `whatsNew.menuRow`. (Existing `help.entry.*` keys live at `i18n-en.js:596-650` — add the new keys in the same file family.)

## Offline Wiring

**Two arrays in `sw.js` (verified `sw.js:33,120-143`):**

Add to `PRECACHE_URLS` (sub-resources, `sw.js:33`):
```
'/assets/changelog-content-en.js',
'/assets/whats-new.js',
'/assets/changelog.js',
'/assets/changelog.css',
```
Add to `PRECACHE_HTML` (extensionless pages, `sw.js:120`):
```
'/changelog',
```
- **No manual CACHE_NAME bump** — it auto-derives from the deploy-stamped `INTEGRITY_TOKEN` (`version.js:13-19`, `sw.js` cache-name derivation). Editing `PRECACHE_URLS`/`PRECACHE_HTML` is sufficient (verified via memory `reference-pre-commit-sw-bump.md`, 2026-07-08).
- **Popup offline (CHLG-01):** renders from precached `whats-new.js` + `changelog-content-en.js` on the launch page — fully offline once the new SW activates. ✓
- **Page offline (CHLG-02):** `/changelog` in `PRECACHE_HTML` + assets in `PRECACHE_URLS` → the page loads offline even on first visit (unlike runtime-only navigation caching). This is why the two-array approach matters; `help` uses the same (`sw.js:142`).
- **Anti-stale guard must remain** (`fetch(url,{cache:'reload'})`, `sw.js:175`) — the `42-precache.test.js` re-asserts it (mirror `39-help-precache.test.js:67-71`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Module names `assets/whats-new.js` + `assets/changelog-content-en.js` + `assets/changelog.js` + `assets/changelog.css` + `changelog.html` (Claude's discretion per CONTEXT) | Architecture, Offline Wiring | Cosmetic; planner may rename. Keep the data global `window.CHANGELOG_CONTENT_EN` to match the `HELP_CONTENT_EN` precedent. |
| A2 | The D-07 silent-skip reconcile writes `lastSeen=APP_VERSION` (interpreting "still updates quietly") | Pattern 1, Pitfall 3, T-42-V3 | If Ben meant "leave it stale," the reconcile is harmless but T-42-V3 would need adjusting. Low risk — matches the decision's literal wording. |
| A3 | `whats-new.js` + `changelog-content-en.js` load on every app page (needed for `run()` + `eligible()`) | Pitfall 2, Reuse Verification | If only added to some pages, the popup won't fire on those launch pages. Must add to every chrome-mounting page's script chain. |
| A4 | The 18 sketch tokens are all present in production `tokens.css` (UI-SPEC claims verified 2026-07-09) | Reuse Verification | Spot-checked green-600/orange-500/modal-overlay/modal-shadow/green-border-*/primary-deeper/text-inverse all present (`tokens.css`). green-400/500/200/700 + primary-dark trusted from UI-SPEC. Planner should grep before porting if any color renders wrong. |
| A5 | Entry `anchor` field for deep-links (`v1-3`) — UI-SPEC resolved "See everything new" → `changelog.html#v1-3` | Entry Schema | If anchors are derived from `version` instead of a field, adjust the schema; either works. |

## Open Questions

1. **Where exactly does the popup CSS live?**
   - What we know: page CSS → `assets/changelog.css`; the popup mounts on every page via `whats-new.js`.
   - What's unclear: whether the popup's `.overlay/.popup` rules belong in a shared always-loaded stylesheet (so the popup styles offline on any page) vs `changelog.css` (only loaded on the page).
   - Recommendation: put popup styles in an always-loaded stylesheet — `app.css` (loaded everywhere) or a small `assets/whats-new.css` added to every page + `PRECACHE_URLS`. NOT `changelog.css` (which only loads on the page, leaving the popup unstyled elsewhere). Planner to decide; flag as a task detail.

2. **Does `changelog.html` need `data-nav="changelog"` and does the "?" is-active care?**
   - What we know: `initHelpEntry` sets `.is-active` only when `data-nav==='help'` (`app.js:504`).
   - What's unclear: whether the changelog page should mark any nav active.
   - Recommendation: use `data-nav="changelog"` (or omit) — the "?" need not be active on the changelog page (it's not the help page). No is-active wiring needed. Low stakes.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | test suite (`run-all.js`) | ✓ | (project standard) | — |
| jsdom | behavior tests | ✓ | installed devDependency (`run-all.js:36`) | — |
| Real installed PWA (Safari/Chrome) | offline UAT of popup + `/changelog` | manual | — | vm/jsdom shape tests cover wiring; real offline is field-verified (per `39-help-precache.test.js:18-22`) |

No new external dependencies. No missing blocking dependencies.

## Security Domain

> `security_enforcement` not set to false in config → included. This phase adds only local, static, read-only surfaces (no data mutation, no network, no auth).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface introduced |
| V3 Session Management | no | No sessions (localStorage flag only) |
| V4 Access Control | no | No access-controlled resources |
| V5 Input Validation / Output Encoding | **yes** | All entry/popup text via `createElement`+`textContent` — never `innerHTML` with content (T-39-06/07 precedent, `help.js:22-24`). Only compile-time-literal SVG may use `innerHTML`. |
| V6 Cryptography | no | No crypto in this phase |
| V7 Error Handling / Logging | minor | Storage reads wrapped in try/catch (coordinator `lsGet/lsSet` idiom, `attention-coordinator.js:59-62`) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via changelog copy injected as markup | Tampering | `textContent` only for all data-derived text; `{ui:key}` tokens if any live labels are quoted; no `innerHTML` with content (the surfaces' only trust boundary, T-40-03) |
| Demo-mode leakage of the changelog page | Information Disclosure | D-15 — "?" row filtered in demo, footer link inert in demo, coordinator disabled in demo |
| Double-signalling with the integrity ⚠ nudge | (UX integrity) | Footer version link leaves `.app-footer-version-warn` untouched and outside the anchor; never touches `buildNudge`/`checkIntegrity` |

## Sources

### Primary (HIGH confidence) — verified against real source this session
- `assets/attention-coordinator.js` — PRECEDENCE slot, storage key, register/run contract, welcome dismiss subsume-write, demo-off, dismiss a11y idiom (lines 47,51,59-62,78-105,126-254,502)
- `assets/version.js` — `AppVersion.APP_VERSION='1.3.0'`, integrity layer independence (lines 27,332-351)
- `assets/help-content-en.js` — data-module schema precedent (lines 1-46)
- `assets/help.js` — page render pattern, XSS-safe DOM, `app:language` re-render, test seam (lines 22-49,349-492)
- `help.html` — per-page shell CSS + script chain (lines 22-28,114-136)
- `assets/app.js` — `initHelpEntry` addable array + demo filter (lines 471-535); `bootAttentionSurfaces` register+run (lines 1464-1473); is-active nav (504)
- `assets/shared-chrome.js` — footer version line + independent nudge + demo seam (lines 100-183)
- `sw.js` — `PRECACHE_URLS` (33) + `PRECACHE_HTML` (120-143) two-array split + anti-stale fetch (175) + navigation caching (244-287)
- `assets/tokens.css` — semantic tokens the sketch uses (29,41-42,56,76-77,82,85,114)
- `.planning/sketches/005-changelog-register/index.html` — Variant B CSS + popup DOM (approved structure; placeholder copy)
- `tests/39-help-integrity.test.js`, `tests/39-help-precache.test.js`, `tests/40-coordinator.test.js`, `tests/40-i18n-parity.test.js`, `tests/run-all.js` — test templates
- `.planning/PROJECT.md` — version dates + shipped-feature ledger (lines 5,45,61)

### Secondary (MEDIUM confidence)
- CONTEXT.md / UI-SPEC.md / DISCUSSION-LOG.md — locked decisions (authoritative for scope)
- Memory: `reference-pre-commit-sw-bump.md`, `feedback-behavior-verification.md`, `feedback-ui-checker-greenfield-false-positives.md`

### Tertiary (LOW confidence)
- None — no WebSearch used; this is a closed-codebase phase.

## Metadata

**Confidence breakdown:**
- Standard stack (internal modules): HIGH — every anchor read and line-cited this session.
- Architecture: HIGH — mirrors two shipped precedents (help center render + coordinator surface).
- Pitfalls: HIGH — the two-array precache, every-page-load, and D-07 reconcile are verified from source, not assumed.
- Entry copy: N/A — deliberately out of research scope (D-03/D-04 pipeline + Ben approval).

**Research date:** 2026-07-09
**Valid until:** 2026-08-08 (stable internal codebase; re-verify anchors only if `attention-coordinator.js`, `app.js` initHelpEntry, or `sw.js` change before planning)
