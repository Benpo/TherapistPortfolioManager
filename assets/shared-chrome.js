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
    he: { impressum: '\u05d0\u05d9\u05de\u05e4\u05e8\u05e1\u05d5\u05dd', privacy: '\u05de\u05d3\u05d9\u05e0\u05d9\u05d5\u05ea \u05e4\u05e8\u05d8\u05d9\u05d5\u05ea', terms: '\u05ea\u05e0\u05d0\u05d9 \u05e9\u05d9\u05de\u05d5\u05e9', license: '\u05e8\u05d9\u05e9\u05d9\u05d5\u05df', madeWith: '\u05e0\u05d5\u05e6\u05e8 \u05d1\u05d0\u05d4\u05d1\u05d4 \u05e2\u05d1\u05d5\u05e8 \u05de\u05d8\u05e4\u05dc\u05d9\u05dd' },
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
    updateBackLinks: updateBackLinks,
    FOOTER_STRINGS: FOOTER_STRINGS,
    BACK_LINK_STRINGS: BACK_LINK_STRINGS,
    APP_VERSION: APP_VERSION
  };
})();
