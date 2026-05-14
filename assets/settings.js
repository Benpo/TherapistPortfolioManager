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
      // Gap 4: CSS-driven tooltip via ::after { content: attr(data-tooltip) }.
      // Native title alone is unreliable on Safari/macOS — keep title for AT/keyboard
      // fallback and add data-tooltip for the visible CSS bubble.
      infoIcon.setAttribute("data-tooltip", tooltip);
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
    // Gap N4 (22-13): visible text label next to the icon so first-time users
    // can tell what the button does without hovering. aria-label + title keep
    // the longer "Reset to default name" for desktop hover + screen readers.
    var resetLabel = document.createElement("span");
    resetLabel.className = "reset-row-btn-label";
    resetLabel.textContent = window.App && App.t ? App.t("settings.row.revert.label") : "Revert";
    resetBtn.appendChild(resetLabel);
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
  // Auto-dismiss timeout for the success pill. Bumped 6000ms -> 8000ms in 22-13
  // (Gap N5 D2) so the pill is noticed without feeling sticky.
  var NOTICE_AUTO_DISMISS_MS = 8000;
  var noticeTimeoutId = null;
  // Captures the 200ms post-"leaving" cleanup setTimeout queued inside
  // dismissSavedNotice(). cancelLeave() must clear BOTH this AND noticeTimeoutId,
  // otherwise an orphaned cleanup from the previous dismiss can hide a freshly
  // re-shown pill (Gap N5 regression root cause).
  var noticeLeaveTimeoutId = null;
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
    noticeTimeoutId = setTimeout(function () { dismissSavedNotice(); }, NOTICE_AUTO_DISMISS_MS);
  }

  function dismissSavedNotice() {
    var els = getNoticeEls();
    if (!els.noticeEl) return;
    if (!("active" in els.noticeEl.dataset)) return;
    els.noticeEl.dataset.active = "leaving";
    // Clear the auto-dismiss timeout (no longer needed — we are already leaving).
    // clearTimeout is a safe no-op on null/stale ids, so the explicit null assign
    // is the meaningful state-reset.
    clearTimeout(noticeTimeoutId);
    noticeTimeoutId = null;
    // Clear any prior leave-cleanup from a back-to-back dismiss before queuing a
    // new one (handles the edge case where dismiss fires twice within ~200ms).
    clearTimeout(noticeLeaveTimeoutId);
    // Capture the 200ms cleanup so cancelLeave can kill it before a re-show
    // (Gap N5 fix — orphaned cleanup was wiping freshly-shown pills).
    noticeLeaveTimeoutId = setTimeout(function () {
      noticeLeaveTimeoutId = null;
      var n = document.getElementById("settingsSavedNotice");
      if (!n) return;
      n.hidden = true;
      delete n.dataset.active;
    }, 200);
    detachDismissTriggers();
  }

  function cancelLeave() {
    if (noticeTimeoutId) {
      clearTimeout(noticeTimeoutId);
      noticeTimeoutId = null;
    }
    clearTimeout(noticeLeaveTimeoutId);
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

// ────────────────────────────────────────────────────────────────────────
// Phase 24 Plan 05 — Snippet Settings UI
//
// Self-contained IIFE that owns the Text Snippets section: prefix input,
// list view, search + tag filter, modal editor (single-lang default with
// "Edit translations" reveal), import/export with collision modal,
// per-row + bulk reset for modified seeds.
//
// Cross-IIFE identifier-resolution chain (per .continue-here.md):
//   window.App.{getSnippets, refreshSnippetCache, t, showToast, confirmDialog,
//               getLanguage, initCommon}     — set by assets/app.js IIFE
//   window.PortfolioDB.{getSnippet, addSnippet, updateSnippet, deleteSnippet,
//                       resetSeedSnippet, validateSnippetShape, getAllSnippets}
//                                            — set by assets/db.js IIFE
//   window.Snippets.{getPrefix, setPrefix}    — set by assets/snippets.js IIFE
//   window.SNIPPETS_SEED                      — set by assets/snippets-seed.js IIFE
//   window.I18N                               — set by assets/i18n-*.js
//   BroadcastChannel "sessions-garden-settings" carries {type:'snippets-changed'}
//
// SECURITY: all user content rendered via textContent / dynamic createElement.
// NEVER innerHTML for trigger / expansion / tag values. Confirmed by grep gate.
// ────────────────────────────────────────────────────────────────────────
(function () {
  "use strict";

  // ──────────────────────────────────────────────────────────────────────
  // Pure-function helpers — extracted for unit testing AND consumed by the
  // wiring below. Exposed via window.__SnippetEditorHelpers per the same
  // pattern as Snippets.__testExports at snippets.js:457.
  // ──────────────────────────────────────────────────────────────────────

  /**
   * isTriggerUnique — case-insensitive uniqueness check.
   * @param {string} candidate
   * @param {Array} cache - snapshot from App.getSnippets()
   * @param {string=} editingId - if editing, exclude this id
   * @returns {boolean}
   */
  function isTriggerUnique(candidate, cache, editingId) {
    var lower = String(candidate || "").toLowerCase();
    for (var i = 0; i < cache.length; i++) {
      var s = cache[i];
      if (editingId && s.id === editingId) continue;
      if (String(s.trigger || "").toLowerCase() === lower) return false;
    }
    return true;
  }

  /**
   * validateImportPayload — throws on malformed payload, returns validated rows.
   * @param {object} parsed - JSON.parse result
   * @param {function} validateRow - injected row validator (PortfolioDB.validateSnippetShape in prod)
   * @returns {Array} the validated rows
   * @throws Error with descriptive message
   */
  function validateImportPayload(parsed, validateRow) {
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.snippets)) {
      throw new Error("InvalidPayload: 'snippets' must be an array");
    }
    var rows = parsed.snippets;
    var seen = new Set();
    for (var i = 0; i < rows.length; i++) {
      try {
        validateRow(rows[i]);
      } catch (err) {
        throw new Error("row " + i + ": " + (err && err.message ? err.message : "invalid"));
      }
      var trig = String(rows[i].trigger || "").toLowerCase();
      if (seen.has(trig)) {
        throw new Error("DuplicateInFile: trigger '" + trig + "' appears more than once");
      }
      seen.add(trig);
    }
    return rows;
  }

  /**
   * detectImportCollisions — case-insensitive trigger collision detection.
   * @param {Array} rows - validated import rows
   * @param {Array} cache - existing App.getSnippets() snapshot
   * @returns {Array<{trigger:string, existingId:string, importingRow:object}>}
   */
  function detectImportCollisions(rows, cache) {
    var byTrigger = new Map();
    for (var i = 0; i < cache.length; i++) {
      byTrigger.set(String(cache[i].trigger || "").toLowerCase(), cache[i].id);
    }
    var collisions = [];
    for (var j = 0; j < rows.length; j++) {
      var trig = String(rows[j].trigger || "").toLowerCase();
      if (byTrigger.has(trig)) {
        collisions.push({
          trigger: trig,
          existingId: byTrigger.get(trig),
          importingRow: rows[j],
        });
      }
    }
    return collisions;
  }

  /**
   * filterSnippetList — applies search + tag filters + alphabetical sort.
   * Search is current-locale only (D-16): matches trigger OR expansions[currentLang].
   * Tag filter OR-combines (any matching tag). Search AND tags AND-combine.
   * @param {Array} cache
   * @param {{searchText:string, activeTags:string[], currentLang:string}} opts
   * @returns {Array}
   */
  function filterSnippetList(cache, opts) {
    opts = opts || {};
    var search = String(opts.searchText || "").toLowerCase().trim();
    var tags = Array.isArray(opts.activeTags) ? opts.activeTags : [];
    var lang = opts.currentLang || "en";
    var tagSet = new Set(tags);
    var filtered = cache.filter(function (s) {
      var matchSearch = true;
      if (search) {
        var trig = String(s.trigger || "").toLowerCase();
        var exp = String((s.expansions || {})[lang] || "").toLowerCase();
        matchSearch = trig.indexOf(search) >= 0 || exp.indexOf(search) >= 0;
      }
      var matchTag = tags.length === 0;
      if (!matchTag) {
        var sTags = Array.isArray(s.tags) ? s.tags : [];
        for (var i = 0; i < sTags.length; i++) {
          if (tagSet.has(sTags[i])) { matchTag = true; break; }
        }
      }
      return matchSearch && matchTag;
    });
    filtered.sort(function (a, b) {
      var ta = String(a.trigger || "");
      var tb = String(b.trigger || "");
      if (ta < tb) return -1;
      if (ta > tb) return 1;
      return 0;
    });
    return filtered;
  }

  /**
   * isModifiedSeed — predicate for Reset-to-default visibility AND export inclusion.
   * Returns true ONLY for origin='seed' snippets that differ from the matching
   * SNIPPETS_SEED entry. Compare is case-sensitive, byte-exact (trailing
   * whitespace counts as a diff).
   * @param {object} snippet
   * @param {Array} seedPack - window.SNIPPETS_SEED
   * @returns {boolean}
   */
  function isModifiedSeed(snippet, seedPack) {
    if (!snippet || snippet.origin !== "seed") return false;
    var match = null;
    for (var i = 0; i < seedPack.length; i++) {
      if (seedPack[i].id === snippet.id) { match = seedPack[i]; break; }
    }
    if (!match) return false;
    if (snippet.updatedAt && snippet.createdAt && snippet.updatedAt > snippet.createdAt) {
      return true;
    }
    if (String(snippet.trigger || "") !== String(match.trigger || "")) return true;
    var locales = ["he", "en", "cs", "de"];
    for (var k = 0; k < locales.length; k++) {
      var loc = locales[k];
      var seedExp = (match.expansions || {})[loc] || "";
      var userExp = (snippet.expansions || {})[loc] || "";
      if (seedExp !== userExp) return true;
    }
    var seedTags = Array.isArray(match.tags) ? match.tags : [];
    var userTags = Array.isArray(snippet.tags) ? snippet.tags : [];
    if (seedTags.length !== userTags.length) return true;
    for (var t = 0; t < seedTags.length; t++) {
      if (seedTags[t] !== userTags[t]) return true;
    }
    return false;
  }

  // Expose for unit tests (mirrors Snippets.__testExports at snippets.js:457).
  if (typeof window !== "undefined") {
    window.__SnippetEditorHelpers = {
      isTriggerUnique: isTriggerUnique,
      validateImportPayload: validateImportPayload,
      detectImportCollisions: detectImportCollisions,
      filterSnippetList: filterSnippetList,
      isModifiedSeed: isModifiedSeed,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Constants
  // ──────────────────────────────────────────────────────────────────────

  var TRIGGER_REGEX = /^[a-z0-9-]{2,32}$/;
  var PREFIX_INVALID_CHAR_REGEX = /[a-zA-Z0-9\s"<>]/;
  var LOCALES = ["he", "en", "cs", "de"];
  var SEARCH_DEBOUNCE_MS = 150;
  var BC_NAME = "sessions-garden-settings";
  var BC_TYPE = "snippets-changed";

  // ──────────────────────────────────────────────────────────────────────
  // Module state
  // ──────────────────────────────────────────────────────────────────────

  var activeTagFilters = new Set();
  var editingSnippet = null;          // null = add mode; otherwise the snippet object
  var translationsRevealed = false;
  var pendingImport = null;            // { rows, collisions, decisions: Map<trigger, 'replace'|'skip'> }
  var searchDebounceTimer = null;
  var broadcastChannel = null;
  var booted = false;

  function t(key) {
    return window.App && typeof window.App.t === "function" ? window.App.t(key) : key;
  }

  function getCurrentLang() {
    if (window.App && typeof window.App.getLanguage === "function") {
      return window.App.getLanguage();
    }
    return localStorage.getItem("portfolioLang") || "en";
  }

  function postSnippetsChanged() {
    try {
      if (!broadcastChannel) broadcastChannel = new BroadcastChannel(BC_NAME);
      broadcastChannel.postMessage({ type: BC_TYPE });
    } catch (e) { /* BroadcastChannel unsupported — silently skip */ }
  }

  async function afterSnippetMutation() {
    if (window.App && typeof window.App.refreshSnippetCache === "function") {
      await window.App.refreshSnippetCache();
    }
    postSnippetsChanged();
    renderSnippetList();
  }

  function showToast(messageKey) {
    if (window.App && typeof window.App.showToast === "function") {
      window.App.showToast("", messageKey);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // DOM refs (lazy)
  // ──────────────────────────────────────────────────────────────────────

  function $(id) { return document.getElementById(id); }

  // ──────────────────────────────────────────────────────────────────────
  // Prefix input
  // ──────────────────────────────────────────────────────────────────────

  function wirePrefixInput() {
    var input = $("snippetPrefixInput");
    var errorEl = $("snippetPrefixError");
    if (!input || !errorEl) return;

    // Prefill
    try {
      var currentPrefix = window.Snippets && typeof window.Snippets.getPrefix === "function"
        ? window.Snippets.getPrefix()
        : ";";
      input.value = currentPrefix;
    } catch (e) { input.value = ";"; }

    function clearError() {
      errorEl.classList.add("is-hidden");
      errorEl.textContent = "";
    }
    function showError(messageKey) {
      errorEl.textContent = t(messageKey);
      errorEl.classList.remove("is-hidden");
    }

    function validateLocal(value) {
      if (typeof value !== "string" || value.length < 1 || value.length > 2) {
        return "snippets.prefix.error.length";
      }
      if (PREFIX_INVALID_CHAR_REGEX.test(value)) {
        return "snippets.prefix.error.invalidChar";
      }
      return null;
    }

    input.addEventListener("change", async function () {
      var value = input.value;
      var errorKey = validateLocal(value);
      if (errorKey) {
        showError(errorKey);
        // Restore previous valid prefix in the input
        try {
          input.value = window.Snippets.getPrefix();
        } catch (e) { /* leave value as-is */ }
        return;
      }
      clearError();
      try {
        if (window.Snippets && typeof window.Snippets.setPrefix === "function") {
          window.Snippets.setPrefix(value);
        }
        showToast("snippets.toast.saved");
      } catch (err) {
        // Defensive: Plan 04 setPrefix validates length only, so a local-validation
        // pass should never throw — but hedge against future tightening.
        showError("snippets.prefix.error.invalidChar");
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // List rendering
  // ──────────────────────────────────────────────────────────────────────

  function stripNamePrefix(text) {
    // Seed expansions are formatted "<EmotionName> — <meaning>".
    // List preview shows the meaning only (strip everything up to and
    // including the first em-dash + surrounding spaces). Falls back to the
    // full text if no em-dash is present.
    if (typeof text !== "string") return "";
    var idx = text.indexOf("—");
    if (idx < 0) return text;
    return text.slice(idx + 1).trim();
  }

  function listPreviewText(snippet, lang) {
    var exp = (snippet.expansions || {})[lang] || "";
    if (!exp) {
      // Fallback chain: active → en → he → de → cs
      var chain = [lang, "en", "he", "de", "cs"];
      for (var i = 0; i < chain.length; i++) {
        if ((snippet.expansions || {})[chain[i]]) {
          exp = snippet.expansions[chain[i]];
          break;
        }
      }
    }
    var preview = stripNamePrefix(exp);
    if (preview.length > 80) preview = preview.slice(0, 77) + "…";
    return preview;
  }

  function renderTagFilterChips(allTags) {
    var row = $("snippetTagFilterRow");
    if (!row) return;
    while (row.firstChild) row.removeChild(row.firstChild);
    var sorted = Array.from(allTags).sort();
    sorted.forEach(function (tag) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "snippets-tag-chip" + (activeTagFilters.has(tag) ? " is-active" : "");
      chip.textContent = tag;
      chip.setAttribute("data-tag", tag);
      chip.setAttribute("aria-pressed", activeTagFilters.has(tag) ? "true" : "false");
      chip.addEventListener("click", function () {
        if (activeTagFilters.has(tag)) activeTagFilters.delete(tag);
        else activeTagFilters.add(tag);
        renderSnippetList();
      });
      row.appendChild(chip);
    });
  }

  function renderSnippetList() {
    var listEl = $("snippetList");
    var emptyEl = $("snippetListEmpty");
    if (!listEl) return;

    var cache = (window.App && typeof window.App.getSnippets === "function")
      ? window.App.getSnippets()
      : [];

    // Build tag set across all snippets (for filter chip row)
    var allTags = new Set();
    cache.forEach(function (s) {
      (s.tags || []).forEach(function (tag) { allTags.add(tag); });
    });
    renderTagFilterChips(allTags);

    var searchInput = $("snippetSearchInput");
    var searchText = searchInput ? searchInput.value : "";
    var lang = getCurrentLang();
    var filtered = filterSnippetList(cache, {
      searchText: searchText,
      activeTags: Array.from(activeTagFilters),
      currentLang: lang,
    });

    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

    if (filtered.length === 0) {
      if (emptyEl) emptyEl.classList.remove("is-hidden");
    } else {
      if (emptyEl) emptyEl.classList.add("is-hidden");
      var prefix = "";
      try { prefix = window.Snippets.getPrefix(); } catch (e) { prefix = ";"; }
      filtered.forEach(function (snippet) {
        listEl.appendChild(buildListRow(snippet, prefix, lang));
      });
    }
  }

  function buildListRow(snippet, prefix, lang) {
    var row = document.createElement("div");
    row.className = "snippets-list-row";
    row.setAttribute("data-snippet-id", snippet.id);

    var trig = document.createElement("span");
    trig.className = "snippets-list-trigger";
    trig.textContent = prefix + (snippet.trigger || "");
    row.appendChild(trig);

    var preview = document.createElement("span");
    preview.className = "snippets-list-preview";
    preview.textContent = listPreviewText(snippet, lang);
    row.appendChild(preview);

    var tagsEl = document.createElement("div");
    tagsEl.className = "snippets-list-tags";
    (snippet.tags || []).forEach(function (tag) {
      var chip = document.createElement("span");
      chip.className = "snippets-tag-chip";
      chip.textContent = tag;
      tagsEl.appendChild(chip);
    });
    row.appendChild(tagsEl);

    var editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "icon-button";
    editBtn.setAttribute("aria-label", t("snippets.list.edit.aria"));
    editBtn.textContent = "✎";
    editBtn.addEventListener("click", function () { openEditor(snippet); });
    row.appendChild(editBtn);

    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-button danger";
    delBtn.setAttribute("aria-label", t("snippets.list.delete.aria"));
    delBtn.textContent = "🗑";
    delBtn.addEventListener("click", function () { handleDelete(snippet); });
    row.appendChild(delBtn);

    return row;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Editor modal
  // ──────────────────────────────────────────────────────────────────────

  function openEditor(snippet) {
    editingSnippet = snippet && snippet.id ? snippet : null;
    translationsRevealed = false;

    var modal = $("snippetEditorModal");
    var titleEl = $("snippetEditorTitle");
    var triggerInput = $("snippetEditorTrigger");
    var triggerErr = $("snippetEditorTriggerError");
    var activeLangLabel = $("snippetEditorActiveLangLabel");
    var activeExpansion = $("snippetEditorActiveExpansion");
    var translationsBlock = $("snippetEditorTranslationsBlock");
    var translationsToggle = $("snippetEditorTranslationsToggle");
    var deleteBtn = $("snippetEditorDelete");
    var resetBtn = $("snippetEditorReset");

    if (!modal || !triggerInput || !activeExpansion) return;

    triggerErr.classList.add("is-hidden");
    triggerErr.textContent = "";

    var lang = getCurrentLang();
    activeLangLabel.textContent = t("snippets.editor.expansion.lang." + lang) ||
      ("Expansion (" + lang.toUpperCase() + ")");
    activeLangLabel.setAttribute("for", "snippetEditorActiveExpansion");

    if (editingSnippet) {
      titleEl.textContent = t("snippets.editor.title.edit");
      triggerInput.value = editingSnippet.trigger || "";
      activeExpansion.value = (editingSnippet.expansions || {})[lang] || "";
      renderTagChips(editingSnippet.tags || []);
      deleteBtn.classList.remove("is-hidden");
      if (isModifiedSeed(editingSnippet, window.SNIPPETS_SEED || [])) {
        resetBtn.classList.remove("is-hidden");
      } else {
        resetBtn.classList.add("is-hidden");
      }
    } else {
      titleEl.textContent = t("snippets.editor.title.add");
      triggerInput.value = "";
      activeExpansion.value = "";
      renderTagChips([]);
      deleteBtn.classList.add("is-hidden");
      resetBtn.classList.add("is-hidden");
    }

    // Translations block — populate but keep hidden by default (D-12)
    while (translationsBlock.firstChild) translationsBlock.removeChild(translationsBlock.firstChild);
    translationsBlock.classList.add("is-hidden");
    translationsToggle.setAttribute("aria-expanded", "false");
    LOCALES.forEach(function (loc) {
      if (loc === lang) return;
      var wrapper = document.createElement("div");
      wrapper.className = "snippets-editor-translation form-field";
      var labelEl = document.createElement("label");
      labelEl.className = "label";
      var dot = document.createElement("span");
      dot.className = "snippets-editor-locale-dot";
      var initialExp = editingSnippet ? ((editingSnippet.expansions || {})[loc] || "") : "";
      dot.setAttribute("data-state", initialExp ? "filled" : "empty");
      labelEl.appendChild(dot);
      var labelText = document.createElement("span");
      labelText.textContent = t("snippets.editor.expansion.lang." + loc) || loc.toUpperCase();
      labelEl.appendChild(labelText);
      var ta = document.createElement("textarea");
      ta.className = "textarea";
      ta.rows = 4;
      ta.value = initialExp;
      ta.setAttribute("data-locale", loc);
      ta.addEventListener("input", function () {
        dot.setAttribute("data-state", ta.value ? "filled" : "empty");
      });
      var fieldId = "snippetEditorExp_" + loc;
      ta.id = fieldId;
      labelEl.setAttribute("for", fieldId);
      wrapper.appendChild(labelEl);
      wrapper.appendChild(ta);
      translationsBlock.appendChild(wrapper);
    });

    modal.classList.remove("is-hidden");
    triggerInput.focus();
  }

  function closeEditor() {
    var modal = $("snippetEditorModal");
    if (modal) modal.classList.add("is-hidden");
    editingSnippet = null;
    translationsRevealed = false;
  }

  function readEditorTags() {
    var list = $("snippetEditorTagsList");
    if (!list) return [];
    var out = [];
    for (var i = 0; i < list.children.length; i++) {
      var tag = list.children[i].getAttribute("data-tag");
      if (tag) out.push(tag);
    }
    return out;
  }

  function renderTagChips(tags) {
    var list = $("snippetEditorTagsList");
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    tags.forEach(function (tag) { list.appendChild(buildTagChip(tag)); });
  }

  function buildTagChip(tag) {
    var li = document.createElement("li");
    li.className = "snippets-tag-chip";
    li.setAttribute("data-tag", tag);
    li.textContent = tag;
    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", "Remove");
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", function () {
      li.remove();
    });
    li.appendChild(removeBtn);
    return li;
  }

  function wireTagChipInput() {
    var input = $("snippetEditorTagsTextInput");
    var list = $("snippetEditorTagsList");
    var suggestions = $("snippetEditorTagsSuggestions");
    if (!input || !list || !suggestions) return;

    function addCurrent() {
      var raw = input.value.trim().toLowerCase();
      if (!raw) return false;
      var existing = readEditorTags();
      if (existing.indexOf(raw) >= 0) {
        input.value = "";
        return true;
      }
      list.appendChild(buildTagChip(raw));
      input.value = "";
      hideSuggestions();
      return true;
    }

    function hideSuggestions() {
      suggestions.classList.add("is-hidden");
      while (suggestions.firstChild) suggestions.removeChild(suggestions.firstChild);
    }

    function showSuggestions(query) {
      var allTags = new Set();
      var cache = (window.App && window.App.getSnippets) ? window.App.getSnippets() : [];
      cache.forEach(function (s) { (s.tags || []).forEach(function (tag) { allTags.add(tag); }); });
      var existing = new Set(readEditorTags());
      var q = String(query || "").toLowerCase();
      var matches = Array.from(allTags)
        .filter(function (tag) {
          return tag.indexOf(q) === 0 && !existing.has(tag);
        })
        .sort()
        .slice(0, 8);
      while (suggestions.firstChild) suggestions.removeChild(suggestions.firstChild);
      if (matches.length === 0) {
        hideSuggestions();
        return;
      }
      matches.forEach(function (tag) {
        var item = document.createElement("button");
        item.type = "button";
        item.className = "snippets-tag-suggestion";
        item.textContent = tag;
        item.addEventListener("click", function () {
          list.appendChild(buildTagChip(tag));
          input.value = "";
          hideSuggestions();
        });
        suggestions.appendChild(item);
      });
      suggestions.classList.remove("is-hidden");
    }

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
        if (input.value.trim()) {
          e.preventDefault();
          addCurrent();
        }
      } else if (e.key === "Backspace" && !input.value) {
        // Remove last chip when backspacing on empty input
        var last = list.lastElementChild;
        if (last) last.remove();
      }
    });

    input.addEventListener("input", function () {
      var q = input.value.trim();
      if (q) showSuggestions(q);
      else hideSuggestions();
    });

    input.addEventListener("blur", function () {
      setTimeout(hideSuggestions, 150);
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Save / Delete / Reset
  // ──────────────────────────────────────────────────────────────────────

  async function handleSave() {
    var triggerInput = $("snippetEditorTrigger");
    var triggerErr = $("snippetEditorTriggerError");
    var activeExpansion = $("snippetEditorActiveExpansion");
    var translationsBlock = $("snippetEditorTranslationsBlock");

    var trigger = String(triggerInput.value || "").trim().toLowerCase();
    triggerErr.classList.add("is-hidden");
    triggerErr.textContent = "";

    if (!TRIGGER_REGEX.test(trigger)) {
      triggerErr.textContent = t("snippets.editor.trigger.error.format");
      triggerErr.classList.remove("is-hidden");
      return;
    }

    var cache = window.App && window.App.getSnippets ? window.App.getSnippets() : [];
    var editingId = editingSnippet ? editingSnippet.id : null;
    if (!isTriggerUnique(trigger, cache, editingId)) {
      triggerErr.textContent = t("snippets.editor.trigger.error.duplicate");
      triggerErr.classList.remove("is-hidden");
      return;
    }

    var lang = getCurrentLang();
    var expansions = {};
    LOCALES.forEach(function (loc) { expansions[loc] = ""; });
    expansions[lang] = activeExpansion.value || "";
    // Pull from translations textareas if present
    if (translationsBlock) {
      var areas = translationsBlock.querySelectorAll("textarea[data-locale]");
      for (var i = 0; i < areas.length; i++) {
        var loc = areas[i].getAttribute("data-locale");
        if (loc) expansions[loc] = areas[i].value || "";
      }
    }
    // Preserve existing locale content for empty current-locale on edit
    if (editingSnippet) {
      LOCALES.forEach(function (loc) {
        if (!expansions[loc] && editingSnippet.expansions && editingSnippet.expansions[loc] && loc !== lang) {
          // Translations were not revealed; preserve original
          expansions[loc] = editingSnippet.expansions[loc];
        }
      });
    }

    var tags = readEditorTags();
    var now = new Date().toISOString();

    var candidate;
    if (editingSnippet) {
      candidate = Object.assign({}, editingSnippet, {
        trigger: trigger,
        expansions: expansions,
        tags: tags,
        updatedAt: now,
      });
    } else {
      var newId = "user." + Date.now() + "." + Math.random().toString(36).slice(2, 8);
      candidate = {
        id: newId,
        trigger: trigger,
        expansions: expansions,
        tags: tags,
        origin: "user",
        createdAt: now,
        updatedAt: now,
      };
    }

    try {
      if (window.PortfolioDB && typeof window.PortfolioDB.validateSnippetShape === "function") {
        window.PortfolioDB.validateSnippetShape(candidate);
      }
      if (editingSnippet) {
        await window.PortfolioDB.updateSnippet(candidate);
      } else {
        await window.PortfolioDB.addSnippet(candidate);
      }
      await afterSnippetMutation();
      closeEditor();
      showToast("snippets.toast.saved");
    } catch (err) {
      triggerErr.textContent = (err && err.message) || String(err);
      triggerErr.classList.remove("is-hidden");
    }
  }

  async function handleDelete(snippet) {
    if (!snippet || !snippet.id) return;
    var ok = false;
    try {
      ok = await window.App.confirmDialog({
        titleKey: "snippets.confirm.delete.title",
        messageKey: "snippets.confirm.delete.body",
        confirmKey: "snippets.confirm.delete.confirm",
        cancelKey: "confirm.cancel",
      });
    } catch (e) { ok = false; }
    if (!ok) return;
    try {
      await window.PortfolioDB.deleteSnippet(snippet.id);
      await afterSnippetMutation();
      closeEditor();
      showToast("snippets.toast.deleted");
    } catch (err) {
      console.error("Snippet delete failed:", err);
    }
  }

  async function handleResetToDefault() {
    if (!editingSnippet || !editingSnippet.id) return;
    var ok = false;
    try {
      ok = await window.App.confirmDialog({
        titleKey: "snippets.confirm.resetSeed.title",
        messageKey: "snippets.confirm.resetSeed.body",
        confirmKey: "snippets.confirm.resetSeed.confirm",
        cancelKey: "confirm.cancel",
        tone: "primary",
      });
    } catch (e) { ok = false; }
    if (!ok) return;
    try {
      await window.PortfolioDB.resetSeedSnippet(editingSnippet.id);
      await afterSnippetMutation();
      closeEditor();
      showToast("snippets.toast.saved");
    } catch (err) {
      console.error("Reset to default failed:", err);
    }
  }

  async function handleResetAllModifiedSeeds() {
    var cache = window.App && window.App.getSnippets ? window.App.getSnippets() : [];
    var seed = window.SNIPPETS_SEED || [];
    var modified = cache.filter(function (s) { return isModifiedSeed(s, seed); });
    if (modified.length === 0) return;
    var ok = false;
    try {
      ok = await window.App.confirmDialog({
        titleKey: "snippets.confirm.resetAll.title",
        messageKey: "snippets.confirm.resetAll.body",
        confirmKey: "snippets.confirm.resetAll.confirm",
        cancelKey: "confirm.cancel",
        tone: "primary",
      });
    } catch (e) { ok = false; }
    if (!ok) return;
    try {
      for (var i = 0; i < modified.length; i++) {
        await window.PortfolioDB.resetSeedSnippet(modified[i].id);
      }
      await afterSnippetMutation();
      var toast = window.App && window.App.showToast;
      if (toast) {
        var label = t("snippets.toast.resetAll").replace("{n}", String(modified.length));
        window.App.showToast(label, "");
      }
    } catch (err) {
      console.error("Reset all modified seeds failed:", err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Import / Export
  // ──────────────────────────────────────────────────────────────────────

  function handleExport() {
    var cache = window.App && window.App.getSnippets ? window.App.getSnippets() : [];
    var seed = window.SNIPPETS_SEED || [];
    var payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      snippets: cache.filter(function (s) {
        return s.origin === "user" || isModifiedSeed(s, seed);
      }),
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "snippets-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("snippets.toast.exported");
  }

  function handleImport() {
    var fileInput = $("importSnippetsFile");
    if (fileInput) fileInput.click();
  }

  function handleImportFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var text = e.target.result;
      var parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        showToast("snippets.import.error.invalidJson");
        return;
      }
      var validator = (window.PortfolioDB && window.PortfolioDB.validateSnippetShape)
        ? window.PortfolioDB.validateSnippetShape.bind(window.PortfolioDB)
        : function () {};
      var rows;
      try {
        rows = validateImportPayload(parsed, validator);
      } catch (err) {
        var msg = err && err.message ? err.message : String(err);
        if (msg.toLowerCase().indexOf("duplicate") >= 0) {
          showToast("snippets.import.error.duplicateInFile");
        } else {
          showToast("snippets.import.error.invalidJson");
        }
        return;
      }
      var cache = window.App && window.App.getSnippets ? window.App.getSnippets() : [];
      var collisions = detectImportCollisions(rows, cache);
      if (collisions.length === 0) {
        applyImport(rows, [], new Map());
        return;
      }
      pendingImport = {
        rows: rows,
        collisions: collisions,
        decisions: new Map(),
      };
      // Default decisions: Replace for each collision
      collisions.forEach(function (c) {
        pendingImport.decisions.set(c.trigger, "replace");
      });
      openCollisionModal();
    };
    reader.readAsText(file);
  }

  function openCollisionModal() {
    if (!pendingImport) return;
    var modal = $("snippetImportModal");
    var summary = $("snippetImportSummary");
    var list = $("snippetImportCollisionList");
    if (!modal || !summary || !list) return;

    var template = t("snippets.import.summary");
    summary.textContent = template
      .replace("{n}", String(pendingImport.rows.length))
      .replace("{c}", String(pendingImport.collisions.length));

    while (list.firstChild) list.removeChild(list.firstChild);
    var prefix = "";
    try { prefix = window.Snippets.getPrefix(); } catch (e) { prefix = ";"; }
    pendingImport.collisions.forEach(function (c) {
      var row = document.createElement("div");
      row.className = "snippets-import-collision-row";
      row.setAttribute("data-trigger", c.trigger);
      var label = document.createElement("span");
      label.className = "snippets-import-collision-trigger";
      label.textContent = prefix + c.trigger;
      row.appendChild(label);
      var toggle = document.createElement("div");
      toggle.className = "snippets-import-collision-toggle";
      toggle.setAttribute("role", "group");
      ["replace", "skip"].forEach(function (choice) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("data-choice", choice);
        btn.textContent = t("snippets.import.choice." + choice);
        if (pendingImport.decisions.get(c.trigger) === choice) {
          btn.classList.add("is-active");
        }
        btn.addEventListener("click", function () {
          pendingImport.decisions.set(c.trigger, choice);
          // Update sibling button states
          var siblings = toggle.querySelectorAll("button[data-choice]");
          for (var i = 0; i < siblings.length; i++) {
            siblings[i].classList.toggle("is-active",
              siblings[i].getAttribute("data-choice") === choice);
          }
        });
        toggle.appendChild(btn);
      });
      row.appendChild(toggle);
      list.appendChild(row);
    });

    modal.classList.remove("is-hidden");
  }

  function closeCollisionModal() {
    var modal = $("snippetImportModal");
    if (modal) modal.classList.add("is-hidden");
  }

  async function applyImport(rows, collisions, decisions) {
    var cache = window.App && window.App.getSnippets ? window.App.getSnippets() : [];
    var collisionMap = new Map();
    collisions.forEach(function (c) { collisionMap.set(c.trigger.toLowerCase(), c); });
    var importedCount = 0;

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var trigKey = String(row.trigger || "").toLowerCase();
      var collision = collisionMap.get(trigKey);
      try {
        if (collision) {
          var choice = decisions.get(trigKey) || "replace";
          if (choice === "skip") continue;
          // Replace: preserve existing id
          var replaced = Object.assign({}, row, {
            id: collision.existingId,
            updatedAt: new Date().toISOString(),
          });
          await window.PortfolioDB.updateSnippet(replaced);
        } else {
          // No collision: add fresh
          var fresh = Object.assign({}, row, {
            updatedAt: new Date().toISOString(),
          });
          await window.PortfolioDB.addSnippet(fresh);
        }
        importedCount++;
      } catch (err) {
        console.warn("Import row " + i + " failed:", err);
      }
    }

    await afterSnippetMutation();
    closeCollisionModal();
    pendingImport = null;
    var toast = window.App && window.App.showToast;
    if (toast) {
      var label = t("snippets.toast.imported").replace("{n}", String(importedCount));
      window.App.showToast(label, "");
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Boot
  // ──────────────────────────────────────────────────────────────────────

  function boot() {
    if (booted) return;
    booted = true;

    wirePrefixInput();
    wireTagChipInput();

    // Search debounce
    var searchInput = $("snippetSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(renderSnippetList, SEARCH_DEBOUNCE_MS);
      });
    }

    // Add button
    var addBtn = $("addSnippetBtn");
    if (addBtn) addBtn.addEventListener("click", function () { openEditor(null); });

    // Editor modal controls
    var saveBtn = $("snippetEditorSave");
    if (saveBtn) saveBtn.addEventListener("click", handleSave);
    var cancelBtn = $("snippetEditorCancel");
    if (cancelBtn) cancelBtn.addEventListener("click", closeEditor);
    var closeBtn = $("snippetEditorClose");
    if (closeBtn) closeBtn.addEventListener("click", closeEditor);
    var delBtn = $("snippetEditorDelete");
    if (delBtn) delBtn.addEventListener("click", function () {
      if (editingSnippet) handleDelete(editingSnippet);
    });
    var resetBtn = $("snippetEditorReset");
    if (resetBtn) resetBtn.addEventListener("click", handleResetToDefault);

    var translationsToggle = $("snippetEditorTranslationsToggle");
    var translationsBlock = $("snippetEditorTranslationsBlock");
    if (translationsToggle && translationsBlock) {
      translationsToggle.addEventListener("click", function () {
        translationsRevealed = !translationsRevealed;
        translationsBlock.classList.toggle("is-hidden", !translationsRevealed);
        translationsToggle.setAttribute("aria-expanded", String(translationsRevealed));
      });
    }

    // Import / Export
    var exportBtn = $("exportSnippetsBtn");
    if (exportBtn) exportBtn.addEventListener("click", handleExport);
    var importBtn = $("importSnippetsBtn");
    if (importBtn) importBtn.addEventListener("click", handleImport);
    var fileInput = $("importSnippetsFile");
    if (fileInput) {
      fileInput.addEventListener("change", function (e) {
        var f = e.target.files && e.target.files[0];
        if (f) handleImportFile(f);
        e.target.value = "";  // reset so the same file can be picked again
      });
    }
    var applyBtn = $("snippetImportApply");
    if (applyBtn) applyBtn.addEventListener("click", function () {
      if (!pendingImport) return;
      applyImport(pendingImport.rows, pendingImport.collisions, pendingImport.decisions);
    });
    var importCancelBtn = $("snippetImportCancel");
    if (importCancelBtn) importCancelBtn.addEventListener("click", function () {
      pendingImport = null;
      closeCollisionModal();
    });
    var importCloseBtn = $("snippetImportClose");
    if (importCloseBtn) importCloseBtn.addEventListener("click", function () {
      pendingImport = null;
      closeCollisionModal();
    });

    // Reset all modified seeds
    var resetAllBtn = $("resetAllSeedsBtn");
    if (resetAllBtn) resetAllBtn.addEventListener("click", handleResetAllModifiedSeeds);

    // Cross-tab + post-mutation list refresh
    document.addEventListener("app:snippets-changed", renderSnippetList);
    document.addEventListener("app:language", renderSnippetList);

    renderSnippetList();
  }

  // The existing SettingsPage IIFE (above) already registers a DOMContentLoaded
  // handler that awaits window.App.initCommon(). Registering a second handler
  // that ALSO calls initCommon() causes double-mounting in #headerActions
  // (app.js:initThemeToggle + initLanguagePopover have no "already mounted"
  // guard, unlike app.js:initSettingsGear at line 322). Instead, boot directly
  // — renderSnippetList() will pick up an empty cache initially, then re-render
  // when the original handler's initCommon completes and fires the
  // app:snippets-changed DOM event (see boot() — document listener).
  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();

// ────────────────────────────────────────────────────────────────────────
// Phase 24 Plan 05 — Settings page tab nav
//
// Two-tab tablist: "Custom field names" (the Phase 22 form) and
// "Text Snippets" (the Plan 05 surface). Activated tab persists across
// reload via URL param ?tab=fields|snippets. Default = fields.
//
// Accessibility per WAI-ARIA tabs pattern:
//   - role=tablist on the container
//   - role=tab on each button with aria-selected + aria-controls
//   - role=tabpanel on each panel with aria-labelledby
//   - inactive tab buttons have tabindex=-1 (only active is in tab order)
//   - inactive panels use hidden attribute
//   - keyboard nav: ArrowLeft/Right between tabs, Home/End to first/last
// ────────────────────────────────────────────────────────────────────────
(function () {
  "use strict";

  function readUrlTab() {
    try {
      var params = new URLSearchParams(window.location.search);
      var t = params.get("tab");
      if (t === "fields" || t === "snippets") return t;
    } catch (e) {}
    return null;
  }

  function writeUrlTab(name) {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set("tab", name);
      window.history.replaceState({}, "", url.toString());
    } catch (e) {}
  }

  function boot() {
    var tablist = document.querySelector('.settings-tabs[role="tablist"]');
    if (!tablist) return;
    var tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    if (tabs.length === 0) return;

    function activate(name, opts) {
      opts = opts || {};
      var focusTab = false;
      if (opts.focus) focusTab = true;
      var anyMatched = false;
      tabs.forEach(function (btn) {
        var match = btn.getAttribute("data-tab") === name;
        if (match) anyMatched = true;
        btn.classList.toggle("is-active", match);
        btn.setAttribute("aria-selected", match ? "true" : "false");
        btn.tabIndex = match ? 0 : -1;
        var panelId = btn.getAttribute("aria-controls");
        var panel = panelId ? document.getElementById(panelId) : null;
        if (panel) {
          if (match) panel.removeAttribute("hidden");
          else panel.setAttribute("hidden", "");
        }
        if (match && focusTab) btn.focus();
      });
      if (anyMatched && !opts.skipUrl) writeUrlTab(name);
    }

    // Wire click handlers
    tabs.forEach(function (btn, idx) {
      btn.addEventListener("click", function () {
        var name = btn.getAttribute("data-tab");
        if (name) activate(name);
      });
      btn.addEventListener("keydown", function (e) {
        var key = e.key;
        if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") return;
        e.preventDefault();
        var next;
        if (key === "Home") next = 0;
        else if (key === "End") next = tabs.length - 1;
        else if (key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
        else /* ArrowRight */ next = (idx + 1) % tabs.length;
        var nextName = tabs[next].getAttribute("data-tab");
        if (nextName) activate(nextName, { focus: true });
      });
    });

    // Initial activation: ?tab= URL param, else first tab.
    var initial = readUrlTab();
    if (!initial) initial = tabs[0].getAttribute("data-tab");
    activate(initial, { skipUrl: !readUrlTab() });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
