/**
 * settings.js — Settings page controller (slimmed parent).
 *
 * OWNS: the 9 section rows (rename + enable/disable toggle + reset button) backed
 * by PortfolioDB.therapistSettings, the Save flow, the post-save success pill, the
 * "Report a problem" entry row, the settings tablist (tab nav), and the Backups
 * tab handlers. On Save it persists each change via PortfolioDB.setTherapistSetting
 * and posts a BroadcastChannel message so peer tabs refresh their
 * App._sectionLabelCache.
 *
 * EXTRACTED OUT (no longer in this file): the Text Snippets section now lives in
 * assets/settings-snippets.js and the Photos tab now lives in
 * assets/settings-photos.js. This file still renders the tab buttons, but each of
 * those two panels is owned by its own module.
 *
 * PUBLIC SURFACE: the first IIFE returns { buildReportRow, mountReportRow } so the
 * report row is unit-testable; the tab-nav and Backups IIFEs register no globals —
 * they self-boot on DOMContentLoaded.
 *
 * DEPENDENCIES (window.* chain): App.{initCommon, t, showToast, confirmDialog},
 * PortfolioDB.{therapistSettings, getAllTherapistSettings, setTherapistSetting},
 * BackupManager.canEnableSchedule, CrashLog.clear, and the
 * "sessions-garden-settings" BroadcastChannel.
 *
 * SECURITY (invariant): Custom labels are user-controlled text. The rename input
 * is rendered via `input.value = customLabel` (browser auto-escapes the attribute
 * value); badge + label text is rendered via `el.textContent`. NEVER `innerHTML`
 * — see the comment near renderRow().
 */
window.SettingsPage = (function () {
  "use strict";

  // Three rows are disable-only: their purpose is structurally
  // fixed; the toggle and Reset still work.
  var LOCKED_RENAME = new Set(["heartShield", "issues", "nextSession"]);

  // Canonical 9-row schema. Keys + i18n labels MUST stay in sync with the
  // session form and the i18n bundle.
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

    // Lock rename input when row is disabled (in addition to LOCKED_RENAME structural lock).
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
      // CSS-driven tooltip via ::after { content: attr(data-tooltip) }.
      // Native title alone is unreliable on Safari/macOS — keep title for AT/keyboard
      // fallback and add data-tooltip for the visible CSS bubble.
      infoIcon.setAttribute("data-tooltip", tooltip);
      infoIcon.tabIndex = 0;
      // Inline SVG info-circle (constant markup, no user data) — built via DOM APIs
      // so this file contains zero direct HTML-string assignments (the no-innerHTML contract).
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
    // Visible text label next to the icon so first-time users
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

    // Toggle handler — also locks/unlocks the rename input on this row.
    // The disable-warning is no longer fired here; it now fires on Save iff there
    // are net enabled→disabled transitions vs. the last-loaded DB state.
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
  // Post-save success pill — the locked state machine that replaces the old
  // "About saved settings" blue notice.
  // ---------------------------------------------------------------------------
  // Auto-dismiss timeout for the success pill (8000ms — long enough to notice,
  // short enough not to feel sticky).
  var NOTICE_AUTO_DISMISS_MS = 8000;
  var noticeTimeoutId = null;
  // Captures the 200ms post-"leaving" cleanup setTimeout queued inside
  // dismissSavedNotice(). cancelLeave() must clear BOTH this AND noticeTimeoutId,
  // otherwise an orphaned cleanup from the previous dismiss can hide a freshly
  // re-shown pill (the regression root cause).
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
    // (orphaned cleanup was wiping freshly-shown pills).
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

    // Warn on Save iff at least one toggle transitioned enabled → disabled
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
      if (window.App && App.showToast) App.showToast("", "settings.save.failed");
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

  // ──────────────────────────────────────────────────────────────────────
  // The "Report a problem" entry row + an optional crash-log
  // "clear" affordance. Built with createElement + textContent only (NEVER
  // innerHTML — same security contract as renderRow). Kept self-contained inside
  // this section so a future settings.js extraction can relocate it as a unit.
  // ──────────────────────────────────────────────────────────────────────
  function buildReportRow() {
    var tt = (window.App && App.t) ? App.t : function (k) { return k; };

    var row = document.createElement("div");
    row.className = "settings-row settings-report-row";
    row.setAttribute("data-section-key", "reportProblem");

    var meta = document.createElement("div");
    meta.className = "settings-row-meta";

    var labelLine = document.createElement("div");
    labelLine.className = "settings-row-label-line";
    var labelEl = document.createElement("span");
    labelEl.className = "settings-row-label label";
    // SECURITY: textContent — never innerHTML.
    labelEl.textContent = tt("settings.report.label");
    labelLine.appendChild(labelEl);
    meta.appendChild(labelLine);

    var descEl = document.createElement("span");
    descEl.className = "settings-row-desc microcopy";
    descEl.textContent = tt("settings.report.desc");
    meta.appendChild(descEl);

    row.appendChild(meta);

    var controls = document.createElement("div");
    controls.className = "settings-row-controls settings-report-controls";

    // Primary affordance: navigate to the dedicated report screen.
    // "Report a problem" affordance: styled as a soft AMBER
    // "alert" (warning palette) — signals "something's wrong" without the loud
    // green primary or the solid-red Delete style, and stays visually distinct
    // from the quiet outlined "Clear problem log" beside it. Amber styling lives
    // on .settings-report-open in app.css (themed for light + dark).
    var openLink = document.createElement("a");
    openLink.className = "button settings-report-open";
    openLink.setAttribute("data-role", "report-open");
    openLink.setAttribute("href", "./report.html");
    openLink.textContent = tt("settings.report.label");
    controls.appendChild(openLink);

    // Optional crash-log "clear" affordance (CONTEXT Claude's Discretion):
    // a ghost button gated behind a neutral-tone confirm dialog.
    var clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "button ghost settings-report-clear";
    clearBtn.setAttribute("data-role", "report-clear");
    clearBtn.textContent = tt("settings.report.clear.label");
    clearBtn.onclick = function () {
      var App = window.App;
      if (!App || typeof App.confirmDialog !== "function") {
        // Defensive fallback: clear directly if the dialog is unavailable.
        if (window.CrashLog && typeof CrashLog.clear === "function") CrashLog.clear();
        return;
      }
      Promise.resolve(
        App.confirmDialog({
          titleKey: "settings.report.clear.confirm.title",
          messageKey: "settings.report.clear.confirm.body",
          confirmKey: "settings.report.clear.confirm.yes",
          cancelKey: "confirm.cancel",
          tone: "neutral",
        })
      ).then(function (confirmed) {
        if (!confirmed) return;
        if (window.CrashLog && typeof CrashLog.clear === "function") {
          Promise.resolve(CrashLog.clear()).then(function () {
            if (typeof App.showToast === "function") {
              App.showToast(tt("settings.report.cleared.toast"));
            }
          });
        }
      });
    };
    controls.appendChild(clearBtn);

    row.appendChild(controls);
    return row;
  }

  function mountReportRow() {
    try {
      var host = document.getElementById("settingsReportSection");
      if (!host) return;
      host.textContent = ""; // safe clear (idempotent re-mount on re-render)
      host.appendChild(buildReportRow());
    } catch (e) {
      try { console.warn("settings: mountReportRow failed", e); } catch (_) {}
    }
  }

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

    // Mount the "Report a problem" entry row.
    mountReportRow();

    // Re-translate + re-render on language change.
    document.addEventListener("app:language", function () { loadAndRender(); mountReportRow(); });
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

  // Export the report-row builder so it is unit-testable and so a future
  // extraction has a stable seam to relocate.
  return {
    buildReportRow: buildReportRow,
    mountReportRow: mountReportRow,
  };
})();

// ────────────────────────────────────────────────────────────────────────
// Settings page tab nav
//
// Tab nav for the settings tablist: "Personalization" (first tab), "Custom
// field names" (the section-rename form), "Text Snippets", Backups, and Photos.
// Activated tab persists across reload via URL param
// ?tab=personalize|fields|snippets|backups|photos. Default = personalize (the
// first tab button — UAT 2026-07-03, item 6).
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
      // Backups + Photos + Personalization tabs are also valid ?tab= targets.
      if (t === "fields" || t === "snippets" || t === "backups" || t === "photos" || t === "personalize") return t;
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

// ────────────────────────────────────────────────────────────────────────
// Personalization tab — F5 date-format picker (PERS-02 / D-05 / D-09)
//
// The <select id="dateFormatSelect"> in the Personalization panel:
//   - init: value = localStorage['portfolioDateFormat'] || 'auto'
//   - the 5 non-auto option LABELS are ENGINE output — filled by calling
//     window.DateFormat.format on a fixed reference date (SEAM); never
//     hand-typed. Only the 'auto' option carries a static i18n label. If the
//     engine is unavailable (e.g. a test env that does not load date-format.js)
//     the static fallback text stays — value contract is unaffected.
//   - on change: persist to localStorage, dispatch document 'app:dateformat'
//     (a forward-compat live-re-render hook), show the saved toast, NEVER reload.
//   - re-fill example labels on 'app:language' so they re-localize.
//
// Self-booting like the tab-nav IIFE above; touches only its own panel.
// ────────────────────────────────────────────────────────────────────────
(function () {
  "use strict";

  // Fixed reference date the SEAM formats into the example labels. Kept
  // NEUTRAL and clearly non-recent on purpose: an earlier value ("2026-07-02")
  // sat near "today" / the build date, so the picker options read like a real
  // current date (confusing, and it leaked the enhancement date). "2000-01-31"
  // is unambiguous in every format — day 31 (> 12) can only be the day, and
  // day/month/year are all distinct — so each option clearly conveys its shape
  // (e.g. 31/01/2000 vs 01/31/2000) without looking like a live date.
  var REFERENCE_DATE = "2000-01-31";

  function readDateFormat() {
    try { return localStorage.getItem("portfolioDateFormat") || "auto"; }
    catch (e) { return "auto"; }
  }

  function currentLang() {
    try {
      if (window.App && typeof App.getLanguage === "function") {
        var l = App.getLanguage();
        if (l) return l;
      }
      return localStorage.getItem("portfolioLang") || "en";
    } catch (e) { return "en"; }
  }

  function fillExampleLabels(sel) {
    // SEAM: option labels come from the engine, not hand-typed strings.
    if (!window.DateFormat || typeof window.DateFormat.format !== "function") return;
    var lang = currentLang();
    var opts = sel.querySelectorAll("option[data-df-example]");
    Array.prototype.forEach.call(opts, function (opt) {
      try {
        var label = window.DateFormat.format(REFERENCE_DATE, opt.value, lang);
        if (label) opt.textContent = label;
      } catch (e) {}
    });
  }

  function boot() {
    var sel = document.getElementById("dateFormatSelect");
    if (!sel) return;

    sel.value = readDateFormat();
    fillExampleLabels(sel);

    sel.addEventListener("change", function () {
      try { localStorage.setItem("portfolioDateFormat", sel.value); } catch (e) {}
      // Live re-render hook — no page reload (Pitfall 2 / FIX 7).
      document.dispatchEvent(new CustomEvent("app:dateformat", { detail: { format: sel.value } }));
      if (window.App && typeof App.showToast === "function") {
        App.showToast("", "settings.dateFormat.savedToast");
      }
    });

    // Re-localize the engine-sourced example labels when the UI language changes.
    document.addEventListener("app:language", function () { fillExampleLabels(sel); });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();

// ────────────────────────────────────────────────────────────────────────
// Backups tab handlers
//
// Wires the Backups tab:
//   - Frequency selector writes localStorage.portfolioBackupScheduleMode and
//     refreshes the helper text. The password-mandatory gate is enforced
//     via BackupManager.canEnableSchedule (a pure helper); a non-Off selection
//     without an acknowledged password reverts the selector and shows the
//     inline error.
//   - Custom-days input clamps to [1..365] and writes
//     localStorage.portfolioBackupScheduleCustomDays.
//   - Password-acked checkbox writes localStorage.portfolioBackupSchedulePasswordAcked.
//     Unchecking it while a schedule is active force-disables the schedule
//     (a schedule cannot live without an acknowledged password).
//   - Folder picker invokes BackupManager.pickBackupFolder(). Persists only the
//     folder NAME for UI; the FileSystemDirectoryHandle stays session-scoped.
//   - ON→OFF requires a neutral-tone confirm (disabling is reversible —
//     banner returns when the 7-day threshold next crosses).
// ────────────────────────────────────────────────────────────────────────
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function readScheduleMode() {
    try { return localStorage.getItem('portfolioBackupScheduleMode') || 'off'; }
    catch (_) { return 'off'; }
  }
  function readPasswordAcked() {
    try { return localStorage.getItem('portfolioBackupSchedulePasswordAcked') === 'true'; }
    catch (_) { return false; }
  }
  function readCustomDays() {
    try {
      var n = Number(localStorage.getItem('portfolioBackupScheduleCustomDays'));
      return (n && n > 0) ? n : 7;
    } catch (_) { return 7; }
  }
  // readFolderName + refreshFolderState were removed along with the
  // folder-picker UI. The BackupManager primitives
  // (pickBackupFolder / isAutoBackupSupported) stay in backup.js.

  function tt(key, fallback) {
    if (typeof App !== 'undefined' && typeof App.t === 'function') {
      var v = App.t(key);
      if (v && v !== key) return v;
    }
    return fallback || key;
  }

  function refreshFrequencyHelper() {
    var helper = $('scheduleFrequencyHelper');
    if (!helper) return;
    var mode = readScheduleMode();
    var key = (mode === 'off') ? 'schedule.frequency.helperOff' : 'schedule.frequency.helperOn';
    helper.setAttribute('data-i18n', key);
    helper.textContent = tt(key, helper.textContent || '');
  }

  function refreshCustomDaysVisibility() {
    var wrap = $('scheduleCustomDaysWrapper');
    if (!wrap) return;
    if (readScheduleMode() === 'custom') wrap.removeAttribute('hidden');
    else wrap.setAttribute('hidden', '');
  }

  /**
   * Persist a new schedule mode after enforcing the password-mandatory
   * gate and (for ON→OFF) the neutral-tone confirm. Returns true if the
   * write happened, false if the user cancelled or the gate blocked it.
   * In both rejection paths the <select> is reverted to the previously
   * persisted mode so the UI stays consistent with localStorage.
   */
  async function applyFrequencyChange(newMode) {
    var sel = $('scheduleFrequencySelect');
    var ackedErr = $('schedulePasswordError');
    var prev = readScheduleMode();

    // Gate non-Off transitions on canEnableSchedule (pure helper).
    var gateAllowed = true;
    if (typeof BackupManager !== 'undefined' &&
        typeof BackupManager.canEnableSchedule === 'function') {
      gateAllowed = BackupManager.canEnableSchedule(newMode);
    } else {
      // Defensive fallback if BackupManager is missing on this page.
      gateAllowed = (newMode === 'off') || readPasswordAcked();
    }
    if (!gateAllowed) {
      if (ackedErr) ackedErr.classList.remove('is-hidden');
      if (sel) sel.value = prev;
      // The error explains WHY the change bounced; this leads the eye to
      // WHERE to act. Pulse the
      // password callout + focus the ack checkbox, then self-clear so the
      // highlight doesn't linger after the user moves on.
      var callout = $('schedulePasswordCallout');
      var ackBox = $('schedulePasswordAcked');
      if (callout) {
        callout.classList.remove('schedule-password-callout--attention');
        // reflow so the animation restarts on repeat offences
        void callout.offsetWidth;
        callout.classList.add('schedule-password-callout--attention');
        clearTimeout(applyFrequencyChange._attnTimer);
        applyFrequencyChange._attnTimer = setTimeout(function () {
          callout.classList.remove('schedule-password-callout--attention');
        }, 2200);
      }
      if (ackBox && typeof ackBox.focus === 'function') {
        try { ackBox.focus({ preventScroll: false }); } catch (_) { ackBox.focus(); }
      }
      return false;
    }
    if (ackedErr) ackedErr.classList.add('is-hidden');
    var _calloutOk = $('schedulePasswordCallout');
    if (_calloutOk) _calloutOk.classList.remove('schedule-password-callout--attention');

    // ON → OFF requires a neutral-tone confirm (disabling is reversible — banner returns when the 7-day threshold next crosses).
    if (prev !== 'off' && newMode === 'off') {
      var confirmed = false;
      if (typeof App !== 'undefined' && typeof App.confirmDialog === 'function') {
        try {
          confirmed = await App.confirmDialog({
            titleKey: 'schedule.disableConfirm.title',
            messageKey: 'schedule.disableConfirm.body',
            confirmKey: 'schedule.disableConfirm.yes',
            cancelKey: 'schedule.disableConfirm.cancel',
            tone: 'neutral'
          });
        } catch (_) { confirmed = false; }
      } else {
        confirmed = true; // No confirm dialog available → don't block.
      }
      if (!confirmed) {
        if (sel) sel.value = prev;
        return false;
      }
    }

    try { localStorage.setItem('portfolioBackupScheduleMode', newMode); } catch (_) {}
    if (newMode === 'custom') {
      try { localStorage.setItem('portfolioBackupScheduleCustomDays', String(readCustomDays())); } catch (_) {}
    }
    refreshFrequencyHelper();
    refreshCustomDaysVisibility();
    // Surface a save-toast every time the schedule frequency is actually
    // persisted. The toast key resolves through the shared i18n bundle (the
    // 'schedule.savedToast' key in all 4 locales) so the user always sees
    // explicit confirmation that the change took effect.
    if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
      App.showToast('', 'schedule.savedToast');
    }
    return true;
  }

  function bindBackupsTab() {
    var sel = $('scheduleFrequencySelect');
    if (!sel) return; // Backups tab not present on this page.
    sel.value = readScheduleMode();
    refreshFrequencyHelper();
    refreshCustomDaysVisibility();

    var customDays = $('scheduleCustomDays');
    if (customDays) customDays.value = String(readCustomDays());

    sel.addEventListener('change', function () {
      applyFrequencyChange(sel.value);
    });

    if (customDays) {
      customDays.addEventListener('change', function () {
        var n = Math.max(1, Math.min(365, Number(customDays.value) || 7));
        customDays.value = String(n);
        try { localStorage.setItem('portfolioBackupScheduleCustomDays', String(n)); } catch (_) {}
        // Save-toast whenever the custom-days value is committed
        // (only meaningful when mode === 'custom', but firing it on every
        // commit is harmless and keeps the contract uniform).
        if (readScheduleMode() === 'custom' &&
            typeof App !== 'undefined' && typeof App.showToast === 'function') {
          App.showToast('', 'schedule.savedToast');
        }
      });
    }

    var ack = $('schedulePasswordAcked');
    if (ack) {
      ack.checked = readPasswordAcked();
      ack.addEventListener('change', function () {
        try {
          localStorage.setItem('portfolioBackupSchedulePasswordAcked',
            ack.checked ? 'true' : 'false');
        } catch (_) {}
        // If the user un-acks while a schedule is active, the schedule MUST
        // go off — an active schedule without an acked password is forbidden.
        // This is NOT the
        // user-initiated "do you want to turn it off?" path, so it must
        // NOT route through the cancellable applyFrequencyChange('off')
        // disable-confirm: cancelling that left scheduleMode=active while
        // passwordAcked=false, silently defeating the gate. Force it off
        // directly and unconditionally (mirrors applyFrequencyChange's
        // OFF write: persist + refresh helper/visibility + save-toast).
        if (!ack.checked && readScheduleMode() !== 'off') {
          try { localStorage.setItem('portfolioBackupScheduleMode', 'off'); } catch (_) {}
          sel.value = 'off';
          refreshFrequencyHelper();
          refreshCustomDaysVisibility();
          if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
            App.showToast('', 'schedule.savedToast');
          }
        } else if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
          // Save-toast for the ack-checkbox toggle itself (only
          // when we did NOT force the schedule off — that path surfaces
          // its own toast above).
          App.showToast('', 'schedule.savedToast');
        }
        var err = $('schedulePasswordError');
        if (err) err.classList.add('is-hidden');
      });
    }

    // The folder-picker click handler was removed.
    // The BackupManager.pickBackupFolder primitive stays in backup.js
    // (kept for any future caller); only the Settings → Backups UI host
    // is removed.
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', bindBackupsTab);
  }
})();
