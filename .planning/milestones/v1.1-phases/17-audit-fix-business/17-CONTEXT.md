# Phase 17: Audit Fix — Business - Context

**Gathered:** 2026-03-23
**Updated:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix all business/operational findings from Phase 15 audit: Lemon Squeezy product wiring, Impressum/Datenschutz real content, Hebrew quote parity, and post-purchase UX flow.

</domain>

<decisions>
## Implementation Decisions

### Hebrew Quotes (BIZ-04)
- **D-01:** Keep the 2 extra HE quotes (Lao Tzu, Paulo Coelho). Translate them to EN/DE/CS so all languages reach 43 quotes.
- **D-02:** Present EN/DE/CS translations of the 2 extras to Ben for approval before committing (checkpoint task).
- **D-03:** Sapir adapted the 6 missing quotes rather than translating literally — use her versions as-is:
  1. "A small light..." → מספיק אור אחד קטן כדי להאיר את החשכה
  2. "Out beyond ideas..." (Rumi) → במרווח הדק בין ה-כן ל-לא, מתקיים עולם שלם
  3. "Smile, breathe..." (Thich Nhat Hanh) → שתלו אהבה והוקרת תודה בחייכם
  4. "Don't ask what the world needs..." (Thurman) → מה שמחייה אותך באמת- זו השליחות שלך ומה שהעולם זקוק לו
  5. "In the middle of difficulty..." (Einstein) → ברגעי הקושי הגדולים ביותר- נפתחות הזדמנויות חדשות להתרחבות ושינוי
  6. "What lies behind us..." (Emerson) → כל מה שמסביבנו- קטן לעומת מה שבתוכנו

### Impressum & Datenschutz (BIZ-02, BIZ-03)
- **D-04:** CHECKPOINT TASK — blocked on Sapir's Gewerbeanmeldung. Plan includes the task, execution pauses until details provided.
- **D-05:** **CRITICAL: Use SAPIR's business details, NOT Ben's.** The app is sold under Sapir's name/Gewerbe. Ben's Freiberufler (Simpl8) is separate.
- **D-06:** Details needed from Sapir after Gewerbe registration:
  - Full name (Sapir's)
  - Shared home address (street, city, postal code)
  - Phone number (mobile OK)
  - Email: contact@sessionsgarden.app
  - Steuernummer: added later when Finanzamt assigns it (Kleinunternehmer without USt-IdNr can omit it)

### Lemon Squeezy Integration (BIZ-01)
- **D-07:** CHECKPOINT TASK — blocked on Sapir creating the product in her existing LS account.
- **D-08:** Sapir provides: Checkout URL → `assets/landing.js:6`, Store ID → `assets/license.js:16`, Product ID → `assets/license.js:17`
- **D-09:** LS account already exists (Sapir's, originally for meditation MP3 sales via SapphireHealing). Sessions Garden is a second product in the same account.

### Post-Purchase UX (BIZ-06)
- **D-10:** Prep code NOW, even before LS is live. It will activate once LS values are plugged in.
- **D-11:** Agreed flow: Landing → Buy → LS checkout (hosted) → LS Thank You → Redirect to license.html?key=XXXX → Auto-populate → Activate → Disclaimer gate (if first time) → App unlocked
- **D-12:** Auto-populate ?key= from URL params — add URLSearchParams support to license.js
- **D-13:** Disclaimer gate before activation: KEEP (legal requirement)
- **D-14:** In-app license link: add to footer/settings area
- **D-15:** LS email template: add one line with activation URL (post-purchase email)

### Manifest lang (BIZ-05)
- **D-16:** No action — decided acceptable as-is.

### Claude's Discretion
- Exact CSS for any new UI elements (in-app license link)
- LS email template wording
- How to gracefully handle the ?key= redirect when LS isn't configured yet

</decisions>

<specifics>
## Specific Ideas

- Sapir's quotes are adapted, not literal translations — they fit the healing context better
- The ?key= auto-populate already has URLSearchParams in license.js (line 98, 253) — extend, don't rewrite
- `LS_CHECKOUT_URL` placeholder already exists in landing.js — just needs real value

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Audit findings (source of truth)
- `.planning/phases/15-architecture-and-ui-audit/15-CONSOLIDATED-FINDINGS.md` — BIZ-01 through BIZ-07 definitions, dependencies, and suggested wave grouping

### Legal pages
- `impressum.html` — Current page with `[YOUR_*]` placeholders (lines 50-58)
- `datenschutz.html` — Current page with `[YOUR_*]` placeholders (lines 67-69)

### Purchase flow
- `assets/landing.js` — LS_CHECKOUT_URL placeholder (line 6)
- `assets/license.js` — Store/Product ID placeholders (lines 16-17), existing URLSearchParams (lines 98, 253)

### Quote system
- `assets/i18n-en.js` — Reference quotes (41 entries, lines ~220-270)
- `assets/i18n-he.js` — Hebrew quotes (35 entries, need 6 translated + 2 existing extras)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- URLSearchParams already parsed in license.js (lines 98, 253) — extend for ?key= auto-fill
- i18n key pattern established across all 4 language files — follow same structure for new quotes

### Established Patterns
- Legal pages use template-style placeholders `[YOUR_*]` — simple string replacement
- LS constants use `const LS_*` naming convention in landing.js

### Integration Points
- license.html receives redirect from LS checkout → needs ?key= handling
- App footer/settings → add license management link
- i18n files → new quote entries must match array index positions

</code_context>

<deferred>
## Deferred Ideas

- LS webhook handling for server-side license validation — Phase 18 or later
- Automated Steuernummer insertion once Finanzamt assigns it
- Revenue tracking/Krankenkasse threshold monitoring

</deferred>

---

*Phase: 17-audit-fix-business*
*Context gathered: 2026-03-23*
*Updated: 2026-03-23 with decisions from discuss-phase session*
