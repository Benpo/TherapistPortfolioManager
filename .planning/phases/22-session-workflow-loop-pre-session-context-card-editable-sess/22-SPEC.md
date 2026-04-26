# Phase 22: Session Workflow Loop — Specification

**Created:** 2026-04-26
**Ambiguity score:** 0.156
**Requirements:** 20 locked

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

2. **Section labels are renameable, persisted locally, and global across UI languages**: Renaming a section updates the label everywhere it appears.
   - Current: Labels read directly from i18n keys per UI language.
   - Target: A user-chosen label override per section, stored in IndexedDB or localStorage. The override is **global** — it appears in all 4 UI languages (en/de/he/cs). Underlying storage keys (`trappedEmotions`, etc.) are unchanged.
   - Acceptance: Renaming "Trapped Emotion" to "X" in Settings causes "X" to appear in (a) the session form, (b) the export section-selection dialog, (c) the exported document. Verified in all 4 UI languages.

3. **Sections can be reset to default**: Per-row "Reset" restores the i18n default.
   - Current: N/A (no overrides exist).
   - Target: Reset removes the user override; section displays the default i18n value for the current UI language.
   - Acceptance: After rename + reset, the section displays the original i18n value.

4. **Sections can be disabled per therapist**: Checkbox per section; disabled sections do not appear in the form for new sessions.
   - Current: All 9 sections always render.
   - Target: When a section is disabled in Settings, it is not rendered when creating a new session. Underlying schema field is unchanged (still in DB; just empty for new sessions).
   - Acceptance: Disabling "Heart Shield" in Settings removes the Heart Shield toggle and emotions textarea from the new-session form. Disabling "Issues + severity" removes the entire issues block.

5. **Disabled sections in edit-existing-session mode show stored data**: Therapists do not lose access to historical content.
   - Current: N/A.
   - Target: When opening an existing session for edit, any disabled section that *has stored data* is rendered (with a visual indicator that the section is disabled in Settings) so the therapist can read or clean up the data. Disabled sections with no stored data stay hidden.
   - Acceptance: A session created before "Trapped Emotion" was disabled still displays the trapped-emotion text on the edit screen with a "Disabled in Settings" indicator; a section with no historical data stays hidden.

6. **Existing session data is preserved through enable/disable cycles**: Disabling never deletes data.
   - Current: N/A.
   - Target: Disable → re-enable → all stored data is intact and re-appears in the form.
   - Acceptance: Smoke test — create session with all sections, disable a section, confirm DB still has the value, re-enable, confirm field re-renders with the value.

### Feature B — Session-to-document export

7. **Export action on the session edit page**: A new "Export" button opens an export dialog.
   - Current: Only "Copy Session (MD)" exists (clipboard only).
   - Target: New "Export" button placed next to "Copy Session (MD)". Clicking opens the export dialog. "Copy Session (MD)" is preserved as a separate quick action.
   - Acceptance: Both buttons appear on the session edit page; clicking Export opens the dialog.

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

14. **Markdown file download**: Alternative output.
    - Current: Only clipboard copy of Markdown exists.
    - Target: "Download .md" button produces a `.md` file with the document header + selected sections.
    - Acceptance: Clicking "Download .md" downloads a `.md` file with valid Markdown structure.

15. **Web Share API integration where supported**: Native mobile share sheet.
    - Current: N/A.
    - Target: When `navigator.canShare({files: [pdf]})` returns true, a "Share" button is visible and triggers `navigator.share()` with the generated PDF as an attachment. When unsupported, the Share button is hidden. No mailto / Gmail-URL fallback in v1 — the file is already downloadable, the user can attach it manually.
    - Acceptance: On a Web-Share-capable browser, "Share" is visible and triggers the OS share sheet with the PDF attached. On an unsupported browser, the button is not rendered.

16. **Translate shortcut for cross-language client communication**: One-click external translation.
    - Current: N/A.
    - Target: A "Translate" button next to the editable preview opens `translate.google.com` in a new tab with the current preview text prefilled and a target-language picker. Therapist translates externally and pastes back into the preview before exporting.
    - Acceptance: Clicking "Translate" opens a new tab to Google Translate with the preview text in the URL parameter.

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

## Boundaries

**In scope:**

- Settings page that lists 9 session sections with rename + enable/disable + reset-per-row controls
- Per-section enable/disable affecting (a) new-session form, (b) edit-session form (with stored-data fallback), (c) export dialog
- Single-session export (one document per session)
- Export formats: PDF (critical) and Markdown file download
- Editable preview between section selection and final export
- Web Share API support where available (PDF as attachment)
- Translate shortcut to `translate.google.com`
- Existing "Copy Session (MD)" button preserved AND updated to read custom labels from the same source as Export
- Backup/restore extended to round-trip the new therapist-settings data; backward-compatible with pre-Phase-22 backups
- Service Worker `CACHE_NAME` bump and `PRECACHE_URLS` extension for the new Settings page assets
- New Settings HTML page wired into shared chrome (`shared-chrome.js`), license gate, and TOC/disclaimer gate per existing app-page conventions
- All new strings translated in en/de/he/cs with RTL-safe layout
- Mobile-first responsive design (375px viewport)

**Out of scope:**

- **Pre-session context card / open-issues view / severity trend** — innovator-extrapolated, not direct user feedback. Remains in `.planning/todos/pending/2026-04-26-pre-session-context-card.md` for a future phase.
- **Multi-session client reports** — date-range or last-N-session summaries. Deferred to v1.2; out of scope so v1 ships fast.
- **Add / remove / reorder sections, or change field types** — Feature A is rename + enable/disable only. Adding new sections requires custom-fields infrastructure, which is a separate phase.
- **Per-UI-language label overrides** — custom labels are global by design. Multi-language therapists manage this via the editable preview.
- **mailto: or Gmail compose URL delivery** — body-length-limited, no attachments, dated UX. Web Share API + downloadable file cover the same use case better.
- **HTML file export** — PDF + Markdown sufficient for v1.
- **In-app translation engine** — external Google Translate handoff covers the rare cross-language case.
- **Therapist profile / business name in document header** — no therapist profile system exists in the app; introducing one is a separate phase.
- **Backend storage of exports, send tracking, read receipts** — local-first constraint; no server.
- **Reordering sections in the export dialog** — sections appear in the same order they appear on the session form.
- **Templates / starter sets ("Pick your modality")** — no preset packs in v1; therapist renames/disables manually.
- **Heart Shield filter on sessions page (`assets/sessions.js`)** — Filter dropdown stays visible even when the Heart Shield section is disabled in Settings. Reason: historical Heart Shield sessions may exist and the therapist needs to find them. No changes to filter behavior in this phase.
- **Heart Shield indicators on the clients table (`assets/overview.js`)** — ❤️/✓ next to client names continues to reflect historical session data; no behavior change when the Heart Shield section is disabled.
- **Reporting / overview averaging logic (`assets/reporting.js`, `assets/overview.js`)** — When a therapist disables the Issues + severity section, new sessions contribute empty `issues[]` and the existing averaging code computes them as zero-contribution. Behavior unchanged in this phase. Documented limitation; revisit in v1.2 if it surfaces as a complaint.
- **Demo mode independence** — Demo data uses a separate IndexedDB (`demo_portfolio`) and is not affected by therapist Settings. No changes needed; verify-only.

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
| `assets/i18n-en.js` / `-de` / `-he` / `-cs` | New keys for Settings page rows, disabled-indicator tooltip, export dialog labels, Translate/Share/Download buttons |
| `assets/db.js`                   | Add new IndexedDB store (or repurpose localStorage) for therapist-settings; if a new store is added, the migration handler bumps DB version with a no-op upgrade for existing users |
| `assets/app.css` (or new file)   | Greyed-out style for export dialog rows; "Disabled in Settings" indicator style; Settings page layout |

**Existing surfaces explicitly NOT changed (verified, documented in Boundaries):**

- `assets/sessions.js` Heart Shield filter — unchanged
- `assets/overview.js` clients table heart-shield indicators — unchanged
- `assets/reporting.js` averaging logic — unchanged
- Demo mode (separate IndexedDB) — verify-only, no edits

## Acceptance Criteria

**Feature A — Settings page:**

- [ ] Settings page is reachable from the main app navigation
- [ ] Settings page lists all 9 sections with rename input, enable/disable checkbox, and reset action per row
- [ ] Renaming a section in Settings updates the label everywhere (form, export dialog, exported document) — verified in all 4 UI languages
- [ ] Custom labels and disabled state persist across browser sessions
- [ ] Per-row reset restores the default i18n label for the current UI language
- [ ] Disabling a section hides it from the new-session form
- [ ] Editing an existing session shows a disabled section's content with a "Disabled in Settings" indicator if data is present; section stays hidden if no data
- [ ] Disabling then re-enabling a section preserves all stored data
- [ ] Settings page renders correctly in en/de/he/cs
- [ ] Settings page is usable on a 375px mobile viewport
- [ ] Settings page renders correctly in RTL (Hebrew)

**Feature B — Export:**

- [ ] "Export" button appears on the session edit page next to "Copy Session (MD)"
- [ ] "Copy Session (MD)" still works (clipboard copy of Markdown)
- [ ] Export dialog opens with checkboxes for each enabled section, pre-checked per the client-safe default list
- [ ] Disabled sections appear greyed and unselectable in the dialog with a tooltip "Disabled in Settings"
- [ ] Document header in the export contains client name, UI-language-formatted session date, session type label
- [ ] Custom section labels (from Feature A) appear in the dialog and the exported document
- [ ] Editable preview allows free-form text editing of the document body before final export
- [ ] "Download PDF" produces a `.pdf` file containing the header and selected/edited content; opens in a standard PDF reader
- [ ] "Download .md" produces a `.md` file with valid Markdown structure
- [ ] On browsers supporting `navigator.canShare({files:...})`, "Share" button is visible and shares the PDF; on unsupported browsers, "Share" is not rendered
- [ ] "Translate" button opens `translate.google.com` in a new tab with the current preview text prefilled
- [ ] All export-related strings render in en/de/he/cs
- [ ] Export dialog and editable preview are usable on a 375px mobile viewport
- [ ] Export dialog and editable preview render correctly in RTL (Hebrew)

**Feature C — Cross-cutting integrations:**

- [ ] Backup ZIP includes the new therapist-settings data; restore round-trip preserves custom labels and disabled-section state
- [ ] Restoring a backup created before Phase 22 succeeds without errors and applies defaults (all sections enabled, no custom labels)
- [ ] After renaming a section in Settings, "Copy Session (MD)" output uses the custom label (proves shared label-resolution layer works)
- [ ] Service Worker `CACHE_NAME` is bumped past v26 and `PRECACHE_URLS` includes the new Settings page assets
- [ ] Installed PWA users update cleanly to the new version and can access Settings page offline after first visit
- [ ] Settings page enforces the license gate (unactivated users are redirected to license.html)
- [ ] Settings page enforces the TOC/disclaimer gate (users without terms-acceptance are redirected to disclaimer)
- [ ] Settings page renders shared chrome (header, footer, globe language switcher) consistently with other app pages
- [ ] Demo mode (separate IndexedDB) continues to display all default sections regardless of therapist Settings in the real DB

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

*Phase: 22-session-workflow-loop-pre-session-context-card-editable-sess*
*Spec created: 2026-04-26*
*Next step: /gsd-discuss-phase 22 — implementation decisions (PDF library choice, Settings page layout, IndexedDB schema for overrides, etc.). Discuss-phase should also spawn /gsd-ui-phase given the non-trivial UI surface (Settings page + export dialog + editable preview).*
