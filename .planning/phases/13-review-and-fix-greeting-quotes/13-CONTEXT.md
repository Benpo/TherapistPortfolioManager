# Phase 13: Review and Fix Greeting Quotes - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Review all 41 greeting quotes across 4 languages (EN, HE, DE, CS). Fix unnatural phrasing, incorrect attributions, and Hebrew gender inconsistencies. Optionally adjust quantity. No new features, no UI changes — content-only phase.

</domain>

<decisions>
## Implementation Decisions

### Review scope
- Review ALL quotes in all 4 languages (EN, HE, DE, CS)
- Claude handles the full review autonomously — no external reviewers needed
- Check every quote for: natural phrasing, correct attribution, cultural fit

### Criteria for fixing
- **Unnatural phrasing** — quotes that sound like literal translations or awkward in the target language
- **Incorrect attribution** — if a quote can't be verified as said by the attributed person, either fix the attribution or replace the quote entirely
- **Tone** — current tone is good (healing, inspiration, energy, motivation). Keep it

### Hebrew gender rules
- **Priority 1:** Neutral phrasing (avoid gendered forms entirely)
- **Priority 2:** Plural form (לשון רבים) when neutral isn't possible
- **Priority 3:** Feminine form (לשון נקבה) as last resort
- Fix any existing masculine-only quotes ("כשאתה מרפא") to follow this priority

### Famous quotes approach
- The person doesn't matter — the message and natural phrasing matter
- If a famous quote sounds great and is correctly attributed: keep it
- If attribution is wrong or can't be verified: either fix or replace with original
- Sapir is fully open to replacing ALL famous quotes with original ones if they sound better
- Each language should feel "local" — not like a translation

### Quantity
- Claude's Discretion: currently 41 per language, original target was 48
- If quotes need to be removed (bad content), replace them to maintain count
- If good new quotes emerge during review, can add up to ~48

### Cross-language consistency
- Each quote should have a version in all 4 languages
- Translations don't have to be literal — should feel natural and idiomatic in each language
- If a quote doesn't work in a specific language, replace with a culturally appropriate alternative (keeping the same spirit/theme)

</decisions>

<specifics>
## Specific Ideas

- "I don't want to attribute a quote to someone who didn't say it" — accuracy matters
- "As long as it sounds good and has a good message" — quality over provenance
- Hebrew quotes should sound like they were written in Hebrew, not translated
- German and Czech quotes should feel "local" (muttersprachlich / přirozeně)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `assets/i18n-he.js`: Hebrew quotes at line 217+ (window.QUOTES.he)
- `assets/i18n-en.js`: English quotes at line 217+ (window.QUOTES.en)
- `assets/i18n-de.js`: German quotes (window.QUOTES.de)
- `assets/i18n-cs.js`: Czech quotes (window.QUOTES.cs)

### Established Patterns
- Quote format: `{ text: "...", author: "..." }` — author is optional (custom quotes omit it)
- Custom quotes (no author) come first, then famous quotes (with author) in each array
- `getDailyQuote(lang)` in `assets/overview.js` selects quote by day-of-year modulo

### Integration Points
- `assets/overview.js:renderGreeting()` displays the daily quote on the overview page
- No other consumers of the quotes data

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-review-and-fix-greeting-quotes*
*Context gathered: 2026-03-20*
