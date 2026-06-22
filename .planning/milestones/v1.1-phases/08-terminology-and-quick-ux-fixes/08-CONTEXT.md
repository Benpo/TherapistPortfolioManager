# Phase 8: Terminology and Quick UX Fixes - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Update practitioner-appropriate terminology across all 4 languages (EN/HE/DE/CS) and replace text action buttons with icon buttons in the clients table. No new features — just terminology cleanup and UI refinement.

</domain>

<decisions>
## Implementation Decisions

### Hebrew Terminology
- "מטופל" → "לקוח" everywhere (nav, stats, forms, labels, toasts, confirmations, filters, reporting)
- "מטופלים" → "לקוחות" (plural form)
- "טיפוליים" → "אנרגטיים" in subtitle ("תיעוד ומעקב אחר מפגשים אנרגטיים")
- "נושא לטיפול" → "נושא למפגש" (session form issue field)
- "טכניקות ושיטות טיפול נוספות" → "טכניקות וכלים נוספים" (session form additional techniques field)
- Quote "הקשר בין מטפל למטופל הוא קרקע פורייה לצמיחה" — replace with a different quote that doesn't use מטפל/מטופל

### EN/DE/CS Terminology
- Claude's discretion: review all 3 language files for any remaining "treatment/patient" references and align with non-clinical framing
- Guiding principle: avoid implying formal medical/clinical treatment — this is energy healing practice software
- EN already uses "client" throughout — likely minimal changes
- DE already uses "Klient" — likely minimal changes
- CS already uses "Klient" — likely minimal changes

### Icon Buttons
- Replace "פרטים" (details) text button with a clock/history icon — represents "previous sessions"
- Keep "+" button for adding new session
- Both buttons always visible (not hidden on hover like current "+" behavior)
- Tooltip on history button: "מפגשים קודמים" (previous sessions)
- Tooltip on add button: "מפגש חדש" (new session)
- Remove "פעולות" (actions) column header entirely — icons speak for themselves
- On mobile: icons are clear enough without tooltips, no special mobile treatment needed

### Claude's Discretion
- Icon rendering approach (inline SVG vs text characters — SVG recommended for consistency and styling)
- Exact icon design for the history/clock icon
- EN/DE/CS terminology adjustments — as long as it's clearly non-clinical
- Replacement quote for the Hebrew quote containing "מטפל/מטופל"
- Button sizing and spacing details

</decisions>

<specifics>
## Specific Ideas

- History icon should feel like "past/history" — a clock variant, not the specific emoji 🕰️ which was deemed unclear
- Tooltips should say "מפגשים קודמים" (not "פרטים") and "מפגש חדש" (not "הוספת מפגש") — shorter, more natural
- The subtitle change from "טיפוליים" to "אנרגטיים" is important for positioning as energy healing, not medical treatment

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `assets/i18n-he.js`: ~35 occurrences of "מטופל" to replace
- `assets/i18n-en.js`, `i18n-de.js`, `i18n-cs.js`: review for "treatment/patient" remnants
- `assets/i18n-disclaimer.js`: contains "treatment" in legal text — this is appropriate legal language, may not need changing

### Established Patterns
- i18n: per-language files (`i18n-{lang}.js`), accessed via `App.t("key")` pattern
- Buttons: `row-toggle` class for detail button, `row-quick-add` class for "+" button
- Current "+" button uses CSS hover reveal (`opacity:0` → `opacity:1` on `.client-row:hover`) — this behavior should be removed since both buttons will now always be visible

### Integration Points
- `assets/overview.js` lines 239-256: builds action buttons for client table rows
- `assets/app.css` lines 337-376: styles for `row-toggle`, `row-actions`, `row-quick-add`
- `assets/app.css` line 793: mobile responsive styles for `row-quick-add`
- `assets/app.css` line 813: RTL styles for `row-actions`
- Quotes array in `assets/i18n-he.js`: Hebrew inspirational quotes (one needs replacement)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-terminology-and-quick-ux-fixes*
*Context gathered: 2026-03-19*
