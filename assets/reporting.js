// reporting.js — Reporting page: aggregates session statistics (total clients,
// sessions, avg issues/session, avg severity before/after, heart-shield-cleared
// count) from PortfolioDB and renders them. Self-boots; no window.* export.
document.addEventListener("DOMContentLoaded", async () => {
  await App.initCommon();

  // Phase 39 Plan 05 (HELP-05, D-21/D-22): build the first-run no-data coaching
  // block into #reportingEmpty once — calm help.deeplink.readDashboard sentence +
  // a soft "Show me how" deep-link into ./help.html#overview (matches
  // window.HELP_DEEPLINKS.readDashboard, Plan 01/04). Both nodes carry data-i18n
  // so the app:language handler's applyTranslations() re-localizes them. Non-
  // accent .button.ghost (D-22); createElement + textContent, no innerHTML.
  function buildReportingCoach(container) {
    if (!container || document.getElementById("reportingCoachBtn")) return;
    container.textContent = "";
    const sentence = document.createElement("div");
    sentence.className = "empty-coach-sentence";
    sentence.setAttribute("data-i18n", "help.deeplink.readDashboard");
    sentence.textContent = App.t("help.deeplink.readDashboard");
    const btn = document.createElement("a");
    btn.id = "reportingCoachBtn";
    btn.className = "button ghost empty-coach-btn";
    btn.style.display = "inline-block";
    btn.style.marginTop = "0.75rem";
    btn.setAttribute("href", "./help.html#overview");
    btn.setAttribute("data-i18n", "help.deeplink.cta");
    btn.textContent = App.t("help.deeplink.cta");
    container.appendChild(sentence);
    container.appendChild(btn);
  }

  async function renderReporting() {
    const clients = await PortfolioDB.getAllClients();
    const sessions = await PortfolioDB.getAllSessions();

    const totalClients = clients.length;
    const totalSessions = sessions.length;

    // "No data" for the dashboard === zero sessions to aggregate: every stat is
    // session-derived, so with no sessions there is nothing to chart. On that
    // first-run state show the coaching block and hide the empty stat grid;
    // otherwise render stats as before.
    const reportingEmpty = document.getElementById("reportingEmpty");
    const statGrid = document.querySelector(".stat-grid");
    if (totalSessions === 0) {
      buildReportingCoach(reportingEmpty);
      if (reportingEmpty) reportingEmpty.style.display = "block";
      if (statGrid) statGrid.style.display = "none";
      return;
    }
    if (reportingEmpty) reportingEmpty.style.display = "none";
    if (statGrid) statGrid.style.display = "";

    let totalIssues = 0;
    let beforeSum = 0;
    let beforeCount = 0;
    let afterSum = 0;
    let afterCount = 0;
    let heartShieldCleared = 0;

    sessions.forEach((session) => {
      if (session.isHeartShield && session.shieldRemoved) heartShieldCleared += 1;
      (session.issues || []).forEach((issue) => {
        totalIssues += 1;
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

    const avgIssues = totalSessions ? (totalIssues / totalSessions).toFixed(1) : "-";
    const avgBefore = beforeCount ? (beforeSum / beforeCount).toFixed(1) : "-";
    const avgAfter = afterCount ? (afterSum / afterCount).toFixed(1) : "-";

    const totalClientsEl = document.getElementById("reportTotalClients");
    const totalSessionsEl = document.getElementById("reportTotalSessions");
    const avgIssuesEl = document.getElementById("reportAvgIssues");
    const avgBeforeEl = document.getElementById("reportAvgBefore");
    const avgAfterEl = document.getElementById("reportAvgAfter");
    const heartShieldEl = document.getElementById("reportHeartShield");

    if (totalClientsEl) totalClientsEl.textContent = totalClients;
    if (totalSessionsEl) totalSessionsEl.textContent = totalSessions;
    if (avgIssuesEl) avgIssuesEl.textContent = avgIssues;
    if (avgBeforeEl) avgBeforeEl.textContent = avgBefore;
    if (avgAfterEl) avgAfterEl.textContent = avgAfter;
    if (heartShieldEl) heartShieldEl.textContent = heartShieldCleared;
  }

  await renderReporting();

  document.addEventListener("app:language", () => {
    App.applyTranslations();
  });
});
