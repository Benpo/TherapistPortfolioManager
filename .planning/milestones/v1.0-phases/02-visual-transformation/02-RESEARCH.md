# Phase 2: Visual Transformation - Research

**Researched:** 2026-03-09
**Domain:** CSS theming, dark mode, logical properties, vanilla JS component injection
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Garden Palette**
- Extract color values directly from the Lovable reference app (sessiongardenem) — warm cream, garden green primary, orange accents
- Claude has discretion to adjust individual shades while preserving the original atmosphere
- Replace all purple primitive tokens in `tokens.css` with garden green / cream / orange values
- Semantic token names remain the same (`--color-primary`, `--color-background`, etc.) — only the primitive values change

**Dark Mode — Feel and Colors**
- Atmosphere: "night garden" — deep forest/dark green backgrounds, with garden colors still visible (not generic dark)
- Text: Claude decides — light/cream text on dark backgrounds for readability
- Orange accent: Claude decides — may keep as-is or slightly shift hue for contrast on dark backgrounds
- Implementation: Replace the placeholder dark values in `tokens.css` `[data-theme="dark"]` block with real garden night palette (the placeholder was left explicitly for this phase)

**Theme Toggle (Light/Dark)**
- Icon-only button: moon icon visible in light mode → click switches to dark; sun icon in dark mode → click switches to light
- Location: `header-actions` area in the header, next to the language selector
- Behavior: persisted to localStorage, no flash on reload (already established requirement from DSGN-02)

**App Name and Brand Area**
- Main title: "Sessions Garden" (replaces "Emotion Code Portfolio")
- Subtitle: Claude decides — must describe the tool's purpose without trademarked terms. Tone: clean, professional, warm
- Brand mark icon: Stylized leaf/swirl (curved stem with leaf tip) — organic, rounded, garden-themed. Claude implements as CSS shape or inline SVG. Current "EC" text replaced by this icon
- Brand mark background color: garden green primary (from palette)

**CSS Logical Properties Migration (DSGN-03)**
- Replace all directional CSS in `app.css` with logical equivalents:
  - `margin-left` → `margin-inline-start`
  - `margin-right` → `margin-inline-end`
  - `text-align: left/right` → `text-align: start/end`
  - `left: X` / `right: X` in positioned elements → `inset-inline-start` / `inset-inline-end`
- Goal: switching to Hebrew RTL requires zero CSS overrides

**Navigation Component (DSGN-04)**
- Current: nav HTML is copy-pasted identically across all 5 HTML pages
- Target: JS-rendered nav — `app.js` injects nav HTML into a `<div id="nav-placeholder">` in each page
- Active state detection: already works via `data-nav` attribute on `<body>` — carry this forward
- Nav visual style: updated to match garden theme (green active pill, cream background)

### Claude's Discretion
- Exact subtitle text for the brand area
- Specific dark mode color values (night garden palette)
- CSS implementation of the leaf/swirl brand mark icon
- Whether to use CSS shape or inline SVG for brand mark
- Orange accent hue in dark mode

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within Phase 2 scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DSGN-01 | Garden/nature theme overhaul — warm cream background, garden green primary, orange accents, Rubik font | Color palette analysis, token architecture already in place (Phase 1), primitive token replacement strategy |
| DSGN-02 | Dark mode with light/dark toggle persisted to localStorage, no flash of wrong theme on load | No-flash inline script pattern, `[data-theme="dark"]` on `<html>`, localStorage key `portfolioTheme`, toggle button placement |
| DSGN-03 | CSS logical properties migration replacing all directional CSS | Full audit of 17 directional instances in app.css, `body[dir="rtl"]` overrides that become redundant after migration |
| DSGN-04 | Navigation component extraction — JS-rendered nav replacing copy-pasted HTML across 5 pages | Nav HTML already identical across all 5 files, `renderNav()` injection into `<div id="nav-placeholder">`, active state via `data-nav` on body |
</phase_requirements>

---

## Summary

Phase 2 is entirely contained within three files (`tokens.css`, `app.css`, `app.js`) plus five HTML files, with no new dependencies and no data-model changes. Phase 1 deliberately left two "sockets" open for this phase: the primitive color block in `tokens.css` (currently purple values) and the dark mode override block (currently labelled "Phase 1 placeholder"). Both are replaced wholesale by Phase 2.

The work decomposes into four independent streams that can be parallelized within waves: (1) color palette swap in `tokens.css`, (2) dark mode night-garden values in `tokens.css` plus the no-flash script and toggle button in HTML/JS, (3) logical properties migration in `app.css`, and (4) nav component extraction into `app.js` with HTML placeholder substitution. Streams 1 and 2 must land before any visual verification, but 3 and 4 are fully independent of the palette.

The primary risk is contrast accessibility: warm cream on garden green in dark contexts must meet WCAG AA. The planner should include a verification step that spot-checks at least primary/background/text combinations in both modes.

**Primary recommendation:** Execute in two waves — Wave 1: token palette + no-flash script + nav extraction (foundation); Wave 2: dark mode palette + toggle button + logical properties (polish). Both waves are small and low-risk.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS Custom Properties | Native | Two-tier design token system | Already in place from Phase 1; semantic names unchanged |
| Vanilla JS | ES2020 | Nav injection + theme toggle | No framework in this project; `window.App` namespace is established |
| localStorage | Native | Theme persistence | Already used for `portfolioLang`; `portfolioTheme` key follows same pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Inline SVG | Native | Leaf/swirl brand mark icon | No external asset needed; 48x48 icon is trivial as SVG path |
| CSS logical properties | Native (96%+ browser support as of 2024) | RTL-safe layout | Replaces all `margin-left/right`, `text-align: left/right`, positioned `left/right` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline SVG for brand mark | CSS clip-path / border tricks | CSS shapes are fragile at 48px; SVG gives exact path control for organic leaf shape |
| localStorage for theme | `prefers-color-scheme` media query | media query was explicitly rejected in Phase 1 — user toggle with persistence is the requirement |
| JS nav injection | Web Components / `<template>` includes | No build step; plain JS injection is consistent with project's zero-dependency philosophy |

**Installation:** No new packages required. This phase is pure CSS + vanilla JS.

---

## Architecture Patterns

### Recommended Project Structure
```
assets/
├── tokens.css       # Wave 1: replace primitive block + dark block
├── app.css          # Wave 2: logical properties migration (~17 instances)
└── app.js           # Wave 1: renderNav() + initThemeToggle() added to initCommon()
index.html           # Wave 1: add nav-placeholder, inline no-flash script
sessions.html        # Wave 1: same
add-client.html      # Wave 1: same
add-session.html     # Wave 1: same
reporting.html       # Wave 1: same
```

### Pattern 1: No-Flash Theme Initialization
**What:** An inline `<script>` tag inside `<head>` (before any stylesheet renders) reads localStorage and immediately sets `data-theme` on `<html>`. This ensures the correct theme is applied before the first paint.
**When to use:** Every HTML file, always the first script in `<head>`.
**Example:**
```html
<!-- Placed in <head>, before CSS links -->
<script>
  (function() {
    var t = localStorage.getItem('portfolioTheme');
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  })();
</script>
```
This pattern is well-established for CSS custom property dark mode. Keeping it inline (not in a `.js` file) is critical — any deferred script would cause a flash.

### Pattern 2: JS Nav Injection
**What:** `app.js` renders nav HTML string into a placeholder `<div>` on every page load. Active state is set by reading `document.body.dataset.nav` (already in all 5 HTML files).
**When to use:** Called from `initCommon()`, which already runs on every page.
**Example:**
```javascript
function renderNav() {
  const placeholder = document.getElementById('nav-placeholder');
  if (!placeholder) return;
  placeholder.innerHTML = `
    <nav class="app-nav">
      <a href="./index.html" data-nav="overview" data-i18n="nav.overview">Overview</a>
      <a href="./sessions.html" data-nav="sessions" data-i18n="nav.sessions">Sessions</a>
      <a href="./reporting.html" data-nav="reporting" data-i18n="nav.reporting">Reporting</a>
      <span class="nav-divider" aria-hidden="true"></span>
      <a href="./add-client.html" data-nav="addClient" data-i18n="nav.addClient">Add Client</a>
      <a href="./add-session.html" data-nav="addSession" data-i18n="nav.addSession">Add Session</a>
    </nav>`;
  // Apply active state using the existing data-nav pattern
  const navKey = document.body.dataset.nav;
  if (navKey) {
    placeholder.querySelectorAll('a[data-nav]').forEach(link => {
      link.classList.toggle('active', link.dataset.nav === navKey);
    });
  }
  // Apply translations (i18n) to newly injected HTML
  applyTranslations(placeholder);
}
```
Note: `applyTranslations` must be called AFTER injection so `data-i18n` attributes get translated. The function is already defined in `app.js`.

### Pattern 3: Theme Toggle Button
**What:** An icon-only `<button>` in `.header-actions` that swaps between moon/sun icons and toggles `data-theme="dark"` on `<html>`.
**When to use:** Injected by `initThemeToggle()` called from `initCommon()`.
**Example:**
```javascript
function initThemeToggle() {
  const actions = document.querySelector('.header-actions');
  if (!actions) return;
  const btn = document.createElement('button');
  btn.className = 'button ghost theme-toggle';
  btn.setAttribute('aria-label', 'Toggle dark mode');
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  const update = () => { btn.textContent = isDark() ? '☀️' : '🌙'; };
  update();
  btn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next === 'dark' ? 'dark' : '');
    if (next === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('portfolioTheme', next);
    update();
  });
  actions.prepend(btn);
}
```

### Pattern 4: CSS Logical Properties Migration
**What:** Replace physical directional properties with logical equivalents. The `body[dir="rtl"]` override blocks become redundant for migrated properties and can be removed.
**When to use:** Every instance of `margin-left/right`, `padding-left/right`, `text-align: left/right`, and positioned `left/right` in `app.css`.

Mapping reference:
```
margin-left   → margin-inline-start
margin-right  → margin-inline-end
padding-left  → padding-inline-start
padding-right → padding-inline-end
text-align: left  → text-align: start
text-align: right → text-align: end
left: X       → inset-inline-start: X
right: X      → inset-inline-end: X
border-left   → border-inline-start
border-right  → border-inline-end
align-items: flex-start (in RTL context) → already logical, no change needed
flex-direction: row-reverse (in RTL context) → evaluate case by case
```

### Anti-Patterns to Avoid
- **No-flash script in a `.js` file:** Any externally loaded script (even `defer`-free) may execute after CSS renders on slow connections. Must be a literal inline `<script>` block in `<head>`.
- **Setting `data-theme` on `<body>` instead of `<html>`:** The Phase 1 decision was `<html>` element. All CSS selectors are already written as `[data-theme="dark"]` scoped to `:root`. Changing this would break all dark overrides.
- **Directly modifying semantic token names:** Only primitive values change. Semantic names (`--color-primary`, `--color-background`, etc.) must remain identical — they are referenced throughout all 1097 lines of app.css.
- **Removing `body[dir="rtl"]` overrides wholesale before confirming logical property parity:** Some RTL overrides (like `flex-direction: row-reverse` on `.session-header`) address layout flow, not just spacing — those are not replaced by logical properties.
- **Hardcoding colors in the backup banner:** The banner in `app.js` uses inline `style.cssText` with `var(--color-primary-soft, #efeafe)` fallbacks. The fallback values reference old purple values. These fallback hex values must also be updated when the palette changes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Leaf icon graphics | Custom canvas/DOM drawing | Inline SVG `<path>` | SVG paths are resolution-independent, easily tuned, 3-5 lines of code |
| Theme flash prevention | setTimeout / requestAnimationFrame hacks | Inline `<script>` in `<head>` | Only synchronous execution before first paint reliably prevents flash |
| Nav "active" state router | URL parsing logic | Existing `data-nav` on `<body>` | Pattern already works; nav injection just needs to read it |

**Key insight:** Every problem in this phase already has a solved pattern. The work is applying known techniques to a well-understood codebase, not designing new systems.

---

## Common Pitfalls

### Pitfall 1: Logical Properties and `left: 50%` (centering)
**What goes wrong:** `left: 50%` combined with `transform: translateX(-50%)` is a centering trick, not a directional layout choice. Replacing with `inset-inline-start: 50%` is technically correct but may confuse future maintainers who recognize the centering pattern.
**Why it happens:** Mechanical find-replace without understanding intent.
**How to avoid:** For `left: 50%` (line 986 in app.css: `.modal-close:before,after`), it is used for the X-icon cross hair centering — this is a transform-based centering pattern, not directionality. Leave it as `left: 50%` or comment intent clearly if converting.
**Warning signs:** Any `left/right: 50%` paired with a `transform` that also has `-50%` is centering, not directionality.

### Pitfall 2: Backup Banner Inline Fallback Colors
**What goes wrong:** `app.js` backup banner uses inline `style.cssText` with hardcoded hex fallbacks (e.g., `var(--color-primary-soft,#efeafe)`). After the palette swap, `#efeafe` is the old purple-soft color. If tokens.css is ever absent, the banner shows old purple colors.
**Why it happens:** Fallback values are easy to overlook when only editing `tokens.css`.
**How to avoid:** Update fallback hex values in `showBackupBanner()` in `app.js` when primitive tokens change. Or remove fallbacks entirely (tokens.css is always present).
**Warning signs:** Purple tint on the backup banner in a garden-themed app.

### Pitfall 3: `applyTranslations` Must Be Called After Nav Injection
**What goes wrong:** If `renderNav()` injects HTML with `data-i18n` attributes but `applyTranslations` was already called in `initCommon()` before `renderNav()`, the nav labels display raw i18n keys instead of translated text.
**Why it happens:** Order-of-execution in `initCommon()` matters — `setLanguage()` (which calls `applyTranslations()`) runs before nav is injected if `renderNav()` is called last.
**How to avoid:** Either (a) call `applyTranslations(placeholder)` at the end of `renderNav()`, or (b) ensure `renderNav()` is called before `setLanguage()` in `initCommon()`. Option (a) is more resilient.
**Warning signs:** Nav links showing `nav.overview`, `nav.sessions` etc. as literal text.

### Pitfall 4: RTL Override Removal — Layout vs. Spacing
**What goes wrong:** After logical property migration, some `body[dir="rtl"]` blocks become redundant but others do not. Deleting all RTL overrides breaks layout.
**Why it happens:** Logical properties fix `margin-inline-start/end`, `inset-inline-start/end`, and `text-align: start/end` automatically. But `flex-direction: row-reverse` (`.session-header`), `justify-content: flex-start` (`.row-actions`), and `align-self: flex-end` (`.heartwall-badge`) are semantic overrides, not replaceable by logical properties.
**How to avoid:** After migration, review each `body[dir="rtl"]` block and only remove the ones whose properties have been migrated. Keep semantic flex overrides.
**Warning signs:** `.session-header` has wrong element order in RTL; `.row-actions` is right-aligned in RTL.

### Pitfall 5: Dark Mode Contrast on Garden Green
**What goes wrong:** Garden green (deep forest green like `#1a2e1a` or similar) as a background with orange accent text may fail WCAG AA (4.5:1 ratio for normal text).
**Why it happens:** Orange (#f97316 or similar) on dark green has variable contrast depending on exact shades chosen.
**How to avoid:** Verify primary action button contrast (primary color on surface) and badge contrast in dark mode. Use browser DevTools color contrast checker or https://webaim.org/resources/contrastchecker/ before finalizing dark token values.
**Warning signs:** Squinting at the dark mode app; text looks "muddy."

---

## Code Examples

### Directional CSS Audit (all 17 instances in app.css)

Full inventory of lines requiring logical property migration:

```
Line 289:  text-align: left            → text-align: start          (.table th/td)
Line 297:  text-align: right           → REMOVE (was RTL override — replace with logical on base)
Line 431:  text-align: right           → text-align: end             (.session-actions-cell)
Line 621:  right: 0.75rem              → inset-inline-end: 0.75rem   (.issue-remove absolute position)
Line 705:  right: 2rem                 → inset-inline-end: 2rem      (.toast fixed position)
Line 775:  margin-left: 0              → margin-inline-start: 0      (body[dir="rtl"] .row-toggle — remove after logical on base)
Line 776:  margin-right: 0             → margin-inline-end: 0        (body[dir="rtl"] .row-toggle — remove after logical on base)
Line 791:  text-align: right           → REMOVE (RTL override — base gets text-align: start)
Line 796:  left: 0.75rem               → inset-inline-start: 0.75rem (body[dir="rtl"] .issue-remove — remove after base gets inset-inline-end)
Line 800:  text-align: right           → REMOVE (RTL override)
Line 871:  margin-left: .35rem         → margin-inline-start: .35rem (.heart-badge)
Line 883:  margin-left: 0              → REMOVE (RTL override for .heart-badge — base uses logical)
Line 884:  margin-right: .35rem        → REMOVE (RTL override for .heart-badge — base uses logical)
Line 972:  right: 1rem                 → inset-inline-end: 1rem      (.modal-close absolute position)
Line 986:  left: 50%                   → KEEP (centering trick, not directional)
Line 1066: left: 1rem                  → REMOVE (body[dir="rtl"] .modal-close — base gets inset-inline-end)
Line 1074: text-align: left            → REMOVE (body[dir="rtl"] .session-actions-cell → base gets text-align: end)
Line 1096: text-align: right           → REMOVE (body[dir="rtl"] .modal-card — add text-align: start on base instead)
```

Note: Lines 730-743 contain `align-items: flex-start` / `flex-end` — these are already logical-ish (flex axis adapts to direction in many cases) but the `.app-header` override at line 736 (`body[dir="rtl"] .app-header { align-items: flex-end }`) is a semantic override that should be kept until I18N-04 validation.

### Token Replacement Reference (what changes in tokens.css)

**Primitive block — replace purple names with garden names:**
```css
/* BEFORE */
--color-purple-600: #7c66ff;
/* AFTER (example — exact values from palette research) */
--color-green-600: #2d6a4f;   /* garden green primary */
--color-cream-warm-50: #fdf8f0; /* warm cream background */
--color-orange-500: #f97316;   /* orange accent */
```
The semantic mappings in the second `:root` block update accordingly:
```css
/* Semantic block — name stays, value reference changes */
--color-primary: var(--color-green-600);         /* was --color-purple-600 */
--color-background: var(--color-cream-warm-50);  /* was --color-cream-50 */
```

### No-Flash Script (canonical form for all 5 HTML files)
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script>
    (function() {
      try {
        var t = localStorage.getItem('portfolioTheme');
        if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
      } catch(e) {}
    })();
  </script>
  <title>Sessions Garden</title>
  <link rel="stylesheet" href="./assets/tokens.css" />
  <link rel="stylesheet" href="./assets/app.css" />
</head>
```
The `try/catch` guards against browsers with localStorage disabled (private browsing, strict settings).

### Nav Placeholder in HTML (replace existing `<header>` nav section)
```html
<!-- Replace the copy-pasted <nav class="app-nav"> block with: -->
<header class="app-header">
  <div class="brand">
    <!-- brand mark SVG + title here -->
  </div>
  <div id="nav-placeholder"></div>
  <div class="header-actions">
    <!-- language select here; theme toggle injected by JS -->
  </div>
</header>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `margin-left/right` | `margin-inline-start/end` | CSS Logical Properties Level 1 (W3C) | 96%+ browser support, zero RTL overrides needed |
| Flash-of-unstyled-theme via CSS media query | Inline `<script>` sets attribute before paint | Standard since dark mode became mainstream (~2019) | Eliminates visible flash on reload |
| `prefers-color-scheme` only | `[data-theme="dark"]` + user toggle | Last 3-4 years as UX standard | User preference beats OS preference |

**Deprecated/outdated:**
- `body[dir="rtl"]` override blocks: Still valid but unnecessary after logical property migration for spacing/alignment properties. Keep only for semantic flex direction overrides.
- `EC` text brand mark: Replaced by leaf/swirl SVG. The `font-weight: 800` on `.brand-mark` will be unused after SVG replacement — can be removed.

---

## Open Questions

1. **Exact garden green primary hex value**
   - What we know: "warm cream, garden green primary, orange accents" from Lovable reference app (sessiongardenem)
   - What's unclear: The exact hex values are not in the codebase; they must be extracted from the reference app or decided fresh
   - Recommendation: Claude has discretion to select values. Suggested starting point: primary green `#2d6a4f` (deep forest), cream `#fdf8f0` (warm off-white), orange `#f97316` (vibrant but not garish). These are well-known accessible combinations. Adjust from there.

2. **Leaf/swirl brand mark implementation**
   - What we know: 48x48px area, rounded leaf + swirl shape, garden green background, replaces "EC" text
   - What's unclear: Whether CSS `clip-path` or `<path>` SVG is preferred — either works at this size
   - Recommendation: Use inline SVG `<path>` with viewBox="0 0 24 24" for crispness at all scales. A single organic bezier curve (leaf shape) is ~40 bytes of path data.

3. **`body[dir="rtl"] .app-header { align-items: flex-end }` at line 736**
   - What we know: This makes the column-stacked header right-align its children in RTL at narrow widths
   - What's unclear: After logical property migration, `flex-start` is already the "inline-start" side. `align-items` does not have a logical equivalent in flexbox cross-axis (it always refers to cross axis). The RTL override uses `align-items: flex-end` to right-align in narrow RTL — this is a presentation decision, not a logical property issue.
   - Recommendation: Keep this override as-is. Document it with a comment: "intentional: right-align stacked header in RTL".

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — no test infrastructure exists yet (FOUND-05 / Phase 6) |
| Config file | none |
| Quick run command | N/A — visual/manual verification |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DSGN-01 | Garden palette visible in browser — cream bg, green primary, orange accents | manual smoke | Open index.html in browser, verify colors | N/A |
| DSGN-02 | Theme toggle persists across reload, no flash | manual smoke | Toggle dark, reload page — verify no flash; verify localStorage `portfolioTheme` = "dark" | N/A |
| DSGN-03 | RTL layout correct after logical migration | manual smoke | Switch to Hebrew (עברית), inspect layout on all 5 pages | N/A |
| DSGN-04 | Nav renders on all 5 pages from single source | manual smoke | Change a nav label in `renderNav()`, verify it appears on all 5 pages without touching HTML | N/A |

### Sampling Rate
- **Per task commit:** Open the affected page in browser, verify no visual regression
- **Per wave merge:** Check all 5 pages in both light and dark modes, in LTR and RTL
- **Phase gate:** All 5 pages pass visual inspection in 4 combinations (light/dark x LTR/RTL) before `/gsd:verify-work`

### Wave 0 Gaps
None — this phase requires no automated test infrastructure. Formal test suite is FOUND-05 scope (Phase 6). All Phase 2 verification is manual browser inspection.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read — `assets/tokens.css` (146 lines), `assets/app.css` (1097 lines), `assets/app.js` (~290 lines), all 5 HTML files
- `.planning/phases/02-visual-transformation/02-CONTEXT.md` — user decisions

### Secondary (MEDIUM confidence)
- CSS Logical Properties Level 1 spec — browser support 96%+ per MDN (verified pattern, widely documented)
- No-flash inline script pattern — industry standard for CSS custom property dark mode (documented by Josh Comeau, CSS-Tricks, and MDN)
- `[data-theme="dark"]` on `<html>` — established in Phase 1 decisions, consistent with how CSS custom property overrides work

### Tertiary (LOW confidence)
- Garden color palette exact values — not verified against Lovable reference app; suggested values are judgment calls based on common garden/nature design systems

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no external libraries; everything is native CSS and vanilla JS, all patterns are established
- Architecture: HIGH — code is fully read; integration points are unambiguous; all 17 directional CSS instances catalogued
- Pitfalls: HIGH — all pitfalls derive from direct code inspection (line numbers provided)
- Color palette exact values: LOW — must be chosen; exact values not locked

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable — no dependency upgrades possible; pure CSS/JS)
