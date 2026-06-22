# Phase 21: Comprehensive Mobile Responsiveness - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Audit every app screen at iPhone width (375px), catalog all layout/interaction issues, and fix them systematically. The app is vanilla HTML/CSS/JS with no build step — responsive fixes are CSS-only in app.css plus targeted JS fixes for interaction bugs. Also includes fixing the photo crop initialization bug when editing a client from the session screen.

</domain>

<decisions>
## Implementation Decisions

### Modal & Crop Overflow
- **D-01:** Modals get `max-height: 90vh` with `overflow-y: auto` on the modal body. Action buttons (save/cancel) stay pinned at the bottom, always visible.
- **D-02:** Crop canvas shrinks from 300px to ~220px on mobile (below 480px breakpoint). Keeps all controls and save/cancel visible without scrolling.
- **D-03:** Overlay tap closes read-only/info modals. For form modals with unsaved data (crop, session edit), either disable overlay-close or show a "discard changes?" confirmation before closing — no silent data loss.
- **D-04:** Lock body scroll when modal or dropdown overlay is active. Prevents confusing "scroll behind" effect on mobile Safari.

### Form Layout
- **D-05:** Below 768px, all form fields stack vertically (full-width). No side-by-side fields on small screens.
- **D-06:** Date inputs switch to native `<input type="date">` on mobile. The OS provides a touch-friendly date picker wheel. Keep the 3-dropdown pattern on desktop.
- **D-07:** Add-session form sections (emotions, severity, Heart Shield, notes) use collapsible accordion sections on mobile. Active section stays open, others collapse.
- **D-08:** Severity scale (0-10 buttons) wraps to two rows on mobile: 0-5 and 6-10. Buttons stay tappable at ~36-40px.

### Navigation & Z-index
- **D-09:** Nav becomes a compact horizontal scrollable row on mobile. No hamburger menu — the app only has ~5 nav items, so scroll is sufficient.
- **D-10:** Establish a z-index token scale as CSS custom properties: `--z-dropdown: 100`, `--z-nav: 200`, `--z-modal: 300`, `--z-toast: 400`, `--z-banner: 500`. Replace all hardcoded z-index values.

### Touch Targets
- **D-11:** Enforce 44x44px minimum tap target on all interactive elements (buttons, links, icon buttons, form controls) per Apple HIG. Global CSS fix.

### Breakpoint Strategy
- **D-12:** Standardize on two breakpoints: 768px (tablet) and 480px (phone). Existing inconsistent breakpoints (900, 700, 640, 600px) get consolidated into these two. Above 768px = desktop, 481-768px = tablet (stacked grids, smaller padding), ≤480px = phone (full stack, native inputs, 44px taps).

### Legal & License Pages
- **D-13:** Basic responsive pass only — ensure text doesn't overflow, padding is reasonable, license activation form works on mobile. No full redesign.

### Photo Crop Bug (Folded Todo)
- **D-14:** Fix the crop modal initialization bug when editing a client from the session screen. The crop component doesn't initialize properly when triggered from the add-session edit-client flow. JS fix alongside the CSS responsive work.

### Claude's Discretion
- Action button sizing on mobile cards — Claude picks the best approach (larger tap area with same icons, or full-width action row) based on what works with the stacked card layout.

### Folded Todos
- **Photo crop bug** (from `2026-03-18-photo-crop-reposition.md`) — crop breaks when editing client from session screen. Folded into this phase since we're already touching the crop modal.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### CSS Architecture
- `assets/app.css` — All responsive styles, modal system, crop modal, form layout, z-index values. The primary file being modified.
- `.planning/codebase/CONVENTIONS.md` — Coding conventions (CSS class naming, design tokens, logical properties)
- `.planning/codebase/STRUCTURE.md` — File structure and page organization

### Known Bug
- `.planning/todos/pending/2026-03-18-photo-crop-reposition.md` — Photo crop bug details and context

### Pages to Audit
- `index.html` — Home/overview screen (co-priority)
- `add-client.html` — Add/edit client form (co-priority)
- `add-session.html` — Add/edit session form (co-priority)
- `sessions.html` — Session browser
- `reporting.html` — KPI reporting page
- `license.html` — License activation (basic pass)
- `disclaimer.html`, `impressum.html`, `datenschutz.html` — Legal pages (basic pass)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Stacked-card pattern at 640px for overview table — reference implementation for mobile table layout
- Modal system (`position: fixed; inset: 0`) with `.modal-card` — needs max-height + overflow, not a rewrite
- Design token system with CSS custom properties — z-index tokens extend this pattern
- CSS logical properties used throughout — all new responsive CSS must follow this (e.g., `inset-inline-start` not `left`)

### Established Patterns
- State classes prefixed with `is-`: `is-hidden`, `is-visible`, `is-active` — use for accordion collapse state
- No build step — all CSS changes go directly in `app.css`
- `min()` function used for responsive widths (e.g., `width: min(720px, 90vw)`) — use this pattern for responsive sizing

### Integration Points
- `app.css` lines 974-1087: Existing media queries (900px, 640px, 700px, 600px) — all need consolidation to 768px/480px
- `app.css` lines 1190-1350: Modal system — add max-height, overflow, pinned actions
- `app.css` lines 1517-1576: Crop modal — resize canvas, responsive controls
- z-index values at lines 148, 265, 282, 293, 957, 1196, 1212, 1647, 1762 — all need token migration
- `assets/add-client.js` — Photo crop initialization bug lives here

</code_context>

<specifics>
## Specific Ideas

- Ben tested on a real iPhone via localhost and found the issues firsthand — the "stuck" feeling and unclickable buttons are real user experience problems, not theoretical
- Forms and overview are co-priority — these are the core therapist workflow (add client → add session → view sessions)
- Verification will be done by Ben testing on a real iPhone after implementation — this is the gold standard
- The "discard changes?" guard on overlay-close was specifically requested to protect data entry scenarios (session maintenance, photo upload)

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **Session viewing UX redesign** (`2026-03-19-copy-button-session-text-fields.md`) — score 0.9 but this is a full UX redesign (read mode, session cards) that goes beyond responsive fixes. Belongs in its own phase.
- **PWA install guidance** (`2026-03-24-pwa-install-guidance-and-user-manual.md`) — tangentially related but not a responsive fix.

</deferred>

---

*Phase: 21-comprehensive-mobile-responsiveness-audit-and-fix-all-app-screens-for-iphone-mobile-viewport*
*Context gathered: 2026-03-31*
