// Module-level storage for search filtering
let _allClients = [];
let _sessionsByClient = new Map();

// ===========================================================================
// Phase 25 Plan 02 — Backup & Restore modal helpers (D-05..D-10, D-26)
//
// These functions are hoisted to module-top so:
//   - App.mountBackupCloudButton (assets/app.js) can read window.formatRelativeTime
//     to render the cloud icon's title attribute at mount time.
//   - Plan 04's state-update wiring (visibilitychange + post-export refresh)
//     can call window.renderLastBackupSubtitle without a load-order dependency.
//   - Plan 05's scheduled-backup interval-end prompt can call
//     window.openBackupModal from settings.js.
// ===========================================================================

/**
 * Localized relative-time formatter ("3 days ago" / "1 hour ago" / "moments ago").
 * Returns null when timestamp is missing/NaN — callers render the "never" string.
 */
function formatRelativeTime(timestampMs) {
  if (!timestampMs || isNaN(timestampMs)) return null;
  const elapsed = Date.now() - Number(timestampMs);
  const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('portfolioLang')) || 'en';
  let rtf;
  try {
    rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  } catch (_) {
    rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  }
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minMs = 60 * 1000;
  if (elapsed >= dayMs) return rtf.format(-Math.floor(elapsed / dayMs), 'day');
  if (elapsed >= hourMs) return rtf.format(-Math.floor(elapsed / hourMs), 'hour');
  if (elapsed >= minMs) return rtf.format(-Math.floor(elapsed / minMs), 'minute');
  return rtf.format(-Math.floor(elapsed / 1000), 'second');
}
if (typeof window !== 'undefined') window.formatRelativeTime = formatRelativeTime;

/** Update the modal subtitle (#backupModalLastBackup) from localStorage.portfolioLastExport. */
function renderLastBackupSubtitle() {
  const el = document.getElementById('backupModalLastBackup');
  if (!el) return;
  const ts = Number(localStorage.getItem('portfolioLastExport'));
  const rel = formatRelativeTime(ts);
  if (rel === null) {
    el.setAttribute('data-i18n', 'backup.modal.lastBackupNever');
    el.textContent = App.t('backup.modal.lastBackupNever');
  } else {
    // Dynamic content — no static i18n binding so applyTranslations does not
    // overwrite the substituted relative time on the next pass.
    el.removeAttribute('data-i18n');
    el.textContent = App.t('backup.modal.lastBackup').replace('{relative}', rel);
  }
}

/** Probe Web Share API capability with a small probe File and hide/show the Share button. */
function probeShareSupport() {
  const btn = document.getElementById('backupModalShare');
  if (!btn) return;
  try {
    const probe = new File(
      [new Blob(['x'], { type: 'application/octet-stream' })],
      'probe.sgbackup',
      { type: 'application/octet-stream' }
    );
    if (BackupManager.isShareSupported(probe)) {
      btn.classList.remove('is-hidden');
    } else {
      btn.classList.add('is-hidden');
    }
  } catch (_) {
    btn.classList.add('is-hidden');
  }
}

/** Open the Backup & Restore modal — refreshes subtitle, probes Share, translates. */
function openBackupModal() {
  const modal = document.getElementById('backupModal');
  if (!modal) return;
  renderLastBackupSubtitle();
  probeShareSupport();
  modal.classList.remove('is-hidden');
  App.lockBodyScroll();
  App.applyTranslations(modal);
}

/** Close the Backup & Restore modal. */
function closeBackupModal() {
  const modal = document.getElementById('backupModal');
  if (!modal) return;
  modal.classList.add('is-hidden');
  App.unlockBodyScroll();
  // Phase 25 Plan 03 — reset the Test-password sub-card so stale file/password/
  // result do not leak between modal sessions (avoids visual confusion when the
  // user reopens the modal after a successful test on a different file).
  // Implementation note: inlined here rather than re-binding closeBackupModal,
  // because closeBackupModal is a hoisted `function` declaration.
  const tpFile = document.getElementById('backupTestPasswordFile');
  const tpInput = document.getElementById('backupTestPasswordInput');
  const tpLabel = document.getElementById('backupTestPasswordFileLabel');
  const tpRun = document.getElementById('backupTestPasswordRun');
  const tpResult = document.getElementById('backupTestPasswordResult');
  if (tpFile) tpFile.value = '';
  if (tpInput) tpInput.value = '';
  if (tpLabel) {
    tpLabel.setAttribute('data-i18n', 'backup.testPassword.filePlaceholder');
    tpLabel.textContent = App.t('backup.testPassword.filePlaceholder');
  }
  if (tpResult) {
    tpResult.hidden = true;
    tpResult.textContent = '';
    tpResult.className = 'backup-test-password-result';
  }
  if (tpRun) tpRun.disabled = true;
}

/**
 * Export flow — preserves the Phase 22-15 encrypt-or-skip behavior, capturing
 * the resulting blob+filename for the optional `afterExport` hook (Share-button
 * chain).
 *
 * Plan 08 refactor: exportEncryptedBackup now resolves to an object shape
 * { ok, skip, cancelled, blob, filename } instead of the legacy tri-state
 * (true / false / 'cancel'). This closes Plan 02's deferred limitation — the
 * encrypted path now exposes the encrypted blob+filename so the Share button
 * can chain through it (D-04 inheritance for BOTH share paths).
 *
 *   result.cancelled === true → user dismissed; abort silently.
 *   result.skip      === true → user pressed Skip Encryption; we run the
 *                                unencrypted exportBackup path ourselves and
 *                                capture the unencrypted blob for Share.
 *   result.ok        === true → encrypted backup downloaded; result.blob is
 *                                the encrypted blob, result.filename the
 *                                .sgbackup name. Share button chains through.
 */
async function openExportFlow(opts) {
  opts = opts || {};
  try {
    const result = await BackupManager.exportEncryptedBackup();
    if (result.cancelled) return null;
    let producedBlob = null;
    let producedFilename = null;
    if (result.skip) {
      // Skip-encryption path: produce the unencrypted ZIP ourselves so Share
      // can chain through (and so autoSaveToFolder writes the unencrypted ZIP
      // when the user has a folder picked).
      const unenc = await BackupManager.exportBackup();
      BackupManager.triggerDownload(unenc.blob, unenc.filename);
      if (BackupManager.isAutoBackupActive()) {
        await BackupManager.autoSaveToFolder(unenc.blob, unenc.filename);
      }
      producedBlob = unenc.blob;
      producedFilename = unenc.filename;
    } else if (result.ok) {
      // Encrypted path: the .sgbackup file was downloaded inside
      // exportEncryptedBackup; result.blob is the encrypted blob and
      // result.filename is the .sgbackup name — we forward both into the
      // afterExport hook so the Share button shares the ENCRYPTED file.
      producedBlob = result.blob;
      producedFilename = result.filename;
    }
    // Reprobe Share-button visibility AFTER the export completes — the button
    // is gated only by the platform capability check (navigator.canShare with
    // a real .sgbackup probe), not by which path the user took. This unhides
    // the Share button for BOTH encrypted and skip-encryption paths once a
    // valid blob is in producedBlob.
    probeShareSupport();
    App.showToast('', 'toast.exportSuccess');
    renderLastBackupSubtitle();
    // Phase 25 Plan 04 (D-08/D-13) — refresh cloud icon color + title text
    // immediately after a successful export, so the user sees the state flip
    // without waiting for the next visibilitychange tick.
    App.updateBackupCloudState(document.getElementById('backupCloudBtn'));
    if (typeof opts.afterExport === 'function' && producedBlob) {
      await opts.afterExport({ blob: producedBlob, filename: producedFilename });
    }
    return { blob: producedBlob, filename: producedFilename };
  } catch (err) {
    console.error('Backup export failed:', err);
    let msg = (err && err.message) ? err.message : String(err);
    if (msg.includes('subtle') || msg.includes('crypto')) {
      msg = 'Encrypted backup requires HTTPS or localhost. Try accessing via localhost instead of IP.';
    }
    App.showToast(msg, 'toast.exportError');
    return null;
  }
}

/** Import flow — preserves the existing destructive-replace confirm + importBackup defense. */
async function openImportFlow(file) {
  if (!file) return;
  if (window.name === 'demo-mode') {
    App.showToast('', 'toast.importDisabledDemo');
    return;
  }
  try {
    const confirmed = await App.confirmDialog({
      messageKey: 'backup.confirmReplace',
      confirmKey: 'confirm.import',
      cancelKey: 'confirm.cancel',
    });
    if (!confirmed) return;
    await BackupManager.importBackup(file);
    App.showToast('', 'toast.importSuccess');
    await loadOverview();
    renderLastBackupSubtitle();
    // Phase 25 Plan 04 (D-08/D-13) — refresh cloud icon color + title text
    // immediately after a successful import (importBackup writes
    // portfolioLastExport, so the recency state changes).
    App.updateBackupCloudState(document.getElementById('backupCloudBtn'));
    closeBackupModal();
  } catch (err) {
    if (err === null) return; // passphrase modal cancelled
    console.error('Import failed:', err);
    const msg = (err && err.message) ? err.message : '';
    App.showToast(msg || App.t('toast.importError'));
  }
}

if (typeof window !== 'undefined') {
  window.openBackupModal = openBackupModal;
  window.renderLastBackupSubtitle = renderLastBackupSubtitle;
  // Phase 25 Plan 08 — expose openExportFlow for cross-file invocation
  // (encrypt-then-share behavior test sandbox; future programmatic invocation
  // from scheduled-backup interval-end prompt or command palette).
  window.openExportFlow = openExportFlow;
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
  // Phase 25 Plan 02 — Backup & Restore modal handlers (D-05..D-10, D-26).
  // The 5-button overview cluster is collapsed; the cloud icon in
  // #headerActions (mounted by App.mountBackupCloudButton) opens this modal.
  // The pre-Phase-25 overview button handlers (Export / Import / Send-to-myself
  // / Set-backup-folder) are deleted — their behavior moves into openExportFlow,
  // openImportFlow, and shareBackup invoked from the modal Share button.
  // The folder picker moves to Settings → Backups tab in Plan 05.
  // -----------------------------------------------------------------------

  // Auto-open modal if navigated from another page via the cloud icon
  // (the icon on add-client/add-session/settings pages routes here with
  // ?openBackup=1 because the modal markup only ships in index.html).
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("openBackup") === "1") {
      setTimeout(() => openBackupModal(), 0);
      params.delete("openBackup");
      const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
  } catch (_) {
    /* defensive: bad URL state, skip auto-open */
  }

  const backupModalClose = document.getElementById("backupModalClose");
  if (backupModalClose) backupModalClose.addEventListener("click", closeBackupModal);

  const backupModalOverlay = document.querySelector("#backupModal .modal-overlay");
  if (backupModalOverlay) backupModalOverlay.addEventListener("click", closeBackupModal);

  const backupModalExport = document.getElementById("backupModalExport");
  if (backupModalExport) {
    backupModalExport.addEventListener("click", () => openExportFlow());
  }

  const backupModalShare = document.getElementById("backupModalShare");
  if (backupModalShare) {
    backupModalShare.addEventListener("click", async () => {
      await openExportFlow({
        afterExport: async ({ blob, filename }) => {
          await BackupManager.shareBackup(blob, filename);
        },
      });
    });
  }

  const backupModalImportInput = document.getElementById("backupModalImportInput");
  if (backupModalImportInput) {
    backupModalImportInput.addEventListener("change", async () => {
      const file = backupModalImportInput.files && backupModalImportInput.files[0];
      await openImportFlow(file);
      backupModalImportInput.value = "";
    });
  }

  // ---------------------------------------------------------------------
  // Phase 25 Plan 03 — Test-password sub-card handlers (D-12).
  // The "Test password" button is disabled until BOTH a file is chosen AND
  // a password is typed. On click, calls BackupManager.testBackupPassword
  // (which decrypts to memory only, never touches IDB or localStorage) and
  // renders the result in-card — green success with manifest counts, or
  // yellow error with the resolved i18n message from the rejection.
  // ---------------------------------------------------------------------
  const backupTestPasswordFile = document.getElementById("backupTestPasswordFile");
  const backupTestPasswordFileLabel = document.getElementById("backupTestPasswordFileLabel");
  const backupTestPasswordInput = document.getElementById("backupTestPasswordInput");
  const backupTestPasswordRun = document.getElementById("backupTestPasswordRun");
  const backupTestPasswordResult = document.getElementById("backupTestPasswordResult");

  function refreshTestPasswordButtonState() {
    const hasFile = !!(backupTestPasswordFile && backupTestPasswordFile.files && backupTestPasswordFile.files.length > 0);
    const hasPwd = !!(backupTestPasswordInput && backupTestPasswordInput.value.length > 0);
    if (backupTestPasswordRun) backupTestPasswordRun.disabled = !(hasFile && hasPwd);
  }

  function showTestPasswordResult(kind, text) {
    if (!backupTestPasswordResult) return;
    backupTestPasswordResult.className = "backup-test-password-result " + kind;
    backupTestPasswordResult.textContent = text;
    backupTestPasswordResult.hidden = false;
  }

  function clearTestPasswordResult() {
    if (!backupTestPasswordResult) return;
    backupTestPasswordResult.hidden = true;
    backupTestPasswordResult.textContent = "";
    backupTestPasswordResult.className = "backup-test-password-result";
  }

  if (backupTestPasswordFile && backupTestPasswordFileLabel) {
    backupTestPasswordFile.addEventListener("change", () => {
      const f = backupTestPasswordFile.files && backupTestPasswordFile.files[0];
      if (f) {
        // Render the chosen filename — drop the data-i18n binding so
        // applyTranslations does not overwrite the dynamic filename on the
        // next pass (mirrors the renderLastBackupSubtitle convention).
        backupTestPasswordFileLabel.removeAttribute("data-i18n");
        backupTestPasswordFileLabel.textContent = f.name;
      } else {
        backupTestPasswordFileLabel.setAttribute("data-i18n", "backup.testPassword.filePlaceholder");
        backupTestPasswordFileLabel.textContent = App.t("backup.testPassword.filePlaceholder");
      }
      clearTestPasswordResult();
      refreshTestPasswordButtonState();
    });
  }
  if (backupTestPasswordInput) {
    backupTestPasswordInput.addEventListener("input", () => {
      clearTestPasswordResult();
      refreshTestPasswordButtonState();
    });
  }
  if (backupTestPasswordRun) {
    backupTestPasswordRun.addEventListener("click", async () => {
      const f = backupTestPasswordFile && backupTestPasswordFile.files && backupTestPasswordFile.files[0];
      const pwd = backupTestPasswordInput ? backupTestPasswordInput.value : "";
      if (!f || !pwd) return;
      backupTestPasswordRun.disabled = true;
      try {
        const r = await BackupManager.testBackupPassword(f, pwd);
        const lang = localStorage.getItem("portfolioLang") || "en";
        const dateStr = r.exportedAt ? new Date(r.exportedAt).toLocaleDateString(lang) : "—";
        const successText = App.t("backup.testPassword.success")
          .replace("{date}", dateStr)
          .replace("{clients}", String(r.clientCount))
          .replace("{sessions}", String(r.sessionCount));
        showTestPasswordResult("success", successText);
      } catch (err) {
        const msg = (err && err.message) ? err.message : App.t("backup.testPassword.invalid");
        showTestPasswordResult("error", msg);
      } finally {
        refreshTestPasswordButtonState();
      }
    });
  }

  // Esc closes the backup modal when open.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const modal = document.getElementById("backupModal");
    if (modal && !modal.classList.contains("is-hidden")) {
      closeBackupModal();
    }
  });

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
      applyFiltersAndSort();
      updateClearButton();
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
  const missing = clients.filter(c => !c.birthDate && !c.age).length;
  if (missing === 0) {
    banner.classList.add("is-hidden");
    return;
  }
  const template = App.t("overview.missingBirth.notice");
  textEl.textContent = template.replace("{n}", String(missing));
  banner.classList.remove("is-hidden");
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

