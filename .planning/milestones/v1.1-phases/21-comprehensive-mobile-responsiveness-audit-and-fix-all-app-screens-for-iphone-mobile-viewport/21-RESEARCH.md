# Phase 21: Comprehensive Mobile Responsiveness - Research

**Researched:** 2026-03-31
**Domain:** CSS responsive design, mobile Safari, vanilla HTML/CSS/JS
**Confidence:** HIGH

## Summary

This phase is a systematic CSS-driven mobile responsiveness pass across all app screens, plus one JS bug fix (photo crop initialization). The app is vanilla HTML/CSS/JS with no build step -- all changes go into `assets/app.css` with targeted JS fixes. The existing codebase already has a design token system (CSS custom properties), stacked-card patterns at 640px, and logical properties throughout. The work is primarily about consolidating inconsistent breakpoints (900/700/640/600px) into two standard breakpoints (768px/480px), adding modal overflow handling, and enforcing 44px touch targets.

The photo crop bug is well-understood: the crop modal DOM exists only in `add-client.html`, not in `add-session.html`. When editing a client from the session screen, the photo file input exists but there is no crop modal to process the uploaded image. The fix requires either duplicating the crop modal HTML into `add-session.html` or extracting the crop module into shared code.

**Primary recommendation:** Work top-down by infrastructure (z-index tokens, breakpoint consolidation, body scroll lock, touch target globals) first, then page-by-page responsive fixes, then the crop bug fix last since it touches both CSS and JS.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Modals get max-height: 90vh with overflow-y: auto on the modal body. Action buttons (save/cancel) stay pinned at the bottom, always visible.
- D-02: Crop canvas shrinks from 300px to ~220px on mobile (below 480px breakpoint). Keeps all controls and save/cancel visible without scrolling.
- D-03: Overlay tap closes read-only/info modals. For form modals with unsaved data (crop, session edit), either disable overlay-close or show a "discard changes?" confirmation before closing.
- D-04: Lock body scroll when modal or dropdown overlay is active.
- D-05: Below 768px, all form fields stack vertically (full-width).
- D-06: Date inputs switch to native `<input type="date">` on mobile. Keep 3-dropdown pattern on desktop.
- D-07: Add-session form sections use collapsible accordion sections on mobile.
- D-08: Severity scale (0-10 buttons) wraps to two rows on mobile: 0-5 and 6-10. Buttons stay tappable at ~36-40px.
- D-09: Nav becomes compact horizontal scrollable row on mobile. No hamburger menu.
- D-10: Establish z-index token scale as CSS custom properties. Replace all hardcoded z-index values.
- D-11: Enforce 44x44px minimum tap target on all interactive elements per Apple HIG.
- D-12: Standardize on two breakpoints: 768px (tablet) and 480px (phone). Consolidate existing 900/700/640/600px breakpoints.
- D-13: Legal & license pages: basic responsive pass only.
- D-14: Fix crop modal initialization bug when editing client from session screen.

### Claude's Discretion
- Action button sizing on mobile cards -- pick best approach (larger tap area with same icons, or full-width action row) based on what works with stacked card layout.

### Deferred Ideas (OUT OF SCOPE)
- Session viewing UX redesign (copy-button-session-text-fields todo) -- belongs in own phase.
- PWA install guidance -- not a responsive fix.
</user_constraints>

## Project Constraints (from CLAUDE.md)

- Never read .env files
- Update memory/project-dashboard.md at session end
- All CSS in `assets/app.css` (single file, no build step)
- CSS logical properties required (e.g., `inset-inline-start` not `left`)
- State classes prefixed with `is-`: `is-hidden`, `is-visible`, `is-active`
- Design tokens via CSS custom properties
- `min()` function for responsive widths
- No external dependencies or build tools

## Architecture Patterns

### Current CSS State (What Exists)

**Existing breakpoints (inconsistent, to be consolidated):**

| Breakpoint | Line | What It Does |
|------------|------|-------------|
| 900px | 974 | Header stacks vertically, issue grid collapses |
| 640px | 989 | App shell padding shrinks, nav full-width, session edit always visible |
| 640px | 1005 | Table rows become stacked cards (reference pattern) |
| 700px | 1087 | Client spotlight stacks vertically |
| 600px | 1630 | Botanical decorations shrink |

**Existing z-index values (to be tokenized):**

| Value | Line | Element | Proposed Token |
|-------|------|---------|----------------|
| -2 | 282 | .greeting-card::before | Decorative (negative, keep as-is) |
| -1 | 293 | .greeting-card::after | Decorative (negative, keep as-is) |
| 0 | 265 | .greeting-card | Decorative (zero, keep as-is) |
| 1 | 1212 | .modal-card | Relative to parent (keep local) |
| 50 | 957 | .toast | --z-toast: 400 |
| 60 | 1196 | .modal | --z-modal: 300 |
| 100 | 148 | .lang-popover | --z-dropdown: 100 |
| 9999 | 1762 | .passphrase-modal-overlay | --z-modal: 300 |
| 10000 | 1647 | .db-error-banner | --z-banner: 500 |

**Note:** The greeting-card z-index values (-2, -1, 0) are local stacking context tricks, not global layer ordering. They should NOT be tokenized -- leave them as hardcoded values.

**Existing modal system:**
- `.modal` is `position: fixed; inset: 0; z-index: 60`
- `.modal-card` has `position: relative; z-index: 1` (relative to modal parent)
- `.edit-client-card` already has `max-height: 90vh; overflow-y: auto` (D-01 partially done)
- `.modal-card` (the main modal) does NOT yet have max-height/overflow

**What does NOT exist yet:**
- No body scroll lock mechanism (D-04)
- No accordion/collapsible pattern (D-07)
- No z-index tokens (D-10)
- No global 44px tap target enforcement (D-11)
- No mobile-specific date input switching (D-06)

### Recommended Implementation Order

```
Wave 1: Infrastructure (CSS foundation)
  ├── Z-index token scale (--z-dropdown through --z-banner)
  ├── Breakpoint consolidation (900/700/640/600 → 768/480)
  ├── Body scroll lock class (.is-modal-open)
  └── Global 44px tap target rule

Wave 2: Modal & Form Responsive (core UX)
  ├── Modal max-height + overflow + pinned actions
  ├── Form field stacking at 768px
  ├── Severity button two-row wrap at 480px
  └── Nav horizontal scroll on mobile

Wave 3: Page-Specific Fixes
  ├── Overview table card pattern (adjust from 640→480)
  ├── Add-session accordion sections on mobile
  ├── Date input native switching on mobile
  ├── Crop canvas resize at 480px
  └── Legal/license basic pass

Wave 4: Bug Fix + Polish
  ├── Photo crop initialization bug (JS + HTML)
  ├── Overlay-close behavior for modals (D-03)
  └── Action button sizing on mobile cards (discretion)
```

### Pattern: Body Scroll Lock (D-04)

```css
/* In app.css */
body.is-modal-open {
  overflow: hidden;
  /* Prevent iOS Safari rubber-band scroll */
  position: fixed;
  inset-inline: 0;
  /* JS must save/restore scroll position */
}
```

```javascript
/* In the modal open/close logic */
function lockBodyScroll() {
  const scrollY = window.scrollY;
  document.body.style.top = `-${scrollY}px`;
  document.body.classList.add("is-modal-open");
  document.body.dataset.scrollY = scrollY;
}

function unlockBodyScroll() {
  document.body.classList.remove("is-modal-open");
  document.body.style.top = "";
  window.scrollTo(0, parseInt(document.body.dataset.scrollY || "0"));
}
```

**Why `position: fixed`:** On iOS Safari, `overflow: hidden` on body alone does not prevent background scrolling. The `position: fixed` + save/restore scroll position is the standard workaround. This is a well-known mobile Safari behavior.

### Pattern: Accordion Sections (D-07)

```css
.accordion-section {
  border-bottom: 1px solid var(--color-border-soft);
}

.accordion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  cursor: pointer;
  font-weight: 700;
  min-height: 44px; /* tap target */
}

.accordion-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.accordion-section.is-active .accordion-body {
  max-height: 1000px; /* large enough to fit any content */
}
```

**Note:** Only on mobile (below 768px). On desktop, all sections are visible. Use a media query wrapper or JS class toggle to enable accordion behavior only on small screens.

### Pattern: Z-Index Token Scale (D-10)

```css
:root {
  --z-dropdown: 100;
  --z-nav: 200;
  --z-modal: 300;
  --z-toast: 400;
  --z-banner: 500;
}
```

Replace all global z-index values with tokens. Leave local stacking context values (greeting-card -2/-1/0, modal-card 1) as-is since they operate within their parent's stacking context.

### Pattern: Modal with Pinned Actions (D-01)

```css
.modal-card {
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-card-body {
  overflow-y: auto;
  flex: 1;
  min-height: 0; /* allows flex child to shrink */
}

.modal-card-actions {
  flex-shrink: 0;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border-soft);
}
```

**Note:** This requires minor HTML restructuring in modals to separate body content from action buttons. The `.edit-client-card` already has max-height/overflow -- extend to all `.modal-card` elements.

### Pattern: Native Date Input on Mobile (D-06)

The session date field already uses `<input type="date">`. The birth date field uses a 3-dropdown picker created by `App.initBirthDatePicker()`. The decision is to show native date inputs on mobile.

Approach: Use CSS to hide the dropdown picker on mobile and show a native `<input type="date">` instead. The hidden input (`editClientBirthDate`) already stores YYYY-MM-DD format. On mobile, show the native input that writes to the same hidden field.

```javascript
/* Detect mobile and swap UI */
const isMobile = window.matchMedia("(max-width: 768px)").matches;
if (isMobile) {
  // Hide dropdown picker, show native date input
  // Both write to the same hidden input
}
```

### Pattern: Severity Two-Row Wrap (D-08)

```css
@media (max-width: 480px) {
  .severity-scale {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.3rem;
  }

  .severity-button {
    width: 100%;
    min-height: 38px;
  }
}
```

Using a 6-column grid naturally wraps 0-5 on row 1 and 6-10 on row 2 (with 10 taking the first position of the second row and leaving one empty cell, or use 5+6 split with custom grid placement).

### Pattern: 44px Touch Targets (D-11)

```css
@media (max-width: 768px) {
  button,
  a,
  input[type="checkbox"],
  input[type="radio"],
  select,
  .severity-button,
  .nav-link,
  .header-control-btn {
    min-height: 44px;
    min-width: 44px;
  }

  /* Ensure small icon buttons have adequate tap area */
  .row-actions button {
    min-height: 44px;
    min-width: 44px;
  }
}
```

**Critical:** The current severity buttons are 34x34px (line 901-902). They need to grow to at least 36-40px per D-08, and the global rule pushes to 44px. Use the more specific `.severity-button` rule at 36-40px to match the decision.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| iOS body scroll lock | Simple `overflow: hidden` | `position: fixed` + scroll save/restore | iOS Safari ignores `overflow: hidden` on body -- this is a documented platform quirk |
| Responsive breakpoint detection in JS | `window.innerWidth < 768` | `window.matchMedia("(max-width: 768px)")` | matchMedia is reactive (supports `change` event), doesn't cause layout thrash, matches CSS breakpoints exactly |
| Accordion animation | JavaScript height calculation | CSS `max-height` transition with `overflow: hidden` | Pure CSS, no JS measurement needed, works with dynamic content |
| Touch target sizing | Per-element sizing | Global media query rule | Catches all interactive elements, prevents regressions |

## Common Pitfalls

### Pitfall 1: iOS Safari 100vh Is Not Viewport Height
**What goes wrong:** `max-height: 90vh` includes the Safari URL bar in the calculation. Modals can extend behind the toolbar.
**Why it happens:** iOS Safari's `vh` unit includes the URL bar area.
**How to avoid:** Use `max-height: 90dvh` (dynamic viewport height) with a fallback: `max-height: 90vh; max-height: 90dvh;`
**Warning signs:** Modal save buttons hidden behind Safari's bottom toolbar on iPhone.

### Pitfall 2: position: fixed + iOS Safari Scroll Restoration
**What goes wrong:** After closing a modal with body scroll lock, the page jumps to top.
**Why it happens:** `position: fixed` on body resets scroll position.
**How to avoid:** Save `window.scrollY` before locking, restore with `window.scrollTo()` after unlocking. The pattern in Architecture Patterns handles this.
**Warning signs:** Page jumps to top when closing any modal.

### Pitfall 3: Tap Target Collision with Existing Layouts
**What goes wrong:** Enforcing 44px minimum on ALL interactive elements can break tight layouts (e.g., the three severity rows, toggle groups, inline action buttons).
**Why it happens:** Global rules are too broad.
**How to avoid:** Apply the 44px rule with specific selectors, not a universal `button` rule. Use `min-height` (not `height`) so elements can grow. Test each page after applying.
**Warning signs:** Overlapping buttons, broken grid layouts, excessive whitespace.

### Pitfall 4: Breakpoint Consolidation Regression
**What goes wrong:** Moving the stacked-card breakpoint from 640px to 480px means the table is not stacked at 640px anymore, which may look broken on tablets.
**Why it happens:** The 640px breakpoint was chosen for good reason -- some rules should move to 768px (wider), not 480px (narrower).
**How to avoid:** Map each existing rule individually. The header stack (900px) moves to 768px. The table card (640px) stays at a reasonable point -- probably moves to 768px. The client spotlight (700px) moves to 768px. Only phone-specific rules go to 480px.
**Warning signs:** Tablet viewports (600-768px) looking broken.

### Pitfall 5: Crop Modal Bug -- DOM Element References
**What goes wrong:** Simply copying the crop modal HTML to add-session.html won't work because `add-client.js` initializes crop state at module load time with `document.getElementById`.
**Why it happens:** The crop code lives in add-client.js but needs to run in the add-session page context.
**How to avoid:** Either (a) extract crop functionality into a shared module loaded by both pages, or (b) add the crop modal DOM to add-session.html AND load a crop initialization script. Option (a) is cleaner but requires modifying the script loading order. Option (b) is faster to implement.
**Warning signs:** Crop modal appears but canvas is blank, or crop modal never appears at all.

### Pitfall 6: Accordion State Loss on Resize
**What goes wrong:** User opens accordion section on mobile, rotates phone to landscape (above 768px), accordion CSS no longer applies, content might be hidden.
**Why it happens:** CSS-only accordion with media query -- content is hidden via `max-height: 0` which might persist.
**How to avoid:** On desktop, override accordion with `max-height: none !important` in the wider breakpoint. Or use JS to toggle the accordion class only when the breakpoint is active.
**Warning signs:** Content invisible after orientation change.

## Photo Crop Bug Analysis (D-14)

### Root Cause
The crop modal DOM (`#cropModal`, `#cropCanvas`, etc.) exists only in `add-client.html`. The crop JavaScript lives in `assets/add-client.js`. When the edit-client modal is opened from `add-session.html`, the photo file input exists (`#editClientPhoto`) but there is no crop modal to process the image.

### Current Code Flow
1. `add-session.html` includes `#editClientModal` with `#editClientPhoto` file input
2. `add-session.js` handles the edit-client modal open/save
3. When photo is uploaded in edit-client modal on add-session page, the crop code in add-client.js is never loaded (different page)
4. Photo either fails silently or saves uncropped

### Recommended Fix
**Option A (recommended):** Extract crop module into `assets/crop.js` shared script:
- Move crop state, DOM refs, and functions from add-client.js into standalone crop.js
- Add crop modal HTML to both add-client.html and add-session.html
- Load crop.js on both pages (after app.js, before page-specific scripts)
- Both add-client.js and add-session.js call the shared crop API

**Option B (simpler):** Inline the crop modal HTML into add-session.html and duplicate the crop initialization:
- Faster to implement but creates code duplication
- Harder to maintain long-term

Option A aligns better with the project's existing pattern of shared modules (app.js, db.js).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `100vh` for full-viewport modals | `100dvh` (dynamic viewport height) | Safari 15.4+ (2022) | Handles iOS toolbar correctly |
| `overflow: hidden` for scroll lock | `position: fixed` + scroll save/restore | Long-standing iOS workaround | Required for iOS Safari |
| Fixed breakpoints (320/768/1024) | Content-based breakpoints | Ongoing best practice | The 768/480 split is appropriate for this app |
| `@media (hover: hover)` detection | Still relevant | Current | Can distinguish touch from pointer devices |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no test files in project) |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map

This phase has no mapped requirement IDs. Validation is manual: Ben tests on a real iPhone after implementation (confirmed in CONTEXT.md specifics).

| Behavior | Test Type | Method |
|----------|-----------|--------|
| Modals fit within viewport | Manual | iPhone Safari, check save/cancel visible |
| Touch targets >= 44px | Manual | Tap all buttons on iPhone, verify no mis-taps |
| Forms stack vertically on mobile | Manual | iPhone Safari portrait mode |
| Accordion sections work | Manual | iPhone Safari, open/collapse sections |
| Crop works from session screen | Manual | Edit client from add-session, upload photo |
| No scroll-behind on modals | Manual | Open modal, try scrolling behind it |
| Z-index layering correct | Manual | Open dropdown, then modal, verify layering |

### Sampling Rate
- **Per task commit:** Manual visual check in responsive dev tools (375px width)
- **Per wave merge:** Ben tests on real iPhone
- **Phase gate:** Full iPhone walkthrough of all screens

### Wave 0 Gaps
None -- no test infrastructure exists or is needed. This phase is verified by manual testing on real device.

## Open Questions

1. **Crop module extraction scope**
   - What we know: Crop code in add-client.js is ~100 lines. The DOM refs are initialized at module load. Photo handling in edit-client-from-session needs crop too.
   - What's unclear: Whether extracting to shared crop.js introduces timing issues with DOM ready state on different pages.
   - Recommendation: Extract to crop.js with lazy DOM initialization (resolve refs on first `openCropModal` call, not at module load). This avoids null ref errors when DOM elements don't exist yet.

2. **Accordion scope on add-session form**
   - What we know: D-07 says "emotions, severity, Heart Shield, notes" use accordion. The form has section dividers already.
   - What's unclear: Exact section boundaries in the current HTML structure. May need wrapper elements added.
   - Recommendation: Planner should read add-session.html to map exact section boundaries before writing tasks.

3. **Birth date picker mobile swap**
   - What we know: `App.initBirthDatePicker()` creates 3 dropdowns, writes to a hidden `<input>` with YYYY-MM-DD format. Session date already uses native `<input type="date">`.
   - What's unclear: Whether the 3-dropdown picker should be completely hidden or just supplemented on mobile.
   - Recommendation: On mobile, hide the 3-dropdown picker container and show a visible native `<input type="date">` that syncs to the same hidden field. Use `matchMedia` listener for responsive switching.

## Sources

### Primary (HIGH confidence)
- `assets/app.css` (2059 lines) -- direct codebase analysis of all breakpoints, z-index values, modal system, form layout, crop modal
- `assets/add-client.js` -- crop modal implementation, DOM references
- `assets/add-session.js` -- edit-client modal implementation, missing crop integration
- `add-session.html` / `add-client.html` -- DOM structure comparison confirming crop modal absence
- `.planning/codebase/CONVENTIONS.md` -- CSS naming, design tokens, logical properties conventions
- `.planning/codebase/STRUCTURE.md` -- file organization, module patterns

### Secondary (MEDIUM confidence)
- iOS Safari `position: fixed` scroll lock workaround -- widely documented, verified through multiple sources over years of web development practice
- `dvh` unit support -- Safari 15.4+ (2022), well-established

### Tertiary (LOW confidence)
- None -- all findings based on direct codebase analysis

## Metadata

**Confidence breakdown:**
- CSS architecture: HIGH -- direct codebase analysis, every line number verified
- Breakpoint consolidation: HIGH -- all existing breakpoints mapped with exact content
- Crop bug analysis: HIGH -- confirmed root cause via DOM comparison across HTML files
- iOS Safari workarounds: MEDIUM -- well-known patterns but not verified on this specific app
- Accordion pattern: MEDIUM -- standard CSS pattern, but integration with existing form structure needs verification during planning

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable domain, no external dependencies)
