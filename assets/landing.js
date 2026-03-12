/* === LANDING PAGE LOGIC === */
/* Language switching, theme detection, smooth scroll */

// TODO: Replace this placeholder URL with your actual Lemon Squeezy checkout URL after creating the product.
// Format: https://YOURSTORE.lemonsqueezy.com/buy/VARIANT_ID
// You can find the checkout URL in your Lemon Squeezy dashboard under Products > Your Product > Share.
var LS_CHECKOUT_URL = 'https://YOURSTORE.lemonsqueezy.com/buy/VARIANT_ID';

/* ---------- i18n ---------- */
var LANDING_I18N = {
  en: {
    heroBadge: 'For Energy Healing Practitioners',
    heroTitle: 'Sessions Garden',
    heroTagline: 'Organize your therapeutic practice with complete privacy',
    heroSubtitle: 'A session tracking tool built for Emotion Code and Body Code practitioners. All data stays on your device — always.',
    heroCta: 'Get Sessions Garden — EUR 49',
    heroEnterApp: 'Already have a license?',
    featuresTitle: 'Everything you need. Nothing you don\'t.',
    featuresSubtitle: 'Built for practitioners who value simplicity, privacy, and focus.',
    features: [
      { icon: '🔒', title: 'Complete Privacy', desc: 'All data stored locally on your device. No cloud, no accounts, no data collection. The developer has zero access to your information.' },
      { icon: '📴', title: 'Works Offline', desc: 'Install as an app on any device. Works without internet after first setup — in your office, at home, anywhere.' },
      { icon: '🌍', title: '4 Languages', desc: 'Full support for English, Hebrew, German, and Czech. Complete right-to-left (RTL) layout for Hebrew.' },
      { icon: '📋', title: 'Session Tracking', desc: 'Track trapped emotions, severity levels, limiting beliefs, inherited energies, Heart-Wall, techniques, and more.' },
      { icon: '👥', title: 'Client Management', desc: 'Organise clients by type (Adult, Child, Animal), track referral sources, and add custom notes.' },
      { icon: '💾', title: 'Data Export', desc: 'Export all your data as a JSON backup at any time. Your data, your control, your device.' }
    ],
    pricingTitle: 'Simple, honest pricing',
    pricingSubtitle: 'One payment. Lifetime access. No surprises.',
    pricingBadge: 'One-time purchase',
    pricingPrice: 'EUR 49',
    pricingPriceSub: 'one-time payment',
    // TODO: Replace price with actual Lemon Squeezy price after product creation
    pricingNoSub: 'No subscription. No hidden fees.',
    pricingItems: [
      'Lifetime license — pay once, use forever',
      'Includes 3 device activations',
      'All 4 languages included',
      'Offline capability (PWA)',
      'All future updates',
      'Full data export at any time'
    ],
    pricingCta: 'Purchase Sessions Garden',
    pricingLicenseLink: 'Already have a license? Activate it here',
    impressumTitle: 'Impressum',
    impressumAngaben: 'Angaben gemäß DDG § 5',
    impressumNote: 'TODO: Generate your Impressum at https://www.e-recht24.de/impressum-generator.html and replace the placeholder below.',
    impressumPlaceholder: '[Full Legal Name]\n[Street Address]\n[City, Postal Code, Country]\nEmail: [Email Address]\nPhone: [Phone Number — optional]',
    datenschutzTitle: 'Privacy Policy / Datenschutzerklärung',
    datenschutzArt13Title: '1. Data Processing (GDPR Art. 13/14)',
    datenschutzArt13: 'Sessions Garden does not collect, store, or transmit any personal data. All session and client data is stored exclusively on your device using IndexedDB browser technology. The developer has zero access to your data.',
    datenschutzHostingTitle: '2. Hosting',
    datenschutzHosting: 'This website is hosted on Cloudflare Pages (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). Cloudflare may process access logs (IP address, browser type, timestamp) as part of standard web hosting operations. For details, see Cloudflare\'s privacy policy: https://www.cloudflare.com/privacypolicy/',
    datenschutzPaymentTitle: '3. Payment Processing',
    datenschutzPayment: 'Payments are processed by Lemon Squeezy (Lemon Squeezy, LLC), who acts as Merchant of Record. Purchase data (name, email, payment information) is handled by Lemon Squeezy. For details, see Lemon Squeezy\'s privacy policy: https://www.lemonsqueezy.com/privacy',
    datenschutzStorageTitle: '4. Local Storage',
    datenschutzStorage: 'This application uses localStorage for preferences (language, theme) and license activation status. No tracking cookies are used. All clinical data is stored in your browser\'s IndexedDB, accessible only on your device.',
    datenschutzRightsTitle: '5. Your Rights (GDPR Art. 15–21)',
    datenschutzRights: 'Right to access: your data is already on your device — open the app to see it. Right to deletion: clear your browser\'s site data to remove all stored information. Right to data portability: use the Export function in the app to download your data as a JSON file.',
    datenschutzNote: 'TODO: Run the full Datenschutzerklärung through https://www.adsimple.de/datenschutz-generator/ or https://www.e-recht24.de before launch for a finalized, lawyer-reviewed version.',
    footerTerms: 'Terms of Use',
    footerImpressum: 'Impressum',
    footerPrivacy: 'Privacy Policy',
    footerCopy: '© 2026 Sessions Garden',
    footerTagline: 'Made with care for therapeutic practitioners'
  },
  he: {
    heroBadge: 'לפרקטישנרים של ריפוי אנרגטי',
    heroTitle: 'Sessions Garden',
    heroTagline: 'ארגן את הפרקטיקה הטיפולית שלך עם פרטיות מלאה',
    heroSubtitle: 'כלי למעקב אחר טיפולים שנבנה עבור פרקטישנרים של Emotion Code ו-Body Code. כל הנתונים נשמרים במכשיר שלך — תמיד.',
    heroCta: 'קנה את Sessions Garden — 49 יורו',
    heroEnterApp: 'יש לך כבר רישיון?',
    featuresTitle: 'כל מה שצריך. כלום מה שלא.',
    featuresSubtitle: 'נבנה עבור פרקטישנרים שמעריכים פשטות, פרטיות, ומיקוד.',
    features: [
      { icon: '🔒', title: 'פרטיות מוחלטת', desc: 'כל הנתונים נשמרים באופן מקומי במכשיר שלך. אין ענן, אין חשבונות, אין איסוף נתונים. למפתח אין גישה למידע שלך.' },
      { icon: '📴', title: 'עובד ללא אינטרנט', desc: 'התקן כאפליקציה על כל מכשיר. עובד ללא אינטרנט לאחר ההגדרה הראשונית — במשרד, בבית, בכל מקום.' },
      { icon: '🌍', title: '4 שפות', desc: 'תמיכה מלאה בעברית, אנגלית, גרמנית וצ\'כית. פריסה מלאה מימין לשמאל לעברית.' },
      { icon: '📋', title: 'מעקב טיפולים', desc: 'עקוב אחר רגשות לכודים, רמות חומרה, אמונות מגבילות, אנרגיות תורשתיות, חומת לב, טכניקות ועוד.' },
      { icon: '👥', title: 'ניהול מטופלים', desc: 'ארגן מטופלים לפי סוג (מבוגר, ילד, חיה), עקוב אחר מקורות הפנייה, והוסף הערות מותאמות.' },
      { icon: '💾', title: 'ייצוא נתונים', desc: 'ייצא את כל הנתונים שלך כגיבוי JSON בכל עת. הנתונים שלך, השליטה שלך, המכשיר שלך.' }
    ],
    pricingTitle: 'תמחור פשוט וישר',
    pricingSubtitle: 'תשלום אחד. גישה לכל החיים. ללא הפתעות.',
    pricingBadge: 'רכישה חד-פעמית',
    pricingPrice: '49 יורו',
    pricingPriceSub: 'תשלום חד-פעמי',
    pricingNoSub: 'ללא מנוי. ללא עמלות נסתרות.',
    pricingItems: [
      'רישיון לכל החיים — שלם פעם אחת, השתמש לנצח',
      'כולל 3 הפעלות מכשיר',
      'כל 4 השפות כלולות',
      'יכולת עבודה ללא אינטרנט (PWA)',
      'כל העדכונים העתידיים',
      'ייצוא נתונים מלא בכל עת'
    ],
    pricingCta: 'רכוש את Sessions Garden',
    pricingLicenseLink: 'יש לך כבר רישיון? הפעל אותו כאן',
    impressumTitle: 'Impressum',
    impressumAngaben: 'Angaben gemäß DDG § 5',
    impressumNote: 'TODO: Generate your Impressum at https://www.e-recht24.de/impressum-generator.html',
    impressumPlaceholder: '[Full Legal Name]\n[Street Address]\n[City, Postal Code, Country]\nEmail: [Email Address]\nPhone: [Phone Number — optional]',
    datenschutzTitle: 'מדיניות פרטיות / Datenschutzerklärung',
    datenschutzArt13Title: '1. עיבוד נתונים (GDPR Art. 13/14)',
    datenschutzArt13: 'Sessions Garden אינו אוסף, מאחסן או מעביר נתונים אישיים. כל נתוני הטיפולים והלקוחות נשמרים באופן בלעדי במכשיר שלך באמצעות טכנולוגיית IndexedDB של הדפדפן. למפתח אין גישה לנתונים שלך.',
    datenschutzHostingTitle: '2. אחסון אתר',
    datenschutzHosting: 'אתר זה מתארח ב-Cloudflare Pages (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). Cloudflare עשויה לעבד יומני גישה (כתובת IP, סוג דפדפן, חותמת זמן) כחלק מפעולות אחסון אתר רגילות. לפרטים, ראה מדיניות הפרטיות של Cloudflare: https://www.cloudflare.com/privacypolicy/',
    datenschutzPaymentTitle: '3. עיבוד תשלומים',
    datenschutzPayment: 'תשלומים מעובדים על ידי Lemon Squeezy (Lemon Squeezy, LLC), הפועל כ-Merchant of Record. נתוני הרכישה (שם, דוא"ל, פרטי תשלום) מטופלים על ידי Lemon Squeezy. לפרטים, ראה מדיניות הפרטיות של Lemon Squeezy: https://www.lemonsqueezy.com/privacy',
    datenschutzStorageTitle: '4. אחסון מקומי',
    datenschutzStorage: 'אפליקציה זו משתמשת ב-localStorage להגדרות (שפה, ערכת נושא) וסטטוס הפעלת רישיון. לא נעשה שימוש בעוגיות מעקב. כל הנתונים הקליניים נשמרים ב-IndexedDB של הדפדפן שלך, נגיש רק במכשיר שלך.',
    datenschutzRightsTitle: '5. הזכויות שלך (GDPR Art. 15–21)',
    datenschutzRights: 'זכות גישה: הנתונים שלך כבר נמצאים במכשיר שלך — פתח את האפליקציה לצפייה. זכות מחיקה: נקה את נתוני האתר של הדפדפן שלך להסרת כל המידע המאוחסן. זכות ניידות נתונים: השתמש בפונקציית הייצוא באפליקציה להורדת הנתונים שלך כקובץ JSON.',
    datenschutzNote: 'TODO: Run through https://www.adsimple.de/datenschutz-generator/ before launch for finalized version.',
    footerTerms: 'תנאי שימוש',
    footerImpressum: 'Impressum',
    footerPrivacy: 'מדיניות פרטיות',
    footerCopy: '© 2026 Sessions Garden',
    footerTagline: 'נבנה בטיפול עבור פרקטישנרים טיפוליים'
  },
  de: {
    heroBadge: 'Für Energie-Heilpraktiker',
    heroTitle: 'Sessions Garden',
    heroTagline: 'Organisiere deine therapeutische Praxis mit vollständigem Datenschutz',
    heroSubtitle: 'Ein Sitzungsverfolgungstool für Emotion Code- und Body Code-Praktiker. Alle Daten bleiben auf deinem Gerät — immer.',
    heroCta: 'Sessions Garden kaufen — 49 EUR',
    heroEnterApp: 'Hast du bereits eine Lizenz?',
    featuresTitle: 'Alles, was du brauchst. Nichts, was du nicht brauchst.',
    featuresSubtitle: 'Gebaut für Praktiker, die Einfachheit, Datenschutz und Fokus schätzen.',
    features: [
      { icon: '🔒', title: 'Vollständiger Datenschutz', desc: 'Alle Daten werden lokal auf deinem Gerät gespeichert. Keine Cloud, keine Konten, keine Datenerhebung. Der Entwickler hat keinen Zugriff auf deine Informationen.' },
      { icon: '📴', title: 'Offline nutzbar', desc: 'Als App auf jedem Gerät installieren. Funktioniert nach der ersten Einrichtung ohne Internet — im Büro, zu Hause, überall.' },
      { icon: '🌍', title: '4 Sprachen', desc: 'Vollständige Unterstützung für Deutsch, Englisch, Hebräisch und Tschechisch. Vollständiges Rechts-nach-Links-Layout für Hebräisch.' },
      { icon: '📋', title: 'Sitzungsverfolgung', desc: 'Verfolge eingeschlossene Emotionen, Schweregrade, einschränkende Überzeugungen, vererbte Energien, die Herzwand, Techniken und mehr.' },
      { icon: '👥', title: 'Klientenverwaltung', desc: 'Klienten nach Typ (Erwachsener, Kind, Tier) organisieren, Empfehlungsquellen verfolgen und individuelle Notizen hinzufügen.' },
      { icon: '💾', title: 'Datenexport', desc: 'Exportiere alle deine Daten jederzeit als JSON-Backup. Deine Daten, deine Kontrolle, dein Gerät.' }
    ],
    pricingTitle: 'Einfache, ehrliche Preisgestaltung',
    pricingSubtitle: 'Eine Zahlung. Lebenslanger Zugang. Keine Überraschungen.',
    pricingBadge: 'Einmaliger Kauf',
    pricingPrice: '49 EUR',
    pricingPriceSub: 'Einmalzahlung',
    pricingNoSub: 'Kein Abonnement. Keine versteckten Gebühren.',
    pricingItems: [
      'Lebenslange Lizenz — einmal zahlen, für immer nutzen',
      'Inklusive 3 Geräteaktivierungen',
      'Alle 4 Sprachen enthalten',
      'Offline-Fähigkeit (PWA)',
      'Alle zukünftigen Updates',
      'Vollständiger Datenexport jederzeit'
    ],
    pricingCta: 'Sessions Garden kaufen',
    pricingLicenseLink: 'Hast du bereits eine Lizenz? Hier aktivieren',
    impressumTitle: 'Impressum',
    impressumAngaben: 'Angaben gemäß DDG § 5',
    impressumNote: 'TODO: Impressum unter https://www.e-recht24.de/impressum-generator.html generieren und den Platzhalter unten ersetzen.',
    impressumPlaceholder: '[Vollständiger rechtlicher Name]\n[Straße, Hausnummer]\n[Stadt, PLZ, Land]\nE-Mail: [E-Mail-Adresse]\nTelefon: [Telefonnummer — optional]',
    datenschutzTitle: 'Datenschutzerklärung',
    datenschutzArt13Title: '1. Datenverarbeitung (DSGVO Art. 13/14)',
    datenschutzArt13: 'Sessions Garden erhebt, speichert oder überträgt keine personenbezogenen Daten. Alle Sitzungs- und Klientendaten werden ausschließlich auf deinem Gerät mittels IndexedDB-Browsertechnologie gespeichert. Der Entwickler hat keinerlei Zugriff auf deine Daten.',
    datenschutzHostingTitle: '2. Hosting',
    datenschutzHosting: 'Diese Website wird auf Cloudflare Pages gehostet (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). Cloudflare kann im Rahmen des standardmäßigen Webhosting-Betriebs Zugriffsprotokolle (IP-Adresse, Browsertyp, Zeitstempel) verarbeiten. Details findest du in der Datenschutzerklärung von Cloudflare: https://www.cloudflare.com/privacypolicy/',
    datenschutzPaymentTitle: '3. Zahlungsabwicklung',
    datenschutzPayment: 'Zahlungen werden von Lemon Squeezy (Lemon Squeezy, LLC) als Merchant of Record abgewickelt. Kaufdaten (Name, E-Mail, Zahlungsinformationen) werden von Lemon Squeezy verarbeitet. Details findest du in der Datenschutzerklärung von Lemon Squeezy: https://www.lemonsqueezy.com/privacy',
    datenschutzStorageTitle: '4. Lokale Speicherung',
    datenschutzStorage: 'Diese Anwendung nutzt localStorage für Einstellungen (Sprache, Theme) und den Lizenzaktivierungsstatus. Es werden keine Tracking-Cookies verwendet. Alle klinischen Daten werden im IndexedDB deines Browsers gespeichert und sind nur auf deinem Gerät zugänglich.',
    datenschutzRightsTitle: '5. Deine Rechte (DSGVO Art. 15–21)',
    datenschutzRights: 'Auskunftsrecht: Deine Daten befinden sich bereits auf deinem Gerät — öffne die App zur Einsichtnahme. Recht auf Löschung: Lösche die Website-Daten deines Browsers, um alle gespeicherten Informationen zu entfernen. Recht auf Datenübertragbarkeit: Nutze die Exportfunktion in der App, um deine Daten als JSON-Datei herunterzuladen.',
    datenschutzNote: 'TODO: Vollständige Datenschutzerklärung vor dem Launch über https://www.adsimple.de/datenschutz-generator/ oder https://www.e-recht24.de generieren und anwaltlich prüfen lassen.',
    footerTerms: 'Nutzungsbedingungen',
    footerImpressum: 'Impressum',
    footerPrivacy: 'Datenschutzerklärung',
    footerCopy: '© 2026 Sessions Garden',
    footerTagline: 'Mit Sorgfalt für therapeutische Praktiker entwickelt'
  },
  cs: {
    heroBadge: 'Pro energetické léčitele',
    heroTitle: 'Sessions Garden',
    heroTagline: 'Organizujte svou terapeutickou praxi s naprostým soukromím',
    heroSubtitle: 'Nástroj pro sledování sezení vytvořený pro praktiky Emotion Code a Body Code. Všechna data zůstávají na vašem zařízení — vždy.',
    heroCta: 'Získat Sessions Garden — 49 EUR',
    heroEnterApp: 'Máte již licenci?',
    featuresTitle: 'Vše, co potřebujete. Nic, co nepotřebujete.',
    featuresSubtitle: 'Vytvořeno pro praktiky, kteří si cení jednoduchosti, soukromí a soustředění.',
    features: [
      { icon: '🔒', title: 'Naprosté soukromí', desc: 'Všechna data jsou uložena lokálně na vašem zařízení. Žádný cloud, žádné účty, žádné shromažďování dat. Vývojář nemá přístup k vašim informacím.' },
      { icon: '📴', title: 'Funguje offline', desc: 'Nainstalujte jako aplikaci na jakémkoli zařízení. Funguje bez internetu po prvním nastavení — v kanceláři, doma, kdekoliv.' },
      { icon: '🌍', title: '4 jazyky', desc: 'Plná podpora pro češtinu, angličtinu, hebrejštinu a němčinu. Kompletní rozvržení zprava doleva pro hebrejštinu.' },
      { icon: '📋', title: 'Sledování sezení', desc: 'Sledujte uvězněné emoce, stupně závažnosti, omezující přesvědčení, zděděné energie, srdeční zeď, techniky a další.' },
      { icon: '👥', title: 'Správa klientů', desc: 'Organizujte klienty podle typu (dospělý, dítě, zvíře), sledujte zdroje doporučení a přidávejte vlastní poznámky.' },
      { icon: '💾', title: 'Export dat', desc: 'Exportujte všechna svá data jako zálohu JSON kdykoliv. Vaše data, vaše kontrola, vaše zařízení.' }
    ],
    pricingTitle: 'Jednoduché, poctivé ceny',
    pricingSubtitle: 'Jedna platba. Doživotní přístup. Žádná překvapení.',
    pricingBadge: 'Jednorázový nákup',
    pricingPrice: '49 EUR',
    pricingPriceSub: 'jednorázová platba',
    pricingNoSub: 'Žádné předplatné. Žádné skryté poplatky.',
    pricingItems: [
      'Doživotní licence — zaplaťte jednou, používejte navždy',
      'Zahrnuje 3 aktivace zařízení',
      'Všechny 4 jazyky v ceně',
      'Offline schopnost (PWA)',
      'Všechny budoucí aktualizace',
      'Plný export dat kdykoliv'
    ],
    pricingCta: 'Koupit Sessions Garden',
    pricingLicenseLink: 'Máte již licenci? Aktivujte ji zde',
    impressumTitle: 'Impressum',
    impressumAngaben: 'Angaben gemäß DDG § 5',
    impressumNote: 'TODO: Generate your Impressum at https://www.e-recht24.de/impressum-generator.html',
    impressumPlaceholder: '[Celé právní jméno]\n[Ulice, číslo popisné]\n[Město, PSČ, Země]\nE-mail: [E-mailová adresa]\nTelefon: [Telefonní číslo — volitelné]',
    datenschutzTitle: 'Zásady ochrany osobních údajů / Datenschutzerklärung',
    datenschutzArt13Title: '1. Zpracování dat (GDPR čl. 13/14)',
    datenschutzArt13: 'Sessions Garden neshromažďuje, neukládá ani nepřenáší žádné osobní údaje. Všechna data sezení a klientů jsou uložena výhradně na vašem zařízení pomocí technologie IndexedDB prohlížeče. Vývojář nemá přístup k vašim datům.',
    datenschutzHostingTitle: '2. Hosting',
    datenschutzHosting: 'Tato webová stránka je hostována na Cloudflare Pages (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). Cloudflare může v rámci standardního webhostingového provozu zpracovávat přístupové protokoly (IP adresa, typ prohlížeče, časové razítko). Podrobnosti naleznete v zásadách ochrany osobních údajů Cloudflare: https://www.cloudflare.com/privacypolicy/',
    datenschutzPaymentTitle: '3. Zpracování plateb',
    datenschutzPayment: 'Platby zpracovává Lemon Squeezy (Lemon Squeezy, LLC) jako Merchant of Record. Nákupní data (jméno, e-mail, platební informace) jsou zpracovávána společností Lemon Squeezy. Podrobnosti naleznete v zásadách ochrany osobních údajů Lemon Squeezy: https://www.lemonsqueezy.com/privacy',
    datenschutzStorageTitle: '4. Lokální úložiště',
    datenschutzStorage: 'Tato aplikace používá localStorage pro nastavení (jazyk, motiv) a stav aktivace licence. Nepoužívají se žádné sledovací soubory cookie. Všechna klinická data jsou uložena v IndexedDB vašeho prohlížeče, přístupná pouze na vašem zařízení.',
    datenschutzRightsTitle: '5. Vaše práva (GDPR čl. 15–21)',
    datenschutzRights: 'Právo na přístup: vaše data jsou již na vašem zařízení — otevřete aplikaci pro jejich zobrazení. Právo na výmaz: vymažte data webu v prohlížeči pro odstranění všech uložených informací. Právo na přenositelnost dat: použijte funkci Export v aplikaci ke stažení dat jako souboru JSON.',
    datenschutzNote: 'TODO: Před spuštěním proveďte plné Datenschutzerklärung přes https://www.adsimple.de/datenschutz-generator/ pro finalizovanou verzi.',
    footerTerms: 'Podmínky použití',
    footerImpressum: 'Impressum',
    footerPrivacy: 'Zásady ochrany osobních údajů',
    footerCopy: '© 2026 Sessions Garden',
    footerTagline: 'Vytvořeno s péčí pro terapeutické praktiky'
  }
};

/* ---------- Language detection ---------- */
function detectLang() {
  try {
    var stored = localStorage.getItem('portfolioLang');
    if (stored && LANDING_I18N[stored]) return stored;
  } catch(e) {}
  var nav = (navigator.language || '').split('-')[0].toLowerCase();
  return LANDING_I18N[nav] ? nav : 'en';
}

/* ---------- Apply translations ---------- */
function applyLang(lang) {
  var t = LANDING_I18N[lang];
  if (!t) return;

  // Direction
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');

  // Hero
  setText('hero-badge', t.heroBadge);
  setText('hero-title', t.heroTitle);
  setText('hero-tagline', t.heroTagline);
  setText('hero-subtitle', t.heroSubtitle);
  setHref('hero-cta', LS_CHECKOUT_URL);
  setText2('hero-cta', t.heroCta);
  setHref('hero-enter-link', './license.html');
  setText2('hero-enter-link', t.heroEnterApp);

  // Features
  setText('features-title', t.featuresTitle);
  setText('features-subtitle', t.featuresSubtitle);
  var featureCards = document.querySelectorAll('.feature-card');
  t.features.forEach(function(f, i) {
    if (featureCards[i]) {
      var icon = featureCards[i].querySelector('.feature-icon');
      var title = featureCards[i].querySelector('h3');
      var desc = featureCards[i].querySelector('p');
      if (icon) icon.textContent = f.icon;
      if (title) title.textContent = f.title;
      if (desc) desc.textContent = f.desc;
    }
  });

  // Pricing
  setText('pricing-title', t.pricingTitle);
  setText('pricing-subtitle', t.pricingSubtitle);
  setText('pricing-badge', t.pricingBadge);
  setText('pricing-price', t.pricingPrice);
  setText('pricing-price-sub', t.pricingPriceSub);
  setText('pricing-no-sub', t.pricingNoSub);
  var priceItems = document.querySelectorAll('.pricing-features-list li');
  t.pricingItems.forEach(function(item, i) {
    if (priceItems[i]) priceItems[i].textContent = item;
  });
  setHref('pricing-cta', LS_CHECKOUT_URL);
  setText2('pricing-cta', t.pricingCta);
  setHref('pricing-license-link', './license.html');
  setText2('pricing-license-link', t.pricingLicenseLink);

  // Impressum
  setText('impressum-title', t.impressumTitle);
  setText('impressum-angaben', t.impressumAngaben);
  setText('impressum-note', t.impressumNote);
  setPreText('impressum-placeholder', t.impressumPlaceholder);

  // Datenschutz
  setText('datenschutz-title', t.datenschutzTitle);
  setText('datenschutz-art13-title', t.datenschutzArt13Title);
  setText('datenschutz-art13', t.datenschutzArt13);
  setText('datenschutz-hosting-title', t.datenschutzHostingTitle);
  setText('datenschutz-hosting', t.datenschutzHosting);
  setText('datenschutz-payment-title', t.datenschutzPaymentTitle);
  setText('datenschutz-payment', t.datenschutzPayment);
  setText('datenschutz-storage-title', t.datenschutzStorageTitle);
  setText('datenschutz-storage', t.datenschutzStorage);
  setText('datenschutz-rights-title', t.datenschutzRightsTitle);
  setText('datenschutz-rights', t.datenschutzRights);
  setText('datenschutz-note', t.datenschutzNote);

  // Footer
  setText2('footer-terms', t.footerTerms);
  setText2('footer-impressum-link', t.footerImpressum);
  setText2('footer-privacy-link', t.footerPrivacy);
  setText('footer-copy', t.footerCopy);
  setText('footer-tagline', t.footerTagline);
}

function setHref(id, href) {
  var el = document.getElementById(id);
  if (el) el.href = href;
}

function setPreText(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* Helpers */
function setText(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setText2(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ---------- Smooth scroll for anchor links ---------- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var targetId = this.getAttribute('href').slice(1);
      var target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/* ---------- Theme ---------- */
function applyTheme() {
  try {
    var theme = localStorage.getItem('portfolioTheme');
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch(e) {}
}

/* ---------- Language selector ---------- */
function initLangSelector() {
  var sel = document.getElementById('landingLangSelect');
  if (!sel) return;
  var lang = detectLang();
  sel.value = lang;
  applyLang(lang);

  sel.addEventListener('change', function() {
    var newLang = this.value;
    try { localStorage.setItem('portfolioLang', newLang); } catch(e) {}
    applyLang(newLang);
  });
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', function() {
  applyTheme();
  initLangSelector();
  initSmoothScroll();
});
