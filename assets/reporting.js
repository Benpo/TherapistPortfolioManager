document.addEventListener("DOMContentLoaded", async () => {
  App.initCommon();

  async function renderReporting() {
    const clients = await PortfolioDB.getAllClients();
    const sessions = await PortfolioDB.getAllSessions();

    const totalClients = clients.length;
    const totalSessions = sessions.length;

    let totalIssues = 0;
    let beforeSum = 0;
    let beforeCount = 0;
    let afterSum = 0;
    let afterCount = 0;
    let heartShieldCleared = 0;

    sessions.forEach((session) => {
      if (session.heartWallCleared) heartShieldCleared += 1;
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
