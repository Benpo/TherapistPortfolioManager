# Domain Pitfalls

**Domain:** Therapist session management app (Emotion Code / Body Code) -- enhancing vanilla JS into sellable product
**Researched:** 2026-03-09

---

## Critical Pitfalls

Mistakes that cause data loss, rewrites, or major product failures.

### Pitfall 1: Safari/iOS IndexedDB Data Eviction

**What goes wrong:** Safari deletes all script-writable storage (including IndexedDB) after 7 days of inactivity when cross-site tracking prevention is enabled. iOS further imposes aggressive eviction on PWA storage if the app is not used frequently. For an app whose entire value proposition is "your data never leaves your device," silent data loss is catastrophic.

**Why it happens:** Apple's Intelligent Tracking Prevention treats all script-writable storage as potentially trackable. Unlike server-set cookies, IndexedDB has no exemption. Users who only see clients weekly or biweekly could lose everything between sessions.

**Consequences:** Complete data loss for the user. Therapist loses all client records, session history, and clinical notes. No recovery possible without a backup. This would destroy the product's reputation immediately.

**Prevention:**
- Implement `navigator.storage.persist()` request on first use -- this asks the browser to exempt the origin from eviction. Not guaranteed but significantly reduces risk on Chrome/Firefox.
- Build the backup reminder system (already planned) as a **Phase 1 priority**, not a nice-to-have. Weekly backup prompts with snooze are insufficient -- the first prompt should appear immediately after creating the first client.
- Implement automatic JSON export to the user's filesystem (File System Access API where supported, download fallback elsewhere).
- Add a prominent "last backup" indicator on the main dashboard so therapists can see at a glance if their data is protected.
- Document Safari's limitation clearly in the disclaimer and user documentation.

**Detection:** Test with Safari's ITP settings enabled. Set device date forward 8+ days and verify storage state. Monitor for user reports of "empty app."

**Confidence:** HIGH -- well-documented Safari behavior, confirmed by MDN and Apple developer forums.
**Phase relevance:** Phase 1 (Testing) should include eviction simulation tests. Phase 4 (Feature Integration) must prioritize backup reminder over cosmetic features.

---

### Pitfall 2: IndexedDB Schema Migration Without a Migration Strategy

**What goes wrong:** The current `db.js` uses `DB_VERSION = 1` with a simple `onupgradeneeded` handler that only creates stores if they don't exist. When you add new fields (Limiting Beliefs, Additional Techniques, referral source, expanded client types), you need to bump the version and migrate existing data. Without a proper migration strategy, existing user data gets corrupted or lost during upgrades.

**Why it happens:** IndexedDB requires all structural changes (new object stores, indexes) inside `onupgradeneeded`. But data migration (transforming existing records to new schemas) is awkward in this handler. Developers often forget that the upgrade handler must handle jumping from any old version to the current version (user might skip multiple app updates).

**Consequences:** Existing users' data becomes inaccessible or corrupted after app update. Particularly dangerous because there's no backend to recover from.

**Prevention:**
- Design a sequential migration system before adding ANY new fields. The `onupgradeneeded` handler should check `event.oldVersion` and run migrations sequentially (v1->v2, v2->v3, etc.).
- Never delete or rename existing object stores -- add new ones alongside.
- For new fields on existing records, add them lazily (handle undefined gracefully in code) rather than requiring a data migration.
- Write migration tests that create v1 data, then open with v2+ and verify integrity.
- Keep a migration changelog documenting what each version change does.

**Detection:** Test upgrade paths: create data with current schema, then deploy new schema and verify all data survives intact.

**Confidence:** HIGH -- this is a well-known IndexedDB challenge, and the current codebase has no migration handling at all.
**Phase relevance:** Phase 2 (Session Field Consolidation) MUST address this before modifying any data models. Phase 1 (Testing) should include migration test infrastructure.

---

### Pitfall 3: Base64 Photo Storage Causing Database Bloat

**What goes wrong:** The current app stores client photos as base64 data URLs directly in IndexedDB client records. Base64 encoding inflates file size by ~33%. A therapist with 50 clients, each with a 2MB phone photo, would store ~133MB of base64 strings in their database. This slows down `getAllClients()` calls (which load ALL photo data every time), makes JSON export/import painfully slow, and eventually hits browser storage quotas.

**Why it happens:** Base64 in IndexedDB is the simplest implementation and works fine for 5-10 clients. It breaks at scale because every client listing requires deserializing massive base64 strings even when you only need the name.

**Consequences:** App becomes sluggish after 20-30 clients with photos. Export/import (backup) takes minutes instead of seconds. Browser may throttle or refuse storage.

**Prevention:**
- Resize/compress photos before storage (use canvas to limit to 200x200px, compress to JPEG at 60% quality). A 200x200 JPEG is ~15KB vs 2MB for a full phone photo.
- Store photos in a separate IndexedDB object store (not inline with client records) so `getAllClients()` doesn't load photo data.
- Alternatively, store as Blob instead of base64 (IndexedDB natively supports Blob storage, which avoids the 33% overhead).
- Add a file size check on upload with user-friendly messaging ("Photo is too large, it will be resized").

**Detection:** Monitor `getAllClients()` performance with 50+ clients with photos. Check IndexedDB storage size via browser dev tools.

**Confidence:** HIGH -- base64 bloat is well-documented, and the current code stores raw `readAsDataURL` output with no compression.
**Phase relevance:** Phase 4 (Feature Integration) or earlier. Should be addressed before expanding the client base features.

---

### Pitfall 4: Multi-Tab Version Conflicts

**What goes wrong:** If a therapist has the app open in two tabs and receives an update (new service worker), one tab tries to open the database with a new version while the other holds an open connection with the old version. IndexedDB blocks the upgrade until ALL connections to the old version are closed. The app freezes or throws cryptic errors.

**Why it happens:** IndexedDB's `onupgradeneeded` is blocked by open connections in other tabs. The current `db.js` opens a new connection on every operation (`openDB()` called per function) and never closes them, compounding the problem.

**Consequences:** App appears frozen. User loses work in progress. No clear error message.

**Prevention:**
- Implement `onblocked` handler in `openDB()` that warns the user: "Please close other tabs of this app."
- Consider using a single persistent connection instead of opening/closing per operation.
- Add `onversionchange` listener on the database that prompts the user to reload.
- In the service worker update flow, handle the multi-tab case gracefully.

**Detection:** Open app in two tabs, deploy a version bump, observe behavior.

**Confidence:** HIGH -- standard IndexedDB limitation, and the current code has no `onblocked` or `onversionchange` handlers.
**Phase relevance:** Phase 2 (before schema changes) and Phase 9 (Production Packaging with service worker).

---

## Moderate Pitfalls

### Pitfall 5: Dark Mode as Afterthought Breaks Design Integrity

**What goes wrong:** Implementing dark mode by simply inverting or overriding colors creates an inconsistent, ugly result. Common mistakes: forgetting to theme scrollbars, form inputs, images with white backgrounds, shadows that look wrong on dark backgrounds, severity color scale becoming unreadable, and the Google Fonts import breaking if offline.

**Why it happens:** The current CSS uses a single `:root` color set with hardcoded values. Adding `[data-theme="dark"]` overrides seems simple but misses dozens of edge cases. Semantic color naming (like `--accent`) helps, but values like `--shadow-soft: 0 18px 40px rgba(36, 24, 72, 0.08)` are designed for light backgrounds only.

**Prevention:**
- Define the FULL color system (both modes) before writing any dark mode CSS. The Lovable design system colors in the handoff document already specify both light and dark values -- use those as the source of truth.
- Use semantically meaningful variable names: `--surface`, `--on-surface`, `--primary`, `--on-primary` rather than color-descriptive names.
- Audit every use of `rgba()`, `box-shadow`, and `background` gradients -- these all need dark mode variants.
- The severity scale's `hsl()` color function (`severityColor()` in app.js) needs a dark-mode-aware version.
- Test with actual dark mode system preference (`prefers-color-scheme`) not just a toggle.

**Detection:** Visual regression testing. Screenshot comparison between light and dark on every page.

**Confidence:** HIGH -- the current CSS structure (single `:root`, hardcoded shadows) confirms this risk.
**Phase relevance:** Phase 3 (Design Overhaul) -- must be designed as a complete system, not bolted on.

---

### Pitfall 6: RTL Support Breaks During Design Overhaul

**What goes wrong:** The current app has basic RTL support (`dir="rtl"` on body, some CSS overrides) but uses hardcoded directional properties (`margin-left`, `margin-right`, `text-align: left/right`) in at least 8 places. A design overhaul will add many more CSS rules, and developers habitually write `margin-left` instead of `margin-inline-start`. The result: Hebrew layout breaks silently because nobody tests RTL during development.

**Why it happens:** LTR is the default mindset. CSS logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`) exist specifically for bidirectional layouts but are not habitual for most developers. The current codebase mixes approaches -- some rules use `body[dir="rtl"]` overrides, others just assume LTR.

**Prevention:**
- During the design overhaul, replace ALL directional properties with CSS logical properties. This is a one-time investment that eliminates the need for `[dir="rtl"]` overrides entirely.
- Use `text-align: start` instead of `text-align: left`.
- Use `margin-inline-start` instead of `margin-left`.
- Set up a CSS linting rule (stylelint-no-physical-properties plugin, or even a grep check) that flags hardcoded directional properties.
- Hebrew must be tested on EVERY design change, not just at the end.
- Arabic-specific typography concerns (letter-spacing, underlines) don't apply to Hebrew but line-height for diacritics (nikud) should be checked.

**Detection:** grep for `margin-left|margin-right|padding-left|padding-right|text-align: left|text-align: right|float: left|float: right` in CSS. Count should be zero after Phase 3.

**Confidence:** HIGH -- confirmed 8 hardcoded directional properties in current CSS.
**Phase relevance:** Phase 3 (Design Overhaul) -- bake logical properties into the new design system from day one.

---

### Pitfall 7: i18n String Explosion with 4 Languages

**What goes wrong:** The current i18n system is a single `i18n.js` file with ~155 keys in 2 languages (310 string literals). Adding German and Czech doubles it to 620. Adding new features (disclaimer, backup reminder, greeting, search, expanded client types) could push to 250+ keys across 4 languages = 1000+ string literals in one file. Missing translations silently fall back to English with no warning. Clinical terminology gets mistranslated because the developer doesn't speak Czech.

**Why it happens:** The flat-file approach works for 2 languages and 100 keys. It doesn't scale to 4 languages and 250+ keys because: (1) no tooling catches missing keys, (2) no way to see which strings are unused, (3) one file becomes unmaintainable, (4) clinical terms like "trapped emotions" or "Heart-Wall" have no standard Czech or German translation.

**Prevention:**
- Split translations into separate files per language (e.g., `i18n/en.json`, `i18n/he.json`, `i18n/de.json`, `i18n/cs.json`).
- Build a validation script that compares all language files and flags missing keys. Run this in CI or as a pre-commit check.
- For clinical terminology, have a native-speaking practitioner review translations. Sapir can validate Hebrew; German and Czech need external validation.
- Add a development mode that highlights untranslated strings visually (e.g., red background on elements using fallback English).
- Consider keeping English keys as the authoritative set and generating a "missing translations" report.

**Detection:** Run a diff between language files to find missing keys. Test each language and visually scan for English strings appearing in non-English modes.

**Confidence:** HIGH -- the current monolithic i18n.js structure is already 310 lines and will at minimum triple.
**Phase relevance:** Phase 5 (i18n Consolidation) -- but the file-splitting should happen during Phase 3 or 4 to avoid a massive refactor later.

---

### Pitfall 8: Legal Disclaimer That Doesn't Actually Protect

**What goes wrong:** Implementing a disclaimer screen that says "this is not medical advice" without addressing the actual legal requirements creates a false sense of security. In the EU/Germany, selling digital products requires specific consumer protection disclosures (Widerrufsrecht/right of withdrawal, Impressum, AGB). The Lovable app's approach (T&C screen + IP collection) was both legally incomplete and privacy-violating.

**Why it happens:** Developers treat legal requirements as UX problems ("add a checkbox") rather than legal obligations. The existing legal research identifies specific requirements (GDPR Article 9 compliance, German BDSG, Section 203 StGB analysis) but the disclaimer implementation needs to translate these into actual text and user flows.

**Prevention:**
- The disclaimer must cover: (1) not a medical device, (2) not a substitute for professional healthcare, (3) user is responsible for data on their device, (4) no warranty of data persistence (browser can delete storage), (5) software provider has no access to user data.
- For selling in Germany: Impressum, AGB (Terms & Conditions), Widerrufsrecht (14-day withdrawal right, though digital products have exceptions if user consents to waive it), Datenschutzerklaerung (privacy policy -- even though no data is collected, this must be stated).
- The receipt/acknowledgment download is a good pattern -- generates a PDF/text file the user can keep.
- Do NOT collect IP addresses, device fingerprints, or any identifying information.
- Have the disclaimer text reviewed by a German-speaking lawyer or at minimum cross-referenced with the existing legal research files.

**Detection:** Compare disclaimer content against checklist from `.planning/research/01-LEGAL-RESEARCH-RESULTS.md`. Verify all consumer protection requirements are addressed.

**Confidence:** MEDIUM -- legal requirements are well-researched in existing files, but translating them into specific disclaimer text involves legal judgment.
**Phase relevance:** Phase 6 (Legal Disclaimer Implementation) -- but the requirements should be defined during Phase 4 planning.

---

### Pitfall 9: One-Time Purchase Distribution Model Friction

**What goes wrong:** Selling a PWA as a one-time purchase creates a confusing user experience. The buyer pays on Lemon Squeezy, then... what? They get a URL? A ZIP file? A hosted instance? Each option has problems: a URL can be shared freely (no copy protection), a ZIP file requires technical setup, a hosted instance has recurring costs. The "product" is hard to define for non-technical therapists.

**Why it happens:** PWAs don't fit neatly into traditional digital product categories. They're not downloadable software (like a .exe), not SaaS (no account/backend), and not a mobile app (no app store). The distribution model is genuinely novel and confusing.

**Prevention:**
- Clearest model: host the app on a subdomain (e.g., app.example.com), gate access behind a license key entered on first use. Lemon Squeezy generates license keys. The app validates the key locally (store in localStorage) and doesn't need a backend for ongoing validation.
- Alternative: provide a ZIP file with all HTML/JS/CSS that the user can open from their filesystem (works today with `file://` protocol). Simpler but feels less professional.
- Hosted model with Cloudflare Pages or Netlify has near-zero recurring cost (free tier covers this app's traffic).
- Whatever model is chosen, the onboarding flow must be crystal clear for non-technical users. "Click this link, enter your license key, bookmark the page" is the maximum acceptable complexity.
- Consider that a license-key-gated hosted app can also be installed as a PWA (Add to Home Screen), giving it an "app-like" feel.

**Detection:** User-test the purchase-to-first-use flow with a non-technical person. If they can't get from payment to working app in under 2 minutes, the flow is broken.

**Confidence:** MEDIUM -- distribution model is still TBD per project docs. Multiple viable options exist but none is obviously superior.
**Phase relevance:** Phase 9 (Production Packaging) -- but the decision should be made during roadmap planning to avoid building features that don't fit the chosen model.

---

## Minor Pitfalls

### Pitfall 10: Google Fonts Import Breaks Offline

**What goes wrong:** The current CSS imports Rubik and Nunito from Google Fonts via `@import url(...)`. When the app is offline (which is a core requirement), fonts fail to load and the app falls back to system fonts, causing layout shifts and a degraded appearance.

**Prevention:** Self-host the font files. Download the WOFF2 files and serve them from the app's assets directory. This also eliminates the external network call (which contradicts the "zero network calls" constraint).

**Confidence:** HIGH -- confirmed in current `app.css` line 1.
**Phase relevance:** Phase 3 (Design Overhaul) -- switch to self-hosted fonts as part of the design system work.

---

### Pitfall 11: Multi-Page Architecture Causes Style/State Duplication

**What goes wrong:** The app uses 5 separate HTML files, each loading the same CSS and JS files. Any shared UI element (header, nav, toast, confirm dialog) is duplicated in every HTML file. Design changes require updating 5 files. A new nav item means 5 edits. State (like selected language) must be persisted in localStorage and re-read on every page load.

**Prevention:**
- Accept the multi-page architecture (don't refactor to SPA -- that's a rewrite).
- Create a shared HTML template or use a simple build step that injects common elements.
- Alternatively, use JavaScript to dynamically inject shared UI (header, nav, footer, toast, modals) on page load. This is already partially done but not consistently.
- Ensure all shared state is managed through localStorage with a consistent API.

**Confidence:** HIGH -- confirmed by examining the 5 HTML files.
**Phase relevance:** Phase 3 (Design Overhaul) -- good time to consolidate shared UI injection.

---

### Pitfall 12: Export/Import Format Not Forward-Compatible

**What goes wrong:** The current app supports JSON export/import for backup. But if the data model changes (new fields, renamed fields, different client types), old exports become incompatible with the new app version. Users who backed up their data can't restore it after an update.

**Prevention:**
- Include a schema version number in the export format.
- Write import logic that handles older export formats (same migration approach as IndexedDB but for JSON files).
- Never remove or rename fields in the export format -- only add new ones.
- Test the import path with exports from every previous schema version.

**Confidence:** HIGH -- data model changes are explicitly planned (expanded client types, new session fields).
**Phase relevance:** Phase 2 (Session Field Consolidation) -- define the export format versioning before changing the data model.

---

### Pitfall 13: Non-Technical Maintainer Can't Debug Issues

**What goes wrong:** Sapir (non-technical) will maintain the app going forward. When something breaks -- a CSS rule that doesn't look right, a translation that's wrong, a feature that's not working -- she needs to be able to identify and fix it. If the codebase is organized in ways that require developer knowledge to navigate, maintenance stalls.

**Prevention:**
- Organize files by feature, not by type. `client/` with its HTML, JS, and strings is more navigable than separate `assets/` and `i18n/` directories.
- Use clear, descriptive variable and function names. No abbreviations, no clever patterns.
- Add comments explaining WHY, not WHAT, especially for IndexedDB operations and i18n logic.
- Create a "How to make common changes" guide: how to add a translation, how to change a color, how to add a form field.
- Keep the zero-dependency approach -- npm, build tools, and transpilation add maintenance burden.

**Confidence:** HIGH -- explicitly called out as a project constraint.
**Phase relevance:** Phase 8 (Developer Experience Simplification) -- but should inform decisions in every earlier phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Testing | Testing IndexedDB in automated tests is complex (needs fake-indexeddb or browser test runner) | Use a lightweight in-memory mock for unit tests; browser-based tests for integration |
| Phase 2: Field Consolidation | Changing data model without migration strategy corrupts existing data | Build migration infrastructure FIRST, then modify schema (Pitfalls 2, 12) |
| Phase 3: Design Overhaul | Dark mode incomplete, RTL breaks, fonts fail offline | Complete color system before CSS work; logical properties; self-host fonts (Pitfalls 5, 6, 10) |
| Phase 4: Feature Integration | Backup reminder deprioritized below cosmetic features | Backup is a data-safety feature, not a nice-to-have. Prioritize over greeting/search (Pitfall 1) |
| Phase 5: i18n | Missing translations go undetected; clinical terms mistranslated | Validation script; native speaker review; split files per language (Pitfall 7) |
| Phase 6: Legal Disclaimer | Checkbox-only disclaimer without actual legal content | Cross-reference with existing legal research; address German consumer protection specifically (Pitfall 8) |
| Phase 7: QA | RTL testing skipped or superficial | Test every page in Hebrew with dark mode ON. Test on Safari specifically (Pitfall 6) |
| Phase 8: DX Simplification | Guide is too technical for Sapir | User-test the guide with Sapir. If she can't follow it, rewrite it (Pitfall 13) |
| Phase 9: Production | Distribution model unclear, onboarding too complex | Decide distribution model early; user-test purchase-to-first-use flow (Pitfall 9) |

---

## Sources

- [MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) -- HIGH confidence
- [The pain and anguish of using IndexedDB (GitHub Gist)](https://gist.github.com/pesterhazy/4de96193af89a6dd5ce682ce2adff49a) -- HIGH confidence
- [Safari/iOS PWA Limitations (Vinova)](https://vinova.sg/navigating-safari-ios-pwa-limitations/) -- MEDIUM confidence
- [Handling IndexedDB Upgrade Version Conflict (DEV Community)](https://dev.to/ivandotv/handling-indexeddb-upgrade-version-conflict-368a) -- HIGH confidence
- [w3c/IndexedDB Issue #282: Backward-compatible schema changes](https://github.com/w3c/IndexedDB/issues/282) -- HIGH confidence
- [RTL Styling 101](https://rtlstyling.com/posts/rtl-styling/) -- HIGH confidence
- [CSS-Tricks: Complete Guide to Dark Mode](https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/) -- HIGH confidence
- [Dexie.js: Don't index binary data](https://medium.com/dexie-js/keep-storing-large-images-just-dont-index-the-binary-data-itself-10b9d9c5c5d7) -- HIGH confidence
- [Base64 encoding overhead (Bunny.net)](https://bunny.net/blog/why-optimizing-your-images-with-base64-is-almost-always-a-bad-idea/) -- HIGH confidence
- [ICLG: Consumer Protection Germany 2025-2026](https://iclg.com/practice-areas/consumer-protection-laws-and-regulations/germany) -- MEDIUM confidence
- [Lemon Squeezy: Digital Products](https://www.lemonsqueezy.com/ecommerce/digital-products) -- MEDIUM confidence
