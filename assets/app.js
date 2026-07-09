window.App = (() => {
  let currentLang = window.I18N_DEFAULT || "en";

  // ---------------------------------------------------------------------------
  // i18n — translation and language management
  // ---------------------------------------------------------------------------

  /**
   * Translate a key using the current language dictionary.
   * Falls back to English, then returns the key itself.
   * @param {string} key - i18n key (e.g., 'nav.overview')
   * @returns {string} Translated string
   */
  function t(key) {
    const dict = window.I18N || {};
    return (dict[currentLang] && dict[currentLang][key]) || (dict.en && dict.en[key]) || key;
  }

  /**
   * Apply translations to all elements with data-i18n and data-i18n-placeholder attributes.
   * @param {Document|Element} [root=document] - Root element to scan
   */
  function applyTranslations(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      el.placeholder = t(key);
    });
  }

  // ---------------------------------------------------------------------------
  // Phase 22 — Therapist settings cache (section labels + enabled flags)
  // ---------------------------------------------------------------------------

  // Phase 22: section-label cache. Populated in initCommon BEFORE setLanguage runs.
  let _sectionLabelCache = new Map();

  // Phase 24 Plan 04: snippet cache. Populated in initCommon after the therapist
  // settings load. Mirrors the sync App.getSectionLabel pattern — async load,
  // sync read everywhere after. Snippets.js consumes this via window.App.getSnippets.
  let _snippetCache = [];

  /**
   * Resolve the display label for a session section. Returns the user's
   * customLabel from the therapistSettings cache when present and non-empty,
   * otherwise falls back to the default i18n key.
   *
   * Callers MUST render the result via .textContent or .value (never innerHTML)
   * because customLabel is stored verbatim (T-22-02-01 mitigation).
   *
   * @param {string} sectionKey - Canonical section key (e.g. 'trapped')
   * @param {string} defaultI18nKey - i18n fallback key (e.g. 'session.form.trapped')
   * @returns {string} Resolved label
   */
  function getSectionLabel(sectionKey, defaultI18nKey) {
    const entry = _sectionLabelCache.get(sectionKey);
    if (entry && typeof entry.customLabel === "string" && entry.customLabel.trim().length > 0) {
      return entry.customLabel;
    }
    return t(defaultI18nKey);
  }

  /**
   * Whether a session section is enabled. Defaults to true unless the
   * therapist has explicitly disabled it in Settings.
   * @param {string} sectionKey
   * @returns {boolean}
   */
  function isSectionEnabled(sectionKey) {
    const entry = _sectionLabelCache.get(sectionKey);
    return entry ? entry.enabled !== false : true;
  }

  /**
   * App.getSnippets — synchronous read of the cached snippet array.
   * Returns a SHALLOW COPY so callers mutating the returned array do not
   * corrupt the cache. Matches the eager-load + sync-read shape established
   * by getSectionLabel in Phase 22 (D-09/D-10).
   *
   * Callers (snippets.js trigger engine, Plan 05 Settings UI) must NOT await
   * this. The cache is populated in initCommon before the first user input
   * can race it.
   */
  function getSnippets() {
    return _snippetCache.slice();
  }

  /**
   * App.refreshSnippetCache — reload from IDB and dispatch app:snippets-changed.
   * Called by the BroadcastChannel handler on cross-tab mutations and by
   * Plan 05 Settings UI after add/update/delete.
   */
  async function refreshSnippetCache() {
    try {
      if (typeof PortfolioDB !== "undefined" && typeof PortfolioDB.getAllSnippets === "function") {
        _snippetCache = await PortfolioDB.getAllSnippets();
      } else {
        _snippetCache = [];
      }
    } catch (err) {
      console.warn("refreshSnippetCache failed:", err);
      _snippetCache = [];
    }
    try {
      document.dispatchEvent(new CustomEvent("app:snippets-changed"));
    } catch (_) { /* ignore */ }
  }

  /**
   * Set the active language, persist to localStorage, update dir attribute, and dispatch event.
   * @param {string} lang - Language code ('en', 'he', 'de', 'cs')
   */
  function setLanguage(lang) {
    if (!window.I18N || !window.I18N[lang]) {
      currentLang = window.I18N_DEFAULT || "en";
    } else {
      currentLang = lang;
    }
    localStorage.setItem("portfolioLang", currentLang);
    document.documentElement.lang = currentLang;
    document.documentElement.setAttribute("dir", currentLang === "he" ? "rtl" : "ltr");
    applyTranslations();
    document.dispatchEvent(new CustomEvent("app:language", { detail: { lang: currentLang } }));
  }

  // ---------------------------------------------------------------------------
  // Navigation and chrome
  // ---------------------------------------------------------------------------

  /**
   * Render the main navigation bar into the #nav-placeholder element.
   * Marks the active nav item using the body's data-nav attribute.
   */
  function renderNav() {
    const placeholder = document.getElementById('nav-placeholder');
    if (!placeholder) return;
    placeholder.innerHTML = `
    <nav class="app-nav" data-tour="nav">
      <a href="./index.html" data-nav="overview" data-i18n="nav.overview">Overview</a>
      <a href="./sessions.html" data-nav="sessions" data-tour="nav-sessions" data-i18n="nav.sessions">Sessions</a>
      <a href="./reporting.html" data-nav="reporting" data-i18n="nav.reporting">Reporting</a>
      <span class="nav-divider" aria-hidden="true"></span>
      <a href="./add-client.html" data-nav="addClient" data-i18n="nav.addClient">Add Client</a>
      <a href="./add-session.html" data-nav="addSession" data-i18n="nav.addSession">Add Session</a>
    </nav>`;
    const navKey = document.body.dataset.nav;
    if (navKey) {
      placeholder.querySelectorAll('a[data-nav]').forEach(link => {
        link.classList.toggle('active', link.dataset.nav === navKey);
      });
    }
    applyTranslations(placeholder);
  }

  /**
   * Initialize the dark/light theme toggle button and mount it into .header-actions.
   * Reads initial theme from the data-theme attribute on <html>.
   */
  /**
   * Apply a theme to the document by toggling the data-theme attribute \u2014 the
   * single DOM-apply seam shared by the header theme toggle AND the Overview
   * post-restore hook (assets/overview.js). Only the exact value 'dark' enables
   * dark mode; any other value (including an arbitrary/untrusted restored string)
   * removes the attribute, so a tampered backup theme can never inject markup or
   * an unexpected attribute value (T-37-16-02).
   * @param {string} theme - 'dark' enables dark mode; anything else = light.
   */
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function initThemeToggle() {
    var actions = document.getElementById('headerActions') || document.querySelector('.header-actions');
    if (!actions) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'header-control-btn theme-toggle';
    btn.setAttribute('aria-label', 'Toggle dark mode');
    var isDark = function() { return document.documentElement.getAttribute('data-theme') === 'dark'; };
    var updateIcon = function() { btn.textContent = isDark() ? '\u2600\ufe0f' : '\uD83C\uDF19'; };
    updateIcon();
    btn.addEventListener('click', function() {
      var next = isDark() ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('portfolioTheme', next);
      updateIcon();
    });
    actions.appendChild(btn);
  }

  /**
   * Initialize the language popover selector (globe button + dropdown).
   * Replaces the old native select-based language picker.
   */
  function initLanguagePopover() {
    var actions = document.getElementById('headerActions') || document.querySelector('.header-actions');
    if (!actions) return;

    var container = document.createElement('div');
    container.className = 'lang-selector';

    var globeBtn = document.createElement('button');
    globeBtn.type = 'button';
    globeBtn.className = 'header-control-btn lang-globe-btn';
    globeBtn.setAttribute('aria-label', 'Language');
    globeBtn.setAttribute('aria-expanded', 'false');
    globeBtn.setAttribute('aria-controls', 'lang-popover');
    globeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

    var popover = document.createElement('div');
    popover.id = 'lang-popover';
    popover.className = 'lang-popover';
    popover.setAttribute('role', 'listbox');
    popover.setAttribute('aria-label', 'Select language');
    popover.hidden = true;

    var langs = [
      { code: 'en', label: 'English' },
      { code: 'he', label: '\u05e2\u05d1\u05e8\u05d9\u05ea' },
      { code: 'de', label: 'Deutsch' },
      { code: 'cs', label: '\u010ce\u0161tina' }
    ];

    var currentLangCode = localStorage.getItem('portfolioLang') || 'en';

    langs.forEach(function(l) {
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'lang-option' + (l.code === currentLangCode ? ' active' : '');
      opt.setAttribute('role', 'option');
      opt.setAttribute('data-lang', l.code);
      opt.setAttribute('aria-selected', l.code === currentLangCode ? 'true' : 'false');
      opt.textContent = l.label;
      opt.addEventListener('click', function() {
        popover.hidden = true;
        globeBtn.setAttribute('aria-expanded', 'false');
        setLanguage(l.code);
        // Update active state
        popover.querySelectorAll('.lang-option').forEach(function(o) {
          o.classList.toggle('active', o.getAttribute('data-lang') === l.code);
          o.setAttribute('aria-selected', o.getAttribute('data-lang') === l.code ? 'true' : 'false');
        });
        // Re-render footer links for new language
        if (typeof SharedChrome !== 'undefined' && SharedChrome.renderFooter) {
          SharedChrome.renderFooter();
        }
      });
      popover.appendChild(opt);
    });

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

    container.appendChild(globeBtn);
    container.appendChild(popover);
    actions.appendChild(container);
  }

  function initDemoMode() {
    if (window.name !== 'demo-mode') return;
    // Mark body for CSS rules
    document.body.setAttribute('data-demo', 'true');
    // Inject demo banner if not already present
    if (!document.querySelector('.demo-banner')) {
      var banner = document.createElement('div');
      banner.className = 'demo-banner';
      banner.setAttribute('role', 'status');
      banner.innerHTML = '<span class="demo-banner-text"></span>';
      document.body.prepend(banner);
    }
    // Load demo.css if not already loaded
    if (!document.querySelector('link[href*="demo.css"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './assets/demo.css';
      document.head.appendChild(link);
    }
    // Update banner text for current language
    var DEMO_BANNER_TEXT = {
      en: 'This is a live demo \u2014 try it out! Your changes won\'t be saved.',
      he: '\u05d6\u05d5\u05d4\u05d9 \u05d4\u05d3\u05d2\u05de\u05d4 \u05d7\u05d9\u05d4 \u2014 \u05e0\u05e1\u05d5 \u05d1\u05d7\u05d5\u05e4\u05e9\u05d9\u05d5\u05ea! \u05d4\u05e9\u05d9\u05e0\u05d5\u05d9\u05d9\u05dd \u05dc\u05d0 \u05d9\u05d9\u05e9\u05de\u05e8\u05d5.',
      de: 'Dies ist eine Live-Demo \u2014 probieren Sie es aus! Ihre \u00c4nderungen werden nicht gespeichert.',
      cs: 'Toto je \u017eiv\u00e1 uk\u00e1zka \u2014 vyzkou\u0161ejte si to! Va\u0161e zm\u011bny nebudou ulo\u017eeny.'
    };
    var updateBanner = function() {
      var lang = localStorage.getItem('portfolioLang') || 'en';
      var el = document.querySelector('.demo-banner-text');
      if (el) el.textContent = DEMO_BANNER_TEXT[lang] || DEMO_BANNER_TEXT.en;
    };
    updateBanner();
    document.addEventListener('app:language', updateBanner);

    // Phase 35 Plan 06 (D-09 / DEMO-11) — hide the overview Export/Import
    // controls in demo mode so a visitor cannot export real-looking data or
    // import over the demo DB. UX-level exposure reduction layered on top of
    // the real demo_portfolio DB-name isolation.
    hideDemoExposedControls();
    redirectDemoBrandLink();
  }

  /**
   * Phase 35 Plan 06 (D-09 / DEMO-11) — demo-only hide pass for the overview
   * Export/Import controls (#exportBtn, .import-label / #importInput). Runs from
   * initDemoMode (demo mode only). Uses JS-observable hidden/disabled props (not
   * CSS-only) so the 35-02 jsdom exposure gate can assert it. Every lookup is
   * null-guarded — these controls exist only on the overview/home page, but
   * initDemoMode runs on every demo page.
   */
  function hideDemoExposedControls() {
    if (typeof window === 'undefined' || window.name !== 'demo-mode') return;
    var exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.hidden = true;
    var importLabel = document.querySelector('.import-label');
    if (importLabel) importLabel.hidden = true;
    var importInput = document.getElementById('importInput');
    if (importInput) importInput.disabled = true;
  }

  /**
   * Phase 35 Plan 06 (DEMO-10 finding) — in demo mode, point the header brand
   * (logo) link at ./demo.html so it returns to the DEMO home, not the real
   * ./index.html. Every in-app page (sessions/add-session/settings/…) ships a
   * static href="./index.html" brand-link; without this, clicking the logo from
   * inside a demo sub-page escapes the demo shell (loses the banner + reseed).
   * Runs from initDemoMode (demo only); demo.html's own brand-link is already
   * ./demo.html so this is a no-op there. JS-observable so the nav gate asserts it.
   */
  function redirectDemoBrandLink() {
    if (typeof window === 'undefined' || window.name !== 'demo-mode') return;
    var brandLinks = document.querySelectorAll('.brand-link');
    for (var i = 0; i < brandLinks.length; i++) {
      brandLinks[i].setAttribute('href', './demo.html');
    }
  }

  /**
   * Prepend the license key icon link to .header-actions.
   * Links to ./license.html with an SVG key icon.
   */
  function initLicenseLink() {
    // Phase 35 Plan 06 (DEMO-10 iframe-escape fix): never mount the header
    // license key-icon in demo mode — license.html computes its own back-link to
    // ./landing.html and would escape the demo iframe. Mirrors the
    // mountBackupCloudButton demo guard (the established window.name seam).
    if (typeof window !== 'undefined' && window.name === 'demo-mode') return;
    var actions = document.querySelector('.header-actions');
    if (!actions) return;
    var link = document.createElement('a');
    link.href = './license.html';
    link.className = 'header-license-link';
    link.setAttribute('aria-label', t('nav.license') || 'License');
    link.setAttribute('title', t('nav.license') || 'License');
    // Key SVG icon (16x16)
    link.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>';
    actions.prepend(link);
  }

  /**
   * Phase 22 — Mount the gear-icon link to ./settings.html in #headerActions.
   *
   * Renders an <a class="header-control-btn settings-gear-btn"> with an inline
   * SVG gear icon, i18n'd via t('header.settings.label'). Idempotent: bails
   * if a .settings-gear-btn is already mounted (so repeated initCommon calls
   * during hot-reload do not double-mount).
   *
   * Insertion order per UI-SPEC: globe (lang) | theme | settings | license.
   * Inserts before any .license-link / .license-key-btn in #headerActions if
   * present; otherwise appends. (Note: license-key icon was removed from
   * initCommon in D-03; gear simply lands at end of headerActions today.)
   *
   * The innerHTML use here is a compile-time literal SVG — no user input is
   * interpolated. aria-label and title are set via setAttribute from i18n.
   */
  function initSettingsLink() {
    var actions = document.getElementById('headerActions') || document.querySelector('.header-actions');
    if (!actions) return;
    // Avoid double-mount on hot-reload or repeated initCommon calls.
    if (actions.querySelector('.settings-gear-btn')) return;

    var link = document.createElement('a');
    link.href = './settings.html';
    link.className = 'header-control-btn settings-gear-btn';
    link.setAttribute('data-tour', 'settings'); // Phase 41 tour anchor (step 2) — inert selector for the guided-tour engine
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

    // Phase 22 Plan 12 (Gap B, D3): single call site for App.installNavGuard.
    // Future call sites (brand-link, add-client, etc.) are out of scope for this plan
    // and will be audited later by Ben using App.installNavGuard as the building block.
    App.installNavGuard({
      trigger: link,
      isDirty: function () {
        return typeof window.PortfolioFormDirty === 'function' && window.PortfolioFormDirty() === true;
      },
      message: {
        titleKey:   'session.leavePage.title',
        bodyKey:    'session.leavePage.body',
        confirmKey: 'session.leavePage.confirm',
        cancelKey:  'session.leavePage.cancel',
        tone:       'danger'
      },
      destination: link.href
    });

    // Re-translate gear label on language switch — registered exactly once.
    if (!initSettingsLink._listenerInstalled) {
      document.addEventListener('app:language', function () {
        var existingLink = document.querySelector('.settings-gear-btn');
        if (existingLink) {
          var newLabel = (typeof t === 'function' ? t('header.settings.label') : '') || 'Settings';
          existingLink.setAttribute('aria-label', newLabel);
          existingLink.setAttribute('title', newLabel);
        }
      });
      initSettingsLink._listenerInstalled = true;
    }
  }

  /**
   * Phase 39 (HELP-01 / HELP-02) — mount the persistent "?" help entry into
   * #headerActions on every SW-registered app page, beside the cloud + gear
   * controls.
   *
   * Composition of two already-shipped chrome patterns:
   *   • initSettingsLink  — the icon-button MOUNT shape: idempotent double-mount
   *     guard, aria-label/title from t(), compile-time-literal inline SVG,
   *     `.is-active` on body[data-nav], and an install-once app:language
   *     re-translate listener (initHelpEntry._listenerInstalled).
   *   • initLanguagePopover — the RTL-safe POPOVER: hidden-attribute toggle,
   *     aria-expanded kept in sync, and outside-click / (globe-pattern) dismiss.
   *
   * The popover items come from an ADDABLE array (D-09) so Phases 40–42 can
   * append "Replay welcome / Take tour / What's new" with no rewrite. Item
   * labels are set via textContent from the i18n dict (never innerHTML) — the
   * inline "?" glyph SVG is the ONLY compile-time-literal innerHTML here, with
   * no user-interpolated markup (T-39-04 / T-39-05).
   */
  function initHelpEntry() {
    var actions = document.getElementById('headerActions') || document.querySelector('.header-actions');
    if (!actions) return;
    // Idempotent double-mount guard (mirrors initSettingsLink).
    if (actions.querySelector('.help-entry-btn')) return;

    var label = (typeof t === 'function' ? t('help.entry.label') : '') || 'Help';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'header-control-btn help-entry-btn';
    btn.setAttribute('data-tour', 'help'); // Phase 41 tour anchor (step 10) — inert selector for the guided-tour engine
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');

    // Inline "?" glyph SVG — compile-time literal, no user input (T-39-04).
    // 20x20 rendered in a 24x24 viewBox, stroke=currentColor (RTL-neutral).
    btn.innerHTML = ''
      + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<circle cx="12" cy="12" r="10"></circle>'
      + '<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>'
      + '<line x1="12" y1="17" x2="12.01" y2="17"></line>'
      + '</svg>';

    // Active state when viewing the help page (mirrors the gear's is-active).
    if (document.body && document.body.dataset && document.body.dataset.nav === 'help') {
      btn.classList.add('is-active');
    }

    var popover = document.createElement('div');
    popover.className = 'help-entry-popover';
    popover.setAttribute('role', 'menu');
    popover.setAttribute('aria-label', label);
    popover.hidden = true;

    // ADDABLE item list (D-09 / D-10). Each item is either an { href } link row
    // or an { action } button row. Phase 40 (this plan) adds the "Replay welcome"
    // action row (D-17: after Help center, before Contact us); Phase 41 later
    // appends its own "Take the tour" action row the same way (no rename churn).
    var items = [
      { labelKey: 'help.entry.center', href: './help.html' },
      // Phase 40 Plan 04 (ONBD-02) — replays the welcome overlay DIRECTLY via
      // showWelcome(true): a one-off open that bypasses run() and never re-arms
      // sg.welcomeSeen or the session marker (Pitfall 5). typeof-guarded so a
      // page without the coordinator never throws.
      { labelKey: 'help.entry.replayWelcome', action: function () {
        if (typeof AttentionCoordinator !== 'undefined') AttentionCoordinator.showWelcome(true);
      } },
      // Phase 41 Plan 05 (TOUR-01) — "Take the tour" action row launches the
      // replayable guided tour via window.Tour.start() (an explicit user click,
      // never auto-run). Slotted after Replay welcome (P40 D-17 ordering).
      // typeof-guarded so a page that mounts chrome without tour.js never throws.
      { labelKey: 'help.entry.takeTour', action: function () {
        if (typeof window.Tour !== 'undefined') window.Tour.start();
      } },
      { labelKey: 'help.entry.contact', href: 'mailto:contact@sessionsgarden.app' }
    ];
    // Demo gate (D-16): the sales demo never offers the tour — filter the row out
    // BEFORE the mount loop so no dead row renders. window.name==='demo-mode' is
    // the established demo seam (initDemoMode / mountBackupCloudButton).
    if (typeof window !== 'undefined' && window.name === 'demo-mode') {
      items = items.filter(function (item) { return item.labelKey !== 'help.entry.takeTour'; });
    }
    items.forEach(function (item) {
      // href → <a> link row (unchanged path); action → <button> row.
      var el;
      if (item.href) {
        el = document.createElement('a');
        el.href = item.href;
      } else {
        el = document.createElement('button');
        el.type = 'button';
        el.addEventListener('click', function () {
          // Close the popover (mirror the outside-click dismiss) then act.
          popover.hidden = true;
          btn.setAttribute('aria-expanded', 'false');
          if (typeof item.action === 'function') item.action();
        });
      }
      el.className = 'help-entry-item';
      el.setAttribute('role', 'menuitem');
      el.setAttribute('data-label-key', item.labelKey);
      // Label via textContent from the i18n dict — never innerHTML (T-39-05).
      el.textContent = (typeof t === 'function' ? t(item.labelKey) : '') || item.labelKey;
      popover.appendChild(el);
    });

    // Popover open/close + outside-click dismiss + aria-expanded sync,
    // copied from initLanguagePopover (D-09 globe pattern).
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      popover.hidden = !popover.hidden;
      btn.setAttribute('aria-expanded', String(!popover.hidden));
    });
    document.addEventListener('click', function (e) {
      if (!popover.hidden && !btn.contains(e.target) && !popover.contains(e.target)) {
        popover.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    var container = document.createElement('div');
    container.className = 'help-entry';
    container.appendChild(btn);
    container.appendChild(popover);
    actions.appendChild(container);

    // Re-translate the button label + item labels on language switch —
    // registered exactly once (mirrors initSettingsLink._listenerInstalled).
    if (!initHelpEntry._listenerInstalled) {
      document.addEventListener('app:language', function () {
        var existingBtn = document.querySelector('.help-entry-btn');
        if (existingBtn) {
          var newLabel = (typeof t === 'function' ? t('help.entry.label') : '') || 'Help';
          existingBtn.setAttribute('aria-label', newLabel);
          existingBtn.setAttribute('title', newLabel);
        }
        document.querySelectorAll('.help-entry-item').forEach(function (a) {
          var key = a.getAttribute('data-label-key');
          a.textContent = (typeof t === 'function' ? t(key) : '') || key;
        });
      });
      initHelpEntry._listenerInstalled = true;
    }
  }

  /**
   * Initialize page: render nav, apply translations, set up theme toggle, license link, backup
   * reminder, and persistent storage request. Call this in DOMContentLoaded on every app page.
   *
   * Phase 22: now async because therapist settings are eager-loaded from IndexedDB
   * BEFORE setLanguage runs, so getSectionLabel returns user-customized labels on
   * first render. Existing callers that don't await will still work — the rest of
   * initCommon's synchronous chrome wiring continues, only the cache load is async.
   */
  /**
   * Phase 25 Plan 02 (D-08, updated 2026-05-15) — mount the Backup & Restore
   * cloud icon button into #headerActions BEFORE the existing settings gear,
   * on every page that calls initCommon. Idempotent: skips if a
   * .backup-cloud-btn is already mounted.
   *
   * The icon is a 44×44 circular button (Phase 21 MOB-04 minimum touch target).
   * Initial state class is computed from BackupManager.computeBackupRecencyState()
   * — Plan 04 ships the post-mount state-update wiring (visibilitychange +
   * post-export hooks); this mount applies the state at first render only.
   *
   * On click: opens the unified Backup & Restore modal via window.openBackupModal()
   * if defined (overview.js exposes it). On non-overview pages where the modal
   * markup is not in the DOM, the click navigates to ./index.html?openBackup=1
   * — overview.js reads the query param on load and auto-opens the modal.
   * (This single deviation from "modal lives in DOM on every page" is intentional
   * and minimal; if it becomes a problem the modal markup can be hoisted to a
   * shared partial in a follow-up plan.)
   */
  function mountBackupCloudButton() {
    // Phase 35 Plan 06 (D-09 / DEMO-11) — never mount the cloud backup entry
    // point in the sales demo. window.name==='demo-mode' is the established
    // demo seam; updateBackupCloudState already no-ops on the absent button.
    if (typeof window !== 'undefined' && window.name === 'demo-mode') return;
    var actions = document.getElementById('headerActions') || document.querySelector('.header-actions');
    if (!actions) return;
    if (actions.querySelector('.backup-cloud-btn')) return;  // double-mount guard

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'backupCloudBtn';
    btn.setAttribute('data-tour', 'backup'); // Phase 41 tour anchor (step 9) — inert selector for the guided-tour engine

    // Initial state class — computeBackupRecencyState() returns
    // 'never' | 'fresh' | 'warning' | 'danger'. Defensive: BackupManager may
    // not be loaded on legal/standalone pages; default to 'never'.
    var initialState = 'never';
    try {
      if (typeof BackupManager !== 'undefined' && typeof BackupManager.computeBackupRecencyState === 'function') {
        initialState = BackupManager.computeBackupRecencyState() || 'never';
      }
    } catch (_) { /* keep default */ }
    btn.className = 'header-icon-btn backup-cloud-btn backup-cloud-btn--' + initialState;

    // a11y: aria-label is the entry-point label; title carries the dynamic
    // recency text. (Plan 04 swaps in the localized recency keys — until then,
    // the literal-string fallback prevents an undefined-key string from rendering.)
    var ariaLabel = (typeof t === 'function' ? t('overview.backupRestore') : '') || 'Backup & Restore';
    btn.setAttribute('aria-label', ariaLabel);

    var labelLastBackup = (typeof t === 'function' ? t('overview.chip.lastBackup') : '') || 'Last backup';
    var labelNever      = (typeof t === 'function' ? t('overview.chip.never')      : '') || 'never';
    var sep = ' · ';
    var relText = labelNever;
    try {
      var raw = localStorage.getItem('portfolioLastExport');
      if (raw && typeof window.formatRelativeTime === 'function') {
        var rel = window.formatRelativeTime(Number(raw));
        if (rel) relText = rel;
      }
    } catch (_) { /* keep never */ }
    btn.setAttribute('title', labelLastBackup + sep + relText);

    // Inline cloud SVG — 20×20 inside the 44×44 button, single-color via
    // currentColor so the state-color modifiers (Plan 04) can repaint the
    // stroke without overriding the SVG markup.
    btn.innerHTML = ''
      + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      +   ' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M17 18 H7 a4 4 0 0 1 -1 -7.9 6 6 0 0 1 11.6 -1.5 4 4 0 0 1 -.6 9.4 z"/>'
      + '</svg>';

    // Click: open modal if available; otherwise navigate to overview with
    // the auto-open query param so overview.js can open it after page load.
    btn.addEventListener('click', function () {
      if (typeof window.openBackupModal === 'function') {
        window.openBackupModal();
      } else {
        window.location.href = './index.html?openBackup=1';
      }
    });

    // Insert BEFORE the settings gear (visual order in LTR: brand … cloud, gear).
    var gear = actions.querySelector('.settings-gear-btn');
    if (gear && gear.parentNode === actions) {
      actions.insertBefore(btn, gear);
    } else {
      // Gear not yet mounted (initSettingsLink runs after this) — insert at
      // start so the eventual gear lands AFTER the cloud regardless of mount order.
      actions.insertBefore(btn, actions.firstChild);
    }

    // Re-translate aria-label on language switch — registered exactly once.
    if (!mountBackupCloudButton._listenerInstalled) {
      document.addEventListener('app:language', function () {
        var existing = document.getElementById('backupCloudBtn');
        if (existing && typeof t === 'function') {
          existing.setAttribute('aria-label', t('overview.backupRestore') || 'Backup & Restore');
        }
      });
      mountBackupCloudButton._listenerInstalled = true;
    }
  }

  /**
   * Phase 25 Plan 04 (D-08 / D-13 / D-14, updated 2026-05-15) — update the
   * cloud icon's recency state class + title text on every relevant event:
   * page load (post-mount), post-export, post-import, visibilitychange,
   * schedule-change, language-change.
   *
   * Pure DOM update with no side-effects beyond the button element passed in.
   * If buttonEl is null/missing, no-op (defensive: pages without the icon).
   *
   * D-30: state derivation routes through BackupManager.computeBackupRecencyState,
   * which delegates to getChipState + getScheduleIntervalMs. Single source of
   * truth shared with Plan 02's mount-time class assignment, Plan 05's
   * schedule fire, and checkBackupReminder's banner suppression.
   */
  function updateBackupCloudState(buttonEl) {
    if (!buttonEl) return;
    var STATES = ['never', 'fresh', 'warning', 'danger'];
    var state = 'never';
    try {
      if (typeof BackupManager !== 'undefined' && typeof BackupManager.computeBackupRecencyState === 'function') {
        state = BackupManager.computeBackupRecencyState() || 'never';
      }
    } catch (_) { /* keep default */ }
    if (STATES.indexOf(state) === -1) state = 'never';

    // Swap the state class — remove all four, add the matching one.
    for (var i = 0; i < STATES.length; i++) {
      buttonEl.classList.remove('backup-cloud-btn--' + STATES[i]);
    }
    buttonEl.classList.add('backup-cloud-btn--' + state);

    // Update the title text (textual a11y-safe equivalent of the color signal).
    var labelLastBackup = (typeof t === 'function' ? t('overview.chip.lastBackup') : '') || 'Last backup';
    var labelNever      = (typeof t === 'function' ? t('overview.chip.never')      : '') || 'never';
    var sep = ' · ';
    var relText = labelNever;
    try {
      var raw = localStorage.getItem('portfolioLastExport');
      if (raw && typeof window.formatRelativeTime === 'function') {
        var rel = window.formatRelativeTime(Number(raw));
        if (rel) relText = rel;
      }
    } catch (_) { /* keep never */ }
    buttonEl.setAttribute('title', labelLastBackup + sep + relText);
  }

  /**
   * Phase 24 Plan 08 — Install unsaved-changes guard on the top-of-page brand link.
   *
   * The brand-link element exists on every page that uses the standard header.
   * Pages without a dirty-able form expose no `window.PortfolioFormDirty`
   * predicate, so the guard's isDirty callback returns false and the guard
   * is a no-op there. Pages with a dirty form (add-session.html for both
   * new and edit flows) trigger the same confirm dialog used by the
   * back-to-overview link.
   *
   * Idempotent: bails if a guard is already installed on this element.
   */
  function initBrandLinkGuard() {
    var brand = document.querySelector('.brand-link');
    if (!brand) return;
    if (brand._navGuardInstalled) return;
    brand._navGuardInstalled = true;
    App.installNavGuard({
      trigger: brand,
      isDirty: function () {
        return typeof window.PortfolioFormDirty === 'function' && window.PortfolioFormDirty() === true;
      },
      message: {
        titleKey:   'session.leavePage.title',
        bodyKey:    'session.leavePage.body',
        confirmKey: 'session.leavePage.confirm',
        cancelKey:  'session.leavePage.cancel',
        tone:       'danger'
      },
      destination: brand.href
    });
  }

  async function initCommon() {
    initDemoMode();
    renderNav();
    initThemeToggle();
    initLanguagePopover();
    mountBackupCloudButton(); // Phase 25 Plan 02 (D-08) — cloud icon entry point to the Backup & Restore modal
    initSettingsLink(); // Phase 22 — gear-icon entry point to ./settings.html
    initHelpEntry(); // Phase 39 (HELP-01/02) — "?" help entry + addable popover
    initBrandLinkGuard(); // Phase 24 Plan 08 — protect against logo-click data loss on dirty form

    // Phase 25 Plan 04 (D-13 / D-14) — refresh cloud icon state on initial load,
    // and install a visibilitychange + app:language listener pair so the
    // icon's color/title stay in sync with the underlying recency.
    // Listener installation is idempotent via a static flag on initCommon.
    updateBackupCloudState(document.getElementById('backupCloudBtn'));
    if (!initCommon._backupVisibilityListenerInstalled) {
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
          updateBackupCloudState(document.getElementById('backupCloudBtn'));
        }
      });
      document.addEventListener('app:language', function () {
        // Re-render title text on language switch (the state class is unchanged,
        // but the localized "Last backup" / "never" strings need to re-flow).
        updateBackupCloudState(document.getElementById('backupCloudBtn'));
      });
      initCommon._backupVisibilityListenerInstalled = true;
    }
    // initLicenseLink removed per D-03 — license key icon no longer in header

    // Phase 22: eager-load therapist settings BEFORE setLanguage, so the first
    // applyTranslations() pass can resolve custom labels via getSectionLabel.
    try {
      if (typeof PortfolioDB !== "undefined" && typeof PortfolioDB.getAllTherapistSettings === "function") {
        const rows = await PortfolioDB.getAllTherapistSettings();
        _sectionLabelCache = new Map(rows.map(r => [r.sectionKey, r]));
      }
    } catch (err) {
      console.warn("Therapist settings unavailable on initCommon:", err);
      _sectionLabelCache = new Map();
    }

    // Phase 24 Plan 04: eager-load snippets so App.getSnippets is synchronously
    // readable from snippets.js the first time a textarea fires input.
    try {
      if (typeof PortfolioDB !== "undefined" && typeof PortfolioDB.getAllSnippets === "function") {
        _snippetCache = await PortfolioDB.getAllSnippets();
      }
    } catch (err) {
      console.warn("Snippets unavailable on initCommon:", err);
      _snippetCache = [];
    }

    // Phase 22: cross-tab sync via BroadcastChannel.
    // When another tab updates therapistSettings, refresh the cache and
    // dispatch app:settings-changed so the current page can re-render labels.
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const ch = new BroadcastChannel("sessions-garden-settings");
        ch.addEventListener("message", async (e) => {
          if (!e || !e.data) return;
          if (e.data.type === "therapist-settings-changed") {
            try {
              const rows = await PortfolioDB.getAllTherapistSettings();
              _sectionLabelCache = new Map(rows.map(r => [r.sectionKey, r]));
              document.dispatchEvent(new CustomEvent("app:settings-changed"));
            } catch (err) {
              console.warn("BroadcastChannel refresh failed:", err);
            }
          } else if (e.data.type === "snippets-changed") {
            // Phase 24 Plan 04 — peer tab added/updated/deleted a snippet.
            await refreshSnippetCache();
          }
        });
      } catch (err) {
        console.warn("BroadcastChannel unavailable:", err);
      }
    }

    // Phase 37 Plan 07 (FIX 2) — cross-tab session-type sync. The native
    // `storage` event fires ONLY in OTHER tabs (never the writing tab), which is
    // exactly the cross-tab case: when a peer tab rewrites
    // localStorage['portfolioSessionTypes'], re-dispatch app:session-types-changed
    // on this document so display sites (session cards, list, overview) re-render.
    // No cache to refresh — formatSessionType reads localStorage synchronously.
    if (typeof window !== "undefined" && typeof window.addEventListener === "function" &&
        !initCommon._sessionTypesStorageListenerInstalled) {
      window.addEventListener("storage", function (e) {
        if (e && e.key === "portfolioSessionTypes") {
          try {
            document.dispatchEvent(new CustomEvent("app:session-types-changed"));
          } catch (_) { /* ignore */ }
        }
        // WR-04: symmetric cross-tab relay for the date-format preference. The
        // native `storage` event fires only in PEER tabs; re-dispatch the same
        // `app:dateformat` signal settings.js fires on change (previously a
        // dead signal with no consumer) so peer displays can re-render dates.
        if (e && e.key === "portfolioDateFormat") {
          try {
            document.dispatchEvent(new CustomEvent("app:dateformat", {
              detail: { format: e.newValue || "auto" },
            }));
          } catch (_) { /* ignore */ }
        }
      });
      initCommon._sessionTypesStorageListenerInstalled = true;
    }

    const savedLang = localStorage.getItem("portfolioLang") || window.I18N_DEFAULT || "en";
    setLanguage(savedLang);
    // Phase 41 Plan 05 (TOUR-03 / architect-gate A7) — resume a cross-page tour
    // run on load. Placed IMMEDIATELY AFTER setLanguage(savedLang) on purpose: a
    // resuming RTL-preference (Hebrew) user must render in the correct direction
    // on the first paint. If resume() ran before setLanguage, the tooltip would
    // flash one tick LTR before the app:language re-render (TOUR-04). typeof-
    // guarded so a page that mounts chrome without tour.js never throws (A1).
    if (typeof window.Tour !== 'undefined' && window.Tour.resume) window.Tour.resume();
    checkBackupReminder();

    // Phase 25 Plan 05 (D-17) — foreground schedule check. When a backup
    // schedule is active and the interval has elapsed (and the 1-hour
    // debounce has not), opens the unified Backup & Restore modal via
    // window.openBackupModal. The visibility listener catches the user
    // returning to the tab after the interval has passed. Defensive
    // guards: BackupManager may not be loaded on every page; the helper
    // itself wraps its localStorage reads in try/catch.
    if (typeof BackupManager !== 'undefined' && typeof BackupManager.checkBackupSchedule === 'function') {
      try { BackupManager.checkBackupSchedule(); } catch (_) {}
      if (!initCommon._backupScheduleListenerInstalled) {
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') {
            try { BackupManager.checkBackupSchedule(); } catch (_) {}
          }
        });
        initCommon._backupScheduleListenerInstalled = true;
      }
    }

    requestPersistentStorage();
    // Phase 40 Plan 04 (ONBD-03) — arbitrate governed attention surfaces via the
    // coordinator instead of firing the security note directly. bootAttentionSurfaces
    // registers the security-note surface then calls AttentionCoordinator.run()
    // (typeof-guarded for pages without the coordinator, Pitfall 7).
    bootAttentionSurfaces();
    initPersistentSecuritySection();
    // Render shared footer
    if (typeof SharedChrome !== 'undefined' && SharedChrome.renderFooter) {
      SharedChrome.renderFooter();
    }

    // Phase 28 (D-05/D-06) — reliable, non-disruptive update delivery.
    //
    // D-05 apply-on-next-navigation: the forced mid-page
    // `window.location.reload()` on `controllerchange` is REMOVED. This app is
    // multi-page, so a new SW (skipWaiting + clients.claim, owned by sw.js)
    // takes effect on the next navigation or app reopen — it never yanks a
    // therapist out of an in-progress typing session. SW takeover itself is
    // preserved in sw.js; only the page-side forced reload is gone.
    //
    // D-06 general SW-update delivery: the unreliable-update behavior is a
    // general SW-lifecycle issue (reproduces on the macOS installed web app,
    // not just iOS), so we proactively poll for a new SW on launch and whenever
    // the app returns to the foreground. registration.update() is the SW's own
    // throttled mechanism — no new network call beyond it (VER-06).
    if ("serviceWorker" in navigator) {
      var pokeServiceWorkerUpdate = function () {
        try {
          navigator.serviceWorker.ready
            .then(function (reg) { if (reg && reg.update) return reg.update(); })
            .catch(function (err) {
              console.warn("[sw-update] registration.update() failed:", err && err.message);
            });
        } catch (err) {
          console.warn("[sw-update] could not request a SW update:", err && err.message);
        }
      };

      // Launch check.
      pokeServiceWorkerUpdate();

      // Foreground check — idempotent listener-install guard mirrors the
      // backup-schedule idiom above (_backupScheduleListenerInstalled).
      if (!initCommon._swUpdateListenerInstalled) {
        document.addEventListener("visibilitychange", function () {
          if (document.visibilityState === "visible") {
            pokeServiceWorkerUpdate();
          }
        });
        initCommon._swUpdateListenerInstalled = true;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // UI utilities
  // ---------------------------------------------------------------------------

  /**
   * Show a temporary toast notification that auto-dismisses.
   *
   * Backward compatible: the (message, key) positional signature is UNCHANGED, so
   * every existing 2-arg caller behaves exactly as before — single success style,
   * 1800ms auto-dismiss, no focus side effect. The error tone + focus are strictly
   * opt-in via the third options param (Plan 38-12), reusable by any error toast.
   *
   * @param {string} message - Text to display (used if key is not provided)
   * @param {string} [key] - i18n key to look up instead of using message directly
   * @param {Object} [options] - Opt-in error-toast behavior (Plan 38-12).
   * @param {string} [options.tone] - "error" renders the visually distinct
   *   `.toast--error` variant and lingers longer (TOAST_ERROR_MS) than the success
   *   default; any other/absent value keeps the single success style + 1800ms.
   * @param {Element} [options.focus] - When provided, the element is scrolled into
   *   view and focused so the offending form field is brought to the user. Guarded:
   *   a missing or non-element target is a safe no-op (never throws).
   */
  function showToast(message, key, options) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    const TOAST_SUCCESS_MS = 1800;
    const TOAST_ERROR_MS = 4000;
    const isError = !!(options && options.tone === "error");
    // Always reset the error tone first so a prior error toast never leaves its
    // tone stuck on a later success toast (they share the single #toast node).
    toast.classList.remove("toast--error");
    toast.textContent = key ? t(key) : message;
    toast.classList.add("is-visible");
    if (isError) toast.classList.add("toast--error");
    // Bring the offending field into view and focus it (opt-in; success callers
    // never pass a focus target). Every access is guarded so a missing element or
    // a non-element focus target cannot throw.
    const focusTarget = options && options.focus;
    if (focusTarget) {
      if (typeof focusTarget.scrollIntoView === "function") focusTarget.scrollIntoView();
      if (typeof focusTarget.focus === "function") focusTarget.focus();
    }
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(
      () => toast.classList.remove("is-visible"),
      isError ? TOAST_ERROR_MS : TOAST_SUCCESS_MS
    );
  }

  /**
   * Show a modal confirmation dialog with OK/Cancel buttons.
   * @param {Object} options - Dialog configuration
   * @param {string} options.titleKey - i18n key for dialog title
   * @param {string} options.messageKey - i18n key for dialog message
   * @param {string} [options.confirmKey='confirm.delete'] - i18n key for confirm button
   * @param {string} [options.cancelKey='confirm.cancel'] - i18n key for cancel button
   * @param {string} [options.tone='danger'] - 'danger' (red confirm) or 'neutral' (primary confirm)
   * @param {Object} [options.placeholders] - i18n placeholder bag (UAT-C2, Phase 25 Plan 12).
   *   Each key in the object is substituted into title AND message strings via
   *   String.prototype.replace('{key}', String(value)). E.g.
   *   `placeholders: { n: 3, size: '12 MB' }` rewrites '{n}' → '3' and
   *   '{size}' → '12 MB' on both the title and the message AFTER i18n
   *   resolution. The substitution runs BEFORE the dialog renders so the user
   *   never sees the bare '{n}' / '{size}' literals. Reusable D-30 helper —
   *   any future caller with a parameterised i18n string can pass placeholders
   *   here instead of pre-substituting at the call site.
   * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
   */
  function confirmDialog({ titleKey, messageKey, confirmKey = "confirm.delete", cancelKey = "confirm.cancel", tone = "danger", placeholders = null }) {
    const modal = document.getElementById("confirmModal");
    if (!modal) {
      return Promise.resolve(false);
    }

    const titleEl = modal.querySelector("#confirmTitle");
    const messageEl = modal.querySelector("#confirmMessage");
    const confirmBtn = modal.querySelector("#confirmOkBtn");
    const cancelBtn = modal.querySelector("#confirmCancelBtn");
    const overlay = modal.querySelector(".modal-overlay");

    if (titleEl && titleKey) titleEl.setAttribute("data-i18n", titleKey);
    if (messageEl && messageKey) messageEl.setAttribute("data-i18n", messageKey);
    if (confirmBtn && confirmKey) confirmBtn.setAttribute("data-i18n", confirmKey);
    if (cancelBtn && cancelKey) cancelBtn.setAttribute("data-i18n", cancelKey);
    applyTranslations(modal);

    // Phase 25 Plan 12 UAT-C2: substitute {key} placeholders in the
    // resolved title + message strings AFTER applyTranslations has set the
    // base text. We resolve directly off the DOM textContent (which holds
    // the i18n-translated string post-applyTranslations) and clear the
    // data-i18n attribute so a subsequent setLanguage() re-render does NOT
    // overwrite the substituted text with the bare template.
    if (placeholders && typeof placeholders === "object") {
      const keys = Object.keys(placeholders);
      const substitute = function (el) {
        if (!el) return;
        let txt = el.textContent || "";
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          const value = String(placeholders[k]);
          // Replace EVERY occurrence of {key}. The loop guard caps at the
          // text length so a malformed value containing '{k}' cannot cause
          // infinite expansion (defensive against echo bugs).
          const token = "{" + k + "}";
          let guard = txt.length;
          while (txt.indexOf(token) !== -1 && guard-- > 0) {
            txt = txt.replace(token, value);
          }
        }
        el.textContent = txt;
        // Stop applyTranslations from rewriting the substituted text on
        // any subsequent re-render while this dialog is open.
        el.removeAttribute("data-i18n");
      };
      substitute(titleEl);
      substitute(messageEl);
    }

    // Tone: 'danger' (default — destructive red) or 'neutral' (button-primary).
    // We swap classes on open and restore on close so other consumers' default styling is unaffected.
    let _restoreConfirmBtnClass = null;
    if (confirmBtn) {
      if (tone === "neutral" && confirmBtn.classList.contains("danger")) {
        confirmBtn.classList.remove("danger");
        confirmBtn.classList.add("button-primary");
        _restoreConfirmBtnClass = "danger";
      } else if (tone === "danger" && confirmBtn.classList.contains("button-primary") && !confirmBtn.classList.contains("danger")) {
        // Self-heal in case a prior neutral call leaked (defensive — close() restores, but if a caller crashes mid-dialog this resets state).
        confirmBtn.classList.remove("button-primary");
        confirmBtn.classList.add("danger");
        _restoreConfirmBtnClass = "button-primary";
      }
    }

    return new Promise((resolve) => {
      const close = (result) => {
        modal.classList.add("is-hidden");
        unlockBodyScroll();
        // Restore the button class if we swapped it for tone.
        if (confirmBtn && _restoreConfirmBtnClass) {
          if (_restoreConfirmBtnClass === "danger") {
            confirmBtn.classList.remove("button-primary");
            confirmBtn.classList.add("danger");
          } else {
            confirmBtn.classList.remove("danger");
            confirmBtn.classList.add("button-primary");
          }
          _restoreConfirmBtnClass = null;
        }
        confirmBtn && confirmBtn.removeEventListener("click", onConfirm);
        cancelBtn && cancelBtn.removeEventListener("click", onCancel);
        overlay && overlay.removeEventListener("click", onCancel);
        document.removeEventListener("keydown", onKey);
        resolve(result);
      };

      const onConfirm = () => close(true);
      const onCancel = () => close(false);
      const onKey = (event) => {
        if (event.key === "Escape") close(false);
      };

      confirmBtn && confirmBtn.addEventListener("click", onConfirm);
      cancelBtn && cancelBtn.addEventListener("click", onCancel);
      overlay && overlay.addEventListener("click", onCancel);
      document.addEventListener("keydown", onKey);

      modal.classList.remove("is-hidden");
      lockBodyScroll();
      setTimeout(() => {
        if (confirmBtn) confirmBtn.focus();
      }, 0);
    });
  }

  // ---------------------------------------------------------------------------
  // Data formatting and export
  // ---------------------------------------------------------------------------

  /**
   * Format a date string for display in the current locale.
   *
   * Delegates in full to the canonical window.DateFormat engine
   * (assets/date-format.js), which reads the user's chosen format preference
   * (localStorage['portfolioDateFormat'] || 'auto') and applies the LOCAL-time
   * parse that kills the UTC-midnight off-by-one bug (D-01/D-02). The old
   * inline localeMap + long/short-month rule now lives inside DateFormat's
   * autoFormat, byte-for-byte, so 'auto' reproduces this function's previous
   * output while the 6 explicit format options become available. The empty /
   * unparseable pass-through behavior is preserved by the engine's format().
   * @param {string} dateString - ISO date string (e.g., '2024-03-15')
   * @returns {string} Formatted date (e.g., 'Mar 15, 2024'), or empty string if falsy
   */
  function formatDate(dateString) {
    // WR-05: defend against date-format.js failing to load (script 404 / offline
    // first visit before the SW caches it) — mirror pdf-export.js's guard so a
    // missing engine degrades to a raw pass-through instead of crashing every
    // date in the app.
    var DF = window.DateFormat;
    if (DF && typeof DF.format === "function") {
      return DF.format(dateString, DF.getPreference(), currentLang);
    }
    return dateString ? String(dateString) : "";
  }

  function severityColor(value) {
    const hue = 210 - (210 * (value / 10));
    return `hsl(${hue}, 70%, 48%)`;
  }

  /**
   * Create a 0-10 severity picker widget (a row of numbered buttons).
   * @param {number|null} initialValue - Initially selected value (0-10), or null for none
   * @param {Function} [onChange] - Called with the selected number when a button is clicked
   * @returns {HTMLElement} The severity scale container element
   */
  function createSeverityScale(initialValue, onChange) {
    const wrap = document.createElement("div");
    wrap.className = "severity-scale";
    wrap.dataset.value = initialValue !== null && initialValue !== undefined ? String(initialValue) : "";

    for (let i = 0; i <= 10; i += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "severity-button";
      button.textContent = String(i);
      button.style.setProperty("--sev-color", severityColor(i));
      if (String(initialValue) === String(i)) {
        button.classList.add("is-active");
      }
      button.addEventListener("click", () => {
        wrap.dataset.value = String(i);
        wrap.querySelectorAll(".severity-button").forEach((btn) => btn.classList.remove("is-active"));
        button.classList.add("is-active");
        if (onChange) onChange(i);
      });
      wrap.appendChild(button);
    }
    return wrap;
  }

  /**
   * Read the current selected value from a severity scale widget.
   * @param {HTMLElement} wrapper - The severity scale container returned by createSeverityScale
   * @returns {number|null} Selected value (0-10), or null if none selected
   */
  function getSeverityValue(wrapper) {
    if (!wrapper) return null;
    const value = wrapper.dataset.value;
    if (value === "" || value === undefined) return null;
    return Number.parseInt(value, 10);
  }

  /**
   * Export all clients and sessions from the database as a plain object.
   * @returns {Promise<{clients: Array, sessions: Array, exportedAt: string, version: number}>}
   */
  async function exportData() {
    const clients = await window.PortfolioDB.getAllClients();
    const sessions = await window.PortfolioDB.getAllSessions();
    return {
      clients,
      sessions,
      exportedAt: new Date().toISOString(),
      version: 1,
    };
  }

  /**
   * Trigger a browser download of a JSON data object as a .json file.
   * @param {Object} data - Data to serialize and download
   */
  function downloadJSON(data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // WR-05: guard window.DateFormat (see formatDate) — fall back to the same
    // hand-composed LOCAL Y-M-D used by backup.js:_assembleBackupZip so the
    // export never crashes if date-format.js failed to load.
    const dateStr = (window.DateFormat && typeof window.DateFormat.todayLocalISO === "function")
      ? window.DateFormat.todayLocalISO()
      : (function () {
          const now = new Date();
          return now.getFullYear() + "-" +
            String(now.getMonth() + 1).padStart(2, "0") + "-" +
            String(now.getDate()).padStart(2, "0");
        })();
    a.download = `portfolio-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // Record successful export timestamp
    localStorage.setItem("portfolioLastExport", String(Date.now()));
  }

  function requestPersistentStorage() {
    if (localStorage.getItem("portfolioStoragePersistRequested")) return;
    if (!navigator.storage || !navigator.storage.persist) return;
    navigator.storage.persist().then((granted) => {
      localStorage.setItem("portfolioStoragePersistRequested", "true");
      // Silently log result — do not surface to user
      console.log("Persistent storage requested:", granted ? "granted" : "not granted");
    }).catch(() => {
      // If denied or errored, still mark as requested so we do not retry every load
      localStorage.setItem("portfolioStoragePersistRequested", "true");
    });
  }

  function checkBackupReminder() {
    // Phase 25 Plan 04 (D-15 / D-19) — when a backup schedule is active, the
    // scheduled interval-end prompt IS the reminder. The 7-day banner is
    // suppressed entirely so the two channels never compete.
    //
    // BackupManager may not be loaded on every page (only pages that include
    // backup.js); guard the call. If BackupManager throws inside the helper,
    // fall through to the legacy banner path (defensive: pages without backup
    // data still get the reminder).
    try {
      if (typeof BackupManager !== 'undefined' && typeof BackupManager.getScheduleIntervalMs === 'function') {
        if (BackupManager.getScheduleIntervalMs() !== null) return;
      }
    } catch (_) { /* defensive: fall through to legacy banner behavior */ }

    const snoozedUntil = localStorage.getItem("portfolioBackupSnoozedUntil");
    if (snoozedUntil && Date.now() < Number(snoozedUntil)) return; // Still snoozed

    const lastExport = localStorage.getItem("portfolioLastExport");
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    // Show banner if: never exported OR last export was more than 7 days ago
    if (!lastExport || Date.now() - Number(lastExport) > sevenDays) {
      showBackupBanner();
    }
  }

  function showBackupBanner() {
    if (document.getElementById("backupBanner")) return; // Already showing

    const banner = document.createElement("div");
    banner.id = "backupBanner";
    banner.setAttribute("role", "alert");
    banner.setAttribute("aria-live", "polite");
    banner.className = "backup-banner backup-reminder-banner";

    const msg = document.createElement("span");
    msg.className = "backup-banner-message";
    // D-25: Enhanced copy communicates data-loss risk (touchpoint #2)
    msg.textContent = t("security.backup.body") || t("backup.banner.message");

    const actions = document.createElement("div");
    actions.className = "backup-banner-actions";

    // "Back up now" button
    const exportBtn = document.createElement("button");
    exportBtn.className = "button backup-banner-export backup-reminder-btn backup-reminder-btn--primary";
    exportBtn.textContent = t("backup.banner.backupNow");
    exportBtn.addEventListener("click", async () => {
      try {
        const { blob, filename } = await BackupManager.exportBackup();
        BackupManager.triggerDownload(blob, filename);
        if (BackupManager.isAutoBackupActive()) {
          await BackupManager.autoSaveToFolder(blob, filename);
        }
        banner.remove();
      } catch (err) {
        console.error("Backup failed:", err);
      }
    });

    // "Postpone to tomorrow" button
    const tomorrowBtn = document.createElement("button");
    tomorrowBtn.className = "button ghost backup-banner-tomorrow backup-reminder-btn";
    tomorrowBtn.textContent = t("backup.banner.postponeTomorrow");
    tomorrowBtn.addEventListener("click", () => {
      localStorage.setItem("portfolioBackupSnoozedUntil", String(Date.now() + 24 * 60 * 60 * 1000));
      banner.remove();
    });

    // "Postpone 1 week" button
    const weekBtn = document.createElement("button");
    weekBtn.className = "button ghost backup-banner-week backup-reminder-btn";
    weekBtn.textContent = t("backup.banner.postponeWeek");
    weekBtn.addEventListener("click", () => {
      localStorage.setItem("portfolioBackupSnoozedUntil", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
      banner.remove();
    });

    // X close button (no snooze — hides for this page load only)
    const closeBtn = document.createElement("button");
    closeBtn.className = "backup-banner-close backup-reminder-btn--close";
    closeBtn.setAttribute("aria-label", "Close backup reminder");
    closeBtn.textContent = "\u2715";
    closeBtn.addEventListener("click", () => {
      banner.remove(); // No localStorage change — banner reappears next page load if still overdue
    });

    actions.append(exportBtn, tomorrowBtn, weekBtn, closeBtn);
    banner.append(msg, actions);

    // Insert at the very top of <body> so it sits above everything
    document.body.prepend(banner);
  }

  // ---------------------------------------------------------------------------
  // Security guidance (multiple touchpoints)
  // ---------------------------------------------------------------------------

  /**
   * Show security guidance note after activation.
   * Re-appears weekly (every 7 days) after dismissal.
   */
  function showFirstLaunchSecurityNote() {
    var isActivated = localStorage.getItem('portfolioLicenseActivated') === '1';
    if (!isActivated) return;

    // Check if dismissed recently (within 7 days)
    var dismissedAt = localStorage.getItem('securityGuidanceDismissed');
    if (dismissedAt && dismissedAt !== '1') {
      var daysSince = (Date.now() - new Date(dismissedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    } else if (dismissedAt === '1') {
      // Legacy boolean value — treat as expired, show again
    }

    var container = document.getElementById('security-guidance-container');
    if (!container) return;

    container.innerHTML =
      '<div class="security-guidance-note">' +
      '<h3 data-i18n="security.note.heading">' + t('security.note.heading') + '</h3>' +
      '<p data-i18n="security.note.body">' + t('security.note.body') + '</p>' +
      '<button class="security-guidance-dismiss" id="security-guidance-dismiss" data-i18n="security.note.dismiss">' + t('security.note.dismiss') + '</button>' +
      '</div>';

    document.getElementById('security-guidance-dismiss').addEventListener('click', function() {
      localStorage.setItem('securityGuidanceDismissed', new Date().toISOString());
      container.innerHTML = '';
    });
  }

  /**
   * Phase 40 Plan 04 (ONBD-03 / D-05 / D-08) — eligibility gate for the
   * security note as a GOVERNED coordinator surface. Returns the existing
   * showFirstLaunchSecurityNote() gates as a boolean (return-false-early rather
   * than rendering) so an ineligible winner never consumes the one-per-session
   * slot:
   *   - false when the Overview-only #security-guidance-container is absent
   *     (D-08 — so the security note never claims the session slot on a page
   *     that could not render it, e.g. add-session);
   *   - false when the license is not activated;
   *   - false when securityGuidanceDismissed is a timestamp within the last
   *     7 days (mirrors the renderer's daysSince<7 logic; the legacy '1' value
   *     counts as expired → eligible).
   * show() calls the EXISTING renderer unchanged (same copy, cadence, container,
   * dismissal write — D-05).
   */
  function securityNoteEligible() {
    // D-08 — an unrenderable winner never consumes the session slot.
    if (!document.getElementById('security-guidance-container')) return false;
    if (localStorage.getItem('portfolioLicenseActivated') !== '1') return false;
    var dismissedAt = localStorage.getItem('securityGuidanceDismissed');
    if (dismissedAt && dismissedAt !== '1') {
      var daysSince = (Date.now() - new Date(dismissedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return false;
    }
    return true;
  }

  /**
   * Phase 40 Plan 04 (ONBD-03) — the initCommon seam that replaces the former
   * unconditional showFirstLaunchSecurityNote() call. Registers the security
   * note as a governed surface (so it participates in arbitration) then runs the
   * coordinator once. Guarded by a typeof check so demo.html and any page that
   * does not load attention-coordinator.js never throws (Pitfall 7). The backup
   * reminder banner and footer integrity nudge stay INDEPENDENT (D-04) — they are
   * NOT routed through the coordinator.
   */
  function bootAttentionSurfaces() {
    if (typeof AttentionCoordinator === 'undefined') return;
    // Register BEFORE run() so the security note participates in arbitration.
    AttentionCoordinator.register({
      id: 'security-note',
      eligible: securityNoteEligible,
      show: showFirstLaunchSecurityNote,
    });
    AttentionCoordinator.run();
  }

  /**
   * Apply i18n translations to the persistent privacy section.
   * Always visible, never dismissable.
   */
  function initPersistentSecuritySection() {
    var headingEl = document.getElementById('security-persistent-heading');
    var bodyEl = document.getElementById('security-persistent-body');
    if (headingEl) headingEl.textContent = t('security.persistent.heading');
    if (bodyEl) bodyEl.textContent = t('security.persistent.body');
  }

  // ---------------------------------------------------------------------------
  // Shared form helpers (extracted Phase 16)
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Phase 37 Plan 07 — session-type resolver (F4)
  //
  // The session-type list persists as ONE localStorage key
  // `portfolioSessionTypes` = { overrides: { <lockedKey>: "<label>" },
  // custom: [ { key, label } ] } — localStorage, NOT IndexedDB (D-17; the IDB
  // path does not round-trip through backup restore — 37-PATTERNS.md A2
  // CORRECTED). Backup persists this key via Plan 05.
  //
  // formatSessionType reads the key SYNCHRONOUSLY on each call (no async cache,
  // no first-paint race): override label (D-16) → custom label → i18n default
  // → RAW String(key) fallback for unknown/deleted keys (D-18). The 3 legacy
  // keys clinic/online/other resolve forever via DEFAULT_TYPE_I18N (D-14).
  // ---------------------------------------------------------------------------

  // The 5 locked default session types in fixed render order (D-13).
  const SESSION_TYPE_ORDER = ["clinic", "online", "remote", "proxy", "other"];
  // Locked default key → its session.type.* i18n key.
  const DEFAULT_TYPE_I18N = {
    clinic: "session.type.clinic",
    online: "session.type.online",
    remote: "session.type.remote",
    proxy: "session.type.proxy",
    other: "session.type.other",
  };

  /**
   * Read localStorage['portfolioSessionTypes'] behind try/catch and return a
   * normalized `{ overrides: {...}, custom: [...] }`. A missing/corrupt key
   * yields empty overrides + empty custom. No IDB, no module-level cache, no
   * async — mirrors the portfolioDateFormat scalar read pattern.
   * @returns {{overrides: Object, custom: Array}}
   */
  function _readSessionTypes() {
    const fallback = { overrides: {}, custom: [] };
    try {
      const raw = localStorage.getItem("portfolioSessionTypes");
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return fallback;
      return {
        overrides: (parsed.overrides && typeof parsed.overrides === "object") ? parsed.overrides : {},
        custom: Array.isArray(parsed.custom) ? parsed.custom : [],
      };
    } catch (_) {
      return fallback;
    }
  }

  /**
   * Format session type key to display string. Reads localStorage
   * synchronously: global override (D-16) → custom label → i18n default →
   * RAW key (D-18). Callers MUST render the result via .textContent / .value
   * (never innerHTML) — labels are stored verbatim (T-37-07-SEC).
   * @param {string} type - Session type key ('clinic', 'online', 'custom.NNN', …)
   * @returns {string} Resolved display label
   */
  function formatSessionType(type) {
    const key = String(type || "clinic");
    const data = _readSessionTypes();
    // D-16: a non-empty global override wins app-wide.
    const override = data.overrides[key];
    if (typeof override === "string" && override.trim().length > 0) {
      return override;
    }
    // A custom entry resolves to its stored label.
    for (let i = 0; i < data.custom.length; i++) {
      const entry = data.custom[i];
      if (entry && entry.key === key) {
        return entry.label != null ? String(entry.label) : key;
      }
    }
    // A known default resolves to its i18n string (legacy keys resolve forever).
    if (Object.prototype.hasOwnProperty.call(DEFAULT_TYPE_I18N, key)) {
      return t(DEFAULT_TYPE_I18N[key]);
    }
    // D-18: unknown/deleted key → raw string (no crash, no "session.type." prefix).
    return key;
  }

  /**
   * App.getSessionTypes — freshly-read ordered list on each call (5 defaults
   * with resolved labels + custom), mirroring App.getSnippets. Reads
   * localStorage synchronously; no cache.
   * @returns {Array<{key: string, label: string, locked: boolean}>}
   */
  function getSessionTypes() {
    const data = _readSessionTypes();
    const list = SESSION_TYPE_ORDER.map(function (key) {
      return { key: key, label: formatSessionType(key), locked: true };
    });
    data.custom.forEach(function (entry) {
      if (entry && entry.key) {
        list.push({ key: entry.key, label: entry.label != null ? String(entry.label) : entry.key, locked: false });
      }
    });
    return list;
  }

  // The legacy "Other" session-type key that a deleted custom type reassigns to
  // (D-14 — a permanent locked default that resolves via DEFAULT_TYPE_I18N).
  const REASSIGN_FALLBACK_KEY = "other";

  /**
   * Count stored sessions whose sessionType equals `key`. Used by the
   * session-type editor's delete guard to warn before deleting an in-use custom
   * type (Finding #1). Reads IndexedDB (the editor IIFE deliberately holds NO
   * direct IDB access, so the data read goes through App).
   * @param {string} key - session-type key to count (e.g. 'custom.1720000000000')
   * @returns {Promise<number>} how many stored sessions currently use that key
   */
  async function countSessionsByType(key) {
    if (!window.PortfolioDB || typeof window.PortfolioDB.getAllSessions !== "function") return 0;
    let sessions;
    try {
      sessions = await window.PortfolioDB.getAllSessions();
    } catch (_) {
      return 0;
    }
    if (!Array.isArray(sessions)) return 0;
    let count = 0;
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i] && sessions[i].sessionType === key) count += 1;
    }
    return count;
  }

  /**
   * Reassign every stored session's sessionType from `fromKey` to `toKey` and
   * persist each changed record (Finding #1). Called by the editor ONLY on
   * explicit user confirm — never silently — so a deleted custom type's past
   * sessions resolve to a real label ("Other") instead of the raw
   * `custom.<epoch>` key. Returns the number of sessions reassigned.
   * @param {string} fromKey - the session-type key being removed
   * @param {string} [toKey] - the reassignment target (defaults to the legacy 'other')
   * @returns {Promise<number>} how many session records were reassigned + persisted
   */
  async function reassignSessionType(fromKey, toKey) {
    const target = toKey || REASSIGN_FALLBACK_KEY;
    if (!window.PortfolioDB ||
        typeof window.PortfolioDB.getAllSessions !== "function" ||
        typeof window.PortfolioDB.updateSession !== "function") {
      return 0;
    }
    let sessions;
    try {
      sessions = await window.PortfolioDB.getAllSessions();
    } catch (_) {
      return 0;
    }
    if (!Array.isArray(sessions)) return 0;
    let count = 0;
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      if (session && session.sessionType === fromKey) {
        session.sessionType = target;
        await window.PortfolioDB.updateSession(session);
        count += 1;
      }
    }
    return count;
  }

  /**
   * Set a submit button's label via i18n key.
   * @param {string} key - i18n key for the label
   * @param {HTMLElement} submitButton - The button element to update
   * @param {HTMLElement} [submitLabel] - Optional separate label element (updated instead of button if provided)
   */
  function setSubmitLabel(key, submitButton, submitLabel) {
    if (!submitButton) return;
    var el = submitLabel || submitButton;
    el.setAttribute("data-i18n", key);
    el.textContent = t(key);
  }

  /**
   * Read a File object as a base64 data URL string.
   * @param {File} file - File to read
   * @returns {Promise<string>} Base64 data URL
   */
  function readFileAsDataURL(file) {
    return new Promise(function(resolve, reject) {
      const reader = new FileReader();
      reader.onload = function() { resolve(reader.result); };
      reader.onerror = function() { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------------------------
  // Modal scroll lock — prevents body scroll behind open modals (iOS Safari)
  // ---------------------------------------------------------------------------

  /**
   * Lock body scroll when a modal opens. Saves scroll position and applies
   * the .is-modal-open class which uses position:fixed to prevent background scroll.
   */
  function lockBodyScroll() {
    var scrollY = window.scrollY;
    document.body.style.top = "-" + scrollY + "px";
    document.body.classList.add("is-modal-open");
    document.body.dataset.scrollY = scrollY;
  }

  /**
   * Unlock body scroll when a modal closes. Restores the saved scroll position.
   */
  function unlockBodyScroll() {
    document.body.classList.remove("is-modal-open");
    document.body.style.top = "";
    window.scrollTo(0, parseInt(document.body.dataset.scrollY || "0"));
  }

  return {
    // i18n
    t,
    applyTranslations,
    setLanguage,
    getLanguage: function() { return currentLang; },

    // Navigation and chrome
    initCommon,
    renderNav,
    initThemeToggle,
    applyTheme,
    // Phase 39 (HELP-01/02) — test seam for tests/39-help-entry.test.js. Still
    // called internally from initCommon; exposing the reference lets the jsdom
    // mount/idempotency/popover test drive it directly without the full boot.
    initHelpEntry,
    initLicenseLink,
    redirectDemoBrandLink: redirectDemoBrandLink,
    mountBackupCloudButton: mountBackupCloudButton,
    updateBackupCloudState: updateBackupCloudState,
    // Phase 25 Plan 04 Task 3 — test seams for the D-15/D-19 behavior gate
    // (tests/25-04-banner-suppression.test.js). No in-browser behavior
    // change; the functions are still called internally as before.
    checkBackupReminder: checkBackupReminder,
    showBackupBanner: showBackupBanner,

    // UI utilities
    showToast,
    confirmDialog,

    // Modal scroll lock
    lockBodyScroll,
    unlockBodyScroll,

    // Data formatting and export
    formatDate,
    createSeverityScale,
    getSeverityValue,
    exportData,
    downloadJSON,

    // Shared form helpers
    formatSessionType,
    getSessionTypes,
    countSessionsByType,
    reassignSessionType,
    setSubmitLabel,
    readFileAsDataURL,

    // Security guidance
    showFirstLaunchSecurityNote,
    initPersistentSecuritySection,
    // Phase 40 Plan 04 (ONBD-03) — test seam for tests/40-app-wiring.test.js.
    // Still called internally from initCommon; exposing it lets the jsdom wiring
    // test drive the register+run() path (and inspect the security-note
    // eligible() gate) without the full async boot.
    bootAttentionSurfaces,

    // Phase 22 — therapist settings cache getters
    getSectionLabel,
    isSectionEnabled,

    // Phase 24 Plan 04 — snippet cache
    getSnippets,
    refreshSnippetCache,
  };
})();

// ---------------------------------------------------------------------------
// Phase 22 Plan 12 (Gap B, D3) — App.installNavGuard
//
// Defined via post-IIFE namespace augmentation. Placed AFTER the IIFE that
// builds App so it does not need to live inside the return object. By the
// time this helper is invoked at runtime, App.confirmDialog (which it calls)
// is already attached to the namespace.
// ---------------------------------------------------------------------------

/**
 * App.installNavGuard — register a click-time confirm guard on a navigation trigger.
 *
 * Intercepts clicks on the trigger; if the caller-provided `isDirty()` returns truthy,
 * shows an App.confirmDialog with the supplied i18n keys. On confirm, sets
 * window.PortfolioFormDirtyBypass=true (so beforeunload listeners that honour the flag
 * skip their prompt), runs the optional onConfirm hook, and navigates to `destination`.
 * On cancel, suppresses the navigation. When isDirty() is falsy, the guard is a no-op
 * and default navigation proceeds.
 *
 * Returns an unregister function that detaches the listener — useful when the trigger
 * element may be replaced or destroyed.
 *
 * NOTE: `onConfirm` is invoked synchronously; the helper does not await its return
 * value. Future callers needing an async onConfirm pattern (e.g. "save before
 * leaving") must gate the navigation themselves — i.e. perform the async work in
 * their own click handler before triggering navigation, OR fork the helper. The
 * synchronous-onConfirm contract is intentional and locked at v1.
 *
 * Public API (locked — future call sites depend on this shape):
 *   App.installNavGuard({
 *     trigger:     HTMLElement | string (CSS selector resolved at call time),
 *     isDirty:     () => boolean,                      // caller-provided dirty-state predicate
 *     message: {                                       // i18n keys for the confirm dialog
 *       titleKey, bodyKey, confirmKey, cancelKey,
 *       tone?: 'danger' | 'neutral'                    // defaults to 'danger'
 *     },
 *     destination: string | () => string,              // URL to navigate to on confirm; falls back to trigger.href if a string is unspecified
 *     onConfirm?:  () => void,                         // optional pre-nav SYNCHRONOUS side-effect (e.g. setFormSaving); see NOTE above re: async
 *   }) => (() => void)                                  // unregister fn
 */
App.installNavGuard = function (opts) {
  var trigger = (typeof opts.trigger === 'string') ? document.querySelector(opts.trigger) : opts.trigger;
  if (!trigger) return function () {};
  var msg = opts.message || {};
  var tone = msg.tone || 'danger';
  var resolveDestination = function () {
    if (typeof opts.destination === 'function') return opts.destination();
    if (typeof opts.destination === 'string') return opts.destination;
    return trigger.href || '';
  };
  var onClick = async function (e) {
    var dirty = false;
    try { dirty = !!(opts.isDirty && opts.isDirty()); } catch (_e) { dirty = false; }
    if (!dirty) return; // clean state — let default navigation proceed
    e.preventDefault();
    var ok = false;
    try {
      ok = await App.confirmDialog({
        titleKey:   msg.titleKey,
        messageKey: msg.bodyKey,
        confirmKey: msg.confirmKey,
        cancelKey:  msg.cancelKey,
        tone:       tone
      });
    } catch (_e) { ok = false; }
    if (!ok) return; // user chose to stay
    window.PortfolioFormDirtyBypass = true;
    if (typeof opts.onConfirm === 'function') {
      try { opts.onConfirm(); } catch (_e) { /* swallow — guard is best-effort */ }
    }
    var url = resolveDestination();
    if (url) window.location.href = url;
  };
  trigger.addEventListener('click', onClick);
  return function unregister() {
    trigger.removeEventListener('click', onClick);
  };
};
