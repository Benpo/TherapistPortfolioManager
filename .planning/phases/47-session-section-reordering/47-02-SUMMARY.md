---
phase: 47-session-section-reordering
plan: 02
subsystem: i18n
tags: [i18n, localization, reordering, severity, export]
status: complete
requires:
  - UI-SPEC Copywriting Contract (verbatim EN strings)
provides:
  - "Stable i18n key set (EN/HE/DE/CS) for Wave-2 feature plans 47-03/04/05/07"
  - "D-14 Hebrew export-label mismatch fix"
affects:
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
tech-stack:
  added: []
  patterns:
    - "window.I18N dot-notation dictionaries, EN corpus of record, 3 locale mirrors"
    - "CS file stores non-ASCII as \\uXXXX escapes (existing convention); EN/HE/DE store raw UTF-8"
key-files:
  created: []
  modified:
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "Reused session.accordion.emotions for the Emotions & Techniques group header (no new key); added session.group.wrapup for the wrap-up group header (G-4)"
  - "issuesHeading renamed to Session topics (marker ' *' kept); export.section.topics carries the stripRequired value; the two are asserted equal per locale (D-14/G-15/R2-1)"
  - "No skip-hint key added — the '— (skip)' pill design is dropped (D-19)"
metrics:
  duration: ~15min
  tasks: 2
  files: 4
  completed: 2026-07-23
---

# Phase 47 Plan 02: Phase-47 i18n UI-String Contract Summary

Authored the full Phase-47 UI-string key set (reorder controls, severity master row, export topics/severity split, group headers) verbatim from the UI-SPEC Copywriting Contract across all four locales EN/HE/DE/CS, fixed the D-14 Hebrew export-label mismatch, and renamed the topics section to "Session topics" — so the Wave-2 feature plans consume stable keys without touching the shared dictionaries.

## Final Key Names (the contract for 47-03/04/05/07)

New keys (present in all four locales):

| Key | EN value |
|-----|----------|
| `settings.reorder.dragHandle.aria` | `Reorder {section}` |
| `settings.reorder.moveUp.aria` | `Move {section} up` |
| `settings.reorder.moveDown.aria` | `Move {section} down` |
| `settings.reset.order.label` | `Reset order` |
| `settings.reset.names.label` | `Reset names` |
| `settings.reset.names.confirm` | `Replace all custom names with the defaults? Names you typed will be lost.` |
| `settings.row.afterSeverity.label` | `Issue severity` |
| `settings.row.afterSeverity.info` | full ⓘ explainer sentence ("One switch for all severity ratings…") |
| `session.form.severityAtStart` | `Severity at start` (topic-row rating label; replaces "Severity before") |
| `session.group.wrapup` | `Session Wrap-up` (G-4) |
| `export.section.topics` | `Session topics` (= stripRequired of the in-session title) |
| `export.suboption.includeSeverity` | `Include severity before/after` |

Changed existing keys:

| Key | Before (EN) | After (EN) |
|-----|-------------|------------|
| `session.form.afterSeverityTitle` | `Issue severity at the end of this session` | `Issue severity — end of session` |
| `session.form.issuesHeading` | `Issues addressed in this session *` | `Session topics *` (marker kept) |
| `settings.row.issues.description` | `The issues addressed and their before/after severity` | `The topics you addressed in this session` (severity-free, G-6) |

Reused (no new key): `session.accordion.emotions` serves as the Emotions & Techniques group header.

Per-locale notes:
- **HE** `session.form.issuesHeading` unchanged (`נושאי המפגש *` already means "Session topics", R2-1); keeps `דרגת חומרה` severity terminology.
- **DE** topics = `Sitzungsthemen`; severity label = `Schweregrad`; form header `Schweregrad — Sitzungsende`.
- **CS** topics = `Témata sezení`; severity label = `Závažnost`; form header `Závažnost — konec sezení`.

## D-14 Fix (Hebrew export/topics label mismatch)

`export.section.topics` now equals `stripRequired(session.form.issuesHeading)` in every locale — asserted true for EN, HE, DE, CS. The Hebrew export topics checkbox and the in-session Session-topics title are now identical (`נושאי המפגש`).

## Tasks

1. **EN corpus + HE keys + D-14 fix** (commit `77a3cc0`) — `assets/i18n-en.js`, `assets/i18n-he.js`
2. **DE + CS translations** (commit `d62d144`) — `assets/i18n-de.js`, `assets/i18n-cs.js`

## Deviations from Plan

None — plan executed as written. One in-flight self-correction: the CS `export.section.topics`/`export.suboption.includeSeverity` pair was initially omitted from the first CS edit pass; the 4-locale parity check caught it and it was added before the Task-2 commit (no separate commit needed).

## Verification

- `node --check` passes on all four dictionaries.
- 4-locale parity: all 12 new keys present in EN/HE/DE/CS (zero missing).
- `session.form.afterSeverityTitle` resolves to the "Issue severity — end of session" equivalent in all four locales.
- `settings.row.issues.description` names no severity/before/after in any locale (G-6).
- `session.group.wrapup` present in all four and distinct from `session.form.comments.title` (G-4).
- `export.section.topics == stripRequired(session.form.issuesHeading)` per locale (D-14/G-15/R2-1).
- No `changelog.*` / `help.*` keys added (owned by 47-08).
- Comment hygiene: no planning IDs in any i18n diff.
- Full suite: **211 passed, 0 failed**.

## Known Stubs

None. Keys-only plan; no DOM rendering added (consumers wired by Wave-2 plans).

## Threat Flags

None. Static developer-authored translation strings only; no new trust boundary (T-47-02b accepted — rendered via existing `.textContent`/`.value` contract).

## Self-Check: PASSED
</content>
</invoke>
