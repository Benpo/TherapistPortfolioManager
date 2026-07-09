// changelog.js — renders the standalone changelog page (changelog.html) from the
// single structured data source (Phase 42, CHLG-02; D-11/D-16).
//
// RESPONSIBILITY: build the full, reverse-chronological release history (sketch
//   005 Variant B) into the EMPTY containers changelog.html ships — one card per
//   release, version+date heading, one-sentence lede, then New / Improved / Fixed
//   category blocks. It reads window.CHANGELOG_CONTENT_EN (Plan 04) — never
//   hardcoded copy, never git, never the SW/INTEGRITY_TOKEN layer.
// COLLABORATORS: window.CHANGELOG_CONTENT_<LANG> (locale data), App.t()
//   (New/Improved/Fixed + page-chrome labels), App.getLanguage() (locale select),
//   App.initCommon() (boot), the `app:language` event (live re-render).
// CONTRACT: exposes window.Changelog = { render, localeEntries } (mirrors
//   window.Help). render() is idempotent — it clears and rebuilds #changelogEntries.
// EN-FALLBACK (D-16): a whole missing locale → all EN; a locale present but
//   missing an entry version → that entry falls back to its EN counterpart, so the
//   history is always complete in every locale.
//
// Security (mirrors help.js:22-24 trust boundary): ALL dynamic text is built with
// createElement + textContent — never innerHTML with interpolated strings. This
// module ships NO innerHTML at all (the page is text-led; no SVG glyphs).

(function () {
  "use strict";

  // Fixed render order for category blocks (empty/absent categories omitted).
  var CATEGORY_ORDER = ["new", "improved", "fixed"];

  // ── tiny DOM helpers (same idiom as help.js) ────────────────────────────────
  function t(key) {
    return (window.App && typeof App.t === "function") ? App.t(key) : key;
  }
  function lang() {
    return (window.App && typeof App.getLanguage === "function")
      ? String(App.getLanguage() || "en")
      : "en";
  }
  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  // Display the release as "Version 1.3" (drop a trailing ".0" patch for calm
  // house-style; keeps a real patch, e.g. "1.2.4", intact).
  function versionLabel(version) {
    return "Version " + String(version == null ? "" : version).replace(/\.0$/, "");
  }

  // ── locale-merged entries (D-16 EN-fallback) ────────────────────────────────
  // EN is the canonical, always-complete, reverse-chronological order. For the
  // active locale, each EN entry is replaced by its same-version localized
  // counterpart when present; otherwise it stays EN. A whole-missing locale → EN.
  function localeEntries() {
    var en = window.CHANGELOG_CONTENT_EN || [];
    var loc = window["CHANGELOG_CONTENT_" + lang().toUpperCase()];
    if (!loc || !Array.isArray(loc)) return en;
    return en.map(function (base) {
      var match = loc.filter(function (e) { return e && e.version === base.version; })[0];
      return match || base;
    });
  }

  // ── entry-card builders ─────────────────────────────────────────────────────
  function buildCategoryBlock(cat, items) {
    var block = el("div", "changelog-cat changelog-cat--" + cat);
    block.setAttribute("data-cat", cat);

    var heading = el("h3", "changelog-cat__label");
    heading.textContent = t("changelog.cat." + cat);
    block.appendChild(heading);

    var list = el("ul", "changelog-cat__list");
    items.forEach(function (item) {
      var li = el("li");
      li.textContent = item == null ? "" : String(item);
      list.appendChild(li);
    });
    block.appendChild(list);
    return block;
  }

  function buildEntryCard(entry) {
    var card = el("article", "changelog-entry");
    card.id = entry.anchor;
    if (entry.origin) card.classList.add("changelog-entry--origin");

    var head = el("div", "changelog-entry__head");
    var h2 = el("h2", "changelog-entry__version");
    h2.textContent = versionLabel(entry.version);
    head.appendChild(h2);
    if (entry.date) {
      var date = el("span", "changelog-entry__date");
      date.textContent = String(entry.date);
      head.appendChild(date);
    }
    card.appendChild(head);

    if (entry.lede) {
      var lede = el("p", "changelog-entry__lede");
      lede.textContent = String(entry.lede);
      card.appendChild(lede);
    }

    // Origin marker (v1.0): one-line lede only, NO category blocks (D-01).
    if (entry.origin) return card;

    var categories = entry.categories || {};
    CATEGORY_ORDER.forEach(function (cat) {
      var items = categories[cat];
      // Empty / absent categories are OMITTED entirely (D-11).
      if (Array.isArray(items) && items.length > 0) {
        card.appendChild(buildCategoryBlock(cat, items));
      }
    });
    return card;
  }

  // ── render entry point ──────────────────────────────────────────────────────
  function render() {
    var entries = localeEntries();
    if (!Array.isArray(entries)) entries = [];

    // page-head chrome (live i18n labels; help.js:358-364 idiom)
    var title = document.getElementById("changelogTitle");
    if (title) title.textContent = t("changelog.page.title");
    var intro = document.getElementById("changelogIntro");
    if (intro) intro.textContent = t("changelog.page.intro");

    var host = document.getElementById("changelogEntries");
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);

    entries.forEach(function (entry) {
      if (entry && entry.anchor) host.appendChild(buildEntryCard(entry));
    });
  }

  // ── boot ────────────────────────────────────────────────────────────────────
  var _langWired = false;
  function wireLanguage() {
    if (_langWired) return;
    document.addEventListener("app:language", render);
    _langWired = true;
  }

  // #changelogEntries ships EMPTY and is only populated after the async boot
  // resolves, so the browser's native scroll-to-fragment runs before the anchor
  // ids exist. Re-apply the hash ONCE after the first render lands (deep-links
  // like changelog.html#v1-1 would otherwise strand at the top of the page).
  // Runs only on boot — app:language re-renders go through render() directly.
  function scrollToFragment() {
    try {
      if (!window.location.hash) return;
      var target = document.getElementById(window.location.hash.slice(1));
      if (target) target.scrollIntoView();
    } catch (e) {}
  }

  function bootRender() {
    render();
    scrollToFragment();
  }

  function boot() {
    wireLanguage();
    if (window.App && typeof App.initCommon === "function") {
      Promise.resolve(App.initCommon()).then(bootRender, bootRender);
    } else {
      bootRender();
    }
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }

  // Test seam (tests/42-changelog-render.test.js) — drive the renderer against a
  // built DOM without the full async boot (mirrors window.Help).
  window.Changelog = {
    render: render,
    localeEntries: localeEntries
  };
})();
