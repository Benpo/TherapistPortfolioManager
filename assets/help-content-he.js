// help-content-he.js — the Hebrew help corpus for help.html (Phase 42.1, L10N-01).
//
// The Hebrew sibling of assets/help-content-en.js. Registers ONE global:
//   window.HELP_CONTENT_HE — ordered array of section objects, the full Hebrew
//     help corpus, structurally identical to HELP_CONTENT_EN (same section ids,
//     order, groups, topic ids, priorities, covers[], body node types, and every
//     {ui:key} token — byte-identical to EN). Only title + body text/steps are
//     translated into Hebrew.
//
// help.js localeSections() (Plan 08) merges this per-section with EN by id, with
// EN fallback, so a Hebrew-UI reader sees the help body natively.
//
// window.HELP_DEEPLINKS is defined ONLY in help-content-en.js — this file must
// NOT redefine it. Loaded ONLY by help.html.
//
// ── Register (house style, Phase 42.1) ────────────────────────────────────
//   Hebrew help register: infinitive / plural / noun-gerund; NO imperative
//   singular "you". RTL. Terminology: client = לקוח, session = מפגש,
//   Heart-Wall = חומת הלב — never the clinical patient/treatment words
//   (מטופל / טיפול), which tests/42_1-help-integrity.test.js forbids. The brand
//   "Sessions Garden", "PDF", browser names, and contact@sessionsgarden.app stay
//   Latin; the renderer is dir-aware (textContent, no innerHTML) so mixed
//   Latin/Hebrew lines display correctly without any manual bidi markup.
//
// ── Live-label interpolation (D-23) ───────────────────────────────────────
//   Every {ui:key} token is copied byte-identical from EN and is NOT translated.
//   help.js resolves each to its CURRENT live value in window.I18N.he, so a
//   Hebrew reader sees the actual Hebrew button/label names. The integrity test
//   fails on any unresolved token.
//
// No emojis in any text (D-10). No control characters other than the ordinary
// spaces/newlines EN uses; never NUL or bidi-control code points.

(function () {
  "use strict";

  var SECTIONS = [

    // ═══ FEATURED: personalization (led early, D-04) ═══════════════════════
    {
      id: "make-it-yours",
      title: "להפוך את Sessions Garden לשלכם",
      group: "session-loop",
      featured: true,
      topics: [
        {
          id: "topic-sections-on-off",
          title: "הפעלה וכיבוי של מקטעים",
          priority: 1,
          covers: ["settings.html", "assets/settings.js"],
          body: [
            { type: "p", text: "כל אחד עובד קצת אחרת. Sessions Garden בנויה כדי להתאים את עצמה לדרך שלכם — ולא להפך. אפשר להתחיל בעיצוב טופס המפגש כך שיציג רק את מה שאתם משתמשים בו." },
            { type: "steps", items: [
              "לפתוח את ההגדרות ולעבור אל {ui:settings.tab.fields}.",
              "להפעיל או לכבות כל מקטע במפגש, כך שטופס המפגש יציג רק את החלקים שאתם באמת עובדים איתם.",
              "ללחוץ על {ui:settings.action.save} כדי לשמור את השינויים."
            ] },
            { type: "note", text: "השינוי הזה משפיע על מה שמופיע בכל מקום שבו מתעדים מפגש — שום דבר לא נמחק אף פעם, כך שאפשר להפעיל מחדש כל מקטע בכל רגע." }
          ]
        },
        {
          id: "topic-renaming",
          title: "שינוי שמות של מקטעים",
          priority: 2,
          covers: ["settings.html", "assets/settings.js"],
          body: [
            { type: "p", text: "במקטע {ui:settings.tab.fields} אפשר לשנות את השם של רוב מקטעי המפגש למילים המדויקות שבהן אתם משתמשים מול הלקוחות, כך שהטופס ידבר בשפה שלכם. כמה מקטעים קבועים שומרים על שמם, אבל עדיין אפשר לכבות אותם." }
          ]
        },
        {
          id: "topic-snippet-library",
          title: "ספריית ההשלמות שלכם",
          priority: 2,
          covers: ["settings.html", "assets/settings-snippets.js", "assets/snippets-seed.js"],
          body: [
            { type: "p", text: "השלמות טקסט הופכות את הטקסט שאתם כותבים שוב ושוב — משמעויות של רגשות, הסברים על טכניקות, הערת הסיכום הקבועה שלכם — למילות מפתח קצרות שמתרחבות תוך כדי הקלדה. Sessions Garden מגיעה עם ספרייה מובנית של השלמות רגשות, ואפשר לעצב אותה מחדש כך שתהיה שלכם, במקטע {ui:settings.tab.snippets} שבהגדרות." },
            { type: "note", text: "המדריך המלא — יצירת השלמות והרחבתן באמצע מפגש — נמצא תחת 'תיעוד רגשות'." }
          ]
        },
        {
          id: "topic-date-format",
          title: "פורמט התאריך שלכם",
          priority: 2,
          covers: ["settings.html", "assets/settings.js"],
          body: [
            { type: "p", text: "מגדירים את {ui:settings.dateFormat.label} פעם אחת, בהגדרות תחת {ui:settings.tab.personalize}, ו-Sessions Garden משתמשת בו בכל מקום — כולל בייצוא." },
            { type: "note", text: "אפשר להשאיר על {ui:settings.dateFormat.auto} כדי לעקוב אחרי שפת האפליקציה, או לבחור את הסגנון המדויק שנוח לכם לקרוא." }
          ]
        },
        {
          id: "topic-session-formats",
          title: "פורמטי מפגש מותאמים אישית",
          priority: 2,
          covers: ["settings.html", "assets/settings.js"],
          body: [
            { type: "p", text: "מעבר לפורמטים המובנים {ui:session.type.clinic}, {ui:session.type.online}, {ui:session.type.remote}, {ui:session.type.proxy} ו-{ui:session.type.other}, אפשר להוסיף פורמטים משלכם תחת {ui:settings.sessionTypes.heading} במקטע {ui:settings.tab.personalize} — כך שכל מפגש תמיד מתויג בדרך שבה אתם חושבים עליו." }
          ]
        }
      ]
    },

    // ═══ THE SESSION LOOP ══════════════════════════════════════════════════
    {
      id: "adding-a-client",
      title: "הוספת לקוח",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-first-client",
          title: "הלקוח הראשון שלכם",
          priority: 1,
          covers: ["add-client.html", "index.html"],
          body: [
            { type: "p", text: "לקוח הוא האדם, הילד או בעל החיים שאיתו אתם עובדים. הוספת לקוח לוקחת רגע." },
            { type: "steps", items: [
              "לבחור {ui:nav.addClient} מהתפריט הראשי.",
              "להזין {ui:client.form.firstName} — זה הפרט היחיד שבאמת צריך כדי להתחיל.",
              "לבחור {ui:client.form.type}, ואז להוסיף כל דבר נוסף שעוזר, כמו תאריך לידה או הערות.",
              "ללחוץ {ui:client.form.save}, או {ui:client.form.saveAndSession} כדי לקפוץ ישר אל המפגש הראשון."
            ] },
            { type: "note", text: "ממהרים? תוך כדי פתיחת מפגש אפשר לבחור {ui:session.form.client.new} כדי ליצור את הלקוח בלי לעזוב את הדף." }
          ]
        },
        {
          id: "topic-client-types",
          title: "סוגי לקוחות",
          priority: 2,
          covers: ["add-client.html"],
          body: [
            { type: "p", text: "בוחרים {ui:client.form.type} בעת הוספת מישהו — {ui:client.form.type.adult}, {ui:client.form.type.child}, {ui:client.form.type.animal} או {ui:client.form.type.other}." }
          ]
        },
        {
          id: "topic-client-photo",
          title: "תמונות לקוח",
          priority: 3,
          covers: ["add-client.html", "assets/crop.js"],
          body: [
            { type: "p", text: "אפשר להוסיף {ui:client.form.photo} כדי לעזור לשמור על החיבור האנרגטי בעבודה מרחוק. לאחר ההעלאה אפשר לחתוך ולמקם אותה מחדש כך שתשב בדיוק במקום." }
          ]
        }
      ]
    },
    {
      id: "starting-a-session",
      title: "פתיחת מפגש",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-new-session",
          title: "שתי דרכים להתחיל",
          priority: 1,
          covers: ["sessions.html", "add-session.html"],
          body: [
            { type: "p", text: "יש שתי דרכים רגועות לפתוח מפגש חדש — אפשר להשתמש בזו שמתאימה לרגע." },
            { type: "steps", items: [
              "מתוך הסקירה הכללית, ללחוץ על + ({ui:overview.table.newSession}) בשורה של הלקוח.",
              "או לבחור {ui:nav.addSession} ולבחור שם את הלקוח.",
              "להגדיר {ui:session.form.date}, וזהו — אפשר להתחיל לתעד."
            ] }
          ]
        },
        {
          id: "topic-past-sessions",
          title: "מפגשים קודמים של לקוח",
          priority: 2,
          covers: ["sessions.html"],
          body: [
            { type: "p", text: "לפתוח {ui:nav.sessions} כדי לראות את כל מה שתיעדתם, או לבחור {ui:overview.table.viewSessions} אצל לקוח כדי לראות מה קרה בפעם הקודמת." }
          ]
        }
      ]
    },
    {
      id: "capturing-emotions",
      title: "תיעוד רגשות",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-quick-paste",
          title: "תיעוד רגשות במהירות",
          priority: 1,
          covers: ["add-session.html"],
          body: [
            { type: "p", text: "במהלך מפגש רוצים לתעד רגשות בלי לשבור את הרצף." },
            { type: "steps", items: [
              "לפתוח את המפגש ולהרחיב את {ui:session.accordion.emotions}.",
              "להקליד או להדביק את הרגשות ככל שהם עולים — בכל מילה שנוחה לכם, מחשבה אחת בכל פעם.",
              "להמשיך הלאה; אין צורך לעצור ולסדר את הניסוח עד שמסיימים."
            ] }
          ]
        },
        {
          id: "topic-snippets",
          title: "השלמות טקסט — להקליד פחות",
          priority: 1,
          covers: ["add-session.html", "settings.html", "assets/snippets.js", "assets/settings-snippets.js", "assets/snippets-seed.js"],
          body: [
            { type: "p", text: "השלמות טקסט הן מילות מפתח קצרות שמתרחבות לטקסט שאתם כותבים לעיתים קרובות — משמעות של רגש, הסבר על טכניקה, הערת הסיכום שאתם מוסיפים לרוב המפגשים. שומרים את הטקסט פעם אחת; לאחר מכן מילה אחת מחזירה אותו, כך שמקלידים פחות באמצע המפגש ונשארים נוכחים עם הלקוח." },
            { type: "p", text: "Sessions Garden מגיעה עם ספרייה מובנית של השלמות רגשות, מוכנות לשימוש. הוספת השלמות משלכם לוקחת דקה:" },
            { type: "steps", items: [
              "לפתוח את ההגדרות ולעבור אל {ui:settings.tab.snippets}.",
              "לבחור {ui:snippets.action.add} — או לבחור כל השלמה בספרייה כדי לערוך אותה, כולל המובנות.",
              "לתת לה {ui:snippets.editor.trigger.label} — מילה קצרה אחת שתזכרו, למשל closing. מילת טריגר לא יכולה להכיל רווחים, לכן מחברים שתי מילים במקף, למשל physical-trauma.",
              "לכתוב את הטקסט המלא שמילת הטריגר תתרחב אליו, ואז ללחוץ {ui:common.save}."
            ] },
            { type: "p", text: "השימוש בהשלמה פשוט באותה מידה. תוך כדי כתיבה במפגש, מקלידים את קידומת הטריגר (נקודה-פסיק, אלא אם שיניתם אותה), אחריה את מילת הטריגר, ואז רווח. מקלידים ;betrayal ורווח, וזה מתרחב למשמעות המלאה של בגידה — בדיוק במקום שבו נמצא הסמן." },
            { type: "p", text: "לא זוכרים את המילה המדויקת? מקלידים את הקידומת ואות ראשונה או שתיים, ורשימה קטנה של השלמות מתאימות מופיעה ליד הסמן — נעים בה עם מקשי החיצים ולוחצים Enter כדי להוסיף, או Escape כדי לסגור. גם הקלדת שם תגית אחרי הקידומת עובדת, ומציגה את ההשלמות שקיבצתם תחת אותה תגית." },
            { type: "p", text: "היכן זה זורח: אם אתם מסיימים את רוב המפגשים בהערה דומה — מה שוחרר, למה כדאי לשים לב בימים הקרובים — שומרים אותה פעם אחת תחת טריגר כמו closing, וכל מפגש יכול להסתיים במילה קצרה אחת במקום פסקה שמוקלדת מחדש מהזיכרון." },
            { type: "note", text: "השלמות טקסט מתרחבות בכל אזור הערות בטופס המפגש — רגשות, תובנות, הערות ועוד — וגם בעורך הייצוא, כך שגם סיכומי הלקוח יכולים להשתמש בהן." },
            { type: "note", text: "אפשר להפוך אותן לגמרי שלכם ב-{ui:settings.tab.snippets}: לשנות שם את {ui:snippets.prefix.label}, ולתת לכל השלמה טקסט ביותר משפת אפליקציה אחת בעזרת {ui:snippets.editor.translations.toggle}." }
          ]
        }
      ]
    },
    {
      id: "heart-wall",
      title: "חומת הלב",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-heartwall-workflow",
          title: "תהליך העבודה עם חומת הלב",
          priority: 1,
          covers: ["add-session.html"],
          body: [
            { type: "p", text: "כאשר מפגש הוא עבודה על חומת הלב, Sessions Garden עוזרת לסמן אותו ולעקוב אחריו לאורך המפגשים." },
            { type: "steps", items: [
              "במפגש, להפעיל את {ui:session.form.heartShield}.",
              "לתעד את מה שמתגלה ב-{ui:session.form.heartShieldEmotions}.",
              "לשמור את המפגש כרגיל — הוא כעת חלק מסיפור חומת הלב של הלקוח."
            ] }
          ]
        },
        {
          id: "topic-heartwall-removal",
          title: "מעקב אחר הסרה",
          priority: 2,
          covers: ["add-session.html", "assets/overview.js"],
          body: [
            { type: "p", text: "כאשר חומת לב יורדת, מגדירים את {ui:session.form.shieldRemoved} ל-{ui:session.form.shieldRemoved.yes}." },
            { type: "note", text: "הסטטוס של כל לקוח — {ui:overview.heartShield.active} או {ui:overview.heartShield.removed} — מחושב מתוך המפגשים שלו ומוצג בסקירה הכללית, כך שאף פעם לא צריך לעקוב אחריו ידנית." }
          ]
        }
      ]
    },
    {
      id: "severity",
      title: "מעקב חומרה",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-before-after",
          title: "דירוגים לפני ואחרי",
          priority: 1,
          covers: ["add-session.html"],
          body: [
            { type: "p", text: "דירוג כל נושא לפני העבודה ואחריה מראה את השינוי לאורך זמן, במספרים של הלקוח עצמו." },
            { type: "steps", items: [
              "לתת שם לנושא ב-{ui:session.form.issueName}.",
              "להגדיר {ui:session.form.beforeSeverity} בסולם של 0 עד 10 בהתחלה.",
              "בסוף המפגש, להגדיר {ui:session.form.afterSeverity} עבור אותו נושא."
            ] }
          ]
        },
        {
          id: "topic-multiple-issues",
          title: "כמה נושאים",
          priority: 2,
          covers: ["add-session.html"],
          body: [
            { type: "p", text: "עובדים על יותר מדבר אחד במפגש? לבחור {ui:session.form.addIssue} כדי לעקוב אחר נושא נוסף — עד שלושה בכל מפגש, לכל אחד דירוגי לפני-ואחרי משלו." }
          ]
        },
        {
          id: "topic-reversal",
          title: "להבין היפוך",
          priority: 2,
          covers: ["add-session.html"],
          body: [
            { type: "p", text: "לפעמים דירוג האחרי יוצא גבוה מדירוג הלפני. זה היפוך — לא כישלון, אלא מידע. לרוב זה אומר שמשהו עמוק יותר עלה, וכדאי לרשום אותו לפעם הבאה." }
          ]
        }
      ]
    },
    {
      id: "review-export",
      title: "סקירה וייצוא",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-single-export",
          title: "ייצוא מפגש בודד",
          priority: 1,
          covers: ["assets/export-modal.js", "assets/pdf-export.js"],
          body: [
            { type: "p", text: "כאשר מפגש מסתיים, אפשר לשלוח ללקוח עותק מעוצב להפליא או לתייק אותו ברשומות שלכם." },
            { type: "steps", items: [
              "לפתוח את המפגש השמור ולבחור {ui:session.export}.",
              "לסקור — ולערוך מעט — את מה שישותף.",
              "לבחור {ui:export.download.pdf} למסמך מלוטש, או {ui:export.download.text} כדי לשמור את ההערות כקובץ טקסט פשוט."
            ] }
          ]
        },
        {
          id: "topic-export-formats",
          title: "בחירת פורמט",
          priority: 2,
          covers: ["assets/export-modal.js"],
          body: [
            { type: "p", text: "PDF מתאים במיוחד לשליחת מסמך גמור ונאה ללקוח. טקסט פשוט מתאים במיוחד כשרוצים לשמור את ההערות ברשומות שלכם או להעביר אותן לאפליקציה אחרת." }
          ]
        }
      ]
    },
    {
      id: "overview",
      title: "הסקירה הכללית שלכם",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-dashboard",
          title: "לקרוא את הסקירה הכללית",
          priority: 2,
          covers: ["index.html", "assets/overview.js"],
          body: [
            { type: "p", text: "הסקירה הכללית מרכזת את כל העבודה שלכם במקום רגוע אחד: {ui:overview.stats.clients}, {ui:overview.stats.sessions} ו-{ui:overview.stats.month} נמצאים למעלה, וכל הלקוחות מופיעים למטה." }
          ]
        },
        {
          id: "topic-filters",
          title: "חיפוש וסינון",
          priority: 2,
          covers: ["index.html"],
          body: [
            { type: "p", text: "אפשר למצוא כל אחד במהירות. מחפשים לפי שם בראש הרשימה, ואז מצמצמים בעזרת {ui:overview.filter.type}, {ui:filter.sessionFormat} או {ui:overview.filter.heartShield}." },
            { type: "note", text: "אפשר לסדר מחדש את הרשימה בעזרת {ui:overview.filter.sort}, ולבחור {ui:overview.filter.clear} כדי להתחיל מחדש." }
          ]
        },
        {
          id: "topic-next-session",
          title: "תאריך המפגש הבא",
          priority: 2,
          covers: ["index.html", "add-session.html"],
          body: [
            { type: "p", text: "מגדירים {ui:session.form.nextSessionDate} במפגש והוא מופיע בסקירה הכללית תחת {ui:overview.table.nextSession} — מסומן {ui:overview.table.nextSession.overdue} ברגע שהתאריך עבר, כך שאף אחד לא נופל בין הכיסאות." }
          ]
        }
      ]
    },

    // ═══ THE TECHNICAL BITS ════════════════════════════════════════════════
    {
      id: "backups",
      title: "גיבויים והנתונים שלכם",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-data-local",
          title: "הנתונים אף פעם לא עוזבים את הדפדפן",
          priority: 1,
          covers: ["assets/db.js"],
          body: [
            { type: "p", text: "כל מה שאתם מתעדים ב-Sessions Garden נמצא במכשיר הזה בלבד, בתוך הדפדפן הזה. שום דבר אף פעם לא נשלח לשרת — הפרטיות הזו היא כל הרעיון של האפליקציה." },
            { type: "p", text: "זה גם אומר שאתם הגיבוי היחיד. אם הנתונים של הדפדפן הזה יימחקו אי פעם, המפגשים ייעלמו איתם, ולכן חשוב לשמור גיבוי משלכם." }
          ]
        },
        {
          id: "topic-backup-restore",
          title: "גיבוי ושחזור",
          priority: 1,
          covers: ["settings.html", "assets/backup.js", "assets/backup-modal.js"],
          body: [
            { type: "p", text: "גיבוי הוא קובץ יחיד שמכיל את כל הלקוחות והמפגשים שלכם. יצירת גיבוי לוקחת פחות מדקה." },
            { type: "steps", items: [
              "לפתוח את {ui:overview.backupRestore}.",
              "במקטע {ui:backup.export.heading}, לבחור {ui:backup.action.export} כדי לשמור קובץ גיבוי — אפשר להגן עליו במשפט סיסמה.",
              "לשמור את הקובץ במקום בטוח, כמו כונן חיצוני או אחסון הענן שלכם.",
              "כדי להחזיר את הנתונים, לפתוח את אותה חלונית, ללחוץ {ui:backup.action.import} ולבחור את קובץ הגיבוי."
            ] },
            { type: "note", text: "סמל הענן בכותרת מראה לפני כמה זמן גיביתם לאחרונה — תזכורת עדינה כשהגיע הזמן שוב." }
          ]
        },
        {
          id: "topic-working-offline",
          title: "עבודה במצב לא מקוון",
          priority: 2,
          covers: ["sw.js"],
          body: [
            { type: "p", text: "ברגע ש-Sessions Garden פתוחה בדפדפן, היא ממשיכה לעבוד בלי אינטרנט כלל — תיעוד מפגשים, ייצוא, הכול חוץ מהפעלת הרישיון (וביטול ההפעלה, כשעוברים מחשב)." }
          ]
        },
        {
          id: "topic-updates",
          title: "קבלת עדכונים",
          priority: 3,
          covers: ["sw.js"],
          body: [
            { type: "note", text: "כאשר גרסה חדשה מוכנה, Sessions Garden מתעדכנת בשקט בפעם הבאה שפותחים אותה במצב מקוון. אין מה להתקין ידנית." }
          ]
        }
      ]
    },
    {
      id: "installing",
      title: "התקנת האפליקציה",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-install-chrome",
          title: "Chrome ו-Edge",
          priority: 1,
          covers: ["sw.js", "manifest.json"],
          body: [
            { type: "glyph", name: "install-chrome" },
            { type: "p", text: "במחשב, Chrome ו-Edge מאפשרים להתקין את Sessions Garden כאפליקציה עצמאית בכמה לחיצות." },
            { type: "steps", items: [
              "לפתוח את Sessions Garden ב-Chrome או ב-Edge במחשב.",
              "לחפש בקצה שורת הכתובת את סמל ההתקנה הקטן — מסך עם חץ כלפי מטה.",
              "ללחוץ עליו, ואז לבחור התקנה (Install).",
              "האפליקציה נפתחת בחלון משלה ומקבלת קיצור דרך בשולחן העבודה — מעכשיו פותחים אותה כמו כל תוכנה אחרת."
            ] }
          ]
        },
        {
          id: "topic-install-safari",
          title: "Safari ב-Mac",
          priority: 1,
          covers: ["sw.js", "manifest.json"],
          body: [
            { type: "glyph", name: "install-safari" },
            { type: "p", text: "ב-Mac, Safari יכול להוסיף את Sessions Garden ישירות ל-Dock." },
            { type: "steps", items: [
              "לפתוח את Sessions Garden ב-Safari ב-Mac.",
              "בשורת התפריטים, לפתוח את תפריט File (או תפריט Share) ולבחור Add to Dock.",
              "לאשר את השם וללחוץ Add.",
              "Sessions Garden נמצאת עכשיו ב-Dock — לוחצים עליה כדי לפתוח את האפליקציה בחלון משלה."
            ] }
          ]
        },
        {
          id: "topic-install-mobile-note",
          title: "הערה לגבי טלפונים",
          priority: 2,
          covers: ["manifest.json"],
          body: [
            { type: "p", text: "Sessions Garden בנויה למחשב שלכם, שם אתם עושים את עבודת המפגשים." },
            { type: "note", text: "אפשר לפתוח אותה בדפדפן של הטלפון, אבל הלקוחות והמפגשים שלכם נמצאים בכל מכשיר בנפרד — אין סנכרון בין המחשב לטלפון. כדאי לשמור את העבודה האמיתית על המחשב שבו התקנתם את האפליקציה." }
          ]
        }
      ]
    },
    {
      id: "license",
      title: "רישיון ומכשירים",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-activation",
          title: "הפעלת הרישיון",
          priority: 1,
          covers: ["license.html", "assets/license.js"],
          body: [
            { type: "p", text: "מפתח רישיון פותח את האפליקציה המלאה. מזינים אותו פעם אחת." },
            { type: "steps", items: [
              "לפתוח את {ui:nav.license}.",
              "להדביק את מפתח הרישיון ממייל הרכישה.",
              "להפעיל — זה הרגע היחיד שבו Sessions Garden זקוקה לאינטרנט.",
              "לאחר ההפעלה, כל האפליקציה עובדת במצב לא מקוון מכאן והלאה."
            ] }
          ]
        },
        {
          id: "topic-trial",
          title: "להתנסות קודם",
          priority: 1,
          covers: ["license.html", "landing.html"],
          body: [
            { type: "p", text: "רוצים לחקור קודם? ההדגמה החיה בדף הפתיחה מאפשרת להתנסות ב-Sessions Garden עם נתוני דוגמה — היא מתאפסת בכל פעם, ושום דבר שמזינים בה לא נשמר. האפליקציה המלאה נפתחת לאחר הפעלת מפתח רישיון; מאותו רגע כל מה שמתעדים נשמר בבטחה במחשב שלכם." }
          ]
        },
        {
          id: "topic-two-devices",
          title: "מעבר למחשב חדש",
          priority: 2,
          covers: ["license.html", "assets/license.js"],
          body: [
            { type: "p", text: "הרישיון שלכם מכסה שתי הפעלות — שני דפדפנים או מחשבים." },
            { type: "note", text: "עוברים למחשב חדש? קודם מבטלים את ההפעלה בישן, ואז מפעילים בחדש, כדי להישאר במסגרת המגבלה של שתי הפעלות. חשוב לזכור להעביר את הנתונים בעזרת קובץ גיבוי." }
          ]
        }
      ]
    },
    {
      id: "troubleshooting",
      title: "פתרון תקלות",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-missing-clients",
          title: "\"אני לא רואה את הלקוחות שלי\"",
          priority: 1,
          covers: ["index.html", "assets/db.js"],
          body: [
            { type: "p", text: "הלקוחות והמפגשים שלכם נשמרים בתוך הדפדפן הזה במחשב הזה. אם נדמה שהם נעלמו, כמעט תמיד הם מוסתרים, לא אבודים." },
            { type: "steps", items: [
              "לוודא שאתם באותו דפדפן ופרופיל שבהם אתם משתמשים בדרך כלל — הנתונים לא עוברים בין דפדפנים.",
              "לוודא שלא ניקיתם את נתוני האתר או ההיסטוריה של האתר הזה.",
              "אם עברתם מחשב, לשחזר את הגיבוי האחרון שלכם מ-{ui:overview.backupRestore}."
            ] }
          ]
        },
        {
          id: "topic-report-problem",
          title: "דיווח על תקלה",
          priority: 2,
          covers: ["settings.html", "report.html", "assets/crashlog.js"],
          body: [
            { type: "p", text: "אם משהו לא עובד כמו שצריך, אפשר לשלוח לנו דוח אבחון — אבל שום דבר אף פעם לא נשלח אוטומטית." },
            { type: "steps", items: [
              "לפתוח את ההגדרות ולמצוא את {ui:settings.report.label}.",
              "לבחור {ui:report.action.copy} כדי להעתיק דוח אבחון.",
              "להדביק אותו במייל אל contact@sessionsgarden.app ולספר לנו מה קרה."
            ] },
            { type: "note", text: "עדיין תקועים? כתבו לנו אל contact@sessionsgarden.app — אדם אמיתי קורא כל הודעה." }
          ]
        }
      ]
    }
  ];

  window.HELP_CONTENT_HE = SECTIONS;
})();
