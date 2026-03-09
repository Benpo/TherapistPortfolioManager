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
  let editingClient = null;
  let photoData = "";

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
      photoData = await readFileAsDataURL(file);
      if (photoPreview) {
        photoPreview.src = photoData;
        photoPreview.classList.remove("is-hidden");
      }
    });
  }

  if (clientId && Number.isInteger(clientId)) {
    editingClient = await PortfolioDB.getClient(clientId);
    if (editingClient) {
      document.getElementById("clientFirstName").value = editingClient.firstName || editingClient.name || "";
      document.getElementById("clientLastInitial").value = editingClient.lastInitial || "";
      document.getElementById("clientAge").value = editingClient.age || "";
      document.getElementById("clientEmail").value = editingClient.email || "";
      document.getElementById("clientPhone").value = editingClient.phone || "";
      document.getElementById("clientNotes").value = editingClient.notes || "";
      document.getElementById("clientHeartWall").checked = Boolean(editingClient.heartWall);
      photoData = editingClient.photoData || "";
      if (photoData && photoPreview) {
        photoPreview.src = photoData;
        photoPreview.classList.remove("is-hidden");
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
      let lastInitial = document.getElementById("clientLastInitial").value.trim();
      if (lastInitial.length > 1) lastInitial = lastInitial.charAt(0);
      if (lastInitial) lastInitial = lastInitial.toUpperCase();
      const ageValue = document.getElementById("clientAge").value.trim();
      const email = document.getElementById("clientEmail").value.trim();
      const phone = document.getElementById("clientPhone").value.trim();
      const notes = document.getElementById("clientNotes").value.trim();
      const typeInput = document.querySelector("input[name='clientType']:checked");
      const type = typeInput ? typeInput.value : "human";
      const heartWall = document.getElementById("clientHeartWall").checked;
      const age = ageValue ? Number.parseInt(ageValue, 10) : null;

      const displayName = lastInitial ? `${firstName} ${lastInitial}.` : firstName;

      let savedId = null;
      if (editingClient) {
        await PortfolioDB.updateClient({
          ...editingClient,
          name: displayName,
          firstName,
          lastInitial,
          age,
          email,
          phone,
          notes,
          type,
          heartWall,
          photoData,
          updatedAt: new Date().toISOString()
        });
        savedId = editingClient.id;
      } else {
        savedId = await PortfolioDB.addClient({
          name: displayName,
          firstName,
          lastInitial,
          age,
          email,
          phone,
          notes,
          type,
          heartWall,
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

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
