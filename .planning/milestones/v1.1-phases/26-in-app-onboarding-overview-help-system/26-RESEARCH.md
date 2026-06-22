# Phase 26: In-App Onboarding & Overview / Help System - Research

**Researched:** 2026-05-16
**Domain:** In-app help/onboarding UX + lightweight guided-tour engineering for a vanilla multi-page RTL PWA
**Confidence:** HIGH (codebase + library facts verified by tool); MEDIUM (benchmark-app patterns — public marketing/support material, no internal access)

> **Scope reminder:** This phase ships **NO production code**. Every recommendation below is framed
> as input to a `UI-SPEC.md` design contract + a clickable HTML mockup + an EN content outline.
> "Build it" recommendations are explicitly deferred to the follow-up implementation phase.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Hybrid, page-anchored. A persistent **Help page in main nav** is the single source of truth + a **replayable interactive overlay tour** (own engine, modeled on `demo-hints.js` patterns) launchable any time — not a one-time first-run event.
- **D-02:** Entry point = persistent **"?" affordance in `#headerActions`** next to cloud/settings icons, globally reachable. Bottom-corner floating button is an acceptable UI-SPEC alternative within "globally reachable, always available."
- **D-03:** **Workflow-first content model.** Spine = add client → start session → capture emotions (quick-paste) → Heart Shield workflow → severity (before/after, reversal) → finish, review & export → back to overview. Features taught where used. Secondary technical-tips track alongside.
- **D-04:** **Comprehensive coverage, not confusion-triage.** Lead with **customizable session sections** (flagship "make it yours" personalization). Feature prominently: **per-session export** (send to client / file in own records), emotions quick-paste, multi-issue + read mode, plus clients/sessions/Heart Shield/severity/search.
- **D-05:** Technical track = **Backups & restore + PDF export** (also satisfies Phase 25 D-26).
- **D-06:** PWA-install / user-manual TODO **folded FULLY**: per-browser install / Add-to-Home-Screen, "data never leaves your browser" offline explainer, 2-device activation limit, deactivate/transfer, troubleshooting (cleared cache, lost data, re-activation). Designed + content-outlined here; built in follow-up phase.
- **D-07:** New trial user is the organizing principle; returning user served by tour replay + persistent Help page.
- **D-08:** **Design contract + mockup ONLY.** `RESEARCH.md` + `UI-SPEC.md` + clickable HTML mockup (Help page + welcome + tour) + EN content outline. No production code.
- **D-09:** **Full-screen branded welcome** on first launch after activation: warm greeting, 1–2 sentences on what Sessions Garden does, two CTAs — "Take the guided tour" / "I'll explore myself." Re-openable from "?".
- **D-10:** **Extend the existing garden/botanical design system** (`tokens.css`, botanical illustrations, landing visual identity); dark-mode aware; RTL-safe. Must feel like the same product, not a bolted-on skin.
- **D-11:** **Hybrid + graceful degradation.** Tour bound to stable `data-tour` anchors but EVERY step ALSO works as plain text + "take me there" link if anchor missing/layout shifts. Hard UI-SPEC constraint — the single most fragile element across 4 languages + RTL + multi-page nav.
- **D-12:** **Claude drafts EN canonical content + workflow narrative from actual app behavior; Sapir reviews/corrects for clinical accuracy + tone.** DE/CS/HE later (separate phase).
- **D-13:** **Leave the marketing demo alone** (`demo.html` / `demo-hints.js` / `landing.html:228` iframe untouched). In-app help is an independent system that may borrow `demo-hints.js` *rendering patterns* only — no shared content contract.
- **D-14:** Benchmark **therapy practice-management apps** (SimplePractice, Jane, Carepatron) for domain fit + **calm/wellness apps** (Calm, Insight Timer, journaling) for warm tone. Generic SaaS (Notion/Linear) and offline-first PWAs are explicitly NOT the tone/pattern benchmark.
- **D-15:** Welcome fires once on first launch post-activation, gated by `localStorage` flag (`sg.welcomeSeen`). "Explore myself" OR tour completion sets the flag. Existing upgraders see it once (flag absent ⇒ first-run). Re-open only via "?".

### Claude's Discretion

- Exact placement of "?" entry point (header actions vs. bottom-corner floating) — UI-SPEC picks within "globally reachable, always available."
- Help page route / filename and how it slots into the existing multi-page nav (`renderNav`).
- Exact visual treatment of the full-screen welcome overlay within the garden design system.
- Granularity of the workflow-spine sub-steps in the mockup.
- Mockup fidelity (static clickable vs. lightly interactive) — enough to validate the design, no production wiring.

### Deferred Ideas (OUT OF SCOPE)

- Production implementation of the help system → follow-up phase (build Help page, welcome, tour engine, "?" entry point).
- HE/DE/CS translation of help content → after EN stabilizes.
- Unifying marketing demo with in-app help (shared engine/content) → rejected for now (D-13).
- Per-screen "?" panels as a distinct distributed help system → not chosen (deep-links into the single Help page are acceptable; a separate per-screen system is not built).
- Promoting / ungating `demo-hints.js` for the marketing demo → out of scope.
- Marketing-site copy / landing-page redesign → ROADMAP out of scope.
- Video walkthroughs / external docs site → ROADMAP out of scope.
</user_constraints>

## Summary

The decisions are already locked: a **persistent Help page (nav-anchored, the single source of truth)** plus a **replayable interactive overlay tour** reachable from a global "?" affordance, all expressed in the existing garden design system, RTL-safe, i18n-keyed EN-first, no production code this phase. The research job is therefore *how*, not *whether* — and the highest-leverage findings are about the **tour engine** (the single most fragile element) and the **content architecture** (workflow-spine vs. feature catalog).

Three findings change the design contract concretely. **(1) Tour library licensing is decisive:** Shepherd.js and Intro.js are **AGPL-3.0** — legally hostile to a closed-source commercial product sold for EUR 119 [VERIFIED: npm view]. **Driver.js v1.4.0 is MIT, zero dependencies, ships a drop-in `.iife.js` (21KB raw / 6.3KB gzip JS + 4KB / 1.1KB gzip CSS — well under the 30KB constraint)** [VERIFIED: npm pack + gzip measurement]. Its `element` step property is **optional** (a step with no element renders as a centered modal), and `onNextClick`/`onPrevClick` hooks let a step navigate to another page mid-tour — these two facts are exactly the primitives D-11's graceful-degradation pattern needs. **(2) But Driver.js's default CSS is NOT RTL-safe and NOT dark-mode-aware** — it uses physical properties (`right:0`, `text-align:right`, `margin-left`) and hardcoded `#fff`/`#2d2d2d` [VERIFIED: inspected `dist/driver.css`]. Any choice (vendor Driver.js OR bespoke-on-demo-hints) requires a **custom token-mapped, logical-property CSS layer** authored by this project; that work is identical either way, which tilts the recommendation. **(3) The benchmark apps validate the workflow-first model:** SimplePractice's own help center is explicitly task/workflow-organized ("schedule an appointment with a sample client → send intake → the 3 things to set up"), not a feature list; Calm uses a non-forced, self-paced on-dashboard "Get Started" checklist that "respects autonomy" — the exact tone target for non-technical solo therapists [CITED: support.simplepractice.com; chameleon.io/uisources].

**Primary recommendation:** Specify the tour as a **bespoke engine built on `demo-hints.js` rendering patterns** (not vendored Driver.js), because (a) the RTL/dark-mode/token CSS layer must be hand-authored regardless, (b) the project's hard constraint is zero npm dependencies + vanilla, (c) `demo-hints.js` already solves the RTL inset-logical positioning + `app:language` re-render + dark-mode `[data-theme]` selector this project needs, and (d) the tour is only ~6–9 steps across the workflow spine — the surface area Driver.js's 21KB buys is mostly unused. Use Driver.js's *API shape* (optional `element` ⇒ modal step; `onNextClick` ⇒ cross-page navigation; lifecycle hooks; "refresh on resize") as the **design vocabulary** for the UI-SPEC's tour-step schema. Frame the Help page as the canonical surface and the tour as a thin replayable layer over it.

## Architectural Responsibility Map

> This phase produces a *design*, but the design must respect where each capability lives in the
> existing vanilla multi-page app. "Tier" here = which existing layer owns the behavior the design specs.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Help page (canonical content) | New standalone HTML page (per-page pattern) | `assets/help.js` module + i18n keys | Matches `STRUCTURE.md` "New Page/Route" recipe; one HTML + one JS module + nav link |
| "?" entry point | `#headerActions` (chrome, in `app.js`) | `renderNav()` Help link | D-02 + Phase 25 D-08 put admin/global affordances in `#headerActions`; nav link is the page route |
| Tour engine | New `assets/*.js` module (browser/client) | `data-tour` anchors live in each page's HTML | Pure client; modeled on `demo-hints.js` but decoupled from the iframe gate (`app.js:701`) |
| Welcome overlay | `app.js` init (client) gated by `localStorage` | full-screen overlay markup + garden tokens | D-09/D-15 — flag-gated one-shot, like `showFirstLaunchSecurityNote()` already in `initCommon()` |
| Help content strings | `i18n-en.js` (EN-first) | `i18n.js` loader + `data-i18n` resolution | CONVENTIONS.md: all strings dot-notation keyed, EN filled first, 4-locale parity later |
| Welcome trigger flag | `localStorage` (`sg.welcomeSeen`) | — | Same store as `portfolioLang`, `securityGuidanceDismissed` (precedent set Phase 19) |
| Tour ↔ page navigation | Client-side `location.href` between HTML pages | tour state carried in `sessionStorage`/URL param | Multi-page app — a cross-page tour step is a page navigation, not an SPA route (see Pitfall 3) |

## Standard Stack

This project's "stack" is a hard constraint, not a choice: **vanilla HTML/CSS/JS, zero npm dependencies, IndexedDB, no build step** (PROJECT.md Constraints; CONVENTIONS.md "no module imports"). The only stack question this phase decides is the tour-engine approach.

### Core (the decision: tour engine)

| Option | Verdict | License | Size | RTL / Dark | Why |
|--------|---------|---------|------|------------|-----|
| **Bespoke on `demo-hints.js` patterns** | **RECOMMENDED** | project-owned | ~3–6KB (estimate, comparable to demo-hints.js's ~10KB minus marketing scripts) | Already solved in `demo-hints.js` (inset-logical CSS, `[data-theme="dark"]` selector, `app:language` listener) | Matches zero-dep vanilla constraint; reuses proven RTL/dark/i18n plumbing; ~6–9 steps don't need a 21KB engine [VERIFIED: codebase] |
| Driver.js 1.4.0 (vendored `.iife.js`) | Viable fallback; use its **API shape** as design vocabulary | **MIT** ✓ | 21KB raw / **6.3KB gzip** JS + 4KB raw / 1.1KB gzip CSS = **under 30KB** ✓ | **NOT RTL-safe, NOT dark-aware out of the box** — needs a custom token CSS layer anyway | Optional `element` ⇒ modal step; `onNextClick` page-nav hook; refresh-on-resize — ideal *design primitives* [VERIFIED: npm pack + dist/driver.css inspection] |
| Shepherd.js 15.2.2 | **REJECTED** | **AGPL-3.0** ✗ | larger; depends on Floating UI | n/a | AGPL is legally hostile to a closed-source EUR 119 commercial product [VERIFIED: npm view shepherd.js license] |
| Intro.js 8.3.2 | **REJECTED** | **AGPL-3.0** ✗ (commercial license sold separately) | 12.5KB | n/a | Same AGPL problem; paid commercial license contradicts the zero-recurring-cost model [VERIFIED: npm view intro.js license; CITED: chameleon.io] |

**Why bespoke wins over vendoring Driver.js (the decisive argument for the UI-SPEC):** The RTL-safe, dark-mode-aware, garden-token CSS layer is **unavoidable work regardless of choice** — Driver.js's shipped CSS hardcodes `right:0`, `text-align:right`, `margin-left:4px`, `#fff`, `#2d2d2d` and has zero `[dir="rtl"]` or `[data-theme]` hooks [VERIFIED: `dist/driver.css`]. Once that layer is hand-written anyway, vendoring 21KB of generic positioning logic to drive ~6–9 steps adds dependency-update burden (CONVENTIONS.md: locally vendored, no npm) for capability the project mostly won't use. `demo-hints.js` already demonstrates the exact patterns the project needs (CSS logical properties `margin-inline-start`/`inset-inline-end`, the `[data-theme="dark"] .demo-tooltip` selector, the `app:language` cleanup-and-replace listener, MutationObserver for late-rendering targets) [VERIFIED: `assets/demo-hints.js`].

### Supporting (no new libraries — these are existing project assets to reuse)

| Asset | Purpose | When to Use |
|-------|---------|-------------|
| `assets/demo-hints.js` (pattern source) | Pulsing-dot + tooltip rendering, RTL inset-logical CSS, `app:language` listener, dark-mode selector, MutationObserver for dynamic targets | Pattern reference for the bespoke tour engine (D-13: patterns only, no content contract, do not modify the file) |
| `assets/tokens.css` | Garden design system: `--color-*`, `--shadow-*`, dark-mode `[data-theme="dark"]` overrides, Rubik font | Welcome + Help + tour visual language must use these tokens only — no ad-hoc hex (D-10) |
| `assets/shared-chrome.js` (`SharedChrome`) | Inline multi-locale string tables + footer/nav-context rendering pattern | Model for any new shared chrome the Help/welcome needs; precedent for inline string tables when i18n.js isn't loaded |
| `renderNav()` in `app.js` (~L137) | Single nav injection point, `data-nav` active-marking, `applyTranslations(placeholder)` | The Help nav entry hangs here (design only — wired in build phase) |
| `#headerActions` container | Already hosts cloud (`backup-cloud-btn`) + gear (`settings-gear-btn`); 44×44 circular touch targets; LTR order flips automatically in RTL | The "?" affordance lands here beside them (D-02; Phase 25 D-08) |
| `localStorage` | `portfolioLang`, `securityGuidanceDismissed`, license keys already here | `sg.welcomeSeen` flag (D-15); precedent: `showFirstLaunchSecurityNote()` in `initCommon()` |
| Botanical illustrations (`assets/illustrations/`, `assets/landing/`) | watering-can, garden, hero art used in footer + landing | Welcome overlay + Help page hero (D-10 "same product the customer just bought") |

**Installation:** None. Zero new dependencies. (If the fallback Driver.js path is ever chosen in the build phase, it is vendored as a static `assets/vendor/driver.iife.js` + a project-authored `driver-theme.css` — never via npm. Not this phase.)

**Version verification (performed this session):**
- `driver.js` → **1.4.0**, MIT, 0 dependencies, ships `dist/driver.js.iife.js` (21,302 B raw / 6,266 B gzip) + `dist/driver.css` (3,938 B raw / 1,111 B gzip) [VERIFIED: `npm view driver.js` + `npm pack driver.js@1.4.0` + local gzip]
- `shepherd.js` → 15.2.2, **AGPL-3.0** [VERIFIED: `npm view shepherd.js license`]
- `intro.js` → 8.3.2, **AGPL-3.0** [VERIFIED: `npm view intro.js license`]

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────┐
   First launch     │  app.js initCommon()                         │
   post-activation  │   reads localStorage 'sg.welcomeSeen'        │
        │           └───────────────┬─────────────────────────────┘
        ▼                           │ flag ABSENT (new OR upgrader)
 ┌──────────────┐                   ▼
 │ localStorage │        ┌─────────────────────────────┐
 │ sg.welcome   │◀───────│  FULL-SCREEN WELCOME OVERLAY │  (garden tokens, RTL, dark)
 │   Seen       │  set   │  warm greeting + 1–2 lines   │
 └──────────────┘  on    │  [Take the guided tour]      │
        ▲          either │  [I'll explore myself]       │
        │          CTA    └───────┬──────────────┬──────┘
        │                         │              │ "explore myself" → set flag, close
   tour completes ────────────────┘              ▼
        │                                  (user free in app)
        ▼
 ┌────────────────────────────────────────────────────────────────┐
 │  REPLAYABLE TOUR ENGINE  (bespoke, demo-hints.js patterns)       │
 │  step = { anchorSelector?, page?, i18nKey, takeMeThereHref }     │
 │    ├─ anchor present on this page → spotlight + tooltip          │
 │    ├─ anchor absent / offsetParent null → MODAL step:            │
 │    │     plain text + [Take me there] deep-link  (D-11 fallback) │
 │    └─ step.page ≠ current page → navigate (location.href),       │
 │          carry tour state in sessionStorage, resume on load      │
 │  re-renders on 'app:language' event (cleanup → replace)          │
 └───────────────────────────┬────────────────────────────────────┘
                              │ every step also documented on ↓
 ┌────────────────────────────────────────────────────────────────┐
 │  HELP PAGE  help.html + assets/help.js  (SINGLE SOURCE OF TRUTH) │
 │   nav entry via renderNav(); reachable from "?" in headerActions │
 │   ── WORKFLOW SPINE (D-03, the organizing principle) ──          │
 │   1 Add a client → 2 Start a session → 3 Capture emotions        │
 │   (quick-paste) → 4 Heart Shield → 5 Severity (before/after,     │
 │   reversal) → 6 Finish: review & per-session export → 7 Overview │
 │   ── flagship: Customizable session sections (lead the           │
 │      personalization story, D-04) ──                             │
 │   ── TECHNICAL-TIPS TRACK (parallel, D-05/D-06) ──               │
 │   Backups & restore · PDF export · PWA install (per-browser) ·   │
 │   "data never leaves your browser" · 2-device activation ·       │
 │   deactivate/transfer · troubleshooting                          │
 │   all copy = data-i18n keys, EN filled first (D-12)              │
 └────────────────────────────────────────────────────────────────┘
        ▲
        │  "?" affordance in #headerActions (next to cloud + gear,
        │   44×44, RTL auto-flip) — globally reachable (D-02)
        │   opens Help page; can also re-launch welcome / tour
   every app screen (index/sessions/reporting/add-client/add-session/settings)
```

File-to-implementation mapping is in **Component Responsibilities** below — the diagram shows data/decision flow only.

### Recommended Project Structure (designed here; created in the build phase)

```
help.html                    # new standalone page, follows per-page pattern (STRUCTURE.md recipe)
assets/help.js               # Help page module: render spine + technical track from i18n keys
assets/help-tour.js          # bespoke tour engine (demo-hints.js patterns, NOT the iframe-gated file)
assets/help-tour.css         # OR a tour-section in app.css — token-mapped, logical-property,
                             #   [data-theme="dark"] aware, [dir="rtl"] safe (the unavoidable layer)
assets/i18n-en.js            # + help.* keys (EN filled; he/de/cs added in a later phase)
                             # data-tour="..." anchor attributes added to existing pages' HTML
```

### Pattern 1: The tour-step schema (the heart of the UI-SPEC)

**What:** Each tour step is a data object whose `anchor` is optional. Resolution order at render time mirrors `demo-hints.js`'s `placeDot()` guard (`if (!target) return; if (target.offsetParent === null) return;`) but instead of silently skipping, it **degrades to a modal step**.

**When to use:** Every tour step. This is the D-11 contract expressed concretely.

```javascript
// UI-SPEC design vocabulary — schema, not production code.
// Modeled on demo-hints.js HINTS structure + Driver.js DriveStep shape.
const TOUR_SPINE = [
  {
    id: 'add-client',
    page: 'index.html',                 // which page this step lives on (multi-page nav)
    anchor: '[data-tour="add-client"]', // STABLE attribute, not a fragile #id or :nth-child
    i18nKey: 'help.tour.addClient',     // EN-first, data-i18n resolved (D-12)
    takeMeThereHref: './add-client.html'// the D-11 fallback deep-link
  },
  // ... ~6–9 steps total across the spine
];

// Resolution (the D-11 graceful-degradation core):
//  anchor present & visible      → spotlight + tooltip near it (rich path)
//  anchor missing/offsetParent 0 → centered MODAL: i18n text + [Take me there] → takeMeThereHref
//  step.page !== currentPage     → navigate via location.href, persist {tourId,stepIndex}
//                                   in sessionStorage, resume on next page's init
```

Driver.js validates this shape exactly: its `element` is `Element | string | (() => Element)` and **optional — "allowing steps to be shown as modals if not provided"**; `onNextClick(element, step, options)` lets a step run `location.href` then NOT call `moveNext()` (resume after navigation instead) [CITED: Context7 /nilbuild/driver.js configuration + buttons guides; driverjs.com/docs].

### Pattern 2: Stable anchors across multi-page + RTL + 4 locales (D-11)

**What:** Bind tour/help to dedicated `data-tour="…"` attributes, **never** to `#id`s that other code owns, `:nth-child`, or text content (which changes per locale).

**Why this is the right pattern here:** `demo-hints.js` targets things like `label[data-i18n="client.form.photo"]` and `#saveAndSessionBtn` — those work for an 8-step marketing script but are exactly the brittleness D-11 warns about (an id rename or a layout change silently kills the hint — note `placeDot` just `return`s). A dedicated `data-tour` attribute is invisible to styling/i18n/refactors, survives RTL (it's an attribute, not a position), and is locale-independent (it's not text). The UI-SPEC should enumerate the exact `data-tour` anchor list as a contract the build phase must honor.

**Anti-pattern (observed in `demo-hints.js`):** silent `return` when a target is absent. For the in-app tour that is a *broken* step. The fallback-to-modal path (Pattern 1) is the required behavior, and it must be in the UI-SPEC as non-negotiable.

### Pattern 3: Cross-page tour continuity (multi-page vanilla app)

**What:** This is NOT an SPA. A tour step on `add-session.html` followed by one on `reporting.html` is a real page navigation. The tour state (`{tourId, stepIndex}`) must survive the navigation.

**Recommendation for the UI-SPEC:** persist tour progress in `sessionStorage` (tab-scoped, cleared on close — appropriate for a transient tour) and have each page's init check for an in-progress tour and resume. Precedent in this codebase: Phase 25 used `index.html?openBackup=1` to summon a modal cross-page; the same query-param OR sessionStorage pattern applies. The mockup should *demonstrate* the cross-page hop (even as a static "next page" click) so the design is validated, but no production wiring (D-08).

### Pattern 4: Welcome one-shot gating (D-09/D-15)

**What:** `localStorage.getItem('sg.welcomeSeen')` absent ⇒ show full-screen welcome. Set on "explore myself" OR tour completion. Re-open only via "?".

**Why localStorage not IndexedDB:** matches the existing `securityGuidanceDismissed` / `portfolioLang` precedent (`shared-chrome.js`, `app.js`), survives across sessions (unlike sessionStorage), and "flag absent ⇒ first-run" automatically gives existing upgraders the welcome exactly once (D-15) with zero migration code. `showFirstLaunchSecurityNote()` in `initCommon()` is the exact existing pattern to model the spec on.

### Anti-Patterns to Avoid

- **Vendoring an AGPL tour library (Shepherd/Intro):** legally incompatible with a closed-source commercial product. Hard no [VERIFIED].
- **Binding the tour to `#id`s or text:** brittle across RTL/4 locales/refactors — the exact D-11 failure mode. Use `data-tour`.
- **Silent skip on missing anchor** (the `demo-hints.js` behavior): for in-app help that is a broken step. Always degrade to the modal+deep-link.
- **A second per-screen "?" help system:** explicitly deferred (CONTEXT Deferred Ideas). Deep-link *into* the single Help page only.
- **Forced linear first-run tutorial that blocks the app:** contradicts the benchmark tone (Calm "respects autonomy", non-forced). Welcome offers a choice; "explore myself" is first-class.
- **Modifying `demo-hints.js` / `demo.html` / `landing.html`:** D-13 — borrow patterns, touch nothing.
- **Ad-hoc hex / physical CSS in the new surfaces:** must use `tokens.css` vars + logical properties (the Driver.js CSS is the cautionary example).
- **Imperative Hebrew in any string:** project-wide rule (Phase 24 D-05) — noun/infinitive only. Affects all help/tour copy when it is translated later, and the EN keys must be authored so the HE form is natural (see Pitfall 5).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Element spotlight + tooltip rendering | A brand-new overlay engine from scratch | The **`demo-hints.js` rendering pattern** (already RTL/dark/i18n-aware) | It already solves inset-logical positioning, `[data-theme="dark"]`, off-screen clamping, `app:language` re-render, MutationObserver for late targets (D-13 explicitly allows pattern reuse) |
| Popover positioning math | Hand-rolled getBoundingClientRect placement (if it grows complex) | Driver.js's *documented behavior* as the spec, OR keep the simple `demo-hints.js` fixed-position approach | The tour is ~6–9 steps; demo-hints' simple `rect.bottom + 6` placement is sufficient — don't over-engineer |
| First-run gating | A new persistence mechanism | `localStorage` flag like `securityGuidanceDismissed` | Existing, proven, "absent ⇒ first-run" gives upgraders the welcome free (D-15) |
| Footer / nav chrome on the Help page | New footer/nav code | `SharedChrome.renderFooter()` + `renderNav()` | Already shared; the Help page is just another per-page consumer |
| i18n string resolution | A new string system | `data-i18n` + `App.t()` + `applyTranslations()` | CONVENTIONS.md mandates it; 4-locale parity infra exists |

**Key insight:** This phase's only genuinely new engineering surface is the **token-mapped, RTL-safe, dark-aware tour CSS + the anchor/fallback resolution logic**. Everything else is composition of existing, proven project patterns. The UI-SPEC should make that explicit so the build phase doesn't reinvent chrome/i18n/gating.

## Six Help Patterns (a–f) — Benchmark Findings & Recommendation

> D-01 already locks **(d) persistent Help page + (e) interactive overlay tour** in a **(f) hybrid**.
> This section validates that combination against the D-14 benchmark and details *how*.

| Pattern | How benchmark apps do it | Strength for THIS audience (non-technical solo therapists, Hebrew-primary) | Verdict |
|---------|--------------------------|----------------------------------------------------------------------------|---------|
| **(a) First-run full tour** | Insight Timer: onboarding questionnaire ("which features matter, experience level, first goal"). Calm: deliberately *avoids* a forced tour. | A forced linear tour intimidates non-technical users and can't survive RTL/4-locale fragility well. | Use **only** as the *optional* welcome CTA "Take the guided tour" (D-09) — never forced. |
| **(b) Per-screen "?" panels** | Practice-mgmt apps lean on a separate Help Center site, not dense in-screen "?" panels. | Distributed help fragments the single-source-of-truth; more surfaces to keep RTL/i18n-correct. | **Deferred** (CONTEXT). Deep-link into the one Help page instead. |
| **(c) Empty-state coaching** | Common in practice-mgmt onboarding ("add your first client"). The app *already* has `overview.clients.empty` = "No clients yet. Add your first client to get started." | High value, low fragility, no overlay engine, RTL-trivial (it's just copy). | **Recommend the UI-SPEC formalize empty-state copy** as a lightweight third leg of the hybrid — it teaches in place with zero engine risk. Strong complement to D-01. |
| **(d) Persistent Help page** | SimplePractice/Jane: full task/workflow-organized help center; Calm: on-dashboard self-paced "Get Started" checklist that "respects autonomy". | Best fit: browsable any time (serves D-07 returning user), zero overlay fragility, RTL/i18n = ordinary page content, single source of truth. | **Backbone (locked D-01).** This is where comprehensive coverage (D-04) lives. |
| **(e) Interactive overlay tour** | Shepherd/Driver/Intro-class; practice-mgmt apps use short contextual walkthroughs + video, not long DOM tours. | Powerful but the single most fragile element (RTL + 4 locales + multi-page). Must degrade. | **Locked D-01**, but specced as **thin, ~6–9 steps, every step degrades** (D-11). The Help page is the durable truth; the tour is a replayable convenience layer. |
| **(f) Hybrid** | Calm is effectively hybrid: contextual checklist + self-paced + non-forced. | The right model — durable page + optional warm guided layer + in-place empty-state nudges. | **Recommended composition:** **(d) Help page** [truth] + **(e) thin degradable tour** [optional, replayable] + **(c) empty-state copy** [in-place, zero-risk] + **(a)-as-welcome** [one warm choice, D-09]. (b) explicitly out. |

**Tone synthesis (D-14):** SimplePractice's help is *task/workflow-led* — adopt the structure. Calm's onboarding *respects autonomy, is self-paced, non-forced, warm* — adopt the voice. Explicitly avoid generic SaaS product-tour energy ("Let's get you set up! 🚀 Step 1 of 12"). The reference user is Sapir: warm, calm, clinician-facing, non-technical, Hebrew-primary.

## Content Architecture (D-03 / D-04 / D-05 / D-06)

The benchmark confirms a **process-led, not feature-catalog** structure: SimplePractice's own getting-started is "schedule an appointment with a sample client → send intake → the 3 things to set up before you use it" [CITED: support.simplepractice.com]. Recommended information architecture for the EN content outline this phase produces:

**Workflow spine (the organizing principle — D-03, D-07):**
1. **Add a client** — inline-create vs. full add; client types (Adult/Child/Animal/Other); photo (energetic connection for remote work, per existing demo copy).
2. **Start a session** — from client card "New session" vs. "Add Session" dropdown; the pre-session context card (Phase 22).
3. **Capture emotions — quick-paste** (D-04 named must-have) — emphasize the speed story.
4. **Heart Shield (מגננת הלב) workflow** — session-level field, removal tracking, status computed from session scan (Phase 9 model).
5. **Severity tracking** — before/after 0–10 per issue, multi-issue, **reversal** (the non-obvious one), read mode.
6. **Finish: review & export** — **per-session export** (D-04: "send to your client" / "file in your own records"), read mode.
7. **Back to overview** — KPIs, search/filters, what the dashboard tells you.

**Flagship personalization story (D-04 — lead with this, don't bury it):**
- **Customizable session sections** — turning text boxes/sections on/off to match *each therapist's own workflow* (Phase 22 editable section titles + on/off). Frame as "make Sessions Garden yours" — the differentiator, surfaced early in the Help page, not as an options footnote.

**Technical-tips track (parallel, D-05/D-06):**
- **Backups & restore** — why it matters (local-only ⇒ the user is the only backup), Export/Import/encrypted-backup flow (Phase 25 final shape), the cloud-icon recency signal.
- **PDF export** — Phase 22 per-session document export.
- **PWA install — per browser** (the hard one — see Pitfall 4): Chrome/Edge (address-bar install icon), **Safari iOS (Share → Add to Home Screen — NO programmatic prompt exists)** [VERIFIED: MDN; multiple sources], Android Chrome/Firefox/Samsung.
- **"Data never leaves your browser"** — the core value made legible to a non-technical user (PROJECT.md core value); ties to why backups matter.
- **2-device activation limit + deactivate/transfer** — what "activation" means in plain language, how to move to a new computer/browser, the limit (use correct browser/endpoint terminology per the folded TODO).
- **Troubleshooting** — cleared cache → data still in IndexedDB vs. truly lost; re-activation; "I don't see my clients" decision tree.

**Surfacing rule (the IA principle):** features are introduced **where they're used in the spine**, with the technical track as a clearly-separated parallel section on the Help page (SimplePractice separates "use the product" from "set up / admin" the same way). The mockup should show both the spine and the parallel track so the design contract is validated.

## PWA-Install / Offline / Activation Guidance (D-06)

**The hard constraint:** `beforeinstallprompt` does **not** exist on iOS Safari; there is **no programmatic install prompt**; install is a manual 4+-tap Share → Add to Home Screen flow the app must *teach* visually [VERIFIED: MDN "Making PWAs installable"; multiple corroborating sources]. Best practice for non-technical users is **browser-detected, per-browser, illustrated step-by-step instructions inside the app** — not a generic "install us" banner.

Design-actionable recommendations for the UI-SPEC / content outline:
- The Help page's technical track contains a **per-browser install section**: detect UA → show only the relevant illustrated steps (Chrome/Edge desktop = address-bar install icon; **Safari iOS = Share sheet → Add to Home Screen**, with the actual iOS share-icon glyph; Android Chrome/Firefox/Samsung = menu → Install/Add).
- An **optional, dismissable, non-nagging** "Install Sessions Garden" affordance (Calm-style: offered, not forced; respects autonomy) — *designed* here, built later.
- The **offline explainer** ("data never leaves your browser") should be the *emotional anchor* of the technical track for this privacy-first audience — it's the core value (PROJECT.md), not a technical footnote. Pair it directly with "that's why backups matter."
- **Activation/transfer** content uses plain language: what activation is, the 2-device limit, deactivate-before-transfer, and a troubleshooting decision tree. Correct browser/endpoint terminology (the folded TODO + Phase 19 `device-browser-terminology-fix` pending todo flag this exact wording sensitivity).

## Welcome-Overlay UX (D-09 / D-15)

- **Trigger:** `initCommon()` checks `localStorage 'sg.welcomeSeen'`; absent ⇒ render full-screen overlay. Models the existing `showFirstLaunchSecurityNote()` one-shot exactly.
- **Content:** warm greeting + 1–2 sentences on what Sessions Garden does *for the therapist* (benefit, not feature list — Calm tone). Two CTAs: **"Take the guided tour"** (launches the tour engine) / **"I'll explore myself"** (sets flag, closes).
- **Dismissal/flag:** "explore myself" sets `sg.welcomeSeen`; completing the tour also sets it. Re-open only via "?". **Existing upgraders:** flag absent on first launch into the new version ⇒ they see it once, free, no migration code (D-15).
- **Visual:** full-screen, garden tokens, botanical illustration (watering-can/garden art already in repo), dark-mode via `[data-theme]`, RTL via logical properties. Must read as "the same product you just bought" (D-10) — not a distinct onboarding skin (explicitly rejected in discussion).
- **Mockup must show:** the welcome as the entry screen with both CTA paths wired (statically) to (a) the tour and (b) the app — enough to validate, no production logic (D-08).

## i18n + RTL Constraints for Help/Tour Copy

- **All copy is `data-i18n` keyed, EN filled first** (D-12; CONVENTIONS.md dot-notation `help.*`, `help.tour.*`, `help.welcome.*`). HE/DE/CS are a *later* phase — but the EN keys must be authored now so they translate cleanly.
- **Hebrew = noun/infinitive, never imperative** (Phase 24 D-05, memory-locked, project-wide). The EN canonical phrasing should avoid command-heavy constructions that only translate naturally as Hebrew imperatives (e.g., prefer "Adding a client" / "Capturing emotions" section headings over "Add a client!" / "Capture the emotions!"). Author EN with the HE noun/infinitive target in mind even though HE is filled later.
- **Length variance is a real layout risk** for tour tooltips specifically: Hebrew and German routinely run longer/shorter than EN; constrained tooltip width + RTL mirroring is exactly where overflow/truncation bugs appear [CITED: RTL localization best-practice sources]. **Design rule for the UI-SPEC:** prefer **short, anchor-light tour steps**; tooltip containers must be flexible-height with `min/max-width` and **logical properties only** (the `demo-hints.js` `.demo-tooltip` is a good template: `padding-inline-end`, `inset-inline-end`, off-screen clamp). Every step's fallback modal is also length-resilient (centered, flexible) — another reason the degradation path is a feature, not just a safety net.
- **`app:language` re-render:** the tour engine must re-render on the `app:language` CustomEvent (the exact `demo-hints.js` cleanup-then-replace pattern at its line ~361), because switching language mid-tour must not strand a tooltip in the old language or wrong position.

## Common Pitfalls

### Pitfall 1: AGPL tour library poisons a commercial product
**What goes wrong:** Picking Shepherd.js or Intro.js because they're popular; AGPL-3.0 obligates source disclosure of the whole app — incompatible with a closed-source EUR 119 product.
**Why it happens:** Bundle-size articles rank them highly and rarely lead with license.
**How to avoid:** License-first filtering. Driver.js (MIT) or bespoke only. [VERIFIED: npm view]
**Warning signs:** Any tour-library recommendation that doesn't state the license.

### Pitfall 2: Assuming a vendored library is RTL/dark-ready
**What goes wrong:** Vendoring Driver.js expecting it to "just work" in Hebrew + dark mode; its CSS is physical-property and hardcoded-color.
**Why it happens:** Docs emphasize "zero dependencies, customizable"; they don't say "ships LTR-only light CSS."
**How to avoid:** The UI-SPEC must mandate a project-authored, token-mapped, logical-property, `[data-theme]`-aware tour CSS layer **regardless of engine choice**. [VERIFIED: dist/driver.css inspection]
**Warning signs:** `right:`, `text-align:right`, `margin-left:`, literal `#fff` in any tour stylesheet.

### Pitfall 3: Treating the multi-page app like an SPA in the tour
**What goes wrong:** Designing a tour that assumes steps live on one continuous DOM; in reality `add-session.html` → `reporting.html` is a full navigation that destroys tour state.
**Why it happens:** Most tour-library examples are SPA examples.
**How to avoid:** Spec cross-page continuity (sessionStorage `{tourId,stepIndex}` + resume-on-init, or the `?param=` precedent from Phase 25's `?openBackup=1`). Demonstrate the page hop in the mockup.
**Warning signs:** A tour design with no answer to "what happens when the next step is on another page?"

### Pitfall 4: Promising a one-tap PWA install on iOS
**What goes wrong:** Designing an "Install" button that does nothing on iOS Safari (no `beforeinstallprompt`).
**Why it happens:** Android/Chrome has a programmatic prompt; iOS does not.
**How to avoid:** Per-browser *instructional* content (Safari iOS = illustrated Share → Add to Home Screen), not a universal install button. [VERIFIED: MDN]
**Warning signs:** Any single "Install the app" CTA with no per-browser branching.

### Pitfall 5: EN copy that only translates to Hebrew imperatives
**What goes wrong:** Punchy EN imperative microcopy ("Add your first client!") forces an unnatural or rule-violating Hebrew imperative later.
**Why it happens:** Product-tour copy conventions favor imperatives; this project forbids Hebrew imperatives (D-05).
**How to avoid:** Author EN headings/labels in noun/gerund form where they'll become HE nouns/infinitives; flag this in the content outline so the later translation phase isn't boxed in.
**Warning signs:** Imperative-heavy EN draft with no note about the HE constraint.

### Pitfall 6: Silent-skip fallback (the demo-hints.js behavior) shipped as the tour behavior
**What goes wrong:** Reusing `demo-hints.js`'s `if (!target) return;` means a missing anchor = an invisibly-dropped step; the user's tour silently has holes.
**Why it happens:** It's the literal pattern being borrowed (D-13).
**How to avoid:** The UI-SPEC must specify *degrade to modal + "take me there"*, never skip. This is the D-11 contract — make it explicit and testable in the mockup walkthrough.
**Warning signs:** A tour spec where "anchor missing" has no defined visible behavior.

## Code Examples

Patterns the UI-SPEC/mockup should use as design vocabulary (not production code — D-08).

### Driver.js step shape that validates the D-11 schema (design reference only)
```javascript
// Source: Context7 /nilbuild/driver.js (configuration + buttons guides)
// element is OPTIONAL → "steps shown as modals if not provided" (the fallback path)
const driverObj = driver({
  steps: [
    { element: '#feature',  popover: { title: '…', description: '…' } }, // anchored
    {                        popover: { title: '…', description: '…' } }, // NO element → modal
  ],
  // step can navigate away then resume — exactly the multi-page need:
  onNextClick: (el, step, { driver }) => { /* location.href=…; persist; do NOT moveNext() */ },
});
driverObj.drive();          // or drive(4) to resume at a step (cross-page continuity)
```

### Existing RTL/dark/i18n plumbing to reuse (from demo-hints.js — pattern source, do not edit)
```javascript
// Source: assets/demo-hints.js  (D-13: borrow the PATTERN only)
//  RTL-safe CSS uses logical props:  margin-inline-start, inset-inline-end, padding-inline-end
//  Dark mode:  [data-theme="dark"] .demo-tooltip { background:#2a2a2a; color:#e0e0e0; }
//  Off-screen clamp:  if (tooltipRect.right > innerWidth-8) tooltip.style.left = …
//  Late targets:  MutationObserver(...).observe(document.body,{childList:true,subtree:true})
//  Language change:  document.addEventListener('app:language', () => { cleanup(); replace(); })
//  Visibility guard: if (!target) return; if (target.offsetParent === null) return;
//                    ⚠ in the IN-APP tour, this guard must DEGRADE, not silently return.
```

### Existing one-shot localStorage gate to model the welcome on
```javascript
// Source: assets/app.js initCommon()  (showFirstLaunchSecurityNote pattern)
//  Welcome:  if (!localStorage.getItem('sg.welcomeSeen')) renderWelcomeOverlay();
//  Set on "explore myself" OR tour-complete:  localStorage.setItem('sg.welcomeSeen','1');
//  Flag absent on upgrade ⇒ existing users see it exactly once (D-15) — no migration code.
```

## State of the Art

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| Forced linear first-run product tour | Self-paced, non-forced, choice-based onboarding (Calm "respects autonomy"; on-dashboard checklist) | Industry shift well-established by 2024–2026 | The welcome offers "explore myself" as a first-class path (already locked D-09) — validated as current best practice for non-technical/wellness audiences |
| Feature-catalog help | Task/workflow-organized help (SimplePractice getting-started) | Established practice-mgmt norm | Confirms D-03 workflow-spine model; not a relitigation, a validation |
| `position` (single prop) tour API | `side` + `align` (Driver.js v1); `element` now optional ⇒ modal step; `closeBtnText` → icon | Driver.js v1.x | If Driver.js is ever the fallback, target v1 API; the optional-element-as-modal is exactly the D-11 primitive |
| AGPL/commercial tour libs (Intro.js, Shepherd.js) | MIT, dependency-free (Driver.js) for closed-source products | Ongoing | License is the gating criterion for a commercial product, above bundle size |

**Deprecated/outdated:**
- Relying on `beforeinstallprompt` for installability messaging on iOS — never existed there; manual Share-sheet instruction is the only path [VERIFIED: MDN].
- Driver.js pre-v1 `position` API and `className` (now `popoverClass`, `side`/`align`) — use v1 vocabulary in the spec.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A bespoke `demo-hints.js`-pattern engine lands at ~3–6KB | Standard Stack | Low — even if larger, the budget is 30KB and demo-hints.js is already ~10KB with marketing scripts; the *recommendation* (bespoke vs vendor) rests on the CSS-layer argument + zero-dep constraint, not the exact KB |
| A2 | The workflow spine is ~6–9 tour steps | Architecture / Six Patterns | Low — granularity is explicitly Claude's discretion (CONTEXT); affects only the "thin tour" framing, easily adjusted in the mockup |
| A3 | Benchmark in-app *tour mechanics* (SimplePractice/Jane/Carepatron/Calm) inferred from public support/marketing material, not internal product access | Six Patterns / Content / Tone | Medium for *mechanics* claims; LOW for the *structural/tonal* conclusions (task-led help, non-forced onboarding) which are independently corroborated and already aligned with locked decisions |
| A4 | The Phase 25 `#headerActions` LTR order (cloud, gear; RTL auto-flip; 44×44) is final and the "?" sits beside them | Architectural Map / Welcome | Low — read directly from 25-UI-SPEC.md; UI-SPEC re-confirms placement anyway (D-02 leaves exact spot to discretion) |
| A5 | `sessionStorage` is the right cross-page tour-state carrier | Pattern 3 / Pitfall 3 | Low — the `?openBackup=1` query-param precedent is an equally valid alternative; the UI-SPEC chooses, both are proven in this codebase |

## Open Questions

1. **"?" entry point: header icon vs. bottom-corner floating button.**
   - What we know: D-02 locks "globally reachable, always available"; both are explicitly acceptable; Claude's discretion.
   - What's unclear: header is consistent with cloud/gear (Phase 25 D-08) but `#headerActions` is getting crowded (globe, theme, cloud, gear, license); a floating "?" is more discoverable for non-technical users and doesn't compete for header space.
   - Recommendation: UI-SPEC presents both in the mockup; lean header-icon for visual consistency with the established admin-affordance pattern, but validate header crowding in the dark-mode/RTL/mobile render check before locking.

2. **Empty-state coaching as a formal hybrid leg.**
   - What we know: pattern (c) is deferred as a *distinct system* but the app already has empty-state strings; it's the lowest-risk teaching surface (pure copy, RTL-trivial).
   - What's unclear: whether to spec it as a first-class part of the hybrid or leave it incidental.
   - Recommendation: UI-SPEC formally includes empty-state copy as the zero-engine third leg (it strengthens D-01 at no fragility cost) — flag for Sapir/Ben confirmation since it slightly extends the locked composition.

3. **Mockup fidelity for the cross-page tour hop.**
   - What we know: D-08 = no production wiring; Claude's discretion on fidelity.
   - What's unclear: how to *demonstrate* cross-page continuity statically convincingly.
   - Recommendation: a lightly-interactive HTML mockup where "Next" on a page-boundary step visibly navigates to a second mockup page with the tour resuming — proves the design without production logic.

## Environment Availability

Step 2.6: This phase is design + research + mockup only — the deliverables are `.md` + a static HTML mockup. **No external runtime dependencies** (no install of Driver.js this phase; npm was used only for version/size *verification*, not as a project dependency). The mockup is plain HTML/CSS/JS opened in a browser. SKIPPED (no external dependencies block this design phase).

## Design Validation

> Per the objective: this phase ships no production code, so there is **no Validation Architecture /
> runtime-behavior test section**. Instead, here is how the mockup + UI-SPEC must be checked.

| Check | Method | Pass criterion |
|-------|--------|----------------|
| **RTL render** | Open the mockup with `dir="rtl"` / Hebrew; inspect welcome, Help page, every tour step + every fallback modal | No clipped/mirrored-wrong text; tooltips/popovers use logical properties; nothing escapes the viewport on the inline-end side |
| **Dark mode** | Toggle `[data-theme="dark"]` on the mockup | All surfaces read from `tokens.css` dark vars; no hardcoded light hex; contrast legible |
| **Anchor-fallback walkthrough** | For each tour step, delete/hide its `data-tour` anchor in the mockup and re-run | Step degrades to a centered modal with i18n text + a working "Take me there" link — **never** a silently-skipped step (Pitfall 6) |
| **Cross-page continuity** | Click through a step whose target is on another mockup page | Tour visibly resumes on the next page (static demonstration acceptable) |
| **Content accuracy vs. real app behavior** | Sapir reviews the EN content outline against actual app behavior (D-12) for clinical accuracy + warm/non-technical tone | Every claim matches shipped behavior (Heart Shield session-level model, severity reversal, per-session export, customizable sections, encrypted backup, local-only) |
| **Tone** | Read welcome + Help copy aloud against the D-14 target | Warm/calm (Calm-like), clinician-domain-fit (SimplePractice-like); NOT generic SaaS tour energy |
| **i18n readiness** | Inspect mockup copy | All text is `data-i18n`-keyed `help.*`; EN authored to translate to natural HE noun/infinitive (D-05) |
| **No regression of Phase 25 chrome** | Place the "?" beside cloud+gear in `#headerActions` in the mockup | The consolidated header/overview (Phase 25 D-08/D-13) is not visually disrupted; 44×44 touch target preserved |

## Sources

### Primary (HIGH confidence)
- Codebase (read this session): `assets/demo-hints.js`, `assets/app.js` (renderNav ~L137, headerActions mounts ~L163/302/332/425, demo-hints iframe gate L701), `assets/shared-chrome.js`, `assets/tokens.css`, `assets/i18n.js`, `assets/i18n-en.js`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/CONVENTIONS.md`
- `.planning/phases/26-…/26-CONTEXT.md` + `26-DISCUSSION-LOG.md` (D-01..D-15)
- `.planning/phases/25-…/25-CONTEXT.md` (D-08/D-13/D-14/D-26), `25-UI-SPEC.md` (header layout: cloud+gear, 44×44, RTL auto-flip)
- `.planning/phases/24-…/24-CONTEXT.md` (D-05 Hebrew noun/infinitive, memory-locked)
- `.planning/PROJECT.md`, `.planning/ROADMAP.md` §Phase 26, `.planning/STATE.md`, folded PWA TODO `2026-03-24-pwa-install-guidance-and-user-manual.md`
- `npm view driver.js|shepherd.js|intro.js` (versions + licenses) and `npm pack driver.js@1.4.0` + local gzip (exact bundle sizes) — VERIFIED this session
- Context7 `/nilbuild/driver.js` (configuration, buttons, api guides — step `element` optional, navigation hooks, `drive(n)` resume)

### Secondary (MEDIUM confidence)
- MDN — Making PWAs installable / Installing web apps (no `beforeinstallprompt` on iOS; manual Share-sheet) — https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- SimplePractice Support — Getting started (task/workflow-organized help) — https://support.simplepractice.com/hc/en-us/articles/360020622052-Getting-started-with-SimplePractice
- Chameleon — JavaScript product tour libraries (Intro.js/Shepherd commercial/AGPL note) — https://www.chameleon.io/blog/javascript-product-tours
- npm-compare — driver.js / intro.js / shepherd.js — https://npm-compare.com/driver.js,intro.js,shepherd.js
- Calm onboarding analysis (contextual, self-paced, "respects autonomy") — https://uisources.com/explainer/calm-onboarding ; https://www.theappfuel.com/examples/calm_onboarding
- Insight Timer onboarding (questionnaire model) — https://app.insighttimer.com/onboarding
- RTL localization best practices (tooltip overflow, Hebrew length variance) — https://wordsprime.com/rtl-language-testing-best-practices-to-avoid-text-truncation-and-layout-misalignment/ ; https://www.tomedes.com/translator-hub/hebrew-ui-strings-translation

### Tertiary (LOW confidence — flagged)
- Benchmark in-app *tour mechanics* for SimplePractice/Jane/Carepatron inferred from public support/marketing pages, not internal product access (Assumption A3). Structural/tonal conclusions are independently corroborated; specific tour-step mechanics are illustrative, not authoritative.

## Metadata

**Confidence breakdown:**
- Tour-engine decision (license/size/RTL/dark facts): **HIGH** — npm + dist inspection + Context7, all tool-verified
- Architecture / patterns (multi-page continuity, fallback, gating): **HIGH** — derived from read codebase + verified library behavior
- Content architecture / IA: **HIGH** — driven by locked CONTEXT decisions; benchmark corroborates
- Benchmark tone/structure: **MEDIUM** — public material only, but conclusions align with locked decisions and independent corroboration
- Specific competitor tour *mechanics*: **LOW** — flagged (A3), illustrative only

**Research date:** 2026-05-16
**Valid until:** ~2026-06-15 (30 days; stable — vanilla project, Driver.js v1 stable; re-verify Driver.js version + license only if the build phase ever takes the fallback path)
