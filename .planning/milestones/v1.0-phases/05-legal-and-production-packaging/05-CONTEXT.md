# Phase 5: Legal and Production Packaging - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

The app is legally compliant for EU/German sales and packaged for distribution as a paid product. This phase covers: disclaimer/T&C screen with access gating, acceptance receipt, PWA setup with service worker for offline capability, license key mechanism, landing page with purchase flow, Impressum and Datenschutzerklärung, and production-ready bundle deployed to Cloudflare Pages. No new app features — only legal compliance, access control, and distribution packaging.

</domain>

<decisions>
## Implementation Decisions

### Disclaimer/T&C Screen (LEGL-01, LEGL-02, LEGL-03)
- Full-screen gate blocks all app access until terms are accepted — no app functionality visible before acceptance
- Language selector on the disclaimer screen itself (before app entry) — auto-detects browser language (navigator.language), with manual override
- Disclaimer text displayed in the language the user selects — each of the 4 languages has its own legally accurate version
- Content must cover:
  - **Not medical**: the tool is organizational/administrative for energy balancing practitioners, not a medical device and not a substitute for medical advice
  - **Data privacy**: all data stays local on the user's device only, developer has zero access to user data, no data collection whatsoever
  - **Backup responsibility**: user is solely responsible for backing up their data
  - **No liability**: tool provided as-is, no warranty on data integrity or availability
  - **Widerrufsrecht (German withdrawal right)**: explicit checkbox acknowledging waiver of 14-day withdrawal right upon receiving digital product, per §356 Abs. 5 BGB. Required wording must comply with LG Karlsruhe ruling
  - **EU consumer protection**: compliant across Germany, Israel, Czech Republic, and English-speaking jurisdictions
  - **Single-user license**: license is personal and non-transferable
- Acceptance receipt: downloadable file as proof of acceptance — personal, tied to the specific user/license
- Claude's discretion: exact screen layout (full-page vs modal vs sections), whether scroll-to-bottom is required or sections with individual acknowledgment, receipt format (PDF vs text)
- Claude to research: legal requirement for ongoing accessibility of terms (always accessible from settings vs one-time only), exact legal text per jurisdiction

### License Key Gating (DIST-03)
- Lemon Squeezy generates license keys automatically on purchase
- Customer pays → receives key via email → enters key in app to unlock
- Daily use requires NO internet — key validated and stored locally after first activation
- First activation MAY require internet (Claude to research best approach: server validation vs local-only)
- Claude to research and decide: number of devices per key (1 strict, up to 3, unlimited), validation method (Lemon Squeezy API call on first use vs local algorithm), what happens on invalid key (clear error message + link to purchase, minimize support burden)
- Claude to research: device licensing models, security vs usability tradeoffs, what's standard for similar products
- Key priority from user: easy for the customer, minimal support inquiries, reliable and secure

### PWA Setup (DIST-04)
- manifest.json with app name "Sessions Garden", appropriate icons, theme colors matching garden theme
- Service worker caches all static assets (HTML, CSS, JS, fonts) for full offline capability
- App update strategy: Claude decides (silent background update vs notification banner) — CRITICAL: updates must NEVER affect IndexedDB data. Only code files (HTML/CSS/JS) are updated, data is always safe
- Install prompt: Claude decides whether to show custom "Add to Home Screen" guidance (especially important for iOS where there's no automatic prompt)
- Must support: Android, iOS (Safari), desktop browsers (Chrome, Firefox, Safari, Edge)
- App icon: deferred — needs design work. Use placeholder for now, create todo for icon design
- navigator.storage.persist() already implemented in Phase 1 — protects IndexedDB from eviction

### Landing Page Strategy and Structure (DIST-05)

#### Target Audience & Pain Points
Three audience segments:
1. **New practitioners** — coming from the study tool that was taken away, looking for a direct continuation
2. **Experienced practitioners** — using paper, random files, or other apps — need to be convinced through emotion + logic
3. **Word-of-mouth** — herd effect; once some buy, it spreads in the community

Core pain points the page must address:
1. Paper chaos — drawers full of notes, takes forever to find past sessions
2. No suitable tool — the study tool was taken away, nothing else fits energy healing workflows
3. Client privacy fears — sensitive data in files, emails, shared computers
4. Time wasted on summary emails — practitioners write recap emails to clients after sessions; with this tool, type once and copy-paste
5. Self-doubt and practitioner confidence — especially early in practice, energy healing constantly raises doubts. The tool serves as a "success garden" — a place to look back at what you've done and achieved, and believe in yourself again
6. Clients returning after long breaks — hard to remember past treatments and continue effectively

#### Value Proposition (combined)
- **Organization**: finally everything in one structured place
- **Success garden**: see the path you've walked, believe in yourself again
- **The tool you wished existed**: built by a practitioner, for practitioners
- **Total privacy**: data stays on your device, always

#### Page Structure (updated order)
1. **Hero** — name, tagline, CTA button, botanical illustrations
2. **Sound Familiar?** (moved UP from #4) — connect emotionally to pain first, then present the solution. Add new pain: "I spend too much time writing summary emails to clients after sessions"
3. **Features** — 7 cards (was 6): add new card "Your Success Garden" about seeing achievements and believing in yourself. Existing 6 cards remain
4. **Screenshots** (NEW section) — 3 screenshots from the app: Dashboard, Session page, Client overview. Shows the product is real and beautiful
5. **Who Is It For** — list of practitioner types
6. **Why I Built This** — personal story, strengthened with self-doubt angle: "When I doubt myself, I open my session history and remember all the people I've helped"
7. **Pricing** — €119 launch / €159 full, one-time purchase, lifetime license
8. **FAQ** — existing 10 questions
9. **Impressum + Datenschutzerklärung** — legal sections

#### Languages
- Landing page in all 4 languages (EN, HE, DE, CS) — same as the app itself
- Language selector in header (already exists)
- Each language version feels native, not translated — tone adapted per culture
- Hebrew version is RTL

#### Pricing (decided)
- €119 launch price, €159 full price
- One-time purchase, lifetime license
- 2 device activations per license
- 14-day full refund policy
- Data does NOT sync between devices (clear messaging)

#### Legal Pages
- Impressum (DDG §5, mandatory in Germany): full name, address, email, phone — must be max 2 clicks from any page. Currently placeholder — needs real details before launch
- Datenschutzerklärung (GDPR Art. 13/14): privacy policy explaining local-only data model, no data collection. Draft exists, needs proper generator before launch
- Deployment: Cloudflare Pages, push to GitHub = auto-deploy
- Domain: start with free *.pages.dev subdomain, custom domain to be decided later

#### Lemon Squeezy
- Account setup and product configuration included in this phase
- Checkout URL to replace placeholder in landing page
- EUR base price, Lemon Squeezy auto-converts at checkout

### Claude's Discretion
- Disclaimer screen UX (full-page gate vs modal, scroll-to-bottom vs sectioned acknowledgment)
- Disclaimer text accessibility after acceptance (always available in settings vs one-time)
- License key validation approach (server-first vs local-only, device limits)
- Invalid key error handling UX
- PWA update strategy (silent vs notification)
- Install prompt behavior per platform
- Landing page visual design details (spacing, typography, card styles, botanical elements)
- Landing page copy tone adjustments per language (cultural adaptation)
- Impressum and privacy policy content (using generators + legal research already done)
- Receipt format and content
- Screenshots selection and presentation style (carousel vs grid vs side-by-side)

</decisions>

<specifics>
## Specific Ideas

### Disclaimer & Legal
- "אני לא מוכרת שום מידע רפואי אלא רק מערכת ארגונית" — the app is an organizational tool, not medical. Disclaimer must make this crystal clear
- "אין לי אחריות על המידע ושהמידע לא מגיע אלי ולא נשמר בשום מקום אלא אישי ופרטי ואחריות הגיבוי על המשתמש בלבד" — zero data access, backup is user's responsibility
- "הקובץ ההורדה אמור להיות אישי ובלתי ניתן להעברה למשתמשים אחרים שלא רכשו" — receipt/license is personal and non-transferable
- "הכי חשוב מבחינתי במצב כזה, זה שהמידע של הלקוחות שלי לא יימחק או ייפגע באף צורה" — data safety during updates is the #1 priority
- "קלה למשתמש וכמה שפחות סיכוי לפנות לתמיכה או לתלונה" — minimize friction and support burden in all UX decisions
- Disclaimer screen needs its own language selector since user hasn't entered the app yet
- Sectioned disclaimer with per-section acknowledgment OR scroll-to-bottom — user liked both ideas, Claude researches and chooses
- "במידה ועוד מספר שנים לא ארצה לפרסם את זה יותר... עדיין המוצר יעבוד אצל אנשים שרכשו אותו" — PWA architecture ensures installed apps survive website shutdown

### Landing Page (added 2026-03-15)
- "הרבה פעמים אחרי הטיפול אנחנו כותבות מייל ללקוחות... זה לוקח מלא זמן ועכשיו אפשר פשוט להקליד ישירות לכלי הזה ואח״כ לעשות העתק-הדבק" — email summaries are a real daily time sink. The tool replaces writing from scratch with copy-paste from session notes
- "בתחילת הדרך יש הרבה רגעים של היסוס וספק עצמי... הכלי הזה ממש מספק גינת הצלחות. לראות ולהזכיר לעצמנו את מה שכן עברנו וכן עשינו וכן הצלחנו" — the "success garden" concept is an emotional differentiator. When practitioners doubt themselves, they open past sessions and remember their impact
- "כל פעם שאני חושבת שהעולם עומד להגמר ואני צריכה לפרוש — אני קוראת סיפורי הצלחה ונזכרת בעצמי ומאמינה בעצמי מחדש" — the landing page should convey this emotional safety net, not just practical organization
- Three audience segments: new practitioners (continuation from study tool), experienced practitioners (paper/files), word-of-mouth (herd effect)
- "Sound Familiar?" section should come BEFORE features — connect to pain first, then present solution
- Brand name meaning: "Sessions Garden" = the practitioner's garden of sessions. Each client is a plant needing different care. Hebrew: "גינת הטיפולים שלי"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `assets/app.js`: App.initCommon() handles language init, nav render, theme toggle — disclaimer screen needs to run BEFORE this
- `assets/i18n.js` (split into per-language files in Phase 4): translation system with App.t() — disclaimer needs its own translations
- `assets/db.js`: PortfolioDB namespace with IndexedDB CRUD — license key acceptance can be stored here or in localStorage
- `assets/tokens.css`: CSS custom properties with garden theme — landing page and disclaimer should use same design tokens
- `assets/app.css`: Global styles with logical properties (RTL-ready) — new pages inherit RTL support

### Established Patterns
- Language stored in localStorage as `portfolioLang` — disclaimer can read this for language detection
- Script load order: i18n → db → app → page-specific — disclaimer page may need different load order (before db access)
- Global namespace: window.I18N, window.App, window.PortfolioDB
- Dark mode via [data-theme=dark] attribute — disclaimer and landing page should support dark mode
- navigator.storage.persist() already called on first load (Phase 1)
- Backup reminder system in Phase 1 — pattern for localStorage-based state tracking

### Integration Points
- All 5 HTML pages load scripts via `<script>` tags — new pages (landing, disclaimer) follow same pattern
- localStorage for preferences (language, theme, license key status, terms acceptance)
- No service worker exists yet — this is net-new code
- No manifest.json exists yet — net-new
- No landing page exists — net-new HTML page
- Cloudflare Pages deployment is net-new infrastructure setup

</code_context>

<deferred>
## Deferred Ideas

- **Domain selection** — Custom domain (~10 EUR/year via Cloudflare Registrar) to be chosen later. Start with free *.pages.dev subdomain. Sapir to decide on domain name when ready
- **App icon design** — PWA needs proper app icons (multiple sizes). Current placeholder sufficient for development; professional icon design needed before public launch
- **Landing page FAQ about storage limits** — Carried from Phase 4: customers will ask how much data they can store. Answer: IndexedDB holds hundreds of MB to GBs; 500 clients with photos = ~250MB
- **Lemon Squeezy account creation** — Operational task: Sapir needs to create Lemon Squeezy account, set up product, configure pricing. Not code work but required before launch
- **Gewerbeanmeldung update** — From legal research: update business registration to include software sales. EUR 15-60, 30 minutes at Gewerbeamt
- **Steuerberater consultation** — From legal research: consult tax advisor on Reverse Charge for Lemon Squeezy fees. EUR 100-200 one-time

</deferred>

---

*Phase: 05-legal-and-production-packaging*
*Context gathered: 2026-03-12*
