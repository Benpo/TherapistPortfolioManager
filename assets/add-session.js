// ────────────────────────────────────────────────────────────────────────
// add-session.js — Add / edit-session page controller (slimmed parent).
//
// OWNS: the add/edit-session form (all section textareas + issue rows + the
// heart-shield toggle), the client <select> and its cached client list, the
// inline "new client" form, the edit-client modal, inline photo capture for
// both, and the session reading vs. edit modes (read-only view → Edit →
// Cancel/Revert). On submit it writes the session via PortfolioDB; on load it
// can hydrate an existing session for viewing/editing.
//
// PUBLIC SURFACE: window.PortfolioFormDirty() — a live dirty-state predicate
// read by App.installNavGuard — and window.__addSessionTestHooks.computeGrowHeight,
// the pure textarea-grow helper exposed for unit tests. No feature API beyond these.
//
// BOOT HANDSHAKE: at load it calls window.__exportModalInit(ctx) exactly once,
// passing live accessor closures for its mutable session state (editingSession /
// sessionId / isReadMode) plus the shared DOM elements. This pairs with
// assets/export-modal.js, which owns the copy/export-modal flow that was
// extracted out of this file's DOMContentLoaded closure.
//
// DEPENDENCIES (window.* chain):
//   window.App.{initCommon, t, showToast, confirmDialog, applyTranslations,
//               formatDate, isSectionEnabled, getSectionLabel, installNavGuard,
//               initBirthDatePicker, readFileAsDataURL, setSubmitLabel,
//               createSeverityScale, getSeverityValue, lockBodyScroll,
//               unlockBodyScroll}        — set by assets/app.js IIFE
//   window.PortfolioDB.{getSession, addSession, updateSession, deleteSession,
//               getSessionsByClient, getAllSessions, getClient, addClient,
//               updateClient, getAllClients}  — set by assets/db.js IIFE
//   window.__exportModalInit             — set by assets/export-modal.js
//   The per-textarea snippet-expansion `input` listener is attached by the
//   snippets layer; this file's autoGrow handler only measures + sets height, so
//   it composes cleanly with that listener regardless of order.
//
// INVARIANTS: all user-entered values are rendered via textContent / .value /
// .placeholder — NEVER innerHTML (custom labels and session content are
// user-controlled). The autoGrow handler never mutates .value and never calls
// preventDefault/stopPropagation, so handler order is irrelevant. PortfolioFormDirty
// is a function (not a snapshot) so the nav-guard always reads live state.
// ────────────────────────────────────────────────────────────────────────
let clientCache = [];
let inlinePhotoData = "";
let editClientPhotoData = "";
let editingClientId = null;
let formDirty = false;
let formSaving = false;

// Single-sourced auto-grow for the long session textareas.
// Used by the read-mode resize path, the live `input` path, and the
// edit-load (populateSession) path so the scrollHeight math lives in ONE place.
//
// computeGrowHeight is a PURE function (no DOM mutation) so it can be unit-
// tested via the __addSessionTestHooks convention. There is intentionally NO
// upper clamp (no Math.min) — the user explicitly wants grow-to-fit.
const SESSION_TEXTAREA_MIN_HEIGHT = 56;

function computeGrowHeight(el) {
  return Math.max(el.scrollHeight, SESSION_TEXTAREA_MIN_HEIGHT);
}

// Measure-only height application: reset to "auto" so scrollHeight reflects
// the true content height, then set the computed height. NEVER mutates value,
// never preventDefault/stopPropagation — safe to compose with the snippets
// input listener and the form dirty-tracking input listener.
function autoGrow(el) {
  if (!el || !el.style) return;
  el.style.height = "auto";
  el.style.height = `${computeGrowHeight(el)}px`;
}

function growAllSessionTextareas() {
  document.querySelectorAll(".session-textarea").forEach((el) => autoGrow(el));
}

// Expose the pure hook for falsifiable behavior testing (the window.__*TestHooks
// convention). Guarded so module eval is safe under a vm sandbox.
if (typeof window !== "undefined") {
  window.__addSessionTestHooks = Object.assign(
    window.__addSessionTestHooks || {},
    { computeGrowHeight }
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  await App.initCommon();

  // Expose dirty state for App.installNavGuard consumers.
  // Function form (not a snapshot) so the guard always reads the live state.
  window.PortfolioFormDirty = function () {
    return formDirty && !formSaving;
  };

  // Protect the "Back to Overview" link at the bottom of the
  // session form. Mirrors the brand-link guard installed in App.initCommon for the
  // top logo. Both new-session and edit-existing flows share this link, so a
  // single guard install here covers both.
  const backToOverviewLink = document.querySelector('a.button.ghost[href="./index.html"]');
  if (backToOverviewLink && !backToOverviewLink._navGuardInstalled) {
    backToOverviewLink._navGuardInstalled = true;
    App.installNavGuard({
      trigger: backToOverviewLink,
      isDirty: function () {
        return typeof window.PortfolioFormDirty === 'function' && window.PortfolioFormDirty() === true;
      },
      message: {
        titleKey:   'session.leavePage.title',
        bodyKey:    'session.leavePage.body',
        confirmKey: 'session.leavePage.confirm',
        cancelKey:  'session.leavePage.cancel',
        tone:       'danger'
      },
      destination: './index.html'
    });
  }

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
  let lastSavedSnapshot = null; // snapshot for revertSessionForm (Cancel/Revert)
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
    // Delegated auto-grow. Composes with the dirty-tracking
    // listener below and the per-textarea snippets `input` listener — this
    // handler only measures + sets height (no preventDefault / no .value
    // mutation), so handler order is irrelevant.
    sessionForm.addEventListener("input", (e) => {
      const target = e.target;
      if (
        target &&
        target.classList &&
        target.classList.contains("session-textarea")
      ) {
        autoGrow(target);
      }
    });
    sessionForm.addEventListener("input", () => {
      formDirty = true;
      updateCancelButtonLabel(); // swap to "Discard changes" on first edit
    });
    sessionForm.addEventListener("change", () => {
      formDirty = true;
      updateCancelButtonLabel();
    });
  }
  window.addEventListener("beforeunload", (e) => {
    // Honour the one-shot bypass flag set by
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
    // Single-sourced through the top-level autoGrow helper
    // so the scrollHeight math is not duplicated between read-mode and the
    // live/edit-load grow paths.
    readModeTextareas.forEach((textarea) => autoGrow(textarea));
  }

  function clearReadModeTextareas() {
    readModeTextareas.forEach((textarea) => {
      textarea.style.height = "";
    });
  }

  // Kept inside DOMContentLoaded so inlineBirthDatePicker (declared `const`
  //   above) is reachable via closure. If it were top-level, the bare
  //   `inlineBirthDatePicker` reference would resolve to window.inlineBirthDatePicker
  //   (the <div id="inlineBirthDatePicker"> via legacy named-element access) which
  //   has no .clear() method → TypeError → the dropdown change handler would abort
  //   before reaching populateSpotlight. Root cause of the spotlight bug.
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
    // Cancel button is visible in edit mode for existing sessions only.
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

      // Quick 260630-sa8: preserve the legacy stored age when no birth date is
      // entered, instead of nulling it out on every inline edit-save.
      const age = App.computeClientAgeOnEdit(birthDate, existing.age);

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

  // Capture form state for revertSessionForm. Mirrors the IDB session
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

  // Revert form to last-saved snapshot. Delegates to populateSession for
  //   the heavy lifting (handles all textareas, issues teardown/rebuild, spotlight refresh).
  function revertSessionForm() {
    if (!lastSavedSnapshot) return;
    populateSession(lastSavedSnapshot, issues, createIssueBlock);
    formDirty = false;
    updateCancelButtonLabel();
  }

  // Asymmetric Cancel button label. "Cancel" when clean, "Discard changes" when dirty.
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

  // ============================================================
  // Section visibility (REQ-3, REQ-5)
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
        // REQ-5: visible, badge shown, inputs remain
        // fully editable — do NOT add disabled / readonly attributes here.
        wrapper.classList.remove("is-hidden");
        if (badge) badge.classList.remove("is-hidden");
      } else {
        wrapper.classList.add("is-hidden");
        if (badge) badge.classList.add("is-hidden");
      }
    });
  }

  // Write the therapist's customLabel into the visible form labels.
  // applyTranslations() resets these to the i18n default, so this MUST run
  // after every applyTranslations pass that affects this page. Uses
  // .textContent (never innerHTML) — customLabel is user-controlled.
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

      // Keep descendant input/textarea placeholders in sync with the renamed
      // label. When the therapist has a custom label, override the placeholder;
      // when there is no custom label, restore the placeholder from its
      // data-i18n-placeholder key. Use .placeholder (attribute, not innerHTML)
      // — customLabel is user-controlled and assigning to .placeholder is safe.
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

  // Wire the export-modal + markdown builders (extracted to assets/export-modal.js).
  // Pass live accessor closures for the mutable session state plus the
  // shared DOM els so the export module always reads add-session.js's live values.
  // Unconditional on purpose: if export-modal.js is missing or mis-ordered this
  // throws loudly at boot (TypeError) rather than silently disabling export.
  window.__exportModalInit({
    getEditingSession: () => editingSession,
    getSessionId: () => sessionId,
    isReadMode: () => isReadMode,
    getIssuesPayload,
    els: { sessionDate, clientSelect, insightsInput, customerSummaryInput },
  });

  if (editButton) {
    editButton.addEventListener("click", () => {
      setReadMode(false);
      updateCancelButtonLabel();
    });
  }

  // Cancel/Revert button — confirm on dirty, silent on clean.
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

  // Save-button handler: validate → persist → return {savedId,isNew}. Factored
  // out of the form-submit listener (validation order, toasts, payload shape all
  // unchanged) so the submit handler stays small; it owns the redirect.
  //
  // Contract: returns null on ANY validation failure (showing the matching toast
  // — the caller treats null as "abort, stay editing") and performs NO navigation.
  // The save BUTTON keeps its exact 600ms redirect (in the submit listener below).
  // isNew = there was no prior editingSession (a fresh add).
  async function saveSessionForm() {
    const clientId = Number.parseInt(clientSelect.value, 10);
    if (!clientId) {
      App.showToast("", "toast.selectClient");
      return null;
    }
    const date = sessionDate.value;
    if (!date) {
      App.showToast("", "toast.errorRequired");
      return null;
    }

    const issuesPayload = getIssuesPayload();
    if (!validateIssues(issuesPayload)) {
      App.showToast("", "toast.issueMissing");
      return null;
    }

    // Heart Shield validation
    const isHeartShield = heartShieldToggle ? heartShieldToggle.checked : false;
    let shieldRemoved = null;
    if (isHeartShield) {
      const shieldRemovedInput = document.querySelector("input[name='shieldRemoved']:checked");
      if (!shieldRemovedInput) {
        App.showToast("", "toast.heartShieldRequired");
        return null;
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

    const isNew = !editingSession;
    let savedId;
    // The IndexedDB write can reject (quota, blocked upgrade, corrupt store). Without
    // a guard the rejection propagates as an unhandled promise rejection with no user
    // feedback, and the caller still fires its redirect. Wrap it like the sibling async
    // handlers (toast.errorGeneric) and return null so the caller aborts cleanly — the
    // save-then-export trigger sees a falsy result and skips both redirect and export.
    try {
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
        savedId = editingSession.id;
        App.showToast("", "toast.sessionUpdated");
      } else {
        const newId = await PortfolioDB.addSession({
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
        savedId = newId;
        App.showToast("", "toast.sessionSaved");
      }
    } catch (err) {
      console.error("Session save failed:", err);
      App.showToast("", "toast.errorGeneric");
      return null;
    }
    return { savedId, isNew };
  }

  if (sessionForm) {
    sessionForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      // Save BUTTON path: delegate to the reusable save, then own the redirect.
      // Behavior-preserving — validate/persist/redirect identical to before
      // (the 600ms redirect lives HERE now, not inside saveSessionForm()).
      const result = await saveSessionForm();
      if (!result) return;
      formSaving = true;
      setTimeout(() => {
        window.location.href = `./add-session.html?sessionId=${result.savedId}`;
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
    updateCancelButtonLabel(); // re-translate Cancel/Discard label
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
      // Snapshot the freshly-loaded session for revertSessionForm.
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
    // Size the (empty) long textareas once after initial
    // construction/i18n so they start consistent; subsequent typing grows them
    // via the delegated input listener.
    growAllSessionTextareas();
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

// Pure render helper for the Session-info subsection.
// Kept side-effect-free (no document.getElementById, no IDB) so it's unit-testable
// in Node without jsdom. populateSpotlight's async wrapper looks up the refs and
// the sessions array, then delegates to this helper.
//
// `refs` shape: { sessionInfo, lastDate, total, summaryBlock, summaryQuote }
// `sessions` is the unsorted array of session records for one client.
// `formatDate` is App.formatDate (locale-aware).
function renderSpotlightSessionInfo(refs, sessions, formatDate) {
  // Empty-history clients render no Session-info, no strings, no divider.
  if (!sessions || sessions.length === 0) {
    refs.sessionInfo.classList.add("is-hidden");
    return;
  }
  refs.sessionInfo.classList.remove("is-hidden");

  // Sort by date desc, with createdAt and id as tiebreakers. Two sessions
  // recorded on the SAME date (e.g., two sessions today) sort by createdAt
  // descending so the most recently created one wins. id is the final
  // fallback for legacy records that lack createdAt.
  const sorted = sessions.slice().sort((a, b) => {
    const da = new Date(a.date || 0).getTime();
    const db = new Date(b.date || 0).getTime();
    if (db !== da) return db - da;
    const ca = new Date(a.createdAt || 0).getTime();
    const cb = new Date(b.createdAt || 0).getTime();
    if (cb !== ca) return cb - ca;
    return (b.id || 0) - (a.id || 0);
  });
  const latest = sorted[0];

  refs.lastDate.textContent = latest.date ? formatDate(latest.date) : "—";
  refs.total.textContent = String(sessions.length);

  // customerSummary read-only quote. Use textContent — never innerHTML —
  // because the value comes from the user-entered session form.
  const summaryText = (latest.customerSummary || "").trim();
  if (summaryText) {
    refs.summaryQuote.textContent = summaryText;
    refs.summaryBlock.classList.remove("is-hidden");
  } else {
    refs.summaryBlock.classList.add("is-hidden");
  }
}

// populateSpotlight: SSOT for client spotlight. Also renders the Session-info subsection.
// Async because it loads sessions from IDB to render Last session / Total / Last note.
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

  // Session-info subsection (pre-session context card).
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
    console.warn("spotlight: failed to load sessions:", err);
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

  // Grow every .session-textarea to fit its just-assigned
  // value so an existing session opened for EDIT shows full content on load
  // (not trimmed/scrolled until the first keystroke). Covers the heart-shield
  // emotions field too (it shares .session-textarea).
  growAllSessionTextareas();
}
