# GSD Project Setup Handoff: TherapistPortfolioManager Enhancement

**Date**: 2026-03-09
**Author**: Ben + Claude (codebase comparison session)
**Purpose**: Initialize this project in GSD framework with full context for milestone planning

---

## Project Overview

**What**: A browser-based session management app for Emotion Code / Body Code therapists. Tracks clients, sessions, trapped emotions, severity ratings, Heart-Wall progress, and generates reports.

**Goal**: Enhance the existing codebase into a sellable product. Option A (local-only, browser data) is the launch target based on completed legal research.

**Target users**: Therapists (Emotion Code / Body Code practitioners). Non-technical. The primary developer going forward will be Ben's wife (Sapir), who is not technical — so the development workflow must be simplified.

**Business model**: Sell via Lemon Squeezy as a packaged web app. Local-only data storage = minimal legal/GDPR burden.

---

## Two Codebases Analyzed

### Codebase 1: Current (KEEP AS BASE)
- **Location**: `/Users/ben/Claude-Code-Sandbox/TherapistPortfolioManager_app`
- **Stack**: Vanilla HTML/CSS/JS, IndexedDB, zero dependencies
- **Strengths**:
  - IndexedDB storage (scales to hundreds of MB vs localStorage's 5-10MB limit)
  - Deep clinical data model: multi-issue severity tracking (before/after, 0-10 scale per issue), Heart-Wall tracking, Body Code notes
  - Dedicated reporting page with 6 KPIs
  - Session browsing with filters (by client, date range)
  - Copy-to-clipboard (Markdown export + per-field copy)
  - Read mode for viewing past sessions
  - Client photo upload (base64 in IndexedDB)
  - Inline client creation during session add
  - "Save client & create first session" flow
  - Zero network calls, works from `file://` protocol
  - ~50KB total payload
  - RTL support (Hebrew) baked into CSS

### Codebase 2: Lovable/React (DESIGN SOURCE + FEATURE REFERENCE)
- **GitHub**: `https://github.com/SapirBenpo/sessiongardenem`
- **Stack**: React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- **Access**: Ben's wife's account (SapirBenpo), Ben has access
- **Strengths**:
  - Professional garden/nature themed design (warm cream, garden green, orange accents)
  - Dark mode support
  - DisclaimerScreen (legal T&C with receipt download)
  - Client search (text search by name/phone/email)
  - Backup reminder (weekly with snooze)
  - 4 languages (Hebrew, English, German, Czech) vs current 2
  - Additional session fields: Limiting Beliefs, Additional Techniques, Important Points, Next Session Info
  - Daily greeting with inspirational quotes
  - Client types: Adult / Child / Animal / Other (vs current Human / Animal)
  - Referral source tracking
- **Weaknesses**:
  - localStorage (5-10MB hard limit — will break with real usage)
  - Shallow clinical model (single severity slider, no per-issue before/after)
  - No reporting page
  - No session browsing/filtering page
  - No copy-to-clipboard
  - No Heart-Wall tracking
  - 40+ npm dependencies (many unused — Lovable scaffolding bloat)
  - Everything in modals instead of dedicated pages
  - **Security flag**: DisclaimerScreen calls `https://api.ipify.org` to collect user's IP address — privacy concern for EU/GDPR, must be removed for local-only app

### Decision: Keep Vanilla codebase, adopt Lovable's design and select features

---

## Design System to Adopt (from Lovable repo)

**Theme**: Garden / Nature — warm, earthy, approachable

**Font**: Rubik (Google Fonts) — weights 300-700

**Icons**: Lucide (or equivalent icon set)

**Core Colors (HSL)**:

| Role | Light Mode | Dark Mode |
|------|-----------|-----------|
| Background | `37 40% 92%` (warm cream) | `30 12% 10%` |
| Foreground/Text | `30 20% 16%` (dark brown, not black) | `35 20% 88%` |
| Primary (actions) | `152 38% 34%` (garden green) | `152 40% 42%` |
| Accent (highlights) | `28 65% 50%` (warm orange) | `28 55% 48%` |
| Card surface | `38 45% 95%` | `30 10% 14%` |
| Secondary | `37 35% 85%` (light tan) | `30 10% 19%` |
| Muted | `35 30% 88%` (soft beige) | `30 8% 20%` |
| Border | `35 30% 78%` (warm tan) | `30 8% 22%` |
| Destructive | `0 72% 51%` (red) | `0 62.8% 30.6%` |

**Garden-specific tokens**: `garden-leaf` (green), `garden-leaf-light` (pale mint), `garden-earth` (dark brown), `garden-sky` (soft blue), `garden-warm` (orange)

**Border radius**: `0.75rem`

---

## Features to Add from Lovable (into Vanilla codebase)

1. **Design overhaul** — Apply garden theme colors, Rubik font, dark mode toggle
2. **Disclaimer/T&C screen** — Block app until user accepts. Generate receipt download. But NO external API calls (remove IP collection). Cover legal bases per research findings.
3. **Client search** — Text search by name/phone/email on client list
4. **Backup reminder** — Weekly prompt with snooze, remind user to export data
5. **Additional session fields** — Limiting Beliefs, Additional Techniques, Important Points, Next Session Info
6. **Expanded client types** — Adult / Child / Animal / Other (+ referral source)
7. **Daily greeting** — Time-of-day greeting with rotating inspirational quotes
8. **Dark mode** — Full light/dark toggle with CSS custom properties

---

## Session Fields: REQUIRES USER INPUT PHASE

The two apps have different session field models that need reconciliation. This MUST be an interactive phase where the therapist (Sapir) decides what's needed.

### Fields in Current App Only:
- Up to 3 issues per session, each with: name, severity before (0-10), severity after (0-10)
- Heart-Wall: cleared status per session, running tracking across sessions
- Body Code notes
- Customer Summary (separate from session notes)
- Session types: In-person / Proxy / Surrogate

### Fields in Lovable App Only:
- Single severity index (1-10, before only — no after rating)
- Limiting Beliefs field
- Additional Techniques field
- Important Points field
- Next Session Info field
- Session types: Clinic / Online / Other
- Client referral source

### Key Conflicts to Resolve:
- **Severity model**: Current app's per-issue before/after is clinically richer. Lovable's single slider is simpler. Which approach?
- **Session types**: "In-person / Proxy / Surrogate" vs "Clinic / Online / Other" — different clinical contexts
- **Client types**: "Human / Animal" vs "Adult / Child / Animal / Other"
- **Which new fields actually get used by therapists?** Need practitioner input.

---

## Existing Legal Research (COMPLETED)

Comprehensive legal research already exists in `.planning/research/`:

| File | Contents |
|------|----------|
| `01-legal-compliance.md` | GDPR Article 9, German BDSG, Section 203 StGB, DigiG/C5 analysis |
| `01-LEGAL-RESEARCH-RESULTS.md` | 15 questions answered across 6 blocks, risk assessment matrix |
| `00-SYNTHESIS.md` | Cross-cutting analysis, two-phase recommendation |
| `05-open-questions.md` | Categorized open questions with priority map |

**Key findings**:
- App stores GDPR Article 9 "special category" health data (trapped emotions, severity, Body Code)
- Local-only PWA = zero GDPR processor obligations, just a software vendor
- Section 203 StGB does NOT apply to Emotion Code practitioners
- Option A (local-only): EUR 0-500 worst case compliance cost
- Two-phase recommended: PWA local first, backend later if needed

**Additional legal work needed**: Research how to build a proper "cover your ass" disclaimer for local-only delivery. The Lovable app's approach (T&C + receipt) is directionally correct but needs:
- IP collection removed (GDPR concern)
- Content reviewed against actual legal requirements from the research
- Proper German/EU consumer protection compliance (Widerrufsrecht etc.)

---

## Existing Architecture Research

Also in `.planning/`:
- `handoffs/02-ARCHITECTURE-BUILD.md` — Three architecture options (A: PWA only, B: PWA + encrypted backup, C: Django backend). **Option A is the chosen path.**
- `handoffs/03-PRODUCT-LAUNCH.md` — Lemon Squeezy setup, landing page, onboarding, distribution plan

---

## Suggested Phase Structure for GSD

### Phase 1: Automated Testing Setup
Set up Vitest or similar lightweight test framework. Write baseline tests for existing functionality (CRUD operations, IndexedDB, i18n, navigation). This must happen early so all subsequent phases have regression protection.

### Phase 2: Session Field Consolidation (Interactive)
Run a comprehensive `/ask-me-questions` round with Sapir (the therapist). Compare fields from both apps side-by-side. Decide on the final data model: which fields to keep, add, rename, or remove. Output: finalized data model specification.

### Phase 3: Design Overhaul
Apply garden/nature theme from Lovable repo to vanilla codebase. New color scheme, Rubik font, dark mode, updated component styling. Keep multi-page architecture. Must preserve all existing functionality.

### Phase 4: Feature Integration
Add selected Lovable features: disclaimer screen (without IP collection), client search, backup reminder, expanded client types, daily greeting, new session fields per Phase 2 decisions.

### Phase 5: i18n Consolidation (Dedicated Phase)
Support all 4 languages: Hebrew, English, German, Czech. Cannot just merge i18n files — field names differ between apps, clinical terminology varies. Needs dedicated agent(s) to:
- Audit all translatable strings in the enhanced app
- Cross-reference both apps' translation files
- Fill gaps (new features need all 4 languages)
- Validate RTL for Hebrew
- Validate clinical terminology accuracy per language

### Phase 6: Legal Disclaimer Implementation
Research and implement proper CYA disclaimer based on:
- Existing legal research in `.planning/research/`
- Local-only deployment model (Option A)
- EU consumer protection requirements
- No external API calls
- Receipt/acknowledgment download for both parties

### Phase 7: QA & Bug Fixes
Comprehensive testing across all browsers, both LTR and RTL, light and dark modes. Fix bugs found in both original codebases. Run automated test suite. Manual testing checklist.

### Phase 8: Developer Experience Simplification
Research and implement ways to make ongoing development less technical for Sapir:
- Document how to make changes
- Simplify the development/preview workflow
- Consider tools like Cursor, Lovable, or visual editors that could help
- Create a "How to modify this app" guide

### Phase 9: Production Packaging
Package for sale: PWA setup, service worker, offline capability, Lemon Squeezy integration prep, landing page assets.

---

## Key Constraints

1. **Local-only data** — No backend, no external API calls, all data in IndexedDB
2. **Non-technical maintainer** — Sapir will develop this going forward, simplify everything
3. **Four languages** — Hebrew (RTL), English, German, Czech
4. **Zero dependencies preferred** — Keep the vanilla approach, avoid npm if possible
5. **Must work offline** — PWA with service worker
6. **EU/German legal compliance** — Per existing research findings
7. **Sell via Lemon Squeezy** — Package as downloadable/hostable web app

---

## Files to Reference

| What | Path |
|------|------|
| Current codebase | `/Users/ben/Claude-Code-Sandbox/TherapistPortfolioManager_app/` |
| Lovable repo (design source) | `https://github.com/SapirBenpo/sessiongardenem` |
| Legal research | `.planning/research/01-LEGAL-RESEARCH-RESULTS.md` |
| Legal compliance | `.planning/research/01-legal-compliance.md` |
| Synthesis | `.planning/research/00-SYNTHESIS.md` |
| Open questions | `.planning/research/05-open-questions.md` |
| Architecture options | `.planning/handoffs/02-ARCHITECTURE-BUILD.md` |
| Launch plan | `.planning/handoffs/03-PRODUCT-LAUNCH.md` |
