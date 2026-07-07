# Phase 36 — Comment Style Guide (Do's & Don'ts)

**Read this BEFORE writing any comment.** Every rule here is grounded in a real repo file — go look at the cited line. This encodes the Phase 32 pilot convention (32-CONTEXT §D-09–D-14) and the Phase 36 shape (36-CONTEXT §D-03–D-05) as explicit rules so comment *quality* is anchored to writing, not judgment.

## Purpose

- The standard every Phase 36 executor follows when writing comments on the 22 production JS modules.
- **Comment text only. Zero behavior change.** The comments-only strip-and-compare gate (D-06) will FAIL if you touch a single code line. Banners and inline prose only.
- The banner is agent-context: write dense, precise orientation for a capable agent + Ben — not hand-holding, not editorializing.

---

## Part A — The top banner

### The canonical format — ONE shape, four labelled slots, in this order

Every file opens with a **`//` block** at the very TOP of the file. It has **four slots, and you write these exact labels, in this exact order**:

| Order | Label | What it states |
|-------|-------|----------------|
| 1 | `OWNS:` | The one responsibility this module is the source of truth for. |
| 2 | `PUBLIC SURFACE:` | The `window.*` it *registers* (globals it sets) + any boot handshake. |
| 3 | `DEPENDENCIES:` | The cross-`window.*` chain it *reads* (globals other IIFEs set). |
| 4 | `CONSTRAINTS:` | Rules that must hold — security (`innerHTML`), load order, invariants. |

**Use these labels, in this order.** Do not invent variant labels, reorder, or drop a slot (for a module with no global, the `PUBLIC SURFACE:` slot is still written — see the no-global rule below). The one licensed exception is a trivial D-05 stub (see the Proportionality rule), which collapses to a 1–3 line note.

The canonical **format** is the `//` labelled block. The **content model** (what goes in each slot, verified against real call sites) is the primary exemplar `assets/settings.js:1–29` — note that file happens to use `/** */` syntax, but it is the *content/shape* that is the model, not its comment syntax. When you write a new banner, use `//`.

### Canonical worked example (the corrected `overview.js` banner)

`overview.js` today opens with a thin `// Module-level storage for search filtering` line — a variable label, not a banner. It registers **two** globals (`window.__OverviewTestHooks` at ~L53, `window.__afterBackupRestore` at ~L78), so its `PUBLIC SURFACE:` slot must name both. This is the model to copy:

```js
// ────────────────────────────────────────────────────────────────────────
// overview.js — Client overview page: the searchable/sortable client table.
//
// OWNS: the client list load, the search + sort + "missing birth info" filter
//   pipeline, and the missing-birth warning banner.
// PUBLIC SURFACE: window.__afterBackupRestore (post-restore re-render hook) ·
//   window.__OverviewTestHooks (test seam).
// DEPENDENCIES: App.{initCommon, t, ...}, PortfolioDB.{getAllClients,
//   getAllSessions, ...} — set by assets/app.js and assets/db.js IIFEs.
// CONSTRAINTS: the missing-birth predicate is the SINGLE source of truth shared
//   by both the banner count and the filter, so the filtered set always equals
//   the warned count. Rendered via textContent — never innerHTML.
// ────────────────────────────────────────────────────────────────────────
```
Why it's the model: all four labels present, in order; the `PUBLIC SURFACE:` slot names **both** registered globals with a one-word role each; deps name real methods verified against call sites; the constraint states the *why-it's-shaped-this-way* rule, not a restatement of code.

### The no-global rule — never omit the PUBLIC SURFACE slot

A page module that self-boots and registers no global still gets the slot, written exactly:
```js
// PUBLIC SURFACE: none — self-boots on DOMContentLoaded, registers no global
```
Never silently drop `PUBLIC SURFACE:`. "This module exposes nothing" is itself load-bearing orientation.

### Banner PLACEMENT

The banner goes at the **very top of the file** — above the `window.X = (() => {` (or `(function () {`) opener AND above any `"use strict";`. Nothing precedes it but the file itself.

### Reshape vs. light de-phase — the ≥3-of-4 test

Before you decide "rebuild" vs "de-phase in place":
- If an existing header **already covers ≥3 of the 4 slots** (owns / surface / deps / constraints, under any wording) → **de-phase it in place**: strip planning IDs, add the one missing slot, keep the good prose. Do NOT rewrite wholesale.
- Otherwise (header-less, or a thin 1-line opener, or ≤2 slots) → **rebuild** to the full 4-slot form.

### Template framing — the two exemplars

- **PRIMARY exemplar — `assets/settings.js:1–29`.** The full four-slot content model, labelled (`OWNS` / `PUBLIC SURFACE` / `DEPENDENCIES` / `SECURITY (invariant)` — the security slot is a `CONSTRAINTS`-class slot). Copy its shape and density. (Format note: it uses `/** */`; the canonical format you write is `//`. Content is the model, not the comment syntax.)
- **SPECIALIZED VARIANT — `assets/export-modal.js:1–19`.** A ctx-injected extraction sub-module. Its banner is a good *content* reference for a handshake-style module, but it **lacks a Dependencies slot** and its **inline comments are pre-option-3** (they still carry planning IDs — see Part B fix). Treat it as a variant, not the standard. **Do NOT model inline comment style on export-modal.**

### Do's
- Name real symbols: the actual `window.PortfolioDB.{...}` methods, verified against call sites.
- State the *why-it's-shaped-this-way* constraint (e.g. export ordinal is chronological, never the autoIncrement key — `export-modal.js:23–36`).
- Keep the security/`innerHTML` note when the module renders user content (`settings-snippets.js:20–21`).
- Match reality: if the file is header-less (`db.js`, `sessions.js`, `add-client.js`), write a NEW banner; if it has a stale phase-titled header (`license.js`, `sw.js`), de-phase + reshape it (apply the ≥3-of-4 test).

### Don'ts
- **Don't list a `window.*` symbol in Dependencies that has zero call sites** in the file. Phase 32 review WR-01 (`settings.js:22`) flagged `BackupManager.pickBackupFolder` listed but never called — a banner that misdescribes the call graph is the *only* defect this phase can ship. Grep each symbol before listing it.
- Don't restate the language/framework ("This is an IIFE module that uses JavaScript").
- Don't pad with empty ceremony or a marketing tone.
- Don't leave a thin opener that isn't a banner (see BAD below).
- Don't omit the `PUBLIC SURFACE:` slot — write `none — self-boots …` if there is no global.

### BAD example — `assets/overview.js:1`
```js
// Module-level storage for search filtering
let _allClients = [];
```
Why it fails: it's a thin variable label, not a banner. No owns / surface / deps / constraints. A reader still has to grep the whole file to know what `overview.js` is. (Its corrected canonical form is the worked example above.)

### Proportionality rule (D-05) — trivial files
Tiny modules get a concise **1–3 line** banner. Do **NOT** fabricate empty "Dependencies"/"Constraints" slots where there is nothing to say. A 4-line loader stub does not need a 4-section banner.

Files in this class: `i18n.js` (4L), `demo.js` (21L), `reporting.js` (57L), `md-render.js` (81L), `globe-lang.js` (84L), `demo-seed.js` (84L). (`version.js` is well-headed → **light de-phase only**.)

GOOD concise stub — `assets/i18n.js:1–3` (already shipped, use as the model):
```js
// assets/i18n.js — loader only, no translation content
// Language files (i18n-en.js, i18n-he.js, i18n-de.js, i18n-cs.js)
// have already populated window.I18N and window.QUOTES.
```
It says what it does in one breath and names the globals in play — no invented sections.

---

## Part B — Inline / body comments

This is at least half the work. Most inline comments in scope already exist as build-history archaeology that must be **de-phased** — rewritten into plain what-it-does prose.

### When to write an inline comment vs. not
Write one only to explain the non-obvious **WHY**, a **constraint**, or a **gotcha**. Do not narrate what the code already says.

- **Don't** (restates code):
  ```js
  // set active to false
  _missingBirthFilterActive = false;
  ```
- **Do** (explains why it exists) — `assets/overview.js:13–14`:
  ```js
  // Pure: a client is "missing birth info" when it has neither a birthDate
  // nor an age. Reused verbatim by the banner count and the filter.
  ```

### De-phasing rules (the core inline job)
**Keep the reason, drop the tag.** Rewrite every build-history reference into plain prose that preserves the WHY.

**Strip ALL planning IDs and process tags** (decided 2026-07-02 — option 3: **no planning ID survives in product code**). Turn each into plain prose; delete the token, keep the explanation. But the tags split into **two mechanically distinct classes** — this split matters because only one class can be grep-gated:

#### Class (a) — ID-shaped → grep-enforceable
These have a rigid `PREFIX-DIGITS` (or dated-ticket / ISO-date) shape, so the de-phase verify gate greps for them and FAILS the build if any survive:
- Requirement IDs — `REQ-NN`, `OBS-03`, `VER-NN`, `RFCT-03`, `DOCS-NN`, `DEMO-11`, `PDFX-NN`, `I18N-NN`, `TEST-NN`
- Decision IDs — `D-16`, `D-08` (the `D-NN` shape)
- Task IDs — `T-22-07-03` (the `T-N-N-N` shape)
- Code-review IDs — `CR-01` (the `CR-NN` shape); review notes like `WR-01`
- Date-prefixed bug tickets — `Quick 260516-g7p Bug #4`, `260630-sa8` (the `[0-9]{6}-[a-z0-9]{3}` shape)
- ISO dates used as provenance — `(2026-05-15)`, `UAT 2026-05-14` (the `[0-9]{4}-[0-9]{2}-[0-9]{2}` shape)

**The KEEP allowlist (grep must NEVER flag these).** These are ID-*shaped* but are genuine technical tokens, not planning IDs — the de-phase grep is written so it does not match them, and you must not strip them:
`AES-256`, `SHA-256`, `UTF-8`, `base64`, schema versions `v1`–`v6`, and live-code line references `file.js:NNN` (e.g. `db.js:225`). If a grep design would flag any of these, the grep is wrong — narrow it.

**The de-phase gate is therefore NOT a bare `[A-Z]+-[0-9]` regex** — a naive regex would eat `AES-256`/`SHA-256`/`UTF-8`. It is the explicit prefix list above (REQ-/OBS-/VER-/RFCT-/DOCS-/DEMO-/PDFX-/I18N-/TEST-/D-/T-/CR-/WR-, dated tickets, ISO dates) with the KEEP allowlist excluded.

#### Class (b) — Prose-shaped → MANUAL only (cannot be grep-gated)
These are process tags that read as ordinary English, so a grep for them would drown in false positives ("round-trip", "the gap between", "no change"):
- Gap tags — `Gap B`, `Gap 2`
- Round tags — `round-5`
- Change tags — `Change 1`
- Phase / Plan tags in prose — `// Phase 24 Plan 05`, `Phase 22-14`, `(Phase 31)` (the word "Phase"/"Plan" is greppable, but the general prose-tag class is not)

Because they are indistinguishable from prose, **they are a manual checklist item, not a grep gate.** The executor must eyeball for them (Part C checklist). Do not pretend a regex covers class (b).

Example — `assets/db.js:175` `// OBS-03 (Phase 29): reworded so the banner no longer implies a dead-end` → `// Reworded so the banner no longer implies a dead-end` (drop `OBS-03` AND `(Phase 29)`; keep the sentence).

Why strip requirement IDs too: they point into `.planning/`, which is archived per-milestone, so an ID in shipped code becomes a dangling reference; `git blame` is the durable trace. Cross-references read better by name anyway ("stays in sync with the integrity check in `version.js`", not "see VER-03").

#### Cross-reference rule — keep code-refs, strip planning-refs
- **KEEP** cross-references into **live code**: `db.js:225`, `version.js`, a function name. These stay valid as the code moves and are exactly the trail an agent wants.
- **STRIP** cross-references into **`.planning/`**: `34-RESEARCH`, `32-CONTEXT §D-09`, `29-VALIDATION`. `.planning/` is archived per-milestone → a shipped ref to it dangles. Rewrite it into the *reason* it encoded (e.g. `(34-RESEARCH Pitfall 2)` → "parsing the ISO date would drag in TZ/locale ambiguity").

**Preserve these — do NOT strip:**
- The *prose*: the WHY, the constraint, the design rationale the tag was attached to. Only the ID/tag leaves; the explanation stays.
- Real security rationale (the `innerHTML` / `textContent` "never do X" notes) — verbatim.
- Genuine technical tokens that are NOT planning IDs — the KEEP allowlist: `AES-256`, `SHA-256`, `UTF-8`, `base64`, schema `v1–v6`, `IDBDatabase`, `file.js:NNN` line refs. These describe the code; leave them.

### Before → after de-phase pairs (real, from commit `add3671`)

1. `assets/settings-snippets.js` (search helper)
   - BEFORE: `* Search is current-locale only (D-16): matches trigger OR expansions[currentLang].`
   - AFTER:  `* Search is current-locale only: matches trigger OR expansions[currentLang].`

2. `assets/settings-snippets.js` (defensive catch)
   - BEFORE: `// Defensive: Plan 04 setPrefix validates length only, so a local-validation`
   - AFTER:  `// Defensive: setPrefix validates length only, so a local-validation`

3. `assets/settings-snippets.js` (translations block)
   - BEFORE: `// Translations block — populate but keep hidden by default (D-12)`
   - AFTER:  `// Translations block — populate but keep hidden by default`

4. `assets/overview.js:5` (bug-ticket inline — still un-de-phased, do this one)
   - BEFORE: `// Quick 260516-g7p Bug #4 — "missing birth year" warning is actionable:`
   - AFTER:  `// The "missing birth year" warning is actionable:` (keep the full explanatory prose that follows — the module-level flag shared by banner count and filter — it's the real constraint).

5. `assets/db.js:10` (phase+refactor tag on a live-constraint comment)
   - BEFORE: `// RFCT-03 (Phase 31): connection pool — a single resolved Promise<IDBDatabase>`
   - AFTER:  `// Connection pool — a single resolved Promise<IDBDatabase>` (keep every following line: the two null-out invalidation sites are "the whole correctness story of the pool").

6. `assets/export-modal.js:23` (a decorative divider carrying three planning IDs)
   - BEFORE: `// ── FN-1 / D-03 / PDFX-02: derived chronological session ordinal ──`
   - AFTER:  `// ── derived chronological session ordinal ──` (strip the `FN-1 / D-03 / PDFX-02` id-stack; keep the divider and its label).

### ⚠️ Do NOT model inline style on `export-modal.js`
Its BANNER (lines 1–19) is a usable content model (a specialized handshake variant), **but its INLINE comments are pre-option-3** — written before the strip-all-IDs rule. Concretely, line 23 is the decorative-divider example above (`// ── FN-1 / D-03 / PDFX-02: … ──`) and line 31 cites `34-RESEARCH Pitfall 2` (a `.planning/` cross-ref that must be de-phased to its reason). When you write inline comments, follow this guide's Part B rules — not what export-modal's body currently looks like. (export-modal's own body is swept clean in plan 36-05.)

### Do's
- Rewrite the tag into the *reason* the code is shaped that way (the archaeology encodes a real constraint — surface it).
- Keep multi-line rationale that follows a stripped tag; only the tag leaves.
- Leave genuinely-informative comments untouched if they carry no tag.

### Don'ts
- Don't delete the knowledge with the tag — a bare `// (D-16)` line becomes prose, not nothing.
- Don't strip the KEEP allowlist (`AES-256`/`SHA-256`/`UTF-8`/`base64`/schema `v1–v6`/`file.js:NNN`) or the `innerHTML` security notes — those are technical tokens, not planning IDs. (Under D-07 the requirement IDs `REQ-/OBS-/VER-` DO get stripped to prose — this supersedes the Phase-32 keep approach.)
- Don't add new inline comments that restate code just to "improve coverage."
- Don't touch a code token — if de-phasing tempts an edit to code, stop; it breaks the gate.

---

## Part C — Per-file checklist

Run this on **every** file before moving on:

- [ ] **Banner present & correct shape** — four labelled slots in order (`OWNS:` · `PUBLIC SURFACE:` · `DEPENDENCIES:` · `CONSTRAINTS:`), OR a justified D-05 concise 1–3 line stub for a trivial file. Banner at the very TOP of the file (above the opener and `"use strict"`).
- [ ] **Dependencies verified (reads only)** — every `window.*` symbol listed in the `DEPENDENCIES:` slot is actually *called* (read) in the file (grep it; no dead symbols per WR-01). NB: this applies to the DEPENDENCIES slot only. A module's OWN registered namespace (e.g. `db.js` registers `window.PortfolioDB.getX`) is called in *other* files, not necessarily in itself — those belong in PUBLIC SURFACE, not DEPENDENCIES, and are not held to the "called here" test.
- [ ] **Public surface complete** — every `window.X =` / `window.X.Y =` registration in the file is reflected in the `PUBLIC SURFACE:` slot (grep `window\.\w+\s*=`); if there are none, the slot reads `none — self-boots …`. (This is the mirror of the deps check: deps = reads, surface = writes.)
- [ ] **No planning IDs or tags remain** — every `REQ-/OBS-/VER-/RFCT-/DOCS-/DEMO-/PDFX-/I18N-/TEST-`, `D-NN`, `T-N-N-N`, `CR-NN`, `WR-NN`, `UAT-`, `Gap`, `round-N`, `Change N`, `Phase`/`Plan`, date-prefixed ticket (`######-xxx`), provenance ISO date, and `.planning/` cross-ref (`34-RESEARCH`, `32-CONTEXT`) is rewritten to prose. The WHY it carried is kept. **CAVEAT:** do NOT strip the KEEP allowlist — `AES-256`/`SHA-256`/`UTF-8`/`base64`/schema `v1–v6`/`file.js:NNN` line refs are ID-shaped but are technical tokens, not planning IDs. (Class-(b) prose tags Gap/round/Change are a MANUAL eyeball — no grep covers them.)
- [ ] **Real technical tokens left intact** — `AES-256`, `SHA-256`, `UTF-8`, schema `v1–v6`, `file.js:NNN`, etc. are NOT planning IDs; do not touch them.
- [ ] **Security notes preserved** — `innerHTML` / `textContent` rationale intact.
- [ ] **Every inline comment earns its place** — explains a why/constraint/gotcha, doesn't restate code.
- [ ] **Comment text only** — zero code lines changed; the strip-and-compare gate will confirm byte-equality against baseline.

---

*Phase: 36-code-comments-batch-2 · grounded in Phase 32 shipped banners + live-repo archaeology · 2026-07-02*
