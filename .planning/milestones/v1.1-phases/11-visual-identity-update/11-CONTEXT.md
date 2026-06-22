# Phase 11: Visual Identity Update - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

הוספת אלמנטים בוטניים בתוך האפליקציה (דף הבית בלבד), החלפת הלוגו לאיור משפך השקיה חדש (באפליקציה ובדף הנחיתה), והכנת אייקון אפליקציה סופי. ללא שינויים פונקציונליים.

</domain>

<decisions>
## Implementation Decisions

### קישוטים בוטניים באפליקציה
- קישוטים **רק בדף הבית** (overview/index.html) — שאר הדפים נשארים נקיים
- **עציץ פרחים (deco3.png)** ליד אזור הברכה/ציטוט — לא משפך, כדי לא לחזור על הלוגו
- תמונת הגינה הרחבה (גינה.png / גינה 2.png) כחוצץ בין אזורים (סטטיסטיקות ↔ טבלת לקוחות)
- משפך (משפך.png) בתחתית הדף כאלמנט סגירה
- גישה מינימליסטית — "לא להעמיס, לשמור את זה פשוט ונעים לעין"
- משתמשים בקבצי PNG קיימים מ-`assets/illustrations/`

### לוגו — החלפה לאיור משפך
- להחליף את העלה SVG הנוכחי באיור המשפך החדש (`screenshots/new logo option.png`)
- הלוגו מופיע בשני מקומות: header האפליקציה (brand-mark, 48px) + header דף הנחיתה
- אותו לוגו בשניהם — אחידות מלאה

### אייקון אפליקציה (PWA)
- איור המשפך על רקע ירוק מעוגל — מחליף את ה-placeholder הנוכחי (ריבוע ירוק ריק)
- קלוד מכין את האייקונים (192px + 512px) מתמונת המשפך הקיימת
- מתעדכן ב-`assets/icons/icon-192.png` ו-`icon-512.png` + manifest.json

### Claude's Discretion
- Dark mode treatment לקישוטים הבוטניים (invert, opacity reduction, או שילוב)
- רקע/מסגרת של הלוגו ב-brand mark (שקוף, ריבוע ירוק, או גישה אחרת)
- התאמת גודל המשפך ל-48px brand mark — פישוט אם צריך
- מיקום מדויק ורווחים של הקישוטים בדף הבית
- טיפול ב-responsive — האם קישוטים מוסתרים במובייל

</decisions>

<specifics>
## Specific Ideas

- "אני מאוד אוהבת את האיורים. אני מאוד אוהבת קישוטים אבל גם חשוב לי מאוד מאוד לא להעמיס ולשמור את זה פשוט ונעים לעין"
- משפך ליד הברכה — "בדיוק כמו בדף הנחיתה"
- הגינה הרחבה כחוצץ — "אם יש מקום לשים את הגינה הרחבה היפה איפשהו כחוצץ בין אזורים זה יהיה נחמד"
- איור המשפך נבחר כלוגו חדש — עדיף על העלה כי יש לו יותר אופי ו"סיפור" (גינה = טיפוח = השקיה = צמיחה)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `assets/illustrations/משפך.png`: משפך עם צמחים — לקישוט ליד הברכה ובתחתית הדף
- `assets/illustrations/גינה.png` / `גינה 2.png`: חוצצים בוטניים — כבר בשימוש בדף הנחיתה
- `assets/illustrations/decorations/deco1-7.png`: אלמנטים נוספים אם צריך
- `screenshots/new logo option.png`: איור המשפך החדש ללוגו — ברזולוציה גבוהה

### Established Patterns
- `.brand-mark`: 48px ריבוע מעוגל עם SVG — צריך להחליף SVG ב-PNG או SVG חדש
- דף הנחיתה כבר משתמש ב-PNG illustrations עם `filter: invert(1)` ל-dark mode
- CSS custom properties (`var(--color-primary)` etc.) — חייבים להמשיך להשתמש
- `[data-theme="dark"]` selector ל-dark mode overrides

### Integration Points
- `index.html`: הוספת אלמנטים בוטניים (IMG tags) בדף הבית
- כל 5 דפי HTML + `landing.html`: החלפת brand-mark SVG בלוגו חדש
- `assets/app.css`: סגנונות לקישוטים + עדכון dark mode
- `assets/icons/icon-192.png` + `icon-512.png`: החלפת אייקוני PWA
- `manifest.json`: אישור שהאייקונים מצביעים נכון

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-visual-identity-update*
*Context gathered: 2026-03-19*
