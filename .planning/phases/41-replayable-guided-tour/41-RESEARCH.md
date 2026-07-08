# Phase 41: Replayable Guided Tour - Research

**Researched:** 2026-07-08
**Domain:** Bespoke in-browser guided-tour engine (vanilla PWA) — spotlight/tooltip chrome, graceful anchor degradation, sessionStorage cross-page resume, mid-tour i18n/RTL re-render
**Confidence:** HIGH (all findings verified against live source this session: sketch 003 JS, attention-coordinator.js, app.js, sw.js, tests/, page script order)

<user_constraints>
## User Constraints (from CONTEXT.md)

**The planner MUST honor these. They are locked — research these, not alternatives.**

### Locked Decisions
- **D-01:** Full-spine route, **10 steps** (Ben accepted 10 over the roadmap's "~6–9"): 1) Overview welcome → 2) Add-client button → 3) Start-a-session entry → 4) session form setup zone (client + date + format) → 5) session form the heart (emotions/severity + Heart-Wall) → 6) session form save & after-save (copy MUST also name the export capability + show the colored export icon in the tooltip; sessions list is empty on a fresh app so export is named, not demoed) → 7) Sessions page → 8) Reporting dashboard → 9) Backup (cloud button) → 10) "?" help + finish card.
- **D-02:** Chrome-only anchors — every step targets an always-present element (nav links, buttons, form sections), never data rows. Fallback modal is a rot guard, not the routine first-run experience; a brand-new empty app must show spotlights.
- **D-03:** Copy depth: title + 1–2 calm sentences per step (≤~40 words), garden voice, native-speaker-agent verified (TOUR-01).
- **D-04:** Desktop = tethered tooltip + arrow (Ben picked from live sketch). RTL arrow-flip is a validated sketch behavior — keep it.
- **D-05:** Small screens = bottom-sheet below a width breakpoint; spotlight still highlights the anchor; no tooltip-collision math.
- **D-06:** Auto-navigate on Next — when the next step lives on another page, Next navigates there; sessionStorage resumes (TOUR-03).
- **D-07:** Page inert during the tour — dim overlay blocks all clicks outside the tour chrome.
- **D-08:** Mid-tour close offers concise choice "Remind me later" / "I'll explore myself". Remind-later → next session a small governed card ("Ready to finish the tour?" Start/Dismiss) via the Phase 40 coordinator at LOW precedence (tour still only RUNS on click — TOUR-01 intact). Explore-myself → persistent never-remind flag. Phrasing concise.
- **D-09:** Relaunch always restarts from step 1. sessionStorage resume = cross-page-within-one-run ONLY, never across launches. (Ben rejected offer-to-resume.)
- **D-10:** Finish card in garden voice: "Browse the help center" link + action buttons "Add your first client" / "Start your first session".
- **D-11:** Tour copy ships in ALL 4 locales (EN/HE/DE/CS) THIS phase (~10 texts + finish card + chrome); does NOT wait for Phase 42.1. Hebrew noun/infinitive forms (Phase 24 D-05).
- **D-12:** Welcome CTA rewire — "Take the guided tour" switches from `help.html` to launching the real tour.
- **D-13:** "?" popover gains a "Take the tour" entry in the documented extension slot.
- **D-14:** Chromium-first dev loop, WebKit-gated verification — Playwright-WebKit gate for the TOUR-04 RTL criterion + spotlight/tooltip geometry, plus one real-Safari UAT pass.
- **D-15:** Modern evergreen baseline — no legacy shims or capability-check no-op guard.
- **D-16:** No tour in demo mode (`window.name === 'demo-mode'`) — the "?" tour entry hides in demo.

### Claude's Discretion
- Tour engine module name/shape (Phase 31 extraction pattern: dedicated `assets/<module>.js`, IIFE, no new globals unless needed).
- sessionStorage key names for tour state; persistent flag names for "never remind" (follow `sg.*` conventions).
- The reminder surface's exact precedence slot in `AttentionCoordinator.PRECEDENCE` (low — below security note implied; planner decides exact position + documents it).
- Anchor selection mechanism (data-attributes vs selectors) and the shape of the anchor-presence test (TOUR-02 rot guard).
- Bottom-sheet breakpoint value; spotlight animation details; exact "?" menu position of "Take the tour" (P40 suggested after "Replay welcome"/"Onboarding screen").
- Whether steps 4–6 scroll the form to bring each zone into view, and how the inert overlay interacts with page scroll.

### Deferred Ideas (OUT OF SCOPE)
- **Tour inside demo mode** — deferred (demo iframe navigation quirks + locked controls make it its own scoped effort; D-16).
- **Security-note cadence backoff** — still pending from Phase 40 (`.planning/todos/pending/2026-07-08-security-note-cadence-backoff.md`); the reminder surface added here must NOT tangle with it.
- What's-New popup & changelog (Phase 42); docs-maintenance gate (Phase 43); help-body-content translation beyond tour strings (Phase 42.1); the other ~22 unrelated todo keyword matches.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOUR-01 | Replayable tour, explicit launch only (welcome CTA or "?"), never auto-run; garden-voice copy, native-speaker-agent verified | Launch surfaces verified (welcome CTA target at coordinator ~180; `initHelpEntry` items array at app.js:519); demo-gate seam (`window.name==='demo-mode'`); coordinator reminder OFFERS but does not auto-run (Pattern 4). Copy pipeline = Phase 39 D-19/D-20 shape. |
| TOUR-02 | Every step degrades gracefully — anchor present+visible → spotlight+tooltip; missing/hidden → centered modal with same text + working "Take me there"; never silent skip; anchor-presence test guards rot | Degradation resolution ported from sketch 003 (`offsetParent` check, Pattern 2); **`data-tour` anchors do NOT yet exist in real pages — must be added (Pitfall 1)**; anchor-presence rot-guard test is Wave 0 write-first. |
| TOUR-03 | Tour survives cross-page navigation — steps on another page navigate there and resume (sessionStorage state) | Auto-navigate on Next (D-06); sessionStorage `{tourId,stepIndex}` resume on `initCommon`; engine loads on all 4 pages (script order verified); relaunch-restart semantics D-09 (Pitfall 6). |
| TOUR-04 | Language switch mid-tour re-renders cleanly in new language + direction; RTL mirroring verified in real WebKit, not jsdom alone | `app:language` cleanup-then-replace (Pattern 3, app.js:126); jsdom CANNOT verify geometry/RTL (no layout) → Playwright-WebKit gate (D-14, binaries verified installed); Pitfall 2 + Pitfall 5. |
</phase_requirements>

## Summary

Phase 41 builds the single most technically fragile surface in the milestone: a bespoke ~10-step guided tour with no vendored library (`demo-hints.js` was deleted in Phase 35; Shepherd/Intro are AGPL-rejected). The good news is that the hard problems are already **solved in the reference sketch** (`.planning/sketches/003-tour-fallback/index.html`) — a working prototype with spotlight animation, tethered-tooltip + RTL-flipping arrow, the D-11 break-anchor fallback, and a cleanup-then-replace language re-render. The engineering work is porting those rendering patterns into a production IIFE module (Phase 31 extraction pattern), wiring it to real DOM anchors that **do not yet exist** in the app pages, and integrating with three existing seams: the `app:language` event (TOUR-04), the `AttentionCoordinator` registry (D-08 reminder), and the `initHelpEntry` popover + welcome CTA (launch surfaces).

The verified reality: `data-tour="…"` anchors are **absent** from `index.html`, `add-session.html`, `sessions.html`, `reporting.html` — every one of the 10 chrome anchors must be added to real markup. The tour engine script must be added to all 4 pages' `<script>` blocks (they already load `attention-coordinator.js` then `app.js` in a consistent order) and to `sw.js` PRECACHE_URLS. The project is zero-dependency vanilla JS with a custom Node test runner (`tests/run-all.js`, jsdom v29 the only devDep). Playwright 1.61.1 + WebKit browser binaries **are** installed locally, so the D-14 Playwright-WebKit RTL/geometry gate is feasible as an ad-hoc verification step (Phase 37 precedent) — but it is NOT part of `npm test` and must be documented as a manual gate.

**Primary recommendation:** Port the sketch 003 render loop verbatim into a new `assets/tour.js` IIFE (`window.Tour`), driven by a declarative `STEPS` array of `{id, page, anchor, i18nKey, takeMeThereHref, screenName}`. Add `data-tour` anchors to real markup first (they are the contract), write the anchor-presence rot-guard test BEFORE implementation (project rule), reuse the coordinator/`app:language`/modal-scroll-lock seams rather than rebuilding them, and gate RTL geometry through Playwright-WebKit.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tour rendering (spotlight, tooltip, fallback) | Browser / Client | — | Pure DOM/CSS overlay; no server exists (local-only PWA) |
| Step schema + anchor resolution | Browser / Client | — | `document.querySelector` against live DOM |
| Cross-page resume state | Browser / Client (sessionStorage) | — | `sessionStorage` survives same-tab navigation, clears on tab close (exactly D-09 semantics) |
| Language re-render | Browser / Client (`app:language` event) | — | Existing client-side i18n pipeline; no network |
| Re-entry reminder governance | Browser / Client (`AttentionCoordinator`) | — | Existing registry decides at-most-one surface per session |
| Copy/translation storage | Browser / Client (`i18n-*.js` dicts) | — | Static bundled dicts, 4 locales |
| Offline availability | Browser / Client (`sw.js` precache) | — | New `assets/tour.js` must precache to work offline (HELP-07 precedent) |

**Everything in this phase is client-tier.** There is no backend, no API, no database write. The only "trust boundary" is copy injection — always `textContent`, never `innerHTML` (see Security Domain).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none — vanilla JS) | ES2018+ | Bespoke tour engine | `[CITED: 41-UI-SPEC.md]` PROJECT.md hard constraint: zero npm deps, no build step. Tour ships as `assets/tour.js` IIFE. |
| CSS custom properties (`tokens.css`) | current | All tour surface styling | `[VERIFIED: assets/tokens.css]` Semantic two-tier tokens, `[data-theme="dark"]` auto-resolve. Tour must reference `--color-*`/`--shadow-*` only, never literal hex. |
| CSS logical properties | current | RTL-safe layout | `[VERIFIED: sketch 003 + app-wide convention]` `inset-inline-*`, `padding-inline`, `border-inline-start` flip for free in `[dir=rtl]`. |

### Supporting (test / verification only — not shipped)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsdom | ^29.1.1 | DOM tests via `tests/run-all.js` | `[VERIFIED: package.json]` Behavior tests for step logic, anchor resolution, resume state. Note: jsdom has NO layout engine (`getBoundingClientRect` → 0s), so geometry/RTL-visual assertions CANNOT run here (Phase 37 lesson). |
| Playwright | 1.61.1 (global) | WebKit RTL + geometry gate (D-14) | `[VERIFIED: npx playwright --version + ~/Library/Caches/ms-playwright/webkit-2311]` Ad-hoc verification only — NOT a project devDependency, NOT in `npm test`. Phase 37 precedent (`reference-webkit-chromium-svg-visual-verification`). |
| Node `vm` module | built-in | Load production JS into sandbox | `[VERIFIED: TESTING.md]` Many tests eval real source via `vm` — the tour engine's pure logic (step advance, resume parse) can be tested this way. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bespoke engine | Shepherd.js / Intro.js / driver.js | `[CITED: REQUIREMENTS.md Out of Scope + AF-10]` AGPL-3.0 — incompatible with a closed-source paid product. **Rejected, re-verified 2026-07-07.** Do NOT reintroduce. |
| `data-tour` attribute anchors | `#id` / `:nth-child` / text selectors | `[CITED: 41-UI-SPEC.md]` Dedicated `data-tour` attrs are locale-independent, RTL-stable, refactor-safe. IDs/text break on i18n and DOM churn. |
| sessionStorage resume | localStorage | `[VERIFIED: D-09]` localStorage would leak resume state across launches; D-09 requires relaunch-from-step-1. sessionStorage clears on tab close = exactly right. |

**Installation:** None. `grep -rin "shepherd\|intro.js\|driver.js" assets/` confirms zero tour libraries present — bespoke is the only path.

## Package Legitimacy Audit

> This phase installs **no external packages**. The engine is bespoke vanilla JS; the only devDependency (`jsdom`) is already present and unchanged. Playwright is used ad-hoc from the global install, not added to `package.json`.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | No installs this phase |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
LAUNCH (explicit only — TOUR-01)
  ┌─ Welcome overlay "Take the guided tour" CTA (D-12 rewire from help.html)
  ├─ "?" popover "Take the tour" row (D-13; hidden in demo, D-16)
  └─ Coordinator re-entry reminder card → "Start" (D-08; OFFERS, never auto-runs)
        │
        ▼
   Tour.start()  ──────────────────────────────────────────┐
        │  reads STEPS[], sets stepIndex=0                  │
        ▼                                                   │
   render(step)  ◄────────────────────────────┐            │
        │                                      │            │
        ├─ resolve anchor:                     │            │
        │    document.querySelector(step.anchor)│           │
        │    visible = el && offsetParent!==null│           │
        │        │                    │         │           │
        │   [PRESENT+VISIBLE]    [MISSING/HIDDEN]│          │
        │        ▼                    ▼          │          │
        │  spotlight ring +     centered fallback│          │
        │  tethered tooltip     modal + "Take me │          │
        │  (getBoundingClientRect) there" link   │          │
        │        │                    │          │          │
        ▼        ▼                    ▼          │          │
   [Previous] [Next/Done]      re-measure on ────┘          │
        │        │             scroll+resize                │
        │        ▼                                          │
        │   next step on ANOTHER page?                      │
        │   ├─ same page → stepIndex++, render()            │
        │   └─ other page → sessionStorage{tourId,stepIndex}│
        │                   → location.href (TOUR-03)       │
        │                        │                          │
        │                   page loads → app.js initCommon  │
        │                   → Tour resume(): reads          │
        │                   sessionStorage → render()  ─────┘
        │
   [Close mid-tour] → exit choice (D-08):
        ├─ "Remind me later" → coordinator.register(reminder, low precedence)
        └─ "I'll explore myself" → set persistent sg.* never-remind flag
        │
   [Last step Done] → finish card (D-10): Browse help center +
                      "Add your first client"(accent) / "Start your first session"

CROSS-CUT: document.addEventListener('app:language', …) → cleanup-then-replace
           re-render in new lang + RTL flip (TOUR-04). Subscribed once.
```

### Recommended Project Structure
```
assets/
├── tour.js          # NEW — bespoke engine IIFE (window.Tour). Ported from sketch 003.
├── tour.css         # NEW (or a scoped block appended to help.css) — spotlight,
│                    #   tooltip, arrow, fallback modal, bottom-sheet, finish card.
│                    #   Reuses .help-root local scale; scoped to a tour root class.
├── attention-coordinator.js  # EDIT — register the D-08 reminder surface
├── app.js           # EDIT — initHelpEntry: append "Take the tour" row (demo-gated)
├── i18n-en.js / -he.js / -de.js / -cs.js  # EDIT — ~30 new help.tour.* keys, ALL 4 locales
index.html / add-session.html / sessions.html / reporting.html  # EDIT —
                     #   (a) add data-tour anchors to real chrome
                     #   (b) add <script src="./assets/tour.js"> after app.js
sw.js                # EDIT — PRECACHE_URLS += /assets/tour.js (+ tour.css if separate)
tests/
├── 41-*-anchor-presence.test.js   # NEW — the TOUR-02 rot guard (write FIRST)
├── 41-*-resume-state.test.js      # NEW — sessionStorage parse/relaunch semantics
├── 41-*-i18n-parity.test.js       # NEW — all help.tour.* keys present in 4 locales
└── 41-*-demo-gate.test.js         # NEW — "?" tour row hidden when window.name==='demo-mode'
```

### Pattern 1: Declarative step schema drives everything
**What:** A `STEPS` array where each step is `{ id, page, anchor:'[data-tour="…"]', i18nKey, takeMeThereHref, screenName }`. The render loop is data-driven; adding/reordering steps never touches render logic.
**When to use:** Always — it is the D-01/D-02/TOUR-02 contract.
**Example:**
```javascript
// Source: .planning/sketches/003-tour-fallback/index.html:818-852 (adapt to 10-step full-spine route + `page`)
var STEPS = [
  { id:'overview',   page:'index.html',       anchor:'[data-tour="overview"]',    i18nKey:'help.tour.step.overview',   screenName:'Overview',  takeMeThereHref:'./index.html' },
  { id:'add-client', page:'index.html',       anchor:'[data-tour="add-client"]',  i18nKey:'help.tour.step.addClient',  screenName:'Overview',  takeMeThereHref:'./index.html' },
  { id:'the-heart',  page:'add-session.html', anchor:'[data-tour="heart"]',       i18nKey:'help.tour.step.heart',      screenName:'Session',   takeMeThereHref:'./add-session.html' },
  // …10 total, spanning index / add-session / sessions / reporting
];
```

### Pattern 2: Anchor degradation resolution (the rot guard — TOUR-02)
**What:** `visible = el && el.offsetParent !== null` decides spotlight-vs-fallback. NEVER a silent skip.
**When to use:** Every `render()`.
**Example:**
```javascript
// Source: sketch 003 index.html:919-921, 953-1021
var el = document.querySelector(step.anchor);
var visible = el && el.offsetParent !== null;   // present AND rendered
if (visible) { spotlightAndTooltip(el, step); }
else         { centeredFallbackModal(step); }   // names where it lives + "Take me there"
```
**Caveat (see Pitfall 3):** `offsetParent` is `null` for `position: fixed` elements even when visible. All 10 chrome anchors are nav links / buttons / form sections in normal flow (D-02), so this is safe — but if any anchor is ever a `position: fixed` element, switch that check to a `getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden'` test.

### Pattern 3: Cleanup-then-replace language re-render (TOUR-04)
**What:** On `app:language`, tear down all tour chrome then re-`render()` the current step in the new language/direction. Logical properties flip the arrow/tether automatically.
**Example:**
```javascript
// Source: sketch 003 clearTourChrome() (902-908) + render() (910); app.js:126 dispatch
document.addEventListener('app:language', function () {
  if (!Tour.isActive()) return;
  clearTourChrome();     // remove spotlight/tooltip/fallback nodes
  render();              // re-resolve copy via i18n, re-measure geometry, re-flip arrow
});   // subscribe ONCE (mirror initHelpEntry._listenerInstalled idempotency)
```

### Pattern 4: Coordinator reminder registration (D-08)
**What:** "Remind me later" registers ONE low-precedence surface; it OFFERS to start (Start/Dismiss), never auto-runs the tour.
**Example:**
```javascript
// Source: attention-coordinator.js register() (76-78), run() (90-103), PRECEDENCE (45)
AttentionCoordinator.register({
  id: 'tour-reminder',
  eligible: function () {
    // show only if: user asked to be reminded, hasn't finished, hasn't opted out
    return lsGet('sg.tourRemindLater') === '1'
        && lsGet('sg.tourCompleted') !== '1'
        && lsGet('sg.tourNeverRemind') !== '1';
  },
  show: function () { /* mount "Ready to finish the tour?" card, Start→Tour.start() */ }
});
// Planner: add 'tour-reminder' to PRECEDENCE at LOW precedence (after 'security-note').
// Demo-off + one-per-session gating are inherited from run() — do not re-implement.
```

### Anti-Patterns to Avoid
- **Rebuilding attention arbitration.** The coordinator already does one-per-session + demo-off + precedence. Register into it; do not write a parallel gate.
- **`innerHTML` for step copy.** All tour text is `textContent` — the same XSS trust-boundary rule the coordinator and help-entry already follow (T-39-05, T-40-03).
- **Physical `left:`/`right:` or literal hex.** Breaks RTL and dark mode. Logical props + semantic tokens only.
- **Silent skip on missing anchor.** The whole point of TOUR-02 — a missing anchor MUST render the fallback modal, never advance past it.
- **Offering to resume across launches.** D-09: relaunch always restarts from step 1. sessionStorage resume is cross-page-within-one-run only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Show at most one greeting surface" | A new session-gate for the reminder | `AttentionCoordinator.register()` | `[VERIFIED: attention-coordinator.js]` Already does per-session + demo-off + precedence (D-08 was designed for exactly this Phase-42-style extension). |
| Language-change re-render trigger | A MutationObserver / polling | `document.addEventListener('app:language', …)` | `[VERIFIED: app.js:126]` Established CustomEvent with ~8 existing listeners; fired by `App.setLanguage`. |
| "?" popover menu row | A second popover | `initHelpEntry` items array | `[VERIFIED: app.js:519-527]` Documented extension slot; append one `{labelKey, action}` — no rewrite. |
| Page inert / scroll lock during tour | Custom overlay + scroll math | app.js modal scroll-lock idiom (~1591) | `[CITED: 41-CONTEXT.md]` Reused by every existing modal; consistent behavior. |
| Spotlight/tooltip/arrow/fallback rendering | From scratch | Port sketch 003 `render()` | `[VERIFIED: sketch 003 index.html:910-1022]` Working, token-parity prototype including RTL arrow flip and fallback. |
| Copy verification | Ship draft EN | Phase 39 D-19/D-20 wording pipeline | `[CITED: 41-CONTEXT.md]` writer→factual gate→native-speaker gate→DNA gate (TOUR-01 "native-speaker-agent verified"). |

**Key insight:** ~70% of this phase is integration into surfaces that already exist and were explicitly designed with this phase's extension points in mind (the coordinator's registry, the help-entry items array, the welcome CTA's single rewire target). The genuinely new code is the render engine — and that already exists as a validated sketch. The risk is not "can we build it" but "does it survive RTL + WebKit + cross-page + mid-flight language switch without a silent skip."

## Runtime State Inventory

> This is a greenfield feature (new engine), NOT a rename/migration. No stored data, service config, OS registration, or build artifacts carry a renamed string. New client-side flags are created (not migrated):

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no DB writes; tour creates/deletes/mutates zero records (UI-SPEC "Destructive actions: NONE") | none |
| Live service config | None — local-only PWA, no external services | none |
| OS-registered state | None | none |
| Secrets/env vars | None | none |
| Build artifacts | New `assets/tour.js` must be added to `sw.js` PRECACHE_URLS (offline availability). CACHE_NAME is INTEGRITY_TOKEN-derived (auto-rolls on deploy) — but confirm the precache list edit ships. | Edit sw.js; verify precache test |
| New client flags (created, not migrated) | `sg.tourRemindLater`, `sg.tourNeverRemind`, `sg.tourCompleted` (localStorage); `sg.tourResume` or similar (sessionStorage) — exact names planner's discretion, follow `sg.*` convention | none (fresh keys) |

## Common Pitfalls

### Pitfall 1: `data-tour` anchors don't exist yet
**What goes wrong:** Planner assumes anchors are present (the sketch has them; the real app does not). `grep -rn "data-tour" index.html add-session.html sessions.html reporting.html` returns **zero** matches today.
**Why it happens:** The sketch is a self-contained mock with its own fake screen markup.
**How to avoid:** Task 1 of implementation adds `data-tour="…"` attributes to real chrome elements on all 4 pages. The anchor-presence rot-guard test asserts each of the 10 anchors resolves. Anchors are the contract — add them before wiring the engine.
**Warning signs:** Tour immediately shows the fallback modal on a brand-new empty app (D-02 says a fresh app must show spotlights, not fallbacks).

### Pitfall 2: Mid-tour language switch leaves stale geometry / wrong arrow side (TOUR-04)
**What goes wrong:** Re-rendering text without re-measuring leaves the tooltip mispositioned, or the arrow on the LTR side in RTL.
**Why it happens:** Geometry (`getBoundingClientRect`, `--arrow-x`) is computed once; language switch changes text width AND direction.
**How to avoid:** cleanup-then-replace (Pattern 3) — fully tear down and re-`render()`, re-measuring. Verify EN↔HE(RTL)↔DE↔CS in place. **jsdom cannot catch this** (no layout) — gate in Playwright-WebKit (D-14).
**Warning signs:** Arrow points away from anchor after switching to Hebrew; tooltip overflows viewport.

### Pitfall 3: `offsetParent` visibility check fails for `position: fixed`
**What goes wrong:** A `position: fixed` anchor reports `offsetParent === null` even when fully visible, so it wrongly degrades to the fallback.
**Why it happens:** Per spec, `offsetParent` is null for fixed-position elements.
**How to avoid:** Keep all 10 anchors in normal flow (nav links, buttons, form sections — D-02 already mandates chrome-only anchors). If any anchor must be fixed (e.g. a sticky header "?"), use a `getBoundingClientRect()` + `getComputedStyle` visibility test for that step.
**Warning signs:** A visible header/nav anchor shows the fallback modal.

### Pitfall 4: Spotlight drifts when the form scrolls (steps 4–6)
**What goes wrong:** Steps that scroll the session form into view (D discretion item) move the anchor, but the fixed-position spotlight/tooltip stay put → highlight floats over empty space.
**Why it happens:** `getBoundingClientRect` is viewport-relative and only measured once.
**How to avoid:** Re-measure on `scroll` and `resize` while a step is active (sketch has listeners at index.html:1115-1118). Debounce with `requestAnimationFrame`. Decide (planner) whether the inert overlay allows the underlying page to scroll to bring a form zone into view, or the engine programmatically `scrollIntoView`s the anchor before measuring.
**Warning signs:** Ring lags the anchor during/after scroll.

### Pitfall 5: WebKit-only rendering bugs invisible in Chromium (D-14)
**What goes wrong:** A layout that looks correct in Chromium is broken in Safari — the exact class of bug that bit Phases 37 (viewBox-only SVG = 0×0 in WebKit) and 40 (welcome overlay blowout in shipping Safari).
**Why it happens:** WebKit differs on flex intrinsic sizing, `box-shadow` spread, and logical-property edge cases.
**How to avoid:** Chromium-first dev loop for speed, but the phase gate runs Playwright-WebKit for the RTL criterion + spotlight/tooltip geometry, plus one real-Safari UAT pass (D-14). WebKit browser binaries are installed locally (verified).
**Warning signs:** "Works on my machine" (Chrome) but Ben's Safari shows a broken tooltip.

### Pitfall 6: sessionStorage resume leaks across launches (violates D-09)
**What goes wrong:** Using localStorage, or not clearing resume state on tour end, makes a relaunch resume mid-tour instead of restarting from step 1.
**Why it happens:** Wrong storage tier or missing cleanup on `endTour()`.
**How to avoid:** sessionStorage ONLY (clears on tab close). Clear the resume key on both normal finish and mid-tour close. Relaunch reads no resume state → always step 1 (D-09). Test the parse/clear logic in jsdom.
**Warning signs:** Closing the tab and reopening resumes at step 7.

### Pitfall 7: New `assets/tour.js` not precached → tour breaks offline (HELP-07 regression)
**What goes wrong:** Ship the engine but forget `sw.js` PRECACHE_URLS; installed-PWA users get a broken tour offline.
**Why it happens:** Known repo gotcha — new `assets/*.js` need a PRECACHE_URLS edit. (CACHE_NAME auto-rolls from INTEGRITY_TOKEN so no manual bump, but the URL list edit is mandatory.)
**How to avoid:** Add `/assets/tour.js` (and tour.css if separate) to PRECACHE_URLS. There is a precache-integrity test pattern (`sw-precache-*.test.js`) to extend.
**Warning signs:** Tour 404s in the offline/installed PWA.

### Pitfall 8: Welcome CTA rewire (D-12) forgets to record `sg.welcomeSeen`
**What goes wrong:** The current primary CTA is `<a href="./help.html">`; the overlay's dismiss path records `sg.welcomeSeen`. If the rewire launches the tour without going through the dismiss path, the welcome overlay re-fires next launch.
**Why it happens:** Changing the anchor to a tour-launch button bypasses the overlay's dismiss bookkeeping.
**How to avoid:** The rewired CTA must BOTH dismiss the welcome (record `sg.welcomeSeen` + `sg.whatsNewLastSeenVersion` per the non-replay path) AND call `Tour.start()`. Trace attention-coordinator.js:178-186 dismiss flow.
**Warning signs:** Welcome overlay reappears after taking the tour from it.

### Pitfall 9: Imperative EN copy forces unnatural Hebrew (Pitfall 5 in UI-SPEC / Phase 24 D-05)
**What goes wrong:** Step titles as English imperatives ("Add a client") translate to awkward Hebrew imperatives.
**How to avoid:** Author titles as nouns/gerunds ("Adding a client", "The heart of a session") so Hebrew produces natural noun/infinitive forms. The UI-SPEC draft already follows this — keep it through the TOUR-01 pipeline.

## Code Examples

### Tethered tooltip placement + RTL-safe arrow (port target)
```javascript
// Source: .planning/sketches/003-tour-fallback/index.html:922-952
var r = el.getBoundingClientRect();
var pad = 8;
spotlight.style.insetBlockStart  = (r.top  - pad) + 'px';
spotlight.style.insetInlineStart = (r.left - pad) + 'px';   // logical → RTL-safe
spotlight.style.width  = (r.width  + pad*2) + 'px';
spotlight.style.height = (r.height + pad*2) + 'px';
spotlight.classList.add('show');   // ring via box-shadow: 0 0 0 4px accent, 0 0 0 9999px dim

var below = (window.innerHeight - r.bottom) > 220;
tooltip.setAttribute('data-arrow', below ? 'top' : 'bottom');
var top  = below ? (r.bottom + 14) : (r.top - tooltip.offsetHeight - 14);
var left = Math.max(12, Math.min(r.left + r.width/2 - tooltip.offsetWidth/2,
                                 window.innerWidth - tooltip.offsetWidth - 12));
tooltip.style.insetBlockStart  = top  + 'px';
tooltip.style.insetInlineStart = left + 'px';
tooltip.style.setProperty('--arrow-x',
  Math.max(14, Math.min(r.left + r.width/2 - left - 7, tooltip.offsetWidth - 28)) + 'px');
```

### Spotlight cut-out via giant box-shadow (the inert dim + precise hole)
```css
/* Source: sketch 003 index.html:292-323 */
.tour-spotlight {
  position: fixed;
  border-radius: var(--radius-md);
  pointer-events: none;
  box-shadow: 0 0 0 4px var(--color-primary),          /* accent ring */
              0 0 0 9999px var(--color-modal-overlay-bg); /* inert dim field */
  transition: all 0.32s cubic-bezier(.4,0,.2,1);
}
```

### Fallback modal — names where it lives, never silent (TOUR-02)
```javascript
// Source: sketch 003 index.html:972-994
loc.textContent = t('help.tour.fallbackBody', step.screenName); // "This is on the {screen} screen."
takeMe.textContent = t('help.tour.takeMeThere');
takeMe.onclick = function (e) {
  e.preventDefault();
  location.href = step.takeMeThereHref;  // real navigation to where the anchor lives
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `demo-hints.js` template | Bespoke `assets/tour.js` ported from sketch 003 | Phase 35 (demo-hints deleted) | No template to reuse; sketch is the starting point |
| Vendored tour lib (Shepherd/Intro) | Bespoke vanilla | v1.3 (AF-10, re-verified 2026-07-07) | AGPL incompatible with paid closed-source product |
| Interim welcome CTA → `help.html` | CTA → `Tour.start()` | This phase (D-12) | One-line rewire target already isolated at coordinator ~180 |

**Deprecated/outdated:**
- `demo-hints.js` — deleted Phase 35, do not resurrect.
- Any assumption that a tour anchor can be a `#id` selector — UI-SPEC mandates `data-tour` attributes.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `sg.tour*` flag names and sessionStorage resume key shape are planner's discretion following `sg.*` convention | Runtime State / Pattern 4 | Low — CONTEXT explicitly grants this discretion; only convention matters |
| A2 | `'tour-reminder'` slots into `PRECEDENCE` after `'security-note'` (low precedence) | Pattern 4 | Low-Med — UI-SPEC says "below security note"; exact position is documented planner's discretion; must coordinate with Phase 42's future `whats-new` surface which is registered but higher |
| A3 | Bottom-sheet breakpoint ~600–640px | (UI-SPEC recommendation) | Low — planner's discretion per UI-SPEC; no correct single value |
| A4 | Reusing the app.js modal scroll-lock idiom (~1591) is compatible with a full-page inert overlay + optional form scroll | Don't Hand-Roll | Med — the scroll interaction for steps 4–6 is explicitly planner's discretion (D); verify inert overlay doesn't block the scroll needed to reveal a form zone |
| A5 | Draft EN copy in UI-SPEC is a starting point; final wording passes the TOUR-01 pipeline before ship | Copy | Low — explicitly a draft; Sapir + native-speaker-agent are the gates |

**Note:** No assumed package names, versions, or compliance claims — the phase installs nothing and touches no regulated data.

## Open Questions (RESOLVED)

> All three questions were resolved during planning; each carries an inline **RESOLVED** marker with the plan reference that adopted the answer.

1. **Inert overlay vs. required form scroll (steps 4–6)**
   - What we know: D-07 makes the page inert (blocks clicks); steps 4–6 target session-form zones that may be below the fold.
   - What's unclear: whether the engine programmatically `scrollIntoView`s each zone (with the overlay still blocking clicks) or allows native page scroll under the dim.
   - Recommendation: engine-driven `scrollIntoView` on the anchor before measuring, keeping clicks inert — deterministic and avoids desync (D-07's intent). Planner decides and documents.
   - **RESOLVED:** Engine-driven `scrollIntoView` on the anchor before measuring, with the overlay keeping page clicks inert — adopted in **Plan 41-03 Task 2** (render/next path scrolls each below-the-fold form zone into view for steps 4–6).

2. **`tour-reminder` precedence vs. Phase 42 `whats-new`**
   - What we know: `PRECEDENCE = ['welcome','whats-new','security-note','install-nudge','mobile-hint']`; whats-new has no registered surface until Phase 42.
   - What's unclear: whether the tour reminder should sit below `mobile-hint` (absolute lowest) or just below `security-note`.
   - Recommendation: append at the end (lowest) so no future surface is starved by it; document the choice in the coordinator.
   - **RESOLVED:** `tour-reminder` appended at the LOWEST precedence slot (after `mobile-hint`) so no future Phase-42 `whats-new` surface is starved — adopted in **Plan 41-05 Task 2**, documented in the coordinator.

3. **tour.css: separate file vs. appended `.tour-root` block in help.css**
   - What we know: help.css already redeclares the `.help-root` local scale the tour reuses.
   - What's unclear: a separate `assets/tour.css` (needs its own precache + `<link>` on 4 pages) vs. a scoped block appended to help.css (already loaded where help is).
   - Recommendation: verify help.css loads on all 4 tour pages; if not, a dedicated tour.css is cleaner (one precache entry, explicit). Planner decides.
   - **RESOLVED:** Dedicated `assets/tour.css` — help.css does NOT load on the four tour pages (only tokens.css + app.css do, verified in Plan 06), so a scoped block in help.css would never be present on those pages. Authored in **Plan 41-03** (core surfaces), extended in **Plan 41-04**, with its own `<link>` on all four pages + a PRECACHE_URLS entry in **Plan 41-06**.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Test runner | ✓ | ≥18.0.0 (engines floor) | — |
| jsdom | DOM/logic tests | ✓ | ^29.1.1 (devDep) | — |
| Playwright | D-14 WebKit RTL/geometry gate | ✓ | 1.61.1 (global) | Real-Safari manual UAT (still required regardless) |
| WebKit browser binary | D-14 gate | ✓ | webkit-2311 / webkit-2248 cached | `npx playwright install webkit` if stale |
| Chromium (dev loop) | D-14 Chromium-first iteration | ✓ (via Playwright) | 1.61.1 | Any local Chrome |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Playwright is a **global** tool, not a project devDependency — the WebKit gate is an ad-hoc verification step (Phase 37 precedent), not part of `npm test`. The planner should encode it as an explicit manual/scripted verification task, not assume `npm test` covers RTL geometry (jsdom has no layout engine and cannot).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Custom Node runner — `tests/run-all.js` (spawnSync per `tests/*.test.js`), Node `assert`, jsdom v29 |
| Config file | none — behavior hardcoded in `tests/run-all.js` |
| Quick run command | `node tests/41-<slug>.test.js` (single file) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOUR-01 | Tour runs ONLY on explicit launch; never auto-runs; reminder OFFERS not runs | unit (jsdom) | `node tests/41-launch-explicit.test.js` | ❌ Wave 0 |
| TOUR-01 | "?" tour row present normally, HIDDEN in demo (window.name='demo-mode') | unit (jsdom) | `node tests/41-demo-gate.test.js` | ❌ Wave 0 |
| TOUR-01 | All `help.tour.*` keys present in en/he/de/cs | static parity | `node tests/41-tour-i18n-parity.test.js` | ❌ Wave 0 |
| TOUR-02 | Every step anchor resolves on its page (rot guard) | unit (jsdom) | `node tests/41-anchor-presence.test.js` | ❌ Wave 0 (write FIRST) |
| TOUR-02 | Missing/hidden anchor → fallback modal renders with "Take me there" (never silent skip) | unit (jsdom) | `node tests/41-fallback-degradation.test.js` | ❌ Wave 0 |
| TOUR-03 | Cross-page step persists `{tourId,stepIndex}` to sessionStorage + resumes on load | unit (jsdom/vm) | `node tests/41-resume-state.test.js` | ❌ Wave 0 |
| TOUR-03 | Relaunch always restarts step 1 (no cross-launch resume, D-09) | unit (jsdom) | `node tests/41-resume-state.test.js` (consolidated — see note) | ❌ Wave 0 |
| TOUR-04 | `app:language` re-renders copy in new language (text-level, jsdom) | unit (jsdom) | `node tests/41-lang-rerender.test.js` | ❌ Wave 0 |
| TOUR-04 | RTL mirroring + tooltip/arrow geometry in real WebKit | **manual/scripted (Playwright-WebKit)** | `node tests/webkit/41-rtl-geometry.mjs` (ad-hoc; NOT in npm test) | ❌ Wave 0 |
| (offline) | `/assets/tour.js` in sw.js PRECACHE_URLS | static | `node tests/41-precache.test.js` (extend `sw-precache-*` pattern) | ❌ Wave 0 |

> **Consolidation note (D-09 relaunch-restart):** the planned test set folds the D-09 "relaunch always restarts from step 1" behavior into `tests/41-resume-state.test.js` rather than a separate `tests/41-relaunch-restart.test.js`. That file's contract (Plan 41-03 Task 1) already asserts both the sessionStorage cross-page round-trip AND the absent-key → step-1 relaunch semantics + clear-on-end, so a dedicated relaunch file would be redundant. No `41-relaunch-restart.test.js` is created.

### Sampling Rate
- **Per task commit:** `node tests/41-<touched>.test.js` (the file(s) the task affects)
- **Per wave merge:** `npm test` (full suite, ~146 files must stay green)
- **Phase gate:** Full suite green + Playwright-WebKit RTL/geometry gate + one real-Safari UAT pass before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/41-anchor-presence.test.js` — TOUR-02 rot guard (behavior test BEFORE implementation — project rule)
- [ ] `tests/41-fallback-degradation.test.js` — covers TOUR-02 fallback path
- [ ] `tests/41-resume-state.test.js` — TOUR-03 / D-09 (consolidated: covers BOTH the cross-page sessionStorage round-trip AND the relaunch-from-step-1 + clear-on-end semantics; no separate `41-relaunch-restart.test.js`)
- [ ] `tests/41-lang-rerender.test.js` — TOUR-04 text-level
- [ ] `tests/41-tour-i18n-parity.test.js` — 4-locale key parity (mirror `25-11-i18n-parity` / `33` structure gate)
- [ ] `tests/41-demo-gate.test.js` + `tests/41-launch-explicit.test.js` — TOUR-01
- [ ] `tests/41-precache.test.js` — offline (extend `sw-precache-cache-reload` pattern)
- [ ] Playwright-WebKit RTL/geometry probe script — ad-hoc gate (jsdom cannot measure layout)
- [ ] Data anchors: `data-tour` on all 10 chrome elements across 4 pages (implementation prerequisite, guarded by anchor-presence test)

## Security Domain

> `security_enforcement` is not disabled in config (workflow block has no such key = enabled). This is a client-only, zero-data-mutation feature, so the surface is narrow.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in this phase |
| V3 Session Management | no | sessionStorage tour state is non-sensitive UI progress, not a session token |
| V4 Access Control | no | No protected resources |
| V5 Input Validation / Output Encoding | **yes** | All tour copy injected via `textContent` (never `innerHTML`) — the one trust boundary. i18n values are bundled static dicts, not user input, but the discipline is enforced project-wide (T-39-05, T-40-03). Inline SVG (step-6 export glyph, "?" glyph) is a compile-time literal, no interpolation. |
| V6 Cryptography | no | No crypto; no secrets |

### Known Threat Patterns for {vanilla PWA overlay}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DOM XSS via copy interpolation | Tampering | `textContent` only for all tour strings; no `innerHTML` with variable content (established coordinator/help-entry rule) |
| Clickjacking via inert overlay confusion | Spoofing | Overlay is same-origin app chrome, not an iframe; existing `X-Frame-Options: SAMEORIGIN` unchanged |
| State desync letting a hidden action fire | Tampering | D-07 page-inert overlay blocks all clicks outside tour chrome — tour state cannot desync from underlying page |
| Reminder surface tangling with pending security-note cadence-backoff | (integrity) | D-08 explicitly requires the reminder must NOT tangle with the pending `2026-07-08-security-note-cadence-backoff` todo — keep flags independent |

**No new attack surface:** no network calls, no data persistence beyond non-sensitive UI flags, no eval, no dynamic script loading.

## Sources

### Primary (HIGH confidence — verified against live source this session)
- `.planning/sketches/003-tour-fallback/index.html` — render loop, spotlight/tooltip/arrow, fallback, RTL flip, language cycle (the port source)
- `.planning/sketches/003-tour-fallback/README.md` — variant intent, color discipline, RTL validation notes
- `assets/attention-coordinator.js` — `register`/`run`/`PRECEDENCE`, `sg.*` storage idioms, demo-off gate, welcome CTA target (~178-186)
- `assets/app.js` — `app:language` dispatch (126), `initHelpEntry` items array (476-575), `initCommon` (781)
- `sw.js` — CACHE_NAME (INTEGRITY_TOKEN-derived), PRECACHE_URLS (33-94)
- `index.html`/`add-session.html`/`sessions.html`/`reporting.html` — script order (attention-coordinator → app.js); confirmed **zero** `data-tour` anchors present
- `.planning/codebase/TESTING.md` + `tests/` (146 files) — runner contract, jsdom-no-layout constraint
- `package.json` — zero prod deps, jsdom sole devDep, node ≥18
- `41-UI-SPEC.md` — approved visual/interaction contract (step schema, degradation, color/type/spacing discipline)
- `41-CONTEXT.md` — locked decisions D-01..D-16

### Secondary (MEDIUM confidence)
- Local tool probes: `npx playwright --version` → 1.61.1; `~/Library/Caches/ms-playwright/` → webkit-2248/2311 cached
- `.planning/REQUIREMENTS.md` — TOUR-01..04 contracts, AGPL rejection of Shepherd/Intro

### Tertiary (LOW confidence)
- None — no web sources needed; the phase is fully internal (bespoke, zero external deps).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero-dep bespoke path is a locked project constraint; verified no tour libs present
- Architecture: HIGH — patterns exist in a working sketch + three integration seams verified in live source
- Pitfalls: HIGH — grounded in verified facts (missing anchors, jsdom-no-layout, offsetParent/fixed, WebKit precedents from Phases 37/40, sw precache gotcha)
- Copy/voice: MEDIUM — draft EN exists; final wording depends on the TOUR-01 native-speaker pipeline (out of research scope)

**Research date:** 2026-07-08
**Valid until:** 2026-08-07 (stable internal codebase; re-check if app.js initHelpEntry, attention-coordinator PRECEDENCE, or sw.js precache change before planning)
</content>
</invoke>
