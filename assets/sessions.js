// ────────────────────────────────────────────────────────────────────────
// sessions.js — Sessions-list page: filterable table of all sessions.
//
// OWNS: the sessions list load, the client + date-range + type filter
//   pipeline, and the session row render (date, client name, type, issues,
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
  const typeFilter = document.getElementById("sessionTypeFilter");
  const tableBody = document.getElementById("sessionsTableBody");
  const emptyState = document.getElementById("sessionsEmpty");

  let clientCache = [];

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
    const selectedType = typeFilter ? typeFilter.value : "";

    const filtered = sessions.filter((session) => {
      if (selectedClient && String(session.clientId) !== selectedClient) return false;
      if ((startDate || endDate) && !matchesDateRange(session.date, startDate, endDate)) return false;
      if (selectedType === "heartShield" && !session.isHeartShield) return false;
      if (selectedType === "regular" && session.isHeartShield) return false;
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
  if (typeFilter) {
    typeFilter.addEventListener("change", renderSessions);
  }

  await loadClients();
  await renderSessions();

  document.addEventListener("app:language", async () => {
    await loadClients(clientFilter ? clientFilter.value : "");
    await renderSessions();
  });
});
