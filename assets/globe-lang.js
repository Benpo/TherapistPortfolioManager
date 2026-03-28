/**
 * globe-lang.js — Shared globe language selector component
 *
 * Usage: initGlobeLang({ containerId, currentLang, onLangChange })
 *
 * containerId:   ID of the container element where globe markup will be injected
 * currentLang:   current active language code ('en', 'he', 'de', 'cs')
 * onLangChange:  callback(newLang) called when user selects a language
 */
function initGlobeLang(opts) {
  var container = document.getElementById(opts.containerId);
  if (!container) return;

  var LANGS = [
    { code: 'en', label: 'English' },
    { code: 'he', label: 'עברית' },
    { code: 'de', label: 'Deutsch' },
    { code: 'cs', label: 'Čeština' }
  ];

  // Create globe button
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'globe-lang-btn';
  btn.setAttribute('aria-label', 'Change language');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

  // Create popover
  var popover = document.createElement('div');
  popover.className = 'globe-lang-popover';
  popover.hidden = true;

  LANGS.forEach(function (l) {
    var optBtn = document.createElement('button');
    optBtn.type = 'button';
    optBtn.className = 'globe-lang-option';
    optBtn.setAttribute('data-lang', l.code);
    optBtn.setAttribute('aria-selected', l.code === opts.currentLang ? 'true' : 'false');
    optBtn.textContent = l.label;
    popover.appendChild(optBtn);
  });

  // Assemble wrapper
  var wrap = document.createElement('div');
  wrap.className = 'globe-lang-wrap';
  wrap.appendChild(btn);
  wrap.appendChild(popover);
  container.appendChild(wrap);

  // Open / close helpers
  function open() {
    popover.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  }
  function close() {
    popover.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  // Toggle on globe button click
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (popover.hidden) { open(); } else { close(); }
  });

  // Select language on option click
  popover.addEventListener('click', function (e) {
    var target = e.target.closest('.globe-lang-option');
    if (!target) return;
    var newLang = target.getAttribute('data-lang');
    // Update aria-selected state
    popover.querySelectorAll('.globe-lang-option').forEach(function (o) {
      o.setAttribute('aria-selected', o.getAttribute('data-lang') === newLang ? 'true' : 'false');
    });
    close();
    if (opts.onLangChange) opts.onLangChange(newLang);
  });

  // Click outside closes the popover
  document.addEventListener('click', function (e) {
    if (!popover.hidden && !wrap.contains(e.target)) close();
  });
}
