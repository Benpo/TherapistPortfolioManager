# Phase 24: Pre-Launch Final Cleanup — Specification

**Created:** 2026-05-14
**Ambiguity score:** 0.13 (gate: ≤ 0.20)
**Requirements:** 9 locked

**Subject of this SPEC:** Item 3 of Phase 24 — *Emotions / Specific-Text Quick-Paste* (the new text-snippet expansion feature). The other 5 Phase 24 items (dropdown spotlight bug, edit-session Cancel/Revert + clock-icon button wording, MD `##` bug + single-newline rendering decision, overview clock-icon severity reversal, pre-session-context-card integration) are already-specified bug fixes / polish items whose source TODOs serve as their specifications — they go directly to `/gsd-discuss-phase` / `/gsd-plan-phase` without needing a separate SPEC.

## Goal

Therapists can define text snippets that expand inline when typed in eligible session textareas. A user-configurable prefix (default `;`) plus a slug-form keyword (e.g., `;betrayal`) is detected as the user types; on word-boundary the trigger is replaced with the snippet's expansion text, picked from a 4-locale (HE/EN/CS/DE) per-snippet data shape according to the current app language. Sapir's Emotion Code chart (60 emotions × 4-locale meaning paragraphs) ships as the auto-installed default snippet library; therapists can edit / delete / add freely. Management lives in a new "Text Snippets" section of the existing Settings page.

## Background

**Existing app state (relevant to this feature):**
- `add-session.html` has 7 session-form textareas, each carrying a `data-section-key` attribute and an `i18n` placeholder. These are the target textareas for snippet expansion in v1: `trappedEmotions`, `heartShieldEmotions`, `sessionInsights`, `limitingBeliefs`, `additionalTech`, `sessionComments`, `customerSummary`.
- Phase 22 introduced a `therapistSettings` IndexedDB object store and an `App.getSectionLabel` / `_sectionLabelCache` pattern (`assets/app.js:39, 54, 379`). Section labels are already user-editable from Settings. This is the natural home for snippet management UI.
- No existing snippet, template, or text-expansion infrastructure anywhere in `assets/`.
- IndexedDB schema is at v3 after Phase 22's additive migration (`assets/db.js:248`).
- Full-app backup exists (`assets/backup.js`) and serializes all object stores via the manifest pattern.
- Pre-commit hook auto-bumps `sw.js` CACHE_NAME on asset commits — do not pre-bump manually.

**Source of seed-pack content:**
- Sapir's 15-page PDF "Emotion Code — רשימת רגשות" (`.planning/todos/pending/2026-05-07_emotions-quick-paste - Sapir's feedback - Text to include.pdf`), header notes "Edited for consistent plural Hebrew, simplified Hebrew/English wording, examples removed, and Czech/German meanings added."
- Structure: classic Emotion Code chart — 12 cells organized as Columns A (rows 1–6) and B (rows 1–6), each cell containing 5 emotions, total 60 entries.
- Per emotion: title in 4 languages + a meaning paragraph in 4 languages (HE/EN/CS/DE). A small number of cells in the PDF have specific locales missing — fallback rule handles these gracefully.
- The 12 cells correspond to organ-meridian groupings (Heart-Small Intestine, Spleen-Stomach, etc.) — useful as tag metadata.

**Why this feature now:** Sapir's UAT 2026-05-07 flagged it as high-priority. Therapists currently free-type long emotion descriptions or copy-paste from external docs — high friction, high error rate. With ~60 standard emotions used repeatedly across sessions, snippets reclaim significant time per session and standardize clinical-record content.

## Requirements

1. **Snippet trigger engine** — inline detection of `<prefix><keyword>` in textareas marked `data-snippets="true"`, expanding on word-boundary.
   - Current: No expansion engine exists; therapists type or copy-paste long emotion descriptions manually.
   - Target: A textarea marked `data-snippets="true"` detects the pattern `<prefix><keyword>` as the user types. When the keyword matches an existing snippet AND a word-boundary character is typed next (whitespace, Enter, common punctuation like `.,;:!?`), the matched `<prefix><keyword>` substring is replaced with the snippet's expansion text in the current app language. The word-boundary character itself is preserved after the expansion. Implementation: a single shared module wired by attribute, not per-textarea logic.
   - Acceptance: With prefix `;` and a snippet whose trigger is `betrayal` with EN expansion `"Betrayal is the experience of broken trust..."`, typing `;betrayal ` (with trailing space) in a marked textarea replaces those 9 characters with the snippet text followed by the trailing space. Typing `;betrayal` (no boundary character) leaves the textarea unchanged.

2. **User-configurable prefix** — default `;`, editable in Settings. 1–2 characters supported.
   - Current: No prefix concept exists.
   - Target: A setting `snippetPrefix` lives in the existing `therapistSettings` IDB store, defaulting to `;`. Settings UI exposes a short text input limited to 1–2 characters. Validation: 1 or 2 characters; each character must not be whitespace, a letter, or a digit (would clash with keyword characters); must not be a quote or angle bracket (would clash with HTML/markdown). Two-character prefixes (e.g., `::`, `;;`, `??`, `>>`) are explicitly supported to reduce false-trigger risk against natural single-character usage (`:` in time formats, `/` in dates). Changing the prefix globally re-keys trigger detection — no per-snippet prefix override.
   - Acceptance: User changes prefix from `;` to `::` in Settings. After save, typing `::<trigger>` + word-boundary fires expansion; typing `;<trigger>` + word-boundary no longer fires. Validation rejects prefixes containing letters/digits/whitespace, length 0, or length >2.

3. **4-locale snippet data shape with fallback chain** — each snippet stores HE/EN/CS/DE expansion text + a single locale-neutral trigger keyword.
   - Current: No snippet data shape exists.
   - Target: Per-snippet record: `{ id, trigger, expansions: { he, en, cs, de }, tags: string[], origin: "seed" | "user", createdAt, updatedAt }`. The `trigger` is a locale-neutral slug (e.g., `betrayal`, `heart-shock`, `unreceived-love`). Expansion at trigger time picks `expansions[<active>]`; if empty, the fallback order is `active → en → he → de → cs`. Triggers must be unique across the snippet library (case-insensitive); the editor rejects duplicates on save.
   - Acceptance: A snippet `betrayal` with HE and EN expansions filled but CS and DE empty: typing `;betrayal ` while app is in HE inserts the HE text; while app is in CS the fallback chain yields the EN text (`active=cs` empty → `en` non-empty); under no circumstances does a trigger that matches a stored snippet yield empty replacement.

4. **Auto-installed seed pack from Sapir's Emotion Code chart** — 60 default snippets across 12 EC chart cells.
   - Current: No seed pack exists; the library would be empty without this requirement.
   - Target: On first launch of v1.1 (both fresh installs and v1.0-upgraded users), an IDB schema migration creates the `snippets` object store and seeds it with 60 records derived from Sapir's PDF. Each seed snippet: `trigger` = slug of the canonical English emotion name (lowercase, hyphenated, e.g., `betrayal`, `unreceived-love`, `heart-shock`); `expansions` = 4-locale meaning paragraphs from the PDF (missing locales remain empty, handled by fallback); `origin` = `"seed"`; `tags` = `["ec.<col><row>"]` where col is `a`/`b` and row is `1`–`6` (e.g., `ec.a1` for the Heart-Small Intestine Column A Row 1 cell). The migration is idempotent — re-launch does not duplicate. Existing user data (clients, sessions, therapistSettings) is preserved unchanged.
   - Acceptance: After fresh install and first v1.1 launch, Settings → Text Snippets lists exactly 60 snippets, each carrying an `ec.a1`–`ec.b6` tag and a non-empty EN expansion. After a v1.0 → v1.1 upgrade with prior session data, those same 60 snippets appear AND prior clients/sessions/settings are intact. Quitting and re-launching the app does not produce duplicate entries.

5. **Settings management UI** — new "Text Snippets" section in `settings.html` with list view + modal editor.
   - Current: `settings.html` has section-label customization and i18n preferences; no snippet UI.
   - Target: A new collapsible section "Text Snippets" in `settings.html` lists all snippets. Each list row shows: trigger keyword (prefixed visually with the active prefix), an EN expansion preview (first ~60 chars), tag chips, and edit/delete icon buttons. A `+ Add snippet` button opens a modal with: a trigger input (validates slug-form + uniqueness), 4 language tabs (HE/EN/CS/DE), each tab containing a multi-line textarea for that locale's expansion, a tags input (chip-style), and Save / Cancel / Delete buttons. All UI strings translated across HE/EN/CS/DE.
   - Acceptance: Therapist opens Settings → Text Snippets, sees the seed pack of 60 snippets. Clicks `+ Add`; modal opens with empty fields and 4 language tabs. Fills `trigger = test-snippet`, EN expansion `"hello"`, tag `personal`; saves. The new snippet appears in the list. Typing `;test-snippet ` in a session textarea inserts `hello`.

6. **Snippet categories / tags** — per-snippet metadata + filter UI in the Settings list.
   - Current: No tagging mechanism.
   - Target: `snippet.tags` is an array of case-insensitive free-form strings. The Settings list view shows a tag-filter row (chip-style multi-select) above the list — clicking a tag narrows the list to snippets carrying that tag; multiple chips combine with OR. The snippet editor modal has a tags input that accepts new chips via Enter / comma / Tab. Seed-pack snippets ship with their `ec.<col><row>` cell tags pre-set.
   - Acceptance: User adds the tag `grief` to 3 user-added snippets. Settings tag-filter shows `grief` as an available chip; clicking it narrows the list to those 3. Clicking the `grief` chip again removes the filter and restores the full list. Seed pack remains filterable by its `ec.*` tags.

7. **Inline autocomplete dropdown while typing the trigger** — popover suggests matching snippets.
   - Current: No autocomplete UI exists.
   - Target: As the user types `<prefix><partial>` (at least 1 character after the prefix) in a marked textarea, a popover anchored near the cursor lists up to 8 snippets whose trigger starts with the partial keyword (case-insensitive). Each row shows: trigger + EN expansion preview (first ~60 chars). Arrow Up / Down navigate; Enter inserts the selected snippet (same effect as triggering with a word-boundary, plus a trailing space); Esc dismisses. Popover positions correctly in both LTR and RTL textareas. Empty match list → no popover shown. Popover dismisses on textarea blur, on Esc, or on typing a non-keyword character.
   - Acceptance: With seed snippets including `heart-shock`, `heartache`, and `helplessness`, the user types `;he` in a marked textarea — popover appears with those 3 snippets. Arrow-down + Enter inserts the selected snippet's expansion + trailing space. Esc closes the popover; typing a word-boundary character after a complete trigger still fires normal expansion. In a Hebrew (RTL) textarea, the popover anchors correctly relative to the cursor (not flipped off-screen).

8. **Granular snippet-only import/export** — JSON download / upload of snippets, separate from the full app backup.
   - Current: Full app backup exists in `assets/backup.js`; no per-store import/export flow.
   - Target: Settings → Text Snippets shows two buttons: `Export snippets` and `Import snippets`. Export downloads `snippets-YYYY-MM-DD.json` containing all snippets with `origin = "user"` PLUS any `origin = "seed"` snippets that have been modified by the user (modification tracked via `updatedAt > createdAt`); untouched seed snippets are NOT exported (they're available via fresh install / migration). Import opens a file picker; on upload, the JSON is validated (schema check + trigger uniqueness within file). If any imported triggers collide with existing snippets, a confirmation modal lists the collisions and asks: `Replace existing` / `Skip colliding` / `Cancel`. Successful import adds the new snippets and updates the existing ones per user choice.
   - Acceptance: User has 60 seed snippets (untouched) + 5 user-added + 2 modified-seed. Export produces a JSON containing exactly those 7 entries. User then clears IndexedDB and reopens the app — 60 fresh seed snippets re-install via migration. User imports the saved JSON → 5 user-added snippets are added (total 65), and the 2 modified-seed snippets get the import treatment based on the user's collision choice. Invalid JSON (malformed, missing fields, duplicate triggers within file) is rejected with a clear error message.

9. **Opt-in textarea wiring** — `data-snippets="true"` attribute on the 7 session-form textareas.
   - Current: No textareas are wired for snippet expansion.
   - Target: Each of the 7 session-form textareas in `add-session.html` receives `data-snippets="true"`: `trappedEmotions`, `heartShieldEmotions`, `sessionInsights`, `limitingBeliefs`, `additionalTech`, `sessionComments`, `customerSummary`. No other textareas in the app (client-form notes, settings inputs, export editor, edit-client-modal notes) receive the attribute in v1. The trigger engine module reads the attribute on textarea focus / mutation and binds its handlers there only.
   - Acceptance: Snippet triggers fire in all 7 session-form textareas. Triggers do NOT fire in: the inline client-notes textarea on add-session.html, the edit-client modal notes textarea, any settings inputs, or the export editor on add-session.html (the markdown preview pane). Verified by typing `;<known-trigger> ` in each surface and observing replace-vs-no-replace.

## Boundaries

**In scope:**
- Snippet trigger engine (inline detection + word-boundary expansion)
- User-configurable prefix in Settings (default `;`)
- 4-locale per-snippet data shape with fallback chain (`active → en → he → de → cs`)
- Auto-installed seed pack of 60 snippets from Sapir's Emotion Code PDF (English-slug triggers, EC-cell tags, idempotent migration)
- Settings management UI (list view + modal editor with 4 language tabs)
- Categories / tags (per-snippet metadata + filter UI in list)
- Inline autocomplete popover (≤8 suggestions, keyboard nav, RTL-aware, Esc dismiss)
- Granular snippet-only JSON import/export (with collision detection modal)
- 7 session-form textareas wired via `data-snippets="true"`
- All new UI strings translated across HE/EN/CS/DE
- Additive IndexedDB migration (new `snippets` object store + idempotent seed)

**Out of scope:**
- **Snippet variables / placeholders** (`{clientName}`, `{date}`, `{session.number}`, etc.) — explicitly deferred to v2. Snippets are static text only. Reason: template engine adds non-trivial complexity and isn't needed for Sapir's launch use case.
- **Snippet expansion in non-session textareas** — client-form notes, settings inputs, export editor, edit-client-modal notes all stay un-wired in v1. Adding them later is a one-attribute change. Reason: scope discipline; expanding the surface area invites edge cases (e.g., snippet expansion polluting client-form metadata).
- **Public snippet marketplace / pack-sharing UI** — only manual JSON file import/export. Reason: requires hosting infrastructure and content moderation; out of v1 budget.
- **Re-collapse of expanded text in read-mode** — expansion is one-way; saved sessions display the expanded result as plain text. Reason: textareas have no DOM record of "this segment was a snippet" — the abstraction is fire-and-forget.
- **Custom expansion side-effects** — cursor-position markers (`$|$`), multi-cursor edits, expansion macros that chain other snippets. Reason: pulls in TextExpander-class feature creep; reassess after v1 usage data.
- **Unicode triggers** — v1 triggers are Latin lowercase letters + digits + hyphens only. Hebrew or Cyrillic triggers are out of scope. Reason: keyboard-layout switching makes Latin slug triggers universally typeable; Hebrew triggers would require keyboard mode changes mid-typing.

## Constraints

- **No new heavyweight dependencies.** Implement the trigger engine, autocomplete popover, and editor modal in vanilla JS, consistent with existing `assets/` patterns.
- **4-locale UI strings mandatory.** Every new label, button, placeholder, tooltip, and validation message must exist in `i18n-en.js`, `i18n-de.js`, `i18n-he.js`, and `i18n-cs.js`.
- **RTL safety.** Trigger detection works identically in Hebrew (RTL) textareas. Autocomplete popover anchors correctly to the cursor in both LTR and RTL layouts. Settings UI renders correctly under `html[dir=rtl]`.
- **Additive IndexedDB migration.** The new `snippets` object store is created without modifying existing stores. The seed migration runs once and is idempotent (re-launch must not duplicate). All existing client, session, and `therapistSettings` data preserved unchanged. DB schema version bumps once.
- **Pre-commit hook auto-bumps `sw.js` `CACHE_NAME` on asset commits** — do not pre-bump manually, do not bypass with `--no-verify`.
- **No backend.** All snippet data lives in IndexedDB; backup uses the existing local-only backup flow. Imported snippet JSON is processed entirely client-side.
- **Trigger keyword charset.** v1 triggers are Latin lowercase letters `a-z` + digits `0-9` + hyphen `-` (slug-form). Editor regex-enforces this on save. Maximum trigger length: 32 characters. Minimum: 2 characters.
- **Prefix character constraints.** Prefix is 1 or 2 characters; each character cannot be whitespace, letter, digit, quote (`"`, `'`, `` ` ``), or angle bracket (`<`, `>`). Single-char examples: `;`, `:`, `\`, `/`, `~`, `#`, `@`, `$`, `%`, `^`, `&`, `*`, `|`. Two-char examples: `::`, `;;`, `??`, `>>`, `~~`, `//`, `\\`. Default: `;`. Two-character prefixes reduce false-trigger risk against natural single-char usage (`:` in `12:30`, `/` in `2026/05/14`).
- **Idempotent seed pack identity.** Each seed snippet has a deterministic ID derived from its EC-cell coordinate + English slug (e.g., `ec.a1.betrayal`) so the migration can detect "already seeded" cleanly even if user has manually deleted some seed entries (deleted seeds stay deleted across upgrades).
- **Backup compatibility.** Snippets store is included in the full app backup format. Restoring a backup from a pre-v1.1 build (no snippets store) does not error; the snippets store remains seeded with defaults.

## Acceptance Criteria

- [ ] In a textarea with `data-snippets="true"`, typing `<prefix><trigger>` followed by a word-boundary character (space, Enter, `.,;:!?`) replaces the matched substring with the snippet's expansion text in the current app language. The word-boundary character is preserved after the inserted expansion.
- [ ] Typing `<prefix><trigger>` without a word-boundary character does NOT fire expansion.
- [ ] Changing the snippet prefix in Settings from `;` to `\` (single-char) OR `::` (two-char) makes the new prefix + trigger fire, and the old prefix no longer fires, with no app reload required. Prefixes outside the 1–2 char rule or containing letters/digits/whitespace are rejected with a clear validation message.
- [ ] When the active-language expansion is empty for a triggered snippet, fallback yields the first non-empty value in the order `active → en → he → de → cs`. A trigger that matches a stored snippet never yields empty replacement.
- [ ] On first launch of v1.1 (both fresh install and v1.0 upgrade), the IDB `snippets` store contains 60 seed snippets derived from Sapir's PDF, each carrying an `ec.<col><row>` tag and `origin = "seed"`. Re-launching does not duplicate entries.
- [ ] Settings page shows a "Text Snippets" section containing the list of all snippets, a `+ Add snippet` button, a tag-filter row, and `Export snippets` / `Import snippets` buttons. All UI strings translated across HE/EN/CS/DE.
- [ ] The snippet editor modal has trigger input + 4 language tabs (HE/EN/CS/DE) + tags input + Save/Cancel/Delete buttons. Saving validates trigger uniqueness (case-insensitive) and slug-form charset; rejects on violation with an error message.
- [ ] Tags can be added, removed, and used to filter the Settings list. Multiple tag chips combine with OR.
- [ ] In a marked textarea, typing `<prefix><partial-keyword>` (≥1 char after prefix) shows an autocomplete popover with up to 8 matching snippets sorted by trigger. Arrow keys navigate, Enter inserts (with trailing space), Esc dismisses. Popover anchors correctly in LTR and RTL textareas.
- [ ] `Export snippets` produces a JSON file containing all user-added snippets + modified seed snippets, excluding untouched seeds. `Import snippets` validates and merges with a collision-confirmation modal (Replace / Skip / Cancel). Invalid JSON is rejected with a clear error.
- [ ] Triggers fire in all 7 session-form textareas (`trappedEmotions`, `heartShieldEmotions`, `sessionInsights`, `limitingBeliefs`, `additionalTech`, `sessionComments`, `customerSummary`) and do NOT fire in client-form notes, edit-client modal notes, settings inputs, or the export editor.
- [ ] Existing v1.0 functionality remains intact post-upgrade: client CRUD, session CRUD, section-label customization, full backup/restore (encrypted and unencrypted), PDF export, i18n switching, demo data flow.

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                                              |
|--------------------|-------|------|--------|------------------------------------------------------------------------------------|
| Goal Clarity       | 0.92  | 0.75 | ✓      | All 5 axes (trigger, content, scope, locale, fallback) locked; corrected misread in R0 |
| Boundary Clarity   | 0.90  | 0.70 | ✓      | Explicit in-scope + out-of-scope lists with reasoning; R5 closed deferred items     |
| Constraint Clarity | 0.80  | 0.65 | ✓      | 4-locale + RTL + IDB + slug-keyword + prefix charset + idempotent migration explicit |
| Acceptance Criteria| 0.82  | 0.70 | ✓      | 12 pass/fail criteria, each falsifiable; covers happy path + locale fallback + upgrade |
| **Ambiguity**      | 0.13  | ≤0.20| ✓      | Gate passed                                                                         |

## Interview Log

| Round | Perspective       | Question summary                              | Decision locked                                                                |
|-------|-------------------|-----------------------------------------------|--------------------------------------------------------------------------------|
| 0     | (initial misread) | Picker UI / hardcoded chart framing           | Ben corrected: this is Raycast-style inline text expansion, not a picker UI    |
| 1     | Researcher        | Trigger pattern + fire rule                   | User-configurable prefix in Settings, default `;`, fires on word-boundary       |
| 1     | Researcher        | Seed library state at first launch            | Sapir's PDF pre-loaded as default; therapist edits / deletes / adds freely     |
| 2     | Simplifier        | Where does expansion work                     | Opt-in per textarea via `data-snippets="true"` attribute                        |
| 2     | Simplifier        | Locale model                                  | Per-snippet 4-locale text; auto-pick by active app language                     |
| 3     | Boundary Keeper   | Management UI surface                         | New "Text Snippets" section in existing Settings page (modal editor + 4 tabs)   |
| 3     | Boundary Keeper   | Out-of-scope items                            | Snippet variables/placeholders excluded; 3 other items deferred to R5           |
| 4     | Failure Analyst   | Empty-locale fallback                         | Active → EN → HE → DE → CS                                                      |
| 4     | Failure Analyst   | Upgrade path for v1.0 users                   | Auto-install seed pack on first v1.1 launch (idempotent additive migration)     |
| 5     | Seed Closer       | Lock 3 deferred items                         | ALL THREE in v1: categories/tags, autocomplete popover, JSON import/export      |

---

*Phase: 24-pre-launch-final-cleanup*
*Spec created: 2026-05-14*
*Subject of this SPEC: Item 3 (Emotions / Specific-Text Quick-Paste — snippet engine). The other 5 Phase 24 items (dropdown spotlight bug, edit-session Cancel/Revert + clock-icon button wording, MD `##` bug + single-newline rendering decision, overview clock-icon severity reversal, pre-session-context-card integration) are already-specified bug fixes and not the subject of this SPEC — they go directly to `/gsd-discuss-phase` / `/gsd-plan-phase`.*
*Next step: `/gsd-discuss-phase 24` — implementation decisions (IDB schema version + migration strategy, `snippets` store key structure, seed-pack import format / data source, modal UI patterns, autocomplete popover positioning algorithm, RTL anchoring math, import/export merge semantics, integration with existing backup format).*
