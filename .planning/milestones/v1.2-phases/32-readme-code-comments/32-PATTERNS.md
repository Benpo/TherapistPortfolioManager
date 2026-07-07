# Phase 32: README + Code Comments - Pattern Map

**Mapped:** 2026-06-28
**Files analyzed:** 9 (1 README rewrite, 1 CI edit, 5 comment-only JS edits, 2 new `.planning/` artifacts)
**Analogs found:** 9 / 9

> **Documentation phase.** No runtime behavior changes. "Patterns" here = the
> in-repo header-banner convention, the README skeleton/content sources, and the
> table-driven `.planning/` map format. All analogs are in-repo, read this session.

## File Classification

| File | Change | Role | "Data Flow" (doc analog) | Closest Analog | Match Quality |
|------|--------|------|--------------------------|----------------|---------------|
| `README.md` | rewrite-in-place | docs / maintainer guide | content from codebase maps | current `README.md` skeleton + `.planning/codebase/STRUCTURE.md` | exact (rewrite) |
| `.github/workflows/deploy.yml` | delete 1 line | config / CI | n/a | self (line 28) | exact |
| `assets/export-modal.js` | comment-only | extracted module banner | header convention | self (lines 1-19 = the template) | template source |
| `assets/settings-snippets.js` | comment-only | extracted module banner | header convention | `export-modal.js` header | exact (has rich header, de-phase) |
| `assets/settings-photos.js` | comment-only | extracted module banner | header convention | `export-modal.js` header | exact (has rich header, de-phase) |
| `assets/settings.js` | comment-only | slimmed-parent banner | header convention | `settings.js` JSDoc (lines 1-13) + `export-modal.js` | role-match (rewrite to slimmed shape) |
| `assets/add-session.js` | comment-only | slimmed-parent banner | header convention | `export-modal.js` header (NEW banner) | role-match (no header today) |
| `.planning/.../32-HELP-CONTENT-INVENTORY.md` | create | planning artifact | table/tree inventory | `.planning/codebase/STRUCTURE.md` | role-match |
| `.planning/.../32-COMMENT-COVERAGE-MAP.md` | create | planning artifact | table inventory | `.planning/codebase/STRUCTURE.md` + RESEARCH coverage table | exact (table pre-built in RESEARCH §Comment-Coverage Map) |

## Pattern Assignments

### THE banner template — `assets/export-modal.js` lines 1-19 (the convention)

This is the single most important analog (CONTEXT D-10 / RESEARCH Pattern 2).
Every DOCS-02 banner copies this shape. Note the four implicit slots:
**what it owns · why it exists (extraction rationale) · the handshake/public surface
· "only one global added" invariant.** No phase/plan numbers.

```javascript
// assets/export-modal.js — page-private export-modal + markdown builders for the
// add-session page. Extracted out of the single add-session.js DOMContentLoaded
// closure (RFCT-02). This is a behavior-preserving closure extraction: the export
// region captured ~10 closure-locals plus getIssuesPayload, so a plain cut-paste
// would throw ReferenceError. Instead add-session.js calls
// window.__exportModalInit(ctx) once at boot, passing live accessor closures for
// its mutable session state plus the shared DOM elements. ...
//
// ctx = { getEditingSession, getSessionId, isReadMode, getIssuesPayload,
//   els: { sessionDate, clientSelect, insightsInput, customerSummaryInput } }
//
// Only one global is added: the private window.__exportModalInit handshake. ...
```

**This file's own job (D-10):** light de-phasing only — strip the `RFCT-02`
reference (2 refs). Header is otherwise the gold standard; do not rewrite it.

---

### `assets/settings-snippets.js` (extracted module, banner — DE-PHASE)

**Analog:** its OWN header (lines 1-22) is already the right shape; mainly de-phase.

**Before-state** (line 2): `// Phase 24 Plan 05 — Snippet Settings UI`
**Job:** rewrite title to plain what-it-does; remove the `.continue-here.md` and
`snippets.js:457` archaeology (~5 refs); KEEP the strong cross-IIFE chain block
(lines 9-18) and the SECURITY note (lines 20-21) — those are exactly the
"dependencies (window.* chain)" + "invariants" slots the convention wants.

The cross-IIFE chain block to preserve (the model for the "dependencies" slot in
ALL banners):
```javascript
// Cross-IIFE identifier-resolution chain:
//   window.App.{...}          — set by assets/app.js IIFE
//   window.PortfolioDB.{...}  — set by assets/db.js IIFE
//   window.Snippets.{...}     — set by assets/snippets.js IIFE
//   window.SNIPPETS_SEED      — set by assets/snippets-seed.js IIFE
//   window.I18N               — set by assets/i18n-*.js
```

---

### `assets/settings-photos.js` (extracted module, banner — DE-PHASE, heavy)

**Analog:** its OWN header (lines 1-24) — rich, right shape.

**Before-state** (line 2): `// Phase 25 Plan 07 — Photos Settings tab`; inline
`D-24/D-25/D-30` decision refs + a mid-body `Phase 25 Plan 12 post-UAT fix`.
**Job:** de-phase title + the heaviest inline archaeology of the 5 files
(~27 refs). The decision refs (`D-24` etc.) describe real behavior — convert to
plain prose, do not just delete the surrounding explanation.

---

### `assets/settings.js` (slimmed parent, banner — DE-PHASE + REWRITE to slimmed shape)

**Analog:** its current JSDoc header (lines 1-13) for the doc-comment style; the
`export-modal.js` template for content slots.

**Before-state** (lines 1-13): `/** settings.js — Settings page controller (Phase 22 Plan 04). ... (T-22-04-01 mitigation) ... */`
**Job (D-10b):** de-phase (`Phase 22 Plan 04`, `T-22-04-01`, ~24 refs) AND rewrite
the banner to reflect the post-P31 SLIMMED shape — explicitly note that the
Snippets section (`settings-snippets.js`) and Photos tab (`settings-photos.js`)
were extracted OUT. Keep the SECURITY/innerHTML invariant (lines 9-12).

Style note: this file uses a `/** ... */` JSDoc block, not `//` lines. Stay
consistent with the file's existing comment style when rewriting.

---

### `assets/add-session.js` (slimmed parent, banner — NEW BANNER FROM SCRATCH)

**Analog:** `export-modal.js` lines 1-19 (build a brand-new banner in that shape).

**Before-state** (line 1): file starts at `let clientCache = [];` — **NO header
at all.** The first comment is an inline block at line 8 (`// Quick 260516-rna ...`).
**Job:** (a) add a NEW top-of-file banner — what add-session owns, its public
surface, that it boots `window.__exportModalInit(ctx)` (the export-modal handshake,
pairs with the template above), the window.* deps, invariants; (b) de-phase body
archaeology (~30 refs: `D-04/D-06`, `Quick 260516-rna`, `g7p __*TestHooks`).

Watch the trailing-comment de-phasing (RESEARCH Pitfall 1), e.g. line 104
`... null; // D-06: snapshot ...` → `... null; // snapshot ...`. The line does NOT
start with `//`, so use the strip-and-compare gate, not a line-prefix check.

---

### `README.md` (rewrite-in-place)

**Analogs:** current `README.md` (skeleton to keep + the stale block to replace)
+ `.planning/codebase/STRUCTURE.md` (file-map content source).

**Keep from current README** (lines 1-21): the one-paragraph value prop +
"What It Does" + "Privacy by Design" framing — still accurate, audience-agnostic.
**Replace:** the "Project Structure" block (stale, predates P31 extractions —
omits `settings-snippets.js`/`settings-photos.js`/`export-modal.js`).
**File-map source pattern** — copy the directory-tree style from STRUCTURE.md
lines 7-30 (fenced ``` tree with inline `# comment` annotations), but build it
fresh from the post-P31 `assets/` listing per D-08.

**Section skeleton (D-05, RESEARCH Pattern 1):** What it is · Run locally · Deploy
& ship a change · Current file-map · How do I… (recipes) · Rules an agent must not
break · Troubleshoot · pointer to `.planning/codebase/*.md`.

**All 6 recipes are pre-verified** — copy the exact mechanics from RESEARCH
§"Code Examples / Verified Mechanics" (recipes 1-6). Do not write from memory
(Pitfall 3): `APP_VERSION` is `'1.2.2'`, cache auto-derives from `INTEGRITY_TOKEN`.

---

### `.github/workflows/deploy.yml` (delete 1 line — D-04)

**Before-state** (line 28): `          cp README.md deploy-staging/`
**Job:** delete this single line. The only production-adjacent change in the phase.
Verify with grep gate: assert `cp README.md` absent from the file.

---

### `32-HELP-CONTENT-INVENTORY.md` (new planning artifact)

**Analog:** `.planning/codebase/STRUCTURE.md` (table + annotated-tree format) for
presentation; content method fully specified in RESEARCH §"Help-Content Inventory".
**Output schema (copy verbatim from RESEARCH):**
```
Topic tree → leaf = { title, one-line intent, mapped feature/page,
                      persona source, P26 status, suggested format, priority }
```
Ground in the 9 live pages + P26 spine. EXCLUDE demo.html/demo-hints.js (D-13).

---

### `32-COMMENT-COVERAGE-MAP.md` (new planning artifact)

**Analog:** the coverage table is **already built** in RESEARCH §"Comment-Coverage
Map (D-14)" — a `| Module | Lines | DOCS-02 status |` table covering ~27 modules.
Copy that table; mark the 5 DOCS-02 files **done**; flag
`overview.js`/`sessions.js`/`db.js` as **batch-1**. Follow STRUCTURE.md's
table-with-status style.

## Shared Patterns

### Banner convention (apply to all 5 DOCS-02 files)
**Source:** `assets/export-modal.js` lines 1-19.
**Four slots:** what it owns · public surface (window.* registered + handshake) ·
dependencies (cross-window.* chain — model: `settings-snippets.js` lines 9-18) ·
key invariants (model: the SECURITY notes in snippets/settings). **No phase numbers.**
Match each file's existing comment style (`//` block vs `/** */` JSDoc).

### De-phasing (apply to all 5 DOCS-02 files, D-10a)
**Pattern:** `// Phase X Plan Y — Title` → plain what-it-does title;
`D-NN (Phase X)` / `T-NN-NN` / `RFCT-NN` / `Quick NNN` archaeology → plain prose
describing the behavior, not the history. Preserve the *explanation*, drop the *ref*.

### Comments-only guarantee (D-11, apply to all 5 DOCS-02 files)
**Source:** RESEARCH §"The comments-only-diff gate" + `tests/25-08-single-source-audit.test.js`
style (`fs.readFileSync` + `git show $BASE:$f`, strip comments, assert byte-equal).
Run as a one-shot executor verification, not a permanent test. Isolate DOCS-02 in
its own commit(s) so the baseline ref is clean (Pitfall 4).

### Recipe accuracy (apply to README)
**Source:** RESEARCH §"Code Examples / Verified Mechanics" — every recipe truth-checked
against live files this session. Anchor to those facts, never to memory.

## No Analog Found

None. Every file has an in-repo analog or a pre-built RESEARCH source.

## Metadata

**Analog search scope:** `assets/` (5 comment targets + export-modal template),
root `README.md`, `.github/workflows/deploy.yml`, `.planning/codebase/`.
**Files scanned:** export-modal.js, settings-snippets.js, settings-photos.js,
settings.js, add-session.js (headers); README.md, STRUCTURE.md, deploy.yml.
**Pattern extraction date:** 2026-06-28
