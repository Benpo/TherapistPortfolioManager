---
created: 2026-04-26T00:00:00.000Z
title: Editable session section titles — let therapists define their own categories
area: feature
priority: medium
recommended_entry: /gsd-spec-phase
files:
  - add-session.html
  - assets/add-session.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
  - assets/db.js
---

## Origin — Sapir feedback (2026-04-26)

Hebrew (verbatim):
> הכותרות של השדות במהלך הטיפול למשל Edit sections, Trapped Emotion, Physical Inbalance שווה שיהיו ניתנות לעריכה, כלומר שהמטפל יבחר עבור עצמו קטגוריות שהוא רוצה למלא לעצמו, ולאו דווקא שם/מושג מוגדרים מראש.

Translation:
> The field titles during a session — for example "Edit sections", "Trapped Emotion", "Physical Imbalance" — should be editable. The therapist should pick their own categories, not be locked into pre-defined names/concepts.

## What this is really about

The app's session form is currently structured around **Emotion Code / Body Code** terminology (Sapir's modality). Therapists from other modalities (CBT, somatic, body psychotherapy, art therapy, etc.) wouldn't use these labels — they'd want their own. Locking the vocabulary limits the addressable market beyond Emotion Code practitioners.

## Current state

Section titles are hardcoded in `add-session.html` and translated via i18n keys (`session.section.trappedEmotion`, etc.). All 4 languages duplicate the same fixed structure.

## Key design questions to resolve before planning

These should be answered during `/gsd-spec-phase` before writing PLAN.md:

1. **Scope of customization**
   - Rename only? Or also add/remove sections? Reorder?
   - Per-therapist global default, or per-client overrides, or per-session?

2. **Templates / starter sets**
   - Should the app ship with multiple modality templates (Emotion Code, generic talk-therapy, somatic, art therapy)?
   - Or one blank-slate plus the current Emotion Code preset?

3. **Migration**
   - Existing sessions in the DB are stored against current section keys. What happens when a therapist renames a section? Old data needs to map somewhere.
   - Soft approach: keep old keys as data, just relabel in UI.
   - Hard approach: rewrite stored session data on rename.

4. **i18n**
   - Default sections currently translate per language. User-defined sections will be entered in one language only — is that acceptable?
   - For multi-language therapists: do they want to define labels per language?

5. **Where the editor lives**
   - New "Section settings" screen?
   - Inline edit via long-press / pencil icon on the session form?
   - One-time onboarding wizard ("Pick your modality")?

6. **Visual structure of a session — does it stay the same?**
   - Today: each section has different field types (severity scale, free text, dropdown). If sections become free-form, do all fields become free text? Or do users pick a field type per section?

## Recommended workflow when picked up

1. `/gsd-spec-phase` — Socratic spec refinement to lock the WHAT (answer the questions above with falsifiable requirements).
2. `/gsd-discuss-phase` — design decisions (data model, migration path).
3. `/gsd-plan-phase` — task breakdown.
4. `/gsd-execute-phase`.

## Related innovator suggestion (2026-04-26 session)

The innovator agent flagged this same need under "Customizable intake fields" — and noted it's the largest item but the highest-leverage for product positioning. Worth combining scopes: editable session sections AND custom intake fields might share the same custom-fields infrastructure.
