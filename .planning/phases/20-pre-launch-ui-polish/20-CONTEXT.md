# Phase 20: Pre-Launch UI Polish - Context

**Gathered:** 2026-03-25
**Status:** Ready for research/planning

<domain>
## Phase Boundary

Fix 6 UX pain points and add missing UI chrome so the app feels consistent and polished before selling. No new features — just fixing gaps, adding missing elements, and unifying visual language across app pages, license page, and legal pages.

</domain>

<decisions>
## Implementation Decisions

### App Header Redesign (POLISH-06)
- **D-01:** Language selector adopts the landing page's button+popover pattern (globe icon button → popover with language options), replacing the current `<select>` dropdown
- **D-02:** Dark mode toggle becomes an equally-sized icon button (moon/sun emoji is fine) matching the language selector dimensions
- **D-03:** License key button removed from header entirely — moved to a settings or menu area (out of header)
- **D-04:** Mobile behavior: two-row layout is acceptable if intentional (nav row + controls row), no hamburger menu needed
- **D-05:** Header should use full available width to prevent wrapping where possible

### App Footer (POLISH-02)
- **D-06:** Footer appears on ALL app pages including license page — full consistency
- **D-07:** Visual style matches landing page footer with botanical watering-can accent (already exists in app bottom section — migrate to match landing's size/color)
- **D-08:** Content: legal links (Impressum, Datenschutz, Terms) + contact email + copyright ("© 2026 Sessions Garden") + app version number
- **D-09:** Position: flows with page content (not sticky), but semi-transparent/subtle so it doesn't compete with content
- **D-10:** Legal page links from footer must be context-aware — need to detect activation status to determine "back to" destination (app vs landing). Reuse/extend the pattern from license page's context-aware topbar (licensed → app nav, unlicensed → landing nav). Ideally a shared utility all pages can use.

### License Page Chrome (POLISH-05)
- **D-11:** Light header only: logo + existing "back to..." buttons + language selector + dark mode toggle. No nav tabs (not even for licensed users)
- **D-12:** Footer included — same shared footer as all app pages
- **D-13:** Keep existing context-aware topbar logic from Phase 19, upgrade visual to match new header design

### Backup Dialog Cancel (POLISH-03)
- **D-14:** Add Cancel button and X close button to the custom overlay modal in backup.js
- **D-15:** Straightforward implementation — no design decisions needed from user

### Dark Mode on Deactivation (POLISH-04)
- **D-16:** Clear `portfolioTheme` from localStorage during the deactivation flow
- **D-17:** Straightforward bug fix — no design decisions needed

### Birth Date Picker (POLISH-01)
- **D-18:** Replace native `<input type="date">` with a picker that has year dropdown/fast year navigation for selecting distant birth years
- **D-19:** Must work in all supported browsers and RTL layout

### Claude's Discretion
- Exact popover styling for language selector (should feel native to the garden theme)
- Footer opacity/transparency level
- Birth date picker library choice or custom implementation
- Shared "context-aware back navigation" utility design
- How to handle the license key button's new location (settings area TBD)

</decisions>

<specifics>
## Specific Ideas

- Language selector should look identical to landing page's implementation (button+popover, not dropdown)
- The botanical watering-can illustration already exists in the app's bottom section — reuse and adjust to match landing footer's sizing and color
- Legal pages accessed from app footer need the same context-aware navigation as license page — a shared utility is preferred over duplicating the logic
- Ben's screenshot shows header wrapping: 5 nav tabs + "Add Session" overflow to second row, with dark mode moon and language dropdown cramped on the right

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Header & controls
- `index.html` lines 34-63 — Current app header structure
- `landing.html` lines 42-56 — Landing page language selector (button+popover pattern to adopt)
- `assets/app.js` lines 59-78 — Header rendering logic
- `assets/app.js` lines 84-106 — Dark mode toggle creation (initThemeToggle)
- `assets/app.js` lines 147-158 — License key icon link (to be relocated)

### Footer
- `landing.html` lines 386-398 — Landing footer with botanical accent (reference design)
- `index.html` lines 169-177 — Current app bottom section (security guidance + watering can)

### License page
- `license.html` — Full page (509 lines), inline styles, context-aware topbar at lines 481-506

### Backup dialog
- `assets/backup.js` lines 117-249 — Custom overlay modal creation
- `assets/app.css` lines 1621-1735 — Backup modal styling

### Dark mode
- `assets/app.js` lines 84-106 — Theme toggle and localStorage persistence
- `assets/tokens.css` lines 26-175 — Light/dark CSS variables

### Birth date
- `add-client.html` line 72 — Native date input
- `assets/add-client.js` lines 357-358 — Birth date reading and age calculation

### Context-aware navigation (pattern to extend)
- `license.html` lines 481-506 — Licensed vs unlicensed topbar rendering

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Landing page language selector (button+popover) — adopt directly for app header
- Landing footer HTML/CSS — reference for app footer design
- License page context-aware topbar — pattern to generalize into shared utility
- Botanical watering-can SVG — already in app, needs resize/recolor to match landing

### Established Patterns
- `App.initCommon()` — shared initialization across app pages (header, theme, language)
- `localStorage.getItem('portfolioTheme')` — theme persistence
- `localStorage.getItem('lemonSqueezyActivated')` — activation status check (used for context-aware nav)
- CSS variables in `tokens.css` — all colors via design tokens, dark mode via `[data-theme="dark"]`
- i18n via `i18n.t()` — all visible strings must be translatable

### Integration Points
- Footer needs to be added to all 19 HTML files that register the SW (or injected via JS in App.initCommon)
- Language selector change in header must trigger same `i18n.changeLanguage()` flow
- Legal page links need language-aware URLs (e.g., `impressum-en.html` vs `impressum-de.html`)
- Birth date picker must integrate with existing form validation in add-client.js

</code_context>

<deferred>
## Deferred Ideas

- **Terms acceptance business notification** — Restructure into LS activation flow. Full details captured in todo `2026-03-24-terms-acceptance-business-notification.md`. Deferred to Phase 21+ (too big — touches disclaimer page, activation flow, LS API, Datenschutz).
- **License key button new location** — Moving it out of header means it needs a new home (settings area?). Exact location TBD during implementation, or may become its own small task.

</deferred>

---

*Phase: 20-pre-launch-ui-polish*
*Context gathered: 2026-03-25*
