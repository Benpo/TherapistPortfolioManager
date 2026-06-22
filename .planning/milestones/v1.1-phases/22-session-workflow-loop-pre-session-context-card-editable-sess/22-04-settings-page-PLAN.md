---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 04
type: execute
wave: 2
depends_on:
  - 02   # Needs MIGRATIONS[4], PortfolioDB.setTherapistSetting, App.getSectionLabel, i18n keys
files_modified:
  - settings.html
  - assets/settings.js
  - assets/app.css
autonomous: true
requirements:
  - REQ-1    # Settings page exists
  - REQ-2    # Section labels renameable for 6 free-text sections; 3 sections (HS toggle, Issues, Info-Next) disable-only (amended 2026-04-28)
  - REQ-3    # Per-row reset to default
  - REQ-4    # Sections can be disabled
  - REQ-6    # Existing data preserved through enable/disable cycles (verified via DB layer; UI only writes flag)
  - REQ-17   # All new strings translated en/de/he/cs (consumes Plan 02 i18n)
  - REQ-21   # Settings page warnings: sticky info banner + first-time-disable confirmation dialog (added 2026-04-28)
user_setup: []

# ============================================================
# Amendment 2026-04-28 — post-Sapir-review tightening
# ============================================================
# Three additions on top of the original task content (executor MUST apply
# all of them; original tasks remain valid otherwise):
#
# 1. Three rows have a NON-EDITABLE rename input (per SPEC REQ-2 amendment):
#    - "heartShield"   (Heart Shield toggle — yes/no removal flag)
#    - "issuesHeading" (Issues + severity — structured array)
#    - "nextSession"   (Information for Next Session — downstream consumer)
#    For these rows, the rename input is rendered with the `disabled`
#    attribute, opacity 0.55, cursor not-allowed, aria-disabled="true",
#    and a small info icon next to it whose tooltip + aria-describedby
#    use i18n key `settings.rename.locked.tooltip`. The enable/disable
#    toggle and the Reset button BOTH remain functional on these rows.
#    Implementation hint: keep one renderRow() function with a
#    `LOCKED_RENAME = new Set(["heartShield", "issuesHeading", "nextSession"])`
#    constant at the top of settings.js; `if (LOCKED_RENAME.has(key))` decides
#    whether to add the `disabled` attribute and the info icon.
#
# 2. Sticky info banner (top of page, above the row list) now contains
#    TWO bullets in addition to the original D-12 sync message. Render:
#       <div class="settings-info-banner" role="note">
#         <h3 data-i18n="settings.banner.heading">About Settings</h3>
#         <ul>
#           <li data-i18n="settings.banner.bullet.global">…</li>
#           <li data-i18n="settings.banner.bullet.noDelete">…</li>
#         </ul>
#       </div>
#    The original `settings.syncMessage.heading` + `.body` post-save
#    info row is rendered SEPARATELY, BELOW the banner, only after a
#    successful save (use existing toast infrastructure or a small
#    inline info row beneath the action bar — pick whichever is
#    simpler with the existing CSS).
#
# 3. First-time-disable confirmation dialog (per REQ-21):
#    - Trigger: first time the user toggles ANY row's enable→disable
#      switch within a fresh page visit
#    - Gate via `sessionStorage.getItem('settings.disable.confirmed') === '1'`
#      (cleared on full page reload, so reopening Settings re-arms it)
#    - Reuses the existing `App.confirmDialog` API (same dialog used by
#      Discard changes — Phase 21 confirm-card pattern). Pass the four
#      i18n keys: `settings.confirm.disable.title`,
#      `settings.confirm.disable.body`, `settings.confirm.disable.confirm`,
#      `settings.confirm.disable.cancel`.
#    - On confirm: toggle commits, dirty state set, sessionStorage
#      flag set so subsequent disables in the same visit skip the dialog.
#    - On cancel: toggle does NOT commit (revert the switch UI back
#      to enabled), no dirty state change.
# ============================================================

must_haves:
  truths:
    - "Navigating to settings.html on an activated, terms-accepted device renders a Settings page with 9 section rows"
    - "Each row shows the default i18n label, a description (microcopy), a rename input (placeholder=current default, maxlength=60), an enable/disable toggle, and a Reset-to-default button"
    - "Three rows (heartShield, issuesHeading, nextSession) render the rename input with the disabled attribute + 0.55 opacity + aria-disabled='true' + an info icon next to the input whose tooltip uses i18n key settings.rename.locked.tooltip; the toggle and Reset on those rows remain fully functional (added 2026-04-28)"
    - "The sticky info banner at the top of the Settings page shows TWO bullets (settings.banner.bullet.global and settings.banner.bullet.noDelete) under heading settings.banner.heading (added 2026-04-28); the original D-12 sync message renders only after a successful save"
    - "First-time enable→disable toggle within a fresh page visit triggers App.confirmDialog with the settings.confirm.disable.* keys; the once-per-visit gate is sessionStorage 'settings.disable.confirmed' = '1'; cancelling the dialog reverts the switch and does not dirty the form (added 2026-04-28)"
    - "Saving the form persists changes via PortfolioDB.setTherapistSetting per row and posts a BroadcastChannel message {type: 'therapist-settings-changed'}"
    - "After save, a toast shows 'Settings saved' (i18n key settings.saved.toast)"
    - "Sticky info banner at top of page shows the D-12 sync explanation copy in current UI language"
    - "Sticky bottom action bar shows [Discard changes] and [Save changes] buttons; Save is disabled when form is clean"
    - "Discard with dirty form opens the existing #confirmModal via App.confirmDialog with settings.discard.* keys"
    - "Settings page enforces license + TOC gates inline in <head> (matches sessions.html pattern)"
    - "All custom labels are rendered via .value (input) or .textContent (label) — NEVER innerHTML"
    - "Layout is mobile-first 375px (rows stack); desktop ≥769px uses inline layout per UI-SPEC"
    - "RTL: page renders correctly when html[dir=rtl] (Hebrew)"
  artifacts:
    - path: "settings.html"
      provides: "Settings page HTML shell — gates, chrome, modal markup, scripts block"
      contains: "data-nav=\"settings\""
    - path: "assets/settings.js"
      provides: "window.SettingsPage IIFE — page controller; CRUD on therapistSettings; BroadcastChannel sender; dirty tracking; save flow"
      contains: "BroadcastChannel"
    - path: "assets/app.css"
      provides: ".settings-row, .settings-info-banner, .settings-action-bar, .settings-rename-input, .reset-row-btn — all using design tokens and logical properties"
      contains: ".settings-row"
  key_links:
    - from: "assets/settings.js save handler"
      to: "PortfolioDB.setTherapistSetting"
      via: "for-each row, await put"
      pattern: "PortfolioDB\\.setTherapistSetting"
    - from: "assets/settings.js save handler"
      to: "BroadcastChannel sessions-garden-settings"
      via: "channel.postMessage({type: 'therapist-settings-changed'})"
      pattern: "postMessage"
    - from: "settings.html"
      to: "license + TOC gate scripts"
      via: "inline <script> in <head>"
      pattern: "portfolioTermsAccepted"
---

<objective>
Build the Settings page (settings.html + assets/settings.js + CSS additions) per UI-SPEC. This is the single editor for Feature A.

Purpose: Therapists from non–Emotion-Code modalities can rename and disable sections to fit their practice. This is the user-facing surface that closes Feature A.

Output: A new app page reachable at /settings.html that lets the user CRUD their therapist settings.

Note: The header gear-icon entry point (Plan 22-08) will wire settings.html into the global nav. This plan delivers the page itself; not its entry point.
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
@sessions.html
@assets/sessions.js
@assets/app.js
@assets/app.css
@assets/add-session.js
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-02-db-migration-app-cache-i18n-PLAN.md

<interfaces>
The 9 sectionKeys (must match Plan 02 + Plan 06):
  trapped, insights, limitingBeliefs, additionalTech, heartShield, heartShieldEmotions, issues, comments, nextSession

Their default i18n keys (used as the row's display name):
  session.form.trapped, session.form.insights, session.form.limitingBeliefs, session.form.additionalTech,
  session.form.heartShield, session.form.heartShieldEmotions, session.form.issuesHeading,
  session.form.comments, session.form.nextSession

Their description i18n keys (microcopy below the row label):
  settings.row.trapped.description, settings.row.insights.description, ...

PortfolioDB API (from Plan 02):
  await PortfolioDB.getAllTherapistSettings()  // returns array of {sectionKey, customLabel, enabled}
  await PortfolioDB.setTherapistSetting(record)

App API (from Plan 02):
  App.getSectionLabel(key, defaultI18nKey)  // unused on Settings page (Settings shows defaults explicitly)
  App.confirmDialog({titleKey, messageKey, confirmKey, cancelKey})  // existing helper
  App.showToast(text, i18nKey)
  App.t(key)

BroadcastChannel:
  new BroadcastChannel("sessions-garden-settings").postMessage({type: "therapist-settings-changed"})
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create settings.html (gates, chrome, sticky banner, 9-row form, action bar, confirm modal, scripts block)</name>
  <files>settings.html</files>
  <read_first>
    - sessions.html (full file — the closest in-repo analog; copy gates, brand, chrome, scripts block verbatim)
    - add-session.html (lines 332-362 for #confirmModal markup; lines 438-450 for footer scripts block)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (sections "settings.html" + "Pattern 1" + "Pattern 2" + "Pattern 3")
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (Settings Page Layout, Sticky info banner, Sticky bottom action bar, Per-row spec)
  </read_first>
  <action>
    Create settings.html as a new file at the repo root. Structure exactly:

    1. <head> — copy verbatim from sessions.html lines 1-46:
       - License + TOC + theme inline gate scripts (3 inline <script> blocks, IN THIS ORDER: TOC gate first, license gate second, theme third)
       - <meta charset>, favicons, CSP meta tag (identical to sessions.html), viewport, title "Sessions Garden"
       - Stylesheet links: tokens.css, app.css
       - <link rel="manifest" href="./manifest.json">

    2. <body data-nav="settings"> — important: this attribute is what shared-chrome reads to mark the gear-icon as active.

    3. App-shell + brand block — copy from sessions.html lines 24-46. Same brand-mark leaf SVG, same brand-title, same brand-subtitle data-i18n="app.subtitle". Same #nav-placeholder div. Same #headerActions div.

    4. Main content area (NEW for this page):

       <main class="container settings-page">
         <header class="page-header">
           <h2 data-i18n="settings.page.title">Settings</h2>
           <p class="page-helper" data-i18n="settings.page.helper">Customize section names...</p>
         </header>

         <div class="settings-info-banner" role="status">
           <svg ... info-circle icon ...></svg>
           <div>
             <strong data-i18n="settings.syncMessage.heading">About saved settings</strong>
             <p data-i18n="settings.syncMessage.body">Saved labels appear immediately here...</p>
           </div>
         </div>

         <form id="settingsForm" class="settings-form" novalidate>
           <!-- 9 settings-row elements rendered by JS (settings.js) into this container -->
           <div id="settingsRowsContainer"></div>
         </form>

         <div class="settings-action-bar">
           <button type="button" class="button ghost" id="settingsDiscardBtn" data-i18n="settings.action.discard">Discard changes</button>
           <button type="button" class="button" id="settingsSaveBtn" disabled data-i18n="settings.action.save">Save changes</button>
         </div>
       </main>

    5. Confirm modal — copy verbatim from add-session.html:352-362 (#confirmModal block). Required by App.confirmDialog.

    6. Toast — `<div id="toast" class="toast" aria-live="polite"></div>` (matches existing pages).

    7. Footer scripts block — copy from sessions.html:93-107. Order:
         <script src="./assets/i18n-en.js"></script>
         <script src="./assets/i18n-he.js"></script>
         <script src="./assets/i18n-de.js"></script>
         <script src="./assets/i18n-cs.js"></script>
         <script src="./assets/i18n.js"></script>
         <script src="./assets/db.js"></script>
         <script src="./assets/shared-chrome.js"></script>
         <script src="./assets/app.js"></script>
         <script src="./assets/settings.js"></script>
         <script>
           if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(e){console.warn('SW registration failed:',e)});});}
         </script>

    Do NOT hand-write the 9 rows in HTML — the form rows are rendered by settings.js in Task 2. The HTML only provides the empty container `#settingsRowsContainer`.

    Do NOT add any inline styles. All visual styling comes from CSS classes added in Task 3.
  </action>
  <verify>
    <automated>test -f settings.html && grep -q 'data-nav="settings"' settings.html && grep -q "portfolioTermsAccepted" settings.html && grep -q "portfolioLicenseActivated" settings.html && grep -q 'id="confirmModal"' settings.html && grep -q 'src="./assets/settings.js"' settings.html && grep -q "Content-Security-Policy" settings.html && grep -q "settings.page.title" settings.html && grep -q "settingsRowsContainer" settings.html</automated>
  </verify>
  <acceptance_criteria>
    - File exists at settings.html (repo root)
    - Contains literal `<body data-nav="settings">`
    - Contains the TOC gate inline script (grep `portfolioTermsAccepted` matches the head block)
    - Contains the license gate inline script (grep `portfolioLicenseActivated`)
    - Contains the theme inline script (grep `portfolioTheme`)
    - Contains a CSP meta tag (grep `Content-Security-Policy`)
    - Contains `<meta name="viewport"`
    - Contains the `#confirmModal` block (grep `id="confirmModal"`)
    - Contains `<div id="settingsRowsContainer">` empty container (no 9 hand-written rows)
    - Contains data-i18n attributes for: settings.page.title, settings.page.helper, settings.syncMessage.heading, settings.syncMessage.body, settings.action.discard, settings.action.save
    - Footer script tags exist for i18n-en/he/de/cs, i18n.js, db.js, shared-chrome.js, app.js, settings.js (in order)
    - SW registration script block present
    - No inline `style="..."` attributes (`grep -E 'style="' settings.html` returns 0 matches)
  </acceptance_criteria>
  <done>settings.html is a complete app-page-contract HTML shell. License + TOC + theme gates run inline. Chrome mounts via shared-chrome.js. Form rows are rendered dynamically by settings.js.</done>
</task>

<task type="auto">
  <name>Task 2: Create assets/settings.js (page controller, CRUD, dirty tracking, save + BroadcastChannel)</name>
  <files>assets/settings.js</files>
  <read_first>
    - assets/sessions.js (DOMContentLoaded + initCommon + app:language listener pattern)
    - assets/add-session.js (lines 5-6, 58-66 dirty-tracking pattern; line 708-714 button click handler pattern)
    - assets/app.js (App.confirmDialog around line 300-346; App.showToast around 282-289; App.t)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (section "assets/settings.js (new page controller, CRUD)")
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (per-row spec: rename input maxlength=60, toggle switch class, reset button)
  </read_first>
  <action>
    Create assets/settings.js as a single IIFE assigned to window.SettingsPage. Wire DOMContentLoaded handler that:

    1. Calls `App.initCommon()` (no await — fire-and-forget per project convention).
    2. Captures DOM refs: form, rowsContainer, saveBtn, discardBtn, confirm modal already wired by App.confirmDialog.
    3. Defines the canonical 9-row schema (must match Plan 02 sectionKeys + i18n keys exactly):

       const SECTION_DEFS = [
         { key: "trapped",              i18nLabelKey: "session.form.trapped",              i18nDescKey: "settings.row.trapped.description" },
         { key: "insights",             i18nLabelKey: "session.form.insights",             i18nDescKey: "settings.row.insights.description" },
         { key: "limitingBeliefs",      i18nLabelKey: "session.form.limitingBeliefs",      i18nDescKey: "settings.row.limitingBeliefs.description" },
         { key: "additionalTech",       i18nLabelKey: "session.form.additionalTech",       i18nDescKey: "settings.row.additionalTech.description" },
         { key: "heartShield",          i18nLabelKey: "session.form.heartShield",          i18nDescKey: "settings.row.heartShield.description" },
         { key: "heartShieldEmotions", i18nLabelKey: "session.form.heartShieldEmotions",  i18nDescKey: "settings.row.heartShieldEmotions.description" },
         { key: "issues",               i18nLabelKey: "session.form.issuesHeading",        i18nDescKey: "settings.row.issues.description" },
         { key: "comments",             i18nLabelKey: "session.form.comments",             i18nDescKey: "settings.row.comments.description" },
         { key: "nextSession",          i18nLabelKey: "session.form.nextSession",          i18nDescKey: "settings.row.nextSession.description" },
       ];

    4. async function loadAndRender() — calls await PortfolioDB.getAllTherapistSettings(), builds a Map by sectionKey, then renders one row per SECTION_DEFS entry. Render uses createElement + textContent + value (NEVER innerHTML for any user-controlled text).

       Per-row DOM (one .settings-row div per section):
         - .settings-row-meta:
             span.settings-row-label.label  (textContent = App.t(def.i18nLabelKey))
             span.settings-row-desc.microcopy  (textContent = App.t(def.i18nDescKey))
             [optional] span.disabled-indicator-badge  (textContent = App.t("settings.indicator.disabled"); only present when current.enabled === false)
         - input.input.settings-rename-input  (type="text", maxlength="60", placeholder=App.t(def.i18nLabelKey), value=current.customLabel || "", data-section-key=def.key)
         - label.toggle-switch (existing class):
             input[type=checkbox].settings-enable-toggle (checked = current.enabled !== false, data-section-key=def.key)
             span.toggle-slider
         - button.button.ghost.reset-row-btn type="button" (aria-label=App.t("settings.reset.tooltip"); data-section-key=def.key; disabled when no override exists for this section)

       For renaming: assign `input.value = current.customLabel || ""` — NEVER innerHTML or textContent. The browser auto-escapes <input value> for display.
       For label/desc: use `el.textContent = App.t(...)`.
       For the disabled-indicator-badge: use `badge.textContent = App.t("settings.indicator.disabled")`.

    5. Dirty tracking — listen on the form for input + change events, set formDirty=true. Enable/disable saveBtn based on formDirty.

    6. Save handler — async, on saveBtn click:
       - Iterate SECTION_DEFS. For each, read current input value + toggle state from DOM.
       - Call await PortfolioDB.setTherapistSetting({sectionKey: def.key, customLabel: trimmedValue || null, enabled: toggleChecked}).
       - validate maxlength — if any input.value.length > 60, show toast App.showToast("", "settings.rename.tooLong"), abort save.
       - On success: post BroadcastChannel message, formDirty=false, disable saveBtn, App.showToast("", "settings.saved.toast"), re-render rows so the disabled-indicator-badge state matches.

       BroadcastChannel send:
         try {
           if (typeof BroadcastChannel !== "undefined") {
             var ch = new BroadcastChannel("sessions-garden-settings");
             ch.postMessage({ type: "therapist-settings-changed", at: Date.now() });
             ch.close();
           }
         } catch (e) { /* swallow */ }

    7. Discard handler — async, on discardBtn click:
       - If !formDirty: do nothing.
       - Else: const ok = await App.confirmDialog({ titleKey: "settings.discard.title", messageKey: "settings.discard.body", confirmKey: "settings.discard.confirm", cancelKey: "settings.discard.cancel" });
         If ok: re-render from DB (discards local edits), formDirty=false, disable saveBtn.

    8. Reset row button — on click: clear that row's input value, set toggle to checked, mark formDirty=true. The DB write only happens at Save time. After Save, the user has effectively "reset" because customLabel is null and enabled is true.

    9. Re-translate on language change:
         document.addEventListener("app:language", () => { loadAndRender(); });
         document.addEventListener("app:settings-changed", () => { loadAndRender(); });

    10. beforeunload — if formDirty && !formSaving: e.preventDefault().

    Wrap as IIFE returning empty (page controllers don't expose a public API):
      window.SettingsPage = (function () {
        "use strict";
        // ... all of the above ...
        return {};
      })();

    The DOMContentLoaded listener can live inside or outside the IIFE — match assets/sessions.js convention.
  </action>
  <verify>
    <automated>test -f assets/settings.js && grep -q "window.SettingsPage" assets/settings.js && grep -q "PortfolioDB.setTherapistSetting" assets/settings.js && grep -q 'BroadcastChannel("sessions-garden-settings"' assets/settings.js && grep -q "SECTION_DEFS" assets/settings.js && grep -c '"key":\s*"' assets/settings.js | awk '$1 < 9 { print "missing_keys"; exit 1 } { print "ok" }' || grep -cE 'key:\s*"(trapped|insights|limitingBeliefs|additionalTech|heartShield|heartShieldEmotions|issues|comments|nextSession)"' assets/settings.js | awk '$1 < 9 { print "FAIL"; exit 1 } { print "ok" }' && ! grep -E '\.innerHTML\s*=' assets/settings.js && node -c assets/settings.js</automated>
  </verify>
  <acceptance_criteria>
    - File exists at assets/settings.js
    - Contains `window.SettingsPage = (function`
    - Contains all 9 sectionKeys in SECTION_DEFS: trapped, insights, limitingBeliefs, additionalTech, heartShield, heartShieldEmotions, issues, comments, nextSession (grep each one)
    - Contains `PortfolioDB.setTherapistSetting` call
    - Contains `BroadcastChannel("sessions-garden-settings")`
    - Contains `App.confirmDialog` call with settings.discard.* keys
    - Contains `App.showToast` calls referencing settings.saved.toast and settings.rename.tooLong
    - Contains `maxlength` enforcement (either as DOM attribute or pre-save check)
    - Listens for `app:language` event and `app:settings-changed` event
    - Has `beforeunload` listener guarding dirty form
    - **NEVER uses `.innerHTML =`** — `grep -E '\.innerHTML\s*=' assets/settings.js` returns 0 matches
    - File parses: `node -c assets/settings.js`
  </acceptance_criteria>
  <done>Settings page controller renders 9 rows, persists changes via PortfolioDB, broadcasts to other tabs, manages dirty state with confirm-on-discard, and never uses innerHTML for user-supplied text.</done>
</task>

<task type="auto">
  <name>Task 3: Add Settings page CSS to assets/app.css (logical properties, design tokens, mobile-first)</name>
  <files>assets/app.css</files>
  <read_first>
    - assets/app.css (modal block ~1333-1373; .toggle-switch ~1604-1648; .button .button.ghost ~390-440; logical-property uses ~1408, 1631, 1652)
    - assets/tokens.css (color/spacing tokens — names only, do not modify)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (Settings Page layout: per-row spec, sticky info banner, sticky bottom action bar; Color Token Cross-Reference)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (section "assets/app.css")
  </read_first>
  <action>
    Append a new CSS block to assets/app.css with the comment header `/* Phase 22 — Settings page */`. All values come from UI-SPEC and use design tokens / logical properties only.

    Required selectors and key rules:

      /* Phase 22 — Settings page */
      .settings-page {
        padding-block: 32px 64px;
      }
      .settings-page .page-helper {
        color: var(--color-text-muted);
        margin-block-end: 24px;
      }
      .settings-info-banner {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 16px 24px;
        margin-block-end: 24px;
        background: var(--color-info-bg);
        color: var(--color-info-text);
        border-radius: 16px;
        position: sticky;
        inset-block-start: 0;
        z-index: 1;
      }
      .settings-info-banner svg {
        flex-shrink: 0;
        inline-size: 24px;
        block-size: 24px;
      }
      .settings-info-banner strong {
        display: block;
        font-weight: 600;
        margin-block-end: 4px;
      }
      .settings-row {
        background: var(--color-surface);
        border: 1px solid var(--color-border-soft);
        border-radius: 16px;
        padding: 24px;
        margin-block-end: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .settings-row-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .settings-row-label {
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1.4;
      }
      .settings-row-desc {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text-muted);
        line-height: 1.4;
      }
      .disabled-indicator-badge {
        display: inline-block;
        padding: 4px 8px;
        background: var(--color-surface-disabled);
        color: var(--color-text-muted);
        border: 1px solid var(--color-border-soft);
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 600;
        margin-inline-start: 8px;
      }
      .settings-rename-input {
        inline-size: 100%;
      }
      .settings-row-controls {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .reset-row-btn[disabled] {
        opacity: 0.5;
        pointer-events: none;
      }
      .settings-action-bar {
        position: sticky;
        inset-block-end: 0;
        background: var(--color-surface);
        padding: 16px;
        border-block-start: 1px solid var(--color-border-soft);
        box-shadow: 0 -4px 16px var(--color-modal-shadow);
        display: flex;
        gap: 16px;
        justify-content: flex-end;
        z-index: 1;
      }
      @media (min-width: 769px) {
        .settings-row {
          flex-direction: row;
          align-items: center;
          gap: 24px;
        }
        .settings-row-meta { flex: 1; }
        .settings-rename-input { inline-size: 280px; }
      }

    Rules:
    - Use ONLY design tokens (var(--color-*), no hex literals).
    - Use ONLY on-scale spacing (4, 8, 16, 24, 32, 48, 64).
    - Use ONLY logical properties (padding-inline, padding-block, inset-inline-start, inset-block-end, margin-inline-end, margin-block-end, border-block-start). NO `padding-left`, `padding-right`, `top`, `bottom`, `left`, `right` for layout.
    - 44px tap target floor for buttons inherits from existing global rule (assets/app.css:1147-1154); no per-button override needed.

    Do NOT edit existing CSS rules. APPEND only.
  </action>
  <verify>
    <automated>grep -q "Phase 22 — Settings page" assets/app.css && grep -q "\.settings-row\s*{" assets/app.css && grep -q "\.settings-info-banner\s*{" assets/app.css && grep -q "\.settings-action-bar\s*{" assets/app.css && grep -q "\.disabled-indicator-badge\s*{" assets/app.css && ! grep -A 80 "Phase 22 — Settings page" assets/app.css | grep -E "padding-(left|right):|margin-(left|right):|left:\s*[0-9]|right:\s*[0-9]" && ! grep -A 80 "Phase 22 — Settings page" assets/app.css | grep -E "#[0-9a-fA-F]{3,8}\s*[;{]"</automated>
  </verify>
  <acceptance_criteria>
    - assets/app.css contains the comment `/* Phase 22 — Settings page */`
    - assets/app.css contains rules for: .settings-row, .settings-row-meta, .settings-row-label, .settings-row-desc, .disabled-indicator-badge, .settings-rename-input, .settings-row-controls, .reset-row-btn[disabled], .settings-action-bar, .settings-info-banner
    - Within the Phase 22 block, NO `padding-left`, `padding-right`, `margin-left`, `margin-right` for layout (negative grep)
    - Within the Phase 22 block, NO hex color literals (`#[0-9a-fA-F]{3,8}`) — only `var(--color-*)`
    - Within the Phase 22 block, all spacing values are on-scale: 4, 8, 16, 24, 32, 48, 64 — no 12, 13, 20 etc. (manual scan)
    - Contains a `@media (min-width: 769px)` block adjusting .settings-row to flex-direction: row
  </acceptance_criteria>
  <done>Settings page styles are defined using design tokens, on-scale spacing, and logical properties. Mobile-first with desktop ≥769px override.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| therapist input → DOM render | rename input value is rendered back via .value (auto-escaped by browser) |
| therapist input → IndexedDB | persisted via setTherapistSetting; sanitization is at render-time |
| BroadcastChannel → other tabs | same-origin only; no payload data |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-22-04-01 | Tampering / XSS | rename input value rendered into DOM | mitigate | settings.js renders via `input.value = customLabel` (browser auto-escapes attribute value) and `el.textContent = customLabel` for badge text. NEVER innerHTML. Acceptance test: `grep '\.innerHTML\s*='` returns 0 in settings.js. |
| T-22-04-02 | Tampering | maxlength bypass via direct DOM manipulation in DevTools | accept | maxlength enforced both via DOM attribute AND pre-save validation in JS. Local-only threat model — user is the attacker; no security boundary crossed. |
| T-22-04-03 | Spoofing | Settings page accessed without license/TOC | mitigate | License gate + TOC gate inline scripts in <head> (copied verbatim from sessions.html — already audited in Phase 19). Same gates as every app page. |
| T-22-04-04 | Information disclosure | Sticky info banner content revealed via i18n keys | accept | Public app strings — no secrets. |
| T-22-04-05 | Tampering | Cross-tab injection via BroadcastChannel | accept | Same-origin only by spec. Payload schema is `{type, at}` — no user data. Listener in app.js (Plan 02) only refreshes cache on a fixed message type. |
| T-22-04-06 | DoS | beforeunload prompt loops user | mitigate | beforeunload only fires when formDirty && !formSaving. Save handler sets formSaving=true before await chain. Standard pattern from add-session.js. |

**Residual risk:** Low. The XSS surface is closed by the .value/.textContent contract enforced by acceptance criteria.
</threat_model>

<verification>
- node -c assets/settings.js
- HTML lint (manual): settings.html validates as HTML5 with no parse errors
- Acceptance: navigate to /settings.html on activated terms-accepted device; renders 9 rows; rename + save persists; reload preserves; cross-tab sync fires.
</verification>

<success_criteria>
- /settings.html renders without console errors on a clean device
- All 9 sections render with default labels in current UI language
- Renaming a section + Save updates IndexedDB; reload preserves the rename
- Disabling a section + Save: subsequent navigation to add-session.html (Plan 06 territory) hides that section's form
- Discard with dirty changes prompts via App.confirmDialog; cancel keeps edits
- BroadcastChannel post on Save dispatches `app:settings-changed` in any other open tab
- Mobile 375px: rows stack; desktop ≥769px: rows go inline
- Hebrew RTL: layout flips correctly via logical properties
</success_criteria>

<output>
Create `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-04-settings-page-SUMMARY.md` after completion.
</output>
