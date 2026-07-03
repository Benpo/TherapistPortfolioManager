// ────────────────────────────────────────────────────────────────────────
// settings-snippets.js — Snippet Settings UI
//
// Self-contained IIFE that owns the Text Snippets section: prefix input,
// list view, search + tag filter, modal editor (single-lang default with
// "Edit translations" reveal), import/export with collision modal,
// per-row + bulk reset for modified seeds.
//
// Cross-IIFE identifier-resolution chain (its window.* dependencies):
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
   * Search is current-locale only: matches trigger OR expansions[currentLang].
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
    var origin = opts.origin || "all";
    var tagSet = new Set(tags);
    var filtered = cache.filter(function (s) {
      // Origin (All / Mine / Defaults) gate — AND-combined with search + tags.
      var matchOrigin = origin === "all" || s.origin === origin;
      if (!matchOrigin) return false;
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
   * Returns true ONLY for origin='seed' snippets that the user actually EDITED,
   * detected by updatedAt > createdAt (the bump every real edit sets). It does
   * NOT byte-compare against the live seed pack — pack text can drift between app
   * versions while re-seeding is additive-only, so an untouched seed whose pack
   * text changed would be a false positive. Timestamp is the airtight signal.
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
    // "Modified" === the user actually edited this seed, which always bumps updatedAt past
    // createdAt (see handleSave). We deliberately do NOT byte-compare against the live seed
    // pack: pack text can change between app versions while re-seeding is additive-only, so an
    // untouched seed whose pack text drifted would be a false positive (wrong export + wrong
    // Reset-to-default). Timestamp is the airtight signal. See PLAN-02 critical_design_note.
    return !!(snippet.updatedAt && snippet.createdAt && snippet.updatedAt > snippet.createdAt);
  }

  // Expose for unit tests (mirrors Snippets.__testExports at snippets.js:457).
  if (typeof window !== "undefined") {
    window.__SnippetEditorHelpers = {
      isTriggerUnique: isTriggerUnique,
      validateImportPayload: validateImportPayload,
      detectImportCollisions: detectImportCollisions,
      filterSnippetList: filterSnippetList,
      isModifiedSeed: isModifiedSeed,
      isValidTrigger: isValidTrigger,
      hyphenateSpaces: hyphenateSpaces,
      getCrossLangWarning: getCrossLangWarning,
      pendingTagToCommit: pendingTagToCommit,
      commitPendingTag: commitPendingTag,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Constants
  // ──────────────────────────────────────────────────────────────────────

  // Unicode-aware so Hebrew/German/Czech (any Unicode letter) triggers validate,
  // aligned with the detection engine (snippets.js). \p{L}=any letter, \p{N}=any digit.
  var TRIGGER_REGEX = /^[\p{L}\p{N}-]{2,32}$/u;
  var PREFIX_INVALID_CHAR_REGEX = /[a-zA-Z0-9\s"<>]/;

  function isValidTrigger(trigger) {
    return TRIGGER_REGEX.test(String(trigger));
  }

  /**
   * hyphenateSpaces — pure helper that replaces any run of whitespace with a
   * single regular hyphen-minus `-` (U+002D), the ONLY dash TRIGGER_REGEX
   * accepts. NEVER emits an em-dash (U+2014) or en-dash (U+2013). Lets a user
   * who instinctively types `physical trauma` get a valid `physical-trauma`
   * trigger. Unicode-safe: non-space letters (Hebrew/German/Czech) pass through.
   */
  function hyphenateSpaces(value) {
    return String(value).replace(/\s+/g, "-");
  }

  /**
   * getCrossLangWarning — pure predicate for the editor's cross-language warning.
   * show=true ONLY when the snippet's current-language expansion is empty/whitespace
   * AND ≥1 OTHER locale has non-empty text. otherLangs lists those locales in
   * LOCALES order (he,en,cs,de), excluding currentLang.
   * @param {object|null} snippet
   * @param {string} currentLang
   * @returns {{show:boolean, otherLangs:string[]}}
   */
  function getCrossLangWarning(snippet, currentLang) {
    if (!snippet || !snippet.expansions) return { show: false, otherLangs: [] };
    var cur = String(snippet.expansions[currentLang] || "").trim();
    var others = LOCALES.filter(function (loc) {
      return loc !== currentLang &&
        String((snippet.expansions || {})[loc] || "").trim() !== "";
    });
    return { show: cur === "" && others.length > 0, otherLangs: others };
  }
  var LOCALES = ["he", "en", "cs", "de"];
  var SEARCH_DEBOUNCE_MS = 150;
  var BC_NAME = "sessions-garden-settings";
  var BC_TYPE = "snippets-changed";

  // ──────────────────────────────────────────────────────────────────────
  // Module state
  // ──────────────────────────────────────────────────────────────────────

  var activeTagFilters = new Set();
  var activeOriginFilter = "all";     // 'all' | 'user' | 'seed' (source filter)
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
    var savedEl = $("snippetPrefixSaved");
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
      // Errors take precedence — hide any lingering success indicator.
      if (savedEl) savedEl.classList.add("is-hidden");
    }

    var savedTimer = null;
    function showSaved() {
      if (!savedEl) return;
      savedEl.textContent = t("snippets.prefix.saved");
      savedEl.classList.remove("is-hidden");
      if (savedTimer) clearTimeout(savedTimer);
      savedTimer = setTimeout(function () {
        savedEl.classList.add("is-hidden");
      }, 2500);
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
        // Inline "Prefix saved" beside the input — can't be missed
        // (the bottom toast was too easy to miss and used the misleading
        // "Snippet saved" copy from the snippet-CRUD path).
        showSaved();
      } catch (err) {
        // Defensive: setPrefix validates length only, so a local-validation
        // pass should never throw — but hedge against future tightening.
        showError("snippets.prefix.error.invalidChar");
      }
    });

    // Hide stale indicators when the app language changes — their textContent
    // was set via t(messageKey) at validation/save time, so a language switch
    // would otherwise leave them in the previous locale (a stale Hebrew error
    // otherwise remained visible after switching to English).
    document.addEventListener("app:language", function () {
      clearError();
      if (savedEl) savedEl.classList.add("is-hidden");
      if (savedTimer) { clearTimeout(savedTimer); savedTimer = null; }
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

    // Category (tag) filter — title + chips shown only when ≥1 tag exists across the cache.
    var tagFilter = $("snippetTagFilter");
    if (tagFilter) tagFilter.classList.toggle("is-hidden", allTags.size === 0);

    var searchInput = $("snippetSearchInput");
    var searchText = searchInput ? searchInput.value : "";
    var lang = getCurrentLang();
    var filtered = filterSnippetList(cache, {
      searchText: searchText,
      activeTags: Array.from(activeTagFilters),
      currentLang: lang,
      origin: activeOriginFilter,
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

    // List shows the bare trigger only — repeating the prefix on every row
    // is redundant (it's already configured at the top of the page).
    var trig = document.createElement("span");
    trig.className = "snippets-list-trigger";
    trig.textContent = snippet.trigger || "";
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
    editBtn.appendChild(buildIconSvg(EDIT_ICON_PATHS));
    editBtn.addEventListener("click", function () { openEditor(snippet); });
    row.appendChild(editBtn);

    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-button danger";
    delBtn.setAttribute("aria-label", t("snippets.list.delete.aria"));
    delBtn.appendChild(buildIconSvg(TRASH_ICON_PATHS));
    delBtn.addEventListener("click", function () { handleDelete(snippet); });
    row.appendChild(delBtn);

    return row;
  }

  // ──────────────────────────────────────────────────────────────────────
  // SVG icons — stroke-based, cleanCurrentColor-themed, RTL-safe
  // ──────────────────────────────────────────────────────────────────────

  // Feather-style pencil/edit icon: paper + pencil
  var EDIT_ICON_PATHS = [
    "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
    "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  ];
  // Feather-style trash icon: lid + body + two vertical lines
  var TRASH_ICON_PATHS = [
    "M3 6h18",
    "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
    "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    "M10 11v6",
    "M14 11v6",
  ];

  function buildIconSvg(paths) {
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    paths.forEach(function (d) {
      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      svg.appendChild(p);
    });
    return svg;
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
    var tagsTextInput = $("snippetEditorTagsTextInput");
    var tagsSuggestions = $("snippetEditorTagsSuggestions");
    var tagsList = $("snippetEditorTagsList");

    if (!modal || !triggerInput || !activeExpansion) return;

    triggerErr.classList.add("is-hidden");
    triggerErr.textContent = "";

    // Defensive reset of ALL tag-input state — must clear before any
    // per-snippet repopulation. Without it, a tag added to one
    // snippet appeared in the editor when opening a different snippet.
    if (tagsList) {
      while (tagsList.firstChild) tagsList.removeChild(tagsList.firstChild);
    }
    if (tagsTextInput) tagsTextInput.value = "";
    if (tagsSuggestions) {
      tagsSuggestions.classList.add("is-hidden");
      while (tagsSuggestions.firstChild) tagsSuggestions.removeChild(tagsSuggestions.firstChild);
    }

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

    // Translations block — populate but keep hidden by default
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

    // Cross-language warning — only in edit mode, only when the current-language
    // expansion is empty but another language has text (see getCrossLangWarning).
    var warnEl = $("snippetEditorLangWarning");
    var w = editingSnippet
      ? getCrossLangWarning(editingSnippet, lang)
      : { show: false, otherLangs: [] };
    if (warnEl) {
      if (w.show) {
        var curName = t("snippets.lang.name." + lang);
        var names = w.otherLangs.map(function (loc) {
          return t("snippets.lang.name." + loc);
        }).join(", ");
        // textContent (never innerHTML) — names come from i18n but keep the
        // XSS-safe assignment pattern. {current} = current language name,
        // {langs} = comma list of languages that have content.
        warnEl.textContent = String(t("snippets.editor.langWarning") || "")
          .replace("{current}", curName)
          .replace("{langs}", names);
        warnEl.classList.remove("is-hidden");
        translationsToggle.classList.add("is-attention");
      } else {
        warnEl.textContent = "";
        warnEl.classList.add("is-hidden");
        translationsToggle.classList.remove("is-attention");
      }
    }

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

  // pendingTagToCommit — pure normalize + dedupe for the typed-but-uncommitted
  // tag. Returns the tag to append (trimmed + lowercased), or null when blank
  // or already present. Single source of truth for tag normalization, shared by
  // addCurrent (Enter/comma/Tab commit) and commitPendingTag (Save flush).
  function pendingTagToCommit(committedTags, pendingRaw) {
    var raw = String(pendingRaw == null ? "" : pendingRaw).trim().toLowerCase();
    if (!raw) return null;
    var existing = Array.isArray(committedTags) ? committedTags : [];
    return existing.indexOf(raw) >= 0 ? null : raw;
  }

  // commitPendingTag — flush whatever is typed in the tag input into a committed
  // chip, then clear the input. Called on Save so a user who types a tag and
  // clicks Save (without first pressing Enter) does not silently lose it.
  function commitPendingTag() {
    var input = $("snippetEditorTagsTextInput");
    var list = $("snippetEditorTagsList");
    if (!input || !list) return;
    var toAdd = pendingTagToCommit(readEditorTags(), input.value);
    if (toAdd) list.appendChild(buildTagChip(toAdd));
    input.value = "";
  }

  function wireTagChipInput() {
    var input = $("snippetEditorTagsTextInput");
    var list = $("snippetEditorTagsList");
    var suggestions = $("snippetEditorTagsSuggestions");
    if (!input || !list || !suggestions) return;

    function addCurrent() {
      if (!input.value.trim()) return false;
      var toAdd = pendingTagToCommit(readEditorTags(), input.value);
      if (toAdd) list.appendChild(buildTagChip(toAdd));
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

    // Defensive: convert any space that survived paste / programmatic-set into a
    // hyphen-minus BEFORE validation, so a typed space never dead-ends at the
    // format error (the reworded error stays the fallback for other bad input).
    var trigger = hyphenateSpaces(String(triggerInput.value || "")).trim().toLowerCase();
    triggerErr.classList.add("is-hidden");
    triggerErr.textContent = "";

    if (!isValidTrigger(trigger)) {
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

    // Flush a typed-but-uncommitted tag (user typed it and clicked Save without
    // pressing Enter) so it is captured here instead of being silently dropped.
    commitPendingTag();
    var tags = readEditorTags();
    var now = new Date().toISOString();

    var candidate;
    if (editingSnippet) {
      candidate = Object.assign({}, editingSnippet, {
        trigger: trigger,
        expansions: expansions,
        tags: tags,
        // INVARIANT: every seed-EDIT path bumps updatedAt past createdAt. isModifiedSeed
        // (export inclusion + Reset-to-default visibility) relies on this signal; do NOT
        // remove the bump or move it to the DB layer (see PLAN-02 critical_design_note).
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
    // Local wall-clock day (window.DateFormat.todayLocalISO) so a late-evening
    // export isn't stamped with tomorrow's UTC date — same fix class as backup.js.
    a.download = "snippets-" + window.DateFormat.todayLocalISO() + ".json";
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
    pendingImport.collisions.forEach(function (c) {
      var row = document.createElement("div");
      row.className = "snippets-import-collision-row";
      row.setAttribute("data-trigger", c.trigger);
      var label = document.createElement("span");
      label.className = "snippets-import-collision-trigger";
      // Show the bare trigger (matches the main list at buildListRow ~settings.js:1058).
      // The prefix char (e.g. ";") was being bidi-reordered to the end in RTL and
      // looked like a phantom "?" on the trigger.
      label.textContent = c.trigger;
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
  // Source filter (All / Mine / Defaults)
  // ──────────────────────────────────────────────────────────────────────

  function wireOriginFilter() {
    var group = $("snippetOriginFilter");
    if (!group) return;
    var btns = group.querySelectorAll(".snippets-origin-btn");
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          activeOriginFilter = btn.getAttribute("data-origin") || "all";
          for (var j = 0; j < btns.length; j++) {
            var on = btns[j] === btn;
            btns[j].classList.toggle("is-active", on);
            btns[j].setAttribute("aria-pressed", on ? "true" : "false");
          }
          renderSnippetList();
        });
      })(btns[i]);
    }
    var grpLabel = t("snippets.filter.origin.label");
    if (grpLabel) group.setAttribute("aria-label", grpLabel);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Boot
  // ──────────────────────────────────────────────────────────────────────

  function boot() {
    if (booted) return;
    booted = true;

    wirePrefixInput();
    wireTagChipInput();
    wireOriginFilter();

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

    // Live space->hyphen self-correction on the trigger input. The field self-
    // corrects `physical trauma` -> `physical-trauma` as the user types, so a
    // space never reaches the format error. Caret is preserved across the
    // rewrite. Bound once here; the element persists across openEditor calls.
    // Assign to element.value ONLY (never innerHTML) — preserves the no-innerHTML
    // grep gate (settings.js header SECURITY note).
    var triggerInputLive = $("snippetEditorTrigger");
    if (triggerInputLive) {
      triggerInputLive.addEventListener("input", function () {
        var raw = triggerInputLive.value;
        if (!/\s/.test(raw)) return;
        var caret = triggerInputLive.selectionStart;
        var converted = hyphenateSpaces(raw);
        if (converted === raw) return;
        triggerInputLive.value = converted;
        var pos = Math.min(typeof caret === "number" ? caret : converted.length, converted.length);
        try { triggerInputLive.setSelectionRange(pos, pos); } catch (e) { /* unsupported — ignore */ }
      });
    }
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
        if (translationsRevealed) {
          // User acted on the guidance — clear the attention emphasis.
          translationsToggle.classList.remove("is-attention");
        }
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
