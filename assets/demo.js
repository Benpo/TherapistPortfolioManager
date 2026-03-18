/* === DEMO MODE CONTROLLER === */
/* Handles language sync from parent landing page. */
/* Data comes from isolated demo_portfolio DB, seeded fresh on each load. */

(function() {
  'use strict';

  if (window.name !== 'demo-mode') return;

  // Listen for language sync from parent (landing page)
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'demo-lang') {
      var lang = event.data.lang;
      if (lang && window.App) {
        App.setLanguage(lang);
      }
    }
  });

})();
