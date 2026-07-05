// ────────────────────────────────────────────────────────────────────────
// overview.js — Client overview page: the searchable/sortable client table.
//
// OWNS: the client list load, the search + sort + "missing birth info" filter
//   pipeline, the missing-birth warning banner, and the Heart-Shield badge
//   render in the client table rows.
// PUBLIC SURFACE: window.__afterBackupRestore (post-restore re-render hook) ·
//   window.__OverviewTestHooks (test seam for pure filter helpers).
// DEPENDENCIES: App.{initCommon, t, formatDate, formatSessionType,
//   lockBodyScroll, unlockBodyScroll, applyTranslations,
//   initPersistentSecuritySection} (assets/app.js);
//   PortfolioDB.{getAllClients, getAllSessions} (assets/db.js);
//   window.QUOTES (i18n files — daily quote data);
//   window.renderLastBackupSubtitle (assets/backup-modal.js — optional,
//   called only inside the post-restore hook);
//   window.demoSeedReady (assets/demo-seed.js — awaited if present).
// CONSTRAINTS: the missing-birth predicate is the SINGLE source of truth
//   shared by both the banner count and the filter, so the filtered set
//   always equals the warned count. User-provided and i18n text rendered via
//   textContent — never innerHTML.
// ────────────────────────────────────────────────────────────────────────
let _allClients = [];
let _sessionsByClient = new Map();

// The "missing birth year" warning is actionable: a module-level flag toggled
// by the banner's "Show them" control and honored inside
// applyFiltersAndSort()'s existing filter pipeline. The predicate below is the
// SINGLE source of truth shared by both the banner count
// (updateMissingBirthBanner) and the filter, so the filtered set is guaranteed
// to equal the warned count.
let _missingBirthFilterActive = false;

// Session Format multi-select (Overview): the set of checked format keys is the
// SINGLE source of truth for the filter predicate + the pill summary. It
// persists across loadOverview() rebuilds (e.g. language switch) so the checked
// state is RESTORED when the option rows are rebuilt from App.getSessionTypes().
// An empty set = no format filtering (every client passes).
let _selectedFormats = new Set();

// Rebuild the checkbox option rows from the CURRENT App.getSessionTypes() list
// (5 locked defaults + dynamic custom types). Custom labels are user data, so
// each label is set via textContent (never markup-string assignment), closing
// the T-37-13-SEC XSS surface. The panel is cleared via DOM node removal (not a
// markup-string reset) to keep the overview.js markup-string-assignment count
// at its pre-plan baseline. Previously-checked keys are restored from
// _selectedFormats.
function buildFormatOptions() {
  const panel = document.getElementById("clientFormatFilterPanel");
  if (!panel || typeof App === "undefined" || typeof App.getSessionTypes !== "function") return;
  while (panel.firstChild) panel.removeChild(panel.firstChild);
  const types = App.getSessionTypes() || [];
  types.forEach((entry) => {
    if (!entry || !entry.key) return;
    const option = document.createElement("label");
    option.className = "multi-select-option";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("data-format-key", entry.key);
    input.checked = _selectedFormats.has(entry.key);
    const text = document.createElement("span");
    text.textContent = entry.label != null ? String(entry.label) : entry.key;
    option.appendChild(input);
    option.appendChild(text);
    panel.appendChild(option);
  });
}

// Re-render the pill summary from _selectedFormats. The summary text node
// carries NO data-i18n (applyTranslations does no interpolation and would
// clobber the count on a language switch), so it is set programmatically here
// and re-rendered inside the app:language handler. Caller-side interpolation
// mirrors the established add-session.js pattern (applyTranslations does not
// substitute {count}).
function renderFormatSummary() {
  const summary = document.querySelector("#clientFormatFilterToggle .multi-select-summary");
  if (!summary || typeof App === "undefined" || typeof App.t !== "function") return;
  const n = _selectedFormats.size;
  summary.textContent = n === 0
    ? App.t("filter.sessionFormat.all")
    : String(App.t("filter.sessionFormat.count")).replace("{count}", String(n));
}

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

// The banner's "Show them" button is only an affordance to ACTIVATE the
// filter. Once active, hide it — the filtered table already shows the result
// and the global "Clear Filters" control is the single, canonical place to
// undo it (a second in-banner "remove filter" would duplicate that control).
// The button reappears when the filter is cleared or the banner re-renders
// with the filter inactive.
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

// Expose pure helpers for the falsifiable missing-birth-filter behavior test.
// DOM-free.
if (typeof window !== 'undefined') {
  window.__OverviewTestHooks = {
    clientMissingBirth,
    setMissingBirthFilter,
    clearMissingBirthFilter,
    countMissingBirth,
    filterByMissingBirth,
  };
}

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

  // The Backup & Restore modal markup + ALL its handlers (?openBackup=1
  // auto-open, close/overlay, export/share/import, the Test-password sub-card,
  // Esc-to-close) are owned by assets/backup-modal.js, loaded on every app
  // page. overview.js no longer wires them — backup-modal.js's
  // bindBackupModal() runs on DOMContentLoaded (and is idempotent via
  // window.__backupModalWired). The post-restore overview re-render is
  // registered above as window.__afterBackupRestore.

  setupModal();

  const clientSearchInput = document.getElementById("clientSearch");
  const clientTypeFilter = document.getElementById("clientTypeFilter");
  const clientHeartShieldFilter = document.getElementById("clientHeartShieldFilter");
  const clientYearFilter = document.getElementById("clientYearFilter");
  const clientSortSelect = document.getElementById("clientSortSelect");
  const clientFormatFilter = document.getElementById("clientFormatFilter");
  const clientFormatFilterToggle = document.getElementById("clientFormatFilterToggle");
  const clientFormatFilterPanel = document.getElementById("clientFormatFilterPanel");

  function applyFiltersAndSort() {
    const query = (clientSearchInput ? clientSearchInput.value : "").trim().toLowerCase();
    const typeVal = clientTypeFilter ? clientTypeFilter.value : "";
    const shieldVal = clientHeartShieldFilter ? clientHeartShieldFilter.value : "";
    const yearVal = clientYearFilter ? clientYearFilter.value : "";
    const sortVal = clientSortSelect ? clientSortSelect.value : "name";

    let filtered = _allClients.filter(c => {
      // Missing-birth-year filter — uses the SAME predicate as the
      // banner count so the filtered set equals the warned count exactly.
      if (_missingBirthFilterActive && !clientMissingBirth(c)) return false;
      // Name search
      if (query && !getClientDisplayName(c).toLowerCase().includes(query)) return false;
      // Client type filter
      if (typeVal && c.type !== typeVal) return false;
      // Session Format filter (multi-select): a client passes when it has >=1
      // session whose RESOLVED format key (session.sessionType || "clinic", so a
      // legacy/undefined session counts as clinic) is among the checked formats.
      // Empty selection = no format filtering.
      if (_selectedFormats.size > 0) {
        const sessions = _sessionsByClient.get(c.id) || [];
        const hasFormat = sessions.some(s => _selectedFormats.has(s.sessionType || "clinic"));
        if (!hasFormat) return false;
      }
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
      _selectedFormats.size > 0 ||
      _missingBirthFilterActive ||
      (clientSortSelect && clientSortSelect.value !== "name");
    clearFiltersBtn.classList.toggle("is-hidden", !hasFilters);
  }

  function onFilterChange() {
    applyFiltersAndSort();
    updateClearButton();
  }

  // ── Session Format multi-select: panel open/close + checkbox wiring ──────
  function isFormatPanelOpen() {
    return !!(clientFormatFilterPanel && !clientFormatFilterPanel.classList.contains("is-hidden"));
  }
  function openFormatPanel() {
    if (!clientFormatFilterPanel) return;
    clientFormatFilterPanel.classList.remove("is-hidden");
    if (clientFormatFilterToggle) {
      clientFormatFilterToggle.classList.add("is-open");
      clientFormatFilterToggle.setAttribute("aria-expanded", "true");
    }
  }
  function closeFormatPanel() {
    if (!clientFormatFilterPanel) return;
    clientFormatFilterPanel.classList.add("is-hidden");
    if (clientFormatFilterToggle) {
      clientFormatFilterToggle.classList.remove("is-open");
      clientFormatFilterToggle.setAttribute("aria-expanded", "false");
    }
  }
  if (clientFormatFilterToggle) {
    clientFormatFilterToggle.addEventListener("click", (e) => {
      // Stop the click from reaching the document-level outside-click handler,
      // which would immediately re-close a panel we just opened.
      e.stopPropagation();
      if (isFormatPanelOpen()) closeFormatPanel(); else openFormatPanel();
    });
  }
  if (clientFormatFilterPanel) {
    // Delegated change: the option rows are rebuilt on every loadOverview()
    // (incl. language switch), but the panel element itself persists, so a
    // single delegated listener survives rebuilds.
    clientFormatFilterPanel.addEventListener("change", (e) => {
      const box = e.target;
      if (!box || !box.matches || !box.matches('input[type="checkbox"][data-format-key]')) return;
      const key = box.getAttribute("data-format-key");
      if (box.checked) _selectedFormats.add(key); else _selectedFormats.delete(key);
      renderFormatSummary();
      onFilterChange();
    });
  }
  // Escape closes the panel; a click outside the multi-select closes it too.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isFormatPanelOpen()) closeFormatPanel();
  });
  document.addEventListener("click", (e) => {
    if (isFormatPanelOpen() && clientFormatFilter && !clientFormatFilter.contains(e.target)) {
      closeFormatPanel();
    }
  });

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      if (clientSearchInput) clientSearchInput.value = "";
      if (clientTypeFilter) clientTypeFilter.value = "";
      if (clientHeartShieldFilter) clientHeartShieldFilter.value = "";
      if (clientYearFilter) clientYearFilter.value = "";
      if (clientSortSelect) clientSortSelect.value = "name";
      // Reset the Session Format multi-select: clear the set, uncheck every
      // rendered box, reset the pill summary.
      _selectedFormats.clear();
      if (clientFormatFilterPanel) {
        clientFormatFilterPanel
          .querySelectorAll('input[type="checkbox"][data-format-key]')
          .forEach((box) => { box.checked = false; });
      }
      renderFormatSummary();
      clearMissingBirthFilter();
      syncMissingBirthButton();
      applyFiltersAndSort();
      updateClearButton();
    });
  }

  // The missing-birth banner's "Show them" control filters the existing client
  // table to exactly the clients with no birth year and scrolls the list into
  // view so the therapist immediately sees them.
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

  // Build the Session Format option rows from the current getSessionTypes()
  // list (restoring the checked set) and re-render the pill summary. Rebuilding
  // here means a language switch (which re-invokes loadOverview) refreshes the
  // option labels AND restores the previously-checked formats + the summary.
  buildFormatOptions();
  renderFormatSummary();

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
    // When two sessions share the same date, the pure-string compare returns 0
    // and stable sort keeps IDB insertion order — putting the oldest same-date
    // session first. The clock-icon expansion then renders them in the WRONG
    // order (oldest-of-today on top instead of bottom). Mirror the spotlight
    // helper's comparator: date desc, then createdAt desc, then id desc as
    // final fallback.
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
    detailButton.setAttribute("aria-label", App.t("overview.table.previousSessions"));
    detailButton.setAttribute("aria-expanded", "false");
    detailButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span class="row-toggle-label" data-i18n="overview.table.viewSessions"></span>';
    detailButton.querySelector(".row-toggle-label").textContent = App.t("overview.table.viewSessions");
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
    detailCell.colSpan = 5;

    if (!clientSessions.length) {
      // Build the empty-state node via textContent instead
      // of string-interpolated innerHTML — observable output is identical (a
      // .helper-text div whose text is the i18n string), locked by
      // tests/31-overview-render-hardening.test.js.
      const emptyHelper = document.createElement("div");
      emptyHelper.className = "helper-text";
      emptyHelper.textContent = App.t("overview.sessions.none");
      detailCell.appendChild(emptyHelper);
    } else {
      const list = document.createElement("div");
      list.className = "session-list";
      clientSessions.forEach((session) => {
        const item = document.createElement("div");
        item.className = "session-item";
        // Severity values are rendered as "name (before→after)" strings. Null/undefined
        //   before/after values render as "-" instead of the JS string "null", mirroring
        //   the sessions.js convention so both pages agree. Hebrew RTL bidi may visually
        //   flip the parenthesized arrow; logical data order is correct.
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
        // Label is "View" (not "Edit") — entry opens read mode by default;
        //   the in-page edit toggle is what flips to edit mode. .edit-button
        //   styles as a pill with label + icon side-by-side.
        // Build the view button via textContent for the i18n label instead of
        //   string-interpolated innerHTML. The icon span's SVG is
        //   static/app-controlled (no interpolation) so it is assigned once via
        //   innerHTML. Observable output is identical (a .button-label with
        //   data-i18n + a .button-icon svg), locked by
        //   tests/31-overview-render-hardening.test.js.
        const viewLabel = document.createElement("span");
        viewLabel.className = "button-label";
        viewLabel.setAttribute("data-i18n", "overview.table.view");
        viewLabel.textContent = App.t("overview.table.view");
        const viewIcon = document.createElement("span");
        viewIcon.className = "button-icon";
        viewIcon.setAttribute("aria-hidden", "true");
        viewIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        editButton.appendChild(viewLabel);
        editButton.appendChild(viewIcon);
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
      detailButton.setAttribute("aria-expanded", String(!isOpen));
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
    // Parse the calendar date in LOCAL time (window.DateFormat.parseLocal) so a
    // YYYY-MM-DD session date is never shifted a day by UTC-midnight parsing —
    // that shift miscounted "this month" across the month boundary (DATE-06/D-03).
    const date = window.DateFormat.parseLocal(session.date);
    if (!date) return false;
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
    // Age math parses the birthdate in LOCAL time (window.DateFormat.parseLocal)
    // so it never drifts by a day; a null (unparseable) parse falls back to the
    // stored client.age exactly as an Invalid Date did before (D-03).
    const birthDateParsed = client.birthDate ? window.DateFormat.parseLocal(client.birthDate) : null;
    const displayAge = birthDateParsed
      ? Math.floor((Date.now() - birthDateParsed) / (365.25 * 24 * 60 * 60 * 1000))
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
    .map((session) => window.DateFormat.parseLocal(session.date))
    .filter((date) => date && !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b);
  if (dates.length < 2) return "-";
  let total = 0;
  for (let i = 1; i < dates.length; i += 1) {
    const diff = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
    total += diff;
  }
  return (total / (dates.length - 1)).toFixed(1);
}

