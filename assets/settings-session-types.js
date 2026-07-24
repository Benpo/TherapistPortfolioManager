// ────────────────────────────────────────────────────────────────────────
// settings-session-types.js — Session-type editor (F4, Phase 37; item 9
// redesign, UAT 2026-07-03).
//
// Reuses the Fields-tab "Custom field names" language. The Personalization
// #sessionTypesEditor container renders a two-tier list:
//   • 5 LOCKED defaults (clinic/online/remote/proxy/other, fixed order) — an
//     editable name input + a REVERT button (reusing the Fields .reset-row-btn
//     + revert icon) that is disabled until the name differs from the default
//     and, when clicked, restores the default name + a shared .settings-locked-
//     info ⓘ icon whose tooltip is "Built-in types can be renamed but not
//     deleted." There is NO lock symbol and NO pencil (superseded design).
//   • CUSTOM types — an editable name input + an inline Delete (trash) button.
//
// SAVE/DISCARD BATCH MODEL (matches the Fields tab — Ben, UAT 2026-07-03):
// renames, adds, and deletes STAGE as pending edits in an in-memory working
// copy and commit only via #sessionTypesSaveBtn; #sessionTypesDiscardBtn
// reverts to the last-saved list. On Save, any STAGED deletion of a custom type
// that is still in use fires the warn+reassign flow (App.countSessionsByType →
// confirm "N sessions use this, they move to Other" → App.reassignSessionType
// to the legacy `other` key) BEFORE the type is dropped — so no session is ever
// silently left pointing at a deleted key and the user is always warned.
//
// STORAGE (D-17 / FIX 1): the list persists as ONE localStorage key
// `portfolioSessionTypes` = { overrides: { <lockedKey>: "<label>" }, custom: [
// { key, label } ] } — localStorage, NOT IndexedDB. Only deviations are stored:
// overrides + custom additions, never materialized defaults. Renames are GLOBAL
// (one language-agnostic override per locked key — D-16).
//
// CROSS-TAB (FIX 2): after a Save this editor dispatches a within-tab
// `app:session-types-changed` CustomEvent (the native `storage` event does NOT
// fire in the writing tab). App.initCommon re-dispatches it in peer tabs off the
// native `storage` event, so displays there update too.
//
// SECURITY (T-37-07-SEC): every user label renders via input.value / textContent
// — NEVER innerHTML. Icons are built via createElementNS DOM APIs (the SVG code
// is COPIED from settings.js buildInfoIconSvg / buildResetIconSvg and
// settings-snippets.js TRASH_ICON_PATHS — those symbols are IIFE-private there
// and cannot be called by name; FIX 8).
//
// BOOT (Pitfall 1): boots directly on DOMContentLoaded — it must NEVER call
// App.initCommon (the fields IIFE already does; a second call double-mounts the
// header chrome).
//
// Cross-IIFE dependencies (window.* set by other IIFEs):
//   window.App.{t, showToast, confirmDialog, getSessionTypes, formatSessionType,
//               countSessionsByType, reassignSessionType}
//   window.I18N                                — assets/i18n-*.js
//   localStorage['portfolioSessionTypes']       — this module owns read/write
// ────────────────────────────────────────────────────────────────────────
(function () {
  "use strict";

  var STORAGE_KEY = "portfolioSessionTypes";
  var CHANGED_EVENT = "app:session-types-changed";
  var MAX_LABEL_LEN = 60;

  // The 5 locked default session types in fixed render order (D-13).
  var LOCKED_DEFAULTS = ["clinic", "online", "remote", "proxy", "other"];
  var LOCKED_SET = {};
  LOCKED_DEFAULTS.forEach(function (k) { LOCKED_SET[k] = true; });
  // Locked default key → its session.type.* i18n key (mirrors app.js).
  var DEFAULT_TYPE_I18N = {
    clinic: "session.type.clinic",
    online: "session.type.online",
    remote: "session.type.remote",
    proxy: "session.type.proxy",
    other: "session.type.other",
  };
  // The legacy "Other" key an in-use custom type reassigns to on delete (D-14).
  var REASSIGN_FALLBACK_KEY = "other";

  // ── Batch-edit state ────────────────────────────────────────────────────
  // saved  = last-persisted snapshot (mirror of localStorage).
  // staged = working copy being edited; commits to saved+storage only on Save.
  var saved = { overrides: {}, custom: [] };
  var staged = { overrides: {}, custom: [] };
  var dirty = false;

  // ──────────────────────────────────────────────────────────────────────
  // Small helpers (App-delegating, with safe fallbacks for the test env)
  // ──────────────────────────────────────────────────────────────────────

  function $(id) { return document.getElementById(id); }

  function t(key) {
    return window.App && typeof window.App.t === "function" ? window.App.t(key) : key;
  }

  function showToast(messageKey) {
    if (window.App && typeof window.App.showToast === "function") {
      window.App.showToast("", messageKey);
    }
  }

  function confirmDialog(opts) {
    if (window.App && typeof window.App.confirmDialog === "function") {
      return window.App.confirmDialog(opts);
    }
    return Promise.resolve(false);
  }

  // Session records live in IndexedDB. This editor holds NO direct IDB access
  // (D-17) — the in-use count and the reassign-on-delete both go through App.
  function countSessionsByType(key) {
    if (window.App && typeof window.App.countSessionsByType === "function") {
      return Promise.resolve(window.App.countSessionsByType(key));
    }
    return Promise.resolve(0);
  }

  function reassignSessionType(fromKey, toKey) {
    if (window.App && typeof window.App.reassignSessionType === "function") {
      return Promise.resolve(window.App.reassignSessionType(fromKey, toKey));
    }
    return Promise.resolve(0);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Storage — ONE localStorage key `portfolioSessionTypes` = {overrides,custom}.
  // ──────────────────────────────────────────────────────────────────────

  function readTypes() {
    var fallback = { overrides: {}, custom: [] };
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return fallback;
      return {
        overrides: (parsed.overrides && typeof parsed.overrides === "object") ? parsed.overrides : {},
        custom: Array.isArray(parsed.custom) ? parsed.custom : [],
      };
    } catch (_) {
      return fallback;
    }
  }

  function writeTypes(types) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        overrides: types.overrides || {},
        custom: types.custom || [],
      }));
    } catch (_) { /* storage full / unavailable — nothing more we can do */ }
  }

  // persist: write → dispatch within-tab change event (the native `storage`
  // event does NOT fire in the writing tab, so this explicit dispatch is what
  // updates same-tab displays + peer surfaces via App's storage relay).
  function persist(types) {
    writeTypes(types);
    try { document.dispatchEvent(new CustomEvent(CHANGED_EVENT)); } catch (_) { /* ignore */ }
  }

  function clone(types) {
    return {
      overrides: Object.assign({}, types.overrides || {}),
      custom: (types.custom || []).map(function (c) { return { key: c.key, label: c.label }; }),
    };
  }

  // Canonical string form for dirty comparison: empty/absent overrides collapse
  // to the default (skipped), override keys are sorted, custom order preserved.
  function normalize(types) {
    var ov = {};
    Object.keys(types.overrides || {}).sort().forEach(function (k) {
      var v = types.overrides[k];
      if (typeof v === "string" && v.trim().length > 0) ov[k] = v;
    });
    var custom = (types.custom || []).map(function (c) { return { key: c.key, label: c.label }; });
    return JSON.stringify({ overrides: ov, custom: custom });
  }

  function loadFromStorage() {
    saved = readTypes();
    staged = clone(saved);
    dirty = false;
  }

  // Resolve the display label for a locked key from a snapshot: override
  // (non-empty) else the i18n default.
  function lockedLabel(key, types) {
    var ov = types.overrides[key];
    if (typeof ov === "string" && ov.trim().length > 0) return ov;
    return t(DEFAULT_TYPE_I18N[key]);
  }

  function defaultLockedLabel(key) { return t(DEFAULT_TYPE_I18N[key]); }

  function findCustom(types, key) {
    for (var i = 0; i < types.custom.length; i++) {
      if (types.custom[i] && types.custom[i].key === key) return i;
    }
    return -1;
  }

  // Case-insensitive collision check against every OTHER current label in the
  // STAGED list (exclude the row being edited by locked key or custom key).
  function collides(excludeLockedKey, excludeCustomKey, label) {
    var lower = String(label).toLowerCase();
    for (var i = 0; i < LOCKED_DEFAULTS.length; i++) {
      var lk = LOCKED_DEFAULTS[i];
      if (lk === excludeLockedKey) continue;
      if (lockedLabel(lk, staged).toLowerCase() === lower) return true;
    }
    for (var j = 0; j < staged.custom.length; j++) {
      var c = staged.custom[j];
      if (!c || c.key === excludeCustomKey) continue;
      if (String(c.label == null ? "" : c.label).toLowerCase() === lower) return true;
    }
    return false;
  }

  // ──────────────────────────────────────────────────────────────────────
  // SVG icons — built via createElementNS DOM APIs (NEVER innerHTML). The
  // builder is COPIED from settings.js buildSvg; the revert + info glyphs are
  // COPIED from settings.js buildResetIconSvg / buildInfoIconSvg; the trash
  // paths from settings-snippets.js TRASH_ICON_PATHS (all IIFE-private there).
  // ──────────────────────────────────────────────────────────────────────

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

  // Revert / reset glyph — COPY of settings.js buildResetIconSvg (the Fields
  // reset button icon), so built-in Revert reads identically to the Fields tab.
  function buildRevertIconSvg() {
    return buildSvg(
      { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
      [
        { tag: "path", attrs: { d: "M3 12a9 9 0 0 1 15.5-6.36L21 8" } },
        { tag: "polyline", attrs: { points: "21 3 21 8 16 8" } },
        { tag: "path", attrs: { d: "M21 12a9 9 0 0 1-15.5 6.36L3 16" } },
        { tag: "polyline", attrs: { points: "3 21 3 16 8 16" } },
      ]
    );
  }

  // Info-circle glyph — COPY of settings.js buildInfoIconSvg.
  function buildInfoIconSvg() {
    return buildSvg(
      { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
      [
        { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
        { tag: "line", attrs: { x1: "12", y1: "16", x2: "12", y2: "12" } },
        { tag: "line", attrs: { x1: "12", y1: "8", x2: "12.01", y2: "8" } },
      ]
    );
  }

  // Feather-style trash icon (COPY of settings-snippets.js TRASH_ICON_PATHS) —
  // the ONE consistent trash glyph used everywhere for custom-type deletion.
  function buildTrashIconSvg() {
    return buildSvg(
      { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
      [
        { tag: "path", attrs: { d: "M3 6h18" } },
        { tag: "path", attrs: { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" } },
        { tag: "path", attrs: { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" } },
        { tag: "path", attrs: { d: "M10 11v6" } },
        { tag: "path", attrs: { d: "M14 11v6" } },
      ]
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Row rendering
  // ──────────────────────────────────────────────────────────────────────

  function buildCell(input) {
    var cell = document.createElement("div");
    cell.className = "session-type-cell";
    cell.appendChild(input);
    return cell;
  }

  function buildRenameInput(label) {
    var input = document.createElement("input");
    input.type = "text";
    input.className = "input session-type-rename-input";
    input.maxLength = MAX_LABEL_LEN;
    input.autocomplete = "off";
    input.setAttribute("aria-label", t("settings.sessionTypes.rename.aria"));
    // SECURITY: user label assigned via .value — NEVER innerHTML.
    input.value = label != null ? String(label) : "";
    return input;
  }

  function buildLockedRow(key) {
    var row = document.createElement("div");
    row.className = "session-type-row";
    row.setAttribute("data-type-key", key);
    row.setAttribute("data-locked", "1");

    var def = defaultLockedLabel(key);
    var input = buildRenameInput(lockedLabel(key, staged));
    row.appendChild(buildCell(input));

    // Revert button — reuses the Fields .reset-row-btn look (icon + "Revert"
    // label). Disabled until the staged name differs from the default.
    var revertBtn = document.createElement("button");
    revertBtn.type = "button";
    revertBtn.className = "button ghost reset-row-btn session-type-revert-btn";
    revertBtn.setAttribute("data-type-key", key);
    var revertTip = t("settings.reset.tooltip");
    revertBtn.setAttribute("aria-label", revertTip);
    revertBtn.title = revertTip;
    revertBtn.appendChild(buildRevertIconSvg());
    var revertLabelEl = document.createElement("span");
    revertLabelEl.className = "reset-row-btn-label";
    revertLabelEl.textContent = t("settings.row.revert.label");
    revertBtn.appendChild(revertLabelEl);

    function overridden() {
      var ov = staged.overrides[key];
      return typeof ov === "string" && ov.trim().length > 0;
    }
    function refreshRevertState() {
      revertBtn.disabled = !overridden();
      revertBtn.setAttribute("aria-disabled", revertBtn.disabled ? "true" : "false");
    }
    refreshRevertState();

    // Live: stage on input; the Revert button "wakes up" the moment the name
    // differs from the default (mirrors the mockup interaction).
    input.addEventListener("input", function () {
      var trimmed = input.value.trim();
      if (trimmed === "" || trimmed === def) delete staged.overrides[key];
      else staged.overrides[key] = trimmed;
      revertBtn.disabled = (trimmed === "" || trimmed === def);
      revertBtn.setAttribute("aria-disabled", revertBtn.disabled ? "true" : "false");
      recomputeDirty();
    });

    // Commit: validate length + case-insensitive dup (WR-03). On rejection,
    // restore to the last-SAVED value (never blank the field).
    input.addEventListener("change", function () {
      var trimmed = input.value.trim();
      var tooLong = trimmed.length > MAX_LABEL_LEN;
      var dup = trimmed !== "" && trimmed !== def && collides(key, null, trimmed);
      if (tooLong || dup) {
        showToast(tooLong ? "settings.rename.tooLong" : "settings.sessionTypes.add.invalid");
        var sv = saved.overrides[key];
        if (typeof sv === "string" && sv.trim().length > 0) { staged.overrides[key] = sv; input.value = sv; }
        else { delete staged.overrides[key]; input.value = def; }
        refreshRevertState();
        recomputeDirty();
        return;
      }
      input.value = staged.overrides[key] || def;
      refreshRevertState();
      recomputeDirty();
    });

    revertBtn.addEventListener("click", function () {
      delete staged.overrides[key];
      input.value = def;
      refreshRevertState();
      recomputeDirty();
    });
    row.appendChild(revertBtn);

    // ⓘ info icon — shared .settings-locked-info pattern; tooltip is the exact
    // single-sentence copy required by item 3.
    var tooltip = t("settings.sessionTypes.locked.tooltip");
    var info = document.createElement("span");
    info.className = "settings-locked-info session-type-info";
    info.setAttribute("role", "img");
    info.setAttribute("aria-label", tooltip);
    info.title = tooltip;
    info.setAttribute("data-tooltip", tooltip);
    info.tabIndex = 0;
    info.appendChild(buildInfoIconSvg());
    row.appendChild(info);

    return row;
  }

  function buildCustomRow(entry) {
    var key = entry.key;
    var row = document.createElement("div");
    row.className = "session-type-row";
    row.setAttribute("data-type-key", key);
    row.setAttribute("data-locked", "0");

    var input = buildRenameInput(entry.label);
    row.appendChild(buildCell(input));

    input.addEventListener("input", function () {
      var idx = findCustom(staged, key);
      if (idx >= 0) staged.custom[idx].label = input.value;
      recomputeDirty();
    });
    input.addEventListener("change", function () {
      var trimmed = input.value.trim();
      var idx = findCustom(staged, key);
      var tooLong = trimmed.length > MAX_LABEL_LEN;
      var dup = trimmed !== "" && collides(null, key, trimmed);
      if (trimmed === "" || tooLong || dup) {
        if (tooLong) showToast("settings.rename.tooLong");
        else if (dup) showToast("settings.sessionTypes.add.invalid");
        // Restore to the last-saved label when known; otherwise keep the
        // current staged label (a freshly-added, not-yet-saved custom type).
        var si = findCustom(saved, key);
        if (si >= 0 && idx >= 0) { staged.custom[idx].label = saved.custom[si].label; input.value = saved.custom[si].label; }
        else if (idx >= 0) { input.value = staged.custom[idx].label; }
        recomputeDirty();
        return;
      }
      if (idx >= 0) { staged.custom[idx].label = trimmed; input.value = trimmed; }
      recomputeDirty();
    });

    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-button session-type-delete-btn";
    delBtn.setAttribute("aria-label", t("settings.sessionTypes.delete.aria"));
    delBtn.appendChild(buildTrashIconSvg());
    delBtn.addEventListener("click", function () {
      // Batch model: staging the removal only. In-use warn+reassign fires at
      // Save time, not here.
      var idx = findCustom(staged, key);
      if (idx >= 0) staged.custom.splice(idx, 1);
      recomputeDirty();
      renderTypeList();
    });
    row.appendChild(delBtn);

    return row;
  }

  function renderTypeList() {
    var container = $("sessionTypesEditor");
    if (!container) return;

    while (container.firstChild) container.removeChild(container.firstChild);

    // 5 locked defaults first, fixed order (D-13).
    LOCKED_DEFAULTS.forEach(function (key) {
      container.appendChild(buildLockedRow(key));
    });

    // Custom types after, in staged order.
    staged.custom.forEach(function (entry) {
      if (entry && entry.key) container.appendChild(buildCustomRow(entry));
    });

    if (staged.custom.length === 0) {
      var empty = document.createElement("p");
      empty.className = "helper-text session-types-empty";
      empty.textContent = t("settings.sessionTypes.empty");
      container.appendChild(empty);
    }

    updateActionBar();
  }

  // ──────────────────────────────────────────────────────────────────────
  // Dirty tracking + Save/Discard bar
  // ──────────────────────────────────────────────────────────────────────

  function recomputeDirty() {
    dirty = normalize(staged) !== normalize(saved);
    updateActionBar();
  }

  function updateActionBar() {
    var saveBtn = $("sessionTypesSaveBtn");
    var discardBtn = $("sessionTypesDiscardBtn");
    if (saveBtn) saveBtn.disabled = !dirty;
    if (discardBtn) discardBtn.disabled = !dirty;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Add-type: compact reveal button → inline (input + save + cancel) row.
  // ──────────────────────────────────────────────────────────────────────

  function showAddRow(show) {
    var toggle = $("sessionTypeAddBtn");
    var addRow = $("sessionTypeAddRow");
    var input = $("sessionTypeAddInput");
    if (!toggle || !addRow) return;
    if (show) {
      addRow.removeAttribute("hidden");
      toggle.setAttribute("hidden", "");
      if (input) { input.value = ""; try { input.focus(); } catch (_) {} }
    } else {
      addRow.setAttribute("hidden", "");
      toggle.removeAttribute("hidden");
      if (input) input.value = "";
    }
  }

  function commitAdd() {
    var input = $("sessionTypeAddInput");
    if (!input) return;
    var label = String(input.value == null ? "" : input.value).trim();
    if (label === "") { showToast("settings.sessionTypes.add.invalid"); return; }
    if (label.length > MAX_LABEL_LEN) { showToast("settings.rename.tooLong"); return; }
    if (collides(null, null, label)) { showToast("settings.sessionTypes.add.invalid"); return; }

    staged.custom.push({ key: "custom." + Date.now(), label: label });
    recomputeDirty();
    showAddRow(false);
    renderTypeList();
  }

  // ──────────────────────────────────────────────────────────────────────
  // Save / Discard
  // ──────────────────────────────────────────────────────────────────────

  async function onSave() {
    if (!dirty) return;

    // Length guard across all staged labels (defense-in-depth; row commits
    // already reject over-length, but a programmatic staged value could slip in).
    for (var i = 0; i < LOCKED_DEFAULTS.length; i++) {
      var ov = staged.overrides[LOCKED_DEFAULTS[i]];
      if (typeof ov === "string" && ov.length > MAX_LABEL_LEN) { showToast("settings.rename.tooLong"); return; }
    }
    for (var j = 0; j < staged.custom.length; j++) {
      if (staged.custom[j] && String(staged.custom[j].label || "").length > MAX_LABEL_LEN) { showToast("settings.rename.tooLong"); return; }
    }

    // Staged deletions = custom keys that were saved but are no longer staged.
    var deletions = saved.custom
      .filter(function (sc) { return sc && findCustom(staged, sc.key) < 0; })
      .map(function (sc) { return sc.key; });

    // For each in-use deletion, warn + reassign to "Other" BEFORE committing.
    // Cancelling any warning aborts the whole Save (staged edits are kept).
    for (var d = 0; d < deletions.length; d++) {
      var delKey = deletions[d];
      var count = Number(await countSessionsByType(delKey)) || 0;
      if (count > 0) {
        var ok = await confirmDialog({
          titleKey: "settings.sessionTypes.confirm.reassign.title",
          messageKey: "settings.sessionTypes.confirm.reassign.body",
          confirmKey: "settings.sessionTypes.confirm.reassign.confirm",
          cancelKey: "confirm.cancel",
          tone: "danger",
          placeholders: { count: count },
        });
        if (!ok) return; // abort — keep staged + dirty
        await reassignSessionType(delKey, REASSIGN_FALLBACK_KEY);
      }
    }

    saved = clone(staged);
    dirty = false;
    persist(staged); // write + dispatch CHANGED_EVENT (peer surfaces refresh)
    updateActionBar();
    showToast("settings.sessionTypes.savedToast");
  }

  async function onDiscard() {
    if (!dirty) return;
    var ok = false;
    try {
      ok = await confirmDialog({
        titleKey: "settings.discard.title",
        messageKey: "settings.discard.body",
        confirmKey: "settings.discard.confirm",
        cancelKey: "settings.discard.cancel",
      });
    } catch (_) { ok = false; }
    if (!ok) return;
    staged = clone(saved);
    dirty = false;
    showAddRow(false);
    renderTypeList();
  }

  // ──────────────────────────────────────────────────────────────────────
  // External-change / language re-sync
  // ──────────────────────────────────────────────────────────────────────

  function onExternalChange() {
    // Re-sync the saved baseline from storage. If the user has unsaved staged
    // edits, do NOT clobber them (only refresh the baseline); otherwise reload
    // the staged copy too so a peer-tab change is reflected.
    saved = readTypes();
    if (!dirty) staged = clone(saved);
    renderTypeList();
  }

  function onLanguageChange() {
    // Un-overridden default labels re-translate; staged overrides stay fixed.
    renderTypeList();
  }

  // ──────────────────────────────────────────────────────────────────────
  // Public API — direct-invocation delete guard + external re-render.
  // deleteType(key): immediate-commit guard (defense-in-depth). A locked key
  // ALWAYS returns false; a custom key removes it from storage NOW (bypassing
  // the batch bar — this is the programmatic guard path) and keeps the
  // saved/staged snapshots coherent.
  // ──────────────────────────────────────────────────────────────────────

  function deleteType(key) {
    if (LOCKED_SET[key]) return false;
    var cur = readTypes();
    var idx = findCustom(cur, key);
    if (idx < 0) return false;
    cur.custom.splice(idx, 1);
    persist(cur);
    saved = clone(cur);
    var si = findCustom(staged, key);
    if (si >= 0) staged.custom.splice(si, 1);
    recomputeDirty();
    renderTypeList();
    return true;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Boot — directly on DOMContentLoaded. NEVER App.initCommon (Pitfall 1).
  // ──────────────────────────────────────────────────────────────────────

  function boot() {
    loadFromStorage();

    var addToggle = $("sessionTypeAddBtn");
    if (addToggle) addToggle.addEventListener("click", function () { showAddRow(true); });
    var addSave = $("sessionTypeAddSaveBtn");
    if (addSave) addSave.addEventListener("click", commitAdd);
    var addCancel = $("sessionTypeAddCancelBtn");
    if (addCancel) addCancel.addEventListener("click", function () { showAddRow(false); });
    var addInput = $("sessionTypeAddInput");
    if (addInput) {
      addInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); commitAdd(); }
        else if (e.key === "Escape") { e.preventDefault(); showAddRow(false); }
      });
    }

    var saveBtn = $("sessionTypesSaveBtn");
    if (saveBtn) saveBtn.addEventListener("click", onSave);
    var discardBtn = $("sessionTypesDiscardBtn");
    if (discardBtn) discardBtn.addEventListener("click", onDiscard);

    document.addEventListener(CHANGED_EVENT, onExternalChange);
    document.addEventListener("app:language", onLanguageChange);

    renderTypeList();
  }

  window.SessionTypesEditor = {
    deleteType: deleteType,
    renderTypeList: renderTypeList,
  };

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
