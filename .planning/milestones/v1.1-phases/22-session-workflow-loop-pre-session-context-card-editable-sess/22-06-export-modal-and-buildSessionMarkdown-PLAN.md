---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 06
type: execute
wave: 3
depends_on:
  - 02   # Needs App.getSectionLabel, App.isSectionEnabled, i18n keys
  - 03   # Needs window.MdRender for preview pane
  - 05   # Needs window.PDFExport for Download PDF
files_modified:
  - add-session.html
  - assets/add-session.js
  - assets/app.css
  - assets/i18n-en.js
  - assets/i18n-de.js
  - assets/i18n-he.js
  - assets/i18n-cs.js
autonomous: true
requirements:
  - REQ-5    # Past sessions render disabled-but-populated sections as fully editable (amended 2026-04-28; was: read-only with indicator)
  - REQ-7    # Export action button on session edit page; clipboard button renamed "Copy session text" (amended 2026-04-28)
  - REQ-8    # Section-selection dialog with client-safe defaults
  - REQ-9    # Disabled sections appear greyed in export dialog
  - REQ-10   # Document header auto-populates (consumed by PDFExport)
  - REQ-11   # Custom labels appear in exported document
  - REQ-12   # Editable preview before final export
  - REQ-14   # Plain-text file download — button label "Download as text file" (amended 2026-04-28)
  - REQ-15   # Web Share API integration where supported
  # REQ-16 REMOVED 2026-04-28 — Translate shortcut dropped (modal makes zero outbound calls)
  - REQ-17   # All export strings translated en/de/he/cs
  - REQ-19   # buildSessionMarkdown reads custom labels
user_setup: []

# ============================================================
# Amendment 2026-04-28 — post-Sapir-review tightening
# ============================================================
# This is the heaviest plan affected by the amendments. Five edits
# the executor MUST fold into the original task content:
#
# 1. REQ-16 (Translate) is REMOVED. Drop everywhere:
#    - The Translate button HTML (`<a id="exportTranslateBtn" …>`) in
#      Step 2 markup → DELETE the element.
#    - The wireTranslateButton() function in assets/add-session.js →
#      DO NOT IMPLEMENT.
#    - The call site `wireTranslateButton();` near `openExportDialog`
#      → DO NOT EMIT.
#    - The 4 i18n key blocks: do NOT add `export.translate.cta` or
#      `export.translate.tooltip` to any of i18n-{en,de,he,cs}.js.
#    - The grep `grep -q "translate.google.com"` in the verify
#      automated check → REMOVE that conjunct from the chain.
#    - The acceptance criterion line "File contains `translate.google.com`
#      URL" → REMOVE it.
#    - Threat T-22-06-03 (Tampering / open-redirect) becomes N/A
#      because there is no Translate href; mark it as REMOVED but keep
#      the row so threat IDs remain stable.
#    - The manual smoke "Translate opens new tab" line → REMOVE it.
#
# 2. Plain-text download card relabeling (REQ-14 amendment):
#    - The original i18n key plan added `export.download.md` with
#      string "Download Markdown" / "Markdown herunterladen" / etc.
#      That key is RENAMED to `export.download.text` and the strings
#      become "Download as text file" / "Als Textdatei herunterladen"
#      / "הורד כקובץ טקסט" / "Stáhnout jako textový soubor".
#    - The card's `data-i18n` attribute changes from
#      `export.download.md` to `export.download.text`.
#    - The file extension on disk REMAINS `.md` (Markdown content
#      opens correctly as plain text in any editor).
#    - In the JS handler, the variable name and the Blob mime type
#      do not need to change; only the user-visible label changes.
#
# 3. Clipboard button rename (REQ-7 amendment):
#    - The existing button keeps its DOM id `copySessionBtn` and i18n
#      key `session.copyAll`. The rendered string changes from
#      "Copy Session (MD)" → "Copy session text". This change lives
#      in Plan 22-02 (i18n files), NOT here. In THIS plan, do NOT
#      modify the button markup beyond what's already specified;
#      the data-i18n attribute already points to `session.copyAll`.
#
# 4. REQ-5 amendment — disabled-but-populated past-session sections
#    are FULLY EDITABLE, not read-only:
#    - The original task suggested "render with indicator (read-only)
#      so therapist can read but not edit". That is wrong now.
#    - The new behavior in `applySectionVisibility()`:
#       a) section enabled?            → show, editable (always was)
#       b) section disabled, no data?  → hide
#       c) section disabled, has data? → show, editable (NEW —
#                                        do NOT add `disabled` /
#                                        `readonly` attributes;
#                                        do append the
#                                        `Disabled in Settings`
#                                        badge to the section heading)
#    - The "has data" check should run AFTER the form has loaded the
#      stored values from the session record. For text fields:
#      `el.value && el.value.trim().length > 0`. For the issues
#      array: `Array.isArray(issues) && issues.length > 0`. For the
#      Heart Shield toggle: `record.heartShield === true`.
#    - On save, when a section that was disabled-with-data becomes
#      empty (therapist cleared it), do not strip it from the record
#      — IndexedDB write writes whatever the form contains. On NEXT
#      open, applySectionVisibility's "has data" check returns false
#      and the section auto-hides. This is the desired behavior.
#
# 5. Demo mode (D-23) — no change in this plan. The Export button,
#    modal, PDF, MD, Share all work in Demo mode against the demo
#    IndexedDB. No demo-specific guards.
#
# Acceptance grep update (Task 4 / Task on i18n):
#   - Add `export.download.text` to the grep list in the per-language
#     check; remove `export.download.md`, `export.translate.cta`,
#     `export.translate.tooltip`.
#   - Add a negative-grep: the literal string "translate.google.com"
#     must NOT appear anywhere in assets/add-session.js or i18n-*.js.
# ============================================================

must_haves:
  truths:
    - "Each session form section in add-session.html is wrapped in <div class=\"session-section\" data-section-key=\"...\"> for hide/show + indicator"
    - "When App.isSectionEnabled(key) is false: in NEW-session mode, the section is hidden; when opening any past session (REQ-5 amended 2026-04-28), if the section has stored data it renders as a fully editable input (NOT read-only) with a 'Disabled in Settings' badge appended to the heading; once data is cleared and saved the section is hidden on next open"
    - "buildSessionMarkdown emits section headings via App.getSectionLabel(key, defaultI18nKey) — never hardcoded App.t for section labels"
    - "An Export button appears next to the existing clipboard button on the session edit page in read mode; the clipboard button's i18n key (session.copyAll) is unchanged but its rendered value is the new 'Copy session text' string set by Plan 22-02"
    - "Clicking Export opens a 3-step modal (Step 1 section selection → Step 2 editable preview → Step 3 output actions)"
    - "Step 1: checkboxes for enabled sections with client-safe defaults (Trapped, Physical, Limiting Beliefs, Additional Tech, HS Emotions if data, Next Session pre-checked; Issues, Comments, HS Removed pre-unchecked); disabled sections appear greyed with 'Disabled in Settings' tooltip"
    - "Step 2: side-by-side textarea + live preview on desktop (≥769px), tabbed Edit/Preview on mobile (≤768px); NO Translate button (REQ-16 removed 2026-04-28)"
    - "Step 3: Output cards for Download PDF, Download as text file (file extension stays .md, label drops MD/Markdown jargon), and (if navigator.canShare with files) Share via device"
    - "Modal inherits Phase 21 contract: max-height: 90dvh, scroll body, pinned actions, body-scroll-lock, overlay-close discard-confirm"
    - "The literal string 'translate.google.com' does NOT appear anywhere in add-session.js or in any i18n-*.js file (REQ-16 removed 2026-04-28)"
    - "Markdown download uses Blob([editedMarkdown], {type: 'text/markdown;charset=utf-8'})"
    - "Web Share API call: navigator.share({files: [pdfFile], title, text}) — gated by canShare({files}); silently absent on unsupported browsers"
    - "Export modal preview pane uses MdRender.render(textarea.value); sets via .innerHTML (safe — MdRender escapes)"
    - "All new export strings exist in en/de/he/cs"
  artifacts:
    - path: "add-session.html"
      provides: "9 session-section wrappers with data-section-key, Export button, Export modal markup, md-render.js script tag"
      contains: "data-section-key"
    - path: "assets/add-session.js"
      provides: "buildSessionMarkdown reads App.getSectionLabel, conditional section render with editable disabled-but-populated fallback (REQ-5 amended), openExportDialog handler, Step 1/2/3 wiring, plain-text-file download, PDF download, Share. NO Translate (REQ-16 removed 2026-04-28)"
      contains: "App.getSectionLabel"
    - path: "assets/app.css"
      provides: ".export-card, .export-step-indicator, .export-output-card, .export-section-row.is-disabled CSS additions"
      contains: ".export-step-indicator"
    - path: "assets/i18n-en.js"
      provides: "Export modal i18n keys (en) per UI-SPEC"
    - path: "assets/i18n-de.js"
    - path: "assets/i18n-he.js"
    - path: "assets/i18n-cs.js"
  key_links:
    - from: "assets/add-session.js Export button"
      to: "openExportDialog"
      via: "click handler"
      pattern: "exportSessionBtn"
    - from: "assets/add-session.js openExportDialog Step 3"
      to: "window.PDFExport.buildSessionPDF"
      via: "await on Download PDF click"
      pattern: "PDFExport\\.buildSessionPDF"
    - from: "assets/add-session.js openExportDialog Step 2"
      to: "window.MdRender.render"
      via: "live preview update"
      pattern: "MdRender\\.render"
    - from: "assets/add-session.js buildSessionMarkdown"
      to: "App.getSectionLabel"
      via: "every section heading"
      pattern: "App\\.getSectionLabel"
---

<objective>
Wire Feature B end-to-end on the session edit page: a 3-step export modal that respects therapist Settings and produces PDF + Markdown + Share. Also closes Feature A's render side: section render is gated by App.isSectionEnabled and `buildSessionMarkdown` reads via App.getSectionLabel (the SPEC-required single label-resolution layer).

Purpose: This is the largest single plan in the phase because the Export modal flow + the section-render rewiring are co-located and share the same set of files. Splitting them would force two passes over add-session.html / add-session.js.

Output: add-session.html with section wrappers + Export button + Export modal markup; add-session.js with custom-label rendering, conditional section render, and the 3-step Export flow; CSS + i18n additions.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md
@add-session.html
@assets/add-session.js
@assets/app.css
@assets/i18n-en.js
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-02-db-migration-app-cache-i18n-PLAN.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-03-md-render-utility-PLAN.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-05-pdf-export-module-PLAN.md

<interfaces>
APIs consumed:
  App.getSectionLabel(sectionKey, defaultI18nKey) → string  (Plan 02)
  App.isSectionEnabled(sectionKey) → boolean                 (Plan 02)
  App.confirmDialog({titleKey, messageKey, ...})             (existing)
  App.showToast(text, key)                                   (existing)
  App.lockBodyScroll() / App.unlockBodyScroll()              (existing)
  App.t(key)                                                 (existing)
  PortfolioDB.getSession(id)                                 (existing)
  window.MdRender.render(markdown)                           (Plan 03)
  window.PDFExport.buildSessionPDF(sessionData, opts)        (Plan 05)
  window.PDFExport.slugify(name)                             (Plan 05)
  window.PDFExport.triggerDownload(blob, filename)           (Plan 05)
  navigator.canShare({files}), navigator.share({files,title,text})

Section enable defaults for Step 1 checkboxes (REQ-8):
  Pre-checked: trapped, insights, limitingBeliefs, additionalTech, heartShieldEmotions (only if data present), nextSession
  Pre-unchecked: issues, comments, heartShield (the "Was Heart Shield removed?" status flag)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wrap section markup in add-session.html with data-section-key + add Export button + add Export modal markup + add md-render.js script tag</name>
  <files>add-session.html</files>
  <read_first>
    - add-session.html (full file — sections at lines 206-296; .session-header-actions at lines 51-59; #confirmModal at 352-362; footer scripts at 438-450)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (sections "add-session.html (modified)" + "Pattern 6 — Modal scaffolding")
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (Export Dialog layout, Step 1/2/3 markup hints, Output card spec)
  </read_first>
  <action>
    Make THREE modifications to add-session.html:

    A. Wrap each session-form section in a `<div class="session-section" data-section-key="...">` element. Identify the 9 sections and wrap them. The data-section-key values must match exactly:
         trapped, insights, limitingBeliefs, additionalTech, heartShield, heartShieldEmotions, issues, comments, nextSession
       Inside each wrapper, also add an empty indicator badge that JS will toggle:
         <span class="disabled-indicator-badge is-hidden" data-i18n="settings.indicator.disabled">Disabled in Settings</span>
       Place the badge immediately after the existing section heading element so flex flow keeps it inline.

    B. Add the Export button to .session-header-actions (currently at lines 51-59). Insert AFTER the existing #copySessionBtn, BEFORE the existing #editSessionBtn:

         <button class="button icon-inline is-hidden" type="button" id="exportSessionBtn">
           <span class="button-label" data-i18n="session.export">Export</span>
           <span class="button-icon" aria-hidden="true">&#128228;</span>
         </button>

       Note: Copy Session (MD) keeps the .ghost class (becomes secondary action). Export uses .button (primary). Order: Copy MD (ghost) → Export (primary) → Edit (icon-button). Both the Copy MD and Export buttons share the existing is-hidden / read-mode visibility gate, so add the same `is-hidden` class on initial render — add-session.js Task 2 will toggle them together.

    C. Add the Export modal markup AFTER the existing #confirmModal block (around line 362). Use the modal-card / modal-overlay scaffold from Pattern 6. The internal structure has step containers that JS toggles via .is-active class:

         <div id="exportModal" class="modal is-hidden" role="dialog" aria-modal="true" aria-labelledby="exportTitle">
           <div class="modal-overlay"></div>
           <div class="modal-card export-card">
             <button class="modal-close" type="button" id="exportClose" aria-label="Close"></button>
             <h3 id="exportTitle" class="modal-title" data-i18n="export.title">Export Session</h3>

             <div class="export-step-indicator" role="progressbar" aria-valuemin="1" aria-valuemax="3" aria-valuenow="1">
               <span class="export-step-dot" data-step="1">1</span>
               <span class="export-step-connector"></span>
               <span class="export-step-dot" data-step="2">2</span>
               <span class="export-step-connector"></span>
               <span class="export-step-dot" data-step="3">3</span>
             </div>

             <div class="modal-card-body">
               <!-- Step 1 -->
               <div class="export-step is-active" data-step="1">
                 <p data-i18n="export.step1.helper">Choose which sections to include.</p>
                 <div id="exportStep1Rows"></div>
               </div>

               <!-- Step 2 -->
               <div class="export-step" data-step="2">
                 <div class="export-edit-area">
                   <textarea id="exportEditor" class="textarea export-editor" dir="auto" spellcheck="true"></textarea>
                   <div id="exportPreview" class="export-preview"></div>
                 </div>
                 <div class="export-mobile-tabs is-hidden" role="tablist">
                   <button type="button" class="tab-btn is-active" data-tab="edit" data-i18n="export.tab.edit">Edit</button>
                   <button type="button" class="tab-btn" data-tab="preview" data-i18n="export.tab.preview">Preview</button>
                 </div>
                 <!-- Translate-via-Google CTA REMOVED 2026-04-28 (REQ-16 dropped). Do NOT add this anchor element. -->
               </div>

               <!-- Step 3 -->
               <div class="export-step" data-step="3">
                 <p data-i18n="export.step3.helper">Choose how to deliver the document.</p>
                 <button type="button" class="export-output-card" id="exportDownloadPdf">
                   <span class="output-card-icon" aria-hidden="true">📄</span>
                   <span class="output-card-text">
                     <span class="output-card-title" data-i18n="export.download.pdf">Download PDF</span>
                     <span class="output-card-subtitle" id="exportPdfSubtitle"></span>
                   </span>
                 </button>
                 <button type="button" class="export-output-card" id="exportDownloadMd">
                   <!-- Renamed 2026-04-28: card label drops "Markdown" jargon. DOM id stays "exportDownloadMd" so the JS handler need not change. File extension on disk stays .md. -->
                   <span class="output-card-icon" aria-hidden="true">📝</span>
                   <span class="output-card-text">
                     <span class="output-card-title" data-i18n="export.download.text">Download as text file</span>
                     <span class="output-card-subtitle" id="exportMdSubtitle"></span>
                   </span>
                 </button>
                 <button type="button" class="export-output-card is-hidden" id="exportShare">
                   <span class="output-card-icon" aria-hidden="true">↗</span>
                   <span class="output-card-text">
                     <span class="output-card-title" data-i18n="export.share">Share via device</span>
                     <span class="output-card-subtitle" data-i18n="export.share.subtitle">Open share sheet (PDF attached)</span>
                   </span>
                 </button>
               </div>
             </div>

             <div class="modal-card-actions export-actions">
               <button type="button" class="button ghost" id="exportBackBtn" data-i18n="export.back">Back</button>
               <button type="button" class="button" id="exportNextBtn" data-i18n="export.next1">Next: Edit document</button>
             </div>
           </div>
         </div>

    D. Add `<script src="./assets/md-render.js"></script>` to the footer scripts block, BEFORE `<script src="./assets/add-session.js"></script>`. Do NOT add jspdf or pdf-export.js as static script tags — they are lazy-loaded by add-session.js (Task 2) on first Export click.

    Do NOT modify any other markup on the page.
  </action>
  <verify>
    <automated>grep -cE 'data-section-key="(trapped|insights|limitingBeliefs|additionalTech|heartShield|heartShieldEmotions|issues|comments|nextSession)"' add-session.html | awk '$1 < 9 { print "FAIL_section_keys"; exit 1 } { print "ok_keys" }' && grep -q 'id="exportSessionBtn"' add-session.html && grep -q 'id="exportModal"' add-session.html && grep -q 'id="exportEditor"' add-session.html && grep -q 'id="exportPreview"' add-session.html && grep -q 'id="exportDownloadPdf"' add-session.html && grep -q 'id="exportDownloadMd"' add-session.html && grep -q 'id="exportShare"' add-session.html && grep -q 'src="./assets/md-render.js"' add-session.html && grep -c 'class="disabled-indicator-badge is-hidden"' add-session.html | awk '$1 < 9 { print "FAIL_badges"; exit 1 } { print "ok_badges" }'</automated>
  </verify>
  <acceptance_criteria>
    - All 9 sections wrapped: `grep -E 'data-section-key="(trapped|insights|limitingBeliefs|additionalTech|heartShield|heartShieldEmotions|issues|comments|nextSession)"' add-session.html` returns 9 distinct matches (one per key)
    - All 9 sections have a `<span class="disabled-indicator-badge is-hidden" data-i18n="settings.indicator.disabled">` element inside their wrapper
    - `#exportSessionBtn` exists with `data-i18n="session.export"` AND `is-hidden` class
    - `#exportModal` exists with `role="dialog"` and `aria-modal="true"` and class `modal is-hidden`
    - Modal contains `#exportEditor` (textarea), `#exportPreview` (div), `#exportDownloadPdf`, `#exportDownloadMd`, `#exportShare` (initially is-hidden). NO `#exportTranslateBtn` (REQ-16 removed 2026-04-28). Verify with: `! grep -q 'exportTranslateBtn' add-session.html`.
    - Modal contains `.export-step-indicator` with `role="progressbar"` and 3 `.export-step-dot` elements
    - Modal contains 3 `.export-step` containers with data-step="1", "2", "3"; only step 1 has `is-active`
    - `<script src="./assets/md-render.js">` appears before `<script src="./assets/add-session.js">` in the footer scripts block
    - `<script src="./assets/jspdf.min.js">` is NOT in add-session.html (lazy-loaded only)
  </acceptance_criteria>
  <done>add-session.html exposes the data-section-key wrappers, Export button, full Export modal markup, and md-render.js script tag. No jsPDF eager load.</done>
</task>

<task type="auto">
  <name>Task 2: Update assets/add-session.js — buildSessionMarkdown reads App.getSectionLabel, conditional section render, openExportDialog 3-step flow</name>
  <files>assets/add-session.js</files>
  <read_first>
    - assets/add-session.js (full file — buildSessionMarkdown at lines 596-681; copySessionBtn handler at lines 708-714; isReadMode toggling at lines 124-ish; existing modal close patterns)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (section "assets/add-session.js (modified)")
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (Export Dialog Step 1/2/3 details, mobile breakpoint 768/480)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md (D-17, D-18, D-19, D-20)
  </read_first>
  <action>
    Apply five changes to assets/add-session.js:

    A. Inside buildSessionMarkdown (lines 596-681), replace EVERY hardcoded App.t call for a section heading with App.getSectionLabel. The mapping (sectionKey, i18nKey):
         trapped              → session.form.trapped
         insights             → session.form.insights
         limitingBeliefs      → session.form.limitingBeliefs
         additionalTech       → session.form.additionalTech
         heartShield          → session.form.heartShield
         heartShieldEmotions  → session.form.heartShieldEmotions
         issues               → session.form.issuesHeading
         comments             → session.form.comments
         nextSession          → session.form.nextSession

       Each replacement looks like:
         BEFORE: lines.push("", `## ${stripRequired(App.t("session.form.trapped"))}`, trappedValue);
         AFTER:  lines.push("", `## ${stripRequired(App.getSectionLabel("trapped", "session.form.trapped"))}`, trappedValue);

       Apply this transformation to every section heading emit site within buildSessionMarkdown. Do NOT change any data-key lookups (they remain trappedEmotions, etc.) — only the human-readable heading.

    B. Add a helper function `applySectionVisibility(isPastSession)` near the top-level closure of the page controller. It walks every `[data-section-key]` element and:
       - Reads sectionKey from data-attribute.
       - Calls App.isSectionEnabled(sectionKey).
       - Reads whether the section has stored data (look up the corresponding form field's current value or the loaded session data; for the issues array, check >0 items; for heartShield, check the toggle/conditional).
       - Hide rules (REQ-5 amended 2026-04-28 — disabled-but-populated past sessions render as FULLY EDITABLE, not read-only):
           enabled === true: section visible, badge hidden, all inputs editable as normal.
           enabled === false AND isPastSession === false: section hidden (.is-hidden class). NEW sessions hide disabled sections.
           enabled === false AND isPastSession === true AND hasData === true: section visible, badge visible. **All inputs remain fully editable** — DO NOT add `disabled` or `readonly` attributes. The therapist can edit or clear the value. On next save, when the value is empty, the section will hide automatically on the next open.
           enabled === false AND isPastSession === true AND hasData === false: section hidden.

       Call applySectionVisibility(isPastSession) after:
         - Initial load (after PortfolioDB.getSession resolves and form is populated).
         - Mode toggles (any UI mode change that re-applies visibility).
         - document.dispatchEvent app:settings-changed (cross-tab settings save).

       Add: document.addEventListener("app:settings-changed", () => applySectionVisibility(currentlyOnPastSession));

    C. Toggle visibility of the Export button next to Copy MD. Wherever the existing copySessionBtn is toggled (look for `copySessionBtn.classList.toggle("is-hidden", !isReadMode)` around line 124), add the matching line for exportSessionBtn:
         var exportSessionBtn = document.getElementById("exportSessionBtn");
         if (exportSessionBtn) exportSessionBtn.classList.toggle("is-hidden", !isReadMode);

    D. Wire the Export button click handler. Add near the existing copySessionBtn click handler (lines 708-714):

         var exportSessionBtn = document.getElementById("exportSessionBtn");
         if (exportSessionBtn) {
           exportSessionBtn.addEventListener("click", function () {
             openExportDialog();
           });
         }

    E. Implement openExportDialog() — the 3-step modal controller. Sketch:

         var EXPORT_DEFAULT_CHECKED = {
           trapped: true, insights: true, limitingBeliefs: true, additionalTech: true,
           heartShieldEmotions: true,  // only if data present (check at render)
           nextSession: true,
           issues: false, comments: false, heartShield: false,
         };

         async function openExportDialog() {
           var modal = document.getElementById("exportModal");
           if (!modal) return;
           var currentStep = 1;
           var sessionData = getCurrentSessionDataForExport();  // pulls from current page state
           var hasEditedPreview = false;
           var initialMarkdown = buildSessionMarkdown();

           // Render Step 1 rows
           renderStep1Rows(sessionData);
           // Show step 1, hide 2 + 3
           setActiveStep(1);

           modal.classList.remove("is-hidden");
           App.lockBodyScroll();

           wireStep1NextButton();
           wireStep2NextButton();
           wireBackButton();
           wireCloseAndOverlay(/* discard-confirm if hasEditedPreview */);
           wireMobileTabs();
           wireDownloadPdf(sessionData);
           wireDownloadMd(sessionData);
           wireShare(sessionData);
           // wireTranslateButton() REMOVED 2026-04-28 — REQ-16 dropped.
         }

         function renderStep1Rows(sessionData) {
           var container = document.getElementById("exportStep1Rows");
           container.innerHTML = "";  // pre-existing static markup only — no user content
           var SECTIONS = ["trapped","insights","limitingBeliefs","additionalTech","heartShield","heartShieldEmotions","issues","comments","nextSession"];
           SECTIONS.forEach(function (key) {
             var enabled = App.isSectionEnabled(key);
             var label = App.getSectionLabel(key, getDefaultI18nKey(key));
             var hasData = sectionHasData(key, sessionData);
             var defaultChecked = !!EXPORT_DEFAULT_CHECKED[key];
             // heartShieldEmotions special: only checked if data present
             if (key === "heartShieldEmotions") defaultChecked = defaultChecked && hasData;

             var row = document.createElement("label");
             row.className = "export-section-row";
             if (!enabled) row.classList.add("is-disabled");
             // For !enabled: append a disabled-indicator-badge
             var cb = document.createElement("input");
             cb.type = "checkbox";
             cb.dataset.sectionKey = key;
             cb.checked = enabled ? defaultChecked : false;
             cb.disabled = !enabled;
             var labelSpan = document.createElement("span");
             labelSpan.textContent = label;  // textContent — never innerHTML
             row.appendChild(cb);
             row.appendChild(labelSpan);
             if (!enabled) {
               var badge = document.createElement("span");
               badge.className = "disabled-indicator-badge";
               badge.textContent = App.t("settings.indicator.disabled");
               row.appendChild(badge);
               row.title = App.t("settings.indicator.disabled");
             }
             container.appendChild(row);
           });
         }

         function buildEditableMarkdownFromSelection() {
           // Read step 1 checkbox state, rebuild markdown filtered to selected sections
           // by calling buildSessionMarkdown with a section filter argument (or post-filter
           // the full output by stripping unselected sections).
           // Header (auto-populated): client name + date + session type — use existing
           // sessionData metadata; this is the same as buildSessionMarkdown's header today.
         }

         function setActiveStep(n) {
           // Toggle .is-active on .export-step[data-step] and .export-step-dot[data-step]
           // Update aria-valuenow on .export-step-indicator
           // Show/hide step-1 vs step-2 vs step-3 layout
           // Update Next button label/handler:
           //   step 1 → "Next: Edit document" (i18n key export.next1)
           //   step 2 → "Next: Get document" (export.next2)
           //   step 3 → "Done" (export.done) — Done click closes modal
           // Show Back button starting at step 2; hide on step 1.
         }

         function updatePreview() {
           var ed = document.getElementById("exportEditor");
           var pv = document.getElementById("exportPreview");
           // MdRender.render escapes input; safe to assign via innerHTML.
           pv.innerHTML = window.MdRender.render(ed.value);
         }

         // Mobile tabs (≤768px): show .export-mobile-tabs; toggle .is-active on tabs;
         // Edit tab: textarea visible, preview hidden. Preview tab: textarea hidden, preview visible.
         // Use window.matchMedia("(max-width: 768px)") on modal open.

         function wireDownloadPdf(sessionData) {
           var btn = document.getElementById("exportDownloadPdf");
           btn.addEventListener("click", async function () {
             try {
               btn.disabled = true;
               var subtitle = document.getElementById("exportPdfSubtitle");
               if (subtitle) subtitle.textContent = App.t("export.preparing");
               var ed = document.getElementById("exportEditor");
               var blob = await window.PDFExport.buildSessionPDF({
                 clientName: sessionData.clientName,
                 sessionDate: sessionData.sessionDateFormatted,
                 sessionType: sessionData.sessionTypeLabel,
                 markdown: ed.value,
               }, {
                 uiLang: localStorage.getItem("portfolioLang") || "en",
                 onProgress: function (phase) { /* update subtitle text */ },
               });
               var fname = window.PDFExport.slugify(sessionData.clientName) + "_" + sessionData.sessionDateISO + ".pdf";
               window.PDFExport.triggerDownload(blob, fname);
             } catch (err) {
               console.error("PDF generation failed:", err);
               App.showToast("", "export.pdf.failed");
             } finally {
               btn.disabled = false;
             }
           });
         }

         function wireDownloadMd(sessionData) {
           var btn = document.getElementById("exportDownloadMd");
           btn.addEventListener("click", function () {
             var ed = document.getElementById("exportEditor");
             var blob = new Blob([ed.value], { type: "text/markdown;charset=utf-8" });
             var fname = window.PDFExport.slugify(sessionData.clientName) + "_" + sessionData.sessionDateISO + ".md";
             window.PDFExport.triggerDownload(blob, fname);
           });
         }

         function wireShare(sessionData) {
           var btn = document.getElementById("exportShare");
           if (typeof navigator.canShare !== "function") return;
           // Probe: build PDF first to check canShare with files
           btn.addEventListener("click", async function () {
             try {
               btn.disabled = true;
               var ed = document.getElementById("exportEditor");
               var blob = await window.PDFExport.buildSessionPDF({...}, {...});
               var file = new File([blob], window.PDFExport.slugify(sessionData.clientName) + "_" + sessionData.sessionDateISO + ".pdf", { type: "application/pdf" });
               if (!navigator.canShare({ files: [file] })) {
                 btn.classList.add("is-hidden");
                 return;
               }
               await navigator.share({
                 files: [file],
                 title: sessionData.clientName + " — " + sessionData.sessionDateFormatted,
                 text: App.t("export.share.text"),
               });
             } catch (err) {
               if (err && err.name === "AbortError") return;  // user cancelled
               console.error("Share failed:", err);
             } finally {
               btn.disabled = false;
             }
           });
           // Reveal Share button only if canShare-with-files is supported on this device.
           // Best-effort probe with a tiny dummy file at modal open:
           try {
             var probe = new File([new Blob(["x"], {type:"application/pdf"})], "x.pdf", {type:"application/pdf"});
             if (navigator.canShare({ files: [probe] })) btn.classList.remove("is-hidden");
           } catch (e) {}
         }

         // wireTranslateButton() function REMOVED 2026-04-28 — REQ-16 dropped.
         // The exportTranslateBtn DOM element no longer exists in the modal markup,
         // and assets/add-session.js MUST NOT reference translate.google.com anywhere.

         function wireCloseAndOverlay() {
           // Esc + overlay click + #exportClose click → if step 2 has edits, await App.confirmDialog with export.discard.* keys; else close.
           // On close: modal.classList.add("is-hidden"); App.unlockBodyScroll();
         }

         function getDefaultI18nKey(sectionKey) {
           switch (sectionKey) {
             case "trapped": return "session.form.trapped";
             case "insights": return "session.form.insights";
             case "limitingBeliefs": return "session.form.limitingBeliefs";
             case "additionalTech": return "session.form.additionalTech";
             case "heartShield": return "session.form.heartShield";
             case "heartShieldEmotions": return "session.form.heartShieldEmotions";
             case "issues": return "session.form.issuesHeading";
             case "comments": return "session.form.comments";
             case "nextSession": return "session.form.nextSession";
             default: return sectionKey;
           }
         }

       Implement getCurrentSessionDataForExport() to return:
         { clientName, sessionDateISO (YYYY-MM-DD), sessionDateFormatted (UI-language-formatted), sessionTypeLabel (already localized via existing App.formatSessionType) }

    Do NOT alter the Copy Session (MD) handler other than ensuring buildSessionMarkdown's edits in (A) flow through. Copy MD continues to call buildSessionMarkdown verbatim and copy to clipboard.
  </action>
  <verify>
    <automated>grep -cE 'App\.getSectionLabel\("(trapped|insights|limitingBeliefs|additionalTech|heartShield|heartShieldEmotions|issues|comments|nextSession)"' assets/add-session.js | awk '$1 < 8 { print "FAIL_label_calls"; exit 1 } { print "ok" }' && grep -q "function applySectionVisibility\|applySectionVisibility(" assets/add-session.js && grep -q "exportSessionBtn" assets/add-session.js && grep -q "openExportDialog" assets/add-session.js && grep -q "PDFExport.buildSessionPDF" assets/add-session.js && grep -q "MdRender.render" assets/add-session.js && grep -q "navigator.canShare" assets/add-session.js && grep -q "navigator.share" assets/add-session.js && ! grep -q "translate.google.com" assets/add-session.js && ! grep -q "exportTranslateBtn" assets/add-session.js && ! grep -q "wireTranslateButton" assets/add-session.js && grep -q "app:settings-changed" assets/add-session.js && node -c assets/add-session.js</automated>
  </verify>
  <acceptance_criteria>
    - At least 8 of 9 section labels call `App.getSectionLabel("KEY", "session.form.KEY")` in buildSessionMarkdown (note: heartShield is a toggle, not always rendered — 8 is the floor; 9 if all are emitted)
    - File contains `applySectionVisibility` function or equivalent visibility toggle logic; for past sessions, the function MUST render disabled-but-populated sections as fully editable inputs (no `disabled` / `readonly` attributes added; only the heading badge appended) per REQ-5 amendment 2026-04-28
    - File contains `exportSessionBtn` ref and click handler invoking `openExportDialog`
    - File contains `PDFExport.buildSessionPDF` call
    - File contains `MdRender.render` call (preview update)
    - File contains `navigator.canShare` and `navigator.share` calls
    - File does NOT contain `translate.google.com` (REQ-16 removed): `! grep -q "translate.google.com" assets/add-session.js`
    - File does NOT contain `exportTranslateBtn` or `wireTranslateButton`: `! grep -q "exportTranslateBtn\|wireTranslateButton" assets/add-session.js`
    - File listens for `app:settings-changed` event
    - File contains `URL.createObjectURL` (text-file blob download — via PDFExport.triggerDownload OR inline)
    - File parses: `node -c assets/add-session.js`
  </acceptance_criteria>
  <done>buildSessionMarkdown reads custom labels. Sections render conditionally; past sessions with disabled-but-populated sections show fully editable inputs + badge (REQ-5 amended). Export modal 3-step flow wired: Step 1 selection, Step 2 edit + preview (NO Translate), Step 3 PDF + Download-as-text-file + Share. Cross-tab settings updates re-apply visibility.</done>
</task>

<task type="auto">
  <name>Task 3: Append Export modal CSS to assets/app.css</name>
  <files>assets/app.css</files>
  <read_first>
    - assets/app.css (modal block ~1333-1373; .toggle-card ~934 area for hover lift; .heart-shield-conditional ~1650 for logical-property example)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (Export Dialog full layout: step indicator dot/connector, output card, side-by-side editor/preview, mobile tabs, greyed-disabled rows)
  </read_first>
  <action>
    Append a CSS block with the comment header `/* Phase 22 — Export modal */`. Required selectors:

      .export-card {
        inline-size: min(720px, 92vw);
      }
      .export-step-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        max-inline-size: 360px;
        margin: 0 auto 24px;
      }
      .export-step-dot {
        inline-size: 24px;
        block-size: 24px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        font-weight: 600;
        background: var(--color-surface-subtle);
        color: var(--color-text-muted);
      }
      .export-step-dot.is-active {
        background: var(--color-primary);
        color: var(--color-surface);
      }
      .export-step-dot.is-completed {
        background: var(--color-primary-soft);
        color: var(--color-primary-dark);
      }
      .export-step-connector {
        flex: 1;
        block-size: 1px;
        background: var(--color-border-soft);
      }
      .export-step-connector.is-completed {
        background: var(--color-primary);
      }

      .export-step { display: none; }
      .export-step.is-active { display: block; }

      .export-section-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 16px;
        min-block-size: 44px;
        cursor: pointer;
      }
      .export-section-row:hover {
        background: var(--color-surface-hover);
      }
      .export-section-row.is-disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .export-section-row.is-disabled input {
        pointer-events: none;
      }

      .export-edit-area {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
      }
      .export-editor {
        min-block-size: 240px;
        font-size: 1rem;
        line-height: 1.5;
        padding: 16px;
        border-radius: 16px;
        border: 1px solid var(--color-border);
      }
      .export-preview {
        min-block-size: 240px;
        padding: 16px;
        border: 1px solid var(--color-border-soft);
        border-radius: 16px;
        background: var(--color-surface);
        overflow-y: auto;
      }
      .export-preview h1 { font-size: 1.4rem; font-weight: 600; line-height: 1.25; margin-block-end: 8px; }
      .export-preview h2 { font-size: 1rem; font-weight: 600; border-block-end: 1px solid var(--color-border); margin-block: 16px 8px; padding-block-end: 4px; }
      .export-preview h3 { font-size: 0.875rem; font-weight: 600; margin-block: 16px 4px; }
      .export-preview p { font-size: 1rem; line-height: 1.5; }
      .export-preview ul { padding-inline-start: 24px; }

      .export-mobile-tabs {
        display: none;
        gap: 8px;
        margin-block-end: 16px;
      }
      .export-mobile-tabs .tab-btn {
        padding: 8px 16px;
        border-radius: 16px;
        min-block-size: 44px;
        background: var(--color-surface-toggle);
        border: 1px solid var(--color-border-soft);
      }
      .export-mobile-tabs .tab-btn.is-active {
        background: var(--color-primary-soft);
        color: var(--color-primary-dark);
        font-weight: 600;
      }

      .export-output-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        margin-block-end: 8px;
        border: 1px solid var(--color-border);
        border-radius: 16px;
        background: var(--color-surface);
        min-block-size: 64px;
        inline-size: 100%;
        text-align: start;
        cursor: pointer;
      }
      .export-output-card:hover {
        background: var(--color-surface-hover);
        transform: translateY(-1px);
        box-shadow: var(--shadow-button);
      }
      .output-card-icon {
        font-size: 24px;
        color: var(--color-primary-dark);
      }
      .output-card-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .output-card-title {
        font-size: 0.875rem;
        font-weight: 600;
      }
      .output-card-subtitle {
        font-size: 0.85rem;
        font-weight: 400;
        color: var(--color-text-muted);
      }

      @media (min-width: 769px) {
        .export-edit-area {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 768px) {
        .export-edit-area {
          grid-template-columns: 1fr;
        }
        .export-mobile-tabs {
          display: inline-flex;
        }
        .export-step-dot {
          /* indicator labels could be hidden on mobile if added — currently no labels */
        }
      }

    Same rules as Plan 04 Task 3:
    - Tokens only, no hex literals.
    - On-scale spacing only (4, 8, 16, 24, 32, 48, 64).
    - Logical properties only.
    - 44px tap target floor inherits from existing global rule.
  </action>
  <verify>
    <automated>grep -q "Phase 22 — Export modal" assets/app.css && grep -q "\.export-step-indicator\s*{" assets/app.css && grep -q "\.export-step-dot\s*{" assets/app.css && grep -q "\.export-output-card\s*{" assets/app.css && grep -q "\.export-section-row\.is-disabled" assets/app.css && grep -q "\.export-mobile-tabs" assets/app.css && ! grep -A 200 "Phase 22 — Export modal" assets/app.css | grep -E "padding-(left|right):|margin-(left|right):"</automated>
  </verify>
  <acceptance_criteria>
    - assets/app.css contains `/* Phase 22 — Export modal */` comment
    - Selectors present: .export-card, .export-step-indicator, .export-step-dot, .export-step-dot.is-active, .export-step-connector, .export-step.is-active, .export-section-row, .export-section-row.is-disabled, .export-edit-area, .export-editor, .export-preview, .export-mobile-tabs, .export-output-card
    - Within Phase 22 Export block, no `padding-left/padding-right/margin-left/margin-right` (negative grep)
    - Within Phase 22 Export block, no hex literals (only var())
    - Contains @media (min-width: 769px) for side-by-side editor and @media (max-width: 768px) for mobile tabs
  </acceptance_criteria>
  <done>Export modal styles defined per UI-SPEC. Side-by-side editor on desktop, mobile tabs on small viewport, greyed disabled rows.</done>
</task>

<task type="auto">
  <name>Task 4: Add Export modal i18n keys to all 4 language files</name>
  <files>assets/i18n-en.js, assets/i18n-de.js, assets/i18n-he.js, assets/i18n-cs.js</files>
  <read_first>
    - assets/i18n-en.js (existing structure, post Plan 02 additions)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (Copywriting Contract — values verbatim for en/de/he/cs)
  </read_first>
  <action>
    Append a "// Phase 22 — Export modal" block to each of the 4 language files. Required keys (same set in all 4 files):

    Required keys (English values shown; substitute UI-SPEC values for de/he/cs):
      "session.export": "Export"
      "export.title": "Export Session"
      "export.step1.helper": "Choose which sections to include."
      "export.step3.helper": "Choose how to deliver the document."
      "export.next1": "Next: Edit document"
      "export.next2": "Next: Get document"
      "export.done": "Done"
      "export.back": "Back"
      "export.tab.edit": "Edit"
      "export.tab.preview": "Preview"
      // export.translate.cta + export.translate.tooltip REMOVED 2026-04-28 (REQ-16 dropped)
      "export.download.pdf": "Download PDF"
      "export.download.text": "Download as text file"   // renamed 2026-04-28; was "export.download.md": "Download Markdown"
      "export.share": "Share via device"
      "export.share.subtitle": "Open share sheet (PDF attached)"
      "export.share.text": "Session document"
      "export.preparing": "Preparing PDF..."
      "export.discard.title": "Discard your edits?"
      "export.discard.body": "Your changes to the document will be lost."
      "export.discard.yes": "Yes, discard"
      "export.discard.no": "Keep editing"
      "export.pdf.failed": "Could not generate PDF. Try again, or download as a text file instead."   // updated 2026-04-28 — drops "Markdown" jargon
      "export.empty.body": "This session has no content yet. Save the session first."

    German values (from UI-SPEC):
      "session.export": "Exportieren"
      "export.title": "Sitzung exportieren"
      "export.step1.helper": "Wählen Sie, welche Abschnitte enthalten sein sollen."
      "export.step3.helper": "Wählen Sie, wie das Dokument geliefert werden soll."
      "export.next1": "Weiter: Dokument bearbeiten"
      "export.next2": "Weiter: Dokument abrufen"
      "export.done": "Fertig"
      "export.back": "Zurück"
      "export.tab.edit": "Bearbeiten"
      "export.tab.preview": "Vorschau"
      // export.translate.cta + export.translate.tooltip REMOVED 2026-04-28 (REQ-16 dropped)
      "export.download.pdf": "PDF herunterladen"
      "export.download.text": "Als Textdatei herunterladen"   // renamed 2026-04-28
      "export.share": "Über Gerät teilen"
      "export.share.subtitle": "Freigabemenü öffnen (PDF angehängt)"
      "export.share.text": "Sitzungsdokument"
      "export.preparing": "PDF wird vorbereitet..."
      "export.discard.title": "Änderungen verwerfen?"
      "export.discard.body": "Ihre Änderungen am Dokument gehen verloren."
      "export.discard.yes": "Ja, verwerfen"
      "export.discard.no": "Weiter bearbeiten"
      "export.pdf.failed": "PDF konnte nicht erstellt werden. Versuchen Sie es erneut oder laden Sie als Textdatei herunter."   // updated 2026-04-28
      "export.empty.body": "Diese Sitzung enthält noch keinen Inhalt. Speichern Sie sie zuerst."

    Hebrew values:
      "session.export": "ייצוא"
      "export.title": "ייצוא מפגש"
      "export.step1.helper": "בחר אילו מקטעים לכלול."
      "export.step3.helper": "בחר כיצד למסור את המסמך."
      "export.next1": "הבא: ערוך מסמך"
      "export.next2": "הבא: קבל מסמך"
      "export.done": "סיים"
      "export.back": "חזור"
      "export.tab.edit": "ערוך"
      "export.tab.preview": "תצוגה מקדימה"
      // export.translate.cta + export.translate.tooltip REMOVED 2026-04-28 (REQ-16 dropped)
      "export.download.pdf": "הורד PDF"
      "export.download.text": "הורד כקובץ טקסט"   // renamed 2026-04-28
      "export.share": "שתף דרך המכשיר"
      "export.share.subtitle": "פתח תפריט שיתוף (PDF מצורף)"
      "export.share.text": "מסמך מפגש"
      "export.preparing": "מכין PDF..."
      "export.discard.title": "לבטל את השינויים?"
      "export.discard.body": "השינויים במסמך יאבדו."
      "export.discard.yes": "כן, בטל"
      "export.discard.no": "המשך עריכה"
      "export.pdf.failed": "לא ניתן ליצור PDF. נסה שוב או הורד כקובץ טקסט."   // updated 2026-04-28
      "export.empty.body": "אין עדיין תוכן במפגש זה. שמור תחילה."

    Czech values:
      "session.export": "Exportovat"
      "export.title": "Exportovat sezení"
      "export.step1.helper": "Vyberte, které sekce mají být zahrnuty."
      "export.step3.helper": "Vyberte způsob doručení dokumentu."
      "export.next1": "Další: Upravit dokument"
      "export.next2": "Další: Získat dokument"
      "export.done": "Hotovo"
      "export.back": "Zpět"
      "export.tab.edit": "Upravit"
      "export.tab.preview": "Náhled"
      // export.translate.cta + export.translate.tooltip REMOVED 2026-04-28 (REQ-16 dropped)
      "export.download.pdf": "Stáhnout PDF"
      "export.download.text": "Stáhnout jako textový soubor"   // renamed 2026-04-28
      "export.share": "Sdílet přes zařízení"
      "export.share.subtitle": "Otevřít panel sdílení (PDF přiloženo)"
      "export.share.text": "Dokument sezení"
      "export.preparing": "Připravuji PDF..."
      "export.discard.title": "Zahodit změny?"
      "export.discard.body": "Vaše změny v dokumentu budou ztraceny."
      "export.discard.yes": "Ano, zahodit"
      "export.discard.no": "Pokračovat v úpravách"
      "export.pdf.failed": "Nelze vygenerovat PDF. Zkuste znovu nebo stáhněte jako textový soubor."   // updated 2026-04-28
      "export.empty.body": "Toto sezení zatím nemá obsah. Nejprve sezení uložte."
  </action>
  <verify>
    <automated>for L in en de he cs; do for K in "session.export" "export.title" "export.step1.helper" "export.next1" "export.next2" "export.done" "export.tab.edit" "export.tab.preview" "export.download.pdf" "export.download.text" "export.share" "export.discard.title" "export.pdf.failed"; do grep -q "\"$K\"" assets/i18n-$L.js || { echo "MISSING_${L}_${K}"; exit 1; }; done; done && for L in en de he cs; do if grep -q "export.translate.cta\|export.translate.tooltip\|export.download.md" assets/i18n-$L.js; then echo "FORBIDDEN_TRANSLATE_KEY_${L}"; exit 1; fi; done && for L in en de he cs; do if grep -q "translate.google.com" assets/i18n-$L.js; then echo "FORBIDDEN_TRANSLATE_URL_${L}"; exit 1; fi; done && for L in en de he cs; do node -c assets/i18n-$L.js; done && echo "ok"</automated>
  </verify>
  <acceptance_criteria>
    - All 4 files contain the required Export modal keys (15+ keys per file)
    - All 4 files parse: `node -c assets/i18n-{en,de,he,cs}.js`
    - Hebrew file `export.title` value contains "ייצוא"
    - German file `export.title` value contains "exportieren" or "Exportieren"
    - Czech file `export.title` value contains "Exportovat"
  </acceptance_criteria>
  <done>All 4 i18n files have key parity for Export modal strings.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| therapist-edited markdown → MdRender → preview innerHTML | The most sensitive surface; protected by Plan 03's escape-first pipeline |
| custom labels → DOM render in section headings + Step 1 rows | Rendered via .textContent (Step 1 labelSpan) — never innerHTML |
| edited markdown → PDFExport / Markdown blob / Web Share | binary outputs do not execute scripts; filename slugified |
| ~~Translate href → external tab~~ | REMOVED 2026-04-28 — REQ-16 dropped. Modal makes zero outbound network calls. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-22-06-01 | XSS / Tampering | Live preview pane innerHTML assignment | mitigate | Preview uses `pv.innerHTML = MdRender.render(ed.value)`. MdRender (Plan 03) escapes HTML BEFORE structural rules. Acceptance: Plan 03 smoke test asserts `<script>` payloads are escaped. |
| T-22-06-02 | XSS / Tampering | Step 1 row labels (custom section labels) | mitigate | Rendered via `labelSpan.textContent = label` — browser auto-escapes. Acceptance: grep for `.innerHTML\s*=` in the export Step 1 render path returns 0 matches (only the preview pane uses innerHTML, and that's the MdRender path). |
| T-22-06-03 | ~~Tampering / open-redirect~~ | ~~Translate href~~ | **REMOVED 2026-04-28** | REQ-16 (Translate) was dropped. There is no Translate href and no outbound URL construction in the modal. Threat ID retained for traceability; no surface remains. |
| T-22-06-04 | Information disclosure | Editing preview leaks unselected sections | mitigate | The markdown initially shown in Step 2 is built from the Step 1 selection (buildEditableMarkdownFromSelection filters by checked checkboxes). Unchecked sections are not in the editor's value at all. |
| T-22-06-05 | Information disclosure | navigator.share leaks file to chosen target | accept | The user is initiating the share. The OS share sheet shows targets the user chooses. This is the design intent. |
| T-22-06-06 | Spoofing | Web Share canShare false-positive on probe | mitigate | Probe with a 1-byte dummy PDF File before revealing the Share button. If probe fails, button stays hidden. |
| T-22-06-07 | DoS | Pathological live-preview re-render on every keystroke | mitigate | Preview update on `input` events is fine — MdRender is O(n) on input length. For very long input (>20KB), browser keystroke latency may suffer; acceptable for v1. Optional throttle could be added later. |
| T-22-06-08 | Tampering | Disabled section bypass via DevTools | accept | Local-only single-user threat model. The user is the attacker; bypassing the disable to include a section in their own export is not a security boundary. |
| T-22-06-09 | XSS / Tampering | Custom section labels rendered into PDF body | accept | The PDF body is binary; jsPDF's text() does not execute scripts. Custom labels appear as text in the PDF — no executable surface. |
| T-22-06-10 | Information disclosure | exportShare button leaks app version via UA | accept | `navigator.share` does not expose UA beyond what the OS share sheet does. No additional disclosure beyond standard browser behavior. |

**Residual risk:** Low-medium. The preview innerHTML path is the highest-risk surface, mitigated by Plan 03's escape-first pipeline; tested in Plan 03 acceptance and again in this plan via integration smoke.
</threat_model>

<verification>
- node -c assets/add-session.js
- node -c each i18n file
- HTML lint settings.html and add-session.html
- Manual smoke after Plan 22-08 wiring: load a saved session in read mode → click Export → Step 1 shows 9 rows with disabled-greyed where applicable → Next → Step 2 textarea + live preview update on type (NO Translate button anywhere — REQ-16 removed 2026-04-28) → Next → Step 3 "Download PDF" + "Download as text file" both work → Share visible only on supported devices → Esc with edits prompts confirm.
- Editable disabled-section smoke (REQ-5 amended 2026-04-28): in Settings, disable a section that has stored data in some past session → open that past session → the section renders with the "Disabled in Settings" badge AND the input is fully editable (cursor enters, value can be changed) → clear the value and save → reopen the session and confirm the section is now hidden.
- Cross-tab smoke: change a section name in Settings tab → app:settings-changed fires → add-session form re-applies visibility (badge appears for newly disabled section).
</verification>

<success_criteria>
- All 9 sections in add-session.html have data-section-key wrappers
- buildSessionMarkdown emits headings via App.getSectionLabel
- Past sessions render disabled-but-populated sections as fully editable inputs with the "Disabled in Settings" badge (REQ-5 amended 2026-04-28); empty disabled sections stay hidden
- Export button visible in read mode; opens 3-step modal
- Step 1: client-safe defaults, disabled sections greyed
- Step 2: live preview updates from textarea (NO Translate button — REQ-16 removed 2026-04-28)
- Step 3: PDF download produces a valid file with the client name preserved as-is in the filename per D-04 amendment; "Download as text file" button (label drops MD/Markdown jargon) produces a .md file; Share button only visible if canShare({files}) returns true
- Custom labels propagate from Settings → form → "Copy session text" clipboard → Export Step 1 → Export preview → PDF
- Modal close with edits prompts via App.confirmDialog with export.discard.* keys
</success_criteria>

<output>
Create `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-06-export-modal-and-buildSessionMarkdown-SUMMARY.md` after completion.
</output>
