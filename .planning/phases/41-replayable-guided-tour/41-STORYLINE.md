# Phase 41 Tour — Storyline Proposal (v2, post-UAT)

**Date:** 2026-07-08 · **Author:** narrative-design pass on the real app (anchors, copy, and nav verified against live source)
**Status:** ✅ APPROVED by Ben 2026-07-08 — all four decisions accepted; D-01 composition change re-approved. This is the remediation spec for Phase 41 gap-closure (implement via `/gsd-plan-phase 41 --gaps`).

---

## 1. The arc

The tour tells one story: **the path a single session travels through your practice** — it begins at the home page that greets you, passes through a new client and the work itself, and ends with that work kept safe, seen over time, and supported. The opening no longer promises "running a session end to end" over a greeting card; it promises **a walk along the path**, which is exactly what the tour delivers. The close is a three-beat header cadence — *a safe copy, a place that's yours, help whenever you need it* — landing on "You're ready."

## 2. Design principles

- **Honest deixis, always.** Copy only ever points at what is lit. Nothing "look for this icon" unless the icon is literally in the tooltip. Future things are named as future ("you'll meet this icon there"), never pointed at.
- **Movement is narrated, never magic.** Every page change is bridged one of two ways:
  - **Pressed together** — the departing step spotlights the actual control that performs the move ("Next, we'll open a session together" while the Add Session button is lit).
  - **Arrive via the tab** — the arriving step spotlights the now-active nav tab, and the copy says we came through it ("We've arrived through the Sessions tab — it's here in the menu, on every page"). The first bright thing on a new page is the menu item that brought you there. D-06 auto-navigation is unchanged; it just stops feeling like teleporting.
- **Spotlight travels forward only.** Down the home page, down the session form, along the nav tabs, then a short three-hop close inside the header. No backtracking, no zigzag between adjacent elements (the old steps 2–3 double-spotlight is merged).
- **One idea per step; adjacent steps get distinct verbs.** The old near-duplicate titles ("Saving and keeping it safe" / "Keeping a copy") are separated into *saving* (device) and *keeping a copy* (backup).
- **No left/right words in copy** — "one tab along", "nearby", "behind this gear" — so Hebrew RTL mirrors for free.
- **Quote real labels, per locale.** Copy names live UI labels (Add Client, Sessions, Reporting…); each translation must quote that locale's actual `nav.*` / `overview.*` label strings, not re-translate them.
- **Titles stay nouns/gerunds** (Phase 24 D-05 — natural Hebrew noun/infinitive forms).

## 3. The storyline (10 steps — same count Ben accepted in D-01, re-allocated)

| # | Screen | Anchor | Title (EN) | Body (EN, in-voice) | What it teaches | Bridge to next |
|---|--------|--------|------------|---------------------|-----------------|----------------|
| 1 | Overview (index.html) | `[data-tour="overview"]` — greeting card (exists, index.html:71) | Welcome to your garden | This is your home page — it greets you each time you arrive. From here, let's walk the path a session travels: a new client, the work itself, and a safe copy kept close. Leave whenever you like. | What the greeting card is; the arc; permission to leave. **Fixes UAT #1**: the copy now names what's on screen. | Same page — spotlight glides down to the two action buttons. |
| 2 | Overview | **NEW** `[data-tour="begin"]` on the `.inline-actions` row wrapping both buttons (index.html ~102) | Two ways to begin | Everything starts with one of these. Add Client welcomes a new person into your garden; Add Session begins the work itself. Next, we'll open a session together. | Both entry points, in one calm beat (merges old steps 2+3 — **fixes UAT #5** jumpiness). | **Pressed together:** Next auto-navigates to add-session.html — the very thing the lit button does. The move is announced before it happens. |
| 3 | Session form (add-session.html) | `[data-tour="session-setup"]` (exists, :69) | Setting the scene | Here we are — a fresh session. It starts gently: the client, the date, and the session format. If someone is new, you can add them right here — no need to leave. | Arrival confirmation ("Here we are") + the setup fields + inline client creation. | Same page — spotlight moves down the form. |
| 4 | Session form | `[data-tour="session-heart"]` **MOVED** to the emotions accordion (`data-accordion="emotions"`, :246 — open by default) from the Heart-Wall accordion (:205) | The heart of the session | This is where the work lives — each trapped emotion you find and release. Nearby sit the severity scales — how heavy each issue felt, before and after — and the Heart-Wall section. | The core recording surface. Re-anchor makes the lit section match the copy's first noun (**deixis honesty**); severity/Heart-Wall named as "nearby" (visible, dimmed shapes — direction-neutral wording). | Same page — down to the save button. |
| 5 | Session form | `[data-tour="session-save"]` (exists, :367) | Saving your work | When you save, the session settles safely into this device — nothing leaves it. Open any saved session later and you can share it as a client-ready PDF; this is its icon. *(tooltip shows the small colored export glyph inline, after the body)* | Save = local-only (core value); export exists and where it appears. **Fixes UAT #4**: "this is its icon" points at a glyph *inside the tooltip* — true deixis; the on-screen icon is honestly framed as later. | **Arrive via the tab:** Next auto-navigates to sessions.html; the next step's spotlight is the menu tab that "took us" there. |
| 6 | Sessions (sessions.html) | **NEW** `[data-tour="nav-sessions"]` on the nav link (renderNav, app.js ~142) — replaces the section-title anchor | Looking back | We've arrived through the Sessions tab — it's here in the menu, on every page. All your saved sessions gather on this page, ready to browse, filter, and revisit. | **Fixes UAT #2**: the move is narrated AND the path is taught — the lit element is the tab you'd click yourself. | Neighbor tab: Next auto-navigates to reporting.html; the spotlight slides one tab along. |
| 7 | Reporting (reporting.html) | **NEW** `[data-tour="nav-reporting"]` on the nav link (renderNav) — replaces the section-title anchor | Seeing the whole picture | One tab along sits Reporting — where we are now. It gathers your work into a handful of quiet numbers, so patterns can show themselves over time. | Where Reporting lives (the tab) + what it's for, without overclaiming. | Same page — spotlight lifts into the header, to the cloud. |
| 8 | Reporting (header) | `[data-tour="backup"]` — cloud button (exists, dynamic, app.js:644) | Keeping a copy | Everything here lives only on this device — so a copy matters. This small cloud creates an encrypted backup, and its color gently lets you know when one is due. | Backup entry point; the recency-color behavior (real: never/fresh/warning/danger tints); why it matters. | Neighbor button: the gear sits beside the cloud. |
| 9 | Reporting (header) | **NEW** `[data-tour="settings"]` on `.settings-gear-btn` (app.js ~398) | Making it yours | Behind this gear is Settings — rename the session formats, shape your own text snippets, tend client photos and backups. When you're settled in, it's worth a quiet visit. | Settings exists and where (it's NOT in the main nav — this is the one moment to point at the gear). All four claims are real tabs. | Neighbor button: the question mark, same header. |
| 10 | Reporting (header) | `[data-tour="help"]` — "?" button (exists, dynamic, app.js:487) | You're ready | That's the whole path. Guides, answers, and this tour again all live under the question mark — on every page, whenever you need them. | Where help (and tour replay) live; closure. | Done → finish card (D-10 as locked: "You're all set" + Add your first client / Start your first session / Browse the help center). |

**Pacing shape:** one calm opening → one doorway → three deep steps inside the form (the story's middle) → two tabs widening out → a three-beat header close (*safety, ownership, support*). Steps 8–10 are three short hops within one header cluster — a deliberate slowing-down cadence for the ending, not jumpiness: same screen, adjacent elements, one idea each.

## 4. Settings recommendation: **IN — one light step (step 9)**

**Why in:**
1. **Settings is invisible from the main nav.** Overview/Sessions/Reporting/Add Client/Add Session are the nav; the gear is a small header icon. The tour is the one designed moment to point at it — the help center covers personalization in prose, but the tour can *show the door*.
2. **It costs nothing structurally.** No page change, no new screen: the gear sits beside the backup cloud in the header, so it slots into the closing cadence as one short hop. With old steps 2+3 merged, the total stays at 10 — the count Ben already accepted in D-01.
3. **"Making it yours" belongs in this arc.** Renaming session formats and writing snippets in your own words is Sapir-core value (the app adapts to the practitioner, not the reverse). Framed as tending your own garden, it closes the ownership loop before "You're ready."
4. **It reinforces backups honestly** — the Backups tab is a real second home for backup work, mentioned in passing without stealing step 8's job.

**What it deliberately does NOT teach:** the individual tabs, custom field names, date formats — one sentence of invitation, not a Settings tour. The help center carries the depth.

**If Ben prefers a tighter 9-step tour:** drop step 9 exactly as scoped above; nothing else changes. The arc still works — but Settings then has no in-app discovery moment beyond the gear icon itself and the help center.

## 5. Deltas from the current 10-step tour

| Change | Detail |
|--------|--------|
| **Step 1 REFRAMED** | Same anchor (greeting card). Copy now names what the user is looking at ("your home page — it greets you each time you arrive") and promises "the path a session travels" instead of "running a session, end to end". Solves the UAT #1 promise/screen mismatch. |
| **Steps 2+3 MERGED** | "Adding a client" + "Starting a session" become one step, "Two ways to begin", anchored to a **NEW** `data-tour="begin"` on the `.inline-actions` row (index.html ~102). The per-button `data-tour="add-client"` / `data-tour="add-session"` attributes (index.html:103/107) become unused — remove them. i18n: `help.tour.step.addClient.*` + `help.tour.step.startSession.*` replaced by `help.tour.step.begin.*`. |
| **Step "heart" RE-ANCHORED** | `data-tour="session-heart"` moves from the Heart-Wall accordion (add-session.html:205) to the emotions accordion (:246, open by default) so the lit section matches the copy. One attribute move. |
| **Step "save" DE-FALSIFIED** | Copy rewritten; the export glyph ships **inside the tooltip** (small colored inline SVG after the body — exactly what D-01/UI-SPEC originally asked for; tour.js currently renders no SVG, its banner comment "no inline SVG in this plan" needs updating; the glyph is a compile-time literal, same trust-boundary rule as the "?" glyph). If Ben prefers zero SVG in tooltips, use the words-only body variant: "…share it as a client-ready PDF, from the Sessions page." |
| **Steps "sessions"/"reporting" RE-ANCHORED to nav tabs** | **NEW** `data-tour="nav-sessions"` / `data-tour="nav-reporting"` on the two links in `renderNav` (app.js ~142 — one attribute each in the template string). The section-title anchors (sessions.html:52, reporting.html:52) become unused — remove them. This is the core UAT #2 fix: arrival steps light the tab that brought you there. Nav is JS-rendered chrome on every page (same dynamic-anchor pattern as backup/help). |
| **Step "backup" copy touched** | Adds the true recency-color detail; title kept. Old title-echo with the save step resolved by retitling save to "Saving your work". |
| **NEW step "settings"** | **NEW** `data-tour="settings"` on the gear link (app.js ~398). New i18n keys `help.tour.step.settings.*`. |
| **Step "help" copy touched** | Mentions tour replay lives there too (true — "Take the tour" entry, D-13). |
| **Engine/test ripple** | `STEPS[]` in tour.js updates (ids, anchors, pages unchanged except merge + settings); anchor-presence rot-guard test updates to the new anchor set; all 4 locales get the fresh copy (they're being authored this phase anyway — D-11 — so no wasted translation). `screenName` values unchanged. |
| **Launch nicety (see Open Questions)** | Step 1 lives on index.html; launching the tour from settings.html/help.html should navigate home first rather than open on a fallback modal. |

**Locked decisions flagged:**
- **D-01 (route + step content) — needs Ben's re-approval.** Count stays 10, but composition changes: merge of add-client/add-session, Settings step added, sessions/reporting re-anchored to nav tabs, heart re-anchored to the emotions accordion. Everything else in D-01 (form zones, export named at save, backup, help/finish) is honored.
- **D-02 — strengthened, not violated.** Nav tabs and the gear are the most always-present chrome in the app.
- **D-03, D-05..D-10, D-12..D-16 — untouched.** D-06 auto-navigation is kept exactly; the bridges are pure copy + anchor choices.

## 6. Decisions — RESOLVED (Ben, 2026-07-08): all four accepted → Settings IN (10 steps) · export glyph in save tooltip YES · merge Add-Client/Add-Session YES · launch-from-non-Overview navigates home first YES. Items below are the rationale.

1. **Settings: in (10 steps) or out (9 steps)?** My recommendation is in, as the middle beat of the header close. If your gut says the tour should stay strictly on the session path, cut it — the step is designed to be droppable with zero ripple.
2. **The export glyph inside the save-step tooltip — yes or no?** "Yes" restores your original D-01 wish and makes the deixis true (small build delta: one compile-time inline SVG in the tooltip). "No" means the words-only variant — still honest, slightly less vivid.
3. **Losing the dedicated "Adding a client" beat — acceptable?** The merged step names both buttons in one breath. If you want Add Client kept as its own step, the cleanest trade is dropping Settings to stay at 10.
4. **Launching from a non-Overview page:** should `Tour.start()` navigate to index.html first (my recommendation — the story always opens at home), so the first thing a user ever sees is never the fallback modal? This is a small engine behavior, not a copy change — but it shapes the first impression from the "?" menu on help/settings pages.
