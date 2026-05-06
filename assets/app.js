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
    <nav class="app-nav">
      <a href="./index.html" data-nav="overview" data-i18n="nav.overview">Overview</a>
      <a href="./sessions.html" data-nav="sessions" data-i18n="nav.sessions">Sessions</a>
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
      if (next === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
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
  }

  /**
   * Prepend the license key icon link to .header-actions.
   * Links to ./license.html with an SVG key icon.
   */
  function initLicenseLink() {
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
   * Initialize page: render nav, apply translations, set up theme toggle, license link, backup
   * reminder, and persistent storage request. Call this in DOMContentLoaded on every app page.
   *
   * Phase 22: now async because therapist settings are eager-loaded from IndexedDB
   * BEFORE setLanguage runs, so getSectionLabel returns user-customized labels on
   * first render. Existing callers that don't await will still work — the rest of
   * initCommon's synchronous chrome wiring continues, only the cache load is async.
   */
  async function initCommon() {
    initDemoMode();
    renderNav();
    initThemeToggle();
    initLanguagePopover();
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

    // Phase 22: cross-tab sync via BroadcastChannel.
    // When another tab updates therapistSettings, refresh the cache and
    // dispatch app:settings-changed so the current page can re-render labels.
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const ch = new BroadcastChannel("sessions-garden-settings");
        ch.addEventListener("message", async (e) => {
          if (e && e.data && e.data.type === "therapist-settings-changed") {
            try {
              const rows = await PortfolioDB.getAllTherapistSettings();
              _sectionLabelCache = new Map(rows.map(r => [r.sectionKey, r]));
              document.dispatchEvent(new CustomEvent("app:settings-changed"));
            } catch (err) {
              console.warn("BroadcastChannel refresh failed:", err);
            }
          }
        });
      } catch (err) {
        console.warn("BroadcastChannel unavailable:", err);
      }
    }

    const savedLang = localStorage.getItem("portfolioLang") || window.I18N_DEFAULT || "en";
    setLanguage(savedLang);
    checkBackupReminder();
    requestPersistentStorage();
    showFirstLaunchSecurityNote();
    initPersistentSecuritySection();
    // Render shared footer
    if (typeof SharedChrome !== 'undefined' && SharedChrome.renderFooter) {
      SharedChrome.renderFooter();
    }

    // Auto-reload when a new service worker takes control (ensures fresh assets)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    }

    // Load demo hints when inside an iframe (demo context)
    if (window !== window.top) {
      var s = document.createElement('script');
      s.src = './assets/demo-hints.js';
      document.body.appendChild(s);
    }
  }

  // ---------------------------------------------------------------------------
  // UI utilities
  // ---------------------------------------------------------------------------

  /**
   * Show a temporary toast notification that auto-dismisses after ~1.8 seconds.
   * @param {string} message - Text to display (used if key is not provided)
   * @param {string} [key] - i18n key to look up instead of using message directly
   */
  function showToast(message, key) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = key ? t(key) : message;
    toast.classList.add("is-visible");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
  }

  /**
   * Show a modal confirmation dialog with OK/Cancel buttons.
   * @param {Object} options - Dialog configuration
   * @param {string} options.titleKey - i18n key for dialog title
   * @param {string} options.messageKey - i18n key for dialog message
   * @param {string} [options.confirmKey='confirm.delete'] - i18n key for confirm button
   * @param {string} [options.cancelKey='confirm.cancel'] - i18n key for cancel button
   * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
   */
  function confirmDialog({ titleKey, messageKey, confirmKey = "confirm.delete", cancelKey = "confirm.cancel" }) {
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

    return new Promise((resolve) => {
      const close = (result) => {
        modal.classList.add("is-hidden");
        unlockBodyScroll();
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
   * @param {string} dateString - ISO date string (e.g., '2024-03-15')
   * @returns {string} Formatted date (e.g., 'Mar 15, 2024'), or empty string if falsy
   */
  function formatDate(dateString) {
    if (!dateString) return "";
    const locale = currentLang === "he" ? "he-IL" : "en-US";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(date);
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
    a.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

  /**
   * Format session type key to translated display string.
   * @param {string} type - Session type ('clinic', 'online', 'other')
   * @returns {string} Translated type label
   */
  function formatSessionType(type) {
    const key = 'session.type.' + (type || 'clinic');
    return t(key);
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
  // Birth Date Picker — three-dropdown (Year / Month / Day) replacement
  // for native <input type="date"> (POLISH-01)
  // ---------------------------------------------------------------------------

  /**
   * Initialize a three-dropdown birth date picker (Year / Month / Day).
   * Replaces native date input with localized dropdowns.
   * @param {string} containerId - ID of the container div for the dropdowns
   * @param {string} hiddenInputId - ID of the hidden input that stores YYYY-MM-DD value
   * @returns {{ setValue: function, clear: function }|null} Picker API or null if elements not found
   */
  function initBirthDatePicker(containerId, hiddenInputId) {
    var container = document.getElementById(containerId);
    var hidden = document.getElementById(hiddenInputId);
    if (!container || !hidden) return null;

    var lang = localStorage.getItem('portfolioLang') || 'en';
    var currentYear = new Date().getFullYear();

    // Year select: current year down to 1920
    var yearSel = document.createElement('select');
    yearSel.className = 'input birth-date-year';
    yearSel.innerHTML = '<option value="">\u2014</option>';
    for (var y = currentYear; y >= 1920; y--) {
      yearSel.innerHTML += '<option value="' + y + '">' + y + '</option>';
    }

    // Month select: localized month names via Intl API
    var monthSel = document.createElement('select');
    monthSel.className = 'input birth-date-month';
    monthSel.innerHTML = '<option value="">\u2014</option>';
    for (var m = 0; m < 12; m++) {
      var mName = new Intl.DateTimeFormat(lang, { month: 'long' }).format(new Date(2000, m, 1));
      monthSel.innerHTML += '<option value="' + m + '">' + mName + '</option>';
    }

    // Day select: populated dynamically based on year/month
    var daySel = document.createElement('select');
    daySel.className = 'input birth-date-day';
    daySel.innerHTML = '<option value="">\u2014</option>';

    function updateDays() {
      var y = parseInt(yearSel.value, 10);
      var m = parseInt(monthSel.value, 10);
      var oldDay = daySel.value;
      daySel.innerHTML = '<option value="">\u2014</option>';
      if (isNaN(y) || isNaN(m)) return;
      var maxDay = new Date(y, m + 1, 0).getDate();
      for (var d = 1; d <= maxDay; d++) {
        daySel.innerHTML += '<option value="' + d + '">' + d + '</option>';
      }
      if (parseInt(oldDay, 10) <= maxDay) daySel.value = oldDay;
    }

    function syncHidden() {
      var y = yearSel.value;
      var m = monthSel.value;
      var d = daySel.value;
      if (!y) { hidden.value = ''; return; }
      if (m === '') d = '';
      var mm = (m !== '') ? String(parseInt(m, 10) + 1).padStart(2, '0') : '01';
      var dd = d ? String(parseInt(d, 10)).padStart(2, '0') : '01';
      hidden.value = y + '-' + mm + '-' + dd;
    }

    yearSel.addEventListener('change', function() { updateDays(); syncHidden(); });
    monthSel.addEventListener('change', function() { updateDays(); syncHidden(); });
    daySel.addEventListener('change', syncHidden);

    function updateMonthNames(newLang) {
      var selectedMonth = monthSel.value;
      monthSel.innerHTML = '<option value="">\u2014</option>';
      for (var m = 0; m < 12; m++) {
        var mName = new Intl.DateTimeFormat(newLang, { month: 'long' }).format(new Date(2000, m, 1));
        monthSel.innerHTML += '<option value="' + m + '">' + mName + '</option>';
      }
      if (selectedMonth !== '') monthSel.value = selectedMonth;
    }

    document.addEventListener('app:language', function(e) {
      if (e.detail && e.detail.lang) updateMonthNames(e.detail.lang);
    });

    container.appendChild(yearSel);
    container.appendChild(monthSel);
    container.appendChild(daySel);

    // Mobile: show native date input instead of dropdown picker
    var mobileDate = window.matchMedia("(max-width: 768px)");
    if (mobileDate.matches) {
      var nativeDateInput = document.createElement("input");
      nativeDateInput.type = "date";
      nativeDateInput.className = "input";
      nativeDateInput.id = "birthDateNative";
      if (hidden.value) {
        nativeDateInput.value = hidden.value;
      }
      nativeDateInput.addEventListener("change", function() {
        hidden.value = nativeDateInput.value;
      });
      // Hide dropdowns, show native
      yearSel.style.display = "none";
      monthSel.style.display = "none";
      daySel.style.display = "none";
      container.appendChild(nativeDateInput);
    }

    return {
      setValue: function(isoDate) {
        if (!isoDate) { yearSel.value = ''; monthSel.value = ''; daySel.value = ''; hidden.value = ''; if (container.querySelector('#birthDateNative')) container.querySelector('#birthDateNative').value = ''; return; }
        var parts = isoDate.split('-');
        yearSel.value = parts[0];
        monthSel.value = String(parseInt(parts[1], 10) - 1);
        updateDays();
        daySel.value = String(parseInt(parts[2], 10));
        syncHidden();
        if (container.querySelector('#birthDateNative')) container.querySelector('#birthDateNative').value = isoDate;
      },
      clear: function() {
        yearSel.value = ''; monthSel.value = ''; daySel.value = ''; hidden.value = '';
        if (container.querySelector('#birthDateNative')) container.querySelector('#birthDateNative').value = '';
      }
    };
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
    initLicenseLink,

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
    setSubmitLabel,
    readFileAsDataURL,
    initBirthDatePicker,

    // Security guidance
    showFirstLaunchSecurityNote,
    initPersistentSecuritySection,

    // Phase 22 — therapist settings cache getters
    getSectionLabel,
    isSectionEnabled,
  };
})();
