window.App = (() => {
  let currentLang = window.I18N_DEFAULT || "en";

  function t(key) {
    const dict = window.I18N || {};
    return (dict[currentLang] && dict[currentLang][key]) || (dict.en && dict.en[key]) || key;
  }

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

  function setLanguage(lang) {
    if (!window.I18N || !window.I18N[lang]) {
      currentLang = window.I18N_DEFAULT || "en";
    } else {
      currentLang = lang;
    }
    localStorage.setItem("portfolioLang", currentLang);
    document.documentElement.lang = currentLang;
    document.body.setAttribute("dir", currentLang === "he" ? "rtl" : "ltr");
    applyTranslations();
    document.dispatchEvent(new CustomEvent("app:language", { detail: { lang: currentLang } }));
  }

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

  function initThemeToggle() {
    // Stub — full implementation in Plan 02
    // Creates and mounts the toggle button now so HTML structure is ready
    const actions = document.querySelector('.header-actions');
    if (!actions) return;
    const btn = document.createElement('button');
    btn.className = 'button ghost theme-toggle';
    btn.setAttribute('aria-label', 'Toggle dark mode');
    const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
    const updateIcon = () => { btn.textContent = isDark() ? '\u2600\ufe0f' : '\uD83C\uDF19'; };
    updateIcon();
    btn.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      if (next === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      localStorage.setItem('portfolioTheme', next);
      updateIcon();
    });
    actions.prepend(btn);
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

  function initCommon() {
    initDemoMode();
    renderNav();
    initThemeToggle();
    const savedLang = localStorage.getItem("portfolioLang") || window.I18N_DEFAULT || "en";
    const select = document.getElementById("languageSelect");
    setLanguage(savedLang);
    if (select) {
      select.value = savedLang;
      select.addEventListener("change", () => setLanguage(select.value));
    }
    checkBackupReminder();
    requestPersistentStorage();

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

  function showToast(message, key) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = key ? t(key) : message;
    toast.classList.add("is-visible");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
  }

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
      setTimeout(() => {
        if (confirmBtn) confirmBtn.focus();
      }, 0);
    });
  }

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

  function getSeverityValue(wrapper) {
    if (!wrapper) return null;
    const value = wrapper.dataset.value;
    if (value === "" || value === undefined) return null;
    return Number.parseInt(value, 10);
  }

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
    banner.className = "backup-banner";

    // Inline styles as fallback — tokens.css may not be loaded yet at this point,
    // but by Task 2 in plan 01-01 tokens.css IS loaded first, so var() calls work.
    banner.style.cssText = [
      "display:flex",
      "align-items:center",
      "justify-content:space-between",
      "flex-wrap:wrap",
      "gap:8px",
      "padding:10px 16px",
      "background:var(--color-primary-soft,#c8e6d4)",
      "border-bottom:1px solid var(--color-border,rgba(45,106,79,0.2))",
      "font-family:Rubik,system-ui,sans-serif",
      "font-size:14px",
      "color:var(--color-text,#2f2d38)",
    ].join(";");

    const msg = document.createElement("span");
    msg.className = "backup-banner-message";
    msg.textContent = "It has been a while — consider backing up your data.";

    const actions = document.createElement("div");
    actions.className = "backup-banner-actions";
    actions.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;";

    // "Back up now" button
    const exportBtn = document.createElement("button");
    exportBtn.className = "button backup-banner-export";
    exportBtn.textContent = "Back up now";
    exportBtn.style.cssText = "background:var(--color-primary,#2d6a4f);color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-weight:600;font-size:13px;";
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
    tomorrowBtn.className = "button ghost backup-banner-tomorrow";
    tomorrowBtn.textContent = "Postpone to tomorrow";
    tomorrowBtn.style.cssText = "background:transparent;color:var(--color-text,#2f2d38);border:1px solid var(--color-border,rgba(45,106,79,0.2));border-radius:8px;padding:6px 14px;cursor:pointer;font-size:13px;";
    tomorrowBtn.addEventListener("click", () => {
      localStorage.setItem("portfolioBackupSnoozedUntil", String(Date.now() + 24 * 60 * 60 * 1000));
      banner.remove();
    });

    // "Postpone 1 week" button
    const weekBtn = document.createElement("button");
    weekBtn.className = "button ghost backup-banner-week";
    weekBtn.textContent = "Postpone 1 week";
    weekBtn.style.cssText = "background:transparent;color:var(--color-text,#2f2d38);border:1px solid var(--color-border,rgba(45,106,79,0.2));border-radius:8px;padding:6px 14px;cursor:pointer;font-size:13px;";
    weekBtn.addEventListener("click", () => {
      localStorage.setItem("portfolioBackupSnoozedUntil", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
      banner.remove();
    });

    // X close button (no snooze — hides for this page load only)
    const closeBtn = document.createElement("button");
    closeBtn.className = "backup-banner-close";
    closeBtn.setAttribute("aria-label", "Close backup reminder");
    closeBtn.textContent = "\u2715";
    closeBtn.style.cssText = "background:none;border:none;cursor:pointer;font-size:16px;color:var(--color-text-muted,#5f5c72);padding:0 4px;";
    closeBtn.addEventListener("click", () => {
      banner.remove(); // No localStorage change — banner reappears next page load if still overdue
    });

    actions.append(exportBtn, tomorrowBtn, weekBtn, closeBtn);
    banner.append(msg, actions);

    // Insert at the very top of <body> so it sits above everything
    document.body.prepend(banner);
  }

  return {
    t,
    applyTranslations,
    setLanguage,
    initCommon,
    renderNav,
    initThemeToggle,
    showToast,
    confirmDialog,
    formatDate,
    createSeverityScale,
    getSeverityValue,
    exportData,
    downloadJSON,
  };
})();
