// ─────────────────────────────────────────────────────────────────────────────
// rich-toolbar.js — the focus-attached rich-text formatting toolbar.
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
//   left/top (RTL-safe — never rect-derived logical inline insets).
// PUBLIC SURFACE: window.RichToolbar — { mount(textareas, config), unmount(),
//   refreshButtonState() }. mount is ADDITIVE: repeated calls with disjoint
//   textarea sets all stay live (fields tracked in a shared Set/WeakMap like
//   snippets.js bindTextarea); a second mount() NEVER discards earlier-
//   registered fields, so the seven note fields and the #exportEditor field
//   coexist on the one shared toolbar instance.
// DEPENDENCIES: window.TextEdit (editInsert chokepoint + pure transforms;
//   every edit routes through it so a real input event reaches autoGrow +
//   snippets) and window.App.t (i18n tooltip strings). Both are reached
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
//   wrongly — the literal logical-inset token is kept out of this file so a
//   source grep asserting its absence stays green).
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

  // ── Control spec (order + grouping) ────────────────────────────────────────
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

  // ── FOCUS PRESERVATION ─────────────────────────────────────────────────────
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
    // inline-actions layer — until then controls preserve focus only.
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
  // on scroll/resize/autogrow with zero coordinate math. Do NOT use
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
    if (_headingMenuEl) {
      if (typeof _headingMenuEl.__cleanup === "function") _headingMenuEl.__cleanup();
      if (_headingMenuEl.parentNode) _headingMenuEl.parentNode.removeChild(_headingMenuEl);
    }
    _headingMenuEl = null;
    if (_toolbarEl) {
      var trig = _toolbarEl.querySelector(".rich-toolbar-heading-trigger");
      if (trig) trig.setAttribute("aria-expanded", "false");
    }
  }

  // ── Inline-actions layer (every edit routes through window.TextEdit) ───────
  // Apply a pure TextEdit transform through the undo-safe editInsert chokepoint,
  // then restore the transform's expected caret/selection. NEVER touches
  // textarea.value directly, so the native undo stack + the input event autoGrow
  // and snippets observe are both preserved.
  function applyTransform(ta, tr) {
    if (!tr || !tr.replacement) return;
    var r = tr.replacement;
    window.TextEdit.editInsert(ta, r.start, r.end, r.text);
    if (typeof tr.selStart === "number") ta.setSelectionRange(tr.selStart, tr.selEnd);
    refreshButtonState();
  }

  // Bold/italic share full toggle semantics via TextEdit.toggleWrap:
  // wrap / unwrap / insert-pair-with-caret-between — never a doubled marker.
  function doEmphasis(ta, marker) {
    applyTransform(ta, window.TextEdit.toggleWrap(ta.value, ta.selectionStart, ta.selectionEnd, marker));
  }

  // Desktop-only gate for Ctrl/Cmd+B/I — on touch the buttons are the
  // sole formatting affordance, so no keyboard shortcut is bound there.
  function isCoarsePointer() {
    try {
      return !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    } catch (e) { return false; }
  }

  // ── Active-state: reflect the caret/selection format ───────────────────────
  function currentLineText(value, sel) {
    var start = value.lastIndexOf("\n", sel - 1) + 1;
    var end = value.indexOf("\n", sel);
    if (end === -1) end = value.length;
    return value.slice(start, end);
  }
  function isWrapped(value, s, e, marker) {
    var n = marker.length;
    return value.slice(s - n, s) === marker && value.slice(e, e + n) === marker;
  }
  function refreshButtonState() {
    if (!_toolbarEl || !_focused) return;
    var ta = _focused, v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
    var line = currentLineText(v, s);
    var states = {
      bold: isWrapped(v, s, e, "**"),
      // single-star italic, excluding the case where it is really a bold pair
      italic: isWrapped(v, s, e, "*") && !isWrapped(v, s, e, "**"),
      bulletList: /^\s*[-*]\s/.test(line),
      numberedList: /^\s*\d+\.\s/.test(line),
    };
    Object.keys(states).forEach(function (action) {
      var btn = _toolbarEl.querySelector('.rich-toolbar-btn[data-action="' + action + '"]');
      if (btn) btn.classList.toggle("is-active", !!states[action]);
    });
    var trig = _toolbarEl.querySelector(".rich-toolbar-heading-trigger");
    if (trig) trig.classList.toggle("is-active", /^#{1,3}\s/.test(line));
  }

  // ── Heading dropdown menu (physical-coordinate popover, RTL-safe) ──────────
  function toggleHeadingMenu(trigger) {
    if (_headingMenuEl) { closeHeadingMenu(); return; }
    openHeadingMenu(trigger);
  }
  function openHeadingMenu(trigger) {
    var ta = _focused;
    if (!ta) return;
    var menu = document.createElement("div");
    menu.className = "rich-toolbar-heading-menu";
    menu.setAttribute("role", "menu");
    var items = [
      { level: 1, cls: "h1", key: "toolbar.heading1", fb: "Heading 1" },
      { level: 2, cls: "h2", key: "toolbar.heading2", fb: "Heading 2" },
      { level: 3, cls: "h3", key: "toolbar.heading3", fb: "Heading 3" },
      { level: 0, cls: "p", key: "toolbar.regularText", fb: "Regular text" },
    ];
    var line = currentLineText(ta.value, ta.selectionStart);
    var activeLevel = /^(#{1,3})\s/.test(line) ? RegExp.$1.length : 0;
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "rich-toolbar-heading-item rich-toolbar-heading-item--" + it.cls;
      b.setAttribute("role", "menuitem");
      b.setAttribute("data-level", String(it.level));
      b.textContent = t(it.key, it.fb);
      if (it.level === activeLevel) b.classList.add("is-active");
      // mousedown+preventDefault (focus preservation) — same rule as buttons.
      bindPreserveFocus(b, function () {
        applyTransform(ta, window.TextEdit.applyHeading(ta.value, ta.selectionStart, ta.selectionEnd, it.level));
        closeHeadingMenu();
        ta.focus();
      });
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    _headingMenuEl = menu;

    // Position with PHYSICAL left/top from getBoundingClientRect (RTL-safe —
    // a rect-derived logical inline inset mirrors wrongly in RTL).
    var rect = trigger.getBoundingClientRect();
    menu.style.left = rect.left + "px";
    menu.style.top = (rect.bottom + 4) + "px";
    var mrect = menu.getBoundingClientRect();
    var vw = window.innerWidth || document.documentElement.clientWidth;
    if (mrect.right > vw - 8) menu.style.left = Math.max(8, vw - mrect.width - 8) + "px";
    trigger.setAttribute("aria-expanded", "true");

    // Dismiss on outside pointer-down or Esc. Deferred bind so the opening
    // mousedown does not immediately re-close it.
    function onDocDown(ev) {
      if (menu.contains(ev.target) || trigger.contains(ev.target)) return;
      closeHeadingMenu();
    }
    function onEsc(ev) {
      if (ev.key === "Escape") { closeHeadingMenu(); ta.focus(); }
    }
    menu.__cleanup = function () {
      document.removeEventListener("mousedown", onDocDown, true);
      document.removeEventListener("keydown", onEsc, true);
    };
    setTimeout(function () {
      document.addEventListener("mousedown", onDocDown, true);
      document.addEventListener("keydown", onEsc, true);
    }, 0);
  }

  // ── Action dispatch — single chokepoint every control routes through ───────
  function _dispatch(action, el) {
    var ta = _focused;
    if (!ta && action !== "heading") return;
    var TE = window.TextEdit;
    switch (action) {
      case "bold": doEmphasis(ta, "**"); break;
      case "italic": doEmphasis(ta, "*"); break;
      case "bulletList": applyTransform(ta, TE.insertListMarker(ta.value, ta.selectionStart, ta.selectionEnd, "ul")); break;
      case "numberedList": applyTransform(ta, TE.insertListMarker(ta.value, ta.selectionStart, ta.selectionEnd, "ol")); break;
      case "indent": applyTransform(ta, TE.indentLine(ta.value, ta.selectionStart, "in")); break;
      case "outdent": applyTransform(ta, TE.outdentLine(ta.value, ta.selectionStart)); break;
      // Native undo/redo. Works ONLY because every control preserves
      // focus (mousedown+preventDefault) so execCommand targets the field.
      // Single-quoted execCommand so a source grep asserting its presence
      // matches real code, not just a comment.
      case "undo": ta.focus(); document.execCommand('undo'); refreshButtonState(); break;
      case "redo": ta.focus(); document.execCommand('redo'); refreshButtonState(); break;
      case "heading": toggleHeadingMenu(el); break;
      case "preview": /* live preview pane ships in a later slice of this module */ break;
    }
  }

  // Desktop-only Ctrl/Cmd+B/I. Ctrl+Z / Ctrl+Shift+Z are intentionally
  // NOT intercepted — they drive the SAME native undo stack the buttons use.
  function onFieldKeyDown(ev) {
    if (isCoarsePointer()) return;
    if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return;
    var k = (ev.key || "").toLowerCase();
    if (k === "b") { ev.preventDefault(); doEmphasis(ev.currentTarget, "**"); }
    else if (k === "i") { ev.preventDefault(); doEmphasis(ev.currentTarget, "*"); }
  }

  // ── Public: mount (ADDITIVE) ───────────────────────────────────────────────
  // Register each passed textarea into the shared Set/WeakMap and attach focus
  // listeners. A second mount() with a disjoint set leaves earlier fields live.
  // config.headings gates the Text-style dropdown (both call sites
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
        keydown: onFieldKeyDown,
      };
      ta.addEventListener("focusin", listeners.focusin);
      ta.addEventListener("focusout", listeners.focusout);
      ta.addEventListener("keydown", listeners.keydown);
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
        ta.removeEventListener("keydown", listeners.keydown);
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

  return {
    mount: mount,
    unmount: unmount,
    refreshButtonState: refreshButtonState,
  };
})();
