// ────────────────────────────────────────────────────────────────────────
// sessions.js — Sessions-list page: filterable table of all sessions.
//
// OWNS: the sessions list load, the client + date-range + Session-Format
//   multi-select + Heart-Wall toggle filter pipeline, and the session row
//   render (date, client name, type, issues,
//   trapped emotions, Heart-Shield badge, view button).
// PUBLIC SURFACE: none — self-boots on DOMContentLoaded, registers no global.
// DEPENDENCIES: App.{initCommon, t, formatDate, formatSessionType}
//   (assets/app.js); PortfolioDB.{getAllClients, getAllSessions}
//   (assets/db.js).
// CONSTRAINTS: user-provided and i18n text rendered via textContent — never
//   innerHTML. Session rows are sorted newest-first with a createdAt + id
//   tiebreaker so same-date sessions display in the correct order.
// ────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await App.initCommon();

  const clientFilter = document.getElementById("sessionClientFilter");
  const dateFrom = document.getElementById("sessionDateFrom");
  const dateTo = document.getElementById("sessionDateTo");
  const heartWallToggle = document.getElementById("sessionHeartWallToggle");
  const tableBody = document.getElementById("sessionsTableBody");
  const emptyState = document.getElementById("sessionsEmpty");
  const formatFilter = document.getElementById("sessionFormatFilter");
  const formatFilterToggle = document.getElementById("sessionFormatFilterToggle");
  const formatFilterPanel = document.getElementById("sessionFormatFilterPanel");

  let clientCache = [];

  // Session Format multi-select: the set of checked format keys is the SINGLE
  // source of truth for the predicate + the pill summary. It persists across
  // option-row rebuilds (e.g. a language switch) so the checked state is
  // RESTORED when the rows are re-derived from App.getSessionTypes(). An empty
  // set = no format filtering (every session passes).
  const _selectedFormats = new Set();

  // Rebuild the checkbox option rows from the CURRENT App.getSessionTypes() list
  // (5 locked defaults + dynamic custom types). Custom labels are user data, so
  // each label is set via textContent (never markup-string assignment), closing
  // the T-37-14-SEC XSS surface. The panel is cleared by DOM node removal (not a
  // markup-string reset) so the sessions.js markup-string-assignment count stays
  // at its pre-plan baseline. Previously-checked keys are restored.
  function buildFormatOptions() {
    if (!formatFilterPanel || typeof App.getSessionTypes !== "function") return;
    while (formatFilterPanel.firstChild) formatFilterPanel.removeChild(formatFilterPanel.firstChild);
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
      formatFilterPanel.appendChild(option);
    });
  }

  // Re-render the pill summary from _selectedFormats. The summary text node
  // carries NO data-i18n (applyTranslations does no interpolation and would
  // clobber the count on a language switch), so it is set programmatically here
  // and re-rendered inside the app:language handler. Caller-side interpolation
  // mirrors the established add-session.js pattern (applyTranslations does not
  // substitute {count}).
  function renderFormatSummary() {
    const summary = formatFilterToggle ? formatFilterToggle.querySelector(".multi-select-summary") : null;
    if (!summary || typeof App.t !== "function") return;
    const n = _selectedFormats.size;
    summary.textContent = n === 0
      ? App.t("filter.sessionFormat.all")
      : String(App.t("filter.sessionFormat.count")).replace("{count}", String(n));
  }

  function isFormatPanelOpen() {
    return !!(formatFilterPanel && !formatFilterPanel.classList.contains("is-hidden"));
  }
  function openFormatPanel() {
    if (!formatFilterPanel) return;
    formatFilterPanel.classList.remove("is-hidden");
    if (formatFilterToggle) formatFilterToggle.setAttribute("aria-expanded", "true");
  }
  function closeFormatPanel() {
    if (!formatFilterPanel) return;
    formatFilterPanel.classList.add("is-hidden");
    if (formatFilterToggle) formatFilterToggle.setAttribute("aria-expanded", "false");
  }

  async function loadClients(selectedId) {
    clientCache = await PortfolioDB.getAllClients();
    if (!clientFilter) return;
    clientFilter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.setAttribute("data-i18n", "sessions.filters.client.placeholder");
    allOption.textContent = App.t("sessions.filters.client.placeholder");
    clientFilter.appendChild(allOption);

    clientCache
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }))
      .forEach((client) => {
        const option = document.createElement("option");
        option.value = client.id;
        option.textContent = client.name || "-";
        clientFilter.appendChild(option);
      });

    if (selectedId) {
      clientFilter.value = String(selectedId);
    }
  }

  function matchesDateRange(dateValue, start, end) {
    if (!dateValue) return false;
    if (start && dateValue < start) return false;
    if (end && dateValue > end) return false;
    return true;
  }

  function getClientName(id) {
    const client = clientCache.find((item) => item.id === id);
    return client ? client.name || "-" : "-";
  }

  async function renderSessions() {
    if (!tableBody) return;
    const sessions = await PortfolioDB.getAllSessions();
    const selectedClient = clientFilter ? clientFilter.value : "";
    const startDate = dateFrom ? dateFrom.value : "";
    const endDate = dateTo ? dateTo.value : "";
    const heartWallOn = heartWallToggle ? heartWallToggle.checked : false;

    const filtered = sessions.filter((session) => {
      if (selectedClient && String(session.clientId) !== selectedClient) return false;
      if ((startDate || endDate) && !matchesDateRange(session.date, startDate, endDate)) return false;
      // Session Format filter (multi-select): when >=1 format is checked, keep a
      // session only if its RESOLVED format key (session.sessionType || "clinic",
      // so a legacy/undefined session counts as clinic) is in the checked set.
      // Empty selection = no format filtering.
      if (_selectedFormats.size > 0 && !_selectedFormats.has(session.sessionType || "clinic")) return false;
      // Heart-Wall toggle: when ON, keep only sessions where isHeartShield===true
      // — regardless of shieldRemoved (D2a: a released Heart-Wall still counts as
      // "the Heart-Wall was handled"). OFF = no heart filtering.
      if (heartWallOn && session.isHeartShield !== true) return false;
      return true;
    });

    // Same-date tiebreaker — without createdAt + id secondary keys, two sessions
    // on the same date preserve their IDB insertion order (oldest first), which
    // makes the sessions list display same-date entries upside-down. Mirror the
    // spotlight helper's comparator.
    filtered.sort((a, b) => {
      const cmp = String(b.date || "").localeCompare(String(a.date || ""));
      if (cmp !== 0) return cmp;
      const ca = new Date(a.createdAt || 0).getTime();
      const cb = new Date(b.createdAt || 0).getTime();
      if (cb !== ca) return cb - ca;
      return (b.id || 0) - (a.id || 0);
    });

    tableBody.innerHTML = "";

    if (!filtered.length) {
      if (emptyState) emptyState.style.display = "block";
      return;
    }
    if (emptyState) emptyState.style.display = "none";

    filtered.forEach((session) => {
      const row = document.createElement("tr");
      row.className = "session-row";

      const dateCell = document.createElement("td");
      dateCell.textContent = App.formatDate(session.date) || "-";

      const clientCell = document.createElement("td");
      clientCell.textContent = getClientName(session.clientId);

      const typeCell = document.createElement("td");
      typeCell.textContent = App.formatSessionType(session.sessionType);

      const issuesCell = document.createElement("td");
      issuesCell.className = "issues-cell";
      if (session.issues && session.issues.length) {
        const issueList = document.createElement("div");
        issueList.className = "issue-list";
        session.issues.forEach((issue) => {
          const issueLine = document.createElement("div");
          issueLine.className = "issue-line";
          const issueName = issue.name || "-";
          const before = issue.before !== null && issue.before !== undefined ? issue.before : "-";
          const after = issue.after !== null && issue.after !== undefined ? issue.after : "-";
          issueLine.textContent = `${issueName} (${before} -> ${after})`;
          issueList.appendChild(issueLine);
        });
        issuesCell.appendChild(issueList);
      } else {
        issuesCell.textContent = "-";
      }

      const trappedCell = document.createElement("td");
      trappedCell.className = "trapped-cell";
      trappedCell.textContent = session.trappedEmotions || "-";

      const heartShieldCell = document.createElement("td");
      if (session.isHeartShield) {
        const badge = document.createElement("div");
        badge.className = "heartwall-badge";
        if (session.shieldRemoved) {
          badge.textContent = App.t("sessions.badge.removed");
          badge.classList.add("badge-removed");
        } else {
          badge.textContent = App.t("sessions.badge.active");
          badge.classList.add("badge-active");
        }
        heartShieldCell.appendChild(badge);
      } else {
        heartShieldCell.textContent = "−";
      }

      const actionCell = document.createElement("td");
      actionCell.className = "session-actions-cell";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "session-edit";
      // Label is "View" (not "Edit") — click opens read mode by default; the
      // in-page edit toggle (#editSessionBtn) is what flips to edit mode.
      // Build the view button via textContent for the i18n label instead of
      // string-interpolated innerHTML. The icon span's SVG is
      // static/app-controlled (no interpolation) so it is assigned once via
      // innerHTML. Observable output is identical (a .button-label with data-i18n
      // + a .button-icon svg), locked by tests/31-sessions-render-hardening.test.js.
      const viewLabel = document.createElement("span");
      viewLabel.className = "button-label";
      viewLabel.setAttribute("data-i18n", "sessions.table.view");
      viewLabel.textContent = App.t("sessions.table.view");
      const viewIcon = document.createElement("span");
      viewIcon.className = "button-icon";
      viewIcon.setAttribute("aria-hidden", "true");
      viewIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
      editButton.appendChild(viewLabel);
      editButton.appendChild(viewIcon);
      editButton.addEventListener("click", () => {
        window.location.href = `./add-session.html?sessionId=${session.id}`;
      });
      actionCell.appendChild(editButton);

      row.appendChild(dateCell);
      row.appendChild(clientCell);
      row.appendChild(typeCell);
      row.appendChild(issuesCell);
      row.appendChild(trappedCell);
      row.appendChild(heartShieldCell);
      row.appendChild(actionCell);
      tableBody.appendChild(row);
    });
  }

  if (clientFilter) {
    clientFilter.addEventListener("change", renderSessions);
  }
  if (dateFrom) {
    dateFrom.addEventListener("change", renderSessions);
  }
  if (dateTo) {
    dateTo.addEventListener("change", renderSessions);
  }
  if (heartWallToggle) {
    heartWallToggle.addEventListener("change", renderSessions);
  }

  // ── Session Format multi-select: panel open/close + checkbox wiring ──────
  if (formatFilterToggle) {
    formatFilterToggle.addEventListener("click", (e) => {
      // Stop the click reaching the document-level outside-click handler, which
      // would immediately re-close a panel we just opened.
      e.stopPropagation();
      if (isFormatPanelOpen()) closeFormatPanel(); else openFormatPanel();
    });
  }
  if (formatFilterPanel) {
    // Delegated change: the option rows are rebuilt on every language switch,
    // but the panel element itself persists, so one delegated listener survives.
    formatFilterPanel.addEventListener("change", (e) => {
      const box = e.target;
      if (!box || !box.matches || !box.matches('input[type="checkbox"][data-format-key]')) return;
      const key = box.getAttribute("data-format-key");
      if (box.checked) _selectedFormats.add(key); else _selectedFormats.delete(key);
      renderFormatSummary();
      renderSessions();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isFormatPanelOpen()) closeFormatPanel();
  });
  document.addEventListener("click", (e) => {
    if (isFormatPanelOpen() && formatFilter && !formatFilter.contains(e.target)) {
      closeFormatPanel();
    }
  });

  await loadClients();
  buildFormatOptions();
  renderFormatSummary();
  await renderSessions();

  document.addEventListener("app:language", async () => {
    await loadClients(clientFilter ? clientFilter.value : "");
    // Rebuild the option labels for the new language and RESTORE the checked set
    // (_selectedFormats persists); re-render the summary (no data-i18n on it).
    buildFormatOptions();
    renderFormatSummary();
    await renderSessions();
  });
});
