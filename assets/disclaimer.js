// Sessions Garden — Disclaimer / T&C gate logic
// Handles: language detection, checkbox validation, acceptance storage,
//          receipt generation, redirect to app, readonly mode

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function detectLang() {
    // 1. Check URL param ?lang=
    var urlLang = getParam('lang');
    if (urlLang && window.DISCLAIMER_I18N[urlLang]) return urlLang;

    // 2. Check previously saved app language
    try {
      var saved = localStorage.getItem('portfolioLang');
      if (saved && window.DISCLAIMER_I18N[saved]) return saved;
    } catch (e) {}

    // 3. Detect from browser language
    var nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    if (nav.startsWith('he')) return 'he';
    if (nav.startsWith('de')) return 'de';
    if (nav.startsWith('cs')) return 'cs';
    return 'en';
  }

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  var currentLang = detectLang();
  // Persist detected language so it carries across page navigations
  try { localStorage.setItem('portfolioLang', currentLang); } catch (e) {}
  var isReadonly = (getParam('readonly') === 'true');
  var accepted = false;

  // -------------------------------------------------------------------------
  // DOM references (populated in init())
  // -------------------------------------------------------------------------

  var els = {};

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  function t() {
    return window.DISCLAIMER_I18N[currentLang] || window.DISCLAIMER_I18N['en'];
  }

  function applyDirection() {
    if (currentLang === 'he') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'he');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      var langMap = { en: 'en', de: 'de', cs: 'cs' };
      document.documentElement.setAttribute('lang', langMap[currentLang] || 'en');
    }
  }

  function renderSections() {
    var strings = t();
    var html = '';
    strings.sections.forEach(function (section) {
      html += '<section class="disclaimer-section">';
      html += '<h2 class="disclaimer-section-title">' + escapeHtml(section.title) + '</h2>';
      html += '<p class="disclaimer-section-body">' + escapeHtml(section.body) + '</p>';
      html += '</section>';
    });
    els.sections.innerHTML = html;
  }

  function renderText() {
    var strings = t();

    document.title = strings.pageTitle;

    // Heading
    if (els.heading) els.heading.textContent = strings.heading;
    if (els.subheading) els.subheading.textContent = strings.subheading;

    // Sections
    renderSections();

    // Checkbox labels (guards handle missing elements in readonly mode)
    if (els.labelGeneral) els.labelGeneral.textContent = strings.checkboxGeneral;
    if (els.labelWiderruf) els.labelWiderruf.textContent = strings.checkboxWiderruf;

    // Buttons
    if (els.acceptBtn) els.acceptBtn.textContent = strings.acceptButton;
    if (els.downloadBtn) els.downloadBtn.textContent = strings.downloadReceiptButton;
    if (els.continueBtn) els.continueBtn.textContent = strings.continueButton;

    if (accepted && els.acceptedMsg) {
      els.acceptedMsg.textContent = strings.acceptedMessage;
    }

    if (els.readonlyNote) els.readonlyNote.textContent = strings.readonlyNote;

    // Footer link
    var footerLink = document.getElementById('footer-terms-link');
    if (footerLink) footerLink.textContent = strings.heading;

  }

  // -------------------------------------------------------------------------
  // Checkbox / button state
  // -------------------------------------------------------------------------

  function updateAcceptButton() {
    if (!els.acceptBtn) return;
    var bothChecked = els.checkGeneral.checked && els.checkWiderruf.checked;
    els.acceptBtn.disabled = !bothChecked;
  }

  // -------------------------------------------------------------------------
  // Acceptance
  // -------------------------------------------------------------------------

  function handleAccept() {
    var timestamp = new Date().toISOString();

    try {
      localStorage.setItem('portfolioTermsAccepted', timestamp);
      localStorage.setItem('portfolioTermsLang', currentLang);
    } catch (e) {
      // Private browsing — continue anyway
    }

    accepted = true;

    // Hide checkboxes + accept button
    if (els.checkboxArea) els.checkboxArea.style.display = 'none';

    // Show post-accept buttons and message
    if (els.acceptedMsg) {
      els.acceptedMsg.textContent = t().acceptedMessage;
      els.acceptedMsg.style.display = '';
    }
    if (els.postAcceptArea) els.postAcceptArea.style.display = '';
  }

  // -------------------------------------------------------------------------
  // Receipt download
  // -------------------------------------------------------------------------

  function downloadReceipt() {
    var strings = t();
    var timestamp;
    try {
      timestamp = localStorage.getItem('portfolioTermsAccepted') || new Date().toISOString();
    } catch (e) {
      timestamp = new Date().toISOString();
    }

    var licenseKey = '';
    try {
      licenseKey = localStorage.getItem('portfolioLicenseKey') || '';
    } catch (e) {}

    var lines = [
      strings.receipt.title,
      strings.receipt.separator,
      strings.receipt.acceptedLabel + ': ' + timestamp,
      strings.receipt.languageLabel + ': ' + strings.receipt.langName,
    ];

    if (licenseKey) {
      lines.push(strings.receipt.licenseLabel + ': ' + licenseKey);
    }

    lines.push('');
    lines.push(strings.receipt.line1);
    lines.push(strings.receipt.line2);
    lines.push(strings.receipt.line3);

    var content = lines.join('\n');
    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'sessions-garden-acceptance-' + timestamp.slice(0, 10) + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // -------------------------------------------------------------------------
  // Continue / redirect
  // -------------------------------------------------------------------------

  function handleContinue() {
    try {
      localStorage.setItem('portfolioLang', currentLang);
    } catch (e) {}
    var next = getParam('next');
    if (next) {
      // next is URL-encoded pathname
      window.location.href = decodeURIComponent(next);
    } else {
      window.location.href = './index.html';
    }
  }

  // -------------------------------------------------------------------------
  // Language selector
  // -------------------------------------------------------------------------

  function handleLangChange(e) {
    currentLang = e.target.value;
    applyDirection();
    renderText();
  }

  // -------------------------------------------------------------------------
  // Escape helper
  // -------------------------------------------------------------------------

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // -------------------------------------------------------------------------
  // Build DOM
  // -------------------------------------------------------------------------

  function buildPage() {
    var strings = t();

    // Globe language selector
    initGlobeLang({
      containerId: 'globe-container',
      currentLang: currentLang,
      onLangChange: function (newLang) {
        currentLang = newLang;
        applyDirection();
        renderText();
        try { localStorage.setItem('portfolioLang', newLang); } catch (e) {}
      }
    });

    // Heading
    els.heading = document.getElementById('disclaimer-heading');
    els.subheading = document.getElementById('disclaimer-subheading');

    // Sections container
    els.sections = document.getElementById('disclaimer-sections');

    if (isReadonly) {
      // Readonly note
      var note = document.getElementById('readonly-note');
      if (note) {
        els.readonlyNote = note;
        note.style.display = '';
      }
      return; // No checkboxes, no buttons in readonly mode
    }

    // Checkbox area
    els.checkboxArea = document.getElementById('checkbox-area');
    els.checkGeneral = document.getElementById('check-general');
    els.checkWiderruf = document.getElementById('check-widerruf');
    els.labelGeneral = document.getElementById('label-general');
    els.labelWiderruf = document.getElementById('label-widerruf');

    if (els.checkGeneral) els.checkGeneral.addEventListener('change', updateAcceptButton);
    if (els.checkWiderruf) els.checkWiderruf.addEventListener('change', updateAcceptButton);

    // Accept button
    els.acceptBtn = document.getElementById('accept-btn');
    if (els.acceptBtn) {
      els.acceptBtn.disabled = true;
      els.acceptBtn.addEventListener('click', handleAccept);
    }

    // Accepted message
    els.acceptedMsg = document.getElementById('accepted-msg');
    if (els.acceptedMsg) els.acceptedMsg.style.display = 'none';

    // Post-accept area
    els.postAcceptArea = document.getElementById('post-accept-area');
    if (els.postAcceptArea) els.postAcceptArea.style.display = 'none';

    // Download receipt button
    els.downloadBtn = document.getElementById('download-receipt-btn');
    if (els.downloadBtn) els.downloadBtn.addEventListener('click', downloadReceipt);

    // Continue button
    els.continueBtn = document.getElementById('continue-btn');
    if (els.continueBtn) els.continueBtn.addEventListener('click', handleContinue);
  }

  // -------------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------------

  function init() {
    applyDirection();
    buildPage();
    renderText();

    // If already accepted and this is not readonly mode, we still show the
    // page (user may have followed a "view terms" link). But hide the
    // accept flow and show a "already accepted" state if they got here
    // by a direct link rather than a gate redirect.
    // (The gate script on app pages already handles the redirect logic.)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
