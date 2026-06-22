# Phase 3: Data Model and Features - Research

**Researched:** 2026-03-10
**Domain:** IndexedDB schema migration, vanilla JS form wiring, client search, i18n expansion
**Confidence:** HIGH

## Summary

Phase 3 is a feature-enrichment phase on a mature vanilla HTML/JS/CSS codebase with no build tools, no framework, and no npm dependencies. The app uses IndexedDB for storage with a sequential migration pattern already established in Phase 1. All work is additive: extending existing forms with new fields, adding a new client type option, adding a referral source dropdown, wiring a search input, and completing an already-scaffolded quotes system.

The codebase is well-structured with consistent patterns: toggle cards for radio groups (`setupToggleGroup`), `data-i18n` attributes for translations, a single `i18n.js` file containing all four languages, and `details/summary` expandable fields for session form sections. The CONTEXT.md from the user discussion session is exceptionally detailed, leaving minimal ambiguity.

**Primary recommendation:** Follow existing codebase patterns exactly. The migration infrastructure, toggle card pattern, i18n system, and expandable field pattern are all proven. No new libraries or architectural changes needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Session field order (top to bottom): Issues, Trapped Emotions, Limiting Beliefs, Additional Techniques, Important Points, Insights, Comments, Next Session Info
- Label changes: "נושאים שטופלו במפגש" to "נושאי המפגש"; "סיבת הפנייה/תלונה" to "נושא לטיפול"
- Important Points gets subtle visual highlight (accent color or star icon on label)
- Severity delta: display numerical difference at end of issue row when both before/after are filled
- Markdown export: include all four new fields; skip blank fields
- Client types: Adult, Child, Animal, Other (replacing Human/Animal); migrate "human" to "adult"
- Referral source: dropdown with predefined options (Facebook, Instagram, המלצה מפה לאוזן, המלצה מקולגה/מטפל אחר, חיפוש אינטרנט, אחר) + "Other" opens free text; NOT required
- Client search: name-only (NOT phone/email), real-time filtering, search box above client table
- Daily quotes: 30-50 per language, all four languages, motivating tone, no EC/Bradley Nelson content, famous quotes with attribution
- Hebrew text policy: plural form default, alternate masc/fem when singular needed
- Navigation fix: logo/brand mark links to index.html on all pages

### Claude's Discretion
- Exact visual treatment of severity delta (color, position, format)
- Whether referral source appears in client modal overview
- Exact styling of Important Points highlight (accent vs star icon)
- HTML form structure for new session fields
- File structure for quotes (separate file vs inline)
- IndexedDB migration version number and migration function name

### Deferred Ideas (OUT OF SCOPE)
None -- all requests stayed within Phase 3 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Session field consolidation -- finalize data model with Sapir | CONTEXT.md contains the finalized field list and order; Sapir has already reviewed and approved during context session |
| DATA-02 | Expanded client types -- Adult/Child/Animal/Other | Toggle card pattern exists in add-client.html (3 cards); add "Other" card + DB migration for "human" to "adult" |
| DATA-03 | Referral source tracking per client | New dropdown field in add-client.html/add-session.html inline form; DB migration adds `referralSource` field to clients store |
| DATA-04 | Additional session fields (Limiting Beliefs, Additional Techniques, Important Points, Next Session Info) | limitingBeliefs and additionalTech already wired in JS (lines 509-511) and HTML; importantPoints is completely missing; customerSummary (Next Session Info) already exists |
| FEAT-01 | Client search by name with real-time filtering | Filter `getAllClients()` results in `loadOverview()` using input event listener; client table already renders from JS |
| FEAT-02 | Daily greeting with rotating quotes | `getDailyQuote()` and `renderGreeting()` already implemented; `window.QUOTES` already populated with 30 quotes per language in i18n.js |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS | ES2020+ | All application logic | Project uses no framework; zero dependencies |
| IndexedDB | Browser API | Client-side storage | Already in use via `PortfolioDB` module |
| CSS Custom Properties | Browser API | Design tokens | Two-tier token system from Phase 1 |

### Supporting
No external libraries. This project intentionally has zero npm dependencies and no build step.

### Alternatives Considered
None -- the project architecture is locked. No frameworks, no bundlers, no npm.

## Architecture Patterns

### Existing Project Structure
```
TherapistPortfolioManager/
  index.html              # Overview page
  add-client.html         # Client form
  add-session.html        # Session form
  sessions.html           # Sessions list
  reporting.html          # Reports page
  assets/
    app.js                # Shared utilities (App module, nav, i18n, theme)
    db.js                 # IndexedDB wrapper (PortfolioDB module)
    i18n.js               # All translations + quotes (window.I18N, window.QUOTES)
    overview.js           # Overview page logic
    add-client.js         # Client form logic
    add-session.js        # Session form logic
    sessions.js           # Sessions list logic
    reporting.js          # Reporting logic
    tokens.css            # Design tokens (primitives + semantic)
    app.css               # All component styles
    fonts/                # Self-hosted Rubik WOFF2
```

### Pattern 1: IndexedDB Migration (MIGRATIONS map)
**What:** Sequential migration functions keyed by version number
**When to use:** Any schema change (new fields, indexes, data transformations)
**Example:**
```javascript
// Source: assets/db.js lines 5-20
const MIGRATIONS = {
  1: function initializeSchema(db) { /* existing v1 schema */ },
  2: function expandDataModel(db, transaction) {
    // Add referralSource to clients -- no index needed (not searched by it)
    // Add importantPoints -- stored as session property, no schema change needed
    // Migrate type: "human" -> "adult" on existing client records
    const clientStore = transaction.objectStore("clients");
    clientStore.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.type === "human") {
          cursor.update({ ...cursor.value, type: "adult" });
        }
        cursor.continue();
      }
    };
  },
};
```

**Critical detail:** DB_VERSION must be bumped from 1 to 2. The migration loop in `openDB()` (lines 35-39) already handles running migrations sequentially from `oldVersion+1` to `newVersion`.

### Pattern 2: Toggle Cards (radio group)
**What:** Visual radio buttons using `.toggle-card` elements inside a `.toggle-group`
**When to use:** Any mutually exclusive selection (client type, session type)
**Example:**
```html
<!-- Source: add-client.html lines 84-100 -->
<div class="toggle-group" id="clientTypeGroup">
  <label class="toggle-card" data-type="child">
    <input type="radio" name="clientType" value="child" />
    <span class="icon-badge">emoji</span>
    <span data-i18n="client.form.type.child">Child</span>
  </label>
  <!-- repeat for each type -->
</div>
```
**JS:** `setupToggleGroup("clientTypeGroup")` handles click behavior. Already works in add-session.js inline form too.

### Pattern 3: Expandable Session Fields (details/summary)
**What:** Collapsible form sections using native HTML `<details>` element
**When to use:** Optional session text fields (trapped emotions, insights, etc.)
**Example:**
```html
<!-- Source: add-session.html lines 176-184 -->
<details class="expandable-field">
  <summary>
    <span class="label" data-i18n="session.form.trapped">Trapped Emotions</span>
    <span class="expand-arrow" aria-hidden="true">></span>
  </summary>
  <div class="expandable-body">
    <textarea class="textarea session-textarea" id="trappedEmotions"
      data-i18n-placeholder="session.form.trapped.placeholder"></textarea>
  </div>
</details>
```

### Pattern 4: i18n (data-i18n attributes)
**What:** Translation via `data-i18n` attributes + `App.t("key")` for dynamic text
**When to use:** Every user-visible string
**Existing i18n keys for all four languages:** en, he, de, cs -- all in `assets/i18n.js`

### Pattern 5: Client Table Row Rendering
**What:** JS-rendered table rows from `getAllClients()` results
**Where:** `loadOverview()` in overview.js
**Search integration point:** Filter the `clients` array before the `.forEach()` that renders rows

### Anti-Patterns to Avoid
- **Adding npm dependencies:** The project is zero-dependency by design. Do not introduce any packages.
- **Separate quotes file:** Quotes are already in `i18n.js` as `window.QUOTES`. The CONTEXT.md suggested a separate file, but quotes are already there with 30 per language. No need to move them.
- **Creating new HTML pages:** This phase adds no new pages. All changes go into existing files.
- **Modifying the MIGRATIONS[1] function:** Never touch existing migrations. Only add MIGRATIONS[2].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Radio group selection | Custom checkbox logic | `setupToggleGroup()` pattern | Already handles click, active class, and input.checked |
| Severity scales | Custom slider | `App.createSeverityScale()` | Already returns a 0-10 button row with color coding |
| Translation | Custom string lookup | `App.t(key)` + `data-i18n` attribute | Already handles fallback to English, applied via `applyTranslations()` |
| Date formatting | Custom format function | `App.formatDate()` | Already locale-aware |
| Toast notifications | Alert/custom modal | `App.showToast("", "i18n.key")` | Already styled and animated |
| Collapsible sections | Custom accordion | `<details>` + `<summary>` with `.expandable-field` | Native HTML, already styled in app.css |

**Key insight:** This codebase has mature, reusable patterns for every UI need in this phase. Zero new patterns are needed.

## Common Pitfalls

### Pitfall 1: Forgetting to bump DB_VERSION
**What goes wrong:** New migration function is added but DB_VERSION stays at 1, so it never runs
**Why it happens:** DB_VERSION is a const at line 3 of db.js, easy to miss
**How to avoid:** First change in db.js must be `DB_VERSION = 2`
**Warning signs:** Old client records still have `type: "human"` after app reload

### Pitfall 2: Missing i18n keys in one or more languages
**What goes wrong:** Labels show raw key strings ("session.form.importantPoints") in German or Czech
**Why it happens:** Adding English keys but forgetting one of the four language blocks
**How to avoid:** When adding any i18n key, add it to ALL four language objects (en, he, de, cs) simultaneously
**Warning signs:** Switching language shows bracket-looking text

### Pitfall 3: Referral source "Other" free text not persisted
**What goes wrong:** User selects "Other" and types custom text, but only "other" is saved to DB
**Why it happens:** Saving the dropdown value but not the associated free text input
**How to avoid:** Save as object or concatenated string: `{ source: "other", otherText: "..." }` or just save the free text when "other" is selected
**Warning signs:** Editing a client shows "Other" selected but the custom text is gone

### Pitfall 4: Search not handling Hebrew/RTL text properly
**What goes wrong:** Hebrew name search doesn't match or displays incorrectly
**Why it happens:** Case-insensitive comparison works for Latin scripts but Hebrew has no case; whitespace handling differs
**How to avoid:** Use `String.prototype.includes()` with both query and name converted via `.toLowerCase()` -- this is safe for Hebrew (no case) and works for Latin scripts
**Warning signs:** Hebrew client names not found when searching

### Pitfall 5: Important Points field not saved/loaded in session
**What goes wrong:** User fills "Important Points" but it disappears after save
**Why it happens:** Unlike limitingBeliefs and additionalTech which are already read/written in JS (lines 509-511, 773-776), importantPoints has NO existing JS code
**How to avoid:** Add `importantPoints` to both the save path (submit handler, ~line 530) and the load path (`populateSession`, ~line 759)
**Warning signs:** importantPoints is empty when re-opening a saved session

### Pitfall 6: Markdown export includes empty field headers
**What goes wrong:** Exported markdown shows "## Limiting Beliefs" followed by "Not provided" for unfilled fields
**Why it happens:** Current `buildSessionMarkdown()` includes all fields unconditionally with "Not provided" fallback
**How to avoid:** Conditionally include each section only if the value is non-empty (per user decision)
**Warning signs:** Clipboard paste shows section headers for fields that were left blank

### Pitfall 7: Brand mark link not working on all pages
**What goes wrong:** Logo links to index.html on some pages but not others
**Why it happens:** The brand mark HTML is duplicated across all 5 HTML files (not rendered by JS nav)
**How to avoid:** Update ALL 5 HTML files to wrap brand in `<a href="./index.html">`, OR modify `renderNav()` in app.js to also make brand clickable since `initCommon()` runs on every page
**Warning signs:** Logo not clickable on add-client.html but works on index.html

### Pitfall 8: Migration cursor not handling async correctly
**What goes wrong:** Migration appears to complete but not all records are updated
**Why it happens:** IndexedDB cursor operations within `onupgradeneeded` must use the upgrade transaction, not create new transactions
**How to avoid:** Use the `transaction` parameter passed to `MIGRATIONS[2]`, access stores via `transaction.objectStore()`, NOT via `db.transaction()`
**Warning signs:** Some client records still have `type: "human"` after migration

## Code Examples

### DB Migration v2: Add referralSource + migrate client types
```javascript
// Source: Pattern from existing MIGRATIONS[1] in db.js
2: function expandDataModel(db, transaction) {
  // Migrate existing "human" type clients to "adult"
  const clientStore = transaction.objectStore("clients");
  const cursorReq = clientStore.openCursor();
  cursorReq.onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      const record = cursor.value;
      if (record.type === "human") {
        cursor.update({ ...record, type: "adult" });
      }
      cursor.continue();
    }
  };
  // Note: referralSource and importantPoints are schemaless --
  // IndexedDB stores arbitrary object properties without needing
  // schema declarations. No createIndex needed since we don't
  // search by referralSource.
},
```

### Client Search Filter
```javascript
// Source: Pattern from loadOverview() in overview.js
const searchInput = document.getElementById("clientSearch");
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    // Filter already-loaded clients array before rendering
    const filtered = query
      ? clients.filter(c => (c.name || "").toLowerCase().includes(query))
      : clients;
    renderClientTable(filtered, sessionsByClient);
  });
}
```

### Referral Source Dropdown with "Other" Toggle
```html
<div class="form-field">
  <label class="label" data-i18n="client.form.referralSource">Referral Source</label>
  <select class="select-field" id="clientReferralSource">
    <option value="" data-i18n="client.form.referralSource.placeholder">Select...</option>
    <option value="facebook">Facebook</option>
    <option value="instagram">Instagram</option>
    <option value="wordOfMouth" data-i18n="client.form.referral.wordOfMouth">Word of mouth</option>
    <option value="colleague" data-i18n="client.form.referral.colleague">Colleague referral</option>
    <option value="internet" data-i18n="client.form.referral.internet">Internet search</option>
    <option value="other" data-i18n="client.form.referral.other">Other</option>
  </select>
  <input class="input" id="clientReferralOther" type="text" style="display:none;"
    data-i18n-placeholder="client.form.referral.otherPlaceholder" />
</div>
```

### Severity Delta Display
```javascript
// After both before and after scales are rendered for an issue:
function renderDelta(beforeValue, afterValue) {
  if (beforeValue === null || afterValue === null) return "";
  const delta = afterValue - beforeValue;
  // Negative means improvement (severity went down)
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}`;
}
```

### Important Points with Visual Highlight
```html
<details class="expandable-field important-field">
  <summary>
    <span class="label" data-i18n="session.form.importantPoints">
      <span class="important-star" aria-hidden="true">&#9733;</span>
      Important Points
    </span>
    <span class="expand-arrow" aria-hidden="true">></span>
  </summary>
  <div class="expandable-body">
    <textarea class="textarea session-textarea" id="importantPoints"
      data-i18n-placeholder="session.form.importantPoints.placeholder"></textarea>
  </div>
</details>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client type: human/animal (2 options) | adult/child/animal/other (4 options) | Phase 3 | DB migration needed for existing "human" records |
| No referral tracking | Dropdown + free text | Phase 3 | New field on client records |
| 3 session text fields (trapped, insights, comments) | 7 fields with standardized order | Phase 3 | importantPoints is NEW; others already in JS |
| All fields in markdown export | Only non-empty fields | Phase 3 | Cleaner exported notes |
| Brand mark not clickable | Links to index.html | Phase 3 | All 5 HTML files need update |

**Already completed (no work needed):**
- Quotes system: `window.QUOTES` already has 30 quotes per language in i18n.js. `getDailyQuote()` and `renderGreeting()` already work. FEAT-02 is essentially DONE.
- limitingBeliefs and additionalTech HTML inputs already exist in add-session.html
- limitingBeliefs and additionalTech already read/written in JS

## Open Questions

1. **Quotes already exist -- does FEAT-02 need more?**
   - What we know: `window.QUOTES` in i18n.js already has 30 quotes per language, `getDailyQuote()` works, `renderGreeting()` calls it
   - What's unclear: CONTEXT.md says "30-50 quotes per language" and mentions famous quotes with attribution. Current quotes have no author attribution and are all custom-written
   - Recommendation: Add 15-20 more quotes per language (famous ones with attribution) to reach the 45-50 range, and update the quote display to show author when present. Store as `{ text: "...", author: "..." }` objects instead of plain strings.

2. **Referral source storage format**
   - What we know: Dropdown with 6 options + "Other" free text
   - What's unclear: Store as single string or as object `{ source: "other", text: "..." }`?
   - Recommendation: Store as single string. When "other" is selected, save the free text value directly. When a preset is selected, save the preset key (e.g., "facebook"). This keeps the data simple and queryable.

3. **Inline client form in add-session.html also needs "Other" type and referral source**
   - What we know: add-session.html has an inline client creation form (lines 99-163) with its own toggle group for client type (currently 3 options: child, adult, animal)
   - What's unclear: Whether referral source should also appear in the inline form
   - Recommendation: Add "Other" toggle card to inline form. Skip referral source in inline form (it's a quick-add flow; referral can be added later via edit).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no test framework installed |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Session fields match agreed structure | manual-only | Open add-session.html, verify field order | N/A |
| DATA-02 | Client types: Adult/Child/Animal/Other | manual-only | Create client with each type, verify DB | N/A |
| DATA-03 | Referral source dropdown + "Other" free text | manual-only | Add client with referral, edit and verify persistence | N/A |
| DATA-04 | New session fields: Limiting Beliefs, Additional Techniques, Important Points, Next Session Info | manual-only | Fill all fields, save, reload, verify values persist | N/A |
| FEAT-01 | Client search by name, real-time filtering | manual-only | Type in search box, verify table filters | N/A |
| FEAT-02 | Daily greeting with rotating quotes | manual-only | Load overview page, verify greeting + quote displayed | N/A |

**Justification for manual-only:** No test framework exists (FOUND-05 Playwright tests deferred to Phase 6). This is a vanilla HTML/JS app opened directly in browser. All testing is visual/functional in-browser.

### Sampling Rate
- **Per task commit:** Manual browser verification of changed feature
- **Per wave merge:** Full walkthrough of all changed pages in both light/dark mode
- **Phase gate:** Complete manual test of all 6 requirements before verification

### Wave 0 Gaps
None applicable -- no test framework to configure. Testing is manual until Phase 6 (FOUND-05).

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** -- all findings verified by reading actual source files:
  - `assets/db.js` -- migration infrastructure, MIGRATIONS map pattern, DB_VERSION
  - `assets/add-session.js` -- session form logic, existing field handling, buildSessionMarkdown()
  - `assets/add-client.js` -- client form, toggle card pattern, type handling
  - `assets/overview.js` -- client table rendering, getDailyQuote(), renderGreeting()
  - `assets/app.js` -- renderNav(), i18n system, severity scale, shared utilities
  - `assets/i18n.js` -- all translation keys (en, he, de, cs), existing QUOTES data
  - `add-session.html` -- session form HTML structure, expandable fields
  - `add-client.html` -- client form HTML, toggle cards
  - `index.html` -- overview page, greeting card, client table, brand mark

### Secondary (MEDIUM confidence)
- **CONTEXT.md** -- user decisions from interactive session with Sapir (2026-03-10)
- **REQUIREMENTS.md** -- requirement definitions and traceability
- **STATE.md** -- project history and accumulated decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no external dependencies, fully inspected codebase
- Architecture: HIGH -- all patterns verified in source code, no guessing needed
- Pitfalls: HIGH -- identified from actual code paths that need modification
- Integration points: HIGH -- every file change point identified with line numbers

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable -- no external dependencies that could change)
