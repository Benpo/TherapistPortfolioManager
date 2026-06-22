# Phase 4: Internationalization and Distribution Research

**Researched:** 2026-03-11
**Domain:** i18n file architecture, clinical terminology audit, RTL validation, hosting/payment decisions
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**i18n File Structure (I18N-01)**
- Split monolithic `i18n.js` (~900 lines, 60KB) into one file per language: `en.js`, `he.js`, `de.js`, `cs.js`
- All 4 language files are loaded upfront (not lazy-loaded) — files are small (~5KB each), instant language switching with no page reload
- Quotes (window.QUOTES) move into the language files — each file contains both translations and quotes for that language
- A small `i18n.js` remains with the loading logic (App.t, language detection, RTL handling) — but no translations
- App name: "Sessions Garden" in all languages (not translated, not "Emotion Code Portfolio")
- Subtitle: translated per language to describe the tool without using trademarked terms

**Clinical Terminology and Tone (I18N-02, I18N-03)**
- Hebrew, English, German: translations are already correct and validated by user — no changes needed to existing keys
- Czech: translate all clinical terms to Czech (not left in English), same approach as German
- Trademarked terms: avoid "Code" and any Bradley Nelson trademarked terminology in all languages. Use equivalent neutral terms for energy healing/balancing
- Non-medical language: critical across ALL languages — the app is for energy balancing and treatment, NOT medical. Example: Czech "Klinika" (hospital) → use "Praxe" (practice). Check all languages for similar medical-sounding terms: "clinic", "patient" (use "client"/"Klient"), "diagnosis" (use "session notes"), etc.
- Claude approach: Claude translates, asks user when uncertain about clinical terminology
- Formality: German uses "Sie" (formal) — already correct. Czech should match formality level.

**Quotes Updates**
- Hebrew quote #12: change "שכל" to "ראש" ("הלב יודע את הדרך, גם כשהראש מתלבט")
- Remove 7 famous Hebrew quotes that don't translate well: Rumi #1 (הפצע), Rumi #2 (אל תחפשו), Lao Tzu #4 (אלף מיל), Angelou #9 (נעורים), Lao Tzu #13 (חולשת/דרך), Brene Brown #14 (אדיבים), Angelou #16 (מזין)
- Keep Rumi #3 ("אין דרך אל האושר. האושר הוא הדרך")
- Replace removed quotes with 7 new famous quotes that translate well to Hebrew and all languages
- German and Czech quotes: Claude translates all quotes. Famous quotes replaced with locally well-known versions where available. If a quote doesn't sound natural in a language, replace with a culturally appropriate alternative
- All quotes should feel natural and idiomatic in each language — not literal translations
- 48 quotes per language target (30 custom + 18 famous)

**RTL Validation (I18N-04)**
- CSS logical properties already migrated (Phase 2) — RTL should work at CSS level
- Validate all Phase 2-3 features in Hebrew RTL: client search, severity delta display, new session fields (Limiting Beliefs, Additional Techniques, Important Points), expanded client types, referral source dropdown
- Claude's discretion on RTL fixes — identify and fix any layout breaks

**Distribution Strategy (DIST-01, DIST-02)**
- Hosting: Cloudflare Pages (free tier) — static site hosting, global CDN, HTTPS automatic. €0/month
- Domain: custom domain (~€10/year) — research recommends Cloudflare Registrar (cheapest, no markup). Fallback: *.pages.dev free subdomain
- Payment: Lemon Squeezy — Merchant of Record model. 5% + $0.50 per sale. Handles EU VAT collection, reporting, receipts, and license key generation. No monthly fees
- Business model: one-time purchase, no subscription
- Access control: License key — customer pays via Lemon Squeezy, receives key, enters in app to unlock. Local validation (no server needed)
- Key priorities: simplicity for operator (Sapir), reliability for customers, minimal cost
- Output: documented decision file with rationale — implementation is Phase 5 (DIST-03, DIST-04, DIST-05)

### Claude's Discretion
- Exact file structure for i18n split (loader mechanism)
- Choice of replacement famous quotes (must translate well across all 4 languages)
- RTL fix details for Phase 2-3 features
- Czech formality level matching
- Whether to keep `window.I18N` global or restructure loading pattern
- Exact medical-term audit scope per language

### Deferred Ideas (OUT OF SCOPE)
- Landing page FAQ about storage limits — deferred to Phase 5 landing page / FAQ content
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| I18N-01 | i18n architecture restructure — split monolithic i18n.js into per-language files | File split pattern, loader mechanism, HTML update pattern documented below |
| I18N-02 | German language support with accurate clinical terminology | Medical term audit findings, specific corrections identified (session.form.clinic already "Praxis" — correct) |
| I18N-03 | Czech language support with accurate clinical terminology | Medical term audit findings: "Klinika" → "Praxe", formality level, term-by-term audit |
| I18N-04 | RTL validation — confirm all new features work correctly in Hebrew RTL mode | Phase 2-3 feature list for RTL testing documented, CSS logical property foundation confirmed |
| DIST-01 | Hosting platform research and decision | Decision locked: Cloudflare Pages. Documented with rationale |
| DIST-02 | Payment solution research and decision | Decision locked: Lemon Squeezy. EU VAT handling confirmed, pricing documented |
</phase_requirements>

---

## Summary

Phase 4 is primarily an execution phase, not an exploration phase. All major decisions are locked in CONTEXT.md. The work is well-defined: split one 899-line monolithic file into four language files plus a thin loader, audit and fix clinical terminology (Czech is the primary concern), validate RTL on Phase 2-3 features, fix specific Hebrew quotes, and write a distribution decision document.

The existing codebase is clean and well-structured for this work. The `window.I18N` global with `currentLang` indirection in `app.js` means the loader just needs to populate `window.I18N[lang]` and `window.QUOTES[lang]` for each language — the rest of app.js is untouched. All 5 HTML files load `i18n.js` via a single `<script>` tag; the split requires changing each to load 4 language files + 1 loader file.

The critical clinical terminology finding: Czech `session.form.clinic` is "Klinika" (sounds like a hospital/medical clinic) — must become "Praxe" (practice/practitioner's room). German already uses "Praxis" (correct). Hebrew uses "קליניקה" which is the user-validated translation (locked — no changes). English uses "Clinic" — this is acceptable as a session location label in English-language energy healing contexts, but should be reviewed. The brand subtitle "Your private practice journal" is hardcoded in all 5 HTML files (no `data-i18n` attribute) — it needs per-language translations added to each language file AND `data-i18n` wiring to the HTML.

**Primary recommendation:** Execute the split as four flat objects merged into `window.I18N` by a loader script. Keep `window.I18N` and `window.QUOTES` globals — zero changes to app.js or any page-specific JS.

---

## Standard Stack

### Core (already in use — no new dependencies)
| Technology | Version | Purpose | Notes |
|------------|---------|---------|-------|
| Vanilla JS | ES6 | i18n runtime | No framework needed — existing pattern works |
| `window.I18N` global | custom | Translation lookup | Retain pattern; loader populates it |
| `window.QUOTES` global | custom | Per-language quotes | Move into per-language files |
| CSS logical properties | Phase 2 complete | RTL layout | Already migrated — validate correctness |

### No New Libraries Needed
This phase adds no npm packages. It is pure file restructure + content editing + validation.

---

## Architecture Patterns

### Recommended File Structure After Split

```
assets/
├── i18n/
│   ├── en.js          # English translations + English quotes
│   ├── he.js          # Hebrew translations + Hebrew quotes
│   ├── de.js          # German translations + German quotes
│   └── cs.js          # Czech translations + Czech quotes
└── i18n.js            # Loader only: merges language files into window.I18N, sets I18N_DEFAULT
```

**Alternative (flat, no subdirectory):**
```
assets/
├── i18n-en.js
├── i18n-he.js
├── i18n-de.js
├── i18n-cs.js
└── i18n.js            # Loader only
```

Claude's discretion: the subdirectory approach is cleaner for future language additions. The flat approach requires fewer path changes in HTML. Either works. Recommendation: flat (`i18n-en.js` etc.) to keep all assets in the same `assets/` directory — simpler for a non-technical maintainer browsing the files.

### Per-Language File Pattern

Each language file populates exactly two globals — translations and quotes for that language. The loader in `i18n.js` must run AFTER all language files have loaded.

```javascript
// assets/i18n-en.js
window.I18N = window.I18N || {};
window.QUOTES = window.QUOTES || {};

window.I18N.en = {
  "app.title": "Sessions Garden",
  "app.subtitle": "Your private energy healing journal",
  // ... 171 keys ...
};

window.QUOTES.en = [
  // 48 quotes: 30 custom + 18 famous
];
```

```javascript
// assets/i18n.js (loader only — no translation content)
window.I18N_DEFAULT = "en";
// Language files already populated window.I18N and window.QUOTES
// No additional logic needed here — app.js reads window.I18N[currentLang]
```

### HTML Script Load Order (per-page update required)

All 5 HTML files currently have:
```html
<script src="./assets/i18n.js"></script>
<script src="./assets/db.js"></script>
<script src="./assets/app.js"></script>
```

Must become:
```html
<script src="./assets/i18n-en.js"></script>
<script src="./assets/i18n-he.js"></script>
<script src="./assets/i18n-de.js"></script>
<script src="./assets/i18n-cs.js"></script>
<script src="./assets/i18n.js"></script>
<script src="./assets/db.js"></script>
<script src="./assets/app.js"></script>
```

**Key point:** All 4 language files load before the loader and before `app.js`. This preserves "all languages loaded upfront" — instant switching, no reload. At ~5KB each (~20KB total, well within the original 60KB single file), this has zero performance regression.

### Brand Subtitle Wiring

Currently hardcoded in all 5 HTML files (no `data-i18n`):
```html
<div class="brand-subtitle">Your private practice journal</div>
```

Must become:
```html
<div class="brand-subtitle" data-i18n="app.subtitle">Your private practice journal</div>
```

And each language file gets the subtitle translated per language. Note: `app.title` ("Sessions Garden") stays hardcoded — it is the brand name, not translated. Only `app.subtitle` gets per-language treatment.

### app.js: Zero Changes Needed

The `setLanguage()` function in `app.js` already:
- Reads `window.I18N[lang]`
- Falls back to `window.I18N.en`
- Dispatches `app:language` event
- Sets `document.body.dir = "rtl"` for Hebrew

The loader pattern maintains `window.I18N` and `window.QUOTES` — app.js requires no changes.

### Anti-Patterns to Avoid

- **Lazy loading per language:** The user explicitly decided against this. Don't add dynamic `import()` or `fetch()` of language files.
- **Consolidating loader logic into app.js:** Keep loader in `i18n.js`; separation of concerns.
- **Changing the `App.t(key)` API:** All page-specific JS calls `App.t()` — don't break this interface.
- **Using ES modules:** All existing code uses `window.*` globals via `<script>` tags. Don't introduce `<script type="module">`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| EU VAT collection | Custom VAT logic | Lemon Squeezy (MoR) | VAT rates vary by country, Merchant of Record handles it automatically |
| License key generation | Custom crypto | Lemon Squeezy built-in | Lemon Squeezy generates and emails license keys on purchase |
| Static site hosting | VPS / self-hosted | Cloudflare Pages | Zero ops overhead, free tier, global CDN |
| RTL CSS rewrites | Custom directional CSS | CSS logical properties (already done) | Already migrated in Phase 2 |

---

## Common Pitfalls

### Pitfall 1: Medical Terminology Creeping Back
**What goes wrong:** Terms like "Klinika" (Czech) or "patient" imply medical/clinical practice regulated under healthcare law. Energy healing practitioners are not licensed medical professionals — using medical language exposes Sapir to liability and misrepresents the app's purpose.
**Why it happens:** Auto-translation tools default to the most common meaning of a word, not the domain-appropriate one.
**How to avoid:** Audit every term in the semantic field of healthcare across all languages. Specific replacements:
- Czech `session.form.clinic` ("Klinika") → "Praxe" (practitioner's practice/room)
- English "Clinic" in session location → acceptable as-is for EN (energy healing community uses this term), but flag for user review
- Hebrew "קליניקה" → user-validated, keep as-is
- German "Praxis" → already correct
- Any instance of "patient" in any language → must be "client" / "Klient" / "Klient" (CS) / "מטופל" (HE already fine — means "treated person" not "patient")
- Avoid "diagnosis" → use "session notes" or "reason for referral"

**Warning signs:** Any key containing terms like: clinic, patient, diagnosis, medical, treatment (in the medical sense), prescription, disease, condition.

### Pitfall 2: Czech Untranslated English Terms
**What goes wrong:** Czech currently contains English terms mixed in (e.g., "Heart-Wall" appears untranslated in several toast/copy keys). The decision is to translate all clinical terms to Czech, same approach as German.
**Why it happens:** "Heart-Wall" is a Bradley Nelson trademark — the decision is to use neutral equivalent Czech terminology instead of borrowing the English trademark.
**How to avoid:** Scan all Czech values for English words that aren't proper nouns (names, app name "Sessions Garden"). Translate them to Czech equivalents.

**Specific Czech keys needing review (from code audit):**
- `session.copy.heartWall`: "Heart-Wall odstraněna:" — "Heart-Wall" should become neutral Czech equivalent (e.g., "Emoční bariéra" or similar)
- `toast.heartWallRequired`: "Vyberte, zda byla Heart-Wall odstraněna" — same
- `sessions.table.heartWall`: "Heart-Wall" — same
- `reporting.heartWallCleared`: "Sezení s odstraněnou Heart-Wall" — same
- `session.form.clinic`: "Klinika" → "Praxe"

### Pitfall 3: Quote Count Mismatch
**What goes wrong:** getDailyQuote() uses `dayOfYear % langQuotes.length` — if quote arrays have different lengths per language, quotes cycle at different rates. More critically: if a language ends up with fewer than 48 quotes, the cycling pattern differs from other languages.
**Why it happens:** Removing 7 Hebrew quotes and adding 7 replacements keeps count at 48. But if German/Czech also need quote replacements for naturalness, count must stay at 48 for consistency.
**How to avoid:** After all quote edits, verify each language array has exactly 48 entries before committing.

### Pitfall 4: `window.I18N` Not Initialized Before Language Files Load
**What goes wrong:** If browser caches/loads files out of order, language files may run before `window.I18N` exists, causing `window.I18N.en = {...}` to fail.
**Why it happens:** Race condition in synchronous `<script>` loading (very rare but possible in edge cases).
**How to avoid:** Each language file begins with `window.I18N = window.I18N || {};` and `window.QUOTES = window.QUOTES || {};` — this is the defensive initialization pattern shown in the Architecture Patterns section. This is already handled by the pattern.

### Pitfall 5: RTL for Dynamically Rendered Content
**What goes wrong:** Features added in Phase 2-3 that generate HTML via JavaScript (e.g., `renderGreeting()`, issue rows added dynamically in add-session.js, inline client form) may not inherit RTL correctly if they use inline `style` overrides with directional properties.
**Why it happens:** `document.body.dir = "rtl"` cascades through the DOM, but any element with hardcoded `style="margin-left: ..."` (directional) overrides it.
**How to avoid:** Scan Phase 2-3 JS files for any `style` strings containing directional properties. In `overview.js`, the quote author element uses `style.cssText` with no directional properties — verified safe. Check add-session.js issue row rendering for any inline directional styles.

### Pitfall 6: app.subtitle in HTML is Hardcoded
**What goes wrong:** The brand subtitle "Your private practice journal" is hardcoded in 5 HTML files without `data-i18n`. When language switches, it will not update.
**Why it happens:** This string was added before the i18n system was applied universally to the brand area.
**How to avoid:** Add `data-i18n="app.subtitle"` to the `<div class="brand-subtitle">` in all 5 HTML files, and add `"app.subtitle"` key to all 4 language files with per-language translations.

---

## Code Examples

### Pattern: Per-Language File Structure (verified from existing i18n.js)

```javascript
// assets/i18n-cs.js
window.I18N = window.I18N || {};
window.QUOTES = window.QUOTES || {};

window.I18N.cs = {
  "app.title": "Sessions Garden",            // Brand name — not translated
  "app.subtitle": "Váš soukromý deník praxe", // Translated subtitle
  "session.form.clinic": "Praxe",             // Fixed: was "Klinika"
  // "Heart-Wall" term → neutral Czech equivalent throughout
  "session.copy.heartWall": "Emoční bariéra odstraněna:",
  "toast.heartWallRequired": "Vyberte, zda byla emoční bariéra odstraněna",
  "sessions.table.heartWall": "Emoční bariéra",
  "reporting.heartWallCleared": "Sezení s odstraněnou emoční bariérou",
  // ... all other keys ...
};

window.QUOTES.cs = [
  // 30 custom quotes + 18 famous quotes = 48 total
];
```

### Pattern: Loader File (i18n.js after split)

```javascript
// assets/i18n.js — loader only, no translation content
// Language files (i18n-en.js, i18n-he.js, i18n-de.js, i18n-cs.js)
// have already populated window.I18N and window.QUOTES.
window.I18N_DEFAULT = "en";
```

### Pattern: HTML Script Loading (5 pages)

```html
<!-- Replace single <script src="./assets/i18n.js"> with: -->
<script src="./assets/i18n-en.js"></script>
<script src="./assets/i18n-he.js"></script>
<script src="./assets/i18n-de.js"></script>
<script src="./assets/i18n-cs.js"></script>
<script src="./assets/i18n.js"></script>
```

### Pattern: Hebrew Quote Fix (quote #12)

Current (line ~742 in i18n.js):
```javascript
{ text: "הלב יודע את הדרך, גם כשהשכל מתלבט" },
```
Fixed:
```javascript
{ text: "הלב יודע את הדרך, גם כשהראש מתלבט" },
```

### Pattern: RTL Validation Checklist

When testing Hebrew RTL, verify each of these renders correctly (text right-aligned, layout mirrored):
1. Overview page: client search input, client table columns, stats cards
2. Overview page: client modal (buttons, stats, notes)
3. Add Session page: client dropdown, inline client form fields, issue rows (severity inputs, remove buttons), all textareas
4. Add Session page: session type toggle (Clinic/Online/Other), referral source dropdown
5. Add Client page: client type toggles (Adult/Child/Animal/Other), referral source fields, "other" text input
6. Sessions page: filter bar, sessions table
7. All pages: nav links order, brand title/subtitle, greeting/quote display

---

## Clinical Terminology Audit

### Complete Findings by Language

**English (locked — validated):**
- `session.form.clinic`: "Clinic" — acceptable in EN energy healing context. Keep.
- "client" used throughout (not "patient") — correct.
- "Issues addressed" / "Reason for Referral / Complaint" — appropriate non-medical framing.

**Hebrew (locked — validated by user):**
- `session.form.clinic`: "קליניקה" — user-validated, keep as-is.
- "מטופל" (client/treated person) — appropriate.
- Quote #12 fix: "שכל" → "ראש" — locked correction.
- 7 famous quotes to remove + 7 new ones to add — locked.

**German (locked — validated by user):**
- `session.form.clinic`: "Praxis" — correct (practitioner's practice, not hospital).
- "Klient" throughout — correct (not "Patient").
- "Sie" formal address — confirmed correct.
- German translations already validated — no changes to translation keys.

**Czech (requires fixes):**

| Key | Current Value | Issue | Fixed Value |
|-----|--------------|-------|-------------|
| `session.form.clinic` | "Klinika" | Implies hospital/medical clinic | "Praxe" |
| `session.copy.heartWall` | "Heart-Wall odstraněna:" | English trademark term | "Emoční bariéra odstraněna:" |
| `toast.heartWallRequired` | "...Heart-Wall odstraněna" | English trademark term | "...emoční bariéra odstraněna" |
| `sessions.table.heartWall` | "Heart-Wall" | English trademark term | "Emoční bariéra" |
| `reporting.heartWallCleared` | "...odstraněnou Heart-Wall" | English trademark term | "...odstraněnou emoční bariérou" |
| `app.title` | "Emotion Code Portfolio" | Trademark "Emotion Code" | "Sessions Garden" |
| `app.subtitle` | "Správa portfolia" | Generic; doesn't describe tool | Needs natural Czech subtitle |
| `session.form.issueName` | "Důvod referování / stížnost" | "stížnost" = complaint (OK but clinical tone) | Consider "Důvod návštěvy / téma" |

**Note on Czech "Klient":** Current Czech translations use "Klient" (not "Pacient") — this is correct and should be preserved.

**Note on Czech formality:** Current Czech uses formal "Vy" (capitalized) consistently (e.g., "Vyberte klienta", "Vaše energie"). This formal register matches the German "Sie" formality level. Maintain throughout all new/changed Czech content.

---

## Distribution Decision Documentation

The output of DIST-01 and DIST-02 is a documented decision file, not implementation. The decisions are locked:

### What to Document (for Phase 5 implementation)

**Cloudflare Pages (DIST-01):**
- Deployment: push to GitHub → Cloudflare Pages auto-deploys
- Free tier: unlimited requests, 500 builds/month, unlimited bandwidth
- Custom domain: point CNAME to `*.pages.dev`
- HTTPS: automatic
- Cost: €0/month hosting + ~€10/year domain (via Cloudflare Registrar)
- No server, no backend, no runtime — pure static file serving

**Lemon Squeezy (DIST-02):**
- Merchant of Record: Lemon Squeezy is the legal seller. They collect and remit EU VAT, handle refunds, issue receipts.
- Pricing: 5% + $0.50 per transaction. No monthly fees.
- License keys: generated and emailed automatically on purchase
- One-time purchase product: single charge, no recurring billing
- Local validation: app checks key against expected format (no API call to Lemon Squeezy server needed for daily use — validation is local)
- Setup: create account, create product, get embed checkout link — no backend code

**Decision document output:** `.planning/phases/04-internationalization-and-distribution-research/DISTRIBUTION-DECISION.md` (or similar) — written as part of this phase's execution.

---

## State of the Art

| Old Approach | Current Approach | Relevance |
|--------------|------------------|-----------|
| Monolithic i18n.js (60KB) | Per-language files (~5KB each) | This phase performs the split |
| Hardcoded "Emotion Code Portfolio" in translations | "Sessions Garden" brand name | All 4 language files get the corrected name |
| Brand subtitle hardcoded in HTML | `data-i18n="app.subtitle"` wired | This phase adds the wiring |

---

## Open Questions

1. **Czech equivalent for "Heart-Wall"**
   - What we know: "Heart-Wall" is a Bradley Nelson trademark. Czech must use neutral terminology.
   - What's unclear: "Emoční bariéra" (emotional barrier) is the most natural Czech equivalent but Sapir should confirm it feels right in her practice context.
   - Recommendation: Claude proposes "Emoční bariéra", flags for Sapir confirmation before committing.

2. **Czech subtitle for app.subtitle**
   - What we know: German has "Portfolio-Verwaltung", Hebrew has "מנהל תיק". Both are generic "portfolio manager" translations.
   - What's unclear: The user decided the subtitle should "describe the tool without trademarked terms". A good Czech candidate: "Váš soukromý deník terapeutické praxe" (Your private therapeutic practice journal). Needs user approval.
   - Recommendation: Claude proposes Czech subtitle, user confirms.

3. **English "Clinic" in session.form.clinic**
   - What we know: German uses "Praxis" (correct), Czech must change to "Praxe". Hebrew user-validated "קליניקה".
   - What's unclear: English "Clinic" is borderline — energy healing practitioners sometimes use this word colloquially for their practice location, but it has medical connotations.
   - Recommendation: Keep "Clinic" in English unless Sapir flags it. It is the session *location* (physical location label), not a clinical term per se.

4. **7 replacement famous Hebrew quotes**
   - What we know: 7 quotes must be removed, 7 new ones added that (a) translate well to Hebrew and all languages, (b) feel natural in energy healing context.
   - What's unclear: Exact quote selection — this is Claude's discretion per CONTEXT.md.
   - Recommendation: Claude selects 7 quotes from universally well-known wisdom traditions (Thich Nhat Hanh, Einstein, Viktor Frankl, etc.) that translate naturally without losing meaning. Presents selection in plan/execution for Sapir review.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — no package.json, no test runner installed |
| Config file | None |
| Quick run command | Manual browser test |
| Full suite command | Manual browser test across all 5 pages in all 4 languages |

**Note:** FOUND-05 (Playwright test suite) is scoped to Phase 6. No automated test infrastructure exists yet. Phase 4 validation is manual.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| I18N-01 | Language switching works (all 4 langs, no page reload) | manual-only | open index.html, switch language via dropdown | N/A |
| I18N-01 | Adding a new language requires only adding one file | manual-only | manual code review | N/A |
| I18N-01 | All 5 pages load correctly after script tag changes | manual-only | open each page in browser | N/A |
| I18N-02 | German UI renders correctly with no English bleed-through | manual-only | set lang=de, check all pages | N/A |
| I18N-02 | German quotes display correctly (48 quotes, natural German) | manual-only | set lang=de, check overview quote | N/A |
| I18N-03 | Czech UI renders with no English terms in translations | manual-only | set lang=cs, check all pages | N/A |
| I18N-03 | Czech "Klinika" fixed to "Praxe" | manual-only | set lang=cs, open add-session, check location toggle | N/A |
| I18N-03 | Czech "Heart-Wall" terms replaced with Czech equivalent | manual-only | set lang=cs, add session, check labels | N/A |
| I18N-04 | Hebrew RTL — all Phase 2-3 features render correctly | manual-only | set lang=he, test all pages | N/A |
| I18N-04 | Hebrew RTL — client search input aligned right | manual-only | set lang=he, check overview search | N/A |
| I18N-04 | Hebrew RTL — issue row severity inputs not breaking layout | manual-only | set lang=he, open add-session | N/A |
| DIST-01 | Cloudflare Pages decision documented with rationale | manual-only | read DISTRIBUTION-DECISION.md | N/A |
| DIST-02 | Lemon Squeezy decision documented with EU VAT confirmation | manual-only | read DISTRIBUTION-DECISION.md | N/A |

### Sampling Rate
- **Per task commit:** Open browser, switch to affected language, spot-check changed keys
- **Per wave merge:** Test all 4 languages on all 5 pages; verify quote cycling works; verify RTL on all Hebrew pages
- **Phase gate:** All 4 languages display correctly with no console errors, Hebrew RTL has no layout breaks

### Wave 0 Gaps
None — no test framework to install. Phase 6 (FOUND-05) will add Playwright.

---

## Sources

### Primary (HIGH confidence)
- Direct code audit of `/assets/i18n.js` (899 lines, verified structure)
- Direct code audit of `/assets/app.js` (language switching, RTL, globals)
- Direct code audit of all 5 HTML files (script loading, brand elements)
- Direct code audit of `/assets/overview.js` (getDailyQuote pattern)
- CONTEXT.md decisions (user-locked choices verified against code)

### Secondary (MEDIUM confidence)
- Cloudflare Pages free tier limits — well-documented, stable pricing
- Lemon Squeezy Merchant of Record model — verified from their public documentation pattern (5% + $0.50, EU VAT handling)

### Tertiary (LOW confidence)
- Czech "Emoční bariéra" as neutral equivalent for "Heart-Wall" — linguistically appropriate but needs native speaker / user confirmation
- Czech subtitle proposal — requires user validation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; code fully audited
- Architecture (file split pattern): HIGH — straightforward extraction from existing monolith
- Clinical terminology audit: HIGH for English/German/Hebrew (validated by user), MEDIUM for Czech (plausible but needs confirmation)
- RTL validation scope: HIGH — Phase 2-3 features enumerated from code
- Distribution decisions: HIGH — user-locked from CONTEXT.md

**Research date:** 2026-03-11
**Valid until:** 2026-06-11 (stable domain — Cloudflare Pages and Lemon Squeezy are mature products with stable APIs)
