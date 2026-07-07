# Phase 35: Demo System Refresh / Version Parity - Research

**Researched:** 2026-06-30
**Domain:** Vanilla-JS PWA demo-mode convergence, IndexedDB seed authoring, SW precache hygiene, i18n parity
**Confidence:** HIGH (every claim verified by reading the live source in this session)

## Summary

This is an **unstaling** phase, not a build. The demo is the real app running in demo mode — confirmed in code: `assets/db.js:2` switches `DB_NAME` to `demo_portfolio` when `window.name === 'demo-mode'`, `index.html` gate scripts short-circuit on the same flag, and `app.js initDemoMode()` injects the banner + `demo.css`. The only true fork is the home page: `demo.html` is a stale copy of `index.html` that (a) never loads `assets/shared-chrome.js`, so it renders **no footer**; (b) keeps a dead hand-typed native `<select id="languageSelect">` language picker that **has zero JS listeners** (verified: no reference anywhere in `assets/*.js`); and (c) has a frozen overview body missing the filter bar, heart-shield filter, security sections, and backup modal that `index.html` has gained since. The seed (`assets/demo-seed-data.json`) is 7 clients / 11 sessions, all dated **2025-06-20 → 2026-03-17** (≈4 months stale = the "looks abandoned" signal), with **zero** `isHeartShield`/`shieldRemoved` flags (the flagship feature is invisible).

Three findings materially shape the plan: (1) **`demo-hints.js` is NOT orphaned** — it is dynamically injected by `app.js` (live line 738) whenever the app runs in an iframe, AND it is precached in `sw.js` (line 63). Deleting the file alone leaves a dangling injection and a precache entry; D-08 needs three coordinated edits. (2) Because `app.js` boots `demo.html` via `overview.js` → `App.initCommon()`, the modern globe/theme/cloud/gear header controls **already inject** into demo.html's `.header-actions` (fallback selector) — so demo.html currently shows BOTH the dead native select AND the modern controls. (3) **`overview.js` is fully null-safe** for the missing filter elements (every `getElementById` is guarded), so D-01 (chrome-only convergence) is technically safe but leaves the overview body frozen forever; only D-02 (collapse into `index.html`) makes the body self-update too.

**Primary recommendation:** Pursue **D-02 (collapse `demo.html` into `index.html`)** using an iframe `name="demo-mode"` bootstrap — it is the only path that delivers true "one source, cannot drift" for both chrome AND body, and it is concretely achievable with low net risk. Provide D-01 as the documented conservative fallback. Refresh the seed in-place with a Heart Shield arc + relative dates computed in `demo-seed.js`. Delete `demo-hints.js` with all three references removed.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Demo-mode switch (`window.name`) | Browser (iframe browsing-context name) | — | `window.name` is inherited from `<iframe name>` and survives navigation; the whole switch is client-side |
| Demo home chrome (header/nav/lang/footer) | Browser JS (`app.js` + `shared-chrome.js`) | — | Injected at runtime into placeholders; no server |
| Seed data provisioning | Browser JS (`demo-seed.js` + JSON fetch) | CDN/Static (Cloudflare Pages serves the JSON) | Deletes+reseeds `demo_portfolio` IndexedDB on each demo-home load |
| Dashboard stats / heart-shield render | Browser JS (`overview.js`) | Database (IndexedDB read) | Computed at render time from session flags |
| Asset/offline delivery | CDN/Static + Service Worker (`sw.js`) | — | Precache list must stay in sync with shipped files |
| i18n terminology | Browser JS (`i18n-*.js` dicts) | — | `data-i18n` keys resolved client-side |

## Standard Stack

No new libraries. Zero-dependency production rule (CONTEXT D, line 100) is in force: vanilla JS/JSON only, no build step, ships to Cloudflare Pages. Existing toolchain only:

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Vanilla JS (ES, IIFE modules) | n/a | All app/demo code | Project convention; no bundler [VERIFIED: read all assets] |
| IndexedDB (`PortfolioDB`) | schema `DB_VERSION = 6` | Demo + real data store | `assets/db.js:4` [VERIFIED] |
| jsdom (dev/test only) | `^29.1.1` | Test harness | `package.json` devDependencies [VERIFIED] |
| Node test runner | `node tests/run-all.js` | 114 `.test.js` files | `package.json` scripts.test [VERIFIED] |

## Package Legitimacy Audit

**Not applicable.** This phase installs **zero** new packages (zero-dependency production rule). No registry verification required. No `npm install` in any task.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single-source `demo.html`'s chrome from `assets/shared-chrome.js` exactly as `index.html` does (empty `#headerActions` + `#nav-placeholder` filled at runtime; drop the hand-typed native `<select>` language picker). Non-negotiable outcome: "demo home chrome comes from one source."
- **D-03:** Showcase Heart Shield (מגננת הלב) — add session(s) with `isHeartShield`/`shieldRemoved` telling a believable removal/progression arc. Keep client-type variety (adult/child/animal/other).
- **D-04:** "Mostly just unstale it" — add a few more sessions and refresh content; do not over-engineer. Current 7 clients / 11 sessions is a fine base.
- **D-05:** Claude drafts a clinically coherent seed (Heart-Shield-forward, realistic emotion names, before→after arc, matching the current `db.js` schema). **Ben + Sapir approve the draft on Ben's machine before it ships.**
- **D-06:** Relative/computed-at-seed-time dates in `demo-seed.js` (offsets relative to "now"), guaranteeing ≥1 "session this month."
- **D-07:** UI + terminology parity, English sample content. Sweep demo.html hand-typed strings + demo-specific copy to current 4-language terminology (מפגש/לקוח; "energy" not "therapeutic"). Seed clinical content stays English sample text.
- **D-08:** Delete `assets/demo-hints.js`.

### Claude's Discretion
- Exact number/spread of added sessions and the specific emotion/issue content (subject to Ben+Sapir approval per D-05).
- Mechanics of the relative-date model (offset table vs. computed).
- Whether the demo banner / version footer renders inside the iframe after chrome convergence — proposed below.

### Evaluate-and-recommend (D-02)
- D-02 (assess, not locked): collapse `demo.html` into `index.html` + a demo flag/entry bootstrap so there is no separate home page. Research recommendation below.

### Deferred Ideas (OUT OF SCOPE)
- Demo exposure lock-down (hide/disable Export/Import, Backup/Restore, license, Settings in demo mode).
- Guided onboarding tour revival.
- Localized seed clinical content (HE/DE/CS sample session text).

## Phase Requirements

Requirements are not yet formalized (provisional `DEMO-*`). Proposed derivation for the planner to formalize:

| Proposed ID | Description | Research Support |
|-------------|-------------|------------------|
| DEMO-01 | Demo home chrome (header/nav/lang-picker/footer) comes from one source identical to `index.html` | D-01; `index.html:66-67` placeholders + `app.js initCommon`; `shared-chrome.js renderFooter` |
| DEMO-02 | Dead native `<select id="languageSelect">` removed from demo home | `demo.html:56-64`; zero JS references verified |
| DEMO-03 | Demo "live demo" banner preserved and language-synced across all 4 langs | `app.js initDemoMode` (lines 263-296) |
| DEMO-04 | App version footer renders on the demo home | `shared-chrome.js renderFooter`; currently absent on demo.html |
| DEMO-05 | Seed showcases a Heart Shield removal/progression arc visible on dashboard + session list | `overview.js:393-408, 499-508` |
| DEMO-06 | Seed dates are relative/computed; ≥1 session in the current calendar month | `overview.js countSessionsThisMonth` (562-570) |
| DEMO-07 | Seed conforms exactly to current session/client schema | `db.js` migrations 1-6; field union below |
| DEMO-08 | Demo-specific copy + demo home strings use current 4-lang terminology | D-07; `i18n-*.js app.subtitle` already updated to "energy" |
| DEMO-09 | `demo-hints.js` removed with all 3 references cleaned (`app.js`, `sw.js`, file) | grep results below |
| DEMO-10 | Landing iframe demo entry point keeps working; no regressions in language sync / gates / reseed | `landing.html:227-234`; `demo.js` postMessage |

## Architecture Patterns

### System Architecture Diagram (demo data + chrome flow)

```
landing.html  #demo  ─┐
  <iframe src="./demo.html"           (D-01 path: keeps demo.html)
     sandbox=...>      │   OR
  <iframe name="demo-mode"            (D-02 path: collapse → index.html)
     src="./index.html">              window.name inherited from name attr
                       │
                       ▼
              [ demo browsing context ]
   window.name === 'demo-mode'  ──────────────────────────────┐
                       │                                       │
   inline gate scripts see demo-mode → bypass license/terms   │
                       │                                       ▼
   db.js: DB_NAME = 'demo_portfolio'  ◄── isolated IndexedDB
                       │
   demo-seed.js (window.demoSeedReady):
      deleteDatabase('demo_portfolio')
        → fetch ./assets/demo-seed-data.json
          → re-key ids, COMPUTE relative dates (D-06)
            → PortfolioDB.addClient / addSession
                       │
   overview.js DOMContentLoaded:
      await window.demoSeedReady
        → App.initCommon()  [banner, nav, globe lang, theme,
                              cloud, gear, footer(shared-chrome)]
          → render stats (countSessionsThisMonth)
            → render client rows (heart-shield badge)
                       │
   demo.js: window.message {type:'demo-lang'} from parent
        → App.setLanguage(lang)   (coexists with globe picker)
                       │
   ── parent posts language on language change ──► live re-translate
```

Language sync arrives two ways and they coexist by design: the in-iframe globe picker calls `App.setLanguage` directly (`app.js:231`); the parent landing page posts `{type:'demo-lang'}` which `demo.js:13-17` forwards to the same `App.setLanguage`. Both converge on one function — no conflict. [VERIFIED]

### Pattern 1: chrome single-sourcing (the convergence target)
**What:** `index.html` leaves `<div id="nav-placeholder"></div>` and `<div class="header-actions" id="headerActions"></div>` empty; `app.js initCommon()` fills them at runtime (`renderNav`, `initLanguagePopover`, `initThemeToggle`, `mountBackupCloudButton`, `initSettingsLink`) and `shared-chrome.js renderFooter` appends the footer.
**Key detail:** the header injectors use `document.getElementById('headerActions') || document.querySelector('.header-actions')`. demo.html lacks `id="headerActions"` but has `class="header-actions"`, so injection already works via the fallback — but demo.html ALSO contains the dead native select inside that same container, producing a double picker.
**Concrete D-01 change to `demo.html`:** replace lines 55-65 (the entire `<div class="header-actions">…native select…</div>`) with `<div class="header-actions" id="headerActions"></div>`; add `<script src="./assets/shared-chrome.js"></script>` before `app.js` in the script block (mirroring `index.html:342`). After this the footer renders and the lang picker is the single injected globe popover.
```html
<!-- Source: index.html:66-67 (convergence target) -->
<div id="nav-placeholder"></div>
<div class="header-actions" id="headerActions"></div>
```

### Pattern 2 (RECOMMENDED): D-02 collapse via iframe browsing-context name
**What:** Delete `demo.html` entirely. Point the landing iframe at `index.html` and set the browsing-context name so `window.name === 'demo-mode'` from the very first inline script:
```html
<!-- Source: landing.html:227-234 (modified) -->
<iframe id="demo-iframe" name="demo-mode" src="./index.html"
        class="demo-iframe" title="Sessions Garden interactive demo"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>
```
**Why it works:** an iframe's `name` attribute becomes the contained document's `window.name` before any script runs. `index.html`'s three gate scripts (`index.html:7-18`) and `db.js:2` all read `window.name === 'demo-mode'` and are already demo-aware — so they short-circuit/swap DB with no edit. `app.js initDemoMode()` already injects the banner + `demo.css` on demo-mode. The one missing wiring: `index.html` does not load `demo-seed.js`, so add `<script src="./assets/demo-seed.js"></script>` after `db.js` in `index.html`. It self-guards (`demo.js`/`demo-seed.js` both `return` when `window.name !== 'demo-mode'`), so in normal use it resolves `window.demoSeedReady = Promise.resolve()` instantly and never touches `sessions_garden`. `overview.js:137` already `await window.demoSeedReady`. [VERIFIED — all guards confirmed]
**Net file delta:** delete `demo.html`; +1 script tag and (optionally) `demo.js` in `index.html`; edit landing iframe; remove `/demo` from `sw.js PRECACHE_HTML` (line 105) and `demo.html`-implied entries. Result: zero separate home page → cannot drift, body included.
**Risks to verify (give the planner checkpoints):** (a) `index.html` carries an iOS install banner + `manifest.json` + OG tags that will now also load inside the demo iframe — harmless but confirm the iOS banner does not appear over the demo (it is gated on standalone display-mode + not-iframe is NOT checked — verify it doesn't fire in the iframe; if it does, gate it on `window===window.top`); (b) `index.html` mounts the full Backup & Restore modal + export/import — these become reachable in the demo (this is the deferred "exposure lock-down," explicitly accepted as "update now, block later" per CONTEXT line 120); (c) confirm `manifest.json`/SW registration inside the iframe does not double-register oddly (SW is origin-scoped, already running).

**Recommendation:** Plan D-02. It is the only option that satisfies the spirit of "demo mirrors the current app" for the overview body (filter bar, heart-shield filter, security sections) as well as the chrome. If Ben/Sapir prefer minimal blast radius given the concurrent phase-34 work, fall back to D-01 (chrome-only) and accept that the demo overview body stays reduced. Either way the chrome is single-sourced.

### shared-chrome.js demo-mode awareness (open question #2)
`shared-chrome.js` renders **only** the footer + legal back-links; it does NOT inject the header lang picker or nav (those are `app.js`). Verified by reading the whole file. Therefore:
- **It needs essentially no demo-specific change.** The footer is generic (legal links, contact, `v{APP_VERSION}`, tagline) and is appropriate inside the demo. `APP_VERSION` resolves from `version.js` (`'1.2.3'`), loaded before `shared-chrome.js` on every page. [VERIFIED `version.js:25`]
- The "live demo" banner is owned by `app.js initDemoMode()` (not shared-chrome) and already 4-lang + language-synced — preserve as-is.
- **Minimal change, if any:** none required for D-01/D-02. Optionally, if the footer's integrity-warning `⚠` nudge (`maybeUpgradeFooterAndNudge`) is considered noise inside a sales demo, gate it off in demo mode — but it only appears on a real integrity mismatch, so leave it (lower risk = no change).

### Banner / version footer inside the iframe (open question #3, Claude's discretion D)
**Recommendation:** render BOTH inside the iframe.
- **Banner:** already renders inside the iframe today (top of demo body) and is the core "this is a live demo" affordance — keep.
- **Footer (version):** SHOULD render inside the iframe. It is the single on-screen signal that the demo is running the current shipped version (the whole point of "version parity"), it is unobtrusive (bottom of the scroll), and on D-01 it is the concrete fix for "demo home has no footer." `demo.css` styles only `.demo-banner` (no footer rules) so the footer inherits `app.css .app-footer` styling cleanly. [VERIFIED grep]

### Anti-Patterns to Avoid
- **Hand-copying chrome HTML into demo.html.** That is exactly how the drift happened. The whole point is to inject from one source.
- **Deleting `demo-hints.js` without removing its two live references.** Leaves a runtime injection of a 404'd script and a stale precache entry (see Runtime State Inventory).
- **Hard-coding absolute dates in the seed JSON.** Re-creates the "looks abandoned" rot. Dates must be computed at seed time (D-06).
- **Using `.every()` semantics for the client-row heart badge.** The code uses `.some()` (see Pitfall 2) — author the arc to match the real render logic, don't assume.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Demo-mode detection | A new flag/param | Existing `window.name === 'demo-mode'` | Already threaded through db.js, gates, app.js, backup-modal.js |
| Header lang/nav/footer on demo | Hand-typed markup | `app.js initCommon` + `shared-chrome.js` injection | The convergence target; proven on every other page |
| Relative date formatting | Custom date math sprinkled in JSON | Compute in `demo-seed.js seedData()` from offsets | One place, runtime `Date.now()` is normal app code (CONTEXT D-06) |
| Language sync into iframe | New messaging | Existing `demo.js` postMessage + globe picker | Both already call `App.setLanguage` |

## Runtime State Inventory

This phase deletes a file (`demo-hints.js`) and refreshes seed data — runtime-state audit required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `demo_portfolio` IndexedDB is **deleted + reseeded on every demo-home load** (`demo-seed.js:13`). No migration needed — new seed simply takes effect on next load. Visitor in-demo edits are intentionally reset on return to home (CONTEXT code_context). The real `sessions_garden` DB is untouched (separate name). | None beyond authoring new seed |
| Live service config | None. Demo ships as static files to Cloudflare Pages; no external service stores the demo state. | None — verified, no API/UI-only config |
| OS-registered state | None. | None — verified |
| Secrets / env vars | None. Demo touches no secrets. | None — verified |
| Build artifacts / precache | **`sw.js` PRECACHE_URLS** lists `/assets/demo-hints.js` (line 63), `/assets/demo.js` (60), `/assets/demo-seed.js` (61), `/assets/demo-seed-data.json` (62), `/assets/demo.css` (64). **PRECACHE_HTML** lists `/demo` (line 105). `CACHE_NAME` auto-derives from `version.js INTEGRITY_TOKEN` (sw.js:19) so no manual cache-number bump. | D-08: remove `/assets/demo-hints.js` from PRECACHE_URLS. D-02 (if chosen): remove `/demo` from PRECACHE_HTML. Bump is automatic via integrity token but confirm the pre-commit hook behavior (see memory `reference-pre-commit-sw-bump`). |

**`demo-hints.js` reference map (all live, non-worktree):**
1. `assets/app.js:738` — `s.src = './assets/demo-hints.js'` inside `initCommon` when `window !== window.top` (i.e., every demo page in the iframe). **Must remove the whole block (live lines 735-740).**
2. `sw.js:63` — precache entry. **Must remove.** (Note: `sw.js` install uses `Promise.allSettled` and tolerates non-200, so a stale entry would NOT break install — it would only log a console warning forever. Removal is hygiene, not a hard blocker. [VERIFIED sw.js:152-168])
3. The file itself `assets/demo-hints.js`. **Delete.**
4. `.planning/sketches/003-tour-fallback/index.html` — documentation reference only, leave.
5. `.claude/worktrees/agent-*` — phase-34 worktrees, out of scope, leave.

## Current Seed Schema (source of truth for D-03/D-06/D-07)

Verified against `db.js` migrations 1-6 and the live `demo-seed-data.json` (7 clients / 11 sessions).

**Client record fields (union present in seed):** `name, firstName, lastName, birthDate, age, email, phone, notes, type, referralSource, photoData, createdAt, id, updatedAt`. `type ∈ {adult, child, animal, other}` (migration 2 maps legacy `"human"→"adult"`). Current type spread: adult×3 (Ben D, Anita C, Adam Leon), child×3 (Linda R, Dan V, Emma B), animal×1 (Rexi A), **no `other`** — adding an `other`-type client would complete D-03's "keep variety."

**Session record fields (current schema):** `clientId, date (YYYY-MM-DD), sessionType (clinic|online|other), issues[{name, before, after}], trappedEmotions, insights, limitingBeliefs, additionalTech, customerSummary, comments, isHeartShield, shieldRemoved, createdAt, updatedAt, id`.

**Fields the existing 11 sessions are MISSING vs current schema:**
- `isHeartShield` — present in **0/11** (the flagship gap, D-03).
- `shieldRemoved` — present in **0/11** (D-03).
- `updatedAt` — present in only 2/11 (cosmetic; not render-affecting).
- `limitingBeliefs` is present but empty `""` on the sampled session; `additionalTech`, `insights`, `customerSummary`, `comments` are populated. All session-type values in seed are `online`/`clinic`; **no `other`** session type is showcased.

**How Heart Shield status is computed at render time (author the seed to this):**
- **Client-row badge** (`overview.js:393-408`): `heartShieldSessions = clientSessions.filter(s => s.isHeartShield)`. If any exist, `allRemoved = heartShieldSessions.some(s => s.shieldRemoved === true)` → if true render `✅` ("removed"), else `❤️` ("active"). NOTE the variable is named `allRemoved` but uses `.some()` — **a single `shieldRemoved:true` session flips the client badge to removed.** [VERIFIED]
- **Per-session badge** (`overview.js:499-508`): each session with `isHeartShield` shows its own active/removed badge based on its own `shieldRemoved`.
- **Filter** (`overview.js:185-186`): `clientHeartShieldFilter` value `heartShield` keeps clients with `sessions.some(s => s.isHeartShield)` (only present on `index.html`, i.e. only exercised under D-02).

**Recommended Heart Shield arc (subject to D-05 approval):** give one client (e.g. convert **Anita C**, adult, who already has 3 sessions on 2025-06-20/07-31/09-24) a coherent progression — session 1 `isHeartShield:true, shieldRemoved:false` (shield detected), session 2 `isHeartShield:true, shieldRemoved:false` (work in progress), session 3 `isHeartShield:true, shieldRemoved:true` (shield removed). Client row then shows `✅` and each session shows its stage. Optionally add a second heart-shield client of a different type to show variety. Keep emotion names realistic (the existing format `"Pressure — age 32\nOverwhelm\nFear — age 30"` is good sample shape) with believable before→after severity drops.

**Relative-date model (D-06) — concrete recommendation:** add a `daysAgo` integer to each session in `demo-seed-data.json` (and drop/ignore the absolute `date`), then compute in `demo-seed.js seedData()`:
```js
// Source: proposed — runs inside demo-seed.js seedData(), demo-mode only
function isoDaysAgo(n){
  var d = new Date();
  d.setHours(12,0,0,0);            // noon avoids UTC/local month-edge slip
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0,10);   // YYYY-MM-DD
}
// per session: s.date = isoDaysAgo(s.daysAgo);  delete s.daysAgo;
```
Set the most-recent session to `daysAgo: 0` (today) so `countSessionsThisMonth` is **guaranteed** ≥1 regardless of where in the month "now" falls. Spread the rest, e.g. offsets `{0, 4, 12, 23, 38, 55, 70, 84, ...}` up to ≈90 days for the oldest, preserving each client's chronological order. `overview.js countSessionsThisMonth` uses `new Date(session.date).getMonth()/getFullYear()` against local `now` — noon-anchored ISO dates avoid the day-boundary timezone slip. [VERIFIED overview.js:562-570]

## i18n / Terminology Parity (D-07, open question #5)

**Already current (no action):** `app.subtitle` in all four dicts already says "energy" not "therapeutic" — `i18n-en.js:6` "Documentation and tracking of energy sessions", he "מפגשים אנרגטיים", de "energetischer Sitzungen", cs "energetických sezení". [VERIFIED]

**Stale hand-typed strings to sweep in `demo.html`** (these are literal English text, NOT `data-i18n` keys, so they never localize):
- `demo.html:23` `<title>Sessions Garden — Demo</title>` — fine, but note `<html lang="en">` is hardcoded.
- `demo.html:51` brand-subtitle has hardcoded fallback text "Documentation and tracking of therapeutic sessions" — it DOES carry `data-i18n="app.subtitle"` so it self-corrects at runtime, but the hardcoded fallback still says "therapeutic." Update the literal to match the i18n value for honesty. (`index.html:63` has the same stale literal — consider fixing both, or moot if D-02 deletes demo.html.)
- The demo banner copy is in `app.js initDemoMode DEMO_BANNER_TEXT` (4 langs) — already current, preserve.

**Demo-specific copy in `landing.html #demo` (lines 215-239)** is Hebrew-only hardcoded ("נסו בעצמכם", "הדגמה חיה עם נתונים לדוגמה — ללא הרשמה", demo-note). This is the landing page (Hebrew-audience), not the demo iframe — out of this phase's chrome scope but note for the planner: it is NOT swept to 4 langs and uses no i18n keys. Leave unless Ben wants it (deferred-ish).

**Seed clinical content** (trappedEmotions/comments/insights/customerSummary) stays English per D-07 — no localization.

## Common Pitfalls

### Pitfall 1: Deleting demo-hints.js breaks the iframe demo silently
**What goes wrong:** removing only the file leaves `app.js:738` injecting a `<script src="./assets/demo-hints.js">` that 404s on every demo page, and leaves `sw.js:63` precaching a missing asset.
**Why:** `demo-hints.js` is loaded dynamically (iframe context), not via a `<script>` tag in any HTML, so a naive "grep the HTML" check (as CONTEXT D-08 assumed: "loaded by no page") misses it.
**How to avoid:** make D-08 a three-edit task — file delete + `app.js` block removal (lines 735-740) + `sw.js` PRECACHE_URLS removal.
**Warning sign:** console 404 for `demo-hints.js`; SW install warning.

### Pitfall 2: Authoring the heart-shield arc against `.every()` instead of `.some()`
**What goes wrong:** seed author assumes the client badge shows "removed" only when ALL heart-shield sessions are removed; in fact one `shieldRemoved:true` flips it (`overview.js:395` uses `.some()`).
**How to avoid:** author the final session `shieldRemoved:true`; expect the client-row to read removed even while earlier sessions render active per-session.

### Pitfall 3: app.js edit collides with concurrently-executing Phase 34
**What goes wrong:** Phase 34 is executing in another worktree and touches `app.js` (worktree shows demo-hints at line 703 vs live 738 — app.js already diverges). Removing the demo-hints block in this phase + phase 34's edits = merge collision.
**How to avoid:** per CONTEXT timing constraint, execute Phase 35 only AFTER Phase 34's executor finishes (or in an isolated worktree). Re-locate the demo-hints block by content, not line number, at execution time.
**Warning sign:** `git` merge conflict in `app.js`.

### Pitfall 4: jsdom tests pass on exit-0 without asserting output (false-GREEN)
**What goes wrong:** project memory (`reference-pdf-jsdom-inert-gates`) documents jsdom tests that hung→exited 0 and read GREEN for phases. Any new validation test must assert on real DOM/output, not process exit.
**How to avoid:** validation assertions below check concrete DOM/structure/data, runnable headless.

### Pitfall 5: Timezone month-edge in countSessionsThisMonth
**What goes wrong:** `new Date("2026-07-01")` is UTC-midnight; `.getMonth()` in a UTC-negative zone yields June → a "1st of month" session counts as last month.
**How to avoid:** anchor computed seed dates at local noon (see model above) and set the newest session to `daysAgo:0`.

## Code Examples

### Confirm demo-mode boot order on demo.html (today)
```js
// Source: assets/overview.js:136-138 (verified)
document.addEventListener("DOMContentLoaded", async () => {
  if (window.demoSeedReady) await window.demoSeedReady;  // demo-seed.js gate
  await App.initCommon();                                 // injects chrome
  // ... renders stats + client rows
});
```

### Demo-mode self-guard pattern (why loading demo-seed.js on index.html is safe)
```js
// Source: assets/demo-seed.js:8 and assets/demo.js:8 (verified)
if (window.name !== 'demo-mode') return Promise.resolve();  // demo-seed.js
if (window.name !== 'demo-mode') return;                    // demo.js
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-typed native `<select>` lang picker | `app.js initLanguagePopover` globe popover into `#headerActions` | shared-chrome refactor (pre-Phase 32) | demo.html never updated → dead select + double picker |
| `heartWallCleared` / `heartWall` fields | `isHeartShield` + `shieldRemoved` | `db.js` migration v3 (Phase 9) | Seed must use new fields |
| No footer source-of-truth | `shared-chrome.js renderFooter` w/ `version.js` | Phase 28/29 | demo.html (no shared-chrome) has no footer |
| Absolute seed dates | (this phase) computed relative dates | Phase 35 | Self-freshening demo |

**Deprecated/outdated:** the native `#languageSelect` in `demo.html` (dead); the hardcoded "therapeutic" subtitle literals.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | iframe `name="demo-mode"` attribute reliably sets `window.name` before `index.html`'s first inline gate script runs, under the existing `sandbox` attribute | Pattern 2 / D-02 | If a browser/sandbox combo delays it, gate-0 could redirect the demo to landing.html. **Mitigation:** the planner should add a `checkpoint:human-verify` to test D-02 in a real browser before committing; D-01 fallback has no such risk. [ASSUMED — standard HTML behavior, not runtime-verified this session] |
| A2 | The iOS install banner (`index.html:349-361`) and Backup modal becoming reachable inside the demo iframe is acceptable for now | Pattern 2 risks | Exposure lock-down is explicitly deferred (CONTEXT line 120); low risk but confirm with Ben |
| A3 | Ben+Sapir will approve the specific emotion/issue clinical content of the drafted seed | D-05 | Content rework only; structure unaffected |

## Open Questions

1. **D-01 vs D-02 final call.** Research recommends D-02 (collapse) for true non-drift incl. body; D-01 is the low-blast-radius fallback. Decision belongs to Ben/Sapir at plan/approval time. Both single-source the chrome (the non-negotiable).
   - What we know: D-02 is concretely feasible via iframe name attr; all gates already demo-aware.
   - What's unclear: appetite for the slightly larger surface given concurrent Phase 34.
   - Recommendation: plan D-02, gate the browser-verification behind a checkpoint, keep D-01 documented as fallback.
2. **Add an `other`-type client/session to complete variety?** Discretion (D-04 "a few more sessions"). Recommend yes — cheap, showcases the `other` session type currently unshown.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | running `tests/run-all.js` | ✓ (used to parse seed this session) | system node | — |
| jsdom | DOM behavior tests | ✓ | `^29.1.1` (devDep) | — |
| Browser (manual) | D-02 verification (A1), demo visual check | ✓ (Ben's machine) | n/a | — |
| Build step / bundler | — | n/a | — | none needed (zero-dep rule) |

No missing dependencies block execution. D-02's correctness check (A1) needs a real browser, available on Ben's machine.

## Validation Architecture

Nyquist validation ENABLED. The demo ships static (no CI test runner for the live demo), so validation is a mix of automated structural/data assertions (Node+jsdom) and a small set of manual browser observations. Prefer falsifiable assertions.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node script runner + jsdom `^29.1.1` |
| Config file | none — `tests/run-all.js` iterates `tests/*.test.js` |
| Quick run command | `node tests/run-all.js` |
| Full suite command | `node tests/run-all.js` |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Automated Command / Check | File Exists? |
|-----|----------|-----------|---------------------------|-------------|
| DEMO-01/04 | After convergence, demo home injected chrome matches index.html structure; a `.app-footer` with `v{version}` renders | jsdom render | new `tests/35-demo-chrome.test.js`: boot demo home in jsdom with `window.name='demo-mode'`, run initCommon, assert `#headerActions` populated, exactly one lang picker, `.app-footer` present, footer text contains the `version.js APP_VERSION` | ❌ Wave 0 |
| DEMO-02 | No native `<select id="languageSelect">` remains in the demo home DOM source | static grep | assert `grep -c 'id="languageSelect"'` on the demo home file == 0 | ❌ Wave 0 |
| DEMO-05 | Seed renders a removed-shield status: ≥1 client row shows the removed badge; ≥1 session shows active and ≥1 shows removed | jsdom + data | new `tests/35-demo-seed.test.js`: load seed JSON, assert a client has ≥2 `isHeartShield` sessions with mixed `shieldRemoved`, and final `shieldRemoved:true`; render client row, assert `.heart-badge-removed` | ❌ Wave 0 |
| DEMO-06 | Seed produces ≥1 session dated within the current month at seed time | data/unit | assert `countSessionsThisMonth(seededSessions) >= 1` after applying the relative-date transform with a mocked `now` (test several `now` values incl. 1st & last day of month) | ❌ Wave 0 |
| DEMO-07 | Every seed session conforms to current schema (no legacy `heartWallCleared`; `sessionType ∈ {clinic,online,other}`; `issues[]` shape) | data/unit | assert field whitelist + enum over all sessions | ❌ Wave 0 |
| DEMO-08 | Demo home hardcoded subtitle literal no longer says "therapeutic"; `data-i18n="app.subtitle"` present | static grep | assert no "therapeutic" literal on demo home; `app.subtitle` resolves to "energy" copy in all 4 dicts | ❌ Wave 0 |
| DEMO-09 | `demo-hints.js` referenced by zero live files | static grep | assert `grep -rn "demo-hints" assets/ sw.js *.html` (excluding sketches/worktrees) returns nothing; assert file absent | ❌ Wave 0 |
| DEMO-10 | Landing demo entry point intact; gates bypass; language sync works | manual browser | Open `landing.html`, scroll to `#demo`: demo loads in iframe, no redirect to landing/license, switch language in parent → demo re-translates, navigate demo→sessions→back, return to home resets edits | manual |
| DEMO-10 (D-02 only) | `window.name==='demo-mode'` set from iframe name attr before gate scripts | manual browser | DevTools in iframe: `window.name === 'demo-mode'`; no flash/redirect | manual (A1) |

### Sampling Rate
- **Per task commit:** `node tests/run-all.js`
- **Per wave merge:** `node tests/run-all.js` (full; suite is fast)
- **Phase gate:** full suite green + the manual DEMO-10 browser observations before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `tests/35-demo-chrome.test.js` — DEMO-01/02/04 (jsdom chrome render + no-native-select)
- [ ] `tests/35-demo-seed.test.js` — DEMO-05/06/07 (heart-shield arc, this-month, schema conformance)
- [ ] grep-based assertions for DEMO-08/09 (can live in the seed/chrome test files or a small `tests/35-demo-static.test.js`)
- [ ] No framework install needed (jsdom present).
- [ ] Heed Pitfall 4: assertions must check DOM/data, not process exit.

## Security Domain

`security_enforcement` not set false → included, but surface is small (static demo, no auth, isolated DB).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Demo bypasses license/terms by design |
| V3 Session Management | no | No sessions/server |
| V4 Access Control | no | Client-only, isolated `demo_portfolio` DB |
| V5 Input Validation / Output Encoding | yes (low) | Seed content is rendered via `textContent` in `overview.js` (XSS-safe); keep that — never switch seed render to `innerHTML`. Seed JSON is author-controlled, not user input. |
| V6 Cryptography | no | n/a |

### Known Threat Patterns for {static demo iframe}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via seed strings | Tampering | Render via `textContent` (already the case in `overview.js` session/issue rendering); do not introduce `innerHTML` for seed fields |
| Demo writes leaking into real DB | Tampering | `window.name` DB-name isolation (`demo_portfolio` vs `sessions_garden`) — verify the collapse (D-02) preserves it; gate scripts + db.js already keyed on the flag |
| Iframe escaping host | Elevation | Existing `sandbox="allow-scripts allow-same-origin allow-popups allow-forms"` — keep; adding `name="demo-mode"` does not weaken it |

## Sources

### Primary (HIGH confidence — read in full this session)
- `demo.html`, `index.html`, `assets/shared-chrome.js`, `assets/db.js`, `assets/demo-seed.js`, `assets/demo.js` — full reads
- `assets/app.js` (lines 1-1214, incl. initCommon/initDemoMode/header injectors/demo-hints block 735-740) — read
- `assets/overview.js` (init 136-138, heart-shield 393-408 & 499-508, countSessionsThisMonth 562-570, filter null-safety) — read
- `assets/demo-seed-data.json` — parsed via Node (7 clients/11 sessions, field union, date range, zero heart-shield)
- `sw.js` (PRECACHE_URLS 26-64 incl. demo-hints:63, PRECACHE_HTML 98-118 incl. /demo:105, install tolerance 152-168) — read
- `landing.html` #demo (215-240), `version.js` (APP_VERSION 25), `i18n-*.js` app.subtitle — read
- grep maps: `demo-hints`, `demo.html`, `shared-chrome.js`, `languageSelect` references

### Secondary (MEDIUM)
- Project memory notes: `reference-pdf-jsdom-inert-gates`, `reference-pre-commit-sw-bump`, `reference-sw-version-update-delivery`

### Tertiary (LOW)
- A1 (iframe-name timing under sandbox) — standard HTML behavior, not runtime-verified this session; gated behind a manual checkpoint.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps; existing code read directly.
- Architecture (demo-mode seam, convergence, D-02 mechanism): HIGH — all guards/gates verified in source; A1 timing flagged for browser verification.
- Seed schema & heart-shield render: HIGH — parsed real data + read render code.
- Pitfalls / runtime state: HIGH — reference map grepped, concurrency constraint from CONTEXT.

**Research date:** 2026-06-30
**Valid until:** ~2026-07-30 (stable vanilla codebase; re-verify `app.js` line numbers after Phase 34 merges)
