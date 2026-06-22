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
gaps_total: 26
gaps_closed_fixed: 11
gaps_open: 15
blocker_count_open: 3
status: partial
last_updated: 2026-05-07-round3
round_3_findings_added: [N1, N2, N3, N4, N5, N6, N7, N9, N10, N11, N12]
note: "N8 (long-text emotions copy-paste feature) NOT logged here as a gap — it is a new feature request, captured separately in .planning/todos/pending/2026-05-07_emotions-quick-paste.md"

open_gaps:
  ## Pre-existing
  - "PDF export bidirectional text loss (BLOCKER, in-scope) — bundles with N10"
  - "(out-of-scope) Add-session entry path missing client picture & general notes (BLOCKER)"
  - "(out-of-scope) Edit-session has no Cancel/Revert toggle (major)"
  - "(meta) VERIFICATION.md test list missed E2E rename test — process improvement"
  ## Round 3 (2026-05-07 re-test)
  - "N1 — Step 2 export modal: textbox panes have no titles (major)"
  - "N2 — Pencil/edit icon too small to read across the app (major)"
  - "N3 — DOB picker: year-first feels reversed (minor)"
  - "N4 — Revert button on Settings rows is not self-explanatory (minor)"
  - "N5 — Settings 'saved' pill does not reappear on subsequent saves in same session — REGRESSION in 22-10 success-pill state machine (major)"
  - "N6 — Hebrew placeholder 'בחירה...' renders with dots on wrong end (bidi) (minor)"
  - "N7 — Backup 'Send to myself' email contains no attachment, only plain text body — plus architectural concern about backup having 3 dominant buttons on main screen (major)"
  - "N9 — Hebrew copy in export modal uses female form ('בחרי') instead of app's general register (minor)"
  - "N10 — PDF export trimmed at edges and not centered, in addition to bidi issue (BLOCKER, bundles with PDF bidi)"
  - "N11 — Backup unencrypted 'Skip encryption' path needs explicit confirmation dialog (major)"
  - "N12 — Backup password validation feedback missing — silent button-grey-out with no error message or complexity rules (major)"

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
  status: closed-fixed
  closed_by: "commit 0e4dd42 — toggle-change handler now sets [readonly] on the rename input + applies locked styling tokens; confirmed in plan 22-10 task 1"
  reason: "User reported: fields remain renameable even after disabling them. Toggle-off should also disable the rename input for that row."
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "First-time-disable confirm dialog fires every time the user presses Save with toggle changes (not just the very first time per session/install)"
  status: closed-fixed
  closed_by: "commit 0e4dd42 — D1 transition-aware semantic locked: confirm fires iff at least one toggle netted enabled→disabled vs last-saved DB state (re-enables and same-cycle round-trips do NOT trigger). 'has-disabled-once' localStorage flag removed entirely. Spec realigned with Ben on 2026-05-06."
  reason: "User reported: warning is given for the toggle only once. User expectation is that the confirm should re-appear on every Save where toggle state changed. NOTE: this contradicts the original 'first-time only' spec — needs spec realignment with Ben before fixing."
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "'About saved settings' confirmation is visually distinct from the static info banner AND auto-clears on next Save or any subsequent change"
  status: closed-fixed
  closed_by: "commit 233f53b — old blue 'About saved settings' notice removed entirely (DOM + CSS + JS show-path). Replaced with content-sized green pill driven by D2 locked design spec (220ms slide-up entrance, intentional-action-first dismiss state machine, 6s timeout fallback, polite ARIA, logical CSS properties for RTL, light+dark theme tokens added to tokens.css)."
  reason: "User reported: blue 'About saved settings' notice shares the same color as the static info banner so it doesn't read as a save confirmation. Also it persists — does not disappear on second Save or when other fields change. Should be visually distinct (different color/style) and dismiss on next interaction."
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "Hover tooltip appears for non-renameable section labels on Safari/macOS"
  status: closed-fixed
  closed_by: "commit 0b342ec — replaced the title-attribute approach with a real CSS ::after pseudo-element tooltip driven by data-tooltip. Logical CSS properties for RTL safety. Works in Safari (where the title attribute is unreliable)."
  reason: "User reported: on Safari macOS, cursor turns into question mark but no tooltip appears. Suggests tooltip implementation relies on 'title' attribute alone (which Safari renders inconsistently) or a hover handler not wired for Safari. Need a real tooltip component."
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "Export modal Step 1 makes it visually obvious that 1/2/3 are sequential steps in a single export workflow"
  status: closed-fixed
  closed_by: "commit 5ab01f1 — labelled stepper added: each step is now a pill with the step number AND its name (Step 1: select / Step 2: edit / Step 3: download). Active step highlighted; completed steps marked with check; logical CSS properties for RTL."
  reason: "User reported: first screen shows 1/2/3 but it is not clear that these are 3 steps of the export process. Needs clearer step indicator (progress bar, labeled stepper, breadcrumb, etc.) — UX call required."
  severity: major
  test: 2
  artifacts: []
  missing: []

- truth: "Export modal screens give the therapist contextual guidance — what each screen does and how to use Step 2 (markdown editor) without prior markdown knowledge"
  status: closed-fixed
  closed_by: "commits 37aa84c (per-step contextual helpers — 'Step N of 3 — <plain-language description>') + b61fc9e (Step 2 expandable markdown formatting cheatsheet — `**bold**`, `*italic*`, headings, lists, all with i18n descriptions and live examples)."
  reason: "User reported: Step 2 is a markdown editor with no styling tips or instructions. Therapists are not expected to know markdown syntax. Needs inline help/cheatsheet/tooltip and similar contextual feedback on all 3 screens about what is happening."
  severity: major
  test: 2
  artifacts: []
  missing: []

- truth: "Export modal Step 3 close (X) button dismisses the modal"
  status: closed-fixed
  closed_by: "commit 5ab01f1 — root cause was a stacking-context bug: .modal-close had no z-index so the later-DOM .export-output-card buttons (inside .modal-card's z-index:1 stacking context) absorbed clicks that visually hit the X. Fixed defensively with both event delegation on the modal root AND .export-card .modal-close { z-index: 2 }. Other modals don't share this multi-button-stack layout, so no broader impact."
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
  status: closed-fixed
  closed_by: "commits 1215487 + 7645647 — three-state sentinel resolve: exportEncryptedBackup now resolves with true (encrypted) | false (skip-encryption) | 'cancel' (abort). Cancel-button + X-button + Escape all route to opts.onCancel which resolves 'cancel'. overview.js early-returns on encrypted === 'cancel' BEFORE any download, blob-write, or toast — making the entire download pipeline unreachable when the user aborts. DATA-PRIVACY BLOCKER closed."
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
  status: closed-fixed
  closed_by: "commit 8ba567f — generic App.installNavGuard helper added (post-IIFE namespace augmentation in app.js:1052) with locked public API: { trigger, isDirty, message:{titleKey,bodyKey,confirmKey,cancelKey,tone?}, destination, onConfirm? } => unregister fn. Single call site for now: gear icon (add-session.js:328 inside initSettingsLink) with the form-dirty predicate. Future callers (brand-link, language popover, theme toggle, add-client) can wire their own guards in 1-2 lines without touching the helper."
  api_for_future_callers: |
    App.installNavGuard({
      trigger:     HTMLElement | string (selector),
      isDirty:     () => boolean,
      message:     { titleKey, bodyKey, confirmKey, cancelKey, tone? },
      destination: string | () => string,
      onConfirm?:  () => void   // synchronous, not awaited
    }) => unregister: () => void
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

# =============================================================================
# Round 3 findings (re-test of round-2 fixes on 2026-05-07)
# Captured by user during second-pass UAT of plans 22-10 / 22-11 / 22-12.
# Everything not listed here from round-2 plans was confirmed working.
# =============================================================================

- truth: "Each textbox / pane on Step 2 of the export modal has a clear label or title so a first-time user knows what each box is for"
  id: N1
  status: failed
  reason: "User reported: on Step 2 of the export modal, the textbox panes (markdown editor + live preview) have no name or title. A first-time user can't tell what each box is for or how they relate. Add labels/titles for both panes — at minimum 'Edit (Markdown)' and 'Live Preview' — and consider a one-line tagline under each."
  severity: major
  test: general
  scope: phase-22-followup
  source: 2026-05-07 round-3 re-test
  related_phase: 22-11
  artifacts: []
  missing:
    - "Pane titles in Step 2 of export modal (en + he + de + cs)"

- truth: "The pencil/edit icon used across the app is large enough to be visually recognizable — at minimum the pencil shape is distinguishable, not just a diagonal line"
  id: N2
  status: failed
  reason: "User reported: the edit-session pencil icon (and edit icons in general across the app) is way too small — appears as a diagonal line, not a recognizable pencil. Either bump the icon size, swap to a larger SVG/glyph, or switch to a labelled button. Affects accessibility (44px min tap target) and discoverability."
  severity: major
  test: general
  scope: app-wide
  source: 2026-05-07 round-3 re-test
  related_phase: 22-related-or-new
  artifacts: []
  missing:
    - "Audit of all pencil/edit icon usages across overview / sessions / client cards"
    - "Larger SVG or labelled affordance"

- truth: "DOB picker on the new-client page presents day/month before year (matches user mental model)"
  id: N3
  status: failed
  reason: "User reported: the date-of-birth picker on new-client page starts with year, then dd/mm. Counter-intuitive — most people think DD/MM/YYYY (locale-dependent) or YYYY-MM-DD as a single block. Reorder so the picker reads naturally: dd → mm → yyyy. (Note: this may be a `<input type='date'>` browser default; might need a custom widget or restructured layout to control order.)"
  severity: minor
  test: general
  scope: app-wide
  source: 2026-05-07 round-3 re-test
  related_phase: ux-polish
  artifacts: []
  missing:
    - "Date picker order — investigate native vs custom widget"

- truth: "The Revert button on each Settings page row is self-explanatory at first glance — the user can tell what it does without trial-and-error"
  id: N4
  status: failed
  reason: "User reported: the revert (reset) icon next to each renamed row in Settings is not self-explanatory. User can't tell what it will do without clicking. Options: (a) tooltip with description ('Reset to default'), (b) replace icon with text label, (c) add helper microcopy, (d) confirm dialog on first use that explains. Pick one and apply."
  severity: minor
  test: general
  scope: phase-22-followup
  source: 2026-05-07 round-3 re-test
  related_phase: 22-10
  artifacts: []
  missing:
    - "Tooltip OR text label OR confirm-with-explanation on revert affordance"

- truth: "The 'Settings saved' success pill appears AFTER EVERY successful Save in the same Settings page session — not just the first one — and remains visible long enough to be noticed"
  id: N5
  status: failed
  reason: |
    User reported (regression in 22-10's success-pill fix): after first successful Save, the green pill appears as designed. After making more changes and pressing Save AGAIN in the same Settings page session, the pill does NOT re-appear. User thinks this might be a state-machine bug.

    SUSPECTED ROOT CAUSE (orchestrator analysis): the dismiss-leave setTimeout (200ms hide-after-leave) is not stored in `timeoutId` and therefore not cancelled by `cancelLeave()`. When the user clicks Save the second time:
      1. The previously-attached `onNextSave` listener fires → dismissSavedNotice() → starts the 200ms hide timeout
      2. The actual save handler runs → showSavedNotice() → cancelLeave() (does NOT cancel the leaving timeout) → sets dataset.active = ""
      3. 200ms later the orphaned hide timeout fires → noticeEl.hidden = true → pill becomes invisible
    Fix: store the leaving setTimeout in a variable (e.g. `leavingTimeoutId`) and cancel it in cancelLeave() (or in showSavedNotice itself).

    Plus user separately requested longer visibility — currently 6s timeout fallback. Consider 8-10s, OR keep 6s but ensure the pill is visually anchored (the suspected bug above may make the pill flash and disappear at 200ms, which is what user is interpreting as 'not visible enough for just 220ms').
  severity: major
  test: general
  scope: phase-22-followup
  source: 2026-05-07 round-3 re-test
  related_phase: 22-10
  artifacts: []
  missing:
    - "Store leaving setTimeout id and cancel it in cancelLeave / showSavedNotice"
    - "Re-test: pill must reappear on every Save click in same session"
    - "Optional: increase visible-duration timeout from 6s to 8-10s"

- truth: "Hebrew RTL placeholder strings render with their punctuation (ellipsis, etc.) on the correct logical end of the word — no bidi mis-rendering"
  id: N6
  status: failed
  reason: "User reported: in the new-client page Hebrew locale, the placeholder 'בחירה...' renders with the three dots on the RIGHT of the word (visually before, since Hebrew reads right-to-left) instead of on the LEFT (visually after the word). Bidi/Unicode rendering issue — likely the source string has the dots in the wrong logical position, or needs a U+200F RIGHT-TO-LEFT MARK to anchor direction. Audit all Hebrew placeholders for this class of bug."
  severity: minor
  test: general
  scope: i18n
  source: 2026-05-07 round-3 re-test
  related_phase: i18n-polish
  artifacts: []
  missing:
    - "Audit Hebrew placeholders for bidi-end-of-string punctuation rendering"
    - "Use logical placement (Hebrew text first then ellipsis) and/or RLM marks where needed"

- truth: "Backup 'Send to myself' (email) attaches the actual backup file to the email — not just plain text body claiming an attachment"
  id: N7
  status: failed
  reason: "User reported: when using the 'Send backup to myself' option, the resulting email contains plain text in the body but NO attachment, even though the email claims one is included. The actual backup file never reaches the user. Real bug — likely the mailto: scheme can't actually attach files (browser security model) and the implementation falls back to inlining. If mailto can't attach, the feature needs a different mechanism (download + 'now attach this manually' instructions, OR direct upload to user's cloud, OR remove the option). Plus user raised an architectural concern: backup currently has 3 separate buttons on the main screen — feels too dominant. Consider extracting backup to a dedicated page or popup, while still keeping it discoverable."
  severity: major
  test: general
  scope: backup-architecture
  source: 2026-05-07 round-3 re-test
  related_phase: new-phase-backup-refresh
  architectural_concern: "Backup has 3 buttons on main screen — too dominant. Consider dedicated backup page or modal while keeping it emphasized/discoverable."
  artifacts: []
  missing:
    - "Investigate mailto attachment limitations"
    - "Either fix the attachment mechanism or replace the email option with something workable"
    - "Architectural decision: dedicated backup page vs current 3-button overview placement"

- truth: "Hebrew copy used in the export modal (Step 1 description, design tips, etc.) is gender-neutral or matches the rest of the app's gender register — not female-only ('בחרי')"
  id: N9
  status: failed
  reason: "User reported: the Hebrew description on at least Step 1 of the export modal uses the female imperative form ('בחרי' = 'choose [female]'). The rest of the app uses neutral or male forms. The new strings introduced in plan 22-11 (export-modal-ux-fixes) need to be audited and rewritten to match the app's general Hebrew register. Same audit applies to the design-tips / formatting-cheatsheet copy on Step 2."
  severity: minor
  test: general
  scope: i18n
  source: 2026-05-07 round-3 re-test
  related_phase: 22-11
  artifacts: []
  missing:
    - "Audit all Hebrew strings in i18n-he.js added by plan 22-11 (commits 5ab01f1, 37aa84c, b61fc9e) for gendered language"
    - "Rewrite female-only forms to match app's general register (neutral or male)"

- truth: "PDF export renders with proper margins and centering — text is not trimmed at edges, content is centered, no off-document overflow"
  id: N10
  status: failed
  reason: "User reported: the PDF export is trimmed at the document edges and is not centered — text appears at the page edges, some text is visually off. This is independent of (and additional to) the previously-known bidi text-loss blocker. Both PDF problems should be addressed together in a holistic PDF-export-quality phase: bidi shaping fix, margin/centering fix, page-width handling, possibly font-metric audit."
  severity: blocker
  test: 2
  scope: pdf-export
  source: 2026-05-07 round-3 re-test
  related_phase: pdf-export-holistic-fix
  bundles_with: "PDF bidi text loss (existing blocker, unfixed)"
  artifacts: []
  missing:
    - "Page margin / centering audit in pdf-export.js"
    - "Bundle with bidi-text-loss blocker into a focused 'PDF export quality' phase"

- truth: "Backup export without encryption (Skip Encryption path) requires explicit user confirmation — not allowed silently"
  id: N11
  status: failed
  reason: "User reported (privacy/safety hardening): now that the Cancel-still-downloads blocker is fixed (cancel = no file), the Skip-encryption path still allows a one-click unencrypted backup of all therapist client data. User wants a confirmation dialog before allowing this — 'Are you sure you want to export without a password? This file will contain all your client data unprotected.' Should require explicit acknowledgement, not just a single click. Pairs naturally with N12 (password validation feedback) — both are backup-encryption UX fixes."
  severity: major
  test: 4
  scope: phase-22-followup
  source: 2026-05-07 round-3 re-test
  related_phase: 22-12
  artifacts: []
  missing:
    - "Confirm dialog before Skip-encryption finalizes"
    - "Dialog body must name the privacy implication clearly"

- truth: "Backup encryption password fields give the user actionable feedback when validation fails — visible mismatch error, complexity rules shown up-front, no silent dead-end"
  id: N12
  status: failed
  reason: "User reported (UX dead-end): in the encryption password dialog, when entering different passwords in the two fields, there is no error message — the proceed button just greys out with no explanation. Also, even when entering matching simple passwords (e.g. '111111111' twice), the button still doesn't enable, suggesting there are complexity rules but they are not communicated to the user. Result: user is stuck with no way to figure out what's needed. Fix: (a) show a visible mismatch error when passwords differ, (b) display password complexity rules up-front (or as inline hints), (c) optional: live strength indicator. Pairs with N11 — both are backup-encryption UX."
  severity: major
  test: 4
  scope: phase-22-followup
  source: 2026-05-07 round-3 re-test
  related_phase: 22-12
  artifacts: []
  missing:
    - "Visible password-mismatch error message"
    - "Up-front display of password complexity rules"
    - "Optional: live strength indicator"

