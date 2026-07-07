# Architecture Research

**Domain:** In-app help / onboarding / changelog for a vanilla multi-page PWA (Sessions Garden)
**Researched:** 2026-07-07
**Confidence:** HIGH (grounded in the live codebase; every claim below cites `file:line`. LOW only where noted for design options left open for discuss-phase.)

> Scope note: this is a **subsequent-milestone integration study**, not a greenfield stack survey. It answers "how do the three v1.3 pillars bolt onto the code that already ships." Phase 26's `26-UI-SPEC.md` (D-01..D-15) is treated as **verified prior art**, reconciled against current source — its named template `demo-hints.js` **no longer exists** (deleted in Phase 35 DEMO-01), and its `data-tour` anchors **are not in production** (grep confirms zero matches). Both facts change the build.

---

## Standard Architecture

### System Overview — where the new surfaces attach

The app is a no-build, per-screen HTML app. Every app page loads the same script stack and calls **one** entry point, `App.initCommon()` (`assets/app.js:648`), which mounts all shared chrome into two fixed DOM hooks: `#nav-placeholder` and `#headerActions` (`index.html:66-67`). The three pillars attach here.

```
┌──────────────────────────────────────────────────────────────────────┐
│  PER-PAGE HTML (index / sessions / reporting / add-client /            │
│  add-session / settings / report / demo)  +  NEW: help.html           │
│    <div id="nav-placeholder">     <div id="headerActions">            │
└───────────┬───────────────────────────────┬──────────────────────────┘
            │ renderNav() app.js:137         │ initCommon() app.js:648
            ▼                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      SHARED CHROME LAYER (existing)                    │
│  renderNav ─ theme ─ langPopover ─ backupCloud ─ settingsGear ─ ...    │
│                          │                                             │
│   NEW mount points (all idempotent, all inside initCommon):           │
│   ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌────────────────────┐   │
│   │ "?" help │ │ welcome      │ │ tour     │ │ What's-New popup    │   │
│   │ icon     │ │ overlay      │ │ engine   │ │ (version-change)    │   │
│   │→ headerA │ │ (first-run)  │ │ (resume) │ │                     │   │
│   └────┬─────┘ └──────┬───────┘ └────┬─────┘ └─────────┬──────────┘   │
│        │ nav "Help"   │ first-run    │ data-tour        │ APP_VERSION  │
│        ▼              ▼ coordinator  ▼ anchors          ▼ vs last-seen │
├──────────────────────────────────────────────────────────────────────┤
│                       STATE / DATA LAYER                               │
│  i18n: window.I18N[lang][key] (app.js:14) + app:language event (:126)  │
│  version: AppVersion.APP_VERSION (version.js:25)                       │
│  persistence: localStorage (long-lived) + sessionStorage (per-visit)   │
│  content: NEW changelog-data.js  +  NEW help.* / changelog.* i18n keys │
│  offline: sw.js PRECACHE_URLS (:33) + PRECACHE_HTML (:106) manual list │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities — NEW vs MODIFIED (explicit)

| Component | New / Modified | Responsibility | Integration point (cited) |
|-----------|----------------|----------------|---------------------------|
| `assets/help.js` | **NEW** | Renders `help.html` content (workflow-spine IA + personalization + technical track); exposes `Help.openHelpCenter()` for deep-links | Own page; reuses `renderNav()`/`SharedChrome.renderFooter()` (`app.js:137`, `shared-chrome.js:100`) |
| `help.html` | **NEW** | Help-center page shell (per-page HTML pattern) | Same script stack as `index.html:347-362`; new nav entry |
| "?" header entry | **NEW** (mount fn) | Icon button in `#headerActions`, opens tour / links to help | Add an `initHelpEntry()` call inside `initCommon()` (`app.js:648-656`), mirroring `initSettingsLink()` (`app.js:391`) |
| `assets/welcome.js` | **NEW** | First-run full-screen overlay, one-shot via `localStorage 'sg.welcomeSeen'` | Called from a first-run coordinator inside `initCommon()` near `showFirstLaunchSecurityNote()` (`app.js:779`) |
| `assets/tour.js` | **NEW** | Bespoke step engine; spotlight + tooltip; cross-page resume; graceful degradation | Reads `data-tour` anchors (to be added to page HTML); re-renders on `app:language` (`app.js:126`) |
| `data-tour="…"` anchors | **NEW** (HTML edits) | Locale/refactor-stable binding targets on ~6–9 workflow elements | Added to `index.html`, `add-client.html`, `add-session.html`, `sessions.html` bodies |
| `assets/changelog-data.js` | **NEW** | Structured, ordered release entries; i18n-capable | Loaded before `changelog.js`/popup; added to `sw.js` PRECACHE_URLS |
| What's-New popup (mount fn) | **NEW** | Shows once per version bump; keyed on `APP_VERSION` vs `localStorage 'sg.lastSeenVersion'` | Reads `AppVersion.APP_VERSION` (`version.js:25`); mounted via the first-run coordinator |
| Changelog page section | **NEW** | Persistent list rendered inside `help.html` | Consumes `changelog-data.js` |
| PWA install nudge | **NEW / consolidate** | Per-browser install guidance | Supersedes/absorbs the inline iOS banner (`index.html:366-378`) |
| `renderNav()` | **MODIFIED** | Add a "Help" nav entry (`data-nav="help"`) | `app.js:140-148` |
| `initCommon()` | **MODIFIED** | Add help-entry mount + first-run coordinator calls | `app.js:648-785` |
| 4 × `i18n-*.js` | **MODIFIED** | Add `help.*`, `help.welcome.*`, `help.tour.*`, `changelog.*` keys | `assets/i18n-en.js` etc. (flat `"key":"val"` map) |
| `sw.js` | **MODIFIED** | Register new JS + `help.html` for offline | PRECACHE_URLS (`sw.js:33`), PRECACHE_HTML (`sw.js:106`) — **both are manual lists** |
| `.git/hooks` + `deploy.yml` + agent DoD | **NEW** | Docs hard gate | `.git/hooks` currently empty; `deploy.yml` has no test/lint step |

**Critical current-state gotchas the roadmap must not miss:**

1. **`report.html` never calls `initCommon()`** — it ships `#headerActions` markup (`report.html:47`) and loads `shared-chrome.js`/`version.js` but **not** `app.js`. So a "?" mounted via `initCommon` will **not** appear on the report page. Decide per pillar whether report/legal/landing pages get the help entry (they are the pages a lost user is most likely on).
2. **Legal + landing pages have no app chrome at all** and deliberately omit `i18n.js` — `shared-chrome.js` inlines its own `FOOTER_STRINGS`/`BACK_LINK_STRINGS` for exactly this reason (`shared-chrome.js:64-98`). Any help entry there needs the same inline-strings treatment.
3. **The "footer update-nudge" is not a version-announcement.** It is the **integrity-mismatch** nudge (`version.js:239 buildNudge`, driven by `shared-chrome.js:149 maybeUpgradeFooterAndNudge`). It fires only when the loaded SW cache token ≠ source token — a *broken-update* signal, not a *new-release* signal. The What's-New popup is a **different** surface with a **different** trigger; they can legitimately both exist, but the precedence model (below) must order them.

---

## Recommended Project Structure

New files follow the existing flat `assets/` convention (one module per concern, IIFE exposing a `window.*` namespace, no build step):

```
TherapistPortfolioManager_app/
├── help.html                      # NEW — help-center page (per-page pattern)
├── assets/
│   ├── help.js                    # NEW — help-center render + Help.open* API
│   ├── welcome.js                 # NEW — first-run overlay (localStorage one-shot)
│   ├── tour.js                    # NEW — bespoke tour engine (authored fresh)
│   ├── whatsnew.js                # NEW — version-change popup (or fold into help.js)
│   ├── changelog-data.js          # NEW — structured release entries (window.Changelog)
│   ├── first-run.js               # NEW (recommended) — precedence coordinator
│   ├── app.js                     # MOD — initHelpEntry() + coordinator calls in initCommon
│   ├── i18n-en.js|he.js|de.js|cs.js# MOD — help.*, help.tour.*, changelog.* keys
│   └── (index/add-*/sessions).html # MOD — data-tour anchors in the body
├── sw.js                          # MOD — add new assets + help.html to precache lists
├── .git/hooks/pre-commit          # NEW — docs-gate (fast, local, path-based)
├── .github/workflows/deploy.yml   # MOD — optional CI docs-gate step
└── scripts/docs-gate.sh           # NEW — shared gate logic (hook + CI call it)
```

### Structure Rationale

- **One module per surface** matches every existing feature (`backup-modal.js`, `export-modal.js`, `crop.js`) and keeps each pillar independently testable under the `tests/` + `run-all.js` harness.
- **A dedicated `first-run.js` coordinator** is the single highest-leverage new abstraction: today the first-run surfaces (security note, iOS banner, integrity nudge) each decide independently whether to show, so adding welcome + What's-New without a coordinator guarantees stacking collisions. Centralize the "what shows now?" decision.
- **`changelog-data.js` as data, not markup** keeps release notes out of `.js` logic and lets the docs-gate assert "a new version entry exists" with a simple parse.

---

## Architectural Patterns

### Pattern 1: Idempotent chrome mount inside `initCommon()`

**What:** Add `initHelpEntry()` the same way `initSettingsLink()` works — resolve `#headerActions`, bail if already mounted, `createElement` an SVG button (never `innerHTML` with user data), insert in the documented icon order, and register a one-time `app:language` relabel listener.

**When:** For the "?" entry point.

**Trade-offs:** Zero new infra, perfectly consistent with the codebase; but it only runs on pages that call `initCommon` (so not `report.html`/legal/landing — see gotcha #1).

**Example (mirrors `app.js:391-455`):**
```javascript
function initHelpEntry() {
  var actions = document.getElementById('headerActions');
  if (!actions || actions.querySelector('.help-entry-btn')) return;   // idempotent
  var btn = document.createElement('button');
  btn.className = 'header-control-btn help-entry-btn';
  btn.setAttribute('aria-label', t('help.entry.label'));
  btn.innerHTML = '<svg …>…</svg>';                                    // compile-time literal only
  btn.addEventListener('click', function(){ Tour.start('main'); });
  actions.appendChild(btn);
  if (!initHelpEntry._i18n) {                                          // one-time relabel
    document.addEventListener('app:language', function(){ /* re-set aria-label */ });
    initHelpEntry._i18n = true;
  }
}
```

### Pattern 2: Cross-page tour persistence via `sessionStorage` + resume-on-init

**What:** The workflow-spine tour spans multiple HTML pages. Because each page is a full document load, in-memory step state dies on navigation. Persist `{tourId, stepIndex}` to `sessionStorage` before `location.href`, and have `initCommon()` (or `tour.js`'s own init) check for an in-progress tour on every page load and resume.

**When:** For the guided tour only. `sessionStorage` (not `localStorage`) is correct: a tour is a within-visit activity — the existing iOS banner already uses `sessionStorage 'iosPromptDismissed'` (`index.html:369`) for the same "per-visit" semantics.

**Trade-offs:** Survives navigation and tab reload within a session; auto-clears when the tab closes (a half-finished tour shouldn't resurrect days later). Anchor resolution must degrade gracefully — Phase 26 D-11 already specifies: `anchor present & visible → spotlight; anchor missing / offsetParent===null → centered modal + working "Take me there" link (never a silent skip); step on another page → navigate + persist + resume`.

**Example:**
```javascript
// tour.js — step schema per 26-UI-SPEC D-11:
// { id, page, anchor?: '[data-tour="addClient"]', i18nKey, takeMeThereHref }
function goToStep(i) {
  var step = STEPS[i];
  if (step.page !== currentPage()) {
    sessionStorage.setItem('sg.tour', JSON.stringify({ tourId: id, stepIndex: i }));
    location.href = step.takeMeThereHref;                 // resumes on next page init
    return;
  }
  var el = step.anchor && document.querySelector(step.anchor);
  if (el && el.offsetParent !== null) spotlight(el, step);
  else centeredFallback(step);                            // NEVER silent-skip (Pitfall 6)
}
document.addEventListener('app:language', rerenderCurrentStep);  // cleanup-then-replace
```

> ⚠️ Prior-art caveat: 26-UI-SPEC modeled the tour renderer on `assets/demo-hints.js`. **That file was deleted in Phase 35** (PROJECT.md DEMO-01). The rendering CSS/DOM idiom must be authored fresh from the tokens system (`assets/tokens.css`, logical properties, `[data-theme="dark"]`). No vendored library (Shepherd/Intro are AGPL → rejected for a closed EUR-119 product; Driver.js MIT is a documented fallback only).

### Pattern 3: Version-change popup keyed on `APP_VERSION` vs a stored last-seen

**What:** On load, compare `AppVersion.APP_VERSION` (`version.js:25`) to `localStorage 'sg.lastSeenVersion'`. Three cases:
- **key absent** → first-ever run → this is the *welcome* path, **not** a What's-New (don't announce changes to someone who never saw the old version). Seed `sg.lastSeenVersion = APP_VERSION` silently.
- **stored < APP_VERSION** → genuine upgrader → show What's-New popup with entries newer than `stored`, then write `sg.lastSeenVersion = APP_VERSION`.
- **stored === APP_VERSION** → nothing.

**When:** For the changelog popup. This is a client-only comparison — no network, consistent with the offline-first constraint.

**Trade-offs:** Simple and offline-safe. Requires the seed-on-first-run rule to avoid double-surfacing welcome + What's-New to the same brand-new user (this is *the* reason the first-run coordinator matters). Semver comparison should be a tiny pure helper (unit-testable, mirrors how `version.js` keeps `resolveIntegrityState` pure at `version.js:53`).

**Example:**
```javascript
var seen = localStorage.getItem('sg.lastSeenVersion');
var now  = window.AppVersion.APP_VERSION;
if (seen === null)      localStorage.setItem('sg.lastSeenVersion', now);  // first run → welcome owns it
else if (seen !== now)  FirstRun.enqueue('whatsNew', { since: seen });    // upgrader
// coordinator decides ordering vs welcome / security note / iOS nudge
```

### Pattern 4: i18n-capable changelog data structure

**What:** Two viable shapes under the existing flat-key i18n system (`window.I18N[lang][key]`, `app.js:14`). Present both to discuss-phase; **Option A is the recommended default** because it reuses the exact mechanism the whole app already uses.

**Option A — thin data + i18n keys (recommended):**
```javascript
// changelog-data.js  — order + metadata only, copy lives in i18n files
window.Changelog = [
  { version: '1.3.0', date: '2026-07-XX', keyPrefix: 'changelog.v1_3_0' },
  { version: '1.2.5', date: '2026-07-07', keyPrefix: 'changelog.v1_2_5' }
];
// i18n-en.js:  "changelog.v1_3_0.title": "In-app help & changelog",
//              "changelog.v1_3_0.items": "…"   (or .item1/.item2 …)
```
*Pros:* one translation pipeline, `applyTranslations()` + `app:language` re-render already work, matches `help.*` keys. *Cons:* per-item copy needs a key convention (e.g. `.item1..itemN` or a delimiter split).

**Option B — self-contained multilingual data:**
```javascript
window.Changelog = [{
  version: '1.3.0', date: '2026-07-XX',
  title: { en:'…', he:'…', de:'…', cs:'…' },
  items: { en:[…], he:[…], de:[…], cs:[…] }
}];
```
*Pros:* release notes are one self-contained object, easy for the docs-gate to parse "does an entry for `APP_VERSION` exist?". *Cons:* a second, parallel i18n mechanism that `applyTranslations()` doesn't know about — the render code must hand-select the language and re-render on `app:language` itself.

Given the milestone ships **EN canonical, DE/CS/HE deferred** (PROJECT.md), Option A degrades most gracefully: `t()` already falls back to English for any missing key (`app.js:16`).

---

## Data Flow

### First-run / return-visit decision flow (the coordination that doesn't exist yet)

```
page load → initCommon() (app.js:648)
    │
    ├─ [pre-body] index.html head gates already ran (index.html:8/12/16):
    │     no license → landing ; no terms → disclaimer ; license incomplete → license
    │     (a user only reaches initCommon on index if fully licensed+accepted)
    │
    ▼ FirstRun.coordinate()  ← NEW single decision point
    │   collect candidates, show AT MOST ONE per load by priority:
    │     • welcome overlay      (localStorage 'sg.welcomeSeen' absent)
    │     • What's-New popup      ('sg.lastSeenVersion' < APP_VERSION)
    │     • integrity nudge       (version.js state ≠ 'clean')  ← already exists
    │     • security note         (app.js:1243, 7-day recurring)
    │     • PWA install nudge      (per-browser, was index.html:366)
    ▼
  render footer (SharedChrome.renderFooter, app.js:782) → may raise integrity nudge
```

### Offline availability flow (must-not-forget)

```
new file assets/help.js, tour.js, changelog-data.js, help.html
    │
    ▼ MUST be added to sw.js PRECACHE_URLS (sw.js:33) + PRECACHE_HTML (sw.js:106)
    │   (both are hand-maintained arrays — omission = feature silently breaks offline,
    │    the exact failure class version.js:16 comment calls out)
    ▼
  CACHE_NAME auto-rolls from INTEGRITY_TOKEN on deploy (sw.js:26) — no manual bump,
  but the pre-commit SW-bump hook note (memory) still applies to PRECACHE edits.
```

### Key Data Flows

1. **Language switch:** `setLanguage()` → `applyTranslations()` → dispatch `app:language` (`app.js:122-126`). Every new surface (help page, tour tooltip, welcome, popup) must listen and re-render — the tour especially (cleanup-then-replace) because its DOM is built imperatively, not via `data-i18n` scanning.
2. **Deep-link from empty state → help:** existing empty-state string `overview.clients.empty` (`i18n-en.js`, rendered `overview.js:640`) gains an inline link into the relevant `help.html` spine section — pure copy, no engine (26-UI-SPEC "empty-state coaching" leg).
3. **Version bump → popup:** `AppVersion.APP_VERSION` (`version.js:25`, hand-set at release) is the sole trigger source; the popup never phones home.

---

## First-Run Precedence — OPTIONS (decide in discuss-phase, do NOT pre-commit)

There are now up to **five** things that can want the screen on a single load. Presenting models with tradeoffs; the roadmap owner picks one.

**The competing surfaces (all real today except welcome/What's-New):**
| Surface | Trigger | Storage | Cited |
|---------|---------|---------|-------|
| Head redirect gates | missing license/terms | localStorage | `index.html:8/12/16` |
| Integrity nudge | SW token mismatch | (none) | `version.js:239` / `shared-chrome.js:149` |
| Security note | activated, 7-day recurring | `securityGuidanceDismissed` | `app.js:1243` |
| iOS install banner | iOS + not standalone, per session | `iosPromptDismissed` (sessionStorage) | `index.html:366` |
| Welcome overlay | first run | `sg.welcomeSeen` (new) | 26-UI-SPEC D-09 |
| What's-New popup | version bump | `sg.lastSeenVersion` (new) | new |

**Option 1 — Strict single-queue coordinator (recommended default).**
One `FirstRun.coordinate()` shows exactly one surface per load, by fixed priority: *integrity nudge (safety) > welcome (first run only) > What's-New (upgraders) > security note > install nudge*. Remaining items defer to a later load.
*Pros:* never stacks; deterministic; testable as a pure priority function (like `resolveIntegrityState`). *Cons:* a genuine upgrader may wait one extra load to see a deferred surface.

**Option 2 — Mutually-exclusive first-run vs return-visit branch.**
If `sg.welcomeSeen` absent → **only** welcome (suppress everything else that load, seed `sg.lastSeenVersion` silently). Else run the normal queue. 
*Pros:* brand-new users get a clean single welcome, zero collision with What's-New. *Cons:* two code paths.

**Option 3 — Layered by surface type (least change).**
Keep passive surfaces (footer integrity nudge, bottom install banner) as non-modal and let only **one modal** (welcome OR What's-New) show at a time.
*Pros:* smallest diff; reuses today's independent surfaces. *Cons:* a modal + a banner + a footer ⚠ can still co-appear — visually busy for a "calm garden" product.

**Non-negotiable regardless of option:** the head redirect gates (`index.html:8/12/16`) always win — they run before body and short-circuit the page; nothing in the coordinator can precede them.

---

## Docs Hard Gate — hook vs CI vs agent DoD (what each can actually see)

The gate must block a **user-facing** change from shipping without (a) a `changelog-data.js` entry for the new `APP_VERSION` and (b) touched help topics. The three enforcement points see **different inputs** — this distinction drives the design.

| Mechanism | Runs when | Inputs it can see | Can enforce | Cannot enforce | Cost |
|-----------|-----------|-------------------|-------------|----------------|------|
| **`pre-commit` hook** (`.git/hooks/pre-commit`, currently empty) | local, per commit | **staged diff paths** (`git diff --cached --name-only`) | "commit touches `*.html`/user-facing `assets/*.js` ⇒ require `changelog-data.js` also staged" | intent ("is this user-facing?"), whether help *content* is meaningful, multi-commit batches | ~instant; bypassable with `--no-verify` |
| **CI step in `deploy.yml`** (new step, none today) | on push to `main`, in Actions | **full push range** (`git diff origin/main…HEAD`), whole tree, `APP_VERSION` value | "if any user-facing path changed since the last deploy AND `APP_VERSION` bumped, `changelog-data.js` must contain that version" | local dev speed (only fires at deploy); still path-heuristic, not semantic | adds ~seconds; not bypassable by devs; **blocks deploy** (deploy.yml pushes to the `deploy` branch, so a failing gate = no release) |
| **GSD agent DoD gate** | at phase/plan completion | phase manifest, changed files, requirement text, human/agent judgment | semantic "does this phase's changelog + help edit actually describe the change?" | anything outside the GSD workflow (a hotfix committed by hand) | process-time; strongest on *meaning*, weakest on *coverage* |

**Recommended layering (defence in depth, not one-of):**
1. **`pre-commit` hook** = fast path-based tripwire. Classify user-facing by path: any root `*.html` except pure-legal, or `assets/*.js` **excluding** an allowlist (`i18n-*.js` copy-only, `*.min.js`, test-only, `changelog-data.js` itself). If tripped and no changelog entry staged → block with a one-line reason. Put the logic in `scripts/docs-gate.sh` so CI reuses it.
2. **CI step in `deploy.yml`** = the non-bypassable backstop (hooks are `--no-verify`-skippable and `.git/hooks` isn't version-controlled). Assert: `APP_VERSION` bumped ⇒ `changelog-data.js` has a matching entry. Fail the job before the `Push to deploy branch` step (`deploy.yml:54`).
3. **GSD DoD gate** = the semantic check the milestone brief actually asks for ("no phase completes without updated changelog + help topics"). This is where "did help *content* get updated" lives, because only the workflow knows a phase's intent.

**Key input reality:** a pre-commit hook fundamentally sees *paths + staged blobs*, not *meaning*. It can reliably answer "did a user-facing file change without a changelog touch?" It cannot answer "is the changelog entry truthful?" — that's the CI-version-match check (mechanical) plus the agent DoD (semantic). Design the gate around what each layer can observe, not around wishful intent-detection in the hook.

---

## Anti-Patterns

### Anti-Pattern 1: Binding tour steps to CSS/text selectors
**What people do:** anchor tour spotlights to `#someId`, `:nth-child`, or button text. **Why it's wrong:** breaks on refactor, on RTL reflow, and on every non-EN locale (text changes). **Do instead:** dedicated `data-tour="…"` attributes (26-UI-SPEC "Anchors"), invisible to styling/i18n/refactor. These do not exist yet — adding them is a real HTML-edit task, not free.

### Anti-Pattern 2: Silent step-skip when an anchor is missing
**What people do:** if `querySelector` returns null, advance the tour. **Why it's wrong:** the user sees the tour "jump," loses the thread, and you can't tell it happened. **Do instead:** centered fallback modal + working "Take me there" link (26-UI-SPEC D-11, Pitfall 6).

### Anti-Pattern 3: Forgetting the SW precache lists
**What people do:** ship `help.js`/`help.html` and test online; it works. **Why it's wrong:** installed PWAs serve from cache-first (`sw.js:274`); an asset absent from `PRECACHE_URLS`/`PRECACHE_HTML` is unavailable offline and can 404 for Add-to-Dock users — the failure class `version.js` was built to kill. **Do instead:** every new shipped file gets a line in `sw.js:33`/`:106` in the same commit.

### Anti-Pattern 4: Treating the footer integrity nudge as the changelog channel
**What people do:** hang "what's new" off the existing footer update-nudge. **Why it's wrong:** that nudge means *your update is broken/incomplete* (`version.js:53` state machine), the opposite of a celebratory release note. **Do instead:** a separate What's-New surface with its own `sg.lastSeenVersion` trigger; let the coordinator order them.

### Anti-Pattern 5: A second i18n mechanism the app doesn't re-render
**What people do:** put changelog copy in bespoke per-object language maps, then forget to re-render on `app:language`. **Why it's wrong:** switching language leaves stale changelog text. **Do instead:** prefer `data-i18n` keys (Option A) so `applyTranslations()` (`app.js:23`) handles it for free; if using object data, wire an explicit `app:language` listener.

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| new surfaces ↔ i18n | `t()` + `app:language` event | `app.js:14`,`:126`; EN-canonical, `t()` auto-falls-back to en (`app.js:16`) |
| "?" entry ↔ chrome | `initCommon()` mount, `#headerActions` | `app.js:648`; mirror `initSettingsLink` idempotency (`app.js:395`) |
| Help nav ↔ nav bar | new `data-nav="help"` in `renderNav()` | `app.js:137-148` |
| tour ↔ pages | `data-tour` anchors + `sessionStorage 'sg.tour'` | anchors are new HTML edits; resume on init |
| popup ↔ version | read `AppVersion.APP_VERSION` | `version.js:25`; hand-set at release |
| all new files ↔ offline | `sw.js` precache arrays | `sw.js:33`,`:106` — manual |
| gate ↔ pipeline | `scripts/docs-gate.sh` shared by hook + CI | `deploy.yml` gains a step before `:54` |

### Surfaces that DON'T get chrome for free (decide coverage)

| Page | Has `#headerActions`? | Calls `initCommon`? | Help entry appears? |
|------|----------------------|--------------------|--------------------|
| index/sessions/reporting/add-*/settings | yes | yes | yes (automatic) |
| `report.html` | yes (`report.html:47`) | **no** (no `app.js`) | **no** — needs explicit wiring |
| legal (`impressum/datenschutz/disclaimer*`) | no | no | no — inline-strings path if wanted |
| `landing.html` / `demo.html` | landing: no chrome; demo: chrome but `window.name==='demo-mode'` guards | demo: yes | demo suppresses many entries by design (`app.js:362`) |

---

## Suggested Build Order (dependency-reasoned)

Ordered so each step's prerequisites already exist. Rationale is the point, not the numbering.

1. **Foundations — i18n key scaffolding + `first-run.js` coordinator + version-seen storage.** Everything else renders copy and competes for first-run screen space; stand up the shared plumbing first. Seed `sg.lastSeenVersion`/`sg.welcomeSeen` semantics here. *(No UI yet; unblocks 2–7.)*
2. **Help center page (`help.html` + `help.js`) + full EN content + "Help" nav entry + "?" header mount.** The help page is the **link target** for deep-links, tour fallbacks ("Take me there"), and the changelog page — build it before anything points at it. *(Depends on 1.)*
3. **Empty-state deep-links.** Pure copy edits pointing existing empty states (`overview.clients.empty`, `overview.js:640`) at help sections. *(Depends on 2 — needs help sections to exist.)*
4. **Welcome overlay (`welcome.js`).** First-run surface; register it with the coordinator from step 1. *(Depends on 1; light dependency on 2 for its "take the tour" CTA.)*
5. **Tour engine (`tour.js`) + `data-tour` anchors.** The most fragile pillar (bespoke engine, cross-page resume, graceful degradation, no template since `demo-hints.js` was deleted). Anchors are HTML edits across 4 pages; the engine consumes them. *(Depends on 1, 2; welcome's CTA launches it.)*
6. **Changelog data (`changelog-data.js`) + changelog page section + What's-New popup.** Popup needs the version-seen storage (1) and a place to render (2); v1.3's own notes are the first entry. *(Depends on 1, 2.)*
7. **PWA install nudge (consolidate the inline iOS banner).** Fold `index.html:366-378` into a per-browser nudge governed by the coordinator so it stops competing uncoordinated. *(Depends on 1.)*
8. **Docs hard gate.** Land it **last within the milestone** so v1.3's own changelog/help edits are already in place (the gate would otherwise block its own sibling commits), then it guards every *future* user-facing change. Layer: `pre-commit` hook + `scripts/docs-gate.sh` → CI step in `deploy.yml` → GSD DoD. *(Depends on 6 for the `changelog-data.js` shape it asserts against.)*

**Ordering invariants:** help page (2) before deep-links (3) and before anything that links into help; version-seen storage (1) before the popup (6); `changelog-data.js` shape (6) before the gate that parses it (8); anchors + engine (5) are a single unit (an engine with no anchors is untestable, anchors with no engine are dead attributes).

---

## Sources

- Live source (HIGH confidence, primary): `assets/app.js` (`initCommon:648`, `renderNav:137`, `initSettingsLink:391`, `t:14`, `setLanguage:116`, `showFirstLaunchSecurityNote:1243`, export surface `:1509`); `assets/version.js` (`APP_VERSION:25`, integrity state machine `:53`, `buildNudge:239`); `assets/shared-chrome.js` (`renderFooter:100`, `maybeUpgradeFooterAndNudge:149`, inline strings `:64-98`); `sw.js` (`CACHE_NAME:26`, `PRECACHE_URLS:33`, `PRECACHE_HTML:106`); `index.html` (head gates `:8/12/16`, chrome hooks `:66-67`, iOS banner `:366`, script order `:347-378`); `report.html:47`; `assets/i18n-en.js` (flat-key shape); `assets/overview.js:640`; `.github/workflows/deploy.yml` (no gate step today); `.git/hooks` (empty); `scripts/` (only `cf-purge-cache.sh`).
- Prior art (HIGH as *design intent*, verified-stale where noted): `.planning/milestones/v1.1-phases/26-in-app-onboarding-overview-help-system/26-UI-SPEC.md` (D-01..D-15, tour step schema, anchor contract, precedence hints). Stale elements confirmed against current source: `demo-hints.js` deleted (PROJECT.md Phase 35), `data-tour` anchors absent (grep = 0), terminology renamed (Phase 37).
- Project context: `.planning/PROJECT.md` (v1.3 scope, constraints, two-audiences, offline/zero-dep rules).

---
*Architecture research for: in-app help/onboarding/changelog integration into an existing vanilla-JS multi-page PWA*
*Researched: 2026-07-07*
