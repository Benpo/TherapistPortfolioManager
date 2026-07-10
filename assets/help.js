// help.js — renders the offline help center (help.html) from the content model.
//
// The page shell (help.html) ships EMPTY rail/content containers; this module
// builds the entire hybrid A+C IA from window.HELP_CONTENT_EN (Plan 01):
//   - a sticky, unnumbered rail grouped "The session loop" / "The technical
//     bits" with a divider; each rail item expands its topic sub-list in place
//     (D-03); clicking a rail item scrolls to AND opens its card.
//   - collapsed cards, featured personalization card open at the top (D-04);
//     multiple cards stay open (D-02).
//   - client-side substring search that live-filters cards + rail items, hides
//     empty rail groups + divider + tech-band, and shows a calm "write to us"
//     no-match state — never a dead end (D-06).
//   - deep-link arrival (help.html#<id>) auto-expands the owning card and
//     scrolls to it (D-11); scroll-spy highlights the active section.
//   - computer-only install glyphs (Chrome/Edge + macOS Safari), inline SVG
//     only (D-14/D-15).
//
// Live-label interpolation (D-23): every {ui:key} token in the help body is
// resolved to the CURRENT live i18n label via App.t(), so a Hebrew UI shows
// Hebrew button names under the EN help text; re-rendered on app:language.
//
// Security (T-39-06 / T-39-07): ALL dynamic text is built with
// createElement + textContent — never innerHTML with interpolated strings. The
// ONLY innerHTML is the compile-time-literal inline SVG glyphs/chevrons below.

(function () {
  "use strict";

  // ── compile-time-literal inline SVG (the ONLY innerHTML in this module) ────
  var SVG_CHEVRON = '<svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var SVG_RAIL_CHEVRON = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  // Install-step chrome glyphs (computer-only, D-14). Keyed by the content
  // model's {type:'glyph', name} nodes. No screenshots — line glyphs only.
  var GLYPHS = {
    // Chrome/Edge address-bar install icon: a monitor with a downward arrow.
    "install-chrome":
      '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">' +
      '<rect x="6" y="8" width="28" height="19" rx="2.5" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M14 34h12M20 27v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M20 12v8m0 0l-3.5-3.5M20 20l3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>',
    // macOS Safari "Add to Dock": an upward share arrow over a tray/dock.
    "install-safari":
      '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">' +
      '<path d="M20 6v16m0-16l-4.5 4.5M20 6l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M12 17H9a2 2 0 00-2 2v12a2 2 0 002 2h22a2 2 0 002-2V19a2 2 0 00-2-2h-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '</svg>'
  };

  // Group eyebrow + spine chrome labels resolve through the localized
  // help.chrome.* keys (Plan 07) via t(), re-rendered live on app:language —
  // a Hebrew user sees Hebrew chrome (BLOCKER 3). No hardcoded English here.

  var CONTACT_MAILTO = "mailto:contact@sessionsgarden.app";

  // module state (rebuilt each render)
  var railGroups = [];   // [{ label, items:[railItem] }]
  var railDivider = null;
  var techBand = null;
  var featuredId = null;
  var spyObserver = null;
  var _searchWired = false;
  var _langWired = false;
  // Per-section EN-fallback marker (D-16): section id → true when that section
  // rendered its EN counterpart because the active NON-EN locale had no entry for
  // it. Recomputed by localeSections() on every render; help.css keys the
  // [dir=rtl]→LTR override off the resulting .is-en-fallback card class so a
  // fallback body reads LTR while native-locale bodies read RTL (BLOCKER 2).
  var _fallbackIds = {};

  // ── tiny DOM helpers ───────────────────────────────────────────────────────
  function t(key) {
    return (window.App && typeof App.t === "function") ? App.t(key) : key;
  }
  function lang() {
    return (window.App && typeof App.getLanguage === "function")
      ? String(App.getLanguage() || "en")
      : "en";
  }

  // ── locale-merged sections (D-16 EN-fallback; mirrors changelog.js
  //    localeEntries() but keyed on section `id` instead of `version`) ──────────
  // EN is the canonical, always-complete, ordered array. For the active locale,
  // each EN section is replaced by its same-id localized counterpart when present;
  // otherwise it stays EN. A whole-missing locale → all EN. Side effect: rebuilds
  // _fallbackIds so buildCard() can mark EN-fallback cards for the RTL css re-key.
  function localeSections() {
    var en = window.HELP_CONTENT_EN || [];
    var lg = lang();
    var isNonEn = String(lg).toLowerCase() !== "en";
    var loc = window["HELP_CONTENT_" + String(lg).toUpperCase()];
    _fallbackIds = {};
    if (!Array.isArray(loc)) {
      // whole locale missing → all EN. Under a non-EN (RTL) page every rendered
      // section is EN-fallback prose and must read LTR; under EN the marker is moot.
      if (isNonEn) {
        en.forEach(function (s) { if (s && s.id) _fallbackIds[s.id] = true; });
      }
      return en;
    }
    return en.map(function (base) {
      var match = loc.filter(function (s) { return s && s.id === base.id; })[0];
      if (!match && isNonEn && base && base.id) _fallbackIds[base.id] = true;
      return match || base;                                // per-section EN fallback
    });
  }
  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }
  function textNode(s) { return document.createTextNode(s); }

  // Resolve every {ui:key} token to its live i18n label (D-23). Returns a plain
  // string; callers always place it via textContent (never innerHTML).
  function interpolateUiLabels(text) {
    if (text == null) return "";
    return String(text).replace(/\{ui:([^}]+)\}/g, function (_m, key) {
      return t(key.trim());
    });
  }

  // Same resolution as interpolateUiLabels, but returns a DocumentFragment in
  // which each resolved label is wrapped in a .ui-label chip, so the app's
  // real phrasings read as distinct from the surrounding help prose. Built
  // with textNode/createElement only — labels never pass through innerHTML.
  function interpolateUiNodes(text) {
    var frag = document.createDocumentFragment();
    var s = text == null ? "" : String(text);
    var re = /\{ui:([^}]+)\}/g;
    var last = 0;
    var m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) frag.appendChild(textNode(s.slice(last, m.index)));
      var chip = el("span", "ui-label");
      chip.textContent = t(m[1].trim());
      frag.appendChild(chip);
      last = m.index + m[0].length;
    }
    if (last < s.length) frag.appendChild(textNode(s.slice(last)));
    return frag;
  }

  // ── body-block rendering ───────────────────────────────────────────────────
  function renderBlock(block) {
    if (!block || !block.type) return null;
    if (block.type === "p") {
      var p = el("p");
      p.appendChild(interpolateUiNodes(block.text));
      return p;
    }
    if (block.type === "note") {
      var note = el("p", "note");
      note.appendChild(interpolateUiNodes(block.text));
      return note;
    }
    if (block.type === "steps") {
      var ol = el("ol");
      (block.items || []).forEach(function (item) {
        var li = el("li");
        li.appendChild(interpolateUiNodes(item));
        ol.appendChild(li);
      });
      return ol;
    }
    if (block.type === "glyph") {
      var span = el("span", "install-glyph");
      // compile-time-literal SVG only (no user/content-derived markup)
      span.innerHTML = GLYPHS[block.name] || "";
      return span;
    }
    return null;
  }

  // ── card + rail builders ───────────────────────────────────────────────────
  function buildCard(section) {
    var card = el("section", "help-card");
    card.id = section.id;
    if (section.featured) {
      card.classList.add("featured", "is-open");
    }
    // Mark an EN-fallback card so help.css can force ONLY its body/heading LTR
    // under [dir=rtl] (native-locale cards read RTL). Set by localeSections().
    if (section.id && _fallbackIds[section.id]) {
      card.classList.add("is-en-fallback");
    }

    var head = el("button", "card-head");
    head.type = "button";
    head.setAttribute("aria-expanded", section.featured ? "true" : "false");
    var h2 = el("h2");
    h2.textContent = section.title;
    head.appendChild(h2);
    if (section.featured) {
      var tag = el("span", "featured-tag");
      tag.textContent = t("help.chrome.startHere");
      head.appendChild(tag);
    }
    var chev = el("span", "chev");
    chev.innerHTML = SVG_CHEVRON; // literal SVG
    head.appendChild(chev);
    card.appendChild(head);

    var body = el("div", "card-body");
    (section.topics || []).forEach(function (topic) {
      var h3 = el("h3");
      h3.id = topic.id;
      h3.textContent = topic.title;
      body.appendChild(h3);
      (topic.body || []).forEach(function (block) {
        var node = renderBlock(block);
        if (node) body.appendChild(node);
      });
    });
    card.appendChild(body);

    head.addEventListener("click", function () {
      setOpen(card, !card.classList.contains("is-open"));
    });
    return card;
  }

  function buildRailItem(section) {
    var item = el("div", "rail-item");
    item.setAttribute("data-target", section.id);
    if (section.featured) item.classList.add("is-featured");

    var row = el("div", "rail-row");
    var link = el("button", "rail-link");
    link.type = "button";
    link.textContent = section.title;
    var toggle = el("button", "rail-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-label", t("help.chrome.ariaShowTopics"));
    toggle.innerHTML = SVG_RAIL_CHEVRON; // literal SVG
    row.appendChild(link);
    row.appendChild(toggle);
    item.appendChild(row);

    var sub = el("div", "rail-sub");
    (section.topics || []).forEach(function (topic) {
      var a = el("a");
      a.href = "#" + topic.id;
      a.textContent = topic.title;
      a.addEventListener("click", function () { openForHash(a.getAttribute("href")); });
      sub.appendChild(a);
    });
    item.appendChild(sub);

    // rail label → scroll to card AND open it
    link.addEventListener("click", function () {
      var card = document.getElementById(section.id);
      if (!card) return;
      setOpen(card, true);
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    // chevron → expand the sub-list in place only (no page jump)
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      item.classList.toggle("is-expanded");
    });
    return item;
  }

  // ── open/close (multiple may stay open) ─────────────────────────────────────
  function setOpen(card, open) {
    if (!card) return;
    card.classList.toggle("is-open", !!open);
    var head = card.querySelector(".card-head");
    if (head) head.setAttribute("aria-expanded", String(!!open));
  }

  // ── deep-link / anchor arrival ──────────────────────────────────────────────
  function openForHash(hash) {
    if (!hash) return;
    var id = String(hash).replace(/^#/, "");
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    var card = target.closest ? target.closest(".help-card") : null;
    if (card) setOpen(card, true);
    setTimeout(function () {
      if (typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ block: "start" });
      }
    }, 50);
  }

  // ── search (client-side substring, D-06) ────────────────────────────────────
  function buildSearchEmpty() {
    var box = document.getElementById("searchEmpty");
    if (!box) return;
    while (box.firstChild) box.removeChild(box.firstChild);

    var msg = el("p");
    msg.appendChild(textNode(t("help.search.noMatch")));
    msg.appendChild(textNode(" "));
    var link = el("a");
    link.href = CONTACT_MAILTO;
    link.textContent = t("help.search.writeToUs");
    msg.appendChild(link);
    msg.appendChild(textNode("."));
    box.appendChild(msg);

    // Echo the searched term — set via textContent by applySearch, so an
    // <img onerror> term is inert text and never a live element (T-39-06).
    var echo = el("p", "search-echo");
    echo.appendChild(textNode("“"));
    var term = el("span");
    term.id = "searchTerm";
    echo.appendChild(term);
    echo.appendChild(textNode("”"));
    box.appendChild(echo);
  }

  function applySearch(rawValue) {
    var raw = (rawValue == null ? "" : String(rawValue)).trim();
    var q = raw.toLowerCase();
    document.body.classList.toggle("searching", !!q);

    var cards = Array.prototype.slice.call(document.querySelectorAll(".help-card"));
    var hits = 0;
    cards.forEach(function (card) {
      if (!q) {
        card.style.display = "";
        setOpen(card, card.id === featuredId);
        return;
      }
      var match = card.textContent.toLowerCase().indexOf(q) !== -1;
      card.style.display = match ? "" : "none";
      if (match) { setOpen(card, true); hits++; }
    });

    var railItems = [];
    railGroups.forEach(function (g) { railItems = railItems.concat(g.items); });
    railItems.forEach(function (item) {
      if (!q) { item.style.display = ""; return; }
      var card = document.getElementById(item.getAttribute("data-target"));
      item.style.display = (card && card.style.display !== "none") ? "" : "none";
    });

    // hide a rail group's eyebrow label when none of its items survived
    railGroups.forEach(function (g) {
      var any = g.items.some(function (i) { return i.style.display !== "none"; });
      g.label.style.display = (!q || any) ? "" : "none";
    });
    if (railDivider) {
      var bothGroups = railGroups.every(function (g) { return g.label.style.display !== "none"; });
      railDivider.style.display = (!q || bothGroups) ? "" : "none";
    }
    if (techBand) {
      var anyTech = techBand.querySelector('.help-card:not([style*="none"])');
      techBand.style.display = (!q || anyTech) ? "" : "none";
    }

    var box = document.getElementById("searchEmpty");
    if (box) {
      var show = !!q && hits === 0;
      box.style.display = show ? "block" : "";
      var term = document.getElementById("searchTerm");
      if (term) term.textContent = raw; // textContent — never innerHTML
    }
  }

  // ── scroll-spy ──────────────────────────────────────────────────────────────
  function wireScrollSpy() {
    if (typeof IntersectionObserver !== "function") return;
    if (spyObserver) { spyObserver.disconnect(); spyObserver = null; }
    var byId = {};
    railGroups.forEach(function (g) {
      g.items.forEach(function (i) { byId[i.getAttribute("data-target")] = i; });
    });
    spyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var actives = document.querySelectorAll(".rail-item.is-active");
        Array.prototype.forEach.call(actives, function (i) { i.classList.remove("is-active"); });
        var item = byId[en.target.id];
        if (item) item.classList.add("is-active");
      });
    }, { rootMargin: "-10% 0px -70% 0px" });
    document.querySelectorAll(".help-card").forEach(function (c) { spyObserver.observe(c); });
  }

  // ── render entry point ──────────────────────────────────────────────────────
  function render() {
    var sections = localeSections();
    if (!Array.isArray(sections)) return;

    var featured = sections.filter(function (s) { return s.featured; });
    var sessionLoop = sections.filter(function (s) { return s.group === "session-loop" && !s.featured; });
    var technical = sections.filter(function (s) { return s.group === "technical"; });
    featuredId = featured.length ? featured[0].id : null;

    // page-head title + search placeholders (live labels)
    var title = document.getElementById("helpTitle");
    if (title) title.textContent = t("help.page.title");
    ["searchDesk", "searchMob"].forEach(function (id) {
      var input = document.getElementById(id);
      if (input) {
        input.placeholder = t("help.search.placeholder");
        // aria-label is an attribute applyTranslations can't reach — set it here
        // so it flips live on language switch alongside the placeholder.
        input.setAttribute("aria-label", t("help.chrome.ariaSearch"));
      }
    });
    // static-shell aria-labels (attributes; set in render() so they flip live)
    var railNav = document.getElementById("rail");
    if (railNav) railNav.setAttribute("aria-label", t("help.chrome.ariaSections"));
    var jumpNavEl = document.getElementById("jumpNav");
    if (jumpNavEl) jumpNavEl.setAttribute("aria-label", t("help.chrome.jumpToSection"));

    // ── rail ──
    var railBody = document.getElementById("railBody");
    railGroups = [];
    railDivider = null;
    if (railBody) {
      while (railBody.firstChild) railBody.removeChild(railBody.firstChild);

      var loopLabel = el("div", "rail-group-label");
      loopLabel.textContent = t("help.chrome.sessionLoop");
      railBody.appendChild(loopLabel);
      var loopGroup = { label: loopLabel, items: [] };
      featured.concat(sessionLoop).forEach(function (section) {
        var item = buildRailItem(section);
        loopGroup.items.push(item);
        railBody.appendChild(item);
      });
      railGroups.push(loopGroup);

      railDivider = el("hr", "rail-divider");
      railBody.appendChild(railDivider);

      var techLabel = el("div", "rail-group-label");
      techLabel.textContent = t("help.chrome.technicalBits");
      railBody.appendChild(techLabel);
      var techGroup = { label: techLabel, items: [] };
      technical.forEach(function (section) {
        var item = buildRailItem(section);
        techGroup.items.push(item);
        railBody.appendChild(item);
      });
      railGroups.push(techGroup);
    }

    // ── cards ──
    var host = document.getElementById("helpCards");
    techBand = null;
    if (host) {
      while (host.firstChild) host.removeChild(host.firstChild);

      featured.forEach(function (section) { host.appendChild(buildCard(section)); });

      var spine = el("div", "spine-group-label");
      spine.textContent = t("help.chrome.spine");
      host.appendChild(spine);

      sessionLoop.forEach(function (section) { host.appendChild(buildCard(section)); });

      techBand = el("div", "tech-band");
      techBand.setAttribute("aria-label", t("help.chrome.technicalBits"));
      var techBandLabel = el("div", "tech-band-label");
      techBandLabel.textContent = t("help.chrome.techBand");
      techBand.appendChild(techBandLabel);
      technical.forEach(function (section) { techBand.appendChild(buildCard(section)); });
      host.appendChild(techBand);
    }

    // ── mobile jump-strip nav ──
    var jumpNav = document.getElementById("jumpNav");
    if (jumpNav) {
      while (jumpNav.firstChild) jumpNav.removeChild(jumpNav.firstChild);
      sections.forEach(function (section) {
        var a = el("a");
        a.href = "#" + section.id;
        a.textContent = section.title;
        a.addEventListener("click", function () { openForHash(a.getAttribute("href")); });
        jumpNav.appendChild(a);
      });
    }

    buildSearchEmpty();

    // wire the search inputs once (they are static shell, not rebuilt)
    if (!_searchWired) {
      ["searchDesk", "searchMob"].forEach(function (id) {
        var input = document.getElementById(id);
        if (input) {
          input.addEventListener("input", function () { applySearch(input.value); });
        }
      });
      _searchWired = true;
    }

    wireScrollSpy();
    openForHash(typeof location !== "undefined" ? location.hash : "");

    // re-render on language switch so {ui:key} labels + chrome flip live.
    // Re-apply any active search afterwards — render() rebuilds the cards
    // un-filtered, which would otherwise strand a stale no-match box and
    // body.searching state on top of the fresh content (WR-01).
    if (!_langWired) {
      document.addEventListener("app:language", function () {
        render();
        var desk = document.getElementById("searchDesk");
        var mob = document.getElementById("searchMob");
        applySearch((desk && desk.value) || (mob && mob.value) || "");
      });
      _langWired = true;
    }
  }

  // ── boot ────────────────────────────────────────────────────────────────────
  function boot() {
    if (window.App && typeof App.initCommon === "function") {
      Promise.resolve(App.initCommon()).then(render, render);
    } else {
      render();
    }
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }

  // Test seam (tests/39-help-render.test.js) — drive the renderer against a
  // built DOM without the full async boot.
  window.Help = {
    render: render,
    applySearch: applySearch,
    openForHash: openForHash,
    interpolateUiLabels: interpolateUiLabels,
    setOpen: setOpen
  };
})();
