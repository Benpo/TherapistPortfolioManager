/* === DEMO MODE CONTROLLER === */
/* Updates demo banner text on language change. */
/* Data comes from the real database — no separate demo DB needed. */

(function() {
  'use strict';

  if (!document.body.hasAttribute('data-demo')) return;

  var DEMO_BANNER_TEXT = {
    en: 'This is a live demo \u2014 try it out! Your changes won\'t be saved.',
    he: '\u05d6\u05d5\u05d4\u05d9 \u05d4\u05d3\u05d2\u05de\u05d4 \u05d7\u05d9\u05d4 \u2014 \u05e0\u05e1\u05d5 \u05d1\u05d7\u05d5\u05e4\u05e9\u05d9\u05d5\u05ea! \u05d4\u05e9\u05d9\u05e0\u05d5\u05d9\u05d9\u05dd \u05dc\u05d0 \u05d9\u05d9\u05e9\u05de\u05e8\u05d5.',
    de: 'Dies ist eine Live-Demo \u2014 probieren Sie es aus! Ihre \u00c4nderungen werden nicht gespeichert.',
    cs: 'Toto je \u017eiv\u00e1 uk\u00e1zka \u2014 vyzkou\u0161ejte si to! Va\u0161e zm\u011bny nebudou ulo\u017eeny.'
  };

  function updateDemoBanner() {
    var lang = localStorage.getItem('portfolioLang') || 'en';
    var text = DEMO_BANNER_TEXT[lang] || DEMO_BANNER_TEXT.en;
    var el = document.querySelector('.demo-banner-text');
    if (el) el.textContent = text;
  }

  // Update banner on language change
  document.addEventListener('app:language', updateDemoBanner);

  // Listen for language sync from parent (landing page)
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'demo-lang') {
      var lang = event.data.lang;
      if (lang && window.App) {
        App.setLanguage(lang);
        updateDemoBanner();
      }
    }
  });

  // Set banner text on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateDemoBanner);
  } else {
    updateDemoBanner();
  }

})();
