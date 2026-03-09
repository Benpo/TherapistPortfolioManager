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

  function initCommon() {
    const savedLang = localStorage.getItem("portfolioLang") || window.I18N_DEFAULT || "en";
    const select = document.getElementById("languageSelect");
    setLanguage(savedLang);
    if (select) {
      select.value = savedLang;
      select.addEventListener("change", () => setLanguage(select.value));
    }

    const navKey = document.body.dataset.nav;
    if (navKey) {
      document.querySelectorAll(".app-nav a").forEach((link) => {
        link.classList.toggle("active", link.dataset.nav === navKey);
      });
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

  return {
    t,
    applyTranslations,
    setLanguage,
    initCommon,
    showToast,
    confirmDialog,
    formatDate,
    createSeverityScale,
    getSeverityValue
  };
})();
