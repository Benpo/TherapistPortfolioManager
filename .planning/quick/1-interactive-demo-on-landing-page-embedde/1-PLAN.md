---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - demo.html
  - assets/demo.js
  - assets/demo.css
  - landing.html
  - assets/landing.css
  - assets/landing.js
autonomous: false
requirements: [DEMO-01]

must_haves:
  truths:
    - "Visitor sees an interactive app window where the screenshots used to be"
    - "Demo loads with pre-seeded sample data (clients and sessions visible on dashboard)"
    - "Visitor can navigate between Dashboard, Add Client, and Add Session screens"
    - "Visitor can interact with the app (add a client, fill forms)"
    - "Demo data uses a separate IndexedDB database and does not affect real app data"
    - "Demo data is cleaned up when visitor leaves the page"
  artifacts:
    - path: "demo.html"
      provides: "Demo shell page that loads app in demo mode"
    - path: "assets/demo.js"
      provides: "Demo mode logic: seed data, guided steps, cleanup"
    - path: "assets/demo.css"
      provides: "Demo-specific styles (guided overlay, step indicators)"
    - path: "landing.html"
      provides: "Updated landing page with iframe demo replacing screenshots"
    - path: "assets/landing.css"
      provides: "Styles for demo section frame and step tabs"
    - path: "assets/landing.js"
      provides: "Updated i18n with demo section translations"
  key_links:
    - from: "landing.html"
      to: "demo.html"
      via: "iframe src"
      pattern: "iframe.*demo\\.html"
    - from: "demo.html"
      to: "assets/db.js"
      via: "script tag, but overrides DB_NAME before db.js runs"
      pattern: "demo_portfolio"
    - from: "assets/demo.js"
      to: "window.PortfolioDB"
      via: "calls addClient/addSession to seed data"
      pattern: "PortfolioDB\\.(addClient|addSession)"
---

<objective>
Replace the static screenshots section on the landing page with a live interactive demo that lets visitors try the app directly.

Purpose: Let potential customers experience the app before buying, dramatically increasing conversion. The demo runs the real app code in an iframe with pre-seeded sample data, using a separate IndexedDB database name to isolate demo data.

Output: A working interactive demo embedded in the landing page where visitors can see the dashboard with sample data and navigate/interact with the app.
</objective>

<execution_context>
@/Users/sapir/.claude/get-shit-done/workflows/execute-plan.md
@/Users/sapir/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@landing.html
@assets/landing.css
@assets/landing.js
@assets/db.js
@index.html
@assets/app.js

<interfaces>
<!-- The app's DB layer exposes a global PortfolioDB with these methods: -->
From assets/db.js:
```javascript
// DB_NAME = "emotion_code_portfolio" (hardcoded in IIFE)
// DB_VERSION = 2
window.PortfolioDB = {
  addClient(client),      // Returns promise with new ID
  getAllClients(),         // Returns promise with Client[]
  addSession(session),    // Returns promise with new ID
  getAllSessions(),       // Returns promise with Session[]
  clearAll(),            // Clears both stores
  // ... other methods
};
```

From assets/app.js:
```javascript
window.App = {
  t(key),                // i18n translation
  setLanguage(lang),     // Changes language
  renderNav(),           // Renders navigation bar
  // ...
};
// App pages check localStorage for: portfolioTermsAccepted, portfolioLicenseActivated
// These gates redirect to disclaimer.html and license.html respectively
```

From index.html:
```html
<!-- Scripts loaded in order: i18n-*.js, i18n.js, db.js, app.js, overview.js -->
<!-- Gate scripts at top redirect if terms/license not accepted -->
<!-- App nav: Overview, Sessions, Reporting, Add Client, Add Session -->
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create demo.html and demo.js — demo mode shell with data seeding</name>
  <files>demo.html, assets/demo.js, assets/demo.css</files>
  <action>
Create demo.html as a standalone page that loads the real app but in "demo mode":

1. **demo.html structure:**
   - Standard HTML5 page with same CSS imports as index.html (tokens.css, app.css)
   - Also loads demo.css for demo-specific styles
   - CRITICAL: Do NOT include the disclaimer/license gate scripts from index.html (lines 5-9) — demo must bypass those entirely
   - Before loading db.js, inject a script that patches IndexedDB.open to intercept the DB name:
     ```javascript
     // Override DB name for demo isolation
     var _origOpen = indexedDB.open.bind(indexedDB);
     indexedDB.open = function(name, version) {
       if (name === 'emotion_code_portfolio') {
         return _origOpen('demo_portfolio', version);
       }
       return _origOpen(name, version);
     };
     // Also set localStorage flags so app gates don't redirect
     localStorage.setItem('portfolioTermsAccepted', '1');
     localStorage.setItem('portfolioLicenseActivated', '1');
     ```
   - Then load scripts in order: i18n-*.js, i18n.js, db.js, app.js, overview.js, demo.js
   - Body structure mirrors index.html but adds a demo banner at top and removes export/import buttons
   - Copy the full body content from index.html (app-shell, container, header, stats, client table, modal, toast)
   - Add a `data-demo="true"` attribute on the body element

2. **assets/demo.js — demo mode controller:**
   - On DOMContentLoaded, seed sample data into the demo_portfolio database:
     - 3 clients: "Sarah M." (type: adult, 4 sessions), "Luna" (type: animal, species: cat, 2 sessions), "David R." (type: adult, 1 session)
     - 7 sessions total with realistic dates (spread over last 3 months), notes, and issues
     - Sessions should have realistic fields: date, clientId, issues array with emotion/severity/location fields, notes, generalNotes
   - After seeding, trigger the overview.js refresh to show the data (call `loadClients()` or dispatch a custom event, or simply reload the overview rendering)
   - Show a semi-transparent guided overlay banner at the top of the demo: "This is a live demo — try it out! Your changes won't be saved."
   - On page unload (beforeunload), delete the demo_portfolio database:
     ```javascript
     window.addEventListener('beforeunload', function() {
       indexedDB.deleteDatabase('demo_portfolio');
     });
     ```
   - Also add a periodic cleanup: if demo_portfolio exists and page is not demo.html, delete it (as a safety net, run this check from landing.js)
   - Hide elements that don't make sense in demo: export button, import button, language selector, service worker registration
   - Override nav links to stay within demo.html context — when clicking "Add Client" or "Add Session", instead of navigating away, show an inline message or redirect to the respective pages but with a ?demo=true param

   IMPORTANT CONSTRAINT on navigation: The app is multi-page (each screen is a separate .html file). For the demo, there are two viable approaches — choose the SIMPLER one:
   - Option A (recommended): Keep demo as dashboard-only view. Users see the populated dashboard with clients and stats. The nav links ("Add Client", "Add Session") open the real app pages in a new tab. This is simpler and still shows the core value.
   - Option B (complex): Modify all app pages to support ?demo=true param. This is much more work.

   Go with Option A. Remove the nav links from the demo or replace them with descriptive tooltips. The demo shows the dashboard with real data — that's the "wow" moment.

3. **assets/demo.css:**
   - Style the demo banner (position: sticky, top: 0, z-index 100, semi-transparent green background)
   - Hide export/import buttons when body[data-demo]
   - Hide the app nav (since we're dashboard-only)
   - Adjust header to be more compact for iframe embedding
   - Remove any padding/margin that wastes space in iframe context
  </action>
  <verify>
    <automated>
    Open demo.html in browser, check: (1) no redirect to disclaimer/license, (2) dashboard loads with 3 clients visible in table, (3) stats show correct numbers (3 clients, 7 sessions), (4) demo banner visible at top, (5) IndexedDB shows "demo_portfolio" database (not "emotion_code_portfolio"). Verify in DevTools > Application > IndexedDB.
    </automated>
  </verify>
  <done>demo.html loads the full dashboard with 3 pre-seeded clients and 7 sessions, using isolated demo_portfolio database, with demo banner and no app gates</done>
</task>

<task type="auto">
  <name>Task 2: Replace screenshots section with interactive demo iframe on landing page</name>
  <files>landing.html, assets/landing.css, assets/landing.js</files>
  <action>
1. **landing.html changes:**
   - Replace the entire screenshots section (id="screenshots", lines 192-205) with a new interactive demo section:
     ```html
     <section id="demo" class="landing-section demo-section" aria-labelledby="demo-title">
       <h2 id="demo-title" class="landing-section-title">Try it yourself</h2>
       <p id="demo-subtitle" class="landing-section-subtitle">Explore a live demo with sample data — no signup needed</p>
       <div class="demo-window">
         <div class="demo-window-toolbar">
           <span class="demo-window-dot"></span>
           <span class="demo-window-dot"></span>
           <span class="demo-window-dot"></span>
           <span class="demo-window-title">Sessions Garden — Demo</span>
         </div>
         <iframe
           src="./demo.html"
           class="demo-iframe"
           title="Sessions Garden interactive demo"
           loading="lazy"
           sandbox="allow-scripts allow-same-origin allow-popups">
         </iframe>
       </div>
       <p class="demo-note">This demo runs entirely in your browser. No data is stored or sent anywhere.</p>
     </section>
     ```
   - Keep the botanical dividers before and after the section unchanged

2. **assets/landing.css changes:**
   - Remove or keep the old `.screenshots-*` styles (keep them commented out for safety since git tracks the removal)
   - Add new demo section styles:
     ```css
     .demo-section { /* section layout */ }
     .demo-window {
       max-width: 900px;
       margin: 2rem auto 0;
       border-radius: 12px;
       overflow: hidden;
       border: 1.5px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
       box-shadow: 0 8px 40px color-mix(in srgb, var(--color-primary) 15%, transparent);
     }
     .demo-window-toolbar {
       /* macOS-style window chrome: dark bar with 3 colored dots */
       display: flex;
       align-items: center;
       gap: 6px;
       padding: 10px 14px;
       background: #2d2d2d;
     }
     .demo-window-dot {
       width: 12px; height: 12px; border-radius: 50%;
       /* red, yellow, green dots */
     }
     .demo-window-dot:nth-child(1) { background: #ff5f57; }
     .demo-window-dot:nth-child(2) { background: #ffbd2e; }
     .demo-window-dot:nth-child(3) { background: #28c840; }
     .demo-window-title {
       /* centered title text */
       color: #999; font-size: 0.8125rem;
       margin-inline-start: auto; margin-inline-end: auto;
     }
     .demo-iframe {
       width: 100%; height: 520px; border: none;
       background: var(--color-background);
     }
     .demo-note {
       text-align: center; font-size: 0.8125rem;
       color: var(--color-text-muted); margin-top: 1rem;
     }
     ```
   - Add responsive styles: on mobile (max-width: 640px), reduce iframe height to 400px, remove window dots toolbar or make it smaller
   - Ensure dark mode works: the iframe content will follow its own theme, but the window chrome stays dark

3. **assets/landing.js changes:**
   - Update i18n object for all 4 languages: replace `screenshotsTitle`, `screenshotsSubtitle`, `screenshotLabels` with:
     - `demoTitle`: "Try it yourself" (en), "נסו בעצמכם" (he), "Probieren Sie es selbst" (de), "Vyzkoušejte si to" (cs)
     - `demoSubtitle`: "Explore a live demo with sample data — no signup needed" (+ translations)
     - `demoNote`: "This demo runs entirely in your browser. No data is stored or sent anywhere." (+ translations)
   - Update the applyLang function: replace the screenshots rendering block with demo section text updates:
     ```javascript
     setText('demo-title', t.demoTitle);
     setText('demo-subtitle', t.demoSubtitle);
     ```
   - Add demo database cleanup on landing page load as safety net:
     ```javascript
     // Clean up any leftover demo database
     try { indexedDB.deleteDatabase('demo_portfolio'); } catch(e) {}
     ```
  </action>
  <verify>
    <automated>
    Open landing.html in browser. Verify: (1) "Try it yourself" section appears where screenshots were, (2) iframe shows the app dashboard with sample data inside a styled window chrome, (3) demo-window has macOS-style toolbar with colored dots, (4) switching languages updates demo section headings, (5) on mobile viewport (375px), iframe is still usable and responsive. Check no console errors.
    </automated>
  </verify>
  <done>Landing page shows interactive demo iframe with window chrome styling, i18n support in 4 languages, responsive design, and the old screenshots section is fully replaced</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Interactive demo replacing the screenshots section on the landing page. An iframe loads the real app dashboard with 3 sample clients and 7 sessions. The demo uses an isolated IndexedDB database and cleans up on page leave.</what-built>
  <how-to-verify>
    1. Open landing.html in your browser
    2. Scroll to where the screenshots used to be — you should see a "Try it yourself" section with a window-chrome-styled iframe
    3. Inside the iframe, the dashboard should show 3 clients (Sarah M., Luna, David R.) with session counts
    4. Click on a client row in the demo to see the client modal with stats
    5. Switch the landing page language to Hebrew — demo section headings should update
    6. Open DevTools > Application > IndexedDB — verify "demo_portfolio" exists (not "emotion_code_portfolio")
    7. Navigate away from landing.html and back — demo data should re-seed fresh
    8. Check mobile view (resize to ~375px width) — demo should still be usable
    9. Verify the demo banner inside the iframe says "This is a live demo"
  </how-to-verify>
  <resume-signal>Type "approved" or describe any issues with the demo appearance, functionality, or data</resume-signal>
</task>

</tasks>

<verification>
- landing.html loads without console errors
- Demo iframe renders the app dashboard with pre-seeded data
- Demo uses "demo_portfolio" database, not the real "emotion_code_portfolio"
- Demo data is cleaned up on page navigation (beforeunload)
- All 4 languages show correct demo section text
- Dark mode works (landing page dark mode, iframe follows its own theme detection)
- No interference with the real app's data or localStorage gates
</verification>

<success_criteria>
- The screenshots section is fully replaced by an interactive demo
- Visitors can see the populated dashboard and interact with it (click clients, see modals)
- Demo data is isolated and ephemeral
- The demo window has a polished, professional appearance (window chrome frame)
- Responsive on mobile devices
- i18n works for all 4 languages
</success_criteria>

<output>
After completion, create `.planning/quick/1-interactive-demo-on-landing-page-embedde/1-SUMMARY.md`
</output>
