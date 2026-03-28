/* === DEMO PULSING DOT HINTS === */
/* Only active when page is inside an iframe (demo context). */

(function() {
  'use strict';

  if (window === window.top) return;

  // --- Inject CSS ---
  var style = document.createElement('style');
  style.textContent = [
    '@keyframes demo-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(224,122,95,0.5); } 70% { box-shadow: 0 0 0 8px rgba(224,122,95,0); } }',
    '.demo-dot {',
    '  width: 14px; height: 14px;',
    '  border-radius: 50%;',
    '  background: #e07a5f;',
    '  border: 2px solid #fff;',
    '  cursor: pointer;',
    '  z-index: 100;',
    '  padding: 0;',
    '  display: inline-block;',
    '  vertical-align: middle;',
    '  margin-inline-start: 6px;',
    '  animation: demo-pulse 2s ease-in-out infinite;',
    '  flex-shrink: 0;',
    '}',
    '.demo-dot:hover { transform: scale(1.3); animation: none; }',
    '.demo-dot-dismissed { animation: none; opacity: 0.4; background: #999; }',
    '.demo-dot-with-label {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 6px;',
    '}',
    '.demo-dot-label {',
    '  font-size: 0.75rem;',
    '  font-weight: 700;',
    '  color: #e07a5f;',
    '  white-space: nowrap;',
    '}',
    '.demo-btn-wrap {',
    '  display: inline-flex;',
    '  flex-direction: column;',
    '  align-items: center;',
    '  position: relative;',
    '}',
    '.demo-btn-wrap .demo-dot {',
    '  position: absolute;',
    '  top: -6px;',
    '  inset-inline-end: -6px;',
    '  z-index: 10;',
    '}',
    '.demo-btn-wrap .demo-dot-label {',
    '  margin-top: 4px;',
    '}',
    '.demo-tooltip {',
    '  position: fixed;',
    '  min-width: 220px;',
    '  max-width: 300px;',
    '  padding: 0.75rem 1rem;',
    '  padding-inline-end: 2rem;',
    '  background: #fff;',
    '  color: #2d3a2e;',
    '  font-size: 0.8125rem;',
    '  line-height: 1.55;',
    '  border-radius: 10px;',
    '  box-shadow: 0 4px 24px rgba(0,0,0,0.15);',
    '  border: 1px solid rgba(45, 106, 79, 0.15);',
    '  z-index: 9999;',
    '  animation: demo-fade-in 0.2s ease;',
    '}',
    '@keyframes demo-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }',
    '.demo-tooltip-close {',
    '  position: absolute;',
    '  top: 4px; inset-inline-end: 6px;',
    '  background: none; border: none;',
    '  font-size: 1.125rem; color: #999;',
    '  cursor: pointer; padding: 2px 6px;',
    '  line-height: 1;',
    '}',
    '.demo-tooltip-close:hover { color: #333; }',
    '[data-theme="dark"] .demo-tooltip { background: #2a2a2a; color: #e0e0e0; border-color: rgba(255,255,255,0.1); }',
  ].join('\n');
  document.head.appendChild(style);

  // --- Hint definitions ---
  var HINTS = {
    overview: [
      {
        id: 'hint-add-client',
        target: '#addClientBtn',
        insert: 'wrap-button',
        showLabel: true,
        text: {
          en: 'Add new clients to your Sessions Garden and start documenting sessions.',
          he: '\u05d4\u05d5\u05e1\u05d9\u05e4\u05d5 \u05de\u05d8\u05d5\u05e4\u05dc\u05d9\u05dd \u05d7\u05d3\u05e9\u05d9\u05dd \u05dc-Sessions Garden \u05e9\u05dc\u05db\u05dd \u05d5\u05d4\u05ea\u05d7\u05d9\u05dc\u05d5 \u05dc\u05ea\u05e2\u05d3 \u05de\u05e4\u05d2\u05e9\u05d9\u05dd.',
          de: 'F\u00fcgen Sie neue Klienten zu Ihrem Sessions Garden hinzu und beginnen Sie, Sitzungen zu dokumentieren.',
          cs: 'P\u0159idejte nov\u00e9 klienty do sv\u00e9ho Sessions Garden a za\u010dn\u011bte dokumentovat sezen\u00ed.'
        }
      },
      {
        id: 'hint-export',
        target: '#exportBtn',
        insert: 'append',
        text: {
          en: 'Back up all the data you\'ve entered \u2014 one click, and everything is saved to a file.',
          he: '\u05d2\u05d1\u05d5 \u05d0\u05ea \u05db\u05dc \u05d4\u05de\u05d9\u05d3\u05e2 \u05e9\u05d4\u05d6\u05e0\u05ea\u05dd \u2014 \u05dc\u05d7\u05d9\u05e6\u05d4 \u05d0\u05d7\u05ea, \u05d5\u05d4\u05db\u05dc \u05e0\u05e9\u05de\u05e8 \u05dc\u05e7\u05d5\u05d1\u05e5.',
          de: 'Sichern Sie alle eingegebenen Daten \u2014 ein Klick, und alles wird in einer Datei gespeichert.',
          cs: 'Z\u00e1lohujte v\u0161echna zadan\u00e1 data \u2014 jedn\u00edm kliknut\u00edm v\u0161e ulo\u017e\u00edte do souboru.'
        }
      },
      {
        id: 'hint-import',
        target: '.import-label span',
        insert: 'append',
        text: {
          en: 'Import your backup \u2014 all data will be arranged exactly as it was before.',
          he: '\u05d9\u05d9\u05d1\u05d0\u05d5 \u05d0\u05ea \u05d4\u05d2\u05d9\u05d1\u05d5\u05d9 \u05e9\u05dc\u05db\u05dd \u2014 \u05db\u05dc \u05d4\u05de\u05d9\u05d3\u05e2 \u05d9\u05e1\u05ea\u05d3\u05e8 \u05d1\u05d3\u05d9\u05d5\u05e7 \u05db\u05e4\u05d9 \u05e9\u05d4\u05d9\u05d4.',
          de: 'Importieren Sie Ihr Backup \u2014 alle Daten werden exakt wie zuvor angeordnet.',
          cs: 'Importujte svou z\u00e1lohu \u2014 v\u0161echna data budou uspo\u0159\u00e1d\u00e1na p\u0159esn\u011b jako d\u0159\u00edve.'
        }
      }
    ],
    'add-client': [
      {
        id: 'hint-photo',
        target: 'label[data-i18n="client.form.photo"]',
        insert: 'append',
        text: {
          en: 'Upload a client photo \u2014 connect energetically during remote sessions without switching screens.',
          he: '\u05d4\u05e2\u05dc\u05d5 \u05ea\u05de\u05d5\u05e0\u05ea \u05de\u05d8\u05d5\u05e4\u05dc \u2014 \u05d4\u05ea\u05d7\u05d1\u05e8\u05d5 \u05d0\u05e0\u05e8\u05d2\u05d8\u05d9\u05ea \u05d1\u05d8\u05d9\u05e4\u05d5\u05dc\u05d9\u05dd \u05de\u05e8\u05d7\u05d5\u05e7.',
          de: 'Laden Sie ein Klientenfoto hoch \u2014 verbinden Sie sich energetisch bei Fernsitzungen, ohne den Bildschirm zu wechseln.',
          cs: 'Nahrajte fotku klienta \u2014 spojte se energeticky p\u0159i vzd\u00e1len\u00fdch sezen\u00edch bez p\u0159ep\u00edn\u00e1n\u00ed obrazovek.'
        }
      },
      {
        id: 'hint-save-session',
        target: '#saveAndSessionBtn',
        insert: 'append',
        text: {
          en: 'Save and your client file is created. From here you can go straight to documenting the first session \u2014 try it!',
          he: '\u05e9\u05de\u05e8\u05d5 \u05d5\u05ea\u05d9\u05e7 \u05d4\u05dc\u05e7\u05d5\u05d7 \u05e0\u05d5\u05e6\u05e8. \u05de\u05db\u05d0\u05df \u05d0\u05e4\u05e9\u05e8 \u05dc\u05ea\u05e2\u05d3 \u05d0\u05ea \u05d4\u05de\u05e4\u05d2\u05e9 \u05d4\u05e8\u05d0\u05e9\u05d5\u05df \u2014 \u05e0\u05e1\u05d5!',
          de: 'Speichern und die Klientenakte wird erstellt. Von hier aus k\u00f6nnen Sie direkt die erste Sitzung dokumentieren \u2014 probieren Sie es!',
          cs: 'Ulo\u017ete a slo\u017eka klienta je vytvo\u0159ena. Odtud m\u016f\u017eete p\u0159\u00edmo dokumentovat prvn\u00ed sezen\u00ed \u2014 zkuste to!'
        }
      }
    ],
    'add-session': [
      {
        id: 'hint-age',
        target: '#clientSpotlightAge',
        insert: 'append',
        text: {
          en: 'Age updates in real time from date of birth \u2014 no need to calculate it yourself.',
          he: '\u05d4\u05d2\u05d9\u05dc \u05de\u05ea\u05e2\u05d3\u05db\u05df \u05d1\u05d6\u05de\u05df \u05d0\u05de\u05ea \u05de\u05ea\u05d0\u05e8\u05d9\u05da \u05d4\u05dc\u05d9\u05d3\u05d4 \u2014 \u05d0\u05d9\u05df \u05e6\u05d5\u05e8\u05da \u05dc\u05d6\u05db\u05d5\u05e8 \u05d1\u05e2\u05e6\u05de\u05db\u05dd.',
          de: 'Das Alter wird in Echtzeit aus dem Geburtsdatum berechnet \u2014 kein Kopfrechnen n\u00f6tig.',
          cs: 'V\u011bk se automaticky aktualizuje z data narozen\u00ed \u2014 nemus\u00edte po\u010d\u00edtat sami.'
        }
      },
      {
        id: 'hint-severity-before',
        target: 'label[data-i18n="session.form.beforeSeverity"]',
        insert: 'append',
        text: {
          en: 'Rate the severity at the start of the session (0\u201310) \u2014 don\'t forget to update it at the end too.',
          he: '\u05d3\u05e8\u05d2\u05d5 \u05d0\u05ea \u05d7\u05d5\u05de\u05e8\u05ea \u05d4\u05de\u05e6\u05d1 \u05d1\u05ea\u05d7\u05d9\u05dc\u05ea \u05d4\u05d8\u05d9\u05e4\u05d5\u05dc (0\u201310) \u2014 \u05d0\u05dc \u05ea\u05e9\u05db\u05d7\u05d5 \u05dc\u05e2\u05d3\u05db\u05df \u05d2\u05dd \u05d1\u05e1\u05d5\u05e3.',
          de: 'Bewerten Sie den Schweregrad zu Beginn der Sitzung (0\u201310) \u2014 vergessen Sie nicht, ihn am Ende zu aktualisieren.',
          cs: 'Ohodno\u0165te z\u00e1va\u017enost na za\u010d\u00e1tku sezen\u00ed (0\u201310) \u2014 nezapome\u0148te aktualizovat na konci.'
        }
      },
      {
        id: 'hint-severity-after',
        target: 'label[data-i18n="session.form.afterSeverity"]',
        insert: 'append',
        text: {
          en: 'Now rate the severity after the session \u2014 see the change from where you started.',
          he: '\u05e2\u05db\u05e9\u05d9\u05d5 \u05d3\u05e8\u05d2\u05d5 \u05d0\u05ea \u05d4\u05d7\u05d5\u05de\u05e8\u05d4 \u05d0\u05d7\u05e8\u05d9 \u05d4\u05d8\u05d9\u05e4\u05d5\u05dc \u2014 \u05e6\u05e4\u05d5 \u05d1\u05e9\u05d9\u05e0\u05d5\u05d9 \u05de\u05d4\u05ea\u05d7\u05dc\u05d4.',
          de: 'Bewerten Sie jetzt den Schweregrad nach der Sitzung \u2014 sehen Sie die Ver\u00e4nderung seit Beginn.',
          cs: 'Nyn\u00ed ohodno\u0165te z\u00e1va\u017enost po sezen\u00ed \u2014 pod\u00edvejte se na zm\u011bnu od za\u010d\u00e1tku.'
        }
      }
    ]
  };

  var dismissed = {};

  function getLang() {
    return localStorage.getItem('portfolioLang') || 'en';
  }

  function getHintText(hint) {
    var lang = getLang();
    return hint.text[lang] || hint.text.en;
  }

  // --- Create dot element ---
  function createDot(hint) {
    var dot = document.createElement('button');
    dot.className = 'demo-dot';
    dot.setAttribute('aria-label', 'Tip');
    dot.dataset.hintId = hint.id;

    // If showLabel, wrap dot + label in a container
    var element = dot;
    if (hint.showLabel) {
      var wrap = document.createElement('div');
      wrap.className = 'demo-dot-with-label';
      wrap.dataset.hintId = hint.id;
      var label = document.createElement('span');
      label.className = 'demo-dot-label';
      var labelTexts = { en: 'Click here', he: '\u05dc\u05d7\u05e6\u05d5 \u05db\u05d0\u05df', de: 'Hier klicken', cs: 'Klikn\u011bte sem' };
      label.textContent = labelTexts[getLang()] || labelTexts.en;
      wrap.appendChild(dot);
      wrap.appendChild(label);
      element = wrap;
    }

    dot.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      showTooltip(dot, hint);
    });

    return element;
  }

  // --- Show tooltip near dot using fixed positioning ---
  function showTooltip(dot, hint) {
    var existing = document.querySelector('.demo-tooltip');
    if (existing) existing.remove();

    var tooltip = document.createElement('div');
    tooltip.className = 'demo-tooltip';
    tooltip.textContent = getHintText(hint);

    var close = document.createElement('button');
    close.className = 'demo-tooltip-close';
    close.textContent = '\u00d7';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', function(e) {
      e.stopPropagation();
      tooltip.remove();
    });
    tooltip.appendChild(close);

    // Position tooltip below the dot using fixed coords
    var rect = dot.getBoundingClientRect();
    tooltip.style.top = (rect.bottom + 6) + 'px';
    tooltip.style.left = Math.max(8, rect.left - 40) + 'px';

    // Ensure tooltip doesn't go off-screen right
    document.body.appendChild(tooltip);
    var tooltipRect = tooltip.getBoundingClientRect();
    if (tooltipRect.right > window.innerWidth - 8) {
      tooltip.style.left = (window.innerWidth - tooltipRect.width - 8) + 'px';
    }

    dismissed[hint.id] = true;
    dot.classList.add('demo-dot-dismissed');
    // Remove label text after click
    var parent = dot.closest('.demo-dot-with-label') || dot.closest('.demo-btn-wrap');
    if (parent) {
      var label = parent.querySelector('.demo-dot-label');
      if (label) label.remove();
    }

    setTimeout(function() {
      if (tooltip.parentElement) tooltip.remove();
    }, 8000);

    function closeOnOutside(ev) {
      if (!tooltip.contains(ev.target) && ev.target !== dot) {
        tooltip.remove();
        document.removeEventListener('click', closeOnOutside);
      }
    }
    setTimeout(function() {
      document.addEventListener('click', closeOnOutside);
    }, 100);
  }

  // --- Place dot: insert inline next to target ---
  function placeDot(hint) {
    if (dismissed[hint.id]) return;
    if (document.querySelector('[data-hint-id="' + hint.id + '"]')) return;

    var target = document.querySelector(hint.target);
    if (!target) return;
    if (target.offsetParent === null) return;

    var dot = createDot(hint);

    if (hint.insert === 'append') {
      target.appendChild(dot);
    } else if (hint.insert === 'before') {
      target.parentNode.insertBefore(dot, target);
    } else if (hint.insert === 'wrap-button') {
      // Wrap button: dot ON the button (top-right), label BELOW
      var btnWrap = document.createElement('div');
      btnWrap.className = 'demo-btn-wrap';
      btnWrap.dataset.hintId = hint.id;
      target.parentNode.insertBefore(btnWrap, target);
      btnWrap.appendChild(target);
      var pureDot = dot.querySelector('.demo-dot') || dot;
      btnWrap.appendChild(pureDot);
      var labelEl = dot.querySelector('.demo-dot-label');
      if (labelEl) btnWrap.appendChild(labelEl);
      if (dot !== pureDot) dot.remove();
    } else {
      target.parentNode.insertBefore(dot, target.nextSibling);
    }
  }

  function placeDots(pageHints) {
    pageHints.forEach(placeDot);
  }

  function getCurrentPage() {
    var path = window.location.pathname;
    if (path.includes('add-session')) return 'add-session';
    if (path.includes('add-client')) return 'add-client';
    return 'overview';
  }

  function watchDynamicElements(pageHints) {
    var observer = new MutationObserver(function() {
      pageHints.forEach(function(hint) {
        if (!dismissed[hint.id] && !document.querySelector('[data-hint-id="' + hint.id + '"]')) {
          var target = document.querySelector(hint.target);
          if (target && target.offsetParent !== null) {
            placeDot(hint);
          }
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(function() { observer.disconnect(); }, 30000);
  }

  function cleanupDots() {
    document.querySelectorAll('.demo-tooltip').forEach(function(el) { el.remove(); });
    document.querySelectorAll('.demo-btn-wrap').forEach(function(wrap) {
      var btn = wrap.querySelector('button:not(.demo-dot), a:not(.demo-dot)');
      if (btn) wrap.parentNode.insertBefore(btn, wrap);
      wrap.remove();
    });
    document.querySelectorAll('.demo-dot, .demo-dot-with-label').forEach(function(el) { el.remove(); });
    dismissed = {};
  }

  function init() {
    var page = getCurrentPage();
    var pageHints = HINTS[page] || [];
    if (pageHints.length === 0) return;

    setTimeout(function() { placeDots(pageHints); }, 500);

    if (page === 'add-session') {
      watchDynamicElements(pageHints);
    }

    document.addEventListener('app:language', function() {
      cleanupDots();
      setTimeout(function() { placeDots(HINTS[getCurrentPage()] || []); }, 300);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 600); });
  } else {
    setTimeout(init, 600);
  }
})();
