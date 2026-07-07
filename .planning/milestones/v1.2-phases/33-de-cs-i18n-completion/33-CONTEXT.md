# Phase 33: DE/CS i18n completion - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the 13 English-fallback i18n keys in `assets/i18n-de.js` and `assets/i18n-cs.js`
(lines ~445–473) with proper, native-quality German and Czech, and remove all
`// TODO i18n` markers. These keys fell back to English during the Phase 31 export-modal
extraction.

The 13 keys per file are:
- 2 settings keys: `settings.saved.notice`, `settings.saved.dismiss`
- 3 export stepper labels: `export.stepper.label.1/2/3` (Choose / Edit / Export)
- 3 export step helpers: `export.step1/2/3.helper` (now long multi-sentence copy)
- 1 formatting-tips title + 4 formatting-tip lines: `export.format.help.title/bold/italic/heading/list`

**This is a pure data change** — string values only. No code, no behavior, no DOM,
no new keys, no key renames. The rest of the export modal is already fully localized in
DE/CS, so these 13 are the only stragglers.

**Out of scope (own phases / deferred):**
- Comments batch-2 (P32 comment-pilot applied to `db.js` / `overview.js` / `sessions.js`) —
  sequenced as **Phase 34** this session; NOT part of Phase 33.
- Landing-page DE/CS translation verification (LNCH-04) — deferred backlog item, not folded.

</domain>

<decisions>
## Implementation Decisions

### Translation source & authorship
- **D-01:** Translations are produced by an **AI native-translation panel**, not a human
  translator. For **each** language (DE, CS): spawn **3 native-speaker agents with 3
  different perspectives**, cross-check their output for the most native phrasing, then a
  **synthesizer agent finalizes** a single authoritative string set. Same pipeline per language.
- **D-02:** **No human translator gate.** Neither Sapir nor Ben can translate to native-quality
  DE/CZ, so there is no "wait for Sapir's strings" dependency. **This supersedes the
  REQUIREMENTS.md I18N-01/02 note "(needs Sapir's strings)"** — that note is now stale and
  should be updated to reflect the AI-panel source.
- **D-03:** The panel MUST match the **existing localized export-modal terminology and tone**
  already present in `i18n-de.js` / `i18n-cs.js` (e.g. DE `export.next1` = "Weiter: Dokument
  bearbeiten", `export.tab.edit` = "Bearbeiten") and the prior i18n terminology report
  (`15-03-REPORT-i18n-translations.md`). Consistency with shipped strings beats fresh invention.

### Expanded helper copy
- **D-04:** Render the 3 step helpers **faithful but natural** — preserve every piece of
  guidance in the expanded English, but phrased the way a native DE/CS speaker would write it
  (sentence restructuring allowed for flow). NOT verbatim/word-for-word, and NOT the shorter
  pre-expansion copy. DE/CS users must get the **same amount of help** as EN users.

### Formatting-tip strings (Claude's discretion — recorded constraint)
- **D-05:** In the 4 `export.format.help.*` lines, the **literal Markdown syntax characters
  stay ASCII and untranslated** (`**` two stars, `*` one star, `#`/`##`, `-` dash + space) —
  only the surrounding **prose** is translated. Reason: `assets/md-render.js` only parses
  ASCII `*` / `#` / `-`; localizing the syntax characters or examples would break rendering.
  The translated prose must still describe these exact ASCII characters.

### Verification
- **D-06:** Verify with **automated parity test + manual visual check**:
  1. Automated (extend the P30 `npm test` harness): assert **zero `// TODO i18n` markers**
     remain in `i18n-de.js` / `i18n-cs.js`, AND **DE/CS key sets match EN exactly** (no
     missing, no extra keys — key parity).
  2. Manual: switch locale to DE and CS, screenshot the export modal **steps 1–3** to confirm
     strings render and fit (no overflow on stepper-label chips, no clipped helpers).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Target files (the 13 keys live here)
- `assets/i18n-de.js` (lines ~445–473) — German fallbacks + `// TODO i18n: translate to German` markers
- `assets/i18n-cs.js` (lines ~445–473) — Czech fallbacks + `// TODO i18n: translate to Czech` markers

### Source of truth for meaning
- `assets/i18n-en.js` — authoritative English source strings for all 13 keys (esp. the 3 expanded `export.stepN.helper` lines)

### Terminology / tone consistency
- `assets/i18n-de.js` / `assets/i18n-cs.js` — the already-localized export-modal keys (`export.next1/2`, `export.tab.*`, `export.step2.label.*`, `export.done`, `export.back`) set the established voice the panel must match
- `.planning/milestones/v1.1-phases/15-architecture-and-ui-audit/15-03-REPORT-i18n-translations.md` — prior i18n translation report; reference for established DE/CS terminology decisions

### Rendering constraint
- `assets/md-render.js` (~81 lines) — minimal ASCII-only Markdown parser; dictates that `export.format.help.*` syntax characters stay literal ASCII (see D-05)

### Requirements (note the stale dependency)
- `.planning/REQUIREMENTS.md` — I18N-01 (DE) and I18N-02 (CS); the "(needs Sapir's strings)" note is **superseded by D-01/D-02** and should be updated

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Existing localized export-modal strings** in both dictionaries — a ready-made terminology/tone reference for the panel (no need to invent register or vocabulary).
- **P30 test harness** (`tests/run-all.js`, single `npm test`) — extend with the no-TODO-marker + DE/CS↔EN key-parity assertion (D-06). An RTL guard already exists from P30/TEST-02.

### Established Patterns
- **i18n dictionaries are flat key→string objects** (`i18n-en/he/de/cs.js`) — classed as data, not authored logic, so they are excluded from the comments-batch work; this phase only edits string values.
- The 13 keys are contiguous around lines 445–473 in both files, making them easy to locate and replace as a block.

### Integration Points
- No DOM or JS changes — the export modal already reads these keys via `App` i18n lookup; correct values are the only missing piece.

</code_context>

<specifics>
## Specific Ideas

- Native-translation panel shape (per language): **3 perspective agents → cross-check → 1 synthesizer** (D-01). This is the explicit quality mechanism Ben asked for — double-checking nativeness rather than a single-pass machine translation.
- "Faithful but natural" example (DE): EN "Step 1 of 3 — Choose which session sections to include in the export. Your selection here decides what shows up in the editable preview on the next step." → a native German rendering that keeps both the *what to do* and the *why it matters next* clauses, restructured for German sentence flow.

</specifics>

<deferred>
## Deferred Ideas

- **Comments batch-2** (apply the Phase 32 comment-banner pilot to `db.js` / `overview.js` /
  `sessions.js`, per `32-COMMENT-COVERAGE-MAP.md`) — Ben raised this here, but it is an unrelated
  workstream (authored JS logic, zero file overlap with i18n). **Decision: keep Phase 33 i18n-only
  and sequence comments-batch-2 as Phase 34 this session** (run `/gsd-phase` next). Not lost,
  just modeled as its own coherent phase.

### Reviewed Todos (not folded)
- **Verify landing-page translations (German + Czech)** (`2026-03-18-verify-landing-page-translations.md`,
  = LNCH-04) — i18n-adjacent and matched this phase, but it targets the **marketing landing page**,
  not the app's export modal. Out of scope for Phase 33; remains a deferred backlog item.

</deferred>

---

*Phase: 33-de-cs-i18n-completion*
*Context gathered: 2026-06-29*
