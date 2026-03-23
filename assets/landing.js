/* === LANDING PAGE LOGIC === */
/* Language switching, theme detection, smooth scroll */

// PLACEHOLDER: Replace with your actual Lemon Squeezy checkout URL.
// Format: https://YOURSTORE.lemonsqueezy.com/buy/VARIANT_ID
var LS_CHECKOUT_URL = 'https://YOURSTORE.lemonsqueezy.com/buy/PLACEHOLDER';

/* ---------- Feature icon PNGs ---------- */
/* Real botanical illustration icons — 72x72 PNG images */
var DOODLE_ICONS = {
  folder:   '<img src="./assets/illustrations/icons/alim.png"    width="72" height="72" alt="" aria-hidden="true" class="feature-icon-img">',
  lock:     '<img src="./assets/illustrations/icons/ale.png"     width="72" height="72" alt="" aria-hidden="true" class="feature-icon-img">',
  offline:  '<img src="./assets/illustrations/icons/atsitz.png"  width="72" height="72" alt="" aria-hidden="true" class="feature-icon-img">',
  sparkle:  '<img src="./assets/illustrations/icons/tulip.png"   width="72" height="72" alt="" aria-hidden="true" class="feature-icon-img">',
  coin:     '<img src="./assets/illustrations/icons/vassa.png"   width="72" height="72" alt="" aria-hidden="true" class="feature-icon-img">',
  notebook: '<img src="./assets/illustrations/icons/merizza.png" width="72" height="72" alt="" aria-hidden="true" class="feature-icon-img">'
};

/* ---------- i18n ---------- */
var LANDING_I18N = {
  en: {
    heroBadge: 'For Energy Healing Practitioners',
    heroTitle: 'Sessions Garden',
    heroTagline: 'Your sessions, your way. Anywhere, anytime.',
    heroSubtitle: 'Session notes, without the chaos or paper. All your data stays on your device — always.',
    heroCta: 'Get Sessions Garden — €119',
    heroEnterApp: 'Already have a license?',
    featuresTitle: 'Everything you need to focus on what matters most — healing.',
    featuresSubtitle: 'No more paper shuffles. No more scattered files. Just clarity.',
    features: [
      { icon: DOODLE_ICONS.folder, title: 'Everything organized, nothing lost', desc: 'All your sessions and client history in one place — structured and easy to navigate. No more flipping through pages or scattered files.' },
      { icon: DOODLE_ICONS.lock, title: 'Your clients\' trust, protected', desc: 'No cloud. No accounts. No tracking. Your client data never leaves your device.' },
      { icon: DOODLE_ICONS.offline, title: 'Works anywhere — even offline', desc: 'After the initial setup, your tool runs from your device — at the clinic, at home, or on the go.' },
      { icon: DOODLE_ICONS.sparkle, title: 'Tracks what other tools miss', desc: 'Track energetic imbalances, limiting beliefs, inherited emotions, and severity levels — designed around how energy healers actually work.' },
      { icon: DOODLE_ICONS.coin, title: 'No monthly fees. No surprises.', desc: 'One payment, unlimited access.' },
      { icon: DOODLE_ICONS.notebook, title: 'Used to writing on paper? Keep going.', desc: 'Keep documenting your sessions on paper if that works for you. Then, summarize and organize everything digitally in a structured, organized way — so you can always find it later.' }
    ],
    whoForTitle: 'Who is Sessions Garden for?',
    whoForSubtitle: 'Designed for practitioners of:',
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
      'Hi, I\'m Sapphire, an energy healing practitioner.',
      'For years I documented sessions on paper, notebooks, and scattered files. When access to the digital tool I used during training expired, I went back to a drawer full of loose pages — and spent way too much time searching for past sessions every week.',
      'I couldn\'t find a tool that truly fit the way energy healers work. So I built one.',
      'Sessions Garden is the tool I wish existed when I started my practice.'
    ],
    pricingTitle: 'Simple pricing. One payment. Unlimited access.',
    pricingSubtitle: 'No monthly fees. No surprises. One payment, unlimited access.',
    pricingBadge: 'Launch price',
    pricingPriceOld: '€159',
    pricingPrice: '€119',
    pricingPriceSub: 'One-time payment · Launch pricing',
    pricingNoSub: 'Less than what many practitioners charge for a single session.',
    pricingItems: [
      'Lifetime license — pay once, use forever',
      '2 device activations',
      'Full interface in: English, Hebrew, German, and Czech',
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
      { q: 'Is my clients\' data safe?', a: 'Yes. All data is stored only on your device. Nothing is sent to any server. The development team has zero access to your information.' },
      { q: 'What healing methods does it support?', a: 'Designed for energy healing practices, Sessions Garden helps you track released emotions, physical imbalances, limiting beliefs, and more.' },
      { q: 'Can I still write on paper?', a: 'Absolutely. Many practitioners write during sessions and enter the summary into Sessions Garden afterwards. It\'s designed to fit your workflow, not replace it.' },
      { q: 'What if I switch devices?', a: 'You can activate your license on a new device. Remember to export your data from the old device first, as data is stored locally.' },
      { q: 'Is there a subscription?', a: 'No. One payment, lifetime access. No monthly fees, ever.' },
      { q: 'What if my computer breaks or gets lost?', a: 'Since all data is stored locally, it\'s important to regularly export your data using the built-in export function. This creates a backup file you can save anywhere safe (USB drive, email it to yourself, etc.). Sessions Garden does not store your data in the cloud — which means full privacy, but also means you are responsible for keeping backups.' },
      { q: 'Can I restore my data on a new device?', a: 'Yes. Import your exported backup file into Sessions Garden on your new device and your sessions and clients will be restored.' },
      { q: 'Do you offer refunds?', a: 'Yes. If the tool doesn\'t fit your needs, contact us within 14 days of purchase and you\'ll receive a full refund.' }
    ],
    impressumTitle: 'Impressum',
    impressumAngaben: 'Angaben gemäß § 5 DDG',
    impressumNote: 'TODO: Generate your Impressum at https://www.e-recht24.de/impressum-generator.html and replace the placeholder below.',
    impressumPlaceholder: '[Full Legal Name]\n[Street Address]\n[City, Postal Code, Country]\nEmail: [Email Address]\nPhone: [Phone Number — optional]',
    datenschutzTitle: 'Privacy Policy / Datenschutzerklärung',
    datenschutzArt13Title: '1. Data Processing (GDPR Art. 13/14)',
    datenschutzArt13: 'Sessions Garden does not collect, store, or transmit any personal data. All session and client data is stored exclusively on your device using IndexedDB browser technology. The development team has zero access to your data.',
    datenschutzHostingTitle: '2. Hosting',
    datenschutzHosting: 'This website is hosted on Cloudflare Pages (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). Cloudflare may process access logs (IP address, browser type, timestamp) as part of standard web hosting operations. For details, see Cloudflare\'s privacy policy: https://www.cloudflare.com/privacypolicy/',
    datenschutzPaymentTitle: '3. Payment Processing',
    datenschutzPayment: 'Payments are processed by Lemon Squeezy (Lemon Squeezy, LLC), who acts as Merchant of Record. Purchase data (name, email, payment information) is handled by Lemon Squeezy. For details, see Lemon Squeezy\'s privacy policy: https://www.lemonsqueezy.com/privacy',
    datenschutzStorageTitle: '4. Local Storage',
    datenschutzStorage: 'This application uses localStorage for preferences (language, theme) and license activation status. No tracking cookies are used. All clinical data is stored in your browser\'s IndexedDB, accessible only on your device.',
    datenschutzRightsTitle: '5. Your Rights (GDPR Art. 15–21)',
    datenschutzRights: 'Right to access: your data is already on your device — open the app to see it. Right to deletion: clear your browser\'s site data to remove all stored information. Right to data portability: use the Export function in the app to download your data as a JSON file.',
    datenschutzNote: 'TODO: Run the full Datenschutzerklärung through https://www.adsimple.de/datenschutz-generator/ or https://www.e-recht24.de before launch for a finalized, lawyer-reviewed version.',
    demoTitle: 'Try it yourself',
    demoSubtitle: 'Explore a live demo with sample data — no signup needed',
    demoNote: 'This demo runs entirely in your browser. No data is stored or sent anywhere.',
    demoHint1: 'Click "Details" on a client \u2014 during remote sessions, their photo is right there so you can stay connected without switching screens.',
    demoHint2: 'Try "Add Session" \u2014 the client\'s age is calculated live next to their photo, so when the subconscious points to a specific age, you have it instantly.',
    demoHint3: 'Check the severity scale \u2014 rate before and after each session, and watch the numbers tell the story of healing over time.',
    contactTitle: 'Get in touch',
    contactText: 'Have questions or need help? We\'d love to hear from you.',
    footerTerms: 'Terms of Use',
    footerImpressum: 'Impressum',
    footerPrivacy: 'Privacy Policy',
    footerCopy: '© 2026 Sessions Garden',
    footerTagline: 'Made with care for practitioners'
  },

  he: {
    heroBadge: 'למטפלים בריפוי אנרגטי',
    heroTitle: 'Sessions Garden',
    heroTagline: 'הפגישות שלכם, בדרך שלכם. בכל מקום, בכל זמן.',
    heroSubtitle: 'תיעוד פגישות — בלי כאוס ובלי נייר. כל הנתונים נשמרים במכשיר שלכם — תמיד.',
    heroCta: 'לרכישה — €119',
    heroEnterApp: 'יש לכם כבר רישיון?',
    featuresTitle: 'כל מה שצריך כדי להתמקד במה שחשוב — ריפוי.',
    featuresSubtitle: 'אין יותר ערימות נייר. אין יותר קבצים מפוזרים. רק בהירות.',
    features: [
      { icon: DOODLE_ICONS.folder, title: 'הכל מסודר, כלום לא אבד', desc: 'כל הפגישות ורשומות הלקוחות שלכם במקום אחד — מובנה, מסודר, וקל לניווט. אין יותר דפדוף בדפים ישנים או קבצים מפוזרים.' },
      { icon: DOODLE_ICONS.lock, title: 'האמון של הלקוחות שלכם, מוגן', desc: 'ללא ענן. ללא חשבונות. ללא מעקב. נתוני הלקוחות שלכם לא עוזבים את המכשיר שלכם.' },
      { icon: DOODLE_ICONS.offline, title: 'עובד בכל מקום — גם בלי אינטרנט', desc: 'אחרי התקנה ראשונית, הכלי שלכם עובד מהמכשיר — בקליניקה, בבית, או בשטח.' },
      { icon: DOODLE_ICONS.sparkle, title: 'עוקב אחרי מה שכלים אחרים לא יכולים', desc: 'חוסרי איזון אנרגטיים, אמונות מגבילות, רגשות תורשתיים, רמות חומרה — מיועד לתמוך בדרך שבה מטפלים אנרגטיים עובדים.' },
      { icon: DOODLE_ICONS.coin, title: 'ללא חיובים חודשיים ובלי הפתעות', desc: 'תשלום אחד, גישה ללא הגבלה.' },
      { icon: DOODLE_ICONS.notebook, title: 'רגילים ואוהבים לכתוב על דפים? המשיכו.', desc: 'המשיכו לתעד את הפגישות על דפים אם זה נוח לכם. אחר כך, סכמו וארגנו הכל דיגיטלית בצורה מובנית ומסודרת — כך שתוכלו תמיד למצוא את זה מאוחר יותר.' }
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
      'אני מדפדף/ת בדפים ישנים לפני כל פגישה כדי להיזכר מה עשינו',
      'אני שומר/ת תיעוד לקוחות בקבצים אקראיים במחשב ומודאג/ת מהפרטיות',
      'הכלי שהשתמשתי בו בזמן ההכשרה נעלם, ואין שום דבר אחר שמתאים לזרימת העבודה שלי',
      'אני רוצה לעבור לדיגיטל אבל לא יודע/ת איפה להתחיל',
      'עבדתי עם נייר שנים — זה עובד, אבל הייתי רוצה דרך טובה יותר לסכם ולמצוא דברים אחר כך'
    ],
    soundFamiliarNote: 'Sessions Garden נבנה על ידי מטפלת שחוותה כל אחת מהבעיות האלו. אתם יכולים להמשיך לכתוב על נייר בפגישות — ולארגן הכל דיגיטלית אחר כך. בקצב שלכם, בדרך שלכם.',
    whyBuiltTitle: 'למה בניתי את זה',
    whyBuiltText: [
      'היי, אני ספיר — מטפלת בריפוי אנרגטי.',
      'במשך שנים תיעדתי פגישות על נייר, במחברות ובקבצים מפוזרים. כשהגישה לכלי הדיגיטלי שבו השתמשתי במהלך ההכשרה פגה, חזרתי למגירה מלאה בדפים — ובכל שבוע בזבזתי יותר מדי זמן בחיפוש אחר פגישות ישנות.',
      'לא מצאתי כלי שבאמת מתאים לדרך שבה מטפלים אנרגטיים עובדים. אז בניתי אחד.',
      'Sessions Garden הוא הכלי שהייתי רוצה שיהיה קיים כשהתחלתי את הפרקטיקה שלי.'
    ],
    pricingTitle: 'תמחור פשוט. תשלום אחד. גישה ללא הגבלה.',
    pricingSubtitle: 'ללא חיובים חודשיים ובלי הפתעות. תשלום אחד, גישה ללא הגבלה.',
    pricingBadge: 'מחיר השקה',
    pricingPriceOld: '€159',
    pricingPrice: '€119',
    pricingPriceSub: 'תשלום חד-פעמי · מחיר השקה',
    pricingNoSub: 'פחות ממה שרוב המטפלים גובים עבור טיפול אחד.',
    pricingItems: [
      'רישיון לכל החיים — שלמו פעם אחת, השתמשו לנצח',
      '2 הפעלות מכשיר',
      'ממשק מלא בשפות: אנגלית, עברית, גרמנית וצ\'כית',
      'עובד ללא אינטרנט (התקנה כאפליקציה)',
      'כל העדכונים העתידיים כלולים',
      'ייצוא נתונים מלא בכל עת'
    ],
    pricingDataNote: 'הנתונים נשמרים באופן מקומי בכל מכשיר ואינם מסתנכרנים בין מכשירים.',
    pricingCta: 'לרכישה — €119',
    pricingLicenseLink: 'יש לכם כבר רישיון? הפעילו אותו כאן',
    faqTitle: 'שאלות נפוצות',
    faqItems: [
      { q: 'האם צריך אינטרנט כדי להשתמש?', a: 'רק להגדרה הראשונית ולהפעלת הרישיון. אחרי זה, Sessions Garden עובד לחלוטין ללא אינטרנט.' },
      { q: 'האם אפשר להשתמש על כמה מכשירים?', a: 'הרישיון כולל 2 הפעלות מכשיר. שימו לב שהנתונים נשמרים מקומית ואינם מסתנכרנים בין מכשירים.' },
      { q: 'האם הנתונים של הלקוחות שלי בטוחים?', a: 'כן. כל הנתונים נשמרים רק במכשיר שלכם. שום דבר לא נשלח לשרת כלשהו. לצוות הפיתוח אין גישה למידע שלכם.' },
      { q: 'באילו שיטות טיפול הכלי תומך?', a: 'מיועד לפרקטיקות ריפוי אנרגטי ועוקב אחר הפגישות. מעקב אחר רגשות ששוחררו, חוסרי איזון פיזיים, אמונות מגבילות ועוד. כלי זה יכול לתמוך בשיטות רבות.' },
      { q: 'האם אפשר עדיין לכתוב על נייר?', a: 'בהחלט. מטפלים רבים כותבים בפגישות ומזינים את הסיכום ל-Sessions Garden אחר כך. הוא מיועד להתאים לזרימת העבודה שלכם, לא להחליפה.' },
      { q: 'מה אם מחליפים מכשיר?', a: 'אפשר להפעיל את הרישיון על מכשיר חדש. זכרו לייצא את הנתונים מהמכשיר הישן תחילה, מכיוון שהנתונים נשמרים מקומית.' },
      { q: 'האם יש מנוי?', a: 'לא. תשלום אחד, גישה לכל החיים. ללא עמלות חודשיות, לעולם.' },
      { q: 'מה אם המחשב נשבר או אבד?', a: 'מכיוון שכל הנתונים נשמרים מקומית, חשוב לייצא את הנתונים באופן קבוע. זה יוצר קובץ גיבוי שאפשר לשמור בכל מקום בטוח (כונן USB, מייל לעצמכם וכד\'). Sessions Garden לא מאחסן את הנתונים בענן — מה שמאפשר פרטיות מלאה, אבל גם אחריות לשמירת גיבויים.' },
      { q: 'האם אפשר לשחזר נתונים על מכשיר חדש?', a: 'כן. ייבאו את קובץ הגיבוי ל-Sessions Garden על המכשיר החדש, והפגישות והלקוחות ישוחזרו.' },
      { q: 'האם יש החזרים?', a: 'כן. אם הכלי לא מתאים לכם, פנו אלינו תוך 14 יום מהרכישה ותקבלו החזר מלא.' }
    ],
    impressumTitle: 'Impressum',
    impressumAngaben: 'Angaben gemäß § 5 DDG',
    impressumNote: 'TODO: Generate your Impressum at https://www.e-recht24.de/impressum-generator.html and replace the placeholder below.',
    impressumPlaceholder: '[Full Legal Name]\n[Street Address]\n[City, Postal Code, Country]\nEmail: [Email Address]\nPhone: [Phone Number — optional]',
    datenschutzTitle: 'מדיניות פרטיות / Datenschutzerklärung',
    datenschutzArt13Title: '1. עיבוד נתונים (GDPR Art. 13/14)',
    datenschutzArt13: 'Sessions Garden אינו אוסף, מאחסן או מעביר נתונים אישיים. כל נתוני הפגישות והלקוחות נשמרים באופן בלעדי במכשיר שלכם באמצעות טכנולוגיית IndexedDB של הדפדפן. לצוות הפיתוח אין גישה לנתונים שלכם.',
    datenschutzHostingTitle: '2. אחסון אתר',
    datenschutzHosting: 'אתר זה מתארח ב-Cloudflare Pages (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). Cloudflare עשויה לעבד יומני גישה (כתובת IP, סוג דפדפן, חותמת זמן) כחלק מפעולות אחסון אתר רגילות. לפרטים, ראו את מדיניות הפרטיות של Cloudflare: https://www.cloudflare.com/privacypolicy/',
    datenschutzPaymentTitle: '3. עיבוד תשלומים',
    datenschutzPayment: 'תשלומים מעובדים על ידי Lemon Squeezy (Lemon Squeezy, LLC), הפועל כ-Merchant of Record. נתוני הרכישה (שם, דוא"ל, פרטי תשלום) מטופלים על ידי Lemon Squeezy. לפרטים, ראו את מדיניות הפרטיות של Lemon Squeezy: https://www.lemonsqueezy.com/privacy',
    datenschutzStorageTitle: '4. אחסון מקומי',
    datenschutzStorage: 'אפליקציה זו משתמשת ב-localStorage להגדרות (שפה, ערכת נושא) וסטטוס הפעלת רישיון. לא נעשה שימוש בעוגיות מעקב. כל הנתונים הקליניים נשמרים ב-IndexedDB של הדפדפן שלכם, נגיש רק במכשיר שלכם.',
    datenschutzRightsTitle: '5. הזכויות שלכם (GDPR Art. 15–21)',
    datenschutzRights: 'זכות גישה: הנתונים שלכם כבר נמצאים במכשיר שלכם — פתחו את האפליקציה לצפייה. זכות מחיקה: נקו את נתוני האתר בדפדפן להסרת כל המידע המאוחסן. זכות ניידות נתונים: השתמשו בפונקציית הייצוא באפליקציה להורדת הנתונים כקובץ JSON.',
    datenschutzNote: 'TODO: Run the full Datenschutzerklärung through https://www.adsimple.de/datenschutz-generator/ before launch for a finalized version.',
    demoTitle: 'נסו בעצמכם',
    demoSubtitle: 'הדגמה חיה עם נתונים לדוגמה — ללא הרשמה',
    demoNote: 'ההדגמה רצה לגמרי בדפדפן שלכם. אין נתונים שנשמרים או נשלחים לשום מקום.',
    demoHint1: 'לחצו על "פרטים" ליד מטופל — בטיפול מרחוק, התמונה שלו שם מולכם כדי להתחבר אנרגטית בלי לחפש במקומות אחרים.',
    demoHint2: 'נסו "הוספת מפגש" — הגיל של המטופל מחושב בזמן אמת ליד התמונה, אז כשתת המודע מוביל לגיל מסוים, הוא כבר שם.',
    demoHint3: 'שימו לב לסולם החומרה — דרגו לפני ואחרי כל טיפול, וצפו במספרים מספרים את סיפור הריפוי.',
    contactTitle: 'צרו קשר',
    contactText: 'יש לכם שאלות או צריכים עזרה? נשמח לשמוע מכם.',
    footerTerms: 'תנאי שימוש',
    footerImpressum: 'Impressum',
    footerPrivacy: 'מדיניות פרטיות',
    footerCopy: '© 2026 Sessions Garden',
    footerTagline: 'נבנה באהבה עבור מטפלים'
  },

  de: {
    heroBadge: 'Für Energieheilpraktiker',
    heroTitle: 'Sessions Garden',
    heroTagline: 'Deine Sitzungen, auf deine Weise. Überall, jederzeit.',
    heroSubtitle: 'Sitzungsdokumentation — ohne Chaos, ohne Papier. Alle Daten bleiben auf deinem Gerät — immer.',
    heroCta: 'Sessions Garden kaufen — €119',
    heroEnterApp: 'Hast du bereits eine Lizenz?',
    featuresTitle: 'Alles, was du brauchst, um dich auf das Wesentliche zu konzentrieren — die Heilung.',
    featuresSubtitle: 'Kein Papierwirrwarr mehr. Keine verstreuten Dateien mehr. Nur Klarheit.',
    features: [
      { icon: DOODLE_ICONS.folder, title: 'Alles organisiert, nichts geht verloren', desc: 'Alle deine Sitzungen und die Klientenhistorie an einem Ort — strukturiert, geordnet und einfach zu navigieren. Kein Blättern mehr in alten Seiten oder verstreuten Dateien.' },
      { icon: DOODLE_ICONS.lock, title: 'Das Vertrauen deiner Klienten — geschützt', desc: 'Keine Cloud. Keine Konten. Kein Tracking. Die Daten deiner Klienten verlassen niemals dein Gerät.' },
      { icon: DOODLE_ICONS.offline, title: 'Funktioniert überall — auch offline', desc: 'Nach der Ersteinrichtung läuft dein Tool direkt vom Gerät — in der Praxis, zu Hause oder unterwegs.' },
      { icon: DOODLE_ICONS.sparkle, title: 'Erfasst, was andere Tools nicht können', desc: 'Energetische Ungleichgewichte, einschränkende Überzeugungen, vererbte Emotionen, Schweregrade — entwickelt, um die Arbeitsweise von Energieheilpraktikern wirklich zu unterstützen.' },
      { icon: DOODLE_ICONS.coin, title: 'Keine monatlichen Gebühren. Keine Überraschungen.', desc: 'Eine Zahlung, unbegrenzter Zugang.' },
      { icon: DOODLE_ICONS.notebook, title: 'Du schreibst gern auf Papier? Mach einfach weiter.', desc: 'Dokumentiere deine Sitzungen weiterhin auf Papier, wenn dir das liegt. Danach fasse alles digital zusammen — strukturiert und übersichtlich, damit du es später immer findest.' }
    ],
    whoForTitle: 'Für wen ist Sessions Garden?',
    whoForSubtitle: 'Ideal für Praktiker aus den Bereichen:',
    whoForItems: [
      'Energetische Heilarbeit',
      'Ganzheitliche Therapie',
      'Muskeltest-basierte Methoden',
      'Kinesiologie',
      'Energetische Ausgleichsverfahren',
      'Alle Methoden, die Emotionen, Ungleichgewichte und Klientenfortschritt erfassen'
    ],
    soundFamiliarTitle: 'Kommt dir das bekannt vor?',
    soundFamiliarItems: [
      'Ich habe Schubladen voller Sitzungsnotizen und es dauert ewig, das Richtige zu finden',
      'Ich blättere vor jeder Sitzung in alten Seiten, um mich zu erinnern, was wir gemacht haben',
      'Ich bewahre Klientennotizen in zufälligen Dateien auf meinem Computer auf und mache mir Sorgen um den Datenschutz',
      'Das Tool, das ich während meiner Ausbildung genutzt habe, ist weg, und nichts anderes passt zu meinem Workflow',
      'Ich möchte digital werden, weiß aber nicht, wo ich anfangen soll',
      'Ich arbeite seit Jahren mit Papier — es funktioniert, aber ich wünschte, ich hätte eine bessere Möglichkeit, Dinge zusammenzufassen und später zu finden'
    ],
    soundFamiliarNote: 'Sessions Garden wurde von einer Praktikerin entwickelt, die jedes dieser Probleme kannte. Du kannst während der Sitzungen weiter auf Papier schreiben — und anschließend alles digital organisieren. In deinem Tempo. Auf deine Weise.',
    whyBuiltTitle: 'Warum ich das gebaut habe',
    whyBuiltText: [
      'Hallo, ich bin Sapphire — Energieheilpraktikerin.',
      'Jahrelang habe ich Sitzungen auf Papier, in Notizbüchern und verstreuten Dateien dokumentiert. Als der Zugang zu dem digitalen Tool, das ich während meiner Ausbildung genutzt hatte, wegfiel, kehrte ich zurück zu einer Schublade voller loser Seiten — und verbrachte jede Woche viel zu viel Zeit damit, alte Sitzungen zu suchen.',
      'Ich konnte kein Tool finden, das wirklich zur Arbeitsweise von Energie-Heilpraktikern passte. Also baute ich eines.',
      'Sessions Garden ist das Tool, das ich mir gewünscht hätte, als ich meine Praxis begann.'
    ],
    pricingTitle: 'Einfache Preisgestaltung. Eine Zahlung. Unbegrenzter Zugang.',
    pricingSubtitle: 'Keine monatlichen Gebühren. Keine Überraschungen. Eine einmalige Zahlung — unbegrenzter Zugang.',
    pricingBadge: 'Einführungspreis',
    pricingPriceOld: '€159',
    pricingPrice: '€119',
    pricingPriceSub: 'Einmalzahlung · Einführungspreis',
    pricingNoSub: 'Weniger als das, was die meisten Praktiker für nur eine Sitzung berechnen.',
    pricingItems: [
      'Lebenslange Lizenz — einmal zahlen, für immer nutzen',
      '2 Geräteaktivierungen',
      'Vollständige Oberfläche in: Englisch, Hebräisch, Deutsch und Tschechisch',
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
      { q: 'Sind die Daten meiner Klienten sicher?', a: 'Ja. Alle Daten werden ausschließlich auf deinem Gerät gespeichert. Es wird nichts an Server übermittelt. Das Entwicklungsteam hat keinerlei Zugriff auf deine Informationen.' },
      { q: 'Welche Heilmethoden werden unterstützt?', a: 'Entwickelt für energetische Heilpraktiken — es erfasst deine Sitzungen. Erfasse freigesetzte Emotionen, körperliche Ungleichgewichte, einschränkende Überzeugungen und mehr. Dieses Tool kann viele Methoden unterstützen.' },
      { q: 'Kann ich weiterhin auf Papier schreiben?', a: 'Absolut. Viele Praktiker schreiben während der Sitzungen und geben die Zusammenfassung danach in Sessions Garden ein. Es ist darauf ausgelegt, deinen Workflow zu ergänzen, nicht zu ersetzen.' },
      { q: 'Was passiert, wenn ich das Gerät wechsle?', a: 'Du kannst deine Lizenz auf einem neuen Gerät aktivieren. Denke daran, zuerst deine Daten vom alten Gerät zu exportieren, da sie lokal gespeichert sind.' },
      { q: 'Gibt es ein Abonnement?', a: 'Nein. Eine Zahlung, lebenslanger Zugang. Keine monatlichen Gebühren, niemals.' },
      { q: 'Was passiert, wenn mein Computer kaputt geht oder verloren geht?', a: 'Da alle Daten lokal gespeichert sind, ist es wichtig, deine Daten regelmäßig mit der eingebauten Exportfunktion zu sichern. Sessions Garden speichert deine Daten nicht in der Cloud — das bedeutet vollständige Privatsphäre, aber auch eigene Verantwortung für Backups.' },
      { q: 'Kann ich meine Daten auf einem neuen Gerät wiederherstellen?', a: 'Ja. Importiere deine exportierte Backup-Datei in Sessions Garden auf deinem neuen Gerät — deine Sitzungen und Klienten werden wiederhergestellt.' },
      { q: 'Gibt es Rückerstattungen?', a: 'Ja. Wenn das Tool nicht zu dir passt, kontaktiere uns innerhalb von 14 Tagen nach dem Kauf und du erhältst eine vollständige Rückerstattung.' }
    ],
    impressumTitle: 'Impressum',
    impressumAngaben: 'Angaben gemäß § 5 DDG',
    impressumNote: 'TODO: Impressum unter https://www.e-recht24.de/impressum-generator.html generieren und den Platzhalter unten ersetzen.',
    impressumPlaceholder: '[Vollständiger rechtlicher Name]\n[Straße, Hausnummer]\n[Stadt, PLZ, Land]\nE-Mail: [E-Mail-Adresse]\nTelefon: [Telefonnummer — optional]',
    datenschutzTitle: 'Datenschutzerklärung',
    datenschutzArt13Title: '1. Datenverarbeitung (DSGVO Art. 13/14)',
    datenschutzArt13: 'Sessions Garden erhebt, speichert oder überträgt keine personenbezogenen Daten. Alle Sitzungs- und Klientendaten werden ausschließlich auf deinem Gerät mittels IndexedDB-Browsertechnologie gespeichert. Das Entwicklungsteam hat keinerlei Zugriff auf deine Daten.',
    datenschutzHostingTitle: '2. Hosting',
    datenschutzHosting: 'Diese Website wird auf Cloudflare Pages gehostet (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). Cloudflare kann im Rahmen des standardmäßigen Webhosting-Betriebs Zugriffsprotokolle verarbeiten. Details: https://www.cloudflare.com/privacypolicy/',
    datenschutzPaymentTitle: '3. Zahlungsabwicklung',
    datenschutzPayment: 'Zahlungen werden von Lemon Squeezy (Lemon Squeezy, LLC) als Merchant of Record abgewickelt. Kaufdaten werden von Lemon Squeezy verarbeitet. Details: https://www.lemonsqueezy.com/privacy',
    datenschutzStorageTitle: '4. Lokale Speicherung',
    datenschutzStorage: 'Diese Anwendung nutzt localStorage für Einstellungen (Sprache, Theme) und den Lizenzaktivierungsstatus. Es werden keine Tracking-Cookies verwendet.',
    datenschutzRightsTitle: '5. Deine Rechte (DSGVO Art. 15–21)',
    datenschutzRights: 'Auskunftsrecht: Deine Daten befinden sich auf deinem Gerät — öffne die App zur Einsichtnahme. Recht auf Löschung: Lösche die Website-Daten deines Browsers. Recht auf Datenübertragbarkeit: Nutze die Exportfunktion in der App.',
    datenschutzNote: 'TODO: Vollständige Datenschutzerklärung vor dem Launch über https://www.adsimple.de/datenschutz-generator/ generieren lassen.',
    demoTitle: 'Probier es selbst',
    demoSubtitle: 'Erkunde eine Live-Demo mit Beispieldaten — keine Anmeldung nötig',
    demoNote: 'Diese Demo läuft vollständig in deinem Browser. Es werden keine Daten gespeichert oder gesendet.',
    demoHint1: 'Klick auf \u201eDetails\u201c bei einem Klienten — bei Fernsitzungen erscheint das Foto direkt, damit du dich energetisch verbinden kannst.',
    demoHint2: 'Probier \u201eSitzung hinzufügen\u201c — das Alter des Klienten wird live neben dem Foto berechnet, genau in dem Moment, in dem du es brauchst.',
    demoHint3: 'Schau dir die Schweregradskala an — bewerte vor und nach jeder Sitzung und beobachte die Geschichte der Heilung.',
    contactTitle: 'Kontakt',
    contactText: 'Hast du Fragen oder brauchst du Hilfe? Wir freuen uns, von dir zu hören.',
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
    heroSubtitle: 'Dokumentace sezení — bez chaosu, bez papíru. Všechna data zůstávají na vašem zařízení — vždy.',
    heroCta: 'Získat Sessions Garden za €119',
    heroEnterApp: 'Máte již licenci?',
    featuresTitle: 'Vše, co potřebujete, abyste se soustředili na to podstatné — uzdravení.',
    featuresSubtitle: 'Žádné papírování navíc. Žádné rozházené soubory. Jen přehlednost.',
    features: [
      { icon: DOODLE_ICONS.folder, title: 'Vše uspořádáno, nic ztraceno', desc: 'Všechna vaše sezení a klientská historie na jednom místě — strukturovaně a přehledně. Konec listování ve starých stránkách nebo rozházených souborech.' },
      { icon: DOODLE_ICONS.lock, title: 'Důvěra vašich klientů, chráněná', desc: 'Žádný cloud. Žádné účty. Žádné sledování. Data vašich klientů nikdy neopustí vaše zařízení.' },
      { icon: DOODLE_ICONS.offline, title: 'Funguje všude — i offline', desc: 'Po prvním nastavení běží nástroj přímo na vašem zařízení — v ordinaci, doma nebo na cestách.' },
      { icon: DOODLE_ICONS.sparkle, title: 'Sleduje to, co jiné nástroje nedokážou', desc: 'Sledujte energetické nerovnováhy, omezující přesvědčení, zděděné emoce a stupně závažnosti — navrženo pro způsob, jakým energetičtí léčitelé skutečně pracují.' },
      { icon: DOODLE_ICONS.coin, title: 'Žádné měsíční poplatky. Žádná překvapení.', desc: 'Jedna platba, neomezený přístup.' },
      { icon: DOODLE_ICONS.notebook, title: 'Zvyklí psát na papír? Pokračujte.', desc: 'Pokračujte v dokumentování sezení na papíře, pokud vám to vyhovuje. Poté vše jednoduše shrňte a uspořádejte digitálně — strukturovaně a přehledně, abyste to vždy mohli najít.' }
    ],
    whoForTitle: 'Pro koho je Sessions Garden?',
    whoForSubtitle: 'Ideální pro praktiky:',
    whoForItems: [
      'Energetického léčení',
      'Holistické terapie',
      'Metod svalového testování',
      'Kinesiologie',
      'Metod energetického vyrovnávání',
      'Jakékoli metody, které sledují emoce, nerovnováhy a pokrok klientů'
    ],
    soundFamiliarTitle: 'Zní to povědomě?',
    soundFamiliarItems: [
      'Mám zásuvky plné poznámek ze sezení a trvá mi věčnost, než najdu, co potřebuji',
      'Před každým sezením listuji ve starých stránkách a snažím se vzpomenout, co jsme dělali',
      'Uchovávám poznámky o klientech v náhodných souborech v počítači a mám obavy o soukromí',
      'Nástroj, který jsem používala při školení, je pryč, a nic jiného mi nevyhovuje',
      'Chci přejít na digitální, ale nevím, kde začít',
      'Roky pracuji s papírem — funguje to, ale přála bych si lepší způsob, jak shrnout a najít věci později'
    ],
    soundFamiliarNote: 'Sessions Garden byl vytvořen terapeutkou, která zažila každý z těchto problémů. Můžete pokračovat v psaní na papír během sezení — a vše si následně uspořádat digitálně. Svým tempem, svým způsobem.',
    whyBuiltTitle: 'Proč jsem to postavila',
    whyBuiltText: [
      'Ahoj, jsem Sapphire — jsem terapeutka energetického léčení.',
      'Roky jsem dokumentovala sezení na papíře, v poznámkových blocích a rozházených souborech. Když mi vypršel přístup k digitálnímu nástroji, který jsem používala při školení, vrátila jsem se ke zásuvce plné volných stránek — a každý týden jsem strávila příliš dlouho hledáním minulých sezení.',
      'Nemohla jsem najít nástroj, který by skutečně odpovídal způsobu práce energetických léčitelů. Tak jsem jeden vytvořila.',
      'Sessions Garden je nástroj, o kterém jsem si přála, aby existoval, když jsem začínala svou praxi.'
    ],
    pricingTitle: 'Jednoduchý ceník. Jedna platba. Neomezený přístup.',
    pricingSubtitle: 'Žádné měsíční poplatky. Žádná překvapení.',
    pricingBadge: 'Zaváděcí cena',
    pricingPriceOld: '€159',
    pricingPrice: '€119',
    pricingPriceSub: 'Jednorázová platba · Zaváděcí cena',
    pricingNoSub: 'Méně než většina praktiků účtuje za jediné sezení.',
    pricingItems: [
      'Doživotní licence — zaplaťte jednou, používejte navždy',
      '2 aktivace zařízení',
      'Kompletní rozhraní v jazycích: angličtina, hebrejština, němčina a čeština',
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
      { q: 'Jsou data mých klientů v bezpečí?', a: 'Ano. Všechna data jsou uložena pouze na vašem zařízení. Nic není odesláno na žádný server. Vývojový tým nemá přístup k vašim informacím.' },
      { q: 'Jaké metody léčení podporuje?', a: 'Navržen pro energetické léčitele. Sledujte uvolněné emoce, fyzické nerovnováhy, omezující přesvědčení a další.' },
      { q: 'Mohu stále psát na papír?', a: 'Samozřejmě. Mnoho praktiků píše během sezení a poté zadá shrnutí do Sessions Garden. Je navržen tak, aby vyhovoval vašemu pracovnímu postupu, ne ho nahrazoval.' },
      { q: 'Co když si vyměním zařízení?', a: 'Licenci můžete aktivovat na novém zařízení. Nezapomeňte nejprve exportovat data ze starého zařízení, protože jsou uložena lokálně.' },
      { q: 'Je tam předplatné?', a: 'Ne. Jedna platba, celoživotní přístup. Žádné měsíční poplatky, nikdy.' },
      { q: 'Co když se mi počítač rozbije nebo ztratí?', a: 'Protože všechna data jsou uložena lokálně, je důležité pravidelně exportovat data pomocí vestavěné funkce exportu. Sessions Garden neuchovává vaše data v cloudu — to znamená plné soukromí, ale také odpovědnost za zálohy.' },
      { q: 'Mohu obnovit data na novém zařízení?', a: 'Ano. Importujte exportovaný záložní soubor do Sessions Garden na novém zařízení a vaše sezení a klienti budou obnoveni.' },
      { q: 'Nabízíte vrácení peněz?', a: 'Ano. Pokud vám nástroj nevyhovuje, kontaktujte nás do 14 dnů od nákupu a obdržíte plnou náhradu.' }
    ],
    impressumTitle: 'Impressum',
    impressumAngaben: 'Angaben gemäß § 5 DDG',
    impressumNote: 'TODO: Generate your Impressum at https://www.e-recht24.de/impressum-generator.html',
    impressumPlaceholder: '[Celé právní jméno]\n[Ulice, číslo popisné]\n[Město, PSČ, Země]\nE-mail: [E-mailová adresa]\nTelefon: [Telefonní číslo — volitelné]',
    datenschutzTitle: 'Zásady ochrany osobních údajů',
    datenschutzArt13Title: '1. Zpracování dat (GDPR čl. 13/14)',
    datenschutzArt13: 'Sessions Garden neshromažďuje, neukládá ani nepřenáší žádné osobní údaje. Všechna data sezení a klientů jsou uložena výhradně na vašem zařízení pomocí technologie IndexedDB prohlížeče. Vývojový tým nemá přístup k vašim datům.',
    datenschutzHostingTitle: '2. Hosting',
    datenschutzHosting: 'Tato webová stránka je hostována na Cloudflare Pages (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA). Podrobnosti: https://www.cloudflare.com/privacypolicy/',
    datenschutzPaymentTitle: '3. Zpracování plateb',
    datenschutzPayment: 'Platby zpracovává Lemon Squeezy (Lemon Squeezy, LLC) jako Merchant of Record. Podrobnosti: https://www.lemonsqueezy.com/privacy',
    datenschutzStorageTitle: '4. Lokální úložiště',
    datenschutzStorage: 'Tato aplikace používá localStorage pro nastavení (jazyk, motiv) a stav aktivace licence. Nepoužívají se žádné sledovací soubory cookie.',
    datenschutzRightsTitle: '5. Vaše práva (GDPR čl. 15–21)',
    datenschutzRights: 'Právo na přístup: vaše data jsou na vašem zařízení — otevřete aplikaci. Právo na výmaz: vymažte data webu v prohlížeči. Právo na přenositelnost: použijte funkci Export v aplikaci.',
    datenschutzNote: 'TODO: Před spuštěním proveďte Datenschutzerklärung přes https://www.adsimple.de/datenschutz-generator/ pro finalizovanou verzi.',
    demoTitle: 'Vyzkoušejte si to',
    demoSubtitle: 'Prozkoumejte živou ukázku s ukázkovými daty — bez registrace',
    demoNote: 'Tato ukázka běží kompletně ve vašem prohlížeči. Žádná data nejsou ukládána ani odesílána.',
    demoHint1: 'Klikněte na "Detaily" u klienta — při online sezeních je jeho fotka přímo před vámi pro energetické spojení.',
    demoHint2: 'Zkuste "P\u0159idat sezen\u00ed" \u2014 v\u011bk klienta se po\u010d\u00edt\u00e1 \u017eiv\u011b vedle fotky, p\u0159esn\u011b kdy\u017e ho pot\u0159ebujete.',
    demoHint3: 'Zkontrolujte stupnici z\u00e1va\u017enosti \u2014 hodino\u0165te p\u0159ed a po ka\u017ed\u00e9m sezen\u00ed a sledujte p\u0159\u00edb\u011bh uzdravov\u00e1n\u00ed.',
    contactTitle: 'Kontaktujte nás',
    contactText: 'Máte otázky nebo potřebujete pomoc? Rádi vás uslyšíme.',
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
      if (icon) icon.innerHTML = f.icon;
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
  setText2('features-cta', t.pricingCta);
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

  // Demo
  setText('demo-title', t.demoTitle);
  setText('demo-subtitle', t.demoSubtitle);
  setText('demo-note', t.demoNote);

  // Sync language to demo iframe
  var demoIframe = document.getElementById('demo-iframe');
  if (demoIframe && demoIframe.contentWindow) {
    try {
      demoIframe.contentWindow.postMessage({ type: 'demo-lang', lang: lang }, '*');
    } catch(e) {}
  }

  // Contact
  setText('contact-title', t.contactTitle);
  setText('contact-text', t.contactText);

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

/* ---------- Spotlight glow on feature cards ---------- */
function initSpotlight() {
  document.querySelectorAll('.feature-card').forEach(function(card) {
    card.addEventListener('pointermove', function(e) {
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--x', (e.clientX - rect.left) + 'px');
      card.style.setProperty('--y', (e.clientY - rect.top) + 'px');
    });
  });
}

/* ---------- Demo resize handles ---------- */
(function() {
  var handles = document.querySelectorAll('.demo-resize-handle');
  if (!handles.length) return;

  var demoWindow = document.querySelector('.demo-window');
  var iframe = document.getElementById('demo-iframe');
  if (!demoWindow || !iframe) return;

  var startX, startWidth, activeHandle;

  function onPointerDown(e) {
    e.preventDefault();
    activeHandle = e.currentTarget;
    activeHandle.classList.add('dragging');
    startX = e.clientX;
    startWidth = demoWindow.offsetWidth;
    // Prevent iframe from stealing pointer events
    iframe.style.pointerEvents = 'none';
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  function onPointerMove(e) {
    var isEnd = activeHandle.classList.contains('demo-resize-handle--end');
    var rtl = document.documentElement.dir === 'rtl';
    var dx = e.clientX - startX;
    // For end handle: dragging right = wider; for start handle: dragging left = wider
    // In RTL, directions are mirrored
    var multiplier = isEnd ? 2 : -2; // 2x because we grow from center
    if (rtl) multiplier *= -1;
    var newWidth = Math.max(320, Math.min(startWidth + dx * multiplier, 1100));
    demoWindow.style.maxInlineSize = newWidth + 'px';
  }

  function onPointerUp() {
    if (activeHandle) activeHandle.classList.remove('dragging');
    iframe.style.pointerEvents = '';
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
  }

  handles.forEach(function(h) {
    h.addEventListener('pointerdown', onPointerDown);
  });
})();

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', function() {
  applyTheme();
  initLangSelector();
  initSmoothScroll();
  initSpotlight();

});
