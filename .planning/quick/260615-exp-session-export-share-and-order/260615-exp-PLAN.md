---
quick_id: 260615-exp
slug: session-export-share-and-order
date: 2026-06-15
status: complete
---

# Quick 260615-exp: Session export — share leaks file path + section order

Two bugs discovered in the session export/share flow.

## Bug #1 — Share leaks the temp file path (and duplicates the PDF)

**Symptom:** Using the export dialog's "Share via device" on macOS Chrome →
WhatsApp produced THREE items: the PDF, a junk text message containing the
absolute temp path
(`/Users/.../Chrome/Default/WebShare/share-.../Adam K_2026-06-15.pdf מסמך מפגש`),
and a duplicate PDF. Therapist expects only the file.

**Root cause:** `exportHandleShare()` called
`navigator.share({ files, title, text })`. With a `text` field present, macOS
Chrome's Web Share leaks the WebShare temp file path as a separate message and
the target re-attaches the path as a second file.

**Fix:** Share files-only — `navigator.share({ files: [file] })`.
(`assets/add-session.js`)

## Bug #2 — Export section order doesn't match the add-session form

**Symptom:** "כלים ושיטות נוספות" (additionalTech) appeared in the export but in
the wrong place — it should follow the same order as the add-session page (3rd
heading for that session), but showed up after the wrong sections.

**Root cause:** `buildFilteredSessionMarkdown()` (export PDF) and
`buildSessionMarkdown()` (copy) emitted `insights` LAST, after `additionalTech`,
while the form DOM order (data-section-key in add-session.html) is
`trapped → insights → limitingBeliefs → additionalTech`.

**Fix:** Reordered both builders to mirror the form DOM order.
(`assets/add-session.js`)

## Verification

Falsifiable behavior tests (RED before fix, GREEN after):
- `tests/quick-260615-share-files-only.test.js` — extracts & evaluates the real
  `navigator.share` payload; asserts files-only (no text/title).
- `tests/quick-260615-export-section-order.test.js` — derives canonical order
  from add-session.html DOM and asserts both builders match it.

Full suite: 68/68 test files pass.
