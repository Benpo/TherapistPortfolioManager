# Phase 40: First-Run Welcome & Onboarding Coordinator - Research

**Researched:** 2026-07-08
**Domain:** Client-side PWA attention-surface orchestration (vanilla JS), first-run UX, PWA install affordance (`beforeinstallprompt`)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Precedence & launch semantics (ONBD-03):**
- **D-01:** Written precedence order (highest wins, it alone shows): **Welcome > What's-New (Phase 42) > security note > install nudge > mobile expectation hint.** Rationale: ceremony-by-rarity — one-shot surfaces outrank recurring ones.
- **D-02:** "One launch" = **one browser session.** A sessionStorage marker records that a governed surface already showed this session; page navigation never fires a second surface. Losers are NOT queued within the session — they compete again next session.
- **D-03:** **Upgrader collision — welcome subsumes What's-New:** upgrader has no `sg.welcomeSeen` → welcome fires; showing the welcome ALSO records the current `APP_VERSION` as the last-seen What's-New version, so no v1.3 What's-New follows. Coordinator/welcome must write this last-seen-version key in a form Phase 42 will read.
- **D-04:** **Governed surfaces = exactly 5:** welcome, What's-New (registers in Phase 42), security note, install nudge, mobile expectation hint. Backup-reminder banner + footer integrity nudge stay **independent**. DB-error banners exempt.
- **D-05:** **Security note behavior unchanged** — same copy, 7-day cadence, Overview-only container; coordinator only gates WHETHER it may appear this session.

**Coordinator design:**
- **D-06:** **Dedicated registry module** (new `assets/` file): each surface registers `{id, eligible(), show()}`; coordinator walks the precedence list as data, once per session, from `initCommon`, shows first eligible. Phase 42 adds What's-New by registering ONE entry.
- **D-07:** **Module name MUST NOT say "onboarding"** (Ben, explicit) — it coordinates attention surfaces generally.
- **D-08:** **Runs on every app page** (bookmarked deep links included). Full-screen surfaces mount on any page; security note stays Overview-only by its container — resolved in UI-SPEC: its `eligible()` returns **false** when its container is absent, so it never consumes the session slot on a non-Overview page.
- **D-09:** **Fully disabled in demo mode** (`window.name === 'demo-mode'`).

**Welcome overlay:**
- **D-10:** **Layout = Variant B (Split)** from `.planning/sketches/001-welcome-overlay/`. All other welcome parameters locked upstream (26-UI-SPEC): full-screen, garden tokens, Display headline, `help.welcome.title/subtitle/ctaTour/ctaExplore` keys, one-shot `localStorage 'sg.welcomeSeen'`, either CTA or Esc dismisses, upgraders see it once.
- **D-11:** **Interim tour CTA** ("Take the guided tour") opens `help.html` until Phase 41 rewires it (one-line change later).

**Install nudge (computers):**
- **D-12:** Soft dismissable card with a **real Install button where the platform allows:** Chromium captures `beforeinstallprompt`, [Install] button triggers native dialog; macOS Safari shows "File → Add to Dock" pointer + link to Phase 39 install help topic. Never eligible when installed (`display-mode: standalone`).
- **D-13:** **Eligible from the second session on** — no extra usage bookkeeping; the coordinator's lowest-tier ordering naturally keeps it off launch 1 (welcome wins).
- **D-14:** **Dismissed = gone forever** (persistent flag). One ask, one no, never again.

**iOS banner retirement & mobile hint:**
- **D-15:** **The hardcoded-English per-session iOS install banner (`index.html:367-374`) is DELETED** — it promotes installing on a deliberately-unsupported platform (P39 D-15 computer-only).
- **D-16:** **Replacement: one-shot, dismissed-forever, fully i18n'd expectation hint on ALL mobile** (iOS + Android, phone-class detection, not iOS-only UA sniffing): "designed for computers — data lives on each device separately," linking to P39 D-16 mobile-expectations help topic. Lowest precedence tier. Voice: calm app voice, not a warning.

**"?" re-open entry:**
- **D-17:** **Menu entry "Replay welcome"** appended to the Phase 39 "?" popover (`initHelpEntry` extension slot) — reopens the same welcome overlay; replaying never re-arms the one-shot flag or coordinator (direct open, outside per-session arbitration).

**Language scope:** all new user-facing strings ship in **all 4 locales (EN/HE/DE/CS)** this phase (UI chrome). Hebrew uses noun/infinitive forms (P24 D-05).

### Claude's Discretion
- Exact coordinator module filename (within D-07's no-"onboarding" constraint), storage key names (session marker, install-nudge dismissal, mobile-hint dismissal, last-seen-version), and the registration API shape.
- "?" menu position of "Replay welcome" (suggested: after "Help center", before "Contact us").
- Welcome hero illustration choice (existing botanical assets vs. new; must fit Variant B and dark mode).
- Mobile expectation hint exact wording + phone-class detection approach.
- Winning-but-unrenderable semantics for the security note on other pages (resolved in UI-SPEC → not eligible).
- Whether mobile hint and install nudge are mutually exclusive by device class (they are in practice).

### Deferred Ideas (OUT OF SCOPE)
- **Security-note cadence backoff** (7→10→14→21→60→120 days) — todo `2026-07-08-security-note-cadence-backoff.md`, post-v1.3 backlog, NOT this phase.
- **What's-New popup + changelog** — Phase 42 (registers into this phase's coordinator).
- **Guided tour** — Phase 41 (rewires the welcome's tour CTA, adds its own "?" entry).
- **Terms-acceptance restructuring** (`2026-03-24-terms-acceptance-business-notification.md`) — separate activation-flow project, not an attention surface. Stays pending.
- **Help body-content translation** — still EN-only this phase (L10N-01 is Phase 42.1).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ONBD-01 | Full-screen branded welcome overlay on first launch, two first-class CTAs, fires once (`sg.welcomeSeen`), Esc dismisses | Variant B split layout (sketch 001) + reuse `lockBodyScroll`/`unlockBodyScroll` + `role="dialog"` modal idiom; new `help.welcome.*` i18n keys must be authored in all 4 locales (do NOT exist yet). See Architecture Pattern 2 + Code Examples. |
| ONBD-02 | Re-open welcome from "?" — never auto-re-fires | Append action-item to `initHelpEntry` items array (schema needs a small extension — currently href-only); replay is a direct `show()` call outside coordinator arbitration. See Pattern 5 + Pitfall 5. |
| ONBD-03 | No competing surfaces stack; single coordinator enforces written precedence, upgrader-vs-fresh handling | Registry-module coordinator (Pattern 1) walking precedence list as data, one-shot per session via sessionStorage marker; upgrader collision handled by writing last-seen-version when welcome shows (D-03). |
| ONBD-04 | One friendly, dismissable, non-nagging, per-browser install affordance; dismissal remembered; reconciles the iOS banner | `beforeinstallprompt` capture (Chromium) + macOS Safari pointer fallback; persistent dismissal flag; delete iOS banner; mobile hint successor. See Pattern 3/4, Don't-Hand-Roll, Pitfalls 1-3. |
</phase_requirements>

## Summary

This phase is **pure vanilla client-side work in an established zero-dependency PWA** — no npm packages, no build step, no framework. The bulk of the risk is not in any external library but in (a) correctly sequencing a **shared attention-surface coordinator** so exactly one governed surface shows per browser session, and (b) handling the **`beforeinstallprompt` browser API** and its well-documented sharp edges (Chromium-only, fires early/once, single `prompt()` use, doesn't fire when already installed or when install criteria aren't met).

The design is almost fully specified by CONTEXT.md (D-01..D-17) and the approved 40-UI-SPEC. The planner's job is mostly **faithful implementation of locked decisions** plus resolving a handful of small integration mechanics that the research surfaces below: the coordinator's script-load-order and precache wiring, extending the `initHelpEntry` item schema to support a non-anchor action row, authoring the missing `help.welcome.*` + `onboard.*` i18n keys across four locales, and choosing a phone-class detection heuristic.

**Primary recommendation:** Build a new `assets/attention-coordinator.js` that (1) at eval-time registers the `beforeinstallprompt`/`appinstalled` listeners and stashes the deferred event, and (2) exposes `AttentionCoordinator.register({id, eligible, show})` + `run()`. The coordinator owns the precedence order as a data array; `initCommon` calls `run()` once (replacing the unconditional `showFirstLaunchSecurityNote()` call). Surfaces register their impl keyed by id, so Phase 42 adds What's-New by registering one entry. Reuse every existing idiom (modal scroll-lock, `.help-entry-item`, garden tokens, jsdom behavior tests) — this phase introduces **no new tokens, no new dependencies, and no new architectural tier.**

## Architectural Responsibility Map

This is a **single-tier client-only PWA** (no backend, no API, no network calls for these features). Every capability lives in the Browser/Client tier; the "secondary tier" column names the browser subsystem that owns the state.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Attention-surface arbitration | Browser/Client (JS logic) | sessionStorage (session marker) | Decision is per-session, client-only; sessionStorage is the natural "one launch" boundary (D-02). |
| Welcome overlay render + one-shot | Browser/Client (DOM) | localStorage (`sg.welcomeSeen`) | One-shot persists across sessions; DOM overlay reuses the modal idiom. |
| Install affordance (real button) | Browser/Client | Browser install engine (`beforeinstallprompt`) | Only the browser can trigger the native install dialog; app can only defer + re-fire the captured event. |
| Install/mobile-hint dismissal memory | Browser/Client | localStorage (persistent flags) | "Gone forever" (D-14/D-16) ⇒ persistent, not session, storage. |
| Upgrader last-seen-version write | Browser/Client | localStorage + `AppVersion.APP_VERSION` | Reads the hand-set semver (never the SW/integrity-token layer); Phase 42 reads the same key. |
| Phone-class detection | Browser/Client | `matchMedia` / `navigator.userAgentData` | Media-query + UA-hint capability probe, no server. |

**Tier sanity check for the planner:** there is no "put this in the API/backend" trap here — everything is correctly Browser/Client. The only mis-assignment risk is *storage-class*: using sessionStorage where localStorage is required (dismissals must survive a browser restart) or vice-versa (the per-launch marker must NOT survive a restart). See Pitfall 4.

## Standard Stack

**There is no external stack.** This is a hard project constraint (PROJECT.md: vanilla HTML/CSS/JS PWA, zero npm deps, no build step). The "stack" is the app's own established primitives.

### Core (in-repo primitives to reuse)
| Primitive | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| `lockBodyScroll` / `unlockBodyScroll` | `assets/app.js:1598-1612` | Body scroll-lock behind the full-screen welcome | Established modal idiom (iOS-Safari-safe `position:fixed`); reuse verbatim. |
| `initHelpEntry` addable items array | `assets/app.js:515-528` | Mount point for "Replay welcome" (D-17) | Phase 39 built the popover explicitly for Phases 40-42 to append rows. |
| `showFirstLaunchSecurityNote` | `assets/app.js:1356-1383` | Governed security-note surface | Coordinator gates its call; behavior otherwise unchanged (D-05). |
| `initCommon` | `assets/app.js:760` | Single coordinator invocation point, every app page | Already runs on all 8 app pages; central boot seam. |
| `AppVersion.APP_VERSION` | `assets/version.js` | Last-seen-version source for D-03 | The hand-set semver — NOT the SW/`INTEGRITY_TOKEN` layer. |
| Garden semantic tokens | `assets/tokens.css` | All color/spacing/dark-mode for new surfaces | 40-UI-SPEC locks every visual value to these; no new tokens. |
| jsdom zero-dep test runner | `tests/run-all.js` + `tests/39-*.test.js` | Behavior tests (project rule: behavior test before impl) | Established `eval-into-jsdom` harness; jsdom already a devDependency. |

### Supporting (browser APIs — no install)
| API | Purpose | When to Use | Confidence |
|-----|---------|-------------|-----------|
| `beforeinstallprompt` event | Capture deferred install prompt (Chromium) | Install nudge [Install app] button (D-12) | `[VERIFIED: MDN, web.dev]` Chromium-only, non-standard but Chrome-team-committed (no deprecation plans as of MDN 2025-05-02). |
| `appinstalled` event | Detect install → clear the deferred prompt / suppress nudge | Hide install UI once installed | `[VERIFIED: MDN, web.dev]` Fires on `window` in Chromium. |
| `matchMedia('(display-mode: standalone)')` | Detect already-installed PWA | Install nudge `eligible()` gate (D-12) | `[VERIFIED: existing code]` Already used at `index.html:369` and `version.js`. |
| `matchMedia('(pointer: coarse)')` / `(hover: none)` | Phone-class detection (D-16) | Mobile-hint `eligible()` | `[CITED: MDN]` Combine with a width query; see Pattern 4 + Open Question 1. |
| `navigator.userAgentData?.mobile` | UA-Client-Hints mobile signal | Optional reinforcement of phone-class detection | `[CITED: MDN]` Chromium-only; use as an OR signal, never the sole test (absent in Safari/Firefox). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bespoke coordinator | A tour/onboarding library (Shepherd.js / Intro.js) | **Explicitly forbidden** — AGPL-3.0, incompatible with a closed-source paid product (REQUIREMENTS.md Out-of-Scope, re-verified 2026-07-07). Also overkill: this is arbitration logic, not a tour. |
| `beforeinstallprompt` real button | A universal "how to install" text card everywhere | Loses the one-click path on Chromium (D-12). The universal-help fallback already exists (Phase 39) and is the Safari/other-browser branch. |
| sessionStorage session marker | localStorage + timestamp window | sessionStorage IS the browser's own "this browsing session" boundary (D-02) — simpler and semantically exact. See Pitfall 4. |

**Installation:** none. No `npm install`. New assets are plain `.js`/copy edits committed to the repo.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.** The project is a zero-npm-dependency vanilla PWA (jsdom is an existing devDependency for tests, unchanged). No registry lookups, no `beforeinstallprompt` polyfill, no tour library. The Package Legitimacy Gate is satisfied vacuously: nothing to vet.

## Architecture Patterns

### System Architecture Diagram

```
  App page load (any of 8 SW-registered pages)
        │
        │  <script assets/attention-coordinator.js>  (loads BEFORE app.js)
        │        │
        │        └─(eval-time, synchronous)──► register window 'beforeinstallprompt' listener
        │                                        → e.preventDefault(); stash deferredPrompt
        │                                      register window 'appinstalled' listener
        │                                        → clear deferredPrompt; mark installed
        │
        ▼
  DOMContentLoaded ──► App.initCommon()   (assets/app.js)
        │
        ├─ chrome wiring (nav, theme, help "?" entry incl. "Replay welcome") …
        │
        └─► AttentionCoordinator.run()      ◄── replaces the direct showFirstLaunchSecurityNote() call
                │
                ├─ demo mode? (window.name==='demo-mode') ──► return, render nothing (D-09)
                ├─ session already claimed? (sessionStorage marker) ──► return (D-02)
                │
                └─ walk precedence order [welcome, whats-new*, security-note, install-nudge, mobile-hint]
                        │        (*whats-new registered in Phase 42; absent id = skipped)
                        │
                        for each id → surface.eligible() ?
                        │
                        ├─ first TRUE ──► set session marker ──► surface.show() ──► STOP
                        │                     │
                        │                     ├─ welcome.show(): mount Variant-B overlay,
                        │                     │     Esc/CTA → set sg.welcomeSeen + write lastSeenVersion (D-03)
                        │                     ├─ security-note.show(): existing showFirstLaunchSecurityNote()
                        │                     ├─ install-nudge.show(): branch on deferredPrompt vs macOS Safari
                        │                     └─ mobile-hint.show(): calm bottom bar + help link
                        │
                        └─ none eligible ──► render nothing this session

  "?" popover ──► "Replay welcome" row ──► welcome.show()  (DIRECT open, bypasses run(), never re-arms flags)

  NOT governed (independent, unchanged): backup-reminder banner, footer integrity nudge, DB-error banners
```

### Recommended Project Structure
```
assets/
├── attention-coordinator.js   # NEW — registry + run() + beforeinstallprompt capture + the
│                              #        welcome / install-nudge / mobile-hint surface impls
│                              #        (name: no "onboarding" per D-07)
├── app.js                     # EDIT — initCommon calls AttentionCoordinator.run();
│                              #        security-note registered as a surface;
│                              #        initHelpEntry items array extended for the action row
├── app.css / help.css         # EDIT — welcome overlay (Variant B), install-card, mobile-hint styles
├── i18n-en/he/de/cs.js        # EDIT — NEW keys: help.welcome.* + onboard.install.* + onboard.mobileHint.*
│                              #        + help.entry.replayWelcome  (NONE exist yet — must be authored)
index.html                     # EDIT — DELETE iOS banner script (367-374); add coordinator <script>
add-client/add-session/help/   # EDIT — add coordinator <script> (before app.js) on every app page
  report/sessions/settings/     #        that includes app.js (8 pages; NOT demo.html)
  reporting .html
sw.js                          # EDIT — add '/assets/attention-coordinator.js' to PRECACHE_URLS
                              #        (+ manual cache-bump chore commit — see Pitfall 6)
tests/
├── 40-coordinator.test.js     # NEW — precedence, one-per-session, demo-off, unrenderable-skip
├── 40-welcome-overlay.test.js # NEW — one-shot, Esc/CTA dismiss, lastSeenVersion write, replay
├── 40-install-nudge.test.js   # NEW — platform branch, standalone gate, dismissed-forever
└── 40-ios-banner-removed.test.js  # NEW — static grep: index.html no longer ships the banner
```

### Pattern 1: Data-driven precedence registry (the coordinator — D-06)
**What:** The coordinator holds the precedence **order as a data array of ids**; surfaces register an impl object keyed by id. `run()` walks the order, calls the first registered surface whose `eligible()` returns true.
**When to use:** This is THE core of the phase. Register order lives in one place so Phase 42 adds What's-New by registering one entry, changing no existing logic.
**Example:**
```javascript
// Source: pattern synthesized from CONTEXT D-06/D-08 + existing idempotent-init idioms in app.js
// assets/attention-coordinator.js
(function () {
  'use strict';
  var PRECEDENCE = ['welcome', 'whats-new', 'security-note', 'install-nudge', 'mobile-hint']; // D-01
  var SESSION_MARKER = 'sg.surfaceShownThisSession';   // D-02 (Claude's-discretion name)
  var registry = {};                                    // id -> { eligible, show }

  function register(surface) { registry[surface.id] = surface; }   // {id, eligible, show}

  function alreadyClaimed() {
    try { return sessionStorage.getItem(SESSION_MARKER) === '1'; } catch (e) { return false; }
  }
  function claim() { try { sessionStorage.setItem(SESSION_MARKER, '1'); } catch (e) {} }

  function run() {
    if (typeof window !== 'undefined' && window.name === 'demo-mode') return; // D-09
    if (alreadyClaimed()) return;                                             // D-02
    for (var i = 0; i < PRECEDENCE.length; i++) {
      var s = registry[PRECEDENCE[i]];
      if (!s) continue;                                  // e.g. 'whats-new' absent until Phase 42
      var ok = false;
      try { ok = !!s.eligible(); } catch (e) { ok = false; }
      if (ok) { claim(); try { s.show(); } catch (e) {} return; } // first eligible wins, stop
    }
  }
  window.AttentionCoordinator = { register: register, run: run, PRECEDENCE: PRECEDENCE };
})();
```
**Key subtlety (D-08 resolved):** the security-note surface's `eligible()` must return `false` when `#security-guidance-container` is absent (non-Overview page) — so an unrenderable winner never consumes the session slot; the loop cleanly advances.

### Pattern 2: Full-screen welcome overlay (Variant B split — D-10, ONBD-01)
**What:** A `role="dialog" aria-modal="true"` full-screen overlay: botanical **art-side** on one inline side, **copy-side** (headline + subtitle + two stacked CTAs) on the other; sides flip under RTL via logical properties; stacks to single column below ~720px. Reuse `lockBodyScroll`/`unlockBodyScroll`.
**When to use:** welcome surface `show()`, and the direct "Replay welcome" open.
**Example (structure from sketch 001 Variant B):**
```html
<!-- Source: .planning/sketches/001-welcome-overlay/index.html #variant-b (approved D-10) -->
<div class="welcome-overlay" role="dialog" aria-modal="true" aria-labelledby="welcomeTitle">
  <div class="welcome-panel">                       <!-- max-width ~960px, grid 2-col -->
    <div class="welcome-art" aria-hidden="true"><!-- botanical hero, invert+screen in dark --></div>
    <div class="welcome-copy">
      <h1 id="welcomeTitle" data-i18n="help.welcome.title">Welcome to your garden</h1>
      <p data-i18n="help.welcome.subtitle">…</p>
      <div class="welcome-actions">
        <button class="cta--primary"   data-i18n="help.welcome.ctaTour">Take the guided tour</button>
        <button class="cta--secondary" data-i18n="help.welcome.ctaExplore">I'll explore myself</button>
      </div>
    </div>
  </div>
</div>
```
- Either CTA or `Esc` dismisses → set `localStorage 'sg.welcomeSeen'` + write last-seen-version (Pattern below).
- Primary CTA (interim, D-11) navigates to `./help.html`; Phase 41 rewires to the tour (one-line change).
- Secondary CTA is first-class but **neutral** (`--color-surface-secondary-btn`), never accent.

### Pattern 3: `beforeinstallprompt` capture + real Install button (D-12, ONBD-04)
**What:** Register the listener as early as possible (eval-time top-level of the coordinator file, NOT inside `initCommon`), `preventDefault()`, stash the event. The install nudge's [Install app] button calls the stashed event's `prompt()`.
**Example:**
```javascript
// Source: [VERIFIED: web.dev "customize-install", MDN beforeinstallprompt]
var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();          // suppress the default mini-infobar
  deferredPrompt = e;          // stash for the nudge's Install button
});
window.addEventListener('appinstalled', function () {
  deferredPrompt = null;       // installed → never offer again this load
});
// …later, inside the nudge's [Install app] onclick (Chromium branch only):
if (deferredPrompt) {
  deferredPrompt.prompt();                 // can only be called ONCE per captured event
  deferredPrompt.userChoice.finally(function () { deferredPrompt = null; });
}
```
- **Platform branch in `show()`:** `deferredPrompt` present → render the real [Install app] button. No `deferredPrompt` (macOS Safari / Firefox desktop) → render the "File → Add to Dock" pointer line + "See install help" link (Phase 39 install topic). Never a fake universal button.
- **`eligible()`:** false if `matchMedia('(display-mode: standalone)').matches` (already installed), false if the persistent dismissal flag is set, false on mobile (mobile gets the hint instead).

### Pattern 4: Phone-class mobile hint (D-16, ONBD-04)
**What:** All-mobile (iOS + Android), one-shot, dismissed-forever, calm bottom bar. Phone-class detection, NOT iOS-only UA sniffing.
**Recommended detection (Claude's discretion — document the choice per D-16):**
```javascript
// Source: [CITED: MDN pointer/hover + UA-Client-Hints]; heuristic composed for "phone-class"
function isPhoneClass() {
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var narrow = window.matchMedia('(max-width: 820px)').matches;
  var uaMobile = !!(navigator.userAgentData && navigator.userAgentData.mobile); // Chromium only
  return uaMobile || (coarse && narrow);   // UA-hint OR (touch-primary AND phone-width)
}
```
Rationale: `pointer: coarse` alone would match a touch laptop; ANDing a phone-width query excludes most; `userAgentData.mobile` reinforces on Chromium. See Open Question 1 for the touch-laptop edge and Pitfall 4.
- Styling per UI-SPEC: `--color-surface` bg, `--color-text` copy, soft top border — **no `--color-primary` fill, no warning tone** (it is NOT the deleted banner's accent bar).

### Pattern 5: "Replay welcome" as an action row in the "?" popover (D-17, ONBD-02)
**What:** Append a menu row that, on click, calls the welcome surface's `show()` **directly** (bypassing `run()`), so it never re-arms `sg.welcomeSeen` or the session marker.
**Integration note (concrete gap):** the current `initHelpEntry` items array (`app.js:515`) is **href-only** — each item renders an `<a href>`. "Replay welcome" is an action, not navigation. Extend the item schema to accept an `action` (click handler) alternative, e.g.:
```javascript
// app.js initHelpEntry — extend the addable items loop to support action rows
var items = [
  { labelKey: 'help.entry.center',  href: './help.html' },
  { labelKey: 'help.entry.replayWelcome', action: function () { AttentionCoordinator.showWelcome(); } }, // NEW
  { labelKey: 'help.entry.contact', href: 'mailto:contact@sessionsgarden.app' }
];
// in the forEach: if (item.href) → <a href>; else if (item.action) → <button role="menuitem" onclick=action>
```
Keep the `data-label-key` + `app:language` re-translate wiring intact for the new row. Phase 41 later appends its own "Take the tour" action row the same way (no rename churn).

### Anti-Patterns to Avoid
- **SaaS onboarding energy.** No "Step 1 of 12", no progress dots, no forced flow. The welcome is "the highest emotional-impact surface" — felt calm (sketch 001 brief).
- **Queuing losers within a session (D-02).** A surface that loses arbitration is NOT shown later this session; it competes again next session. Do not build a queue.
- **`innerHTML` with any interpolated value.** Established convention (T-39-04/05): compile-time-literal SVG only; all copy via `textContent` / `data-i18n`. XSS-safe by construction.
- **Governing the wrong surfaces.** Backup-reminder banner + footer integrity nudge are functional signals, NOT ceremony — they stay independent (D-04). Do not route them through the coordinator.
- **Reading the SW/integrity-token layer for the version write.** D-03 uses `AppVersion.APP_VERSION` (the hand-set semver), never `INTEGRITY_TOKEN`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Body scroll-lock behind the overlay | A new `overflow:hidden` toggle | `App.lockBodyScroll`/`unlockBodyScroll` (`app.js:1598`) | iOS-Safari-safe `position:fixed` + scroll-restore already solved; a naive `overflow:hidden` breaks on iOS. |
| Native install trigger | A custom "click here to install" that opens instructions | `beforeinstallprompt` deferred `prompt()` | Only the browser can invoke the real install dialog; you can only defer + re-fire its own event. |
| "Already installed?" detection | UA sniffing | `matchMedia('(display-mode: standalone)')` | Standard, already used in-repo; UA sniffing misses installed-standalone reliably. |
| Session boundary ("one launch") | localStorage + hand-rolled timestamp windows | `sessionStorage` marker | sessionStorage IS the browser's session boundary (cleared on full close, survives same-session navigation). |
| "?" popover row + re-translate | A second popover / new menu | `initHelpEntry` addable items array | Phase 39 built the slot for exactly this; reuse keeps one source of truth + the `app:language` re-translate. |
| Dark-mode botanical art | A separate dark illustration set | `invert(1) + screen blend` (Phase 11 pattern) | Established; no new asset pipeline. |
| Overlay copy / labels | Hard-coded English (like the deleted iOS banner) | `data-i18n` keys in all 4 locale files | The iOS banner's hard-coded English is precisely what D-15/D-16 fix. |

**Key insight:** every surface this phase adds has an existing analog in the codebase (modal, popover row, dismissable banner, one-flag storage). The failure mode is inventing a parallel mechanism instead of composing the shipped ones — which is also what the plan-checker/architect-gate will scrutinize (see MEMORY `reference-pattern-mapper-reuse-claims-need-source-verification`: verify each reuse claim against real source, don't assert it).

## Runtime State Inventory

This phase deletes a runtime surface, moves another behind arbitration, and adds several storage keys — so a state audit applies even though it is not a rename.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **New keys (localStorage):** `sg.welcomeSeen` (LOCKED name), install-nudge dismissal, mobile-hint dismissal, last-seen-version (Phase 42 reads this — name it self-documentingly, e.g. `sg.whatsNewLastSeenVersion`). **New key (sessionStorage):** the per-session marker. **Orphaned by deletion:** `iosPromptDismissed` (sessionStorage) — set by the deleted iOS banner; becomes dead but harmless. | Code edit (define keys). No data migration needed — all keys are net-new or the untouched `sg.welcomeSeen`. Orphaned `iosPromptDismissed` needs NO cleanup (auto-expires with the session; writing cleanup code is unwarranted churn). |
| Live service config | None — no external services, no server, no remote config. | None (verified — the app is fully offline/client-only by design). |
| OS-registered state | None — no Task Scheduler / launchd / pm2. The only OS-adjacent surface is the *browser's own* install state, read live via `display-mode: standalone` (not stored by us). | None. |
| Secrets/env vars | None — this phase touches no `.env`, no keys, no LS/activation secret names. | None (verified — surfaces read `portfolioLicenseActivated` flag only, unchanged). |
| Build artifacts / installed packages | `sw.js` PRECACHE_URLS must gain the new coordinator file, and the SW **CACHE_NAME derives from `INTEGRITY_TOKEN`** — a PRECACHE edit needs the manual cache-bump chore commit (known pre-commit-hook gotcha, MEMORY `reference-pre-commit-sw-bump`). | Code edit (add to PRECACHE) + a **follow-up chore commit** so installed PWAs re-precache the new asset. See Pitfall 6. |

**Canonical question answered:** after every file edit ships, the only runtime state still carrying old behavior is the browser's per-tab `iosPromptDismissed` sessionStorage value — which dies on the next browser close and never resurrects (the banner that wrote it is gone). Nothing else persists stale.

## Common Pitfalls

### Pitfall 1: `beforeinstallprompt` hasn't fired yet when the nudge tries to show
**What goes wrong:** The install nudge is eligible-by-platform (Chromium desktop), but `deferredPrompt` is still `null` because the event fires on the browser's engagement heuristic timing, sometimes after `initCommon`.
**Why it happens:** `beforeinstallprompt` is not guaranteed before `DOMContentLoaded`; it may fire later (or never, if criteria unmet or already installed).
**How to avoid:** Register the capture listener at **eval-time top-level** (earliest possible). In the nudge `show()`, if `deferredPrompt` is null on a Chromium desktop, either (a) defer showing the card until the event arrives (re-attempt on the event), or (b) fall through to the Safari-style pointer text. Do NOT render a dead [Install app] button. Also handle the case where the event never fires (already meets none of the criteria).
**Warning signs:** [Install app] click does nothing; console shows no captured event.

### Pitfall 2: Calling `prompt()` twice on the same deferred event
**What goes wrong:** Second install attempt throws / silently no-ops.
**Why it happens:** `[VERIFIED: web.dev]` The deferred `BeforeInstallPromptEvent` can be prompted **once**; after use you must wait for a fresh event.
**How to avoid:** Null out `deferredPrompt` after `prompt()` resolves; disable/remove the button. Since dismissal is "gone forever" (D-14) this is naturally one-shot anyway.
**Warning signs:** repeated clicks after cancel produce nothing.

### Pitfall 3: `beforeinstallprompt` doesn't fire when `prefer_related_applications` is true, or when already installed
**What goes wrong:** Chromium users never see the real button.
**Why it happens:** `[VERIFIED: Chromium issue 41459470]` the event is suppressed with `prefer_related_applications: true`, in standalone mode, or when engagement/manifest criteria aren't met.
**How to avoid:** Confirm `manifest.json` does not set `prefer_related_applications`; gate `eligible()` on `!standalone`; treat "no event" as the Safari-pointer fallback path, not a bug.
**Warning signs:** button never appears on a supposedly-eligible Chrome.

### Pitfall 4: Wrong storage class → surface re-nags or never re-competes
**What goes wrong:** Using localStorage for the per-session marker makes a losing surface never re-compete on the next launch; using sessionStorage for a "gone forever" dismissal makes the nudge/hint re-nag every session.
**Why it happens:** D-02 (session marker) and D-14/D-16 (dismissals) have *opposite* persistence requirements.
**How to avoid:** Session marker → **sessionStorage** (dies on browser close). Dismissals + `sg.welcomeSeen` + last-seen-version → **localStorage** (survive restart). Wrap every read/write in try/catch (private-mode / quota) — the established idiom.
**Warning signs:** install nudge reappears after every restart (should be never); or welcome loses to nothing next session.

### Pitfall 5: "Replay welcome" re-arms the coordinator or the one-shot flag
**What goes wrong:** Replaying the welcome from "?" writes `sg.welcomeSeen` / the session marker, corrupting first-run semantics or suppressing a legitimate next-session surface.
**Why it happens:** Reusing `run()`/the full show-and-record path for the direct open.
**How to avoid (D-17):** Replay calls the welcome's `show()` **directly** with a "replay" flag that skips the flag-writing and the coordinator claim. Only the *first-run* path (via `run()`) writes `sg.welcomeSeen` + last-seen-version.
**Warning signs:** after replaying once, no governed surface ever shows again.

### Pitfall 6: New coordinator asset not precached → offline PWA runs stale/without it
**What goes wrong:** The installed PWA doesn't get the coordinator file offline, or the CACHE_NAME isn't rolled so the new asset never re-precaches.
**Why it happens:** `sw.js` derives CACHE_NAME from `INTEGRITY_TOKEN`; a PRECACHE_URLS edit inside the same diff as `sw.js` can skip the cache bump (MEMORY `reference-pre-commit-sw-bump`).
**How to avoid:** Add `/assets/attention-coordinator.js` to PRECACHE_URLS AND ship the **manual cache-bump chore commit** as a follow-up; add a static precache test (mirror `tests/39-help-precache.test.js`) asserting the file is listed.
**Warning signs:** coordinator works in dev, absent on the installed PWA.

### Pitfall 7: Script load order — `initCommon` calls the coordinator before it's defined
**What goes wrong:** `AttentionCoordinator.run()` is undefined at `initCommon` time.
**Why it happens:** The coordinator `<script>` is placed after `app.js`.
**How to avoid:** Include `assets/attention-coordinator.js` **before** `assets/app.js` on all 8 app pages (the same ordering discipline as `version.js`/`shared-chrome.js` preceding `app.js` in `index.html:356-360`). Guard the call defensively (`typeof AttentionCoordinator !== 'undefined'`).
**Warning signs:** ReferenceError on load; no surfaces ever show.

## Code Examples

### Welcome dismissal — one-shot + upgrader last-seen-version write (D-03)
```javascript
// Source: composed from CONTEXT D-03 + assets/version.js (APP_VERSION is the hand-set semver)
function dismissWelcome(isReplay) {
  if (!isReplay) {                                  // Pitfall 5: only the first-run path records
    try {
      localStorage.setItem('sg.welcomeSeen', '1');  // LOCKED key (26-UI-SPEC)
      // Subsume v1.3 What's-New for upgraders: stamp current semver as last-seen (D-03).
      // Phase 42 reads THIS key; name it with Phase 42 in mind.
      var v = (window.AppVersion && window.AppVersion.APP_VERSION) || '';
      if (v) localStorage.setItem('sg.whatsNewLastSeenVersion', v);
    } catch (e) {}
  }
  App.unlockBodyScroll();
  // remove the overlay node …
}
```

### Security-note surface registration (moves behind arbitration — D-05/D-08)
```javascript
// Source: composed from app.js showFirstLaunchSecurityNote + CONTEXT D-05/D-08
AttentionCoordinator.register({
  id: 'security-note',
  eligible: function () {
    if (!document.getElementById('security-guidance-container')) return false; // D-08: unrenderable → skip
    if (localStorage.getItem('portfolioLicenseActivated') !== '1') return false;
    var dismissedAt = localStorage.getItem('securityGuidanceDismissed');        // 7-day cadence unchanged (D-05)
    if (dismissedAt && dismissedAt !== '1') {
      var days = (Date.now() - new Date(dismissedAt).getTime()) / 864e5;
      if (days < 7) return false;
    }
    return true;
  },
  show: function () { App.showFirstLaunchSecurityNote(); }   // existing renderer, unchanged behavior
});
```

### iOS banner deletion (D-15)
```
DELETE the entire inline <script> at index.html:365-378 (the `ios-install-banner` IIFE).
Nothing of its visual styling (accent fill, 📤 emoji) carries forward. Add a static test
asserting index.html no longer contains 'ios-install-banner'.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-session hard-coded-English iOS install banner (`index.html:367`) | Coordinator-governed, i18n'd, all-mobile expectation hint (successor) | This phase (D-15/D-16) | Stops promoting install on a deliberately-unsupported platform; calm expectation-setting instead. |
| Each surface fires unconditionally from `initCommon` (security note, banners stacked) | Single coordinator arbitrates one governed surface per session | This phase (D-01..D-09) | No competing surfaces stack (ONBD-03). |
| `beforeinstallprompt` deprecation rumors | Chrome team committed, no deprecation plans (MDN 2025-05-02); moved to its own incubator | 2025 | Safe to build the real Install button on Chromium; still Chromium-only (Safari/Firefox never fire it). |

**Deprecated/outdated:**
- **iOS-only UA sniffing for install prompts** → replaced by capability detection (`display-mode`, `beforeinstallprompt`) + phone-class media queries (D-16).
- **`window.navigator.standalone` (iOS-only legacy)** → `matchMedia('(display-mode: standalone)')` is the cross-browser standard already used in-repo.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `initHelpEntry` items array can be extended in-place to support an `action` row without breaking the existing `app:language` re-translate wiring | Pattern 5 | Low — verified the loop/listener structure in `app.js:515-566`; the extension is additive. If the planner prefers a separate append, D-17's "extension slot" is still honored. |
| A2 | `manifest.json` does not set `prefer_related_applications` (so `beforeinstallprompt` can fire on Chromium) | Pitfall 3 | Low — `manifest.json` is 538 bytes and this app has no related native app; planner should still confirm during planning. |
| A3 | The phone-class heuristic `(pointer:coarse) && (max-width:820px)` correctly classifies the target audience's devices | Pattern 4 / OQ1 | Medium — a touch-screen laptop could be mis-classified; the practical audience (therapists on phones vs. desktop computers) makes this low-impact, but Ben's exact device split is unconfirmed. |
| A4 | Recommended new storage key names (session marker, dismissals, `sg.whatsNewLastSeenVersion`) are acceptable — these are explicitly Claude's discretion | Multiple | None — discretionary; the only cross-phase constraint is that Phase 42 reads the same last-seen-version key. |

**Note:** No `[ASSUMED]` claims here concern compliance, retention, security standards, or performance targets. All are mechanical/naming assumptions with clear verification paths for the planner.

## Open Questions (RESOLVED)

1. **Phone-class detection threshold for the mobile hint (D-16, Claude's discretion)** — RESOLVED: plans use `uaMobile || (pointer:coarse && max-width:820px)` (40-03)
   - What we know: must be all-mobile (not iOS-only UA sniffing); `pointer:coarse` + a width query + optional `userAgentData.mobile` is the modern composite.
   - What's unclear: the exact width breakpoint (820px suggested) and whether a touch-laptop false-positive matters for this audience.
   - Recommendation: ship `uaMobile || (coarse && narrow@820px)`; document the choice inline (D-16 requires documenting the approach). Low blast radius — the hint is calm and dismissed-forever.

2. **Does the coordinator file also *host* the welcome/install/mobile-hint surface impls, or do they live in separate files?** — RESOLVED: single `assets/attention-coordinator.js` hosts registry + all three new surfaces; security note stays in `app.js` (40-02/40-03)
   - What we know: D-06 wants a registry module; surfaces register `{id, eligible, show}`.
   - What's unclear: file granularity is unspecified.
   - Recommendation: keep all three new surface impls + the registry in the single `attention-coordinator.js` for this phase (one new precache entry, one new `<script>` per page). Split later only if it grows. The security note stays in `app.js` and registers itself.

3. **Welcome hero illustration choice (Claude's discretion, D-10).** — RESOLVED: existing repo art per 40-02; final visual confirmed at phase UAT in real WebKit + dark
   - What we know: reuse existing repo art only (`watering-can.png`, `garden.png`/`garden-2.png`, `hero-left/right.png`); must fit Variant B split panel + dark mode (`invert+screen`).
   - Recommendation: `hero-left.png` or `garden.png` at the art-side; verify in real WebKit + dark (MEMORY `reference-webkit-chromium-svg-visual-verification` — Chromium-only gates miss Safari bugs). This is a UI decision to confirm at UAT, not a blocker.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (test runner) | jsdom behavior tests | ✓ (existing) | project devDeps | — |
| jsdom | `tests/*.test.js` harness | ✓ (installed devDependency) | node_modules/jsdom | — |
| Chromium browser | `beforeinstallprompt` real button (runtime, not build) | user-side | — | macOS Safari "Add to Dock" pointer + Phase 39 help topic (D-12) |
| Real WebKit (Safari) for UI verification | RTL/dark visual check of overlay | Ben's device (UAT) | — | Playwright WebKit `getBoundingClientRect` probe (MEMORY reference) |

**Missing dependencies with no fallback:** none — the phase is buildable and testable entirely with the existing node+jsdom harness; browser-specific behavior degrades gracefully by design (D-12).
**Missing dependencies with fallback:** the real Install button requires a Chromium runtime; non-Chromium desktops get the documented Safari-style pointer fallback — this is intended behavior, not a gap.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Zero-dependency node runner + jsdom (`eval-into-jsdom`) — `tests/run-all.js` |
| Config file | none — discovery is `readdirSync(tests/)` for `*.test.js` |
| Quick run command | `node tests/40-coordinator.test.js` (single file, exits 0/1) |
| Full suite command | `node tests/run-all.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ONBD-03 | Coordinator shows exactly one governed surface per session; precedence order enforced; demo mode shows none; unrenderable security note skips to next | unit (jsdom) | `node tests/40-coordinator.test.js` | ❌ Wave 0 |
| ONBD-01 | Welcome fires once (`sg.welcomeSeen`); Esc + either CTA dismiss; first-run writes last-seen-version (D-03) | unit (jsdom) | `node tests/40-welcome-overlay.test.js` | ❌ Wave 0 |
| ONBD-02 | "Replay welcome" reopens overlay via direct `show()`; does NOT re-arm `sg.welcomeSeen`/session marker | unit (jsdom) | `node tests/40-welcome-overlay.test.js` | ❌ Wave 0 |
| ONBD-04 | Install nudge: platform branch (deferredPrompt→button / real macOS Safari→pointer; no-event non-Safari→ineligible, slot passes); `standalone`→ineligible; dismissed-forever persists; mobile hint one-shot all-mobile | unit (jsdom, mocked matchMedia/navigator) | `node tests/40-install-nudge.test.js` | ❌ Wave 0 |
| D-15 | iOS banner removed from `index.html` | static grep | `node tests/40-ios-banner-removed.test.js` | ❌ Wave 0 |
| Precache | coordinator file listed in `sw.js` PRECACHE_URLS | static | mirror `tests/39-help-precache.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the touched surface's file, e.g. `node tests/40-coordinator.test.js`
- **Per wave merge:** `node tests/run-all.js`
- **Phase gate:** full suite green before `/gsd-verify-work` (current baseline 131/131 per STATE.md — new tests must land green and raise the count).

### Wave 0 Gaps
- [ ] `tests/40-coordinator.test.js` — precedence, one-per-session, demo-off, unrenderable-skip (ONBD-03). **Behavior test authored BEFORE the coordinator impl** (project rule, MEMORY `feedback-behavior-verification`).
- [ ] `tests/40-welcome-overlay.test.js` — one-shot, dismiss paths, last-seen-version write, replay-doesn't-re-arm (ONBD-01/02)
- [ ] `tests/40-install-nudge.test.js` — platform branch + standalone gate + dismissed-forever + mobile hint (ONBD-04); mock `matchMedia`, `navigator.userAgentData`, and a synthetic `beforeinstallprompt` event
- [ ] `tests/40-ios-banner-removed.test.js` — static assertion `index.html` no longer ships `ios-install-banner` (D-15)
- [ ] Precache static test (extend/mirror `39-help-precache.test.js`)
- Framework install: none needed (node + jsdom already present).

## Security Domain

`security_enforcement` is not disabled in config → included. This phase is **client-only, no network, no auth, no server, no user-input persistence** — the security surface is narrow.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in these surfaces (reads the existing `portfolioLicenseActivated` flag only). |
| V3 Session Management | no | sessionStorage marker is a UX boundary, not a security session. |
| V4 Access Control | no | No privileged actions; no data mutation. |
| V5 Input Validation / Output Encoding | yes | All copy via `textContent` / `data-i18n`; the ONLY innerHTML is compile-time-literal SVG with no interpolation (T-39-04/05). No user input flows into any new surface. |
| V6 Cryptography | no | No crypto, no secrets touched. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DOM XSS via interpolated `innerHTML` in a new surface | Tampering | Established convention: `textContent` for all copy; compile-time-literal SVG only; never interpolate a value into markup. Grep-gate the new surface for `innerHTML` with variables. |
| Clickjacking the native install prompt | Spoofing | `beforeinstallprompt.prompt()` is a browser-mediated dialog the page cannot style/overlay; no additional control needed. |
| Storage tampering (a user clearing flags) | Tampering | Non-adversarial (single-user local app); worst case a surface re-shows — no security impact. try/catch guards handle quota/private-mode. |
| Leaking the enhancement/build date via copy | Info disclosure | Reuse `AppVersion.APP_VERSION` semver for the last-seen write; do NOT surface `INTEGRITY_TOKEN` or build dates in user copy (cf. MEMORY 260703-mp6 date-leak lesson). |

## Sources

### Primary (HIGH confidence)
- `assets/app.js` — `initHelpEntry` (515-566), `initCommon` (760-939), `showFirstLaunchSecurityNote` (1356-1383), `lockBodyScroll`/`unlockBodyScroll` (1598-1612), `initDemoMode` (277) — read directly this session.
- `assets/version.js` — `AppVersion.APP_VERSION` (=1.3.0), `INTEGRITY_TOKEN` separation, `buildNudge` (integrity nudge, NOT governed) — read directly.
- `index.html:365-378` — the iOS banner IIFE to delete; `index.html:83` security container; `index.html:356-360` script load order — read directly.
- `sw.js` — PRECACHE_URLS + CACHE_NAME-from-INTEGRITY_TOKEN — read directly.
- `.planning/phases/40-.../40-CONTEXT.md` (D-01..D-17) and `40-UI-SPEC.md` (approved, 6/6 dimensions PASS) — the locked contract.
- `.planning/sketches/001-welcome-overlay/` (README + `index.html` #variant-b) — Variant B split composition (D-10).
- MDN `beforeinstallprompt` + web.dev "customize-install" / "installation-prompt" — `[VERIFIED]` Chromium-only, `preventDefault`+defer, single `prompt()`, `appinstalled`, no-deprecation (MDN updated 2025-05-02).

### Secondary (MEDIUM confidence)
- MDN pointer/hover media features + UA-Client-Hints (`navigator.userAgentData.mobile`) — phone-class detection composite (`[CITED]`).
- Chromium issue 41459470 — `prefer_related_applications` suppresses `beforeinstallprompt` (`[VERIFIED]` via search result title).

### Tertiary (LOW confidence)
- None. All load-bearing claims are verified against in-repo source or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — there is no external stack; all reused primitives read directly from source this session.
- Architecture: HIGH — coordinator design, welcome overlay, and integration seams are specified by CONTEXT/UI-SPEC and verified against real code.
- `beforeinstallprompt` behavior: HIGH — cross-checked MDN + web.dev + Chromium issue tracker.
- Pitfalls: HIGH — each maps to a documented API constraint or an existing MEMORY lesson (SW precache bump, storage class, WebKit visual verification, date leak).

**Research date:** 2026-07-08
**Valid until:** 2026-08-07 (30 days — stable vanilla/browser-API domain; `beforeinstallprompt` is the only external-facing surface and is Chrome-team-committed).

---

Sources:
- [MDN: Window: beforeinstallprompt event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event)
- [web.dev: How to provide your own in-app install experience](https://web.dev/articles/customize-install)
- [web.dev: Installation prompt](https://web.dev/learn/pwa/installation-prompt)
- [MDN: Trigger installation from your PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt)
- [Chromium issue 41459470: beforeinstallprompt + prefer_related_applications](https://issues.chromium.org/issues/41459470)
</content>
</invoke>
