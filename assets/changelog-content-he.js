// changelog-content-he.js — Hebrew locale sibling of changelog-content-en.js
// (Phase 42.1, L10N-01; D-07). Full native Hebrew history of every release.
//
// Registers ONE global:
//   window.CHANGELOG_CONTENT_HE — reverse-chronological array of release entries,
//     structurally identical to CHANGELOG_CONTENT_EN. changelog.js localeEntries()
//     and whats-new.js entries() merge per-entry on `version`, falling back to EN
//     where a locale entry is missing. Both surfaces (changelog page + What's-New
//     popup) then read natively in Hebrew.
//
// Parity contract (enforced by tests/42_1-changelog-integrity-locale.test.js):
//   version / anchor / origin flag / category-key set + order are byte-identical
//   to EN — ONLY the lede / highlights / category strings + the month word are
//   translated. The v1.0 entry stays origin-only (no highlights/categories).
//   Terminology: Heart-Wall → חומת הלב; client → לקוח; session → מפגש. Brand and
//   format tokens (Sessions Garden, PDF, Safari) stay Latin. No emojis, no
//   control/bidi-control chars, no clinical patient/treatment terms.

(function () {
  "use strict";

  window.CHANGELOG_CONTENT_HE = [

    // v1.3 — In-App Help, Onboarding & Changelog
    {
      version: "1.3.0",
      anchor: "v1-3",
      date: "יולי 2026",
      lede: "הגרסה הזו מוקדשת לתחושת בית ב-Sessions Garden, עם הכוונה עדינה בדיוק במקום שבו צריך אותה.",
      highlights: [
        "כפתור עזרה בכל עמוד פותח מרכז עזרה עם חיפוש.",
        "סיור מודרך מלווה צעד אחר צעד בפעם הראשונה שפותחים את האפליקציה.",
        "הערות הגרסה נמצאות עכשיו בתוך האפליקציה, כך שתמיד אפשר לראות מה חדש.",
      ],
      categories: {
        new: [
          "מרכז עזרה עם חיפוש שאפשר לפתוח מכל עמוד.",
          "מסך פתיחה מזמין בפעם הראשונה שפותחים את האפליקציה.",
          "סיור מודרך בתהליך העבודה המרכזי, בכל פעם שרוצים רענון.",
          "יומן השינויים הזה בתוך האפליקציה, כך שקל לעקוב אחרי כל עדכון.",
        ],
        improved: [
          "הנחיה ברורה יותר להוספת Sessions Garden למסך הבית של הטלפון.",
        ],
      },
    },

    // v1.2 — Personalize, session formats & faster finding
    {
      version: "1.2.0",
      anchor: "v1-2",
      date: "יולי 2026",
      lede: "אפשר להתאים את Sessions Garden באופן אישי — עם פורמט התאריך שלכם, סוגי המפגשים שלכם ודרכים מהירות יותר למצוא כל מפגש.",
      highlights: [
        "לשונית 'התאמה אישית' חדשה מאפשרת לבחור כיצד יופיעו התאריכים בכל האפליקציה.",
        "אפשר לשנות את שמות סוגי המפגשים המובנים או להוסיף משלכם.",
        "סינון ומיון של המפגשים כדי למצוא מהר את מה שצריך.",
      ],
      categories: {
        new: [
          "לשונית 'התאמה אישית' בהגדרות לבחירת פורמט התאריך.",
          "סוגי מפגשים מותאמים אישית שאפשר לשנות את שמם או להוסיף.",
          "מסנן לפי סוג המפגש בדף הסקירה ובדף המפגשים.",
          "מסנן חומת הלב שמציג רק את המפגשים שבהם עבדו על חומת הלב.",
          "לחיצה על כותרת עמודה בדף הסקירה ממיינת לפיה.",
        ],
        improved: [
          "התאריכים נראים עכשיו זהים בכל מקום, כולל בקובצי ה-PDF המיוצאים.",
          "התקנה אמינה יותר ב-Safari.",
          "חומת הלב מכונה באותו שם בעקביות בכל האפליקציה.",
        ],
        fixed: [
          "האפליקציה מתאוששת עכשיו בכוחות עצמה משגיאות מסד נתונים מסוימות.",
          "רענון של העמודים המשפטיים.",
        ],
      },
    },

    // v1.1 — export, snippets & encrypted backups
    {
      version: "1.1.0",
      anchor: "v1-1",
      date: "יוני 2026",
      lede: "נבנתה כדי לעזור לכם לייצא, לעשות שימוש חוזר ולשמור על העבודה שלכם.",
      highlights: [
        "ייצוא קובץ PDF מוקפד של היסטוריית המפגשים של כל לקוח.",
        "שמירת קטעי טקסט לשימוש חוזר לכתיבת סיכומי מפגש מהירה יותר.",
        "גיבויים מוצפנים שומרים על הנתונים שלכם בטוחים במכשיר שלכם.",
      ],
      categories: {
        new: [
          "ייצוא PDF ללקוח של היסטוריית המפגשים המלאה של הלקוח.",
          "קטעי טקסט לשימוש חוזר עבור הסיכומים שכותבים שוב ושוב.",
          "גיבויים מוצפנים ומוגנים בסיסמה של הנתונים שלכם.",
        ],
        improved: [
          "תזכורות עדינות לגבות את העבודה שלכם.",
        ],
      },
    },

    // v1.0 — origin marker only
    {
      version: "1.0.0",
      anchor: "v1-0",
      date: "מאי 2026",
      lede: "כאן הכול התחיל — הזרע הראשון של Sessions Garden.",
      origin: true,
    },

  ];
})();
