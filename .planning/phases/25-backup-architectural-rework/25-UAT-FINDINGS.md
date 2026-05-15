---
phase: 25-backup-architectural-rework
captured: 2026-05-15
source: ben-uat (live browser test, 2026-05-15)
status: open
total_items: 19
grouping:
  hebrew: 6
  backup_flow: 5
  modal_layout: 2
  state_colors: 1
  settings_pages: 3
  earlier_uat: 2
---

# Phase 25 UAT Findings (Ben, 2026-05-15)

Captured live during browser test. Bundled here so `/gsd-plan-phase 25 --gaps` sees these alongside `25-VERIFICATION.md` (CR-01..03 blockers).

Existing inputs to gap-closure:
- **25-VERIFICATION.md** — 3 verifier blockers (CR-01 schedule debounce, CR-02 `snippetsDeletedSeeds` sentinel drop, CR-03 he masculine imperatives)
- **25-REVIEW.md** — same 3 blockers + 7 warnings + 5 info

---

## A. Hebrew translation issues

### UAT-C1 — Ambiguous Export contents-list disclaimer
String: `רשומות לקוחות ומפגשים נשמרות. לא ניתן לבטל.`
Problem: Phrasing parses as "client and session records are saved — cannot cancel," but the intended action being uncancellable is unclear (cancel what — the save? the export?). Either reword for clarity or drop the second sentence here.
Reachable from: Backup & Restore modal contents-list.

### UAT-C2 — Optimize-images dialog placeholders not substituted
String: `מיטוב {n} תמונות?\nפעולה זו תכתוב מחדש כל תמונה בגודל קטן יותר בדפדפן. לא ניתן לבטל, אך איכות התצוגה נשמרת. חיסכון משוער: ~{size}.`
Problem: `{n}` and `{size}` rendered literally — i18n placeholder substitution is failing for this string in Hebrew (likely English fallback path doesn't compose, or the optimize-all confirm uses raw text instead of `App.t(..., {n, size})`).
Reachable from: Settings → Photos tab → "Optimize all" button.

### UAT-C3 — Hard-coded English in Hebrew UI
String shown: `Photos use 33.5 KB of your browser storage.`
Problem: This sentence is hard-coded English (probably a template literal in `settings.js` Photos tab body), not routed through `App.t()`. Needs `photos.usage.body` key in all four locales.
Reachable from: Settings → Photos tab (storage estimator).

### UAT-C4 — Several Hebrew strings sound awkward / wrong word choice
Strings to rewrite:
- `שמירה של עותק מכל הנתונים` — stilted; consider `שמירת עותק של כל הנתונים` or simpler.
- `תמונות (חתוכות, ממוטבות)` — `חתוכות` literally means "cut/sliced" with violent connotation; for "cropped" use `חתוכות לפי מסגרת` or just drop the parenthetical. `ממוטבות` reads as engineering jargon.
- `מיטוב תמונות קיימות` → user prefers `אופטימיזציה` (loanword is more natural to therapists than the Hebraic coinage `מיטוב`).

### UAT-C5 — Restore disclaimer appears in Export contents-list (wrong location)
String: `כל ייצוא כולל את כל הפריטים שלהלן. שחזור יחליף את כל הנתונים הנוכחיים ברשימה זו.`
Problem: The "restore replaces current data" sentence belongs in the Restore/Import section, not the Export contents-list. Split into two locale strings, scoped to the right sections.

### UAT-C6 — `i18n-he.js:271, :285` masculine-singular imperatives (CR-03 dup)
Already captured in 25-VERIFICATION.md / 25-REVIEW.md CR-03. Keeping ID here for cross-reference.

---

## B. Backup flow / interaction issues

### UAT-D1 — "Backup folder" picker should be REMOVED, not just relocated
D-11 moved the folder picker from overview to Settings. Ben's intent is to remove it entirely — Phase 25 uses the browser's download wizard (Web Share API / mailto / standard download). The folder picker is dead UI.
Fix: Delete the folder picker UI block from Settings → Backups tab and related handler/i18n keys.

### UAT-D2 — Backup icon from inside Settings navigates to overview first
Click the header cloud icon while on `settings.html` → user is bounced to `index.html?openBackup=1` → THEN the modal opens.
Expected: Modal opens in-place on whatever page the user clicked from. The cloud-icon mount/handler should be page-agnostic, not depend on overview.js DOM.
Note: This is likely the same root cause as CR-01 (`openBackupModal` only exists on overview.js) — fixing CR-01 by mounting the modal markup + handler on every page closes UAT-D2 too.

### UAT-D3 — Schedule frequency change has insufficient feedback
After selecting weekly/daily/monthly in Settings → Backups, the sentence near the picker updates, but the change feels too quiet — no toast, no animation, no visual confirmation of "schedule saved." User isn't confident the change took effect.
Fix: Add a confirm toast or in-place "Saved" affordance with stronger visual treatment.

### UAT-D4 — Optimize-all completion toast too small, too far, too brief
After Optimize-All finishes, a small toast appears in some default toast slot (corner?) and disappears quickly. Ben expects it close to the "savings" sentence so the cause→effect link is obvious, and visible long enough to read the actual savings number.
Fix: Either anchor the result toast next to the Optimize button or persist it inline (replacing the "estimated savings" line with the actual savings number for ~5-10s).

### UAT-D5 — Modal footer link doesn't look clickable
String: `הגדרת תזמון בהגדרות ← גיבויים, כדי שלא יהיה צורך לזכור.`
Behavior: Clickable, navigates to Settings → Backups (good).
Problem: Renders as plain paragraph text — no underline, no link color, no hover state. Users won't try to click it.
Fix: Style as a button or an explicit anchor (underlined + link color + hover state).

---

## C. Modal layout / spacing

### UAT-D6 — Test-password drop zone styled as full-width pill, looks like an input
Reference: image attached by Ben (Test-password sub-card).
Observation: `גרירת קובץ גיבוי לכאן, או לחיצה לבחירה.` is rendered as a full-width pill matching the password input below it. Visual reads as "two stacked text inputs" — confusing.
Expected: Drop zone styled as a dashed-border box or a button with a clearly different visual treatment from the password input. Add vertical spacing between the drop zone and the password input.

### UAT-D7 — General button spacing in new modal
Buttons in the new Backup & Restore modal need consistent spacing — user said "no space between buttons" for one area (likely the Export/Import action row or the Test-password CTA cluster).
Fix: Add `gap` to the relevant flex containers in `app.css`.

---

## D. Cloud-icon color clash with current-page indicator

### UAT-E1 — Header cloud and gear both green when on Settings page (same hue)
On settings.html: gear icon is green (current-page indicator) AND cloud icon is green (fresh-backup state) — the same hue. Visual reads as "two equally important things" instead of "I am on Settings."
Possible fixes (Ben's suggestions):
- Make the backup "fresh" state more subtle (less saturated, or a different signal entirely — border color, dot, ring) until it turns yellow/red where strong color is warranted.
- Or differentiate fresh-backup color from current-page color (different green hue, or non-green for fresh).
- Or use a non-fill signal for backup state (ring/border) so the current-page fill always wins visually.

---

## E. Photos settings page issues

### UAT-F1 — Buttons stretch to full width
Optimize-all / Delete-all buttons span the full content width — looks bizarre next to normal button sizing elsewhere in the app.
Fix: Sized to content with sensible min-width, left-aligned (or RTL-start-aligned for he).

### UAT-F2 — Photos tab subtitle framing is wrong
String: `ניהול אופן השימוש של תמונות לקוחות באחסון הדפדפן.`
Problem: Reads as "manage how client photos are used in browser storage" — abstract and technical. The real value: optimize photos to speed up the app and reduce local storage. Rewrite simply, non-technical, in a way a therapist understands.
Suggested direction (he, draft): `כיווץ ומחיקה של תמונות לקוחות כדי לפנות מקום ולהאיץ את האפליקציה.`

### UAT-F3 — Settings header text should mention device-scope AND backup-coverage
Current: `התאמת האפליקציה לסגנון העבודה שלך. השינויים נשמרים במכשיר זה.`
Add: Mention that settings are saved only on THIS device AND that they're included in the backup.
Suggested direction (he, draft): `התאמת האפליקציה לסגנון העבודה שלך. השינויים נשמרים במכשיר זה וכלולים בגיבוי.`

---

## F. From earlier UAT (pre-image submission)

### UAT-A — Day-count picker only relevant for "custom" frequency
Settings → Backups: when frequency is OFF, weekly, daily, or monthly, the day-count picker should be hidden. Only show it when frequency = custom.

### UAT-B — Password-acknowledgment checkbox alignment
Settings → Backups: checkbox sits to the left of a 2-line verification text; should be underneath the text so the label/checkbox visual hierarchy reads correctly.

---

## Gap-closure scope summary

| Block | Items | Owner-files |
|-------|-------|-------------|
| Hebrew rewording | UAT-C1..C6 | `assets/i18n-he.js` (+ EN/DE/CS for parallel rephrasings) |
| i18n placeholder + hard-coded strings | UAT-C2, C3 | `assets/settings.js`, all 4 i18n files |
| Backup flow | UAT-D1..D5 | `assets/settings.js`, `assets/app.js`, `assets/overview.js`, `index.html`, `settings.html` |
| Modal layout | UAT-D6, D7 | `assets/app.css`, `index.html` |
| Cloud-icon state colors | UAT-E1 | `assets/app.css` (Phase 25 band), possibly `assets/app.js` |
| Photos page polish | UAT-F1, F2 | `settings.html`, `assets/app.css`, all 4 i18n files |
| Settings header copy | UAT-F3 | all 4 i18n files |
| Verifier blockers | CR-01, CR-02, CR-03 | `assets/backup.js`, `assets/db.js`, `assets/i18n-he.js` |
| Earlier UAT | UAT-A, UAT-B | `assets/settings.js`, `settings.html`, `assets/app.css` |
| **Total** | **19** | |
