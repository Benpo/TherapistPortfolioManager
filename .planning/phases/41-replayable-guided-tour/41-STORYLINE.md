# Phase 41 Tour — Storyline (v3, settings-first)

**Date:** 2026-07-09 · **Supersedes:** v2 (2026-07-08) — v2's 10-step table is replaced by the 12-step settings-first arc below.
**Status:** ✅ APPROVED by Ben 2026-07-09 (in-session, /gsd-plan-phase 41 --gaps follow-up). This is the remediation spec for Phase 41 gap-closure plans 41-09 / 41-10 / 41-11 (amended); 41-08 / 41-12 / 41-13 are unaffected.

---

## 1. The arc

The tour tells one story: **first make this place yours, then walk the path a session travels.** It opens at the home page that greets you, steps behind the gear to shape the app to the practitioner's own hands (formats, dates, fields, snippets), then returns to the path: a session opened from the menu, the work recorded and saved, the saved work found again on the Sessions page, kept safe with a backup — landing on "You're ready."

Why settings-first (Ben, 2026-07-09): meeting the session form *before* knowing its sections can be renamed and switched off is bad storyline — the form would read as fixed. Walking Settings first makes step 7 a payoff, not an introduction: the form shows *the very formats and fields the user just shaped*.

## 2. Design principles (carried from v2, all still binding)

- **Honest deixis, always.** Copy only points at what is lit or literally inside the tooltip. The tour ACTIVATES the Fields/Snippets tabs before speaking about them (new engine capability, see §5) so their content is truly on screen.
- **Movement is narrated, never magic.** Bridges: **pressed together** (departing step lights the control that performs the move) and **arrive via the tab** (arrival step lights the now-active nav tab). D-06 auto-navigation unchanged.
- **Spotlight travels forward only.** Home header → down the settings tabs → out through the menu → down the session form → across to Sessions → up into the header close. No backtracking.
- **One idea per step; adjacent steps get distinct verbs.**
- **No left/right words in copy** — "one tab along", "nearby", "behind this gear" — Hebrew RTL mirrors for free.
- **Quote real labels, per locale** — nav.*, settings.tab.*, overview.* strings as they exist in each i18n file, never re-translated.
- **Titles stay nouns/gerunds** (Phase 24 D-05).

## 3. The storyline (12 steps)

| # | Screen | Anchor | Title (EN) | Body (EN, in-voice) | What it teaches | Bridge to next |
|---|--------|--------|------------|---------------------|-----------------|----------------|
| 1 | Overview (index.html) | `[data-tour="overview"]` — greeting card (exists) | Welcome to your garden | This is your home page — it greets you each time you arrive. Before the work begins, let's make this place yours; then we'll walk the path a session travels. Leave whenever you like. | The home page; the two-part promise (make it yours → walk the path); permission to leave. | Same page — spotlight lifts to the header gear. |
| 2 | Overview (header) | `[data-tour="settings"]` — gear (41-09, dynamic chrome) | Making it yours | Behind this small gear lives Settings — where the app takes your shape. Let's step inside together. | Where Settings hides (it is NOT in the main menu). | **Pressed together:** Next auto-navigates to settings.html — the very thing the lit gear does. |
| 3 | Settings | **NEW** `[data-tour="personalize"]` on `#settingsTabPersonalize` panel (default-active — content visible on arrival) | Your formats and dates | Here we are — Settings. First, your session formats: name the kinds of work you actually do, and add your own. Dates live here too — choose the format your eyes are used to. | Session formats + date format in ONE beat (Ben: don't over-focus on dates). Quotes the real "Personalization" tab label per locale. | Same page — tour activates the Fields tab. |
| 4 | Settings | **NEW** `[data-tour="fields"]` on `#settingsTabFields` panel (tour ACTIVATES this tab on entry) | Your fields | Every session form starts from ready-made sections. Rename any of them — make the form truly your own — and switch off what you don't use. Nothing you disable is ever deleted. | Default fields exist; they can be COMPLETELY renamed (beyond language — Ben 2026-07-09) and deactivated safely (real banner claim: disabling never deletes data). Prepares step 7. | Same page — tour activates the Snippets tab. |
| 5 | Settings | **NEW** `[data-tour="snippets"]` on `#settingsTabSnippets` panel (tour ACTIVATES this tab on entry) | Your words | This may become your favorite corner: Text Snippets. Anything you find yourself writing again and again — a sentence, a keyword, a whole closing note — save it here once, in your own words, and reuse it in any session. | **Sell it as the coolest, most time-saving feature (Ben 2026-07-09):** generic to ANY repetitive documentation — not only emotions; recurring sentences, keywords, passages. Copy stays generic (no niche examples). *(Copy task: verify the insertion verb against the real snippets UI before finalizing — no overclaiming.)* | Same page — spotlight lifts to the menu in the header. |
| 6 | Settings (header) | **NEW** `[data-tour="nav"]` on the `.app-nav` element (whole menu — Ben-approved; dynamic chrome, renderNav) | Ready to begin | The app now speaks your way. This menu travels with you on every page. When someone new arrives, Add Client welcomes them in; Add Session begins the work itself. Let's open a session together. | Closes the making-it-yours chapter; teaches the menu as THE way around; both entry points named (Add Client kept — Ben 2026-07-09); whole-menu spotlight, copy focuses on the two Add entries. | **Pressed together:** Next auto-navigates to add-session.html — the lit menu holds the very link. |
| 7 | Session form (add-session.html) | `[data-tour="session-setup"]` (exists) | Setting the scene | Here we are — a fresh session. It starts gently: the client, the date, and the format — the very formats you just named. If someone is new, you can add them right here. | Arrival confirmation + setup fields + inline client creation. **Payoff of steps 3–4:** the form is built from what the user just shaped. | Same page — spotlight moves down the form. |
| 8 | Session form | `[data-tour="session-heart"]` — MOVED to the emotions accordion (`data-accordion="emotions"`, open by default) per v2/41-09 | The heart of the session | This is where the work lives — each trapped emotion you find and release. Nearby sit the severity scales — how heavy each issue felt, before and after — and the Heart-Wall section. | The core recording surface; severity/Heart-Wall named as "nearby" (visible, dimmed, direction-neutral). | Same page — down to the save button. |
| 9 | Session form | `[data-tour="session-save"]` (exists) | Saving your work | When you save, the session settles safely into this device — nothing leaves it. Open any saved session later and you can share it as a client-ready PDF; this is its icon. *(tooltip shows the small colored export glyph inline, after the body — approved v2, unchanged)* | Save = local-only; export exists; true deixis (glyph inside tooltip). | **Arrive via the tab:** Next auto-navigates to sessions.html; the next spotlight is the menu tab that took us there. |
| 10 | Sessions (sessions.html) | `[data-tour="nav-sessions"]` on the nav link (41-09, dynamic chrome) | Looking back | We've arrived through the Sessions tab — it's here in the menu, on every page. Everything you save gathers on this page, ready to browse, filter, and revisit. | Where saved work lives (the payoff of saving — Ben 2026-07-09: kept as its own beat); the tab is the lit element, so the path is taught. | Same page — spotlight lifts into the header, to the cloud. |
| 11 | Sessions (header) | `[data-tour="backup"]` — cloud button (exists, dynamic) | Keeping a copy | Everything here lives only on this device — so a copy matters. This small cloud creates an encrypted backup, and its color gently lets you know when one is due. | Backup entry point; recency-color behavior; why it matters. | Neighbor button: the question mark, same header. |
| 12 | Sessions (header) | `[data-tour="help"]` — "?" button (exists, dynamic) | You're ready | That's the whole path. One tab along, Reporting quietly gathers your work into numbers over time, whenever you're curious. And under this question mark live guides, answers, and this tour again — on every page, whenever you need them. | Closure; **Reporting mentioned here instead of a step** (Ben 2026-07-09); where help + tour replay live. | Done → finish card (D-10 unchanged: "You're all set" + Add your first client / Start your first session / Browse the help center). |

**Pacing shape:** calm opening → one door → three making-it-yours beats → the doorway back to the path → three form beats → arrival at the gallery of saved work → two-beat header close (*safety, support*).

**Pages walked:** index → settings → add-session → sessions (3 navigations, every one bridged). Reporting is not visited.

## 4. Deltas from v2 (what the plan amendments must change)

| Change | Detail |
|--------|--------|
| **Steps 2–6 NEW chapter** | Settings walk-in moved to the FRONT (was single step 9 in v2). Gear step becomes step 2 with pressed-together bridge into settings.html. |
| **NEW anchors (static, settings.html)** | `data-tour="personalize"` (#settingsTabPersonalize), `data-tour="fields"` (#settingsTabFields), `data-tour="snippets"` (#settingsTabSnippets). |
| **NEW anchor (dynamic)** | `data-tour="nav"` on `.app-nav` in renderNav (app.js) — whole-menu spotlight for step 6. |
| **DROPPED from v2** | `data-tour="begin"` on .inline-actions (home begin beat replaced by step 6 on the menu); `data-tour="nav-reporting"` + the Reporting step (mentioned in step 12 copy instead); v2's three-beat header close (now two-beat: cloud → ?). |
| **KEPT from v2** | nav-sessions anchor + "Looking back" step (now step 10); session-heart re-anchor to emotions accordion; save-step de-falsification + export glyph in tooltip; step-1 greeting-card anchor; backup/help steps (now on sessions.html header — anchors are page-agnostic dynamic chrome); retirement of old per-button anchors (index.html add-client/add-session) and section-title anchors (sessions.html:52, reporting.html:52); launch-from-non-Overview navigates home first. |
| **NEW engine capability** | Per-step tab activation: a step may declare an activation selector (e.g. `#settingsTabFieldsBtn`) that the engine clicks on step entry before measuring the anchor (read-only view switch; needed for steps 4–5 honest deixis). Degradation rules unchanged: anchor missing/hidden after activation → centered modal fallback. |
| **i18n key ripple** | New: help.tour.step.personalize.*, .fields.*, .snippets.*, .ready.* (naming per planner). Removed: help.tour.step.begin.* (never shipped — was v2-planned), old reporting-step keys. Rewritten: welcome, settings(→step 2 bridge framing), save bridge, finish. All ×4 locales, parity gate stays green; HE/DE/CS machine-draft, native pass in Phase 42.1. |
| **Copy emphasis (Ben 2026-07-09)** | Step 5 must SELL snippets: the coolest, most time-saving feature, generic to anything repetitive (sentences, keywords, passages) — not emotions-only, no niche examples in copy. Step 4 must say sections can be COMPLETELY renamed and made one's own — "beyond language" — plus safe deactivation. |
| **Step count** | 10 → 12. Ben explicitly released the 10-step cap ("I don't mind about the amount of steps… it should just make sense"). D-01's count is superseded by this approval. |

## 5. Decisions — RESOLVED (Ben, 2026-07-09)

1. **Settings walk-in BEFORE the session path** — approved (his direction). Rationale: fields/formats must be known adaptable before the form appears.
2. **Reporting step DROPPED; mentioned in the closing step** — approved (his direction).
3. **Sessions "Looking back" step KEPT (12th step)** — approved ("I agree with you!"): saving needs its payoff — the user sees where work gathers.
4. **Whole-menu spotlight for step 6** — approved ("Agree!"): teaches the menu itself; copy focuses on the two Add entries; no nav-template wrapper needed.
5. **Snippets + fields copy emphasis** — as recorded in §4.
6. Carried from v2 approval (2026-07-08, unchanged): export glyph inside save tooltip YES; launch-from-non-Overview navigates home first YES; D-02/D-03/D-05..D-10/D-12..D-16 untouched; D-06 auto-navigation kept exactly.
