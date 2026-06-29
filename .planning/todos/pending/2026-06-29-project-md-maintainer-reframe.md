---
created: 2026-06-29T04:20:00.000Z
title: PROJECT.md full drift audit + maintainer reframe (Ben + agents, D-01)
area: planning-docs
priority: medium
type: docs
files: [.planning/PROJECT.md, CLAUDE.md]
---

## Context

Phase 32 (README + Code Comments) re-scoped the documentation audience: decision
**D-01/D-02** in `.planning/phases/32-readme-code-comments/32-CONTEXT.md` establishes the
**maintainer = Ben (solo, technically-comfortable) + Claude Code agents (cloud/local)**;
**Sapir is no longer hands-on dev** — she is the business / Gewerbe / domain / legal owner.
The new `README.md` already encodes this; **`PROJECT.md` is the last artifact still carrying the
old "non-technical Sapir is the ongoing developer / multi-machine collab" framing.**

P32's plans were fenced (D-09) to README + 5 specific JS files + 2 planning artifacts, so
PROJECT.md was deliberately NOT touched during execution. Ben's call (2026-06-29): **plan the
PROJECT.md changes now while the P32 know-how is fresh, implement after `/gsd-verify-work 32`
passes** (so "current state" isn't edited before UAT might shift it).

**The core principle — keep two audiences separate (P32 D-01 split them):**
- **Customers / product users** = non-technical Emotion Code/Body Code practitioners → *unchanged*;
  the product UX stays approachable for them. (Guardrail: do NOT make the *product* "for technical users.")
- **Maintainer / developer** = Ben (drives Claude Code; terminal/git/architecture-at-concept,
  not a daily JS author) + AI agents. Sapir = business/domain/legal, not dev.

## Locked decisions (Ben, 2026-06-29 via AskUserQuestion)

1. **Scope = full drift audit** — items A–I below (reframe + P32 bookkeeping + read-through of every section).
2. **Git framing = Ben-only now** — drop the multi-machine emphasis; repo is a single-owner +
   agent-context workflow. Also fix the stale `/Users/sapir/...` path in the project `CLAUDE.md`
   Git-Sync block (the `git pull` rule itself stays — just make it path-agnostic).
3. **3 surfaced candidate phases = add as a non-committed note** — comments batch-2, vendor-dep
   pinning (HARD-02 + jszip/bidi), demo refresh — recorded near the backlog, clearly marked
   "candidate / not yet sequenced via /gsd-phase" (per align-before-scoping; NOT committed scope).

## Edit list (apply to `.planning/PROJECT.md` unless noted)

- **A. "What This Is" (L5)** — "Preparing for first paid release." → **live and sold since v1.1 (2026-06-22)**.
- **B. Active milestone list (L66–67)** — P28 `[ ]`→`[x]` (complete & live 2026-06-22) and
  P29 `[ ]`→`[x]` (complete & live 2026-06-23). (ROADMAP progress table already shows both Complete.)
- **C. Active milestone list (L70)** — P32 `[ ]`→`[x]` with a one-liner (README maintainer guide +
  5-file comment pilot + maintainer reframe). *Only valid after UAT passes.*
- **D. Maintainer reframe (Context L93, L95; Constraints L104, L107)** —
  - L95 "Target users": **split the two audiences** (customers = non-technical practitioners,
    unchanged; maintainer = Ben + AI agents; Sapir = business/domain/legal).
  - L93 "Collaboration workflow": single-owner + AI-agent (cloud/local) loop; repo = single
    source of truth AND agent context; drop multi-machine-collab emphasis.
  - L104 "Collaboration" constraint: "GitHub-tracked; AI-assisted single-owner workflow" (drop multi-machine).
  - L107 "Maintainer" constraint: "Ben (solo, AI-assisted) + Claude Code agents; the in-repo README
    is the canonical maintainer guide. (Product UX still approachable for non-technical customers.)"
- **E. Key Decisions table** — add a row: *Maintainer reframe (D-01/D-02): docs/dev calibrated for
  Ben + agents, not non-technical Sapir; README rewritten in-repo as agent context (D-03) + no longer
  published at product URL (D-04). Decided 2026-06-28 (P32 discuss).*
- **F. Requirements → Validated** — add **DOCS-01** (in-repo maintainer README) and **DOCS-02**
  (comment pilot on the 5 refactored modules) as validated v1.2 lines. *After UAT.*
- **G. Current Milestone (L133–143) + footer (L146)** — refresh the status line to reflect
  P28–P31 complete & live + P32 docs done; mirror the P28/P29/P32 checkbox fixes in the duplicated
  scope list (L138–142 tense); set "Last updated: 2026-06-29 — Phase 32 …".
- **H. Backlog area (near L73)** — add the non-committed candidate-phases note (decision 3).
- **I. Related cleanup — project `CLAUDE.md` Git-Sync block** — replace the hardcoded
  `cd /Users/sapir/Claude/Portfolio_Manager/TherapistPortfolioManager && git pull` with a
  path-agnostic `git pull` (keep the "pull at session start" rule; keep the Lemon Squeezy section as-is).

## Implementation notes

- **Sequencing:** run AFTER `/gsd-verify-work 32` completes. verify-work's `phase.complete` will
  fire the routine `update_project_md` (a light auto-evolution) — apply THIS fuller reframe right
  after, superseding/incorporating that light touch. Re-read PROJECT.md fresh before editing
  (verify-work may have already moved DOCS reqs / touched the footer).
- **How:** inline edits (full grounding already gathered: D-01/D-02/D-08 + README) — no sub-agent.
- **Commit:** `docs(project): full drift audit + maintainer reframe to Ben+agents after P32 (D-01)`
  (PROJECT.md); the CLAUDE.md path fix can ride the same commit or a `chore(docs):` follow-up.
- **Grounding refs:** `32-CONTEXT.md` §Audience (D-01/D-02/D-03/D-04/D-08), the rewritten `README.md`
  header, `project-maintainer-reframe-ben-solo` memory, ROADMAP progress table (P28/P29 dates).
