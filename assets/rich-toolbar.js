// ─────────────────────────────────────────────────────────────────────────────
// rich-toolbar.js — the focus-attached rich-text formatting toolbar.
//
// OWNS: a shared, mountable toolbar element that docks IN FLOW directly above
//   whichever registered note field currently has focus, hides when no
//   registered field is focused, and carries the icon-only formatting controls
//   (bold, italic, bullet list, numbered list, a "Text" heading dropdown,
//   indent, outdent, undo, redo) inside a horizontally-scrollable strip, plus a
//   pinned current-state Edit/Preview switcher outside that strip whose active
//   segment reflects the mode the field is CURRENTLY in. Every control preserves
//   the textarea's focus/selection so the undo history + caret math survive.
//   The toolbar is docked with `insertAdjacentElement('beforebegin', field)` so
//   it rides layout on scroll/resize/autogrow with ZERO coordinate math; only
//   the transient heading dropdown popover uses physical getBoundingClientRect
//   left/top (RTL-safe — never rect-derived logical inline insets). A field can
//   instead be mounted with { persistent: true }: it gets its OWN dedicated bar
//   docked permanently above it, always visible and never hidden on blur.
// PUBLIC SURFACE: window.RichToolbar — { mount(textareas, config), unmount(),
//   refreshButtonState() }. mount is ADDITIVE: repeated calls with disjoint
//   textarea sets all stay live (fields tracked in a shared Set/WeakMap like
//   snippets.js bindTextarea); a second mount() NEVER discards earlier-
//   registered fields. The seven note fields share the ONE focus-attached bar
//   that docks above whichever of them has focus; a field mounted with
//   { persistent: true } (the export editor) gets its own dedicated bar docked
//   permanently above it, so the two mounts coexist without the shared bar ever
//   moving onto the persistent field.
// DEPENDENCIES: window.TextEdit (editInsert chokepoint + pure transforms;
//   every edit routes through it so a real input event reaches autoGrow +
//   snippets) and window.App.t (i18n tooltip strings). Both are reached
//   via the explicit window. prefix because they live in other IIFEs.
// CONSTRAINTS: FOCUS PRESERVATION is a hard precondition — every toolbar control
//   binds `mousedown` with `ev.preventDefault()` (mirroring snippets.js:336-341)
//   so the click commits BEFORE the field can blur; without it an undo/redo
//   restore lands on the wrong field and editInsert caret math breaks.
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
  var _toolbarEl = null;          // the shared focus-attached toolbar element
  var _persistent = new Set();    // fields mounted persistent: always docked, no hide-on-blur
  var _persistentBars = new WeakMap(); // persistent field → its own dedicated toolbar element
  var _barField = new WeakMap();  // reverse of _persistentBars: a dedicated bar → the field it serves.
                                  // A persistent bar is ALWAYS visible, so its controls are clicked
                                  // before the field is ever focused; dispatch resolves the target
                                  // from the clicked control's OWN bar, so it never depends on focus.
  var _everFocused = new WeakSet(); // fields that have received focus at least once. A blurred
                                  // textarea RETAINS its selection, so "not currently focused" is
                                  // NOT the same as "has no meaningful caret" — only a field that
                                  // has NEVER been focused gets the end-of-document caret anchor.
  var _headingMenuEl = null;      // transient heading dropdown popover
  var _headingTrigger = null;     // the trigger button that opened the heading menu
  var _focused = null;            // the currently-focused registered textarea
  var _config = { headings: true };
  var _selectionRaf = 0;          // rAF handle for coalesced active-state refresh
  var _renumbering = false;       // re-entrancy guard: our own renumber editInsert
                                  // fires an input event; block it from re-triggering
  var _previewOpen = false;       // is the live preview frame currently shown
  var _previewField = null;       // the textarea the preview frame belongs to
  var _previewDebounce = 0;       // debounce handle for live preview re-render
  var _previewOutsideDown = null; // one-shot outside-pointerdown dismissal for a
                                  // note-field preview (persistent/export fields
                                  // are dismissed by their own modal lifecycle)

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
    // Pencil — the Edit-mode segment glyph in the current-state switcher.
    pencil: function () { return svg(["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"], { strokeWidth: "1.8" }); },
    chevron: function () { return svg(["M6 9l6 6 6-6"], { strokeWidth: "2" }); },
    // Checkmark — marks the ACTIVE register in the heading dropdown. A check is
    // never mirrored, so it carries no RTL flip marker.
    check: function () { return svg(["M5 12l5 5L20 7"], { strokeWidth: "2.4" }); },
  };

  // ── Control spec (order + grouping) ────────────────────────────────────────
  // Groups separated by hairline separators, all inside the scrollable strip:
  // [bold,italic] | [bullet,numbered] | [heading dropdown] | [indent,outdent] |
  // [undo,redo]. The Edit/Preview switcher is a separate pinned control built
  // outside this strip (buildSwitcher), so it never scrolls out of reach.
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
  ];

  // Directional glyphs (indent/outdent/undo/redo) must mirror under RTL; semantic
  // glyphs (bold, italic, the switcher eye/pencil) must not. Marked here so the
  // RTL stylesheet can flip only these.
  var DIRECTIONAL = { indent: true, outdent: true, undo: true, redo: true };

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
    // Directional glyphs carry a flip marker so RTL can mirror them (the arrow
    // sense reverses); semantic glyphs are left unmarked.
    if (DIRECTIONAL[spec.action]) btn.classList.add("icon-flip");
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

  // ── Current-state Edit/Preview switcher (pinned outside the scroll strip) ───
  // Two segments whose ACTIVE one always names the mode the field is in right now
  // (never a target-state toggle that lights up while labelled the other mode).
  // is-active and aria-pressed move together (driven by setMode); at build the
  // field starts in edit, so the edit segment is active + pressed.
  function makeModeSegment(mode, iconName, key, fallback) {
    var seg = document.createElement("button");
    seg.type = "button";
    seg.className = "rich-toolbar-swap-btn";
    seg.setAttribute("data-mode", mode);
    var isEdit = mode === "edit";
    if (isEdit) seg.classList.add("is-active");
    seg.setAttribute("aria-pressed", isEdit ? "true" : "false");
    var label = t(key, fallback);
    seg.title = label;
    seg.setAttribute("aria-label", label);
    seg.appendChild(ICONS[iconName]());
    var span = document.createElement("span");
    span.className = "rich-toolbar-swap-label";
    span.textContent = label;
    seg.appendChild(span);
    bindPreserveFocus(seg, function () { _dispatch("mode", seg); });
    return seg;
  }

  function buildSwitcher() {
    var group = document.createElement("span");
    group.className = "rich-toolbar-swap";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", t("toolbar.modeAria", "Edit or preview"));
    group.appendChild(makeModeSegment("edit", "pencil", "toolbar.backToEdit", "Edit"));
    group.appendChild(makeModeSegment("preview", "preview", "toolbar.preview", "Preview"));
    return group;
  }

  // ── Build the ONE shared toolbar element ───────────────────────────────────
  function buildToolbar() {
    var bar = document.createElement("div");
    bar.className = "rich-toolbar is-hidden";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", t("toolbar.aria", "Text formatting"));
    // A mousedown on the bar's OWN empty area — padding, inter-button gaps, the
    // strip past the last control — must not blur the focused field: the shared
    // focus-attached bar hides on focusout, so a stray click there collapses it
    // and shifts the layout. Controls keep their per-control mousedown guard;
    // this container-level guard catches only the clicks that fall between them
    // (it also fires, harmlessly, when a control's own mousedown bubbles up —
    // preventDefault is idempotent). It never stops propagation, so control
    // activation is untouched; a prevented mousedown does not block wheel/touch
    // scrolling of the overflow-x strip, and native scrollbar dragging targets
    // the scrollbar rather than this element, so both remain usable.
    bar.addEventListener("mousedown", function (ev) { ev.preventDefault(); });

    // Formatting controls live in a horizontally-scrollable strip; the switcher is
    // pinned as a sibling AFTER it so it never scrolls out of reach on narrow widths.
    var strip = document.createElement("div");
    strip.className = "rich-toolbar-scroll";
    GROUPS.forEach(function (group, gi) {
      if (strip.childElementCount > 0) strip.appendChild(makeSeparator());
      var wrap = document.createElement("div");
      wrap.className = "rich-toolbar-group";
      group.forEach(function (spec) { wrap.appendChild(makeButton(spec)); });
      strip.appendChild(wrap);
      // Inject the heading dropdown after the list group (index 1) when enabled.
      if (gi === 1 && _config.headings) {
        strip.appendChild(makeSeparator());
        strip.appendChild(makeHeadingTrigger());
      }
    });
    bar.appendChild(strip);
    bar.appendChild(buildSwitcher());
    return bar;
  }

  function ensureToolbar() {
    if (!_toolbarEl) _toolbarEl = buildToolbar();
    return _toolbarEl;
  }

  // Resolve which toolbar element serves a field: a persistent field owns a
  // dedicated, always-docked bar; every other field shares the one focus-attached
  // bar. Falls back to the shared bar for a null/unknown field.
  function barFor(field) {
    if (field && _persistentBars.has(field)) return _persistentBars.get(field);
    return _toolbarEl;
  }

  // Build (once) and dock a dedicated toolbar directly above a persistent field.
  // Unlike the shared bar it is never hidden on blur — its visibility follows its
  // field's own container (e.g. the export step showing or hiding), so it reads as
  // a permanent part of that editor.
  function ensurePersistentBar(field) {
    var bar = _persistentBars.get(field);
    if (!bar) {
      bar = buildToolbar();
      bar.classList.remove("is-hidden");
      field.insertAdjacentElement("beforebegin", bar);
      _persistentBars.set(field, bar);
      _barField.set(bar, field); // record the bar→field link so dispatch resolves both ways
    }
    return bar;
  }

  // ── Focus tracking + in-flow docking ───────────────────────────────────────
  // Dock the single toolbar IN FLOW above the focused field so it rides layout
  // on scroll/resize/autogrow with zero coordinate math. Do NOT use
  // fixed getBoundingClientRect coords for the bar — that detaches on the first
  // scroll of an autogrowing field.
  function dockTo(textarea) {
    // Every focus path routes through here (real focusin AND a dispatch-driven
    // focus), so this is the single point that records genuine first-touch.
    _everFocused.add(textarea);
    // Focus moved to a DIFFERENT field: the preview is per-field and resets on
    // blur, so drop any preview bound to the previously-focused field.
    if (_previewOpen && _previewField !== textarea) closePreview();
    if (_persistent.has(textarea)) {
      // A persistent field already carries its own always-docked bar — never move
      // the shared bar onto it. Hide the shared bar (it serves the other fields)
      // and just track focus + refresh the dedicated bar.
      if (_toolbarEl) _toolbarEl.classList.add("is-hidden");
      _focused = textarea;
      refreshButtonState();
      return;
    }
    var bar = ensureToolbar();
    textarea.insertAdjacentElement("beforebegin", bar);
    bar.classList.remove("is-hidden");
    _focused = textarea;
    refreshButtonState();
  }

  function hideToolbar() {
    if (_toolbarEl) _toolbarEl.classList.add("is-hidden");
    closeHeadingMenu();
    closePreview(); // reset the preview when focus leaves the whole field set
    _focused = null;
  }

  function onFieldFocusIn(ev) {
    dockTo(ev.currentTarget);
  }

  // Hide only when focus leaves the whole registered set (and isn't moving into
  // the toolbar itself, whose controls preventDefault so focus never lands there
  // — but guard anyway for keyboard focus).
  function onFieldFocusOut(ev) {
    var field = ev.currentTarget;
    // A persistent field keeps its dedicated bar docked on blur (no hide-on-blur).
    if (_persistent.has(field)) return;
    var next = ev.relatedTarget;
    if (next && _toolbarEl && _toolbarEl.contains(next)) return;
    if (next && next.tagName === "TEXTAREA" && _registered.has(next)) return;
    // Defer so a focus move BETWEEN two registered fields re-docks first.
    setTimeout(function () {
      // Entering preview hides the FOCUSED textarea, which blurs it and drops focus
      // to the body — a swap-initiated blur, NOT a real focus-leave. Do not cascade
      // the bar + preview closed the instant preview opens; the outside-mousedown
      // dismissal handles a genuine click away.
      if (_previewOpen && _previewField === field) return;
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
    // Reset the exact trigger that opened the menu — it may live on the shared
    // bar OR a persistent field's dedicated bar.
    if (_headingTrigger) {
      _headingTrigger.setAttribute("aria-expanded", "false");
      _headingTrigger = null;
    }
  }

  // ── Inline-actions layer (every edit routes through window.TextEdit) ───────
  // Apply a pure TextEdit transform through the undo-safe editInsert chokepoint,
  // then restore the transform's expected caret/selection. NEVER touches
  // textarea.value directly, so the input event autoGrow and snippets observe is
  // preserved. A boundary is recorded on the module undo history BEFORE mutating
  // so the whole action collapses to exactly one undo step, with the pre-edit
  // state as the undo target.
  function applyTransform(ta, tr) {
    if (!tr || !tr.replacement) return;
    if (window.TextEdit.undoRecord) window.TextEdit.undoRecord(ta);
    var r = tr.replacement;
    window.TextEdit.editInsert(ta, r.start, r.end, r.text);
    if (typeof tr.selStart === "number") ta.setSelectionRange(tr.selStart, tr.selEnd);
    refreshButtonState();
  }

  // A list line is one whose leading content is a bullet or ordinal marker —
  // character-matched to the renderer's list grammar (`- ` / `* ` / `N. `, any
  // 2-space nesting). Tab/Shift+Tab only act on these; ordinary text keeps native
  // focus-move (no keyboard trap). Heading lines are deliberately NOT list lines.
  function isListLine(value, sel) {
    return /^\s*(?:[-*]|\d+\.)(?=\s|$)/.test(currentLineText(value, sel));
  }
  // Heading lines stay flush-left — never indented (by Tab or the buttons).
  function isHeadingLine(value, sel) {
    return /^#{1,3}\s/.test(currentLineText(value, sel));
  }

  // Auto-renumber the caret's contiguous ordered block so raw text always reads
  // 1..N. Called ONLY on STRUCTURAL list changes (marker insert, Enter
  // continuation/exit/outdent, indent/outdent, or a deletion that removes a list
  // line) — never on ordinary character typing. TextEdit.renumberOrderedBlock
  // returns a NO-OP (unchanged value + empty-length replacement) when the
  // numbering is already correct; in that case we make ZERO editInsert calls so
  // plain typing never adds a redundant edit or an extra undo step. The
  // re-entrancy guard stops the input event our own renumber fires from looping,
  // which also folds the renumber into the SAME undo step as the action that
  // triggered it (rather than opening its own boundary).
  function maybeRenumber(ta) {
    if (_renumbering || !ta) return;
    var tr = window.TextEdit.renumberOrderedBlock(ta.value, ta.selectionStart);
    if (!tr || !tr.replacement) return;
    var r = tr.replacement;
    if (r.text === "" && r.start === r.end) return; // no-op: numbering already correct
    _renumbering = true;
    try {
      window.TextEdit.editInsert(ta, r.start, r.end, r.text);
      if (typeof tr.selStart === "number") ta.setSelectionRange(tr.selStart, tr.selEnd);
    } finally {
      _renumbering = false;
    }
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
  // Redo's Windows/Linux shortcut is Ctrl+Y; on mac redo is Cmd+Shift+Z only.
  function isMac() {
    try {
      var p = (navigator.platform || navigator.userAgent || "");
      return /Mac|iPhone|iPad|iPod/.test(p);
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
  // Reflects the given field's state onto ITS bar; with no argument it serves the
  // currently-focused field. The explicit-field form exists for a persistent bar,
  // which is visible (and clickable) before its field is ever focused — callers
  // that re-seed the undo history programmatically pass the field so the bar's
  // undo/redo dim stays honest without focus.
  function refreshButtonState(field) {
    var ta = field || _focused;
    var bar = barFor(ta);
    if (!bar || !ta) return;
    var v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
    var line = currentLineText(v, s);
    // While the bar is in preview mode every strip control is inert (dimmed
    // means dead — dispatch drops their clicks). aria-disabled mirrors that,
    // COMPOSED with the per-control reasons below (heading-line indent dim,
    // empty-history undo/redo dim): a control can be disabled for more than one
    // reason at once, so leaving preview re-derives each control's state here
    // rather than blanket-clearing the attribute.
    var previewing = bar.classList.contains("is-preview");
    var states = {
      bold: isWrapped(v, s, e, "**"),
      // single-star italic, excluding the case where it is really a bold pair
      italic: isWrapped(v, s, e, "*") && !isWrapped(v, s, e, "**"),
      bulletList: /^\s*[-*]\s/.test(line),
      numberedList: /^\s*\d+\.\s/.test(line),
    };
    Object.keys(states).forEach(function (action) {
      var btn = bar.querySelector('.rich-toolbar-btn[data-action="' + action + '"]');
      if (!btn) return;
      btn.classList.toggle("is-active", !!states[action]);
      if (previewing) btn.setAttribute("aria-disabled", "true");
      else btn.removeAttribute("aria-disabled");
    });
    var trig = bar.querySelector(".rich-toolbar-heading-trigger");
    var heading = /^#{1,3}\s/.test(line);
    if (trig) {
      trig.classList.toggle("is-active", heading);
      if (previewing) trig.setAttribute("aria-disabled", "true");
      else trig.removeAttribute("aria-disabled");
    }
    // Heading lines stay flush-left, so indent/outdent are no-ops there — dim
    // the two buttons and mark them aria-disabled as feedback. Deliberately NOT
    // the real disabled attribute: a hard-disabled button stops firing mousedown,
    // which would blur the field and collapse the shared bar (the
    // focus-preservation contract). The dispatch no-op guard stays the
    // behavioral backstop.
    ["indent", "outdent"].forEach(function (action) {
      var btn = bar.querySelector('.rich-toolbar-btn[data-action="' + action + '"]');
      if (!btn) return;
      btn.classList.toggle("is-unavailable", heading);
      if (heading || previewing) btn.setAttribute("aria-disabled", "true");
      else btn.removeAttribute("aria-disabled");
    });
    // Undo/redo dim to the field's REAL history availability — same treatment as
    // the indent/outdent dim above (CSS class + aria-disabled, never the real
    // disabled attribute, which would swallow mousedown, blur the field and
    // collapse the shared bar). TextEdit's own no-op guards stay the behavioral
    // backstop; a missing accessor leaves the buttons live.
    var TE = window.TextEdit;
    var avail = {
      undo: TE && typeof TE.canUndo === "function" ? TE.canUndo(ta) : true,
      redo: TE && typeof TE.canRedo === "function" ? TE.canRedo(ta) : true,
    };
    ["undo", "redo"].forEach(function (action) {
      var btn = bar.querySelector('.rich-toolbar-btn[data-action="' + action + '"]');
      if (!btn) return;
      var off = !avail[action];
      btn.classList.toggle("is-unavailable", off);
      if (off || previewing) btn.setAttribute("aria-disabled", "true");
      else btn.removeAttribute("aria-disabled");
    });
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
    var hm = /^(#{1,3})\s/.exec(line);
    var activeLevel = hm ? hm[1].length : 0;
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "rich-toolbar-heading-item rich-toolbar-heading-item--" + it.cls;
      // menuitemradio (not plain menuitem): the four registers are a
      // single-select group, and aria-checked is only valid on the radio role.
      b.setAttribute("role", "menuitemradio");
      b.setAttribute("data-level", String(it.level));
      // The current register is marked by a leading checkmark (+ soft tint via
      // CSS) — NEVER by colouring the label text: each item PREVIEWS its
      // register, so an accent-coloured label would read as "this style makes
      // the text that colour", which the editor cannot do. Every item reserves
      // the check column so the previews stay aligned; the glyph shows only on
      // the active item. Built with DOM APIs — MdRender.render stays the sole
      // innerHTML sink in this module. The check sits at the logical start
      // (flex follows direction), so RTL places it on the right by itself.
      var checkSlot = document.createElement("span");
      checkSlot.className = "rich-toolbar-heading-check";
      checkSlot.setAttribute("aria-hidden", "true");
      checkSlot.appendChild(ICONS.check());
      b.appendChild(checkSlot);
      var itemLabel = document.createElement("span");
      itemLabel.className = "rich-toolbar-heading-item-label";
      itemLabel.textContent = t(it.key, it.fb);
      b.appendChild(itemLabel);
      var isCurrent = it.level === activeLevel;
      if (isCurrent) b.classList.add("is-active");
      b.setAttribute("aria-checked", isCurrent ? "true" : "false");
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
    _headingTrigger = trigger;

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

  // ── In-place preview Frame (per-field, on-demand, blur-reset) ──────────────
  // Entering preview REPLACES the field in its own box: the textarea is hidden and
  // a Frame takes its place (one thing on screen at a time). The Frame is a
  // positioned wrapper `.rich-toolbar-preview` holding a floating chip and a
  // `.note-rendered` render body — the render body carries the note styling, the
  // wrapper carries the swap sizing + chip. The Frame is a DISTINCT element stored
  // on `textarea._notePreview` — never the separate property read-mode's
  // renderReadModeNotes overlay owns — so the edit-mode preview and the read-mode
  // overlay never share an element or clobber each other. All rendering routes
  // through window.MdRender.render (escape-first, XSS-safe) into the render body
  // ONLY; the chip + empty state are built with DOM APIs (createElement /
  // textContent / text nodes); the raw note value is NEVER assigned to innerHTML.
  function buildPreviewPane(ta) {
    var frame = ta._notePreview;
    if (!frame) {
      frame = document.createElement("div");
      frame.className = "rich-toolbar-preview";
      frame.setAttribute("aria-live", "polite");
      var chip = document.createElement("span");
      chip.className = "rich-toolbar-preview-chip";
      // Eye glyph + label, built via DOM API (createElementNS + text node) so the
      // chip never touches innerHTML — MdRender.render stays the sole sink.
      chip.appendChild(ICONS.preview());
      chip.appendChild(document.createTextNode(t("toolbar.previewChip", "PREVIEW")));
      frame.appendChild(chip);
      var body = document.createElement("div");
      body.className = "note-rendered rich-toolbar-preview-body";
      frame.appendChild(body);
      ta.insertAdjacentElement("afterend", frame);
      ta._notePreview = frame;
    }
    return frame;
  }

  // Render the focused field's value into its Frame render body (NOT the wrapper,
  // so the floating chip survives re-renders). Empty field → the empty-state block
  // (built with textContent, never innerHTML). Non-empty → MdRender.render (the
  // SOLE innerHTML writer here); textContent fallback when MdRender is unavailable
  // (literal markdown, never raw innerHTML).
  function renderPreview(ta) {
    var frame = ta && ta._notePreview;
    if (!frame) return;
    var body = frame.querySelector(".rich-toolbar-preview-body");
    if (!body) return;
    var val = ta.value;
    if (!val || !val.trim()) {
      frame.classList.add("is-empty");
      body.textContent = "";
      var wrap = document.createElement("div");
      wrap.className = "rich-toolbar-preview-empty";
      var title = document.createElement("p");
      title.className = "rich-toolbar-preview-empty-title";
      title.textContent = t("toolbar.previewEmptyTitle", "Nothing to preview yet");
      var emptyBody = document.createElement("p");
      emptyBody.className = "rich-toolbar-preview-empty-body";
      emptyBody.textContent = t("toolbar.previewEmptyBody", "Start typing to see the formatted result.");
      wrap.appendChild(title);
      wrap.appendChild(emptyBody);
      body.appendChild(wrap);
      return;
    }
    frame.classList.remove("is-empty");
    if (window.MdRender && typeof window.MdRender.render === "function") {
      // MdRender.render escapes HTML before structural rules — safe to assign.
      body.innerHTML = window.MdRender.render(val);
    } else {
      body.textContent = val; // fallback: literal, never raw innerHTML
    }
  }

  function schedulePreviewRender(ta) {
    if (!_previewOpen || _previewField !== ta) return;
    if (_previewDebounce) clearTimeout(_previewDebounce);
    _previewDebounce = setTimeout(function () {
      _previewDebounce = 0;
      renderPreview(ta);
    }, 120);
  }

  function openPreview(ta) {
    var frame = buildPreviewPane(ta);
    frame.classList.remove("is-hidden");
    _previewOpen = true;
    _previewField = ta;
    renderPreview(ta);
    // Swap in place: the Frame takes the editor's box. Size it to the textarea's
    // current rendered height (the autogrowing note fields size to content) BEFORE
    // hiding the editor, so the box does not collapse on the swap; then hide the
    // textarea so only one surface shows at a time.
    var h = ta.offsetHeight;
    if (h) frame.style.minHeight = h + "px";
    ta.classList.add("is-hidden");
    revealPreviewPane(ta, frame);
    bindPreviewOutsideDismiss(ta);
  }

  // Bind a one-shot outside-pointerdown dismissal for a NOTE-field preview (the
  // persistent export editor is dismissed by its own modal lifecycle, not here).
  // A mousedown that lands outside the field's own bar AND its Frame closes the
  // preview and undocks the bar. Deferred bind (mirrors the heading-menu idiom) so
  // the opening click does not immediately fire it. Torn down in closePreview.
  function bindPreviewOutsideDismiss(ta) {
    if (_persistent.has(ta)) return;
    teardownPreviewOutsideDismiss();
    var frame = ta._notePreview;
    var bar = barFor(ta);
    function onDown(ev) {
      if (frame && frame.contains(ev.target)) return;
      if (bar && bar.contains(ev.target)) return;
      closePreview();
      hideToolbar();
    }
    _previewOutsideDown = onDown;
    setTimeout(function () {
      if (_previewOutsideDown === onDown) {
        document.addEventListener("mousedown", onDown, true);
      }
    }, 0);
  }
  function teardownPreviewOutsideDismiss() {
    if (_previewOutsideDown) {
      document.removeEventListener("mousedown", _previewOutsideDown, true);
      _previewOutsideDown = null;
    }
  }

  // After the swap the Frame occupies the (now-hidden) editor's box, so it is
  // already visible on open — no scroll is needed. This retains the export
  // edit-area scroll math as a HARMLESS no-op safety (delta ≈ 0 when the Frame sits
  // where the editor was): the area is a fixed-height overflow-y:auto container, so
  // if the Frame ever opened below the fold this nudges its top just under the
  // pinned (sticky) toolbar. Note fields grow the page instead (no fold) and
  // resolve no container here, taking no scroll. Offsets come from live rects (the
  // static edit-area is not the Frame's offsetParent); the scroll is vertical-only,
  // hence RTL-safe.
  function revealPreviewPane(ta, frame) {
    if (!ta || !frame || typeof ta.closest !== "function") return;
    var container = ta.closest(".export-edit-area");
    if (!container) return; // not the export surface — note-field preview takes no scroll
    var bar = _persistentBars.get(ta);
    if (!bar) return;
    var GAP = 8; // small breathing room below the pinned bar
    var areaRect = container.getBoundingClientRect();
    var barRect = bar.getBoundingClientRect();
    var frameRect = frame.getBoundingClientRect();
    // The container is the surface that must have layout for the scroll math to be
    // valid — a zero-height area means no layout engine (e.g. headless jsdom).
    if (!areaRect.height) return;
    // Frame's current offset from the top of the container content, minus the bar
    // height and gap: scroll the container so the Frame top lands just below the bar.
    var delta = (frameRect.top - barRect.bottom) - GAP;
    container.scrollTop += delta;
  }

  // Restore Edit in the swap's box: show the textarea again, un-size + hide the
  // Frame. No focus here — the caller decides (setMode's edit branch refocuses; a
  // field-change / blur / resetPreview close must NOT yank focus back).
  function restoreEditSurface(ta) {
    if (!ta) return;
    ta.classList.remove("is-hidden");
    var frame = ta._notePreview;
    if (frame) {
      frame.style.minHeight = "";
      frame.classList.add("is-hidden");
    }
  }

  // Reset on blur / field change / toggle-off — no stickiness. Restores the editor
  // in place (undoes the swap) without forcing focus, AND resets the bar UI: the
  // switcher segments and the is-preview marker are the CURRENT-STATE mirror of
  // the swap, so every close path must return them to Edit together with the
  // surface — a bar left in preview over a visible textarea lies about the mode
  // and keeps the strip needlessly inert. The bar is resolved from the closing
  // preview's own field BEFORE that state is cleared (the field-change path has
  // already moved focus elsewhere by the time this runs).
  function closePreview() {
    if (!_previewOpen) return;
    var ta = _previewField;
    var bar = barFor(ta);
    restoreEditSurface(ta);
    teardownPreviewOutsideDismiss();
    if (_previewDebounce) { clearTimeout(_previewDebounce); _previewDebounce = 0; }
    _previewOpen = false;
    _previewField = null;
    if (bar) {
      bar.classList.remove("is-preview");
      var segs = bar.querySelectorAll("[data-mode]");
      Array.prototype.forEach.call(segs, function (seg) {
        var on = seg.getAttribute("data-mode") === "edit";
        seg.classList.toggle("is-active", on);
        seg.setAttribute("aria-pressed", on ? "true" : "false");
      });
      // Clear the preview-driven inert state (still-valid per-control dims —
      // heading line, empty history — are re-derived, not blanket-cleared).
      refreshButtonState(ta);
    }
  }

  // Return an open preview to Edit for a closing modal — WITHOUT focusing the
  // field (a modal is closing; do not force focus onto a hidden editor).
  // closePreview owns the full teardown, bar UI included, and never focuses;
  // export-modal.js calls this on close so a reopen starts in Edit with a fresh
  // render, never a stale Frame.
  function resetPreview() {
    closePreview();
  }

  // Preview is view-only, so it resolves its field WITHOUT focusing it — focusing
  // the export editor would pop the iOS soft keyboard over the just-revealed pane.
  // A persistent control passes its own bar's field explicitly; the shared bar
  // passes nothing and falls back to the focused field. barFor falls back to
  // _previewField, so the switcher state stays correct without focus.
  function togglePreview(field) {
    var ta = field || _focused;
    if (!ta) return;
    if (_previewOpen && _previewField === ta) closePreview();
    else { if (_previewOpen) closePreview(); openPreview(ta); }
  }

  // Current-state mode controller: set the field to edit or preview and reflect it
  // on the switcher. The active segment always names the CURRENT mode — is-active
  // and aria-pressed move together on the two segments. Preview removes the editor
  // from view (the frame takes its box) and resolves the field WITHOUT focusing it,
  // so the export bar never pops the soft keyboard over the just-revealed preview;
  // edit restores and refocuses the field. The preview open/close plumbing is
  // reused as-is.
  function setMode(mode, field) {
    var ta = field || _focused || _previewField;
    if (!ta) return;
    var preview = mode === "preview";
    var bar = barFor(ta);
    if (bar) {
      var segs = bar.querySelectorAll("[data-mode]");
      Array.prototype.forEach.call(segs, function (seg) {
        var on = seg.getAttribute("data-mode") === mode;
        seg.classList.toggle("is-active", on);
        seg.setAttribute("aria-pressed", on ? "true" : "false");
      });
      bar.classList.toggle("is-preview", preview);
    }
    // One surface at a time. The editor-hide is owned by the swap: openPreview
    // sizes the Frame to the editor's height BEFORE hiding it, and closePreview
    // restores it — so the field's box never collapses on the swap.
    if (preview) {
      openPreview(ta);
    } else {
      closePreview();
      ta.focus();
    }
    // Re-derive every strip control's inert/aria-disabled state for the new
    // mode (explicit-field form: a persistent bar has no focus event to ride).
    refreshButtonState(ta);
  }

  // ── Change-site reveal after an undo/redo restore ──────────────────────────
  // The restore rewrites the WHOLE value through the insert chokepoint, which
  // resets an internally-scrolling textarea (the export editor) to the top in
  // WebKit — so what the undo just changed can sit off screen and look like
  // nothing happened. setSelectionRange never scrolls, and neither does a
  // blur/focus cycle (probed in WebKit), so the reveal must be computed: a
  // hidden mirror block replicating the field's text layout measures the Y of
  // the CHANGE SITE — the first index where the pre- and post-restore values
  // diverge, which is where the visible difference starts — soft wraps included
  // (a naive newline-count times line-height undercounts them). scrollTop then
  // centres that site when it sits outside the visible band. The SELECTION is
  // deliberately untouched: the history restores each step's recorded caret
  // (the pinned stack contract — e.g. an unwrapped bold restores the caret
  // INSIDE the text while the diff starts at the removed marker), so the scroll
  // anchors on the diff without disturbing that caret math. Autogrowing note
  // fields never scroll internally (their height tracks content), so the
  // scroll-room guard makes this a no-op there and the page scroll is never
  // touched.
  function measureTopAt(ta, index) {
    var cs;
    try { cs = window.getComputedStyle(ta); } catch (e) { return -1; }
    var doc = ta.ownerDocument || document;
    if (!doc.body) return -1;
    var mirror = doc.createElement("div");
    var s = mirror.style;
    s.position = "absolute";
    s.visibility = "hidden";
    s.whiteSpace = "pre-wrap";
    s.overflowWrap = "break-word";
    s.boxSizing = "border-box";
    // clientWidth excludes border and any scrollbar, so with border-box sizing
    // and the copied padding the mirror wraps at the textarea's content width.
    s.width = ta.clientWidth + "px";
    ["direction", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
     "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight",
     "letterSpacing", "textTransform", "textIndent", "tabSize"].forEach(function (p) {
      try { if (cs[p]) s[p] = cs[p]; } catch (e) { /* engine without this prop */ }
    });
    mirror.textContent = ta.value.slice(0, index);
    var marker = doc.createElement("span");
    marker.textContent = "\u200b"; // zero-width: adds no wrap of its own
    mirror.appendChild(marker);
    doc.body.appendChild(mirror);
    var top = marker.offsetTop;
    doc.body.removeChild(mirror);
    return top;
  }
  // First index where the two values diverge — where the restored difference
  // becomes visible. Clamped into the new value (a pure-append undo diverges at
  // the old tail, which is the new end).
  function firstDiffIndex(prev, next) {
    var n = Math.min(prev.length, next.length);
    var i = 0;
    while (i < n && prev.charCodeAt(i) === next.charCodeAt(i)) i++;
    return Math.min(i, next.length);
  }
  function revealChangeAfterRestore(ta, prevValue) {
    if (!ta) return;
    var maxScroll = ta.scrollHeight - ta.clientHeight;
    if (!(maxScroll > 1)) return; // no internal scroll room — nothing to reveal
    var siteTop = measureTopAt(ta, firstDiffIndex(prevValue, ta.value));
    if (siteTop < 0) return;
    var cs = null;
    try { cs = window.getComputedStyle(ta); } catch (e) { /* headless */ }
    var lineH = cs ? parseFloat(cs.lineHeight) : NaN;
    if (!lineH || isNaN(lineH)) lineH = 20;
    var viewTop = ta.scrollTop;
    var viewBottom = viewTop + ta.clientHeight - lineH;
    if (siteTop >= viewTop && siteTop <= viewBottom) return; // already visible
    var target = siteTop - ta.clientHeight / 2;
    if (target < 0) target = 0;
    if (target > maxScroll) target = maxScroll;
    ta.scrollTop = target;
  }
  // One chokepoint for BOTH history directions from buttons AND keyboard:
  // capture the pre-restore value (the diff anchor), run the move, reveal the
  // change site only when the history actually moved, then refresh the dims.
  function runHistory(ta, direction) {
    var prev = ta.value;
    var moved = direction === "redo" ? window.TextEdit.redo(ta) : window.TextEdit.undo(ta);
    if (moved) revealChangeAfterRestore(ta, prev);
    refreshButtonState();
  }

  // ── Action dispatch — single chokepoint every control routes through ───────
  function _dispatch(action, el) {
    // A persistent bar is always visible, so its controls are clicked before the
    // field is ever focused. Resolve the target from the CLICKED control's OWN bar
    // (bar→field) so a persistent control never depends on prior focus. A shared
    // note-field control resolves to no barField and falls through to _focused,
    // keeping the shared-bar path byte-identical.
    var ownBar = el && typeof el.closest === "function" ? el.closest(".rich-toolbar") : null;
    var barField = ownBar && _barField.has(ownBar) ? _barField.get(ownBar) : null;
    // Mode switcher: a click on a mode segment sets the current-state mode and
    // returns BEFORE the focus-anchor block below, so entering preview never
    // focuses the field (keeping the soft-keyboard suppression the view-only path
    // guarantees). Resolves the target from the clicked segment's own bar so the
    // always-on export switcher works with no prior focus.
    var modeSeg = el && typeof el.closest === "function" ? el.closest("[data-mode]") : null;
    if (modeSeg) {
      setMode(modeSeg.getAttribute("data-mode"), barField || _focused);
      return;
    }
    // While this bar's surface is previewing, every control except the mode
    // switcher is inert — dimmed means dead. Bail BEFORE the focus-anchor block
    // so an inert click neither focuses the hidden editor, opens the heading
    // menu, applies formatting, nor changes the mode; the switcher segments and
    // Ctrl/Cmd+E are the ways back to Edit. The mousedown preventDefault has
    // already run, so the dropped click steals no focus and collapses nothing.
    if (_previewOpen && _previewField === (barField || _focused)) return;
    if (barField) {
      // Formatting/undo/redo/heading: make the bar's own field the active target.
      // Set the module focus state DIRECTLY (do not rely solely on the focusin
      // side-effect, which may not fire in every engine). Anchor a deterministic
      // end-of-document caret ONLY when the field has NEVER been focused (its
      // collapsed caret is the varying engine default). A field that was focused
      // and then blurred RETAINS its caret — a blurred textarea keeps its
      // selection — so that caret is preserved, as is any real selection
      // (start !== end).
      if (!_everFocused.has(barField) &&
          barField.selectionStart === barField.selectionEnd) {
        var len = barField.value.length;
        try { barField.setSelectionRange(len, len); } catch (e) { /* detached */ }
      }
      barField.focus();
      dockTo(barField); // sets _focused = barField + refreshes state
    }
    var ta = _focused;
    if (!ta && action !== "heading") return;
    var TE = window.TextEdit;
    switch (action) {
      case "bold": doEmphasis(ta, "**"); break;
      case "italic": doEmphasis(ta, "*"); break;
      case "bulletList": applyTransform(ta, TE.insertListMarker(ta.value, ta.selectionStart, ta.selectionEnd, "ul")); maybeRenumber(ta); break;
      case "numberedList": applyTransform(ta, TE.insertListMarker(ta.value, ta.selectionStart, ta.selectionEnd, "ol")); maybeRenumber(ta); break;
      // Indent/outdent buttons share the keyboard path; headings stay flush-left.
      case "indent": if (!isHeadingLine(ta.value, ta.selectionStart)) { applyTransform(ta, TE.indentLine(ta.value, ta.selectionStart, "in")); maybeRenumber(ta); } break;
      case "outdent": if (!isHeadingLine(ta.value, ta.selectionStart)) { applyTransform(ta, TE.outdentLine(ta.value, ta.selectionStart)); maybeRenumber(ta); } break;
      // Undo/redo drive the ONE module-owned history (window.TextEdit) — the
      // same stack the keyboard shortcut routes to, never two diverging stacks.
      // Works because every control preserves focus (mousedown+preventDefault)
      // so the restore lands on the right field with correct caret math. A
      // restore that actually moved scrolls the changed site back into view.
      case "undo": ta.focus(); runHistory(ta, "undo"); break;
      case "redo": ta.focus(); runHistory(ta, "redo"); break;
      case "heading": toggleHeadingMenu(el); break;
    }
  }

  // Keydown-anchored list mechanics + desktop-only Ctrl/Cmd+B/I. Enter/Tab are
  // handled on KEYDOWN — the reliable anchor, because iOS Safari fires the
  // pre-input event inconsistently for Enter, so we do not rely on it. Ctrl/Cmd+Z
  // and Ctrl/Cmd+Shift+Z (plus Ctrl+Y off mac) ARE intercepted and routed to the
  // module undo history, so the keyboard and the buttons drive the SAME single
  // stack — two stacks would diverge and give contradictory results.
  function onFieldKeyDown(ev) {
    var ta = ev.currentTarget;
    // Yield Enter/Tab to an in-progress snippet accept. The snippets autocomplete
    // binds its keydown first and commits synchronously — it has already
    // preventDefault'ed and closed its popover by the time this handler runs — so
    // `ev.defaultPrevented` is the load-bearing signal that a snippet took the
    // key. The open-state check is a belt-and-suspenders fallback for other
    // registration orders. When either holds, bail before the list mechanics so
    // an accept never also continues or indents the list. Plain Enter/Tab (nothing
    // prevented, popover closed) falls through unchanged.
    if ((ev.key === "Enter" || ev.key === "Tab") &&
        (ev.defaultPrevented ||
         (window.Snippets && typeof window.Snippets.isPopoverOpen === "function" &&
          window.Snippets.isPopoverOpen()))) {
      return;
    }
    // Enter: list auto-format. TextEdit.autoFormatEnter returns a transform on a
    // list line (continue / top-level exit / single-level nested outdent)
    // and null on an ordinary line. On a transform we take over the Enter and
    // renumber the block; on null the native Enter proceeds untouched.
    if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing &&
        !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      var trE = window.TextEdit.autoFormatEnter(ta.value, ta.selectionStart);
      if (trE) {
        ev.preventDefault();
        applyTransform(ta, trE);
        maybeRenumber(ta); // continuation/exit/outdent restructures the ordered block
      }
      return;
    }
    // Tab / Shift+Tab: indent/outdent ONLY on a list line; on ordinary text keep
    // the native focus-move (no keyboard trap). Heading lines are not list
    // lines, so they keep native Tab too (flush-left).
    if (ev.key === "Tab" && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (isListLine(ta.value, ta.selectionStart)) {
        ev.preventDefault();
        applyTransform(ta, ev.shiftKey
          ? window.TextEdit.outdentLine(ta.value, ta.selectionStart)
          : window.TextEdit.indentLine(ta.value, ta.selectionStart, "in"));
        maybeRenumber(ta);
      }
      return;
    }
    // Undo / redo → the single module history (buttons + keyboard agree).
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey) {
      var zk = (ev.key || "").toLowerCase();
      if (zk === "z") {
        ev.preventDefault();
        ta.focus();
        runHistory(ta, ev.shiftKey ? "redo" : "undo");
        return;
      }
      if (zk === "y" && ev.ctrlKey && !ev.metaKey && !ev.shiftKey && !isMac()) {
        ev.preventDefault();
        ta.focus();
        runHistory(ta, "redo");
        return;
      }
    }
    // Ctrl/Cmd+E toggles Edit<->Preview. Handled BEFORE the coarse-pointer gate so
    // it works on touch too. This is the ENTER direction (the field still holds
    // focus); stop propagation so the document-level fallback (which drives the
    // RETURN direction while the textarea is hidden) does not also fire for this
    // same keydown and immediately toggle back.
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.key || "").toLowerCase() === "e") {
      ev.preventDefault();
      ev.stopPropagation();
      setMode(_previewOpen ? "edit" : "preview", ta);
      return;
    }
    if (isCoarsePointer()) return;
    if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return;
    var k = (ev.key || "").toLowerCase();
    if (k === "b") { ev.preventDefault(); doEmphasis(ta, "**"); }
    else if (k === "i") { ev.preventDefault(); doEmphasis(ta, "*"); }
  }

  // Document-level Ctrl/Cmd+E fallback: while previewing, the textarea is hidden and
  // receives no keys, so the RETURN-to-edit direction is bound at the document. Fire
  // ONLY when the active element is not a registered textarea (the field handler
  // already owns the key while focused) and a preview is actually open — never a
  // global hijack.
  function onDocKeyDown(ev) {
    if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return;
    if ((ev.key || "").toLowerCase() !== "e") return;
    var active = document.activeElement;
    if (active && active.tagName === "TEXTAREA" && _registered.has(active)) return;
    if (!_previewOpen || !_previewField) return;
    ev.preventDefault();
    setMode("edit", _previewField);
  }

  // Structural deletions (Backspace/Delete/cut that removes a list line) can
  // disturb ordered numbering, so renumber on deletion input types only — plain
  // character typing (`insertText` without a newline) must NOT renumber. Every
  // input also refreshes the live preview when it is open for this field.
  function onFieldInput(ev) {
    var ta = ev.currentTarget;
    if (!_renumbering) {
      var it = ev.inputType || "";
      // Fold ordinary typing into human-scale undo steps (a fresh step at each
      // line break and typing pause). A restore's own input event is a no-op
      // here: window.TextEdit self-ignores its recording entry points while a
      // restore is in flight, so NO toolbar-side restore guard is needed.
      window.TextEdit.undoNoteInput(ta, it);
      if (it.indexOf("delete") === 0 || it === "insertFromPaste") maybeRenumber(ta);
    }
    if (_previewOpen && _previewField === ta) schedulePreviewRender(ta);
    // Undo availability changes on every input (typing makes undo possible, and a
    // restore's own input event lands here after undo/redo move the pointer), so
    // ride the same rAF-coalesced refresh selectionchange uses — never a second
    // per-keystroke refresh path.
    onSelectionChange();
  }

  // ── Public: mount (ADDITIVE) ───────────────────────────────────────────────
  // Register each passed textarea into the shared Set/WeakMap and attach focus
  // listeners. A second mount() with a disjoint set leaves earlier fields live.
  // config.headings gates the Text-style dropdown (both call sites
  // pass true, so one shared config suffices; first mount wins the toolbar DOM).
  // config.persistent (opt-in) gives each field in this call its OWN bar docked
  // permanently above it — always visible, never hidden on blur — instead of the
  // shared focus-attached bar the note fields use.
  function mount(textareas, config) {
    if (typeof document === "undefined") return;
    if (config && typeof config.headings === "boolean") _config.headings = config.headings;
    var persistent = !!(config && config.persistent);
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
        input: onFieldInput,
      };
      ta.addEventListener("focusin", listeners.focusin);
      ta.addEventListener("focusout", listeners.focusout);
      ta.addEventListener("keydown", listeners.keydown);
      ta.addEventListener("input", listeners.input);
      _bound.set(ta, listeners);
      _registered.add(ta);
      // Begin per-field undo tracking (covers the shared note fields AND a
      // persistent export editor — both register through here).
      if (window.TextEdit && window.TextEdit.undoTrack) window.TextEdit.undoTrack(ta);
      if (persistent) {
        _persistent.add(ta);
        ensurePersistentBar(ta); // dock the always-on bar immediately
        // The always-on bar is visible before any focus, so seed its state now —
        // a fresh history means undo/redo start dimmed rather than promising a
        // step that does not exist.
        refreshButtonState(ta);
      }
    });
    // Selection changes drive active-state; the Ctrl/Cmd+E return path reaches the
    // document while the textarea is hidden. Bind both once, document-wide.
    if (!mount._selBound) {
      document.addEventListener("selectionchange", onSelectionChange);
      document.addEventListener("keydown", onDocKeyDown);
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
        ta.removeEventListener("input", listeners.input);
        _bound.delete(ta);
      }
      if (window.TextEdit && window.TextEdit.undoUntrack) window.TextEdit.undoUntrack(ta);
    });
    _registered.clear();
    // Tear down every dedicated persistent bar too.
    _persistent.forEach(function (ta) {
      var bar = _persistentBars.get(ta);
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
      if (bar) _barField.delete(bar);
      _persistentBars.delete(ta);
    });
    _persistent.clear();
    hideToolbar();
    if (_toolbarEl && _toolbarEl.parentNode) _toolbarEl.parentNode.removeChild(_toolbarEl);
    _toolbarEl = null;
    if (mount._selBound) {
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("keydown", onDocKeyDown);
      mount._selBound = false;
    }
  }

  return {
    mount: mount,
    unmount: unmount,
    refreshButtonState: refreshButtonState,
    resetPreview: resetPreview,
  };
})();
