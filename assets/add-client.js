// ─────────────────────────────────────────────────────────────────────────────
// add-client.js — Add / edit client form page.
//
// OWNS: the add/edit-client form — client fields (name, birth date picker,
//   email, phone, notes, client type toggle, referral source), inline photo
//   capture (resize on upload, crop via CropModule), and the delete flow for
//   existing clients.
// PUBLIC SURFACE: none — self-boots on DOMContentLoaded, registers no global.
// DEPENDENCIES: App.{initCommon, t, showToast, confirmDialog,
//   applyTranslations, setSubmitLabel, readFileAsDataURL}, PortfolioDB.{getClient,
//   addClient, updateClient, deleteClientAndSessions}, window.CropModule.{openCropModal,
//   resizeToMaxDimension} — set by app.js, db.js, and crop.js IIFEs.
// CONSTRAINTS: user text rendered via textContent / .value, never innerHTML;
//   referral source falls back to "other" for any custom value not in the preset
//   list; photos are stored as data URLs (resized to longest edge ≤ 800 px,
//   JPEG q = 0.75), with the original file discarded after the crop callback.
// ─────────────────────────────────────────────────────────────────────────────
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

  // Birthdate is a native <input type="date"> (#clientBirthDate) mirroring
  // #sessionDate — value/read is plain .value (YYYY-MM-DD, no migration). The old
  // three-dropdown birth-date picker is no longer initialised here (add-session
  // still uses that app.js helper until Plan 08 removes it).

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
    // No hard upload-size cap, but a soft warning when the file is very
    // large so the user understands the slowdown. 25 MB chosen as the point
    // where most phones still decode but the user notices latency.
    const SOFT_SIZE_CAP_BYTES = 25 * 1024 * 1024;
    photoInput.addEventListener("change", async () => {
      const file = photoInput.files && photoInput.files[0];
      if (!file) return;
      try {
        if (file.size > SOFT_SIZE_CAP_BYTES) {
          console.warn("Large photo upload:", file.size, "bytes — proceeding (soft warning only, no hard size cap)");
          App.showToast("", "photos.upload.warning");
        }
        // Resize on upload — longest edge ≤ 800 px, JPEG q = 0.75.
        // The original `file` is held only during this call; it is garbage-
        // collected as soon as resizeToMaxDimension returns — only the cropped
        // data URL is stored; the original is never persisted.
        let resizedBlob;
        try {
          resizedBlob = await CropModule.resizeToMaxDimension(file, 800, 0.75);
        } catch (err) {
          console.error("Resize failed (likely memory):", err);
          App.showToast("", "photos.upload.tooLarge");
          if (photoInput) photoInput.value = "";
          return;
        }
        const resizedDataURL = await App.readFileAsDataURL(resizedBlob);
        CropModule.openCropModal(resizedDataURL, function (croppedDataUrl) {
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
      document.getElementById("clientBirthDate").value = editingClient.birthDate || "";
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
      // Parse the birthdate in LOCAL time so age never drifts a day (UTC-parse bug).
      const parsedBirth = birthDate ? window.DateFormat.parseLocal(birthDate) : null;
      const age = parsedBirth ? Math.floor((Date.now() - parsedBirth) / (365.25 * 24 * 60 * 60 * 1000)) : null;
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

