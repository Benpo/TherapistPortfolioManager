# TherapistPortfolioManager

## What This Is

A browser-based session management app for Emotion Code / Body Code practitioners. Tracks clients, sessions, trapped emotions, severity ratings, Heart Shield (מגננת הלב) progress, and generates reports. Vanilla HTML/JS/CSS app with IndexedDB storage, garden-themed design, dark mode, 4-language support (EN/HE/DE/CS), ZIP backup, legal compliance, and a marketing landing page. Preparing for first paid release.

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

### Active

<!-- v1.1 shipped 2026-06-22. v1.2 scope co-designed & locked with Ben 2026-06-22 (Phases 28–33). -->

- [ ] **v1.2 — Codebase Health & Reliability** (scope locked 2026-06-22 — Phases 28–33, dependency order):
  - [ ] P28 Update Reliability & Versioning — verified Safari PWA update fix; single version source → footer + SW cache + runtime integrity self-check; CSP→header; cache TTL
  - [ ] P29 Reliability & Observability — local crash log + "Report a problem" copy flow (zero network); IDB migration escape hatch
  - [ ] P30 Test Harness & Coverage — fix 7 PDF tests; RTL guard; behavior tests on god modules pre-refactor
  - [ ] P31 Refactor God Modules — extract from `settings.js` / `add-session.js`; opportunistic cleanups behind the test net
  - [ ] P32 README + Code Comments — maintainer README + comments on the refactored code
  - [ ] P33 DE/CS i18n completion — 13 export-modal keys (needs Sapir's strings; independent)

**Deferred to backlog (v1.1 close + 2026-06-22 concerns triage):** mobile `21-03`; help/onboarding build (Phase 26 — design done); landing DE/CS verify (LNCH-04); license re-validation; pagination; PDF→Web Worker; and other triaged concerns — see ROADMAP "Backlog" for the full list.

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

**Collaboration workflow**: Ben and Sapir both work on this from different computers. Both have Claude Code. Everything (code + .planning/) tracked in GitHub, always synced via git.

**Target users**: Emotion Code / Body Code practitioners. Non-technical. Sapir (Ben's wife, also a practitioner) is the primary ongoing developer — workflow must be simplified for her.

**Business model**: One-time purchase (EUR 119). Hosted on Cloudflare Pages (free). Payments via Lemon Squeezy (MoR, 5% + $0.50/sale). Sold under Sapir's Gewerbe.

## Constraints

- **Tech stack**: Vanilla HTML/CSS/JS, zero npm dependencies — keep the simplicity
- **Data storage**: IndexedDB only, no external calls, no backend
- **Languages**: 4 required (Hebrew RTL, English, German, Czech)
- **Collaboration**: GitHub-tracked, multi-machine workflow with Claude Code
- **Cost model**: One-time sale — hosting/distribution costs must be minimal recurring
- **Legal**: EU/German compliance per existing research, local-only model
- **Maintainer**: Sapir (non-technical) will develop going forward — everything must be approachable

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
| Real footer version + runtime integrity check (reverses 2026-06-14 "leave placeholder") | A version label is only useful if it can't lie; the v209 cache incident proved the bare label lies. One source drives footer + cache + a loaded-code self-check. Offline-safe (no phone-home) | — To build in P28 |
| License re-validation → backlog (not v1.2) | Would harden the trivially-bypassed paywall but adds a phone-home to an offline-first app; revisit only if piracy is observed | ✓ Deferred 2026-06-22 |

## Current Milestone: v1.2 Codebase Health & Reliability (scope locked — planning per phase)

**Status:** v1.1 shipped and archived 2026-06-22 (Phases 8–27; see `milestones/v1.1-*`). v1.2 scope was **co-designed and locked with Ben on 2026-06-22** — a deliberate shift from feature work to **maintainability and reliability**. The concerns triage (`.planning/codebase/CONCERNS.md`) is complete; outcomes folded into phases / backlog / won't-do (see ROADMAP). Next: `/gsd-plan-phase` per phase, in dependency order.

**Committed scope (Phases 28–33, dependency order):**
- **P28 Update Reliability & Versioning** — verified Safari PWA update fix; single version source → footer + SW `CACHE_NAME` + runtime integrity self-check; CSP→header; cache TTL
- **P29 Reliability & Observability** — local crash log + "Report a problem" copy flow (zero network); IDB migration escape hatch
- **P30 Test Harness & Coverage** — fix the 7 PDF tests; RTL guard; behavior tests on god modules before the refactor
- **P31 Refactor God Modules** — `settings.js` (~2.8k) / `add-session.js` (~2.2k) extraction, behind the test net
- **P32 README + Code Comments** — maintainer docs describing the refactored structure
- **P33 DE/CS i18n completion** — 13 export-modal keys (needs Sapir's strings; independent)

---
*Last updated: 2026-06-22 — v1.2 (Codebase Health & Reliability) scope co-designed and locked with Ben: Phases 28–33 in dependency order, concerns triage complete, footer-versioning decision reversed (real version + integrity check in P28), license re-validation deferred. Next: `/gsd-plan-phase` per phase in fresh sessions.*
