---
phase: quick-260722-rew
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - assets/snippets.js
  - tests/quick-260722-rew-trigger-formatting.test.js
autonomous: true
requirements: [QUICK-260722-REW]
must_haves:
  truths:
    - "Typing the snippet prefix + trigger characters immediately after an inline formatting marker (bold, italic-star, italic-underscore, tilde, backtick) shows the autocomplete popover — the reported bug scenario (toolbar Bold inserts paired markers with caret between, then prefix + initials) now surfaces candidates"
    - "Typing prefix + full trigger + word-boundary inside bold markers auto-expands the snippet and leaves the surrounding markers intact (expansion lands inside the formatting)"
    - "Typing a closing marker character directly after a complete trigger commits the expansion with the marker preserved as the boundary"
    - "Plain-text triggering (prefix at line start or after space/punctuation) behaves exactly as before; mid-word text (letters directly before the prefix) still does NOT trigger"
    - "Hyphen remains a valid trigger character (multi-segment triggers still match) — it is NOT treated as a boundary"
  artifacts:
    - "tests/quick-260722-rew-trigger-formatting.test.js — falsifiable behavior test: RED against pre-fix detectTrigger, GREEN after"
    - "assets/snippets.js — detectTrigger boundary character classes accept inline formatting markers on both sides"
  key_links:
    - "detectTrigger leading boundary class → popover appearance inside formatted spans (the reported failure)"
    - "detectTrigger trailing boundary class → inline auto-expansion commit when a closing marker is typed"
---

<objective>
Fix snippet autocomplete failing inside markdown formatting markers in session-notes textareas (locked fix direction: formatting-aware trigger detection as a GENERAL rule — markers are word-boundary characters, not a special-case for bold).

Bug: the rich-text toolbar's Bold button inserts paired `**` markers with the caret between them; typing the snippet prefix (Ben's is `??`, default `;`) plus trigger initials shows no autocomplete. Root cause: `detectTrigger` in `assets/snippets.js` (regex built at lines 96-100) requires the single character before the prefix to match `(^|[\s.,;:!?])` — formatting marker characters are not in that class, so `**??betr` never matches.

Fix: add the inline marker characters (asterisk, underscore, tilde, backtick) to BOTH boundary character classes — leading (word-start) and trailing (commit boundary). List markers and heading prefixes need no change (they end with a space, which is already a boundary). Hyphen must NOT be added (it is a valid trigger character per the `[\p{L}\p{N}-]` trigger class).

Purpose: snippets must work inside ANY formatting context the editor can produce.
Output: fixed `assets/snippets.js` + falsifiable behavior test, atomic commit carrying the docs-gate trailer.
</objective>

<context>
@assets/snippets.js            — detectTrigger at lines 87-187; regex at 96-100; docstring 71-86; module header CONSTRAINTS note around line 16; __testExports at line 552 exposes detectTrigger
@tests/24-04-trigger-regex.test.js — vm-sandbox harness pattern to model the new test on (loads assets/snippets.js, reads window.Snippets.__testExports)
@assets/rich-toolbar.js        — doEmphasis (line 477) emits markers "**" (bold) and "*" (italic) via cases at lines 1055-1056; list/heading insertions all end with a space
@scripts/lib/role-table.js     — CHANGELOG_ONLY list at lines 120-132; assets/snippets.js is NOT a member → TRIGGER tier (see Docs-gate note below)
</context>

<docs_gate_note>
Verified against `scripts/lib/role-table.js`: `assets/snippets.js` is NOT in the CHANGELOG_ONLY list — it is a full TRIGGER-tier watched file (Ben's "likely changelog-only" guess does not hold). Consequences for the executor:

1. **Help demand (file-scoped):** put this trailer on the fix commit (file-scoped trailers are honored from ANY commit in a pushed range, so placing it now settles it permanently):
   `Help-Unaffected: assets/snippets.js — bug fix; snippet autocomplete behavior matches the existing help topic, no help surface change`
2. **Changelog demand (push-global):** do NOT edit the changelog in this quick fix. v1.4.0 just shipped; opening a new version section forces a version-bump decision that does not belong in a quick task. The demand is satisfied at push time by whatever EN changelog edit accompanies the next release, or Ben places `Changelog-Unaffected:` on the tip commit if this ships alone. Record this open demand in the SUMMARY so it surfaces at push time.
3. The new test file under `tests/` is not shipped and raises no demand.
</docs_gate_note>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Failing behavior test for formatting-aware trigger detection</name>
  <files>tests/quick-260722-rew-trigger-formatting.test.js</files>
  <behavior>
    Model the harness on the existing trigger-regex test (vm sandbox loading the snippets asset, reading `window.Snippets.__testExports.detectTrigger`; exit 0 full pass / 1 any failure). Build a `snippetsByTrigger` Map with triggers `betrayal`, `heart-shock`, `physical-trauma`. Scenarios:
    - A (the reported bug): text ending `**` + prefix `;` + `betr` → returns a partial result whose candidates include the betrayal snippet, and whose start/end range covers ONLY prefix+query (so popover replacement preserves the markers). Pre-fix this returns null → RED.
    - B (repro with Ben's prefix): prefix `??`, text ending `**??betr` → partial with candidates. Pre-fix null → RED.
    - C (commit inside bold): `**;betrayal ` → type "match", boundary is the space, start points at the prefix character (both leading markers preserved outside the replacement range).
    - D (other markers): `*;betr`, `_;betr`, and nested `**_;betr` each → partial with candidates.
    - E (closing-marker commit): `;betrayal*` → type "match" with boundary `*`, end excludes the marker (per-keystroke input means the first star of a closing pair commits the expansion and the markers stay balanced).
    - F (regressions, must pass pre-fix AND post-fix): `email;betrayal ` → null (mid-word guard intact); `;betrayal ` → match; `;betr` → partial; `;heart-shock ` → match (hyphen stays a trigger character, NOT a boundary).
    - G (ReDoS budget): adversarial long input (~10000 chars of repeated prefix characters) completes in under 50ms — keeps the safety guarantee stated in the source comments honest after the class change.
  </behavior>
  <action>
    Create the test file with the scenarios above, using the same minimal-browser-globals sandbox as the existing trigger-regex test. Assert positions behaviorally (e.g. `value.slice(start, end)` equals the prefix+trigger text) rather than hardcoding indices. Run it against the CURRENT source and confirm it FAILS (scenarios A/B/D/E fail; F passes) — this is the RED proof required by the project's behavior-verification convention.
  </action>
  <verify>
    <automated>! node tests/quick-260722-rew-trigger-formatting.test.js</automated>
  </verify>
  <done>Test file exists, runs under plain node, and exits non-zero against the unmodified source with the formatting-context scenarios reported as the failures.</done>
</task>

<task type="auto">
  <name>Task 2: Make detectTrigger formatting-aware and go GREEN</name>
  <files>assets/snippets.js</files>
  <action>
    In `detectTrigger` (regex construction, currently lines 96-100): add the four inline marker characters — asterisk, underscore, tilde, backtick — to BOTH boundary character classes: the leading group (currently start-of-string or one of whitespace and `.,;:!?`) and the optional trailing group (currently whitespace, `.,;:!?`, newline). Inside a character class these characters need no regex escaping; mind only JS string escaping when editing the class literals. Do NOT add hyphen (valid trigger character). Do not touch the trigger character class, the quantifier bounds, or any matching logic — the fix is confined to the two boundary classes.

    Update the comments to stay truthful: the function docstring (lines 71-86), the inline regex comment block (lines 89-95), and the module-header CONSTRAINTS note (around line 16) should state that inline formatting markers count as word boundaries on both sides so triggers fire inside formatted spans, with expansion replacing only prefix+trigger (markers preserved). Comments describe behavior only — no planning identifiers, task IDs, or workflow references in shipped code (CONVENTIONS.md §Comments is locked).

    Commit both files atomically with the docs-gate trailer from the Docs-gate note:
    `Help-Unaffected: assets/snippets.js — bug fix; snippet autocomplete behavior matches the existing help topic, no help surface change`
  </action>
  <verify>
    <automated>node tests/quick-260722-rew-trigger-formatting.test.js && node tests/run-all.js && test "$(grep -cE 'Phase [0-9]|26[0-9]{4}' assets/snippets.js)" -eq 0</automated>
  </verify>
  <done>New behavior test exits 0; full suite (`tests/run-all.js`) exits 0 — covering the existing trigger-regex scenarios, snippet wiring, textarea autogrow, and the toolbar/emphasis suites, which proves the no-regression constraint; snippets.js contains no planning-ID patterns; commit carries the Help-Unaffected trailer.</done>
</task>

</tasks>

<verification>
- `node tests/quick-260722-rew-trigger-formatting.test.js` → exit 0 (formatting contexts trigger; regressions hold; ReDoS budget kept).
- `node tests/run-all.js` → exit 0 (full green gate: trigger-regex, tag-trigger, trigger-dedupe, trigger-unicode, trigger-autoconvert, snippet-enter-yield, snippet wiring, textarea autogrow, rich-toolbar/emphasis suites).
- Manual spot-check (optional, for Ben's UAT): in a session-notes textarea press Bold, type the snippet prefix + snippet initials between the markers → popover appears; select a snippet → expansion lands inside the markers.
</verification>

<success_criteria>
- The reported bug scenario (toolbar Bold → prefix + initials between markers) shows the autocomplete popover and expands correctly, for any marker the editor grammar knows (bold, italic star/underscore, tilde, backtick), as a general boundary rule.
- Zero regressions: plain triggering, mid-word guard, hyphenated triggers, Unicode triggers, smart-commit, textarea autogrow, and toolbar behavior all verified by the existing suite staying green.
- Behavior test is falsifiable (demonstrated RED before the fix, GREEN after).
- Shipped-code comments carry no planning IDs; commit carries the Help-Unaffected trailer; the open push-global changelog demand is recorded in the SUMMARY.
</success_criteria>

<output>
Create `.planning/quick/260722-rew-snippet-trigger-formatting/260722-rew-SUMMARY.md` when done. Record there: the docs-gate status (Help demand settled via trailer on the fix commit; changelog demand OPEN — satisfied by the next release's EN changelog edit or a `Changelog-Unaffected:` trailer on the eventual push tip).
</output>
