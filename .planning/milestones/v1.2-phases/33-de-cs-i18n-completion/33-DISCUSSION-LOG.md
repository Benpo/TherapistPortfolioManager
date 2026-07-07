# Phase 33: DE/CS i18n completion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 33-de-cs-i18n-completion
**Areas discussed:** Structure (phase scope), Translation source & sign-off, Expanded helper copy, Verification approach

---

## Structure — how does comments batch-2 relate to Phase 33?

Ben asked to fold the P32-style comment-cleansing work (next module group) into this phase.
Flagged as two unrelated workstreams (blocked i18n strings vs. unblocked comment banners, zero file overlap).

| Option | Description | Selected |
|--------|-------------|----------|
| Separate phase, both this session | Keep 33 = i18n only; sequence comments-batch-2 as its own phase right after | ✓ |
| Bundle into Phase 33 | One CONTEXT covering both; phase stays blocked on Sapir | |
| Pivot 33 to comments now | Make comments the real work now, i18n a thin later follow-up | |

**User's choice:** Separate phase, both this session.
**Notes:** Comments batch-2 becomes Phase 34, sequenced via `/gsd-phase` immediately after this discuss.

---

## Translation source & sign-off

| Option | Description | Selected |
|--------|-------------|----------|
| Sapir authors both, authoritative | Wait for Sapir's DE+CS strings | |
| Claude drafts, Ben verifies DE / Sapir verifies CS | Human native check per language | |
| Claude drafts both, Sapir reviews both later | Provisional merge, later human pass | |

**User's choice:** Free-text — AI native-translation panel.
**Notes:** Per language (DE, CS): 3 native-speaker agents with 3 different perspectives,
cross-checked for nativeness, then a synthesizer finalizes. Explicitly: **neither Sapir nor
Ben can translate to DE/CZ**, so there is no human translator gate. This supersedes the
REQUIREMENTS.md "(needs Sapir's strings)" note on I18N-01/02.

---

## Expanded helper copy

| Option | Description | Selected |
|--------|-------------|----------|
| Faithful but natural | Preserve all expanded-EN guidance, native phrasing, restructure allowed | ✓ |
| Concise native helpers | Shorter pre-expansion style; drops extra guidance | |
| Verbatim literal | Sentence-for-sentence, risks stilted translation | |

**User's choice:** Faithful but natural.
**Notes:** DE/CS users must get the same amount of help as EN users.

---

## Verification approach

| Option | Description | Selected |
|--------|-------------|----------|
| Automated parity test + manual visual | no-TODO + DE/CS↔EN key parity test, plus locale screenshots | ✓ |
| Automated parity test only | Test-only; misses visual fit issues | |
| Manual visual only | Eyeball only; no permanent regression guard | |

**User's choice:** Automated parity test + manual visual.
**Notes:** Extend the P30 `npm test` harness; manual screenshot of export modal steps 1–3 in DE + CS.

---

## Claude's Discretion

- **Formatting-tip syntax characters (D-05):** Not put to a separate question — recorded as a
  technical constraint. The literal ASCII Markdown characters (`**`, `*`, `#`, `-`) stay
  untranslated because `md-render.js` only parses ASCII; only the surrounding prose is translated.

## Deferred Ideas

- **Comments batch-2** → sequenced as Phase 34 this session (not lost, modeled separately).
- **Landing-page DE/CS translation verification (LNCH-04)** → matched the phase but targets the
  marketing landing page, not the export modal; remains a deferred backlog item.
