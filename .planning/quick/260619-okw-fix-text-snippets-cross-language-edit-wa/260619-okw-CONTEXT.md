# Quick Task 260619-okw: Text Snippets — cross-language edit warning, Unicode keywords, source filter — Context

**Gathered:** 2026-06-19
**Status:** Ready for planning → handoff (PLAN.md)

<domain>
## Task Boundary

Three changes to the "Text Snippets" feature (Settings → Snippet library):

1. **Bug investigation + UX fix (#1)** — Editing a snippet in a language whose expansion
   is empty shows a blank textbox, hiding the fact that the text exists under another
   language. Add a clear warning that points to the "Edit translations" button, and make
   that button look unmistakably like a button.
2. **Feature (#2)** — Allow Hebrew (and German/Czech) keyword *triggers*, not just
   English letters + digits.
3. **Feature (#3)** — Add an All / Mine / Defaults source filter to the snippet list,
   keeping the existing category (tag) chips, shown only when ≥1 category exists.
</domain>

<root_cause>
## Issue #1 — Confirmed root cause (code read 2026-06-19)

- Each snippet stores one `expansions` object `{he,en,cs,de}`; typed text fills ONLY the
  language active at save (`settings.js:1348-1351`), other locales stay `""`.
- **Save language** = `getCurrentLang()` → `window.App.getLanguage()` (the REAL displayed
  UI language; `app.js:2`, `settings.js:798-803`). It is **NOT** a navigator/browser
  default — Ben's "browser-storage default" theory is **refuted**. (Fallback chain:
  `App.getLanguage()` → `localStorage.portfolioLang` → `"en"`.)
- **Edit** loads the textbox from that same `getCurrentLang()` key (`settings.js:1143`).
- Therefore the box is blank whenever **create-language ≠ current-language**. The text is
  NOT lost — it sits under the original language. The "Edit translations" block that would
  reveal it is **hidden by default** (`settings.js:1162`).
- The app boots in English (`currentLang = "en"` until `setLanguage` runs, `app.js:2`), so
  a snippet created before Hebrew was active gets stored under `en`; now in Hebrew the box
  looks empty. The list preview already falls back across languages (`settings.js:940`),
  which is why the list looks fine but the editor box is blank.

## Issue #2 — Why it's low risk

The trigger *detection* engine already accepts any Unicode letter via
`[\p{L}\p{N}-]` + `u` flag (`snippets.js:96-98`). Only the *validation* regex
`/^[a-z0-9-]{2,32}$/` blocks Hebrew, in two shipped places: `settings.js:775`,
`db.js:595-596`. `backup.js:1074-1083` also calls `validateSnippetShape` (restore path —
covered automatically). Triggers are lowercased before save (`settings.js:1330`), and the
trigger map keys on `.toLowerCase()` (`snippets.js:191`) — harmless for Hebrew, correct
for German/Czech.
</root_cause>

<decisions>
## Implementation Decisions (LOCKED — do not revisit)

### #1 — Cross-language warning behavior
- Show a warning in the editor ONLY when editing an existing snippet whose active-language
  expansion is empty AND ≥1 other locale has content.
- The warning NAMES which language(s) have content and tells the user to click the
  "Edit translations" button.
- Do **NOT** auto-reveal the translations block. Do **NOT** show all languages by default.
  Do **NOT** auto-switch the editor language. (Ben explicitly rejected over-complicating.)
- Warning is informational only — it does NOT block saving.

### #1b — "Edit translations" button emphasis
- The button currently looks like plain text because `.modal-card` is
  `display:flex; flex-direction:column` (`app.css:1537`) so children stretch full-width,
  and `.button.ghost` is transparent (blends with the card).
- Fix: make it clearly a button — `align-self:flex-start` (content width, not full width),
  switch from the `ghost` variant to the filled `secondary` variant, add a chevron that
  rotates on expand. When the warning is active, add an attention/emphasis state to the
  button so the "click this" guidance is visually obvious.

### #2 — Keyword character set
- Replace `/^[a-z0-9-]{2,32}$/` with `/^[\p{L}\p{N}-]{2,32}$/u` (matches the detection
  engine). Supports Hebrew + German + Czech + any Unicode letter in one stroke.
- Consequence (accepted): uppercase Latin now PASSES the shape validator (it was rejected
  before). Safe because the editor lowercases before save and detection/uniqueness are
  case-insensitive. The existing `24-04-shape-validator.test.js` uppercase-rejection case
  must be updated to reflect this.

### #3 — Source filter
- Segmented control: **All / Mine / Defaults** (`origin` = all | user | seed). Default All.
- AND-combine with existing search + tag filters.
- Keep the existing category (tag) chips; render the category row ONLY when ≥1 tag exists.
- Placement: left of / above the category chips inside `.snippets-list-toolbar`.

### Claude's discretion (chosen, reversible)
- Warning is non-blocking; default filter is All; segmented control sits before the tag
  chips; chevron rotates 90° on expand.
- i18n he/de/cs copy is a DRAFT for Ben's review (Ben is trilingual he/de/en; cs especially
  should be verified).
</decisions>

<canonical_refs>
## Canonical References
- Behavior-verification rule (MEMORY `feedback-behavior-verification`): runtime-behavior
  code requires a falsifiable test that FAILS before the change and PASSES after — a
  grep/shape check is not sufficient. All three issues have pure, testable helpers.
- Test harness convention: pure-function tests load the asset in a `vm` sandbox and read
  helpers from `window.__SnippetEditorHelpers` (settings.js) / `window.PortfolioDB`
  (db.js) / `window.Snippets.__testExports` (snippets.js). Existing examples:
  `tests/24-04-shape-validator.test.js`, `tests/24-05-list-filter.test.js`,
  `tests/24-04-trigger-regex.test.js`. Run individually: `node tests/<file>.test.js`
  (no package.json test runner).
</canonical_refs>
