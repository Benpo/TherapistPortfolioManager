# Phase 20: Pre-Launch UI Polish - Research

**Researched:** 2026-03-25
**Domain:** UI consistency, date picker, shared chrome components (vanilla JS PWA)
**Confidence:** HIGH

## Summary

Phase 20 is a pure UI polish pass on an existing vanilla JS PWA (no build tools, no npm, CDN-loaded dependencies). The six requirements span three categories: (1) replacing/upgrading HTML controls (date picker, language selector), (2) adding shared chrome components (footer, header redesign), and (3) fixing state management bugs (dark mode on deactivation, backup dialog cancel).

The most significant architectural work is creating a shared footer and context-aware navigation utility that works across all page types (5 app pages with `App.initCommon()`, 1 license page with its own inline JS, and 12 legal pages with minimal JS). The header redesign replaces a native `<select>` with a button+popover pattern already proven on the landing page.

**Primary recommendation:** Inject footer and language popover via `App.initCommon()` for app pages; create a lightweight shared utility script for license and legal pages. Use a custom three-dropdown (year/month/day) birth date picker rather than adding an external library -- the project is CDN-only and the requirement is narrow (birth dates only, not a full calendar).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Language selector adopts the landing page's button+popover pattern (globe icon button -> popover with language options), replacing the current `<select>` dropdown
- **D-02:** Dark mode toggle becomes an equally-sized icon button (moon/sun emoji is fine) matching the language selector dimensions
- **D-03:** License key button removed from header entirely -- moved to a settings or menu area (out of header)
- **D-04:** Mobile behavior: two-row layout is acceptable if intentional (nav row + controls row), no hamburger menu needed
- **D-05:** Header should use full available width to prevent wrapping where possible
- **D-06:** Footer appears on ALL app pages including license page -- full consistency
- **D-07:** Visual style matches landing page footer with botanical watering-can accent (already exists in app bottom section -- migrate to match landing's size/color)
- **D-08:** Content: legal links (Impressum, Datenschutz, Terms) + contact email + copyright ("(c) 2026 Sessions Garden") + app version number
- **D-09:** Position: flows with page content (not sticky), but semi-transparent/subtle so it doesn't compete with content
- **D-10:** Legal page links from footer must be context-aware -- need to detect activation status to determine "back to" destination (app vs landing). Reuse/extend the pattern from license page's context-aware topbar
- **D-11:** Light header only: logo + existing "back to..." buttons + language selector + dark mode toggle. No nav tabs (not even for licensed users)
- **D-12:** Footer included -- same shared footer as all app pages
- **D-13:** Keep existing context-aware topbar logic from Phase 19, upgrade visual to match new header design
- **D-14:** Add Cancel button and X close button to the custom overlay modal in backup.js
- **D-15:** Straightforward implementation -- no design decisions needed from user
- **D-16:** Clear `portfolioTheme` from localStorage during the deactivation flow
- **D-17:** Straightforward bug fix -- no design decisions needed
- **D-18:** Replace native `<input type="date">` with a picker that has year dropdown/fast year navigation for selecting distant birth years
- **D-19:** Must work in all supported browsers and RTL layout

### Claude's Discretion
- Exact popover styling for language selector (should feel native to the garden theme)
- Footer opacity/transparency level
- Birth date picker library choice or custom implementation
- Shared "context-aware back navigation" utility design
- How to handle the license key button's new location (settings area TBD)

### Deferred Ideas (OUT OF SCOPE)
- **Terms acceptance business notification** -- Restructure into LS activation flow. Deferred to Phase 21+.
- **License key button new location** -- Moving it out of header means it needs a new home (settings area?). Exact location TBD during implementation, or may become its own small task.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POLISH-01 | Birth date picker allows fast year selection without scrolling month-by-month | Custom three-dropdown (year/month/day) widget or flatpickr with year-select plugin; see Architecture Patterns |
| POLISH-02 | App footer shows contact email, legal links, copyright, and version on all pages | Shared footer injected via JS; `App.initCommon()` for app pages, standalone utility for license/legal; see Architecture Patterns |
| POLISH-03 | Backup dialog has Cancel/X button to dismiss without completing | Add Cancel button + X close to backup passphrase modal -- currently only shows "Encrypt & Save" and "Skip Encryption" with no way to abort the backup flow entirely |
| POLISH-04 | Dark mode cleared on license deactivation | Add `localStorage.removeItem('portfolioTheme')` to deactivation flow in license.js line ~464-471 |
| POLISH-05 | License page has language selector and dark mode toggle matching app pages, plus shared footer | Extend license.html chrome with popover language selector + theme toggle; add shared footer |
| POLISH-06 | App header uses full width with consistent language selector (popover) and dark/light toggle | Replace `<select>` with button+popover from landing page; equalize button sizing; remove license key icon from header |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS | ES5/ES6 | All app logic | Project convention -- no frameworks, no build tools |
| CSS Custom Properties | N/A | Design tokens | Already in tokens.css, all colors via `--color-*` variables |
| JSZip | 3.10.1 | Backup ZIP | Only existing CDN dependency (besides i18n JSON) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None added | N/A | N/A | Phase 20 adds zero new dependencies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom birth date dropdowns | Flatpickr (~16KB gzipped) + year-select plugin | External dependency for a single field; flatpickr's RTL support is incomplete (requires custom CSS); CDN adds load time; overkill for birth date which doesn't need a calendar view |
| Custom birth date dropdowns | vanillajs-datepicker | Similar tradeoff -- external dependency, unclear RTL support |

**Recommendation: Custom three-dropdown approach.** A birth date picker that shows Year / Month / Day dropdowns is simpler, lighter, fully RTL-compatible (just flex-direction), and matches the app's zero-dependency philosophy. The year dropdown shows 1920-current year, month shows localized names, day adjusts for month length. This is ~80 lines of JS.

## Architecture Patterns

### Page Type Inventory

Understanding which pages need what helps the planner structure tasks:

| Page Type | Pages | Has App.initCommon() | Has Header | Needs Footer |
|-----------|-------|---------------------|------------|-------------|
| App pages | index, sessions, add-client, add-session, reporting (5) | Yes | Full app header with nav | Yes -- inject via initCommon |
| License page | license.html (1) | No -- inline JS | Legal topbar (context-aware) | Yes -- shared utility |
| Legal pages | impressum, datenschutz, disclaimer x4 each (12) | No -- standalone | Legal topbar | Yes -- shared utility |
| Landing page | landing.html (1) | No | Landing header | No -- already has its own footer |
| Demo page | demo.html (1) | No | None (iframe wrapper) | No |

### Pattern 1: Shared Footer via JS Injection

**What:** Create footer HTML/CSS once, inject via JavaScript on all pages that need it.
**When to use:** Footer must appear on 18 pages (5 app + 1 license + 12 legal) with identical content.

```javascript
// In App.initCommon() for app pages:
function renderFooter() {
  var lang = localStorage.getItem('portfolioLang') || 'en';
  var isActivated = localStorage.getItem('portfolioLicenseActivated') === 'true'
    && !!localStorage.getItem('portfolioLicenseInstance');

  // Context-aware legal links: activated users go back to app, others to landing
  var impressumHref = getLocalizedLegalLink('impressum', lang);
  var datenschutzHref = getLocalizedLegalLink('datenschutz', lang);
  var termsHref = getLocalizedLegalLink('disclaimer', lang) + '?readonly=true';

  var footer = document.createElement('footer');
  footer.className = 'app-footer';
  footer.innerHTML = '...' // botanical accent + links + copyright + version
  document.body.appendChild(footer);
}
```

**Key:** The footer rendering function must be extractable into a standalone script so license.html and legal pages can also use it without loading the full app.js.

### Pattern 2: Language Selector Popover (Port from Landing)

**What:** Replace the `<select id="languageSelect">` with the globe button + popover from landing.html.
**When to use:** POLISH-06 header redesign.

The landing page has the exact pattern needed:
- HTML: `button.lang-globe-btn` + `div.lang-popover[hidden]` with `button.lang-option` children
- CSS: Already in landing.css (lines 52-101) -- copy to app.css with shared class names
- JS: Toggle popover on button click, close on outside click, `aria-expanded` management

```javascript
// Replace the select-based language change with popover-based:
function initLanguagePopover() {
  var actions = document.querySelector('.header-actions');
  // Remove old select-based lang-picker
  var oldPicker = actions.querySelector('.lang-picker');
  if (oldPicker) oldPicker.remove();

  // Create button + popover (same HTML structure as landing.html)
  var container = document.createElement('div');
  container.className = 'lang-selector';
  // ... globe button + popover HTML
  // Wire up click handlers matching landing.js pattern
}
```

### Pattern 3: Context-Aware Navigation Utility

**What:** Shared function that determines "back to" destination based on license activation status.
**When to use:** Footer legal links, license page topbar, legal page topbar -- anywhere that needs to know whether user came from app or landing.

```javascript
// Shared utility -- usable by all page types
function getNavigationContext() {
  var isActivated = false;
  try {
    isActivated = localStorage.getItem('portfolioLicenseActivated') === 'true'
      && !!localStorage.getItem('portfolioLicenseInstance');
  } catch(e) {}
  return {
    isActivated: isActivated,
    homeHref: isActivated ? './index.html' : './landing.html',
    homeLabel: isActivated ? 'backToApp' : 'backToHome'
  };
}

function getLocalizedLegalLink(type, lang) {
  // type: 'impressum' | 'datenschutz' | 'disclaimer'
  // German is the default (no suffix), others use -{lang}.html
  if (lang === 'de') return './' + type + '.html';
  return './' + type + '-' + lang + '.html';
}
```

### Pattern 4: Custom Birth Date Picker (Three Dropdowns)

**What:** Replace `<input type="date">` with three `<select>` elements for Year, Month, Day.
**When to use:** POLISH-01 -- birth date fields only (3 instances across add-client.html and add-session.html).

```javascript
function createBirthDatePicker(container, existingValue) {
  var currentYear = new Date().getFullYear();
  var lang = App.getLanguage();

  var wrapper = document.createElement('div');
  wrapper.className = 'birth-date-picker';
  // RTL: flex-direction handles layout automatically

  // Year dropdown: currentYear down to 1920
  var yearSelect = document.createElement('select');
  yearSelect.className = 'input birth-date-year';
  yearSelect.innerHTML = '<option value="">--</option>';
  for (var y = currentYear; y >= 1920; y--) {
    yearSelect.innerHTML += '<option value="' + y + '">' + y + '</option>';
  }

  // Month dropdown: localized month names
  var monthSelect = document.createElement('select');
  monthSelect.className = 'input birth-date-month';
  // Use Intl.DateTimeFormat for localized month names

  // Day dropdown: adjusts based on month/year
  var daySelect = document.createElement('select');
  daySelect.className = 'input birth-date-day';

  // Wire change events to update day count
  // Store combined value as ISO date string for form submission

  wrapper.append(yearSelect, monthSelect, daySelect);
  container.appendChild(wrapper);

  return {
    getValue: function() { /* return YYYY-MM-DD or null */ },
    setValue: function(isoDate) { /* parse and set dropdowns */ }
  };
}
```

### Pattern 5: Header Layout with Flexbox

**What:** Full-width header using flexbox with nav and controls.
**When to use:** POLISH-06 header redesign.

```css
.app-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  width: 100%;
  gap: var(--space-sm);
}

.app-nav {
  flex: 1; /* takes available space */
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-inline-start: auto; /* push to end */
}

/* Globe button and theme toggle at equal sizing */
.lang-globe-btn,
.theme-toggle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Anti-Patterns to Avoid
- **Duplicating footer HTML across 18 files:** Inject via JS instead. HTML duplication means 18 files to update for any footer change.
- **Loading app.js on license/legal pages:** These pages intentionally avoid the full app bundle. Create a small shared utility script instead.
- **Using CSS `position: fixed` for footer:** Decision D-09 says footer flows with content, not sticky. Use normal document flow.
- **Hardcoding legal page URLs:** Use the existing per-language file pattern (e.g., `impressum-en.html`, `impressum.html` for DE). The `getLocalizedLegalLink()` utility handles this.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Localized month names | Hardcoded month name arrays per language | `Intl.DateTimeFormat(lang, {month: 'long'})` | Browser-native, correct for all 4 languages, handles edge cases |
| Popover dismiss on outside click | Custom mousedown/focus tracking | `document.addEventListener('click', ...)` with `contains()` check | Landing page already uses this exact pattern, proven to work |
| Days-in-month calculation | Manual leap year logic | `new Date(year, month, 0).getDate()` | Native JS, handles leap years, February edge cases |
| RTL layout for dropdowns | Manual CSS direction rules | `flex-direction` inherits from `html[dir]` | CSS logical properties already used project-wide |

**Key insight:** This phase is about consistency and polish, not new capabilities. Every pattern needed already exists somewhere in the codebase (landing page popover, legal page topbar, design tokens). The work is extracting, generalizing, and applying uniformly.

## Common Pitfalls

### Pitfall 1: Footer Breaks on Legal Pages That Don't Load app.js
**What goes wrong:** Footer injection code lives in app.js, but legal pages (impressum, datenschutz, disclaimer) don't load app.js. Footer doesn't appear.
**Why it happens:** Developer adds footer to `initCommon()` and forgets legal pages have separate JS.
**How to avoid:** Create a small standalone script (e.g., `shared-chrome.js`) that both app.js and legal pages can use. app.js calls it from initCommon(); legal pages load it directly.
**Warning signs:** Footer missing on any page when testing manually.

### Pitfall 2: Language Popover Stays Open After Navigation
**What goes wrong:** User clicks a language option, language changes, but popover stays visible during the brief moment before page re-renders.
**Why it happens:** `setLanguage()` triggers `applyTranslations()` which re-renders text but popover hidden state isn't managed.
**How to avoid:** Close popover immediately on option click, before calling setLanguage().
**Warning signs:** Visual flash of open popover during language switch.

### Pitfall 3: Birth Date Picker Value Not Read by Existing Form Logic
**What goes wrong:** `add-client.js` reads `document.getElementById('clientBirthDate').value` expecting ISO date string from native input. Custom picker doesn't set this.
**Why it happens:** Native `<input type="date">` stores value as `YYYY-MM-DD`; custom dropdowns have no single `.value`.
**How to avoid:** Keep a hidden `<input type="hidden">` that the three dropdowns update. Form logic reads the hidden input as before.
**Warning signs:** Birth dates saved as null or empty after switching to custom picker.

### Pitfall 4: Dark Mode Toggle Emoji Rendering on Different OS
**What goes wrong:** Moon/sun emoji renders differently or at wrong size across macOS, Windows, Android.
**Why it happens:** Emoji rendering is OS-dependent.
**How to avoid:** Use SVG icons instead of emoji for the theme toggle. Or keep emoji (current approach) but set explicit font-size.
**Warning signs:** Toggle button appears larger/smaller than language globe button.

### Pitfall 5: Service Worker Cache Stale After CSS/JS Changes
**What goes wrong:** Users on installed PWA see old header/footer because SW serves cached version.
**Why it happens:** SW CACHE_NAME not bumped.
**How to avoid:** Bump `CACHE_NAME` version in sw.js when CSS or JS files change. Add any new files (e.g., `shared-chrome.js`) to `PRECACHE_URLS`.
**Warning signs:** Changes work in fresh browser but not in installed PWA.

### Pitfall 6: Footer Legal Links Point to Wrong Language
**What goes wrong:** Footer shows Impressum link going to `impressum.html` (German) when user has English selected.
**Why it happens:** Footer rendered once at page load; language change doesn't update links.
**How to avoid:** Listen to `app:language` event and re-render footer links. Or render footer links dynamically using current language.
**Warning signs:** Clicking Impressum from English UI goes to German page.

## Code Examples

### Example 1: Landing Page Popover HTML (reference for POLISH-06)
```html
<!-- Source: landing.html lines 42-56 -->
<div class="lang-selector">
  <button id="lang-globe-btn" class="lang-globe-btn" type="button"
          aria-label="Language" aria-expanded="false" aria-controls="lang-popover">
    <svg width="20" height="20" viewBox="0 0 24 24" ...>...</svg>
  </button>
  <div id="lang-popover" class="lang-popover" role="listbox"
       aria-label="Select language" hidden>
    <button class="lang-option" role="option" data-lang="en">English</button>
    <button class="lang-option" role="option" data-lang="he">Hebrew</button>
    <button class="lang-option" role="option" data-lang="de">Deutsch</button>
    <button class="lang-option" role="option" data-lang="cs">Cestina</button>
  </div>
</div>
```

### Example 2: Landing Page Popover JS (reference for POLISH-06)
```javascript
// Source: landing.js lines 563-615
// Toggle, close, highlight current, click-outside dismiss
globeBtn.addEventListener('click', function(e) {
  e.stopPropagation();
  popover.hidden = !popover.hidden;
  globeBtn.setAttribute('aria-expanded', String(!popover.hidden));
});

document.addEventListener('click', function(e) {
  if (!popover.hidden && !globeBtn.contains(e.target) && !popover.contains(e.target)) {
    popover.hidden = true;
    globeBtn.setAttribute('aria-expanded', 'false');
  }
});
```

### Example 3: Deactivation localStorage Cleanup (reference for POLISH-04)
```javascript
// Source: license.js lines 464-471
// Current deactivation clears these keys:
localStorage.removeItem('portfolioLicenseKey');
localStorage.removeItem('portfolioLicenseInstance');
localStorage.removeItem('portfolioLicenseActivated');
localStorage.removeItem('portfolioTermsAccepted');
localStorage.removeItem('portfolioTermsLang');
localStorage.removeItem('securityGuidanceDismissed');
// MISSING: localStorage.removeItem('portfolioTheme');  <-- POLISH-04 fix
```

### Example 4: Context-Aware Chrome (reference for shared utility)
```javascript
// Source: license.html lines 481-506
// Pattern: check isLicensed() to determine navigation target
if (typeof isLicensed === 'function' && isLicensed()) {
  // Activated: link to app
  chrome.innerHTML = '<div class="legal-topbar">...<a href="./index.html">Back to app</a></div>';
} else {
  // Not activated: link to landing
  chrome.innerHTML = '<div class="legal-topbar">...<a href="./landing.html">Back to home</a></div>';
}
```

### Example 5: Localized Month Names via Intl API
```javascript
// Browser-native localized month names for birth date picker
function getMonthNames(lang) {
  var months = [];
  for (var m = 0; m < 12; m++) {
    var date = new Date(2000, m, 1);
    months.push(new Intl.DateTimeFormat(lang, { month: 'long' }).format(date));
  }
  return months;
}
// getMonthNames('he') => ['ינואר', 'פברואר', ...]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<select>` language picker | Button + popover | Landing page already uses this | App header should match |
| Native `<input type="date">` | Custom dropdowns for birth dates | Adoption decision in this phase | Better UX for selecting distant years |
| No shared footer | JS-injected footer on all pages | This phase | Consistent branding and legal compliance |
| Legal topbar inline in each page | Shared utility script | This phase | DRY, consistent behavior |

## Open Questions

1. **License key button new location**
   - What we know: D-03 says remove from header. CONTEXT.md defers exact location.
   - What's unclear: Where does the license link go? Settings menu doesn't exist yet.
   - Recommendation: For Phase 20, simply remove from header. The license page is still accessible via direct URL and from footer links. A dedicated settings area can be Phase 21+.

2. **Backup passphrase modal Cancel button — CONFIRMED NEEDED**
   - What we know: The passphrase modal (backup.js `_showPassphraseModal`) only shows "Encrypt & Save" and "Skip Encryption" buttons. There is no way to cancel/abort the backup flow entirely.
   - User confirmed via screenshot: modal shows password fields + two action buttons, no Cancel/X.
   - Recommendation: Add a Cancel button (text) and X close button (top-right corner) that dismiss the modal and abort the backup flow. Both should resolve the backup promise with a cancellation signal.

3. **shared-chrome.js size and caching**
   - What we know: A new JS file needs to be created for footer/chrome on non-app pages.
   - What's unclear: Should this be a separate file or inlined? How much code is needed?
   - Recommendation: Create `assets/shared-chrome.js` (~50-80 lines) with footer rendering and context-aware navigation. Add to SW precache list.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual testing (no automated test framework in project) |
| Config file | None |
| Quick run command | Open in browser, check visually |
| Full suite command | Manual cross-browser check |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POLISH-01 | Birth date picker shows year dropdown, works in RTL | manual-only | Open add-client.html, try selecting a birth year from 1960s | N/A |
| POLISH-02 | Footer visible on all pages with correct links | manual-only | Navigate to each page type, verify footer content and links | N/A |
| POLISH-03 | Backup dialog dismissable with Cancel/X | manual-only | Trigger backup flow, verify cancel works | N/A |
| POLISH-04 | Dark mode clears on deactivation | manual-only | Activate dark mode, deactivate license, verify landing page is light | N/A |
| POLISH-05 | License page has lang selector + dark toggle + footer | manual-only | Visit license.html, verify all three elements present | N/A |
| POLISH-06 | Header full-width, popover lang selector, equal-size buttons | manual-only | Check header on desktop and mobile viewports | N/A |

### Sampling Rate
- **Per task commit:** Visual inspection in browser (desktop + mobile viewport)
- **Per wave merge:** Check all 4 languages + RTL layout
- **Phase gate:** Full manual pass: all page types, all languages, dark/light mode, mobile/desktop

### Wave 0 Gaps
None -- this phase is UI-only with manual testing. No test infrastructure needed.

## Sources

### Primary (HIGH confidence)
- Project codebase: `landing.html` (popover pattern), `landing.js` (popover JS), `landing.css` (popover CSS)
- Project codebase: `app.js` (initCommon, initThemeToggle, initLicenseLink, showBackupBanner)
- Project codebase: `license.html` lines 481-506 (context-aware chrome pattern)
- Project codebase: `license.js` lines 464-471 (deactivation localStorage cleanup)
- Project codebase: `backup.js` lines 117-249 (passphrase modal with existing cancel)

### Secondary (MEDIUM confidence)
- [flatpickr.js.org](https://flatpickr.js.org/) - Evaluated as alternative for date picker; rejected due to weight and incomplete RTL
- [Intl.DateTimeFormat MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) - Month name localization

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - This is an existing project with well-established patterns; no new libraries
- Architecture: HIGH - All patterns already exist in codebase (popover, topbar, footer); work is extraction and reuse
- Pitfalls: HIGH - Based on direct codebase analysis of actual page structure, SW caching, and i18n patterns

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable -- no external dependency changes expected)
