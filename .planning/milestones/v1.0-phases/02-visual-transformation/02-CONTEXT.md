# Phase 2: Visual Transformation - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Visual overhaul of the app into a sellable product: garden theme palette, dark mode with toggle, CSS logical properties migration, and JS-rendered navigation component replacing copy-pasted HTML across all 5 pages. No data model changes, no new features — only visual/CSS/navigation infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Garden Palette
- Extract color values directly from the Lovable reference app (sessiongardenem) — warm cream, garden green primary, orange accents
- Claude has discretion to adjust individual shades while preserving the original atmosphere
- Replace all purple primitive tokens in `tokens.css` with garden green / cream / orange values
- Semantic token names remain the same (`--color-primary`, `--color-background`, etc.) — only the primitive values change

### Dark Mode — Feel and Colors
- Atmosphere: "night garden" — deep forest/dark green backgrounds, with garden colors still visible (not generic dark)
- Text: Claude decides — light/cream text on dark backgrounds for readability
- Orange accent: Claude decides — may keep as-is or slightly shift hue for contrast on dark backgrounds
- Implementation: Replace the placeholder dark values in `tokens.css` `[data-theme="dark"]` block with real garden night palette (the placeholder was left explicitly for this phase)

### Theme Toggle (Light/Dark)
- Icon-only button: moon icon 🌙 visible in light mode → click switches to dark; sun icon ☀️ in dark mode → click switches to light
- Location: `header-actions` area in the header, next to the language selector
- Behavior: persisted to localStorage, no flash on reload (already established requirement from DSGN-02)

### App Name and Brand Area
- **Main title:** "Sessions Garden" (replaces "Emotion Code Portfolio")
- **Subtitle:** Claude decides — must describe the tool's purpose (documenting sessions, keeping order and accessibility of information) without using trademarked terms like "Emotion Code" or "Body Code". Tone: clean, professional, warm
- **Brand mark icon:** Stylized leaf/swirl (curved stem with leaf tip) — organic, rounded, garden-themed. Claude implements as CSS shape or inline SVG. Current "EC" text replaced by this icon
- Brand mark background color: garden green primary (from palette)

### CSS Logical Properties Migration (DSGN-03)
- Replace all directional CSS in `app.css` with logical equivalents:
  - `margin-left` → `margin-inline-start`
  - `margin-right` → `margin-inline-end`
  - `text-align: left/right` → `text-align: start/end`
  - `left: X` / `right: X` in positioned elements → `inset-inline-start` / `inset-inline-end`
- Goal: switching to Hebrew RTL requires zero CSS overrides

### Navigation Component (DSGN-04)
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

</decisions>

<specifics>
## Specific Ideas

- "לא רצוני להשתמש בשם Emotion Code מבחינת קניין רוחני" — הכותרת הראשית היא "Sessions Garden"; הכתובית-משנה מתארת את הכלי בלי שמות מסחריים
- "אני רוצה משהו של גינה, פתוחה להצעות" — סמל ה-brand mark: עלה מסתיים בסליל/שביל — אורגני, מעוגל, מסוגנן יותר מ-emoji פשוט
- "שמור על האווירה המקורית" — הצבעים מ-Lovable הם ה-source of truth; Claude יכול לכוונן אך לא לשנות כיוון

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `assets/tokens.css`: Two-tier architecture (primitives + semantic tokens) is ready — Phase 2 replaces the primitive values only. Dark mode `[data-theme="dark"]` block has placeholder values explicitly waiting for this phase.
- `assets/app.css`: 1097 lines, already uses semantic token variables throughout — no hardcoded colors to replace (Phase 1 did this). Needs logical property migration (~15 directional CSS instances).
- `assets/app.js` → `initCommon()`: Runs on every page load. Best place to: (1) inject nav component, (2) initialize theme toggle logic. Already handles language selection and active nav state via `data-nav` on `<body>`.
- localStorage: Already used for language (`portfolioLang`) — theme preference can use `portfolioTheme` key.

### Established Patterns
- Dark mode: `[data-theme="dark"]` on `<html>` element (decided in Phase 1) — NOT `prefers-color-scheme`
- CSS naming: kebab-case, `is-*` / `has-*` utility classes
- No flash of wrong theme: must set `data-theme` attribute via inline `<script>` in `<head>` before CSS renders
- Nav active state: `data-nav` on `<body>` → JS toggles `.active` class on nav links. Pattern already works.
- Global namespace: `window.App` — theme toggle and nav injection extend `App.initCommon()`

### Integration Points
- `assets/tokens.css`: Replace primitive color block + replace dark mode block
- `assets/app.css`: Logical property migration (15 instances) + nav placeholder styling
- All 5 HTML files: Replace copy-pasted `<header>` nav HTML with `<div id="nav-placeholder"></div>`, add `<script>` in `<head>` for no-flash theme init
- `assets/app.js`: Add `renderNav()` + `initThemeToggle()` functions to `initCommon()`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 2 scope.

</deferred>

---

*Phase: 02-visual-transformation*
*Context gathered: 2026-03-09*
