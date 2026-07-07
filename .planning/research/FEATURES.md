# Feature Research

**Domain:** In-app help, first-run onboarding, PWA install guidance & release-communication (changelog / What's-New) for a calm, offline-first, RTL-capable PWA used by non-technical energy-healing practitioners
**Researched:** 2026-07-07
**Confidence:** HIGH (behavior semantics corroborated across current 2025–2026 sources + the app's own Phase 26 design pass; MEDIUM on exact competitor tour *mechanics*, which are inferred from public material)

> **Scope note.** This milestone adds *teaching + communication* surfaces to an app whose core features already ship (client/session CRUD, emotions, Heart-Wall, severity, snippets, PDF/MD export, encrypted backups, KPIs, personalization, license activation, demo mode). The tables below are ONLY about the new help/onboarding/changelog/install surfaces — the core product is out of scope.
>
> **Prior art.** Phase 26 (`.planning/milestones/v1.1-phases/26-…/26-RESEARCH.md` + `26-UI-SPEC.md`, D-01..D-15) already locked the help-system shape (persistent Help page + replayable tour + "?" entry + welcome overlay + empty-state coaching) and did the tour-engine license/RTL/dark analysis. That analysis re-verifies as **still correct** in 2026 (self-paced non-forced onboarding is current best practice; iOS still has no `beforeinstallprompt`). This file **does not re-litigate** it — it (a) confirms it against current sources, (b) fills the two surfaces Phase 26 under-specified (What's-New popup + changelog page), and (c) reframes everything as table-stakes / differentiator / anti-feature per surface for the scoping conversation.

## Feature Landscape

The four surfaces this milestone touches:
- **A. Help system** — "?" entry, help-center page, empty-state coaching links
- **B. First-run welcome + guided tour** — welcome overlay, replayable tour
- **C. Changelog / What's-New** — version-change popup + persistent changelog page
- **D. PWA install nudge** — per-browser install guidance

### Table Stakes (Users Expect These)

Missing these = the surface feels broken or the app feels neglected. Users give no credit for having them, but penalize their absence.

| # | Feature | Surface | Why Expected | Complexity | Depends on (existing app surface) |
|---|---------|---------|--------------|------------|-----------------------------------|
| TS-1 | Persistent, globally-reachable "?" entry point | A | Help must be findable from anywhere, any time — the returning-user path (Phase 26 D-02/D-07) | LOW | `#headerActions` (cloud+gear icons, 44×44, RTL auto-flip); `renderNav()` |
| TS-2 | Help-center page as single source of truth, browsable any time | A | A durable, non-fragile reference is the backbone; overlay tours alone are not enough | MEDIUM | new `help.html` + `assets/help.js` per-page pattern; `SharedChrome`, `renderNav()`, `data-i18n` |
| TS-3 | Workflow/task-organized help content (not a feature catalog) | A | Current help-center norm (SimplePractice "schedule → intake → the 3 setup things"); non-technical users think in tasks, not features | MEDIUM | mirrors real app flow: add client → session → emotions → Heart-Wall → severity → export → overview |
| TS-4 | First-run welcome that offers a choice ("take the tour" / "explore myself") | B | Current onboarding norm is self-paced & non-forced (Calm "respects autonomy"); a forced wall is dated & intimidating for this audience | LOW | `localStorage` one-shot flag, modeled on `showFirstLaunchSecurityNote()` in `initCommon()` |
| TS-5 | Welcome fires **once**, dismiss-persistent, re-openable only from "?" | B | Users expect a welcome not to re-appear every launch; but they expect to find it again on demand | LOW | `localStorage` `sg.welcomeSeen` (absent ⇒ first-run; upgraders see it once, no migration) |
| TS-6 | Empty-state coaching copy ("No clients yet — add your first…") | A | Standard onboarding surface; teaches in place at zero engine risk; app already ships some empty strings (`overview.clients.empty`) | LOW | existing empty-state strings on overview/sessions/clients; deep-link into Help |
| TS-7 | "What's New" popup on version change | C | Since no email channel exists, the in-app popup is the *only* release-announcement channel (GDPR-safe by design) | MEDIUM | `APP_VERSION` from single-source `version.js`; `localStorage` last-seen-version key |
| TS-8 | Popup shows **once per version**, dismiss-on-close | C | Users expect a "what's new" note once after an update, then never again for that version. Re-showing = nagging | LOW | compare `APP_VERSION` vs stored `sg.lastSeenVersion`; set on dismiss |
| TS-9 | Persistent changelog page (full history), reverse-chronological | C | Popup is ephemeral; users expect a place to re-read "what changed" and browse past releases | MEDIUM | lives inside the help center (a `help.html` section or sibling); structured in-app data source |
| TS-10 | Changelog entries grouped by version + date, plain-language | C | "Keep a Changelog" norm: newest on top, version + release date per entry, everyday language, benefit-led | LOW | structured data (version, date, items[]); `data-i18n` for EN-first |
| TS-11 | Per-browser PWA install *instructions* (not a fake button) | D | iOS Safari has **no** programmatic install; a single "Install" button that does nothing is a broken promise | MEDIUM | UA detection; illustrated steps (Chrome/Edge address-bar icon; iOS Share→Add to Home Screen; Android menu→Install) |
| TS-12 | RTL-safe + dark-mode-aware + tokenized styling on every new surface | A/B/C/D | Same product the customer bought; Hebrew is primary. Non-negotiable, and the single most fragile axis | MEDIUM | `tokens.css`, logical properties, `[data-theme="dark"]`, `demo-hints.js` patterns; `app:language` re-render |

### Differentiators (Competitive Advantage)

Not strictly required, but where this product can feel notably calmer/warmer/more trustworthy than generic SaaS. These align with the Core Value (privacy-first, approachable, non-technical).

| # | Feature | Surface | Value Proposition | Complexity | Depends on |
|---|---------|---------|-------------------|------------|------------|
| DF-1 | Replayable guided tour (not one-time), ~6–9 steps, every step degrades gracefully | B | Returning/anxious users can re-run the tour any time; graceful degradation makes it survive RTL + 4 locales + multi-page nav (Phase 26 D-11) | HIGH | bespoke engine on `demo-hints.js` patterns; `data-tour` anchors; `sessionStorage` cross-page state |
| DF-2 | "Data never leaves your browser" told as the *emotional anchor*, not a footnote | A | The privacy-first promise is the core value; making it legible builds trust with this audience | LOW | help content; ties to backups messaging |
| DF-3 | Flagship "make it yours" personalization story surfaced early | A | Customizable session sections/formats + date formats is the differentiator; leading with it teaches the app's warmth (Phase 26 D-04) | LOW | Personalization Settings tab (already shipped v1.2) |
| DF-4 | Backups framed as "you are the only backup" + encrypted-backup how-to | A | Local-only means the user owns their data *and* the risk; teaching this prevents data-loss support tickets | LOW | Backup & Restore modal; cloud-icon recency signal |
| DF-5 | Optional, dismissable, **non-nagging** install nudge (offered, never forced) | D | Calm-style "offered, respects autonomy" beats an aggressive interstitial; converts without annoying | MEDIUM | `beforeinstallprompt` capture (Android/desktop Chromium) + iOS instructional fallback; dismissal memory |
| DF-6 | Empty-state coaching with **deep-links** into the relevant Help topic | A | Turns dead ends into teaching moments, in context (highest-retention onboarding surface) | LOW | empty-state strings + Help page anchors |
| DF-7 | Troubleshooting decision tree ("I don't see my clients" → cache vs. truly lost) | A | Pre-empts the scariest support scenario for a local-only app; reduces panic + tickets | MEDIUM | help content; IndexedDB persistence facts; re-activation flow |
| DF-8 | Warm, calm, clinician-domain tone (not "Let's get you set up! 🚀 Step 1/12") | A/B/C | The tone *is* the brand for this wellness audience (Calm voice + SimplePractice task-structure) | LOW | copy authoring discipline; Sapir review for clinical accuracy |
| DF-9 | Changelog written for practitioners, not developers (benefit-led, no jargon) | C | "Improved" / "New" / "Fixed" in plain language; a dev-style git-log dump would alienate | LOW | curation discipline; separate user-facing entries from internal refactors |

### Anti-Features (Commonly Requested, Often Problematic)

Things that seem helpful but harm a calm, non-technical, privacy-first audience. Documented to prevent scope creep and mis-scoping.

| # | Anti-Feature | Surface | Why Requested / Surface Appeal | Why Problematic | Better Approach |
|---|--------------|---------|-------------------------------|-----------------|-----------------|
| AF-1 | Forced linear first-run tutorial that blocks the app | B | "Make sure they see everything" | Intimidates non-technical users; can't survive RTL/4-locale fragility; dated pattern; feels like a wall | Welcome offers a choice; "explore myself" is first-class (TS-4) |
| AF-2 | Nagging / repeating PWA install banner (re-shows every visit) | D | "Drive installs" | Erodes trust; iOS can't even honor a one-tap install; classic dark-pattern annoyance | One dismissable nudge; remember dismissal; don't re-ask unless engagement rises (per web.dev) |
| AF-3 | A fake universal "Install app" button (no per-browser branching) | D | "Simpler UI" | Does nothing on iOS Safari (no `beforeinstallprompt`) — a broken promise | Per-browser illustrated instructions (TS-11) |
| AF-4 | Full-screen modal changelog that blocks the app until dismissed | C | "They must read it" | Intrusive; users just want to work; especially wrong for a calm tool | Small, dismissable popup/card; full detail lives on the changelog page |
| AF-5 | Dev-style changelog (git commit dump, internal refactor noise, jargon) | C | "Be transparent / complete" | Alienates non-technical practitioners; leaks internal detail; noisy | Curated, plain-language, benefit-led user entries only (DF-9) |
| AF-6 | Multiple onboarding surfaces firing at once on first run (welcome + tour + install + What's-New) | A/B/C/D | Each is individually justified | Overwhelm / cognitive overload; industry rule is **one surface at a time** | Strict first-run precedence order (see Behavior Expectations) |
| AF-7 | Per-screen distributed "?" help panels as a separate system | A | "Contextual help everywhere" | Fragments the single-source-of-truth; multiplies RTL/i18n maintenance surface (Phase 26 deferred) | Deep-link *into* the one Help page (DF-6) |
| AF-8 | Auto-launching the tour on first run without consent | B | "Show them how it works" | Removes autonomy; same failure as AF-1 | Tour is a *choice* from the welcome and a replay from "?" |
| AF-9 | What's-New popup on the very first-ever launch (brand-new user) | C | "Announce the release" | A first-time user has no prior version to diff against; showing "what's new" is meaningless/confusing | Suppress popup when no prior version stored; let the welcome own first-run |
| AF-10 | Vendoring an AGPL tour library (Shepherd.js / Intro.js) | B | "Popular, feature-rich" | AGPL-3.0 obligates source disclosure of a closed-source EUR 119 product; commercial license = recurring cost | Bespoke engine (MIT-clean, zero-dep) on `demo-hints.js` patterns (Phase 26 verdict) |
| AF-11 | Email/push release announcements | C | "That's how SaaS tells users" | No email channel exists by design; would create a GDPR processor obligation the local-only model avoids | In-app What's-New popup + changelog page (the whole reason this pillar exists) |
| AF-12 | Auto-translating help/changelog to HE/DE/CS now | A/C | "4 languages are required" | Machine translation of clinical/tone-sensitive copy risks Hebrew-imperative violations & accuracy errors | EN canonical first; HE/DE/CS in a later phase with native review (Phase 26 D-12) |

## Behavior Expectations (Concrete Semantics)

The scoping conversation needs precise, testable behavior per surface. These are the current-best-practice defaults, corroborated by 2025–2026 sources + Phase 26.

### A. Help system
- **"?" entry:** always present in `#headerActions` on every app page; opens the help center; can also re-launch the welcome/tour. Header-icon is the lean recommendation, but a floating button is an acceptable alternative if the header is too crowded (open question, Phase 26 Q1).
- **Help center:** a normal browsable page — no timing, no gating. Workflow-spine primary + a parallel technical-tips track (backups, export, install, activation/transfer, troubleshooting).
- **Empty-state coaching:** shown whenever a list is empty; pure copy + a "learn how" deep-link; disappears once content exists. Zero engine, RTL-trivial.

### B. First-run welcome + guided tour
- **Welcome trigger:** first launch when `localStorage 'sg.welcomeSeen'` is absent (new users *and* existing upgraders, once). Full-screen, garden-branded, two CTAs.
- **Welcome dismissal:** "explore myself" **or** tour completion sets `sg.welcomeSeen`. Never auto-re-shows. Re-open only via "?".
- **Tour trigger:** only by explicit user action (welcome CTA or "?"). Never auto-runs.
- **Tour step resolution:** anchor present & visible → spotlight+tooltip; anchor missing → **degrade to a centered modal with text + "Take me there" deep-link** (never silently skip). Cross-page step → navigate + resume via `sessionStorage {tourId, stepIndex}`.
- **Tour re-render:** on `app:language` change, cleanup-then-replace (don't strand a tooltip in the old language/position).

### C. Changelog / What's-New
- **Popup trigger:** on app load, if stored `sg.lastSeenVersion` exists **and** differs from `APP_VERSION`. 
- **Popup suppression:** if no `sg.lastSeenVersion` stored (brand-new user / first-ever launch) → **do not show** (AF-9); the welcome owns first-run. Set `sg.lastSeenVersion = APP_VERSION` after the welcome path so the *next* update is the first popup they see.
- **Popup frequency:** exactly **once per version**. Dismiss-on-close sets `sg.lastSeenVersion = APP_VERSION`. Never re-shows for that version.
- **Popup content:** short, scannable, benefit-led summary of the current release + a "See full changelog" link to the page. Small dismissable card/modal — **not** a blocking full-screen wall (AF-4).
- **Changelog page:** reverse-chronological, grouped by version (version + release date header), each version broken into plain-language groups (New / Improved / Fixed — the "Keep a Changelog" categories, de-jargoned). Full history retained (it's tiny; retention signals an actively-maintained product and builds trust). v1.3's own notes ship as the first entry.

### D. PWA install nudge
- **Install nudge trigger:** offered after the user shows engagement (not on first paint); dismissable. On Chromium (Android/desktop): capture `beforeinstallprompt`, `preventDefault()`, show a custom "Install" affordance that calls `prompt()` on click. On iOS Safari: show illustrated Share→Add-to-Home-Screen instructions (no programmatic path).
- **Install nudge dismissal:** remember the dismissal; **do not re-nag** (AF-2). Re-surfacing only on a genuine higher-engagement signal, if at all. The always-available fallback is the Help center's per-browser install section (never gated).

### First-run precedence (the collision rule — AF-6)

When several surfaces *could* fire on the same first/early launch, show **one at a time**, in this order; each must fully resolve before the next is eligible:

1. **Legal/T&C + license gate** (already exists — must pass first).
2. **First-run welcome overlay** (owns the genuine first-ever launch; suppresses the What's-New popup that run — AF-9).
3. **What's-New popup** (only on a *subsequent* launch where the version changed; never same-run as the welcome).
4. **Empty-state coaching** (passive, in-page — appears only once the app is unblocked and a list is empty; doesn't compete as an overlay).
5. **Install nudge** (lowest priority; engagement-gated; never stacks on top of 2–4).

## Feature Dependencies

```
[TS-2 Help center page]
    └──requires──> [help.html + assets/help.js per-page pattern, SharedChrome, renderNav]
                       └──requires──> [data-i18n / App.t() i18n plumbing]

[TS-9 Changelog page] ──lives-inside──> [TS-2 Help center]
[TS-7 What's-New popup] ──reads-from──> [same structured changelog data as TS-9]
[TS-7 What's-New popup] ──requires──> [APP_VERSION single-source version.js]  (already shipped v1.2)

[DF-1 Guided tour] ──requires──> [data-tour anchors added to existing pages]
[DF-1 Guided tour] ──requires──> [bespoke engine on demo-hints.js patterns]  (NOT AGPL lib — AF-10)
[TS-4 Welcome] ──launches──> [DF-1 Guided tour]  (one CTA)
[TS-5 Welcome one-shot] ──requires──> [localStorage sg.welcomeSeen]

[TS-11 Install instructions] ──enhanced-by──> [DF-5 install nudge]
[DF-5 install nudge] ──requires──> [beforeinstallprompt capture (Chromium) + iOS fallback]

[TS-12 RTL/dark/tokens] ──gates──> [ALL new surfaces]  (cross-cutting, non-negotiable)
[First-run precedence] ──conflicts-if-ignored──> [TS-4, TS-7, DF-5, TS-6 firing together]  (AF-6)
```

### Dependency Notes
- **What's-New popup + changelog page share ONE data source.** Author the structured, versioned changelog data once; the popup renders the latest entry, the page renders all. Don't fork them.
- **Changelog page is a *section/sibling* of the help center**, so TS-2 must land before/with TS-9.
- **The tour depends on `data-tour` anchors** being added to existing page HTML — a build-phase touch on shipped pages; enumerate the anchor contract up front (Phase 26 Pattern 2).
- **First-run precedence is a cross-surface constraint, not a feature** — if TS-4/TS-7/DF-5 are built independently without the ordering rule, they collide (AF-6). Bake the precedence into whichever init runs on load.
- **The docs-maintenance hard gate (3rd milestone pillar) depends on the changelog data + help topics existing** — it's a process/tooling gate, out of the user-facing feature tables here, but it presupposes TS-9/TS-2 as the artifacts it guards.

## MVP Definition

### Launch With (v1.3 core)
- [ ] TS-1 "?" entry point — the discoverability backbone; cheap, unblocks everything
- [ ] TS-2 Help-center page — the single source of truth; the durable surface
- [ ] TS-3 Workflow-organized EN help content (current v1.2.x feature set) — the actual value
- [ ] TS-4 + TS-5 First-run welcome (choice-based, one-shot) — the warm front door
- [ ] TS-6 Empty-state coaching — highest ROI teaching per unit effort
- [ ] TS-7 + TS-8 What's-New popup (once-per-version, suppressed on first-ever launch) — the *only* release channel
- [ ] TS-9 + TS-10 Changelog page (reverse-chron, grouped, plain-language) + v1.3 as first entry
- [ ] TS-11 Per-browser install instructions in Help — closes the folded PWA-install TODO
- [ ] TS-12 RTL/dark/token compliance — non-negotiable for this app
- [ ] First-run precedence rule wired — prevents the AF-6 collision on day one

### Add After Validation (within v1.3 if capacity, else fast-follow)
- [ ] DF-1 Replayable guided tour — high value but highest fragility/complexity; the welcome + Help + empty-states already teach without it. Ship if the tour engine + graceful degradation can be done cleanly; otherwise the welcome CTA can open the Help center instead until the tour lands.
- [ ] DF-5 Non-nagging install nudge — the *proactive* affordance on top of the (table-stakes) instructional content
- [ ] DF-7 Troubleshooting decision tree — valuable, but depends on stable install/activation content first

### Future Consideration (v1.4+)
- [ ] HE/DE/CS translation of all help/changelog/welcome/tour copy — after EN stabilizes (AF-12; Phase 26 D-12)
- [ ] Rich-text editor for changelog authoring — explicitly deferred to v1.4 per milestone note
- [ ] Video walkthroughs / external docs site — Phase 26 ROADMAP out of scope

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| TS-1 "?" entry point | HIGH | LOW | P1 |
| TS-2 Help-center page | HIGH | MEDIUM | P1 |
| TS-3 Workflow EN content | HIGH | MEDIUM | P1 |
| TS-4/5 First-run welcome | HIGH | LOW | P1 |
| TS-6 Empty-state coaching | HIGH | LOW | P1 |
| TS-7/8 What's-New popup | HIGH | MEDIUM | P1 |
| TS-9/10 Changelog page | HIGH | MEDIUM | P1 |
| TS-11 Per-browser install instructions | MEDIUM | MEDIUM | P1 |
| TS-12 RTL/dark/token compliance | HIGH | MEDIUM | P1 (cross-cutting) |
| First-run precedence rule | HIGH | LOW | P1 |
| DF-1 Replayable guided tour | MEDIUM | HIGH | P2 |
| DF-5 Non-nagging install nudge | MEDIUM | MEDIUM | P2 |
| DF-7 Troubleshooting tree | MEDIUM | MEDIUM | P2 |
| DF-2/3/4/8/9 Tone & framing | HIGH | LOW | P1 (baked into content) |
| HE/DE/CS translation | HIGH | HIGH | P3 |

**Priority key:** P1 = must have for v1.3 launch · P2 = should have, add when capacity allows · P3 = future consideration

## Competitor Feature Analysis

| Behavior | SimplePractice / Jane (practice-mgmt) | Calm / Insight Timer (wellness tone) | Keep a Changelog / AnnounceKit (release comms) | Our Approach |
|----------|----------------------------------------|--------------------------------------|-----------------------------------------------|--------------|
| Help structure | Task/workflow-organized help center | On-dashboard self-paced checklist | — | Workflow-spine Help page (TS-3) |
| First-run | Sample-data walkthrough | Non-forced, "respects autonomy" | — | Choice-based welcome; explore-myself first-class (TS-4, AF-1) |
| Tour | Short contextual walkthroughs + video | Avoids forced tours | — | Thin ~6–9-step replayable tour, every step degrades (DF-1) |
| What's-New | Modal/toast on update | Gentle, non-blocking | Popup on version change, dismiss once | Once-per-version dismissable card, suppressed on first-ever launch (TS-7/8, AF-9) |
| Changelog | Help-center release notes | — | Reverse-chron, grouped Added/Improved/Fixed, plain language | Same, de-jargoned for practitioners (TS-9/10, DF-9) |
| Install prompt | (native apps) | (native apps) | — | Per-browser instructions + optional non-nagging nudge; iOS Share-sheet taught, not faked (TS-11, DF-5, AF-2/3) |

## Sources

**Prior-art (HIGH — internal, tool-verified in 2026-05):**
- `.planning/milestones/v1.1-phases/26-in-app-onboarding-overview-help-system/26-RESEARCH.md` (tour-engine license/RTL/dark analysis; SimplePractice/Calm/Insight Timer benchmark; iOS install facts; D-01..D-15)
- `.planning/PROJECT.md` (current feature set, constraints, two-audience model, single-source `version.js`)

**Current best-practice corroboration (2025–2026):**
- Product Changelog Guide 2026 — Easydesk — https://easydesk.app/blog/product-changelog
- How to Write a Changelog (2026) — AnnounceKit — https://announcekit.app/guides/how-to-write-a-changelog
- Keep a Changelog — https://keepachangelog.com/en/1.0.0/
- 11 Best Practices for Changelogs — Beamer — https://www.getbeamer.com/blog/11-best-practices-for-changelogs
- Patterns for promoting PWA installation — web.dev — https://web.dev/articles/promote-install
- Trigger installation from your PWA — MDN — https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt
- Making PWAs installable (no `beforeinstallprompt` on iOS) — MDN — https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- Master PWA Installs on iOS & Android: 2025 Guide — https://junkangworld.com/blog/master-pwa-installs-on-ios-android-the-2025-guide
- Onboarding — Fluent 2 Design System (one modal at a time) — https://fluent2.microsoft.design/onboarding
- Onboarding UX Patterns: Empty States — UserOnboard — https://www.useronboard.com/onboarding-ux-patterns/empty-states/
- Mastering Modal UX — Eleken — https://www.eleken.co/blog-posts/modal-ux
- Product tours & first-use onboarding — Intercom — https://www.intercom.com/blog/product-tours-first-use-onboarding/

**MEDIUM/LOW confidence flags:**
- Exact competitor *tour mechanics* (SimplePractice/Jane/Carepatron) inferred from public support/marketing material, not internal access (Phase 26 Assumption A3). Structural/tonal conclusions independently corroborated; specific step-mechanics illustrative only.

---
*Feature research for: in-app help / onboarding / changelog / PWA-install surfaces (Sessions Garden v1.3)*
*Researched: 2026-07-07*
