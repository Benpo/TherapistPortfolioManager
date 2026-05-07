/**
 * settings.js — Settings page controller (Phase 22 Plan 04).
 *
 * Renders 9 section rows (rename + enable/disable toggle + reset button) backed
 * by PortfolioDB.therapistSettings. On Save, persists changes via
 * PortfolioDB.setTherapistSetting and posts a BroadcastChannel message so peer
 * tabs refresh their App._sectionLabelCache.
 *
 * SECURITY (T-22-04-01 mitigation): Custom labels are user-controlled text. The
 * rename input is rendered via `input.value = customLabel` (browser auto-escapes
 * attribute value); badge + label text is rendered via `el.textContent`. NEVER
 * `innerHTML` — see the comment near renderRow().
 */
window.SettingsPage = (function () {
  "use strict";

  // Three rows are disable-only per SPEC REQ-2 amendment (2026-04-28):
  // their purpose is structurally fixed; the toggle and Reset still work.
  var LOCKED_RENAME = new Set(["heartShield", "issues", "nextSession"]);

  // Canonical 9-row schema. Keys + i18n labels MUST match Plan 02 + Plan 06.
  var SECTION_DEFS = [
    { key: "trapped",              i18nLabelKey: "session.form.trapped",              i18nDescKey: "settings.row.trapped.description" },
    { key: "insights",             i18nLabelKey: "session.form.insights",             i18nDescKey: "settings.row.insights.description" },
    { key: "limitingBeliefs",      i18nLabelKey: "session.form.limitingBeliefs",      i18nDescKey: "settings.row.limitingBeliefs.description" },
    { key: "additionalTech",       i18nLabelKey: "session.form.additionalTech",       i18nDescKey: "settings.row.additionalTech.description" },
    { key: "heartShield",          i18nLabelKey: "session.form.heartShield",          i18nDescKey: "settings.row.heartShield.description" },
    { key: "heartShieldEmotions",  i18nLabelKey: "session.form.heartShieldEmotions",  i18nDescKey: "settings.row.heartShieldEmotions.description" },
    { key: "issues",               i18nLabelKey: "session.form.issuesHeading",        i18nDescKey: "settings.row.issues.description" },
    { key: "comments",             i18nLabelKey: "session.form.comments",             i18nDescKey: "settings.row.comments.description" },
    { key: "nextSession",          i18nLabelKey: "session.form.nextSession",          i18nDescKey: "settings.row.nextSession.description" },
  ];

  var formDirty = false;
  var formSaving = false;
  // currentMap: sectionKey -> {sectionKey, customLabel, enabled} from last DB load.
  var currentMap = new Map();

  /**
   * Build an SVG element using DOM APIs only (NEVER innerHTML).
   * @param {Array<{tag:string, attrs:Record<string,string>}>} children
   * @param {Record<string,string>} svgAttrs
   * @returns {SVGElement}
   */
  function buildSvg(svgAttrs, children) {
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    Object.keys(svgAttrs).forEach(function (k) { svg.setAttribute(k, svgAttrs[k]); });
    children.forEach(function (c) {
      var el = document.createElementNS(NS, c.tag);
      Object.keys(c.attrs).forEach(function (k) { el.setAttribute(k, c.attrs[k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function buildInfoIconSvg(size) {
    var s = String(size || 16);
    return buildSvg(
      { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: s, height: s, fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
      [
        { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
        { tag: "line",   attrs: { x1: "12", y1: "16", x2: "12", y2: "12" } },
        { tag: "line",   attrs: { x1: "12", y1: "8",  x2: "12.01", y2: "8" } }
      ]
    );
  }

  function buildResetIconSvg() {
    return buildSvg(
      { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: "20", height: "20", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
      [
        { tag: "path",     attrs: { d: "M3 12a9 9 0 0 1 15.5-6.36L21 8" } },
        { tag: "polyline", attrs: { points: "21 3 21 8 16 8" } },
        { tag: "path",     attrs: { d: "M21 12a9 9 0 0 1-15.5 6.36L3 16" } },
        { tag: "polyline", attrs: { points: "3 21 3 16 8 16" } }
      ]
    );
  }

  // ---------------------------------------------------------------------------
  // DOM rendering
  // ---------------------------------------------------------------------------

  /**
   * Build one .settings-row DOM element for a section definition.
   * @param {{key:string,i18nLabelKey:string,i18nDescKey:string}} def
   * @param {{customLabel?:string|null,enabled?:boolean}} current
   */
  function renderRow(def, current) {
    var customLabel = (current && typeof current.customLabel === "string") ? current.customLabel : "";
    var enabled = !current || current.enabled !== false; // default true
    var hasOverride = (customLabel && customLabel.length > 0) || enabled === false;
    var locked = LOCKED_RENAME.has(def.key);

    var defaultText = window.App && App.t ? App.t(def.i18nLabelKey) : def.i18nLabelKey;
    var descText    = window.App && App.t ? App.t(def.i18nDescKey)  : def.i18nDescKey;

    var row = document.createElement("div");
    row.className = "settings-row";
    row.setAttribute("data-section-key", def.key);

    // Meta block: label + description + (optional) "Disabled in Settings" badge
    var meta = document.createElement("div");
    meta.className = "settings-row-meta";

    var labelLine = document.createElement("div");
    labelLine.className = "settings-row-label-line";

    var labelEl = document.createElement("span");
    labelEl.className = "settings-row-label label";
    // SECURITY: textContent — never innerHTML.
    labelEl.textContent = defaultText;
    labelLine.appendChild(labelEl);

    if (!enabled) {
      var badge = document.createElement("span");
      badge.className = "disabled-indicator-badge";
      // SECURITY: textContent — never innerHTML.
      badge.textContent = window.App && App.t ? App.t("settings.indicator.disabled") : "Disabled in Settings";
      labelLine.appendChild(badge);
    }
    meta.appendChild(labelLine);

    var descEl = document.createElement("span");
    descEl.className = "settings-row-desc microcopy";
    // SECURITY: textContent — never innerHTML.
    descEl.textContent = descText;
    meta.appendChild(descEl);

    row.appendChild(meta);

    // Rename input + (for locked rows) info icon
    var renameWrap = document.createElement("div");
    renameWrap.className = "settings-rename-wrap";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "input settings-rename-input";
    input.maxLength = 60;
    input.setAttribute("maxlength", "60"); // explicit attribute for verification
    input.placeholder = defaultText;
    // SECURITY: .value assignment is auto-escaped for attribute rendering.
    input.value = customLabel;
    input.setAttribute("data-section-key", def.key);

    // Gap 1: lock rename input when row is disabled (in addition to LOCKED_RENAME structural lock).
    if (!enabled && !locked) {
      input.disabled = true;
      input.setAttribute("aria-disabled", "true");
    }

    if (locked) {
      input.disabled = true;
      input.setAttribute("aria-disabled", "true");
      var tooltipKey = "settings.rename.locked.tooltip";
      var tooltip = window.App && App.t ? App.t(tooltipKey) : tooltipKey;
      input.title = tooltip;
      var infoId = "settings-locked-info-" + def.key;
      input.setAttribute("aria-describedby", infoId);

      var infoIcon = document.createElement("span");
      infoIcon.className = "settings-locked-info";
      infoIcon.id = infoId;
      infoIcon.setAttribute("role", "img");
      infoIcon.setAttribute("aria-label", tooltip);
      infoIcon.title = tooltip;
      infoIcon.tabIndex = 0;
      // Inline SVG info-circle (constant markup, no user data) — built via DOM APIs
      // so this file contains zero direct HTML-string assignments (T-22-04-01 contract).
      infoIcon.appendChild(buildInfoIconSvg(16));
      renameWrap.appendChild(input);
      renameWrap.appendChild(infoIcon);
    } else {
      renameWrap.appendChild(input);
    }
    row.appendChild(renameWrap);

    // Controls: toggle switch + reset button
    var controls = document.createElement("div");
    controls.className = "settings-row-controls";

    var toggleLabel = document.createElement("label");
    toggleLabel.className = "toggle-switch";
    var toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.className = "settings-enable-toggle";
    toggleInput.setAttribute("data-section-key", def.key);
    toggleInput.checked = enabled;
    toggleInput.setAttribute("aria-label", defaultText);
    var toggleSlider = document.createElement("span");
    toggleSlider.className = "toggle-slider";
    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(toggleSlider);
    controls.appendChild(toggleLabel);

    var resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "button ghost reset-row-btn";
    resetBtn.setAttribute("data-section-key", def.key);
    var resetTip = window.App && App.t ? App.t("settings.reset.tooltip") : "Reset to default name";
    resetBtn.setAttribute("aria-label", resetTip);
    resetBtn.title = resetTip;
    // SECURITY: Inline SVG built via DOM APIs (no innerHTML, no user data).
    resetBtn.appendChild(buildResetIconSvg());
    if (!hasOverride) {
      resetBtn.disabled = true;
      resetBtn.setAttribute("aria-disabled", "true");
    }

    resetBtn.addEventListener("click", function () {
      // Per-row reset: clear input + re-enable toggle locally; commit happens at Save.
      input.value = "";
      toggleInput.checked = true;
      // remove badge if present
      var existingBadge = labelLine.querySelector(".disabled-indicator-badge");
      if (existingBadge) existingBadge.remove();
      formDirty = true;
      updateSaveButtonState();
      // After reset, the row has no override yet (relative to defaults).
      resetBtn.disabled = true;
      resetBtn.setAttribute("aria-disabled", "true");
    });

    // Toggle handler — also locks/unlocks the rename input on this row (Gap 1).
    // The disable-warning is no longer fired here; it now fires on Save iff there
    // are net enabled→disabled transitions vs. the last-loaded DB state (Gap 2 / D1).
    toggleInput.addEventListener("change", function () {
      if (toggleInput.checked) {
        // Re-enable: remove badge if present
        var existingBadge = labelLine.querySelector(".disabled-indicator-badge");
        if (existingBadge) existingBadge.remove();
        // Re-enable rename input (unless the row is structurally locked).
        if (!LOCKED_RENAME.has(def.key)) {
          input.disabled = false;
          input.setAttribute("aria-disabled", "false");
        }
      } else {
        // user just disabled the row
        // Add the badge inline if not present
        if (!labelLine.querySelector(".disabled-indicator-badge")) {
          var newBadge = document.createElement("span");
          newBadge.className = "disabled-indicator-badge";
          newBadge.textContent = window.App && App.t ? App.t("settings.indicator.disabled") : "Disabled in Settings";
          labelLine.appendChild(newBadge);
        }
        // Lock the rename input (LOCKED_RENAME rows are already locked — leave alone).
        if (!LOCKED_RENAME.has(def.key)) {
          input.disabled = true;
          input.setAttribute("aria-disabled", "true");
        }
      }
      formDirty = true;
      updateSaveButtonState();
    });

    controls.appendChild(resetBtn);
    row.appendChild(controls);

    return row;
  }

  // ---------------------------------------------------------------------------
  // Page lifecycle
  // ---------------------------------------------------------------------------

  function getRefs() {
    return {
      form: document.getElementById("settingsForm"),
      rowsContainer: document.getElementById("settingsRowsContainer"),
      saveBtn: document.getElementById("settingsSaveBtn"),
      discardBtn: document.getElementById("settingsDiscardBtn"),
      savedNotice: document.getElementById("settingsSavedNotice")
    };
  }

  // ---------------------------------------------------------------------------
  // Post-save success pill — D2 locked state machine.
  // Replaces the OLD "About saved settings" blue notice.
  // ---------------------------------------------------------------------------
  var noticeTimeoutId = null;
  var noticeListenersOn = false;

  function getNoticeEls() {
    return {
      noticeEl: document.getElementById("settingsSavedNotice"),
      formEl: document.getElementById("settingsForm"),
      saveBtnEl: document.getElementById("settingsSaveBtn")
    };
  }

  function showSavedNotice() {
    var els = getNoticeEls();
    if (!els.noticeEl) return;
    cancelLeave();
    detachDismissTriggers();
    els.noticeEl.hidden = false;
    // Force a reflow so the transition runs from the initial (hidden) state.
    void els.noticeEl.offsetHeight;
    els.noticeEl.dataset.active = "";
    attachDismissTriggers();
    noticeTimeoutId = setTimeout(function () { dismissSavedNotice(); }, 6000);
  }

  function dismissSavedNotice() {
    var els = getNoticeEls();
    if (!els.noticeEl) return;
    if (!("active" in els.noticeEl.dataset)) return;
    els.noticeEl.dataset.active = "leaving";
    setTimeout(function () {
      var n = document.getElementById("settingsSavedNotice");
      if (!n) return;
      n.hidden = true;
      delete n.dataset.active;
    }, 200);
    cancelLeave();
    detachDismissTriggers();
  }

  function cancelLeave() {
    if (noticeTimeoutId) {
      clearTimeout(noticeTimeoutId);
      noticeTimeoutId = null;
    }
  }

  function onAnyInput()   { dismissSavedNotice(); }
  function onNextSave()   { dismissSavedNotice(); }
  function onCloseClick() { dismissSavedNotice(); }

  function attachDismissTriggers() {
    if (noticeListenersOn) return;
    var els = getNoticeEls();
    if (!els.formEl || !els.saveBtnEl || !els.noticeEl) return;
    els.formEl.addEventListener("input",  onAnyInput, { once: true, capture: true });
    els.formEl.addEventListener("change", onAnyInput, { once: true, capture: true });
    els.saveBtnEl.addEventListener("click", onNextSave, { once: true });
    var closeBtn = els.noticeEl.querySelector(".settings-saved-notice-close");
    if (closeBtn) closeBtn.addEventListener("click", onCloseClick, { once: true });
    noticeListenersOn = true;
  }

  function detachDismissTriggers() {
    var els = getNoticeEls();
    if (els.formEl) {
      els.formEl.removeEventListener("input",  onAnyInput, { capture: true });
      els.formEl.removeEventListener("change", onAnyInput, { capture: true });
    }
    if (els.saveBtnEl) els.saveBtnEl.removeEventListener("click", onNextSave);
    if (els.noticeEl) {
      var closeBtn = els.noticeEl.querySelector(".settings-saved-notice-close");
      if (closeBtn) closeBtn.removeEventListener("click", onCloseClick);
    }
    noticeListenersOn = false;
  }

  function updateSaveButtonState() {
    var refs = getRefs();
    if (refs.saveBtn) refs.saveBtn.disabled = !formDirty;
  }

  async function loadAndRender() {
    var refs = getRefs();
    if (!refs.rowsContainer) return;

    // Refresh from DB
    currentMap = new Map();
    try {
      if (typeof PortfolioDB !== "undefined" && typeof PortfolioDB.getAllTherapistSettings === "function") {
        var rows = await PortfolioDB.getAllTherapistSettings();
        rows.forEach(function (r) { currentMap.set(r.sectionKey, r); });
      }
    } catch (e) {
      console.warn("settings: getAllTherapistSettings failed", e);
    }

    // Clear and re-render
    refs.rowsContainer.textContent = ""; // safe clear (no innerHTML="")
    SECTION_DEFS.forEach(function (def) {
      var current = currentMap.get(def.key) || {};
      var row = renderRow(def, current);
      refs.rowsContainer.appendChild(row);
    });

    formDirty = false;
    updateSaveButtonState();
  }

  // ---------------------------------------------------------------------------
  // Save / Discard
  // ---------------------------------------------------------------------------

  /**
   * Compare current staged toggle states against last-persisted DB state.
   * Returns the list of section keys whose staged state shows a NET enabled → disabled
   * transition since the last successful load (i.e. prevEnabled === true && nextEnabled === false).
   * Re-enables (false → true) and unchanged rows are excluded. A row that was flipped
   * off then back on within the same staging cycle yields prev === next and is excluded.
   *
   * @returns {string[]} — section keys newly disabled at Save time.
   */
  function computeDisableTransitions() {
    var refs = getRefs();
    var transitions = [];
    if (!refs.rowsContainer) return transitions;
    for (var k = 0; k < SECTION_DEFS.length; k++) {
      var d = SECTION_DEFS[k];
      var t = refs.rowsContainer.querySelector('.settings-enable-toggle[data-section-key="' + d.key + '"]');
      if (!t) continue;
      var stored = currentMap.get(d.key);
      var prevEnabled = stored ? (stored.enabled !== false) : true;
      var nextEnabled = !!t.checked;
      if (prevEnabled === true && nextEnabled === false) transitions.push(d.key);
    }
    return transitions;
  }

  async function onSave() {
    var refs = getRefs();
    if (!refs.rowsContainer) return;

    var inputs = refs.rowsContainer.querySelectorAll(".settings-rename-input");
    // maxlength validation pass
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].value && inputs[i].value.length > 60) {
        if (window.App && App.showToast) App.showToast("", "settings.rename.tooLong");
        return;
      }
    }

    // Gap 2 (D1): warn on Save iff at least one toggle transitioned enabled → disabled
    // since the last persisted DB state. Re-enables alone do NOT trigger; same-cycle
    // off-then-on yields no transition and does NOT trigger.
    var disabledNow = computeDisableTransitions();
    if (disabledNow.length > 0) {
      var okConfirm = false;
      try {
        okConfirm = await App.confirmDialog({
          titleKey: "settings.confirm.disable.title",
          messageKey: "settings.confirm.disable.body",
          confirmKey: "settings.confirm.disable.confirm",
          cancelKey: "settings.confirm.disable.cancel",
          tone: "neutral"
        });
      } catch (e) { okConfirm = false; }
      if (!okConfirm) {
        // formSaving never became true on this path → just return
        return;
      }
    }

    formSaving = true;
    try {
      for (var j = 0; j < SECTION_DEFS.length; j++) {
        var def = SECTION_DEFS[j];
        var renameEl = refs.rowsContainer.querySelector('.settings-rename-input[data-section-key="' + def.key + '"]');
        var toggleEl = refs.rowsContainer.querySelector('.settings-enable-toggle[data-section-key="' + def.key + '"]');
        if (!renameEl || !toggleEl) continue;
        var trimmed = (renameEl.value || "").trim();
        var record = {
          sectionKey: def.key,
          customLabel: trimmed.length > 0 ? trimmed : null,
          enabled: !!toggleEl.checked
        };
        await PortfolioDB.setTherapistSetting(record);
      }

      // Cross-tab sync
      try {
        if (typeof BroadcastChannel !== "undefined") {
          var ch = new BroadcastChannel("sessions-garden-settings");
          ch.postMessage({ type: "therapist-settings-changed", at: Date.now() });
          ch.close();
        }
      } catch (e) { /* swallow — local save still succeeded */ }

      formDirty = false;
      formSaving = false;
      updateSaveButtonState();

      if (window.App && App.showToast) App.showToast("", "settings.saved.toast");

      // D2: post-save success pill (replaces the OLD blue "About saved settings" notice).
      showSavedNotice();

      // Re-render so badges + reset-disabled state reflect persisted state.
      await loadAndRender();
    } catch (err) {
      formSaving = false;
      console.warn("settings: save failed", err);
      if (window.App && App.showToast) App.showToast("Save failed", "");
    }
  }

  async function onDiscard() {
    if (!formDirty) return;
    var ok = false;
    try {
      ok = await App.confirmDialog({
        titleKey: "settings.discard.title",
        messageKey: "settings.discard.body",
        confirmKey: "settings.discard.confirm",
        cancelKey: "settings.discard.cancel"
      });
    } catch (e) { ok = false; }
    if (!ok) return;
    await loadAndRender();
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", async function () {
    if (window.App && typeof App.initCommon === "function") {
      await App.initCommon();
    }

    var refs = getRefs();

    // Dirty tracking on form input/change (rename input typing).
    if (refs.form) {
      refs.form.addEventListener("input", function (e) {
        if (e.target && e.target.classList && e.target.classList.contains("settings-rename-input")) {
          formDirty = true;
          updateSaveButtonState();
        }
      });
    }

    if (refs.saveBtn) refs.saveBtn.addEventListener("click", onSave);
    if (refs.discardBtn) refs.discardBtn.addEventListener("click", onDiscard);

    // Re-translate + re-render on language change.
    document.addEventListener("app:language", function () { loadAndRender(); });
    // External tab updated settings — refresh.
    document.addEventListener("app:settings-changed", function () { loadAndRender(); });

    // Beforeunload guard for dirty state.
    window.addEventListener("beforeunload", function (e) {
      if (formDirty && !formSaving) {
        e.preventDefault();
        e.returnValue = "";
      }
    });

    loadAndRender();
  });

  return {};
})();
