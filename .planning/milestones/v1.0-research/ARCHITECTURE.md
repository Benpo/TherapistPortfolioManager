# Architecture Patterns

**Domain:** Vanilla JS multi-page app -- theming, i18n expansion, feature layering
**Researched:** 2026-03-09

## Recommended Architecture

The existing namespace-based multi-page architecture (window.App, window.PortfolioDB, window.I18N) is sound and should be preserved. Enhancements layer on top via three new concerns: a CSS custom properties design system for theming, an expanded i18n module with per-language JSON files, and a theme manager module. None of these require restructuring the existing page modules.

### Architecture Diagram

```
                    +-----------------------+
                    |     HTML Pages         |
                    | (index, add-client,    |
                    |  add-session, sessions,|
                    |  reporting, settings)  |
                    +-----------+-----------+
                                |
                    data-i18n   |   data-theme
                    attributes  |   attribute (html)
                                |
         +----------------------+----------------------+
         |                      |                      |
+--------v--------+   +--------v--------+   +--------v--------+
|  i18n Module     |   |  App Module      |   | Theme Module    |
|  window.I18N     |   |  window.App      |   | window.Theme    |
|                  |   |                  |   |                 |
| - loadLanguage() |   | - t()            |   | - toggle()      |
| - lang JSON files|   | - applyTransl()  |   | - init()        |
| - RTL map        |   | - setLanguage()  |   | - persist()     |
| - plurals        |   | - initCommon()   |   |                 |
+--------+---------+   +--------+---------+   +--------+--------+
         |                      |                      |
         |              +-------v-------+              |
         |              | DB Module     |              |
         |              | window.       |              |
         |              | PortfolioDB   |              |
         |              +---------------+              |
         |                                             |
         +------- localStorage -------+----------------+
                  (portfolioLang)      (portfolioTheme)
```

### Component Boundaries

| Component | Responsibility | Communicates With | Changes Needed |
|-----------|---------------|-------------------|----------------|
| **i18n.js** (existing) | Translation dictionary storage | App.t() reads it | Split into loader + per-language JSON files |
| **app.js** (existing) | UI utilities, translation lookup, language switching | All page modules, i18n data | Add RTL language map, locale-to-dir mapping for 4 languages |
| **db.js** (existing) | IndexedDB CRUD | All page modules | No changes for theming/i18n |
| **theme.js** (new) | Theme toggle, persistence, system preference detection | CSS custom properties, localStorage | New file |
| **app.css** (existing) | All styles | Theme via CSS custom properties | Refactor hardcoded colors to use design tokens |
| **Page modules** (existing) | Page-specific logic | App, PortfolioDB | Minimal changes -- use App.t() for new strings |
| **Language JSON files** (new) | Per-language translation data | i18n loader | New directory `assets/lang/` |

## Data Flow

### Theme Flow

```
1. Page loads
2. theme.js init():
   a. Check localStorage("portfolioTheme")
   b. If no saved preference, check prefers-color-scheme media query
   c. Set data-theme="light|dark" on <html> element
   d. CSS custom properties cascade automatically
3. User clicks toggle:
   a. Flip data-theme attribute on <html>
   b. Save to localStorage
   c. CSS transitions handle visual change (no JS DOM manipulation needed)
```

**Critical:** The theme script must execute synchronously before first paint to avoid flash of wrong theme (FOWT). Place a small inline `<script>` in `<head>` that reads localStorage and sets `data-theme` before CSS renders.

### i18n Flow (Enhanced)

```
1. Page loads
2. i18n-loader.js checks localStorage("portfolioLang")
3. If language data not in window.I18N[lang], fetch assets/lang/{lang}.json
4. App.setLanguage(lang):
   a. Set document.documentElement.lang = lang
   b. Set document.body.dir = RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr"
   c. Call applyTranslations()
   d. Dispatch app:language event
5. Page modules react to app:language event if they have dynamic content
```

### Feature Addition Flow (unchanged, documented for clarity)

```
1. Add translation keys to each language JSON file
2. Add HTML with data-i18n attributes
3. Add CSS using existing design tokens (custom properties)
4. Add JS logic in page module, using App.t() for dynamic strings
5. If new data fields: update db.js schema (bump DB_VERSION)
```

## Patterns to Follow

### Pattern 1: CSS Custom Properties Design Token System

**What:** Two-tier variable system -- semantic tokens reference primitive tokens. Theme switching only changes primitive values.

**When:** All color, shadow, and surface values in CSS.

**Why:** The current CSS already uses `:root` variables (--page-bg, --card-bg, --accent, etc.) but mixes hardcoded colors throughout. Converting to a full design token system means dark mode is just redefining ~15 variables, not rewriting hundreds of CSS rules.

**Example:**
```css
/* Primitive tokens -- defined per theme */
:root,
[data-theme="light"] {
  --color-cream-50: #faf8f0;
  --color-cream-100: #f5f0e0;
  --color-green-500: #4a7c59;
  --color-green-600: #3d6649;
  --color-green-700: #2f4f37;
  --color-orange-400: #e8945a;
  --color-orange-500: #d4793e;
  --color-neutral-900: #2f2d38;
  --color-neutral-600: #5f5c72;
  --color-neutral-100: #f6f3fb;
  --color-white: #ffffff;
  --color-danger: #ea4b4b;
  --color-success: #2fb37d;
  --shadow-alpha: 0.08;
}

[data-theme="dark"] {
  --color-cream-50: #1a1d1e;
  --color-cream-100: #232628;
  --color-green-500: #6aad7e;
  --color-green-600: #7dc293;
  --color-green-700: #4a7c59;
  --color-orange-400: #f0a86e;
  --color-orange-500: #e8945a;
  --color-neutral-900: #e8e6f0;
  --color-neutral-600: #a8a4b8;
  --color-neutral-100: #121315;
  --color-white: #1e2022;
  --color-danger: #f06060;
  --color-success: #3dcc8f;
  --shadow-alpha: 0.25;
}

/* Semantic tokens -- never change between themes */
:root {
  --surface-page: var(--color-cream-50);
  --surface-card: var(--color-white);
  --surface-elevated: var(--color-cream-100);
  --text-primary: var(--color-neutral-900);
  --text-secondary: var(--color-neutral-600);
  --accent-primary: var(--color-green-500);
  --accent-hover: var(--color-green-600);
  --accent-soft: var(--color-green-700);
  --interactive-danger: var(--color-danger);
  --interactive-success: var(--color-success);
  --shadow-card: 0 12px 26px rgba(0, 0, 0, var(--shadow-alpha));
}

/* Usage -- components reference semantic tokens only */
.card {
  background: var(--surface-card);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
}
```

### Pattern 2: Theme Module (new namespace)

**What:** Small IIFE managing theme state, toggle, and system preference detection.

**When:** Every page load (inline script for initial state, full module for toggle).

**Example:**
```javascript
/* Inline in <head> -- prevents flash of wrong theme */
(function() {
  var saved = localStorage.getItem('portfolioTheme');
  if (!saved) {
    saved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', saved);
})();

/* Full module in assets/theme.js */
window.Theme = (() => {
  function current() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portfolioTheme', theme);
    document.dispatchEvent(new CustomEvent('app:theme', { detail: { theme } }));
  }

  function toggle() {
    set(current() === 'light' ? 'dark' : 'light');
  }

  function init() {
    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        if (!localStorage.getItem('portfolioTheme')) {
          set(e.matches ? 'dark' : 'light');
        }
      });
  }

  return { current, set, toggle, init };
})();
```

### Pattern 3: Split i18n into Separate Language Files

**What:** Move from monolithic i18n.js (~310 lines, growing to ~600+ with 4 languages) to per-language JSON files loaded on demand.

**When:** When expanding from 2 to 4 languages.

**Why:** A single file with all languages is unmaintainable at 4+ languages. Separate files mean: (a) each language can be edited independently, (b) only the active language is loaded, (c) new languages are added without touching existing code.

**Structure:**
```
assets/
  lang/
    en.json      # English translations
    he.json      # Hebrew translations
    de.json      # German translations
    cs.json      # Czech translations
  i18n.js        # Loader (replaces current dictionary file)
```

**Example loader:**
```javascript
window.I18N = {};
window.I18N_DEFAULT = 'en';
window.I18N_RTL = ['he', 'ar'];  // Extensible RTL language list

window.I18NLoader = (() => {
  const loaded = new Set();

  async function loadLanguage(lang) {
    if (loaded.has(lang)) return;
    try {
      const resp = await fetch(`./assets/lang/${lang}.json`);
      if (!resp.ok) throw new Error(`Failed to load ${lang}`);
      window.I18N[lang] = await resp.json();
      loaded.add(lang);
    } catch (err) {
      console.warn(`i18n: Could not load "${lang}", falling back to default`);
      if (lang !== window.I18N_DEFAULT) {
        await loadLanguage(window.I18N_DEFAULT);
      }
    }
  }

  function isRTL(lang) {
    return window.I18N_RTL.includes(lang);
  }

  return { loadLanguage, isRTL };
})();
```

**Important caveat:** This approach requires HTTP (not file:// protocol) for `fetch()`. Since the app currently works from file://, provide a fallback: bundle the default language (English) inline in i18n.js, and lazy-load others. Or if distribution moves to hosted (Cloudflare Pages per PROJECT.md), this is a non-issue. See Pitfalls section.

### Pattern 4: RTL-Aware CSS with Logical Properties

**What:** Replace physical CSS properties (margin-left, padding-right, text-align: left) with CSS logical properties (margin-inline-start, padding-inline-end, text-align: start).

**When:** All new CSS. Gradually migrate existing `body[dir="rtl"]` overrides.

**Why:** The current app has ~20 RTL-specific overrides in app.css (body[dir="rtl"] .issue-remove { right:auto; left:0.75rem }). With 4 languages (1 RTL), logical properties eliminate these overrides entirely. The browser handles directionality automatically.

**Example:**
```css
/* BEFORE: Requires RTL override */
.issue-remove {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
}
body[dir="rtl"] .issue-remove {
  right: auto;
  left: 0.75rem;
}

/* AFTER: No RTL override needed */
.issue-remove {
  position: absolute;
  top: 0.75rem;
  inset-inline-end: 0.75rem;
}
```

**Browser support:** CSS logical properties have been baseline since 2020. Safe for all target browsers.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate Dark Mode Stylesheet

**What:** Creating a `dark.css` file that overrides all light mode styles.

**Why bad:** Doubles CSS maintenance. Every color change requires updating two files. Easy to miss rules, leading to broken dark mode.

**Instead:** Use CSS custom properties with `[data-theme="dark"]` selector. One stylesheet, one source of truth.

### Anti-Pattern 2: JavaScript-Driven Style Changes for Theme

**What:** Using `element.style.backgroundColor = darkColor` in JS to apply theme.

**Why bad:** Fights the cascade, hard to maintain, creates FOUC, doesn't respect CSS specificity. Cannot be overridden by media queries.

**Instead:** Set one attribute (`data-theme`) on `<html>` and let CSS custom properties cascade. JS only manages the attribute, never individual styles.

### Anti-Pattern 3: Monolithic Translation Object

**What:** Keeping all 4 languages in a single i18n.js file.

**Why bad:** With ~155 keys per language, 4 languages = 620+ key-value pairs in one file. Hard to diff in PRs, easy to miss keys, loads unused languages. Sapir (non-technical) will find this overwhelming.

**Instead:** Separate JSON files per language. Each file is ~155 lines, easy to review, easy to send to translators.

### Anti-Pattern 4: Feature Flags in CSS Classes

**What:** Using CSS classes like `.has-dark-mode` or `.theme-enabled` scattered across HTML.

**Why bad:** Couples feature awareness to markup. Hard to remove or change later.

**Instead:** Use a single `data-theme` attribute on `<html>`. Components are theme-unaware -- they just use CSS variables.

### Anti-Pattern 5: Duplicating Navigation HTML

**What:** The current pattern of copying the `<nav class="app-nav">` block into every HTML page.

**Why bad:** Adding a new page or changing navigation requires editing 5+ HTML files. Adding a language option to the `<select>` requires editing every file. This is the single biggest maintenance problem in the current codebase.

**Instead:** Extract navigation into a JS-generated component. App.initCommon() already sets up nav behavior -- extend it to render the nav HTML too. Or use an HTML `<template>` element with JS insertion.

## Suggested Build Order

Based on component dependencies, build in this order:

### Phase 1: CSS Design Tokens (Foundation)

**Why first:** Everything else depends on the color system being tokenized. Cannot do dark mode without design tokens. Does not break any existing functionality.

1. Define semantic token variables in `:root`
2. Replace all hardcoded colors in app.css with token references
3. Verify nothing breaks visually (pure refactor, no behavior change)

**Dependencies:** None
**Risk:** Low (CSS-only refactor)
**Validates:** Token naming works, full coverage, no missed colors

### Phase 2: Theme Module + Dark Mode

**Why second:** Builds directly on Phase 1's tokens. High-visibility feature.

1. Create `assets/theme.js` module
2. Add inline `<head>` script to all pages (FOWT prevention)
3. Define `[data-theme="dark"]` token overrides in app.css
4. Add theme toggle button to header (all pages)
5. Add CSS transitions for theme switching

**Dependencies:** Phase 1 (design tokens)
**Risk:** Medium (dark mode color tuning is iterative)

### Phase 3: i18n Restructure

**Why third:** Independent of theming but enables Phase 4. Current i18n works, so this is enhancement not fix.

1. Extract current en/he dictionaries into `assets/lang/en.json` and `assets/lang/he.json`
2. Replace i18n.js with loader module
3. Keep English bundled inline as fallback (file:// compatibility)
4. Update App.setLanguage() to call I18NLoader.loadLanguage()
5. Add German (de.json) and Czech (cs.json) translation files
6. Update language `<select>` on all pages to show 4 options

**Dependencies:** None (can parallel with Phase 2 if desired)
**Risk:** Medium (file:// fetch limitation, see Pitfalls)

### Phase 4: RTL CSS Migration + Navigation Component

**Why fourth:** Polish and DX improvements. Not user-facing priority.

1. Migrate physical CSS properties to logical properties
2. Remove `body[dir="rtl"]` override blocks
3. Extract shared navigation HTML into JS-rendered component
4. Add settings page (language + theme preferences in one place)

**Dependencies:** Phase 2 (theme toggle in nav), Phase 3 (language select in nav)
**Risk:** Low (CSS modernization, well-supported)

## Scalability Considerations

| Concern | Current (2 langs, light only) | At 4 languages | At dark mode + 4 langs |
|---------|-------------------------------|-----------------|------------------------|
| CSS file size | ~1100 lines, manageable | Same | +50 lines for dark tokens, total ~1150 |
| i18n file size | 310 lines in one file | 620+ lines in one file (bad) | Same -- decouple from theme |
| Translation keys | ~155 per language | 155 * 4 = 620 entries to manage | Same |
| RTL overrides | ~20 body[dir="rtl"] rules | Same | Same -- logical properties eliminate |
| Page count | 5 HTML files | 5-6 HTML files | Same |
| Nav duplication | 5 copies of nav HTML | Every new page adds another | JS-rendered nav fixes this |

## File:// Protocol Constraints

The app's requirement to work from `file://` protocol constrains certain patterns:

| Feature | Works on file://? | Workaround |
|---------|-------------------|------------|
| CSS custom properties | Yes | N/A |
| data-theme attribute | Yes | N/A |
| localStorage | Yes (most browsers) | N/A |
| fetch() for JSON | No (CORS blocks) | Bundle default language inline, lazy-load others only when hosted |
| ES modules (import) | No (CORS blocks) | Continue using script tags and IIFEs |
| Service workers | No | Only for hosted distribution |

**Recommendation:** Keep the file:// compatibility contract but design the i18n loader with a hosted-first approach. Bundle English inline as fallback. When distribution moves to Cloudflare Pages (per PROJECT.md), all fetch-based loading works automatically.

## Sources

- [CSS-Tricks: A Complete Guide to Dark Mode on the Web](https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/) -- comprehensive dark mode implementation patterns
- [web.dev: CSS color-scheme-dependent colors with light-dark()](https://web.dev/articles/light-dark) -- modern CSS light-dark() function
- [EightShapes: Light & Dark Color Modes in Design Systems](https://medium.com/eightshapes-llc/light-dark-9f8ea42c9081) -- design token layering strategy
- [DEV Community: Beyond Light/Dark Mode with CSS Custom Properties](https://dev.to/code_2/beyond-lightdark-mode-implementing-dynamic-themes-with-css-custom-properties-ik2) -- multi-theme token architecture
- [whitep4nth3r: Best light/dark mode theme toggle in JavaScript](https://whitep4nth3r.com/blog/best-light-dark-mode-theme-toggle-javascript/) -- FOWT prevention and preference cascade
- [GitHub: vanilla-i18n](https://github.com/thealphadollar/vanilla-i18n) -- lightweight vanilla JS i18n approach
- [DEV Community: Frontend Internationalization Strategies](https://dev.to/tianyaschool/frontend-internationalization-i18n-strategies-and-tools-117c) -- i18n patterns for non-framework apps
- [Phrase: Best JavaScript I18n Libraries](https://phrase.com/blog/posts/the-best-javascript-i18n-libraries/) -- library comparison (used to justify zero-dep approach)

---

*Architecture research: 2026-03-09*
