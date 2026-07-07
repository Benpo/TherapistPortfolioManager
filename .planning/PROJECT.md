# TherapistPortfolioManager

## What This Is

A browser-based session management app for Emotion Code / Body Code practitioners. Tracks clients, sessions, trapped emotions, severity ratings, Heart-Wall (חומת הלב) progress, and generates reports, including a brand-redesigned client-facing PDF export. Vanilla HTML/JS/CSS app with IndexedDB storage, garden-themed design, dark mode, 4-language support (EN/HE/DE/CS), AES-256-GCM encrypted `.sgbackup` backups, legal compliance, and a marketing landing page. A canonical local-time date engine (no UTC off-by-one) drives every date surface, with a Personalization tab for date format + session types. Now backed by a `package.json`/`npm test` suite (131 tests) and a decomposed, self-documenting `assets/*.js` codebase. Live and sold since v1.1 (2026-06-22); v1.2 Codebase Health & Reliability shipped 2026-07-07.

## Core Value

Therapists can efficiently track client sessions, trapped emotions, and clinical progress without any technical setup, internet connection, or data leaving their device.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Client CRUD with photo upload — v1.0
- ✓ Session CRUD with trapped emotions tracking — v1.0
- ✓ Multi-issue severity tracking (before/after, 0-10 scale per issue) — v1.0
- ✓ Heart Shield tracking across sessions — v1.0
- ✓ Body Code notes per session — v1.0
- ✓ Session browsing with filters (by client, date range) — v1.0
- ✓ Reporting page with 6 KPIs — v1.0
- ✓ Copy-to-clipboard Markdown export — v1.0
- ✓ Read mode for viewing past sessions — v1.0
- ✓ Inline client creation during session add — v1.0
- ✓ "Save client & create first session" flow — v1.0
- ✓ RTL support (Hebrew) — v1.0
- ✓ 4-language UI (EN/HE/DE/CS) — v1.0
- ✓ Zero network calls, works from file:// protocol — v1.0
- ✓ IndexedDB storage with migration infrastructure — v1.0
- ✓ Client types: Adult / Child / Animal / Other — v1.0
- ✓ Client referral source tracking — v1.0
- ✓ Client search by name — v1.0
- ✓ Daily greeting with inspirational quotes — v1.0
- ✓ Design tokens + garden theme + dark mode — v1.0
- ✓ CSS logical properties (RTL-safe) — v1.0
- ✓ Legal disclaimer/T&C gate with Widerrufsrecht — v1.0
- ✓ License key access gating — v1.0
- ✓ PWA service worker for offline — v1.0
- ✓ Marketing landing page with botanical design — v1.0
- ✓ ZIP-based backup with photo support — v1.0
- ✓ Backup reminder system — v1.0

<!-- v1.1 — Final Polish & Launch (shipped 2026-06-22) -->

- ✓ Terminology מפגש/לקוח (non-clinical energy-healing framing) across 4 languages — v1.1
- ✓ Heart Shield session-level redesign — removal tracking, client-table icon, session-type filter — v1.1
- ✓ Photo crop/reposition after upload; edit-client shortcut from add-session — v1.1
- ✓ Garden decorations in app UI; final leaf logo + app icon — v1.1
- ✓ Editable session section titles via Settings page — v1.1
- ✓ Text-snippet / quick-paste engine with autocomplete + management UI — v1.1
- ✓ Client-facing PDF export (RTL Hebrew via bidi) + Markdown + Web Share — v1.1
- ✓ Consolidated Backup & Restore modal (scheduled backup, test-password, awareness signals) — v1.1
- ✓ AES-256-GCM encrypted backup export/import — v1.1
- ✓ Full legal content — Impressum + Datenschutz, 4 languages, German DDG §5 authoritative — v1.1
- ✓ Lemon Squeezy product live + post-purchase activation/deactivation flow — v1.1
- ✓ Cloudflare Pages deployment (live) — v1.1
- ✓ In-app onboarding/help — design contract only (`26-UI-SPEC.md`); build deferred — v1.1

<!-- v1.2 — Codebase Health & Reliability (shipped 2026-07-07) -->

- ✓ VER-01..06 — Verified Safari PWA update fix; single `version.js` source → footer + SW cache + runtime integrity self-check; CSP→HTTP header; cache TTL raised; fully offline — v1.2 (Phase 28, shipped v1.2.1)
- ✓ OBS-01..03 — Zero-network IndexedDB crash log; "Report a problem" copy-to-clipboard flow; IDB migration reset & recover escape hatch — v1.2 (Phase 29)
- ✓ TEST-01..04 — First `package.json` + `npm test`; 7 PDF tests fixed; RTL regression guard; pre-refactor behavior tests on the god modules — v1.2 (Phase 30)
- ✓ RFCT-01..03 — `settings.js` (2,827→~1,000L) and `add-session.js` (2,173→~1,500L) decomposed into IIFE modules behind the green test net; `openDB()` pooling + `innerHTML`→DOM hardening — v1.2 (Phase 31)
- ✓ DOCS-01 — In-repo maintainer README (operational-first, truth-checked recipes, repo-only/not published) — v1.2 (Phase 32)
- ✓ DOCS-02 — Code-comment pilot on the 5 refactored modules (four-slot responsibility banners + de-phase-numbering, comments-only-proven) — v1.2 (Phase 32)
- ✓ I18N-01/02 — 13 export-modal keys translated to native German/Czech via the AI native-translation panel — v1.2 (Phase 33)
- ✓ PDFX-01/02 — Client-facing session PDF redesigned in the Sessions Garden brand; session number is a derived chronological ordinal (renumber-safe); Hebrew RTL/bidi preserved — v1.2 (Phase 34)
- — PDFX-03 — DESCOPED (invalid premise: export is only reachable in read mode on an already-saved session, so no dirty-export path exists to guard) — v1.2 (Phase 34)
- ✓ DEMO-01..11 — Demo home chrome/seed/version brought back to parity with the shipped app; demo-hints.js removed; export/license controls locked down in demo mode — v1.2 (Phase 35)
- ✓ DOCS-03 — Four-slot comment banners extended to ~22 core production modules (3 giants — `backup.js`/`app.js`/`pdf-export.js` — deferred to a future batch-3) — v1.2 (Phase 36)
- ✓ DATE-01..07, PERS-01..08 — Canonical local-time `window.DateFormat` engine (kills the UTC off-by-one); Personalization Settings tab with 6 date formats; two-tier session-type list (5 locked + custom) — v1.2 (Phase 37)
- ✓ TERM-01/02, FILT-01..04, LEGAL-01 — "Session Type"→Session Format / "Heart Shield"→Heart-Wall relabel; Session Format multi-select + Heart-Wall toggle filters on Overview/Sessions; header-sort↔dropdown sync; trademark/affiliation disclaimer — v1.2 (Phase 37)
- ✓ NEXT-01..08 — Optional next-session date field (native date input, session-relative `min`), sortable/overdue-aware Overview column, PDF/markdown export, demo + backup parity — v1.2 (Phase 38)

### Active

<!-- v1.3 In-App Help, Onboarding & Changelog — scope confirmed 2026-07-07. Full brief: .planning/MILESTONE-CONTEXT consumed into REQUIREMENTS.md/ROADMAP.md. -->

- [ ] Help system — "?" entry point, help center page, welcome overlay, replayable guided tour, empty-state coaching, install nudge, full EN help content for the current feature set (Phase 26 design as the seed, reconciled against the current app — not blindly implemented)
- [ ] In-app changelog — "What's New" popup on version change + persistent changelog page in the help center, structured in-app data, v1.3's own release notes as the first entry
- [ ] Docs-maintenance hard gate — a blocking process guardrail (hook and/or GSD definition-of-done gate) so no user-facing change ships without an updated changelog entry + help topics

**Deferred to backlog (v1.1 close + 2026-06-22 concerns triage + v1.2 close):** mobile `21-03`; landing DE/CS verify (LNCH-04); license re-validation; pagination; PDF→Web Worker; an abandoned landing-page interactive-demo iframe idea (superseded by Phase 35); and other triaged concerns — see ROADMAP "Backlog" for the full list.

**Backlog candidate — "Codebase Health II" (surfaced during Phase 30, 2026-06-26; superseded for the v1.3 slot by Help/Changelog above, still valid as a later milestone):** broader test-coverage gaps in large untouched files (`app.js` 1,474L/6 tests, `license.js` 568L/0 tests) and further extraction candidates among the remaining 4-digit files (`backup.js`, `app.js`, `pdf-export.js`, `db.js`) + an app-wide glue-duplication sweep. Full scoping in `todos/pending/2026-06-26-broader-extraction-and-test-coverage-health.md`.

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Backend / server-side storage — local-only model is the core value proposition and eliminates GDPR processor obligations
- Real-time sync between devices — contradicts local-only model
- OAuth / social login — no backend to handle it, email/password not needed for local app
- Mobile native app — web-first, reassess after v1 sales
- Video or file attachments beyond photos — storage/complexity concerns for local app

## Context

**Two codebases analyzed**: The current vanilla JS app (this repo) is the base. A second React/Lovable app (github.com/SapirBenpo/sessiongardenem) serves as design reference and feature source. Decision: keep vanilla codebase, adopt Lovable's garden design and select features.

**Lovable app weaknesses to avoid**: localStorage (5-10MB limit), shallow clinical model, 40+ npm dependencies, modal-only UX, external API call (ipify.org for IP collection — privacy/GDPR concern).

**Legal research completed**: Comprehensive analysis in `.planning/research/` covers GDPR Article 9, German BDSG, Section 203 StGB. Key finding: local-only app = zero GDPR processor obligations, just a software vendor. EUR 0-500 worst case compliance cost.

**Development workflow**: Single-owner + AI-agent loop — Ben drives Claude Code (cloud and local) as the development engine. The GitHub repo is both the single source of truth and the agent context (the in-repo `README.md` is the canonical maintainer guide). No multi-machine human collaboration.

**Two audiences, kept separate** (P32 D-01): (1) **Customers / product users** = non-technical Emotion Code / Body Code practitioners — the product UX stays approachable for them (unchanged). (2) **Maintainer / developer** = Ben (drives Claude Code; comfortable with terminal/git/architecture-at-concept, not a daily JS author) + AI agents. Sapir is the **business / Gewerbe / domain / legal owner**, not a hands-on developer.

**Business model**: One-time purchase (EUR 119). Hosted on Cloudflare Pages (free). Payments via Lemon Squeezy (MoR, 5% + $0.50/sale). Sold under Sapir's Gewerbe.

**Codebase state after v1.2 (2026-07-07)**: ~29.4k LOC across `assets/*.js`/`*.css` + ~5.5k LOC root HTML. First-ever `package.json` (devDeps-only, jsdom) backs a 131-test `npm test` suite (behavior/characterization tests executing real modules, not source-slicing). `settings.js`/`add-session.js` decomposed from god-modules into page-private IIFE extractions (`settings-snippets.js`, `settings-photos.js`, `export-modal.js`). ~22 core production modules carry four-slot banner comments (the 3 largest — `backup.js`/`app.js`/`pdf-export.js` — deferred to a future batch-3). A canonical `assets/date-format.js` engine is the single date-parsing/formatting choke point app-wide. Zero runtime npm dependencies in production still holds.

## Constraints

- **Tech stack**: Vanilla HTML/CSS/JS, zero npm dependencies — keep the simplicity
- **Data storage**: IndexedDB only, no external calls, no backend
- **Languages**: 4 required (Hebrew RTL, English, German, Czech)
- **Workflow**: GitHub-tracked; AI-assisted single-owner workflow (Ben + Claude Code)
- **Cost model**: One-time sale — hosting/distribution costs must be minimal recurring
- **Legal**: EU/German compliance per existing research, local-only model
- **Maintainer**: Ben (solo, AI-assisted) + Claude Code agents; the in-repo `README.md` is the canonical maintainer guide. (Product UX still approachable for non-technical customers.)

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep vanilla JS codebase as base | IndexedDB scales, deep clinical model, zero deps, ~50KB | ✓ Shipped v1.0 |
| Adopt Lovable's garden design system | Professional look, warm/approachable for therapists | ✓ Shipped v1.0 |
| Local-only data (no backend) | Eliminates GDPR processor burden, simplifies everything | ✓ Shipped v1.0 |
| Session field model | Consolidated with Sapir's input in Phase 3 | ✓ Shipped v1.0 |
| Distribution platform | Cloudflare Pages — free, global CDN, zero maintenance, GDPR compliant (EU-US DPF) | ✓ Decided Phase 4, confirmed 2026-03-24 |
| Payment solution | Lemon Squeezy — MoR model, handles EU VAT, 5% + $0.50/sale, license key generation | ✓ Decided Phase 4 |
| All 4 languages in v1 | Target market spans Hebrew, English, German, Czech speakers | ✓ Shipped v1.0 |
| Dark mode required for v1 | User requirement | ✓ Shipped v1.0 |
| Terminology: "session/client" not "treatment/patient" | Non-clinical framing for energy healing practitioners | ✓ Shipped Phase 8 |
| Heart Shield at session level, not client level | Clients transition from Heart Shield to regular sessions without reopening files | ✓ Shipped Phase 9 |
| Sold under Sapir's Gewerbe | Ben's employment contract requires HR approval for Nebentätigkeit; Sapir is co-creator, no employment blockers | ✓ Decided 2026-03-24 |
| Close v1.1; defer mobile (P21) + help-build (P26) to backlog | App is live and sold; trailing nice-to-haves shouldn't hold the milestone open. Mobile not a launch blocker; help design is done and archived | ✓ Decided 2026-06-22 |
| v1.2 = Codebase Health & Reliability (not features) | Maintainability is the burning constraint: 2.8k/2.2k-line god modules, thin docs, unreliable Safari PWA updates, test gaps | ✓ Scope locked 2026-06-22 — Phases 28–33 |
| v1.2 runs in dependency order, not stated-priority order | Tests must precede the refactor (safety net); PWA update delivery must work first or no fix reaches installed users; docs describe the *refactored* code | ✓ Order P28→P33, agreed 2026-06-22 |
| Real footer version + runtime integrity check (reverses 2026-06-14 "leave placeholder") | A version label is only useful if it can't lie; the v209 cache incident proved the bare label lies. One source drives footer + cache + a loaded-code self-check. Offline-safe (no phone-home) | ✓ Shipped P28 (v1.2.1) |
| License re-validation → backlog (not v1.2) | Would harden the trivially-bypassed paywall but adds a phone-home to an offline-first app; revisit only if piracy is observed | ✓ Deferred 2026-06-22 |
| Zero-dependency rule applies to PRODUCTION code only; dev/test tooling may use npm freely | Cloudflare ships static `/assets/*`, never `node_modules` — dev deps (e.g. jsdom for PDF tests) never reach customers, so they don't compromise the ~50KB zero-runtime-dep production bundle | ✓ Decided 2026-06-26 (Phase 30 discuss) — first `package.json` (devDeps-only) lands in P30 |
| README is repo-only maintainer guide, not published | Removed `cp README.md` from deploy.yml (D-04) so deploy/maintenance detail never reaches the product URL; the CF copy was unlinked, no loss. Only production-adjacent change in P32 | ✓ Shipped Phase 32 |
| Code-comments done as a tight 5-file pilot + coverage map, not an all-files sweep | A blanket sweep risks staleness/accuracy errors on untouched files; the pilot establishes the reusable convention (four-slot banner + de-phase-numbering, comments-only-diff guardrail) and a coverage map makes a templated "comments batch-2" phase plannable. Ends the comment-topic drag carried since ~P29 | ✓ Shipped Phase 32 — batch-2 deferred within v1.2 |
| Maintainer reframe to Ben + agents (D-01/D-02) | Docs/dev are calibrated for Ben (drives Claude Code) + AI agents, not a non-technical Sapir; README rewritten in-repo as agent context (D-03) and no longer published at the product URL (D-04). Product UX stays approachable for non-technical customers (two audiences kept separate) | ✓ Decided 2026-06-28 (P32 discuss); PROJECT.md reframed 2026-06-29 |
| v1.2 tail added after the initial lock (P34–P38) | PDF export visual polish, demo refresh, comments batch 2, date-engine/personalization, and next-session-date were all surfaced as real needs (UAT + Ben work orders) during v1.2 execution, not scope creep from a stalled milestone | ✓ Added 2026-06-29 (P34–37) / 2026-07-06 (P38, promoted from backlog) — all shipped |
| "Session Type"→Session Format / "Heart Shield"→Heart-Wall terminology relabel folded into Phase 37 | UAT surfaced "Session Type" meaning 3 different things (modality axis, filter, DB field); Heart-Wall is closer to Discover Healing's own branding. Values/keys unchanged — labels only, no data migration | ✓ Shipped Phase 37, 2026-07-05 decision |
| Trademark/affiliation disclaimer added (LEGAL-01) | Sessions Garden references Emotion Code®/Body Code™/Heart-Wall® descriptively; a short non-affiliation notice reduces trademark risk with Discover Healing / Wellness Unmasked, Inc. | ✓ Shipped Phase 37 (EN canonical; he/de/cs flagged DRAFT pending native-speaker review) |
| v1.2 close: acknowledge 16 pre-close audit items rather than resolve each individually | All 16 (1 debug session, 10 quick tasks, 5 todos) were either done-but-unflagged bookkeeping, an explicit won't-fix, a genuinely abandoned pre-v1.2 idea, or already-tracked backlog — none were new v1.2 gaps. Resolving each would have re-litigated already-closed work | ✓ Ben chose "Acknowledge all, proceed" 2026-07-07 — detail in STATE.md "Deferred Items (acknowledged at v1.2 close)" |
| v1.3 = Help + Changelog (not "Codebase Health II") | The app is feature-large with zero in-app teaching surface and no release-announcement channel; Phase 26's UI-SPEC is already approved and ready to build. Codebase Health II remains a valid later-milestone backlog candidate | ✓ Decided 2026-07-06, see `.planning/MILESTONE-CONTEXT.md` |

## Current State

**v1.2 Codebase Health & Reliability shipped 2026-07-07** (Phases 28–38, 11 phases / 82 plans / 108 tasks, 15 days, 550 commits). Full detail archived in `milestones/v1.2-ROADMAP.md` / `milestones/v1.2-REQUIREMENTS.md` / `milestones/v1.2-MILESTONE-AUDIT.md`. Milestone audit passed: 64/65 requirements complete (1 deliberately descoped), 11/11 phases verified, zero broken cross-phase wiring, 131/131 tests green. The app is live and sold (since v1.1, 2026-06-22) and is now backed by a real test safety net, a decomposed codebase, self-documenting core modules, and a canonical date engine — the maintainability debt that motivated v1.2 is substantially paid down (3 giant files still await a future comment/extraction pass, tracked as backlog).

## Current Milestone: v1.3 In-App Help, Onboarding & Changelog

**Goal:** Every practitioner can learn the whole app inside the app (welcome, replayable tour, help center) and hears about every release inside the app (What's-New popup + changelog page) — with a hard process gate guaranteeing both stay current with every future user-facing change.

**Target features:**
- Help system: "?" header entry on all app pages, `help.html` help center (workflow-spine IA + personalization + technical track), first-run welcome overlay, replayable ~6–9-step tour with graceful degradation, empty-state deep-links, per-browser PWA install nudge, full EN help content covering the current (v1.2.x) feature set
- In-app changelog: What's-New popup keyed on `APP_VERSION` change + persistent changelog page in the help center; structured in-app data source; v1.3's own release notes ship as the first entry
- Docs-maintenance hard gate: a BLOCKING mechanism (git hook and/or GSD DoD gate) — no phase/ship containing user-facing changes completes until the changelog entry + affected help topics are updated; slower dev accepted

**Key context:** Phase 26's `26-UI-SPEC.md` + D-01..D-15 are the design seed, verified and adapted against the current app (terminology renames, deleted tour-engine template, post-P26 features, first-run collisions — full reconciliation was done 2026-07-06). Open design questions (help-page IA variant, tour anchors, popup mechanics, gate mechanism, first-run precedence, etc.) are decided in discuss-phase, not pre-answered. Hard constraints hold: zero-network/offline, zero production deps (bespoke tour engine), 4 languages + RTL (EN content canonical; DE/CS/HE translation deferred). Two pending todos are absorbed and close at ship: `2026-03-24-pwa-install-guidance-and-user-manual`, `2026-05-15-in-app-onboarding-overview-help`.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-07 — Milestone v1.3 "In-App Help, Onboarding & Changelog" started via `/gsd-new-milestone`. Scope confirmed by Ben: three pillars (help system, in-app changelog, docs-maintenance hard gate), with the Phase 26 design treated as a reconciled seed rather than a verbatim contract. Supersedes the old "v1.3 Codebase Health II" pencil-in (that work stays backlog). Rich-text editor deferred to v1.4.*
