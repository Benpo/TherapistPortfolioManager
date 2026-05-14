---
created: 2026-05-15T00:00:00.000Z
title: In-app onboarding & overview/help system — research, design, mockup (then build)
area: ux+marketing+docs
priority: critical
recommended_entry: /gsd-discuss-phase
target_phase: 26
related_todos:
  - 2026-03-24-pwa-install-guidance-and-user-manual.md (PWA install + user manual — folds into this)
source: User request 2026-05-15 (alongside Phase 25 backup rework discussion)
---

## Why this is critical

The app has accumulated significant functionality (sessions, emotions quick-paste, Heart Shield, severity tracking, search, PDF export, encryption, multi-language, backups, etc.) and ships with **zero in-app documentation or instructions**. As we prepare to market and sell to therapists, prospective customers and new trial users have no way to discover or understand the features.

This is now a **launch prerequisite**, not a nice-to-have. Customers can't be expected to figure out non-obvious flows (Heart Shield workflow, severity-reversal semantics, emotions quick-paste, backup architecture, language switching) on their own.

## Phase shape — research-and-design heavy

This phase is **mostly research + UX investigation + mockup**, NOT a full implementation. Whether to also build it here is a discuss-phase decision.

The risk we are explicitly avoiding: letting executor agents create a pile of UI screens before we have investigated **how similar apps offer their tutorial/help**, on **which parts** we focus, and **which pattern** fits Sessions Garden best.

## Patterns to evaluate (research)

- (a) Single tutorial/welcome screen on first launch with full feature tour.
- (b) Per-screen contextual help (small "?" icon per screen, opens panel for that screen).
- (c) Empty-state coaching (instructions surface only when a feature has no data yet).
- (d) Persistent "Help" or "Overview" page reachable from nav — the user can return any time.
- (e) Interactive guided product tour overlay (Shepherd.js / Driver.js style).
- (f) Hybrid combinations of the above.

User's stated intent: "not only as 'Welcome' screen but also as something user can return to" → suggests (d) is in the mix, possibly hybrid with (b) or (c).

## Decisions for `/gsd-discuss-phase 26`

1. Which patterns from above fit Sessions Garden's audience (solo Emotion Code / Body Code therapists, mostly non-technical, Sapir is the reference user).
2. Which features deserve documentation entries (triage — not every feature needs one).
3. Primary surface audience: brand-new trial user (first-time) vs returning user wanting feature discovery vs both.
4. Implementation depth for this phase (research+mockup only / minimal build / full build).
5. Whether to fold the existing PWA install guidance TODO into this phase.

## Cross-references

- Existing TODO `2026-03-24-pwa-install-guidance-and-user-manual.md` (medium priority, from Phase 19) — should fold into this phase. Covers PWA install + user manual + how-backups-work + activation/deactivation flows.
- ROADMAP.md Phase 26 entry (created alongside this TODO).
- Phase 25 (backup architectural rework) — overview screen layout is being reshaped there; Phase 26 onboarding design depends on the final overview shape from Phase 25.

## Origin

Ben request 2026-05-15. Initially bundled with Phase 25 backup rework; split into Phase 26 during discuss-phase scope-guard check (different domain: marketing-driven UX research vs backup bug fix + UI consolidation).
