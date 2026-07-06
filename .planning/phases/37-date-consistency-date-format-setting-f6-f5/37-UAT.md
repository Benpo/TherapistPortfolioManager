---
status: diagnosed
phase: 37-date-consistency-date-format-setting-f6-f5
source: [37-VERIFICATION.md, 2026-07-06_phase37-close-out-safari-stale-sw-and-push.md]
started: 2026-07-06T09:01:59Z
updated: 2026-07-06T10:27:55Z
---

## Current Test

[testing complete]

## Tests

### 1. PWA update rolls to v1.2.4 on the live deploy
expected: Installed PWA / live site self-updates to v1.2.4 via the SW cycle; footer shows 1.2.4 and the new Phase 37 UI is present (no stale cache).
result: pass

### 2. Safari sort arrows + boot sort (client list)
expected: On live in Safari, the client list opens truly sorted by name ascending with a visible sort arrow on the Name column ONLY (WebKit svg fix). First click on the active Name header flips to descending. Other column headers show only a faint hover/focus hint.
result: pass

### 3. Filters, sort, and Clear Filters on real data
expected: Session Format multi-select and Heart-Wall toggle filter the live list correctly. Year filter is GONE. Clear Filters (top-row, danger-ghost style with red ✕) resets filters but LEAVES the active sort alone; sorting alone never summons the Clear button.
result: pass

### 4. Real-device Hebrew RTL — Personalization tab + native select popup
expected: With language = Hebrew on a real device (Safari), the Personalization tab lays out RTL correctly; the date-format select's value lines up under its label, and the OPEN native select popup renders correctly.
result: pass

### 5. Save → export smoke on live
expected: Log/save a session on the live deploy, then export. Session dates render in the chosen date format consistently in the UI and the export; no errors.
result: issue
reported: "Logged in in Hebrew, changed to English, imported the backup (clean app), imported successfully, then clicked Add session in the header — the Add-session screen was suddenly in Hebrew. Clicked the logo to go home — back on Hebrew. After changing language to English once more, it stayed on English. Wondering how to reconstruct this one."
severity: major
note: "Distinct from the date-format-export check test 5 was nominally about — the date-in-export verification was never reached because the language reverted mid-flow. Root cause traced during UAT (see Gaps). Date-format export smoke still needs a clean re-run after the fix."

### 6. HE + DE Personalization-tab native review (Ben)
expected: In HE and DE, all Personalization-tab strings read naturally — tab label (התאמה אישית / Personalisierung), date-format label/auto option/saved toast (HE "תבנית התאריך עודכנה.", "אוטומטי (לפי השפה)"), and the session-formats helper/confirm-dialog strings. No machine-translation artifacts. ([ASSUMED] flags can then be removed for HE/DE.)
result: pass

### 7. HE + DE legal pages review (Ben)
expected: The new trademark + non-affiliation sections in disclaimer-he.html, disclaimer.html (DE), impressum-he.html, impressum.html (DE) read correctly and soundly in both languages.
result: pass

### 8. WR-02 backup-restore default-value fidelity (decision)
expected: |
  Decide: when a backup was taken on a device using DEFAULT (null)
  portfolioDateFormat / portfolioSessionTypes, current restore code
  (falsy check at backup.js:1235, 1238) skips the null, so the target
  device KEEPS its own customization instead of resetting to defaults.
  Either (a) accept as documented known limitation, or (b) apply the
  2-line `'dateFormat' in manifest.settings` + removeItem-on-null fix
  so restore faithfully mirrors the source.
result: issue
reported: "Ben decided (2026-07-06): never-clobber. A backup with no explicit date-format / session-types (field absent OR present-null) must NOT overwrite the target's customization. Only an explicit non-default value applies. Reverts the currently-shipped faithful-mirror/removeItem behavior."
severity: minor

### 9. CS native review — Personalization tab + legal text
expected: An external Czech native (ideally with legal/business context) confirms the CS Personalization-tab strings (Přizpůsobení, Formát data, Typy sezení family) and the "Ochranné známky a nezávislost" legal text. No CS speaker in-house.
result: skipped
reason: "No Czech speaker in-house and none expected going forward. Ben (2026-07-06): won't be able to verify CS proactively; accept the machine/assisted CS strings as-is and only revisit if Czech users complain. Not a blocker; flagged for external review before any deliberate CS-market push."

## Summary

total: 9
passed: 6
issues: 2
pending: 0
skipped: 1
blocked: 0

## Gaps

- truth: "After a backup restore, the app's visible language stays consistent with what the user is looking at; a restored language preference is applied to the live UI immediately (or the user is told the app will switch), not silently on the next navigation."
  status: failed
  reason: "User reported: imported a Hebrew backup while viewing in English; the page stayed English, but navigating (Add session / logo) then rendered the whole app in Hebrew — the restored language was applied silently and only took visible effect on the next page load."
  severity: major
  test: 5
  root_cause: "backup.js restore overwrites portfolioLang (and portfolioTheme, portfolioDateFormat) from manifest.settings at assets/backup.js:1224-1229, but does NOT re-apply language/theme/direction to the live UI. On the Overview/home page the post-restore refresh takes the in-place window.__afterBackupRestore hook path (assets/backup-modal.js:323-326), which re-renders the client list WITHOUT a reload and never re-runs the language-apply/re-translate + dir path. So localStorage portfolioLang='he' but the visible page stays in the pre-import language until the next real navigation (add-session.html / index.html), which reads portfolioLang on fresh load and renders Hebrew. Every OTHER page's restore path calls location.reload() (backup-modal.js:327-329), which re-reads the language and masks the divergence — which is why the bug only shows on the Overview page's no-reload path. Switching language manually afterward fixes it because the language switcher re-renders immediately."
  artifacts:
    - path: "assets/backup.js"
      issue: "Restore writes portfolioLang/portfolioTheme/portfolioDateFormat to localStorage (lines 1224-1245) but does not trigger a live language/theme/direction re-apply."
    - path: "assets/backup-modal.js"
      issue: "Overview page uses the in-place __afterBackupRestore hook (lines 320-326) that refreshes list data without reload and without re-applying the restored language; other pages fall through to location.reload() (lines 327-329)."
  missing:
    - "After a successful restore, re-apply the restored language (re-run the language switch / applyTranslations + document dir) as part of the in-place refresh hook — OR force a reload on the Overview page too so restored language/theme/date-format all take effect consistently."
    - "Consider surfacing that a restore may change the UI language, so a silent Hebrew switch isn't surprising."
  debug_session: ""

- truth: "A backup that carries no explicit custom date-format / session-types (field absent OR present-null because the source used defaults) must NOT overwrite the target device's existing customization on restore. Only an explicit, non-default value applies."
  status: failed
  reason: "Ben decision (2026-07-06): the shipped faithful-mirror behavior (present-null RESETS the target to default via removeItem) is wrong for this product. Restore should never silently wipe a therapist's chosen date format. Switch to never-clobber — which is also the simpler code."
  severity: minor
  test: 8
  root_cause: "assets/backup.js:1239-1252 currently uses 'dateFormat'/'sessionTypes' in manifest.settings with a removeItem else-branch (faithful mirror). This resets a customized target to default whenever the SOURCE was on default (export writes localStorage.getItem(...) === null → present-null in the manifest). Old backups (field absent) are already safe. The change reverts to a plain truthiness check so only explicit non-default values apply."
  artifacts:
    - path: "assets/backup.js"
      issue: "Lines 1239-1252: revert both dateFormat and sessionTypes blocks to `if (manifest.settings.<field>) { setItem }` — drop the `in` check and the removeItem else-branch (never-clobber)."
    - path: "assets/backup.js"
      issue: "Lines 1230-1238: update the comment block that documents faithful-mirror/present-null-resets semantics to describe never-clobber."
    - path: "tests/37-personalization.test.js"
      issue: "Test #16 (lines 803-833) asserts a null-source field RESETS a customized target (removeItem). Flip the assertion: a null/absent-source field must RETAIN the target's customization."
  missing:
    - "Revert backup.js:1239-1252 to the falsy-check-only form for both fields (never-clobber)."
    - "Update the WR-02 comment block (backup.js:1230-1238) to describe never-clobber."
    - "Flip tests/37-personalization.test.js test #16 to assert the target retains its customization when the source field is null/absent."
  debug_session: ""
