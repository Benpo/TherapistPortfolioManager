---
status: partial
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
source: [22-VERIFICATION.md]
started: 2026-05-06T19:10:00Z
updated: 2026-05-06T21:45:00Z
---

## Current Test

[testing complete — partial. Test 3 parked, Tests 5+6 skipped. 4 issues + 2 meta gaps captured.]

## Tests

### 1. Hebrew RTL rendering of Settings page sticky info banner + 9 rows + first-time-disable confirm dialog
expected: Banner heading + 2 bullets, row labels, rename inputs, toggle position, reset icon, badge — all flow right-to-left correctly. Dialog OK/Cancel order is RTL-appropriate. After GAP-4 fix, the confirm OK button reads in 'button-primary' styling (not red 'danger') for the first-disable confirm.
result: issue
reported: |
  - hebrew in most parts exists, but in some fields I see suddenly e.g. "רגשות שנמצאו בתוך Heart Shield" so some kind of mixture.
  - additionally I see that fields remain renameable even after turning them off. (disabling them).
  - Plus I see that the warning is given for the toggle only once but this is wrong behavior, it should be given for each time we press on save with changes.
  - the blue warning "About saved settings" is behaving strange, it appears after saving but as it shares same color like the other one, it is very much not clear that it appeared after pressing save. also, it doesn't disappear after second time pressing save or changing something else in the page. this is again wrong behavior similar to the previous point above.
  - the tooltip stuff explaining that some are not renameable - I see nothing pops, at least on safari in my macos. just my cursor turns into question mark but nothing beyond that, no tooltip.
severity: major

### 2. Hebrew PDF export — Hebrew client name in filename, Hebrew section headings + body text rendered with R2L
expected: PDF downloads with filename containing Hebrew characters as-is (e.g. 'שירה_2026-05-06.pdf'); inside the PDF, section headings and body lines render right-to-left using NotoSansHebrew font; no question marks or boxes for missing glyphs.
result: issue
reported: |
  - Export screen opens.
  - first screen shows 1/2/3 but it is not clear that these are 3 steps of the export process. needs to be somehow clearer, UX designer need to decide here from UX perspective.
  - live preview and editor (step 2) works, but again this is .md syntax while there is no tips for styling or any instruction whatsoever for the therapist what is going on here. in general this comment is true for all 3 screens - there needs to be more feedback from the app to the user about what are things.
  - on third screen - export works for both text as well as PDF, but the X button does nothing.
  - (out of scope) when pressing EDIT on a session, I can only choose to save, delete the session, or go back to home screen, but there is no toggle to simply revert back to display mode.
  - (out of scope, serious) when I press on "add session" and choose client from that screen, the screen which I see is then a bit diff from the new session coming from the client card; in the add-session entry path the client's picture and general notes don't appear.
severity: major
note: |
  After re-test: Hebrew filename is preserved (e.g. 'בן פורת'), Hebrew renders RTL in the PDF. BUT a NEW BLOCKER was discovered — bidirectional text loss: a single line containing Hebrew + English + Hebrew ('הלכתי TO GO ושתיתי מיץ') is silently truncated to only the last segment ('ושתיתי מיץ') in the final PDF, while the live editor + live preview both show all 3 segments correctly. See bidirectional-text-loss gap below.
unblocked_by: GAP-1 closure (pdf-export.js script tag wired)

### 3. 375px mobile viewport — Settings page rows stack correctly; export modal Step 2 tabs (Edit / Preview) work; Download PDF tap target sized correctly
expected: Settings rows reflow vertically; rename input + toggle + reset button do not overflow; export modal shows mobile tabs at <=768px and side-by-side on desktop; tabs switch which pane is visible; tap targets meet ≥44px minimum.
result: [pending]
parked_until: "After all functional bugs from Tests 1–2, 4–6 are resolved. User explicitly deferred mobile/iPhone testing — 'still cant use iPhone correctly, later once all functional stuff work'."
unblocked_by: GAP-1 closure (PDF download is now reachable)

### 4. Backup/restore round-trip — verify pre-Phase-22 backup loads with no errors and applies defaults
expected: Restoring a ZIP that was created before therapistSettings existed (manifest.therapistSettings absent or null) succeeds without errors; all 9 sections render enabled with default i18n labels; no console errors; no orphaned IDB rows.
result: issue
reported: |
  - backup bug — when I press to export data, and then press on "cancel" (not on "Skip encryption" or the other one), it still downloads a file! so still backs up. that's a no go to export so easily without password.
  - but restore works fine.
severity: blocker
note: "Restore side passed — pre-Phase-22 backup loads without errors. NEW BLOCKER discovered on export side: Cancel button on encryption-prompt dialog still triggers download. See 'export-cancel-still-downloads' gap below."

### 5. PWA update path — installed v52 PWA users update through v53 → v54 → v55 → v56 cleanly and pick up Settings page offline
expected: On next visit, SW activate event evicts older cache, precaches v56 (including settings.html, settings.js, pdf-export.js, jspdf.min.js, fonts, plus the new add-session.html with the pdf-export script tag). Settings page works offline after first visit.
result: skipped
reason: "User skipped: 'just focus on functional stuff'. Will revisit PWA/SW update-path testing after the functional bugs are closed."
unblocked_by: GAP-1 closure caused 3 additional cache bumps (v53 → v56)

### 6. Demo mode — gear icon visible, Settings page reachable, runs against demo_portfolio IndexedDB without leaking to real install
expected: Open landing.html → Demo button → gear icon visible in header → click → Settings page loads in demo context → setting a custom label in demo does not appear in the real app's IDB.
result: skipped
reason: "User skipped — and called out a deeper problem: the test list never included the actual end-to-end rename flow (the entire point of Phase 22). Demo isolation is lower priority than verifying the feature works at all. Re-test demo isolation after the phase-22-core failure is fixed."

## Summary

total: 6
passed: 0
issues: 3
pending: 1
skipped: 2
blocked: 0
gaps_total: 15
gaps_in_scope: 12
gaps_out_of_scope: 2
gaps_meta: 1
gaps_closed_fixed: 2
gaps_open: 13
blocker_count_open: 4
status: partial
last_updated: 2026-05-07

## Gaps

- truth: "Hebrew settings labels render entirely in Hebrew (no English bleed-through)"
  status: closed-fixed
  closed_by: "commit 1f35f7c — replaced literal 'Heart Shield' English fragments in i18n-he.js settings.row.heartShield* descriptions with the existing Hebrew translation 'מגננת הלב'"
  user_confirmed: "2026-05-07 re-test — bonus step 9 passed"
  reason: "User reported: Hebrew labels contain English fragments — e.g. 'רגשות שנמצאו בתוך Heart Shield' shows 'Heart Shield' in English mid-sentence. i18n keys not fully translated or default-string fallback bleeding through."
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "Disabled section's rename input becomes non-editable (locked) when section is toggled off"
  status: failed
  reason: "User reported: fields remain renameable even after disabling them. Toggle-off should also disable the rename input for that row."
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "First-time-disable confirm dialog fires every time the user presses Save with toggle changes (not just the very first time per session/install)"
  status: failed
  reason: "User reported: warning is given for the toggle only once. User expectation is that the confirm should re-appear on every Save where toggle state changed. NOTE: this contradicts the original 'first-time only' spec — needs spec realignment with Ben before fixing."
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "'About saved settings' confirmation is visually distinct from the static info banner AND auto-clears on next Save or any subsequent change"
  status: failed
  reason: "User reported: blue 'About saved settings' notice shares the same color as the static info banner so it doesn't read as a save confirmation. Also it persists — does not disappear on second Save or when other fields change. Should be visually distinct (different color/style) and dismiss on next interaction."
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "Hover tooltip appears for non-renameable section labels on Safari/macOS"
  status: failed
  reason: "User reported: on Safari macOS, cursor turns into question mark but no tooltip appears. Suggests tooltip implementation relies on 'title' attribute alone (which Safari renders inconsistently) or a hover handler not wired for Safari. Need a real tooltip component."
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "Export modal Step 1 makes it visually obvious that 1/2/3 are sequential steps in a single export workflow"
  status: failed
  reason: "User reported: first screen shows 1/2/3 but it is not clear that these are 3 steps of the export process. Needs clearer step indicator (progress bar, labeled stepper, breadcrumb, etc.) — UX call required."
  severity: major
  test: 2
  artifacts: []
  missing: []

- truth: "Export modal screens give the therapist contextual guidance — what each screen does and how to use Step 2 (markdown editor) without prior markdown knowledge"
  status: failed
  reason: "User reported: Step 2 is a markdown editor with no styling tips or instructions. Therapists are not expected to know markdown syntax. Needs inline help/cheatsheet/tooltip and similar contextual feedback on all 3 screens about what is happening."
  severity: major
  test: 2
  artifacts: []
  missing: []

- truth: "Export modal Step 3 close (X) button dismisses the modal"
  status: failed
  reason: "User reported: on the third screen, export works for both text and PDF but the X button does nothing. Likely missing click handler or event-listener regression on Step 3."
  severity: major
  test: 2
  artifacts: []
  missing: []

- truth: "(scope: out-of-phase-22) Editing a session offers a way to revert back to display mode without saving or deleting"
  status: failed
  reason: "User reported (out of scope, discovered during UAT): when pressing EDIT on a session, the only options are Save, Delete, or go back to home screen. There is no Cancel/Revert toggle to return to display mode without committing changes."
  severity: major
  scope: out-of-phase-22
  test: 2
  artifacts: []
  missing: []

- truth: "(scope: out-of-phase-22) 'Add session' entry path matches 'new session from client card' path — both show the client's picture and general notes after a client is chosen"
  status: failed
  reason: "User reported (out of scope, discovered during UAT, marked SERIOUS): when entering via 'add session' and then choosing a client, the resulting screen lacks the client's picture and general notes. Same flow entered via the client card includes them. Two divergent code paths for the same conceptual screen — single source of truth needed."
  severity: blocker
  scope: out-of-phase-22
  test: 2
  artifacts: []
  missing: []

- truth: "PDF export preserves all text segments on a line that mixes Hebrew + English + Hebrew (bidirectional text)"
  status: failed
  reason: "User reported with screenshots: the live markdown editor and live preview both show all three segments of the line 'הלכתי TO GO ושתיתי מיץ', but the final PDF renders ONLY 'ושתיתי מיץ'. The leading Hebrew segment 'הלכתי' AND the middle English segment 'TO GO' are silently dropped. Suspected root cause: bidirectional text shaping in the jsPDF/NotoSansHebrew render path splits the line at direction boundaries and emits only the last (or first-physical) segment. SILENT CONTENT LOSS in the exported artifact — worse than a visual bug because therapist won't notice until they read the PDF."
  severity: blocker
  test: 2
  artifacts:
    - "User screenshot 1: live editor + preview, all 3 segments present"
    - "User screenshot 2: final PDF showing only 'ושתיתי מיץ'"
  missing:
    - "Hebrew segment 'הלכתי' (start of line)"
    - "English segment 'TO GO' (middle of line)"

- truth: "Cancel button on the export-encryption prompt aborts the export — no backup file is downloaded"
  status: failed
  reason: "User reported: when exporting data, the encryption prompt offers 'Skip encryption', '<encrypt>' and 'Cancel'. Pressing Cancel STILL downloads a backup file. Cancel must abort the export entirely so therapist client data is not silently written to disk unencrypted when the therapist explicitly tried to back out. DATA-PRIVACY BUG: a therapist who reconsiders mid-flow ends up with an unintended plaintext backup ZIP in their Downloads folder."
  severity: blocker
  test: 4
  artifacts: []
  missing:
    - "Cancel handler that returns early without invoking the download path"

- truth: "Section renames done on the Settings page propagate to the section labels shown on the new-session form AND on the edit-session form (in Hebrew and any other locale)"
  status: closed-fixed
  closed_by: "commit 1f35f7c — added applySectionLabels() in add-session.js that walks every [data-section-key] wrapper and overwrites .label[data-i18n] textContent with App.getSectionLabel(). Wired to app:settings-changed, app:language, and both init paths (edit + new session). Also keeps the heart-shield accordion-header in sync."
  user_confirmed: "2026-05-07 re-test — full E2E pass: rename in HE → see in new-session, see in edit-session, persists refresh, persists locale switch (single-string override wins everywhere as designed), reset returns to locale defaults"
  diagnosis: "Root cause was hypothesis (a): render path didn't read therapistSettings. Cache + event wiring were fine. App.getSectionLabel() was only called in export/markdown path, never for visible form labels. NOT a locale fallback bug — schema has no locale dimension (single customLabel per sectionKey, by design)."
  reason: "User reported (PHASE-22 CORE FEATURE FAILURE — explicitly called out as 'biggest NO GO from the entire phase'): on Hebrew, renamed several Settings fields, then opened a new session AND edited an existing session. Both screens still show the OLD text. Multiple refreshes did not fix it."
  severity: blocker
  test: general
  scope: phase-22-core
  artifacts: []
  missing:
    - "therapistSettings consumer in add-session.html / edit-session render path"
    - "Locale-aware lookup that prefers therapistSettings.{locale}.label over default i18n key"
    - "Cache invalidation when therapistSettings changes — SW + in-memory + IDB"
  required_e2e_test: |
    1. Switch app to Hebrew locale.
    2. Open Settings → rename section #1 to a unique sentinel ('UAT-RENAME-HE-001').
    3. Click Save → confirm 'About saved settings' notice appears.
    4. Open Add Session → choose any client → assert section #1 label === 'UAT-RENAME-HE-001'.
    5. Open Edit Session on an EXISTING session for the same client → assert section #1 label === 'UAT-RENAME-HE-001'.
    6. Hard-refresh both screens → assertions still hold.
    7. Switch to English → assert English label is unchanged (default i18n).
    8. Switch back to Hebrew → assert label === 'UAT-RENAME-HE-001'.
    9. Close + reopen browser → assertions still hold (persistence check).

- truth: "Settings gear icon is guarded against navigation away from an in-progress session — at minimum when the session form is in edit mode with unsaved changes, the user is asked to confirm before navigating"
  status: failed
  reason: "User reported (re-test 2026-05-07, after core fix verified): clicking the Settings gear icon while inside a session — even in edit mode — instantly navigates to Settings with no confirm dialog. If the therapist has unsaved changes in the session form, those changes are silently lost. Needs a navigation guard (beforeunload listener OR explicit click handler that checks form-dirty state) that surfaces a confirm dialog before navigating away from a dirty edit-session form. View-mode (read mode) navigation is fine without a guard."
  severity: major
  test: general
  scope: phase-22-related
  artifacts: []
  missing:
    - "form-dirty tracking on add-session / edit-session"
    - "Confirm guard wired to the Settings gear icon (and likely other top-nav items) when form is dirty"

- truth: "Phase 22 test plan / VERIFICATION.md includes an explicit end-to-end test: 'rename in Settings → see effect in new + edit session screens → survive refresh + locale switch'"
  status: failed
  reason: "User flagged a test-design gap (meta-finding): the 6-test UAT list focused on rendering, PDF, mobile, backup, SW, demo isolation. It NEVER directly tested whether renames propagate to the actual session screens — which is the entire reason Phase 22 exists. This is why the broken-propagation bug went undetected by the structured tests and was only caught when the user happened to try renaming a few fields manually mid-UAT. Add this as a permanent UAT requirement for any future phase that introduces user-customizable labels: 'configure → use → re-open → assert' must be in the test plan, not just 'configure → render the config page'."
  severity: major
  test: meta
  scope: test-design
  artifacts:
    - "22-VERIFICATION.md (current 6-test list)"
  missing:
    - "Explicit E2E test for label propagation in 22-VERIFICATION.md and any future phase template"

