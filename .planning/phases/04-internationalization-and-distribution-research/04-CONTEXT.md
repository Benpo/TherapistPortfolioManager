# Phase 4: Internationalization and Distribution Research - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

The app speaks four languages with accurate clinical terminology suited to energy healing (not medical), and the distribution and payment strategy is decided and documented. This phase covers: splitting i18n into per-language files, validating/fixing German and Czech translations (clinical terms, tone, avoiding trademarked terms), validating RTL for all Phase 2-3 features, fixing Hebrew quotes, and producing a documented decision for hosting and payment. No new pages, no new features — only i18n restructure, translation quality, RTL validation, and distribution research.

</domain>

<decisions>
## Implementation Decisions

### i18n File Structure (I18N-01)
- Split monolithic `i18n.js` (~900 lines, 60KB) into one file per language: `en.js`, `he.js`, `de.js`, `cs.js`
- All 4 language files are loaded upfront (not lazy-loaded) — files are small (~5KB each), instant language switching with no page reload
- Quotes (window.QUOTES) move into the language files — each file contains both translations and quotes for that language
- A small `i18n.js` remains with the loading logic (App.t, language detection, RTL handling) — but no translations
- App name: "Sessions Garden" in all languages (not translated, not "Emotion Code Portfolio")
- Subtitle: translated per language to describe the tool without using trademarked terms

### Clinical Terminology and Tone (I18N-02, I18N-03)
- **Hebrew, English, German**: translations are already correct and validated by user — no changes needed to existing keys
- **Czech**: translate all clinical terms to Czech (not left in English), same approach as German
- **Trademarked terms**: avoid "Code" and any Bradley Nelson trademarked terminology in all languages. Use equivalent neutral terms for energy healing/balancing
- **Non-medical language**: critical across ALL languages — the app is for energy balancing and treatment, NOT medical. Example: Czech "Klinika" (hospital) → use "Praxe" (practice). Check all languages for similar medical-sounding terms: "clinic", "patient" (use "client"/"Klient"), "diagnosis" (use "session notes"), etc.
- **Claude approach**: Claude translates, asks user when uncertain about clinical terminology
- **Formality**: German uses "Sie" (formal) — already correct. Czech should match formality level.

### Quotes Updates
- Hebrew quote #12: change "שכל" to "ראש" ("הלב יודע את הדרך, גם כשהראש מתלבט")
- Remove 7 famous Hebrew quotes that don't translate well: Rumi #1 (הפצע), Rumi #2 (אל תחפשו), Lao Tzu #4 (אלף מיל), Angelou #9 (נעורים), Lao Tzu #13 (חולשת/דרך), Brene Brown #14 (אדיבים), Angelou #16 (מזין)
- Keep Rumi #3 ("אין דרך אל האושר. האושר הוא הדרך")
- Replace removed quotes with 7 new famous quotes that translate well to Hebrew and all languages
- German and Czech quotes: Claude translates all quotes. Famous quotes replaced with locally well-known versions where available. If a quote doesn't sound natural in a language, replace with a culturally appropriate alternative
- All quotes should feel natural and idiomatic in each language — not literal translations
- 48 quotes per language target (30 custom + 18 famous)

### RTL Validation (I18N-04)
- CSS logical properties already migrated (Phase 2) — RTL should work at CSS level
- Validate all Phase 2-3 features in Hebrew RTL: client search, severity delta display, new session fields (Limiting Beliefs, Additional Techniques, Important Points), expanded client types, referral source dropdown
- Claude's discretion on RTL fixes — identify and fix any layout breaks

### Distribution Strategy (DIST-01, DIST-02)
- **Hosting**: Cloudflare Pages (free tier) — static site hosting, global CDN, HTTPS automatic. €0/month
- **Domain**: custom domain (~€10/year) — research recommends Cloudflare Registrar (cheapest, no markup). Fallback: `*.pages.dev` free subdomain
- **Payment**: Lemon Squeezy — Merchant of Record model. 5% + $0.50 per sale. Handles EU VAT collection, reporting, receipts, and license key generation. No monthly fees
- **Business model**: one-time purchase, no subscription
- **Access control**: License key — customer pays via Lemon Squeezy, receives key, enters in app to unlock. Local validation (no server needed)
- **Key priorities**: simplicity for operator (Sapir), reliability for customers, minimal cost
- **Output**: documented decision file with rationale — implementation is Phase 5 (DIST-03, DIST-04, DIST-05)

### Claude's Discretion
- Exact file structure for i18n split (loader mechanism)
- Choice of replacement famous quotes (must translate well across all 4 languages)
- RTL fix details for Phase 2-3 features
- Czech formality level matching
- Whether to keep `window.I18N` global or restructure loading pattern
- Exact medical-term audit scope per language

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `assets/i18n.js`: 900 lines, 60KB. Contains `window.I18N` with `en`, `he`, `de`, `cs` blocks (171 keys each) + `window.QUOTES` with arrays per language (48 quotes each). Also has `window.I18N_DEFAULT = "en"`
- `assets/app.js`: `App.t("key")` translation function + `data-i18n="key"` attribute pattern for DOM. Language selector in header. RTL toggle via `document.documentElement.dir`
- `assets/tokens.css`: CSS custom properties with logical properties — RTL-ready from Phase 2
- `assets/app.css`: All directional CSS converted to logical properties (Phase 2) — margin-inline-start, etc.

### Established Patterns
- Language stored in localStorage as `portfolioLang`
- Script load order: `i18n.js` → `db.js` → `app.js` → page-specific.js
- All pages load all scripts via `<script>` tags in HTML
- `App.initCommon()` handles language init, nav render, theme toggle
- Global namespace: `window.I18N`, `window.QUOTES`, `window.App`

### Integration Points
- All 5 HTML files: `<script src="assets/i18n.js">` → needs to become 4 language files + loader
- `assets/app.js`: Language switching logic — may need update for new file structure
- `assets/overview.js`: `getDailyQuote()` reads from `window.QUOTES[lang]` — needs to work with new structure
- `assets/add-session.js`: Session fields with `data-i18n` attributes — RTL validation target
- `assets/add-client.js`: Client type toggles, referral source — RTL validation target

</code_context>

<specifics>
## Specific Ideas

- "בדיקות כאלה, בכל השפות מאד חשובות" — medical term audit is critical. Czech "Klinika" → "Praxe" is the example; same audit needed across all languages
- "שלא ישתמע בשום צורה או ניסוח שזה משהו רפואי" — the app is for energy balancing/treatment, terminology must reflect this consistently
- "קניין רוחני וזכויות יוצרים — יש מילים שאני מעוניינת להימנע מהן, בעיקר כל מה שקשור ל-code" — avoid trademarked Emotion Code / Body Code terminology
- "חשוב לי כמה שיותר פשוט וקל עבורי. אמין ובטוח ללקוחותיי. הכי זול שניתן" — distribution model chosen for maximum simplicity and minimum cost

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 4 scope.

</deferred>

---

*Phase: 04-internationalization-and-distribution-research*
*Context gathered: 2026-03-11*
