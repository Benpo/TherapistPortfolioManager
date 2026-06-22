# Phase 26: In-App Onboarding & Overview / Help System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 26-in-app-onboarding-overview-help-system
**Areas discussed:** Help-surface pattern, Feature triage, Audience framing, Build depth + PWA fold, Welcoming design / state-of-the-art UI-UX, Tour resilience model, Demo↔in-app reuse, Content authorship/source, Welcome trigger/dismissal

---

## Help-Surface Pattern (primary backbone)

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent Help page | Real page in nav; backbone; zero deps; RTL/i18n-safe | |
| Interactive overlay tour | Promote demo-hints.js into a live guided tour | |
| Per-screen "?" panels | Distributed contextual help per screen | |
| Hybrid, page-anchored | Persistent page + lightweight extras, one source of truth | (basis) |

**User's choice:** Free-text — no single option; "including also interactive overlay as tour which could be opened also going forward with ? or small button."
**Notes:** Resolved as Hybrid page-anchored backbone (persistent Help page = single source of truth) PLUS a replayable interactive tour launchable any time via a persistent "?" / small button — not one-time. Captured as CONTEXT D-01.

---

## Tour Entry Point & Scope (plain-text follow-up)

**User's choice:** (1) "?" icon next to the cloud icon in header actions, or even a bottom corner, with quick help. (2) Tour from a process/workflow perspective — how to do a treatment/session end-to-end including the features that simplify the session, plus general technical tips (backups) and adding a customer.
**Notes:** Drove CONTEXT D-02 (entry point) and D-03 (workflow-first content model). Reframed the whole help system as process-first, not a feature catalog.

---

## Feature Triage / Content Scope

| Question | Options offered | Selected |
|----------|-----------------|----------|
| Clinical features | Heart Shield workflow / Severity reversal / Emotions quick-paste / Multi-issue + read mode | Emotions quick-paste; Multi-issue + read mode |
| Technical track | Backups & restore / PWA install+activation / Language switching / PDF export | Backups & restore; PDF export |

**User's choice:** Emotions quick-paste, Multi-issue + read mode, Backups & restore, PDF export — plus an explicit correction.
**Notes:** User rejected the "document only what confuses" framing: "overall features we have, not only what confuses." Named must-haves: customizable session sections (on/off per therapist workflow) and per-session export (send to client / file as therapist). Captured as CONTEXT D-04/D-05. PWA initially unselected here — later overridden (see Build depth).

---

## Build Depth + PWA Fold

| Question | Options offered | Selected |
|----------|-----------------|----------|
| Depth | Design contract + mockup only / Design + minimal Help page build / Full build | Design contract + mockup only |
| PWA fold | Keep deferred / Fold a minimal stub / Fold it fully | Fold it fully |

**User's choice:** Design contract + mockup only; Fold the PWA TODO fully.
**Notes:** "Fold it fully" supersedes the earlier triage where PWA was unselected — the help *design + content outline* must comprehensively cover the full PWA/user-manual scope, built in the follow-up phase. Captured as CONTEXT D-08, D-06, and Folded Todos.

---

## Welcoming Design / State-of-the-Art UI-UX

| Question | Options offered | Selected |
|----------|-----------------|----------|
| First-run welcome | Full-screen branded welcome / Dismissible overview banner / No dedicated welcome | Full-screen branded welcome |
| Visual language | Extend garden design system / Distinct premium onboarding skin / Minimal text-forward | Extend garden design system |
| Research benchmarks | Therapy practice-mgmt / Calm-wellness / Notion-Linear-class / Offline-first PWAs | Therapy practice-mgmt; Calm/wellness |

**User's choice:** Full-screen branded welcome; extend the garden design system; benchmark therapy practice-management + calm/wellness apps.
**Notes:** Captured as CONTEXT D-09, D-10, D-14. This was the user's self-added fifth area.

---

## Tour Resilience Model

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid + graceful degrade | Spotlight on stable data-tour anchors, text + "take me there" fallback | ✓ |
| Navigation-led | Mostly routes user screen→screen, minimal spotlighting | |
| Full rich spotlight | Precise narration of every control; most fragile | |

**User's choice:** Hybrid + graceful degrade.
**Notes:** Captured as CONTEXT D-11. Stated as a hard UI-SPEC constraint because the tour is the most fragile element across 4 langs + RTL + multi-page nav.

---

## Demo ↔ In-App Reuse

| Option | Description | Selected |
|--------|-------------|----------|
| Shared engine + one content source | One workflow content model drives demo + in-app | |
| Shared engine, separate scripts | Reuse engine, separate content sets | |
| Leave demo alone, build in-app fresh | Independent in-app system; demo untouched | ✓ |

**User's choice:** Leave demo alone, build in-app fresh (after a correction round).
**Notes:** User questioned the premise ("didn't even know there are hints, never saw them — you sure?"). Investigated and confirmed: `demo-hints.js` is real but hard-gated to iframe context (`app.js:701` `if (window !== window.top)`), and the only iframe is `landing.html:228` embedding `demo.html` — so the dots only render to landing-page visitors, never in the real product. With the corrected picture the user chose to leave the demo untouched and build the in-app help independently. Captured as CONTEXT D-13.

---

## Content Authorship / Source

| Option | Description | Selected |
|--------|-------------|----------|
| Claude drafts EN → Sapir reviews | Claude drafts EN from app behavior, Sapir clinical/tone review | ✓ |
| Sapir authors HE source → translate | Hebrew-first domain-expert authoring | |
| Collaborative split | Claude EN structure + Sapir clinical narrative | |

**User's choice:** Claude drafts EN → Sapir reviews.
**Notes:** Captured as CONTEXT D-12. EN-first per ROADMAP; translation later.

---

## Welcome Trigger / Dismissal

| Option | Description | Selected |
|--------|-------------|----------|
| Once post-activation, existing users see it too | flag-gated; existing upgraders see it once | ✓ |
| Once, NEW activations only | existing-data users auto-flagged as seen | |
| Persist until completed | re-shows each launch until completed/dismissed | |

**User's choice:** Once post-activation, existing users see it too.
**Notes:** Captured as CONTEXT D-15 (in Specific Ideas). Flag `sg.welcomeSeen`; "explore myself" or tour-complete sets it; re-open only via "?".

---

## Claude's Discretion

- Exact placement of the "?" entry point (header actions vs. bottom-corner floating).
- Help page route / filename and nav slotting.
- Exact visual treatment of the full-screen welcome within the garden design system.
- Granularity of workflow-spine sub-steps in the mockup.
- Mockup fidelity (static clickable vs. lightly interactive).

## Deferred Ideas

- Production implementation of the help system → follow-up phase.
- HE/DE/CS translation of help content → after EN stabilizes.
- Unifying marketing demo with in-app help (shared engine/content) → rejected for now (D-13).
- Per-screen "?" panels as a distinct distributed help system → not chosen.
- Promoting/ungating `demo-hints.js` for the marketing demo → out of scope.
- Marketing-site / landing-page copy redesign → ROADMAP out of scope.
- Video walkthroughs / external docs site → ROADMAP out of scope.
