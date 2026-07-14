// ─────────────────────────────────────────────────────────────────────────────
// rich-toolbar.js — the focus-attached rich-text formatting toolbar (Phase 46).
//
// OWNS: ONE shared, mountable toolbar element that docks IN FLOW directly above
//   whichever registered note field currently has focus, hides when no
//   registered field is focused, and carries the icon-only formatting controls
//   (bold, italic, bullet list, numbered list, a "Text" heading dropdown,
//   indent, outdent, undo, redo, preview toggle). Every control preserves the
//   textarea's focus/selection so the native undo stack + caret math survive.
//   The toolbar is docked with `insertAdjacentElement('beforebegin', field)` so
//   it rides layout on scroll/resize/autogrow with ZERO coordinate math; only
//   the transient heading dropdown popover uses physical getBoundingClientRect
//   left/top (RTL-safe — never rect-derived logical inline insets; repo memory
//   reference-rtl-logical-props-physical-coords).
// PUBLIC SURFACE: window.RichToolbar — { mount(textareas, config), unmount(),
//   refreshButtonState() }. mount is ADDITIVE: repeated calls with disjoint
//   textarea sets all stay live (fields tracked in a shared Set/WeakMap like
//   snippets.js bindTextarea); a second mount() NEVER discards earlier-
//   registered fields, so 46-05's 7 note fields and 46-06's #exportEditor
//   coexist on the one shared toolbar instance.
// DEPENDENCIES: window.TextEdit (46-01 — editInsert chokepoint + pure transforms;
//   every edit routes through it so a real input event reaches autoGrow +
//   snippets, RTXT-09) and window.App.t (i18n tooltip strings). Both are reached
//   via the explicit window. prefix because they live in other IIFEs.
// CONSTRAINTS: FOCUS PRESERVATION is a hard precondition — every toolbar control
//   binds `mousedown` with `ev.preventDefault()` (mirroring snippets.js:336-341)
//   so the click commits BEFORE the field can blur; without it native
//   execCommand('undo'/'redo') targets nothing and editInsert caret math breaks.
//   It is bound UNCONDITIONALLY (macOS desktop Safari does not focus buttons on
//   click, so a missing preventDefault false-passes there yet fails everywhere
//   else). This module NEVER mutates textarea.value directly and never uses the
//   range-replace textarea API — all edits go through window.TextEdit so undo +
//   the input-event contract are preserved (grep-gated: zero direct value-
//   assignment / range-replace API in this file). Positioned overlays use
//   PHYSICAL left/top, never logical inline-inset props (RTL mirrors a rect
//   wrongly — the literal logical-inset token is kept out of this file so the
//   plan's zero-count source grep stays green).
// ─────────────────────────────────────────────────────────────────────────────
window.RichToolbar = (function () {
  "use strict";

  // ── State ──────────────────────────────────────────────────────────────────
  var _registered = new Set();   // every textarea passed to mount() (additive)
  var _bound = new WeakMap();     // textarea → { focusin, focusout, keydown }
  var _toolbarEl = null;          // the ONE shared toolbar element
  var _headingMenuEl = null;      // transient heading dropdown popover
  var _focused = null;            // the currently-focused registered textarea
  var _config = { headings: true };
  var _selectionRaf = 0;          // rAF handle for coalesced active-state refresh

  // ── i18n helper ────────────────────────────────────────────────────────────
  // App lives in a different IIFE; reach it through window. A fallback keeps the
  // toolbar usable (icon-only, tooltips only) before/without the i18n load.
  function t(key, fallback) {
    try {
      if (window.App && typeof window.App.t === "function") {
        var s = window.App.t(key);
        if (s && s !== key) return s;
      }
    } catch (e) { /* App not ready — use fallback */ }
    return fallback;
  }

  // ── Inline icon SVGs (stroke: currentColor; svg { display:block } via CSS) ──
  // Borrow the .header-icon-btn currentColor idiom — no icon font, no new dep.
  var SVG_NS = "http://www.w3.org/2000/svg";
  function svg(paths, opts) {
    opts = opts || {};
    var el = document.createElementNS(SVG_NS, "svg");
    el.setAttribute("viewBox", "0 0 24 24");
    el.setAttribute("width", "20");
    el.setAttribute("height", "20");
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", "currentColor");
    el.setAttribute("stroke-width", opts.strokeWidth || "2");
    el.setAttribute("stroke-linecap", "round");
    el.setAttribute("stroke-linejoin", "round");
    el.setAttribute("aria-hidden", "true");
    paths.forEach(function (d) {
      var p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", d);
      el.appendChild(p);
    });
    return el;
  }
  // Bold "B" is text-like; render it as a heavier glyph via SVG strokes.
  var ICONS = {
    bold: function () { return svg(["M7 5h6a3.5 3.5 0 0 1 0 7H7z", "M7 12h7a3.5 3.5 0 0 1 0 7H7z"]); },
    italic: function () { return svg(["M15 5h-6", "M14 19H8", "M14 5l-4 14"]); },
    bulletList: function () { return svg(["M9 6h11", "M9 12h11", "M9 18h11", "M4.5 6h.01", "M4.5 12h.01", "M4.5 18h.01"], { strokeWidth: "2.4" }); },
    numberedList: function () { return svg(["M10 6h10", "M10 12h10", "M10 18h10", "M4 6h1v4", "M4 10h2", "M4 15.5a1 1 0 1 1 1.7.7L4 19h2.2"], { strokeWidth: "1.8" }); },
    indent: function () { return svg(["M4 6h16", "M10 12h10", "M10 18h10", "M4 10l3 2-3 2z"], { strokeWidth: "1.8" }); },
    outdent: function () { return svg(["M4 6h16", "M10 12h10", "M10 18h10", "M7 10l-3 2 3 2z"], { strokeWidth: "1.8" }); },
    undo: function () { return svg(["M9 7L4 12l5 5", "M4 12h11a5 5 0 0 1 0 10h-1"], { strokeWidth: "1.9" }); },
    redo: function () { return svg(["M15 7l5 5-5 5", "M20 12H9a5 5 0 0 0 0 10h1"], { strokeWidth: "1.9" }); },
    preview: function () { return svg(["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"], { strokeWidth: "1.8" }); },
    chevron: function () { return svg(["M6 9l6 6 6-6"], { strokeWidth: "2" }); },
  };

  // ── Control spec (order + grouping per UI-SPEC Component Inventory) ─────────
  // Groups separated by hairline separators: [bold,italic] | [bullet,numbered]
  // | [heading dropdown] | [indent,outdent] | [undo,redo] | [preview].
  var GROUPS = [
    [
      { action: "bold", icon: "bold", key: "toolbar.bold", fallback: "Bold (Ctrl+B)" },
      { action: "italic", icon: "italic", key: "toolbar.italic", fallback: "Italic (Ctrl+I)" },
    ],
    [
      { action: "bulletList", icon: "bulletList", key: "toolbar.bulletList", fallback: "Bullet list" },
      { action: "numberedList", icon: "numberedList", key: "toolbar.numberedList", fallback: "Numbered list" },
    ],
    // heading dropdown injected here when config.headings
    [
      { action: "indent", icon: "indent", key: "toolbar.indent", fallback: "Indent (Tab)" },
      { action: "outdent", icon: "outdent", key: "toolbar.outdent", fallback: "Outdent (Shift+Tab)" },
    ],
    [
      { action: "undo", icon: "undo", key: "toolbar.undo", fallback: "Undo (Ctrl+Z)" },
      { action: "redo", icon: "redo", key: "toolbar.redo", fallback: "Redo (Ctrl+Shift+Z)" },
    ],
    [
      { action: "preview", icon: "preview", key: "toolbar.preview", fallback: "Preview" },
    ],
  ];

  // ── FOCUS PRESERVATION (issue 1/2 BLOCKER) ─────────────────────────────────
  // Bind mousedown+preventDefault on EVERY toolbar control so the click commits
  // before the focused textarea can blur. Mirrors snippets.js:336-341. Bound
  // UNCONDITIONALLY — macOS desktop Safari does not focus buttons on click, so a
  // missing preventDefault false-passes there yet fails everywhere else.
  function bindPreserveFocus(el, onActivate) {
    el.addEventListener("mousedown", function (ev) {
      // mousedown (not click) so we commit BEFORE the textarea loses focus.
      ev.preventDefault();
      if (typeof onActivate === "function") onActivate(ev);
    });
  }

  function makeButton(spec) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rich-toolbar-btn";
    btn.setAttribute("data-action", spec.action);
    var title = t(spec.key, spec.fallback);
    btn.title = title;
    btn.setAttribute("aria-label", title);
    btn.appendChild(ICONS[spec.icon]());
    // Keep focus on the field; run the action. `_dispatch` is filled by the
    // inline-actions layer (Task 2) — until then controls preserve focus only.
    bindPreserveFocus(btn, function () { _dispatch(spec.action, btn); });
    return btn;
  }

  function makeSeparator() {
    var sep = document.createElement("span");
    sep.className = "rich-toolbar-sep";
    sep.setAttribute("aria-hidden", "true");
    return sep;
  }

  // Heading "Text ▾" dropdown trigger (menu popover built by the actions layer).
  function makeHeadingTrigger() {
    var wrap = document.createElement("div");
    wrap.className = "rich-toolbar-heading";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rich-toolbar-btn rich-toolbar-heading-trigger";
    btn.setAttribute("data-action", "heading");
    var title = t("toolbar.textStyle", "Text style");
    btn.title = title;
    btn.setAttribute("aria-label", title);
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    var label = document.createElement("span");
    label.className = "rich-toolbar-heading-label";
    label.textContent = t("toolbar.textStyleShort", "Text");
    btn.appendChild(label);
    btn.appendChild(ICONS.chevron());
    bindPreserveFocus(btn, function () { _dispatch("heading", btn); });
    wrap.appendChild(btn);
    return wrap;
  }

  // ── Build the ONE shared toolbar element ───────────────────────────────────
  function buildToolbar() {
    var bar = document.createElement("div");
    bar.className = "rich-toolbar is-hidden";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", t("toolbar.aria", "Text formatting"));

    GROUPS.forEach(function (group, gi) {
      if (bar.childElementCount > 0) bar.appendChild(makeSeparator());
      var wrap = document.createElement("div");
      wrap.className = "rich-toolbar-group";
      group.forEach(function (spec) { wrap.appendChild(makeButton(spec)); });
      bar.appendChild(wrap);
      // Inject the heading dropdown after the list group (index 1) when enabled.
      if (gi === 1 && _config.headings) {
        bar.appendChild(makeSeparator());
        bar.appendChild(makeHeadingTrigger());
      }
    });
    return bar;
  }

  function ensureToolbar() {
    if (!_toolbarEl) _toolbarEl = buildToolbar();
    return _toolbarEl;
  }

  // ── Focus tracking + in-flow docking ───────────────────────────────────────
  // Dock the single toolbar IN FLOW above the focused field so it rides layout
  // on scroll/resize/autogrow with zero coordinate math (issue 3). Do NOT use
  // fixed getBoundingClientRect coords for the bar — that detaches on the first
  // scroll of an autogrowing field.
  function dockTo(textarea) {
    var bar = ensureToolbar();
    textarea.insertAdjacentElement("beforebegin", bar);
    bar.classList.remove("is-hidden");
    _focused = textarea;
    refreshButtonState();
  }

  function hideToolbar() {
    if (_toolbarEl) _toolbarEl.classList.add("is-hidden");
    closeHeadingMenu();
    _focused = null;
  }

  function onFieldFocusIn(ev) {
    dockTo(ev.currentTarget);
  }

  // Hide only when focus leaves the whole registered set (and isn't moving into
  // the toolbar itself, whose controls preventDefault so focus never lands there
  // — but guard anyway for keyboard focus).
  function onFieldFocusOut(ev) {
    var next = ev.relatedTarget;
    if (next && _toolbarEl && _toolbarEl.contains(next)) return;
    if (next && next.tagName === "TEXTAREA" && _registered.has(next)) return;
    // Defer so a focus move BETWEEN two registered fields re-docks first.
    setTimeout(function () {
      var active = document.activeElement;
      if (active && _registered.has(active)) return;
      if (active && _toolbarEl && _toolbarEl.contains(active)) return;
      hideToolbar();
    }, 0);
  }

  // Coalesced active-state refresh on caret/selection change.
  function onSelectionChange() {
    if (_selectionRaf) return;
    _selectionRaf = (window.requestAnimationFrame || setTimeout)(function () {
      _selectionRaf = 0;
      refreshButtonState();
    }, 16);
  }

  // ── Heading dropdown popover (physical coords; built here, wired in actions) ─
  function closeHeadingMenu() {
    if (_headingMenuEl && _headingMenuEl.parentNode) {
      _headingMenuEl.parentNode.removeChild(_headingMenuEl);
    }
    _headingMenuEl = null;
    if (_toolbarEl) {
      var trig = _toolbarEl.querySelector(".rich-toolbar-heading-trigger");
      if (trig) trig.setAttribute("aria-expanded", "false");
    }
  }

  // ── Active-state (filled by the inline-actions layer) ──────────────────────
  // Default no-op so Task-1 chrome is coherent; the actions layer computes
  // bold/italic/list/heading state at the caret and toggles .is-active.
  function refreshButtonState() { /* actions layer overrides via _refreshImpl */
    if (typeof _refreshImpl === "function") _refreshImpl();
  }
  var _refreshImpl = null;

  // ── Action dispatch (filled by the inline-actions layer) ───────────────────
  // Task-1 chrome preserves focus for every control; the actual TextEdit wiring
  // (bold/italic/list/heading/indent/undo/redo) is installed by the actions
  // layer below. Kept as a single chokepoint so every control routes here.
  var _dispatch = function (/* action, el */) { /* wired by actions layer */ };

  // ── Public: mount (ADDITIVE) ───────────────────────────────────────────────
  // Register each passed textarea into the shared Set/WeakMap and attach focus
  // listeners. A second mount() with a disjoint set leaves earlier fields live
  // (issue 4). config.headings gates the Text-style dropdown (both call sites
  // pass true, so one shared config suffices; first mount wins the toolbar DOM).
  function mount(textareas, config) {
    if (typeof document === "undefined") return;
    if (config && typeof config.headings === "boolean") _config.headings = config.headings;
    ensureToolbar();
    var list = textareas ?
      (textareas.forEach ? textareas : Array.prototype.slice.call(textareas)) : [];
    list.forEach(function (ta) {
      if (!ta || ta.tagName !== "TEXTAREA") return;
      if (_bound.has(ta)) return;
      var listeners = {
        focusin: onFieldFocusIn,
        focusout: onFieldFocusOut,
      };
      ta.addEventListener("focusin", listeners.focusin);
      ta.addEventListener("focusout", listeners.focusout);
      _bound.set(ta, listeners);
      _registered.add(ta);
    });
    // Selection changes drive active-state; bind once, document-wide.
    if (!mount._selBound) {
      document.addEventListener("selectionchange", onSelectionChange);
      mount._selBound = true;
    }
  }

  // ── Public: unmount ────────────────────────────────────────────────────────
  function unmount() {
    _registered.forEach(function (ta) {
      var listeners = _bound.get(ta);
      if (listeners) {
        ta.removeEventListener("focusin", listeners.focusin);
        ta.removeEventListener("focusout", listeners.focusout);
        _bound.delete(ta);
      }
    });
    _registered.clear();
    hideToolbar();
    if (_toolbarEl && _toolbarEl.parentNode) _toolbarEl.parentNode.removeChild(_toolbarEl);
    _toolbarEl = null;
    if (mount._selBound) {
      document.removeEventListener("selectionchange", onSelectionChange);
      mount._selBound = false;
    }
  }

  // Expose internals so the inline-actions layer (same module, extended below in
  // Task 2) can install _dispatch / _refreshImpl and reach shared state.
  var _internals = {
    getFocused: function () { return _focused; },
    getToolbar: function () { return _toolbarEl; },
    getConfig: function () { return _config; },
    setDispatch: function (fn) { _dispatch = fn; },
    setRefresh: function (fn) { _refreshImpl = fn; },
    setHeadingMenu: function (el) { _headingMenuEl = el; },
    getHeadingMenu: function () { return _headingMenuEl; },
    closeHeadingMenu: closeHeadingMenu,
    bindPreserveFocus: bindPreserveFocus,
    isRegistered: function (el) { return _registered.has(el); },
    t: t,
    getBoundingClientRect: function (el) { return el.getBoundingClientRect(); },
  };

  return {
    mount: mount,
    unmount: unmount,
    refreshButtonState: refreshButtonState,
    __internals: _internals,
  };
})();
