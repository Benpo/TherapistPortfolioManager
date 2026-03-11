let clientCache = [];
let inlinePhotoData = "";
let formDirty = false;
let formSaving = false;

document.addEventListener("DOMContentLoaded", async () => {
  App.initCommon();

  const clientSelect = document.getElementById("clientSelect");
  const sessionDate = document.getElementById("sessionDate");
  const sessionForm = document.getElementById("sessionForm");
  const issueList = document.getElementById("issueList");
  const issueSummaryList = document.getElementById("issueSummaryList");
  const addIssueBtn = document.getElementById("addIssueBtn");
  const inlineForm = document.getElementById("inlineClientForm");
  const inlineSave = document.getElementById("inlineClientSave");
  const inlineCancel = document.getElementById("inlineClientCancel");
  const inlinePhotoInput = document.getElementById("inlineClientPhoto");
  const inlinePhotoPreview = document.getElementById("inlineClientPhotoPreview");
  const insightsInput = document.getElementById("sessionInsights");
  const customerSummaryInput = document.getElementById("customerSummary");
  const submitButton = sessionForm ? sessionForm.querySelector("button[type='submit']") : null;
  const submitLabel = submitButton ? submitButton.querySelector(".button-label") : null;
  const deleteButton = document.getElementById("deleteSessionBtn");
  const editButton = document.getElementById("editSessionBtn");
  const copySessionBtn = document.getElementById("copySessionBtn");
  const copyButtons = document.querySelectorAll(".field-copy");
  const readModeTextareas = document.querySelectorAll(".session-textarea");
  const sessionIdParam = new URLSearchParams(window.location.search).get("sessionId");
  const prefillClientParam = new URLSearchParams(window.location.search).get("clientId");
  const sessionId = sessionIdParam ? Number.parseInt(sessionIdParam, 10) : null;
  const prefillClientId = !sessionId && prefillClientParam ? Number.parseInt(prefillClientParam, 10) : null;
  let editingSession = null;
  let isReadMode = false;
  const NEW_CLIENT_VALUE = "__new__";

  // Unsaved changes protection
  if (sessionForm) {
    sessionForm.addEventListener("input", () => { formDirty = true; });
    sessionForm.addEventListener("change", () => { formDirty = true; });
  }
  window.addEventListener("beforeunload", (e) => {
    if (formDirty && !formSaving) {
      e.preventDefault();
    }
  });

  function setSubmitLabel(key) {
    if (!submitButton) return;
    if (submitLabel) {
      submitLabel.setAttribute("data-i18n", key);
      submitLabel.textContent = App.t(key);
    } else {
      submitButton.setAttribute("data-i18n", key);
      submitButton.textContent = App.t(key);
    }
  }

  function applyCopyLabels() {
    const copyLabel = App.t("session.copyField");
    copyButtons.forEach((button) => {
      button.title = copyLabel;
      button.setAttribute("aria-label", copyLabel);
    });
    if (copySessionBtn) {
      const label = App.t("session.copyAll");
      copySessionBtn.title = label;
      copySessionBtn.setAttribute("aria-label", label);
    }
    if (editButton) {
      const label = App.t("session.edit");
      editButton.title = label;
      editButton.setAttribute("aria-label", label);
    }
  }

  function resizeReadModeTextareas() {
    readModeTextareas.forEach((textarea) => {
      textarea.style.height = "auto";
      const minHeight = 56;
      const nextHeight = Math.max(textarea.scrollHeight, minHeight);
      textarea.style.height = `${nextHeight}px`;
    });
  }

  function clearReadModeTextareas() {
    readModeTextareas.forEach((textarea) => {
      textarea.style.height = "";
    });
  }

  function setReadMode(nextMode) {
    isReadMode = nextMode;
    document.body.classList.toggle("read-mode", isReadMode);
    if (submitButton) submitButton.classList.toggle("is-hidden", isReadMode);
    if (editButton) editButton.classList.toggle("is-hidden", !isReadMode);
    if (copySessionBtn) copySessionBtn.classList.toggle("is-hidden", !isReadMode);
    if (sessionForm) {
      sessionForm.querySelectorAll("input, select, textarea").forEach((el) => {
        if (el.tagName === "TEXTAREA") {
          el.readOnly = isReadMode;
        } else {
          el.disabled = isReadMode;
        }
      });
      sessionForm.querySelectorAll(".severity-button").forEach((btn) => {
        btn.disabled = isReadMode;
      });
      if (addIssueBtn) addIssueBtn.disabled = isReadMode;
      sessionForm.querySelectorAll(".issue-remove").forEach((btn) => {
        btn.disabled = isReadMode;
      });
    }
    if (isReadMode) {
      resizeReadModeTextareas();
    } else {
      clearReadModeTextareas();
      updateAddIssueState();
      updateRemoveButtons();
    }
  }

  if (sessionForm) {
    sessionForm.noValidate = true;
  }

  if (sessionDate) {
    sessionDate.valueAsDate = new Date();
    sessionDate.focus();
  }

  setupToggleGroup("sessionTypeGroup");
  setupToggleGroup("inlineClientTypeGroup");

  clientCache = (await loadClients(prefillClientId)) || [];
  updateClientSpotlight();
  if (clientSelect) {
    clientSelect.addEventListener("change", () => {
      const isNew = clientSelect.value === NEW_CLIENT_VALUE;
      if (inlineForm) {
        inlineForm.style.display = isNew ? "block" : "none";
      }
      if (!isNew) {
        resetInlineClientForm();
      }
      updateClientSpotlight();
    });
  }

  const issues = [];
  let issueCounter = 0;
  const MAX_ISSUES = 3;

  function updateAddIssueState() {
    if (!addIssueBtn) return;
    addIssueBtn.disabled = issues.length >= MAX_ISSUES;
  }

  function updateRemoveButtons() {
    const canRemove = issues.length > 1;
    issues.forEach((issue) => {
      if (!issue.removeButton) return;
      issue.removeButton.disabled = !canRemove;
      issue.removeButton.classList.toggle("is-hidden", !canRemove);
    });
  }

  function removeIssue(id) {
    if (issues.length <= 1) return;
    const index = issues.findIndex((issue) => issue.id === id);
    if (index === -1) return;
    const [removed] = issues.splice(index, 1);
    if (removed.block) removed.block.remove();
    if (removed.summaryBlock) removed.summaryBlock.remove();
    updateAddIssueState();
    updateRemoveButtons();
  }

  function updateDelta(issueObj) {
    const beforeValue = App.getSeverityValue(issueObj.beforeScale);
    const afterValue = App.getSeverityValue(issueObj.afterScale);
    const deltaEl = issueObj.deltaEl;
    if (!deltaEl) return;
    if (beforeValue !== null && afterValue !== null) {
      const delta = afterValue - beforeValue;
      if (delta === 0) {
        deltaEl.style.display = "none";
      } else {
        const sign = delta > 0 ? "+" : "";
        deltaEl.textContent = sign + delta;
        deltaEl.classList.toggle("delta-positive", delta > 0);
        deltaEl.classList.toggle("delta-negative", delta < 0);
        deltaEl.style.display = "";
      }
    } else {
      deltaEl.style.display = "none";
    }
  }

  function createIssueBlock(initialIssue = {}) {
    const id = `issue-${issueCounter++}`;
    // issueRef is a shared container so onChange callbacks can reference issueObj
    // before it is assigned below (avoids temporal dead zone)
    const issueRef = {};
    const block = document.createElement("div");
    block.className = "issue-block";
    block.dataset.id = id;

    const grid = document.createElement("div");
    grid.className = "issue-grid";

    const nameField = document.createElement("div");
    nameField.className = "form-field";
    const nameLabel = document.createElement("label");
    nameLabel.className = "label";
    nameLabel.setAttribute("data-i18n", "session.form.issueName");
    nameLabel.textContent = App.t("session.form.issueName");
    const nameInput = document.createElement("input");
    nameInput.className = "input";
    nameInput.type = "text";
    nameField.appendChild(nameLabel);
    nameField.appendChild(nameInput);

    const severityField = document.createElement("div");
    severityField.className = "form-field";
    const severityLabel = document.createElement("label");
    severityLabel.className = "label";
    severityLabel.setAttribute("data-i18n", "session.form.beforeSeverity");
    severityLabel.textContent = App.t("session.form.beforeSeverity");
    const beforeScale = App.createSeverityScale(initialIssue.before, () => updateDelta(issueRef.obj));
    severityField.appendChild(severityLabel);
    severityField.appendChild(beforeScale);

    grid.appendChild(nameField);
    grid.appendChild(severityField);
    block.appendChild(grid);

    const summaryBlock = document.createElement("div");
    summaryBlock.className = "issue-block issue-summary";
    summaryBlock.dataset.id = id;

    const summaryGrid = document.createElement("div");
    summaryGrid.className = "issue-grid";

    const summaryNameField = document.createElement("div");
    summaryNameField.className = "form-field";
    const summaryLabel = document.createElement("label");
    summaryLabel.className = "label";
    summaryLabel.setAttribute("data-i18n", "session.form.issueName");
    summaryLabel.textContent = App.t("session.form.issueName");
    const summaryInput = document.createElement("input");
    summaryInput.className = "input";
    summaryInput.type = "text";
    summaryInput.readOnly = true;
    summaryNameField.appendChild(summaryLabel);
    summaryNameField.appendChild(summaryInput);

    const summarySeverityField = document.createElement("div");
    summarySeverityField.className = "form-field severity-after-field";
    const afterLabel = document.createElement("label");
    afterLabel.className = "label muted-label";
    afterLabel.setAttribute("data-i18n", "session.form.afterSeverity");
    afterLabel.textContent = App.t("session.form.afterSeverity");
    const afterScale = App.createSeverityScale(initialIssue.after, () => updateDelta(issueRef.obj));
    const deltaEl = document.createElement("span");
    deltaEl.className = "severity-delta";
    deltaEl.style.display = "none";
    summarySeverityField.appendChild(afterLabel);
    summarySeverityField.appendChild(afterScale);
    summarySeverityField.appendChild(deltaEl);

    summaryGrid.appendChild(summaryNameField);
    summaryGrid.appendChild(summarySeverityField);
    summaryBlock.appendChild(summaryGrid);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "issue-remove";
    removeButton.title = App.t("session.form.removeIssue");
    removeButton.setAttribute("aria-label", App.t("session.form.removeIssue"));
    removeButton.textContent = "x";
    removeButton.addEventListener("click", () => removeIssue(id));
    block.appendChild(removeButton);

    nameInput.value = initialIssue.name || "";
    summaryInput.value = initialIssue.name || "";
    nameInput.addEventListener("input", () => {
      summaryInput.value = nameInput.value;
    });

    issueList.appendChild(block);
    issueSummaryList.appendChild(summaryBlock);

    const issueObj = {
      id,
      nameInput,
      beforeScale,
      afterScale,
      summaryInput,
      deltaEl,
      block,
      summaryBlock,
      removeButton
    };
    issueRef.obj = issueObj;
    issues.push(issueObj);
    updateAddIssueState();
    updateRemoveButtons();
    // Show delta if both values are already set (e.g. loading existing session)
    updateDelta(issueObj);
    return issueObj;
  }

  function getIssuesPayload() {
    return issues
      .map((issue) => {
        const name = issue.nameInput.value.trim();
        const before = App.getSeverityValue(issue.beforeScale);
        const after = App.getSeverityValue(issue.afterScale);
        return { name, before, after };
      })
      .filter((issue) => issue.name);
  }

  function validateIssues(payload) {
    return payload.length > 0;
  }

  function getClientNameForCopy() {
    if (!clientSelect) return App.t("session.copy.unknownClient");
    const clientId = Number.parseInt(clientSelect.value, 10);
    const selectedClient = getSelectedClient(clientId, clientCache);
    const displayName = getClientDisplayName(selectedClient);
    return displayName || App.t("session.copy.unknownClient");
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        return false;
      }
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      return true;
    } catch (error) {
      return false;
    } finally {
      textarea.remove();
    }
  }

  function buildFieldCopyText(fieldId) {
    const field = document.getElementById(fieldId);
    const value = field ? field.value.trim() : "";
    const clientName = getClientNameForCopy();
    return `${clientName}\n\n${value}`;
  }

  function formatSessionType(value) {
    const labels = {
      clinic: App.t("session.form.clinic"),
      online: App.t("session.form.online"),
      other: App.t("session.form.other")
    };
    return labels[value] || value || "-";
  }

  function stripRequired(label) {
    return label.replace(/\s*\*$/, "");
  }

  function buildSessionMarkdown() {
    const clientName = getClientNameForCopy();
    const dateValue = sessionDate && sessionDate.value ? App.formatDate(sessionDate.value) : "-";
    const sessionTypeInput = document.querySelector("input[name='sessionType']:checked");
    const sessionType = formatSessionType(sessionTypeInput ? sessionTypeInput.value : "");

    // Issues section: always included, delta shown when both before and after exist
    const issuesPayload = getIssuesPayload();
    const issuesText = issuesPayload.length
      ? issuesPayload
          .map((issue) => {
            const hasBefore = issue.before !== null && issue.before !== undefined;
            const hasAfter = issue.after !== null && issue.after !== undefined;
            const before = hasBefore ? issue.before : "-";
            const after = hasAfter ? issue.after : "-";
            if (hasBefore && hasAfter) {
              const delta = issue.after - issue.before;
              const sign = delta > 0 ? "+" : "";
              return `- ${issue.name} (Before: ${before}, After: ${after}, Delta: ${sign}${delta})`;
            }
            return `- ${issue.name} (Before: ${before}, After: ${after})`;
          })
          .join("\n")
      : `- ${App.t("session.copy.empty")}`;

    // Collect optional text fields -- only include if non-empty
    const trappedEl = document.getElementById("trappedEmotions");
    const limitingBeliefsEl = document.getElementById("limitingBeliefs");
    const additionalTechEl = document.getElementById("additionalTech");
    const commentsEl = document.getElementById("sessionComments");

    const trappedValue = (trappedEl ? trappedEl.value : "").trim();
    const limitingBeliefsValue = (limitingBeliefsEl ? limitingBeliefsEl.value : "").trim();
    const additionalTechValue = (additionalTechEl ? additionalTechEl.value : "").trim();
    const insightsValue = (insightsInput ? insightsInput.value : "").trim();
    const commentsValue = (commentsEl ? commentsEl.value : "").trim();
    const summaryValue = (customerSummaryInput ? customerSummaryInput.value : "").trim();

    const lines = [
      `# ${App.t("session.copy.title")}`,
      "",
      `**${App.t("session.copy.client")}** ${clientName}`,
      `**${App.t("session.copy.date")}** ${dateValue}`,
      `**${App.t("session.copy.type")}** ${sessionType}`,
      "",
      `## ${App.t("session.copy.issues")}`,
      issuesText
    ];

    // Order: Trapped Emotions, Limiting Beliefs, Additional Techniques, Important Points, Insights, Comments, Next Session
    if (trappedValue.length > 0) {
      lines.push("", `## ${stripRequired(App.t("session.form.trapped"))}`, trappedValue);
    }
    if (limitingBeliefsValue.length > 0) {
      lines.push("", `## ${App.t("session.form.limitingBeliefs")}`, limitingBeliefsValue);
    }
    if (additionalTechValue.length > 0) {
      lines.push("", `## ${App.t("session.form.additionalTech")}`, additionalTechValue);
    }
    if (insightsValue.length > 0) {
      lines.push("", `## ${App.t("session.form.insights")}`, insightsValue);
    }
    if (commentsValue.length > 0) {
      lines.push("", `## ${App.t("session.form.comments")}`, commentsValue);
    }
    if (summaryValue.length > 0) {
      lines.push("", `## ${App.t("session.form.nextSession")}`, summaryValue);
    }

    return lines.join("\n");
  }

  if (addIssueBtn) {
    addIssueBtn.addEventListener("click", () => {
      if (issues.length >= MAX_ISSUES) return;
      createIssueBlock();
      App.applyTranslations();
    });
  }

  createIssueBlock();
  App.applyTranslations();
  applyCopyLabels();

  if (copyButtons.length) {
    copyButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const targetId = button.dataset.copyTarget;
        if (!targetId) return;
        const text = buildFieldCopyText(targetId);
        const success = await copyTextToClipboard(text);
        if (success) App.showToast("", "toast.copied");
      });
    });
  }

  if (copySessionBtn) {
    copySessionBtn.addEventListener("click", async () => {
      const markdown = buildSessionMarkdown();
      const success = await copyTextToClipboard(markdown);
      if (success) App.showToast("", "toast.copied");
    });
  }

  if (editButton) {
    editButton.addEventListener("click", () => {
      setReadMode(false);
    });
  }

  if (inlinePhotoInput) {
    inlinePhotoInput.addEventListener("change", async () => {
      const file = inlinePhotoInput.files && inlinePhotoInput.files[0];
      if (!file) return;
      inlinePhotoData = await readFileAsDataURL(file);
      if (inlinePhotoPreview) {
        inlinePhotoPreview.src = inlinePhotoData;
        inlinePhotoPreview.classList.remove("is-hidden");
      }
    });
  }

  if (inlineSave) {
    inlineSave.addEventListener("click", async () => {
      const firstName = document.getElementById("inlineClientFirstName").value.trim();
      if (!firstName) {
        App.showToast("", "toast.errorRequired");
        return;
      }
      const lastName = document.getElementById("inlineClientLastName").value.trim();
      const birthDate = document.getElementById("inlineClientBirthDate").value || null;
      const age = birthDate ? Math.floor((Date.now() - new Date(birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
      const email = document.getElementById("inlineClientEmail").value.trim();
      const phone = document.getElementById("inlineClientPhone").value.trim();
      const notes = document.getElementById("inlineClientNotes").value.trim();
      const typeInput = document.querySelector("input[name='inlineClientType']:checked");
      const type = typeInput ? typeInput.value : "adult";
      const displayName = lastName ? `${firstName} ${lastName}` : firstName;

      const id = await PortfolioDB.addClient({
        name: displayName,
        firstName,
        lastName,
        birthDate,
        age,
        email,
        phone,
        notes,
        type,
        photoData: inlinePhotoData,
        createdAt: new Date().toISOString()
      });
      clientCache = (await loadClients(id)) || [];
      if (clientSelect) clientSelect.value = String(id);
      if (inlineForm) inlineForm.style.display = "none";
      resetInlineClientForm();
      updateClientSpotlight();
      App.showToast("", "toast.clientCreated");
    });
  }

  if (inlineCancel) {
    inlineCancel.addEventListener("click", () => {
      resetInlineClientForm();
      if (inlineForm) inlineForm.style.display = "none";
      if (clientSelect) clientSelect.value = "";
      updateClientSpotlight();
      updateHeartWallSection();
    });
  }

  if (sessionForm) {
    sessionForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const clientId = Number.parseInt(clientSelect.value, 10);
      if (!clientId) {
        App.showToast("", "toast.selectClient");
        return;
      }
      const date = sessionDate.value;
      if (!date) {
        App.showToast("", "toast.errorRequired");
        return;
      }

      const issuesPayload = getIssuesPayload();
      if (!validateIssues(issuesPayload)) {
        App.showToast("", "toast.issueMissing");
        return;
      }

      const sessionTypeInput = document.querySelector("input[name='sessionType']:checked");
      const sessionType = sessionTypeInput ? sessionTypeInput.value : "clinic";
      const trappedEmotions = document.getElementById("trappedEmotions").value.trim();
      const comments = document.getElementById("sessionComments").value.trim();
      const insights = insightsInput ? insightsInput.value.trim() : "";
      const limitingBeliefs = (document.getElementById("limitingBeliefs") || {}).value?.trim() || "";
      const additionalTech = (document.getElementById("additionalTech") || {}).value?.trim() || "";
      const customerSummary = customerSummaryInput ? customerSummaryInput.value.trim() : "";

      if (editingSession) {
        await PortfolioDB.updateSession({
          ...editingSession,
          clientId,
          date,
          sessionType,
          issues: issuesPayload,
          trappedEmotions,
          insights,
          limitingBeliefs,
          additionalTech,
          customerSummary,
          comments,
          updatedAt: new Date().toISOString()
        });
        App.showToast("", "toast.sessionUpdated");
      } else {
        await PortfolioDB.addSession({
          clientId,
          date,
          sessionType,
          issues: issuesPayload,
          trappedEmotions,
          insights,
          limitingBeliefs,
          additionalTech,
          customerSummary,
          comments,
          createdAt: new Date().toISOString()
        });
        App.showToast("", "toast.sessionSaved");
      }
      formSaving = true;
      setTimeout(() => {
        window.location.href = "./index.html";
      }, 600);
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
      if (!editingSession) return;
      const confirmed = await App.confirmDialog({
        titleKey: "confirm.deleteSession.title",
        messageKey: "confirm.deleteSession.body"
      });
      if (!confirmed) return;
      await PortfolioDB.deleteSession(editingSession.id);
      formSaving = true;
      App.showToast("", "toast.sessionDeleted");
      setTimeout(() => {
        window.location.href = "./sessions.html";
      }, 600);
    });
  }

  document.addEventListener("app:language", () => {
    App.applyTranslations();
    applyCopyLabels();
    if (editingSession) {
      updateSessionTitle(editingSession);
      setSubmitLabel("session.form.update");
    }
    if (isReadMode) resizeReadModeTextareas();
    updateClientSpotlight();
  });

  if (sessionId && Number.isInteger(sessionId)) {
    editingSession = await PortfolioDB.getSession(sessionId);
    if (editingSession) {
      populateSession(editingSession, issues, createIssueBlock);
      updateClientSpotlight();
      updateSessionTitle(editingSession);
      setSubmitLabel("session.form.update");
      if (deleteButton) deleteButton.classList.remove("is-hidden");
      setReadMode(true);
    }
  }
});

async function loadClients(selectId) {
  const clientSelect = document.getElementById("clientSelect");
  const clients = await PortfolioDB.getAllClients();
  if (!clientSelect) return;
  const placeholder = clientSelect.querySelector("option[value='']");
  clientSelect.innerHTML = "";
  if (placeholder) {
    clientSelect.appendChild(placeholder);
  } else {
    const option = document.createElement("option");
    option.value = "";
    option.setAttribute("data-i18n", "session.form.client.placeholder");
    option.textContent = App.t("session.form.client.placeholder");
    clientSelect.appendChild(option);
  }

  const newOption = document.createElement("option");
  newOption.value = "__new__";
  newOption.setAttribute("data-i18n", "session.form.client.new");
  newOption.textContent = App.t("session.form.client.new");
  clientSelect.appendChild(newOption);

  clients
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .forEach((client) => {
      const option = document.createElement("option");
      option.value = client.id;
      option.textContent = client.name;
      clientSelect.appendChild(option);
    });

  if (selectId) {
    clientSelect.value = String(selectId);
  }

  return clients;
}

function setupToggleGroup(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.addEventListener("click", (event) => {
    if (document.body.classList.contains("read-mode")) return;
    const card = event.target.closest(".toggle-card");
    if (!card) return;
    group.querySelectorAll(".toggle-card").forEach((el) => el.classList.remove("active"));
    card.classList.add("active");
    const input = card.querySelector("input");
    if (input) input.checked = true;
  });
}

function getSelectedClient(clientId, clients) {
  if (!clientId || !Array.isArray(clients)) return null;
  return clients.find((client) => client.id === clientId) || null;
}

function getClientDisplayName(client) {
  if (!client) return "";
  if (client.name) return client.name;
  const first = client.firstName || "";
  const last = client.lastName || client.lastInitial || "";
  return last ? `${first} ${last}` : first;
}

function updateClientSpotlight() {
  const spotlight = document.getElementById("clientSpotlight");
  const photo = document.getElementById("clientSpotlightPhoto");
  const placeholder = document.getElementById("clientSpotlightPlaceholder");
  const name = document.getElementById("clientSpotlightName");
  const clientSelect = document.getElementById("clientSelect");
  if (!spotlight || !clientSelect) return;
  const clientId = Number.parseInt(clientSelect.value, 10);
  if (!clientId) {
    spotlight.classList.add("is-hidden");
    return;
  }
  const selectedClient = getSelectedClient(clientId, clientCache);
  if (!selectedClient) {
    spotlight.classList.add("is-hidden");
    return;
  }
  spotlight.classList.remove("is-hidden");
  const displayName = getClientDisplayName(selectedClient);
  if (name) name.textContent = displayName || "-";
  const ageEl = document.getElementById("clientSpotlightAge");
  if (ageEl) {
    const age = selectedClient.birthDate
      ? Math.floor((Date.now() - new Date(selectedClient.birthDate)) / (365.25 * 24 * 60 * 60 * 1000))
      : selectedClient.age;
    if (age != null && !isNaN(age)) {
      ageEl.textContent = `${App.t("common.age")}: ${age}`;
      ageEl.classList.remove("is-hidden");
    } else {
      ageEl.classList.add("is-hidden");
    }
  }
  const initial = (displayName || selectedClient.firstName || "?").charAt(0).toUpperCase();
  if (selectedClient.photoData) {
    if (photo) {
      photo.src = selectedClient.photoData;
      photo.classList.remove("is-hidden");
    }
    if (placeholder) placeholder.classList.add("is-hidden");
  } else {
    if (photo) photo.classList.add("is-hidden");
    if (placeholder) {
      placeholder.textContent = initial || "?";
      placeholder.classList.remove("is-hidden");
    }
  }
}

function updateSessionTitle(session) {
  const titleEl = document.querySelector(".section-title");
  if (!titleEl || !session) return;
  const client = getSelectedClient(session.clientId, clientCache);
  const clientName = client ? getClientDisplayName(client) : null;
  const dateText = App.formatDate(session.date);
  if (clientName && dateText) {
    const titleText = `${clientName} • ${dateText}`;
    titleEl.textContent = titleText;
    document.title = titleText;
  } else if (clientName) {
    titleEl.textContent = clientName;
    document.title = clientName;
  } else {
    titleEl.textContent = App.t("session.title.edit");
    document.title = App.t("session.title.edit");
  }
}

function resetInlineClientForm() {
  const fields = [
    "inlineClientFirstName",
    "inlineClientLastName",
    "inlineClientEmail",
    "inlineClientPhone",
    "inlineClientNotes"
  ];
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const birthDateEl = document.getElementById("inlineClientBirthDate");
  if (birthDateEl) birthDateEl.value = "";
  const photoInput = document.getElementById("inlineClientPhoto");
  if (photoInput) photoInput.value = "";
  const photoPreview = document.getElementById("inlineClientPhotoPreview");
  if (photoPreview) photoPreview.classList.add("is-hidden");
  inlinePhotoData = "";
  document.querySelectorAll("input[name='inlineClientType']").forEach((input) => {
    const card = input.closest(".toggle-card");
    const isAdult = input.value === "adult";
    input.checked = isAdult;
    if (card) card.classList.toggle("active", isAdult);
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function populateSession(session, issues, createIssueBlock) {
  const clientSelect = document.getElementById("clientSelect");
  const sessionDate = document.getElementById("sessionDate");
  const trappedEmotions = document.getElementById("trappedEmotions");
  const comments = document.getElementById("sessionComments");
  const insights = document.getElementById("sessionInsights");
  const customerSummary = document.getElementById("customerSummary");

  if (clientSelect) clientSelect.value = String(session.clientId);
  if (sessionDate) sessionDate.value = session.date || "";
  if (trappedEmotions) trappedEmotions.value = session.trappedEmotions || "";
  if (comments) comments.value = session.comments || "";
  if (insights) insights.value = session.insights || "";
  if (customerSummary) customerSummary.value = session.customerSummary || "";
  const limitingBeliefsEl = document.getElementById("limitingBeliefs");
  if (limitingBeliefsEl) limitingBeliefsEl.value = session.limitingBeliefs || "";
  const additionalTechEl = document.getElementById("additionalTech");
  if (additionalTechEl) additionalTechEl.value = session.additionalTech || "";
  updateClientSpotlight();

  document.querySelectorAll("input[name='sessionType']").forEach((input) => {
    const card = input.closest(".toggle-card");
    if (!card) return;
    if (input.value === session.sessionType) {
      input.checked = true;
      card.classList.add("active");
    } else {
      card.classList.remove("active");
    }
  });

  issues.splice(0, issues.length);
  const issueList = document.getElementById("issueList");
  const issueSummaryList = document.getElementById("issueSummaryList");
  if (issueList) issueList.innerHTML = "";
  if (issueSummaryList) issueSummaryList.innerHTML = "";

  (session.issues || []).forEach((issue) => {
    createIssueBlock(issue);
  });
  if (!session.issues || !session.issues.length) {
    createIssueBlock();
  }

  const addIssueBtn = document.getElementById("addIssueBtn");
  if (addIssueBtn) {
    addIssueBtn.disabled = issues.length >= 3;
  }

  App.applyTranslations();
}
