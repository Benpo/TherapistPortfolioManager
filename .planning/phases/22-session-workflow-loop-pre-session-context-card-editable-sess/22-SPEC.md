# Phase 22: Session Workflow Loop — Specification

**Created:** 2026-04-26
**Amended:** 2026-04-28 (post-Sapir-review tightening — see "Amendment 2026-04-28" near bottom)
**Ambiguity score:** 0.156
**Requirements:** 20 originally locked + 1 added (REQ-21); REQ-16 (Translate) marked REMOVED (preserves numbering)

## Goal

Therapists can (a) tailor the session form to their own modality by renaming and disabling section titles, and (b) turn a finished session into an editable, client-facing document that they can download as PDF or Markdown and share through the device's native share sheet.

## Background

Sessions Garden was built around the Emotion Code / Body Code vocabulary (the modality of Sapir, the design partner). The session form has 8 hardcoded text sections plus a dynamic Issues block (each with `before`/`after` severity). All section labels come from i18n keys. Storage keys (`trappedEmotions`, `insights`, `limitingBeliefs`, `additionalTech`, `heartShield`/`heartShieldEmotions`, `comments`, `customerSummary`, plus `issues[]`) are fixed.

Two unresolved gaps:

1. **Section labels are locked** — therapists from other modalities (CBT, somatic, art therapy, body psychotherapy) cannot rename "Trapped Emotion" or hide "Heart Shield" without code changes. This caps the addressable market beyond Emotion Code practitioners. Verbatim Sapir feedback (2026-04-26): section titles should be editable; therapist picks their own categories, not pre-defined ones.

2. **Sessions are a documentation terminus** — therapist writes notes, then nothing. There is no path from a session to a client-facing document. A `buildSessionMarkdown()` function exists in `add-session.js:596-681` and a "Copy Session (MD)" button copies it to clipboard, but there is no formatted document, no file download, no share path. Verbatim Sapir feedback (2026-04-26): need a shortcut from session → editable document → send to client, with auto-populated date.

The third todo originally bundled with this phase — pre-session context card — has been dropped (innovator-agent extrapolation rather than direct user feedback; remains in `.planning/todos/pending/` for a future phase).

## Requirements

### Feature A — Editable session section titles (Settings page)

1. **Settings page exists**: A new app screen lists all configurable session sections.
   - Current: No settings page exists; section titles are hardcoded i18n keys.
   - Target: Reachable from the app navigation/header. Lists all 9 sections (Trapped Emotions Released, Physical Imbalance, Limiting Beliefs, Additional Treatment Techniques, Heart Shield, Heart Shield Emotions, Issues + severity, Session Notes and Observations, Information for Next Session). Each row has: rename input, enable/disable checkbox, "Reset to default" action.
   - Acceptance: Settings page accessible from main app nav; renders all 9 rows with the three controls per row.

2. **Section labels are renameable for free-text sections; structurally-fixed sections are disable-only**: Renaming a section updates the label everywhere it appears.
   - Current: Labels read directly from i18n keys per UI language.
   - Target: A user-chosen label override per section, stored in IndexedDB. The override is **global** — it appears in all 4 UI languages (en/de/he/cs). Underlying storage keys (`trappedEmotions`, etc.) are unchanged.
   - **Renameable sections (6):** Trapped Emotions Released, Physical Imbalance, Limiting Beliefs, Additional Treatment Techniques, Heart Shield Emotions, Session Notes and Observations.
   - **Disable-only sections (3, NOT renameable):** Heart Shield (toggle — renaming a yes/no removal flag has no semantic value for non-Emotion-Code therapists), Issues + severity (structured array with severity scales — repurposing the label without changing the structure misleads the therapist), Information for Next Session (consumed downstream by the upcoming pre-session context card phase — purpose is fixed and must not be redefined per therapist). The Settings page renders these 3 rows with a greyed-out, disabled rename input plus a help tooltip explaining why; the enable/disable toggle and reset action remain available.
   - Acceptance: Renaming "Trapped Emotion" to "X" in Settings causes "X" to appear in (a) the session form, (b) the export section-selection dialog, (c) the exported document. Verified in all 4 UI languages. The 3 disable-only rows have a non-editable rename input on the Settings page with the documented tooltip.

3. **Sections can be reset to default**: Per-row "Reset" restores the i18n default.
   - Current: N/A (no overrides exist).
   - Target: Reset removes the user override; section displays the default i18n value for the current UI language.
   - Acceptance: After rename + reset, the section displays the original i18n value.

4. **Sections can be disabled per therapist**: Checkbox per section; disabled sections do not appear in the form for new sessions.
   - Current: All 9 sections always render.
   - Target: When a section is disabled in Settings, it is not rendered when creating a new session. Underlying schema field is unchanged (still in DB; just empty for new sessions).
   - Acceptance: Disabling "Heart Shield" in Settings removes the Heart Shield toggle and emotions textarea from the new-session form. Disabling "Issues + severity" removes the entire issues block.

5. **Disabled sections in past sessions are fully editable when data exists**: Therapists do not lose access to historical content and can clean it up.
   - Current: N/A.
   - Target: When opening any past session, any disabled section that *has stored data* is rendered as a fully editable field (same input controls as when enabled) with a small "Disabled in Settings" badge so the therapist understands why this row is here. Disabled sections with no stored data stay hidden. Once the therapist clears the field's data and saves, the section disappears from that session on next open. This intentionally collapses any "view vs edit mode" distinction — a past session always opens to the same form, the only difference between an enabled and a disabled-but-populated section is the badge.
   - Acceptance: (a) A session created before "Trapped Emotion" was disabled still displays the trapped-emotion text on the edit screen as an editable input with the "Disabled in Settings" badge; (b) Editing/clearing the data and saving works without errors; (c) After clearing the data and re-opening the session, the section is hidden; (d) A section with no historical data stays hidden regardless.

6. **Existing session data is preserved through enable/disable cycles**: Disabling never deletes data.
   - Current: N/A.
   - Target: Disable → re-enable → all stored data is intact and re-appears in the form.
   - Acceptance: Smoke test — create session with all sections, disable a section, confirm DB still has the value, re-enable, confirm field re-renders with the value.

### Feature B — Session-to-document export

7. **Export action on the session edit page**: A new "Export" button opens an export dialog. The existing clipboard button is preserved with friendlier copy.
   - Current: Only "Copy Session (MD)" exists (clipboard only). The `(MD)` suffix is opaque to non-technical therapists.
   - Target: New "Export" button placed next to the existing clipboard button. Clicking opens the export dialog. The existing clipboard button is preserved AND its label is renamed from "Copy Session (MD)" → "Copy session text" (i18n updated in all 4 languages). Behavior unchanged — still copies the same Markdown string to the clipboard.
   - Acceptance: Both buttons appear on the session edit page; the clipboard button reads "Copy session text" (or its translated equivalent) in all 4 UI languages; clicking Export opens the 3-step dialog.

8. **Section-selection dialog with client-safe defaults**: Therapist confirms what gets included.
   - Current: N/A.
   - Target: Dialog renders a checkbox per **enabled** section. Pre-checked sections (client-safe default): Trapped Emotions Released, Physical Imbalance, Limiting Beliefs, Additional Treatment Techniques, Heart Shield Emotions (if data present), Information for Next Session. Pre-unchecked: Issues + severity, Session Notes and Observations, Heart-Shield-removed status.
   - Acceptance: Dialog shows defaults exactly as listed; therapist can toggle any checkbox to override before generating the document.

9. **Disabled sections appear greyed in the export dialog**: Therapist can see why a section is missing.
   - Current: N/A.
   - Target: Sections disabled in Settings appear in the dialog list, greyed out and unselectable, with a hover/tap tooltip "Disabled in Settings."
   - Acceptance: Disabling a section in Settings then opening Export shows that section greyed and unselectable with the tooltip.

10. **Document header auto-populates from session data**: No re-entry of metadata.
    - Current: N/A.
    - Target: Header includes client name, session date formatted per current UI language, session type label (Clinic / Online / Other). No therapist name (no therapist profile exists).
    - Acceptance: Generated document for a known session contains the correct client name, the session date in the expected format for the active UI language, and the session-type label.

11. **Custom section labels appear in the exported document**: Feature A's labels are honored.
    - Current: N/A.
    - Target: Section headings in the generated document use the therapist's custom labels (where set) or the i18n default for the current UI language (where no custom label is set).
    - Acceptance: A custom label set in Settings appears in both the section-selection dialog and the final document body.

12. **Editable preview before final export**: Therapist polishes the document before downloading or sharing.
    - Current: N/A.
    - Target: After section selection, the dialog shows an editable text view of the document. Therapist can freely edit the text before the final export action.
    - Acceptance: Edits made in the preview appear verbatim in the downloaded PDF / Markdown / shared file.

13. **PDF download (CRITICAL)**: Primary export output.
    - Current: N/A (no file download exists).
    - Target: "Download PDF" button produces a `.pdf` file containing the document header + selected sections (using whatever the therapist edited in the preview).
    - Acceptance: Clicking "Download PDF" downloads a `.pdf` file that opens in a standard PDF reader and contains the expected header and section content.

14. **Plain-text file download**: Alternative output for non-PDF use.
    - Current: Only clipboard copy of Markdown exists.
    - Target: "Download as text file" button produces a `.md` file with the document header + selected sections. File extension stays `.md` (Markdown is plain text — opens correctly in any text editor / Notes app even when the editor doesn't render Markdown formatting), but the **button label** uses friendly language ("Download as text file" / "הורד כקובץ טקסט" / "Als Textdatei herunterladen" / "Stáhnout jako textový soubor") so non-technical therapists understand what they're getting.
    - Acceptance: Clicking the button downloads a `.md` file with valid Markdown structure; the button label in all 4 UI languages contains no "Markdown" or "MD" jargon.

15. **Web Share API integration where supported**: Native mobile share sheet.
    - Current: N/A.
    - Target: When `navigator.canShare({files: [pdf]})` returns true, a "Share" button is visible and triggers `navigator.share()` with the generated PDF as an attachment. When unsupported, the Share button is hidden. No mailto / Gmail-URL fallback in v1 — the file is already downloadable, the user can attach it manually.
    - Acceptance: On a Web-Share-capable browser, "Share" is visible and triggers the OS share sheet with the PDF attached. On an unsupported browser, the button is not rendered.

16. ~~**Translate shortcut for cross-language client communication**~~ — **REMOVED 2026-04-28** per user feedback. The export modal will not include a Translate button. Therapists in cross-language scenarios use external translation tools manually (the editable preview gives them the text they need to copy out). This requirement-id is preserved (not renumbered) so plan/threat-model references to REQ-17..REQ-20 remain stable. No code, i18n key, or UI element should reference Translate in this phase.

17. **All new user-facing strings are translated**: Settings page + export dialog + buttons in en/de/he/cs.
    - Current: i18n parity exists for current screens.
    - Target: All new strings have keys in all 4 i18n files; rendering is RTL-safe (logical CSS properties); Hebrew display is verified.
    - Acceptance: Switching the UI language to each of en/de/he/cs renders all Settings page strings, export dialog labels, button text, tooltips, and indicator text in that language. Hebrew layout is correct.

### Feature C — Cross-cutting integrations with existing app surfaces

18. **Backup/restore extended to include therapist settings**: Custom labels and disabled-section state survive a backup/restore round-trip.
    - Current: `assets/backup.js` exports/imports `clients` + `sessions` IndexedDB stores in a ZIP. No therapist-settings store exists.
    - Target: Backup ZIP includes the new therapist-settings data (custom section labels + disabled-section list). Restore writes them back. Restoring a *pre-Phase-22* backup (no settings entries) applies defaults silently — no error, all sections enabled, no custom labels.
    - Acceptance: (a) Set custom labels + disable a section → backup → wipe → restore → settings reappear unchanged; (b) Restore a backup created before this phase shipped → app loads with default labels and all sections enabled, no console errors.

19. **Existing "Copy Session (MD)" honors custom labels**: `buildSessionMarkdown()` reads through the same label-resolution layer as the export.
    - Current: `buildSessionMarkdown()` (assets/add-session.js:596-681) emits hardcoded i18n labels.
    - Target: Function reads custom labels (when present) before falling back to i18n defaults. Both Copy MD and the new Export use the same label source — never diverge.
    - Acceptance: After renaming "Trapped Emotion" → "X" in Settings, clicking "Copy Session (MD)" produces a Markdown string containing "X" (not the i18n default).

20. **Service Worker precaches the new Settings page and assets**: PWA offline-first behavior covers the new screen.
    - Current: `sw.js` `PRECACHE_URLS` includes the existing 5 app pages + their JS/CSS. `CACHE_NAME` is at v26 per recent Phase 19 deploy notes.
    - Target: `PRECACHE_URLS` adds `settings.html` + any new JS file (e.g. `assets/settings.js`) + new CSS if extracted. `CACHE_NAME` bumps to the next version so installed PWA users pick up the new files.
    - Acceptance: Installed PWA users who update get the new Settings page available offline; old cached app shells are evicted.

### Feature D — User-facing warnings on the Settings page (added 2026-04-28)

21. **Up-front warnings on the Settings page**: The therapist sees what will and won't happen *before* they make changes — not only as a post-save toast.
    - Current: N/A (Settings page does not exist yet; original SPEC only covered a post-save sync message).
    - Target: Two visible, translated, RTL-safe surfaces on the Settings page:
      (a) **Sticky info banner** at the top of the row list, always visible, with two short bullets: "Custom names apply to all UI languages — one label set, not per-language." AND "Disabling a section never deletes existing data — past sessions still display sections that already have content.";
      (b) **First-time-disable confirmation dialog** — the *first time* the therapist toggles any section to "disabled" in a Settings session, a confirmation dialog appears before the toggle commits. Body text: "This won't delete existing data. Past sessions can still display this section if it has content. New sessions will not show it. Continue?" Confirm label: "Yes, disable". Cancel label: "Keep enabled". The dialog appears only once per Settings page visit (a session-storage flag suppresses it for subsequent disables in the same visit; it returns on the next page load). The dialog reuses the existing Phase 21 confirm-card pattern (no new dialog style).
    - Acceptance: (a) Banner is visible at the top of Settings page in all 4 UI languages with correct RTL layout in Hebrew; (b) First disable in a fresh page load opens the confirmation dialog; cancelling leaves the section enabled; confirming disables it; (c) Subsequent disables in the same page visit do not re-open the dialog; (d) Reloading the page resets the once-per-visit flag.

## Boundaries

**In scope:**

- Settings page that lists 9 session sections — 6 with rename + enable/disable + reset-per-row, 3 (Heart Shield toggle, Issues + severity, Information for Next Session) with disable + reset only and a non-editable rename input
- Settings page user-facing warnings: sticky info banner explaining global-across-languages + no-data-deletion, plus a once-per-page-visit first-time-disable confirmation dialog
- Per-section enable/disable affecting (a) new-session form, (b) any past-session form which renders disabled-but-populated sections as fully editable with a "Disabled in Settings" badge (auto-hides once data is cleared), (c) export dialog
- Single-session export (one document per session)
- Export formats: PDF (critical) and plain-text/Markdown file download (button label: "Download as text file"; file extension: `.md`)
- Editable preview between section selection and final export
- Web Share API support where available (PDF as attachment)
- Existing clipboard-copy button preserved AND renamed from "Copy Session (MD)" to "Copy session text"; both that button and the new Export use the same custom-label source
- PDF filename: client name preserved as-is (Hebrew, German diacritics, Czech diacritics all kept), only OS-reserved filename characters stripped (`< > : " / \ | ? *` and ASCII control chars 0–31, plus trailing dots/spaces); fall back to `Session` if the result is empty
- Backup/restore extended to round-trip the new therapist-settings data; backward-compatible with pre-Phase-22 backups
- Service Worker `CACHE_NAME` bump and `PRECACHE_URLS` extension for the new Settings page assets
- New Settings HTML page wired into shared chrome (`shared-chrome.js`), license gate, and TOC/disclaimer gate per existing app-page conventions
- Settings page is reachable in Demo mode and operates against the demo `IndexedDB` (no special demo guard) — keeps the demo identical to the real app and minimises implementation surface
- All new strings translated in en/de/he/cs with RTL-safe layout
- Mobile-first responsive design (375px viewport)

**Out of scope:**

- **Pre-session context card / open-issues view / severity trend** — innovator-extrapolated, not direct user feedback. Remains in `.planning/todos/pending/2026-04-26-pre-session-context-card.md` for a future phase.
- **Multi-session client reports** — date-range or last-N-session summaries. Deferred to v1.2; out of scope so v1 ships fast.
- **Add / remove / reorder sections, or change field types** — Feature A is rename + enable/disable only. Adding new sections requires custom-fields infrastructure, which is a separate phase.
- **Per-UI-language label overrides** — custom labels are global by design. Multi-language therapists manage this via the editable preview.
- **mailto: or Gmail compose URL delivery** — body-length-limited, no attachments, dated UX. Web Share API + downloadable file cover the same use case better.
- **HTML file export** — PDF + Markdown sufficient for v1.
- **In-app translation engine** — out of scope.
- **Translate shortcut to Google Translate** (originally REQ-16) — **REMOVED 2026-04-28**. Therapists in cross-language scenarios use external translation tools manually.
- **Renaming the Heart Shield toggle, Issues + severity section, or Information for Next Session section** — these three sections have fixed semantic structure (binary flag, structured array with severity scales, downstream consumer for the future pre-session context card respectively); only enable/disable + reset are supported for them. Settings-page rename input is greyed out for these rows with a tooltip.
- **Therapist profile / business name in document header** — no therapist profile system exists in the app; introducing one is a separate phase.
- **Backend storage of exports, send tracking, read receipts** — local-first constraint; no server.
- **Reordering sections in the export dialog** — sections appear in the same order they appear on the session form.
- **Templates / starter sets ("Pick your modality")** — no preset packs in v1; therapist renames/disables manually.
- **Heart Shield filter on sessions page (`assets/sessions.js`)** — Filter dropdown stays visible even when the Heart Shield section is disabled in Settings. Reason: historical Heart Shield sessions may exist and the therapist needs to find them. No changes to filter behavior in this phase.
- **Heart Shield indicators on the clients table (`assets/overview.js`)** — ❤️/✓ next to client names continues to reflect historical session data; no behavior change when the Heart Shield section is disabled.
- **Reporting / overview averaging logic (`assets/reporting.js`, `assets/overview.js`)** — When a therapist disables the Issues + severity section, new sessions contribute empty `issues[]` and the existing averaging code computes them as zero-contribution. Behavior unchanged in this phase. Documented limitation; revisit in v1.2 if it surfaces as a complaint.
- **Demo-mode special-casing of the Settings page** — explicitly NOT in scope. The gear icon, Settings page, export modal, and PDF download are all reachable in Demo mode. Demo's separate IndexedDB (`demo_portfolio`) means any settings/exports the demo user creates are isolated from a real installation. This keeps demo behavior identical to the real app and avoids per-mode branching code paths.

## Constraints

- **Local-first** — no backend, no server, no new third-party processors. The app's privacy positioning is core to the €119 sale.
- **i18n** — all new user-facing strings in en/de/he/cs.
- **RTL-safe** — Hebrew is a real user (Sapir). Use logical CSS properties (`inline-start`/`inline-end`), not directional `left`/`right`.
- **Existing session data must be preserved** — sessions in the DB use the fixed schema; renaming/disabling sections must not destroy or rewrite stored data.
- **Storage keys are fixed** — schema field names (`trappedEmotions`, `insights`, etc.) do not change. Custom labels are display-only.
- **Mobile-first** — therapists use phones during/between sessions. Settings page, export dialog, and editable preview must be usable at 375px.
- **No new heavyweight dependencies** — PDF generation can use a small library (e.g. `jsPDF`) or a print-stylesheet approach; final choice deferred to discuss-phase but the app bundle should stay lean.
- **Service Worker discipline** — Adding a new HTML page or JS asset requires bumping `CACHE_NAME` and updating `PRECACHE_URLS` in `sw.js`. PWA users must seamlessly pick up the new files on next visit (per Phase 19 deploy notes — current cache is at v26).
- **App-page conventions** — New Settings page must match existing app-page contract: license-gate inline script in `<head>`, TOC/disclaimer gate, shared chrome (`shared-chrome.js`) for header/footer/globe, CSP meta tag, no external network requests at page load.
- **Single label-resolution layer** — Both `buildSessionMarkdown()` (Copy MD) and the new Export must read section labels through one shared resolution function. No duplicated label lookup logic — divergence is a bug class to be designed out.
- **Backup version compatibility** — Restoring a backup created before Phase 22 must succeed without errors and apply defaults silently (no migration prompt, no data loss).

## Cross-cutting Impacts on Existing Code

The following existing files/modules MUST be touched in this phase. Plan-phase should reflect each as a discrete task or sub-task.

| File / Module                    | Change required                                                                              |
|----------------------------------|----------------------------------------------------------------------------------------------|
| `assets/backup.js`               | Extend export/import to round-trip the new therapist-settings store; backward-compatible with pre-Phase-22 backups |
| `assets/add-session.js`          | (a) Each section's render becomes conditional on the enabled-state. (b) Edit-mode shows disabled-but-populated sections with the indicator. (c) `buildSessionMarkdown()` reads custom labels via the shared resolution layer. |
| `add-session.html`               | Section markup wraps must support hide/show + indicator badge per section                    |
| `sw.js`                          | Bump `CACHE_NAME` and add new Settings page + new JS/CSS to `PRECACHE_URLS`                  |
| `assets/shared-chrome.js`        | New Settings page registered as an app page so header/footer/globe render consistently       |
| `assets/i18n-en.js` / `-de` / `-he` / `-cs` | New keys for Settings page rows + sticky banner + first-time-disable confirm + greyed-rename tooltip; "Copy session text" rename of the existing clipboard button; "Download as text file" + "Download PDF" + "Share via device" buttons; greyed-row indicator. **No** Translate keys (REQ-16 removed). |
| `assets/db.js`                   | Add new IndexedDB store (or repurpose localStorage) for therapist-settings; if a new store is added, the migration handler bumps DB version with a no-op upgrade for existing users |
| `assets/app.css` (or new file)   | Greyed-out style for export dialog rows; "Disabled in Settings" indicator style; Settings page layout |

**Existing surfaces explicitly NOT changed (verified, documented in Boundaries):**

- `assets/sessions.js` Heart Shield filter — unchanged
- `assets/overview.js` clients table heart-shield indicators — unchanged
- `assets/reporting.js` averaging logic — unchanged
- Demo mode (separate IndexedDB) — verify-only, no edits

## Acceptance Criteria

**Feature A — Settings page:**

- [ ] Settings page is reachable from the main app navigation (gear icon in shared header) and from Demo mode
- [ ] Settings page lists all 9 sections; 6 rows have an editable rename input + enable/disable + reset; 3 rows (Heart Shield toggle, Issues + severity, Information for Next Session) have a greyed/non-editable rename input with a tooltip explaining why, plus enable/disable + reset
- [ ] Renaming a free-text section in Settings updates the label everywhere (form, export dialog, exported document) — verified in all 4 UI languages
- [ ] The 3 disable-only rows accept no rename input but **can** be disabled and re-enabled
- [ ] Custom labels and disabled state persist across browser sessions
- [ ] Per-row reset restores the default i18n label for the current UI language
- [ ] Disabling a section hides it from the new-session form
- [ ] Opening any past session that has data in a now-disabled section displays that section as a fully editable input (not read-only) with a small "Disabled in Settings" badge
- [ ] After clearing a disabled section's data and saving the session, re-opening that session no longer renders the section
- [ ] Disabling then re-enabling a section preserves all stored data
- [ ] Settings page sticky info banner is visible at top with the two warnings (global-across-languages, no-data-deletion) translated in all 4 languages
- [ ] First-time-disable in a fresh page visit opens the confirmation dialog; cancelling leaves the section enabled; subsequent disables in the same visit do not re-open the dialog; reloading the page resets the once-per-visit flag
- [ ] Settings page renders correctly in en/de/he/cs
- [ ] Settings page is usable on a 375px mobile viewport
- [ ] Settings page renders correctly in RTL (Hebrew)

**Feature B — Export:**

- [ ] The existing clipboard button on the session edit page reads "Copy session text" (or its translated equivalent) — no "(MD)" or "Markdown" jargon visible to the user — and still copies the same Markdown string to clipboard on click
- [ ] "Export" button appears next to it
- [ ] Export dialog opens with checkboxes for each enabled section, pre-checked per the client-safe default list
- [ ] Disabled sections appear greyed and unselectable in the dialog with a tooltip "Disabled in Settings"
- [ ] No Translate button appears anywhere in the export dialog (REQ-16 removed)
- [ ] Document header in the export contains client name, UI-language-formatted session date, session type label
- [ ] PDF filename preserves the client name as-is including non-Latin characters (Hebrew, German diacritics, Czech diacritics) and only strips OS-reserved characters; falls back to "Session" if the result is empty
- [ ] Custom section labels (from Feature A) appear in the dialog and the exported document
- [ ] Editable preview allows free-form text editing of the document body before final export
- [ ] "Download PDF" button (translated to all 4 languages) produces a `.pdf` file containing the header and selected/edited content; opens in a standard PDF reader
- [ ] "Download as text file" button (translated to all 4 languages — no "Markdown"/"MD" jargon) produces a `.md` file with valid Markdown structure
- [ ] On browsers supporting `navigator.canShare({files:...})`, "Share" button is visible and shares the PDF; on unsupported browsers, "Share" is not rendered
- [ ] All export-related strings render in en/de/he/cs
- [ ] Export dialog and editable preview are usable on a 375px mobile viewport
- [ ] Export dialog and editable preview render correctly in RTL (Hebrew)

**Feature C — Cross-cutting integrations:**

- [ ] Backup ZIP includes the new therapist-settings data; restore round-trip preserves custom labels and disabled-section state
- [ ] Restoring a backup created before Phase 22 succeeds without errors and applies defaults (all sections enabled, no custom labels)
- [ ] After renaming a free-text section in Settings, the clipboard-copy output uses the custom label (proves shared label-resolution layer works)
- [ ] Service Worker `CACHE_NAME` is bumped past v26 and `PRECACHE_URLS` includes the new Settings page assets
- [ ] Installed PWA users update cleanly to the new version and can access Settings page offline after first visit
- [ ] Settings page enforces the license gate (unactivated users are redirected to license.html)
- [ ] Settings page enforces the TOC/disclaimer gate (users without terms-acceptance are redirected to disclaimer)
- [ ] Settings page renders shared chrome (header, footer, globe language switcher) consistently with other app pages
- [ ] Demo mode reaches the Settings page through the same gear icon and operates against the demo IndexedDB; no demo-specific guards in the code path

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                            |
|--------------------|-------|------|--------|------------------------------------------------------------------|
| Goal Clarity       | 0.85  | 0.75 | ✓      | Two well-bounded features, both Sapir-driven                     |
| Boundary Clarity   | 0.85  | 0.70 | ✓      | Out-of-scope list extends to non-changed existing surfaces (Heart Shield filter, indicators, reporting averages, demo mode) |
| Constraint Clarity | 0.85  | 0.65 | ✓      | Local-first, 4-lang i18n, RTL, schema-preserving, SW discipline, app-page conventions — all explicit |
| Acceptance Criteria| 0.82  | 0.70 | ✓      | 34 pass/fail criteria across three feature groupings             |
| **Ambiguity**      | 0.156 | ≤0.20| ✓      | Gate passed                                                      |

## Interview Log

| Round | Perspective    | Question summary                                       | Decision locked                                                                              |
|-------|----------------|--------------------------------------------------------|----------------------------------------------------------------------------------------------|
| 0     | Researcher     | Codebase scout — what exists today                     | 8 hardcoded sections + Issues array; `customerSummary` IS "Information for Next Session"; `buildSessionMarkdown()` already exists; client.email exists but no mailto anywhere; per-issue severity, no cross-session linking |
| 1     | Researcher     | Cross-session issue tracking for context card          | Discussion led to dropping Feature 1 entirely (innovator extrapolation, not user feedback)   |
| 2     | Boundary Keeper| Feature 2 scope — rename only? editor location?        | Rename-only initially → expanded in Round 5; Settings page is the editor home               |
| 2     | Boundary Keeper| Feature 2 — per-language labels?                       | Custom labels are global across all UI languages                                            |
| 3     | Researcher     | Feature 3 — export format / delivery / scope           | One session per export; section-selection dialog with client-safe defaults; PDF + .md downloads + Web Share API |
| 4     | Failure Analyst| Default section selection; custom-label coupling; UI placement | Locked default-checked list; custom labels appear in export; Export button on session edit page only |
| 5     | Boundary Keeper| Disable scope; existing-data behavior; cross-language quirk | All 9 sections disable-able; edit mode shows disabled sections that have data; Translate shortcut added to address language quirk |
| 6     | Failure Analyst| Cross-cutting impacts on existing app code (user prompt) | Added Feature C requirements 18-20 (backup, BSM coupling, SW cache); enumerated 8 files that MUST change and 4 surfaces explicitly NOT changed; new constraint for single label-resolution layer |

---

## Amendment 2026-04-28 — post-Sapir-review tightening

The 8-plan PLAN.md set was generated against the original SPEC. Before execution, the user reviewed the Hebrew review document with Sapir and surfaced six tightenings. They are folded back into the requirements above and summarised here for traceability:

1. **REQ-2 split into renameable vs disable-only.** Three sections lost rename: Heart Shield (toggle — yes/no removal flag, no semantic value to relabel), Issues + severity (structured array with severity scales — relabel without restructure misleads), Information for Next Session (consumed downstream by the future pre-session context card phase — purpose is fixed). The other 6 free-text sections remain renameable.
2. **REQ-5 simplified.** Past sessions with data in a now-disabled section render that section as a fully editable input (not read-only), with a small "Disabled in Settings" badge. Once the therapist clears the data and saves, the section disappears from that session on next open. This collapses any "view vs edit" distinction.
3. **REQ-7 + REQ-14 button copy.** The existing clipboard button is renamed from "Copy Session (MD)" to "Copy session text". The Markdown download button is labelled "Download as text file" — file extension stays `.md`. No "(MD)" or "Markdown" jargon visible to the user.
4. **REQ-16 (Translate) REMOVED.** The export modal will not include a Translate button. REQ-ID slot preserved (struck-through) so plan/threat-model references to REQ-17..REQ-20 remain stable.
5. **PDF filename rule (D-04 in CONTEXT.md, surfaced into Boundaries).** Client name preserved as-is (Hebrew, German diacritics, Czech diacritics all kept); only OS-reserved characters stripped (`< > : " / \ | ? *` and ASCII control chars 0–31, plus trailing dots/spaces); `Session` fallback if empty.
6. **REQ-21 added — Settings page warnings.** Sticky info banner (global-across-languages + no-data-deletion) plus once-per-page-visit first-time-disable confirmation dialog.
7. **Demo mode policy locked (NOT a special case).** Settings page is reachable in Demo, runs against the demo IndexedDB, no per-mode branching.

These amendments propagate into 22-CONTEXT.md (D-04, D-12, D-17, plus new D-21..D-23), 22-UI-SPEC.md (banner copy, button labels, removal of Translate row, greyed-rename rows), and the affected plans (22-02 i18n, 22-04 Settings page, 22-05 PDF filename, 22-06 export modal + editable disabled-section input, 22-08 SW + gear).

---

*Phase: 22-session-workflow-loop-pre-session-context-card-editable-sess*
*Spec created: 2026-04-26 ; amended: 2026-04-28*
*Next step: /gsd-execute-phase 22 (the 8 PLAN.md files have been updated to reflect these amendments).*
