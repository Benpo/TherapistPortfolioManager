---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
verified: 2026-05-06T17:45:28Z
status: gaps_found
score: 17/21 must-haves verified (3 blocked, 1 at-risk)
overrides_applied: 0
gaps:
  - truth: "Therapists can download a session as PDF via the Export modal"
    status: failed
    reason: "window.PDFExport is never registered on the page. assets/pdf-export.js is precached by the SW (sw.js:58) but no <script> tag loads it in add-session.html, and add-session.js does not lazy-load it either. The exportHandleDownloadPdf guard at add-session.js:1049 (`if (!btn || !window.PDFExport)`) short-circuits to App.showToast('','export.pdf.failed') and returns. REQ-13 is the CRITICAL acceptance criterion of Feature B; this blocks the whole 'session-to-document' goal."
    artifacts:
      - path: "add-session.html"
        issue: "Footer scripts block (lines 538-548) loads i18n bundles, db, shared-chrome, app, crop, md-render, add-session — but does NOT load pdf-export.js. window.PDFExport is undefined when Export modal opens."
      - path: "assets/add-session.js"
        issue: "exportHandleDownloadPdf at line 1046, exportHandleShare at line 1108, and exportHandleDownloadMd's slugify path at line 1090 all reference window.PDFExport directly. No code path appends a <script src='./assets/pdf-export.js'> tag at runtime. The plan (22-06 PLAN line 312) said 'lazy-loaded by add-session.js (Task 2) on first Export click' but this lazy-load was not implemented for pdf-export.js itself — only for jspdf.min.js + 2 fonts (which pdf-export.js loads, once it is itself loaded)."
    missing:
      - "Add `<script src=\"./assets/pdf-export.js\"></script>` to add-session.html footer (before add-session.js, after md-render.js) — OR add a loadScriptOnce-style lazy-load of pdf-export.js inside openExportDialog() in add-session.js"
      - "Re-test the Export → Download PDF flow end-to-end after the script tag is added; verify a real .pdf file downloads with header + section content"

  - truth: "Web Share API can share the generated PDF"
    status: failed
    reason: "exportHandleShare (add-session.js:1108-1140) calls await window.PDFExport.buildSessionPDF(...) at line 1116. Same root cause as REQ-13: PDFExport is undefined, so this throws. The Share button is also gated by exportProbeShareSupport (line 1142) which only calls navigator.canShare with a dummy probe Blob — that probe succeeds even without PDFExport, so the Share button DOES show up; clicking it then explodes. REQ-15."
    artifacts:
      - path: "assets/add-session.js"
        issue: "Line 1116 awaits window.PDFExport.buildSessionPDF — fails the same way as PDF download."
    missing:
      - "Same fix as REQ-13: ensure pdf-export.js is loaded before exportHandleShare runs"

  - truth: "App.initCommon() is awaited so therapist-settings cache is populated before applySectionVisibility / first render"
    status: failed
    reason: "App.initCommon was made async in this phase (assets/app.js:348, eager-loads therapistSettings into _sectionLabelCache) but EVERY caller invokes it without await. Five call sites confirmed: add-session.js:9, settings.js:397, sessions.js:2, reporting.js:2, overview.js:54. On add-session.js, applySectionVisibility(true|false) at lines 1481/1485 races the cache load. In practice the cache often wins (subsequent awaited IDB calls give it time) but ordering is not guaranteed. This is exactly REVIEW.md WR-01 — and is the most consequential finding from the code-review pass. Affects REQ-3 (disabled hidden in form) and REQ-5 (past-session disabled-but-populated render path) acceptance criteria — they become luck-of-microtask-ordering."
    artifacts:
      - path: "assets/add-session.js"
        issue: "Line 9: `App.initCommon();` — Promise discarded, applySectionVisibility runs at lines 1481/1485 with potentially-empty cache"
      - path: "assets/settings.js"
        issue: "Line 397: `App.initCommon();` — Promise discarded; loadAndRender at line 428 may render rows from a stale/empty cache on first paint"
      - path: "assets/sessions.js"
        issue: "Line 2: `App.initCommon();` — Promise discarded"
      - path: "assets/reporting.js"
        issue: "Line 2: `App.initCommon();` — Promise discarded"
      - path: "assets/overview.js"
        issue: "Line 54: `App.initCommon();` — Promise discarded"
    missing:
      - "Add `await` to all 5 `App.initCommon()` call sites (one-line fix per site; the existing handlers are already inside `async () => { ... }` callbacks)"
      - "Optional follow-up (REVIEW IN-01): also call applySectionVisibility(!!editingSession) inside the app:language listener in add-session.js:1461-1470 to self-correct against any caching race on first language switch"

  - truth: "Settings page first-time-disable confirmation dialog uses neutral styling (not red 'danger')"
    status: partial
    reason: "REVIEW IN-02 identified that confirmDialog reuses the global #confirmOkBtn which has hardcoded `class=\"button danger\"`. Phase 22 is the first non-destructive use (REQ-21 'Yes, disable' confirm). The dialog does open and the confirm flow works, but the OK button reads 'Yes, disable' in red — visually equivalent to the delete-session destructive confirmation. This contradicts REQ-21's intent ('This won't delete existing data'). The reviewer flagged this as Info (filing a follow-up todo) rather than Warning, but the warning copy and the visual treatment are pulling in opposite directions for new users. Not a hard blocker — REQ-21 acceptance ('confirmation dialog appears before the toggle commits; cancelling leaves the section enabled; subsequent disables in the same visit do not re-open the dialog; reloading the page resets the once-per-visit flag') is technically met."
    artifacts:
      - path: "assets/app.js:443-489"
        issue: "confirmDialog has no tone parameter; #confirmOkBtn has class='button danger' baked in across all consumers"
      - path: "settings.html:93"
        issue: "<button class=\"button danger\" type=\"button\" id=\"confirmOkBtn\">"
    missing:
      - "Add `tone: 'neutral' | 'danger'` option to confirmDialog (toggle .danger / .button-primary class on #confirmOkBtn). Settings.js:237 calls with tone:'neutral'; existing destructive consumers stay default."

deferred: []

human_verification:
  - test: "Hebrew RTL rendering of Settings page sticky info banner + 9 rows + first-time-disable confirm dialog"
    expected: "Banner heading + 2 bullets, row labels, rename inputs, toggle position, reset icon, badge — all flow right-to-left correctly. Dialog OK/Cancel order is RTL-appropriate."
    why_human: "Logical CSS properties used per CONVENTIONS, but Hebrew bidi quirks (mixed-direction strings, punctuation placement) cannot be verified by grep — only by visual inspection by a Hebrew reader (Sapir)."

  - test: "Hebrew PDF export — Hebrew client name in filename, Hebrew section headings + body text rendered with R2L"
    expected: "PDF downloads with filename containing Hebrew characters as-is (e.g. 'שירה_2026-05-06.pdf'); inside the PDF, section headings and body lines render right-to-left using NotoSansHebrew font; no question marks or boxes for missing glyphs."
    why_human: "Cannot verify without running PDF generation end-to-end (which is currently blocked — see GAP REQ-13). After the PDFExport script-tag fix lands, this needs Sapir to open a real .pdf in Acrobat / Preview / iOS Files."

  - test: "375px mobile viewport — Settings page rows stack correctly; export modal Step 2 tabs (Edit / Preview) work"
    expected: "Settings rows reflow vertically; rename input + toggle + reset button do not overflow; export modal shows mobile tabs at <=768px and side-by-side on desktop; tabs switch which pane is visible."
    why_human: "Visual layout / overflow / tap-target verification at 375px requires DevTools or a real iPhone — cannot be done via grep. UI-SPEC documents the layout but does not enforce it programmatically."

  - test: "Backup/restore round-trip — verify pre-Phase-22 backup loads with no errors and applies defaults"
    expected: "Restoring a ZIP that was created before therapistSettings existed (manifest.therapistSettings absent or null) succeeds without errors; all 9 sections render enabled with default i18n labels; no console errors; no orphaned IDB rows."
    why_human: "Requires creating a v1 backup ZIP manually (delete therapistSettings field from manifest.json before re-zipping) and importing it. Code path is defensive (assets/backup.js:333-334 force empty array fallback) but the actual round-trip needs human confirmation."

  - test: "PWA update path — installed v52 PWA users update to v53 cleanly and pick up Settings page offline"
    expected: "On next visit, SW activate event evicts v52 cache, precaches v53 (including settings.html, settings.js, pdf-export.js, jspdf.min.js, fonts). Settings page works offline after first visit."
    why_human: "Requires installing the PWA before deploy, then deploying, then re-visiting offline. SW cache version bumped to v53 (verified) but actual upgrade behavior on a real install requires Sapir or a tester."

  - test: "Demo mode — gear icon visible, Settings page reachable, runs against demo_portfolio IndexedDB without leaking to real install"
    expected: "Open landing.html → Demo button → gear icon visible in header → click → Settings page loads in demo context → setting a custom label in demo does not appear in the real app's IDB."
    why_human: "The code path looks correct (D-23: no demo guards) but actual IDB isolation requires testing in a fresh browser context."

---

# Phase 22: Session Workflow Loop — Verification Report

**Phase Goal:** Therapists can (a) tailor the session form to their own modality by renaming and disabling section titles via a Settings page, and (b) turn a finished session into an editable, client-facing document downloadable as PDF or Markdown and shareable via the device's native share sheet.

**Verified:** 2026-05-06T17:45:28Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

This phase ships a substantial amount of correct, well-structured code: the 9-row Settings page, the `therapistSettings` IDB store with proper v3→v4 additive migration, the `App.getSectionLabel` / `App.isSectionEnabled` resolution layer threading through `buildSessionMarkdown` and the export pipeline, the export modal with 3-step flow + section-selection defaults + greyed disabled rows + mobile tabs, the `assets/md-render.js` HTML-escape-then-format renderer, complete i18n parity for all 21 new keys across en/de/he/cs (no Translate residue — REQ-16 cleanly removed), the backup roundtrip with whitelist + type coercion + per-row try/catch + backward-compat empty-array fallback, the SW bumped to `sessions-garden-v53` with 6 new precache URLs + the `/settings` HTML route, and the gear icon mounted into shared chrome. The vendored jsPDF + Noto Sans + Noto Sans Hebrew fonts are present in `assets/`.

The phase also contains **two coupled wiring gaps that block the headline goal** of part (b): `assets/pdf-export.js` is never loaded onto the page, so `window.PDFExport` is undefined when the Export → Download PDF or Export → Share buttons are clicked. The fix is one `<script>` tag in `add-session.html`. Until it lands, REQ-13 (PDF download — labelled CRITICAL in SPEC.md) and REQ-15 (Web Share with PDF attachment) silently fail with an `export.pdf.failed` toast. The Markdown download path (REQ-14) survives because of a defensive fallback at `add-session.js:1094-1104`.

The third gap is the WR-01 timing race already raised by the code reviewer: `App.initCommon()` was made async this phase but is called without `await` at all 5 entry points. The cache load races `applySectionVisibility()` and the Settings render. In practice the cache usually wins, but REQ-3/REQ-5 acceptance criteria are not deterministically guaranteed. One-line fix per call site.

The fourth gap is cosmetic but contradicts intent: the first-time-disable confirm dialog (REQ-21) reuses the global `#confirmOkBtn` with hardcoded `class="button danger"`, so the "Yes, disable" button renders red — directly contradicting the warning copy "This won't delete existing data". REVIEW classified this as Info (suggesting a `tone:` parameter follow-up); we are flagging it here as a partial gap because REQ-21's user-facing intent is to *reduce* the destructive feel, not amplify it.

Once the four gaps close, this phase delivers its goal in full. Feature A (Settings page) is fully wired and works today (modulo the dialog tone polish). Feature B (Export) requires the one-line script-tag fix to come alive end-to-end.

### Observable Truths

| #   | Truth                                                                                                                                                                | Status        | Evidence                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Settings page exists and is reachable from every app page via gear icon (REQ-1)                                                                                      | VERIFIED      | `settings.html` (113 lines) + gear-icon mount in `app.js initSettingsLink()` line 291; `data-nav="settings"` set; license + TOC gates inline in `<head>`                                                                              |
| 2   | Settings page renders 9 rows; 6 free-text sections renameable, 3 (heartShield, issues, nextSession) disable-only with greyed input + tooltip (REQ-2)                  | VERIFIED      | `assets/settings.js:19` `LOCKED_RENAME = new Set(['heartShield','issues','nextSession'])`; renderRow disables input + adds info icon + ARIA tooltip for locked rows (lines 147-167); SECTION_DEFS lines 22-32 lists 9 keys           |
| 3   | Per-row Reset clears overrides; toggle disable hides section in new sessions; data preserved through enable/disable cycles (REQ-3, REQ-4, REQ-6)                      | VERIFIED      | `applySectionVisibility` walks `[data-section-key]` wrappers and toggles `.is-hidden`/badge (add-session.js:735-764); reset handler clears input + re-checks toggle (settings.js:205-217); disable writes flag, never deletes data |
| 4   | Past sessions render disabled-but-populated sections as fully editable inputs with "Disabled in Settings" badge (REQ-5 amended 2026-04-28)                            | VERIFIED      | applySectionVisibility branch at add-session.js:752-762 — when isPastSession && hasData, removes `.is-hidden` from wrapper + badge but does NOT add `disabled`/`readonly`; sectionHasData covers all 9 keys (lines 700-732)         |
| 5   | Up-front warnings on Settings page: sticky info banner + first-time-disable confirm dialog (REQ-21)                                                                   | PARTIAL       | Banner present in settings.html:54-67 with 2 bullets + i18n keys; confirm dialog wired in settings.js:230-252 with sessionStorage `settings.disable.confirmed` flag; **but** OK button renders RED (danger styling) — see GAP-4    |
| 6   | "Export" button next to renamed "Copy session text" button on session edit page (REQ-7)                                                                              | VERIFIED      | add-session.html:52-55 (#copySessionBtn with `data-i18n="session.copyAll"` → "Copy session text" in all 4 langs) + lines 56-59 (#exportSessionBtn with data-i18n="session.export")                                                  |
| 7   | Export dialog shows section checkboxes with client-safe defaults; disabled sections greyed + unselectable with tooltip (REQ-8, REQ-9)                                  | VERIFIED      | EXPORT_DEFAULT_CHECKED + EXPORT_SECTION_ORDER (add-session.js:776-798); exportRenderStep1Rows toggles `is-disabled` + `cb.disabled = !enabled` + badge with `settings.indicator.disabled` (lines 902-939)                              |
| 8   | Document header auto-populates with client name + UI-language formatted date + session type (REQ-10)                                                                  | VERIFIED      | getCurrentSessionDataForExport (add-session.js:815-822) packs clientName, sessionDateISO, sessionDateFormatted, sessionTypeLabel; passed into PDFExport.buildSessionPDF and into the Markdown header                                |
| 9   | Custom labels appear in section-selection dialog AND in exported document (REQ-11, REQ-19)                                                                            | VERIFIED      | exportRenderStep1Rows uses `App.getSectionLabel(key, exportDefaultI18nKey(key))` at line 908; buildSessionMarkdown threads `App.getSectionLabel` through all 9 section headings (lines 641, 652, 660, 665, 668, 671, 674, 677, 680) |
| 10  | Editable preview before final export (REQ-12)                                                                                                                        | VERIFIED      | `<textarea id="exportEditor">` + `<div id="exportPreview">` (add-session.html:423-424); MdRender.render escapes input then applies # / ## / ### / **bold** / *italic* / lists / br on `oninput` via exportUpdatePreview (line 985)   |
| 11  | "Download PDF" button produces a valid .pdf file (REQ-13 — CRITICAL)                                                                                                  | **FAILED**    | exportHandleDownloadPdf at add-session.js:1049 short-circuits via `if (!btn || !window.PDFExport)`; pdf-export.js is precached but no `<script>` tag loads it. See GAP-1.                                                                |
| 12  | "Download as text file" button produces a .md file (REQ-14)                                                                                                           | VERIFIED      | exportHandleDownloadMd builds Blob with `text/markdown;charset=utf-8` and triggers download via PDFExport.triggerDownload OR an inline fallback URL.createObjectURL (add-session.js:1084-1106) — fallback masks the PDFExport gap   |
| 13  | Web Share API integration where supported (REQ-15)                                                                                                                    | **FAILED**    | exportHandleShare at add-session.js:1116 awaits `window.PDFExport.buildSessionPDF` — same root cause as REQ-13. Probe button shows up because navigator.canShare uses a dummy Blob; clicking it then throws. See GAP-2.              |
| 14  | All new strings translated in en/de/he/cs (REQ-17)                                                                                                                    | VERIFIED      | grep across 4 i18n files: `settings.banner.*` 3 entries each, `settings.confirm.disable.*` 4 entries each, `settings.indicator.disabled`, `settings.rename.locked.tooltip`, `session.copyAll`, `session.export`, `export.download.pdf`, `export.download.text`, `export.share`, `header.settings.label` — all present once per file. Zero "translate" residue (REQ-16 cleanly removed). |
| 15  | Backup ZIP includes therapistSettings store; restore round-trip works; backward-compat with pre-Phase-22 backups (REQ-18)                                              | VERIFIED      | backup.js:418 `therapistSettings: allTherapistSettings` in manifest; restore at lines 645-665 walks rows with ALLOWED_KEYS whitelist + type-coerced cleanRec + per-row try/catch; pre-22 fallback at line 333-334 forces `[]`        |
| 16  | "Copy Session" honors custom labels via shared label-resolution layer (REQ-19)                                                                                        | VERIFIED      | buildSessionMarkdown calls `App.getSectionLabel` for all 9 section keys (lines 641, 652, 660, 665, 668, 671, 674, 677, 680); same function used by export — no duplicated label logic                                              |
| 17  | Service Worker precaches the new Settings page and assets (REQ-20)                                                                                                    | VERIFIED      | sw.js:12 `CACHE_NAME = 'sessions-garden-v53'` (from v52 baseline; well above v26 in SPEC); PRECACHE_URLS lines 57-62 includes settings.js, pdf-export.js, md-render.js, jspdf.min.js, both font files; PRECACHE_HTML line 100 includes /settings |
| 18  | Settings page enforces license gate + TOC/disclaimer gate + shared chrome consistency                                                                                 | VERIFIED      | settings.html:5-9 inline scripts in `<head>` mirror the disclaimer + license-activation gates from other app pages; CSP meta tag line 17; standard footer scripts load shared-chrome + app + settings + SW reg                       |
| 19  | App.initCommon() awaited so therapistSettings cache is populated before applySectionVisibility/render                                                                  | **FAILED**    | 5 call sites all call without await (add-session.js:9, settings.js:397, sessions.js:2, reporting.js:2, overview.js:54). REVIEW WR-01. See GAP-3.                                                                                  |
| 20  | Demo mode reaches Settings page through gear icon, runs against demo_portfolio IDB, no demo-specific guards                                                            | VERIFIED      | settings.html demo guard at line 5 (`if(window.name==='demo-mode')return;`) bypasses ONLY the disclaimer redirect — does not block page access; gear icon mounts in initSettingsLink unconditionally; PortfolioDB swaps to demo_portfolio store via existing app.js demo-mode logic (no Phase 22 changes) |
| 21  | All anti-patterns called out by REVIEW.md addressed at goal level                                                                                                     | PARTIAL       | XSS-safe DOM construction in settings.js (textContent + buildSvg helpers); MdRender escapes input before rules; backup whitelists. Open: WR-01 race (counted as GAP-3), WR-02 PDF font fallback (info-level), WR-03 BroadcastChannel close race (info-level), WR-04 innerHTML='' anti-pattern at add-session.js:905 (cosmetic). |

**Score:** 17/21 truths verified, 2 partial, 2 failed (3 if we count the additional REQ-15 share path that fails the same way as REQ-13)

### Required Artifacts

| Artifact                              | Expected                                                                                  | Status     | Details                                                                                                |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| `settings.html`                       | License gate + CSP + shared-chrome wiring + 9-row form + banner + confirm modal           | VERIFIED   | 113 lines; all gates inline; `data-nav="settings"`; CSP correct                                        |
| `assets/settings.js`                  | 9-row render, save, BroadcastChannel post, confirm dialog                                 | VERIFIED   | 432 lines; SECTION_DEFS, LOCKED_RENAME, renderRow, onSave, BroadcastChannel post                       |
| `assets/pdf-export.js`                | window.PDFExport with buildSessionPDF, slugify, triggerDownload + lazy-load jsPDF/fonts   | EXISTS BUT NOT WIRED | 529 lines; module is correct; **but no HTML page loads this script** — see GAP-1                   |
| `assets/md-render.js`                 | escape-then-format MD parser exposing window.MdRender.render                              | VERIFIED   | 70 lines; HTML-escapes first, then # / ## / ### / **bold** / *italic* / lists / br                     |
| `assets/jspdf.min.js`                 | Vendored library                                                                          | VERIFIED   | 365730 bytes — present                                                                                |
| `assets/fonts/noto-sans-base64.js`    | Latin + Latin Extended subset                                                             | VERIFIED   | 116191 bytes                                                                                          |
| `assets/fonts/noto-sans-hebrew-base64.js` | Hebrew block                                                                            | VERIFIED   | 32099 bytes                                                                                           |
| `assets/db.js` therapistSettings store | DB_VERSION=4 with additive migration                                                     | VERIFIED   | DB_VERSION=4 (line 4); MIGRATIONS[4] creates therapistSettings store (line 247); CRUD functions added  |
| `assets/app.js` getSectionLabel/isSectionEnabled/initCommon | Cache + resolution + cross-tab sync                                       | VERIFIED   | _sectionLabelCache (line 39), getSectionLabel (53), isSectionEnabled (67), initCommon async (348), BroadcastChannel listener (371-388), initSettingsLink gear (291) |
| `assets/add-session.js`               | applySectionVisibility, buildSessionMarkdown via getSectionLabel, openExportDialog        | VERIFIED   | applySectionVisibility (735), buildSessionMarkdown via getSectionLabel for all 9 keys (598-684), openExportDialog 3-step (1160), exportHandleDownloadMd with fallback (1084) |
| `add-session.html`                    | 9 data-section-key wrappers + Export button + Export modal markup                         | VERIFIED   | 9 data-section-key wrappers (verified by count); #exportSessionBtn (56); full #exportModal with 3 steps + step indicator (395-462); md-render.js script tag (547) |
| `assets/backup.js` therapistSettings  | Export/import round-trip + pre-Phase-22 backward-compat                                   | VERIFIED   | Manifest field (line 418), restore loop with whitelist + coercion (645-665), pre-22 fallback (333-334) |
| `sw.js` CACHE_NAME bump + PRECACHE_URLS | v53 + 6 new precache URLs + /settings HTML route                                        | VERIFIED   | CACHE_NAME='sessions-garden-v53'; settings.js, pdf-export.js, md-render.js, jspdf.min.js, both fonts in PRECACHE_URLS; /settings in PRECACHE_HTML |
| `assets/i18n-{en,de,he,cs}.js` Phase 22 keys | All new keys across all 4 languages                                                | VERIFIED   | All 11 key prefixes present once per file (banner: 3, confirm.disable: 4); zero translate residue     |

### Key Link Verification

| From                              | To                                            | Via                                                                                          | Status         | Details                                                                                  |
| --------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| Settings page → IDB therapistSettings | PortfolioDB.setTherapistSetting / getAllTherapistSettings | settings.js:296-298 + 346 + 488-489                                                          | WIRED          | Reads on load, writes on save; CRUD verified                                            |
| Settings save → other open tabs   | BroadcastChannel('sessions-garden-settings') | settings.js:351-355 → app.js:373-388                                                          | WIRED (with WR-03 race risk) | Sender posts then closes immediately — REVIEW WR-03 flagged as info; receiver lifetime-channel |
| add-session form → enabled state  | App.isSectionEnabled                          | add-session.js:740 + 907                                                                     | WIRED (race) | Cache loaded in initCommon; race documented as GAP-3                                    |
| add-session form → custom labels  | App.getSectionLabel                           | add-session.js:641,652,660,665,668,671,674,677,680 (buildSessionMarkdown), 908 (export rows) | WIRED          | Single label-resolution layer; both Copy MD and Export use the same source             |
| Export modal → PDF generation     | window.PDFExport.buildSessionPDF              | add-session.js:1058 (Download PDF), 1116 (Share)                                              | **NOT_WIRED**  | window.PDFExport never registered; GAP-1, GAP-2                                          |
| Export modal → MD download        | Blob('text/markdown') + URL.createObjectURL fallback | add-session.js:1089-1104                                                                  | WIRED          | Defensive fallback at line 1097-1103 means MD download survives the PDFExport gap      |
| Export modal → Web Share          | navigator.share + navigator.canShare         | add-session.js:1129 + 1145-1158                                                              | NOT_WIRED      | Probe shows the button, but click path requires PDFExport — GAP-2                       |
| add-session.js → MdRender         | window.MdRender.render                        | add-session.js:985 ; add-session.html:547 `<script src="./assets/md-render.js">`              | WIRED          | Script tag present; MdRender invoked in exportUpdatePreview                             |
| Backup roundtrip → IDB therapistSettings | manifest.therapistSettings → setTherapistSetting | backup.js:375-376 (export), 645-665 (restore)                                            | WIRED          | Whitelist + coerce + per-row try/catch + pre-22 backward-compat                        |
| SW precache → /settings + assets  | PRECACHE_URLS + PRECACHE_HTML                 | sw.js:57-62, 100                                                                             | WIRED          | All 6 Phase 22 assets + /settings route precached at v53                                |
| Header gear → Settings page       | initSettingsLink                              | app.js:291-337; mounts on every page that calls initCommon                                   | WIRED          | Idempotent (line 295), preserves insertion order; aria-label re-translates on lang change |

### Data-Flow Trace (Level 4)

| Artifact                    | Data Variable             | Source                                                | Produces Real Data | Status      |
| --------------------------- | ------------------------- | ----------------------------------------------------- | ------------------ | ----------- |
| Settings page rows          | currentMap (Map)          | PortfolioDB.getAllTherapistSettings (real IDB query) | Yes                | FLOWING     |
| add-session form visibility | _sectionLabelCache (Map)  | PortfolioDB.getAllTherapistSettings (real IDB query, eager-loaded in initCommon) | Yes (subject to GAP-3 race) | FLOWING (with race) |
| Section-selection dialog    | EXPORT_SECTION_ORDER + cache | App.isSectionEnabled + App.getSectionLabel + sectionHasData | Yes              | FLOWING     |
| buildSessionMarkdown output | DOM input values + cache  | document.getElementById(...).value + getSectionLabel  | Yes                | FLOWING     |
| Export → PDF blob           | editor.value              | textarea content → PDFExport.buildSessionPDF          | **No (PDFExport undefined)** | **DISCONNECTED** |
| Export → MD blob            | editor.value              | textarea content → Blob('text/markdown')              | Yes                | FLOWING (fallback path) |
| Backup ZIP therapistSettings field | allTherapistSettings | PortfolioDB.getAllTherapistSettings                  | Yes                | FLOWING     |

### Behavioral Spot-Checks

| Behavior                                                                | Command                                                                                                              | Result   | Status   |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| All Phase 22 JS files parse                                             | `node -c assets/{settings,pdf-export,md-render,add-session,app,db,backup}.js sw.js`                                  | All pass | PASS     |
| `window.PDFExport` registered when add-session.html is loaded           | `grep -E 'src="\\./assets/pdf-export\\.js"' add-session.html`                                                          | (no match) | **FAIL** |
| 9 section wrappers in add-session.html                                  | `grep -c 'data-section-key=' add-session.html`                                                                        | 9        | PASS     |
| 9 disabled-indicator-badge spans in add-session.html                    | `grep -c 'class="disabled-indicator-badge is-hidden"' add-session.html`                                              | 9        | PASS     |
| All 4 i18n bundles include settings.banner.* keys                       | grep across 4 files                                                                                                  | 3 each   | PASS     |
| Zero "Translate" / google translate residue in code                     | `grep -ci 'translate' assets/i18n-*.js`                                                                              | 0 each   | PASS     |
| SW CACHE_NAME bumped past v26 baseline                                  | `grep "CACHE_NAME" sw.js`                                                                                            | v53      | PASS     |
| New IDB DB_VERSION = 4 with additive migration                          | `grep "DB_VERSION = 4" assets/db.js && grep "createObjectStore..therapistSettings" assets/db.js`                     | both     | PASS     |
| App.initCommon() async signature                                        | `grep "async function initCommon" assets/app.js`                                                                     | 1        | PASS     |
| All initCommon callers await it                                         | `grep -E "await App\\.initCommon" assets/{add-session,settings,sessions,reporting,overview}.js \| wc -l`            | 0        | **FAIL** |

### Requirements Coverage

| Requirement | Source Plan | Description (from SPEC)                                                                       | Status     | Evidence                                                       |
| ----------- | ---------- | --------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------- |
| REQ-1       | 22-04, 22-08 | Settings page exists; reachable from app navigation                                          | SATISFIED  | settings.html + gear icon mount                                |
| REQ-2       | 22-02, 22-04 | 6 free-text sections renameable; 3 (HS toggle / Issues / Info-Next) disable-only             | SATISFIED  | LOCKED_RENAME set + renderRow input.disabled = true            |
| REQ-3       | 22-02, 22-04 | Per-row reset to default i18n                                                                 | SATISFIED  | resetBtn handler + reset-disabled state when no override       |
| REQ-4       | 22-02, 22-04 | Sections disable-able from Settings; new-session form respects flag                          | SATISFIED  | applySectionVisibility(false) hides on new sessions            |
| REQ-5       | 22-06        | Past-session disabled-but-populated sections render as fully editable + badge                | SATISFIED  | applySectionVisibility(true) branch lines 752-762             |
| REQ-6       | 22-02, 22-04 | Disable→re-enable preserves stored data                                                       | SATISFIED  | Disable writes flag only; storage keys unchanged              |
| REQ-7       | 22-06        | Export button + clipboard button renamed "Copy session text"                                 | SATISFIED  | add-session.html:52-59 + i18n session.copyAll updated         |
| REQ-8       | 22-06        | Section-selection dialog with client-safe defaults                                            | SATISFIED  | EXPORT_DEFAULT_CHECKED + heartShieldEmotions data gate        |
| REQ-9       | 22-06        | Disabled sections greyed + unselectable in dialog                                            | SATISFIED  | exportRenderStep1Rows applies is-disabled + cb.disabled       |
| REQ-10      | 22-05, 22-06 | Document header auto-populates                                                                | SATISFIED  | getCurrentSessionDataForExport packs all 4 fields              |
| REQ-11      | 22-06        | Custom labels appear in dialog + document                                                     | SATISFIED  | App.getSectionLabel used in both                               |
| REQ-12      | 22-03, 22-06 | Editable preview                                                                              | SATISFIED  | Step 2 textarea + MdRender.render preview                     |
| REQ-13      | 22-01, 22-05 | PDF download (CRITICAL)                                                                       | **BLOCKED** | window.PDFExport never registered — GAP-1                     |
| REQ-14      | 22-06        | Plain-text file download                                                                      | SATISFIED  | exportHandleDownloadMd with inline fallback                   |
| REQ-15      | 22-06        | Web Share API integration                                                                     | **BLOCKED** | exportHandleShare requires PDFExport — GAP-2                  |
| ~~REQ-16~~  | (removed)  | Translate shortcut                                                                            | REMOVED    | Zero translate keys / DOM elements / google.com refs verified |
| REQ-17      | 22-02       | All new strings translated                                                                    | SATISFIED  | All keys present in en/de/he/cs once per file                  |
| REQ-18      | 22-07        | Backup roundtrip + pre-22 backward-compat                                                     | SATISFIED  | Whitelist + type coerce + empty-array fallback                |
| REQ-19      | 22-06        | "Copy Session" honors custom labels                                                           | SATISFIED  | buildSessionMarkdown threads getSectionLabel through 9 keys    |
| REQ-20      | 22-08        | SW precaches new Settings page + assets                                                       | SATISFIED  | v53 + 6 new URLs + /settings HTML route                       |
| REQ-21      | 22-02, 22-04 | Up-front warnings: sticky banner + first-disable confirm dialog                              | PARTIAL    | Banner + dialog wired correctly; OK button styling is "danger" red — contradicts intent (GAP-4) |

### Anti-Patterns Found (cross-reference with REVIEW.md)

| File                          | Line       | Pattern                                                       | Severity   | Impact                                                                 |
| ----------------------------- | ---------- | ------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| assets/add-session.js         | 9          | `App.initCommon()` not awaited                                | Blocker (GAP-3) | Race condition affecting REQ-3/REQ-5 acceptance                       |
| assets/settings.js            | 397        | `App.initCommon()` not awaited                                | Blocker (GAP-3) | First Settings render may use empty cache                              |
| assets/{sessions,reporting,overview}.js | 2,2,54 | `App.initCommon()` not awaited                                | Blocker (GAP-3) | Same race on other app pages                                          |
| add-session.html              | (missing)  | No `<script src="./assets/pdf-export.js">`                    | Blocker (GAP-1) | window.PDFExport undefined — REQ-13 + REQ-15 fail silently             |
| settings.html                 | 93         | `<button class="button danger" id="confirmOkBtn">`            | Warning (GAP-4) | First-disable confirm reads "Yes, disable" in red — contradicts REQ-21 intent |
| assets/pdf-export.js          | 174-183    | Silent no-op if Noto base64 globals missing (REVIEW WR-02)    | Warning (info-level) | "PDF generation failed" toast with no diagnostic if font corrupt — affects Hebrew users |
| assets/settings.js            | 351-355    | BroadcastChannel close immediately after postMessage (WR-03)  | Info       | Cross-tab refresh may drop on older Firefox/Safari                     |
| assets/add-session.js         | 905        | `container.innerHTML = ""` instead of `.textContent = ""` (WR-04) | Info     | Cosmetic — empty-string assignment is functionally safe; contract violation |
| assets/{db,backup,settings,add-session,app,pdf-export}.js | 40+ sites | `console.warn`/`console.error` in production paths (IN-06) | Info       | Consistent with codebase style; not a regression                      |

### Human Verification Required

See `human_verification:` in frontmatter — 6 items routed to human testing (RTL visual, Hebrew PDF, 375px mobile, pre-22 backup restore, PWA upgrade path, Demo mode IDB isolation).

### Gaps Summary

**Group 1 — PDF/Share blocked by missing script tag (GAP-1, GAP-2):** This is a single root cause that blocks two requirements. Adding `<script src="./assets/pdf-export.js"></script>` to `add-session.html` (in the footer scripts block, after `md-render.js` and before `add-session.js`) registers `window.PDFExport` synchronously at parse time, after which all three PDFExport-consuming code paths (Download PDF, Download MD's slugify path, Share) work as designed. The pdf-export.js module itself is correct — it lazy-loads jsPDF + 2 fonts on first `buildSessionPDF` call. The bug is purely the host script tag never being added; this slipped through Plan 22-06 (which added md-render.js but not pdf-export.js) and Plan 22-08 (which added pdf-export.js to the SW precache list but not to the HTML).

**Group 2 — initCommon race (GAP-3):** REVIEW WR-01. One `await` per call site (5 sites) closes this. All 5 callers are already inside `async () => { ... }` handlers, so the fix is mechanical and risk-free.

**Group 3 — Confirm dialog tone (GAP-4):** REVIEW IN-02 elevated to a partial gap because REQ-21's user-facing intent ("This won't delete existing data") is contradicted by the red OK button. Lowest-priority of the four gaps; can be deferred to a polish todo without breaking goal.

Once GAP-1 + GAP-2 close (single one-line fix) and GAP-3 closes (5 `await` keywords), Phase 22 delivers its full goal. GAP-4 is cosmetic and can ship as a known limitation with a follow-up todo. Hebrew RTL + 375px mobile + PWA upgrade path verifications need a human (Sapir) after the fixes deploy.

---

_Verified: 2026-05-06T17:45:28Z_
_Verifier: Claude (gsd-verifier)_
