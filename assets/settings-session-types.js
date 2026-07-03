// ────────────────────────────────────────────────────────────────────────
// settings-session-types.js — Two-tier session-type editor (F4, Phase 37)
//
// Self-contained IIFE that populates the Plan 06 container (#sessionTypesEditor)
// with a two-tier list: 5 LOCKED defaults (clinic/online/remote/proxy/other, in
// fixed order) each with a rename input + lock icon and NO delete button; CUSTOM
// types each with a rename input + a delete button. An add-new input + "Add
// type" button sit below (the Plan 06 markup #sessionTypeAddInput /
// #sessionTypeAddBtn).
//
// STORAGE (D-17 / FIX 1 / 37-PATTERNS.md A2 CORRECTED): the list persists as ONE
// localStorage key `portfolioSessionTypes` = { overrides: { <lockedKey>:
// "<label>" }, custom: [ { key, label } ] } — localStorage, NOT IndexedDB (the
// IDB therapistSettings path does NOT round-trip through backup restore). Only
// deviations are stored: overrides + custom additions, never materialized
// defaults (Pitfall 3). Renames are GLOBAL — one language-agnostic override
// string per locked key applies everywhere App.formatSessionType is used (D-16).
//
// CROSS-TAB (FIX 2): after a mutation this editor dispatches a within-tab
// `app:session-types-changed` CustomEvent (the native `storage` event does NOT
// fire in the writing tab). App.initCommon re-dispatches that event in peer tabs
// off the native `storage` event, so displays there update too.
//
// SECURITY (T-37-07-SEC): every user label renders via input.value / textContent
// — NEVER innerHTML. Icons are built via createElementNS DOM APIs (the SVG code
// is COPIED from settings.js buildInfoIconSvg / settings-snippets.js
// TRASH_ICON_PATHS — those symbols are IIFE-private there and cannot be called
// by name; FIX 8).
//
// BOOT (Pitfall 1): boots directly on DOMContentLoaded — it must NEVER call
// App.initCommon (the fields IIFE already does; a second call double-mounts the
// header chrome).
//
// Cross-IIFE dependencies (window.* set by other IIFEs):
//   window.App.{t, showToast, confirmDialog, getSessionTypes, formatSessionType}
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

  // Session records live in IndexedDB. This editor deliberately holds NO direct
  // IDB access (D-17 / no-innerHTML + no-IDB isolation) — the in-use count and
  // the reassign-on-delete both go through App, which owns the DB (Finding #1).
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
  // Storage — ONE localStorage key `portfolioSessionTypes` = {overrides,custom}
  // (mirrors the portfolioDateFormat scalar read/write: try/catch + JSON.parse
  //  with a default; store only deviations, never materialized defaults).
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
  // updates same-tab displays + re-renders this editor via its own listener).
  function persist(types) {
    writeTypes(types);
    try { document.dispatchEvent(new CustomEvent(CHANGED_EVENT)); } catch (_) { /* ignore */ }
  }

  // Resolve the display label for a key from a given {overrides,custom} snapshot:
  // locked → override (non-empty) else i18n default; custom → its stored label.
  function resolveLabel(key, types, locked) {
    if (locked) {
      var ov = types.overrides[key];
      if (typeof ov === "string" && ov.trim().length > 0) return ov;
      return t(DEFAULT_TYPE_I18N[key]);
    }
    for (var i = 0; i < types.custom.length; i++) {
      if (types.custom[i] && types.custom[i].key === key) {
        return types.custom[i].label != null ? String(types.custom[i].label) : key;
      }
    }
    return key;
  }

  // Case-insensitive set of every label currently in the list (for dup checks).
  function existingLabelsLower(types) {
    var out = [];
    LOCKED_DEFAULTS.forEach(function (key) {
      out.push(String(resolveLabel(key, types, true)).toLowerCase());
    });
    types.custom.forEach(function (c) {
      if (c && c.label != null) out.push(String(c.label).toLowerCase());
    });
    return out;
  }

  // ──────────────────────────────────────────────────────────────────────
  // SVG icons — built via createElementNS DOM APIs (NEVER innerHTML). The
  // builder is COPIED from settings.js buildSvg; the trash paths are COPIED
  // from settings-snippets.js TRASH_ICON_PATHS (both IIFE-private there — a
  // literal call by name ReferenceErrors; FIX 8).
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

  var BASE_SVG_ATTRS = {
    xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: "18", height: "18",
    fill: "none", stroke: "currentColor", "stroke-width": "1.8",
    "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true",
  };

  // Feather-style padlock (closed shackle) — the lock affordance for locked rows.
  function buildLockIconSvg() {
    return buildSvg(BASE_SVG_ATTRS, [
      { tag: "rect", attrs: { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" } },
      { tag: "path", attrs: { d: "M7 11V7a5 5 0 0 1 10 0v4" } },
    ]);
  }

  // Feather-style trash icon (COPY of settings-snippets.js TRASH_ICON_PATHS).
  function buildTrashIconSvg() {
    return buildSvg(BASE_SVG_ATTRS, [
      { tag: "path", attrs: { d: "M3 6h18" } },
      { tag: "path", attrs: { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" } },
      { tag: "path", attrs: { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" } },
      { tag: "path", attrs: { d: "M10 11v6" } },
      { tag: "path", attrs: { d: "M14 11v6" } },
    ]);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Rendering
  // ──────────────────────────────────────────────────────────────────────

  function buildTypeRow(key, label, locked) {
    var row = document.createElement("div");
    row.className = "session-type-row";
    row.setAttribute("data-type-key", key);

    var input = document.createElement("input");
    input.type = "text";
    input.className = "input session-type-rename-input";
    input.maxLength = MAX_LABEL_LEN;
    input.autocomplete = "off";
    input.setAttribute("aria-label", t("settings.sessionTypes.rename.aria"));
    // SECURITY: user label assigned via .value — NEVER innerHTML.
    input.value = label != null ? String(label) : "";
    input.addEventListener("change", function () { commitRename(key, input.value, locked); });
    row.appendChild(input);

    if (locked) {
      var tooltip = t("settings.sessionTypes.locked.tooltip");
      var lock = document.createElement("span");
      lock.className = "session-type-lock";
      lock.title = tooltip;
      lock.setAttribute("aria-label", tooltip);
      lock.setAttribute("data-tooltip", tooltip);
      lock.appendChild(buildLockIconSvg());
      row.appendChild(lock);
    } else {
      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "icon-button danger session-type-delete-btn";
      delBtn.setAttribute("aria-label", t("settings.sessionTypes.delete.aria"));
      delBtn.appendChild(buildTrashIconSvg());
      delBtn.addEventListener("click", function () { handleDeleteCustom(key); });
      row.appendChild(delBtn);
    }

    return row;
  }

  function renderTypeList() {
    var container = $("sessionTypesEditor");
    if (!container) return;
    var types = readTypes();

    while (container.firstChild) container.removeChild(container.firstChild);

    // 5 locked defaults first, in fixed order (D-13).
    LOCKED_DEFAULTS.forEach(function (key) {
      container.appendChild(buildTypeRow(key, resolveLabel(key, types, true), true));
    });

    // Custom types after, in stored order.
    types.custom.forEach(function (entry) {
      if (entry && entry.key) {
        container.appendChild(buildTypeRow(entry.key, entry.label, false));
      }
    });

    // Empty-state hint when no custom types exist (not a .session-type-row, so
    // it never disturbs the row queries).
    if (types.custom.length === 0) {
      var empty = document.createElement("p");
      empty.className = "helper-text session-types-empty";
      empty.textContent = t("settings.sessionTypes.empty");
      container.appendChild(empty);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Mutations
  // ──────────────────────────────────────────────────────────────────────

  function commitRename(key, rawLabel, locked) {
    var label = String(rawLabel == null ? "" : rawLabel).trim();
    if (label.length > MAX_LABEL_LEN) {
      showToast("settings.rename.tooLong");
      renderTypeList(); // restore the persisted value
      return;
    }
    var types = readTypes();

    if (locked) {
      // Blank clears the override back to the i18n default; else store the
      // global override string (D-16) — only the deviation, never the default.
      if (label === "") {
        delete types.overrides[key];
      } else {
        types.overrides[key] = label;
      }
    } else {
      var idx = -1;
      for (var i = 0; i < types.custom.length; i++) {
        if (types.custom[i] && types.custom[i].key === key) { idx = i; break; }
      }
      if (idx < 0) { renderTypeList(); return; }
      if (label === "") { renderTypeList(); return; } // don't blank a custom label
      // Duplicate guard (case-insensitive) against every OTHER label — remove
      // this row's own current label from the comparison set first.
      var self = String(types.custom[idx].label || "").toLowerCase();
      var selfRemoved = false;
      var others = existingLabelsLower(types).filter(function (l) {
        if (!selfRemoved && l === self) { selfRemoved = true; return false; }
        return true;
      });
      if (others.indexOf(label.toLowerCase()) >= 0) {
        showToast("settings.sessionTypes.add.invalid");
        renderTypeList();
        return;
      }
      types.custom[idx].label = label;
    }

    // WR-01: persist() dispatches CHANGED_EVENT synchronously, and boot()'s
    // listener re-renders the list — so an explicit renderTypeList() here would
    // rebuild the DOM a second time. Rely on the event-driven re-render.
    persist(types);
    showToast("settings.sessionTypes.savedToast");
  }

  function addCustomType() {
    var input = $("sessionTypeAddInput");
    if (!input) return;
    var label = String(input.value == null ? "" : input.value).trim();
    if (label === "") { showToast("settings.sessionTypes.add.invalid"); return; }
    if (label.length > MAX_LABEL_LEN) { showToast("settings.rename.tooLong"); return; }

    var types = readTypes();
    if (existingLabelsLower(types).indexOf(label.toLowerCase()) >= 0) {
      showToast("settings.sessionTypes.add.invalid");
      return;
    }

    types.custom.push({ key: "custom." + Date.now(), label: label });
    // WR-01: event-driven re-render only (see commitRename) — no double rebuild.
    persist(types);
    input.value = "";
    showToast("settings.sessionTypes.savedToast");
  }

  // deleteType(key): the two-layer delete guard's second layer (Pitfall 4).
  // Returns a boolean and performs no confirm — a locked key ALWAYS returns
  // false (defense-in-depth), a custom key deletes and returns true.
  function deleteType(key) {
    if (LOCKED_SET[key]) return false;
    var types = readTypes();
    var idx = -1;
    for (var i = 0; i < types.custom.length; i++) {
      if (types.custom[i] && types.custom[i].key === key) { idx = i; break; }
    }
    if (idx < 0) return false;
    types.custom.splice(idx, 1);
    // WR-01: event-driven re-render only (see commitRename) — no double rebuild.
    persist(types);
    return true;
  }

  // The legacy "Other" key an in-use custom type reassigns to on delete (D-14).
  var REASSIGN_FALLBACK_KEY = "other";

  // The delete-button click path (Finding #1): first count how many stored
  // sessions use this custom key. If N>0, warn that those sessions will be
  // reassigned to "Other" and — only on explicit confirm — reassign them (via
  // App, which owns the DB) BEFORE removing the type, so past sessions never
  // render as a raw `custom.<epoch>` key. If N==0 the plain delete confirm runs
  // (delete-safety confirmation is preserved). Locked keys early-return (guard
  // layer 1). The re-render happens via persist()'s CHANGED_EVENT dispatch.
  function handleDeleteCustom(key) {
    if (LOCKED_SET[key]) return; // guard layer 1
    Promise.resolve(countSessionsByType(key)).then(function (inUse) {
      var count = Number(inUse) || 0;
      if (count > 0) {
        return Promise.resolve(confirmDialog({
          titleKey: "settings.sessionTypes.confirm.reassign.title",
          messageKey: "settings.sessionTypes.confirm.reassign.body",
          confirmKey: "settings.sessionTypes.confirm.reassign.confirm",
          cancelKey: "confirm.cancel",
          tone: "danger",
          placeholders: { count: count },
        })).then(function (ok) {
          if (!ok) return;
          // Reassign the in-use sessions to "Other" FIRST, then drop the type.
          return Promise.resolve(reassignSessionType(key, REASSIGN_FALLBACK_KEY)).then(function () {
            if (deleteType(key)) showToast("settings.sessionTypes.savedToast");
          });
        });
      }
      // No sessions use this type — the plain delete confirm (unchanged).
      return Promise.resolve(confirmDialog({
        titleKey: "settings.sessionTypes.confirm.delete.title",
        messageKey: "settings.sessionTypes.confirm.delete.body",
        confirmKey: "settings.sessionTypes.confirm.delete.confirm",
        cancelKey: "confirm.cancel",
        tone: "danger",
      })).then(function (ok) {
        if (!ok) return;
        if (deleteType(key)) showToast("settings.sessionTypes.savedToast");
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Boot — directly on DOMContentLoaded. NEVER App.initCommon (Pitfall 1).
  // ──────────────────────────────────────────────────────────────────────

  function boot() {
    var addBtn = $("sessionTypeAddBtn");
    if (addBtn) addBtn.addEventListener("click", addCustomType);
    var addInput = $("sessionTypeAddInput");
    if (addInput) {
      addInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); addCustomType(); }
      });
    }

    // Re-render on a within-tab or cross-tab change, and re-translate un-renamed
    // defaults on language switch (overrides stay fixed — D-16).
    document.addEventListener(CHANGED_EVENT, renderTypeList);
    document.addEventListener("app:language", renderTypeList);

    renderTypeList();
  }

  // Public surface for the direct-invocation delete guard + external re-render.
  window.SessionTypesEditor = {
    deleteType: deleteType,
    renderTypeList: renderTypeList,
  };

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
