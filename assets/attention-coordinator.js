/**
 * attention-coordinator.js — the single decision point for first-launch
 * attention surfaces (Phase 40, Plan 02; ONBD-01 / ONBD-02 / ONBD-03).
 *
 * WHY THIS EXISTS
 *   Several surfaces compete to greet a therapist on launch (the first-run
 *   welcome, a future What's-New, the security note, an install nudge, a mobile
 *   expectation hint). Left ungoverned they would stack and overwhelm. This
 *   module is a data-driven precedence registry that shows AT MOST ONE governed
 *   surface per browser session — the first in PRECEDENCE order whose eligible()
 *   returns true (D-01/D-03). The filename is deliberately NOT "onboarding": it
 *   coordinates attention surfaces generally, not just onboarding (D-07).
 *
 * PUBLIC SURFACE (one namespaced global, mirroring assets/version.js — D-06):
 *   window.AttentionCoordinator = { register, run, showWelcome, PRECEDENCE }
 *     register(surface) — surface = { id, eligible(), show() }; stored by id.
 *     run()            — arbitration entry point (initCommon calls it once per
 *                        page load, Plan 04). Demo-off + one-per-session gated.
 *     showWelcome(isReplay) — direct-open path for the welcome overlay. The
 *                        "Replay welcome" row (Plan 04) calls showWelcome(true).
 *     PRECEDENCE       — the five governed ids, in order (D-01).
 *
 * STORAGE KEYS
 *   sessionStorage 'sg.surfaceShownThisSession' — one-per-session marker (D-02).
 *   localStorage   'sg.welcomeSeen'             — welcome one-shot (26-UI-SPEC).
 *   localStorage   'sg.whatsNewLastSeenVersion' — recorded on welcome dismiss;
 *                                                 Phase 42 What's-New reads it.
 *
 * NOT GOVERNED HERE (D-04): the backup reminder banner and the footer integrity
 *   nudge are independent surfaces — the coordinator never registers or gates
 *   them. The version write reads AppVersion.APP_VERSION (the public semver)
 *   only, never the deploy/build integrity hash or the SW cache layer (D-03).
 *
 * Plan 03 registers the 'install-nudge' and 'mobile-hint' surfaces into this
 * file and consumes the captured beforeinstallprompt via _getDeferredPrompt().
 *
 * Zero dependencies, zero network. All copy is set via textContent / data-i18n
 * (never variable-interpolated markup) — the overlay's only trust boundary.
 */
var AttentionCoordinator = (function () {
  'use strict';

  // The five governed surface ids, in precedence order (D-01). 'whats-new' has
  // no registered surface until Phase 42 — run() skips unregistered ids.
  var PRECEDENCE = ['welcome', 'whats-new', 'security-note', 'install-nudge', 'mobile-hint'];

  var SESSION_MARKER = 'sg.surfaceShownThisSession';
  var WELCOME_SEEN = 'sg.welcomeSeen';
  var WHATS_NEW_LAST_SEEN = 'sg.whatsNewLastSeenVersion';

  var registry = {};
  // Stashed beforeinstallprompt event (captured at eval time, consumed by the
  // Plan 03 install-nudge surface via _getDeferredPrompt()).
  var deferredPrompt = null;

  // ── storage helpers (try/catch — private-mode / quota safe, D-03 idiom) ────
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }

  // ── i18n resolution ────────────────────────────────────────────────────────
  // The coordinator mounts overlays dynamically (after App.applyTranslations has
  // already walked the static DOM), so it resolves copy itself from the raw
  // window.I18N dict. Nodes also carry data-i18n so a later language switch can
  // re-translate them through the shared App pipeline.
  function t(key) {
    try {
      var lang = lsGet('portfolioLang') || window.I18N_DEFAULT || 'en';
      var dict = (window.I18N && (window.I18N[lang] || window.I18N.en)) || {};
      return (dict[key] != null) ? dict[key] : key;
    } catch (e) { return key; }
  }

  // ── registry + arbitration ─────────────────────────────────────────────────
  function register(surface) {
    if (surface && surface.id) registry[surface.id] = surface;
  }

  function isDemo() {
    return (typeof window !== 'undefined' && window.name === 'demo-mode');
  }

  /**
   * Show at most one governed surface. Demo-off (D-09) and one-per-session
   * (D-02) gate the whole run. The session marker is claimed ONLY when a surface
   * actually shows, so an ineligible higher-precedence surface never consumes
   * the slot (D-08).
   */
  function run() {
    if (isDemo()) return;                        // D-09
    if (ssGet(SESSION_MARKER) === '1') return;   // D-02 — already shown this session
    for (var i = 0; i < PRECEDENCE.length; i++) {
      var surface = registry[PRECEDENCE[i]];
      if (!surface) continue;                    // unregistered id (e.g. whats-new)
      var ok = false;
      try { ok = !!surface.eligible(); } catch (e) { ok = false; }  // throw → false
      if (!ok) continue;                         // D-08 skip-unrenderable
      ssSet(SESSION_MARKER, '1');                // claim the slot on a real show
      try { surface.show(); } catch (e) {}
      return;
    }
  }

  // ── welcome surface (D-10 / ONBD-01) ───────────────────────────────────────
  function welcomeEligible() { return lsGet(WELCOME_SEEN) !== '1'; }

  function buildCta(tag, modifierClass, key) {
    var el = document.createElement(tag);
    el.className = 'welcome-cta ' + modifierClass;
    el.setAttribute('data-i18n', key);
    el.textContent = t(key);   // resolved copy via textContent (never markup)
    return el;
  }

  /**
   * Mount the Variant-B split welcome overlay (sketch 001 #variant-b). Dismiss
   * (Esc / either CTA) unlocks scroll + removes the node. When NOT a replay it
   * also records sg.welcomeSeen and sg.whatsNewLastSeenVersion (D-03). The
   * replay path (isReplay true) writes none of those keys (Pitfall 5) — and
   * because showWelcome never touches the session marker, replay never re-arms
   * the one-per-session gate either.
   */
  function showWelcome(isReplay) {
    var doc = document;

    var overlay = doc.createElement('div');
    overlay.className = 'welcome-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'welcome-title');

    var panel = doc.createElement('div');
    panel.className = 'welcome-panel';

    // Art-side — decorative botanical, hidden from the a11y tree. Dark mode is
    // handled by the shared .app-botanical-img invert+screen pattern (Phase 11).
    var art = doc.createElement('div');
    art.className = 'welcome-art';
    art.setAttribute('aria-hidden', 'true');
    var img = doc.createElement('img');
    img.className = 'welcome-art-img app-botanical-img';
    img.src = './assets/illustrations/watering-can.png';
    img.alt = '';
    art.appendChild(img);

    // Copy-side — headline, subtitle, two stacked CTAs.
    var copy = doc.createElement('div');
    copy.className = 'welcome-copy';

    var h1 = doc.createElement('h1');
    h1.className = 'welcome-title';
    h1.id = 'welcome-title';
    h1.setAttribute('data-i18n', 'help.welcome.title');
    h1.textContent = t('help.welcome.title');

    var sub = doc.createElement('p');
    sub.className = 'welcome-subtitle';
    sub.setAttribute('data-i18n', 'help.welcome.subtitle');
    sub.textContent = t('help.welcome.subtitle');

    var actions = doc.createElement('div');
    actions.className = 'welcome-actions';
    // Primary CTA — an anchor to ./help.html (interim guided-tour wiring, D-11;
    // Phase 41 rewires this one target). It is the single accent element.
    var primary = buildCta('a', 'welcome-cta--primary', 'help.welcome.ctaTour');
    primary.setAttribute('href', './help.html');
    // Secondary CTA — first-class but neutral (therapist autonomy, D-10).
    var secondary = buildCta('button', 'welcome-cta--secondary', 'help.welcome.ctaExplore');
    secondary.setAttribute('type', 'button');
    actions.appendChild(primary);
    actions.appendChild(secondary);

    copy.appendChild(h1);
    copy.appendChild(sub);
    copy.appendChild(actions);
    panel.appendChild(art);
    panel.appendChild(copy);
    overlay.appendChild(panel);

    function onKeydown(e) { if (e.key === 'Escape') dismiss(); }

    function dismiss() {
      try { if (window.App && window.App.unlockBodyScroll) window.App.unlockBodyScroll(); } catch (e) {}
      doc.removeEventListener('keydown', onKeydown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (!isReplay) {
        lsSet(WELCOME_SEEN, '1');
        var v = (window.AppVersion && window.AppVersion.APP_VERSION);
        if (v) lsSet(WHATS_NEW_LAST_SEEN, v);   // D-03 — public semver only
      }
    }

    // The primary CTA dismisses (writing the keys) and then navigates via its
    // href; the secondary CTA and Esc dismiss in place.
    primary.addEventListener('click', function () { dismiss(); });
    secondary.addEventListener('click', function () { dismiss(); });
    doc.addEventListener('keydown', onKeydown);

    try { if (window.App && window.App.lockBodyScroll) window.App.lockBodyScroll(); } catch (e) {}
    doc.body.appendChild(overlay);
  }

  register({ id: 'welcome', eligible: welcomeEligible, show: function () { showWelcome(false); } });

  // ── beforeinstallprompt capture (D-12 groundwork; Pattern 3 / Pitfall 7) ────
  // Stash the deferred prompt so the Plan 03 install-nudge surface can re-fire
  // it later; clear it once the app is installed.
  try {
    window.addEventListener('beforeinstallprompt', function (e) {
      if (e && e.preventDefault) e.preventDefault();
      deferredPrompt = e;
    });
    window.addEventListener('appinstalled', function () { deferredPrompt = null; });
  } catch (e) {}

  // ── shared DOM helper ───────────────────────────────────────────────────────
  // Build an element and (optionally) resolve i18n copy into it via textContent —
  // never variable-interpolated markup (the surfaces' only trust boundary, T-40-03-XSS).
  function makeEl(tag, cls, key) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (key) { el.setAttribute('data-i18n', key); el.textContent = t(key); }
    return el;
  }

  // ── phone-class detection (capability probe, D-16) ──────────────────────────
  // A phone-class device gets the mobile expectation hint instead of the desktop
  // install nudge, so the two surfaces are mutually exclusive by device class in
  // practice. We probe CAPABILITY, never iOS-only UA strings: the modern hint
  // (userAgentData.mobile) OR a coarse pointer on a narrow viewport. 820px is the
  // phone / small-tablet boundary (Open Question 1) — a 7–8" tablet in portrait
  // still reads as a small touch device for this calm one-shot hint.
  function isPhoneClass() {
    try {
      var uad = navigator.userAgentData;
      if (uad && uad.mobile) return true;
      return window.matchMedia('(pointer: coarse)').matches
          && window.matchMedia('(max-width: 820px)').matches;
    } catch (e) { return false; }
  }

  // ── macOS Safari detection (per-browser install-copy gate, D-12) ────────────
  // The ONLY environment where the "File → Add to Dock" pointer copy is correct.
  // Chromium (Chrome/Edge/Opera/CriOS) and Firefox are excluded so the single ask
  // is never burned on wrong-browser copy or a dead button. iPadOS Safari 13+
  // also reports a Macintosh (desktop-mode) UA, but installs via Share → Add to
  // Home Screen — it exposes maxTouchPoints > 1 (real Macs, trackpads included,
  // report 0), so touch devices are excluded to keep the copy correct.
  function isMacSafari() {
    try {
      var ua = navigator.userAgent || '';
      var touch = navigator.maxTouchPoints > 1;   // iPadOS desktop-mode tell
      return /Macintosh/.test(ua)
          && /Safari\//.test(ua)
          && !/Chrome|Chromium|CriOS|Edg|OPR/.test(ua)
          && !touch;
    } catch (e) { return false; }
  }

  // ── install-nudge surface (D-12 / D-13 / D-14 / ONBD-04) ────────────────────
  var INSTALL_DISMISSED = 'sg.installNudgeDismissed';

  function installEligible() {
    // Never when already installed (standalone) — D-12.
    try { if (window.matchMedia('(display-mode: standalone)').matches) return false; } catch (e) {}
    // Gone forever once dismissed — D-14 (localStorage, NOT session; Pitfall 4).
    if (lsGet(INSTALL_DISMISSED) === '1') return false;
    // Phone-class gets the mobile hint instead.
    if (isPhoneClass()) return false;
    // Per-browser gate (D-12): render only when we can show CORRECT copy — a
    // captured beforeinstallprompt (Chromium) OR real macOS Safari. Any other
    // no-event env (desktop Firefox, or Chromium where run() beat the late-firing
    // event — Pitfall 1) is ineligible; the slot passes on and the nudge competes
    // again a later session. D-13 needs no bookkeeping: 'install-nudge' sits below
    // 'welcome' in PRECEDENCE, so welcome naturally wins launch 1.
    return !!deferredPrompt || isMacSafari();
  }

  function installShow() {
    var doc = document;
    var card = doc.createElement('div');
    card.className = 'install-nudge-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-labelledby', 'install-nudge-title');

    var title = makeEl('h2', 'install-nudge-title', 'onboard.install.title');
    title.id = 'install-nudge-title';
    card.appendChild(title);
    card.appendChild(makeEl('p', 'install-nudge-body', 'onboard.install.body'));

    function removeCard() { if (card.parentNode) card.parentNode.removeChild(card); }

    // Platform branch on the captured deferredPrompt. eligible() guarantees the
    // only other reachable env is real macOS Safari, so the else-branch copy is
    // always correct (never a dead/fake button on the wrong browser).
    if (deferredPrompt) {
      // Chromium: the single filled accent element — a REAL [Install app] button.
      var install = makeEl('button', 'install-nudge-install', 'onboard.install.ctaInstall');
      install.setAttribute('type', 'button');
      install.addEventListener('click', function () {
        if (!deferredPrompt) return;           // one-shot — Pitfall 2
        var dp = deferredPrompt;
        deferredPrompt = null;                 // clear BEFORE firing (no re-entrant double-prompt)
        try { dp.prompt(); } catch (e) {}
        if (install.parentNode) install.parentNode.removeChild(install);
      });
      card.appendChild(install);
    } else {
      // macOS Safari: no button — the File → Add to Dock pointer + a neutral help
      // link into the Phase 39 Safari install topic.
      card.appendChild(makeEl('p', 'install-nudge-safari-hint', 'onboard.install.safariHint'));
      var link = makeEl('a', 'install-nudge-safari-link', 'onboard.install.safariLink');
      link.setAttribute('href', './help.html#topic-install-safari');
      card.appendChild(link);
    }

    // Neutral dismiss ('No thanks') + a muted reassurance line.
    var actions = doc.createElement('div');
    actions.className = 'install-nudge-actions';
    var dismiss = makeEl('button', 'install-nudge-dismiss', 'onboard.install.dismiss');
    dismiss.setAttribute('type', 'button');
    dismiss.addEventListener('click', function () {
      lsSet(INSTALL_DISMISSED, '1');           // persistent, gone forever — D-14
      removeCard();
    });
    actions.appendChild(dismiss);
    card.appendChild(actions);
    card.appendChild(makeEl('p', 'install-nudge-later', 'onboard.install.laterHint'));

    doc.body.appendChild(card);
  }

  register({ id: 'install-nudge', eligible: installEligible, show: installShow });

  // ── mobile-hint surface (D-15 / D-16 — iOS banner successor) ────────────────
  // The calm all-mobile successor to the deleted iOS install banner: one-shot,
  // dismissed-forever, neutral tone (never a warning). Lowest precedence tier.
  var MOBILE_DISMISSED = 'sg.mobileHintDismissed';

  function mobileEligible() {
    if (!isPhoneClass()) return false;                 // phone-class only
    if (lsGet(MOBILE_DISMISSED) === '1') return false; // gone forever — D-16
    return true;
  }

  function mobileShow() {
    var doc = document;
    var bar = doc.createElement('div');
    bar.className = 'mobile-hint-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', t('onboard.mobileHint.body'));

    bar.appendChild(makeEl('p', 'mobile-hint-body', 'onboard.mobileHint.body'));
    var link = makeEl('a', 'mobile-hint-link', 'onboard.mobileHint.link');
    link.setAttribute('href', './help.html#topic-install-mobile-note');
    bar.appendChild(link);

    var dismiss = makeEl('button', 'mobile-hint-dismiss', 'onboard.mobileHint.dismiss');
    dismiss.setAttribute('type', 'button');
    dismiss.addEventListener('click', function () {
      lsSet(MOBILE_DISMISSED, '1');                     // persistent, one-shot forever — D-16
      if (bar.parentNode) bar.parentNode.removeChild(bar);
    });
    bar.appendChild(dismiss);

    doc.body.appendChild(bar);
  }

  register({ id: 'mobile-hint', eligible: mobileEligible, show: mobileShow });

  return {
    register: register,
    run: run,
    showWelcome: showWelcome,
    PRECEDENCE: PRECEDENCE,
    // Internal accessors for the Plan 03 install-nudge surface (not part of the
    // stable public contract).
    _getDeferredPrompt: function () { return deferredPrompt; },
    _clearDeferredPrompt: function () { deferredPrompt = null; },
    // Test seam — reach a registered surface's { eligible, show } directly.
    _getSurface: function (id) { return registry[id]; },
  };
})();

if (typeof window !== 'undefined') window.AttentionCoordinator = AttentionCoordinator;
