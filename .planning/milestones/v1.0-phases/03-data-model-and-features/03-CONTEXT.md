# Phase 3: Data Model and Features - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Finalizing the clinical session data model (with Sapir's practitioner input), expanding client types to Adult/Child/Animal/Other, adding referral source tracking, wiring up four new session fields (Limiting Beliefs, Additional Techniques, Important Points, Next Session Info), adding client search, completing the daily greeting quotes, and a small navigation fix (logo → homepage). No new pages, no backend, no new core workflows — this phase deepens what's already there.

</domain>

<decisions>
## Implementation Decisions

### Session Fields — Final Field List and Order (DATA-01, DATA-04)

The complete session form field order (top to bottom):
1. Issues (name + before/after severity) — max 3, existing behavior kept
2. Trapped Emotions — dedicated field, not merged
3. Limiting Beliefs — new field (already in DB code, needs HTML wiring)
4. Additional Techniques — new field (already in DB code, needs HTML wiring)
5. Important Points — new field (**completely missing**, needs DB + HTML)
6. Insights — keep as separate field from Comments
7. Comments — keep as separate field
8. Next Session Info (`customerSummary`) — existing field

**All four new fields** (Limiting Beliefs, Additional Techniques, Important Points, Next Session Info) are included — no skipping.

### Session Fields — Label Changes

- "נושאים שטופלו במפגש" → **"נושאי המפגש"** (section heading for issues)
- "סיבת הפנייה/תלונה" → **"נושא לטיפול"** (individual issue name field label)

### Session Fields — Important Points Highlighting

"Important Points" gets a subtle visual highlight — accent color or star icon on the label. All other fields look identical to each other.

### Session Fields — Severity Delta Display

When both "before" and "after" severity scores are filled in for an issue, display the **numerical delta** (difference) at the end of the issue row. Example: before 8, after 3 → show "−5" or "+5" visually. Claude decides the exact visual treatment.

### Session Fields — Markdown Export

All four new fields (Limiting Beliefs, Additional Techniques, Important Points) are included in the markdown copy-to-clipboard export. Only include non-empty fields in the export — skip blank fields to keep exported notes clean.

### Client Types (DATA-02)

Replace current Human/Animal with four types: **Adult, Child, Animal, Other**.
Existing records with type "human" should be migrated to "adult" in the DB migration.

### Referral Source (DATA-03)

- **Format:** Dropdown with predefined options + "Other" that opens a free text field
- **Options:** Facebook, Instagram, המלצה מפה לאוזן, המלצה מקולגה/מטפל אחר, חיפוש אינטרנט, אחר
- **Required:** Not required — optional field (Claude's discretion on UX treatment)
- **Display in profile:** Claude's discretion (whether to show in the client modal/overview)
- Appears in the Add/Edit Client form

### Client Search (FEAT-01)

- **Location:** Search box above the client table on the overview page
- **Searches:** Name only (not phone/email — user decision overriding original requirement)
- **Behavior:** Real-time filtering as the user types — no Enter needed
- **Visual:** Simple input with placeholder above the existing table

### Daily Greeting Quotes (FEAT-02)

The greeting card (morning/afternoon/evening text) already exists in code. What's needed:
- **Content:** 30–50 quotes per language
- **Languages:** All four — Hebrew, English, German, Czech
- **Tone:** Motivating and empowering — suitable for energy healing practitioners starting their work day
- **Sources:** Mix of famous quotes (with author attribution) + custom written quotes; no EC/Emotion Code/Bradley Nelson specific content (trademark risk)
- **Attribution:** Always show author name for famous quotes; custom quotes have no attribution
- **Hebrew quotes:** Use plural form (לשון רבים) wherever natural; alternate masculine/feminine forms where plural doesn't fit
- **File structure:** Claude decides — likely a separate `assets/quotes.js` file that sets `window.QUOTES`

### Navigation Fix — Logo Links to Homepage

The "Sessions Garden" brand mark (logo + leaf icon) in the header should be a clickable link to `index.html`. Currently it's not clickable. This applies to all pages.

### Hebrew Text Policy (App-Wide)

For all Hebrew UI text in this phase:
- Use **plural form (לשון רבים)** as the default when grammatically natural
- When plural doesn't fit the sentence naturally, **alternate between feminine and masculine** forms rather than defaulting to one gender

### Claude's Discretion

- Exact visual treatment of the severity delta (color, position, format)
- Whether referral source is shown in the client modal overview
- Exact styling of the Important Points highlight (accent vs star icon)
- HTML form structure for new session fields
- File structure for quotes (separate file vs inline)
- IndexedDB migration version number and migration function name for schema changes

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `assets/db.js`: MIGRATIONS map at version 1 with explicit comment `// Phase 3 will add version 2 here`. DB_VERSION must be bumped to 2. Schema changes: add `referralSource` to clients; `importantPoints` to sessions. `limitingBeliefs`, `additionalTech`, `customerSummary` are already stored in sessions — no migration needed for those, just HTML.
- `assets/add-session.js`: Already reads/writes `limitingBeliefs`, `additionalTech`, `customerSummary` (lines 509–511, 773–776). Missing: `importantPoints` field entirely. The `buildSessionMarkdown()` function needs all new fields added.
- `assets/add-client.js`: Has `toggleCard` pattern for client types — same pattern extends to add Adult/Child/Animal/Other. Currently defaults to `"adult"`. Old code used `"human"` — migration needed.
- `assets/overview.js`: `renderGreeting()` and `getDailyQuote()` already implemented. `window.QUOTES` is undefined — the quotes file is the missing piece. Client table renders from `getAllClients()` — search filter wraps this render.
- `assets/app.js`: `initCommon()` runs on every page, renders the nav via the nav component from Phase 2. Logo link fix goes here or in the nav HTML template.

### Established Patterns

- DB migrations: `MIGRATIONS[v]` pattern in `db.js` — Phase 3 adds `MIGRATIONS[2]` to add indexes/fields for referral source and client type migration
- Toggle cards: `setupToggleGroup(groupId)` — reusable for any radio group. Client types and session types both use it.
- i18n: `App.t("key")` + `data-i18n="key"` attribute — all new field labels and dropdown options need i18n keys in all 4 languages
- `App.createSeverityScale()` — reusable for before/after severity. Delta calculation builds on `App.getSeverityValue()`
- Markdown export: `buildSessionMarkdown()` in `add-session.js` — add new fields to this function

### Integration Points

- `assets/db.js`: Bump `DB_VERSION` to 2, add `MIGRATIONS[2]` for schema changes (referralSource on clients, importantPoints on sessions, migrate `type: "human"` → `type: "adult"`)
- `assets/add-client.js` + `add-client.html`: Add referral source dropdown + "Other" free text field; update client type toggles from 2 options to 4
- `assets/add-session.js` + `add-session.html`: Wire up 3 existing JS fields to HTML inputs; add `importantPoints` field; reorder fields; update markdown export; add delta display to issue blocks
- `assets/overview.js`: Add search input above table, filter `getAllClients()` result by name before rendering; add quotes file load
- `assets/quotes.js` (new file): Define `window.QUOTES = { en: [...], he: [...], de: [...], cs: [...] }`
- Nav component (from Phase 2): Make logo/brand mark a link to `index.html`
- `assets/i18n.js` + per-language files: All new labels, placeholders, dropdown options in 4 languages

</code_context>

<specifics>
## Specific Ideas

- Severity delta: "לפער בין ההתחלה והסוף תהיה התגלמות מספרית בסוף הטוס" — numerical delta shown at the end of each issue row when both before and after are filled
- Important Points: gets visual distinction from other fields (star or accent color on label)
- Referral source options reflect actual practice: Facebook, Instagram, word-of-mouth, colleague/therapist referral, internet search, other
- Quotes: motivating tone suitable for starting a therapy workday; 30–50 per language; famous quotes include author name; no EC/Bradley Nelson specific content
- Hebrew: plural form default, alternate masc/fem when singular needed
- Logo click → index.html: "ברגע שילחצו על שם הלוגו — זה יוביל לעמוד הראשי"
- Markdown export: skip blank fields (only export filled-in fields)

</specifics>

<deferred>
## Deferred Ideas

None — all requests stayed within Phase 3 scope.

</deferred>

---

*Phase: 03-data-model-and-features*
*Context gathered: 2026-03-10*
