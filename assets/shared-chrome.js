/**
 * shared-chrome.js — Shared footer and navigation utilities for all pages
 * Used by: app pages (loaded alongside app.js), license page, legal pages
 */
var SharedChrome = (function() {
  'use strict';

  var APP_VERSION = '1.1.0';

  function getNavigationContext() {
    var isActivated = false;
    try {
      isActivated = localStorage.getItem('portfolioLicenseActivated') === 'true'
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

  var FOOTER_STRINGS = {
    en: { impressum: 'Impressum', privacy: 'Privacy Policy', terms: 'Terms of Use', madeWith: 'Made with care for therapeutic practitioners' },
    he: { impressum: '\u05d0\u05d9\u05de\u05e4\u05e8\u05e1\u05d5\u05dd', privacy: '\u05de\u05d3\u05d9\u05e0\u05d9\u05d5\u05ea \u05e4\u05e8\u05d8\u05d9\u05d5\u05ea', terms: '\u05ea\u05e0\u05d0\u05d9 \u05e9\u05d9\u05de\u05d5\u05e9', madeWith: '\u05e0\u05d5\u05e6\u05e8 \u05d1\u05d0\u05d4\u05d1\u05d4 \u05e2\u05d1\u05d5\u05e8 \u05de\u05d8\u05e4\u05dc\u05d9\u05dd' },
    de: { impressum: 'Impressum', privacy: 'Datenschutz', terms: 'Nutzungsbedingungen', madeWith: 'Mit Sorgfalt f\u00fcr therapeutische Fachkr\u00e4fte erstellt' },
    cs: { impressum: 'Impressum', privacy: 'Ochrana osobn\u00edch \u00fadaj\u016f', terms: 'Podm\u00ednky u\u017eit\u00ed', madeWith: 'Vytvo\u0159eno s p\u00e9\u010d\u00ed pro terapeutick\u00e9 odborn\u00edky' }
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
      '</nav>' +
      '<p class="app-footer-contact"><a href="mailto:contact@sessionsgarden.app">contact@sessionsgarden.app</a></p>' +
      '<p class="app-footer-copy">&copy; 2026 Sessions Garden &middot; v' + APP_VERSION + '</p>' +
      '<p class="app-footer-tagline">' + strings.madeWith + '</p>';

    var target = targetEl || document.querySelector('.container') || document.body;
    target.appendChild(footer);
  }

  return {
    getNavigationContext: getNavigationContext,
    getLang: getLang,
    getLocalizedLegalLink: getLocalizedLegalLink,
    renderFooter: renderFooter,
    FOOTER_STRINGS: FOOTER_STRINGS,
    APP_VERSION: APP_VERSION
  };
})();
