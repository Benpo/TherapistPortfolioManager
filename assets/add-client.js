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

  // === CROP MODAL STATE ===
  let cropImage = null;
  let cropScale = 1;
  let cropOffsetX = 0, cropOffsetY = 0;
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0;
  let cropIsRecrop = false;
  let cropBaseScale = 1;

  // === CROP MODAL DOM REFS ===
  const cropModal = document.getElementById("cropModal");
  const cropCanvas = document.getElementById("cropCanvas");
  const cropCtx = cropCanvas ? cropCanvas.getContext("2d") : null;
  const cropCanvasContainer = cropCanvas ? cropCanvas.parentElement : null;
  const cropClose = document.getElementById("cropClose");
  const cropZoomSlider = document.getElementById("cropZoomSlider");
  const cropZoomIn = document.getElementById("cropZoomIn");
  const cropZoomOut = document.getElementById("cropZoomOut");
  const cropConfirmBtn = document.getElementById("cropConfirmBtn");
  const cropCancelBtn = document.getElementById("cropCancelBtn");
  const recropBtn = document.getElementById("recropBtn");

  // === CROP FUNCTIONS ===
  const CANVAS_SIZE = 300;

  function drawCrop() {
    if (!cropCtx || !cropImage) return;
    const dpr = window.devicePixelRatio || 1;
    cropCanvas.width = CANVAS_SIZE * dpr;
    cropCanvas.height = CANVAS_SIZE * dpr;
    cropCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cropCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    cropCtx.drawImage(
      cropImage,
      cropOffsetX, cropOffsetY,
      cropImage.naturalWidth * cropScale,
      cropImage.naturalHeight * cropScale
    );
  }

  function clampOffset() {
    const imgW = cropImage.naturalWidth * cropScale;
    const imgH = cropImage.naturalHeight * cropScale;
    // Ensure the canvas frame is always covered (cover behavior)
    const minX = CANVAS_SIZE - imgW;
    const minY = CANVAS_SIZE - imgH;
    cropOffsetX = Math.min(0, Math.max(minX, cropOffsetX));
    cropOffsetY = Math.min(0, Math.max(minY, cropOffsetY));
  }

  function openCropModal(dataURL, isRecrop) {
    if (!cropModal || !cropCanvas || !cropCtx) return;
    cropIsRecrop = !!isRecrop;
    const img = new Image();
    img.onload = () => {
      cropImage = img;
      // Calculate initial scale so image covers the 300x300 canvas (fit-cover)
      const baseScale = Math.max(CANVAS_SIZE / img.naturalWidth, CANVAS_SIZE / img.naturalHeight);
      cropBaseScale = baseScale;
      cropScale = baseScale;
      // Center image
      cropOffsetX = (CANVAS_SIZE - img.naturalWidth * cropScale) / 2;
      cropOffsetY = (CANVAS_SIZE - img.naturalHeight * cropScale) / 2;
      // Set slider range
      if (cropZoomSlider) {
        cropZoomSlider.min = baseScale;
        cropZoomSlider.max = baseScale * 3;
        cropZoomSlider.step = baseScale * 0.05;
        cropZoomSlider.value = baseScale;
      }
      drawCrop();
      cropModal.classList.remove("is-hidden");
      App.applyTranslations(cropModal);
    };
    img.src = dataURL;
  }

  function closeCropModal() {
    if (cropModal) cropModal.classList.add("is-hidden");
    cropImage = null;
  }

  // === DRAG HANDLERS (pointer events) ===
  if (cropCanvasContainer) {
    cropCanvasContainer.addEventListener("pointerdown", (e) => {
      isDragging = true;
      dragStartX = e.clientX - cropOffsetX;
      dragStartY = e.clientY - cropOffsetY;
      cropCanvasContainer.style.cursor = "grabbing";
      cropCanvasContainer.setPointerCapture(e.pointerId);
    });

    cropCanvasContainer.addEventListener("pointermove", (e) => {
      if (!isDragging || !cropImage) return;
      cropOffsetX = e.clientX - dragStartX;
      cropOffsetY = e.clientY - dragStartY;
      clampOffset();
      drawCrop();
    });

    cropCanvasContainer.addEventListener("pointerup", () => {
      isDragging = false;
      cropCanvasContainer.style.cursor = "grab";
    });

    cropCanvasContainer.addEventListener("pointercancel", () => {
      isDragging = false;
      cropCanvasContainer.style.cursor = "grab";
    });

    // Wheel zoom
    cropCanvasContainer.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (!cropZoomSlider || !cropImage) return;
      const delta = e.deltaY > 0 ? -cropBaseScale * 0.1 : cropBaseScale * 0.1;
      const newVal = Math.min(
        parseFloat(cropZoomSlider.max),
        Math.max(parseFloat(cropZoomSlider.min), parseFloat(cropZoomSlider.value) + delta)
      );
      cropZoomSlider.value = newVal;
      cropZoomSlider.dispatchEvent(new Event("input"));
    }, { passive: false });
  }

  // === ZOOM SLIDER ===
  if (cropZoomSlider) {
    cropZoomSlider.addEventListener("input", () => {
      if (!cropImage) return;
      const newScale = parseFloat(cropZoomSlider.value);
      // Zoom toward center: adjust offsets so canvas center stays centered
      const centerX = CANVAS_SIZE / 2;
      const centerY = CANVAS_SIZE / 2;
      const ratio = newScale / cropScale;
      cropOffsetX = centerX - ratio * (centerX - cropOffsetX);
      cropOffsetY = centerY - ratio * (centerY - cropOffsetY);
      cropScale = newScale;
      clampOffset();
      drawCrop();
    });
  }

  if (cropZoomIn) {
    cropZoomIn.addEventListener("click", () => {
      if (!cropZoomSlider) return;
      const step = cropBaseScale * 0.1;
      cropZoomSlider.value = Math.min(parseFloat(cropZoomSlider.max), parseFloat(cropZoomSlider.value) + step);
      cropZoomSlider.dispatchEvent(new Event("input"));
    });
  }

  if (cropZoomOut) {
    cropZoomOut.addEventListener("click", () => {
      if (!cropZoomSlider) return;
      const step = cropBaseScale * 0.1;
      cropZoomSlider.value = Math.max(parseFloat(cropZoomSlider.min), parseFloat(cropZoomSlider.value) - step);
      cropZoomSlider.dispatchEvent(new Event("input"));
    });
  }

  // === CONFIRM ===
  if (cropConfirmBtn) {
    cropConfirmBtn.addEventListener("click", () => {
      if (!cropImage) return;
      // Create offscreen canvas at output resolution
      const offCanvas = document.createElement("canvas");
      offCanvas.width = CANVAS_SIZE;
      offCanvas.height = CANVAS_SIZE;
      const offCtx = offCanvas.getContext("2d");
      offCtx.drawImage(
        cropImage,
        cropOffsetX, cropOffsetY,
        cropImage.naturalWidth * cropScale,
        cropImage.naturalHeight * cropScale
      );
      photoData = offCanvas.toDataURL("image/jpeg", 0.85);
      if (photoPreview) {
        photoPreview.src = photoData;
        photoPreview.classList.remove("is-hidden");
      }
      if (recropBtn) recropBtn.classList.remove("is-hidden");
      closeCropModal();
    });
  }

  // === CANCEL / CLOSE ===
  function handleCropCancel() {
    if (!cropIsRecrop) {
      // New upload cancelled — revert
      photoData = "";
      if (photoPreview) {
        photoPreview.src = "";
        photoPreview.classList.add("is-hidden");
      }
      if (recropBtn) recropBtn.classList.add("is-hidden");
      if (photoInput) photoInput.value = "";
    }
    // If recrop cancelled — keep old photoData as-is
    closeCropModal();
  }

  if (cropCancelBtn) cropCancelBtn.addEventListener("click", handleCropCancel);
  if (cropClose) cropClose.addEventListener("click", handleCropCancel);
  if (cropModal) {
    cropModal.addEventListener("click", (e) => {
      if (e.target === cropModal || e.target.classList.contains("modal-overlay")) {
        handleCropCancel();
      }
    });
  }

  // === RECROP BUTTON ===
  if (recropBtn) {
    recropBtn.addEventListener("click", () => {
      if (photoData) openCropModal(photoData, true);
    });
  }

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
        openCropModal(rawDataURL, false);
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
      setSubmitLabel("client.form.update");
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

