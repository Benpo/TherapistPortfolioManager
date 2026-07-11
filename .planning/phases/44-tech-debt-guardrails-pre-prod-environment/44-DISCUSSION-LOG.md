# Phase 44: Tech-Debt Guardrails & Pre-Prod Environment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-11
**Phase:** 44-tech-debt-guardrails-pre-prod-environment
**Areas discussed:** Todo folding, CONVENTIONS rewrite package, Pre-prod topology & access
**Areas offered but not selected (left to Claude's discretion):** Gate strictness & reach (dissolved by the scope re-cut), Purge sequencing & verification (DEBT-02)

---

## Todo Folding

| Option | Description | Selected |
|--------|-------------|----------|
| Comment-hygiene seed (DEBT-01 part) | Fold only the gate + CONVENTIONS fix + console.warn parts | |
| Deploy purge-race (DEBT-02) | resolves_phase: 44 tagged incident todo | ✓ |
| Pre-prod CF Pages (DEBT-03) | resolves_phase: 44 tagged infra todo | ✓ |

**User's choice:** Folded the two tagged todos; questioned the comment-hygiene suggestion ("we just excluded it from the milestone, or?").
**Notes:** Clarified the split: the ~680-line retrofit was excluded from v1.4; DEBT-01's stop-the-bleeding layer was still in. Ben then re-cut it further (see below).

---

## CONVENTIONS Rewrite Package (DEBT-01)

### Q1 — Todo handling / DEBT-01 split

| Option | Description | Selected |
|--------|-------------|----------|
| Keep todo open, reference it (Recommended) | Phase 44 cites but doesn't close; retrofit stays pending for v1.5 | |
| Split into two todos | Carve gate/CONVENTIONS into a new closable todo | |
| Drop DEBT-01 from Phase 44 entirely | No comment-hygiene work in v1.4 at all | |

**User's choice (free text):** "I want future gate to also be part of the hygiene work together — so both are pushed. But conventions fix could be done, just not a real technical gate."
**Notes:** SCOPE RE-CUT — the forward gate leaves Phase 44 and joins the v1.5 retrofit. Phase 44 keeps the CONVENTIONS.md fix only (plus the console.warn reword, confirmed separately).

### Q2 — Confirm milestone-doc edits for the re-cut

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm — gate to v1.5 (your call) | Edit REQUIREMENTS.md DEBT-01 + ROADMAP.md criterion 1 in-phase | ✓ |
| Keep gate in 44 after all | Revert to original DEBT-01 | |

**Notes:** Tradeoff named and accepted: v1.4 feature phases rely on corrected instructions alone (no enforcement); upside: post-retrofit gate needs no baseline machinery.

### Q3 — add-client.js:89 console.warn reword

| Option | Description | Selected |
|--------|-------------|----------|
| Keep in 44 (Recommended) | Only RUNTIME leak, customer-visible, one-line fix | ✓ |
| Push to v1.5 | Bundle with the retrofit | |

### Q4 — Style-guide home

| Option | Description | Selected |
|--------|-------------|----------|
| Fold rules into CONVENTIONS.md (Recommended) | Operative rules written into §Comments; archived guide stays as history | ✓ |
| Promote to .planning/codebase/ | Full guide as a live sibling file, linked | |
| Both | Inline essentials + promoted full guide | |

---

## Pre-Prod Topology & Access (DEBT-03)

### Q1 — Delivery mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror the prod pipeline (Recommended) | pre-prod branch → same staging transform → deploy-preprod branch → 2nd CF project | ✓ |
| CF Pages direct git integration | CF builds from pre-prod branch directly; transform logic splits across systems | |

### Q2 — Docs-gate on pre-prod

| Option | Description | Selected |
|--------|-------------|----------|
| Skip on pre-prod (Recommended) | Gate protects production releases; anchor reads `deploy` branch | ✓ |
| Enforce on pre-prod too | Earlier docs-rot catch, but trains skip-trailer habits | |

### Q3 — Access control

| Option | Description | Selected |
|--------|-------------|----------|
| Open URL + noindex (Recommended) | Unguessable pages.dev name + X-Robots-Tag: noindex (one divergence from prod) | ✓ |
| Cloudflare Access protection | Email-OTP wall; risks breaking installed-PWA/SW device tests | |
| Obscurity only, no noindex | Byte-identical headers; indexing risk | |

### Q4 — Branch lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Ephemeral pointer, force-push (Recommended) | Reset to any candidate; no merge ceremony | ✓ |
| Long-lived merge flow | Feature → pre-prod → main; more process, drift risk | |

---

## Claude's Discretion

- **DEBT-02 purge sequencing** (area offered, not selected): research leads with the content-sentinel poll (live `assets/version.js` until it serves the new SHA, then purge; fail-loud timeout, no purge on failure); planner picks among the incident todo's four directions; consistency check recommended if cheap.
- Pre-prod workflow mechanics: file/branch/staging names, separate concurrency group, share-vs-duplicate steps with deploy.yml.
- CF second-project creation planned as a manual human checkpoint.
- **Gate strictness & reach** (area offered): dissolved — no gate ships in Phase 44 after the scope re-cut.

## Deferred Ideas

- v1.5: comment-hygiene retrofit (~680 lines / ~43 files) + forward gate, together. Post-retrofit gate = simple zero-tolerance grep (no baseline-awareness needed).
- `max-age=86400` asset-caching rethink (purge-race todo direction 3) — only if DEBT-02's chosen fix requires it.
