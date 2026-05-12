---
created: 2026-04-26T00:00:00.000Z
title: Session-to-document email export — turn a session into an editable, sendable client document
area: feature
priority: medium
recommended_entry: /gsd-spec-phase
files:
  - assets/add-session.js
  - assets/sessions.js
  - add-session.html
  - sessions.html
---

## Origin — Sapir feedback (2026-04-26)

Hebrew (verbatim):
> צריך למצוא רעיון איך אנחנו מוסיפים קיצור דרך בין הסשנד שהקלטנו בטיפול עצמו ואיך זה הופך לאיזשהו מסמך שאפשר גם לערוך וגם לשלוח אחר כך ישר למייל למטופל שזה יהיה מסודר לפי הכותרות של הסקשנים השנים של הטיפול ושיהיהם תאריך וכאלה ושזה יהיה ממש תאריך אוטומטית מהסשנדס גארדן למסמך הזה.

Translation:
> Need an idea for how we add a shortcut between the session we recorded during therapy and how it becomes some kind of document — one that can be edited AND sent directly by email to the patient, organized according to the section titles of the various therapy sessions, with dates etc., and the date should populate automatically from Sessions Garden into this document.

## What this is really about

Sessions are currently a documentation terminus — therapist writes notes, then nothing. Sapir wants a workflow loop: session notes → editable document → email to patient. This builds a habit loop where the patient feels cared for and is reminded of the practice between sessions.

There's already a "Copy Session (MD)" button that hints at this need but only writes to clipboard.

## Key design questions to resolve before planning

These should be answered during `/gsd-spec-phase` before writing PLAN.md:

1. **Email delivery mechanism** — biggest decision
   - **`mailto:`** — local-first, zero backend, opens user's mail client with pre-filled body. Patient email already stored on client. Limit: no attachments, body length capped, email lives in therapist's Sent folder.
   - **n8n / SMTP** — branded, attachable PDF, tracking. Adds backend dependency, raises GDPR scope (we now process client emails through a server).
   - **Lemon Squeezy** — not built for this, dismiss.
   - Recommendation: start with `mailto:` — local-first matches the app's privacy positioning.

2. **What gets sent — full notes vs client-facing summary**
   - Full session notes contain therapist-only observations (severity ratings, internal notes). Sending verbatim is wrong.
   - Two approaches:
     - **Filtered**: pre-defined "client-safe" subset (e.g. "Information for Next Session" field + selected sections).
     - **Editable draft**: generate full draft, therapist edits before send.
   - Recommendation: editable draft (lower risk, more therapist control).

3. **Document format**
   - Plain text email body (works everywhere, no styling).
   - HTML email body (formatted, brand-able).
   - PDF attachment (professional, shareable).
   - Recommendation: HTML body for `mailto:` (mailto supports it on most clients) + offer "Download as PDF" alongside.

4. **Editing UI**
   - In-app rich-text editor — heavyweight.
   - Generate plain-text/markdown draft, let therapist edit in textarea, preview, then send.
   - Recommendation: textarea + live preview.

5. **Date integration ("automatic from Sessions Garden")**
   - Session date pulls into document header automatically.
   - Multiple sessions selectable for a multi-session summary? Or single-session only?
   - Recommendation: single session per document v1; cumulative summary v2.

6. **Localization**
   - The patient may speak a different language than the therapist's UI. Need a way to choose document language at send time.

7. **Privacy / GDPR**
   - Client email already in DB → already a data point we hold.
   - Sending via `mailto:` keeps therapist as data controller (no new processor).
   - Sending via SMTP introduces a new processor — needs disclosure in Datenschutz.

8. **Integration with existing UI**
   - "Send to client" button on session edit page? On session list? Both?
   - Default vs explicit action — should every session prompt to send, or only on demand?

## Recommended workflow when picked up

1. `/gsd-spec-phase` — answer the questions above; lock falsifiable requirements.
2. `/gsd-discuss-phase` — design decisions (mailto vs SMTP, format).
3. `/gsd-plan-phase` — task breakdown.
4. `/gsd-execute-phase`.

## Related innovator suggestion (2026-04-26 session)

The innovator agent rated this in the **Top 3 priorities** as "Send to client via mailto:" — recommending the `mailto:` approach explicitly because it stays local-first, requires no backend, and the patient email is already in the database. The innovator framed it as a habit-loop differentiator: documenting → sending → patient returns. Worth combining with the session-summary copy infrastructure that already exists.
