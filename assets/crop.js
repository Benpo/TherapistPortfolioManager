/**
 * CropModule — Shared photo crop module
 *
 * Extracted from add-client.js to enable crop on any page (add-client, add-session).
 * Uses lazy DOM initialization: DOM refs are resolved on first openCropModal() call,
 * NOT at module load. This prevents null ref errors when the crop modal DOM
 * doesn't exist yet or is on a different page.
 *
 * Usage: CropModule.openCropModal(dataURL, onSave, onCancel, isRecrop)
 */
const CropModule = (function () {
  let initialized = false;
  let cropImage = null;
  let cropScale = 1;
  let cropOffsetX = 0;
  let cropOffsetY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let cropBaseScale = 1;

  const CANVAS_SIZE = 300;

  let els = {};
  let cropCtx = null;

  // Callbacks for current crop session
  let onSaveCallback = null;
  let onCancelCallback = null;
  let currentIsRecrop = false;

  function init() {
    if (initialized) return true;
    els.modal = document.getElementById("cropModal");
    els.canvas = document.getElementById("cropCanvas");
    els.zoomSlider = document.getElementById("cropZoomSlider");
    els.zoomIn = document.getElementById("cropZoomIn");
    els.zoomOut = document.getElementById("cropZoomOut");
    els.confirmBtn = document.getElementById("cropConfirmBtn");
    els.cancelBtn = document.getElementById("cropCancelBtn");
    els.closeBtn = document.getElementById("cropClose");
    if (!els.modal || !els.canvas) return false;

    cropCtx = els.canvas.getContext("2d");
    if (!cropCtx) return false;

    var canvasContainer = els.canvas.parentElement;

    // Pointer events on canvas container
    if (canvasContainer) {
      canvasContainer.addEventListener("pointerdown", function (e) {
        isDragging = true;
        dragStartX = e.clientX - cropOffsetX;
        dragStartY = e.clientY - cropOffsetY;
        canvasContainer.style.cursor = "grabbing";
        canvasContainer.setPointerCapture(e.pointerId);
      });

      canvasContainer.addEventListener("pointermove", function (e) {
        if (!isDragging || !cropImage) return;
        cropOffsetX = e.clientX - dragStartX;
        cropOffsetY = e.clientY - dragStartY;
        clampOffset();
        drawCrop();
      });

      canvasContainer.addEventListener("pointerup", function () {
        isDragging = false;
        canvasContainer.style.cursor = "grab";
      });

      canvasContainer.addEventListener("pointercancel", function () {
        isDragging = false;
        canvasContainer.style.cursor = "grab";
      });

      // Wheel zoom
      canvasContainer.addEventListener("wheel", function (e) {
        e.preventDefault();
        if (!els.zoomSlider || !cropImage) return;
        var delta = e.deltaY > 0 ? -cropBaseScale * 0.1 : cropBaseScale * 0.1;
        var newVal = Math.min(
          parseFloat(els.zoomSlider.max),
          Math.max(parseFloat(els.zoomSlider.min), parseFloat(els.zoomSlider.value) + delta)
        );
        els.zoomSlider.value = newVal;
        els.zoomSlider.dispatchEvent(new Event("input"));
      }, { passive: false });
    }

    // Zoom slider
    if (els.zoomSlider) {
      els.zoomSlider.addEventListener("input", function () {
        if (!cropImage) return;
        var newScale = parseFloat(els.zoomSlider.value);
        var centerX = CANVAS_SIZE / 2;
        var centerY = CANVAS_SIZE / 2;
        var ratio = newScale / cropScale;
        cropOffsetX = centerX - ratio * (centerX - cropOffsetX);
        cropOffsetY = centerY - ratio * (centerY - cropOffsetY);
        cropScale = newScale;
        clampOffset();
        drawCrop();
      });
    }

    if (els.zoomIn) {
      els.zoomIn.addEventListener("click", function () {
        if (!els.zoomSlider) return;
        var step = cropBaseScale * 0.1;
        els.zoomSlider.value = Math.min(parseFloat(els.zoomSlider.max), parseFloat(els.zoomSlider.value) + step);
        els.zoomSlider.dispatchEvent(new Event("input"));
      });
    }

    if (els.zoomOut) {
      els.zoomOut.addEventListener("click", function () {
        if (!els.zoomSlider) return;
        var step = cropBaseScale * 0.1;
        els.zoomSlider.value = Math.max(parseFloat(els.zoomSlider.min), parseFloat(els.zoomSlider.value) - step);
        els.zoomSlider.dispatchEvent(new Event("input"));
      });
    }

    // Confirm
    if (els.confirmBtn) {
      els.confirmBtn.addEventListener("click", function () {
        if (!cropImage) return;
        var offCanvas = document.createElement("canvas");
        offCanvas.width = CANVAS_SIZE;
        offCanvas.height = CANVAS_SIZE;
        var offCtx = offCanvas.getContext("2d");
        offCtx.drawImage(
          cropImage,
          cropOffsetX, cropOffsetY,
          cropImage.naturalWidth * cropScale,
          cropImage.naturalHeight * cropScale
        );
        var croppedDataUrl = offCanvas.toDataURL("image/jpeg", 0.85);
        closeCropModal();
        if (onSaveCallback) onSaveCallback(croppedDataUrl);
      });
    }

    // Cancel / Close
    function handleCancel() {
      closeCropModal();
      if (onCancelCallback) onCancelCallback(currentIsRecrop);
    }

    if (els.cancelBtn) els.cancelBtn.addEventListener("click", handleCancel);
    if (els.closeBtn) els.closeBtn.addEventListener("click", handleCancel);

    initialized = true;
    return true;
  }

  function drawCrop() {
    if (!cropCtx || !cropImage) return;
    var dpr = window.devicePixelRatio || 1;
    els.canvas.width = CANVAS_SIZE * dpr;
    els.canvas.height = CANVAS_SIZE * dpr;
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
    var imgW = cropImage.naturalWidth * cropScale;
    var imgH = cropImage.naturalHeight * cropScale;
    var minX = CANVAS_SIZE - imgW;
    var minY = CANVAS_SIZE - imgH;
    cropOffsetX = Math.min(0, Math.max(minX, cropOffsetX));
    cropOffsetY = Math.min(0, Math.max(minY, cropOffsetY));
  }

  function closeCropModal() {
    if (els.modal) {
      els.modal.classList.add("is-hidden");
      if (typeof App !== "undefined" && App.unlockBodyScroll) App.unlockBodyScroll();
    }
    cropImage = null;
  }

  /**
   * Open the crop modal with an image.
   * @param {string} dataURL - The image data URL to crop
   * @param {function} onSave - Called with croppedDataUrl on confirm
   * @param {function} onCancel - Called on cancel (receives isRecrop boolean)
   * @param {boolean} isRecrop - Whether this is a re-crop of an existing image
   */
  function openCropModal(dataURL, onSave, onCancel, isRecrop) {
    if (!init()) {
      console.error("CropModule: DOM not ready");
      return;
    }
    onSaveCallback = onSave || null;
    onCancelCallback = onCancel || null;
    currentIsRecrop = !!isRecrop;

    var img = new Image();
    img.onload = function () {
      cropImage = img;
      var baseScale = Math.max(CANVAS_SIZE / img.naturalWidth, CANVAS_SIZE / img.naturalHeight);
      cropBaseScale = baseScale;
      cropScale = baseScale;
      cropOffsetX = (CANVAS_SIZE - img.naturalWidth * cropScale) / 2;
      cropOffsetY = (CANVAS_SIZE - img.naturalHeight * cropScale) / 2;
      if (els.zoomSlider) {
        els.zoomSlider.min = baseScale;
        els.zoomSlider.max = baseScale * 3;
        els.zoomSlider.step = baseScale * 0.05;
        els.zoomSlider.value = baseScale;
      }
      drawCrop();
      els.modal.classList.remove("is-hidden");
      if (typeof App !== "undefined" && App.lockBodyScroll) App.lockBodyScroll();
      if (typeof App !== "undefined" && App.applyTranslations) App.applyTranslations(els.modal);
    };
    img.src = dataURL;
  }

  return { openCropModal: openCropModal };
})();
