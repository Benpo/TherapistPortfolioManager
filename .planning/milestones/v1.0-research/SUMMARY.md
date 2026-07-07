# Project Research Summary

**Project:** TherapistPortfolioManager
**Domain:** Therapist session management app (Emotion Code / Body Code practitioners)
**Researched:** 2026-03-09
**Confidence:** HIGH

## Executive Summary

TherapistPortfolioManager is a vanilla JS multi-page app for Emotion Code / Body Code practitioners to document client sessions, track trapped emotions, and monitor Heart-Wall progress. It occupies a genuine market gap -- no dedicated software exists for this modality. The app already functions as a working MVP with client/session CRUD, severity tracking, Heart-Wall tracking, reporting, and bilingual support (EN/HE). The challenge is not building from scratch but transforming an existing prototype into a sellable product.

The recommended approach preserves the zero-dependency, no-build-step architecture that makes this app unique (offline-first, ~50KB, works from file://). Enhancements layer on top: a CSS custom properties design token system enables dark mode, CSS logical properties eliminate RTL maintenance overhead, per-language JSON files scale i18n from 2 to 4 languages, and a service worker + manifest turn it into an installable PWA. Distribution via Cloudflare Pages (free) with Lemon Squeezy payment processing (5% + $0.50, acts as Merchant of Record for EU VAT) keeps recurring costs near zero.

The primary risks are data integrity issues -- Safari's 7-day IndexedDB eviction policy can silently destroy user data, the lack of a schema migration strategy will corrupt data when fields change, and base64 photo storage will cause performance degradation at scale. These are not theoretical: they are confirmed by the current codebase structure. Backup reminders and migration infrastructure must be treated as safety-critical, not nice-to-have features. Secondary risks include incomplete dark mode (hardcoded colors/shadows throughout CSS), RTL regression during design overhaul, and distribution model friction for non-technical therapist buyers.

## Key Findings

### Recommended Stack

The stack stays vanilla: ES6+ JavaScript, HTML5, CSS3 with custom properties, and IndexedDB. No frameworks, no build tools, no npm runtime dependencies. The only additions are native browser APIs (Service Worker, Web App Manifest, Cache API for PWA), self-hosted WOFF2 fonts (replacing Google Fonts CDN), and Playwright for dev-only end-to-end testing. Hosting on Cloudflare Pages (free tier, unlimited bandwidth) with Lemon Squeezy for payment processing.

**Core technologies:**
- Vanilla ES6+ JS with IIFE namespaces (window.App, window.PortfolioDB, window.Theme) -- no framework warranted for 5-page app
- CSS Custom Properties with `[data-theme]` selector -- enables dark mode via ~15 variable overrides, not CSS duplication
- CSS Logical Properties -- eliminates all `body[dir="rtl"]` overrides for Hebrew support
- IndexedDB -- already in place, scales to hundreds of MB, needs migration strategy
- Service Worker + Manifest -- turns static app into installable PWA with offline caching
- Self-hosted WOFF2 fonts -- replaces Google Fonts CDN for offline support and GDPR compliance
- Per-language JSON files -- scales i18n from 2 to 4 languages without monolithic file
- Playwright -- dev-only E2E testing, only npm dependency, never ships to users
- Cloudflare Pages -- free hosting with global edge network
- Lemon Squeezy -- Merchant of Record, handles EU VAT, one-time purchase model

### Expected Features

**Must have (ship before selling):**
- Professional design overhaul with garden theme -- current design does not signal "worth paying for"
- Dark mode -- modern baseline expectation, especially for evening practitioners
- Legal disclaimer with German consumer protection compliance (Impressum, AGB, Widerrufsrecht)
- Client search -- unusable beyond 10 clients without it
- Backup reminder system -- local-only data without backup prompts is a liability
- 4-language i18n (EN, HE, DE, CS) -- unlocks German and Czech markets

**Should have (enhance but not blocking):**
- Expanded client types (Adult/Child/Animal/Other)
- Additional session fields (Limiting Beliefs, Additional Techniques)
- Referral source tracking
- Daily greeting with inspirational quotes

**Defer (v2+):**
- Client progress visualization / charts
- PDF export of session summaries
- Session templates / quick-fill patterns
- Cloud sync, user accounts, scheduling, billing (explicitly anti-features)

### Architecture Approach

The existing multi-page architecture with global namespaces (window.App, window.PortfolioDB, window.I18N) is preserved. Three new concerns layer on top: (1) a two-tier CSS design token system (primitive tokens per theme, semantic tokens referencing them), (2) a Theme module (window.Theme) managing toggle/persistence/system-preference detection with an inline `<head>` script preventing flash of wrong theme, and (3) a restructured i18n system splitting translations into per-language JSON files loaded via fetch (with English bundled inline as file:// fallback). Navigation HTML should be extracted into a JS-generated component to eliminate the current 5-file duplication problem.

**Major components:**
1. **CSS Design Token System** -- two-tier variables (primitive per theme, semantic for components), single source of truth for all colors/shadows
2. **Theme Module (window.Theme)** -- IIFE managing data-theme attribute, localStorage persistence, prefers-color-scheme detection
3. **i18n Loader (window.I18NLoader)** -- fetches per-language JSON files, RTL language map, fallback chain
4. **DB Module (window.PortfolioDB)** -- needs sequential migration system in onupgradeneeded, onblocked/onversionchange handlers
5. **Service Worker (sw.js)** -- cache-first strategy with versioned cache names for clean updates

### Critical Pitfalls

1. **Safari IndexedDB eviction (7-day inactivity)** -- Implement `navigator.storage.persist()`, build backup reminder as Phase 1 priority, add "last backup" indicator to dashboard, document limitation in disclaimer
2. **No IndexedDB migration strategy** -- Build sequential migration system (check event.oldVersion, run v1->v2->v3 chain) before adding ANY new fields; handle undefined gracefully for new fields on existing records
3. **Base64 photo bloat** -- Resize to 200x200px JPEG at 60% quality before storage; separate photo store from client records so getAllClients() stays fast
4. **Multi-tab version conflicts** -- Add onblocked handler ("close other tabs"), onversionchange listener (prompt reload), consider single persistent DB connection
5. **Dark mode design integrity** -- Define complete color system (both modes) before writing CSS; audit all rgba/box-shadow/gradient values; dark-mode-aware severityColor() function

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation -- Design Token System + Font Self-Hosting
**Rationale:** Everything depends on the color system being tokenized. Dark mode, design overhaul, and theme toggle all require this. Font self-hosting eliminates the Google Fonts external dependency that breaks offline use. Pure refactor with no behavior change -- low risk, high enablement.
**Delivers:** All hardcoded colors replaced with CSS custom properties, self-hosted WOFF2 fonts, offline-safe typography
**Addresses:** Design overhaul prerequisite, offline font loading
**Avoids:** Pitfall 5 (dark mode as afterthought), Pitfall 10 (Google Fonts breaks offline)

### Phase 2: Data Safety -- Migration Infrastructure + Backup System
**Rationale:** Data integrity must be solved before any schema changes (new fields, expanded client types). The backup reminder is not a convenience feature -- it is a safety net against Safari's storage eviction and the inherent fragility of local-only data. This phase also addresses base64 photo bloat before the client base grows.
**Delivers:** Sequential IndexedDB migration system, backup reminder with "last backup" indicator, photo compression/resizing, navigator.storage.persist() request, export format versioning
**Addresses:** Backup reminder (table stakes), data safety for local-only model
**Avoids:** Pitfall 1 (Safari eviction), Pitfall 2 (schema migration), Pitfall 3 (photo bloat), Pitfall 4 (multi-tab conflicts), Pitfall 12 (export format compatibility)

### Phase 3: Dark Mode + Theme System
**Rationale:** Builds directly on Phase 1's design tokens. High-visibility feature that signals product maturity. Requires the token system to be complete.
**Delivers:** Theme module (window.Theme), light/dark toggle, FOUC prevention inline script, system preference detection, CSS transitions for smooth switching
**Uses:** CSS Custom Properties, localStorage, prefers-color-scheme media query
**Avoids:** Pitfall 5 (incomplete dark mode)

### Phase 4: Design Overhaul + RTL Migration
**Rationale:** With tokens and dark mode in place, the visual design can be overhauled holistically. Migrating to CSS logical properties during the overhaul (not after) prevents RTL regression. Navigation component extraction eliminates the 5-file duplication problem.
**Delivers:** Garden theme implementation, CSS logical properties (zero RTL overrides), JS-generated navigation component, professional visual polish
**Addresses:** Professional design (table stakes), RTL robustness
**Avoids:** Pitfall 6 (RTL breaks during overhaul), Pitfall 11 (nav duplication)

### Phase 5: Session Field Consolidation + New Features
**Rationale:** Now that the migration infrastructure exists (Phase 2), new data model changes are safe. Field consolidation must happen before i18n expansion (field names must be finalized before translating).
**Delivers:** Expanded client types, additional session fields (Limiting Beliefs, Additional Techniques), referral source tracking, client search
**Addresses:** Differentiator features, data model finalization
**Avoids:** Pitfall 2 (migration without strategy -- already solved in Phase 2)

### Phase 6: i18n Expansion (4 Languages)
**Rationale:** Fields are finalized (Phase 5), so all translation keys are known. Split monolithic i18n.js into per-language JSON files. Add German and Czech. Requires native speaker review for clinical terminology.
**Delivers:** 4-language support (EN, HE, DE, CS), per-language JSON files, missing-key validation script, development mode for untranslated strings
**Uses:** i18n Loader pattern, fetch with file:// fallback
**Avoids:** Pitfall 7 (i18n string explosion, missing translations)

### Phase 7: Legal Disclaimer + Consumer Protection
**Rationale:** Cannot sell without legal compliance. German consumer protection requirements (Impressum, AGB, Widerrufsrecht) are non-negotiable for EU sales. Must cross-reference existing legal research files.
**Delivers:** Disclaimer acceptance flow, receipt/acknowledgment download, German-compliant consumer protection disclosures, privacy policy (stating no data collection)
**Avoids:** Pitfall 8 (checkbox-only disclaimer without legal substance)

### Phase 8: PWA + Production Packaging
**Rationale:** All features are built, tested, and translated. Now package for distribution. Service worker enables offline caching of HTML/CSS/JS files. Manifest enables "Add to Home Screen." Distribution model (license-key-gated hosted PWA recommended) determines the purchase-to-first-use flow.
**Delivers:** Service worker with cache-first strategy, web app manifest, Cloudflare Pages deployment, Lemon Squeezy integration, onboarding flow for non-technical buyers
**Avoids:** Pitfall 9 (distribution model friction)

### Phase 9: QA + Polish
**Rationale:** Final validation across all dimensions -- every page in every language, light and dark mode, RTL, Safari specifically, offline behavior, multi-tab scenarios. Playwright E2E tests for critical paths.
**Delivers:** Playwright test suite, cross-browser validation, RTL + dark mode visual audit, Safari eviction simulation, maintainer guide for Sapir
**Avoids:** Pitfall 13 (non-technical maintainer can't debug)

### Phase Ordering Rationale

- **Phases 1-2 are safety and foundation.** Design tokens enable everything visual. Data safety prevents catastrophic loss. Both must come first.
- **Phases 3-4 are the visible transformation.** Dark mode and design overhaul are what make the app look "sellable." They depend on Phase 1's tokens.
- **Phase 5 before Phase 6** because field names must be finalized before translation. Reversing this order means retranslating all 4 languages when fields change.
- **Phase 7 before Phase 8** because legal compliance must be in place before the product is sold.
- **Phase 8 before Phase 9** because QA should test the final packaged product, not a pre-packaging state.
- **Backup reminder elevated to Phase 2** (not Phase 4+ as originally suggested in some research) because Safari eviction is a show-stopping risk for a local-only app.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Data Safety):** IndexedDB migration patterns need concrete implementation research -- sequential version handling, lazy field addition strategy
- **Phase 7 (Legal Disclaimer):** German consumer protection specifics (Widerrufsrecht for digital products, Impressum requirements) need legal validation beyond existing research files
- **Phase 8 (Production Packaging):** Distribution model decision (license-key-gated PWA vs. ZIP download vs. obscure URL) needs user testing with non-technical therapists

Phases with standard patterns (skip research-phase):
- **Phase 1 (Design Tokens):** Well-documented CSS custom properties pattern, multiple guides available
- **Phase 3 (Dark Mode):** Established pattern with data-theme attribute + CSS variables
- **Phase 4 (Design Overhaul):** CSS logical properties are baseline since 2020, comprehensive MDN docs
- **Phase 6 (i18n Expansion):** Existing i18n system just needs splitting, pattern is clear

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero-dependency vanilla approach is well-validated. All recommended technologies are native browser APIs with broad support. No exotic choices. |
| Features | HIGH | Clear first-mover advantage in Emotion Code niche. Table stakes vs. differentiators well-defined. Anti-features list prevents scope creep. |
| Architecture | HIGH | Existing namespace pattern is sound. Enhancement patterns (design tokens, theme module, i18n split) are all well-documented with multiple sources. |
| Pitfalls | HIGH | Critical pitfalls (Safari eviction, migration, photo bloat) are confirmed by codebase inspection and well-documented in browser specs. |

**Overall confidence:** HIGH

### Gaps to Address

- **Distribution model:** The license-key-gated PWA is recommended but untested. The purchase-to-first-use flow needs prototyping and user testing before committing to implementation in Phase 8. Decision should be made during roadmap planning.
- **Clinical terminology translations:** German and Czech translations for Emotion Code concepts (trapped emotions, Heart-Wall, proxy sessions) have no standard. Native-speaking practitioners must review these -- Sapir covers Hebrew, but German and Czech need external reviewers.
- **Lemon Squeezy integration specifics:** License key generation, checkout overlay behavior, and post-purchase redirect flow need hands-on testing. Medium confidence until validated.
- **Safari eviction real-world impact:** The 7-day eviction is documented but the exact behavior with navigator.storage.persist() on Safari/iOS needs empirical testing on actual devices.
- **Sapir's maintenance capability:** The maintainer guide (Phase 9) should be user-tested with Sapir during development, not just written at the end. If she cannot follow it, the code structure needs adjustment.

## Sources

### Primary (HIGH confidence)
- [MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [CSS-Tricks: Complete Guide to Dark Mode](https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/)
- [MDN: CSS Logical Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Logical_properties_and_values/Margins_borders_padding)
- [Playwright Documentation](https://playwright.dev/)
- [MDN: PWA Service Workers](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/js13kGames/Offline_Service_workers)
- [IndexedDB Upgrade Version Conflict Handling](https://dev.to/ivandotv/handling-indexeddb-upgrade-version-conflict-368a)
- [RTL Styling 101](https://rtlstyling.com/posts/rtl-styling/)

### Secondary (MEDIUM confidence)
- [Lemon Squeezy Documentation](https://docs.lemonsqueezy.com/help/products/link-variables)
- [Safari/iOS PWA Limitations](https://vinova.sg/navigating-safari-ios-pwa-limitations/)
- [ICLG: Consumer Protection Germany 2025-2026](https://iclg.com/practice-areas/consumer-protection-laws-and-regulations/germany)
- [Cloudflare Pages vs Netlify vs Vercel Comparison](https://www.ai-infra-link.com/vercel-vs-netlify-vs-cloudflare-pages-2025-comparison-for-developers/)
- [whitep4nth3r: Theme Toggle Best Practices](https://whitep4nth3r.com/blog/best-light-dark-mode-theme-toggle-javascript/)

### Tertiary (LOW confidence)
- Distribution model viability -- needs user testing with non-technical therapists
- Czech/German clinical terminology accuracy -- needs native practitioner review

---
*Research completed: 2026-03-09*
*Ready for roadmap: yes*
