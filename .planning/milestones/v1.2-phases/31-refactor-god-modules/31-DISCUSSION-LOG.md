# Phase 31: Refactor God Modules - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-27
**Phase:** 31-refactor-god-modules
**Areas discussed:** Extraction granularity, Snippets size, RFCT-03 cleanup reach, Safety protocol, Glue consolidation, Phase-number comments, Extraction order, Manual UAT gate, Architect-gate mechanism

---

## Extraction granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Cohesive big ones | Extract Snippets + Photos/StorageUsage (settings.js) + export-modal (add-session.js); slim settings.js keeps section-titles/tab-nav/backups | ✓ |
| Full decomposition | Every settings IIFE → own file; tab-nav stays as glue | |
| Minimal | Just Snippets + export-modal; leave Photos in place | |

**User's choice:** Cohesive big ones — "for sure" — but coupled with a challenge (see Snippets size below).
**Notes:** Ben accepted the recommended granularity, then pushed back on the snippets line count: *"I also want to specifically understand why snippets takes 1300 lines and why can't this be much much shorter. I find it hard to believe."* → triggered the investigation logged under "Snippets size."

---

## Snippets size (investigation prompted by Ben's challenge)

| Option | Description | Selected |
|--------|-------------|----------|
| Move as-is, log a spike | Behavior-preserving move + cosmetic cleanups only; defer a v1.3 reducibility spike on the editor/tag-chip region | ✓ |
| Add a simplification pass | Rewrite the editor/tag-chip region shorter in Phase 31 (higher risk, needs extra tests, tension with behavior-preserving contract) | |
| Just move it, no spike | Extract as-is, drop the simplification question entirely | |

**User's choice:** Move as-is, log a spike.
**Notes:** Evidence shown to Ben: snippets IIFE = 41 functions / ~1,067 code lines (editor+tag-chip ~445, list-render ~180, import/export+collision ~180, 8 pure helpers ~200), only 2 `innerHTML`, ~240 comment/blank lines — a legitimate full snippet manager, NOT bloat. Conclusion: Phase 31 relocates it; a true "make it shorter" is a separate logic rewrite (v1.3 spike).

---

## RFCT-03 cleanup reach

| Option | Description | Selected |
|--------|-------------|----------|
| Named files, test-first | Do overview.js/sessions.js innerHTML+i18n + db.js openDB pooling, but characterization-test each thin spot first | ✓ |
| Strictly extracted code | Cleanups only inside moved code; route named files to backlog | |
| Named files, no new tests | Do the named cleanups, lean on review | |

**User's choice:** Named files, test-first.
**Notes:** Ben first asked for disambiguation — *"which cleanup are we talking about? of phase names from the code, or something else?"* — so RFCT-03 (var→const / innerHTML hardening / openDB pooling / catch-logging) was separated from his "clean phase names" comment-cleanup idea before he answered.

---

## Safety protocol

| Option | Description | Selected |
|--------|-------------|----------|
| Atomic per-unit | Extract one unit → full npm test → commit when green; test-before-move for thin spots; D-12 architect gate | ✓ |
| Batched by module | Extract all settings.js units in one batch, then add-session.js; test at batch boundaries | |
| You decide cadence | Planner/executor picks commit granularity within green-throughout | |

**User's choice:** Atomic per-unit.

---

## Glue consolidation

| Option | Description | Selected |
|--------|-------------|----------|
| Consolidate, net-verified | Replace settings.js local t()/showToast()/getCurrentLang() with App.* canonicals; if net shows divergence, leave + note | ✓ |
| Leave them, defer | Don't touch the wrappers this phase; defer all glue dedupe to backlog | |
| Consolidate app-wide | Also dedupe across app.js/report.js/disclaimer.js (flagged as scope creep) | |

**User's choice:** Consolidate, net-verified.

---

## Phase-number comments (Ben's added area)

| Option | Description | Selected |
|--------|-------------|----------|
| Opportunistic, in touched code | Rewrite "Phase N Plan M" comments → what-it-does in touched regions (+ fix 1 log string); full pass in Phase 32 | ✓ |
| Defer all to Phase 32 | Keep Phase 31 a pure code move; all comment rewrites in the docs phase | |
| Strip ALL phase comments now | App-wide sweep this phase (flagged as scope creep) | |

**User's choice:** Opportunistic, in touched code.
**Notes:** Investigation showed production function/variable names are already phase-free; only ~20 archaeology *comments* (mostly add-session.js) + one `console.warn` string carry phase numbers.

---

## Extraction order

| Option | Description | Selected |
|--------|-------------|----------|
| Snippets → Photos → export-modal | Prove the pattern on the lowest-risk self-contained IIFE first, hardest last | ✓ (default) |
| Export-modal first | Tackle the riskiest while attention is fresh | |

**User's choice:** Not selected for discussion → resolved with the safe default (Snippets first; it already has test hooks).

---

## Manual UAT gate

| Option | Description | Selected |
|--------|-------------|----------|
| Add UAT smoke-test gate | Short human smoke-test of the 3 extracted features on top of green npm test | ✓ (default) |
| Trust the automated net alone | Rely solely on npm test | |

**User's choice:** Not selected for discussion → resolved with the safe default (add the gate), given the "no observable change" contract + Phase 30 net-over-crediting history.

---

## Architect-gate mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated sub-agent | Fresh independent-context agent reviews PLAN.md soundness; clears material findings before reaching Ben | ✓ |
| Self-review checklist | Inline fixed checklist (faster, less independent) | |
| Sub-agent + your review | Both, adds a round-trip | |

**User's choice:** Dedicated sub-agent.

---

## Claude's Discretion

- New file naming (recommend `settings-snippets.js` / `settings-photos.js`, distinct from the existing `assets/snippets.js` engine).
- Whether extracted modules keep their own copy of small shared in-IIFE helpers (e.g. `$`) or reference a shared one — keep behavior identical.
- Mechanical wiring sequence (script-tag order, PRECACHE_URLS edits) — executor detail, constrained by the cross-IIFE dependency chain + the pre-commit bump gotcha.

## Deferred Ideas

- v1.3 spike: is the ~445-line snippets editor/tag-chip region genuinely reducible via a logic rewrite (with its own tests)?
- App-wide glue dedupe (t()/showToast() across app.js/report.js/disclaimer.js) — backlog.
- App-wide phase-number comment sweep — Phase 32 / backlog.
- Broader extraction + test-coverage health (app.js, license.js, backup.js, pdf-export.js, db.js) — v1.3 "Codebase Health II" outlook.
- `_optimizeAllPhotosLoop` sequential → parallel — PERF backlog.
