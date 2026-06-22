# Phase 15: Architecture and UI Audit - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Comprehensive dual-mode quality audit of the entire codebase. Produces a detailed findings report — no fixes in this phase. Findings feed into follow-up phases for implementation. Architecture review via parallel Opus subagents, frontend UI audit via /gsd:ui-review.

</domain>

<decisions>
## Implementation Decisions

### Audit scope
- **D-01:** Audit covers EVERYTHING — JS, CSS, HTML, translations, service worker, legal pages, landing page, PWA manifest
- **D-02:** Equal weight across: security, code consistency, unused/redundant code, i18n completeness, architecture patterns, PWA correctness
- **D-03:** Unused code (dead JS, orphaned CSS, unreferenced HTML, unused i18n keys) should be explicitly identified for removal — the app hasn't shipped yet, clean slate matters more than KB savings

### Output format
- **D-04:** Phase produces a detailed report only — no code fixes
- **D-05:** Report must be structured so a follow-up phase can turn findings into executable plans (grouped by area, severity-tagged, with file:line references)

### Launch gate
- **D-06:** Only critical security vulnerabilities block launch
- **D-07:** Everything else (code quality, minor inconsistencies, missing translations) is informational and gets fixed in follow-up phases

### PWA & architecture investigation
- **D-08:** Verify `start_url` in manifest points to index.html (the app), not landing.html
- **D-09:** Verify offline capability — the app (all pages after license gate) must work offline; landing page does NOT need to work offline
- **D-10:** Map the full purchase-to-usage customer journey: landing → "buy" click → Lemon Squeezy checkout → license key delivery → entering key in app → offline-ready usage. Flag every gap or undefined step.
- **D-11:** Investigate CloudFlare Pages GDPR compliance — is CF Pages EU-safe for an EU-based business? Does it inject tracking/cookies? What CF alternatives exist if not?
- **D-12:** GDPR analysis scope: audit the entire surface — website (landing, legal pages), payment flow (Lemon Squeezy data sharing), and app (local storage, any external calls). Produce clear finding on what's compliant vs what needs attention.

### Legal document status
- **D-13:** Impressum and Datenschutz currently have skeleton/placeholder content — document exactly what's missing and what real content is needed
- **D-14:** If the architecture audit surfaces anything relevant to legal pages (e.g., data flows, cookie usage, third-party calls), document it so the legal writing phase can reference it
- **D-15:** Legal document completion (writing + translation) happens in a dedicated follow-up phase, not in this audit

### Lemon Squeezy
- **D-16:** Ben has a verified, working Lemon Squeezy account with connected business bank account — no products created yet
- **D-17:** Product setup is a later effort — audit should only flag what's needed for integration (checkout URL wiring, license validation flow, webhook requirements if any)

### Translation audit
- **D-18:** Flag obvious errors: wrong language displayed, missing i18n keys, placeholder text left in, broken RTL
- **D-19:** Don't nitpick translation style preferences — focus on functional correctness

### Claude's Discretion
- Exact subagent breakdown for architecture review (how many, what focus each)
- Report structure and formatting
- Order of audit areas
- How to present severity levels

</decisions>

<specifics>
## Specific Ideas

- "I want this to be a starting point for using my registered Lemon Squeezy shop"
- Customer journey gap: "what about everything from clicking 'I want to buy' until actual usage? We didn't cover it as far as I know"
- Concern about CF Pages being non-EU: verify whether this is actually true
- After audit, legal docs should be a dedicated phase — audit just identifies what's needed
- Ben can verify DE translations, Sapir can verify HE and CS, Claude checks EN

</specifics>

<canonical_refs>
## Canonical References

### Legal research
- `.planning/research/` — Prior GDPR, BDSG, Section 203 StGB analysis from v1.0

### Prior architecture decisions
- `.planning/PROJECT.md` — Constraints (vanilla JS, IndexedDB only, zero external calls, 4 languages)
- `.planning/PROJECT.md` §Key Decisions — All locked architectural choices

### Phase 12 legal placeholders
- Phase 12 decision: "Use [YOUR_*] placeholders for Impressum and Lemon Squeezy checkout URL"

### PWA setup
- Phase 5 plans (05-02-PLAN.md) — Original PWA service worker and manifest setup

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sw.js` — Service worker, needs audit for cache completeness and update strategy
- `assets/license.js` — License key validation, needs audit for Lemon Squeezy integration readiness
- `assets/i18n.js` + `i18n-{en,he,de,cs}.js` — Translation system, needs completeness check
- `assets/globe-lang.js` — Language switching, needs consistency check across pages

### Established Patterns
- Vanilla JS with no build step — audit must respect this constraint
- IndexedDB via `db.js` with migration infrastructure — check migration chain integrity
- CSS via `tokens.css` (design tokens) + `app.css` — check for token adoption completeness
- Per-page JS files (add-client.js, add-session.js, etc.) — check for code duplication

### Integration Points
- `landing.html` → `license.html` → `disclaimer.html` → `index.html` (app entry flow)
- `impressum.html` / `datenschutz.html` — standalone legal pages with globe language switcher
- Lemon Squeezy checkout URL (currently placeholder) → license key delivery → `license.js` validation

</code_context>

<deferred>
## Deferred Ideas

- Lemon Squeezy product setup and configuration — separate effort after audit
- Legal document writing and translation — dedicated follow-up phase
- Fix implementation for all audit findings — follow-up phase(s) based on report
- Customer journey implementation (purchase flow, onboarding) — separate phase after gaps are mapped

</deferred>

---

*Phase: 15-architecture-and-ui-audit*
*Context gathered: 2026-03-23*
