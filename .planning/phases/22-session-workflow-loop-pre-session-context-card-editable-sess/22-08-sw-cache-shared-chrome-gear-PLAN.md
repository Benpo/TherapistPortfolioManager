---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 08
type: execute
wave: 3
depends_on:
  - 01   # jspdf + fonts must exist before adding to PRECACHE_URLS
  - 02   # i18n key header.settings.label must exist before gear icon uses it
  - 03   # md-render.js must exist before adding to PRECACHE_URLS
  - 04   # settings.html + assets/settings.js must exist before adding to PRECACHE_URLS / PRECACHE_HTML
  - 05   # pdf-export.js must exist before adding to PRECACHE_URLS
files_modified:
  - sw.js
  - assets/app.js
  - assets/app.css
autonomous: true
requirements:
  - REQ-1    # Settings page reachable from main app navigation — gear icon entry point
  - REQ-17   # Header gear tooltip translated en/de/he/cs (consumes Plan 02 header.settings.label key)
  - REQ-20   # Service Worker precaches the new Settings page and assets
user_setup: []

must_haves:
  truths:
    - "sw.js CACHE_NAME is bumped past the current v49 (target: sessions-garden-v50; if other phases land first, bump to next available)"
    - "sw.js PRECACHE_URLS includes /assets/settings.js, /assets/pdf-export.js, /assets/md-render.js, /assets/jspdf.min.js, /assets/fonts/noto-sans-base64.js, /assets/fonts/noto-sans-hebrew-base64.js"
    - "sw.js PRECACHE_HTML includes /settings"
    - "Installed PWA users picking up the new service worker get all new assets cached on activation"
    - "shared chrome (via App.initSettingsLink in app.js) renders a gear icon link in #headerActions on every app page that calls App.initCommon"
    - "Gear icon points to ./settings.html and is i18n'd via header.settings.label tooltip + aria-label"
    - "Gear icon shows an active state (.is-active) when document.body.dataset.nav === 'settings'"
    - "Gear icon respects RTL via logical CSS properties; tap target is 44x44px on mobile"
  artifacts:
    - path: "sw.js"
      provides: "CACHE_NAME = 'sessions-garden-v50' (or next available); PRECACHE_URLS extended with 6 new asset paths; PRECACHE_HTML extended with /settings"
      contains: "settings.js"
    - path: "assets/app.js"
      provides: "App.initSettingsLink() called from initCommon; mounts gear-icon link in #headerActions"
      contains: "initSettingsLink"
    - path: "assets/app.css"
      provides: ".settings-gear-btn CSS using design tokens + logical properties"
      contains: ".settings-gear-btn"
  key_links:
    - from: "sw.js PRECACHE_URLS"
      to: "assets/jspdf.min.js + fonts + settings.js + pdf-export.js + md-render.js"
      via: "string array entry"
      pattern: "/assets/(jspdf|settings|pdf-export|md-render|fonts/noto-sans)"
    - from: "sw.js PRECACHE_HTML"
      to: "/settings"
      via: "string array entry"
      pattern: "['\"]/settings['\"]"
    - from: "assets/app.js initCommon"
      to: "App.initSettingsLink"
      via: "function call after initLicenseLink"
      pattern: "initSettingsLink"
---

<objective>
Wire the new files into the PWA shell. Two surfaces:

1. **Service Worker discipline (REQ-20)**: bump CACHE_NAME so installed PWAs evict the old shell, and add all 6 new files to PRECACHE_URLS + settings.html to PRECACHE_HTML. Without this, users who installed the PWA pre-Phase-22 will not see the new Settings page until they manually reload, and offline access to jsPDF + fonts is broken.

2. **Header gear icon entry (REQ-1)**: every app page that calls App.initCommon gets a gear-icon link to /settings.html in its header. This is the only navigation entry point — the user can reach Settings from any app page.

Output: Three files modified — sw.js, assets/app.js, assets/app.css. No new files created in this plan.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md
@sw.js
@assets/app.js
@assets/app.css

<interfaces>
sw.js current state:
  CACHE_NAME = 'sessions-garden-v49' (line 12)
  PRECACHE_URLS array starts at line 19
  PRECACHE_HTML array starts at line 74
  Phase 19 deploy notes: SW skips ALL navigations + HTML removed from precache for some pages — verify by reading the file before editing. The PRECACHE_HTML pattern of "pretty URLs" (e.g. "/sessions" not "/sessions.html") is the project convention.

App.js existing entry-points pattern:
  initLicenseLink() at lines 224-235 — closest analog
  initCommon() at lines 241-271 — call site for the new initSettingsLink

Existing CSS analogs:
  .header-control-btn (assets/app.css:126-area) — base size 36×36
  44px tap target rule at assets/app.css:1147-1154 — automatic
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bump sw.js CACHE_NAME + extend PRECACHE_URLS + PRECACHE_HTML</name>
  <files>sw.js</files>
  <read_first>
    - sw.js (full file — CACHE_NAME at line 12 currently 'sessions-garden-v49'; PRECACHE_URLS array starts at line 19; PRECACHE_HTML at line 74)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (section "sw.js (modified) — bump CACHE_NAME, append PRECACHE_URLS")
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md (D-15: bump from v49, confirm latest at execution time)
  </read_first>
  <action>
    Three edits in sw.js:

    A. Bump CACHE_NAME (line 12). Read the file FIRST to confirm the current value. If still `'sessions-garden-v49'`, change to `'sessions-garden-v50'`. If a later phase has already bumped it (e.g., to v50+), bump to the next integer.

         const CACHE_NAME = 'sessions-garden-v50';

    B. Extend PRECACHE_URLS (array starting at line 19). Append these 6 new entries to the existing array. Match the existing entry style (leading slash, no quotes around the whole array). Preserve all existing entries:

         '/assets/settings.js',
         '/assets/pdf-export.js',
         '/assets/md-render.js',
         '/assets/jspdf.min.js',
         '/assets/fonts/noto-sans-base64.js',
         '/assets/fonts/noto-sans-hebrew-base64.js',

    C. Extend PRECACHE_HTML (array starting at line 74). Append `/settings` to the array. Use the project's "pretty URL" pattern (no .html suffix in PRECACHE_HTML — Phase 19 D-Deploy convention):

         '/settings',

    Do NOT change cache strategies or fetch handler logic. Phase 19 deploy notes: SW skips navigations to ensure CF Pages "pretty URLs" work. Don't touch that — only the URL lists change.

    Sanity check after edit: PRECACHE_URLS should contain at least 6 new strings; PRECACHE_HTML should include `/settings`; CACHE_NAME should be incremented.
  </action>
  <verify>
    <automated>grep -E "const CACHE_NAME = 'sessions-garden-v[5-9][0-9]'" sw.js && grep -q "/assets/settings.js" sw.js && grep -q "/assets/pdf-export.js" sw.js && grep -q "/assets/md-render.js" sw.js && grep -q "/assets/jspdf.min.js" sw.js && grep -q "/assets/fonts/noto-sans-base64.js" sw.js && grep -q "/assets/fonts/noto-sans-hebrew-base64.js" sw.js && grep -E "['\"]\\/settings['\"]" sw.js && node -c sw.js</automated>
  </verify>
  <acceptance_criteria>
    - sw.js CACHE_NAME matches `sessions-garden-v[5-9][0-9]` and is strictly greater than v49 (confirmed by reading current value first)
    - sw.js PRECACHE_URLS contains all 6 new entries (one grep per entry)
    - sw.js PRECACHE_HTML contains `'/settings'` entry
    - File parses: `node -c sw.js`
    - No existing PRECACHE_URLS or PRECACHE_HTML entries are removed (compare line counts before/after)
  </acceptance_criteria>
  <done>SW cache bumped. New assets precached. Installed PWA users will pick up Phase 22 files on next activation. Offline use of jsPDF + fonts works.</done>
</task>

<task type="auto">
  <name>Task 2: Add App.initSettingsLink to assets/app.js + call from initCommon</name>
  <files>assets/app.js</files>
  <read_first>
    - assets/app.js (initLicenseLink at lines 224-235 — analog; initCommon at 241-271 — call site; return block at 780-817 — public API export)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (section "assets/shared-chrome.js (modified — gear icon entry)" — code excerpt for initSettingsLink)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (Header Entry Point — Gear Icon section: 36×36 size, mount in #headerActions, insertion order: lang | theme | settings | license, active state when on settings.html)
  </read_first>
  <action>
    Add a new function `initSettingsLink()` modeled on the existing `initLicenseLink()` function. Insert it adjacent to initLicenseLink (around lines 224-235):

      function initSettingsLink() {
        var actions = document.getElementById('headerActions') || document.querySelector('.header-actions');
        if (!actions) return;
        // Avoid double-mount on hot-reload or repeated initCommon calls.
        if (actions.querySelector('.settings-gear-btn')) return;

        var link = document.createElement('a');
        link.href = './settings.html';
        link.className = 'header-control-btn settings-gear-btn';
        var label = (typeof t === 'function' ? t('header.settings.label') : '') || 'Settings';
        link.setAttribute('aria-label', label);
        link.setAttribute('title', label);

        // Inline gear SVG — 24x24 viewBox, 20x20 rendered (per UI-SPEC).
        link.innerHTML = ''
          + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
          + '<circle cx="12" cy="12" r="3"></circle>'
          + '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>'
          + '</svg>';

        // Active state if currently on settings.html.
        if (document.body && document.body.dataset && document.body.dataset.nav === 'settings') {
          link.classList.add('is-active');
        }

        // Insertion order per UI-SPEC: after globe (lang) and theme-toggle, before license-key.
        // Find license-key element if any; insert before it. Else append.
        var licenseLink = actions.querySelector('.license-link, .license-key-btn');
        if (licenseLink && licenseLink.parentNode === actions) {
          actions.insertBefore(link, licenseLink);
        } else {
          actions.appendChild(link);
        }
      }

    The `innerHTML` use here is safe because the SVG string is a fixed compile-time literal — no user input is interpolated. The aria-label and title use t('header.settings.label') which is read from i18n files (Plan 02 added the keys; static strings, not user input).

    Call initSettingsLink from initCommon. In the existing initCommon body (around lines 241-271), find the line `initLicenseLink();` (or equivalent header-actions setup near initLanguagePopover). Insert `initSettingsLink();` AFTER initThemeToggle and BEFORE initLicenseLink so the visual order matches UI-SPEC (lang | theme | settings | license):

      // existing:
      renderNav();
      initThemeToggle();
      initLanguagePopover();
      initSettingsLink();   // NEW — Phase 22
      initLicenseLink();

    Re-render gear label on language switch — `setLanguage` already triggers `app:language` and re-translates `data-i18n` elements. Since the gear's text content is set via `aria-label` and `title` (not data-i18n), it will NOT auto-update. To handle language change correctly, listen for app:language inside initSettingsLink (or call it idempotently on each app:language event):

      document.addEventListener('app:language', function () {
        var existingLink = document.querySelector('.settings-gear-btn');
        if (existingLink) {
          var newLabel = (typeof t === 'function' ? t('header.settings.label') : '') || 'Settings';
          existingLink.setAttribute('aria-label', newLabel);
          existingLink.setAttribute('title', newLabel);
        }
      });

    Add this listener inside initSettingsLink so it is registered exactly once. Use a guard:
      if (!initSettingsLink._listenerInstalled) {
        document.addEventListener('app:language', updateGearLabel);
        initSettingsLink._listenerInstalled = true;
      }

    Do NOT export initSettingsLink in the App return block — it's an internal init function called only by initCommon. (Mirrors initLicenseLink which is also internal.)
  </action>
  <verify>
    <automated>grep -q "function initSettingsLink" assets/app.js && grep -q "settings-gear-btn" assets/app.js && grep -q "header.settings.label" assets/app.js && grep -nE "initSettingsLink\\(\\)\\s*;" assets/app.js | wc -l | awk '$1 < 1 { print "FAIL"; exit 1 } { print "ok" }' && grep -q "data-theme\\|initThemeToggle" assets/app.js && grep -q "settings.html" assets/app.js && node -c assets/app.js</automated>
  </verify>
  <acceptance_criteria>
    - assets/app.js contains `function initSettingsLink`
    - assets/app.js contains literal `'./settings.html'` (the gear's href)
    - assets/app.js contains literal `'settings-gear-btn'` class
    - assets/app.js contains `t('header.settings.label')` reference
    - initSettingsLink() is called from initCommon (grep `initSettingsLink()` matches at least twice — declaration + call)
    - Insertion logic targets `.license-link, .license-key-btn` to put gear before it (verified by grep)
    - Active-state branch checks `dataset.nav === 'settings'`
    - app:language listener updates the gear label
    - File parses: `node -c assets/app.js`
  </acceptance_criteria>
  <done>Every app page that calls App.initCommon now mounts the gear icon. The icon points to ./settings.html, is i18n'd, becomes active on settings.html, and updates label on language switch.</done>
</task>

<task type="auto">
  <name>Task 3: Append .settings-gear-btn CSS to assets/app.css</name>
  <files>assets/app.css</files>
  <read_first>
    - assets/app.css (.header-control-btn at ~line 126; theme-toggle styles; existing 44px tap target rule at lines 1147-1154)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (Header Entry Point — Gear Icon: 36×36 size, active state primary-soft bg + primary-dark color)
  </read_first>
  <action>
    Append a small CSS block under the existing Phase 22 — Settings page block (or directly after it). Header:

      /* Phase 22 — Header gear icon */
      .settings-gear-btn {
        /* Inherits .header-control-btn base size (36x36). 44x44 tap target enforced by global rule. */
        text-decoration: none;
        color: inherit;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .settings-gear-btn:hover {
        background: var(--color-surface-hover);
      }
      .settings-gear-btn.is-active {
        background: var(--color-primary-soft);
        color: var(--color-primary-dark);
      }
      .settings-gear-btn:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }

    Same constraints as Plan 04 / 06 CSS: tokens only, on-scale spacing only, logical properties only. The 44×44 tap target enforcement is global (assets/app.css:1147-1154) and already covers `.header-control-btn` — no override needed.
  </action>
  <verify>
    <automated>grep -q "Phase 22 — Header gear icon" assets/app.css && grep -q "\.settings-gear-btn\s*{" assets/app.css && grep -q "\.settings-gear-btn\.is-active" assets/app.css && ! grep -A 30 "Phase 22 — Header gear icon" assets/app.css | grep -E "padding-(left|right):|margin-(left|right):|#[0-9a-fA-F]{3,8}\s*[;{]"</automated>
  </verify>
  <acceptance_criteria>
    - assets/app.css contains `/* Phase 22 — Header gear icon */`
    - Selectors: .settings-gear-btn, .settings-gear-btn:hover, .settings-gear-btn.is-active, .settings-gear-btn:focus-visible
    - Within the block, no `padding-left/right` or `margin-left/right` (negative grep)
    - Within the block, no hex literals
    - .is-active uses --color-primary-soft + --color-primary-dark per UI-SPEC
  </acceptance_criteria>
  <done>Gear icon styles defined; respects design tokens, logical properties, and focus-visible accessibility.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| SW PRECACHE_URLS → fetch from origin | All URLs are same-origin; CSP enforces this |
| Gear icon innerHTML SVG | Compile-time literal SVG; no user interpolation |
| Gear icon aria-label / title | Set via setAttribute from i18n string lookup |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-22-08-01 | Tampering | Stale SW cache prevents users from seeing the new Settings page | mitigate | CACHE_NAME bump (v49 → v50+) forces cache eviction in the activate handler. Existing Phase 19 SW logic handles old-cache deletion. |
| T-22-08-02 | DoS / cache budget | Adding ~1 MB of jspdf+fonts inflates SW install size | accept | Total addition: ~1.5 MB worst case (full-font fallback). PWA install storage budget is generous (typically 50% of available disk). The benefit (offline PDF export) outweighs the cost. |
| T-22-08-03 | XSS | innerHTML for gear SVG | mitigate | The SVG string is a compile-time literal, no user input. Acceptance: gear icon `innerHTML` block contains no template-string interpolation, no concat with variables. |
| T-22-08-04 | Spoofing | Gear icon links to a wrong settings page | mitigate | href is hardcoded `'./settings.html'`. Acceptance: grep matches the literal. |
| T-22-08-05 | Information disclosure | aria-label exposes session info | accept | aria-label is "Settings" (i18n localized) — generic, no PII. |
| T-22-08-06 | Privilege escalation | A non-licensed user reaches settings.html via gear icon | mitigate | settings.html (Plan 04) enforces TOC + license gates inline in <head>. The gear icon is just a link; following it triggers the gates which redirect unauth users. |
| T-22-08-07 | Tampering | Crafted setting via URL navigation | accept | Settings page reads from IndexedDB — there is no URL-driven state. URL params are not consumed. |

**Residual risk:** Low. The cache-bump pattern is well-established (Phase 19 deploy lessons). innerHTML SVG is safe because the literal is compile-time-fixed.
</threat_model>

<verification>
- node -c sw.js
- node -c assets/app.js
- Manual smoke (post-deploy): install fresh PWA, navigate to /sessions, observe gear icon in header pointing to /settings; click → land on Settings page with TOC/license gates passed; offline: disconnect network, navigate to /settings → page renders with cached assets (jspdf, fonts present in cache storage).
</verification>

<success_criteria>
- All app pages now show the gear icon in #headerActions in the order: lang | theme | settings | license.
- /settings is reachable via gear icon and via direct URL.
- The gear icon's aria-label/title updates on language change.
- After SW activation, jspdf.min.js + 2 fonts + settings.js + pdf-export.js + md-render.js are in cache storage.
- Old SW caches (v49 and earlier) are evicted on the new SW's activate event (existing Phase 19 logic).
</success_criteria>

<output>
Create `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-08-sw-cache-shared-chrome-gear-SUMMARY.md` after completion documenting the final CACHE_NAME version chosen and any clashes with concurrently shipping phases.
</output>
