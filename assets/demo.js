/* === DEMO MODE CONTROLLER === */
/* Seeds sample data, shows demo banner, cleans up on exit */

(function() {
  'use strict';

  // Only run on demo page
  if (!document.body.hasAttribute('data-demo')) return;

  // --- Demo banner i18n ---
  var DEMO_BANNER_TEXT = {
    en: 'This is a live demo — try it out! Your changes won\'t be saved.',
    he: 'זוהי הדגמה חיה — נסו בחופשיות! השינויים לא יישמרו.',
    de: 'Dies ist eine Live-Demo — probieren Sie es aus! Ihre Änderungen werden nicht gespeichert.',
    cs: 'Toto je živá ukázka — vyzkoušejte si to! Vaše změny nebudou uloženy.'
  };

  function updateDemoBanner() {
    var lang = localStorage.getItem('portfolioLang') || 'he';
    var text = DEMO_BANNER_TEXT[lang] || DEMO_BANNER_TEXT.en;
    var el = document.querySelector('.demo-banner-text');
    if (el) el.textContent = text;
  }

  // --- Sample data in Hebrew (primary language) ---
  function getSampleClients() {
    return [
      {
        firstName: 'שרה',
        lastInitial: 'מ',
        type: 'adult',
        notes: 'מגיעה עם כאבי גב כרוניים ומתח רגשי. עובדת כמורה. מגיבה טוב לטיפול.',
        heartWall: false
      },
      {
        firstName: 'לונה',
        lastInitial: '',
        type: 'animal',
        species: 'חתולה',
        ownerName: 'מיכל כ.',
        notes: 'חתולה ביתית, בת 6. חרדתית מאז מעבר דירה. הבעלים מדווחת על שיפור.',
        heartWall: false
      },
      {
        firstName: 'דוד',
        lastInitial: 'ר',
        type: 'adult',
        notes: 'פנה בעקבות קשיים בשינה. תחילת טיפול.',
        heartWall: true
      }
    ];
  }

  function getSampleSessions(clientIds) {
    var now = new Date();
    var day = 24 * 60 * 60 * 1000;

    // Helper: date N days ago, formatted as YYYY-MM-DD
    function daysAgo(n) {
      var d = new Date(now.getTime() - n * day);
      return d.toISOString().slice(0, 10);
    }

    return [
      // Sarah M. — 4 sessions
      {
        clientId: clientIds[0],
        date: daysAgo(75),
        sessionType: 'inPerson',
        issues: [
          { name: 'כעס מודחק', emotion: 'כעס', before: 8, after: 3, location: 'כתפיים' },
          { name: 'חרדה', emotion: 'חרדה', before: 7, after: 4, location: 'בטן' }
        ],
        comments: 'מפגש ראשון. שרה זיהתה קשר בין כעס מודחק לכאבי הגב.',
        generalNotes: 'אווירה טובה, פתיחות רבה'
      },
      {
        clientId: clientIds[0],
        date: daysAgo(54),
        sessionType: 'inPerson',
        issues: [
          { name: 'אשמה', emotion: 'אשמה', before: 6, after: 2, location: 'לב' },
          { name: 'כעס מודחק', emotion: 'כעס', before: 5, after: 2, location: 'כתפיים' }
        ],
        comments: 'המשך עיבוד. כאבי הגב פחתו משמעותית מאז המפגש הראשון.',
        generalNotes: ''
      },
      {
        clientId: clientIds[0],
        date: daysAgo(30),
        sessionType: 'inPerson',
        issues: [
          { name: 'פחד מדחייה', emotion: 'פחד', before: 7, after: 3, location: 'גרון' }
        ],
        comments: 'עלה נושא של קשרים בינאישיים. שחררנו פחד תורשתי מצד האם.',
        generalNotes: 'רגש תורשתי — דור שלישי'
      },
      {
        clientId: clientIds[0],
        date: daysAgo(7),
        sessionType: 'inPerson',
        issues: [
          { name: 'עצב', emotion: 'עצב', before: 5, after: 1, location: 'לב' },
          { name: 'חוסר ביטחון', emotion: 'חוסר ביטחון', before: 6, after: 2, location: 'טבור' }
        ],
        comments: 'שרה מדווחת על שיפור ניכר. ישנה טוב יותר ופחות כאבי גב.',
        generalNotes: ''
      },

      // Luna (cat) — 2 sessions
      {
        clientId: clientIds[1],
        date: daysAgo(40),
        sessionType: 'proxy',
        issues: [
          { name: 'חרדה', emotion: 'חרדה', before: 9, after: 5, location: 'כללי' },
          { name: 'פחד', emotion: 'פחד', before: 8, after: 4, location: 'כללי' }
        ],
        comments: 'טיפול פרוקסי. לונה מסתתרת מתחת למיטה מאז המעבר. הבעלים מדווחת על שיפור קל.',
        generalNotes: 'מעבר דירה לפני חודשיים'
      },
      {
        clientId: clientIds[1],
        date: daysAgo(18),
        sessionType: 'proxy',
        issues: [
          { name: 'חרדה', emotion: 'חרדה', before: 5, after: 2, location: 'כללי' }
        ],
        comments: 'לונה יצאה מתחת למיטה ומתחילה לשחק שוב. הבעלים שמחה מאוד.',
        generalNotes: ''
      },

      // David R. — 1 session
      {
        clientId: clientIds[2],
        date: daysAgo(5),
        sessionType: 'inPerson',
        issues: [
          { name: 'דאגה כרונית', emotion: 'דאגה', before: 8, after: 5, location: 'ראש' },
          { name: 'כעס ישן', emotion: 'כעס', before: 7, after: 4, location: 'כבד' }
        ],
        comments: 'מפגש ראשון. דוד מדווח על קושי להירדם כבר שנתיים. זיהינו חומת לב.',
        generalNotes: 'התחלנו תהליך של שחרור חומת הלב'
      }
    ];
  }

  // --- Seed data into demo database ---
  async function seedDemoData() {
    try {
      // Check if data already exists
      var existingClients = await window.PortfolioDB.getAllClients();
      if (existingClients.length > 0) {
        // Data already seeded — just refresh the view
        await loadOverview();
        return;
      }

      var sampleClients = getSampleClients();
      var clientIds = [];

      for (var i = 0; i < sampleClients.length; i++) {
        var id = await window.PortfolioDB.addClient(sampleClients[i]);
        clientIds.push(id);
      }

      var sampleSessions = getSampleSessions(clientIds);
      for (var j = 0; j < sampleSessions.length; j++) {
        await window.PortfolioDB.addSession(sampleSessions[j]);
      }

      // Refresh the overview to show seeded data
      await loadOverview();
    } catch (err) {
      console.warn('Demo data seeding failed:', err);
    }
  }

  // --- Hide elements not relevant for demo ---
  function hideNonDemoElements() {
    // Hide export/import buttons
    var exportBtn = document.getElementById('exportBtn');
    var importLabel = document.querySelector('.import-label');
    var addClientBtn = document.getElementById('addClientBtn');
    var addSessionBtn = document.getElementById('addSessionBtn');

    if (exportBtn) exportBtn.style.display = 'none';
    if (importLabel) importLabel.style.display = 'none';
    if (addClientBtn) addClientBtn.style.display = 'none';
    if (addSessionBtn) addSessionBtn.style.display = 'none';

    // Hide nav (demo is dashboard-only)
    var navPlaceholder = document.getElementById('nav-placeholder');
    if (navPlaceholder) navPlaceholder.style.display = 'none';

    // Hide language selector in demo (parent page controls language)
    var langSelect = document.getElementById('languageSelect');
    if (langSelect) langSelect.parentElement.style.display = 'none';

    // In the modal, redirect edit/add session buttons to show a tooltip instead
    var modalEdit = document.getElementById('modalEditClient');
    var modalAddSession = document.getElementById('modalAddSession');
    if (modalEdit) {
      modalEdit.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        App.showToast(getDemoTooltipText());
      }, true);
    }
    if (modalAddSession) {
      modalAddSession.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        App.showToast(getDemoTooltipText());
      }, true);
    }
  }

  function getDemoTooltipText() {
    var lang = localStorage.getItem('portfolioLang') || 'he';
    var texts = {
      en: 'This feature is available in the full version',
      he: 'תכונה זו זמינה בגרסה המלאה',
      de: 'Diese Funktion ist in der Vollversion verfügbar',
      cs: 'Tato funkce je dostupná v plné verzi'
    };
    return texts[lang] || texts.en;
  }

  // --- Cleanup on page unload ---
  window.addEventListener('beforeunload', function() {
    try {
      indexedDB.deleteDatabase('demo_portfolio');
    } catch(e) {}
  });

  // --- Listen for language changes from parent or within ---
  document.addEventListener('app:language', function() {
    updateDemoBanner();
  });

  // Listen for postMessage from parent (landing page) for language sync
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'demo-lang') {
      var lang = event.data.lang;
      if (lang && window.App) {
        App.setLanguage(lang);
        updateDemoBanner();
      }
    }
  });

  // --- Initialize demo after overview.js DOMContentLoaded fires ---
  // overview.js uses DOMContentLoaded to call loadOverview(), so we wait
  // a tick after DOMContentLoaded to let it finish, then seed data
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      hideNonDemoElements();
      updateDemoBanner();
      // Wait for overview.js to finish its initialization
      setTimeout(function() {
        seedDemoData();
      }, 100);
    });
  } else {
    hideNonDemoElements();
    updateDemoBanner();
    setTimeout(function() {
      seedDemoData();
    }, 100);
  }

})();
