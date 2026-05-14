/**
 * snippets.js — Sessions Garden snippet quick-paste engine (Phase 24 Plan 04).
 *
 * Wires `[data-snippets="true"]` textareas with:
 *   - Trigger detection on input: <prefix><trigger><word-boundary> expands inline.
 *   - Caret-anchored autocomplete popover for partial triggers (≤8 candidates).
 *   - Locale fallback chain (active → en → he → de → cs).
 *   - Keyboard nav (ArrowUp/Down, Enter, Esc).
 *
 * Public API (window.Snippets):
 *   - init() — query DOM for [data-snippets="true"] and bind each. Idempotent.
 *   - bindTextarea(el), unbindTextarea(el) — programmatic binding.
 *   - getPrefix(), setPrefix(newPrefix) — runtime prefix configuration.
 *
 * Test-only: window.Snippets.__testExports.{detectTrigger, resolveExpansion}
 *
 * Identifier-resolution note: window.App.getSnippets is accessed via the
 * explicit window. prefix from inside this IIFE — App is defined in a
 * DIFFERENT IIFE (assets/app.js), so the cross-scope reference must go
 * through the window namespace.
 */
window.Snippets = (function () {
  "use strict";

  // ────────────────────────────────────────────────────────────────────
  // Config + state
  // ────────────────────────────────────────────────────────────────────

  const DEFAULT_PREFIX = ";";
  const MAX_TRIGGER_LEN = 32;
  const POPOVER_LIMIT = 8;
  const PREFIX_STORAGE_KEY = "portfolioSnippetPrefix";

  function readStoredPrefix() {
    try {
      if (typeof localStorage === "undefined") return DEFAULT_PREFIX;
      const v = localStorage.getItem(PREFIX_STORAGE_KEY);
      if (typeof v === "string" && v.length >= 1 && v.length <= 2) return v;
    } catch (e) { /* localStorage disabled — fall through */ }
    return DEFAULT_PREFIX;
  }

  let _prefix = readStoredPrefix();
  let _bound = new WeakMap();    // textarea → { listeners }
  let _popoverEl = null;
  let _popoverState = null;      // { textarea, candidates, selectedIndex, start, end }
  let _mirrorEl = null;

  // Properties to clone from textarea onto the caret-mirror div.
  const MIRROR_PROPS = [
    "boxSizing", "width", "height", "overflowX", "overflowY",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "borderStyle",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "fontStyle", "fontVariant", "fontWeight", "fontStretch", "fontSize", "fontSizeAdjust",
    "lineHeight", "fontFamily",
    "textAlign", "textTransform", "textIndent", "textDecoration",
    "letterSpacing", "wordSpacing",
    "tabSize", "MozTabSize",
    "whiteSpace", "wordWrap", "wordBreak",
  ];

  // ────────────────────────────────────────────────────────────────────
  // Pure helpers — exposed via __testExports for tests/24-04-trigger-regex
  // ────────────────────────────────────────────────────────────────────

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * detectTrigger — scans the text immediately before the caret for a snippet
   * trigger pattern. Returns:
   *   - { type: 'match', snippet, start, end, boundary } — active match
   *     (prefix + trigger + word-boundary present); caller should replace
   *     text[start..end] with the resolved expansion.
   *   - { type: 'partial', query, candidates, start, end } — partial match
   *     (prefix + chars but no boundary yet); caller should show the popover.
   *   - null — no match.
   *
   * Regex is anchored, non-greedy, and ReDoS-safe (bounded quantifiers + no
   * nested alternations). See tests/24-04-trigger-regex.test.js scenario H.
   *
   * Case-insensitive at the trigger level: typed `;BETRAYAL ` matches a
   * snippet stored with trigger `betrayal`.
   */
  function detectTrigger(textBeforeCaret, prefix, snippetsByTrigger) {
    if (typeof textBeforeCaret !== "string" || !prefix) return null;
    // Unicode-aware character class so Hebrew/German/Czech tags can trigger
    // the popover too (tags can contain any letter; triggers are still
    // restricted to /^[a-z0-9-]{2,32}$/ at validateSnippetShape time, but
    // the regex must accept any letter the user types so we even GET to the
    // tag-lookup fallback when no exact ASCII trigger matches).
    // \p{L} = any letter, \p{N} = any decimal digit. ReDoS-safe: bounded
    // {1, MAX_TRIGGER_LEN} quantifier; no nested alternations.
    const re = new RegExp(
      "(^|[\\s.,;:!?])" + escapeRegExp(prefix) +
      "([\\p{L}\\p{N}-]{1," + MAX_TRIGGER_LEN + "})([\\s.,;:!?\\n])?$",
      "u"
    );
    const m = textBeforeCaret.match(re);
    if (!m) return null;

    const triggerText = m[2].toLowerCase();
    const hasBoundary = !!m[3];
    const matchStart = m.index + m[1].length;
    const matchEnd = m.index + m[0].length;

    if (hasBoundary) {
      const snippet = snippetsByTrigger.get(triggerText);
      if (!snippet) return null;
      return {
        type: "match",
        start: matchStart,
        end: matchEnd - m[3].length, // exclude boundary
        boundary: m[3],
        snippet: snippet,
      };
    }

    const candidates = [];
    for (const [trigger, snippet] of snippetsByTrigger) {
      if (trigger.startsWith(triggerText)) candidates.push(snippet);
    }

    // Phase 24 Plan 05 — Tag-trigger MVP. When no trigger prefix-matches the
    // query, fall back to tag prefix-match: return all snippets whose tags
    // include a tag starting with the query. Lets the user type ;<tagname>
    // to surface a curated subset of snippets in the popover.
    let matchedTag = null;
    if (candidates.length === 0) {
      const seen = new Set();
      for (const snippet of snippetsByTrigger.values()) {
        if (!snippet || !Array.isArray(snippet.tags)) continue;
        for (let i = 0; i < snippet.tags.length; i++) {
          const tag = String(snippet.tags[i] || "").toLowerCase();
          if (tag.startsWith(triggerText)) {
            if (!seen.has(snippet.id)) {
              seen.add(snippet.id);
              candidates.push(snippet);
            }
            if (matchedTag === null) matchedTag = tag;
            break;
          }
        }
      }
    }

    candidates.sort(function (a, b) { return a.trigger.localeCompare(b.trigger); });
    return {
      type: "partial",
      start: matchStart,
      end: matchEnd,
      query: triggerText,
      matchedTag: matchedTag,
      candidates: candidates.slice(0, POPOVER_LIMIT),
    };
  }

  /**
   * resolveExpansion — walks the locale fallback chain
   * (active → en → he → de → cs, deduplicated) and returns the first
   * non-empty expansion. Returns "" if all locales are empty.
   */
  function resolveExpansion(snippet, activeLang) {
    if (!snippet || !snippet.expansions) return "";
    const chain = [activeLang, "en", "he", "de", "cs"];
    const seen = new Set();
    for (let i = 0; i < chain.length; i++) {
      const lang = chain[i];
      if (seen.has(lang)) continue;
      seen.add(lang);
      const text = snippet.expansions[lang];
      if (text && text.length > 0) return text;
    }
    return "";
  }

  // ────────────────────────────────────────────────────────────────────
  // Snippet cache access
  // ────────────────────────────────────────────────────────────────────

  function getSnippetMap() {
    const App = (typeof window !== "undefined" && window.App) || null;
    if (App && typeof App.getSnippets === "function") {
      const list = App.getSnippets() || [];
      const m = new Map();
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        if (s && typeof s.trigger === "string") {
          m.set(s.trigger.toLowerCase(), s);
        }
      }
      return m;
    }
    return new Map();
  }

  function getActiveLang() {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("portfolioLang");
      if (stored) return stored;
    }
    return "en";
  }

  // ────────────────────────────────────────────────────────────────────
  // Caret-mirror positioning
  // ────────────────────────────────────────────────────────────────────

  function ensureMirror() {
    if (_mirrorEl) return _mirrorEl;
    _mirrorEl = document.createElement("div");
    _mirrorEl.setAttribute("aria-hidden", "true");
    const s = _mirrorEl.style;
    s.position = "absolute";
    s.visibility = "hidden";
    s.top = "0";
    s.left = "0";
    s.pointerEvents = "none";
    s.whiteSpace = "pre-wrap";
    s.wordWrap = "break-word";
    document.body.appendChild(_mirrorEl);
    return _mirrorEl;
  }

  /**
   * getCaretCoords — uses a hidden mirror div that clones the textarea's
   * typography + content up to caret + a final span. The span's bounding
   * rect yields the caret pixel coordinates.
   */
  function getCaretCoords(textarea) {
    const mirror = ensureMirror();
    const styles = window.getComputedStyle(textarea);
    for (let i = 0; i < MIRROR_PROPS.length; i++) {
      const p = MIRROR_PROPS[i];
      mirror.style[p] = styles[p];
    }
    // Position the mirror to overlap the textarea exactly.
    const rect = textarea.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    mirror.style.top = (rect.top + scrollY) + "px";
    mirror.style.left = (rect.left + scrollX) + "px";

    const caret = textarea.selectionStart || 0;
    const before = textarea.value.slice(0, caret);

    // textContent + a span at the caret position.
    mirror.textContent = before;
    const span = document.createElement("span");
    span.textContent = "​"; // zero-width to give the span a measurable rect
    mirror.appendChild(span);

    const spanRect = span.getBoundingClientRect();
    // Account for textarea scroll offset.
    const x = spanRect.left - textarea.scrollLeft;
    const y = spanRect.top - textarea.scrollTop;
    const lineHeight = parseFloat(styles.lineHeight) || (parseFloat(styles.fontSize) * 1.2);

    return { x: x, y: y, lineHeight: lineHeight };
  }

  // ────────────────────────────────────────────────────────────────────
  // Popover
  // ────────────────────────────────────────────────────────────────────

  function ensurePopover() {
    if (_popoverEl) return _popoverEl;
    _popoverEl = document.createElement("div");
    _popoverEl.className = "snippets-popover is-hidden";
    _popoverEl.setAttribute("role", "listbox");
    _popoverEl.setAttribute("aria-label", "Snippet suggestions");
    document.body.appendChild(_popoverEl);
    return _popoverEl;
  }

  function renderPopover() {
    const pop = ensurePopover();
    pop.innerHTML = "";
    if (!_popoverState || _popoverState.candidates.length === 0) {
      const empty = document.createElement("div");
      empty.className = "snippets-popover__empty";
      empty.textContent = "—";
      pop.appendChild(empty);
      return;
    }
    const lang = getActiveLang();
    _popoverState.candidates.forEach(function (s, idx) {
      const row = document.createElement("div");
      row.className = "snippets-popover__row" +
        (idx === _popoverState.selectedIndex ? " is-selected" : "");
      row.setAttribute("role", "option");
      row.setAttribute("data-index", String(idx));

      const trig = document.createElement("span");
      trig.className = "snippets-popover__trigger";
      trig.textContent = _prefix + s.trigger;
      row.appendChild(trig);

      const preview = document.createElement("span");
      preview.className = "snippets-popover__preview";
      const exp = resolveExpansion(s, lang) || "";
      preview.textContent = exp.length > 80 ? exp.slice(0, 80) + "…" : exp;
      row.appendChild(preview);

      row.addEventListener("mousedown", function (ev) {
        // mousedown (not click) so we commit BEFORE the textarea loses focus
        ev.preventDefault();
        _popoverState.selectedIndex = idx;
        commitSelected();
      });
      pop.appendChild(row);
    });
  }

  function positionPopover(textarea) {
    const pop = ensurePopover();
    const coords = getCaretCoords(textarea);
    pop.style.position = "fixed";
    pop.style.left = coords.x + "px";
    pop.style.top = (coords.y + coords.lineHeight) + "px";
    // Avoid overflowing the viewport on the right.
    const popRect = pop.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    if (popRect.right > vw - 8) {
      pop.style.left = Math.max(8, vw - popRect.width - 8) + "px";
    }
  }

  function showPopover(textarea, partial) {
    _popoverState = {
      textarea: textarea,
      candidates: partial.candidates,
      selectedIndex: 0,
      start: partial.start,
      end: partial.end,
    };
    renderPopover();
    const pop = ensurePopover();
    pop.classList.remove("is-hidden");
    positionPopover(textarea);
  }

  function hidePopover() {
    if (_popoverEl) _popoverEl.classList.add("is-hidden");
    _popoverState = null;
  }

  function navigatePopover(delta) {
    if (!_popoverState || _popoverState.candidates.length === 0) return;
    const n = _popoverState.candidates.length;
    _popoverState.selectedIndex = (_popoverState.selectedIndex + delta + n) % n;
    renderPopover();
  }

  function commitSelected() {
    if (!_popoverState) return;
    const snippet = _popoverState.candidates[_popoverState.selectedIndex];
    if (!snippet) { hidePopover(); return; }
    insertExpansion(_popoverState.textarea, _popoverState.start, _popoverState.end, snippet, true);
    hidePopover();
  }

  // ────────────────────────────────────────────────────────────────────
  // Text replacement
  // ────────────────────────────────────────────────────────────────────

  function insertExpansion(textarea, start, end, snippet, appendSpace) {
    const expansion = resolveExpansion(snippet, getActiveLang()) || "";
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const insertion = expansion + (appendSpace ? " " : "");
    textarea.value = before + insertion + after;
    const caret = start + insertion.length;
    textarea.setSelectionRange(caret, caret);
    // Dispatch a synthetic input event so listeners (auto-resize, dirty tracking) react.
    try {
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (_) { /* no-op for older browsers */ }
  }

  // ────────────────────────────────────────────────────────────────────
  // Event handlers
  // ────────────────────────────────────────────────────────────────────

  function handleInput(e) {
    const textarea = e.target;
    if (!textarea || textarea.tagName !== "TEXTAREA") return;
    const caret = textarea.selectionStart || 0;
    const before = textarea.value.slice(0, caret);

    const map = getSnippetMap();
    if (map.size === 0) { hidePopover(); return; }

    const result = detectTrigger(before, _prefix, map);
    if (!result) { hidePopover(); return; }

    if (result.type === "match") {
      hidePopover();
      // Replace prefix+trigger (NOT the boundary char) with expansion.
      insertExpansion(textarea, result.start, result.end, result.snippet, false);
      return;
    }
    // type === 'partial' → show popover
    showPopover(textarea, result);
  }

  function handleKeyDown(e) {
    if (!_popoverState) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        navigatePopover(+1);
        break;
      case "ArrowUp":
        e.preventDefault();
        navigatePopover(-1);
        break;
      case "Enter":
      case "Tab":
        e.preventDefault();
        commitSelected();
        break;
      case "Escape":
        e.preventDefault();
        hidePopover();
        break;
      default:
        break;
    }
  }

  function handleBlur() {
    // Delay hide so popover row mousedown can fire first (it preventDefault's blur).
    setTimeout(function () {
      if (_popoverState && document.activeElement !== _popoverState.textarea) {
        hidePopover();
      }
    }, 100);
  }

  // ────────────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────────────

  function bindTextarea(textarea) {
    if (!textarea || textarea.tagName !== "TEXTAREA") return;
    if (_bound.has(textarea)) return;
    const listeners = {
      input: handleInput,
      keydown: handleKeyDown,
      blur: handleBlur,
    };
    textarea.addEventListener("input", listeners.input);
    textarea.addEventListener("keydown", listeners.keydown);
    textarea.addEventListener("blur", listeners.blur);
    _bound.set(textarea, listeners);
  }

  function unbindTextarea(textarea) {
    const listeners = _bound.get(textarea);
    if (!listeners) return;
    textarea.removeEventListener("input", listeners.input);
    textarea.removeEventListener("keydown", listeners.keydown);
    textarea.removeEventListener("blur", listeners.blur);
    _bound.delete(textarea);
  }

  function init() {
    if (typeof document === "undefined") return;
    const nodes = document.querySelectorAll('textarea[data-snippets="true"]');
    for (let i = 0; i < nodes.length; i++) bindTextarea(nodes[i]);
  }

  function getPrefix() { return _prefix; }

  function setPrefix(newPrefix) {
    if (typeof newPrefix !== "string") {
      throw new Error("setPrefix: must be a string");
    }
    if (newPrefix.length < 1 || newPrefix.length > 2) {
      throw new Error("setPrefix: prefix length must be 1 or 2 chars (got " + newPrefix.length + ")");
    }
    _prefix = newPrefix;
    // Persist so the new prefix survives reload. Plan 04 spec required
    // setPrefix to "validate + persist + broadcast" but only validation
    // was originally shipped — caught during Plan 05 UAT.
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(PREFIX_STORAGE_KEY, newPrefix);
      }
    } catch (e) { /* localStorage quota or disabled — runtime still works */ }
  }

  // Cross-tab sync: when another tab writes a new prefix, pick it up here.
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("storage", function (e) {
      if (!e || e.key !== PREFIX_STORAGE_KEY) return;
      if (typeof e.newValue !== "string") return;
      if (e.newValue.length < 1 || e.newValue.length > 2) return;
      _prefix = e.newValue;
    });
  }

  // Auto-init on DOMContentLoaded (idempotent — init() guards via _bound WeakMap).
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", init);
  }

  return {
    init: init,
    bindTextarea: bindTextarea,
    unbindTextarea: unbindTextarea,
    getPrefix: getPrefix,
    setPrefix: setPrefix,
    __testExports: {
      detectTrigger: detectTrigger,
      resolveExpansion: resolveExpansion,
    },
  };
})();
