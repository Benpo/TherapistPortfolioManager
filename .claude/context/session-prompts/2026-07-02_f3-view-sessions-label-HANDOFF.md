# HANDOFF — F3: label the "previous sessions" clock button (quick task)

**Created:** 2026-07-02 (therapist UAT triage). Master tracker: `2026-07-02_therapist-uat-feedback-triage.md`.
**Size:** tiny — a `/gsd-quick` task.
**⚠️ Timing:** run **AFTER Phase 36 completes**. `assets/overview.js` is in Phase 36's scope (plans 36-01 Task 2 + 36-04, comment-only edits with a strict comment-only verification gate). Editing overview.js code now would collide. Confirm Phase 36 is merged (check `.planning/STATE.md`) before starting.

## The feedback (verbatim)
> "Hard to find the button to view previous sessions. It's a small button with a clock. Not easy to find or self explanatory. Maybe an actual word like 'view sessions'."

## Current behavior (grounded)
On the home dashboard, each client row has an **icon-only clock button** that expands the client's past-sessions list. Built in `assets/overview.js:438-443`:
```js
const detailButton = document.createElement("button");
detailButton.className = "row-toggle";
detailButton.type = "button";
detailButton.title = App.t("overview.table.previousSessions");
detailButton.setAttribute("aria-label", App.t("overview.table.previousSessions"));
detailButton.innerHTML = '<svg ...clock (circle + polyline)...></svg>';
```
It sits in `.row-actions` (`overview.js:436-437`) next to the `+` quick-add button (`quickAddButton`, `overview.js:444+`). It already has `title` + `aria-label` from i18n key **`overview.table.previousSessions`** (en "Previous sessions", he "מפגשים קודמים", de "Vorherige Sitzungen", cs "Předchozí sezení" — `i18n-*.js:26`). The problem is purely that there's **no visible text** — icon-only.

## Goal
Make the button self-explanatory by adding a **visible text label** next to the clock icon (she asked for "an actual word like 'view sessions'").

## Fix direction (confirmed with Ben — add a visible label)
- Add a visible text label beside the clock SVG inside `detailButton` (e.g. a `<span>` after the SVG). Keep the icon.
- **Label text:** reuse `overview.table.previousSessions` ("Previous sessions") OR add a shorter new key (e.g. `overview.table.viewSessions` = "View sessions") in all 4 locales if "Previous sessions" is too long for the row. Pick whichever reads best and fits — decide during the task.
- Keep `title`/`aria-label` as-is (or drop the now-redundant `title` if the text is visible).

## Design / layout considerations (this is UI — verify visually)
- The button lives in a **table row action cell** alongside the `+` button. Space is tight, especially on narrow/mobile widths — the overview table uses a responsive `data-label` card layout on small screens (see `data-label` sets at `overview.js:425-434`).
- Check both **desktop table** and **mobile card** layouts. If a full "View sessions" is too wide inline, consider: a shorter word ("Sessions" / "History"), showing text-only on mobile, or a compact button style. Use judgment; keep it clean.
- Check the sibling `+` quick-add button still aligns well in `.row-actions` after the change.
- Relevant CSS: `.row-actions` / `.row-toggle` (grep `row-toggle`, `row-actions` in `assets/app.css`).

## Verification
- Load the home page (static server: `python3 -m http.server 8001 --directory .` → http://127.0.0.1:8001/, seed a client via demo data or add one) and confirm the button now reads as a labelled control on desktop AND at a narrow width.
- All 4 languages render without overflow/clipping.
- Full suite green: `npm test` (no test likely covers this, but don't regress overview tests).
- Screenshot before/after for Ben.

## Scope-fence
`assets/overview.js` (the button markup), possibly `assets/app.css` (label spacing), and `assets/i18n-*.js` (only if adding a new short key, all 4 locales). Nothing else.

## Suggested invocation (in a fresh session, after Phase 36)
`/gsd-quick` with: "Label the home 'previous sessions' clock button with visible text ('View sessions') per UAT F3 — see .claude/context/session-prompts/2026-07-02_f3-view-sessions-label-HANDOFF.md. UI change: verify desktop + mobile + all 4 langs."
