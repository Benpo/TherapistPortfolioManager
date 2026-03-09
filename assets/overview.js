function getDailyQuote(lang) {
  const allQuotes = window.QUOTES || {};
  const langQuotes = allQuotes[lang] || allQuotes["en"] || [];
  if (!langQuotes.length) return "";
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return langQuotes[dayOfYear % langQuotes.length];
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
  quoteEl.textContent = "\u201C" + getDailyQuote(localStorage.getItem("portfolioLang") || "en") + "\u201D";
}

document.addEventListener("DOMContentLoaded", async () => {
  App.initCommon();
  renderGreeting();
  await loadOverview();

  const addClientBtn = document.getElementById("addClientBtn");
  const addSessionBtn = document.getElementById("addSessionBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importInput = document.getElementById("importInput");

  if (addClientBtn) addClientBtn.addEventListener("click", () => (window.location.href = "./add-client.html"));
  if (addSessionBtn) addSessionBtn.addEventListener("click", () => (window.location.href = "./add-session.html"));

  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      const data = await App.exportData();
      App.downloadJSON(data);
    });
  }

  if (importInput) {
    importInput.addEventListener("change", async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        await importData(data);
        App.showToast("", "toast.importSuccess");
        await loadOverview();
      } catch (err) {
        App.showToast("", "toast.importError");
      } finally {
        importInput.value = "";
      }
    });
  }

  setupModal();

  document.addEventListener("app:language", async () => {
    renderGreeting();
    await loadOverview();
  });
});

function formatSessionType(type) {
  const map = {
    inPerson: App.t("session.form.inPerson"),
    proxy: App.t("session.form.proxy"),
    surrogate: App.t("session.form.surrogate")
  };
  return map[type] || type;
}

async function loadOverview() {
  const clients = await PortfolioDB.getAllClients();
  const sessions = await PortfolioDB.getAllSessions();

  const statClients = document.getElementById("statClients");
  const statSessions = document.getElementById("statSessions");
  const statMonth = document.getElementById("statMonth");

  if (statClients) statClients.textContent = clients.length;
  if (statSessions) statSessions.textContent = sessions.length;
  if (statMonth) statMonth.textContent = countSessionsThisMonth(sessions);

  const tableBody = document.getElementById("clientTableBody");
  const emptyState = document.getElementById("emptyState");
  if (!tableBody) return;
  tableBody.innerHTML = "";

  if (!clients.length) {
    if (emptyState) emptyState.style.display = "block";
    return;
  }
  if (emptyState) emptyState.style.display = "none";

  const sessionsByClient = new Map();
  sessions.forEach((session) => {
    const list = sessionsByClient.get(session.clientId) || [];
    list.push(session);
    sessionsByClient.set(session.clientId, list);
  });

  clients.forEach((client) => {
    const clientSessions = sessionsByClient.get(client.id) || [];
    clientSessions.sort((a, b) => String(b.date).localeCompare(String(a.date)));

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
    if (client.heartWall) {
      const heart = document.createElement("span");
      heart.className = "heart-badge";
      heart.title = App.t("common.heartWall");
      heart.textContent = "♥";
      nameButton.appendChild(heart);
    }
    nameButton.addEventListener("click", () => openClientModal({ ...client, name: displayName }, clientSessions));
    nameCell.appendChild(nameButton);

    const typeCell = document.createElement("td");
    typeCell.textContent = client.type ? App.t(`common.type.${client.type}`) : "-";
    const sessionsCell = document.createElement("td");
    sessionsCell.textContent = clientSessions.length;
    const lastSessionCell = document.createElement("td");
    lastSessionCell.textContent = lastSession;
    const actionCell = document.createElement("td");
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "row-actions";
    const detailButton = document.createElement("button");
    detailButton.className = "row-toggle";
    detailButton.type = "button";
    detailButton.textContent = App.t("overview.table.details");
    const quickAddButton = document.createElement("button");
    quickAddButton.className = "row-quick-add";
    quickAddButton.type = "button";
    quickAddButton.title = App.t("overview.table.addSession");
    quickAddButton.setAttribute("aria-label", App.t("overview.table.addSession"));
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
      detailCell.innerHTML = `<div class="helper-text">${App.t("overview.sessions.none")}</div>`;
    } else {
      const list = document.createElement("div");
      list.className = "session-list";
      clientSessions.forEach((session) => {
        const item = document.createElement("div");
        item.className = "session-item";
        const issues = (session.issues || [])
          .map((issue) => `${issue.name} (${issue.before}→${issue.after})`)
          .join(", ");
        const meta = document.createElement("div");
        meta.className = "session-meta";
        meta.textContent = `${App.formatDate(session.date)} • ${formatSessionType(session.sessionType)}`;
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
        if (client.heartWall && session.heartWallCleared) {
          heartBadge = document.createElement("div");
          heartBadge.className = "heartwall-badge";
          heartBadge.textContent = App.t("overview.sessions.heartWallCleared");
        }
        const editButton = document.createElement("button");
        editButton.className = "row-toggle edit-button";
        editButton.type = "button";
        editButton.textContent = App.t("overview.table.edit");
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
    const bits = [];
    const displayAge = client.birthDate
      ? Math.floor((Date.now() - new Date(client.birthDate)) / (365.25 * 24 * 60 * 60 * 1000))
      : client.age;
    if (displayAge) bits.push(`${displayAge}`);
    if (client.type) bits.push(App.t(`common.type.${client.type}`) || client.type);
    meta.textContent = bits.join(" • ");
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
}

function closeClientModal() {
  const modal = document.getElementById("clientModal");
  if (modal) modal.classList.add("is-hidden");
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

async function importData(data) {
  if (!data || !Array.isArray(data.clients) || !Array.isArray(data.sessions)) {
    throw new Error("Invalid data");
  }
  await PortfolioDB.clearAll();
  for (const client of data.clients) {
    await PortfolioDB.addClient(client);
  }
  for (const session of data.sessions) {
    await PortfolioDB.addSession(session);
  }
}
