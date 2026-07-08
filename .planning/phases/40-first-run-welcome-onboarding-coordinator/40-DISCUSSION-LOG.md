# Phase 40: First-Run Welcome & Onboarding Coordinator - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-08
**Phase:** 40-first-run-welcome-onboarding-coordinator
**Areas discussed:** Precedence order & upgrader matrix, Coordinator design (Ben-added area), Welcome overlay composition, Install nudge shape, "?" re-open behavior

---

## Precedence order & upgrader matrix

| Option | Description | Selected |
|--------|-------------|----------|
| Welcome > What's-New > security > install | Ceremony-by-rarity; rare events never starved by recurring ones | ✓ |
| Welcome > security > What's-New > install | Data-safety first; starvation risk for What's-New | |
| You decide | | |

**User's choice:** Welcome > What's-New > security note > install nudge (mobile expectation hint later added as lowest tier)

| Option | Description | Selected |
|--------|-------------|----------|
| One browser session | sessionStorage marker; page navigation never fires a second surface | ✓ |
| One calendar day | Max one surface per day | |
| You decide | | |

**User's choice:** One browser session

| Option | Description | Selected |
|--------|-------------|----------|
| Welcome subsumes What's-New | Welcome records current version as seen; no back-to-back ceremony | ✓ |
| Sequential across launches | Welcome this launch, What's-New next launch | |
| You decide | | |

**User's choice:** Welcome subsumes it

| Option | Description | Selected |
|--------|-------------|----------|
| Both stay independent | Backup reminder + integrity nudge are functional signals, not ceremony | ✓ |
| Backup reminder joins, integrity stays out | Governed 6th surface at lowest tier | |
| You decide | | |

**User's choice:** Both stay independent

| Option | Description | Selected |
|--------|-------------|----------|
| Replace with expectation hint | Delete install pitch; one-shot i18n'd "designed for computers" hint + help-topic link | ✓ |
| Remove entirely, nothing on phones | D-16 confusion goes uncaught in the moment | |
| Keep install banner, just demote it | Contradicts computer-only support | |

**User's choice:** Replace with expectation hint. Ben raised this himself ("we don't fully support mobile so it should not be in focus").

| Option | Description | Selected |
|--------|-------------|----------|
| All mobile devices | iOS + Android, phone-class detection | ✓ |
| iOS only, as today | Preserves current UA sniffing | |
| You decide | | |

**User's choice:** All mobile devices

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as-is, just governed | Same 7-day cadence; coordinator only gates which launch | ✓ |
| Soften the cadence | Behavior change to Phase 19 decision | |
| You decide | | |

**User's choice:** Keep as-is, just governed. **Notes:** Ben initially didn't know what the "security note" was — mid-discussion explanation needed (it's the Phase 19 weekly Overview note). He then asked to capture a backlog todo spreading the cadence 7→10→14→21→60→120 days (cycles TBD) — captured as `2026-07-08-security-note-cadence-backoff.md`, explicitly not this phase.

---

## Coordinator design (Ben-added area)

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated module + registry | Surfaces register {id, eligible(), show()}; precedence as data; Phase 42 adds one entry | ✓ |
| Inline in app.js initCommon | if/else chain in the god-module | |
| You decide | | |

**User's choice:** Dedicated module — with the explicit constraint that the **name must not include "onboarding"** since it serves multiple purposes/popups.

| Option | Description | Selected |
|--------|-------------|----------|
| Run on every app page | Coordinator fires wherever the session starts | ✓ |
| Overview only | Simpler; delays welcome for deep-link landings | |

**User's choice:** Every app page

| Option | Description | Selected |
|--------|-------------|----------|
| Fully disabled in demo | Phase 35 window.name seam; no ceremony in the demo iframe | ✓ |
| Welcome shows in demo too | | |

**User's choice:** Fully disabled in demo

---

## Welcome overlay composition

| Option | Description | Selected |
|--------|-------------|----------|
| A — Centered hero | Botanical hero top, stacked CTAs | |
| B — Split | Illustration one inline side, copy + CTAs other; RTL-flips | ✓ |
| C — Minimal | Small motif, maximum whitespace | |

**User's choice:** Variant B (Split) — resolving sketch 001's `winner: null`.

| Option | Description | Selected |
|--------|-------------|----------|
| Tour CTA → help center interim | Until Phase 41 rewires it; roadmap-anticipated | ✓ |
| Hold welcome dark until Phase 41 | | |

**User's choice:** Help center interim. **Notes:** Ben added he won't push to production until the tour/onboarding is complete anyway, so the interim wiring is a safety net.

**Stated as convention (no objection):** all `help.welcome.*` strings ship 4-locale (UI chrome rule) in this phase.

---

## Install nudge shape

| Option | Description | Selected |
|--------|-------------|----------|
| Card with real Install button | beforeinstallprompt on Chromium; Add-to-Dock pointer on Safari | ✓ |
| Instructions-only card | One code path, no one-click | |

**User's choice:** Real Install button where possible

| Option | Description | Selected |
|--------|-------------|----------|
| Eligible from second session | Natural coordinator ordering, no bookkeeping | ✓ |
| Wait for usage signal | After first client / ~3 sessions | |

**User's choice:** From second session

| Option | Description | Selected |
|--------|-------------|----------|
| Dismissed = gone forever | One ask; help topic remains | ✓ |
| One re-offer after ~90 days | | |

**User's choice:** Gone forever

---

## "?" re-open behavior

| Option | Description | Selected |
|--------|-------------|----------|
| "Replay welcome" — same overlay | Phase 41 adds its own "Take the tour" entry later | ✓ |
| "Welcome & tour" combined entry | Rename churn in Phase 41 | |

**User's choice:** "Replay welcome"; menu position + small print delegated to Claude.

---

## Claude's Discretion

- Coordinator module filename (no "onboarding" in the name), storage key names, registration API shape.
- "Replay welcome" menu position (suggested after "Help center").
- Welcome hero illustration selection for Variant B.
- Mobile hint exact wording + phone-class detection approach.
- Winning-but-unrenderable semantics for the Overview-only security note on other pages.

## Deferred Ideas

- Security-note cadence backoff (7→10→14→21→60→120, cycles TBD) — `.planning/todos/pending/2026-07-08-security-note-cadence-backoff.md`, post-v1.3.

## Process note

Mid-discussion, Ben flagged twice that explanations written between tool calls weren't reaching his terminal — the discussion switched to plain-text explain-then-ask (text-mode style) from the coordinator area onward. Lesson for future discuss-phase sessions: put all context INTO the question dialogs or use plain-text turns.
