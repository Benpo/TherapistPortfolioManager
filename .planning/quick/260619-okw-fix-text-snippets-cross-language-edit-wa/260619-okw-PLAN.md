---
phase: quick-260619-okw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - assets/settings.js
  - assets/db.js
  - assets/snippets.js
  - settings.html
  - assets/app.css
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
  - tests/24-04-shape-validator.test.js
  - tests/24-05-list-filter.test.js
  - tests/quick-260619-okw-trigger-unicode.test.js
  - tests/quick-260619-okw-cross-lang-warning.test.js
autonomous: true
requirements:
  - QUICK-260619-OKW
must_haves:
  truths:
    - "A snippet trigger written in Hebrew (e.g. כעס) can be saved and is accepted by validateSnippetShape; German (größe) and Czech (přítel) triggers are accepted too"
    - "Invalid triggers are still rejected: empty, length 1, length 33, containing a space, containing punctuation other than hyphen"
    - "Opening an existing snippet whose current-language expansion is empty while another language has text shows a warning naming the language(s) with content and pointing to the Edit translations button"
    - "The warning never shows in add mode, nor when the current language already has text, nor when no other language has text"
    - "The Edit translations control is visibly a button: content-width (not full-width), filled (secondary) variant, with a chevron; it gets an attention state while the warning is active"
    - "The snippet list has an All / Mine / Defaults source filter that AND-combines with search and tag filters; default is All"
    - "The category (tag) chip row is shown only when at least one category exists"
  artifacts:
    - path: assets/settings.js
      provides: "isValidTrigger + getCrossLangWarning helpers (exported on window.__SnippetEditorHelpers); origin filter in filterSnippetList; editor warning wiring; origin-filter wiring"
      contains: "getCrossLangWarning"
    - path: assets/db.js
      provides: "Unicode trigger acceptance in validateSnippetShape"
      contains: "p{L}"
    - path: tests/quick-260619-okw-trigger-unicode.test.js
      provides: "Falsifiable test: Unicode triggers validate, invalid triggers rejected"
    - path: tests/quick-260619-okw-cross-lang-warning.test.js
      provides: "Falsifiable test: getCrossLangWarning show/otherLangs logic"
  key_links:
    - from: "openEditor"
      to: "getCrossLangWarning"
      via: "warning element show/hide + Edit translations attention state"
      pattern: "getCrossLangWarning"
    - from: "renderSnippetList"
      to: "filterSnippetList"
      via: "opts.origin = activeOriginFilter"
      pattern: "origin"
---

<objective>
Three changes to the Text Snippets feature (Settings → Snippet library), one plan, three
atomic commits:

1. **#2 Unicode keywords** — allow Hebrew/German/Czech (any Unicode letter) snippet
   triggers, not only English a–z + digits.
2. **#1 Cross-language edit warning + button emphasis** — when editing a snippet whose
   current-language expansion is empty but another language has text, show a warning that
   names the language(s) with content and points to the "Edit translations" button; and
   restyle that button so it unmistakably reads as a button (and emphasise it while the
   warning is showing).
3. **#3 Source filter** — add an All / Mine / Defaults filter to the snippet list, keep the
   category (tag) chips, and show the category row only when ≥1 category exists.

Root cause for #1 (confirmed by code read — see CONTEXT.md): a snippet's text is stored
under one `expansions[locale]` key (the language active at save); the editor loads only the
current language's key (`settings.js:1143`) and the translations block is hidden by default
(`settings.js:1162`), so text created under another language looks "missing." It is not a
browser-default leak — save uses `window.App.getLanguage()`, the real displayed language.

Output: aligned validation regex, a non-blocking editor warning + clearly-styled toggle,
and an All/Mine/Defaults list filter — each backed by a falsifiable pure-function test.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/260619-okw-fix-text-snippets-cross-language-edit-wa/260619-okw-CONTEXT.md
@.planning/STATE.md

@assets/settings.js
@assets/db.js

<interfaces>
<!-- Exact contracts the executor needs. Extracted from the codebase 2026-06-19. -->

LOCALES (settings.js:777):              ["he", "en", "cs", "de"]
getCurrentLang() (settings.js:798):     window.App.getLanguage() → localStorage.portfolioLang → "en"
TRIGGER_REGEX (settings.js:775):        /^[a-z0-9-]{2,32}$/            <-- WIDEN
validateSnippetShape regex (db.js:595): /^[a-z0-9-]{2,32}$/            <-- WIDEN (same value, two spots: regex + error string line 596)
detection regex (snippets.js:96-98):    [\p{L}\p{N}-]{1,MAX} + "u"    <-- ALREADY Unicode; the target shape for validation
trigger lowercased on save (settings.js:1330):  String(triggerInput.value||"").trim().toLowerCase()
trigger map key (snippets.js:191):      s.trigger.toLowerCase()
backup restore (backup.js:1074-1083):   calls db.validateSnippetShape — covered automatically by the db.js change

Snippet shape: { id, trigger, expansions:{he,en,cs,de}, tags:[], origin:'seed'|'user', createdAt, updatedAt }

openEditor (settings.js:1100):
  - editingSnippet set at :1101; lang = getCurrentLang() at :1135
  - active textbox loaded at :1143: activeExpansion.value = (editingSnippet.expansions||{})[lang] || ""
  - translations block hidden by default at :1162; toggle button id "snippetEditorTranslationsToggle"
  - translations toggle click handler near settings.js:1704-1711 (reveals block, sets aria-expanded)

handleSave (settings.js:1324): trigger validated at :1334 via TRIGGER_REGEX.test(trigger)

filterSnippetList (settings.js:692): (cache, {searchText, activeTags, currentLang}) → filtered+sorted.
  AND-combines search + tags today; ADD opts.origin.
renderSnippetList (settings.js:973): builds allTags Set, calls renderTagFilterChips(allTags),
  reads search input, calls filterSnippetList({searchText, activeTags, currentLang}).
renderTagFilterChips (settings.js:952): fills #snippetTagFilterRow.
Module state (settings.js:786): var activeTagFilters = new Set();  <-- add activeOriginFilter near here
Test export block (settings.js:761-768): window.__SnippetEditorHelpers = { ... }  <-- add new helpers here

HTML (settings.html):
  toolbar  : line 127 <div class="snippets-list-toolbar"> ... #snippetSearchInput (128), #snippetTagFilterRow (129)
  editor   : #snippetEditorActiveExpansion textarea ends line 250; toggle button lines 253-255;
             #snippetEditorTranslationsBlock line 257
  toggle   : <button id="snippetEditorTranslationsToggle" type="button" class="button ghost" aria-expanded="false">
               <span class="button-label" data-i18n="snippets.editor.translations.toggle">Edit translations</span>
             </button>

CSS (assets/app.css):
  .modal-card (1526): display:flex; flex-direction:column  → children stretch full-width (root cause of "full-width button")
  .button (393): pill; .button.ghost (458) transparent; .button.secondary (452) filled --color-surface-secondary-btn / --color-primary-dark
  snippets editor styles start at 3421; .snippets-editor-translations 3433

i18n: assets/i18n-{en,he,de,cs}.js. Snippet keys block (en sample): lines 477-496.
  existing key to MODIFY: "snippets.editor.trigger.error.format"
  applyTranslations (app.js:23) handles data-i18n (textContent) and data-i18n-placeholder ONLY.
  t() (app.js:14) is plain dictionary lookup with EN fallback — NO interpolation; build dynamic
  strings in JS via String.replace("{langs}", ...).
</interfaces>

<test_harness_note>
Pure-function tests only — no jsdom, no IDB. Mirror EXISTING harnesses verbatim; do NOT
invent a new one:
  - settings.js helpers  → copy the vm-sandbox + window.__SnippetEditorHelpers read from
    tests/24-05-list-filter.test.js (sandbox stubs window/document/localStorage).
  - db.js validateSnippetShape → copy the vm-sandbox + window.PortfolioDB read from
    tests/24-04-shape-validator.test.js.
There is NO package.json test runner. Run each test with: node tests/<file>.test.js
(exit 0 = pass, non-zero = fail). The RED gate (run test BEFORE the source change and
confirm it fails) is MANDATORY per the project behavior-verification rule.
</test_harness_note>

<i18n_copy>
<!-- EN is authoritative. he/de are Ben-review drafts; cs especially must be verified. -->

MODIFY existing key "snippets.editor.trigger.error.format":
  en: "Trigger must be 2–32 letters, digits, or hyphens."
  he: "הטריגר חייב להכיל 2–32 אותיות, ספרות או מקפים."
  de: "Der Auslöser muss aus 2–32 Buchstaben, Ziffern oder Bindestrichen bestehen."
  cs: "Spouštěč musí mít 2–32 písmen, číslic nebo pomlček."

ADD "snippets.editor.langWarning" (the {langs} token is replaced in JS):
  en: "This snippet has no text in the current language. It has text in: {langs}. Click the “Edit translations” button below to view or edit it."
  he: "לקטע הזה אין טקסט בשפה הנוכחית. יש לו טקסט ב: {langs}. לחצו על הכפתור „עריכת תרגומים” שלמטה כדי לראות או לערוך אותו."
  de: "Dieser Baustein hat keinen Text in der aktuellen Sprache. Vorhanden in: {langs}. Klicke unten auf „Übersetzungen bearbeiten“, um ihn anzuzeigen oder zu bearbeiten."
  cs: "Tento úryvek nemá text v aktuálním jazyce. Má text v: {langs}. Kliknutím na tlačítko „Upravit překlady“ níže jej zobrazíte nebo upravíte."

ADD language-name keys (used to build {langs}; names written in the file's own language):
  snippets.lang.name.en / .he / .de / .cs
  in i18n-en.js: "English" / "Hebrew" / "German" / "Czech"
  in i18n-he.js: "אנגלית" / "עברית" / "גרמנית" / "צ׳כית"
  in i18n-de.js: "Englisch" / "Hebräisch" / "Deutsch" / "Tschechisch"
  in i18n-cs.js: "angličtina" / "hebrejština" / "němčina" / "čeština"

ADD source-filter keys:
  snippets.filter.origin.all / .mine / .defaults / .label (group aria-label)
  en: "All" / "My snippets" / "Defaults" / "Filter snippets by source"
  he: "הכול" / "הקטעים שלי" / "ברירת מחדל" / "סינון קטעים לפי מקור"
  de: "Alle" / "Meine" / "Standard" / "Snippets nach Quelle filtern"
  cs: "Vše" / "Moje" / "Výchozí" / "Filtrovat úryvky podle zdroje"
</i18n_copy>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Allow Unicode (Hebrew/German/Czech) snippet triggers</name>
  <files>tests/quick-260619-okw-trigger-unicode.test.js, tests/24-04-shape-validator.test.js, assets/settings.js, assets/db.js, assets/snippets.js, assets/i18n-en.js, assets/i18n-he.js, assets/i18n-de.js, assets/i18n-cs.js</files>
  <behavior>
    After this task, a Hebrew trigger (כעס), German (größe), and Czech (přítel) all pass
    validation in BOTH layers (settings.js isValidTrigger AND db.js validateSnippetShape),
    and invalid triggers are still rejected: "" , length 1 ("a"), length 33, a value with a
    space ("a b"), a value with disallowed punctuation ("a.b", "a/b"). Hyphens remain
    allowed. Accepted side-effect: uppercase Latin ("ABC") now passes the shape validator
    (was rejected) — intended and safe (editor lowercases before save; detection/uniqueness
    are case-insensitive).
  </behavior>
  <action>
    RED first:
    1. Create tests/quick-260619-okw-trigger-unicode.test.js. Copy the vm-sandbox + helper
       read from tests/24-05-list-filter.test.js, but expose and exercise a NEW pure helper
       window.__SnippetEditorHelpers.isValidTrigger(trigger). Assert: כעס, größe, přítel,
       heart-shock, a1 → true; "", "a", 33×"a", "a b", "a.b", "a/b" → false.
    2. In tests/24-04-shape-validator.test.js, extend case "C" to add VALID Unicode triggers
       (כעס, größe, přítel pass with no throw) and UPDATE the uppercase sub-case: "ABC" no
       longer throws (remove/flip that assertion; keep space/length-1/length-33 as throws).
    Run both with `node tests/...` against UNCHANGED source and confirm they FAIL
    (isValidTrigger undefined; Hebrew currently throws in validateSnippetShape). Capture the
    failing output for the SUMMARY (RED gate).

    GREEN:
    3. assets/settings.js:775 — change to: var TRIGGER_REGEX = /^[\p{L}\p{N}-]{2,32}$/u;
       Add a pure helper near it:
         function isValidTrigger(trigger) { return TRIGGER_REGEX.test(String(trigger)); }
       In handleSave (:1334) replace `if (!TRIGGER_REGEX.test(trigger))` with
       `if (!isValidTrigger(trigger))`. Add isValidTrigger to the window.__SnippetEditorHelpers
       export block (settings.js:761-768).
    4. assets/db.js:595-596 — change the regex to /^[\p{L}\p{N}-]{2,32}$/u and update the
       error string to reference /^[\p{L}\p{N}-]{2,32}$/u. Update the stale comment at
       db.js:260 ("Triggers must be lowercase a-z0-9-") to reflect the Unicode rule.
    5. assets/snippets.js:91 — update the comment that cites /^[a-z0-9-]{2,32}$/ so it no
       longer claims triggers are ASCII-restricted (now /^[\p{L}\p{N}-]{2,32}$/u, aligned
       with detection). Comment-only; no logic change.
    6. i18n: MODIFY "snippets.editor.trigger.error.format" in all four i18n-*.js files per
       <i18n_copy>.
    Re-run both tests until green.

    Do NOT introduce a partial/"phase-1" variant — deliver full Unicode acceptance.
  </action>
  <verify>
    <automated>node tests/quick-260619-okw-trigger-unicode.test.js && node tests/24-04-shape-validator.test.js && node tests/24-04-trigger-regex.test.js && node tests/24-05-import-validator.test.js && node tests/24-05-trigger-dedupe.test.js</automated>
  </verify>
  <done>RED captured (both trigger tests failed pre-change). Post-change: the two trigger tests pass; detection (24-04-trigger-regex), import-validator, and trigger-dedupe still pass (no regression). Both validation layers + the error message reference the Unicode regex.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Cross-language edit warning + emphasised "Edit translations" button</name>
  <files>tests/quick-260619-okw-cross-lang-warning.test.js, assets/settings.js, settings.html, assets/app.css, assets/i18n-en.js, assets/i18n-he.js, assets/i18n-de.js, assets/i18n-cs.js</files>
  <behavior>
    Pure helper getCrossLangWarning(snippet, currentLang) → { show:boolean, otherLangs:string[] }:
      - show=true ONLY when snippet is an object with expansions, expansions[currentLang] is
        empty/whitespace, AND ≥1 other LOCALES entry has non-empty text.
      - otherLangs = locales (in LOCALES order: he,en,cs,de) with non-empty text, excluding
        currentLang.
      - show=false for: null/undefined snippet, no expansions, current language has text, or
        no other language has text.
    In the editor (DOM): opening an existing snippet that satisfies show=true reveals a
    warning naming otherLangs and adds an attention state to the toggle; otherwise the
    warning is hidden and the attention state removed. Clicking "Edit translations" removes
    the attention state. The toggle is content-width, filled (secondary), with a chevron
    that rotates when expanded. Warning is non-blocking (save still works).
  </behavior>
  <action>
    RED first:
    1. Create tests/quick-260619-okw-cross-lang-warning.test.js (vm-sandbox harness from
       tests/24-05-list-filter.test.js). Read window.__SnippetEditorHelpers.getCrossLangWarning.
       Assertions:
         A. {expansions:{he:"",en:"Hello",cs:"",de:""}}, "he" → {show:true, otherLangs:["en"]}
         B. {expansions:{he:"שלום",en:"Hello",...}}, "he" → {show:false}
         C. {expansions:{he:"",en:"",cs:"",de:""}}, "he" → {show:false} (no other content)
         D. null snippet → {show:false}
         E. otherLangs ordering follows LOCALES (he,en,cs,de) and excludes currentLang
            (e.g. en+cs+de present, current "en" → ["cs","de"] ... include he case too).
         F. whitespace-only expansion counts as empty (current "he" = "   " → treated empty).
       Run → confirm FAIL (helper undefined). Capture for SUMMARY.

    GREEN — assets/settings.js:
    2. Add pure helper:
         function getCrossLangWarning(snippet, currentLang) {
           if (!snippet || !snippet.expansions) return { show:false, otherLangs:[] };
           var cur = String(snippet.expansions[currentLang] || "").trim();
           var others = LOCALES.filter(function(loc){
             return loc !== currentLang && String((snippet.expansions||{})[loc]||"").trim() !== "";
           });
           return { show: cur === "" && others.length > 0, otherLangs: others };
         }
       Export it on window.__SnippetEditorHelpers (settings.js:761-768).
    3. In openEditor, AFTER the active-expansion load (settings.js:1143) and after the
       translations block is built (so the toggle ref exists), compute the warning ONLY in
       the editing branch:
         var warnEl = $("snippetEditorLangWarning");
         var w = editingSnippet ? getCrossLangWarning(editingSnippet, lang) : { show:false, otherLangs:[] };
         if (warnEl) {
           if (w.show) {
             var names = w.otherLangs.map(function(loc){ return t("snippets.lang.name." + loc); }).join(", ");
             warnEl.textContent = String(t("snippets.editor.langWarning") || "").replace("{langs}", names);
             warnEl.classList.remove("is-hidden");
             translationsToggle.classList.add("is-attention");
           } else {
             warnEl.textContent = "";
             warnEl.classList.add("is-hidden");
             translationsToggle.classList.remove("is-attention");
           }
         }
       (Use textContent — never innerHTML — names come from i18n but keep the XSS-safe pattern.)
    4. In the translations-toggle click handler (settings.js ~1704-1711), when the block is
       revealed, remove the attention state: translationsToggle.classList.remove("is-attention").

    GREEN — settings.html: insert the warning element AFTER the current-lang form-field
    (after line 251, the </div> closing .snippets-editor-current-lang) and BEFORE the toggle
    button (line 253):
      <p id="snippetEditorLangWarning" class="snippets-editor-lang-warning is-hidden" role="status" aria-live="polite"></p>
    Then restyle the toggle button (lines 253-255):
      <button id="snippetEditorTranslationsToggle" type="button" class="button secondary snippets-translations-toggle" aria-expanded="false">
        <span class="snippets-translations-chevron" aria-hidden="true">▸</span>
        <span class="button-label" data-i18n="snippets.editor.translations.toggle">Edit translations</span>
      </button>

    GREEN — assets/app.css (add near the snippets editor styles ~3433):
      .snippets-translations-toggle { align-self: flex-start; inline-size: auto; display: inline-flex; align-items: center; gap: 0.5rem; margin-block: var(--space-2, 8px); }
      .snippets-translations-chevron { display: inline-block; font-size: 0.8em; transition: transform 0.2s ease; }
      .snippets-translations-toggle[aria-expanded="true"] .snippets-translations-chevron { transform: rotate(90deg); }
      html[dir="rtl"] .snippets-translations-chevron { transform: scaleX(-1); }
      html[dir="rtl"] .snippets-translations-toggle[aria-expanded="true"] .snippets-translations-chevron { transform: scaleX(-1) rotate(90deg); }
      .snippets-translations-toggle.is-attention { box-shadow: 0 0 0 2px var(--color-primary, #b07a3c); }
      .snippets-editor-lang-warning { margin-block: var(--space-2, 8px); padding: 0.6rem 0.8rem; border-radius: 10px; background: var(--color-warning-surface, #fdf3e3); color: var(--color-text, #2c2622); border: 1px solid var(--color-border, #e2dcc5); font-size: 0.85rem; line-height: 1.4; }
    (If --color-warning-surface is not a defined token, use the literal #fdf3e3 fallback shown,
    or the closest existing warning/notice token in tokens.css — check before inventing one.)

    GREEN — i18n: ADD snippets.editor.langWarning and snippets.lang.name.{en,he,de,cs} to all
    four i18n-*.js files per <i18n_copy>.

    Re-run the warning test until green.
  </action>
  <verify>
    <automated>node tests/quick-260619-okw-cross-lang-warning.test.js</automated>
    <manual>Open Settings → Snippets in EN. Add a snippet with English text only, save. Switch app to Hebrew. Edit that snippet: the active box is empty, the warning appears naming "English" (in Hebrew: אנגלית) and pointing to the now-clearly-a-button "Edit translations" toggle, which shows an attention ring. Click it → translations reveal, ring clears, English text visible. Add a snippet with Hebrew text and confirm NO warning. Confirm RTL chevron direction looks correct.</manual>
  </verify>
  <done>RED captured (helper test failed pre-change). getCrossLangWarning test passes. Editor shows/hides the warning per the rules; toggle is content-width, filled, chevroned, and gains/loses the attention state; warning copy added to all four locales. Save still works with the warning visible.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: All / Mine / Defaults source filter + conditional category row</name>
  <files>tests/24-05-list-filter.test.js, assets/settings.js, settings.html, assets/app.css, assets/i18n-en.js, assets/i18n-he.js, assets/i18n-de.js, assets/i18n-cs.js</files>
  <behavior>
    filterSnippetList accepts opts.origin ('all'|'user'|'seed'), AND-combined with search and
    tags: 'user' → only origin==='user'; 'seed' → only origin==='seed'; 'all'/absent → both.
    The list toolbar has a segmented All/Mine/Defaults control (default All) that drives
    activeOriginFilter and re-renders. The category (tag) chip row is rendered only when ≥1
    tag exists across the cache.
  </behavior>
  <action>
    RED first:
    1. In tests/24-05-list-filter.test.js, add cases using a cache with mixed origins:
         - origin:'user'  → returns only user snippets
         - origin:'seed'  → returns only seed snippets
         - origin:'all'   (and origin omitted) → returns both
         - origin:'user' AND a searchText/activeTags → AND-combines (only user snippets that
           also match search/tag)
       Run → confirm the origin:'user'/'seed' assertions FAIL pre-change (origin ignored
       today, all returned). Capture for SUMMARY.

    GREEN — assets/settings.js:
    2. filterSnippetList (:692): read var origin = opts.origin || "all"; add an origin gate at
       the top of the .filter callback:
         var matchOrigin = origin === "all" || s.origin === origin;
         if (!matchOrigin) return false;
       (keep existing search + tag logic; final return unchanged).
    3. Add module state near settings.js:786: var activeOriginFilter = "all";
    4. renderSnippetList (:973): pass origin: activeOriginFilter into filterSnippetList; after
       computing allTags, toggle the category row visibility:
         var tagRow = $("snippetTagFilterRow");
         if (tagRow) tagRow.classList.toggle("is-hidden", allTags.size === 0);
    5. Add wiring function and call it from the same init/boot path that wires search & tags:
         function wireOriginFilter() {
           var group = $("snippetOriginFilter"); if (!group) return;
           var btns = group.querySelectorAll(".snippets-origin-btn");
           btns.forEach(function (btn) {
             btn.addEventListener("click", function () {
               activeOriginFilter = btn.getAttribute("data-origin") || "all";
               btns.forEach(function (b) {
                 var on = b === btn;
                 b.classList.toggle("is-active", on);
                 b.setAttribute("aria-pressed", on ? "true" : "false");
               });
               renderSnippetList();
             });
           });
           var grpLabel = t("snippets.filter.origin.label");
           if (grpLabel) group.setAttribute("aria-label", grpLabel);
         }
       (If the boot path uses a NodeList without forEach, use an index loop with an IIFE to
       capture btn — match the existing style in wireTagChipInput.)

    GREEN — settings.html: inside .snippets-list-toolbar (line 127), BEFORE #snippetSearchInput,
    add the segmented control:
      <div id="snippetOriginFilter" class="snippets-origin-filter" role="group" aria-label="Filter snippets by source">
        <button type="button" class="snippets-origin-btn is-active" data-origin="all" aria-pressed="true" data-i18n="snippets.filter.origin.all">All</button>
        <button type="button" class="snippets-origin-btn" data-origin="user" aria-pressed="false" data-i18n="snippets.filter.origin.mine">My snippets</button>
        <button type="button" class="snippets-origin-btn" data-origin="seed" aria-pressed="false" data-i18n="snippets.filter.origin.defaults">Defaults</button>
      </div>

    GREEN — assets/app.css (near the snippets toolbar / tag-filter styles): add a segmented
    pill-group style for .snippets-origin-filter (inline-flex, gap, wraps under search if
    needed) and .snippets-origin-btn (compact pill; .is-active filled with --color-primary /
    --color-surface, inactive uses the secondary/ghost token). Reuse existing chip/button
    tokens; do not invent new colors. Ensure it reads as a connected segmented control.

    GREEN — i18n: ADD snippets.filter.origin.{all,mine,defaults,label} to all four i18n-*.js
    per <i18n_copy>.

    Re-run the list-filter test until green.
  </action>
  <verify>
    <automated>node tests/24-05-list-filter.test.js</automated>
    <manual>Settings → Snippets: with only seed snippets present, the category chips show (seeds have tags). Click "My snippets" → list empties (no user snippets yet) or shows only added ones; "Defaults" → only seeds; "All" → both. Combine with a tag chip and search → AND-combines. If a cache had zero tags, the category row would be hidden.</manual>
  </verify>
  <done>RED captured (origin assertions failed pre-change). list-filter test passes including origin + AND-combine. Segmented control switches the list; default All; category row hidden when no categories exist.</done>
</task>

</tasks>

<tests_added>
<!-- Explicit manifest (per Ben's request: document tests BEFORE execution). -->
NEW:
  - tests/quick-260619-okw-trigger-unicode.test.js
      Asserts __SnippetEditorHelpers.isValidTrigger: כעס/größe/přítel/heart-shock/a1 → valid;
      ""/a/33-chars/"a b"/"a.b"/"a/b" → invalid.
  - tests/quick-260619-okw-cross-lang-warning.test.js
      Asserts __SnippetEditorHelpers.getCrossLangWarning show/otherLangs across 6 scenarios
      (A–F above), including null snippet, whitespace-empty, and LOCALES ordering.
MODIFIED:
  - tests/24-04-shape-validator.test.js
      Case C extended: Hebrew/German/Czech triggers now PASS validateSnippetShape; uppercase
      "ABC" no longer throws; space/length-1/length-33 still throw.
  - tests/24-05-list-filter.test.js
      New cases: origin 'user'/'seed'/'all'/omitted + origin AND search/tag combine.
REGRESSION (must stay green, run but not modified):
  - tests/24-04-trigger-regex.test.js (detection — already Unicode)
  - tests/24-05-import-validator.test.js, tests/24-05-trigger-dedupe.test.js
  - tests/24-05-modified-seed.test.js
RUN COMMAND: node tests/<file>.test.js   (no package.json runner; exit 0 = pass)
</tests_added>

<verification>
- Task 1: node tests/quick-260619-okw-trigger-unicode.test.js && node tests/24-04-shape-validator.test.js  — pass; RED proven pre-change.
- Task 2: node tests/quick-260619-okw-cross-lang-warning.test.js — pass; RED proven pre-change.
- Task 3: node tests/24-05-list-filter.test.js — pass; RED proven pre-change.
- Regression: node tests/24-04-trigger-regex.test.js, tests/24-05-import-validator.test.js,
  tests/24-05-trigger-dedupe.test.js, tests/24-05-modified-seed.test.js — all pass.
- Manual spot-checks per each task's <manual> block (EN→HE cross-language edit; Hebrew
  trigger save; All/Mine/Defaults switching).
</verification>

<success_criteria>
- Hebrew/German/Czech triggers can be created and validate in both layers; invalid triggers
  still rejected.
- Editing a snippet whose current language is empty (but another has text) shows a warning
  naming the language(s) and pointing to the Edit translations button; warning never shows
  when inappropriate and never blocks save.
- The Edit translations control reads clearly as a button (content-width, filled, chevron)
  and is emphasised while the warning is active.
- The list has a working All/Mine/Defaults filter (default All) that AND-combines with
  search and tags; the category row shows only when ≥1 category exists.
- Every behavior change is backed by a falsifiable test that failed before and passes after;
  no regression in existing snippet tests.
</success_criteria>

<commits>
Three atomic commits (code only; docs handled by the workflow):
1. feat(snippets): allow Unicode keywords (Hebrew/German/Czech)
2. feat(snippets): warn when current language has no text + emphasise Edit translations button
3. feat(snippets): add All/Mine/Defaults source filter + conditional category row
</commits>

<output>
After completion, create
.planning/quick/260619-okw-fix-text-snippets-cross-language-edit-wa/260619-okw-SUMMARY.md
including the captured RED (pre-change failing) output and GREEN (post-change passing)
output for each task, and note any i18n strings (he/de/cs) flagged for Ben's review.
</output>
