# TherapistPortfolioManager

## What This Is

A browser-based session management app for Emotion Code / Body Code therapists. Tracks clients, sessions, trapped emotions, severity ratings, Heart-Wall progress, and generates reports. Currently a functional vanilla HTML/JS/CSS app with IndexedDB storage — being enhanced into a sellable product with professional design, expanded features, and multi-language support.

## Core Value

Therapists can efficiently track client sessions, trapped emotions, and clinical progress without any technical setup, internet connection, or data leaving their device.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — inferred from existing codebase. -->

- ✓ Client CRUD with photo upload — existing
- ✓ Session CRUD with trapped emotions tracking — existing
- ✓ Multi-issue severity tracking (before/after, 0-10 scale per issue) — existing
- ✓ Heart-Wall tracking across sessions — existing
- ✓ Body Code notes per session — existing
- ✓ Session browsing with filters (by client, date range) — existing
- ✓ Reporting page with 6 KPIs — existing
- ✓ Copy-to-clipboard Markdown export — existing
- ✓ Read mode for viewing past sessions — existing
- ✓ Inline client creation during session add — existing
- ✓ "Save client & create first session" flow — existing
- ✓ RTL support (Hebrew) — existing
- ✓ Bilingual UI (English/Hebrew) — existing
- ✓ Zero network calls, works from file:// protocol — existing
- ✓ IndexedDB storage (scales to hundreds of MB) — existing
- ✓ Client types: Human / Animal — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Design overhaul — garden/nature theme (warm cream, garden green, orange accents, Rubik font)
- [ ] Dark mode with full light/dark toggle via CSS custom properties
- [ ] Session field consolidation — reconcile data models from both codebases (requires Sapir input)
- [ ] Additional session fields — Limiting Beliefs, Additional Techniques, Important Points, Next Session Info (pending field consolidation)
- [ ] Expanded client types — Adult / Child / Animal / Other (replacing Human / Animal)
- [ ] Client referral source tracking
- [ ] Client search — text search by name/phone/email
- [ ] Backup reminder — weekly prompt with snooze, remind user to export data
- [ ] Daily greeting — time-of-day greeting with rotating inspirational quotes
- [ ] Legal disclaimer screen — block app until accepted, receipt download, no external API calls
- [ ] 4-language support — Hebrew (RTL), English, German, Czech
- [ ] Automated tests for critical paths — IndexedDB CRUD, data integrity
- [ ] Distribution research — explore hosting (Cloudflare Pages, Netlify, Vercel, VPS) and payment solutions for one-time purchase model with low ongoing costs
- [ ] Production packaging — offline capability, distribution-ready
- [ ] Developer experience simplification — make ongoing development accessible for non-technical maintainer (Sapir)

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

**Business model**: One-time purchase. Distribution platform and payment solution TBD — must research options that minimize recurring hosting costs.

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
| Keep vanilla JS codebase as base | IndexedDB scales, deep clinical model, zero deps, ~50KB | — Pending |
| Adopt Lovable's garden design system | Professional look, warm/approachable for therapists | — Pending |
| Local-only data (no backend) | Eliminates GDPR processor burden, simplifies everything | — Pending |
| Session field model | Two apps conflict — needs Sapir's practitioner input | — Pending |
| Distribution platform | Cloudflare Pages / Netlify / Vercel / VPS — needs research | — Pending |
| Payment solution | Lemon Squeezy / alternatives — needs research | — Pending |
| All 4 languages in v1 | Target market spans Hebrew, English, German, Czech speakers | — Pending |
| Dark mode required for v1 | User requirement | — Pending |

---
*Last updated: 2026-03-09 after initialization*
