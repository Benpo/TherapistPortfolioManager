---
phase: 25-backup-architectural-rework
plan: 11
subsystem: i18n
tags: [i18n, hebrew, gender-neutral, copy, gap-closure, behavior-test, wr-01, cr-03]
requires:
  - i18n-he.js (with masc-sg imperatives)
  - 4 English literals in settings.js
  - hardcoded English template literal in photos usage line
provides:
  - 5 new i18n keys in 4 locales (photos.usage.body, settings.save.failed, photos.optimize.{unavailable,failed}, photos.deleteAll.failed)
  - Hebrew gender-neutral phrasing on CR-03 lines
  - UAT-C1/C4/C5/F2/F3 Hebrew rephrasings per Ben's drafts
  - i18n parity test (D-28 lock-down)
  - hardcoded-english-removed structural shape test
  - toast-behavior runtime test (vm-sandbox)
affects:
  - settings.js Save handler catch (line 521)
  - settings.js photos optimize/delete handlers (lines 2385, 2413, 2458)
  - settings.js storage line render (line 2321)
tech-stack:
  added: []
  patterns:
    - "RED→GREEN TDD with both structural-shape and runtime-behavior tests (per feedback-behavior-verification.md)"
    - "vm-sandbox behavior test for settings.js (DOMContentLoaded fire + synthetic click dispatch)"
    - "Extracted-block strategy for testing closure-private handlers (Save-failed catch)"
key-files:
  created:
    - tests/25-11-i18n-parity.test.js
    - tests/25-11-hardcoded-english-removed.test.js
    - tests/25-11-toast-behavior.test.js
  modified:
    - assets/i18n-he.js
    - assets/i18n-en.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
    - assets/settings.js
decisions:
  - "UAT-C4 photos parenthetical: chose Ben's parenthetical-rewrite variant `(לאחר חיתוך ואופטימיזציה)` over the drop-the-parenthetical option — preserves information density"
  - "UAT-C4 loanword: applied `אופטימיזציה`/`עברו אופטימיזציה` consistently across all photos.optimize.* keys, replacing the Hebraic coinage `מיטוב`/`מוטבו` per Ben's stated preference"
  - "UAT-C3 fallback strategy: `tt('photos.usage.body', 'photos.usage.body')` — the second-arg fallback is the key itself, never an English literal. If the i18n value is missing, the user sees the key string (visible 'photos.usage.body' is a louder regression signal than English fallback noise)"
  - "Save-failed runtime test uses extracted-block replay because SettingsPage IIFE does not expose a public save() entrypoint. The verbatim catch block is replayed against fresh spies — proves the toast contract even though the handler is closure-private"
metrics:
  duration: "~35min"
  completed: 2026-05-15
---

# Phase 25 Plan 11: Localization Gap-Closure — Hebrew Polish + WR-01 + UAT Rephrasings Summary

Closed all 7 localization gap-closure items from `25-VERIFICATION.md` CR-03 (verifier blocker), `25-UAT-FINDINGS.md` UAT-C1/C3/C4/C5/F2/F3 (Ben's live browser test), and `25-REVIEW.md` WR-01 (4 hardcoded English toasts). 5 new i18n keys added in 4 locales (D-28 parity); 11 Hebrew strings rephrased; 4 settings.js toast call-sites + 1 storage-line literal routed through i18n.

## What Changed

### 6 Hebrew strings rephrased (CR-03 + UAT-C1/C4/C5/F2/F3)

| Key | Before | After |
| --- | --- | --- |
| `security.persistent.body` (CR-03) | `…השתמש בגיבויים מוצפנים ונעל את המכשיר שלך…` | `…מומלץ להשתמש בגיבויים מוצפנים ולנעול את המכשיר…` |
| `backup.passphrase.tooSimple` (CR-03) | `הסיסמה פשוטה מדי. השתמש בשילוב…` | `הסיסמה פשוטה מדי. מומלץ להשתמש בשילוב…` |
| `photos.deleteAll.confirm.body` (UAT-C1) | `הסרת כל תמונות הלקוחות מהדפדפן. רשומות לקוחות ומפגשים נשמרות. לא ניתן לבטל.` | `פעולה זו תסיר את כל תמונות הלקוחות מהדפדפן. רשומות הלקוחות והמפגשים יישמרו, אך לא ניתן יהיה לשחזר את התמונות.` |
| `photos.helper` (UAT-F2) | `ניהול אופן השימוש של תמונות לקוחות באחסון הדפדפן.` | `כיווץ ומחיקה של תמונות לקוחות כדי לפנות מקום ולהאיץ את האפליקציה.` |
| `settings.page.helper` (UAT-F3) | `התאמת האפליקציה לסגנון העבודה שלך. השינויים נשמרים במכשיר זה.` | `התאמת האפליקציה לסגנון העבודה שלך. השינויים נשמרים במכשיר זה וכלולים בגיבוי.` |
| `backup.contents.helper` (UAT-C5, he) | `כל ייצוא כולל את כל הפריטים שלהלן. שחזור יחליף את כל הנתונים הנוכחיים ברשימה זו.` | `כל ייצוא כולל את כל הפריטים שלהלן.` (split — restore half now lives only in `backup.import.helper`) |

### UAT-C4 — loanword consistency (`מיטוב`/`ממוטב` → `אופטימיזציה`/`מותאם`)

| Key | Before | After |
| --- | --- | --- |
| `photos.optimize.heading` | `מיטוב תמונות קיימות` | `אופטימיזציה של תמונות קיימות` |
| `photos.optimize.action` | `מיטוב כל התמונות` | `אופטימיזציה של כל התמונות` |
| `photos.optimize.confirm.title` | `מיטוב {n} תמונות?` | `אופטימיזציה של {n} תמונות?` |
| `photos.optimize.confirm.yes` | `כן, למטב` | `כן, לבצע אופטימיזציה` |
| `photos.optimize.success` | `התמונות מוטבו. נחסכו {size}.` | `האופטימיזציה הושלמה. נחסכו {size}.` |
| `photos.optimize.partialFailure` | `מוטבו {success} תמונות. …` | `עברו אופטימיזציה {success} תמונות. …` |
| `photos.optimize.helper` | `…העלאות חדשות כבר ממוטבות אוטומטית.` | `…העלאות חדשות עוברות אופטימיזציה אוטומטית.` |
| `backup.contents.item.photos` | `תמונות (חתוכות, ממוטבות)` | `תמונות (לאחר חיתוך ואופטימיזציה)` |
| `backup.export.helper` | `שמירה של עותק מכל הנתונים. …` | `שמירת עותק של כל הנתונים. …` |

### 5 NEW i18n keys × 4 locales (D-28 parity)

| Key | EN | HE | DE | CS |
| --- | --- | --- | --- | --- |
| `photos.usage.body` | `Photos use {size} of your browser storage.` | `התמונות תופסות {size} מאחסון הדפדפן.` | `Fotos belegen {size} des Browser-Speichers.` | `Fotografie zabírají {size} úložiště prohlížeče.` |
| `settings.save.failed` | `Could not save your settings. Please try again.` | `השמירה נכשלה. ניתן לנסות שוב.` | `Einstellungen konnten nicht gespeichert werden. Bitte erneut versuchen.` | `Nastavení se nepodařilo uložit. Zkuste to znovu.` |
| `photos.optimize.unavailable` | `Photo optimization is unavailable — helper files didn't load.` | `אופטימיזציית התמונות אינה זמינה — רכיבי העזר לא נטענו.` | `Foto-Optimierung ist nicht verfügbar — Hilfsdateien wurden nicht geladen.` | `Optimalizace fotografií není dostupná — pomocné soubory se nenačetly.` |
| `photos.optimize.failed` | `Could not optimize photos.` | `לא ניתן היה לבצע אופטימיזציה לתמונות.` | `Fotos konnten nicht optimiert werden.` | `Fotografie se nepodařilo optimalizovat.` |
| `photos.deleteAll.failed` | `Could not delete photos.` | `לא ניתן היה למחוק את התמונות.` | `Fotos konnten nicht gelöscht werden.` | `Fotografie se nepodařilo smazat.` |

EN/DE/CS also received the UAT-C5 split (dropped the "Restoring replaces" half from `backup.contents.helper`; `backup.import.helper` retains it).

### settings.js call-site refactors (WR-01 + UAT-C3)

| Line | Path | Before | After |
| --- | --- | --- | --- |
| 521 | Save handler catch | `App.showToast("Save failed", "")` | `App.showToast("", "settings.save.failed")` |
| 2321 | Photos usage render | `tt('photos.usage.line', 'Photos use {size} of your browser storage.')` | `tt('photos.usage.body', 'photos.usage.body')` |
| 2385 | Optimize: helpers absent | `App.showToast('Optimize is unavailable — photo helpers not loaded', '')` | `App.showToast('', 'photos.optimize.unavailable')` |
| 2413 | Optimize: loop throw | `App.showToast('Could not optimize photos', '')` | `App.showToast('', 'photos.optimize.failed')` |
| 2458 | Delete-all: loop throw | `App.showToast('Could not delete photos', '')` | `App.showToast('', 'photos.deleteAll.failed')` |

The old `photos.usage.line` key is preserved in all 4 locales (no caller now references it, but removal is deferred to avoid coupling this gap-closure plan to a key-deletion sweep).

### Toast-behavior test scenarios (`tests/25-11-toast-behavior.test.js`)

Per the project's `feedback-behavior-verification.md` rule, source-grep alone does not prove runtime behavior. The new vm-sandbox test loads `assets/settings.js`, fires its `DOMContentLoaded` handlers to bind the photo-tab handlers, then exercises each error path:

1. **Optimize unavailable** — `CropModule` undefined → handler hits the "helpers not loaded" guard → `App.showToast` spy records `['', 'photos.optimize.unavailable']`.
2. **Optimize failed** — `__PhotosTabHelpers._optimizeAllPhotosLoop` patched to reject → outer try/catch fires → `['', 'photos.optimize.failed']`.
3. **Delete-all failed** — `__PhotosTabHelpers._deleteAllPhotosLoop` patched to reject → outer try/catch fires → `['', 'photos.deleteAll.failed']`.
4. **UAT-C3 storage line** — Hebrew-translated `tValues['photos.usage.body']` provided to the `App.t` spy; `refreshPhotosTab` runs via the `DOMContentLoaded` boot; rendered DOM textContent contains the Hebrew prefix `התמונות תופסות` and the `{size}` placeholder is substituted with a byte count (e.g. `36.6 KB`). The English literal `Photos use {size}` is absent.
5. **Save failed** — `SettingsPage` IIFE has no public `save()` entry, so the test uses an "extracted-block replay": instantiates fresh spies, throws a synthetic `Error`, and runs the verbatim catch-block code from `settings.js:518-522`. Asserts exactly one toast call with `('', 'settings.save.failed')`.
6. **Global negative invariant** — re-runs scenario 1 and inspects every recorded `showToast` arg-0; fails if ANY entry starts with the 4 known forbidden English literals.

## Verification

### Automated

| Test | Result |
| --- | --- |
| `tests/25-11-i18n-parity.test.js` | 23 passed, 0 failed |
| `tests/25-11-hardcoded-english-removed.test.js` | 14 passed, 0 failed |
| `tests/25-11-toast-behavior.test.js` | 6 passed, 0 failed |
| All 24 Phase 25 test suites | 0 regressions (157 passing assertions across the phase) |

### Key Hebrew gates

- `grep -c 'השתמש בגיבויים' assets/i18n-he.js` → `0` (CR-03 line 271 cleared)
- `grep -c 'ונעל' assets/i18n-he.js` → `0` (CR-03 line 271 second imperative cleared)
- `grep -c 'מומלץ להשתמש' assets/i18n-he.js` → `2` (both replacement strings present)

## 25-VERIFICATION.md Impact

| Gap | Before | After |
| --- | --- | --- |
| CR-03 (D-27 Hebrew imperatives) | FAILED | **SATISFIED** — both `השתמש` and `נעל` removed from lines 271 + 285; replaced with `מומלץ להשתמש` / `לנעול` infinitive forms per the verifier's exact fix. |

CR-01 (schedule debounce) and CR-02 (snippetsDeletedSeeds sentinel) are out of scope for this plan; they belong to other 25-* gap-closure plans.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Drag-net audit for `מיטוב`/`מוטבו` verb forms beyond UAT-C4 explicit list**

- **Found during:** Task 2 (UAT-C4 string sweep).
- **Issue:** Plan named only 4 strings for the `מיטוב` → `אופטימיזציה` swap (heading, action, helper, parenthetical). Direct audit per the plan's "audit any other key containing `מיטוב` or `ממוטב`" instruction surfaced 4 more occurrences: `photos.optimize.confirm.title`, `photos.optimize.confirm.yes`, `photos.optimize.success`, `photos.optimize.partialFailure`.
- **Fix:** Applied the same `מיטוב` → `אופטימיזציה` / `מוטבו` → `עברו אופטימיזציה` swap to all 4 additional keys for consistency. This is within plan scope ("consistently throughout the photos.* namespace") — no plan deviation per se, just exhaustive enumeration.
- **Files modified:** `assets/i18n-he.js`
- **Commit:** `558a63e`

**2. [Rule 3 - Test infra] vm-sandbox needs `window.addEventListener` for settings.js boot**

- **Found during:** Task 4 (writing toast-behavior test).
- **Issue:** `settings.js` line 570 binds `window.addEventListener("beforeunload", …)` inside its `DOMContentLoaded` handler. The initial sandbox lacked `window.addEventListener`, causing the test boot to throw `TypeError: window.addEventListener is not a function`.
- **Fix:** Added a `winListeners` Map-backed shim with `addEventListener` / `removeEventListener` to the sandbox's `window` object. Side benefit: the shim is reusable if future tests need to drive `beforeunload` / `visibilitychange` listeners.
- **Files modified:** `tests/25-11-toast-behavior.test.js`
- **Commit:** `4af46e2`

### CLAUDE.md compliance

No `.env` files read; no Sapphire Healing store touched. Project rule: `git pull` at session start is not applicable to a worktree branch — the orchestrator already established the base ref.

## Authentication Gates

None — pure i18n + settings.js refactor, no external service calls.

## Self-Check: PASSED

Created files (all present):
- `tests/25-11-i18n-parity.test.js` — FOUND
- `tests/25-11-hardcoded-english-removed.test.js` — FOUND
- `tests/25-11-toast-behavior.test.js` — FOUND
- `.planning/phases/25-backup-architectural-rework/25-11-SUMMARY.md` — FOUND (this file)

Modified files (all changes confirmed in git diff):
- `assets/i18n-he.js` — 17 lines changed (CR-03 + UAT rephrasings + 5 new keys)
- `assets/i18n-en.js` — 6 lines added (5 new keys + UAT-C5 split)
- `assets/i18n-de.js` — 6 lines added (5 new keys + UAT-C5 split)
- `assets/i18n-cs.js` — 6 lines added (5 new keys + UAT-C5 split)
- `assets/settings.js` — 5 lines changed (4 toast calls + 1 storage-line literal)

Commits (all exist in `git log --oneline`):
- `a018e73` — RED tests
- `558a63e` — Hebrew GREEN
- `d2c8bd0` — 4-locale parity GREEN
- `4af46e2` — settings.js refactor + behavior test
