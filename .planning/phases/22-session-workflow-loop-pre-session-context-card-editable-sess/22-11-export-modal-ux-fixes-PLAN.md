---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 11
type: execute
wave: 2
depends_on: ["22-10"]
files_modified:
  - assets/add-session.js
  - add-session.html
  - assets/app.css
  - assets/i18n-en.js
  - assets/i18n-de.js
  - assets/i18n-he.js
  - assets/i18n-cs.js
autonomous: true
gap_closure: true
requirements: [REQ-7, REQ-8, REQ-12]
must_haves:
  truths:
    - "Step 1 of the export modal makes it visually obvious that 1/2/3 are sequential steps in a single workflow — labelled stepper with explicit step names and current-step emphasis."
    - "Each export step screen carries inline therapist-friendly guidance: Step 1 explains 'pick what to include', Step 2 explains 'edit and preview your document — formatting tips below', Step 3 explains 'choose how to deliver'."
    - "Step 2 includes a brief, plain-language formatting cheatsheet (no markdown jargon) so a therapist with no markdown background can produce bold/italic/headings without leaving the modal."
    - "The X (close) button on every step including Step 3 dismisses the modal."
  artifacts:
    - path: "add-session.html"
      provides: "Labelled step indicator (1: Choose / 2: Edit / 3: Export) + Step 2 formatting helper block"
      contains: "export-step-indicator"
    - path: "assets/add-session.js"
      provides: "exportClose handler reachable from Step 3 (event-delegated to modal root)"
      contains: "exportCloseDialog"
    - path: "assets/app.css"
      provides: "Stepper label CSS; formatting-help CSS"
      contains: ".export-step-dot"
  key_links:
    - from: "exportClose button click"
      to: "exportCloseDialog(false)"
      via: "delegated click listener on modal root"
      pattern: "exportCloseDialog"
    - from: "Step indicator dots"
      to: "is-active / is-completed CSS classes"
      via: "exportSetActiveStep — extended to also style new pill wrapper"
      pattern: "exportSetActiveStep"
---

<objective>
Close 3 UAT gaps on the export modal (Phase 22, Plan 06 follow-ups).

All 3 gaps were reported in 22-HUMAN-UAT.md Test 2, severity: major. They are pure UX clarity defects — the modal works functionally but doesn't communicate to the therapist what's happening at each step.

Purpose: Make the 3-step export flow self-explanatory for a non-technical therapist. The user should see at a glance that 1->2->3 is a sequence. Each step should explain itself ("here you choose / here you edit / here you download"). Step 2 (markdown editor) needs a small visual formatting helper so no prior markdown knowledge is required. The X button must dismiss the modal from any step (currently broken on Step 3 per UAT).

Output: Updated add-session.html (labelled stepper markup + Step 2 formatting helper), assets/add-session.js (event-delegated close handler), assets/app.css (Phase 22 export modal block — stepper label styling + helper styling + formatting-cheatsheet styling), and new i18n keys for stepper labels (3) + per-step helper text (already keyed but copy expanded) + formatting helper title and bullets (5 keys) across all 4 languages.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-HUMAN-UAT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-06-export-modal-and-buildSessionMarkdown-SUMMARY.md
@add-session.html
@assets/add-session.js
@assets/app.css

## Source-of-truth UAT entries (truth -> fix)

These three truth lines from 22-HUMAN-UAT.md Gaps section are the ONLY gaps this plan closes:

1. "Export modal Step 1 makes it visually obvious that 1/2/3 are sequential steps in a single export workflow"
2. "Export modal screens give the therapist contextual guidance — what each screen does and how to use Step 2 (markdown editor) without prior markdown knowledge"
3. "Export modal Step 3 close (X) button dismisses the modal"

## Existing implementation reference

In add-session.html (export modal block, L395-462):
- The step indicator at L401-407 renders three numbered dots with connectors. Currently NO labels — just digits "1", "2", "3". UAT says this fails to communicate "these are sequential steps".
- L398: the X close button. It IS in the DOM and the JS DOES wire a click handler at add-session.js L1255. UAT says clicking it on Step 3 does nothing. This needs investigation — maybe a CSS pointer-events or z-index issue with the Step 3 output cards stacking above the X.
- L412: Step 1 already has a helper paragraph. Step 2 has NO helper paragraph (L417-427). Step 3 has one at L431.
- The Step 2 area is just textarea + preview div inside .export-edit-area. No formatting tips, no cheatsheet.

In assets/add-session.js:
- openExportDialog at L1189 wires the X button at L1255 via per-button addEventListener. Cleanup detaches it.
- exportCloseDialog(skipDirtyCheck) at L1055 hides the modal via .is-hidden. Should work from any step.

Investigation hypothesis (Task 1 should verify before assuming): On Step 3 the .export-output-card buttons may stack above the .modal-close due to missing z-index, OR cleanup runs prematurely. Either way, the defensive fix is event-delegated close on the modal root so cleanup is harmless.

In assets/app.css Phase 22 export modal block (starts L2463):
- .export-step-dot is a 24x24 circle. We need to add label spans below/beside the dots.

## Risk callouts

Risk 1 — Step indicator label width on mobile: Adding labels to the existing 24x24 dots will overflow on a 375px viewport. Solution: stack the label below the dot on mobile (flex-direction: column); inline on desktop ≥769px. Use single-word labels: Choose / Edit / Export. Connectors stay horizontal in both layouts.

Risk 2 — X button on Step 3 root cause: First manually load the page, advance to Step 3, click X, inspect event.target. Likely culprits in priority order: (1) .export-output-card position:relative without z-index causing overlap, (2) modal-close at low z-index, (3) cleanup detaching the listener. Defensive fix regardless of root cause: event-delegated click on the modal root catching target.closest(".modal-close") — survives any z-index or cleanup-ordering issue because the event bubbles.

Risk 3 — Naming collision: The existing CSS class .export-step is used for the Step body containers (L411, L417, L430). The NEW wrapper around dot+label must be a different class — use .export-step-pill — to avoid CSS collision.

Risk 4 — Don't break i18n discipline: Add new keys per language (3 stepper labels + 1 formatting-helper title + 4 formatting bullets = 8 keys × 4 languages). All values must be locale-correct. Use the existing 22-06 i18n style (raw UTF-8 in en/de/he; cs file: check existing pattern — if it uses \u escapes for accents, match it; if raw, use raw).

Risk 5 — Formatting helper accessibility in RTL: The cheatsheet must be readable in Hebrew. Use padding-inline-start / padding-inline-end (logical properties), NEVER padding-left / padding-right. The bullets must show actual markdown syntax surrounded by translated explanation, e.g. for HE: "מודגש: הקיפי טקסט בשני כוכבים **כמו זה**". The literal markdown chars ** and * and # and - render the same in any locale.

Risk 6 — Wave/sequencing (parallel-execution i18n conflict): This plan now sits at wave 2 and depends on 22-10 because all three Phase 22 gap-closure plans (22-10, 22-11, 22-12) touch the same 4 i18n files (assets/i18n-{en,de,he,cs}.js). Running them in parallel would conflict on those shared files. The chain is 22-10 → 22-11 → 22-12. Do NOT start this plan until 22-10 has landed all of its commits.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Step 3 X-button via event delegation (Gap 3) AND label the step indicator (Gap 1)</name>
  <files>add-session.html, assets/add-session.js, assets/app.css, assets/i18n-en.js, assets/i18n-de.js, assets/i18n-he.js, assets/i18n-cs.js</files>
  <action>
Step A — Convert close button listener to event-delegated on modal root.

In assets/add-session.js openExportDialog (around L1255), REPLACE these lines:

    if (closeBtn) closeBtn.addEventListener("click", onClose);
    if (overlay) overlay.addEventListener("click", onOverlay);

WITH:

    const onModalClick = (e) => {
      if (!e.target) return;
      const t = e.target;
      if (t.closest && t.closest(".modal-close")) { onClose(); return; }
      if (t.classList && t.classList.contains("modal-overlay")) { onOverlay(); return; }
    };
    modal.addEventListener("click", onModalClick);

In the cleanup block (around L1269), REMOVE:

    if (closeBtn) closeBtn.removeEventListener("click", onClose);
    if (overlay) overlay.removeEventListener("click", onOverlay);

ADD:

    modal.removeEventListener("click", onModalClick);

Also add a defensive z-index guard in assets/app.css (Phase 22 Export modal block, append after existing .export-output-card rule):

    .export-card .modal-close { z-index: 2; }
    .export-output-card { position: relative; z-index: 1; }

Step B — Label the step indicator.

In add-session.html, REPLACE L401-407 with:

    <div class="export-step-indicator" role="progressbar" aria-valuemin="1" aria-valuemax="3" aria-valuenow="1">
      <span class="export-step-pill is-active" data-step="1">
        <span class="export-step-dot is-active">1</span>
        <span class="export-step-label" data-i18n="export.stepper.label.1">Choose</span>
      </span>
      <span class="export-step-connector"></span>
      <span class="export-step-pill" data-step="2">
        <span class="export-step-dot">2</span>
        <span class="export-step-label" data-i18n="export.stepper.label.2">Edit</span>
      </span>
      <span class="export-step-connector"></span>
      <span class="export-step-pill" data-step="3">
        <span class="export-step-dot">3</span>
        <span class="export-step-label" data-i18n="export.stepper.label.3">Export</span>
      </span>
    </div>

In assets/add-session.js exportSetActiveStep, find where it toggles is-active / is-completed on .export-step-dot[data-step]. EXTEND to also toggle the same classes on the parent .export-step-pill[data-step] (read the current implementation first; expected pattern is querySelectorAll on dot — replicate for pill).

Add CSS rules to assets/app.css (Phase 22 export modal block, append after existing .export-step-dot rules):

    .export-step-pill {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .export-step-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-align: center;
      line-height: 1.2;
    }
    .export-step-pill.is-active .export-step-label { color: var(--color-primary); }
    .export-step-pill.is-completed .export-step-label { color: var(--color-text); }
    @media (min-width: 769px) {
      .export-step-pill { flex-direction: row; gap: 8px; }
    }

Step C — Add 3 i18n stepper-label keys per language.

Append to each i18n file's existing Phase 22 export block:

en:
  "export.stepper.label.1": "Choose",
  "export.stepper.label.2": "Edit",
  "export.stepper.label.3": "Export",

de:
  "export.stepper.label.1": "Auswählen",
  "export.stepper.label.2": "Bearbeiten",
  "export.stepper.label.3": "Exportieren",

he:
  "export.stepper.label.1": "בחירה",
  "export.stepper.label.2": "עריכה",
  "export.stepper.label.3": "ייצוא",

cs (check file's existing accent encoding pattern first; if \u-escaped use \u; else raw):
  "export.stepper.label.1": "Vybrat",
  "export.stepper.label.2": "Upravit",
  "export.stepper.label.3": "Exportovat",

Verification before commit:
- node -c assets/add-session.js parses
- grep -q "modal.addEventListener" assets/add-session.js
- grep -q "export-step-pill" add-session.html
- All 4 i18n files contain export.stepper.label.1

Commit message: fix(22-11): event-delegated close handler + labelled step indicator
  </action>
  <verify>
    <automated>node -c assets/add-session.js &amp;&amp; grep -q "modal.addEventListener" assets/add-session.js &amp;&amp; grep -q "export-step-pill" add-session.html &amp;&amp; grep -q "export.stepper.label.1" assets/i18n-en.js &amp;&amp; grep -q "export.stepper.label.1" assets/i18n-de.js &amp;&amp; grep -q "export.stepper.label.1" assets/i18n-he.js &amp;&amp; grep -q "export.stepper.label.1" assets/i18n-cs.js</automated>
  </verify>
  <done>
    - Clicking X on any step (1, 2, OR 3) dismisses the modal — manual UAT step
    - The step indicator now reads "1 Choose — 2 Edit — 3 Export" with the active step's label highlighted in primary colour
    - On mobile (375px) the label sits below the dot; on desktop the label sits beside the dot
    - Cleanup correctly detaches the delegated listener on close (verified by no leak warnings on repeated open/close cycles)
    - In Hebrew, labels read correctly with RTL flow
    - No console errors on open/advance/close
  </done>
</task>

<task type="auto">
  <name>Task 2: Per-step contextual guidance — explanation paragraph on each step (Gap 2 part A)</name>
  <files>add-session.html, assets/app.css, assets/i18n-en.js, assets/i18n-de.js, assets/i18n-he.js, assets/i18n-cs.js</files>
  <action>
Step A — Update existing Step 1 helper text in i18n.

UPDATE the value of export.step1.helper in each i18n file (key already exists from Plan 06):

en: "Step 1 of 3 — Choose which session sections to include in the export. Your selection here decides what shows up in the editable preview on the next step."
de: "Schritt 1 von 3 — Wählen Sie aus, welche Sitzungsabschnitte exportiert werden sollen. Ihre Auswahl hier bestimmt, was im bearbeitbaren Vorschau-Editor im nächsten Schritt angezeigt wird."
he: "שלב 1 מתוך 3 — בחרי אילו חלקים של המפגש לכלול בייצוא. הבחירה כאן קובעת מה יופיע בעורך התצוגה המקדימה בשלב הבא."
cs: "Krok 1 ze 3 — Vyberte, které části sezení zahrnout do exportu. Tento výběr určí, co se zobrazí v editovatelném náhledu v dalším kroku."

Step B — Add Step 2 helper paragraph (NEW key + new HTML element).

In add-session.html, inside the Step 2 div (currently L417-427), insert immediately after the opening div tag and before the .export-mobile-tabs div:

    <p class="export-step-helper" data-i18n="export.step2.helper">Step 2 of 3 — Edit your document on the left; the live preview on the right shows how it will look. Formatting tips appear below if you need them.</p>

Add new key export.step2.helper to each i18n file:

en: "Step 2 of 3 — Edit your document on the left; the live preview on the right shows how it will look. Formatting tips appear below if you need them."
de: "Schritt 2 von 3 — Bearbeiten Sie das Dokument links; die Live-Vorschau rechts zeigt das Ergebnis. Formatierungstipps unten, falls Sie sie brauchen."
he: "שלב 2 מתוך 3 — ערכי את המסמך משמאל; התצוגה החיה מימין מראה כיצד הוא ייראה. טיפים לעיצוב מופיעים למטה במידת הצורך."
cs: "Krok 2 ze 3 — Upravte dokument vlevo; živý náhled vpravo ukazuje výsledek. Tipy k formátování najdete níže, pokud je potřebujete."

Step C — Update existing Step 3 helper text in i18n.

UPDATE the value of export.step3.helper in each i18n file:

en: "Step 3 of 3 — Choose how to deliver the document. PDF is best for printing or email; the text file works for any text editor; Share opens your device's share sheet (if supported)."
de: "Schritt 3 von 3 — Wählen Sie aus, wie das Dokument geliefert werden soll. PDF eignet sich am besten zum Drucken oder per E-Mail; die Textdatei funktioniert in jedem Texteditor; Teilen öffnet das Share-Menü Ihres Geräts (sofern unterstützt)."
he: "שלב 3 מתוך 3 — בחרי כיצד להעביר את המסמך. PDF מתאים להדפסה או דוא\"ל; קובץ הטקסט עובד בכל עורך טקסט; שיתוף פותח את גיליון השיתוף של המכשיר (אם נתמך)."
cs: "Krok 3 ze 3 — Vyberte, jak dokument doručit. PDF je nejlepší pro tisk nebo e-mail; textový soubor funguje v jakémkoli textovém editoru; Sdílení otevře sdílecí nabídku vašeho zařízení (je-li podporováno)."

Step D — Harmonise the existing Step 1 and Step 3 helper paragraphs to use the new helper class so styling is consistent.

In add-session.html:
- L412 currently: <p data-i18n="export.step1.helper">...</p>  ->  add class="export-step-helper"
- L431 currently: <p data-i18n="export.step3.helper">...</p>  ->  add class="export-step-helper"

After this change there should be exactly 3 occurrences of class="export-step-helper" in add-session.html — one per step.

Step E — Add CSS for .export-step-helper (assets/app.css, Phase 22 export modal block).

Append:

    .export-step-helper {
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--color-text-muted);
      margin-block: 0 16px;
      padding-block-end: 12px;
      border-block-end: 1px solid var(--color-border-soft);
    }

Verification before commit:
- 3 occurrences of export-step-helper in add-session.html (one per step)
- export.step2.helper exists in all 4 i18n files
- node -c on each i18n file passes

Commit message: fix(22-11): per-step contextual guidance for therapist self-orientation
  </action>
  <verify>
    <automated>test "$(grep -c 'export-step-helper' add-session.html)" = "3" &amp;&amp; grep -q "export.step2.helper" assets/i18n-en.js &amp;&amp; grep -q "export.step2.helper" assets/i18n-de.js &amp;&amp; grep -q "export.step2.helper" assets/i18n-he.js &amp;&amp; grep -q "export.step2.helper" assets/i18n-cs.js &amp;&amp; grep -q "\.export-step-helper" assets/app.css &amp;&amp; node -c assets/i18n-en.js &amp;&amp; node -c assets/i18n-de.js &amp;&amp; node -c assets/i18n-he.js &amp;&amp; node -c assets/i18n-cs.js</automated>
  </verify>
  <done>
    - Each step shows a 1-2 sentence helper paragraph just under the title that explains "what is this step / what should I do"
    - All three helpers visually share the same style (greyed text, divider underneath)
    - Helpers translate correctly when language is switched
    - Helpers respect RTL layout in Hebrew
  </done>
</task>

<task type="auto">
  <name>Task 3: Step 2 markdown formatting cheatsheet for non-markdown users (Gap 2 part B)</name>
  <files>add-session.html, assets/app.css, assets/i18n-en.js, assets/i18n-de.js, assets/i18n-he.js, assets/i18n-cs.js</files>
  <action>
Step A — Add the formatting cheatsheet block in HTML.

In add-session.html, inside the Step 2 div, after the .export-edit-area div (which contains textarea + preview), AND before the closing </div> of the Step 2 step container (L427), insert:

    <details class="export-format-help">
      <summary data-i18n="export.format.help.title">Formatting tips (click to expand)</summary>
      <ul class="export-format-help-list">
        <li><code>**bold**</code> &mdash; <span data-i18n="export.format.help.bold">surround text with two stars to make it bold</span></li>
        <li><code>*italic*</code> &mdash; <span data-i18n="export.format.help.italic">surround text with one star to make it italic</span></li>
        <li><code># Heading</code> &mdash; <span data-i18n="export.format.help.heading">start a line with # for a heading; ## for a smaller heading</span></li>
        <li><code>- list item</code> &mdash; <span data-i18n="export.format.help.list">start a line with a dash and a space to create a bullet list</span></li>
      </ul>
    </details>

(Use details/summary instead of an always-expanded block: less screen real estate by default; opens with one click. The HTML5 details element is supported in all current browsers including Safari 6+.)

Step B — CSS for the formatting helper (assets/app.css, Phase 22 export modal block).

Append:

    .export-format-help {
      margin-block-start: 16px;
      padding: 12px 16px;
      background: var(--color-surface-subtle);
      border-radius: 12px;
      font-size: 0.8125rem;
    }
    .export-format-help summary {
      cursor: pointer;
      font-weight: 600;
      color: var(--color-text);
      padding-block: 4px;
      list-style: none;
    }
    .export-format-help summary::-webkit-details-marker { display: none; }
    .export-format-help summary::before {
      content: "▸";
      display: inline-block;
      margin-inline-end: 8px;
      transition: transform 120ms ease-in-out;
    }
    .export-format-help[open] summary::before {
      transform: rotate(90deg);
    }
    html[dir="rtl"] .export-format-help summary::before {
      content: "◂";
    }
    html[dir="rtl"] .export-format-help[open] summary::before {
      transform: rotate(-90deg);
    }
    .export-format-help-list {
      list-style: none;
      padding: 0;
      margin: 8px 0 0 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .export-format-help-list li {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
      color: var(--color-text-muted);
      line-height: 1.4;
    }
    .export-format-help-list code {
      font-family: var(--font-mono, ui-monospace, monospace);
      background: var(--color-surface);
      border: 1px solid var(--color-border-soft);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 0.8125rem;
      color: var(--color-text);
      white-space: nowrap;
    }

Step C — i18n keys (5 new keys per language).

Append to each i18n file:

en:
  "export.format.help.title": "Formatting tips (click to expand)",
  "export.format.help.bold": "surround text with two stars to make it bold",
  "export.format.help.italic": "surround text with one star to make it italic",
  "export.format.help.heading": "start a line with # for a heading; ## for a smaller heading",
  "export.format.help.list": "start a line with a dash and a space to create a bullet list",

de:
  "export.format.help.title": "Formatierungstipps (zum Aufklappen klicken)",
  "export.format.help.bold": "Text mit zwei Sternen umschließen für Fettdruck",
  "export.format.help.italic": "Text mit einem Stern umschließen für Kursivschrift",
  "export.format.help.heading": "Zeile mit # beginnen für eine Überschrift; ## für eine kleinere Überschrift",
  "export.format.help.list": "Zeile mit Bindestrich und Leerzeichen beginnen für eine Aufzählung",

he:
  "export.format.help.title": "טיפים לעיצוב (לחיצה לפתיחה)",
  "export.format.help.bold": "הקיפי טקסט בשני כוכבים כדי שיהיה מודגש",
  "export.format.help.italic": "הקיפי טקסט בכוכב אחד כדי שיהיה נטוי",
  "export.format.help.heading": "התחילי שורה ב־# לכותרת; ב־## לכותרת קטנה יותר",
  "export.format.help.list": "התחילי שורה במקף ורווח כדי ליצור רשימה עם תבליטים",

cs (match existing file's accent encoding pattern):
  "export.format.help.title": "Tipy k formátování (klikněte pro rozbalení)",
  "export.format.help.bold": "obklopte text dvěma hvězdičkami pro tučné písmo",
  "export.format.help.italic": "obklopte text jednou hvězdičkou pro kurzívu",
  "export.format.help.heading": "začněte řádek znakem # pro nadpis; ## pro menší nadpis",
  "export.format.help.list": "začněte řádek pomlčkou a mezerou pro vytvoření seznamu s odrážkami",

Verification before commit:
- grep -q "export-format-help" add-session.html
- grep -q "export.format.help.bold" in all 4 i18n files
- node -c on each i18n file
- The literal markdown chars (** * # -) inside <code> blocks render verbatim regardless of locale

Commit message: fix(22-11): add markdown formatting cheatsheet to Step 2 (no prior markdown knowledge needed)
  </action>
  <verify>
    <automated>grep -q "export-format-help" add-session.html &amp;&amp; grep -q "export.format.help.bold" assets/i18n-en.js &amp;&amp; grep -q "export.format.help.bold" assets/i18n-de.js &amp;&amp; grep -q "export.format.help.bold" assets/i18n-he.js &amp;&amp; grep -q "export.format.help.bold" assets/i18n-cs.js &amp;&amp; grep -q "\.export-format-help" assets/app.css &amp;&amp; node -c assets/i18n-en.js &amp;&amp; node -c assets/i18n-de.js &amp;&amp; node -c assets/i18n-he.js &amp;&amp; node -c assets/i18n-cs.js</automated>
  </verify>
  <done>
    - Step 2 shows a collapsible "Formatting tips" panel below the editor/preview area
    - Clicking the summary expands it to show 4 bullet examples: bold, italic, heading, list
    - Each bullet shows the literal markdown syntax in a code-styled chip plus a plain-language explanation
    - Cheatsheet is translated in all 4 languages
    - In Hebrew (RTL) the caret arrow points correctly and the list items flow right-to-left
    - The therapist who has never seen markdown can apply formatting by reading the cheatsheet and trying it in the editor (live preview confirms)
  </done>
</task>

</tasks>

<verification>
After all 3 tasks land:

1. node -c assets/add-session.js parses
2. node -c on each of the 4 i18n files passes
3. grep -q "modal.addEventListener" assets/add-session.js (delegated listener present)
4. grep -c "export-step-pill" add-session.html returns 3 (one per step)
5. grep -c "export-step-helper" add-session.html returns 3 (one helper per step)
6. grep -q "export-format-help" add-session.html (cheatsheet block present)
7. All NEW i18n keys present in en/de/he/cs:
   - export.stepper.label.1 / .2 / .3
   - export.step2.helper
   - export.format.help.title / .bold / .italic / .heading / .list
8. Phase 22 CSS block in assets/app.css contains: .export-step-pill, .export-step-label, .export-step-helper, .export-format-help, .export-format-help-list, .modal-close z-index rule

Manual UAT (must be performed by user after deploy):
- Open any session in read mode and click Export
- Step 1: see "1 Choose" / "2 Edit" / "3 Export" with "Choose" highlighted; helper paragraph reads "Step 1 of 3 — ..."
- Click Next
- Step 2: see updated stepper highlighting "Edit"; helper paragraph reads "Step 2 of 3 — ..."; below the editor see "Formatting tips" details element; click it open and verify 4 bullets
- Type **test** in editor; verify the live preview renders "test" in bold
- Click Next
- Step 3: see updated stepper highlighting "Export"; helper paragraph reads "Step 3 of 3 — ..."
- Click X — modal dismisses
- Open again, advance to Step 3, click X — modal dismisses
- Switch language to Hebrew, repeat — all helper text and stepper labels read in Hebrew, layout flows RTL, formatting tips expand correctly
</verification>

<success_criteria>
- All 3 UAT truth statements become provable in 22-HUMAN-UAT.md (status flips from failed to closed-fixed after manual UAT)
- Zero new console errors when opening/navigating/closing the export modal
- All existing Plan 06 acceptance criteria still pass (no regression in: 9 section wrappers, buildSessionMarkdown getSectionLabel coverage, applySectionVisibility, openExportDialog state machine, share probe, PDF/MD/Share output paths)
- 3 atomic commits land on the working branch (one per task)
</success_criteria>

<output>
After completion, create .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-11-export-modal-ux-fixes-SUMMARY.md per the template, recording:
- Each commit SHA
- Which UAT gap each commit closes
- Root cause finding for the Step 3 X-button bug (z-index? cleanup ordering? something else?)
- Any deviations from the plan
- The verification grep results
</output>
</content>
