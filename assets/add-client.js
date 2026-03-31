document.addEventListener("DOMContentLoaded", async () => {
  App.initCommon();

  const form = document.getElementById("clientForm");
  const typeGroup = document.getElementById("clientTypeGroup");
  const cancelBtn = document.getElementById("cancelBtn");
  const photoInput = document.getElementById("clientPhoto");
  const photoPreview = document.getElementById("clientPhotoPreview");
  const titleEl = document.querySelector(".section-title");
  const submitButton = form ? form.querySelector("button[type='submit']") : null;
  const submitLabel = submitButton ? submitButton.querySelector(".button-label") : null;
  const deleteButton = document.getElementById("deleteClientBtn");
  const clientIdParam = new URLSearchParams(window.location.search).get("clientId");
  const clientId = clientIdParam ? Number.parseInt(clientIdParam, 10) : null;
  const referralSelect = document.getElementById("clientReferralSource");
  const referralOtherInput = document.getElementById("clientReferralOther");
  let editingClient = null;
  let photoData = "";

  // Birth date picker (three-dropdown replacement for native date input)
  const birthDatePicker = App.initBirthDatePicker('birthDatePicker', 'clientBirthDate');

  // === CROP via shared CropModule ===
  const recropBtn = document.getElementById("recropBtn");

  if (recropBtn) {
    recropBtn.addEventListener("click", () => {
      if (photoData) {
        CropModule.openCropModal(photoData, function (croppedDataUrl) {
          photoData = croppedDataUrl;
          if (photoPreview) {
            photoPreview.src = photoData;
            photoPreview.classList.remove("is-hidden");
          }
          if (recropBtn) recropBtn.classList.remove("is-hidden");
        }, function () {
          // Re-crop cancelled — keep old photoData as-is
        }, true);
      }
    });
  }

  if (typeGroup) {
    typeGroup.addEventListener("click", (event) => {
      const card = event.target.closest(".toggle-card");
      if (!card) return;
      typeGroup.querySelectorAll(".toggle-card").forEach((el) => el.classList.remove("active"));
      card.classList.add("active");
      const input = card.querySelector("input");
      if (input) input.checked = true;
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      window.location.href = "./index.html";
    });
  }

  if (photoInput) {
    photoInput.addEventListener("change", async () => {
      const file = photoInput.files && photoInput.files[0];
      if (!file) return;
      try {
        const rawDataURL = await App.readFileAsDataURL(file);
        CropModule.openCropModal(rawDataURL, function (croppedDataUrl) {
          photoData = croppedDataUrl;
          if (photoPreview) {
            photoPreview.src = photoData;
            photoPreview.classList.remove("is-hidden");
          }
          if (recropBtn) recropBtn.classList.remove("is-hidden");
        }, function () {
          // New upload cancelled — revert
          photoData = "";
          if (photoPreview) {
            photoPreview.src = "";
            photoPreview.classList.add("is-hidden");
          }
          if (recropBtn) recropBtn.classList.add("is-hidden");
          if (photoInput) photoInput.value = "";
        }, false);
      } catch (err) {
        console.error("Photo read failed:", err);
        App.showToast("", "toast.errorGeneric");
      }
    });
  }

  if (referralSelect && referralOtherInput) {
    referralSelect.addEventListener("change", () => {
      referralOtherInput.style.display = referralSelect.value === "other" ? "" : "none";
      if (referralSelect.value !== "other") referralOtherInput.value = "";
    });
  }

  if (clientId && Number.isInteger(clientId)) {
    editingClient = await PortfolioDB.getClient(clientId);
    if (editingClient) {
      document.getElementById("clientFirstName").value = editingClient.firstName || editingClient.name || "";
      document.getElementById("clientLastName").value = editingClient.lastName || editingClient.lastInitial || "";
      if (birthDatePicker && editingClient.birthDate) {
        birthDatePicker.setValue(editingClient.birthDate);
      }
      document.getElementById("clientEmail").value = editingClient.email || "";
      document.getElementById("clientPhone").value = editingClient.phone || "";
      document.getElementById("clientNotes").value = editingClient.notes || "";
      photoData = editingClient.photoData || "";
      if (photoData && photoPreview) {
        photoPreview.src = photoData;
        photoPreview.classList.remove("is-hidden");
        if (recropBtn) recropBtn.classList.remove("is-hidden");
      }

      const type = editingClient.type || "human";
      document.querySelectorAll("input[name='clientType']").forEach((input) => {
        const card = input.closest(".toggle-card");
        if (!card) return;
        if (input.value === type) {
          input.checked = true;
          card.classList.add("active");
        } else {
          card.classList.remove("active");
        }
      });

      // Load referral source
      if (referralSelect && editingClient.referralSource) {
        const stored = editingClient.referralSource;
        const presetValues = Array.from(referralSelect.options).map(o => o.value);
        if (presetValues.includes(stored)) {
          referralSelect.value = stored;
        } else {
          // Custom "other" value
          referralSelect.value = "other";
          if (referralOtherInput) {
            referralOtherInput.value = stored;
            referralOtherInput.style.display = "";
          }
        }
      }

      if (titleEl) {
        titleEl.setAttribute("data-i18n", "client.title.edit");
        titleEl.textContent = App.t("client.title.edit");
      }
      App.setSubmitLabel("client.form.update", submitButton, submitLabel);
      if (deleteButton) deleteButton.classList.remove("is-hidden");
      App.applyTranslations();
    }
  }

  if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
      if (!editingClient) return;
      const confirmed = await App.confirmDialog({
        titleKey: "confirm.deleteClient.title",
        messageKey: "confirm.deleteClient.body"
      });
      if (!confirmed) return;
      await PortfolioDB.deleteClientAndSessions(editingClient.id);
      App.showToast("", "toast.clientDeleted");
      setTimeout(() => {
        window.location.href = "./index.html";
      }, 600);
    });
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitter = event.submitter;
      const goToSession = submitter && submitter.id === "saveAndSessionBtn";
      const firstName = document.getElementById("clientFirstName").value.trim();
      if (!firstName) {
        App.showToast("", "toast.errorRequired");
        return;
      }
      const lastName = document.getElementById("clientLastName").value.trim();
      const birthDate = document.getElementById("clientBirthDate").value || null;
      const age = birthDate ? Math.floor((Date.now() - new Date(birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
      const email = document.getElementById("clientEmail").value.trim();
      const phone = document.getElementById("clientPhone").value.trim();
      const notes = document.getElementById("clientNotes").value.trim();
      const typeInput = document.querySelector("input[name='clientType']:checked");
      const type = typeInput ? typeInput.value : "adult";

      // Read referral source
      let referralSource = "";
      if (referralSelect) {
        const selVal = referralSelect.value;
        if (selVal === "other" && referralOtherInput) {
          referralSource = referralOtherInput.value.trim() || "";
        } else {
          referralSource = selVal;
        }
      }

      const displayName = lastName ? `${firstName} ${lastName}` : firstName;

      let savedId = null;
      if (editingClient) {
        await PortfolioDB.updateClient({
          ...editingClient,
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
          photoData,
          updatedAt: new Date().toISOString()
        });
        savedId = editingClient.id;
      } else {
        savedId = await PortfolioDB.addClient({
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
          photoData,
          createdAt: new Date().toISOString()
        });
      }

      App.showToast("", "toast.clientSaved");
      setTimeout(() => {
        window.location.href = goToSession && savedId ? `./add-session.html?clientId=${savedId}` : "./index.html";
      }, 600);
    });
  }
});

