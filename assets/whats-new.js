// whats-new.js — the once-per-version "What's new" announcement popup (Phase 42,
// Plan 05; CHLG-01). A self-registering AttentionCoordinator surface.
//
// WHAT THIS IS (four-slot responsibility banner — Phase 31 idiom):
//   1. GATE      — eligible(): show at most once per version. True iff the
//                  running APP_VERSION differs from the recorded last-seen
//                  version AND a changelog entry exists for APP_VERSION. First-
//                  ever launch is suppressed for free: the welcome overlay sits
//                  ABOVE 'whats-new' in PRECEDENCE and its dismiss subsume-writes
//                  sg.whatsNewLastSeenVersion (attention-coordinator.js:227-231),
//                  so a brand-new user never sees a redundant popup (D-05/CHLG-01).
//   2. RECONCILE — a version with NO entry silently skips the popup AND advances
//                  the last-seen pointer at eval time, so the NEXT real release is
//                  never suppressed by an intermediate entry-less version (D-07).
//   3. SHOW      — show(): a MODEST centered modal (role=dialog, aria-modal,
//                  aria-labelledby) rendering the current entry's 2-4 highlights
//                  as a teaser, with one primary "See everything new" deep-link
//                  and a quiet Close (D-05). Full-screen weight stays unique to
//                  the welcome overlay (D-06). All text via createElement +
//                  textContent — the popup's only trust boundary (T-42-01).
//   4. DISMISS   — one helper for Close, Escape, and "See everything new": each
//                  removes the overlay, restores focus to the opener, unlocks
//                  scroll, and records last-seen=APP_VERSION. Backdrop / outside
//                  clicks are a deliberate NO-OP (D-09) — there is no overlay
//                  click handler at all.
//
// STORAGE: reuses the EXACT existing key 'sg.whatsNewLastSeenVersion'
//   (attention-coordinator.js:51) — no new key is invented. Version is read ONLY
//   from window.AppVersion.APP_VERSION (version.js:27) — never the SW / integrity
//   token or a second constant (T-42-06). Reads window.CHANGELOG_CONTENT_EN
//   (assets/changelog-content-en.js, Plan 04) for the entries.
//
// Zero dependencies, zero network, no new globals. Registration is self-contained
// here — attention-coordinator.js already reserves the 'whats-new' PRECEDENCE slot.

(function () {
  "use strict";

  // The ONE storage key — identical string to attention-coordinator.js:51.
  var WHATS_NEW_LAST_SEEN = 'sg.whatsNewLastSeenVersion';

  // ── storage helpers (try/catch — private-mode / quota safe; coordinator idiom) ─
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }

  // ── i18n resolution (coordinator idiom; the popup mounts dynamically after
  //    App.applyTranslations has already walked the static DOM, so it resolves
  //    copy itself from the raw window.I18N dict). tf() falls back to a calm
  //    English default when a key is missing (the whatsNew.* keys land in Plan 08;
  //    this surface must render sensibly whether or not they exist yet). ───────────
  function t(key) {
    try {
      var lang = lsGet('portfolioLang') || window.I18N_DEFAULT || 'en';
      var dict = (window.I18N && (window.I18N[lang] || window.I18N.en)) || {};
      return (dict[key] != null) ? dict[key] : key;
    } catch (e) { return key; }
  }
  function tf(key, fallback) {
    var v = t(key);
    return (v != null && v !== '' && v !== key) ? v : fallback;
  }

  // ── version + entry lookup ─────────────────────────────────────────────────────
  function appVersion() {
    try { return (window.AppVersion && window.AppVersion.APP_VERSION) || null; }
    catch (e) { return null; }
  }
  // Major.minor of the running version, for the headline interpolation ({X.Y}).
  function majorMinor(v) {
    var m = /^(\d+)\.(\d+)/.exec(v || '');
    return m ? (m[1] + '.' + m[2]) : (v || '');
  }
  // Locale-aware with per-entry EN fallback (mirrors changelog.js localeEntries(),
  // keyed on version). EN is the canonical, always-complete base; when a locale
  // array exists each EN entry is swapped for its same-version localized
  // counterpart when present, else stays EN. Resolve lang the way t() does
  // (portfolioLang → I18N_DEFAULT → 'en'). Closes Pitfall 1: a Hebrew user on any
  // page the popup fires on now sees native highlights (given the page loaded the
  // CHANGELOG_CONTENT_<LANG> sibling — Task 3).
  // EN-fallback marker (WR-02; mirrors help.js _fallbackIds / BLOCKER 2): an
  // entry that stayed EN under a NON-EN locale is flagged `_enFallback` on a
  // SHALLOW COPY (never mutate the shared CHANGELOG_CONTENT_EN objects), so
  // show() can force the popup LTR under an RTL page — English lede/highlights
  // must not render direction:rtl or Latin punctuation scrambles to the wrong
  // edge. Native-locale entries pass through unmarked.
  function markEnFallback(b) {
    var copy = {};
    for (var k in b) { if (Object.prototype.hasOwnProperty.call(b, k)) copy[k] = b[k]; }
    copy._enFallback = true;
    return copy;
  }
  function entries() {
    var lang = (lsGet('portfolioLang') || window.I18N_DEFAULT || 'en').toUpperCase();
    var loc = null, en = null;
    try { loc = window['CHANGELOG_CONTENT_' + lang]; } catch (e) {}
    try { en = window.CHANGELOG_CONTENT_EN; } catch (e) {}
    var base = Array.isArray(en) ? en : [];
    if (lang === 'EN') return base;                         // EN itself is never a fallback
    if (!Array.isArray(loc)) {
      // whole locale missing (script 404 / partial deploy / stale SW miss) →
      // every rendered entry is EN prose; mark them all (help.js analog).
      return base.map(markEnFallback);
    }
    return base.map(function (b) {
      var m = loc.filter(function (e) { return e && e.version === b.version; })[0];
      return m || markEnFallback(b);                        // per-entry EN fallback
    });
  }
  function entryFor(v) {
    if (!v) return null;
    var list = entries();
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].version === v) return list[i];
    }
    return null;
  }

  // ── GATE (D-05 / CHLG-01 — once-per-version, entry-present) ─────────────────────
  function eligible() {
    var v = appVersion();
    if (!v) return false;                          // no version → never
    if (lsGet(WHATS_NEW_LAST_SEEN) === v) return false;  // already seen this version
    return !!entryFor(v);                          // only when there's something to announce
  }

  // ── SHOW (modest centered modal; teaser-plus-link — D-05/D-06) ──────────────────
  function show() {
    var v = appVersion();
    var entry = entryFor(v);
    if (!entry) return;                            // defensive — eligible() already gates this

    var doc = document;
    var headlineId = 'whats-new-title';

    // Backdrop (the .whats-new-overlay) — a SEPARATE node from the dialog panel,
    // with NO click handler (backdrop click is a no-op, D-09).
    var overlay = doc.createElement('div');
    overlay.className = 'whats-new-overlay';

    // The dialog panel.
    var popup = doc.createElement('div');
    popup.className = 'whats-new-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-labelledby', headlineId);

    // WR-02 (help's BLOCKER-2 analog): when the rendered entry fell back to EN
    // under an RTL document, mark the panel so app.css flips it LTR
    // (.whats-new-popup.is-en-fallback). Scoped to the fallback case only —
    // native HE popups keep reading RTL.
    try {
      if (entry._enFallback && String(doc.documentElement.dir || '').toLowerCase() === 'rtl') {
        popup.classList.add('is-en-fallback');
      }
    } catch (e) {}

    // Headline — from whatsNew.title with the {X.Y} token interpolated to the
    // running major.minor; falls back to a calm English default (still carrying
    // the version) when the Plan-08 key is not present yet. The version MUST
    // appear in the headline (T-42-V5).
    var mm = majorMinor(v);
    var rawTitle = t('whatsNew.title');
    var titleText;
    if (rawTitle && rawTitle !== 'whatsNew.title' && rawTitle.indexOf('{X.Y}') !== -1) {
      titleText = rawTitle.replace('{X.Y}', mm);
    } else {
      titleText = 'What’s new in version ' + mm;
    }
    var h2 = doc.createElement('h2');
    h2.className = 'whats-new-title';
    h2.id = headlineId;
    h2.textContent = titleText;

    // Subline.
    var sub = doc.createElement('p');
    sub.className = 'whats-new-sub';
    sub.setAttribute('data-i18n', 'whatsNew.sub');
    sub.textContent = tf('whatsNew.sub', 'A quick look at what’s waiting for you.');

    // Highlights — the current entry's 2-4 hand-picked strings, each via
    // createElement + textContent (XSS boundary — NEVER innerHTML with content).
    var list = doc.createElement('ul');
    list.className = 'whats-new-highlights';
    var highlights = (entry && Array.isArray(entry.highlights)) ? entry.highlights : [];
    for (var i = 0; i < highlights.length; i++) {
      var li = doc.createElement('li');
      li.textContent = String(highlights[i]);
      list.appendChild(li);
    }

    // Actions — primary "See everything new" (the single accent element) + quiet
    // Close. Both are the popup's own styled classes (the popup CSS block in
    // app.css styles them directly, mirroring the self-defined .welcome-cta--*).
    var actions = doc.createElement('div');
    actions.className = 'whats-new-actions';

    var seeAll = doc.createElement('button');
    seeAll.className = 'whats-new-seeall';
    seeAll.setAttribute('type', 'button');
    seeAll.setAttribute('data-i18n', 'whatsNew.seeAll');
    seeAll.textContent = tf('whatsNew.seeAll', 'See everything new');

    var close = doc.createElement('button');
    close.className = 'whats-new-close';
    close.setAttribute('type', 'button');
    close.setAttribute('data-i18n', 'whatsNew.close');
    close.textContent = tf('whatsNew.close', 'Close');

    actions.appendChild(seeAll);
    actions.appendChild(close);

    popup.appendChild(h2);
    popup.appendChild(sub);
    popup.appendChild(list);
    popup.appendChild(actions);
    overlay.appendChild(popup);

    // ── dismiss — the single helper for all three deliberate paths (D-09). Each
    //    removes the overlay, restores focus, unlocks scroll, and records the
    //    last-seen version so the popup never reappears until the next change. ──────
    var opener = doc.activeElement;
    function dismiss() {
      try { if (window.App && window.App.unlockBodyScroll) window.App.unlockBodyScroll(); } catch (e) {}
      doc.removeEventListener('keydown', onKeydown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      try { if (opener && typeof opener.focus === 'function') opener.focus(); } catch (e) {}
      var cur = appVersion();
      if (cur) lsSet(WHATS_NEW_LAST_SEEN, cur);
    }

    // Focus trap: aria-modal="true" promises the background is inert, so Tab must
    // cycle between the two controls; Escape dismisses (verbatim idiom from
    // attention-coordinator.js:201-218, adjusted to this surface's two endpoints).
    function onKeydown(e) {
      if (e.key === 'Escape') { dismiss(); return; }
      if (e.key === 'Tab') {
        var active = doc.activeElement;
        if (e.shiftKey) {
          if (active === seeAll || !popup.contains(active)) {
            e.preventDefault();
            try { close.focus(); } catch (err) {}
          }
        } else if (active === close || !popup.contains(active)) {
          e.preventDefault();
          try { seeAll.focus(); } catch (err) {}
        }
      }
    }

    // "See everything new" — records last-seen (via dismiss) BEFORE navigating to
    // the changelog deep-link (changelog.html#{entry anchor}, e.g. #v1-3).
    seeAll.addEventListener('click', function () {
      dismiss();
      try {
        var anchor = (entry && entry.anchor) ? ('#' + entry.anchor) : '';
        window.location.href = 'changelog.html' + anchor;
      } catch (e) {}
    });
    // Close — dismiss in place. Escape — via onKeydown. Backdrop — NO handler (D-09).
    close.addEventListener('click', function () { dismiss(); });
    doc.addEventListener('keydown', onKeydown);

    // Mount: lock scroll, append, move focus into the dialog (the primary CTA) to
    // honor the aria-modal focus contract (T-42-V5).
    try { if (window.App && window.App.lockBodyScroll) window.App.lockBodyScroll(); } catch (e) {}
    doc.body.appendChild(overlay);
    try { seeAll.focus(); } catch (e) {}
  }

  // ── RECONCILE (D-07 silent-skip) — run at eval. If the running version differs
  //    from the recorded last-seen AND there is no entry for it, quietly advance
  //    the pointer so the next real release is not suppressed. Never touches the
  //    pointer when an entry exists (that path is the live popup) or when it is
  //    already current. ────────────────────────────────────────────────────────────
  (function reconcileSilentSkip() {
    var v = appVersion();
    if (!v) return;
    if (lsGet(WHATS_NEW_LAST_SEEN) !== v && !entryFor(v)) {
      lsSet(WHATS_NEW_LAST_SEEN, v);
    }
  })();

  // ── self-register into the pre-reserved 'whats-new' slot (D-01/CHLG-01). Guard on
  //    the coordinator existing so a stray load can never throw. Registration
  //    precedes bootAttentionSurfaces()'s run() (app.js). ──────────────────────────
  try {
    if (window.AttentionCoordinator && window.AttentionCoordinator.register) {
      window.AttentionCoordinator.register({ id: 'whats-new', eligible: eligible, show: show });
    }
  } catch (e) {}
})();
