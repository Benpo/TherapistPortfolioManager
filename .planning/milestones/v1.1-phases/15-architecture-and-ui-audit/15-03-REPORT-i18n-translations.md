# i18n and Translation Completeness Audit Report

**Audit Date:** 2026-03-23
**Reference Language:** English (i18n-en.js)
**Languages Audited:** EN, HE, DE, CS
**Auditor:** Phase 15 Plan 03

## Summary

| Metric | Count |
|--------|-------|
| Total i18n keys (main app) | 210 |
| Keys with coverage gaps | 0 |
| Unused i18n keys | 0 |
| Missing referenced keys (dead code) | 3 |
| Hardcoded English strings (should be i18n) | 8 |
| Wrong-language bugs | 0 |
| Placeholder/TODO text in i18n | 0 |
| Empty string values | 0 |
| Quote count mismatch (HE) | 6 missing |
| RTL CSS issues (landing.css) | 5 |
| RTL CSS issues (app.css) | 0 (annotated) |

**Overall Assessment:** The main app i18n system is well-maintained with 100% key coverage across all 4 languages. Primary issues are: (1) hardcoded English strings in backup banner and DB error messages, (2) 6 missing Hebrew quotes, (3) dead code referencing old session types, and (4) physical CSS properties in landing.css for decorative positioning.

---

## i18n Key Coverage Matrix

### Main App Keys (i18n-en/he/de/cs.js)

All 210 keys are present in all 4 language files. No keys are missing from any language. No orphaned keys exist (keys present in HE/DE/CS but not EN).

**Result: COMPLETE -- no gaps found.**

### Disclaimer Keys (i18n-disclaimer.js)

All 4 languages (en, he, de, cs) have identical structure with matching sections, receipt fields, checkboxes, and UI labels. No missing keys.

**Result: COMPLETE -- no gaps found.**

### License Page Keys (license.js)

The LICENSE_I18N object in license.js contains translations for all 4 languages with matching keys (title, subtitle, keyLabel, keyPlaceholder, activateBtn, activatingBtn, purchaseText, purchaseLink, successMsg, reactivateMsg, errorNetwork, errorInvalid, errorCrossProduct, errorDeviceLimit, errorGeneric).

**Result: COMPLETE -- no gaps found.**

### Landing Page Keys (landing.js)

The LANDING_I18N object contains translations for all 4 languages. All sections (hero, features, whoFor, soundFamiliar, whyBuilt, pricing, faq, demo, contact, footer) are present in EN, HE, DE, CS.

**Result: COMPLETE -- no gaps found.**

### Quote Count Mismatch

| Language | Custom Quotes | Famous Quotes | Total |
|----------|--------------|---------------|-------|
| EN | 30 | 11 | 41 |
| HE | 29 | 6 | 35 |
| DE | 30 | 11 | 41 |
| CS | 30 | 11 | 41 |

**HE is missing 6 quotes:**
- 1 custom quote: EN has "A small light in the darkness can change everything" (index 4) -- HE skips this
- 5 famous quotes missing from HE that are present in EN/DE/CS:
  - "Out beyond ideas of wrongdoing and rightdoing..." (Rumi)
  - "Smile, breathe, and go slowly" (Thich Nhat Hanh)
  - "Don't ask what the world needs..." (Howard Thurman)
  - "In the middle of difficulty lies opportunity" (Albert Einstein)
  - "What lies behind us and what lies before us..." (Ralph Waldo Emerson)

HE has 2 famous quotes that EN does not have:
  - "When I let go of what I am, I become what I can be" (Lao Tzu) -- not in EN
  - "When you really want something, the whole universe conspires..." (Paulo Coelho) -- not in EN

**Severity: MEDIUM** -- Different quote sets per language is not a bug per se (Phase 13 decision was to sync to 41), but HE is 6 short.

---

## Unused i18n Keys

No unused keys found. All 210 keys defined in i18n-en.js are referenced somewhere in the JS or HTML files.

---

## Wrong-Language and Placeholder Bugs

### Missing i18n Keys Referenced in Code (Dead Code)

| Key | Referenced In | Severity | Notes |
|-----|--------------|----------|-------|
| `session.form.inPerson` | `assets/overview.js:230`, `assets/sessions.js:40` | LOW | Dead code -- old session type. Current types are clinic/online/other. Falls back to key string. |
| `session.form.proxy` | `assets/overview.js:231`, `assets/sessions.js:41` | LOW | Dead code -- old session type. Falls back to key string. |
| `session.form.surrogate` | `assets/overview.js:232`, `assets/sessions.js:42` | LOW | Dead code -- old session type. Falls back to key string. |

These keys are referenced in `formatSessionType()` functions in both `overview.js` and `sessions.js`, but the session types stored in the DB are now `clinic`, `online`, and `other` (which map to existing i18n keys `session.form.clinic`, `session.form.online`, `session.form.other`). The `inPerson`/`proxy`/`surrogate` branches are unreachable dead code.

### Hardcoded English Strings (Not Going Through i18n)

| # | File | Line | String | Severity | Notes |
|---|------|------|--------|----------|-------|
| 1 | `assets/app.js` | 321 | `"It has been a while -- consider backing up your data."` | HIGH | Backup banner message shown to all users. Visible in-app. |
| 2 | `assets/app.js` | 330 | `"Back up now"` | HIGH | Backup banner button text. Visible in-app. |
| 3 | `assets/app.js` | 348 | `"Postpone to tomorrow"` | HIGH | Backup banner button text. Visible in-app. |
| 4 | `assets/app.js` | 358 | `"Postpone 1 week"` | HIGH | Backup banner button text. Visible in-app. |
| 5 | `assets/db.js` | 136 | `"Please close other tabs of this app to continue."` | MEDIUM | DB blocked banner. Edge case but user-visible. |
| 6 | `assets/db.js` | 167 | `"A newer version of this app is open. Please refresh to continue."` | MEDIUM | DB version changed banner. Edge case. |
| 7 | `assets/db.js` | 170 | `"Refresh"` | MEDIUM | Button text on version banner. |
| 8 | `assets/db.js` | 206-209 | `"Database update failed..."` / `"Refresh page"` | MEDIUM | Migration error banner. Rare edge case. |

### Demo Mode Banner Strings

The demo banner text in `assets/app.js:98-103` is hardcoded per-language in a local object (`DEMO_BANNER_TEXT`) rather than using the i18n system. This is acceptable since the demo mode is an isolated context and all 4 languages are provided inline.

### Landing Page Footer Link Translations (disclaimer.js)

The disclaimer.js footer labels (`FOOTER_LABELS`) are hardcoded in a local object per language rather than using the main i18n system. This is acceptable since disclaimer.html loads its own i18n file and all 4 languages are provided.

### Placeholder/TODO Text

No instances of "TODO", "PLACEHOLDER", "FIXME", "Lorem ipsum", or "[YOUR_" found in any i18n language file values. The i18n files are clean.

Note: `[YOUR_*]` placeholders exist in `impressum.html` and `landing.js` (Lemon Squeezy URL) for business details, but these are intentional per Phase 12 decision -- they are HTML content, not i18n string values.

### Empty String Values

No empty string values (`""`) found in any language file. All keys have substantive translations.

### Wrong-Language Values

No instances found of English text in non-English language files, or text in the wrong language for its file. All values in i18n-he.js are Hebrew, i18n-de.js are German, i18n-cs.js are Czech.

---

## RTL Layout Issues

### CSS Audit: app.css

**Physical `left`/`right` properties found: 1**

| Line | Property | Context | Assessment |
|------|----------|---------|------------|
| 1126 | `left:50%` | `.modal-close:before/after` pseudo-elements | SAFE -- centering trick with `transform: translate(-50%, -50%)`. Explicitly annotated in code: "centering trick -- not directional, keep as physical". |

**Result: No RTL issues in app.css.** The app CSS uses CSS logical properties (inset-inline-start/end, margin-inline-start/end, etc.) throughout per Phase 2 decision DSGN-03.

### CSS Audit: landing.css

| # | Line | Property | Context | Severity | Should Be |
|---|------|----------|---------|----------|-----------|
| 1 | 211 | `left: -10px` | `.hero-botanical-left` (decorative illustration) | LOW | `inset-inline-start: -10px` or keep physical (decorative, mirroring is optional) |
| 2 | 221 | `right: -10px` | `.hero-botanical-right` (decorative illustration) | LOW | `inset-inline-end: -10px` or keep physical |
| 3 | 244 | `left: -30px` | `.hero-botanical-left` media query | LOW | Same as #1 |
| 4 | 245 | `right: -30px` | `.hero-botanical-right` media query | LOW | Same as #2 |
| 5 | 1153, 1186 | `left: 50%` | `.demo-resize-handle--bottom::after`, `.demo-resize-handle::after` (centering grip dots) | SAFE | Centering trick with `transform: translate(-50%)` -- not directional |

**Assessment:** Lines 1-4 are decorative botanical illustrations positioned absolutely in the hero section. These are purely visual/decorative elements. In RTL mode, mirroring their positions is optional but would provide a more polished RTL experience. Lines 5 are centering tricks and are safe.

### CSS Audit: Other CSS Files

No directional CSS properties found in `demo.css` or any other CSS files.

### HTML `dir` Attribute Handling

| File | Has `dir` attr | Set dynamically | Assessment |
|------|---------------|----------------|------------|
| `index.html` | No (on `<html>`) | Yes -- `App.setLanguage()` sets `dir="rtl"` on `<body>` for HE | OK |
| `add-client.html` | No | Yes -- via `App.setLanguage()` | OK |
| `add-session.html` | No | Yes -- via `App.setLanguage()` | OK |
| `sessions.html` | No | Yes -- via `App.setLanguage()` | OK |
| `reporting.html` | No | Yes -- via `App.setLanguage()` | OK |
| `disclaimer.html` | `dir="ltr"` | Yes -- `disclaimer.js applyDirection()` sets `dir` on `<html>` | OK |
| `license.html` | `dir="ltr"` | Yes -- `license.js` sets `dir="rtl"` for HE on `<html>` | OK |
| `landing.html` | `dir="ltr"` | Yes -- `landing.js` sets `dir` dynamically | OK |
| `impressum.html` | `dir="ltr"` | Yes -- inline script sets `dir` based on lang | OK |
| `datenschutz.html` | `dir="ltr"` | Yes -- inline script sets `dir` based on lang | OK |
| `demo.html` | No | Yes -- via `App.setLanguage()` (runs inside iframe) | OK |

**Note:** Main app pages set `dir` on `<body>` (via `App.setLanguage()`), while standalone pages (disclaimer, license, landing, impressum, datenschutz) set `dir` on `<html>`. This inconsistency is minor but could cause issues if CSS selectors target `[dir="rtl"]` at the `<html>` level. Currently the app CSS uses `body` for direction, so this works.

### Inline Styles with Directional Properties

| File | Line | Property | Assessment |
|------|------|----------|------------|
| `datenschutz.html` | 39 | `style="display:none; margin-bottom: 2rem; padding: 1rem; ..."` | SAFE -- no directional properties |
| `assets/db.js` | 126-127 | `left:0; right:0` on error banners | SAFE -- full-width overlay using both left+right for stretching, not directional |

---

## Findings Summary by Priority

### HIGH Priority (User-facing, should fix before launch)

1. **Backup banner hardcoded English** (app.js:321-358) -- 4 strings visible to all users regardless of language setting. Should use i18n keys or inline per-language object like the demo banner does.

### MEDIUM Priority (Edge cases or minor polish)

2. **HE quotes mismatch** -- 35 vs 41 quotes. Phase 13 decision was to sync all languages to 41. HE is missing 6.
3. **DB error banners hardcoded English** (db.js:136, 167, 206) -- Edge case banners for multi-tab conflicts and migration failures. Rare but user-visible.

### LOW Priority (Dead code, decorative)

4. **Dead code: formatSessionType()** in overview.js:228-234 and sessions.js:38-44 references `session.form.inPerson`, `session.form.proxy`, `session.form.surrogate` which don't exist. These session types are no longer used.
5. **Landing.css physical left/right** on decorative botanical illustrations (lines 211, 221, 244, 245). Optional to convert to logical properties.
