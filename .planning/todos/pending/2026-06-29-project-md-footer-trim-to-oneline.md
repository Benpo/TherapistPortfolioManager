---
created: 2026-06-29T09:30:00.000Z
title: Trim PROJECT.md footer to a one-line "Last updated" (template style)
area: planning-docs
priority: low
type: docs
files: [.planning/PROJECT.md]
---

## Context

The `*Last updated: …*` footer at the bottom of `.planning/PROJECT.md` has grown
into a multi-line changelog paragraph (each transition appends a full phase
recap). The GSD PROJECT template intends a short single line — e.g.
`*Last updated: 2026-06-29 — Phase 32 (README + Code Comments) complete.*` — with
the full per-phase detail living where it belongs: the phase `*-SUMMARY.md`
files, the STATE.md "Accumulated Context" log, and git history.

Surfaced 2026-06-29 during the post-P32 PROJECT.md drift audit. Ben: "do it
later." Not urgent — purely cosmetic / signal-to-noise; PROJECT.md is correct,
just verbose at the footer.

## Scope

- Replace the verbose footer paragraph with a one-line `*Last updated: <date> —
  <one-clause phase summary>*`.
- Do NOT delete the detail — confirm the same facts already exist in the relevant
  `*-SUMMARY.md` / STATE.md before trimming (they should; the footer is a
  duplicate). If any fact is footer-only, migrate it to STATE.md first.
- Establish the convention going forward so future transitions append a one-liner,
  not a paragraph. (Note: verify-work's `phase.complete` + the transition
  workflow's `evolve_project` step are what write this footer — the habit is
  manual at evolve-time, so this is a "how we write it" convention, not a code
  change.)

## Notes

- Low risk, single file, no code. Inline edit, no sub-agent.
- Commit: `docs(project): trim PROJECT.md footer to one-line Last-updated`.
