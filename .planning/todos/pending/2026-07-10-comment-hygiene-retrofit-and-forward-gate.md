---
created: 2026-07-10T09:00:00.000Z
title: "Phase 44 seed — comment hygiene: kill the contradiction, retrofit ~680 lines, add the forward gate"
area: code-quality
priority: high
milestone_candidate: "v1.5 focused milestone — Ben decided 2026-07-11 (v1.4 scoping): retrofit too big beside v1.4's feature work. v1.4 ships ONLY the don't-make-it-worse layer (CONVENTIONS.md root-cause fix + baseline-aware forward gate, DEBT-01); the ~680-line legacy cleanup stays here for v1.5"
files:
  - .planning/codebase/CONVENTIONS.md
  - assets/pdf-export.js
  - assets/app.js
  - assets/app.css
  - assets/attention-coordinator.js
  - assets/tour.js
  - assets/backup.js
  - assets/i18n-en.js
  - assets/add-client.js
  - sw.js
---

## Phase 44 handled (2026-07-11) — two carve-out items done; the rest stays here for v1.5

Phase 44 (plan 44-01, DEBT-01 "stop the bleeding") executed exactly TWO items from this
seed and left everything else pending:

- **Item 1 (§Comments rewrite) — DONE.** `.planning/codebase/CONVENTIONS.md` §Comments now
  carries the strip-all-planning-IDs rule (both rationales: archived-`.planning/` dangling
  refs + `assets/**` customer DevTools exposure), the 4-slot banner shape, and the
  `{slug}.test.js` forward test-naming rule. The old "cite the phase and plan … do not omit"
  mandate is gone. Pinned by `tests/conventions-hygiene.test.js`.
- **The single runtime leak — DONE.** `assets/add-client.js:89` `console.warn` no longer
  prints `per D-23`; the no-hard-cap rationale stays in plain prose.

**Still pending for v1.5 (the focus candidate):**
- **Item 2 (promote `36-COMMENT-STYLE-GUIDE.md`) — NOT done, and intentionally reversed.**
  Phase 44 decision D-03 keeps the guide archived (§Comments points at it in place); the
  v1.5 retrofit may revisit promotion, but "promote it" is no longer a given.
- **Item 3 (clean the ~680 lines) — NOT done.** The full legacy reword sweep (minus the one
  add-client.js console.warn already handled) remains.
- **Item 4 (the forward gate) — NOT done.** Deferred to travel WITH the retrofit (Ben,
  2026-07-11): post-retrofit it can be a simple zero-tolerance grep, no baseline machinery.

The "load-bearing citations — reword, do NOT bare-delete" list below stays authoritative
for the v1.5 sweep (the add-client.js:89 entry is now resolved).

## Problem

`assets/**` is served to customers **including its comments** (`.github/workflows/deploy.yml` does `cp -r assets deploy-staging/`). Today **~680 lines across ~43 shipped files** carry internal GSD planning references: decision IDs (`D-09`), phase citations (`Phase 22`), plan citations (`Plan 04`), requirement IDs (`CHLG-03`), and process framing (`UAT`, `architect-gate`, `the executor`, `.planning/` paths).

One is not even a comment — `assets/add-client.js:89` ships this at runtime:

```js
console.warn("Large photo upload:", file.size, "bytes — proceeding per D-23 (no hard cap)");
```

A practitioner with DevTools open reads an internal decision ID.

**This was supposedly fixed. It wasn't, and it regressed.** Forensic audit, 2026-07-10 (during Phase 43 discussion).

## Root cause — the contradiction

Two live documents give opposite instructions. The wrong one wins, because it's the one agents read.

**`.planning/codebase/CONVENTIONS.md` §Comments** (live, read by every planner and executor):
> *"Code comments cite the phase and plan that introduced non-obvious code (e.g. `// RFCT-03 (Phase 31)`, `// Phase 22`). **This is the primary traceability mechanism — do not omit.**"*

**Phase 36 decision D-07** (archived, `.planning/milestones/v1.2-phases/36-code-comments-batch-2/36-CONTEXT.md:40`):
> *"Strip ALL planning IDs (option 3). No planning ID survives in product code. Requirement IDs, decision IDs (D-NN), code-review IDs (CR-NN), and task IDs all become plain prose — only the ID/tag leaves; the WHY/constraint it carried stays. Rationale: `.planning/` is archived per-milestone, so an ID in shipped code becomes a dangling reference."*

Executors were **not** ignoring D-07. They were obeying `CONVENTIONS.md`. Fix `CONVENTIONS.md` first or this retrofit decays exactly as the last one did.

## History (what actually happened)

- **Not Phase 29.** Phase 29 was Reliability & Observability. `PROJECT.md:150` says the comment work *"ends the comment-topic drag carried since ~P29"* — P29 is when the topic arose, not when work happened. This is the source of the "I did this in 29" memory.
- **Phase 32** (v1.2) — a deliberate *5-file pilot*, not a sweep. `PROJECT.md:150`: *"Code-comments done as a tight 5-file pilot + coverage map, not an all-files sweep."*
- **Phase 36** (v1.2) — batch 2. Wrote D-07 and `36-COMMENT-STYLE-GUIDE.md`.
- **Requirement `DOCS-03`** (`v1.2-REQUIREMENTS.md:85`) scoped it with the exclusion list that created today's debt: *"…all remaining `assets/*.js` + root `sw.js`, **excluding** the three 1,500L+ giants (`backup.js`/`app.js`/`pdf-export.js`, deferred to batch-3), the vendored `*.min.js`, and the `i18n-*` dictionaries."* Those exclusions are six of today's top seven offenders.
- **batch-3 never scheduled.** `v1.2-MILESTONE-AUDIT.md:26,112`: *"Deferred by design (D-01, 2026-07-01) … not a gap."*
- **Phase 42-11** (2026-07-09) — a one-off. Ben's approval note removed *marketing* framing ("first paid release") from `changelog-content-en.js`, and recorded the rationale this seed inherits: *"this asset (including comments) is served to clients, so no internal business framing may appear anywhere in the file."* It did **not** remove the planning IDs — that file still opens with `// … (Phase 42, CHLG-03 / CHLG-04; D-01/D-02/D-08/D-10/D-11)`.

## Regression evidence

Files Phase 32/36 cleaned, re-dirtied during v1.3 because no gate existed:

| File | Cleaned in | Re-dirtied by |
|---|---|---|
| `assets/sessions.js` | Phase 36 | `58db351` (2026-07-07) |
| `assets/reporting.js` | Phase 36 | `f99d97f` (2026-07-07) |
| `assets/overview.js` | Phase 36 | `d7ef489`, `9606893` (2026-07-07) |
| `assets/add-session.js` | Phase 32-03 | `c06e2ae` (2026-07-07) |

`shared-chrome.js` and `demo-seed.js` also picked up new refs. **46% of the current debt (287 of 623 blameable lines) was created by phases 39–42.1 — v1.3's own work.**

## The debt

~650 comment lines in 40 `assets/` files + 25 lines in shipped `*.html` + 4 in `sw.js` + 1 runtime string ≈ **~680 lines, ~43 files.**

By kind (lines overlap): 335 decision IDs · 278 phase citations · 174 plan citations · 50 requirement IDs · 39 process-framing.

Concentration is favorable — the top six files hold ~60%:

| File | Lines |
|---|---|
| `assets/pdf-export.js` | 107 (batch-3 giant) |
| `assets/app.js` | 87 (batch-3 giant) |
| `assets/app.css` | 69 (heaviest process-framing) |
| `assets/attention-coordinator.js` | 55 (new in v1.3) |
| `assets/tour.js` | 38 (new in v1.3) |
| `assets/backup.js` | 31 (batch-3 giant) |
| `assets/i18n-{en,he,de,cs}.js` | ~76 combined (excluded by DOCS-03) |

Split: **54% predates v1.3** (concentrated in the DOCS-03 exclusions), **46% is v1.3-era** (new feature modules + the regressions above).

## Four things to kill — miss the first and the rest are wasted

1. **Rewrite `.planning/codebase/CONVENTIONS.md` §Comments.** Replace "cite the phase and plan — do not omit" with the D-07 rule. Record BOTH rationales: the archived-`.planning/` dangling-reference one (Phase 36's), and the stronger customer-exposure one (`assets/**` ships its comments). Also fold in the test-naming rule Ben locked on 2026-07-10 (`{slug}.test.js`, no phase numbers, provenance lives in git) — Phase 43 renames the five standing guards but deliberately leaves `CONVENTIONS.md` to this phase so the file is rewritten once, coherently.
2. **Promote `36-COMMENT-STYLE-GUIDE.md`** out of the archived milestone into a live location. Nobody reads a style guide buried in `.planning/milestones/v1.2-phases/`.
3. **Clean the ~680 lines.** Multi-plan, per the audit's split (below).
4. **Add the forward gate.** A `tests/` grep gate asserting no `Phase N` / `D-NN` / `Plan N` / requirement-ID / process-framing tokens in shipped comments. `tests/**` exempt (never ships). *Without it this regresses again — the phase-39 re-accumulation is the proof.*

## Suggested plan split (from the audit)

- **Plan A — batch-3 giants:** `pdf-export.js`, `app.js`, `backup.js` (~225 lines). The originally-deferred work.
- **Plan B — v1.3 feature modules + regressions:** `attention-coordinator`, `tour.js/css`, `help.js`, `whats-new`, `changelog.js/css`, `changelog-content-*`, `overview`, `add-session`, `sessions`, `reporting` (~230 lines).
- **Plan C — dictionaries, CSS, HTML, sw.js:** `i18n-{en,he,de,cs}.js`, `app.css`, shipped `*.html`, `sw.js`, and the `add-client.js` `console.warn` (~185 lines).
- **Plan D — the gate + `CONVENTIONS.md` rewrite + style-guide promotion.** Do this FIRST, not last, or plans A–C get re-dirtied by their own executors.

## Load-bearing citations — reword, do NOT bare-delete

The ID is the *only* justification for a non-obvious constraint. Deleting it orphans the code.

- `assets/pdf-export.js:747,1880` — layout magic numbers justified only by `per D-05, D-06, D-07` / `per D-09`. The reword must state the actual rationale.
- `license.html:271,464,469` — `per D-18: bold red consequence text` is the sole justification for a deliberate destructive-action UX treatment.
- `assets/add-session.js:1445` — `raw key per D-18` explains why the raw session-type key is used, not the formatted label.
- `assets/add-client.js:89` — `per D-23 (no hard cap)` documents an intentional decision **and** ships as runtime text.
- `sw.js:100,106` — `Pitfall 7, HELP-07 precedent` / `architect-gate A1` carry the offline-availability rationale. Keep the WHY, drop the tags.

## Scope decisions already made (Ben, 2026-07-10)

- **Everything about comments and phase IDs lands here, not in Phase 43.** Phase 43 stays a pure changelog/help gate.
- **Phase 43 keeps only the test-file renames** (five standing guards, `git mv` + live-files-only replace-all) because it edits four of those five files anyway. `CONVENTIONS.md` is this phase's to rewrite.
- **"I want phase 44 to properly remove everything FINALLY"** — no partial sweeps, no exclusion lists that create a batch-4.
- **Milestone home undecided.** Ben: *"perhaps I will even have it in 1.4 and close 1.3 today after phase 43."* Decide at v1.3 close, with this seed in hand.

## Source

Forensic audit run 2026-07-10 during `/gsd-discuss-phase 43`. Evidence: `git blame` on 623 blameable offending lines; `.planning/PROJECT.md:150`; `.planning/milestones/v1.2-phases/36-code-comments-batch-2/36-CONTEXT.md:40` (D-07) and `36-COMMENT-STYLE-GUIDE.md`; `v1.2-REQUIREMENTS.md:85` (DOCS-03); `v1.2-MILESTONE-AUDIT.md:26,112`; `.planning/phases/42-in-app-changelog-what-s-new/42-11-SUMMARY.md:17,45`; `.planning/codebase/CONVENTIONS.md` §Comments.
</content>
