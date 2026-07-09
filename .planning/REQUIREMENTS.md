# Requirements: Sessions Garden — Milestone v1.3 "In-App Help, Onboarding & Changelog"

**Defined:** 2026-07-07
**Core Value:** Therapists can efficiently track client sessions, trapped emotions, and clinical progress without any technical setup, internet connection, or data leaving their device.

Scope source: `.planning/milestones/v1.3-CONTEXT.md` (Ben's brief, confirmed 2026-07-07) + `.planning/research/` (v1.3 research pass, 2026-07-07). Phase 26's archived design (`26-UI-SPEC.md`, D-01..D-15) is the design seed, verified and adapted against the current app — not implemented blindly.

Cross-cutting quality bar (applies to every requirement below, per TS-12): all new surfaces use `tokens.css` semantic tokens only, logical CSS properties (RTL-safe), `[data-theme="dark"]` aware, all copy `data-i18n`-keyed with EN canonical and keys present in all 4 locale files, current display terminology (Heart-Wall, Session Format), no emojis in UI copy unless decided otherwise for the changelog register (open question).

Content quality bar (Ben, 2026-07-07): ALL new user-facing copy (help, welcome, tour, changelog, install nudge) is verified by a **native-speaker agent review** (AI agent, not a human) before ship, and must match the app's established voice/DNA — calm, warm, garden-branded, practitioner-centered (see `.claude/SessionsGarden-DNA-EN-15.05.2026.md` + the 26-UI-SPEC tone/copywriting contract). Sapir remains the clinical-accuracy/tone reviewer (D-12); the agent review is the language-quality verifier.

## v1 Requirements

### Help Center (HELP)

- [x] **HELP-01**: User can reach Help from any app page via a persistent "?" icon in the header (beside cloud + gear; mirrors the settings-gear mount pattern: 44×44 target, RTL auto-flip, dark-aware, `.is-active` state)
- [x] **HELP-02**: User can browse a standalone help-center page (`help.html`, per-page pattern with nav entry + shared footer) any time, with anchor deep-links to individual topics
- [x] **HELP-03**: User finds help organized by workflow (7-step spine: add client → start session → capture emotions → Heart-Wall → severity → review & export → overview), with a "make it yours" personalization section led early and a clearly separated technical-tips track
- [x] **HELP-04**: User can read EN help content covering every leaf of the Phase 32 topic tree plus the post-inventory delta (session formats incl. custom, date-format personalization, filters/sorting, next-session date, report-a-problem, updates) — drafted by Claude from real app behavior, verified by a native-speaker agent review, reviewed by Sapir, in current terminology
- [x] **HELP-05**: User hitting an empty state (e.g. no clients yet) sees coaching copy with a deep-link into the matching Help topic
- [x] **HELP-06**: User can find per-browser PWA install instructions in Help (Chrome/Edge address-bar icon; iOS Safari Share → Add to Home Screen, illustrated; Android menu → Install) — never a fake universal install button
- [x] **HELP-07**: User can open Help fully offline on an installed PWA (new pages/assets added to `sw.js` precache, verified by a static test + real offline navigation)

### Onboarding & First-Run (ONBD)

- [x] **ONBD-01**: User sees a full-screen branded welcome overlay on first app launch after activation, offering two first-class choices — "Take the guided tour" / "I'll explore myself" — firing exactly once (one-shot localStorage flag; Esc dismisses; either choice or tour completion sets it)
- [x] **ONBD-02**: User can re-open the welcome/tour any time from the "?" entry — it never auto-re-fires
  - *Note (Phase 41 gap-closure, 2026-07-08 — Ben's decision):* the Phase-40 D-17 "?"-menu welcome-replay entry (the redundant welcome-screen replay row) was **retired** as UAT gap 8 — two onboarding-replay rows (welcome-screen replay + guided tour) confused practitioners. The first-run welcome overlay and `AttentionCoordinator`'s welcome-open path are **unchanged**; only the menu caller was removed. The "?" popover now offers the replayable guided tour ("Onboarding Tour") as the single onboarding-replay entry. ONBD-02 stays **Complete** — its first-run + re-open-via-tour contract still holds; only the redundant welcome-screen replay row is gone. (Reverses the Phase-40 D-17 / ONBD-02 menu-replay slice; history preserved as this note.)
- [x] **ONBD-03**: User never sees competing surfaces stack on one launch — a single first-run coordinator enforces a written precedence order across welcome, What's-New, security note, install nudge, and the iOS banner (exact order + upgrader-vs-fresh-install handling decided in discuss-phase)
- [x] **ONBD-04**: User who hasn't installed the PWA gets one friendly, dismissable, non-nagging install affordance (dismissal remembered; per-browser aware; replaces/reconciles the existing per-session iOS banner)

### Guided Tour (TOUR)

- [x] **TOUR-01**: User can take a replayable guided tour (12 steps, settings-first arc per 41-STORYLINE.md v3 — originally ~6–9; count cap released by Ben 2026-07-09), launched only by explicit choice (welcome CTA or "?") — never auto-run; tour copy speaks in the app's voice/DNA (calm, warm, garden-branded — not generic SaaS tour energy), native-speaker-agent verified
- [x] **TOUR-02**: Every tour step degrades gracefully — anchor present & visible → spotlight + tooltip; anchor missing/hidden → centered modal with the same text + a working "Take me there" link — never a silent skip (testable: remove any anchor → fallback renders; anchor-presence test guards rot)
- [x] **TOUR-03**: User's tour survives cross-page navigation — steps that live on another page navigate there and resume (sessionStorage state)
- [x] **TOUR-04**: User switching language mid-tour sees the tour re-render cleanly in the new language and direction (`app:language` event; RTL mirroring verified in real WebKit, not jsdom alone)

### In-App Changelog (CHLG)

- [ ] **CHLG-01**: User opening the app after a version change sees a "What's New in vX.Y.Z" popup exactly once — keyed on `APP_VERSION` vs a stored last-seen version, suppressed on the very first-ever launch (welcome owns first-run), dismiss records the version, works fully offline
- [ ] **CHLG-02**: User can browse a persistent changelog page inside the help center — reverse-chronological, grouped by version + release date, plain-language benefit-led entries (New / Improved / Fixed register, no dev jargon)
- [ ] **CHLG-03**: One structured, i18n-capable in-app data source drives both the popup (latest entry) and the page (history) — never forked, never scraped from git, no second version constant
- [ ] **CHLG-04**: v1.3's own release notes ship as the first changelog entry (self-hosting proof of the pipeline; backfill depth decided in discuss-phase)

### Docs-Maintenance Hard Gate (GATE)

- [ ] **GATE-01**: A phase/ship containing user-facing changes CANNOT complete until a changelog entry exists for those changes AND affected help topics were updated or explicitly marked unaffected — the gate blocks loudly, it does not warn
- [ ] **GATE-02**: Enforcement is layered — fast local git hook (committed `.githooks/`, shared script) + a CI step in the deploy workflow (the unbypassable layer) + a GSD definition-of-done gate
- [ ] **GATE-03**: A written, checkable definition of "user-facing change" (path-based heuristic) governs the gate, with a logged escape hatch for genuine emergencies (never silent `--no-verify` culture)
- [ ] **GATE-04**: The gate hooks the existing release habit — the hand-set `APP_VERSION` bump in `assets/version.js` is the release moment a changelog entry must exist for; the gate is validated against v1.3's own ship

### Localization (L10N)

- [ ] **L10N-01**: All v1.3-authored user-facing copy (help body, welcome overlay, tour, changelog/What's-New) reads natively in HE/DE/CS — agent translation after the EN corpus stabilizes (post-P42, one pass) → native-speaker agent gates (Sonnet) → Sapir human read for Hebrew (CS ships on the Phase-37 accepted-risk precedent); per-locale integrity tests mirror `tests/39-help-integrity.test.js`. *(Moved from v2 deferral into v1.3 scope by Ben, 2026-07-08 — EN-only help was never the intent for a Hebrew-first user base. Phase 42.1.)*

## v2 Requirements

Deferred to future releases. Tracked but not in the current roadmap.

### Help depth

- **HDEP-01**: Troubleshooting decision tree ("I don't see my clients" → cache vs truly lost) beyond the plain troubleshooting topics shipping in HELP-04

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Rich-text editor (changelog authoring or notes) | Deferred to v1.4 by explicit decision (V13-1) |
| Email/push release announcements or any comms infrastructure | No consented email channel exists by design; in-app is the GDPR-safe channel (AF-11) |
| Per-screen distributed "?" help panels | Fragments the single source of truth; deferred in Phase 26; quick help = deep-links + empty-state coaching (AF-7) |
| Forced/auto-launching tour or blocking tutorial walls | Anti-features for a calm, non-technical audience (AF-1/AF-8) |
| Marketing/demo changes (landing page, demo.html, demo seed) | Untouched per D-13; publishing demo videos is marketing work, not this milestone |
| Vendoring Shepherd.js / Intro.js | AGPL-3.0 — incompatible with a closed-source paid product (AF-10, re-verified 2026-07-07) |
| "Codebase Health II" (broader extraction/coverage) | Separate backlog milestone candidate; superseded for the v1.3 slot |
| License re-validation / phone-home hardening | Separate backlog item, unrelated |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HELP-01 | Phase 39 | Complete |
| HELP-02 | Phase 39 | Complete |
| HELP-03 | Phase 39 | Complete |
| HELP-04 | Phase 39 | Complete |
| HELP-05 | Phase 39 | Complete |
| HELP-06 | Phase 39 | Complete |
| HELP-07 | Phase 39 | Complete |
| ONBD-01 | Phase 40 | Complete |
| ONBD-02 | Phase 40 | Complete |
| ONBD-03 | Phase 40 | Complete |
| ONBD-04 | Phase 40 | Complete |
| TOUR-01 | Phase 41 | Complete |
| TOUR-02 | Phase 41 | Complete |
| TOUR-03 | Phase 41 | Complete |
| TOUR-04 | Phase 41 | Complete |
| CHLG-01 | Phase 42 | Pending |
| CHLG-02 | Phase 42 | Pending |
| CHLG-03 | Phase 42 | Pending |
| CHLG-04 | Phase 42 | Pending |
| L10N-01 | Phase 42.1 | Pending |
| GATE-01 | Phase 43 | Pending |
| GATE-02 | Phase 43 | Pending |
| GATE-03 | Phase 43 | Pending |
| GATE-04 | Phase 43 | Pending |

**Coverage:**

- v1 requirements: 23 total
- Mapped to phases: 23 ✓
- Unmapped: 0 ✓

Per-phase requirement counts: Phase 39 (7) · Phase 40 (4) · Phase 41 (4) · Phase 42 (4) · Phase 43 (4).

---
*Requirements defined: 2026-07-07*
*Last updated: 2026-07-07 — traceability mapped during roadmap creation (Phases 39–43)*
</content>
