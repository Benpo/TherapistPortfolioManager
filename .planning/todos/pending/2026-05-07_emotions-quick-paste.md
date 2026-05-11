---
created: 2026-05-07
priority: high
type: new-feature
size: phase (multi-task, needs spec + design + plan + execution)
becomes_phase_after: "all currently-open Phase 22 round-3 gaps are closed"
status: pending
source: 2026-05-07 round-3 UAT conversation (Ben, captured during gap re-test)
---

# Emotions / specific-text quick-paste feature

## What Ben said (verbatim)

> some long text of specific emotions will be copied and added easily by the user. not sure exactly where and how, but its a high priority feature we need to discuss and think about.

## My (Claude's) reading

A way for the therapist to paste/insert long pre-canned blocks of text — most likely emotion lists, technique descriptions, or session-template snippets — into a session field with one click rather than typing them out each time. Ben hasn't specified WHERE (which field), HOW (paste from clipboard? library of snippets? per-section snippet picker?), or with WHAT MANAGEMENT (curate via settings? import from file?).

This is **a feature, not a bug fix** — it deserves its own phase, not an add-on to an existing one.

## What it likely needs (inputs to the spec phase)

- Discovery: which fields benefit? Likely the `comments` / `nextSession` / `trapped emotions` / `insights` / `additionalTech` textareas where therapists currently free-type.
- Source of the snippets: pre-baked library? user-curated? imported from file? per-language?
- UI pattern: dropdown picker? command-palette-style fuzzy search? sidebar chips? right-click menu?
- Ownership: lives on the session form, OR centrally manageable from the Settings page.
- Locale handling: snippets can be per-language (English, Hebrew, German, Czech).

## When to start

**After all currently-open Phase 22 round-3 gaps are closed** (see `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-HUMAN-UAT.md` Summary `open_gaps` list). Ben explicitly said this is high-priority but should follow the existing batch.

## Suggested GSD workflow when picked up

1. `/gsd-spec-phase` — Socratic spec refinement to nail down WHAT this feature delivers (which fields, which pattern, snippet source). Ben specifically said he wants to "discuss and think about" this — that's spec-phase territory.
2. `/gsd-discuss-phase` — gray-area decisions (locale handling, IDB schema, UI pattern).
3. `/gsd-plan-phase` — atomic task breakdown.
4. `/gsd-execute-phase` — implementation.
5. `/gsd-verify-work` — UAT.

## Cross-references

- Logged separately from the Phase 22 UAT gaps because this is a new capability, not a defect.
- Originally raised by Ben in 2026-05-07 round-3 UAT conversation.
- Numbered N8 in that conversation's findings list (N1–N7, N9–N12 are bug fixes, N8 is this feature).
