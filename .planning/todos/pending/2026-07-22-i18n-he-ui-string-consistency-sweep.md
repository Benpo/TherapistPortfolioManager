---
created: 2026-07-22T14:38:47.881Z
title: i18n-he UI-string consistency sweep — register, imperatives, emoji, terms
area: i18n
files:
  - assets/i18n-he.js
---

## Problem

Deferred by Ben 2026-07-22 ("not for now") — residue of the Hebrew polish pass
(todo 2026-07-10-hebrew-copy-polish-pass, executed 2026-07-22, commits
`f588caa` + `778cacb`). The polish pass fixed the help/changelog prose and the
clinical אופן-הטיפול family; the native-review agent also surfaced these
i18n-he.js inconsistencies, which Ben chose to record rather than fix now:

1. **Systemic register split** — older UI strings address the user in singular
   שלך (e.g. `settings.page.helper` "סגנון העבודה שלך", the `security.*`
   strings "הלקוחות שלך", `backup.banner.message`) while help/tour/newer
   chrome consistently use plural שלכם. Needs ONE deliberate decision, then a
   sweep — not string-by-string drift.
2. **Gendered singular imperative** — `overview.missingBirth.notice` ends
   "…פתח/י לקוח כדי להוסיף." breaking the infinitive/plural house register
   (suggest "…יש לפתוח לקוח כדי להוסיף").
3. **Emoji in greetings** — `greeting.morning` ☀️ / `greeting.afternoon` 🌿 /
   `greeting.evening` 🌙. The D-10 no-emoji rule gates only the help/changelog
   corpora, so these live on; decide whether they are intentional charm or a
   rule gap.
4. **Off-term toast** — `toast.issueMissing` says "בעיה" where the app's term
   for issue is "נושא" (cf. session.form.issueName surfaces).
5. **Off-register toast** — `toast.errorRequired` "אנא מלא שדות חובה" is a
   terse gendered-singular imperative (suggest "יש למלא את שדות החובה").
6. **Typography** — `backup.banner.message` uses a `--` double-hyphen where
   the house style is an em-dash (—).
7. **Poetic quote vs terminology rule** — `QUOTES.he` (i18n-he.js:734) "הקשר
   בין המטפל למטופל הוא מרחב עדין של צמיחה" uses the banned clinical family.
   Ben's explicit call needed: does the לקוח/מפגש rule apply to quoted poetry,
   or do quotes keep their own register? This is now the ONLY מטפל/מטופל/טיפול
   occurrence left in the Hebrew app surface.

## Solution

One focused content pass over `assets/i18n-he.js`: Ben decides item 1 (the
register) and item 7 (the quote) up front; items 2–6 are mechanical once 1 is
decided. Follow the polish-pass method: apply → suite + gates → pre-prod → Ben's
Hebrew read. Consider extending a forbidden-terms check to i18n-he.js UI strings
(excluding QUOTES if Ben exempts them) so the clinical family cannot re-enter.
