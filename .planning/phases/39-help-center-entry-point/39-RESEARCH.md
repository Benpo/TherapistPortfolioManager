# Phase 39: Help Center & "?" Entry Point - Research

**Researched:** 2026-07-07
**Domain:** Vanilla PWA in-app help system (static offline help page + reusable header popover + anti-rot content substrate) — zero npm runtime deps
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

> Copied from `.planning/phases/39-help-center-entry-point/39-CONTEXT.md`. The planner MUST honor these. The UI-SPEC (`39-UI-SPEC.md`) locks the visual/interaction contract — do not re-derive it.

### Locked Decisions

**Help-page layout (IA):**
- **D-01:** Hybrid A+C layout, validated in `.planning/sketches/002-help-page-ia/hybrid.html` (Ben-approved). Start implementation from that file's behavior. C's collapsed cards + featured personalization card + A's sticky rail menu. Clicking a rail item scrolls to AND expands the matching card.
- **D-02:** Multiple cards stay open — opening a card never auto-collapses another.
- **D-03:** Rail = top-level sections only, UNNUMBERED, grouped "The session loop" / "The technical bits" with a divider. Each rail item has a chevron that expands sub-topics **in-rail** (no jump); clicking a sub-topic expands the owning card and jumps to the topic anchor. Scroll-spy highlights the active section.
- **D-04:** Featured personalization card ("Making Sessions Garden yours") — raised primary-border card with "Start here" tag, open by default at the top.
- **D-05:** Soft type for help surfaces — Rubik 400 headings (`--color-primary-deeper`), muted body ink, roomier cards, botanical watering-can accent. Owner-approved amendment of the 26-UI-SPEC bold-heading rule, help surfaces only; zero new font files.
- **D-06:** Simple search folded in — client-side substring live-filter over card titles/topic headings/body text (~40 lines vanilla JS, offline, zero deps). Filtering hides non-matching cards AND rail items; empty rail groups hide their label + divider. No-match shows a calm "write to us" contact fallback. Fuzzy/typo-tolerant search deferred.
- **D-07:** "Still need help?" closing band — real-person reassurance + `contact@sessionsgarden.app` mailto button + hint to the existing Report-a-problem flow in Settings.
- **D-08:** Mobile treatment — rail hidden on small screens; sticky search box + collapsible "Jump to a section" dropdown pinned at top; cards behave identically to desktop.

**"?" entry point:**
- **D-09:** Popover menu from day one (not direct navigation). Reuse the existing globe language-switcher popover pattern for consistency, RTL safety, dismiss behavior. Build so Phases 40–42 can append entries.
- **D-10:** Day-one menu items: "Help center" (→ `help.html`) + "Contact us" (→ mailto `contact@sessionsgarden.app`).
- **D-11:** Help center always opens at the top — no per-page context-aware landing. Context-targeting reserved for empty-state deep-links only. No page→anchor map to maintain.
- **D-12:** Icon placement/behavior per HELP-01: in `#headerActions` beside cloud + gear, 36×36 visual / 44×44 tap target, inline SVG, `.is-active` mirrors `.settings-gear-btn`, RTL auto-flip.

**Content depth, visuals & audience:**
- **D-13:** Priority-scaled depth — P1 = detailed + stupid-proof (full numbered steps, no assumed knowledge); P2 = detailed but lighter; P3 = nice-to-have, minimal effort.
- **D-14:** SVG glyphs only, NO screenshots — inline SVG for browser-chrome elements + botanical art. Locale-neutral, dark-aware, immune to app-UI drift.
- **D-15:** SCOPE AMENDMENT to HELP-06 — mobile (iOS/Android) is NOT officially supported. Install instructions target computers only: Chrome/Edge (address-bar install icon) + macOS Safari (Add to Dock). Supersedes the original HELP-06 iOS/Android wording.
- **D-16:** One brief expectation-setting mobile topic: designed for computers; opens in a phone browser but data lives per-device (no sync).
- **D-17:** EN content targets a global audience including native US speakers — natural, native-quality English in the calm voice (NOT "simple English for non-natives").

**Content home & wording pipeline:**
- **D-18:** Help copy lives in a dedicated `assets/help-content-en.js` — structured topic objects (id, section, title, body, priority, covers), loaded ONLY by `help.html`. Global i18n files keep only UI-chrome strings. Future translation = add `help-content-de.js` etc.
- **D-19:** Wording pipeline (locked): (1) Writer agent drafts each topic grounded in real source, quoting actual on-screen labels; (2) Gate A factual verifier walks every claim/step against the live app; (3) Gate B native-speaker review; (4) Gate C App-DNA & consistency (Session Format / Heart-Wall / client / session — never patient/treatment); (5) Sapir reviews rendered `help.html` in a browser; (6) Ben arbitrates.
- **D-20:** Agent model tiers — language-facing agents (Gates B and C) run at Sonnet level; Writer + Gate A stay default tier.

**Empty-state coaching:**
- **D-21:** First-run journey trio gets coaching + deep-links, in spine order: Overview no-clients (→ "Adding a client"), Sessions no-sessions-at-all (→ "Starting a session"), Reporting no-data (→ "Reading your dashboard"). Filter-empties stay as-is; snippets/photos empties skipped. Planner note: current `sessions.empty` string is a filter-empty — a true no-sessions-at-all state may need distinguishing.
- **D-22:** Link treatment = keep the calm empty-state sentence + a soft secondary (non-accent) "Show me how" button below → opens `help.html` with the matching card auto-expanded.

**Anti-rot substrate:**
- **D-23:** Live-label interpolation — help text quotes UI labels by key (`{ui:settings.tab.backups}`) rendering the label's CURRENT live value. Quoted labels can never drift.
- **D-24:** Per-topic `covers` metadata — each topic object lists the files/pages it documents (seeds the Phase 43 gate).
- **D-25:** Static integrity test ships this phase (joins `npm test`): every `{ui:key}` token resolves to a real i18n key; every deep-link anchor resolves to an existing topic id. The BLOCKING gate is Phase 43 — Phase 39 ships only the substrate + test.

### Claude's Discretion
- "?" icon order within `#headerActions` and Help's position in `renderNav()` (likely last).
- `.is-active` behavior while the popover is open.
- Exact `help-content-en.js` topic-object schema (fields beyond id/section/title/body/priority/covers).
- Rail/card animation details, scroll-spy thresholds, search debounce (if any).
- Which desktop-Safari install nuances to include (Add to Dock availability by version).
- How the trio's true-empty vs filter-empty detection is implemented.

### Deferred Ideas (OUT OF SCOPE)
- Fuzzy/typo-tolerant help search — substring filter only this phase.
- Context-aware "?" landing (page → topic mapping) — rejected for P39 (D-11).
- HDEP-01 troubleshooting decision tree — v1.4+ candidate.
- Mobile (iOS/Android) install support/instructions — excluded per D-15.
- DE/CS/HE help translation — deferred until EN stabilizes.
- **Not this phase (adjacent phases):** welcome overlay & first-run coordinator (Phase 40), guided tour (Phase 41), changelog page & What's-New popup (Phase 42 — but the help IA must leave room for a changelog section), the blocking docs-maintenance gate (Phase 43 — this phase ships only the machine-checkable substrate).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HELP-01 | Persistent "?" in the header on every app page | Reuse `initLanguagePopover` popover pattern + `initSettingsLink` gear mount; a new `initHelpEntry()` added to `initCommon()` (`assets/app.js:648`). Mounts into `#headerActions`, mirrors `.settings-gear-btn.is-active`. See Code Examples §1. |
| HELP-02 | Standalone `help.html` with nav entry + anchor deep-links | New per-page HTML + `assets/help.js` renderer that builds cards from `help-content-en.js`; nav entry in `renderNav()` (`assets/app.js:137`); `SharedChrome` footer. Deep-link = `openForHash()` from mockup. See Code Examples §2, §4. |
| HELP-03 | Workflow-organized (7-step spine) + personalization led early + tech track | Content structure seeded by Phase 32 inventory's 12 sections; rail grouping ("session loop" / "technical bits") + featured card from the approved mockup. |
| HELP-04 | EN content covering every feature, drafted from real behavior, native-review + Sapir review | Content lives in `help-content-en.js`; Phase 32 inventory (63 topic rows across 12 sections) is the checklist; D-19 pipeline governs quality. See Don't Hand-Roll (content grounding) + Pitfall 4. |
| HELP-05 | Empty-state coaching deep-links (first-run trio) | Overview `#emptyState` (`overview.js:640`), Sessions `#sessionsEmpty` (`sessions.js`), Reporting — add "Show me how" secondary button → `help.html#<topic>`. `sessions.empty` is currently a FILTER-empty — must distinguish true no-sessions. See Pitfall 3. |
| HELP-06 | Per-browser (computer-only per D-15) install instructions, no fake universal button | Content topic in `help-content-en.js` with inline SVG chrome glyphs; branch by environment; Chrome/Edge address-bar icon + macOS Safari Add to Dock only. |
| HELP-07 | Fully offline on installed PWA (precache + static test + real offline nav) | `sw.js` `PRECACHE_URLS` (line 33) gains `help.html` (via `PRECACHE_HTML`, line 106) + `help-content-en.js` + `help.js` + `help.css`; precache uses `{cache:'reload'}`. See Pitfall 1 (precache gotcha) + Pitfall 2 (stale SW). |
</phase_requirements>

## Summary

This is a **zero-new-dependency, codebase-native phase**. Every capability is built by composing patterns that already ship in the repo: the header popover (`initLanguagePopover`), the icon-button mount (`initSettingsLink` / `mountBackupCloudButton`), the per-page HTML + `assets/<page>.js` + `SharedChrome` footer convention, the `data-i18n` / `t()` translation seam, the `sw.js` precache lists, and the `tests/run-all.js` vm/fs static-test harness. There is **no library to install, no build step, no framework** (PROJECT.md hard constraint: static `/assets/*`, zero runtime deps). The one design artifact to implement against already exists and is Ben-approved: `.planning/sketches/002-help-page-ia/hybrid.html` carries the complete rail/card/search/deep-link/scroll-spy JS — the executor ports it, wiring content from `help-content-en.js` instead of hardcoded HTML.

The genuinely novel engineering in this phase is the **anti-rot content substrate** (D-23/24/25): a `{ui:key}` live-label interpolation layer so quoted UI labels can never drift, per-topic `covers` metadata that seeds the Phase 43 gate, and a static integrity test that joins `npm test` to assert every `{ui:key}` resolves and every deep-link anchor points at a real topic id. This test follows the exact vm-sandbox pattern of `tests/33-i18n-de-cs-completion.test.js` and `tests/35-demo-static.test.js`.

The two areas where phases like this silently fail are **offline delivery** (SW precache list edits + stale-SW on installed Safari — both documented repo gotchas) and **content correctness** (the D-19 pipeline exists precisely because a wrong instruction quoting a non-existent label is a blocker, not a typo). Both are addressed below with concrete guards.

**Primary recommendation:** Port the approved mockup's behavior into `help.html` + `assets/help.js`, drive it from a new `assets/help-content-en.js` topic array, add `initHelpEntry()` to `initCommon()` mirroring `initSettingsLink`, wire the three empty-state deep-links, extend `sw.js` precache (with the manual CACHE_NAME chore follow-up), and ship the `{ui:key}` interpolation + integrity test as the anti-rot substrate. Verify offline on a real installed PWA, not just the static test.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| "?" header popover entry | Browser / Client (app chrome) | — | Pure DOM chrome injected by `initCommon()`; no server, no data. Mirrors gear/cloud mounts. |
| `help.html` page + rail/card/search UI | Browser / Client (static page) | — | Standalone static HTML rendered client-side from a JS content array; no network at runtime. |
| Help content (`help-content-en.js`) | Browser / Client (static asset) | Build-time authoring pipeline (agents) | Data lives in a shipped JS file; authored/verified by the D-19 agent pipeline offline. |
| Live-label interpolation `{ui:key}` | Browser / Client (render time) | — | Resolves against `window.I18N[lang]` at render; same seam as `t()`. |
| Empty-state coaching deep-links | Browser / Client (per-page render paths) | — | Adds a button to existing `overview.js` / `sessions.js` / reporting render paths. |
| Offline availability | Service Worker (`sw.js` precache) | CDN/static (CF Pages serves the files) | SW precaches the new page + assets; CF Pages is the origin. |
| Integrity test (`{ui:key}` + anchor resolution) | Build/test tier (`tests/run-all.js`) | — | Node vm/fs static assertion; never runs in the browser. |

**Note:** This phase touches only the client + SW + test tiers. There is no API/backend/database tier involvement — Sessions Garden is local-only (IndexedDB), and Phase 39 creates, deletes, or mutates **no** user data.

## Standard Stack

> This phase installs **no packages**. The "stack" is the existing repo's vanilla substrate. Versions below are the in-repo tool versions verified this session.

### Core (existing, reuse verbatim)
| Asset / Pattern | Location | Purpose | Why Standard |
|-----------------|----------|---------|--------------|
| `initLanguagePopover` popover pattern | `assets/app.js:202` (and `assets/globe-lang.js`) | Open/close, dismiss-on-outside-click, `aria-expanded`, RTL-safe popover | D-09 mandates reuse for the "?" popover [VERIFIED: read app.js/globe-lang.js this session] |
| `initSettingsLink` icon-button mount | `assets/app.js:376` | Inline-SVG header button, idempotent double-mount guard, `.is-active`, i18n label, `app:language` re-translate | The "?" button mirrors this exactly (D-12) [VERIFIED: read app.js:376–465] |
| `renderNav()` | `assets/app.js:137` | Nav bar + `data-nav` active marking | Help nav entry hangs here (HELP-02) [VERIFIED] |
| `t()` / `applyTranslations()` | `assets/app.js:14` / `:23` | i18n resolution with EN fallback; the `{ui:key}` interpolation reuses `t()` | Live-label interpolation (D-23) reads the same `window.I18N` dict [VERIFIED] |
| `SharedChrome` | `assets/shared-chrome.js` | Footer (version line, legal nav, tagline, botanical), nav-context | `help.html` reuses for footer parity [VERIFIED: read] |
| `sw.js` `PRECACHE_URLS` / `PRECACHE_HTML` | `sw.js:33` / `:106` | Offline asset + HTML precache with `{cache:'reload'}` | HELP-07 offline (add `help.html`, `help.js`, `help-content-en.js`, `help.css`) [VERIFIED: read sw.js] |
| `tests/run-all.js` auto-discovery | `tests/run-all.js` | Top-level `tests/*.test.js` runner; `npm test` | D-25 integrity test joins here [VERIFIED: read] |

### Supporting (existing)
| Asset | Location | Purpose | When to Use |
|-------|----------|---------|-------------|
| `assets/tokens.css` semantic tokens | repo | Colors, spacing, shadows, dark-mode | All new CSS references `--color-*` vars only (no hex) — UI-SPEC |
| Rubik faces (400/600/700) | `assets/fonts/Rubik-{Regular,SemiBold,Bold}.woff2` | Soft-type help surfaces (D-05) | Zero new font files; verify real faces load (Pitfall 5) |
| `assets/illustrations/watering-can.png` | repo | Header botanical accent (D-05) | Dark mode via `invert(1)+screen` (Phase 11 pattern) [VERIFIED: file exists] |
| jsdom | devDependency `^29.1.1` | Only if the integrity test needs a DOM; the D-25 test is pure fs/vm (no jsdom needed) | Prefer fs/vm (no jsdom) per the 33/35 static-test models [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline content in `help.html` | `help-content-en.js` topic array (D-18) | Array chosen: enables the integrity test, `covers` metadata, and future per-locale files. Inline HTML would bypass the anti-rot substrate. |
| Substring search | Fuzzy/index (Fuse.js etc.) | Rejected (D-06, deferred): adds a dep + build weight; substring is ~40 lines, offline, zero-dep. |
| Screenshots for install steps | Inline SVG chrome glyphs (D-14) | SVG chosen: locale-neutral, dark-aware, never drifts when the browser UI changes. |

**Installation:** none — no `npm install`. New files are shipped static assets.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.** Sessions Garden is a static, zero-runtime-dependency PWA (PROJECT.md hard constraint); the only `node_modules` entry is `jsdom` (already installed, dev-only, `^29.1.1`), and the D-25 integrity test does not even require it (pure fs/vm per the 33/35 models). No registry lookups, no new dependencies, no slopsquat surface. [VERIFIED: package.json this session — sole devDependency is jsdom ^29.1.1; production ships static /assets/*]

## Architecture Patterns

### System Architecture Diagram

```
                          ┌─────────────────────────────────────────────┐
   Every app page  ──────▶│  initCommon()  (assets/app.js:648)           │
   (DOMContentLoaded)     │   renderNav() ──▶ + Help nav entry (HELP-02) │
                          │   initLanguagePopover()  (reuse pattern)     │
                          │   initSettingsLink()     (mirror for "?")    │
                          │   initHelpEntry()  ◀── NEW (HELP-01/D-09)    │
                          └───────────────┬─────────────────────────────┘
                                          │ injects
                                          ▼
                        #headerActions:  [cloud] [gear] [ ? ]
                                                          │ click
                                                          ▼
                                          ┌───────────────────────────┐
                                          │  "?" popover (addable list)│
                                          │  • Help center → help.html │
                                          │  • Contact us  → mailto     │
                                          │  (P40–42 append here)       │
                                          └───────────────────────────┘

   Empty states (first-run trio, HELP-05/D-21):
   overview #emptyState / sessions true-empty / reporting no-data
        └──▶ "Show me how" button ──▶ help.html#<topic-id>  (deep-link, D-11/D-22)

                        ┌──────────────────────── help.html ────────────────────────┐
   help-content-en.js   │  assets/help.js  render():                                 │
   [ {id, section,      │    • build rail (grouped, unnumbered, scroll-spy)          │
      title, body,      │──▶ • build cards (collapsed; featured card open, top)      │
      priority,         │    • interpolate {ui:key} ──▶ t()/window.I18N (D-23)       │
      covers } ... ]    │    • substring search + no-match "write to us" fallback    │
                        │    • openForHash(location.hash) auto-expand (deep-link)    │
                        │    • SharedChrome footer + contact band                     │
                        └───────────────────────────────────────────────────────────┘
                                          ▲
                                          │ precached (HELP-07)
                        sw.js PRECACHE_URLS + PRECACHE_HTML  {cache:'reload'}

   Build/test tier (npm test ─▶ tests/run-all.js):
        tests/39-help-integrity.test.js (D-25)
          • every {ui:key} in help-content-en.js resolves in window.I18N.en
          • every deep-link anchor (empty-state buttons, "?" popover, rail subs)
            resolves to an existing topic id
```

Trace the primary path: a practitioner clicks "?" → popover → "Help center" → `help.html` renders cards from the content array with live labels interpolated → searches or clicks a rail item → card expands and scrolls. A stuck first-run user instead hits an empty state → "Show me how" → lands deep in the matching topic.

### Recommended Project Structure (new/changed files)
```
help.html                        # NEW — standalone page, per-page pattern (mirror sessions.html head/body)
assets/
├── help.js                      # NEW — renders cards+rail from content array; ports mockup JS
├── help-content-en.js           # NEW — topic objects [{id,section,title,body,priority,covers}] (D-18)
├── help.css                     # NEW (or fold into app.css) — soft-type help surfaces (D-05)
├── app.js                       # EDIT — initHelpEntry(); Help entry in renderNav()
├── overview.js                  # EDIT — "Show me how" on #emptyState (HELP-05)
├── sessions.js                  # EDIT — distinguish true-empty; "Show me how" (HELP-05, Pitfall 3)
├── reporting.js                 # EDIT — "Show me how" on no-data
├── i18n-en.js / -he / -de / -cs # EDIT — new UI-chrome keys (help.entry.*, help.search.*, help.deeplink.*)
└── ... (watering-can.png, tokens.css, Rubik faces — reused, no change)
sw.js                            # EDIT — PRECACHE_URLS + PRECACHE_HTML gain the new files
tests/
└── 39-help-integrity.test.js    # NEW — D-25 substrate test (fs/vm, joins run-all.js)
```

### Pattern 1: Header entry mirrors the gear mount (D-12)
**What:** A new `initHelpEntry()` in `assets/app.js`, called from `initCommon()`, that injects an inline-SVG "?" button into `#headerActions`, opens a popover (globe pattern), and sets `.is-active` like `.settings-gear-btn`.
**When to use:** HELP-01 header affordance on every SW-registered app page.
**Key details from source:** idempotent double-mount guard (`if (actions.querySelector('.help-entry-btn')) return;`), i18n label via `t('help.entry.label')`, re-translate on `app:language` (mirror `initSettingsLink._listenerInstalled`), insertion order is Claude's discretion.

### Pattern 2: Content-array-driven render (D-18)
**What:** `help.js` iterates `window.HELP_CONTENT_EN` and builds DOM (never `innerHTML` with interpolated content — use `textContent` / DOM nodes; the repo consistently avoids injecting dynamic strings via innerHTML, e.g. `overview.js:775` builds empty-state via `textContent`).
**When to use:** All help topic rendering; enables the integrity test and `covers` metadata.

### Pattern 3: `{ui:key}` live-label interpolation (D-23)
**What:** Topic `body` strings contain tokens like `{ui:settings.tab.backups}`; at render, `help.js` replaces each with `t(key)`. A Hebrew-UI user reading EN help sees the actual Hebrew button label.
**When to use:** Every quoted on-screen label in P1/P2 steps.

### Pattern 4: Ported mockup interaction JS
**What:** The approved `hybrid.html` already implements `setOpen`, rail-click-scroll-and-expand, in-rail chevron, `openForHash(location.hash)` deep-link auto-expand, substring `applySearch` (hides cards + rail items + empty group labels + divider + tech band; shows no-match fallback), and an `IntersectionObserver` scroll-spy (`rootMargin: '-10% 0px -70% 0px'`). Port these near-verbatim into `help.js`, changing only the content source. [VERIFIED: read hybrid.html:722–835]

### Anti-Patterns to Avoid
- **Hardcoding help copy in `help.html`** — bypasses the integrity test and `covers` metadata; violates D-18.
- **Sourcing content from `demo.html`/`demo-seed.js`** — these are stale and explicitly NOT a topic source (Phase 32 inventory).
- **A single universal "Install" button** — forbidden (HELP-06/D-15); branch per browser, computer-only.
- **Editing `PRECACHE_URLS` and assuming CACHE_NAME auto-bumps** — the pre-commit hook skips the bump when `sw.js` is in the diff; needs a manual chore (Pitfall 1).
- **Injecting content via `innerHTML`** — use DOM/`textContent`; content is authored data but the repo convention is DOM-building for dynamic text.
- **`right:`/`left:`/`margin-left`/literal hex** — logical properties + tokens only (UI-SPEC).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Popover open/close/dismiss/RTL | A new dropdown | `initLanguagePopover` pattern (`app.js:202`, `globe-lang.js`) | Dismiss-on-outside-click, `aria-expanded`, RTL already solved + tested (D-09) |
| Header icon button | A bespoke button | `initSettingsLink` mount shape (`app.js:376`) | Double-mount guard, `.is-active`, i18n re-translate on `app:language` already handled (D-12) |
| Footer / nav chrome on `help.html` | A new footer | `SharedChrome.renderFooter` | Version line, legal links, botanical, ⚠ marker consistency (HELP-02) |
| Offline delivery | Fetch/cache logic | `sw.js` `PRECACHE_URLS` + `PRECACHE_HTML` + `precacheHtml` | Redirect-safe, `{cache:'reload'}` stale-proofing already built (HELP-07) |
| i18n resolution / fallback | A new lookup | `t()` (`app.js:14`) | EN fallback + `window.I18N`; `{ui:key}` interpolation reuses it (D-23) |
| Search | Fuse.js / an index | `applySearch` from the mockup (~40 lines) | Zero-dep substring is the locked decision (D-06); fuzzy deferred |
| Test harness | A new runner | `tests/run-all.js` fs/vm pattern (see `33-i18n-*`, `35-demo-static`) | Auto-discovers `tests/*.test.js`; exit-0/1 contract (D-25) |
| Content correctness | Guessing app labels | The D-19 pipeline + Phase 32 inventory + `assets/i18n-en.js` as the label source-of-truth | A wrong instruction is a blocker; grounding against real source is the whole point |

**Key insight:** Almost nothing here is new code — it is *composition* of proven, tested repo patterns. The failure mode in this domain is re-implementing a solved chrome pattern slightly differently (breaking RTL/dark/`.is-active` parity) or inventing UI label names that don't exist in `i18n-en.js`.

## Runtime State Inventory

> This phase is **additive/greenfield** for content and chrome — it renames nothing and migrates no stored data. Categories checked explicitly:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 39 creates/mutates no IndexedDB or localStorage records. Help content is a shipped static asset, not user data. | None |
| Live service config | None — no external services; app is local-only. | None |
| OS-registered state | None — no scheduler/daemon/registry entries. (The installed-PWA identity is unchanged.) | None |
| Secrets/env vars | None — no secrets. `contact@sessionsgarden.app` is a public mailto address already in use. | None |
| Build artifacts | The SW cache: adding files to `PRECACHE_URLS`/`PRECACHE_HTML` requires a `CACHE_NAME` bump to ship to installed PWAs. The pre-commit hook skips the bump when `sw.js` is in the diff. | Manual chore commit to bump/refresh CACHE_NAME after the precache edit (Pitfall 1). |

## Common Pitfalls

### Pitfall 1: PRECACHE_URLS edit without a CACHE_NAME bump
**What goes wrong:** New help files are added to `PRECACHE_URLS`/`PRECACHE_HTML` but installed PWAs keep serving the old cache — help is missing offline.
**Why it happens:** `CACHE_NAME` derives from `INTEGRITY_TOKEN` (deploy git short-hash), and the pre-commit hook **skips the auto-bump when `sw.js` is itself in the diff** (documented gotcha, memory `reference-pre-commit-sw-bump.md`). The SW's install/activate only re-fetches when `CACHE_NAME` changes.
**How to avoid:** After editing the precache lists, add the manual chore follow-up so a new `CACHE_NAME` ships. Treat the precache edit as a two-step change (edit + version chore).
**Warning signs:** `help.html` 404s or serves stale content on an installed (Add to Dock) app while a fresh Safari tab is fine.

### Pitfall 2: Stale SW on installed Safari makes "the fix do nothing"
**What goes wrong:** Offline help appears broken after deploy; a hard-refresh doesn't fix it.
**Why it happens:** Installed Safari web apps report the new `CACHE_NAME` via `caches.keys()` but still run old code if the precache used default cache mode; a hard-refresh doesn't bypass the SW. (Incident 2026-06-21, memory `reference-pwa-sw-cache-updates`.)
**How to avoid:** Precache with `fetch(url,{cache:'reload'})` (already the repo pattern — guarded by `tests/sw-precache-cache-reload.test.js`; do not regress it). **Field-verify HELP-07 on a real installed PWA with the network off**, not just the static test. WebKit-only SW bugs (Phase 37) are invisible to Chromium.
**Warning signs:** `caches.keys()` shows the new cache but the page runs old behavior.

### Pitfall 3: `sessions.empty` is a filter-empty, not a true no-sessions state (D-21)
**What goes wrong:** The Sessions "Show me how → Starting a session" coaching fires (or fails to fire) at the wrong time because the only empty string today is `"No sessions match your filters."` (`i18n-en.js:259`), shown whenever `!filtered.length` (`sessions.js:169`).
**Why it happens:** There is no distinction between "you have zero sessions ever" and "your current filter matches nothing." The Overview `#emptyState` (`overview.js:640`) is a true no-clients state; Sessions is not.
**How to avoid:** Introduce a true-empty detection (e.g. total session count === 0 vs filtered length === 0) and show coaching only on true-empty; keep the filter-empty message as-is (D-21). Detection approach is Claude's discretion (D-21 note).
**Warning signs:** Coaching button appears when a therapist has sessions but a filter hides them.

### Pitfall 4: Invented UI labels / drifted terminology in help copy
**What goes wrong:** A P1 step tells the user to click a button that doesn't exist, or uses "patient/treatment" instead of "client/session".
**Why it happens:** Writing from memory instead of the live app; the app's real labels live in `assets/i18n-en.js` and section labels can be user-customized.
**How to avoid:** D-19 pipeline is mandatory — quote every label via `{ui:key}` interpolation (D-23) so the text renders the *current* label; Gate A verifies every claim against source; Gate C enforces Session Format / Heart-Wall / client / session. The integrity test (D-25) catches `{ui:key}` tokens that don't resolve, but NOT prose that names a label without interpolating it — Gate A/C are the human/agent backstop.
**Warning signs:** A quoted button name appears as literal prose instead of a `{ui:key}` token.

### Pitfall 5: Sketch theme silently falls back to system fonts
**What goes wrong:** The rendered help page looks right in the mockup but ships with system-ui instead of Rubik; the D-05 soft type never actually loads.
**Why it happens:** The mockup exposed that a sketch theme can fall back to system fonts without erroring (CONTEXT §specifics).
**How to avoid:** Verify type against the real `assets/fonts/Rubik-{Regular,SemiBold,Bold}.woff2` faces (all present [VERIFIED]), `font-display: swap`. Confirm the 400/600/700 soft-type weight set renders from the woff2 files, not the fallback.
**Warning signs:** Headings render in a slightly different metric than the rest of the app.

### Pitfall 6: RTL/dark regressions on the new surfaces
**What goes wrong:** The "?" popover or help cards break in Hebrew RTL or dark mode (a recurring class of bug in this repo — Phases 37/38 memories).
**Why it happens:** Physical CSS (`right:`/`left:`) or literal hex instead of logical properties + tokens; WebKit-only rendering differences invisible to Chromium.
**How to avoid:** Logical properties only, `[data-theme="dark"]` token reads, no hex (UI-SPEC). For anything visually load-bearing (popover position, chevron rotation, botanical invert), verify in real WebKit, not jsdom (memory `reference-webkit-chromium-svg-visual-verification`).
**Warning signs:** Chevron points the wrong way in RTL; botanical accent is a dark blob in dark mode.

## Code Examples

Patterns verified from real repo source this session (no external URLs — vanilla repo code).

### §1 Header "?" entry — mirror the gear mount
```javascript
// Model: assets/app.js:376 initSettingsLink() + :202 initLanguagePopover()
// Add to initCommon() (app.js:648), after initSettingsLink().
function initHelpEntry() {
  var actions = document.getElementById('headerActions') || document.querySelector('.header-actions');
  if (!actions) return;
  if (actions.querySelector('.help-entry-btn')) return;   // idempotent double-mount guard
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'header-control-btn help-entry-btn';
  btn.setAttribute('aria-label', (typeof t === 'function' ? t('help.entry.label') : '') || 'Help');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" ...inline "?" glyph... ></svg>';
  // popover: reuse the initLanguagePopover open/close + outside-click + Esc pattern.
  // Day-one items (D-10), built as an addable list so P40–42 can append:
  //   [ { labelKey:'help.entry.center',  href:'./help.html' },
  //     { labelKey:'help.entry.contact', href:'mailto:contact@sessionsgarden.app' } ]
  // .is-active mirrors .settings-gear-btn (D-12); re-translate on 'app:language'
  // via an install-once flag like initSettingsLink._listenerInstalled.
  actions.appendChild(btn);
}
```

### §2 Help nav entry
```javascript
// assets/app.js:137 renderNav() — append (Help likely last, Claude's discretion):
//   <a href="./help.html" data-nav="help" data-i18n="nav.help">Help</a>
// help.html <body data-nav="help"> gets the active marking for free.
```

### §3 `{ui:key}` live-label interpolation (D-23)
```javascript
// In help.js render, before inserting a topic body:
function interpolateUiLabels(text) {
  return text.replace(/\{ui:([^}]+)\}/g, function (_, key) {
    return t(key.trim());   // reuses app.js:14 t() → window.I18N[lang], EN fallback
  });
}
// The D-25 test asserts every {ui:key} token resolves in window.I18N.en (no silent miss).
```

### §4 Deep-link auto-expand (ported from the approved mockup)
```javascript
// Verbatim shape from hybrid.html:747 — open the owning card, then scroll.
function openForHash(hash) {
  if (!hash) return;
  var target = document.querySelector(hash);
  if (!target) return;
  var card = target.closest('.help-card');
  if (card) setOpen(card, true);
}
openForHash(location.hash);                        // empty-state deep-link arrival (D-11/D-22)
if (location.hash) {
  var el = document.querySelector(location.hash);
  if (el) setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 50);
}
```

### §5 D-25 integrity test skeleton (fs/vm — model: tests/33-i18n-de-cs-completion.test.js)
```javascript
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sandbox = { window: { I18N: {}, QUOTES: {} }, console: { log(){}, warn(){}, error(){} } };
vm.createContext(sandbox);
// load i18n-en.js + help-content-en.js into the sandbox
for (const f of ['i18n-en.js', 'help-content-en.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','assets',f),'utf8'), sandbox);
}
const en = sandbox.window.I18N.en;
const topics = sandbox.window.HELP_CONTENT_EN;            // exact global name = Claude's discretion
const ids = new Set(topics.map(t => t.id));
// 1) every {ui:key} in every topic body resolves in en
// 2) every deep-link anchor (empty-state buttons, "?" popover items, rail subs) ∈ ids
// exit 0 on full pass, 1 on any failure (run-all.js contract)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| iOS Safari / Android install instructions (original HELP-06) | Computer-only: Chrome/Edge address-bar icon + macOS Safari Add to Dock (D-15) | This phase (2026-07-07) | Drop the mobile install legs; add one expectation-setting mobile topic (D-16) |
| P26 "exactly two font weights (400/700)" | Soft-type 3-weight set (400/600/700) on help surfaces only (D-05) | This phase | Accepted checker exception documented in 39-UI-SPEC — do not spin the 2-weight loop |
| Help copy target "simple English for non-natives" | Native-quality EN for a global audience incl. US natives (D-17) | This phase (Ben corrected) | Gate B/C calibrate to native voice |

**Deprecated/outdated for this phase:**
- `demo.html` / `demo-seed.js` / `demo-hints.js` — stale, NOT a content source (Phase 32 inventory).
- The A/B/C variants in `.planning/sketches/002-help-page-ia/index.html` — superseded by `hybrid.html` (D-01).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The pre-commit hook still skips the CACHE_NAME bump when `sw.js` is in the diff (from memory `reference-pre-commit-sw-bump.md`; the hook file read returned empty this session). | Pitfall 1 | If the hook now handles it, the manual chore is harmless-redundant; if it doesn't and we skip it, offline help won't ship to installed PWAs. Low risk — the manual chore is safe either way. |
| A2 | `security_enforcement` is absent from config.json → treated as enabled; but this phase mutates no data, so the Security Domain is minimal. | Security Domain | Low — no auth/crypto/data surface introduced. |
| A3 | The Phase 32 inventory's 63 topic rows across 12 sections remain the authoritative HELP-04 checklist plus the named post-inventory delta. | HELP-04 support | If the inventory is stale vs current features, some topics missing — mitigated by Gate A walking the live app. |

**Note:** The core design is fully locked upstream (CONTEXT + UI-SPEC + approved mockup), so assumptions are few and low-risk.

## Open Questions (RESOLVED)

> All three questions were resolved at planning time — each recommendation below was adopted by the Phase 39 plans (verified by gsd-plan-checker).

1. **True-empty vs filter-empty detection on Sessions (D-21 note)** — RESOLVED
   - What we know: `sessions.js` shows one empty string (`sessions.empty`, a filter-empty) when `!filtered.length`.
   - What's unclear: cleanest signal for "zero sessions ever" — total count from the DB layer vs a pre-filter length check.
   - Recommendation: Planner picks (Claude's discretion, D-21); simplest is comparing unfiltered session count to 0 before the filter runs. Reporting's no-data state needs the same treatment (its only empty strings today are `report.empty.*` for the crash-report page, not the reporting dashboard — confirm the reporting.html dashboard empty path).
   - RESOLVED: Plan 39-05 compares the unfiltered session count to 0 before filters run; coaching fires only on true zero-sessions (filter-empty asserted as a negative in its test). The reporting dashboard empty path gets the same treatment.

2. **Exact `help-content-en.js` topic-object schema and global name** — RESOLVED
   - What we know: minimum fields are id/section/title/body/priority/covers (D-18/D-24); global name is Claude's discretion.
   - What's unclear: whether `body` is a single string with `{ui:key}` + a light markup convention, or an array of blocks (steps/notes/SVG-glyph refs).
   - Recommendation: Choose a block-capable `body` (array of typed nodes) so P1 numbered steps, install-SVG glyphs, and prose coexist without an HTML-in-string smell; keep it flat enough for the integrity test to scan `{ui:key}` tokens and anchor refs.
   - RESOLVED: Plan 39-01 defines a block-capable `body` (array of typed nodes) under the global `window.HELP_CONTENT_EN`, plus the `HELP_DEEPLINKS` topic-id registry; the D-25 integrity test scans `{ui:key}` tokens and anchor refs across it.

3. **Where help CSS lives** — RESOLVED
   - What we know: soft-type help surfaces (D-05) need their own rules.
   - What's unclear: new `assets/help.css` vs a scoped block appended to `app.css`.
   - Recommendation: A dedicated `assets/help.css` (added to precache) keeps the soft-type amendment isolated to help surfaces and avoids leaking the 3-weight exception into the rest of the app.
   - RESOLVED: Plan 39-04 ships a dedicated `assets/help.css` (soft-type D-05 exception isolated to help surfaces); Plan 39-06 adds it to the `sw.js` precache.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (test runner) | `npm test` / D-25 integrity test | ✓ (repo runs `node tests/run-all.js`) | repo-local | — |
| jsdom | Only if a DOM test is needed (D-25 uses fs/vm, doesn't need it) | ✓ | `^29.1.1` | Pure fs/vm test (no jsdom) |
| A real browser (Chrome + Safari) | HELP-07 real offline verification; RTL/dark visual checks | ✓ (dev machine, macOS) | — | Headless-Chrome screenshot harness (memory `reference-headless-chrome-ui-verification`), but Safari-only offline/WebKit checks still need real Safari |
| Rubik woff2 faces (400/600/700) | D-05 soft type | ✓ | in-repo | none needed |
| `watering-can.png` | D-05 header accent | ✓ | in-repo | none needed |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none blocking — all present.

## Validation Architecture

> `workflow.nyquist_validation: true` [VERIFIED: .planning/config.json] — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Zero-dep Node runner — `tests/run-all.js` (auto-discovers `tests/*.test.js`, fs/vm/jsdom, exit-0/1 per file) |
| Config file | none — convention-based discovery; `package.json` `"test": "node tests/run-all.js"` |
| Quick run command | `node tests/39-help-integrity.test.js` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HELP-07 | `sw.js` precache includes `help.html`, `help.js`, `help-content-en.js`, `help.css`; still uses `{cache:'reload'}` | static/shape | `node tests/39-help-integrity.test.js` (add precache assertions) or extend `tests/sw-precache-cache-reload.test.js` | ❌ Wave 0 |
| D-25 / HELP-04 | Every `{ui:key}` token in `help-content-en.js` resolves in `window.I18N.en` | static (fs/vm) | `node tests/39-help-integrity.test.js` | ❌ Wave 0 |
| D-25 / HELP-05 | Every deep-link anchor (empty-state buttons, "?" popover items, rail subs) resolves to a real topic id | static (fs/vm) | `node tests/39-help-integrity.test.js` | ❌ Wave 0 |
| HELP-03/04 | Every Phase 32 inventory section has ≥1 topic; personalization card led; tech track present | static (fs/vm, optional coverage assert) | `node tests/39-help-integrity.test.js` | ❌ Wave 0 |
| HELP-01 | "?" mounts into `#headerActions`, idempotent, `.is-active` parity | source/shape or jsdom | (optional) `node tests/39-help-entry.test.js` | ❌ Wave 0 |
| HELP-07 | **Real** offline navigation on installed PWA | manual-only (WebKit/installed-app) | manual — network off, relaunch installed app, open Help | n/a (manual, Pitfall 2) |

### Sampling Rate
- **Per task commit:** `node tests/39-help-integrity.test.js`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + manual real-offline verification on an installed PWA before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `tests/39-help-integrity.test.js` — `{ui:key}` resolution + deep-link-anchor resolution + (optional) inventory-section coverage (D-25, HELP-04/05)
- [ ] SW precache assertion — extend that test (or `sw-precache-cache-reload.test.js`) to require the new help files in `PRECACHE_URLS`/`PRECACHE_HTML` (HELP-07)
- [ ] (Optional) `tests/39-help-entry.test.js` — "?" mount idempotency / `.is-active` parity
- No framework install needed — `tests/run-all.js` + jsdom already present.

## Security Domain

> `security_enforcement` absent from config → treated as enabled. This phase introduces **no** auth, crypto, network, or data-mutation surface, so applicability is minimal. Recorded for completeness.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase creates no auth surface |
| V3 Session Management | no | No sessions/tokens |
| V4 Access Control | no | Local-only static content |
| V5 Input Validation / Output Encoding | yes (narrow) | Render help content and search input via DOM/`textContent`, never `innerHTML` with interpolated strings; `{ui:key}` interpolation resolves only to i18n dict values (no user input). Search box is client-side filter only. |
| V6 Cryptography | no | No crypto introduced |
| V14 Config / SW | yes (narrow) | SW precache changes must preserve `{cache:'reload'}` (stale-code guard `tests/sw-precache-cache-reload.test.js`); no new fetch origins |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DOM XSS via help body / search echo | Tampering | Build DOM with `textContent`; the no-match state echoes the search term — set it via `textContent` (as the mockup does, `hybrid.html`), never `innerHTML` |
| Stale/poisoned SW cache serving old code | Tampering | `{cache:'reload'}` precache + CACHE_NAME bump (Pitfall 1/2) |
| Inline SVG glyphs | Tampering | Compile-time literal SVG only (no user-interpolated SVG), same convention as the gear/globe icons |

## Sources

### Primary (HIGH confidence — read this session)
- `assets/app.js` — `t()` (:14), `applyTranslations` (:23), `renderNav` (:137), `initLanguagePopover` (:202), `initSettingsLink` (:376), `mountBackupCloudButton` (:490), `initCommon` (:648) [VERIFIED]
- `assets/globe-lang.js` — popover open/close/outside-click/RTL pattern [VERIFIED]
- `assets/shared-chrome.js` — footer/nav-context public surface [VERIFIED]
- `sw.js` — `PRECACHE_URLS` (:33), `PRECACHE_HTML` (:106), `precacheHtml` redirect-safe + `{cache:'reload'}` [VERIFIED]
- `tests/run-all.js`, `tests/33-i18n-de-cs-completion.test.js`, `tests/35-demo-static.test.js`, `tests/sw-precache-cache-reload.test.js` — static-test models [VERIFIED]
- `assets/overview.js` (:640 empty state), `assets/sessions.js` (:169 filter-empty), `assets/i18n-en.js` (:259 `sessions.empty`) [VERIFIED]
- `.planning/sketches/002-help-page-ia/hybrid.html` — approved mockup, ported JS (:722–835) [VERIFIED]
- `.planning/phases/39-help-center-entry-point/39-CONTEXT.md` + `39-UI-SPEC.md` — locked decisions [CITED]
- `.planning/milestones/v1.2-phases/32-readme-code-comments/32-HELP-CONTENT-INVENTORY.md` — 63 topic rows / 12 sections [VERIFIED: counted]
- `package.json` — sole devDependency jsdom `^29.1.1`; `"test": "node tests/run-all.js"` [VERIFIED]

### Secondary (MEDIUM confidence — project memory)
- `reference-pre-commit-sw-bump.md`, `reference-pwa-sw-cache-updates.md`, `reference-sw-version-update-delivery.md` — SW/precache gotchas
- `reference-webkit-chromium-svg-visual-verification.md`, `reference-headless-chrome-ui-verification.md`, `reference-rtl-*` — WebKit/RTL verification
- `feedback-ui-checker-greenfield-false-positives.md` — the D-05 3-weight accepted exception

### Tertiary (LOW confidence)
- Pre-commit hook current behavior (A1) — inferred from memory; hook file read returned empty this session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every pattern read in live source this session; zero external deps.
- Architecture: HIGH — approved mockup + UI-SPEC lock the design; render/deep-link JS already exists.
- Pitfalls: HIGH — SW/precache/empty-state pitfalls confirmed in source + corroborated by project memory.
- Content pipeline: MEDIUM — D-19 process is locked but content quality depends on agent execution.

**Research date:** 2026-07-07
**Valid until:** ~2026-08-06 (stable — vanilla repo patterns; re-check only if `sw.js`/`initCommon` chrome or the pre-commit hook changes).
</content>
</invoke>
