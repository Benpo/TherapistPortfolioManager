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

### Active

<!-- Current scope: v1.1 — Final polish + launch readiness -->

- [ ] Terminology update — "מפגש/לקוח" replacing "טיפול/מטופל" across all 4 languages
- [ ] Garden elements in app UI — botanical decorations inspired by landing page
- [ ] Actions column redesign — icon buttons (🕐, +) with tooltips replacing text buttons
- [ ] Client photo crop/reposition after upload
- [ ] "Edit client" shortcut from add-session screen
- [ ] Heart Shield (מגננת הלב) redesign — session-level field, removal tracking, heart icon, session type filter
- [ ] Logo update for app and landing page
- [x] Standalone Impressum and Datenschutz pages — Validated in Phase 14 (placeholder content, awaiting Sapir's real business details)
- [ ] Lemon Squeezy account and product setup
- [ ] Landing page translation verification (DE/CS)
- [ ] App icon (replacing placeholder)
- [ ] Basic QA — cross-browser, RTL, mobile

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

## Current Milestone: v1.1 Final Polish & Launch

**Goal:** Polish the app for free trial users, fix UX pain points, and complete all launch prerequisites so the product can be sold.

**Target features:**
- Terminology cleanup (מפגש/לקוח)
- Garden elements in app UI
- Heart Shield redesign
- UX improvements (photo crop, edit client shortcut, action icons)
- Launch prerequisites (Impressum, Lemon Squeezy, translations, QA)

---
*Last updated: 2026-03-25 after Phase 20 complete — pre-launch UI polish: birth date pickers, header redesign (globe popover), shared footer on all pages, license/legal page chrome, 4 UAT bugs fixed inline. Phase 20 is the LAST phase of v1.1 milestone.*
