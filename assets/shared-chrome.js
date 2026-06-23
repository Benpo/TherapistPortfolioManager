/**
 * shared-chrome.js — Shared footer and navigation utilities for all pages
 * Used by: app pages (loaded alongside app.js), license page, legal pages
 */
var SharedChrome = (function() {
  'use strict';

  // Single source of truth (VER-02): read the semver from version.js, loaded
  // before this file on every app page (Plan 03). The literal fallback only
  // applies if version.js somehow failed to load (defensive — never blocks the
  // footer from rendering).
  var APP_VERSION = (typeof window !== 'undefined' && window.AppVersion && window.AppVersion.APP_VERSION)
    ? window.AppVersion.APP_VERSION
    : '1.2.1';

  // Tracks whether the footer ⚠ marker has been shown this load. Once set, the
  // footer never downgrades back to clean within the load (D-09).
  var _footerMarked = false;

  function getNavigationContext() {
    var isActivated = false;
    try {
      var activatedVal = localStorage.getItem('portfolioLicenseActivated');
      isActivated = (activatedVal === '1' || activatedVal === 'true')
        && !!localStorage.getItem('portfolioLicenseInstance');
    } catch(e) {}
    return {
      isActivated: isActivated,
      homeHref: isActivated ? './index.html' : './landing.html',
      homeLabel: isActivated ? 'backToApp' : 'backToHome'
    };
  }

  function getLang() {
    try { return localStorage.getItem('portfolioLang') || 'en'; } catch(e) { return 'en'; }
  }

  function getLocalizedLegalLink(type, lang) {
    if (lang === 'de') return './' + type + '.html';
    return './' + type + '-' + lang + '.html';
  }

  var BACK_LINK_STRINGS = {
    en: { backToApp: 'Back to app', backToHome: 'Back to home' },
    he: { backToApp: '\u05d7\u05d6\u05e8\u05d4 \u05dc\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4', backToHome: '\u05d7\u05d6\u05e8\u05d4 \u05dc\u05d3\u05e3 \u05d4\u05d1\u05d9\u05ea' },
    de: { backToApp: 'Zur\u00fcck zur App', backToHome: 'Zur\u00fcck zur Startseite' },
    cs: { backToApp: 'Zp\u011bt do aplikace', backToHome: 'Zp\u011bt na hlavn\u00ed str\u00e1nku' }
  };

  function updateBackLinks() {
    var ctx = getNavigationContext();
    var lang = getLang();
    var strings = BACK_LINK_STRINGS[lang] || BACK_LINK_STRINGS.en;
    var label = ctx.isActivated ? strings.backToApp : strings.backToHome;

    // Update legal-back-link and disclaimer-back-link
    var links = document.querySelectorAll('.legal-back-link, .disclaimer-back-link');
    for (var i = 0; i < links.length; i++) {
      links[i].href = ctx.homeHref;
      links[i].textContent = label;
    }
    // Update topbar brand link
    var brandLinks = document.querySelectorAll('.legal-topbar-brand');
    for (var j = 0; j < brandLinks.length; j++) {
      brandLinks[j].href = ctx.homeHref;
    }
  }

  var FOOTER_STRINGS = {
    en: { impressum: 'Impressum', privacy: 'Privacy Policy', terms: 'Terms of Use', license: 'License', madeWith: 'Made with care for therapeutic practitioners' },
    he: { impressum: '\u05d0\u05d5\u05d3\u05d5\u05ea', privacy: '\u05de\u05d3\u05d9\u05e0\u05d9\u05d5\u05ea \u05e4\u05e8\u05d8\u05d9\u05d5\u05ea', terms: '\u05ea\u05e0\u05d0\u05d9 \u05e9\u05d9\u05de\u05d5\u05e9', license: '\u05e8\u05d9\u05e9\u05d9\u05d5\u05df', madeWith: '\u05e0\u05d5\u05e6\u05e8 \u05d1\u05d0\u05d4\u05d1\u05d4 \u05e2\u05d1\u05d5\u05e8 \u05de\u05d8\u05e4\u05dc\u05d9\u05dd' },
    de: { impressum: 'Impressum', privacy: 'Datenschutz', terms: 'Nutzungsbedingungen', license: 'Lizenz', madeWith: 'Mit Sorgfalt f\u00fcr therapeutische Fachkr\u00e4fte erstellt' },
    cs: { impressum: 'Impressum', privacy: 'Ochrana osobn\u00edch \u00fadaj\u016f', terms: 'Podm\u00ednky u\u017eit\u00ed', license: 'Licence', madeWith: 'Vytvo\u0159eno s p\u00e9\u010d\u00ed pro terapeutick\u00e9 odborn\u00edky' }
  };

  function renderFooter(targetEl) {
    var lang = getLang();
    var strings = FOOTER_STRINGS[lang] || FOOTER_STRINGS.en;

    // Remove existing footer if re-rendering
    var existing = document.querySelector('.app-footer');
    if (existing) existing.remove();

    var footer = document.createElement('footer');
    footer.className = 'app-footer';

    footer.innerHTML =
      '<div class="app-footer-botanical" aria-hidden="true">' +
        '<img src="./assets/illustrations/watering-can.png" alt="" class="app-footer-botanical-img" />' +
      '</div>' +
      '<nav class="app-footer-links" aria-label="Footer">' +
        '<a href="' + getLocalizedLegalLink('disclaimer', lang) + '?readonly=true">' + strings.terms + '</a>' +
        '<a href="' + getLocalizedLegalLink('impressum', lang) + '">' + strings.impressum + '</a>' +
        '<a href="' + getLocalizedLegalLink('datenschutz', lang) + '">' + strings.privacy + '</a>' +
        '<a href="./license.html">' + strings.license + '</a>' +
      '</nav>' +
      '<p class="app-footer-contact"><a href="mailto:contact@sessionsgarden.app">contact@sessionsgarden.app</a></p>' +
      // Render clean OPTIMISTICALLY (D-09): show v{APP_VERSION} with no marker.
      // The integrity check below may UPGRADE it to v{APP_VERSION} ⚠ — it never
      // downgrades. The marker span is created empty here so the check can fill
      // it without touching the rest of the line.
      '<p class="app-footer-copy">&copy; 2026 Sessions Garden &middot; v' + APP_VERSION +
        '<span class="app-footer-version-warn" aria-hidden="true"></span></p>' +
      '<p class="app-footer-tagline">' + strings.madeWith + '</p>';

    var target = targetEl || document.querySelector('.container') || document.body;
    target.appendChild(footer);

    // Honest footer (D-09 / VER-03): run the fully-local integrity self-check
    // and, ONLY on a detected mismatch, upgrade the footer to the ⚠ marker and
    // surface the state-bound nudge. Never the reverse. version.js owns the
    // resolver, the strings, and the nudge; this just drives them.
    maybeUpgradeFooterAndNudge();
  }

  function maybeUpgradeFooterAndNudge() {
    if (typeof window === 'undefined' || !window.AppVersion || !window.AppVersion.checkIntegrity) return;
    try {
      window.AppVersion.checkIntegrity().then(function (state) {
        // Phase 28 → 29 seam (D-01 / 28-CONTEXT D-12): persist a non-clean
        // integrity state into the OBS-01 crash log so the v209-class mismatch
        // becomes reportable through the OBS-02 report screen. Feature-gated —
        // CrashLog may not be loaded on every page (legal/landing pages omit
        // it) — and fully guarded so a logging failure never breaks the footer.
        if (state && state !== 'clean' && window.CrashLog && typeof window.CrashLog.logError === 'function') {
          try {
            window.CrashLog.logError({
              source: 'integrity',
              message: 'version integrity mismatch: ' + state,
              url: (typeof location !== 'undefined' ? location.href : ''),
            });
          } catch (e) { /* never let logging break the footer */ }
        }
        var marked = window.AppVersion.footerMarkerForState(_footerMarked, state);
        if (marked && !_footerMarked) {
          _footerMarked = true;
          var warn = document.querySelector('.app-footer-version-warn');
          if (warn) {
            warn.textContent = ' ⚠'; // space + ⚠ (U+26A0)
            warn.setAttribute('title', window.AppVersion.integStr('footerWarn'));
            warn.setAttribute('aria-label', window.AppVersion.integStr('footerWarn'));
            warn.removeAttribute('aria-hidden');
          }
        }
        // Surface the nudge for any non-clean state (online/offline/wedged).
        if (state && state !== 'clean' && window.AppVersion.buildNudge) {
          window.AppVersion.buildNudge(state);
        }
      }).catch(function () { /* check is best-effort; never block the footer */ });
    } catch (e) { /* defensive: a missing API must never break footer render */ }
  }

  return {
    getNavigationContext: getNavigationContext,
    getLang: getLang,
    getLocalizedLegalLink: getLocalizedLegalLink,
    renderFooter: renderFooter,
    maybeUpgradeFooterAndNudge: maybeUpgradeFooterAndNudge,
    updateBackLinks: updateBackLinks,
    FOOTER_STRINGS: FOOTER_STRINGS,
    BACK_LINK_STRINGS: BACK_LINK_STRINGS,
    APP_VERSION: APP_VERSION
  };
})();
