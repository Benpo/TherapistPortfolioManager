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
    heroTagline: 'Your sessions, your way. Anywhere, anytime.',
    heroSubtitle: 'Organize client sessions, emotions, imbalances, and healing notes — without the paper chaos. All data stays on your device — always.',
    heroCta: 'Get Sessions Garden — €119',
    heroEnterApp: 'Already have a license?',
    featuresTitle: 'Everything you need to focus on what matters — healing.',
    featuresSubtitle: 'No more paper shuffles. No more scattered files. Just clarity.',
    features: [
      { icon: '📁', title: 'Everything organized, nothing lost', desc: 'All your sessions and client history in one place — structured, organized, and easy to navigate. No more flipping through pages or scattered files.' },
      { icon: '🔒', title: 'Your clients\' trust, protected', desc: 'No cloud. No accounts. No tracking. Your client data never leaves your device.' },
      { icon: '📴', title: 'Your practice moves with you', desc: 'Works on your laptop, tablet, or clinic computer. Once installed — no internet needed.' },
      { icon: '✨', title: 'Tracks what other tools can\'t', desc: 'Energetic imbalances, limiting beliefs, inherited emotions, severity levels — designed to support the way energy healers actually work.' },
      { icon: '💰', title: 'No subscriptions. No surprises.', desc: 'One payment, lifetime access. Your tool doesn\'t expire, and neither does your license.' },
      { icon: '📝', title: 'Love your paper? Keep it.', desc: 'Keep writing during sessions if you prefer. Afterwards, summarize and organize everything digitally — so you can always find it later.' }
    ],
    whoForTitle: 'Who is Sessions Garden for?',
    whoForSubtitle: 'Perfect for practitioners of:',
    whoForItems: [
      'Energy healing',
      'Holistic therapy',
      'Muscle testing practices',
      'Kinesiology',
      'Energetic balancing methods',
      'Any modality that tracks emotions, imbalances, and client progress'
    ],
    soundFamiliarTitle: 'Sound familiar?',
    soundFamiliarItems: [
      'I have drawers full of session notes and it takes me forever to find what I need',
      'I flip through old pages before every session trying to remember what we did',
      'I keep client notes in random files on my computer and worry about privacy',
      'The tool I used during training is gone, and nothing else fits my workflow',
      'I want to go digital but don\'t know where to start',
      'I\'ve worked with paper for years — it works, but I wish I had a better way to summarize and find things later'
    ],
    soundFamiliarNote: 'Sessions Garden was built by a practitioner who faced every one of these problems. You can keep writing on paper during sessions — and organize everything digitally afterwards. At your pace, your way.',
    whyBuiltTitle: 'Why I built this',
    whyBuiltText: [
      'Hi, I\'m Sapphire — an energy healing practitioner.',
      'For years I documented sessions on paper, notebooks, and scattered files. When the digital tool I used during training was taken away, I went back to a drawer full of loose pages — and spent too long searching for past sessions every week.',
      'I couldn\'t find a tool that actually fit the way energy healers work. So I built one.',
      'Sessions Garden is the tool I wish existed when I started my practice.'
    ],
    pricingTitle: 'Simple, honest pricing',
    pricingSubtitle: 'One payment. Your tool forever.',
    pricingBadge: 'Launch price',
    pricingPriceOld: '€159',
    pricingPrice: '€119',
    pricingPriceSub: 'One-time payment · Launch pricing',
    pricingNoSub: 'Less than what most practitioners charge for a single session.',
    pricingItems: [
      'Lifetime license — pay once, use forever',
      '2 device activations',
      'All 4 languages included (English, Hebrew, German, Czech)',
      'Works offline (install as app)',
      'All future updates included',
      'Full data export at any time'
    ],
    pricingDataNote: 'Data is stored locally on each device and does not sync between them.',
    pricingCta: 'Get Sessions Garden — €119',
    pricingLicenseLink: 'Already have a license? Activate it here',
    faqTitle: 'Frequently asked questions',
    faqItems: [
      { q: 'Do I need internet to use it?', a: 'Only for the first setup and to activate your license. After that, Sessions Garden works fully offline.' },
      { q: 'Can I use it on multiple devices?', a: 'Your license includes 2 device activations. Note that data is stored locally and does not sync between devices.' },
      { q: 'Is my clients\' data safe?', a: 'Yes. All data is stored only on your device. Nothing is sent to any server. The developer has zero access to your information.' },
      { q: 'What healing methods does it support?', a: 'Sessions Garden is designed for energy healing practices and tracks sessions, emotions, physical imbalances, limiting beliefs, inherited energies, and more. It works for multiple energetic methods.' },
      { q: 'Can I still write on paper?', a: 'Absolutely. Many practitioners write during sessions and enter the summary into Sessions Garden afterwards. It\'s designed to fit your workflow, not replace it.' },
      { q: 'What if I switch devices?', a: 'You can activate your license on a new device. Remember to export your data from the old device first, as data is stored locally.' },
      { q: 'Is there a subscription?', a: 'No. One payment, lifetime access. No monthly fees, ever.' },
      { q: 'What if my computer breaks or gets lost?', a: 'Since all data is stored locally, it\'s important to regularly export your data using the built-in export function. This creates a backup file you can save anywhere safe (USB drive, email to yourself, etc.). Sessions Garden does not store your data in the cloud — which means full privacy, but also means you are responsible for keeping backups.' },
      { q: 'Can I restore my data on a new device?', a: 'Yes. Import your exported backup file into Sessions Garden on your new device and your sessions and clients will be restored.' },
      { q: 'Do you offer refunds?', a: 'Yes. If Sessions Garden doesn\'t fit your workflow, you can request a full refund within 14 days of purchase.' }
    ],
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
    heroBadge: 'למטפלים בריפוי אנרגטי',
    heroTitle: 'Sessions Garden',
    heroTagline: 'הפגישות שלך, בדרך שלך. בכל מקום, בכל זמן.',
    heroSubtitle: 'ארגני פגישות, רגשות, חוסרי איזון ותיעוד ריפוי — בלי הכאוס של הנייר. כל הנתונים נשמרים במכשיר שלך — תמיד.',
    heroCta: 'קני את Sessions Garden — €119',
    heroEnterApp: 'יש לך כבר רישיון?',
    featuresTitle: 'כל מה שצריך כדי להתמקד במה שחשוב — ריפוי.',
    featuresSubtitle: 'אין יותר ערימות נייר. אין יותר קבצים מפוזרים. רק בהירות.',
    features: [
      { icon: '📁', title: 'הכל מסודר, כלום לא אבד', desc: 'כל הפגישות ורשומות הלקוחות שלך במקום אחד — מובנה, מסודר, וקל לניווט. אין יותר דפדוף בדפים ישנים או קבצים מפוזרים.' },
      { icon: '🔒', title: 'האמון של הלקוחות שלך, מוגן', desc: 'ללא ענן. ללא חשבונות. ללא מעקב. נתוני הלקוחות שלך לא עוזבים את המכשיר שלך.' },
      { icon: '📴', title: 'הפרקטיקה שלך עוברת איתך', desc: 'עובד על המחשב הנייד, הטאבלט או מחשב הקליניקה שלך. אחרי ההתקנה — לא נדרש אינטרנט.' },
      { icon: '✨', title: 'עוקב אחרי מה שכלים אחרים לא יכולים', desc: 'חוסרי איזון אנרגטיים, אמונות מגבילות, רגשות תורשתיים, רמות חומרה — מיועד לתמוך בדרך שבה מטפלים אנרגטיים עובדים.' },
      { icon: '💰', title: 'ללא מנויים. ללא הפתעות.', desc: 'תשלום אחד, גישה לכל החיים. הכלי שלך לא פג, ואף הרישיון שלך.' },
      { icon: '📝', title: 'אוהבת את הנייר? המשיכי.', desc: 'המשיכי לכתוב בפגישות אם זה נוח לך. אחר כך, סכמי ותארגני הכל דיגיטלית — כדי שתוכלי תמיד למצוא את זה מאוחר יותר.' }
    ],
    whoForTitle: 'למי מיועד Sessions Garden?',
    whoForSubtitle: 'מושלם עבור מטפלים ב:',
    whoForItems: [
      'ריפוי אנרגטי',
      'טיפול הוליסטי',
      'שיטות בדיקת שרירים',
      'קינסיולוגיה',
      'שיטות איזון אנרגטי',
      'כל שיטה שעוקבת אחר רגשות, חוסרי איזון והתקדמות לקוחות'
    ],
    soundFamiliarTitle: 'נשמע מוכר?',
    soundFamiliarItems: [
      'יש לי מגירות מלאות בתיעוד פגישות ולוקח לי נצח למצוא מה שצריך',
      'אני מדפדפת בדפים ישנים לפני כל פגישה כדי להיזכר מה עשינו',
      'אני שומרת תיעוד לקוחות בקבצים אקראיים במחשב ומודאגת מהפרטיות',
      'הכלי שהשתמשתי בו בזמן ההכשרה נעלם, ואין שום דבר אחר שמתאים לזרימת העבודה שלי',
      'אני רוצה לעבור לדיגיטל אבל לא יודעת איפה להתחיל',
      'עבדתי עם נייר שנים — זה עובד, אבל הייתי רוצה דרך טובה יותר לסכם ולמצוא דברים אחר כך'
    ],
    soundFamiliarNote: 'Sessions Garden נבנה על ידי מטפלת שחוותה כל אחת מהבעיות האלו. את יכולה להמשיך לכתוב על נייר בפגישות — ולארגן הכל דיגיטלית אחר כך. בקצב שלך, בדרך שלך.',
    whyBuiltTitle: 'למה בניתי את זה',
    whyBuiltText: [
      'היי, אני Sapphire — מטפלת בריפוי אנרגטי.',
      'במשך שנים תיעדתי פגישות על נייר, במחברות ובקבצים מפוזרים. כשהכלי הדיגיטלי שהשתמשתי בו בזמן ההכשרה נלקח, חזרתי למגירה מלאה בדפים — ובכל שבוע בזבזתי יותר מדי זמן בחיפוש אחר פגישות ישנות.',
      'לא מצאתי כלי שבאמת מתאים לדרך שבה מטפלים אנרגטיים עובדים. אז בניתי אחד.',
      'Sessions Garden הוא הכלי שהייתי רוצה שיהיה קיים כשהתחלתי את הפרקטיקה שלי.'
    ],
    pricingTitle: 'תמחור פשוט וישר',
    pricingSubtitle: 'תשלום אחד. הכלי שלך לצמיתות.',
    pricingBadge: 'מחיר השקה',
    pricingPriceOld: '€159',
    pricingPrice: '€119',
    pricingPriceSub: 'תשלום חד-פעמי · מחיר השקה',
    pricingNoSub: 'פחות ממה שרוב המטפלים גובים עבור טיפול אחד.',
    pricingItems: [
      'רישיון לכל החיים — שלמי פעם אחת, השתמשי לנצח',
      '2 הפעלות מכשיר',
      'כל 4 השפות כלולות (אנגלית, עברית, גרמנית, צ\'כית)',
      'עובד ללא אינטרנט (התקנה כאפליקציה)',
      'כל העדכונים העתידיים כלולים',
      'ייצוא נתונים מלא בכל עת'
    ],
    pricingDataNote: 'הנתונים נשמרים באופן מקומי בכל מכשיר ואינם מסתנכרנים בין מכשירים.',
    pricingCta: 'קני את Sessions Garden — €119',
    pricingLicenseLink: 'יש לך כבר רישיון? הפעילי אותו כאן',
    faqTitle: 'שאלות נפוצות',
    faqItems: [
      { q: 'האם אני צריכה אינטרנט כדי להשתמש?', a: 'רק להגדרה הראשונית ולהפעלת הרישיון. אחרי זה, Sessions Garden עובד לחלוטין ללא אינטרנט.' },
      { q: 'האם אני יכולה להשתמש על כמה מכשירים?', a: 'הרישיון שלך כולל 2 הפעלות מכשיר. שימי לב שהנתונים נשמרים מקומית ואינם מסתנכרנים בין מכשירים.' },
      { q: 'האם הנתונים של הלקוחות שלי בטוחים?', a: 'כן. כל הנתונים נשמרים רק במכשיר שלך. שום דבר לא נשלח לשרת כלשהו. למפתחת אין גישה למידע שלך.' },
      { q: 'אילו שיטות ריפוי הוא תומך?', a: 'Sessions Garden מיועד לפרקטיקות ריפוי אנרגטי ועוקב אחר פגישות, רגשות, חוסרי איזון פיזיים, אמונות מגבילות, אנרגיות תורשתיות ועוד. הוא עובד לשיטות אנרגטיות מרובות.' },
      { q: 'האם אני עדיין יכולה לכתוב על נייר?', a: 'בהחלט. מטפלים רבים כותבים בפגישות ומזינים את הסיכום ל-Sessions Garden אחר כך. הוא מיועד להתאים לזרימת העבודה שלך, לא להחליפה.' },
      { q: 'מה אם אני מחליפה מכשיר?', a: 'את יכולה להפעיל את הרישיון שלך על מכשיר חדש. זכרי לייצא את הנתונים שלך מהמכשיר הישן תחילה, מכיוון שהנתונים נשמרים מקומית.' },
      { q: 'האם יש מנוי?', a: 'לא. תשלום אחד, גישה לכל החיים. ללא עמלות חודשיות, לעולם.' },
      { q: 'מה אם המחשב שלי נשבר או אבד?', a: 'מכיוון שכל הנתונים נשמרים מקומית, חשוב לייצא את הנתונים שלך באופן קבוע. זה יוצר קובץ גיבוי שאת יכולה לשמור בכל מקום בטוח (כונן USB, מייל לעצמך וכד\'). Sessions Garden לא מאחסן את הנתונים שלך בענן — מה שמאפשר פרטיות מלאה, אבל גם אחריות לשמירת גיבויים.' },
      { q: 'האם אני יכולה לשחזר נתונים על מכשיר חדש?', a: 'כן. ייבאי את קובץ הגיבוי שלך ל-Sessions Garden על המכשיר החדש, והפגישות והלקוחות שלך ישוחזרו.' },
      { q: 'האם יש החזרים?', a: 'כן. אם Sessions Garden לא מתאים לזרימת העבודה שלך, את יכולה לבקש החזר מלא תוך 14 ימים מהרכישה.' }
    ],
    impressumTitle: 'Impressum',
    impressumAngaben: 'Angaben gemäß DDG § 5',
    impressumNote: 'TODO: Generate your Impressum at https://www.e-recht24.de/impressum-generator.html and replace the placeholder below.',
    impressumPlaceholder: '[Full Legal Name]\n[Street Address]\n[City, Postal Code, Country]\nEmail: [Email Address]\nPhone: [Phone Number — optional]',
    datenschutzTitle: 'מדיניות פרטיות / Datenschutzerklärung',
    datenschutzArt13Title: '1. עיבוד נתונים (GDPR Art. 13/14)',
    datenschutzArt13: 'Sessions Garden אינו אוסף, מאחסן או מעביר נתונים אישיים. כל נתוני הפגישות והלקוחות נשמרים באופן בלעדי במכשיר שלך באמצעות טכנולוגיית IndexedDB של הדפדפן. למפתחת אין גישה לנתונים שלך.',
    datenschutzHostingTitle: '2. אחסון אתר',
    datenschutzHosting: 'אתר זה מתארח ב-Cloudflare Pages (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). Cloudflare עשויה לעבד יומני גישה (כתובת IP, סוג דפדפן, חותמת זמן) כחלק מפעולות אחסון אתר רגילות. לפרטים, ראי את מדיניות הפרטיות של Cloudflare: https://www.cloudflare.com/privacypolicy/',
    datenschutzPaymentTitle: '3. עיבוד תשלומים',
    datenschutzPayment: 'תשלומים מעובדים על ידי Lemon Squeezy (Lemon Squeezy, LLC), הפועל כ-Merchant of Record. נתוני הרכישה (שם, דוא"ל, פרטי תשלום) מטופלים על ידי Lemon Squeezy. לפרטים, ראי את מדיניות הפרטיות של Lemon Squeezy: https://www.lemonsqueezy.com/privacy',
    datenschutzStorageTitle: '4. אחסון מקומי',
    datenschutzStorage: 'אפליקציה זו משתמשת ב-localStorage להגדרות (שפה, ערכת נושא) וסטטוס הפעלת רישיון. לא נעשה שימוש בעוגיות מעקב. כל הנתונים הקליניים נשמרים ב-IndexedDB של הדפדפן שלך, נגיש רק במכשיר שלך.',
    datenschutzRightsTitle: '5. הזכויות שלך (GDPR Art. 15–21)',
    datenschutzRights: 'זכות גישה: הנתונים שלך כבר נמצאים במכשיר שלך — פתחי את האפליקציה לצפייה. זכות מחיקה: נקי את נתוני האתר בדפדפן להסרת כל המידע המאוחסן. זכות ניידות נתונים: השתמשי בפונקציית הייצוא באפליקציה להורדת הנתונים כקובץ JSON.',
    datenschutzNote: 'TODO: Run the full Datenschutzerklärung through https://www.adsimple.de/datenschutz-generator/ before launch for a finalized version.',
    footerTerms: 'תנאי שימוש',
    footerImpressum: 'Impressum',
    footerPrivacy: 'מדיניות פרטיות',
    footerCopy: '© 2026 Sessions Garden',
    footerTagline: 'נבנה בטיפול עבור פרקטישנרים טיפוליים'
  },

  de: {
    heroBadge: 'Für Energie-Heilpraktiker',
    heroTitle: 'Sessions Garden',
    heroTagline: 'Deine Sitzungen, auf deine Weise. Überall, jederzeit.',
    heroSubtitle: 'Organisiere Klientensitzungen, Emotionen, Ungleichgewichte und Heilungsnotizen — ohne das Papierchaos. Alle Daten bleiben auf deinem Gerät — immer.',
    heroCta: 'Sessions Garden kaufen — €119',
    heroEnterApp: 'Hast du bereits eine Lizenz?',
    featuresTitle: 'Alles, was du brauchst, um dich auf das Wesentliche zu konzentrieren — Heilung.',
    featuresSubtitle: 'Kein Papierwirrwarr mehr. Keine verstreuten Dateien mehr. Nur Klarheit.',
    features: [
      { icon: '📁', title: 'Alles organisiert, nichts verloren', desc: 'Alle deine Sitzungen und die Klientenhistorie an einem Ort — strukturiert, geordnet und einfach zu navigieren. Kein Blättern mehr in alten Seiten oder verstreuten Dateien.' },
      { icon: '🔒', title: 'Das Vertrauen deiner Klienten, geschützt', desc: 'Keine Cloud. Keine Konten. Kein Tracking. Die Daten deiner Klienten verlassen niemals dein Gerät.' },
      { icon: '📴', title: 'Deine Praxis geht mit dir', desc: 'Funktioniert auf deinem Laptop, Tablet oder Praxiscomputer. Einmal installiert — kein Internet nötig.' },
      { icon: '✨', title: 'Verfolgt, was andere Tools nicht können', desc: 'Energetische Ungleichgewichte, einschränkende Überzeugungen, vererbte Emotionen, Schweregrade — entwickelt, um die Art zu unterstützen, wie Energie-Heilpraktiker wirklich arbeiten.' },
      { icon: '💰', title: 'Keine Abonnements. Keine Überraschungen.', desc: 'Eine Zahlung, lebenslanger Zugang. Dein Tool läuft nicht ab, deine Lizenz auch nicht.' },
      { icon: '📝', title: 'Papier lieben? Behalte es.', desc: 'Schreib während der Sitzungen weiter, wenn du das bevorzugst. Anschließend fasst du alles digital zusammen — damit du es später immer findest.' }
    ],
    whoForTitle: 'Für wen ist Sessions Garden?',
    whoForSubtitle: 'Perfekt für Praktiker von:',
    whoForItems: [
      'Energie-Heilarbeit',
      'Ganzheitlicher Therapie',
      'Muskeltestmethoden',
      'Kinesiologie',
      'Energetischen Ausgleichsmethoden',
      'Jeder Modalität, die Emotionen, Ungleichgewichte und Klientenfortschritt verfolgt'
    ],
    soundFamiliarTitle: 'Klingt das vertraut?',
    soundFamiliarItems: [
      'Ich habe Schubladen voller Sitzungsnotizen und es dauert ewig, das Richtige zu finden',
      'Ich blättere vor jeder Sitzung in alten Seiten, um mich zu erinnern, was wir gemacht haben',
      'Ich bewahre Klientennotizen in zufälligen Dateien auf meinem Computer auf und mache mir Sorgen um den Datenschutz',
      'Das Tool, das ich während meiner Ausbildung genutzt habe, ist weg, und nichts anderes passt zu meinem Workflow',
      'Ich möchte digital werden, weiß aber nicht, wo ich anfangen soll',
      'Ich arbeite seit Jahren mit Papier — es funktioniert, aber ich wünschte, ich hätte eine bessere Möglichkeit, Dinge zusammenzufassen und später zu finden'
    ],
    soundFamiliarNote: 'Sessions Garden wurde von einer Praktikerin entwickelt, die jedes dieser Probleme kannte. Du kannst während der Sitzungen weiter auf Papier schreiben — und anschließend alles digital organisieren. In deinem Tempo, auf deine Weise.',
    whyBuiltTitle: 'Warum ich das gebaut habe',
    whyBuiltText: [
      'Hallo, ich bin Sapphire — eine Energie-Heilpraktikerin.',
      'Jahrelang habe ich Sitzungen auf Papier, in Notizbüchern und verstreuten Dateien dokumentiert. Als das digitale Tool, das ich während meiner Ausbildung genutzt hatte, wegfiel, kehrte ich zu einer Schublade voller loser Seiten zurück — und verbrachte jede Woche zu viel Zeit mit der Suche nach vergangenen Sitzungen.',
      'Ich konnte kein Tool finden, das wirklich zur Arbeitsweise von Energie-Heilpraktikern passte. Also baute ich eines.',
      'Sessions Garden ist das Tool, das ich mir gewünscht hätte, als ich meine Praxis begann.'
    ],
    pricingTitle: 'Einfache, ehrliche Preisgestaltung',
    pricingSubtitle: 'Eine Zahlung. Dein Tool für immer.',
    pricingBadge: 'Einführungspreis',
    pricingPriceOld: '€159',
    pricingPrice: '€119',
    pricingPriceSub: 'Einmalzahlung · Einführungspreis',
    pricingNoSub: 'Weniger als das, was die meisten Praktiker für eine einzige Sitzung berechnen.',
    pricingItems: [
      'Lebenslange Lizenz — einmal zahlen, für immer nutzen',
      '2 Geräteaktivierungen',
      'Alle 4 Sprachen enthalten (Englisch, Hebräisch, Deutsch, Tschechisch)',
      'Offline nutzbar (als App installieren)',
      'Alle zukünftigen Updates enthalten',
      'Vollständiger Datenexport jederzeit'
    ],
    pricingDataNote: 'Daten werden lokal auf jedem Gerät gespeichert und synchronisieren nicht zwischen Geräten.',
    pricingCta: 'Sessions Garden kaufen — €119',
    pricingLicenseLink: 'Hast du bereits eine Lizenz? Hier aktivieren',
    faqTitle: 'Häufig gestellte Fragen',
    faqItems: [
      { q: 'Brauche ich Internet, um es zu nutzen?', a: 'Nur für die erste Einrichtung und zur Aktivierung deiner Lizenz. Danach funktioniert Sessions Garden vollständig offline.' },
      { q: 'Kann ich es auf mehreren Geräten verwenden?', a: 'Deine Lizenz umfasst 2 Geräteaktivierungen. Beachte, dass Daten lokal gespeichert werden und nicht zwischen Geräten synchronisiert werden.' },
      { q: 'Sind die Daten meiner Klienten sicher?', a: 'Ja. Alle Daten werden ausschließlich auf deinem Gerät gespeichert. Es wird nichts an Server übermittelt. Der Entwickler hat keinerlei Zugriff auf deine Informationen.' },
      { q: 'Welche Heilmethoden werden unterstützt?', a: 'Sessions Garden ist für energetische Heilpraktiken konzipiert und verfolgt Sitzungen, Emotionen, körperliche Ungleichgewichte, einschränkende Überzeugungen, vererbte Energien und mehr. Es funktioniert für mehrere energetische Methoden.' },
      { q: 'Kann ich weiterhin auf Papier schreiben?', a: 'Absolut. Viele Praktiker schreiben während der Sitzungen und geben die Zusammenfassung danach in Sessions Garden ein. Es ist darauf ausgelegt, deinen Workflow zu ergänzen, nicht zu ersetzen.' },
      { q: 'Was passiert, wenn ich das Gerät wechsle?', a: 'Du kannst deine Lizenz auf einem neuen Gerät aktivieren. Denke daran, zuerst deine Daten vom alten Gerät zu exportieren, da sie lokal gespeichert sind.' },
      { q: 'Gibt es ein Abonnement?', a: 'Nein. Eine Zahlung, lebenslanger Zugang. Keine monatlichen Gebühren, niemals.' },
      { q: 'Was passiert, wenn mein Computer kaputt geht oder verloren geht?', a: 'Da alle Daten lokal gespeichert sind, ist es wichtig, deine Daten regelmäßig mit der eingebauten Exportfunktion zu sichern. Sessions Garden speichert deine Daten nicht in der Cloud — das bedeutet vollständige Privatsphäre, aber auch eigene Verantwortung für Backups.' },
      { q: 'Kann ich meine Daten auf einem neuen Gerät wiederherstellen?', a: 'Ja. Importiere deine exportierte Backup-Datei in Sessions Garden auf deinem neuen Gerät — deine Sitzungen und Klienten werden wiederhergestellt.' },
      { q: 'Gibt es Rückerstattungen?', a: 'Ja. Wenn Sessions Garden nicht zu deinem Workflow passt, kannst du innerhalb von 14 Tagen nach dem Kauf eine vollständige Rückerstattung beantragen.' }
    ],
    impressumTitle: 'Impressum',
    impressumAngaben: 'Angaben gemäß DDG § 5',
    impressumNote: 'TODO: Impressum unter https://www.e-recht24.de/impressum-generator.html generieren und den Platzhalter unten ersetzen.',
    impressumPlaceholder: '[Vollständiger rechtlicher Name]\n[Straße, Hausnummer]\n[Stadt, PLZ, Land]\nE-Mail: [E-Mail-Adresse]\nTelefon: [Telefonnummer — optional]',
    datenschutzTitle: 'Datenschutzerklärung',
    datenschutzArt13Title: '1. Datenverarbeitung (DSGVO Art. 13/14)',
    datenschutzArt13: 'Sessions Garden erhebt, speichert oder überträgt keine personenbezogenen Daten. Alle Sitzungs- und Klientendaten werden ausschließlich auf deinem Gerät mittels IndexedDB-Browsertechnologie gespeichert. Der Entwickler hat keinerlei Zugriff auf deine Daten.',
    datenschutzHostingTitle: '2. Hosting',
    datenschutzHosting: 'Diese Website wird auf Cloudflare Pages gehostet (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). Cloudflare kann im Rahmen des standardmäßigen Webhosting-Betriebs Zugriffsprotokolle verarbeiten. Details: https://www.cloudflare.com/privacypolicy/',
    datenschutzPaymentTitle: '3. Zahlungsabwicklung',
    datenschutzPayment: 'Zahlungen werden von Lemon Squeezy (Lemon Squeezy, LLC) als Merchant of Record abgewickelt. Kaufdaten werden von Lemon Squeezy verarbeitet. Details: https://www.lemonsqueezy.com/privacy',
    datenschutzStorageTitle: '4. Lokale Speicherung',
    datenschutzStorage: 'Diese Anwendung nutzt localStorage für Einstellungen (Sprache, Theme) und den Lizenzaktivierungsstatus. Es werden keine Tracking-Cookies verwendet.',
    datenschutzRightsTitle: '5. Deine Rechte (DSGVO Art. 15–21)',
    datenschutzRights: 'Auskunftsrecht: Deine Daten befinden sich auf deinem Gerät — öffne die App zur Einsichtnahme. Recht auf Löschung: Lösche die Website-Daten deines Browsers. Recht auf Datenübertragbarkeit: Nutze die Exportfunktion in der App.',
    datenschutzNote: 'TODO: Vollständige Datenschutzerklärung vor dem Launch über https://www.adsimple.de/datenschutz-generator/ generieren lassen.',
    footerTerms: 'Nutzungsbedingungen',
    footerImpressum: 'Impressum',
    footerPrivacy: 'Datenschutzerklärung',
    footerCopy: '© 2026 Sessions Garden',
    footerTagline: 'Mit Sorgfalt für therapeutische Praktiker entwickelt'
  },

  cs: {
    heroBadge: 'Pro energetické léčitele',
    heroTitle: 'Sessions Garden',
    heroTagline: 'Vaše sezení, váš způsob. Kdekoliv, kdykoliv.',
    heroSubtitle: 'Organizujte klientská sezení, emoce, nerovnováhy a poznámky o léčení — bez papírového chaosu. Všechna data zůstávají na vašem zařízení — vždy.',
    heroCta: 'Získat Sessions Garden — €119',
    heroEnterApp: 'Máte již licenci?',
    featuresTitle: 'Vše, co potřebujete, abyste se soustředili na to podstatné — léčení.',
    featuresSubtitle: 'Žádné papírování navíc. Žádné rozházené soubory. Jen přehlednost.',
    features: [
      { icon: '📁', title: 'Vše uspořádáno, nic ztraceno', desc: 'Všechna vaše sezení a klientská historie na jednom místě — strukturovaně, uspořádaně a snadno přehledně. Konec listování ve starých stránkách nebo rozházených souborech.' },
      { icon: '🔒', title: 'Důvěra vašich klientů, chráněná', desc: 'Žádný cloud. Žádné účty. Žádné sledování. Data vašich klientů nikdy neopustí vaše zařízení.' },
      { icon: '📴', title: 'Vaše praxe jde s vámi', desc: 'Funguje na vašem notebooku, tabletu nebo klinickém počítači. Po instalaci — internet není potřeba.' },
      { icon: '✨', title: 'Sleduje to, co jiné nástroje nedokážou', desc: 'Energetické nerovnováhy, omezující přesvědčení, zděděné emoce, stupně závažnosti — navrženo pro způsob, jakým energetičtí léčitelé skutečně pracují.' },
      { icon: '💰', title: 'Žádná předplatná. Žádná překvapení.', desc: 'Jedna platba, celoživotní přístup. Váš nástroj nevyprší a vaše licence také ne.' },
      { icon: '📝', title: 'Milujete papír? Používejte ho.', desc: 'Pokračujte v psaní během sezení, pokud dáváte přednost. Pak vše shrňte a uspořádejte digitálně — abyste to vždy mohli najít.' }
    ],
    whoForTitle: 'Pro koho je Sessions Garden?',
    whoForSubtitle: 'Ideální pro praktiky:',
    whoForItems: [
      'Energetického léčení',
      'Holistické terapie',
      'Metod svalového testování',
      'Kinesiologie',
      'Metod energetického vyrovnávání',
      'Jakékoli metody, která sleduje emoce, nerovnováhy a pokrok klientů'
    ],
    soundFamiliarTitle: 'Zní to povědomě?',
    soundFamiliarItems: [
      'Mám zásuvky plné poznámek ze sezení a trvá mi věčnost, než najdu, co potřebuji',
      'Před každým sezením listuji v starých stránkách a snažím se vzpomenout, co jsme dělali',
      'Uchovávám poznámky o klientech v náhodných souborech v počítači a obávám se o soukromí',
      'Nástroj, který jsem používala při školení, je pryč, a nic jiného mi nevyhovuje',
      'Chci přejít na digitální, ale nevím, kde začít',
      'Roky pracuji s papírem — funguje to, ale přála bych si lepší způsob, jak shrnout a najít věci později'
    ],
    soundFamiliarNote: 'Sessions Garden byl vytvořen praktikantkou, která zažila každý z těchto problémů. Můžete pokračovat v psaní na papír během sezení — a vše uspořádat digitálně afterwards. Svým tempem, svým způsobem.',
    whyBuiltTitle: 'Proč jsem to postavila',
    whyBuiltText: [
      'Ahoj, jsem Sapphire — praktikantka energetického léčení.',
      'Roky jsem dokumentovala sezení na papíře, v poznámkových blocích a rozházených souborech. Když digitální nástroj, který jsem používala při školení, zmizel, vrátila jsem se ke zásuvce plné volných stránek — a každý týden jsem strávila příliš dlouho hledáním minulých sezení.',
      'Nemohla jsem najít nástroj, který by skutečně odpovídal způsobu práce energetických léčitelů. Tak jsem jeden vytvořila.',
      'Sessions Garden je nástroj, o kterém jsem si přála, aby existoval, když jsem začínala svou praxi.'
    ],
    pricingTitle: 'Jednoduché, poctivé ceny',
    pricingSubtitle: 'Jedna platba. Váš nástroj navždy.',
    pricingBadge: 'Zaváděcí cena',
    pricingPriceOld: '€159',
    pricingPrice: '€119',
    pricingPriceSub: 'Jednorázová platba · Zaváděcí cena',
    pricingNoSub: 'Méně než to, co většina praktiků účtuje za jediné sezení.',
    pricingItems: [
      'Doživotní licence — zaplaťte jednou, používejte navždy',
      '2 aktivace zařízení',
      'Všechny 4 jazyky v ceně (angličtina, hebrejština, němčina, čeština)',
      'Funguje offline (nainstalovat jako aplikaci)',
      'Všechny budoucí aktualizace v ceně',
      'Plný export dat kdykoliv'
    ],
    pricingDataNote: 'Data jsou uložena lokálně na každém zařízení a nesynchronizují se mezi zařízeními.',
    pricingCta: 'Koupit Sessions Garden — €119',
    pricingLicenseLink: 'Máte již licenci? Aktivujte ji zde',
    faqTitle: 'Často kladené dotazy',
    faqItems: [
      { q: 'Potřebuji internet k používání?', a: 'Pouze pro první nastavení a aktivaci licence. Poté Sessions Garden funguje plně offline.' },
      { q: 'Mohu ho používat na více zařízeních?', a: 'Vaše licence zahrnuje 2 aktivace zařízení. Upozorňujeme, že data jsou uložena lokálně a nesynchronizují se mezi zařízeními.' },
      { q: 'Jsou data mých klientů v bezpečí?', a: 'Ano. Všechna data jsou uložena pouze na vašem zařízení. Nic není odesláno na žádný server. Vývojář nemá přístup k vašim informacím.' },
      { q: 'Jaké metody léčení podporuje?', a: 'Sessions Garden je navržen pro energetické léčitelské praxe a sleduje sezení, emoce, fyzické nerovnováhy, omezující přesvědčení, zděděné energie a další. Funguje pro více energetických metod.' },
      { q: 'Mohu stále psát na papír?', a: 'Samozřejmě. Mnoho praktiků píše během sezení a poté zadá shrnutí do Sessions Garden. Je navržen tak, aby vyhovoval vašemu pracovnímu postupu, ne ho nahrazoval.' },
      { q: 'Co když si vyměním zařízení?', a: 'Licenci můžete aktivovat na novém zařízení. Nezapomeňte nejprve exportovat data ze starého zařízení, protože jsou uložena lokálně.' },
      { q: 'Je tam předplatné?', a: 'Ne. Jedna platba, celoživotní přístup. Žádné měsíční poplatky, nikdy.' },
      { q: 'Co když se mi počítač rozbije nebo ztratí?', a: 'Protože všechna data jsou uložena lokálně, je důležité pravidelně exportovat data pomocí vestavěné funkce exportu. Sessions Garden neuchovává vaše data v cloudu — to znamená plné soukromí, ale také odpovědnost za zálohy.' },
      { q: 'Mohu obnovit data na novém zařízení?', a: 'Ano. Importujte exportovaný záložní soubor do Sessions Garden na novém zařízení a vaše sezení a klienti budou obnoveni.' },
      { q: 'Nabízíte vrácení peněz?', a: 'Ano. Pokud Sessions Garden nevyhovuje vašemu pracovnímu postupu, můžete požádat o plnou náhradu do 14 dnů od nákupu.' }
    ],
    impressumTitle: 'Impressum',
    impressumAngaben: 'Angaben gemäß DDG § 5',
    impressumNote: 'TODO: Generate your Impressum at https://www.e-recht24.de/impressum-generator.html',
    impressumPlaceholder: '[Celé právní jméno]\n[Ulice, číslo popisné]\n[Město, PSČ, Země]\nE-mail: [E-mailová adresa]\nTelefon: [Telefonní číslo — volitelné]',
    datenschutzTitle: 'Zásady ochrany osobních údajů / Datenschutzerklärung',
    datenschutzArt13Title: '1. Zpracování dat (GDPR čl. 13/14)',
    datenschutzArt13: 'Sessions Garden neshromažďuje, neukládá ani nepřenáší žádné osobní údaje. Všechna data sezení a klientů jsou uložena výhradně na vašem zařízení pomocí technologie IndexedDB prohlížeče. Vývojář nemá přístup k vašim datům.',
    datenschutzHostingTitle: '2. Hosting',
    datenschutzHosting: 'Tato webová stránka je hostována na Cloudflare Pages (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). Podrobnosti: https://www.cloudflare.com/privacypolicy/',
    datenschutzPaymentTitle: '3. Zpracování plateb',
    datenschutzPayment: 'Platby zpracovává Lemon Squeezy (Lemon Squeezy, LLC) jako Merchant of Record. Podrobnosti: https://www.lemonsqueezy.com/privacy',
    datenschutzStorageTitle: '4. Lokální úložiště',
    datenschutzStorage: 'Tato aplikace používá localStorage pro nastavení (jazyk, motiv) a stav aktivace licence. Nepoužívají se žádné sledovací soubory cookie.',
    datenschutzRightsTitle: '5. Vaše práva (GDPR čl. 15–21)',
    datenschutzRights: 'Právo na přístup: vaše data jsou na vašem zařízení — otevřete aplikaci. Právo na výmaz: vymažte data webu v prohlížeči. Právo na přenositelnost: použijte funkci Export v aplikaci.',
    datenschutzNote: 'TODO: Před spuštěním proveďte Datenschutzerklärung přes https://www.adsimple.de/datenschutz-generator/ pro finalizovanou verzi.',
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

  // Who is it for
  setText('whofor-title', t.whoForTitle);
  setText('whofor-subtitle', t.whoForSubtitle);
  var whoForItems = document.querySelectorAll('.who-for-list li');
  t.whoForItems.forEach(function(item, i) {
    if (whoForItems[i]) whoForItems[i].textContent = item;
  });

  // Sound familiar
  setText('soundfamiliar-title', t.soundFamiliarTitle);
  var sfItems = document.querySelectorAll('.sound-familiar-list li');
  t.soundFamiliarItems.forEach(function(item, i) {
    if (sfItems[i]) sfItems[i].textContent = item;
  });
  setText('soundfamiliar-note', t.soundFamiliarNote);

  // Why I built this
  setText('whybuilt-title', t.whyBuiltTitle);
  var whyParas = document.querySelectorAll('.why-built-quote p');
  t.whyBuiltText.forEach(function(text, i) {
    if (whyParas[i]) whyParas[i].textContent = text;
  });

  // Pricing
  setText('pricing-title', t.pricingTitle);
  setText('pricing-subtitle', t.pricingSubtitle);
  setText('pricing-badge', t.pricingBadge);
  setText('pricing-price-old', t.pricingPriceOld);
  setText('pricing-price', t.pricingPrice);
  setText('pricing-price-sub', t.pricingPriceSub);
  setText('pricing-no-sub', t.pricingNoSub);
  setText('pricing-data-note', t.pricingDataNote);
  var priceItems = document.querySelectorAll('.pricing-features-list li');
  t.pricingItems.forEach(function(item, i) {
    if (priceItems[i]) priceItems[i].textContent = item;
  });
  setHref('pricing-cta', LS_CHECKOUT_URL);
  setText2('pricing-cta', t.pricingCta);
  setHref('pricing-license-link', './license.html');
  setText2('pricing-license-link', t.pricingLicenseLink);

  // FAQ
  setText('faq-title', t.faqTitle);
  var faqDts = document.querySelectorAll('.faq-list dt');
  var faqDds = document.querySelectorAll('.faq-list dd');
  t.faqItems.forEach(function(item, i) {
    if (faqDts[i]) faqDts[i].textContent = item.q;
    if (faqDds[i]) faqDds[i].textContent = item.a;
  });

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
