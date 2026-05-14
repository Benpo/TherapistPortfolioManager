let clientCache = [];
let inlinePhotoData = "";
let editClientPhotoData = "";
let editingClientId = null;
let formDirty = false;
let formSaving = false;

document.addEventListener("DOMContentLoaded", async () => {
  await App.initCommon();

  // Phase 22 Plan 12 (Gap B, D3): expose dirty state for App.installNavGuard consumers.
  // Function form (not a snapshot) so the guard always reads the live state.
  window.PortfolioFormDirty = function () {
    return formDirty && !formSaving;
  };

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
  const cancelButton = document.getElementById("cancelSessionBtn");
  const copySessionBtn = document.getElementById("copySessionBtn");
  const exportSessionBtn = document.getElementById("exportSessionBtn");
  const copyButtons = document.querySelectorAll(".field-copy");
  const readModeTextareas = document.querySelectorAll(".session-textarea");
  const sessionIdParam = new URLSearchParams(window.location.search).get("sessionId");
  const prefillClientParam = new URLSearchParams(window.location.search).get("clientId");
  const sessionId = sessionIdParam ? Number.parseInt(sessionIdParam, 10) : null;
  const prefillClientId = !sessionId && prefillClientParam ? Number.parseInt(prefillClientParam, 10) : null;
  let editingSession = null;
  let isReadMode = false;
  let lastSavedSnapshot = null; // D-06: snapshot for revertSessionForm (Cancel/Revert)
  const NEW_CLIENT_VALUE = "__new__";

  // Birth date pickers (three-dropdown replacement for native date inputs)
  const inlineBirthDatePicker = App.initBirthDatePicker('inlineBirthDatePicker', 'inlineClientBirthDate');
  const editBirthDatePicker = App.initBirthDatePicker('editBirthDatePicker', 'editClientBirthDate');

  const heartShieldToggle = document.getElementById("heartShieldToggle");
  const heartShieldConditional = document.getElementById("heartShieldConditional");

  // Edit client modal references
  const editClientBtn = document.getElementById("editClientBtn");
  const editClientModal = document.getElementById("editClientModal");
  const editClientClose = document.getElementById("editClientClose");
  const editClientSaveBtn = document.getElementById("editClientSaveBtn");
  const editClientCancelBtn = document.getElementById("editClientCancelBtn");
  const editClientPhotoInput = document.getElementById("editClientPhoto");
  const editClientPhotoPreview = document.getElementById("editClientPhotoPreview");
  const editClientReferralSelect = document.getElementById("editClientReferralSource");
  const editClientReferralOther = document.getElementById("editClientReferralOther");

  // Unsaved changes protection
  if (sessionForm) {
    sessionForm.addEventListener("input", () => {
      formDirty = true;
      updateCancelButtonLabel(); // D-04: swap to "Discard changes" on first edit
    });
    sessionForm.addEventListener("change", () => {
      formDirty = true;
      updateCancelButtonLabel();
    });
  }
  window.addEventListener("beforeunload", (e) => {
    // Phase 22 Plan 12 (Gap B, D3): honour the one-shot bypass flag set by
    // App.installNavGuard so the user does not see a custom dialog AND the
    // browser-native one for the same intentional in-app navigation.
    if (window.PortfolioFormDirtyBypass) return;
    if (formDirty && !formSaving) {
      e.preventDefault();
    }
  });

  // Heart Shield toggle handler
  const heartShieldEmotionsField = document.getElementById("heartShieldEmotionsField");
  if (heartShieldToggle) {
    heartShieldToggle.addEventListener("change", () => {
      if (heartShieldConditional) {
        heartShieldConditional.classList.toggle("is-hidden", !heartShieldToggle.checked);
      }
      if (heartShieldEmotionsField) {
        heartShieldEmotionsField.classList.toggle("is-hidden", !heartShieldToggle.checked);
      }
      if (!heartShieldToggle.checked) {
        document.querySelectorAll("input[name='shieldRemoved']").forEach(r => r.checked = false);
      }
      formDirty = true;
    });
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

  // Phase 24-01 follow-up: moved inside DOMContentLoaded so inlineBirthDatePicker
  //   (declared `const` at line ~49) is reachable via closure. Previously top-level —
  //   the bare `inlineBirthDatePicker` reference resolved to window.inlineBirthDatePicker
  //   (the <div id="inlineBirthDatePicker"> via legacy named-element access) which
  //   has no .clear() method → TypeError → dropdown change handler aborted before
  //   reaching populateSpotlight. Root cause of the BLOCKER spotlight bug.
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
    if (inlineBirthDatePicker && typeof inlineBirthDatePicker.clear === "function") {
      inlineBirthDatePicker.clear();
    }
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

  function setReadMode(nextMode) {
    isReadMode = nextMode;
    document.body.classList.toggle("read-mode", isReadMode);
    if (submitButton) submitButton.classList.toggle("is-hidden", isReadMode);
    if (editButton) editButton.classList.toggle("is-hidden", !isReadMode);
    if (copySessionBtn) copySessionBtn.classList.toggle("is-hidden", !isReadMode);
    if (exportSessionBtn) exportSessionBtn.classList.toggle("is-hidden", !isReadMode);
    // D-02/D-06: Cancel button is visible in edit mode for existing sessions only.
    if (cancelButton) cancelButton.classList.toggle("is-hidden", isReadMode || !editingSession);
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

  // --- Edit client modal setup ---
  setupToggleGroup("editClientTypeGroup");

  async function openEditClientModal(clientId) {
    let client = getSelectedClient(clientId, clientCache);
    if (!client) {
      client = await PortfolioDB.getClient(clientId);
    }
    if (!client) return;

    editingClientId = clientId;
    editClientPhotoData = client.photoData || "";

    // Populate text fields
    const firstName = client.firstName || (client.name ? client.name.split(" ")[0] : "");
    const lastName = client.lastName || (client.name && client.name.includes(" ") ? client.name.split(" ").slice(1).join(" ") : "");
    const fNameEl = document.getElementById("editClientFirstName");
    const lNameEl = document.getElementById("editClientLastName");
    const emailEl = document.getElementById("editClientEmail");
    const phoneEl = document.getElementById("editClientPhone");
    const notesEl = document.getElementById("editClientNotes");
    if (fNameEl) fNameEl.value = firstName;
    if (lNameEl) lNameEl.value = lastName;
    if (editBirthDatePicker && client.birthDate) {
      editBirthDatePicker.setValue(client.birthDate);
    } else if (editBirthDatePicker) {
      editBirthDatePicker.clear();
    }
    if (emailEl) emailEl.value = client.email || "";
    if (phoneEl) phoneEl.value = client.phone || "";
    if (notesEl) notesEl.value = client.notes || "";

    // Set type radio
    const typeValue = client.type || "adult";
    document.querySelectorAll("input[name='editClientType']").forEach((input) => {
      const card = input.closest(".toggle-card");
      const isSelected = input.value === typeValue;
      input.checked = isSelected;
      if (card) card.classList.toggle("active", isSelected);
    });

    // Set referral source
    const referralValue = client.referralSource || "";
    const referralOptions = editClientReferralSelect ? Array.from(editClientReferralSelect.options).map(o => o.value) : [];
    if (editClientReferralSelect) {
      if (referralOptions.includes(referralValue)) {
        editClientReferralSelect.value = referralValue;
      } else if (referralValue) {
        editClientReferralSelect.value = "other";
        if (editClientReferralOther) {
          editClientReferralOther.value = referralValue;
          editClientReferralOther.style.display = "";
        }
      } else {
        editClientReferralSelect.value = "";
      }
      if (editClientReferralOther && editClientReferralSelect.value !== "other") {
        editClientReferralOther.style.display = "none";
        editClientReferralOther.value = "";
      }
    }

    // Set photo preview
    if (editClientPhotoPreview) {
      if (editClientPhotoData) {
        editClientPhotoPreview.src = editClientPhotoData;
        editClientPhotoPreview.classList.remove("is-hidden");
      } else {
        editClientPhotoPreview.src = "";
        editClientPhotoPreview.classList.add("is-hidden");
      }
    }

    if (editClientModal) editClientModal.classList.remove("is-hidden");
    App.lockBodyScroll();
    App.applyTranslations(editClientModal);
  }

  function closeEditClientModal() {
    if (editClientModal) editClientModal.classList.add("is-hidden");
    App.unlockBodyScroll();
    editClientPhotoData = "";
    editingClientId = null;
    // Reset photo input
    if (editClientPhotoInput) editClientPhotoInput.value = "";
    if (editClientPhotoPreview) {
      editClientPhotoPreview.src = "";
      editClientPhotoPreview.classList.add("is-hidden");
    }
  }

  if (editClientBtn) {
    editClientBtn.addEventListener("click", () => {
      const cid = Number.parseInt(clientSelect.value, 10);
      if (cid) openEditClientModal(cid);
    });
  }

  if (editClientClose) {
    editClientClose.addEventListener("click", closeEditClientModal);
  }

  if (editClientCancelBtn) {
    editClientCancelBtn.addEventListener("click", closeEditClientModal);
  }

  // Edit client modal is a form modal — overlay-close DISABLED (data loss protection)
  // Close only via Cancel/X button

  if (editClientPhotoInput) {
    editClientPhotoInput.addEventListener("change", async () => {
      const file = editClientPhotoInput.files && editClientPhotoInput.files[0];
      if (!file) return;
      try {
        const rawDataURL = await App.readFileAsDataURL(file);
        CropModule.openCropModal(rawDataURL, function (croppedDataUrl) {
          editClientPhotoData = croppedDataUrl;
          if (editClientPhotoPreview) {
            editClientPhotoPreview.src = croppedDataUrl;
            editClientPhotoPreview.classList.remove("is-hidden");
          }
        }, function () {
          // Cancel — reset file input
          if (editClientPhotoInput) editClientPhotoInput.value = "";
        }, false);
      } catch (err) {
        console.error("Photo read failed:", err);
        App.showToast("", "toast.errorGeneric");
      }
    });
  }

  if (editClientReferralSelect) {
    editClientReferralSelect.addEventListener("change", () => {
      if (editClientReferralOther) {
        editClientReferralOther.style.display = editClientReferralSelect.value === "other" ? "" : "none";
        if (editClientReferralSelect.value !== "other") {
          editClientReferralOther.value = "";
        }
      }
    });
  }

  if (editClientSaveBtn) {
    editClientSaveBtn.addEventListener("click", async () => {
      const firstName = (document.getElementById("editClientFirstName") || {}).value?.trim() || "";
      if (!firstName) {
        App.showToast("", "toast.errorRequired");
        return;
      }
      const lastName = (document.getElementById("editClientLastName") || {}).value?.trim() || "";
      const birthDate = (document.getElementById("editClientBirthDate") || {}).value || null;
      const age = birthDate ? Math.floor((Date.now() - new Date(birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
      const email = (document.getElementById("editClientEmail") || {}).value?.trim() || "";
      const phone = (document.getElementById("editClientPhone") || {}).value?.trim() || "";
      const notes = (document.getElementById("editClientNotes") || {}).value?.trim() || "";
      const typeInput = document.querySelector("input[name='editClientType']:checked");
      const type = typeInput ? typeInput.value : "adult";
      const displayName = lastName ? `${firstName} ${lastName}` : firstName;

      let referralSource = editClientReferralSelect ? editClientReferralSelect.value : "";
      if (referralSource === "other" && editClientReferralOther) {
        referralSource = editClientReferralOther.value.trim() || "other";
      }

      const existing = getSelectedClient(editingClientId, clientCache) || await PortfolioDB.getClient(editingClientId);
      if (!existing) return;

      await PortfolioDB.updateClient({
        ...existing,
        name: displayName,
        firstName,
        lastName,
        birthDate,
        age,
        email,
        phone,
        notes,
        type,
        referralSource,
        photoData: editClientPhotoData,
        updatedAt: new Date().toISOString()
      });

      // Reload clients and re-select the current one to refresh the cache
      const savedClientId = editingClientId;
      closeEditClientModal();
      clientCache = (await loadClients(savedClientId)) || [];
      await populateSpotlight(savedClientId);
      App.showToast("", "toast.clientSaved");
    });
  }
  // --- End edit client modal setup ---

  if (sessionDate) {
    sessionDate.valueAsDate = new Date();
    sessionDate.focus();
  }

  setupToggleGroup("sessionTypeGroup");
  setupToggleGroup("inlineClientTypeGroup");

  clientCache = (await loadClients(prefillClientId)) || [];
  await populateSpotlight(prefillClientId || (clientSelect ? clientSelect.value : null));
  if (clientSelect) {
    clientSelect.addEventListener("change", () => {
      const isNew = clientSelect.value === NEW_CLIENT_VALUE;
      if (inlineForm) {
        inlineForm.style.display = isNew ? "block" : "none";
      }
      if (!isNew) {
        resetInlineClientForm();
      }
      populateSpotlight(clientSelect.value);
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

  // D-06 (Phase 24): capture form state for revertSessionForm. Mirrors the IDB session
  //   shape so revert can call populateSession(snapshot, ...) to restore.
  function snapshotFormState() {
    const sessionDateEl = document.getElementById("sessionDate");
    const trappedEmotionsEl = document.getElementById("trappedEmotions");
    const commentsEl = document.getElementById("sessionComments");
    const insightsEl = document.getElementById("sessionInsights");
    const customerSummaryEl = document.getElementById("customerSummary");
    const limitingBeliefsEl = document.getElementById("limitingBeliefs");
    const additionalTechEl = document.getElementById("additionalTech");
    const heartShieldToggleEl = document.getElementById("heartShieldToggle");
    const heartShieldEmotionsEl = document.getElementById("heartShieldEmotions");
    const sessionTypeRadio = document.querySelector("input[name='sessionType']:checked");
    const shieldRemovedRadio = document.querySelector("input[name='shieldRemoved']:checked");
    return {
      clientId: clientSelect ? Number.parseInt(clientSelect.value, 10) || null : null,
      date: sessionDateEl ? sessionDateEl.value : "",
      sessionType: sessionTypeRadio ? sessionTypeRadio.value : "",
      trappedEmotions: trappedEmotionsEl ? trappedEmotionsEl.value : "",
      comments: commentsEl ? commentsEl.value : "",
      insights: insightsEl ? insightsEl.value : "",
      customerSummary: customerSummaryEl ? customerSummaryEl.value : "",
      limitingBeliefs: limitingBeliefsEl ? limitingBeliefsEl.value : "",
      additionalTech: additionalTechEl ? additionalTechEl.value : "",
      isHeartShield: heartShieldToggleEl ? !!heartShieldToggleEl.checked : false,
      heartShieldEmotions: heartShieldEmotionsEl ? heartShieldEmotionsEl.value : "",
      shieldRemoved: shieldRemovedRadio ? shieldRemovedRadio.value === "yes" : null,
      issues: getIssuesPayload().map((issue) => ({ name: issue.name, before: issue.before, after: issue.after })),
    };
  }

  // D-06 (Phase 24): revert form to last-saved snapshot. Delegates to populateSession for
  //   the heavy lifting (handles all textareas, issues teardown/rebuild, spotlight refresh).
  function revertSessionForm() {
    if (!lastSavedSnapshot) return;
    populateSession(lastSavedSnapshot, issues, createIssueBlock);
    formDirty = false;
    updateCancelButtonLabel();
  }

  // D-04 (Phase 24): asymmetric Cancel button label. "Cancel" when clean, "Discard changes" when dirty.
  function updateCancelButtonLabel() {
    if (!cancelButton) return;
    const labelSpan = cancelButton.querySelector(".button-label");
    if (!labelSpan) return;
    const isDirty = !!(window.PortfolioFormDirty && window.PortfolioFormDirty());
    const key = isDirty ? "session.discard" : "confirm.cancel";
    if (labelSpan.getAttribute("data-i18n") !== key) {
      labelSpan.setAttribute("data-i18n", key);
    }
    labelSpan.textContent = App.t(key);
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

  function stripRequired(label) {
    return label.replace(/\s*\*$/, "");
  }

  function buildSessionMarkdown() {
    // Phase 23 (23-09): Client/Date/Type metadata lines removed -- they are
    // redundant with the title block in the PDF (drawPage1Header centers
    // clientName + sessionDate + sessionType at the top of page 1, reading
    // them directly from sessionData function args, NOT from this markdown).
    // The 3 corresponding i18n keys (session.copy.client/date/type) are
    // intentionally KEPT in the i18n files in case other consumers use them.

    // Issues section: always included, change shown when both before and after exist.
    // Phase 23 (23-09): scale labels are i18n'd ("Before/After/Change", "Vorher/Nachher/Änderung", etc.).
    // "Change" replaces the prior "Delta" wording (too scientific) per Ben's request.
    const beforeLabel = App.t("session.copy.scale.before");
    const afterLabel = App.t("session.copy.scale.after");
    const changeLabel = App.t("session.copy.scale.change");
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
              return `- ${issue.name} — ${beforeLabel}: ${before}, ${afterLabel}: ${after}, ${changeLabel}: ${sign}${delta}`;
            }
            return `- ${issue.name} — ${beforeLabel}: ${before}, ${afterLabel}: ${after}`;
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

    // Heart Shield status for copy
    const heartShieldChecked = heartShieldToggle ? heartShieldToggle.checked : false;
    const shieldRemovedCopyInput = document.querySelector("input[name='shieldRemoved']:checked");
    const shieldRemovedCopyValue = shieldRemovedCopyInput ? shieldRemovedCopyInput.value : null;

    const lines = [
      `# ${App.t("session.copy.title")}`
    ];

    // Phase 23 (23-10): heart shield is now its own ## section in the body --
    // previously a bare label-and-value line ("**Heart Shield Session** No")
    // that, after the 23-08 ** stripping, displayed as the raw text
    // "מפגש מגננת לב לא" between the title and the issues section, looking
    // like stray junk. Promoting it to a ## heading + body line aligns it with
    // every other section's structure.
    if (heartShieldChecked) {
      lines.push(
        "",
        `## ${stripRequired(App.getSectionLabel("heartShield", "session.form.heartShield"))}`,
        shieldRemovedCopyValue === "yes"
          ? App.t("session.form.shieldRemoved.yes")
          : App.t("session.form.shieldRemoved.no")
      );
    }

    lines.push(
      "",
      `## ${stripRequired(App.getSectionLabel("issues", "session.form.issuesHeading"))}`,
      issuesText
    );

    // Heart Shield Emotions (only when Heart Shield is on)
    const heartShieldEmotionsEl = document.getElementById("heartShieldEmotions");
    const heartShieldEmotionsValue = (heartShieldEmotionsEl ? heartShieldEmotionsEl.value : "").trim();
    if (heartShieldChecked && heartShieldEmotionsValue.length > 0) {
      lines.push("", `## ${stripRequired(App.getSectionLabel("heartShieldEmotions", "session.form.heartShieldEmotions"))}`, heartShieldEmotionsValue);
    }

    // Phase 23 (23-10): every ## heading is wrapped with stripRequired() so any
    // section label that ends with the form-required marker "*" (currently
    // session.form.issuesHeading; potentially others if therapists customize
    // titles via Settings or new required sections are added) renders without
    // the literal asterisk leaking into the section title. stripRequired() is
    // a no-op on labels that don't end with "*", so it's safe to apply
    // defensively to every heading call site.
    // Order: Trapped Emotions, Limiting Beliefs, Additional Techniques, Important Points, Insights, Comments, Next Session
    if (trappedValue.length > 0) {
      lines.push("", `## ${stripRequired(App.getSectionLabel("trapped", "session.form.trapped"))}`, trappedValue);
    }
    if (limitingBeliefsValue.length > 0) {
      lines.push("", `## ${stripRequired(App.getSectionLabel("limitingBeliefs", "session.form.limitingBeliefs"))}`, limitingBeliefsValue);
    }
    if (additionalTechValue.length > 0) {
      lines.push("", `## ${stripRequired(App.getSectionLabel("additionalTech", "session.form.additionalTech"))}`, additionalTechValue);
    }
    if (insightsValue.length > 0) {
      lines.push("", `## ${stripRequired(App.getSectionLabel("insights", "session.form.insights"))}`, insightsValue);
    }
    if (commentsValue.length > 0) {
      lines.push("", `## ${stripRequired(App.getSectionLabel("comments", "session.form.comments"))}`, commentsValue);
    }
    if (summaryValue.length > 0) {
      lines.push("", `## ${stripRequired(App.getSectionLabel("nextSession", "session.form.nextSession"))}`, summaryValue);
    }

    return lines.join("\n");
  }

  // ============================================================
  // Section visibility (REQ-3, REQ-5 amended 2026-04-28)
  // ============================================================
  // - Enabled: visible, badge hidden, fully editable
  // - Disabled + new session: hidden
  // - Disabled + past session + has data: visible, badge visible, FULLY EDITABLE
  //   (no `disabled` / `readonly` attributes — therapist may edit/clear)
  // - Disabled + past session + no data: hidden
  function sectionHasData(sectionKey) {
    switch (sectionKey) {
      case "trapped": {
        const el = document.getElementById("trappedEmotions");
        return !!(el && el.value && el.value.trim().length > 0);
      }
      case "insights": {
        const el = document.getElementById("sessionInsights");
        return !!(el && el.value && el.value.trim().length > 0);
      }
      case "limitingBeliefs": {
        const el = document.getElementById("limitingBeliefs");
        return !!(el && el.value && el.value.trim().length > 0);
      }
      case "additionalTech": {
        const el = document.getElementById("additionalTech");
        return !!(el && el.value && el.value.trim().length > 0);
      }
      case "comments": {
        const el = document.getElementById("sessionComments");
        return !!(el && el.value && el.value.trim().length > 0);
      }
      case "nextSession": {
        const el = document.getElementById("customerSummary");
        return !!(el && el.value && el.value.trim().length > 0);
      }
      case "heartShieldEmotions": {
        const el = document.getElementById("heartShieldEmotions");
        return !!(el && el.value && el.value.trim().length > 0);
      }
      case "heartShield": {
        return !!(heartShieldToggle && heartShieldToggle.checked);
      }
      case "issues": {
        return Array.isArray(issues) && issues.length > 0;
      }
      default:
        return false;
    }
  }

  function applySectionVisibility(isPastSession) {
    const wrappers = document.querySelectorAll("[data-section-key]");
    wrappers.forEach((wrapper) => {
      const sectionKey = wrapper.dataset.sectionKey;
      if (!sectionKey) return;
      const enabled = App.isSectionEnabled(sectionKey);
      const badge = wrapper.querySelector(".disabled-indicator-badge");
      if (enabled) {
        wrapper.classList.remove("is-hidden");
        if (badge) badge.classList.add("is-hidden");
        return;
      }
      // Disabled — depends on past-session + data
      if (!isPastSession) {
        wrapper.classList.add("is-hidden");
        if (badge) badge.classList.add("is-hidden");
        return;
      }
      const hasData = sectionHasData(sectionKey);
      if (hasData) {
        // REQ-5 amendment 2026-04-28: visible, badge shown, inputs remain
        // fully editable — do NOT add disabled / readonly attributes here.
        wrapper.classList.remove("is-hidden");
        if (badge) badge.classList.remove("is-hidden");
      } else {
        wrapper.classList.add("is-hidden");
        if (badge) badge.classList.add("is-hidden");
      }
    });
  }

  // Phase 22 GAP fix: write the therapist's customLabel into the visible
  // form labels. applyTranslations() resets these to the i18n default, so
  // this MUST run after every applyTranslations pass that affects this page.
  // Uses .textContent (never innerHTML) — customLabel is user-controlled
  // (T-22-02-01).
  function applySectionLabels() {
    const wrappers = document.querySelectorAll("[data-section-key]");
    wrappers.forEach((wrapper) => {
      const sectionKey = wrapper.dataset.sectionKey;
      if (!sectionKey) return;
      const labelEl = wrapper.querySelector(".label[data-i18n]");
      if (!labelEl) return;
      const defaultI18nKey = labelEl.getAttribute("data-i18n");
      const resolvedLabel = App.getSectionLabel(sectionKey, defaultI18nKey);
      labelEl.textContent = resolvedLabel;

      // Phase 22-14.3 — keep descendant input/textarea placeholders in sync
      // with the renamed label. When the therapist has a custom label,
      // override the placeholder; when there is no custom label, restore
      // the placeholder from its data-i18n-placeholder key. Use .placeholder
      // (attribute, not innerHTML) — customLabel is user-controlled and
      // assigning to .placeholder is safe (T-22-02-01 mitigation).
      const isCustom = resolvedLabel !== App.t(defaultI18nKey);
      const fields = wrapper.querySelectorAll("input, textarea");
      fields.forEach((field) => {
        const phKey = field.getAttribute("data-i18n-placeholder");
        if (isCustom) {
          field.placeholder = resolvedLabel;
        } else if (phKey) {
          field.placeholder = App.t(phKey);
        }
      });
    });
    // Keep the heart-shield accordion-header in sync — it shares the same
    // i18n key as the inner section label, so a rename must show on both.
    const heartShieldHeader = document.querySelector(
      '[data-accordion="heart-shield"] > .accordion-header[data-i18n]'
    );
    if (heartShieldHeader) {
      heartShieldHeader.textContent = App.getSectionLabel(
        "heartShield",
        "session.form.heartShield"
      );
    }
  }

  // Cross-tab + same-tab settings change → re-apply visibility AND labels.
  document.addEventListener("app:settings-changed", () => {
    applySectionVisibility(!!editingSession);
    applySectionLabels();
  });

  // ============================================================
  // Export modal (REQ-7 to REQ-15, REQ-17, REQ-19)
  // 3-step flow: Step 1 selection → Step 2 edit/preview → Step 3 outputs
  // No Translate CTA (REQ-16 removed 2026-04-28)
  // ============================================================
  const EXPORT_DEFAULT_CHECKED = {
    trapped: true,
    insights: true,
    limitingBeliefs: true,
    additionalTech: true,
    heartShieldEmotions: true, // only if data present (re-checked at render)
    nextSession: true,
    issues: false,
    comments: false,
    heartShield: false
  };

  const EXPORT_SECTION_ORDER = [
    "trapped",
    "insights",
    "limitingBeliefs",
    "additionalTech",
    "heartShield",
    "heartShieldEmotions",
    "issues",
    "comments",
    "nextSession"
  ];

  function exportDefaultI18nKey(sectionKey) {
    switch (sectionKey) {
      case "trapped": return "session.form.trapped";
      case "insights": return "session.form.insights";
      case "limitingBeliefs": return "session.form.limitingBeliefs";
      case "additionalTech": return "session.form.additionalTech";
      case "heartShield": return "session.form.heartShield";
      case "heartShieldEmotions": return "session.form.heartShieldEmotions";
      case "issues": return "session.form.issuesHeading";
      case "comments": return "session.form.comments";
      case "nextSession": return "session.form.nextSession";
      default: return sectionKey;
    }
  }

  function getCurrentSessionDataForExport() {
    const clientName = getClientNameForCopy();
    const sessionDateISO = (sessionDate && sessionDate.value) ? sessionDate.value : "";
    const sessionDateFormatted = sessionDateISO ? App.formatDate(sessionDateISO) : "-";
    const sessionTypeInput = document.querySelector("input[name='sessionType']:checked");
    const sessionTypeLabel = App.formatSessionType(sessionTypeInput ? sessionTypeInput.value : "");
    return { clientName, sessionDateISO, sessionDateFormatted, sessionTypeLabel };
  }

  function buildFilteredSessionMarkdown(selectedKeys) {
    // Build a markdown document filtered to only the section keys checked in Step 1.
    // Phase 23 (23-09 follow-up): client/date/type lines removed — they're redundant with
    // the PDF title block, which reads sessionData.clientName/sessionDate/sessionType
    // directly from the function args, not from the markdown body.
    const selected = new Set(selectedKeys);

    const heartShieldChecked = heartShieldToggle ? heartShieldToggle.checked : false;
    const shieldRemovedInput = document.querySelector("input[name='shieldRemoved']:checked");
    const shieldRemovedValue = shieldRemovedInput ? shieldRemovedInput.value : null;

    const lines = [
      `# ${App.t("session.copy.title")}`
    ];

    // Phase 23 (23-10): heart shield is now its own ## section in the body --
    // previously a bare label-and-value line ("**Heart Shield Session** No")
    // that, after the 23-08 ** stripping, displayed as raw "מפגש מגננת לב לא"
    // text between the title and the issues section, looking like stray junk.
    // Promoting it to a ## heading + body line aligns it with every other
    // section's structure. (Same change as buildSessionMarkdown.)
    if (heartShieldChecked && selected.has("heartShield")) {
      lines.push(
        "",
        `## ${stripRequired(App.getSectionLabel("heartShield", "session.form.heartShield"))}`,
        shieldRemovedValue === "yes"
          ? App.t("session.form.shieldRemoved.yes")
          : App.t("session.form.shieldRemoved.no")
      );
    }

    // Phase 23 (23-10): every ## heading is wrapped with stripRequired() so any
    // section label that ends with the form-required marker "*" (currently
    // session.form.issuesHeading; potentially others if therapists customize
    // titles via Settings or new required sections are added) renders without
    // the literal asterisk leaking into the section title. stripRequired() is
    // a no-op on labels that don't end with "*", so it's safe to apply
    // defensively to every heading call site.
    if (selected.has("issues")) {
      // Phase 23 (23-09): i18n'd scale labels (see buildSessionMarkdown for details).
      const beforeLabel = App.t("session.copy.scale.before");
      const afterLabel = App.t("session.copy.scale.after");
      const changeLabel = App.t("session.copy.scale.change");
      const issuesPayload = getIssuesPayload();
      const issuesText = issuesPayload.length
        ? issuesPayload.map((issue) => {
            const hasBefore = issue.before !== null && issue.before !== undefined;
            const hasAfter = issue.after !== null && issue.after !== undefined;
            const before = hasBefore ? issue.before : "-";
            const after = hasAfter ? issue.after : "-";
            if (hasBefore && hasAfter) {
              const delta = issue.after - issue.before;
              const sign = delta > 0 ? "+" : "";
              return `- ${issue.name} — ${beforeLabel}: ${before}, ${afterLabel}: ${after}, ${changeLabel}: ${sign}${delta}`;
            }
            return `- ${issue.name} — ${beforeLabel}: ${before}, ${afterLabel}: ${after}`;
          }).join("\n")
        : `- ${App.t("session.copy.empty")}`;
      lines.push("", `## ${stripRequired(App.getSectionLabel("issues", "session.form.issuesHeading"))}`, issuesText);
    }

    const heartShieldEmotionsEl = document.getElementById("heartShieldEmotions");
    const heartShieldEmotionsValue = (heartShieldEmotionsEl ? heartShieldEmotionsEl.value : "").trim();
    if (selected.has("heartShieldEmotions") && heartShieldChecked && heartShieldEmotionsValue.length > 0) {
      lines.push("", `## ${stripRequired(App.getSectionLabel("heartShieldEmotions", "session.form.heartShieldEmotions"))}`, heartShieldEmotionsValue);
    }

    const trappedValue = (document.getElementById("trappedEmotions") || {}).value || "";
    if (selected.has("trapped") && trappedValue.trim().length > 0) {
      lines.push("", `## ${stripRequired(App.getSectionLabel("trapped", "session.form.trapped"))}`, trappedValue.trim());
    }
    const limitingBeliefsValue = (document.getElementById("limitingBeliefs") || {}).value || "";
    if (selected.has("limitingBeliefs") && limitingBeliefsValue.trim().length > 0) {
      lines.push("", `## ${stripRequired(App.getSectionLabel("limitingBeliefs", "session.form.limitingBeliefs"))}`, limitingBeliefsValue.trim());
    }
    const additionalTechValue = (document.getElementById("additionalTech") || {}).value || "";
    if (selected.has("additionalTech") && additionalTechValue.trim().length > 0) {
      lines.push("", `## ${stripRequired(App.getSectionLabel("additionalTech", "session.form.additionalTech"))}`, additionalTechValue.trim());
    }
    const insightsValue = (insightsInput ? insightsInput.value : "").trim();
    if (selected.has("insights") && insightsValue.length > 0) {
      lines.push("", `## ${stripRequired(App.getSectionLabel("insights", "session.form.insights"))}`, insightsValue);
    }
    const commentsValue = (document.getElementById("sessionComments") || {}).value || "";
    if (selected.has("comments") && commentsValue.trim().length > 0) {
      lines.push("", `## ${stripRequired(App.getSectionLabel("comments", "session.form.comments"))}`, commentsValue.trim());
    }
    const summaryValue = (customerSummaryInput ? customerSummaryInput.value : "").trim();
    if (selected.has("nextSession") && summaryValue.length > 0) {
      lines.push("", `## ${stripRequired(App.getSectionLabel("nextSession", "session.form.nextSession"))}`, summaryValue);
    }

    return lines.join("\n");
  }

  let _exportState = null;

  function exportRenderStep1Rows(sessionData) {
    const container = document.getElementById("exportStep1Rows");
    if (!container) return;
    container.innerHTML = "";
    EXPORT_SECTION_ORDER.forEach((key) => {
      const enabled = App.isSectionEnabled(key);
      const label = App.getSectionLabel(key, exportDefaultI18nKey(key));
      const hasData = sectionHasData(key);
      let defaultChecked = !!EXPORT_DEFAULT_CHECKED[key];
      if (key === "heartShieldEmotions") defaultChecked = defaultChecked && hasData;

      const row = document.createElement("label");
      row.className = "export-section-row";
      if (!enabled) row.classList.add("is-disabled");

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.dataset.sectionKey = key;
      cb.checked = enabled ? defaultChecked : false;
      cb.disabled = !enabled;

      const labelSpan = document.createElement("span");
      labelSpan.className = "export-section-label";
      labelSpan.textContent = label; // textContent — never innerHTML (T-22-06-02 mitigation)

      row.appendChild(cb);
      row.appendChild(labelSpan);

      if (!enabled) {
        const badge = document.createElement("span");
        badge.className = "disabled-indicator-badge";
        badge.textContent = App.t("settings.indicator.disabled");
        row.appendChild(badge);
        row.title = App.t("settings.indicator.disabled");
      }
      container.appendChild(row);
    });
  }

  function exportSetActiveStep(n) {
    const modal = document.getElementById("exportModal");
    if (!modal) return;
    _exportState.currentStep = n;

    modal.querySelectorAll(".export-step").forEach((stepEl) => {
      const stepNum = Number(stepEl.dataset.step);
      stepEl.classList.toggle("is-active", stepNum === n);
    });
    modal.querySelectorAll(".export-step-dot").forEach((dot) => {
      const stepNum = Number(dot.dataset.step);
      dot.classList.toggle("is-active", stepNum === n);
      dot.classList.toggle("is-completed", stepNum < n);
    });
    // Mirror is-active / is-completed onto the new .export-step-pill wrapper
    // (added in Plan 22-11) so the label below/beside the dot picks up the
    // active-step colour treatment.
    modal.querySelectorAll(".export-step-pill").forEach((pill) => {
      const stepNum = Number(pill.dataset.step);
      pill.classList.toggle("is-active", stepNum === n);
      pill.classList.toggle("is-completed", stepNum < n);
    });
    modal.querySelectorAll(".export-step-connector").forEach((conn, idx) => {
      // connector idx 0 sits between step 1 and 2; idx 1 between step 2 and 3
      conn.classList.toggle("is-completed", idx < n - 1);
    });
    const indicator = modal.querySelector(".export-step-indicator");
    if (indicator) indicator.setAttribute("aria-valuenow", String(n));

    const backBtn = document.getElementById("exportBackBtn");
    const nextBtn = document.getElementById("exportNextBtn");
    if (backBtn) backBtn.classList.toggle("is-hidden", n === 1);
    if (nextBtn) {
      if (n === 1) {
        nextBtn.setAttribute("data-i18n", "export.next1");
        nextBtn.textContent = App.t("export.next1");
      } else if (n === 2) {
        nextBtn.setAttribute("data-i18n", "export.next2");
        nextBtn.textContent = App.t("export.next2");
      } else {
        nextBtn.setAttribute("data-i18n", "export.done");
        nextBtn.textContent = App.t("export.done");
      }
    }
  }

  function exportUpdatePreview() {
    const editor = document.getElementById("exportEditor");
    const preview = document.getElementById("exportPreview");
    if (!editor || !preview) return;
    if (window.MdRender && typeof window.MdRender.render === "function") {
      // MdRender.render escapes HTML before structural rules — safe to assign.
      preview.innerHTML = window.MdRender.render(editor.value);
    } else {
      preview.textContent = editor.value;
    }
  }

  function exportApplyMobileTabs() {
    const modal = document.getElementById("exportModal");
    if (!modal) return;
    const tabs = modal.querySelector(".export-mobile-tabs");
    const editor = document.getElementById("exportEditor");
    const preview = document.getElementById("exportPreview");
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (!tabs) return;
    tabs.classList.toggle("is-hidden", !isMobile);
    if (!isMobile) {
      // Desktop: both visible side-by-side
      if (editor) editor.classList.remove("is-hidden");
      if (preview) preview.classList.remove("is-hidden");
      return;
    }
    // Mobile: respect active tab (default to edit)
    const activeTab = tabs.querySelector(".tab-btn.is-active");
    const which = activeTab ? activeTab.dataset.tab : "edit";
    if (editor) editor.classList.toggle("is-hidden", which !== "edit");
    if (preview) preview.classList.toggle("is-hidden", which !== "preview");
  }

  function exportWireMobileTabs() {
    const modal = document.getElementById("exportModal");
    if (!modal) return;
    const tabs = modal.querySelectorAll(".export-mobile-tabs .tab-btn");
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        modal.querySelectorAll(".export-mobile-tabs .tab-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        exportApplyMobileTabs();
      });
    });
  }

  async function exportCloseDialog(skipDirtyCheck) {
    const modal = document.getElementById("exportModal");
    if (!modal) return;
    if (!skipDirtyCheck && _exportState && _exportState.hasEditedPreview) {
      const ok = await App.confirmDialog({
        titleKey: "export.discard.title",
        messageKey: "export.discard.body",
        confirmKey: "export.discard.yes",
        cancelKey: "export.discard.no"
      });
      if (!ok) return;
    }
    modal.classList.add("is-hidden");
    App.unlockBodyScroll();
    if (_exportState && _exportState.cleanup) {
      _exportState.cleanup();
    }
    _exportState = null;
  }

  async function exportHandleDownloadPdf() {
    const btn = document.getElementById("exportDownloadPdf");
    const subtitle = document.getElementById("exportPdfSubtitle");
    if (!btn || !window.PDFExport) {
      App.showToast("", "export.pdf.failed");
      return;
    }
    try {
      btn.disabled = true;
      if (subtitle) subtitle.textContent = App.t("export.preparing");
      const editor = document.getElementById("exportEditor");
      const data = _exportState ? _exportState.sessionData : getCurrentSessionDataForExport();
      const blob = await window.PDFExport.buildSessionPDF({
        clientName: data.clientName,
        sessionDate: data.sessionDateFormatted,
        sessionType: data.sessionTypeLabel,
        markdown: editor ? editor.value : ""
      }, {
        uiLang: localStorage.getItem("portfolioLang") || "en",
        onProgress: function (phase) {
          if (subtitle) {
            subtitle.textContent = phase === "done" ? "" : App.t("export.preparing");
          }
        }
      });
      const slug = window.PDFExport.slugify(data.clientName);
      const fname = slug + "_" + (data.sessionDateISO || "session") + ".pdf";
      window.PDFExport.triggerDownload(blob, fname);
      if (subtitle) subtitle.textContent = "";
    } catch (err) {
      console.error("PDF generation failed:", err);
      App.showToast("", "export.pdf.failed");
      if (subtitle) subtitle.textContent = "";
    } finally {
      btn.disabled = false;
    }
  }

  function exportHandleDownloadMd() {
    const btn = document.getElementById("exportDownloadMd");
    const editor = document.getElementById("exportEditor");
    if (!btn || !editor) return;
    const data = _exportState ? _exportState.sessionData : getCurrentSessionDataForExport();
    const blob = new Blob([editor.value], { type: "text/markdown;charset=utf-8" });
    const slug = (window.PDFExport && typeof window.PDFExport.slugify === "function")
      ? window.PDFExport.slugify(data.clientName)
      : (data.clientName || "Session").replace(/[<>:"\/\\|?*\x00-\x1F]/g, "");
    const fname = slug + "_" + (data.sessionDateISO || "session") + ".md";
    if (window.PDFExport && typeof window.PDFExport.triggerDownload === "function") {
      window.PDFExport.triggerDownload(blob, fname);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  async function exportHandleShare() {
    const btn = document.getElementById("exportShare");
    const editor = document.getElementById("exportEditor");
    if (!btn || !editor) return;
    if (typeof navigator.canShare !== "function" || typeof navigator.share !== "function") return;
    try {
      btn.disabled = true;
      const data = _exportState ? _exportState.sessionData : getCurrentSessionDataForExport();
      const blob = await window.PDFExport.buildSessionPDF({
        clientName: data.clientName,
        sessionDate: data.sessionDateFormatted,
        sessionType: data.sessionTypeLabel,
        markdown: editor.value
      }, { uiLang: localStorage.getItem("portfolioLang") || "en" });
      const slug = window.PDFExport.slugify(data.clientName);
      const fname = slug + "_" + (data.sessionDateISO || "session") + ".pdf";
      const file = new File([blob], fname, { type: "application/pdf" });
      if (!navigator.canShare({ files: [file] })) {
        btn.classList.add("is-hidden");
        return;
      }
      await navigator.share({
        files: [file],
        title: data.clientName + " — " + data.sessionDateFormatted,
        text: App.t("export.share.text")
      });
    } catch (err) {
      if (err && err.name === "AbortError") return; // user cancelled
      console.error("Share failed:", err);
    } finally {
      btn.disabled = false;
    }
  }

  function exportProbeShareSupport() {
    const btn = document.getElementById("exportShare");
    if (!btn) return;
    if (typeof navigator.canShare !== "function") return;
    try {
      const probe = new File(
        [new Blob(["x"], { type: "application/pdf" })],
        "x.pdf",
        { type: "application/pdf" }
      );
      if (navigator.canShare({ files: [probe] })) {
        btn.classList.remove("is-hidden");
      }
    } catch (e) {
      // probe failed — leave button hidden
    }
  }

  async function openExportDialog() {
    const modal = document.getElementById("exportModal");
    if (!modal) return;
    const sessionData = getCurrentSessionDataForExport();
    _exportState = {
      currentStep: 1,
      sessionData,
      hasEditedPreview: false,
      cleanup: null
    };

    exportRenderStep1Rows(sessionData);
    exportSetActiveStep(1);

    const editor = document.getElementById("exportEditor");
    const preview = document.getElementById("exportPreview");
    if (editor) editor.value = "";
    if (preview) preview.innerHTML = "";

    modal.classList.remove("is-hidden");
    App.lockBodyScroll();
    App.applyTranslations(modal);
    exportApplyMobileTabs();

    // Wire events for the lifetime of this dialog. Track listeners so we can detach.
    const closeBtn = document.getElementById("exportClose");
    const overlay = modal.querySelector(".modal-overlay");
    const backBtn = document.getElementById("exportBackBtn");
    const nextBtn = document.getElementById("exportNextBtn");
    const downloadPdfBtn = document.getElementById("exportDownloadPdf");
    const downloadMdBtn = document.getElementById("exportDownloadMd");
    const shareBtn = document.getElementById("exportShare");

    const onClose = () => exportCloseDialog(false);
    const onOverlay = () => exportCloseDialog(false);
    const onKey = (e) => { if (e.key === "Escape") exportCloseDialog(false); };
    const onBack = () => {
      if (_exportState.currentStep > 1) exportSetActiveStep(_exportState.currentStep - 1);
    };
    const onNext = () => {
      if (_exportState.currentStep === 1) {
        // Collect selected sections, build initial markdown, populate editor.
        const checks = modal.querySelectorAll('#exportStep1Rows input[type="checkbox"]');
        const selected = [];
        checks.forEach((cb) => { if (cb.checked && !cb.disabled) selected.push(cb.dataset.sectionKey); });
        const md = buildFilteredSessionMarkdown(selected);
        if (editor) editor.value = md;
        _exportState.hasEditedPreview = false;
        exportSetActiveStep(2);
        exportApplyMobileTabs();
        exportUpdatePreview();
      } else if (_exportState.currentStep === 2) {
        exportSetActiveStep(3);
      } else {
        exportCloseDialog(true);
      }
    };
    const onEditorInput = () => {
      _exportState.hasEditedPreview = true;
      exportUpdatePreview();
    };
    const onResize = () => exportApplyMobileTabs();
    const onPdf = () => exportHandleDownloadPdf();
    const onMd = () => exportHandleDownloadMd();
    const onShare = () => exportHandleShare();

    // Event-delegated close on the modal root: survives any z-index issue,
    // any cleanup-ordering bug, and works identically on every step.
    // Root cause for the Step 3 X-button bug (UAT 22-HUMAN, Test 2): the
    // .modal-close had no z-index inside .modal-card (z-index:1), and on
    // Step 3 the .export-output-card buttons (later in DOM order) painted
    // at the same stacking level — so direct clicks on the X were absorbed
    // by the body region rather than reaching the X listener.
    const onModalClick = (e) => {
      if (!e || !e.target) return;
      const t = e.target;
      if (t.closest && t.closest(".modal-close")) { onClose(); return; }
      if (t.classList && t.classList.contains("modal-overlay")) { onOverlay(); return; }
    };
    modal.addEventListener("click", onModalClick);
    document.addEventListener("keydown", onKey);
    if (backBtn) backBtn.addEventListener("click", onBack);
    if (nextBtn) nextBtn.addEventListener("click", onNext);
    if (editor) editor.addEventListener("input", onEditorInput);
    window.addEventListener("resize", onResize);
    if (downloadPdfBtn) downloadPdfBtn.addEventListener("click", onPdf);
    if (downloadMdBtn) downloadMdBtn.addEventListener("click", onMd);
    if (shareBtn) shareBtn.addEventListener("click", onShare);

    exportProbeShareSupport();

    _exportState.cleanup = function () {
      modal.removeEventListener("click", onModalClick);
      document.removeEventListener("keydown", onKey);
      if (backBtn) backBtn.removeEventListener("click", onBack);
      if (nextBtn) nextBtn.removeEventListener("click", onNext);
      if (editor) editor.removeEventListener("input", onEditorInput);
      window.removeEventListener("resize", onResize);
      if (downloadPdfBtn) downloadPdfBtn.removeEventListener("click", onPdf);
      if (downloadMdBtn) downloadMdBtn.removeEventListener("click", onMd);
      if (shareBtn) shareBtn.removeEventListener("click", onShare);
    };
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

  if (exportSessionBtn) {
    exportSessionBtn.addEventListener("click", () => {
      openExportDialog();
    });
  }

  if (editButton) {
    editButton.addEventListener("click", () => {
      setReadMode(false);
      updateCancelButtonLabel();
    });
  }

  // D-02/D-03/D-04/D-06 (Phase 24): Cancel/Revert button — confirm on dirty, silent on clean.
  if (cancelButton) {
    cancelButton.addEventListener("click", async () => {
      const isDirty = !!(window.PortfolioFormDirty && window.PortfolioFormDirty());
      if (isDirty) {
        const ok = await App.confirmDialog({
          titleKey: "confirm.discard.title",
          messageKey: "confirm.discard.body",
          confirmKey: "confirm.discard.yes",
          cancelKey: "confirm.discard.no",
          tone: "danger",
        });
        if (!ok) return;
        revertSessionForm();
      }
      setReadMode(true);
      updateCancelButtonLabel();
    });
  }

  if (inlinePhotoInput) {
    inlinePhotoInput.addEventListener("change", async () => {
      const file = inlinePhotoInput.files && inlinePhotoInput.files[0];
      if (!file) return;
      inlinePhotoData = await App.readFileAsDataURL(file);
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
      await populateSpotlight(id);
      App.showToast("", "toast.clientCreated");
    });
  }

  if (inlineCancel) {
    inlineCancel.addEventListener("click", () => {
      resetInlineClientForm();
      if (inlineForm) inlineForm.style.display = "none";
      if (clientSelect) clientSelect.value = "";
      populateSpotlight(null);
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

      // Heart Shield validation
      const isHeartShield = heartShieldToggle ? heartShieldToggle.checked : false;
      let shieldRemoved = null;
      if (isHeartShield) {
        const shieldRemovedInput = document.querySelector("input[name='shieldRemoved']:checked");
        if (!shieldRemovedInput) {
          App.showToast("", "toast.heartShieldRequired");
          return;
        }
        shieldRemoved = shieldRemovedInput.value === "yes";
      }

      const sessionTypeInput = document.querySelector("input[name='sessionType']:checked");
      const sessionType = sessionTypeInput ? sessionTypeInput.value : "clinic";
      const trappedEmotions = document.getElementById("trappedEmotions").value.trim();
      const heartShieldEmotions = isHeartShield ? (document.getElementById("heartShieldEmotions") || {}).value?.trim() || "" : "";
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
          heartShieldEmotions,
          insights,
          limitingBeliefs,
          additionalTech,
          customerSummary,
          comments,
          isHeartShield,
          shieldRemoved,
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
          heartShieldEmotions,
          insights,
          limitingBeliefs,
          additionalTech,
          customerSummary,
          comments,
          isHeartShield,
          shieldRemoved,
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
    applySectionLabels();
    applyCopyLabels();
    if (editingSession) {
      updateSessionTitle(editingSession);
      App.setSubmitLabel("session.form.update", submitButton, submitLabel);
    }
    if (isReadMode) resizeReadModeTextareas();
    populateSpotlight(editingSession ? editingSession.clientId : (clientSelect ? clientSelect.value : null));
    updateCancelButtonLabel(); // D-04: re-translate Cancel/Discard label
  });

  if (sessionId && Number.isInteger(sessionId)) {
    editingSession = await PortfolioDB.getSession(sessionId);
    if (editingSession) {
      populateSession(editingSession, issues, createIssueBlock);
      await populateSpotlight(editingSession.clientId);
      updateSessionTitle(editingSession);
      App.setSubmitLabel("session.form.update", submitButton, submitLabel);
      if (deleteButton) deleteButton.classList.remove("is-hidden");
      setReadMode(true);
      applySectionVisibility(true);
      applySectionLabels();
      // D-06 (Phase 24): snapshot the freshly-loaded session for revertSessionForm.
      //   Wait one tick so populateSession's dynamic issue rows are in the DOM before reading.
      Promise.resolve().then(() => {
        lastSavedSnapshot = snapshotFormState();
        formDirty = false; // populateSession's value writes trigger 'input' events
        updateCancelButtonLabel();
      });
    }
  } else {
    // New session — hide disabled sections from the form per REQ-3.
    applySectionVisibility(false);
    applySectionLabels();
  }

  // Accordion toggle — mobile only
  const isMobileAccordion = window.matchMedia("(max-width: 768px)");

  function initAccordions() {
    const sections = document.querySelectorAll(".accordion-section");
    if (!isMobileAccordion.matches) {
      // Desktop: ensure all sections are visible
      sections.forEach(s => s.classList.add("is-active"));
      return;
    }
    // Mobile: first section active by default
    sections.forEach((section, i) => {
      if (i === 0) section.classList.add("is-active");
      else section.classList.remove("is-active");
    });
  }

  document.querySelectorAll(".accordion-header").forEach(header => {
    header.addEventListener("click", () => {
      if (!isMobileAccordion.matches) return;
      const section = header.closest(".accordion-section");
      const wasActive = section.classList.contains("is-active");
      // Close all others
      document.querySelectorAll(".accordion-section").forEach(s => s.classList.remove("is-active"));
      // Toggle clicked
      if (!wasActive) section.classList.add("is-active");
    });
  });

  isMobileAccordion.addEventListener("change", initAccordions);
  initAccordions();
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
    if (input) {
      input.checked = true;
      // Programmatic `.checked = true` does NOT fire a change event. Dispatch one
      // explicitly so the form-level change listener (formDirty + Cancel→Discard label)
      // reacts to session-type / heart-shield / inline-client-type toggles.
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
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

// Phase 24 Plan 06 — pure render helper for the Session-info subsection.
// Kept side-effect-free (no document.getElementById, no IDB) so it's unit-testable
// in Node without jsdom. populateSpotlight's async wrapper looks up the refs and
// the sessions array, then delegates to this helper.
//
// `refs` shape: { sessionInfo, lastDate, total, summaryBlock, summaryQuote }
// `sessions` is the unsorted array of session records for one client.
// `formatDate` is App.formatDate (locale-aware).
function renderSpotlightSessionInfo(refs, sessions, formatDate) {
  // D-30: empty-history clients render no Session-info, no strings, no divider.
  if (!sessions || sessions.length === 0) {
    refs.sessionInfo.classList.add("is-hidden");
    return;
  }
  refs.sessionInfo.classList.remove("is-hidden");

  // Sort by date desc; falsy dates fall to epoch so any real date wins.
  const sorted = sessions.slice().sort((a, b) => {
    const da = new Date(a.date || 0).getTime();
    const db = new Date(b.date || 0).getTime();
    return db - da;
  });
  const latest = sorted[0];

  refs.lastDate.textContent = latest.date ? formatDate(latest.date) : "—";
  refs.total.textContent = String(sessions.length);

  // D-31: customerSummary read-only quote. Use textContent — never innerHTML —
  // because the value comes from the user-entered session form.
  const summaryText = (latest.customerSummary || "").trim();
  if (summaryText) {
    refs.summaryQuote.textContent = summaryText;
    refs.summaryBlock.classList.remove("is-hidden");
  } else {
    refs.summaryBlock.classList.add("is-hidden");
  }
}

// populateSpotlight: SSOT for client spotlight (Phase 24 D-01). Plan 06 extends with Session-info subsection.
// Async because Plan 06 loads sessions from IDB to render Last session / Total / Last note.
async function populateSpotlight(clientId) {
  const spotlight = document.getElementById("clientSpotlight");
  if (!spotlight) return;
  const photo = document.getElementById("clientSpotlightPhoto");
  const placeholder = document.getElementById("clientSpotlightPlaceholder");
  const name = document.getElementById("clientSpotlightName");
  const editBtn = document.getElementById("editClientBtn");
  const sessionInfoEl = document.getElementById("clientSpotlightSessionInfo");
  const parsedId = Number.parseInt(clientId, 10);
  if (!parsedId) {
    spotlight.classList.add("is-hidden");
    if (editBtn) editBtn.classList.add("is-hidden");
    if (sessionInfoEl) sessionInfoEl.classList.add("is-hidden");
    return;
  }
  const selectedClient = getSelectedClient(parsedId, clientCache);
  if (!selectedClient) {
    spotlight.classList.add("is-hidden");
    if (editBtn) editBtn.classList.add("is-hidden");
    if (sessionInfoEl) sessionInfoEl.classList.add("is-hidden");
    return;
  }
  spotlight.classList.remove("is-hidden");
  if (editBtn) {
    editBtn.classList.remove("is-hidden");
    editBtn.title = (window.App && App.t) ? App.t("session.editClient") : "Edit Client";
    editBtn.setAttribute("aria-label", editBtn.title);
  }
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
  const notesEl = document.getElementById("clientSpotlightNotes");
  const notesTextEl = document.getElementById("clientSpotlightNotesText");
  if (notesEl && notesTextEl) {
    const notes = (selectedClient.notes || "").trim();
    if (notes) {
      notesTextEl.textContent = notes;
      notesEl.classList.remove("is-hidden");
    } else {
      notesEl.classList.add("is-hidden");
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

  // Phase 24 Plan 06 — Session-info subsection (pre-session context card).
  // Subsection markup may be absent on pages that reuse populateSpotlight without it.
  if (!sessionInfoEl) return;
  const refs = {
    sessionInfo: sessionInfoEl,
    lastDate: document.getElementById("clientSpotlightLastSessionDate"),
    total: document.getElementById("clientSpotlightTotalSessions"),
    summaryBlock: document.getElementById("clientSpotlightLastSummary"),
    summaryQuote: document.getElementById("clientSpotlightLastSummaryQuote"),
  };
  if (!refs.lastDate || !refs.total || !refs.summaryBlock || !refs.summaryQuote) return;
  let sessionsByClient = [];
  try {
    if (window.PortfolioDB && typeof PortfolioDB.getSessionsByClient === "function") {
      sessionsByClient = await PortfolioDB.getSessionsByClient(parsedId);
    } else if (window.PortfolioDB && typeof PortfolioDB.getAllSessions === "function") {
      const all = await PortfolioDB.getAllSessions();
      sessionsByClient = all.filter(s => s.clientId === parsedId);
    }
  } catch (err) {
    console.warn("Phase 24 Plan 06: failed to load sessions for spotlight:", err);
    sessionsByClient = [];
  }
  renderSpotlightSessionInfo(refs, sessionsByClient, App.formatDate);
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
  populateSpotlight(session.clientId);

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

  // Heart Shield population
  const heartShieldToggleEl = document.getElementById("heartShieldToggle");
  const heartShieldConditionalEl = document.getElementById("heartShieldConditional");
  const heartShieldEmotionsFieldEl = document.getElementById("heartShieldEmotionsField");
  if (heartShieldToggleEl) {
    heartShieldToggleEl.checked = !!session.isHeartShield;
    if (heartShieldConditionalEl) {
      heartShieldConditionalEl.classList.toggle("is-hidden", !session.isHeartShield);
    }
    if (heartShieldEmotionsFieldEl) {
      heartShieldEmotionsFieldEl.classList.toggle("is-hidden", !session.isHeartShield);
    }
  }
  const heartShieldEmotionsEl = document.getElementById("heartShieldEmotions");
  if (heartShieldEmotionsEl) heartShieldEmotionsEl.value = session.heartShieldEmotions || "";
  if (session.isHeartShield && session.shieldRemoved !== null && session.shieldRemoved !== undefined) {
    const value = session.shieldRemoved ? "yes" : "no";
    const radio = document.querySelector(`input[name='shieldRemoved'][value='${value}']`);
    if (radio) radio.checked = true;
  }

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
