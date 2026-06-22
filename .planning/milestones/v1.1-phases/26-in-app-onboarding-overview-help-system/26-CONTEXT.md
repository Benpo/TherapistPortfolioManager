# Phase 26: In-App Onboarding & Overview / Help System - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Design (research + UX + content + mockup) a built-in onboarding/overview/help system so prospective customers and new trial users can understand the app's full feature set without external documentation.

**This phase delivers a design contract and mockup ONLY — no production code.** Outputs: research on how comparable apps do help, a `UI-SPEC.md` design contract, a clickable HTML mockup of the Help page + welcome + tour, and an English content outline organized around the therapeutic workflow. Implementation is explicitly a separate follow-up phase.

The help system is **process-first**: it teaches the therapist how to run a session end-to-end (the treatment loop) and surfaces every feature in the place it is used within that flow — it is NOT a flat feature catalog. It comprehensively covers the full feature set (not just the confusing parts).

New capabilities outside this domain (building the help system in production, translating content beyond EN, redesigning the marketing landing page) belong in their own phases.

</domain>

<decisions>
## Implementation Decisions

### Help-Surface Pattern & Entry Point

- **D-01:** **Hybrid, page-anchored.** A persistent **Help page reachable from the main nav** (alongside Overview / Sessions / Reporting) is the single source of truth. On top of it: a **replayable interactive overlay tour** (its own engine, modeled on `demo-hints.js` patterns — see D-13) that is launchable **any time**, not a one-time first-run event. The user explicitly wants "not only a Welcome screen but something the user can return to."
- **D-02:** **Entry point = a persistent "?" affordance in the header actions, next to the cloud/settings icons** (`#headerActions`) — globally reachable from every screen. A bottom-corner floating "quick help" button is an acceptable alternative the UI-SPEC may choose between, within the constraint "globally reachable and always available."

### Content Model & Scope

- **D-03:** **Workflow-first content model.** The treatment/session loop is the organizing spine: add a client → start a session → capture emotions (quick-paste) → Heart Shield workflow → severity tracking (before/after, reversal) → finish, review & export → back to overview. Features are taught in the place they are used within this flow. A secondary **technical-tips track** runs alongside (backups, PDF export, install/offline — see D-06).
- **D-04:** **Comprehensive coverage, not a confused-features triage.** The help shows therapists everything the app can do for them, not just rescues from confusion. User-named must-haves to feature prominently:
  - **Customizable session sections** — turning text boxes/sections on/off to match *each therapist's own workflow*. This is a flagship "make it yours" differentiator, not an edge case; it leads the personalization story.
  - **Per-session export** — exporting a single session to send to the client or file in the therapist's own records.
  - Emotions quick-paste; multi-issue tracking + read mode.
  - Plus comprehensive coverage of clients, sessions, Heart Shield, severity, search/filters as part of the end-to-end flow.

### Technical-Tips Track

- **D-05:** Technical track covers **Backups & restore** + **PDF export**. (Also satisfies the help-content concern Phase 25 D-26 deferred to Phase 26.)
- **D-06:** **The 2026-03-24 PWA-install-guidance / user-manual TODO is folded FULLY** (supersedes the earlier mid-discussion triage where it was unselected). The Help-system **design + content outline** must comprehensively cover: per-browser install / Add-to-Home-Screen guidance, the "data never leaves your browser" offline explainer, the 2-device activation limit, deactivate/transfer, and troubleshooting (cleared cache, lost data, re-activation). Designed and specced here; built in the follow-up implementation phase.

### Audience Framing

- **D-07:** The **new trial user is the organizing principle** — the workflow spine is built for someone learning to run a session end-to-end. The **returning user** is served by tour replayability and the persistent, browsable Help page. Both audiences are served; the new-user workflow is the structuring lens.

### Build Depth

- **D-08:** **Design contract + mockup only.** Phase 26 delivers `RESEARCH.md` + `UI-SPEC.md` + a clickable HTML mockup (Help page + welcome + tour) + an EN content outline (workflow spine). **No production code.** Implementation is its own follow-up phase. This deliberately avoids the ROADMAP-flagged risk of executor agents building UI before the design is validated.

### Welcome Experience & Visual Language

- **D-09:** **Full-screen branded welcome** on first launch after activation: warm greeting, one or two sentences on what Sessions Garden does for the therapist, two CTAs — "Take the guided tour" / "I'll explore myself." Re-openable any time from the "?" entry point.
- **D-10:** **Extend the existing garden/botanical design system** — reuse `assets/tokens.css`, botanical illustrations, and the landing-page visual identity; dark-mode aware; RTL-safe. The welcome/help must feel like the same product the customer just bought, not a bolted-on skin.

### Tour Resilience

- **D-11:** **Hybrid + graceful degradation.** The interactive tour uses real per-screen spotlighting bound to **stable `data-tour` anchors**, but every step must ALSO work as plain text + a "take me there" link if the anchor is missing or layout shifts (RTL / language change / future layout edits). Rich when it works, never broken when it doesn't. This is a hard constraint for the UI-SPEC because the tour is the single most fragile element across 4 languages + RTL + multi-page navigation.

### Content Authorship

- **D-12:** **Claude drafts the EN canonical content + workflow narrative from the actual app behavior; Sapir reviews/corrects for clinical accuracy and tone.** Matches the ROADMAP EN-first constraint; keeps Sapir the clinical validator, not the authoring bottleneck. DE/CS/HE translation happens later (separate phase, after EN stabilizes).

### Demo ↔ In-App Relationship

- **D-13:** **Leave the marketing demo alone; build the in-app help fresh.** `demo.html` and the landing-page pulsing-dot hints (`demo-hints.js`, hard-gated to iframe context, fixed ~8-step marketing script, embedded only via `landing.html:228`) are untouched. The in-app help is its own independent system; it MAY borrow `demo-hints.js` rendering *patterns* but shares no content contract with the demo. Tighter scope for this design phase; the trade-off (marketing demo and product help can drift) is accepted.

### Research Benchmarks

- **D-14:** The researcher studies **therapy practice-management apps** (SimplePractice, Jane, Carepatron — closest domain fit) and **calm/wellness apps** (Calm, Insight Timer, journaling apps — warm, emotionally-attuned tone). Generic best-in-class SaaS (Notion/Linear-class) and offline-first PWAs are explicitly NOT the benchmark for tone/pattern.

### Claude's Discretion

- Exact placement of the "?" entry point (header actions vs. bottom-corner floating) — UI-SPEC picks within "globally reachable, always available."
- Help page route / filename and how it slots into the existing multi-page nav (`renderNav`).
- Exact visual treatment of the full-screen welcome overlay within the garden design system.
- Granularity of the workflow-spine sub-steps in the mockup.
- Mockup fidelity (clickable static HTML vs. lightly interactive) — enough to validate the design, no production wiring.

### Folded Todos

1. **`.planning/todos/pending/2026-03-24-pwa-install-guidance-and-user-manual.md`** — "PWA install guidance + user manual" (medium priority, from Phase 19). Original problem: non-technical therapists won't discover PWA install (esp. Safari iOS) and need an explicit manual covering install, how-offline-works, the 2-activation limit, deactivate/transfer, and troubleshooting. Folded fully into Phase 26's technical-tips track per D-06 — designed and content-outlined here, built in the implementation follow-up phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & origin
- `.planning/ROADMAP.md` §"Phase 26: In-App Onboarding & Overview / Help System" — scope, the six patterns (a–f) to research, in/out of scope, constraints (RTL-safe, i18n string keys EN-first, no heavy deps <30KB locally vendored, must not regress the Phase-25-consolidated overview), and the Phase 25 dependency.
- `.planning/todos/pending/2026-05-15-in-app-onboarding-overview-help.md` — source TODO: why it's a launch prerequisite, the research-and-design-heavy framing, the patterns to evaluate, and the five discuss-phase decisions.
- `.planning/todos/pending/2026-03-24-pwa-install-guidance-and-user-manual.md` — folded fully (D-06); defines the full PWA-install + user-manual content scope the technical track must cover.

### Prior-phase decisions that constrain this phase
- `.planning/phases/25-backup-architectural-rework/25-CONTEXT.md` §D-26 — "every surface needs clear headers + instructions" (Phase 26 generalizes this app-wide); §D-08/D-13/D-14 — the final header/overview shape (cloud icon in `#headerActions`, color-thresholded status, collapsed overview action row) that the "?" entry point sits beside and must not regress.
- `.planning/phases/25-backup-architectural-rework/25-UI-SPEC.md` — the final Backup & Restore + overview design the new help surface must visually cohere with.
- `.planning/phases/24-pre-launch-final-cleanup/24-CONTEXT.md` §D-05 — Hebrew uses noun/infinitive forms, no imperatives (applies to all new strings); §D-01 — single-source-of-truth pattern.

### Project state & conventions
- `.planning/PROJECT.md` — core value "data never leaves the device" (informs the offline/technical-track copy); audience (solo Emotion Code / Body Code therapists, mostly non-technical; Sapir is the reference user, Hebrew-primary).
- `.planning/codebase/STRUCTURE.md` — multi-page vanilla app layout (HTML pages + per-page JS modules in `assets/`).
- `.planning/codebase/CONVENTIONS.md` — naming and module conventions for the design contract.
- `CLAUDE.md` (project root) — git-pull-at-session-start rule; Lemon Squeezy store note (not relevant to this phase but project-wide).

### Code touchpoints (for the researcher / UI-SPEC — design reference only, no build this phase)
- `assets/app.js` — `renderNav()` (~line 137–151, where a Help nav entry would slot in); `#headerActions` mount points (~line 163/332/426, where the "?" entry point sits); demo-hints loader (~line 701, `if (window !== window.top)` — the iframe gate that confines demo-hints to the embedded demo).
- `assets/demo-hints.js` — pulsing-dot coach-mark + tooltip engine (pattern source per D-13). Iframe-gated (`window === window.top` bail, line 7). Fixed `HINTS` map (~line 86) of ~8 marketing steps. NOT to be modified this phase.
- `demo.html` (sets `window.name='demo-mode'`, self-contained demo page) and `landing.html:228` (`<iframe id="demo-iframe" src="./demo.html">` — the only place demo-hints actually render). Left untouched per D-13.
- `assets/shared-chrome.js` — shared nav-context / footer rendering used across pages.
- `assets/tokens.css`, `assets/illustrations/`, `assets/landing.css` — the garden design system + botanical identity to extend (D-10).
- `assets/i18n-en.js`, `assets/i18n-he.js`, `assets/i18n-de.js`, `assets/i18n-cs.js` and `assets/i18n.js` — `data-i18n` string-key pattern; all help content must be string-keyed (EN filled first), not hardcoded.
- `index.html` — overview/nav structure and `#headerActions` container.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`assets/demo-hints.js`** — a working pulsing-dot + tooltip coach-mark engine (RTL-aware, language-change listener at line ~361). Borrow its *rendering patterns* for the in-app tour (D-13) — but it must be decoupled from the iframe gate and given workflow-spine content; it is NOT shared content.
- **Garden design system** — `assets/tokens.css` + botanical illustrations + `landing.css`/`app.css` provide the cohesive visual language the welcome/Help surface extends (D-10). Dark-mode handled via `data-theme` attribute set early in each page head.
- **`renderNav()` in `assets/app.js`** — single nav injection point (`#nav-placeholder`), `data-nav` active-marking. A Help page entry hangs here.
- **`#headerActions` container** — already hosts the cloud (backup) and settings-gear icons; the "?" entry point (D-02) lands here, beside them.
- **`SharedChrome` (`assets/shared-chrome.js`)** — shared footer + nav-context utilities, multi-locale string tables; pattern to follow for any new shared chrome.

### Established Patterns
- Multi-page vanilla app: one HTML file per screen + one `assets/<page>.js` module; gates at top of `index.html` (license → disclaimer → license-complete).
- `data-i18n="key.path"` resolved by `assets/i18n.js`; 4-locale parity (`i18n-{en,he,de,cs}.js`); Hebrew uses noun/infinitive forms (Phase 24 D-05).
- CSS logical properties for RTL safety; `data-theme="dark"` dark mode.
- Pre-commit hook bumps `sw.js` `CACHE_NAME` automatically; new precached assets need a manual `PRECACHE_URLS` chore follow-up — relevant for the **implementation** follow-up phase (new help.html / tour module / illustrations), not this design phase.

### Integration Points (designed here, wired in the follow-up build phase)
- Nav: `renderNav()` gains a Help entry; active state via `data-nav`.
- Header: `#headerActions` gains the "?" button (beside cloud/settings).
- Help page: a new standalone HTML page following the existing per-page pattern.
- Welcome: a full-screen overlay gated by a `localStorage` flag, mounted from `app.js` init (D-09, D-15).
- Tour engine: a new module modeled on `demo-hints.js` but decoupled from the iframe gate, bound to stable `data-tour` anchors with text fallbacks (D-11).

</code_context>

<specifics>
## Specific Ideas

- **Welcome trigger/dismissal logic (D-15):** Full-screen welcome fires once on first launch after activation, gated by a `localStorage` flag (e.g. `sg.welcomeSeen`). Either "I'll explore myself" OR completing the tour sets the flag — permanently dismissed thereafter; re-open only via the "?" entry point. **Existing users upgrading into the version that introduces this DO see it once** (flag absent ⇒ treat as first-run) so established therapists also discover the new help.
- The workflow spine is the *organizing principle*, not just a section — every feature is introduced where it's used in running a real session.
- "Customized session sections on/off per therapist's own workflow" is a flagship personalization story to lead with — not buried as an option.
- Per-session export framed around the therapist's real needs: "send to your client" and "file in your own records."
- Tour copy must survive RTL + 4 languages: prefer short, anchor-light steps; every step degrades to "here's what to do + take me there."
- Welcome copy: warm, calm, therapist-audience, non-technical voice (Sapir is the reference user).
- Research tone target: the warmth of calm/wellness apps + the clinician-domain fit of practice-management apps — explicitly NOT generic SaaS product-tour energy.

</specifics>

<deferred>
## Deferred Ideas

- **Production implementation** of the help system (build the Help page, the full-screen welcome, the tour engine, and the "?" entry point) — its own follow-up phase per D-08. Phase 26 stops at design contract + mockup + EN content outline.
- **HE / DE / CS translation** of help content — after the EN content stabilizes (ROADMAP out of scope until then; authorship path in D-12).
- **Unifying the marketing demo with in-app help** (shared engine + shared content source) — explicitly rejected for now per D-13; revisit only if demo↔product drift becomes a real problem.
- **Per-screen "?" panels as a distinct distributed help system** — not chosen; deep-links *into* the single Help page are acceptable, but a separate per-screen help system is not built.
- **Promoting `demo-hints.js` itself / decoupling its iframe gate for the marketing demo** — out of scope; the demo stays exactly as-is (D-13).
- **Marketing-site copy / landing-page redesign** — ROADMAP out of scope (landing page already exists).
- **Video walkthroughs / external docs site** — ROADMAP out of scope.

</deferred>

---

*Phase: 26-in-app-onboarding-overview-help-system*
*Context gathered: 2026-05-16*
