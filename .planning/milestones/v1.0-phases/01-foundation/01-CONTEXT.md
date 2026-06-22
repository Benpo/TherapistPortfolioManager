# Phase 1: Foundation - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

כל התשתית הטכנית הדרושה לפני עבודת עיצוב, נתונים ופיצ'רים: מערכת design tokens לצבעים, פונט Rubik בשירות עצמי, תשתית migration לIndexedDB, ותזכורת גיבוי למשתמש. Phase זה לא משנה את המראה — הוא מניח את הרצפה שעליה Phase 2 ילך.

</domain>

<decisions>
## Implementation Decisions

### Design Tokens — ארכיטקטורה
- קובץ נפרד `assets/tokens.css` שנטען ראשון בכל דף (לפני app.css)
- ארכיטקטורה דו-שכבתית: primitives (ערכים גולמיים) + semantic tokens (משמעות)
- Phase זה מכסה **צבעים בלבד** — טיפוגרפיה ורווחים יתווספו ב-Phase 2 לפי הצורך
- שמות משתנים באנגלית פשוטה: `--color-primary`, `--color-background`, `--color-surface`, `--color-text` וכו'
- שמות tokens גולמיים: `--color-green-700`, `--color-cream-100` וכו'
- Dark mode מיושם דרך `data-theme="dark"` attribute על ה-`<html>` element — Claude יבחר את ערכי הצבעים הספציפיים

### Design Tokens — היקף ההמרה
- כל הצבעים הקיימים ב-`assets/app.css` יוחלפו ב-token references
- Phase 2 יוסיף את ערכי הגינה האמיתיים (cream, garden green, orange) — כאן רק הסרת hardcoded colors

### פונטים — Self-hosting
- הורדת Rubik (WOFF2) ושמירה מקומית ב-`assets/fonts/`
- Nunito: Claude יחליט לפי מה שקיים בקוד — אם App Phase 2 מחליפה ל-Rubik בלבד, אין טעם להוריד Nunito
- ה-Google Fonts CDN link מוסר מכל ה-HTML files
- Fallback stack: `Rubik, system-ui, sans-serif`

### תזכורת גיבוי — UX
- **סגנון:** באנר לא חוסם בראש הדף — מופיע מיד עם פתיחת האפ, לא דורש לחיצה מידית, נשאר עד שמתייחסים אליו
- **Snooze:** שתי אפשרויות — "מחר" (24 שעות) ו-"שבוע" (7 ימים)
- **מה מסיים את הטיימר:** Claude יחליט — בהיגיון: יצוא נתונים (JSON export) מאפס את הספירה
- **טריגר:** 7 ימים מהשימוש האחרון ב-export, נשמר ב-localStorage
- **כפתורים בבאנר:** "גיבוי עכשיו" (→ פעולת export) | "דחה למחר" | "דחה לשבוע" | X (סגור ללא snooze — מצב edge)

### IndexedDB Migration — תשתית
- migration handler שמטפל בשדרוג דרך מספר גרסאות ברצף (v1→v2→v3 וכו')
- כשה-DB **נחסם** (שני טאבים פתוחים בו-זמנית): הודעה ברורה למשתמש "סגור טאבים אחרים כדי להמשיך" — Claude יבחר פורמט
- כשמשדרגים גרסאות: migration עובד בשקט ברקע ללא הודעה למשתמש (אם הכל עלה חלק)
- כשה-migration **נכשל:** הודעת שגיאה ברורה + כפתור "רענן את הדף" — Claude יחליט על פרטי ה-recovery
- אין אפשרות reset DB בממשק — Claude לא יוסיף זאת אלא אם יש בהירות מוחלטת

### Claude's Discretion
- בחירת ערכי הצבעים הזמניים ל-tokens ב-Phase זה (Phase 2 יחליף אותם ממילא)
- קביעה מה מאפס את הטיימר של תזכורת הגיבוי (יצוא נתונים)
- טיפול בשגיאות migration קשות (strategy ה-recovery)
- הורדת Nunito או לא (בהתאם לשימוש בקוד הקיים)
- פורמט ההודעה כשה-DB נחסם

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `assets/app.css`: כל הסגנונות — יעבור scan מלא להחלפת hardcoded colors ב-tokens
- `assets/db.js`: IndexedDB version 1, object stores: `clients` + `sessions` — migration wrapper יעטוף את פתיחת ה-DB הקיימת
- `assets/app.js`: App namespace עם `showToast()`, `confirmDialog()` — ניתן לשימוש להצגת הודעות migration ותזכורת גיבוי
- localStorage: כבר בשימוש לשמירת שפה (`portfolioLang`) — תזכורת גיבוי תשמור timestamps בצמוד

### Established Patterns
- כל הדפים טוענים: `i18n.js` → `db.js` → `app.js` → page-specific.js — `tokens.css` ייטען ראשון לפני `app.css`
- Global namespace pattern: `window.App`, `window.PortfolioDB`, `window.I18N` — migration wrapper יתחבר ל-`PortfolioDB`
- CSS classes: kebab-case, utility classes `is-*`, `has-*` — סגנון באנר הגיבוי יעקוב אחרי מוסכמה זו

### Integration Points
- `assets/db.js` — migration wrapper יוסיף `onupgradeneeded`, `onblocked`, `onversionchange` handlers
- כל ה-5 HTML files — הוספת `<link>` ל-`tokens.css` ראשון + הסרת Google Fonts link
- `assets/app.js` — הוספת backup reminder logic (timer check + banner render) שירוץ בכל פתיחת דף
- `assets/overview.js` — כנראה המקום הנוח ביותר לחבר את הפעלת ה-backup export מתוך הבאנר

</code_context>

<specifics>
## Specific Ideas

- "לא רצוני להציק למשתמש, אבל חשוב מאד לתזכר בכל כמה ימים לגיבוי" — הפתרון: באנר לא חוסם שנשאר בראש הדף עד שמתייחסים אליו, לא modal
- שמות ה-CSS variables צריכים להיות באנגלית פשוטה (לא "גינה-ירוק") כדי שיהיו קריאים גם לאדם לא טכני

</specifics>

<deferred>
## Deferred Ideas

אין — הדיון נשאר בגבולות Phase 1.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-09*
