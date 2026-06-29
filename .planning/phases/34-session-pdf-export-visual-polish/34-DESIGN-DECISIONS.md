# Phase 34 — Session PDF Export Visual Polish · Locked Design Decisions

**Date:** 2026-06-29 · **Status:** design locked with Ben (collaborative mockup session) · **Audience:** client-facing (the PDF is usually sent to the therapist's customer)
**Canonical mockup:** `design-mockups/FINAL-mockup.html` (open in a browser — shows Hebrew RTL + English LTR)
**Exploration history:** `design-mockups/variants-comparison.html` (5 header/brand variants), `design-mockups/severity-options.html` (3 severity treatments)

This is the design contract feeding `/gsd-ui-phase` (UI-SPEC) and then `/gsd-plan-phase`. The scope is **Branding + layout polish (A+C)** of the existing bidi-aware jsPDF export (`assets/pdf-export.js`). All effects below are deliberately **jsPDF-reproducible** (flat fills via `rect`/`roundedRect`, lines, embedded PNG, colored text) — no gradients/shadows.

## Hard constraints (non-negotiable)
- **Hebrew RTL / bidi must not regress.** Phase 23 was a full RTL rewrite; the redesign must preserve correct visual order for Hebrew + mixed Latin/numerals. Every `doc.text()` keeps the `isInputVisual:false` invariant.
- **Phase 30 PDF test suite stays green** (`npm test`). New visual structure must not break the 7 PDF characterization tests; update them deliberately where layout assertions change.
- **Offline / zero-network.** The logo is an **embedded PNG** (`assets/branding/icon-512.png` via `doc.addImage`), not a fetched asset.
- **A4 portrait locked**, existing 71pt margins as the baseline.

## Palette — all sampled from the app icon (`icon-512.png`)
| Token | Hex | Use |
|---|---|---|
| icon-mint | `#e2f3e3` | header band background |
| icon-deep-green | `#345e34` | header text, client name |
| icon-head-green | `#456b42` | section headings, footer "made with" |
| green-500 | `#3a7d5f` | logo keyline border |
| icon-bullet | `#7da877` | section leaf-diamond bullet |
| icon-vein | `#bfe0b0` | section rules, card border |
| icon-mint-soft | `#eef7ea` | severity track background |
| cream-50 | `#fdf8f0` | client card background |
| ink | `#2f2d38` | body text |
| muted | `#5f5c72` | meta text |
| sev-bad (red) | `#ea4b4b` | "before" severity bar + number |
| sev-good (green) | `#2fb37d` | "after" severity bar + number |

## Layout (top → bottom)
1. **Header band** — full-bleed `#e2f3e3` mint band. Leading side: app-icon logo (48pt rounded tile, **thin `#3a7d5f` green keyline**, icon edge-to-edge, NO white frame). Next to it: **document title** ("סיכום מפגש" / "Session Summary") in deep green + a small subtitle. **No "Sessions Garden" wordmark as a letterhead** — on a client's copy it would read as if the therapist's clinic is named Sessions Garden.
2. **Client card** — cream `#fdf8f0` rounded card, `#bfe0b0` border. Client name large in `#345e34`. Meta row: **Date** · **Session #N** · a **green rounded pill** carrying the session's in-person/remote value. (No session type / modality.)
3. **Section headings** — `#456b42` bold, a small rotated-leaf-diamond bullet (`#7da877`), a `#bfe0b0` rule beneath.
4. **Trapped emotions** — **free text paragraph** (not chips/word-cloud — it's free text in real practice).
5. **Severity — before & after** — per complaint, **two bars on a shared 0–10 track**: a red `#ea4b4b` "before" fill over a shorter green `#2fb37d` "after" fill, each labelled (Before/After) with its number. The shorter green bar shows the reduction by length. (Chosen over a single gauge — a single fill read ambiguously as "filling up"; severity is lower-is-better and not meant to max out.)
6. **Footer** — `#bfe0b0` top rule. "Made with Sessions Garden · sessionsgarden.app" + small leaf (brand as the **tool**, subtle, not the clinic) · "Page X of Y" centered · created date.

## Functional requirements (go into PLAN with behavior tests)

### FN-1 · Session number = derived chronological ordinal (Ben-flagged, MUST be tested)
The "Session #N" shown is **NOT** the DB key. The `sessions` store is `keyPath:"id", autoIncrement:true` (`db.js:225`) — that id is stable and **never renumbers**, so printing it would leave gaps after a deletion (e.g. `1, 3`).
- **N = 1-based position of this session among `getSessionsByClient(clientId)` sorted ascending by `date`** (deterministic tie-break by `id` for same-date sessions), computed **at export time**, never stored.
- **Expected behavior (Ben):** client has sessions on d1<d2<d3 (ordinals 1,2,3). Delete the d2 session → the d3 session's export now shows **#2**. The former 3rd becomes the 2nd.
- **Behavior test (required):** seed a client with 3 dated sessions; assert exported ordinals 1/2/3; delete the middle; re-derive; assert the remaining two are 1/2 (no gap, renumbered). Per project rule: a falsifiable behavior test BEFORE implementation (`feedback-behavior-verification`).

### FN-2 · In-person/remote value
- Read the session's **existing** master-data field for in-person/remote (already in the app, **localized**). Render its localized value verbatim in the green pill — **no hardcoded label**, no new field. (Confirm exact field name + localization keys at plan time.)

### FN-3 · Logo embedding
- Embed `assets/branding/icon-512.png` via `doc.addImage`; precache/bundle as needed so export works fully offline. Confirm PNG sizing/DPI so the 48pt tile is crisp.

## Open micro-decisions (pin at UI-SPEC time, not blockers)
- **Header subtitle wording** — currently "מסמך אישי עבור המטופל/ת" / "A personal record for the client". Keep / reword / drop the subtitle.
- Exact **in-person/remote field name** + i18n keys (verify in code).
- Whether the **created-date** in the footer duplicates the session date in the card (consider dropping one).

## Routing note
Per `feedback-ui-phase-gate-mandatory`: this design-led/visual phase goes through **`/gsd-ui-phase 34`** (UI-SPEC design contract) before `/gsd-plan-phase 34`. This doc + the FINAL mockup are the upstream input so the UI researcher formalizes rather than re-litigates already-decided questions.
