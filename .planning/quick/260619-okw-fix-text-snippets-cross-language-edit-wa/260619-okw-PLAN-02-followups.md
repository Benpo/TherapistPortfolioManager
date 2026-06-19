---
phase: quick-260619-okw
plan: 02
type: execute
wave: 1
depends_on: [01]
base_commit: e9a6910
files_modified:
  - assets/settings.js
  - assets/app.css
  - settings.html
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
  - tests/24-05-modified-seed.test.js
must_haves:
  truths:
    - "A seed snippet the user never edited (updatedAt === createdAt) is NOT treated as modified, even if its text differs from the current seed pack (version drift) — so it is NOT exported and shows no Reset-to-default button"
    - "A seed snippet the user actually edited (updatedAt > createdAt) IS treated as modified — exported and offered Reset-to-default"
    - "The cross-language editor warning reads naturally in all 4 languages and names the current language and the languages that have content"
    - "The Edit translations toggle shows a translation icon (not a bullet/chevron) AND keeps its text label"
    - "The snippet import collision dialog shows the bare trigger (no prefix char, no phantom ? in RTL)"
  artifacts:
    - path: assets/settings.js
      provides: "isModifiedSeed uses updatedAt>createdAt (timestamp) signal; openEditor interpolates {current}+{langs}; collision row shows bare trigger"
      contains: "updatedAt > snippet.createdAt"
    - path: tests/24-05-modified-seed.test.js
      provides: "Falsifiable test: drift (content differs, timestamps equal) => NOT modified; edit (updatedAt bumped) => modified"
---

<objective>
Four follow-up fixes from Ben's UAT of quick task 260619-okw (the Text Snippets feature).
One plan, four atomic commits. Base commit e9a6910.

1. **Export false-positive (real bug)** — `isModifiedSeed` byte-compares each seed against the
   live seed pack, so a seed whose pack text drifted between app versions (re-seeding is
   additive-only) is wrongly flagged "modified" and gets exported even though the user never
   touched it. Confirmed case: `seed.unreceived-effort` / `seed.unreceived-love` — the EN title
   word order was changed in the seed pack ("Unreceived Effort" → "Effort Unreceived") in a later
   version; the user's IndexedDB kept the old text; both have `updatedAt === createdAt`
   (2026-05-14, never edited) yet exported. Fix: treat a seed as modified ONLY when
   `updatedAt > createdAt` (the signal every real user edit sets).
2. **Warning copy** — rewrite the cross-language editor warning in all 4 languages to read
   naturally, and name the CURRENT language too (new `{current}` placeholder alongside `{langs}`).
3. **Toggle icon** — the `▸` chevron reads as a bullet; replace it with a translation icon
   (Material "translate" SVG). KEEP the existing text label.
4. **Import collision display** — the collision rows render `prefix + trigger`; the prefix char
   (`?`) gets bidi-reordered to the end in RTL and looks like the trigger has a `?`. Show the bare
   trigger instead (matches the main list convention at settings.js ~1054).
</objective>

<critical_design_note>
DO NOT make `isModifiedSeed` airtight by force-bumping `updatedAt` inside `db.updateSnippet`.
Backup restore (`assets/backup.js:1084`) calls `db.updateSnippet(snip)` passing the snippet
AS-IS to preserve its backed-up timestamps. Force-bumping there would make every restored seed
look modified — reintroducing the exact false positive. The DB layer MUST preserve caller
timestamps. The edit path (`handleSave`) owns the bump and already sets `updatedAt: now`. The
invariant is: every seed-EDIT path bumps updatedAt; reset/seed/restore preserve it. Verified
paths: handleSave (bumps), applyImport replace (bumps), resetSeedSnippet (resets to seed ts),
backup restore (preserves). Do not add a 5th seed-mutation path without bumping updatedAt.
</critical_design_note>

<test_harness_note>
Pure-function tests, vm sandbox, no jsdom. Reuse the harness in tests/24-05-modified-seed.test.js
verbatim (it already loads assets/settings.js and reads window.__SnippetEditorHelpers.isModifiedSeed).
Run: node tests/24-05-modified-seed.test.js   (exit 0 = pass). RED gate is mandatory.
</test_harness_note>

<i18n_copy>
<!-- Ben-approved. EN/HE/DE/CS final. DE uses formal "Sie" and term "Textbaustein". -->
<!-- Two placeholders, both replaced in JS: {current} = current language name, {langs} = comma list. -->

"snippets.editor.langWarning" (REPLACE existing value in all 4 files):
  en: "This snippet has no text in the current language ({current}). You can view and edit its existing translations ({langs}) by clicking the “Edit translations” button below."
  he: "להשלמה זו לא קיים ערך בשפה הנוכחית ({current}). ניתן לצפות ולערוך את הערכים הקיימים ({langs}) על ידי לחיצה על כפתור „עריכת תרגומים” המופיע מטה."
  de: "Dieser Textbaustein hat keinen Text in der aktuellen Sprache ({current}). Sie können die vorhandenen Übersetzungen ({langs}) über die Schaltfläche „Übersetzungen bearbeiten“ unten ansehen und bearbeiten."
  cs: "Tento úryvek nemá text v aktuálním jazyce ({current}). Stávající překlady ({langs}) můžete zobrazit a upravit kliknutím na tlačítko „Upravit překlady“ níže."

Language-name keys (snippets.lang.name.{en,he,de,cs}) already exist from plan 01 — reuse, do not re-add.
</i18n_copy>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: isModifiedSeed = timestamp signal (fix export false-positive)</name>
  <files>tests/24-05-modified-seed.test.js, assets/settings.js</files>
  <behavior>
    isModifiedSeed(snippet, seedPack) returns true IFF snippet.origin==='seed' AND a seed-pack
    entry with the same id exists AND snippet.updatedAt > snippet.createdAt. It NO LONGER returns
    true on byte differences (content/trigger/tags) when timestamps are equal — that is
    seed-pack version drift, not a user edit.
  </behavior>
  <action>
    RED: Update tests/24-05-modified-seed.test.js to the corrected contract:
      - C (updatedAt > createdAt) → true  (keep)
      - D (timestamps equal, content matches pack) → false (keep)
      - E (timestamps equal, ONE locale expansion differs) → flip to FALSE (was true)
      - F (timestamps equal, tags differ) → flip to FALSE
      - G (timestamps equal, trigger differs) → flip to FALSE
      - H (timestamps equal, trailing-whitespace diff) → flip to FALSE
      - ADD scenario reproducing Ben's case: origin='seed', id matches pack, EN expansion differs
        from pack (word-order drift), updatedAt === createdAt → FALSE.
      - ADD scenario: edited seed whose content happens to match pack but updatedAt > createdAt → TRUE.
      Update the file's header comment block (it currently documents "byte-exact" semantics) to
      describe the timestamp semantics and WHY (version drift). Run against unchanged settings.js
      and confirm the flipped scenarios FAIL (old byte-exact code returns true). Capture RED output.

    GREEN: In assets/settings.js, replace the isModifiedSeed body (the byte-compare block) with:
      function isModifiedSeed(snippet, seedPack) {
        if (!snippet || snippet.origin !== "seed") return false;
        var match = null;
        for (var i = 0; i < seedPack.length; i++) {
          if (seedPack[i].id === snippet.id) { match = seedPack[i]; break; }
        }
        if (!match) return false;
        // "Modified" === the user actually edited this seed, which always bumps updatedAt past
        // createdAt (see handleSave). We deliberately do NOT byte-compare against the live seed
        // pack: pack text can change between app versions while re-seeding is additive-only, so an
        // untouched seed whose pack text drifted would be a false positive (wrong export + wrong
        // Reset-to-default). Timestamp is the airtight signal. See PLAN-02 critical_design_note.
        return !!(snippet.updatedAt && snippet.createdAt && snippet.updatedAt > snippet.createdAt);
      }
      Also add a one-line comment at handleSave's `updatedAt: now` (edit branch) noting it is the
      invariant the export/Reset logic depends on — do NOT change its behavior.
    Re-run until green.
  </action>
  <verify>
    <automated>node tests/24-05-modified-seed.test.js && node tests/24-05-list-filter.test.js && node tests/24-04-shape-validator.test.js</automated>
  </verify>
  <done>RED captured (flipped scenarios failed pre-change). modified-seed test passes with timestamp semantics incl. Ben's drift case and the edited-but-content-matches case. No other snippet test regresses.</done>
</task>

<task type="auto">
  <name>Task 2: Natural-language warning copy + {current} placeholder</name>
  <files>assets/i18n-en.js, assets/i18n-he.js, assets/i18n-de.js, assets/i18n-cs.js, assets/settings.js</files>
  <action>
    1. In all four i18n files, REPLACE the value of "snippets.editor.langWarning" with the
       corresponding string from <i18n_copy> (DE uses "Textbaustein" and "Sie").
    2. In assets/settings.js openEditor, where the warning text is composed, add the {current}
       interpolation alongside the existing {langs} one:
         var curName = t("snippets.lang.name." + lang);
         var names = w.otherLangs.map(function (loc) { return t("snippets.lang.name." + loc); }).join(", ");
         warnEl.textContent = String(t("snippets.editor.langWarning") || "")
           .replace("{current}", curName)
           .replace("{langs}", names);
       Keep textContent (never innerHTML).
  </action>
  <verify>
    <manual>EN + HE: open a snippet whose current language is empty but another has text → warning reads naturally, names the current language in parentheses and lists the languages with content, and both {current}/{langs} are substituted (no literal braces).</manual>
    <automated>node tests/quick-260619-okw-cross-lang-warning.test.js</automated>
  </verify>
  <done>All four locales updated; openEditor substitutes both placeholders; cross-lang-warning helper test still passes.</done>
</task>

<task type="auto">
  <name>Task 3: Replace chevron with a translation icon (keep label)</name>
  <files>settings.html, assets/app.css</files>
  <action>
    1. settings.html — in #snippetEditorTranslationsToggle, replace the chevron span
       (<span class="snippets-translations-chevron" ...>▸</span>) with an inline translate SVG,
       and KEEP the existing <span class="button-label" data-i18n="snippets.editor.translations.toggle">:
         <svg class="snippets-translations-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" fill="currentColor"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>
    2. assets/app.css — remove the .snippets-translations-chevron rules and the chevron rotation +
       RTL chevron rules added in plan 01. Add:
         .snippets-translations-icon { inline-size: 1.1em; block-size: 1.1em; flex: 0 0 auto; }
       Keep .snippets-translations-toggle (align-self:flex-start, inline-flex, gap) and the
       .is-attention ring.
  </action>
  <verify>
    <manual>Editor: the Edit translations button shows a translate icon + the text label, no bullet/chevron; attention ring still appears when the warning is active; layout fine in LTR and RTL.</manual>
  </verify>
  <done>Chevron removed (markup + CSS); translate SVG icon present; text label retained; attention state intact.</done>
</task>

<task type="auto">
  <name>Task 4: Import collision dialog shows bare trigger</name>
  <files>assets/settings.js</files>
  <action>
    In openCollisionModal (assets/settings.js, ~line 1648), change the collision label to show the
    bare trigger:  label.textContent = c.trigger;  (drop the "prefix + " concatenation). Remove the
    now-unused prefix lookup lines in that function (the `var prefix = ""; try { prefix =
    window.Snippets.getPrefix(); } ...` block) IF prefix is not used elsewhere in openCollisionModal.
    This matches the main list, which already shows the bare trigger (see the comment at ~settings.js:1054).
  </action>
  <verify>
    <manual>Import a JSON with a trigger that collides with an existing snippet, in Hebrew (RTL): the collision row shows the trigger with NO leading/trailing prefix char and no phantom "?".</manual>
  </verify>
  <done>Collision rows render bare triggers; unused prefix lookup removed; no "?" artifact in RTL.</done>
</task>

</tasks>

<commits>
Four atomic commits (code only; orchestrator handles docs):
1. fix(snippets): treat seeds as modified only when user-edited (updatedAt>createdAt), not on seed-pack drift
2. fix(snippets): rewrite cross-language warning copy + name current language (he/de/cs/en)
3. fix(snippets): replace Edit-translations chevron with a translation icon
4. fix(snippets): show bare trigger in import collision dialog (drop prefix, fixes RTL "?")
End each commit body with: Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
</commits>

<verification>
- node tests/24-05-modified-seed.test.js (timestamp semantics, incl. drift + edited-matches cases) — pass; RED proven pre-change.
- node tests/24-05-list-filter.test.js, tests/24-04-shape-validator.test.js, tests/quick-260619-okw-cross-lang-warning.test.js, tests/quick-260619-okw-trigger-unicode.test.js — all pass (no regression).
- Manual: warning copy (EN/HE), translate icon + label, import collision bare trigger in RTL.
</verification>

<output>
Create .planning/quick/260619-okw-fix-text-snippets-cross-language-edit-wa/260619-okw-SUMMARY-02.md
with per-task RED/GREEN evidence (Task 1), the four commit hashes, and any deviations.
</output>
