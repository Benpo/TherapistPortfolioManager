// Module-level storage for search filtering
let _allClients = [];
let _sessionsByClient = new Map();

// Quick 260516-g7p Bug #4 — "missing birth year" warning is actionable:
// a module-level flag toggled by the banner's "Show them" control and
// honored inside applyFiltersAndSort()'s existing filter pipeline. The
// predicate below is the SINGLE source of truth shared by both the banner
// count (updateMissingBirthBanner) and the filter, so the filtered set is
// guaranteed to equal the warned count.
let _missingBirthFilterActive = false;

// Pure: a client is "missing birth info" when it has neither a birthDate
// nor an age. Reused verbatim by the banner count and the filter.
function clientMissingBirth(c) {
  return !c.birthDate && !c.age;
}

function setMissingBirthFilter(active) {
  _missingBirthFilterActive = !!active;
}

function clearMissingBirthFilter() {
  _missingBirthFilterActive = false;
}

// Quick 260516-g7p follow-up (UAT 2026-05-16): the banner's "Show them"
// button is only an affordance to ACTIVATE the filter. Once active, hide it —
// the filtered table already shows the result and the global "Clear Filters"
// control is the single, canonical place to undo it (a second in-banner
// "remove filter" would duplicate that control). The button reappears when
// the filter is cleared or the banner re-renders with the filter inactive.
function syncMissingBirthButton() {
  const btn = document.getElementById("missingBirthFilterBtn");
  if (btn) btn.classList.toggle("is-hidden", _missingBirthFilterActive);
}

function countMissingBirth(clients) {
  return (clients || []).filter(clientMissingBirth).length;
}

// Pure list filter used by the behavior test (and conceptually mirrors the
// one extra predicate added to applyFiltersAndSort): when the flag is
// active, keep only the missing-birth clients; otherwise keep all.
function filterByMissingBirth(clients) {
  if (!_missingBirthFilterActive) return (clients || []).slice();
  return (clients || []).filter(clientMissingBirth);
}

// Expose pure helpers for the falsifiable behavior test
// (tests/quick-260516-g7p-missing-birth-filter.test.js). DOM-free.
if (typeof window !== 'undefined') {
  window.__OverviewTestHooks = {
    clientMissingBirth,
    setMissingBirthFilter,
    clearMissingBirthFilter,
    countMissingBirth,
    filterByMissingBirth,
  };
}

// ===========================================================================
// Phase 25 round-5 post-UAT (Change 1 / UAT-D2, Ben 2026-05-15)
//
// The Backup & Restore modal markup + ALL its handlers (export / import /
// share / test-password / close / Esc / ?openBackup=1) + the public surface
// (window.openBackupModal / renderLastBackupSubtitle / openExportFlow /
// closeBackupModal / formatRelativeTime) now live in the page-agnostic
// assets/backup-modal.js, loaded on EVERY app page so the header cloud icon
// opens the modal IN-PLACE wherever the user clicks it (it previously bounced
// to index.html?openBackup=1 on settings/add-client/add-session).
//
// overview.js only registers the post-restore refresh hook so an in-place
// restore re-renders the overview list without a full page reload (other
// pages reload via backup-modal.js's fallback).
// ===========================================================================
if (typeof window !== 'undefined') {
  window.__afterBackupRestore = function () {
    return Promise.resolve()
      .then(function () { return loadOverview(); })
      .then(function () {
        if (typeof window.renderLastBackupSubtitle === 'function') {
          window.renderLastBackupSubtitle();
        }
      });
  };
}

function getDailyQuote(lang) {
  const allQuotes = window.QUOTES || {};
  const langQuotes = allQuotes[lang] || allQuotes["en"] || [];
  if (!langQuotes.length) return { text: "", author: null };
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const selected = langQuotes[dayOfYear % langQuotes.length];
  // Handle both plain string (backward compat) and { text, author } object formats
  if (typeof selected === "string") return { text: selected, author: null };
  return { text: selected.text || "", author: selected.author || null };
}

function renderGreeting() {
  const greetingEl = document.getElementById("greeting-text");
  const quoteEl = document.getElementById("quote-text");
  if (!greetingEl || !quoteEl) return;

  const hour = new Date().getHours();
  const greetingKey = hour >= 5 && hour < 12
    ? "greeting.morning"
    : hour >= 12 && hour < 18
    ? "greeting.afternoon"
    : "greeting.evening";

  greetingEl.textContent = App.t(greetingKey);
  const quote = getDailyQuote(localStorage.getItem("portfolioLang") || "en");
  quoteEl.textContent = "\u201C" + quote.text + "\u201D";

  // Show or hide author attribution
  let authorEl = document.getElementById("quote-author");
  if (quote.author) {
    if (!authorEl) {
      authorEl = document.createElement("span");
      authorEl.id = "quote-author";
      authorEl.className = "quote-author";
      authorEl.style.cssText = "display:block;font-size:0.85em;opacity:0.7;margin-top:0.25rem;";
      quoteEl.parentNode.appendChild(authorEl);
    }
    authorEl.textContent = "\u2014 " + quote.author;
    authorEl.style.display = "block";
  } else if (authorEl) {
    authorEl.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (window.demoSeedReady) await window.demoSeedReady;
  await App.initCommon();
  renderGreeting();
  await loadOverview();

  const addClientBtn = document.getElementById("addClientBtn");
  const addSessionBtn = document.getElementById("addSessionBtn");

  if (addClientBtn) addClientBtn.addEventListener("click", () => (window.location.href = "./add-client.html"));
  if (addSessionBtn) addSessionBtn.addEventListener("click", () => (window.location.href = "./add-session.html"));

  // -----------------------------------------------------------------------
  // Phase 25 round-5 post-UAT (Change 1 / UAT-D2): the Backup & Restore
  // modal markup + ALL its handlers (?openBackup=1 auto-open, close/overlay,
  // export/share/import, the Test-password sub-card, Esc-to-close) are owned
  // by assets/backup-modal.js, loaded on every app page. overview.js no
  // longer wires them — backup-modal.js's bindBackupModal() runs on
  // DOMContentLoaded (and is idempotent via window.__backupModalWired). The
  // post-restore overview re-render is registered above as
  // window.__afterBackupRestore.
  // -----------------------------------------------------------------------

  setupModal();

  const clientSearchInput = document.getElementById("clientSearch");
  const clientTypeFilter = document.getElementById("clientTypeFilter");
  const clientHeartShieldFilter = document.getElementById("clientHeartShieldFilter");
  const clientYearFilter = document.getElementById("clientYearFilter");
  const clientSortSelect = document.getElementById("clientSortSelect");

  function applyFiltersAndSort() {
    const query = (clientSearchInput ? clientSearchInput.value : "").trim().toLowerCase();
    const typeVal = clientTypeFilter ? clientTypeFilter.value : "";
    const shieldVal = clientHeartShieldFilter ? clientHeartShieldFilter.value : "";
    const yearVal = clientYearFilter ? clientYearFilter.value : "";
    const sortVal = clientSortSelect ? clientSortSelect.value : "name";

    let filtered = _allClients.filter(c => {
      // Missing-birth-year filter (Bug #4) — uses the SAME predicate as the
      // banner count so the filtered set equals the warned count exactly.
      if (_missingBirthFilterActive && !clientMissingBirth(c)) return false;
      // Name search
      if (query && !getClientDisplayName(c).toLowerCase().includes(query)) return false;
      // Client type filter
      if (typeVal && c.type !== typeVal) return false;
      // Heart Shield filter
      if (shieldVal) {
        const sessions = _sessionsByClient.get(c.id) || [];
        const hasShield = sessions.some(s => s.isHeartShield);
        if (shieldVal === "heartShield" && !hasShield) return false;
        if (shieldVal === "regular" && hasShield) return false;
      }
      // Year filter
      if (yearVal) {
        const sessions = _sessionsByClient.get(c.id) || [];
        const hasSessionInYear = sessions.some(s => s.date && s.date.startsWith(yearVal));
        if (!hasSessionInYear) return false;
      }
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortVal === "lastSession") {
        const aSessions = _sessionsByClient.get(a.id) || [];
        const bSessions = _sessionsByClient.get(b.id) || [];
        const aLast = aSessions.length ? aSessions.reduce((max, s) => s.date > max ? s.date : max, "") : "";
        const bLast = bSessions.length ? bSessions.reduce((max, s) => s.date > max ? s.date : max, "") : "";
        return bLast.localeCompare(aLast); // most recent first
      }
      if (sortVal === "sessions") {
        const aCount = (_sessionsByClient.get(a.id) || []).length;
        const bCount = (_sessionsByClient.get(b.id) || []).length;
        return bCount - aCount; // most sessions first
      }
      return getClientDisplayName(a).localeCompare(getClientDisplayName(b), undefined, { sensitivity: "base" });
    });

    renderClientRows(filtered, _sessionsByClient);
  }

  const clearFiltersBtn = document.getElementById("clearFiltersBtn");

  function updateClearButton() {
    if (!clearFiltersBtn) return;
    const hasFilters = (clientSearchInput && clientSearchInput.value) ||
      (clientTypeFilter && clientTypeFilter.value) ||
      (clientHeartShieldFilter && clientHeartShieldFilter.value) ||
      (clientYearFilter && clientYearFilter.value) ||
      _missingBirthFilterActive ||
      (clientSortSelect && clientSortSelect.value !== "name");
    clearFiltersBtn.classList.toggle("is-hidden", !hasFilters);
  }

  function onFilterChange() {
    applyFiltersAndSort();
    updateClearButton();
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      if (clientSearchInput) clientSearchInput.value = "";
      if (clientTypeFilter) clientTypeFilter.value = "";
      if (clientHeartShieldFilter) clientHeartShieldFilter.value = "";
      if (clientYearFilter) clientYearFilter.value = "";
      if (clientSortSelect) clientSortSelect.value = "name";
      clearMissingBirthFilter();
      syncMissingBirthButton();
      applyFiltersAndSort();
      updateClearButton();
    });
  }

  // Bug #4 — the missing-birth banner's "Show them" control filters the
  // existing client table to exactly the clients with no birth year and
  // scrolls the list into view so the therapist immediately sees them.
  const missingBirthFilterBtn = document.getElementById("missingBirthFilterBtn");
  if (missingBirthFilterBtn) {
    missingBirthFilterBtn.addEventListener("click", () => {
      setMissingBirthFilter(true);
      syncMissingBirthButton();
      applyFiltersAndSort();
      updateClearButton();
      const tableBody = document.getElementById("clientTableBody");
      const section = tableBody ? tableBody.closest("section") : null;
      const scrollTarget = section || tableBody;
      if (scrollTarget && typeof scrollTarget.scrollIntoView === "function") {
        scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  [clientSearchInput, clientTypeFilter, clientHeartShieldFilter, clientYearFilter, clientSortSelect].forEach(el => {
    if (el) el.addEventListener(el.tagName === "INPUT" ? "input" : "change", onFilterChange);
  });

  document.addEventListener("app:language", async () => {
    renderGreeting();
    App.initPersistentSecuritySection();
    await loadOverview();
  });
});

async function loadOverview() {
  const clients = await PortfolioDB.getAllClients();
  const sessions = await PortfolioDB.getAllSessions();

  const statClients = document.getElementById("statClients");
  const statSessions = document.getElementById("statSessions");
  const statMonth = document.getElementById("statMonth");

  if (statClients) statClients.textContent = clients.length;
  if (statSessions) statSessions.textContent = sessions.length;
  if (statMonth) statMonth.textContent = countSessionsThisMonth(sessions);

  const sessionsByClient = new Map();
  sessions.forEach((session) => {
    const list = sessionsByClient.get(session.clientId) || [];
    list.push(session);
    sessionsByClient.set(session.clientId, list);
  });

  // Store at module level for search filtering
  _allClients = clients;
  _sessionsByClient = sessionsByClient;

  updateMissingBirthBanner(clients);

  // Clear search input on reload
  const searchInput = document.getElementById("clientSearch");
  if (searchInput) searchInput.value = "";

  // Populate year filter from session dates
  const yearSelect = document.getElementById("clientYearFilter");
  if (yearSelect) {
    const currentVal = yearSelect.value;
    const years = new Set();
    sessions.forEach(s => { if (s.date) years.add(s.date.substring(0, 4)); });
    const sortedYears = [...years].sort().reverse();
    yearSelect.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.setAttribute("data-i18n", "overview.filter.year.all");
    allOpt.textContent = App.t("overview.filter.year.all");
    yearSelect.appendChild(allOpt);
    sortedYears.forEach(y => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    });
    if (currentVal) yearSelect.value = currentVal;
  }

  renderClientRows(clients, sessionsByClient);
}

function updateMissingBirthBanner(clients) {
  const banner = document.getElementById("missingBirthBanner");
  const textEl = document.getElementById("missingBirthBannerText");
  if (!banner || !textEl) return;
  const missing = countMissingBirth(clients);
  if (missing === 0) {
    banner.classList.add("is-hidden");
    return;
  }
  const template = App.t("overview.missingBirth.notice");
  textEl.textContent = template.replace("{n}", String(missing));
  banner.classList.remove("is-hidden");
  // Keep the "Show them" button hidden if the filter is still active across a
  // banner re-render (e.g. language switch while filtered).
  syncMissingBirthButton();
}

function renderClientRows(clients, sessionsByClient) {
  const tableBody = document.getElementById("clientTableBody");
  const emptyState = document.getElementById("emptyState");
  if (!tableBody) return;
  tableBody.innerHTML = "";

  if (!clients.length) {
    if (emptyState) emptyState.style.display = "block";
    return;
  }
  if (emptyState) emptyState.style.display = "none";

  clients.forEach((client) => {
    const clientSessions = sessionsByClient.get(client.id) || [];
    // Phase 24 Plan 06 follow-up (UAT 2026-05-14): when two sessions share the
    // same date, the pure-string compare returns 0 and stable sort keeps IDB
    // insertion order — putting the oldest same-date session first. The clock-
    // icon expansion then renders them in the WRONG order (oldest-of-today on
    // top instead of bottom). Mirror the spotlight helper's comparator: date
    // desc, then createdAt desc, then id desc as final fallback.
    clientSessions.sort((a, b) => {
      const cmp = String(b.date || "").localeCompare(String(a.date || ""));
      if (cmp !== 0) return cmp;
      const ca = new Date(a.createdAt || 0).getTime();
      const cb = new Date(b.createdAt || 0).getTime();
      if (cb !== ca) return cb - ca;
      return (b.id || 0) - (a.id || 0);
    });

    const row = document.createElement("tr");
    row.className = "client-row";
    const lastSession = clientSessions[0]?.date ? App.formatDate(clientSessions[0].date) : "-";
    const displayName = getClientDisplayName(client);

    const nameCell = document.createElement("td");
    const nameButton = document.createElement("button");
    nameButton.type = "button";
    nameButton.className = "client-name";
    nameButton.appendChild(createClientAvatar({ ...client, name: displayName }));
    const nameText = document.createElement("span");
    nameText.textContent = displayName;
    nameButton.appendChild(nameText);
    const heartShieldSessions = clientSessions.filter(s => s.isHeartShield);
    if (heartShieldSessions.length > 0) {
      const allRemoved = heartShieldSessions.some(s => s.shieldRemoved === true);
      const heart = document.createElement("span");
      heart.className = "heart-badge";
      if (allRemoved) {
        heart.textContent = "✅";
        heart.title = App.t("overview.heartShield.removed");
        heart.classList.add("heart-badge-removed");
      } else {
        heart.textContent = "❤️";
        heart.title = App.t("overview.heartShield.active");
        heart.classList.add("heart-badge-active");
      }
      nameButton.appendChild(heart);
    }
    nameButton.addEventListener("click", () => openClientModal({ ...client, name: displayName }, clientSessions));
    nameCell.appendChild(nameButton);

    nameCell.setAttribute("data-label", App.t("overview.table.name"));
    const typeCell = document.createElement("td");
    typeCell.textContent = client.type ? App.t(`common.type.${client.type}`) : "-";
    typeCell.setAttribute("data-label", App.t("overview.table.type"));
    const sessionsCell = document.createElement("td");
    sessionsCell.textContent = clientSessions.length;
    sessionsCell.setAttribute("data-label", App.t("overview.table.sessions"));
    const lastSessionCell = document.createElement("td");
    lastSessionCell.textContent = lastSession;
    lastSessionCell.setAttribute("data-label", App.t("overview.table.lastSession"));
    const actionCell = document.createElement("td");
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "row-actions";
    const detailButton = document.createElement("button");
    detailButton.className = "row-toggle";
    detailButton.type = "button";
    detailButton.title = App.t("overview.table.previousSessions");
    detailButton.setAttribute("aria-label", App.t("overview.table.previousSessions"));
    detailButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    const quickAddButton = document.createElement("button");
    quickAddButton.className = "row-quick-add";
    quickAddButton.type = "button";
    quickAddButton.title = App.t("overview.table.newSession");
    quickAddButton.setAttribute("aria-label", App.t("overview.table.newSession"));
    quickAddButton.textContent = "+";
    quickAddButton.addEventListener("click", () => {
      window.location.href = `./add-session.html?clientId=${client.id}`;
    });
    actionsWrap.appendChild(detailButton);
    actionsWrap.appendChild(quickAddButton);
    actionCell.appendChild(actionsWrap);

    row.appendChild(nameCell);
    row.appendChild(typeCell);
    row.appendChild(sessionsCell);
    row.appendChild(lastSessionCell);
    row.appendChild(actionCell);

    const detailRow = document.createElement("tr");
    detailRow.className = "detail-row";
    const detailCell = document.createElement("td");
    detailCell.colSpan = 4;

    if (!clientSessions.length) {
      detailCell.innerHTML = `<div class="helper-text">${App.t("overview.sessions.none")}</div>`;
    } else {
      const list = document.createElement("div");
      list.className = "session-list";
      clientSessions.forEach((session) => {
        const item = document.createElement("div");
        item.className = "session-item";
        // D-25 (Phase 24): severity render verified before→after. TODO 2026-05-13 reported
        //   a reversal that is not reproducible — render has been correct since 2026-03-09
        //   (commit bb5e2130). Hebrew RTL bidi may visually flip the parenthesized arrow;
        //   logical data order is fixed.
        // Plan 06 follow-up (UAT 2026-05-14): guard null/undefined severity values
        //   so they render as "-" instead of the JS string "null". Mirrors the
        //   sessions.js convention so both pages agree.
        const issues = (session.issues || [])
          .map((issue) => {
            const name = issue.name || "-";
            const before = issue.before !== null && issue.before !== undefined ? issue.before : "-";
            const after = issue.after !== null && issue.after !== undefined ? issue.after : "-";
            return `${name} (${before}→${after})`;
          })
          .join(", ");
        const meta = document.createElement("div");
        meta.className = "session-meta";
        meta.textContent = `${App.formatDate(session.date)} • ${App.formatSessionType(session.sessionType)}`;
        const issueText = document.createElement("div");
        issueText.className = "session-issues";
        issueText.textContent = issues || App.t("overview.sessions.none");
        const commentsText = (session.comments || "").trim();
        let commentsLine = null;
        if (commentsText) {
          commentsLine = document.createElement("div");
          commentsLine.className = "session-comments";
          commentsLine.textContent = `${App.t("session.form.comments")}: ${commentsText}`;
        }
        let heartBadge = null;
        if (session.isHeartShield) {
          heartBadge = document.createElement("div");
          heartBadge.className = "heartwall-badge";
          if (session.shieldRemoved) {
            heartBadge.textContent = App.t("sessions.badge.removed");
            heartBadge.classList.add("badge-removed");
          } else {
            heartBadge.textContent = App.t("sessions.badge.active");
            heartBadge.classList.add("badge-active");
          }
        }
        const editButton = document.createElement("button");
        editButton.className = "edit-button";
        editButton.type = "button";
        // D-07 (Phase 24): label is "View" (not "Edit") — entry opens read mode by default.
        // Phase 24-06 follow-up: dropped `row-toggle` (34px circle with grid:place-items:center
        //   was clipping both label + icon into one cell). .edit-button now styles as a pill
        //   with label + icon side-by-side.
        editButton.innerHTML = '<span class="button-label" data-i18n="overview.table.view">' + App.t("overview.table.view") + '</span><span class="button-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>';
        editButton.addEventListener("click", () => {
          window.location.href = `./add-session.html?sessionId=${session.id}`;
        });
        const actions = document.createElement("div");
        actions.className = "session-actions";
        actions.appendChild(editButton);
        item.appendChild(meta);
        item.appendChild(issueText);
        if (commentsLine) item.appendChild(commentsLine);
        if (heartBadge) item.appendChild(heartBadge);
        item.appendChild(actions);
        list.appendChild(item);
      });
      detailCell.appendChild(list);
    }

    detailRow.appendChild(detailCell);
    detailRow.style.display = "none";

    detailButton.addEventListener("click", () => {
      const isOpen = detailRow.style.display === "table-row";
      detailRow.style.display = isOpen ? "none" : "table-row";
    });

    tableBody.appendChild(row);
    tableBody.appendChild(detailRow);
  });
}

function countSessionsThisMonth(sessions) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return sessions.filter((session) => {
    if (!session.date) return false;
    const date = new Date(session.date);
    return date.getMonth() === month && date.getFullYear() === year;
  }).length;
}

function createClientAvatar(client) {
  if (client.photoData) {
    const img = document.createElement("img");
    img.src = client.photoData;
    img.alt = client.name;
    img.className = "client-avatar";
    return img;
  }
  const avatar = document.createElement("div");
  avatar.className = "client-avatar placeholder";
  avatar.textContent = (client.firstName || client.name || "?").slice(0, 1).toUpperCase();
  return avatar;
}

function setupModal() {
  const modal = document.getElementById("clientModal");
  if (!modal) return;
  modal.querySelector(".modal-overlay").addEventListener("click", closeClientModal);
  modal.querySelector(".modal-close").addEventListener("click", closeClientModal);
}

function openClientModal(client, sessions) {
  const modal = document.getElementById("clientModal");
  if (!modal) return;
  const avatar = document.getElementById("modalAvatar");
  const name = document.getElementById("modalName");
  const meta = document.getElementById("modalMeta");
  const notes = document.getElementById("modalNotes");
  const editButton = document.getElementById("modalEditClient");
  const addSessionButton = document.getElementById("modalAddSession");

  const metrics = getClientMetrics(sessions);

  if (avatar) {
    if (client.photoData) {
      avatar.src = client.photoData;
      avatar.classList.remove("is-hidden");
    } else {
      avatar.classList.add("is-hidden");
    }
  }

  if (name) name.textContent = client.name;
  if (meta) {
    meta.innerHTML = "";
    const parts = [];
    const displayAge = client.birthDate
      ? Math.floor((Date.now() - new Date(client.birthDate)) / (365.25 * 24 * 60 * 60 * 1000))
      : client.age;
    if (displayAge) {
      const ageEl = document.createElement("span");
      ageEl.textContent = `${displayAge}`;
      parts.push(ageEl);
    } else {
      const link = document.createElement("a");
      link.href = `./add-client.html?clientId=${client.id}`;
      link.className = "add-birth-year-link";
      link.textContent = App.t("overview.addBirthYear");
      parts.push(link);
    }
    if (client.type) {
      const typeEl = document.createElement("span");
      typeEl.textContent = App.t(`common.type.${client.type}`) || client.type;
      parts.push(typeEl);
    }
    parts.forEach((el, i) => {
      if (i > 0) meta.appendChild(document.createTextNode(" • "));
      meta.appendChild(el);
    });
  }

  const modalSessions = document.getElementById("modalSessions");
  const modalIssues = document.getElementById("modalIssues");
  const modalAvgBefore = document.getElementById("modalAvgBefore");
  const modalAvgAfter = document.getElementById("modalAvgAfter");
  const modalAvgDays = document.getElementById("modalAvgDays");

  if (modalSessions) modalSessions.textContent = metrics.sessions;
  if (modalIssues) modalIssues.textContent = metrics.issues;
  if (modalAvgBefore) modalAvgBefore.textContent = metrics.avgBefore;
  if (modalAvgAfter) modalAvgAfter.textContent = metrics.avgAfter;
  if (modalAvgDays) modalAvgDays.textContent = metrics.avgDays;
  if (notes) notes.textContent = client.notes || "-";
  if (editButton) {
    editButton.onclick = () => {
      window.location.href = `./add-client.html?clientId=${client.id}`;
    };
  }
  if (addSessionButton) {
    addSessionButton.onclick = () => {
      window.location.href = `./add-session.html?clientId=${client.id}`;
    };
  }

  App.applyTranslations(modal);
  modal.classList.remove("is-hidden");
  App.lockBodyScroll();
}

function closeClientModal() {
  const modal = document.getElementById("clientModal");
  if (modal) modal.classList.add("is-hidden");
  App.unlockBodyScroll();
}

function getClientDisplayName(client) {
  if (client.name) return client.name;
  const first = client.firstName || "";
  const last = client.lastInitial ? `${client.lastInitial}.` : "";
  return `${first} ${last}`.trim() || "Unnamed";
}

function getClientMetrics(sessions) {
  const totalSessions = sessions.length;
  let issueCount = 0;
  let beforeSum = 0;
  let afterSum = 0;
  let beforeCount = 0;
  let afterCount = 0;

  sessions.forEach((session) => {
    (session.issues || []).forEach((issue) => {
      issueCount += 1;
      if (issue.before !== null && issue.before !== undefined) {
        beforeSum += Number(issue.before);
        beforeCount += 1;
      }
      if (issue.after !== null && issue.after !== undefined) {
        afterSum += Number(issue.after);
        afterCount += 1;
      }
    });
  });

  const avgBefore = beforeCount ? (beforeSum / beforeCount).toFixed(1) : "-";
  const avgAfter = afterCount ? (afterSum / afterCount).toFixed(1) : "-";
  const avgDays = averageDaysBetween(sessions);

  return {
    sessions: totalSessions,
    issues: issueCount,
    avgBefore,
    avgAfter,
    avgDays
  };
}

function averageDaysBetween(sessions) {
  if (sessions.length < 2) return "-";
  const dates = sessions
    .map((session) => new Date(session.date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b);
  if (dates.length < 2) return "-";
  let total = 0;
  for (let i = 1; i < dates.length; i += 1) {
    const diff = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
    total += diff;
  }
  return (total / (dates.length - 1)).toFixed(1);
}

